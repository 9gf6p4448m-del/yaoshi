// 妖市 3D 環境層 — 自製半解析度 bloom（v0.27）
//
// 為什麼不用 three/addons 的 UnrealBloomPass：實測在軟體 GL（Playwright headless 的
// SwiftShader）上它的兩支 program 直接 VALIDATE_STATUS false，console 冒兩個
// THREE.WebGLProgram: Shader Error——而「console 0 error」是本專案的驗收條件。
// 低階手機 GPU 也可能踩同一條。這裡改寫成四支最小的 shader：
//   ① 場景 → 全解析度 RT   ② 亮部萃取（半解析度）   ③ 兩趟分離式高斯模糊   ④ 合成輸出
// UnrealBloom 是 5 層 mip × 2 趟＝10 趟模糊；這支只有 2×2 趟，手機上便宜得多。
//
// 色彩空間：非 XR 的 render target 在 three r158 一律拿到線性值，所以最後一步要自己
// 做 linear→sRGB（外加一個溫和的 ACES 曲線，免得燈籠加了 bloom 之後直接過曝成白斑）。
//
// 深度邊緣線（後處理卷 P-3，2026-09-06）：`sceneRT` 另掛一張 DepthTexture，合成那一趟
// 順手用 3×3 的深度鄰域做邊緣偵測，在妖與桌上物件的輪廓／摺線疊一條近黑的細線。
// 反轉外殼（P-1）只畫得出「外輪廓」，內部細節線（sword 的小臉五官、hairpin 的髮／裙分界）
// 只有螢幕空間偵測畫得到——使用者裁定兩者並用。
// 為什麼不另開一支 pass／另一張 RT：邊緣偵測要的東西合成那一趟全都有（tScene 已經是全解析度、
// depth 就掛在同一張 RT 上），多開一趟就是多一次全畫面 fill ＋多一份記憶體，手機上最貴的正是這個。
// 折進 COMPOSITE 還有一個好處：edge 開關只是一顆 uniform，開與關**共用同一支 program**，
// 對決前後 `renderer.info.programs.length` 不會變，也不會在進對決時卡一下編 shader。
import * as THREE from 'three';

// 邊緣線參數，全部【試玩必調】。
//   color      近黑帶一點藍紫（#100b1a）：純黑在夜色場景裡看起來像破圖，帶一點紫才像墨線。
//              疊在 toSRGB 之後，所以這個 hex 就是螢幕上的值，不受 bloom 曝光影響。
//   depthLo/Hi 深度判準的門檻（見下面 EDGE shader 的 dRel：平面上恆 0、輪廓上 ~1）
//   normLo/Hi  法線判準的門檻（1−dot：0.62≈68°、0.82≈79°。妖是低模，門檻低於 0.5
//              會把每一片面的接縫都描出來——實測見下面那段掃描數字）
//   maxDepth   線只畫在這個距離之內（世界單位）。夜空沒有幾何、深度＝far＝100，
//              桌面半徑 3.4＋對決機位 dist 4.2 → 最遠約 7.6，12 把桌子整個含進來、夜空整個排除。
//   sobelW     一階 Sobel 梯度的權重（跟二階殘差取 min）：純粹當去噪用，見 shader 註解。
//   widthPx    取樣位移＝幾個 CSS 像素（線寬因此不隨 devicePixelRatio 變粗變細）
// 門檻是量出來的，不是猜的：tests/tools/edge-shot.mjs --sweep 在**同一幀**掃六組，
// 8v8（最重 8 隻、844×390 dpr2）的線像素佔比分別是
//   (.010/.020, .30/.45) 5.98%｜(.012/.025, .40/.55) 5.33%｜(.015/.030, .50/.68) 4.77%
//   (.020/.040, .62/.82) 4.22%｜(.030/.060, .75/1.00) 3.49%｜第三組 sobelW 0.5 → 4.62%
// 驗收窗是 [0.5%, 6%]，取第四組（4.22%）：落在窗中段、上下都有餘裕，畫面上外輪廓、
// 帽簷、嘴齒、眼窩都還在，但不會把低模的每一片面都描出來（前三組會）。
export const EDGE = { color: 0x100b1a, depthLo: 0.020, depthHi: 0.040, normLo: 0.62, normHi: 0.82, maxDepth: 12.0, sobelW: 1.0, widthPx: 1.0,
  silRel: 0.30 }; // 鄰域相對深度跳變超過這個比例＝外輪廓，交給外殼不畫黑線（P-2 第 4 輪加入）【試玩必調】

// 用 RawShaderMaterial 自己寫滿 GLSL ES 1.00：ShaderMaterial 版本在 SwiftShader 上
// 兩支 program LINK_STATUS false（info log 全空，看不出原因）。拿掉 three 的前置程式碼
// 之後就正常連結了——後製這種只有一個全螢幕四邊形的東西本來也不需要那些前置。
const VERT = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BRIGHT = `
precision highp float;
uniform sampler2D tDiffuse; uniform float threshold; uniform float knee;
varying vec2 vUv;
void main(){
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float w = clamp((l - threshold) / max(knee, 1e-4), 0.0, 1.0);
  gl_FragColor = vec4(c * w, 1.0);
}`;

const BLUR = `
precision highp float;
uniform sampler2D tDiffuse; uniform vec2 dir;
varying vec2 vUv;
void main(){
  vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227027;
  s += (texture2D(tDiffuse, vUv + dir * 1.3846).rgb + texture2D(tDiffuse, vUv - dir * 1.3846).rgb) * 0.3162162;
  s += (texture2D(tDiffuse, vUv + dir * 3.2308).rgb + texture2D(tDiffuse, vUv - dir * 3.2308).rgb) * 0.0702703;
  gl_FragColor = vec4(s, 1.0);
}`;

// 合成＋深度邊緣線。uEdge=0 時整段邊緣程式碼一行都不執行（uniform 分支），
// 輸出就是原本那一行 `toSRGB(aces(col))`——`?edge=0` 與 v0.34 逐位元組相同靠的是這件事。
//
// 為什麼判準用「反深度（1/z）的二階殘差」而不是直接拿 Sobel 的一階梯度當門檻：
// 一階梯度在**斜面**上本來就大（遠處桌面幾乎跟視線平行，一格就跳好幾公分），拿它當門檻
// 會把整片桌面判成邊。透視投影下 1/z 在螢幕空間對平面是**線性**的，所以 1/z 的二階差
// 在任何平面（不管多斜）上恆為 0，只有輪廓（深度跳）與摺線（斜率換）才有值。
// 一階 Sobel 仍然算（規格要的 Sobel），跟二階殘差取 min 當去噪：深度量化雜訊會讓二階差
// 偶爾冒尖，但它的一階梯度是 0，min 之後就被壓掉。
// 法線那一路：把 9 個深度樣本反投影回視空間座標，在四個象限角各算一顆法線（不必多取樣），
// 再對兩條對角做 Roberts。平面上四顆法線一樣 → 0，摺線上才有值。
// 兩條判準取 max（深度差 **或** 法線差成立就畫線）＝規格的「雙門檻」。
const COMPOSITE = `
precision highp float;
uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tDepth;
uniform float strength; uniform float uEdge;
uniform vec2 uOff;       // 一步的 uv 位移（＝EDGE.widthPx 個 CSS 像素）
uniform vec2 uHalfTan;   // (tan(fovH/2), tan(fovV/2))：反投影用
uniform vec2 uNearFar;
uniform vec3 uLineColor;
uniform vec4 uThresh;    // (深度 lo, 深度 hi, 法線 lo, 法線 hi)
uniform vec3 uEdgeCfg;   // (maxDepth, sobelW, silRel＝外輪廓相對深度跳變門檻)
varying vec2 vUv;
vec3 aces(vec3 x){
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 toSRGB(vec3 c){
  return mix(1.055 * pow(max(c, vec3(0.0)), vec3(0.4166667)) - 0.055, c * 12.92, step(c, vec3(0.0031308)));
}
// 視窗深度 → 線性深度（沿 −Z 的正距離）
float linz(vec2 uv){
  float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
  return (2.0 * uNearFar.x * uNearFar.y) / (uNearFar.y + uNearFar.x - z * (uNearFar.y - uNearFar.x));
}
vec3 vpos(vec2 uv, float z){ return vec3((uv * 2.0 - 1.0) * uHalfTan * z, -z); }
void main(){
  vec3 col = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * strength;
  vec3 outc = toSRGB(aces(col));
  if (uEdge > 0.5) {
    float z11 = linz(vUv);
    if (z11 <= uEdgeCfg.x) {
      vec2 o = uOff;
      float z00 = linz(vUv + vec2(-o.x, -o.y)); float z10 = linz(vUv + vec2(0.0, -o.y)); float z20 = linz(vUv + vec2(o.x, -o.y));
      float z01 = linz(vUv + vec2(-o.x, 0.0));                                          float z21 = linz(vUv + vec2(o.x, 0.0));
      float z02 = linz(vUv + vec2(-o.x,  o.y)); float z12 = linz(vUv + vec2(0.0,  o.y)); float z22 = linz(vUv + vec2(o.x,  o.y));
      // 反深度：平面在螢幕空間對 1/z 是線性的
      float w00 = 1.0 / z00; float w10 = 1.0 / z10; float w20 = 1.0 / z20;
      float w01 = 1.0 / z01; float w11 = 1.0 / z11; float w21 = 1.0 / z21;
      float w02 = 1.0 / z02; float w12 = 1.0 / z12; float w22 = 1.0 / z22;
      float sx = (w20 + 2.0 * w21 + w22) - (w00 + 2.0 * w01 + w02);
      float sy = (w02 + 2.0 * w12 + w22) - (w00 + 2.0 * w10 + w20);
      float grad = length(vec2(sx, sy)) * 0.125 * z11;                        // 一階（相對量）
      float curv = (abs(w01 + w21 - 2.0 * w11) + abs(w10 + w12 - 2.0 * w11)) * z11; // 二階（平面恆 0）
      float dEdge = smoothstep(uThresh.x, uThresh.y, min(grad * uEdgeCfg.y, curv));
      vec3 p00 = vpos(vUv + vec2(-o.x, -o.y), z00); vec3 p10 = vpos(vUv + vec2(0.0, -o.y), z10); vec3 p20 = vpos(vUv + vec2(o.x, -o.y), z20);
      vec3 p01 = vpos(vUv + vec2(-o.x, 0.0), z01);  vec3 p11 = vpos(vUv, z11);                   vec3 p21 = vpos(vUv + vec2(o.x, 0.0), z21);
      vec3 p02 = vpos(vUv + vec2(-o.x,  o.y), z02); vec3 p12 = vpos(vUv + vec2(0.0,  o.y), z12);
      vec3 nA = normalize(cross(p10 - p00, p01 - p00));
      vec3 nB = normalize(cross(p20 - p10, p11 - p10));
      vec3 nC = normalize(cross(p11 - p01, p02 - p01));
      vec3 nD = normalize(cross(p21 - p11, p12 - p11));
      float nDiff = max(1.0 - dot(nA, nD), 1.0 - dot(nB, nC));
      float nEdge = smoothstep(uThresh.z, uThresh.w, nDiff);
      // 外輪廓交給反轉外殼（P-1，帶系色）：鄰域裡有相對深度跳變 > silRel 的＝與背景／別尊的交界，
      // 這裡不畫，免得黑線疊在系色外殼內側把顏色吃掉（P-2 第 3 輪兩位讀者都讀成「黑線」）。
      float zmax = max(max(max(z00, z10), max(z20, z01)), max(max(z21, z02), max(z12, z22)));
      float zmin = min(min(min(z00, z10), min(z20, z01)), min(min(z21, z02), min(z12, z22)));
      float jump = max(zmax - z11, z11 - zmin) / z11;
      float inner = 1.0 - step(uEdgeCfg.z, jump);
      outc = mix(outc, uLineColor, max(dEdge, nEdge) * inner);
    }
  }
  gl_FragColor = vec4(outc, 1.0);
}`;

function quadScene(material) {
  const scene = new THREE.Scene();
  const geo = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geo, material));
  return scene;
}

/**
 * @param renderer THREE.WebGLRenderer
 * @param opts {strength, threshold, knee, radius, scale}
 *   scale＝bloom 緩衝相對畫面的比例（0.5＝半解析度，這是「守住手機效能」那條的作法）
 */
export function createBloom(renderer, opts = {}) {
  const cfg = Object.assign({ strength: 1.15, threshold: 0.55, knee: 0.28, radius: 1.6, scale: 0.5 }, opts);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const rtOpt = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, stencilBuffer: false };
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, rtOpt);
  const rtA = new THREE.WebGLRenderTarget(1, 1, { ...rtOpt, depthBuffer: false });
  const rtB = new THREE.WebGLRenderTarget(1, 1, { ...rtOpt, depthBuffer: false });

  // 深度貼圖：WebGL2 原生就有，WebGL1 要 WEBGL_depth_texture 擴充。拿不到就整條邊緣線關掉、
  // bloom 照舊（跟 renderer.js 的 bloomOK 退路同一個精神：少一層演出，不報錯、不擋畫面）。
  // 型別一律 UnsignedIntType：WebGL2 走 DEPTH_COMPONENT24、WebGL1 的擴充也允許 UNSIGNED_INT
  // （同樣 24 bit）。UnsignedShortType 只有 16 bit，在 near 0.1／far 100 之下線性深度的
  // 量化步階會大到把摺線判準淹掉，所以不用它。
  const depthTex = (() => {
    try {
      const gl = renderer.getContext();
      const ok = (renderer.capabilities && renderer.capabilities.isWebGL2) || !!gl.getExtension('WEBGL_depth_texture');
      if (!ok) return null;
      const t = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
      sceneRT.depthTexture = t;
      return t;
    } catch (e) {
      return null;
    }
  })();

  const mBright = new THREE.RawShaderMaterial({
    uniforms: { tDiffuse: { value: sceneRT.texture }, threshold: { value: cfg.threshold }, knee: { value: cfg.knee } },
    vertexShader: VERT, fragmentShader: BRIGHT, depthTest: false, depthWrite: false,
  });
  const mBlur = new THREE.RawShaderMaterial({
    uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } },
    vertexShader: VERT, fragmentShader: BLUR, depthTest: false, depthWrite: false,
  });
  const mComp = new THREE.RawShaderMaterial({
    uniforms: {
      tScene: { value: sceneRT.texture }, tBloom: { value: rtA.texture }, strength: { value: cfg.strength },
      tDepth: { value: depthTex }, uEdge: { value: 0 },
      uOff: { value: new THREE.Vector2() }, uHalfTan: { value: new THREE.Vector2(1, 1) },
      uNearFar: { value: new THREE.Vector2(0.1, 100) },
      // 刻意用 Vector3 不用 THREE.Color：Color 會把 hex 當 sRGB 轉進線性工作空間，
      // 但這條線是疊在 toSRGB **之後**的，要的就是螢幕上的那個 hex 原值。
      uLineColor: { value: new THREE.Vector3(((EDGE.color >> 16) & 255) / 255, ((EDGE.color >> 8) & 255) / 255, (EDGE.color & 255) / 255) },
      uThresh: { value: new THREE.Vector4(EDGE.depthLo, EDGE.depthHi, EDGE.normLo, EDGE.normHi) },
      uEdgeCfg: { value: new THREE.Vector3(EDGE.maxDepth, EDGE.sobelW, EDGE.silRel) },
    },
    vertexShader: VERT, fragmentShader: COMPOSITE, depthTest: false, depthWrite: false,
  });
  const sBright = quadScene(mBright);
  const sBlur = quadScene(mBlur);
  const sComp = quadScene(mComp);

  let bw = 1, bh = 1;
  let edgeWant = false;

  function setSize(w, h) {
    const dpr = renderer.getPixelRatio();
    const fw = Math.max(1, Math.round(w * dpr));
    const fh = Math.max(1, Math.round(h * dpr));
    bw = Math.max(1, Math.round(fw * cfg.scale));
    bh = Math.max(1, Math.round(fh * cfg.scale));
    // 尺寸沒變就什麼都不做：sceneRT.setSize 同尺寸是 no-op、FBO 不重建，這時若 dispose 深度貼圖，
    // three 會替 tDepth 重配一張空的，邊緣線就靜默消失（覆審 round1 H-2：180° 翻轉、鍵盘收合都會踩到）
    const sizeChanged = sceneRT.width !== fw || sceneRT.height !== fh;
    if (depthTex && sizeChanged) {
      // WebGLRenderTarget.setSize 只跟著改 color texture 的尺寸，depthTexture 要自己來
      depthTex.image.width = fw;
      depthTex.image.height = fh;
      depthTex.dispose();
    }
    sceneRT.setSize(fw, fh);
    rtA.setSize(bw, bh);
    rtB.setSize(bw, bh);
    // 取樣位移用 CSS 像素定：dpr 2 的手機與 dpr 1 的桌機線寬看起來一樣（同 IMPLEMENTATION_GUIDE §11.16 第 5 條）
    const step = Math.max(1, Math.round(EDGE.widthPx * dpr));
    mComp.uniforms.uOff.value.set(step / fw, step / fh);
  }

  function blit(scene, target) {
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, cam);
  }

  /** 取代 renderer.render(scene, camera)：同樣的畫面，多一層燈籠光暈。 */
  function render(scene, camera) {
    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(sceneRT);
    renderer.clear();
    renderer.render(scene, camera);

    mBright.uniforms.tDiffuse.value = sceneRT.texture;
    blit(sBright, rtA);
    // 兩趟分離式模糊（橫、縱），半解析度上跑
    mBlur.uniforms.tDiffuse.value = rtA.texture;
    mBlur.uniforms.dir.value.set(cfg.radius / bw, 0);
    blit(sBlur, rtB);
    mBlur.uniforms.tDiffuse.value = rtB.texture;
    mBlur.uniforms.dir.value.set(0, cfg.radius / bh);
    blit(sBlur, rtA);

    // 邊緣線：只有真的要畫的那一幀才把 uEdge 打開（shader 是同一支，開關不會重編 program）。
    // near/far/fov 每幀從相機讀：resize 換 aspect、導演換機位都不必另外通知這裡。
    const u = mComp.uniforms;
    if (edgeWant && depthTex && camera.isPerspectiveCamera) {
      const pm = camera.projectionMatrix.elements;
      u.uHalfTan.value.set(1 / pm[0], 1 / pm[5]);
      u.uNearFar.value.set(camera.near, camera.far);
      u.uEdge.value = 1;
    } else {
      u.uEdge.value = 0;
    }

    renderer.setRenderTarget(prevTarget);
    renderer.render(sComp, cam);
  }

  function setStrength(v) { mComp.uniforms.strength.value = v; }
  /** 這一幀要不要畫深度邊緣線（拿不到 DepthTexture 時恆為關）。 */
  function setEdge(on) { edgeWant = !!on; }
  /** 邊緣線參數熱調（EDGE 那幾個【試玩必調】的值）：給治具掃參數與 console 現場試用。 */
  function setEdgeParams(p = {}) {
    const u = mComp.uniforms;
    const t = u.uThresh.value, c = u.uEdgeCfg.value;
    if (p.depthLo !== undefined) t.x = p.depthLo;
    if (p.depthHi !== undefined) t.y = p.depthHi;
    if (p.normLo !== undefined) t.z = p.normLo;
    if (p.normHi !== undefined) t.w = p.normHi;
    if (p.maxDepth !== undefined) c.x = p.maxDepth;
    if (p.sobelW !== undefined) c.y = p.sobelW;
    if (p.color !== undefined) u.uLineColor.value.set(((p.color >> 16) & 255) / 255, ((p.color >> 8) & 255) / 255, (p.color & 255) / 255);
    return { depthLo: t.x, depthHi: t.y, normLo: t.z, normHi: t.w, maxDepth: c.x, sobelW: c.y };
  }

  return {
    render, setSize, setStrength, setEdge, setEdgeParams, cfg,
    get edgeReady() { return !!depthTex; },
    get edgeOn() { return !!(edgeWant && depthTex); },
  };
}

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
import * as THREE from 'three';

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

const COMPOSITE = `
precision highp float;
uniform sampler2D tScene; uniform sampler2D tBloom; uniform float strength;
varying vec2 vUv;
vec3 aces(vec3 x){
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 toSRGB(vec3 c){
  return mix(1.055 * pow(max(c, vec3(0.0)), vec3(0.4166667)) - 0.055, c * 12.92, step(c, vec3(0.0031308)));
}
void main(){
  vec3 col = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * strength;
  gl_FragColor = vec4(toSRGB(aces(col)), 1.0);
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

  const mBright = new THREE.RawShaderMaterial({
    uniforms: { tDiffuse: { value: sceneRT.texture }, threshold: { value: cfg.threshold }, knee: { value: cfg.knee } },
    vertexShader: VERT, fragmentShader: BRIGHT, depthTest: false, depthWrite: false,
  });
  const mBlur = new THREE.RawShaderMaterial({
    uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } },
    vertexShader: VERT, fragmentShader: BLUR, depthTest: false, depthWrite: false,
  });
  const mComp = new THREE.RawShaderMaterial({
    uniforms: { tScene: { value: sceneRT.texture }, tBloom: { value: rtA.texture }, strength: { value: cfg.strength } },
    vertexShader: VERT, fragmentShader: COMPOSITE, depthTest: false, depthWrite: false,
  });
  const sBright = quadScene(mBright);
  const sBlur = quadScene(mBlur);
  const sComp = quadScene(mComp);

  let bw = 1, bh = 1;

  function setSize(w, h) {
    const dpr = renderer.getPixelRatio();
    const fw = Math.max(1, Math.round(w * dpr));
    const fh = Math.max(1, Math.round(h * dpr));
    bw = Math.max(1, Math.round(fw * cfg.scale));
    bh = Math.max(1, Math.round(fh * cfg.scale));
    sceneRT.setSize(fw, fh);
    rtA.setSize(bw, bh);
    rtB.setSize(bw, bh);
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

    renderer.setRenderTarget(prevTarget);
    renderer.render(sComp, cam);
  }

  function setStrength(v) { mComp.uniforms.strength.value = v; }

  return { render, setSize, setStrength, cfg };
}

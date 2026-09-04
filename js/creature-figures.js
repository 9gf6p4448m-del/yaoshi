// 妖市 3D 環境層 — 紙紮夜戰 3D 生物人形工廠（Layer 4 換皮版，2026-09-04）
//
// 職責：把 anyCreature 產出的蒙皮 GLB（assets/creatures/*.glb）包成
// duel-figures.js:92-124 所定義的「換皮介面」，讓對決場景可以直接
//   createDuelFigures(scene, camera, { makeFigure: () => makeCreatureFigure({ glbUrl, faction }) })
// 換掉原本的四層剪影人形，一行都不用改 duel-figures.js。
//
// 介面（批 1 五件 ＋ 本卷加的四件）：
//   group / shadow / setPortrait(tex) / setCloth(hex) / setRim(opacity) / ready()   ← 批 1 既有
//   parts        骨骼名 → THREE.Bone（給演出層抓頭、抓嘴、掛特效）
//   play(name, opts)   播 GLB 內建的 clip（idle / move / attack）
//   burn()       回 Promise：dissolve 掃過＋燈籠色燒邊＋灰燼粒子，結束後 group 不可見
//   update(dt)   每幀呼叫一次（mixer／燒毀／灰燼都靠它推進）
//
// 邊界：本檔不讀寫任何遊戲狀態（S / CFG / trace()），不耗任何亂數（灰燼走 particles.js
// 自帶的決定性 LCG，種子由呼叫端給）。材質一律頂點色，不載任何外部貼圖。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { createImpactBurst } from './particles.js';

// 全部【試玩必調】。
const RIM = {
  power: 3.4, // fresnel 指數：越大邊光越細
  strength: 0.62, // 基準亮度（setRim 會再乘一個倍率上去）
  ambient: 0.025, // 正面也留一點點系色染色，不然轉正時邊光整個消失
};
const BURN = {
  ms: 1100, // dissolve 從 0 掃到 1 的時間
  edge: 0.13, // 燒邊寬度（在雜訊值域上量）
  glow: 3.4, // 燒邊發光倍率（要衝過 bloom 的 threshold 0.5 才會發光）
  color: 0xf0a840, // 燈籠光暈（對齊 assets/theme.css 的 --c-lantern-glow）
  noiseScale: 7.0, // 雜訊頻率（相對模型本地座標）
  heightBias: 0.42, // 由下往上燒的權重：0＝純亂數、1＝純由下往上
  ashAt: [0.10, 0.30, 0.52, 0.74], // 灰燼在燒到這幾個進度時各噴一批
  ashPerPuff: 34,
};
const SHADOW_COLOR = 0x05030c;
const RIM_FALLBACK = 0xf0a840;

// 同一份 GLB 只抓一次：26 隻分頭載入時，同一隻的多個實例共用一份 gltf，
// 再用 SkeletonUtils.clone 各自複製骨架（clone 會連 skeleton 一起重建，
// 直接 object3D.clone() 會讓兩個實例共用同一副骨頭、動起來互相拉扯）。
const glbCache = new Map();
let loader = null;

function loadGlb(url) {
  if (!glbCache.has(url)) {
    if (!loader) loader = new GLTFLoader();
    glbCache.set(url, loader.loadAsync(url));
  }
  return glbCache.get(url);
}

/* ── 邊光 ＋ dissolve 的 shader 注入 ─────────────────────────────────────────
 * 不換材質、不寫第二支 pass：直接在 MeshStandardMaterial 的既有 shader 尾巴
 * 疊一段 fresnel emissive 與一段 dissolve discard。這樣 GLB 烘進 COLOR_0 的
 * per-vertex AO 與頂點色全部原封不動保留，燈光也還是場景那四盞燈籠。
 * ────────────────────────────────────────────────────────────────────────── */
const PARS = `
uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimStrength;
uniform float uDissolve;
uniform vec3 uBurnColor;
uniform vec2 uBurnY;
varying vec3 vLocalPosR;

float hashR(vec3 p){
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}
float noiseR(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hashR(i + vec3(0,0,0)), hashR(i + vec3(1,0,0)), f.x),
                 mix(hashR(i + vec3(0,1,0)), hashR(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hashR(i + vec3(0,0,1)), hashR(i + vec3(1,0,1)), f.x),
                 mix(hashR(i + vec3(0,1,1)), hashR(i + vec3(1,1,1)), f.x), f.y), f.z);
}`;

const TAIL = `
{
  float _h = clamp((vLocalPosR.y - uBurnY.x) / max(uBurnY.y - uBurnY.x, 1e-4), 0.0, 1.0);
  float _n = mix(noiseR(vLocalPosR * ${BURN.noiseScale.toFixed(1)}), _h, ${BURN.heightBias.toFixed(2)});
  if (uDissolve > 0.0 && _n < uDissolve) discard;
  float _rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), uRimPower);
  gl_FragColor.rgb += uRimColor * (_rim + ${RIM.ambient.toFixed(2)}) * uRimStrength;
  if (uDissolve > 0.0) {
    float _e = smoothstep(uDissolve, uDissolve + ${BURN.edge.toFixed(2)}, _n);
    gl_FragColor.rgb = mix(uBurnColor * ${BURN.glow.toFixed(1)}, gl_FragColor.rgb, _e);
  }
}`;

/** 把一顆 MeshStandardMaterial 改造成「頂點色＋邊光＋可燒毀」。回傳它的 uniform 控制點。 */
function dressMaterial(mat, burnY) {
  const u = {
    uRimColor: { value: new THREE.Color(RIM_FALLBACK) },
    uRimPower: { value: RIM.power },
    uRimStrength: { value: RIM.strength },
    uDissolve: { value: 0 },
    uBurnColor: { value: new THREE.Color(BURN.color) },
    uBurnY: { value: new THREE.Vector2(burnY[0], burnY[1]) },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocalPosR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalPosR = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>' + PARS)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>' + TAIL);
  };
  // 注入的 GLSL 對所有實例都一樣，程式可以共用；uniform 是逐材質上傳的，所以
  // 每隻的邊光色與 dissolve 進度互不干擾。快取鍵要固定，不然 three 會為每顆材質
  // 各編一支一模一樣的 program（26 隻 × 十幾顆材質＝上百次編譯，手機會卡）。
  mat.customProgramCacheKey = () => 'yaoshi-creature-rim-burn';
  mat.needsUpdate = true;
  return u;
}

/**
 * @param opts.glbUrl   anyCreature 產出的蒙皮 GLB 路徑
 * @param opts.faction  三系（'zuli' | 'xianghu' | 'yinqi'），只用來決定邊光預設色；
 *                      呼叫端隨時可以用 setCloth(hex) 覆蓋
 * @param opts.rimColor 直接指定邊光色（優先於 faction）
 */
export function makeCreatureFigure(opts = {}) {
  const group = new THREE.Group();
  const uniforms = []; // 這隻身上所有材質的 uniform 控制點
  const parts = Object.create(null); // 骨骼名 → THREE.Bone
  const clips = Object.create(null); // clip 名 → THREE.AnimationClip

  let mixer = null;
  let model = null;
  let loaded = false;
  let rimScale = 1;
  const rimColor = new THREE.Color(opts.rimColor === undefined ? RIM_FALLBACK : opts.rimColor);

  let burning = null; // { t, dur, resolve, puff }
  let ash = null;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 22),
    new THREE.MeshBasicMaterial({ color: SHADOW_COLOR, transparent: true, opacity: 0.6, depthWrite: false, fog: false, toneMapped: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  group.visible = false;
  shadow.visible = false;

  const readyPromise = loadGlb(opts.glbUrl).then((gltf) => {
    model = cloneSkinned(gltf.scene);
    const box = new THREE.Box3().setFromObject(model);
    const burnY = [box.min.y, box.max.y];

    model.traverse((o) => {
      if (o.isBone) parts[o.name] = o;
      if (!o.isMesh) return;
      // SkeletonUtils.clone 沿用同一份材質；不各自複製的話 setCloth 會把 26 隻一起染色
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const dressed = mats.map((m) => {
        const c = m.clone();
        uniforms.push(dressMaterial(c, burnY));
        return c;
      });
      o.material = Array.isArray(o.material) ? dressed : dressed[0];
      o.frustumCulled = false; // 蒙皮變形後 bounding sphere 不準，撲擊時會整隻被剔掉
    });

    group.add(model);
    mixer = new THREE.AnimationMixer(model);
    (gltf.animations || []).forEach((c) => { clips[c.name] = c; });

    const foot = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.38;
    shadow.geometry.dispose();
    shadow.geometry = new THREE.CircleGeometry(foot, 22);

    uniforms.forEach((u) => { u.uRimColor.value.copy(rimColor); });
    loaded = true;
    return true;
  });

  function setRimUniforms() {
    uniforms.forEach((u) => {
      u.uRimColor.value.copy(rimColor);
      u.uRimStrength.value = RIM.strength * rimScale;
    });
  }

  function setDissolve(v) {
    uniforms.forEach((u) => { u.uDissolve.value = v; });
  }

  return {
    group,
    shadow,
    parts,
    /** 批 1 介面相容：3D 生物自己長著臉，不吃頭像貼圖。留著讓換皮呼叫端不必分支。 */
    setPortrait() {},
    /** 換邊光色（三系色；沿用批 1 的名字，換皮呼叫端一行都不用改） */
    setCloth(hex) { rimColor.setHex(hex); setRimUniforms(); },
    /** 邊光亮度倍率（受擊瞬間爆一下，bloom 才抓得到） */
    setRim(op) { rimScale = op === undefined ? 1 : op; setRimUniforms(); },
    /** GLB 還沒到就別冒出一團色塊 */
    ready() { return loaded; },
    /** 等 GLB 載完（預覽頁／演出層要排時序時用） */
    loaded() { return readyPromise; },
    /** 有哪些 clip 可播 */
    clipNames() { return Object.keys(clips); },
    /**
     * 播一支 GLB 內建的骨架動畫。
     * @param name 'idle' | 'move' | 'attack'
     * @param opts {loop 覆寫 clip 的循環, fade 交叉淡入秒數, timeScale 速率, clamp 播完停在最後一格}
     */
    play(name, o = {}) {
      if (!mixer || !clips[name]) return null;
      const act = mixer.clipAction(clips[name]);
      const loop = o.loop === undefined ? name !== 'attack' : o.loop;
      act.reset();
      act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      act.clampWhenFinished = o.clamp === undefined ? !loop : o.clamp;
      act.timeScale = o.timeScale === undefined ? 1 : o.timeScale;
      const fade = o.fade === undefined ? 0.25 : o.fade;
      mixer._actions.forEach((a) => { if (a !== act && a.isRunning()) a.fadeOut(fade); });
      if (fade > 0) act.fadeIn(fade);
      act.play();
      return act;
    },
    /**
     * 燒毀：dissolve 閾值 0→1 掃過整隻，燒邊發燈籠色的光，同時噴三批灰燼。
     * 結束後 group.visible === false。回 Promise，呼叫端可以 await 再進下一拍。
     * @param o {ms 燒多久, seed 灰燼的決定性種子, scale 灰燼尺寸倍率}
     */
    burn(o = {}) {
      if (burning) return burning.promise;
      const dur = (o.ms === undefined ? BURN.ms : o.ms) / 1000;
      if (!ash) ash = createImpactBurst(BURN.ashPerPuff * BURN.ashAt.length);
      const host = group.parent;
      if (host && ash.points.parent !== host) host.add(ash.points);
      let resolve;
      const promise = new Promise((r) => { resolve = r; });
      burning = { t: 0, dur, resolve, puff: 0, seed: o.seed === undefined ? 1 : o.seed, scale: o.scale === undefined ? 1 : o.scale, promise };
      return promise;
    },
    /** 每幀呼叫：推進 mixer、燒毀進度與灰燼。dt 單位是秒。 */
    update(dt) {
      if (mixer) mixer.update(dt);
      if (ash) ash.update(dt);
      if (!burning) return;
      burning.t += dt;
      const p = Math.min(1, burning.t / burning.dur);
      setDissolve(p);
      while (burning.puff < BURN.ashAt.length && p >= BURN.ashAt[burning.puff]) {
        const origin = group.getWorldPosition(new THREE.Vector3());
        const box = model ? new THREE.Box3().setFromObject(model) : null;
        origin.y += box ? (box.min.y + (box.max.y - box.min.y) * BURN.ashAt[burning.puff]) : 0.5;
        ash.burst(origin, BURN.color, {
          n: BURN.ashPerPuff, power: 0.55, scale: burning.scale,
          seed: burning.seed * 977 + burning.puff,
        });
        burning.puff++;
      }
      if (p >= 1) {
        group.visible = false;
        shadow.visible = false;
        const done = burning.resolve;
        burning = null;
        done();
      }
    },
    /** 換下一場之前把燒毀狀態收回來（dissolve 歸零、重新可見） */
    reset() {
      burning = null;
      setDissolve(0);
      group.visible = true;
      shadow.visible = true;
    },
    /** 釋放這一隻獨佔的材質與幾何（GLB 本身由 glbCache 共用，不在這裡釋放） */
    dispose() {
      group.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      });
      shadow.geometry.dispose();
      shadow.material.dispose();
    },
  };
}

/** 三系 → 邊光色。數值對齊 assets/theme.css 的 --c-*-light（同 particles.js 的 SPARK_COLOR）。 */
export const FACTION_RIM = {
  zuli: 0xd4a870,
  xianghu: 0xf08060,
  yinqi: 0x70b080,
};

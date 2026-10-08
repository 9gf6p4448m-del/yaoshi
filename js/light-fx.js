// 妖市 3D 環境層 — 光影升級 A+（v0.65.0，使用者 2026-10-08 裁定「A 的燭火氛圍＋C 的背景」）
// Layer 1：純視覺，不讀寫任何遊戲引擎狀態（S / CFG / trace()）。
//
// 示意與量測：phase2-mock/light/NOTES.md 末段 A+；凍結驗收 docs/experiments/2026-10-08-light-aplus/acceptance.md。
// 做法（相對 v0.64.0）：四盞燈籠改燭火暖橘（×1.3、衰減 2.6、照射距離 6）、曝光 1.1→0.95、半球光留 45%、
// 桌後上方一盞燭火聚光投出法寶影子；天空穹頂／遠景剪影／環境光一格不動（＝C 的背景）；很弱的室內環境反射。
//
// 三條手機成本守則（凍結 #4）：
//  ① 燈數開頁就定：聚光、陰影、環境圖都在 init 時一次建好，之後只調 uniform（強度／顏色／衰減），
//     不增減燈、不開關 castShadow——three 的 program cache key 含燈數與陰影燈數，換場不得重編 shader。
//  ② 陰影只給法寶：投影者＝托盤上當夜那幾件拍品（tray.lotNodes()）的受光不透明網格；桌布、錢、令牌、手都不投影。
//  ③ 靜止不重畫陰影圖：shadowMap.autoUpdate=false；每幀比對拍品（含骨頭）的世界矩陣，
//     與上一次畫陰影圖時相差超過 SHADOW_EPS 才標 needsUpdate。
//
// 退回開關：網址 `?fx=0` ⇒ 本檔什麼都不建（沒有聚光、沒有陰影圖、沒有環境圖、燈籠與曝光原值），
// 畫面與 v0.64.0 逐像素相同。
import * as THREE from 'three';

/** A+ 參數表。起點是示意 `light-mock.js` 的 Aplus()，**全部【試玩必調】**。 */
export const LIGHT_FX = {
  EXPOSURE: 0.95,
  // 燈籠順序＝scene-env 的 SEAT_POS 鍵序：south／north／west／east
  LANTERN_COLORS: [0xff9a40, 0xff7a2a, 0xffb060, 0xffa050],
  LANTERN_GAIN: 1.3,
  LANTERN_DECAY: 2.6,
  LANTERN_DIST: 6,
  HEMI_GAIN: 0.45,
  SPOT: {
    color: 0xffa24a, intensity: 60, distance: 10, angle: 0.75, penumbra: 0.6, decay: 2,
    pos: [-1.4, 2.6, -2.4], target: [0.2, 0, 0.8],
    mapSize: 1024, bias: -0.0006, normalBias: 0.02, near: 0.5, far: 10,
  },
  ENV_INTENSITY: 0.12, // 室內環境反射的強度（直接烘進環境圖，等同所有標準材質 envMapIntensity=0.12）
  SHADOW_EPS: 2e-3, // 拍品世界矩陣任一元素變動超過這個值才重畫陰影圖（idle 呼吸的細微擺動不必每幀重畫）
};

/** 網址 `?fx=0` 才關；其餘（含沒帶）＝A+。 */
export function lightFxUrlOn() {
  try { return new URLSearchParams(typeof location !== 'undefined' ? (location.search || '') : '').get('fx') !== '0'; } catch (e) { return true; }
}
/* 環境圖的建構器只在 A+ 開著時才抓（`?fx=0` 不多發任何請求）。放在模組頂層 await，
   讓 createLightFx 維持同步——renderer 的 init() 不必改成 async，`?fx=0` 的啟動時序與 v0.64.0 相同。 */
const URL_ON = lightFxUrlOn();
const RoomEnvironment = URL_ON ? (await import('three/addons/environments/RoomEnvironment.js')).RoomEnvironment : null;

const isLit = (m) => !!m && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial);
const matsOf = (o) => (Array.isArray(o.material) ? o.material : [o.material]);

/** 室內環境圖：把 RoomEnvironment 的發光體與點光等比例乘 k 再烘 PMREM。
 *  three 0.158 沒有 scene.environmentIntensity；逐材質設 envMapIntensity 又管不到之後才載入的 GLB，
 *  烘的時候就乘進去（渲染是線性的）＝所有標準材質的 envMapIntensity 一律為 k。 */
function makeEnv(renderer, k) {
  const room = new RoomEnvironment(renderer);
  room.traverse((o) => {
    if (o.isLight) o.intensity *= k;
    if (o.isMesh && o.material && o.material.isMeshBasicMaterial) o.material.color.multiplyScalar(k);
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  return tex;
}

/**
 * @param {{scene:THREE.Scene, renderer:THREE.WebGLRenderer, lanterns:THREE.PointLight[], hemi:THREE.HemisphereLight, receivers?:THREE.Object3D[]}} env
 * @param {{on?:boolean}} [opts]
 * @returns {{on:boolean, update:(stageOn:number, tray:any)=>void, stats:()=>object, spot:THREE.SpotLight|null}}
 */
export function createLightFx(env, opts = {}) {
  const on = (opts.on !== undefined ? !!opts.on : URL_ON) && !!RoomEnvironment;
  if (!on) return { on: false, spot: null, update() {}, stats: () => ({ on: false }) };
  const { scene, renderer, lanterns, hemi } = env;
  const P = LIGHT_FX;

  // 現況值（對決時往這裡收：A+ 是牌桌的燈光，對決維持 v0.64.0 的戲台光）
  const base = {
    exposure: renderer.toneMappingExposure,
    lan: lanterns.map((l) => ({ c: l.color.clone(), b: l.userData.baseIntensity, d: l.decay, dist: l.distance })),
    hemi: hemi.intensity,
  };
  const warm = P.LANTERN_COLORS.map((h) => new THREE.Color(h));

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const S = P.SPOT;
  const spot = new THREE.SpotLight(S.color, S.intensity, S.distance, S.angle, S.penumbra, S.decay);
  spot.name = 'light-fx-spot';
  spot.position.set(...S.pos);
  spot.target.position.set(...S.target);
  spot.castShadow = true;
  spot.shadow.mapSize.set(S.mapSize, S.mapSize);
  spot.shadow.bias = S.bias;
  spot.shadow.normalBias = S.normalBias;
  spot.shadow.camera.near = S.near;
  spot.shadow.camera.far = S.far;
  scene.add(spot, spot.target);

  scene.environment = makeEnv(renderer, P.ENV_INTENSITY);

  // 靜態受影面（木桌、桌角香灰）：開頁設一次
  for (const r of env.receivers || []) if (r) r.traverse((o) => { if (o.isMesh && matsOf(o).some(isLit)) o.receiveShadow = true; });

  let lastK = -1;
  function blend(k) { // k＝1 牌桌（A+）、0 對決（現況）
    if (k === lastK) return;
    lastK = k;
    renderer.toneMappingExposure = base.exposure + (P.EXPOSURE - base.exposure) * k;
    lanterns.forEach((l, i) => {
      const b = base.lan[i];
      l.color.copy(b.c).lerp(warm[i], k);
      l.userData.baseIntensity = b.b * (1 + (P.LANTERN_GAIN - 1) * k);
      l.decay = b.d + (P.LANTERN_DECAY - b.d) * k;
      l.distance = b.dist + (P.LANTERN_DIST - b.dist) * k;
    });
    hemi.intensity = base.hemi * (1 + (P.HEMI_GAIN - 1) * k);
    spot.intensity = S.intensity * k;
  }
  blend(1);

  let sig = new Float64Array(0), sigN = 0, lastSig = null, requests = 0, casters = 0;
  const push = (v) => { if (sigN >= sig.length) { const n = new Float64Array(Math.max(256, sig.length * 2)); n.set(sig); sig = n; } sig[sigN++] = v; };

  function shadowPass(tray) {
    if (!tray || !tray.group) return;
    const lots = typeof tray.lotNodes === 'function' ? tray.lotNodes() : [];
    // 托盤上的受光網格都收影（錢、令牌、手、桌布）；投影一律先關，下面只對拍品打開
    tray.group.traverse((o) => { if (o.isMesh) { o.receiveShadow = matsOf(o).some(isLit); o.castShadow = false; } });
    sigN = 0; casters = 0;
    push(tray.group.visible ? 1 : 0);
    push(lots.length);
    for (const node of lots) {
      node.updateWorldMatrix(true, true);
      push(node.id);
      node.traverse((o) => {
        push(o.visible ? 1 : 0);
        if (o.isMesh) {
          const ms = matsOf(o);
          o.castShadow = ms.some(isLit) && ms.every((m) => m && !m.transparent);
          if (o.castShadow) casters++;
        }
        if (o.isMesh || o.isBone) { const e = o.matrixWorld.elements; for (let i = 0; i < 16; i++) push(e[i]); }
      });
    }
    let dirty = !lastSig || lastSig.length !== sigN;
    for (let i = 0; !dirty && i < sigN; i++) if (Math.abs(sig[i] - lastSig[i]) > P.SHADOW_EPS) dirty = true;
    if (dirty) {
      lastSig = sig.slice(0, sigN);
      renderer.shadowMap.needsUpdate = true;
      requests++;
    }
  }

  return {
    on: true,
    spot,
    /** 每幀 render 前呼叫一次。stageOn＝renderer 的戲台燈係數（0 牌桌、1 對決）。 */
    update(stageOn, tray) {
      blend(Math.round((1 - Math.min(1, Math.max(0, stageOn))) * 1000) / 1000);
      shadowPass(tray);
    },
    /** 治具出口（只讀）：陰影圖重畫請求次數、目前投影者數量 */
    stats: () => ({ on: true, shadowRequests: requests, casters, exposure: renderer.toneMappingExposure }),
  };
}

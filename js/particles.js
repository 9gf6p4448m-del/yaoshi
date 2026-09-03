// 妖市 3D 環境層 — 粒子系統（線香煙、漂浮火星）
// Layer 1：純視覺演出，不消耗 S.rng()／S.rngUi()（引擎尚未橋接，這層先用 Math.random）。
import * as THREE from 'three';

/**
 * 柔邊圓點貼圖（一次性產生，兩組粒子共用）。
 * 沒有貼圖的 PointsMaterial 畫出來是硬邊正方形——實測在深色背景上像一堆灰色碎屑，
 * 不像煙也不像火星（scratchpad b1-title.png）。用一張徑向漸層當 map 就成了柔邊圓點。
 */
let softDot = null;
function getSoftDot() {
  if (softDot) return softDot;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d').createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  const ctx = c.getContext('2d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  softDot = new THREE.CanvasTexture(c);
  softDot.colorSpace = THREE.SRGBColorSpace;
  return softDot;
}

// 桌面四個小圓點位置（線香煙的起點），對稱分布在桌面內圈
const INCENSE_ORIGINS = [
  [1.5, 0.16, 1.5],
  [-1.5, 0.16, 1.5],
  [1.5, 0.16, -1.5],
  [-1.5, 0.16, -1.5],
];

// 燈籠附近（火星生成範圍），對應 scene-env 的四個燈籠座位半徑
// 與 scene-env 的 LANTERN_HEIGHT／LANTERN_DIST 對齊（那裡改了這裡要跟著改）
const EMBER_LANTERNS = [
  [0, 1.5, -2.6],
  [0, 1.5, 2.6],
  [-2.6, 1.5, 0],
  [2.6, 1.5, 0],
];

function makeParticleSystem({ count, color, size, spawn, opacity = 0.75, blending = THREE.NormalBlending, sizeAttenuation = true }) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const state = new Array(count);
  const baseColor = new THREE.Color(color);

  for (let i = 0; i < count; i++) {
    state[i] = spawn(true);
    positions[i * 3] = state[i].pos[0];
    positions[i * 3 + 1] = state[i].pos[1];
    positions[i * 3 + 2] = state[i].pos[2];
    colors[i * 3] = baseColor.r;
    colors[i * 3 + 1] = baseColor.g;
    colors[i * 3 + 2] = baseColor.b;
  }

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  const colorAttr = new THREE.BufferAttribute(colors, 3);
  colorAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', posAttr);
  geometry.setAttribute('color', colorAttr);

  const material = new THREE.PointsMaterial({
    size,
    map: getSoftDot(),
    alphaTest: 0.01,
    vertexColors: true,
    transparent: true,
    opacity,
    blending,
    sizeAttenuation,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  const bg = new THREE.Color(0x1a0a2e);

  function update(dt, elapsed) {
    for (let i = 0; i < count; i++) {
      const s = state[i];
      s.age += dt;
      const t = s.age / s.life; // 0..1 生命週期進度
      if (t >= 1) {
        state[i] = spawn(false);
        continue;
      }
      s.update(s, dt, elapsed, t);
      positions[i * 3] = s.pos[0];
      positions[i * 3 + 1] = s.pos[1];
      positions[i * 3 + 2] = s.pos[2];
      // 顏色隨生命期往背景色淡出，近似「漸變透明」的視覺效果
      const fade = 1 - t;
      colors[i * 3] = baseColor.r * fade + bg.r * t;
      colors[i * 3 + 1] = baseColor.g * fade + bg.g * t;
      colors[i * 3 + 2] = baseColor.b * fade + bg.b * t;
    }
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  return { points, update };
}

export function createIncenseSmoke(count = 50) {
  const spawn = (initial) => {
    const origin = INCENSE_ORIGINS[Math.floor(Math.random() * INCENSE_ORIGINS.length)];
    const life = 3 + Math.random() * 2;
    return {
      pos: [origin[0], origin[1] + (initial ? Math.random() * 1.5 : 0), origin[2]],
      origin,
      age: initial ? Math.random() * life : 0,
      life,
      phase: Math.random() * Math.PI * 2,
      sway: 0.15 + Math.random() * 0.15,
      rise: 0.4 + Math.random() * 0.3,
      update(s, dt, elapsed, t) {
        s.pos[1] += s.rise * dt;
        s.pos[0] = s.origin[0] + Math.sin(elapsed * 0.8 + s.phase) * s.sway * t;
        s.pos[2] = s.origin[2] + Math.cos(elapsed * 0.6 + s.phase) * s.sway * t;
      },
    };
  };
  return makeParticleSystem({ count, color: 0xcfc0d8, size: 0.42, spawn, opacity: 0.3 });
}

/* ===================== 命中噴發（v0.27 對決大作化 批 1） =====================
 * 對決碰撞瞬間從命中點噴出的火星／符紙碎片。沿用本檔既有的 Points 系統
 * （getSoftDot 貼圖 ＋ BufferGeometry ＋ PointsMaterial），不另開一套。
 *
 * 亂數：本檔既有的 Math.random（createIncenseSmoke／createEmbers 兩支 spawn 裡，共 15 處）是既有債，
 * 新程式碼不再增加——噴發用自帶的決定性 LCG，種子由呼叫端給（對決場次序號），
 * 這樣同一場對決重播長得一樣，也不會有人誤以為 3D 層可以隨手用 Math.random。 */

// 三系＋詛咒＋燈籠的火星顏色，數值對齊 assets/theme.css 的 --c-*-light
export const SPARK_COLOR = {
  zuling: 0xd4a870,
  xianghuo: 0xf08060,
  yinqi: 0x70b080,
  curse: 0x9060d0,
  lantern: 0xf0a840,
};

// 全部【試玩必調】：噴發的量、初速、重力、壽命
const BURST = { count: 110, speed: 3.1, spread: 0.6, gravity: 3.2, drag: 1.8, life: 1.05, size: 0.2 };

function makeLcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * 一次性噴發的粒子池。平常全部停在畫面外（不畫、不算），burst() 才點燃一批。
 * update() 每幀呼叫；沒有活著的粒子時整組隱藏，牌桌畫面零成本。
 */
export function createImpactBurst(count = BURST.count) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3); // 實際送進 GPU 的顏色＝tint × fade
  const tint = new Float32Array(count * 3); // 每顆的原色（噴發當下決定，之後不變）
  const vel = new Float32Array(count * 3);
  const age = new Float32Array(count);
  const life = new Float32Array(count);
  const PARK = -999;

  for (let i = 0; i < count; i++) {
    positions[i * 3 + 1] = PARK;
    life[i] = 0;
  }

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  const colorAttr = new THREE.BufferAttribute(colors, 3);
  colorAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', posAttr);
  geometry.setAttribute('color', colorAttr);

  const material = new THREE.PointsMaterial({
    size: BURST.size,
    map: getSoftDot(),
    alphaTest: 0.01,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false,
    fog: false, // 命中點就在鏡頭前，被霧吃掉就白噴了
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;
  const base = new THREE.Color();
  let alive = 0;
  let cursor = 0;
  let gk = 1; // 最近一次噴發的尺寸倍率：重力要跟著縮，不然小尺寸的火花會掉得太快

  /**
   * @param origin 命中點世界座標（THREE.Vector3 或 [x,y,z]）
   * @param colorHex 火星顏色（用 SPARK_COLOR 那張表）
   * @param opts {n 噴幾顆, power 力道倍率, seed 決定性種子, scale 尺寸倍率}
   *   scale＝畫面尺度倍率：同一場火花在 390px 高的手機與 828px 高的桌機上要佔一樣的
   *   「像素」比例，不是一樣的世界單位（同 duel-figures 的 FIG.pixelH，理由見那裡）。
   */
  function burst(origin, colorHex, opts = {}) {
    const sk = opts.scale === undefined ? 1 : opts.scale;
    const ox = origin.x !== undefined ? origin.x : origin[0];
    const oy = origin.y !== undefined ? origin.y : origin[1];
    const oz = origin.z !== undefined ? origin.z : origin[2];
    const n = Math.min(count, opts.n || count);
    const power = (opts.power === undefined ? 1 : opts.power) * sk;
    material.size = BURST.size * sk;
    gk = sk;
    const rnd = makeLcg(opts.seed === undefined ? 1 : opts.seed);
    base.setHex(colorHex);

    for (let k = 0; k < n; k++) {
      const i = cursor;
      cursor = (cursor + 1) % count;
      if (life[i] > 0 && age[i] < life[i]) alive--; // 覆寫還活著的那顆，計數要先扣回來
      // 半球狀噴發：水平面上均勻一圈，垂直往上偏，像火星被打飛
      const a = rnd() * Math.PI * 2;
      const up = 0.25 + rnd() * 0.85;
      const r = 0.35 + rnd() * 0.65;
      const sp = BURST.speed * power * (0.45 + rnd() * 0.55);
      vel[i * 3] = Math.cos(a) * r * sp;
      vel[i * 3 + 1] = up * sp;
      vel[i * 3 + 2] = Math.sin(a) * r * sp;
      positions[i * 3] = ox + (rnd() - 0.5) * BURST.spread * 0.35 * sk;
      positions[i * 3 + 1] = oy + (rnd() - 0.5) * BURST.spread * 0.35 * sk;
      positions[i * 3 + 2] = oz + (rnd() - 0.5) * BURST.spread * 0.35 * sk;
      // 逐顆在原色與燈籠白之間抖一點，整團才不會像一片色紙
      const hot = 0.55 + rnd() * 0.9;
      tint[i * 3] = Math.min(1.6, base.r * hot + 0.25 * hot);
      tint[i * 3 + 1] = Math.min(1.6, base.g * hot + 0.16 * hot);
      tint[i * 3 + 2] = Math.min(1.6, base.b * hot + 0.08 * hot);
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 0;
      age[i] = 0;
      life[i] = BURST.life * (0.6 + rnd() * 0.8);
      alive++;
    }
    points.visible = true;
  }

  function update(dt) {
    if (!alive) {
      if (points.visible) points.visible = false;
      return;
    }
    const damp = Math.max(0, 1 - BURST.drag * dt);
    for (let i = 0; i < count; i++) {
      if (life[i] <= 0) continue;
      age[i] += dt;
      const t = age[i] / life[i];
      if (t >= 1) {
        life[i] = 0;
        positions[i * 3 + 1] = PARK;
        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0;
        alive--;
        continue;
      }
      vel[i * 3] *= damp;
      vel[i * 3 + 1] = vel[i * 3 + 1] * damp - BURST.gravity * gk * dt;
      vel[i * 3 + 2] *= damp;
      positions[i * 3] += vel[i * 3] * dt;
      positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
      positions[i * 3 + 2] += vel[i * 3 + 2] * dt;
      // 加色混合下「淡出」是往黑收，不是往背景色收（往背景色收會變成一團紫）。
      // 前 18% 生命先衝到最亮（打擊的閃芒），之後平方衰減。
      const fade = t < 0.18 ? t / 0.18 : (1 - (t - 0.18) / 0.82) ** 2;
      colors[i * 3] = tint[i * 3] * fade;
      colors[i * 3 + 1] = tint[i * 3 + 1] * fade;
      colors[i * 3 + 2] = tint[i * 3 + 2] * fade;
    }
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  return { points, burst, update };
}

export function createEmbers(count = 20) {
  const spawn = () => {
    const lantern = EMBER_LANTERNS[Math.floor(Math.random() * EMBER_LANTERNS.length)];
    const life = 1.5 + Math.random() * 1.5;
    const jitterX = (Math.random() - 0.5) * 0.8;
    const jitterZ = (Math.random() - 0.5) * 0.8;
    return {
      pos: [lantern[0] + jitterX, lantern[1] - Math.random() * 0.5, lantern[2] + jitterZ],
      age: 0,
      life,
      driftX: (Math.random() - 0.5) * 0.3,
      driftZ: (Math.random() - 0.5) * 0.3,
      rise: 0.3 + Math.random() * 0.4,
      update(s, dt) {
        s.pos[0] += s.driftX * dt;
        s.pos[1] += s.rise * dt;
        s.pos[2] += s.driftZ * dt;
      },
    };
  };
  return makeParticleSystem({ count, color: 0xf0a040, size: 0.14, spawn, opacity: 0.9, blending: THREE.AdditiveBlending });
}

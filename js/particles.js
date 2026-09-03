// 妖市 3D 環境層 — 粒子系統（線香煙、漂浮火星）
// Layer 1：純視覺演出，不消耗 S.rng()／S.rngUi()（引擎尚未橋接，這層先用 Math.random）。
import * as THREE from 'three';

// 桌面四個小圓點位置（線香煙的起點），對稱分布在桌面內圈
const INCENSE_ORIGINS = [
  [0.8, 0.16, 0.8],
  [-0.8, 0.16, 0.8],
  [0.8, 0.16, -0.8],
  [-0.8, 0.16, -0.8],
];

// 燈籠附近（火星生成範圍），對應 scene-env 的四個燈籠座位半徑
const EMBER_LANTERNS = [
  [0, 2.5, -2.2],
  [0, 2.5, 2.2],
  [-2.2, 2.5, 0],
  [2.2, 2.5, 0],
];

function makeParticleSystem({ count, color, size, spawn, sizeAttenuation = true }) {
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
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
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
  return makeParticleSystem({ count, color: 0xffffff, size: 0.12, spawn });
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
  return makeParticleSystem({ count, color: 0xf0a040, size: 0.06, spawn });
}

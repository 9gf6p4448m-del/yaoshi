// 妖市 3D 環境層 — 主入口
// Layer 1：場景環境。Layer 2（2026-09-03 v0.15）：bridge-players.js 把角色 sprite 接上 S.players。
// canvas 樣式一律用 JS inline style 設定，不寫進 index.html 的 <style>。
// index.html 這一版起除了 importmap 與 module script 之外另有牌桌面板半透明的 CSS
// （使用者裁定「甲」，讓 3D 透出來），但引擎邏輯仍然完全沒動。
import * as THREE from 'three';
import { createSceneEnv, resizeSceneEnv } from './scene-env.js';
import { createIncenseSmoke, createEmbers } from './particles.js';
import { createCharacterBillboards } from './characters-billboard.js';
import { createPlayerBridge } from './bridge-players.js';

function createCanvas() {
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    // 負值：#table／#titleScr 是未定位（static）的元素，CSS 疊層順序下未定位的
    // in-flow 內容本來就會畫在「z-index:0 的定位元素」之上；用負 z-index 讓
    // canvas 落在 <body> 背景之上、所有現有 UI 之下，不必改動 index.html 既有 CSS。
    zIndex: '-1',
  });
  document.body.appendChild(canvas);
  return canvas;
}

function init() {
  const canvas = createCanvas();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const { scene, camera, lanterns } = createSceneEnv(window.innerWidth / window.innerHeight);

  const smoke = createIncenseSmoke(50);
  const embers = createEmbers(20);
  scene.add(smoke.points, embers.points);

  const { group: charGroup, sprites } = createCharacterBillboards();
  scene.add(charGroup);
  const playerBridge = createPlayerBridge(sprites, camera);

  let lastOnTable = null;
  let lastT = performance.now();
  let elapsed = 0;
  let running = true;

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - lastT) / 1000, 0.1); // 分頁閒置後回來避免一次跳太多
    lastT = now;
    elapsed += dt;

    // 燈籠光微微閃爍，避免死板的固定光源
    lanterns.forEach((light, i) => {
      light.intensity = 3.4 + Math.sin(elapsed * (1.5 + i * 0.3) + i) * 0.35;
    });

    smoke.update(dt, elapsed);
    embers.update(dt, elapsed);
    // 只有牌桌畫面讓 3D 全亮；標題頁與各全螢幕場景把它壓暗，
    // 不然木桌會蓋掉標題文字的對比（實測 scratchpad b1-title.png）。
    const onTable = playerBridge.update(now);
    if (onTable !== lastOnTable) {
      lastOnTable = onTable;
      canvas.style.opacity = onTable ? '1' : '0.38';
      canvas.style.transition = 'opacity .5s';
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) {
      lastT = performance.now();
      requestAnimationFrame(frame);
    }
  });

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    resizeSceneEnv(camera, window.innerWidth / window.innerHeight);
  });
}

init();

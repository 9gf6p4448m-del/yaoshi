// 妖市 3D 環境層 — 主入口
// Layer 1：只做場景環境，不橋接遊戲邏輯。index.html 除了 importmap 與這行 module script
// 之外不得再改動——這裡的 canvas 樣式一律用 JS inline style 設定，不寫進 index.html 的 <style>。
import * as THREE from 'three';
import { createSceneEnv, resizeSceneEnv } from './scene-env.js';
import { createIncenseSmoke, createEmbers } from './particles.js';
import { createCharacterBillboards } from './characters-billboard.js';

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

  const { group: charGroup } = createCharacterBillboards();
  scene.add(charGroup);

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
      light.intensity = 1.5 + Math.sin(elapsed * (1.5 + i * 0.3) + i) * 0.15;
    });

    smoke.update(dt, elapsed);
    embers.update(dt, elapsed);

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

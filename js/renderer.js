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
import { createCameraDirector } from './camera-director.js';

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
  const director = createCameraDirector(camera, lanterns);

  let lastKind = undefined;
  let lastT = performance.now();
  let elapsed = 0;
  let running = true;

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - lastT) / 1000, 0.1); // 分頁閒置後回來避免一次跳太多
    lastT = now;
    elapsed += dt;

    // 運鏡與燈籠強調（開標打亮得標者、對決只留交手兩人）
    const emphasis = director.update(dt, now);

    // 燈籠光微微閃爍，避免死板的固定光源；再乘上導演給的強調係數
    lanterns.forEach((light, i) => {
      light.intensity = (3.4 + Math.sin(elapsed * (1.5 + i * 0.3) + i) * 0.35) * emphasis[i];
    });

    smoke.update(dt, elapsed);
    embers.update(dt, elapsed);
    // 牌桌與對決全亮（對決時網頁牌桌會淡出，3D 就是舞台）；標題頁與其他全螢幕場景壓暗，
    // 不然木桌會蓋掉標題文字的對比（實測 scratchpad b1-title.png）。
    const kind = playerBridge.update(now);
    if (kind !== lastKind) {
      lastKind = kind;
      canvas.style.opacity = kind ? '1' : '0.38';
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

  // 轉向或視窗變形時，導演下一次補間才會用到新的長寬比，先更新投影矩陣
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    resizeSceneEnv(camera, window.innerWidth / window.innerHeight);
  });
}

init();

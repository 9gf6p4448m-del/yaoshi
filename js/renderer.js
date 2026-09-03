// 妖市 3D 環境層 — 主入口
// Layer 1：場景環境。Layer 2（2026-09-03 v0.15）：bridge-players.js 把角色 sprite 接上 S.players。
// canvas 樣式一律用 JS inline style 設定，不寫進 index.html 的 <style>。
// index.html 這一版起除了 importmap 與 module script 之外另有牌桌面板半透明的 CSS
// （使用者裁定「甲」，讓 3D 透出來），但引擎邏輯仍然完全沒動。
import * as THREE from 'three';
import { createBloom } from './bloom.js';
import { createSceneEnv, resizeSceneEnv, FOG_DENSITY } from './scene-env.js';
import { createIncenseSmoke, createEmbers, createImpactBurst, SPARK_COLOR } from './particles.js';
import { createCharacterBillboards } from './characters-billboard.js';
import { createPlayerBridge } from './bridge-players.js';
import { createCameraDirector } from './camera-director.js';
import { createDuelFigures } from './duel-figures.js';

// 後製 bloom（v0.27）：只有對決場景開，牌桌與標題頁走原本的直接 render。
// 理由有兩條——① 手機效能：bloom 是全畫面 fill，開在整局最久的牌桌上最不划算；
// ② 牌桌畫面要跟 49dba77 對得起來（驗收 J7）。scale 0.5＝半解析度緩衝。
// 實作在 js/bloom.js（自製，不是 UnrealBloomPass，理由見那個檔的檔頭）。全部【試玩必調】。
const BLOOM = { strength: 1.05, threshold: 0.5, knee: 0.3, radius: 1.7, scale: 0.5 };

/** 取得 GPU 名稱（拿不到就回空字串，當成「不是軟體 GL」照常開 bloom）。 */
function glRendererName(renderer) {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  } catch (e) {
    return '';
  }
}

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
  // 給 index.html 的 CSS 用的旗標：3D 層真的跑起來了，對決場景才把 DOM 的平貼頭像收掉
  // （換成 duel-figures 的立體站姿）。three 載不到／script tag 被拿掉時這個 class 不會出現，
  // DOM 版對決就維持原樣完整可玩（驗收 J8）。
  document.documentElement.classList.add('ys3d');
  const canvas = createCanvas();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const { scene, camera, lanterns } = createSceneEnv(window.innerWidth / window.innerHeight);

  const smoke = createIncenseSmoke(50);
  const embers = createEmbers(20);
  const impact = createImpactBurst();
  scene.add(smoke.points, embers.points, impact.points);
  const SMOKE_BASE = smoke.points.material.opacity; // 牌桌用的原始濃度（對決時壓到 22%）

  const { group: charGroup, sprites } = createCharacterBillboards();
  scene.add(charGroup);
  const playerBridge = createPlayerBridge(sprites, camera);
  const director = createCameraDirector(camera, lanterns);
  // 換皮：傳 { makeFigure: 你的工廠 } 就能整組換掉呈現方式（介面說明在 duel-figures.js 檔中）
  const duelFigures = createDuelFigures(scene, camera);

  // 後製鏈：對決時走 bloom，其餘直接 render（見檔頭 BLOOM 註解）
  const bloom = createBloom(renderer, BLOOM);
  bloom.setSize(window.innerWidth, window.innerHeight);
  let warmedUp = false; // 第一幀先跑一次 bloom 把 shader 編掉，免得第一場對決卡一下
  // 軟體 GL（SwiftShader／llvmpipe／Android WebView 的軟解退路）一律不開 bloom：
  // 實測 SwiftShader 上「把場景畫進 render target」這條路會讓桌面與粒子的 shader
  // 直接編譯失敗（compiled=false、info log 全空），console 冒兩個 THREE.WebGLProgram
  // Shader Error；而且軟體光柵本來就跑不動全畫面後製。真實 GPU（實測 ANGLE/AMD D3D11）
  // 完全正常。退回直接 render 只是少一層光暈，其餘演出照舊。
  const bloomOK = !/swiftshader|software|llvmpipe|basic render/i.test(glRendererName(renderer));

  // hitstop：受擊瞬間整個 3D 時間軸停住（dt 歸零但照樣 render，rAF 不掉）。
  // 由演出層的 ys:hitstop 事件驅動，detail.ms 是要停多久；ms 給 0 就是立刻解凍。
  let hitstopUntil = 0;
  document.addEventListener('ys:hitstop', (e) => {
    const ms = e && e.detail ? Number(e.detail.ms) || 0 : 0;
    hitstopUntil = ms > 0 ? performance.now() + ms : 0;
  });

  // 【積木接收端】ys:fx-impact：在指定世界座標噴一批三系色的火星。
  // detail.pos 不給就用畫面中央的胸口高度（對決的命中點）；跟「對決」解耦，
  // 任何演出時間軸都能叫，三拍制時一拍叫一次、各給不同顏色與力道。
  // 尺度倍率：跟 duel-figures 的 FIG.pixelH 同一個道理——火花要佔一樣的「畫面比例」，
  // 不是一樣的世界單位，不然 828px 高的桌機上會噴出比人還大的一團。390 是手機基準高度。
  const fxScale = () => Math.max(0.3, Math.min(1.6, 390 / (window.innerHeight || 390)));
  const IMPACT_TABLE_Y = 0.15; // 桌面高度：命中點的高度要跟著尺度一起縮回桌面
  const IMPACT_CHEST_Y = 0.95;
  let burstSeed = 1;
  document.addEventListener('ys:fx-impact', (e) => {
    const d = (e && e.detail) || {};
    const color = SPARK_COLOR[d.fac] || SPARK_COLOR.lantern;
    const power = Math.max(0.4, Math.min(1.8, Number(d.power) || 1));
    const k = fxScale();
    const pos = d.pos || [0, IMPACT_TABLE_Y + (IMPACT_CHEST_Y - IMPACT_TABLE_Y) * k, 0];
    impact.burst(pos, color, { power, scale: k, seed: burstSeed++ });
  });

  // 量測出口（與 index.html 的 window.__yaoshi 同一個角色）：驗收要能讀 renderer.info
  // 的 geometries／textures 看有沒有累積、要能取粒子座標證明 hitstop 真的把 dt 歸零。
  // 只讀不寫，遊戲本身完全不依賴它。
  window.__yaoshi3d = { scene, camera, renderer, bloom, smoke, embers, impact, get bloomOn() { return bloomOK; } };

  let lastKind = undefined;
  let lastT = performance.now();
  let elapsed = 0;
  let running = true;

  function frame(now) {
    if (!running) return;
    let dt = Math.min((now - lastT) / 1000, 0.1); // 分頁閒置後回來避免一次跳太多
    lastT = now;
    if (now < hitstopUntil) dt = 0; // 停格：時間不前進，畫面就凍在受擊那一格
    elapsed += dt;

    // 運鏡與燈籠強調（開標打亮得標者、對決只留交手兩人）
    const emphasis = director.update(dt, now);

    // 燈籠光微微閃爍，避免死板的固定光源；再乘上導演給的強調係數
    lanterns.forEach((light, i) => {
      light.intensity = (3.4 + Math.sin(elapsed * (1.5 + i * 0.3) + i) * 0.35) * emphasis[i];
    });

    smoke.update(dt, elapsed);
    embers.update(dt, elapsed);
    impact.update(dt);
    duelFigures.update(dt, now);
    // 牌桌與對決全亮（對決時網頁牌桌會淡出，3D 就是舞台）；標題頁與其他全螢幕場景壓暗，
    // 不然木桌會蓋掉標題文字的對比（實測 scratchpad b1-title.png）。
    const kind = playerBridge.update(now);
    if (kind !== lastKind) {
      lastKind = kind;
      canvas.style.opacity = kind ? '1' : '0.38';
      canvas.style.transition = 'opacity .5s';
    }

    // 夜霧在兩段密度之間補間：對決濃、其餘淡（切場景時 0.4 秒收斂，不會突然一片灰）
    const fogWant = kind === 'duel' ? FOG_DENSITY.duel : FOG_DENSITY.table;
    if (scene.fog) scene.fog.density += (fogWant - scene.fog.density) * Math.min(1, dt * 2.5);

    // 線香煙在對決要壓掉：對決機位貼著桌面，煙會從鏡頭前面飄過去變成一團團灰斑，
    // 蓋在兩個人臉上（實測 scratchpad duel-844-2-hitstop.png 第一版）。牌桌機位遠，
    // 同樣的煙是氛圍；只有對決要收。
    const smokeWant = kind === 'duel' ? SMOKE_BASE * 0.22 : SMOKE_BASE;
    const sm = smoke.points.material;
    sm.opacity += (smokeWant - sm.opacity) * Math.min(1, dt * 3);

    if (bloomOK && (!warmedUp || kind === 'duel')) {
      warmedUp = true; // 第一幀（標題頁，canvas 只有 0.38 不透明度）順手把 bloom 的 shader 編掉
      bloom.render(scene, camera);
    } else {
      renderer.render(scene, camera);
    }
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
    bloom.setSize(window.innerWidth, window.innerHeight);
    resizeSceneEnv(camera, window.innerWidth / window.innerHeight);
  });
}

init();

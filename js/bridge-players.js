// 妖市 3D 環境層 — 角色橋接（Layer 2，2026-09-03 v0.15）
//
// 職責：把四個 3D 角色 sprite 接上真實賽局資料——讀 S.players 的角色與壽命，
// 換成對應的角色 SVG、依氣色三態換貼圖，並把 sprite 對齊到畫面上四張座位卡的位置。
//
// 邊界（不得違反，理由見 docs/IMPLEMENTATION_GUIDE.md §7）：
// - 只讀 window.__yaoshi 的唯讀欄位（S.players / CHAR_SVG / lifeState），不寫回任何賽局欄位
// - 不呼叫任何會耗亂數的東西（賽局亂數 S.rng 與演出亂數 S.rngUi 都不碰），
//   否則 trace() 等價驗證會失效
// - 角色 id→SVG 檔名的對照與氣色三態門檻都從 index.html 取得，這裡不另存一份（防分岔）
import * as THREE from 'three';

const SEAT_ORDER = ['south', 'north', 'west', 'east']; // 陣列索引＝玩家 id：0 南 1 北 2 西 3 東

// 每席對齊哪個 DOM 元素：玩家（id 0）是底部長條 #south，其餘是 #seat<id>
// （與 index.html revealGlow() 的取法一致，那裡改了這裡要跟著改）
const SEAT_DOM_ID = ['south', 'seat1', 'seat2', 'seat3'];

// 各席 sprite 的目標高度（CSS 像素）。左右兩席的欄位有整欄高度可用，給大一點；
// 上下兩席只有 56/62px 的橫條，給小一點免得整顆頭被切在畫面外。
const SEAT_PIXEL_H = [74, 74, 86, 86];

// 各席相對座位卡中心的偏移（CSS 像素，正值往下）。頭像要浮在卡片上緣之上，
// 讓「卡片＝名牌、3D＝坐在後面的人」這個讀法成立。
const SEAT_OFFSET_Y = [-54, 46, -56, -56];

// 牌桌畫面不畫 3D 頭像：四張座位卡本來就有同一張角色 SVG，再疊一顆大頭只是同一張臉出現兩次，
// 實測（scratchpad b1-table.png）畫面明顯變亂。牌桌上 3D 的價值是氛圍——八角桌、四盞燈籠光、
// 線香煙從半透明面板後面透出來，那個不跟任何 DOM 重複。
// 貼圖與氣色的橋接照跑（成本極低、且是對決場景要用的同一條路），只是先不顯示：
// 批 2「丙」做開標與對決運鏡時，那裡沒有 DOM 頭像，把這個旗標打開就有真實角色可用。
const SHOW_SEAT_FIGURES = false;

const SPRITE_DEPTH = 3.0; // 沿視線的距離：落在八角桌與霧之前，不會被 fog 吃掉
const REALIGN_MS = 200; // 對齊用的 getBoundingClientRect 會觸發 layout，節流到每 200ms

const texCache = new Map(); // `${roleId}:${state}` → THREE.Texture（三態各一張，換過就不再抓）
const svgCache = new Map(); // roleId → SVG 原始碼

function api() {
  return typeof window !== 'undefined' ? window.__yaoshi : null;
}

/** 抓角色 SVG 原始碼，快取一份。抓不到回 null，呼叫端保留現有貼圖。 */
async function loadSvgText(roleId, assetsBase) {
  if (svgCache.has(roleId)) return svgCache.get(roleId);
  const Y = api();
  const file = Y && Y.CHAR_SVG ? Y.CHAR_SVG[roleId] : null;
  if (!file) return null;
  try {
    const res = await fetch(`${assetsBase}${file}.svg`);
    if (!res.ok) return null;
    const txt = await res.text();
    svgCache.set(roleId, txt);
    return txt;
  } catch {
    return null; // 離線或檔案缺失時環境層仍要能跑，只是頭像停在上一張
  }
}

/**
 * 取某角色某氣色的貼圖。氣色的作法與 index.html 的 avHTML() 相同：
 * 把 SVG 根節點的 state-healthy 換成當前狀態的 class，讓 SVG 內建的三態樣式生效。
 */
async function getTexture(roleId, state, assetsBase) {
  const key = `${roleId}:${state}`;
  if (texCache.has(key)) return texCache.get(key);
  const raw = await loadSvgText(roleId, assetsBase);
  if (!raw) return null;
  const svg = raw.replace('state-healthy', state);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const tex = await new Promise((resolve) => {
    new THREE.TextureLoader().load(url, resolve, undefined, () => resolve(null));
  });
  if (!tex) return null;
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

/**
 * 螢幕座標（CSS 像素）→ 世界座標。取的是「沿相機視線方向深度固定為 SPRITE_DEPTH」的那個點，
 * 不是「沿射線距離固定」——後者在畫面邊緣的實際深度會變淺（除以 cos 夾角），
 * 在 844×390 這種寬畫面會讓左右兩席放大快兩倍。fwd 由呼叫端傳入，每幀只算一次。
 */
function screenToWorld(camera, fwd, cx, cy, w, h, out) {
  out.set((cx / w) * 2 - 1, -(cy / h) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
  return out.multiplyScalar(SPRITE_DEPTH / out.dot(fwd)).add(camera.position);
}

/** 在 SPRITE_DEPTH 處，1 CSS 像素等於多少世界單位（用來把像素高度換成 sprite scale）。 */
function worldPerPixel(camera, viewportH) {
  return (2 * SPRITE_DEPTH * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / viewportH;
}

/**
 * 目前是哪一種畫面：'table'＝牌桌、'duel'＝對決、null＝標題頁或其他全螢幕場景。
 * 對決也要 3D 全亮——那時網頁牌桌會淡出，3D 就是舞台背景，壓暗等於什麼都看不到。
 */
function sceneKind() {
  const table = document.getElementById('table');
  if (!table || getComputedStyle(table).display === 'none') return null;
  const shown = (id) => { const el = document.getElementById(id); return el && getComputedStyle(el).display !== 'none'; };
  if (shown('duel')) return 'duel';
  if (['selectScr', 'handoff', 'review', 'sheet', 'modal'].some(shown)) return null;
  return 'table';
}

export function createPlayerBridge(sprites, camera, assetsBase = 'assets/characters/') {
  const seatSprites = SEAT_ORDER.map((seat) => sprites[seat]);
  const tmp = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const shown = seatSprites.map(() => false); // 這一席目前該不該顯示
  const applied = seatSprites.map(() => ''); // 這一席已套用的 `${roleId}:${state}`
  let nextAlign = 0;

  seatSprites.forEach((sp) => { if (sp) sp.visible = false; }); // 標題頁不出現，等牌桌開了再說

  function update(now) {
    const Y = api();
    const kind = sceneKind();
    const visible = kind === 'table';

    // 牌桌不在前景（標題頁、選角、對決、回顧）就整組收起來，
    // 不然 3D 頭像會浮在全螢幕場景後面透出來，像鬼影。
    if (!visible || !Y || !Y.S || !Y.S.players) {
      seatSprites.forEach((sp, i) => { if (sp && shown[i]) { sp.visible = false; shown[i] = false; } });
      return kind;
    }

    const players = Y.S.players;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const doAlign = now >= nextAlign;
    if (doAlign) nextAlign = now + REALIGN_MS;
    const wpp = doAlign ? worldPerPixel(camera, h) : 0;
    if (doAlign) camera.getWorldDirection(fwd);

    players.forEach((p, i) => {
      const sp = seatSprites[i];
      if (!sp) return;

      // 貼圖：角色或氣色變了才換，換過的三態都在快取裡，不會反覆抓檔
      const state = Y.lifeState ? Y.lifeState(p) : 'state-healthy';
      const key = `${p.roleId}:${state}`;
      if (applied[i] !== key) {
        applied[i] = key;
        getTexture(p.roleId, state, assetsBase).then((tex) => {
          if (tex && applied[i] === key) {
            sp.material.map = tex;
            sp.material.needsUpdate = true;
          }
        });
      }

      // 出局的人淡掉但不移除——牌面上那張座位卡也還在
      sp.material.opacity = p.alive ? 1 : 0.35;
      sp.material.transparent = true;

      if (!doAlign) return;
      if (!SHOW_SEAT_FIGURES) { if (shown[i]) { sp.visible = false; shown[i] = false; } return; }

      const el = document.getElementById(SEAT_DOM_ID[i]);
      if (!el) { if (shown[i]) { sp.visible = false; shown[i] = false; } return; }
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) { if (shown[i]) { sp.visible = false; shown[i] = false; } return; }

      screenToWorld(camera, fwd, r.left + r.width / 2, r.top + r.height / 2 + SEAT_OFFSET_Y[i], w, h, tmp);
      sp.position.copy(tmp);
      const size = SEAT_PIXEL_H[i] * wpp;
      sp.scale.set(size, size, 1);
      if (!shown[i]) { sp.visible = true; shown[i] = true; }
    });
    return kind;
  }

  return { update };
}

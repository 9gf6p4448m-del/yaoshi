// 妖市 3D 環境層 — 運鏡導演（Layer 3，2026-09-03 v0.16）
//
// 職責：接收演出層發出的 CustomEvent，把鏡頭在幾個固定機位之間平滑補間，
// 並讓相關座位的燈籠亮起、其餘壓暗。
//
// 邊界（與 bridge-players.js 同一組，理由見 docs/IMPLEMENTATION_GUIDE.md §7）：
// - 完全不讀 S、CFG，也不寫回任何賽局欄位；它只認得事件裡帶的座位 id
// - 不耗任何亂數（S.rng 與 S.rngUi 都不碰），所以 trace() 等價驗證不受影響
// - 事件由 index.html 的演出層發出（revealGlow／playDuel／endGame／beginRound），
//   引擎函式一律不發——headless 測試的 document 沒有 dispatchEvent，發了會炸
import * as THREE from 'three';

const DEG = Math.PI / 180;

// 機位＝球座標。yaw 0 度是南家那一側（+Z），順時針到東 90、北 180、西 270；
// tilt 是俯角，愈小愈貼桌面。改這些數字就是改運鏡，其他地方不必動。
const SHOTS = {
  table: { dist: 3.6, tilt: 35, yaw: 0, lookY: 0.1, ms: 900 },
  reveal: { dist: 3.2, tilt: 30, yaw: 0, lookY: 0.3, ms: 550 }, // 開標：往桌心壓進去（幅度小，畫面別被裁掉）
  end: { dist: 6.4, tilt: 56, yaw: 0, lookY: 0.0, ms: 1400 }, // 局末：拉遠俯瞰整桌
};

const DUEL_SHOT = { dist: 4.2, tilt: 24, lookY: 0.35, ms: 700 }; // 對決：壓低但仍看得到桌面，太低只會看到夜空

// 座位 id → yaw。與 scene-env 的 SEAT_POS、bridge-players 的 SEAT_ORDER 同一套編號：
// 0 南 1 北 2 西 3 東
const SEAT_YAW = [0, 180, 270, 90];

const REVEAL_HOLD_MS = 1500; // 開標壓進去後停多久自動回到牌桌機位

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** 把角度差收斂到 -180..180，補間時才會走短邊、不會繞一大圈。 */
function shortestDelta(from, to) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/**
 * 兩個座位的「看得到雙方」機位：取兩者 yaw 的短弧中點。
 * 正對面的兩席（南北、東西）中點無意義，改站到垂直方向去，才不會被其中一人擋住另一人。
 */
function duelYaw(a, b) {
  const ya = SEAT_YAW[a];
  const yb = SEAT_YAW[b];
  const d = shortestDelta(ya, yb);
  if (Math.abs(Math.abs(d) - 180) < 1) return (ya + 90) % 360;
  return (ya + d / 2 + 360) % 360;
}

export function createCameraDirector(camera, lanterns) {
  const base = { ...SHOTS.table };
  let from = { ...base };
  let target = { ...base };
  let t = 1; // 補間進度，1＝已到位
  let durMs = 1;
  let revealUntil = 0; // 開標機位的自動返回時間，0＝沒有排程
  const lookAt = new THREE.Vector3();

  // 燈籠強調：值 1＝原亮度，>1 打亮，<1 壓暗。每幀往目標值靠近，不會突然跳。
  // 壓暗刻意保守（0.75／0.5）：實測壓到 0.35 時整張桌子跟著變黑，開標反而比平常還暗，
  // 「強調」變成「關燈」。要的是對比，不是把場景關掉。
  const emphasis = lanterns.map(() => 1);
  const emphasisTarget = lanterns.map(() => 1);

  function goto(shot, ms) {
    from = { dist: target.dist, tilt: target.tilt, yaw: target.yaw, lookY: target.lookY };
    // 從目前的 yaw 走短邊到新 yaw：先把目標換算成「相對現在」的絕對角度
    const yaw = from.yaw + shortestDelta(from.yaw, shot.yaw);
    target = { dist: shot.dist, tilt: shot.tilt, yaw, lookY: shot.lookY };
    durMs = Math.max(1, ms || shot.ms || 700);
    t = 0;
  }

  function setEmphasis(list, dim) {
    // list 為 null＝全部回到原亮度；否則名單內打亮、名單外壓到 dim
    lanterns.forEach((_, i) => {
      emphasisTarget[i] = !list ? 1 : list.includes(i) ? 2.2 : (dim === undefined ? 0.75 : dim);
    });
  }

  function onReveal(e) {
    const winner = e && e.detail ? e.detail.winner : null;
    goto(SHOTS.reveal);
    setEmphasis(typeof winner === 'number' ? [winner] : null);
    revealUntil = performance.now() + REVEAL_HOLD_MS;
  }

  function onDuel(e) {
    const d = (e && e.detail) || {};
    revealUntil = 0;
    if (typeof d.a !== 'number' || typeof d.b !== 'number') return;
    goto({ ...DUEL_SHOT, yaw: duelYaw(d.a, d.b) });
    setEmphasis([d.a, d.b], 0.6);
  }

  function onDuelEnd() {
    revealUntil = 0;
    goto(SHOTS.table);
    setEmphasis(null);
  }

  function onEnd() {
    revealUntil = 0;
    goto(SHOTS.end);
    setEmphasis(null);
  }

  function onTable() {
    revealUntil = 0;
    goto(SHOTS.table);
    setEmphasis(null);
  }

  document.addEventListener('ys:reveal', onReveal);
  document.addEventListener('ys:duel', onDuel);
  document.addEventListener('ys:duel-end', onDuelEnd);
  document.addEventListener('ys:end', onEnd);
  document.addEventListener('ys:table', onTable);

  /** 每幀呼叫。dt 秒，now 毫秒。回傳目前的燈籠強調係數供閃爍計算使用。 */
  function update(dt, now) {
    if (revealUntil && now >= revealUntil) {
      revealUntil = 0;
      goto(SHOTS.table);
      setEmphasis(null);
    }

    if (t < 1) {
      t = Math.min(1, t + (dt * 1000) / durMs);
      const k = easeInOutCubic(t);
      const dist = from.dist + (target.dist - from.dist) * k;
      const tilt = (from.tilt + (target.tilt - from.tilt) * k) * DEG;
      const yaw = (from.yaw + (target.yaw - from.yaw) * k) * DEG;
      const lookY = from.lookY + (target.lookY - from.lookY) * k;
      const horiz = Math.cos(tilt) * dist;
      camera.position.set(Math.sin(yaw) * horiz, Math.sin(tilt) * dist, Math.cos(yaw) * horiz);
      lookAt.set(0, lookY, 0);
      camera.lookAt(lookAt);
    }

    // 燈籠亮度往目標靠攏；4/秒的收斂速度，快到跟得上鏡頭、慢到不會閃
    for (let i = 0; i < emphasis.length; i++) {
      emphasis[i] += (emphasisTarget[i] - emphasis[i]) * Math.min(1, dt * 4);
    }
    return emphasis;
  }

  return { update };
}

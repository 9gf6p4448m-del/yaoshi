// 妖市 3D 環境層 — 十席信物的出價小動作（純函式，無 three.js 依賴）
//
// 出價那一刻，該席的信物整件做一個小動作：算盤喀啦一晃、香爐吐一口氣、白幡擺兩下……
// 只回答「第 t 秒的姿態偏移是多少」，不碰賽局狀態、不耗亂數（決定性）；
// table-props.js 只負責把偏移疊在信物原本的擺位上。0 新三角形、0 新 draw call。
//
// 偏移欄位（全部是「相對原擺位」的加總量，t＝1 時一律為 0）：
//   dy 世界高度（m，信物縮放前的桌面單位）；rx／ry／rz 弧度；sy 縱向縮放倍率（1＝不變）。

/** 動作總長（秒）。出價的籌碼飛行 0.42s，信物動作略長一點、收在籌碼落地之後。 */
export const RELIC_MOVE_MS = 0.7;

const PI = Math.PI;
const sin = Math.sin;
/** 前段急、後段緩的衰減（1 → 0） */
const damp = (t) => (1 - t) * (1 - t);
/** 0→1→0 的一個半圓（整段都有動作） */
const arc = (t) => sin(PI * t);
/** 前 1/k 段走完一個半圓、其後歸零（急促的一下） */
const quick = (t, k) => sin(PI * Math.min(1, t * k));

/** 角色 id → (t) → 偏移。id 同 `ROLES`／`RELIC_NAME`。 */
export const RELIC_MOVE = {
  /* 收驚婆・白米香爐：米面一吐氣，整碗微微一漲 */
  shoujing: (t) => ({ dy: 0.012 * arc(t), sy: 1 + 0.05 * arc(t) }),
  /* 當鋪・算盤：珠子被撥了一下，整把算盤喀啦喀啦晃兩晃 */
  dangpu: (t) => ({ rz: 0.12 * sin(t * PI * 5) * damp(t), dy: 0.005 * Math.abs(sin(t * PI * 5)) * damp(t) }),
  /* 組頭・字花明牌：牌子前後點兩下頭 */
  zutou: (t) => ({ rx: 0.14 * sin(t * PI * 3) * damp(t) }),
  /* 青面攤主・白骨骰子：被擲了一下，跳起來轉半圈又落回 */
  qingmian: (t) => ({ dy: 0.020 * arc(t), ry: 0.35 * arc(t) }),
  /* 紅衣婆婆・紅繡鞋：鞋頭翹一翹 */
  hongyi: (t) => ({ rz: -0.10 * quick(t, 2) * damp(t) * 2, dy: 0.004 * quick(t, 2) }),
  /* 斷手書生・斷筆：斷筆被風帶得轉了一下 */
  duanshou: (t) => ({ ry: 0.22 * sin(t * PI * 3) * damp(t) }),
  /* 獵人・獸夾：夾口「啪」地一合（壓扁再彈回） */
  hunter: (t) => ({ sy: 1 - 0.12 * quick(t, 2.5) }),
  /* 孝女白琴・白幡：幡面往外擺兩下 */
  xiaonv: (t) => ({ rz: 0.16 * sin(t * PI * 3) * damp(t) }),
  /* 閭山法師・法印：印往下一壓 */
  lvshan: (t) => ({ dy: -0.010 * quick(t, 2) }),
  /* 普渡爐主・三足香爐：爐身一抖，像吐了一縷煙 */
  luzhu: (t) => ({ dy: 0.008 * arc(t), sy: 1 + 0.03 * arc(t) }),
};

/** 沒對上角色（退路素木牌）的通用動作：輕輕跳一下 */
const FALLBACK = (t) => ({ dy: 0.008 * arc(t) });

const ZERO = Object.freeze({ dy: 0, rx: 0, ry: 0, rz: 0, sy: 1 });

/**
 * 某角色的信物在動作進度 t（0..1）時的姿態偏移。
 * t ≤ 0 或 ≥ 1 一律回全零，保證動作結束時信物精確回到原擺位。
 */
export function relicPose(role, t) {
  if (!(t > 0 && t < 1)) return ZERO;
  const f = RELIC_MOVE[role] || FALLBACK;
  const o = f(t);
  return { dy: o.dy || 0, rx: o.rx || 0, ry: o.ry || 0, rz: o.rz || 0, sy: o.sy === undefined ? 1 : o.sy };
}

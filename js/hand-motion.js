// 妖市 3D 環境層 — 席位之手的動作曲線與擺位解算（純函式，無 three.js 依賴，node 可直接測）
//
// 席位之手階段二 2a（docs/proposals/2026-09-30-seat-hands-silhouettes.md §4、§6）：
// 四席各一隻寫實右手，做「推／拍／收／閒置」四個動作。**純演出**——
//   ① 不碰賽局狀態：錢與令牌的位置仍由 table-props.js 算，手只是去「對準」它們（讀 props 的唯讀出口）；
//   ② 不耗亂數：本檔沒有任何 Math.random；擺位解算是固定步數的掃描，同一事件序列 ⇒ 同一手勢序列；
//   ③ 可跳過：finish() 把四隻手直接收到閒置（不可見），錢與令牌的終點由 table-props.finish() 負責。
//
// 本檔回答兩件事：
//   A. 某一隻手「現在在做什麼動作、第幾秒」——createHandDirector（事件 → 每席一個動作狀態機）
//   B. 那個動作在這一幀要擺在哪——solveHand（骨旋轉插值＋FK＋依桌面障礙解高度）
// table-hands.js 只負責把 B 的輸出寫進 three 的 SkinnedMesh。
//
// ★「指尖浮空」的解法（階段一原型發現）★：原型把掌下最低點硬貼在錢柱頂，手指就懸在半空。
// 這裡改成**依目標高度解擺位**：掃描一組手腕俯角，對每個俯角用「所有表面取樣點 ≥ 其下方地板」
// 解出最低的根高度（地板＝桌面或錢柱／令牌／木籌槽頂），再挑「掌根貼錢柱頂、指尖貼桌」兩者總間隙最小的那個俯角。
// 因為高度是對每個取樣點取 max 解出來的，構造上任何取樣點都不會低於它下方的錢柱或令牌頂（C1 的取樣檢查）。
//
// 單位：手的骨架與頂點是 GLB 原生單位 dm（1＝10cm），遊戲世界以 HAND.SCALE 換算（0.35，主對話已裁）。
// 手部局部座標：y 上、z 前（指尖方向）、+x＝拇指側（右手掌心朝下），與 tools/anyCreature/out/hand/build.mjs 同一組。

/** 全部【試玩必調】；集中在這一張表，不在函式裡寫死數字。 */
export const HAND = {
  /** dm → 世界單位。0.35 為主對話裁定版（比例較協調；0.55 版太大）。 */
  SCALE: 0.35,
  /** 直式另乘的倍率：直式托盤只有橫式的 0.57 倍寬，同尺寸的手會蓋滿畫面；取信物在直式的同一個倍率 0.72（table-props poseRelic）。 */
  SCALE_P: 0.72,
  /** 正式資產（走 creature-figures.js 的 GLB 管線載入）。 */
  GLB: 'assets/creatures/hand_r.glb',
  /** 推：與籌碼飛行同長（table-props PROPS.CHIP.FLY_MS），錢的終點不變，只把拋物線換成「被手推著滑」。 */
  PUSH_MS: 0.42,
  /** 收手：沿進場方向退回去多遠（世界單位）、花多久；退完即不可見（閒置＝收在畫面外）。 */
  RETRACT_MS: 0.30,
  RETRACT_DIST: 1.0,
  RETRACT_LIFT: 0.12,
  /** 拍：令牌落地後的微顫（只往上抖，不會往下穿令牌）與停留。 */
  SLAM: { TREMBLE_MS: 0.16, TREMBLE_AMP: 0.010, HOLD_MS: 0.08 },
  /** 收（敗方）：沿用揭盅 0.22 秒延遲＋0.42 秒返回；延遲那段就是手伸過去扒住錢柱的時間。 */
  RAKE: { DELAY: 0.22, BACK_MS: 0.42, REACH_FROM: 0.45 },
  /** 收（勝方）：手停一拍——伸到自己的錢柱後方、掌心朝下按住桌面，停這麼久再收。 */
  HOLD: { REACH_MS: 0.22, STAY_MS: 0.50, GAP: 0.02 },
  /** 每個取樣點至少離地板多高（世界單位）。 */
  CLR: 0.004,
  /** 俯角掃描範圍（弧度；正＝指尖往下）與步數。固定步數＝決定性。 */
  PITCH_MIN: -0.12,
  PITCH_MAX: 0.62,
  PITCH_STEPS: 19,
  /** 推的捲指程度候選（push→rake 的插值權重）；動作開始那一幀依錢柱高度挑一個。 */
  CURLS: [0, 0.25, 0.5, 0.75, 1],
  /** 手指扒在錢柱外側時，指尖團中心離錢柱軸多遠（相對錢的半徑之外再多這麼多）。 */
  RAKE_GAP: 0.03,
};

/** 三個姿勢的骨旋轉（四元數 [x,y,z,w]）；來源 tools/anyCreature/out/hand/poses.json（階段一原型已過退場閘）。
 *  沒列的骨＝bind（單位四元數）。 */
export const POSES = {
  push: { Wrist: [-0.052336, 0, 0, 0.99863], IndexA: [0.165048, 0, 0, 0.986286], IndexB: [0.292372, 0, 0, 0.956305], IndexC: [0.104528, 0, 0, 0.994522], MiddleA: [0.182236, 0, 0, 0.983255], MiddleB: [0.309017, 0, 0, 0.951057], MiddleC: [0.104528, 0, 0, 0.994522], RingA: [0.199368, 0, 0, 0.979925], RingB: [0.309017, 0, 0, 0.951057], RingC: [0.121869, 0, 0, 0.992546], PinkyA: [0.233445, 0, 0, 0.97237], PinkyB: [0.309017, 0, 0, 0.951057], PinkyC: [0.121869, 0, 0, 0.992546], ThumbA: [0.069078, -0.138834, 0.009708, 0.987856], ThumbB: [0.067253, 0.046747, -0.064946, 0.994522], ThumbC: [0.067253, 0.046747, -0.064946, 0.994522] },
  spread: { Wrist: [-0.052336, 0, 0, 0.99863], IndexA: [0.034792, 0.078411, -0.002738, 0.99631], IndexB: [0.052336, 0, 0, 0.99863], IndexC: [0.034899, 0, 0, 0.999391], MiddleA: [0.043619, 0, 0, 0.999048], MiddleB: [0.061049, 0, 0, 0.998135], MiddleC: [0.034899, 0, 0, 0.999391], RingA: [0.052208, -0.069661, 0.003651, 0.996197], RingB: [0.061049, 0, 0, 0.998135], RingC: [0.043619, 0, 0, 0.999048], PinkyA: [0.051692, -0.15622, 0.008187, 0.986335], PinkyB: [0.069756, 0, 0, 0.997564], PinkyC: [0.052336, 0, 0, 0.99863], ThumbA: [0, 0.224951, 0, 0.97437], ThumbB: [-0.044881, -0.031196, 0.043341, 0.997564], ThumbC: [0.033673, 0.023405, -0.032517, 0.99863] },
  rake: { Wrist: [-0.087156, 0, 0, 0.996195], IndexA: [0.190744, -0.025696, -0.004995, 0.981291], IndexB: [0.515038, 0, 0, 0.857167], IndexC: [0.258819, 0, 0, 0.965926], MiddleA: [0.207912, 0, 0, 0.978148], MiddleB: [0.529919, 0, 0, 0.848048], MiddleC: [0.275637, 0, 0, 0.961262], RingA: [0.224917, 0.017005, 0.003926, 0.974222], RingB: [0.529919, 0, 0, 0.848048], RingC: [0.275637, 0, 0, 0.961262], PinkyA: [0.258464, 0.050553, 0.013546, 0.964602], PinkyB: [0.515038, 0, 0, 0.857167], PinkyC: [0.258819, 0, 0, 0.965926], ThumbA: [0.137059, -0.171958, 0.024167, 0.975224], ThumbB: [0.122766, 0.085332, -0.118554, 0.981627], ThumbC: [0.144733, 0.100601, -0.139767, 0.97437] },
};

/* ═══ 小工具（四元數／向量；本檔內共用）═══════════════════════════════ */
const QI = [0, 0, 0, 1];
function qmul(a, b) {
  const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
  return [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz];
}
function qrot(q, v) {
  const [x, y, z, w] = q, [vx, vy, vz] = v;
  const ix = w * vx + y * vz - z * vy, iy = w * vy + z * vx - x * vz, iz = w * vz + x * vy - y * vx, iw = -x * vx - y * vy - z * vz;
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}
/** 與 three 的 Quaternion.slerp 同一套（短弧、接近時退成線性），讓骨架插值與畫面一致。 */
export function slerp(a, b, t) {
  if (t <= 0) return a.slice();
  if (t >= 1) return b.slice();
  let [bx, by, bz, bw] = b;
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cos < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; cos = -cos; }
  if (cos >= 1) return a.slice();
  const sq = 1 - cos * cos;
  if (sq <= Number.EPSILON) {
    const s = 1 - t, r = [s * a[0] + t * bx, s * a[1] + t * by, s * a[2] + t * bz, s * a[3] + t * bw];
    const l = Math.hypot(...r); return r.map((x) => x / l);
  }
  const sin = Math.sqrt(sq), ang = Math.atan2(sin, cos);
  const ra = Math.sin((1 - t) * ang) / sin, rb = Math.sin(t * ang) / sin;
  return [a[0] * ra + bx * rb, a[1] * ra + by * rb, a[2] * ra + bz * rb, a[3] * ra + bw * rb];
}
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const easeInQuad = (t) => t * t;
const smooth = (t) => t * t * (3 - 2 * t);

/** 兩個姿勢之間的骨旋轉（a、b 是 POSES 的鍵或 null＝bind），w∈[0,1]。回 {骨名: 四元數}。 */
export function blendPose(a, b, w) {
  const pa = a ? POSES[a] : {}, pb = b ? POSES[b] : {};
  const out = {};
  for (const k of new Set([...Object.keys(pa), ...Object.keys(pb)])) out[k] = slerp(pa[k] || QI, pb[k] || QI, clamp01(w));
  return out;
}

/* ═══ 骨架與取樣點 ═════════════════════════════════════════════════════ */
/* 指尖點集＝遠節（xC）＋指尖骨（xTip）上的頂點：anyCreature 的指尖頂點權重落在 xTip 骨上，只取 xC 會漏掉真正的指尖。 */
const FINGER_TIP_BONES = ['IndexC', 'MiddleC', 'RingC', 'PinkyC', 'ThumbC', 'IndexTip', 'MiddleTip', 'RingTip', 'PinkyTip', 'ThumbTip'];
const RAKE_TIP_BONES = ['IndexC', 'MiddleC', 'RingC', 'IndexTip', 'MiddleTip', 'RingTip'];
const PALM_BONES = ['Palm', 'Wrist'];

/**
 * 由 GLB 的原始陣列建骨架與表面取樣點（不依賴 three：table-hands 從載好的 SkinnedMesh 抽陣列傳進來，
 * node 測試從同一顆 GLB 解析後傳進來——兩邊吃的是同一份資產）。
 * @param src { names[], parents[]（父骨 index，根＝−1）, rest[[x,y,z]]（父座標系下的 bind 位置；bind 旋轉須為單位）,
 *              positions（頂點 xyz）, skinIndex（每頂點 4 個骨 index）, skinWeight（每頂點 4 個權重） }
 * 取樣點＝GLB 的每一個頂點，用與 three 相同的線性混合蒙皮（每頂點 4 骨權重；bind 為單位旋轉）重算，
 * 所以這裡的點與畫面上的蒙皮頂點是同一組座標（實頁探針另行比對）。
 */
export function buildRig(src) {
  const n = src.names.length;
  const restWorld = [];
  for (let i = 0; i < n; i++) {
    const p = src.parents[i], r = src.rest[i];
    restWorld.push(p < 0 ? r.slice() : [restWorld[p][0] + r[0], restWorld[p][1] + r[1], restWorld[p][2] + r[2]]);
  }
  const idx = Object.fromEntries(src.names.map((nm, i) => [nm, i]));
  const vc = src.positions.length / 3;
  /* 每頂點 4 組（骨、權重、相對該骨 bind 位置的偏移）；dom＝權重最大的骨（只拿來分「指尖／掌」點集）。 */
  const wb = new Int16Array(vc * 4), ww = new Float64Array(vc * 4), wo = new Float64Array(vc * 12), dom = new Int16Array(vc);
  for (let v = 0; v < vc; v++) {
    let best = 0, bw = -1, sum = 0;
    for (let k = 0; k < 4; k++) sum += src.skinWeight[v * 4 + k];
    for (let k = 0; k < 4; k++) {
      const b = src.skinIndex[v * 4 + k], w = sum > 0 ? src.skinWeight[v * 4 + k] / sum : (k === 0 ? 1 : 0);
      wb[v * 4 + k] = b; ww[v * 4 + k] = w;
      for (let a = 0; a < 3; a++) wo[v * 12 + k * 3 + a] = src.positions[v * 3 + a] - restWorld[b][a];
      if (w > bw) { bw = w; best = b; }
    }
    dom[v] = best;
  }
  const pick = (names) => { const set = new Set(names.map((x) => idx[x])); const out = []; for (let v = 0; v < vc; v++) if (set.has(dom[v])) out.push(v); return out; };
  const tips = pick(FINGER_TIP_BONES), rakeTips = pick(RAKE_TIP_BONES), palm = pick(PALM_BONES);
  /* 掃描俯角用的精簡點集：每 2 個取 1（擺位最後一步仍用全部頂點解高度）。 */
  const coarse = []; for (let v = 0; v < vc; v += 2) coarse.push(v);
  return { names: src.names.slice(), parents: src.parents.slice(), rest: src.rest.map((r) => r.slice()), idx, count: vc, wb, ww, wo, dom, tips, rakeTips, palm, coarse };
}

/** 前向運動學：回每根骨在手部局部座標下的旋轉與位置。quats＝{骨名: 四元數}（沒給的＝bind）。 */
export function fk(rig, quats) {
  const n = rig.names.length, rot = new Array(n), pos = new Array(n);
  for (let i = 0; i < n; i++) {
    const q = quats[rig.names[i]] || QI, p = rig.parents[i];
    if (p < 0) { rot[i] = q.slice(); pos[i] = rig.rest[i].slice(); continue; }
    const r = qrot(rot[p], rig.rest[i]);
    pos[i] = [pos[p][0] + r[0], pos[p][1] + r[1], pos[p][2] + r[2]];
    rot[i] = qmul(rot[p], q);
  }
  return { rot, pos };
}

/** 骨架擺好後，所有取樣點的手部局部座標（dm）：線性混合蒙皮，Σ wᵢ·(骨ᵢ位置＋骨ᵢ旋轉·偏移ᵢ)。 */
export function localPoints(rig, f) {
  const out = new Float64Array(rig.count * 3);
  for (let v = 0; v < rig.count; v++) {
    let x = 0, y = 0, z = 0;
    for (let k = 0; k < 4; k++) {
      const w = rig.ww[v * 4 + k]; if (!w) continue;
      const b = rig.wb[v * 4 + k], o = v * 12 + k * 3;
      const r = qrot(f.rot[b], [rig.wo[o], rig.wo[o + 1], rig.wo[o + 2]]);
      x += w * (f.pos[b][0] + r[0]); y += w * (f.pos[b][1] + r[1]); z += w * (f.pos[b][2] + r[2]);
    }
    out[v * 3] = x; out[v * 3 + 1] = y; out[v * 3 + 2] = z;
  }
  return out;
}

/* ═══ 擺位 ═════════════════════════════════════════════════════════════ */
/** 世界變換＝平移 root · 繞 y 轉 yaw · 繞 x 轉 pitch · 等比縮放 s（與 table-hands 寫給 three 的順序相同）。 */
function xform(p, yaw, pitch, s) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const x = p[0] * s, y0 = p[1] * s, z0 = p[2] * s;
  const y = y0 * cp - z0 * sp, z = y0 * sp + z0 * cp; // 繞 x：+pitch 讓 +z（指尖）往下
  return [x * cy + z * sy, y, -x * sy + z * cy]; // 繞 y：yaw 讓 +z 指向 (sin yaw, cos yaw)
}
/** 從 (fx,fz) 指向 (tx,tz) 的 yaw（手部 +z 對準該方向）。 */
export function yawToward(fx, fz, tx, tz) { return Math.atan2(tx - fx, tz - fz); }

/** 一點 (x,z) 處、半徑 0 的地板高：桌面與所有覆蓋此點的障礙頂取最大。 */
export function floorAt(x, z, obstacles, tableY) {
  let f = tableY;
  for (const o of obstacles) {
    if (o.top <= f) continue;
    const inside = o.r !== undefined ? (x - o.x) * (x - o.x) + (z - o.z) * (z - o.z) <= o.r * o.r
      : Math.abs(x - o.x) <= o.hx && Math.abs(z - o.z) <= o.hz;
    if (inside) f = o.top;
  }
  return f;
}

function anchorLocal(rig, pts, kind) {
  /* 手部局部的錨點（只用 x、z 對準目標；高度另由地板解）：
     heel＝掌根下方（推錢柱的接觸處）、palm＝掌心、tips＝食中無名三指指尖團、front＝最前端指尖。 */
  let set = rig.palm;
  if (kind === 'tips') set = rig.rakeTips;
  if (kind === 'front') {
    let best = rig.tips[0];
    for (const v of rig.tips) if (pts[v * 3 + 2] > pts[best * 3 + 2]) best = v;
    return [pts[best * 3], pts[best * 3 + 1], pts[best * 3 + 2]];
  }
  let sx = 0, sy = 0, sz = 0, n = 0;
  for (const v of set) {
    const z = pts[v * 3 + 2];
    if (kind === 'heel' && !(z >= 0.05 && z <= 0.45)) continue;
    sx += pts[v * 3]; sy += pts[v * 3 + 1]; sz += z; n++;
  }
  return n ? [sx / n, sy / n, sz / n] : [0, 0, 0];
}

/**
 * 在固定 yaw／pitch 下，讓 anchor 的 (x,z) 對準 target，並解出最低的根高度：
 * 每個取樣點都不得低於它正下方的地板＋CLR。回 { root, minLift, gaps }。
 */
function placeAt(rig, pts, set, anchor, yaw, pitch, s, target, obstacles, tableY, minY) {
  const a = xform(anchor, yaw, pitch, s);
  const rx = target[0] - a[0], rz = target[1] - a[1];
  let ry = minY === undefined ? -Infinity : minY;
  /* 先轉一遍、取手的水平外框，只留外框碰得到的障礙（每幀成本：逐點 × 附近幾件，而不是 × 全桌）。 */
  const W = new Float64Array(set.length * 3);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < set.length; i++) {
    const v = set[i], w = xform([pts[v * 3], pts[v * 3 + 1], pts[v * 3 + 2]], yaw, pitch, s);
    const fx = rx + w[0], fz = rz + w[2];
    W[i * 3] = fx; W[i * 3 + 1] = w[1]; W[i * 3 + 2] = fz;
    if (fx < x0) x0 = fx; if (fx > x1) x1 = fx; if (fz < z0) z0 = fz; if (fz > z1) z1 = fz;
  }
  const near = obstacles.filter((o) => { const hx = o.r !== undefined ? o.r : o.hx, hz = o.r !== undefined ? o.r : o.hz;
    return o.top > tableY && o.x + hx >= x0 && o.x - hx <= x1 && o.z + hz >= z0 && o.z - hz <= z1; });
  const wp = new Array(set.length * 2);
  for (let i = 0; i < set.length; i++) {
    const fl = near.length ? floorAt(W[i * 3], W[i * 3 + 2], near, tableY) : tableY;
    wp[i * 2] = W[i * 3 + 1]; wp[i * 2 + 1] = fl;
    const need = fl + HAND.CLR - W[i * 3 + 1];
    if (need > ry) ry = need;
  }
  return { root: [rx, ry, rz], wp };
}
/** 某點集在已解的根高度下，離其地板的最小間隙。 */
function minGap(set, setIndexOf, wp, ry) {
  let g = Infinity;
  for (const v of set) { const i = setIndexOf.get(v); if (i === undefined) continue; const d = ry + wp[i * 2] - wp[i * 2 + 1]; if (d < g) g = d; }
  return g;
}

/**
 * 解一隻手這一幀的擺位。
 * @param spec { pose:[a,b,w] | 'curl', anchor:'heel'|'palm'|'tips'|'front', target:[x,z], yaw, pitch?（給了就不掃描）, minY?（根高度下限）, scale,
 *               fit?:{ target, pose?, obstacles }（只給掃描用的關鍵時刻配置） }
 *   pose＝'curl'（推）：依目標高度在 push→rake 之間挑捲指程度——錢柱越高，手指要捲得越多才碰得到桌面（「指尖浮空」的解）。
 * @returns { root:[x,y,z], yaw, pitch, quats, pose（實際用的 [a,b,w]） }
 */
export function solveHand(rig, spec, obstacles, tableY) {
  const s = spec.scale || HAND.SCALE;
  let pose = spec.pose, pitch = spec.pitch;
  /* 掃描（俯角／捲指）用「動作的關鍵那一刻」的配置（spec.fit：錢柱到終點、令牌落地），不是起手那一幀——
     否則同一個拍下動作會因為起手時令牌還在席位上而挑出完全不同的俯角。逐幀的高度仍用當下的真實障礙解。 */
  const fitSpec = spec.fit ? Object.assign({}, spec, { target: spec.fit.target }) : spec;
  const fitObs = spec.fit ? spec.fit.obstacles : obstacles;
  if (pose === 'curl') {
    let best = null;
    for (const c of HAND.CURLS) {
      const cand = ['push', 'rake', c], pr = prepare(rig, cand, spec.anchor);
      const r = choosePitch(rig, pr.pts, pr.anchor, fitSpec, s, fitObs, tableY);
      if (!best || r.score < best.score - 1e-9) best = { pose: cand, pitch: r.pitch, score: r.score };
    }
    pose = best.pose;
    if (pitch === undefined) pitch = best.pitch;
  }
  const pr = prepare(rig, pose, spec.anchor);
  if (pitch === undefined) {
    const fp = spec.fit && spec.fit.pose ? prepare(rig, spec.fit.pose, spec.anchor) : pr;
    pitch = choosePitch(rig, fp.pts, fp.anchor, fitSpec, s, fitObs, tableY).pitch;
  }
  const r = placeAt(rig, pr.pts, allIndex(rig), pr.anchor, spec.yaw, pitch, s, spec.target, obstacles, tableY, spec.minY);
  return { root: r.root, yaw: spec.yaw, pitch, quats: pr.quats, pose: pose.slice() };
}
const prepCache = new WeakMap();
/** 姿勢 → 骨旋轉＋全部取樣點（線性混合蒙皮）＋錨點。插值權重量化到 1/32（畫面上分不出，
 *  三支 three 骨頭吃的也是同一組量化後的旋轉，所以碰撞與畫面一致），同一姿勢每幀直接重用，不重算 819 點蒙皮。 */
function prepare(rig, pose, anchorKind) {
  const w = Math.round(clamp01(pose[2]) * 32) / 32;
  const key = pose[0] + '|' + pose[1] + '|' + w + '|' + anchorKind;
  if (!prepCache.has(rig)) prepCache.set(rig, new Map());
  const cache = prepCache.get(rig);
  let hit = cache.get(key);
  if (!hit) {
    const quats = blendPose(pose[0], pose[1], w);
    const pts = localPoints(rig, fk(rig, quats));
    hit = { quats, pts, anchor: anchorLocal(rig, pts, anchorKind) };
    if (cache.size > 512) cache.clear();
    cache.set(key, hit);
  }
  return hit;
}
const allCache = new WeakMap();
function allIndex(rig) {
  if (!allCache.has(rig)) { const a = new Array(rig.count); for (let i = 0; i < rig.count; i++) a[i] = i; allCache.set(rig, a); }
  return allCache.get(rig);
}
const coarseIdxCache = new WeakMap();
/** 俯角掃描：固定步數、平手取第一個（決定性）。分數＝掌根／掌心離地板的間隙＋指尖離地板的間隙（兩者都貼住最好）。 */
function choosePitch(rig, pts, anchor, spec, s, obstacles, tableY) {
  if (!coarseIdxCache.has(rig)) coarseIdxCache.set(rig, new Map(rig.coarse.map((v, i) => [v, i])));
  const ci = coarseIdxCache.get(rig);
  const tipsC = rig.tips.filter((v) => ci.has(v));
  const palmC = rig.palm.filter((v) => ci.has(v) && pts[v * 3 + 2] >= 0.05);
  let best = HAND.PITCH_MIN, bestScore = Infinity;
  for (let k = 0; k < HAND.PITCH_STEPS; k++) {
    const p = HAND.PITCH_MIN + (HAND.PITCH_MAX - HAND.PITCH_MIN) * k / (HAND.PITCH_STEPS - 1);
    const r = placeAt(rig, pts, rig.coarse, anchor, spec.yaw, p, s, spec.target, obstacles, tableY, spec.minY);
    const tipGap = minGap(tipsC, ci, r.wp, r.root[1]);
    const palmGap = minGap(palmC, ci, r.wp, r.root[1]);
    const score = spec.anchor === 'tips' ? tipGap : tipGap + palmGap;
    if (score < bestScore - 1e-9) { bestScore = score; best = p; }
  }
  return { pitch: best, score: bestScore };
}

/** 擺好的手所有取樣點的世界座標（治具／測試用：拿去跟錢柱與令牌比對是否穿入）。 */
export function worldPoints(rig, frame, scale) {
  const f = fk(rig, frame.quats), pts = localPoints(rig, f), s = scale || HAND.SCALE;
  const out = new Float64Array(rig.count * 3);
  for (let v = 0; v < rig.count; v++) {
    const w = xform([pts[v * 3], pts[v * 3 + 1], pts[v * 3 + 2]], frame.yaw, frame.pitch, s);
    out[v * 3] = frame.root[0] + w[0]; out[v * 3 + 1] = frame.root[1] + w[1]; out[v * 3 + 2] = frame.root[2] + w[2];
  }
  return out;
}

/* ═══ 動作狀態機（每席一隻手）══════════════════════════════════════════ */
/**
 * 事件 → 每席一個動作。**不持有任何賽局資料**；位置一律現讀 props 的唯讀出口：
 *   props.stackAt(seat, slot) → { x, z, top, r, n, t, returning, gone } | null
 *   props.tokenAt(seat)       → { x, y, z, top, t, hit, slot } | null
 *   props.seatPosition(seat)  → { x, y, z }
 *   props.handObstacles()     → [{ x, z, r | hx,hz, top }]
 *   props.stackSeats(slot)    → 這一格桌上有錢的席位
 *   props.mode()              → 'L' | 'P'
 * 每席只有**一個**動作槽：同席新事件一律覆寫（同席同格重複出價＝覆寫，不會疊出兩隻手）。
 */
export function createHandDirector(props, rig) {
  const hands = [0, 1, 2, 3].map((seat) => ({ seat, act: null, last: null }));
  const scaleNow = () => HAND.SCALE * (props.mode() === 'P' ? HAND.SCALE_P : 1);
  const start = (seat, act) => { hands[seat].act = Object.assign({ t: 0 }, act); };
  const stop = (seat) => { hands[seat].act = null; hands[seat].last = null; };

  function retractFrame(h, a, u) {
    /* 收手：從最後一幀的擺位沿「席位→目標」反方向退 RETRACT_DIST，順勢抬高；仍逐點過地板。 */
    const L = a.from;
    const e = easeInQuad(clamp01(u));
    const dx = Math.sin(L.yaw), dz = Math.cos(L.yaw);
    const target = [L.ax - dx * HAND.RETRACT_DIST * e, L.az - dz * HAND.RETRACT_DIST * e];
    return { pose: [L.pose[0], L.pose[1], L.pose[2] * (1 - e)], anchor: L.anchor, target, yaw: L.yaw, pitch: L.pitch, minY: L.y + HAND.RETRACT_LIFT * e };
  }

  /** 這一席這一幀的擺位規格（null＝不可見）。 */
  /** 把障礙表裡圓心在 (x,z) 的那一件換到 (nx,nz)（頂高可改）：給「關鍵時刻」配置用。 */
  function moved(obstacles, x, z, nx, nz, top) {
    return obstacles.map((o) => (Math.abs(o.x - x) < 1e-9 && Math.abs(o.z - z) < 1e-9 ? Object.assign({}, o, { x: nx, z: nz }, top === undefined ? {} : { top }) : o));
  }
  function specOf(h, obstacles) {
    const a = h.act; if (!a) return null;
    const seatP = props.seatPosition(h.seat);
    if (a.kind === 'retract') return retractFrame(h, a, a.t / HAND.RETRACT_MS);
    if (a.kind === 'push') {
      const st = props.stackAt(h.seat, a.slot);
      if (!st) return null;
      return { pose: a.pose || 'curl', anchor: 'heel', target: [st.x, st.z], yaw: yawToward(seatP.x, seatP.z, a.tx, a.tz),
        fit: a.pitch === undefined ? { target: [st.tx, st.tz], obstacles: moved(obstacles, st.x, st.z, st.tx, st.tz) } : undefined };
    }
    if (a.kind === 'slam') {
      const tk = props.tokenAt(h.seat);
      if (!tk) return null;
      const landed = tk.t >= 1;
      const after = landed ? a.sinceLand : 0;
      const trem = landed && after < HAND.SLAM.TREMBLE_MS ? Math.abs(Math.sin(after / HAND.SLAM.TREMBLE_MS * Math.PI * 3)) * HAND.SLAM.TREMBLE_AMP * (1 - after / HAND.SLAM.TREMBLE_MS) : 0;
      return { pose: ['push', 'spread', landed ? 1 : smooth(clamp01(tk.t))], anchor: 'palm', target: [tk.x, tk.z], yaw: yawToward(seatP.x, seatP.z, a.tx, a.tz), lift: trem,
        fit: a.pitch === undefined ? { target: [tk.tx, tk.tz], pose: ['push', 'spread', 1], obstacles: moved(obstacles, tk.x, tk.z, tk.tx, tk.tz, tk.landTop) } : undefined };
    }
    if (a.kind === 'rake') {
      const st = props.stackAt(h.seat, a.slot);
      if (!st) return null;
      const yaw = yawToward(seatP.x, seatP.z, a.tx, a.tz), dx = Math.sin(yaw), dz = Math.cos(yaw);
      const off = st.r + HAND.RAKE_GAP;
      /* 指尖團落在錢柱「遠離席位」那一側（扒住後緣往回拖）；延遲那段從靠席位那側伸過去。 */
      const reach = clamp01(a.t / HAND.RAKE.DELAY);
      const k = smooth(reach), back = (1 - k) * HAND.RAKE.REACH_FROM;
      return { pose: ['spread', 'rake', k], anchor: 'tips', target: [st.x + dx * (off - back), st.z + dz * (off - back)], yaw };
    }
    if (a.kind === 'hold') {
      const st = props.stackAt(h.seat, a.slot);
      if (!st) return null;
      const yaw = yawToward(seatP.x, seatP.z, a.tx, a.tz), dx = Math.sin(yaw), dz = Math.cos(yaw);
      const k = smooth(clamp01(a.t / HAND.HOLD.REACH_MS));
      const off = st.r + HAND.HOLD.GAP + (1 - k) * 0.25;
      return { pose: ['push', 'spread', k], anchor: 'front', target: [st.x - dx * off, st.z - dz * off], yaw };
    }
    return null;
  }

  function beginRetract(h) {
    const { frame, spec } = h.last;
    h.act = { kind: 'retract', t: 0, from: { yaw: frame.yaw, pitch: frame.pitch, pose: frame.pose.slice(), anchor: spec.anchor, ax: spec.target[0], az: spec.target[1], y: frame.root[1] } };
  }

  const api = {
    /** 出價：amount>0＝推；amount≤0＝那一席那一格的錢收回——手若正對著那一格，立即收（熱座清場）。 */
    bid(seat, slot, amount) {
      const s = seat | 0, k = slot | 0; if (!(s >= 0 && s < 4)) return;
      if (!((amount | 0) > 0)) { const a = hands[s].act; if (a && a.slot === k) stop(s); return; }
      const st = props.stackAt(s, k); if (!st) return;
      start(s, { kind: 'push', slot: k, tx: st.tx, tz: st.tz });
    },
    /** 盯上：手握著令牌跟著它舉高、拍下；落地那一幀的 `ys:mark-slam` 仍由令牌發（本檔不發任何事件）。 */
    mark(seat, slot) {
      const s = seat | 0; if (!(s >= 0 && s < 4)) return;
      const tk = props.tokenAt(s); if (!tk) return;
      start(s, { kind: 'slam', slot: slot | 0, tx: tk.tx, tz: tk.tz, sinceLand: 0 });
    },
    /** 開標：敗方手掌向下五指扒攏把錢拖回席位；勝方停一拍再收。 */
    reveal(slot, winner) {
      const k = slot | 0, w = winner === null || winner === undefined ? -1 : winner | 0;
      for (const s of props.stackSeats(k)) {
        const st = props.stackAt(s, k); if (!st) continue;
        if (s === w) start(s, { kind: 'hold', slot: k, tx: st.x, tz: st.z });
        else if (st.returning) start(s, { kind: 'rake', slot: k, tx: st.x, tz: st.z });
      }
    },
    /** 換一夜／熱座清場：四隻手立即收（不可見）。 */
    clear() { for (let s = 0; s < 4; s++) stop(s); },
    /** 跳過：直接到結束姿態＝四隻手全收。 */
    finish() { for (let s = 0; s < 4; s++) stop(s); },
    update(dt) {
      for (const h of hands) {
        const a = h.act; if (!a) continue;
        a.t += dt;
        if (a.kind === 'slam') { const tk = props.tokenAt(h.seat); if (tk && tk.t >= 1) a.sinceLand += dt; }
      }
    },
    /** 這一幀四隻手的擺位（null＝不可見）。動作做完自動切到收手、收完歸零（閒置＝不可見＝收在畫面外）。 */
    frames() {
      const obstacles = props.handObstacles(), tableY = props.tableY(), s = scaleNow();
      return hands.map((h) => {
        if (!h.act) return null;
        let spec = specOf(h, obstacles);
        if (!spec) {
          /* 目標消失（錢被收走、令牌被清）：有上一幀就從那裡收手，沒有就直接不可見。 */
          if (h.act.kind !== 'retract' && h.last) { beginRetract(h); spec = specOf(h, obstacles); } else { stop(h.seat); return null; }
        }
        const a = h.act;
        if (a.kind === 'retract' && a.t >= HAND.RETRACT_MS) { stop(h.seat); return null; }
        /* 俯角每個動作只掃一次（動作開始那一幀），之後固定——掃描成本不進每幀，手也不會一路點頭。 */
        const req = { scale: s, pose: spec.pose, anchor: spec.anchor, target: spec.target, yaw: spec.yaw, minY: spec.minY, fit: spec.fit,
          pitch: a.kind === 'retract' ? spec.pitch : a.pitch };
        const fr = solveHand(rig, req, obstacles, tableY);
        if (spec.lift) fr.root[1] += spec.lift; // 只往上加（微顫），不會往下穿
        if (a.kind !== 'retract' && a.pitch === undefined) { a.pitch = fr.pitch; if (spec.pose === 'curl') a.pose = fr.pose; }
        h.last = { frame: fr, spec };
        if (done(h)) beginRetract(h);
        return fr;
      });
    },
    /** 治具／測試出口（只讀）：每席目前的動作名與進度。 */
    state() { return hands.map((h) => (h.act ? { kind: h.act.kind, slot: h.act.slot === undefined ? -1 : h.act.slot, t: +h.act.t.toFixed(6) } : null)); },
  };

  function done(h) {
    const a = h.act;
    if (a.kind === 'push') return a.t >= HAND.PUSH_MS;
    if (a.kind === 'slam') return a.sinceLand >= HAND.SLAM.TREMBLE_MS + HAND.SLAM.HOLD_MS;
    if (a.kind === 'rake') { const st = props.stackAt(h.seat, a.slot); return !st || st.gone || a.t >= HAND.RAKE.DELAY + HAND.RAKE.BACK_MS; }
    if (a.kind === 'hold') return a.t >= HAND.HOLD.REACH_MS + HAND.HOLD.STAY_MS;
    return false;
  }
  return api;
}


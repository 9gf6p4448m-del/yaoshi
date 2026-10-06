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
  /** dm → 世界單位。第二輪（使用者：手太大）以「掌寬 ≈ 錢柱直徑 2～2.5 倍」為準：GLB 掌寬（Palm 主骨頂點的 x 跨度）
   *  0.867 dm、錢柱直徑 2×CHIP.R＝0.144 ⇒ 縮放落在 0.332～0.415；取最小端附近 0.335（掌寬 0.290＝2.02 倍）。
   *  真正讓手「看起來大」的是黑色長袖（整段前臂＋袖），見 SLEEVE。
   *  v0.59.7：本值不變；寫實卷的縮放改由下面 USER_SCALE 一處控制。 */
  SCALE: 0.335,
  /** v0.59.7 全角色手的縮放倍率（使用者 2026-10-02：「先不用縮，試玩再調」⇒ 預設 1，本卷不得預設 ≠1）。
   *  一處改、四席全角色生效；試玩可用網址 ?handscale=0.8 暫時覆寫（只影響畫面，table-hands 讀）。
   *  擺位解算與前臂延長都吃同一個值（hand-realism.js ARM：縮小時前臂自動拉長，仍接到畫面外）。 */
  USER_SCALE: 1,
  /** v0.59.7 修訂 4：寫實手總開關（false＝整套回 v0.59.6 的手；網址 ?handreal=0 同效）。 */
  REAL_ON: true,
  /** v0.61.0 批 1 身分變體總開關（青面攤主／紅衣婆婆／斷手書生／大家樂組頭的專屬手，js/hand-b1.js）：預設開；false 或網址 ?handb1=0＝四角色退回預設手（寫實關閉時一律關）。 */
  B1_ON: true,
  /** 直式另乘的倍率（使用者裁定只玩橫式；直式只保機械檢查，不做美術）：0.6。 */
  SCALE_P: 0.6,
  /** 袖子（第二輪）：整段黑袖拿掉，只留腕部一圈短袖口邊（≤前臂 1/5），其後的袖布由暗轉淡、以 alphaHash 抖色漸隱。
   *  z 是手部局部座標（dm；腕骨 z＝0、肘骨 z＝−2.3，前臂長 2.3 ⇒ 1/5＝0.46）。顏色為線性 RGB（GLB 頂點色同一空間）。 */
  SLEEVE: {
    CUFF_FROM: -0.08, // 這裡以後（往肘）是袖口邊
    CUFF_TO: -0.40, // 袖口邊到此為止（長 0.32＜0.46）
    FADE_TO: -0.95, // 袖布在這裡完全隱去
    SEEN_TO: -0.80, // 漸隱到 alpha≈0.2 的位置（信物避讓與穿入取樣看到這裡）
    CUFF: [0.130, 0.045, 0.030], // 舊棗紅袖口（sRGB 約 #643b30）：和暗紅桌布／木色同一族，不是黑
    CLOTH: [0.060, 0.022, 0.016], // 漸隱段的袖布：比袖口暗一階，仍非純黑
  },
  /** 每席手能伸到哪（第二輪）：北席指尖不越過「自己那側的托盤前緣」再多 NORTH_IN；西／東席不越過托盤中線 x＝0（留 MID）。
   *  南席（玩家自己）指尖不伸進托盤前緣以內超過 SOUTH_IN（量測：伸過去就擋在拍品腳前）。 */
  REACH: { NORTH_IN: 0.05, MID: 0.06, SOUTH_IN: 0.02 },
  /** 托盤布面半寬／半深（與 table-tray 的 TRAY.CLOTH、直式 CLOTH_SX／SZ 同值）：布有皺褶起伏，手指在布上要多留 CLOTH_TOP。 */
  TRAY: { L: { hw: 1.8, hd: 0.46 }, P: { hw: 0.756, hd: 0.331 }, CLOTH_TOP: 0.012 },
  /** 正式資產（走 creature-figures.js 的 GLB 管線載入）。 */
  GLB: 'assets/creatures/hand_r.glb',
  /** 推：與籌碼飛行同長（table-props PROPS.CHIP.FLY_MS），錢的終點不變，只把拋物線換成「被手推著滑」。
   *  推的實際時長由錢柱落定（stackAt().t≥1）決定，本值只是文件常數（tests 斷言它等於 FLY_MS）。v0.59.11：0.42→0.70。 */
  PUSH_MS: 0.70,
  /** v0.59.11 擺錢放慢倍率（使用者：手的動作也要一起放慢）＝新推送時長／舊推送時長（0.70／0.42）。
   *  推本身跟著錢柱走（同步由建構保證）；獨立於錢的只有「推完後的收手」，其時間以此倍率拉長。
   *  只管擺錢階段；揭盅階段（扒回／停一拍／拍令牌／其後收手）不放慢。試玩調整：改這個值（1＝回舊速度）。 */
  PACE: 0.70 / 0.42,
  /** 收手：沿進場方向退回去多遠（世界單位）、花多久；退完即不可見（閒置＝收在畫面外）。 */
  RETRACT_MS: 0.30,
  RETRACT_DIST: 1.0,
  RETRACT_LIFT: 0.12,
  /** 拍：令牌落地後的微顫（只往上抖，不會往下穿令牌）與停留。 */
  SLAM: { SLAP_MS: 0.12, TREMBLE_MS: 0.16, TREMBLE_AMP: 0.010, HOLD_MS: 0.10, TRAIL: 0.13, APPROACH: 0.25 },
  /** v0.61.0 拍令牌拇指收角（使用者 10-05 看示意裁定「外展角收小」）：拍令牌那一下的張開手（spread）拇指根 ThumbA 繞 y 的外展由 26° 收到 DEG。
   *  只換拍令牌（slam）用的姿勢；推錢、收錢、勝方停一拍照舊用 spread。ON＝預設開；table-hands 另有網址 ?thumb=0 退回舊姿勢（寫實關閉時一律舊姿勢）。 */
  SLAM_THUMB: { ON: true, DEG: 17 },
  /** 推（第二輪）：指尖離錢柱外緣多遠。 */
  PUSH_GAP: 0.012,
  /** 信物避讓（第三輪）：側移步長、最多幾步、離外接圓柱多留多少。 */
  RELIC: { STEP: 0.03, STEPS: 22, MARGIN: 0.01 },
  /** 西／東席從側面水平進場（見 yawOf）。 */
  SIDE_YAW: false,
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
/** v0.61.0：拍令牌專用的張開手——spread 只把拇指外展（ThumbA 繞 y）換成 HAND.SLAM_THUMB.DEG，其餘骨逐值相同。 */
POSES.spreadT = Object.assign({}, POSES.spread, { ThumbA: [0, Math.sin((HAND.SLAM_THUMB.DEG * Math.PI) / 360), 0, Math.cos((HAND.SLAM_THUMB.DEG * Math.PI) / 360)] });

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
/* v0.60.0 抓取姿勢 claw：由 rake 每一節再捲 1.6 倍、拇指 1.8 倍往掌心收（爪形抓握，抓法寶上緣）。
   模組載入時算一次（決定性、無亂數）；只有抓取類動作（grab）用到，推／拍／收／停一拍不受影響。 */
function qpow(q, k) {
  const w = Math.max(-1, Math.min(1, q[3])), a = Math.acos(w), sn = Math.sin(a);
  if (sn < 1e-9) return QI.slice();
  const ns = Math.sin(a * k) / sn; return [q[0] * ns, q[1] * ns, q[2] * ns, Math.cos(a * k)];
}
POSES.claw = Object.fromEntries(Object.entries(POSES.rake).map(([k, q]) => [k, k === 'Wrist' ? q.slice() : qpow(q, k.startsWith('Thumb') ? 1.8 : 1.6)]));
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
  /* 看得見的部分（袖口邊以前）：伸入深度限制只看這些點，漸隱掉的袖布不算。 */
  const front = []; for (let v = 0; v < vc; v++) if (src.positions[v * 3 + 2] >= HAND.SLEEVE.CUFF_TO) front.push(v);
  /* 第三輪：信物避讓看的點集＝袖布漸隱到 alpha 0.2 以前（SEEN_TO）的所有頂點。 */
  const seen = []; for (let v = 0; v < vc; v++) if (src.positions[v * 3 + 2] >= HAND.SLEEVE.SEEN_TO) seen.push(v);
  return { names: src.names.slice(), parents: src.parents.slice(), rest: src.rest.map((r) => r.slice()), idx, count: vc, wb, ww, wo, dom, tips, rakeTips, palm, coarse, front, seen };
}

/**
 * 袖子上色（第二輪）：回一份 RGBA 頂點色（itemSize 4）。手掌與手指保留 GLB 原色；
 * 腕後 CUFF_FROM～CUFF_TO 一圈袖口邊；其後袖布由袖口色暗到 CLOTH，alpha 由 1 漸到 0（FADE_TO）。
 * @param positions 頂點 xyz（bind，手部局部 dm）  @param colors 原頂點色  @param itemSize 原色的分量數（3 或 4）
 */
export function dressColors(positions, colors, itemSize = 3, palette = null) {
  const S = palette ? { ...HAND.SLEEVE, ...palette } : HAND.SLEEVE, n = positions.length / 3, out = new Float32Array(n * 4);
  const lerp = (a, b, t) => a + (b - a) * t;
  for (let v = 0; v < n; v++) {
    const z = positions[v * 3 + 2];
    let r = colors[v * itemSize], g = colors[v * itemSize + 1], b = colors[v * itemSize + 2], a = 1;
    if (z < S.CUFF_FROM && z >= S.CUFF_TO) [r, g, b] = S.CUFF;
    else if (z < S.CUFF_TO) {
      const t = clamp01((S.CUFF_TO - z) / (S.CUFF_TO - S.FADE_TO));
      r = lerp(S.CUFF[0], S.CLOTH[0], t); g = lerp(S.CUFF[1], S.CLOTH[1], t); b = lerp(S.CUFF[2], S.CLOTH[2], t);
      a = 1 - smooth(t);
    }
    out[v * 4] = r; out[v * 4 + 1] = g; out[v * 4 + 2] = b; out[v * 4 + 3] = a;
  }
  return out;
}

/* ═══ 角色變體（階段三；提案 §3.4、驗收 docs/experiments/2026-10-01-hands-stage3/acceptance-roles.md）═════════════
 * 三個角色（收驚婆、當鋪、獵人）各有一隻不同的手；其餘角色／未知角色＝預設手（呼叫端拿到 null）。
 * 做法：同一顆 GLB 幾何複製一份，只換頂點色（袖口主色一個部位＋收驚婆的膚色與手背紋理），再把小配件的幾何（紅線、
 * 戒指、護腕、疤）接在同一份幾何後面，蒙皮權重抄最近的原頂點——仍是一隻手一個 SkinnedMesh、一份共用材質、一個 draw call。
 * 純函式、不耗亂數（手背紋理用位置雜湊）、不依賴 three；只在 setSeats／建構時呼叫一次，不得每幀呼叫。 */
const C_LINEN = [0.78, 0.70, 0.54], C_HEM = [0.52, 0.46, 0.34], C_LINING = [0.16, 0.006, 0.009], C_LEATHER = [0.62, 0.30, 0.12], C_STRAP = [0.30, 0.135, 0.050];
const C_BLACK = [0.014, 0.013, 0.016], C_GOLD = [0.80, 0.55, 0.08]; // 第三輪：金邊提亮（暗金在桌燈下會和獵人的棕毛撞色）
/* 第三輪（acceptance-roles-r3.md）：手上一律無綠；金色只屬當鋪（方孔錢＋金邊）；獵人＝毛皮邊＋骨牙，扣改鐵色。 */
const C_LINEN_IN = [0.42, 0.37, 0.28]; // 收驚婆袖口內襯（封口底蓋；比毛邊暗一階，不算進腕部色塊）
const C_COIN = [0.86, 0.60, 0.10], C_FUR = [0.18, 0.142, 0.132], C_FUR_TIP = [0.41, 0.37, 0.35], C_HIDE = [0.22, 0.12, 0.06], C_IRON = [0.16, 0.16, 0.17], C_BONE = [0.80, 0.75, 0.62];
export const ROLE_HAND = {
  /** 環形配件的圓周分段數（面數旋鈕：三角形＝SEG×剖面邊數×2）。 */
  SEG: 12,
  /** 寬袖環上下（y）方向的外撐比例（<1＝橢圓、比寬更扁，免得下緣壓到桌面上的錢）。 */
  PAD_Y: 0.4,
  /** 各角色：袖口邊（cuff）與其後漸隱袖布（cloth），線性 RGB。袖口主色只落在這一個部位。
   *  第二輪（辨識物重做）：遊戲視角手只有幾十像素寬，最大的辨識物＝袖口／護腕的大色塊，故 CUFF 同時是「腕部大色塊」主色
   *  （原頂點的袖口一圈＋下面 CUFF_BAND 的寬袖環都用它）；BLOCK＝該角色腕部色塊全部顏色（主色＋滾邊／襯裡／縫線，驗收 R1 取樣用）。 */
  ROLES: {
    shoujing: { CUFF: C_LINEN, CLOTH: [0.30, 0.27, 0.20], BLOCK: [C_LINEN, C_HEM] }, // 未染白麻
    dangpu: { CUFF: C_BLACK, CLOTH: [0.010, 0.010, 0.013], BLOCK: [C_BLACK, C_GOLD, C_LINING, C_COIN] }, // 黑絲金邊＋暗紅襯＋方孔錢
    hunter: { CUFF: C_LEATHER, CLOTH: [0.18, 0.085, 0.032], BLOCK: [C_FUR, C_FUR_TIP, C_HIDE, C_LEATHER, C_STRAP, C_IRON] }, // 毛皮邊＋皮護腕
  },
  /** 袖口封口（第三輪：讀者說袖口像沒封口的空圓管、露黑洞）：最後面那圈環的中心線上鋪一片朝肘方向（−z）的底蓋，用各角色自己的襯裡色。
   *  SEG＝底蓋圓周點數（扇形三角化、沒有中心點：三角形＝SEG−2）。 */
  CAP: { SEG: 32, shoujing: C_LINEN_IN, dangpu: C_LINING, hunter: C_HIDE },
  /** 寬袖環（第二輪）：套在袖口邊外，中心 z、半寬 W、徑向半厚 R、橢圓外撐 PAD、尾端外翻 FLARE（加撐的小環）。 */
  CUFF_BAND: {
    shoujing: { Z: -0.25, LIFT: 0.01, W: 0.17, R: 0.05, PAD: 0.062, FLARE: 0.05, FLARE_Z: -0.43, FLARE_W: 0.035 },
    dangpu: { Z: -0.25, LIFT: 0, W: 0.15, R: 0.05, PAD: 0.075, FLARE: 0.04, FLARE_Z: -0.43, FLARE_W: 0.025 },
    hunter: { Z: -0.25, W: 0.20, R: 0.040, PAD: 0.040, LIFT: 0.03, FLARE: 0.0, FLARE_Z: -0.45, FLARE_W: 0 },
  },
  /** 收驚婆：較老的膚色（朝 TINT 混 MIX 並壓暗 DIM）、手背暗斑（粗格雜湊 > SPOT_AT 的背面頂點乘 SPOT；CELL＝格寬 dm，成片的大斑）、指節（B 骨）紋乘 KNUCKLE。 */
  AGED: { TINT: [0.26, 0.20, 0.15], MIX: 0.68, DIM: 0.86, SPOT_AT: 0.60, SPOT: 0.36, CELL: 0.30, KNUCKLE: 0.75 },
  /** 收驚婆：木佛珠（一圈 N 顆、深褐）與紅繩（一圈，COLOR 保持舊名；TASSEL＝繩結下垂的小穗）。離腕骨 z（dm）。 */
  BEADS: { Z: 0.08, N: 11, ARC: Math.PI * 1.3, FROM: Math.PI * 0.15, /* 只繞手腕上半圈多（下緣貼桌，不繞滿） */ S: 0.062, COLOR: [0.055, 0.026, 0.012], OUT: 0.035,
    /* v0.59.7 寫實（驗收條件 10b）：木珠改 UV 球（SEG 經線 × RINGS 緯帶），珠徑 ±VAR 不規則、每顆深淺不一（材質依位置低頻雜訊），串在一條細紅繩上（CORD 截面半徑，珠間看得到繩）。 */
    SEG: 8, RINGS: 4, VAR: 0.13, CORD: 0.013 },
  THREAD: { Z: [0.19], R: 0.040, W: 0.034, GAP: 0.012, COLOR: [0.46, 0.015, 0.012],
    /* v0.59.7 寫實（驗收條件 10a）：紅線改圓截面的繩（截面 SIDES 邊、半徑 ROPE），從 Z0 繞到 Z1 共 TURNS 圈的螺旋，
       每圈 SEGS 段；圈距與鬆緊依位置雜湊微抖（JZ 軸向、JR 徑向比例），不是整齊的彈簧。 */
    ROPE: 0.022, SIDES: 7, Z0: 0.135, Z1: 0.255, TURNS: 2.25, SEGS: 20, JZ: 0.008, JR: 0.03, SINK: 0.35, SPREAD: 0.3 },
  /** 當鋪袖口滾邊（金，寬）與襯裡（暗紅，外翻露出）。第三輪：玉扳指拿掉（綠色兩邊都被讀成當鋪／獵人）。 */
  TRIM: { GOLD: C_GOLD, LINING: C_LINING, GOLD_W: 0.05, GOLD_Z: [-0.115, -0.395] },
  /** 當鋪：腕上一串金色方孔錢（第三輪）。貼在黑袖環外面、從頂上沿外側（−x）垂下；ANG＝各枚在袖環上的方位角（度，90＝正上）。
   *  每枚＝外八角、內方孔的環（外半徑 R、方孔半邊 HOLE、厚 T）。 */
  COIN: { COLOR: C_COIN, ANG: [96, 114, 132, 150, 168, 186], R: 0.050, HOLE: 0.017, T: 0.012, GAP: 0.003 },
  /** 獵人：皮護腕（縮成輔助）、兩道扣帶、鐵扣（第三輪：黃銅扣會和當鋪金撞色）；手背舊疤。
   *  第三輪拿掉指節髒麻布纏帶：遊戲視角它的像素比毛皮邊還多（毛皮要當最大色塊），且米白麻布易被讀成收驚婆的白袖。 */
  BRACER: { Z: -0.165, W: 0.085, R: 0.040, GAP: 0.002, COLOR: C_LEATHER, STRAP: C_STRAP, STRAP_Z: [-0.105, -0.232], STRAP_W: 0.03, BUCKLE: C_IRON, BUCKLE_S: [0.07, 0.03, 0.035],
    /* v0.59.7：圓頂鉚釘（半徑 R、法向壓扁 FLAT；鐵色比扣略亮，仍非黃銅） */
    RIVET: { ANG: [28, 52, 76, 104, 128, 152], R: 0.024, FLAT: 0.75, SEG: 10, RINGS: 5, COLOR: [0.24, 0.235, 0.23] } },
  /** 獵人：外翻一圈蓬鬆毛皮邊（第三輪，最大色塊）。袖環中心 Z、軸向半寬 W、外撐 PAD、毛厚 R（底下 BOTTOM 倍、免得壓到錢）、
   *  不規則邊（位置雜湊、不耗亂數）JIT；TUFTS＝邊緣一撮撮外翹的毛（尖錐），長 TUFT_L。COLORS＝毛皮色組（驗收 R3-3 取樣用）。 */
  FUR: { Z: -0.36, W: 0.13, PAD: 0.09, LOW: 0.0, R: 0.065, BOTTOM: 0.3, SEG: 18, TS: 6, JIT: 0.7, TUFTS: 26, TUFT_L: 0.06, TUFT_W: 0.042, COLOR: C_FUR, TIP: C_FUR_TIP, COLORS: [C_FUR, C_FUR_TIP] },
  /** 獵人：骨／獸牙護符——繞在皮護腕上（Z 處）的一圈細皮繩，上半圈 N 顆象牙白小尖牙往外翹。ANG＝方位角（度）。 */
  BONE: { COLOR: C_BONE, CORD: C_STRAP, Z: -0.14, ANG: [52, 78, 104, 130], L: 0.11, W: 0.02, CORD_R: 0.012 },
  TAN: [0.90, 0.78, 0.66],
  SCAR: { A: [0.16, 0.28], B: [-0.12, 0.66], W: 0.045, LIFT: 0.014, N: 8, COLOR: [0.74, 0.50, 0.42] },
};
export const ROLE_KEYS = Object.keys(ROLE_HAND.ROLES);
/** 角色 id → 變體鍵；不是三角色（含 null／非字串／原型鏈上的名字）一律 null＝預設手。 */
export function roleVariantKey(role) {
  return typeof role === 'string' && Object.prototype.hasOwnProperty.call(ROLE_HAND.ROLES, role) ? role : null;
}

const hash3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const v3sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const v3add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const v3mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const v3dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const v3cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const v3norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** 配件幾何收集器（頂點、法線、頂點色 RGBA、索引）。 */
function accBuilder() {
  const P = [], N = [], C = [], I = [], A = [];
  /* A＝每頂點 3 個數（v0.59.7 寫實材質用）：[材質類別, u, v]——0 布／其他、2 繩（u＝沿繩長 dm、v＝繞繩截面角）、3 木、4 金屬。 */
  let cls = [0, 0, 0];
  const vert = (p, n, c) => { P.push(p[0], p[1], p[2]); const l = v3norm(n); N.push(l[0], l[1], l[2]); C.push(c[0], c[1], c[2], 1); A.push(cls[0], cls[1], cls[2]); return P.length / 3 - 1; };
  return {
    P, N, C, I, A, vert,
    /** 之後加的頂點用這個材質類別（[類別, u, v]）。 */
    setClass(k) { cls = [k, 0, 0]; },
    /** 球（UV 球，seg 經線、rings 緯帶；兩極各一點）：中心 c、半徑 r、三軸伸縮 k（預設等比）。剪影＝多邊形近似圓。 */
    sphere(c, r, color, seg = 8, rings = 4, k = [1, 1, 1], axis = [0, 1, 0]) {
      const ax = v3norm(axis), u = v3norm(v3cross(Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], ax)), w = v3cross(ax, u);
      const at = (x, y, z) => v3add(c, v3add(v3add(v3mul(u, x * r * k[0]), v3mul(ax, y * r * k[1])), v3mul(w, z * r * k[2])));
      const nrm = (x, y, z) => v3add(v3add(v3mul(u, x / k[0]), v3mul(ax, y / k[1])), v3mul(w, z / k[2]));
      const top = vert(at(0, 1, 0), nrm(0, 1, 0), color), bot = vert(at(0, -1, 0), nrm(0, -1, 0), color), ring = [];
      for (let j = 1; j < rings; j++) {
        const ph = (j / rings) * Math.PI, y = Math.cos(ph), rr = Math.sin(ph), row = [];
        for (let i = 0; i < seg; i++) { const th = (i / seg) * Math.PI * 2, x = rr * Math.cos(th), z = rr * Math.sin(th); row.push(vert(at(x, y, z), nrm(x, y, z), color)); }
        ring.push(row);
      }
      for (let i = 0; i < seg; i++) {
        const i2 = (i + 1) % seg;
        I.push(top, ring[0][i2], ring[0][i]);
        for (let j = 0; j + 1 < ring.length; j++) I.push(ring[j][i], ring[j][i2], ring[j + 1][i], ring[j + 1][i], ring[j][i2], ring[j + 1][i2]);
        I.push(bot, ring[ring.length - 1][i], ring[ring.length - 1][i2]);
      }
    },
    /** 圓截面的管（繩）：沿折線 pts（每點 [x,y,z]），截面半徑 r（可為函式 r(i)）、sides 邊；兩端封口。
     *  頂點的 A＝[2, 沿繩長, 截面角]：材質依此畫捻股（每股斜繞）與毛邊。 */
    tube(pts, r, color, sides = 5, cl = 2) {
      const rows = [];
      let len = 0;
      for (let i = 0; i < pts.length; i++) {
        if (i) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], t = v3norm(v3sub(b, a));
        const u = v3norm(v3cross(Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], t)), w = v3cross(t, u), rr = typeof r === 'function' ? r(i) : r, row = [];
        for (let j = 0; j < sides; j++) {
          const th = (j / sides) * Math.PI * 2, n = v3add(v3mul(u, Math.cos(th)), v3mul(w, Math.sin(th)));
          cls = [cl, len, th]; row.push(vert(v3add(pts[i], v3mul(n, rr)), n, color));
        }
        rows.push(row);
      }
      for (let i = 0; i + 1 < rows.length; i++) for (let j = 0; j < sides; j++) {
        const j2 = (j + 1) % sides; I.push(rows[i][j], rows[i + 1][j], rows[i][j2], rows[i][j2], rows[i + 1][j], rows[i + 1][j2]);
      }
      for (const [row, s] of [[rows[0], -1], [rows[rows.length - 1], 1]]) { // 兩端封口（扇形）
        const i0 = s < 0 ? 0 : pts.length - 1, t = v3norm(v3mul(v3sub(pts[Math.min(pts.length - 1, i0 + 1)], pts[Math.max(0, i0 - 1)]), s));
        const ids = row.map((v) => vert([P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], t, color));
        for (let j = 1; j + 1 < sides; j++) I.push(ids[0], ids[j], ids[j + 1]);
      }
      cls = [0, 0, 0];
    },
    /** 環：沿 d 軸（單位）、剖面平面基底 a／b、橢圓中心線半徑 ra／rb、剖面徑向半厚 r、軸向半寬 w、剖面邊數 ts。 */
    ring(c, d, a, b, ra, rb, r, w, color, seg = ROLE_HAND.SEG, ts = 4) {
      const base = P.length / 3;
      for (let i = 0; i < seg; i++) {
        const th = (i / seg) * Math.PI * 2, ct = Math.cos(th), st = Math.sin(th);
        const q = v3add(c, v3add(v3mul(a, ra * ct), v3mul(b, rb * st)));
        const n0 = v3norm(v3add(v3mul(a, ct / ra), v3mul(b, st / rb)));
        for (let j = 0; j < ts; j++) {
          const ph = (j / ts) * Math.PI * 2 + Math.PI / ts, cp = Math.cos(ph), sp = Math.sin(ph);
          vert(v3add(q, v3add(v3mul(n0, r * cp), v3mul(d, w * sp))), v3add(v3mul(n0, cp / r), v3mul(d, sp / w)), color);
        }
      }
      for (let i = 0; i < seg; i++) for (let j = 0; j < ts; j++) {
        const i2 = (i + 1) % seg, j2 = (j + 1) % ts;
        const p00 = base + i * ts + j, p10 = base + i2 * ts + j, p11 = base + i2 * ts + j2, p01 = base + i * ts + j2;
        I.push(p00, p01, p10, p10, p01, p11);
      }
    },
    /** 軸對齊的菱形（八面體）：中心 c、三軸半長 s。 */
    lozenge(c, s, color) {
      const pts = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((u) => [c[0] + u[0] * s[0], c[1] + u[1] * s[1], c[2] + u[2] * s[2]]);
      for (const [i, j, k] of [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]]) {
        const n = v3cross(v3sub(pts[j], pts[i]), v3sub(pts[k], pts[i]));
        const a = vert(pts[i], n, color), b = vert(pts[j], n, color), d = vert(pts[k], n, color); I.push(a, b, d);
      }
    },
    /** 軸對齊的盒：中心 c、三軸半長 s。 */
    box(c, s, color) {
      const faces = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]]];
      for (const [n, u, w] of faces) {
        const at = (su, sw) => [c[0] + (n[0] + u[0] * su + w[0] * sw) * s[0], c[1] + (n[1] + u[1] * su + w[1] * sw) * s[1], c[2] + (n[2] + u[2] * su + w[2] * sw) * s[2]];
        const q = [at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)].map((p) => vert(p, n, color));
        I.push(q[0], q[1], q[2], q[0], q[2], q[3]);
      }
    },
    /** 平面多邊形底蓋（第三輪袖口封口）：橢圓（中心 c、平面基底 a／b、半徑 ra／rb）seg 個點、法線 n；扇形三角化、無中心點。 */
    disc(c, a, b, ra, rb, n, color, seg, rbLow = rb) {
      const ids = [];
      for (let i = 0; i < seg; i++) { const th = (i / seg) * Math.PI * 2, st = Math.sin(th); ids.push(vert(v3add(c, v3add(v3mul(a, ra * Math.cos(th)), v3mul(b, (st < 0 ? rbLow : rb) * st))), n, color)); }
      for (let i = 1; i + 1 < seg; i++) I.push(ids[0], ids[i], ids[i + 1]);
    },
    /** 四角尖錐（骨牙、毛尖）：底心 p、指向 dir（單位）、長 len、底半寬 w；底面也封起來。 */
    spike(p, dir, len, w, color) {
      const u = v3norm(v3cross(Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], dir)), v = v3cross(dir, u);
      const apex = v3add(p, v3mul(dir, len)), cs = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([s, t]) => v3add(p, v3add(v3mul(u, s * w), v3mul(v, t * w))));
      for (let k = 0; k < 4; k++) {
        const b0 = cs[k], b1 = cs[(k + 1) % 4], n = v3cross(v3sub(b1, b0), v3sub(apex, b0));
        const nn = v3dot(n, v3sub(v3mul(v3add(b0, b1), 0.5), p)) < 0 ? v3mul(n, -1) : n;
        I.push(vert(b0, nn, color), vert(b1, nn, color), vert(apex, nn, color));
      }
      const nb = v3mul(dir, -1), q = cs.map((x) => vert(x, nb, color)); I.push(q[0], q[1], q[2], q[0], q[2], q[3]);
    },
    /** 方孔錢：中心 c、面法線 n、面內基底 u／v，外圓半徑 r（v0.59.7：外緣 OS 段，原 8 角）、方孔半邊 h、厚 t。正反兩面＋外緣＋孔壁（各自的面法線）。 */
    coin(c, n, u, v, r, h, t, color) {
      const OS = 16, Q = OS / 4; // 外緣段數（4 的倍數：每個方孔邊對 Q 段外緣）
      const at = (x, y, z) => v3add(c, v3add(v3add(v3mul(u, x), v3mul(v, y)), v3mul(n, z)));
      const out = (j) => { const th = (j / OS) * Math.PI * 2; return [r * Math.cos(th), r * Math.sin(th)]; };
      const inn = (k) => { const th = Math.PI / 4 + (k / 4) * Math.PI * 2; return [h * Math.SQRT2 * Math.cos(th), h * Math.SQRT2 * Math.sin(th)]; };
      for (const s of [1, -1]) { // 正反兩面
        const nn = v3mul(n, s), O = [], In = [];
        for (let j = 0; j < OS; j++) { const [x, y] = out(j); O.push(vert(at(x, y, s * t / 2), nn, color)); }
        for (let k = 0; k < 4; k++) { const [x, y] = inn(k); In.push(vert(at(x, y, s * t / 2), nn, color)); }
        /* 方孔第 k 角在 45°+90°k；它和下一角之間的外緣是 j＝Q·k＋Q/2 … Q·(k+1)＋Q/2 */
        for (let k = 0; k < 4; k++) {
          const i0 = In[k], i1 = In[(k + 1) % 4], j0 = Q * k + Q / 2;
          for (let q = 0; q < Q; q++) I.push(i0, O[(j0 + q) % OS], O[(j0 + q + 1) % OS]);
          I.push(i0, O[(j0 + Q) % OS], i1);
        }
      }
      const wall = (p0, p1, nn) => { const q = [vert(at(p0[0], p0[1], t / 2), nn, color), vert(at(p1[0], p1[1], t / 2), nn, color), vert(at(p1[0], p1[1], -t / 2), nn, color), vert(at(p0[0], p0[1], -t / 2), nn, color)]; I.push(q[0], q[1], q[2], q[0], q[2], q[3]); };
      for (let j = 0; j < OS; j++) { const p0 = out(j), p1 = out(j + 1), m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]; wall(p0, p1, v3add(v3mul(u, m[0]), v3mul(v, m[1]))); } // 外緣朝外
      for (let k = 0; k < 4; k++) { const p0 = inn(k), p1 = inn(k + 1), m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]; wall(p0, p1, v3add(v3mul(u, -m[0]), v3mul(v, -m[1]))); } // 孔壁朝孔心
    },
    /** v0.59.6 原樣的方孔錢（外八角）；寫實關閉（?handreal=0）時用，與 95f621db 逐點相同。 */
    coin8(c, n, u, v, r, h, t, color) {
      const at = (x, y, z) => v3add(c, v3add(v3add(v3mul(u, x), v3mul(v, y)), v3mul(n, z)));
      const out = (j) => { const th = (j / 8) * Math.PI * 2; return [r * Math.cos(th), r * Math.sin(th)]; };
      const inn = (k) => { const th = Math.PI / 4 + (k / 4) * Math.PI * 2; return [h * Math.SQRT2 * Math.cos(th), h * Math.SQRT2 * Math.sin(th)]; };
      for (const s of [1, -1]) { // 正反兩面
        const nn = v3mul(n, s), O = [], In = [];
        for (let j = 0; j < 8; j++) { const [x, y] = out(j); O.push(vert(at(x, y, s * t / 2), nn, color)); }
        for (let k = 0; k < 4; k++) { const [x, y] = inn(k); In.push(vert(at(x, y, s * t / 2), nn, color)); }
        for (let k = 0; k < 4; k++) {
          const o1 = O[(2 * k + 1) % 8], o2 = O[(2 * k + 2) % 8], o3 = O[(2 * k + 3) % 8], i0 = In[k], i1 = In[(k + 1) % 4];
          I.push(i0, o1, o2, i0, o2, i1, i1, o2, o3);
        }
      }
      const wall = (p0, p1, nn) => { const q = [vert(at(p0[0], p0[1], t / 2), nn, color), vert(at(p1[0], p1[1], t / 2), nn, color), vert(at(p1[0], p1[1], -t / 2), nn, color), vert(at(p0[0], p0[1], -t / 2), nn, color)]; I.push(q[0], q[1], q[2], q[0], q[2], q[3]); };
      for (let j = 0; j < 8; j++) { const p0 = out(j), p1 = out(j + 1), m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]; wall(p0, p1, v3add(v3mul(u, m[0]), v3mul(v, m[1]))); } // 外緣朝外
      for (let k = 0; k < 4; k++) { const p0 = inn(k), p1 = inn(k + 1), m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]; wall(p0, p1, v3add(v3mul(u, -m[0]), v3mul(v, -m[1]))); } // 孔壁朝孔心
    },
    /** 平面條（疤）：沿折線 pts（每點 [x,y,z]）、寬 w（x 方向），法線朝上。 */
    strip(pts, w, color) {
      const ids = pts.map((p) => [vert([p[0] - w, p[1], p[2]], [0, 1, 0], color), vert([p[0] + w, p[1], p[2]], [0, 1, 0], color)]);
      for (let k = 0; k + 1 < ids.length; k++) I.push(ids[k][0], ids[k + 1][0], ids[k][1], ids[k][1], ids[k + 1][0], ids[k + 1][1]);
    },
  };
}

/** v0.61.0 批 1 身分變體（js/hand-b1.js）共用的配件工具出口；本檔行為不變。 */
export const ROLE_PARTS = { accBuilder: () => accBuilder(), boneWorld: (rig, name) => boneWorld(rig, name), crossSection: (...a) => crossSection(...a) };

/** 骨 bind 世界位置（bind 旋轉為單位，父座標位置累加）。 */
function boneWorld(rig, name) {
  let i = rig.idx[name], p = [0, 0, 0];
  while (i >= 0) { p = v3add(p, rig.rest[i]); i = rig.parents[i]; }
  return p;
}
/** 在軸 c 上、軸向 ±half 內的原頂點，投影到 a／b 平面：回包絡的中點（cx,cy）與半寬（ra,rb）。 */
function crossSection(pos, c, d, a, b, half) {
  let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9, hit = 0;
  for (let v = 0; v < pos.length / 3; v++) {
    const q = v3sub([pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]], c);
    if (Math.abs(v3dot(q, d)) > half) continue;
    const x = v3dot(q, a), y = v3dot(q, b);
    if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; hit++;
  }
  if (!hit) return null;
  return { cx: (a0 + a1) / 2, cy: (b0 + b1) / 2, ra: (a1 - a0) / 2, rb: (b1 - b0) / 2 };
}
/** (x,z) 處原網格的最高表面 y（三角形投影到 xz 的重心座標；沒蓋到回 null）。 */
function topAt(pos, idx, x, z) {
  let best = null;
  for (let t = 0; t < idx.length; t += 3) {
    const A = idx[t] * 3, B = idx[t + 1] * 3, C = idx[t + 2] * 3;
    const d = (pos[B + 2] - pos[C + 2]) * (pos[A] - pos[C]) + (pos[C] - pos[B]) * (pos[A + 2] - pos[C + 2]);
    if (Math.abs(d) < 1e-12) continue;
    const l1 = ((pos[B + 2] - pos[C + 2]) * (x - pos[C]) + (pos[C] - pos[B]) * (z - pos[C + 2])) / d;
    const l2 = ((pos[C + 2] - pos[A + 2]) * (x - pos[C]) + (pos[A] - pos[C]) * (z - pos[C + 2])) / d;
    const l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
    const y = l1 * pos[A + 1] + l2 * pos[B + 1] + l3 * pos[C + 1];
    if (best === null || y > best) best = y;
  }
  return best;
}

/**
 * 某角色的變體幾何（陣列版）。回 null＝預設手（呼叫端沿用共用的預設幾何）。
 * @param rig   buildRig 的結果（要 names／idx／parents／rest）
 * @param base  { position, normal, color(原頂點色), colorSize, skinIndex, skinWeight, index }——原 GLB 幾何的陣列
 * @param role  角色 id
 * @returns { key, position, normal, color(RGBA), skinIndex, skinWeight, index, baseCount, extraVerts, extraTris, recolored } | null
 */
export function buildRoleGeometry(rig, base, role, opts = {}) {
  /* opts.real＝false：v0.59.6 原樣配件（扁紅帶、八面體珠、八角錢、無鉚釘）——寫實總開關關閉時用，與 95f621db 逐點相同。 */
  const real = opts.real !== false;
  const key = roleVariantKey(role);
  if (!key) return null;
  const R = ROLE_HAND, def = R.ROLES[key], pos = base.position, n0 = pos.length / 3;
  const color = dressColors(pos, base.color, base.colorSize, def);
  const dressed = dressColors(pos, base.color, base.colorSize); // 預設手的顏色（算「專屬色頂點數」的參考）
  const bonesOf = new Array(n0);
  for (let v = 0; v < n0; v++) { let k = 0; for (let j = 1; j < 4; j++) if (base.skinWeight[v * 4 + j] > base.skinWeight[v * 4 + k]) k = j; bonesOf[v] = rig.names[base.skinIndex[v * 4 + k]]; }
  const acc = accBuilder();
  const S = HAND.SLEEVE;
  const up = [0, 1, 0], zax = [0, 0, 1], xax = [1, 0, 0];

  /* 寬袖環（三角色共用做法）：以袖口帶中央的前臂剖面為準向外撐 PAD，主色＝該角色 CUFF；尾端再加一圈外翻的小環。 */
  const w0 = boneWorld(rig, 'Wrist'), CB = R.CUFF_BAND[key];
  const cuffCs = crossSection(pos, [w0[0], w0[1], CB.Z], zax, xax, up, 0.05);
  const cuffC = cuffCs ? [w0[0] + cuffCs.cx, w0[1] + cuffCs.cy, CB.Z] : null;
  const band = (z, w, r, pad, color, ts = 4) => acc.ring([cuffC[0], cuffC[1] + CB.LIFT, z], zax, xax, up, cuffCs.ra + pad, cuffCs.rb + pad * R.PAD_Y, r, w, color, 16, ts);
  /* 袖口封口（第三輪）：最後面那圈環的中心線上一片朝肘（−z）的底蓋——從手肘方向看進袖口，先看到襯裡色，不再是空圓管。 */
  const cap = (z, pad, cs = cuffCs, c = cuffC, rbLow = undefined) => acc.disc([c[0], c[1] + CB.LIFT, z], xax, up, cs.ra + pad, cs.rb + pad * R.PAD_Y, [0, 0, -1], R.CAP[key], R.CAP.SEG, rbLow);

  if (key === 'shoujing') {
    const A = R.AGED;
    for (let v = 0; v < n0; v++) {
      const z = pos[v * 3 + 2];
      if (z < S.CUFF_FROM) continue; // 袖口以後不動
      for (let k = 0; k < 3; k++) color[v * 4 + k] = (color[v * 4 + k] + (A.TINT[k] - color[v * 4 + k]) * A.MIX) * A.DIM;
      const back = base.normal[v * 3 + 1] > 0.3 && z > 0.1 && !/Tip$/.test(bonesOf[v]);
      if (back && hash3(Math.floor(pos[v * 3] / A.CELL), 7, Math.floor(z / A.CELL)) > A.SPOT_AT) for (let k = 0; k < 3; k++) color[v * 4 + k] *= A.SPOT;
      if (/^(Index|Middle|Ring|Pinky|Thumb)B$/.test(bonesOf[v])) for (let k = 0; k < 3; k++) color[v * 4 + k] *= A.KNUCKLE;
    }
    if (cuffCs) {
      band(CB.Z, CB.W, CB.R, CB.PAD, def.CUFF);
      band(CB.FLARE_Z, CB.FLARE_W, CB.R, CB.PAD + CB.FLARE, C_HEM); // 外翻的毛邊一圈
      cap(CB.FLARE_Z, CB.PAD + CB.FLARE);
    }
    const T = R.THREAD, Bd = R.BEADS, cs = crossSection(pos, [w0[0], w0[1], Bd.Z], zax, xax, up, 0.03);
    if (!real) {
      if (cs) for (let i = 0; i < Bd.N; i++) { // 木佛珠一圈（v0.59.6）
        const th = (i / (Bd.N - 1)) * Bd.ARC - Bd.FROM, c = [w0[0] + cs.cx + Math.cos(th) * (cs.ra + Bd.OUT), w0[1] + cs.cy + Math.sin(th) * (cs.rb + Bd.OUT), Bd.Z];
        acc.lozenge(c, [Bd.S, Bd.S, Bd.S * 1.1], Bd.COLOR);
      }
      for (const z of T.Z) { // 紅繩（v0.59.6）
        const cs2 = crossSection(pos, [w0[0], w0[1], z], zax, xax, up, 0.03);
        if (cs2) acc.ring([w0[0] + cs2.cx, w0[1] + cs2.cy, z], zax, xax, up, cs2.ra + T.GAP, cs2.rb + T.GAP, T.R, T.W, T.COLOR);
      }
    } else {
    if (cs) { // 木佛珠一圈（v0.59.7：球形、大小與深淺不一，串在細紅繩上）
      const at = (th) => [w0[0] + cs.cx + Math.cos(th) * (cs.ra + Bd.OUT), w0[1] + cs.cy + Math.sin(th) * (cs.rb + Bd.OUT), Bd.Z];
      acc.setClass(3);
      for (let i = 0; i < Bd.N; i++) {
        const th = (i / (Bd.N - 1)) * Bd.ARC - Bd.FROM, k = 1 + Bd.VAR * (2 * hash3(i, 3, 11) - 1);
        acc.sphere(at(th), Bd.S * k, Bd.COLOR, Bd.SEG, Bd.RINGS, [1, 1, 1], [-Math.sin(th), Math.cos(th), 0]); // 深淺不一由材質畫（頂點色保持識別色）
      }
      const cord = []; // 串珠的繩：沿同一條弧，兩端多出半顆珠
      const a0 = -Bd.FROM - 0.12, a1 = Bd.ARC - Bd.FROM + 0.12;
      for (let i = 0; i <= 22; i++) cord.push(at(a0 + (a1 - a0) * i / 22));
      acc.tube(cord, Bd.CORD, T.COLOR, 4);
      acc.setClass(0);
    }
    { // 紅繩（v0.59.7：圓截面繩，繞腕 TURNS 圈的不規則螺旋；修訂4：貼著手腕——每一段沿該方位角找原手表面的實際半徑，不用外框橢圓）
      const n = Math.round(T.TURNS * T.SEGS), pts = [];
      const surf = (z, th) => { // 該 z 圈、方位角 th 方向上，原手表面離截面中心的最遠距離（±SPREAD 弧度內的頂點）
        const c2 = crossSection(pos, [w0[0], w0[1], z], zax, xax, up, 0.03); if (!c2) return null;
        const cx = w0[0] + c2.cx, cy = w0[1] + c2.cy; let r = 0;
        for (let v = 0; v < n0; v++) {
          if (Math.abs(pos[v * 3 + 2] - z) > 0.035) continue;
          const dx = pos[v * 3] - cx, dy = pos[v * 3 + 1] - cy; let da = Math.atan2(dy, dx) - th; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) < T.SPREAD) r = Math.max(r, Math.hypot(dx, dy) * Math.cos(da));
        }
        if (!r) r = Math.hypot(c2.ra * Math.cos(th), c2.rb * Math.sin(th));
        return { cx, cy, r };
      };
      for (let i = 0; i <= n; i++) {
        const u = i / n, th = u * T.TURNS * Math.PI * 2 + 0.6, z = T.Z0 + (T.Z1 - T.Z0) * u + T.JZ * (2 * hash3(i, 7, 3) - 1) * Math.sin(u * Math.PI);
        const sf = surf(z, th); if (!sf) continue;
        const slack = T.JR * (2 * hash3(Math.floor(i / 4), 9, 1) - 1) * 0.5, off = T.ROPE * (1 - T.SINK) + sf.r * slack;
        pts.push([sf.cx + Math.cos(th) * (sf.r + off), sf.cy + Math.sin(th) * (sf.r + off), z]);
      }
      if (pts.length > 2) acc.tube(pts, T.ROPE, T.COLOR, T.SIDES);
    }
    }
  } else if (key === 'dangpu') {
    if (cuffCs) {
      band(CB.Z, CB.W, CB.R, CB.PAD, def.CUFF);
      acc.setClass(4); // v0.59.7 修訂4（條件10c）：金滾邊＝金屬（材質給金屬度與高光，不是平面色塊）
      for (const z of R.TRIM.GOLD_Z) band(z, R.TRIM.GOLD_W, CB.R + 0.008, CB.PAD + 0.004, R.TRIM.GOLD); // 金滾邊（寬）
      acc.setClass(0);
      band(CB.FLARE_Z, CB.FLARE_W, CB.R, CB.PAD + CB.FLARE, R.TRIM.LINING); // 外翻露出的暗紅襯裡
      cap(CB.FLARE_Z, CB.PAD + CB.FLARE);
      acc.setClass(4); // v0.59.7：方孔錢＝金屬
      /* 方孔錢一串：貼在黑袖環的外面（環剖面是軸對齊矩形，外表面在中心線外 r·cos45°），錢面朝外、從頂上沿外側垂下。 */
      const Cn = R.COIN, ra = cuffCs.ra + CB.PAD, rb = cuffCs.rb + CB.PAD * R.PAD_Y, c0 = [cuffC[0], cuffC[1] + CB.LIFT, CB.Z];
      for (const deg of Cn.ANG) {
        const th = (deg / 180) * Math.PI, ct = Math.cos(th), st = Math.sin(th);
        const q = v3add(c0, [ra * ct, rb * st, 0]), n = v3norm([ct / ra, st / rb, 0]);
        acc[real ? 'coin' : 'coin8'](v3add(q, v3mul(n, CB.R * Math.SQRT1_2 + Cn.T / 2 + Cn.GAP)), n, zax, v3cross(n, zax), Cn.R, Cn.HOLE, Cn.T, Cn.COLOR);
      }
      acc.setClass(0);
    }
  } else if (key === 'hunter') {
    const B = R.BRACER, F = R.FUR;
    for (let v = 0; v < n0; v++) if (pos[v * 3 + 2] >= S.CUFF_FROM) for (let k = 0; k < 3; k++) color[v * 4 + k] *= R.TAN[k]; // 曬黑粗糙的皮膚
    if (cuffCs) {
      band(B.Z, B.W, B.R, B.GAP + 0.024, B.COLOR);
      for (const z of B.STRAP_Z) band(z, B.STRAP_W, B.R * 0.6, B.GAP + 0.024 + B.R * 0.45, B.STRAP);
      acc.setClass(4); // v0.59.7：鐵扣、鉚釘＝金屬
      acc.box([cuffC[0], cuffC[1] + CB.LIFT + cuffCs.rb + 0.024 * R.PAD_Y + B.R * 1.6, B.STRAP_Z[1]], B.BUCKLE_S, B.BUCKLE); // 鐵扣扣在後面那道帶子上
      /* v0.59.7（驗收條件 10c）：護腕上一排圓頂鉚釘（扁球、一半埋進皮面），上半圈 RIVET.ANG 方位角。 */
      const RV = B.RIVET, pad = B.GAP + 0.024, ra = cuffCs.ra + pad, rb = cuffCs.rb + pad * R.PAD_Y;
      if (real) for (const deg of RV.ANG) {
        const th = (deg / 180) * Math.PI, ct = Math.cos(th), st = Math.sin(th), nn = v3norm([ct / ra, st / rb, 0]);
        const q = [cuffC[0] + ra * ct, cuffC[1] + CB.LIFT + rb * st, B.Z];
        acc.sphere(v3add(q, v3mul(nn, B.R * Math.SQRT1_2)), RV.R, RV.COLOR, RV.SEG, RV.RINGS, [1, RV.FLAT, 1], nn);
      }
      acc.setClass(0);
    }
    const fcs = crossSection(pos, [w0[0], w0[1], F.Z], zax, xax, up, 0.05);
    if (fcs) {
      /* 毛皮邊：沿袖環一圈 SEG 段、剖面 TS 邊的管，毛厚上厚下薄（BOTTOM），外側頂點依位置雜湊往外蓬（不規則邊）；
         外側且雜湊高的頂點用淺色毛尖。再沿上大半圈插 TUFTS 撮外翹的尖錐毛。全部決定性（hash3，不耗亂數）。 */
      /* 下半圈貼著前臂（rbLow）：手壓在桌上時毛皮不往下擠進錢柱；蓬鬆的量都在上半圈與兩側。 */
      const ra = fcs.ra + F.PAD, rb = fcs.rb + F.PAD * R.PAD_Y, rbLow = fcs.rb + F.LOW, fc = [w0[0] + fcs.cx, w0[1] + fcs.cy + CB.LIFT, F.Z], base = acc.P.length / 3;
      const ell = (ct, st) => [ra * ct, (st < 0 ? rbLow : rb) * st];
      const thick = (st) => F.R * (st < 0 ? F.BOTTOM + (1 - F.BOTTOM) * (1 + st) : 1);
      for (let i = 0; i < F.SEG; i++) {
        const th = (i / F.SEG) * Math.PI * 2, ct = Math.cos(th), st = Math.sin(th);
        const e = ell(ct, st), q = v3add(fc, [e[0], e[1], 0]), n0r = v3norm([ct / ra, st / (st < 0 ? rbLow : rb), 0]), r = thick(st);
        for (let j = 0; j < F.TS; j++) {
          const ph = (j / F.TS) * Math.PI * 2, cp = Math.cos(ph), sp = Math.sin(ph), h = hash3(i, j, 5);
          const puff = cp > 0 ? 1 + F.JIT * (h - 0.3) * cp : 1;
          const p = v3add(q, v3add(v3mul(n0r, r * cp * puff), [0, 0, F.W * sp * (1 + 0.25 * (hash3(i, j, 9) - 0.5))]));
          acc.vert(p, v3add(v3mul(n0r, cp / r), [0, 0, sp / F.W]), cp > 0.3 && h > 0.35 ? F.TIP : F.COLOR);
        }
      }
      for (let i = 0; i < F.SEG; i++) for (let j = 0; j < F.TS; j++) {
        const i2 = (i + 1) % F.SEG, j2 = (j + 1) % F.TS;
        const p00 = base + i * F.TS + j, p10 = base + i2 * F.TS + j, p11 = base + i2 * F.TS + j2, p01 = base + i * F.TS + j2;
        acc.I.push(p00, p01, p10, p10, p01, p11);
      }
      for (let k = 0; k < F.TUFTS; k++) { // 外翹毛尖：上大半圈（−30°～210°）
        const th = (-30 + (240 * (k + 0.5 * hash3(k, 1, 2))) / F.TUFTS) * Math.PI / 180, ct = Math.cos(th), st = Math.sin(th);
        const n0r = v3norm([ct / ra, st / (st < 0 ? rbLow : rb), 0]), zt = F.Z + F.W * (hash3(k, 3, 4) - 0.6), e = ell(ct, st);
        const p = v3add([fc[0] + e[0], fc[1] + e[1], zt], v3mul(n0r, thick(st) * 0.7));
        acc.spike(p, v3norm(v3add(v3mul(n0r, 0.5 + 0.5 * hash3(k, 7, 1)), [0, 0, -0.9])), F.TUFT_L * (0.7 + 0.6 * hash3(k, 2, 8)), F.TUFT_W, k % 2 ? F.TIP : F.COLOR);
      }
      cap(F.Z, F.PAD, fcs, [w0[0] + fcs.cx, w0[1] + fcs.cy], rbLow);
    }
    const Bn = R.BONE;
    if (cuffCs) { // 骨牙護符：繞在皮護腕上的一圈皮繩＋上半圈幾顆往外翹的象牙白尖牙（從後上方的遊戲鏡頭看得到）
      const pad = B.GAP + 0.024, ra = cuffCs.ra + pad + B.R * Math.SQRT1_2 + Bn.CORD_R, rb = cuffCs.rb + pad * R.PAD_Y + B.R * Math.SQRT1_2 + Bn.CORD_R;
      const bc = [cuffC[0], cuffC[1] + CB.LIFT, Bn.Z];
      acc.ring(bc, zax, xax, up, ra, rb, Bn.CORD_R, Bn.CORD_R, Bn.CORD, 12, 3);
      for (const deg of Bn.ANG) {
        const th = (deg / 180) * Math.PI, ct = Math.cos(th), st = Math.sin(th), n = v3norm([ct / ra, st / rb, 0]);
        acc.spike(v3add([bc[0] + ra * ct, bc[1] + rb * st, Bn.Z], v3mul(n, Bn.CORD_R)), v3norm(v3add(n, [0, 0, -0.35])), Bn.L, Bn.W, Bn.COLOR);
      }
    }
    const Sc = R.SCAR, pts = [];
    for (let i = 0; i < Sc.N; i++) {
      const t = i / (Sc.N - 1), x = Sc.A[0] + (Sc.B[0] - Sc.A[0]) * t, z = Sc.A[1] + (Sc.B[1] - Sc.A[1]) * t, y = topAt(pos, base.index, x, z);
      if (y !== null) pts.push([x, y + Sc.LIFT, z]);
    }
    if (pts.length >= 2) {
      acc.strip(pts, Sc.W, Sc.COLOR);
      for (const i of [2, 4, 6]) if (pts[i]) acc.strip([[pts[i][0] - 0.07, pts[i][1] + 0.001, pts[i][2] - 0.012], [pts[i][0] + 0.07, pts[i][1] + 0.001, pts[i][2] + 0.012]], 0.012, Sc.COLOR);
    }
  }

  /* 配件頂點的蒙皮權重＝抄最近的原頂點（配件跟著它貼著的那段骨走）。 */
  const ne = acc.P.length / 3, m = n0 + ne;
  const position = new Float32Array(m * 3), normal = new Float32Array(m * 3), col = new Float32Array(m * 4);
  const skinIndex = new base.skinIndex.constructor(m * 4), skinWeight = new Float32Array(m * 4);
  position.set(pos); normal.set(base.normal); col.set(color); skinIndex.set(base.skinIndex); skinWeight.set(base.skinWeight);
  position.set(acc.P, n0 * 3); normal.set(acc.N, n0 * 3); col.set(acc.C, n0 * 4);
  const accAttr = new Float32Array(m * 3); accAttr.set(acc.A, n0 * 3); // v0.59.7：配件材質類別（原頂點＝0）
  for (let e = 0; e < ne; e++) {
    let best = 0, bd = Infinity;
    for (let v = 0; v < n0; v++) {
      const dx = pos[v * 3] - acc.P[e * 3], dy = pos[v * 3 + 1] - acc.P[e * 3 + 1], dz = pos[v * 3 + 2] - acc.P[e * 3 + 2], d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; best = v; }
    }
    for (let j = 0; j < 4; j++) { skinIndex[(n0 + e) * 4 + j] = base.skinIndex[best * 4 + j]; skinWeight[(n0 + e) * 4 + j] = base.skinWeight[best * 4 + j]; }
  }
  /* 繞序統一：每個配件三角形的面法線必須與頂點法線同向（材質單面、朝內會被剔掉或看到內壁）。 */
  for (let t = 0; t < acc.I.length; t += 3) {
    const [ia, ib, ic] = [acc.I[t], acc.I[t + 1], acc.I[t + 2]];
    const pa = [acc.P[ia * 3], acc.P[ia * 3 + 1], acc.P[ia * 3 + 2]];
    const f = v3cross(v3sub([acc.P[ib * 3], acc.P[ib * 3 + 1], acc.P[ib * 3 + 2]], pa), v3sub([acc.P[ic * 3], acc.P[ic * 3 + 1], acc.P[ic * 3 + 2]], pa));
    if (f[0] * acc.N[ia * 3] + f[1] * acc.N[ia * 3 + 1] + f[2] * acc.N[ia * 3 + 2] < 0) { acc.I[t + 1] = ic; acc.I[t + 2] = ib; }
  }
  const index = new base.index.constructor(base.index.length + acc.I.length);
  index.set(base.index); for (let i = 0; i < acc.I.length; i++) index[base.index.length + i] = acc.I[i] + n0;
  let recolored = 0;
  for (let v = 0; v < n0; v++) if (Math.abs(color[v * 4] - dressed[v * 4]) + Math.abs(color[v * 4 + 1] - dressed[v * 4 + 1]) + Math.abs(color[v * 4 + 2] - dressed[v * 4 + 2]) > 1e-4) recolored++;
  return { key, position, normal, color: col, skinIndex, skinWeight, index, baseCount: n0, extraVerts: ne, extraTris: acc.I.length / 3, recolored, accAttr };
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
export function floorAt(x, z, obstacles, tableY, pad = 0) {
  let f = tableY;
  for (const o of obstacles) {
    if (o.top <= f) continue;
    const inside = o.r !== undefined ? (x - o.x) * (x - o.x) + (z - o.z) * (z - o.z) <= (o.r + pad) * (o.r + pad)
      : Math.abs(x - o.x) <= o.hx + pad && Math.abs(z - o.z) <= o.hz + pad;
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

/* v0.59.7 修訂 5 效能：同一組取樣點（prepare 快取的同一份 pts）在同一 yaw／pitch／縮放下的旋轉結果只算一次——
   一幀裡為了避讓信物、伸入界線、俯角掃描會用同一姿勢反覆 placeAt，只差平移。快取的是同一個 xform 的輸出，數值逐位元相同。 */
const rotCache = new WeakMap(), setIds = new WeakMap(); let setN = 0;
function rotated(pts, set, yaw, pitch, s) {
  let sid = setIds.get(set); if (sid === undefined) { sid = ++setN; setIds.set(set, sid); }
  let m = rotCache.get(pts); if (!m) { m = new Map(); rotCache.set(pts, m); }
  const key = sid + '|' + yaw + '|' + pitch + '|' + s;
  let R = m.get(key);
  if (!R) {
    R = new Float64Array(set.length * 3);
    for (let i = 0; i < set.length; i++) { const v = set[i], w = xform([pts[v * 3], pts[v * 3 + 1], pts[v * 3 + 2]], yaw, pitch, s); R[i * 3] = w[0]; R[i * 3 + 1] = w[1]; R[i * 3 + 2] = w[2]; }
    if (m.size > 96) m.clear();
    m.set(key, R);
  }
  return R;
}
/** v0.61.0：旋轉結果（rotated 的 R，每 3 個一點）的外框與最低點；每個 R 只算一次。 */
const statCache = new WeakMap();
function rStat(R) {
  let st = statCache.get(R);
  if (!st) {
    const n = R.length / 3; let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y0 = Infinity;
    for (let i = 0; i < n; i++) { const x = R[i * 3], y = R[i * 3 + 1], z = R[i * 3 + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; if (y < y0) y0 = y; }
    st = { x0, x1, z0, z1, y0 }; statCache.set(R, st);
  }
  return st;
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
  /* v0.61.0 效能（條件 10）：外框與最低點改用旋轉結果的快取統計（rStat）。浮點加減對常數是單調的（捨入不改大小順序），
     所以 min(rx＋w)＝rx＋min(w)、max(c−y)＝c−min(y)，與逐點算逐位元相同；點的世界座標 rx＋R、rz＋R 要用時才算（同一個式子）。 */
  const R = rotated(pts, set, yaw, pitch, s), st = rStat(R), n = set.length;
  const x0 = rx + st.x0, x1 = rx + st.x1, z0 = rz + st.z0, z1 = rz + st.z1;
  /* rig.padH／rig.pad（世界單位，可省）：取樣點較稀時的保守外擴（障礙水平外擴 padH、垂直間隙多 pad）。
     預設 0＝舊行為逐位元相同；現行寫實手沒用（取全部頂點，見 table-hands），留給之後的效能卷。 */
  const pad = rig.padH || 0, clr = HAND.CLR + (rig.pad || 0); // 水平外擴 padH、垂直間隙 pad
  const hit = (o) => { const hx = (o.r !== undefined ? o.r : o.hx) + pad, hz = (o.r !== undefined ? o.r : o.hz) + pad;
    return o.top > tableY && o.x + hx >= x0 && o.x - hx <= x1 && o.z + hz >= z0 && o.z - hz <= z1; };
  /* 落地的東西（錢柱、落地令牌、木籌槽、布面）是地板；飛在空中的令牌（bottom 高於桌面）是懸空的盒子：
     手可以從它底下過，只有真的會撞上時才抬到它上面（第二輪：手不再跟著令牌舉高，四家同拍時別家的令牌會從手上方飛過）。 */
  const near = obstacles.filter((o) => !(o.bottom > tableY + 0.03) && hit(o));
  const air = obstacles.filter((o) => o.bottom > tableY + 0.03 && hit(o));
  const wp = new Array(n * 2);
  /* 效能（修訂 5）：地板高 fl 只在「可能改變答案」的點才算——先用桌面當地板得到 ry 的下界，
     某點就算站在最高障礙頂上也抬不過目前的 ry，就不必查它的地板（wp 的地板值改成要用時才算，見 flAt）。結果與逐點全算相同。 */
  let maxTop = tableY; for (const o of near) if (o.top > maxTop) maxTop = o.top;
  for (let i = 0; i < n; i++) { wp[i * 2] = R[i * 3 + 1]; wp[i * 2 + 1] = NaN; }
  { const need = tableY + clr - st.y0; if (need > ry) ry = need; }
  const flAt = (i) => { let f = wp[i * 2 + 1]; if (f !== f) { f = near.length ? floorAt(rx + R[i * 3], rz + R[i * 3 + 2], near, tableY, pad) : tableY; wp[i * 2 + 1] = f; } return f; };
  if (maxTop > tableY && maxTop + clr - st.y0 > ry) for (let i = 0; i < n; i++) { // 連最低點都抬不過 ry＝每點都會跳過（單調），整圈省掉
    if (maxTop + clr - R[i * 3 + 1] <= ry) continue;
    const need = flAt(i) + clr - R[i * 3 + 1];
    if (need > ry) ry = need;
  }
  for (let pass = 0; pass < 4 && air.length; pass++) {
    let lifted = false;
    for (let i = 0; i < n; i++) {
      const x = rx + R[i * 3], y = R[i * 3 + 1] + ry, z = rz + R[i * 3 + 2];
      for (const o of air) {
        if (y >= o.top + clr || y <= o.bottom - clr) continue;
        const inside = o.r !== undefined ? (x - o.x) * (x - o.x) + (z - o.z) * (z - o.z) <= (o.r + pad) * (o.r + pad) : Math.abs(x - o.x) <= o.hx + pad && Math.abs(z - o.z) <= o.hz + pad;
        if (!inside) continue;
        ry = o.top + clr - R[i * 3 + 1]; lifted = true;
        if (o.top > flAt(i)) wp[i * 2 + 1] = o.top;
      }
    }
    if (!lifted) break;
  }
  return { root: [rx, ry, rz], wp, flAt };
}
/** 某點集在已解的根高度下，離其地板的最小間隙。 */
function minGap(set, setIndexOf, wp, ry, flAt) {
  let g = Infinity;
  for (const v of set) { const i = setIndexOf.get(v); if (i === undefined) continue; const d = ry + wp[i * 2] - flAt(i); if (d < g) g = d; }
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
/** v0.60.0 抓取：不經俯角掃描／伸入界線，讓 anchorKind 錨點正好落在 at（x,y,z）。高度下限另由 grabLift 補。 */
export function posedFrame(rig, pose, anchorKind, at, yaw, pitch, scale) {
  const pr = prepare(rig, pose, anchorKind), a = xform(pr.anchor, yaw, pitch, scale);
  return { root: [at[0] - a[0], at[1] - a[1], at[2] - a[2]], yaw, pitch, quats: pr.quats, pose: pose.slice() };
}
/**
 * v0.60.0 抓取專用可達（只作用於 grab 類動作；推／拍／收／停一拍的 REACH 與擺位一個字都不動）：
 * 已擺好的抓取幀（posedFrame）只准**往上抬**，抬到下面四件事都成立的最小高度——
 *   ① 每個取樣點 ≥ 其下方地板＋CLR（桌面、錢柱、令牌、木籌槽、布面：與 placeAt 同一張地板表）；
 *   ② 每個取樣點落在「非被抓拍品」外接盒（boxes，水平外擴 GRAB_PAD）水平範圍內時，高於該盒頂＋GRAB_CLR（不穿別件拍品）；
 *      （cons.relics 可另給信物外接圓柱，同理；現行 grab 不給——手臂本來就從自己信物那側伸出來，抬過信物會讓受害者的手浮在半空）
 *   ③ 西／東席（seat 2／3）越過托盤中線 x=0 的點，除非落在被抓那件的水平外框（foot）內，否則高於 midTop＋CLR
 *      （越中線只准從拍品上方越過；foot＝手指扣住的那件本身）；
 *   ④ 被抓著的那件（carry：相對錨點 at 的外接盒）與任一非被抓拍品盒水平重疊時，盒底抬到該盒頂＋CLR 以上（搬運不穿別件）。
 * 回傳要抬的量（≥0）。決定性：固定順序的 max，無掃描、無亂數。
 */
const strideCache = new WeakMap();
/** v0.61.1 r3：取樣點每 k 個取 1 個（快取）。只給詛咒推按的「事前規劃」用（table-tray planStep；條件 9 效能）——
 *  規劃只決定高度包絡的形狀，每一幀真正擺手時 grabLift 仍用全部取樣點（sp.minLift 只往上墊），稀疏取樣少算的那一點由即時值補上，不會穿。 */
function strided(set, k) {
  let m = strideCache.get(set); if (!m) { m = new Map(); strideCache.set(set, m); }
  let a = m.get(k); if (!a) { a = set.filter((_, i) => i % k === 0); m.set(k, a); }
  return a;
}
export const GRAB_PAD = 0.02;
/** ②③④ 的垂直餘量：碰撞取樣（寫實手頂點＋袖管）之外，畫面上還有少數配件頂點（手環、珠串）沒進取樣，多留這麼多蓋過它們。 */
export const GRAB_CLR = 0.02;
export function grabLift(rig, fr, scale, cons, obstacles, tableY, seat) {
  const pr = prepare(rig, fr.pose, 'palm'), base = cons && cons.seenOnly && rig.seen ? rig.seen : allIndex(rig), set = cons && cons.stride > 1 ? strided(base, cons.stride) : base, R = rotated(pr.pts, set, fr.yaw, fr.pitch, scale); // v0.61.1 r2：詛咒推按只算看得見的部分（rig.seen：袖布漸隱到 alpha≈0.2 以前），漸隱掉的袖尾不把整隻手抬上半空
  const [rx, ry, rz] = fr.root, clr = HAND.CLR, pad = GRAB_PAD, oc = HAND.CLR + GRAB_CLR;
  const boxes = (cons && cons.boxes) || [], relics = (cons && cons.relics) || [], foot = cons && cons.foot;
  const mid = cons && cons.midTop !== undefined && (seat === 2 || seat === 3) ? cons.midTop : undefined;
  const floors = obstacles.filter((o) => !(o.bottom > tableY + 0.03) && o.top > tableY);
  let need = 0, why = null;
  for (let i = 0; i < set.length; i++) {
    const x = rx + R[i * 3], y = ry + R[i * 3 + 1], z = rz + R[i * 3 + 2];
    let lo = (floors.length ? floorAt(x, z, floors, tableY) : tableY) + clr, rule = 'floor';
    for (const b of boxes) if (x >= b.x0 - pad && x <= b.x1 + pad && z >= b.z0 - pad && z <= b.z1 + pad && b.top + oc > lo) { lo = b.top + oc; rule = 'box'; }
    for (const o of relics) if ((x - o.x) * (x - o.x) + (z - o.z) * (z - o.z) <= (o.r + pad) * (o.r + pad) && o.top + clr > lo) { lo = o.top + clr; rule = 'relic'; }
    if (mid !== undefined && (seat === 2 ? x > -pad : x < pad) && !(foot && x >= foot.x0 + pad && x <= foot.x1 - pad && z >= foot.z0 + pad && z <= foot.z1 - pad) && mid + oc > lo) { lo = mid + oc; rule = 'mid'; }
    if (lo - y > need) { need = lo - y; why = { rule, p: [x, y, z] }; }
  }
  const c = cons && cons.carry;
  if (c && cons.at) {
    const x0 = cons.at[0] + c.x0, x1 = cons.at[0] + c.x1, z0 = cons.at[2] + c.z0, z1 = cons.at[2] + c.z1, y0 = cons.at[1] + c.y0;
    for (const b of boxes) if (x1 >= b.x0 - pad && x0 <= b.x1 + pad && z1 >= b.z0 - pad && z0 <= b.z1 + pad && b.top + oc - y0 > need) { need = b.top + oc - y0; why = { rule: 'carry', p: [x0, y0, z0] }; }
  }
  grabLift.why = why; // 治具診斷用（只讀）：最近一次是哪一條規則、哪一點決定了抬升量
  return need;
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
/** 碰撞取樣的全部點（placeAt／grabLift 用）。rig.collide（可省，v0.61.0 批 1 由 table-hands 給）＝去掉「位置與蒙皮權重完全相同」的重複頂點後的代表點：
    兩處都是逐點取最大值（平手不換），重複點不改變答案，結果逐位元相同、只少算重複的點。沒給＝0..count−1（原樣）。 */
function allIndex(rig) {
  if (!allCache.has(rig)) { let a = rig.collide; if (!a) { a = new Array(rig.count); for (let i = 0; i < rig.count; i++) a[i] = i; } allCache.set(rig, a); }
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
    const tipGap = minGap(tipsC, ci, r.wp, r.root[1], r.flAt);
    const palmGap = minGap(palmC, ci, r.wp, r.root[1], r.flAt);
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
 * seatMul（可省）：seat → 該席手的角色縮放倍率（v0.59.7）；省略＝每席 1。
 */
export function createHandDirector(props, rig, per) {
  /* queue：第四輪排隊——同一席一次推多格時，還沒輪到的格（依出價先後）。同席仍只有一隻手、一個動作槽。 */
  const hands = [0, 1, 2, 3].map((seat) => ({ seat, act: null, last: null, queue: [] }));
  /* v0.59.7 中等寫實：每席可有自己的縮放倍率（per.mul）與碰撞取樣骨架（per.rig＝該席寫實幾何的頂點，見 hand-realism.js）；
     沒給＝1 與共用 rig。擺位解算用的是畫面上那一隻手的尺寸與頂點，所以縮小、變粗變細後照樣貼桌、不穿錢與令牌。 */
  const scaleNow = (seat) => HAND.SCALE * (per && per.mul ? per.mul(seat) : 1) * (props.mode() === 'P' ? HAND.SCALE_P : 1);
  const rigOf = (seat) => (per && per.rig && per.rig(seat)) || rig;
  const slamSpread = (per && per.slamPose) || 'spread'; // v0.61.0 拍令牌拇指收角（table-hands 給 'spreadT'）
  const rigId = new WeakMap(); let rigN = 0;
  const idOf = (R) => { let k = rigId.get(R); if (k === undefined) { k = ++rigN; rigId.set(R, k); } return k; };
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
  /** 某席的伸入界線：n·(x,z) ≤ c（null＝不限）。 */
  /** 某席的伸入界線（可多條）：每條 n·(x,z) ≤ c。 */
  function limitOf(seat, T) {
    const tz = props.trayZ(), front = { n: [0, -1], c: -(tz + T.hd - HAND.REACH.SOUTH_IN) };
    /* 南席：指尖不伸進托盤前緣以內 SOUTH_IN 以上——手指伸過去就擋在拍品腳前（量測）。 */
    if (seat === 0) return [front];
    if (seat === 1) return [{ n: [0, 1], c: tz - T.hd + HAND.REACH.NORTH_IN }];
    /* 西／東：不越過托盤中線，也不伸進托盤前緣以內（量測：伸進去就擋在最左／最右那格拍品的腳前）。 */
    if (seat === 2) return [{ n: [1, 0], c: -HAND.REACH.MID }, front];
    if (seat === 3) return [{ n: [-1, 0], c: -HAND.REACH.MID }, front];
    return [];
  }
  /** 障礙表的簡短指紋（記憶化用；同一幀內位置沒變＝同一組指紋）。 */
  function obsSig(list) { let x = 0; for (let i = 0; i < list.length; i++) { const o = list[i]; x += (i + 1) * (o.x * 3.1 + o.z * 7.7 + o.top * 13.3 + (o.r || o.hx || 0) * 17.9); } return list.length + ':' + x.toFixed(9); }
  /* 效能（第三輪）：同一姿勢／朝向／俯角的「相對根的世界偏移」只算一次（逐點 xform 是主要成本），
     平移（側移、退回）只是加常數，不必重算。 */
  const offCache = new Map();
  function offsets(R, fr, s) {
    const w = Math.round(clamp01(fr.pose[2]) * 32) / 32;
    const key = idOf(R) + '|' + fr.pose[0] + '|' + fr.pose[1] + '|' + w + '|' + fr.yaw + '|' + fr.pitch + '|' + s;
    let o = offCache.get(key);
    if (!o) {
      const pts = prepare(R, fr.pose, 'palm').pts, n = R.seen.length, W = new Float64Array(n * 3);
      for (let i = 0; i < n; i++) { const v = R.seen[i], q = xform([pts[v * 3], pts[v * 3 + 1], pts[v * 3 + 2]], fr.yaw, fr.pitch, s); W[i * 3] = q[0]; W[i * 3 + 1] = q[1]; W[i * 3 + 2] = q[2]; }
      o = { W, ext: new Map() };
      if (offCache.size > 256) offCache.clear();
      offCache.set(key, o);
    }
    return o;
  }
  /** 看得見的部分（rig.seen：袖布漸隱過半以前）有沒有落進任一信物外接圓柱、且低於其頂（回撞到的那一件或 null）。 */
  function relicHit(R, fr, s, relics) {
    const off = offsets(R, fr, s), W = off.W, n = W.length / 3, [rx, ry, rz] = fr.root;
    const b = off.box || (off.box = rStat(W)); // 外框與最低點（同 placeAt 的單調性論證：整件剔除只略過「不可能有點落進去」的信物）
    for (const o of relics) {
      const rr = (o.r + HAND.RELIC.MARGIN) * (o.r + HAND.RELIC.MARGIN), top = o.top + HAND.CLR;
      if (ry + b.y0 >= top) continue;
      { const gx = Math.max(0, (rx + b.x0) - o.x, o.x - (rx + b.x1)), gz = Math.max(0, (rz + b.z0) - o.z, o.z - (rz + b.z1)); if (gx * gx + gz * gz >= rr) continue; }
      for (let i = 0; i < n; i++) {
        if (ry + W[i * 3 + 1] >= top) continue;
        const dx = rx + W[i * 3] - o.x, dz = rz + W[i * 3 + 2] - o.z;
        if (dx * dx + dz * dz < rr) return o;
      }
    }
    return null;
  }
  /** 這一幀看得見的部分（袖口邊以前）越線最多的那一條與越線量（over≤0＝沒越）。 */
  function reach(R, seat, fr, s, T) {
    const Ls = limitOf(seat, T); if (!Ls.length) return { over: 0, L: null };
    const o = offsets(R, fr, s);
    let best = { over: -Infinity, L: null };
    for (const L of Ls) {
      /* max over 點 of n·(root＋w) ＝ n·root ＋ max(n·w)；後者每個姿勢／朝向只算一次 */
      const k = L.n[0] + ',' + L.n[1];
      let mw = o.ext.get(k);
      if (mw === undefined) { mw = -Infinity; const W = o.W; for (const i of frontIdx(R)) { const d = L.n[0] * W[i * 3] + L.n[1] * W[i * 3 + 2]; if (d > mw) mw = d; } o.ext.set(k, mw); }
      const m = L.n[0] * fr.root[0] + L.n[1] * fr.root[2] + mw - L.c;
      if (m > best.over) best = { over: m, L };
    }
    return best;
  }
  /** rig.front 在 rig.seen 裡的索引（front ⊂ seen）。 */
  const frontIdxCache = new WeakMap();
  function frontIdx(R) {
    if (!frontIdxCache.has(R)) { const pos = new Map(R.seen.map((v, i) => [v, i])); frontIdxCache.set(R, R.front.map((v) => pos.get(v))); }
    return frontIdxCache.get(R);
  }
  /** 進場方向（第二輪）：西／東席改從側面水平伸進來（SIDE_YAW），不從拍品正前方往裡推——量測顯示西／東手從前方推時，
   *  指節與腕部剛好擋在左右兩格拍品的腳前。南／北仍朝目標。 */
  function yawOf(seat, seatP, a) {
    if (HAND.SIDE_YAW && seat === 2) return Math.PI / 2;
    if (HAND.SIDE_YAW && seat === 3) return -Math.PI / 2;
    return yawToward(seatP.x, seatP.z, a.tx, a.tz);
  }
  function specOf(h, obstacles) {
    const a = h.act; if (!a) return null;
    const seatP = props.seatPosition(h.seat);
    if (a.kind === 'retract') return retractFrame(h, a, a.t / HAND.RETRACT_MS);
    if (a.kind === 'push') {
      const st = props.stackAt(h.seat, a.slot);
      if (!st) return null;
      /* 第二輪：用指尖抵住錢柱靠席位那側往前推（原本是掌根壓在錢柱頂，手指就伸到拍品腳邊、擋住拍品）。 */
      const yaw = yawOf(h.seat, seatP, a), dx = Math.sin(yaw), dz = Math.cos(yaw), off = st.r + HAND.PUSH_GAP;
      let target = [st.x - dx * off, st.z - dz * off];
      /* 排隊的後格：等候間隔內從上一格的結束位置移到這一格錢柱後方（位置每幀重新抓這一格的錢柱）。 */
      if (a.from && a.t < a.rep) { const k = smooth(clamp01(a.t / a.rep)); target = [a.from[0] + (target[0] - a.from[0]) * k, a.from[1] + (target[1] - a.from[1]) * k]; }
      return { pose: a.pose || 'curl', anchor: 'front', target, yaw,
        fit: a.pitch === undefined ? { target: [st.tx - dx * off, st.tz - dz * off], obstacles: moved(obstacles, st.x, st.z, st.tx, st.tz) } : undefined };
    }
    if (a.kind === 'slam') {
      const tk = props.tokenAt(h.seat);
      if (!tk) return null;
      const landed = tk.t >= 1;
      const after = landed ? a.sinceLand : 0;
      /* 第二輪：手不再舉著令牌飛過拍品前方——令牌照舊自己舉高拍下（落地那一幀仍由令牌發 ys:mark-slam），
         手壓低、跟在令牌靠席位那側的桌面上；令牌落地後 SLAP_MS 內掌心蓋上去，再微顫、收。 */
      /* 第二輪：令牌飛行時手不上場（飛行路徑會經過拍品前方）；落地那一幀起從席位那側伸進來，SLAP_MS 內掌心蓋上去。 */
      if (!landed) return { hidden: true };
      const k = smooth(clamp01(after / HAND.SLAM.SLAP_MS));
      const pose = ['push', slamSpread, k]; // v0.61.0：拍令牌的張開手（per.slamPose＝'spreadT' 拇指收角；沒給＝原 spread）
      const Rg = rigOf(h.seat), fa = prepare(Rg, pose, 'front').anchor, pa = prepare(Rg, pose, 'palm').anchor;
      const yaw = yawOf(h.seat, seatP, a), dx = Math.sin(yaw), dz = Math.cos(yaw);
      const back = (1 - k) * ((fa[2] - pa[2]) * scaleNow(h.seat) + HAND.SLAM.TRAIL + HAND.SLAM.APPROACH);
      const ta = after - HAND.SLAM.SLAP_MS;
      const trem = landed && ta > 0 && ta < HAND.SLAM.TREMBLE_MS ? Math.abs(Math.sin(ta / HAND.SLAM.TREMBLE_MS * Math.PI * 3)) * HAND.SLAM.TREMBLE_AMP * (1 - ta / HAND.SLAM.TREMBLE_MS) : 0;
      return { pose, anchor: 'palm', target: [tk.x - dx * back, tk.z - dz * back], yaw, lift: trem,
        fit: a.pitch === undefined ? { target: [tk.tx, tk.tz], pose: ['push', slamSpread, 1], obstacles: moved(obstacles, tk.x, tk.z, tk.tx, tk.tz, tk.landTop) } : undefined };
    }
    if (a.kind === 'rake') {
      const st = props.stackAt(h.seat, a.slot);
      if (!st) return null;
      const yaw = yawOf(h.seat, seatP, a), dx = Math.sin(yaw), dz = Math.cos(yaw);
      const off = st.r + HAND.RAKE_GAP;
      /* 指尖團落在錢柱「遠離席位」那一側（扒住後緣往回拖）；延遲那段從靠席位那側伸過去。 */
      const k = smooth(clamp01(a.t / HAND.RAKE.DELAY)), back = (1 - k) * HAND.RAKE.REACH_FROM;
      /* lead＝遠側搆不到（北／西／東席伸入深度限制）：指尖團落在錢柱靠席位那側，領著錢回來。 */
      const along = a.lead ? -(off + back) : off - back;
      return { pose: ['spread', 'rake', k], anchor: 'tips', target: [st.x + dx * along, st.z + dz * along], yaw };
    }
    if (a.kind === 'hold') {
      const st = props.stackAt(h.seat, a.slot);
      if (!st) return null;
      const yaw = yawOf(h.seat, seatP, a), dx = Math.sin(yaw), dz = Math.cos(yaw);
      const k = smooth(clamp01(a.t / HAND.HOLD.REACH_MS));
      const off = st.r + HAND.HOLD.GAP + (1 - k) * 0.25;
      return { pose: ['push', 'spread', k], anchor: 'front', target: [st.x - dx * off, st.z - dz * off], yaw };
    }
    return null;
  }

  /** v0.60.0 抓取類（grab）這一幀：腳本給的錨點擺位（posedFrame），再以 grabLift 只往上抬到合法高度。抬的量記在 h.lift（tray 讓被抓的法寶跟著抬）。 */
  function grabFrame(h, s, R0, obstacles, tableY) {
    const sp = h.act.spec, anchor = sp.anchor || 'palm';
    const fr = posedFrame(R0, sp.pose, anchor, sp.at, sp.yaw, sp.pitch, s);
    const cons = Object.assign({}, sp.cons || {}, { at: sp.at });
    const lift = Math.max(grabLift(R0, fr, s, cons, obstacles, tableY, h.seat), sp.minLift || 0); // v0.61.1：minLift＝table-tray 預算的抬升包絡（詛咒推按；只會更高＝不穿，不瞬跳）
    fr.root[1] += lift; h.lift = lift; h.liftWhy = grabLift.why;
    h.last = { frame: fr, spec: { anchor, target: [sp.at[0], sp.at[2]], pose: fr.pose } };
    return fr;
  }
  /** 一格推完：佇列裡還有就直接接下一格（從上一格的結束位置在等候間隔內移過去，重新抓這一格的錢柱位置），否則回 false。 */
  function nextQueued(h, from) {
    while (h.queue.length) {
      const k = h.queue.shift(), st = props.stackAt(h.seat, k);
      if (!st) continue;
      start(h.seat, { kind: 'push', slot: k, tx: st.tx, tz: st.tz, from, rep: Math.max(st.wait, 1e-3) });
      return true;
    }
    return false;
  }
  /** 動作做完：推且佇列還有 ⇒ 接下一格；否則收手。 */
  function finishAct(h) {
    if (h.act && h.act.kind === 'push' && nextQueued(h, h.last ? h.last.spec.target : null)) return;
    if (h.last) beginRetract(h); else stop(h.seat);
  }
  function beginRetract(h) {
    const { frame, spec } = h.last;
    const pace = h.act && h.act.kind === 'push' ? HAND.PACE : undefined; // 只有擺錢（推）之後的收手放慢；揭盅後的收手照舊
    h.act = { kind: 'retract', t: 0, pace, from: { yaw: frame.yaw, pitch: frame.pitch, pose: frame.pose.slice(), anchor: spec.anchor, ax: spec.target[0], az: spec.target[1], y: frame.root[1] } };
  }

  const api = {
    /** 出價：amount>0＝推；amount≤0＝那一席那一格的錢收回——手若正對著那一格，立即收（熱座清場）。 */
    bid(seat, slot, amount) {
      const s = seat | 0, k = slot | 0; if (!(s >= 0 && s < 4)) return;
      const h = hands[s];
      h.queue = h.queue.filter((x) => x !== k); // 同格重複出價＝覆寫：排隊裡的舊那一筆拿掉
      if (!((amount | 0) > 0)) { const a = h.act; if (a && a.slot === k) { stop(s); nextQueued(h, null); } return; }
      const st = props.stackAt(s, k); if (!st) return;
      /* 排隊（第四輪方案甲）：這一席的手正在推別格、而這一格的錢被 props 排在後面等 ⇒ 進佇列，輪到再推。 */
      const a = h.act;
      if (a && a.kind === 'push' && a.slot !== k && st.wait > 0) { h.queue.push(k); return; }
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
        if (hands[s].act && hands[s].act.kind === 'grab') continue; // v0.60.0：正在抓取／詛咒演出的那一席不被扒回／停一拍蓋掉
        if (s === w) start(s, { kind: 'hold', slot: k, tx: st.x, tz: st.z });
        else if (st.returning) start(s, { kind: 'rake', slot: k, tx: st.x, tz: st.z });
      }
    },
    /** v0.60.0 抓取類動作：spec＝{ pose:[a,b,w], anchor?, at:[x,y,z], yaw, pitch, cons? }（每幀由 table-tray 的抓取腳本給），null＝這一席的抓取結束（不可見）。
     *  只有 grab 類用這條路；推／拍／收／停一拍照舊走 bid／mark／reveal。 */
    grab(seat, spec) {
      const s = seat | 0; if (!(s >= 0 && s < 4)) return;
      const h = hands[s];
      if (!spec) { if (h.act && h.act.kind === 'grab') stop(s); h.lift = 0; return; }
      if (h.act && h.act.kind === 'grab') h.act.spec = spec;
      else { h.queue.length = 0; start(s, { kind: 'grab', spec }); h.lift = 0; }
    },
    /** 這一席最近一幀抓取擺位被抬了多少（世界單位；非抓取＝0）。 */
    liftOf(seat) { const h = hands[seat | 0]; return h && h.act && h.act.kind === 'grab' ? h.lift || 0 : 0; },
    /** 治具出口（只讀）：這一席最近一幀抓取抬升由哪條規則決定（floor／box／mid／carry）。 */
    liftWhy(seat) { const h = hands[seat | 0]; return h && h.act && h.act.kind === 'grab' ? h.liftWhy || null : null; },
    /** v0.61.1：不改任何狀態，只算「這一席照 spec 擺，抓取專用可達要抬多少」（與 grabFrame 同口徑、同一組障礙；table-tray 開演時預算詛咒推按的抬升包絡用）。 */
    grabLiftFor(seat, spec) {
      const s = seat | 0, tableY = props.tableY(), T = HAND.TRAY[props.mode()] || HAND.TRAY.L, R0 = rigOf(s), sc = scaleNow(s);
      const obstacles = props.handObstacles().concat([{ x: 0, z: props.trayZ(), hx: T.hw, hz: T.hd + 0.035, top: tableY + HAND.TRAY.CLOTH_TOP }]);
      const fr = posedFrame(R0, spec.pose, spec.anchor || 'palm', spec.at, spec.yaw, spec.pitch, sc);
      const why = grabLift.why, v = grabLift(R0, fr, sc, Object.assign({}, spec.cons || {}, { at: spec.at }), obstacles, tableY, s);
      grabLift.why = why; return v;
    },
    /** 換一夜／熱座清場：四隻手立即收（不可見）。 */
    clear() { for (let s = 0; s < 4; s++) { stop(s); hands[s].queue.length = 0; } },
    /** 跳過：直接到結束姿態＝四隻手全收。 */
    finish() { for (let s = 0; s < 4; s++) { stop(s); hands[s].queue.length = 0; } },
    update(dt) {
      for (const h of hands) {
        const a = h.act; if (!a) continue;
        a.t += a.pace ? dt / a.pace : dt; // 推完後的收手 pace＝HAND.PACE（時間軸拉長；其餘動作 undefined＝原速）
        if (a.kind === 'slam') { const tk = props.tokenAt(h.seat); if (tk && tk.t >= 1) a.sinceLand += dt; }
      }
    },
    /** 這一幀四隻手的擺位（null＝不可見）。動作做完自動切到收手、收完歸零（閒置＝不可見＝收在畫面外）。 */
    frames() {
      const tableY = props.tableY(), T = HAND.TRAY[props.mode()] || HAND.TRAY.L;
      /* 托盤布面當一塊低地板：布有皺褶起伏（±0.01），手指在布上多留 CLOTH_TOP。 */
      const obstacles = props.handObstacles().concat([{ x: 0, z: props.trayZ(), hx: T.hw, hz: T.hd + 0.035, top: tableY + HAND.TRAY.CLOTH_TOP }]);
      return hands.map((h) => { const s = scaleNow(h.seat), R0 = rigOf(h.seat);
        if (!h.act) return null;
        if (h.act.kind === 'grab') return grabFrame(h, s, R0, obstacles, tableY); // v0.60.0 抓取類：腳本擺位＋抓取專用可達（不走下面的 REACH／俯角掃描）
        let spec = specOf(h, obstacles);
        if (spec && spec.hidden) return null; // 還沒輪到手上場（拍：令牌飛行中）
        if (!spec) {
          /* 目標消失（錢被收走、令牌被清）：有上一幀就從那裡收手，沒有就直接不可見。 */
          if (h.act.kind !== 'retract' && h.last) { beginRetract(h); spec = specOf(h, obstacles); } else { stop(h.seat); return null; }
        }
        const a = h.act;
        if (a.kind === 'retract' && a.t >= HAND.RETRACT_MS) { stop(h.seat); return null; }
        /* 俯角每個動作只掃一次（動作開始那一幀），之後固定——掃描成本不進每幀，手也不會一路點頭。 */
        const req = { scale: s, pose: spec.pose, anchor: spec.anchor, target: spec.target, yaw: spec.yaw, minY: spec.minY, fit: spec.fit,
          pitch: a.kind === 'retract' ? spec.pitch : a.pitch };
        const obs = obstacles;
        const wasCurl = spec.pose === 'curl'; // 下面修正後 spec.pose 會換成實際姿勢，要先記住（否則每幀重掃捲指）
        const relics = props.relicObstacles ? props.relicObstacles() : [];
        /* 效能（第三輪診斷）：同一隻手這一幀的輸入（目標、姿勢、俯角、障礙與信物）跟上一幀完全一樣就直接重用上一幀的解——
           凍結或錢已落定時每幀 0 次解算。 */
        const memoKey = JSON.stringify([req.target, req.pose, req.yaw, req.pitch, req.minY, spec.lift || 0, a.kind, a.lead, obsSig(obs), obsSig(relics)]);
        if (h.memo && h.memo.key === memoKey) {
          const m = h.memo;
          if (!m.fr) { if (a.kind === 'retract') stop(h.seat); else if (done(h)) finishAct(h); return null; }
          spec = m.spec; h.last = { frame: m.fr, spec };
          if (done(h)) finishAct(h);
          return m.fr;
        }
        const valid = (f) => reach(R0, h.seat, f, s, T).over <= 1e-3 && !(relics.length && relicHit(R0, f, s, relics));
        let fr = solveHand(R0, req, obs, tableY);
        /* 先試上一幀用過的修正量（並讓它每幀縮一點，需要的修正變小時手會平順地回到原路），可行就不必整套重算。 */
        if (!valid(fr) && a.corr && !(a.kind === 'rake' && a.lead === undefined)) {
          const base = req.target.slice();
          for (const k of [0.85, 1]) {
            const t2 = [base[0] + a.corr[0] * k, base[1] + a.corr[1] * k];
            const f2 = solveHand(R0, Object.assign({}, req, { target: t2, pitch: fr.pitch, pose: fr.pose, fit: undefined }), obs, tableY);
            if (valid(f2)) { fr = f2; req.target = t2; break; }
          }
        }
        /* 伸入深度（第二輪）：看得見的部分越線就沿進場方向退回，錢（若還在滑）自己走完剩下的路；終點不變。 */
        const desired = spec.target;
        let R = reach(R0, h.seat, fr, s, T);
        if (R.over > 0 && a.kind === 'rake' && a.lead === undefined) {
          /* 收：錢柱遠側搆不到 ⇒ 這一整個動作改「從靠席位那側領著錢回來」，不越過錢柱頂、不跳位。 */
          a.lead = true; spec = specOf(h, obstacles); Object.assign(req, { target: spec.target, pose: spec.pose });
          fr = solveHand(R0, req, obs, tableY); R = reach(R0, h.seat, fr, s, T);
        }
        if (a.kind === 'rake' && a.lead === undefined) a.lead = false;
        for (let i = 0; i < 6 && R.over > 1e-4; i++) {
          const dx = Math.sin(fr.yaw), dz = Math.cos(fr.yaw), nd = R.L.n[0] * dx + R.L.n[1] * dz;
          /* 沿進場方向退；若這條線跟進場方向幾乎平行（退不開），改沿線的法向直接推回線內。 */
          const mx = nd >= 0.2 ? dx * R.over / nd : R.L.n[0] * R.over, mz = nd >= 0.2 ? dz * R.over / nd : R.L.n[1] * R.over;
          req.target = [req.target[0] - mx, req.target[1] - mz];
          req.pitch = fr.pitch; req.pose = fr.pose; req.fit = undefined;
          fr = solveHand(R0, req, obs, tableY); R = reach(R0, h.seat, fr, s, T);
        }
        /* 第三輪：信物避讓。看得見的部分（含漸隱前半段）若落進任一席信物的外接圓柱（低於其頂），
           沿進場方向的垂直方向把入場錨點側移；只改手的位置，錢的出發點／終點不變。找不到可行側移，這一幀手不畫。 */
        let rh = relics.length ? relicHit(R0, fr, s, relics) : null;
        if (rh) {
          const dx = Math.sin(fr.yaw), dz = Math.cos(fr.yaw), px = dz, pz = -dx;
          const side = Math.sign(px * (req.target[0] - rh.x) + pz * (req.target[1] - rh.z)) || 1;
          const base = req.target.slice();
          let ok = null;
          /* 效能（第三輪診斷：每步都重解整隻手，四手近信物時每幀數十次解算，速度比掉到 .07）：
             先只平移已解好的這一幀找最小可行側移（不重解，只做點對圓柱判定），找到才重解一次並複驗。 */
          const shifted = (dxz) => ({ root: [fr.root[0] + dxz[0], fr.root[1], fr.root[2] + dxz[1]], yaw: fr.yaw, pitch: fr.pitch, pose: fr.pose });
          for (let k = 1; k <= HAND.RELIC.STEPS && !ok; k++) {
            for (const sg of [side, -side]) {
              const d = [sg * px * k * HAND.RELIC.STEP, sg * pz * k * HAND.RELIC.STEP];
              if (relicHit(R0, shifted(d), s, relics) || reach(R0, h.seat, shifted(d), s, T).over > 1e-3) continue;
              const t2 = [base[0] + d[0], base[1] + d[1]];
              /* 重解時根高度不低於平移試算的那一幀（高一點只會更離信物遠），所以平移試算可行＝重解後也可行，一次就好。 */
              const f2 = solveHand(R0, Object.assign({}, req, { target: t2, pitch: fr.pitch, pose: fr.pose, fit: undefined, minY: Math.max(req.minY === undefined ? -Infinity : req.minY, fr.root[1]) }), obs, tableY);
              if (!relicHit(R0, f2, s, relics) && reach(R0, h.seat, f2, s, T).over <= 1e-3) { ok = f2; req.target = t2; break; }
            }
          }
          if (!ok) {
            /* 這一幀不畫，但動作照常結算：做完就收（被擋住的收手直接結束），不然會卡在不可見的動作裡。 */
            if (a.kind !== 'retract' && a.pitch === undefined) { a.pitch = fr.pitch; if (wasCurl) a.pose = fr.pose; } // 被擋的幀也定下俯角與捲指，不再每幀重掃
            h.memo = { key: memoKey, fr: null };
            if (a.kind === 'retract') stop(h.seat); else if (done(h)) finishAct(h);
            return null;
          }
          fr = ok;
        }
        a.corr = [req.target[0] - desired[0], req.target[1] - desired[1]];
        if (req.target !== spec.target) spec = Object.assign({}, spec, { target: req.target, pose: fr.pose });
        if (spec.lift) fr.root[1] += spec.lift; // 只往上加（微顫），不會往下穿
        if (a.kind !== 'retract' && a.pitch === undefined) { a.pitch = fr.pitch; if (wasCurl) a.pose = fr.pose; }
        h.last = { frame: fr, spec };
        h.memo = { key: memoKey, fr, spec };
        if (done(h)) finishAct(h);
        return fr;
      });
    },
    /** 治具／測試出口（只讀）：每席目前的動作名與進度。 */
    state() { return hands.map((h) => (h.act ? { kind: h.act.kind, slot: h.act.slot === undefined ? -1 : h.act.slot, t: +h.act.t.toFixed(6) } : null)); },
  };

  function done(h) {
    const a = h.act;
    /* 推：這一格的錢落定才算完（第一格＝原速 0.42 秒；排隊的後格各自較短）。 */
    if (a.kind === 'push') { const st = props.stackAt(h.seat, a.slot); return !st || (st.t >= 1 && !(st.wait > 0) && a.t > 0); }
    if (a.kind === 'slam') return a.sinceLand >= HAND.SLAM.SLAP_MS + HAND.SLAM.TREMBLE_MS + HAND.SLAM.HOLD_MS;
    if (a.kind === 'rake') { const st = props.stackAt(h.seat, a.slot); return !st || st.gone || a.t >= HAND.RAKE.DELAY + HAND.RAKE.BACK_MS; }
    if (a.kind === 'hold') return a.t >= HAND.HOLD.REACH_MS + HAND.HOLD.STAY_MS;
    return false;
  }
  return api;
}


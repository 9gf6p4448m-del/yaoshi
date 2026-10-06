// 妖市 3D 環境層 — 得標「手抓回」與詛咒轉移「推過去按住＋紙錢繩纏腕」的時間軸（v0.60.0，純函式，無 three.js 依賴，node 可測）
//
// 驗收：docs/experiments/2026-10-05-grab-hands/acceptance.md（D1–D7、條件 1–13）。
// 本檔只回答「第 t 秒，各席手的掌心錨點在哪、什麼姿勢；法寶在哪、怎麼歪；繩在哪一段」。
//   - table-tray.js 每幀問 at(t)，手的部分交給 hands.grab(seat, spec)（hand-motion 的 grab 類＋抓取專用可達），
//     法寶的部分寫進 3D 節點（被抓著時加上該手被可達抬起的量）。
//   - 不讀寫賽局狀態、不耗亂數：掙扎與顫抖是固定相位的正弦組合，同一事件每次都一樣（D6）。
//   - 時長全部由 GRAB_MS（index.html 的 CFG.GRAB_MS，經 ys:reveal-result 的 grabMs 帶進來）等比推得（D3）。

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const easeOut = (t) => { t = clamp01(t); return 1 - (1 - t) * (1 - t); };
const easeIn = (t) => { t = clamp01(t); return t * t; };
const lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const seg = (t, t0, t1) => clamp01((t - t0) / (t1 - t0));
const norm2 = (x, z) => { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; };

/** 調校常數（全部【試玩必調】）。時間軸以 MS_REF＝1260 毫秒寫成，實際時長＝GRAB_MS，各段等比縮放。 */
export const GRAB = {
  MS_REF: 1260,
  /* 一般得標（秒，GRAB_MS＝1260 時）：伸到側緣上方 → 下爪扣住 → 抓起（掙扎）→ 拿回途中 → 放下（落定＝GRAB_MS）
     → 鬆手 → 收手（沿進場方向退、抬高，同 HAND.RETRACT）→ 法寶在席前停 HOLD_S（D1）後隱藏。 */
  T: { reach: 0.34, grip: 0.46, lift: 0.80, carry: 1.10, land: 1.26, release: 1.36, gone: 1.66 },
  HOLD_S: 0.5, // D1：落席位後停這麼久再隱藏（不隨 GRAB_MS 縮放）
  /* 兩種扣法（D2：抓點取法寶側緣、手從席位側斜伸）：
     side＝預設：掌心貼在拍品靠席位那面的腰身（高 SIDE_H×身高），俯角 SIDE_PITCH，手臂低低地從自己席位那側伸來（不從天上伸下來）；
     top ＝西／東席抓越過托盤中線的那件（驗收 #5：越中線只准從拍品上方越過）：掌心扣在靠席位那側的上緣、手臂高過拍品頂。 */
  PITCH: 0.40, // top 扣法的俯角（仍不俯到 0.62）
  SIDE_PITCH: -0.20, // 指尖略朝上：手臂從低處（自己席位那側的桌緣）往上伸到拍品肩頸，不從天上伸下來
  SIDE_H: 0.78, // 扣在肩頸高度：手的剪影落在拍品上半身與背景交界，盲讀 r1 扣腰身時手被身體吃掉
  EDGE: 0.55, // top：掌心錨點自中心往席位退「外框沿進場方向半寬×EDGE」
  SIDE_EDGE: 0.60, // side：掌心錨點自中心往席位退「半寬×SIDE_EDGE＋SIDE_GAP」——手掌留在拍品前面看得見，手指扣進身側
  SIDE_GAP: 0.08,
  GRIP_Y: 0.012, // top：掌心錨點離拍品頂多高（手指往下扣住上緣）
  HOVER: 0.10, // 下爪前在扣點上方多高
  APPROACH: 0.75, // 從扣點沿進場方向往回多遠開始伸進來
  APPROACH_Y: 0.22,
  LIFT: 0.32, // 抓起多高（盲讀 r1：抓起的位移要看得出來）
  ARC: 0.08, // 拿回途中的弧高
  ABOVE: 0.16, // 放下前在終點上方多高
  DEST_K: 0.25, // 放下點：席位 → 拍品方向走這麼多（0＝與舊拋物線同一終點＝席位；往桌心拉一點，不壓在信物上）
  RETRACT_DIST: 1.0, RETRACT_LIFT: 0.12, // 收手：同 HAND.RETRACT_DIST／RETRACT_LIFT
  STRUGGLE_LAT: 0.15, // 掙扎時法寶側向位移＝−rz×此值（世界單位／弧度）
};

/** 掙扎：u∈[0,1] 的節制小幅晃動，兩次「想掙脫」的抽動（高斯包絡）＋細顫；回 { rx, rz, ry, lat, dy }。 */
export function struggle(u, amp = 1) {
  if (u <= 0 || u >= 1) return { rx: 0, rz: 0, ry: 0, lat: 0, dy: 0 };
  const env = Math.sin(Math.PI * u);
  const bump = (c, w) => Math.exp(-((u - c) * (u - c)) / (2 * w * w));
  const j1 = bump(0.28, 0.08), j2 = bump(0.66, 0.07);
  const fine = Math.sin(u * 2 * Math.PI * 9.0) * 0.022 * env;
  const rz = (0.16 * j1 * Math.sin(u * 2 * Math.PI * 4.2) - 0.14 * j2 * Math.sin(u * 2 * Math.PI * 5.1 + 0.8) + fine) * amp;
  const rx = (0.07 * j1 * Math.cos(u * 2 * Math.PI * 3.6) + 0.08 * j2 * Math.sin(u * 2 * Math.PI * 4.7) + fine * 0.6) * amp;
  const ry = (0.10 * j2 * Math.sin(u * 2 * Math.PI * 3.1)) * amp;
  return { rx, rz, ry, lat: -rz * GRAB.STRUGGLE_LAT, dy: (j1 + j2) * 0.01 * amp };
}
/** 被按住的手顫抖：細、快、只往上不往下（不穿桌）。 */
export function tremble(t, t0, t1, amp = 0.008) {
  if (t <= t0 || t >= t1) return [0, 0, 0];
  const u = (t - t0) / (t1 - t0), e = Math.sqrt(Math.sin(Math.PI * u));
  return [Math.sin(t * 2 * Math.PI * 17) * amp * e, Math.abs(Math.sin(t * 2 * Math.PI * 13)) * amp * 0.8 * e, Math.sin(t * 2 * Math.PI * 11 + 1) * amp * 0.6 * e];
}

/** 外接盒（世界，{x0,x1,y0,y1,z0,z1}）沿水平方向 (dx,dz) 的半寬。 */
const halfAlong = (b, dx, dz) => Math.abs(dx) * (b.x1 - b.x0) / 2 + Math.abs(dz) * (b.z1 - b.z0) / 2;

/**
 * 一般得標。
 * @param o { seat:{x,z}（得標席）, from:{x,y,z}（法寶節點原點）, box（法寶靜止時的世界外接盒）, tableY, ms（GRAB_MS） }
 * @returns { kind:'award', landAt, hideAt, end, dest, at(t) }
 *   at(t) → { hands:{ w: spec|null }, item:{x,y,z,rx,ry,rz}, holder:'w'|null, carry（相對錨點的法寶外接盒，給抓取可達）, foot, visible }
 */
export function makeAwardScript({ seat, from, box, tableY, ms, style = 'side' }) {
  const k = (ms > 0 ? ms : GRAB.MS_REF) / GRAB.MS_REF, T = {};
  for (const key in GRAB.T) T[key] = GRAB.T[key] * k;
  const cx = (box.x0 + box.x1) / 2, cz = (box.z0 + box.z1) / 2, top = box.y1;
  const [dx, dz] = norm2(cx - seat.x, cz - seat.z), yaw = Math.atan2(dx, dz), lx = dz, lz = -dx; // 進場方向與側向
  const isTop = style === 'top', PITCH = isTop ? GRAB.PITCH : GRAB.SIDE_PITCH;
  const e = halfAlong(box, dx, dz) * (isTop ? GRAB.EDGE : GRAB.SIDE_EDGE) + (isTop ? 0 : GRAB.SIDE_GAP);
  const G = [cx - dx * e, isTop ? top + GRAB.GRIP_Y : from.y + (top - from.y) * GRAB.SIDE_H, cz - dz * e];
  const off = [G[0] - from.x, G[1] - from.y, G[2] - from.z]; // 扣住後掌心相對法寶原點的位移（拿回途中固定）
  const H = isTop ? [G[0] - dx * 0.05, G[1] + GRAB.HOVER, G[2] - dz * 0.05] : [G[0] - dx * 0.10, G[1] + 0.02, G[2] - dz * 0.10];
  const S = [G[0] - dx * GRAB.APPROACH, G[1] + (isTop ? GRAB.APPROACH_Y : 0.04), G[2] - dz * GRAB.APPROACH];
  const L = [G[0] - dx * 0.04, G[1] + GRAB.LIFT, G[2] - dz * 0.04];
  const dest = { x: seat.x + (from.x - seat.x) * GRAB.DEST_K, y: from.y, z: seat.z + (from.z - seat.z) * GRAB.DEST_K };
  const D = [dest.x + off[0], dest.y + off[1], dest.z + off[2]];
  const A = [D[0], D[1] + GRAB.ABOVE, D[2]];
  const R = [D[0] - dx * GRAB.RETRACT_DIST, D[1] + GRAB.RETRACT_LIFT, D[2] - dz * GRAB.RETRACT_DIST];
  const carry = { x0: box.x0 - from.x - off[0], x1: box.x1 - from.x - off[0], y0: box.y0 - from.y - off[1], z0: box.z0 - from.z - off[2], z1: box.z1 - from.z - off[2] };
  const foot = { x0: box.x0, x1: box.x1, z0: box.z0, z1: box.z1 };
  const landAt = T.land, hideAt = T.land + GRAB.HOLD_S, end = Math.max(hideAt, T.gone);
  const rest = { x: from.x, y: from.y, z: from.z, rx: 0, ry: 0, rz: 0 };
  function at(t) {
    let palm = null, pose = null, pitch = PITCH, item = rest, holder = null, footNow = foot, carryNow = null;
    if (t < T.reach) { const u = easeOut(t / T.reach); palm = lerp3(S, H, u); pose = ['push', 'spread', u]; pitch = lerp(isTop ? 0.2 : 0.05, PITCH, u); }
    else if (t < T.grip) { const u = smooth(seg(t, T.reach, T.grip)); palm = lerp3(H, G, u); pose = ['spread', 'claw', u]; }
    else if (t < T.land) {
      holder = 'w'; pose = ['claw', null, 0];
      if (t < T.lift) palm = lerp3(G, L, smooth(seg(t, T.grip, T.lift)));
      else if (t < T.carry) { const u = smooth(seg(t, T.lift, T.carry)); palm = lerp3(L, A, u); palm[1] += Math.sin(Math.PI * u) * GRAB.ARC; }
      else palm = lerp3(A, D, easeIn(seg(t, T.carry, T.land)));
      const sg = struggle(seg(t, T.grip, T.carry + 0.08 * k)), dec = t < T.carry ? 1 : 0.35;
      palm = [palm[0] + lx * sg.lat * 0.5 * dec, palm[1] + sg.dy * 0.4, palm[2] + lz * sg.lat * 0.5 * dec];
      item = { x: palm[0] - off[0] + lx * sg.lat * 0.5 * dec, y: palm[1] - off[1], z: palm[2] - off[2] + lz * sg.lat * 0.5 * dec, rx: sg.rx * dec, ry: sg.ry * dec, rz: sg.rz * dec };
      carryNow = t >= T.grip ? carry : null;
      footNow = { x0: item.x - from.x + box.x0, x1: item.x - from.x + box.x1, z0: item.z - from.z + box.z0, z1: item.z - from.z + box.z1 };
    } else {
      item = { x: dest.x, y: dest.y, z: dest.z, rx: 0, ry: 0, rz: 0 };
      footNow = { x0: dest.x - from.x + box.x0, x1: dest.x - from.x + box.x1, z0: dest.z - from.z + box.z0, z1: dest.z - from.z + box.z1 };
      if (t < T.release) { palm = D.slice(); pose = ['claw', 'spread', smooth(seg(t, T.land, T.release))]; }
      else if (t < T.gone) { const u = easeIn(seg(t, T.release, T.gone)); palm = lerp3(D, R, u); pose = ['spread', null, 0]; pitch = PITCH * (1 - u); }
    }
    const hands = { w: palm ? { pose, anchor: 'palm', at: palm, yaw, pitch } : null };
    return { hands, item, holder, carry: carryNow, foot: footNow, visible: t < hideAt, landed: t >= landAt };
  }
  return { kind: 'award', style, landAt, hideAt, end, dest, roles: { w: true }, at };
}

/* 詛咒轉移（D5）的時間軸（秒，GRAB_MS＝1260 時）：
   施放者手掌蓋上符紙堆 → 貼桌推過桌心 → 推上受害者手背（落定）→ 按住（受害者抖、紙錢繩纏腕：只在此段）→ 施放者收手
   → 符紙堆留在受害者席前不動（受害者的手被壓著、仍在抖）→ 符紙堆隱藏（終態同舊版 visible=false）。
   v0.60.1：拿掉「受害者拖著符紙堆縮回」（試玩與盲讀都讀成「被拿走」；docs/experiments/2026-10-05-curse-fix/acceptance.md #2）。
   v0.61.1：放慢（試玩「南塞西快到看不清」；docs/experiments/2026-10-05-curse-slow/acceptance.md）。時長改由 CURSE_MS
   （index.html 的 CFG.CURSE_MS，經 ys:reveal-result 的 curseMs 帶進來）單獨決定，與 GRAB_MS 脫鉤：
   下表以 MS_REF＝2000 毫秒寫成（press＝落定＝CURSE_MS），實際各段依 CURSE_MS 等比縮放。
   CURSE_MS＝2000 時：蓋上 0.30s → 貼桌推 1.55s → 推上手背 0.15s（落定 2.00s）→ 按住 0.70s → 收手 0.30s。 */
export const CURSE = {
  MS_REF: 2000,
  T: { appr: 0.30, push: 1.85, press: 2.00, hold: 2.70, gone: 3.00, end: 3.02 },
  V: { reach0: 0.61, reach1: 1.06, flinch0: 1.27, flinch1: 1.63 }, // 受害者：伸出、想縮（v0.60.1 的值 ×2.04，與落定等比）
  VICTIM_IN: 0.42, // 受害者的手：席位 → 符紙堆方向走這麼多
  VICTIM_Y: 0.03, // 受害者掌心錨點離桌高（平放；實際高度另由可達往上抬到不穿桌）
  HAND_TOP: 0.042, // 符紙堆壓上手背的底高（離桌）
  KNUCKLE: 0.05, // 符紙堆中心落在受害者掌心錨點往前（往符紙堆方向）多少
  PALM_ON: 0.03, // 施放者掌心離符紙堆頂
  C_PITCH: 0.06, // 施放者手掌蓋在堆頂、手腕略高於掌心（手臂往自己那側升起；指尖留在堆的外框內）
  PALM_BACK: 0.28, // 施放者掌心錨點從堆中心往自己那側退這麼多（指尖留在堆的外框內；驗收 #5 越中線只准從上方）
  PRESS: 0.014, // 按住時往下壓的量（只壓在堆頂上，不穿；r2 由 0.008 加深：按住時掌心貼實堆頂，acceptance 條件 15）
  PRESS_S: 0.08, // 按下去花多久（秒，CURSE_MS＝MS_REF 時；r2 由 0.12 縮短）
  TREMBLE_LEAD: 0.08, // 受害者在落定前這麼久開始抖（秒，同上）
  FLINCH: 0.08,
  ROPE_GROW: 0.16, // 繩在按住開始後這麼久內長滿（秒，同上；seg 抽取，不重建幾何）
  RISE_S: 0.40, // v0.61.1：符紙堆在落定前這麼久開始往受害者手背的高度爬（秒，同上；舊版在落定那一幀瞬間跳上去）
  LIFT_SLOPE: 1.4, // v0.61.1：抬升包絡的最大升降速度（世界單位／秒，不隨 CURSE_MS 縮放）——可達的抬升不再一幀跳 0.7
  LAND_SLOPE: 1.7, // r4（條件 31：每幀垂直 ≤0.03）由 3.0 降； v0.61.1：落定前 RISE_S 那段（推上手背）允許的最大下降速度——越過別件後要在落定前降回手背高度
  WRIST: 0.13, // 手腕＝受害者掌心錨點往席位退這麼多（×手的縮放倍率由呼叫端換算前已含）
  /* v0.61.1 r2（acceptance 條件 14–17：不再把符紙堆連同兩手抬到半空）：符紙堆貼桌繞過別件拍品走（planPath），
     （r2 另有「施放者手臂會橫越別件時改從推的方向後方推」，覆審 H-2 西塞南因此像東席推來，r3 廢除，改成下面的 armYawTable。） */
  ROUTE_PAD: 0.06, // 規劃路徑時，別件拍品外框再外擴「符紙堆半寬＋這麼多」
  /* r3（acceptance 條件 25：手臂來向；覆審 H-2 西塞南手臂從東側進場）：施放者的手臂一律從自己席位那側來——
     朝向＝「席位 → 符紙堆」的方向，最多偏 DEV_MAX 去鑽別件拍品之間的空隙；偏 DEV_MAX 還鑽不過的那幾個取樣，手臂從別件上方越過
     （可達把手抬過別件頂；符紙堆不跟著抬，仍貼桌，見 planCurseLift 的 Lp）。 */
  ARM_LEN: 0.62, ARM_R: 0.17, // 手臂看得見的部分（rig.seen，袖布 alpha≥0.2）從掌心往後最長 0.62、側向半寬實測 0.14–0.19（r3 量；舊值 0.9／0.10）
  DEV_MAX: 45 * Math.PI / 180, // 手臂朝向最多偏離「席位 → 符紙堆」這麼多（cos 0.71；條件 25 門檻 cos 0.5，留餘量）
  YAW_RATE: 3.0, // 施放者手的朝向最多每秒轉這麼多弧度（換推法時不瞬轉）
  PILE_SLOPE: 1.4, // 符紙堆小幅抬過桌上道具時的升降速度上限（世界單位／秒）。r3 曾降到 0.6（北塞南一跳、鏡頭甩）；r4 回到與手同速——0.6 時手的包絡比堆早抬、掌心離堆 >0.03（條件 30），且開推第一幀要抬過自己的木舌
  ROUTE_MIN: 0.30, // r3：路徑離別件外框至少這麼遠（略小於冥婚紅包的半寬＋ROUTE_PAD＝0.305，紅包不受影響）——小的詛咒物〔水符〕不鑽別件之間的縫（鑽縫時施放者的手臂一定得越過別件、整隻手被抬離符紙堆）
  APPR_Y: 0.06, // r4（條件 31）：施放者蓋上前從堆頂上方這麼高落下（舊 0.20；加上包絡下降一幀超過 0.03）
  RETRACT_DIST: 0.6, // r4（條件 31）：施放者收手往自己席位退這麼遠（0.3 秒、smoothstep；一般得標仍用 GRAB.RETRACT_DIST）
  PRESS_DROP: 0.03, // r3：堆最後從手背上方這麼高壓下來（世界單位）
  PROP_DETOUR: 0.3, // r3：繞開錢柱的路最多比只繞別件的路長這麼多（世界單位；北塞南多 0.21 → 繞，西塞南多 0.86、北塞東多 1.14 → 抬過）
  GO_MIN: 0.1, // r4：手蓋上後至少按著這麼久才推（秒，同上）——堆開推前的小幅預抬落在手已蓋住之後（條件 30）
  GO_MAX: 0.36, // r3：手蓋上符紙堆後最多再按著等這麼久才推（秒，CURSE_MS＝MS_REF 時；等落標的錢從堆底下扒過去，條件 26）
  /* r6（acceptance 條件 39–43；使用者裁「北席不停頓、不換邊，手全程蓋在堆上，先往前推再繞」）：
     北席施放時，路徑＝先往受害者那側直推 NORTH_ROUTES[i][0]，再繞過別件（外擴多加 [1]）；每條候選路徑用施放者手的實際足跡（hand-motion grabFootprint）
     掃手臂偏角，求「整段固定一側、|偏角| 最小」的偏角表（northYawPlan）；第一條 |偏角| ≤ NORTH_DEV_OK 的就用，否則取最小且 ≤ NORTH_DEV 的；都不行退回舊做法。
     北席不等落標的錢扒過去：蓋上即推（條件 40：觸堆後 0.1s 起堆就要一直動）。 */
  NORTH_ROUTES: [[0.35, 0.15], [0.35, 0.10]], // r6：候選壓到 lane＋兩條（條件 18：每條失敗的候選都要掃到偏角上限才知道失敗，開演那一幀的成本主要在這裡）
  NORTH_LANE: [0.35, 1.15], NORTH_LANE_END: 0.3, NORTH_FAR: 1.5, // lane 候選：先往前推 0.35、前排 z＝1.15、離受害者落點橫向 0.3 處開始斜推上手背；橫越 >1.5 才先試（第六輪實量：北塞西 52°、北塞東 52°）
  NORTH_AREA_Z1: 1.17, // 北席候選路徑可走到的最前緣（z；一般 CURSE_AREA 1.1）。第六輪實量：北塞西貼 1.10 走要 54–62°、貼 1.15 走 49–52°（evidence-r6/north-feasibility.log），故第一條候選就走 1.15
  NORTH_DEV: 58 * Math.PI / 180, // 北席偏角上限（條件 25 門檻 60°，留 2° 給手臂量法與堆中心的差）
  NORTH_DEV_OK: 54 * Math.PI / 180,
  NORTH_LIN: 0.5,
  NORTH_BACK: 0.02, // r6（條件 30）：北席的手（v0.61.0 手型）掌骨比別席多往前約 0.05，偏角大時壓不到窄的詛咒物（水符／鎖／白虎）——錨點多往席位退這麼多（再多手臂就鑽不過別件之間，偏角規劃做不到 ≤58°）
  NORTH_PAD: 0.05, // 足跡對別件外框的水平外擴（抓取可達 GRAB_PAD 0.02＋規劃取樣之間的餘量）
  /* r6（條件 43、31）：收手先抬後退——收手開始先往上抬 retLift（tray 用抓取可達算「退的路上要抬多少」），在 RET_UP 比例處抬完；
     往席位退從 RET_BACK 比例處才開始；收手長度 ＝ max(RET_MIN, 抬升量×RET_PER_LIFT)，不隨 CURSE_MS 縮放（不影響落定時刻）。 */
  RET_MIN: 0.55, RET_PER_LIFT: 2.4, RET_UP: 0.65, RET_BACK: 0.35, RET_EARLY: 0.15, // RET_EARLY：抬的同時先往席位挪這麼一成（手一開始就往自己那側收，不是原地垂直抬）
};

/** r6（條件 40）：北席推的進度曲線＝NORTH_LIN 份等速＋其餘 smoothstep——起步就有速度（smoothstep 起步太慢，短路徑〔北塞南〕觸堆後 0.25s 內堆走不到 0.03），峰值反而比 smoothstep 低。 */
export const northProf = (x) => CURSE.NORTH_LIN * clamp01(x) + (1 - CURSE.NORTH_LIN) * smooth(x);
/**
 * r6 北席手臂偏角規劃（acceptance 條件 25、30、41）：沿路徑 N＋1 個取樣（第 i 個＝推的階段 i/N 時刻的位置，同 armYawTable），
 * 每個取樣掃偏角（相對「施放者席位 → 堆」）−lim…lim（step 度），偏角 d 可行＝手（fp：grabFootprint 的點，掌心錨點在堆中心往席位退 PALM_BACK、高 palmY）
 * 沒有一點水平落進別件外框（外擴 pad）且低於其頂；左右各 1 格也要可行（取樣之間的餘量）。
 * 對兩側（+／−，|d|<5° 兩側通用）各求「最大 |d| 最小」、相鄰取樣朝向變化 ≤ maxStep 的路徑，再在該上限內取 Σ|d| 最小（手臂盡量朝席位）。
 * @returns { yaw: number[]（弧度，N+1 個）, maxDev（弧度）, sign } 或 null（兩側都做不到 ≤ lim）
 */
export function northYawPlan(route, seatC, boxes, fp, palmY, { N = 40, lim = CURSE.NORTH_DEV, step = 2, pad = CURSE.NORTH_PAD, maxStep = 6, prof = smooth, back = CURSE.PALM_BACK } = {}) {
  if (!route || !fp || !fp.length) return null;
  const RAD = Math.PI / 180, L = Math.floor(lim / RAD / step), DS = []; for (let j = -L; j <= L; j++) DS.push(j * step);
  const M = DS.length, W = Math.ceil(maxStep / step) + 1;
  const B = boxes.map((o) => ({ x0: o.x0 - pad, x1: o.x1 + pad, z0: o.z0 - pad, z1: o.z1 + pad, top: o.top }));
  /* 效能（條件 18）：足跡點由遠到近排（手臂末端先撞）、每個取樣只對搆得到的別件判、可行與否用到才算（記憶），偏角上限由 0 往上逐步放寬（容易的組只算 |d| 小的那幾格） */
  const n = fp.length / 3, idx = Array.from({ length: n }, (_, k) => k).sort((a, b) => Math.hypot(fp[b * 3], fp[b * 3 + 2]) - Math.hypot(fp[a * 3], fp[a * 3 + 2]));
  const F = new Float64Array(n * 3); idx.forEach((k, q) => { F[q * 3] = fp[k * 3]; F[q * 3 + 1] = fp[k * 3 + 1]; F[q * 3 + 2] = fp[k * 3 + 2]; });
  let FR = 0; for (let k = 0; k < n; k++) FR = Math.max(FR, Math.hypot(F[k * 3], F[k * 3 + 2]));
  const RK = new Float64Array(n); for (let k = 0; k < n; k++) RK[k] = Math.hypot(F[k * 3], F[k * 3 + 2]); // 由遠到近
  const P = [], Y0 = [], NB = [], DM = [];
  for (let i = 0; i <= N; i++) { const p = polyAt(route, prof(i / N)).p; P.push(p); Y0.push(Math.atan2(p[0] - seatC.x, p[1] - seatC.z) / RAD);
    const nb = B.filter((b) => Math.max(b.x0 - p[0], 0, p[0] - b.x1) ** 2 + Math.max(b.z0 - p[1], 0, p[1] - b.z1) ** 2 <= (FR + back) ** 2); NB.push(nb);
    /* 錨點離搆得到的別件最近距離的下界（錨點在以堆中心為圓心、半徑 back 的圓上）：足跡點離錨點比它近的，一定碰不到——由遠到近掃到那裡就停 */
    DM.push(nb.length ? Math.max(0, Math.min(...nb.map((b) => Math.hypot(Math.max(b.x0 - p[0], 0, p[0] - b.x1), Math.max(b.z0 - p[1], 0, p[1] - b.z1)))) - back) : Infinity); }
  const rawM = new Int8Array((N + 1) * M); // 0 未算、1 可行、2 不可行
  const raw = (i, j) => { const key = i * M + j; let v = rawM[key]; if (v) return v === 1;
    let okv = true; const nb = NB[i];
    if (nb.length) { const p = P[i], y = (Y0[i] + DS[j]) * RAD, sy = Math.sin(y), cy = Math.cos(y), ax = p[0] - sy * back, az = p[1] - cy * back;
      const dm = DM[i];
      outer: for (let k = 0; k < n; k++) { if (RK[k] < dm) break; const lx = F[k * 3], lz = F[k * 3 + 2], x = ax + lx * cy + lz * sy, z = az - lx * sy + lz * cy, yy = palmY + F[k * 3 + 1];
        for (const b of nb) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && yy < b.top) { okv = false; break outer; } } }
    rawM[key] = okv ? 1 : 2; return okv; };
  const ok = (i, j) => raw(i, j) && (j === 0 || raw(i, j - 1)) && (j === M - 1 || raw(i, j + 1)); // 左右各 1 格也要可行（取樣之間的餘量）
  const run = (allow, cost0, edge) => { let cost = DS.map((d, j) => (allow(0, j) ? cost0(j) : Infinity)); const prv = [];
    for (let i = 1; i <= N; i++) { const nx = new Array(M).fill(Infinity), pv = new Array(M).fill(-1), sh = Math.round((Y0[i] - Y0[i - 1]) / step);
      for (let j = 0; j < M; j++) { let any = false; for (let q = Math.max(0, j + sh - W); q <= Math.min(M - 1, j + sh + W); q++) if (cost[q] < Infinity) { any = true; break; } if (!any || !allow(i, j)) continue;
        for (let q = Math.max(0, j + sh - W); q <= Math.min(M - 1, j + sh + W); q++) { if (cost[q] === Infinity) continue; const dy = Math.abs(Y0[i] + DS[j] - Y0[i - 1] - DS[q]); if (dy > maxStep) continue; const c = edge(cost[q], i, j, dy); if (c < nx[j]) { nx[j] = c; pv[j] = q; } } }
      prv.push(pv); cost = nx; if (cost.every((c) => c === Infinity)) return null; }
    return { cost, prv }; };
  /* 偏角上限 D：先試 0，再二分（整段走得通與否對 D 單調）；可達判斷用布林 DP，最後在 D 內兩側各跑一次成本 DP（Σ|d|＋轉動懲罰），取小的那側。 */
  const A0 = new Uint8Array(M), A1 = new Uint8Array(M);
  const reachable = (D, sg) => { let cur = A0, nxt = A1; for (let j = 0; j < M; j++) cur[j] = Math.abs(DS[j]) <= D && (Math.abs(DS[j]) < 5 || Math.sign(DS[j]) === sg) && ok(0, j) ? 1 : 0;
    for (let i = 1; i <= N; i++) { const sh = Math.round((Y0[i] - Y0[i - 1]) / step); let any = false;
      for (let j = 0; j < M; j++) { nxt[j] = 0; if (Math.abs(DS[j]) > D || (Math.abs(DS[j]) >= 5 && Math.sign(DS[j]) !== sg)) continue; let from = false;
        for (let q = Math.max(0, j + sh - W); q <= Math.min(M - 1, j + sh + W); q++) if (cur[q] && Math.abs(Y0[i] + DS[j] - Y0[i - 1] - DS[q]) <= maxStep) { from = true; break; }
        if (from && ok(i, j)) { nxt[j] = 1; any = true; } }
      if (!any) return false; const t = cur; cur = nxt; nxt = t; }
    return true; };
  const feasible = (D) => reachable(D, 1) || reachable(D, -1);
  let D = null;
  if (feasible(0)) D = 0;
  else if (feasible(L * step)) { let lo = 0, hi = L; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (feasible(mid * step)) hi = mid; else lo = mid; } D = hi * step; }
  if (D === null) return null;
  let best = null;
  for (const sg of [1, -1]) {
    if (!reachable(D, sg)) continue;
    const allow = (i, j) => Math.abs(DS[j]) <= D && (Math.abs(DS[j]) < 5 || Math.sign(DS[j]) === sg) && ok(i, j);
    const r = run(allow, (j) => Math.abs(DS[j]), (c, i, j, dy) => c + Math.abs(DS[j]) + dy * 0.5);
    if (!r) continue;
    let j = -1; for (let q = 0; q < M; q++) if (r.cost[q] < Infinity && (j < 0 || r.cost[q] < r.cost[j])) j = q;
    const cj = r.cost[j]; if (best && cj >= best.c) continue;
    const dev = new Array(N + 1); for (let i = N; i >= 0; i--) { dev[i] = DS[j]; if (i > 0) j = r.prv[i - 1][j]; }
    best = { c: cj, dev, sign: sg };
  }
  if (best) { const maxDev = Math.max(...best.dev.map(Math.abs)); return { yaw: Y0.map((y, i) => (y + best.dev[i]) * RAD), dev: best.dev, maxDev: maxDev * RAD, sign: best.sign }; }
  return null;
}

/** 線段 p→q（xz）是否穿進 AABB o 的內部（Liang–Barsky；只碰邊不算）。 */
function segHitsBox(p, q, o) {
  let t0 = 0, t1 = 1; const dx = q[0] - p[0], dz = q[1] - p[1];
  for (const [pp, d, lo, hi] of [[p[0], dx, o.x0, o.x1], [p[1], dz, o.z0, o.z1]]) {
    if (Math.abs(d) < 1e-12) { if (pp <= lo || pp >= hi) return false; continue; }
    let a = (lo - pp) / d, c = (hi - pp) / d; if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 >= t1 - 1e-9) return false;
  }
  return true;
}
/**
 * 符紙堆貼桌的路徑（xz 折線，含頭尾）：別件拍品外框外擴 r 當障礙，可見性圖最短路（頂點＝外擴框四角）。
 * 直線就不撞＝[a, b]；找不到＝null（呼叫端退回舊做法）。起點／終點若落在某個外擴框內，那個框不擋與它相連的邊。
 * @param area 可走範圍 {x0,x1,z0,z1}（可省）
 */
export function planPath(a, b, boxes, r, area = null) {
  const B = boxes.map((o) => ({ x0: o.x0 - r, x1: o.x1 + r, z0: o.z0 - r, z1: o.z1 + r }));
  const inBox = (p, o) => p[0] > o.x0 && p[0] < o.x1 && p[1] > o.z0 && p[1] < o.z1;
  const skipA = B.filter((o) => inBox(a, o)), skipB = B.filter((o) => inBox(b, o));
  const blocked = (p, q) => B.some((o) => !((p === a || q === a) && skipA.includes(o)) && !((p === b || q === b) && skipB.includes(o)) && segHitsBox(p, q, o));
  if (!blocked(a, b)) return [a, b];
  const e = 0.02, nodes = [a, b];
  for (const o of B) for (const c of [[o.x0 - e, o.z0 - e], [o.x1 + e, o.z0 - e], [o.x0 - e, o.z1 + e], [o.x1 + e, o.z1 + e]])
    if (!B.some((x) => inBox(c, x)) && (!area || (c[0] >= area.x0 && c[0] <= area.x1 && c[1] >= area.z0 && c[1] <= area.z1))) nodes.push(c);
  const n = nodes.length, dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false); dist[0] = 0;
  for (;;) {
    let u = -1; for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === 1) break; done[u] = true;
    for (let v = 0; v < n; v++) { if (done[v] || v === u) continue; const d = dist[u] + Math.hypot(nodes[v][0] - nodes[u][0], nodes[v][1] - nodes[u][1]); if (d < dist[v] && !blocked(nodes[u], nodes[v])) { dist[v] = d; prev[v] = u; } }
  }
  if (!Number.isFinite(dist[1])) return null;
  const out = []; for (let v = 1; v >= 0; v = prev[v]) out.unshift(nodes[v]);
  return out;
}
/** 折線總長。 */
const polyLen = (pts) => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; };
/** 折線上弧長比例 u∈[0,1] 的點與切線方向。 */
function polyAt(pts, u) {
  const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
  let s = clamp01(u) * tot;
  for (let i = 0; i < L.length; i++) { if (s <= L[i] || i === L.length - 1) { const k = L[i] > 0 ? Math.min(1, s / L[i]) : 1, p = pts[i], q = pts[i + 1]; return { p: [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k], d: norm2(q[0] - p[0], q[1] - p[1]) }; } s -= L[i]; }
  return { p: pts[pts.length - 1].slice(), d: [0, 1] };
}

/**
 * r3 施放者手臂朝向表（acceptance 條件 25）：沿路徑 N＋1 個取樣（第 i 個＝推的階段 i/N 時刻的位置），朝向＝「施放者席位 → 符紙堆」＋偏角。
 * 偏角：掌心（堆中心往席位退 PALM_BACK）往後 ARM_LEN、半寬 ARM_R 的手臂若橫越別件拍品，找 ±DEV_MAX 內最小的鑽得過的偏角；
 *   整段固定偏同一側（兩側各算最大需要量取小的那側，不在半路換邊——換邊時手臂會掃過別件）；
 *   偏 DEV_MAX 還鑽不過的取樣停在 DEV_MAX（手臂由可達抬過別件；r3 先試過「整段不偏」，小的詛咒物〔水符〕整段被抬離符紙堆 0.5，條件 5 退步）；
 *   偏角取「max_j（d_j − 轉速上限×|i−j|）」的包絡：該偏的地方一定偏到、前後以 YAW_RATE 漸變（不瞬轉）。
 */
export function armYawTable(route, seatC, boxes, pushS, N = 96) {
  const AB = boxes.map((o) => ({ x0: o.x0 - CURSE.ARM_R, x1: o.x1 + CURSE.ARM_R, z0: o.z0 - CURSE.ARM_R, z1: o.z1 + CURSE.ARM_R }));
  const clear = (p, y) => { const sx = Math.sin(y), sz = Math.cos(y), a = [p[0] - sx * CURSE.PALM_BACK, p[1] - sz * CURSE.PALM_BACK], b = [a[0] - sx * CURSE.ARM_LEN, a[1] - sz * CURSE.ARM_LEN]; return !AB.some((o) => segHitsBox(a, b, o)); };
  const P = [], Y0 = [], need = { 1: [], [-1]: [] }, STEP = Math.PI / 90;
  for (let i = 0; i <= N; i++) { const p = polyAt(route, smooth(i / N)).p, y0 = Math.atan2(p[0] - seatC.x, p[1] - seatC.z); P.push(p); Y0.push(y0);
    for (const sg of [1, -1]) { let d = 0; while (d <= CURSE.DEV_MAX + 1e-9 && !clear(p, y0 + sg * d)) d += STEP; need[sg].push(d <= CURSE.DEV_MAX + 1e-9 ? d : Infinity); } }
  const worst = (sg) => Math.max(...need[sg]), sg = worst(1) <= worst(-1) ? 1 : -1, d = need[sg].slice();
  /* 鑽不過的那幾段（含與它相連、需要偏的取樣）整段不偏 */
  let over = 0; for (let i = 0; i <= N; i++) if (d[i] === Infinity) { over++; d[i] = CURSE.DEV_MAX; } // 偏到上限還鑽不過＝停在上限、手臂由可達抬過別件（只在這幾個取樣；前後照包絡漸變）
  const rate = CURSE.YAW_RATE * pushS / N, env = d.map((_, i) => Math.max(0, ...d.map((x, j) => x - rate * Math.abs(i - j))));
  const out = Y0.map((y, i) => y + sg * env[i]); out.over = over; // over＝手臂得從別件上方越過（手被抬）的取樣數
  return out;
}
/**
 * 詛咒轉移 A（推過去按住）＋C（紙錢繩纏腕，只在按住階段）。
 * @param o { seatC（施放者＝毒標得標席）, seatV（受害者＝transferTarget）, from, box（符紙堆靜止外接盒）, tableY, ms }
 *   r3：goAt（秒，可省）＝手蓋上後在原位按著、到這一刻才開始推（tray 給：落標的錢扒回時從堆底下橫過，等它過去；上限 GO_MAX×比例）
 */
export function makeCurseScript({ seatC, seatV, from, box, tableY, ms, victimIn = CURSE.VICTIM_IN, via = null, vdir = null, avoid = null, goAt = 0, north = null }) {
  const k = (Number.isFinite(ms) ? Math.max(ms, 1) : CURSE.MS_REF) / CURSE.MS_REF, T = {}, VT = {}; // ms＝CURSE_MS（落定時長）；沒給／非數字＝MS_REF；≤0＝瞬間（取 1ms，免除以零；與 index.html 揭卡等待的 max(0,CURSE_MS) 同口徑）
  for (const key in CURSE.T) T[key] = CURSE.T[key] * k;
  for (const key in CURSE.V) VT[key] = CURSE.V[key] * k;
  T.go = Math.min(T.appr + CURSE.GO_MAX * k, Math.max(T.appr + CURSE.GO_MIN * k, Number.isFinite(goAt) ? goAt : 0)); // 開始推的時刻（r3）；r4：至少在蓋上後 GO_MIN，堆開推前的小幅預抬落在手已蓋住之後（條件 30）
  const pileH = box.y1 - from.y;
  const [vx, vz] = vdir ? norm2(vdir[0], vdir[1]) : norm2(from.x - seatV.x, from.z - seatV.z), vyaw = Math.atan2(vx, vz); // 受害者席 → 符紙堆（r2：tray 可另給 vdir＝避開別件拍品的伸手方向）
  const Vp = [seatV.x + vx * victimIn, tableY + CURSE.VICTIM_Y, seatV.z + vz * victimIn]; // 受害者掌心（victimIn 由 tray 依別件拍品外框收短，手不伸進別件腳下）
  let [cx, cz] = norm2(from.x - seatC.x, from.z - seatC.z), cyaw = Math.atan2(cx, cz); // 施放者席 → 符紙堆（手臂從自己那側來）
  const P0 = [from.x, from.y, from.z];
  const P1 = [Vp[0] + vx * CURSE.KNUCKLE, tableY + CURSE.HAND_TOP - (box.y0 - from.y), Vp[2] + vz * CURSE.KNUCKLE]; // 終點：壓在受害者手背（r3：HAND_TOP 是「堆底」離桌高——外框底不在原點的詛咒物〔芭樂、水符、鎖、白虎〕扣回那段，條件 27 第二輪判定 16）
  const P1t = [P1[0], from.y, P1[2]];
  /* r2：avoid（tray 給 {boxes, area}）＝貼桌繞行。r3：施放者手的朝向逐時取「自己席位 → 符紙堆」方向，必要時在 ±DEV_MAX 內偏去鑽空隙（條件 25） */
  let route = null, yawTab = null;
  if (avoid) {
    const r = Math.max(Math.max(box.x1 - box.x0, box.z1 - box.z0) / 2 + CURSE.ROUTE_PAD, CURSE.ROUTE_MIN);
    /* r3：avoid.props（tray 給：不會被扒走的錢柱／令牌外框）也繞得開、且路比只繞別件的長不到 PROP_DETOUR 就一起繞（堆不必抬過去、鏡頭不跟著跳）；
       否則只繞別件拍品、錢柱由堆小幅抬過（繞太遠＝推得更快，條件 3 的螢幕位移變大） */
    route = planPath([P0[0], P0[2]], [P1[0], P1[2]], avoid.boxes, r, avoid.area);
    const r2 = route && avoid.props && avoid.props.length ? planPath([P0[0], P0[2]], [P1[0], P1[2]], avoid.boxes.concat(avoid.props), r, avoid.area) : null;
    if (r2 && polyLen(r2) <= polyLen(route) + CURSE.PROP_DETOUR) route = r2;
    if (route) yawTab = armYawTable(route, seatC, avoid.boxes, T.push - T.go);
  }
  /* r6（條件 39–42）：北席施放——north＝{ fp（施放者手推的姿勢的足跡，hand-motion grabFootprint）}。候選路徑逐條用 northYawPlan 求偏角表，
     先往前推 NORTH_ROUTES[i][0] 再繞（外擴多加 [1]）；用上了就蓋上即推（T.go＝T.appr）。都做不到＝northPlan.ok false，維持上面的舊做法。 */
  let northPlan = null, prof = smooth, pb = CURSE.PALM_BACK; // pb：掌心錨點往席位退多少（北席多退 NORTH_BACK）
  if (avoid && north && north.fp) {
    const r = Math.max(Math.max(box.x1 - box.x0, box.z1 - box.z0) / 2 + CURSE.ROUTE_PAD, CURSE.ROUTE_MIN), sgz = Math.sign(P1[2] - P0[2]) || 1;
    const area = Object.assign({}, avoid.area || {}, { z1: Math.max(avoid.area ? avoid.area.z1 : -Infinity, CURSE.NORTH_AREA_Z1) });
    const palmY = from.y + pileH + CURSE.PALM_ON, tried = []; let pick = null;
    /* 候選：lane＝先往前推 NORTH_LANE[0]、再推到前排 z＝NORTH_LANE[1]、沿前排橫推到受害者那側、最後斜推上手背（遠距離橫越用：北塞西、北塞東）；
       其餘＝先往前推 d 再 planPath 繞（外擴多 pad）。橫越距離 >NORTH_FAR 的先試 lane。 */
    const a = [P0[0], P0[2]], E = [P1[0], P1[2]], R = avoid.boxes.map((o) => ({ x0: o.x0 - r, x1: o.x1 + r, z0: o.z0 - r, z1: o.z1 + r }));
    const lane = () => { const [d, z] = CURSE.NORTH_LANE, sx = Math.sign(E[0] - a[0]) || 1, rt = [a, [a[0], a[1] + sgz * d], [a[0], z], [E[0] - sx * CURSE.NORTH_LANE_END, z], E];
      return rt.every((p, i) => i === 0 || !R.some((o) => segHitsBox(rt[i - 1], p, o))) && rt.every((p) => p[1] <= area.z1 + 1e-9) ? rt : null; };
    const cands = CURSE.NORTH_ROUTES.map(([d, pad]) => ({ d, pad }));
    if (Math.abs(E[0] - a[0]) > CURSE.NORTH_FAR) cands.unshift({ d: CURSE.NORTH_LANE[0], pad: 'lane' });
    for (const { d, pad } of cands) {
      let rt;
      if (pad === 'lane') rt = lane();
      else { const w = [P0[0], P0[2] + sgz * d], rest = planPath(d > 0 ? w : a, E, avoid.boxes, r + pad, area); rt = rest ? (d > 0 ? [a, ...rest] : rest) : null; }
      if (!rt) { tried.push({ d, pad, fail: 'path' }); continue; }
      const plan = northYawPlan(rt, seatC, avoid.boxes, north.fp, palmY, { prof: northProf, back: CURSE.PALM_BACK + CURSE.NORTH_BACK });
      tried.push({ d, pad, maxDeg: plan ? Math.round(plan.maxDev * 180 / Math.PI) : null });
      if (plan && (!pick || plan.maxDev < pick.plan.maxDev)) pick = { rt, plan, d, pad };
      if (plan && plan.maxDev <= CURSE.NORTH_DEV_OK + 1e-9) break;
    }
    northPlan = { ok: !!pick, tried, d: pick ? pick.d : null, pad: pick ? pick.pad : null, maxDeg: pick ? Math.round(pick.plan.maxDev * 180 / Math.PI) : null, sign: pick ? pick.plan.sign : null };
    if (pick) { route = pick.rt; yawTab = pick.plan.yaw; T.go = T.appr; prof = northProf; pb = CURSE.PALM_BACK + CURSE.NORTH_BACK; }
  }
  const yawAtU = (u) => { if (!yawTab) return null; const x = clamp01(u) * (yawTab.length - 1), i = Math.min(yawTab.length - 2, Math.floor(x)), f = x - i, a = yawTab[i], d = Math.atan2(Math.sin(yawTab[i + 1] - a), Math.cos(yawTab[i + 1] - a)); return a + d * f; };
  const yawEnd = yawTab ? yawAtU(1) : Math.atan2(P1[0] - seatC.x, P1[2] - seatC.z); // 推到底之後施放者手的朝向
  const palmOn = pileH + CURSE.PALM_ON;
  const carry = { x0: box.x0 - from.x, x1: box.x1 - from.x, y0: box.y0 - from.y - palmOn, z0: box.z0 - from.z, z1: box.z1 - from.z };
  if (yawTab) { cyaw = yawAtU(0); cx = Math.sin(cyaw); cz = Math.cos(cyaw); } // r2：蓋上時就從之後推的方向來
  /* r6（條件 43、31）：收手長度CURSE_MS ≥ MS_REF 時不縮放（較短時等比縮短，CURSE_MS＝0 仍是瞬間）、至少 RET_MIN；tray 量完「退的路上要抬多少」後呼叫 setRetract(lift) 再拉長（見回傳物件） */
  let retLift = 0; const kr = Math.min(1, k); T.gone = T.hold + CURSE.RET_MIN * kr; T.end = T.gone + 0.02 * k;
  const landAt = T.press;
  const footAt = (p) => ({ x0: p[0] - from.x + box.x0, x1: p[0] - from.x + box.x1, z0: p[2] - from.z + box.z0, z1: p[2] - from.z + box.z1 });
  function victimPalm(t) {
    const u = easeOut(seg(t, VT.reach0, VT.reach1));
    const back = 0.35 * (1 - u) + smooth(seg(t, VT.flinch0, VT.flinch1)) * CURSE.FLINCH - smooth(seg(t, VT.flinch1, T.push)) * CURSE.FLINCH;
    const tr = tremble(t, T.press - CURSE.TREMBLE_LEAD * k, T.gone, 0.008);
    return [Vp[0] - vx * back + tr[0], Vp[1] + tr[1], Vp[2] - vz * back + tr[2]];
  }
  function at(t) {
    const hands = {};
    let item = { x: P0[0], y: P0[1], z: P0[2], rx: 0, ry: 0, rz: 0 }, holder = null, rope = null, carryNow = null;
    /* 施放者：手掌從自己那側蓋上堆頂 → 推 → 推上手背 → 按住 → 收 */
    if (t < T.appr) {
      const u = smooth(t / T.appr); // r4（條件 31）：easeOut 起步一幀走 0.067 → smoothstep 峰值 0.05
      hands.c = { pose: ['push', null, 0], anchor: 'palm', at: [P0[0] - cx * 0.6 * (1 - u), P0[1] + palmOn + CURSE.APPR_Y * (1 - u), P0[2] - cz * 0.6 * (1 - u)], yaw: cyaw, pitch: CURSE.C_PITCH };
    } else if (t < T.press) {
      let p;
      if (t < T.push) {
        /* via（tray 給，可省）：直線推會擦過別件拍品時，先貼桌往前拉到 via 再推過去（貼桌推，不從別件身上飛過） */
        const u = prof(seg(t, T.go, T.push)), V = via ? [via[0], from.y, via[1]] : null;
        if (route) { const q = polyAt(route, u); p = [q.p[0], from.y, q.p[1]]; }
        else p = V ? (u < 0.4 ? lerp3(P0, V, u / 0.4) : lerp3(V, P1t, (u - 0.4) / 0.6)) : lerp3(P0, P1t, u);
        item = { x: p[0], y: p[1], z: p[2], rx: 0, rz: Math.sin(t * 2 * Math.PI * 9) * 0.03 * Math.sin(Math.PI * u), ry: Math.sin(Math.PI * u) * 0.25 }; }
      else { const u = smooth(seg(t, T.push, T.press)); p = lerp3(P1t, P1, u); item = { x: p[0], y: p[1], z: p[2], rx: 0, rz: 0, ry: 0 }; }
      holder = 'c'; carryNow = carry;
      /* 手掌蓋在堆頂推：手指朝向「自己席位 → 符紙堆現在的位置」（跟著堆轉，指尖不伸進別件拍品）。 */
      const cy = yawTab ? (t < T.push ? yawAtU(seg(t, T.go, T.push)) : yawEnd) : Math.atan2(p[0] - seatC.x, p[2] - seatC.z);
      hands.c = { pose: ['push', 'spread', t < T.push ? 0 : smooth(seg(t, T.push, T.press))], anchor: 'palm', at: [p[0], p[1] + palmOn, p[2]], yaw: cy, pitch: CURSE.C_PITCH }; // 推時五指併攏（拇指收著，不掃到別件），按上手背前張開
    } else {
      const vp = victimPalm(t); // 符紙堆壓在受害者手背上、停在席前不動（不跟著細顫，按住的那隻手壓著它；施放者收手後也不被拖回）
      item = { x: P1[0], y: P1[1], z: P1[2], rx: 0, rz: 0, ry: 0 };
      holder = 'v';
      if (t < T.hold) {
        const press = smooth(seg(t, T.press, T.press + CURSE.PRESS_S * k)) * CURSE.PRESS;
        hands.c = { pose: ['spread', null, 0], anchor: 'palm', at: [item.x, item.y + palmOn - press, item.z], yaw: yawEnd, pitch: CURSE.C_PITCH };
        rope = { grow: smooth(seg(t, T.press, T.press + CURSE.ROPE_GROW * k)), wrist: [vp[0] - vx * CURSE.WRIST, vp[1], vp[2] - vz * CURSE.WRIST], pile: [item.x, item.y, item.z], yaw: vyaw };
      } else if (t < T.gone) {
        /* r6（條件 43、31、25）：先抬後退——往上抬（RETRACT_LIFT＋retLift）在收手的前 RET_UP 比例內完成，往自己席位退（掌心 → 席位的方向，不沿推的偏角斜退）
           從 RET_BACK 比例處才開始；抬到位以後手臂朝向才轉回「席位 → 掌心」（轉的時候已高過別件）。r4：smoothstep、收手時五指併攏（拇指側伸 0.4 會掃進別件外框）。 */
        const RD = T.gone - T.hold, fr = (t - T.hold) / RD, w = smooth(fr / CURSE.RET_UP), u = (1 - CURSE.RET_EARLY) * smooth((fr - CURSE.RET_BACK) / (1 - CURSE.RET_BACK)) + CURSE.RET_EARLY * smooth(fr), w2 = smooth((fr - CURSE.RET_UP * 0.6) / (1 - CURSE.RET_UP * 0.6));
        const px = item.x - Math.sin(yawEnd) * pb, pz = item.z - Math.cos(yawEnd) * pb, [bx, bz] = norm2(seatC.x - px, seatC.z - pz), ys = Math.atan2(-bx, -bz);
        const yaw = yawEnd + Math.atan2(Math.sin(ys - yawEnd), Math.cos(ys - yawEnd)) * w2, qx = px + bx * CURSE.RETRACT_DIST * u, qz = pz + bz * CURSE.RETRACT_DIST * u;
        hands.c = { pose: ['spread', 'push', smooth(seg(t, T.hold, T.hold + 0.1 * k))], anchor: 'palm', at: [qx + Math.sin(yaw) * pb, item.y + palmOn + (GRAB.RETRACT_LIFT + retLift) * w, qz + Math.cos(yaw) * pb], yaw, pitch: CURSE.C_PITCH, retW: w };
      }
    }
    if (hands.c) hands.c.at = [hands.c.at[0] - Math.sin(hands.c.yaw) * pb, hands.c.at[1], hands.c.at[2] - Math.cos(hands.c.yaw) * pb];
    /* r2：carry（符紙堆相對掌心錨點的外框，給可達判「堆會不會撞別件」）要跟著掌心往後退 PALM_BACK 一起換算——舊版沒換算，等於拿堆後方 0.28 的一塊去判，貼著別件推時會被誤抬 */
    if (carryNow && hands.c) { const sx = Math.sin(hands.c.yaw) * pb, sz = Math.cos(hands.c.yaw) * pb; carryNow = { x0: carryNow.x0 + sx, x1: carryNow.x1 + sx, y0: carryNow.y0, z0: carryNow.z0 + sz, z1: carryNow.z1 + sz }; }
    /* 受害者：伸出平放、想縮又被逼回、被按住後抖（手留在符紙堆底下，不拖回） */
    if (t >= VT.reach0 && t < T.gone) hands.v = { pose: ['spread', 'rake', 0.15], anchor: 'palm', at: victimPalm(t), yaw: vyaw, pitch: 0.05 };
    for (const r of ['c', 'v']) if (!(r in hands)) hands[r] = null;
    return { hands, item, holder, carry: carryNow, foot: footAt([item.x, item.y, item.z]), rope, visible: t < T.end, landed: t >= landAt };
  }
  const scr = { kind: 'curse', landAt, hideAt: T.end, end: T.end, dest: { x: P1[0], y: P1[1], z: P1[2] }, roles: { c: true, v: true }, at,
    holdFrom: T.press, holdTo: T.hold, T: Object.assign({}, T), riseFrom: T.press - CURSE.RISE_S * k, route, northPlan, yawEnd,
    /** r6：收手要越過別件時先抬 lift（世界單位，tray 用抓取可達量）；收手長度 ＝ max(RET_MIN, (RETRACT_LIFT＋lift)×RET_PER_LIFT)。開演時呼叫一次（規劃前）。 */
    setRetract(lift) { retLift = Math.max(0, lift || 0); T.gone = T.hold + Math.max(CURSE.RET_MIN, (GRAB.RETRACT_LIFT + retLift) * CURSE.RET_PER_LIFT) * kr; T.end = T.gone + 0.02 * k; scr.T = Object.assign({}, T); scr.end = scr.hideAt = T.end; return scr; } };
  return scr;
}

/** 斜率上限的上包絡：S ≥ L（手永遠不低於可達要的高度＝不穿），往上每格最多 up·dt、往下每格最多 down(i)·dt（不瞬跳）。
 *  兩趟：順向讓下降受 down 限（F[i]＝max(L[i], F[i−1]−down(i)·dt)），逆向讓上升受 up 限（S[i]＝max(F[i], S[i+1]−up·dt)）；
 *  up＝down 時等於 max_j（L[j] − slope·|i−j|·dt）。L 裡 −Infinity＝那一格手不在場（不提供約束）；結果不低於 0。 */
export function liftEnvelope(L, dt, up = CURSE.LIFT_SLOPE, down = up) {
  const n = L.length, F = new Array(n), B = new Array(n), dn = typeof down === 'function' ? down : () => down, upf = typeof up === 'function' ? up : () => up;
  for (let i = 0; i < n; i++) F[i] = i ? Math.max(L[i], F[i - 1] - dn(i) * dt) : L[i];
  for (let i = n - 1; i >= 0; i--) B[i] = i < n - 1 ? Math.max(F[i], B[i + 1] - upf(i) * dt) : F[i];
  return B.map((x) => (Number.isFinite(x) ? Math.max(0, x) : 0));
}
/**
 * v0.61.1 詛咒推按的抬升規劃（純函式；table-tray 開演時用可達預算每一格的需要量 Lc／Lv 後呼叫）。
 * 舊版：符紙堆的高度＝抓它那隻手「這一幀」被可達抬起的量，可達一換規則就整堆瞬移（越過別件、越中線、壓上手背都是一幀跳 0.1–0.7）。
 * 新版：
 *   v＝受害者：按住階段（落定 → 收手完）取該段需要量的最大值固定（不隨細顫在兩個解之間跳），再取斜率上限包絡；
 *   pile＝符紙堆：落定前 RISE_S 起由施放者的包絡平滑過渡到受害者的（推上手背是爬上去，不是跳上去），再取包絡（這段下降上限放寬到 LAND_SLOPE，越過別件後來得及在落定前降回）；
 *   c＝施放者：手掌蓋在堆頂的那段（蓋上 → 收手開始）至少跟堆一樣高（不陷進堆裡），再取包絡。
 * r3（acceptance 條件 25、26）：Lp（可省）＝符紙堆「自己」要抬多少（堆底要高過壓到的錢柱／令牌／木籌槽；只看堆，不看手臂）。
 *   給了 Lp 時，推的階段符紙堆照 Lp 的包絡走，不再跟施放者整隻手的需要量（手臂從別件上方越過時手抬、堆仍貼桌）；施放者仍 ≥ 堆（掌心不陷進堆）。
 *   沒給＝r2 行為（堆跟施放者的包絡）。
 * @param s makeCurseScript 的回傳；Lc／Lv：每 dt 秒一格的需要量（−Infinity＝手不在場）
 * @returns { dt, c, v, pile }（陣列，第 i 格＝時間 i·dt）
 */
export function planCurseLift(s, Lc, Lv, dt, slope = CURSE.LIFT_SLOPE, land = CURSE.LAND_SLOPE, Lp = null) {
  const n = Lc.length, T = s.T, tt = (i) => i * dt, down = (i) => (tt(i) >= s.riseFrom && tt(i) <= T.hold ? Math.max(slope, land) : slope);
  const Lv2 = Lv.slice(); let vHold = -Infinity;
  for (let i = 0; i < n; i++) if (tt(i) >= T.press && tt(i) < T.gone) vHold = Math.max(vHold, Lv[i]);
  if (Number.isFinite(vHold)) for (let i = 0; i < n; i++) if (tt(i) >= T.press && tt(i) < T.gone) Lv2[i] = vHold;
  const v = liftEnvelope(Lv2, dt, slope), c0 = Lp ? liftEnvelope(Lp, dt, Math.min(slope, CURSE.PILE_SLOPE), (i) => (tt(i) >= s.riseFrom ? down(i) : Math.min(slope, CURSE.PILE_SLOPE))) : liftEnvelope(Lc, dt, slope, down);
  /* r3：堆落定後一直停在受害者手背高度直到隱藏（舊版受害者的手在 gone 收走後包絡往下掉，最後兩三幀堆沉進席前信物；條件 26） */
  const vKeep = Number.isFinite(vHold) ? Math.max(0, vHold) : 0;
  /* r3：推上手背的最後一段（push → press）堆一定從手背上方 PRESS_DROP 處往下壓到手背——堆在落定前為了越過受害者席前的信物已經抬到手背高度時，
     舊式子會讓堆在落定前 0.15 秒就停住不動（看起來提早落定、按住變短；五物東塞南芭樂，條件 3） */
  const target = c0.map((x, i) => { const t = tt(i); if (t < s.riseFrom) return x; if (t >= T.press) return t >= T.gone ? Math.max(v[i], vKeep) : v[i]; const y = lerp(x, v[i], smooth(seg(t, s.riseFrom, T.press))); return t >= T.push ? Math.max(y, v[i] + CURSE.PRESS_DROP * (1 - smooth(seg(t, T.push, T.press)))) : y; });
  const pile = liftEnvelope(target, dt, slope, down);
  const Lc2 = Lc.map((x, i) => (tt(i) < T.hold && Number.isFinite(x) ? Math.max(x, pile[i]) : x)); // r6：蓋上前堆也可能已預抬（北席蓋上即推），手一路不低於堆
  /* 施放者按住那段（落定 → 收手開始）不為了收手時要越過別件而提早抬手（按住要按滿；收手那一刻才開始抬） */
  const cUp = (i) => (tt(i) >= T.press && tt(i) < T.hold ? Infinity : slope); // 按住段不為收手提早抬；r4：收手開始那一格起照斜率上限抬（舊版 +dt 讓收手第一格一口氣跳上去，條件 31）
  return { dt, c: liftEnvelope(Lc2, dt, cUp, down), v, pile };
}
/** 規劃表在時間 t 的值（線性內插；超出範圍取端點）。 */
export function planAt(arr, dt, t) {
  if (!arr || !arr.length) return 0;
  const x = t / dt, i = Math.floor(x);
  if (i < 0) return arr[0]; if (i >= arr.length - 1) return arr[arr.length - 1];
  return arr[i] + (arr[i + 1] - arr[i]) * (x - i);
}

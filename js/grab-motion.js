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
  SIDE_PITCH: 0.12,
  SIDE_H: 0.55,
  EDGE: 0.55, // top：掌心錨點自中心往席位退「外框沿進場方向半寬×EDGE」
  SIDE_EDGE: 0.50, // side：同上（掌心一半落在外框內，手指扣進身側）
  GRIP_Y: 0.012, // top：掌心錨點離拍品頂多高（手指往下扣住上緣）
  HOVER: 0.10, // 下爪前在扣點上方多高
  APPROACH: 0.75, // 從扣點沿進場方向往回多遠開始伸進來
  APPROACH_Y: 0.22,
  LIFT: 0.24, // 抓起多高
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
  const e = halfAlong(box, dx, dz) * (isTop ? GRAB.EDGE : GRAB.SIDE_EDGE);
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
   → 受害者拖著符紙堆慢慢縮回 → 符紙堆隱藏（終態同舊版 visible=false）。 */
export const CURSE = {
  T: { appr: 0.26, push: 0.86, press: 0.98, hold: 1.30, gone: 1.60, end: 1.62 },
  V: { reach0: 0.30, reach1: 0.52, flinch0: 0.62, flinch1: 0.80 }, // 受害者：伸出、想縮
  VICTIM_IN: 0.42, // 受害者的手：席位 → 符紙堆方向走這麼多
  VICTIM_Y: 0.03, // 受害者掌心錨點離桌高（平放；實際高度另由可達往上抬到不穿桌）
  HAND_TOP: 0.042, // 符紙堆壓上手背的底高（離桌）
  KNUCKLE: 0.05, // 符紙堆中心落在受害者掌心錨點往前（往符紙堆方向）多少
  PALM_ON: 0.03, // 施放者掌心離符紙堆頂
  C_PITCH: 0.06, // 施放者手掌蓋在堆頂、手腕略高於掌心（手臂往自己那側升起；指尖留在堆的外框內）
  PALM_BACK: 0.28, // 施放者掌心錨點從堆中心往自己那側退這麼多（指尖留在堆的外框內；驗收 #5 越中線只准從上方）
  PRESS: 0.008, // 按住時往下壓的量（只壓在堆頂上，不穿）
  FLINCH: 0.08, DRAG: 0.10,
  ROPE_GROW: 0.08, // 繩在按住開始後這麼久內長滿（seg 抽取，不重建幾何）
  WRIST: 0.13, // 手腕＝受害者掌心錨點往席位退這麼多（×手的縮放倍率由呼叫端換算前已含）
};

/**
 * 詛咒轉移 A（推過去按住）＋C（紙錢繩纏腕，只在按住階段）。
 * @param o { seatC（施放者＝毒標得標席）, seatV（受害者＝transferTarget）, from, box（符紙堆靜止外接盒）, tableY, ms }
 */
export function makeCurseScript({ seatC, seatV, from, box, tableY, ms, victimIn = CURSE.VICTIM_IN, via = null }) {
  const k = (ms > 0 ? ms : GRAB.MS_REF) / GRAB.MS_REF, T = {}, VT = {};
  for (const key in CURSE.T) T[key] = CURSE.T[key] * k;
  for (const key in CURSE.V) VT[key] = CURSE.V[key] * k;
  const pileH = box.y1 - from.y;
  const [vx, vz] = norm2(from.x - seatV.x, from.z - seatV.z), vyaw = Math.atan2(vx, vz); // 受害者席 → 符紙堆
  const Vp = [seatV.x + vx * victimIn, tableY + CURSE.VICTIM_Y, seatV.z + vz * victimIn]; // 受害者掌心（victimIn 由 tray 依別件拍品外框收短，手不伸進別件腳下）
  const [cx, cz] = norm2(from.x - seatC.x, from.z - seatC.z), cyaw = Math.atan2(cx, cz); // 施放者席 → 符紙堆（手臂從自己那側來）
  const P0 = [from.x, from.y, from.z];
  const P1 = [Vp[0] + vx * CURSE.KNUCKLE, tableY + CURSE.HAND_TOP, Vp[2] + vz * CURSE.KNUCKLE]; // 終點：壓在受害者手背
  const P1t = [P1[0], from.y, P1[2]];
  const yawEnd = Math.atan2(P1[0] - seatC.x, P1[2] - seatC.z); // 推到底之後施放者手的朝向
  const palmOn = pileH + CURSE.PALM_ON;
  const carry = { x0: box.x0 - from.x, x1: box.x1 - from.x, y0: box.y0 - from.y - palmOn, z0: box.z0 - from.z, z1: box.z1 - from.z };
  const landAt = T.press, hideAt = T.end, end = T.end;
  const footAt = (p) => ({ x0: p[0] - from.x + box.x0, x1: p[0] - from.x + box.x1, z0: p[2] - from.z + box.z0, z1: p[2] - from.z + box.z1 });
  function victimPalm(t, still) {
    const u = easeOut(seg(t, VT.reach0, VT.reach1));
    const back = 0.35 * (1 - u) + smooth(seg(t, VT.flinch0, VT.flinch1)) * CURSE.FLINCH - smooth(seg(t, VT.flinch1, T.push)) * CURSE.FLINCH
      + smooth(seg(t, T.hold, T.gone)) * CURSE.DRAG;
    const tr = still ? [0, 0, 0] : tremble(t, T.press - 0.04 * k, T.gone, 0.008);
    return [Vp[0] - vx * back + tr[0], Vp[1] + tr[1], Vp[2] - vz * back + tr[2]];
  }
  function at(t) {
    const hands = {};
    let item = { x: P0[0], y: P0[1], z: P0[2], rx: 0, ry: 0, rz: 0 }, holder = null, rope = null, carryNow = null;
    /* 施放者：手掌從自己那側蓋上堆頂 → 推 → 推上手背 → 按住 → 收 */
    if (t < T.appr) {
      const u = easeOut(t / T.appr);
      hands.c = { pose: ['push', null, 0], anchor: 'palm', at: [P0[0] - cx * 0.6 * (1 - u), P0[1] + palmOn + 0.20 * (1 - u), P0[2] - cz * 0.6 * (1 - u)], yaw: cyaw, pitch: CURSE.C_PITCH };
    } else if (t < T.press) {
      let p;
      if (t < T.push) {
        /* via（tray 給，可省）：直線推會擦過別件拍品時，先貼桌往前拉到 via 再推過去（貼桌推，不從別件身上飛過） */
        const u = smooth(seg(t, T.appr, T.push)), V = via ? [via[0], from.y, via[1]] : null;
        p = V ? (u < 0.4 ? lerp3(P0, V, u / 0.4) : lerp3(V, P1t, (u - 0.4) / 0.6)) : lerp3(P0, P1t, u); item = { x: p[0], y: p[1], z: p[2], rx: 0, rz: Math.sin(t * 2 * Math.PI * 9) * 0.03 * Math.sin(Math.PI * u), ry: Math.sin(Math.PI * u) * 0.25 }; }
      else { const u = smooth(seg(t, T.push, T.press)); p = lerp3(P1t, P1, u); item = { x: p[0], y: p[1], z: p[2], rx: 0, rz: 0, ry: 0 }; }
      holder = 'c'; carryNow = carry;
      /* 手掌蓋在堆頂推：手指朝向「自己席位 → 符紙堆現在的位置」（跟著堆轉，指尖不伸進別件拍品）。 */
      hands.c = { pose: ['push', 'spread', t < T.push ? 0 : smooth(seg(t, T.push, T.press))], anchor: 'palm', at: [p[0], p[1] + palmOn, p[2]], yaw: Math.atan2(p[0] - seatC.x, p[2] - seatC.z), pitch: CURSE.C_PITCH }; // 推時五指併攏（拇指收著，不掃到別件），按上手背前張開
    } else {
      const vp = victimPalm(t), vs = victimPalm(t, true); // 符紙堆被按在手背上：跟著手被拖回（不跟著細顫，按住的那隻手壓著它）
      const drag = [vs[0] - Vp[0], vs[2] - Vp[2]];
      item = { x: P1[0] + drag[0], y: P1[1], z: P1[2] + drag[1], rx: 0, rz: 0, ry: 0 };
      holder = 'v';
      if (t < T.hold) {
        const press = smooth(seg(t, T.press, T.press + 0.06 * k)) * CURSE.PRESS;
        hands.c = { pose: ['spread', null, 0], anchor: 'palm', at: [item.x, item.y + palmOn - press, item.z], yaw: yawEnd, pitch: CURSE.C_PITCH };
        rope = { grow: smooth(seg(t, T.press, T.press + CURSE.ROPE_GROW * k)), wrist: [vp[0] - vx * CURSE.WRIST, vp[1], vp[2] - vz * CURSE.WRIST], pile: [item.x, item.y, item.z], yaw: vyaw };
      } else if (t < T.gone) {
        const u = easeIn(seg(t, T.hold, T.gone));
        hands.c = { pose: ['spread', null, 0], anchor: 'palm', at: [item.x - Math.sin(yawEnd) * GRAB.RETRACT_DIST * u, item.y + palmOn + GRAB.RETRACT_LIFT * u, item.z - Math.cos(yawEnd) * GRAB.RETRACT_DIST * u], yaw: yawEnd, pitch: CURSE.C_PITCH };
      }
    }
    if (hands.c) hands.c.at = [hands.c.at[0] - Math.sin(hands.c.yaw) * CURSE.PALM_BACK, hands.c.at[1], hands.c.at[2] - Math.cos(hands.c.yaw) * CURSE.PALM_BACK];
    /* 受害者：伸出平放、想縮又被逼回、被按住後抖，最後拖著符紙堆縮回 */
    if (t >= VT.reach0 && t < T.gone) hands.v = { pose: ['spread', 'rake', 0.15], anchor: 'palm', at: victimPalm(t), yaw: vyaw, pitch: 0.05 };
    for (const r of ['c', 'v']) if (!(r in hands)) hands[r] = null;
    return { hands, item, holder, carry: carryNow, foot: footAt([item.x, item.y, item.z]), rope, visible: t < hideAt, landed: t >= landAt };
  }
  return { kind: 'curse', landAt, hideAt, end, dest: { x: P1[0], y: P1[1], z: P1[2] }, roles: { c: true, v: true }, at,
    holdFrom: T.press, holdTo: T.hold };
}

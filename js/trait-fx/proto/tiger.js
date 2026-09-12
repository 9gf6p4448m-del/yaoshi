// 妖市 — 虎爺印（biteGamble）演出原型 A／B／C（2026-09-12，給製作人挑的候選，**不是正式版**）
//
// 背景：0.55 批 0 的「徽記剪影」把一片平面單色 billboard 貼在紙紮 3D 上，製作人判定像剪貼畫。
// 新方向：**招式演出＝本體動作＋小型紙紮道具＋受招方反應**；法寶身分由 3D 本體承擔，不靠 logo。
//
// 三版共同骨架（缺一不可）：
//   ① 虎本體真的撲（tiger_c 有 34 根骨：Rump／Hips／Spine／Chest／NeckB／Neck2／HeadRoot／Brow／Muzzle／
//      Nose／JawRoot／Jaw1／JawTip／Tail*／四肢；整體位移走 st.move，體積脈動走 st.scale）
//   ② 受招方被咬的反應（st.flinch ＋ 壓縮 st.scale ＋ 邊光）
//   ③ 一枚**紙紮印文**留在受招方身上（st.paperStamp：擠出厚度＋ink 墨線描邊＋翹曲，朝向凍住不 billboard）
//
// 差異：A＝撲咬為主（本體動作最大、印文最小）／B＝印為主（大印從天砸下，落地重音）／
//       C＝香火為主（金箔顆粒流，印文被「燒」出來）。
//
// tier 1（260ms）與 tier 2（900ms）**共用同一支函式**，時間軸一律由 st.beat 換算（0.55 既有做法，
// 三套各寫一份會立刻分岔）。色碼一律走 st.colors，尺寸一律走 st.iconSize／st.markSize。
import * as THREE from 'three';

const _v = new THREE.Vector3();
/** 印記往鏡頭方向的偏移。對決機位在世界 +X（camera-director 的 DUEL_SHOT，yaw 90°），
 *  印記不往 +X 推就有一半埋進受招方模型裡——MAT_SOLID 開 depthTest，埋進去的那半會被切掉，
 *  第 2 輪的連拍上「蓋印」那一格因此只看得到一小角。 */
const TOWARD_CAM = new THREE.Vector3(0.26, 0.07, 0);

/** 三版共用的取角色：出招的虎、被咬的獵物、朝向、四個時間切點 */
function cast(st) {
  const cat = st.byBody(st.actor, 'elite')[0] || st.actor[0];
  const prey = st.biggest(st.target) || st.target[0] || null;
  const B = st.beat;
  const LAST = st.ms * 0.88; // 收勢抵達點（0.55 既有值：fill 0.88 ≥0.85、tier 1 不必加速）
  return {
    cat, prey, B, LAST,
    fwd: st.toward(cat, new THREE.Vector3()),
    W: B.windup[1], T0: B.travel[0], TL: B.travel[1] - B.travel[0], R0: B.react[0], RL: LAST - B.react[0],
    jaw: (() => { const p = st.worldOf(cat, 'JawTip', new THREE.Vector3()); if (!p.lengthSq()) st.worldOf(cat, null, p); return p; })(),
    hit: prey ? st.worldOf(prey, null, new THREE.Vector3()) : st.worldOf(cat, null, new THREE.Vector3()).addScaledVector(st.dir, 1.2),
  };
}

/** 蹲伏（k＝幅度倍率，1＝A 版的滿幅）。回傳的值給接下來的撲用。 */
function crouch(st, cat, fwd, k, e) {
  st.rot(cat, 'Rump', 0.26 * k * e); st.rot(cat, 'Hips', 0.20 * k * e);
  st.rot(cat, 'Spine', -0.30 * k * e); st.rot(cat, 'Chest', -0.38 * k * e);
  st.rot(cat, 'NeckB', -0.46 * k * e); st.rot(cat, 'Neck2', -0.34 * k * e); st.rot(cat, 'HeadRoot', 0.22 * k * e);
  st.rot(cat, 'JawRoot', 0.62 * k * e); st.rot(cat, 'Jaw1', 0.40 * k * e); st.rot(cat, 'JawTip', 0.28 * k * e);
  st.rot(cat, 'TailRoot', -0.52 * k * e); st.rot(cat, 'Tail1', -0.40 * k * e); st.rot(cat, 'Tail2', -0.30 * k * e); st.rot(cat, 'TailTip', -0.24 * k * e);
  st.rot(cat, 'LBack1Kn', 0.62 * k * e); st.rot(cat, 'RBack1Kn', 0.62 * k * e);
  st.rot(cat, 'LFrontElbow1El', 0.44 * k * e); st.rot(cat, 'RFrontElbow1El', 0.44 * k * e);
  st.move(cat, -fwd.x * 0.16 * k * e, -0.06 * k * e, -fwd.z * 0.16 * k * e);
  st.scale(cat, 1 - 0.025 * k * e); // 蓄力＝整尊微壓（第 2 輪：0.05 太重，整尊像洩氣而不是壓低重心）
}

/** 撲出（dist＝往前衝多遠，arc＝拋物線高度，k＝上半身伸展幅度） */
function lunge(st, cat, fwd, dist, arc, k, e) {
  const back = -0.16 * k;
  st.move(cat, fwd.x * (back + (dist - back) * e), -0.06 * k + arc * Math.sin(Math.PI * e), fwd.z * (back + (dist - back) * e));
  st.scale(cat, 1 - 0.025 * k + (0.025 * k + 0.10 * k) * Math.sin(Math.PI * e)); // 壓低 → 空中伸展 → 回
  st.rot(cat, 'Rump', 0.26 * k * (1 - e) - 0.14 * k * e); st.rot(cat, 'Hips', 0.20 * k * (1 - e) - 0.10 * k * e);
  st.rot(cat, 'Spine', -0.30 * k + 0.46 * k * e); st.rot(cat, 'Chest', -0.38 * k + 0.58 * k * e);
  st.rot(cat, 'NeckB', -0.46 * k + 0.68 * k * e); st.rot(cat, 'Neck2', -0.34 * k + 0.50 * k * e);
  st.rot(cat, 'LFrontRoot1Rt', -1.15 * k * e); st.rot(cat, 'LFrontElbow1El', 0.44 * k - 0.50 * k * e); st.rot(cat, 'LFrontToe1To', -0.40 * k * e);
  st.rot(cat, 'RFrontRoot1Rt', -0.96 * k * e); st.rot(cat, 'RFrontElbow1El', 0.44 * k - 0.42 * k * e); st.rot(cat, 'RFrontToe1To', -0.40 * k * e);
  st.rot(cat, 'LBack1Kn', 0.62 * k - 0.86 * k * e); st.rot(cat, 'RBack1Kn', 0.62 * k - 0.86 * k * e);
  st.rot(cat, 'TailRoot', -0.52 * k + 0.70 * k * e); st.rot(cat, 'Tail1', -0.40 * k + 0.56 * k * e);
  st.rot(cat, 'JawRoot', 0.62 * k + 0.30 * k * e); st.rot(cat, 'Jaw1', 0.40 * k + 0.22 * k * e); st.rot(cat, 'JawTip', 0.28 * k + 0.16 * k * e);
}

/** 咬合：下顎猛闔＋鼻樑皺起 */
function snapJaw(st, cat, k, e) {
  st.rot(cat, 'JawRoot', 0.92 * k - 1.06 * k * e); st.rot(cat, 'Jaw1', 0.62 * k - 0.70 * k * e); st.rot(cat, 'JawTip', 0.44 * k - 0.50 * k * e);
  st.rot(cat, 'Muzzle', -0.16 * k * e); st.rot(cat, 'Nose', -0.14 * k * e); st.rot(cat, 'Brow', -0.22 * k * e);
  st.rot(cat, 'HeadRoot', 0.16 * k + 0.24 * k * e);
}

/** 收勢：所有覆寫線性歸零（k＝1−e） */
function recover(st, cat, fwd, dist, k) {
  st.move(cat, fwd.x * dist * k, 0.03 * k, fwd.z * dist * k);
  st.scale(cat, 1 + 0.04 * k);
  st.rot(cat, 'Rump', -0.06 * k); st.rot(cat, 'Hips', -0.05 * k); st.rot(cat, 'Spine', 0.12 * k); st.rot(cat, 'Chest', 0.16 * k);
  st.rot(cat, 'NeckB', 0.18 * k); st.rot(cat, 'Neck2', 0.14 * k); st.rot(cat, 'HeadRoot', 0.40 * k);
  st.rot(cat, 'JawRoot', -0.14 * k); st.rot(cat, 'Jaw1', -0.08 * k); st.rot(cat, 'JawTip', -0.06 * k);
  st.rot(cat, 'Muzzle', -0.16 * k); st.rot(cat, 'Nose', -0.14 * k); st.rot(cat, 'Brow', -0.22 * k);
  st.rot(cat, 'TailRoot', 0.18 * k); st.rot(cat, 'Tail1', 0.16 * k); st.rot(cat, 'Tail2', 0.10 * k); st.rot(cat, 'TailTip', 0.08 * k);
  st.rot(cat, 'LFrontRoot1Rt', -1.15 * k); st.rot(cat, 'LFrontElbow1El', -0.06 * k); st.rot(cat, 'LFrontToe1To', -0.40 * k);
  st.rot(cat, 'RFrontRoot1Rt', -0.96 * k); st.rot(cat, 'RFrontElbow1El', 0.02 * k); st.rot(cat, 'RFrontToe1To', -0.40 * k);
  st.rot(cat, 'LBack1Kn', -0.24 * k); st.rot(cat, 'RBack1Kn', -0.24 * k);
}

/** 受招方：壓扁＋抖動（st.flinch 只給退縮，這一支補「被咬住」的體感） */
function preyHit(st, prey, R0, RL, depth) {
  if (!prey) return;
  st.flinch([prey], { delay: R0, ms: RL * 0.8, strength: 2.4, burst: false });
  st.tween({ ms: RL * 0.9, delay: R0, ease: 'snap', update(t, e) {
    st.scale(prey, 1 - depth * e);
    st.rot(prey, 'Chest', 0.26 * e * Math.sin(e * 26)); // 抖
    st.rot(prey, 'HeadRoot', 0.22 * e * Math.sin(e * 19));
    st.rim(prey, 1 + 3.2 * e);
  } });
}

/* ══════════════════════════════════════════════════════════════════════════
   A｜撲咬為主：本體動作最大（滿幅蹲伏→大跨距躍出→咬合），印文最小。
   印是虎叼在口中的一枚小紙印，隨撲擊飛到咬點，咬中後烙在獵物胸口。
   ══════════════════════════════════════════════════════════════════════════ */
function tigerA(st) {
  const { cat, prey, LAST, fwd, W, T0, TL, R0, RL, jaw, hit } = cast(st);
  const C = st.colors;
  const DIST = 1.15; // 本版的招牌：跨距最大
  const stamp = st.paperStamp(st.kind, jaw, { color: C.hot, inkColor: C.ink, opacity: 0, depth: 0.26, warp: 0.16, tiltDeg: 12, yawDeg: -30, glyph: true });
  // 第 2 輪：0.55×markSize（≈0.11 世界單位）在 780×360 的格子上是一顆紅點，三張連拍都看不到它。
  // 本版仍是三版裡最小的一枚（B 的大印是 iconSize 級、C 的印文 1.45×），但要大到讀得出是「一塊有厚度的紅印」。
  stamp.scale.setScalar(st.markSize * 1.1);
  const q0 = stamp.quaternion.clone(); // 開演當下凍住的朝向；落點要回到它（翻滾角度亂七八糟＝像被隨手貼上去）

  st.phase('windup');
  st.tween({ ms: W, ease: 'out', update(t, e) {
    crouch(st, cat, fwd, 1, e);
    st.rim(cat, 1 + 1.6 * e);
    st.alpha(stamp, Math.min(1, e * 2.4));
    stamp.scale.setScalar(st.markSize * (0.55 + 0.55 * e));
    st.worldOf(cat, 'JawTip', _v); stamp.position.copy(_v); // 印含在口中，跟著下顎走
  }, done() { st.phase('travel'); } });

  st.tween({ ms: TL * 0.66, delay: T0, ease: 'outQuint', update(t, e) { lunge(st, cat, fwd, DIST, 0.30, 1, e); } });
  /* ★不用 st.trail 的那條線★（第 2 輪）：MAT_LINE 在 WebGL 只畫得出 1px，拍出來就是盲讀原話的
     「一條白色虛線」（ART_BIBLE §10.5 退役清單第 4 條）。本版的飛行感改由「印自己翻滾著飛」承擔——
     這也正是 A 版的立場：道具最少，動作說完整件事。 */
  st.tween({ ms: TL, delay: T0, ease: 'in',
    update(t, e) {
      stamp.position.lerpVectors(jaw, hit, e);
      stamp.position.y += 0.18 * Math.sin(Math.PI * e);
      stamp.rotateZ(0.14); // 翻滾（每幀累加＝紙片在空中轉）
    },
    done() {
      st.phase('react');
      st.burst(hit, { power: 1.2, n: 70, color: C.hot });
      st.punch(0.55);
      stamp.quaternion.copy(q0); stamp.rotateZ(0.16); // 蓋下來時角度回正（只留一點歪＝手蓋的）
      if (prey) st.stick(stamp, prey, { at: 'chest', off: TOWARD_CAM });
    } });
  st.tween({ ms: TL * 0.34, delay: T0 + TL * 0.66, ease: 'outQuint', update(t, e) { snapJaw(st, cat, 1, e); } });

  // 印烙上去：過衝後收實（back），最後淡出
  st.tween({ ms: RL * 0.55, delay: R0, ease: 'back', update(t, e) { stamp.scale.setScalar(st.markSize * (2.4 - 0.8 * e)); } });
  preyHit(st, prey, R0, RL, 0.14);

  st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) { recover(st, cat, fwd, DIST * 0.92, 1 - e); st.rim(cat, 1 + 1.6 * (1 - e)); } });
}

/* ══════════════════════════════════════════════════════════════════════════
   B｜印為主：虎只輕撲，一枚**大印**從虎頭上方橫移到獵物頭頂再砸下來，
   落地一記重音（震動＋香火貼桌方陣），大印彈起淡出、留下小印文。
   香火系的節奏是「蓄—落—餘 三拍」，本版把那個「落」做成整招的重音。
   ══════════════════════════════════════════════════════════════════════════ */
function tigerB(st) {
  const { cat, prey, LAST, fwd, W, T0, TL, R0, RL, hit } = cast(st);
  const C = st.colors;
  const DIST = 0.46; // 虎只輕撲：本體讓位給印
  // 第 2 輪：+0.30 把大印推出畫面上緣（對決機位 tilt 24°、dist 4.2，頭頂再往上就出框）。
  // 改成「頭前一點、只高一點」，並往鏡頭方向拉一些，讓它在第一格就整片看得到。
  const head = st.top(cat, new THREE.Vector3()); head.y += 0.06; head.addScaledVector(st.dir, 0.18);
  const over = hit.clone(); over.y += 0.40; // 獵物頭頂上方：大印砸下來之前的懸停點（+0.58 也會出框）
  const land = hit.clone(); land.y += 0.10;
  const big = st.paperStamp(st.kind, head, { role: 'stamp', color: C.key, inkColor: C.ink, opacity: 0, depth: 0.26, warp: 0.08, tiltDeg: 28, yawDeg: -20, glyph: true });
  big.scale.setScalar(st.iconSize * 0.70);
  const seal = prey ? st.paperStamp(st.kind, hit, { color: C.hot, inkColor: C.ink, opacity: 0, depth: 0.24, warp: 0.18, tiltDeg: 14, yawDeg: -26, glyph: true, follow: prey, off: TOWARD_CAM }) : null;
  if (seal) seal.scale.setScalar(st.markSize * 1.3);
  const chime = st.ring(st.foot(prey || cat, new THREE.Vector3()), 0.36, 0.06, { color: C.key, opacity: 0 }); // 香火專屬：貼桌陣

  st.phase('windup');
  st.tween({ ms: W, ease: 'out', update(t, e) {
    /* 0.45 → 0.60：PHASE_GATE.windupBone 是 0.08，而 windup 只量打點後 120ms×k 的窗
       （tier 2 的窗只走到這條 tween 的 e≈0.4）⇒ 0.45 幅度量到 0.083，只剩 0.003 的餘裕。
       這不是把門檻搬下來，是把**動作做足**：0.60 仍然明顯小於 A 的滿幅（本版的立場是虎讓位給印）。 */
    crouch(st, cat, fwd, 0.60, e);
    st.rot(cat, 'HeadRoot', 0.16 * 0.60 * e - 0.24 * e); // 抬頭看印
    st.rim(cat, 1 + 1.2 * e);
    st.alpha(big, Math.min(1, e * 2.0));
    big.scale.setScalar(st.iconSize * (0.34 + 0.42 * e));
    big.position.copy(head); big.position.y += 0.10 * Math.sin(Math.PI * e); // 蓄：先浮一下
  }, done() { st.phase('travel'); } });

  // 橫移到獵物頭頂（travel 的位移來源＝這一段），再砸下
  st.tween({ ms: TL * 0.52, delay: T0, ease: 'out', update(t, e) {
    big.position.lerpVectors(head, over, e); big.position.y += 0.16 * Math.sin(Math.PI * e);
    big.rotateZ(0.045 * (1 - e));
  } });
  st.tween({ ms: TL * 0.48, delay: T0 + TL * 0.52, ease: 'in', update(t, e) {
    big.position.lerpVectors(over, land, e);
    big.scale.setScalar(st.iconSize * (0.76 + 0.28 * e)); // 砸下來時逼近鏡頭般脹大
  }, done() {
    st.phase('react');
    st.burst(land, { power: 1.5, n: 90, color: C.hot });
    st.punch(0.9);
  } });
  st.tween({ ms: TL * 0.40, delay: T0 + TL * 0.60, ease: 'outQuint', update(t, e) { lunge(st, cat, fwd, DIST, 0.12, 0.5, e); } });

  // 落地重音：大印彈一下再淡出、貼桌方陣漲開、小印文浮出
  st.tween({ ms: RL * 0.45, delay: R0, ease: 'back', update(t, e) { big.scale.setScalar(st.iconSize * (1.04 - 0.28 * e)); big.position.y = land.y + 0.10 * Math.sin(Math.PI * e); } });
  st.fade(big, { ms: RL * 0.45, delay: R0 + RL * 0.40, from: 1, to: 0 });
  st.tween({ ms: RL * 0.70, delay: R0, ease: 'out', update(t, e) { chime.scale.setScalar(0.4 + 1.5 * e); } });
  st.fade(chime, { ms: RL * 0.70, delay: R0, from: 0.85, to: 0 });
  if (seal) {
    st.fade(seal, { ms: RL * 0.22, delay: R0 + RL * 0.12, from: 0, to: 1 });
    st.tween({ ms: RL * 0.55, delay: R0 + RL * 0.12, ease: 'back', update(t, e) { seal.scale.setScalar(st.markSize * (3.0 - 1.1 * e)); } });
  }
  st.tween({ ms: RL * 0.5, delay: R0 + RL * 0.35, ease: 'outQuint', update(t, e) { snapJaw(st, cat, 0.5, e); } }); // 補一口輕咬
  preyHit(st, prey, R0, RL, 0.18); // 被印壓住：壓得比 A 深

  st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) { recover(st, cat, fwd, DIST * 0.9, 1 - e); st.rim(cat, 1 + 1.2 * (1 - e)); } });
}

/* ══════════════════════════════════════════════════════════════════════════
   C｜香火為主：撲擊時背上的香火燒旺，六片金箔（香火系語彙「金箔片／顆粒流」）被拉著飛向獵物，
   咬中炸開成金色紙錢；印文先是暗的 ink 色，命中那一刻**由暗轉硃紅＝被燒出來**。
   ══════════════════════════════════════════════════════════════════════════ */
function tigerC(st) {
  const { cat, prey, LAST, fwd, W, T0, TL, R0, RL, jaw, hit } = cast(st);
  const C = st.colors;
  const DIST = 0.88;
  const spine = st.worldOf(cat, 'Spine', new THREE.Vector3());
  const FOILS = 9; // 第 2 輪：6 片在 780×360 上只剩兩三顆金點，顆粒流讀不出來
  const foils = [];
  for (let i = 0; i < FOILS; i++) {
    const f = i / (FOILS - 1);
    // 第 3 輪：原本 −0.16…+0.14 的跨距讓九片擠成一坨金色團塊；沿脊背拉開，再往鏡頭方向散開
    const p = spine.clone().addScaledVector(st.dir, -0.34 + 0.72 * f);
    p.x += (st.rnd() - 0.5) * 0.22;
    p.y += 0.06 + 0.26 * Math.sin(Math.PI * f);
    const m = st.spawn(new THREE.Mesh(new THREE.PlaneGeometry(0.105, 0.145), st.solid(C.key, 0)), 'foil');
    m.position.copy(p);
    m.rotation.set(0.5 * st.rnd(), Math.PI * 0.5 + 0.8 * st.rnd(), 0.6 * st.rnd());
    foils.push({ m, from: p.clone(), f });
  }
  const seal = st.paperStamp(st.kind, jaw, { color: C.ink, inkColor: C.ink, opacity: 0, depth: 0.26, warp: 0.18, tiltDeg: 14, yawDeg: -26, glyph: true, glyphColor: C.line });
  seal.scale.setScalar(st.markSize * 1.0);
  const q0 = seal.quaternion.clone();
  const face = seal.userData.fxFace; // 印文面板：命中那一刻由 ink 燒成 hot
  const cInk = new THREE.Color(C.ink), cHot = new THREE.Color(C.hot);

  st.phase('windup');
  st.tween({ ms: W, ease: 'out', update(t, e) {
    crouch(st, cat, fwd, 0.78, e);
    st.rim(cat, 1 + 3.0 * e); // 香火燒旺：邊光是本版最強的一版
    st.alpha(seal, Math.min(1, e * 2.2));
    seal.scale.setScalar(st.markSize * (0.6 + 0.6 * e));
    st.worldOf(cat, 'JawTip', _v); seal.position.copy(_v);
  }, done() { st.phase('travel'); } });
  foils.forEach((o, i) => {
    st.fade(o.m, { ms: W * 0.5, delay: W * 0.25 + i * (W * 0.05), from: 0, to: 0.95 });
    st.tween({ ms: W * 0.75, delay: W * 0.25, ease: 'out', update(t, e) { o.m.position.y = o.from.y + 0.09 * e; o.m.rotation.z += 0.10; } });
  });

  st.tween({ ms: TL * 0.68, delay: T0, ease: 'outQuint', update(t, e) { lunge(st, cat, fwd, DIST, 0.22, 0.85, e); } });
  // 同 A：不用 MAT_LINE 的 1px 拖尾（退役清單第 4 條）；本版的「飛過去」由九片金箔的顆粒流承擔
  st.tween({ ms: TL, delay: T0, ease: 'in',
    update(t, e) { seal.position.lerpVectors(jaw, hit, e); seal.position.y += 0.14 * Math.sin(Math.PI * e); seal.rotateZ(0.10); },
    done() {
      st.phase('react');
      st.burst(hit, { power: 1.3, n: 80, color: C.hot });
      st.burst(hit, { power: 0.8, n: 40, color: C.key }); // 第二波＝金色紙錢
      st.punch(0.6);
      seal.quaternion.copy(q0); seal.rotateZ(-0.13);
      if (prey) st.stick(seal, prey, { at: 'chest', off: TOWARD_CAM });
    } });
  // 金箔被撲擊拉成一串飛過去（travel 段的第二個位移來源）
  foils.forEach((o, i) => {
    const to = hit.clone(); to.x += (st.rnd() - 0.5) * 0.30; to.y += 0.10 + (st.rnd() - 0.5) * 0.26; to.z += (st.rnd() - 0.5) * 0.30;
    st.tween({ ms: TL * 0.85, delay: T0 + i * (TL * 0.04), ease: 'in', update(t, e) {
      o.m.position.lerpVectors(o.from, to, e); o.m.position.y += 0.14 * Math.sin(Math.PI * e); o.m.rotation.z += 0.16;
    } });
    st.fade(o.m, { ms: RL * 0.55, delay: R0 + i * (RL * 0.03), from: 0.95, to: 0 });
  });
  st.tween({ ms: TL * 0.32, delay: T0 + TL * 0.68, ease: 'outQuint', update(t, e) { snapJaw(st, cat, 0.85, e); } });

  // 印文被燒出來：面板顏色由暗轉硃紅，同時收實
  st.tween({ ms: RL * 0.5, delay: R0, ease: 'out', update(t, e) {
    face.material.color.copy(cInk).lerp(cHot, Math.min(1, e * 1.3));
    seal.scale.setScalar(st.markSize * (2.6 - 0.9 * e));
  } });
  preyHit(st, prey, R0, RL, 0.12);

  st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) { recover(st, cat, fwd, DIST * 0.9, 1 - e); st.rim(cat, 1 + 3.0 * (1 - e)); } });
}

/* ══════════════════════════════════════════════════════════════════════════
   D｜C 的華麗 ＋ B 的落地重音（2026-09-12 製作人裁定）
   金箔顆粒流（C）＋咬中炸金色紙錢（C）＋印文由暗燒成硃紅（C）
   ＋大印砸落、落地震動、香火貼桌陣、彈起留印文（B）。

   ★兩個和 B 不一樣的作法★
   ① **印面朝下與讀得到兼顧**：大印的俯仰角是**逐幀算的**（不是 spawn 當下凍住的固定值）——
      橫移時 10°→30°、砸落時 30°→46°（印面朝下、仍有 44° 的面對著鏡頭），
      落地那一刻 2 幀內拉回 6°＝**正面對鏡頭**，之後才彈起。
   ② **金箔走 InstancedMesh**：九片＝1 個 draw call（C 版是九個各自的 Mesh，那是 C 貴在哪的主因）。
      逐片的出場錯開改用「縮放從 0 長出來」做，材質只有一支（整條流一起淡出）。

   時間軸（具名切點；報告要算「落印拍在 t1 佔幾 ms」）：
     蓄勢       0        → W*0.78         t1(300ms) 0–81      t2(900ms) 0–234
     大印橫移   W*0.78   → T0+TL*0.35     t1 81–140           t2 234–391
     大印砸落   ↑        → B.travel[1]    t1 140–208（68ms）  t2 391–560（169ms）
     落地重音   R0       → LAST           t1 208–264（56ms）  t2 560–792（232ms）
   ══════════════════════════════════════════════════════════════════════════ */
function tigerD(st) {
  const { cat, prey, LAST, fwd, B, W, T0, TL, R0, RL, jaw, hit } = cast(st);
  const C = st.colors;
  const DIST = 0.80;
  const tW = W * 0.78; // 蓄勢壓縮：讓出來的時間全部給落印拍
  const tCarry = T0 + TL * 0.35; // 橫移結束＝砸落開始
  const tLand = B.travel[1]; // 砸落結束＝react 起點
  void jaw;

  // ── 大印（B 的重音）：俯仰逐幀算，不用 paperStamp 凍住的那個固定傾角 ──
  const head = st.top(cat, new THREE.Vector3()); head.y += 0.06; head.addScaledVector(st.dir, 0.18);
  const over = hit.clone(); over.y += 0.40;
  const land = hit.clone(); land.y += 0.10;
  /* ★迴圈第 2 輪的結論：大印不能做成「鎏金印面＋暗字」★
     鎏金 C.key（#ffc21e）越過 bloom 門檻（js/renderer.js BLOOM.threshold 0.7）之後往白色去，
     光暈的半徑比字的筆畫還寬，放大看就是一塊**沒有字的金磚**（scratchpad/rec-D/zoom-land.png 第 1 版）。
     把字加粗到 w 0.40 仍然吃不住——這是 ART_BIBLE §10.2 第 5 條那個機制的另一個面向：
     **越亮的東西越留不住細節**。解法一樣是換配置而不是調 bloom：
       印面＝ink 暗底（留得住細節）、印身與厚度＝鎏金（亮，遠看認得出是金印）、字＝鎏金（會發光的那個才是主角）。
     這也正好是實體印章的樣子：金邊、暗印面、陽刻的字。 */
  const big = st.paperStamp(st.kind, head, { role: 'stamp', color: C.ink, inkColor: C.key, glyphColor: C.key, opacity: 0, depth: 0.26, warp: 0.08, tiltDeg: 0, yawDeg: -12, glyph: { cx: 0, cy: -0.40, w: 0.52, h: 0.25 } });
  big.scale.setScalar(st.iconSize * 0.78);
  const qBig = big.quaternion.clone(); // 只朝鏡頭、還沒加俯仰的基準
  const pitchTo = (deg, roll) => { big.quaternion.copy(qBig); big.rotateX(THREE.MathUtils.degToRad(deg)); if (roll) big.rotateZ(roll); };
  pitchTo(6);

  // ── 印文（C 的機制）：先是暗的，落地那一刻由 ink 燒成 hot ──
  const seal = prey ? st.paperStamp(st.kind, hit, { color: C.ink, inkColor: C.ink, glyphColor: C.line, opacity: 0, depth: 0.24, warp: 0.18, tiltDeg: 14, yawDeg: -24, glyph: true, follow: prey, off: TOWARD_CAM }) : null;
  if (seal) seal.scale.setScalar(st.markSize * 1.2);
  const face = seal ? seal.userData.fxFace : null;
  const cInk = new THREE.Color(C.ink), cHot = new THREE.Color(C.hot);
  const chime = st.ring(st.foot(prey || cat, new THREE.Vector3()), 0.36, 0.06, { color: C.key, opacity: 0 }); // 香火貼桌陣

  // ── 金箔顆粒流（C 的量級，但九片＝1 個 draw call）──
  const FOILS = 9;
  const spine = st.worldOf(cat, 'Spine', new THREE.Vector3());
  const foils = [];
  for (let i = 0; i < FOILS; i++) {
    const f = i / (FOILS - 1);
    const from = spine.clone().addScaledVector(st.dir, -0.34 + 0.72 * f);
    from.x += (st.rnd() - 0.5) * 0.22;
    from.y += 0.06 + 0.26 * Math.sin(Math.PI * f);
    const to = hit.clone();
    to.x += (st.rnd() - 0.5) * 0.30; to.y += 0.10 + (st.rnd() - 0.5) * 0.26; to.z += (st.rnd() - 0.5) * 0.30;
    foils.push({ from, to, p: from.clone(), rz: st.rnd() * 3, ry: Math.PI * 0.5 + 0.8 * st.rnd(), s: 0, t0: 0.10 * i });
  }
  const foilIm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.105, 0.145), st.solid(C.key, 0.95), FOILS);
  foilIm.frustumCulled = false; // 實例中心在原點，包圍盒對不上，不關會被整批剔掉
  st.spawn(foilIm, 'foil');
  const _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _eu = new THREE.Euler(), _sc = new THREE.Vector3();
  const writeFoils = () => {
    for (let i = 0; i < FOILS; i++) {
      const o = foils[i];
      _eu.set(0, o.ry, o.rz); _q4.setFromEuler(_eu);
      _m4.compose(o.p, _q4, _sc.setScalar(o.s));
      foilIm.setMatrixAt(i, _m4);
    }
    foilIm.instanceMatrix.needsUpdate = true;
  };
  writeFoils();

  /* ① 蓄勢：蹲伏做足（B 那個 windup 餘裕只剩 0.003 的教訓——幅度 0.85，不是踩線的 0.45），
        香火燒旺（邊光 3.0），金箔一片片從虎背長出來，大印在虎頭前浮現 */
  st.phase('windup');
  st.tween({ ms: tW, ease: 'out', update(t, e) {
    crouch(st, cat, fwd, 0.85, e);
    st.rim(cat, 1 + 3.0 * e);
    st.alpha(big, Math.min(1, e * 2.2));
    big.scale.setScalar(st.iconSize * (0.36 + 0.42 * e));
    big.position.copy(head); big.position.y += 0.08 * Math.sin(Math.PI * e);
    pitchTo(6 + 4 * e);
    for (let i = 0; i < FOILS; i++) { const o = foils[i]; o.s = Math.max(0, Math.min(1, (e - o.t0) * 2.6)); o.p.copy(o.from); o.p.y += 0.09 * e; o.rz += 0.05 * o.s; }
    writeFoils();
  }, done() { st.phase('travel'); } });

  /* ② 橫移：大印從虎頭飄到獵物頭頂，同時把印面壓下去（10°→30°）；虎撲出 */
  st.tween({ ms: tCarry - tW, delay: tW, ease: 'out', update(t, e) {
    big.position.lerpVectors(head, over, e);
    big.position.y += 0.14 * Math.sin(Math.PI * e);
    pitchTo(8 + 14 * e, 0.05 * (1 - e));
  } });
  st.tween({ ms: TL * 0.70, delay: T0, ease: 'outQuint', update(t, e) { lunge(st, cat, fwd, DIST, 0.22, 0.85, e); } });
  /* ③ 砸落：印面朝下（30°→46°，仍有 44° 面對鏡頭）、越落越大；金箔被拉成一條流跟著飛過去 */
  st.tween({ ms: tLand - tCarry, delay: tCarry, ease: 'in',
    update(t, e) {
      big.position.lerpVectors(over, land, e);
      big.scale.setScalar(st.iconSize * (0.78 + 0.18 * e));
      pitchTo(22 + 16 * e);
    },
    done() {
      st.phase('react');
      st.burst(land, { power: 1.5, n: 90, color: C.hot }); // 重音
      st.burst(land, { power: 0.9, n: 45, color: C.key }); // 金色紙錢
      st.punch(0.95);
    } });
  st.tween({ ms: (tLand - tW) * 0.92, delay: tW, ease: 'in', update(t, e) {
    for (let i = 0; i < FOILS; i++) {
      const o = foils[i];
      const k = Math.max(0, Math.min(1, (e - o.t0 * 0.6) / 0.7));
      o.p.lerpVectors(o.from, o.to, k); o.p.y += 0.14 * Math.sin(Math.PI * k); o.rz += 0.16; o.s = 1;
    }
    writeFoils();
  } });
  st.tween({ ms: TL * 0.30, delay: T0 + TL * 0.70, ease: 'outQuint', update(t, e) { snapJaw(st, cat, 0.85, e); } });

  /* ④ 落地重音（react）：前 2 幀把印面轉正對鏡頭＝「蓋章那一格」，之後彈起淡出；
        同一段裡貼桌陣漲開、印文由暗燒成硃紅、獵物被壓住 */
  const HOLD = Math.max(33, RL * 0.30); // 正面亮相至少 2 幀（60fps）
  st.tween({ ms: HOLD, delay: R0, ease: 'out', update(t, e) {
    pitchTo(38 - 34 * e); // 38°→4°：印面轉正
    big.scale.setScalar(st.iconSize * (1.05 - 0.10 * e));
    big.position.y = land.y - 0.03 * Math.sin(Math.PI * e); // 壓一下
  } });
  st.tween({ ms: RL - HOLD, delay: R0 + HOLD, ease: 'back', update(t, e) {
    big.position.y = land.y + 0.16 * Math.sin(Math.PI * e);
    big.scale.setScalar(st.iconSize * (0.95 - 0.32 * e));
  } });
  st.fade(big, { ms: (RL - HOLD) * 0.8, delay: R0 + HOLD + (RL - HOLD) * 0.2, from: 1, to: 0 });
  st.tween({ ms: RL * 0.75, delay: R0, ease: 'out', update(t, e) { chime.scale.setScalar(0.4 + 1.6 * e); } });
  st.fade(chime, { ms: RL * 0.75, delay: R0, from: 0.9, to: 0 });
  st.fade(foilIm, { ms: RL * 0.6, delay: R0, from: 0.95, to: 0 });
  if (seal && face) {
    st.fade(seal, { ms: RL * 0.18, delay: R0, from: 0, to: 1 });
    st.tween({ ms: RL * 0.85, delay: R0, ease: 'out', update(t, e) {
      face.material.color.copy(cInk).lerp(cHot, Math.min(1, e * 1.25)); // 印文被燒出來
      seal.scale.setScalar(st.markSize * (2.8 - 1.1 * e));
    } });
  }
  preyHit(st, prey, R0, RL, 0.18);

  st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) { recover(st, cat, fwd, DIST * 0.9, 1 - e); st.rim(cat, 1 + 3.0 * (1 - e)); } });
}

/* ══════════════════════════════════════════════════════════════════════════
   E｜C 的動作 ＋ B 的蓋印，但兩者**收在同一個衝擊拍**（2026-09-12 製作人裁定：
   「能不能動作維持 C 的華麗、只在最後是 B 的蓋印」）

   與 C 逐項相同：蹲伏 0.78、撲 DIST 0.88／arc 0.22、邊光 3.0、九片金箔顆粒流、
   咬中炸兩波（硃紅＋鎏金紙錢）、印文由暗燒成硃紅、收勢。
   與 D 不同的三件事：
   ① **大印不從虎頭橫移**——在虎起跳的**同一刻**（`T0`）於獵物**正上方**生成，垂直落下。
   ② **落地時刻＝咬中時刻**（都在 `R0`＝`B.travel[1]`）：震動、貼桌陣、紙錢炸、印文燒紅
      全部疊在這一拍，不是 D 那種「砸落」與「咬合」兩個先後的重音。
   ③ **金箔走 InstancedMesh，但移動的是 `InstancedMesh` 物件本身**（實例只帶局部散開量）。
      ★這一條不是效能潔癖，是為了讓因果三段的 travel 量得到★：`evalPhases()` 量的是
      `mesh.position`，而 InstancedMesh 的 position 永遠停在原點、實例位移藏在 matrix 裡——
      D 版能過 travel 是靠大印的**橫移**，E 的大印只垂直落下（落差 0.62 < 門檻 1.25），
      那條路沒了。把整個 foil 群當一個會飛的物件搬，1 個 draw call 又量得到位移。

   收勢抵達點：`LAST = ms*0.90`（C／D 是 0.88）。多出來的 2% 全給「正面亮相」那一拍，
   讓它從 2.0 幀變成 3.0 幀。**這不是動判準**：`fillOK` 的門檻 0.85 一個字元沒改，
   0.90 只是把原本空著的時間用掉（fill 0.88→0.90 是往嚴的方向走）；
   上限則卡在 tier 1 的 `rateOK ≤1.0`——橫在 0.9167×ms，0.90 是貼著它取的。
   ══════════════════════════════════════════════════════════════════════════ */
function tigerE(st) {
  const { cat, prey, fwd, B, W, T0, TL, R0, jaw, hit } = cast(st);
  void jaw;
  const C = st.colors;
  const DIST = 0.88; // ＝C
  const LAST = st.ms * 0.90;
  const RL = LAST - R0;
  const cInk = new THREE.Color(C.ink), cHot = new THREE.Color(C.hot);

  /* ── 大印（B 的蓋印）：獵物正上方垂直落下，落地＝咬中 ──
     配置＝「暗印面＋鎏金印身＋鎏金陽刻『虎』字」（§7 迴圈量到的：鎏金印面會被 bloom 吃掉字）。 */
  const land = hit.clone(); land.y += 0.10;
  const sky = land.clone(); sky.y += 0.62; // 再高就出畫面上緣（對決機位 tilt 24°／dist 4.2）
  const big = st.paperStamp(st.kind, sky, { role: 'stamp', color: C.ink, inkColor: C.key, glyphColor: C.line,
    opacity: 0, depth: 0.26, warp: 0.08, tiltDeg: 0, yawDeg: -12, glyph: { cx: 0, cy: -0.42, w: 0.66, h: 0.32 } });
  big.scale.setScalar(st.iconSize * 0.80);
  const qBig = big.quaternion.clone();
  const pitchTo = (deg) => { big.quaternion.copy(qBig); big.rotateX(THREE.MathUtils.degToRad(deg)); };
  pitchTo(30);

  // ── 印文（C 的機制）：落地那一刻才出現，由暗燒成硃紅，之後留在獵物身上 ──
  const seal = prey ? st.paperStamp(st.kind, hit, { color: C.ink, inkColor: C.ink, glyphColor: C.line,
    opacity: 0, depth: 0.24, warp: 0.18, tiltDeg: 14, yawDeg: -24, glyph: true, follow: prey, off: TOWARD_CAM }) : null;
  if (seal) seal.scale.setScalar(st.markSize * 1.2);
  const face = seal ? seal.userData.fxFace : null;
  const chime = st.ring(st.foot(prey || cat, new THREE.Vector3()), 0.36, 0.06, { color: C.key, opacity: 0 });

  // ── 金箔顆粒流（＝C 的九片，但整群當一個物件搬；見檔頭 ③）──
  const FOILS = 9;
  const spine = st.worldOf(cat, 'Spine', new THREE.Vector3());
  const foilTo = hit.clone(); foilTo.y += 0.10;
  const local = [];
  for (let i = 0; i < FOILS; i++) {
    const f = i / (FOILS - 1);
    local.push({
      a: new THREE.Vector3((st.rnd() - 0.5) * 0.22, 0.06 + 0.26 * Math.sin(Math.PI * f), 0).addScaledVector(st.dir, -0.34 + 0.72 * f),
      b: new THREE.Vector3((st.rnd() - 0.5) * 0.30, (st.rnd() - 0.5) * 0.26, (st.rnd() - 0.5) * 0.30),
      rz: st.rnd() * 3, ry: Math.PI * 0.5 + 0.8 * st.rnd(), s: 0, t0: 0.10 * i, p: new THREE.Vector3(),
    });
  }
  const foilIm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.105, 0.145), st.solid(C.key, 0), FOILS);
  foilIm.frustumCulled = false;
  foilIm.position.copy(spine);
  st.spawn(foilIm, 'foil');
  const _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _eu = new THREE.Euler(), _sc = new THREE.Vector3();
  const writeFoils = (k) => { // k＝0 貼在虎背、1 散在獵物身上（局部座標，群體位移由 foilIm.position 帶）
    for (let i = 0; i < FOILS; i++) {
      const o = local[i];
      o.p.lerpVectors(o.a, o.b, k);
      _eu.set(0, o.ry, o.rz); _q4.setFromEuler(_eu);
      _m4.compose(o.p, _q4, _sc.setScalar(o.s));
      foilIm.setMatrixAt(i, _m4);
    }
    foilIm.instanceMatrix.needsUpdate = true;
  };
  writeFoils(0);

  /* ① 蓄勢（＝C）：蹲伏 0.78、香火燒旺、金箔一片片從虎背長出來 */
  st.phase('windup');
  st.tween({ ms: W, ease: 'out', update(t, e) {
    crouch(st, cat, fwd, 0.78, e);
    st.rim(cat, 1 + 3.0 * e);
    for (let i = 0; i < FOILS; i++) { const o = local[i]; o.s = Math.max(0, Math.min(1, (e - o.t0) * 2.6)); o.rz += 0.05 * o.s; }
    foilIm.position.copy(spine); foilIm.position.y += 0.09 * e;
    writeFoils(0);
  }, done() { st.phase('travel'); } });
  st.fade(foilIm, { ms: W * 0.5, delay: W * 0.25, from: 0, to: 0.95 });

  /* ② 撲（＝C）＋ 大印同步垂直落下：兩條線在 R0 交會 */
  st.tween({ ms: TL * 0.68, delay: T0, ease: 'outQuint', update(t, e) { lunge(st, cat, fwd, DIST, 0.22, 0.85, e); } });
  st.fade(big, { ms: TL * 0.22, delay: T0, from: 0, to: 1 }); // 起跳的同一刻現身
  st.tween({ ms: TL, delay: T0, ease: 'in',
    update(t, e) {
      big.position.lerpVectors(sky, land, e);
      big.scale.setScalar(st.iconSize * (0.80 + 0.22 * e));
      pitchTo(30 + 12 * e); // 落下過程印面斜 30°→42°：看得出它是一枚印，不是一塊板
    },
    done() {
      /* ★衝擊拍★：落地＝咬中，全部疊在這一刻 */
      st.phase('react');
      st.burst(land, { power: 1.4, n: 90, color: C.hot });
      st.burst(land, { power: 0.9, n: 45, color: C.key }); // 金色紙錢（＝C）
      st.punch(0.95);
    } });
  st.tween({ ms: TL * 0.92, delay: T0, ease: 'in', update(t, e) { // 金箔整群飛過去（travel 的位移來源）
    foilIm.position.lerpVectors(spine, foilTo, e);
    for (let i = 0; i < FOILS; i++) local[i].rz += 0.16;
    writeFoils(Math.min(1, e * 1.15));
  } });
  st.tween({ ms: TL * 0.32, delay: T0 + TL * 0.68, ease: 'outQuint', update(t, e) { snapJaw(st, cat, 0.85, e); } });

  /* ③ 衝擊拍（react）：正面亮相 3 幀 → 彈起淡出；貼桌陣、印文燒紅、獵物被壓住都在這一拍 */
  const HOLD = Math.max(50, RL * 0.55); // 正面亮相 ≥3 幀（60fps）——D 只有 2 幀，這是 E 多要的那 2%
  st.tween({ ms: HOLD, delay: R0, ease: 'out', update(t, e) {
    pitchTo(42 - 38 * e); // 42°→4°：印面轉正對鏡頭＝「蓋章那一格」
    big.scale.setScalar(st.iconSize * (1.02 - 0.08 * e));
    big.position.y = land.y - 0.03 * Math.sin(Math.PI * e);
  } });
  st.tween({ ms: RL - HOLD, delay: R0 + HOLD, ease: 'back', update(t, e) {
    big.position.y = land.y + 0.18 * Math.sin(Math.PI * e);
    big.scale.setScalar(st.iconSize * (0.94 - 0.34 * e));
  } });
  st.fade(big, { ms: RL - HOLD, delay: R0 + HOLD, from: 1, to: 0 });
  st.tween({ ms: RL * 0.70, delay: R0, ease: 'out', update(t, e) { chime.scale.setScalar(0.4 + 1.6 * e); } });
  st.fade(chime, { ms: RL * 0.70, delay: R0, from: 0.9, to: 0 });
  st.fade(foilIm, { ms: RL * 0.55, delay: R0, from: 0.95, to: 0 });
  if (seal && face) {
    st.fade(seal, { ms: RL * 0.16, delay: R0, from: 0, to: 1 });
    st.tween({ ms: RL * 0.80, delay: R0, ease: 'out', update(t, e) {
      face.material.color.copy(cInk).lerp(cHot, Math.min(1, e * 1.3)); // ＝C 的「燒出來」
      seal.scale.setScalar(st.markSize * (2.8 - 1.1 * e));
    } });
  }
  preyHit(st, prey, R0, RL, 0.14);

  st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) { recover(st, cat, fwd, DIST * 0.9, 1 - e); st.rim(cat, 1 + 3.0 * (1 - e)); } });
  void B;
}

export const PROTOS = { tigerA, tigerB, tigerC, tigerD, tigerE };
export default PROTOS;

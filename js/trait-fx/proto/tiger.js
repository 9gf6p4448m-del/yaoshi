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

export const PROTOS = { tigerA, tigerB, tigerC };
export default PROTOS;

// 妖市 — 卷 C3 招式編舞・香火系（9 套，2026-09-05）
// 舞台 API 與規則見 zuling.js 檔頭；骨骼名見 docs/experiments/2026-09-05-traitfx-bones.md。
import * as THREE from 'three';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();


/* ══ 虎爺印（biteGamble）專用的動作零件（2026-09-12 招式演出卷批 1；自 js/trait-fx/proto/tiger.js 的 E 版轉正）══
   `tiger_c` 有 34 根骨（Rump／Hips／Spine／Chest／NeckB／Neck2／HeadRoot／Brow／Muzzle／Nose／
   JawRoot／Jaw1／JawTip／Tail*／四肢），只有這一支招用得到，所以留在本檔的模組層，
   **不上升到 js/trait-fx.js 的 st**——那一層放的是 27 支共用的積木（st.paperStamp／st.paperProps 那種）。
   原型檔 js/trait-fx/proto/tiger.js 的 A–E 五版原地保留（`?proto=tigerA..E`），它是製作人挑版的紀錄，
   **不是正式演出的來源**；兩邊之後各走各的，這裡的數值以本檔為準。 */

/** 印記往鏡頭方向的偏移。對決機位在世界 +X（camera-director 的 DUEL_SHOT，yaw 90°），
 *  印記不往 +X 推就有一半埋進受招方模型裡——MAT_SOLID 開 depthTest，埋進去的那半會被切掉。 */
const TOWARD_CAM = new THREE.Vector3(0.26, 0.07, 0);

/** 取角色與四個時間切點：出招的虎、被咬的獵物、朝向、windup 末／travel 起迄／react 起。 */
function tgCast(st) {
  const cat = st.byBody(st.actor, 'elite')[0] || st.actor[0];
  const prey = st.biggest(st.target) || st.target[0] || null;
  const B = st.beat;
  return {
    cat, prey, B,
    fwd: st.toward(cat, new THREE.Vector3()),
    W: B.windup[1], T0: B.travel[0], TL: B.travel[1] - B.travel[0], R0: B.react[0],
    hit: prey ? st.worldOf(prey, null, new THREE.Vector3()) : st.worldOf(cat, null, new THREE.Vector3()).addScaledVector(st.dir, 1.2),
  };
}

/** 蹲伏（k＝幅度倍率）。整尊微壓 0.025＝蓄力；0.05 太重，整尊會像洩氣而不是壓低重心。 */
function tgCrouch(st, cat, fwd, k, e) {
  st.rot(cat, 'Rump', 0.26 * k * e); st.rot(cat, 'Hips', 0.20 * k * e);
  st.rot(cat, 'Spine', -0.30 * k * e); st.rot(cat, 'Chest', -0.38 * k * e);
  st.rot(cat, 'NeckB', -0.46 * k * e); st.rot(cat, 'Neck2', -0.34 * k * e); st.rot(cat, 'HeadRoot', 0.22 * k * e);
  st.rot(cat, 'JawRoot', 0.62 * k * e); st.rot(cat, 'Jaw1', 0.40 * k * e); st.rot(cat, 'JawTip', 0.28 * k * e);
  st.rot(cat, 'TailRoot', -0.52 * k * e); st.rot(cat, 'Tail1', -0.40 * k * e); st.rot(cat, 'Tail2', -0.30 * k * e); st.rot(cat, 'TailTip', -0.24 * k * e);
  st.rot(cat, 'LBack1Kn', 0.62 * k * e); st.rot(cat, 'RBack1Kn', 0.62 * k * e);
  st.rot(cat, 'LFrontElbow1El', 0.44 * k * e); st.rot(cat, 'RFrontElbow1El', 0.44 * k * e);
  st.move(cat, -fwd.x * 0.16 * k * e, -0.06 * k * e, -fwd.z * 0.16 * k * e);
  st.scale(cat, 1 - 0.025 * k * e);
}

/** 撲出（dist＝往前衝多遠，arc＝拋物線高度，k＝上半身伸展幅度） */
function tgLunge(st, cat, fwd, dist, arc, k, e) {
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
function tgSnapJaw(st, cat, k, e) {
  st.rot(cat, 'JawRoot', 0.92 * k - 1.06 * k * e); st.rot(cat, 'Jaw1', 0.62 * k - 0.70 * k * e); st.rot(cat, 'JawTip', 0.44 * k - 0.50 * k * e);
  st.rot(cat, 'Muzzle', -0.16 * k * e); st.rot(cat, 'Nose', -0.14 * k * e); st.rot(cat, 'Brow', -0.22 * k * e);
  st.rot(cat, 'HeadRoot', 0.16 * k + 0.24 * k * e);
}

/** 收勢：所有覆寫線性歸零（k＝1−e） */
function tgRecover(st, cat, fwd, dist, k) {
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

/** 受招方的「壓」（香火反應家族）：st.flinch 只給退縮，這一支補「被咬住」的體感
 *  ——等比壓縮＋骨骼高頻抖＋邊光暴亮三件一起上（Q3 裁定：本卷不做非等比壓扁）。 */
function tgPreyHit(st, prey, R0, RL, depth) {
  if (!prey) return;
  st.flinch([prey], { delay: R0, ms: RL * 0.8, strength: 2.4, burst: false });
  st.tween({ ms: RL * 0.9, delay: R0, ease: 'snap', update(t, e) {
    st.scale(prey, 1 - depth * e);
    st.rot(prey, 'Chest', 0.26 * e * Math.sin(e * 26)); // 抖
    st.rot(prey, 'HeadRoot', 0.22 * e * Math.sin(e * 19));
    st.rim(prey, 1 + 3.2 * e);
  } });
}
const MOVES = {
  /* 大士爺紙尊・普渡（dashiye，護法×1；傳說三尊美術卷 2026-09-07）：本方全體 hp+2。
     編舞（香火＝緩慢、先蓄後落，像抬轎）：0–320ms 整尊下沉、舌垂、頭低（蓄）
          → 320ms 紙軀往上抬、口張、頭頂小龕跟著抬；同時本方每一尊腳下升起一圈光環，罩成半透明護罩
          → 700ms 起護罩淡出、姿態回 0。 */
  wardGuardAll(st) {
    const lead = st.byBody(st.actor, 'ward')[0] || st.actor[0];
    st.tween({ ms: 320, ease: 'inout', update(t, e) {
      st.move(lead, 0, -0.09 * e, 0);
      st.rot(lead, 'Hips', 0.10 * e); st.rot(lead, 'Chest', 0.09 * e); st.rot(lead, 'HeadRoot', 0.13 * e);
      st.rot(lead, 'TongueRoot', 0.18 * e); st.rot(lead, 'Tong1', 0.16 * e);
      st.rim(lead, 1 + 0.5 * e);
    } });
    st.at(320, () => {
      st.tween({ ms: 380, ease: 'snap', update(t, e) {
        const k = 1 - t;
        st.move(lead, 0, -0.09 * k + 0.12 * e, 0);
        st.rot(lead, 'Hips', 0.10 * k - 0.14 * e); st.rot(lead, 'Chest', 0.09 * k - 0.12 * e);
        st.rot(lead, 'HeadRoot', 0.13 * k - 0.18 * e);
        st.rot(lead, 'JawRoot', 0.34 * Math.sin(Math.PI * e));
        st.rot(lead, 'TongueRoot', 0.18 * k - 0.30 * e); st.rot(lead, 'Tong1', 0.16 * k - 0.26 * e);
        st.rot(lead, 'ShrineRoot', -0.16 * e);
        st.rim(lead, 1 + 1.2 * e);
      } });
      st.actor.forEach((f, i) => {
        const foot = st.foot(f, new THREE.Vector3());
        const c = st.worldOf(f, null, new THREE.Vector3());
        st.at(40 * i, () => {
          const r = st.ring(foot, 0.30, 0.05, { opacity: 0.9 });
          r.scale.setScalar(0.25); st.grow(r, { ms: 280, from: 0.25, to: 1.05 });
          st.fade(r, { ms: 320, delay: 200, from: 0.9, to: 0 });
          const d = st.dome(c, 0.78, { opacity: 0 });
          d.scale.setScalar(0.35);
          st.grow(d, { ms: 300, from: 0.35, to: 1 });
          st.fade(d, { ms: 300, from: 0, to: 0.32 });
          st.at(420, () => st.fade(d, { ms: 300, from: 0.32, to: 0 }));
          st.rim(f, 1.5);
        });
      });
    });
    st.at(700, () => st.tween({ ms: 200, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.move(lead, 0, 0.12 * k, 0);
      st.rot(lead, 'Hips', -0.14 * k); st.rot(lead, 'Chest', -0.12 * k); st.rot(lead, 'HeadRoot', -0.18 * k);
      st.rot(lead, 'TongueRoot', -0.30 * k); st.rot(lead, 'Tong1', -0.26 * k); st.rot(lead, 'ShrineRoot', -0.16 * k);
      st.actor.forEach((f) => st.rim(f, 1 + 0.5 * k));
    } }));
    /* ★Tier 3 餘韻（R1 覆審 M1）★：原本只排到 1067ms，tier 3 有 1400ms。
       只在 tier 3 追加新節拍（tier 2 行為逐項不變）：護罩退去之後，本方每一尊腳下的光環依序再亮一次
       （香火＝緩慢、像抬轎走遠），紙軀最後沉一口氣。 */
    if (st.tier === 3) {
      st.actor.forEach((f, i) => {
        const r = st.ring(st.foot(f, new THREE.Vector3()), 0.3, 0.04, { opacity: 0 });
        st.grow(r, { ms: 280, delay: 960 + i * 30, from: 0.4, to: 1.5 });
        st.fade(r, { ms: 280, delay: 960 + i * 30, from: 0.55, to: 0 });
        st.tween({ ms: 260, delay: 1010 + i * 45, ease: 'pulse', update(t, e) { st.rim(f, 1 + 0.9 * e); } });
      });
      st.tween({ ms: 296, delay: 1000, ease: 'pulse', update(t, e) { st.move(lead, 0, -0.04 * e, 0); } });
    }
  },

  /* 王爺劍・斬瘟（sword，精英×1）：本隊精英的濺射改為全額。
     編舞：舉劍（0–260ms：右臂高舉、胸口後仰側擰、劍身邊光大亮）
          → 斬（260ms：臂胸猛甩到前下方、整尊往前踏半步、鏡頭小推；一片劍光以腳下為軸 200ms 掃過對面整排）
          → 對面每一隻依序火星＋退縮（間隔 45ms）→ 收劍（440–860ms 回位）。 */
  eliteCleave(st) {
    const gen = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const foes = st.target.slice();
    st.tween({ ms: 260, ease: 'out', update(t, e) {
      st.rot(gen, 'RArm1Rt', -1.1 * e, 0, 0.25 * e); st.rot(gen, 'RArm1El', -0.5 * e);
      st.rot(gen, 'Chest', -0.12 * e, -0.3 * e, 0); st.rot(gen, 'HeadRoot', -0.1 * e);
      st.rim(gen, 1 + 1.2 * e);
    } });
    st.at(260, () => {
      const foot = st.foot(gen, new THREE.Vector3());
      const toward = st.toward(gen, new THREE.Vector3());
      const far = foes.length ? foes.reduce((m, f) => Math.max(m, foot.distanceTo(st.worldOf(f, null, _a))), 0) : 1.4;
      const reach = Math.max(1.2, far + 0.4);
      // 劍光：一片長條薄面，軸在出招者腳下，掃過「朝對面」±52° 的扇形
      const pivot = st.spawn(new THREE.Group(), 'slash');
      pivot.position.set(foot.x, st.tableY + 0.02, foot.z);
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(reach, 0.16), st.glow(undefined, 0.85));
      blade.geometry.translate(reach / 2, 0, 0);
      blade.rotation.x = -Math.PI / 2;
      pivot.add(blade);
      gen.group.localToWorld(_b.copy(toward)).sub(gen.group.getWorldPosition(_a)); _b.y = 0; _b.normalize();
      const ang = Math.atan2(-_b.z, _b.x);
      const a0 = ang + 0.9, a1 = ang - 0.9;
      pivot.rotation.y = a0;
      st.tween({ ms: 200, ease: 'out', update(t, e) { pivot.rotation.y = a0 + (a1 - a0) * e; blade.material.opacity = 0.85 * (1 - t * t); } });
      st.tween({ ms: 180, ease: 'out', update(t, e) {
        st.rot(gen, 'RArm1Rt', -1.1 + 1.9 * e, 0, 0.25 - 0.6 * e); st.rot(gen, 'RArm1El', -0.5 + 0.3 * e);
        st.rot(gen, 'Chest', -0.12 + 0.3 * e, -0.3 + 0.75 * e, 0); st.rot(gen, 'HeadRoot', -0.1 + 0.2 * e);
        st.move(gen, toward.x * 0.2 * e, 0, toward.z * 0.2 * e);
      } });
      st.punch(0.5);
      foes.forEach((f, i) => st.at(60 + i * 45, () => st.burst(st.worldOf(f, null, new THREE.Vector3()), { power: 0.7, n: 40 })));
      st.flinch(foes, { delay: 60, stagger: 45, strength: 1, burst: false });
      st.at(180, () => st.tween({ ms: 420, ease: 'inout', update(t, e) {
        const k = 1 - e;
        st.rot(gen, 'RArm1Rt', 0.8 * k, 0, -0.35 * k); st.rot(gen, 'RArm1El', -0.2 * k);
        st.rot(gen, 'Chest', 0.18 * k, 0.45 * k, 0); st.rot(gen, 'HeadRoot', 0.1 * k);
        st.move(gen, toward.x * 0.2 * k, 0, toward.z * 0.2 * k);
        st.rim(gen, 1 + 1.2 * k);
      } }));
    });
  },

  /* 媽祖令旗・令旗改陣（flag，護法×2）：二拍本方全體 atk+1。
     編舞：壓身舉旗（0–300ms：旗桿後倒、肩背下沉、獸首抬起張口、尾豎）
          → 揮旗下令（300ms：旗桿由後猛甩到前，兩道令波自旗下推過本方整排）
          → 全體聞令（各尊錯開 60ms 側踏半步再歸位、邊光同時亮起、頭頂各起一撮金火星）
          → 收旗（470–850ms 回位）。 */
  wardAtkAll1(st) {
    const mine = st.actor.slice();
    const lead = mine[0];
    st.tween({ ms: 300, ease: 'out', update(t, e) {
      st.rot(lead, 'FlagMast', 0.6 * e, 0, -0.38 * e);
      st.rot(lead, 'Withers', -0.18 * e); st.rot(lead, 'Chest', -0.1 * e);
      st.rot(lead, 'HeadRoot', -0.24 * e); st.rot(lead, 'JawRoot', 0.34 * e); st.rot(lead, 'Jaw1', 0.2 * e);
      st.rot(lead, 'TailRoot', 0.42 * e); st.rot(lead, 'Tail1', 0.3 * e); st.rot(lead, 'Tail2', 0.2 * e);
    } });
    st.at(300, () => {
      st.tween({ ms: 170, ease: 'outQuint', update(t, e) {
        st.rot(lead, 'FlagMast', 0.6 - 1.45 * e, 0, -0.38 + 0.72 * e);
        st.rot(lead, 'Withers', -0.18 + 0.34 * e); st.rot(lead, 'Chest', -0.1 + 0.22 * e);
        st.rot(lead, 'HeadRoot', -0.24 + 0.38 * e); st.rot(lead, 'JawRoot', 0.34 - 0.34 * e); st.rot(lead, 'Jaw1', 0.2 - 0.2 * e);
        st.rot(lead, 'TailRoot', 0.42 - 0.5 * e); st.rot(lead, 'Tail1', 0.3 - 0.4 * e); st.rot(lead, 'Tail2', 0.2 - 0.3 * e);
      } });
      st.punch(0.3);
      // 令波：兩道環自旗下推出，掃過本方整排
      const foot = st.foot(lead, new THREE.Vector3());
      [0, 95].forEach((d) => st.at(d, () => {
        const r = st.ring(foot, 0.3, 0.05, { opacity: 0.9 });
        st.tween({ ms: 360, ease: 'out', update(t, e) { r.scale.setScalar(1 + 5.4 * e); r.material.opacity = 0.9 * (1 - e); } });
      }));
      // 聞令換位：側踏半步再回，邊光同亮
      mine.forEach((f, i) => {
        const fwd = st.toward(f, new THREE.Vector3());
        const lat = new THREE.Vector3(fwd.z, 0, -fwd.x);
        const k = (i % 2 ? -1 : 1) * (0.12 + 0.05 * st.rnd());
        const held = i === 0 ? 0.9 : 0;
        st.tween({ ms: 420, delay: 60 * i, ease: 'pulse', update(t, e) {
          st.move(f, lat.x * k * e + fwd.x * 0.07 * e, 0, lat.z * k * e + fwd.z * 0.07 * e);
          st.rim(f, 1 + held * (1 - t) + 1.5 * e);
        } });
        st.at(60 * i + 50, () => st.burst(st.top(f, new THREE.Vector3()), { power: 0.45, n: 22 }));
      });
      st.at(170, () => st.tween({ ms: 380, ease: 'inout', update(t, e) {
        const k = 1 - e;
        st.rot(lead, 'FlagMast', -0.85 * k, 0, 0.34 * k);
        st.rot(lead, 'Withers', 0.16 * k); st.rot(lead, 'Chest', 0.12 * k);
        st.rot(lead, 'HeadRoot', 0.14 * k); st.rot(lead, 'TailRoot', -0.08 * k); st.rot(lead, 'Tail1', -0.1 * k); st.rot(lead, 'Tail2', -0.1 * k);
      } }));
    });
  },

  /* 送王船・送王船（wangchuan，護法×2）：二拍吸收對面本拍首 4 點傷害。
     編舞：離岸（0–280ms：船尾翹起、四節桅逐節挺直、船上七尊人偶依序轉身朝前、桅頂燃起香火）
          → 前滑擋在陣前（280ms：整艘沿「朝對面」推出半個身位、船首抬起破浪；僚船跟上）
          → 340ms 起一頂金罩自船身漲開罩住本方（貼地光盤同時亮）
          → 罩淡出、船退回原位（520–880ms）。 */
  wardAbsorb4(st) {
    const ships = st.actor.slice();
    const lead = ships[0];
    const fwd = st.toward(lead, new THREE.Vector3());
    const dolls = ['FigA', 'FigB', 'FigC', 'FigD', 'FigE', 'FigF', 'FigG'];
    const fire = st.orb(st.worldOf(lead, 'MastTop', new THREE.Vector3()), 0.075, { opacity: 0.95 });
    fire.scale.setScalar(0.25);
    st.grow(fire, { ms: 280, from: 0.25, to: 1.2 });
    st.tween({ ms: 280, ease: 'out', update(t, e) {
      st.rot(lead, 'SternTip', 0.16 * e); st.rot(lead, 'SternRise', 0.2 * e); st.rot(lead, 'AftMid', 0.1 * e);
      st.rot(lead, 'MidShip', -0.06 * e); st.rot(lead, 'ForeMid', -0.13 * e);
      st.rot(lead, 'Mast1', -0.07 * e); st.rot(lead, 'Mast2', -0.09 * e); st.rot(lead, 'Mast3', -0.12 * e); st.rot(lead, 'Mast4', -0.15 * e);
      st.rot(lead, 'MastTop', -0.18 * e); st.rot(lead, 'MastFoot', 0.05 * e);
      for (let i = 0; i < dolls.length; i++) {
        const k = Math.max(0, Math.min(1, (e - i * 0.06) / 0.55));
        st.rot(lead, dolls[i], 0.12 * k, 0.62 * k, 0);
      }
      st.rim(lead, 1 + 1.1 * e);
      st.worldOf(lead, 'MastTop', fire.position);
    } });
    st.at(280, () => {
      st.tween({ ms: 240, ease: 'outQuint', update(t, e) {
        st.move(lead, fwd.x * 0.36 * e, 0, fwd.z * 0.36 * e);
        st.rot(lead, 'BowRise', -0.22 * e); st.rot(lead, 'BowTip', -0.3 * e);
        st.rot(lead, 'AftMid', 0.1 - 0.05 * e); st.rot(lead, 'ForeMid', -0.13 + 0.05 * e);
        st.worldOf(lead, 'MastTop', fire.position);
      } });
      if (ships[1]) {
        const f2 = st.toward(ships[1], new THREE.Vector3());
        st.tween({ ms: 260, delay: 60, ease: 'outQuint', update(t, e) {
          st.move(ships[1], f2.x * 0.17 * e, 0, f2.z * 0.17 * e);
          st.rim(ships[1], 1 + 1.0 * e);
        } });
      }
      st.at(20, () => {
        const c = new THREE.Vector3();
        ships.forEach((f) => c.add(st.worldOf(f, null, new THREE.Vector3())));
        c.multiplyScalar(1 / ships.length); c.y = st.tableY;
        const d = st.dome(c, 0.82, { opacity: 0.3 });
        d.scale.setScalar(0.32);
        st.grow(d, { ms: 220, from: 0.32, to: 1 });
        st.fade(d, { ms: 260, delay: 230, from: 0.3, to: 0 });
        const g = st.disc(c, 0.88, { opacity: 0.34 });
        g.scale.setScalar(0.32);
        st.grow(g, { ms: 200, from: 0.32, to: 1 });
        st.fade(g, { ms: 280, delay: 220, from: 0.34, to: 0 });
        st.punch(0.25);
      });
      st.at(240, () => {
        st.fade(fire, { ms: 300, from: 0.95, to: 0 });
        st.tween({ ms: 360, ease: 'inout', update(t, e) {
          const k = 1 - e;
          st.move(lead, fwd.x * 0.36 * k, 0, fwd.z * 0.36 * k);
          st.rot(lead, 'SternTip', 0.16 * k); st.rot(lead, 'SternRise', 0.2 * k); st.rot(lead, 'AftMid', 0.05 * k);
          st.rot(lead, 'MidShip', -0.06 * k); st.rot(lead, 'ForeMid', -0.08 * k);
          st.rot(lead, 'Mast1', -0.07 * k); st.rot(lead, 'Mast2', -0.09 * k); st.rot(lead, 'Mast3', -0.12 * k); st.rot(lead, 'Mast4', -0.15 * k);
          st.rot(lead, 'MastTop', -0.18 * k); st.rot(lead, 'MastFoot', 0.05 * k);
          st.rot(lead, 'BowRise', -0.22 * k); st.rot(lead, 'BowTip', -0.3 * k);
          for (let i = 0; i < dolls.length; i++) st.rot(lead, dolls[i], 0.12 * k, 0.62 * k, 0);
          st.rim(lead, 1 + 1.1 * k);
          if (ships[1]) {
            const f2 = st.toward(ships[1], _b);
            st.move(ships[1], f2.x * 0.17 * k, 0, f2.z * 0.17 * k);
            st.rim(ships[1], 1 + 1.0 * k);
          }
        } });
      });
    });
  },

  /* 千里眼銅鈴・千里眼（bell，護法×2）：本方免疫迷途。
     ★v0.55 招式可辨性卷 批 0 示範招（香火）★
     盲讀 r1 的病因（計畫 §6 第 13 列）：**A 猜五營旗、B 猜虎爺印，兩版皆錯**；
       A 短版 2 分「只有幾點橘色火星，看不出做了什麼」
       ⇒ 失敗類型 D（短版只剩骨骼＋火星）＋B（三圈鈴波環撞掉 19/27 的腳下光環語彙）。
       而且效果本身是**被動免疫**，本來就沒有可演的因果。
     改法（ART_BIBLE §10）：
       ① windup：舉鈴、搖鈴，同時鈴身上方浮出一枚**放大的銅鈴徽記**（鎏金實心＋ink 底板）；
       ② travel：鈴聲「望出千里」——徽記朝對面**飛出去一段**再折返（這是把被動效果演成看得見的動作；
          三圈貼桌鈴波環整組退役，不再與另外 18 支撞）；
       ③ react：折返之後在**每一位同伴頭上蓋一枚銅鈴印記**並托起半寸＝「這幾尊被護到了」。
     ★tier 1／2／3 共用這一支★（時間軸由 st.beat 換算）。 */
  wardImmuneLost(st) {
    const B = st.beat, C = st.colors, LAST = st.ms * 0.88;
    const ringer = st.byBody(st.actor, 'ward')[0] || st.actor[0];
    const mates = st.actor.filter((f) => f !== ringer);
    const W = B.windup[1], T0 = B.travel[0], TL = B.travel[1] - B.travel[0], R0 = B.react[0], RL = LAST - B.react[0];
    const src = st.worldOf(ringer, 'BellRoot', new THREE.Vector3());
    src.y += 0.10;
    const far = src.clone().addScaledVector(st.dir, 1.55); far.y += 0.30; // 望出千里
    const bell = st.icon(st.kind, src, { color: C.key, inkColor: C.ink, opacity: 0 });
    const guard = (mates.length ? mates : [ringer]).map((f) => st.mark(f, st.kind, { at: 'top', opacity: 0, color: C.key }));

    st.phase('windup');
    /* ① 舉鈴＋搖鈴（windup）：上臂高舉、鈴身三次左右甩；徽記同時在鈴上長出來 */
    st.tween({ ms: W * 0.42, ease: 'out', update(t, e) {
      st.rot(ringer, 'ArmURoot', -1.2 * e, 0, 0.30 * e); st.rot(ringer, 'ArmUElbow', -0.55 * e); st.rot(ringer, 'ArmUWrist', -0.28 * e);
      st.rot(ringer, 'ArmDRoot', 0.30 * e, 0, -0.22 * e); st.rot(ringer, 'ArmDElbow', -0.20 * e); st.rot(ringer, 'AxeHead', 0.25 * e);
      st.rot(ringer, 'Chest', -0.12 * e, -0.24 * e, 0); st.rot(ringer, 'NeckB', -0.18 * e); st.rot(ringer, 'Spine', -0.08 * e);
      st.rot(ringer, 'BellRoot', -0.32 * e); st.rot(ringer, 'BellStem', -0.22 * e); st.rot(ringer, 'BellShoulder', -0.12 * e);
      st.rim(ringer, 1 + 1.2 * e);
      st.alpha(bell, Math.min(1, e * 2.2));
      bell.scale.setScalar(st.iconSize * (0.4 + 0.6 * e));
    } });
    st.tween({ ms: W * 0.6, delay: W * 0.4, ease: 'linear',
      update(t) {
        const s = Math.sin(t * Math.PI * 3) * (1 - t * 0.4);
        st.rot(ringer, 'ArmURoot', -1.2, 0, 0.30 + 0.26 * s); st.rot(ringer, 'ArmUWrist', -0.28, 0, 0.50 * s); st.rot(ringer, 'ArmUHand', 0, 0, 0.40 * s);
        st.rot(ringer, 'BellRoot', -0.32, 0, 0.55 * s); st.rot(ringer, 'BellStem', -0.22, 0, 0.45 * s); st.rot(ringer, 'BellWaist', 0, 0, 0.35 * s);
        st.rot(ringer, 'BellLip', 0, 0, 0.50 * s); st.rot(ringer, 'LipRoot', 0, 0, 0.55 * s); st.rot(ringer, 'LipMid', 0, 0, 0.70 * s); st.rot(ringer, 'LipEdge', 0, 0, 0.90 * s);
        st.rot(ringer, 'SkirtRoot', 0, 0, 0.09 * s); st.rot(ringer, 'Skirt1', 0, 0, 0.13 * s); st.rot(ringer, 'SkirtHem', 0, 0, 0.18 * s);
        bell.userData.fxRoll = 0.35 * s;
      },
      done() { st.phase('travel'); st.burst(src, { power: 0.55, n: 28, color: C.line }); } });
    /* ② 望出千里（travel）：徽記飛出去 */
    st.trail(bell, src, far, { ms: TL * 0.52, delay: T0, ease: 'out', color: C.line, opacity: 0.9, segs: 12 });
    /* 折返：回到出招方頭上，再化成同伴身上的印記。
       ★中間留 0.1×TL 的停格★：飛到最遠點就立刻折返時，逐幀取樣很可能整幀跳過最遠點，
       travel 的位移量測會少掉最後一小段（實測 tier 2 只量到 1.28／門檻 1.25，壓在線上）。 */
    st.trail(bell, far, src, { ms: TL * 0.38, delay: T0 + TL * 0.62, ease: 'in', color: C.line, opacity: 0.75, segs: 12,
      done() { st.phase('react'); st.punch(0.22); } });
    st.fade(bell, { ms: RL * 0.3, delay: R0, from: 1, to: 0 });
    /* ③ 護到誰看得見（react）：同伴頭上各蓋一枚銅鈴印記並被托起半寸 */
    guard.forEach((m, i) => {
      st.fade(m, { ms: RL * 0.24, delay: R0 + i * RL * 0.08, from: 0, to: 1 });
      st.fade(m, { ms: RL * 0.4, delay: R0 + RL * 0.58, from: 1, to: 0 });
    });
    (mates.length ? mates : [ringer]).forEach((f, i) => st.tween({ ms: RL * 0.9, delay: R0 + i * RL * 0.08, ease: 'pulse', update(t, e) {
      st.move(f, 0, 0.07 * e, 0); st.rim(f, 1 + 1.6 * e);
    } }));
    /* 收勢：放下 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.rot(ringer, 'ArmURoot', -1.2 * k, 0, 0.30 * k); st.rot(ringer, 'ArmUElbow', -0.55 * k); st.rot(ringer, 'ArmUWrist', -0.28 * k); st.rot(ringer, 'ArmUHand', 0);
      st.rot(ringer, 'ArmDRoot', 0.30 * k, 0, -0.22 * k); st.rot(ringer, 'ArmDElbow', -0.20 * k); st.rot(ringer, 'AxeHead', 0.25 * k);
      st.rot(ringer, 'Chest', -0.12 * k, -0.24 * k, 0); st.rot(ringer, 'NeckB', -0.18 * k); st.rot(ringer, 'Spine', -0.08 * k);
      st.rot(ringer, 'BellRoot', -0.32 * k); st.rot(ringer, 'BellStem', -0.22 * k); st.rot(ringer, 'BellShoulder', -0.12 * k);
      st.rot(ringer, 'BellWaist', 0); st.rot(ringer, 'BellLip', 0); st.rot(ringer, 'LipRoot', 0); st.rot(ringer, 'LipMid', 0); st.rot(ringer, 'LipEdge', 0);
      st.rot(ringer, 'SkirtRoot', 0); st.rot(ringer, 'Skirt1', 0); st.rot(ringer, 'SkirtHem', 0);
      st.rim(ringer, 1 + 1.2 * k);
    } });
  },

  /* 五營旗・五方調兵（wuying，兵×3）：二拍本隊已有折損則全體 hp+1。
     編舞：舉旗（0–280ms：右臂把令旗舉過頭、旗尾後仰、盔與頭抬起、身體擰半圈）
          → 落旗（280ms：旗臂由上劈到前，腳下亮出五方光陣＝中央光盤＋五點營火＋五道連線）
          → 三尊錯開 60ms 頓足（膝抬起再踏落、下沉半寸、腳邊火星）
          → 陣淡出、旗收回（460–860ms）。 */
  swarmRally(st) {
    const troops = st.actor.slice();
    const lead = troops[0];
    // 旗頭聚火：舉旗這一段旗尖上凝一團營火，落旗時散進地陣
    const tip = st.orb(st.worldOf(lead, 'FlagTop', new THREE.Vector3()), 0.085, { opacity: 0.9 });
    tip.scale.setScalar(0.25);
    st.grow(tip, { ms: 280, from: 0.25, to: 1.5 });
    st.fade(tip, { ms: 200, delay: 290, from: 0.9, to: 0 });
    st.tween({ ms: 280, ease: 'out', update(t, e) {
      st.rot(lead, 'RArm1Rt', -1.9 * e, 0, 0.3 * e); st.rot(lead, 'RArm1El', -0.35 * e); st.rot(lead, 'RArm1Wr', -0.2 * e);
      st.rot(lead, 'FlagTop', 0.5 * e, 0, -0.25 * e);
      st.worldOf(lead, 'FlagTop', tip.position);
      st.rot(lead, 'Chest', -0.14 * e, 0.3 * e, 0); st.rot(lead, 'Spine', -0.08 * e, 0.16 * e, 0);
      st.rot(lead, 'NeckB', -0.14 * e); st.rot(lead, 'HeadRoot', -0.2 * e); st.rot(lead, 'HelmRoot', -0.12 * e); st.rot(lead, 'Helm1', -0.16 * e);
      st.rim(lead, 1 + 1.2 * e);
    } });
    st.at(280, () => {
      st.tween({ ms: 180, ease: 'outQuint', update(t, e) {
        st.rot(lead, 'RArm1Rt', -1.9 + 1.55 * e, 0, 0.3 - 0.5 * e); st.rot(lead, 'RArm1El', -0.35 + 0.2 * e); st.rot(lead, 'RArm1Wr', -0.2 + 0.35 * e);
        st.rot(lead, 'FlagTop', 0.5 - 1.05 * e, 0, -0.25 + 0.45 * e);
        st.rot(lead, 'Chest', -0.14 + 0.26 * e, 0.3 - 0.6 * e, 0); st.rot(lead, 'Spine', -0.08 + 0.14 * e, 0.16 - 0.3 * e, 0);
        st.rot(lead, 'NeckB', -0.14 + 0.24 * e); st.rot(lead, 'HeadRoot', -0.2 + 0.3 * e); st.rot(lead, 'HelmRoot', -0.12 + 0.2 * e); st.rot(lead, 'Helm1', -0.16 + 0.26 * e);
      } });
      st.punch(0.35);
      // 五方陣：中央光盤 ＋ 五點營火 ＋ 五道連線
      const c = new THREE.Vector3();
      troops.forEach((f) => c.add(st.foot(f, new THREE.Vector3())));
      c.multiplyScalar(1 / troops.length); c.y = st.tableY;
      const plate = st.disc(c, 0.9, { opacity: 0.4 });
      plate.scale.setScalar(0.25);
      st.grow(plate, { ms: 240, from: 0.25, to: 1 });
      st.fade(plate, { ms: 300, delay: 300, from: 0.4, to: 0 });
      const hub = c.clone(); hub.y = st.tableY + 0.03;
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const p = new THREE.Vector3(c.x + Math.cos(ang) * 0.78, st.tableY + 0.06, c.z + Math.sin(ang) * 0.78);
        st.at(30 * i, () => {
          const o = st.orb(p, 0.055, { opacity: 0.95 });
          o.scale.setScalar(0.3);
          st.grow(o, { ms: 200, from: 0.3, to: 1.3 });
          st.fade(o, { ms: 300, delay: 260, from: 0.95, to: 0 });
          const ln = st.beam(hub, p, { opacity: 0 });
          st.tween({ ms: 460, ease: 'pulse', update(t, e) { ln.material.opacity = 0.9 * e; } });
        });
      }
      // 頓足：三尊錯開
      troops.forEach((f, i) => {
        st.at(20 + 60 * i, () => {
          st.tween({ ms: 300, ease: 'snap', update(t, e) {
            st.rot(f, 'RLeg1Rt', -0.55 * e); st.rot(f, 'RLeg1Kn', 0.7 * e); st.rot(f, 'RLeg1An', -0.3 * e);
            st.rot(f, 'Hips', 0.06 * e); st.rot(f, 'SkirtRoot', 0.12 * e); st.rot(f, 'Skirt1', 0.16 * e); st.rot(f, 'SkirtHem', 0.2 * e);
            st.move(f, 0, -0.05 * e, 0);
            if (i) st.rim(f, 1 + 1.3 * e);
          } });
          st.at(120, () => st.burst(st.foot(f, new THREE.Vector3()), { power: 0.5, n: 24 }));
        });
      });
      st.at(180, () => st.tween({ ms: 400, ease: 'inout', update(t, e) {
        const k = 1 - e;
        st.rot(lead, 'RArm1Rt', -0.35 * k, 0, -0.2 * k); st.rot(lead, 'RArm1El', -0.15 * k); st.rot(lead, 'RArm1Wr', 0.15 * k);
        st.rot(lead, 'FlagTop', -0.55 * k, 0, 0.2 * k);
        st.rot(lead, 'Chest', 0.12 * k, -0.3 * k, 0); st.rot(lead, 'Spine', 0.06 * k, -0.14 * k, 0);
        st.rot(lead, 'NeckB', 0.1 * k); st.rot(lead, 'HeadRoot', 0.1 * k); st.rot(lead, 'HelmRoot', 0.08 * k); st.rot(lead, 'Helm1', 0.1 * k);
        st.rim(lead, 1 + 1.2 * k);
      } }));
    });
  },

  /* 虎爺印・虎爺反咬（tiger→tiger_c，精英×1）：被擊中時 15% 反咬 3 點。
     ★2026-09-12 招式演出卷・香火系批 1 的範本招（原型 E 版轉正）★
     語彙落點：ART_BIBLE §10.2／§10.3／§10.7、`docs/design/2026-09-12-fx-vocab-draft.md` §C2 第 6 列
     （該列標「＝E 定稿，本表的範本列」）。登記表 `MOVE_SPEC.biteGamble = { prop:甲, act:撲, react:壓 }`。

     三件（計畫 §3 的手段規範）：
       **本體動作**＝撲（蹲伏 0.78 → 撲出 DIST 0.88／arc 0.22 → 咬合）；
       **道具**＝甲 印（大印：暗印面＋鎏金印身＋鎏金陽刻「虎」，於獵物**正上方** +0.62 垂直落下）
               ＋丙 香火（九片金箔，`st.paperProps` 整群當一個物件飛）；
       **受招方反應**＝壓（等比縮 0.14＋Chest／HeadRoot 高頻抖＋rim 3.2＋flinch 2.4）＋胸口蓋印文。

     ★衝擊拍只有一個★（§A2）：大印的下落與虎的撲**同時**在 T0 起跑、**同時**在 R0 收；
     落地＝咬中＝震動＋貼桌陣＋紙錢炸兩波＋印文由 ink 燒成 hot，全部疊在 R0 那一刻。
     D 版把「砸落」與「咬合」排成兩個先後的重音，t1 下正面亮相只剩 2 幀——那是製作人否掉的那版。

     收勢抵達點 `LAST = st.ms * 0.90`（0.55 徽記版是 0.88）：多出來的 2% 全給衝擊拍的正面亮相
     （HOLD ≥50ms＝60fps 的 3 幀，§A1 的「t1 不得少於 3 幀」）。**這不是動判準**：
     fill 的門檻 0.85 一個字元沒改，0.88→0.90 是往嚴的方向走；上限卡在 tier 1 的 rateOK ≤1.0。

     ★tier 1（300ms）／tier 2（900ms）共用這一支函式★：時間軸一律由 st.beat／st.ms 換算，
     兩個 tier 各寫一份會立刻分岔（0.55 起的既有做法）。 */
  biteGamble(st) {
    const { cat, prey, fwd, W, T0, TL, R0, hit } = tgCast(st);
    const C = st.colors;
    const DIST = 0.88;
    const LAST = st.ms * 0.90;
    const RL = LAST - R0;
    const cInk = new THREE.Color(C.ink), cHot = new THREE.Color(C.hot);

    /* ── 大印：獵物正上方垂直落下，落地＝咬中 ──
       配置＝「暗印面＋鎏金印身＋鎏金陽刻『虎』字」：越亮的東西越留不住細節（§A4），
       所以暗面留細節、亮邊界定身分——鎏金印面會被 bloom 吃掉字。 */
    const land = hit.clone(); land.y += 0.10;
    const sky = land.clone(); sky.y += 0.62; // 再高就出畫面上緣（對決機位 tilt 24°／dist 4.2）
    const big = st.paperStamp(st.kind, sky, { role: 'stamp', color: C.ink, inkColor: C.key, glyphColor: C.line,
      opacity: 0, depth: 0.26, warp: 0.08, tiltDeg: 0, yawDeg: -12, glyph: { cx: 0, cy: -0.42, w: 0.66, h: 0.32 } });
    big.scale.setScalar(st.iconSize * 0.80);
    const qBig = big.quaternion.clone();
    const pitchTo = (deg) => { big.quaternion.copy(qBig); big.rotateX(THREE.MathUtils.degToRad(deg)); };
    pitchTo(30);

    // ── 印文：落地那一刻才出現，由暗燒成硃紅，之後留在獵物身上（o.follow 走 st.stick）──
    const seal = prey ? st.paperStamp(st.kind, hit, { color: C.ink, inkColor: C.ink, glyphColor: C.line,
      opacity: 0, depth: 0.24, warp: 0.18, tiltDeg: 14, yawDeg: -26, glyph: true, follow: prey, off: TOWARD_CAM }) : null;
    if (seal) seal.scale.setScalar(st.markSize * 1.2);
    const face = seal ? seal.userData.fxFace : null;
    const chime = st.ring(st.foot(prey || cat, new THREE.Vector3()), 0.36, 0.06, { color: C.key, opacity: 0 }); // 貼桌陣＝香火專屬腳下語彙

    /* ── 金箔顆粒流（丙 香火）：九片＝1 個 draw call，**群體位移掛在 InstancedMesh 物件本身** ──
       ★這是 travel 的位移來源★：evalPhases() 量的是 mesh.position，實例位移藏在 matrix 裡量不到；
       大印只垂直落下 0.62 < 門檻 1.25，那條路沒有。整群當一個會飛的物件搬，1 個 call 又量得到位移（§A5）。
       單件尺寸＝ICON.markSizeOf('seal') × FOIL_K；FOIL_K 0.725 ＝ E 定稿那片金箔的高（0.145 世界單位）。 */
    const FOILS = 9;
    const FOIL_K = 0.725;
    const spine = st.worldOf(cat, 'Spine', new THREE.Vector3());
    const foilTo = hit.clone(); foilTo.y += 0.10;
    const local = [];
    for (let i = 0; i < FOILS; i++) {
      const f = i / (FOILS - 1);
      local.push({
        a: new THREE.Vector3((st.rnd() - 0.5) * 0.22, 0.06 + 0.26 * Math.sin(Math.PI * f), 0).addScaledVector(st.dir, -0.34 + 0.72 * f),
        b: new THREE.Vector3((st.rnd() - 0.5) * 0.30, (st.rnd() - 0.5) * 0.26, (st.rnd() - 0.5) * 0.30),
        rz: st.rnd() * 3, ry: Math.PI * 0.5 + 0.8 * st.rnd(), s: 0,
      });
    }
    const foil = st.paperProps(st.kind, FOILS, { color: C.key, opacity: 0, k: FOIL_K, depth: 0.16, warp: 0.14 });
    foil.obj.position.copy(spine);
    const _eu = new THREE.Euler();
    const writeFoils = (k) => { // k＝0 貼在虎背、1 散在獵物身上（局部座標；群體位移由 foil.obj.position 帶）
      for (let i = 0; i < FOILS; i++) {
        const o = local[i], it = foil.items[i];
        it.p.lerpVectors(o.a, o.b, k);
        it.q.setFromEuler(_eu.set(0, o.ry, o.rz));
        it.s = o.s;
      }
      foil.write();
    };
    writeFoils(0);

    /* ① 蓄勢（windup）：蹲伏 0.78、香火燒旺、金箔一片片從虎背長出來 */
    st.phase('windup');
    st.tween({ ms: W, ease: 'out', update(t, e) {
      tgCrouch(st, cat, fwd, 0.78, e);
      st.rim(cat, 1 + 3.0 * e);
      for (let i = 0; i < FOILS; i++) { const o = local[i]; o.s = Math.max(0, Math.min(1, (e - 0.10 * i) * 2.6)); o.rz += 0.05 * o.s; }
      foil.obj.position.copy(spine); foil.obj.position.y += 0.09 * e;
      writeFoils(0);
    }, done() { st.phase('travel'); } });
    st.fade(foil.obj, { ms: W * 0.5, delay: W * 0.25, from: 0, to: 0.95 });

    /* ② 撲（travel）＋ 大印同步垂直落下：兩條線在 R0 交會 */
    st.tween({ ms: TL * 0.68, delay: T0, ease: 'outQuint', update(t, e) { tgLunge(st, cat, fwd, DIST, 0.22, 0.85, e); } });
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
        st.burst(land, { power: 0.9, n: 45, color: C.key }); // 金色紙錢
        st.punch(0.95);
      } });
    st.tween({ ms: TL * 0.92, delay: T0, ease: 'in', update(t, e) { // 金箔整群飛過去（travel 的位移來源）
      foil.obj.position.lerpVectors(spine, foilTo, e);
      for (let i = 0; i < FOILS; i++) local[i].rz += 0.16;
      writeFoils(Math.min(1, e * 1.15)); // 抵達時才散開，補回一點「一串陸續飛到」的層次
    } });
    st.tween({ ms: TL * 0.32, delay: T0 + TL * 0.68, ease: 'outQuint', update(t, e) { tgSnapJaw(st, cat, 0.85, e); } });

    /* ③ 衝擊拍（react）：正面亮相 3 幀 → 彈起淡出；貼桌陣、印文燒紅、獵物被壓住都在這一拍 */
    const HOLD = Math.max(50, RL * 0.55); // 正面亮相 ≥3 幀（60fps）——D 版只有 2 幀
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
    st.fade(foil.obj, { ms: RL * 0.55, delay: R0, from: 0.95, to: 0 });
    if (seal && face) {
      st.fade(seal, { ms: RL * 0.16, delay: R0, from: 0, to: 1 });
      st.tween({ ms: RL * 0.80, delay: R0, ease: 'out', update(t, e) {
        face.material.color.copy(cInk).lerp(cHot, Math.min(1, e * 1.3)); // 印文「燒」出來
        seal.scale.setScalar(st.markSize * (2.8 - 1.1 * e));
      } });
    }
    tgPreyHit(st, prey, R0, RL, 0.14);

    st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) { tgRecover(st, cat, fwd, DIST * 0.9, 1 - e); st.rim(cat, 1 + 3.0 * (1 - e)); } });
  },

  /* 香灰符・香灰符（ashcharm，護法×2）：二拍前鋒首隻 hp+1。
     編舞：符紙飄揚（0–620ms：整條 FuD 符鏈依序波動、牆符與六柱線香顫）
          → 右臂把香灰捧到胸前、身體微俯（0–300ms）→ 一撮金灰自掌心升起（300ms）
          → 拋物線飄到本方最前一隻的頭頂（340–600ms）
          → 灰落下（頭頂火星、腳下一圈金環漲開、那一隻邊光亮起、被托起半寸）→ 收手（620–880ms）。 */
  wardHpFirst(st) {
    const line = st.actor.slice().sort((f1, f2) => st.worldOf(f2, null, _a).dot(st.dir) - st.worldOf(f1, null, _b).dot(st.dir));
    const front = line[0];
    const monk = line[line.length - 1];
    const chain = ['FuD1', 'FuD3', 'FuD5', 'FuD8', 'FuD9', 'FuD10', 'FuD12', 'FuD14', 'FuD15', 'FuD16', 'FuD19', 'FuD20', 'FuD21', 'FuD22'];
    const joss = ['JossT1', 'JossT2', 'JossT3', 'JossT4', 'JossT5', 'JossT6'];
    const walls = ['WalA1', 'WalA2', 'WalA3', 'WalA4', 'WalA5', 'WalB1', 'WalB2', 'WalB3', 'WalB4', 'WalB5'];
    st.tween({ ms: 620, ease: 'linear', update(t) {
      const w = Math.min(1, t * 3) * (1 - Math.max(0, (t - 0.72) / 0.28));
      for (let i = 0; i < chain.length; i++) {
        const s = Math.sin(t * Math.PI * 4 - i * 0.55) * w;
        st.rot(monk, chain[i], 0.18 * s, 0.12 * s, 0.26 * s);
      }
      for (let i = 0; i < walls.length; i++) st.rot(monk, walls[i], 0, 0, 0.13 * Math.sin(t * Math.PI * 3 - i * 0.4) * w);
      for (let i = 0; i < joss.length; i++) st.rot(monk, joss[i], 0.1 * Math.sin(t * Math.PI * 5 - i * 0.7) * w, 0, 0);
      st.rot(monk, 'BrowFu', 0.16 * Math.sin(t * Math.PI * 4) * w);
      st.rot(monk, 'FuX10', 0.14 * Math.sin(t * Math.PI * 4 + 2) * w);
    } });
    st.tween({ ms: 240, ease: 'out', update(t, e) {
      st.rot(monk, 'RShldr1Sh', -0.85 * e, 0, 0.28 * e); st.rot(monk, 'RElbow1El', -0.75 * e); st.rot(monk, 'RHand1Ha', -0.3 * e);
      st.rot(monk, 'BShldr', -0.35 * e); st.rot(monk, 'BElbow', -0.4 * e); st.rot(monk, 'BHand', -0.2 * e);
      st.rot(monk, 'Chest', 0.1 * e, -0.18 * e, 0); st.rot(monk, 'Hip', 0.06 * e); st.rot(monk, 'Neck', 0.12 * e); st.rot(monk, 'Head', 0.16 * e); st.rot(monk, 'Crown', 0.1 * e);
      st.rim(monk, 1 + 1.1 * e);
    } });
    st.at(240, () => {
      const from = st.worldOf(monk, 'HandFu', new THREE.Vector3()); from.y += 0.08;
      const ash = st.orb(from, 0.085, { opacity: 1 });
      ash.scale.setScalar(0.25);
      st.grow(ash, { ms: 150, from: 0.25, to: 1.45 });
      st.at(40, () => {
        const to = st.top(front, new THREE.Vector3()); to.y += 0.1;
        st.fly(ash, from, to, { ms: 280, ease: 'inout', arc: 0.6, done() {
          st.burst(to, { power: 0.9, n: 55 });
          st.fade(ash, { ms: 190, from: 1, to: 0 });
          const foot = st.foot(front, new THREE.Vector3());
          const r = st.ring(foot, 0.3, 0.06, { opacity: 0.95 });
          st.tween({ ms: 300, ease: 'out', update(t, e) { r.scale.setScalar(1 + 2.2 * e); r.material.opacity = 0.95 * (1 - e); } });
          st.tween({ ms: 300, ease: 'pulse', update(t, e) { st.rim(front, 1 + 2.0 * e); st.move(front, 0, 0.04 * e, 0); } });
        } });
      });
      st.at(360, () => st.tween({ ms: 380, ease: 'inout', update(t, e) {
        const k = 1 - e;
        st.rot(monk, 'RShldr1Sh', -0.85 * k, 0, 0.28 * k); st.rot(monk, 'RElbow1El', -0.75 * k); st.rot(monk, 'RHand1Ha', -0.3 * k);
        st.rot(monk, 'BShldr', -0.35 * k); st.rot(monk, 'BElbow', -0.4 * k); st.rot(monk, 'BHand', -0.2 * k);
        st.rot(monk, 'Chest', 0.1 * k, -0.18 * k, 0); st.rot(monk, 'Hip', 0.06 * k); st.rot(monk, 'Neck', 0.12 * k); st.rot(monk, 'Head', 0.16 * k); st.rot(monk, 'Crown', 0.1 * k);
        st.rim(monk, 1 + 1.1 * k);
      } }));
    });
  },

  /* 福壽綿長・福壽綿長（fushou，護法×2）：每拍回 1 hp 給最傷的一隻。
     編舞：燈火脹亮（0–320ms：FlmR 燈焰放大、雙眼高光脹開、頸與頭抬起、背脊與尾波動、頂冠張開）
          → 一縷暖火離燈（320ms）→ 拋物線飄到同伴身上（340–620ms）
          → 暖火沒入（620ms：一道光柱自腳底升起、三顆火星緩緩上飄）→ 燈火收斂（620–880ms）。 */
  wardRegen1(st) {
    const lamp = st.actor[0];
    const hurt = st.actor[1] || st.actor[0];
    const crowns = ['Cp0', 'Cp1', 'Cp2', 'Cp3'];
    const brms = ['Brm0', 'Brm1', 'Brm2'];
    // 燈火脹亮：燈罩上方先漲開一圈暖光暈（燈焰本身埋在腹下，光暈要浮到罩頂才看得見）
    const crest = st.top(lamp, new THREE.Vector3()); crest.y += 0.12;
    const halo = st.orb(crest, 0.19, { opacity: 0.6 });
    halo.scale.setScalar(0.3);
    st.grow(halo, { ms: 240, from: 0.3, to: 1.9 });
    st.fade(halo, { ms: 240, delay: 210, from: 0.6, to: 0 });
    st.tween({ ms: 260, ease: 'out', update(t, e) {
      st.scaleBone(lamp, 'FlmR', 1 + 0.85 * e);
      st.scaleBone(lamp, 'EyHiA', 1 + 0.6 * e); st.scaleBone(lamp, 'EyHiB', 1 + 0.6 * e);
      st.rot(lamp, 'Nk0', -0.2 * e); st.rot(lamp, 'Nk1', -0.16 * e); st.rot(lamp, 'Hd0', -0.18 * e); st.rot(lamp, 'Hd1', -0.1 * e);
      st.rot(lamp, 'Crest', -0.3 * e);
      for (let i = 0; i < crowns.length; i++) st.rot(lamp, crowns[i], -0.14 * e, 0, (i % 2 ? -1 : 1) * 0.16 * e);
      for (let i = 0; i < brms.length; i++) st.rot(lamp, brms[i], 0.1 * e * (1 + i * 0.3));
      st.rot(lamp, 'Bd0', -0.07 * e); st.rot(lamp, 'Bd1', -0.09 * e); st.rot(lamp, 'Bd2', -0.11 * e);
      st.rot(lamp, 'Tl0', 0.24 * e); st.rot(lamp, 'Tl1', 0.2 * e); st.rot(lamp, 'Tl2', 0.16 * e);
      st.rim(lamp, 1 + 1.5 * e);
    } });
    st.at(220, () => {
      // 一縷暖火先離燈上浮（浮過罩頂才看得見），再橫飄到同伴身上
      const from = crest.clone();
      const lift = crest.clone(); lift.y += 0.42;
      const ember = st.orb(from, 0.1, { opacity: 1 });
      ember.scale.setScalar(0.3);
      st.grow(ember, { ms: 150, from: 0.3, to: 1.35 });
      st.fly(ember, from, lift, { ms: 150, ease: 'out' });
      st.at(160, () => {
        const to = st.top(hurt, new THREE.Vector3()); to.y += 0.06;
        st.fly(ember, lift, to, { ms: 220, ease: 'inout', arc: 0.3, done() {
          st.burst(to, { power: 0.85, n: 48 });
          st.fade(ember, { ms: 190, from: 1, to: 0 });
          // 光柱：腳底升到頭頂
          const f0 = st.foot(hurt, new THREE.Vector3());
          const t0 = st.top(hurt, new THREE.Vector3());
          const col = st.beam(f0, t0, { opacity: 0 });
          st.tween({ ms: 300, ease: 'pulse', update(t, e) { col.material.opacity = 0.95 * e; } });
          st.tween({ ms: 300, ease: 'pulse', update(t, e) { st.rim(hurt, 1 + 1.9 * e); } });
          // 三顆火星緩緩上升
          for (let i = 0; i < 3; i++) {
            st.at(i * 40, () => {
              const p = f0.clone();
              p.x += (st.rnd() - 0.5) * 0.34; p.z += (st.rnd() - 0.5) * 0.34; p.y += 0.05;
              const q = p.clone(); q.y += 0.62;
              const spark = st.orb(p, 0.045, { opacity: 0.95 });
              st.fly(spark, p, q, { ms: 200, ease: 'out' });
              st.fade(spark, { ms: 200, delay: 15, from: 0.95, to: 0 });
            });
          }
        } });
      });
      st.at(300, () => st.tween({ ms: 340, ease: 'inout', update(t, e) {
        const k = 1 - e;
        st.scaleBone(lamp, 'FlmR', 1 + 0.85 * k);
        st.scaleBone(lamp, 'EyHiA', 1 + 0.6 * k); st.scaleBone(lamp, 'EyHiB', 1 + 0.6 * k);
        st.rot(lamp, 'Nk0', -0.2 * k); st.rot(lamp, 'Nk1', -0.16 * k); st.rot(lamp, 'Hd0', -0.18 * k); st.rot(lamp, 'Hd1', -0.1 * k);
        st.rot(lamp, 'Crest', -0.3 * k);
        for (let i = 0; i < crowns.length; i++) st.rot(lamp, crowns[i], -0.14 * k, 0, (i % 2 ? -1 : 1) * 0.16 * k);
        for (let i = 0; i < brms.length; i++) st.rot(lamp, brms[i], 0.1 * k * (1 + i * 0.3));
        st.rot(lamp, 'Bd0', -0.07 * k); st.rot(lamp, 'Bd1', -0.09 * k); st.rot(lamp, 'Bd2', -0.11 * k);
        st.rot(lamp, 'Tl0', 0.24 * k); st.rot(lamp, 'Tl1', 0.2 * k); st.rot(lamp, 'Tl2', 0.16 * k);
        st.rim(lamp, 1 + 1.5 * k);
      } }));
    });
  },

  /* 破軍旗・殘旗插心（pojun，兵×1）：本隊只剩 1 隻時 atk+1。
     編舞：倒矛過頂（0–300ms：雙臂把矛尖翻轉朝下高舉、身體後仰、旗桿後傾、冠顫）
          → 插心（300ms：雙臂猛力下壓，矛尖落在自己胸口，胸前屈、頭後仰、整尊下沉）
          → 一震（360ms：腳下一圈紅光暴亮、胸口一團光炸開、火星、punch、邊光衝到 3.4 倍）
          → 旗桿餘顫（遞減抖動 420ms）→ 收勢（500–880ms）。 */
  swarmLastStand(st) {
    const bearer = st.byBody(st.actor, 'swarm')[0] || st.actor[0];
    st.tween({ ms: 300, ease: 'out', update(t, e) {
      st.rot(bearer, 'LArm1Rt', -2.1 * e, 0, 0.25 * e); st.rot(bearer, 'LArm1El', -0.5 * e); st.rot(bearer, 'LArm1Wr', -0.3 * e);
      st.rot(bearer, 'RArm1Rt', -2.0 * e, 0, -0.25 * e); st.rot(bearer, 'RArm1El', -0.45 * e); st.rot(bearer, 'RArm1Wr', -0.3 * e);
      st.rot(bearer, 'SpearRoot', 1.5 * e); st.rot(bearer, 'SpearMid', 0.5 * e); st.rot(bearer, 'SpearTip', 0.3 * e);
      st.rot(bearer, 'PoleRoot', -0.3 * e); st.rot(bearer, 'PoleMid', -0.2 * e); st.rot(bearer, 'PoleTop', -0.14 * e);
      st.rot(bearer, 'Chest', -0.22 * e); st.rot(bearer, 'Spine', -0.14 * e); st.rot(bearer, 'NeckB', -0.2 * e); st.rot(bearer, 'HeadRoot', -0.26 * e);
      st.rot(bearer, 'CrownRoot', -0.16 * e); st.rot(bearer, 'Crown1', -0.2 * e); st.rot(bearer, 'CrownTip', -0.26 * e);
      st.rim(bearer, 1 + 0.8 * e);
    } });
    st.at(300, () => {
      st.tween({ ms: 150, ease: 'outQuint', update(t, e) {
        st.rot(bearer, 'LArm1Rt', -2.1 + 1.55 * e, 0, 0.25 - 0.35 * e); st.rot(bearer, 'LArm1El', -0.5 + 0.95 * e); st.rot(bearer, 'LArm1Wr', -0.3 + 0.3 * e);
        st.rot(bearer, 'RArm1Rt', -2.0 + 1.5 * e, 0, -0.25 + 0.35 * e); st.rot(bearer, 'RArm1El', -0.45 + 0.9 * e); st.rot(bearer, 'RArm1Wr', -0.3 + 0.3 * e);
        st.rot(bearer, 'SpearRoot', 1.5 + 0.75 * e); st.rot(bearer, 'SpearMid', 0.5 + 0.3 * e); st.rot(bearer, 'SpearTip', 0.3 + 0.2 * e);
        st.rot(bearer, 'Chest', -0.22 + 0.65 * e); st.rot(bearer, 'Spine', -0.14 + 0.34 * e);
        st.rot(bearer, 'NeckB', -0.2 - 0.2 * e); st.rot(bearer, 'HeadRoot', -0.26 - 0.28 * e);
        st.move(bearer, 0, -0.075 * e, 0);
      } });
      st.at(60, () => {
        // 一震：腳下紅光、胸口炸開
        const foot = st.foot(bearer, new THREE.Vector3());
        const glowDisc = st.disc(foot, 0.62, { opacity: 0.6 });
        glowDisc.scale.setScalar(0.35);
        st.grow(glowDisc, { ms: 180, from: 0.35, to: 1.35 });
        st.fade(glowDisc, { ms: 300, delay: 150, from: 0.6, to: 0 });
        const heart = st.worldOf(bearer, 'Chest', new THREE.Vector3());
        const core = st.orb(heart, 0.11, { opacity: 1 });
        core.scale.setScalar(0.25);
        st.grow(core, { ms: 220, from: 0.25, to: 2.1 });
        st.fade(core, { ms: 260, delay: 90, from: 1, to: 0 });
        st.burst(heart, { power: 0.95, n: 55 });
        st.punch(0.4);
        st.tween({ ms: 420, ease: 'snap', update(t, e) { st.rim(bearer, 1 + 2.4 * e); } });
        // 旗桿餘顫
        st.tween({ ms: 420, ease: 'linear', update(t) {
          const s = Math.sin(t * Math.PI * 7) * (1 - t) * (1 - t);
          st.rot(bearer, 'PoleRoot', -0.3 * (1 - t) + 0.16 * s, 0, 0.2 * s);
          st.rot(bearer, 'PoleMid', -0.2 * (1 - t) + 0.2 * s, 0, 0.28 * s);
          st.rot(bearer, 'PoleTop', -0.14 * (1 - t) + 0.26 * s, 0, 0.36 * s);
          st.rot(bearer, 'CrownRoot', -0.16 * (1 - t), 0, 0.1 * s); st.rot(bearer, 'Crown1', -0.2 * (1 - t), 0, 0.14 * s); st.rot(bearer, 'CrownTip', -0.26 * (1 - t), 0, 0.2 * s);
          st.rot(bearer, 'SkirtRoot', 0, 0, 0.09 * s); st.rot(bearer, 'Skirt1', 0, 0, 0.13 * s); st.rot(bearer, 'SkirtHem', 0, 0, 0.17 * s);
        } });
      });
      st.at(200, () => st.tween({ ms: 380, ease: 'inout', update(t, e) {
        const k = 1 - e;
        st.rot(bearer, 'LArm1Rt', -0.55 * k, 0, -0.1 * k); st.rot(bearer, 'LArm1El', 0.45 * k); st.rot(bearer, 'LArm1Wr', 0);
        st.rot(bearer, 'RArm1Rt', -0.5 * k, 0, 0.1 * k); st.rot(bearer, 'RArm1El', 0.45 * k); st.rot(bearer, 'RArm1Wr', 0);
        st.rot(bearer, 'SpearRoot', 2.25 * k); st.rot(bearer, 'SpearMid', 0.8 * k); st.rot(bearer, 'SpearTip', 0.5 * k);
        st.rot(bearer, 'Chest', 0.43 * k); st.rot(bearer, 'Spine', 0.2 * k); st.rot(bearer, 'NeckB', -0.4 * k); st.rot(bearer, 'HeadRoot', -0.54 * k);
        st.move(bearer, 0, -0.075 * k, 0);
      } }));
    });
  },
};
export default MOVES;

/* ══════════ Tier 1 短版（260ms，v0.54 三級視覺分級）══════════
   寫法紀律與踩過的坑見 js/trait-fx/zuling.js 同一區塊的檔頭（horizon ≤230、補間一律頂層
   用 delay 排定、不用 st.at、回呼裡只放 burst／punch）。辨識元素表在
   docs/experiments/2026-09-10-plan-fx-tiers.md §5。 */
export const SHORT = {
  /* 斬瘟｜辨識：★劍本體★＋**紅刃衝刺拖出的寬軌跡**＋對面整排依序退縮
     （盲讀 r2：短 2/2 vs 完整 4/3。讀者 C 點名完整版的特徵是「紅刃衝刺拖出寬軌跡」，
      二版的短版只有原地揮＋腳下光弧，所以補上衝刺與軌跡帶） */
  eliteCleave(st) {
    const K = st.ms / 260;
    const gen = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const foot = st.foot(gen, new THREE.Vector3());
    const arc = st.disc(foot, 0.75, { opacity: 0 });
    arc.scale.setScalar(0.3);
    const blade = st.spawn(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.66, 0.045), st.glow(undefined, 0)), 'blade');
    const hilt = st.spawn(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), st.glow(undefined, 0)), 'blade');
    const hand = new THREE.Vector3();
    const place = (ang, lift, fwd) => {
      st.worldOf(gen, 'RArm1El', hand);
      blade.position.copy(hand); blade.position.y += lift;
      blade.position.addScaledVector(st.dir, fwd || 0);
      blade.rotation.set(0, 0, ang);
      hilt.position.copy(blade.position); hilt.position.y -= 0.3 * Math.cos(ang);
      hilt.rotation.set(0, 0, ang);
    };
    place(0, 0.34, 0);
    // ★衝刺軌跡★：從自己腳邊拉到對面的一條寬帶（讀者 C 說的「拖出寬軌跡」）
    const foeC = st.target.length ? st.worldOf(st.target[0], null, new THREE.Vector3()) : foot.clone().addScaledVector(st.dir, 1.6);
    const trailA = st.beam(foot.clone().add(new THREE.Vector3(0, 0.5, 0)), foeC, { opacity: 0 });
    const trailB = st.beam(foot.clone().add(new THREE.Vector3(0, 0.34, 0)), foeC.clone().add(new THREE.Vector3(0, -0.1, 0)), { opacity: 0 });
    const trailC = st.beam(foot.clone().add(new THREE.Vector3(0, 0.66, 0)), foeC.clone().add(new THREE.Vector3(0, 0.12, 0)), { opacity: 0 });
    st.tween({ ms: 80 * K, ease: 'wind', update(t, e) { // 舉劍：劍身同時現形
      st.rot(gen, 'RArm1Rt', -1.15 * e, 0, -0.3 * e); st.rot(gen, 'RArm1El', -0.5 * e);
      st.rot(gen, 'Chest', -0.16 * e, 0.24 * e, 0); st.rot(gen, 'HeadRoot', -0.12 * e);
      st.rim(gen, 1 + 1.3 * e);
      blade.material.opacity = Math.min(1, e * 2.4); hilt.material.opacity = Math.min(1, e * 2.4);
      place(-0.35 * e, 0.34 + 0.1 * e, 0);
    } });
    st.tween({ ms: 86 * K, delay: 78 * K, ease: 'strike', update(t, e) { // ★衝刺★：整尊往對面衝出去，劍跟著劈
      st.rot(gen, 'RArm1Rt', -1.15 + 1.9 * e, 0, -0.3 + 0.6 * e); st.rot(gen, 'RArm1El', -0.5 + 0.7 * e);
      st.rot(gen, 'Chest', -0.16 + 0.36 * e, 0.24 - 0.5 * e, 0);
      st.move(gen, 0, 0, 0.34 * e); // 一版只前踏 0.13，這裡是真的衝過去
      place(-0.35 + 2.5 * e, 0.44 - 0.5 * e, 0.3 * e);
    }, done() { st.punch(0.6); } });
    // 三條軌跡錯開淡出＝一條會拖尾的寬帶
    st.fade(trailA, { ms: 96 * K, delay: 96 * K, from: 1, to: 0 });
    st.fade(trailB, { ms: 92 * K, delay: 104 * K, from: 0.9, to: 0 });
    st.fade(trailC, { ms: 92 * K, delay: 112 * K, from: 0.8, to: 0 });
    st.grow(arc, { ms: 92 * K, delay: 100 * K, from: 0.3, to: 1.8 });
    st.fade(arc, { ms: 92 * K, delay: 100 * K, from: 0.7, to: 0 });
    st.target.forEach((f, i) => { if (i < 4) st.flinch([f], { delay: (116 + i * 12) * K, strength: 1.05, burst: i < 2 }); });
    st.fade(blade, { ms: 62 * K, delay: 166 * K, from: 1, to: 0 });
    st.fade(hilt, { ms: 62 * K, delay: 166 * K, from: 1, to: 0 });
    st.tween({ ms: 62 * K, delay: 166 * K, ease: 'inout', update(t, e) { // 收劍、退回原位
      const k = 1 - e;
      st.rot(gen, 'RArm1Rt', 0.75 * k, 0, 0.3 * k); st.rot(gen, 'RArm1El', 0.2 * k);
      st.rot(gen, 'Chest', 0.2 * k, -0.26 * k, 0); st.rot(gen, 'HeadRoot', -0.12 * k);
      st.move(gen, 0, 0, 0.34 * k); st.rim(gen, 1 + 1.3 * k);
    } });
  },

  /* 令旗改陣｜辨識：★旗面本體★由後猛甩到前＋兩道令波推過本方整排
     （盲讀 r2：短版只有骨骼在轉、看不到旗；補一面真的旗） */
  wardAtkAll1(st) {
    const K = st.ms / 260;
    const flagUnit = st.byBody(st.actor, 'ward')[0] || st.actor[0];
    const foot = st.foot(flagUnit, new THREE.Vector3());
    const w1 = st.ring(foot, 0.4, 0.055, { opacity: 0 });
    const w2 = st.ring(foot, 0.4, 0.045, { opacity: 0 });
    // ★旗面本體★：掛在 FlagMast 上的一片布
    const cloth = st.spawn(new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.28), st.glow(undefined, 0)), 'flag');
    const mastP = new THREE.Vector3();
    const place = (ang) => {
      st.worldOf(flagUnit, 'FlagMast', mastP);
      cloth.position.copy(mastP); cloth.position.y += 0.26;
      cloth.position.addScaledVector(st.dir, 0.1 + 0.18 * Math.sin(ang));
      cloth.rotation.set(0, Math.atan2(st.dir.x, st.dir.z), ang * 0.5);
    };
    place(0);
    st.tween({ ms: 84 * K, ease: 'wind', update(t, e) { // 壓身舉旗：旗面現形、旗桿後倒
      st.rot(flagUnit, 'FlagMast', -0.7 * e); st.rot(flagUnit, 'Withers', 0.1 * e); st.rot(flagUnit, 'Chest', 0.12 * e);
      st.rot(flagUnit, 'HeadRoot', -0.2 * e); st.rot(flagUnit, 'Jaw1', 0.26 * e); st.rot(flagUnit, 'TailRoot', -0.2 * e);
      st.rim(flagUnit, 1 + 1 * e);
      cloth.material.opacity = Math.min(1, e * 2.3);
      place(-0.7 * e);
    } });
    st.tween({ ms: 72 * K, delay: 82 * K, ease: 'strike', update(t, e) { // 揮旗下令：旗桿由後猛甩到前
      st.rot(flagUnit, 'FlagMast', -0.7 + 1.5 * e); st.rot(flagUnit, 'Chest', 0.12 - 0.24 * e);
      st.rot(flagUnit, 'HeadRoot', -0.2 + 0.24 * e); st.rot(flagUnit, 'Tail1', 0.24 * e);
      place(-0.7 + 1.5 * e);
    }, done() { st.punch(0.4); } });
    st.grow(w1, { ms: 90 * K, delay: 106 * K, from: 0.3, to: 1.7 }); // 兩道令波推過本方整排
    st.fade(w1, { ms: 90 * K, delay: 106 * K, from: 0.8, to: 0 });
    st.grow(w2, { ms: 88 * K, delay: 132 * K, from: 0.3, to: 2 });
    st.fade(w2, { ms: 88 * K, delay: 132 * K, from: 0.6, to: 0 });
    st.actor.forEach((f, i) => st.tween({ ms: 76 * K, delay: (114 + i * 12) * K, ease: 'snap', update(t, e) { // 全體聞令側踏
      st.move(f, 0.07 * e, 0, 0); st.rim(f, 1 + 1.6 * e);
    } }));
    st.fade(cloth, { ms: 58 * K, delay: 166 * K, from: 1, to: 0 });
    st.tween({ ms: 62 * K, delay: 164 * K, ease: 'inout', update(t, e) { // 收旗
      const k = 1 - e;
      st.rot(flagUnit, 'FlagMast', 0.8 * k); st.rot(flagUnit, 'Withers', 0.1 * k); st.rot(flagUnit, 'Jaw1', 0.26 * k);
      st.rot(flagUnit, 'Tail1', 0.24 * k); st.rot(flagUnit, 'TailRoot', -0.2 * k); st.rim(flagUnit, 1 + 1 * k);
    } });
  },

  /* 送王船｜辨識：★船推出去★＋**撞開一道水牆打向對面**（對面退縮）；金罩縮成配角
     （盲讀 r2：低分共同特徵是「效果只在自己身上」；讀者 C 另外說「淡白半圓罩與地上光環分不出」，
      所以這一支改成以「船前衝＋水牆」為主角，罩只留一層薄的） */
  wardAbsorb4(st) {
    const K = st.ms / 260;
    const boats = st.byBody(st.actor, 'ward').length ? st.byBody(st.actor, 'ward') : st.actor;
    const lead = boats[0];
    const mid = st.worldOf(lead, 'MidShip', new THREE.Vector3());
    const shell = st.dome(mid, 0.78, { opacity: 0 });
    const lamp = st.orb(st.worldOf(lead, 'MastTop', new THREE.Vector3()), 0.055, { opacity: 0 });
    shell.scale.setScalar(0.35);
    // ★水牆★：船前方一道往對面推的環＋一片水花盤（指向性）
    const front = mid.clone().addScaledVector(st.dir, 0.55);
    const wall = st.ring(front, 0.34, 0.09, { opacity: 0 });
    const spray = st.disc(front, 0.4, { opacity: 0 });
    wall.scale.setScalar(0.3); spray.scale.setScalar(0.25);
    boats.forEach((b, i) => {
      st.tween({ ms: 82 * K, delay: i * 14 * K, ease: 'out', update(t, e) { // 離岸：船尾翹、桅挺直、桅頂燃香火
        st.rot(b, 'SternRise', -0.22 * e); st.rot(b, 'Mast1', 0.14 * e); st.rot(b, 'Mast3', 0.1 * e);
        st.rot(b, 'BowRise', 0.14 * e); st.rim(b, 1 + 0.9 * e);
      } });
      st.tween({ ms: 92 * K, delay: 80 * K + i * 14 * K, ease: 'strike', update(t, e) { // ★前衝★（一版只滑 0.16）
        st.move(b, 0, 0, 0.3 * e); st.rot(b, 'BowTip', -0.26 * e); st.rot(b, 'SternTip', 0.12 * e);
      } });
    });
    st.fade(lamp, { ms: 50 * K, delay: 30 * K, from: 0, to: 1 });
    st.grow(wall, { ms: 96 * K, delay: 96 * K, from: 0.3, to: 2.1 }); // 水牆往對面推出去
    st.fade(wall, { ms: 96 * K, delay: 96 * K, from: 0.95, to: 0 });
    st.grow(spray, { ms: 84 * K, delay: 104 * K, from: 0.25, to: 1.7 });
    st.fade(spray, { ms: 84 * K, delay: 104 * K, from: 0.6, to: 0 });
    st.target.forEach((f, i) => { if (i < 3) st.flinch([f], { delay: (120 + i * 14) * K, strength: 0.9, burst: i === 0 }); }); // ★受方反應★
    st.grow(shell, { ms: 80 * K, delay: 118 * K, from: 0.35, to: 1.05 }); // 金罩：配角，薄薄一層
    st.fade(shell, { ms: 48 * K, delay: 118 * K, from: 0, to: 0.3 });
    st.fade(shell, { ms: 58 * K, delay: 166 * K, from: 0.3, to: 0 });
    st.fade(lamp, { ms: 52 * K, delay: 170 * K, from: 1, to: 0 });
    st.tween({ ms: 60 * K, delay: 168 * K, ease: 'inout', update(t, e) { // 船退回原位
      const k = 1 - e;
      boats.forEach((b) => {
        st.move(b, 0, 0, 0.3 * k); st.rot(b, 'BowTip', -0.26 * k); st.rot(b, 'SternRise', -0.22 * k);
        st.rot(b, 'Mast1', 0.14 * k); st.rim(b, 1 + 0.9 * k);
      });
    } });
  },

  /* 千里眼｜tier 1 短版 = 完整版**同一支函式**（v0.55，時間軸由 st.beat 換算） */
  wardImmuneLost: MOVES.wardImmuneLost,

  /* 五方調兵｜辨識：★旗面本體（一面會飄的令旗）★＋五方光陣＋令波推向對面
     （盲讀 r2：短版只有腳下光陣＝效果全在自己身上，看不出「旗」） */
  swarmRally(st) {
    const K = st.ms / 260;
    const men = st.byBody(st.actor, 'swarm').length ? st.byBody(st.actor, 'swarm') : st.actor;
    const lead = men[0];
    const foot = st.foot(lead, new THREE.Vector3());
    const core = st.disc(foot, 0.42, { opacity: 0 });
    core.scale.setScalar(0.3);
    // ★旗面本體★：掛在旗頂的一片布，隨手臂翻轉
    const flag = st.spawn(new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), st.glow(undefined, 0)), 'flag');
    const pole = st.spawn(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), st.glow(undefined, 0)), 'flag');
    const top = new THREE.Vector3();
    const place = (ang, lift) => {
      st.worldOf(lead, 'FlagTop', top);
      pole.position.copy(top); pole.position.y += lift; pole.rotation.set(0, 0, ang);
      flag.position.copy(pole.position); flag.position.addScaledVector(st.dir, 0.16); flag.position.y += 0.12;
      flag.rotation.set(0, Math.atan2(st.dir.x, st.dir.z), ang * 0.6);
    };
    place(0, 0.22);
    const w1 = st.ring(foot, 0.4, 0.06, { opacity: 0 });
    const w2 = st.ring(foot, 0.4, 0.045, { opacity: 0 });
    const fires = [], lines = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const p = foot.clone().add(new THREE.Vector3(Math.cos(a) * 0.42, 0.02, Math.sin(a) * 0.42));
      fires.push(st.orb(p, 0.035, { opacity: 0 }));
      lines.push(st.beam(foot.clone(), p, { opacity: 0 }));
    }
    st.tween({ ms: 80 * K, ease: 'wind', update(t, e) { // 舉旗過頭：旗面同時現形
      st.rot(lead, 'RArm1Rt', -1.2 * e); st.rot(lead, 'RArm1El', -0.4 * e); st.rot(lead, 'FlagTop', -0.5 * e);
      st.rot(lead, 'Chest', 0, 0.3 * e, 0); st.rot(lead, 'HelmRoot', -0.16 * e); st.rim(lead, 1 + 1.1 * e);
      const k = Math.min(1, e * 2.2);
      flag.material.opacity = 0.95 * k; pole.material.opacity = 0.95 * k;
      place(-0.5 * e, 0.22 + 0.12 * e);
    } });
    st.tween({ ms: 74 * K, delay: 78 * K, ease: 'strike', update(t, e) { // 落旗：旗面由上劈到前
      st.rot(lead, 'RArm1Rt', -1.2 + 1.75 * e); st.rot(lead, 'RArm1El', -0.4 + 0.55 * e);
      st.rot(lead, 'FlagTop', -0.5 + 1.1 * e); st.rot(lead, 'Chest', 0, 0.3 - 0.55 * e, 0);
      place(-0.5 + 1.9 * e, 0.34 - 0.34 * e);
    }, done() { st.punch(0.5); } });
    st.grow(core, { ms: 85 * K, delay: 104 * K, from: 0.3, to: 1.5 });
    st.fade(core, { ms: 50 * K, delay: 104 * K, from: 0, to: 0.6 });
    st.fade(core, { ms: 66 * K, delay: 160 * K, from: 0.6, to: 0 });
    fires.forEach((o, i) => { st.fade(o, { ms: 40 * K, delay: (108 + i * 6) * K, from: 0, to: 1 }); st.fade(o, { ms: 56 * K, delay: 164 * K, from: 1, to: 0 }); });
    lines.forEach((l, i) => st.fade(l, { ms: 76 * K, delay: (112 + i * 6) * K, from: 0.85, to: 0 }));
    st.grow(w1, { ms: 90 * K, delay: 110 * K, from: 0.3, to: 1.9 }); // 令波往外推（指向整片戰場）
    st.fade(w1, { ms: 90 * K, delay: 110 * K, from: 0.8, to: 0 });
    st.grow(w2, { ms: 84 * K, delay: 134 * K, from: 0.3, to: 2.2 });
    st.fade(w2, { ms: 84 * K, delay: 134 * K, from: 0.55, to: 0 });
    men.forEach((f, i) => st.tween({ ms: 68 * K, delay: (122 + i * 12) * K, ease: 'snap', update(t, e) { // 三尊錯開頓足
      st.move(f, 0, -0.05 * e, 0); st.rot(f, 'RLeg1Kn', -0.3 * e); st.rim(f, 1 + 1.4 * e);
    } }));
    st.fade(flag, { ms: 58 * K, delay: 168 * K, from: 0.95, to: 0 });
    st.fade(pole, { ms: 58 * K, delay: 168 * K, from: 0.95, to: 0 });
    st.tween({ ms: 58 * K, delay: 168 * K, ease: 'inout', update(t, e) { // 旗收回
      const k = 1 - e;
      st.rot(lead, 'RArm1Rt', 0.55 * k); st.rot(lead, 'FlagTop', 0.6 * k); st.rot(lead, 'HelmRoot', -0.16 * k);
      st.rim(lead, 1 + 1.1 * k);
    } });
  },

  /* 虎爺反咬｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**：時間軸全由 st.beat／st.ms 換算，
     兩個 tier 的差別只是比例表（2026-09-12 演出卷 E 轉正後仍是這個做法）。 */
  biteGamble: MOVES.biteGamble,

  /* 香灰符｜辨識：掌心一撮金灰拋物線飄到本方最前一隻的頭頂 */
  wardHpFirst(st) {
    const K = st.ms / 260;
    const monk = st.byBody(st.actor, 'ward')[0] || st.actor[0];
    const mate = st.actor[1] || monk;
    const palm = st.worldOf(monk, 'RHand1Ha', new THREE.Vector3());
    const head = st.top(mate, new THREE.Vector3());
    const ash = st.orb(palm, 0.045, { opacity: 0 });
    const halo = st.ring(st.foot(mate, new THREE.Vector3()), 0.3, 0.04, { opacity: 0 });
    ash.scale.setScalar(0.35);
    st.tween({ ms: 80 * K, ease: 'out', update(t, e) { // 右臂把香灰捧到胸前、身體微俯
      st.rot(monk, 'RShldr1Sh', -0.5 * e); st.rot(monk, 'RElbow1El', -0.6 * e); st.rot(monk, 'Chest', 0.12 * e);
      st.rot(monk, 'BrowFu', 0, 0, 0.2 * e); st.rot(monk, 'Neck', 0.1 * e); st.rim(monk, 1 + 0.6 * e);
      st.worldOf(monk, 'RHand1Ha', ash.position);
    } });
    st.fade(ash, { ms: 45 * K, delay: 60 * K, from: 0, to: 1 }); // 一撮金灰自掌心升起
    st.grow(ash, { ms: 60 * K, delay: 60 * K, from: 0.35, to: 1.1 });
    st.fly(ash, palm.clone(), head, { ms: 80 * K, delay: 82 * K, ease: 'inout', arc: 0.22, // 拋物線飄到頭頂
      done() { st.burst(head, { power: 0.5, n: 26 }); } });
    st.fade(ash, { ms: 48 * K, delay: 160 * K, from: 1, to: 0 });
    st.grow(halo, { ms: 82 * K, delay: 145 * K, from: 0.3, to: 1.4 }); // 腳下一圈金環漲開
    st.fade(halo, { ms: 82 * K, delay: 145 * K, from: 0.7, to: 0 });
    st.tween({ ms: 72 * K, delay: 155 * K, ease: 'pulse', update(t, e) { st.move(mate, 0, 0.04 * e, 0); st.rim(mate, 1 + 1.5 * e); } });
    st.tween({ ms: 62 * K, delay: 162 * K, ease: 'inout', update(t, e) { // 收手
      const k = 1 - e;
      st.rot(monk, 'RShldr1Sh', -0.5 * k); st.rot(monk, 'RElbow1El', -0.6 * k); st.rot(monk, 'Chest', 0.12 * k);
      st.rot(monk, 'BrowFu', 0, 0, 0.2 * k); st.rim(monk, 1 + 0.6 * k);
    } });
  },

  /* 福壽綿長｜辨識：★燈本體（一顆脹到 1.9× 的大火球）★＋暖火飛到同伴身上炸開
     （盲讀 r2：短版的火太小、飛太快。照雷女之火成功的做法：本體提前現形、燒滿整段） */
  wardRegen1(st) {
    const K = st.ms / 260;
    const lamp = st.byBody(st.actor, 'ward')[0] || st.actor[0];
    const mate = st.actor[1] || lamp;
    const flm = st.worldOf(lamp, 'FlmR', new THREE.Vector3());
    const mateP = st.worldOf(mate, null, new THREE.Vector3());
    const foot = st.foot(mate, new THREE.Vector3());
    const top = st.top(mate, new THREE.Vector3());
    // ★燈本體★：一顆大火球疊在燈焰上，35ms 就看得到，脹到 1.9×
    const core = st.orb(flm, 0.085, { opacity: 0 });
    const warm = st.orb(flm, 0.05, { opacity: 0 });
    const pillar = st.beam(foot.clone(), top, { opacity: 0 });
    const land = st.ring(foot, 0.3, 0.05, { opacity: 0 });
    core.scale.setScalar(0.35); warm.scale.setScalar(0.3); land.scale.setScalar(0.3);
    st.tween({ ms: 86 * K, ease: 'out', update(t, e) { // 燈火脹亮：本體先長出來
      st.scaleBone(lamp, 'FlmR', 1 + 0.7 * e); st.scaleBone(lamp, 'Crest', 1 + 0.24 * e);
      st.rot(lamp, 'Nk0', -0.14 * e); st.rot(lamp, 'Hd0', -0.16 * e); st.rot(lamp, 'Tl1', 0.16 * e);
      st.rim(lamp, 1 + 1.3 * e);
      const k = Math.min(1, e * 2.4);
      core.material.opacity = 0.85 * k; core.scale.setScalar(0.35 + 1.55 * k);
      st.worldOf(lamp, 'FlmR', core.position); st.worldOf(lamp, 'FlmR', warm.position);
    } });
    st.fade(warm, { ms: 40 * K, delay: 60 * K, from: 0, to: 1 });
    st.grow(warm, { ms: 56 * K, delay: 60 * K, from: 0.3, to: 1.25 });
    st.fly(warm, flm.clone(), mateP, { ms: 88 * K, delay: 84 * K, ease: 'inout', arc: 0.24, // 暖火飛到同伴身上
      done() { st.burst(mateP, { power: 0.7, n: 34 }); st.punch(0.28); } });
    st.fade(core, { ms: 62 * K, delay: 100 * K, from: 0.85, to: 0 });
    st.fade(warm, { ms: 44 * K, delay: 172 * K, from: 1, to: 0 });
    st.fade(pillar, { ms: 86 * K, delay: 140 * K, from: 0.9, to: 0 }); // 光柱自腳底升起
    st.grow(land, { ms: 82 * K, delay: 148 * K, from: 0.3, to: 1.6 });
    st.fade(land, { ms: 82 * K, delay: 148 * K, from: 0.7, to: 0 });
    st.tween({ ms: 76 * K, delay: 150 * K, ease: 'pulse', update(t, e) { st.rim(mate, 1 + 1.9 * e); st.move(mate, 0, 0.04 * e, 0); } });
    st.tween({ ms: 60 * K, delay: 168 * K, ease: 'inout', update(t, e) { // 燈火收斂
      const k = 1 - e;
      st.scaleBone(lamp, 'FlmR', 1 + 0.7 * k); st.scaleBone(lamp, 'Crest', 1 + 0.24 * k);
      st.rot(lamp, 'Nk0', -0.14 * k); st.rot(lamp, 'Hd0', -0.16 * k); st.rot(lamp, 'Tl1', 0.16 * k);
      st.rim(lamp, 1 + 1.3 * k);
    } });
  },

  /* 殘旗插心｜辨識：矛尖倒轉插進自己胸口＋腳下紅光暴亮 */
  swarmLastStand(st) {
    const K = st.ms / 260;
    const man = st.actor[0];
    const foot = st.foot(man, new THREE.Vector3());
    const chest = st.worldOf(man, 'Chest', new THREE.Vector3());
    const blaze = st.disc(foot, 0.38, { opacity: 0 });
    const burstOrb = st.orb(chest, 0.06, { opacity: 0 });
    blaze.scale.setScalar(0.35); burstOrb.scale.setScalar(0.3);
    st.tween({ ms: 88 * K, ease: 'wind', update(t, e) { // 倒矛過頂：雙臂把矛尖翻轉朝下高舉、身體後仰
      st.rot(man, 'LArm1Rt', -1.25 * e); st.rot(man, 'RArm1Rt', -1.25 * e);
      st.rot(man, 'SpearRoot', 2.2 * e); st.rot(man, 'PoleTop', -0.3 * e);
      st.rot(man, 'Chest', -0.2 * e); st.rot(man, 'CrownTip', -0.24 * e); st.rim(man, 1 + 0.5 * e);
    } });
    st.tween({ ms: 62 * K, delay: 86 * K, ease: 'in', update(t, e) { // 插心：雙臂猛力下壓、整尊下沉
      st.rot(man, 'LArm1Rt', -1.25 + 1.5 * e); st.rot(man, 'RArm1Rt', -1.25 + 1.5 * e);
      st.rot(man, 'Chest', -0.2 + 0.55 * e); st.rot(man, 'HeadRoot', -0.3 * e);
      st.move(man, 0, -0.07 * e, 0);
    }, done() { st.burst(chest, { power: 1.1, n: 52, color: 0xd8382c }); st.punch(0.7); } });
    st.fade(burstOrb, { ms: 40 * K, delay: 146 * K, from: 0, to: 1 }); // 胸口一團光炸開
    st.grow(burstOrb, { ms: 85 * K, delay: 146 * K, from: 0.3, to: 2.1 });
    st.fade(burstOrb, { ms: 55 * K, delay: 172 * K, from: 1, to: 0 });
    st.grow(blaze, { ms: 82 * K, delay: 148 * K, from: 0.35, to: 1.7 }); // 腳下一圈紅光暴亮
    st.fade(blaze, { ms: 82 * K, delay: 148 * K, from: 0.8, to: 0 });
    st.tween({ ms: 78 * K, delay: 150 * K, ease: 'out', update(t, e) { // 旗桿餘顫＋邊光衝到 3.4 倍
      const damp = (1 - e) * (1 - e);
      st.rot(man, 'PoleMid', 0, 0, 0.2 * damp * Math.sin(e * 22));
      st.rot(man, 'CrownTip', 0.18 * damp * Math.sin(e * 18));
      st.rim(man, 1 + 2.4 * (1 - e));
    } });
    st.tween({ ms: 58 * K, delay: 170 * K, ease: 'inout', update(t, e) { // 收勢
      const k = 1 - e;
      st.rot(man, 'LArm1Rt', 0.25 * k); st.rot(man, 'RArm1Rt', 0.25 * k); st.rot(man, 'SpearRoot', 2.2 * k);
      st.rot(man, 'Chest', 0.35 * k); st.rot(man, 'HeadRoot', -0.3 * k); st.move(man, 0, -0.07 * k, 0);
    } });
  },
};

/* ══════════ v0.54 原版（開關 `PW_FX.VOCAB_ON=false` ＝預設時登記的就是這一份）══════════
   v0.55 批 0 把這一系的示範招改成「徽記剪影」版本（上面 MOVES／SHORT 裡的那一份）。
   製作人看了實際畫面判定**這個方向做錯了**：平面單色 billboard 貼在紙紮 3D 上像剪貼畫，
   兩輪盲讀 0/3。線上因此先退回 0.54 的演出，0.55 版本原地保留在 `?fxvocab=1` 後面
   給治具與後續參考（方向重定見 docs/proposals/2026-09-12-plan-fx-performance.md）。

   ★這一段的本體逐字取自 `6a839de`，只改了函式名那一行★（`_v054`／`_v054short` 後綴是為了
   不與同檔的 0.55 同名函式相撞，也讓 `tests/tools/fn-hash.mjs` 把兩份切成不同區塊）。
   **不得在這裡改任何一行**：它是「退回 0.54」這個宣稱的實體，動了它就不是 0.54 了。
   後綴在登記點（js/trait-fx.js）剝掉換回 trId——分派只做一次，四支函式內一個 if 都沒有。 */

export const V054 = {
  wardImmuneLost_v054(st) {
    const ringer = st.actor[0];
    const mates = st.actor.slice();
    st.tween({ ms: 780, ease: 'wind', update(t, e) { st.rim(ringer, 1 + 1.7 * e); } });
    st.tween({ ms: 260, ease: 'out', update(t, e) {
      st.rot(ringer, 'ArmURoot', -1.2 * e, 0, 0.3 * e); st.rot(ringer, 'ArmUElbow', -0.55 * e); st.rot(ringer, 'ArmUWrist', -0.28 * e);
      st.rot(ringer, 'ArmDRoot', 0.3 * e, 0, -0.22 * e); st.rot(ringer, 'ArmDElbow', -0.2 * e); st.rot(ringer, 'AxeHead', 0.25 * e);
      st.rot(ringer, 'Chest', -0.12 * e, -0.24 * e, 0); st.rot(ringer, 'NeckB', -0.18 * e); st.rot(ringer, 'Spine', -0.08 * e);
      st.rot(ringer, 'BellRoot', -0.32 * e); st.rot(ringer, 'BellStem', -0.22 * e); st.rot(ringer, 'BellShoulder', -0.12 * e);
    } });
    st.at(260, () => {
      st.burst(st.worldOf(ringer, 'BellTop', new THREE.Vector3()), { power: 0.5, n: 26 });
      st.tween({ ms: 420, ease: 'linear', update(t) {
        const s = Math.sin(t * Math.PI * 3) * (1 - t * 0.5);
        st.rot(ringer, 'ArmURoot', -1.2, 0, 0.3 + 0.26 * s); st.rot(ringer, 'ArmUWrist', -0.28, 0, 0.5 * s); st.rot(ringer, 'ArmUHand', 0, 0, 0.4 * s);
        st.rot(ringer, 'BellRoot', -0.32, 0, 0.55 * s); st.rot(ringer, 'BellStem', -0.22, 0, 0.45 * s); st.rot(ringer, 'BellWaist', 0, 0, 0.35 * s);
        st.rot(ringer, 'BellLip', 0, 0, 0.5 * s); st.rot(ringer, 'LipRoot', 0, 0, 0.55 * s); st.rot(ringer, 'LipMid', 0, 0, 0.7 * s); st.rot(ringer, 'LipEdge', 0, 0, 0.9 * s);
        st.rot(ringer, 'SkirtRoot', 0, 0, 0.09 * s); st.rot(ringer, 'Skirt1', 0, 0, 0.13 * s); st.rot(ringer, 'SkirtHem', 0, 0, 0.18 * s);
      } });
      [0, 95, 190].forEach((d) => st.at(d, () => {
        const p = st.worldOf(ringer, 'BellRoot', new THREE.Vector3()); p.y = st.tableY;
        const r = st.ring(p, 0.26, 0.045, { opacity: 0.85 });
        st.tween({ ms: 400, ease: 'out', update(t, e) { r.scale.setScalar(1 + 6 * e); r.material.opacity = 0.85 * (1 - e * e); } });
      }));
      if (mates[1]) {
        const a = st.worldOf(ringer, 'BellRoot', new THREE.Vector3());
        const b = st.top(mates[1], new THREE.Vector3());
        const ln = st.beam(a, b, { opacity: 0 });
        st.tween({ ms: 340, delay: 110, ease: 'pulse', update(t, e) { ln.material.opacity = 0.95 * e; } });
        st.tween({ ms: 480, delay: 110, ease: 'pulse', update(t, e) { st.rim(mates[1], 1 + 1.6 * e); } });
      }
      st.at(420, () => st.tween({ ms: 200, ease: 'inout', update(t, e) {
        const k = 1 - e;
        st.rot(ringer, 'ArmURoot', -1.2 * k, 0, 0.3 * k); st.rot(ringer, 'ArmUElbow', -0.55 * k); st.rot(ringer, 'ArmUWrist', -0.28 * k); st.rot(ringer, 'ArmUHand', 0);
        st.rot(ringer, 'ArmDRoot', 0.3 * k, 0, -0.22 * k); st.rot(ringer, 'ArmDElbow', -0.2 * k); st.rot(ringer, 'AxeHead', 0.25 * k);
        st.rot(ringer, 'Chest', -0.12 * k, -0.24 * k, 0); st.rot(ringer, 'NeckB', -0.18 * k); st.rot(ringer, 'Spine', -0.08 * k);
        st.rot(ringer, 'BellRoot', -0.32 * k); st.rot(ringer, 'BellStem', -0.22 * k); st.rot(ringer, 'BellShoulder', -0.12 * k);
        st.rot(ringer, 'BellWaist', 0); st.rot(ringer, 'BellLip', 0); st.rot(ringer, 'LipRoot', 0); st.rot(ringer, 'LipMid', 0); st.rot(ringer, 'LipEdge', 0);
        st.rot(ringer, 'SkirtRoot', 0); st.rot(ringer, 'Skirt1', 0); st.rot(ringer, 'SkirtHem', 0);
      } }));
    });
  },
};

export const V054_SHORT = {
  // ★2026-09-12 使用者裁定 260→300ms 配套修訂：本體其餘逐字不動，只加 K 並把字面
  // ms／delay 乘 K（上方「不得改任何一行」是針對 V054 完整版與這四支的『演出內容』，
  // 不含這個純比例縮放；四支都只做這一件事，見 docs/experiments/2026-09-12-t1-proportional-report.md）
  wardImmuneLost_v054short(st) {
    const K = st.ms / 260;
    const bell = st.byBody(st.actor, 'ward')[0] || st.actor[0];
    const foot = st.foot(bell, new THREE.Vector3());
    const w1 = st.ring(foot, 0.33, 0.04, { opacity: 0 });
    const w2 = st.ring(foot, 0.33, 0.04, { opacity: 0 });
    const mate = st.actor[1] || null;
    const link = mate ? st.beam(st.worldOf(bell, 'BellLip', new THREE.Vector3()), st.worldOf(mate, null, new THREE.Vector3()), { opacity: 0 }) : null;
    st.tween({ ms: 80 * K, ease: 'out', update(t, e) { // 舉鈴：上臂高舉、鈴身後傾
      st.rot(bell, 'ArmURoot', -0.9 * e); st.rot(bell, 'ArmUElbow', -0.35 * e);
      st.rot(bell, 'BellRoot', -0.3 * e); st.rot(bell, 'Chest', 0, 0.16 * e, 0); st.rim(bell, 1 + 0.7 * e);
    } });
    st.tween({ ms: 95 * K, delay: 78 * K, ease: 'linear', update(t, e) { // 搖鈴：鈴身三次左右甩
      const s = Math.sin(e * Math.PI * 3);
      st.rot(bell, 'BellRoot', -0.3 + 0.1 * e, 0, 0.34 * s); st.rot(bell, 'BellLip', 0, 0, 0.22 * s);
      st.rot(bell, 'Skirt1', 0, 0, 0.12 * s); st.rim(bell, 1.7 + 0.6 * Math.abs(s));
    } });
    st.grow(w1, { ms: 85 * K, delay: 96 * K, from: 0.3, to: 1.5 }); // 鈴波往外擴
    st.fade(w1, { ms: 85 * K, delay: 96 * K, from: 0.7, to: 0 });
    st.grow(w2, { ms: 85 * K, delay: 128 * K, from: 0.3, to: 1.8 });
    st.fade(w2, { ms: 85 * K, delay: 128 * K, from: 0.5, to: 0 });
    if (link) st.fade(link, { ms: 70 * K, delay: 130 * K, from: 0.8, to: 0 }); // 一條光從鈴串到同伴
    st.actor.forEach((f, i) => st.tween({ ms: 75 * K, delay: (130 + i * 10) * K, ease: 'pulse', update(t, e) { st.rim(f, 1 + 1.2 * e); } }));
    st.tween({ ms: 68 * K, delay: 160 * K, ease: 'inout', update(t, e) { // 放下
      const k = 1 - e;
      st.rot(bell, 'ArmURoot', -0.9 * k); st.rot(bell, 'ArmUElbow', -0.35 * k);
      st.rot(bell, 'BellRoot', -0.2 * k); st.rot(bell, 'Chest', 0, 0.16 * k, 0);
    } });
  },
};


/* ★v0.55 的徽記剪影版虎爺印（`?fxvocab=1` 才跑得到）★
   2026-09-12 方向重定之後，預設路徑的 biteGamble 換成了上面那支演出版（E 轉正），
   這一份原地保留給**治具與 L3 canary**（fx-contrast／blindread-sheet 的 --fxvocab=1）：
   它是「純色 billboard 貼在紙紮 3D 上」那條路的實體，兩輪盲讀 0/3 的對照組。
   ★本體逐字取自 0.55（原 MOVES.biteGamble），只改了函式名那一行★；`_v055` 後綴的作用同 `_v054`：
   讓兩份同名演出並存，登記點（js/trait-fx.js）剝掉後綴換回 trId，分派只做一次。
   0.54 的虎爺印（`biteGamble_v054`／`_v054short`）已於本卷移除——那一版的角色是「先退回上一版」，
   演出版轉正之後就不需要那條退路了；要回頭看：git show 6a839de:js/trait-fx/xianghuo.js。 */
export const V055 = {
  /* 虎爺印・虎爺反咬（tiger→tiger_c，精英×1）：被擊中時 15% 反咬 3 點。
     ★v0.55 招式可辨性卷 批 0 示範招（香火）★
     盲讀 r1 的病因（計畫 §6 第 17 列）：**兩位讀者、兩個版本全部讀成「山豬」**
       （B 短版 3 分：「背上燒著金火的長牙野獸」→ 直接猜山豬牙飾）
       ⇒ 失敗類型 F（`tiger_c` 骨骼表裡完全沒有「印」）＋造型撞 `boartusk`（模型層，Q8 先用語彙硬拉開）。
     改法（ART_BIBLE §10）：**一枚硃紅方印徽記**——這是唯一能把「虎爺**印**」和「山豬**牙**」分開的元素。
       ① windup：伏身張口的同時，方印在額前浮現（法寶本體現身，不是常駐造型的一部分）；
       ② travel：撲擊時方印**隨著咬合線飛到咬點**（st.trail，拖尾是印的殘影），
          取代原本兩道分不出是什麼的 `bolt` 咬痕；
       ③ react：方印**蓋在獵物身上**（st.mark）＋重退縮＝「被虎爺蓋印鎮住」的因果。
     ★tier 1／2／3 共用這一支★（時間軸由 st.beat 換算）。 */
  biteGamble_v055(st) {
    const B = st.beat, C = st.colors, LAST = st.ms * 0.88;
    const cat = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const prey = st.biggest(st.target) || st.target[0] || null;
    const fwd = st.toward(cat, new THREE.Vector3());
    const W = B.windup[1], T0 = B.travel[0], TL = B.travel[1] - B.travel[0], R0 = B.react[0], RL = LAST - B.react[0];
    const brow = st.worldOf(cat, 'Brow', new THREE.Vector3());
    if (!brow.lengthSq()) st.worldOf(cat, null, brow);
    const start = brow.clone().addScaledVector(st.dir, 0.16); start.y += 0.22;
    const hit = prey ? st.worldOf(prey, null, new THREE.Vector3()) : start.clone().addScaledVector(st.dir, 1.4);
    const seal = st.icon(st.kind, start, { color: C.hot, inkColor: C.ink, opacity: 0 });
    const stamp = prey ? st.mark(prey, st.kind, { opacity: 0, color: C.hot }) : null;

    st.phase('windup');
    /* ① 伏身張口（windup）：後臀壓低、脊背弓起、下顎三節大張；方印在額前浮現 */
    st.tween({ ms: W, ease: 'out',
      update(t, e) {
        st.rot(cat, 'Rump', 0.30 * e); st.rot(cat, 'Hips', 0.24 * e); st.rot(cat, 'Spine', -0.16 * e); st.rot(cat, 'Chest', -0.20 * e);
        st.rot(cat, 'NeckB', -0.30 * e); st.rot(cat, 'Neck2', -0.22 * e); st.rot(cat, 'HeadRoot', 0.12 * e);
        st.rot(cat, 'JawRoot', 0.55 * e); st.rot(cat, 'Jaw1', 0.35 * e); st.rot(cat, 'JawTip', 0.25 * e);
        st.rot(cat, 'TailRoot', -0.40 * e); st.rot(cat, 'Tail1', -0.30 * e); st.rot(cat, 'Tail2', -0.22 * e); st.rot(cat, 'TailTip', -0.18 * e);
        st.rot(cat, 'LBack1Kn', 0.40 * e); st.rot(cat, 'RBack1Kn', 0.40 * e);
        st.move(cat, -fwd.x * 0.09 * e, -0.03 * e, -fwd.z * 0.09 * e);
        st.rim(cat, 1 + 1.0 * e);
        st.alpha(seal, Math.min(1, e * 2));
        seal.scale.setScalar(st.iconSize * (0.35 + 0.75 * e)); // 過衝一點再收，印才有「蓋下來」的重量
        seal.userData.fxRoll = 0.55 * (1 - e);
      },
      done() { st.phase('travel'); } });
    /* ② 撲＋方印飛到咬點（travel）：印是飛行物本體，拖尾只是它的殘影 */
    st.tween({ ms: TL * 0.62, delay: T0, ease: 'outQuint', update(t, e) {
      st.move(cat, fwd.x * (-0.09 + 0.51 * e), -0.03 + 0.05 * e, fwd.z * (-0.09 + 0.51 * e));
      st.rot(cat, 'Rump', 0.30 - 0.34 * e); st.rot(cat, 'Hips', 0.24 - 0.28 * e); st.rot(cat, 'Spine', -0.16 + 0.24 * e); st.rot(cat, 'Chest', -0.20 + 0.30 * e);
      st.rot(cat, 'NeckB', -0.30 + 0.44 * e); st.rot(cat, 'Neck2', -0.22 + 0.34 * e);
      st.rot(cat, 'LFrontRoot1Rt', -0.90 * e); st.rot(cat, 'LFrontElbow1El', 0.50 * e); st.rot(cat, 'LFrontToe1To', -0.30 * e);
      st.rot(cat, 'RFrontRoot1Rt', -0.75 * e); st.rot(cat, 'RFrontElbow1El', 0.42 * e); st.rot(cat, 'RFrontToe1To', -0.30 * e);
      st.rot(cat, 'LBack1Kn', 0.40 - 0.55 * e); st.rot(cat, 'RBack1Kn', 0.40 - 0.55 * e);
      st.rot(cat, 'JawRoot', 0.55 + 0.28 * e); st.rot(cat, 'Jaw1', 0.35 + 0.20 * e); st.rot(cat, 'JawTip', 0.25 + 0.14 * e);
    } });
    st.trail(seal, start, hit, { ms: TL, delay: T0, ease: 'in', arc: 0.10, color: C.line, opacity: 0.9, segs: 10,
      done() { st.phase('react'); st.burst(hit, { power: 1.0, n: 60, color: C.hot }); st.punch(0.45); } });
    /* 咬合（travel 末）：下顎猛闔 */
    st.tween({ ms: TL * 0.34, delay: T0 + TL * 0.62, ease: 'outQuint', update(t, e) {
      st.rot(cat, 'JawRoot', 0.83 - 0.95 * e); st.rot(cat, 'Jaw1', 0.55 - 0.62 * e); st.rot(cat, 'JawTip', 0.39 - 0.44 * e);
      st.rot(cat, 'Muzzle', -0.12 * e); st.rot(cat, 'Nose', -0.10 * e); st.rot(cat, 'Brow', -0.18 * e);
      st.rot(cat, 'HeadRoot', 0.12 + 0.20 * e);
    } });
    /* ③ 蓋印（react）：方印烙在獵物身上、獵物重退縮 */
    st.fade(seal, { ms: RL * 0.35, delay: R0, from: 1, to: 0 });
    if (stamp) {
      st.fade(stamp, { ms: RL * 0.22, delay: R0, from: 0, to: 1 });
      st.tween({ ms: RL * 0.5, delay: R0, ease: 'back', update(t, e) { stamp.scale.setScalar(st.markSize * (1.9 - 0.9 * e)); } });
      st.fade(stamp, { ms: RL * 0.45, delay: R0 + RL * 0.55, from: 1, to: 0 });
    }
    // ★flinch 一定要帶 ms★：預設是 TFX.flinchMs×k，tier 1 下是 69ms，從 react 起算會把 horizon 推到 249＞235 ⇒ rate>1
    if (prey) st.flinch([prey], { delay: R0, ms: RL * 0.8, strength: 1.5, burst: false });
    /* 收勢：鬆口退回 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.move(cat, fwd.x * 0.42 * k, 0.02 * k, fwd.z * 0.42 * k);
      st.rot(cat, 'Rump', -0.04 * k); st.rot(cat, 'Hips', -0.04 * k); st.rot(cat, 'Spine', 0.08 * k); st.rot(cat, 'Chest', 0.10 * k);
      st.rot(cat, 'NeckB', 0.14 * k); st.rot(cat, 'Neck2', 0.12 * k); st.rot(cat, 'HeadRoot', 0.32 * k);
      st.rot(cat, 'JawRoot', -0.12 * k); st.rot(cat, 'Jaw1', -0.07 * k); st.rot(cat, 'JawTip', -0.05 * k);
      st.rot(cat, 'Muzzle', -0.12 * k); st.rot(cat, 'Nose', -0.10 * k); st.rot(cat, 'Brow', -0.18 * k);
      st.rot(cat, 'TailRoot', -0.40 * k); st.rot(cat, 'Tail1', -0.30 * k); st.rot(cat, 'Tail2', -0.22 * k); st.rot(cat, 'TailTip', -0.18 * k);
      st.rot(cat, 'LFrontRoot1Rt', -0.90 * k); st.rot(cat, 'LFrontElbow1El', 0.50 * k); st.rot(cat, 'LFrontToe1To', -0.30 * k);
      st.rot(cat, 'RFrontRoot1Rt', -0.75 * k); st.rot(cat, 'RFrontElbow1El', 0.42 * k); st.rot(cat, 'RFrontToe1To', -0.30 * k);
      st.rot(cat, 'LBack1Kn', -0.15 * k); st.rot(cat, 'RBack1Kn', -0.15 * k);
      st.rim(cat, 1 + 1.0 * k);
    } });
  },
};

/** tier 1 短版＝完整版同一支（0.55 當時就是這樣登記的）。 */
export const V055_SHORT = { biteGamble_v055: V055.biteGamble_v055 };
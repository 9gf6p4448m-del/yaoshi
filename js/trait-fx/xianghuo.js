// 妖市 — 卷 C3 招式編舞・香火系（9 套，2026-09-05）
// 舞台 API 與規則見 zuling.js 檔頭；骨骼名見 docs/experiments/2026-09-05-traitfx-bones.md。
import * as THREE from 'three';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export default {
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
     編舞：舉鈴（0–260ms：上臂高舉、鈴身後傾、胸與頸擰向鈴、下臂沉住斧）
          → 搖鈴（260–680ms：鈴身／鈴唇三次左右甩，裙擺跟著晃；每一次甩到底放一圈鈴波，共三圈往外擴）
          → 清明（一條光從鈴串到同伴，本方邊光整段提亮）→ 放下（680–880ms）。 */
  wardImmuneLost(st) {
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
     編舞：伏身張口（0–240ms：後臀壓低、脊背弓起、頸前伸、下顎三節大張、尾豎起，整尊往後蹲一點）
          → 撲（240ms：整尊沿「朝對面」躍出、前肢前伸、頭往前刺）
          → 咬（390ms：下顎猛闔、兩道咬痕光、火星、punch、對面那一隻重退縮）
          → 鬆口退回（430–880ms）。 */
  biteGamble(st) {
    const cat = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const prey = st.biggest(st.target) || st.target[0] || null;
    const fwd = st.toward(cat, new THREE.Vector3());
    st.tween({ ms: 240, ease: 'out', update(t, e) {
      st.rot(cat, 'Rump', 0.3 * e); st.rot(cat, 'Hips', 0.24 * e); st.rot(cat, 'Spine', -0.16 * e); st.rot(cat, 'Chest', -0.2 * e);
      st.rot(cat, 'NeckB', -0.3 * e); st.rot(cat, 'Neck2', -0.22 * e); st.rot(cat, 'HeadRoot', 0.12 * e);
      st.rot(cat, 'JawRoot', 0.55 * e); st.rot(cat, 'Jaw1', 0.35 * e); st.rot(cat, 'JawTip', 0.25 * e);
      st.rot(cat, 'TailRoot', -0.4 * e); st.rot(cat, 'Tail1', -0.3 * e); st.rot(cat, 'Tail2', -0.22 * e); st.rot(cat, 'TailTip', -0.18 * e);
      st.rot(cat, 'LBack1Kn', 0.4 * e); st.rot(cat, 'RBack1Kn', 0.4 * e);
      st.move(cat, -fwd.x * 0.09 * e, -0.03 * e, -fwd.z * 0.09 * e);
      st.rim(cat, 1 + 1.0 * e);
    } });
    st.at(240, () => {
      st.tween({ ms: 150, ease: 'outQuint', update(t, e) {
        st.move(cat, fwd.x * (-0.09 + 0.51 * e), -0.03 + 0.05 * e, fwd.z * (-0.09 + 0.51 * e));
        st.rot(cat, 'Rump', 0.3 - 0.34 * e); st.rot(cat, 'Hips', 0.24 - 0.28 * e); st.rot(cat, 'Spine', -0.16 + 0.24 * e); st.rot(cat, 'Chest', -0.2 + 0.3 * e);
        st.rot(cat, 'NeckB', -0.3 + 0.44 * e); st.rot(cat, 'Neck2', -0.22 + 0.34 * e);
        st.rot(cat, 'LFrontRoot1Rt', -0.9 * e); st.rot(cat, 'LFrontElbow1El', 0.5 * e); st.rot(cat, 'LFrontToe1To', -0.3 * e);
        st.rot(cat, 'RFrontRoot1Rt', -0.75 * e); st.rot(cat, 'RFrontElbow1El', 0.42 * e); st.rot(cat, 'RFrontToe1To', -0.3 * e);
        st.rot(cat, 'LBack1Kn', 0.4 - 0.55 * e); st.rot(cat, 'RBack1Kn', 0.4 - 0.55 * e);
        st.rot(cat, 'JawRoot', 0.55 + 0.28 * e); st.rot(cat, 'Jaw1', 0.35 + 0.2 * e); st.rot(cat, 'JawTip', 0.25 + 0.14 * e);
      } });
      st.at(150, () => {
        // 咬合
        st.tween({ ms: 90, ease: 'outQuint', update(t, e) {
          st.rot(cat, 'JawRoot', 0.83 - 0.95 * e); st.rot(cat, 'Jaw1', 0.55 - 0.62 * e); st.rot(cat, 'JawTip', 0.39 - 0.44 * e);
          st.rot(cat, 'Muzzle', -0.12 * e); st.rot(cat, 'Nose', -0.1 * e); st.rot(cat, 'Brow', -0.18 * e);
          st.rot(cat, 'HeadRoot', 0.12 + 0.2 * e);
        } });
        const bite = st.worldOf(cat, 'JawTip', new THREE.Vector3());
        const hit = prey ? st.worldOf(prey, null, new THREE.Vector3()) : bite.clone().addScaledVector(st.dir, 0.5);
        for (let i = 0; i < 2; i++) {
          const mark = st.bolt(bite, hit, { jag: 0.3, segs: 5, seed: 90 + i * 17, opacity: 1 });
          st.fade(mark, { ms: 200 + 60 * i, from: 1, to: 0 });
        }
        st.burst(hit, { power: 1.0, n: 60 });
        st.punch(0.45);
        if (prey) st.flinch([prey], { strength: 1.5, burst: false });
      });
      st.at(190, () => st.tween({ ms: 450, ease: 'inout', update(t, e) {
        const k = 1 - e;
        st.move(cat, fwd.x * 0.42 * k, 0.02 * k, fwd.z * 0.42 * k);
        st.rot(cat, 'Rump', -0.04 * k); st.rot(cat, 'Hips', -0.04 * k); st.rot(cat, 'Spine', 0.08 * k); st.rot(cat, 'Chest', 0.1 * k);
        st.rot(cat, 'NeckB', 0.14 * k); st.rot(cat, 'Neck2', 0.12 * k); st.rot(cat, 'HeadRoot', 0.32 * k);
        st.rot(cat, 'JawRoot', -0.12 * k); st.rot(cat, 'Jaw1', -0.07 * k); st.rot(cat, 'JawTip', -0.05 * k);
        st.rot(cat, 'Muzzle', -0.12 * k); st.rot(cat, 'Nose', -0.1 * k); st.rot(cat, 'Brow', -0.18 * k);
        st.rot(cat, 'TailRoot', -0.4 * k); st.rot(cat, 'Tail1', -0.3 * k); st.rot(cat, 'Tail2', -0.22 * k); st.rot(cat, 'TailTip', -0.18 * k);
        st.rot(cat, 'LFrontRoot1Rt', -0.9 * k); st.rot(cat, 'LFrontElbow1El', 0.5 * k); st.rot(cat, 'LFrontToe1To', -0.3 * k);
        st.rot(cat, 'RFrontRoot1Rt', -0.75 * k); st.rot(cat, 'RFrontElbow1El', 0.42 * k); st.rot(cat, 'RFrontToe1To', -0.3 * k);
        st.rot(cat, 'LBack1Kn', -0.15 * k); st.rot(cat, 'RBack1Kn', -0.15 * k);
        st.rim(cat, 1 + 1.0 * k);
      } }));
    });
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

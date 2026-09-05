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

  // ── 以下 8 套待填（卷 C3 派工）：wardAtkAll1(flag) wardAbsorb4(wangchuan) wardImmuneLost(bell) swarmRally(wuying)
  //    biteGamble(tiger→GLB tiger_c) wardHpFirst(ashcharm) wardRegen1(fushou) swarmLastStand(pojun) ──
};

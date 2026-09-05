// 妖市 — 卷 C3 招式編舞・陰氣系（9 套，2026-09-05）
// 舞台 API 與規則見 zuling.js 檔頭；骨骼名見 docs/experiments/2026-09-05-traitfx-bones.md。
import * as THREE from 'three';

const _a = new THREE.Vector3();

export default {
  /* 林投姐髮簪・偷命（hairpin，作祟×4）：三拍結束時敗方另 −1 壽命。
     編舞：髮瀑揚起（0–420ms，四尊錯開 60ms：HairA–E 向上外翻、面紗掀、仰頭、雙手前探，整尊上浮）
          → 偷命（240ms 起：對面每一隻胸口牽一條抖動的陰綢到最近的鬼，一顆命火順著綢子被吸到鬼的頭上，
             到手那一刻鬼的邊光暴亮；對面逐隻輕退縮）→ 收（560ms 起：髮落、鬼沉回、邊光回穩）。 */
  hauntSteal(st) {
    const ghosts = st.actor;
    const foes = st.target;
    const hair = ['HairA', 'HairB', 'HairC', 'HairD', 'HairE'];
    const pose = (g, k) => {
      hair.forEach((h, i) => st.rot(g, h, -0.9 * k * (0.6 + 0.1 * i), 0, (i % 2 ? 1 : -1) * 0.35 * k));
      st.rot(g, 'VeilTip', -0.5 * k); st.rot(g, 'HeadRoot', 0.18 * k);
      st.rot(g, 'RArmRoot1Rt', -0.7 * k, 0, -0.4 * k); st.rot(g, 'LArmRoot1Rt', -0.7 * k, 0, 0.4 * k);
      st.move(g, 0, 0.14 * k, 0);
    };
    ghosts.forEach((g, i) => {
      st.tween({ ms: 420, delay: i * 60, ease: 'out', update(t, e) { pose(g, e); st.rim(g, 1 + 0.4 * e); } });
    });
    const thief = (p) => { let best = ghosts[0], bd = Infinity; ghosts.forEach((g) => { const d = st.worldOf(g, 'HeadRoot', _a).distanceTo(p); if (d < bd) { bd = d; best = g; } }); return best; };
    st.at(240, () => {
      foes.forEach((f, i) => {
        const from = st.worldOf(f, null, new THREE.Vector3());
        const g = thief(from);
        const to = st.worldOf(g, 'HeadRoot', new THREE.Vector3());
        const silk = st.bolt(from, to, { jag: 0.05, segs: 12, opacity: 0, seed: 100 + i });
        st.tween({ ms: 380, delay: i * 40, ease: 'linear', update(t) { silk.material.opacity = 0.75 * Math.sin(Math.PI * t); } });
        const ember = st.orb(from, 0.045, { opacity: 0.95 });
        st.fly(ember, from, to, { ms: 360, delay: 40 + i * 40, ease: 'inout', arc: 0.18, done() {
          st.burst(to, { power: 0.4, n: 22 }); ember.material.opacity = 0; st.rim(g, 2.2);
        } });
      });
      st.flinch(foes, { stagger: 40, strength: 0.7, burst: false });
    });
    ghosts.forEach((g, i) => st.at(560 + i * 40, () => st.tween({ ms: 320, ease: 'inout', update(t, e) { const k = 1 - e; pose(g, k); st.rim(g, 1 + 1.2 * k); } })));
  },

  // ── 以下 8 套待填（卷 C3 派工）：hauntLost(redhat) hauntSee(chair) hauntDread1(raincoat) hauntSwap(buoy)
  //    eliteVsSwarm(nail) swarmPierce(yinyangcoin) hauntFearX2(guoyin) swarmFeed1(sigui) ──
};

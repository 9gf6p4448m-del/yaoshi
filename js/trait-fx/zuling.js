// 妖市 — 卷 C3 招式編舞・祖靈系（9 套，2026-09-05）
//
// 每套＝一個 (st) => void 的手寫函式，鍵名＝index.html TRAITS 的 id。st 是 js/trait-fx.js makeStage() 交出來的舞台：
//   st.actor／st.target   出招方／對面的 figure 陣列（都已就位的真 3D 妖；unit.body 分 swarm/elite/ward/haunt）
//   st.rot(fig, 骨名, x,y,z) 骨骼加旋轉（弧度，疊在 clip 之上）；st.shift 加位移；st.scaleBone 縮放
//   st.move(fig, x,y,z)／st.spin／st.scale   整尊 model 的位移（group 空間，+Z＝朝對手）／旋轉／縮放
//   st.rim(fig, 倍率)      邊光倍率；st.tween({ms,delay,ease,update(t,e),done})；st.at(ms, fn)
//   st.ring/disc/orb/dome/bolt/beam  自訂 mesh（自動清場）；st.fly/fade/grow  mesh 的補間
//   st.burst(pos,{power,n,color})  火星；st.flinch(figs,{delay,stagger,strength})  受招輕反應；st.punch(力道)
//   st.worldOf(fig, 骨名|null)／st.top／st.foot／st.toward(fig)  座標工具；st.byBody／st.biggest  挑人
// 規則：①演出在 st.ms（900ms）內講完，最後一段 tween 要把姿態帶回 0（清場只是保險）②骨骼名以
// docs/experiments/2026-09-05-traitfx-bones.md 為準，沒有的骨 st.rot 回 false、不會炸 ③不碰 group、不讀遊戲狀態
// ④reduced-motion 時位移類自動 no-op，光與粒子照演，不必自己判斷。
import * as THREE from 'three';

const _a = new THREE.Vector3();

export default {
  /* 射日神弓・射日（bow，精英×1）：一拍開場，對面最壯的一隻 −1。
     編舞：抬頭拉弓（0–320ms：Neck2/Neck3/HeadRoot 逐節後仰、尾巴翹起、邊光漸亮，弓弦 SunNock 上凝出一顆小太陽）
          → 放箭（320ms：頭猛甩回過衝再回正；太陽 190ms 直射到對面最壯那隻胸口，留一條瞬亮即滅的軌跡）
          → 命中（金火星、那一隻退縮、鏡頭小推）→ 收弓（頭頸回正，到 800ms）。 */
  eliteOpenShot(st) {
    const bow = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const prey = st.biggest(st.target) || st.target[0] || null;
    const nock = st.worldOf(bow, 'SunNock', new THREE.Vector3());
    const sun = st.orb(nock, 0.075, { opacity: 0.95 });
    sun.scale.setScalar(0.2);
    st.grow(sun, { ms: 300, from: 0.2, to: 1 });
    st.tween({ ms: 320, ease: 'out', update(t, e) {
      st.rot(bow, 'Neck2', -0.14 * e); st.rot(bow, 'Neck3', -0.2 * e); st.rot(bow, 'HeadRoot', -0.34 * e);
      st.rot(bow, 'TailRoot', 0.25 * e);
      st.rim(bow, 1 + 0.8 * e);
      st.worldOf(bow, 'SunNock', sun.position); // 太陽跟著弓弦一起抬
    } });
    st.at(320, () => {
      const to = prey ? st.worldOf(prey, null, new THREE.Vector3()) : nock.clone().addScaledVector(st.dir, 2.2);
      const from = sun.position.clone();
      const trail = st.beam(from, to, { opacity: 0 });
      st.fly(sun, from, to, { ms: 190, ease: 'out', arc: 0.12, done() {
        st.burst(to, { power: 0.95, n: 70 });
        st.punch(0.45);
        trail.material.opacity = 0.9; st.fade(trail, { ms: 220, from: 0.9, to: 0 });
        st.fade(sun, { ms: 120, to: 0 });
        if (prey) st.flinch([prey], { strength: 1.3, burst: false });
      } });
      // 放箭：頭頸從後仰猛甩到前傾，再回正
      st.tween({ ms: 480, ease: 'snap', update(t, e) {
        const k = 1 - t;
        st.rot(bow, 'Neck2', -0.14 * k + 0.1 * e); st.rot(bow, 'Neck3', -0.2 * k + 0.14 * e); st.rot(bow, 'HeadRoot', -0.34 * k + 0.22 * e);
        st.rot(bow, 'TailRoot', 0.25 * k);
        st.rim(bow, 1 + 0.8 * k);
      } });
    });
  },

  // ── 以下 8 套待填（卷 C3 派工）：wardHpFront2(shield) wardHpAll1(shanshen) wardFirst(eye) boltGamble(thunder)
  //    swarmHalfSplash(boat) swarmThorn(boartusk) eliteSelfCut(xianji) eliteArmor(balen) ──
};

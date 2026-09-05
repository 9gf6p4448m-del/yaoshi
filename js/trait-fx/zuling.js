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

  /* 百步蛇紋盾・鱗紋護體（shield，護法×2）：一拍前鋒全體 hp+2。
     編舞：蛇身鱗紋一節一節亮上去、三片盾牆向外張開、冠首上抬（0–290ms 醞釀）
          → 蛇頭前探吐信、半圓護罩從蛇身罩下（290ms）、腳下鱗環擴散
          → 罩淡去、鱗紋退光、盾牆與蛇身回位（到 890ms 收勢）。 */
  wardHpFront2(st) {
    const wards = st.byBody(st.actor, 'ward');
    const line = wards.length ? wards : st.actor;
    line.forEach((g, gi) => {
      const lag = gi * 70;
      const mid = st.worldOf(g, 'Body10', new THREE.Vector3());
      const foot = st.foot(g, new THREE.Vector3());
      // 鱗紋行進波：由尾往頭一節一節鼓起（back＝整體殘量，收勢時當衰減用）
      const scales = (e, back) => {
        for (let i = 0; i <= 20; i += 2) {
          const ph = Math.max(0, Math.min(1, e * 1.7 - i / 30)) * back;
          st.scaleBone(g, 'Body' + i, 1 + 0.16 * ph);
          st.rot(g, 'Body' + i, 0, 0, 0.06 * Math.sin(i * 0.8) * ph);
        }
      };
      st.tween({ ms: 240, delay: lag, ease: 'out', update(t, e) {
        scales(e, 1);
        st.rot(g, 'Wall1', -0.28 * e, -0.22 * e, 0);
        st.rot(g, 'Wall2', -0.34 * e, 0, 0);
        st.rot(g, 'Wall3', -0.28 * e, 0.22 * e, 0);
        st.rot(g, 'Crown', -0.2 * e, 0, 0);
        st.rot(g, 'Neck2', -0.16 * e, 0, 0);
        st.rim(g, 1 + 1.2 * e);
      } });
      st.at(lag + 240, () => {
        const dome = st.dome(mid, 0.62, { opacity: 0.5 });
        dome.scale.setScalar(0.25);
        st.grow(dome, { ms: 200, from: 0.25, to: 1, ease: 'out' });
        st.fade(dome, { ms: 300, delay: 300, from: 0.5, to: 0 });
        const ring = st.ring(foot, 0.34, 0.05, { opacity: 0.9 });
        ring.scale.setScalar(0.35);
        st.tween({ ms: 420, ease: 'outQuint', update(t, e) { ring.scale.setScalar(0.35 + 1.15 * e); ring.material.opacity = 0.9 * (1 - e); } });
        st.burst(mid, { power: 0.5, n: 26 });
      });
      // 吐信＋收勢：醞釀姿態退場（k），蛇頭前探一下就回（s）
      st.tween({ ms: 580, delay: lag + 240, ease: 'linear', update(t) {
        const k = 1 - st.EASE.out(t);
        const s = st.EASE.snap(Math.min(1, t / 0.55));
        scales(1, k);
        st.rot(g, 'Wall1', -0.28 * k, -0.22 * k, 0);
        st.rot(g, 'Wall2', -0.34 * k, 0, 0);
        st.rot(g, 'Wall3', -0.28 * k, 0.22 * k, 0);
        st.rot(g, 'Crown', -0.2 * k, 0, 0);
        st.rot(g, 'Neck2', -0.16 * k + 0.34 * s, 0, 0);
        st.rot(g, 'Neck3', 0.3 * s, 0, 0);
        st.rot(g, 'Head0', 0.26 * s, 0, 0);
        st.rot(g, 'Jaw', 0.5 * s, 0, 0);
        st.rot(g, 'Snout', 0.2 * s, 0, 0);
        st.rim(g, 1 + 1.2 * k + 0.9 * s);
      } });
    });
  },

  /* 山神庇佑・山起（shanshen，護法×2）：全體 hp+1（含護法、作祟）。
     編舞：四足屈膝沉身、背上山岩隆起（0–250ms 醞釀）→ 抬頭仰天、整尊上頂、山岩漲到最大（250ms）
          → 腳下地紋圓盤擴散、頭頂一顆山神之光升起 → 岩落、獸伏回原姿（到 820ms）。 */
  wardHpAll1(st) {
    const wards = st.byBody(st.actor, 'ward');
    const herd = wards.length ? wards : st.actor;
    herd.forEach((b, bi) => {
      const lag = bi * 70;
      const foot = st.foot(b, new THREE.Vector3());
      const crown = st.top(b, new THREE.Vector3());
      st.tween({ ms: 250, delay: lag, ease: 'out', update(t, e) {
        st.rot(b, 'LFront1Kn', 0.42 * e); st.rot(b, 'RFront1Kn', 0.42 * e);
        st.rot(b, 'LBack1Kn', 0.38 * e); st.rot(b, 'RBack1Kn', 0.38 * e);
        st.rot(b, 'Barrel', 0.14 * e); st.rot(b, 'Chest', 0.1 * e);
        st.rot(b, 'NeckRoot', 0.22 * e); st.rot(b, 'Neck1', 0); st.rot(b, 'Neck2', 0);
        st.rot(b, 'HeadRoot', 0.3 * e); st.rot(b, 'Muzzle', 0);
        st.scaleBone(b, 'CragBack', 1 + 0.3 * e);
        st.scaleBone(b, 'CragMid', 1 + 0.42 * e);
        st.scaleBone(b, 'CragFore', 1 + 0.34 * e);
        st.move(b, 0, -0.05 * e, 0);
        st.rim(b, 1 + 0.5 * e);
      } });
      st.at(lag + 250, () => {
        const disc = st.disc(foot, 0.3, { opacity: 0.55 });
        disc.scale.setScalar(0.3);
        st.tween({ ms: 480, ease: 'outQuint', update(t, e) { disc.scale.setScalar(0.3 + 1.6 * e); disc.material.opacity = 0.55 * (1 - 0.95 * e); } });
        const light = st.orb(crown, 0.09, { opacity: 0.95 });
        light.scale.setScalar(0.25);
        const rise = crown.clone(); rise.y += 0.55;
        st.fly(light, crown, rise, { ms: 430, ease: 'out' });
        st.grow(light, { ms: 220, from: 0.25, to: 1.35 });
        st.fade(light, { ms: 300, delay: 210, from: 0.95, to: 0 });
        st.burst(crown, { power: 0.6, n: 32 });
      });
      // 山起：r 是「醞釀久、急收」的山勢；k 是屈膝姿態的退場
      st.tween({ ms: 500, delay: lag + 250, ease: 'linear', update(t) {
        const k = 1 - st.EASE.out(t);
        const r = st.EASE.wind(Math.min(1, t / 0.8));
        st.rot(b, 'LFront1Kn', 0.42 * k - 0.2 * r); st.rot(b, 'RFront1Kn', 0.42 * k - 0.2 * r);
        st.rot(b, 'LBack1Kn', 0.38 * k - 0.16 * r); st.rot(b, 'RBack1Kn', 0.38 * k - 0.16 * r);
        st.rot(b, 'Barrel', 0.14 * k); st.rot(b, 'Chest', 0.1 * k - 0.12 * r);
        st.rot(b, 'NeckRoot', 0.22 * k - 0.34 * r); st.rot(b, 'Neck1', -0.28 * r); st.rot(b, 'Neck2', -0.24 * r);
        st.rot(b, 'HeadRoot', 0.3 * k - 0.4 * r); st.rot(b, 'Muzzle', -0.16 * r);
        st.scaleBone(b, 'CragBack', 1 + 0.3 * k + 0.36 * r);
        st.scaleBone(b, 'CragMid', 1 + 0.42 * k + 0.52 * r);
        st.scaleBone(b, 'CragFore', 1 + 0.34 * k + 0.42 * r);
        st.move(b, 0, -0.05 * k + 0.12 * r, 0);
        st.rim(b, 1 + 0.5 * k + 1.4 * r);
      } });
    });
  },

  /* 祖靈之眼・祖靈先手（eye，護法×2）：本方前鋒先結算。
     編舞：眼瞼逐層掀開、眉壓低、眼球微縮（0–260ms 凝視）→ 猛地睜圓、邊光暴亮，
          一道注視射向對面（320ms）→ 本方全體向前搶半步（去快回慢）→ 眼半闔、腳步收回（到 880ms）。 */
  wardFirst(st) {
    const wards = st.byBody(st.actor, 'ward');
    const seers = wards.length ? wards : st.actor;
    const foeAt = st.target.length
      ? st.worldOf(st.target[0], null, new THREE.Vector3())
      : st.worldOf(seers[0], null, new THREE.Vector3()).addScaledVector(st.dir, 2.2);
    seers.forEach((f, i) => {
      const lag = i * 60;
      const fwd = st.toward(f, new THREE.Vector3());
      st.tween({ ms: 260, delay: lag, ease: 'out', update(t, e) {
        st.rot(f, 'Sl0', -0.3 * e, 0, 0.05 * e);
        st.rot(f, 'Sl1', -0.26 * e, 0, -0.05 * e);
        st.rot(f, 'Sl2', 0.24 * e, 0, 0.05 * e);
        st.rot(f, 'Sl3', 0.2 * e, 0, -0.05 * e);
        st.rot(f, 'Br0', 0.16 * e); st.rot(f, 'Br1', 0.2 * e); st.rot(f, 'Br2', 0.16 * e);
        st.scale(f, 1 - 0.05 * e);
        st.rim(f, 1 + 0.6 * e);
      } });
      st.tween({ ms: 560, delay: lag + 260, ease: 'linear', update(t) {
        const k = 1 - st.EASE.out(Math.min(1, t / 0.55));
        const o = st.EASE.snap(Math.min(1, t / 0.7));
        const p = st.EASE.snap(Math.min(1, t / 0.95));
        st.rot(f, 'Sl0', -0.3 * k - 0.5 * o, 0, 0.05 * k);
        st.rot(f, 'Sl1', -0.26 * k - 0.44 * o, 0, -0.05 * k);
        st.rot(f, 'Sl2', 0.24 * k + 0.42 * o, 0, 0.05 * k);
        st.rot(f, 'Sl3', 0.2 * k + 0.38 * o, 0, -0.05 * k);
        st.rot(f, 'Br0', 0.16 * k - 0.3 * o); st.rot(f, 'Br1', 0.2 * k - 0.34 * o); st.rot(f, 'Br2', 0.16 * k - 0.3 * o);
        st.move(f, fwd.x * 0.24 * p, 0.03 * o, fwd.z * 0.24 * p);
        st.scale(f, 1 - 0.05 * k + 0.18 * o);
        st.rim(f, 1 + 0.6 * k + 1.8 * o);
      } });
    });
    st.at(320, () => {
      const from = st.worldOf(seers[0], 'Sl0', new THREE.Vector3());
      const gaze = st.beam(from, foeAt, { opacity: 0.95 });
      st.fade(gaze, { ms: 240, from: 0.95, to: 0 });
      seers.forEach((f, i) => {
        const ring = st.ring(st.foot(f, new THREE.Vector3()), 0.3, 0.045, { opacity: 0.85 });
        ring.scale.setScalar(0.3);
        st.tween({ ms: 440, delay: i * 60, ease: 'outQuint', update(t, e) { ring.scale.setScalar(0.3 + 1.5 * e); ring.material.opacity = 0.85 * (1 - e); } });
      });
      st.burst(from, { power: 0.55, n: 28 });
      st.flinch(st.target.slice(0, 2), { strength: 0.55, stagger: 60, burst: false });
    });
  },

  /* 雷女之火・天雷（thunder，精英×1）：一拍開始 15% 燒掉對面 1 隻小兵。
     編舞：雙翼向外撐開、仰頸、尾羽扇開、胸前火種脹亮（0–240ms 醞釀）
          → 火種升到那一隻小兵頭頂上方（240ms）→ 兩道天雷從高處劈下（340ms），火星、鏡頭小推、那一隻退縮
          → 猛然收翅下拍、頸尾回正（到 840ms）。 */
  boltGamble(st) {
    const bird = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const swarm = st.byBody(st.target, 'swarm');
    const prey = swarm.length ? swarm[Math.min(swarm.length - 1, Math.floor(st.rnd() * swarm.length))] : (st.target[0] || null);
    st.tween({ ms: 240, ease: 'out', update(t, e) {
      st.rot(bird, 'LWingA1Wi', 0, 0, 0.8 * e);
      st.rot(bird, 'RWingA1Wi', 0, 0, -0.8 * e);
      st.rot(bird, 'NeckRoot', -0.24 * e); st.rot(bird, 'Neck1', -0.26 * e); st.rot(bird, 'Neck2', -0.2 * e);
      st.rot(bird, 'HeadRoot', -0.34 * e); st.rot(bird, 'Brow', -0.14 * e);
      st.rot(bird, 'TailRoot', 0.2 * e); st.rot(bird, 'Tail1', 0.16 * e); st.rot(bird, 'Tail2', 0.14 * e);
      st.rot(bird, 'Tail3', 0.12 * e); st.rot(bird, 'TailTip', 0.1 * e);
      st.rot(bird, 'LLeg1Th', -0.18 * e); st.rot(bird, 'RLeg1Th', -0.18 * e);
      st.scaleBone(bird, 'EmberSeed', 1 + 1.4 * e);
      st.move(bird, 0, 0.07 * e, 0);
      st.rim(bird, 1 + 1.4 * e);
    } });
    st.at(240, () => {
      const hit = new THREE.Vector3();
      if (prey) st.worldOf(prey, null, hit);
      else { st.worldOf(bird, null, hit); hit.addScaledVector(st.dir, 1.8); }
      // 雷源要斜著落下：st.bolt 對「純垂直」的線段算不出側向抖動（側向量退化成 0），會變成一根直棒
      const high = hit.clone().addScaledVector(st.dir, -0.55); high.y += 1.35;
      const seedPos = st.worldOf(bird, 'EmberSeed', new THREE.Vector3());
      const seed = st.orb(seedPos, 0.1, { opacity: 0.9 });
      seed.scale.setScalar(0.3);
      st.grow(seed, { ms: 100, from: 0.3, to: 1.2 });
      st.fly(seed, seedPos, high, { ms: 100, ease: 'outQuint' });
      st.at(100, () => {
        const a = st.bolt(high, hit, { jag: 0.62, segs: 11, opacity: 1 });
        st.fade(a, { ms: 210, from: 1, to: 0 });
        const b = st.bolt(high, hit, { jag: 0.34, segs: 7, seed: 91, opacity: 0.8 });
        st.fade(b, { ms: 280, from: 0.8, to: 0 });
        st.fade(seed, { ms: 130, from: 0.9, to: 0 });
        st.burst(hit, { power: 1.1, n: 76 });
        st.punch(0.5);
        if (prey) st.flinch([prey], { strength: 1.5, burst: false });
      });
    });
    st.tween({ ms: 600, delay: 240, ease: 'linear', update(t) {
      // 翅膀撐開的姿態要撐到雷劈完（k 延後才開始退），收翅（f）再更晚一步
      const k = 1 - st.EASE.out(Math.min(1, Math.max(0, (t - 0.22) / 0.78)));
      const f = st.EASE.snap(Math.min(1, Math.max(0, (t - 0.25) / 0.75)));
      st.rot(bird, 'LWingA1Wi', 0, 0, 0.8 * k - 0.6 * f);
      st.rot(bird, 'RWingA1Wi', 0, 0, -0.8 * k + 0.6 * f);
      st.rot(bird, 'NeckRoot', -0.24 * k + 0.26 * f); st.rot(bird, 'Neck1', -0.26 * k + 0.22 * f); st.rot(bird, 'Neck2', -0.2 * k + 0.18 * f);
      st.rot(bird, 'HeadRoot', -0.34 * k + 0.3 * f); st.rot(bird, 'Brow', -0.14 * k + 0.16 * f);
      st.rot(bird, 'TailRoot', 0.2 * k - 0.14 * f); st.rot(bird, 'Tail1', 0.16 * k); st.rot(bird, 'Tail2', 0.14 * k);
      st.rot(bird, 'Tail3', 0.12 * k); st.rot(bird, 'TailTip', 0.1 * k);
      st.rot(bird, 'LLeg1Th', -0.18 * k + 0.2 * f); st.rot(bird, 'RLeg1Th', -0.18 * k + 0.2 * f);
      st.scaleBone(bird, 'EmberSeed', 1 + 1.4 * k);
      st.move(bird, 0, 0.07 * k - 0.06 * f, 0);
      st.rim(bird, 1 + 1.4 * k + 0.9 * f);
    } });
  },

  /* 拼板舟・飛魚躍（boat，小兵×3）：本隊受到的濺射減半。
     編舞：三舟錯開 60ms——船首壓浪下沉、側鰭收攏（0–180ms）→ 躍離水面（船身仰角、鰭全張、左右錯開）
          → 落水（腳下漣漪環擴散＋一圈水花圓盤）→ 舟身回平（到 890ms）。 */
  swarmHalfSplash(st) {
    const school = st.byBody(st.actor, 'swarm');
    const fleet = school.length ? school : st.actor;
    fleet.forEach((b, i) => {
      const lag = i * 60;
      const foot = st.foot(b, new THREE.Vector3());
      const sway = (i % 2 === 0) ? 1 : -1;
      st.tween({ ms: 180, delay: lag, ease: 'out', update(t, e) {
        st.rot(b, 'BowBase', 0.16 * e); st.rot(b, 'BowTip', 0.22 * e);
        st.rot(b, 'Stern', -0.12 * e); st.rot(b, 'SternTip', -0.16 * e);
        st.rot(b, 'LFin1Rt', 0, 0, 0.3 * e); st.rot(b, 'RFin1Rt', 0, 0, -0.3 * e);
        st.rot(b, 'LFin1Md', 0, 0, 0.34 * e); st.rot(b, 'RFin1Md', 0, 0, -0.34 * e);
        st.move(b, 0, -0.045 * e, 0);
        st.rim(b, 1 + 0.4 * e);
      } });
      st.tween({ ms: 360, delay: lag + 180, ease: 'linear', update(t) {
        const k = 1 - st.EASE.out(Math.min(1, t / 0.35));
        const j = st.EASE.pulse(t);
        const a = st.EASE.snap(Math.min(1, t / 0.85));
        st.rot(b, 'Mid', -0.1 * a);
        st.rot(b, 'BowBase', 0.16 * k - 0.3 * a); st.rot(b, 'BowTip', 0.22 * k - 0.44 * a);
        st.rot(b, 'Stern', -0.12 * k + 0.2 * a); st.rot(b, 'SternTip', -0.16 * k + 0.26 * a);
        st.rot(b, 'LFin1Rt', 0, 0, 0.3 * k - 0.6 * j); st.rot(b, 'RFin1Rt', 0, 0, -0.3 * k + 0.6 * j);
        st.rot(b, 'LFin1Md', 0, 0, 0.34 * k - 0.72 * j); st.rot(b, 'RFin1Md', 0, 0, -0.34 * k + 0.72 * j);
        st.rot(b, 'LFin1Tp', 0, 0, -0.5 * j); st.rot(b, 'RFin1Tp', 0, 0, 0.5 * j);
        st.move(b, sway * 0.07 * j, -0.045 * k + 0.52 * j, 0.13 * j);
        st.spin(b, -0.6 * a, sway * 0.18 * j, 0);
        st.rim(b, 1 + 0.4 * k + 1.5 * j);
      } });
      st.at(lag + 540, () => {
        const ring = st.ring(foot, 0.22, 0.04, { opacity: 0.85 });
        ring.scale.setScalar(0.4);
        st.tween({ ms: 230, ease: 'outQuint', update(t, e) { ring.scale.setScalar(0.4 + 1.5 * e); ring.material.opacity = 0.85 * (1 - e); } });
        const foam = st.disc(foot, 0.16, { opacity: 0.5 });
        st.tween({ ms: 210, ease: 'out', update(t, e) { foam.scale.setScalar(1 + 1.1 * e); foam.material.opacity = 0.5 * (1 - e); } });
        st.burst(foot, { power: 0.45, n: 22 });
      });
    });
  },

  /* 山豬牙飾・獠牙反擊（boartusk，小兵×1）：本隊每拍第一次被擊中時反傷 2。
     編舞：低頭挑牙——頭壓到胸前、前蹄刨地、耳朵後貼、牙盤慢轉發亮（0–260ms，地上刨出一圈土痕）
          → 頂撞（整尊前衝、頭往上挑）→ 牙尖射出一道獠光刺中對面最壯那隻（410ms）
          → 退回原位、耳朵彈回（到 860ms）。 */
  swarmThorn(st) {
    const pack = st.byBody(st.actor, 'swarm');
    const hog = pack.length ? pack[0] : st.actor[0];
    const foe = st.biggest(st.target) || st.target[0] || null;
    const fwd = st.toward(hog, new THREE.Vector3());
    const foot = st.foot(hog, new THREE.Vector3());
    st.tween({ ms: 260, ease: 'out', update(t, e) {
      st.rot(hog, 'NeckRoot', 0.3 * e); st.rot(hog, 'NeckMid', 0.26 * e); st.rot(hog, 'HeadRoot', 0.34 * e);
      st.rot(hog, 'Skull', 0.16 * e); st.rot(hog, 'Muzzle', 0.12 * e);
      st.rot(hog, 'LEar1Ea', -0.4 * e, 0.2 * e, 0); st.rot(hog, 'REar1Ea', -0.4 * e, -0.2 * e, 0);
      st.rot(hog, 'LFront1Kn', 0.5 * e); st.rot(hog, 'RFront1Kn', 0.2 * e);
      st.rot(hog, 'LBack1Kn', 0.3 * e); st.rot(hog, 'RBack1Kn', 0.3 * e);
      st.rot(hog, 'Withers', 0.12 * e); st.rot(hog, 'Barrel', 0.1 * e);
      st.rot(hog, 'DiscRoot', 0, 2.4 * e, 0);
      st.scaleBone(hog, 'DiscFace', 1 + 0.5 * e);
      st.move(hog, -fwd.x * 0.06 * e, 0, -fwd.z * 0.06 * e);
      st.rim(hog, 1 + 0.9 * e);
    } });
    st.at(260, () => {
      const dirt = st.disc(foot, 0.26, { opacity: 0.5 });
      dirt.scale.setScalar(0.3);
      st.tween({ ms: 360, ease: 'outQuint', update(t, e) { dirt.scale.setScalar(0.3 + 1.3 * e); dirt.material.opacity = 0.5 * (1 - e); } });
    });
    st.at(410, () => {
      const tip = st.worldOf(hog, 'Nose', new THREE.Vector3());
      const to = foe ? st.worldOf(foe, null, new THREE.Vector3()) : tip.clone().addScaledVector(st.dir, 1.6);
      const spike = st.bolt(tip, to, { jag: 0.07, segs: 5, opacity: 1 });
      st.fade(spike, { ms: 200, from: 1, to: 0 });
      st.burst(to, { power: 0.85, n: 46 });
      st.punch(0.35);
      if (foe) st.flinch([foe], { strength: 1.2, burst: false });
    });
    st.tween({ ms: 600, delay: 260, ease: 'linear', update(t) {
      const k = 1 - st.EASE.out(Math.min(1, t / 0.3));
      const c = st.EASE.snap(Math.min(1, t / 0.78));
      const up = st.EASE.pulse(Math.min(1, t / 0.62));
      st.rot(hog, 'NeckRoot', 0.3 * k - 0.3 * up); st.rot(hog, 'NeckMid', 0.26 * k - 0.26 * up);
      st.rot(hog, 'HeadRoot', 0.34 * k - 0.42 * up); st.rot(hog, 'Skull', 0.16 * k - 0.2 * up); st.rot(hog, 'Muzzle', 0.12 * k - 0.14 * up);
      st.rot(hog, 'LEar1Ea', -0.4 * k, 0.2 * k, 0.3 * up); st.rot(hog, 'REar1Ea', -0.4 * k, -0.2 * k, -0.3 * up);
      st.rot(hog, 'LFront1Kn', 0.5 * k - 0.4 * c); st.rot(hog, 'RFront1Kn', 0.2 * k - 0.4 * c);
      st.rot(hog, 'LBack1Kn', 0.3 * k + 0.2 * c); st.rot(hog, 'RBack1Kn', 0.3 * k + 0.2 * c);
      st.rot(hog, 'Withers', 0.12 * k - 0.16 * up); st.rot(hog, 'Barrel', 0.1 * k - 0.1 * up);
      st.rot(hog, 'DiscRoot', 0, 2.4 * k + 7.5 * c, 0);
      st.scaleBone(hog, 'DiscFace', 1 + 0.5 * k + 0.7 * c);
      st.move(hog, fwd.x * (0.34 * c - 0.06 * k), 0.04 * up, fwd.z * (0.34 * c - 0.06 * k));
      st.rim(hog, 1 + 0.9 * k + 1.5 * c);
    } });
  },

  /* 獻祭刀・割祭（xianji，精英×1）：一拍自傷 1，全場本隊 atk+2。
     編舞：俯首就刃——鹿頸逐節下彎湊到自己胸口、前腳併攏、尾夾低，邊光「先暗」（0–300ms 醞釀）
          → 割（300ms）：頭橫甩，胸口一顆血火星炸開、邊光從最暗暴亮到三倍
          → 祝福（390ms）：祭光自心口竄上頭頂，本隊每尊邊光脈衝 → 頭頸回正（到 880ms）。 */
  eliteSelfCut(st) {
    const cast = st.byBody(st.actor, 'elite');
    const deer = cast.length ? cast[0] : st.actor[0];
    // 傷口要落在體外一點：擺進 Chest 骨的位置會被自己的身體擋掉（材質有 depthTest），什麼都看不到
    const chest = st.worldOf(deer, 'Chest', new THREE.Vector3()).addScaledVector(st.dir, 0.24);
    chest.y += 0.06;
    st.tween({ ms: 300, ease: 'out', update(t, e) {
      st.rot(deer, 'NeckRoot', 0.3 * e); st.rot(deer, 'Neck1', 0.28 * e); st.rot(deer, 'Neck2', 0.26 * e); st.rot(deer, 'Neck3', 0.24 * e);
      st.rot(deer, 'HeadRoot', 0.36 * e); st.rot(deer, 'Skull', 0.2 * e); st.rot(deer, 'Muzzle', 0.14 * e);
      st.rot(deer, 'LFront1El', -0.22 * e); st.rot(deer, 'RFront1El', -0.22 * e);
      st.rot(deer, 'LFront1Wr', 0.2 * e); st.rot(deer, 'RFront1Wr', 0.2 * e);
      st.rot(deer, 'TailRoot', 0.3 * e); st.rot(deer, 'Tail1', 0.24 * e); st.rot(deer, 'TailTip', 0);
      st.rot(deer, 'Withers', 0.1 * e);
      st.move(deer, 0, -0.04 * e, 0);
      st.rim(deer, 1 - 0.7 * e);
    } });
    st.at(300, () => {
      const wound = st.orb(chest, 0.085, { opacity: 0.95 });
      wound.scale.setScalar(0.3);
      st.grow(wound, { ms: 130, from: 0.3, to: 1.5 });
      st.fade(wound, { ms: 260, delay: 120, from: 0.95, to: 0 });
      st.burst(chest, { power: 0.9, n: 52 });
      st.punch(0.3);
      st.at(90, () => {
        st.actor.forEach((f, i) => {
          const a = st.worldOf(f, null, new THREE.Vector3());
          const b = st.top(f, new THREE.Vector3()); b.y += 0.5;
          const ray = st.beam(a, b, { opacity: 0.9 });
          st.fade(ray, { ms: 320, delay: i * 40, from: 0.9, to: 0 });
          if (f !== deer) st.tween({ ms: 380, delay: i * 40, ease: 'pulse', update(t, e) { st.rim(f, 1 + 1.6 * e); } });
        });
        st.burst(chest, { power: 0.4, n: 20 });
      });
    });
    st.tween({ ms: 580, delay: 300, ease: 'linear', update(t) {
      const k = 1 - st.EASE.out(Math.min(1, t / 0.4));
      const s = st.EASE.snap(Math.min(1, t / 0.32));
      const bless = st.EASE.pulse(Math.min(1, Math.max(0, (t - 0.18) / 0.82)));
      st.rot(deer, 'NeckRoot', 0.3 * k, -0.34 * s, 0);
      st.rot(deer, 'Neck1', 0.28 * k, -0.3 * s, 0);
      st.rot(deer, 'Neck2', 0.26 * k, -0.26 * s, 0);
      st.rot(deer, 'Neck3', 0.24 * k, -0.22 * s, 0);
      st.rot(deer, 'HeadRoot', 0.36 * k - 0.2 * s, -0.3 * s, 0);
      st.rot(deer, 'Skull', 0.2 * k, -0.24 * s, 0);
      st.rot(deer, 'Muzzle', 0.14 * k, -0.16 * s, 0);
      st.rot(deer, 'LFront1El', -0.22 * k); st.rot(deer, 'RFront1El', -0.22 * k + 0.3 * s);
      st.rot(deer, 'LFront1Wr', 0.2 * k); st.rot(deer, 'RFront1Wr', 0.2 * k);
      st.rot(deer, 'TailRoot', 0.3 * k - 0.3 * bless); st.rot(deer, 'Tail1', 0.24 * k - 0.24 * bless); st.rot(deer, 'TailTip', -0.2 * bless);
      st.rot(deer, 'Withers', 0.1 * k - 0.1 * bless);
      st.move(deer, 0, -0.04 * k + 0.05 * bless, 0);
      st.rim(deer, 1 - 0.7 * k + 3 * s + 1.2 * bless);
    } });
  },

  /* 巴冷公主珠鍊・琉璃護心（balen，精英×1）：本隊每拍第一次受擊 −2（保底 1）。
     編舞：珠鍊一顆一顆亮上去（Trunk 由內往外、蛇身跟著鼓一節）＋ 昂首（0–280ms）
          → 心口一顆琉璃珠亮起、半圓護心罩罩下（280ms）→ 本隊每尊腳下浮一圈琉璃環
          → 罩與珠淡去、蛇口一開一合、身段回落（到 880ms）。 */
  eliteArmor(st) {
    const cast = st.byBody(st.actor, 'elite');
    const snake = cast.length ? cast[0] : st.actor[0];
    const heart = st.worldOf(snake, 'Trunk2', new THREE.Vector3());
    // 珠鍊行進波：Trunk 五顆逐顆點亮，蛇身每三節跟著鼓一下
    const beads = (e, back) => {
      for (let i = 0; i <= 4; i++) {
        const ph = Math.max(0, Math.min(1, e * 2.2 - i * 0.35)) * back;
        st.scaleBone(snake, 'Trunk' + i, 1 + 0.22 * ph);
        st.rot(snake, 'Trunk' + i, 0, 0.06 * ph * (i % 2 ? -1 : 1), 0);
      }
      for (let i = 0; i <= 18; i += 3) {
        const ph = Math.max(0, Math.min(1, e * 2 - i / 22)) * back;
        st.scaleBone(snake, 'Body' + i, 1 + 0.12 * ph);
      }
    };
    st.tween({ ms: 230, ease: 'out', update(t, e) {
      beads(e, 1);
      st.rot(snake, 'Neck0', -0.2 * e); st.rot(snake, 'Neck1', -0.22 * e);
      st.rot(snake, 'Neck2', -0.2 * e); st.rot(snake, 'Neck3', -0.18 * e);
      st.rot(snake, 'Head0', -0.24 * e);
      st.rim(snake, 1 + 1 * e);
    } });
    st.at(230, () => {
      const shell = st.dome(heart, 0.55, { opacity: 0.46 });
      shell.scale.setScalar(0.25);
      st.grow(shell, { ms: 190, from: 0.25, to: 1 });
      st.fade(shell, { ms: 320, delay: 320, from: 0.46, to: 0 });
      const bead = st.orb(heart, 0.1, { opacity: 0.95 });
      bead.scale.setScalar(0.3);
      st.grow(bead, { ms: 200, from: 0.3, to: 1.25 });
      st.fade(bead, { ms: 300, delay: 220, from: 0.95, to: 0 });
      st.burst(heart, { power: 0.6, n: 34 });
      st.actor.forEach((f, i) => {
        const ring = st.ring(st.foot(f, new THREE.Vector3()), 0.28, 0.05, { opacity: 0.85 });
        ring.scale.setScalar(0.5);
        st.tween({ ms: 420, delay: 60 + i * 60, ease: 'outQuint', update(t, e) { ring.scale.setScalar(0.5 + 0.9 * e); ring.material.opacity = 0.85 * (1 - 0.9 * e); } });
      });
    });
    st.tween({ ms: 640, delay: 230, ease: 'linear', update(t) {
      const k = 1 - st.EASE.out(Math.min(1, t / 0.45));
      const g = st.EASE.snap(Math.min(1, t / 0.5));
      const jaw = st.EASE.pulse(Math.min(1, t / 0.55));
      beads(1, k);
      st.rot(snake, 'Neck0', -0.2 * k - 0.16 * g); st.rot(snake, 'Neck1', -0.22 * k - 0.14 * g);
      st.rot(snake, 'Neck2', -0.2 * k - 0.12 * g); st.rot(snake, 'Neck3', -0.18 * k - 0.1 * g);
      st.rot(snake, 'Head0', -0.24 * k - 0.18 * g);
      st.rot(snake, 'Jaw', 0.44 * jaw, 0, 0);
      st.rot(snake, 'Snout', 0.16 * jaw, 0, 0); st.rot(snake, 'SnoutTip', 0.12 * jaw, 0, 0);
      st.scale(snake, 1 + 0.06 * g);
      st.rim(snake, 1 + 1 * k + 1.5 * g);
    } });
  },
};

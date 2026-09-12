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

const MOVES = {
  /* 殘日・餘暉灼目（canri，精英×1；傳說三尊美術卷 2026-09-07）：第 1 拍開打前，對面前鋒 atk −2。
     編舞（祖靈＝靜如樹、動時瞬發）：0–260ms 只有日盤反向慢轉、邊光漸亮，獸身幾乎不動（蓄）
          → 260ms 日盤猛轉正，盤面射出一片罩住對面的白光（dome）＋一道掃過前鋒的光束
          → 前鋒被灼：退縮、往後退半步、金火星、鏡頭小推 → 680ms 起姿態回 0。 */
  eliteBlind(st) {
    const sun = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const front = st.byBody(st.target, 'ward')[0] || st.biggest(st.target) || st.target[0] || null;
    const disc = st.worldOf(sun, 'Disc', new THREE.Vector3());
    const core = st.orb(disc, 0.05, { opacity: 0 });
    st.tween({ ms: 260, ease: 'out', update(t, e) {
      st.rot(sun, 'Neck', -0.10 * e); st.rot(sun, 'Crown', -0.16 * e);
      st.rot(sun, 'Disc', 0, 0, -0.5 * e);
      st.rim(sun, 1 + 1.1 * e);
      st.worldOf(sun, 'Disc', core.position);
      core.material.opacity = 0.9 * e;
      core.scale.setScalar(0.4 + 1.2 * e);
    } });
    st.at(260, () => {
      const mid = front ? st.worldOf(front, null, new THREE.Vector3()) : disc.clone().addScaledVector(st.dir, 1.6);
      const flash = st.dome(mid, 0.9, { opacity: 0.55 });
      flash.scale.setScalar(0.2);
      st.grow(flash, { ms: 260, from: 0.2, to: 1.25 });
      st.fade(flash, { ms: 300, delay: 60, from: 0.55, to: 0 });
      const ray = st.beam(core.position.clone(), mid, { opacity: 0 });
      ray.material.opacity = 0.95; st.fade(ray, { ms: 240, from: 0.95, to: 0 });
      st.burst(mid, { power: 0.85, n: 55 });
      st.punch(0.4);
      st.fade(core, { ms: 200, to: 0 });
      if (front) {
        st.flinch([front], { strength: 1.25, burst: false });
        st.tween({ ms: 420, ease: 'out', update(t, e) { st.move(front, 0, 0, -0.20 * Math.sin(Math.PI * e)); } });
      }
      st.tween({ ms: 420, ease: 'snap', update(t, e) {
        const k = 1 - t;
        st.rot(sun, 'Neck', -0.10 * k + 0.06 * e); st.rot(sun, 'Crown', -0.16 * k + 0.10 * e);
        st.rot(sun, 'Disc', 0, 0, -0.5 * k + 0.9 * e);
        st.rim(sun, 1 + 1.1 * k);
      } });
    });
    st.at(680, () => st.tween({ ms: 220, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.rot(sun, 'Neck', 0.06 * k); st.rot(sun, 'Crown', 0.10 * k); st.rot(sun, 'Disc', 0, 0, 0.9 * k);
      st.rim(sun, 1);
    } }));
    /* ★Tier 3 餘韻（R1 覆審 M1）★：大招在 tier 3 有 1400ms，但這支編舞原本只排到 929ms——
       最後 471ms 是 CINEMA 仰視機位壓著、畫面上沒東西在動，而那是全遊戲最大的一刻。
       只在 tier 3 追加（tier 2 走同一支函式，行為必須逐項不變），而且是**新的節拍**不是把既有 tween 拉長：
       日盤餘光緩緩收、地上落下一圈殘暉、獸身呼吸似的沉一下。 */
    if (st.tier === 3) {
      const foot = st.foot(sun, new THREE.Vector3());
      const after = st.ring(foot, 0.5, 0.05, { opacity: 0 });
      st.grow(after, { ms: 320, delay: 910, from: 0.4, to: 1.9 });
      st.fade(after, { ms: 320, delay: 910, from: 0.5, to: 0 });
      st.tween({ ms: 380, delay: 910, ease: 'pulse', update(t, e) { st.rim(sun, 1 + 0.5 * e); st.move(sun, 0, -0.03 * e, 0); } });
      st.tween({ ms: 260, delay: 1020, ease: 'inout', update(t, e) { st.rot(sun, 'Disc', 0, 0, 0.35 * (1 - e)); } });
    }
  },

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
     ★v0.55 招式可辨性卷 批 0 示範招（祖靈）★
     盲讀 r1 的病因（計畫 §6 第 8 列）：`xianji` 的 GLB 骨骼表裡**完全沒有刀**（只有一隻鹿），
       短版三格「幾乎一模一樣、畫面上完全沒有特效」（讀者 B 給 1 分），完整版兩位分別猜成椅仔姑與山神庇佑
       ⇒ 失敗類型 F（法寶不在模型裡）＋D（出招瞬間沒有新增元素）。
     改法（ART_BIBLE §10）：
       ① windup：出招瞬間在頸邊生出一把**黑曜石刃徽記**（近黑 ink 實心＋靛藍 key 底板——ink 色就是為這一支設的）；
       ② travel：載體是**刀本身**，從後上方橫劃過頸口收到前下方，拖尾是刀的殘影（不是一條獨立的白線）；
       ③ react：本隊每尊蓋一枚 knife 印記並被托起半寸；治具裡只有 1 尊時量鹿自己的挺立。
     退役語彙：原本的胸口白 `orb`（15/27 撞）與升天的裸 `beam`（9/27 撞）本支全數拿掉。
     ★tier 1／2／3 共用這一支★：所有時點都從 `st.beat`（＝vocab.js 的 BEAT[tier]）換算，不另寫短版分岔。 */
  eliteSelfCut(st) {
    const B = st.beat, C = st.colors, LAST = st.ms * 0.88; // LAST：horizon 上限（rate ≤1.0 且 fill ≥0.85）
    const deer = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const mates = st.actor.filter((f) => f !== deer);
    const W = B.windup[1], T0 = B.travel[0], TL = B.travel[1] - B.travel[0], R0 = B.react[0], RL = LAST - B.react[0];
    // 傷口要落在體外一點：擺進 Chest 骨的位置會被自己的身體擋掉（材質有 depthTest），什麼都看不到
    const neck = st.worldOf(deer, 'Neck2', new THREE.Vector3()).addScaledVector(st.dir, 0.18);
    neck.y += 0.06;
    const A = neck.clone().addScaledVector(st.dir, -0.52); A.y += 0.34; // 刀的起點：後上方（再往後就離鹿太遠、讀起來像不相干的漂浮物）
    const Z = neck.clone().addScaledVector(st.dir, 0.82); Z.y -= 0.30; // 刀的終點：前下方（整段仍要跨過 travel 門檻的 40%）
    /* ★配色與計畫 §6 的建議相反，理由是實測★：計畫建議「近黑實心 ink ＋靛藍 key 描邊」，
       但 L3 實測（凍幀 A/B 差圖）在暗紅桌＋夜紫天上 **CIE76 ΔE 中位只有 25.13、低於門檻 28**
       ——近黑本體放在暗背景上本來就沒有對比可言。門檻一字不動，改的是實作：
       翻成本系標準配色（靛藍 key 本體＋ink 底板）之後 ΔE 中位 63.35。
       「黑曜石」的身分由剪影承擔（ART_BIBLE §7：低多邊形下剪影是僅剩的辨識手段）。 */
    const knife = st.icon(st.kind, A, { color: C.key, inkColor: C.ink, opacity: 0, roll: -1.1 });
    const bless = mates.length ? mates : [];
    const marks = bless.map((f) => st.mark(f, st.kind, { opacity: 0, color: C.key }));

    st.phase('windup');
    /* ① 俯首就刃（windup）：頸逐節下彎、邊光先暗；黑曜石刃在頸邊亮相＝出招瞬間的新增元素 */
    st.tween({ ms: W, ease: 'out',
      update(t, e) {
        st.rot(deer, 'NeckRoot', 0.30 * e); st.rot(deer, 'Neck1', 0.28 * e); st.rot(deer, 'Neck2', 0.26 * e); st.rot(deer, 'Neck3', 0.24 * e);
        st.rot(deer, 'HeadRoot', 0.36 * e); st.rot(deer, 'Skull', 0.20 * e); st.rot(deer, 'Muzzle', 0.14 * e);
        st.rot(deer, 'LFront1El', -0.22 * e); st.rot(deer, 'RFront1El', -0.22 * e);
        st.rot(deer, 'LFront1Wr', 0.20 * e); st.rot(deer, 'RFront1Wr', 0.20 * e);
        st.rot(deer, 'TailRoot', 0.30 * e); st.rot(deer, 'Tail1', 0.24 * e); st.rot(deer, 'Withers', 0.10 * e);
        st.move(deer, 0, -0.045 * e, 0);
        st.rim(deer, 1 - 0.7 * e);
        st.alpha(knife, Math.min(1, e * 1.8));
        knife.scale.setScalar(st.iconSize * (0.5 + 0.5 * e));
        knife.userData.fxRoll = -1.1 + 0.35 * e;
      },
      done() { st.phase('travel'); } });
    /* ② 割（travel）：刀劃過頸口。st.trail 的尾巴綁在刀身上，取代退役的裸 beam */
    st.trail(knife, A, Z, { ms: TL, delay: T0, ease: 'strike', spin: 2.6, color: C.key, opacity: 0.8, segs: 10,
      done() { st.phase('react'); st.burst(neck, { power: 0.95, n: 54, color: C.hot }); st.punch(0.42); } });
    /* 割的重音：頭橫甩、邊光從最暗暴亮到三倍（祖靈＝靜→瞬發） */
    st.tween({ ms: TL * 0.6, delay: T0 + TL * 0.32, ease: 'snap', update(t, e) {
      st.rot(deer, 'HeadRoot', 0.36, 0.52 * e, 0); st.rot(deer, 'Neck2', 0.26 * (1 - 0.7 * e)); st.rot(deer, 'Neck3', 0.24 * (1 - 0.7 * e));
      st.rim(deer, 0.3 + 3.0 * e);
    } });
    st.fade(knife, { ms: RL * 0.5, delay: R0, from: 1, to: 0 });
    /* ③ 祝福（react）：本隊每尊身上蓋一枚 knife 印記、被托起半寸——增益招的因果證據在受益方身上 */
    marks.forEach((m, i) => {
      st.fade(m, { ms: RL * 0.3, delay: R0 + i * RL * 0.06, from: 0, to: 1 });
      st.fade(m, { ms: RL * 0.45, delay: R0 + RL * 0.5, from: 1, to: 0 });
    });
    bless.forEach((f, i) => st.tween({ ms: RL * 0.92, delay: R0 + i * RL * 0.06, ease: 'pulse', update(t, e) {
      st.move(f, 0, 0.075 * e, 0); st.rim(f, 1 + 1.7 * e);
    } }));
    /* 收勢：鹿回正。只有他一尊時（治具的 xianji 就是 count=1），祝福也演在他自己身上 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'linear', update(t) {
      const k = 1 - st.EASE.out(Math.min(1, t / 0.45));
      const up = st.EASE.pulse(Math.min(1, t / 0.8));
      st.rot(deer, 'NeckRoot', 0.30 * k); st.rot(deer, 'Neck1', 0.28 * k); st.rot(deer, 'Neck2', 0.26 * k); st.rot(deer, 'Neck3', 0.24 * k);
      st.rot(deer, 'HeadRoot', 0.36 * k, 0.52 * k, 0); st.rot(deer, 'Skull', 0.20 * k); st.rot(deer, 'Muzzle', 0.14 * k);
      st.rot(deer, 'LFront1El', -0.22 * k); st.rot(deer, 'RFront1El', -0.22 * k);
      st.rot(deer, 'LFront1Wr', 0.20 * k); st.rot(deer, 'RFront1Wr', 0.20 * k);
      st.rot(deer, 'TailRoot', 0.30 * k - 0.26 * up); st.rot(deer, 'Tail1', 0.24 * k - 0.20 * up); st.rot(deer, 'Withers', 0.10 * k - 0.10 * up);
      st.move(deer, 0, -0.045 * k + (bless.length ? 0.02 : 0.085) * up, 0);
      st.rim(deer, 1 + 2.3 * k + 1.2 * up);
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
export default MOVES;

/* ══════════ Tier 1 短版（260ms，v0.54 三級視覺分級）══════════
   為什麼另寫一份而不是把完整版加速：既有的 run.rate 天花板是 2.2×，900→260 需要 3.46×，
   撞上去就是 stats.cut（收勢被硬切）。使用者裁 D4 丙——27 支各寫一條原生 260ms 的時間軸，
   每一條都要**保住該招的辨識元素**（辨識元素表在 docs/experiments/2026-09-10-plan-fx-tiers.md §5）。

   寫短版的三條紀律（推導過才寫下來的）：
   1. **horizon ≤ 230**。rate 公式是 (horizon−vt)/(ms−margin−t+dt)，margin＝max(endMargin×k, dt×1.5)；
      dt=16.7ms 時只要 horizon >251 就會 rate>1（＝靠加速硬擠，F2 的 rateOK 紅）。留到 230 是為了
      低幀率（dt 50ms 時門檻降到 235）也還在 1.0。
   2. **所有補間一律在函式頂層用 delay 排定**，不要在 tween 的 done 回呼裡再排新的補間——
      回呼是在 vt≈170 那一刻才跑，排下去 horizon 直接被推到 240+。done 裡只放 burst／punch／
      直接設 material 的動作（那些不進排程，不推 horizon）。
   3. **不要用 st.at**：它會替回呼預留 atReserve×k 的虛擬額度，260ms 下等於白丟 46ms 預算。 */
export const SHORT = {
  /* 射日｜辨識：弓弦上凝出的小太陽直射對面最壯那隻 */
  eliteOpenShot(st) {
    const K = st.ms / 260;
    const bow = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const prey = st.biggest(st.target) || st.target[0] || null;
    const nock = st.worldOf(bow, 'SunNock', new THREE.Vector3());
    const to = prey ? st.worldOf(prey, null, new THREE.Vector3()) : nock.clone().addScaledVector(st.dir, 2.2);
    const sun = st.orb(nock, 0.075, { opacity: 0.95 });
    sun.scale.setScalar(0.25);
    const trail = st.beam(nock.clone(), to, { opacity: 0 });
    st.grow(sun, { ms: 85 * K, from: 0.25, to: 1 });
    st.tween({ ms: 85 * K, ease: 'out', update(t, e) { // 抬頭拉弓
      st.rot(bow, 'Neck3', -0.2 * e); st.rot(bow, 'HeadRoot', -0.34 * e); st.rot(bow, 'TailRoot', 0.25 * e);
      st.rim(bow, 1 + 0.8 * e); st.worldOf(bow, 'SunNock', sun.position);
    } });
    st.fly(sun, nock.clone(), to, { ms: 80 * K, delay: 85 * K, ease: 'out', arc: 0.1,
      done() { st.burst(to, { power: 0.95, n: 45 }); st.punch(0.45); } });
    st.fade(trail, { ms: 55 * K, delay: 165 * K, from: 0.9, to: 0 });
    st.fade(sun, { ms: 45 * K, delay: 165 * K, from: 0.95, to: 0 });
    if (prey) st.flinch([prey], { delay: 155 * K, strength: 1.2, burst: false });
    st.tween({ ms: 70 * K, delay: 160 * K, ease: 'inout', update(t, e) { // 收弓
      const k = 1 - e;
      st.rot(bow, 'Neck3', -0.2 * k); st.rot(bow, 'HeadRoot', -0.34 * k); st.rot(bow, 'TailRoot', 0.25 * k);
      st.rim(bow, 1 + 0.8 * k);
    } });
  },

  /* 鱗紋護體｜辨識：蛇身鱗紋一節一節亮上去＋半圓護罩罩下 */
  wardHpFront2(st) {
    const K = st.ms / 260;
    const wards = st.byBody(st.actor, 'ward');
    const line = wards.length ? wards : st.actor;
    const g = line[0];
    const mid = st.worldOf(g, 'Body10', new THREE.Vector3());
    const foot = st.foot(g, new THREE.Vector3());
    const dome = st.dome(mid, 0.8, { opacity: 0 });
    const ring = st.ring(foot, 0.42, 0.07, { opacity: 0 });
    dome.scale.setScalar(0.35);
    st.tween({ ms: 90 * K, ease: 'out', update(t, e) { // 鱗紋行進波：由尾往頭一節一節鼓起
      line.forEach((f) => {
        for (let i = 0; i <= 20; i += 4) {
          const ph = Math.max(0, Math.min(1, e * 1.7 - i / 30));
          st.scaleBone(f, 'Body' + i, 1 + 0.16 * ph);
        }
        st.rot(f, 'Crown', -0.12 * e); st.rot(f, 'Jaw', 0.18 * e); st.rim(f, 1 + 0.9 * e);
      });
    } });
    st.grow(dome, { ms: 85 * K, delay: 85 * K, from: 0.35, to: 1.15 }); // 半圓護罩罩下
    st.fade(dome, { ms: 60 * K, delay: 85 * K, from: 0, to: 0.45 });
    st.fade(dome, { ms: 65 * K, delay: 160 * K, from: 0.45, to: 0 });
    st.grow(ring, { ms: 95 * K, delay: 85 * K, from: 0.3, to: 1.5 });
    st.fade(ring, { ms: 95 * K, delay: 85 * K, from: 0.7, to: 0 });
    st.tween({ ms: 70 * K, delay: 160 * K, ease: 'inout', update(t, e) { // 鱗紋退光、蛇身回位
      const k = 1 - e;
      line.forEach((f) => {
        for (let i = 0; i <= 20; i += 4) st.scaleBone(f, 'Body' + i, 1 + 0.16 * k);
        st.rot(f, 'Crown', -0.12 * k); st.rot(f, 'Jaw', 0.18 * k); st.rim(f, 1 + 0.9 * k);
      });
    } });
  },

  /* 山神庇佑｜辨識：背上山岩隆起＋腳下地紋圓盤擴散 */
  wardHpAll1(st) {
    const K = st.ms / 260;
    const g = st.byBody(st.actor, 'ward')[0] || st.actor[0];
    const foot = st.foot(g, new THREE.Vector3());
    const head = st.top(g, new THREE.Vector3());
    const disc = st.disc(foot, 0.5, { opacity: 0 });
    const light = st.orb(head, 0.09, { opacity: 0 });
    disc.scale.setScalar(0.25);
    st.tween({ ms: 90 * K, ease: 'out', update(t, e) { // 沉身、背上山岩隆起
      st.scaleBone(g, 'CragBack', 1 + 0.3 * e); st.scaleBone(g, 'CragMid', 1 + 0.34 * e); st.scaleBone(g, 'CragFore', 1 + 0.24 * e);
      st.rot(g, 'Barrel', -0.06 * e); st.rot(g, 'NeckRoot', -0.14 * e); st.rot(g, 'HeadRoot', -0.2 * e);
      st.move(g, 0, -0.05 * e, 0); st.rim(g, 1 + 0.7 * e);
    } });
    st.grow(disc, { ms: 100 * K, delay: 85 * K, from: 0.25, to: 1.6 }); // 腳下地紋圓盤擴散
    st.fade(disc, { ms: 100 * K, delay: 85 * K, from: 0.55, to: 0 });
    st.grow(light, { ms: 70 * K, delay: 85 * K, from: 0.3, to: 1.2 }); // 頭頂山神之光
    st.fade(light, { ms: 55 * K, delay: 85 * K, from: 0, to: 0.9 });
    st.fade(light, { ms: 65 * K, delay: 160 * K, from: 0.9, to: 0 });
    st.tween({ ms: 70 * K, delay: 160 * K, ease: 'back', update(t, e) { // 岩落、獸伏回原姿
      const k = 1 - e;
      st.scaleBone(g, 'CragBack', 1 + 0.3 * k); st.scaleBone(g, 'CragMid', 1 + 0.34 * k); st.scaleBone(g, 'CragFore', 1 + 0.24 * k);
      st.rot(g, 'Barrel', -0.06 * k); st.rot(g, 'NeckRoot', -0.14 * k); st.rot(g, 'HeadRoot', -0.2 * k);
      st.move(g, 0, -0.05 * k, 0); st.rim(g, 1 + 0.7 * k);
    } });
  },

  /* 祖靈先手｜辨識：★一顆睜圓的大眼★ ＋ 一道注視射過去 ＋ **被盯到的那一隻退縮**
     （盲讀 r2：短 1/2 vs 完整 3/3。低分共同特徵是「效果只在自己身上、沒有指向、受方沒反應」，
      所以眼球提前到 35ms 就現形、注視光束燒滿 95→215ms、對面被指到的那一隻真的退一步） */
  wardFirst(st) {
    const K = st.ms / 260;
    const eye = st.byBody(st.actor, 'ward')[0] || st.actor[0];
    const from = st.worldOf(eye, 'Sl0', new THREE.Vector3());
    const foe = st.target[0] || null;
    const aim = foe ? st.worldOf(foe, null, new THREE.Vector3()) : from.clone().addScaledVector(st.dir, 2);
    const gaze = st.beam(from, aim, { opacity: 0 });
    const gaze2 = st.beam(from.clone().add(new THREE.Vector3(0, 0.05, 0)), aim, { opacity: 0 });
    const ring = st.ring(st.foot(eye, new THREE.Vector3()), 0.36, 0.05, { opacity: 0 });
    const sclera = st.orb(from, 0.15, { opacity: 0 });
    const pupil = st.orb(from.clone().addScaledVector(st.dir, 0.07), 0.06, { opacity: 0, color: 0x120a1e });
    sclera.scale.setScalar(0.3); pupil.scale.setScalar(1.6);
    st.tween({ ms: 88 * K, ease: 'in', update(t, e) { // 凝視：眼球本體先長出來（35ms 就看得到）
      st.rot(eye, 'Sl0', 0.18 * e); st.rot(eye, 'Sl1', 0.14 * e); st.rot(eye, 'Br0', 0.2 * e); st.rot(eye, 'Br1', 0.16 * e);
      st.scale(eye, 1 - 0.03 * e); st.rim(eye, 1 + 0.4 * e);
      const k = Math.min(1, e * 2.5);
      sclera.material.opacity = 0.75 * k; sclera.scale.setScalar(0.3 + 0.45 * k);
      pupil.material.opacity = 0.9 * k;
    } });
    st.tween({ ms: 78 * K, delay: 88 * K, ease: 'out', update(t, e) { // 猛地睜圓：眼白暴脹、瞳孔縮成一點
      const k = 1 - e;
      st.rot(eye, 'Sl0', 0.18 * k - 0.26 * e); st.rot(eye, 'Sl1', 0.14 * k - 0.2 * e);
      st.rot(eye, 'Br0', 0.2 * k - 0.12 * e); st.rot(eye, 'Br1', 0.16 * k - 0.1 * e);
      st.scale(eye, 1 - 0.03 * k + 0.06 * e); st.rim(eye, 1 + 0.4 * k + 2.4 * e);
      sclera.scale.setScalar(0.75 + 0.85 * e); pupil.scale.setScalar(1.6 - 1.05 * e);
    }, done() { st.punch(0.35); } });
    // 注視：兩條光束疊起來變粗，燒滿 95→215ms（一版只有 70ms，取樣幀常常錯過）
    st.fade(gaze, { ms: 120 * K, delay: 95 * K, from: 1, to: 0 });
    st.fade(gaze2, { ms: 108 * K, delay: 107 * K, from: 0.85, to: 0 });
    st.grow(ring, { ms: 95 * K, delay: 100 * K, from: 0.3, to: 1.5 });
    st.fade(ring, { ms: 95 * K, delay: 100 * K, from: 0.65, to: 0 });
    if (foe) { // ★受方反應★：被盯到的那一隻退縮、邊光暴亮
      st.flinch([foe], { delay: 112 * K, strength: 1.15, burst: true });
      st.tween({ ms: 96 * K, delay: 112 * K, ease: 'pulse', update(t, e) { st.rim(foe, 1 + 2.6 * e); } });
    }
    st.actor.forEach((f, i) => st.tween({ ms: 84 * K, delay: (120 + i * 8) * K, ease: 'snap', update(t, e) { st.move(f, 0, 0, 0.09 * e); } }));
    st.fade(sclera, { ms: 58 * K, delay: 168 * K, from: 0.75, to: 0 });
    st.fade(pupil, { ms: 58 * K, delay: 168 * K, from: 0.9, to: 0 });
    st.tween({ ms: 60 * K, delay: 168 * K, ease: 'inout', update(t, e) { // 眼半闔
      const k = 1 - e;
      st.rot(eye, 'Sl0', -0.26 * k); st.rot(eye, 'Sl1', -0.2 * k); st.rot(eye, 'Br0', -0.12 * k); st.rot(eye, 'Br1', -0.1 * k);
      st.scale(eye, 1 + 0.06 * k); st.rim(eye, 1 + 2.4 * k);
    } });
  },

  /* 天雷｜辨識：★三道劈下來的閃電★（本體＝雷本身，越早出現越好）＋胸前火種升空
     （盲讀 r1：一版的雷只在 150ms 後閃 62ms，讀者的取樣幀常常錯過） */
  boltGamble(st) {
    const K = st.ms / 260;
    const bird = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const prey = st.byBody(st.target, 'swarm')[0] || st.target[0] || null;
    const seed = st.worldOf(bird, 'EmberSeed', new THREE.Vector3());
    const mark = prey ? st.worldOf(prey, null, new THREE.Vector3()) : seed.clone().addScaledVector(st.dir, 1.8);
    const sky = mark.clone(); sky.y += 1.5;
    const ember = st.orb(seed, 0.06, { opacity: 0.9 });
    ember.scale.setScalar(0.3);
    /* 三道雷頂層先建好（opacity 0），從 78ms 起依序現形——整個中段畫面上都有雷。 */
    const bolts = [
      st.bolt(sky, mark, { jag: 0.34, segs: 9, seed: 3, opacity: 0 }),
      st.bolt(sky.clone().add(new THREE.Vector3(0.16, 0, -0.12)), mark, { jag: 0.4, segs: 9, seed: 9, opacity: 0 }),
      st.bolt(sky.clone().add(new THREE.Vector3(-0.14, 0.1, 0.1)), mark, { jag: 0.3, segs: 9, seed: 17, opacity: 0 }),
    ];
    st.tween({ ms: 78 * K, ease: 'out', update(t, e) { // 撐翼仰頸、胸前火種脹亮
      st.rot(bird, 'LWingA1Wi', 0, 0, -0.5 * e); st.rot(bird, 'RWingA1Wi', 0, 0, 0.5 * e);
      st.rot(bird, 'NeckRoot', -0.16 * e); st.rot(bird, 'HeadRoot', -0.22 * e); st.rot(bird, 'TailRoot', 0.2 * e);
      st.rim(bird, 1 + 1.1 * e); ember.scale.setScalar(0.3 + 0.9 * e);
    } });
    st.fly(ember, seed.clone(), sky, { ms: 62 * K, delay: 74 * K, ease: 'out', arc: 0.2,
      done() { st.burst(mark, { power: 1, n: 50 }); st.punch(0.5); } });
    st.fade(ember, { ms: 30 * K, delay: 138 * K, from: 0.9, to: 0 });
    // 三道雷各燒 92ms、間隔 26ms：78→170、104→196、130→222，中段任何一幀都看得到雷
    bolts.forEach((b, i) => st.fade(b, { ms: 92 * K, delay: (78 + i * 26) * K, from: 1, to: 0 }));
    if (prey) st.flinch([prey], { delay: 140 * K, strength: 1.3, burst: false });
    st.tween({ ms: 72 * K, delay: 150 * K, ease: 'snap', update(t, e) { // 猛然收翅下拍
      const k = 1 - e;
      st.rot(bird, 'LWingA1Wi', 0, 0, -0.5 * k + 0.3 * e); st.rot(bird, 'RWingA1Wi', 0, 0, 0.5 * k - 0.3 * e);
      st.rot(bird, 'NeckRoot', -0.16 * k); st.rot(bird, 'HeadRoot', -0.22 * k); st.rot(bird, 'TailRoot', 0.2 * k);
      st.rim(bird, 1 + 1.1 * k);
    } });
  },

  /* 飛魚躍｜辨識：舟身躍離水面＋落水漣漪環 */
  swarmHalfSplash(st) {
    const K = st.ms / 260;
    const boats = st.byBody(st.actor, 'swarm').length ? st.byBody(st.actor, 'swarm') : st.actor;
    boats.forEach((b, i) => {
      const lag = i * 18 * K;
      st.tween({ ms: 80 * K, delay: lag, ease: 'in', update(t, e) { // 船首壓浪下沉、側鰭收攏
        st.rot(b, 'BowBase', 0.16 * e); st.rot(b, 'Stern', -0.1 * e);
        st.rot(b, 'LFin1Rt', 0, 0, 0.3 * e); st.rot(b, 'RFin1Rt', 0, 0, -0.3 * e);
        st.move(b, 0, -0.03 * e, 0);
      } });
      st.tween({ ms: 110 * K, delay: 80 * K + lag, ease: 'pulse', update(t, e) { // 躍離水面（鰭全張）
        st.move(b, 0, 0.24 * e, 0.06 * e);
        st.rot(b, 'BowBase', 0.16 * (1 - e) - 0.28 * e); st.rot(b, 'BowTip', -0.2 * e);
        st.rot(b, 'LFin1Rt', 0, 0, 0.3 - 0.7 * e); st.rot(b, 'RFin1Rt', 0, 0, -0.3 + 0.7 * e);
        st.rim(b, 1 + 0.8 * e);
      } });
    });
    const foot = st.foot(boats[0], new THREE.Vector3());
    const ripple = st.ring(foot, 0.34, 0.05, { opacity: 0 });
    const splash = st.disc(foot, 0.3, { opacity: 0 });
    st.grow(ripple, { ms: 90 * K, delay: 140 * K, from: 0.3, to: 1.8 }); // 落水漣漪環
    st.fade(ripple, { ms: 90 * K, delay: 140 * K, from: 0.75, to: 0 });
    st.grow(splash, { ms: 70 * K, delay: 140 * K, from: 0.2, to: 1.2 });
    st.fade(splash, { ms: 70 * K, delay: 140 * K, from: 0.5, to: 0 });
    st.tween({ ms: 60 * K, delay: 170 * K, ease: 'out', update(t, e) { // 舟身回平
      const k = 1 - e;
      boats.forEach((b) => { st.move(b, 0, 0.07 * k, 0); st.rot(b, 'BowTip', -0.2 * k); st.rim(b, 1 + 0.8 * k); });
    } });
  },

  /* 獠牙反擊｜辨識：低頭挑牙、牙尖射出一道獠光 */
  swarmThorn(st) {
    const K = st.ms / 260;
    const hog = st.actor[0];
    const prey = st.biggest(st.target) || st.target[0] || null;
    const nose = st.worldOf(hog, 'Nose', new THREE.Vector3());
    const to = prey ? st.worldOf(prey, null, new THREE.Vector3()) : nose.clone().addScaledVector(st.dir, 1.8);
    const dirt = st.disc(st.foot(hog, new THREE.Vector3()), 0.28, { opacity: 0 });
    st.tween({ ms: 85 * K, ease: 'out', update(t, e) { // 低頭挑牙、刨地、牙盤慢轉
      st.rot(hog, 'NeckRoot', 0.24 * e); st.rot(hog, 'HeadRoot', 0.2 * e); st.rot(hog, 'Skull', 0.14 * e);
      st.rot(hog, 'DiscFace', 0, 1.6 * e, 0); st.move(hog, 0, 0, -0.05 * e); st.rim(hog, 1 + 0.6 * e);
    } });
    st.fade(dirt, { ms: 85 * K, from: 0.45, to: 0 });
    st.tween({ ms: 85 * K, delay: 85 * K, ease: 'strike', update(t, e) { // 頂撞：前衝、頭往上挑
      st.move(hog, 0, 0.02 * e, 0.22 * e);
      st.rot(hog, 'NeckRoot', 0.24 - 0.5 * e); st.rot(hog, 'HeadRoot', 0.2 - 0.44 * e); st.rot(hog, 'Skull', 0.14 - 0.3 * e);
      st.rim(hog, 1.6 + 1.4 * e);
    } });
    // 牙尖射出一道獠光：同 boltGamble，mesh 頂層先建好、opacity 0，靠 delay 才現形
    const tusk = st.bolt(nose, to, { jag: 0.08, segs: 5, seed: 5, opacity: 0 });
    st.fade(tusk, { ms: 58 * K, delay: 150 * K, from: 1, to: 0 });
    st.tween({ ms: 40 * K, delay: 150 * K, ease: 'out', update(t, e) { st.rim(hog, 3 - 0.6 * e); },
      done() { st.burst(to, { power: 0.8, n: 36 }); st.punch(0.4); } });
    if (prey) st.flinch([prey], { delay: 152 * K, strength: 1.15, burst: false });
    st.tween({ ms: 65 * K, delay: 165 * K, ease: 'inout', update(t, e) { // 退回原位
      const k = 1 - e;
      st.move(hog, 0, 0.02 * k, 0.22 * k); st.rot(hog, 'NeckRoot', -0.26 * k); st.rot(hog, 'HeadRoot', -0.24 * k);
      st.rot(hog, 'Skull', -0.16 * k); st.rim(hog, 1 + 2 * k);
    } });
  },

  /* 割祭｜tier 1 短版 = 完整版**同一支函式**（v0.55）。
     時間軸全部從 st.beat＝BEAT[tier] 換算，260／900／1400 走同一份新元素（徽記、拖尾、印記），
     只有節拍不同。三套各寫一份就是下一個分岔源（計畫 §7「與 0.54 的接縫」）。 */
  eliteSelfCut: MOVES.eliteSelfCut,

  /* 琉璃護心｜辨識：★一串真的珠鍊★一顆一顆亮上去＋心口琉璃珠護心罩 */
  eliteArmor(st) {
    const K = st.ms / 260;
    const snake = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const heart = st.worldOf(snake, 'Body', new THREE.Vector3());
    const top = st.top(snake, new THREE.Vector3());
    const bead = st.orb(heart, 0.05, { opacity: 0 });
    const shell = st.dome(heart, 0.62, { opacity: 0 });
    const foot = st.foot(snake, new THREE.Vector3());
    const halo = st.ring(foot, 0.34, 0.045, { opacity: 0 });
    bead.scale.setScalar(0.3); shell.scale.setScalar(0.4);
    const chain = [];
    for (let i = 0; i < 9; i++) {
      const u = i / 8;
      const p = heart.clone().lerp(top, u);
      p.x += Math.sin(u * Math.PI) * 0.16; p.y += Math.sin(u * Math.PI) * 0.05;
      chain.push(st.orb(p, 0.028, { opacity: 0 }));
    }
    st.tween({ ms: 90 * K, ease: 'out', update(t, e) { // 珠鍊由內往外一顆一顆亮、昂首
      st.scaleBone(snake, 'Trunk', 1 + 0.12 * Math.min(1, e * 2));
      st.scaleBone(snake, 'Trunk2', 1 + 0.14 * Math.max(0, e * 2 - 1));
      st.rot(snake, 'Neck1', -0.16 * e); st.rot(snake, 'Jaw', 0.2 * e); st.rim(snake, 1 + 1 * e);
      chain.forEach((o, i) => { const k = Math.max(0, Math.min(1, e * 9 - i)); o.material.opacity = k; o.scale.setScalar(0.6 + 0.7 * k); });
    } });
    st.fade(bead, { ms: 55 * K, delay: 82 * K, from: 0, to: 1 }); // 心口琉璃珠亮起
    st.grow(bead, { ms: 80 * K, delay: 82 * K, from: 0.3, to: 1.3 });
    st.grow(shell, { ms: 85 * K, delay: 92 * K, from: 0.4, to: 1.15 }); // 護心罩罩下
    st.fade(shell, { ms: 55 * K, delay: 92 * K, from: 0, to: 0.42 });
    st.fade(shell, { ms: 65 * K, delay: 155 * K, from: 0.42, to: 0 });
    st.fade(bead, { ms: 60 * K, delay: 160 * K, from: 1, to: 0 });
    st.grow(halo, { ms: 95 * K, delay: 100 * K, from: 0.3, to: 1.5 });
    st.fade(halo, { ms: 95 * K, delay: 100 * K, from: 0.65, to: 0 });
    chain.forEach((o, i) => st.fade(o, { ms: 54 * K, delay: (150 + i * 2) * K, from: 1, to: 0 }));
    st.tween({ ms: 65 * K, delay: 160 * K, ease: 'inout', update(t, e) { // 蛇口一開一合、身段回落
      const k = 1 - e;
      st.scaleBone(snake, 'Trunk', 1 + 0.12 * k); st.scaleBone(snake, 'Trunk2', 1 + 0.14 * k);
      st.rot(snake, 'Neck1', -0.16 * k); st.rot(snake, 'Jaw', 0.2 * k * (1 - e)); st.rim(snake, 1 + 1 * k);
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
  eliteSelfCut_v054(st) {
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
};

export const V054_SHORT = {
  // ★2026-09-12 使用者裁定 260→300ms 配套修訂：本體其餘逐字不動，只加 K 並把字面
  // ms／delay 乘 K（上方「不得改任何一行」是針對 V054 完整版與這四支的『演出內容』，
  // 不含這個純比例縮放；四支都只做這一件事，見 docs/experiments/2026-09-12-t1-proportional-report.md）
  eliteSelfCut_v054short(st) {
    const K = st.ms / 260;
    const deer = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const chest = st.worldOf(deer, 'Chest', new THREE.Vector3());
    const blood = st.orb(chest, 0.055, { opacity: 0 });
    blood.scale.setScalar(0.3);
    st.tween({ ms: 90 * K, ease: 'in', update(t, e) { // 俯首就刃：頸逐節下彎、邊光先暗
      st.rot(deer, 'NeckRoot', 0.26 * e); st.rot(deer, 'Neck2', 0.22 * e); st.rot(deer, 'HeadRoot', 0.3 * e);
      st.rot(deer, 'TailRoot', -0.18 * e); st.rim(deer, 1 - 0.75 * e);
    } });
    st.tween({ ms: 70 * K, delay: 88 * K, ease: 'snap', update(t, e) { // 割：頭橫甩、邊光暴亮到三倍
      st.rot(deer, 'HeadRoot', 0.3, 0.5 * e, 0); st.rot(deer, 'Neck2', 0.22 * (1 - e));
      st.rim(deer, 0.25 + 3.1 * e);
    }, done() { st.punch(0.42); st.burst(chest, { power: 0.7, n: 34, color: 0xd83a2a }); } });
    st.fade(blood, { ms: 45 * K, delay: 88 * K, from: 0, to: 1 });
    st.grow(blood, { ms: 90 * K, delay: 88 * K, from: 0.3, to: 1.5 });
    st.fade(blood, { ms: 60 * K, delay: 150 * K, from: 1, to: 0 });
    const up = st.top(deer, new THREE.Vector3());
    const rite = st.beam(chest.clone(), up, { opacity: 0 });
    st.fade(rite, { ms: 65 * K, delay: 130 * K, from: 0.95, to: 0 }); // 祭光自心口竄上頭頂
    st.actor.forEach((f, i) => st.tween({ ms: 70 * K, delay: (140 + i * 10) * K, ease: 'pulse', update(t, e) { st.rim(f, 1 + 1.6 * e); } }));
    st.tween({ ms: 65 * K, delay: 160 * K, ease: 'inout', update(t, e) { // 頭頸回正
      const k = 1 - e;
      st.rot(deer, 'NeckRoot', 0.26 * k); st.rot(deer, 'HeadRoot', 0.3 * k, 0.5 * k, 0); st.rot(deer, 'TailRoot', -0.18 * k);
    } });
  },
};

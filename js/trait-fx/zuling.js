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

/** 三拍窗換算（與 `js/trait-fx/xianghuo.js` 的 `xhBeat` 同一條式子，各系一支小零件）。
 *  `frac`＝`LAST / st.ms`（預設 0.90＝語彙檔 §A5 建議值：往嚴的方向走，多出來的 2% 全給衝擊拍）。
 *  ★不得在這裡寫任何毫秒字面值★：時長的唯一來源是 index.html 的 `PW_FX.TRAIT_MS_BY_TIER`。 */
function zlBeat(st, frac) {
  const B = st.beat;
  const LAST = st.ms * (frac === undefined ? 0.90 : frac);
  return { B, W: B.windup[1], T0: B.travel[0], TL: B.travel[1] - B.travel[0], R0: B.react[0], LAST, RL: LAST - B.react[0] };
}

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
     ★2026-09-13 祖靈批階段 B 轉正★（語彙檔 §C1 第 1 列＋§B1＋§A9；
     `MOVE_SPEC.eliteOpenShot = { 丁, 張, 退, stance:'舉臂', anchor:'foe' }`）

     三件（計畫 §3）：
       **本體動作＝張**：`LBowGrip1Bo`／`RBowGrip1Bo` 外撐拉滿＋`Neck2`／`Neck3`／`HeadRoot` 後仰，
         一格到位（祖靈＝靜→瞬發）；衝擊拍弦鬆手、頭猛甩回。
       **道具**＝丁 日與雷（限縮家族，只有射日與雷女能用）：**金色日盤**（`sun`，`st.paperStamp` 實體，
         八芒盤面走 `hot` 土金、`ink` 近黑當墨線邊）＋**三支箭矢厚片**（`st.paperProps`，1 draw call）。
         ★這一支是全 27 支唯一保留「球」語意的招★（ART_BIBLE §10.5），但**不是 `st.orb` 加色光球**——
         舊版那顆白球正是「14/27 共用同一顆白光球」的來源，讀者 A 短版把雷女之火讀成射日。
         現在它是一枚**有厚度、有墨線邊的金色日盤**：留住「日」的身分，拿掉「白球」的共用語彙。
       **受招方反應＝退**：最壯那隻 `st.flinch` ＋胸口蓋日印。

     ★身分可辨（§A9）★ 施招姿態＝**舉臂**（up）≠ react「退」（back）；腳下**垂直光柱**。
     ★拖尾★：打擊類，`st.trail` 留著，方向「施招者 → 目標」（§A9-3）。
     ★道具落點 anchor＝`foe`★：日盤、箭、日印三件都落在被射中那一隻身上（裁定①）。 */
  eliteOpenShot(st) {
    const { W, T0, TL, R0, LAST, RL } = zlBeat(st, 0.90);
    const C = st.colors;
    const bow = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const prey = st.biggest(st.target) || st.target[0] || null;
    const nock = st.worldOf(bow, 'SunNock', new THREE.Vector3());
    if (!nock.lengthSq()) { st.worldOf(bow, null, nock); nock.y += 0.5; }
    /* ★看圖調的（自評第 1 輪）★：`SunNock` 在弓的最高處，日盤擺上去之後在 844×390 上
       **被畫面上緣切掉一角**（`sheet-t2` 前兩格）。壓低 0.30 之後整枚盤都在畫面裡，
       travel 的位移由到對面的水平距離承擔，不受影響。 */
    nock.y -= 0.55;
    nock.add(st.camOff(0.8));
    const to = prey ? st.worldOf(prey, 'Chest', new THREE.Vector3()) : nock.clone().addScaledVector(st.dir, 2.2);
    if (prey && !to.lengthSq()) st.worldOf(prey, null, to);
    to.add(st.camOff(1));

    // ── 丁 金色日盤：暗墨線邊＋土金盤面（§A4「暗面留細節、亮邊界定身分」的反向用法：這一件的身分就是「金」）──
    const disc = st.paperStamp(st.kind, nock, { anchor: 'foe', role: 'stamp', color: C.hot, inkColor: C.ink,
      opacity: 0, depth: 0.22, warp: 0.06, tiltDeg: 4, yawDeg: -10 });
    disc.scale.setScalar(st.iconSize * 0.45);

    // ── 三支箭矢厚片：跟著日盤一起飛（群體位移掛在 InstancedMesh 物件本身，§A5）──
    const ARR = 3;
    /* k 1.25／ratio 0.12 那一版在 sheet 上**一格都看不到**（單件 0.375×0.045 世界單位）——
       同紙血條第 1 輪的坑。放到 1.9／0.18 才讀得出「盤旁邊還有幾支細長的箭」。 */
    const arrows = st.paperProps(st.kind, ARR, { anchor: 'foe', color: C.line, opacity: 0, k: 2.4, ratio: 0.09, depth: 0.08, warp: 0.06 });
    arrows.obj.position.copy(nock);
    const _e = new THREE.Euler();
    const sticks = [];
    for (let i = 0; i < ARR; i++) sticks.push({ off: new THREE.Vector3((i - 1) * 0.30, -0.12 - (i - 1) * 0.12, 0), rz: 1.57 + (i - 1) * 0.24, s: 0 });
    const writeArrows = (k) => {
      for (let i = 0; i < ARR; i++) {
        const a = sticks[i], it = arrows.items[i];
        it.p.copy(a.off).multiplyScalar(1 + 1.6 * k);
        it.q.setFromEuler(_e.set(0, Math.PI * 0.5, a.rz));
        it.s = a.s;
      }
      arrows.write();
    };
    writeArrows(0);

    // ── 受招方胸口的日印（anchor foe；施招者身上什麼都不留）──
    const mark = prey ? st.paperStamp(st.kind, to, { anchor: 'foe', color: C.hot, inkColor: C.ink,
      opacity: 0, depth: 0.16, warp: 0.12, tiltDeg: 12, yawDeg: -20, follow: prey, at: 'chest', off: st.camOff(1) }) : null;

    /* ① 拉弓（windup）：弓臂外撐、頸逐節後仰，日盤在弦上亮相＝出招瞬間的新增元素。
       施招姿態（舉臂）與腳下光柱同時立起來——身分訊號一定要早於道具落點。 */
    st.groundMark(bow, { h: 1.32, w: 0.26, taper: 0.42, peak: 0.95 });
    st.phase('windup');
    st.tween({ ms: W, ease: 'out',
      update(t, e) {
        st.stance(bow, '舉臂', e);
        st.rot(bow, 'LBowGrip1Bo', 0, -0.30 * e, 0); st.rot(bow, 'RBowGrip1Bo', 0, 0.30 * e, 0);
        st.rot(bow, 'Neck2', -0.16 * e); st.rot(bow, 'Neck3', -0.22 * e); st.rot(bow, 'HeadRoot', -0.36 * e);
        st.rot(bow, 'TailRoot', 0.26 * e);
        st.rim(bow, 1 + 0.9 * e);
        // 盤跟著弓弦抬（**壓低量要跟 `nock` 同一份**，忘了就只有第 0 幀在對的高度——第 2 輪看圖抓到）
        st.worldOf(bow, 'SunNock', disc.position); disc.position.y -= 0.55; disc.position.add(st.camOff(0.8));
        arrows.obj.position.copy(disc.position);
        st.alpha(disc, Math.min(1, e * 1.9));
        disc.scale.setScalar(st.iconSize * (0.45 + 0.50 * e));
        for (let i = 0; i < ARR; i++) sticks[i].s = Math.max(0, Math.min(1, (e - 0.12 * i) * 2.4));
        writeArrows(0);
      },
      done() { st.phase('travel'); } });
    st.fade(arrows.obj, { ms: W * 0.5, delay: W * 0.35, from: 0, to: 0.95 });

    /* ② 放箭（travel）：日盤直射到對面最壯那隻胸口，箭跟著飛，拖尾在後（打擊類才有拖尾）。 */
    const from = nock.clone();
    st.trail(disc, from, to, { ms: TL, delay: T0, ease: 'strike', spin: 1.4, color: C.line, opacity: 0.8,
      done() {
        /* ★衝擊拍★：弦鬆手＝日盤抵達＝那一隻同幀後退（三件同一拍，§A2） */
        st.phase('react');
        st.burst(to, { power: 0.95, n: 62, color: C.hot });
        st.punch(0.46);
      } });
    /* ★`st.flinch` 一律在頂層用 `delay` 排，不寫在 `done()` 裡★（短版三條紀律的第 2 條）：
       回呼是在 vt≈R0 才跑，那時再排一條 `flinchMs × k` 的 tween 會把 horizon 推到 297／300
       ⇒ `rateOK` 紅（＝靠加速硬擠）。實測就是這樣紅過一次。 */
    if (prey) st.flinch([prey], { delay: R0, ms: RL * 0.8, strength: 1.35, burst: false });
    st.tween({ ms: TL, delay: T0, ease: 'strike', update(t, e) {
      arrows.obj.position.lerpVectors(from, to, e);
      writeArrows(e);
    } });
    // 鬆手：弓臂收、頭猛甩回過衝（祖靈＝靜→瞬發，衝擊拍一格從 0 到滿）
    st.tween({ ms: TL * 0.7, delay: T0 + TL * 0.25, ease: 'snap', update(t, e) {
      st.rot(bow, 'LBowGrip1Bo', 0, -0.30 * (1 - e), 0); st.rot(bow, 'RBowGrip1Bo', 0, 0.30 * (1 - e), 0);
      st.rot(bow, 'Neck3', -0.22 + 0.34 * e); st.rot(bow, 'HeadRoot', -0.36 + 0.52 * e);
      st.rim(bow, 1 + 0.9 - 0.6 * e);
    } });
    st.fade(disc, { ms: RL * 0.5, delay: R0 + RL * 0.3, from: 1, to: 0 });
    st.fade(arrows.obj, { ms: RL * 0.45, delay: R0 + RL * 0.2, from: 0.95, to: 0 });

    /* ③ 中箭（react）：胸口的日印蓋上再淡去；那一隻退（`st.flinch` 已在衝擊拍排下）。 */
    if (mark) {
      st.fade(mark, { ms: RL * 0.3, delay: R0, from: 0, to: 1 });
      st.fade(mark, { ms: RL * 0.45, delay: R0 + RL * 0.5, from: 1, to: 0 });
      st.tween({ ms: RL * 0.6, delay: R0, ease: 'back', update(t, e) { mark.scale.setScalar(st.markSize * (1.5 - 0.5 * e)); } });
    }

    // 收勢：弓與頸回正
    st.tween({ ms: LAST - R0, delay: R0, ease: 'linear', update(t) {
      const k = 1 - st.EASE.out(Math.min(1, t / 0.6));
      st.rot(bow, 'Neck2', -0.16 * k); st.rot(bow, 'Neck3', (-0.22 + 0.34) * k); st.rot(bow, 'HeadRoot', (-0.36 + 0.52) * k);
      st.rot(bow, 'TailRoot', 0.26 * k);
      st.rot(bow, 'LBowGrip1Bo', 0, 0, 0); st.rot(bow, 'RBowGrip1Bo', 0, 0, 0);
      st.rim(bow, 1 + 0.3 * k);
    } });
  },

  /* 百步蛇紋盾・鱗紋護體（shield，護法×2）：一拍前鋒全體 hp+2。
     ★2026-09-13 祖靈批階段 B 轉正★（語彙檔 §C1 第 2 列＋§B1＋§A9；
     `MOVE_SPEC.wardHpFront2 = { 乙, 扎, 升, stance:'下沉', anchor:'allies' }`）

     三件（計畫 §3）：
       **本體動作＝扎**：`Base`／`Root` 下沉紮地＋`Wall1`–`Wall3` 一格張開、
         `Neck2`–`Neck3`／`Head0`／`Jaw`／`Snout` 蛇頭前探吐信（祖靈＝靜→瞬發，一格到位）。
       **道具**＝乙 織紋與珠：**菱紋帶**（`rhomb` ×5，`st.paperProps` 的 `shape:'emblem'`＝1 draw call），
         從盾牆上方升起、**沿前鋒那一線鋪開**落到本方每一尊身上；＋各尊身上一枚**菱紋印**。
         ★不是 `dome`★：半圓護罩在祖靈系退役（讀者 A 把巴冷的罩讀成山神庇佑，ART_BIBLE §10.5）。
       **受益方反應＝升**：本方前鋒 `st.move` 上抬＋邊光。

     ★身分可辨（§A9）★ 施招姿態＝**下沉**（down）≠ react「升」（up）；腳下**垂直光柱**。
     ★拖線★：增益招一律 `trail: false`（§A9-3）。
     ★落點 anchor＝`allies`★：菱紋帶與菱紋印都落在本方身上（裁定①）。 */
  wardHpFront2(st) {
    const { W, T0, TL, R0, LAST, RL } = zlBeat(st, 0.90);
    const C = st.colors;
    const wards = st.byBody(st.actor, 'ward');
    const line = wards.length ? wards : st.actor;
    const lead = line[0];
    const mates = st.actor.filter((f) => f !== lead);
    const wall = st.worldOf(lead, 'Wall2', new THREE.Vector3());
    if (!wall.lengthSq()) st.worldOf(lead, null, wall);
    // 帶子的起點在盾牆**正上方**（不跨中線、不從敵方出發，§A9-3）
    /* ★起點的兩輪實測（自評）★
       ① `wall + y0.95`：travel 只走 1.0875、門檻 1.2481（＝0.40×travelDist）⇒ phase 紅。
       ② `wall + y1.25`：過得了門檻，但帶子整條**跑出畫面左上角**（`sheet-t2` 前兩格只剩一塊藍）。
       改成從**側面**掃進來：`perp` 是水平面上垂直於 `st.dir` 的方向（遠離中線那一側），
       帶子沿著盾牆那一線橫掃進場＝§C「菱紋帶沿盾牆展開」，位移也拿得到（實測 1.4+）。 */
    const perp = new THREE.Vector3(-st.dir.z, 0, st.dir.x);
    const A = wall.clone(); A.addScaledVector(perp, 1.70); A.y += 0.85; A.addScaledVector(st.dir, -0.25); A.add(st.camOff(1.0));
    // 落點＝本方那一線的中點（`allies` 解出的就是這一群，含施招者自己：desc「前鋒全體」）
    const Z = new THREE.Vector3();
    st.actor.forEach((f) => {
      const p = st.worldOf(f, 'Body10', new THREE.Vector3());
      if (!p.lengthSq()) st.worldOf(f, null, p);
      Z.add(p);
    });
    Z.multiplyScalar(1 / Math.max(1, st.actor.length));
    Z.y = wall.y + 0.10;
    Z.add(st.camOff(2.0)); // 帶子要落在牆的**鏡頭側**，不然整條被盾牆吃掉（自評第 2 輪）

    // ── 乙 菱紋帶：五枚菱形沿盾牆一線展開（1 draw call；群體位移掛 InstancedMesh 物件本身，§A5）──
    const RH = 5;
    const band = st.paperProps(st.kind, RH, { anchor: 'allies', shape: 'emblem', color: C.key, opacity: 0, k: 0.85, depth: 0.18, warp: 0.12 });
    band.obj.position.copy(A);
    const _e = new THREE.Euler();
    const knots = [];
    for (let i = 0; i < RH; i++) knots.push({ x: (i - (RH - 1) / 2), rz: 0.10 * (i - 2), s: 0 });
    const writeBand = (k) => {
      for (let i = 0; i < RH; i++) {
        const g = knots[i], it = band.items[i];
        // k=0 疊在一起（還沒展開）→ k=1 沿橫向鋪成一條帶
        it.p.set(g.x * (0.08 + 0.30 * k), -0.05 * Math.abs(g.x) * k, 0);
        it.q.setFromEuler(_e.set(0, Math.PI * 0.5, g.rz * k));
        it.s = g.s;
      }
      band.write();
    };
    writeBand(0);

    // ── 每一尊身上的菱紋印（anchor allies；施招者也吃到 hp+2，所以他身上也有一枚）──
    const marks = st.actor.map((f) => st.paperStamp(st.kind, st.worldOf(f, 'Body10', new THREE.Vector3()),
      { anchor: 'allies', color: C.key, inkColor: C.ink, opacity: 0, depth: 0.16, warp: 0.12, tiltDeg: 12, yawDeg: -22,
        follow: f, at: 'chest', off: st.camOff(1) }));

    /* ① 紮地張牆（windup）：整尊下沉生根、三片盾牆一格張開；菱紋帶在牆上方亮相。 */
    /* 柱要往鏡頭再推遠一點：盾牆又寬又矮，預設的 0.34 會讓柱整根躲在牆後面（自評第 2 輪）。 */
    st.groundMark(lead, { h: 1.24, w: 0.30, taper: 0.42, peak: 0.95, push: 0.95 });
    st.phase('windup');
    st.tween({ ms: W, ease: 'out',
      update(t, e) {
        st.stance(lead, '下沉', e);
        line.forEach((g) => {
          st.rot(g, 'Wall1', -0.30 * e, -0.26 * e, 0);
          st.rot(g, 'Wall2', -0.36 * e, 0, 0);
          st.rot(g, 'Wall3', -0.30 * e, 0.26 * e, 0);
          st.rot(g, 'Base', 0.10 * e); st.rot(g, 'Root', 0.12 * e);
          st.rot(g, 'Crown', -0.18 * e);
          st.rim(g, 1 + 1.1 * e);
        });
        st.alpha(band.obj, Math.min(1, e * 1.9));
        for (let i = 0; i < RH; i++) knots[i].s = Math.max(0, Math.min(1, (e - 0.08 * i) * 2.4));
        writeBand(0);
      },
      done() { st.phase('travel'); } });

    /* ② 鋪帶（travel）：菱紋帶從牆上方落到本方那一線上，五枚同時沿橫向展開。 */
    st.tween({ ms: TL, delay: T0, ease: 'outQuint', update(t, e) {
      band.obj.position.lerpVectors(A, Z, e);
      writeBand(e);
    },
    done() {
      /* ★衝擊拍★：牆張到位＝菱紋帶鋪滿＝前鋒同幀托起（三件同一拍，§A2） */
      st.phase('react');
      st.burst(Z, { power: 0.7, n: 40, color: C.hot });
      st.punch(0.34);
    } });
    // 吐信：蛇頭在衝擊拍前一點猛探出去（靜→瞬發）
    st.tween({ ms: TL * 0.55, delay: T0 + TL * 0.4, ease: 'snap', update(t, e) {
      line.forEach((g) => {
        st.rot(g, 'Neck2', 0.26 * e); st.rot(g, 'Neck3', 0.30 * e);
        st.rot(g, 'Head0', 0.24 * e); st.rot(g, 'Jaw', 0.46 * e); st.rot(g, 'Snout', 0.18 * e);
      });
    } });
    st.fade(band.obj, { ms: RL * 0.5, delay: R0 + RL * 0.35, from: 0.95, to: 0 });

    /* ③ 托起（react）：本方每一尊上抬＋邊光，身上的菱紋印蓋上再淡去。 */
    marks.forEach((m, i) => {
      st.fade(m, { ms: RL * 0.3, delay: R0 + i * RL * 0.06, from: 0, to: 1 });
      st.fade(m, { ms: RL * 0.45, delay: R0 + RL * 0.5, from: 1, to: 0 });
    });
    mates.forEach((f, i) => st.tween({ ms: RL * 0.92, delay: R0 + i * RL * 0.06, ease: 'pulse', update(t, e) {
      st.move(f, 0, 0.09 * e, 0); st.rim(f, 1 + 1.9 * e);
    } }));

    /* 收勢：牆與蛇頭回位，施招者跟著被托起（他也是前鋒之一）。 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'linear', update(t) {
      const k = 1 - st.EASE.out(Math.min(1, t / 0.5));
      const up = st.EASE.pulse(Math.min(1, t / 0.8));
      line.forEach((g) => {
        st.rot(g, 'Wall1', -0.30 * k, -0.26 * k, 0);
        st.rot(g, 'Wall2', -0.36 * k, 0, 0);
        st.rot(g, 'Wall3', -0.30 * k, 0.26 * k, 0);
        st.rot(g, 'Base', 0.10 * k); st.rot(g, 'Root', 0.12 * k);
        st.rot(g, 'Crown', -0.18 * k);
        st.rot(g, 'Neck2', 0.26 * k); st.rot(g, 'Neck3', 0.30 * k);
        st.rot(g, 'Head0', 0.24 * k); st.rot(g, 'Jaw', 0.46 * k); st.rot(g, 'Snout', 0.18 * k);
        st.rim(g, 1 + 1.1 * k + 1.2 * up);
      });
      st.move(lead, 0, 0.09 * up, 0);
    } });
  },
  /* 山神庇佑・山起（shanshen，護法×2）：一拍全體 hp+1（含護法、作祟）。
     ★2026-09-13 祖靈批階段 B 轉正★（語彙檔 §C1 第 9 列＋§B1＋§A9；
     `MOVE_SPEC.wardHpAll1 = { 甲, 沉, 升, stance:'下沉', anchor:'allies' }`）

     三件（計畫 §3）：
       **本體動作＝沉**：四肢 `*1Kn` 屈膝沉身＋`CragBack`／`CragMid`／`CragFore` 背岩隆起加倍。
       **道具**＝甲 骨牙石器：**岩塊**（`crag` ×6，`st.paperProps` 的 `shape:'emblem'`＝1 draw call）
         從側上方壓進場、**繞成一圈**合圍本方；＋每一尊頭上一枚**岩印**。
         ★頭頂白球退役★（現況讀者 A 兩版都把它讀成千里眼銅鈴，ART_BIBLE §10.5）；
         ★腳下光盤也退役★（`disc` 限縮成香火的「陣」）。
       **受益方反應＝升**：本方每一尊 `st.move` 上抬＋邊光。

     ★身分可辨（§A9）★ 施招姿態＝**下沉**（down）≠ react「升」（up）；腳下**垂直光柱**。
     ★拖線★：增益招 `trail: false`。★落點 anchor＝`allies`★（desc「全體 hp+1」）。 */
  wardHpAll1(st) {
    const { W, T0, TL, R0, LAST, RL } = zlBeat(st, 0.90);
    const C = st.colors;
    const wards = st.byBody(st.actor, 'ward');
    const herd = wards.length ? wards : st.actor;
    const lead = herd[0];
    const mates = st.actor.filter((f) => f !== lead);
    const crown = st.top(lead, new THREE.Vector3());
    const perp = new THREE.Vector3(-st.dir.z, 0, st.dir.x);
    // 起點在遠離中線那一側的高處（§A9-3：不跨中線、不從敵方出發）
    const A = crown.clone(); A.addScaledVector(perp, 1.85); A.y += 0.75; A.add(st.camOff(1.0));
    const Z = new THREE.Vector3();
    st.actor.forEach((f) => { const p = st.top(f, new THREE.Vector3()); Z.add(p); });
    Z.multiplyScalar(1 / Math.max(1, st.actor.length));
    Z.y -= 0.10;
    Z.add(st.camOff(1.8));

    // ── 甲 岩塊：六塊繞一圈（1 draw call；群體位移掛 InstancedMesh 物件本身，§A5）──
    const CR = 6;
    const rocks = st.paperProps(st.kind, CR, { anchor: 'allies', shape: 'emblem', color: C.key, opacity: 0, k: 0.42, depth: 0.22, warp: 0.10 });
    rocks.obj.position.copy(A);
    const _e = new THREE.Euler();
    const ring = [];
    for (let i = 0; i < CR; i++) ring.push({ th: (i / CR) * Math.PI * 2, rz: 0.5 * i, s: 0 });
    const writeRing = (k) => {
      for (let i = 0; i < CR; i++) {
        const g = ring[i], it = rocks.items[i];
        // k=0 疊在一起 → k=1 攤成一圈（半徑 0.62；圈是**橫躺**的，不是腳下光環）
        const r = 0.06 + 0.92 * k; // k 0.95 那一版六塊岩糊成一團藍（自評第 1 輪）：縮小 k、拉開半徑才讀得出「六塊」
        it.p.set(Math.cos(g.th) * r, Math.sin(g.th) * r * 0.62, 0);
        it.q.setFromEuler(_e.set(0, Math.PI * 0.5, g.rz + k * 0.8));
        it.s = g.s;
      }
      rocks.write();
    };
    writeRing(0);

    // ── 每一尊頭上的岩印（anchor allies；desc 是「全體」，施招者自己也吃到）──
    const marks = st.actor.map((f) => st.paperStamp(st.kind, st.top(f, new THREE.Vector3()),
      { anchor: 'allies', color: C.key, inkColor: C.ink, opacity: 0, depth: 0.18, warp: 0.12, tiltDeg: 12, yawDeg: -22,
        follow: f, at: 'top', off: st.camOff(1) }));

    /* ① 沉身（windup）：四肢屈膝、背岩隆起；岩塊在側上方亮相。 */
    st.groundMark(lead, { h: 1.26, w: 0.28, taper: 0.42, peak: 0.95, push: 0.85 });
    st.phase('windup');
    st.tween({ ms: W, ease: 'out',
      update(t, e) {
        st.stance(lead, '下沉', e);
        herd.forEach((b) => {
          st.rot(b, 'LFront1Kn', 0.44 * e); st.rot(b, 'RFront1Kn', 0.44 * e);
          st.rot(b, 'LBack1Kn', 0.40 * e); st.rot(b, 'RBack1Kn', 0.40 * e);
          st.rot(b, 'Barrel', 0.14 * e); st.rot(b, 'Chest', 0.10 * e);
          st.rot(b, 'NeckRoot', 0.22 * e); st.rot(b, 'HeadRoot', 0.30 * e);
          st.scaleBone(b, 'CragBack', 1 + 0.34 * e);
          st.scaleBone(b, 'CragMid', 1 + 0.46 * e);
          st.scaleBone(b, 'CragFore', 1 + 0.38 * e);
          st.rim(b, 1 + 0.6 * e);
        });
        st.alpha(rocks.obj, Math.min(1, e * 1.9));
        for (let i = 0; i < CR; i++) ring[i].s = Math.max(0, Math.min(1, (e - 0.07 * i) * 2.4));
        writeRing(0);
      },
      done() { st.phase('travel'); } });

    /* ② 合圍（travel）：六塊岩從側上方壓進來，同時攤成一圈罩住本方。 */
    st.tween({ ms: TL, delay: T0, ease: 'outQuint', update(t, e) {
      rocks.obj.position.lerpVectors(A, Z, e);
      writeRing(e);
    },
    done() {
      /* ★衝擊拍★：背岩隆到頂＝六塊岩合圍＝全體同幀亮邊上抬（三件同一拍，§A2） */
      st.phase('react');
      st.burst(Z, { power: 0.75, n: 44, color: C.hot });
      st.punch(0.36);
    } });
    // 山起：背岩在衝擊拍前一格再漲一次（祖靈＝靜→瞬發）
    st.tween({ ms: TL * 0.5, delay: T0 + TL * 0.45, ease: 'snap', update(t, e) {
      herd.forEach((b) => {
        st.scaleBone(b, 'CragBack', 1 + 0.34 + 0.30 * e);
        st.scaleBone(b, 'CragMid', 1 + 0.46 + 0.42 * e);
        st.scaleBone(b, 'CragFore', 1 + 0.38 + 0.34 * e);
        st.rim(b, 1 + 0.6 + 1.6 * e);
      });
    } });
    st.fade(rocks.obj, { ms: RL * 0.5, delay: R0 + RL * 0.35, from: 0.95, to: 0 });

    /* ③ 托起（react）：本方每一尊上抬＋邊光，頭上的岩印蓋上再淡去。 */
    marks.forEach((m, i) => {
      st.fade(m, { ms: RL * 0.3, delay: R0 + i * RL * 0.06, from: 0, to: 1 });
      st.fade(m, { ms: RL * 0.45, delay: R0 + RL * 0.5, from: 1, to: 0 });
    });
    mates.forEach((f, i) => st.tween({ ms: RL * 0.92, delay: R0 + i * RL * 0.06, ease: 'pulse', update(t, e) {
      st.move(f, 0, 0.09 * e, 0); st.rim(f, 1 + 1.9 * e);
    } }));

    /* 收勢：屈膝與背岩回位，施招者跟著被托起（他也在「全體」裡）。 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'linear', update(t) {
      const k = 1 - st.EASE.out(Math.min(1, t / 0.55));
      const up = st.EASE.pulse(Math.min(1, t / 0.8));
      herd.forEach((b) => {
        st.rot(b, 'LFront1Kn', 0.44 * k); st.rot(b, 'RFront1Kn', 0.44 * k);
        st.rot(b, 'LBack1Kn', 0.40 * k); st.rot(b, 'RBack1Kn', 0.40 * k);
        st.rot(b, 'Barrel', 0.14 * k); st.rot(b, 'Chest', 0.10 * k);
        st.rot(b, 'NeckRoot', 0.22 * k); st.rot(b, 'HeadRoot', 0.30 * k);
        st.scaleBone(b, 'CragBack', 1 + 0.64 * k);
        st.scaleBone(b, 'CragMid', 1 + 0.88 * k);
        st.scaleBone(b, 'CragFore', 1 + 0.72 * k);
        st.rim(b, 1 + 2.2 * k + 1.2 * up);
      });
      st.move(lead, 0, 0.09 * up, 0);
    } });
  },

  /* 祖靈之眼・祖靈先手（eye，護法×2）：一拍本方前鋒先結算。
     ★2026-09-13 祖靈批階段 B 轉正★（語彙檔 §C1 第 4 列＋§B1＋§A9；
     `MOVE_SPEC.wardFirst = { 甲, 張, 升, stance:'下沉', anchor:'allies' }`）

     三件（計畫 §3）：
       **本體動作＝張**：`Sl0`–`Sl3` 眼瞼一格全開＋`Br0`–`Br2` 眉壓（本模型只有 7 根骨，動作全在眼上）。
       **道具**＝甲 骨牙石器：**石雕眼**（`eye`，`st.paperStamp` 實體，靛藍面＋`ink` 墨線邊）
         從遠離中線那一側升起、落到本方那一線上；＋每一尊身上一枚**眼印**。
         ★原本的藍圓環退役★（撞陰陽眼銅錢，ART_BIBLE §10.5）。
       **受益方反應＝升**：本方 `st.move` 上抬＋邊光（§C 的「搶半步」併進同一拍的托起）。

     ★身分可辨（§A9）★ 施招姿態＝**下沉**（down）≠ react「升」（up）；腳下**垂直光柱**
     ——§C 明寫這一支是「唯一用垂直光柱演先手的招」。
     ★拖線★：增益招 `trail: false`。★落點 anchor＝`allies`★
     （`ABILITIES.wardFirst` 的 `first:true` 在 `index.html:3828` 是 `pwAny(X,"first")`＝**整隊**先結算）。 */
  wardFirst(st) {
    const { W, T0, TL, R0, LAST, RL } = zlBeat(st, 0.90);
    const C = st.colors;
    const wards = st.byBody(st.actor, 'ward');
    const seers = wards.length ? wards : st.actor;
    const lead = seers[0];
    const mates = st.actor.filter((f) => f !== lead);
    const eyeAt = st.worldOf(lead, 'Sl0', new THREE.Vector3());
    if (!eyeAt.lengthSq()) st.worldOf(lead, null, eyeAt);
    const perp = new THREE.Vector3(-st.dir.z, 0, st.dir.x);
    const A = eyeAt.clone(); A.addScaledVector(perp, 2.05); A.y += 0.75; A.add(st.camOff(1.0)); // perp 1.75 時 travel 1.2669/門檻 1.2481 太貼線，加餘裕
    const Z = new THREE.Vector3();
    st.actor.forEach((f) => { const p = st.top(f, new THREE.Vector3()); Z.add(p); });
    Z.multiplyScalar(1 / Math.max(1, st.actor.length));
    Z.y += 0.08;
    Z.add(st.camOff(1.9));

    // ── 甲 石雕眼：一件大道具（靛藍面＋ink 墨線邊）──
    const stone = st.paperStamp(st.kind, A, { anchor: 'allies', role: 'stamp', color: C.key, inkColor: C.ink,
      opacity: 0, depth: 0.24, warp: 0.10, tiltDeg: 6, yawDeg: -16 });
    stone.scale.setScalar(st.iconSize * 0.45);

    // ── 每一尊身上的眼印（anchor allies；整隊先結算，施招者自己也在內）──
    const marks = st.actor.map((f) => st.paperStamp(st.kind, st.worldOf(f, 'Chest', new THREE.Vector3()),
      { anchor: 'allies', color: C.key, inkColor: C.ink, opacity: 0, depth: 0.16, warp: 0.12, tiltDeg: 12, yawDeg: -22,
        follow: f, at: 'chest', off: st.camOff(1) }));

    /* ① 凝視（windup）：眼瞼逐層掀開、眉壓低；石雕眼在側上方亮相。 */
    st.groundMark(lead, { h: 1.26, w: 0.28, taper: 0.42, peak: 0.95, push: 0.80 });
    st.phase('windup');
    st.tween({ ms: W, ease: 'out',
      update(t, e) {
        st.stance(lead, '下沉', e);
        seers.forEach((g) => {
          st.rot(g, 'Sl0', -0.30 * e); st.rot(g, 'Sl1', -0.26 * e); st.rot(g, 'Sl2', -0.22 * e); st.rot(g, 'Sl3', -0.18 * e);
          st.rot(g, 'Br0', 0.20 * e); st.rot(g, 'Br1', 0.16 * e); st.rot(g, 'Br2', 0.12 * e);
          st.rim(g, 1 + 1.2 * e);
        });
        st.alpha(stone, Math.min(1, e * 1.9));
        stone.scale.setScalar(st.iconSize * (0.45 + 0.50 * e));
      },
      done() { st.phase('travel'); } });

    /* ② 睜開（travel）：石雕眼從側上方壓進來、落到本方那一線上。 */
    st.trail(stone, A, Z, { ms: TL, delay: T0, ease: 'outQuint', trail: false, spin: 1.1,
      done() {
        /* ★衝擊拍★：眼瞼全開＝石眼落定＝本方同幀托起（三件同一拍，§A2） */
        st.phase('react');
        st.burst(Z, { power: 0.8, n: 46, color: C.hot });
        st.punch(0.36);
      } });
    // 猛地睜圓（祖靈＝靜→瞬發，一格從 0 到滿）
    st.tween({ ms: TL * 0.5, delay: T0 + TL * 0.45, ease: 'snap', update(t, e) {
      seers.forEach((g) => {
        st.rot(g, 'Sl0', -0.30 - 0.42 * e); st.rot(g, 'Sl1', -0.26 - 0.36 * e);
        st.rot(g, 'Sl2', -0.22 - 0.30 * e); st.rot(g, 'Sl3', -0.18 - 0.24 * e);
        st.rot(g, 'Br0', 0.20 - 0.30 * e);
        st.rim(g, 1 + 1.2 + 2.0 * e);
      });
    } });
    st.fade(stone, { ms: RL * 0.5, delay: R0 + RL * 0.35, from: 1, to: 0 });

    /* ③ 先手（react）：本方每一尊上抬＋邊光，身上的眼印蓋上再淡去。 */
    marks.forEach((m, i) => {
      st.fade(m, { ms: RL * 0.3, delay: R0 + i * RL * 0.06, from: 0, to: 1 });
      st.fade(m, { ms: RL * 0.45, delay: R0 + RL * 0.5, from: 1, to: 0 });
    });
    mates.forEach((f, i) => st.tween({ ms: RL * 0.92, delay: R0 + i * RL * 0.06, ease: 'pulse', update(t, e) {
      st.move(f, 0, 0.09 * e, 0); st.rim(f, 1 + 1.9 * e);
    } }));

    /* 收勢：眼半闔，施招者跟著被托起（他也在本隊裡）。 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'linear', update(t) {
      const k = 1 - st.EASE.out(Math.min(1, t / 0.55));
      const up = st.EASE.pulse(Math.min(1, t / 0.8));
      seers.forEach((g) => {
        st.rot(g, 'Sl0', -0.72 * k); st.rot(g, 'Sl1', -0.62 * k); st.rot(g, 'Sl2', -0.52 * k); st.rot(g, 'Sl3', -0.42 * k);
        st.rot(g, 'Br0', -0.10 * k); st.rot(g, 'Br1', 0.16 * k); st.rot(g, 'Br2', 0.12 * k);
        st.rim(g, 1 + 3.2 * k + 1.2 * up);
      });
      st.move(lead, 0, 0.09 * up, 0);
    } });
  },
  /* 雷女之火・天雷（thunder，精英×1）：一拍開始 15% 燒掉對面 1 隻小兵。
     ★2026-09-13 祖靈批階段 B 轉正★（語彙檔 §C1 第 5 列＋§B1＋§A9；
     `MOVE_SPEC.boltGamble = { 丁, 張, 壓, stance:'舉臂', anchor:'foe' }`）

     三件（計畫 §3）：
       **本體動作＝張**（§C「撐」＝張的變體）：`LWingA1Wi`／`RWingA1Wi` 雙翼一格撐開＋
         `NeckRoot`／`Neck1`／`Neck2` 仰頸、`Tail*` 甩尾。
       **道具**＝丁 日與雷（限縮家族）：**鋸齒雷片**（`bolt` ×4，`st.paperProps` 的 `shape:'emblem'`
         ＝1 draw call）從 `EmberSeed` 炸開後**落到那一隻頭上**；＋那一隻身上一枚雷印。
         ★不得有球升空★（§C 區分點：現況的圓球升空與射日直接撞，讀者 A 短版整支讀成射日神弓）。
       **受招方反應＝壓**：被燒那隻等比縮＋骨骼抖（`st.flinch` 帶大 strength）。

     ★身分可辨（§A9）★ 施招姿態＝**舉臂**（up）≠ react「壓」（down）；腳下**垂直光柱**。
     ★拖線★：打擊類，保留，方向「施招者 → 目標」。★落點 anchor＝`foe`★。 */
  boltGamble(st) {
    const { W, T0, TL, R0, LAST, RL } = zlBeat(st, 0.90);
    const C = st.colors;
    const bird = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const swarm = st.byBody(st.target, 'swarm');
    const prey = swarm.length ? swarm[Math.min(swarm.length - 1, Math.floor(st.rnd() * swarm.length))] : (st.target[0] || null);
    const seed = st.worldOf(bird, 'EmberSeed', new THREE.Vector3());
    if (!seed.lengthSq()) { st.worldOf(bird, null, seed); seed.y += 0.45; }
    seed.add(st.camOff(0.9));
    const to = prey ? st.top(prey, new THREE.Vector3()) : seed.clone().addScaledVector(st.dir, 2.2);
    to.add(st.camOff(1.2));

    // ── 丁 鋸齒雷片：四片從火種炸開、一起落到那一隻頭上（1 draw call）──
    const BZ = 4;
    const bolts = st.paperProps(st.kind, BZ, { anchor: 'foe', shape: 'emblem', color: C.hot, opacity: 0, k: 0.75, depth: 0.14, warp: 0.16 });
    bolts.obj.position.copy(seed);
    const _e = new THREE.Euler();
    const jags = [];
    for (let i = 0; i < BZ; i++) jags.push({ x: (i - 1.5) * 0.26, y: 0.12 * (i % 2 ? 1 : -1), rz: 0.22 * (i - 1.5), s: 0 });
    const writeBolts = (k) => {
      for (let i = 0; i < BZ; i++) {
        const g = jags[i], it = bolts.items[i];
        it.p.set(g.x * (0.2 + 1.1 * k), g.y * (0.2 + 1.6 * k), 0);
        it.q.setFromEuler(_e.set(0, Math.PI * 0.5, g.rz * (0.3 + 1.4 * k)));
        it.s = g.s;
      }
      bolts.write();
    };
    writeBolts(0);

    // ── 被燒那隻身上的雷印（anchor foe）──
    const mark = prey ? st.paperStamp(st.kind, to, { anchor: 'foe', color: C.hot, inkColor: C.ink,
      opacity: 0, depth: 0.16, warp: 0.14, tiltDeg: 12, yawDeg: -20, follow: prey, at: 'top', off: st.camOff(1) }) : null;

    /* ① 撐翼（windup）：雙翼一格撐開、仰頸甩尾；雷片在火種上亮相。 */
    st.groundMark(bird, { h: 1.30, w: 0.26, taper: 0.42, peak: 0.95 });
    st.phase('windup');
    st.tween({ ms: W, ease: 'out',
      update(t, e) {
        st.stance(bird, '舉臂', e);
        st.rot(bird, 'LWingA1Wi', 0, 0, 0.62 * e); st.rot(bird, 'RWingA1Wi', 0, 0, -0.62 * e);
        st.rot(bird, 'NeckRoot', -0.22 * e); st.rot(bird, 'Neck1', -0.24 * e); st.rot(bird, 'Neck2', -0.20 * e);
        st.rot(bird, 'TailRoot', 0.24 * e); st.rot(bird, 'Tail1', 0.20 * e);
        st.rim(bird, 1 + 1.2 * e);
        st.worldOf(bird, 'EmberSeed', bolts.obj.position); bolts.obj.position.add(st.camOff(0.9));
        st.alpha(bolts.obj, Math.min(1, e * 1.9));
        for (let i = 0; i < BZ; i++) jags[i].s = Math.max(0, Math.min(1, (e - 0.10 * i) * 2.6));
        writeBolts(0);
      },
      done() { st.phase('travel'); } });

    /* ② 劈下（travel）：四片鋸齒雷從火種炸開、直落那一隻頭上（打擊類保留拖尾）。 */
    const from = seed.clone();
    st.trail(bolts.obj, from, to, { ms: TL, delay: T0, ease: 'strike', color: C.line, opacity: 0.75,
      update(t, e) { writeBolts(e); },
      done() {
        /* ★衝擊拍★：翼撐滿＝雷片落到那一隻頭上＝那一隻同幀被壓下（三件同一拍，§A2） */
        st.phase('react');
        st.burst(to, { power: 0.95, n: 58, color: C.hot });
        st.punch(0.44);
      } });
    // 收翅下拍（祖靈＝靜→瞬發）
    st.tween({ ms: TL * 0.6, delay: T0 + TL * 0.35, ease: 'snap', update(t, e) {
      st.rot(bird, 'LWingA1Wi', 0, 0, 0.62 - 0.90 * e); st.rot(bird, 'RWingA1Wi', 0, 0, -0.62 + 0.90 * e);
      st.rot(bird, 'NeckRoot', -0.22 + 0.34 * e); st.rot(bird, 'Neck1', -0.24 + 0.34 * e);
      st.rim(bird, 1 + 1.2 - 0.8 * e);
    } });
    st.fade(bolts.obj, { ms: RL * 0.45, delay: R0 + RL * 0.25, from: 0.95, to: 0 });
    /* ★`st.flinch` 一律頂層排（短版三條紀律第 2 條）★ 壓＝等比縮＋骨骼抖，給大 strength。 */
    if (prey) st.flinch([prey], { delay: R0, ms: RL * 0.8, strength: 1.9, burst: false });
    if (prey) st.tween({ ms: RL * 0.85, delay: R0, ease: 'snap', update(t, e) { st.scale(prey, 1 - 0.16 * st.EASE.pulse(e)); } });

    /* ③ 燃盡（react）：頭上的雷印蓋上再淡去。 */
    if (mark) {
      st.fade(mark, { ms: RL * 0.3, delay: R0, from: 0, to: 1 });
      st.fade(mark, { ms: RL * 0.45, delay: R0 + RL * 0.5, from: 1, to: 0 });
    }

    // 收勢：翼與頸尾回正
    st.tween({ ms: LAST - R0, delay: R0, ease: 'linear', update(t) {
      const k = 1 - st.EASE.out(Math.min(1, t / 0.6));
      st.rot(bird, 'LWingA1Wi', 0, 0, -0.28 * k); st.rot(bird, 'RWingA1Wi', 0, 0, 0.28 * k);
      st.rot(bird, 'NeckRoot', 0.12 * k); st.rot(bird, 'Neck1', 0.10 * k); st.rot(bird, 'Neck2', -0.20 * k);
      st.rot(bird, 'TailRoot', 0.24 * k); st.rot(bird, 'Tail1', 0.20 * k);
      st.rim(bird, 1 + 0.4 * k);
    } });
  },
  /* 拼板舟・飛魚躍（boat，小兵×3）：本隊受到的濺射減半。
     ★2026-09-13 祖靈批階段 B 轉正★（語彙檔 §C1 第 6 列＋§B1＋§A9；
     `MOVE_SPEC.swarmHalfSplash = { 丙, 躍, 升, stance:'下沉', anchor:'allies' }`）

     三件（計畫 §3）：
       **本體動作＝躍**：`BowBase`／`BowTip` 抬首＋`LFin1*`／`RFin1*` 划水，整體 `st.move` 躍離水面。
       **道具**＝丙 木器：**三道平行浪弧**（`wave` ×3，`st.paperProps` 的 `shape:'emblem'`＝1 draw call），
         從側後方推進來、鋪在本隊那一線下方；＋每一艘身上一枚浪印。
         ★漣漪環與水花圓盤退役★（`ring`／`disc` 限縮成香火的「陣」）。
       **受益方反應＝升**：本方三舟同時 `st.move` 抬起＋邊光。

     ★身分可辨（§A9）★ 施招姿態＝**下沉**（down，躍之前先壓浪）≠ react「升」（up）；腳下**垂直光柱**。
     ★拖線★：增益招 `trail: false`。★落點 anchor＝`allies`★（desc「本隊受到的濺射減半」）。
     ★造型互撞（ART_BIBLE §10.6）★：拼板舟↔山豬牙飾是模型層的撞，演出層只能硬拉開——
     這一支走**三道平行弧**（木器），山豬牙飾走**兩根獠牙**（骨牙石器），家族與數量都不同。 */
  swarmHalfSplash(st) {
    const { W, T0, TL, R0, LAST, RL } = zlBeat(st, 0.90);
    const C = st.colors;
    const school = st.byBody(st.actor, 'swarm');
    const fleet = school.length ? school : st.actor;
    const lead = fleet[0];
    const mates = st.actor.filter((f) => f !== lead);
    const bowAt = st.worldOf(lead, 'BowBase', new THREE.Vector3());
    if (!bowAt.lengthSq()) st.worldOf(lead, null, bowAt);
    const perp = new THREE.Vector3(-st.dir.z, 0, st.dir.x);
    const A = bowAt.clone(); A.addScaledVector(perp, 1.95); A.y += 0.65; A.add(st.camOff(1.0));
    const Z = new THREE.Vector3();
    st.actor.forEach((f) => { const p = st.worldOf(f, null, new THREE.Vector3()); Z.add(p); });
    Z.multiplyScalar(1 / Math.max(1, st.actor.length));
    Z.y = st.tableY + 0.30;
    Z.add(st.camOff(2.0));

    // ── 丙 三道平行浪弧（1 draw call；群體位移掛 InstancedMesh 物件本身，§A5）──
    const WV = 3;
    const waves = st.paperProps(st.kind, WV, { anchor: 'allies', shape: 'emblem', color: C.key, opacity: 0, k: 0.50, depth: 0.14, warp: 0.10 }); // k 1.05 那一版三道弧糊成一大片藍、佔掉半個畫面（自評第 1 輪）
    waves.obj.position.copy(A);
    const _e = new THREE.Euler();
    const rows = [];
    for (let i = 0; i < WV; i++) rows.push({ y: (i - 1) * 0.20, rz: 0.05 * (i - 1), s: 0 });
    const writeWaves = (k) => {
      for (let i = 0; i < WV; i++) {
        const g = rows[i], it = waves.items[i];
        it.p.set(0, g.y * (0.3 + 1.0 * k), (i - 1) * 0.05);
        it.q.setFromEuler(_e.set(0, Math.PI * 0.5, g.rz));
        it.s = g.s;
      }
      waves.write();
    };
    writeWaves(0);

    // ── 每一艘身上的浪印（anchor allies）──
    const marks = st.actor.map((f) => st.paperStamp(st.kind, st.worldOf(f, null, new THREE.Vector3()),
      { anchor: 'allies', color: C.key, inkColor: C.ink, opacity: 0, depth: 0.16, warp: 0.12, tiltDeg: 12, yawDeg: -22,
        follow: f, at: 'chest', off: st.camOff(1) }));

    /* ① 壓浪（windup）：船首下沉、側鰭收攏；浪弧在側後方亮相。 */
    st.groundMark(lead, { h: 1.16, w: 0.26, taper: 0.42, peak: 0.95, push: 0.70 });
    st.phase('windup');
    st.tween({ ms: W, ease: 'out',
      update(t, e) {
        st.stance(lead, '下沉', e);
        fleet.forEach((b) => {
          st.rot(b, 'BowBase', 0.24 * e); st.rot(b, 'BowTip', 0.20 * e);
          st.rot(b, 'LFin1A', -0.30 * e); st.rot(b, 'RFin1A', 0.30 * e);
          st.rot(b, 'LFin1B', -0.22 * e); st.rot(b, 'RFin1B', 0.22 * e);
          st.move(b, 0, -0.05 * e, 0);
          st.rim(b, 1 + 1.0 * e);
        });
        st.alpha(waves.obj, Math.min(1, e * 1.9));
        for (let i = 0; i < WV; i++) rows[i].s = Math.max(0, Math.min(1, (e - 0.10 * i) * 2.6));
        writeWaves(0);
      },
      done() { st.phase('travel'); } });

    /* ② 鋪浪（travel）：三道平行弧從側後方推進來、鋪在本隊腳下那一線。 */
    st.tween({ ms: TL, delay: T0, ease: 'outQuint', update(t, e) {
      waves.obj.position.lerpVectors(A, Z, e);
      writeWaves(e);
    },
    done() {
      /* ★衝擊拍★：三舟躍到頂＝浪弧鋪開＝全隊同幀抬起（三件同一拍，§A2） */
      st.phase('react');
      st.burst(Z, { power: 0.8, n: 46, color: C.hot });
      st.punch(0.36);
    } });
    // 躍：船首猛抬、鰭全張（祖靈＝靜→瞬發）
    st.tween({ ms: TL * 0.5, delay: T0 + TL * 0.45, ease: 'snap', update(t, e) {
      fleet.forEach((b) => {
        st.rot(b, 'BowBase', 0.24 - 0.56 * e); st.rot(b, 'BowTip', 0.20 - 0.44 * e);
        st.rot(b, 'LFin1A', -0.30 - 0.36 * e); st.rot(b, 'RFin1A', 0.30 + 0.36 * e);
      });
    } });
    st.fade(waves.obj, { ms: RL * 0.5, delay: R0 + RL * 0.35, from: 0.95, to: 0 });

    /* ③ 躍起（react）：本方每一艘上抬＋邊光，身上的浪印蓋上再淡去。 */
    marks.forEach((m, i) => {
      st.fade(m, { ms: RL * 0.3, delay: R0 + i * RL * 0.05, from: 0, to: 1 });
      st.fade(m, { ms: RL * 0.45, delay: R0 + RL * 0.5, from: 1, to: 0 });
    });
    mates.forEach((f, i) => st.tween({ ms: RL * 0.92, delay: R0 + i * RL * 0.05, ease: 'pulse', update(t, e) {
      st.move(f, 0, 0.13 * e, 0); st.rim(f, 1 + 1.9 * e);
    } }));

    /* 收勢：舟身回平，施招者跟著躍起（他也在本隊裡）。 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'linear', update(t) {
      const k = 1 - st.EASE.out(Math.min(1, t / 0.55));
      const up = st.EASE.pulse(Math.min(1, t / 0.8));
      fleet.forEach((b) => {
        st.rot(b, 'BowBase', -0.32 * k); st.rot(b, 'BowTip', -0.24 * k);
        st.rot(b, 'LFin1A', -0.66 * k); st.rot(b, 'RFin1A', 0.66 * k);
        st.rot(b, 'LFin1B', -0.22 * k); st.rot(b, 'RFin1B', 0.22 * k);
        st.rim(b, 1 + 1.0 * k + 1.2 * up);
      });
      st.move(lead, 0, 0.13 * up, 0);
    } });
  },

  /* 山豬牙飾・獠牙反擊（boartusk，小兵×1）：本隊每拍第一次被擊中時反傷 2。
     ★2026-09-13 祖靈批階段 B 轉正★（語彙檔 §C1 第 7 列＋§B1＋§A9；
     `MOVE_SPEC.swarmThorn = { 甲, 沉, 退, stance:'下沉', anchor:'foe' }`）

     三件（計畫 §3）：
       **本體動作＝沉**（§C「刨」正規化成沉）：低頭 `NeckRoot`／`HeadRoot`／`Skull`／`Muzzle` 刨地
         ＋`Withers`／`Barrel` 拱背、`DiscRoot`／`DiscFace` 牙盤轉亮。
       **道具**＝甲 骨牙石器：**兩根獠牙**（`tusk` ×2，`st.paperProps` 的 `shape:'emblem'`＝1 draw call）
         ＋打中那隻身上一枚**牙痕印**。
       **受招方反應＝退**：`st.flinch` 擊退。

     ★一處與 §C 散文不同，交製作人覆核★：§C 寫「獠牙**從目標身上反向彈回出招方**、衝擊拍
     『獠牙反向飛到一半』」。階段 A 簽字裁定① 之後，**衝擊拍那一瞬要量得出道具落在誰身上**，
     而「飛到一半」在 2v2 裡量到的是誰完全看站位——那正是 P4 三輪的病因。
     所以改成：獠牙在**衝擊拍扎進對手**（anchor `foe` 量得到），隨即在 `react` 段**反向彈回**
     插在施招者腳前。§C 的區分點（唯一反向飛行＝反擊的因果方向）保留在餘韻那一段。
     ★拖線★：打擊類保留。★落點 anchor＝`foe`★。
     ★身分可辨（§A9）★ 施招姿態＝**下沉**（down）≠ react「退」（back）；腳下**垂直光柱**。 */
  swarmThorn(st) {
    const { W, T0, TL, R0, LAST, RL } = zlBeat(st, 0.90);
    const C = st.colors;
    const pack = st.byBody(st.actor, 'swarm');
    const boar = pack.length ? pack[0] : st.actor[0];
    const prey = st.biggest(st.target) || st.target[0] || null;
    const disc = st.worldOf(boar, 'DiscFace', new THREE.Vector3());
    if (!disc.lengthSq()) { st.worldOf(boar, null, disc); disc.y += 0.35; }
    disc.add(st.camOff(0.9));
    const to = prey ? st.worldOf(prey, 'Chest', new THREE.Vector3()) : disc.clone().addScaledVector(st.dir, 2.2);
    if (prey && !to.lengthSq()) st.worldOf(prey, null, to);
    to.add(st.camOff(1.1));
    // 彈回的落點：施招者腳前（反擊的因果方向；不跨中線）
    const back = st.foot(boar, new THREE.Vector3()).addScaledVector(st.dir, 0.26).add(st.camOff(1.4));
    back.y += 0.16;

    // ── 甲 兩根獠牙（1 draw call）──
    const TK = 2;
    const tusks = st.paperProps(st.kind, TK, { anchor: 'foe', shape: 'emblem', color: C.line, inkColor: C.ink, opacity: 0, k: 0.85, depth: 0.18, warp: 0.12 });
    tusks.obj.position.copy(disc);
    const _e = new THREE.Euler();
    const pair = [{ x: -0.20, rz: 0.30, s: 0 }, { x: 0.20, rz: -0.30, s: 0 }];
    const writeTusks = (k) => {
      for (let i = 0; i < TK; i++) {
        const g = pair[i], it = tusks.items[i];
        it.p.set(g.x * (0.4 + 1.1 * k), 0, 0);
        it.q.setFromEuler(_e.set(0, Math.PI * 0.5, g.rz * (0.4 + 1.6 * k)));
        it.s = g.s;
      }
      tusks.write();
    };
    writeTusks(0);

    // ── 打中那隻身上的牙痕印（anchor foe）──
    const mark = prey ? st.paperStamp(st.kind, to, { anchor: 'foe', color: C.line, inkColor: C.ink,
      opacity: 0, depth: 0.16, warp: 0.14, tiltDeg: 12, yawDeg: -20, follow: prey, at: 'chest', off: st.camOff(1) }) : null;

    /* ① 刨地（windup）：低頭刨地、拱背，牙盤轉亮；獠牙在牙盤上亮相。 */
    st.groundMark(boar, { h: 1.14, w: 0.26, taper: 0.42, peak: 0.95, push: 0.70 });
    st.phase('windup');
    st.tween({ ms: W, ease: 'out',
      update(t, e) {
        st.stance(boar, '下沉', e);
        st.rot(boar, 'NeckRoot', 0.30 * e); st.rot(boar, 'HeadRoot', 0.34 * e);
        st.rot(boar, 'Skull', 0.22 * e); st.rot(boar, 'Muzzle', 0.16 * e);
        st.rot(boar, 'Withers', -0.16 * e); st.rot(boar, 'Barrel', -0.12 * e);
        st.rot(boar, 'DiscRoot', 0, 0, -0.9 * e); st.rot(boar, 'DiscFace', 0, 0, 0.7 * e);
        st.rim(boar, 1 + 1.3 * e);
        st.worldOf(boar, 'DiscFace', tusks.obj.position); tusks.obj.position.add(st.camOff(0.9));
        st.alpha(tusks.obj, Math.min(1, e * 1.9));
        for (let i = 0; i < TK; i++) pair[i].s = Math.max(0, Math.min(1, (e - 0.12 * i) * 2.6));
        writeTusks(0);
      },
      done() { st.phase('travel'); } });

    /* ② 扎（travel）：兩根獠牙從牙盤射出、扎進對手（打擊類保留拖尾）。 */
    const from = disc.clone();
    st.trail(tusks.obj, from, to, { ms: TL, delay: T0, ease: 'strike', color: C.line, opacity: 0.8,
      update(t, e) { writeTusks(e); },
      done() {
        /* ★衝擊拍★：牙盤轉亮到頂＝獠牙扎中＝對手同幀後退（三件同一拍，§A2） */
        st.phase('react');
        st.burst(to, { power: 0.9, n: 52, color: C.hot });
        st.punch(0.42);
      } });
    // 頂撞（祖靈＝靜→瞬發）：頭往上挑
    st.tween({ ms: TL * 0.55, delay: T0 + TL * 0.4, ease: 'snap', update(t, e) {
      st.rot(boar, 'NeckRoot', 0.30 - 0.60 * e); st.rot(boar, 'HeadRoot', 0.34 - 0.66 * e);
      st.rot(boar, 'Skull', 0.22 - 0.40 * e);
      st.rim(boar, 1 + 1.3 + 1.6 * e);
    } });
    if (prey) st.flinch([prey], { delay: R0, ms: RL * 0.8, strength: 1.5, burst: false });

    /* ③ 反彈（react）：★§C 的區分點★——獠牙從對手身上**反向彈回**、插在施招者腳前，
       這是全 27 支唯一反向飛行的道具（因果方向＝反擊）。 */
    st.tween({ ms: RL * 0.55, delay: R0 + RL * 0.12, ease: 'out', update(t, e) {
      tusks.obj.position.lerpVectors(to, back, e);
      writeTusks(1 - 0.5 * e);
    } });
    st.fade(tusks.obj, { ms: RL * 0.3, delay: R0 + RL * 0.65, from: 0.95, to: 0 });
    if (mark) {
      st.fade(mark, { ms: RL * 0.3, delay: R0, from: 0, to: 1 });
      st.fade(mark, { ms: RL * 0.45, delay: R0 + RL * 0.5, from: 1, to: 0 });
    }

    // 收勢：頭頸與牙盤回正
    st.tween({ ms: LAST - R0, delay: R0, ease: 'linear', update(t) {
      const k = 1 - st.EASE.out(Math.min(1, t / 0.6));
      st.rot(boar, 'NeckRoot', -0.30 * k); st.rot(boar, 'HeadRoot', -0.32 * k);
      st.rot(boar, 'Skull', -0.18 * k); st.rot(boar, 'Muzzle', 0.16 * k);
      st.rot(boar, 'Withers', -0.16 * k); st.rot(boar, 'Barrel', -0.12 * k);
      st.rot(boar, 'DiscRoot', 0, 0, -0.9 * k); st.rot(boar, 'DiscFace', 0, 0, 0.7 * k);
      st.rim(boar, 1 + 2.9 * k);
    } });
  },

  /* 獻祭刀・割祭（xianji，精英×1）：一拍自傷 1，全場本隊 atk+2。
     ★2026-09-13 招式演出卷・祖靈系批 2 階段 A（**祖靈範本招**，計畫 §7.2 Q1）★
     語彙：`2026-09-12-fx-vocab-draft.md` §C1 第 8 列＋§A9（身分可辨）；
     `MOVE_SPEC.eliteSelfCut = { 甲, 割, 升, stance:'下沉' }`。

     三件（計畫 §3）：
       **本體動作＝割**：`NeckRoot`／`Neck1`–`Neck3`／`HeadRoot` 頸下彎＋`LFront1El`／`RFront1El`／`*1Wr`
         前肢收、`Withers` 一格抽動；衝擊拍頭橫甩。
       **道具**＝甲 骨牙石器：**黑曜石刃**（`knife`，`st.paperStamp` 實體——**暗刃面（`ink` 近黑）＋
         靛藍刃身（`key`）當墨線邊**，§A4「暗面留細節、亮邊界定身分」；橫劃一道弧後**插在頸邊地上**）
         ＋**紙血條**（`st.paperProps` 一束窄紙條從頸口飄出＝自傷的證據，落在**施招者自己**身上）。
       **受益方反應＝升**：本隊每尊上抬＋暖邊光；**同伴**各蓋一枚刃印，**施招者身上是血條不是刃印**。

     ★身分可辨（§A9，本階段新增的系統級語彙）★
       ① 施招姿態＝**下沉**（`st.stance(deer, '下沉', e)`）：與受益反應「升」不同型（down vs up），
          這正是香火批 1 P4 第 3 輪的紅（2v2 同系同型下讀者分不出誰施招、道具落在誰身上就當誰施招）。
       ② 腳下語彙＝**垂直光柱**（`st.groundMark` → `st.pillar`，祖靈專屬；`ring`／`disc` 在本系退役）。
          亮滅由積木自己排：蓄勢就亮、**衝擊拍熄**，編舞給不出第二份時間軸。
       ③ **不得有跨場拖線**：刃是增益招的道具，`st.trail` 一律 `trail: false`
          （P4 r2／r3 實測：細白線一出現就被讀成「偷取」）。刃仍要真的飛一段（§A5 read-back 第 5 條）。

     ★真值（交製作人覆核）★：`ABILITIES.eliteSelfCut` 是「一拍自傷 1，**全場本隊** atk+2」
     ⇒ 效果＝防護增益、對象＝**我方多個**。派工書寫的是「對象＝自己」，兩者不同；
     本演出對兩者都留了訊號（自傷在施招者、增益落在全隊每一尊），真值由製作人定，本檔不自行改真值表。
     ★tier 1／2／3 共用這一支★：所有時點都從 `st.beat` 換算，不另寫短版分岔。 */
  eliteSelfCut(st) {
    const { W, T0, TL, R0, LAST, RL } = zlBeat(st, 0.90);
    const C = st.colors;
    const deer = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const mates = st.actor.filter((f) => f !== deer);
    // 傷口要落在體外一點：擺進 Chest 骨的位置會被自己的身體擋掉（材質有 depthTest），什麼都看不到
    const neck = st.worldOf(deer, 'Neck2', new THREE.Vector3()).addScaledVector(st.dir, 0.16);
    neck.y += 0.06;
    neck.add(st.camOff(0.7));
    /* 刃的起訖：後上方 → 頸口 → **前下方插地**。整段位移 ≈1.4 世界單位，
       travel 門檻是 `0.40 × travelDist`（出招方到目標的距離），滿編對決約 0.9 ⇒ 過得去。
       ★不得再往前拉★：增益招的飛行物不得跨中線（P4 r2 的兩個結構性語彙問題之一）。 */
    /* ★A 的高度是看圖調出來的★：`+0.46` 那一版在 844×390 上**被畫面上緣切掉**
       （`sheet-t2` 前兩格只看得到刃的一角，`xianji` 的包圍盒高 2.24、Neck2 本來就高）。
       兩輪看圖收到 `-0.22／+0.12` 之後整枚刃都在畫面裡，travel 位移仍有 ~1.5 世界單位（門檻 0.4×travelDist）。 */
    const A = neck.clone().addScaledVector(st.dir, -0.22); A.y += 0.12;
    /* ★階段 B（裁定①）把 `+0.40` 收成 `+0.18`★：`--count=2` 的落點量測抓到刃插在鹿的**佔地之外**
       0.06、卻正好落在同伴的佔地裡（`caster>ally✗`）——「插在自己頸邊的地上」在 2v2 裡讀成
       「插在同伴身上」。收回來之後刃仍在鹿的前腳前方，travel 的位移由高度差（頸高 → 桌面）承擔。 */
    const Z = neck.clone().addScaledVector(st.dir, 0.18); Z.y = st.tableY + 0.14;

    // ── 甲 黑曜石刃：暗刃面＋靛藍刃身（墨線邊就是露出來的那一圈 key）──
    const obsid = st.paperStamp(st.kind, A, { anchor: 'caster', role: 'stamp', color: C.ink, inkColor: C.key,
      opacity: 0, depth: 0.24, warp: 0.10, tiltDeg: 8, yawDeg: -18, roll: -1.1 });
    /* ★尺寸是量出來的，不是挑的★：0.55 那一版 P3 t2 只有 **0.3439%**（門檻 0.8%、ΔE 51.89 本來就過）。
       L3 凍在 travel 中點，那一刻刃的大小＝windup 末那個值，所以放大要放在下面那條 windup 的 tween 上。
       §A3 的上限（≤ 施招本體高 2/3）由 `tests/tools/prop-size.mjs` 記錄，數字寫進報告。 */
    obsid.scale.setScalar(st.iconSize * 0.45);
    const bow = st.camOff(1.6); // 飛行弧往鏡頭鼓出的量（兩端 sin=0 ⇒ 起點與落點不變，同香灰符的作法）

    // ── 紙血條：割開時從頸口飄出的一束窄紙條（1 個 draw call；群體位移掛在 InstancedMesh 物件本身）──
    const BL = 7;
    // k 0.62 那一版在 sheet 上一格都看不到（單件 0.186 世界單位）；1.15 又太大（糊成一塊淺色方塊），收在 0.85／ratio 0.22
    const gore = st.paperProps(st.kind, BL, { anchor: 'caster', color: C.hot, opacity: 0, k: 0.85, ratio: 0.22, depth: 0.10, warp: 0.24 });
    gore.obj.position.copy(neck);
    const _e = new THREE.Euler();
    const strips = [];
    for (let i = 0; i < BL; i++) {
      strips.push({
        a: new THREE.Vector3((st.rnd() - 0.5) * 0.10, (st.rnd() - 0.5) * 0.06, (st.rnd() - 0.5) * 0.10),
        b: new THREE.Vector3((st.rnd() - 0.5) * 0.44, -0.16 - 0.34 * st.rnd(), (st.rnd() - 0.5) * 0.44),
        rz: st.rnd() * 3, ry: Math.PI * 0.5 + 0.9 * st.rnd(), s: 0,
      });
    }
    const writeGore = (k) => {
      for (let i = 0; i < BL; i++) {
        const g = strips[i], it = gore.items[i];
        it.p.lerpVectors(g.a, g.b, k);
        it.q.setFromEuler(_e.set(0, g.ry, g.rz));
        it.s = g.s;
      }
      gore.write();
    };
    writeGore(0);

    // ── 同伴身上的刃印（施招者自己沒有：他身上是血條）──
    const marks = mates.map((f) => st.paperStamp(st.kind, st.worldOf(f, 'Chest', new THREE.Vector3()),
      { anchor: 'allies', color: C.key, inkColor: C.ink, opacity: 0, depth: 0.18, warp: 0.14, tiltDeg: 12, yawDeg: -20,
        follow: f, at: 'chest', off: st.camOff(1) }));

    /* ① 俯首就刃（windup）：頸逐節下彎、邊光先暗；刃在頸邊亮相＝出招瞬間的新增元素。
       **施招姿態（下沉）與腳下光柱同時在這一段立起來**——身分訊號一定要早於道具落點。 */
    /* 光柱的高與寬是看圖調的：h 1.15／w 0.17 那一版在滿編視距下細得像一根竿子（`sheet-t1` 幾乎看不到），
       改成矮一點寬一點才讀得出「腳下立起一道光」。柱本身不是道具，不受 §A3 的 2/3 上限約束。 */
    st.groundMark(deer, { h: 1.30, w: 0.26, taper: 0.42, peak: 0.95 });
    st.phase('windup');
    st.tween({ ms: W, ease: 'out',
      update(t, e) {
        st.stance(deer, '下沉', e); // §A9：施招者專屬姿態（走 w.sta 獨立通道，不動因果三段的量測）
        st.rot(deer, 'NeckRoot', 0.30 * e); st.rot(deer, 'Neck1', 0.28 * e); st.rot(deer, 'Neck2', 0.26 * e); st.rot(deer, 'Neck3', 0.24 * e);
        st.rot(deer, 'HeadRoot', 0.36 * e); st.rot(deer, 'Skull', 0.20 * e); st.rot(deer, 'Muzzle', 0.14 * e);
        st.rot(deer, 'LFront1El', -0.22 * e); st.rot(deer, 'RFront1El', -0.22 * e);
        st.rot(deer, 'LFront1Wr', 0.20 * e); st.rot(deer, 'RFront1Wr', 0.20 * e);
        st.rot(deer, 'TailRoot', 0.30 * e); st.rot(deer, 'Tail1', 0.24 * e); st.rot(deer, 'Withers', 0.10 * e);
        st.move(deer, 0, -0.045 * e, 0);
        st.rim(deer, 1 - 0.7 * e);
        st.alpha(obsid, Math.min(1, e * 1.8));
        obsid.scale.setScalar(st.iconSize * (0.45 + 0.50 * e));
      },
      done() { st.phase('travel'); } });

    /* ② 割（travel）：刃從後上方劃過頸口、插進頸邊的地上。
       **`trail: false`**——增益招不得有跨場拖線（P4 r2 裁定）；刃身自己的位移就是 travel 的載體。 */
    st.trail(obsid, A, Z, { ms: TL, delay: T0, ease: 'strike', trail: false, spin: 2.6,
      update(t, e) { obsid.position.addScaledVector(bow, Math.sin(Math.PI * e)); },
      done() {
        /* ★衝擊拍★：刃插到底＝血條炸出＝本隊同幀亮邊上抬（三件同一拍，§A2） */
        st.phase('react');
        st.burst(neck, { power: 0.95, n: 54, color: C.hot });
        st.punch(0.42);
      } });
    /* 割的重音：頭橫甩、邊光從最暗暴亮到三倍（祖靈＝靜→瞬發）。
       ★施招姿態的收回**不寫在這裡**★（覆審 H3）：它由 `st.stance` 註冊的包絡自己收在衝擊拍上，
       27 支一律相同——靠「每支招記得寫一行」的話，香火 9 支就是沒寫（姿態一路撐到收工，
       「下沉」的 −0.14 把受益方的上抬 +0.07 演成往下沉）。 */
    st.tween({ ms: TL * 0.6, delay: T0 + TL * 0.32, ease: 'snap', update(t, e) {
      st.rot(deer, 'HeadRoot', 0.36, 0.52 * e, 0); st.rot(deer, 'Neck2', 0.26 * (1 - 0.7 * e)); st.rot(deer, 'Neck3', 0.24 * (1 - 0.7 * e));
      st.rim(deer, 0.3 + 3.0 * e);
    } });
    // 血條：割到一半開始從頸口飄出，衝擊拍達到最大
    st.fade(gore.obj, { ms: TL * 0.3, delay: T0 + TL * 0.45, from: 0, to: 0.95 });
    st.tween({ ms: TL * 0.55 + RL * 0.6, delay: T0 + TL * 0.45, ease: 'out', update(t, e) {
      for (let i = 0; i < BL; i++) { strips[i].s = Math.max(0, Math.min(1, (e * 2.2 - 0.10 * i))); strips[i].rz += 0.10; }
      writeGore(e);
    } });
    st.fade(gore.obj, { ms: RL * 0.45, delay: R0 + RL * 0.5, from: 0.95, to: 0 });
    // 刃插在地上之後留一下再淡掉（不再飛回去、不留印在別人身上）
    st.fade(obsid, { ms: RL * 0.45, delay: R0 + RL * 0.25, from: 1, to: 0 });

    /* ③ 祝福（react）：本隊每尊被托起半寸＋暖邊光；同伴各蓋一枚刃印。
       ★施招者也上抬★（ABILITIES「全場本隊 atk+2」），但他的身分已經由 windup 的
       下沉姿態＋腳下光柱標掉了，兩件在時間上分離（§A9 第 2 條的例外）。 */
    marks.forEach((m, i) => {
      st.fade(m, { ms: RL * 0.3, delay: R0 + i * RL * 0.06, from: 0, to: 1 });
      st.fade(m, { ms: RL * 0.45, delay: R0 + RL * 0.5, from: 1, to: 0 });
    });
    mates.forEach((f, i) => st.tween({ ms: RL * 0.92, delay: R0 + i * RL * 0.06, ease: 'pulse', update(t, e) {
      st.move(f, 0, 0.085 * e, 0); st.rim(f, 1 + 1.9 * e);
    } }));

    /* 收勢：鹿回正並跟著被托起（他也是受益方）。只有他一尊時（治具的 xianji 就是 count=1）
       這一段就是全部的 react——`evalPhases` 在 `sawOther===false` 時量的正是他自己。 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'linear', update(t) {
      const k = 1 - st.EASE.out(Math.min(1, t / 0.45));
      const up = st.EASE.pulse(Math.min(1, t / 0.8));
      st.rot(deer, 'NeckRoot', 0.30 * k); st.rot(deer, 'Neck1', 0.28 * k); st.rot(deer, 'Neck2', 0.26 * k); st.rot(deer, 'Neck3', 0.24 * k);
      st.rot(deer, 'HeadRoot', 0.36 * k, 0.52 * k, 0); st.rot(deer, 'Skull', 0.20 * k); st.rot(deer, 'Muzzle', 0.14 * k);
      st.rot(deer, 'LFront1El', -0.22 * k); st.rot(deer, 'RFront1El', -0.22 * k);
      st.rot(deer, 'LFront1Wr', 0.20 * k); st.rot(deer, 'RFront1Wr', 0.20 * k);
      st.rot(deer, 'TailRoot', 0.30 * k - 0.26 * up); st.rot(deer, 'Tail1', 0.24 * k - 0.20 * up); st.rot(deer, 'Withers', 0.10 * k - 0.10 * up);
      st.move(deer, 0, -0.045 * k + 0.085 * up, 0);
      st.rim(deer, 1 + 2.3 * k + 1.4 * up);
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
  /* eliteOpenShot｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**：時間軸全由 st.beat／st.ms 換算，
     兩個 tier 的差別只是比例表（2026-09-13 演出卷祖靈批階段 B 起，祖靈系逐支改成這個做法）。 */
  eliteOpenShot: MOVES.eliteOpenShot,

  /* wardHpFront2｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**（階段 B 轉正，時間軸走 st.beat）。 */
  wardHpFront2: MOVES.wardHpFront2,

  /* wardHpAll1｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**（階段 B 轉正，時間軸走 st.beat）。 */
  wardHpAll1: MOVES.wardHpAll1,

  /* wardFirst｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**（階段 B 轉正，時間軸走 st.beat）。 */
  wardFirst: MOVES.wardFirst,

  /* boltGamble｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**（階段 B 轉正，時間軸走 st.beat）。 */
  boltGamble: MOVES.boltGamble,

  /* swarmHalfSplash｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**（階段 B 轉正，時間軸走 st.beat）。 */
  swarmHalfSplash: MOVES.swarmHalfSplash,

  /* swarmThorn｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**（階段 B 轉正，時間軸走 st.beat）。 */
  swarmThorn: MOVES.swarmThorn,

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


/* ══════════ v0.55 批 0 徽記剪影版（`?fxvocab=1` 時登記的那一份）══════════
   祖靈範本招 `eliteSelfCut` 於 2026-09-13 轉正（招式演出卷・祖靈批階段 A），正式版住在上面的 MOVES。
   這一份**原地保留給治具與 L3 canary**：`tests/fxvocab.test.mjs --mutate=4..20` 的十七條繞法
   全部錨在它 windup 段那一行「刃的呼吸縮放」上（本 repo 唯一一處祖靈系的合法徽記縮放）。
   ★這裡刻意**不寫出那一行的原文**★：`src.replace()` 取的是第一個相符處，註解裡出現同一個字面值
   就會讓突變改在註解上、被 `noComment` 一併剝掉 ⇒ 十七條繞法全部靜默變綠（實測 4–20 全 GREEN）。
   同一個坑 `tests/tools/traitfx-drive.mjs` 覆審 r1 MEDIUM-1 也踩過一次。
   ★這一段的本體逐字取自 v0.55.6 的 MOVES.eliteSelfCut，只改了函式名那一行★
   （`_v055` 後綴在登記點 js/trait-fx.js 剝掉換回 trId，分派只做一次）。
   0.54 的退路（`V054`／`V054_SHORT`）連同轉正一起移除——見 git show 616f7ff:js/trait-fx/zuling.js。 */
export const V055 = {
  /* 獻祭刀・割祭 v0.55 批 0 徽記剪影版（`?fxvocab=1` 才登記）。
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
  eliteSelfCut_v055(st) {
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
        st.iconScale(knife, 0.5 + 0.5 * e);
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
};

export const V055_SHORT = {
  // 短版與完整版共用同一支（徽記版原本就沒有 eliteSelfCut 的專屬短版，tier 1 退回完整版）
  eliteSelfCut_v055short: V055.eliteSelfCut_v055,
};

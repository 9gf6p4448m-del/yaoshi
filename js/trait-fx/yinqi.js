// 妖市 — 卷 C3 招式編舞・陰氣系（9 套，2026-09-05）
// 舞台 API 與規則見 zuling.js 檔頭；骨骼名見 docs/experiments/2026-09-05-traitfx-bones.md。
import * as THREE from 'three';

const _a = new THREE.Vector3();

/** 三拍窗換算（與 `js/trait-fx/zuling.js` 的 `zlBeat`／`xianghuo.js` 的 `xhBeat` 同一條式子，各系一支小零件）。
 *  `frac`＝`LAST / st.ms`（預設 0.90＝語彙檔 §A5 建議值：往嚴的方向走，多出來的 2% 全給衝擊拍）。
 *  ★不得在這裡寫任何毫秒字面值★：時長的唯一來源是 index.html 的 `PW_FX.TRAIT_MS_BY_TIER`。 */
function yqBeat(st, frac) {
  const B = st.beat;
  const LAST = st.ms * (frac === undefined ? 0.90 : frac);
  return { B, W: B.windup[1], T0: B.travel[0], TL: B.travel[1] - B.travel[0], R0: B.react[0], LAST, RL: LAST - B.react[0] };
}

/** ★卡頓三段跳（§B3 陰氣節奏「不補間、拍子錯開」；2026-09-13 陰氣批階段 A）★
 *  三個離散台階的**位置表**——不是把補間變慢，是整段**沒有中間值**。
 *  ★第三階（到位）不在飛行段裡，由 tween 的 `done()` 給★（覆審 H9）：
 *  §A1 的衝擊拍是 `react` 的**起點那一瞬間**；把第三階切在 travel 的 0.86 時，t2 下距衝擊拍
 *  36.4ms＝2.2 幀，那正是 §A2 說的「兩個重音」。`done()` 在 `react[0]` 當幀跑，所以
 *  本體到位／道具落點／魂片散出／受招反應四件落在同一拍。
 *  飛行段只走 `[0]`／`[1]`；`[2]` 是 `done()` 用的那一格。
 *  三系裡只有陰氣用它：祖靈是「靜→瞬發」、香火是「蓄—落—餘」，混用就是踩別系的禁區。 */
const JOLT = [0.30, 0.64, 1];
/** ★蓄勢段的卡頓＋「出招前一拍完全靜止」（§B3）★
 *  兩跳到底，`e ≥ 0.42` 之後回傳的值**不再變** ⇒ tween 還在跑，畫面上一動都不動。
 *  ★為什麼不另排一段空 tween★：靜止那一拍是這一系的辨識元素，寫在同一條進度函式裡，
 *  編舞就給不出「兩份時間軸」（同 `st.groundMark` 的亮滅由積木自己排那一條）。 */
const COIL_STEP = [0.40, 0.72, 1];
/** 蓄勢那三階的**台階索引**（0／1／2）。收成一支的理由同 `JOLT`：三系檔裡「第幾階」只有一個算法。 */
const COILN = (e) => (e < 0.21 ? 0 : (e < 0.42 ? 1 : 2));
const COIL = (e) => COIL_STEP[COILN(e)];

/** ★飛行段的共同出口（2026-09-13 陰氣批階段 B）★
 *  範本招 `hauntLost` 把「三階卡頓＋鼓弧＋第三階由 done() 給」逐行寫過一次；其餘 8 支照抄
 *  就是 9 份複製品，而這一段同時承載 §A1 的衝擊拍、§A9-5 的落點、P3 的螢幕面積三件事——
 *  改一份漏八份的代價太大。收成這一支之後，「陰氣的道具怎麼飛」只有一個落點
 *  （`02 §6.1` 第 7 條的**首選收斂**：讓其餘複製品由建構上消失）。
 *
 *  `from → aim`  飛行段真的走的兩階（`JOLT[0]`／`JOLT[1]`）；
 *  `to`          第三階（到位），由 `done()` 給 ⇒ 落在 `react[0]` 當幀（階段 A 覆審 H9：
 *                切在 travel 的 0.86 時 t2 下距衝擊拍 2.2 幀＝§A2 說的「兩個重音」）。
 *  ★`aim` 與 `to` 分開★：anchor 凍在**衝擊拍**（落點非夾進那一尊的佔地不可），
 *  L3 凍在 **travel 中點**（那一格要的是螢幕面積）。兩段共用一個點會讓整條路徑跟著偏
 *  （`hauntLost` 實測 P3 由 1.022% 掉到 0.7109%，門檻 0.8）。
 *  ★鼓弧只掛在第二階的前段★：兩端為 0 ⇒ 起點與落點一個位元組不變，衝擊拍量到的是真正的落點；
 *  它買的是 P3 的面積（把道具拉近鏡頭），不是「有沒有真的飛」——後者由第三階與 `aim` 承擔。
 *
 *  `o = { bow, rise, roll, trail, color, pre, done, update }`
 *    `pre()` 在 `position.copy(to)` **之前**跑（給 `st.bodySpot` 用當下站位重夾一次）。 */
function yqFly(st, mesh, from, aim, to, B, o = {}) {
  const bow = o.bow === undefined ? st.camOff(2.2) : o.bow;
  const rise = o.rise === undefined ? 0.22 : o.rise;
  const roll = o.roll === undefined ? 0.44 : o.roll;
  let jolted = -1;
  return st.trail(mesh, from, to, {
    ms: B.TL, delay: B.T0, ease: 'linear', trail: o.trail === true, color: o.color,
    update(t, e) {
      const n = e < 0.40 ? 0 : 1;
      // 每一跳轉一格，跳與跳之間完全不轉（朝向仍凍在 spawn 那顆四元數上疊轉，不是逐幀正對鏡頭）
      if (n !== jolted) { jolted = n; if (roll) mesh.rotateZ(roll); }
      mesh.position.lerpVectors(from, aim, JOLT[n]);
      const m = n === 1 && e < 0.80 ? 1 : 0;
      mesh.position.y += rise * m;
      mesh.position.addScaledVector(bow, m);
      if (o.update) o.update(t, e, n);
    },
    done() {
      if (o.pre) o.pre();
      mesh.position.copy(to); // 第三階：一格到位，與衝擊拍同幀（不補間）
      if (roll) mesh.rotateZ(roll);
      if (o.done) o.done();
    },
  });
}

/** ★逐尊送達（同 `zlDeliver`／`xhDeliver` 那件事，差別只有節奏）★
 *  受招／受益的**每一尊**各收到一件從施招者那邊飛過來的實體道具——§A9-5 的逐尊覆蓋
 *  （`allies` 要每一尊 `sep` 的我方、`foes` 至少兩尊敵方）靠的就是它。
 *  三條刻意的設計沿用祖靈批：① **不 stagger**（錯開會讀成「一個一個來」，不是「全體」）
 *  ② 是**飛過去的落點**不是原地黏上的印記 ③ 落點一律由 `st.bodySpot` 挑，
 *  並在衝擊拍那一幀（`yqFly` 的 `pre`）用當下站位重挑一次。
 *  ★陰氣的差別★：飛行走 `yqFly` 的三階卡頓、淡入也是一格到位（§B3 禁平滑補間），
 *  而且 `trail` 一律關（§A9-3 的拖尾只給打擊類，本函式兩種對象都會用到）。
 *  ★主道具不在這裡★：`main: true` 一律寫在招自己的函式體裡（P1 的原始碼側掃的是那一支的函式體）。 */
function yqDeliver(st, from, figs, B, o = {}) {
  const C = st.colors;
  return figs.map((f) => {
    const chest0 = st.worldOf(f, o.at || 'Chest', new THREE.Vector3());
    const to = chest0.clone().add(st.camOff(1));
    const others = figs.filter((g) => g !== f);
    if (others.length) {
      /* `lean` 只剩「往哪一側起步」，決定落點的是 `st.bodySpot`（祖靈批覆審 r2 N-3）：
         手調的推力做不到兩件事——推得夠遠才清得開重疊的同伴，推太遠又會離開受益方自己的佔地。 */
      const c = new THREE.Vector3();
      others.forEach((g) => c.add(g.group.position));
      c.multiplyScalar(1 / others.length);
      const lean = f.group.position.clone().sub(c); lean.y = 0;
      if (lean.lengthSq() > 1e-6) to.add(lean.normalize().multiplyScalar(2.0));
    }
    st.bodySpot(f, to);
    const m = st.paperStamp(st.kind, from, { anchor: o.anchor,
      color: o.color === undefined ? C.key : o.color, inkColor: o.inkColor === undefined ? C.ink : o.inkColor,
      opacity: 0, depth: o.depth === undefined ? 0.20 : o.depth, warp: 0.14, tiltDeg: 10, yawDeg: -20 });
    m.scale.setScalar(st.markSize * (o.k === undefined ? 1.5 : o.k));
    const aim = to.clone();
    // 淡入一格到位（`e < 0.40` 是 JOLT 第一階的切點，與飛行同一組台階）
    st.tween({ ms: B.TL, delay: B.T0, ease: 'linear', update(t, e) { st.alpha(m, e < 0.40 ? 0 : 1); } });
    yqFly(st, m, from, aim, to, B, { bow: st.camOff(o.bowK === undefined ? 1.4 : o.bowK), rise: o.rise === undefined ? 0.16 : o.rise, roll: o.roll,
      pre() { st.bodySpot(f, to); },
      done() { st.stick(m, f, { at: 'chest', off: to.clone().sub(chest0) }); if (o.done) o.done(f, m); } });
    return m;
  });
}

/** 道具的起點：從候選的後退量裡挑**第一個整件都還在畫面上**的（同 `zuling.js` 的 `camPush`；
 *  判準用 `st.inView`，與 anchor「在場」第 5 條是同一支）。
 *  ★為什麼要這一支★（看圖第 1／2 輪）：起點往 `-st.dir` 拉得越遠，`PHASE_GATE.travel` 的分子越大
 *  （§A9-3 也要求增益招「不跨中線、不從敵方出發」），但拉出畫面之後**蓄勢那兩格就看不到道具從哪裡來**
 *  ——而「那件東西是我方自己升起來的」正是 P4 對象題要讀的訊號。兩件事共用一個旋鈕，所以拿畫面當上界。
 *  `up`＝再抬高多少；`half`＝道具的半高（整件要在畫面裡，不是只有中心點）。 */
function yqLaunch(st, base, backs, up, half) {
  let last = null;
  for (const b of backs) {
    const p = base.clone().addScaledVector(st.dir, -b).add(st.camOff(0.8));
    p.y = base.y + (up || 0);
    last = p;
    if (st.inView(p) && st.inView(_a.copy(p).setY(p.y + (half || 0)))) return p;
  }
  return last;
}

/** 從名單裡挑「身上還放得下一件**分得出來**的道具」的那一尊（同 `zuling.js` 的 `roomyPrey`）。
 *  治具棚四尊敵方前後兩排互相重疊，挑到被夾在中間的那一隻時，牠身上任何一點離其他每一尊
 *  都 < `ANCHOR_MARGIN` ⇒ 道具放得再準，`attr()` 也歸屬不出來（§A9-5）。
 *  `st.spotRoom` 與判定端的 `sepOf` 是同一支掃描。`y`＝道具實際落在多高（視錐是 3D 的）。 */
function yqRoomy(st, list, y) {
  if (!list || !list.length) return null;
  if (list.length === 1) return list[0];
  let best = null, br = -Infinity;
  list.forEach((f) => {
    const r = st.spotRoom(f, y === undefined ? st.worldOf(f, 'Chest', _a).y : y);
    if (r > br) { br = r; best = f; }
  });
  return best || list[0];
}

const MOVES = {
  /* 有應公・有求必應（youyinggong，作祟×2；傳說三尊美術卷 2026-09-07）：第 3 拍作祟時，
     對面每有一件詛咒品就多燒一隻。
     編舞（陰氣＝attack 前先有一拍靜止、拍子卡頓）：0–200ms 完全不動，只有邊光慢慢亮起來
          → 200ms 龕口整個往前壓、從龕口噴出數股祟，逐一落到對面每一隻身上（錯開拍子）
          → 霧裾慢半拍才追上 → 720ms 起回 0。 */
  hauntAnswer(st) {
    const shrines = st.byBody(st.actor, 'haunt');
    const lead = shrines[0] || st.actor[0];
    st.tween({ ms: 200, ease: 'inout', update(t, e) { st.rim(lead, 1 + 0.9 * e); } });
    st.at(200, () => {
      const mouth = st.worldOf(lead, 'Chest', new THREE.Vector3());
      st.tween({ ms: 340, ease: 'snap', update(t, e) {
        st.move(lead, 0, 0, 0.22 * Math.sin(Math.PI * e));
        st.rot(lead, 'Spine', -0.12 * e); st.rot(lead, 'Chest', -0.20 * e); st.rot(lead, 'Top', -0.16 * e);
        st.scaleBone(lead, 'Chest', 1 + 0.10 * Math.sin(Math.PI * e));
      } });
      st.at(120, () => st.tween({ ms: 380, ease: 'out', update(t, e) {
        st.rot(lead, 'MistRoot', 0.16 * Math.sin(Math.PI * e));
        st.rot(lead, 'Mist1', -0.20 * Math.sin(Math.PI * e));
        st.rot(lead, 'Mist2', 0.22 * Math.sin(Math.PI * e));
      } }));
      (st.target || []).forEach((f, i) => st.at(60 * i, () => {
        const to = st.worldOf(f, null, new THREE.Vector3());
        const wisp = st.orb(mouth.clone(), 0.055, { opacity: 0.95 });
        st.fly(wisp, mouth.clone(), to, { ms: 220, ease: 'out', arc: 0.22, done() {
          st.burst(to, { power: 0.7, n: 40 });
          st.fade(wisp, { ms: 140, to: 0 });
          const d = st.disc(st.foot(f, new THREE.Vector3()), 0.34, { opacity: 0.5 });
          d.scale.setScalar(0.3); st.grow(d, { ms: 240, from: 0.3, to: 1.1 });
          st.fade(d, { ms: 260, delay: 120, from: 0.5, to: 0 });
          st.flinch([f], { strength: 0.9, burst: false });
        } });
      }));
      st.punch(0.3);
    });
    st.at(720, () => st.tween({ ms: 180, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.rot(lead, 'Spine', -0.12 * k); st.rot(lead, 'Chest', -0.20 * k); st.rot(lead, 'Top', -0.16 * k);
      st.scaleBone(lead, 'Chest', 1);
      st.rot(lead, 'MistRoot', 0); st.rot(lead, 'Mist1', 0); st.rot(lead, 'Mist2', 0);
      st.rim(lead, 1 + 0.9 * k);
    } }));
    /* ★Tier 3 餘韻（R1 覆審 M1）★：原本只排到 1013ms，tier 3 有 1400ms。
       只在 tier 3 追加新節拍（tier 2 行為逐項不變）：祟氣散盡之前，對面每一隻腳下浮一圈暗環、
       龕口的光緩緩闔上（陰氣＝拍子卡頓、慢半拍）。 */
    if (st.tier === 3) {
      st.target.slice(0, 4).forEach((f, i) => {
        const r = st.ring(st.foot(f, new THREE.Vector3()), 0.26, 0.035, { opacity: 0, color: 0x2f1f47 });
        st.grow(r, { ms: 270, delay: 940 + i * 28, from: 0.35, to: 1.6 });
        st.fade(r, { ms: 270, delay: 940 + i * 28, from: 0.7, to: 0 });
      });
      st.tween({ ms: 300, delay: 960, ease: 'pulse', update(t, e) { st.rim(lead, 1 + 1.2 * e); } });
      st.tween({ ms: 260, delay: 1010, ease: 'inout', update(t, e) { st.scaleBone(lead, 'Top', 1 - 0.08 * e); } });
    }
  },

  /* 林投姐髮簪・偷命（hairpin，作祟×4）：三拍結束時敗方另 −1 壽命。
     ★2026-09-13 招式演出卷・陰氣批 3 階段 B★ 語彙＝`2026-09-12-fx-vocab-draft.md` §C3 第 2 列＋§B3＋§A9；
     `MOVE_SPEC.hauntSteal = { 甲, 垂, 被拖, stance:'舉臂', anchor:'foe' }`。

     三件（計畫 §3）：
       **本體動作＝垂**：`HairA`–`HairE` 髮瀑先**揚起**（`COIL` 兩跳到底 → 完全靜止一拍）→
         `VeilRoot`／`Veil1`／`Veil2`／`VeilTip` 面紗垂落、`LArmRoot1Rt`／`RArmRoot1Rt` 前伸（`JOLT` 三階）。
       **道具**＝甲 人身遺物：**銀簪**（`pin`，冷屍白青 `key` 面板＋`ink` 本體露出來的那一圈＝外描邊）
         從髮間飛出、**戳進**受招方胸口並留在那裡（＝§C 那一列的「胸口留簪孔印」）；
         ＋丙 鬼火與魂片：衝擊拍從同一個胸口**脫離**的三點**命火**（`st.paperProps`，
         全招唯一的那一點刺眼的紅 `hot`）。
       **受招方反應＝被拖**：往出招方 `st.move` 半步，**四個離散台階**、階與階之間一動都不動。

     ★§C3 寫的是「帶著一顆命火**飛回**」，本支沒有做那一段（照實記，交製作人裁）★
     §A9-6（2026-09-13 覆審 r4，晚於 §C3）把「衝擊拍之後有道具往我方走」定成**打擊類的紅燈**——
     理由正是「東西從對手身上回到我方＝偷取」的讀法（P4 r2 虎爺印 7/18 被讀成偷取）。
     本支 `anchor: 'foe'` ⇒ 落在那條斷言的範圍裡，任何飛回我方的道具都判紅。
     取捨：**不動那條凍結的斷言**，改把「偷到了」拆成三件同幀發生的事——
       ① 簪戳中並留在胸口 ② 命火**脫離目標**（§C 自己那一列的「t1 衝擊拍承載」就是這樣寫的）
       ③ 目標**被拖**半步往出招方（受招方的 `model` 位移不在回流斷言的分母裡，那是「人」不是「道具」）。
     失去的是「唯一去而復返的道具」這個區分點，換來的是斷言不被搬動。交製作人裁。

     ★身分可辨（§A9）★ 施招姿態＝**舉臂**（up）≠ react「被拖」（fore）；
     腳下＝不規則暗斑（`st.groundMark` → `st.stain`）；**無跨場拖線**（`trail: false`，§A9-3 的
     拖尾只給打擊類，而「一條細白線從對面拉回來」正是 P4 讀成偷取的那個訊號——這一支不需要它）。
     ★落點 anchor＝`foe`★：`ABILITIES.hauntSteal` 是「三拍結束時**敗方**另 −1 壽命」⇒
     效果＝偷、對象＝敵方單一。真值表提案寫在 `p4-truth-yinqi.json`，本階段未動任何真值。 */
  hauntSteal(st) {
    const { W, T0, TL, R0, LAST, RL } = yqBeat(st, 0.90);
    const C = st.colors;
    const ghosts = st.byBody(st.actor, 'haunt').length ? st.byBody(st.actor, 'haunt') : st.actor;
    const ghost = ghosts[0];
    const hair = ['HairA', 'HairB', 'HairC', 'HairD', 'HairE'];
    /* 挑「身上還放得下一件分得出來的道具」的那一尊（`foe` 這一格要求主道具**決定性地**歸屬到一尊，
       而且那一尊要真的有受擊反應）；量在**胸口**的高度上，因為簪就戳在那裡。 */
    const prey = yqRoomy(st, st.target, st.target.length ? st.worldOf(st.target[0], 'Chest', _a).y : 0);
    // k>0：髮瀑揚起（蓄勢）；k<0：面紗垂落、雙臂前伸（＝本體動作「垂」）
    const pose = (g, k) => {
      hair.forEach((h, i) => st.rot(g, h, -0.9 * k * (0.6 + 0.1 * i), 0, (i % 2 ? 1 : -1) * 0.35 * k));
      st.rot(g, 'VeilRoot', -0.26 * k); st.rot(g, 'Veil1', -0.34 * k); st.rot(g, 'Veil2', -0.42 * k); st.rot(g, 'VeilTip', -0.5 * k);
      st.rot(g, 'HeadRoot', 0.18 * k); st.rot(g, 'Skull', 0.10 * k); st.rot(g, 'NeckB', 0.12 * k);
      st.rot(g, 'RArmRoot1Rt', -0.7 * k, 0, -0.4 * k); st.rot(g, 'RElbow1El', -0.44 * k); st.rot(g, 'RWrist1Wr', -0.26 * k);
      st.rot(g, 'LArmRoot1Rt', -0.7 * k, 0, 0.4 * k); st.rot(g, 'LElbow1El', -0.44 * k); st.rot(g, 'LWrist1Wr', -0.26 * k);
      st.move(g, 0, 0.14 * Math.max(0, k), 0);
    };

    // ── 甲 銀簪：從髮間飛出、戳進胸口 ──
    const from = st.worldOf(ghost, 'RHand1Ha', new THREE.Vector3()); from.y += 0.12; from.add(st.camOff(0.6));
    const chest0 = prey ? st.worldOf(prey, 'Chest', new THREE.Vector3()) : from.clone();
    const to = chest0.clone();
    const aim = chest0.clone().add(st.camOff(0.6)); // 飛行段瞄胸口中心；落點才夾（量測位置不同，見 yqFly 的 JSDoc）
    /** 落點：先夾進那一尊自己的佔地（`st.bodySpot`＝判定端同一支掃描），再**往胸口收一半**。
     *  ★為什麼要收★（看圖第 1 輪）：`bodySpot` 挑的是「離場上其他每一尊最遠」的那一點，
     *  也就是那一尊佔地的**外角**——判定上 `wd=0`（仍在佔地裡）沒錯，但畫面上是「桌面浮著一件東西」，
     *  而讀者看到的「簪戳在誰身上」正是這件事（`02 §6.1` 第 5 條：量測位置要與現象同一件事）。
     *  往胸口收只會讓 `dWant` 更小、`dOther` 更大 ⇒ **不是放寬判準，是往嚴的方向走**。 */
    const land = () => {
      if (!prey) return;
      st.worldOf(prey, 'Chest', chest0);
      to.copy(chest0);
      st.bodySpot(prey, to);
      to.lerp(chest0, 0.5);
      to.y = chest0.y;
      to.add(st.camOff(0.4)); // 往鏡頭推一點，免得半截埋進紙紮本體裡（MAT_SOLID 開 depthTest）
    };
    land();
    const pin = st.paperStamp(st.kind, from, { anchor: 'foe', main: true, role: 'stamp',
      color: C.key, inkColor: C.ink, opacity: 0, depth: 0.22, warp: 0.16, tiltDeg: 12, yawDeg: -26,
      /* `roll` 讓簪身**順著飛行方向躺平**（看圖第 2 輪：立著飛時那顆簪首被 bloom 吹成一團白，
         整支讀起來是棒槌不是針）。每一跳 `yqFly` 再加 0.38，衝擊拍時剛好回到斜插的角度。 */
      roll: -2.0 });
    /** 飛行段的尺寸：§A3 的世界包圍盒 ratio 實測 0.65（figH 1.35），在 2/3 之內。
     *  ★衝擊拍之後縮小★（看圖第 1 輪）：戳進胸口那一枚要讀成「簪」，而 0.95 倍在 780×360 上
     *  是一支比受招方還粗的棒槌。L3 凍在 travel 中點，所以縮小不影響 P3。 */
    const PIN_FLY = st.iconSize * 0.95, PIN_STUCK = st.iconSize * 0.50;
    pin.scale.setScalar(PIN_FLY);

    // ── 丙 命火：衝擊拍從**被偷的那一尊胸口**脫離（InstancedMesh ＝ 1 個 draw call）──
    /* ★只往上與橫向散，`z` 恆為 0★：`x` 走 `st.sideDir`（與對決軸正交，投影恆為 0），
       所以怎麼散都不會回流我方（§A9-6）。逐實例位移一律走 `st.stageVec`（唯一出口）。 */
    const EM = 3;
    const embers = st.paperProps(st.kind, EM, { color: C.hot, opacity: 0, k: 1.1, ratio: 0.62, depth: 0.18, warp: 0.16 });
    if (prey) { st.worldOf(prey, 'Chest', embers.obj.position); embers.obj.position.add(st.camOff(0.6)); }
    const _e = new THREE.Euler();
    const eseed = [];
    for (let i = 0; i < EM; i++) eseed.push({ s: (i - 1) * 0.26 + (st.rnd() - 0.5) * 0.12, up: 0.14 + 0.20 * st.rnd(), fz: 0.06 + 0.14 * st.rnd(), rz: st.rnd() * 3 });
    const EM_STEP = [0.34, 0.70, 1];
    const writeEmbers = (k) => {
      for (let i = 0; i < EM; i++) {
        const s = eseed[i], it = embers.items[i];
        /* `z` 只准 **≥0**（往敵方那一側飄）：它讓回流斷言**真的被行使到**（`absMax > 0`），
           而不是靠「根本沒動」拿到空真的綠燈（祖靈批覆審 r5 §5.2 點名的那一種假綠）。 */
        st.stageVec(s.s * (0.6 + k), s.up * k, s.fz * k, it.p);
        it.q.setFromEuler(_e.set(0, 0, s.rz + k));
        it.s = k <= 0 ? 0 : 1;
      }
      embers.write();
    };
    writeEmbers(0);

    // 腳下不規則暗斑：蓄勢就亮、衝擊拍熄（亮滅的時間軸寫在積木裡，編舞給不出第二份）
    st.groundMark(ghost, { r: 0.44, rot: 1.25, push: 0.16, peak: 0.68 });

    /* ① 髮瀑揚起（windup）：兩跳到底，然後**完全靜止一拍**（§B3）。 */
    st.phase('windup');
    st.tween({ ms: W, ease: 'linear',
      update(t, e) {
        const k = COIL(e);
        st.stance(ghost, '舉臂', k); // §A9：施招者專屬姿態（走 w.sta 獨立通道，不動因果三段的量測）
        ghosts.forEach((g, i) => pose(g, 0.92 * k * (i ? 0.82 : 1)));
        ghosts.forEach((g) => st.rim(g, 1 + 0.5 * k));
        st.alpha(pin, k >= 1 ? 1 : (k >= 0.72 ? 0.55 : 0));
        pin.position.copy(from); pin.position.y += 0.10 * k;
      },
      done() { st.phase('travel'); } });

    /* ② 垂（travel）：面紗與髮瀑落下、雙臂前伸。飛行段只走前兩階，第三階由 `yqFly` 的 `done()` 給。 */
    st.tween({ ms: TL, delay: T0, ease: 'linear',
      update(t, e) {
        const j = JOLT[e < 0.40 ? 0 : 1];
        ghosts.forEach((g, i) => pose(g, (0.92 - 1.70 * j) * (i ? 0.82 : 1)));
        ghosts.forEach((g) => st.rim(g, 1.5 + 0.9 * j));
      },
      done() { // 第三階：一格到位，與衝擊拍同幀（不補間）
        ghosts.forEach((g, i) => pose(g, -0.78 * (i ? 0.82 : 1)));
        ghosts.forEach((g) => st.rim(g, 2.4));
      } });

    yqFly(st, pin, from, aim, to, { T0, TL }, { bow: st.camOff(1.8), rise: 0.20, roll: 0.38,
      pre() { land(); }, // 衝擊拍那一幀用**當下**的站位重挑一次（編舞是在 t=0 排的）
      done() {
        /* ★衝擊拍：四件同一拍★ ①雙臂前伸到位 ②簪戳中（落點一格到位）③命火脫離胸口 ④目標同幀被拖。 */
        pin.scale.setScalar(PIN_STUCK);
        st.phase('react');
        st.burst(to, { power: 0.58, n: 28, color: C.hot });
        st.punch(0.32);
        st.alpha(embers.obj, 0.95);
        writeEmbers(EM_STEP[0]);
        /* ★黏著延後到衝擊拍**之後**（階段 A 覆審 C1，CRITICAL）★：`st.stick` 會把道具瞬移到
           那一尊身上，同幀呼叫就會讓 anchor 與「簪有沒有真的飛」脫鉤。用 12ms 空 tween 而不是
           `st.at`（後者會把 `TFX.atReserve × run.k` 也算進 horizon ⇒ 短版 `rateOK` 判紅）。 */
        if (prey) st.tween({ ms: 12, ease: 'linear', update() {}, done() {
          const c = st.worldOf(prey, 'Chest', new THREE.Vector3());
          st.stick(pin, prey, { at: 'chest', off: to.clone().sub(c) });
        } });
      } });
    // 命火：衝擊拍當幀出現（上面的 done），之後再走兩階——三階都是離散的，沒有 easing
    st.tween({ ms: RL * 0.72, delay: R0, ease: 'linear', update(t) { writeEmbers(EM_STEP[Math.min(2, Math.floor(t * 3))]); } });
    st.fade(embers.obj, { ms: RL * 0.34, delay: R0 + RL * 0.62, from: 0.95, to: 0 });

    /* ③ 被拖（react）：往出招方半步，**四個離散台階**，階與階之間一動都不動（§B3 禁平滑補間）。
       `PHASE_GATE.react` 量的是 `move`／`scale` delta，所以這條位移就是反應本身。 */
    const DRAG = [0.10, 0.22, 0.17, 0];
    if (prey) {
      const pull = st.toward(prey, new THREE.Vector3()); // prey 朝出招方＝被拖過去的方向
      st.tween({ ms: RL, delay: R0, ease: 'linear', update(t) {
        const n = Math.min(3, Math.floor(t * 4));
        st.move(prey, pull.x * DRAG[n], 0, pull.z * DRAG[n]);
        st.rim(prey, 1 + 1.5 * (n < 3 ? 1 : 0));
      } });
    }
    /* 收勢：髮落回。★也是卡頓三階★（§B3／§10.7 陰氣禁「平滑補間的位移」）。
       施招姿態的收回不寫在這裡：由 `st.stance` 註冊的包絡自己收在衝擊拍上。 */
    const SETTLE = [0.55, 0.22, 0];
    st.tween({ ms: LAST - R0, delay: R0, ease: 'linear', update(t) {
      const k = SETTLE[Math.min(2, Math.floor(t * 3))];
      ghosts.forEach((g, i) => pose(g, -0.78 * k * (i ? 0.82 : 1)));
      ghosts.forEach((g) => st.rim(g, 1 + 1.4 * k));
    } });
  },

  /* 魔神仔紅帽・迷途（redhat，作祟×4）：三拍對面 1 隊不出手（對精英無效）。
     ★2026-09-13 招式演出卷・陰氣系批 3 階段 A（**陰氣範本招**，計畫 §7.2 Q1）★
     語彙：`2026-09-12-fx-vocab-draft.md` §C3 第 1 列＋§B3＋§A9；
     `MOVE_SPEC.hauntLost = { 甲, 探, 轉, stance:'前傾', anchor:'foe' }`。

     ★為什麼它是範本★（語彙檔 §D 批 3）：現況是全系最差的一支（失敗類型 E＝因果斷裂，
     沒有任何飛行物、只有原地繞圈的 0.052 小球，兩位讀者短版都認不出）。它一次定死陰氣三件事：
       ① **卡頓三段跳＋出招前一拍完全靜止**怎麼在 t1 的 104ms 蓄勢窗裡演得出來（`COIL`／`JOLT`）；
       ② **「轉」**這個全系獨有的受招反應；
       ③ **「那一點刺眼的紅」只准落在一件道具上**——本招就是那頂帽子。

     三件（計畫 §3）：
       **本體動作＝探**：`HatRoot`／`Hat1`／`HatTip` 帽尖後仰（兩跳到底）→**完全靜止一拍**→
         猛前點（`JOLT` 三個離散位移，第三階落在衝擊拍當幀），`JawRoot`／`Jaw1`／`JawTip` 張口、`Mist*` 霧裾滯後外散。
       **道具**＝甲 人身遺物：**紅帽**（`hat`，`st.paperStamp` 實體——面板 `hot #ff2f3a`＝
         §B3「那一點刺眼的紅」，`ink` 近黑本體露出來的那一圈就是外描邊）從施招者**頭上飄起**
         （§10.2 第 6 條：GLB 上那頂常駐的帽子不算新增元素，要另外飄一頂出來），
         **卡頓跳到受招方頭上戴住**；＋丙 鬼火與魂片：衝擊拍從被迷那尊身上散出的**魂片**
         （`st.paperProps`，冷屍白青，1 個 draw call）。
       **受招方反應＝轉**：`st.spin` 原地打轉，**六個離散角度、階與階之間完全不動**（§B3 禁平滑補間）
         ＋迷途晃（只有 spin 不算反應，`PHASE_GATE.react` 量的是 `move`／`scale` delta）。

     ★身分可辨（§A9）★
       ① 施招姿態＝**前傾**（fore）≠ react「轉」（spin），而且姿態也走卡頓、在靜止那一拍一起凍住；
       ② 腳下語彙＝**不規則暗斑／水漬**（`st.groundMark` → `st.stain`，陰氣專屬；
          `ring`／`disc` 在本系退役）。亮滅由積木自己排：蓄勢就亮、**衝擊拍熄**。
       ③ **不得有跨場拖線**（`trail: false`）：§A9-3 的拖尾只給打擊類，而本招是**詛咒削弱**；
          「中間看不到飛行物」那個病由帽子**本身**的位移修，不是再拉一條白線（那是 27 支裡最泛濫的語彙）。
     ★落點 anchor＝`foe`★：`ABILITIES.hauntLost` 是「對面 **1 隊**不出手（對精英無效）」⇒
       效果＝詛咒削弱、對象＝**敵方單一**。所以帽子只有一頂、只戴到一尊頭上，
       而且挑的是 `st.spotRoom` 最大的那一尊（落在兩尊中間就是讀者分不出是誰的那種紅）。
       ★真值表本身不在本階段動★（P4 照裁定要到陰氣批鋪完才跑），依據寫在報告 §1。
     ★tier 1／2／3 共用這一支★：所有時點都從 `st.beat` 換算，不另寫短版分岔。 */
  hauntLost(st) {
    const { W, T0, TL, R0, LAST, RL } = yqBeat(st, 0.90);
    const C = st.colors;
    const ghosts = st.byBody(st.actor, 'haunt').length ? st.byBody(st.actor, 'haunt') : st.actor;
    const ghost = ghosts[0];
    /* 「對精英無效」⇒ 先排掉精英；再從剩下的挑 `st.spotRoom` 最大的那一尊——
       挑「最近的」會挑到與同伴疊在一起的那一隻，帽子戴上去仍然分不出是誰的（§A9-5 的 `attr`）。 */
    const pool = st.target.filter((f) => !(f.unit && f.unit.body === 'elite'));
    const foes = pool.length ? pool : st.target;
    /* ★挑「站得開」的那一尊，而且在**帽子要落的那個高度**上量（同虎爺印覆審 r3 R-2 的作法）★
       v0.55.9 起 `foe` 這一格要求 `attMain && hurtHit`：主道具的落點必須**決定性地**歸屬到一尊，
       而且那一尊就是真的有受擊反應的那一尊。治具棚四尊敵方前後兩排互相重疊，挑到被夾在中間的
       那一隻時，牠身上沒有任何一點離其他每一尊 ≥ `ANCHOR_MARGIN` ⇒ 帽子戴得再準也判紅。
       `st.spotRoom` 與判定端的 `sepOf` 是同一支掃描。 */
    let lost = foes[0] || null;
    if (foes.length > 1) {
      const roomOf = (f) => st.spotRoom(f, st.top(f, new THREE.Vector3()).y);
      let best = -Infinity;
      foes.forEach((f) => { const r = roomOf(f); if (r > best) { best = r; lost = f; } });
    }
    const fwd = st.toward(ghost, new THREE.Vector3());
    // k<0：帽尖後仰蓄勢；k>0：帽尖往前一點（幅度沿用 0.54，時間軸整支重排到 §A1 的三拍窗上）
    const point = (g, k) => {
      const open = Math.max(0, k);
      st.rot(g, 'HatRoot', 0.44 * k, 0.26 * k, 0);
      st.rot(g, 'Hat1', 0.36 * k, 0.32 * k, 0);
      st.rot(g, 'HatTip', 0.48 * k, 0.42 * k, 0);
      st.rot(g, 'NeckB', 0.12 * k); st.rot(g, 'Neck2', 0.14 * k);
      st.rot(g, 'HeadRoot', 0.24 * k, 0.20 * k, 0); st.rot(g, 'Skull', 0.12 * k);
      st.rot(g, 'JawRoot', 0.30 * open); st.rot(g, 'Jaw1', 0.26 * open); st.rot(g, 'JawTip', 0.22 * open);
      st.rot(g, 'MistRoot', -0.18 * k, 0.30 * k, 0);
      st.rot(g, 'Mist1', -0.22 * k, 0.36 * k, 0);
      st.rot(g, 'Mist2', -0.24 * k, 0.40 * k, 0);
      st.rot(g, 'MistTip', -0.28 * k, 0.46 * k, 0);
      st.rot(g, 'RArmRoot1Rt', -0.55 * k, 0, -0.28 * k); st.rot(g, 'RElbow1El', -0.42 * k); st.rot(g, 'RWrist1Wr', -0.26 * k);
      st.rot(g, 'LArmRoot1Rt', -0.28 * k, 0, 0.20 * k); st.rot(g, 'LElbow1El', -0.20 * k);
    };

    // ── 甲 紅帽：hot 面板（全招唯一的那一點刺眼的紅）＋ ink 本體露出來的那一圈＝外描邊 ──
    const from = st.top(ghost, new THREE.Vector3()); from.y += 0.16; from.add(st.camOff(0.5));
    const to = lost ? st.top(lost, new THREE.Vector3()) : from.clone();
    if (lost) { to.y += 0.10; to.add(st.camOff(0.5)); }
    /* ★飛行段瞄頭頂中心（`aim`），**落點**才由 `st.bodySpot` 夾（`to`）★
       兩者分開的理由是量測位置不同：anchor 凍在**衝擊拍**，要的是「決定性地落在那一尊身上」
       ⇒ 非夾不可（不夾則 `attMain=false`）；而 L3 凍在 **travel 中點**，那一格要的是螢幕面積。
       第一版兩者共用夾過的點，整條飛行路徑跟著偏掉，P3 由 1.022% 掉到 **0.7109%**（門檻 0.8）。
       ★沒有動門檻★：動的是「哪一段用哪一個點」。 */
    const aim = to.clone();
    if (lost) st.bodySpot(lost, to);
    const hat = st.paperStamp(st.kind, from, { anchor: 'foe', main: true, role: 'stamp',
      color: C.hot, inkColor: C.ink, opacity: 0, depth: 0.22, warp: 0.16, tiltDeg: 10, yawDeg: -20 });
    hat.scale.setScalar(st.iconSize * 0.55);
    /* ★飛行途中往鏡頭鼓出一道弧（同獻祭刀／香灰符的作法）★：兩端 `sin=0` ⇒ **起點與落點一個位元組不變**
       （衝擊拍的 anchor 量測看到的仍是頭頂那一點）。它買的是 **P3 的螢幕面積**：L3 凍在 travel 中點，
       那一刻把帽子拉近鏡頭，面積上得去而**世界尺寸不動**——比放大道具便宜（§A3 的 2/3 上限是世界包圍盒）。 */
    const bow = st.camOff(2.6);

    // ── 丙 魂片：衝擊拍從被迷那尊身上散出來（InstancedMesh ＝ 1 個 draw call）──
    /* ★落點是**胸口**不是頭頂（第 1 輪看圖修）★：第一版生在 `to`（＝頭上那頂帽子的位置），
       白青的魂片在 react 末整片蓋住紅帽，sheet 第 6 格看不到「戴著帽子」這件事——
       而「戴住」正是這一招的身分。單片也從 0.62 放大到 1.0：0.62 在 780×360 上只有幾個像素寬，
       讀起來就是盲讀抱怨過的「白色細點」，不是紙片。 */
    const SH = 4;
    /* `depth 0.18`／`warp 0.16` 是 §A4 第 1／3 條的區間（0.18–0.26／0.08–0.18）；
       第一版寫 0.12／0.22 兩項都在區間外（覆審 H6-3，那兩個區間目前沒有機械檢查）。
       ★單件小道具不做面板墨線邊★是 `st.paperProps` 明文的規格例外（該積木的 JSDoc），
       所以 §B3 對丙家族「冷屍白青＋ink 外描邊」在這一件上由**帽子**那一件承擔——照實記在報告。 */
    const shards = st.paperProps(st.kind, SH, { anchor: 'foe', color: C.key, opacity: 0, k: 1, ratio: 0.66, depth: 0.18, warp: 0.16 });
    if (lost) { st.worldOf(lost, 'Chest', shards.obj.position); shards.obj.position.add(st.camOff(0.5)); }
    const _e = new THREE.Euler();
    const seeds = [];
    for (let i = 0; i < SH; i++) {
      seeds.push({ a: (st.rnd() - 0.5) * 1.2 + i * 1.57, r: 0.26 + 0.20 * st.rnd(), up: -0.02 + 0.16 * st.rnd(), rz: st.rnd() * 3 });
    }
    /** 魂片的散開也是**三階**（覆審 H6-1：`ease:'out'` 的連續內插是陰氣的禁區「平滑補間的位移」）。 */
    const SHARD_STEP = [0.38, 0.72, 1];
    /* ★逐實例位移一律走 `st.stageVec`（v0.55.9 覆審 r5 HIGH-A）★
       `it.p` 是容器的**局部**座標，而容器沒有旋轉 ⇒ 局部就是世界；舞台卻是相機相對的
       （`st.dir` 隨座位轉）。第一版直接寫進局部 xyz（cos·r／up／sin·r）＝把橫向釘在世界 X／Z 上，
       它與「我→敵」的夾角由座位決定——虎爺印的爪痕就是這樣在六個真實 `duelYaw` 裡有五個回流。
       ★這幾行刻意不寫出那個方法名★：掃描是逐行字串比對，註解裡出現同一個字面值就會被判紅
       （這一條本身就是那個坑的實例，第一版的註解真的紅過一次）。
       ★`z` 分量夾在 ≥0★：`x` 走 `st.sideDir`（與對決軸正交，投影恆為 0，怎麼散都不回流）、
       `z` 只准往敵方那一側散。本招是打擊類（`anchor: 'foe'`）⇒ 衝擊拍之後回流我方就判紅。 */
    const writeShards = (k) => {
      for (let i = 0; i < SH; i++) {
        const s = seeds[i], it = shards.items[i];
        st.stageVec(Math.cos(s.a) * s.r * k, s.up * k, Math.max(0, Math.sin(s.a)) * s.r * 0.45 * k, it.p);
        it.q.setFromEuler(_e.set(0, s.a, s.rz));
        it.s = k <= 0 ? 0 : 1;
      }
      shards.write();
    };
    writeShards(0);

    // 腳下不規則暗斑／水漬：蓄勢就亮、衝擊拍熄（亮滅的時間軸寫在積木裡，編舞給不出第二份）
    st.groundMark(ghost, { r: 0.46, rot: 0.62, push: 0.18, peak: 0.70 });

    /* ① 帽尖後仰（windup）：**兩跳到底，然後完全靜止一拍**（§B3 陰氣節奏）。
       `COIL(e)` 在 e≥0.42 之後不再變 ⇒ tween 還在跑，畫面上一動都不動——
       那一拍的靜止就是「出招前一拍完全靜止」，不是靠另外排一段空 tween。 */
    st.phase('windup');
    st.tween({ ms: W, ease: 'linear',
      update(t, e) {
        const k = COIL(e);
        st.stance(ghost, '前傾', k); // §A9：施招者專屬姿態（走 w.sta 獨立通道，不動因果三段的量測）
        point(ghost, -0.62 * k);
        st.rim(ghost, 1 + 0.6 * k);
        // 紅帽從他頭上飄起來：跟著同一組台階一格到位（不補間）
        st.alpha(hat, k >= 1 ? 1 : (k >= 0.72 ? 0.6 : 0));
        hat.position.copy(from); hat.position.y += 0.12 * k;
        hat.scale.setScalar(st.iconSize * (0.55 + 0.33 * k));
      },
      done() { st.phase('travel'); } });

    /* ② 探（travel）：帽尖猛前點。
       ★飛行段只走**前兩階**，第三階（到位）寫在 `done()` 裡（覆審 H9）★
       §A1 的衝擊拍是 `react` 的**起點那一瞬間**；舊版第三階切在 `0.86 × TL`，t2 下距衝擊拍
       36.4ms＝**2.2 幀**——那正是 §A2 說的「兩個重音」。改成由 `done()` 給那一格之後，
       本體到位／道具落點／魂片散出／受招反應四件都落在 `react[0]` 當幀。
       ★四尊一起演（覆審 H7）★：`redhat` 是 `count: 4`，轉正的第一版只動 `ghosts[0]`，
       滿編下另外三尊全程不動（基準版是四尊錯開）。姿態／腳下光／道具仍然**只給 `ghost`**
       ——那是身分訊號，多一份就失效（`st.stance`／`st.groundMark` 會當場 throw）。 */
    st.tween({ ms: TL, delay: T0, ease: 'linear',
      update(t, e) {
        const j = JOLT[e < 0.40 ? 0 : 1];
        ghosts.forEach((g, i) => point(g, -0.62 + 1.58 * j * (i ? 0.82 : 1)));
        st.move(ghost, fwd.x * 0.13 * j, 0, fwd.z * 0.13 * j);
        ghosts.forEach((g) => st.rim(g, 1.6 + 1.0 * j));
      },
      done() { // 第三階：一格到位，與衝擊拍同幀（不補間）
        ghosts.forEach((g, i) => point(g, 0.96 * (i ? 0.82 : 1)));
        st.move(ghost, fwd.x * 0.13, 0, fwd.z * 0.13);
        ghosts.forEach((g) => st.rim(g, 2.6));
      } });
    /* 紅帽卡頓跳到受招方頭上。**`trail: false`**：詛咒招不拉跨場白線（§A9-3）。
       每一跳轉一格 `rotateZ`，跳與跳之間完全不轉——朝向仍然凍在 spawn 當下那一顆四元數上疊轉，
       不是逐幀正對鏡頭（§A4 第 4 條）。 */
    /* ★三階卡頓的飛行整段收進 `yqFly`（2026-09-13 階段 B）★：那一段同時承載衝擊拍、落點與
       P3 面積三件事，其餘 8 支照抄就是 9 份複製品。鼓弧為什麼只掛在第二階前段、`aim` 與 `to`
       為什麼要分開，理由全在 `yqFly` 的 JSDoc（唯一落點）。本支的參數與收斂前逐位相同
       （`bow = camOff(2.6)`／`rise 0.24`／`roll 0.44`／`trail:false`），`--sigdump` 逐位元組相等。 */
    yqFly(st, hat, from, aim, to, { T0, TL }, { bow, rise: 0.24,
      /* 衝擊拍那一幀用**當下**的站位再夾一次（編舞是在 t=0 排的，那時受招方還沒動）。 */
      pre() { if (lost) st.bodySpot(lost, to); },
      done() {
        /* ★衝擊拍（`react[0]`）：四件同一拍★ ①本體到位（上面那條 tween 的 done）
           ②帽子第三階一格到位（`yqFly` 的 `done` 已經把它放到 `to`）③魂片散出
           ④那一尊同幀開始打轉（下面的 react tween，delay R0）。
           ★帽子的落點由**它自己的位移**給，不是由黏著給★（覆審 C1）。 */
        st.phase('react');
        st.burst(to, { power: 0.62, n: 30, color: C.hot });
        st.punch(0.34);
        st.alpha(shards.obj, 0.95);
        writeShards(SHARD_STEP[0]);
        /* ★黏著**延後**到衝擊拍之後（覆審 C1，CRITICAL）★
           `sampleAnchors` 的時點寫死在 `react[0]`，而 `st.stick` 會把道具**瞬移**到那一尊身上
           ——在同一幀呼叫它，`mainOK`／`mainD`／`gap` 就與「帽子有沒有飛」脫鉤：
           覆審實測把飛行整段拿掉（突變 M10），anchor 的每一格與健康態**逐字相同**。
           延後一格之後，衝擊拍量到的是帽子自己飛到的位置；黏著只負責「之後跟著頭走」。
           ★引擎側那條更根本的洞仍在★：`regAnchor` 對沒有 `o.anchor` 的 `st.stick` 直接 return，
           所以引擎不知道一件 land 型主道具後來被黏上去了——那要改 `sampleAnchors`，
           本階段依派工書不碰（另一個分支在修），照實記在報告 §1.4／§1.7。 */
        /* ★用短 tween 而不是 `st.at`★：`st.at` 會把 `TFX.atReserve × run.k` 也算進 horizon
           （t1 實測 horizon 208+12+72 = 282 > `LAST` 270 ⇒ `maxRate 1.12`、`rateOK` 判紅）。
           一條 12ms 的空 tween 只把 horizon 推到 `R0+12`，短版照樣原生塞得進去。 */
        if (lost) st.tween({ ms: 12, ease: 'linear', update() {}, done() {
          const top = st.top(lost, new THREE.Vector3());
          st.stick(hat, lost, { at: 'top', off: to.clone().sub(top) });
        } });
      } });
    // 魂片：衝擊拍當幀出現（上面的 done），之後再走兩階散開——三階都是離散的，沒有 easing
    st.tween({ ms: RL * 0.75, delay: R0, ease: 'linear', update(t) { writeShards(SHARD_STEP[Math.min(2, Math.floor(t * 3))]); } });
    st.fade(shards.obj, { ms: RL * 0.3, delay: R0 + RL * 0.66, from: 0.95, to: 0 });

    /* ③ 迷途（react）：原地打轉＝陰氣獨有的受招反應「轉」。
       **六個離散角度**（`TURN`），階與階之間一動都不動＝卡頓不補間；
       `SWAY` 是踉蹌位移——只有 spin 不算反應（`PHASE_GATE.react` 量 `move`／`scale` delta），
       而且迷路的人本來就會走歪。兩張表都以 0 收尾，收勢不另排一段。 */
    const TURN = [0.95, 2.05, 3.15, 2.30, 0.80, 0];
    const SWAY = [0.095, -0.075, 0.085, -0.055, 0.030, 0];
    let turned = -1;
    if (lost) {
      const sway = st.toward(lost, new THREE.Vector3());
      st.tween({ ms: RL, delay: R0, ease: 'linear', update(t) {
        const n = Math.min(5, Math.floor(t * 6));
        if (n !== turned) { turned = n; hat.rotateZ(0.26); } // 頭上那頂帽子跟著一格一格歪
        st.spin(lost, 0, TURN[n], 0);
        st.move(lost, sway.x * SWAY[n], 0, sway.z * SWAY[n]);
        st.rim(lost, 1 - 0.45 * Math.sin(Math.PI * t));
      } });
    }
    /* ★帽子**不淡出**，戴到清場為止★（看圖第 3 輪）：「戴住」本身就是「三拍不出手」的證據，
       它必須活過 sheet 的第 6 格（react 末＝`react[1]` 內縮 15%）。
       試過兩版都不行：`R0+0.6RL／0.34RL` 在 t2 的第 6 格剩 0.79、`R0+0.84RL／0.16RL` 在 **t1** 剩 0.29
       ——t1 的 `RL` 只有 **62ms**，任何落在 `RL` 裡的淡出都會吃掉那一格。
       所以這裡不排淡出：`traitFx` 收工時本來就會把這一招 spawn 的 mesh 全部移除
       （`restored` 那一格量的就是這件事），少一條 tween 也讓 horizon 仍然收在 `LAST`。 */
    /* 收勢：帽尖落回。★也是卡頓三階★（覆審 H6-1：舊版 `k = 0.96 × (1 − min(1, t×1.35))` 是
       逐幀連續內插，t2 下是一段 185ms 的**平滑位移**——那是 §B3／§10.7 陰氣的禁區。）
       施招姿態的收回不寫在這裡：由 `st.stance` 註冊的包絡自己收在衝擊拍上（祖靈批覆審 H3）。 */
    const SETTLE = [0.62, 0.24, 0];
    st.tween({ ms: LAST - R0, delay: R0, ease: 'linear', update(t) {
      const k = SETTLE[Math.min(2, Math.floor(t * 3))];
      ghosts.forEach((g, i) => point(g, k * (i ? 0.82 : 1)));
      st.move(ghost, fwd.x * 0.13 * k, 0, fwd.z * 0.13 * k);
      ghosts.forEach((g) => st.rim(g, 1 + 1.6 * k));
    } });
  },

  /* 椅仔姑竹椅・看穿（chair，作祟×3）：本方圍毆額外 +1。
     ★2026-09-13 招式演出卷・陰氣批 3 階段 B★ 語彙＝§C3 第 3 列＋§B3＋§A9；
     `MOVE_SPEC.hauntSee = { 甲, 滯, 抖, stance:'舉臂', anchor:'allies' }`。

     三件（計畫 §3）：
       **本體動作＝滯**（§C 的「搖」是它的變體）：`SeatRoot`／`SeatMid`／`SeatFront`／`PostA`／`PostB`
         前後搖兩下（`COIL` 兩階）→ **完全靜止一拍** → `Crest`／`NeckRoot`／`Head1`／`HeadTop`
         椅頭**突然**抬起（`JOLT` 三階，第三階落在衝擊拍當幀）。
       **道具**＝甲 人身遺物：**憑空多出一張竹椅**（`chair`，藤編厚片＋`ink` 墨線邊）從問事的那一尊
         頭頂後上方**浮出來**、卡頓跳到同伴身上坐定（主道具）；其餘每一尊我方各收到一枚**椅印**
         （`yqDeliver`）——§A9-5 的 `allies` 要求**每一尊站位上分得出來的我方都被碰到**。
       **受益方反應＝抖**：骨骼高頻小幅＋`st.move` 的四階離散抖動（`PHASE_GATE.react` 量的是
         `move`／`scale` delta，只抖骨骼量不到）。

     ★§C3 的「抖動細絲指向每一隻」沒有做（照實記）★：§A9-3（晚於 §C3）把 `st.trail`／`MAT_LINE`
     限給**打擊類**——增益招拉一條細白線過去，P4 第 2／3 輪實測被讀成「偷取」。
     「看穿」的因果改由**椅子自己飛過去坐到同伴身上**承擔，那也是 §A9-3 對增益招指定的動作
     （升起 → 落到受益方，不跨中線、不從敵方出發）。

     ★身分可辨（§A9）★ 施招姿態＝**舉臂**（up）≠ react「抖」（shake）；腳下＝不規則暗斑。
     ★落點 anchor＝`allies`★：`ABILITIES.hauntSee` 是「**本方**圍毆額外 +1」⇒ 效果＝護、對象＝我方多個
     （含施招者本人——§A9-2 的例外照祖靈批階段 A 簽字裁定③：真值包含施招者時他可以有受益反應）。 */
  hauntSee(st) {
    const { W, T0, TL, R0, LAST, RL } = yqBeat(st, 0.90);
    const C = st.colors;
    const chairs = st.actor;
    const seer = chairs[0];
    const mates = chairs.filter((c) => c !== seer);
    // 問事的前後搖（`s` 正負＝椅身前後）
    const rock = (c, s) => {
      st.rot(c, 'SeatRoot', 0.30 * s); st.rot(c, 'SeatMid', 0.17 * s); st.rot(c, 'SeatFront', 0.23 * s);
      st.rot(c, 'PostA', 0.21 * s); st.rot(c, 'PostB', 0.21 * s);
      st.rot(c, 'Waist', -0.14 * s);
    };
    // 椅頭抬起（`k` 0→1）
    const lift = (c, k) => {
      st.rot(c, 'NeckRoot', -0.52 * k); st.rot(c, 'Head1', -0.38 * k); st.rot(c, 'HeadTop', -0.30 * k);
      st.rot(c, 'Crest', -0.26 * k); st.rot(c, 'Yoke', -0.16 * k); st.rot(c, 'Chest', -0.13 * k);
    };
    /* ★搖也是卡頓的★：兩個離散角度，第三階與第二階相同 ⇒ tween 還在跑、畫面上一動都不動，
       那一拍的靜止就是 §B3 的「出招前一拍完全靜止」（同 `COIL` 的寫法，不另排空 tween）。 */
    const ROCK = [0.60, -0.88, -0.88];

    /* 道具從**頭頂後上方**浮出來：§A9-3 對增益招的兩條通則是「落點在受益方身上、飛行路徑不跨中線、
       不從敵方出發」，而起點拉高又往 `-st.dir` 退一段還有第二個作用——`PHASE_GATE.travel` 要求
       spawn 物真的走 ≥40% 的「我到敵」距離，起點貼著受益方就湊不出那一段（香火批 1 的實測解法）。 */
    /* ★後退量的上界是「還在畫面上」（看圖第 1／2 輪）★：第一版 `y+=0.66／-0.92` 把椅子切在畫面
       上緣外、第二版 `-1.15` 切在左緣外。缺的那一段位移改由飛行途中的抬高（`yqFly` 的 `rise`）補
       ——`PHASE_GATE.travel` 量的是「離起點最遠曾經到過多少」，抬高一樣算數，
       而抬高只發生在第二階，不影響蓄勢那兩格。 */
    const from = yqLaunch(st, st.top(seer, new THREE.Vector3()), [1.15, 0.95, 0.78, 0.60], 0.26, 0.40);
    const host = mates.length ? yqRoomy(st, mates, st.worldOf(mates[0], 'Chest', _a).y) : seer;
    const chest0 = st.worldOf(host, 'Chest', new THREE.Vector3());
    const to = chest0.clone();
    const aim = chest0.clone().add(st.camOff(0.6));
    const land = () => {
      st.worldOf(host, 'Chest', chest0);
      to.copy(chest0);
      st.bodySpot(host, to);
      to.lerp(chest0, 0.45); // 往胸口收：留在佔地裡（dW 仍是 0），但讀起來是「坐到他身上」不是「浮在桌上」
      to.y = chest0.y;
      to.add(st.camOff(0.5));
    };
    land();
    const chair = st.paperStamp(st.kind, from, { anchor: 'allies', main: true, role: 'stamp',
      color: C.key, inkColor: C.ink, opacity: 0, depth: 0.24, warp: 0.12, tiltDeg: 8, yawDeg: -22 });
    chair.scale.setScalar(st.iconSize * 0.90); // §A3：世界包圍盒 ratio 實測 0.64（figH 1.39），在 2/3 之內
    // 其餘每一尊我方各收一枚椅印（逐尊覆蓋；不 stagger，全部落在同一個衝擊拍）
    yqDeliver(st, from, chairs.filter((c) => c !== host), { T0, TL }, { anchor: 'allies', k: 1.3, bowK: 1.2, rise: 0.70, roll: 0 }); // k 1.3＝0.39，與主道具 0.396 同一級（祖靈批 P4 r3 (a)：副件不得比主道具小太多）

    // 腳下不規則暗斑：蓄勢就亮、衝擊拍熄（亮滅的時間軸寫在積木裡）
    st.groundMark(seer, { r: 0.46, rot: 2.1, push: 0.16, peak: 0.70 });

    /* ① 問事（windup）：前後搖兩下 → 完全靜止一拍。 */
    st.phase('windup');
    st.tween({ ms: W, ease: 'linear',
      update(t, e) {
        const n = COILN(e), k = COIL(e);
        st.stance(seer, '舉臂', k); // §A9：施招者專屬姿態
        chairs.forEach((c, i) => rock(c, ROCK[n] * (i ? 0.78 : 1)));
        chairs.forEach((c) => st.rim(c, 1 + 0.5 * k));
        // 椅子從他頭頂後上方浮出來：一格到位（不補間）
        st.alpha(chair, k >= 1 ? 1 : (k >= 0.72 ? 0.55 : 0));
        chair.position.copy(from); chair.position.y += 0.10 * k;
      },
      done() { st.phase('travel'); } });

    /* ② 滯（travel）：椅頭突然抬起。飛行段只走前兩階，第三階由 `yqFly` 的 `done()` 給。 */
    st.tween({ ms: TL, delay: T0, ease: 'linear',
      update(t, e) {
        const j = JOLT[e < 0.40 ? 0 : 1];
        chairs.forEach((c, i) => { rock(c, -0.88 * (1 - j) * (i ? 0.78 : 1)); lift(c, j * (i ? 0.78 : 1)); });
        chairs.forEach((c) => st.rim(c, 1.4 + 0.9 * j));
      },
      done() { // 第三階：一格到位，與衝擊拍同幀
        chairs.forEach((c, i) => { rock(c, 0); lift(c, i ? 0.78 : 1); });
        chairs.forEach((c) => st.rim(c, 2.3));
      } });

    /* `roll: 0`＝椅子**不翻滾**（看圖第 1 輪：轉起來的椅子剪影讀成一個「ㄈ」，不是家具）。 */
    yqFly(st, chair, from, aim, to, { T0, TL }, { bow: st.camOff(1.6), rise: 0.80, roll: 0,
      pre() { land(); },
      done() {
        /* ★衝擊拍：三件同一拍★ ①椅頭抬到底 ②椅子坐定在同伴身上 ③我方每一尊同幀開始抖。 */
        st.phase('react');
        st.burst(to, { power: 0.5, n: 24, color: C.key });
        st.punch(0.26);
        // 黏著延後一格（同 hauntSteal：同幀呼叫會讓 anchor 與「椅子有沒有真的飛」脫鉤）
        st.tween({ ms: 12, ease: 'linear', update() {}, done() {
          const c = st.worldOf(host, 'Chest', new THREE.Vector3());
          st.stick(chair, host, { at: 'chest', off: to.clone().sub(c) });
        } });
      } });

    /* ③ 抖（react）：**四個離散台階**的高頻小幅，階與階之間一動都不動。
       骨骼與 `st.move` 一起抖——`PHASE_GATE.react` 量的是 `move`／`scale` delta，只抖骨骼量不到。 */
    const SHAKE = [0.065, -0.055, 0.045, 0];
    st.tween({ ms: RL, delay: R0, ease: 'linear', update(t) {
      const n = Math.min(3, Math.floor(t * 4)), a = SHAKE[n];
      chairs.forEach((c, i) => {
        const side = st.stageVec((i % 2 ? 1 : -1) * a, 0, 0, _a);
        st.move(c, side.x, 0, side.z);
        st.rot(c, 'Crest', -0.26 + a * 2.2); st.rot(c, 'HeadTop', -0.30 + a * 1.8);
        st.rim(c, 1 + 1.4 * (n < 3 ? 1 : 0));
      });
    } });

    /* 收勢：椅頭落回。★也是卡頓三階★（§B3 禁平滑補間）。 */
    const SETTLE = [0.58, 0.24, 0];
    st.tween({ ms: LAST - R0, delay: R0, ease: 'linear', update(t) {
      const k = SETTLE[Math.min(2, Math.floor(t * 3))];
      chairs.forEach((c, i) => lift(c, k * (i ? 0.78 : 1)));
      chairs.forEach((c) => st.rim(c, 1 + 1.3 * k));
    } });
  },

  /* 黃色小雨衣・恐懼（raincoat，作祟×4）：三拍對面群體再 −1 atk。
     ★2026-09-13 招式演出卷・陰氣批 3 階段 B★ 語彙＝§C3 第 4 列＋§B3＋§A9；
     `MOVE_SPEC.hauntDread1 = { 乙, 滯, 壓, stance:'舉臂', anchor:'foes' }`。

     三件（計畫 §3）：
       **本體動作＝滯**：`HoodRoot`／`Hood1`／`HoodTop` 兜帽抬起（`COIL` 兩階）→ **完全靜止一拍** →
         **閃現**靠近半步（`JOLT` 三階的離散位移＝位移不補間），`Skirt1`／`Skirt2`／`SkirtTip` 滯後擺。
       **道具**＝乙 濕物：**雨滴**（`drop`）——主滴落在被淋得最重的那一尊身上（主道具），
         其餘兩尊各一滴（`yqDeliver`，§A9-5 的 `foes` 要求至少兩尊敵方被決定性地碰到），
         ＋六顆小雨滴（`st.paperProps` ＝ 1 個 draw call）從同一片天落下；
         ＋**敵方腳下的不規則水漬**（`st.stain`，衝擊拍才鋪開）。
       **受招方反應＝壓**：群體等比縮（`st.scale`）＋邊光轉冷，**四個離散台階**。

     ★兩處 `st.stain` 怎麼分（§C3 明寫的那一條）★：施招者腳下那一片是**身分訊號**
     （`st.groundMark`，蓄勢就亮、衝擊拍熄）；敵方腳下那一片是**招的效果**（直接呼叫 `st.stain`，
     衝擊拍才鋪開、比較大）。兩者在**時間上不重疊、面積與落點都不同**，
     不會讓讀者把敵方那一尊誤讀成施招者（§A9-1 的 `groundSame` 只認施招者那一片）。

     ★身分可辨（§A9）★ 施招姿態＝**舉臂**（up，兜帽抬起）≠ react「壓」（down）。
     ★落點 anchor＝`foes`★：`ABILITIES.hauntDread1` 是「三拍：**對面群體**再 −1 atk」⇒
     效果＝詛咒削弱、對象＝敵方多個。 */
  hauntDread1(st) {
    const { W, T0, TL, R0, LAST, RL } = yqBeat(st, 0.90);
    const C = st.colors;
    const coats = st.actor;
    const coat = coats[0];
    const swarm = st.byBody(st.target, 'swarm');
    const foes = swarm.length ? swarm : st.target;
    const step = coats.map((c) => st.toward(c, new THREE.Vector3()));
    const hood = (c, k) => {
      st.rot(c, 'HoodRoot', -0.46 * k); st.rot(c, 'Hood1', -0.36 * k); st.rot(c, 'HoodTop', -0.30 * k);
      st.rot(c, 'ShoulderTop', -0.16 * k); st.rot(c, 'Yoke', -0.12 * k); st.rot(c, 'Chest', -0.10 * k); st.rot(c, 'Waist', -0.07 * k);
      st.rot(c, 'MistRoot', 0.26 * k);
      st.rot(c, 'Skirt1', 0.12 * k); st.rot(c, 'Skirt2', 0.17 * k); st.rot(c, 'SkirtTip', 0.23 * k);
      st.rot(c, 'LSlvRoot1Rt', -0.30 * k, 0, 0.22 * k); st.rot(c, 'LSlvElbow1El', -0.26 * k); st.rot(c, 'LSlvCuff1Sl', -0.20 * k);
      st.rot(c, 'RSlvRoot1Rt', -0.30 * k, 0, -0.22 * k); st.rot(c, 'RSlvElbow1El', -0.26 * k); st.rot(c, 'RSlvCuff1Sl', -0.20 * k);
    };

    // ── 乙 雨滴：從施招者頭上那片天落到對面 ──
    const prey = yqRoomy(st, foes, foes.length ? st.worldOf(foes[0], 'Chest', _a).y : 0);
    const from = yqLaunch(st, st.top(coat, new THREE.Vector3()), [0.95, 0.75, 0.55, 0.35], 0.52, 0.36);
    const chest0 = prey ? st.worldOf(prey, 'Chest', new THREE.Vector3()) : from.clone();
    const to = chest0.clone();
    const aim = chest0.clone().add(st.camOff(0.6));
    const land = () => {
      if (!prey) return;
      st.worldOf(prey, 'Chest', chest0);
      to.copy(chest0);
      st.bodySpot(prey, to);
      to.lerp(chest0, 0.5); // 往胸口收：仍在佔地裡，但讀起來是「淋在他身上」不是「浮在桌上」
      to.y = chest0.y;
      to.add(st.camOff(0.4));
    };
    land();
    const drop = st.paperStamp(st.kind, from, { anchor: 'foes', main: true, role: 'stamp',
      color: C.key, inkColor: C.ink, opacity: 0, depth: 0.20, warp: 0.16, tiltDeg: 10, yawDeg: -18 });
    drop.scale.setScalar(st.iconSize * 0.90);
    // 其餘敵方各一滴（`foes` 要求至少兩尊被決定性地碰到）
    yqDeliver(st, from, foes.filter((f) => f !== prey).slice(0, 2), { T0, TL }, { anchor: 'foes', k: 1.4, bowK: 1.2, rise: 0.5 });

    /* 六顆小雨滴＝同一片天落下的群體道具（1 個 draw call）。
       ★逐實例位移走 `st.stageVec`，`z` 夾在 ≥0★：本招是打擊類（`anchor: 'foes'`），
       衝擊拍之後任何道具往我方走就判紅（§A9-6）；橫向走 `st.sideDir`，在 `st.dir` 上的投影恆為 0。 */
    const RN = 6;
    const rain = st.paperProps(st.kind, RN, { color: C.line, opacity: 0, k: 0.9, ratio: 0.5, depth: 0.18, warp: 0.16 });
    const cF = new THREE.Vector3();
    foes.forEach((f) => cF.add(st.worldOf(f, null, _a)));
    if (foes.length) cF.multiplyScalar(1 / foes.length);
    rain.obj.position.copy(cF); rain.obj.position.y += 0.34; rain.obj.position.add(st.camOff(0.5));
    const _e = new THREE.Euler();
    const rseed = [];
    for (let i = 0; i < RN; i++) rseed.push({ s: (i - 2.5) * 0.30, fz: 0.10 * st.rnd(), up: 0.62 + 0.30 * st.rnd(), rz: st.rnd() * 0.4 });
    const RAIN_STEP = [0.30, 0.68, 1];
    const writeRain = (k) => {
      for (let i = 0; i < RN; i++) {
        const s = rseed[i], it = rain.items[i];
        st.stageVec(s.s, s.up * (1 - k), s.fz * k, it.p); // 由上往下落：k 越大越低
        it.q.setFromEuler(_e.set(0, 0, s.rz));
        it.s = k <= 0 ? 0 : 1;
      }
      rain.write();
    };
    writeRain(0);

    // 施招者腳下的身分訊號：蓄勢就亮、衝擊拍熄（亮滅寫在積木裡）
    st.groundMark(coat, { r: 0.42, rot: 0.35, push: 0.16, peak: 0.66 });

    /* ① 兜帽抬起（windup）：兩階到底 → 完全靜止一拍。 */
    st.phase('windup');
    st.tween({ ms: W, ease: 'linear',
      update(t, e) {
        const k = COIL(e);
        st.stance(coat, '舉臂', k); // §A9：施招者專屬姿態
        coats.forEach((c, i) => hood(c, k * (i ? 0.8 : 1)));
        coats.forEach((c) => st.rim(c, 1 + 0.6 * k));
        st.alpha(drop, k >= 1 ? 1 : (k >= 0.72 ? 0.5 : 0));
        drop.position.copy(from); drop.position.y += 0.08 * k;
      },
      done() { st.phase('travel'); } });

    /* ② 滯（travel）：**閃現**靠近半步——位移是三個離散台階，中間沒有任何插值。 */
    st.tween({ ms: TL, delay: T0, ease: 'linear',
      update(t, e) {
        const j = JOLT[e < 0.40 ? 0 : 1];
        coats.forEach((c, i) => { const d = step[i]; st.move(c, d.x * 0.20 * j, 0, d.z * 0.20 * j); st.rim(c, 1.6 + 1.0 * j); });
      },
      done() { // 第三階：一格到位，與衝擊拍同幀
        coats.forEach((c, i) => { const d = step[i]; st.move(c, d.x * 0.20, 0, d.z * 0.20); st.rim(c, 2.6); });
      } });

    yqFly(st, drop, from, aim, to, { T0, TL }, { bow: st.camOff(1.6), rise: 0.30, roll: 0,
      pre() { land(); },
      done() {
        /* ★衝擊拍：四件同一拍★ ①閃現到位 ②主滴落到那一尊身上 ③六顆小雨滴落下＋腳下水漬鋪開
           ④對面群體同幀開始縮。 */
        st.phase('react');
        st.burst(to, { power: 0.52, n: 26, color: C.key });
        st.punch(0.28);
        st.alpha(rain.obj, 0.92);
        writeRain(RAIN_STEP[0]);
        /* ★敵方腳下的水漬＝招的**效果**，不是身分訊號★：直接呼叫 `st.stain`（不是 `st.groundMark`），
           衝擊拍才鋪開，與施招者那一片在時間上完全不重疊。 */
        const wet = st.stain(cF, { r: 0.78, rot: 1.8, color: C.ink, inkColor: C.line, opacity: 0 });
        /* ★這兩條排在 `done()` 裡，所以 delay 是相對「衝擊拍真正跑到的那一幀」★：t1 的 `react[0]`
           是 208ms，而 dt=16.67 的取樣讓 `done()` 實際落在 216.7 ⇒ 尾巴再拖 0.95×RL 就會超過
           `LAST`（實測 horizon 276 對 LAST 270，`maxRate 1.0097`、tier 1 的 `rateOK` 判紅）。
           收到 0.65×RL 之後短版原生塞得進去，沒有動任何門檻。 */
        st.fade(wet, { ms: RL * 0.25, from: 0, to: 0.72, ease: 'linear' });
        st.fade(wet, { ms: RL * 0.30, delay: RL * 0.35, from: 0.72, to: 0, ease: 'linear' });
        // 黏著延後一格（同前兩支：同幀呼叫會讓 anchor 與「雨滴有沒有真的落下」脫鉤）
        if (prey) st.tween({ ms: 12, ease: 'linear', update() {}, done() {
          const c = st.worldOf(prey, 'Chest', new THREE.Vector3());
          st.stick(drop, prey, { at: 'chest', off: to.clone().sub(c) });
        } });
      } });
    // 雨滴群：衝擊拍當幀出現，之後再走兩階落到底——三階都是離散的，沒有 easing
    st.tween({ ms: RL * 0.7, delay: R0, ease: 'linear', update(t) { writeRain(RAIN_STEP[Math.min(2, Math.floor(t * 3))]); } });
    st.fade(rain.obj, { ms: RL * 0.3, delay: R0 + RL * 0.66, from: 0.92, to: 0 });

    /* ③ 壓（react）：群體等比縮＋邊光轉冷，**四個離散台階**。
       `PHASE_GATE.react` 量的是 `move`／`scale` delta，所以縮放這條就是反應本身。 */
    const PRESS = [0.09, 0.18, 0.22, 0];
    st.tween({ ms: RL, delay: R0, ease: 'linear', update(t) {
      const n = Math.min(3, Math.floor(t * 4)), a = PRESS[n];
      foes.forEach((f) => { st.scale(f, 1 - a); st.rim(f, 1 + 4.5 * a); });
    } });

    /* 收勢：兜帽落回、退回原位。★也是卡頓三階★（§B3 禁平滑補間）。 */
    const SETTLE = [0.60, 0.26, 0];
    st.tween({ ms: LAST - R0, delay: R0, ease: 'linear', update(t) {
      const k = SETTLE[Math.min(2, Math.floor(t * 3))];
      coats.forEach((c, i) => { const d = step[i]; hood(c, k * (i ? 0.8 : 1)); st.move(c, d.x * 0.20 * k, 0, d.z * 0.20 * k); st.rim(c, 1 + 1.5 * k); });
    } });
  },

  /* 水鬼浮標・抓交替（buoy，作祟×4）：燒掉對面 1 隻小兵，本方也燒 1 隻。
     編舞：繩子往後盪起蓄力（0–385ms，四尊錯開 35ms：RopeA–F 甩開、雙臂後拉）
          → 甩繩（300ms 起 strike：領頭那尊整條繩往前拋出、半步前傾）
          → 勾住（330ms：一條抖動的繩線從 KnotTop 連到對面一隻小兵，那隻被拖半步、邊光暴亮）
          → 抓交替（390ms：本方最後一尊自己沉下去，腳下一圈漣漪擴出去、邊光被水吞掉）
          → 收（540ms 起：繩落回）。 */
  hauntSwap(st) {
    const buoys = st.actor;
    const thrower = buoys[0];
    const sinker = buoys[buoys.length - 1];
    const swarm = st.byBody(st.target, 'swarm');
    const prey = swarm[0] || st.target[0] || null;
    const ropes = ['RopeA', 'RopeB', 'RopeC', 'RopeD', 'RopeE', 'RopeF'];
    const swing = (b, k) => {
      ropes.forEach((r, i) => st.rot(b, r, 0.55 * k * (0.55 + 0.14 * i), 0.30 * k * (i % 2 ? 1 : -1), 0));
      st.rot(b, 'KnotTop', 0.40 * k); st.rot(b, 'KnotBot', 0.30 * k);
      st.rot(b, 'Yoke', 0.14 * k); st.rot(b, 'Chest', 0.12 * k); st.rot(b, 'Belly', 0.08 * k);
      st.rot(b, 'MastTop', 0.18 * k); st.rot(b, 'DrumCap', 0.12 * k); st.rot(b, 'DrumBase', 0.08 * k);
      st.rot(b, 'RSh1Sh', -0.52 * k, 0, -0.30 * k); st.rot(b, 'RElbow1El', -0.42 * k); st.rot(b, 'RWrist1Wr', -0.30 * k);
      st.rot(b, 'LSh1Sh', -0.52 * k, 0, 0.30 * k); st.rot(b, 'LElbow1El', -0.42 * k); st.rot(b, 'LWrist1Wr', -0.30 * k);
      st.rot(b, 'WeedRoot', -0.22 * k); st.rot(b, 'Weed1', -0.30 * k); st.rot(b, 'WeedTip', -0.40 * k);
    };
    const fwd = st.toward(thrower, new THREE.Vector3());
    buoys.forEach((b, i) => {
      st.tween({ ms: 280, delay: i * 35, ease: 'out', update(t, e) { swing(b, -0.60 * e); st.rim(b, 1 + 0.5 * e); } });
      const home = b === thrower ? 0.95 : -0.60;
      st.tween({ ms: 250, delay: 540 + i * 35, ease: 'inout', update(t, e) {
        const k = home * (1 - e); swing(b, k);
        if (b === thrower) st.move(b, fwd.x * 0.12 * (1 - e), 0, fwd.z * 0.12 * (1 - e));
        st.rim(b, 1 + 0.6 * (1 - e));
      } });
    });
    st.at(300, () => {
      st.tween({ ms: 210, ease: 'strike', update(t, e) {
        swing(thrower, -0.60 + 1.55 * e);
        st.move(thrower, fwd.x * 0.12 * e, 0, fwd.z * 0.12 * e);
        st.rim(thrower, 1 + 1.4 * e);
      } });
    });
    st.at(330, () => {
      if (!prey) return;
      const from = st.worldOf(thrower, 'KnotTop', new THREE.Vector3());
      const to = st.worldOf(prey, null, new THREE.Vector3());
      const rope = st.bolt(from, to, { jag: 0.07, segs: 14, opacity: 0, seed: 41 });
      st.tween({ ms: 380, ease: 'linear', update(t) { rope.material.opacity = 0.92 * Math.sin(Math.PI * t); } });
      st.burst(to, { power: 0.62, n: 30 });
      st.punch(0.3);
      const pull = st.toward(prey, new THREE.Vector3()); // prey 朝出招方＝被拖過去的方向
      st.tween({ ms: 420, delay: 60, ease: 'pulse', update(t, e) {
        st.move(prey, pull.x * 0.23 * e, 0, pull.z * 0.23 * e); st.rim(prey, 1 + 1.6 * e);
      } });
    });
    st.at(390, () => {
      const foot = st.foot(sinker, new THREE.Vector3());
      const ripple = st.ring(foot, 0.34, 0.045, { opacity: 0.82 });
      ripple.scale.setScalar(0.32);
      st.grow(ripple, { ms: 350, from: 0.32, to: 1.45 });
      st.fade(ripple, { ms: 340, delay: 100, from: 0.82, to: 0 });
      st.tween({ ms: 340, ease: 'pulse', update(t, e) {
        st.move(sinker, 0, -0.15 * e, 0);
        st.rot(sinker, 'Waist', 0.20 * e); st.rot(sinker, 'Neck', 0.24 * e); st.rot(sinker, 'Head1', 0.28 * e); st.rot(sinker, 'Crown', 0.18 * e);
        st.rim(sinker, 1 - 0.4 * e);
      } });
    });
  },

  /* 虎姑婆指甲・咬手指（nail，精英×1）：打群體目標額外 +2。
     編舞：長爪高舉、罩子後仰、張口（0–300ms，爪尖凝一點光）
          → 撲下（240ms 起 strike：爪從高處掃到身前、整尊前傾半步、鏡頭小推）
          → 咬（380ms 起每 85ms 一隻：對面小兵依序噴火星並退縮）
          → 舔爪收勢（620ms：爪抬到嘴邊、頭湊過去，到 900ms 全部回 0）。 */
  eliteVsSwarm(st) {
    const gran = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const swarm = st.byBody(st.target, 'swarm');
    const list = swarm.length ? swarm : st.target;
    const fwd = st.toward(gran, new THREE.Vector3());
    // k>0：長爪高舉後仰蓄勢；k<0：爪撲下前伸。lick：舔爪
    const pose = (k, lick) => {
      lick = lick || 0;
      const gape = Math.abs(k);
      st.rot(gran, 'ClawRoot', -1.00 * k, 0, 0.32 * k);
      st.rot(gran, 'ClawElbow', -0.72 * k + 0.85 * lick);
      st.rot(gran, 'ClawWrist', -0.55 * k - 0.45 * lick);
      st.rot(gran, 'ClawHand', -0.45 * k - 0.35 * lick);
      st.rot(gran, 'StubRoot', -0.48 * k, 0, -0.28 * k); st.rot(gran, 'StubElbow', -0.38 * k); st.rot(gran, 'StubTip', -0.28 * k);
      st.rot(gran, 'HoodRoot', -0.24 * k); st.rot(gran, 'Hood1', -0.20 * k); st.rot(gran, 'Hood2', -0.16 * k); st.rot(gran, 'HoodTop', -0.14 * k);
      st.rot(gran, 'HeadRoot', -0.30 * k - 0.34 * lick); st.rot(gran, 'Brow', -0.16 * k); st.rot(gran, 'Snout', -0.12 * k);
      st.rot(gran, 'JawRoot', 0.34 * gape + 0.18 * lick); st.rot(gran, 'Jaw1', 0.30 * gape); st.rot(gran, 'JawTip', 0.26 * gape);
      st.rot(gran, 'Neck', -0.14 * k); st.rot(gran, 'Chest', -0.16 * k); st.rot(gran, 'Spine', -0.12 * k); st.rot(gran, 'Hips', -0.08 * k);
      st.rot(gran, 'CapeRoot', -0.22 * k); st.rot(gran, 'Cape1', -0.28 * k); st.rot(gran, 'CapeHem', -0.34 * k);
      st.rot(gran, 'RobeRoot', -0.10 * k); st.rot(gran, 'Robe1', -0.15 * k); st.rot(gran, 'RobeHem', -0.20 * k);
    };
    const spark = st.orb(st.worldOf(gran, 'ClawHand', new THREE.Vector3()), 0.055, { opacity: 0 });
    spark.scale.setScalar(0.3);
    st.tween({ ms: 660, ease: 'linear', update(t) {
      st.worldOf(gran, 'ClawHand', spark.position);
      spark.material.opacity = 0.92 * Math.sin(Math.PI * Math.min(1, t * 1.1));
      spark.scale.setScalar(0.3 + 0.95 * Math.min(1, t * 1.7));
    } });
    st.tween({ ms: 240, ease: 'out', update(t, e) { pose(e); st.move(gran, 0, 0.05 * e, 0); st.rim(gran, 1 + 0.9 * e); } });
    st.at(240, () => {
      st.tween({ ms: 200, ease: 'strike', update(t, e) {
        pose(1 - 2 * e);
        st.move(gran, fwd.x * 0.20 * e, 0.05 * (1 - e), fwd.z * 0.20 * e);
        st.rim(gran, 1 + 0.9 + 1.1 * e);
      } });
      st.punch(0.42);
    });
    list.forEach((f, j) => {
      st.at(380 + j * 85, () => {
        const p = st.worldOf(f, null, new THREE.Vector3());
        st.burst(p, { power: 0.72, n: 34 });
        st.flinch([f], { strength: 1.15, burst: false });
      });
    });
    st.at(620, () => {
      st.tween({ ms: 250, ease: 'inout', update(t, e) {
        const k = -1 * (1 - e);
        pose(k, Math.sin(Math.PI * t));
        st.move(gran, fwd.x * 0.20 * (1 - e), 0, fwd.z * 0.20 * (1 - e));
        st.rim(gran, 1 + 2.0 * (1 - e));
      } });
    });
  },

  /* 陰陽眼銅錢・陰陽眼（yinyangcoin，小兵×2）：本隊攻擊無視吸收。
     編舞：兩手抬到眼前、銅錢貼上去旋亮（0–325ms：CoinA/CoinB 位移到眼位、轉兩圈、脹大）
          → 穿透（280ms 起：每一枚銅錢射出一道直線，對準對面一隻再往後多穿 1.35 個身位——線不停在對面身上）
          → 被穿的邊光瞬亮、火星、輕退（340ms 起）
          → 收（600ms 起：手放下、銅錢再轉一圈歸位）。 */
  swarmPierce(st) {
    const seers = st.actor;
    const foes = st.target;
    const eye = (g, k, spin) => {
      st.shift(g, 'CoinA', 0, 0.055 * k, 0.045 * k); st.shift(g, 'CoinB', 0, 0.055 * k, -0.045 * k);
      st.rot(g, 'CoinA', 0, spin, 0); st.rot(g, 'CoinB', 0, -spin, 0);
      st.scaleBone(g, 'CoinA', 1 + 0.55 * k); st.scaleBone(g, 'CoinB', 1 + 0.55 * k);
      st.rot(g, 'HeadRoot', -0.22 * k); st.rot(g, 'Skull', -0.10 * k); st.rot(g, 'Neck2', -0.14 * k); st.rot(g, 'NeckB', -0.10 * k);
      st.rot(g, 'Brow', -0.14 * k); st.rot(g, 'Crown', -0.12 * k);
      st.rot(g, 'LArm1Rt', -0.85 * k, 0, 0.30 * k); st.rot(g, 'LArm1El', -0.78 * k); st.rot(g, 'LArm1Wr', -0.30 * k); st.rot(g, 'LArm1Ha', -0.18 * k);
      st.rot(g, 'RArm1Rt', -0.85 * k, 0, -0.30 * k); st.rot(g, 'RArm1El', -0.78 * k); st.rot(g, 'RArm1Wr', -0.30 * k); st.rot(g, 'RArm1Ha', -0.18 * k);
      st.rot(g, 'SkirtRoot', 0.08 * k); st.rot(g, 'Skirt1', 0.12 * k); st.rot(g, 'SkirtHem', 0.17 * k);
      st.rot(g, 'Chest', -0.09 * k); st.rot(g, 'Spine', -0.06 * k);
      st.scaleBone(g, 'BasePlate', 1 + 0.12 * k);
    };
    seers.forEach((g, i) => {
      st.tween({ ms: 280, delay: i * 45, ease: 'out', update(t, e) { eye(g, e, e * Math.PI * 4); st.rim(g, 1 + 1.0 * e); } });
      st.tween({ ms: 280, delay: 600 + i * 45, ease: 'inout', update(t, e) { eye(g, 1 - e, Math.PI * 4 + e * Math.PI * 2); st.rim(g, 1 + 1.0 * (1 - e)); } });
    });
    st.at(280, () => {
      seers.forEach((g, i) => {
        const from = st.worldOf(g, i % 2 ? 'CoinB' : 'CoinA', new THREE.Vector3());
        const mark = foes.length ? foes[i % foes.length] : null;
        const aim = mark ? st.worldOf(mark, null, new THREE.Vector3()) : from.clone().addScaledVector(st.dir, 2);
        const thru = aim.clone().sub(from);
        const len = thru.length() || 1;
        const to = from.clone().addScaledVector(thru.multiplyScalar(1 / len), len + 1.35); // 穿過去、不停在對面
        const ray = st.beam(from, to, { opacity: 0 });
        st.tween({ ms: 320, delay: i * 50, ease: 'linear', update(t) { ray.material.opacity = 0.95 * Math.sin(Math.PI * t); } });
        if (mark) st.at(60 + i * 50, () => st.burst(aim, { power: 0.55, n: 26 }));
      });
      foes.forEach((f, j) => st.tween({ ms: 300, delay: 40 + j * 35, ease: 'linear', update(t) { st.rim(f, 1 + 1.8 * Math.sin(Math.PI * t)); } }));
      st.flinch(foes, { delay: 60, stagger: 35, strength: 0.5, burst: false });
      st.punch(0.28);
    });
  },

  /* 過陰咒・恐懼加倍（guoyin，作祟×4）：三拍恐懼倍率 ×2。
     編舞：本尊低頭俯身、霧腳外散（0–375ms）
          → 虛影分離（200ms 起：VRoot 整條往上抬起並旋開，虛影的頭手往後仰＝半條命踩到那邊）
          → 兩圈暗環一前一後從本方腳下推出去（280ms／400ms）
          → 對面縮得比單純恐懼更深（360ms，−30%）並退縮
          → 收（640ms：虛影沉回本尊，姿態歸 0）。 */
  hauntFearX2(st) {
    const casters = st.actor;
    const foes = st.target;
    const flesh = (g, k) => {
      st.rot(g, 'Waist', 0.14 * k); st.rot(g, 'Spine', 0.17 * k); st.rot(g, 'Chest', 0.15 * k);
      st.rot(g, 'NeckB', 0.19 * k); st.rot(g, 'HeadRoot', 0.25 * k); st.rot(g, 'Skull', 0.16 * k); st.rot(g, 'Crown', 0.12 * k);
      st.rot(g, 'ArmRoot', -0.45 * k, 0, 0.26 * k); st.rot(g, 'ArmElbow', -0.40 * k); st.rot(g, 'ArmWrist', -0.30 * k); st.rot(g, 'ArmHand', -0.24 * k);
      st.rot(g, 'MistRoot', -0.20 * k); st.rot(g, 'Mist1', -0.26 * k); st.rot(g, 'Mist2', -0.30 * k); st.rot(g, 'MistTip', -0.36 * k);
    };
    const shade = (g, k) => {
      st.shift(g, 'VRoot', 0, 0.42 * k, 0);
      st.rot(g, 'VRoot', -0.24 * k, 1.10 * k, 0);
      st.rot(g, 'VSpine', -0.20 * k); st.rot(g, 'VChest', -0.23 * k); st.rot(g, 'VNeck', -0.27 * k);
      st.rot(g, 'VHeadRoot', -0.32 * k); st.rot(g, 'VSkull2', -0.20 * k); st.rot(g, 'VCrown', -0.16 * k);
      st.rot(g, 'VArmRoot', -0.92 * k, 0, -0.30 * k); st.rot(g, 'VArmElbow', -0.60 * k); st.rot(g, 'VArmWrist', -0.42 * k); st.rot(g, 'VArmTip', -0.30 * k);
      st.scaleBone(g, 'VRoot', 1 + 0.25 * k);
    };
    casters.forEach((g, i) => {
      st.tween({ ms: 300, delay: i * 25, ease: 'out', update(t, e) { flesh(g, e); st.rim(g, 1 + 0.5 * e); } });
      st.tween({ ms: 360, delay: 200 + i * 25, ease: 'out', update(t, e) { shade(g, e); st.rim(g, 1 + 0.5 + 1.1 * e); } });
    });
    st.at(280, () => {
      const c0 = new THREE.Vector3();
      casters.forEach((g) => c0.add(st.worldOf(g, null, _a)));
      c0.multiplyScalar(1 / Math.max(1, casters.length));
      c0.y = st.tableY;
      [0, 120].forEach((d, i) => {
        const halo = st.ring(c0, 0.70 + 0.26 * i, 0.06, { opacity: 0.8 });
        halo.scale.setScalar(0.30);
        st.grow(halo, { ms: 400, delay: d, from: 0.30, to: 1.35 });
        st.fade(halo, { ms: 370, delay: d + 140, from: 0.8, to: 0 });
      });
      st.burst(c0, { power: 0.5, n: 26 });
    });
    st.at(360, () => {
      st.flinch(foes, { stagger: 40, strength: 1.1, burst: false });
      foes.forEach((f, j) => st.tween({ ms: 460, delay: j * 30, ease: 'pulse', update(t, e) { st.scale(f, 1 - 0.30 * e); st.rim(f, 1 + 1.1 * e); } }));
    });
    st.at(640, () => {
      casters.forEach((g) => {
        st.tween({ ms: 240, ease: 'inout', update(t, e) { const k = 1 - e; flesh(g, k); shade(g, k); st.rim(g, 1 + 1.6 * k); } });
      });
    });
  },

  /* 飼鬼甕・餓鬼進食（sigui，小兵×2）：拍末對面有紙紮被燒 → 本方全體 hp+1。
     編舞：甕口張開（0–300ms：LipRoot/LipMid/LipEdge 外翻脹大、喉頸後仰、雙臂抬起捧甕）
          → 進食（250ms 起：對面每一隻頭頂飄來一顆灰火，帶弧線被吸進甕口，進去一顆甕身脹一下）
          → 回暖（520ms：本方每一尊腳下一圈暖光擴開）
          → 收（620ms：甕口閉上，邊光緩緩回穩）。 */
  swarmFeed1(st) {
    const urns = st.actor;
    const foes = st.target;
    const mouth = (u, k) => {
      st.rot(u, 'LipRoot', -0.42 * k); st.rot(u, 'LipMid', -0.36 * k); st.rot(u, 'LipEdge', -0.32 * k);
      st.scaleBone(u, 'LipEdge', 1 + 0.60 * k); st.scaleBone(u, 'LipMid', 1 + 0.38 * k);
      st.rot(u, 'ThroatRoot', -0.24 * k); st.rot(u, 'ThroatTop', -0.28 * k);
      st.rot(u, 'NeckRoot', -0.16 * k); st.rot(u, 'NeckTop', -0.20 * k);
      st.rot(u, 'HeadRoot', -0.30 * k); st.rot(u, 'Skull', -0.20 * k); st.rot(u, 'Crown', -0.14 * k);
      st.rot(u, 'Shoulders', -0.12 * k); st.rot(u, 'Chest', -0.10 * k); st.rot(u, 'Waist', -0.08 * k); st.rot(u, 'TorsoRoot', -0.06 * k);
      st.rot(u, 'LArm1Rt', -0.75 * k, 0, 0.35 * k); st.rot(u, 'LArm1El', -0.50 * k); st.rot(u, 'LArm1Ja', -0.24 * k); st.rot(u, 'LArm1Wr', -0.30 * k); st.rot(u, 'LArm1Ha', -0.22 * k);
      st.rot(u, 'RArm1Rt', -0.75 * k, 0, -0.35 * k); st.rot(u, 'RArm1El', -0.50 * k); st.rot(u, 'RArm1Ja', -0.24 * k); st.rot(u, 'RArm1Wr', -0.30 * k); st.rot(u, 'RArm1Ha', -0.22 * k);
    };
    const swell = (u) => st.tween({ ms: 220, ease: 'pulse', update(t, e) {
      st.scaleBone(u, 'PotBase', 1 + 0.10 * e); st.scaleBone(u, 'PotLow', 1 + 0.17 * e); st.scaleBone(u, 'PotSeam', 1 + 0.14 * e);
      st.scaleBone(u, 'UrnA', 1 + 0.13 * e); st.scaleBone(u, 'UrnB', 1 + 0.13 * e); st.scaleBone(u, 'UrnC', 1 + 0.11 * e); st.scaleBone(u, 'UrnTop', 1 + 0.09 * e);
    } });
    urns.forEach((u, i) => {
      st.tween({ ms: 300, delay: i * 45, ease: 'out', update(t, e) { mouth(u, e); st.rim(u, 1 + 0.6 * e); } });
      st.tween({ ms: 260, delay: 620 + i * 40, ease: 'inout', update(t, e) {
        mouth(u, 1 - e); st.rim(u, 1 + 0.6 * (1 - e) + 0.9 * Math.sin(Math.PI * t));
      } });
    });
    st.at(250, () => {
      foes.forEach((f, j) => {
        const u = urns[j % urns.length];
        const from = st.top(f, new THREE.Vector3());
        const to = st.worldOf(u, 'LipMid', new THREE.Vector3());
        const ash = st.orb(from, 0.075, { opacity: 0 });
        ash.scale.setScalar(0.35);
        st.tween({ ms: 340, delay: j * 30, ease: 'linear', update(t) {
          ash.material.opacity = 0.95 * Math.min(1, Math.sin(Math.PI * t) * 3);
          ash.scale.setScalar(0.35 + 0.85 * Math.min(1, t * 3));
        } });
        st.fly(ash, from, to, { ms: 340, delay: j * 30, ease: 'out', arc: 0.34, done() {
          ash.material.opacity = 0;
          st.burst(to, { power: 0.36, n: 18 });
          swell(u);
        } });
      });
      st.flinch(foes, { delay: 40, stagger: 35, strength: 0.5, burst: false });
    });
    st.at(520, () => {
      urns.forEach((u, i) => {
        const warm = st.disc(st.foot(u, new THREE.Vector3()), 0.42, { opacity: 0.55 });
        warm.scale.setScalar(0.40);
        st.grow(warm, { ms: 260, delay: i * 35, from: 0.40, to: 1.18 });
        st.fade(warm, { ms: 260, delay: 60 + i * 35, from: 0.55, to: 0 });
      });
    });
  },
};
export default MOVES;

/* ══════════ Tier 1 短版（260ms，v0.54 三級視覺分級）══════════
   寫法紀律與踩過的坑見 js/trait-fx/zuling.js 同一區塊的檔頭（horizon ≤230、補間一律頂層
   用 delay 排定、不用 st.at、回呼裡只放 burst／punch）。辨識元素表在
   docs/experiments/2026-09-10-plan-fx-tiers.md §5。
   陰氣系的共同語氣（照完整版）：出手前先有一拍靜止、拍子卡頓，霧裾慢半拍才追上。 */
export const SHORT = {
  /* 偷命｜tier 1 短版 = 完整版**同一支函式**（v0.55，時間軸由 st.beat 換算） */
  hauntSteal: MOVES.hauntSteal,

  /* 迷途｜tier 1 短版 = 完整版**同一支函式**（v0.55，時間軸由 st.beat 換算） */
  hauntLost: MOVES.hauntLost,

  /* 看穿｜tier 1 短版 = 完整版**同一支函式**（v0.55，時間軸由 st.beat 換算） */
  hauntSee: MOVES.hauntSee,

  /* 恐懼｜tier 1 短版 = 完整版**同一支函式**（v0.55，時間軸由 st.beat 換算） */
  hauntDread1: MOVES.hauntDread1,

  /* 抓交替｜辨識：繩子甩出勾住對面＋本方自己沉下去的漣漪 */
  hauntSwap(st) {
    const K = st.ms / 260;
    const bys = st.byBody(st.actor, 'haunt').length ? st.byBody(st.actor, 'haunt') : st.actor;
    const lead = bys[0];
    const sink = bys[bys.length - 1];
    const knot = st.worldOf(lead, 'KnotTop', new THREE.Vector3());
    const prey = st.byBody(st.target, 'swarm')[0] || st.target[0] || null;
    const at = prey ? st.worldOf(prey, null, new THREE.Vector3()) : knot.clone().addScaledVector(st.dir, 1.6);
    const rope = st.bolt(knot, at, { jag: 0.18, segs: 9, seed: 6, opacity: 0 }); // 一條抖動的繩線
    const ripple = st.ring(st.foot(sink, new THREE.Vector3()), 0.3, 0.045, { opacity: 0 });
    bys.forEach((g, i) => st.tween({ ms: 84 * K, delay: i * 9 * K, ease: 'wind', update(t, e) { // 繩子往後盪起蓄力
      st.rot(g, 'RSh1Sh', -0.5 * e); st.rot(g, 'RElbow1El', -0.35 * e); st.rot(g, 'LSh1Sh', -0.4 * e);
      st.rot(g, 'Chest', -0.12 * e); st.rot(g, 'Weed1', 0, 0, 0.22 * e); st.rim(g, 1 + 0.6 * e);
    } }));
    st.tween({ ms: 70 * K, delay: 82 * K, ease: 'strike', update(t, e) { // 甩繩：整條繩往前拋出、半步前傾
      st.rot(lead, 'RSh1Sh', -0.5 + 1.1 * e); st.rot(lead, 'RElbow1El', -0.35 + 0.6 * e);
      st.rot(lead, 'Chest', -0.12 + 0.26 * e); st.move(lead, 0, 0, 0.11 * e);
    }, done() { st.punch(0.4); } });
    st.fade(rope, { ms: 92 * K, delay: 96 * K, from: 0.95, to: 0 }); // 勾住
    if (prey) {
      st.tween({ ms: 74 * K, delay: 104 * K, ease: 'out', update(t, e) { st.move(prey, 0, 0, -0.14 * e); st.rim(prey, 1 + 2 * e); } });
      st.flinch([prey], { delay: 108 * K, strength: 1.1, burst: true });
    }
    st.tween({ ms: 82 * K, delay: 132 * K, ease: 'in', update(t, e) { // 本方最後一尊自己沉下去
      st.move(sink, 0, -0.16 * e, 0); st.rim(sink, 1 - 0.6 * e);
    } });
    st.grow(ripple, { ms: 76 * K, delay: 152 * K, from: 0.3, to: 1.7 }); // 腳下一圈漣漪擴出去
    st.fade(ripple, { ms: 76 * K, delay: 152 * K, from: 0.7, to: 0 });
    st.tween({ ms: 58 * K, delay: 170 * K, ease: 'inout', update(t, e) { // 繩落回
      const k = 1 - e;
      bys.forEach((g) => { st.rot(g, 'RSh1Sh', 0.6 * k); st.rot(g, 'LSh1Sh', -0.4 * k); st.rot(g, 'Weed1', 0, 0, 0.22 * k); });
      st.move(lead, 0, 0, 0.11 * k); st.move(sink, 0, -0.16 * k, 0);
    } });
  },

  /* 咬手指｜辨識：長爪從高處掃下＋對面小兵依序噴火星 */
  eliteVsSwarm(st) {
    const K = st.ms / 260;
    const gran = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const swarm = st.byBody(st.target, 'swarm').length ? st.byBody(st.target, 'swarm') : st.target;
    const claw = st.worldOf(gran, 'ClawHand', new THREE.Vector3());
    const spark = st.orb(claw, 0.04, { opacity: 0 });
    spark.scale.setScalar(0.5);
    st.tween({ ms: 84 * K, ease: 'wind', update(t, e) { // 長爪高舉、罩子後仰、張口
      st.rot(gran, 'ClawRoot', -1.1 * e); st.rot(gran, 'ClawElbow', -0.5 * e); st.rot(gran, 'ClawWrist', -0.3 * e);
      st.rot(gran, 'HoodRoot', -0.22 * e); st.rot(gran, 'JawRoot', 0.28 * e); st.rim(gran, 1 + 0.9 * e);
      st.worldOf(gran, 'ClawHand', spark.position);
    } });
    st.fade(spark, { ms: 45 * K, delay: 45 * K, from: 0, to: 1 }); // 爪尖凝一點光
    st.tween({ ms: 76 * K, delay: 82 * K, ease: 'strike', update(t, e) { // 撲下：爪從高處掃到身前、前傾半步
      st.rot(gran, 'ClawRoot', -1.1 + 1.65 * e); st.rot(gran, 'ClawElbow', -0.5 + 0.8 * e);
      st.rot(gran, 'ClawWrist', -0.3 + 0.5 * e); st.rot(gran, 'Chest', 0.18 * e);
      st.move(gran, 0, 0, 0.1 * e); st.worldOf(gran, 'ClawHand', spark.position);
    }, done() { st.punch(0.5); } });
    st.fade(spark, { ms: 42 * K, delay: 158 * K, from: 1, to: 0 });
    swarm.slice(0, 4).forEach((f, i) => st.flinch([f], { delay: (120 + i * 22) * K, strength: 1.05, burst: true })); // 依序噴火星並退縮
    st.tween({ ms: 64 * K, delay: 164 * K, ease: 'inout', update(t, e) { // 舔爪收勢：爪抬到嘴邊、頭湊過去
      st.rot(gran, 'ClawRoot', 0.55 * (1 - e) - 0.5 * e); st.rot(gran, 'ClawElbow', 0.3 * (1 - e) - 0.6 * e);
      st.rot(gran, 'HeadRoot', -0.18 * e); st.rot(gran, 'JawRoot', 0.28 * (1 - e)); st.rim(gran, 1 + 1.9 * (1 - e));
    } });
  },

  /* 陰陽眼｜辨識：銅錢貼上眼位旋亮＋直線穿透過對面身後 */
  swarmPierce(st) {
    const K = st.ms / 260;
    const men = st.byBody(st.actor, 'swarm').length ? st.byBody(st.actor, 'swarm') : st.actor;
    const lead = men[0];
    const eyeP = st.worldOf(lead, 'Brow', new THREE.Vector3());
    const foe = st.target[0] || null;
    const at = foe ? st.worldOf(foe, null, new THREE.Vector3()) : eyeP.clone().addScaledVector(st.dir, 1.6);
    const thru = at.clone().addScaledVector(st.dir, 1.35); // 線不停在對面身上，往後多穿 1.35 個身位
    const rayA = st.beam(eyeP.clone(), thru, { opacity: 0 });
    const rayB = men[1] ? st.beam(st.worldOf(men[1], 'Brow', new THREE.Vector3()), thru, { opacity: 0 }) : null;
    men.forEach((g, i) => st.tween({ ms: 88 * K, delay: i * 10 * K, ease: 'out', update(t, e) { // 兩手抬到眼前、銅錢轉兩圈脹大
      st.rot(g, 'LArm1Rt', -0.75 * e); st.rot(g, 'RArm1Rt', -0.75 * e);
      st.rot(g, 'LArm1El', -0.55 * e); st.rot(g, 'RArm1El', -0.55 * e);
      st.rot(g, 'CoinA', 0, Math.PI * 2 * e, 0); st.rot(g, 'CoinB', 0, -Math.PI * 2 * e, 0);
      st.scaleBone(g, 'CoinA', 1 + 0.4 * e); st.scaleBone(g, 'CoinB', 1 + 0.4 * e);
      st.rim(g, 1 + 1 * e);
    } }));
    st.fade(rayA, { ms: 86 * K, delay: 88 * K, from: 0.95, to: 0 }); // 穿透
    if (rayB) st.fade(rayB, { ms: 86 * K, delay: 100 * K, from: 0.95, to: 0 });
    if (foe) {
      st.tween({ ms: 60 * K, delay: 100 * K, ease: 'pulse', update(t, e) { st.rim(foe, 1 + 2.4 * e); },
        done() { st.burst(at, { power: 0.7, n: 32 }); st.punch(0.35); } });
      st.flinch([foe], { delay: 104 * K, strength: 0.9, burst: false });
    }
    st.tween({ ms: 64 * K, delay: 164 * K, ease: 'inout', update(t, e) { // 手放下、銅錢再轉一圈歸位
      const k = 1 - e;
      men.forEach((g) => {
        st.rot(g, 'LArm1Rt', -0.75 * k); st.rot(g, 'RArm1Rt', -0.75 * k);
        st.rot(g, 'LArm1El', -0.55 * k); st.rot(g, 'RArm1El', -0.55 * k);
        st.rot(g, 'CoinA', 0, Math.PI * 2 * k + Math.PI * e, 0); st.rot(g, 'CoinB', 0, -Math.PI * 2 * k - Math.PI * e, 0);
        st.scaleBone(g, 'CoinA', 1 + 0.4 * k); st.scaleBone(g, 'CoinB', 1 + 0.4 * k); st.rim(g, 1 + 1 * k);
      });
    } });
  },

  /* 恐懼加倍｜辨識：虛影從本尊分離抬起＋兩圈暗環一前一後推出 */
  hauntFearX2(st) {
    const K = st.ms / 260;
    const casts = st.byBody(st.actor, 'haunt').length ? st.byBody(st.actor, 'haunt') : st.actor;
    const lead = casts[0];
    const foot = st.foot(lead, new THREE.Vector3());
    const r1 = st.ring(foot, 0.34, 0.05, { opacity: 0, color: 0x3a2450 });
    const r2 = st.ring(foot, 0.34, 0.04, { opacity: 0, color: 0x3a2450 });
    casts.forEach((g, i) => st.tween({ ms: 86 * K, delay: i * 8 * K, ease: 'in', update(t, e) { // 本尊低頭俯身、霧腳外散
      st.rot(g, 'Waist', 0.16 * e); st.rot(g, 'Chest', 0.12 * e); st.rot(g, 'HeadRoot', 0.2 * e);
      st.rot(g, 'Mist1', 0, 0, 0.24 * e); st.rot(g, 'Mist2', 0, 0, -0.2 * e); st.rim(g, 1 - 0.3 * e);
    } }));
    casts.forEach((g, i) => st.tween({ ms: 92 * K, delay: (78 + i * 8) * K, ease: 'out', update(t, e) { // 虛影分離：VRoot 整條抬起並旋開
      st.shift(g, 'VRoot', 0, 0.16 * e, -0.1 * e); st.rot(g, 'VRoot', 0, 0.7 * e, 0);
      st.rot(g, 'VHeadRoot', -0.3 * e); st.rot(g, 'VArmRoot', -0.4 * e); st.rot(g, 'VSpine', -0.16 * e);
      st.rim(g, 0.7 + 2.1 * e);
    } }));
    st.grow(r1, { ms: 96 * K, delay: 92 * K, from: 0.3, to: 1.9 }); // 兩圈暗環一前一後推出去
    st.fade(r1, { ms: 96 * K, delay: 92 * K, from: 0.8, to: 0 });
    st.grow(r2, { ms: 92 * K, delay: 126 * K, from: 0.3, to: 2.2 });
    st.fade(r2, { ms: 92 * K, delay: 126 * K, from: 0.6, to: 0 });
    st.target.forEach((f, i) => st.tween({ ms: 92 * K, delay: (112 + i * 8) * K, ease: 'pulse', update(t, e) { // 縮得比單純恐懼更深（−30%）
      st.scale(f, 1 - 0.3 * e); st.move(f, 0, 0, -0.06 * e); st.rim(f, 1 - 0.4 * e);
    } }));
    st.tween({ ms: 58 * K, delay: 170 * K, ease: 'inout', update(t, e) { // 虛影沉回本尊
      const k = 1 - e;
      casts.forEach((g) => {
        st.shift(g, 'VRoot', 0, 0.16 * k, -0.1 * k); st.rot(g, 'VRoot', 0, 0.7 * k, 0);
        st.rot(g, 'VHeadRoot', -0.3 * k); st.rot(g, 'VArmRoot', -0.4 * k);
        st.rot(g, 'Waist', 0.16 * k); st.rot(g, 'HeadRoot', 0.2 * k); st.rim(g, 1 + 1.8 * k);
      });
    } });
  },

  /* 餓鬼進食｜辨識：甕口張開＋灰火帶弧線被吸進甕、甕身脹一下 */
  swarmFeed1(st) {
    const K = st.ms / 260;
    const urns = st.byBody(st.actor, 'swarm').length ? st.byBody(st.actor, 'swarm') : st.actor;
    const lead = urns[0];
    const mouth = st.worldOf(lead, 'LipRoot', new THREE.Vector3());
    const ashes = st.target.slice(0, 3).map((f, i) => {
      const from = st.top(f, new THREE.Vector3());
      const o = st.orb(from, 0.038, { opacity: 0, color: 0x8a8f9a });
      return { o, from, i };
    });
    const warmRing = st.disc(st.foot(lead, new THREE.Vector3()), 0.4, { opacity: 0 });
    warmRing.scale.setScalar(0.3);
    st.tween({ ms: 84 * K, ease: 'out', update(t, e) { // 甕口張開：唇外翻脹大、雙臂抬起捧甕
      st.scaleBone(lead, 'LipRoot', 1 + 0.3 * e); st.scaleBone(lead, 'LipMid', 1 + 0.24 * e); st.scaleBone(lead, 'LipEdge', 1 + 0.34 * e);
      st.rot(lead, 'ThroatRoot', -0.18 * e); st.rot(lead, 'LArm1Rt', -0.5 * e); st.rot(lead, 'RArm1Rt', -0.5 * e);
      st.rim(lead, 1 + 0.8 * e);
    } });
    ashes.forEach(({ o, from, i }) => { // 灰火帶弧線被吸進甕口
      st.fade(o, { ms: 34 * K, delay: (70 + i * 12) * K, from: 0, to: 1 });
      st.fly(o, from, mouth, { ms: 76 * K, delay: (76 + i * 12) * K, ease: 'in', arc: 0.2 });
      st.fade(o, { ms: 30 * K, delay: (152 + i * 12) * K, from: 1, to: 0 });
      st.tween({ ms: 40 * K, delay: (154 + i * 12) * K, ease: 'pulse', update(t, e) { st.scale(lead, 1 + 0.07 * e); } }); // 進去一顆甕身脹一下
    });
    st.grow(warmRing, { ms: 82 * K, delay: 148 * K, from: 0.3, to: 1.6 }); // 回暖：本方腳下暖光擴開
    st.fade(warmRing, { ms: 82 * K, delay: 148 * K, from: 0.55, to: 0 });
    st.actor.forEach((f, i) => st.tween({ ms: 70 * K, delay: (150 + i * 10) * K, ease: 'pulse', update(t, e) { st.rim(f, 1 + 1.3 * e); } }));
    st.tween({ ms: 58 * K, delay: 170 * K, ease: 'inout', update(t, e) { // 甕口閉上
      const k = 1 - e;
      st.scaleBone(lead, 'LipRoot', 1 + 0.3 * k); st.scaleBone(lead, 'LipMid', 1 + 0.24 * k); st.scaleBone(lead, 'LipEdge', 1 + 0.34 * k);
      st.rot(lead, 'ThroatRoot', -0.18 * k); st.rot(lead, 'LArm1Rt', -0.5 * k); st.rot(lead, 'RArm1Rt', -0.5 * k);
      st.rim(lead, 1 + 0.8 * k);
    } });
  },
};

/* ══════════ v0.55 批 0 徽記剪影版（`?fxvocab=1` 時登記的那一份）══════════
   陰氣範本招 `hauntLost` 於 2026-09-13 轉正（招式演出卷・陰氣批階段 A），正式版住在上面的 MOVES。
   這一份**原地保留給治具與 L3 canary**：`tests/tools/fx-contrast.mjs` 檔頭那份 canary 程序
   指名的四支示範招之一就是它（`tests/tools/README.md` 的 N-6 另記著「`duel-drive --seed=7`
   只量得到 `hat` 一個 kind」——正式 L3 對徽記尺寸的鑑別力目前就掛在這一支上）。
   ★這一段的本體逐字取自 v0.55.8 的 `MOVES.hauntLost`，只改了函式名那一行★
   （`_v055` 後綴在登記點 js/trait-fx.js 剝掉換回 trId，分派只做一次，函式內一個 if 都沒有）。
   0.54 的退路（`V054`／`V054_SHORT`）連同轉正一起移除——見 `git show ea2a38f:js/trait-fx/yinqi.js`。 */
export const V055 = {
  /* 魔神仔紅帽・迷途 v0.55 批 0 徽記剪影版（`?fxvocab=1` 才登記）。
     ★v0.55 招式可辨性卷 批 0 示範招（陰氣）★
     盲讀 r1 的病因（計畫 §6 第 26 列）：**A 短版「認不出」、B 短版「中間看不到任何飛行物」**；
       A 完整版猜成水鬼浮標 ⇒ 失敗類型 E（因果斷裂：沒有飛行物，只有原地繞圈的 0.052 小球）＋C（對比不足）。
     它與轉正版的差別＝**徽記剪影 vs 紙紮實體**：這一份的帽與腳印走 `st.icon`／`st.icons`
     （平面單色 billboard），轉正版走 `st.paperStamp`／`st.paperProps` 與 `st.stain`。 */
  /* 魔神仔紅帽・迷途（redhat，作祟×4）：三拍對面 1 隊不出手（對精英無效）。
     ★v0.55 招式可辨性卷 批 0 示範招（陰氣）★
     盲讀 r1 的病因（計畫 §6 第 26 列）：**A 短版「認不出」、B 短版「中間看不到任何飛行物」**；
       A 完整版猜成水鬼浮標 ⇒ 失敗類型 E（因果斷裂：沒有飛行物，只有原地繞圈的 0.052 小球）＋C（對比不足）。
     改法（ART_BIBLE §10）：
       ① windup：帽尖後仰蓄勢的同時，領頭那尊頭上浮出一頂**紅帽徽記**
          （陰氣授權的「那一點刺眼的紅」hot 色＋ink 底板，這是本卷唯一准用刺眼紅的位置）；
       ② travel：紅帽**真的飛過去**扣在被迷那隻頭上（原本完全沒有飛行物，這一段就是 E 的修法）；
       ③ react：被迷的原地打轉**並踉蹌位移**（只有 spin 不算反應，因果門檻量的是 move／scale），
          地面留下一串**不規則的暗斑腳印**（陰氣的腳下語彙；原本那圈 ring 與過陰咒的兩圈暗環直接撞，整組退役）。
     ★tier 1／2／3 共用這一支★（時間軸由 st.beat 換算）。 */
  hauntLost_v055(st) {
    const B = st.beat, C = st.colors, LAST = st.ms * 0.88;
    const ghosts = st.byBody(st.actor, 'haunt').length ? st.byBody(st.actor, 'haunt') : st.actor;
    const lost = (st.byBody(st.target, 'swarm').length ? st.byBody(st.target, 'swarm') : st.target).slice(0, 2);
    const W = B.windup[1], T0 = B.travel[0], TL = B.travel[1] - B.travel[0], R0 = B.react[0], RL = LAST - B.react[0];
    const fwd = ghosts.map((g) => st.toward(g, new THREE.Vector3()));
    // k<0：帽尖後仰蓄勢；k>0：帽尖往前一點
    const point = (g, k) => {
      const open = Math.max(0, k);
      st.rot(g, 'HatRoot', 0.44 * k, 0.26 * k, 0);
      st.rot(g, 'Hat1', 0.36 * k, 0.32 * k, 0);
      st.rot(g, 'HatTip', 0.48 * k, 0.42 * k, 0);
      st.rot(g, 'NeckB', 0.12 * k); st.rot(g, 'Neck2', 0.14 * k);
      st.rot(g, 'HeadRoot', 0.24 * k, 0.20 * k, 0); st.rot(g, 'Skull', 0.12 * k);
      st.rot(g, 'JawRoot', 0.30 * open); st.rot(g, 'Jaw1', 0.26 * open); st.rot(g, 'JawTip', 0.22 * open);
      st.rot(g, 'MistRoot', -0.18 * k, 0.30 * k, 0);
      st.rot(g, 'Mist1', -0.22 * k, 0.36 * k, 0);
      st.rot(g, 'Mist2', -0.24 * k, 0.40 * k, 0);
      st.rot(g, 'MistTip', -0.28 * k, 0.46 * k, 0);
      st.rot(g, 'RArmRoot1Rt', -0.55 * k, 0, -0.28 * k); st.rot(g, 'RElbow1El', -0.42 * k); st.rot(g, 'RWrist1Wr', -0.26 * k);
      st.rot(g, 'LArmRoot1Rt', -0.28 * k, 0, 0.20 * k); st.rot(g, 'LElbow1El', -0.20 * k);
    };
    // 飛出去的紅帽：一隻被迷的獵物配一頂（上限 2 頂，draw call 預算）
    const flying = lost.map((f, i) => {
      const g = ghosts[Math.min(i, ghosts.length - 1)];
      const from = st.top(g, new THREE.Vector3()); from.y += 0.14;
      const to = st.top(f, new THREE.Vector3()); to.y += 0.13;
      return { f, from, to, mesh: st.icon(st.kind, from, { color: C.hot, inkColor: C.ink, opacity: 0 }) };
    });
    // 地面錯亂腳印：同一個 kind 壓平貼桌、近黑不規則（陰氣的「不規則暗斑」，InstancedMesh = 1 個 draw call）
    const prints = [];
    const rolls = [];
    lost.forEach((f) => {
      const seat = st.foot(f, new THREE.Vector3());
      for (let j = 0; j < 3; j++) {
        const a = st.rnd() * Math.PI * 2, r = 0.14 + 0.22 * st.rnd();
        prints.push(new THREE.Vector3(seat.x + Math.cos(a) * r, st.tableY + 0.004, seat.z + Math.sin(a) * r));
        rolls.push(st.rnd() * Math.PI * 2);
      }
    });
    const stain = prints.length ? st.icons(st.kind, prints, { flat: true, rolls, color: C.ink, opacity: 0 }) : null;

    st.phase('windup');
    /* ① 帽尖後仰蓄勢（windup）：陰氣＝出招前一拍完全靜止、拍子卡頓，四尊錯開 */
    ghosts.forEach((g, i) => {
      st.tween({ ms: W * 0.9, delay: i * W * 0.06, ease: 'out', update(t, e) { point(g, -0.62 * e); st.rim(g, 1 + 0.5 * e); } });
      st.tween({ ms: TL * 0.5, delay: T0 + i * W * 0.06, ease: 'strike', update(t, e) { // 往前猛地一點
        const k = -0.62 + 1.58 * e;
        point(g, k); st.move(g, fwd[i].x * 0.11 * Math.max(0, k), 0, fwd[i].z * 0.11 * Math.max(0, k));
        st.rim(g, 1.5 + 0.9 * e);
      } });
      // 收勢的錯開要從 ms 裡扣回來，否則最後一尊的 horizon 會超出 LAST（tier 1 下 rate 立刻 >1）
      st.tween({ ms: LAST - R0 - i * W * 0.03, delay: R0 + i * W * 0.03, ease: 'inout', update(t, e) { // 帽落回
        const k = 0.96 * (1 - e);
        point(g, k); st.move(g, fwd[i].x * 0.11 * k, 0, fwd[i].z * 0.11 * k); st.rim(g, 1 + 1.4 * (1 - e));
      } });
    });
    // 帽徽記在蓄勢末才浮現（陰氣不補間：一格到位）
    flying.forEach((F, i) => st.tween({ ms: W * 0.28, delay: W * 0.62 + i * W * 0.05, ease: 'out', update(t, e) {
      st.alpha(F.mesh, e); st.iconScale(F.mesh, 0.55 + 0.45 * e);
    }, done() { if (i === 0) st.phase('travel'); } }));
    /* ② 紅帽飛過去扣在頭上（travel）——原本這一段完全沒有飛行物 */
    flying.forEach((F, i) => st.trail(F.mesh, F.from, F.to, {
      ms: TL * 0.68, delay: T0 + TL * 0.22 + i * TL * 0.1, ease: 'in', arc: 0.26, spin: 3.1,
      color: C.line, opacity: 0.8, segs: 10,
      done() {
        if (i === 0) st.phase('react');
        st.burst(F.to, { power: 0.55, n: 26, color: C.hot });
      },
    }));
    /* ③ 迷途（react）：原地打轉＋踉蹌位移＋地面錯亂腳印浮出來 */
    if (stain) {
      st.fade(stain, { ms: RL * 0.3, delay: R0, from: 0, to: 0.9 });
      st.fade(stain, { ms: RL * 0.45, delay: R0 + RL * 0.5, from: 0.9, to: 0 });
    }
    lost.forEach((f, i) => {
      const sway = st.toward(f, new THREE.Vector3());
      st.tween({ ms: RL * 0.95, delay: R0 + i * RL * 0.08, ease: 'linear', update(t) {
        const w = Math.sin(Math.PI * t);
        st.spin(f, 0, w * (0.62 + 0.2 * i) * Math.sin(t * Math.PI * 2.5), 0);
        // 踉蹌：只有轉圈不算反應（因果門檻量 move／scale），迷路的人會走歪
        st.move(f, sway.x * 0.075 * w * Math.sin(t * Math.PI * 3), 0, sway.z * 0.075 * w * Math.sin(t * Math.PI * 3));
        st.rim(f, 1 - 0.45 * w);
      } });
      // 頭上那頂帽子跟著它晃（印記的功能，但沿用飛過來的那一頂，不再多開一個 mesh）
      const F = flying[i];
      if (F) {
        st.tween({ ms: RL * 0.62, delay: R0 + i * RL * 0.08, ease: 'linear', update(t) {
          st.top(f, F.mesh.position); F.mesh.position.y += 0.13 + 0.03 * Math.sin(t * Math.PI * 4);
          F.mesh.userData.fxRoll = 3.1 + t * Math.PI * 2;
        } });
        st.fade(F.mesh, { ms: RL * 0.32, delay: R0 + RL * 0.63, from: 1, to: 0 });
      }
    });
  },
};

export const V055_SHORT = {
  // 短版與完整版共用同一支（徽記版原本就沒有 hauntLost 的專屬短版，tier 1 走同一份時間軸）
  hauntLost_v055short: V055.hauntLost_v055,
};

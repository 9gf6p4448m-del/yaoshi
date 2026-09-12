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

/* ══ 香火系 9 支共用的兩個小零件（2026-09-13 招式演出卷批 1）══ */
const UP_Y = new THREE.Vector3(0, 1, 0);
const AX_X = new THREE.Vector3(1, 0, 0);
/** 三拍窗換算：`st.beat` 給 windup／travel／react 的毫秒窗，這裡只多算「收勢抵達點」。
 *  `frac`＝`LAST / st.ms`（預設 0.90＝語彙檔 §A5 建議值：往嚴的方向走，多出來的 2% 全給衝擊拍）。
 *  ★不得在這裡寫任何毫秒字面值★：時長的唯一來源是 index.html 的 `PW_FX.TRAIT_MS_BY_TIER`。 */
function xhBeat(st, frac) {
  const B = st.beat;
  const LAST = st.ms * (frac === undefined ? 0.90 : frac);
  return { B, W: B.windup[1], T0: B.travel[0], TL: B.travel[1] - B.travel[0], R0: B.react[0], LAST, RL: LAST - B.react[0] };
}

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
     ★2026-09-13 招式演出卷・香火系批 1★
     語彙：`2026-09-12-fx-vocab-draft.md` §C2 第 2 列；`MOVE_SPEC.eliteCleave = { 丁, 掃, 退 }`。

     三件（計畫 §3）：
       **本體動作＝掃**（§C 散文寫「劈」，正規化到香火動詞庫的「掃」＝旗面／劍弧橫過整排）：
         `RArm1Rt`／`RArm1El` 舉劍蓄 → 一格劈落，`Chest` 側擰、整尊往前踏半步。
       **道具**＝丁 儀仗金器：**斬擊弧**（`blade`，鎏金厚片弧，`st.paperStamp` 實體＋`st.trail` 殘影）
         ——先從劍尖飛到對面，再**橫掃過整排**。
       **受招方反應＝退**：整排逐隻 `st.flinch` stagger＋火星。

     ★短版不得砍掉斬擊弧★（§C2 區分點）：全 27 支裡短版掉最多的一支，
     0.54 的做法是把 410ms 的劍光整段砍掉、兩位讀者短版都認不出。
     現在 t1／t2 共用這一支函式、時間軸全由 `st.beat` 換算 ⇒ **短版不可能單獨砍掉某一段**。
     ★手刻的加色劍光平面（`PlaneGeometry` ＋ `st.glow`，繞腳下軸旋轉）整組退役★：
     那是「純色無光照 billboard 當主視覺」（§3 禁區第 1 條），換成有厚度的紙紮弧。 */
  eliteCleave(st) {
    const { W, T0, TL, R0, LAST, RL } = xhBeat(st, 0.90);
    const C = st.colors;
    const gen = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const foes = st.target.slice();
    const toward = st.toward(gen, new THREE.Vector3());
    const tip = st.worldOf(gen, 'BladeTip', new THREE.Vector3());
    if (!tip.lengthSq()) { st.worldOf(gen, null, tip); tip.y += 0.45; }
    /* 整排的兩端：弧要「橫過整排」，所以落點取對面最外側的兩隻（只有一隻時就退成它自己 ±0.5）。 */
    const pts = foes.map((f) => st.worldOf(f, null, new THREE.Vector3()));
    const head = pts.length ? pts[0].clone() : tip.clone().addScaledVector(st.dir, 1.4);
    const tail = pts.length ? pts[pts.length - 1].clone() : head.clone();
    if (pts.length < 2) { head.z -= 0.55; tail.z += 0.55; }
    head.y += 0.42; tail.y += 0.42;

    // ── 丁 斬擊弧：鎏金面＋ink 墨線邊的實體（不是加色平面）──
    const arc = st.paperStamp(st.kind, tip, { role: 'stamp', color: C.key, inkColor: C.ink,
      opacity: 0, depth: 0.20, warp: 0.12, tiltDeg: 8, yawDeg: -14 });
    arc.scale.setScalar(st.iconSize * 0.55);

    /* ① 舉劍（windup）：右臂高舉、胸口後仰側擰、邊光大亮；弧在劍尖長出來 */
    st.phase('windup');
    st.tween({ ms: W, ease: 'out', update(t, e) {
      st.rot(gen, 'RArm1Rt', -1.1 * e, 0, 0.25 * e); st.rot(gen, 'RArm1El', -0.5 * e);
      st.rot(gen, 'Chest', -0.12 * e, -0.30 * e, 0); st.rot(gen, 'HeadRoot', -0.10 * e);
      st.rot(gen, 'BladeRoot', -0.22 * e); st.rot(gen, 'Blade1', -0.16 * e); st.rot(gen, 'Blade2', -0.12 * e); st.rot(gen, 'BladeTip', -0.10 * e);
      st.rim(gen, 1 + 2.4 * e); // 劍身邊光暴亮（整尊 rim；逐骨邊光引擎層做不到）
      st.alpha(arc, Math.min(1, e * 2.4));
      arc.scale.setScalar(st.iconSize * (0.55 + 0.35 * e));
    }, done() { st.phase('travel'); } });

    /* ② 劈落＋弧飛到對面（travel 前段）→ 橫掃整排（travel 後段）
       ★位移來源★：`evalPhases` 量的是 mesh.position，所以弧要真的跨過兩軍之間那一段
       （只靠「橫掃整排」在 1v1 下位移不夠，門檻是 travelDist×0.40）。 */
    st.tween({ ms: TL * 0.34, delay: T0, ease: 'in', update(t, e) {
      st.rot(gen, 'RArm1Rt', -1.1 + 1.9 * e, 0, 0.25 - 0.60 * e); st.rot(gen, 'RArm1El', -0.5 + 0.3 * e);
      st.rot(gen, 'Chest', -0.12 + 0.30 * e, -0.30 + 0.75 * e, 0); st.rot(gen, 'HeadRoot', -0.10 + 0.20 * e);
      st.rot(gen, 'BladeRoot', -0.22 + 0.46 * e); st.rot(gen, 'Blade1', -0.16 + 0.34 * e); st.rot(gen, 'Blade2', -0.12 + 0.26 * e); st.rot(gen, 'BladeTip', -0.10 + 0.22 * e);
      st.move(gen, toward.x * 0.20 * e, 0, toward.z * 0.20 * e);
    } });
    /* 第 1 輪看圖改的：飛過去那一段**不畫拖尾**。`st.trail` 的線是 WebGL 的 1px LineBasic，
       從出招方一路連到對面就是盲讀原話的「一條白色虛線」（§B2 禁：MAT_LINE 只能當殘影、不能當主體）。
       橫掃那一段留著——那條才是「斬擊的軌跡」，是這一招的辨識點，但透明度再降一階。 */
    st.trail(arc, tip, head, { ms: TL * 0.46, delay: T0, ease: 'in', trail: false, arc: 0.12 });
    st.tween({ ms: TL * 0.46, delay: T0, ease: 'in', update(t, e) { arc.scale.setScalar(st.iconSize * (0.90 + 0.42 * e)); } });
    /* 橫掃：從整排的一端劃到另一端；`spin` 讓弧跟著掃的方向轉，不是平移一塊板 */
    st.trail(arc, head, tail, { ms: TL * 0.54, delay: T0 + TL * 0.46, ease: 'out', color: C.line, opacity: 0.30, segs: 12, spin: 0.9,
      done() {
        /* ★衝擊拍★：劍到底＝弧掃過整排＝第一隻同幀後退 */
        st.phase('react');
        st.punch(0.62);
        st.burst(head, { power: 1.0, n: 60, color: C.hot });
      } });

    /* ③ 整排逐隻退（react）＋火星；弧在掃完之後才淡出 */
    /* stagger 用**整段 react 的 40% 去分給 N 隻**，不是每隻固定一個比例：
       8v8 時固定比例會把最後一隻推到 react 之外，t1 下 `fill` 超過 0.90、`maxRate` 破 1.0
       （實測 rate 1.0315／fill 0.947 判紅）。逐隻的火星也拿掉了——`st.at` 每叫一次就替
       「回呼裡即將排的 tween」預留 `TFX.atReserve`（160ms×k），8 隻就是把 horizon 推爆的主因；
       衝擊拍那一發 `st.burst` 已經在 `done()` 裡，整排的「退」靠 flinch＋縮＋邊光表現。 */
    const stag = RL * 0.40 / Math.max(1, foes.length);
    st.flinch(foes, { delay: R0, ms: RL * 0.6, stagger: stag, strength: 1.4, burst: false });
    foes.forEach((f, i) => st.tween({ ms: RL * 0.5, delay: R0 + i * stag, ease: 'snap', update(t, e) {
      st.scale(f, 1 - 0.07 * e); st.rim(f, 1 + 2.2 * e);
    } }));
    st.tween({ ms: RL * 0.5, delay: R0, ease: 'out', update(t, e) { arc.scale.setScalar(st.iconSize * (1.32 - 0.5 * e)); } });
    st.fade(arc, { ms: RL * 0.5, delay: R0 + RL * 0.2, from: 1, to: 0 });

    /* 收勢：收劍 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.rot(gen, 'RArm1Rt', 0.8 * k, 0, -0.35 * k); st.rot(gen, 'RArm1El', -0.2 * k);
      st.rot(gen, 'Chest', 0.18 * k, 0.45 * k, 0); st.rot(gen, 'HeadRoot', 0.10 * k);
      st.rot(gen, 'BladeRoot', 0.24 * k); st.rot(gen, 'Blade1', 0.18 * k); st.rot(gen, 'Blade2', 0.14 * k); st.rot(gen, 'BladeTip', 0.12 * k);
      st.move(gen, toward.x * 0.20 * k, 0, toward.z * 0.20 * k);
      st.rim(gen, 1 + 2.4 * k);
    } });
  },

  /* 媽祖令旗・令旗改陣（flag，護法×2）：二拍本方全體 atk+1。
     ★2026-09-13 招式演出卷・香火系批 1★
     語彙：`2026-09-12-fx-vocab-draft.md` §C2 第 1 列；`MOVE_SPEC.wardAtkAll1 = { 乙, 掃, 升 }`。

     三件（計畫 §3）：
       **本體動作＝掃**：`FlagMast` 後倒蓄 → 猛甩，`Withers`／`Chest`／`HeadRoot`／`TailRoot` 跟著甩過整排。
       **道具**＝乙 符旗：**一面金紅大旗**（`flag`，`st.paperStamp` 絹旗厚片＋鎏金面＋硃紅墨線＋翹曲），
         ★**從常駐旗桿上展開脫離**★ 再掃過本方整排。
       **受益方反應＝升**：各尊側踏半步（現況已有）＋**頭頂蓋一枚旗印**＋邊光。

     ★區分點（§C2）★：一面**大**旗掃過，與五營旗的五面**小**旗分開；
     ★令波環（兩道 `st.ring` 自旗下推出）整組退役★——19/27 支共用的腳下光環正是盲讀 B 類失敗的成因。
     ★旗必須脫離常駐旗桿★：不脫離就是 A 類失敗（常駐造型當特效，兩位讀者各猜錯兩次）。
     ★tier 1（300ms）／tier 2（900ms）共用這一支函式★。 */
  wardAtkAll1(st) {
    const { W, T0, TL, R0, LAST, RL } = xhBeat(st, 0.90);
    const C = st.colors;
    const mine = st.actor.slice();
    const lead = mine[0];
    const mast = st.worldOf(lead, 'FlagMast', new THREE.Vector3());
    if (!mast.lengthSq()) { st.top(lead, mast); }
    mast.y += 0.18;
    /* 掃過本方整排：從隊伍的一端劃到另一端（只有一尊時就以它為中心左右各半步）。 */
    const pts = mine.map((f) => st.worldOf(f, null, new THREE.Vector3()));
    const from = pts[0].clone(), to = pts[pts.length - 1].clone();
    if (pts.length < 2) { from.z -= 0.62; to.z += 0.62; }
    from.y += 0.50; to.y += 0.50;
    /* 旗掃的那一段往鏡頭推一個身位：對決機位在世界 +X，推近之後同樣的世界尺寸在畫面上更大。
       ★這是 P3 與 §A3 打架時的解★——大旗要再放大才夠 0.8% 面積，但 `flag` 這一尊 figH 只有 1.42、
       放大就破 2/3 的尺寸上限。改成「旗掃過本方陣前」（本來就該離鏡頭近）：世界尺寸不動、像素變多。 */
    from.addScaledVector(TOWARD_CAM, 1.6); to.addScaledVector(TOWARD_CAM, 1.6);

    // ── 乙 大旗：鎏金面＋硃紅墨線的絹旗厚片（不是加色平面）──
    const banner = st.paperStamp(st.kind, mast, { role: 'stamp', color: C.key, inkColor: C.hot,
      opacity: 0, depth: 0.18, warp: 0.16, tiltDeg: 6, yawDeg: -20 });
    banner.scale.setScalar(st.iconSize * 0.30);

    // ── 受益方頭上的旗印（react 的證據，跟著那一尊走）──
    const marks = mine.map((f) => {
      const m = st.paperStamp(st.kind, st.top(f, new THREE.Vector3()), { color: C.key, inkColor: C.hot,
        opacity: 0, depth: 0.18, warp: 0.16, tiltDeg: 14, yawDeg: -24, follow: f, at: 'top', off: TOWARD_CAM });
      m.scale.setScalar(st.markSize * 1.0);
      return m;
    });

    /* ① 壓身舉旗（windup）：旗桿後倒蓄、獸首抬起張口、尾豎；旗面在桿頭「展開」 */
    st.phase('windup');
    st.tween({ ms: W, ease: 'out', update(t, e) {
      st.rot(lead, 'FlagMast', 0.6 * e, 0, -0.38 * e);
      st.rot(lead, 'Withers', -0.18 * e); st.rot(lead, 'Chest', -0.10 * e);
      st.rot(lead, 'HeadRoot', -0.24 * e); st.rot(lead, 'JawRoot', 0.34 * e); st.rot(lead, 'Jaw1', 0.20 * e);
      st.rot(lead, 'TailRoot', 0.42 * e); st.rot(lead, 'Tail1', 0.30 * e); st.rot(lead, 'Tail2', 0.20 * e);
      st.rim(lead, 1 + 1.4 * e);
      st.alpha(banner, Math.min(1, e * 2.2));
      banner.scale.setScalar(st.iconSize * (0.30 + 0.50 * e)); // 展開＝從桿上長出來
      banner.userData.fxRoll = 0.30 * (1 - e);
    }, done() { st.phase('travel'); } });

    /* ② 猛甩（travel）：旗脫離旗桿、掃過本方整排 */
    st.tween({ ms: TL * 0.42, delay: T0, ease: 'outQuint', update(t, e) {
      st.rot(lead, 'FlagMast', 0.6 - 1.45 * e, 0, -0.38 + 0.72 * e);
      st.rot(lead, 'Withers', -0.18 + 0.34 * e); st.rot(lead, 'Chest', -0.10 + 0.22 * e);
      st.rot(lead, 'HeadRoot', -0.24 + 0.38 * e); st.rot(lead, 'JawRoot', 0.34 - 0.34 * e); st.rot(lead, 'Jaw1', 0.20 - 0.20 * e);
      st.rot(lead, 'TailRoot', 0.42 - 0.50 * e); st.rot(lead, 'Tail1', 0.30 - 0.40 * e); st.rot(lead, 'Tail2', 0.20 - 0.30 * e);
    } });
    /* 旗先離桿往前甩出去（這一段給 travel 的位移），再橫掃整排 */
    st.trail(banner, mast, from, { ms: TL * 0.44, delay: T0, ease: 'out', trail: false, arc: 0.16 });
    /* 峰值收在 1.00×iconSize：Q5 治具實測 1.22 倍時大旗的世界包圍盒 1.1508 對 figH 1.4201＝**0.81**，
       明顯超過 §A3 的 2/3（flag 這一尊本來就矮）。記錄項不擋批，但明顯超過要自己抓。 */
    st.tween({ ms: TL * 0.44, delay: T0, ease: 'out', update(t, e) { banner.scale.setScalar(st.iconSize * (0.80 + 0.20 * e)); } });
    st.trail(banner, from, to, { ms: TL * 0.56, delay: T0 + TL * 0.44, ease: 'inout', color: C.line, opacity: 0.28, segs: 12, spin: 0.7,
      done() {
        /* ★衝擊拍★：旗面展到滿＝掃過整排＝各尊同幀側踏 */
        st.phase('react');
        st.punch(0.40);
        st.burst(to, { power: 0.8, n: 44, color: C.key });
      } });

    /* ③ 聞令（react）：側踏半步再回、邊光同亮、頭頂各蓋一枚旗印 */
    const stag = RL * 0.36 / Math.max(1, mine.length);
    mine.forEach((f, i) => {
      const fwd = st.toward(f, new THREE.Vector3());
      const lat = new THREE.Vector3(fwd.z, 0, -fwd.x);
      const k = (i % 2 ? -1 : 1) * (0.12 + 0.05 * st.rnd());
      st.tween({ ms: RL * 0.6, delay: R0 + i * stag, ease: 'pulse', update(t, e) {
        st.move(f, lat.x * k * e + fwd.x * 0.07 * e, 0, lat.z * k * e + fwd.z * 0.07 * e);
        st.rim(f, 1 + 1.5 * e);
      } });
    });
    marks.forEach((m, i) => {
      st.fade(m, { ms: RL * 0.20, delay: R0 + i * stag, from: 0, to: 1 });
      st.tween({ ms: RL * 0.46, delay: R0 + i * stag, ease: 'back', update(t, e) { m.scale.setScalar(st.markSize * (1.55 - 0.70 * e)); } });
      st.fade(m, { ms: RL * 0.34, delay: R0 + RL * 0.62, from: 1, to: 0 });
    });
    st.tween({ ms: RL * 0.5, delay: R0, ease: 'out', update(t, e) { banner.scale.setScalar(st.iconSize * (1.00 - 0.38 * e)); } });
    st.fade(banner, { ms: RL * 0.5, delay: R0 + RL * 0.18, from: 1, to: 0 });

    /* 收勢：收旗 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.rot(lead, 'FlagMast', -0.85 * k, 0, 0.34 * k);
      st.rot(lead, 'Withers', 0.16 * k); st.rot(lead, 'Chest', 0.12 * k);
      st.rot(lead, 'HeadRoot', 0.14 * k); st.rot(lead, 'TailRoot', -0.08 * k); st.rot(lead, 'Tail1', -0.10 * k); st.rot(lead, 'Tail2', -0.10 * k);
      st.rim(lead, 1 + 1.4 * k);
    } });
  },

  /* 送王船・送王船（wangchuan，護法×2）：二拍吸收對面本拍首 4 點傷害。
     ★2026-09-13 招式演出卷・香火系批 1★
     語彙：`2026-09-12-fx-vocab-draft.md` §C2 第 3 列；`MOVE_SPEC.wardAbsorb4 = { 乙, 降, 升 }`。

     三件（計畫 §3）：
       **本體動作＝降**：`SternRise`／`MidShip`／`BowRise`／`BowTip` 船身前滑半身位、
         `MastTop`／`Mast1`–`Mast4` 桅頂燃火、船上七尊人偶依序轉身朝前。
       **道具**＝乙 符旗（帆）：**四面金箔帆**（`boat` ×4，`st.paperProps` 一個 draw call）
         從桅頂飛到本方陣前、**圍成同心方框**——★不是 `dome`★。
       **受益方反應＝升**：本方邊光轉暖＋托起，被吸收的傷害演成**紙錢向上飄走**（`st.burst` 向上）。

     ★區分點（§C2）★：**同心方框**是香火專屬形狀，與巴冷的珠圈、百步蛇的菱紋帶三方分開。
     ★`st.dome` 半圓罩與 `st.disc` 貼地光盤整組退役★：`dome` 在 §10.5 已標 retired
     （讀者把它讀成山神庇佑），`disc` 是 19/27 共用的腳下語彙。
     ★tier 1（300ms）／tier 2（900ms）共用這一支函式★。 */
  wardAbsorb4(st) {
    const { W, T0, TL, R0, LAST, RL } = xhBeat(st, 0.90);
    const C = st.colors;
    const ships = st.actor.slice();
    const lead = ships[0];
    const fwd = st.toward(lead, new THREE.Vector3());
    const dolls = ['FigA', 'FigB', 'FigC', 'FigD', 'FigE', 'FigF', 'FigG'];
    const mastTop = st.worldOf(lead, 'MastTop', new THREE.Vector3());
    if (!mastTop.lengthSq()) st.top(lead, mastTop);
    /* 罩的落點＝本方質心往鏡頭推一點（同媽祖令旗：世界尺寸不動、畫面像素變多） */
    const guardAt = new THREE.Vector3();
    ships.forEach((f) => guardAt.add(st.worldOf(f, null, new THREE.Vector3())));
    guardAt.multiplyScalar(1 / ships.length);
    guardAt.y += 0.30;
    /* ★落點是「**陣前**」不是「頭上」★：`evalPhases` 量的是 spawn 物的位移，
       原本只從桅頂挪到本方質心上方，距離不到門檻（travelDist×0.40，這支招沒有敵方目標 ⇒ 退成 1.0），
       實測 phases 只記到 windup／react、travel 整段漏掉。往對面推 0.85 之後就是
       「船前滑、帆擋在陣前」——語意也比較對。再往鏡頭推一點（同媽祖令旗）。 */
    /* ★方向要用 `st.dir`（世界空間朝對面）不是 `st.toward()`★：後者回傳的是 **group 空間**的朝向，
       給 `st.move` 用的；直接加到世界座標上會把帆推到畫面另一側（實測：帆飛到離敵方最遠的那一邊）。 */
    guardAt.addScaledVector(st.dir, 1.35).addScaledVector(TOWARD_CAM, 1.0); // 1.35：0.85 時實測位移 1.0893 < 門檻 1.2481

    /* ── 乙 四面金箔帆：圍成同心方框（`st.paperProps`，1 draw call）──
       四面帆各站方框的一邊、面朝外；`writeSails(r, s)` 的 r＝方框半徑、s＝帆的大小。 */
    const SAILS = 3; // 正面那一片由 mainSail（st.paperStamp 實體）擔任，這三片圍另外三邊
    const sails = st.paperProps(st.kind, SAILS, { shape: 'emblem', color: C.key, inkColor: C.hot,
      opacity: 0, k: 1.6, depth: 0.16, warp: 0.12 });
    sails.obj.position.copy(mastTop);
    const _qs = new THREE.Quaternion();
    const writeSails = (r, s) => {
      for (let i = 0; i < SAILS; i++) {
        const a = (i + 1) * Math.PI / 2; // 跳過正面（留給 mainSail）
        const it = sails.items[i];
        it.p.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        it.q.copy(_qs.setFromAxisAngle(UP_Y, -a)); // 面朝外＝方框的四面牆
        it.s = s;
      }
      sails.write();
    };
    writeSails(0.02, 0);

    /* ── 受益方身上的船印（`st.paperStamp`）──
       §B2 的反應家族「升」＝受益方上抬＋**蓋印**，`MOVE_SPEC.wardAbsorb4.react` 就是「升」。
       ★另一個理由是量測★：L3 的 `fxVis` 只切 `emblem:`／`mark:`／`trail`，
       四面帆走的是 `prop:`（群體道具，刻意不進量測對象，見 st.paperProps 的註解），
       所以這一招原本一個可量的物件都沒有——實測 `hidden:0`／`dead:true`／`area 0.0%`。 */
    /* ── 主帆（正面那一片）：走 `st.paperStamp` 而不是 paperProps ──
       ★理由是量測與辨識兩件★：① `fxVis`（L3 的量測對象）只切 `emblem:`／`mark:`／`trail`，
       四面帆若全走 `prop:` 這一招在 travel 中點就一個可量物件都沒有（實測 area 0.0%）；
       ② 正面那片是讀者真的看得清楚的那一片，用有墨線邊的實體比一片平色好認。
       視覺上仍是「四面帆圍成同心方框」。 */
    const mainSail = st.paperStamp(st.kind, mastTop, { role: 'stamp', color: C.key, inkColor: C.hot,
      opacity: 0, depth: 0.18, warp: 0.14, tiltDeg: 8, yawDeg: -16 });
    mainSail.scale.setScalar(st.iconSize * 0.45);

    const marks = ships.map((f) => {
      const m = st.paperStamp(st.kind, st.worldOf(f, null, new THREE.Vector3()), { color: C.key, inkColor: C.hot,
        opacity: 0, depth: 0.18, warp: 0.14, tiltDeg: 12, yawDeg: -22, follow: f, off: TOWARD_CAM });
      m.scale.setScalar(st.markSize * 1.0);
      return m;
    });

    /* ① 離岸（windup）：船尾翹起、四節桅逐節挺直、人偶依序轉身、桅頂燃香火；帆在桅上長出來 */
    st.phase('windup');
    st.tween({ ms: W, ease: 'out', update(t, e) {
      st.rot(lead, 'SternTip', 0.16 * e); st.rot(lead, 'SternRise', 0.20 * e); st.rot(lead, 'AftMid', 0.10 * e);
      st.rot(lead, 'MidShip', -0.06 * e); st.rot(lead, 'ForeMid', -0.13 * e);
      st.rot(lead, 'Mast1', -0.07 * e); st.rot(lead, 'Mast2', -0.09 * e); st.rot(lead, 'Mast3', -0.12 * e); st.rot(lead, 'Mast4', -0.15 * e);
      st.rot(lead, 'MastTop', -0.18 * e); st.rot(lead, 'MastFoot', 0.05 * e);
      for (let i = 0; i < dolls.length; i++) {
        const k = Math.max(0, Math.min(1, (e - i * 0.06) / 0.55));
        st.rot(lead, dolls[i], 0.12 * k, 0.62 * k, 0);
      }
      st.rim(lead, 1 + 1.1 * e);
      st.worldOf(lead, 'MastTop', sails.obj.position);
      writeSails(0.02 + 0.06 * e, 0.35 * e); // 先在桅頂聚成一小疊
      st.worldOf(lead, 'MastTop', mainSail.position);
      st.alpha(mainSail, Math.min(1, e * 2.2));
      mainSail.scale.setScalar(st.iconSize * (0.45 + 0.40 * e));
    }, done() { st.phase('travel'); } });
    st.fade(sails.obj, { ms: W * 0.5, delay: W * 0.3, from: 0, to: 0.95 });

    /* ② 前滑擋在陣前（travel）：船推出半身位；四面帆**整群**從桅頂飛到本方陣前並張開成方框
       ★位移來源★：`evalPhases` 量的是 mesh.position，群體位移掛在 InstancedMesh 物件本身（§A5）。 */
    st.tween({ ms: TL * 0.66, delay: T0, ease: 'outQuint', update(t, e) {
      st.move(lead, fwd.x * 0.36 * e, 0, fwd.z * 0.36 * e);
      st.rot(lead, 'BowRise', -0.22 * e); st.rot(lead, 'BowTip', -0.30 * e);
      st.rot(lead, 'AftMid', 0.10 - 0.05 * e); st.rot(lead, 'ForeMid', -0.13 + 0.05 * e);
    } });
    if (ships[1]) {
      const f2 = st.toward(ships[1], new THREE.Vector3());
      st.tween({ ms: TL * 0.7, delay: T0 + TL * 0.2, ease: 'outQuint', update(t, e) {
        st.move(ships[1], f2.x * 0.17 * e, 0, f2.z * 0.17 * e); st.rim(ships[1], 1 + 1.0 * e);
      } });
    }
    st.tween({ ms: TL, delay: T0, ease: 'out',
      update(t, e) {
        sails.obj.position.lerpVectors(mastTop, guardAt, e);
        writeSails(0.08 + 0.62 * e, 0.35 + 0.65 * e); // 一小疊 → 張開成方框
        mainSail.position.lerpVectors(mastTop, guardAt, e).addScaledVector(st.dir, 0.62 * e); // 正面那一片站在方框最前（朝對面）
        mainSail.scale.setScalar(st.iconSize * (0.85 + 0.30 * e));
      },
      done() {
        /* ★衝擊拍★：帆立到位＝船前滑到底＝傷害化灰飄走 */
        st.phase('react');
        st.punch(0.36);
        st.burst(guardAt, { power: 0.9, n: 52, color: C.key }); // 紙錢／灰
      } });

    /* ③ 罩住（react）：方框微微呼吸、本方托起亮邊；灰向上飄走 */
    st.tween({ ms: RL * 0.62, delay: R0, ease: 'out', update(t, e) { writeSails(0.70 + 0.10 * Math.sin(e * Math.PI), 1 - 0.18 * e); } });
    st.fade(sails.obj, { ms: RL * 0.5, delay: R0 + RL * 0.42, from: 0.95, to: 0 });
    st.tween({ ms: RL * 0.62, delay: R0, ease: 'out', update(t, e) { mainSail.scale.setScalar(st.iconSize * (1.15 - 0.30 * e)); } });
    st.fade(mainSail, { ms: RL * 0.5, delay: R0 + RL * 0.42, from: 1, to: 0 });
    const stag = RL * 0.30 / Math.max(1, ships.length);
    ships.forEach((f, i) => st.tween({ ms: RL * 0.7, delay: R0 + i * stag, ease: 'pulse', update(t, e) {
      st.move(f, 0, 0.05 * e, 0); st.rim(f, 1 + 1.8 * e);
    } }));
    marks.forEach((m, i) => {
      st.fade(m, { ms: RL * 0.20, delay: R0 + i * stag, from: 0, to: 1 });
      st.tween({ ms: RL * 0.46, delay: R0 + i * stag, ease: 'back', update(t, e) { m.scale.setScalar(st.markSize * (1.7 - 0.7 * e)); } });
      st.fade(m, { ms: RL * 0.34, delay: R0 + RL * 0.60, from: 1, to: 0 });
    });

    /* 收勢：船退回原位、桅火收 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.move(lead, fwd.x * 0.36 * k, 0, fwd.z * 0.36 * k);
      st.rot(lead, 'SternTip', 0.16 * k); st.rot(lead, 'SternRise', 0.20 * k); st.rot(lead, 'AftMid', 0.05 * k);
      st.rot(lead, 'MidShip', -0.06 * k); st.rot(lead, 'ForeMid', -0.08 * k);
      st.rot(lead, 'Mast1', -0.07 * k); st.rot(lead, 'Mast2', -0.09 * k); st.rot(lead, 'Mast3', -0.12 * k); st.rot(lead, 'Mast4', -0.15 * k);
      st.rot(lead, 'MastTop', -0.18 * k); st.rot(lead, 'MastFoot', 0.05 * k);
      st.rot(lead, 'BowRise', -0.22 * k); st.rot(lead, 'BowTip', -0.30 * k);
      for (let i = 0; i < dolls.length; i++) st.rot(lead, dolls[i], 0.12 * k, 0.62 * k, 0);
      st.rim(lead, 1 + 1.1 * k);
      if (ships[1]) { const f2 = st.toward(ships[1], _b); st.move(ships[1], f2.x * 0.17 * k, 0, f2.z * 0.17 * k); st.rim(ships[1], 1 + 1.0 * k); }
    } });
  },

  /* 千里眼銅鈴・千里眼（bell，護法×2）：本方免疫迷途。
     ★2026-09-13 招式演出卷・香火系批 1（階段 B 第 1 支）★
     語彙：`2026-09-12-fx-vocab-draft.md` §C2 第 4 列；`MOVE_SPEC.wardImmuneLost = { 丁, 震, 升 }`。

     三件（計畫 §3）：
       **本體動作＝震**：`ArmURoot`／`ArmUElbow`／`ArmUWrist` 舉鈴 → 三次甩鈴，
                        `BellLip`／`LipRoot`／`LipMid`／`LipEdge` 鈴口逐節加幅度地抖。
       **道具**＝丁 儀仗金器：**銅鈴**（`st.paperStamp`，鎏金面＋ink 墨線邊＋厚度＋翹曲，
                「望出千里」飛出去再折返）＋乙 **同心方框鈴波**（`st.paperProps` 兩圈 × 四邊＝
                8 片長條，貼桌向外推；香火專屬腳下語彙）。
       **受益方反應＝升**：同伴托起半寸＋邊光＋**頭上蓋一枚鈴印**（把被動效果演成看得見的反應）。

     ★保住「金黃鈴」★：六位盲讀讀者裡**唯一穩定認出的元素**就是這枚鎏金鈴（計畫 §1 第 1 點），
     所以鈴面走 `C.key` 鎏金、墨線邊走 `ink`——**這一支不照 §A4 的「暗面留細節、亮邊界定身分」**：
     那條是為了讓印面上的**字**讀得出來，銅鈴沒有字，剪影本身就是身分，暗面反而把它藏掉。

     ★全系唯一沒有受招方的招★（效果是被動免疫）：`react` 只能量在**受益方**身上，同一組門檻。
     ★三圈貼桌圓環退役★：原本那三圈與另外 18 支的腳下光環撞（盲讀 B 類失敗），改成同心方框。
     ★tier 1（300ms）／tier 2（900ms）共用這一支★：時間軸一律由 `st.beat`／`st.ms` 換算。 */
  wardImmuneLost(st) {
    const { W, T0, TL, R0, LAST, RL } = xhBeat(st, 0.90);
    const C = st.colors;
    const ringer = st.byBody(st.actor, 'ward')[0] || st.actor[0];
    const mates = st.actor.filter((f) => f !== ringer);
    const bless = mates.length ? mates : [ringer];
    const src = st.worldOf(ringer, 'BellRoot', new THREE.Vector3());
    if (!src.lengthSq()) st.worldOf(ringer, null, src);
    src.y += 0.10;
    const far = src.clone().addScaledVector(st.dir, 1.55); far.y += 0.30; // 望出千里（travel 的位移來源）
    const home = st.top(bless[0], new THREE.Vector3()).add(TOWARD_CAM); // 折返落點＝第一位同伴頭上

    // ── 丁 銅鈴：鎏金面＋墨線邊的實體（不是平面剪影）──
    const handbell = st.paperStamp(st.kind, src, { role: 'stamp', color: C.key, inkColor: C.ink,
      opacity: 0, depth: 0.22, warp: 0.10, tiltDeg: 10, yawDeg: -18 });
    handbell.scale.setScalar(st.iconSize * 0.40);

    // ── 乙 同心方框鈴波：兩圈 × 四邊＝8 片長條，1 個 draw call（貼桌、向外推）──
    const RINGS = 2, SIDES = 4, EDGES = RINGS * SIDES;
    const foot = st.foot(ringer, new THREE.Vector3());
    const wave = st.paperProps(st.kind, EDGES, { floor: true, color: C.key, opacity: 0, k: 1.0, ratio: 8.0, depth: 0.10, warp: 0.05 });
    wave.obj.position.copy(foot);
    const _qa = new THREE.Quaternion(), _qFlat = new THREE.Quaternion().setFromAxisAngle(AX_X, -Math.PI / 2);
    /** r0／r1＝內外兩圈的半徑；邊長跟著半徑等比（s = 2r / (ratio × markSize)） */
    const writeWave = (r0, r1) => {
      for (let i = 0; i < EDGES; i++) {
        const ring = i >> 2, side = i & 3, r = ring ? r1 : r0;
        const a = side * Math.PI / 2;
        const it = wave.items[i];
        it.p.set(Math.cos(a) * r, 0.004 * (ring + 1), Math.sin(a) * r);
        _qa.setFromAxisAngle(UP_Y, -(a + Math.PI / 2)); // 長邊垂直於半徑方向＝四邊圍成方框
        it.q.copy(_qa).multiply(_qFlat);
        it.s = Math.max(0, 2 * r / (8.0 * st.markSize));
      }
      wave.write();
    };
    writeWave(0, 0);

    // ── 受益方頭上的鈴印（react 的「證據」，跟著那一尊走）──
    const blessMarks = bless.map((f) => {
      const m = st.paperStamp(st.kind, st.top(f, new THREE.Vector3()), { color: C.key, inkColor: C.ink,
        opacity: 0, depth: 0.20, warp: 0.16, tiltDeg: 14, yawDeg: -24, follow: f, at: 'top', off: TOWARD_CAM });
      m.scale.setScalar(st.markSize * 1.1);
      return m;
    });

    /* ① 蓄勢（windup）＝震的前半：舉鈴，鈴在手上長出來 */
    st.phase('windup');
    st.tween({ ms: W * 0.42, ease: 'out', update(t, e) {
      st.rot(ringer, 'ArmURoot', -1.2 * e, 0, 0.30 * e); st.rot(ringer, 'ArmUElbow', -0.55 * e); st.rot(ringer, 'ArmUWrist', -0.28 * e);
      st.rot(ringer, 'ArmDRoot', 0.30 * e, 0, -0.22 * e); st.rot(ringer, 'ArmDElbow', -0.20 * e); st.rot(ringer, 'AxeHead', 0.25 * e);
      st.rot(ringer, 'Chest', -0.12 * e, -0.24 * e, 0); st.rot(ringer, 'NeckB', -0.18 * e); st.rot(ringer, 'Spine', -0.08 * e);
      st.rot(ringer, 'BellRoot', -0.32 * e); st.rot(ringer, 'BellStem', -0.22 * e); st.rot(ringer, 'BellShoulder', -0.12 * e);
      st.rim(ringer, 1 + 1.2 * e);
      st.alpha(handbell, Math.min(1, e * 2.2));
      handbell.scale.setScalar(st.iconSize * (0.40 + 0.34 * e));
    } });
    /* ②-a 震的後半（windup 末）：三次甩鈴，鈴口逐節加幅度（LipEdge 最大） */
    st.tween({ ms: W * 0.6, delay: W * 0.4, ease: 'linear',
      update(t) {
        const s = Math.sin(t * Math.PI * 3) * (1 - t * 0.4);
        st.rot(ringer, 'ArmURoot', -1.2, 0, 0.30 + 0.26 * s); st.rot(ringer, 'ArmUWrist', -0.28, 0, 0.50 * s); st.rot(ringer, 'ArmUHand', 0, 0, 0.40 * s);
        st.rot(ringer, 'BellRoot', -0.32, 0, 0.55 * s); st.rot(ringer, 'BellStem', -0.22, 0, 0.45 * s); st.rot(ringer, 'BellWaist', 0, 0, 0.35 * s);
        st.rot(ringer, 'BellLip', 0, 0, 0.50 * s); st.rot(ringer, 'LipRoot', 0, 0, 0.55 * s); st.rot(ringer, 'LipMid', 0, 0, 0.70 * s); st.rot(ringer, 'LipEdge', 0, 0, 0.90 * s);
        st.rot(ringer, 'SkirtRoot', 0, 0, 0.09 * s); st.rot(ringer, 'Skirt1', 0, 0, 0.13 * s); st.rot(ringer, 'SkirtHem', 0, 0, 0.18 * s);
        handbell.userData.fxRoll = 0.35 * s;
      },
      done() { st.phase('travel'); st.burst(src, { power: 0.55, n: 28, color: C.line }); } });

    /* ② 望出千里（travel）：鈴飛出去 →（停一格）→ 折返到同伴頭上；方框鈴波同時向外推 */
    st.trail(handbell, src, far, { ms: TL * 0.52, delay: T0, ease: 'out', color: C.line, opacity: 0.55, segs: 12 });
    /* ★中間留 0.1×TL 的停格★（0.55 量到的坑，原封保留）：飛到最遠點就立刻折返時，
       逐幀取樣很可能整幀跳過最遠點，travel 的位移量測會少掉最後一小段。 */
    st.trail(handbell, far, home, { ms: TL * 0.38, delay: T0 + TL * 0.62, ease: 'in', color: C.line, opacity: 0.45, segs: 12,
      done() {
        /* ★衝擊拍★：鈴抵達同伴頭上＝方框推到最遠＝同伴同幀被托起 */
        st.phase('react');
        st.burst(home, { power: 0.7, n: 40, color: C.key });
        st.punch(0.34);
      } });
    st.tween({ ms: TL, delay: T0, ease: 'out', update(t, e) { writeWave(0.26 + 0.44 * e, 0.08 + 0.42 * e); } });
    st.fade(wave.obj, { ms: TL * 0.3, delay: T0, from: 0, to: 0.62 });
    /* 鈴一邊飛一邊**放大**：「望出千里」＝聲音傳得越遠、鈴在畫面上越大。
       ★這一條是 P3 逼出來的★：L3 的凍幀寫死在 travel 中點，那一格畫面上只有飛行中的鈴與拖尾，
       原本 0.74 倍的鈴在 844×390 上只有 **0.6021%** 面積／ΔE 中位 **26.86**（門檻 0.8%／28，兩項都差一點）。
       放大到 1.15 倍之後實測 **area 1.3127%／ΔE 中位 30.68**（t2）。**門檻一個字沒改，改的是這一招的演出**。
       ★ΔE 只比門檻高 2.7，不寬裕★：鈴是鎏金面（`C.key`）對暗紅桌面，色相接近是先天限制；
       要再拉開只能加大或換配色，兩者都會動到已經簽字的「金黃鈴」這個可辨元素，所以停在這裡並記錄。 */
    st.tween({ ms: TL, delay: T0, ease: 'linear', update(t, e) {
      const k = e < 0.62 ? 0.74 + 0.41 * (e / 0.62) : 1.15 - 0.50 * ((e - 0.62) / 0.38); // 去程放大、回程縮回
      handbell.scale.setScalar(st.iconSize * k);
      handbell.userData.fxRoll = 0.22 * Math.sin(e * Math.PI * 2); // 飛行中微轉，不要一路給鏡頭看同一面
    } });

    /* ③ 護到誰看得見（react）：鈴化進同伴頭上的鈴印、同伴托起半寸 */
    /* ★第 2 輪看圖改的★：鈴的朝向是 spawn 當下凍住的（`st.paperStamp` 不 billboard），
       折返飛回同伴頭上時鏡頭看到的是它的**背面**＝一整塊 ink 暗色，連拍上讀成「頭上一個黑塊」。
       所以折返段就讓鈴淡出、由同伴頭上那枚正面朝鏡頭的鈴印接手。
       P3 的凍幀在 travel 中點（去程、鈴最大最正面那一段），不受這個淡出影響。 */
    st.fade(handbell, { ms: TL * 0.38, delay: T0 + TL * 0.62, from: 1, to: 0.18 });
    st.fade(handbell, { ms: RL * 0.26, delay: R0, from: 0.18, to: 0 });
    st.tween({ ms: RL * 0.55, delay: R0, ease: 'out', update(t, e) { writeWave(0.70 + 0.35 * e, 0.50 + 0.35 * e); } });
    st.fade(wave.obj, { ms: RL * 0.55, delay: R0, from: 0.62, to: 0 });
    blessMarks.forEach((m, i) => {
      st.fade(m, { ms: RL * 0.22, delay: R0 + i * RL * 0.08, from: 0, to: 1 });
      st.tween({ ms: RL * 0.5, delay: R0 + i * RL * 0.08, ease: 'back', update(t, e) { m.scale.setScalar(st.markSize * (1.9 - 0.8 * e)); } });
      st.fade(m, { ms: RL * 0.38, delay: R0 + RL * 0.6, from: 1, to: 0 });
    });
    bless.forEach((f, i) => st.tween({ ms: RL * 0.9, delay: R0 + i * RL * 0.08, ease: 'pulse', update(t, e) {
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
     ★2026-09-13 招式演出卷・香火系批 1★
     語彙：`2026-09-12-fx-vocab-draft.md` §C2 第 5 列；`MOVE_SPEC.swarmRally = { 乙, 拍, 升 }`。

     三件（計畫 §3）：
       **本體動作＝拍**：`RArm1Rt`／`RArm1El`／`RArm1Wr` 舉旗 ＋ `RLeg1Rt`／`RLeg1Kn`／`RLeg1An` 頓足，三尊同時。
       **道具**＝乙 符旗：**五面小旗**（`banner5`）插五個方位——中央那一面走 `st.paperStamp`（實體、
         有墨線邊，也是 L3 唯一量得到的那一件），另外四面走 `st.paperProps`（1 draw call）；
         ＋腳下**貼桌方陣**（`st.paperProps` 的 `floor`，香火專屬腳下語彙）。
       **受益方反應＝升**：三尊同時托起＋邊光＋腳下方陣漲開。

     ★區分點（§C2）★：五面**小**旗成五方，與媽祖的一面**大**旗分開。
     ★中央光盤（`st.disc`）＋5 顆營火球（`st.orb`）＋5 道連線（`st.beam`）整組退役★
     ——單這一支就省 **11 個 draw call**；`orb` 在 §10.5 只留射日、`beam` 降級成拖尾。
     ★tier 1（300ms）／tier 2（900ms）共用這一支函式★。 */
  swarmRally(st) {
    const { W, T0, TL, R0, LAST, RL } = xhBeat(st, 0.90);
    const C = st.colors;
    const troops = st.actor.slice();
    const lead = troops[0];
    const top = st.worldOf(lead, 'FlagTop', new THREE.Vector3());
    if (!top.lengthSq()) st.top(lead, top);
    /* 五方的中心＝本隊腳下質心；★往對面推一段★才有 travel 的位移（見 §A5 的踩坑） */
    const hub = new THREE.Vector3();
    troops.forEach((f) => hub.add(st.foot(f, new THREE.Vector3())));
    hub.multiplyScalar(1 / troops.length);
    hub.y = st.tableY;
    /* 0.55→1.5：五方陣擺到**本隊前方**（調兵到陣前），順便給 travel 足夠的位移（門檻 travelDist×0.40，
       0.55 時實測整段漏掉）；TOWARD_CAM 2.4＝推近鏡頭，`wuying` 的兵只有 figH 1.06、
       旗照 §A3 縮到 2/3 之後在 844×390 上只剩 0.55% 面積（門檻 0.8%）——推近讓像素變多、世界尺寸不動。 */
    const ring0 = hub.clone().addScaledVector(st.dir, 1.5).addScaledVector(TOWARD_CAM, 2.4);

    /* ── 乙 五面小旗：**五面都走 `st.paperStamp`**（實體，不是 InstancedMesh 群）──
       ★為什麼不照 §A6 的「同型道具 ≥3 份一律走 InstancedMesh」★：那一條的目的是 draw call 預算，
       而預算沒破——五面各 3 片＝15 個 call，實測峰值仍在 `idle + 25` 之內（見本支的 proto-record）。
       換走實體的理由是**量測**：L3 的 `fxVis` 只切 `emblem:`／`mark:`／`trail`，
       群體道具（`prop:`）刻意不進量測對象，五面旗全走 paperProps 時這一支在 travel 中點
       只有中央那一面可量，實測 area 0.55%／門檻 0.8% 過不了（而旗已經頂到 §A3 的 2/3 上限、放不大）。
       五面各自飛到自己的方位，travel 的位移也量得到。 */
    const FLAGS = 5;
    const flagMesh = [];
    for (let i = 0; i < FLAGS; i++) {
      const m = st.paperStamp(st.kind, top, { role: 'stamp', color: C.key, inkColor: C.hot,
        opacity: 0, depth: 0.16, warp: 0.12, tiltDeg: 8, yawDeg: -26 + i * 13 });
      m.scale.setScalar(st.iconSize * 0.30);
      flagMesh.push(m);
    }
    const _fp = new THREE.Vector3();
    /** k＝0 全部聚在旗頭、1 插在五方；s＝旗的大小（乘 iconSize） */
    const placeFlags = (k, s) => {
      for (let i = 0; i < FLAGS; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
        _fp.copy(ring0).add(_a.set(Math.cos(a) * 0.80, 0.10, Math.sin(a) * 0.80));
        flagMesh[i].position.lerpVectors(top, _fp, k);
        flagMesh[i].scale.setScalar(st.iconSize * s);
      }
    };
    placeFlags(0, 0.30);

    /* ── 腳下貼桌方陣（floor 前綴＝腳下語彙，不進道具尺寸統計）── */
    const EDGES = 4;
    const plate = st.paperProps(st.kind, EDGES, { floor: true, color: C.line, opacity: 0, k: 1.0, ratio: 7.0, depth: 0.08, warp: 0.04 });
    plate.obj.position.copy(ring0);
    const _qp = new THREE.Quaternion(), _qFlat2 = new THREE.Quaternion().setFromAxisAngle(AX_X, -Math.PI / 2);
    const writePlate = (r) => {
      for (let i = 0; i < EDGES; i++) {
        const a = i * Math.PI / 2;
        const it = plate.items[i];
        it.p.set(Math.cos(a) * r, 0.006, Math.sin(a) * r);
        it.q.copy(_qp.setFromAxisAngle(UP_Y, -(a + Math.PI / 2))).multiply(_qFlat2);
        it.s = Math.max(0, 2 * r / (7.0 * st.markSize));
      }
      plate.write();
    };
    writePlate(0);

    /* ① 舉旗（windup）：右臂把令旗舉過頭、旗尾後仰、盔與頭抬起、身體擰半圈；五旗在旗頭聚成一束 */
    st.phase('windup');
    st.tween({ ms: W, ease: 'out', update(t, e) {
      st.rot(lead, 'RArm1Rt', -1.9 * e, 0, 0.30 * e); st.rot(lead, 'RArm1El', -0.35 * e); st.rot(lead, 'RArm1Wr', -0.20 * e);
      st.rot(lead, 'FlagTop', 0.50 * e, 0, -0.25 * e);
      st.rot(lead, 'Chest', -0.14 * e, 0.30 * e, 0); st.rot(lead, 'Spine', -0.08 * e, 0.16 * e, 0);
      st.rot(lead, 'NeckB', -0.14 * e); st.rot(lead, 'HeadRoot', -0.20 * e); st.rot(lead, 'HelmRoot', -0.12 * e); st.rot(lead, 'Helm1', -0.16 * e);
      st.rim(lead, 1 + 1.2 * e);
      st.worldOf(lead, 'FlagTop', top);
      placeFlags(0, 0.30 + 0.25 * e);
      flagMesh.forEach((m) => st.alpha(m, Math.min(1, e * 2.2)));
    }, done() { st.phase('travel'); } });

    /* ② 落旗（travel）：五面旗整群飛到五方、同時三尊頓足；腳下方陣跟著漲開
       ★位移來源★：群體位移掛在 InstancedMesh 物件本身，中央那一面單獨飛（§A5）。 */
    st.tween({ ms: TL * 0.5, delay: T0, ease: 'outQuint', update(t, e) {
      st.rot(lead, 'RArm1Rt', -1.9 + 1.55 * e, 0, 0.30 - 0.50 * e); st.rot(lead, 'RArm1El', -0.35 + 0.20 * e); st.rot(lead, 'RArm1Wr', -0.20 + 0.35 * e);
      st.rot(lead, 'FlagTop', 0.50 - 1.05 * e, 0, -0.25 + 0.45 * e);
      st.rot(lead, 'Chest', -0.14 + 0.26 * e, 0.30 - 0.60 * e, 0); st.rot(lead, 'Spine', -0.08 + 0.14 * e, 0.16 - 0.30 * e, 0);
      st.rot(lead, 'NeckB', -0.14 + 0.24 * e); st.rot(lead, 'HeadRoot', -0.20 + 0.30 * e); st.rot(lead, 'HelmRoot', -0.12 + 0.20 * e); st.rot(lead, 'Helm1', -0.16 + 0.26 * e);
    } });
    /* 三尊同時頓足（膝抬起再踏落） */
    troops.forEach((f, i) => st.tween({ ms: TL * 0.62, delay: T0 + i * TL * 0.06, ease: 'wind', update(t, e) {
      st.rot(f, 'RLeg1Rt', -0.55 * e); st.rot(f, 'RLeg1Kn', 0.70 * e); st.rot(f, 'RLeg1An', -0.30 * e);
      st.rot(f, 'Hips', 0.06 * e); st.rot(f, 'SkirtRoot', 0.12 * e); st.rot(f, 'Skirt1', 0.16 * e); st.rot(f, 'SkirtHem', 0.20 * e);
      st.move(f, 0, -0.05 * e, 0);
      if (i) st.rim(f, 1 + 1.3 * e);
    } }));
    st.tween({ ms: TL, delay: T0, ease: 'out',
      update(t, e) {
        placeFlags(e, 0.55 + 0.17 * e); // 峰值 0.72：0.75 時 Q5 實測 0.7335／figH 1.0577＝0.693，略超 2/3
        writePlate(0.90 * e);
      },
      done() {
        /* ★衝擊拍★：頓足落地＝五旗同時插定＝方陣同幀漲開 */
        st.phase('react');
        st.punch(0.46);
        st.burst(ring0, { power: 0.9, n: 50, color: C.key });
      } });
    st.fade(plate.obj, { ms: TL * 0.4, delay: T0 + TL * 0.3, from: 0, to: 0.6 });

    /* ③ 聞令（react）：三尊托起＋邊光；方陣再漲一點後收 */
    const stag = RL * 0.30 / Math.max(1, troops.length);
    troops.forEach((f, i) => st.tween({ ms: RL * 0.7, delay: R0 + i * stag, ease: 'pulse', update(t, e) {
      st.rot(f, 'RLeg1Rt', -0.55 * (1 - e)); st.rot(f, 'RLeg1Kn', 0.70 * (1 - e)); st.rot(f, 'RLeg1An', -0.30 * (1 - e));
      st.move(f, 0, 0.06 * e, 0); st.rim(f, 1 + 1.8 * e);
    } }));
    st.tween({ ms: RL * 0.6, delay: R0, ease: 'out', update(t, e) { writePlate(0.90 + 0.30 * e); placeFlags(1, 0.72 - 0.15 * e); } });
    st.fade(plate.obj, { ms: RL * 0.5, delay: R0 + RL * 0.45, from: 0.6, to: 0 });
    flagMesh.forEach((m) => st.fade(m, { ms: RL * 0.5, delay: R0 + RL * 0.45, from: 1, to: 0 }));

    /* 收勢：收旗 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.rot(lead, 'RArm1Rt', -0.35 * k, 0, -0.20 * k); st.rot(lead, 'RArm1El', -0.15 * k); st.rot(lead, 'RArm1Wr', 0.15 * k);
      st.rot(lead, 'FlagTop', -0.55 * k, 0, 0.20 * k);
      st.rot(lead, 'Chest', 0.12 * k, -0.30 * k, 0); st.rot(lead, 'Spine', 0.06 * k, -0.14 * k, 0);
      st.rot(lead, 'NeckB', 0.10 * k); st.rot(lead, 'HeadRoot', 0.10 * k); st.rot(lead, 'HelmRoot', 0.08 * k); st.rot(lead, 'Helm1', 0.10 * k);
      st.rim(lead, 1 + 1.2 * k);
      troops.forEach((f, i) => { if (i) st.rim(f, 1 + 1.3 * k); });
    } });
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

    /* ── 印文：落地那一刻才出現，由暗燒成硃紅，之後留在獵物身上（o.follow 走 st.stick）──
       ★變數名是 `imprint` 不是 `seal`，這一點不能改回去★：`tests/fxvocab.test.mjs` 的尺寸掃描
       是**純文字、不分作用域**的——同一個檔案裡只要有任何一處 `const seal = st.icon(…)`
       （檔尾 `V055.biteGamble_v055` 就有），`seal` 這個名字全檔都會被當成徽記，
       於是這裡合法的 `imprint.scale.setScalar(st.markSize * …)`（紙紮道具不在尺寸鎖裡，
       沒有 `st.iconScale` 可走）會被判成「尺寸的第二份來源」。實測過：叫 `seal` 時該條判紅 2 處。 */
    const imprint = prey ? st.paperStamp(st.kind, hit, { color: C.ink, inkColor: C.ink, glyphColor: C.line,
      opacity: 0, depth: 0.24, warp: 0.18, tiltDeg: 14, yawDeg: -26, glyph: true, follow: prey, off: TOWARD_CAM }) : null;
    if (imprint) imprint.scale.setScalar(st.markSize * 1.2);
    const face = imprint ? imprint.userData.fxFace : null;
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
    if (imprint && face) {
      st.fade(imprint, { ms: RL * 0.16, delay: R0, from: 0, to: 1 });
      st.tween({ ms: RL * 0.80, delay: R0, ease: 'out', update(t, e) {
        face.material.color.copy(cInk).lerp(cHot, Math.min(1, e * 1.3)); // 印文「燒」出來
        imprint.scale.setScalar(st.markSize * (2.8 - 1.1 * e));
      } });
    }
    tgPreyHit(st, prey, R0, RL, 0.14);

    st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) { tgRecover(st, cat, fwd, DIST * 0.9, 1 - e); st.rim(cat, 1 + 3.0 * (1 - e)); } });
  },

  /* 香灰符・香灰符（ashcharm，護法×2）：二拍前鋒首隻 hp+1。
     ★2026-09-13 招式演出卷・香火系批 1★
     語彙：`2026-09-12-fx-vocab-draft.md` §C2 第 7 列；`MOVE_SPEC.wardHpFirst = { 丙, 降, 升 }`。

     三件（計畫 §3）：
       **本體動作＝降**：`BHand`／`RHand1Ha`／`RElbow1El` 捧灰到胸 → 往前鋒頭頂傾倒，
         `Chest`／`Neck`／`Head` 低頭送出。
       **道具**＝丙 香火：**金灰顆粒流**（`st.paperProps` 一群紙片，★不是白煙、不是球★）
         ＋乙 **金色方符**（`talis`，`st.paperStamp` 實體，**一張落下來的符**）。
       **受益方反應＝升**：前鋒上抬＋亮邊＋身上蓋方符。

     ★區分點（§C2）★：① 顆粒流不是球——現況的白光球與另外 4 支撞；
     ② 符是**落下來的一張**，與常駐在身上的符鏈（`FuD*`／`JossT*`）分開，這是 A 類失敗的唯一解。
     ★tier 1（300ms）／tier 2（900ms）共用這一支函式★。 */
  wardHpFirst(st) {
    const { W, T0, TL, R0, LAST, RL } = xhBeat(st, 0.90);
    const C = st.colors;
    const monk = st.byBody(st.actor, 'ward')[0] || st.actor[0];
    const mate = st.actor.find((f) => f !== monk) || monk;
    const palm = st.worldOf(monk, 'RHand1Ha', new THREE.Vector3());
    if (!palm.lengthSq()) { st.worldOf(monk, null, palm); palm.y += 0.35; }
    const head = st.top(mate, new THREE.Vector3()).add(TOWARD_CAM);
    /* 灰流與符先往前送一段再落到前鋒頭上（`evalPhases` 量的是位移，原地灑落量不到）。 */
    const via = palm.clone().lerp(head, 0.5).addScaledVector(st.dir, 0.85).addScaledVector(TOWARD_CAM, 1.2);
    via.y += 0.35;

    // ── 丙 金灰顆粒流：一群紙片＝1 個 draw call（群體位移掛 InstancedMesh 物件本身，§A5）──
    const ASH = 10;
    const ash = st.paperProps(st.kind, ASH, { color: C.key, opacity: 0, k: 0.62, ratio: 0.85, depth: 0.14, warp: 0.16 });
    ash.obj.position.copy(palm);
    const _ea = new THREE.Euler();
    const grains = [];
    for (let i = 0; i < ASH; i++) {
      grains.push({
        a: new THREE.Vector3((st.rnd() - 0.5) * 0.16, (st.rnd() - 0.5) * 0.10, (st.rnd() - 0.5) * 0.16),
        b: new THREE.Vector3((st.rnd() - 0.5) * 0.42, -0.10 - 0.30 * st.rnd(), (st.rnd() - 0.5) * 0.42),
        rz: st.rnd() * 3, ry: Math.PI * 0.5 + 0.9 * st.rnd(), s: 0,
      });
    }
    const writeAsh = (k) => {
      for (let i = 0; i < ASH; i++) {
        const g = grains[i], it = ash.items[i];
        it.p.lerpVectors(g.a, g.b, k);
        it.q.setFromEuler(_ea.set(0, g.ry, g.rz));
        it.s = g.s;
      }
      ash.write();
    };
    writeAsh(0);

    // ── 乙 金色方符：一張，從掌心送出、落到前鋒身上並留住 ──
    const talis = st.paperStamp(st.kind, palm, { role: 'stamp', color: C.key, inkColor: C.hot,
      opacity: 0, depth: 0.18, warp: 0.14, tiltDeg: 10, yawDeg: -20 });
    talis.scale.setScalar(st.iconSize * 0.40);

    /* ① 捧灰到胸（windup）：兩隻手把灰捧到胸前，低頭；灰在掌心一粒粒長出來 */
    st.phase('windup');
    st.tween({ ms: W, ease: 'out', update(t, e) {
      st.rot(monk, 'RShldr1Sh', -0.42 * e); st.rot(monk, 'RElbow1El', -0.85 * e); st.rot(monk, 'RHand1Ha', -0.30 * e);
      st.rot(monk, 'BShldr', -0.30 * e); st.rot(monk, 'BElbow', -0.62 * e); st.rot(monk, 'BHand', -0.24 * e);
      st.rot(monk, 'Chest', 0.10 * e); st.rot(monk, 'Neck', 0.16 * e); st.rot(monk, 'Head', 0.20 * e);
      st.rim(monk, 1 + 1.3 * e);
      st.worldOf(monk, 'RHand1Ha', ash.obj.position);
      st.worldOf(monk, 'RHand1Ha', talis.position);
      for (let i = 0; i < ASH; i++) grains[i].s = Math.max(0, Math.min(1, (e - 0.07 * i) * 2.6));
      writeAsh(0);
      st.alpha(talis, Math.min(1, e * 2.2));
      talis.scale.setScalar(st.iconSize * (0.40 + 0.45 * e));
    }, done() { st.phase('travel'); } });
    st.fade(ash.obj, { ms: W * 0.5, delay: W * 0.3, from: 0, to: 0.95 });

    /* ② 傾倒（travel）：手往前鋒頭頂傾倒，灰流與符一起送過去 */
    st.tween({ ms: TL * 0.6, delay: T0, ease: 'outQuint', update(t, e) {
      st.rot(monk, 'RShldr1Sh', -0.42 + 0.90 * e); st.rot(monk, 'RElbow1El', -0.85 + 0.55 * e); st.rot(monk, 'RHand1Ha', -0.30 - 0.55 * e);
      st.rot(monk, 'BShldr', -0.30 + 0.50 * e); st.rot(monk, 'BElbow', -0.62 + 0.36 * e); st.rot(monk, 'BHand', -0.24 - 0.30 * e);
      st.rot(monk, 'Chest', 0.10 + 0.14 * e); st.rot(monk, 'Neck', 0.16 + 0.10 * e); st.rot(monk, 'Head', 0.20 + 0.12 * e);
    } });
    st.tween({ ms: TL, delay: T0, ease: 'in', update(t, e) {
      ash.obj.position.lerpVectors(palm, via, Math.min(1, e * 1.15));
      for (let i = 0; i < ASH; i++) grains[i].rz += 0.14;
      writeAsh(Math.min(1, e * 1.2));
    } });
    st.trail(talis, palm, via, { ms: TL, delay: T0, ease: 'in', trail: false, arc: 0.20,
      done() {
        /* ★衝擊拍★：傾倒到位＝灰流抵達＝符落定＝前鋒同幀亮邊上抬 */
        st.phase('react');
        st.punch(0.34);
        st.burst(head, { power: 0.8, n: 44, color: C.key });
      } });
    /* 符放大到 1.15×iconSize：0.98 時 P3 只有 0.6656%／0.6921%（門檻 0.8），而灰流走 prop: 不進量測對象，
       符是這一招唯一量得到的一件。放大後仍在 §A3 的 2/3 內（Q5 實測 0.555→0.651）。 */
    st.tween({ ms: TL, delay: T0, ease: 'out', update(t, e) { talis.scale.setScalar(st.iconSize * (0.85 + 0.30 * e)); } });

    /* ③ 前鋒受益（react）：符從半空落到前鋒身上並黏住、那一尊上抬亮邊；灰散掉 */
    st.stick(talis, mate, { at: 'chest', off: TOWARD_CAM });
    st.tween({ ms: RL * 0.5, delay: R0, ease: 'back', update(t, e) { talis.scale.setScalar(st.iconSize * (1.15 - 0.45 * e)); } });
    st.fade(talis, { ms: RL * 0.4, delay: R0 + RL * 0.55, from: 1, to: 0 });
    st.fade(ash.obj, { ms: RL * 0.5, delay: R0, from: 0.95, to: 0 });
    st.tween({ ms: RL * 0.8, delay: R0, ease: 'pulse', update(t, e) {
      st.move(mate, 0, 0.07 * e, 0); st.rim(mate, 1 + 2.0 * e);
    } });

    /* 收勢：收手 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.rot(monk, 'RShldr1Sh', 0.48 * k); st.rot(monk, 'RElbow1El', -0.30 * k); st.rot(monk, 'RHand1Ha', -0.85 * k);
      st.rot(monk, 'BShldr', 0.20 * k); st.rot(monk, 'BElbow', -0.26 * k); st.rot(monk, 'BHand', -0.54 * k);
      st.rot(monk, 'Chest', 0.24 * k); st.rot(monk, 'Neck', 0.26 * k); st.rot(monk, 'Head', 0.32 * k);
      st.rim(monk, 1 + 1.3 * k);
    } });
  },

  /* 福壽綿長・福壽綿長（fushou，護法×2）：每拍回 1 hp 給最傷的一隻。
     ★2026-09-13 招式演出卷・香火系批 1★
     語彙：`2026-09-12-fx-vocab-draft.md` §C2 第 8 列；`MOVE_SPEC.wardRegen1 = { 丁, 降, 升 }`。

     三件（計畫 §3）：
       **本體動作＝降**：`FlmR` 燈焰暴漲 → **脫離燈罩**往同伴降下，`Nk0`／`Nk1`／`Hd0`／`Hd1` 低頭送出。
       **道具**＝丁 儀仗金器：**燈焰**（`lamp`，`st.paperStamp` 鎏金厚片火舌）——★一件大道具★。
       **受益方反應＝升**：最傷那隻上抬＋暖邊光＋頭上蓋燈印。

     ★區分點（§C2）★：① **火舌形**，不是球（現況那顆白光球與四支撞）；
     ② 與虎爺印的金箔流分開＝**一件大道具** vs **一群小片**——所以這一支刻意不用 `st.paperProps`。
     ★tier 1（300ms）／tier 2（900ms）共用這一支函式★。 */
  wardRegen1(st) {
    const { W, T0, TL, R0, LAST, RL } = xhBeat(st, 0.90);
    const C = st.colors;
    const lamp = st.byBody(st.actor, 'ward')[0] || st.actor[0];
    const hurt = st.actor.find((f) => f !== lamp) || lamp;
    const src = st.worldOf(lamp, 'FlmR', new THREE.Vector3());
    if (!src.lengthSq()) { st.top(lamp, src); }
    const dst = st.top(hurt, new THREE.Vector3()).add(TOWARD_CAM);
    /* 燈焰不直線飛過去：先往前送一段（脫離燈罩、飄到陣中），再落到那一尊頭上。
       ★前半那一段是 travel 的位移來源★（門檻 travelDist×0.40）。 */
    const via = src.clone().lerp(dst, 0.45).addScaledVector(st.dir, 0.95).addScaledVector(TOWARD_CAM, 1.4);
    via.y += 0.42;

    // ── 丁 燈焰：鎏金面＋硃紅墨線的火舌實體（不是球）──
    const flame = st.paperStamp(st.kind, src, { role: 'stamp', color: C.key, inkColor: C.hot,
      opacity: 0, depth: 0.20, warp: 0.18, tiltDeg: 6, yawDeg: -16 });
    flame.scale.setScalar(st.iconSize * 0.35);

    // ── 受益方頭上的燈印 ──
    const seal2 = st.paperStamp(st.kind, dst, { color: C.key, inkColor: C.hot,
      opacity: 0, depth: 0.18, warp: 0.16, tiltDeg: 14, yawDeg: -24, follow: hurt, at: 'top', off: TOWARD_CAM });
    seal2.scale.setScalar(st.markSize * 1.0);

    /* ① 燈焰暴漲（windup）：燈芯拉長、整尊低頭送出 */
    st.phase('windup');
    st.tween({ ms: W, ease: 'out', update(t, e) {
      st.rot(lamp, 'FlmR', -0.28 * e); st.rot(lamp, 'Crest', -0.16 * e);
      st.rot(lamp, 'Nk0', 0.18 * e); st.rot(lamp, 'Nk1', 0.14 * e); st.rot(lamp, 'Hd0', 0.20 * e); st.rot(lamp, 'Hd1', 0.12 * e);
      st.rot(lamp, 'Sh0', -0.10 * e); st.rot(lamp, 'Sh1', -0.08 * e);
      st.rim(lamp, 1 + 1.6 * e);
      st.worldOf(lamp, 'FlmR', flame.position);
      st.alpha(flame, Math.min(1, e * 2.4));
      flame.scale.setScalar(st.iconSize * (0.35 + 0.55 * e)); // 暴漲
      flame.userData.fxRoll = 0.26 * Math.sin(e * Math.PI * 2);
    }, done() { st.phase('travel'); } });

    /* ② 脫離燈罩、飄到同伴頭上（travel） */
    st.trail(flame, src, via, { ms: TL * 0.56, delay: T0, ease: 'out', trail: false, arc: 0.26 });
    st.trail(flame, via, dst, { ms: TL * 0.44, delay: T0 + TL * 0.56, ease: 'in', color: C.line, opacity: 0.30, segs: 10,
      done() {
        /* ★衝擊拍★：燈焰抵達＝那一尊同幀亮邊上抬＝燈印落定 */
        st.phase('react');
        st.punch(0.30);
        st.burst(dst, { power: 0.8, n: 44, color: C.key });
      } });
    st.tween({ ms: TL, delay: T0, ease: 'linear', update(t, e) {
      const k = e < 0.56 ? 0.90 + 0.32 * (e / 0.56) : 1.22 - 0.30 * ((e - 0.56) / 0.44);
      flame.scale.setScalar(st.iconSize * k);
      flame.userData.fxRoll = 0.22 * Math.sin(e * Math.PI * 3); // 火舌一路搖
    } });
    st.tween({ ms: TL * 0.6, delay: T0, ease: 'inout', update(t, e) {
      st.rot(lamp, 'FlmR', -0.28 + 0.46 * e); st.rot(lamp, 'Nk0', 0.18 + 0.10 * e); st.rot(lamp, 'Hd0', 0.20 + 0.12 * e);
    } });

    /* ③ 受益（react）：那一尊上抬亮邊、頭上蓋燈印；燈焰化進印裡 */
    st.fade(flame, { ms: RL * 0.3, delay: R0, from: 1, to: 0 });
    st.fade(seal2, { ms: RL * 0.22, delay: R0, from: 0, to: 1 });
    st.tween({ ms: RL * 0.5, delay: R0, ease: 'back', update(t, e) { seal2.scale.setScalar(st.markSize * (1.9 - 0.8 * e)); } });
    st.fade(seal2, { ms: RL * 0.36, delay: R0 + RL * 0.6, from: 1, to: 0 });
    st.tween({ ms: RL * 0.85, delay: R0, ease: 'pulse', update(t, e) {
      st.move(hurt, 0, 0.075 * e, 0); st.rim(hurt, 1 + 2.1 * e);
    } });

    /* 收勢：抬頭、燈芯回位 */
    st.tween({ ms: LAST - R0, delay: R0, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.rot(lamp, 'FlmR', 0.18 * k); st.rot(lamp, 'Crest', -0.16 * k);
      st.rot(lamp, 'Nk0', 0.28 * k); st.rot(lamp, 'Nk1', 0.14 * k); st.rot(lamp, 'Hd0', 0.32 * k); st.rot(lamp, 'Hd1', 0.12 * k);
      st.rot(lamp, 'Sh0', -0.10 * k); st.rot(lamp, 'Sh1', -0.08 * k);
      st.rim(lamp, 1 + 1.6 * k);
    } });
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
  /* eliteCleave｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**：時間軸全由 st.beat／st.ms 換算，
     兩個 tier 的差別只是比例表（2026-09-13 演出卷批 1 起，香火系逐支改成這個做法）。 */
  eliteCleave: MOVES.eliteCleave,

  /* wardAtkAll1｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**：時間軸全由 st.beat／st.ms 換算，
     兩個 tier 的差別只是比例表（2026-09-13 演出卷批 1 起，香火系逐支改成這個做法）。 */
  wardAtkAll1: MOVES.wardAtkAll1,

  /* wardAbsorb4｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**：時間軸全由 st.beat／st.ms 換算，
     兩個 tier 的差別只是比例表（2026-09-13 演出卷批 1 起，香火系逐支改成這個做法）。 */
  wardAbsorb4: MOVES.wardAbsorb4,

  /* 千里眼｜tier 1 短版 = 完整版**同一支函式**（v0.55，時間軸由 st.beat 換算） */
  wardImmuneLost: MOVES.wardImmuneLost,

  /* swarmRally｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**：時間軸全由 st.beat／st.ms 換算，
     兩個 tier 的差別只是比例表（2026-09-13 演出卷批 1 起，香火系逐支改成這個做法）。 */
  swarmRally: MOVES.swarmRally,

  /* 虎爺反咬｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**：時間軸全由 st.beat／st.ms 換算，
     兩個 tier 的差別只是比例表（2026-09-12 演出卷 E 轉正後仍是這個做法）。 */
  biteGamble: MOVES.biteGamble,

  /* wardHpFirst｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**：時間軸全由 st.beat／st.ms 換算，
     兩個 tier 的差別只是比例表（2026-09-13 演出卷批 1 起，香火系逐支改成這個做法）。 */
  wardHpFirst: MOVES.wardHpFirst,

  /* wardRegen1｜tier 1 短版（300ms）＝完整版（900ms）**同一支函式**：時間軸全由 st.beat／st.ms 換算，
     兩個 tier 的差別只是比例表（2026-09-13 演出卷批 1 起，香火系逐支改成這個做法）。 */
  wardRegen1: MOVES.wardRegen1,

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

/* ★v0.55 的徽記剪影版虎爺印（`?fxvocab=1` 才跑得到）★
   2026-09-12 方向重定之後，預設路徑的 biteGamble 換成了上面那支演出版（E 轉正），
   這一份原地保留給**治具與 L3 canary**（fx-contrast／blindread-sheet 的 --fxvocab=1）：
   它是「純色 billboard 貼在紙紮 3D 上」那條路的實體，兩輪盲讀 0/3 的對照組。
   ★本體取自 0.55（原 MOVES.biteGamble）★，搬過來之後只動了三行：函式名那一行，
   ＋ v0.55.3（N11 徽記尺寸防線）把 `seal`／`stamp` 的兩處 `scale.setScalar(st.iconSize * …)`
   收斂成 `st.iconScale(…)` 那兩行——**那是 main 對這支招做的改，跟著本體一起搬**，
   不搬就等於這一支在 `?fxvocab=1` 下繞過了尺寸鎖。`_v055` 後綴的作用同 `_v054`：
   讓兩份同名演出並存，登記點（js/trait-fx.js）剝掉後綴換回 trId，分派只做一次。
   0.54 的虎爺印（`biteGamble_v054`／`_v054short`）已於本卷移除——那一版的角色是「先退回上一版」，
   演出版轉正之後就不需要那條退路了；要回頭看：git show 6a839de:js/trait-fx/xianghuo.js。 */
export const V055 = {
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
  wardImmuneLost_v055(st) {
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
      st.iconScale(bell, 0.4 + 0.6 * e);
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
        st.iconScale(seal, 0.35 + 0.75 * e); // 過衝一點再收，印才有「蓋下來」的重量
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
      st.tween({ ms: RL * 0.5, delay: R0, ease: 'back', update(t, e) { st.iconScale(stamp, 1.9 - 0.9 * e); } });
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
export const V055_SHORT = {
  biteGamble_v055: V055.biteGamble_v055,
  wardImmuneLost_v055: V055.wardImmuneLost_v055,
};
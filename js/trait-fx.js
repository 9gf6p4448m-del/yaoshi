// 妖市 3D 環境層 — 《紙紮夜戰》招式演出的舞台（卷 C3，2026-09-05）
//
// 職責：index.html 的三拍時間軸對每筆 {kind:"trait"} 事件派 `ys:fx-trait`，本檔接住、
// 依 trId 找到那一套手寫編舞（js/trait-fx/{zuling,xianghuo,yinqi}.js，27 套各自獨立），
// 把「舞台」交給它演 det.ms 毫秒，演完把所有骨骼／model／邊光還原、自訂 mesh 拆掉。
// 找不到編舞、3D 妖沒就位、編舞炸掉 → det.handled 維持 false，index.html 退回通用 fallback。
//
// 與 duel-figures.js 的分工（它每幀覆寫 group 的位置／旋轉／縮放與 setRim，所以這裡一律不碰 group）：
//   骨骼      mixer 之後疊一層 delta（bone.quaternion = mixer 的值 × delta），下一幀 mixer 之前先還原
//             （包裝 figure.update：restore → mixer.update → capture；apply 在 renderer 的主迴圈裡、
//             duelFigures.update 之後）。沒被 clip 驅動的骨骼靠 restore 才不會逐幀累加。
//   model     group.children[0]（工廠正規化過的模型）：位置／旋轉／縮放都以「開演時的值」為基準加 delta，
//             group 空間的 +Z 是模型正面＝朝對手（再往鏡頭轉 35°），stage.toward(fig) 給精確方向。
//   邊光      包裝 figure.setRim：duel-figures 每幀給的值再乘 stage.rim() 設的倍率。
//   mesh      自訂幾何（陣、環、光球、閃電）全部掛在 scene 根、由本檔記帳與 dispose；
//             材質只有兩支模板（加色 mesh／加色 line），clone 出來的共用同一支 program（審查 M-3 的教訓）。
//
// 保險絲：演出最長 ms×TFX.fuseMul，到了強制清場並 resolve；SKIP（ys:fx-trait-cancel）與 ys:duel-end
// 立刻清場。prefers-reduced-motion：骨骼／model 位移全免，只留光、粒子與 mesh 的淡入淡出。
//
// 邊界：不讀寫任何遊戲狀態、不耗 S.rng（粒子與閃電的抖動用自帶 LCG，種子＝遞增計數）。
import * as THREE from 'three';

const V = new URL(import.meta.url).search;
const { createImpactBurst, SPARK_COLOR } = await import('./particles.js' + V);
// v0.55 招式可辨性卷：特效語彙與法寶徽記的【單一事實來源】。
// 這兩支是 27 支招共用的地基，**不做 catch 退路**——載不到就讓本模組整個爆，
// 給預設色票／預設形狀等於讓「每一卷重新發明一次語彙」那個分岔重新長回來（ART_BIBLE §10 開頭）。
const { FX_PAL, BEAT, ICON, PHASE_GATE, EMBLEM_OF } = await import('./trait-fx/vocab.js' + V);
const EMBLEMS = await import('./trait-fx/emblems.js' + V);
// 一個系別檔壞掉（語法錯／404）只丟那一系的招（退回 fallback），不得拖垮本模組→renderer.js→整個 3D 層
const loadMoves = (file) => import(file + V).then((m) => ({ full: m.default || m.MOVES || {}, short: m.SHORT || {} }), () => ({ full: {}, short: {} }));
const [ZULING, XIANGHUO, YINQI] = await Promise.all([
  loadMoves('./trait-fx/zuling.js'),
  loadMoves('./trait-fx/xianghuo.js'),
  loadMoves('./trait-fx/yinqi.js'),
]);

/** trId → 編舞函式(stage)。三個系別檔各自導出自己那一系的招；鍵名＝index.html TRAITS 的 id。 */
export const TRAIT_MOVES = Object.assign(Object.create(null), ZULING.full, XIANGHUO.full, YINQI.full);
/** trId → tier 1 的 260ms 短版編舞（v0.54）。三個系別檔各 export const SHORT；三尊三招沒有短版（恆 tier 3）。
 *  缺席時 start() 退回完整版——那不是恆綠退路：完整版塞不進 260ms 會 stats.cut++，治具的 clean 立刻紅。 */
export const TRAIT_MOVES_SHORT = Object.assign(Object.create(null), ZULING.short, XIANGHUO.short, YINQI.short);

// 全部【試玩必調】
export const TFX = {
  fuseMul: 2, // 保險絲：演出最長 ms×fuseMul
  // ★下面三個常數（endMargin／atReserve／flinchMs）在 v0.54 起隨 run.k＝run.ms/det.baseMs 等比縮放★
  // 理由（凍結檔「Tier 1 短版」）：它們是絕對毫秒，260ms 的短版若還用 900ms 的預留額度，
  // atReserve 一個 st.at 就吃掉 62% 的預算、horizon 被推爆 → rate 被迫 >1（＝靠加速硬擠，F2 的 rateOK 紅）。
  // 基準值**不寫在這裡**：它由事件帶（detail.baseMs ＝ index.html 的 PW_FX.TIER_BASE_MS），
  // 在這裡放一份 900 就又是第二份事實來源了（F1 掃分母時會抓到）。
  endMargin: 60, // 虛擬時間要在牆鐘收工前這麼多 ms 就抵達 horizon（覆審第 3 輪 H-1：壓線抵達會讓 horizon 上的 timer 在收工幀才燒）
  atReserve: 160, // st.at 為回呼裡即將排的 tween 預留的虛擬額度（ms）
  rateMax: 2.2, // 加速倍率天花板（實測滿編 1.50×、dt 夾 0.1s 時 1.64×）
  flinchMs: 240, // 受招輕反應：退縮多久
  flinchDist: 0.14, // 退縮多遠（group 空間，×該尊的 scale 由呼叫端決定）
  flinchRim: 1.8, // 退縮時邊光倍率
  tableY: 0.152, // 桌面頂（duel-figures 的影子高度），地面陣一律貼這裡
  burstPool: 260, // 招式專用的火星池（不跟命中噴發搶）
  focusK: 0.6, // 出招側打光：戲台燈組往出招方質心移這個比例（質心約 1.15 → 位移約 0.69）
  focusLerp: 24, // 燈組位移的收斂速率（/秒）：150ms 內到 97%
};

// 強 ease（emil-design-eng：內建曲線太弱）。全部 t∈[0,1] → 值。
const out3 = (t) => 1 - Math.pow(1 - t, 3);
export const EASE = {
  linear: (t) => t,
  out: out3, // ≈ cubic-bezier(0.23,1,0.32,1)
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inout: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), // ≈ cubic-bezier(0.77,0,0.175,1)
  in: (t) => t * t * t,
  /** 回位帶一點過衝（back-out） */
  back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  /** 出手：前 30% 反向後拉（到 −0.18），之後 ease-out 衝到 1 */
  strike: (t) => (t < 0.3 ? -0.18 * Math.sin((t / 0.3) * Math.PI) : out3((t - 0.3) / 0.7)),
  /** 去而復返：0→1→0 的正弦半波 */
  pulse: (t) => Math.sin(Math.PI * t),
  /** 去快回慢：25% 到頂，之後 ease-out 回 0 */
  snap: (t) => (t < 0.25 ? out3(t / 0.25) : 1 - out3((t - 0.25) / 0.75)),
  /** 去慢回快：75% 到頂（醞釀），之後急收 */
  wind: (t) => (t < 0.75 ? out3(t / 0.75) : 1 - out3((t - 0.75) / 0.25)),
};

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();

function makeLcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function prefersReduced() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

/**
 * @param scene / camera   renderer.js 的那一組
 * @param duelFigures      createDuelFigures 的回傳（要 figuresOf(side)）
 * @param opts.renderer    有給就預熱兩支材質 program（第一場對決前編掉）
 * @param opts.rig         戲台燈組（createFigureLightRig 的 Group）：招式期間往出招方移（演出可讀性小卷 C-2）
 */
export function createTraitFx(scene, camera, duelFigures, opts = {}) {
  const burst = createImpactBurst(TFX.burstPool);
  scene.add(burst.points);
  const rig = opts.rig || null;
  const rigBase = rig ? rig.position.clone() : null;
  let rigGoal = null; // 目前想把燈組移去哪（有招在演時）

  // 材質模板：clone 出來的 program cache key 相同，27 套怎麼用都只有這兩支 shader
  const MAT_GLOW = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
  const MAT_LINE = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
  /* ★v0.55 第三支模板：非加色的實心材質★（凍結檔 Q10）
     盲讀「顏色分不出、全是白的」的機制成因：加色混合的東西一旦亮度越過 bloom 門檻（js/bloom.js:175
     threshold 0.55、strength 1.15）就往白色去，**系色在畫面上根本活不下來**。徽記本體因此走 NormalBlending。
     解法是換材質與換形狀，不是調 bloom 或 EXPOSURE（ART_BIBLE §8 明寫那兩個一動整張牌桌要重驗）。
     注意：blending／opacity／color 都是 render state 與 uniform，**不進 program cacheKey**，
     所以這支的 shader program 與 MAT_GLOW 共用——材質模板是 3 支，program 數不增（實測見批 0 報告）。 */
  const MAT_SOLID = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.NormalBlending, depthWrite: false, depthTest: true, side: THREE.DoubleSide, fog: false, toneMapped: false });
  // 徽記朝鏡頭：相機四元數再往下壓 ICON.billboardTiltDeg（正俯視時完全正對會像貼紙，壓一點才有厚度）
  const TILT_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -THREE.MathUtils.degToRad(ICON.billboardTiltDeg));
  const _bq = new THREE.Quaternion();
  const _rq = new THREE.Quaternion();
  const _m4 = new THREE.Matrix4();
  const _s3 = new THREE.Vector3();
  const ZAX = new THREE.Vector3(0, 0, 1);
  // 預熱：renderer.compile() 只編「直接輸出」那一支，對決走 bloom 的 render target（linear 色彩空間）是另一支
  // program，粒子池在第一次 burst 之前也沒編過——實測（scratchpad/progdiag2）演到一半 render 會 +1～+2。
  // 所以改成兩個暖身物件關掉 frustumCulled 常駐桌底：每一幀（含 bloom 那條路）都真的被畫，兩種變體在第一場
  // 對決之前就編好；粒子池用一顆停在 PARK 的暖身點（同材質）讓它也編掉。
  const warm = new THREE.Group();
  const warmMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), MAT_GLOW);
  const warmLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0.01, 0)]), MAT_LINE);
  // 粒子池的暖身：一顆停在 PARK 的點，材質 clone 自池子（同一支 program），畫不出東西但每幀都被畫
  const warmPts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -999, 0]), 3)).setAttribute('color', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3)), burst.points.material.clone());
  // v0.55：第三支模板照樣預熱（就算它與 MAT_GLOW 共用 program，NormalBlending 這條 state 路徑
  // 第一次畫時仍可能讓 renderer 補編 transparent 佇列；成本是常駐一個 0.01² 的 plane）
  const warmSolid = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), MAT_SOLID);
  warmMesh.frustumCulled = false; warmLine.frustumCulled = false; warmPts.frustumCulled = false; warmSolid.frustumCulled = false;
  warm.add(warmMesh, warmLine, warmPts, warmSolid);
  warm.position.y = -30; // 桌面底下、鏡頭永遠看不到
  scene.add(warm);
  if (opts.renderer) { try { opts.renderer.compile(scene, camera); } catch (e) { /* 直接輸出那一支順手先編 */ } }

  const stats = { asked: 0, handled: 0, fallback: 0, thrown: 0, fused: 0, cut: 0 /* 收工時還有 tween/timer 沒演完 */, sped: 0 /* 被加速過的套數 */, finished: 0 };
  const runs = new Set();
  const wraps = new Map(); // figure → wrap
  let seedCounter = 11;
  let lastSig = null;

  /* ── figure 包裝：骨骼 delta 的 restore／capture／apply，model 與邊光的基準 ── */
  function wrapFig(fig, run) {
    let w = wraps.get(fig);
    if (!w) {
      // 模型＝group 底下「含骨骼／蒙皮網格」的那個子節點：attachFactionFx 的粒子與水面
      // 在 GLB 載完之前就掛進 group 了，children[0] 不一定是模型
      const model = fig.group.children.find((o) => { let hit = false; o.traverse((c) => { if (c.isBone || c.isSkinnedMesh) hit = true; }); return hit; }) || null;
      w = {
        fig, model, runs: new Set(), rimMul: 1,
        origUpdate: fig.update, origSetRim: fig.setRim,
        pre: new Map(), // bone → {q,p,s} mixer 之後、delta 之前的值
        over: new Map(), // bone → {rot: Euler, pos: Vector3, scl: number}
        base: model ? { p: model.position.clone(), r: model.rotation.clone(), s: model.scale.clone() } : null,
        mo: { p: new THREE.Vector3(), r: new THREE.Euler(), s: 1 },
      };
      fig.update = (dt) => { restore(w); if (typeof w.origUpdate === 'function') w.origUpdate.call(fig, dt); capture(w); };
      fig.setRim = (op) => w.origSetRim.call(fig, (op === undefined ? 1 : op) * w.rimMul);
      wraps.set(fig, w);
    }
    w.runs.add(run);
    run.wraps.add(w);
    return w;
  }
  function restore(w) {
    w.pre.forEach((pre, bone) => { bone.quaternion.copy(pre.q); bone.position.copy(pre.p); bone.scale.copy(pre.s); });
  }
  function captureBone(w, bone) {
    let pre = w.pre.get(bone);
    if (!pre) { pre = { q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() }; w.pre.set(bone, pre); }
    pre.q.copy(bone.quaternion); pre.p.copy(bone.position); pre.s.copy(bone.scale);
    return pre;
  }
  function capture(w) { w.over.forEach((_, bone) => captureBone(w, bone)); }
  function apply(w) {
    w.over.forEach((o, bone) => {
      const pre = w.pre.get(bone) || captureBone(w, bone);
      _q.setFromEuler(o.rot);
      bone.quaternion.copy(pre.q).multiply(_q);
      bone.position.copy(pre.p).add(o.pos);
      if (o.scl !== 1) bone.scale.copy(pre.s).multiplyScalar(o.scl); else bone.scale.copy(pre.s);
    });
    if (w.model) {
      const m = w.model;
      m.position.copy(w.base.p).add(w.mo.p);
      m.rotation.set(w.base.r.x + w.mo.r.x, w.base.r.y + w.mo.r.y, w.base.r.z + w.mo.r.z);
      m.scale.copy(w.base.s).multiplyScalar(w.mo.s);
    }
  }
  function unwrap(w) {
    restore(w);
    if (w.model) { w.model.position.copy(w.base.p); w.model.rotation.copy(w.base.r); w.model.scale.copy(w.base.s); }
    w.fig.update = w.origUpdate;
    w.fig.setRim = w.origSetRim;
    w.rimMul = 1;
    try { w.fig.setRim(1); } catch (e) { /* 下一幀 duel-figures 會再設 */ }
    wraps.delete(w.fig);
  }
  function overOf(w, bone) {
    let o = w.over.get(bone);
    if (!o) { o = { rot: new THREE.Euler(), pos: new THREE.Vector3(), scl: 1 }; w.over.set(bone, o); }
    return o;
  }

  function centroid(figs, out) {
    out = out || new THREE.Vector3();
    out.set(0, 0, 0);
    if (!figs.length) return out;
    figs.forEach((f) => { out.add(f.group.position); });
    return out.multiplyScalar(1 / figs.length);
  }

  /* ── v0.55 因果三段的機械判定（ART_BIBLE §10.3；門檻在 vocab.js 的 PHASE_GATE，不得放寬）──
     st.phase(name) 只是打點，**記不記進 run.sig.phases 由打點當下那一段的實際條件是否成立決定**。
     這就是「防喊了就算」：編舞說它有 windup，但如果骨骼／model 一動都沒動，這一段不記。 */
  /** 取這一套演出裡符合 pred 的 figure，骨骼覆寫與 model 覆寫的最大絕對值 */
  function metricOf(run, pred) {
    let bone = 0, model = 0;
    run.wraps.forEach((w) => {
      if (!pred(w.fig)) return;
      w.over.forEach((o) => {
        bone = Math.max(bone, Math.abs(o.rot.x), Math.abs(o.rot.y), Math.abs(o.rot.z), Math.abs(o.pos.x), Math.abs(o.pos.y), Math.abs(o.pos.z));
      });
      model = Math.max(model, w.mo.p.length(), Math.abs(w.mo.s - 1));
    });
    return { bone, model };
  }
  function evalPhases(run) {
    for (const c of run.phaseClaims) {
      if (c.ok || run.vt > c.until) continue;
      if (c.name === 'windup') {
        // 出招方自己的骨骼／model 真的動了（只有 rim 變化不算——rim 不寫進 over／mo）
        const m = metricOf(run, (f) => run.actorSet.has(f));
        c.bone = Math.max(c.bone, m.bone); c.model = Math.max(c.model, m.model);
        if (c.bone >= PHASE_GATE.windupBone || c.model >= PHASE_GATE.windupModel) c.ok = true;
      } else if (c.name === 'travel') {
        // spawn 出來的東西真的跑了一段路（原地脹大的環、罩、光球位移為 0，自然不算）
        let best = 0;
        for (const m of run.meshes) {
          if (!m || !m.position) continue;
          const b = c.base.get(m);
          if (!b) { c.base.set(m, m.position.clone()); continue; }
          const d = m.position.distanceTo(b);
          if (d > best) best = d;
        }
        c.moved = Math.max(c.moved, best);
        if (c.moved >= c.need) c.ok = true;
      } else {
        /* 受招方／受益方有反應。兩個設計決定，兩個都是為了不讓這條恆真或恆假（02 §6.1 第 6 條）：
           ① 量的是「打點之後**變了多少**」，不是絕對值——否則出招方 windup 留在身上的位移會讓它恆真；
           ② 排掉 caster（他自己的收勢不算），**但場上只有他一個人時就量他自己**——
              自益招（獻祭刀在治具裡只有 1 尊）若一律排掉 caster，這條就恆假、再對的實作也過不了。 */
        let best = 0, sawOther = false;
        run.wraps.forEach((w) => { if (w.fig !== run.caster) sawOther = true; });
        run.wraps.forEach((w) => {
          if (sawOther && w.fig === run.caster) return;
          let b = c.base.get(w);
          // 打點之後才被包裝的 figure（受招方通常是在 flinch 那一刻才進 wraps）：基準是**中性姿勢**，
          // 不是「第一次看到它時的值」——那一幀 tween 已經動過一次了，會白丟掉一格的位移。
          if (!b) { b = { p: new THREE.Vector3(), s: 1 }; c.base.set(w, b); }
          best = Math.max(best, w.mo.p.distanceTo(b.p), Math.abs(w.mo.s - b.s));
        });
        c.model = Math.max(c.model, best);
        c.solo = !sawOther;
        if (c.model >= PHASE_GATE.reactDelta) c.ok = true;
      }
    }
  }
  /** 徽記朝鏡頭（可帶自轉 userData.fxRoll） */
  function faceCamera(obj) {
    obj.quaternion.copy(camera.quaternion);
    if (obj.userData.fxRoll) { _rq.setFromAxisAngle(ZAX, obj.userData.fxRoll); obj.quaternion.multiply(_rq); }
    obj.quaternion.multiply(TILT_Q);
  }
  /** InstancedMesh 的每個實例各自朝鏡頭（群體招用；N 枚徽記仍是 1 個 draw call） */
  function faceCameraInstanced(im) {
    const d = im.userData.fxIcons;
    if (!d) return;
    _bq.copy(camera.quaternion);
    if (d.roll) { _rq.setFromAxisAngle(ZAX, d.roll); _bq.multiply(_rq); }
    _bq.multiply(TILT_Q);
    for (let i = 0; i < d.pos.length; i++) { _m4.compose(d.pos[i], _bq, _s3.setScalar(d.size * (d.scale === undefined ? 1 : d.scale))); im.setMatrixAt(i, _m4); }
    im.instanceMatrix.needsUpdate = true;
  }

  /* ── 舞台：交給編舞函式的工具箱 ── */
  function makeStage(run, actor, target, det) {
    const colorObj = new THREE.Color(SPARK_COLOR[det.fac] || SPARK_COLOR.lantern);
    const cA = centroid(actor);
    const cB = target.length ? centroid(target) : cA.clone().add(new THREE.Vector3(1, 0, 0));
    const dir = cB.clone().sub(cA); dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
    dir.normalize();
    const inTarget = new Set(target);
    const touch = (fig) => { if (inTarget.has(fig)) run.sig.target = true; };
    const wrapOf = (fig) => { touch(fig); return wrapFig(fig, run); };
    // v0.55 因果三段用的兩個基準：出招方名單與「到目標的距離」（travel 要求位移 ≥ 這段的 40%）
    run.actorSet = new Set(actor);
    run.travelDist = Math.max(0.5, cA.distanceTo(cB));
    /** 第一個被真的動到骨骼／model 的出招方＝這一招的施術者。
     *  react 段量的是「除了他以外的人有沒有反應」——他自己的收勢不構成受招方的反應。 */
    const markCaster = (fig) => { if (!run.caster && !inTarget.has(fig)) run.caster = fig; };

    const st = {
      /** 這一招的時長（ms）、系色鍵與 hex、力道、是否 reduced-motion */
      /** 這一招的時長（ms）、tier（1／2／3）、系色鍵與 hex、力道、是否 reduced-motion。
       *  tier 給編舞用來加「只有大招才有」的段落（例：三尊在 tier 3 的餘韻，見 R1 覆審 M1）；
       *  tier 2 走同一支函式時必須逐項不變，所以那些段落一律包在 `if (st.tier === 3)` 裡。 */
      ms: run.ms, tier: run.tier, fac: det.fac, color: colorObj.getHex(), colorObj, power: det.power || 0.8, reduced: run.reduced,
      actor, target, dir, up: UP, tableY: TFX.tableY, EASE,
      /** 決定性亂數（0..1），同一場同一招每次一樣 */
      rnd: makeLcg(run.seed),
      byBody(figs, body) { return figs.filter((f) => f.unit && f.unit.body === body); },
      biggest(figs) {
        let best = null, bv = -1;
        figs.forEach((f) => { const b = f.bounds && f.bounds(); const v = b ? (b.max.x - b.min.x) * (b.max.y - b.min.y) * (b.max.z - b.min.z) * f.group.scale.x ** 3 : 0; if (v > bv) { bv = v; best = f; } });
        return best;
      },
      bone(fig, name) { return fig && fig.parts ? fig.parts[name] || null : null; },
      /** 骨骼的世界座標；沒這根骨就給包圍盒中心 */
      worldOf(fig, boneName, out) {
        out = out || new THREE.Vector3();
        const b = boneName && fig.parts ? fig.parts[boneName] : null;
        if (b) return b.getWorldPosition(out);
        const bb = fig.bounds && fig.bounds();
        if (bb) bb.getCenter(out); else out.set(0, 0.6, 0);
        return fig.group.localToWorld(out);
      },
      /** 頭頂／腳底的世界座標 */
      top(fig, out) { out = out || new THREE.Vector3(); const bb = fig.bounds && fig.bounds(); out.set(0, bb ? bb.max.y : 1.2, 0); return fig.group.localToWorld(out); },
      foot(fig, out) { out = out || new THREE.Vector3(); fig.group.getWorldPosition(out); out.y = TFX.tableY; return out; },
      /** 這一尊「朝對面」的方向，group 空間、水平、單位向量（給 move() 用） */
      toward(fig, out) {
        out = out || new THREE.Vector3();
        const goal = inTarget.has(fig) ? cA : cB;
        fig.group.worldToLocal(out.copy(goal)); out.y = 0;
        if (out.lengthSq() < 1e-6) out.set(0, 0, 1);
        return out.normalize();
      },
      /* ── 覆寫（reduced 時位移類全部 no-op） ── */
      rot(fig, boneName, x, y, z) {
        const b = st.bone(fig, boneName); if (!b) return false;
        run.sig.bones.add(boneName); markCaster(fig);
        if (run.reduced) return true;
        overOf(wrapOf(fig), b).rot.set(x || 0, y || 0, z || 0); return true;
      },
      shift(fig, boneName, x, y, z) {
        const b = st.bone(fig, boneName); if (!b) return false;
        run.sig.bones.add(boneName); markCaster(fig);
        if (run.reduced) return true;
        overOf(wrapOf(fig), b).pos.set(x || 0, y || 0, z || 0); return true;
      },
      scaleBone(fig, boneName, k) {
        const b = st.bone(fig, boneName); if (!b) return false;
        run.sig.bones.add(boneName); markCaster(fig);
        if (run.reduced) return true;
        overOf(wrapOf(fig), b).scl = k; return true;
      },
      move(fig, x, y, z) { run.sig.bones.add('@model'); markCaster(fig); if (run.reduced) return; wrapOf(fig).mo.p.set(x || 0, y || 0, z || 0); },
      spin(fig, x, y, z) { run.sig.bones.add('@model'); markCaster(fig); if (run.reduced) return; wrapOf(fig).mo.r.set(x || 0, y || 0, z || 0); },
      scale(fig, k) { run.sig.bones.add('@model'); markCaster(fig); if (run.reduced) return; wrapOf(fig).mo.s = k; },
      rim(fig, mul) { run.sig.bones.add('@rim'); wrapOf(fig).rimMul = mul; },
      /* ── 時序 ── */
      /** tween({ms, delay, ease, update(t, e), done}) */
      /** tween({ms, delay, ease, update(t, e), done})。排程走「虛擬時間」run.vt：編舞照自己的節奏排，排到 st.ms 之外時
       *  整套均勻加速（見 update() 的 rate），醞釀／出手／收勢的比例不變——覆審第 1 輪 H-1（滿編 8 尊逐尊錯開的
       *  lag 讓演出拖到 1317ms、index 只等 900ms）與第 2 輪 M（逐段按比例壓縮＝砍掉收勢）都由這一招處理。 */
      tween(o) {
        const delay = Number.isFinite(o.delay) ? Math.max(0, o.delay) : 0, ms = Number.isFinite(o.ms) && o.ms > 0 ? o.ms : run.ms;
        // F10 的分子：時間軸註冊過的「非 flinch」補間條數（fly／fade／grow 都經過這裡）。
        // 受招退縮不算——它是每一招共用的通用反應，不構成這一招的辨識元素。
        if (!run.inFlinch) run.acts++;
        const tw = { start: run.vt + delay, ms, ease: typeof o.ease === 'function' ? o.ease : EASE[o.ease || 'out'] || EASE.out, update: o.update || (() => {}), done: o.done || null, dead: false };
        run.horizon = Math.max(run.horizon, tw.start + ms);
        run.tweens.push(tw); return tw;
      },
      at(ms, fn) { const at = run.vt + (Number.isFinite(ms) ? Math.max(0, ms) : 0); run.horizon = Math.max(run.horizon, at + TFX.atReserve * run.k); run.timers.push({ at, fn, fired: false }); },
      /* ── mesh ── */
      glow(color, opacity) { const m = MAT_GLOW.clone(); m.color.setHex(color === undefined ? st.color : color); m.opacity = opacity === undefined ? 1 : opacity; return m; },
      lineMat(color, opacity) { const m = MAT_LINE.clone(); m.color.setHex(color === undefined ? st.color : color); m.opacity = opacity === undefined ? 1 : opacity; return m; },
      // userData.fxKind 是 L3 對比閘門的抓手：fx-contrast 只准切徽記／拖尾／印記的 visible，其餘一切不動
      spawn(obj, kind) { const k = kind || 'mesh'; run.sig.meshes.add(k); obj.userData.fxKind = k; scene.add(obj); run.meshes.push(obj); return obj; },
      /** 貼桌面的環（RingGeometry），中心在 pos（世界座標） */
      ring(pos, radius, width, o = {}) {
        const g = new THREE.RingGeometry(Math.max(0.01, radius - (width || 0.06)), radius, 40);
        const m = new THREE.Mesh(g, st.glow(o.color, o.opacity === undefined ? 0.8 : o.opacity));
        m.rotation.x = -Math.PI / 2; m.position.set(pos.x, TFX.tableY + 0.004, pos.z);
        return st.spawn(m, 'ring');
      },
      disc(pos, radius, o = {}) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 36), st.glow(o.color, o.opacity === undefined ? 0.5 : o.opacity));
        m.rotation.x = -Math.PI / 2; m.position.set(pos.x, TFX.tableY + 0.003, pos.z);
        return st.spawn(m, 'disc');
      },
      orb(pos, radius, o = {}) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), st.glow(o.color, o.opacity === undefined ? 0.9 : o.opacity));
        m.position.copy(pos); return st.spawn(m, 'orb');
      },
      /** 罩：半球，開口朝下罩住 pos */
      dome(pos, radius, o = {}) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), st.glow(o.color, o.opacity === undefined ? 0.35 : o.opacity));
        m.position.copy(pos); return st.spawn(m, 'dome');
      },
      /** 閃電／鎖鏈：from→to 的折線，jag＝抖動幅度 */
      bolt(from, to, o = {}) {
        const segs = o.segs || 9, jag = o.jag === undefined ? 0.12 : o.jag, rnd = makeLcg(o.seed || run.seed + 1);
        const pts = [];
        const d = _v.copy(to).sub(from), len = d.length() || 1e-3;
        // 側向量：水平線段用 (-z,0,x)；純垂直（天雷從天劈下）會退化成零向量，改拿 X 軸當側向（祖靈 agent 實測）
        const side = _v2.set(-d.z, 0, d.x);
        if (side.lengthSq() < 1e-8) side.set(1, 0, 0); else side.normalize();
        for (let i = 0; i <= segs; i++) {
          const t = i / segs, p = new THREE.Vector3().copy(from).addScaledVector(d, t);
          if (i > 0 && i < segs) { const k = (rnd() - 0.5) * 2 * jag * len * 0.3; p.addScaledVector(side, k); p.y += (rnd() - 0.5) * jag * len * 0.25; }
          pts.push(p);
        }
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), st.lineMat(o.color, o.opacity === undefined ? 1 : o.opacity));
        return st.spawn(line, 'bolt');
      },
      /** 直線 */
      beam(from, to, o = {}) {
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]), st.lineMat(o.color, o.opacity === undefined ? 1 : o.opacity));
        return st.spawn(line, 'beam');
      },
      /** 把 mesh 從 from 飛到 to（可加拋物線 arc 高度），回傳 tween */
      fly(obj, from, to, o = {}) {
        const a = from.clone(), b = to.clone(), arc = o.arc || 0;
        return st.tween({ ms: o.ms || run.ms * 0.4, delay: o.delay || 0, ease: o.ease || 'inout', done: o.done,
          update(t, e) { obj.position.lerpVectors(a, b, e); obj.position.y += arc * Math.sin(Math.PI * e); if (o.update) o.update(t, e); } });
      },
      /** 淡入淡出。徽記是「本體＋ink 底板（＋描邊）」的複合物，userData.fxParts 讓三片一起淡——
       *  只淡本體會留下一片孤零零的黑底板。沒有 fxParts 的物件行為與 v0.54 逐字相同。 */
      fade(obj, o = {}) {
        const parts = (obj.userData && obj.userData.fxParts) || [obj];
        const from = o.from === undefined ? parts[0].material.opacity : o.from, to = o.to === undefined ? 0 : o.to;
        return st.tween({ ms: o.ms || run.ms * 0.4, delay: o.delay || 0, ease: o.ease || 'out', done: o.done, update(t, e) { const v = from + (to - from) * e; for (let i = 0; i < parts.length; i++) parts[i].material.opacity = v; } });
      },
      /** 直接設透明度（複合徽記一起設） */
      alpha(obj, v) { const parts = (obj.userData && obj.userData.fxParts) || [obj]; for (let i = 0; i < parts.length; i++) parts[i].material.opacity = v; },
      grow(obj, o = {}) {
        const from = o.from === undefined ? 0.2 : o.from, to = o.to === undefined ? 1 : o.to;
        return st.tween({ ms: o.ms || run.ms * 0.5, delay: o.delay || 0, ease: o.ease || 'out', done: o.done, update(t, e) { obj.scale.setScalar(from + (to - from) * e); } });
      },
      /* ── 粒子／鏡頭 ── */
      burst(pos, o = {}) {
        run.sig.meshes.add('burst');
        burst.burst(pos, o.color === undefined ? st.color : o.color, { n: o.n || 40, power: o.power || 0.6, scale: o.scale || 1, seed: seedCounter++ });
      },
      punch(power) { try { document.dispatchEvent(new CustomEvent('ys:fx-punch', { detail: { power: power || 0.5 } })); } catch (e) { /* headless */ } },
      /** 受招輕反應（使用者裁定）：model 沿「遠離出招方」退縮＋邊光閃一下，不新增動畫 */
      flinch(figs, o = {}) {
        const k = o.strength === undefined ? 1 : o.strength, delay = o.delay || 0;
        run.inFlinch = true; // 這一段裡註冊的 tween 不計入 F10 的動作數
        figs.forEach((f, i) => {
          const w = wrapOf(f); run.sig.bones.add('@flinch');
          const away = st.toward(f).multiplyScalar(-TFX.flinchDist * k);
          st.tween({ ms: o.ms || TFX.flinchMs * run.k, delay: delay + (o.stagger || 0) * i, ease: 'snap',
            update(t, e) { if (!run.reduced) w.mo.p.copy(away).multiplyScalar(e); w.rimMul = 1 + (TFX.flinchRim - 1) * e * k; } });
        });
        run.inFlinch = false;
        if (o.burst !== false && figs.length) { const p = st.worldOf(figs[0], null); st.at(delay, () => st.burst(p, { power: 0.5 * k, n: 30 })); }
      },
      /* ══ v0.55 招式可辨性卷的積木（計畫 §2.3，名字寫死）══════════════════════════
         語彙與門檻在 js/trait-fx/vocab.js、剪影頂點表在 js/trait-fx/emblems.js，
         人類可讀版在 ART_BIBLE §10。**編舞裡不得再出現任何色碼字面值**——一律走 st.colors。 */
      /** 本系色票 {key, hot, line, ink}（key＝徽記本體、hot＝命中、line＝連線與拖尾、ink＝暗部描邊） */
      colors: FX_PAL[det.fac] || FX_PAL.zuling,
      /** 這一招的節拍窗（ms）：{windup:[a,b], travel:[a,b], react:[a,b], settle:[a,b]}，依 tier 換表 */
      beat: BEAT[run.tier] || BEAT[2],
      /** 這一招的法寶徽記 kind（EMBLEM_OF 的雙射；編舞一律寫 st.icon(st.kind, …)，不要自己填字串） */
      kind: EMBLEM_OF[det.trId] || null,
      /** 徽記：一片朝鏡頭的法寶剪影。
       *  o = { size=ICON.size, color=st.colors.key, opacity=1, outline=true, rimLine=false, roll=0 }
       *  outline＝在本體後面墊一片 ink 色的實心底板（把亮色從暗紅桌／夜紫天上切出來）；
       *  ★這裡刻意用 MAT_SOLID 底板而不是 MAT_LINE 描邊★——加色的細線正是盲讀抱怨的「白虛線」，
       *  而且 1px 線在 780×360 的盲讀格上連面積都量不到。要真的 MAT_LINE 外框就開 rimLine。 */
      icon(kind, pos, o = {}) {
        const size = o.size === undefined ? ICON.size : o.size;
        const op = o.opacity === undefined ? 1 : o.opacity;
        const mat = MAT_SOLID.clone();
        mat.color.setHex(o.color === undefined ? st.colors.key : o.color);
        mat.opacity = op;
        const mesh = new THREE.Mesh(EMBLEMS.geomOf(kind), mat);
        mesh.scale.setScalar(size);
        if (pos) mesh.position.copy(pos);
        mesh.userData.fxRoll = o.roll || 0;
        if (o.outline !== false) {
          const back = new THREE.Mesh(EMBLEMS.geomOf(kind), MAT_SOLID.clone());
          back.material.color.setHex(o.inkColor === undefined ? st.colors.ink : o.inkColor);
          back.material.opacity = op;
          back.scale.setScalar(1 + ICON.outlineW / Math.max(0.02, size));
          back.position.z = -0.012; // 本體之後一點點（本體是 DoubleSide 平片，靠 z 順序壓住）
          mesh.add(back);
        }
        if (o.rimLine) {
          const line = new THREE.LineLoop(EMBLEMS.outlineOf(kind), MAT_LINE.clone());
          line.material.color.setHex(st.colors.line); line.material.opacity = op;
          line.position.z = 0.012;
          mesh.add(line);
        }
        mesh.userData.fxParts = [mesh].concat(mesh.children.filter((c) => c.material)); // st.fade／st.alpha 三片一起動
        st.spawn(mesh, 'emblem:' + kind);
        run.sig.emblems.add(kind);
        if (o.flat) { mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = o.roll || 0; } // 貼桌（陰氣的水漬／暗斑、香火的貼桌陣）：不朝鏡頭
        else { run.bb.push(mesh); faceCamera(mesh); }
        return mesh;
      },
      /** 同一 kind ≥3 份走這支：N 枚徽記 = 1 個 draw call（群體招的 draw call 預算靠它）。
       *  positions 是 Vector3[]（會被記住並逐幀重排朝向；要移動就改陣列裡的向量）。 */
      icons(kind, positions, o = {}) {
        const size = o.size === undefined ? ICON.size : o.size;
        const mat = MAT_SOLID.clone();
        mat.color.setHex(o.color === undefined ? st.colors.key : o.color);
        mat.opacity = o.opacity === undefined ? 1 : o.opacity;
        const im = new THREE.InstancedMesh(EMBLEMS.geomOf(kind), mat, Math.max(1, positions.length));
        im.userData.fxIcons = { pos: positions.map((p) => p.clone()), size, roll: o.roll || 0, scale: 1, rolls: o.rolls || null };
        im.frustumCulled = false; // 實例中心在原點，包圍盒對不上，不關會被整批剔掉
        st.spawn(im, 'emblem:' + kind);
        run.sig.emblems.add(kind);
        if (o.flat) { // 貼桌：一次把 N 個實例壓平，之後不逐幀重排（省掉整批 billboard 的成本）
          const q = _bq.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
          const d = im.userData.fxIcons;
          for (let i = 0; i < d.pos.length; i++) {
            _rq.copy(q);
            if (d.rolls) { const rr = new THREE.Quaternion().setFromAxisAngle(UP, d.rolls[i]); _rq.premultiply(rr); }
            _m4.compose(d.pos[i], _rq, _s3.setScalar(size * (o.sizes ? o.sizes[i] : 1)));
            im.setMatrixAt(i, _m4);
          }
          im.instanceMatrix.needsUpdate = true;
        } else { run.bbi.push(im); faceCameraInstanced(im); }
        return im;
      },
      /** 飛行物＋拖尾：把 obj 從 from 飛到 to，尾巴是綁在它身上的 MAT_LINE。
       *  取代現在滿場飛的裸 beam（裸白細線 9/27，讀者原話「看不清飛的是什麼東西」）。
       *  o = { ms, delay, ease, arc, spin, trail=true, segs=12, color=st.colors.line, done, update } */
      trail(obj, from, to, o = {}) {
        const a = from.clone(), b = to.clone(), arc = o.arc || 0, spin = o.spin || 0;
        const segs = Math.max(2, o.segs || 12);
        let line = null, buf = null;
        if (o.trail !== false) {
          buf = new Float32Array(segs * 3);
          for (let i = 0; i < segs; i++) { buf[i * 3] = a.x; buf[i * 3 + 1] = a.y; buf[i * 3 + 2] = a.z; }
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(buf, 3));
          line = new THREE.Line(g, st.lineMat(o.color === undefined ? st.colors.line : o.color, o.opacity === undefined ? 0.85 : o.opacity));
          st.spawn(line, 'trail');
        }
        return st.tween({
          ms: o.ms || run.ms * 0.35, delay: o.delay || 0, ease: o.ease || 'out', done: o.done,
          update(t, e) {
            obj.position.lerpVectors(a, b, e);
            if (arc) obj.position.y += arc * Math.sin(Math.PI * e);
            if (spin) obj.userData.fxRoll = spin * e;
            if (buf) {
              buf.copyWithin(0, 3); // 尾巴往前推一格，最後一格寫當前位置
              buf[buf.length - 3] = obj.position.x; buf[buf.length - 2] = obj.position.y; buf[buf.length - 1] = obj.position.z;
              line.geometry.attributes.position.needsUpdate = true;
            }
            if (o.update) o.update(t, e);
          },
        });
      },
      /** 印記：在受招／受益方身上蓋一枚徽記並跟著它走（因果第三段的「證據」）。
       *  o = { size=ICON.markSize, color, at='chest'|'top'|'foot', off:Vector3, opacity } */
      mark(fig, kind, o = {}) {
        const at = o.at || 'chest';
        const off = o.off || null;
        const get = (out) => {
          if (at === 'top') st.top(fig, out);
          else if (at === 'foot') st.foot(fig, out);
          else st.worldOf(fig, 'Chest', out);
          if (off) out.add(off);
          return out;
        };
        const p = get(new THREE.Vector3());
        const mesh = st.icon(kind, p, { size: o.size === undefined ? ICON.markSize : o.size, color: o.color, opacity: o.opacity, outline: o.outline });
        // st.icon 已經 spawn＋登記 billboard 了；這裡只多打一個 mark 標記與加一條「跟著走」。
        // ★不得把 'emblem:<kind>' 從簽章刪掉★：同一招常常是「手上一枚徽記＋受招方身上一枚印記」，
        //   刪掉會讓 L1 的「tier 1／2 都要有 emblem」在這種招上假綠。
        run.sig.meshes.add('mark:' + kind);
        mesh.userData.fxKind = 'mark:' + kind;
        run.follow.push({ mesh, get, tmp: new THREE.Vector3() });
        touch(fig);
        return mesh;
      },
      /** 因果三段的打點。記不記進 run.sig.phases 由**實際條件**決定（vocab.js 的 PHASE_GATE），不是喊了就算。 */
      phase(name) {
        if (name !== 'windup' && name !== 'travel' && name !== 'react') return false;
        const c = { name, at: run.vt, ok: false, bone: 0, model: 0, moved: 0, need: 0, until: Infinity, base: new Map(), solo: false };
        if (name === 'windup') c.until = run.vt + PHASE_GATE.windupMs * run.k;
        else if (name === 'react') { c.until = run.vt + PHASE_GATE.reactMs * run.k; run.wraps.forEach((w) => c.base.set(w, { p: w.mo.p.clone(), s: w.mo.s })); }
        else {
          c.need = PHASE_GATE.travelFrac * run.travelDist;
          /* ★基準一定要在打點當下抓★：打點多半發生在前一段 tween 的 done 裡，而同一幀後面還有
             飛行 tween 會把位置改掉。留給 evalPhases 惰性抓就會抓到「已經飛了半格」的位置，
             量到的位移少一格（實測千里眼因此從 1.38 掉到 0.70，硬生生低於門檻）。 */
          run.meshes.forEach((m) => { if (m && m.position) c.base.set(m, m.position.clone()); });
        }
        run.phaseClaims.push(c);
        return true;
      },
      cancelled() { return run.done; },
    };
    return st;
  }

  function start(det) {
    // v0.54：招式時長只有一個來源＝事件帶的 detail.ms（index.html 的 PW_FX.TRAIT_MS_BY_TIER）。
    // 舊版的 `Number(det.ms) || 900` 退路已刪：那是第二份事實來源，改了 index.html 這裡會靜默沿用舊值。
    if (!Number.isFinite(det.ms) || det.ms <= 0) throw new Error('ys:fx-trait 缺 detail.ms（招式時長只能由 PW_FX.TRAIT_MS_BY_TIER 帶進來）');
    if (!Number.isFinite(det.baseMs) || det.baseMs <= 0) throw new Error('ys:fx-trait 缺 detail.baseMs（等比基準只能由 PW_FX.TIER_BASE_MS 帶進來）');
    const tier = (det.tier | 0) === 1 || (det.tier | 0) === 3 ? det.tier | 0 : 2;
    const fn = (tier === 1 && TRAIT_MOVES_SHORT[det.trId]) || TRAIT_MOVES[det.trId];
    if (typeof fn !== 'function') return null;
    const live = (side) => {
      try { return (duelFigures.figuresOf(side) || []).filter((f) => f && f.skin === 'creature' && typeof f.ready === 'function' && f.ready() && f.group.visible); } catch (e) { return []; }
    };
    const actor = live(det.side), target = live(det.foeSide);
    if (!actor.length) return null;
    if (rig) { const c = centroid(actor); rigGoal = rigBase.clone(); rigGoal.x += (c.x - rigBase.x) * TFX.focusK; rigGoal.z += (c.z - rigBase.z) * TFX.focusK; }
    const run = {
      trId: det.trId, t: 0, ms: Math.max(100, Number(det.ms)), tier, done: false,
      tweens: [], timers: [], meshes: [], wraps: new Set(), seed: seedCounter++,
      vt: 0, horizon: 0, rate: 1, // 虛擬時間／目前排到的最遠點／加速倍率（1＝照編舞原節奏）
      acts: 0, inFlinch: false, // F10：非 flinch 的補間條數
      reduced: det.reduced === undefined ? prefersReduced() : !!det.reduced,
      // v0.55：徽記逐幀朝鏡頭（bb＝單枚 Mesh、bbi＝群體 InstancedMesh）、印記跟著受招方走、因果三段的打點
      phaseClaims: [], bb: [], bbi: [], follow: [], caster: null, actorSet: null, travelDist: 1,
      sig: { trId: det.trId, bones: new Set(), meshes: new Set(), emblems: new Set(), target: false },
    };
    run.k = run.ms / Number(det.baseMs); // 三個絕對常數的等比係數（tier 1 ≈0.289、tier 2 =1、tier 3 ≈1.556）
    run.maxRate = 1; // 這一套實際用過的最高加速倍率（F2 的 rateOK：短版不得 >1.0）
    run.fuse = run.ms * TFX.fuseMul;
    run.promise = new Promise((r) => { run.resolve = r; });
    const stage = makeStage(run, actor, target, det);
    try { fn(stage); } catch (err) { stats.thrown++; finish(run); return null; }
    runs.add(run);
    return run;
  }

  function finish(run) {
    if (run.done) return;
    run.done = true;
    runs.delete(run);
    run.meshes.forEach((m) => {
      scene.remove(m);
      // 遞迴：spawn 進來的 Group（如斬瘟的劍光樞軸）子節點也要釋放（覆審 MEDIUM-1）
      // ★v0.55：徽記的 geometry 是「一個 kind 建一次、全場共用」的（emblems.js 的 Map 快取），
      //   dispose 掉它會讓下一次用到同一個 kind 的招在 GPU 上拿到空 buffer。共用的一律跳過。
      try { m.traverse((c) => { if (c.isInstancedMesh) c.dispose(); if (c.geometry && !(c.geometry.userData && c.geometry.userData.fxShared)) c.geometry.dispose(); if (c.material) c.material.dispose(); }); } catch (e) { /* 已釋放 */ }
    });
    run.meshes.length = 0;
    run.tweens.length = 0; run.timers.length = 0;
    run.bb.length = 0; run.bbi.length = 0; run.follow.length = 0;
    run.wraps.forEach((w) => {
      w.runs.delete(run);
      if (!w.runs.size) { unwrap(w); return; }
      // 同一尊還有別套在演（hitstop 讓 3D 時間慢於 index 的 setTimeout 時會重疊）：把本套留下的覆寫值歸零，
      // 別套的 tween 下一幀會重寫自己要的值（覆審 LOW-3）
      w.over.forEach((o) => { o.rot.set(0, 0, 0); o.pos.set(0, 0, 0); o.scl = 1; });
      w.mo.p.set(0, 0, 0); w.mo.r.set(0, 0, 0); w.mo.s = 1; w.rimMul = 1;
    });
    run.wraps.clear();
    if (run.sped) stats.sped++;
    lastSig = { trId: run.sig.trId, bones: Array.from(run.sig.bones).sort(), meshes: Array.from(run.sig.meshes).sort(), target: run.sig.target, t: Math.round(run.t), horizon: Math.round(run.horizon), sped: !!run.sped, cut: !!run.cut,
      // v0.54 機械驗收：ms／tier 防「--tier=1 其實還在跑 900」、maxRate 防「靠加速硬擠」、acts＝F10 的動作數
      ms: run.ms, tier: run.tier, maxRate: +run.maxRate.toFixed(4), acts: run.acts,
      // v0.55 L1／L2 的機械抓手：徽記 kind（雙射）與「實際成立」的因果段
      emblems: Array.from(run.sig.emblems).sort(),
      phases: run.phaseClaims.filter((c) => c.ok).map((c) => c.name).filter((n, i, a) => a.indexOf(n) === i),
      phaseDetail: run.phaseClaims.map((c) => ({ name: c.name, ok: c.ok, bone: +c.bone.toFixed(4), model: +c.model.toFixed(4), moved: +c.moved.toFixed(4), need: +c.need.toFixed(4), solo: !!c.solo })),
      travelDist: +run.travelDist.toFixed(3) };
    stats.finished++;
    if (run.resolve) run.resolve(true);
  }
  function cancelAll() { Array.from(runs).forEach(finish); if (rig) rig.position.copy(rigBase); /* SKIP：燈組立刻回位 */ }

  function update(dt) {
    burst.update(dt);
    // 出招側打光：有招在演就往 rigGoal 收斂，沒有就回 base（指數收斂，focusLerp 決定快慢）
    if (rig) rig.position.lerp(runs.size && rigGoal ? rigGoal : rigBase, Math.min(1, dt * TFX.focusLerp));
    if (!runs.size) return;
    const ms = dt * 1000;
    for (const run of Array.from(runs)) {
      run.t += ms;
      // 加速倍率＝剩餘虛擬工作量／剩餘牆鐘時間（≥1）：排程塞得下就照原節奏，塞不下就整套等比變快。
      // 每幀重算：timer 回呼晚排進來的 tween 會把 horizon 往後推，rate 跟著升
      // 目標是提前 endMargin 抵達 horizon（不壓線），倍率夾在 [1, rateMax]
      // 邊距至少 1.5 幀（10fps 時 60ms 不到一幀，horizon 上的 timer 仍會在收工幀才燒）；最後兩幀內不套天花板，寧可快也不要砍
      const margin = Math.max(TFX.endMargin * run.k, ms * 1.5);
      const remainW = run.ms - margin - run.t + ms;
      const cap = (run.ms - run.t) <= ms * 2 ? Infinity : TFX.rateMax;
      run.rate = remainW > 1 ? Math.min(cap, Math.max(1, (run.horizon - run.vt) / remainW)) : Math.min(cap, Math.max(1, run.rate));
      if (!Number.isFinite(run.rate)) run.rate = 1;
      run.vt += ms * run.rate;
      if (run.rate > run.maxRate) run.maxRate = run.rate;
      if (run.rate > 1.0001) run.sped = true;
      for (const tm of run.timers) if (!tm.fired && run.vt >= tm.at) { tm.fired = true; try { tm.fn(); } catch (e) { /* 一段壞了不擋整招 */ } }
      run.timers = run.timers.filter((tm) => !tm.fired);
      for (const tw of run.tweens) {
        if (run.vt < tw.start) continue;
        const t = Math.min(1, (run.vt - tw.start) / tw.ms);
        try { tw.update(t, tw.ease(t)); } catch (e) { tw.dead = true; }
        if (t >= 1) { tw.dead = true; if (tw.done) { try { tw.done(); } catch (e) { /* 同上 */ } } }
      }
      run.tweens = run.tweens.filter((tw) => !tw.dead);
      run.wraps.forEach(apply);
      // v0.55：徽記朝鏡頭、印記跟著受招方走、因果三段逐幀判定（順序在 apply 之後，量到的是這一幀的覆寫值）
      for (let i = 0; i < run.bb.length; i++) faceCamera(run.bb[i]);
      for (let i = 0; i < run.bbi.length; i++) faceCameraInstanced(run.bbi[i]);
      for (let i = 0; i < run.follow.length; i++) { const f = run.follow[i]; f.get(f.tmp); f.mesh.position.copy(f.tmp); }
      if (run.phaseClaims.length) evalPhases(run);
      // 時間到就收工（排程已壓縮進預算，剩下的只會是同一幀補到 t=1 的尾巴）；fuse 留作最後保險
      if (run.t >= run.fuse) { stats.fused++; finish(run); }
      else if (run.t >= run.ms) { if (run.tweens.length || run.timers.length) { stats.cut++; run.cut = true; } finish(run); }
    }
  }

  /** 【積木接收端】ys:fx-trait：{trId, side, foeSide, fac, power, ms}。同步派送，派完立刻讀 detail。 */
  document.addEventListener('ys:fx-trait', (e) => {
    const d = (e && e.detail) || {};
    stats.asked++;
    const run = start(d);
    if (run) { d.handled = true; d.done = run.promise; stats.handled++; } else { d.handled = false; d.done = null; stats.fallback++; }
  });
  document.addEventListener('ys:fx-trait-cancel', cancelAll);
  document.addEventListener('ys:duel-end', cancelAll);

  return {
    update, cancelAll, stats,
    moves: Object.keys(TRAIT_MOVES),
    active() { return runs.size; },
    /** 最近一套演完的簽章 {trId, bones[], meshes[], target}（驗收 T-3 用；純記錄） */
    lastSig() { return lastSig; },
    /** 目前還掛著包裝的 figure 數（驗收 T-2 ③：演完應為 0） */
    wrapped() { return wraps.size; },
    /** 燈組離基準位多遠（驗收 C-2） */
    rigOffset() { return rig ? rig.position.distanceTo(rigBase) : 0; },
    /** v0.55 診斷：材質模板數（MAT_GLOW／MAT_LINE／MAT_SOLID＝3，其中 SOLID 與 GLOW 共用 program）
     *  與徽記剪影的頂點／三角形統計（ART_BIBLE §10.2 第 3 條：≤24 頂點、≤22 三角形） */
    matTemplates: 3,
    emblemStats() { try { return EMBLEMS.stats(); } catch (e) { return null; } },
    burstPoints: burst.points,
  };
}

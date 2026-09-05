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
// 一個系別檔壞掉（語法錯／404）只丟那一系的招（退回 fallback），不得拖垮本模組→renderer.js→整個 3D 層
const loadMoves = (file) => import(file + V).then((m) => m.default || m.MOVES || {}, () => ({}));
const [ZULING, XIANGHUO, YINQI] = await Promise.all([
  loadMoves('./trait-fx/zuling.js'),
  loadMoves('./trait-fx/xianghuo.js'),
  loadMoves('./trait-fx/yinqi.js'),
]);

/** trId → 編舞函式(stage)。三個系別檔各自導出自己那一系的招；鍵名＝index.html TRAITS 的 id。 */
export const TRAIT_MOVES = Object.assign(Object.create(null), ZULING, XIANGHUO, YINQI);

// 全部【試玩必調】
export const TFX = {
  fuseMul: 2, // 保險絲：演出最長 ms×fuseMul
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
  // 預熱：renderer.compile() 只編「直接輸出」那一支，對決走 bloom 的 render target（linear 色彩空間）是另一支
  // program，粒子池在第一次 burst 之前也沒編過——實測（scratchpad/progdiag2）演到一半 render 會 +1～+2。
  // 所以改成兩個暖身物件關掉 frustumCulled 常駐桌底：每一幀（含 bloom 那條路）都真的被畫，兩種變體在第一場
  // 對決之前就編好；粒子池用一顆停在 PARK 的暖身點（同材質）讓它也編掉。
  const warm = new THREE.Group();
  const warmMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), MAT_GLOW);
  const warmLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0.01, 0)]), MAT_LINE);
  // 粒子池的暖身：一顆停在 PARK 的點，材質 clone 自池子（同一支 program），畫不出東西但每幀都被畫
  const warmPts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -999, 0]), 3)).setAttribute('color', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3)), burst.points.material.clone());
  warmMesh.frustumCulled = false; warmLine.frustumCulled = false; warmPts.frustumCulled = false;
  warm.add(warmMesh, warmLine, warmPts);
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

    const st = {
      /** 這一招的時長（ms）、系色鍵與 hex、力道、是否 reduced-motion */
      ms: run.ms, fac: det.fac, color: colorObj.getHex(), colorObj, power: det.power || 0.8, reduced: run.reduced,
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
        run.sig.bones.add(boneName);
        if (run.reduced) return true;
        overOf(wrapOf(fig), b).rot.set(x || 0, y || 0, z || 0); return true;
      },
      shift(fig, boneName, x, y, z) {
        const b = st.bone(fig, boneName); if (!b) return false;
        run.sig.bones.add(boneName);
        if (run.reduced) return true;
        overOf(wrapOf(fig), b).pos.set(x || 0, y || 0, z || 0); return true;
      },
      scaleBone(fig, boneName, k) {
        const b = st.bone(fig, boneName); if (!b) return false;
        run.sig.bones.add(boneName);
        if (run.reduced) return true;
        overOf(wrapOf(fig), b).scl = k; return true;
      },
      move(fig, x, y, z) { run.sig.bones.add('@model'); if (run.reduced) return; wrapOf(fig).mo.p.set(x || 0, y || 0, z || 0); },
      spin(fig, x, y, z) { run.sig.bones.add('@model'); if (run.reduced) return; wrapOf(fig).mo.r.set(x || 0, y || 0, z || 0); },
      scale(fig, k) { run.sig.bones.add('@model'); if (run.reduced) return; wrapOf(fig).mo.s = k; },
      rim(fig, mul) { run.sig.bones.add('@rim'); wrapOf(fig).rimMul = mul; },
      /* ── 時序 ── */
      /** tween({ms, delay, ease, update(t, e), done}) */
      /** tween({ms, delay, ease, update(t, e), done})。排程走「虛擬時間」run.vt：編舞照自己的節奏排，排到 st.ms 之外時
       *  整套均勻加速（見 update() 的 rate），醞釀／出手／收勢的比例不變——覆審第 1 輪 H-1（滿編 8 尊逐尊錯開的
       *  lag 讓演出拖到 1317ms、index 只等 900ms）與第 2 輪 M（逐段按比例壓縮＝砍掉收勢）都由這一招處理。 */
      tween(o) {
        const delay = Number.isFinite(o.delay) ? Math.max(0, o.delay) : 0, ms = Number.isFinite(o.ms) && o.ms > 0 ? o.ms : run.ms;
        const tw = { start: run.vt + delay, ms, ease: typeof o.ease === 'function' ? o.ease : EASE[o.ease || 'out'] || EASE.out, update: o.update || (() => {}), done: o.done || null, dead: false };
        run.horizon = Math.max(run.horizon, tw.start + ms);
        run.tweens.push(tw); return tw;
      },
      at(ms, fn) { const at = run.vt + (Number.isFinite(ms) ? Math.max(0, ms) : 0); run.horizon = Math.max(run.horizon, at + TFX.atReserve); run.timers.push({ at, fn, fired: false }); },
      /* ── mesh ── */
      glow(color, opacity) { const m = MAT_GLOW.clone(); m.color.setHex(color === undefined ? st.color : color); m.opacity = opacity === undefined ? 1 : opacity; return m; },
      lineMat(color, opacity) { const m = MAT_LINE.clone(); m.color.setHex(color === undefined ? st.color : color); m.opacity = opacity === undefined ? 1 : opacity; return m; },
      spawn(obj, kind) { run.sig.meshes.add(kind || 'mesh'); scene.add(obj); run.meshes.push(obj); return obj; },
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
      fade(obj, o = {}) {
        const from = o.from === undefined ? obj.material.opacity : o.from, to = o.to === undefined ? 0 : o.to;
        return st.tween({ ms: o.ms || run.ms * 0.4, delay: o.delay || 0, ease: o.ease || 'out', done: o.done, update(t, e) { obj.material.opacity = from + (to - from) * e; } });
      },
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
        figs.forEach((f, i) => {
          const w = wrapOf(f); run.sig.bones.add('@flinch');
          const away = st.toward(f).multiplyScalar(-TFX.flinchDist * k);
          st.tween({ ms: o.ms || TFX.flinchMs, delay: delay + (o.stagger || 0) * i, ease: 'snap',
            update(t, e) { if (!run.reduced) w.mo.p.copy(away).multiplyScalar(e); w.rimMul = 1 + (TFX.flinchRim - 1) * e * k; } });
        });
        if (o.burst !== false && figs.length) { const p = st.worldOf(figs[0], null); st.at(delay, () => st.burst(p, { power: 0.5 * k, n: 30 })); }
      },
      cancelled() { return run.done; },
    };
    return st;
  }

  function start(det) {
    const fn = TRAIT_MOVES[det.trId];
    if (typeof fn !== 'function') return null;
    const live = (side) => {
      try { return (duelFigures.figuresOf(side) || []).filter((f) => f && f.skin === 'creature' && typeof f.ready === 'function' && f.ready() && f.group.visible); } catch (e) { return []; }
    };
    const actor = live(det.side), target = live(det.foeSide);
    if (!actor.length) return null;
    if (rig) { const c = centroid(actor); rigGoal = rigBase.clone(); rigGoal.x += (c.x - rigBase.x) * TFX.focusK; rigGoal.z += (c.z - rigBase.z) * TFX.focusK; }
    const run = {
      trId: det.trId, t: 0, ms: Math.max(100, Number(det.ms) || 900), done: false,
      tweens: [], timers: [], meshes: [], wraps: new Set(), seed: seedCounter++,
      vt: 0, horizon: 0, rate: 1, // 虛擬時間／目前排到的最遠點／加速倍率（1＝照編舞原節奏）
      reduced: det.reduced === undefined ? prefersReduced() : !!det.reduced,
      sig: { trId: det.trId, bones: new Set(), meshes: new Set(), target: false },
    };
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
      try { m.traverse((c) => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }); } catch (e) { /* 已釋放 */ }
    });
    run.meshes.length = 0;
    run.tweens.length = 0; run.timers.length = 0;
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
    lastSig = { trId: run.sig.trId, bones: Array.from(run.sig.bones).sort(), meshes: Array.from(run.sig.meshes).sort(), target: run.sig.target, t: Math.round(run.t), horizon: Math.round(run.horizon), sped: !!run.sped, cut: !!run.cut };
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
      const margin = Math.max(TFX.endMargin, ms * 1.5);
      const remainW = run.ms - margin - run.t + ms;
      const cap = (run.ms - run.t) <= ms * 2 ? Infinity : TFX.rateMax;
      run.rate = remainW > 1 ? Math.min(cap, Math.max(1, (run.horizon - run.vt) / remainW)) : Math.min(cap, Math.max(1, run.rate));
      if (!Number.isFinite(run.rate)) run.rate = 1;
      run.vt += ms * run.rate;
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
    burstPoints: burst.points,
  };
}

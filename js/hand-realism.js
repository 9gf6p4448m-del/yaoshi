// 妖市 3D 環境層 — 席位之手「中等寫實」皮膚與幾何（v0.59.7；使用者 2026-10-02 看示意圖裁定，驗收見
// docs/experiments/2026-10-02-hand-realism/acceptance.md）。純演出：不讀寫賽局、不耗亂數，只在 setSeats 時每種手建一次。
// 三件事：① 幾何——手部 Loop 細分一層（只細分手與袖口，前臂不細分；配件不動）＋依角色調指粗／指節腫／手背厚；
//   前臂（袖子）不透明、往後延長到畫面外並微微往肩膀抬（驗收條件 11：手連著手臂，不得看到袖子後端）；
// ② 材質——所有席一份（同一支 program、同一份 uniform，四種手的參數放在陣列裡）：指甲、指節橫紋、掌骨肌腱、
//   老人斑與靜脈、繭與疤、皮膚微起伏與紙纖維、假次表面散射；配件另畫繩股、木紋、金屬（條件 10）。
// ③ 縮放：本卷不縮放（使用者 2026-10-02「先不用縮」）；全角色共用一個可調倍率 HAND.USER_SCALE（預設 1）。
// 貼圖來源：無外部貼圖（hand_r.glb 沒有 UV），全部是 rest 空間（GLB 原生 dm 座標）的程式生成圖樣。掌紋不做（掌心朝下）。
// 當鋪「修長」以手指變細達成，不改骨長（改骨長會牽動 hand-motion 的擺位解算）。
import * as THREE from 'three';

/** 每種手的參數（全部【試玩必調】）。不含縮放（全角色共用 HAND.USER_SCALE）。
 *  非三角色（ROLES 表其餘角色、空席、未知角色）一律用 DEFAULT：同一套寫實皮膚，中年、略帶風霜，不帶身分記號。 */
export const REAL = {
  DEFAULT: { RADIAL: 1.0, KNUCKLE: 1.06, PALM_Y: 1.0,
    skin: [0.30, 0.19, 0.12], warm: [0.40, 0.16, 0.10], nail: [0.48, 0.41, 0.31], rough: 0.68,
    age: [0.45, 0.20, 0.35, 0.30], marks: [0.0, 0.0, 0.0, 0.0], sss: [0.22, 0.07, 0.04] },
  ROLES: {
    /* 收驚婆：老、皺、乾——指細、指節腫、手背薄；橫紋／老人斑／靜脈最重，粗糙度高 */
    shoujing: { RADIAL: 0.86, KNUCKLE: 1.22, PALM_Y: 0.88,
      skin: [0.30, 0.22, 0.155], warm: [0.40, 0.17, 0.12], nail: [0.52, 0.47, 0.34], rough: 0.82,
      age: [1.0, 1.0, 1.0, 1.0], marks: [0.0, 0.0, 0.32, 0.0], sss: [0.22, 0.06, 0.04] },
    /* 獵人：粗、有繭、有疤——指粗、手背厚；掌指關節與指尖繭、手背斜疤 */
    hunter: { RADIAL: 1.16, KNUCKLE: 1.10, PALM_Y: 1.06,
      skin: [0.30, 0.135, 0.065], warm: [0.42, 0.13, 0.07], nail: [0.42, 0.33, 0.24], rough: 0.72,
      age: [0.45, 0.10, 0.0, 0.55], marks: [1.0, 1.0, 0.18, 0.0], sss: [0.25, 0.06, 0.03] },
    /* 當鋪：蒼白、修長——指細（不改骨長）、膚色灰白、粗糙度低、指甲留長 */
    dangpu: { RADIAL: 0.84, KNUCKLE: 1.0, PALM_Y: 0.92,
      skin: [0.30, 0.285, 0.275], warm: [0.36, 0.25, 0.27], nail: [0.50, 0.47, 0.46], rough: 0.45,
      age: [0.10, 0.0, 0.45, 0.0], marks: [0.0, 0.0, 0.62, 1.0], sss: [0.16, 0.10, 0.12] },
  },
};
/** 種類序（材質 uniform 陣列的索引；幾何的 aSkin＝序＋1，配件＝0）。 */
export const KINDS = ['default', 'shoujing', 'hunter', 'dangpu'];
/** 變體鍵（null＝預設手）→ 這種手的參數、快取鍵與種類序。 */
export function realDef(key) {
  const k = key && Object.prototype.hasOwnProperty.call(REAL.ROLES, key) ? key : 'default';
  return { key: k, def: k === 'default' ? REAL.DEFAULT : REAL.ROLES[k], kind: KINDS.indexOf(k) };
}
const kindDef = (i) => (i === 0 ? REAL.DEFAULT : REAL.ROLES[KINDS[i]]);

/** 前臂（驗收條件 11＋修訂 4）：原 GLB 的前臂袖布在 z＜CUT 的三角形整段不畫，改接一根程式生成的袖管（截面＝原袖口截面
 *  外撐 PAD 的橢圓、SIDES 邊、SEGS 段）。**每一幀**（畫之前，onBeforeRender 拿到這一次真正在畫的相機）把袖管重新鋪成
 *  「袖口 → 最近的畫面邊緣」的最短路徑：手腕投影到畫面、取離它最近的那條邊，目標點在該邊外 MARGIN（NDC）處，
 *  深度取「過該點的視線與高 LIFT 的水平面」交點（交不到就取手腕到相機的距離）；路徑是從袖口沿前臂方向起步的二次曲線。
 *  袖管最後一段 DARK 起漸暗、FADE 起漸隱（都在畫面邊緣外側那一截）。袖管頂點全綁 Elbow 骨（姿勢從不轉它＝網格局部座標），
 *  所以 CPU 寫進去的座標就是畫出來的座標，治具與測試讀頂點位置看到的就是畫面上那一根。
 *  沒有相機時（node 測試）：往後 STATIC_DM、微抬 STATIC_RISE 的靜態袖管。
 *  AVOID：路徑與拍品在畫面上的外框相交時，改選下一近的邊（不得橫過拍品前方）。
 *  FINE_Z：z ≥ 此值的原三角形才細分（手＋袖口）。 */
export const ARM = { CUT: -0.5, Z0: -0.40, PAD: 0.012, SIDES: 10, SEGS: 16, FINE_Z: -0.45, MARGIN: 0.35, PAD_NDC: 0.04, LIFT: 0.06, DARK: 0.6, FADE: 0.82, STATIC_DM: 8, STATIC_RISE: 0.16 };

const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb'];

function restWorldOf(rig) {
  const rw = [];
  for (let i = 0; i < rig.names.length; i++) { const p = rig.parents[i], r = rig.rest[i]; rw.push(p < 0 ? r.slice() : [rw[p][0] + r[0], rw[p][1] + r[1], rw[p][2] + r[2]]); }
  const by = (n) => rw[rig.idx[n]];
  return { rw, by };
}

/** 關節點（rest、dm）：5 指 × A,B,C,Tip ＝ 20 個；Tip 再往外延 0.35 段當指尖端點。 */
export function jointTable(rig) {
  const { by } = restWorldOf(rig), J = [];
  for (const f of FINGERS) {
    const a = by(f + 'A'), b = by(f + 'B'), c = by(f + 'C'), t = by(f + 'Tip');
    J.push(a, b, c, t);
  }
  return { J, wrist: by('Wrist'), palm: by('Palm') };
}

/* ═══ Loop 細分一層（只對原手三角形中 z ≥ fineZ 的；配件三角形原樣接回）═══════════════════════ */
export function loopSubdivide(geo, n0, fineZ = -Infinity) {
  /* geo＝陣列版幾何 { position, color, colorSize, skinIndex, skinWeight, index, accAttr? }（不 new BufferGeometry：three 的 uuid 會耗 Math.random） */
  const P = geo.position, C = geo.color, cs = geo.colorSize;
  const SI = geo.skinIndex, SW = geo.skinWeight, I = geo.index, AA = geo.accAttr || null;
  const nAll = P.length / 3;
  /* 焊接：同位置的原手頂點視為同一個拓撲點 */
  const key = (v) => P[v * 3].toFixed(5) + ',' + P[v * 3 + 1].toFixed(5) + ',' + P[v * 3 + 2].toFixed(5);
  const weld = new Int32Array(n0), firstOf = new Map(), reps = [];
  for (let v = 0; v < n0; v++) { const k = key(v); let r = firstOf.get(k); if (r === undefined) { r = reps.length; firstOf.set(k, r); reps.push(v); } weld[v] = r; }
  const baseTris = [], accTris = [];
  for (let t = 0; t < I.length; t += 3) { const a = I[t], b = I[t + 1], c = I[t + 2]; if (a < n0 && b < n0 && c < n0) baseTris.push([weld[a], weld[b], weld[c], a, b, c]); else accTris.push([a, b, c]); }
  const nv = reps.length;
  const edges = new Map(); const ek = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
  const nbr = Array.from({ length: nv }, () => new Set());
  for (const [a, b, c] of baseTris) for (const [x, y, z] of [[a, b, c], [b, c, a], [c, a, b]]) {
    const k = ek(x, y); let e = edges.get(k); if (!e) { e = { a: Math.min(x, y), b: Math.max(x, y), opp: [] }; edges.set(k, e); } e.opp.push(z); nbr[x].add(y); nbr[y].add(x);
  }
  /* 屬性混合器：位置（3）、顏色（cs）、骨權重（map） */
  const out = { P: [], C: [], SI: [], SW: [], A: [] };
  const push = (terms, raw) => { // terms: [[repVertex, w], ...]；raw＝原頂點編號（給了就用它自己的顏色，保留接縫色）
    const p = [0, 0, 0], c = new Array(cs).fill(0), bw = new Map();
    for (const [r, w] of terms) {
      const v = reps[r];
      for (let i = 0; i < 3; i++) p[i] += P[v * 3 + i] * w;
      if (raw === undefined) for (let i = 0; i < cs; i++) c[i] += C[v * cs + i] * w;
      for (let k = 0; k < 4; k++) { const s = SW[v * 4 + k]; if (s > 0) bw.set(SI[v * 4 + k], (bw.get(SI[v * 4 + k]) || 0) + s * w); }
    }
    if (raw !== undefined) for (let i = 0; i < cs; i++) c[i] = C[raw * cs + i];
    const top = [...bw.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4); const sum = top.reduce((s, x) => s + x[1], 0) || 1;
    out.P.push(...p); out.C.push(...c); out.A.push(0, 0, 0);
    for (let k = 0; k < 4; k++) { out.SI.push(top[k] ? top[k][0] : 0); out.SW.push(top[k] ? top[k][1] / sum : 0); }
    return out.P.length / 3 - 1;
  };
  /* 邊界：只有一個相鄰三角形的邊 */
  const bnd = Array.from({ length: nv }, () => []);
  for (const e of edges.values()) if (e.opp.length === 1) { bnd[e.a].push(e.b); bnd[e.b].push(e.a); }
  /* 原頂點（偶點）：輸出順序＝原 GLB 頂點順序（第 v 個輸出就是原第 v 個頂點的新位置，接縫兩側各留自己的顏色），
     所以前 n0 個頂點與原幾何一一對應（測試與治具依此找袖口、膚色區）。 */
  const evenTerms = (r) => {
    if (bnd[r].length === 2) return [[r, 0.75], [bnd[r][0], 0.125], [bnd[r][1], 0.125]];
    const n = nbr[r].size; const beta = n === 3 ? 3 / 16 : 3 / (8 * n);
    return [[r, 1 - n * beta], ...[...nbr[r]].map((q) => [q, beta])];
  };
  for (let v = 0; v < n0; v++) push(evenTerms(weld[v]), v);
  /* 只細分「細」三角形（任一頂點 z ≥ fineZ）；粗三角形的邊若被細三角形加了中點，粗三角形就以那個中點扇形切開（不留裂縫）。 */
  const isFine = (t) => Math.max(P[reps[t[0]] * 3 + 2], P[reps[t[1]] * 3 + 2], P[reps[t[2]] * 3 + 2]) >= fineZ;
  const eNew = new Map();
  for (const t of baseTris) if (isFine(t)) for (const [x, y] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
    const k = ek(x, y); if (eNew.has(k)) continue; const e = edges.get(k);
    eNew.set(k, e.opp.length === 2 ? push([[e.a, 0.375], [e.b, 0.375], [e.opp[0], 0.125], [e.opp[1], 0.125]]) : push([[e.a, 0.5], [e.b, 0.5]]));
  }
  const idx = [];
  for (const t of baseTris) {
    const [a, b, c, A, B, Cc] = t, ab = eNew.get(ek(a, b)), bc = eNew.get(ek(b, c)), ca = eNew.get(ek(c, a));
    if (isFine(t)) { idx.push(A, ab, ca, ab, B, bc, ca, bc, Cc, ab, bc, ca); continue; }
    const L = [A, ab, B, bc, Cc, ca], poly = [];
    for (const x of L) if (x !== undefined) poly.push(x);
    if (poly.length === 3) { idx.push(poly[0], poly[1], poly[2]); continue; }
    const m0 = L.findIndex((x, i) => i % 2 === 1 && x !== undefined), start = poly.indexOf(L[m0]); // 從第一個中點扇形切
    const rot = poly.slice(start).concat(poly.slice(0, start));
    for (let i = 1; i + 1 < rot.length; i++) idx.push(rot[0], rot[i], rot[i + 1]);
  }
  const nBase = out.P.length / 3;
  /* 配件頂點原樣接在後面 */
  const accMap = new Map();
  const accV = (v) => { let m = accMap.get(v); if (m === undefined) { m = out.P.length / 3; accMap.set(v, m); out.P.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); for (let i = 0; i < cs; i++) out.C.push(C[v * cs + i]); for (let k = 0; k < 4; k++) { out.SI.push(SI[v * 4 + k]); out.SW.push(SW[v * 4 + k]); } for (let k = 0; k < 3; k++) out.A.push(AA ? AA[v * 3 + k] : 0); } return m; };
  for (const [a, b, c] of accTris) idx.push(a < n0 ? a : accV(a), b < n0 ? b : accV(b), c < n0 ? c : accV(c));
  return { P: new Float32Array(out.P), C: new Float32Array(out.C), cs, SI: new Uint16Array(out.SI), SW: new Float32Array(out.SW), A: new Float32Array(out.A), index: new Uint32Array(idx), nBase };
}

/** 依角色調手指粗細（繞骨軸徑向縮放）、指節腫、手背厚度；只動原手頂點（< nBase）。 */
export function reshape(rig, d, def) {
  const { by } = restWorldOf(rig), segs = [];
  for (const f of FINGERS) {
    const ch = ['A', 'B', 'C', 'Tip'].map((k) => by(f + k));
    const ext = [ch[3][0] + (ch[3][0] - ch[2][0]) * 0.6, ch[3][1] + (ch[3][1] - ch[2][1]) * 0.6, ch[3][2] + (ch[3][2] - ch[2][2]) * 0.6];
    segs.push([ch[0], ch[1], 0, f], [ch[1], ch[2], 1, f], [ch[2], ch[3], 2, f], [ch[3], ext, 3, f]);
  }
  const P = d.P, palm = by('Palm'), wrist = by('Wrist');
  for (let v = 0; v < d.nBase; v++) {
    const p = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]];
    if (p[2] < wrist[2] - 0.05) continue; // 袖口以後不動
    let best = 1e9, bq = null, bs = null, bt = 0;
    for (const s of segs) {
      const [a, b] = s, ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      let t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / L2; t = Math.max(0, Math.min(1, t));
      const q = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t], dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
      if (dd < best) { best = dd; bq = q; bs = s; bt = t; }
    }
    const dist = Math.sqrt(best);
    /* 只有「在手指上」的點做徑向縮放：A 段 t<0.35 屬掌緣，漸進 */
    const onFinger = bs[2] > 0 || bt > 0.35; const w = onFinger ? 1 : Math.max(0, (bt - 0.05) / 0.3);
    if (dist < 0.16 && w > 0) {
      const sAlong = bs[2] + bt; // 0..4
      const nearJ = Math.max(Math.exp(-(((sAlong - 1) / 0.16) ** 2)), Math.exp(-(((sAlong - 2) / 0.14) ** 2)));
      const k = 1 + (def.RADIAL * (1 + (def.KNUCKLE - 1) * nearJ) - 1) * w;
      for (let i = 0; i < 3; i++) P[v * 3 + i] = bq[i] + (p[i] - bq[i]) * k;
    } else if (!onFinger) {
      /* 手背厚度：相對掌骨高度。腕帶（紅繩、佛珠所在的 z<0.28）以後才漸進到 PALM_Y，配件才不會浮在變薄的手背上。 */
      const ramp = Math.min(1, Math.max(0, (p[2] - 0.28) / 0.17)), kk = 1 + (def.PALM_Y - 1) * ramp * ramp * (3 - 2 * ramp);
      P[v * 3 + 1] = palm[1] + (p[1] - palm[1]) * kk;
    }
  }
}

/** 寫實皮膚材質（v0.59.7）：一份材質給所有席（同一支 program、同一份 uniform；四種手的參數放在 uniform 陣列，
 *  幾何的 aSkin 決定這個頂點用哪一種：0＝配件、1..4＝KINDS 的序＋1）。配件依 aAcc（類別、u、v）畫繩股、木紋、金屬。 */
export function makeSkinMaterial(base, joints) {
  const m = base.clone();
  m.name = 'hand-real';
  const arr = (f) => KINDS.map((_, i) => f(kindDef(i)));
  const u = {
    uJ: { value: joints.J.map((p) => new THREE.Vector3(...p)) }, uWr: { value: new THREE.Vector3(...joints.wrist) },
    uSkinA: { value: arr((d) => new THREE.Color(...d.skin)) }, uWarmA: { value: arr((d) => new THREE.Color(...d.warm)) }, uNailA: { value: arr((d) => new THREE.Color(...d.nail)) },
    uAgeA: { value: arr((d) => new THREE.Vector4(...d.age)) }, uMarksA: { value: arr((d) => new THREE.Vector4(...d.marks)) }, uSSSA: { value: arr((d) => new THREE.Color(...d.sss)) },
    uRoughA: { value: arr((d) => d.rough) }, uScar: { value: new THREE.Vector4(0.16, 0.28, -0.12, 0.66) },
  };
  m.userData.realU = u;
  m.customProgramCacheKey = () => 'hand-real-v2';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSkin; attribute vec3 aAcc; varying vec3 vRP; varying vec3 vRN; varying float vSkin; varying vec3 vAcc;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRP = position; vRN = normal; vSkin = aSkin; vAcc = aAcc;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_PARS)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + FRAG_COLOR + FRAG_ACC)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, hrRough, max(hrK, hrA));')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.85, hrMetal);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (hrK > 0.0 || hrA > 0.0) normal = hrBump(-vViewPosition, normal, hrH * max(hrK, hrA));')
      .replace('#include <opaque_fragment>', 'outgoingLight += hrK * hrSSS * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.5) * 0.25;\n#include <opaque_fragment>');
  };
  return m;
}

const FRAG_PARS = /* glsl */`
varying vec3 vRP; varying vec3 vRN; varying float vSkin; varying vec3 vAcc;
uniform vec3 uJ[20]; uniform vec3 uWr; uniform vec3 uSkinA[4]; uniform vec3 uWarmA[4]; uniform vec3 uNailA[4]; uniform vec4 uAgeA[4]; uniform vec4 uMarksA[4]; uniform vec3 uSSSA[4]; uniform float uRoughA[4]; uniform vec4 uScar;
float hrK = 0.0, hrA = 0.0, hrH = 0.0, hrRough = 0.7, hrMetal = 0.0; vec3 hrSSS = vec3(0.0);
vec3 hrPick3(vec3 a[4], int k){ return k == 1 ? a[1] : k == 2 ? a[2] : k == 3 ? a[3] : a[0]; }
vec4 hrPick4(vec4 a[4], int k){ return k == 1 ? a[1] : k == 2 ? a[2] : k == 3 ? a[3] : a[0]; }
float hrPick1(float a[4], int k){ return k == 1 ? a[1] : k == 2 ? a[2] : k == 3 ? a[3] : a[0]; }
float hrHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float hrNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hrHash(i), hrHash(i+vec3(1,0,0)), f.x), mix(hrHash(i+vec3(0,1,0)), hrHash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hrHash(i+vec3(0,0,1)), hrHash(i+vec3(1,0,1)), f.x), mix(hrHash(i+vec3(0,1,1)), hrHash(i+vec3(1,1,1)), f.x), f.y), f.z); }
float hrFbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * hrNoise(p); p *= 2.03; a *= 0.5; } return s; }
float hrSeg(vec3 p, vec3 a, vec3 b, out float t){ vec3 ab = b - a; t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return length(p - a - ab * t); }
vec3 hrBump(vec3 sp, vec3 n, float h){ vec3 dx = dFdx(sp), dy = dFdy(sp); vec3 r1 = cross(dy, n), r2 = cross(n, dx); float det = dot(dx, r1);
  vec2 dh = vec2(dFdx(h), dFdy(h)); vec3 g = sign(det) * (dh.x * r1 + dh.y * r2); return normalize(abs(det) * n - g); }
`;

const FRAG_COLOR = /* glsl */`
{
  int hk = int(vSkin + 0.5) - 1;
  vec3 uSkin = hrPick3(uSkinA, hk), uWarm = hrPick3(uWarmA, hk), uNail = hrPick3(uNailA, hk), uSSS = hrPick3(uSSSA, hk);
  vec4 uAge = hrPick4(uAgeA, hk), uMarks = hrPick4(uMarksA, hk); float uRough = hrPick1(uRoughA, hk);
  hrSSS = uSSS;
  hrK = step(0.5, vSkin) * smoothstep(-0.10, -0.05, vRP.z);
  if (hrK > 0.0) {
    vec3 p = vRP, n = normalize(vRN);
    /* 最近的手指段 */
    float bd = 1e9, bs = 0.0; int bf = 0; vec3 axis = vec3(0,0,1), jB = vec3(0), jC = vec3(0);
    for (int f = 0; f < 5; f++) for (int k = 0; k < 3; k++) {
      float t; float d = hrSeg(p, uJ[f*4+k], uJ[f*4+k+1], t);
      if (d < bd) { bd = d; bs = float(k) + t; bf = f; axis = normalize(uJ[f*4+k+1] - uJ[f*4+k]); }
    }
    for (int f = 0; f < 5; f++) if (f == bf) { jB = uJ[f*4+1]; jC = uJ[f*4+2]; }
    vec3 dorsDir = bf == 4 ? normalize(vec3(0.55, 0.83, 0.0)) : vec3(0.0, 1.0, 0.0);
    float dors = dot(n, dorsDir);
    float onFinger = smoothstep(0.08, 0.3, bs) * step(bd, 0.14);
    /* 指節橫紋（B、C 關節背側）＋掌指關節骨突 */
    float wrinkle = 0.0;
    float gB = exp(-pow((bs - 1.0) / 0.11, 2.0)), gC = exp(-pow((bs - 2.0) / 0.09, 2.0));
    float ax = dot(p, axis);
    float lines = smoothstep(0.55, 0.95, 0.5 + 0.5 * sin(ax * 230.0 + hrNoise(p * 40.0) * 2.5));
    wrinkle = (gB + 0.7 * gC) * lines * smoothstep(0.0, 0.5, dors) * onFinger;
    float knob = 0.0;
    for (int f = 0; f < 4; f++) knob += exp(-pow(length(p.xz - uJ[f*4].xz) / 0.10, 2.0));
    knob *= smoothstep(0.1, 0.7, dors) * (1.0 - onFinger);
    /* 掌背肌腱（腕→各指根），老人更明顯 */
    float tendon = 0.0;
    for (int f = 0; f < 4; f++) { float t; float d = hrSeg(vec3(p.x, 0.0, p.z), vec3(uWr.x + (uJ[f*4].x - uWr.x) * 0.35, 0.0, uWr.z + 0.12), vec3(uJ[f*4].x, 0.0, uJ[f*4].z - 0.05), t);
      tendon += exp(-pow(d / 0.03, 2.0)) * smoothstep(0.0, 0.25, t) * (1.0 - smoothstep(0.8, 1.0, t)); }
    tendon *= smoothstep(0.2, 0.7, dors) * (1.0 - onFinger);
    /* 靜脈：扭曲雜訊的細窄谷線，只在手背與腕 */
    float vn = hrFbm(p * vec3(7.0, 7.0, 3.5) + hrNoise(p * 3.0) * 1.5);
    float vein = (1.0 - smoothstep(0.0, 0.035, abs(vn - 0.5))) * smoothstep(0.3, 0.8, dors) * (1.0 - onFinger) * uAge.z;
    /* 指甲 */
    float nailFrom = 2.28 - uMarks.w * 0.12;
    float nail = smoothstep(nailFrom, nailFrom + 0.05, bs) * smoothstep(0.30, 0.50, dors) * step(bd, 0.14);
    float cuticle = nail * (1.0 - smoothstep(nailFrom + 0.04, nailFrom + 0.16, bs));
    float freeEdge = smoothstep(2.88 - uMarks.w * 0.05, 2.98, bs) * nail;
    /* 繭（獵人）：掌指關節背與指尖腹 */
    float callus = uMarks.x * clamp(knob * 1.3 + smoothstep(2.5, 2.95, bs) * smoothstep(0.0, -0.5, dors), 0.0, 1.0);
    /* 疤（獵人）：手背斜疤＋一道舊擦痕 */
    float st; float sd = hrSeg(vec3(p.x, 0.0, p.z), vec3(uScar.x, 0.0, uScar.y), vec3(uScar.z, 0.0, uScar.w), st);
    float scar = uMarks.y * (1.0 - smoothstep(0.006, 0.016 + 0.012 * hrNoise(p * 25.0), sd)) * smoothstep(0.2, 0.6, dors) * smoothstep(0.02, 0.1, st) * (1.0 - smoothstep(0.9, 1.0, st));
    float scarRim = uMarks.y * (1.0 - smoothstep(0.03, 0.05, sd)) * smoothstep(0.2, 0.6, dors) * smoothstep(0.02, 0.1, st) * (1.0 - smoothstep(0.9, 1.0, st)) - scar;
    /* 老人斑 */
    float spots = uAge.y * smoothstep(0.56, 0.64, hrFbm(p * 9.0 + 3.1)) * smoothstep(0.1, 0.5, dors);
    /* 皮膚底色：底色 → 關節／指尖泛紅 → 微雜訊 → 紙纖維 */
    float micro = hrNoise(p * 220.0), fiber = hrNoise(p * vec3(30.0, 30.0, 160.0));
    vec3 c = uSkin;
    float flush = clamp(gB * onFinger * 0.6 + gC * onFinger * 0.5 + smoothstep(2.6, 3.0, bs) * 0.6 + knob * 0.5, 0.0, 1.0);
    c = mix(c, uWarm, flush * 0.55);
    c *= 0.90 + 0.10 * hrFbm(p * 14.0) + (fiber - 0.5) * 0.06 + (micro - 0.5) * 0.05 * (1.0 + uAge.w);
    c = mix(c, c * vec3(0.70, 0.64, 0.60), wrinkle * (0.35 + 0.45 * uAge.x));
    c = mix(c, c * vec3(0.72, 0.80, 1.08), vein * 0.6);
    c = mix(c, vec3(0.30, 0.17, 0.08) * (0.8 + 0.4 * hrNoise(p * 20.0)), spots * 0.75);
    c = mix(c, vec3(0.62, 0.50, 0.32), callus * 0.45);
    c = mix(c, vec3(0.55, 0.36, 0.30), scar * 0.85); c = mix(c, uWarm * 0.75, max(scarRim, 0.0) * 0.6);
    vec3 nc = mix(uNail * (0.9 + 0.2 * hrNoise(vec3(ax * 400.0, 0.0, 0.0))), uNail * 1.3 + 0.08, freeEdge);
    c = mix(c, nc, nail); c *= 1.0 - cuticle * 0.30;
    c = mix(c, c * 1.12, smoothstep(0.0, -0.6, dors) * 0.6); // 掌心側略淡
    diffuseColor.rgb = mix(diffuseColor.rgb, c, hrK);
    /* 高度場（bump）：橫紋凹、骨突／肌腱／疤凸、靜脈凸、微起伏 */
    float age = uAge.x;
    hrH = -wrinkle * 0.0025 * (0.6 + age) + knob * 0.006 * (0.5 + 0.8 * age) + tendon * 0.005 * (0.4 + 1.2 * age) + vein * 0.0016
        + scar * 0.0006 + (micro - 0.5) * 0.00012 * (1.0 + 2.0 * uAge.w) + nail * 0.0015 - cuticle * 0.001;
    hrRough = mix(uRough, 0.32, nail * (1.0 - freeEdge * 0.5));
    hrRough = mix(hrRough, 0.92, callus * 0.8); hrRough = mix(hrRough, 0.85, scar);
  }
}
`;

/* 配件（aSkin＝0）：vAcc.x＝類別（2 繩、3 木、4 金屬），繩的 vAcc.y＝沿繩長（dm）、vAcc.z＝截面角。 */
const FRAG_ACC = /* glsl */`
{
  float cls = floor(vAcc.x + 0.5);
  if (vSkin < 0.5 && cls > 1.5) {
    vec3 p = vRP; vec3 c = diffuseColor.rgb;
    hrA = 1.0;
    if (cls < 2.5) {
      /* 繩：三股捻繩——每股沿截面角斜繞（角 × 3 ＋ 沿長 × 捻距），股間凹槽壓暗；表面毛邊＝高頻雜訊 */
      float ply = fract(vAcc.z * 3.0 / 6.2831853 + vAcc.y * 22.0);
      float groove = smoothstep(0.0, 0.22, ply) * smoothstep(1.0, 0.78, ply);
      float fuzz = hrNoise(p * 420.0), fib = hrNoise(vec3(vAcc.y * 160.0, vAcc.z * 6.0, 0.0));
      c *= 0.55 + 0.45 * groove + (fuzz - 0.5) * 0.18 + (fib - 0.5) * 0.12;
      hrH = groove * 0.0018 + fuzz * 0.0003; hrRough = 0.95;
    } else if (cls < 3.5) {
      /* 木珠：年輪木紋（扭曲的平行帶）＋拋光——粗糙度低、有高光 */
      float w = sin(dot(p, vec3(0.35, 1.0, 0.25)) * 210.0 + hrFbm(p * 28.0) * 7.0);
      float pore = hrNoise(p * 380.0);
      float tone = 0.65 + 0.7 * hrNoise(p * 9.0); // 每顆深淺不一（低頻、珠徑尺度）
      c *= tone * (0.78 + 0.26 * smoothstep(-0.6, 0.9, w) + (pore - 0.5) * 0.10);
      hrH = w * 0.0004 + (pore - 0.5) * 0.0002; hrRough = 0.38;
    } else {
      /* 金屬（鉚釘、鐵扣、方孔錢）：金屬度高、粗糙度中低，帶一點磨痕與鏽點 */
      float wear = hrFbm(p * 60.0), pit = hrNoise(p * 300.0);
      c *= 0.82 + 0.30 * wear;
      hrMetal = 1.0; hrRough = 0.30 + 0.25 * wear; hrH = (pit - 0.5) * 0.00025;
    }
    diffuseColor.rgb = c;
  }
}
`;

/** 把角色幾何轉成寫實版：手部細分＋重塑＋前臂延長＋aSkin／aAcc 屬性。回新的 BufferGeometry（呼叫端快取）。
 *  袖管每幀由 updateArm 依相機重鋪（縮放改了也照樣接到畫面邊緣）。 */
export function realGeometry(rig, srcGeo, n0, key, variantInfo = null) {
  const { def, kind } = realDef(key === 'default' ? null : key);
  const d = loopSubdivide(srcGeo, n0, ARM.FINE_Z);
  reshape(rig, d, def);
  /* 配件的蒙皮權重改抄「細分＋重塑後最近的手部頂點」（原本抄的是原 GLB 頂點；細分後那個點的權重已被平均過，
     配件會和它貼著的皮膚錯開）——配件就跟畫面上那塊皮膚走同一組骨。 */
  const nearestBase = (x, y, z) => { let best = 0, bd = Infinity; for (let v = 0; v < d.nBase; v++) { const dx = d.P[v * 3] - x, dy = d.P[v * 3 + 1] - y, dz = d.P[v * 3 + 2] - z, dd = dx * dx + dy * dy + dz * dz; if (dd < bd) { bd = dd; best = v; } } return best; };
  const copyW = (e, b) => { for (let k = 0; k < 4; k++) { d.SI[e * 4 + k] = d.SI[b * 4 + k]; d.SW[e * 4 + k] = d.SW[b * 4 + k]; } };
  /* 硬的配件（木珠、金屬：aAcc 類別 3／4）整顆一組權重（抄離「這一顆的重心」最近的手部頂點），手腕彎時珠子不會被拉成橢圓；
     軟的（繩、布、毛）逐頂點抄，貼著皮膚走。 */
  const nAll = d.P.length / 3, par = new Int32Array(nAll).map((_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < d.index.length; t += 3) { const a = d.index[t], b = d.index[t + 1], c = d.index[t + 2]; if (a >= d.nBase && b >= d.nBase && c >= d.nBase) { par[find(a)] = find(b); par[find(b)] = find(c); } }
  { const at = new Map(); for (let e = d.nBase; e < nAll; e++) { const k = d.P[e * 3].toFixed(5) + ',' + d.P[e * 3 + 1].toFixed(5) + ',' + d.P[e * 3 + 2].toFixed(5); if (at.has(k)) par[find(e)] = find(at.get(k)); else at.set(k, e); } } // 同位置頂點（錢、扣的各面各自一份）焊成同一顆
  const comp = new Map(); for (let e = d.nBase; e < nAll; e++) { const r = find(e); if (!comp.has(r)) comp.set(r, []); comp.get(r).push(e); }
  for (const vs of comp.values()) {
    const rigid = vs.every((e) => { const c = Math.round(d.A[e * 3]); return c === 3 || c === 4; });
    if (rigid) {
      let x = 0, y = 0, z = 0; for (const e of vs) { x += d.P[e * 3]; y += d.P[e * 3 + 1]; z += d.P[e * 3 + 2]; }
      const b = nearestBase(x / vs.length, y / vs.length, z / vs.length); for (const e of vs) copyW(e, b);
    } else for (const e of vs) copyW(e, nearestBase(d.P[e * 3], d.P[e * 3 + 1], d.P[e * 3 + 2]));
  }
  /* 袖口一圈的截面（原頂點、細分後）：中心與半寬，給袖管接續用；袖管頂點的蒙皮抄這一圈最靠近的頂點（跟前臂骨走）。 */
  let cx = 0, cy = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, anchor = -1, ad = Infinity;
  for (let v = 0; v < d.nBase; v++) {
    const z = d.P[v * 3 + 2];
    if (Math.abs(z - ARM.Z0) > 0.05) continue;
    const x = d.P[v * 3], y = d.P[v * 3 + 1]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  cx = (x0 + x1) / 2; cy = (y0 + y1) / 2;
  const ra = (x1 - x0) / 2 + ARM.PAD, rb = (y1 - y0) / 2 + ARM.PAD;
  for (let v = 0; v < d.nBase; v++) { const dz = d.P[v * 3 + 2] - ARM.Z0, dd = (d.P[v * 3] - cx) ** 2 + (d.P[v * 3 + 1] - cy) ** 2 + dz * dz; if (dd < ad) { ad = dd; anchor = v; } }
  /* 留下來的原頂點（袖口以前）全不透明；z＜CUT 的原三角形之後整段丟掉 */
  for (let v = 0; v < d.nBase; v++) if (d.cs === 4 && d.P[v * 3 + 2] >= ARM.CUT) d.C[v * 4 + 3] = 1;
  const cut = (tri) => tri.every((v) => v < d.nBase && d.P[v * 3 + 2] < ARM.CUT);
  /* 袖管：先鋪靜態形狀（往後 STATIC_DM、微抬），每幀由 updateArm 重鋪。頂點全綁 Elbow 骨（權重 1）。 */
  const elbow = rig.idx.Elbow, tubeStart = d.P.length / 3, P2 = [], C2 = [], S2 = [], W2 = [], A2 = [], I2 = [];
  const col = [d.C[anchor * d.cs], d.C[anchor * d.cs + 1], d.C[anchor * d.cs + 2]], ts = [];
  for (let i = 0; i <= ARM.SEGS; i++) {
    const t = Math.pow(i / ARM.SEGS, 1.4); ts.push(t);
    const f = Math.min(1, Math.max(0, (t - ARM.FADE) / (1 - ARM.FADE))), alpha = 1 - f * f * (3 - 2 * f);
    const dk = Math.min(1, Math.max(0, (t - ARM.DARK) / (1 - ARM.DARK))), dim = 1 - 0.6 * dk * dk * (3 - 2 * dk);
    for (let j = 0; j < ARM.SIDES; j++) {
      P2.push(0, 0, 0); C2.push(col[0] * dim, col[1] * dim, col[2] * dim); if (d.cs === 4) C2.push(alpha);
      S2.push(elbow, 0, 0, 0); W2.push(1, 0, 0, 0); A2.push(0, 0, 0);
    }
  }
  for (let i = 0; i < ARM.SEGS; i++) for (let j = 0; j < ARM.SIDES; j++) {
    const j2 = (j + 1) % ARM.SIDES, a = tubeStart + i * ARM.SIDES + j, b = tubeStart + i * ARM.SIDES + j2, c = a + ARM.SIDES, e = b + ARM.SIDES;
    I2.push(a, c, b, b, c, e); // 環序見 layTube：j 逆時針繞 −z 方向的軸，這個繞序面法線朝外
  }
  const cat = (A, B, T) => { const o = new T(A.length + B.length); o.set(A); o.set(B, A.length); return o; };
  d.P = cat(d.P, P2, Float32Array); d.C = cat(d.C, C2, Float32Array); d.SI = cat(d.SI, S2, Uint16Array); d.SW = cat(d.SW, W2, Float32Array); d.A = cat(d.A, A2, Float32Array);
  const ring = { start: tubeStart, sides: ARM.SIDES, segs: ARM.SEGS, ts, ra, rb, anchor, off: [cx - d.P[anchor * 3], cy - d.P[anchor * 3 + 1], ARM.Z0 - d.P[anchor * 3 + 2]] };
  layTube(d.P, ring, [cx, cy, ARM.Z0], [0, 0, -1], [cx, cy + ARM.STATIC_RISE * ARM.STATIC_DM, ARM.Z0 - ARM.STATIC_DM]);
  /* 舊的頂點色疤條（獵人配件）由程式生成疤取代：那片配件頂點 alpha 設 0，整片三角形丟掉。 */
  for (let v = d.nBase; v < d.P.length / 3; v++) { const c = d.C.subarray(v * d.cs, v * d.cs + 3); if (Math.abs(c[0] - 0.74) + Math.abs(c[1] - 0.50) + Math.abs(c[2] - 0.42) < 1e-3 && d.cs === 4) d.C[v * d.cs + 3] = 0; }
  const keep = [];
  for (let t = 0; t < d.index.length; t += 3) {
    const tri = [d.index[t], d.index[t + 1], d.index[t + 2]];
    if (cut(tri)) continue; // 原前臂（換成袖管）
    if (d.cs === 4 && tri.every((v) => d.C[v * 4 + 3] < 0.01)) continue; // 三點全透明＝畫不出來（alphaTest 0.01），不送 GPU
    keep.push(...tri);
  }
  for (let t = 0; t < I2.length; t += 3) if (!(d.cs === 4 && [I2[t], I2[t + 1], I2[t + 2]].every((v) => d.C[v * 4 + 3] < 0.01))) keep.push(I2[t], I2[t + 1], I2[t + 2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(d.P, 3));
  g.setAttribute('color', new THREE.BufferAttribute(d.C, d.cs));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(d.SI, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(d.SW, 4));
  const sk = new Float32Array(d.P.length / 3); for (let v = 0; v < d.nBase; v++) sk[v] = kind + 1;
  g.setAttribute('aSkin', new THREE.BufferAttribute(sk, 1));
  g.setAttribute('aAcc', new THREE.BufferAttribute(d.A, 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(keep), 1));
  g.computeVertexNormals();
  if (variantInfo) g.userData.variant = variantInfo; // 變體配件資訊照舊可查（治具／測試）
  g.userData.real = { key, kind, verts: d.P.length / 3, tris: keep.length / 3, nBase: d.nBase, arm: [tubeStart, d.P.length / 3] };
  g.userData.armRing = ring;
  return g;
}

/** 依起點 p0、起步方向 dir0、終點 p2（都在網格局部座標）把袖管各圈鋪上二次曲線；寫進 P（Float32Array）。回每圈中心（測試用）。 */
function layTube(P, ring, p0, dir0, p2, N = null) {
  const L = Math.hypot(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]) || 1, k = Math.min(L * 0.35, 3);
  const p1 = [p0[0] + dir0[0] * k, p0[1] + dir0[1] * k, p0[2] + dir0[2] * k];
  let prevU = null;
  for (let i = 0; i <= ring.segs; i++) {
    const t = ring.ts[i], a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    const ctr = [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1], a * p0[2] + b * p1[2] + c * p2[2]];
    let tg = [2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]), 2 * (1 - t) * (p1[2] - p0[2]) + 2 * t * (p2[2] - p1[2])];
    const tl = Math.hypot(...tg) || 1; tg = [tg[0] / tl, tg[1] / tl, tg[2] / tl];
    /* 截面基底：u 盡量維持網格的 x 軸（袖口橢圓的長軸），沿管平行移動，不扭 */
    let u = prevU || [1, 0, 0]; const du = u[0] * tg[0] + u[1] * tg[1] + u[2] * tg[2];
    u = [u[0] - tg[0] * du, u[1] - tg[1] * du, u[2] - tg[2] * du]; const ul = Math.hypot(...u) || 1; u = [u[0] / ul, u[1] / ul, u[2] / ul]; prevU = u;
    const w = [u[1] * tg[2] - u[2] * tg[1], u[2] * tg[0] - u[0] * tg[2], u[0] * tg[1] - u[1] * tg[0]];
    for (let j = 0; j < ring.sides; j++) {
      const th = (j / ring.sides) * Math.PI * 2, ct = Math.cos(th) * ring.ra, st = Math.sin(th) * ring.rb, o = (ring.start + i * ring.sides + j) * 3;
      P[o] = ctr[0] + u[0] * ct + w[0] * st; P[o + 1] = ctr[1] + u[1] * ct + w[1] * st; P[o + 2] = ctr[2] + u[2] * ct + w[2] * st;
      if (N) { const nx = u[0] * Math.cos(th) / ring.ra + w[0] * Math.sin(th) / ring.rb, ny = u[1] * Math.cos(th) / ring.ra + w[1] * Math.sin(th) / ring.rb, nz = u[2] * Math.cos(th) / ring.ra + w[2] * Math.sin(th) / ring.rb, nl = Math.hypot(nx, ny, nz) || 1; N[o] = nx / nl; N[o + 1] = ny / nl; N[o + 2] = nz / nl; }
    }
  }
}

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2(), _plane = new THREE.Plane(), _hit = new THREE.Vector3();
/**
 * 每幀重鋪一隻手的袖管（修訂 4）：袖口 → 最近畫面邊緣的最短路徑。mesh＝該手的 SkinnedMesh（幾何是這一席自己的一份）。
 * avoid（可省）：畫面上拍品外框 [{x0,y0,x1,y1}]（NDC），路徑跟它們相交就換下一近的邊。
 * 回 { edge, target }（給治具查）。沒有相機＝不動（保留上一次或靜態形狀）。
 */
export function updateArm(mesh, camera, avoid) {
  const g = mesh.geometry, ring = g.userData.armRing; if (!ring || !camera) return null;
  const P = g.attributes.position.array;
  /* 袖口中心（蒙皮後、網格局部）：錨點頂點蒙皮後的位置＋它到截面中心的靜態偏移 */
  _v.fromBufferAttribute(g.attributes.position, ring.anchor); mesh.applyBoneTransform(ring.anchor, _v);
  const p0 = [_v.x + ring.off[0], _v.y + ring.off[1], _v.z + ring.off[2]];
  /* 效能：相機、這隻手的位置姿勢、袖口都沒變（凍結、停一拍、靜止鏡頭）就不重鋪、不重傳 */
  const sig = g.userData.armSig || (g.userData.armSig = new Float64Array(16 + 16 + 2 + 3)), cw = camera.matrixWorld.elements, mw = mesh.matrixWorld.elements, pm = camera.projectionMatrix.elements;
  let same = true; const put = (i, x) => { if (sig[i] !== x) { same = false; sig[i] = x; } };
  for (let i = 0; i < 16; i++) { put(i, cw[i]); put(16 + i, mw[i]); } put(32, pm[0]); put(33, pm[5]); put(34, p0[0]); put(35, p0[1]); put(36, p0[2]);
  if (same && g.userData.armLast) return g.userData.armLast;
  _w.set(p0[0], p0[1], p0[2]).applyMatrix4(mesh.matrixWorld); const wristW = _w.clone();
  const q = wristW.clone().project(camera);
  const edges = [
    { e: 'left', d: q.x + 1, ndc: [-1 - ARM.MARGIN, q.y] }, { e: 'right', d: 1 - q.x, ndc: [1 + ARM.MARGIN, q.y] },
    { e: 'bottom', d: q.y + 1, ndc: [q.x, -1 - ARM.MARGIN] }, { e: 'top', d: 1 - q.y, ndc: [q.x, 1 + ARM.MARGIN] },
  ].sort((a, b) => a.d - b.d);
  /* 候選邊的目標點：過目標點的視線與「手腕高＋LIFT」的水平面交點；交不到（視線朝上）或太遠就取手腕到相機的距離 */
  const dw = camera.getWorldPosition(new THREE.Vector3()).distanceTo(wristW);
  const targetOf = (c) => { _ndc.set(c.ndc[0], c.ndc[1]); _ray.setFromCamera(_ndc, camera); _plane.set(new THREE.Vector3(0, 1, 0), -(wristW.y + ARM.LIFT));
    let T = _ray.ray.intersectPlane(_plane, _hit) ? _hit.clone() : null; if (!T || T.distanceTo(wristW) > dw * 3) T = _ray.ray.at(dw, new THREE.Vector3()); return T; };
  /* 避開拍品（修訂 4）：把每條候選袖管實際的曲線（同 layTube 的二次曲線）取 16 點投影到畫面，數落在任一拍品外框（外擴 PAD_NDC）
     內的點數；取點數最少的邊，同分取最近的邊。手常停在拍品腳邊、起點本來就在外框裡，所以比的是「壓過多少」，不是「有沒有碰」。 */
  const cover = (T) => {
    const tl = mesh.worldToLocal(T.clone()), L = Math.hypot(tl.x - p0[0], tl.y - p0[1], tl.z - p0[2]) || 1, k = Math.min(L * 0.35, 3), p1 = [p0[0], p0[1], p0[2] - k];
    let n = 0; const e = ARM.PAD_NDC;
    for (let i = 1; i <= 16; i++) {
      const t = i / 16, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, cc = t * t;
      _v.set(a * p0[0] + b * p1[0] + cc * tl.x, a * p0[1] + b * p1[1] + cc * tl.y, a * p0[2] + b * p1[2] + cc * tl.z).applyMatrix4(mesh.matrixWorld).project(camera);
      if (avoid.some((r) => _v.x > r.x0 - e && _v.x < r.x1 + e && _v.y > r.y0 - e && _v.y < r.y1 + e)) n++;
    }
    return n;
  };
  let pick = edges[0], T = null;
  if (avoid && avoid.length) { let best = Infinity; for (const c of edges) { const Tc = targetOf(c), k = cover(Tc); if (k < best) { best = k; pick = c; T = Tc; } } }
  if (!T) T = targetOf(pick);
  const tl = mesh.worldToLocal(T.clone());
  layTube(P, ring, p0, [0, 0, -1], [tl.x, tl.y, tl.z], g.attributes.normal.array);
  /* 只重傳袖管那一段 */
  for (const at of [g.attributes.position, g.attributes.normal]) { at.updateRange.offset = ring.start * 3; at.updateRange.count = (ring.segs + 1) * ring.sides * 3; at.needsUpdate = true; }
  return (g.userData.armLast = { edge: pick.e, target: T.toArray() });
}

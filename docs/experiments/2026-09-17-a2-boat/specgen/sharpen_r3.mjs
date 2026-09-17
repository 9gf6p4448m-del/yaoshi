/* A2 標竿卷 boat — 第 3 輪（最後一輪）去「玩具感」（2026-09-17）
 * 第 2 輪盲讀：色系①祖靈 4/4 過（含桌面大小 2/2），但「可愛／玩具」2/2 都答會，原話＝
 *   「無臉圓頭人偶、短胖比例、平滑低面數幾何加鮮明撞色，很像木製模型玩具船」「船身渾圓厚實、色塊卡通化」。
 * 本輪保住色系①（大地褐主體＋靛藍第二色＋赤紅點綴，不回白殼），把剪影往「鋒利、細長、肅穆」拉。
 * 允許動：palette、arcs、volumes 尺寸與 tessellation、parts。**不動 joints／chains／attach／touch／mirror／animations。**
 * 就地改 assets/creatures/boat.json，寫絕對值，重跑冪等。
 * 跑法：node docs/experiments/2026-09-17-a2-boat/specgen/sharpen_r3.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const SPEC = path.join(ROOT, 'assets', 'creatures', 'boat.json');
const CLAIMS = path.join(ROOT, 'assets', 'creatures', 'boat.claims.json');

// ── 色票：老木更深、撞色降下來。靛藍統一壓到 #24356e 一帶並縮到「首尾飾＋細帶」，黑用濕黑。
const C = {
  hull_body: '#7d6044',   // 老風化木（原 #8a6a4c，壓深壓灰）
  bone: '#ded2bb',        // 獸骨／貝片（原 #e6dccb，稍冷）
  trim_red: '#8f2c1a',    // 赤紅點綴，沉下來（原 #a33520）
  socket: '#1a1612',      // 濕黑（原 #2b2c30）
  eye: '#1f1a15',         // 船眼瞳改濕黑，拿掉亮橘寶石（原 #d8451f）
  glow_prow: '#24356e',   // 首尾尖翹：深靛藍（原 #3a5bb0）
  lash: '#5e4a36',        // 划手＝深風化木（原 #6d5540）
  oar: '#97805e',         // 槳／襯板／雞羽／織紋片（原 #9f8461）
  bead: '#24356e',        // 靛藍琉璃珠／細帶（原 #2f4fa8，降飽和變深）
};

// ── 船殼分帶：靛藍從 15° 縮到 7.5° 一條細帶，濕黑帶回來當織紋底，板縫加深（老木感）。
const ARCS = [
  { from: 0, to: 37.5, color: '#2f2820' },      // 艙內
  { from: 37.5, to: 45, color: '#4e3c2a' },     // 舷內深木
  { from: 45, to: 52.5, color: '#24356e' },     // 靛藍細帶（7.5°，原 15°）
  { from: 52.5, to: 60, color: '#1a1612' },     // 濕黑帶：織紋骨片的底
  { from: 60, to: 82.5, color: '#7d6044' },     // 老木板條 1
  { from: 82.5, to: 97.5, color: '#ded2bb' },   // 骨白窄帶：紅／濕黑三角波浪紋的底
  { from: 97.5, to: 105, color: '#8f2c1a' },    // 赤紅細線
  { from: 105, to: 142.5, color: '#6b5138' },   // 老木板條 2
  { from: 142.5, to: 150, color: '#1f1a15' },   // 板縫加深
  { from: 150, to: 180, color: '#3e3327' },     // 龍骨
];

const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
for (const [m, hex] of Object.entries(C)) spec.palette[m].color = hex;
spec.volumes[0].colors.arcs = ARCS;

// ── volumes：船體收窄（「渾圓厚實」→ 細長），環距放粗（faceted 之下＝更大的木板刻面，不是更圓滑）。
const hull = spec.volumes.find((v) => v.chain === 'hull');
hull.profile = [[0, 0.026, 0.062], [0.11, 0.089, 0.15, { sharp: true }], [0.3, 0.158, 0.205, { sharp: true }],
  [0.55, 0.172, 0.205, { sharp: true }], [0.76, 0.132, 0.205, { sharp: true }], [0.89, 0.064, 0.12, { sharp: true }], [1, 0.017, 0.05]];
hull.ring_step = 0.064;
// 划手：短胖 → 瘦長（關節不能動，比例只能靠半徑；同時降面數把預算讓給頭部尖飾）
for (const v of spec.volumes.filter((x) => x.chain.startsWith('rower'))) {
  // 舷緣落在 t≈0.52：把「披肩最寬」放在那裡，露出舷外的那一截才會是一個上窄下寬的三角，
  // 而不是「棒子上頂一顆球」（第一版就是這樣，讀成圖騰柱不是人）。外擴斜率 0.32 < 0.4（>0.4 必翻面）。
  v.profile = [[0, 0.036, 0.030], [0.30, 0.048, 0.040, { exp: 4.6, sharp: true }], [0.52, 0.086, 0.062, { exp: 4.6, sharp: true }],
    [0.63, 0.052, 0.044, { exp: 4.6, sharp: true }], [0.70, 0.024, 0.021, { sharp: true }],
    [0.80, 0.038, 0.034, { exp: 4.6, sharp: true }], [0.93, 0.035, 0.032, { exp: 4.6 }], [1, 0.011, 0.011]];
  v.sides = 8;
  v.ring_step = 0.046;
}

// ── parts：先把既有件改形／改材質，再加新件。predicate 全部可重複套用。
const P = spec.parts;
const at = (around) => (p) => p.anchor && p.anchor.around === around;
const off = (y, z) => (p) => !p.anchor && p.offset && p.offset[1] === y && p.offset[2] === z;

// 1) 船眼：8 道放射三角 → 6 道更長更尖的骨刺（同心圓保留，瞳改濕黑由 palette 處理）
{
  const rays = P.filter((p) => at(72)(p) && p.points && p.points.length === 3);
  const r = 0.099;
  const keep = rays.slice(0, 6);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const pt = (rad, da) => [+(Math.cos(a + da) * rad).toFixed(4), +(Math.sin(a + da) * rad).toFixed(4)];
    keep[k].points = [pt(r * 0.94, -0.10), pt(r * 0.94, 0.10), pt(r * 1.34, 0)];
  }
  for (const p of rays.slice(6)) P.splice(P.indexOf(p), 1);
}

// 2) 首尾尖翹刃：加長收窄（更尖更長的翹角）。
//    外形一律由「船首那一份」鏡射出船尾那一份（u 取負），凸性才保證跟著過去——
//    本輪第一次手寫四份時有三份非凸／近退化，直接 mesh_integrity BLOCK。
const reshape = (pred, pts, th) => { const p = P.find(pred); if (p) { p.points = pts; if (th) p.thickness = th; } };
const flipU = (pts) => pts.map(([u, v]) => [-u, v]);
const PROW_BLADE = [[-0.108, -0.086], [0.074, -0.028], [0.100, 0.230], [0.046, 0.620], [-0.060, 0.230]];
const PROW_BACK = [[-0.058, -0.046], [0.040, -0.016], [0.054, 0.200], [0.024, 0.500], [-0.032, 0.200]];
const STERN_BLADE = flipU([[-0.104, -0.086], [0.074, -0.028], [0.100, 0.215], [0.046, 0.560], [-0.058, 0.215]]);
const STERN_BACK = flipU([[-0.054, -0.046], [0.038, -0.016], [0.050, 0.185], [0.022, 0.440], [-0.030, 0.185]]);
reshape((p) => p.material === 'glow_prow' && off(0, 0.17)(p), PROW_BLADE);
reshape((p) => p.material === 'oar' && off(0, 0.17)(p), PROW_BACK);
reshape((p) => p.material === 'trim_red' && off(0, -0.17)(p), STERN_BLADE);
reshape((p) => p.material === 'oar' && off(0, -0.17)(p), STERN_BACK);

// 3) 雞羽飾：扇形 → 細長羽（去掉「圓潤扇子」的玩具感）
const feather = [[0.00, -0.30], [0.085, -0.06], [0.105, 0.34], [0.040, 0.78], [-0.055, 0.56], [-0.075, 0.10]];
// 羽根的靛藍：細長羽管（不論四邊形或三角形）寬 0.026–0.038／厚 0.009 都會在 bind pose 生翻面
// （二分法逐組拔件定位到這一件），改成一顆厚實的八角琉璃珠——ART_BIBLE:34 的祖靈材質，
// 幾何安全，靛藍也仍有實體載體（claims part_exists bead）。
const bead8 = (r) => [0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
  const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
  return [+(Math.cos(a) * r).toFixed(4), +(Math.sin(a) * r).toFixed(4)];
});
for (const [y, z, sgn, sc] of [[0.4, 0.17, 1, 0.35], [0.3, -0.24, -1, 0.31]]) {
  reshape((p) => p.material === 'oar' && off(y, z)(p), feather.map(([u, v]) => [+(u * sgn * sc).toFixed(4), +(v * sc).toFixed(4)]), 0.012);
  const b = P.find((p) => p.material === 'bead' && off(y, z)(p));
  if (b) { b.points = bead8(0.032).map(([u, v]) => [u, +(v + 0.030).toFixed(4)]); b.thickness = 0.024; }
}

// 4) 波浪三角紋：紅／濕黑（socket 已改濕黑），三角拉窄拉尖
for (const p of P.filter(at(92))) {
  const up = p.material === 'trim_red';
  const w = 0.030, h = 0.072;
  p.points = up ? [[-w, -h * 0.40], [w, -h * 0.40], [0, h * 0.70]] : [[-w, h * 0.40], [w, h * 0.40], [0, -h * 0.70]];
}

// 5) 舷上緣織紋片：菱形 → 細長骨片（材質改 bone＝獸骨／貝片），落在濕黑帶上
for (const p of P.filter(at(56))) {
  p.material = 'bone';
  p.points = [[0.034, 0], [0.012, 0.020], [-0.034, 0], [0.012, -0.020]];
}

// 6) 划手肩上的藍色小方塊 → 骨片肩甲（bead 只留給首尾飾與細帶）
for (const p of P.filter((p) => p.material === 'bead' && !p.anchor && p.offset && Math.abs(p.offset[0]) > 0.04)) {
  p.material = 'bone';
  p.thickness = 0.016;
  p.offset = [Math.sign(p.offset[0]) * 0.066, -0.078, p.offset[2]];
  p.points = [[0.070, 0.004], [0.040, 0.038], [-0.034, 0.040], [-0.064, 0.002], [-0.028, -0.040], [0.038, -0.042]];
}

// 7) 新件：藤盔尖頂＋額飾骨片（無臉圓頭 → 有稜角的頭），首尾獸骨尖飾。重跑前先清掉舊的同名件。
for (const n of ['helmet', 'brow', 'bonespike']) {
  for (let i = P.length - 1; i >= 0; i--) if ((P[i].name || '').startsWith(n)) P.splice(i, 1);
}
// 划手半徑 ×0.72 之後，手臂與槳原本的 x offset 落到體外（part_attachment BLOCK），一起往內收、槳桿補長。
for (const [pred, o, extra] of [
  [(p) => p.type === 'curve' && p.host === 'RowFChest' && p.segments.length === 2, [0.034, 0.030, 0.004], null],
  [(p) => p.type === 'curve' && p.host === 'RowAChest' && p.segments.length === 2, [0.032, 0.026, -0.004], null],
  [(p) => p.type === 'curve' && p.host === 'RowFChest' && p.segments.length === 4, [0.040, -0.012, 0.024], 0.300],
  [(p) => p.type === 'curve' && p.host === 'RowAChest' && p.segments.length === 4, [0.038, -0.016, -0.022], 0.275],
]) { const p = P.find(pred); if (p) { p.offset = o; if (extra) p.segments[0].len = extra; } }

for (const [head, sc, dy] of [['RowFHead', 1, -0.030], ['RowAHead', 0.92, -0.028]]) {
  P.push({
    // 盔的第一環要埋進頭顱最寬處，掛在頭關節（t=1、半徑 0.010）上會被判浮空
    type: 'curve', name: 'helmet_' + head, host: head, material: 'lash', sides: 6,
    offset: [0, dy, 0.002], dir: [0, 0.93, -0.37],
    segments: [{ len: 0.020 * sc, r: 0.032 * sc }, { len: 0.078 * sc, r: 0.062 * sc }, { len: 0.062 * sc, r: 0.010 * sc, taper: true }],
  });
  P.push({
    type: 'fin', name: 'brow_' + head, host: head, material: 'bone', thickness: 0.014, conform: false,
    offset: [0, -0.058, 0.006], udir: [1, 0, 0], vdir: [0, 1, 0],
    points: [[0.026 * sc, -0.006], [0.015 * sc, 0.009], [-0.015 * sc, 0.009], [-0.026 * sc, -0.006], [-0.014 * sc, -0.014], [0.014 * sc, -0.014]],
  });
}
P.push({
  type: 'fin', name: 'bonespike_bow', host: 'BowBase', material: 'bone', thickness: 0.020,
  offset: [0, 0.40, 0.17], udir: [0, 0, 1], vdir: [0, 1, 0],
  points: [[0.030, -0.120], [0.062, 0.070], [0.026, 0.330], [-0.018, 0.090]],
});
P.push({
  type: 'fin', name: 'bonespike_stern', host: 'Stern', material: 'bone', thickness: 0.020,
  offset: [0, 0.30, -0.24], udir: [0, 0, 1], vdir: [0, 1, 0],
  points: [[-0.028, -0.110], [-0.056, 0.064], [-0.024, 0.290], [0.016, 0.082]],
});

spec._variant = 'A2 標竿卷（2026-09-17）甲案出貨版，第 3 輪去玩具感：色系①原樣保住（大地褐主體、靛藍第二色、赤紅點綴），'
  + '造型改為 ① 船體半寬 ×0.85、ring_step 0.058→0.064（渾圓厚實→細長、木板刻面更大）② 划手半徑 ×0.72、sides 10→8，'
  + '加藤盔尖頂與額飾骨片（無臉圓頭→有稜角的頭），肩上藍方塊改骨片肩甲 ③ 首尾翹刃加長收窄、雞羽改細長羽、加獸骨尖飾 '
  + '④ 波浪三角改紅／濕黑並拉尖，舷上緣織紋片改獸骨細片落在濕黑帶上，板縫加深。joints／chains／attach／touch／mirror／animations 一格未動。';
fs.writeFileSync(SPEC, JSON.stringify(spec, null, 1));

// ── claims：只同步顏色與新加的 part 條目。
const cl = JSON.parse(fs.readFileSync(CLAIMS, 'utf8'));
const set = (type, k, v) => { const c = cl.claims.find((x) => x.type === type); if (c) c[k] = v; return c; };
set('style_light', 'min_median_lum', 35).label = '老風化木：側視中位亮度不得低於 35/255（2026-09-04 的炭黑版 34.2 仍會被擋下）';
set('style_dark', 'max_median_lum', 75).label = '不得再是米白殼：側視中位亮度不得高於 75/255（第 1 輪被讀成香火的米白版 97.6、第 2 輪 63.7）';
cl.name = '拼板舟 boat（A2 甲案出貨版·第 3 輪去玩具感，zuling/swarm）';
cl._role = cl._role.split(' ｜ 第 3 輪')[0] + ' ｜ 第 3 輪（2026-09-17）：老木比第 2 輪更深，style_light 由 45→35（炭黑版 34.2 仍紅）、'
  + 'style_dark 由 85→**75**（加嚴一格）；新增 part_exists bead，明寫「靛藍只剩首尾飾與細帶，但不得消失」。其餘門檻與 part 條目一格未動。';
if (!cl.claims.some((c) => c.type === 'part_exists' && c.part === 'bead')) {
  cl.claims.push({ type: 'part_exists', part: 'bead', stage: 'MID', label: '靛藍第二色必須留有實體載體（首尾雞羽管）——縮面積不等於拿掉' });
}
fs.writeFileSync(CLAIMS, JSON.stringify(cl, null, 1));
console.log(JSON.stringify({ parts: P.length, claims: cl.claims.length }));

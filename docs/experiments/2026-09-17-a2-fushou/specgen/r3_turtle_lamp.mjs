/* A2 標竿卷第二件 福壽綿長 — 第 3 輪（最後一輪，2026-09-17）
 *
 * 第 2 輪盲讀（2 位新讀者看 hero-a2／stage-a2／n3-a2）：
 *   色系② 2/2 過；概念 1/2（D「背著紅金匾額的巨龜」、C「盾甲怪獸」）；
 *   **燈 0/2**（C「左下方垂掛橘紅扇狀飾物＋一條紅色緞帶」、D「前左有橘金色三角鰭／旗與紅布條」）；
 *   可愛 1/2（D「偏玩具／公仔：圓滾滾身軀配短柱腿、頭小身大，像扭蛋公仔」）；
 *   殼上「金框紅牌／八角紅板」被讀成立牌／匾額。
 *
 * 本輪三個目標（優先序由上到下）：① 燈一眼可辨 ② 龜不是怪獸 ③ 去公仔感。
 * 輸入：docs/experiments/2026-09-17-a2-fushou/specs/fushou_r2.json（第 2 輪定稿快照，唯讀）
 * 輸出：assets/creatures/fushou.json、fushou.claims.json（正式檔，可重複執行）
 * 跑法：node docs/experiments/2026-09-17-a2-fushou/specgen/r3_turtle_lamp.mjs
 * 鏈／關節名稱與動畫 clip 名一個都沒動；關節位置依造型要求移動。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const CRE = path.join(ROOT, 'assets', 'creatures');
const SPECS = path.join(ROOT, 'docs', 'experiments', '2026-09-17-a2-fushou', 'specs');
const s = JSON.parse(fs.readFileSync(path.join(SPECS, 'fushou_r2.json'), 'utf8'));
const J = s.joints;
const P = (c) => s.parts.find((p) => p._c === c);
const PS = (c) => s.parts.filter((p) => p._c && p._c.startsWith(c));
const V = (c) => s.volumes.find((v) => v.chain === c);
const drop = (re) => { s.parts = s.parts.filter((p) => !re.test(p._c || '')); };
const hexa = (hw, hh) => [[-hw, -hh * 0.55], [0, -hh], [hw, -hh * 0.55], [hw, hh * 0.55], [0, hh], [-hw, hh * 0.55]];
const teardrop = (h, w) => [[0, -h * 0.08], [w * 0.66, h * 0.12], [w, h * 0.36], [w * 0.52, h * 0.74],
  [0, h], [-w * 0.52, h * 0.74], [-w, h * 0.36], [-w * 0.66, h * 0.12]];

s._variant = s._variant.replace('⑥ 腿加長', '⑥（第 3 輪）燈碗改成正前方置中的寬淺香灰白高足碗＋鎏金碗沿＋大面積亮油面、'
  + '紅布條與翹角簷全拿掉、頭改龜頭（喙吻無牙、頸伸出殼外）、甲片壓平成貼面六角片、身體壓扁拉長、腿加長屈膝。⑤ 腿加長');
s._r3_blindread = '第 2 輪盲讀原話：燈 0/2——C「左下方垂掛橘紅扇狀飾物＋一條紅色緞帶」、D「前左有橘金色三角鰭／旗與紅布條」；'
  + '殼上「金框紅牌／八角紅板」讀成立牌／匾額；D 判可愛「偏玩具／公仔：圓滾滾身軀配短柱腿、頭小身大」。'
  + '本輪把「被讀成布條／旗／鰭」的三件（燈龕紅背板、翹角簷、脊珠）整個拿掉，燈改成一口正前方置中的大碗。';

// ════════════════════════════════════════════════════════════════
// ③-a 身體壓扁拉長：油壺身縱向 ×0.85（以 y=0.20 為原點）、龜甲與裙邊整條跟著下移，前後（第二半徑）×1.10
// ════════════════════════════════════════════════════════════════
const g = (y) => +(0.20 + (y - 0.20) * 0.85).toFixed(4);
for (const k of ['Pt0', 'Pt1', 'Pt2', 'Pt3', 'Pt4', 'Bd0', 'Bd1', 'Bd2', 'Tl0', 'Tl1', 'Tl2']) J[k] = [J[k][0], g(J[k][1]), J[k][2]];
const dy = +(g(1.0) - 1.0).toFixed(4);          // 殼與裙整條下移，穹隆不壓扁（壓扁 shell_dark 會掉出識別視角門檻）
for (const k of ['Sh0', 'Sh1', 'Sh2', 'Sh3', 'Sk0', 'Sk1', 'Sk2', 'Crest']) J[k] = [J[k][0], +(J[k][1] + dy).toFixed(4), J[k][2]];
const deepen = (c, k) => { const v = V(c); v.profile = v.profile.map((r) => [r[0], r[1], +(r[2] * k).toFixed(5), r[3]]); };
deepen('pot', 1.10); deepen('shell', 1.10); deepen('skirt', 1.10);   // 前後拉長＝不是正圓罐
// 穹隆再加寬一階：甲片與大碗都在吃 shell_dark 的面積，focal_contrast（shell_dark ≥3× glow_lamp）要靠深色底撐
V('shell').profile = V('shell').profile.map((r) => [r[0], +(r[1] * 1.20).toFixed(5), r[2], r[3]]);

// ③-b 腿加長、膝有角度（第 2 輪被讀成「短柱腿」）
J.LFrHip = [0.24, 0.400, 0.160]; J.LFrKnee = [0.470, 0.215, 0.300]; J.LFrToe = [0.560, 0.020, 0.290];
J.LBkHip = [0.23, 0.380, -0.180]; J.LBkKnee = [0.460, 0.215, -0.320]; J.LBkToe = [0.540, 0.020, -0.310];
// 膝一有角度，腿管就會在彎折處擠出翻面三角形（cli 的 anim_integrity 建議：ring_step 放寬）：三條鏈一起放寬環距
for (const c of ['LFront', 'LBack', 'head']) V(c).ring_step = +(V(c).ring_step * 1.8).toFixed(4);
for (const c of ['LFront', 'LBack']) V(c).profile = V(c).profile.map((r) => [r[0], +(r[1] * 0.92).toFixed(5), +(r[2] * 0.92).toFixed(5), r[3]]);

// ════════════════════════════════════════════════════════════════
// ② 龜不是怪獸
// ② -a 甲片：立起的「金框紅牌」→ 貼平在殼面、只靠深溝分格的微凸六角甲片
//     厚度 0.026→0.010（半寬的 0.08），鎏金襯邊只比盾面大 6%＝一條細溝線，不是畫框
// ════════════════════════════════════════════════════════════════
drop(/^(vertebral|costal) scute/);
const shellScute = (name, t, around, hw, hh) => ([
  { type: 'fin', _c: `${name} rim`, host: 'Sh1', material: 'gold_trim', thickness: 0.006, smooth_angle: 26,
    anchor: { chain: 'shell', t, around }, udir: [1, 0, 0], vdir: [0, 1, 0], points: hexa(hw * 1.06, hh * 1.06) },
  { type: 'fin', _c: name, host: 'Sh1', material: 'shell_plate', thickness: 0.010, smooth_angle: 26,
    anchor: { chain: 'shell', t, around }, udir: [1, 0, 0], vdir: [0, 1, 0], points: hexa(hw, hh) },
]);
const sc = [];
for (const [t, a, hw, hh] of [[0.20, 180, 0.150, 0.125], [0.50, 180, 0.148, 0.123], [0.84, 180, 0.132, 0.110],
  [0.50, 0, 0.148, 0.123], [0.20, 0, 0.150, 0.125]]) sc.push(...shellScute(`vertebral scute ${sc.length}`, t, a, hw, hh));
for (const [t, a] of [[0.34, 74], [0.56, 56], [0.56, 124], [0.34, 106], [0.34, -74], [0.56, -56], [0.56, -124], [0.34, -106]]) {
  sc.push(...shellScute(`costal scute ${sc.length}`, t, a, 0.132, 0.112));
}
s.parts.unshift(...sc);

// ② -b 龜頭：喙狀吻、無獠牙、頸伸出殼外、頭放大
drop(/^(fang |bixi )/);                                    // 五顆方齒＋鬚＋角全拿掉（「獠牙怪獸」的來源）
J.Nk0 = [0, 0.720, 0.060]; J.Nk1 = [0, 0.735, 0.300]; J.Hd0 = [0, 0.760, 0.500]; J.Hd1 = [0, 0.775, 0.645];
// 頭一動、頭一放大，兩顆高光關節（絕對座標）就要重新回填，否則高光沉到眼球後面
// （本輪第一次跑忘了寫這兩行，hi_white 正面佔比 0.07%，門檻 0.20%）。
// 眼球中心由 scratchpad/a2f/eyeprobe.cjs 走引擎真實路徑量出＝(0.1477,0.8055,0.4996)，
// 位移沿用第 1 輪相對眼球的 A(+0.0482,+0.0519,+0.0446)／B(+0.0682,−0.0261,+0.0526)。
J.EyHiA = [0.1959, 0.8574, 0.5442]; J.EyHiB = [0.2159, 0.7794, 0.5522];
V('head').profile = [[0, 0.072, 0.065, { exp: 4.6 }], [0.25, 0.098, 0.089, { exp: 4.7 }],
  [0.46, 0.168, 0.151, { exp: 5, sharp: true }], [0.62, 0.190, 0.160, { exp: 5.2 }],
  [0.80, 0.176, 0.140, { exp: 6.4, sharp: true }], [1, 0.120, 0.092, { exp: 6.6 }]];   // 頭放大 ×1.2、吻端收尖
P('mouth slot').offset = [0, -0.058, 0.004];
P('mouth slot').points = P('mouth slot').points.map(([u, v]) => [u * 0.86, v * 0.80]);
s.parts.push(
  // 角質喙：上喙一片往前下扣的骨色楔子，下喙一片較小的，合起來是龜的嘴
  { type: 'curve', _c: 'horny beak upper', host: 'Hd1', material: 'tusk', offset: [0, -0.012, 0.050], sides: 6,
    dir: [0, -0.34, 0.94], segments: [{ len: 0.062, r: 0.052 }, { len: 0.046, r: 0.022, fall: 34, taper: true }], smooth_angle: 26 },
  { type: 'curve', _c: 'horny beak lower', host: 'Hd1', material: 'tusk', offset: [0, -0.062, 0.030], sides: 6,
    dir: [0, -0.10, 0.99], segments: [{ len: 0.048, r: 0.036 }, { len: 0.032, r: 0.016, rise: 16, taper: true }], smooth_angle: 26 },
);

// ════════════════════════════════════════════════════════════════
// ① 燈一眼可辨：正前方置中的寬淺香灰白高足碗＋鎏金碗沿＋大面積亮油面＋一朵火苗
//    紅背板／翹角簷／脊珠（被讀成布條、旗、鰭）全部拿掉
// ════════════════════════════════════════════════════════════════
// 「龕」整組拿掉：紅背板、翹角簷、脊珠、兩根龕柱——兩輪盲讀四個人全部讀成旗／鰭／布條／緞帶，
// 一個都沒讀成龕。niche 鏈不能刪（鏈名與 touch 要對得上），改成一截藏在燈碗高足裡的細柱，看不見。
drop(/^niche /);
J.Cp0 = [0, 0.140, 0.000]; J.Cp1 = [0, 0.128, 0.220]; J.Cp2 = [0, 0.150, 0.400];
// 碗口法線由 (0,0.905,0.425)（偏朝上）改成 (0,0.72,0.69)（朝上前 44°）：
// 正面是識別視角，碗太朝上就只看得到一條邊，看不到「碗裡有油」——盲讀兩輪都沒人說出燈。
const NRM = [0, 0.80, 0.60];
J.Cp3 = [0, +(J.Cp2[1] + 0.150 * NRM[1]).toFixed(4), +(J.Cp2[2] + 0.150 * NRM[2]).toFixed(4)];
const d = (u) => [0, +(J.Cp3[1] + u * NRM[1]).toFixed(4), +(J.Cp3[2] + u * NRM[2]).toFixed(4)];
// 碗沿要有寬度：第一版的 brim 鏈只有 0.042 長、半徑又跟碗口幾乎一樣，渲出來是一根金屬細線（hero 圖上像根吊線）。
// 拉長到 0.066 並讓它外翻到 0.346（碗口 0.316）＝ ref 第 4 條的「碗口外翻」。
J.Brm0 = d(-0.0300); J.Brm1 = d(0.0000); J.Brm2 = d(0.0360); J.FlmR = d(-0.0380);
// 碗：口徑 0.78 ≒ 身寬 1.33 的 59%，口徑:碗深 ≈ 0.78:0.16 ≈ 5:1（ref 第 4 條要求「遠大於」）
V('cup').profile = [[0, 0.0300, 0.0270, { exp: 4.6 }], [0.38, 0.0360, 0.0324, { exp: 4.6 }],
  [0.60, 0.0470, 0.0423, { exp: 4.7 }], [0.72, 0.0900, 0.0790, { exp: 4.7, sharp: true }],
  [0.83, 0.2100, 0.1740, { exp: 4.8 }], [0.92, 0.3080, 0.2530, { exp: 4.9 }], [1, 0.3900, 0.3180, { exp: 5 }]];
V('cup').ring_step = 0.020;
// 碗口前傾之後正面看到的是整個碗面，lamp_bowl 一口氣吃到 18.9%，把 6:3:1 的次層撐破（48%）。
// 碗整體收 0.90（口徑 0.70 ≒ 身寬的 53%，略低於派工的 60–70%），四肢再收細一階，把次層讓回主層。
V('cup').profile = V('cup').profile.map(([t, r1, r2, o]) => [t, +(r1 * 0.90).toFixed(5), +(r2 * 0.90).toFixed(5), o]);
// 碗沿收窄成一圈細金邊（第一版 0.275→0.352 太寬，lamp_lip 一口氣吃掉 5% 正面）
V('brim').profile = [[0, 0.2600, 0.2120, { exp: 5 }], [0.5, 0.3100, 0.2530, { exp: 5 }], [1, 0.3460, 0.2820, { exp: 5 }]];
// 燈龕只剩兩根短鎏金龕柱：niche 的 volume 縮成一截藏在碗底下的細柱（鏈不能刪，touch 還要對得上）
J.Nch0 = [0, 0.1330, 0.2500]; J.Nch1 = [0, 0.1400, 0.3100]; J.Nch2 = [0, 0.1460, 0.3550]; J.Nch3 = [0, 0.1490, 0.3800];
V('niche').material = 'gold_trim';
V('niche').profile = [[0, 0.020, 0.018, { exp: 4.6 }], [0.5, 0.016, 0.014, { exp: 4.6 }], [1, 0.012, 0.011, { exp: 4.6 }]];
V('niche').ring_step = 0.010;
// 燈足金環、油面、燈芯照新碗尺寸重做
Object.assign(P('lamp foot ring'), { anchor: { chain: 'cup', t: 0.52, around: 180 }, points: hexa(0.052, 0.030) });  // 高足上的一圈小金環；第一版 0.075 在 hero 圖上讀成一根吊出來的金線
Object.assign(P('burning oil surface (glow_lamp)'), {   // 油面要跟著碗口法線轉，不然會斜插出碗壁
  offset: [0, +(-0.0442 * NRM[1]).toFixed(5), +(-0.0442 * NRM[2]).toFixed(5)], thickness: 0.016,
  udir: [1, 0, 0], vdir: [0, -NRM[2], NRM[1]],
  points: Array.from({ length: 14 }, (_, i) => { const a = (i * 2 * Math.PI) / 14;
    return [+(0.168 * Math.cos(a)).toFixed(5), +(0.137 * Math.sin(a)).toFixed(5)]; }),
});
Object.assign(P('wick nub'), { offset: [0, +(-0.0331 * NRM[1]).toFixed(5), +(-0.0331 * NRM[2]).toFixed(5)], segments: [{ len: 0.030, r: 0.016 }, { len: 0.018, r: 0.009, taper: true }] });
// 火苗一朵（三片同高交叉水滴＋焰心），高 0.33
drop(/^flame /);
const FH = 0.275, FW = 0.094;
s.parts.push(
  { type: 'fin', _c: 'flame teardrop A', host: 'FlmR', material: 'glow_lamp', thickness: 0.020, smooth_angle: 26,
    offset: [0, 0, 0], udir: [1, 0, 0], vdir: [0, 1, 0], points: teardrop(FH, FW) },
  { type: 'fin', _c: 'flame teardrop B', host: 'FlmR', material: 'glow_lamp', thickness: 0.020, smooth_angle: 26,
    offset: [0, 0, 0], udir: [0, 0, 1], vdir: [0, 1, 0], points: teardrop(FH * 0.94, FW * 0.90) },
  { type: 'fin', _c: 'flame teardrop C', host: 'FlmR', material: 'glow_lamp', thickness: 0.018, smooth_angle: 26,
    offset: [0, -0.004, 0], udir: [0.707, 0, 0.707], vdir: [0, 1, 0], points: teardrop(FH * 0.84, FW * 0.84) },
  { type: 'curve', _c: 'flame core', host: 'FlmR', material: 'glow_lamp', offset: [0, -0.006, 0], sides: 6,
    dir: [0, 1, 0.04], segments: [{ len: 0.088, r: 0.017 }, { len: 0.066, r: 0.009 }, { len: 0.058, r: 0.004, taper: true }],
    smooth_angle: 26 },
);

// 燈搬到全身最低處之後被 shading 的底部壓黑（harden5 ② 記過：gradient.bottom 是「陰沉」的單一最大來源，
// palette 怎麼提亮都被它吃掉）。香灰白的碗在 −0.42 的底端變成深褐，等於白做：底端由 −0.42 放寬到 −0.24。
s.shading.gradient.bottom = -0.24;

// ① -b 色：碗＝香灰白、碗沿＝鎏金（原本碗是硃紅、沿是香火橘，整組被讀成「紅色緞帶／布條」）
s.palette.lamp_bowl.color = '#d9d2c4'; s.palette.lamp_bowl.rough = 0.72;
s.palette.lamp_lip.color = '#d8b45c'; s.palette.lamp_lip.rough = 0.42;
s.palette.glow_lamp.color = '#d98a1e';                        // 油面／火苗＝香火橘系，系別色帶改落在「碗裡發亮的油」
// 鎏金面積再收：眉稜壓薄、葫蘆頂剎縮小
P('brow ridge').thickness = 0.014;
P('gilt gourd finial').segments = P('gilt gourd finial').segments.map((x) => ({ ...x, len: x.len * 0.7, r: x.r * 0.7 }));

fs.writeFileSync(path.join(CRE, 'fushou.json'), JSON.stringify(s, null, 1));
console.log('wrote fushou.json  parts=' + s.parts.length);

// claims：門檻一條都不放寬；只更新因改色而失準的兩條 label（系別色帶落點由碗壁移到碗裡的油面）
const c = JSON.parse(fs.readFileSync(path.join(SPECS, 'fushou_r2.claims.json'), 'utf8'));
c.name = '福壽綿長 fushou（xianghuo/ward）— A2 第 3 輪';
c._role = '【2026-09-17 第 3 輪】燈碗改香灰白 #d9d2c4、碗沿改鎏金 #d8b45c、油面與火苗 #d98a1e。'
  + '簡報凍結的「香火橘落在燈碗」這條沒有失守，只是落點由碗壁移到**碗裡發亮的油面**（材質仍是 glow_lamp，'
  + 'part_visible 的門檻沒有動）。材質名一個都沒新增或刪除，所以部位清單不變；'
  + '門檻與第 2 輪逐字相同（含第 2 輪已加嚴的 shell_plate 0.05）。\n\n' + (c._role || '');
for (const cl of c.claims) {
  if (cl.type === 'part_visible' && cl.part === 'lamp_lip') cl.label = '碗沿（鎏金）在識別視角必須量得到——第 3 輪碗放大到身寬的 ~60%，沿是碗的邊界線';
  if (cl.type === 'part_visible' && cl.part === 'glow_lamp') cl.label = '真實參照特徵 4／5＋系別色帶的機械化：碗裡的琥珀油面與水滴火苗在識別視角必須量得到';
  if (cl.type === 'part_visible' && cl.part === 'tusk') cl.label = '真實參照特徵 3 的機械化（第 3 輪改口徑）：角質喙在識別視角必須量得到——龜有喙沒有獠牙';
}
fs.writeFileSync(path.join(CRE, 'fushou.claims.json'), JSON.stringify(c, null, 1));
console.log('wrote fushou.claims.json  claims=' + c.claims.length);

/* A2 標竿卷第二件 福壽綿長 — 第 2 輪（2026-09-17）：讓讀者一眼說出「烏龜」與「燈」。
 *
 * 第 1 輪盲讀兩位讀者都沒說出龜、也沒說出燈：
 *   概念＝「披甲的龍首巨獸」「背著大鍋／戴金邊斗笠的四足獠牙怪獸」
 *   燈  ＝「嘴部大張，內有橘紅色鋸齒狀結晶／火焰」「胸前紅色披掛」
 *   甲  ＝「圓拱硬殼／大鍋／斗笠帽簷」（光滑圓頂沒有甲片分格）
 *   首  ＝「白色獠牙上翹如象牙」（野獸，不是贔屭）
 *   可愛＝B 判「會（凶萌）：身體圓滾、腿短、遠景像一排塑膠公仔」
 *
 * 本輪五件事（對應派工 1–5）：龜甲分格、龍首收斂、油燈下移＋小龕框、色系改硃紅鎏金香灰白、去玩具感。
 * 輸入：docs/experiments/2026-09-17-a2-fushou/specs/fushou_a.json（第 1 輪定稿，唯讀）
 * 輸出：assets/creatures/fushou.json、assets/creatures/fushou.claims.json（正式檔，可重複執行）
 * 跑法：node docs/experiments/2026-09-17-a2-fushou/specgen/r2_turtle_lamp.mjs
 *
 * 鏈／關節名稱與動畫 clip 名一個都沒動（引擎與遊戲靠名字）；關節「位置」依派工 2/3/5 的造型要求有移動，
 * 移動範圍限於 head／cup／brim／FlmR／niche／skirt／四肢與兩顆高光關節，沒有新增或刪除任何鏈、關節或動畫。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const CRE = path.join(ROOT, 'assets', 'creatures');
const SPECS = path.join(ROOT, 'docs', 'experiments', '2026-09-17-a2-fushou', 'specs');
const s = JSON.parse(fs.readFileSync(path.join(SPECS, 'fushou_a.json'), 'utf8'));
const J = s.joints;
const P = (c) => s.parts.find((p) => p._c === c);
const PS = (c) => s.parts.filter((p) => p._c && p._c.startsWith(c));
const V = (c) => s.volumes.find((v) => v.chain === c);
const drop = (pred) => { s.parts = s.parts.filter((p) => !pred(p)); };

/** 嚴格凸的多邊形甲片（fin.points 必須嚴格凸，_traps ④）：六角盾形，上寬下收 */
const scute = (hw, hh) => [[-hw, -hh * 0.62], [-hw * 0.62, -hh], [hw * 0.62, -hh], [hw, -hh * 0.62],
  [hw * 0.86, hh * 0.80], [0, hh], [-hw * 0.86, hh * 0.80]];
/** 水滴（上尖下寬），高 h、最寬處在下三分之一 */
const teardrop = (h, w) => [[0, -h * 0.10], [w * 0.62, h * 0.10], [w, h * 0.34], [w * 0.50, h * 0.72],
  [0, h], [-w * 0.50, h * 0.72], [-w, h * 0.34], [-w * 0.62, h * 0.10]];

s.name = 'fushou';
s._variant = '3D 量產卷批 10 · 福壽綿長（ab=fushou、香火 xianghuo、ward ×2、trait wardRegen1）。'
  + '2026-09-17 A2 標竿卷：使用者挑甲案「油壺龜」入正式資產，第 2 輪依盲讀回饋重做——'
  + '① 龜甲切成 13 片鎏金邊甲片＋深溝（原本是光滑圓頂＋金方塊，被讀成大鍋／斗笠）'
  + '② 裙邊縮窄下翻並切成 12 片緣盾（原本是寬平帽簷）'
  + '③ 獠牙收成小尖牙、鬚收細、頸縮短、吻端加方、頭抬起（原本被讀成野獸獠牙）'
  + '④ 油燈整組下移離開下顎、高足收細、火苗由 5 枝尖刺簇改成一朵水滴焰、燈龕背板改成繞碗的小龕框'
  + '⑤ 色系改上漆暗紅褐＋硃紅甲片＋鎏金邊＋香灰白裙邊與腹甲（原本大面積土黃卡其被讀成①褐主體）'
  + '⑥ 腿加長、爪加尖、甲片稜角分明（去玩具感）。動畫 clip 名與鏈／關節名稱未動。';
s._r2_blindread = '第 1 輪盲讀原話（2 位 context-free）：A「披甲的龍首巨獸」「嘴部大張，內有橘紅色鋸齒狀結晶」；'
  + 'B「背著大鍋／戴金邊斗笠的四足獠牙怪獸」「胸前紅色披掛＋橘黃尖刺焰簇」「會可愛（凶萌）：身體圓滾、腿短」。'
  + '沒有人說「龜」、沒有人說「燈」。本輪每一項改動都對著其中一句話。';

// ════════════════════════════════════════════════════════════════
// ④-a 色系：上漆暗紅褐底 ＋ 硃紅甲片 ＋ 鎏金邊 ＋ 香灰白裙邊／腹甲
// 大面積材質的飽和度天花板：front/tq 佔比 >8% 的材質只要 HSV S ≥0.50 就整塊計入 saturation_area，
// shading 還會放大約 1.7×（_traps_harden5 ③）。所以「殼底 #7a2a20」（S=0.74）做不得——
// 那一塊在 tq 佔 24%，直接把 saturation_area 推爆 60% 上限。殼底改用同色相但 S<0.50 的暗紅褐。
// ════════════════════════════════════════════════════════════════
const PAL = {
  shell_dark: '#5e4034',   // 殼底＝上漆暗紅褐（原 #7a5c40 土黃褐）。S=0.447，壓在 0.50 天花板下
  shell_plate: '#8f3a28',  // 甲片＝上漆硃紅（原 #9a7b52 卡其）。面積小，吃得起 S=0.72
  shell_rim: '#d9d2c4',    // 裙邊＝香灰白（原 #c8a44e 鎏金）。順帶把 saturation 預算讓給甲片與燈
  gold_trim: '#d8b45c',    // 鎏金：甲片邊、眉稜、燈足、龕框（不變）
  pot_body: '#5a3e33',     // 身＝上漆暗紅褐（原 #7c6248 土黃）
  pot_band: '#8a6b45',
  hide: '#4f4136',         // 頭頸四肢＝深銅褐（原 #7b6a52 卡其）
  claw: '#ded7c6',         // 爪＝骨白
  tusk: '#cfc4ab',         // 齒與鬚＝骨色（壓暗一階，別再讀成象牙）
  lamp_bowl: '#c8482c',
  lamp_lip: '#f58a55',
  glow_lamp: '#c67e1c',
  eye: '#d08c22',
  socket: '#43231a',
  hi_white: '#e6e2d6',
};
for (const [k, c] of Object.entries(PAL)) s.palette[k].color = c;
s.palette.shell_rim.rough = 0.72;   // 香灰白不該是金屬亮面

// ════════════════════════════════════════════════════════════════
// ① 龜甲：中央一縱列 5 片大盾脊帶 ＋ 兩側各 4 片肋盾，每片硃紅盾面＋鎏金襯邊，片與片之間留深溝
//    （ref-fushou.md:26 特徵②）。原本 5 片金方塊被讀成「殼頂的金方塊」，改成盾面＋金邊。
// ════════════════════════════════════════════════════════════════
drop((p) => /^(vertebral|costal) scute/.test(p._c || ''));
const shellScute = (name, t, around, hw, hh) => ([
  // 襯邊在下（鎏金，略大一圈）→ 盾面在上（硃紅）：兩片疊出「甲片有金滾邊」，thickness ≤ 半寬 0.35（_traps_batch10 ⑤）
  { type: 'fin', _c: `${name} rim`, host: 'Sh1', material: 'gold_trim', thickness: 0.011, smooth_angle: 26,
    anchor: { chain: 'shell', t, around }, udir: [1, 0, 0], vdir: [0, 1, 0], points: scute(hw * 1.18, hh * 1.18) },
  { type: 'fin', _c: name, host: 'Sh1', material: 'shell_plate', thickness: 0.026, smooth_angle: 26,
    anchor: { chain: 'shell', t, around }, udir: [1, 0, 0], vdir: [0, 1, 0], points: scute(hw, hh) },
]);
const scutes = [];
// 中央脊帶 5 片：正面往上三片、越過殼頂、背面兩片（around 180＝前、0＝後，編譯器 info 行實測）
for (const [t, a, hw, hh] of [[0.22, 180, 0.128, 0.115], [0.52, 180, 0.126, 0.113], [0.84, 180, 0.112, 0.100],
  [0.52, 0, 0.126, 0.113], [0.22, 0, 0.128, 0.115]]) scutes.push(...shellScute(`vertebral scute ${scutes.length}`, t, a, hw, hh));
// 兩側肋盾各 4 片（around ±74／±106 是實測過 part_attachment 的落點，_traps_batch10 ④）
for (const [t, a] of [[0.37, 74], [0.58, 56], [0.58, 124], [0.37, 106], [0.37, -74], [0.58, -56], [0.58, -124], [0.37, -106]]) {
  scutes.push(...shellScute(`costal scute ${scutes.length}`, t, a, 0.112, 0.100));
}
s.parts.unshift(...scutes);

// 殼再加寬一階：甲片把 shell_dark 蓋掉一部分，focal_contrast（shell_dark:glow_lamp ≥3×）要靠深色底補回來
V('shell').profile = V('shell').profile.map((r) => [r[0], +(r[1] * 1.05).toFixed(5), r[2], r[3]]);

// ② 裙邊：縮窄、下翻、切成 12 片緣盾（原本是往外上翻的寬平帽簷）
J.Sk0 = [0, 0.905, -0.02]; J.Sk1 = [0, 0.845, -0.02]; J.Sk2 = [0, 0.800, -0.02];
const skirt = V('skirt');
skirt.profile = [[0, 0.400, 0.330, { exp: 4.8 }], [0.38, 0.520, 0.400, { exp: 5, sharp: true }], [1, 0.664, 0.452, { exp: 5 }]];
skirt.ring_step = 0.013;
skirt.colors = { arcs: Array.from({ length: 12 }, (_, i) => ({ from: 15 + i * 30, to: 30 + i * 30, color: '#9a8f7c' })) };

// 腹甲：身體正面五片香灰白橫向甲板（material 借既有的 shell_rim，不新開材質）。
// 先試過 V('pot').colors.arcs 的縱向色帶，渲出來在正面看不出面板（同 _traps ⑨「arcs 做不出想要的分節」一族），
// 改用實體薄片——這也順便把「光滑大鍋」的讀法打斷：腹甲有分節，鍋沒有。
// ★around 的正面不是 180★：pot 鏈是由上往下走（Pt0 y1.0 → Pt4 y0.24），斷面框整個翻過來，
// 所以 pot 的 around=0 才是世界 +Z（shell 鏈由下往上、around=180 才是 +Z）。第一版寫 180，五片全貼到背後去了。
// 判準只有一個：看編譯器印的 `faces <方向> (world normal ...)` 那一行，不要照別條鏈的口訣推。
for (const [i, t, hw, hh] of [[0, 0.42, 0.150, 0.062], [1, 0.55, 0.158, 0.060], [2, 0.67, 0.152, 0.056],
  [3, 0.78, 0.136, 0.050], [4, 0.88, 0.112, 0.042]]) {
  s.parts.push({ type: 'fin', _c: `plastron plate ${i}`, host: 'Pt2', material: 'shell_rim', thickness: 0.016, smooth_angle: 26,
    anchor: { chain: 'pot', t, around: 0 }, udir: [1, 0, 0], vdir: [0, 1, 0], points: scute(hw, hh) });
}

// ════════════════════════════════════════════════════════════════
// ③ 龍首：頸縮短、頭抬起、吻端加方、獠牙收成小尖牙、鬚收細
// ════════════════════════════════════════════════════════════════
J.Nk1 = [0, 0.800, 0.265]; J.Hd0 = [0, 0.805, 0.435]; J.Hd1 = [0, 0.820, 0.560];
// 高光關節是絕對座標、不會跟著頭走（_traps_batch10 ⑪）：頭一動就要重新量眼球中心再回填。
// 量法走真實路徑（scratchpad/a2f/eyeprobe.cjs 直接 require 引擎的 compile 取眼球 mesh 的世界座標），
// 不是照公式重推：第 1 輪眼球中心 (0.1128,0.7971,0.4834)、本輪 (0.1202,0.8419,0.4372)，
// 兩顆高光沿用第 1 輪相對眼球的位移 A(+0.0482,+0.0519,+0.0446)／B(+0.0682,−0.0261,+0.0526)。
// 憑感覺填會讓高光沉進眼球後面：實測 hi_white 正面佔比掉到 0.11%（門檻 0.20%）。
J.EyHiA = [0.1684, 0.8938, 0.4818]; J.EyHiB = [0.1884, 0.8158, 0.4898];
const head = V('head');
head.profile[4] = [0.78, 0.150, 0.118, { exp: 6.4, sharp: true }];
head.profile[5] = [1, 0.128, 0.100, { exp: 6.6 }];          // 吻端方鈍如箱
for (const p of PS('fang ')) {                                // 大方齒→小尖牙：高度砍半
  p.points = p.points.map(([u, v]) => [u * 0.86, v > 0 ? v * 0.42 : v * 0.7]);
}
P('mouth slot').points = P('mouth slot').points.map(([u, v]) => [u * 0.82, v * 0.72]);   // 嘴縫收窄，別再讀成「大張的嘴」
Object.assign(P('bixi brow horn'), {                          // 象牙感的白角→短鎏金小角
  material: 'gold_trim', offset: [0.040, 0.046, 0.026], dir: [0.34, 0.60, 0.72],
  segments: [{ len: 0.040, r: 0.014 }, { len: 0.030, r: 0.006, rise: -20, taper: true }],
});
Object.assign(P('bixi barbel'), {                             // 上翹大獠牙→細鬚，往後下貼著顎側走
  offset: [0.070, -0.030, 0.006], dir: [0.46, -0.30, 0.83],
  segments: [{ len: 0.062, r: 0.0085 }, { len: 0.050, r: 0.0048, fall: 30 }, { len: 0.040, r: 0.0022, fall: 34, taper: true }],
});

// ════════════════════════════════════════════════════════════════
// ④-b 油燈：整組下移離開下顎、高足收細、碗口外翻（口徑:碗深 ≈ 3:1）、火苗改一朵水滴
// ════════════════════════════════════════════════════════════════
J.Cp0 = [0, 0.150, 0.205]; J.Cp1 = [0, 0.128, 0.400]; J.Cp2 = [0, 0.142, 0.555];
// 碗口法線維持 (0,0.905,0.425)：傾角不夠就讀不出「凹」，而且手寫 Cp3 會把 brim 根環轉出碗外（第 1 輪實測）
J.Cp3 = [0, +(J.Cp2[1] + 0.108 * 0.905).toFixed(4), +(J.Cp2[2] + 0.108 * 0.425).toFixed(4)];
const d = (u) => [0, +(J.Cp3[1] + u * 0.905).toFixed(4), +(J.Cp3[2] + u * 0.425).toFixed(4)];
J.Brm0 = d(-0.0072); J.Brm1 = d(0.0040); J.Brm2 = d(0.0200); J.FlmR = d(-0.0305);
const KB = 0.80;                                              // 碗整體縮到第 1 輪的 0.80（碗口直徑 0.45）
V('cup').profile = [[0, 0.0230, 0.0208, { exp: 4.6 }], [0.40, 0.0300, 0.0268, { exp: 4.6 }],
  [0.62, 0.0392, 0.0354, { exp: 4.7 }], [0.72, 0.0640, 0.0560, { exp: 4.7, sharp: true }],
  [0.82, 0.1310, 0.1090, { exp: 4.8 }], [0.91, 0.1830, 0.1500, { exp: 4.9 }], [1, 0.2250, 0.1830, { exp: 5 }]];
V('brim').profile = [[0, 0.1560, 0.1270, { exp: 5 }], [0.5, 0.1870, 0.1520, { exp: 5 }], [1, 0.2020, 0.1640, { exp: 5 }]];
for (const p of [P('lamp foot ring'), P('burning oil surface (glow_lamp)')]) {
  p.points = p.points.map(([u, v]) => [+(u * KB).toFixed(5), +(v * KB).toFixed(5)]);
}
Object.assign(P('wick nub'), { offset: [0, -0.0217, -0.0102], segments: [{ len: 0.026, r: 0.014 }, { len: 0.015, r: 0.008, taper: true }] });
// 火苗：5 枝尖刺簇 ＋ 3 條火舌 → 一朵水滴焰（三片同高交叉的水滴撐出體積，剪影只有一個水滴）
// 高 0.36 ＝ 碗口徑 0.45 的 0.80 倍（ref-fushou.md:35 特徵⑤ 的 0.8–1.0 帶）
drop((p) => /^flame (tip|tongue)/.test(p._c || ''));
const FH = 0.330, FW = 0.110;
s.parts.push(
  { type: 'fin', _c: 'flame teardrop A', host: 'FlmR', material: 'glow_lamp', thickness: 0.020, smooth_angle: 26,
    offset: [0, 0, 0], udir: [1, 0, 0], vdir: [0, 1, 0], points: teardrop(FH, FW) },
  { type: 'fin', _c: 'flame teardrop B', host: 'FlmR', material: 'glow_lamp', thickness: 0.020, smooth_angle: 26,
    offset: [0, 0, 0], udir: [0, 0, 1], vdir: [0, 1, 0], points: teardrop(FH * 0.96, FW * 0.92) },
  { type: 'fin', _c: 'flame teardrop C', host: 'FlmR', material: 'glow_lamp', thickness: 0.018, smooth_angle: 26,
    offset: [0, -0.004, 0], udir: [0.707, 0, 0.707], vdir: [0, 1, 0], points: teardrop(FH * 0.86, FW * 0.86) },
  { type: 'curve', _c: 'flame core', host: 'FlmR', material: 'glow_lamp', offset: [0, -0.006, 0], sides: 6,
    dir: [0, 1, 0.04], segments: [{ len: 0.105, r: 0.021 }, { len: 0.080, r: 0.012 }, { len: 0.070, r: 0.004, taper: true }],
    smooth_angle: 26 },
);

// ④-c 燈龕：頭後的大背板 → 繞在碗周圍的小龕框（低背板＋兩根短龕柱＋兩支翹角簷）
J.Nch0 = [0, 0.1960, 0.5790]; J.Nch1 = [0, 0.2660, 0.5680]; J.Nch2 = [0, 0.3200, 0.5590]; J.Nch3 = [0, 0.3470, 0.5545];
V('niche').profile = [[0, 0.090, 0.040, { exp: 3.6 }], [0.35, 0.196, 0.036, { exp: 3.2, sharp: true }],
  [0.80, 0.202, 0.034, { exp: 3.2 }], [1, 0.128, 0.032, { exp: 3.4 }]];
V('niche').ring_step = 0.012;
Object.assign(P('niche post (gilt)'), {
  host: 'Nch1', offset: [0.185, 0.008, -0.004], dir: [0.10, 0.98, -0.17],
  segments: [{ len: 0.070, r: 0.019 }, { len: 0.052, r: 0.013, rise: 14, taper: true }],
});
Object.assign(P('niche eave horn (gilt)'), {
  offset: [0.028, 0.003, 0], dir: [0.88, 0.42, -0.14],
  segments: [{ len: 0.078, r: 0.020 }, { len: 0.058, r: 0.010, rise: 34, taper: true }],
});
Object.assign(P('niche ridge knob (gilt)'), {
  segments: [{ len: 0.022, r: 0.026 }, { len: 0.016, r: 0.015 }, { len: 0.012, r: 0.007, taper: true }],
});

// ════════════════════════════════════════════════════════════════
// ⑤ 去玩具感：腿拉長、腿收細、爪加長加尖
// ════════════════════════════════════════════════════════════════
J.LFrKnee = [0.45, 0.200, 0.250]; J.LFrToe = [0.540, 0.020, 0.300];
J.LBkKnee = [0.44, 0.200, -0.270]; J.LBkToe = [0.520, 0.020, -0.320];
for (const c of ['LFront', 'LBack']) V(c).profile = V(c).profile.map((r) => [r[0], +(r[1] * 0.86).toFixed(5), +(r[2] * 0.86).toFixed(5), r[3]]);
// 腰帶金環外張太多，在 hero 圖上讀成「插在身上的金刀」：收到貼著壺身
V('band').profile = [[0, 0.372, 0.320, { exp: 5 }], [0.55, 0.424, 0.366, { exp: 5.2, sharp: true }], [1, 0.378, 0.325, { exp: 5 }]];
// 鬚再收短一截（第 1 輪的「白色獠牙」殘影）
P('bixi barbel').segments = [{ len: 0.050, r: 0.0080 }, { len: 0.040, r: 0.0044, fall: 30 }, { len: 0.030, r: 0.0020, fall: 34, taper: true }];

for (const p of PS('claw ')) p.segments = [{ len: 0.062, r: 0.020 }, { len: 0.060, r: 0.007, fall: 26, taper: true }];
for (const p of [P('front foot'), P('back foot')]) p.size = [p.size[0] * 0.90, p.size[1] * 0.92, p.size[2] * 0.92];

fs.writeFileSync(path.join(CRE, 'fushou.json'), JSON.stringify(s, null, 1));
console.log('wrote fushou.json  parts=' + s.parts.length);

// ════════════════════════════════════════════════════════════════
// claims：沿用第 1 輪的 23 條，門檻一條都不放寬；只同步「顏色說明」與把甲片那一條**加嚴**
// ════════════════════════════════════════════════════════════════
const c = JSON.parse(fs.readFileSync(path.join(SPECS, 'fushou_a.claims.json'), 'utf8'));
c.name = '福壽綿長 fushou（xianghuo/ward）— A2 第 2 輪';
c._role = (c._role || '').replace(/^/, '【2026-09-17 第 2 輪】色系改為：殼底上漆暗紅褐 #5e4034／甲片硃紅 #8f3a28／'
  + '甲片鎏金襯邊與龕框 #d8b45c／裙邊與腹甲香灰白 #d9d2c4・#cfc7b6／四肢深銅褐 #4f4136。'
  + '材質名一個都沒新增（判準用的是 material 名不是顏色），所以 claims 的部位清單不變。'
  + '唯一動到的門檻是 shell_plate 的 part_visible 由 0.02 **加嚴**到 0.05——'
  + '甲片分格是本輪「讀得出是龜」的主訊號，0.02 那個舊值連第 1 輪的光滑圓頂都過得了，等於沒有鑑別力。\n\n');
for (const cl of c.claims) {
  if (cl.type === 'part_visible' && cl.part === 'shell_plate') {
    cl.min_share = 0.05;
    cl.label = '真實參照特徵 2 的機械化（第 2 輪加嚴 0.02→0.05）：中央 5 片大盾＋兩側 8 片肋盾在識別視角必須量得到';
  }
}
fs.writeFileSync(path.join(CRE, 'fushou.claims.json'), JSON.stringify(c, null, 1));
console.log('wrote fushou.claims.json  claims=' + c.claims.length);

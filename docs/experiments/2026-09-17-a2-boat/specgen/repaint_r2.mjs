/* A2 標竿卷 boat — 第 2 輪「只改色」重塗（2026-09-17）
 * 起因：第 1 輪盲讀概念／特徵／可愛都過，但色系四位有三位讀成「②硃紅＋鎏金＋香灰白」（香火），
 *      因為白殼＋赤紅邊條＋夜燈泛金。本輪把色系推回「①大地褐＋靛藍＋少量赤紅」（ART_BIBLE.md:33-34）。
 * 只動 palette 的 color、volumes[0].colors.arcs，以及四組部件的 material 欄位（重塗，不動任何頂點／joints／animations）。
 * 就地改 assets/creatures/boat.json；重跑是冪等的（全部寫絕對值）。
 * 跑法：node docs/experiments/2026-09-17-a2-boat/specgen/repaint_r2.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const SPEC = path.join(ROOT, 'assets', 'creatures', 'boat.json');
const CLAIMS = path.join(ROOT, 'assets', 'creatures', 'boat.claims.json');

// ── 色票：judge 的 saturation_area 判準是「未打光的烘焙頂點色 HSV S ≥ 0.50」，
//    支撐質量（船殼、划手、槳）一律壓在 S < 0.50（風化木本來就是灰掉的褐），
//    高飽和只留給靛藍與赤紅這兩個招牌色。
const C = {
  hull_body: '#8a6a4c',   // 風化木大地褐（S 0.449）— ART_BIBLE:33 主色 #8b6040 的風化版
  bone: '#e6dccb',        // 獸骨白（偏灰，避開香火的「香灰白」）：只剩船眼同心圓
  trim_red: '#a33520',    // 赤紅（少量）
  socket: '#2b2c30',      // 中性近黑（不變）
  eye: '#d8451f',         // 船眼圓心改赤紅，不再偏橘金
  glow_prow: '#3a5bb0',   // 首尾尖翹改靛藍發光（ART_BIBLE:33 emissive 可用 #3050a0）
  lash: '#6d5540',        // 划手＝深風化木（S 0.413）
  oar: '#9f8461',         // 亮大地褐（壓灰，戲台暖燈下不泛金）：槳、首尾襯板、雞羽飾、織紋菱片（S 0.342）
  bead: '#2f4fa8',        // 靛藍琉璃珠（放大成第二色）
};

// ── 船殼縱向分帶：白色只留一條窄帶給波浪三角紋當底；舷上緣一圈靛藍織紋帶；赤紅收成兩條細線。
//    角度必須吸附 360/48 = 7.5° 的格（_traps ④）。
const ARCS = [
  { from: 0, to: 37.5, color: '#3c342c' },      // 艙內：壓暗才讀得出「有洞的容器」
  { from: 37.5, to: 45, color: '#5c4630' },     // 舷內深木（赤紅只留實體 trim_red 條壓在 around 45 那一條線）
  { from: 45, to: 60, color: '#2f4fa8' },       // 靛藍織紋帶（15°＝2 格，側視最醒目的一圈）
  { from: 60, to: 82.5, color: '#8a6a4c' },     // 大地褐板條 1
  { from: 82.5, to: 97.5, color: '#e6dccb' },   // 骨白窄帶：紅黑三角波浪紋的底（達悟三色保留為「紋」）
  { from: 97.5, to: 105, color: '#a33520' },    // 赤紅細線
  { from: 105, to: 142.5, color: '#7a5c40' },   // 大地褐板條 2（與板條 1 做出拼板色差）
  { from: 142.5, to: 150, color: '#322a22' },   // 板縫
  { from: 150, to: 180, color: '#4a3e30' },     // 龍骨
];

// ── 重塗（改 material 欄位，不動幾何）：把白色從「底」收回「紋」。
const RECOLOR = [
  { when: (p) => p.material === 'bone' && !p.anchor && p.offset && Math.abs(p.offset[2]) === 0.17 && p.offset[1] === 0, to: 'oar', why: '首尾尖翹的襯板：白→亮大地褐' },
  { when: (p) => p.material === 'bone' && !p.anchor && p.offset && (p.offset[1] === 0.4 || p.offset[1] === 0.3), to: 'oar', why: '雞羽飾扇片：白→亮大地褐' },
  { when: (p) => p.material === 'trim_red' && !p.anchor && p.offset && (p.offset[1] === 0.4 || p.offset[1] === 0.3), to: 'bead', why: '雞羽飾羽管：赤紅→靛藍（首尾飾的第二色）' },
  { when: (p) => p.material === 'bone' && p.anchor && p.anchor.around === 56, to: 'oar', why: '舷上緣菱片：白→亮大地褐，落在靛藍織紋帶上' },
];

const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
for (const [m, hex] of Object.entries(C)) {
  if (!spec.palette[m]) throw new Error(`palette 沒有 ${m}`);
  spec.palette[m].color = hex;
}
spec.volumes[0].colors.arcs = ARCS;
const moved = {};
for (const p of spec.parts) {
  for (const r of RECOLOR) if (r.when(p)) { moved[r.why] = (moved[r.why] || 0) + 1; p.material = r.to; break; }
}
spec._variant = 'A2 標竿卷（2026-09-17）甲案出貨版，第 2 輪只改色：第 1 輪盲讀色系四位有三位讀成香火（②硃紅＋鎏金＋香灰白），'
  + '因為白殼＋赤紅邊條＋夜燈泛金。本輪把船殼底色改成風化木大地褐、白色收回到波浪紋窄帶與船眼同心圓、赤紅縮成兩條細線、'
  + '靛藍放大成第二色（舷上緣織紋帶 15°、首尾雞羽管、划手頸珠、首尾尖翹發光刃）。幾何、joints、animations 一格未動。';
fs.writeFileSync(SPEC, JSON.stringify(spec, null, 1));

// ── claims 同步：只動與顏色有關的那一條。style_light 的 95 是為米白殼寫的，大地褐在定義上不可能過；
//    改成一條「兩端都有鑑別力」的帶：≥45 擋掉 2026-09-04 的炭黑版（實測 34.2），≤85 擋掉第 1 輪的米白版（實測 97.6）。
//    part_exists／part_visible／part_signature／focal_contrast／share_hierarchy／tri_budget 的條目與門檻一格未動。
const cl = JSON.parse(fs.readFileSync(CLAIMS, 'utf8'));
const light = cl.claims.find((c) => c.type === 'style_light');
if (!light) throw new Error('claims 沒有 style_light');
light.min_median_lum = 45;
light.label = '風化木大地褐：側視的機體中位亮度不得低於 45/255（2026-09-04 的炭黑版 34.2 會被這條擋下）';
if (!cl.claims.some((c) => c.type === 'style_dark')) {
  cl.claims.splice(cl.claims.indexOf(light) + 1, 0, {
    type: 'style_dark', view: 'side', max_median_lum: 85, stage: 'MID',
    label: '不得再是米白殼：側視中位亮度不得高於 85/255（第 1 輪被讀成香火的米白版是 97.6，會被這條擋下）',
  });
}
const R2NOTE = ' ｜ 第 2 輪只改色（2026-09-17）：style_light 的 95 是為米白殼寫的，'
  + '大地褐在定義上不可能過，改成 ≥45 並**新增** style_dark ≤85，形成一條兩端都有鑑別力的帶（炭黑 34.2 紅、米白 97.6 紅）——'
  + '這是多一條要過，不是放寬；其餘門檻與 part 條目一格未動。';
cl.name = '拼板舟 boat（A2 甲案出貨版·第 2 輪配色，zuling/swarm）';
cl._role = (cl._role || '').split(' ｜ 第 2 輪只改色')[0] + R2NOTE;   // 重跑不重複附加
fs.writeFileSync(CLAIMS, JSON.stringify(cl, null, 1));
console.log(JSON.stringify({ palette: C, arcs: ARCS.length, recolored: moved, claims: cl.claims.length }, null, 1));

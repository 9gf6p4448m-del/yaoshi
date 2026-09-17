/* A2 標竿卷第二件「福壽綿長 fushou」兩案 spec 產生器（2026-09-17）
 * 甲 fushou_a「油壺龜」：保留龜形，把「腹部長明燈」推成一眼特徵——燈碗整組往前下方移出體外剪影、
 *   背後立一面硃紅燈龕背板＋鎏金龕柱與翹角簷、甲緣裙邊加寬並切成 12 片緣盾、頭加一對小龍角與頷鬚（贔屭龍首）。
 * 乙 fushou_b「馱燈神龜」：龜身壓低成基座（全身 y 以地面為原點壓 0.78）、頭抬起如贔屭，
 *   背上馱一座三層硃紅光明燈龕（多層小格燈位＝松山慈祐宮光明燈語彙），高足油碗與單焰移到龕頂，龜是座、龕是主體。
 *
 * 跑法：node docs/experiments/2026-09-17-a2-fushou/specgen/build_fushou_variants.mjs
 * 輸出：assets/creatures/fushou_a.json / fushou_a.claims.json / fushou_b.json / fushou_b.claims.json
 * **不動** assets/creatures/fushou.json、fushou.glb、fushou.claims.json（本檔只讀它當基底）。
 *
 * 守則出處：docs/design/ART_BIBLE.md:22-29（香火：硃紅#c84040／亮#f08060＋鎏金＋香灰白；上漆木雕、剪黏碎瓷、
 * 交趾陶、金箔；剪影寬正儀仗感、側視 W/H ≥0.9；不用殘缺／腐爛／空洞眼）、:11（不可愛）。
 * 造型必做清單：docs/experiments/2026-09-04-ref-fushou.md:22-38 五條特徵。
 * 引擎陷阱沿用 fushou.json 的 _traps／_traps_batch10／_traps_harden5，本檔新踩的另記在各案 _traps_a2。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const CRE = path.join(ROOT, 'assets', 'creatures');
const BASE = JSON.parse(fs.readFileSync(path.join(CRE, 'fushou.json'), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));

/** 正方小燈格（fin.points 必須嚴格凸，_traps ④） */
const cell = (h) => [[-h, -h], [h, -h], [h, h], [-h, h]];

// ════════════════════════════════════════════════════════════════════════════
// 甲 fushou_a「油壺龜」
// ════════════════════════════════════════════════════════════════════════════
function buildA() {
  const s = clone(BASE);
  s.name = 'fushou_a';
  s._variant = 'A2 標竿卷第二件 甲案「油壺龜」（fushou_a）。基底＝assets/creatures/fushou.json（出貨版）。'
    + '改的四件事：① 燈碗／碗口／火苗整組往前推 0.075 並往下沉 0.065，讓「腹前一盞燈」整個突出到身體剪影之外；'
    + '② 燈後立一面硃紅燈龕背板（niche 鏈）＋兩根鎏金龕柱＋兩支翹角簷＝廟裡的長明燈龕；'
    + '③ 甲緣裙邊加寬（0.66→0.69）並把緣盾分割由 6 片改 12 片；④ 頭加一對小龍角與一對頷鬚，補贔屭龍首。'
    + '動畫 clip 名沿用 idle／move／attack（引擎靠名字）。';
  s._brief = 'The same temple-guardian tortoise, but now the belly lamp is the whole point. The wide shallow '
    + 'VERMILLION BOWL on its gilt-ringed stem has swung forward and down until it hangs clear in front of the chest, '
    + 'brimming with glowing amber oil, one dark wick nub at its centre and a tall teardrop FLAME standing above it. '
    + 'Behind the flame rises a lacquer-red SHRINE BACKBOARD with two gilt posts and two upswept gilt eave horns — '
    + 'the niche a temple keeps its eternal lamp in. Above and behind, the broad low carapace of raised polygonal '
    + 'scutes sits on a gilt marginal SKIRT now cut into twelve plates. The BIXI head thrusts forward over the lamp: '
    + 'blunt box muzzle, a straight barred row of square teeth, a gilt brow ridge, two bulging ember-orange eyeballs, '
    + 'a pair of short forward horns and two bone barbels. Feel: an eternal lamp that grew a shell and walked out of its niche.';
  s._traps_a2 = 'A2 甲案新記：① 燈碗前推會同時把 Z 撐大，ward 的「正面寬 ≥ 側面寬」與香火「側視 W/H ≥0.9」都是拿 X 去比 '
    + 'max(X,Z)（silmetrics.mjs:53/57），所以前推多少就要把裙邊加寬多少，兩件事必須同一輪改。'
    + '② part_attachment 只看「部件最近的那一個頂點」（checks.js:293-325 取 min），所以懸空的平板 fin 會擋、'
    + '但根部埋進宿主的 curve 不會——龕頂翹角用 curve 而不是 fin。'
    + '③ 燈組頂端（火苗尖 0.46／龕頂 0.50）刻意壓得比出貨版（火苗尖 0.52）還低，'
    + '維持 _traps_batch10 ⑦ 的「器物與頭之間要留白」——前推是把距離拉開，不是把東西堆高。';

  const J = s.joints;
  // ① 燈碗整組前推 +0.075、下沉 −0.065（腹前，_traps_batch10 ⑦ 的 (c) 位置再往外）
  J.Cp0 = [0, 0.215, 0.185];
  J.Cp1 = [0, 0.190, 0.385];
  J.Cp2 = [0, 0.205, 0.545];
  // 碗口的傾角必須維持出貨版的法線 (0,0.905,0.425)（_traps_batch10 ⑧：傾角不夠就讀不出「凹」），
  // 所以 Cp3 是由 Cp2 沿這個方向推 0.108 算出來的，不是憑手寫——手寫會把 brim 的根環轉出碗外（本卷實測 BLOCK 過一次）
  J.Cp3 = [0, +(J.Cp2[1] + 0.108 * 0.905).toFixed(4), +(J.Cp2[2] + 0.108 * 0.425).toFixed(4)];
  // 碗口（brim）與火苗（FlmR）沿用對 Cp3 的相對位移，避免自己算錯
  // 燈碗整組放大 1.18、火苗放大 1.3：出貨版的碗只有身寬的 30%，放到加寬後的身體上更像個掛飾；
  // 招牌部位要先「夠大」才談得上一眼特徵（ref-fushou.md:33 特徵④「口徑遠大於碗深」）。
  const KA = 1.18, KF = 1.30;
  // 碗口／火苗的「位移」不跟著放大——位移一乘大，碗口的根環就退到碗身更細的那一段，root_containment 立刻 29% 外露（實測）
  const d = (v) => [0, +(J.Cp3[1] + v[1]).toFixed(4), +(J.Cp3[2] + v[2]).toFixed(4)];
  J.Brm0 = d([0, -0.0072, -0.0034]);   // 碗放大後根環要再往碗裡塞一點（段長比 0.0108:0.0145＝0.74，仍避開 50:50）
  J.Brm1 = d([0, 0.0036, 0.0017]);
  J.Brm2 = d([0, 0.0181, 0.0085]);
  J.FlmR = d([0, -0.0260, -0.0160]);
  for (const v of s.volumes) {
    if (v.chain !== 'cup' && v.chain !== 'brim') continue;
    v.profile = v.profile.map(([t, r1, r2, o]) => [t, +(r1 * KA).toFixed(5), +(r2 * KA).toFixed(5), o]);
  }
  {   // 碗口的根環再縮 0.84：只放大半徑、鏈長不變＝碗尾的外翻變陡，碗口環照原比例就會有 29% 露在碗外（實測）
    const b = s.volumes.find((v) => v.chain === 'brim');
    b.profile[0] = [0, +(b.profile[0][1] * 0.84).toFixed(5), +(b.profile[0][2] * 0.84).toFixed(5), b.profile[0][3]];
  }
  for (const p of s.parts) {
    if (p.host === 'Cp1') { p.points = p.points.map(([u, v]) => [+(u * KA).toFixed(5), +(v * KA).toFixed(5)]); continue; }  // 燈足金環
    if (p.host === 'Cp3') {   // 油面與燈芯
      if (p.points) p.points = p.points.map(([u, v]) => [+(u * KA).toFixed(5), +(v * KA).toFixed(5)]);
      if (p.offset) p.offset = p.offset.map((c) => +(c * KA).toFixed(5));
      if (p.segments) p.segments = p.segments.map((g) => ({ ...g, len: +(g.len * KA).toFixed(5), r: +(g.r * KA).toFixed(5) }));
      continue;
    }
    if (p.host !== 'FlmR') continue;   // 火苗與火舌
    if (p.points) p.points = p.points.map(([u, v]) => [+(u * KF).toFixed(5), +(v * KF).toFixed(5)]);
    if (p.offset) p.offset = p.offset.map((c) => +(c * KF).toFixed(5));
    if (p.segments) p.segments = p.segments.map((g) => ({ ...g, len: +(g.len * KF).toFixed(5), r: +(g.r * KF).toFixed(5) }));
  }

  // ② 燈龕：新鏈 niche（硃紅上漆背板），根環埋在碗裡
  // 龕的根環必須埋在碗裡：沿碗口法線往回退 0.055（此處碗半徑 0.178 > 根環 0.130）
  const back = (u) => [0, +(J.Cp3[1] - u * 0.905).toFixed(4), +(J.Cp3[2] - u * 0.425).toFixed(4)];
  // 背板必須明顯往後仰：第一版是「沿著碗口法線往上」，結果板身的厚度把火苗整個包進去、hero 圖上看不到火
  //（本卷實測）。板頂退到 z 0.432，火苗在 z 0.58 —— 火在板前面燒，才有「龕裡的一盞燈」。
  J.Nch0 = back(0.055);
  J.Nch1 = [0, 0.350, 0.505];
  J.Nch2 = [0, 0.4875, 0.455];
  J.Nch3 = [0, 0.5450, 0.432];
  s.chains.niche = ['Nch0', 'Nch1', 'Nch2', 'Nch3'];
  s.attach.niche = 'Cp3';
  s.touch.push(['cup', 'niche']);
  s.volumes.push({
    chain: 'niche', material: 'lamp_bowl', sides: 12, frame: 'up', faceted: true, smooth_angle: 26,
    caps: ['none', 'flat'], ring_step: 0.018,
    // exp 3.2 ＝ 方板；第一半徑是 X 寬、第二是 Z 厚（frame:"up"，_traps_batch10 ②）
    profile: [[0, 0.100, 0.056, { exp: 3.6 }],
      [0.30, 0.152, 0.050, { exp: 3.2, sharp: true }],
      [0.72, 0.158, 0.046, { exp: 3.2 }],
      [0.90, 0.138, 0.044, { exp: 3.2, sharp: true }],
      [1, 0.080, 0.040, { exp: 3.4 }]],
  });

  // ③ 主層放寬：龜甲穹隆、油壺身、裙邊的**第一個半徑（＝X 寬，frame:"up"）**一起加大，第二個半徑不動。
  // 只加寬不加深有兩個作用：ward 的「正面寬 ≥ 側面寬」更有裕度（燈碗前推吃掉的是 Z），
  // 香火 §1 的「寬、正、儀仗感」也是往這個方向（ART_BIBLE.md:26）。
  const widen = (chain, k) => { const v = s.volumes.find((x) => x.chain === chain); v.profile = v.profile.map((r) => [r[0], +(r[1] * k).toFixed(5), r[2], r[3]]); };
  widen('shell', 1.12); widen('pot', 1.10);
  const skirt = s.volumes.find((v) => v.chain === 'skirt');
  skirt.profile[1][1] = 0.755; skirt.profile[2][1] = 0.630;
  // 緣盾由 6 片切成 12 片（arcs 在扁平環狀 volume 上是徑向楔形，_traps_harden5 ①）
  skirt.colors = { arcs: Array.from({ length: 12 }, (_, i) => ({ from: 15 + i * 30, to: 30 + i * 30, color: '#8a6a36' })) };

  // ④ 新部件
  s.parts.push(
    // 龕柱：兩根鎏金立柱貼在背板兩側（根在 Nch0，往上走到板面內側＝part_attachment 一定咬得到）
    { type: 'curve', _c: 'niche post (gilt)', host: 'Nch0', material: 'gold_trim', mirrored: true,
      offset: [0.132, 0.020, -0.004], dir: [0.04, 0.985, -0.17], sides: 6,
      segments: [{ len: 0.105, r: 0.024 }, { len: 0.078, r: 0.017 }, { len: 0.048, r: 0.010, rise: 18, taper: true }],
      smooth_angle: 26 },
    // 龕頂翹角（廟簷）：兩支往外上挑的鎏金角，根埋在背板頂內
    { type: 'curve', _c: 'niche eave horn (gilt)', host: 'Nch3', material: 'gold_trim', mirrored: true,
      offset: [0.030, 0.004, 0.000], dir: [0.86, 0.46, -0.10], sides: 6,
      segments: [{ len: 0.095, r: 0.026 }, { len: 0.070, r: 0.013, rise: 36, taper: true }],
      smooth_angle: 26 },
    // 龕簷正脊：一小截朝上的鎏金脊珠
    { type: 'curve', _c: 'niche ridge knob (gilt)', host: 'Nch3', material: 'gold_trim',
      offset: [0, 0.006, 0.000], dir: [0, 1, -0.06], sides: 8,
      segments: [{ len: 0.030, r: 0.036 }, { len: 0.022, r: 0.020 }, { len: 0.016, r: 0.009, taper: true }],
      smooth_angle: 26 },
    // 贔屭龍角：一對短角，刻意壓在 y<0.90 以免撞進裙緣陰影（_traps_harden5 ⑦）
    { type: 'curve', _c: 'bixi brow horn', host: 'Hd1', material: 'tusk', mirrored: true,
      offset: [0.045, 0.050, 0.020], dir: [0.30, 0.62, 0.72], sides: 6,
      segments: [{ len: 0.058, r: 0.020 }, { len: 0.044, r: 0.009, rise: -22, taper: true }],
      smooth_angle: 26 },
    // 贔屭頷鬚：一對往前下外撇的骨白鬚
    { type: 'curve', _c: 'bixi barbel', host: 'Hd1', material: 'tusk', mirrored: true,
      offset: [0.082, -0.030, 0.018], dir: [0.52, -0.30, 0.80], sides: 6,
      segments: [{ len: 0.078, r: 0.015 }, { len: 0.062, r: 0.009, fall: 26 }, { len: 0.046, r: 0.004, fall: 30, taper: true }],
      smooth_angle: 26 },
  );

  // 三角形預算：把幾個大 volume 的 sides 降一階，替上面的新件騰空間
  const sid = { shell: 16, pot: 16, head: 12, cup: 14, brim: 14, skirt: 20, LFront: 8, LBack: 8, tail: 8 };
  for (const v of s.volumes) if (sid[v.chain]) v.sides = sid[v.chain];
  // 碗口的彎折處環距放寬（cli 的 anim_integrity 建議：rings are not crowded through the bend）
  s.volumes.find((v) => v.chain === 'cup').ring_step = 0.019;

  return s;
}

// ════════════════════════════════════════════════════════════════════════════
// 乙 fushou_b「馱燈神龜」
// ════════════════════════════════════════════════════════════════════════════
const f = (y) => +(0.07 + (y - 0.07) * 0.78).toFixed(4);   // 以地面 0.07 為原點把龜身壓低

function buildB() {
  const s = clone(BASE);
  s.name = 'fushou_b';
  s._variant = 'A2 標竿卷第二件 乙案「馱燈神龜」（fushou_b）。基底＝assets/creatures/fushou.json（出貨版）。'
    + '改的五件事：① 全身 y 以地面為原點壓成 0.78（龜身變成矮寬的基座）、四肢外撇；'
    + '② 頭抬高前伸成贔屭（Hd0 y 0.768→0.90），從甲前緣下方仰起；'
    + '③ 背上新增 shrine 鏈＝三層硃紅光明燈龕（塔身方正、兩層鎏金翹角簷、龕面 16 格 glow_lamp 小燈位）；'
    + '④ 高足油碗與單焰整組搬到龕頂（cup 改直立、attach 由 pot 改 shrine），火苗縮成 0.72 倍當塔頂剎；'
    + '⑤ 裙邊加寬到 0.72 讓剪影更寬正（香火側視 W/H ≥0.9，ART_BIBLE.md:26）。'
    + '龜背原本的鎏金葫蘆頂剎（Crest）被燈龕取代、已移除。動畫 clip 名沿用 idle／move／attack。';
  s._brief = 'A temple tortoise flattened into a plinth, carrying a SHRINE OF FAMILY LIGHTS on its back. The broad low '
    + 'carapace and its twelve-plate gilt skirt spread wide and close to the ground on four splayed limbs; from under '
    + 'the front rim a BIXI head rears up and forward — blunt box muzzle, barred square teeth, gilt brow ridge, two '
    + 'bulging ember-orange eyeballs. Rising from the shell is a three-storey lacquer-red TOWER: square tiers stepping '
    + 'inward, two gilt upswept eaves, and rows of small square LIGHT CELLS glowing amber in the tower faces, the way a '
    + 'temple racks its家族 lamps. Crowning it, a wide shallow vermillion bowl on a short gilt-ringed stem, brimming '
    + 'with amber oil, a dark wick nub and one teardrop flame. Feel: the lamp shrine is the creature; the tortoise is its base.';
  s._traps_a2 = 'A2 乙案新記：① 全身等比壓低時，鏈上的「相對 t」不變，所以 root_containment（腿根、band）自動延用出貨版的裕度；'
    + '會出事的是**絕對座標的鬆散關節**（EyHiA／EyHiB 高光、FlmR），必須跟著宿主重新回填（_traps_batch10 ⑪）。'
    + '② 壓低之後頭會掉進裙緣的高度帶裡（裙 0.651–0.741），必須把頭抬到裙頂之上（Hd0 y 0.90）才看得到臉——'
    + '這與 _traps_harden5 ⑦「前伸比抬高有效」不衝突：那條是在原高度下講的，壓低後裙緣的位置也一起降了。'
    + '③ 燈龕塔頂再掛火苗會把全高推高、side W/H 掉下 0.9，所以火苗縮 0.72 倍＋裙邊加寬到 0.72 一起做。';

  const J = s.joints;
  // ① 龜身壓成基座：**油壺身（pot）縱向壓 0.70、龜甲（shell）只整條下移**——
  // 甲殼壓扁會讓 shell_dark 在識別視角掉到 10% 以下（本卷實測 9.0%），基座感改由「寬裙＋外撇四肢＋矮身」給。
  const f2 = (y) => +(0.07 + (y - 0.07) * 0.70).toFixed(4);
  for (const k of ['Pt0', 'Pt1', 'Pt2', 'Pt3', 'Pt4', 'Tl0', 'Tl1', 'Tl2', 'Bd0', 'Bd1', 'Bd2']) J[k] = [J[k][0], f2(J[k][1]), J[k][2]];
  for (const k of ['Sh0', 'Sh1', 'Sh2', 'Sh3']) J[k] = [J[k][0], +(J[k][1] - 0.12).toFixed(4), J[k][2]];
  // 裙邊改成「往下垂的寬裙」：從甲內起、先外張再垂下，把油壺身遮掉大半。
  // 香火 §1 的剪影條文就是靠垂墜物撐輪廓（ART_BIBLE.md:26），這一案把緣盾裙邊推到那個角色上。
  J.Sk0 = [0, 0.800, -0.020]; J.Sk1 = [0, 0.705, -0.020]; J.Sk2 = [0, 0.450, -0.020];
  // 四肢外撇成基座的四足
  J.LFrHip = [0.24, f2(0.40), 0.16]; J.LFrKnee = [0.47, f2(0.22), 0.25]; J.LFrToe = [0.57, 0.07, 0.30];
  J.LBkHip = [0.23, f2(0.38), -0.18]; J.LBkKnee = [0.46, f2(0.22), -0.27]; J.LBkToe = [0.54, 0.07, -0.32];
  // ② 頭抬起前伸（贔屭）——必須高過裙頂 0.80，否則整張臉埋在垂裙裡
  J.Nk0 = [0, 0.600, 0.060]; J.Nk1 = [0, 0.720, 0.340]; J.Hd0 = [0, 0.880, 0.550]; J.Hd1 = [0, 0.940, 0.700];
  // 高光關節照宿主 Hd0 的相對位移回填（_traps_batch10 ⑪）
  J.EyHiA = [0.161, +(J.Hd0[1] + 0.081).toFixed(4), +(J.Hd0[2] + 0.058).toFixed(4)];
  J.EyHiB = [0.181, +(J.Hd0[1] + 0.003).toFixed(4), +(J.Hd0[2] + 0.066).toFixed(4)];

  // 葫蘆頂剎讓位給燈龕
  s.parts = s.parts.filter((p) => p.host !== 'Crest');
  delete J.Crest; delete s.attach.Crest;

  // ③ 燈龕塔
  J.Shr0 = [0, 0.980, -0.020]; J.Shr1 = [0, 1.125, -0.020]; J.Shr2 = [0, 1.245, -0.020]; J.Shr3 = [0, 1.300, -0.020];
  // skeleton.js:33-40 是照 Object.keys(spec.chains) 的順序建骨架，宿主必須先被建出來——
  // cup 現在掛在 Shr3 上，所以 shrine 必須排在 cup 之前，否則 "attaches to unknown joint Shr3"（本卷實測踩到）
  s.chains = Object.fromEntries(Object.entries(s.chains).flatMap(([k, v]) => (k === 'cup'
    ? [['shrine', ['Shr0', 'Shr1', 'Shr2', 'Shr3']], [k, v]] : [[k, v]])));
  s.attach.shrine = 'Sh2';
  s.touch.push(['shell', 'shrine']);
  s.volumes.push({
    chain: 'shrine', material: 'lamp_bowl', sides: 10, frame: 'up', faceted: true, smooth_angle: 26,
    caps: ['none', 'flat'], ring_step: 0.024,
    profile: [[0, 0.235, 0.205, { exp: 4.4 }],
      [0.20, 0.285, 0.248, { exp: 3.4, sharp: true }],
      [0.42, 0.272, 0.236, { exp: 3.4, sharp: true }],
      [0.50, 0.228, 0.198, { exp: 3.4, sharp: true }],
      [0.72, 0.216, 0.188, { exp: 3.4, sharp: true }],
      [0.80, 0.168, 0.146, { exp: 3.4, sharp: true }],
      [0.93, 0.158, 0.137, { exp: 3.4 }],
      [1, 0.100, 0.087, { exp: 3.6 }]],
  });

  // ④ 高足油碗搬到龕頂
  // 龕頂的碗整組縮成 0.70（塔頂的一盞，不是腹前那一盞）——profile、碗口位移、火苗位移同一個係數，
  // 否則碗口環會轉出碗外（brim root_containment，本卷實測 57% outside）
  const K = 0.70;
  J.Cp0 = [0, 1.180, 0]; J.Cp1 = [0, 1.295, 0]; J.Cp2 = [0, 1.355, 0];
  J.Cp3 = [0, +(J.Cp2[1] + 0.095 * 0.905).toFixed(4), +(J.Cp2[2] + 0.095 * 0.425).toFixed(4)];
  const dB = (v) => [0, +(J.Cp3[1] + v[1] * K).toFixed(4), +(J.Cp3[2] + v[2] * K).toFixed(4)];
  J.Brm0 = dB([0, -0.0145, -0.0068]); J.Brm1 = dB([0, 0.0036, 0.0017]); J.Brm2 = dB([0, 0.0181, 0.0085]);
  J.FlmR = dB([0, -0.0260, -0.0160]);
  for (const v of s.volumes) {
    if (v.chain !== 'cup' && v.chain !== 'brim') continue;
    v.profile = v.profile.map(([t, r1, r2, o]) => [t, +(r1 * K).toFixed(5), +(r2 * K).toFixed(5), o]);
  }
  s.attach.cup = 'Shr3';
  s.touch = s.touch.filter((t) => !(t[0] === 'pot' && t[1] === 'cup'));
  s.touch.push(['shrine', 'cup']);
  // 火苗縮成 0.72 倍（塔頂剎；不縮會把全高推高、side W/H 掉到 0.9 以下）
  for (const p of s.parts) {
    if (p.host !== 'FlmR') continue;
    if (p.points) p.points = p.points.map(([u, v]) => [+(u * 0.72).toFixed(5), +(v * 0.72).toFixed(5)]);
    if (p.offset) p.offset = p.offset.map((c) => +(c * 0.72).toFixed(5));
    if (p.segments) p.segments = p.segments.map((g) => ({ ...g, len: +(g.len * 0.72).toFixed(5), r: +(g.r * 0.72).toFixed(5) }));
    if (p.thickness) p.thickness = +(p.thickness * 0.8).toFixed(5);
  }

  // 龕面 16 格光明燈小燈位（松山慈祐宮光明燈語彙；anchor 會把片子貼平到塔面上＝part_attachment 一定過）
  const cells = [];
  for (const [t, half] of [[0.30, 0.036], [0.62, 0.031]]) {
    for (let k = 0; k < 8; k++) {
      cells.push({ type: 'fin', _c: `family light cell t${t} #${k}`, host: t < 0.5 ? 'Shr1' : 'Shr2',
        material: 'glow_lamp', thickness: 0.011, smooth_angle: 26,
        anchor: { chain: 'shrine', t, around: k * 45 }, udir: [1, 0, 0], vdir: [0, 1, 0], points: cell(half) });
    }
  }
  // 兩層鎏金翹角簷（用 curve，根埋在塔身裡——懸空的平板 fin 會被 part_attachment 擋）
  const eave = (host, off, dir, l0, r0) => ({ type: 'curve', _c: `tier eave horn @${host}`, host, material: 'gold_trim',
    mirrored: true, offset: off, dir, sides: 6,
    segments: [{ len: l0, r: r0 }, { len: +(l0 * 0.85).toFixed(4), r: +(r0 * 0.55).toFixed(4), rise: 26, taper: true }],
    smooth_angle: 26 });
  s.parts.push(
    ...cells,
    eave('Shr1', [0.070, -0.012, 0.110], [0.68, 0.10, 0.73], 0.150, 0.030),
    eave('Shr1', [0.070, -0.012, -0.150], [0.68, 0.10, -0.73], 0.150, 0.030),
    eave('Shr2', [0.060, -0.010, 0.095], [0.68, 0.12, 0.72], 0.125, 0.025),
    eave('Shr2', [0.060, -0.010, -0.130], [0.68, 0.12, -0.72], 0.125, 0.025),
  );

  // ⑤ 垂裙的剖面（上窄→外張→垂下略收）＋ 12 片緣盾；龜甲第一半徑（X 寬）放大讓甲在正面撐得住
  const widenB = (chain, k) => { const v = s.volumes.find((x) => x.chain === chain); v.profile = v.profile.map((r) => [r[0], +(r[1] * k).toFixed(5), r[2], r[3]]); };
  widenB('shell', 1.28);
  const skirt = s.volumes.find((v) => v.chain === 'skirt');
  skirt.profile = [[0, 0.360, 0.300, { exp: 4.8 }], [0.28, 0.780, 0.545, { exp: 5, sharp: true }], [1, 0.640, 0.470, { exp: 5 }]];
  skirt.ring_step = 0.014;
  // 12 片緣盾＝鎏金與香灰交錯。交錯色用去飽和的香灰褐 #6e6455（S=0.23）而不是甲案的 #8a6a36（S=0.61）：
  // 垂裙在 tq 視角佔到 34%，凍結檔的 saturation_area 上限 60% 是**大面積材質的硬天花板**（_traps_harden5 ③），
  // 整片鎏金會直接把 tq 推到 64%。把一半的楔形換成香灰色同時也把「緣盾一格一格」講得更清楚。
  skirt.colors = { arcs: Array.from({ length: 12 }, (_, i) => ({ from: 15 + i * 30, to: 30 + i * 30, color: '#6e6455' })) };

  const sid = { shell: 14, pot: 14, head: 12, cup: 14, brim: 14, skirt: 18, LFront: 8, LBack: 8, tail: 8 };
  for (const v of s.volumes) if (sid[v.chain]) v.sides = sid[v.chain];

  return s;
}

// ════════════════════════════════════════════════════════════════════════════
// claims（與 spec 同一次寫出，在第一次編譯之前；門檻一律抄基底 fushou.claims.json，
// 唯一動到的是 tri_budget 上限＝A2 派工當下訂的「現版 7860 × 1.3 = 10218」，與 boat_a／boat_b 同慣例）
// ════════════════════════════════════════════════════════════════════════════
function claims(name, title, hierarchy, note) {
  const base = JSON.parse(fs.readFileSync(path.join(CRE, 'fushou.claims.json'), 'utf8'));
  const out = clone(base);
  out.name = title;
  out._role = `${note}\n\n（基底＝assets/creatures/fushou.claims.json；除 tri_budget 上限與 share_hierarchy 的分層名單外，`
    + '每一條門檻逐字沿用，沒有一處放寬。識別視角仍是 front。）';
  out._frozen_at = '本檔與 spec 由 build_fushou_variants.mjs 同一次執行寫出，寫在第一次 `judge.mjs` 之前，'
    + '所以門檻不是照本案實測值挑的。tri_budget 上限 10218 ＝ 現版 fushou 實測 7860 × 1.3（A2 派工當下訂的上限，'
    + '同 boat_a／boat_b 的 7093 寫法）；量產凍結檔另有每隻 ≤8000 的預算，兩者的落點見卷內 README 數字表。';
  for (const c of out.claims) {
    if (c.type === 'tri_budget') { c.max = 10218; c.label = '三角形預算 ≤10218（＝現版 fushou 7860 × 1.3，A2 派工當下訂的上限）'; }
    if (c.type === 'share_hierarchy') { c.primary = hierarchy.primary; c.secondary = hierarchy.secondary; c.tertiary = hierarchy.tertiary; }
  }
  return out;
}

const W = (n, o) => { fs.writeFileSync(path.join(CRE, n), JSON.stringify(o, null, 1)); console.log('wrote', n); };

W('fushou_a.json', buildA());
W('fushou_a.claims.json', claims('fushou_a', '福壽綿長 fushou_a「油壺龜」（xianghuo/ward 候選甲）',
  { primary: ['shell_dark', 'pot_body', 'shell_rim'],
    secondary: ['shell_plate', 'hide', 'lamp_bowl', 'lamp_lip', 'gold_trim', 'claw'],
    tertiary: ['glow_lamp', 'eye', 'hi_white', 'tusk', 'socket'] },
  '甲案「油壺龜」：燈碗前推出體外剪影＋硃紅燈龕背板（材質沿用 lamp_bowl）＋鎏金龕柱／翹角簷；'
  + '六:三:一 的分層與基底相同（燈龕背板算在 lamp_bowl 這個 secondary 名目下，不另開材質）。'));
W('fushou_b.json', buildB());
W('fushou_b.claims.json', claims('fushou_b', '福壽綿長 fushou_b「馱燈神龜」（xianghuo/ward 候選乙）',
  { primary: ['shell_dark', 'lamp_bowl', 'shell_rim'],
    secondary: ['shell_plate', 'hide', 'pot_body', 'lamp_lip', 'gold_trim', 'claw'],
    tertiary: ['glow_lamp', 'eye', 'hi_white', 'tusk', 'socket'] },
  '乙案「馱燈神龜」：硃紅燈龕塔用 lamp_bowl 材質、體積升到 primary，被它擠下去的 pot_body 降到 secondary——'
  + '這是「龕是主體、龜是座」的機械化，不是放寬（三層名單的條目與基底完全相同，只換了兩個名字的位置）。'));

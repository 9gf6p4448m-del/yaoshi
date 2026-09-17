/* A2 標竿卷第三件「魔神仔紅帽 redhat」兩案 spec 產生器（2026-09-17）
 *
 * 甲 redhat_a「紅帽猴精」：照 docs/experiments/2026-09-04-ref-redhat.md:15-20 的民俗五條特徵重做——
 *   猿猴臉（吻部前凸、重眉弓、尖耳上翹、紅眼）、毛改成「少量寬長的濕毛片」（7 根細 curve → 4 片寬 fin）、
 *   尖巫師帽 → 鮮紅斗笠（唯一 IP 色）、haunt 下半身虛化由整齊霧簾改成榕樹氣根般的不對稱垂條。
 * 乙 redhat_b「錯位的紅衣小孩」：走 ART_BIBLE.md:40-47 陰氣「太像人、但比例錯」——
 *   小孩身形但手太長、頭太低、手臂多一節關節；紅衣紅帽；猴形臉埋在帽簷陰影下只露紅眼；
 *   下半身虛化成濕透拖地的布，一側長一側短。
 *
 * 跑法：node docs/experiments/2026-09-17-a2-redhat/specgen/build_redhat_variants.mjs
 * 輸出：assets/creatures/redhat_a.json / redhat_a.claims.json / redhat_b.json / redhat_b.claims.json
 * **不動** assets/creatures/redhat.json、redhat.glb、redhat.claims.json（本檔只讀它當基底）。
 *
 * 必須保留（派工鐵則）：haunt 專用半透明材質名 ghost_skirt／ghost_wisp（js/creature-figures.js:345
 *   靠 /^ghost_/ 前綴掛 opacity 0.62）、body 鏈（Waist→Spine→Chest→NeckB→Neck2）與 mist 鏈
 *   （MistRoot→Mist1→Mist2→MistTip）的骨架結構、animations 三個 clip 名 idle／move／attack。
 * 守則出處：docs/design/ART_BIBLE.md:40-47（陰氣：苔綠 #3d6e4e／亮 #70b080＋濕黑＋一點刺眼紅；
 *   吸飽水的布、霉斑、濕髮、泥、榕樹氣根；剪影不對稱、比例錯誤；空洞眼、裂嘴、細長指、骨感、殘缺）、
 *   :11（不可愛：圓臉圓眼、短胖圓潤、Q 版一律禁）。
 * 引擎陷阱沿用 redhat.json 的 _around_note／_ring_note／_paw_note／_traps，本檔新踩的另記在各案 _traps_a2。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const CRE = path.join(ROOT, 'assets', 'creatures');
const BASE = JSON.parse(fs.readFileSync(path.join(CRE, 'redhat.json'), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));
const vol = (s, c) => s.volumes.find((v) => v.chain === c);

// ════════════════════════════════════════════════════════════════════════════
// 甲 redhat_a「紅帽猴精」
// ════════════════════════════════════════════════════════════════════════════
function buildA() {
  const s = clone(BASE);
  s.name = 'redhat_a';
  s._variant = 'A2 標竿卷第三件 甲案「紅帽猴精」（redhat_a）。基底＝assets/creatures/redhat.json（出貨版）。'
    + '改的五件事：① 猿猴臉——顱骨壓低前伸、吻部（jaw 鏈）加長加寬成猴吻、眉弓板加厚、尖耳放大 1.25 倍再往上翹；'
    + '② 毛＝少量寬長的濕毛片：7 根 4 邊細 curve 全部刪掉，換成 4 片寬 fin 毛片（conform:false，懸在體側往下垂）；'
    + '③ 尖頂巫師帽改成鮮紅斗笠（寬圓笠簷＋矮圓笠頂），帽沿破口碎片移到笠簷邊緣並放大；'
    + '④ haunt 下半身：霧裾收窄、9 條等粗霧鬚換成 7 條榕樹氣根（半徑 0.0015–0.019、長度 0.10–0.41，粗細長短全不同）；'
    + '⑤ 矮小不靠短胖：軀幹收窄、左臂加長成猿臂垂到霧裾高度，右臂維持殘肢。動畫 clip 名沿用 idle／move／attack。';
  s._brief = 'Moshenzai as an ape-goblin. A low ape skull thrust forward on a short thick neck: heavy brow slab, a long '
    + 'boxy MUZZLE with bared uneven fangs, two RED pinpoint eyes sunk in shadow, and two big sharp EARS swept up and back '
    + 'past the skull. Its coat is not strands but a few BROAD WET SLABS of matted pelt hanging off the ribs, uneven in '
    + 'length. The left arm is long and thin like an ape arm, hanging past the hem to drag its splayed claws; the right is a '
    + 'stunted bone-coloured stub held across the chest. Below the waist there are no legs: the body narrows into mist and '
    + 'breaks up into BANYAN AERIAL ROOTS — seven hanging cords, some thick and short, some thread-thin and very long, none '
    + 'the same. Signature = the wide RED CONICAL RAIN HAT worn crooked, its rim torn into uneven shards. Identity view = side.';
  s._traps_a2 = 'A2 甲案新記：① 斗笠的寬笠簷是「半徑在極短的 t 區間內從 0.040 跳到 0.176」，那是笠簷上下兩面；'
    + '這個跳躍必須遠離 hat 鏈在 Hat1 的歪折（_ring_note 的 corner bevel-skip 帶＝r·tan(θ/2)·1.2），'
    + '所以笠簷放在 t 0.10–0.17、歪折留在 t≈0.52、該處半徑只有 0.07。'
    + '② 懸空的寬毛片用 host+offset+conform:false（不是 anchor）：anchor 會把片子壓平貼回體表、讀成補丁不是毛；'
    + '但 part_attachment 量的是「部件最近的那一個頂點到宿主 volume 的距離」，所以片子的根要落在軀幹半徑之內。'
    + '③ 氣根要「粗細不一」就不能共用一組 segments：半徑最粗 0.019 與最細 0.0015 差一個數量級，'
    + '長度 0.10–0.41 差 4 倍——等粗等長才是上一版被讀成「水晶底座下的簾子」的原因。';

  // ── palette：紅只留在斗笠與眼；毛片與氣根往濕黑／苔綠走（ART_BIBLE.md:41-44）──
  s.palette.hat = { color: '#ad1420', rough: 0.74 };          // 鮮紅斗笠＝唯一 IP 色
  s.palette.robe = { color: '#3a3a33', rough: 0.97 };         // 濕毛褐灰的身體
  s.palette.pelt = { color: '#2f342e', rough: 0.99 };         // 吸飽水的毛片
  s.palette.skin_head = { color: '#544c42', rough: 0.93 };
  s.palette.skin_jaw = { color: '#6a5f50', rough: 0.9 };      // 猴吻比臉亮一階，吻部才讀得出「前凸」
  s.palette.ghost_skirt = { color: '#59655d', rough: 0.86 };
  s.palette.ghost_wisp = { color: '#6a7a6c', rough: 0.55 };   // 氣根＝濕木灰綠，不是螢光霧

  // ── joints：猿猴比例（短軀幹、低前伸顱、長左臂）──
  const J = s.joints;
  J.Waist = [0, 0.52, 0];
  J.Spine = { from: 'Waist', up: 0.160, fwd: 0.020 };
  J.Chest = { from: 'Spine', up: 0.132, fwd: 0.022 };
  J.NeckB = { from: 'Chest', up: 0.058, fwd: 0.020 };
  J.Neck2 = { from: 'NeckB', up: 0.036, fwd: 0.016 };
  J.MistRoot = { from: 'Waist', up: -0.024, fwd: 0.004 };
  J.Mist1 = { from: 'MistRoot', up: -0.178, fwd: 0.010 };
  J.Mist2 = { from: 'Mist1', up: -0.148, fwd: 0.018 };
  J.MistTip = { from: 'Mist2', up: -0.110, fwd: 0.026 };
  J.HeadRoot = { from: 'Neck2', up: -0.020, fwd: -0.004 };
  J.Skull = { from: 'HeadRoot', up: 0.050, fwd: 0.026 };
  J.Brow = { from: 'Skull', up: 0.034, fwd: 0.020 };
  J.Crown = { from: 'Brow', up: 0.024, fwd: 0.002 };
  J.JawRoot = { from: 'Skull', up: -0.026, fwd: 0.018 };
  J.Jaw1 = { from: 'JawRoot', up: -0.016, fwd: 0.078 };   // 猴吻：前凸段拉長
  J.JawTip = { from: 'Jaw1', up: -0.006, fwd: 0.050 };
  J.HatRoot = { from: 'Brow', up: -0.006, fwd: -0.018 };
  J.Hat1 = { from: 'HatRoot', up: 0.050, side: 0.020, fwd: -0.014 };
  J.HatTip = { from: 'Hat1', up: 0.032, side: 0.024, fwd: -0.010 };
  // 猿臂：長左臂垂到霧裾高度（相鄰段長差 ≥8%，_traps ①）
  J.LArmRoot = { from: 'Chest', side: 0.046, up: -0.030, fwd: 0.006 };
  J.LElbow = { from: 'LArmRoot', side: 0.094, up: -0.124, fwd: 0.040 };
  J.LWrist = { from: 'LElbow', side: 0.055, up: -0.178, fwd: 0.070 };
  J.LHand = { from: 'LWrist', side: 0.010, up: -0.074, fwd: 0.036 };
  // 右臂：殘肢橫過胸口（沿用 _harden3a2 的姿勢）
  J.RArmRoot = { from: 'Chest', side: -0.046, up: -0.026, fwd: 0.044 };
  J.RElbow = { from: 'RArmRoot', side: -0.014, up: -0.026, fwd: 0.058 };
  J.RWrist = { from: 'RElbow', side: 0.076, up: -0.008, fwd: 0.022 };
  J.RHand = { from: 'RWrist', side: 0.032, up: -0.006, fwd: 0.002 };

  // ── volumes ──
  const body = vol(s, 'body');
  body.profile = [[0, 0.086, 0.078, { exp: 4.8 }],
    [0.28, 0.102, 0.090, { exp: 4.8 }],
    [0.60, 0.124, 0.100, { exp: 5, sharp: true }],
    [0.74, 0.092, 0.074, { exp: 4.8, sharp: true }],
    [0.87, 0.042, 0.036, { exp: 4.8, sharp: true }],
    [1, 0.036, 0.032, { exp: 4.8 }]];
  const mist = vol(s, 'mist');
  // 霧裾收窄：上一版的胖錐被兩位讀者讀成「水晶／寶石底座」，把實心體積讓給氣根
  mist.profile = [[0, 0.076, 0.070, { exp: 4.8 }],
    [0.15, 0.116, 0.108, { exp: 4.8, sharp: true }],
    [0.40, 0.086, 0.080, { exp: 4.8, sharp: true }],
    [0.70, 0.044, 0.040, { exp: 4.8, sharp: true }],
    [1, 0.012, 0.011, { exp: 4.8 }]];
  // 亮青綠 #4ab488 的大孤帶是 2026-09-04 兩位讀者讀成「翡翠水晶／寶石底座」的直接來源，
  // 換成 ART_BIBLE.md:41 的苔綠 #3d6e4e 窄帶交錯濕黑
  mist.colors = { arcs: [{ from: 0, to: 36, color: '#2b332e' }, { from: 72, to: 108, color: '#3d6e4e' },
    { from: 144, to: 180, color: '#2b332e' }, { from: 216, to: 252, color: '#3d6e4e' },
    { from: 288, to: 324, color: '#2b332e' }] };
  const head = vol(s, 'head');
  head.profile = [[0, 0.030, 0.028, { exp: 4.8 }],
    [0.20, 0.058, 0.054, { exp: 4.8, sharp: true }],
    [0.55, 0.062, 0.058, { exp: 4.8 }],
    [0.82, 0.050, 0.044, { exp: 4.8, sharp: true }],
    [1, 0.028, 0.026, { exp: 4.8 }]];
  const jaw = vol(s, 'jaw');     // 猴吻：方箱狀、前端仍收
  jaw.profile = [[0, 0.040, 0.036, { exp: 4.8 }],
    [0.40, 0.058, 0.046, { exp: 4.8, sharp: true }],
    [0.76, 0.050, 0.034, { exp: 4.8, sharp: true }],
    [1, 0.030, 0.022, { exp: 4.8 }]];
  const hat = vol(s, 'hat');     // 斗笠：寬圓笠簷 + 矮圓笠頂
  hat.sides = 12;
  hat.ring_step = 0.010;
  hat.caps = ['none', 'dome'];
  // 斗笠＝笠簷寬、笠頂扁。第一版把 hat 鏈留在 0.175 長、笠簷之上還有 0.14 高的錐，
  // hero 圖讀成「紅色尖兜帽／狐狸面」（本卷實測）；鏈縮到 0.097、笠簷推到 0.168，
  // 笠頂高 ÷ 笠簷半徑 ＝ 0.36（第一版 0.93）才是斗笠。
  hat.profile = [[0, 0.036, 0.035, { exp: 4.6 }],
    [0.18, 0.094, 0.091, { exp: 3.8 }],
    [0.44, 0.160, 0.154, { exp: 3.0, sharp: true }],
    [0.54, 0.136, 0.131, { exp: 3.2, sharp: true }],
    [0.74, 0.088, 0.085, { exp: 4.0, sharp: true }],
    [0.90, 0.044, 0.042, { exp: 4.2, sharp: true }],
    [1, 0.008, 0.008, { exp: 4.2 }]];
  hat.colors = { arcs: [{ from: 0, to: 60, color: '#6a0a10' }, { from: 180, to: 210, color: '#6a0a10' }] };
  const la = vol(s, 'LArm');
  la.profile = [[0, 0.046, 0.050, { exp: 4.8 }], [0.4, 0.030, 0.033, { exp: 4.8 }],
    [0.78, 0.023, 0.025, { exp: 4.8 }], [1, 0.017, 0.016, { exp: 4.8 }]];

  // ── parts ──
  // ② 刪掉 7 根細 pelt curve（那是「一叢細棍／昆蟲細足」誤讀的來源）；頂毛 3 根留著（文獻「頂上毛髮稀疏」）
  s.parts = s.parts.filter((p) => !(p.material === 'pelt' && (p.host === 'Chest' || p.host === 'Spine')));
  // ④ 刪掉 9 條等粗霧鬚
  s.parts = s.parts.filter((p) => p.material !== 'ghost_wisp');
  // 爪子減量加粗：左手 3 根 → 2 根、右手 2 根 → 1 根（少而寬）
  s.parts = s.parts.filter((p) => p.material !== 'claw');

  // 眉弓板加厚（猿猴的重眉弓）
  const brow = s.parts.find((p) => p.material === 'stripe');
  brow.thickness = 0.030;
  // 加寬之後整片往上讓 0.012：不讓的話眉板會從上方蓋掉兩顆眼（judge 量到 eye 的 tq share 掉到 0，本卷實測）
  brow.points = brow.points.map(([u, v]) => [+(u * 1.15).toFixed(4), +(v * 1.15 + 0.012).toFixed(4)]);
  // 尖耳放大並往上翹（udir 轉得更立）
  for (const p of s.parts) {
    if (p.material !== 'ear' && p.material !== 'ear_inner') continue;
    p.udir = [0.60, 0.80, 0];
    p.vdir = [-0.80, 0.60, 0];
    p.points = p.points.map(([u, v]) => [+(u * 1.15).toFixed(4), +(v * 1.15).toFixed(4)]);
  }
  // 腦後頂毛往後讓開放大後的耳片、頂毛往上讓開抬高後的眉板（part_overlap 實測 46/54%）
  {
    const t = s.parts.find((q) => q.material === 'pelt' && q.host === 'Brow');
    t.offset = [-0.006, 0.014, -0.040]; t.dir = [-0.12, 0.60, -0.79];
    const c = s.parts.filter((q) => q.material === 'pelt' && q.host === 'Crown');
    c[0].offset = [0.018, 0.008, 0.008]; c[1].offset = [-0.022, 0.004, 0.000];
  }
  // 眼放大一階（文獻「雙眼通紅」；面積仍極小，不影響 saturation_area）
  const eye = s.parts.find((p) => p.type === 'eye');
  eye.size = 0.024; eye.face = 0.044; eye.spread = 0.030; eye.height = -0.026;

  // ② 4 片寬長的濕毛片（少而寬；conform:false 讓它們懸在體側往下垂，不貼回體表）
  const flap = (host, offset, udir, points, thickness) => ({
    type: 'fin', _c: `wet pelt slab @${host}`, host, material: 'pelt', thickness,
    conform: false, smooth_angle: 26, udir, vdir: [0, 1, 0], offset, points });
  // 四片分居四個象限（前右／後左／後右／前左），高度兩兩錯開；長度 0.146/0.118/0.170/0.092 全不同
  s.parts.push(
    flap('Chest', [0.078, -0.018, 0.046], [-0.51, 0, 0.86],
      [[-0.034, 0.028], [0.032, 0.022], [0.040, -0.098], [0.002, -0.150], [-0.040, -0.084]], 0.010),
    flap('Chest', [-0.078, -0.032, -0.046], [0.51, 0, -0.86],
      [[-0.030, 0.024], [0.030, 0.030], [0.036, -0.068], [-0.002, -0.118], [-0.034, -0.060]], 0.010),
    flap('Spine', [-0.030, 0.006, 0.098], [-0.96, 0, -0.29],
      [[-0.032, 0.026], [0.030, 0.020], [0.038, -0.132], [0.000, -0.200], [-0.038, -0.114]], 0.011),
    flap('Spine', [0.034, -0.010, -0.096], [0.94, 0, 0.33],
      [[-0.026, 0.022], [0.028, 0.028], [0.034, -0.068], [-0.004, -0.110], [-0.030, -0.060]], 0.009),
  );
  // 爪：少而寬——左手兩根粗指爪、右手一根
  const claw = (host, offset, dir, segs) => ({ type: 'curve', _c: `splayed claw @${host}`, host,
    material: 'claw', sides: 5, smooth_angle: 26, offset, dir, segments: segs });
  s.parts.push(
    claw('LHand', [0.014, -0.012, 0.016], [0.26, -0.78, 0.57],
      [{ len: 0.090, r: 0.013 }, { len: 0.072, r: 0.004, fall: 24, taper: true }]),
    claw('LHand', [-0.014, -0.012, 0.016], [-0.20, -0.80, 0.56],
      [{ len: 0.112, r: 0.012 }, { len: 0.088, r: 0.003, fall: 18, taper: true }]),
    claw('RHand', [0.010, -0.010, 0.014], [0.70, -0.62, 0.35],
      [{ len: 0.036, r: 0.011 }, { len: 0.028, r: 0.003, fall: 22, taper: true }]),
  );

  // ③ 笠簷破口碎片：移到笠簷邊（t 0.115–0.155）並放大
  const shards = s.parts.filter((p) => p.material === 'hat');
  const shardT = [0.430, 0.455, 0.480];
  shards.forEach((p, i) => {
    p.anchor = { chain: 'hat', t: shardT[i], around: p.anchor.around };
    p.thickness = 0.010;
    // 笠簷碎片：放大 1.3 倍後整體往外推 0.020——內側頂點若留在負 u，笠簷的外翻曲面會從它底下滑開，
    // part_attachment 就會判「懸空 0.021」（本卷實測）
    p.points = p.points.map(([u, v]) => [+(u * 1.3 + 0.048).toFixed(4), +(v * 1.3).toFixed(4)]);
  });

  // ④ 7 條榕樹氣根：粗細長短全不同（最粗 0.019 / 最細 0.0015，最長 0.41 / 最短 0.10）
  const root = (host, offset, dir, segs) => ({ type: 'curve', _c: `banyan aerial root @${host}`, host,
    material: 'ghost_wisp', sides: 5, smooth_angle: 26, offset, dir, segments: segs });
  // 第一版把氣根做成 7 條細 curve，hero 圖底下就是一叢細棍（＝2026-09-04 三位讀者說的「昆蟲細足」）。
  // 改成「3 片寬根簾 ＋ 4 條粗氣根」：寬的撐面、粗的撐體，沒有一條是細棍。
  const curtain = (host, offset, udir, points, thickness) => ({
    type: 'fin', _c: `banyan root curtain @${host}`, host, material: 'ghost_wisp', thickness,
    conform: false, smooth_angle: 26, udir, vdir: [0, 1, 0], offset, points });
  s.parts.push(
    curtain('Mist1', [0.062, 0.010, 0.030], [-0.44, 0, 0.90],
      [[-0.046, 0.020], [0.044, 0.014], [0.052, -0.168], [0.006, -0.278], [-0.052, -0.146]], 0.012),
    curtain('Mist1', [-0.058, 0.006, -0.038], [0.55, 0, -0.84],
      [[-0.040, 0.018], [0.038, 0.024], [0.046, -0.104], [-0.004, -0.196], [-0.046, -0.092]], 0.011),
    curtain('Mist1', [-0.012, 0.008, 0.082], [-0.98, 0, -0.20],
      [[-0.036, 0.016], [0.034, 0.022], [0.042, -0.140], [-0.002, -0.232], [-0.040, -0.120]], 0.010),
    root('Mist1', [0.046, 0.014, -0.050], [0.11, -0.99, -0.09],
      [{ len: 0.122, r: 0.026 }, { len: 0.094, r: 0.016, fall: 5 }, { len: 0.066, r: 0.007, fall: 10, taper: true }]),
    root('Mist1', [-0.054, 0.012, -0.026], [-0.09, -0.99, -0.06],
      [{ len: 0.128, r: 0.018 }, { len: 0.098, r: 0.011, fall: 4 }, { len: 0.056, r: 0.006, fall: 12, taper: true }]),
    root('Mist1', [-0.072, 0.010, 0.020], [-0.14, -0.99, 0.05],
      [{ len: 0.058, r: 0.020 }, { len: 0.038, r: 0.008, fall: 16, taper: true }]),
    root('Mist2', [0.024, 0.004, 0.030], [0.10, -0.98, 0.14],
      [{ len: 0.060, r: 0.015 }, { len: 0.042, r: 0.008, fall: 8, taper: true }]),
  );

  return s;
}

// ════════════════════════════════════════════════════════════════════════════
// 乙 redhat_b「錯位的紅衣小孩」
// ════════════════════════════════════════════════════════════════════════════
function buildB() {
  const s = clone(BASE);
  s.name = 'redhat_b';
  s._variant = 'A2 標竿卷第三件 乙案「錯位的紅衣小孩」（redhat_b）。基底＝assets/creatures/redhat.json（出貨版）。'
    + '改的六件事：① 小孩身形（軀幹短圓肩、頭小）但比例全錯——頸幾乎不抬只往前送，頭低到縮進肩線裡；'
    + '② 兩條手臂各加一節關節（LElbow2／RElbow2，4 段 → 5 段），整條長到手垂過衣襬；'
    + '③ 紅衣：robe／sleeve 換成吸飽水的暗紅（HSV S<0.5，刺眼的紅只留給帽），帽改成小孩圓帽＋垂帽簷；'
    + '④ 猴形臉埋進帽簷陰影：skin_head／skin_jaw 壓暗、頭往帽下縮，只留兩顆紅眼；'
    + '⑤ 下半身虛化成濕透拖地的布：霧裾改寬鐘形，加 3 片 ghost_skirt 布幅——一側長到及地、一側短一截（不對稱）；'
    + '⑥ 霧鬚縮成 5 條滴水布角。動畫 clip 名沿用 idle／move／attack。';
  s._brief = 'A child in a red coat, standing where no child should be. Small round shoulders and a small head — but the '
    + 'proportions are wrong: the neck does not lift, it only pushes FORWARD, so the head sits low and sunk between the '
    + 'shoulders, and both arms carry an EXTRA JOINT and hang far too long, the hands dangling past the hem. The coat and '
    + 'sleeves are a soaked, muddied dark red; the only clean shrill RED is the round CHILD CAP with its drooping brim, '
    + 'which throws the face into shadow so that only two RED pinpoints and the edge of an ape-like muzzle show under it. '
    + 'Below the waist there is no child at all: the coat widens into a soaked dragging CLOTH, three heavy panels of it, '
    + 'one long enough to pool on the ground and one cut a hand shorter — never level. Identity view = side.';
  s._traps_a2 = 'A2 乙案新記：① 手臂加一節＝chains.LArm 由 4 個關節變 5 個，animations 的 tracks 只認名字，'
    + '原有的 LArmRoot／LElbow／LWrist 都還在，所以三支 clip 一字不用改；但 proportion（checks.js:223）是逐對相鄰段檢查，'
    + '段數變多＝要檢查的對數變多，五段的長度必須兩兩差 ≥8%（本案 0.062／0.151／0.120／0.159／0.083）。'
    + '② 紅衣要過 saturation_area（tq ≤70%）就不能用純紅：吸飽水的暗紅 #6a3d38 的 HSV S＝0.472 < 0.50，'
    + 'judge.mjs:126 的門檻是 S≥0.50，所以大面積的衣不計入高飽和、刺眼的紅全留給帽——這同時就是 ART_BIBLE.md:41 '
    + '「濕黑＋一點刺眼的紅」的做法，不是為了閃門檻。'
    + '③ 拖地布幅用 host+offset+conform:false 的 fin：anchor 會把布壓平貼回霧裾表面、讀成貼紙；'
    + '布幅的根要埋進霧裾半徑之內才過 part_attachment。';

  // ── palette：衣是吸飽水的暗紅（S<0.5），刺眼紅只留給帽 ──
  s.palette.robe = { color: '#6a3d38', rough: 0.97 };
  s.palette.sleeve = { color: '#5e3733', rough: 0.97 };
  s.palette.stump_arm = { color: '#5e3733', rough: 0.97 };
  s.palette.hat = { color: '#c01824', rough: 0.7 };
  s.palette.skin_head = { color: '#2a2723', rough: 0.95 };   // 帽簷陰影下的臉
  s.palette.skin_jaw = { color: '#33302a', rough: 0.93 };
  s.palette.hand = { color: '#6e6656', rough: 0.9 };
  s.palette.ghost_skirt = { color: '#55524a', rough: 0.95 };  // 濕透的布，不是霧
  s.palette.ghost_wisp = { color: '#5f5a50', rough: 0.85 };

  const J = s.joints;
  // ① 小孩身形、比例錯：頸不抬只前送，頭縮進肩線
  J.Waist = [0, 0.50, 0];
  J.Spine = { from: 'Waist', up: 0.168, fwd: 0.006 };
  J.Chest = { from: 'Spine', up: 0.142, fwd: 0.010 };
  J.NeckB = { from: 'Chest', up: 0.030, fwd: 0.046 };
  J.Neck2 = { from: 'NeckB', up: 0.016, fwd: 0.040 };
  J.MistRoot = { from: 'Waist', up: -0.020, fwd: 0.006 };
  J.Mist1 = { from: 'MistRoot', up: -0.158, fwd: 0.010 };
  J.Mist2 = { from: 'Mist1', up: -0.140, fwd: 0.020 };
  J.MistTip = { from: 'Mist2', up: -0.112, fwd: 0.030 };
  J.HeadRoot = { from: 'Neck2', up: -0.009, fwd: -0.023 };
  J.Skull = { from: 'HeadRoot', up: 0.050, fwd: 0.034 };
  J.Brow = { from: 'Skull', up: 0.030, fwd: 0.020 };
  J.Crown = { from: 'Brow', up: 0.022, fwd: 0.002 };
  J.JawRoot = { from: 'Skull', up: -0.020, fwd: 0.010 };
  J.Jaw1 = { from: 'JawRoot', up: -0.018, fwd: 0.058 };
  J.JawTip = { from: 'Jaw1', up: -0.008, fwd: 0.036 };
  J.HatRoot = { from: 'Brow', up: -0.026, fwd: -0.004 };
  J.Hat1 = { from: 'HatRoot', up: 0.064, side: 0.014, fwd: 0.002 };
  J.HatTip = { from: 'Hat1', up: 0.042, side: 0.026, fwd: 0.006 };
  // ② 手太長＋多一節關節
  J.LArmRoot = { from: 'Chest', side: 0.044, up: -0.026, fwd: 0.004 };
  J.LElbow = { from: 'LArmRoot', side: 0.076, up: -0.130, fwd: 0.024 };
  J.LElbow2 = { from: 'LElbow', side: 0.020, up: -0.112, fwd: 0.040 };
  J.LWrist = { from: 'LElbow2', side: 0.012, up: -0.156, fwd: 0.030 };
  J.LHand = { from: 'LWrist', side: 0.004, up: -0.078, fwd: 0.026 };
  J.RArmRoot = { from: 'Chest', side: -0.030, up: -0.030, fwd: 0.010 };
  J.RElbow = { from: 'RArmRoot', side: -0.088, up: -0.104, fwd: 0.008 };
  J.RElbow2 = { from: 'RElbow', side: -0.026, up: -0.150, fwd: 0.030 };
  J.RWrist = { from: 'RElbow2', side: 0.010, up: -0.104, fwd: 0.056 };
  J.RHand = { from: 'RWrist', side: 0.008, up: -0.064, fwd: 0.022 };
  s.chains.LArm = ['LArmRoot', 'LElbow', 'LElbow2', 'LWrist', 'LHand'];
  s.chains.RArm = ['RArmRoot', 'RElbow', 'RElbow2', 'RWrist', 'RHand'];

  // ── volumes ──
  const body = vol(s, 'body');   // 小孩的圓肩窄腰，但不胖：半徑比甲案只大一點點
  body.profile = [[0, 0.090, 0.082, { exp: 4.8 }],
    [0.30, 0.104, 0.094, { exp: 4.8 }],
    [0.64, 0.126, 0.104, { exp: 5, sharp: true }],
    [0.80, 0.086, 0.070, { exp: 4.8, sharp: true }],
    [0.92, 0.048, 0.042, { exp: 4.8, sharp: true }],
    [1, 0.042, 0.038, { exp: 4.8 }]];
  const mist = vol(s, 'mist');   // 濕透拖地的布：寬鐘形
  // 布的折：多幾道 sharp 斷面；光滑的鐘形在 hero 圖上讀成「蛋／豆子」（本卷實測）
  mist.profile = [[0, 0.080, 0.074, { exp: 4.8 }],
    [0.18, 0.124, 0.110, { exp: 4.8, sharp: true }],
    [0.34, 0.112, 0.098, { exp: 5, sharp: true }],
    [0.52, 0.142, 0.124, { exp: 4.8, sharp: true }],
    [0.68, 0.124, 0.106, { exp: 5, sharp: true }],
    [0.84, 0.100, 0.086, { exp: 4.8, sharp: true }],
    [1, 0.046, 0.040, { exp: 4.8 }]];
  // 同甲案：亮青綠的大孤帶＝「水晶底座」誤讀的來源，換成濕布的泥褐與霉綠窄帶交錯
  mist.colors = { arcs: [{ from: 0, to: 40, color: '#3b3a34' }, { from: 80, to: 120, color: '#46543f' },
    { from: 160, to: 200, color: '#3b3a34' }, { from: 240, to: 280, color: '#46543f' },
    { from: 320, to: 360, color: '#3b3a34' }] };
  const head = vol(s, 'head');   // 小孩的小圓顱，但吻仍是猴的
  head.profile = [[0, 0.026, 0.024, { exp: 4.8 }],
    [0.22, 0.056, 0.052, { exp: 4.8, sharp: true }],
    [0.58, 0.060, 0.056, { exp: 4.8 }],
    [0.84, 0.046, 0.042, { exp: 4.8, sharp: true }],
    [1, 0.026, 0.024, { exp: 4.8 }]];
  const hat = vol(s, 'hat');     // 小孩圓帽＋垂帽簷（帽簷把臉壓進陰影）
  hat.sides = 12;
  hat.ring_step = 0.016;
  hat.profile = [[0, 0.040, 0.038, { exp: 4.6 }],
    [0.10, 0.086, 0.083, { exp: 4.0 }],
    [0.24, 0.146, 0.141, { exp: 3.4, sharp: true }],
    [0.34, 0.120, 0.116, { exp: 3.8, sharp: true }],
    [0.56, 0.100, 0.096, { exp: 4.6 }],
    [0.80, 0.080, 0.077, { exp: 4.6, sharp: true }],
    [1, 0.030, 0.029, { exp: 4.6 }]];
  hat.caps = ['none', 'dome'];
  hat.colors = { arcs: [{ from: 0, to: 48, color: '#78101a' }, { from: 144, to: 180, color: '#78101a' }] };
  const la = vol(s, 'LArm');     // 太長太細的手臂
  la.profile = [[0, 0.048, 0.052, { exp: 4.8 }], [0.34, 0.032, 0.035, { exp: 4.8 }],
    [0.70, 0.026, 0.028, { exp: 4.8 }], [1, 0.018, 0.017, { exp: 4.8 }]];
  const jaw = vol(s, 'jaw');     // 根環縮小才埋得進小孩的小顱
  jaw.profile = [[0, 0.034, 0.030, { exp: 4.8 }],
    [0.46, 0.054, 0.038, { exp: 4.8, sharp: true }],
    [0.78, 0.044, 0.028, { exp: 4.8, sharp: true }],
    [1, 0.024, 0.018, { exp: 4.8 }]];
  const ra = vol(s, 'RArm');
  ra.profile = [[0, 0.032, 0.035, { exp: 4.8 }], [0.34, 0.029, 0.032, { exp: 4.8 }],
    [0.70, 0.024, 0.026, { exp: 4.8 }], [1, 0.017, 0.016, { exp: 4.8 }]];
  ra.ring_step = 0.030;

  // ── parts ──
  // 毛與鱗換成小孩的衣：刪掉濕毛條與圓鱗板（小孩身上不長毛；「錯」靠比例不靠毛）
  s.parts = s.parts.filter((p) => !(p.material === 'pelt' && (p.host === 'Chest' || p.host === 'Spine')));
  s.parts = s.parts.filter((p) => p.material !== 'scale');
  s.parts = s.parts.filter((p) => p.material !== 'ghost_wisp');
  // 兩手的指爪都拉長變細（小孩的手，但太長）
  for (const p of s.parts) {
    if (p.material !== 'claw') continue;
    p.segments = p.segments.map((g) => ({ ...g, len: +(g.len * 0.82).toFixed(4), r: +(g.r * 1.45).toFixed(4) }));
  }
  // 右殘肢掌換回 hand 材質（乙案兩手都是小孩的手，錯的是長度）
  const rpaw = s.parts.find((p) => p.type === 'paw' && p.host === 'RHand');
  rpaw.material = 'hand'; rpaw.size = [0.050, 0.022, 0.054];
  // 尖耳縮小並收在帽下（臉要藏在帽簷陰影裡，耳朵不能搶戲）
  for (const p of s.parts) {
    if (p.material !== 'ear' && p.material !== 'ear_inner') continue;
    p.points = p.points.map(([u, v]) => [+(u * 0.72).toFixed(4), +(v * 0.72).toFixed(4)]);
  }
  // 腦後頂毛往後讓開耳片（part_overlap 實測 46%）
  {
    const t = s.parts.find((q) => q.material === 'pelt' && q.host === 'Brow');
    t.offset = [-0.006, 0.014, -0.040]; t.dir = [-0.12, 0.60, -0.79];
  }
  // 眼：只露兩顆紅點（放大一階，因為臉整個埋在陰影裡）
  const eye = s.parts.find((p) => p.type === 'eye');
  eye.size = 0.031; eye.face = 0.048; eye.spread = 0.032; eye.height = -0.022;
  // 帽沿破口碎片改成垂帽簷的三片皺褶（t 移到帽簷）
  const shards = s.parts.filter((p) => p.material === 'hat');
  const shardT = [0.250, 0.268, 0.286];
  shards.forEach((p, i) => {
    p.anchor = { chain: 'hat', t: shardT[i], around: p.anchor.around };
    p.thickness = 0.009;
    // 同甲案 _traps_a2 ①：內側頂點留在負 u 會被外翻曲面甩開，整體往外推 0.018
    p.points = p.points.map(([u, v]) => [+(u * 1.15 + 0.018).toFixed(4), +(v * 1.15).toFixed(4)]);
  });

  // ⑤ 三片濕透拖地的布（ghost_skirt）——一側長到及地、一側短一截，長度全不同
  // vdir 不是純 +Y：帶一個「往外」的徑向分量，布幅才會從鐘形的表面往下往外張開。
  // 第一版 vdir=[0,1,0] 的三片布整片垂在鐘形內側，hero 圖上完全看不到（本卷實測）。
  const panel = (host, offset, udir, vdir, points, thickness) => ({
    type: 'fin', _c: `soaked dragging cloth @${host}`, host, material: 'ghost_skirt', thickness,
    conform: false, smooth_angle: 26, udir, vdir, offset, points });
  s.parts.push(
    // 長的那一幅：垂到接近地面；整片推出鐘形之外才看得出是「另一片布」
    panel('Mist1', [0.118, 0.016, 0.048], [0.38, 0, 0.92], [-0.370, 0.92, -0.151],
      [[-0.078, 0.032], [0.076, 0.026], [0.088, -0.166], [0.012, -0.250], [-0.086, -0.146]], 0.012),
    // 短的那一幅：比長的短一截
    panel('Mist1', [-0.124, 0.010, -0.032], [-0.92, 0, 0.39], [0.387, 0.92, 0.100],
      [[-0.070, 0.028], [0.068, 0.034], [0.080, -0.068], [0.006, -0.120], [-0.076, -0.056]], 0.012),
    // 背後的一幅：中等長度、下緣歪斜
    panel('Mist1', [-0.040, 0.020, -0.122], [-0.30, 0, -0.95], [0.124, 0.92, 0.380],
      [[-0.058, 0.030], [0.060, 0.022], [0.068, -0.082], [-0.004, -0.132], [-0.064, -0.062]], 0.011),
  );
  // 滴水布角：4 條粗的（第一版的細棍在 hero 圖底下讀成昆蟲足，同甲案）
  const drip = (host, offset, dir, segs) => ({ type: 'curve', _c: `drip of soaked cloth @${host}`, host,
    material: 'ghost_wisp', sides: 5, smooth_angle: 26, offset, dir, segments: segs });
  s.parts.push(
    drip('Mist2', [0.052, 0.008, 0.092], [0.09, -0.98, 0.17],
      [{ len: 0.052, r: 0.018 }, { len: 0.034, r: 0.008, fall: 14, taper: true }]),
    drip('Mist2', [-0.070, 0.006, 0.062], [-0.11, -0.98, 0.14],
      [{ len: 0.040, r: 0.014 }, { len: 0.026, r: 0.006, fall: 16, taper: true }]),
    drip('Mist2', [0.020, 0.004, -0.098], [0.06, -0.98, -0.16],
      [{ len: 0.058, r: 0.012 }, { len: 0.040, r: 0.006, fall: 10 }, { len: 0.024, r: 0.003, fall: 12, taper: true }]),
    drip('Mist1', [-0.118, 0.010, 0.034], [-0.17, -0.98, 0.08],
      [{ len: 0.112, r: 0.016 }, { len: 0.078, r: 0.006, fall: 18, taper: true }]),
  );

  return s;
}

// ════════════════════════════════════════════════════════════════════════════
// claims（與 spec 同一次寫出，在第一次編譯之前；門檻一律抄基底 redhat.claims.json，
// 唯一動到的是 tri_budget 上限＝A2 派工當下訂的「現版 3415 × 1.3 = 4439」，同 boat／fushou 慣例）
// ════════════════════════════════════════════════════════════════════════════
function claims(title, note) {
  const out = clone(JSON.parse(fs.readFileSync(path.join(CRE, 'redhat.claims.json'), 'utf8')));
  out.name = title;
  out._role = `${note}\n\n（基底＝assets/creatures/redhat.claims.json；除 tri_budget 上限外，每一條門檻逐字沿用，`
    + '沒有一處放寬：saturation_area 仍 10%–70%、focal_contrast min_ratio 2、share_hierarchy tolerance 0.15、'
    + 'part_signature min_share 0.06 / or_min_span 0.12，五條 part_exists（hat／eye／mouth_glow／ghost_skirt／ghost_wisp）'
    + '一條不少。識別視角仍是 side。）';
  out._frozen_at = '本檔與 spec 由 build_redhat_variants.mjs 同一次執行寫出，寫在第一次 `judge.mjs` 之前，'
    + '所以門檻不是照本案實測值挑的。tri_budget 上限 4439 ＝ 現版 redhat 實測 3415 × 1.3（A2 派工當下訂的上限，'
    + '同 boat_a／boat_b、fushou_a／fushou_b 的寫法）；下限 1500 與基底相同，未動。';
  for (const c of out.claims) {
    if (c.type === 'tri_budget') { c.max = 4439; c.label = '三角形預算 ≤4439（＝現版 redhat 3415 × 1.3，A2 派工當下訂的上限）'; }
  }
  return out;
}

const W = (n, o) => { fs.writeFileSync(path.join(CRE, n), JSON.stringify(o, null, 1)); console.log('wrote', n); };

W('redhat_a.json', buildA());
W('redhat_a.claims.json', claims('魔神仔紅帽 redhat_a「紅帽猴精」(yinqi/haunt 候選甲)',
  '甲案「紅帽猴精」：猿猴臉＋寬長濕毛片＋鮮紅斗笠＋榕樹氣根；材質名一個未增未改名，'
  + 'ghost_skirt／ghost_wisp 原樣保留，6:3:1 的三層名單（霧裾群／帽／臉）與基底逐字相同。'));
W('redhat_b.json', buildB());
W('redhat_b.claims.json', claims('魔神仔紅帽 redhat_b「錯位的紅衣小孩」(yinqi/haunt 候選乙)',
  '乙案「錯位的紅衣小孩」：小孩比例錯位（頭太低、手多一節且太長）＋紅衣紅帽＋濕透拖地的布；'
  + '材質名一個未增未改名，ghost_skirt（拖地布幅）／ghost_wisp（滴水布角）原樣保留，'
  + '6:3:1 的三層名單（霧裾群／帽／臉）與基底逐字相同。'));

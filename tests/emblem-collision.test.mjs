/* 徽記剪影互撞的機械檢查（v0.55 招式可辨性卷，覆審 r1 C5-③）。
   跑法：node tests/emblem-collision.test.mjs        （附 --list 印完整配對表）

   它在守什麼：30 個 kind 只靠人眼避撞。本檔把「兩個剪影在畫面上糊成同一團」量成一個數字
   （低解析度灰階 IoU，量法與理由見 tests/tools/emblem-sim.mjs 檔頭），並且**先證明這個數字有沒有鑑別力**。

   ★最重要的一條結論（校準記錄）★：六位讀者實際發生的五組誤讀
     knife→blade（獻祭刀→王爺劍）、seal→tornflag／chair（虎爺印→破軍旗／椅仔姑竹椅）、
     hat→wave／banner5（魔神仔紅帽→拼板舟／五營旗）
   在**任何純幾何門檻**下都排不到 bell（唯一被穩定認出的那一支）同系配對的前面——
   實測五組落在 435 對的第 227／337／374／292／241 名，而 bell~lamp 排第 4。
   Hu moments 更差（第 193–305 名，bell~lamp 第 15）。
   ⇒ **這支測試的紅不等於「讀者會認錯」**，它只回答「這兩個剪影在低解析度下重疊多少」。
      人眼閘門仍然是 L4 盲讀，不得拿本檔的綠去宣稱剪影不會互撞（那會是零鑑別力的檢查）。 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEmblems, facOfKinds, computePairs, rasterize, grayIoU, ROOT } from './tools/emblem-sim.mjs';

const LIST = process.argv.includes('--list');
/* ★鑑別力★：--mutate=1 在**記憶體裡**把 lamp 的頂點換成 talis 的（兩支都是香火系）
   ⇒ 同系多出一對 IoU=1.0 且不在回修清單裡，第 4 條必須紅。原檔全程唯讀，不做反向 sed。 */
const MUT = (() => { const a = process.argv.find((x) => x.startsWith('--mutate=')); return a ? parseInt(a.slice(9), 10) : 0; })();
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('  PASS  ' + name); } catch (e) { fail++; console.log('  FAIL  ' + name + ' — ' + e.message); } };

/** 同系近似的門檻。0.80＝「讀者看到的那個尺度上，兩個剪影的覆蓋率有八成重疊」。
 *  ★不是從現況挑出來的★：現況在這個門檻下**有三對同系超標**（見下方 KNOWN_DEBT），
 *  也就是說它訂下來的當下就是紅的，不是「剛好過」。 */
const GATE = 0.80;

/** 批 1 前置回修清單（已知同系近似，本批不改剪影設計，Q8 的 GLB 回修小卷才動）。
 *  ★這張表只能縮不能長★：下面第 4 條會斷言每一筆**現在仍然真的超標**——
 *  修好一對就必須把它從表裡刪掉，死掉的豁免會判紅（防「加了豁免就永遠留著」）。 */
const KNOWN_DEBT = [
  ['urn', 'drop'],    // 飼鬼甕 vs 黃色小雨衣：兩個都是「上窄下寬、底部收圓」的塊
  ['bell', 'lamp'],   // 千里眼銅鈴 vs 福壽綿長：兩個都是「上尖下外撇」的器物
  ['drop', 'shade'],  // 黃色小雨衣 vs 過陰咒：兩個都是「上尖下鈍」的水滴／兜帽
];
const key = (a, b) => [a, b].sort().join('~');

const { EMBLEM: EMB0, KINDS } = await loadEmblems(ROOT);
const FAC = facOfKinds(ROOT);
const EMBLEM = Object.assign({}, EMB0);
if (MUT === 1) EMBLEM.lamp = EMB0.talis;
if (MUT) console.log(`★突變模式 ${MUT}：以下必須有紅★`);
const pairs = computePairs(EMBLEM, KINDS, FAC);
const get = (a, b) => pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
console.log(`徽記剪影互撞：${KINDS.length} 個 kind ／ ${pairs.length} 對 ／ 同系門檻 ${GATE}`);

/* ── 1. 度量的活性：同一個形狀必須回 1（不是恆 0） ─────────────────────── */
t('自我對照＝1.0（30/30）', () => {
  const bad = KINDS.filter((k) => grayIoU(rasterize(EMBLEM[k]), rasterize(EMBLEM[k])) !== 1);
  if (bad.length) throw new Error('自己跟自己不等於 1：' + bad.join(','));
});

/* ── 2. 度量的死性：形狀真的變了就要掉下來（不是恆 1） ─────────────────── */
t('自我擾動（放大 1.5 倍）必須全部掉到 ≤0.50', () => {
  const bad = KINDS.map((k) => [k, grayIoU(rasterize(EMBLEM[k]), rasterize(EMBLEM[k], 1.5))]).filter(([, v]) => v > 0.5);
  if (bad.length) throw new Error('擾動之後還很像＝度量對形狀沒反應：' + bad.map(([k, v]) => `${k}=${v.toFixed(3)}`).join(' '));
});
t('相似度有動態範圍（最小 <0.20、最大 >0.85）', () => {
  const hi = pairs[0].iou, lo = pairs[pairs.length - 1].iou;
  if (!(lo < 0.2 && hi > 0.85)) throw new Error(`分布塌了：最小 ${lo}（${pairs[pairs.length - 1].a}~${pairs[pairs.length - 1].b}）／最大 ${hi}`);
});
t('人眼公認不像的一對（bolt 雷女之火 vs seal 虎爺印）必須 ≤0.60', () => {
  const v = get('bolt', 'seal').iou;
  if (v > 0.6) throw new Error(`bolt~seal=${v}`);
});

/* ── 3. 校準記錄：純幾何量不到六位讀者的誤讀（本檔存在的理由與它的極限）── */
t('校準記錄：五組人眼互撞的最小值 < bell 同系的最大值（＝純幾何無法校準到人眼）', () => {
  const ANCHORS = [['knife', 'blade'], ['seal', 'tornflag'], ['seal', 'chair'], ['hat', 'wave'], ['hat', 'banner5']];
  const rows = ANCHORS.map(([a, b]) => { const p = get(a, b); return { pair: `${a}~${b}`, iou: p.iou, rank: pairs.indexOf(p) + 1 }; });
  const bellSame = pairs.filter((p) => (p.a === 'bell' || p.b === 'bell') && p.sameFac);
  const minAnchor = Math.min(...rows.map((r) => r.iou));
  const maxBell = Math.max(...bellSame.map((p) => p.iou));
  console.log('        人眼互撞五組：' + rows.map((r) => `${r.pair}=${r.iou}(第 ${r.rank} 名)`).join(' '));
  console.log(`        bell 同系最高：${bellSame[0].a}~${bellSame[0].b}=${bellSame[0].iou}（第 ${pairs.indexOf(bellSame[0]) + 1} 名）`);
  if (minAnchor >= maxBell) {
    throw new Error(`關係翻轉了：min(人眼互撞)=${minAnchor} ≥ max(bell 同系)=${maxBell}。`
      + '這代表剪影或量法改過，本檔檔頭與報告裡「純幾何量不到人眼互撞」那段記錄已經過期，要重新校準並改寫，不是把這條刪掉。');
  }
});

/* ── 4. 同系近似清單：超標的必須在 KNOWN_DEBT 裡，且 KNOWN_DEBT 不得有死條目 ── */
t(`同系 IoU ≥${GATE} 的配對全部在批 1 前置回修清單裡`, () => {
  const over = pairs.filter((p) => p.sameFac && p.iou >= GATE);
  const allow = new Set(KNOWN_DEBT.map(([a, b]) => key(a, b)));
  const surprise = over.filter((p) => !allow.has(key(p.a, p.b)));
  if (surprise.length) throw new Error('新的同系互撞（不在回修清單裡）：' + surprise.map((p) => `${p.a}~${p.b}=${p.iou}`).join(' '));
});
t('回修清單裡的每一對現在仍然真的超標（死豁免判紅）', () => {
  const dead = KNOWN_DEBT.filter(([a, b]) => { const p = get(a, b); return !p || p.iou < GATE; });
  if (dead.length) throw new Error('這幾對已經不超標了，請把它們從 KNOWN_DEBT 刪掉：' + dead.map(([a, b]) => { const p = get(a, b); return `${a}~${b}=${p ? p.iou : '不存在'}`; }).join(' '));
});

/* ── 5. 報告：全部紅配對（批 1 前置回修的材料，不進判定） ───────────────── */
const red = pairs.filter((p) => p.iou >= GATE);
console.log(`\n【報告，不進判定】IoU ≥${GATE} 的配對共 ${red.length} 對（同系 ${red.filter((p) => p.sameFac).length} 對）：`);
red.forEach((p) => console.log(`   ${p.iou.toFixed(4)} ${p.a.padEnd(9)} ${p.b.padEnd(9)} ${p.sameFac ? '同系 ' + p.facA : '跨系 ' + p.facA + '/' + p.facB}`));
if (LIST) { console.log('\n【全部 435 對】'); pairs.forEach((p) => console.log(`   ${p.iou.toFixed(4)} ${p.a.padEnd(9)} ${p.b.padEnd(9)} ${p.sameFac ? '同系' : '跨系'}`)); }

console.log(`\n結果：${pass} 綠 ／ ${fail} 紅`);
void fs; void path; void fileURLToPath; void FAC;
process.exit(fail ? 1 : 0);

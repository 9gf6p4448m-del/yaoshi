/* 招式特效語彙的單元測試（v0.55 招式可辨性卷，凍結檔 L12）。
   跑法：node tests/fxvocab.test.mjs

   它在守什麼：**文件寫了一套、`vocab.js` 是另一套**。這一卷整個的病因就是「語彙沒有單一事實來源」，
   所以 `docs/experiments/2026-09-11-fx-vocab.md`（人類讀的）與 `js/trait-fx/vocab.js`（程式讀的）
   必須逐項相同，不一致判紅。ART_BIBLE §10 是設計理由的權威，不進機械比對（它是散文）。

   ★鑑別力★：`--mutate=<n>` 會在記憶體裡把 `vocab.js` 的第 n 種東西改掉再跑，預期紅。
     1 = 改一個 EMBLEM_OF 的 kind（雙射被破壞＋與文件不符）
     2 = 改一個 FX_PAL 色碼
     3 = 改一個 BEAT 時窗
   原檔全程唯讀（讀進字串後在記憶體裡改），不做反向 sed。

   為什麼不 import emblems.js：它 `import * as THREE from 'three'`，node 端沒有 importmap。
   所以徽記那一段改成**讀原始碼**數 kind 與頂點數——量的仍是同一份檔案。 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FX_PAL, BEAT_FRAC, beatOf, ICON, PHASE_GATE, EMBLEM_OF, DEPRECATED, RETIRED_BY_FAC } from '../js/trait-fx/vocab.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const DOC = path.join(ROOT, 'docs/experiments/2026-09-11-fx-vocab.md');
const EMB = path.join(ROOT, 'js/trait-fx/emblems.js');
const argv = process.argv.slice(2);
const MUT = (() => { const a = argv.find((x) => x.startsWith('--mutate=')); return a ? parseInt(a.slice(9), 10) : 0; })();

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('  PASS  ' + name); } catch (e) { fail++; console.log('  FAIL  ' + name + ' — ' + e.message); } };
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}：得到 ${JSON.stringify(a)}，預期 ${JSON.stringify(b)}`); };

/* 突變體：只動記憶體裡的副本 */
const PAL = JSON.parse(JSON.stringify(FX_PAL));
const BT = { 1: beatOf(1, 260), 2: beatOf(2, 900), 3: beatOf(3, 1400) }; // 三個總長來自文件第 2 節的「總長」欄，下面逐格比對
const EO = Object.assign({}, EMBLEM_OF);
if (MUT === 1) EO.eliteSelfCut = 'sun'; // 與 eliteOpenShot 撞 kind ⇒ 雙射破了
if (MUT === 2) PAL.xianghuo.key = 0xf08060; // 退回舊的淡橘粉
if (MUT === 3) BT[1].travel = [90, 200]; // 時窗與文件分岔
if (MUT) console.log(`★突變模式 ${MUT}：以下必須有紅★`);

const doc = fs.readFileSync(DOC, 'utf8');
const embSrc = fs.readFileSync(EMB, 'utf8');
console.log(`語彙對齊 L12：${path.relative(ROOT, DOC)} ↔ js/trait-fx/vocab.js ↔ js/trait-fx/emblems.js`);

/** 從文件裡撈出「以 | 開頭、欄位用 `` 包住」的表格列 */
function rows(startsWith) {
  return doc.split(/\r?\n/).filter((l) => l.startsWith('| `' + startsWith)).map((l) => l.split('|').map((c) => c.trim()).slice(1, -1));
}
function tick(s) { const m = String(s).match(/^`(.*)`$/); if (!m) throw new Error(`欄位沒有用 \` 包住：${s}`); return m[1]; }
const hex = (n) => '0x' + n.toString(16).padStart(6, '0');

/* ── 1. 色票（FX_PAL）────────────────────────────────────────────── */
t('FX_PAL 三系四色與文件第 1 節逐格相同', () => {
  const lines = rows('zuling`').concat(rows('xianghuo`'), rows('yinqi`'));
  eq(lines.length, 3, '文件第 1 節的列數');
  lines.forEach((r) => {
    const fac = tick(r[0]);
    const p = PAL[fac];
    if (!p) throw new Error(`vocab.js 沒有系別 ${fac}`);
    ['key', 'hot', 'line', 'ink'].forEach((k, i) => eq(hex(p[k]), tick(r[i + 1]), `${fac}.${k}`));
  });
  eq(Object.keys(PAL).sort().join(','), 'xianghuo,yinqi,zuling', 'FX_PAL 的系別集合');
});

/* ── 2. 節拍表（BEAT）───────────────────────────────────────────── */
t('BEAT 三級四段與文件第 2 節逐格相同', () => {
  const lines = [1, 2, 3].map((k) => { const r = rows(k + '`'); if (!r.length) throw new Error(`文件缺 tier ${k}`); return r[0]; });
  lines.forEach((r, i) => {
    const tier = i + 1;
    const b = BT[tier];
    ['windup', 'travel', 'react', 'settle'].forEach((seg, j) => eq(b[seg].join('-'), tick(r[j + 2]), `BEAT[${tier}].${seg}`));
    eq(String(b.settle[1]), r[1], `tier ${tier} 的總長`);
  });
});

t('BEAT_FRAC 是比例不是毫秒（三級各三個切點、遞增、都 <1）', () => {
  eq(Object.keys(BEAT_FRAC).sort().join(','), '1,2,3', 'BEAT_FRAC 的 tier 集合');
  for (const k of [1, 2, 3]) {
    const f = BEAT_FRAC[k];
    eq(f.length, 3, `tier ${k} 的切點數`);
    if (!(f[0] > 0 && f[0] < f[1] && f[1] < f[2] && f[2] < 1)) throw new Error(`tier ${k} 的切點不是遞增的 (0,1) 區間值：${f}`);
  }
  // 分岔防線：vocab.js 裡不得再出現任何三級時長的字面值（那是 PW_FX 的專屬）
  const src = fs.readFileSync(path.join(ROOT, 'js/trait-fx/vocab.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  for (const n of ['260', '900', '1400']) {
    if (new RegExp('\\b' + n + '\\b').test(src)) throw new Error(`vocab.js 出現招式時長字面值 ${n}（唯一來源是 index.html 的 PW_FX.TRAIT_MS_BY_TIER）`);
  }
});

/* ── 3. 因果三段門檻（PHASE_GATE）──────────────────────────────── */
t('PHASE_GATE 的六個數字都出現在文件第 3 節', () => {
  const sec = doc.slice(doc.indexOf('## 3.'), doc.indexOf('## 4.'));
  [PHASE_GATE.windupMs, PHASE_GATE.windupBone, PHASE_GATE.windupModel, PHASE_GATE.travelFrac, PHASE_GATE.reactMs, PHASE_GATE.reactDelta]
    .forEach((v) => { if (!sec.includes('`' + v + '`')) throw new Error(`文件第 3 節沒有 \`${v}\``); });
});

/* ── 4. 徽記對照表：雙射 ＋ 與文件逐列相同 ──────────────────────── */
t('EMBLEM_OF 是 trId ↔ kind 的雙射，30 對', () => {
  const ids = Object.keys(EO), kinds = Object.values(EO);
  eq(ids.length, 30, 'trId 數（27 支招＋三尊）');
  eq(new Set(kinds).size, 30, '相異 kind 數（有重複＝雙射破了）');
});
t('EMBLEM_OF 與文件第 4 節逐列相同（trId／系／kind）', () => {
  const lines = doc.split(/\r?\n/).filter((l) => /^\| `[A-Za-z0-9]+` \| /.test(l) && l.split('|').length === 6)
    .map((l) => l.split('|').map((c) => c.trim()).slice(1, -1))
    .filter((r) => /^`(zuling|xianghuo|yinqi)`$/.test(r[2]));
  eq(lines.length, 30, '文件第 4 節的列數');
  const seen = new Set();
  lines.forEach((r) => {
    const id = tick(r[0]), kind = tick(r[3]);
    if (seen.has(id)) throw new Error(`文件裡 ${id} 出現兩次`);
    seen.add(id);
    eq(EO[id], kind, `${id} 的 kind`);
  });
  Object.keys(EO).forEach((id) => { if (!seen.has(id)) throw new Error(`vocab.js 有 ${id}，文件第 4 節沒有`); });
});

/* ── 5. 剪影：kind 集合相同、頂點數 ≤24 ─────────────────────────── */
t('emblems.js 的 kind 集合等於 EMBLEM_OF 的 kind 集合', () => {
  const body = embSrc.slice(embSrc.indexOf('export const EMBLEM = {'), embSrc.indexOf('export const KINDS'));
  const keys = Array.from(body.matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)).map((m) => m[1]);
  const want = Object.values(EO).sort();
  eq(keys.slice().sort().join(','), want.join(','), 'kind 集合');
});
t('每個 kind 的外框頂點 ≤24（ART_BIBLE §10.2 第 3 條）', () => {
  const body = embSrc.slice(embSrc.indexOf('export const EMBLEM = {'), embSrc.indexOf('export const KINDS'));
  const bad = [];
  // 只查手寫成陣列字面值的那些（star()／jag()／poly() 產的在 emblemStats() 裡由治具查）
  for (const m of body.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*(?:\{\s*o:\s*)?\[([^\]]*)\]/gm)) {
    const n = m[2].split(',').filter((s) => s.trim() !== '').length / 2;
    if (n > 24) bad.push(`${m[1]}=${n}`);
    if (n < 3) bad.push(`${m[1]}=${n}（不足以構成多邊形）`);
  }
  if (bad.length) throw new Error('頂點數越界：' + bad.join(' '));
  // 文件第 4 節結尾寫死的那個上限也要對得上
  if (!doc.includes('≤ `24` 個外框頂點')) throw new Error('文件第 4 節的頂點上限字樣改了');
});

/* ── 6. ICON 與退役清單 ────────────────────────────────────────── */
t('ICON 四個欄位與文件第 5 節相同', () => {
  const sec = doc.slice(doc.indexOf('## 5.'), doc.indexOf('## 6.'));
  ['size', 'outlineW', 'billboardTiltDeg', 'markSize'].forEach((k) => {
    if (!sec.includes('| `' + k + '` | `' + ICON[k] + '` |')) throw new Error(`文件第 5 節的 ${k} 不是 ${ICON[k]}`);
  });
});
t('DEPRECATED／RETIRED_BY_FAC 與文件第 6 節相同', () => {
  const sec = doc.slice(doc.indexOf('## 6.'));
  Object.keys(DEPRECATED).forEach((k) => {
    if (!sec.includes('| `' + k + '` | `' + DEPRECATED[k].scope + '` |')) throw new Error(`文件第 6 節的 ${k} 不是 ${DEPRECATED[k].scope}`);
  });
  Object.keys(RETIRED_BY_FAC).forEach((f) => {
    if (!sec.includes('`' + f + '` = `' + RETIRED_BY_FAC[f].join(',') + '`')) throw new Error(`文件第 6 節的 ${f} 退役清單不符`);
  });
});

/* ── 7. 分岔防線：三個系別檔不得再出現色碼字面值（批 0 只約束改過的招）── */
t('vocab.js 自己不含 TODO／佔位', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/trait-fx/vocab.js'), 'utf8');
  if (/TODO|FIXME|0x000000/.test(src)) throw new Error('vocab.js 裡有 TODO／FIXME／佔位色');
});

console.log(`\n結果：${pass} 綠 ／ ${fail} 紅`);
process.exit(fail ? 1 : 0);

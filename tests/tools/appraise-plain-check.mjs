// #11(j) 逐字比對：產品字串 vs 使用者簽收版白話對照表（docs/experiments/2026-09-28-appraise-c/plain-copy-signed.md）
// 凍結：docs/experiments/2026-09-28-acceptance-appraise-panels.md 修訂 #11(j)（2026-09-29 簽收）。
// 比三組：
//   ①「標下它：」白話句 32 句：簽收表每一列的「標下它：白話句」欄 === 產品 APPR_PLAIN[名稱]；
//      另驗件數＝實際會上拍賣桌的 POOL＋CURSES 全部名稱（多、少、名稱對不上都算差）。
//   ②卡面／註解修訂 5 條（1、2、3、3a、3b）：簽收表「新字串」逐字出現在 index.html 原始碼、「現行字串」不再出現。
//      1、2 另驗 TRAITS 的 desc 執行期值（template 以外的字串原樣比）。
//   ③「對你而言」提示句：雙虎合陣 2 句（簽收版 1 表後）＝產品 APPR_TWIN；其餘 4 個樣板（簽收版 2，
//      docs/experiments/2026-09-28-appraise-c/plain-copy-signed-2.md）＝產品 APPR_YOU_TPL（樣板本身逐字，{…} 原樣）。
// 差 0 ＝ ①②③ 全部逐字相同。任何一處讀不到一律算差。
// 用法：node tests/tools/appraise-plain-check.mjs [index.html] [--out <json>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? args[outIdx + 1] : null;
const HTML = path.resolve(args.find((a, k) => !a.startsWith('--') && (outIdx < 0 || k !== outIdx + 1)) || path.join(HERE, 'index.html'));
const SIGNED = path.join(HERE, 'docs/experiments/2026-09-28-appraise-c/plain-copy-signed.md');
const SIGNED2 = path.join(HERE, 'docs/experiments/2026-09-28-appraise-c/plain-copy-signed-2.md');

const md = fs.readFileSync(SIGNED, 'utf8').replace(/\r\n/g, '\n');
const src = fs.readFileSync(HTML, 'utf8').replace(/\r\n/g, '\n');
const cells = (l) => l.split('|').map((s) => s.trim());

// ── 簽收表 ──
const tableSec = md.split('## 對照表')[1].split('## 對你而言提示句')[0];
const plainRows = tableSec.split('\n').filter((l) => /^\| \d+ \|/.test(l)).map(cells).map((c) => ({ no: c[1], name: c[2], sentence: c[6] }));
const revSec = md.split('## 卡面文字修訂')[1];
const revRows = revSec.split('\n').filter((l) => /^\| \d+[ab]? \|/.test(l)).map(cells).map((c) => ({ id: c[1], target: c[2], cur: c[3], neu: c[5] }));
const hintSec = md.split('## 對你而言提示句')[1].split('## 卡面文字修訂')[0];
const hintRows = hintSec.split('\n').filter((l) => /^\| (虎爺印|虎姑婆指甲) \|/.test(l)).map(cells).map((c) => ({ item: c[1], has: c[2], sentence: c[3] }));

// ── 產品：把 <script> 跑起來取 APPR_PLAIN／POOL／CURSES／TRAITS（同 tests/tools/load.mjs 的做法） ──
const code = src.match(/<script>[\s\S]*?<\/script>/)[0].replace('<script>', '').replace('</script>', '');
const stub = `const location={search:''};const localStorage={getItem(){return null;},setItem(){}};
  const document={getElementById:()=>null,addEventListener:()=>{},querySelectorAll:()=>[],title:'',documentElement:{style:{}},body:{style:{},cssText:'',innerHTML:''}};
  const window={};`;
let P = null, loadErr = null;
try {
  P = new Function('URLSearchParams', 'Math', 'JSON', 'Object', 'Array', 'Set', 'Date', 'String', 'Number',
    stub + code + '\nreturn { APPR_PLAIN: typeof APPR_PLAIN!=="undefined"?APPR_PLAIN:null, APPR_TWIN: typeof APPR_TWIN!=="undefined"?APPR_TWIN:null, APPR_YOU_TPL: typeof APPR_YOU_TPL!=="undefined"?APPR_YOU_TPL:null, POOL, CURSES, TRAITS };')(URLSearchParams, Math, JSON, Object, Array, Set, Date, String, Number);
} catch (e) { loadErr = e.message; }

const diffs = [];
const plainRes = [];
if (!P || !P.APPR_PLAIN) diffs.push('產品讀不到 APPR_PLAIN' + (loadErr ? '：' + loadErr : ''));
else {
  for (const r of plainRows) {
    const got = P.APPR_PLAIN[r.name];
    const ok = got === r.sentence;
    plainRes.push({ no: r.no, name: r.name, ok });
    if (!ok) diffs.push(`①#${r.no} ${r.name}：產品 ${JSON.stringify(got)} ≠ 簽收 ${JSON.stringify(r.sentence)}`);
  }
  const want = new Set([...P.POOL.map((x) => x.n), ...P.CURSES.map((x) => x.n)]);
  const signed = new Set(plainRows.map((r) => r.name));
  for (const n of want) if (!signed.has(n)) diffs.push(`①上拍賣桌的「${n}」簽收表沒有`);
  for (const n of signed) if (!want.has(n)) diffs.push(`①簽收表的「${n}」不在 POOL／CURSES`);
  for (const n of Object.keys(P.APPR_PLAIN)) if (!signed.has(n)) diffs.push(`①產品多了一句「${n}」（簽收表沒有）`);
  if (plainRows.length !== 32) diffs.push(`①簽收表句數 ${plainRows.length} ≠ 32`);
}
const revRes = [];
for (const r of revRows) {
  const hasNew = src.split(r.neu).length - 1, hasCur = src.split(r.cur).length - 1;
  const f = [];
  if (hasNew !== 1) f.push(`新字串在原始碼出現 ${hasNew} 次（應 1）`);
  if (hasCur !== 0 && !r.neu.includes(r.cur)) f.push(`現行字串仍出現 ${hasCur} 次`);
  if (r.id === '1' && P && P.TRAITS.swarmFeed1.desc !== r.neu) f.push(`TRAITS.swarmFeed1.desc 執行期值不符：${P.TRAITS.swarmFeed1.desc}`);
  if (r.id === '2' && P && P.TRAITS.swarmLastStand.desc !== r.neu) f.push(`TRAITS.swarmLastStand.desc 執行期值不符：${P.TRAITS.swarmLastStand.desc}`);
  revRes.push({ id: r.id, ok: !f.length, f });
  if (f.length) diffs.push(`②#${r.id}：${f.join('；')}`);
}
if (revRows.length !== 5) diffs.push(`②簽收表修訂條數 ${revRows.length} ≠ 5`);
const hintRes = hintRows.map((h) => {
  const got = P && P.APPR_TWIN ? P.APPR_TWIN[h.item + '|' + h.has] : undefined, ok = got === h.sentence;
  if (!ok) diffs.push(`③合陣句 ${h.item}（袋中 ${h.has}）：產品 ${JSON.stringify(got)} ≠ 簽收 ${JSON.stringify(h.sentence)}`);
  return { item: h.item, present: ok };
});
if (hintRows.length !== 2) diffs.push(`③簽收合陣句 ${hintRows.length} ≠ 2`);
/* 簽收版 2：「N. 名稱：「樣板」」；樣板內可含「」（連鎖名），取第一個「到最後一個」（後面可接（註）） */
const md2 = fs.readFileSync(SIGNED2, 'utf8').replace(/\r\n/g, '\n');
const KEY = { '共鳴啟動': 'resOn', '共鳴升級': 'resUp', '盯上': 'mark' };
const tplRes = [];
for (const l of md2.split('\n')) {
  const m = l.match(/^\d+\. ([^：]+)：「(.*)」(?:（[^）]*）)?\s*$/); if (!m) continue;
  const key = KEY[m[1]] || (/連鎖/.test(m[1]) ? 'chain' : null);
  const got = P && P.APPR_YOU_TPL && key ? P.APPR_YOU_TPL[key] : undefined, ok = got === m[2];
  tplRes.push({ name: m[1], key, ok });
  if (!ok) diffs.push(`③樣板「${m[1]}」：產品 ${JSON.stringify(got)} ≠ 簽收 ${JSON.stringify(m[2])}`);
}
if (tplRes.length !== 4) diffs.push(`③簽收版 2 樣板 ${tplRes.length} ≠ 4`);

const res = { html: HTML, signed: [SIGNED, SIGNED2], templates: tplRes, plain: { rows: plainRows.length, ok: plainRes.filter((x) => x.ok).length }, revisions: revRes, hints: hintRes, diffCount: diffs.length, diffs };
if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log(`①白話句 ${res.plain.ok}/${res.plain.rows} 逐字相同；②卡面修訂 ${revRes.filter((x) => x.ok).length}/${revRes.length}；③合陣句 ${hintRes.filter((h) => h.present).length}/${hintRes.length}、樣板 ${tplRes.filter((t) => t.ok).length}/${tplRes.length}`);
console.log(`差 ${diffs.length}`);
for (const d of diffs) console.log('  ' + d);
process.exitCode = diffs.length ? 1 : 0;

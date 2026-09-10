/* 等價性驗證（IMPLEMENTATION_GUIDE.md §7 的正式規程腳本化）：同一支現行 trace() 對兩份
   index.html 各跑 seeds 1..20，JSON.stringify 逐位元組比對。
   跑法：node tests/tools/trace-eq.mjs <改動前的 index.html> <改動後的 index.html>
        node tests/tools/trace-eq.mjs <index.html> --mutate   ← 突變驗紅（見下）
   美術甲卷用它驗 A9（純渲染卷，引擎必須逐位元組相等）。不相等時印出第一個差異位置與前後文。

   `--mutate`：相等性斷言本身沒有證明力——兩邊一起壞掉也會「相等」。這個模式證明這支腳本
   **抓得到差異**：把待測檔複製一份到系統暫存目錄，只改一個引擎常數（`CFG.ROUNDS` 的預設夜數），
   再拿原檔對這份突變體跑同一組 seeds，**預期 exit 1（不相等）**。原檔全程唯讀、一個位元組都不動，
   所以「還原」就是把暫存的突變體刪掉——不做反向 sed（`02 §6.1` 第 1 條）。 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadGame } from './load.mjs';

const argv = process.argv.slice(2);
if (argv[1] === '--mutate') {
  const src = argv[0];
  const txt = fs.readFileSync(src, 'utf8');
  const m = txt.match(/ROUNDS\s*:\s*(\d+)/);
  if (!m) { console.error('找不到 CFG.ROUNDS，無法做突變驗紅'); process.exit(2); }
  const before = Number(m[1]);
  const mutated = txt.replace(/ROUNDS\s*:\s*\d+/, 'ROUNDS: ' + (before - 1));
  const tmp = path.join(os.tmpdir(), 'trace-eq-mutant-' + process.pid + '.html');
  fs.writeFileSync(tmp, mutated, 'utf8');
  try {
    const seeds0 = Array.from({ length: 20 }, (_, i) => i + 1);
    const a = JSON.stringify(loadGame(src).trace(seeds0));
    const b = JSON.stringify(loadGame(tmp).trace(seeds0));
    const differs = a !== b;
    console.log(JSON.stringify({ mode: 'mutate', src, mutant: tmp, mutation: `CFG.ROUNDS ${before} -> ${before - 1}`,
      bytesSrc: a.length, bytesMutant: b.length, differs, verdict: differs ? '突變驗紅 ✅（這支腳本抓得到引擎差異）' : '突變沒驗紅 ❌（相等性斷言不可信）' }));
    process.exit(differs ? 0 : 1);
  } finally { fs.rmSync(tmp, { force: true }); } // 原檔沒動過，「還原」＝刪掉暫存突變體
}

/* ★R1 覆審 H7：`--beats` 模式★
   凍結檔自己列的假綠條件是「trace 沒把 war.beats 的 kind/side/trId 全部序列化」——而它**本來就成立**：
   simulate() 的 battles 只有 aId/bId/pa/pb/winnerId/dmg/extra，拍內事件一個欄位都沒進去。
   也就是說預設的 trace-eq 證明的是「勝負與扣血沒變」，不是「拍序列沒變」。
   做法：**對 old 與 new 做同一個注入**（把 battles 那一段加上 beats 摘要）產生兩份暫存副本再比。
   為什麼不直接改 index.html：加了欄位，預設的 trace-eq 就會因為新版多欄位而不相等，
   反而把 F0 的主判定弄壞；而且注入是對稱的，兩邊拿到的是同一段程式碼。
   只序列化 [beat, kind, side, trId, target]——**不含任何演出欄位**（tier／ms 都不進去），
   所以它量的純粹是引擎產出的拍序列。 */
const BEATS_ANCHOR = 'const battles=R.fights.map(f=>({';
const BEATS_INJECT = 'const battles=R.fights.map(f=>({ beats:(f.war&&f.war.beats)?f.war.beats.map(b=>[b.beat,b.kind,b.side||"",b.trId||"",b.target==null?-1:b.target]):null,';
function injectBeats(src) {
  const txt = fs.readFileSync(src, 'utf8');
  if (!txt.includes(BEATS_ANCHOR)) throw new Error(`${src} 找不到注入點（引擎結構變了就要更新這支治具，不得靜默跳過）`);
  const tmp = path.join(os.tmpdir(), 'trace-eq-beats-' + process.pid + '-' + path.basename(src));
  fs.writeFileSync(tmp, txt.replace(BEATS_ANCHOR, BEATS_INJECT), 'utf8');
  return tmp;
}
if (argv.includes('--beats')) {
  const rest = argv.filter((x) => x !== '--beats');
  const o = rest[0], n = rest[1];
  if (!o || !n) { console.error('need <old index.html> <new index.html> --beats'); process.exit(2); }
  const to = injectBeats(o), tn = injectBeats(n);
  try {
    const seeds0 = Array.from({ length: 20 }, (_, i) => i + 1);
    const a2 = JSON.stringify(loadGame(to).trace(seeds0));
    const b2 = JSON.stringify(loadGame(tn).trace(seeds0));
    const eq = a2 === b2;
    // 活性：注入真的有效（beats 進到輸出裡了），否則兩邊都是「沒有 beats」的空相等
    const live = a2.includes('"beats":[[') && b2.includes('"beats":[[');
    console.log(JSON.stringify({ mode: 'beats', old: o, new: n, seeds: '1..20', bytesOld: a2.length, bytesNew: b2.length, equal: eq, injected: live,
      verdict: !live ? '注入沒生效 ❌（beats 沒進輸出，這個相等沒有意義）' : (eq ? '拍序列逐位元組相等 ✅' : '拍序列不同 ❌') }));
    if (!eq) {
      for (let i = 0; i < Math.max(a2.length, b2.length); i++) {
        if (a2[i] !== b2[i]) { console.log('first diff @', i, JSON.stringify(a2.slice(Math.max(0, i - 80), i + 80)), JSON.stringify(b2.slice(Math.max(0, i - 80), i + 80))); break; }
      }
    }
    process.exit(eq && live ? 0 : 1);
  } finally { fs.rmSync(to, { force: true }); fs.rmSync(tn, { force: true }); }
}

const [oldPath, newPath] = argv;
if (!oldPath || !newPath) { console.error('need <old index.html> <new index.html>'); process.exit(2); }
const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
const ja = JSON.stringify(loadGame(oldPath).trace(seeds));
const jb = JSON.stringify(loadGame(newPath).trace(seeds));
console.log(JSON.stringify({ old: oldPath, new: newPath, seeds: '1..20', bytesOld: ja.length, bytesNew: jb.length, equal: ja === jb }));
if (ja !== jb) {
  for (let i = 0; i < Math.max(ja.length, jb.length); i++) {
    if (ja[i] !== jb[i]) { console.log('first diff @', i, '\n old:', JSON.stringify(ja.slice(Math.max(0, i - 80), i + 80)), '\n new:', JSON.stringify(jb.slice(Math.max(0, i - 80), i + 80))); break; }
  }
}
process.exit(ja === jb ? 0 : 1);

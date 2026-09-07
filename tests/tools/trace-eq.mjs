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

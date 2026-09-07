/* 等價性驗證（IMPLEMENTATION_GUIDE.md §7 的正式規程腳本化）：同一支現行 trace() 對兩份
   index.html 各跑 seeds 1..20，JSON.stringify 逐位元組比對。
   跑法：node tests/tools/trace-eq.mjs <改動前的 index.html> <改動後的 index.html>
   美術甲卷用它驗 A9（純渲染卷，引擎必須逐位元組相等）。不相等時印出第一個差異位置與前後文。 */
import { loadGame } from './load.mjs';

const [oldPath, newPath] = process.argv.slice(2);
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

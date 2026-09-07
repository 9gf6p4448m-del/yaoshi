/* M0 引擎零改動的驗證（凍結檔 M0）。三件事：
   1. index.html 的 md5 與基準 SHA 的版本相同（呼叫端用 git show 產生 base.html 傳進來，或省略只印現值）
   2. trace(1..20) 的 md5
   3. 鑑別力：先載入一份實例、對它做「最重的消融」（清掉所有池角色的 hooks/traits/flags/life0d），
      再載入第二份新實例跑 trace——若消融會外洩到其他實例，第二份的 trace md5 就會變。
      同時印出「被消融的那一份自己的 trace md5」證明消融確實會改變 trace（反面：這個探針不是恆綠的）。
   用法：node tests/tools/role-measure-m0.mjs [baseHtmlPath]
*/
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const INDEX = path.join(ROOT, 'index.html');
const {loadGame} = await import('file:///' + path.join(HERE, 'load.mjs').replace(/\\/g, '/'));

const md5 = s => crypto.createHash('md5').update(s).digest('hex');
const seeds = Array.from({length: 20}, (_, i) => i + 1);
const traceHash = G => md5(JSON.stringify(G.trace(seeds)));

/* git show 會把 CRLF 正規化成 LF，工作區的 index.html 是 CRLF ⇒ 位元組 md5 必然不同。
   要比的是「內容」，所以兩邊都先把行尾正規化成 LF 再 md5。 */
const norm = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
console.log('現行 index.html md5(LF)  = ' + md5(norm(INDEX)));
const base = process.argv[2];
if (base) {
  console.log('基準 index.html md5(LF)  = ' + md5(norm(base)));
  console.log('  → 兩者' + (md5(norm(base)) === md5(norm(INDEX)) ? '相同 ✅ 引擎零改動' : '不同 ❌'));
  console.log('  基準 trace(1..20) md5   = ' + traceHash(loadGame(base)));
}

const clean1 = traceHash(loadGame(INDEX));
console.log('trace(1..20) md5（乾淨）  = ' + clean1);

/* 重度消融一份實例 */
const Gx = loadGame(INDEX);
for (const k of Object.keys(Gx.ROLES)) {
  if (!Gx.ROLES[k].pool) continue;
  Gx.ROLES[k].hooks = {}; Gx.ROLES[k].traits = {}; Gx.ROLES[k].flags = []; Gx.ROLES[k].life0d = 0;
}
const ablated = traceHash(Gx);
console.log('trace(1..20) md5（消融後）= ' + ablated + '  ' + (ablated !== clean1 ? '✅ 消融確實會改變 trace（探針有鑑別力）' : '❌ 消融沒改變 trace ⇒ 這個探針量不到東西'));

const clean2 = traceHash(loadGame(INDEX));
console.log('trace(1..20) md5（消融後再載一份新實例）= ' + clean2 + '  ' + (clean2 === clean1 ? '✅ 記憶體覆寫不外洩' : '❌ 外洩到其他實例'));


console.log('跑完之後 index.html md5(LF)= ' + md5(norm(INDEX)));

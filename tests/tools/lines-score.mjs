// A3 S4 讀者評分：node tests/tools/lines-score.mjs <key.json> <reader-*.json ...>
// 每題以「同型＋同說話者」的可接受集合判對；門檻（凍結 #8）：每題 ≥4/6 讀者答對。
import fs from 'node:fs';
const [keyPath, ...readerPaths] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
const readers = readerPaths.map((p) => JSON.parse(fs.readFileSync(p, 'utf8')));
let passItems = 0; const rows = [];
for (const k of key) {
  const votes = readers.map((r) => r.answers[k.id]);
  const ok = votes.filter((v) => k.acceptable.includes(v)).length;
  const pass = ok >= 4;
  if (pass) passItems++;
  rows.push({ id: k.id, type: k.type, role: k.role, correct: `${ok}/${readers.length}`, votes, acceptable: k.acceptable, pass });
  console.log(`${k.id} ${k.label.padEnd(6)} ${k.role.padEnd(9)} ${ok}/${readers.length} ${pass ? 'ok' : 'FAIL'}  votes ${votes.join(',')}  acceptable ${k.acceptable.join('/')}`);
}
const perReader = readers.map((r) => key.filter((k) => k.acceptable.includes(r.answers[k.id])).length);
console.log(`items pass ${passItems}/${key.length}; per reader ${perReader.map((n) => n + '/' + key.length).join(' ')}`);
if (process.argv.includes('--json')) fs.writeFileSync(keyPath.replace(/key/, 'score'), JSON.stringify({ items: rows, passItems, total: key.length, perReader }, null, 2));
process.exit(passItems === key.length ? 0 : 1);

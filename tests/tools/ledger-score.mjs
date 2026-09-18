// A3 S5 讀者評分：node tests/tools/ledger-score.mjs <key.json> <reader-*.json ...> [--json]
// 讀者檔格式：{ answers: { g01: { winner: "南家・閭山法師", cause: 2 }, ... } }
// 門檻（凍結 #9）：每題「勝者」與「主因」都與口徑一致的讀者 ≥2/3；全部題都過才算過。
import fs from 'node:fs';
const args = process.argv.slice(2);
const [keyPath, ...readerPaths] = args.filter((a) => !a.startsWith('--'));
const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
const readers = readerPaths.map((p) => JSON.parse(fs.readFileSync(p, 'utf8')));
const norm = (s) => String(s || '').replace(/\s+/g, '').replace(/家・/, '・');
let passItems = 0; const rows = [];
for (const k of key) {
  const votes = readers.map((r) => (r.answers && r.answers[k.id]) || {});
  const okW = votes.filter((v) => norm(v.winner) === norm(k.winnerName) || norm(v.winner) === norm(k.winnerName.split('・')[1])).length;
  const okC = votes.filter((v) => Number(v.cause) === k.cause).length;
  const okBoth = votes.filter((v) => (norm(v.winner) === norm(k.winnerName) || norm(v.winner) === norm(k.winnerName.split('・')[1])) && Number(v.cause) === k.cause).length;
  const need = Math.ceil(readers.length * 2 / 3);
  const pass = okBoth >= need;
  if (pass) passItems++;
  rows.push({ id: k.id, seed: k.seed, winner: `${okW}/${readers.length}`, cause: `${okC}/${readers.length}`, both: `${okBoth}/${readers.length}`, pass, votes });
  console.log(`${k.id} seed ${String(k.seed).padStart(2)}  winner ${okW}/${readers.length}  cause ${okC}/${readers.length}  both ${okBoth}/${readers.length}  ${pass ? 'ok' : 'FAIL'}  votes ${votes.map((v) => `${v.winner || '?'}#${v.cause || '?'}`).join(' | ')}  key ${k.winnerName}#${k.cause}`);
}
console.log(`items pass ${passItems}/${key.length}`);
if (args.includes('--json')) fs.writeFileSync(keyPath.replace(/key/, 'score'), JSON.stringify({ items: rows, passItems, total: key.length }, null, 2));
process.exit(passItems === key.length ? 0 : 1);

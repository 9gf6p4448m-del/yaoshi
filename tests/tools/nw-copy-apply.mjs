/* 夜行錄第 4–6 章文案套用工具（凍結 docs/experiments/2026-10-11-acceptance-n1-ch4-6.md #7）。
   把 copy-r2.json 的 v1／v2 寫進 index.html 內 NIGHTWALK 陣列尾端的標記區間，區間外一個位元組都不動。
   跑法：node tests/tools/nw-copy-apply.mjs <v1|v2> <來源 index.html> <輸出 index.html> [copy-r2.json]
   來源沒有標記時，插入在 NIGHTWALK 陣列結尾 `];` 之前；有標記時只換區間內容（冪等）。來源與輸出可同一路徑。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BEGIN = '/*NW-COPY-4-6 BEGIN*/', END = '/*NW-COPY-4-6 END*/';
export function render(copy, ver) {
  const rows = copy.chapters.map((c) => {
    const v = c[ver];
    if (!v) throw new Error(`第 ${c.n} 章沒有 ${ver} 版`);
    const j = JSON.stringify;
    return `  {n:${c.n},title:${j(c.title)},boss:${j(c.boss)},rules:${j(c.rules).replace(/"(\w+)":/g, '$1:')},\n`
      + `   intro:${j(v.intro)},\n   teach:${j(v.teach)},\n`
      + `   feud:${j(v.feud).replace(/"(open|bossLose|bossWin)":/g, '$1:')},\n`
      + `   scroll:${j(v.scroll).replace(/"(title|text)":/g, '$1:')}},`;
  });
  return [`  ${BEGIN}`, ...rows, `  ${END}`];
}
export function apply(src, ver, copy) {
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const lines = src.split(eol);
  const block = render(copy, ver).join('\n').split('\n'); /* render 內部以 \n 分行；統一拆開再用來源的換行符接，避免混用 CRLF／LF */
  const b = lines.findIndex((l) => l.includes(BEGIN)), e = lines.findIndex((l) => l.includes(END));
  if (b >= 0 && e > b) return [...lines.slice(0, b), ...block, ...lines.slice(e + 1)].join(eol);
  if (b >= 0 || e >= 0) throw new Error('標記不成對');
  const start = lines.findIndex((l) => l.startsWith('const NIGHTWALK=['));
  if (start < 0) throw new Error('找不到 NIGHTWALK');
  const close = lines.findIndex((l, i) => i > start && l === '];');
  if (close < 0) throw new Error('找不到 NIGHTWALK 結尾');
  return [...lines.slice(0, close), ...block, ...lines.slice(close)].join(eol);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [ver, srcP, outP, copyP] = process.argv.slice(2);
  if (!['v1', 'v2'].includes(ver) || !srcP || !outP) { console.error('用法：node tests/tools/nw-copy-apply.mjs <v1|v2> <src> <out> [copy-r2.json]'); process.exit(2); }
  const copy = JSON.parse(fs.readFileSync(copyP || path.join(ROOT, 'docs/experiments/2026-10-11-n1-ch4-6/copy-r2.json'), 'utf8'));
  fs.writeFileSync(outP, apply(fs.readFileSync(srcP, 'utf8'), ver, copy), 'utf8');
  console.log(`已套用 ${ver} → ${outP}`);
}

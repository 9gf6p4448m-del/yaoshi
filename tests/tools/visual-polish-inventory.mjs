// 把 visual-polish-probe 的輸出整理成盤點表（凍結 docs/experiments/2026-09-25-acceptance-visual-polish.md #1–#6）。
// 用法：node tests/tools/visual-polish-inventory.mjs <probe-json> <輸出前綴>   例：... probe-base-e29a753.json inventory-base
import fs from 'node:fs';
import path from 'node:path';

const [src, prefix] = process.argv.slice(2);
const R = JSON.parse(fs.readFileSync(src, 'utf8'));
const dir = path.dirname(path.resolve(src));
const S = R.summary;
const NAME = { breaks: '#1 斷行位置', spill: '#2 文字不越框', font: '#3 字級 ≥10px', contrast: '#4 對比', target: '#5 觸控目標 ≥40×40', align: '#6 同列對齊 ≤2px' };
const VPS = ['V1', 'V2', 'V3', 'V4', 'V5'];
const exFmt = {
  breaks: (x) => `「${x.lines}」 斷在 ${x.at}${x.exc ? '（凍結點名例外）' : ''}${x.sentence ? '（句子，非短標籤，不計）' : ''}`,
  spill: (x) => `加嚴版超出 ${x.raw}px（${x.rawSide}）／字面版 ${x.px}px（${x.side}）「${x.text}」`,
  font: (x) => `${x.px}px「${x.text}」`,
  contrast: (x) => `${x.ratio}:1 < ${x.need}（字 rgb(${x.fg}) 底 rgb(${x.bg})${x.op < 1 ? ` opacity ${x.op}` : ''}）「${x.text}」${x.inactive ? '〔disabled，WCAG 豁免〕' : ''}${x.transient ? '〔演出暫態〕' : ''}${x.burnt ? '〔已燒毀籌碼〕' : ''}`,
  target: (x) => `命中 ${x.w}×${x.h}（框 ${x.box.join('×')}）「${x.text}」`,
  align: (x) => `${x.transient ? '〔演出暫態〕' : ''}上緣差 ${x.dt}・下緣差 ${x.db}・高度差 ${x.dh}｜${x.els.join('；')}`,
};
const out = { src: path.basename(src), tag: R.tag, cells: S.cells, lost: S.lost, pageErrors: R.pageErrors, cond: {} };
let md = `# 盤點：${R.tag}\n\n來源 \`${path.basename(src)}\`；${S.cells} 格（畫面鍵×視口）；lost ${S.lost.length}（${S.lost.join('、') || '無'}）；pageerror ${Object.values(R.pageErrors).reduce((a, v) => a + v.length, 0)}。\n\n`;
md += '| 條件 | ' + VPS.join(' | ') + ' | 項數 |\n|---|' + VPS.map(() => '---').join('|') + '|---|\n';
for (const [k, c] of Object.entries(S.byCond)) {
  md += `| ${NAME[k]} | ` + VPS.map((v) => c.byVp[v] ? `${c.byVp[v].redCellsNoExc}/${c.byVp[v].cells}` : '—').join(' | ') + ` | ${Object.keys(c.items).length} |\n`;
}
md += '\n格數＝「含非例外紅項的格／總格」（例外＝凍結點名的刻意兩行、句子（說明文）、disabled 元件、演出暫態；照列於下但不計紅）。\n';
if (S.spillDiag) md += `\n#2 判定採加嚴版（字的 content area 對容器框線內緣 >1px；嚴於字面版）。字面版（em 框對容器外框 >1px）對照格數：` + VPS.map((v) => S.spillDiag.byVp[v] ? `${v} ${S.spillDiag.byVp[v].redCells}/${S.spillDiag.byVp[v].cells}` : '').join('、') + '\n';
for (const [k, c] of Object.entries(S.byCond)) {
  const items = Object.values(c.items).sort((a, b) => b.n - a.n);
  out.cond[k] = items.map((I) => ({ key: I.key, n: I.n, ex: I.ex, where: I.where }));
  md += `\n## ${NAME[k]}（${items.length} 項）\n\n`;
  if (!items.length) { md += '無。\n'; continue; }
  md += '| 項 | 次數 | 例 | 出現（前 6） |\n|---|---|---|---|\n';
  for (const I of items) {
    const vps = VPS.filter((v) => I.where.some((w) => w.endsWith('@' + v)));
    md += `| \`${I.key.replace(/\|/g, '\\|')}\` | ${I.n} | ${exFmt[k](I.ex).replace(/\|/g, '\\|')} | ${vps.join(' ')}；${I.where.slice(0, 6).join('、').replace(/\|/g, '/')} |\n`;
  }
}
if (S.spillDiag) {
  const items = Object.values(S.spillDiag.items).sort((a, b) => b.max - a.max);
  out.spillDiag = items;
  md += `\n## #2 對照：字面版（em 框對容器外框，${items.length} 項）\n\n| 項 | 次數 | 最大 | 出現（前 6） |\n|---|---|---|---|\n`;
  for (const I of items.slice(0, 60)) md += `| \`${I.key.replace(/\|/g, '\\|')}\` | ${I.n} | ${I.max}px ${I.ex.side}「${I.ex.text}」 | ${I.where.slice(0, 6).join('、').replace(/\|/g, '/')} |\n`;
}
fs.writeFileSync(path.join(dir, prefix + '.json'), JSON.stringify(out, null, 1), 'utf8');
fs.writeFileSync(path.join(dir, prefix + '.md'), md, 'utf8');
console.log(md.split('\n').slice(0, 14).join('\n'));

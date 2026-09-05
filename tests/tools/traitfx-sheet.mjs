// 卷 C3（2026-09-05）：把 traitfx-drive 的三格截圖排成一張接觸表（27 列 × 3 格），給使用者與盲讀用。
// 用法：node tests/tools/traitfx-sheet.mjs <shots目錄> <out.png> [--cols=3] [--w=360]
//   讀 <shots目錄>/<trId>-{8,22,36}.png；列名＝法寶名：招名（從 index.html 的 POOL／TRAITS 反查）。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { casesFromIndex } from './traitfx-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const [dir, out] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const W = parseInt((process.argv.find((a) => a.startsWith('--w=')) || '--w=360').slice(4), 10);
if (!dir || !out) { console.error('need <shots dir> <out.png>'); process.exit(2); }
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cases = casesFromIndex(html);
const moveName = (trId) => { const m = html.match(new RegExp(`${trId}:\\{id:"${trId}",name:"([^"]+)"`)); return m ? m[1] : trId; };
const rows = cases.map((c) => {
  const imgs = [8, 22, 36].map((k) => { const f = path.join(dir, `${c.trait}-${k}.png`); return fs.existsSync(f) ? `data:image/png;base64,${fs.readFileSync(f).toString('base64')}` : null; });
  return { c, imgs };
});
const page = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#120826;color:#f0d9a0;font:13px/1.3 "Microsoft JhengHei",sans-serif}
.row{display:flex;align-items:center;gap:6px;padding:4px 8px;border-bottom:1px solid #2a1a44}
.lab{width:170px;flex:none}.lab b{display:block;font-size:14px;color:#f0a840}.lab i{color:#9a8}
img{width:${W}px;height:${Math.round(W * 405 / 720)}px;object-fit:cover;border:1px solid #333}.miss{width:${W}px;height:${Math.round(W * 405 / 720)}px;background:#311;display:flex;align-items:center;justify-content:center;color:#f66}
h1{font-size:15px;margin:8px}</style>
<h1>妖市 C3 招式接觸表 — 出招後 130／370／600ms（${new Date().toISOString().slice(0, 10)}）</h1>
${rows.map(({ c, imgs }) => `<div class="row"><div class="lab"><b>${c.name}</b>${moveName(c.trait)}<br><i>${c.trait} · ${c.ab} ${c.body}×${c.count}</i></div>${imgs.map((d) => d ? `<img src="${d}">` : '<div class="miss">缺圖</div>').join('')}</div>`).join('')}`;
const tmp = path.join(dir, '_sheet.html');
fs.writeFileSync(tmp, page);
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 170 + 3 * (W + 6) + 40, height: 900 } });
await pg.goto('file:///' + tmp.replace(/\\/g, '/'));
await pg.screenshot({ path: out, fullPage: true });
await browser.close();
fs.unlinkSync(tmp);
console.log(`${out} · ${rows.filter((r) => r.imgs.every(Boolean)).length}/${rows.length} 套齊圖`);

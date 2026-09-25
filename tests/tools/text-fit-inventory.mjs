// 把 text-fit-probe 的輸出整理成盤點表（凍結 #1 落檔＋#2 分類）。
// 用法：node tests/tools/text-fit-inventory.mjs <probe-json> <輸出前綴>   例：... probe-base-f105ea2.json inventory-base
// 產出 <前綴>.json 與 <前綴>.md：每項＝選擇器（依是否為可捲容器分開），全文／顯示文範例、出現在哪些畫面×視口、分類與理由。
import fs from 'node:fs';
import path from 'node:path';

const [src, prefix] = process.argv.slice(2);
const R = JSON.parse(fs.readFileSync(src, 'utf8'));
const dir = path.dirname(path.resolve(src));

/* 分類（凍結 #2）：規則以選擇器樣式比對，先中先得；沒有命中的一律「未分類」，報告裡會列出來（不得默默略過）。 */
const RULES = [
  { re: /headCompact/, cls: '資訊類', why: '頂列風位／月相與受惠陣營／異事名／規則名：當夜決策的公開資訊（凍結 #2 點名「夜晚資訊、月相／受惠、規則／異事名」）' },
  { re: /incboard > span\.ibgap/, cls: '資訊類', why: '香火榜「你 N・領先／落後 M」：決定燒不燒香的輸入' },
  { re: /incboard > span\.ibwhen/, cls: '資訊類', why: '請神倒數（凍結 #2 點名「請神倒數」）' },
  { re: /shname|\.shn\b/, cls: '資訊類', why: '三尊待請卡尊名（凍結 #2 點名「尊名」）' },
  { re: /shmove/, cls: '資訊類', why: '待請卡招式名：請神夜前一夜與當夜挑尊的輸入' },
  { re: /shtaken/, cls: '資訊類', why: '「已請走：X 家／已回天」：哪一尊還能請' },
  { re: /^#duel$/, cls: '資訊類', why: '紙紮夜戰字幕（拍數、名字、隻數、招式、結果）；#duel 本身 overflow:hidden，整欄比視口高時上下各被切' },
  { re: /^#nwScr$/, scroll: false, cls: '資訊類', why: '夜行錄引言卡／殘卷卡外層（intro／scroll 為 overflow-y:hidden），卡底被切 3px' },
];
const SCROLL_WHY = {
  '#felt': '牌桌中央面板（非掏空頁：揭盅結果、夜末戰況、異事、局末）＝overflow-y:auto，內容比面板高時可捲',
  '#modalbox': '規則／角色說明視窗，overflow-y:auto',
  '#review': '本局回顧整頁，overflow-y:auto',
  'railPages': '側欄拍品卡列，overflow:auto（卡角徽章外掛 3px 產生的橫向可捲量）',
  'nwBig': '夜行錄引言卡／殘卷卡本身 overflow-y:auto（按鈕列 sticky 在卡底）',
  '#nwScr': '夜行錄章節選單整層 overflow-y:auto（SE 667×375 三張章節卡排成兩列）',
};
const classify = (sel, scrollable) => {
  if (scrollable) {
    const k = Object.keys(SCROLL_WHY).find((x) => sel.includes(x)) || null;
    return { cls: '可縮寫類（可捲動）', why: k ? SCROLL_WHY[k] : '可捲容器', fullAt: '同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）' };
  }
  const r = RULES.find((x) => x.re.test(sel) && (x.scroll === undefined || x.scroll === scrollable));
  return r ? { cls: r.cls, why: r.why, fullAt: null } : { cls: '未分類', why: '', fullAt: null };
};

const items = {};
for (const [key, C] of Object.entries(R.cells)) for (const [v, cell] of Object.entries(C.vp)) for (const x of cell.items) {
  const id = x.sel + (x.scrollable ? ' [scroll]' : '');
  const I = items[id] || (items[id] = { sel: x.sel, scrollable: x.scrollable, ...classify(x.sel, x.scrollable), count: 0, examples: [], where: [], screens: {}, reach: { n: 0, ok: 0 } });
  I.count++;
  I.where.push(`${key}@${v}`);
  const scrKey = `${C.mode}|${C.cls}`;
  (I.screens[scrKey] || (I.screens[scrKey] = new Set())).add(v);
  if (I.examples.length < 5 && !I.examples.some((e) => e.full === x.full)) I.examples.push({ full: x.full, shown: x.shown, hiddenChars: x.hiddenChars, sw: x.sw, cw: x.cw, sh: x.sh, ch: x.ch, overflow: x.overflow, ellipsis: x.ellipsis, at: `${key}@${v}` });
  if (x.reach) { I.reach.n++; if (x.reach.ok) I.reach.ok++; }
}
const list = Object.values(items).map((I) => ({ ...I, screens: Object.fromEntries(Object.entries(I.screens).map(([k, s]) => [k, [...s].sort()])) }));
const cells = { total: 0, byVp: {} };
const infoRed = { total: 0, byVp: {} };
for (const [key, C] of Object.entries(R.cells)) for (const [v, cell] of Object.entries(C.vp)) {
  cells.total++; cells.byVp[v] = (cells.byVp[v] || 0) + 1;
  if (cell.items.some((x) => classify(x.sel, x.scrollable).cls !== '可縮寫類（可捲動）')) { infoRed.total++; infoRed.byVp[v] = (infoRed.byVp[v] || 0) + 1; }
}
const out = { src: path.basename(src), tag: R.tag, cells, cellsWithInfoTrunc: infoRed, itemCount: list.length,
  byClass: list.reduce((a, I) => ((a[I.cls] = (a[I.cls] || 0) + 1), a), {}), items: list, strips: R.summary.strips, lost: R.summary.lost, pageErrors: R.pageErrors };
fs.writeFileSync(path.join(dir, prefix + '.json'), JSON.stringify(out, null, 1), 'utf8');

const esc = (s) => String(s).replace(/\|/g, '｜').replace(/\n/g, ' ');
let md = `# 文字截斷盤點：${R.tag}\n\n來源：\`${path.basename(src)}\`（\`tests/tools/text-fit-probe.mjs\`），整理：\`tests/tools/text-fit-inventory.mjs\`。\n\n`;
md += `- 量測格數（畫面鍵 × 視口）：${cells.total}（${Object.entries(cells.byVp).map(([k, n]) => k + ' ' + n).join('、')}）\n`;
md += `- 含非捲動截斷的格數：${infoRed.total}（${Object.entries(infoRed.byVp).map(([k, n]) => k + ' ' + n).join('、') || '無'}）\n`;
md += `- 盤點項數：${list.length}（${Object.entries(out.byClass).map(([k, n]) => k + ' ' + n).join('、')}）\n`;
md += `- 作廢格（量測中途畫面換掉）：${(R.summary.lost || []).join('、') || '無'}\n- pageerror：${Object.entries(R.pageErrors).map(([k, v]) => k + ' ' + v.length).join('、')}\n\n`;
md += `| # | 元素 | 分類 | 全文（例） | 顯示文（例） | 格數 | 出現在（模式\\|畫面：視口） | 理由／全文位置 |\n|---|---|---|---|---|---|---|---|\n`;
list.forEach((I, i) => {
  const ex = I.examples[0];
  const where = Object.entries(I.screens).slice(0, 14).map(([k, vs]) => `${k}:${vs.join('')}`).join('；') + (Object.keys(I.screens).length > 14 ? `；…共 ${Object.keys(I.screens).length} 種` : '');
  md += `| ${i + 1} | \`${esc(I.sel)}\`${I.scrollable ? '（可捲）' : ''} | ${I.cls} | ${esc(ex.full.slice(0, 60))} | ${esc(ex.shown.slice(0, 60))} | ${I.count} | ${esc(where)} | ${esc(I.why)}${I.fullAt ? '；**全文位置**：' + I.fullAt + `（reach ${I.reach.ok}/${I.reach.n}）` : ''} |\n`;
});
md += `\n## 文字條背景不透明度（凍結 #3）\n\n| 文字條 | 樣本 | 自身 alpha 最低 | 疊加 alpha 最低 | 低於 .85 且無字影的格 |\n|---|---|---|---|---|\n`;
for (const [k, a] of Object.entries(R.summary.strips || {})) md += `| \`${esc(k)}\` | ${a.n} | ${a.minOwn} | ${a.minEff} | ${a.noShadowLowAlpha}${a.screens.length ? '（' + a.screens.join('、') + '）' : ''} |\n`;
fs.writeFileSync(path.join(dir, prefix + '.md'), md, 'utf8');
console.log(JSON.stringify({ cells, cellsWithInfoTrunc: infoRed, items: list.length, byClass: out.byClass, unclassified: list.filter((I) => I.cls === '未分類').map((I) => I.sel) }));

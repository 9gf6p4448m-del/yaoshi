// v0.59.2 凍結 #2 後半：「在側欄（丙案題字欄）按『盯上』後的賽局狀態，與在 86e4676 展開卡按同一鈕逐欄位相同」。
// 同一顆種子、同一個視窗、同一個模式、同一枚籤：新版走 railTabClick→等揭幕穩定→真的滑鼠點題字欄裡那張卡；
// 基準（86e4676，--base-root 指的工作樹）走 selectRailPage→真的滑鼠點展開卡。兩邊都等到盯上階段結束（進到出價）
// 再把整份 S（賽局狀態，含 marks／players／market）序列化逐字比對。
// 用法：node tests/tools/appraise-mark-eq.mjs --base-root <86e4676 工作樹> [--vps ...] [--modes ...] [--out <file>]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { VP, driveToFirst, openGame, waitTrayReady, scr, DRIVE_STEP } from './appraise-c-lib.mjs';

const HERE = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE_ROOT = path.resolve(arg('--base-root', path.join(HERE, '../base592')));
const OUT = path.resolve(arg('--out', path.join(HERE, 'docs/experiments/2026-09-28-appraise-c/mark-eq-raw.json')));
const VPS = arg('--vps', 'V1,V2,V3,V4,V5').split(',');
const MODES = arg('--modes', 'solo,hot').split(',');
const SEED = Number(arg('--seed', 3));
const PA = Number(arg('--port', 9951)), PB = PA + 1;
/* 兩邊預先寫進同一組私下天命（理由見 appraise-c-lib openGame）；首跑沒這一步，40 列全數只差 players[*].destiny、
   而且同一版本連開兩次也不同＝抽籤雜訊，不是鑑賞頁改了賽局。 */
const DESTINY = ['water', 'eyes', 'twinTiger', 'godKing'];
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const sa = spawn('python', ['-m', 'http.server', String(PA), '--bind', '127.0.0.1'], { cwd: HERE, stdio: 'ignore' });
const sb = spawn('python', ['-m', 'http.server', String(PB), '--bind', '127.0.0.1'], { cwd: BASE_ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();

const SNAP = () => {
  const seen = new WeakSet();
  const S = window.__yaoshi.S;
  return JSON.stringify(S, (k, v) => { if (typeof v === 'function') return undefined; if (v && typeof v === 'object') { if (seen.has(v)) return '[cyc]'; seen.add(v); } return v; });
};
async function one(port, vp, mode, tab, isBase) {
  const { ctx, page } = await openGame(browser, port, VP[vp], mode, SEED, { clock: false, destiny: DESTINY });
  try {
    const cls = await driveToFirst(page, new Set(['mark']));
    if (!cls) return { err: '沒進到盯上階段' };
    if (!(await waitTrayReady(page))) return { err: '3D 未就緒' };
    await page.waitForTimeout(300);
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => ({ rail: b.closest('.rail').id, slot: Number(b.dataset.slot) })));
    const t = tabs[tab]; if (!t) return { none: true };
    if (isBase) await page.evaluate(([r, s]) => selectRailPage(r, s), [t.rail, t.slot]);
    else await page.evaluate(([r, s]) => railTabClick(r, s), [t.rail, t.slot]);
    await page.waitForTimeout(2600); // 兩邊等一樣久（丙案要等揭幕 1.06 秒＋題字淡入；基準也等同樣時間，避免「等待長短」本身造成差異）
    /* 點的是「那張卡」：基準是展開卡本身；新版卷軸把卡片收進「規則原文」那一段，收成一行（卡片不顯示）時，
       卷軸紙面就是那張卡的點擊區（index.html appraiseScrollBuild：點紙面＝card.click()），改點白話句那一行的中心。 */
    let sel = `#${t.rail} .railPages .railSelected`;
    if (!isBase) sel = await page.evaluate(([q, r]) => { const e = document.querySelector(q); const v = e && e.getBoundingClientRect().width > 0; return v ? q : `#${r} .railPages .asc .asc-gain`; }, [sel, t.rail]);
    const box = await page.evaluate((q) => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 } : null; }, sel);
    if (!box) return { err: '卡片不在畫面上', ...t };
    const top = await page.evaluate(([x, y, q]) => { const e = document.elementFromPoint(x, y); return !!e && !!e.closest(q); }, [box.x, box.y, sel]);
    if (!top) return { err: '卡片中心被別的元素蓋住（點不到）', ...t };
    await page.mouse.click(box.x, box.y);
    for (let i = 0; i < 400; i++) { const c = await scr(page); if (c === 'bid') break; await page.evaluate(DRIVE_STEP).catch(() => {}); await page.waitForTimeout(10); }
    await page.waitForTimeout(200);
    return { ...t, snap: await page.evaluate(SNAP) };
  } finally { await ctx.close().catch(() => {}); }
}
const rows = [];
try {
  for (const vp of VPS) for (const mode of MODES) for (let tab = 0; tab < 8; tab++) {
    const a = await one(PA, vp, mode, tab, false);
    if (a.none) break;
    const b = await one(PB, vp, mode, tab, true);
    const row = { vp, mode, tab, rail: a.rail, slot: a.slot };
    if (a.err || b.err) row.err = `新版:${a.err || 'ok'} 基準:${b.err || 'ok'}`;
    else {
      row.equal = a.snap === b.snap;
      if (!row.equal) {
        const A = JSON.parse(a.snap), B = JSON.parse(b.snap);
        row.diff = Object.keys({ ...A, ...B }).filter((k) => JSON.stringify(A[k]) !== JSON.stringify(B[k])).join(',');
        const paths = [];
        const walk = (x, y, p) => { if (paths.length >= 12) return; if (JSON.stringify(x) === JSON.stringify(y)) return; if (x && y && typeof x === 'object' && typeof y === 'object') { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], p + '.' + k); } else paths.push(p + ' 新=' + JSON.stringify(x) + ' 基準=' + JSON.stringify(y)); };
        walk(A, B, 'S');
        row.paths = paths;
      }
      row.len = a.snap.length;
      row.marked = JSON.parse(a.snap).marks;
    }
    rows.push(row);
    console.log(vp, mode, tab, row.equal, row.err || '', row.diff || '');
  }
} finally { await browser.close(); sa.kill(); sb.kill(); }
fs.writeFileSync(OUT, JSON.stringify({ baseRoot: BASE_ROOT, rows }, null, 1));
console.log('寫入', OUT, rows.length, '列，相等', rows.filter((r) => r.equal).length);

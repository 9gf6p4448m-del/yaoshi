// v0.59.1 凍結 card-dock-font #6：V1 首頁／選角／出價（展開一張卡）／揭盅 改前改後 contact sheet 素材。
// 用法：node tests/tools/card-dock-contact.mjs <root> <tag> <outDir> <port>
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const [ROOT, TAG, OUT, PORT] = process.argv.slice(2);
const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', PORT, '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2000));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 852, height: 393 } });
await p.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = ':root{--safe-top:0px!important;--safe-right:59px!important;--safe-bottom:21px!important;--safe-left:59px!important}'; document.head.appendChild(s); }); });
await p.goto(`http://127.0.0.1:${PORT}/index.html`); await p.waitForFunction(() => window.__yaoshi3d && window.__yaoshi3d.tray, null, { timeout: 90000 }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(2500);
fs.mkdirSync(OUT, { recursive: true }); const shot = async (n) => { await p.waitForTimeout(1500); await p.screenshot({ path: path.join(OUT, `${TAG}-${n}.png`) }); };
await shot('title');
await p.evaluate(() => startEntry('solo')); await p.waitForTimeout(1200); await shot('select');
await p.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
await p.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame('solo', 3, SEL.picks); });
await p.waitForFunction(() => window.__yaoshi3d.tray.readyCount() >= window.__yaoshi.S.market.length, null, { timeout: 90000 }); await p.waitForTimeout(2000);
await p.evaluate(() => document.querySelector('#railE .railTabs button').click()); await shot('bid-open');
await p.evaluate(() => { const b = document.querySelector('#railE .railTabs button'); if (b) b.click(); });
await b.close(); srv.kill();

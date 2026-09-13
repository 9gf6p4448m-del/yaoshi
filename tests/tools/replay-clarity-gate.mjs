/*
 《妖市》重玩性 P0：資訊必須讓新玩家理解真正的輸贏依據。
 使用者旅程：
 - 作為第一次進妖市的玩家，我要從開場知道紙紮夜戰不是比舊戰力，
   才能把下一局的輸贏歸因到可調整的部隊選擇。
 - 作為正要出價的玩家，我要從拍品詳情讀到真正的勝負順序，
   才不會為一個不決勝的數字盲目花壽命。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const PORT = +(process.argv.find((a) => a.startsWith('--port=')) || '--port=9037').slice(7);

function chromium() {
  const candidates = [
    path.join(ROOT, 'tools/anyCreature/package.json'),
    path.resolve(ROOT, '../../tools/anyCreature/package.json'),
    path.resolve(ROOT, '../../../tools/anyCreature/package.json'),
  ];
  for (const candidate of candidates) if (fs.existsSync(candidate)) return createRequire(candidate)('playwright').chromium;
  throw new Error('找不到 Playwright；無法跑玩家可見的資訊一致性閘門');
}

function assert(ok, message) { if (!ok) throw new Error(message); }

const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((resolve) => setTimeout(resolve, 900));
const browser = await chromium().launch();

try {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object"');

  const intro = await page.evaluate(() => introPages()[1]);
  assert(!/抽對手比戰力/.test(intro), 'RED: 新手第二卡仍把夜戰說成「抽對手比戰力」');
  assert(/輪轉|配對/.test(intro) && /存活.*紙紮/.test(intro) && /剩餘血量/.test(intro),
    'RED: 新手第二卡未交代固定配對、先比存活紙紮、再比剩餘血量');

  await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
  for (let step = 0; step < 500; step += 1) {
    const state = await page.evaluate(() => ({ label: document.getElementById('mainbtn').textContent, disabled: document.getElementById('mainbtn').disabled }));
    if (/蓋牌開標/.test(state.label)) break;
    if (!state.disabled) await page.click('#mainbtn');
    else await page.waitForTimeout(15);
  }
  await page.evaluate(() => openSheet(0));
  const detail = await page.locator('#sheetbox').innerText();
  assert(!/戰力 \+/.test(detail), 'RED: 拍品詳情仍把「戰力 +數字」當成主要購買資訊');
  assert(/紙紮夜戰/.test(detail) && /存活.*紙紮/.test(detail) && /剩餘血量/.test(detail),
    'RED: 拍品詳情未說明紙紮夜戰的實際勝負順序');
  console.log('PASS replay clarity: intro and item detail describe the actual paper-war decision rule');
  await context.close();
} finally {
  await browser.close();
  server.kill();
}

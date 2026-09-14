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
  await page.goto(`http://127.0.0.1:${PORT}/index.html?table3d=1`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object"');
  await page.waitForFunction('window.__yaoshi3d && window.__yaoshi3d.tray');

  const title = await page.locator('#titleScr').innerText();
  assert(!/風位玩家當夜戰力[＋+]/.test(title),
    'RED: 首頁仍把風位說成當夜戰力加成，而紙紮夜戰只把它用在同分裁定');

  const intro = await page.evaluate(() => introPages()[1]);
  assert(!/抽對手比戰力/.test(intro), 'RED: 新手第二卡仍把夜戰說成「抽對手比戰力」');
  assert(/輪轉|配對/.test(intro) && /存活.*紙紮/.test(intro) && /剩餘血量/.test(intro),
    'RED: 新手第二卡未交代固定配對、先比存活紙紮、再比剩餘血量');

  await page.evaluate(() => localStorage.setItem('yaoshi_intro_v1', '1'));
  await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
  for (let step = 0; step < 500; step += 1) {
    const state = await page.evaluate(() => ({ label: document.getElementById('mainbtn').textContent, disabled: document.getElementById('mainbtn').disabled }));
    if (/蓋牌開標/.test(state.label)) break;
    if (!state.disabled) await page.click('#mainbtn');
    else await page.waitForTimeout(15);
  }
  await page.waitForTimeout(300);
  const moonTable = await page.evaluate(() => {
    const tray = window.__yaoshi3d.tray;
    const mark = window.__yaoshi3d.scene.getObjectByName('tray-moon-benefit');
    return { items: tray.items(), marks: mark ? mark.count : 0 };
  });
  assert(moonTable.items.some((item) => item.moon && item.fac === 'yinqi') && moonTable.marks > 0,
    'RED: 本夜受惠的陰氣拍品沒有在 3D 桌上得到月相光標 ' + JSON.stringify(moonTable));
  await page.evaluate(() => openSheet(0));
  const detail = await page.locator('#sheetbox').innerText();
  assert(!/戰力 \+/.test(detail), 'RED: 拍品詳情仍把「戰力 +數字」當成主要購買資訊');
  assert(/紙紮夜戰/.test(detail) && /存活.*紙紮/.test(detail) && /剩餘血量/.test(detail),
    'RED: 拍品詳情未說明紙紮夜戰的實際勝負順序');

  await page.evaluate(() => {
    const p = S.players[ACTIVE];
    p.bag = [
      { n: '驗收陰氣甲', f: 'yinqi', p: 0 },
      { n: '驗收陰氣乙', f: 'yinqi', p: 0 },
    ];
    showBag(ACTIVE);
  });
  const bag = await page.locator('#modalbox').innerText();
  assert(!/共鳴：陰氣×2\s*\+4/.test(bag),
    'RED: 袋子仍展示舊公式「同系件數平方」而不是實際紙紮共鳴效果');
  assert(/紙紮共鳴：陰氣×2[\s\S]*hp \+1/.test(bag),
    'RED: 袋子未展示目前啟用的紙紮共鳴效果');
  assert(!/總戰力|舊公式/.test(bag),
    'RED: 袋子仍展示不參與紙紮夜戰的舊戰力總計');

  const hud = await page.locator('#south').innerText();
  assert(!/戰力/.test(hud), 'RED: 預設紙紮夜戰的底列仍把舊戰力當主要資訊');
  const felt = await page.locator('#feltHead').innerText();
  assert(/🌑\s*朔月｜陰氣拍：全隊 HP \+1/.test(felt),
    'RED: 局勢列沒有用玩家可行動的格式說清楚本夜月相增幅');

  await page.evaluate(() => showReview());
  const review = await page.locator('#reviewbox').innerText();
  assert(/下一局實驗/.test(review), 'RED: 局末回顧沒有可見的下一局實驗區塊');
  console.log('PASS replay clarity: intro and item detail describe the actual paper-war decision rule');
  await context.close();
} finally {
  await browser.close();
  server.kill();
}

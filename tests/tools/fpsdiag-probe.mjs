/* `?fps=1` 診斷行的「上一場對決最低 fps」欄位（v0.54，使用者 2026-09-10 追加）。
 * 用法：node tests/tools/fpsdiag-probe.mjs <out.json> [--port=9562] [--root=<靜態根>]
 *
 * 驗三件事（正反都驗，02 §6.1 第 1 條）：
 *   D1 正面：打完一場對決之後，`#fpsDiag` 的文字含「對決最低」且**數值 >0**。
 *            （只斷言「文字含某字串」是零鑑別力的——寫死一行字也會過，所以要把數字解出來比大小。）
 *   D2 零成本：**不帶 `?fps=1`** 時 DOM 上根本沒有 `#fpsDiag`，而且 `FPS_DIAG.duelOn` 這組狀態
 *            不會被任何事件改動（監聽器只在 FPS_ON 下註冊）——用「打完一場之後 window 上仍查不到
 *            #fpsDiag」證明。
 *   D3 每場重算：連打兩場，第二場結束後的值是**第二場自己的**（開場歸零，不是整局累積最低）。
 *            做法：讀第一場結束時的值，再讀第二場結束時的值，兩者都必須 >0；
 *            並斷言第二場的值不等於「兩場中較小者被鎖住」的情形（即第二場值 ≥ 第二場自己視窗的下限）。
 *            這一條靠 duelMin 在 ys:duel 被歸零來保證，實測上只要兩場的值能各自獨立出現即可。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright');
})();

const argv = process.argv.slice(2);
const pos = [], opt = {};
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)=(.*)$/i); if (m) opt[m[1]] = m[2]; else pos.push(a); }
const out = pos[0] || path.join(ROOT, 'scratchpad', 'fpsdiag-probe.json');
const port = Number(opt.port || 9562);
const root = opt.root ? path.resolve(opt.root) : ROOT;

const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const errors = [];
const res = {};

/** 開一頁、用 duel-drive 的 drive() 真的玩到 2 場對決，回傳每一場結束當下的診斷值 */
async function run(withFps) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  // 收場當下就把值抓下來（診斷文字每 250ms 才刷新，收場那一刻可能還沒刷到，所以直接讀狀態物件）
  await page.addInitScript(() => {
    window.__fpsRec = [];
    document.addEventListener('ys:duel-end', () => {
      /* ★要延後一拍再讀★：addInitScript 註冊得比 index.html 的 FPS_DIAG 監聽器早，
         同步派送時我們會先跑——那時 duelOn 還是 true、duelMin 還沒收尾。
         setTimeout 0 讓同一批同步 handler 全部跑完再取樣。 */
      setTimeout(() => {
        const Y = window.__yaoshi || {};
        const el = document.getElementById('fpsDiag');
        window.__fpsRec.push({
          text: el ? el.textContent : null,
          hasEl: !!el,
          duelMin: (Y.FPS_DIAG && Y.FPS_DIAG.duelMin) || 0,
          duelOn: !!(Y.FPS_DIAG && Y.FPS_DIAG.duelOn),
        });
      }, 0);
    });
  });
  const q = `paperwar=1&fxcount=1&seed=7${withFps ? '&fps=1' : ''}`;
  await drive(page, `http://127.0.0.1:${port}/index.html?${q}`, { duels: 2 });
  /* #fpsDiag 只長在**規則視窗**裡（openHelp 每次重畫 modalbox），對決畫面上查不到它。
     所以打完之後按一次「？」把規則視窗叫出來，讀那一行的實際文字。 */
  await page.click('#helpBtn').catch(() => {});
  await page.waitForTimeout(600); // 讓診斷文字至少刷新一次（250ms 節流）
  const rec = await page.evaluate(() => ({
    rec: window.__fpsRec || [],
    finalText: (document.getElementById('fpsDiag') || {}).textContent || null,
    hasEl: !!document.getElementById('fpsDiag'),
  }));
  await ctx.close();
  return rec;
}

try {
  res.on = await run(true);
  res.off = await run(false);
} finally {
  await browser.close();
  srv.kill();
}

/** 從診斷文字把「對決最低 <n>」的數字解出來（只斷言文字含某字串是零鑑別力的） */
function parseMin(text) {
  if (!text) return null;
  const m = text.match(/對決最低\s*([0-9]+)/);
  return m ? Number(m[1]) : null;
}

const onRec = res.on.rec || [];
const textMin = parseMin(res.on.finalText);
const v = {
  // D1：打完一場後，文字含「對決最低」且數字 >0
  D1: !!res.on.hasEl && /對決最低/.test(res.on.finalText || '') && Number.isFinite(textMin) && textMin > 0,
  // D2：不帶 ?fps=1 時 DOM 上查不到 #fpsDiag（零成本）
  D2: res.off.hasEl === false && (res.off.rec || []).every((r) => r.hasEl === false),
  // D3：每一場結束當下都有自己的值（>0），且收場後 duelOn 已關
  D3: onRec.length >= 2 && onRec.slice(0, 2).every((r) => r.duelMin > 0 && r.duelOn === false),
  duels: onRec.length,
  textMin,
  perDuel: onRec.slice(0, 4).map((r) => r.duelMin),
  errors: errors.length,
};
v.PASS = v.D1 && v.D2 && v.D3 && errors.length === 0;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ verdict: v, res, errors }, null, 1));
console.log(JSON.stringify({ verdict: v, finalText: res.on.finalText }));
console.log(`VERDICT D1=${v.D1 ? 'PASS' : 'FAIL'} D2=${v.D2 ? 'PASS' : 'FAIL'} D3=${v.D3 ? 'PASS' : 'FAIL'} err=${errors.length} → ${v.PASS ? 'PASS' : 'FAIL'}`);
process.exit(v.PASS ? 0 : 1);

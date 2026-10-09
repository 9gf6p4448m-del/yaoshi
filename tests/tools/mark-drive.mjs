// 盯牌令牌丙 驗收量具的共用驅動（docs/experiments/2026-10-08-mark-bing/acceptance.md）。
// 由示意 _mm.mjs（docs/experiments/2026-10-08-mark-bing/mock/_mm.mjs）的開局／凍結時間／場景段落提煉，步驟與數值不變：
//   solo 種子 1 角色 qingmian → 點到第 1 夜「不盯任何一件」畫面 → 等托盤與手載入 → 隱藏 DOM 只留 canvas → 真實等 3 秒
//   → 裝假時鐘並暫停 → 關煙／餘燼 → 推進直到相機 40 次取樣不動 → 再推 1 秒。
// 場景：清桌（示意樹有 __mmZero／__mmReset 就用；產品樹沒有就略過，量測輸出會帶 anim 欄位）→ 推 600ms → props.mark(seat, slot)
//   （hands:true 另叫 hands.mark）→ frame:'hit' 推到 tokenAt(第一席).hit、否則推 3000ms（落定）。
// 量具只讀：令牌相關 mesh 一律以名稱前綴 `prop-token` 收集（prop-tokens、prop-token-seat…）；這是凍結檔 §0 的量測契約。
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from './duel-drive.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const { chromium } = createRequire(path.join(HERE, '../../tools/anyCreature/package.json'))('playwright');
export const SAFE_L = { top: 0, right: 59, bottom: 21, left: 59 };

export function arg(name, def) {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : def;
}
export const flag = (name) => process.argv.includes(`--${name}`);

/** 開瀏覽器＋本機伺服器。root＝要量的那棵樹（預設本檔所在的樹）。 */
export async function openBrowser(root, port) {
  const server = await serve(root, port);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  return { browser, close: async () => { await browser.close(); server.kill(); } };
}

/** 開一頁、走到第 1 夜盯上畫面、凍結時間。回傳 { page, run }。
 *  vclock＝true（5b 足跡量法用）：開頁前就裝假時鐘，載入／走流程／等待全部用 runFor 推進，最後推到同一個絕對假時間 T_ABS——
 *  不讓真實時間漏進燈籠火焰／拍品閒置動畫相位（原本開頁後 3 秒是真實等待）；預設 false＝5a 等既有量具行為不變。 */
export async function openMarkPage(browser, { port, vp, query = '', mm = null, palette = null, safe = true, dpr = 2, vclock = false }) {
  const [W, H] = vp.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.addInitScript(({ mm, palette }) => {
    localStorage.setItem('yaoshi_intro_v1', '1');
    if (mm) window.__MM = mm;
    if (palette) window.__MMPAL = palette; // 只有示意樹讀它；產品樹忽略
  }, { mm, palette });
  const step = (ms) => page.clock.runFor(Math.max(16, Math.round(ms / 16) * 16));
  if (vclock) { await page.clock.install({ time: 1e6 }); await page.clock.pauseAt(1e6 + 1); }
  await page.goto(`http://127.0.0.1:${port}/${query}`);
  if (safe && W > H) await page.evaluate((s) => { for (const [k, px] of Object.entries(s)) document.documentElement.style.setProperty(`--safe-${k}`, `${px}px`); }, SAFE_L);
  if (vclock) { for (let i = 0; i < 600; i++) { if (await page.evaluate(() => !!(window.__yaoshi3d?.tray && window.__yaoshi))) break; await step(100); } }
  else await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi);
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  let reached = false;
  for (let i = 0; i < 150; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && st.t.includes('不盯任何一件')) { reached = true; break; }
    // 直式有 #rotateHint 蓋在上面，一律用 DOM click（示意 _mm 用 page.click，橫式下兩者等價）
    await page.evaluate((d) => { if (!d) document.getElementById('mainbtn').click(); else [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click(); }, st.d);
    if (vclock) await step(96); else await page.waitForTimeout(100);
  }
  if (!reached) throw new Error(`${vp}: 沒走到盯上畫面`);
  if (vclock) {
    await page.evaluate(() => { window.__trayLoaded = false; Promise.resolve(window.__yaoshi3d.tray.loaded()).then(() => { window.__trayLoaded = true; }); });
    for (let n = 0; n < 1000; n++) { if (await page.evaluate(() => window.__trayLoaded && window.__yaoshi3d.tray.hands.loaded())) break; await step(96); }
  } else {
    await page.evaluate(() => window.__yaoshi3d.tray.loaded());
    await page.waitForFunction(() => window.__yaoshi3d.tray.hands.loaded(), null, { timeout: 30000 });
  }
  await page.addStyleTag({ content: 'body *:not(canvas){visibility:hidden !important} canvas{visibility:visible !important}' });
  if (vclock) { // 絕對時間柵欄：不論前面載入／走流程花了幾步，一律推到同一個假時間 T_ABS；已超過代表柵欄太小，直接報錯（不是重跑）
    const T_ABS = 9000, nowB = await page.evaluate(() => performance.now());
    if (nowB > T_ABS - 3000) throw new Error('barrier too small: now=' + nowB);
    await page.clock.runFor(T_ABS - nowB);
  } else {
    await page.waitForTimeout(3000);
    await page.clock.install({ time: 1e6 });
    await page.clock.pauseAt(2e6);
  }
  await page.evaluate(() => { const Y = window.__yaoshi3d; Y.smoke.points.visible = false; Y.embers.points.visible = false; });
  const run = (ms) => page.clock.runFor(Math.max(16, Math.round(ms / 16) * 16));
  let last = '', same = 0;
  if (vclock) { // 固定 41 次取樣＋斷言相機靜止（不是「靜止為止」的變長迴圈）
    for (let i = 0; i < 41; i++) { await run(50); const k = await page.evaluate(() => { const c = window.__yaoshi3d.camera; return c.position.toArray().map((x) => x.toFixed(7)).join() + c.quaternion.toArray().map((x) => x.toFixed(7)).join(); }); if (i >= 1 && k !== last) throw new Error('camera not static at T_ABS (sample ' + i + ')'); last = k; }
  } else
  for (let i = 0; i < 400 && same < 40; i++) {
    await run(50);
    const k = await page.evaluate(() => { const c = window.__yaoshi3d.camera; return c.position.toArray().map((x) => x.toFixed(7)).join() + c.quaternion.toArray().map((x) => x.toFixed(7)).join(); });
    same = k === last ? same + 1 : 0; last = k;
  }
  await run(1000);
  return { page, run, W, H, errors };
}

/** 套一個場景：marks＝[[seat, slot], …]。frame：'hit'（第一席 hit 那一幀）、'settled'（推 3000ms）或 'none'（不推進）。 */
export async function applyScene(page, run, { marks, hands = false, frame = 'settled', mm = undefined }) {
  if (mm !== undefined) await page.evaluate((v) => { window.__MM = v; }, mm);
  await page.evaluate(() => {
    const T = window.__yaoshi3d.tray;
    window.__mmZero = true; // 示意樹（renderer 補丁）才有作用；產品樹只是多一個沒人讀的全域
    const slots = T.__mmSlots ? T.__mmSlots() : [];
    for (const sl of slots) if (sl.fig && sl.fig.__mmReset) sl.fig.__mmReset();
    T.props.clearRound(); T.hands.clear();
  });
  await run(600);
  await page.evaluate(({ marks, hands }) => { const T = window.__yaoshi3d.tray; for (const [s, k] of marks) { T.props.mark(s, k); if (hands) T.hands.mark(s, k); } }, { marks, hands });
  if (frame === 'hit') {
    for (let i = 0; i < 80; i++) { await run(16); if (await page.evaluate((s) => window.__yaoshi3d.tray.props.tokenAt(s)?.hit, marks[0][0])) break; }
  } else if (frame === 'settled') await run(3000);
  // frame:'none'＝mark 之後不推進（呼叫端自己逐幀記）
}

/** 頁面端共用：取槽位拍品節點（示意樹用 __mmSlots；產品樹用 lotNodes，四槽都要有東西才對得上 index）。 */
export const PAGE_HELPERS = `
window.__markSlotNode = (slot) => {
  const T = window.__yaoshi3d.tray;
  if (T.__mmSlots) { const s = T.__mmSlots()[slot]; return s.fig ? s.fig.group : s.pile.group; }
  const nodes = T.lotNodes(), n = T.slotXs().length;
  if (nodes.length !== n) throw new Error('lotNodes ' + nodes.length + ' != slots ' + n + '（有空槽，index 對不上）');
  return nodes[slot];
};
window.__markMeshes = () => window.__yaoshi3d.tray.props.group.children.filter((c) => /^prop-token/.test(c.name) && c.isInstancedMesh);
`;

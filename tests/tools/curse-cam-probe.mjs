/* 中咒鏡頭預設關（驗收 docs/experiments/2026-10-10-curse-cam-off/acceptance.md §1–§4）的真實鏈路探針。
 *
 * node tests/tools/curse-cam-probe.mjs --root=<要量的樹> --vp=V3|V2 --port=<埠> --qs=<q1|q2|…> --dst=<json> [--out=<grab-probe 的輸出目錄，給暫存，免得它在本樹建空目錄>] [--slots=0,1,2,3]
 *   --root 預設本檔所在的樹；grab-probe 一律用本檔所在樹那一份（放 tools/anyCreature junction 的樹）。
 *   --qs 以「|」分隔多組網址參數，空字串＝預設（例：'|cam=0|cursecam=1'）。
 *
 * 承襲 2026-10-10 診斷探針 sky-probe：grab-probe 的假時鐘驅動 rAF，且 performance.now 對齊 window.__now
 * （camera-director 的中咒包絡／喊價 holdMs 讀 performance.now；不對齊的話包絡一開始就結束，量到偽陰性）。
 * 與 sky-probe 的差別：出價走頁面真實的 pushBid3d、開標結果走頁面真實的 revealGlow——detail.cam 由 index.html 自己算，
 * 旗標（?cam、?cursecam）經真實發送端進到鏡頭；治具不手寫 detail。
 *
 * 每組 q × 每槽記：
 *   bid[]：出價窗（第一筆出價後 50 幀＋第二筆後 70 幀）逐幀相機位置；
 *   pre：ys:reveal-result 派出前一幀的相機高度與俯角；
 *   curse[]：派出後 216 幀（3.6 s）逐幀相機位置、俯角、施咒者 Palm 是否高於桌遠緣（圓桌 r=3.4 北緣同 x 的螢幕 y）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const GP = await import(pathToFileURL(path.join(HERE, 'tests/tools/grab-probe.mjs')).href); // grab-probe 自己讀 --root／--port
const { openPage, withServer, ev, step, chromium } = GP;
const VPN = opt.vp || 'V3';
const slots = String(opt.slots ?? '0,1,2,3').split(',').map(Number);
const QS = String(opt.qs ?? '').split('|');
const C = 2, VT = 3, LOSER = 0; // 西(2) → 東(3)
const res = { root: path.resolve(opt.root || HERE), vp: VPN, runs: [] };

/* 這一幀的相機與施咒者手（同 sky-probe 的量法，只留本驗收用到的欄位） */
const SNAP = (c) => {
  const THREE = window.__THREE, Y = window.__yaoshi3d, T = Y.tray, cam = Y.camera, ch = innerHeight, cw = innerWidth;
  const dir = cam.getWorldDirection(new THREE.Vector3());
  const o = { pos: cam.position.toArray(), pitch: Math.asin(-dir.y) * 180 / Math.PI, hand: null };
  for (const holder of T.hands.group.children) {
    if (!holder.visible || +holder.name.split('-')[1] !== c) continue;
    let mesh = null; holder.traverse((q) => { if (q.isSkinnedMesh && !mesh) mesh = q; }); if (!mesh) continue;
    holder.updateMatrixWorld(true); mesh.skeleton.update();
    const palm = mesh.skeleton.bones.find((b) => b.name === 'Palm'); if (!palm) continue;
    const pw = new THREE.Vector3(); palm.getWorldPosition(pw);
    const scr = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam); return [(v.x + 1) / 2 * cw, (1 - v.y) / 2 * ch]; };
    const ps = scr(pw.x, pw.y, pw.z), rz = -Math.sqrt(Math.max(0, 3.4 * 3.4 - pw.x * pw.x)), rim = scr(pw.x, 0.15, rz);
    o.hand = { palmScrY: ps[1], rimY: rim[1], aboveRim: ps[1] < rim[1] };
  }
  return o;
};

await withServer(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  try {
    for (const q of QS) {
      const { ctx, page, errs } = await openPage(browser, VPN, q);
      await page.evaluate(() => { performance.now = () => window.__now; }); // 假時鐘對齊（見檔頭）
      await page.addScriptTag({ content: `window.__ccSnap=${SNAP.toString()};` });
      /* 記下真實發送端派出去的 detail（只讀，回報用） */
      await page.evaluate(() => { window.__ccSent = []; document.addEventListener('ys:reveal-result', (e) => window.__ccSent.push({ cam: e.detail && e.detail.cam, transferTarget: e.detail && e.detail.transferTarget })); });
      const stepSnap = (n) => page.evaluate(([n, c]) => { const out = []; for (let i = 0; i < n; i++) { window.__step(1); out.push(window.__ccSnap(c)); } return out; }, [n, C]);
      for (const slot of slots) {
        await page.evaluate(([s]) => window.__gp.reset(s, true, 'wedding'), [slot]);
        const bid = [];
        await page.evaluate(([s, sl]) => pushBid3d(s, sl, 6), [C, slot]); bid.push(...await stepSnap(50));
        await page.evaluate(([s, sl]) => pushBid3d(s, sl, 4), [LOSER, slot]); bid.push(...await stepSnap(70));
        await page.evaluate(([s, sl]) => pushBid3d(s, sl, 3), [VT, (slot + 2) % 4]); await step(page, 70);
        await ev(page, 'ys:reveal-slot', { slot, ms: 812 }); await step(page, 49);
        const pre = await page.evaluate((c) => window.__ccSnap(c), C);
        /* 真實發送端：index.html 的 revealGlow（毒標詛咒品、西→東、未被擋）。S.market 只暫換成「這一槽是這件」以讓 slot 算對，呼叫完還原。 */
        await page.evaluate(([c, vt, sl]) => {
          const it = { curse: true }, m0 = S.market;
          S.market = [0, 1, 2, 3].map((i) => (i === sl ? it : {}));
          try { revealGlow({ winner: { p: { id: c }, intent: 'poison', target: vt }, it, entries: [], poisonBlocked: false }); } finally { S.market = m0; }
        }, [C, VT, slot]);
        const curse = await stepSnap(216);
        const sent = await page.evaluate(() => window.__ccSent.slice(-1)[0] || null);
        res.runs.push({ q, slot, bid, pre, curse, sent });
        const rim = curse.filter((f) => f.hand && f.hand.aboveRim).length;
        console.log(JSON.stringify({ vp: VPN, q, slot, aboveRim: rim, handFrames: curse.filter((f) => f.hand).length, sent }));
      }
      res.errs = (res.errs || []).concat(errs.map((e) => `[${q}] ${e}`));
      await ctx.close();
    }
  } finally { await browser.close(); }
});
fs.mkdirSync(path.dirname(path.resolve(opt.dst)), { recursive: true });
fs.writeFileSync(path.resolve(opt.dst), JSON.stringify(res));

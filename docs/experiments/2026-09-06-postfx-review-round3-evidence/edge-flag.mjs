// 第 3 輪覆審探針（L-3）：window.__yaoshi3d.edgeOn 這個旗標，和「這一幀畫面裡到底有沒有深度邊緣線」
// 是不是同一件事。作者把 getter 改成 bloomOK && bloom.edgeOn（bloom.edgeOn = edgeWant && depthTex），
// 而每幀真正的畫線條件是 renderer.js:223 的 setEdge(EDGE_URL_ON && kind==='duel' && !crowded)
// ＋ :224 的 bloomOK && (!warmedUp || kind==='duel') 決定走不走 bloom.render。
// 量法：先讀旗標，再把**同一幀的畫面**跟「強制關線」「強制開線」兩張重繪比像素。
//   liveEqOff＝現場畫面等於關線 → 現場沒在畫線；liveEqOn＝現場等於開線 → 現場有在畫線。
//   onOffDiff＝這個狀態下線本來畫得出多少像素（正控制：0 代表這一格根本量不到線，判讀無效）。
// 四個狀態：標題頁（非對決）／一般對決（2v2）／滿編對決（8v8，crowded）／?edge=0。
// 用法：node <this> <out.json> [--port=8919]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from '../../../tests/tools/duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const HEAVY = ['fushou', 'ashcharm', 'wangchuan', 'boartusk', 'shanshen', 'balen', 'yinyangcoin', 'boat'];
const FAC = { fushou: 'xianghuo', ashcharm: 'xianghuo', wangchuan: 'xianghuo', boartusk: 'zuling', shanshen: 'zuling', balen: 'zuling', yinyangcoin: 'yinqi', boat: 'zuling' };

const { pos, opt } = parseArgs(process.argv.slice(2));
const [out] = pos;
const port = Number(opt.port || 8919);
const W = Number(opt.w || 844), H = Number(opt.h || 390), DSF = Number(opt.dsf || 2);

const MEASURE = `
  const Y3 = window.__yaoshi3d;
  const gl = Y3.renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const read = () => { const b = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
  const diff = (a, b) => { let d = 0; for (let i = 0; i < a.length; i += 4) { const m = Math.max(Math.abs(a[i]-b[i]), Math.abs(a[i+1]-b[i+1]), Math.abs(a[i+2]-b[i+2])); if (m > 8) d++; } return d; };
  const B = Y3.bloom;
  const snap = (tag) => {
    // ① 先讀旗標（讀完才動 setEdge，不然量的是自己剛寫進去的值）
    const flag = { edgeOn: Y3.edgeOn, bloomOn: Y3.bloomOn, edgeReady: Y3.edgeReady, crowded: Y3.crowded, bloomEdgeOn: B.edgeOn };
    // ② 現場畫面（正常 render loop 剛畫完的那一張）
    const live = read();
    // ③ 同一幀重繪兩張對照
    B.setEdge(false); B.render(Y3.scene, Y3.camera); const off = read();
    B.setEdge(true); B.render(Y3.scene, Y3.camera); const on = read();
    const total = w * h;
    return Object.assign(flag, {
      tag, px: total,
      onOffDiffPct: +(diff(on, off) / total * 100).toFixed(4),
      liveVsOffPct: +(diff(live, off) / total * 100).toFixed(4),
      liveVsOnPct: +(diff(live, on) / total * 100).toFixed(4),
    });
  };
`;

const srv = await serve(ROOT, port);
const results = {};
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const errs = [];
  for (const edgeParam of ['', '&edge=0']) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
    page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
    // 標題頁（還沒開局）先量一次
    await page.goto(`http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1${edgeParam}`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!(window.__yaoshi3d && window.__yaoshi3d.bloom), null, { timeout: 20000 });
    await page.waitForTimeout(1500);
    results['title' + edgeParam] = await page.evaluate(`(async () => { ${MEASURE} return snap('title'); })()`);
    await page.close();

    const page2 = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
    page2.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
    const r = await drive(page2, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1${edgeParam}`, {
      duels: 1,
      onDuel: async (pg, n) => {
        if (n !== 1) return;
        for (const [key, cnt] of [['duel2v2', 2], ['duel8v8_crowded', 8]]) {
          const res = await pg.evaluate(async ({ heavy, fac, cnt, code }) => {
            const Y3 = window.__yaoshi3d;
            const cur = window.__rec.duels[window.__rec.duels.length - 1];
            const units = () => heavy.slice(0, cnt).map((ab, i) => ({ id: i, body: 'elite', fac: fac[ab], ab }));
            const others = [0, 1, 2, 3].filter((s) => s !== cur.a && s !== cur.b);
            document.addEventListener('ys:fx-burn', (ev) => ev.stopImmediatePropagation(), true);
            const det = { a: others[0], b: others[1], armies: [{ units: units() }, { units: units() }] };
            document.dispatchEvent(new CustomEvent('ys:duel', { detail: det }));
            await det.ready;
            await new Promise((r) => setTimeout(r, 1600));
            // eslint-disable-next-line no-new-func
            return new Function(code + '\nreturn snap(arguments[0]);')(cnt === 8 ? 'duel8v8' : 'duel2v2');
          }, { heavy: HEAVY, fac: FAC, cnt, code: MEASURE });
          results[key + edgeParam] = res;
        }
      },
    });
    errs.push(...r.errors);
    await page2.close();
  }
  fs.writeFileSync(out, JSON.stringify({ results, errors: errs }, null, 1));
  console.log(JSON.stringify({ results, errors: errs.length }, null, 1));
  await browser.close();
} finally { srv.kill(); }

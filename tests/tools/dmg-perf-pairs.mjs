// 傷害可讀性批 2-a 覆審 MEDIUM-1：R6 的 fps 訊號要先自證可信，才拿來判「≥ 基準 ×0.9」。
//
// 為什麼要另做一支：`duel-perf.mjs perf` 每次派的是**當場那一局真實的對決**，可見尊數 14–16、
// 三角形 371k–434k 都在變，基準自己重跑的離散度就有 2.3×——那個訊號量到的一半是「這一場有幾隻」，
// 不是「這一版慢多少」。三版改成：
//   ① 固定合成場景（同一份 armies、同一組 body、同一個 seed 決定的體型），新舊兩版收到逐位元組相同的 ys:duel
//   ② 同一個 session 交錯跑 N 對（預設 9），每一對就地算比值，報**逐對比值的中位數**與四分位距
//   ③ 把每一次的三角形數／draw call 一併印出來——兩版若不相同，這一對作廢（場景沒對齊，比了沒意義）
//   ④ 離散度自證：同一版連跑兩次的比值（same-version ratio）也要印，它就是這個訊號的噪音底；
//      若噪音底的散布跟新舊比值的散布同一個量級，這條就標「未驗證」，不得宣告通過
//
// 用法：
//   node tests/tools/dmg-perf-pairs.mjs <out.json> --base=<基準 worktree> [--pairs=9] [--port=8990] [--secs=2.5]
//
// **跑之前先確認機器沒有別的 agent 在跑東西**（覆審實測：有負載時 6 對交錯量到 0.852，無負載 3 對量到 1.054）。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

/** 固定的合成對決：8v8、體型與 ab 寫死，兩版收到的 detail 逐位元組相同。
 *  **場景要真的建起來**：`duel-figures` 的 realign 會抓 `#dL`／`#dR` 決定兩欄的座標，
 *  沒有那兩個容器的話人形擺不出來、`figuresOf` 是空的——量到的就只是空舞台的 fps（覆審第二輪）。
 *  所以這裡先把 `#duel` 的骨架與兩欄補上，再派 ys:duel。 */
const HEAVY = `(() => {
  const mk = (n, body, ab) => Array.from({ length: n }, (_, i) => ({ id: i, body: body, fac: ['zuling', 'xianghuo', 'yinqi'][i % 3], ab: ab }));
  window.__heavy = { a: 0, b: 1, maxFig: 10,
    armies: [{ units: mk(8, 'elite', 'tiger') }, { units: mk(8, 'elite', 'tiger') }] };
  window.__stage = () => {
    const ov = document.getElementById('duel'); if (!ov) return false;
    ov.style.display = 'flex'; ov.classList.add('on'); ov.classList.add('pw');
    const arena = document.getElementById('duelArena');
    if (arena && !document.getElementById('dL')) {
      arena.innerHTML = '<div class="fighter" id="dL"><div class="fdir">A</div><div class="fnm">A</div>'
        + '<div><span class="pwcnt" id="pwn-A">8</span><span class="pwunit"> 隻</span></div>'
        + '<div class="pwchips" id="pwch-A"></div></div>'
        + '<div class="vsbig">VS</div>'
        + '<div class="fighter" id="dR"><div class="fdir">B</div><div class="fnm">B</div>'
        + '<div><span class="pwcnt" id="pwn-B">8</span><span class="pwunit"> 隻</span></div>'
        + '<div class="pwchips" id="pwch-B"></div></div>';
    }
    return !!document.getElementById('dL');
  };
  window.__fireHeavy = () => new Promise((res) => {
    window.__stage();
    const d = JSON.parse(JSON.stringify(window.__heavy));
    d.ready = null;
    document.dispatchEvent(new CustomEvent('ys:duel', { detail: d }));
    setTimeout(() => res(!!(d.ready || d.loadTotal !== undefined)), 0);
  });
  /** 活性：兩側各站了幾尊、可見幾尊（0 就代表這一次量的是空舞台，作廢） */
  window.__liveCount = () => {
    try {
      const D = window.__yaoshi3d && window.__yaoshi3d.duelFigures;
      if (!D) return null;
      const c = (s2) => D.figuresOf(s2).filter((f) => f.group && f.group.visible).length;
      return { a: c('A'), b: c('B') };
    } catch (e) { return null; }
  };
  window.__perfSample = (ms) => new Promise((res) => {
    const R = window.__yaoshi3d && window.__yaoshi3d.renderer;
    if (!R) return res(null);
    const f0 = R.info.render.frame, t0 = performance.now();
    const raf = [];
    let last = t0;
    const tick = () => { const n = performance.now(); raf.push(n - last); last = n; if (n - t0 < ms) requestAnimationFrame(tick); else done(); };
    const done = () => {
      const dt = performance.now() - t0;
      const s = raf.slice().sort((x, y) => x - y);
      res({ ms: +dt.toFixed(1), frames: R.info.render.frame - f0,
        rendersPerSec: +((R.info.render.frame - f0) / (dt / 1000)).toFixed(1),
        rafMedianFps: s.length ? +(1000 / s[Math.floor(s.length / 2)]).toFixed(1) : null,
        triangles: R.info.render.triangles, calls: R.info.render.calls,
        programs: R.info.programs ? R.info.programs.length : null });
    };
    requestAnimationFrame(tick);
  });
})();`;

async function sample(browser, url, root, port, secs) {
  const srv = await serve(root, port);
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    await page.addInitScript(HEAVY);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__fireHeavy());
    await page.waitForTimeout(2500); // 讓 GLB 載完、站位穩定
    const warm = await page.evaluate((ms) => window.__perfSample(ms), 800); // 暖機不計
    const out = await page.evaluate((ms) => window.__perfSample(ms), secs * 1000);
    const live = await page.evaluate(() => window.__liveCount());
    const ver = await page.evaluate(() => (document.getElementById('verLine') || {}).textContent || '');
    await page.close();
    return { ...out, warmFps: warm ? warm.rafMedianFps : null, live: live, ver: ver.slice(0, 40) };
  } finally { srv.kill(); }
}

const { pos, opt } = parseArgs(process.argv.slice(2));
const out = pos[0];
if (!out || !opt.base) { console.error('need <out.json> --base=<基準 worktree>'); process.exit(2); }
const pairs = Number(opt.pairs || 9);
const port = Number(opt.port || 9140); // 9140+：8990 那一段常被別的治具佔著（serve 不檢查埠有沒有人在用）
const TRI_MIN = Number(opt.trimin || 200000); // 活性下限：三角形數低於這個就是「舞台沒建起來」
const expectVer = (() => { try { const m = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/const VERSION="([0-9.]+)"/); return m ? m[1] : null; } catch (e) { return null; } })();
const secs = Number(opt.secs || 2.5);
const rows = [];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
try {
  for (let i = 0; i < pairs; i++) {
    const a = await sample(browser, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=1`, ROOT, port, secs);
    const b = await sample(browser, `http://127.0.0.1:${port + 1}/index.html?paperwar=1&fxcount=1&seed=1`, path.resolve(opt.base), port + 1, secs);
    // 同一版連跑兩次：這一對的噪音底
    const a2 = await sample(browser, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=1`, ROOT, port, secs);
    const same = a.rafMedianFps && a2.rafMedianFps ? +(a2.rafMedianFps / a.rafMedianFps).toFixed(3) : null;
    const ratio = a.rafMedianFps && b.rafMedianFps ? +(a.rafMedianFps / b.rafMedianFps).toFixed(3) : null;
    /* 這一對能不能用，三道閘門（缺一就作廢，理由記在 row.why）：
         ① 場景對齊：三角形數與 draw call 兩版相同（不同＝兩邊擺出來的東西不一樣，比了沒意義）
         ② 活性：三角形 ≥ TRI_MIN 而且兩側各站 8 尊——舞台沒建起來時量到的是空場的 fps
         ③ 版本：新版那一支的 verLine 要含工作區的 VERSION（埠被別人佔著時會整場量到別版） */
    const aligned = a.triangles === b.triangles && a.calls === b.calls;
    const liveOk = !!(a.live && b.live && a.live.a === 8 && a.live.b === 8 && b.live.a === 8 && b.live.b === 8);
    const triOk = (a.triangles || 0) >= TRI_MIN && (b.triangles || 0) >= TRI_MIN;
    const verOk = !expectVer || String(a.ver).includes('v' + expectVer);
    const why = !aligned ? 'scene-mismatch' : !triOk ? 'stage-empty' : !liveOk ? 'figures-missing' : !verOk ? 'version-mismatch' : null;
    rows.push({ i: i + 1, newFps: a.rafMedianFps, baseFps: b.rafMedianFps, newFps2: a2.rafMedianFps,
      ratio: ratio, sameVersionRatio: same, aligned: aligned, live: [a.live, b.live], why: why, usable: !why,
      tri: [a.triangles, b.triangles], calls: [a.calls, b.calls], programs: [a.programs, b.programs], ver: [a.ver, b.ver] });
    console.log('pair', i + 1, JSON.stringify(rows[rows.length - 1]));
  }
} finally { await browser.close(); }

const st = (a) => { const s = a.filter((x) => x !== null).sort((x, y) => x - y); return s.length ? { n: s.length, min: s[0], q1: s[Math.floor(s.length * 0.25)], p50: s[Math.floor(s.length / 2)], q3: s[Math.floor(s.length * 0.75)], max: s[s.length - 1] } : null; };
const used = rows.filter((r) => r.usable);
const dropped = {};
for (const r of rows) if (r.why) dropped[r.why] = (dropped[r.why] || 0) + 1;
const sum = { pairs: rows.length, usablePairs: used.length, dropped: dropped, expectVersion: expectVer,
  ratio: st(used.map((r) => r.ratio)), noiseFloor: st(used.map((r) => r.sameVersionRatio)) };
fs.writeFileSync(out, JSON.stringify({ pairs: rows, summary: sum }, null, 1));
console.log(JSON.stringify(sum));
console.log(sum.ratio && sum.noiseFloor
  ? `逐對比值中位 ${sum.ratio.p50}（IQR ${sum.ratio.q1}–${sum.ratio.q3}）／同版噪音底中位 ${sum.noiseFloor.p50}（IQR ${sum.noiseFloor.q1}–${sum.noiseFloor.q3}）`
  : '樣本不足');

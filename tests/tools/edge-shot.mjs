// 後處理卷 P-3（2026-09-06）：深度邊緣線的機械量測。
//   node tests/tools/edge-shot.mjs <out.json> [--port=8873] [--w=844] [--h=390] [--n=8] [--dsf=2]
//                                   [--shots=<png 前綴>] [--baseline=<git ref，例 db8f301>] [--sweep=<JSON>] [--sweepshots=<前綴>] [--q=<額外查詢字串>]
//
// 為什麼不用 duel-perf 的 lineup 直接截兩張圖比：兩次頁面載入的動畫相位不一樣（idle bob、
// 燈籠閃爍、粒子），逐像素差會被相位噪音淹掉，量到的不是「邊緣線」。這裡改成
// **同一頁、同一幀、同一個 scene graph**：等 8v8 站定之後，在同一個 JS task 裡連續
//   ① bloom.setEdge(false) → render → readPixels
//   ② bloom.setEdge(true)  → render → readPixels
//   ③ 動態載入 v0.34 的 bloom.js，用它 render → readPixels
// rAF 在同一個 task 中間插不進來，所以三張圖的場景狀態逐位元組相同，差異只可能來自 shader。
//   ①②之差＝P-3 的「邊緣線像素佔比」（驗收 1）
//   ①③之差＝「?edge=0 真的關掉了」（驗收 2，比跨載入截圖嚴：容差實質為 0）
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { drive, serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

// 跟 duel-perf.mjs 同一份「最重 8 隻」（GLB 位元組數由大到小），量的是最壞情況
const HEAVY = ['fushou', 'ashcharm', 'wangchuan', 'boartusk', 'shanshen', 'balen', 'yinyangcoin', 'boat'];
const FAC = { fushou: 'xianghuo', ashcharm: 'xianghuo', wangchuan: 'xianghuo', boartusk: 'zuling', shanshen: 'zuling', balen: 'zuling', yinyangcoin: 'yinqi', boat: 'zuling' };
const BLOOM_CFG = { strength: 1.05, threshold: 0.5, knee: 0.3, radius: 1.7, scale: 0.5 }; // ＝js/renderer.js:28 的 BLOOM

const { pos, opt } = parseArgs(process.argv.slice(2));
const [out] = pos;
if (!out) { console.error('need <out.json>'); process.exit(2); }
const port = Number(opt.port || 8873);
const W = Number(opt.w || 844), H = Number(opt.h || 390), DSF = Number(opt.dsf || 2), N = Number(opt.n || 8);
// --baseline=<git ref>：把那個 commit 的 js/bloom.js 撈出來、在同一幀再 render 一次當對照
// （例：--baseline=db8f301）。撈出來的檔案放在 http 根底下才載得到，量完就刪。
const BASE_TMP = path.join(ROOT, 'tests/tools/_bloom-baseline.js');
let BASE_URL = null;
if (opt.baseline) {
  execFileSync('git', ['show', `${opt.baseline}:js/bloom.js`], { cwd: ROOT, stdio: ['ignore', fs.openSync(BASE_TMP, 'w'), 'inherit'] });
  BASE_URL = `http://127.0.0.1:${port}/tests/tools/_bloom-baseline.js`;
}

const srv = await serve(ROOT, port);
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
  let res = null;
  // --sweep=<JSON 陣列>：要掃的門檻組（同一幀套用，見 evaluate 裡的 __edgeSweep）
  if (opt.sweep) {
    await page.addInitScript(`window.__edgeSweep = ${fs.readFileSync(opt.sweep, 'utf8')}; window.__edgeSweepPng = ${opt.sweepshots ? 'true' : 'false'};`);
  }
  // --q=<額外查詢字串>：驗 URL 關閉鉤用（--q=%26edge=0；Git Bash 下 & 要寫成 %26 或整串加引號）
  const r = await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1${opt.q ? decodeURIComponent(String(opt.q)) : ''}`, {
    duels: 1,
    onDuel: async (pg, n) => {
      if (n !== 1) return;
      res = await pg.evaluate(async ({ heavy, fac, N, baseUrl, bloomCfg }) => {
        const Y3 = window.__yaoshi3d;
        const cur = window.__rec.duels[window.__rec.duels.length - 1];
        const units = () => heavy.slice(0, N).map((ab, i) => ({ id: i, body: 'elite', fac: fac[ab], ab }));
        // 用不在真對決裡的兩個座位：真對決的 lunge／burn 打不到合成名冊，量到的是靜態站位
        const others = [0, 1, 2, 3].filter((s) => s !== cur.a && s !== cur.b);
        document.addEventListener('ys:fx-burn', (ev) => ev.stopImmediatePropagation(), true);
        const det = { a: others[0], b: others[1], armies: [{ units: units() }, { units: units() }] };
        document.dispatchEvent(new CustomEvent('ys:duel', { detail: det }));
        await det.ready;
        // v0.34 的 bloom 要**在同步區塊之前**先載好：`await import` 會讓出去跑一輪 rAF，
        // 場景就動了（第一版量到 36% 差異全是這件事，不是 shader）
        let baseMod = null, baseErr = null;
        if (baseUrl) { try { baseMod = await import(baseUrl); } catch (e) { baseErr = String(e); } }
        await new Promise((r) => setTimeout(r, 1600)); // 等每一尊真的對位站好

        const gl = Y3.renderer.getContext();
        const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
        const read = () => { const b = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
        const diff = (a, b) => { // 逐像素最大通道差的直方圖
          const c = { d0: 0, d4: 0, d8: 0, d16: 0, d64: 0 };
          for (let i = 0; i < a.length; i += 4) {
            const m = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
            if (m > 0) c.d0++; if (m > 4) c.d4++; if (m > 8) c.d8++; if (m > 16) c.d16++; if (m > 64) c.d64++;
          }
          return c;
        };
        const B = Y3.bloom;
        // 先讀「渲染迴圈自己算出來的」edge 旗標，再動它——這一欄驗的是 ?edge=0 這個 URL 鉤有沒有生效
        const edgeOnAtDuel = B.edgeOn, urlEdgeOn = Y3.edgeOn, href = location.href;
        const edgeDefaults = B.setEdgeParams({}); // 不帶參數＝只讀回現值
        const progBefore = Y3.renderer.info.programs.length;
        // ── 同一幀連拍（中間沒有任何 update，rAF 插不進來）
        B.setEdge(false); B.render(Y3.scene, Y3.camera); const off = read(); const offPng = Y3.renderer.domElement.toDataURL('image/png');
        B.setEdge(true);
        // --sweep：同一幀掃幾組門檻，一次載入就看得到各組的線像素佔比（調參用；不帶就只量預設值）
        const sweep = [];
        for (const p of (window.__edgeSweep || [])) {
          B.setEdgeParams(p); B.render(Y3.scene, Y3.camera);
          sweep.push({ p: B.setEdgeParams({}), c: diff(off, read()), png: window.__edgeSweepPng ? Y3.renderer.domElement.toDataURL('image/png') : null });
        }
        if (sweep.length) B.setEdgeParams(edgeDefaults); // 掃完還原成 EDGE 的預設值再拍正式那張
        B.render(Y3.scene, Y3.camera); const on = read(); const onPng = Y3.renderer.domElement.toDataURL('image/png');
        const progAfterEdge = Y3.renderer.info.programs.length;
        const edgeDiff = diff(off, on);

        let baseDiff = null, baseDiffOn = null;
        if (baseMod) {
          try {
            const b2 = baseMod.createBloom(Y3.renderer, bloomCfg);
            b2.setSize(window.innerWidth, window.innerHeight);
            b2.render(Y3.scene, Y3.camera);
            const basePx = read();
            baseDiff = diff(off, basePx);   // 應為 0：edge 關掉時新舊逐位元組相同
            baseDiffOn = diff(on, basePx);  // 反面對照：edge 開著時**必須**不為 0，否則這支探針量不到東西
          } catch (e) { baseErr = String(e); }
        }
        return {
          w, h, total: w * h, edgeDiff, baseDiff, baseDiffOn, baseErr, sweep, edgeDefaults, edgeOnAtDuel, urlEdgeOn, href,
          progBefore, progAfterEdge, progAfterBaseline: Y3.renderer.info.programs.length,
          edgeReady: Y3.edgeReady, edgeOn: Y3.edgeOn, bloomOn: Y3.bloomOn, gl: Y3.glName,
          figs: Y3.duelFigures.figuresOf('A').concat(Y3.duelFigures.figuresOf('B')).filter((f) => f.group.visible).length,
          offPng, onPng,
        };
      }, { heavy: HEAVY, fac: FAC, N, baseUrl: BASE_URL, bloomCfg: BLOOM_CFG });
    },
  });
  if (res && opt.sweepshots) {
    fs.mkdirSync(path.dirname(opt.sweepshots), { recursive: true });
    res.sweep.forEach((row, i) => { if (row.png) fs.writeFileSync(`${opt.sweepshots}-${i}.png`, Buffer.from(String(row.png).split(',')[1], 'base64')); delete row.png; });
  }
  if (res && opt.shots) {
    const dir = path.dirname(opt.shots);
    fs.mkdirSync(dir, { recursive: true });
    for (const [k, v] of [['off', res.offPng], ['on', res.onPng]]) {
      fs.writeFileSync(`${opt.shots}-${k}.png`, Buffer.from(String(v).split(',')[1], 'base64'));
    }
  }
  const pct = (c) => res ? +(100 * c / res.total).toFixed(3) : null;
  const summary = res && {
    px: `${res.w}x${res.h}`, total: res.total, figsVisible: res.figs, gl: res.gl,
    edgeReady: res.edgeReady, edgeOn: res.edgeOn, edgeOnAtDuel: res.edgeOnAtDuel, urlEdgeOn: res.urlEdgeOn, href: res.href,
    edgePctD8: pct(res.edgeDiff.d8), edgePctD16: pct(res.edgeDiff.d16), edgeNumD8: res.edgeDiff.d8,
    basePctD0: res.baseDiff ? pct(res.baseDiff.d0) : null, baseNumD0: res.baseDiff ? res.baseDiff.d0 : null,
    baseOnPctD0: res.baseDiffOn ? pct(res.baseDiffOn.d0) : null, baseErr: res.baseErr,
    programs: [res.progBefore, res.progAfterEdge, res.progAfterBaseline],
    sweep: (res.sweep || []).map((s) => ({ ...s.p, pctD8: pct(s.c.d8) })),
  };
  if (res) { delete res.offPng; delete res.onPng; }
  fs.writeFileSync(out, JSON.stringify({ res, summary, errors: r.errors }, null, 1));
  console.log(JSON.stringify({ out, summary, errors: r.errors.length }, null, 1));
  if (r.errors.length) console.log(r.errors.slice(0, 10).join('\n'));
  await browser.close();
} finally { srv.kill(); if (opt.baseline) fs.rmSync(BASE_TMP, { force: true }); }

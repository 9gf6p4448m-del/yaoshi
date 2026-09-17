/* A1 效能診斷・對決側（2026-09-17）：把 gl-frame-probe 的三段頁面端函式（gl-probe-lib.mjs）搬到對決畫面。
 * 前卷（program-churn）在牌桌量到 5 顆 transparent＋DoubleSide 的材質每幀分兩趟畫；同一機制在對決專用的
 * 4 處（腳下水面碟／緣光／漣漪、傳說尊餘暉碟、2D 貼片人形的邊光與地影、殘日基座淡出時）交接為下一候選，
 * 規定「先在對決畫面量、做同幀像素 A/B，再加旗標，不得憑牌桌的結果直接套」。這支就是那個量法。
 * fixture：與 duel-perf.mjs perf 模式同一條路——真實頁面 ?paperwar=1 玩到第 2 場對決，隔離 ys: 事件後派一顆
 * 合成 ys:duel（A 側殘日帶傳說旗標＋3 隻 buoy＋4 隻重型；B 側 2 隻 buoy＋6 隻），等 detail.ready＋600ms 再量。
 * 跑法：node tests/tools/gl-duel-probe.mjs --out=<repo-relative json> [--frames=120] [--pixelAB=1] [--port=8897] [--root=<靜態根>]
 * 這是計數與像素證據，不是 fps 證據；fps 走 duel-perf.mjs perf。 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from './duel-drive.mjs';
import { glProbeInit, scanFrames, pixelABFrame } from './gl-probe-lib.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { pos, opt } = parseArgs(process.argv.slice(2));
const KNOWN = ['out', 'frames', 'pixelAB', 'port', 'root'];
{
  const bad = Object.keys(opt).filter((k) => !KNOWN.includes(k));
  if (bad.length || pos.length) throw new Error(`gl-duel-probe 不吃這些參數：${bad.map((k) => '--' + k).concat(pos).join(' ')}（合法：${KNOWN.map((k) => '--' + k).join(' ')}）`);
}
const port = Number(opt.port || 8897), FRAMES = Number(opt.frames || 120);
const outFile = opt.out && path.resolve(ROOT, opt.out);
if (outFile && path.relative(ROOT, outFile).startsWith('..')) throw new Error('--out must stay inside the repository');
const SRV_ROOT = opt.root ? path.resolve(opt.root) : ROOT;
const { chromium } = (() => {
  for (const c of [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')]) { try { return createRequire(c)('playwright'); } catch { /* 下一個 */ } }
  throw new Error('找不到 playwright：worktree 需要 tools/anyCreature');
})();

/* 合成對決名單：只有 ab==='buoy' 掛水面（creature-figures.js CREATURE_GROUND）、只有殘日 canri 有餘暉碟
   （duel-figures.js LEGEND_KIT.aura='afterglow'）。傳說旗標只掛 A 側（同 duel-perf 的理由：三尊不會兩側同時各有）。 */
const FIXTURE = {
  A: [{ ab: 'canri', fac: 'zuling', body: 'elite', lg: true, sn: '殘日' }, { ab: 'buoy', fac: 'yinqi', body: 'haunt' }, { ab: 'buoy', fac: 'yinqi', body: 'haunt' }, { ab: 'buoy', fac: 'yinqi', body: 'haunt' },
    { ab: 'fushou', fac: 'xianghuo', body: 'elite' }, { ab: 'ashcharm', fac: 'xianghuo', body: 'elite' }, { ab: 'wangchuan', fac: 'xianghuo', body: 'elite' }, { ab: 'boartusk', fac: 'zuling', body: 'elite' }],
  B: [{ ab: 'buoy', fac: 'yinqi', body: 'haunt' }, { ab: 'buoy', fac: 'yinqi', body: 'haunt' }, { ab: 'shanshen', fac: 'zuling', body: 'elite' }, { ab: 'boat', fac: 'zuling', body: 'elite' },
    { ab: 'balen', fac: 'zuling', body: 'elite' }, { ab: 'yinyangcoin', fac: 'yinqi', body: 'elite' }, { ab: 'boartusk', fac: 'zuling', body: 'elite' }, { ab: 'fushou', fac: 'xianghuo', body: 'elite' }],
};

const srv = await serve(SRV_ROOT, port);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
let result = null, driveErrors = [];
try {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await context.addInitScript(glProbeInit);
  const page = await context.newPage();
  const r = await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1`, {
    duels: 2,
    onDuel: async (pg, n) => {
      if (n !== 2) return; // 第 2 場：第 1 場已把 shader 編掉、GLB 進快取（同 duel-perf）
      const setup = await pg.evaluate(async (FIX) => {
        const Y3 = window.__yaoshi3d;
        const cur = window.__rec.duels[window.__rec.duels.length - 1];
        const units = (list) => list.map((u, i) => ({ id: i, body: u.body, fac: u.fac, ab: u.ab, lg: !!u.lg, sn: u.sn || '' }));
        const det = { a: cur.a, b: cur.b, armies: [{ units: units(FIX.A) }, { units: units(FIX.B) }] };
        // 同 duel-perf：把 3D 層與還在跑的真實對決隔開——只放行本治具派的這一顆 ys:duel，其餘 ys: 事件吞掉
        const origDispatch = document.dispatchEvent.bind(document);
        document.dispatchEvent = (ev) => (ev && /^ys:/.test(ev.type) && !ev.__probe ? true : origDispatch(ev));
        const ev0 = new CustomEvent('ys:duel', { detail: det }); ev0.__probe = true;
        const t0 = performance.now();
        origDispatch(ev0);
        await det.ready;
        const loadMs = performance.now() - t0;
        await new Promise((res) => setTimeout(res, 600));
        Y3.renderer.compile(Y3.scene, Y3.camera); Y3.renderer.render(Y3.scene, Y3.camera);
        const figs = Y3.duelFigures.figuresOf('A').concat(Y3.duelFigures.figuresOf('B'));
        return { loadMs: Math.round(loadMs), figures: figs.map((f) => ({ ab: f.ab, skin: f.skin, visible: f.group.visible, water: !!f.group.getObjectByName('ground-water'), legendKit: !!f.group.getObjectByName('legend-kit') })),
          camera: { pos: Y3.camera.position.toArray().map((v) => +v.toFixed(3)), pitchDeg: +(THREE_pitch(Y3.camera)).toFixed(2) } };
        function THREE_pitch(cam) { const d = cam.getWorldDirection(new cam.position.constructor()); return Math.asin(-d.y) * 180 / Math.PI; }
      }, FIXTURE);
      await pg.waitForTimeout(450);
      const scan = await pg.evaluate(scanFrames, FRAMES);
      let pixelAB;
      if (opt.pixelAB) {
        // 對決會呼吸／浮動，三個取樣點各隔 400ms（每個取樣點內部同幀不推進時間）
        pixelAB = [];
        for (let k = 0; k < 3; k++) { if (k) await pg.waitForTimeout(400); pixelAB.push({ sample: k, ...(await pg.evaluate(pixelABFrame)) }); }
      }
      result = { setup, ...scan, pixelAB };
    },
  });
  driveErrors = r.errors || [];
} finally {
  await browser.close().catch(() => {});
  srv.kill();
}
if (!result) throw new Error(`沒量到：沒走到第 2 場對決。errors=${driveErrors.slice(0, 5).join(' | ')}`);
result = { tool: 'tests/tools/gl-duel-probe.mjs', fixture: { url: '?paperwar=1&fxcount=1', duel: 2, viewport: [844, 390], deviceScaleFactor: 2, frames: FRAMES, armies: FIXTURE }, ...result, errors: driveErrors };
delete result.slot; delete result.models;
if (outFile) { fs.mkdirSync(path.dirname(outFile), { recursive: true }); fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n'); }
console.log(JSON.stringify({ setup: result.setup, renderedFrames: result.renderedFrames, rendersPerSec: result.rendersPerSec, programs: result.programs,
  programChurn: result.programChurn && { getParametersPerFrame: result.programChurn.getParametersPerFrame, materialsCalled: result.programChurn.materialsCalled, top: result.programChurn.materials.slice(0, 16).map((m) => ({ material: m.material, type: m.type, callsPerFrame: m.callsPerFrame, changed: m.changedBetweenCalls, userCount: m.userCount, users: m.users.slice(0, 3) })) },
  pixelAB: result.pixelAB, draws: Object.fromEntries(Object.entries(result.glCallsPerFrame).filter(([k]) => /^draw/.test(k))), useProgram: result.glCallsPerFrame.useProgram, textureUploadsPerFrame: result.textureUploadsPerFrame, errors: result.errors }, null, 1));

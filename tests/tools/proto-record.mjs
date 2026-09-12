// 虎爺印原型卷（2026-09-12）：**逐幀**錄一整套招式演出＋量整幀 draw call／三角形，再合成 GIF／WebM。
//
// 為什麼要這一支（blindread-sheet 不夠用）：blindread-sheet 是**盲讀材料**產生器，幀位寫死在
// FRAME_AT（6 格，凍結檔 L4「不得逐招調」），它回答的是「讀者看得懂嗎」。原型卷要回答的是
// 「這個動作看起來對不對」——那要看**連續**畫面，而且要知道哪一幀多了幾個 draw call。
// 兩支各自獨立，本支不碰 blindread-sheet 的任何判準。
//
// 用法：
//   node tests/tools/proto-record.mjs <輸出目錄> --tier=2 [--proto=tigerA] [--trait=biteGamble]
//        [--step=1] [--fps=20] [--port=8871] [--keep] [--nogif]
//   --step  每幾幀存一張（1＝每幀；tier 2 有 54 幀）
//   --fps   GIF／WebM 的播放幀率（實際演出是 60fps，設低於 60 就是慢動作，檔名會標明）
//
// 截圖視口＝844×390 CSS ＋ deviceScaleFactor 2（同 blindread-sheet：那是玩家真的看到的比例，
// 視口拉大會讓人偶佔畫面高度腰斬，見 blindread-sheet.mjs 檔頭 L4-pre 那段）。
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { msOf, TIER_BASE_MS, assertPageConsts, pageConstsFromHtml } from './fx-consts.mjs';
import { casesFromIndex } from './traitfx-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright：worktree 需要 tools/anyCreature 或設 NODE_PATH');
})();

const SHOT = { width: 844, height: 390 };
const SHOT_DSF = 2;
const FIRE_AT = 12;

function parseArgs(argv) {
  const pos = []; const opt = {};
  for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
  return { pos, opt };
}

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

function ffmpegPath() {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ffmpeg'], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim().split(/\r?\n/)[0];
  return null;
}

async function main() {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  const outDir = pos[0] || path.join(ROOT, 'scratchpad', 'proto-record');
  const port = parseInt(opt.port || '8871', 10);
  const tier = parseInt(opt.tier || '2', 10);
  const ms = msOf(tier);
  const dt = 1000 / 60;
  const step = Math.max(1, parseInt(opt.step || '1', 10));
  const fps = parseInt(opt.fps || '20', 10);
  const trait = String(opt.trait || 'biteGamble');
  const proto = String(opt.proto || '');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assertPageConsts(pageConstsFromHtml(html));
  const c = casesFromIndex(html).find((x) => x.trait === trait);
  if (!c) throw new Error(`index.html 的 POOL 裡沒有 trait=${trait}`);

  const frameDir = path.join(outDir, '_frames');
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });

  const srv = await serve(ROOT, port);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const errors = [];
  let rows = [];
  let idle = null;
  try {
    const ctx = await browser.newContext({ viewport: SHOT, deviceScaleFactor: SHOT_DSF });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    const url = `http://127.0.0.1:${port}/tests/tools/traitfx-preview.html?trait=${c.trait}&ab=${c.ab}&body=${c.body}&fac=${c.fac}`
      + `&count=${c.count}&ms=${ms}&tier=${tier}&base=${TIER_BASE_MS}&dt=${dt}${proto ? '&proto=' + proto : ''}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__tfx, null, { timeout: 30000 });
    await page.evaluate(() => window.__tfx.ready);
    await page.addStyleTag({ content: '#hud{display:none!important}' });
    await page.evaluate((n) => window.__tfx.stepA(n), FIRE_AT + 2);
    await page.evaluate(() => window.__tfx.resetB());
    await page.evaluate((n) => window.__tfx.stepB(n), FIRE_AT);
    // 演出前先量一張「靜態基準」：招式帶來的 draw call 增量＝峰值 − 這個值
    idle = await page.evaluate(() => window.__tfx.renderMeasured());
    const fired = await page.evaluate(() => window.__tfx.fire());
    if (!fired.handled) throw new Error(`3D 舞台沒接這一招（handled=false，proto=${proto || '無'}）`);
    const N = Math.ceil(ms / dt) + 4;
    for (let i = 0; i < N; i++) {
      const info = await page.evaluate(() => window.__tfx.renderMeasured());
      rows.push({ i, t: +(i * dt).toFixed(1), calls: info.calls, tris: info.tris, programs: info.programs });
      if (i % step === 0) await page.screenshot({ path: path.join(frameDir, `f${String(i).padStart(4, '0')}.png`) });
      await page.evaluate((n) => window.__tfx.stepB(n), 1);
    }
    await ctx.close();
  } finally { await browser.close(); srv.kill(); }

  const peak = rows.reduce((a, b) => (b.calls > a.calls ? b : a), rows[0]);
  const peakTris = rows.reduce((a, b) => (b.tris > a.tris ? b : a), rows[0]);
  const summary = {
    trait, proto: proto || null, tier, ms, frames: rows.length, step, fps,
    idleCalls: idle ? idle.calls : null, idleTris: idle ? idle.tris : null,
    peakCalls: peak.calls, peakCallsAtFrame: peak.i, peakTris: peakTris.tris, peakTrisAtFrame: peakTris.i,
    programs: peak.programs, errors: errors.length,
  };

  // 合成 GIF／WebM（ffmpeg 不在就留 PNG 序列，並在 summary 標明）
  const tag = `${trait}-${proto || 'base'}-t${tier}`;
  const ff = opt.nogif ? null : ffmpegPath();
  summary.ffmpeg = !!ff;
  if (ff) {
    const pat = path.join(frameDir, 'f%04d.png');
    const pal = path.join(frameDir, 'pal.png');
    const gif = path.join(outDir, `${tag}-${fps}fps.gif`);
    const webm = path.join(outDir, `${tag}-${fps}fps.webm`);
    const run = (args) => spawnSync(ff, args, { encoding: 'utf8' });
    run(['-y', '-framerate', String(fps), '-i', pat, '-vf', 'scale=844:-1:flags=lanczos,palettegen=stats_mode=diff', pal]);
    const g = run(['-y', '-framerate', String(fps), '-i', pat, '-i', pal, '-lavfi', 'scale=844:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', gif]);
    const w = run(['-y', '-framerate', String(fps), '-i', pat, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-pix_fmt', 'yuv420p', webm]);
    summary.gif = fs.existsSync(gif) ? path.relative(ROOT, gif).replace(/\\/g, '/') : null;
    summary.webm = fs.existsSync(webm) ? path.relative(ROOT, webm).replace(/\\/g, '/') : null;
    if (!summary.gif) summary.gifErr = (g.stderr || '').slice(-400);
    if (!summary.webm) summary.webmErr = (w.stderr || '').slice(-400);
    fs.rmSync(pal, { force: true });
  }
  if (!opt.keep && ff) fs.rmSync(frameDir, { recursive: true, force: true });

  fs.writeFileSync(path.join(outDir, `${tag}-record.json`), JSON.stringify({ summary, idle, rows }, null, 1));
  console.log(JSON.stringify(summary));
  if (errors.length) errors.slice(0, 5).forEach((e) => console.log('  ! ' + e.slice(0, 200)));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });

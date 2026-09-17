/* A1 效能診斷：真實頁面每幀 WebGL 呼叫計數（2026-09-17）。
 * 用 addInitScript 把 canvas 的 WebGL context 包成 Proxy，逐幀計數每個 gl.* 方法，並記錄
 * texSubImage2D／texImage2D 的尺寸／格式／型別，另外掃描場景中「同一顆材質同時被
 * instanced／非 instanced、skinned／非 skinned、有／無 instanceColor 的物件共用」的情況——
 * Three 0.158 的 setProgram 對這種共用每幀都會重走 getProgram()（getParameters／cache key）。
 * fixture 與 scratchpad/a1-hover-cpu-profile.mjs 相同：seed 1、初夜出價頁、844×390 DPR2、32 枚、hover slot。
 * 跑法：node tests/tools/gl-frame-probe.mjs --out=<repo-relative json> [--slot=1] [--frames=120] [--port=8896] [--coins=32]
 * 這是計數證據，不是 fps 證據；GPU 端成本看不到。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const argv = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)=(.*)$/); if (!m) throw new Error(`expected --key=value, got ${a}`); return [m[1], m[2]]; }));
const port = Number(argv.port || 8896), slot = Number(argv.slot ?? 1), FRAMES = Number(argv.frames || 120), COINS = Number(argv.coins || 32);
const outFile = argv.out && path.resolve(ROOT, argv.out);
if (outFile && path.relative(ROOT, outFile).startsWith('..')) throw new Error('--out must stay inside the repository');
if (![32, 128].includes(COINS)) throw new Error('--coins 只接受 32 或 128');
const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');

const server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
let result;
try {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await context.addInitScript(() => {
    try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch {}
    const probe = { counts: {}, tex: {}, enabled: false, reset() { this.counts = {}; this.tex = {}; } };
    window.__glProbe = probe;
    // 直接改寫原型方法（不用 Proxy，避免破壞 instanceof／getter 語意）；每個方法只包一次。
    for (const Ctx of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
      if (!Ctx) continue;
      for (const prop of Object.getOwnPropertyNames(Ctx.prototype)) {
        const desc = Object.getOwnPropertyDescriptor(Ctx.prototype, prop);
        if (!desc || typeof desc.value !== 'function' || prop === 'constructor') continue;
        const value = desc.value;
        Ctx.prototype[prop] = function (...args) {
          if (probe.enabled) {
            probe.counts[prop] = (probe.counts[prop] || 0) + 1;
            if (prop === 'texSubImage2D' || prop === 'texImage2D') {
              // texSubImage2D(target, level, x, y, w, h, format, type, src) 或 (target, level, x, y, format, type, src)
              const src = args[args.length - 1];
              const long = prop === 'texSubImage2D' ? args.length >= 9 : args.length >= 9;
              const dims = long ? `${args[prop === 'texSubImage2D' ? 4 : 3]}x${args[prop === 'texSubImage2D' ? 5 : 4]}` : (src && src.width ? `${src.width}x${src.height}` : '?');
              const fmt = long ? args[prop === 'texSubImage2D' ? 6 : 6] : args[args.length - 3];
              const type = long ? args[prop === 'texSubImage2D' ? 7 : 7] : args[args.length - 2];
              const key = `${prop} ${dims} fmt=${fmt} type=${type} src=${src?.constructor?.name || typeof src}`;
              probe.tex[key] = (probe.tex[key] || 0) + 1;
            }
          }
          return value.apply(this, args);
        };
      }
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${String(e)}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
  try { await page.waitForFunction('typeof window.__yaoshi === "object" && !!window.__yaoshi3d', { timeout: 20000 }); }
  catch (e) { throw new Error(`page did not expose __yaoshi3d: ${errors.join(' | ') || String(e)}`); }
  await page.evaluate(() => {
    CFG.T = 1;
    const effects = window.__yaoshi.PW_FX;
    for (const key of Object.keys(effects)) if (/_MS$/.test(key)) effects[key] = 1;
    window.__yaoshi.newGame('solo', 1, ['qingmian']);
  });
  let reached = false;
  for (let i = 0; i < 400 && !reached; i++) {
    await page.waitForTimeout(12);
    const state = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { text: b?.textContent || '', disabled: !b || b.disabled, round: window.__yaoshi.S?.round || 0 }; });
    if (/蓋牌/.test(state.text) && !state.disabled && state.round === 1) { reached = true; break; }
    if (!state.disabled) await page.click('#mainbtn').catch(() => {});
    else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find(b => !b.disabled)?.click());
  }
  if (!reached) throw new Error('did not reach the seed-1 round-1 bid page');
  await page.evaluate(async coins => {
    const tray = window.__yaoshi3d.tray;
    await tray.loaded();
    if (coins === 128) { for (let seat = 0; seat < 4; seat++) for (let s = 0; s < 4; s++) tray.props.bid(seat, s, 8); }
    else for (let seat = 0; seat < 4; seat++) { tray.props.bid(seat, seat, 8); tray.props.mark(seat, seat); }
    await tray.loaded();
  }, COINS);
  await page.waitForTimeout(1100);
  await page.evaluate(() => { const s = window.__yaoshi3d; s.renderer.compile(s.scene, s.camera); s.renderer.render(s.scene, s.camera); });
  await page.waitForTimeout(450);
  await page.evaluate(v => window.__yaoshi3d.tray.setHover(v), slot);
  await page.waitForTimeout(600);

  result = await page.evaluate(async frames => {
    const s = window.__yaoshi3d, info = s.renderer.info, probe = window.__glProbe;
    // 結構掃描：同一顆材質被不同 program 條件的物件共用 → setProgram 每幀 needsProgramChange
    const byMaterial = new Map();
    s.scene.traverseVisible(o => {
      if (!o.isMesh && !o.isSkinnedMesh && !o.isPoints && !o.isLine) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!m) continue;
        if (!byMaterial.has(m)) byMaterial.set(m, []);
        byMaterial.get(m).push({ name: o.name || o.parent?.name || '', type: o.type, instanced: !!o.isInstancedMesh, skinned: !!o.isSkinnedMesh,
          instanceColor: !!o.instanceColor, morph: !!o.geometry?.morphAttributes?.position?.length, vertexColors: !!o.geometry?.attributes?.color });
      }
    });
    const sharedMismatch = [];
    for (const [m, users] of byMaterial) {
      if (users.length < 2) continue;
      const flags = ['instanced', 'skinned', 'instanceColor', 'morph', 'vertexColors'].filter(f => new Set(users.map(u => u[f])).size > 1);
      if (flags.length) sharedMismatch.push({ material: m.name || m.type, uuid: m.uuid.slice(0, 8), mismatch: flags, users: users.map(u => `${u.type}:${u.name}${u.instanced ? '[inst]' : ''}${u.skinned ? '[skin]' : ''}${u.instanceColor ? '[icol]' : ''}`).slice(0, 12), count: users.length });
    }
    // 骨架掃描：可見 SkinnedMesh 各自的 Skeleton 是否其實共用同一組 bone 物件（SkeletonUtils.clone 會逐 mesh 重建骨架）
    const skeletons = new Map(), signatures = new Map();
    s.scene.traverseVisible(o => {
      if (!o.isSkinnedMesh || !o.skeleton) return;
      const sk = o.skeleton;
      if (!skeletons.has(sk)) skeletons.set(sk, { bones: sk.bones.length, meshes: 0, texture: sk.boneTexture ? `${sk.boneTexture.image.width}x${sk.boneTexture.image.height}` : null });
      skeletons.get(sk).meshes++;
      const sig = sk.bones.map(b => b.uuid).join(',') + '|' + sk.boneInverses.map(m => m.elements.map(e => e.toFixed(6)).join(' ')).join(';');
      if (!signatures.has(sig)) signatures.set(sig, { bones: sk.bones.length, skeletons: new Set(), meshes: 0, root: sk.bones[0]?.parent?.name || '' });
      signatures.get(sig).skeletons.add(sk); signatures.get(sig).meshes++;
    });
    const skeletonScan = { visibleSkinnedMeshes: [...skeletons.values()].reduce((n, v) => n + v.meshes, 0), distinctSkeletons: skeletons.size,
      identicalBoneSetGroups: [...signatures.values()].map(g => ({ bones: g.bones, skeletons: g.skeletons.size, meshes: g.meshes, root: g.root })) };
    const programsBefore = info.programs.length, memoryBefore = { ...info.memory };
    probe.reset(); probe.enabled = true;
    const f0 = info.render.frame, t0 = performance.now();
    await new Promise(resolve => { const tick = () => info.render.frame - f0 >= frames ? resolve() : requestAnimationFrame(tick); requestAnimationFrame(tick); });
    const elapsed = performance.now() - t0, rendered = info.render.frame - f0;
    probe.enabled = false;
    const perFrame = Object.fromEntries(Object.entries(probe.counts).map(([k, v]) => [k, +(v / rendered).toFixed(2)]).sort((a, b) => b[1] - a[1]));
    const texPerFrame = Object.fromEntries(Object.entries(probe.tex).map(([k, v]) => [k, +(v / rendered).toFixed(2)]).sort((a, b) => b[1] - a[1]));
    return { slot: s.tray.hover?.() ?? null, renderedFrames: rendered, rendersPerSec: +(rendered / (elapsed / 1000)).toFixed(1),
      programs: { before: programsBefore, after: info.programs.length }, memory: { before: memoryBefore, after: { ...info.memory } },
      materialsInScene: byMaterial.size, sharedMaterialMismatch: sharedMismatch, skeletonScan, glCallsPerFrame: perFrame, textureUploadsPerFrame: texPerFrame,
      models: s.tray.items?.() };
  }, FRAMES);
  // `--disposeRounds=N`：C-1 回歸路徑——同一批拍品清空再擺回 N 輪，記錄每輪 renderer.info.memory；
  // 骨架共用後多出來的 Skeleton 若沒釋放乾淨，textures 會逐輪增加（原 C-1 實測每輪 +50）。
  const disposeRounds = Number(argv.disposeRounds || 0);
  if (disposeRounds > 0) {
    result.disposeRounds = await page.evaluate(async rounds => {
      const s = window.__yaoshi3d, tray = s.tray, info = s.renderer.info;
      const items = tray.items().map(m => ({ key: m.key, curse: m.curse, curseKind: m.curseKind, fac: m.fac, moon: m.moon }));
      const render = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const log = [{ round: 0, ...info.memory }];
      for (let r = 1; r <= rounds; r++) {
        await tray.setItems([]); await render();
        await tray.setItems(items); await tray.loaded(); await render();
        log.push({ round: r, ...info.memory, ready: tray.readyCount() });
      }
      return log;
    }, disposeRounds);
  }
  result = { tool: 'tests/tools/gl-frame-probe.mjs', fixture: { seed: 1, phase: 'round-1 bid', viewport: [844, 390], deviceScaleFactor: 2, coins: COINS, hoverSlot: slot, frames: FRAMES }, ...result, errors };
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
if (outFile) { fs.mkdirSync(path.dirname(outFile), { recursive: true }); fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n'); }
console.log(JSON.stringify({ renderedFrames: result.renderedFrames, rendersPerSec: result.rendersPerSec, programs: result.programs, sharedMaterialMismatch: result.sharedMaterialMismatch,
  textureUploadsPerFrame: result.textureUploadsPerFrame, topCalls: Object.entries(result.glCallsPerFrame).slice(0, 25), errors: result.errors }, null, 1));

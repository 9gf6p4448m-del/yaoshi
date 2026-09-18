/* A3 S6 滿編構圖小卷（2026-09-18）：凍結 #10「遮擋率（legend-presence 量法）每件 ≤ 30%」的量測治具。
 *
 *   node tests/tools/crowd-occl.mjs --key=boat --name=base --out=docs/experiments/2026-09-18-a3-crowd [--port=8975] [--frames=3] [--gap=400]
 *
 * 名冊＝與讀者材料產生器 `a2-sheet.mjs` 情境 2 **逐字相同**（A 側本件 ×3＋重型 5、B 側重型 8；同一個 FAC 表、
 * 同一個 body 取法），量的才是讀者看到的那一場。量法照抄 `legend-presence.mjs`（逐尊換標記色、
 * pass A 只剩它／pass B 全部現身、mask 相減；不走 bloom；停掉主迴圈、幀與幀之間只推 duelFigures.update）。
 * 對 A 側每一個 `ab===key` 的目標尊各量三個數：
 *   occl     ＝ 1 − |vis|/|full|            被**任何**人擋住的比例（凍結 #10 那條）
 *   occlSib  ＝ 1 − |visSib|/|full|         只被**同型兄弟**擋住的比例（pass C：只留同型目標）——疊團的直接量
 *   box      ＝ 螢幕框（同 a2-sheet 的 screenBox），另算兩兩框 IoU
 * 活性同 legend-presence：fullPx ≤ MINPX 的幀 na:true，一尊三幀全 na 這一格 ok:false，**不得當成通過**。
 * 輸出 <out>/occl-<name>-<key>.json ＋ 真實路徑截圖 <out>/occl-<name>-<key>.png（含 bloom，只供肉眼對照）。 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { pos, opt } = parseArgs(process.argv.slice(2));
const KNOWN = ['key', 'name', 'out', 'port', 'frames', 'gap'];
{ const bad = Object.keys(opt).filter((k) => !KNOWN.includes(k)); if (bad.length || pos.length) throw new Error(`crowd-occl 不吃：${bad.map((k) => '--' + k).concat(pos).join(' ')}`); }
const KEY = String(opt.key || ''), NAME = String(opt.name || 'base'), OUT = path.resolve(ROOT, String(opt.out || 'scratchpad/crowd-occl'));
if (!KEY) throw new Error('--key 必填（POOL 的 ab key，如 boat）');
if (path.relative(ROOT, OUT).startsWith('..')) throw new Error('--out must stay inside the repository');
const port = Number(opt.port || 8975);
const FRAMES = Number(opt.frames || 3);
const GAP = Number(opt.gap || 400);
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = (() => {
  for (const c of [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')]) { try { return createRequire(c)('playwright'); } catch { /* 下一個 */ } }
  throw new Error('找不到 playwright：worktree 需要 tools/anyCreature');
})();

/** 頁面端：同 a2-sheet.mjs 的 screenBox（子樹所有 mesh 包圍盒投影成螢幕像素框） */
const screenBox = (root) => {
  const s = window.__yaoshi3d, cam = s.camera; s.scene.updateMatrixWorld(true); cam.updateMatrixWorld(true);
  const V = root.position.constructor; const p = new V(); const xs = [], ys = [];
  const visible = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  root.traverse((o) => {
    if (!visible(o) || !(o.isMesh || o.isSkinnedMesh) || !o.geometry) return;
    if (o.isSkinnedMesh) { o.skeleton?.update(); o.computeBoundingBox?.(); }
    const b = o.isSkinnedMesh ? (o.boundingBox || o.geometry.boundingBox) : (o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox));
    if (!b) return;
    for (const a of [b.min.x, b.max.x]) for (const bY of [b.min.y, b.max.y]) for (const c of [b.min.z, b.max.z]) { p.set(a, bY, c).applyMatrix4(o.matrixWorld).project(cam); xs.push((p.x + 1) / 2 * innerWidth); ys.push((1 - p.y) / 2 * innerHeight); }
  });
  if (!xs.length) return null;
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  return { left: +left.toFixed(1), top: +top.toFixed(1), right: +right.toFixed(1), bottom: +bottom.toFixed(1), width: +(right - left).toFixed(1), height: +(bottom - top).toFixed(1) };
};

/** 頁面端：派名冊（與 a2-sheet 情境 2 逐字相同）＋ 站定 */
const SETUP_FN = `async ({ k }) => {
  const cur = window.__rec.duels[window.__rec.duels.length - 1];
  const FAC = { fushou: 'xianghuo', ashcharm: 'xianghuo', wangchuan: 'xianghuo', boartusk: 'zuling', shanshen: 'zuling', balen: 'zuling', yinyangcoin: 'yinqi', boat: 'zuling', canri: 'zuling', dashiye: 'xianghuo', youyinggong: 'yinqi', buoy: 'yinqi', redhat: 'yinqi', bell: 'xianghuo' };
  const poolItem = POOL.find((it) => (it.ab || it.m) === k) || {}; const fac = poolItem.f || FAC[k] || 'zuling'; const body = (poolItem.unit && poolItem.unit.body) || 'elite';
  const A = [k, k, k, 'fushou', 'ashcharm', 'boartusk', 'shanshen', 'wangchuan'].map((ab, i) => ({ id: i, body: ab === k ? body : 'elite', fac: ab === k ? fac : FAC[ab], ab }));
  const B = ['balen', 'yinyangcoin', 'boartusk', 'fushou', 'ashcharm', 'shanshen', 'wangchuan', 'buoy'].map((ab, i) => ({ id: i, body: ab === 'buoy' ? 'haunt' : 'elite', fac: FAC[ab], ab }));
  const det = { a: cur.a, b: cur.b, armies: [{ units: A }, { units: B }] };
  const origDispatch = document.dispatchEvent.bind(document);
  document.dispatchEvent = (ev) => (ev && /^ys:/.test(ev.type) && !ev.__co ? true : origDispatch(ev));
  const ev0 = new CustomEvent('ys:duel', { detail: det }); ev0.__co = true; origDispatch(ev0);
  await det.ready; await new Promise((res) => setTimeout(res, 1600));
  const D = window.__yaoshi3d.duelFigures;
  return { rosterA: D.figuresOf('A').map((f) => f.ab), rosterB: D.figuresOf('B').map((f) => f.ab), body, fac };
}`;

const PAGE_FN = `async ({ key, frames, gap, MARK, TOL, MINPX, fnBox }) => {
  const Y3 = window.__yaoshi3d;
  const D = Y3.duelFigures;
  const screenBox = new Function('root', fnBox);
  const figsA = D.figuresOf('A');
  const targets = figsA.filter((f) => f.ab === key);
  if (!targets.length) return { error: 'A 側找不到 ab===' + key };
  const all = D.figuresOf('A').concat(D.figuresOf('B'));

  const rAF = window.requestAnimationFrame.bind(window);
  const stopLoop = async () => { window.requestAnimationFrame = () => 0; await new Promise((r) => rAF(() => rAF(r))); };
  const resumeLoop = () => { window.requestAnimationFrame = rAF; };

  const SKIP = /^(faction-fx-|ground-|legend-)/;
  const bodyMeshesOf = (fig) => {
    const out = [];
    (function walk(o) {
      if (o !== fig.group && SKIP.test(o.name || '')) return;
      if (o.name === 'outline') return;
      if (o.isMesh) out.push(o);
      for (const c of o.children) walk(c);
    })(fig.group);
    return out;
  };
  const mark = targets[0].shadow.material.clone();
  mark.color.setHex(MARK);
  mark.transparent = false; mark.opacity = 1; mark.depthWrite = true; mark.depthTest = true;
  mark.fog = false; mark.toneMapped = false; mark.side = 2;
  mark.needsUpdate = true;

  const cv = Y3.renderer.domElement;
  const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height;
  const ctx = c2.getContext('2d', { willReadFrequently: true });
  const W = cv.width, H = cv.height;
  const shoot = () => {
    Y3.renderer.setRenderTarget(null);
    Y3.renderer.render(Y3.scene, Y3.camera);
    ctx.clearRect(0, 0, W, H); ctx.drawImage(cv, 0, 0);
    const d = ctx.getImageData(0, 0, W, H).data;
    const r0 = (MARK >> 16) & 255, g0 = (MARK >> 8) & 255, b0 = MARK & 255;
    const set = new Uint8Array(W * H); let n = 0;
    for (let i = 0, p = 0; i < set.length; i++, p += 4) {
      if (Math.abs(d[p] - r0) <= TOL && Math.abs(d[p + 1] - g0) <= TOL && Math.abs(d[p + 2] - b0) <= TOL) { set[i] = 1; n++; }
    }
    return { set, n };
  };
  const hide = (list) => { for (const f of list) { f.__coKids = f.group.children.map((c) => c.visible); f.group.children.forEach((c) => { c.visible = false; }); if (f.shadow && f.shadow.material) { f.__coShadow = f.shadow.material.colorWrite; f.shadow.material.colorWrite = false; } } };
  const show = (list) => { for (const f of list) { if (f.__coKids) f.group.children.forEach((c, i) => { c.visible = f.__coKids[i] !== undefined ? f.__coKids[i] : true; }); if (f.shadow && f.shadow.material && f.__coShadow !== undefined) f.shadow.material.colorWrite = f.__coShadow; f.__coKids = null; f.__coShadow = undefined; } };

  await stopLoop();
  const perTarget = targets.map(() => ({ samples: [] }));
  const fullMasks = [];
  for (let k = 0; k < frames; k++) {
    if (k) { const N = Math.max(1, Math.round(gap / 16)); for (let s = 0; s < N; s++) D.update(16 / 1000, performance.now() + k * gap + s * 16); }
    const masksThisFrame = [];
    for (let t = 0; t < targets.length; t++) {
      const fig = targets[t];
      const bm = bodyMeshesOf(fig);
      if (!bm.length) { perTarget[t].samples.push({ frame: k, na: true, error: 'no body mesh' }); masksThisFrame.push(null); continue; }
      const orig = bm.map((m) => m.material);
      bm.forEach((m) => { m.material = mark; });
      const others = all.filter((f) => f !== fig);
      const nonSib = others.filter((f) => !(f.ab === key && figsA.includes(f)));
      hide(others); const A = shoot(); show(others);
      hide(nonSib); const C = shoot(); show(nonSib);
      const B = shoot();
      bm.forEach((m, i) => { m.material = orig[i]; });
      let visN = 0, visSib = 0;
      for (let i = 0; i < A.set.length; i++) if (A.set[i]) { if (B.set[i]) visN++; if (C.set[i]) visSib++; }
      const na = A.n <= MINPX;
      perTarget[t].samples.push({ frame: k, na, fullPx: A.n, visPx: visN, visSibPx: visSib,
        occl: A.n ? +(1 - visN / A.n).toFixed(4) : null,
        occlSib: A.n ? +(1 - visSib / A.n).toFixed(4) : null,
        box: screenBox(fig.group), x: +fig.group.position.x.toFixed(3), z: +fig.group.position.z.toFixed(3), rotY: +fig.group.rotation.y.toFixed(3), scale: +fig.group.scale.y.toFixed(4) });
      masksThisFrame.push(A);
    }
    fullMasks.push(masksThisFrame);
  }
  resumeLoop();
  mark.dispose();
  // 同型兩兩：full mask 交集 / 較小者（疊團的直接量，第 0 幀）
  const pairs = [];
  const m0 = fullMasks[0];
  for (let a = 0; a < targets.length; a++) for (let b = a + 1; b < targets.length; b++) {
    const A = m0[a], B = m0[b]; if (!A || !B || !A.n || !B.n) { pairs.push({ a, b, overlap: null }); continue; }
    let inter = 0; for (let i = 0; i < A.set.length; i++) if (A.set[i] && B.set[i]) inter++;
    pairs.push({ a, b, overlap: +(inter / Math.min(A.n, B.n)).toFixed(4) });
  }
  return { targets: perTarget.map((p, t) => ({ ab: targets[t].ab, idx: t, samples: p.samples })), pairs, canvasW: W, canvasH: H };
}`;

const srv = await serve(ROOT, port);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const out = { tool: 'tests/tools/crowd-occl.mjs', key: KEY, name: NAME, viewport: [844, 390], deviceScaleFactor: 2, frames: FRAMES, gap: GAP, errors: [] };
try {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await context.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch {} });
  const page = await context.newPage();
  page.on('pageerror', (e) => out.errors.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') out.errors.push('console: ' + m.text()); });
  let measured = null;
  await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1`, {
    duels: 2,
    onDuel: async (pg, n) => {
      if (n !== 2) return;
      // 字串→函式（同 legend-presence.mjs:250）：直接把字串交給 evaluate 只會求值成一個函式物件、不會呼叫它
      out.setup = await pg.evaluate(new Function('return (' + SETUP_FN + ')')(), { k: KEY });
      await pg.screenshot({ path: path.join(OUT, `occl-${NAME}-${KEY}.png`) });
      measured = await pg.evaluate(new Function('return (' + PAGE_FN + ')')(), { key: KEY, frames: FRAMES, gap: GAP, MARK: 0x990099, TOL: 24, MINPX: 3000, fnBox: `return (${screenBox.toString()})(root);` });
    },
  });
  if (!measured) throw new Error('沒量到第 2 場對決');
  if (measured.error) throw new Error(measured.error);
  Object.assign(out, measured);
  // 每尊：三幀取 max（最嚴）；全 na → ok:false
  out.summary = out.targets.map((t) => {
    const live = t.samples.filter((s) => !s.na && s.occl != null);
    const occlMax = live.length ? Math.max(...live.map((s) => s.occl)) : null;
    const occlSibMax = live.length ? Math.max(...live.map((s) => s.occlSib)) : null;
    return { ab: t.ab, idx: t.idx, live: live.length, occlMax, occlSibMax, ok: live.length > 0 && occlMax <= 0.30 };
  });
  out.allOk = out.summary.every((s) => s.ok);
  out.pairOverlapMax = out.pairs.length ? Math.max(...out.pairs.map((p) => p.overlap == null ? 1 : p.overlap)) : null;
} finally {
  await browser.close().catch(() => {});
  srv.kill();
}
fs.writeFileSync(path.join(OUT, `occl-${NAME}-${KEY}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ key: KEY, name: NAME, summary: out.summary, pairOverlapMax: out.pairOverlapMax, allOk: out.allOk, errors: out.errors }));

/* A2 S6「冥婚紅包」造型治具（2026-09-17）：對一個 `js/table-tray.js` 版本一次拍出五張真實頁面截圖＋硬指標 JSON。
 *
 * 方案變體不改產品碼：`--js=<table-tray.js 副本>` 時建一個靜態覆蓋根——`js/` 整個複製一份並換掉 `table-tray.js`，
 * 其餘目錄用 junction 指回 repo（`tools`／`node_modules`／`scratchpad`／`.` 開頭一律跳過，worktree 的 `tools` 是 junction、頁面也用不到），
 * 遊戲照原本 `./table-tray.js?v=<VERSION>` 路徑載入，看到的就是變體。這支**不寫任何產品檔**。
 *
 * 拍五張（全部走真實的 seed-1 solo 第一夜出價頁，用 `window.fx3d('ys:market', …)` 把四格擺上）：
 *   table-<name>.png   844×390 DSF2、四格都是 wedding、hover slot1（抬升＋描邊）
 *   side-<name>.png    同視口同四件，托盤轉到側面（+90°）
 *   mobile-<name>.png  852×393 iPhone 14 Pro、safe 0/59/21/59、四格都是 wedding
 *   lineup1-<name>.png generic／guava／water／lock 並排（圖上不標名稱，給盲讀指認用）
 *   lineup2-<name>.png tiger／boat／wedding 並排（第 4 格刻意空著）
 * 對照表另存 `<out>/lineup-key.json`。
 *
 * ★自轉為什麼用 pin 而不是等 hover 自轉★：`tray` 沒有公開設定 spin 的 API，hover 自轉是
 * `s.spin += HOVER_SPIN * dt` ⇒ 角度隨「等了幾毫秒」而變，同一份幾何兩次跑會拍到不同角度、
 * 三案之間也對不齊。所以包一層 `tray.update`，每幀之後把四個占位 group 的 `rotation.y`
 * 釘在「靜止時的基準 yaw ＋ off」（off=0 正面、off=π/2 側面）。只在治具的 page context 裡改，產品碼零 diff。
 *
 * 跑法：node tests/tools/a2-curse-sheet.mjs --name=base [--js=docs/.../variants/a/table-tray.js] --out=docs/experiments/2026-09-17-a2-wedding [--port=9201]
 * 輸出：上面五張 png ＋ metrics-<name>.json（含 renderer.info 的 calls／triangles、每格詛咒 mesh 的三角形數、errors）。
 * 這是截圖與計數證據，不是 fps 證據。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { pos, opt } = parseArgs(process.argv.slice(2));
const KNOWN = ['js', 'name', 'out', 'port'];
{ const bad = Object.keys(opt).filter((k) => !KNOWN.includes(k)); if (bad.length || pos.length) throw new Error('a2-curse-sheet 不吃：' + bad.map((k) => '--' + k).concat(pos).join(' ')); }
const NAME = String(opt.name || 'base');
const OUT = path.resolve(ROOT, String(opt.out || 'scratchpad/a2-curse-sheet'));
if (path.relative(ROOT, OUT).startsWith('..')) throw new Error('--out must stay inside the repository');
const port = Number(opt.port || 9201);
fs.mkdirSync(OUT, { recursive: true });
const { chromium, devices } = (() => {
  for (const c of [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')]) { try { return createRequire(c)('playwright'); } catch { /* 下一個 */ } }
  throw new Error('找不到 playwright：worktree 需要 tools/anyCreature');
})();

/** 靜態覆蓋根：只把 js/ 複製一份並換掉 table-tray.js，其餘目錄用 junction 指回 repo。 */
function buildOverlayRoot(jsPath) {
  const root = path.join(ROOT, 'scratchpad', 'a2-curse-root-' + NAME);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  const junction = (target, link) => { const r = spawnSync('cmd', ['/c', 'mklink', '/J', link, target], { stdio: 'ignore' }); if (r.status !== 0) throw new Error('mklink /J 失敗：' + link); };
  for (const ent of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (ent.name === 'js' || ent.name === 'scratchpad' || ent.name === 'tools' || ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
    if (ent.isDirectory() || (ent.isSymbolicLink() && fs.statSync(path.join(ROOT, ent.name)).isDirectory())) junction(path.join(ROOT, ent.name), path.join(root, ent.name));
    else fs.copyFileSync(path.join(ROOT, ent.name), path.join(root, ent.name));
  }
  fs.cpSync(path.join(ROOT, 'js'), path.join(root, 'js'), { recursive: true });
  const src = path.resolve(ROOT, jsPath);
  if (!fs.existsSync(src)) throw new Error('--js 指的檔不存在：' + src);
  fs.copyFileSync(src, path.join(root, 'js', 'table-tray.js'));
  return root;
}
const SRV_ROOT = opt.js ? buildOverlayRoot(String(opt.js)) : ROOT;

const WEDDING4 = [0, 1, 2, 3].map(() => ({ key: null, curse: true, curseKind: 'wedding', fac: null }));
const KINDS1 = ['generic', 'guava', 'water', 'lock'];
const KINDS2 = ['tiger', 'boat', 'wedding'];
const itemsOf = (kinds) => kinds.map((k) => ({ key: null, curse: true, curseKind: k, fac: null }));

/** 頁面端共用片段（字串注入：page.evaluate 的函式不能閉包外部變數）。 */
const PAGE_LIB = `
  const meshCount = (root) => { let n = 0; root.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh) && o.geometry) n++; }); return n; };
  const piles = () => window.__yaoshi3d.tray.group.children.filter((o) => o.isObject3D && !o.name && meshCount(o))
    .slice().sort((p, q) => p.position.x - q.position.x);
  const triOf = (root) => { let t = 0; root.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position) t += o.geometry.attributes.position.count / 3; }); return t; };
  /* 造型本體（'tray-curse'）的**設計座標**包圍盒：group 的 scale／rotation 掛在上一層，
     所以這裡量到的就是 addXxx 寫死的那組數字，可以直接跟「footprint ±0.25、高 ≤0.35」對。 */
  const bboxOf = (root) => { let bb = null; root.traverse((o) => { if (o.isMesh && o.geometry && o.name === 'tray-curse') { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; bb = { min: b.min.toArray().map((v) => +v.toFixed(4)), max: b.max.toArray().map((v) => +v.toFixed(4)) }; } }); return bb; };
`;

/** 把四格擺上、跑到靜止、再把自轉釘死（見檔頭「自轉為什麼用 pin」）。 */
const setUp = async (page, items, round) => {
  await page.evaluate(({ items, round, lib }) => {
    const src = 'return (async () => {' + lib + `
      const tray = window.__yaoshi3d.tray;
      if (window.__a2pin) window.__a2pin.off();
      await tray.setItems([]); await tray.loaded();
      tray.setHover(-1);
      window.fx3d('ys:market', { round: ROUND, items: ITEMS });
      await tray.loaded();
      await new Promise((r) => setTimeout(r, 600));
      const base = new Map(piles().map((o) => [o, o.rotation.y]));
      const orig = tray.update.bind(tray);
      let off = 0;
      tray.update = (dt) => { const r = orig(dt); for (const o of piles()) o.rotation.y = (base.has(o) ? base.get(o) : 0) + off; return r; };
      window.__a2pin = { set(v) { off = v; }, off() { tray.update = orig; window.__a2pin = null; } };
    })();`;
    return new Function(src.replace('ROUND', String(round)).replace('ITEMS', JSON.stringify(items)))();
  }, { items, round, lib: PAGE_LIB });
  await page.waitForTimeout(400);
};

const snapshot = (page) => page.evaluate((lib) => new Function('return (() => {' + lib + `
    const s = window.__yaoshi3d, info = s.renderer.info;
    info.autoReset = false; info.reset(); s.renderer.render(s.scene, s.camera);
    const calls = info.render.calls, tris = info.render.triangles; info.autoReset = true;
    return { calls, tris,
      slots: piles().map((o) => ({ x: +o.position.x.toFixed(3), curseKind: o.userData.curseKind || null, triangles: triOf(o), rotY: +o.rotation.y.toFixed(4), bbox: bboxOf(o) })),
      items: s.tray.items().map((i) => ({ slot: i.slot, curseKind: i.curseKind, ready: i.ready, visible: i.visible })) };
  })();`)(), PAGE_LIB);

/** 真實的 seed-1 solo 第一夜出價頁（同 a2-sheet.mjs 的走法）。 */
async function toBid(page) {
  await page.evaluate(() => { CFG.T = 1; const fx = window.__yaoshi.PW_FX; for (const k of Object.keys(fx)) if (/_MS$/.test(k)) fx[k] = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 400; i++) {
    await page.waitForTimeout(12);
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { text: b ? b.textContent : '', disabled: !b || b.disabled, round: (window.__yaoshi.S && window.__yaoshi.S.round) || 0 }; });
    if (/蓋牌/.test(st.text) && !st.disabled && st.round === 1) return;
    if (!st.disabled) await page.click('#mainbtn').catch(() => {});
    else await page.evaluate(() => { const b = [...document.querySelectorAll('#stage button')].find((x) => !x.disabled); if (b) b.click(); });
  }
  throw new Error('did not reach the seed-1 round-1 bid page');
}

const srv = await serve(SRV_ROOT, port);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const metrics = { tool: 'tests/tools/a2-curse-sheet.mjs', name: NAME, js: opt.js || 'js/table-tray.js', shots: {}, errors: [] };
const hook = (page, tag) => {
  page.on('pageerror', (e) => metrics.errors.push(tag + ' pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') metrics.errors.push(tag + ' console: ' + m.text()); });
};
try {
  // ── 桌面 844×390 DSF2：table／side／lineup1／lineup2 ──────────────────
  {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    await context.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) { /* 無痕模式 */ } });
    const page = await context.newPage();
    hook(page, 'desktop');
    await page.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'load' });
    await page.waitForFunction('typeof window.__yaoshi === "object" && !!window.__yaoshi3d', null, { timeout: 30000 });
    await toBid(page);

    await setUp(page, WEDDING4, 10001);
    await page.evaluate(() => window.__yaoshi3d.tray.setHover(1));
    await page.waitForTimeout(700);
    metrics.shots.table = Object.assign(await snapshot(page), { viewport: [844, 390], dsf: 2, hoverSlot: 1, rotationOffsetDeg: 0 });
    await page.screenshot({ path: path.join(OUT, 'table-' + NAME + '.png') });

    await page.evaluate(() => { window.__yaoshi3d.tray.setHover(-1); window.__a2pin.set(Math.PI / 2); });
    await page.waitForTimeout(700);
    metrics.shots.side = Object.assign(await snapshot(page), { viewport: [844, 390], dsf: 2, hoverSlot: -1, rotationOffsetDeg: 90 });
    await page.screenshot({ path: path.join(OUT, 'side-' + NAME + '.png') });

    for (const [tag, kinds, round] of [['lineup1', KINDS1, 10002], ['lineup2', KINDS2, 10003]]) {
      await setUp(page, itemsOf(kinds), round);
      await page.waitForTimeout(400);
      metrics.shots[tag] = Object.assign(await snapshot(page), { viewport: [844, 390], dsf: 2, hoverSlot: -1, rotationOffsetDeg: 0, kinds });
      await page.screenshot({ path: path.join(OUT, tag + '-' + NAME + '.png') });
    }
    await context.close();
  }
  // ── 手機 852×393 safe 0/59/21/59 ──────────────────────────────────────
  {
    const context = await browser.newContext(Object.assign({}, devices['iPhone 14 Pro'], { viewport: { width: 852, height: 393 } }));
    await context.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) { /* 無痕模式 */ } });
    const page = await context.newPage();
    hook(page, 'mobile');
    await page.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'load' });
    await page.waitForFunction('typeof window.__yaoshi === "object" && !!window.__yaoshi3d', null, { timeout: 30000 });
    await toBid(page);
    await page.evaluate(() => ['top', 'right', 'bottom', 'left'].forEach((side, i) => document.documentElement.style.setProperty('--safe-' + side, [0, 59, 21, 59][i] + 'px')));
    await page.waitForFunction(() => { const n = document.querySelector('#north'); return n && n.getBoundingClientRect().left >= 59; });
    await setUp(page, WEDDING4, 10004);
    await page.evaluate(() => window.__yaoshi3d.tray.setHover(1));
    await page.waitForTimeout(700);
    metrics.shots.mobile = Object.assign(await snapshot(page), { viewport: [852, 393], safe: [0, 59, 21, 59], hoverSlot: 1, rotationOffsetDeg: 0 });
    await page.screenshot({ path: path.join(OUT, 'mobile-' + NAME + '.png') });
    await context.close();
  }
} finally { await browser.close().catch(() => {}); srv.kill(); }
fs.writeFileSync(path.join(OUT, 'lineup-key.json'), JSON.stringify({
  note: 'lineup1／lineup2 兩張圖上刻意不標名稱（盲讀指認用）；本檔是答案，讀者不要先看。左→右＝畫面上的左→右。',
  lineup1: KINDS1, lineup2: KINDS2,
  names: { generic: '符紙堆（無 kind 的預設）', guava: '魔神仔的芭樂', water: '抓交替水符', lock: '縛靈鎖', tiger: '白虎煞', boat: '王船煞', wedding: '冥婚紅包' },
}, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'metrics-' + NAME + '.json'), JSON.stringify(metrics, null, 2) + '\n');
console.log(JSON.stringify({ out: path.relative(ROOT, OUT), name: NAME, shots: Object.fromEntries(Object.entries(metrics.shots).map(([k, v]) => [k, { calls: v.calls, tris: v.tris, slots: v.slots.map((s) => s.curseKind + ':' + s.triangles) }])), errors: metrics.errors }, null, 1));
if (metrics.errors.length) process.exitCode = 1;

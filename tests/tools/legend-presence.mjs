/* 傳說三尊「請神存在感」卷 G1／G2 量測治具（凍結檔 docs/experiments/2026-09-13-acceptance-legend-presence.md §2）
 *
 *   node tests/tools/legend-presence.mjs <outdir> [--legends=canri,dashiye,youyinggong]
 *        [--port=9601] [--root=<靜態根目錄>] [--frames=3] [--gap=400] [--seed=7] [--shots]
 *
 * 量什麼：滿編 8v8（一側含 1 尊傳說）之下，那一尊**生物本體**的螢幕剪影被前方物件遮擋的比例。
 *
 * 量法（凍結檔 §2 G1，逐尊渲染 mask 相減）：
 *   1) 目標尊的本體 mesh 換成一顆平塗標記色（0x990099、`toneMapped:false`、`fog:false`、`DoubleSide`）。
 *      **排除**：描邊外殼（`name==='outline'`）、三系粒子（`faction-fx-*`）、腳下環境（`ground-*`）、
 *      本卷新加的基座／光效／名牌（`legend-*`）——剪影只算生物本體，基座不得灌水（這讓判定**更嚴**，
 *      不是更鬆：基座是本卷新加的大塊像素，算進去會把遮擋比例稀釋掉）。
 *   2) pass A：其餘尊全部隱形（子節點 `visible=false`＋影子 `colorWrite=false`；**不動 `f.group.visible`**
 *      ——主迴圈每幀會把它寫回 true，動它等於沒動）→ 取標記色像素集合 `full`。
 *   3) pass B：全部現身，目標尊仍是標記色 → 取標記色像素集合 `vis`。
 *   4) occl = 1 − |vis| / |full|；頭部＝`full` 包圍盒上緣起 25% 高度那一條帶，同法算 occlHead。
 *
 * 兩件讓這個量測站得住的決定：
 *   ・**mask pass 走 `renderer.render()` 而不是 `bloom.render()`**：遮擋是幾何事實，
 *     bloom 是全畫面 fill，會把鄰近亮部溢到標記色上、讓同一顆像素在兩個 pass 都落在容差外。
 *     兩個 pass 一致地不開 bloom，量到的才是「誰擋住誰」。畫面交付物另外用真實路徑截圖。
 *   ・**量測期間把遊戲主迴圈停掉**（把 `window.requestAnimationFrame` 換成 no-op，
 *     js/renderer.js:260 的續跑就斷了），自己 render 一次立刻 `drawImage` 讀像素——
 *     不停迴圈的話兩個 pass 之間人形已經動過，相減出來的是動畫差、不是遮擋。
 *     停掉迴圈另外擋住一個假訊號：真實對決的 `ys:duel-end` 會把鏡頭 goto 回牌桌機位
 *     （camera-director.js:306），量到一半換機位的話後面幾幀量的是另一個畫面。
 *     迴圈停著時鏡頭凍住，幀與幀之間的動畫改由**直接呼叫 `duelFigures.update(dt, now)`** 推進
 *     （只動人形，不動鏡頭）——三幀因此是「同一個機位、不同的動作」。
 *
 * 活性（凍結檔）：`fullPx > 3000`（1688×780 上）才算量到東西，否則這一幀 `na:true`；
 * 一尊三幀全 na ＝ 這一格紅（`ok:false`），**不得當成通過**。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from './duel-drive.mjs';
import { createRequire } from 'node:module';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright：worktree 需要 tools/anyCreature 或設 NODE_PATH');
})();

/* body／fac／count／sn 逐格對齊 index.html 的 LEGENDS 表（治具是合成 ys:duel，不走 pwArmyView，
   所以這裡要自己帶；帶錯 sn 的話名牌會落到 makeLegendKit 的 fallback「尊」，那是假綠的來源之一）。 */
const LEGEND_META = {
  canri: { body: 'elite', fac: 'zuling', count: 1, sn: '殘日' },
  dashiye: { body: 'ward', fac: 'xianghuo', count: 1, sn: '大士爺' },
  youyinggong: { body: 'haunt', fac: 'yinqi', count: 2, sn: '有應公' },
};
// 陪打的 7（或 6）隻：固定名單、固定順序，兩個版本用同一份（改前改後才比得起來）
const FILLER = [
  { ab: 'tiger_c', body: 'elite', fac: 'xianghuo' },
  { ab: 'shanshen', body: 'ward', fac: 'zuling' },
  { ab: 'redhat', body: 'haunt', fac: 'yinqi' },
  { ab: 'sword', body: 'elite', fac: 'zuling' },
  { ab: 'fushou', body: 'ward', fac: 'xianghuo' },
  { ab: 'eye', body: 'elite', fac: 'yinqi' },
  { ab: 'wangchuan', body: 'ward', fac: 'xianghuo' },
  { ab: 'bell', body: 'elite', fac: 'xianghuo' },
];

const { pos, opt } = parseArgs(process.argv.slice(2));
const OUTDIR = pos[0];
if (!OUTDIR) { console.error('need <outdir>'); process.exit(2); }
for (const k of Object.keys(opt)) {
  if (!['legends', 'port', 'root', 'frames', 'gap', 'seed'].includes(k)) { console.error('不支援的旗標：--' + k); process.exit(2); }
}
const LEGENDS = String(opt.legends || 'canri,dashiye,youyinggong').split(',').filter(Boolean);
const PORT = Number(opt.port || 9601);
const FRAMES = Number(opt.frames || 3);
const GAP = Number(opt.gap || 400);
const SEED = String(opt.seed || 7);
const SRC_ROOT = opt.root ? path.resolve(opt.root) : ROOT;
fs.mkdirSync(OUTDIR, { recursive: true });

/* ── 頁面端：整段量測（在瀏覽器裡跑，回傳純資料） ───────────────────────────── */
/** 第一段：派合成的 8v8 ys:duel、等 GLB 到齊、等站定。之後 Node 那側先截一張真實路徑（含 bloom）的畫面。 */
const SETUP_FN = `async ({ legend, meta, filler }) => {
  const cur = window.__rec.duels[window.__rec.duels.length - 1];
  /* ★把 3D 層與還在跑的真實對決隔開★：不隔的話量到一半，真實時間軸的 ys:fx-burn／ys:duel-end／
     下一場 ys:duel 會把我們排好的 8v8 燒掉、收掉、換掉（首版實測：canri 的 shadow.visible 已是 false、
     標記色像素 0）。作法＝攔住 document.dispatchEvent 上所有 ys: 事件，只讓本治具自己派的那一顆過。
     改前改後兩版用同一套隔離，量到的才是同一件事。 */
  const origDispatch = document.dispatchEvent.bind(document);
  document.dispatchEvent = (ev) => (ev && /^ys:/.test(ev.type) && !ev.__lp ? true : origDispatch(ev));
  // ── 名冊：A 側＝傳說 ＋ 陪打；B 側＝陪打 8。總數固定 8（＝ PW_FX.MAXFIG 的場上上限）──
  const need = 8 - meta.count;
  const unitsA = [];
  for (let k = 0; k < meta.count; k++) unitsA.push({ id: unitsA.length, body: meta.body, fac: meta.fac, ab: legend, lg: true, sn: meta.sn });
  for (let k = 0; k < need; k++) { const f = filler[k]; unitsA.push({ id: unitsA.length, body: f.body, fac: f.fac, ab: f.ab }); }
  const unitsB = filler.slice(0, 8).map((f, i) => ({ id: i, body: f.body, fac: f.fac, ab: f.ab }));
  const det = { a: cur.a, b: cur.b, armies: [{ units: unitsA }, { units: unitsB }], maxFig: 8 };
  const ev = new CustomEvent('ys:duel', { detail: det });
  ev.__lp = true;
  origDispatch(ev);
  await det.ready;
  await new Promise((r) => setTimeout(r, 1600)); // 站定（realign＋排法鎖點＋GLB 就位）
  const D = window.__yaoshi3d.duelFigures;
  return { rosterA: D.figuresOf('A').map((f) => f.ab), rosterB: D.figuresOf('B').map((f) => f.ab) };
}`;

const PAGE_FN = `async ({ frames, gap, MARK, TOL, MINPX, HEAD }) => {
  const Y3 = window.__yaoshi3d;
  const D = Y3.duelFigures;
  const fig = D.figureOf('A', 0);
  if (!fig) return { error: '拿不到 A 側第 0 尊（figureOf 回 null）' };

  // ── 主迴圈開關：換掉 rAF，renderer.js 的續跑就接不下去（不動 document.hidden，
  //    免得 index.html:2188／:2222 的 audioWake／checkForUpdate 跟著被叫起來製造雜訊）──
  const rAF = window.requestAnimationFrame.bind(window);
  const stopLoop = async () => {
    window.requestAnimationFrame = () => 0;
    await new Promise((r) => rAF(() => rAF(r))); // 已排隊的那一幀跑完，它的續跑會打在 no-op 上
  };
  const resumeLoop = () => { window.requestAnimationFrame = rAF; };

  const SKIP = /^(faction-fx-|ground-|legend-)/;
  /** 目標尊的「生物本體」mesh（排除描邊外殼／粒子／腳下環境／本卷新加的基座光效名牌） */
  const bodyMeshes = (() => {
    const out = [];
    (function walk(o) {
      if (o !== fig.group && SKIP.test(o.name || '')) return;
      if (o.name === 'outline') return;
      if (o.isMesh) out.push(o);
      for (const c of o.children) walk(c);
    })(fig.group);
    return out;
  })();
  if (!bodyMeshes.length) return { error: '目標尊底下找不到任何本體 mesh' };

  // 標記材質：拿影子那顆 MeshBasicMaterial clone（頁面裡拿不到 THREE 命名空間）
  const mark = fig.shadow.material.clone();
  mark.color.setHex(MARK);
  mark.transparent = false; mark.opacity = 1; mark.depthWrite = true; mark.depthTest = true;
  mark.fog = false; mark.toneMapped = false; mark.side = 2; // DoubleSide
  mark.needsUpdate = true;

  const others = [];
  for (const s of ['A', 'B']) for (const f of D.figuresOf(s)) if (f !== fig) others.push(f);

  const cv = Y3.renderer.domElement;
  const c2 = document.createElement('canvas');
  c2.width = cv.width; c2.height = cv.height;
  const ctx = c2.getContext('2d', { willReadFrequently: true });
  const W = cv.width, H = cv.height;

  /** render 一次（不走 bloom）＋ 立刻把畫面搬到 2D canvas 讀像素，回傳標記色的 mask 與包圍盒 */
  const shoot = () => {
    Y3.renderer.setRenderTarget(null); // bloom.render 之後可能還指著離屏 RT，不歸零會把畫面畫到別的地方
    Y3.renderer.render(Y3.scene, Y3.camera);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(cv, 0, 0);
    const d = ctx.getImageData(0, 0, W, H).data;
    const r0 = (MARK >> 16) & 255, g0 = (MARK >> 8) & 255, b0 = MARK & 255;
    const set = new Uint8Array(W * H);
    let n = 0, minX = W, maxX = -1, minY = H, maxY = -1;
    for (let i = 0, p = 0; i < set.length; i++, p += 4) {
      if (Math.abs(d[p] - r0) <= TOL && Math.abs(d[p + 1] - g0) <= TOL && Math.abs(d[p + 2] - b0) <= TOL) {
        set[i] = 1; n++;
        const x = i % W, y = (i / W) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    return { set, n, minX, maxX, minY, maxY };
  };

  const hideOthers = () => {
    for (const f of others) {
      f.__lpKids = f.group.children.map((c) => c.visible);
      f.group.children.forEach((c) => { c.visible = false; });
      if (f.shadow && f.shadow.material) { f.__lpShadow = f.shadow.material.colorWrite; f.shadow.material.colorWrite = false; }
    }
  };
  const showOthers = () => {
    for (const f of others) {
      if (f.__lpKids) f.group.children.forEach((c, i) => { c.visible = f.__lpKids[i] !== undefined ? f.__lpKids[i] : true; });
      if (f.shadow && f.shadow.material && f.__lpShadow !== undefined) f.shadow.material.colorWrite = f.__lpShadow;
      f.__lpKids = null; f.__lpShadow = undefined;
    }
  };

  await stopLoop();
  const samples = [];
  for (let k = 0; k < frames; k++) {
    // 幀與幀之間只推進人形動畫（mixer／bob／站位），鏡頭凍在同一個機位
    if (k) { const N = Math.max(1, Math.round(gap / 16)); for (let s = 0; s < N; s++) D.update(16 / 1000, performance.now() + k * gap + s * 16); }

    // 換上標記材質
    const orig = bodyMeshes.map((m) => m.material);
    bodyMeshes.forEach((m) => { m.material = mark; });

    hideOthers();
    const A = shoot();
    showOthers();
    const B = shoot();

    bodyMeshes.forEach((m, i) => { m.material = orig[i]; });

    let visN = 0;
    for (let i = 0; i < A.set.length; i++) if (A.set[i] && B.set[i]) visN++;
    // 頭部帶：full 包圍盒上緣起 HEAD 比例的高度
    let headFull = 0, headVis = 0, headY1 = -1;
    if (A.n > 0) {
      headY1 = A.minY + Math.max(1, Math.round((A.maxY - A.minY + 1) * HEAD));
      for (let y = A.minY; y < headY1; y++) {
        const row = y * W;
        for (let x = A.minX; x <= A.maxX; x++) { const i = row + x; if (A.set[i]) { headFull++; if (B.set[i]) headVis++; } }
      }
    }
    const na = A.n <= MINPX;
    samples.push({ frame: k, na, fullPx: A.n, visPx: visN,
      occl: A.n ? +(1 - visN / A.n).toFixed(4) : null,
      headFullPx: headFull, headVisPx: headVis,
      occlHead: headFull ? +(1 - headVis / headFull).toFixed(4) : null,
      topY: A.n ? A.minY : null, bottomY: A.n ? A.maxY : null, leftX: A.n ? A.minX : null, rightX: A.n ? A.maxX : null,
      canvasW: W, canvasH: H });
  }
  resumeLoop();
  mark.dispose();
  // 診斷：這一尊的世界尺寸與站位（排法有沒有真的把它放到第二排）
  const g = fig.group;
  const diag = { ab: fig.ab, skin: fig.skin, scale: +g.scale.y.toFixed(4), y: +g.position.y.toFixed(4),
    x: +g.position.x.toFixed(4), z: +g.position.z.toFixed(4), shadowVisible: !!(fig.shadow && fig.shadow.visible),
    bodyMeshes: bodyMeshes.length, others: others.length };
  return { samples, diag };
}`;

async function main() {
  const srv = await serve(SRC_ROOT, PORT);
  const result = { root: SRC_ROOT, seed: SEED, frames: FRAMES, gap: GAP, mark: '0x990099', tol: 24, minPx: 3000, head: 0.25, legends: {} };
  const allErrors = [];
  try {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
    for (const legend of LEGENDS) {
      const meta = LEGEND_META[legend];
      if (!meta) { console.error('未知的傳說鍵：' + legend); process.exit(2); }
      const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
      let res = null;
      const r = await drive(page, `http://127.0.0.1:${PORT}/index.html?paperwar=1&fxcount=1&seed=${SEED}`, {
        duels: 1,
        onDuel: async (pg, n) => {
          if (n !== 1) return;
          const setup = await pg.evaluate(new Function('return (' + SETUP_FN + ')')(), { legend, meta, filler: FILLER });
          // 交付用的畫面：真實路徑（bloom／描邊都在），在停迴圈之前拍
          await pg.screenshot({ path: path.join(OUTDIR, `shot-${legend}.png`) });
          res = await pg.evaluate(new Function('return (' + PAGE_FN + ')')(),
            { frames: FRAMES, gap: GAP, MARK: 0x990099, TOL: 24, MINPX: 3000, HEAD: 0.25 });
          if (res) res.setup = setup;
        },
      });
      allErrors.push(...r.errors.map((e) => legend + ': ' + e));
      result.legends[legend] = res || { error: '沒有量到（onDuel 沒觸發或 evaluate 失敗）' };
      await page.close();
    }
    await browser.close();
  } finally { srv.kill(); }

  // 判定
  const verdict = {};
  for (const [k, v] of Object.entries(result.legends)) {
    if (!v || v.error || !v.samples) { verdict[k] = { ok: false, why: (v && v.error) || 'no samples' }; continue; }
    const live = v.samples.filter((s) => !s.na);
    const occl = live.map((s) => s.occl);
    const head = live.map((s) => s.occlHead);
    const tops = live.map((s) => s.topY);
    verdict[k] = {
      ok: live.length > 0 && occl.every((x) => x !== null && x <= 0.10) && head.every((x) => x === 0),
      liveFrames: live.length, naFrames: v.samples.length - live.length,
      occlMax: occl.length ? Math.max(...occl) : null, occlMin: occl.length ? Math.min(...occl) : null,
      occlHeadMax: head.length ? Math.max(...head) : null,
      topYMin: tops.length ? Math.min(...tops) : null,
      bottomYMax: live.length ? Math.max(...live.map((s) => s.bottomY)) : null,
      g2: live.length > 0 && tops.every((y) => y >= 1) && live.every((s) => s.bottomY <= s.canvasH - 1),
      diag: v.diag,
    };
  }
  result.verdict = verdict;
  result.errors = allErrors;
  fs.writeFileSync(path.join(OUTDIR, 'presence.json'), JSON.stringify(result, null, 1), 'utf8');
  const lines = Object.entries(verdict).map(([k, v]) => `${k}\tok=${v.ok}\tG2=${v.g2}\tocclMax=${v.occlMax}\tocclHeadMax=${v.occlHeadMax}\tlive=${v.liveFrames}/${v.liveFrames + v.naFrames}\ttopYMin=${v.topYMin}\tbottomYMax=${v.bottomYMax}`);
  fs.writeFileSync(path.join(OUTDIR, 'metrics.txt'), lines.join('\n') + '\n', 'utf8');
  console.log(lines.join('\n'));
  console.log('errors=' + allErrors.length);
  if (allErrors.length) console.log(allErrors.slice(0, 8).join('\n'));
  const allOk = Object.values(verdict).every((v) => v.ok && v.g2) && allErrors.length === 0;
  process.exit(allOk ? 0 : 1);
}

main();

/* 美術方向研究用：拍「牌桌／市集」與「開標揭曉」兩個常駐場景的現況截圖（threejs-visual-loop 第二節的截圖腳本）。
   跑法：node tests/tools/scene-shot.mjs <png 前綴> [--port=8895] [--root=<靜態根目錄>] [--w=844] [--h=390]
   做的事：自起 http.server，進單人局選角色，在牌桌待機 2.5s 拍一張（table），按主鈕到第一次開標畫面再拍一張（reveal），
   另拍 390×844 直式一張（portrait，產品在直式會蓋「請轉橫」，這張就是玩家看到的樣子）。0 console error 才算成功。

   `--gate`（美術甲卷，2026-09-07）：多做四件事，給凍結檔 A1–A5／A7 當機械證據——
     ① 把 intro 三頁點掉，`-table.png` 拍的是「市集畫面」而不是歡迎頁（A3 明寫 intro 關掉後）
     ② 在牌桌機位強制 render 一次再讀 `renderer.info`（A7 的 draw call 要量在牌桌，不是量到 bloom 合成那一趟的 1）
     ③ 掃 `name` 以 `far-` 開頭的物件：可見性、在不在牌桌視錐內、螢幕空間 2D 包圍盒（A4）
     ④ 對決機位下算「人形 2D 包圍盒」與「每個 far-* 的 2D 包圍盒」有無重疊（A4 的不得擋人）
   螢幕亮度類的量測（A3 上下 ΔE、A5 四角／中央）不在這裡做，PNG 交給 tests/tools/art-a-metrics.py。 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import fsSync from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
/* worktree 裡沒有 tools/（那是主 repo 的目錄），所以往上找到第一個裝了 playwright 的地方 */
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'),
    path.resolve(ROOT, '../../tools/anyCreature/package.json'),
    path.resolve(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) if (fsSync.existsSync(c)) return createRequire(c)('playwright');
  throw new Error('找不到 playwright（試過：' + cands.join('、') + '）');
})();

const argv = process.argv.slice(2);
const opt = {}; const pos = [];
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
const OUT = pos[0] || path.join(ROOT, 'scene');
const PORT = Number(opt.port || 8895);
const SRC_ROOT = opt.root ? path.resolve(opt.root) : ROOT;
const W = Number(opt.w || 844), H = Number(opt.h || 390);
const GATE = !!opt.gate;
/* `--perf`（上桌卷 v0.56b，凍結檔 T3）：牌桌機位的 A/B 效能閘門。
   `--runs=5` ＝ 三個變體（?tray3d=0／預設／?table3d=lite）**同一支瀏覽器交錯**各量 5 次取中位——
   桌機同一組設定跨 run 的基準實測落在 ±30%（計畫 §6 Q4 第 5 點），只認交錯＋中位
   （`02 §6.2`：先歸因再處置——歸到量測環境，處置是交錯與中位，不是加 retry 或拉長 timeout）。
   ★所有數字一律換算成「每幀」★：`info.reset()` 之後等**兩次** rAF ⇒ 讀到的是兩幀的和，要除以 2。 */
const PERF = !!opt.perf;
const RUNS = Number(opt.runs || 5);
const SEED = Number(opt.seed || 1);

function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  return new Promise((r) => setTimeout(() => r(srv), 900));
}

/* 頁內量測：不 import three（頁面沒有全域 THREE），Vector3 從 camera.position 的建構子借，
   包圍盒自己用 min/max 純數字算——只讀不寫，量完不留任何東西在場景裡。 */
const PROBE = `(() => {
  const Y3 = window.__yaoshi3d; if (!Y3) return null;
  const r = Y3.renderer, cam = Y3.camera, scene = Y3.scene;
  const V3 = cam.position.constructor;
  const tmp = new V3();
  // 某個 Object3D 在螢幕空間（NDC，x/y ∈ [-1,1]）的 2D 包圍盒；沒有幾何或整個在鏡頭後面回 null
  // 可見性單獨當一個欄位回報，**不在包圍盒計算裡短路**（A4 二版，凍結檔 §2.1）：
  // 短路會讓「整組藏起來」的實作在幾何判準上空手通過，那是把判準搬淺。
  function shown(o) { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; }
  function ndcBox(root) {
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9, any = false, behind = 0, total = 0;
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox; if (!b) return;
      for (let i = 0; i < 8; i++) {
        tmp.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
        tmp.applyMatrix4(o.matrixWorld);
        const wz = tmp.z; // 先記世界座標，project 之後就沒了
        tmp.project(cam);
        total++;
        // project 後 z>1 代表在 far 之外、z<-1 在鏡頭後面：後者的 x/y 是翻轉的，不能拿來當包圍盒
        if (tmp.z < -1 || tmp.z > 1) { behind++; continue; }
        any = true;
        if (tmp.x < minx) minx = tmp.x; if (tmp.x > maxx) maxx = tmp.x;
        if (tmp.y < miny) miny = tmp.y; if (tmp.y > maxy) maxy = tmp.y;
        void wz;
      }
    });
    if (!any) return null;
    return { minx: +minx.toFixed(4), miny: +miny.toFixed(4), maxx: +maxx.toFixed(4), maxy: +maxy.toFixed(4), clipped: behind, total };
  }
  const onScreen = (b) => !!b && b.maxx > -1 && b.minx < 1 && b.maxy > -1 && b.miny < 1;
  const overlap = (a, b) => !!a && !!b && a.minx < b.maxx && b.minx < a.maxx && a.miny < b.maxy && b.miny < a.maxy;
  const fars = [];
  scene.traverse((o) => { if (o.name && o.name.indexOf('far-') === 0) fars.push(o); });
  return { V3, cam, scene, r, ndcBox, onScreen, overlap, shown, fars };
})()`;

async function probeFar(page, kind) {
  return page.evaluate(`((P) => {
    if (!P) return null;
    const out = { kind: ${JSON.stringify(kind)}, fars: [] };
    for (const o of P.fars) {
      const b = P.ndcBox(o);
      out.fars.push({ name: o.name, visible: o.visible, shown: P.shown(o), box: b, onScreen: P.onScreen(b) });
    }
    return out;
  })(${PROBE})`);
}

/* ── `--perf` 的一次取樣：開一局走到第 1 夜出價頁，等托盤的 GLB 到位再量 ──────────
 *  假綠清單（凍結檔 T3）逐條在這裡堵：
 *   ① 不用 `info.autoReset` 的預設值讀（那只留最後一趟 render＝bloom 合成的 1 個 call）
 *   ② 兩次 rAF 的和一律除以 2
 *   ③ `?tray3d=0` 是對照組，不拿它的數字當預設值
 *   ④ 回報 `tray.items()` 的 `visible`／`outlines`：模型 `visible=false` 時 delta 會是 0＝假綠
 *      （`makeCreatureFigure` 的 group.visible 預設就是 false，creature-figures.js:567） */
async function perfSample(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => errs.push('requestfailed: ' + r.url()));
  try {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
    await page.waitForFunction('!!window.__yaoshi3d', { timeout: 20000 });
    await page.evaluate((sd) => {
      CFG.T = 1;
      const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
      window.__yaoshi.newGame('solo', sd, ['qingmian']);
    }, SEED);
    let reached = false;
    for (let i = 0; i < 400 && !reached; i++) {
      await page.waitForTimeout(12);
      const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn'); const S=window.__yaoshi.S;
        return { t:b?b.textContent:'', d:b?b.disabled:true, r:S?S.round:0 }; })()`);
      if (/蓋牌/.test(st.t) && !st.d && st.r === 1) { reached = true; break; }
      if (!st.d) await page.click('#mainbtn').catch(() => {});
      else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled); if(e)e.click(); })()`);
    }
    if (!reached) throw new Error('沒走到第 1 夜出價頁（量測前提不成立，不得靜默放行）：' + url);
    await page.evaluate(`(async () => { const t=window.__yaoshi3d&&window.__yaoshi3d.tray; if(t&&t.loaded) await t.loaded(); })()`);
    /* ★最壞情境要真的擺上桌★（上桌卷**第二段**凍結檔 U3）：
       8 枚籌碼 × 4 席（＝籌碼池上限 32 枚）＋ 4 枚令牌 ＋ 四席信物（`ys:market` 進來時就掛好了）。
       走的是產品自己的 `props.bid`／`props.mark`，不是直接去翻 instance 的 count
       （`02 §6.1` 第 3 條：替身不得取代決定成敗的那一段）。
       `?tray3d=0` 那條**不填**——它是對照組，桌上本來就該是空的。 */
    await page.evaluate(`(() => {
      const Y3=window.__yaoshi3d; if(!Y3||!Y3.tray||!Y3.tray.props) return null;
      if(Y3.trayFlags && Y3.trayFlags.on===false) return 'kill-switch：不填';
      const P=Y3.tray.props;
      for(let seat=0;seat<4;seat++){ P.bid(seat, seat, 8); P.mark(seat, seat); }
      return P.stats();
    })()`);
    await page.waitForTimeout(1100); // 等鏡頭補間、燈籠閃爍與道具落定
    /* ★描邊只掛 hover 那一件之後，「預設」有兩個狀態，兩個都要量★（2026-09-13 裁定）：
       沒有 hover（玩家手不在托盤上）＝最省；hover 中＝**最壞情況**，閘門要看的是它。
       只量沒 hover 的那一個會讓「描邊多貴」整個從帳上消失——那是把判準搬淺。 */
    const measure = async () => page.evaluate(async () => {
      const Y3 = window.__yaoshi3d; const info = Y3.renderer.info;
      const f0 = info.render.frame; const ts = performance.now();
      await new Promise((r) => setTimeout(r, 1500));
      const f1 = info.render.frame; const te = performance.now();
      info.autoReset = false; info.reset();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const calls = info.render.calls, tris = info.render.triangles, passes = info.render.frame - f1;
      info.autoReset = true;
      const t = Y3.tray;
      /* 三角形分母表（上桌卷 v0.56b）：把場上**畫得到的**每一顆 mesh 依「屬於誰」歸類加總。
         ★這是量出來的，不是算出來的★——要減幾何之前得先知道每一類各佔多少，
         否則「先減非主角的」只是憑印象（`02 §6.1` 第 7 條：先寫下分母）。
         分類靠物件自己的 name 與祖先鏈，不另抄一份清單。 */
      const budget = {};
      const triOf = (o) => {
        const g = o.geometry; if (!g) return 0;
        /* InstancedMesh 的三角形是「一份幾何 × 現在畫幾個 instance」——不乘 count 的話
           32 枚銅錢會被記成 96 個三角形（分母表對不上 `info.render.triangles`）。 */
        const n = o.isInstancedMesh ? Math.max(0, o.count) : 1;
        if (g.index) return (g.index.count / 3) * n;
        return g.attributes && g.attributes.position ? (g.attributes.position.count / 3) * n : 0;
      };
      const bucketOf = (o) => {
        for (let n = o; n; n = n.parent) {
          if (n.name === 'tray-cloth') return '紅布托盤';
          if (n.name === 'tray-curse' || n.name === 'tray-curse-fire') return '詛咒占位';
          if (n.name === 'prop-chips') return '壽命銅錢籌碼';
          if (n.name === 'prop-tokens') return '血玉令牌';
          if (n.name && n.name.indexOf('relic-') === 0) return '席角信物';
          if (n.name === 'table-tray') return o.name === 'outline' ? '托盤描邊外殼' : '托盤拍品本體';
          if (n.name === 'table') return '木紋桌面';
          if (n.name === 'table-decor') return '香灰＋符咒';
          if (n.name === 'sky-dome') return '夜空穹頂';
          if (n.name === 'far') return '遠景剪影';
        }
        return '其他（既有）';
      };
      Y3.scene.traverse((o) => {
        if (!o.isMesh && !o.isPoints) return;
        for (let n = o; n; n = n.parent) if (!n.visible) return; // 畫不到的不計
        const b = bucketOf(o);
        budget[b] = (budget[b] || 0) + (o.isPoints ? 0 : triOf(o));
      });
      Object.keys(budget).forEach((k) => { budget[k] = Math.round(budget[k]); });
      return {
        budget,
        rendersPerSec: +((f1 - f0) / ((te - ts) / 1000)).toFixed(1),
        calls: calls / 2, tris: tris / 2, passes: passes / 2,
        geometries: info.memory.geometries, textures: info.memory.textures,
        items: t && t.items ? t.items() : null,
        /* 第二段：這一幀桌上真的有幾枚錢／幾枚令牌／幾件信物。
           ★沒有這一欄，U3 的綠燈零鑑別力★——道具一件都沒擺上去當然也會過門檻。 */
        props: t && t.props && t.props.stats ? t.props.stats() : null,
        trayVisible: t && t.visible ? t.visible() : null,
        hollow: !!(document.getElementById('felt') || {}).classList && document.getElementById('felt').classList.contains('hollow'),
      };
    });
    const m = await measure();
    /* hover 中（最壞情況）：用產品自己的 setHover，不是直接去翻 shell 的 visible——
       翻旗標等於繞過被測的那條路（`02 §6.1` 第 3 條：不得 mock 掉勝負手）。
       ★四格逐一 hover、取三角形最多的那一格★：外殼數是逐尊不同的（實測 7～18 顆），
       只 hover 槽 0 量到的是**最省的那一格**，那不是最壞情況。 */
    let worst = null;
    for (let i = 0; i < 4; i++) {
      const got = await page.evaluate(`(() => { const t=window.__yaoshi3d.tray;
        if (t && t.setHover) { t.setHover(${i}); return t.hover(); } return -1; })()`);
      await page.waitForTimeout(400);
      const r = await measure();
      r.hoverSlot = got;
      if (!worst || r.tris > worst.tris) worst = r;
    }
    m.onHover = worst;
    await page.evaluate(`(() => { const t=window.__yaoshi3d.tray; if (t && t.setHover) t.setHover(-1); })()`);
    m.errors = errs;
    return m;
  } finally { await ctx.close(); }
}

const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

async function perfMain() {
  const srv = await serve(SRC_ROOT, PORT);
  try {
    /* ★一定要 uncapped★（凍結檔 T3 的假綠清單第一條同源）：不關 vsync 的話三個變體的 renders/s
       都是 58~60（撞螢幕更新率），比值恆為 ~0.99＝**零鑑別力**（實測：預設 0.988／lite 0.981）。
       `--disable-gpu-vsync --disable-frame-rate-limit` 之後量到的才是「跑得動幾幀」。
       同 duel-perf.mjs:60 的 `--uncap`，這裡直接內建、不給關（這支只有量效能一個用途）。 */
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
    const VAR = [
      { tag: 'tray3d=0', q: '?tray3d=0' },
      { tag: 'default', q: '' },
      { tag: 'table3d=lite', q: '?table3d=lite' },
    ];
    const samples = {}; VAR.forEach((v) => { samples[v.tag] = []; });
    for (let r = 0; r < RUNS; r++) {
      for (const v of VAR) {
        samples[v.tag].push(await perfSample(browser, `http://127.0.0.1:${PORT}/index.html${v.q}`));
      }
    }
    const out = {};
    for (const v of VAR) {
      const S = samples[v.tag];
      out[v.tag] = {
        callsPerFrame: median(S.map((x) => x.calls)),
        trianglesPerFrame: median(S.map((x) => x.tris)),
        passesPerFrame: median(S.map((x) => x.passes)),
        rendersPerSecMedian: median(S.map((x) => x.rendersPerSec)),
        rendersPerSecAll: S.map((x) => x.rendersPerSec),
        callsAll: S.map((x) => x.calls),
        budget: S[S.length - 1].budget,
        /* hover 中＝最壞情況（描邊掛在那一件上）。閘門看的是這一組。 */
        onHover: {
          callsPerFrame: median(S.map((x) => x.onHover.calls)),
          trianglesPerFrame: median(S.map((x) => x.onHover.tris)),
          passesPerFrame: median(S.map((x) => x.onHover.passes)),
          rendersPerSecMedian: median(S.map((x) => x.onHover.rendersPerSec)),
          rendersPerSecAll: S.map((x) => x.onHover.rendersPerSec),
          hoverSlot: S[S.length - 1].onHover.hoverSlot,
          outlines: S[S.length - 1].onHover.items ? S[S.length - 1].onHover.items.map((i) => i.outlines) : null,
          props: S[S.length - 1].onHover.props,
          budget: S[S.length - 1].onHover.budget,
        },
        geometries: S[S.length - 1].geometries, textures: S[S.length - 1].textures,
        hollow: S[S.length - 1].hollow,
        trayVisible: S[S.length - 1].trayVisible,
        items: S[S.length - 1].items,
        errors: S.reduce((n, x) => n + x.errors.length, 0),
        errorSample: S.flatMap((x) => x.errors).slice(0, 5),
      };
    }
    const base = out['tray3d=0'].rendersPerSecMedian;
    const pair = (nums) => nums.map((v, i) => +(v / samples['tray3d=0'][i].rendersPerSec).toFixed(4));
    out.ratio = {
      default: +(out.default.rendersPerSecMedian / base).toFixed(4),
      defaultOnHover: +(out.default.onHover.rendersPerSecMedian / base).toFixed(4),
      lite: +(out['table3d=lite'].rendersPerSecMedian / base).toFixed(4),
      // 逐次配對（同一 run 內的分子÷分母），全距用它看——中位藏不住跨線
      defaultPaired: pair(out.default.rendersPerSecAll),
      defaultOnHoverPaired: pair(out.default.onHover.rendersPerSecAll),
      litePaired: pair(out['table3d=lite'].rendersPerSecAll),
    };
    await browser.close();
    console.log(JSON.stringify({ mode: 'perf', runs: RUNS, seed: SEED, viewport: `${W}x${H} dpr2`, out }, null, 1));
    const errN = VAR.reduce((n, v) => n + out[v.tag].errors, 0);
    process.exit(errN === 0 ? 0 : 1);
  } finally { srv.kill(); }
}

async function main() {
  if (PERF) return perfMain();
  const srv = await serve(SRC_ROOT, PORT);
  const errs = []; const shots = []; const gate = {};
  try {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html?paperwar=1`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: OUT + '-title.png' }); shots.push(OUT + '-title.png');
    await page.click('button:has-text("單人入市")');
    await page.waitForSelector('#selectScr.on');
    await page.screenshot({ path: OUT + '-select.png' }); shots.push(OUT + '-select.png');
    await page.click('#selGrid .rcard');
    await page.click('#selBtn:not([disabled])');
    await page.waitForTimeout(2500);
    if (GATE) {
      // intro 三頁點掉：__introNext 是 index.html 的 intro 專用鉤子，intro 收掉後它會被設回 null
      for (let i = 0; i < 8; i++) {
        const on = await page.evaluate(() => !!window.__introNext);
        if (!on) break;
        await page.click('#stage .bigbtn').catch(() => {});
        await page.waitForTimeout(450);
      }
      await page.waitForTimeout(1600); // 等鏡頭補間與燈籠閃爍穩定
    }
    await page.screenshot({ path: OUT + '-table.png' }); shots.push(OUT + '-table.png');
    if (GATE) {
      gate.table = await page.evaluate(() => {
        const Y3 = window.__yaoshi3d; const r = Y3.renderer;
        r.render(Y3.scene, Y3.camera); // 強制一趟直接 render：info 只留最後一次 render 的數字
        const all = { calls: r.info.render.calls, tris: r.info.render.triangles };
        // A7 歸因：把本卷新加的兩樣（穹頂／遠景剪影）暫時關掉再量一次，差值就是它們的成本。
        let base = null;
        if (Y3.sky || Y3.far) {
          const s0 = Y3.sky && Y3.sky.visible, f0 = Y3.far && Y3.far.visible;
          if (Y3.sky) Y3.sky.visible = false;
          if (Y3.far) Y3.far.visible = false;
          r.render(Y3.scene, Y3.camera);
          base = { calls: r.info.render.calls, tris: r.info.render.triangles };
          if (Y3.sky) Y3.sky.visible = s0;
          if (Y3.far) Y3.far.visible = f0;
          r.render(Y3.scene, Y3.camera);
        }
        return { calls: all.calls, tris: all.tris, callsWithoutNew: base && base.calls, trisWithoutNew: base && base.tris,
          camera: { x: +Y3.camera.position.x.toFixed(3), y: +Y3.camera.position.y.toFixed(3), z: +Y3.camera.position.z.toFixed(3) },
          fogDensity: Y3.scene.fog ? +Y3.scene.fog.density.toFixed(4) : null };
      });
      gate.farTable = await probeFar(page, 'table');
      // A5 的 DOM 條件：#vignette 存在、pointer-events:none、疊在 canvas 之上 HUD 之下。
      // 「HUD 之下」在這個專案是靠 in-flow 內容永遠畫在負 z-index 之上（canvas −2、暈角 −1），
      // 所以這裡把兩個負值與 HUD 的定位方式一起印出來，判定看數字不看敘述。
      gate.vignette = await page.evaluate(() => {
        const v = document.getElementById('vignette');
        const c = document.querySelector('body > canvas');
        const hud = document.getElementById('felt') || document.getElementById('table');
        const cs = (el) => (el ? getComputedStyle(el) : null);
        const sv = cs(v), sc = cs(c), sh = cs(hud);
        return { exists: !!v, pointerEvents: sv && sv.pointerEvents, zIndex: sv && sv.zIndex,
          canvasZ: sc && sc.zIndex, hudId: hud && hud.id, hudPosition: sh && sh.position, hudZ: sh && sh.zIndex,
          hitAtCorner: (() => { const el = document.elementFromPoint(4, 4); return el ? (el.id || el.tagName) : null; })() };
      });
      // 補充量測（比 A3／A5 條文更嚴，只是加測不取代）：把 DOM 面板整層藏起來，只留 canvas 與 #vignette，
      // 拍一張「純 3D」的牌桌。條文量的是含 UI 的整張截圖，那張的上下差主要來自面板本身；
      // 這一張才看得出背景漸層與暈角本身有沒有做到。兩張都進報告。
      await page.evaluate(() => {
        const s = document.createElement('style'); s.id = '__hideui';
        s.textContent = 'body > *:not(canvas):not(#vignette){visibility:hidden !important}';
        document.head.appendChild(s);
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: OUT + '-table3d.png' }); shots.push(OUT + '-table3d.png');
      await page.evaluate(() => { const s = document.getElementById('__hideui'); if (s) s.remove(); });
      await page.waitForTimeout(300);
    }
    // 走到第一次開標揭曉：點主鈕直到 #duel 或揭曉層出現，最多 20 次
    for (let i = 0; i < 20; i++) {
      const st = await page.evaluate(() => {
        const mb = document.getElementById('mainbtn'); const ho = document.getElementById('hoBtn');
        const vis = (el) => !!el && el.offsetParent !== null && !el.disabled;
        const sb = [...document.querySelectorAll('#stage .bigbtn')].find(vis);
        const duel = document.getElementById('duel'); const duelOn = !!duel && getComputedStyle(duel).display !== 'none' && duel.offsetParent !== null;
        return { mainOk: vis(mb), hoOk: vis(ho), stageOk: !!sb, duelOn, txt: mb ? mb.textContent : '' };
      });
      if (st.duelOn) {
        await page.waitForTimeout(1200);
        await page.screenshot({ path: OUT + '-duel.png' }); shots.push(OUT + '-duel.png');
        if (GATE) {
          gate.farDuel = await probeFar(page, 'duel');
          gate.duel = await page.evaluate(`((P) => {
            if (!P) return null;
            const D = P.scene && window.__yaoshi3d.duelFigures;
            const figs = [];
            for (const side of ['A', 'B']) {
              const list = (D && D.figuresOf) ? D.figuresOf(side) : [];
              for (const f of list) {
                const node = f && (f.group || f.root || f.obj || f.object3d || (f.isObject3D ? f : null));
                if (!node) continue;
                const b = P.ndcBox(node);
                if (b) figs.push({ side, box: b });
              }
            }
            const hull = figs.length ? figs.reduce((a, f) => ({
              minx: Math.min(a.minx, f.box.minx), miny: Math.min(a.miny, f.box.miny),
              maxx: Math.max(a.maxx, f.box.maxx), maxy: Math.max(a.maxy, f.box.maxy) }), { minx: 1e9, miny: 1e9, maxx: -1e9, maxy: -1e9 }) : null;
            const hits = [];
            for (const o of P.fars) {
              const fb = P.ndcBox(o);
              for (const f of figs) if (P.overlap(fb, f.box)) hits.push({ far: o.name, side: f.side });
            }
            return { figures: figs.length, hull, overlaps: hits, figKeys: (D && D.figuresOf && D.figuresOf('A')[0]) ? Object.keys(D.figuresOf('A')[0]).slice(0, 12) : [] };
          })(${PROBE})`);
        }
        break;
      }
      if (st.stageOk) await page.click('#stage .bigbtn:not([disabled])').catch(() => {});
      else if (st.hoOk) await page.click('#hoBtn').catch(() => {});
      else if (st.mainOk) await page.click('#mainbtn').catch(() => {});
      await page.waitForTimeout(900);
      if (i === 2) { await page.screenshot({ path: OUT + '-mid.png' }); shots.push(OUT + '-mid.png'); }
    }
    const info = await page.evaluate(() => {
      const Y3 = window.__yaoshi3d; if (!Y3) return null;
      const r = Y3.renderer; const cam = Y3.camera;
      return { fov: cam && cam.fov, toneMapping: r && r.toneMapping, exposure: r && r.toneMappingExposure, colorSpace: r && r.outputColorSpace,
        shadow: r && r.shadowMap && r.shadowMap.enabled, pixelRatio: r && r.getPixelRatio(), calls: r && r.info.render.calls, tris: r && r.info.render.triangles,
        fog: Y3.scene.fog ? (Y3.scene.fog.isFogExp2 ? 'FogExp2' : 'Fog') : null, bg: Y3.scene.background ? (Y3.scene.background.isColor ? '#' + Y3.scene.background.getHexString() : Y3.scene.background.type) : null,
        env: !!Y3.scene.environment,
        lights: (() => { const L = []; Y3.scene.traverse((o) => { if (o.isLight) L.push({ t: o.type, i: +o.intensity.toFixed(2), c: '#' + (o.color ? o.color.getHexString() : ''), sky: o.groundColor ? '#' + o.groundColor.getHexString() : undefined, shadow: !!o.castShadow }); }); return L; })() };
    });
    await browser.close();
    console.log(JSON.stringify({ shots, info, gate: GATE ? gate : undefined, errors: errs }, null, 1));
    process.exit(errs.length === 0 ? 0 : 1);
  } finally { srv.kill(); }
}
main();

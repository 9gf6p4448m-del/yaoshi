/* 席位之手 v0.59.7 驗收條件 11「手臂連續」量測：畫面內不得看得到袖子／前臂的後端。
   跑法：node tests/tools/hand-arm-continuity.mjs --root=<樹> [--vp=844x390] [--handscale=0.6] [--games=4] [--seed=7] [--out=<json>] [--shots=<紅幀截圖資料夾>] [--port=8995]
   每局：newGame('solo', seed+g, ['qingmian']) 後把四席手的「種類」換成輪轉的 [收驚婆, 獵人, 當鋪, 預設]（第 g 局右移 g 席，
   四局後每種手在每一席各待過一次；只換手的外觀幾何，props／信物／賽局不動），然後
     ①腳本段：第 1 夜出價階段，用產品自己的事件（document 上派 ys:bid／ys:mark／ys:reveal-result）讓四席各推四格、拍、揭盅扒回；
     ②自然段：驅動器（同 replay-export-probe：主鈕推進、視窗、停滯按跳過）把整局打完到「看最終結果」。
   取樣：rAF 每 3 幀一次，只要有手可見就量。每隻可見手的「後端」＝有被畫、看得見的（頂點 alpha≥0.5）手部／前臂頂點
   （原手頂點＋v0.59.7 的袖管；不含配件）中，
   綁定姿勢 z 最小的那一圈（z ≤ zMin＋0.03 dm）。後端頂點投影到畫面：在畫面內（NDC |x|,|y|≤1、深度在視錐內）且
   不被深度遮住（另畫一張只含不透明物件的深度圖，該像素的線性深度比頂點近 0.01 以上才算被遮）＝看得到後端 ⇒ 該幀紅。
   輸出逐幀列（幀號、夜、段、席、種類、後端點數、在畫面內數、未被遮數）＋彙總。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = path.resolve(opt.root || HERE), [W, H] = String(opt.vp || '844x390').split('x').map(Number), PORT = Number(opt.port || 8995);
const GAMES = Number(opt.games || 4), SEED = Number(opt.seed || 7);
const KINDS = ['shoujing', 'hunter', 'dangpu', 'qingmian']; // qingmian＝預設手
const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));

async function driveUntil(page, re, maxSteps = 6000) {
  const src = re.source; let idle = 0;
  for (let i = 0; i < maxSteps; i++) {
    await page.waitForTimeout(10);
    const r = await page.evaluate(`(() => {
      const re = new RegExp(${JSON.stringify(src)});
      const ho = document.getElementById('handoff');
      if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return { hit: 0 }; }
      const b = document.getElementById('mainbtn');
      const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
      if (b && re.test(txt) && !dis) return { hit: 1, txt };
      if (b && !dis) { b.click(); return { hit: 0 }; }
      const m = document.getElementById('modal');
      if (m && getComputedStyle(m).display !== 'none') {
        const k = document.getElementById('titheKeep'); if (k) { k.click(); return { hit: 0 }; }
        const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return { hit: 0 }; }
      }
      if (b && dis) {
        const els = [...document.querySelectorAll('#stage button')];
        const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled);
        if (sb) { sb.click(); return { hit: 0 }; }
      }
      return { hit: 0, idle: 1 };
    })()`);
    if (r.hit) return r.txt;
    idle = r.idle ? idle + 1 : 0;
    if (idle > 300) { idle = 0; await page.evaluate(() => { const sk = document.getElementById('skipbtn'); if (sk && sk.style.display === 'block' && !sk.disabled) sk.click(); }); }
  }
  throw new Error('driveUntil 卡住');
}

let browser; const out = { root: ROOT, vp: [W, H], handscale: opt.handscale ? Number(opt.handscale) : 1, games: [], errs: [], rows: [] };
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  for (let g = 0; g < GAMES; g++) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') out.errs.push(m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html${opt.handscale ? '?handscale=' + opt.handscale : ''}`);
    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
    const kinds = [0, 1, 2, 3].map((s) => KINDS[(s - g + 4) % 4]);
    await page.evaluate(async ({ sd, kinds }) => {
      CFG.T = 1; const F = window.__yaoshi.PW_FX; if (F) for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
      window.__yaoshi.newGame('solo', sd, ['qingmian']);
      const T = window.__yaoshi3d.tray; await T.loaded(); await T.hands.ready();
      /* 手的種類輪轉（只換手的外觀幾何）：之後 renderer 再呼叫 setSeats 也照這組 */
      const seats = kinds.map((role, id) => ({ id, role })), orig = T.hands.setSeats.bind(T.hands);
      T.hands.setSeats = () => orig(seats); orig(seats);
      /* 取樣器 */
      const THREE = await import('three');
      const Y = window.__yaoshi3d, R = Y.renderer, buf = new Uint8Array(4), v = new THREE.Vector3();
      const size = R.getDrawingBufferSize(new THREE.Vector2());
      const rt = new THREE.WebGLRenderTarget(size.x, size.y);
      const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
      const rearCache = new WeakMap();
      const rearOf = (g) => {
        let r = rearCache.get(g); if (r) return r;
        const pos = g.attributes.position, col = g.attributes.color, nb = g.userData.real ? g.userData.real.nBase : 819;
        let zMin = Infinity; const vis = [], arm = g.userData.real && g.userData.real.arm; // v0.59.7：程式生成的袖管也是手臂
        const cand = []; for (let i = 0; i < Math.min(nb, pos.count); i++) cand.push(i); if (arm) for (let i = arm[0]; i < arm[1]; i++) cand.push(i);
        const used = new Set(g.index.array); // 只算有被畫的頂點（被換掉的原前臂不算）
        for (const i of cand) { if (!used.has(i)) continue; if (col && col.itemSize === 4 && col.getW(i) < 0.5) continue; vis.push(i); zMin = Math.min(zMin, pos.getZ(i)); }
        r = { zMin, idx: vis.filter((i) => pos.getZ(i) <= zMin + 0.03) }; rearCache.set(g, r); return r;
      };
      window.__arm = { rows: [], frame: 0, phase: 'setup', shots: [] };
      const sample = () => {
        const A = window.__arm; A.frame++;
        if (A.frame % 3 === 0 && !A.stop) {
          const holders = T.hands.group.children.filter((h) => h.visible && h.parent && h.parent.visible !== false);
          if (holders.length && T.hands.group.parent && T.hands.group.parent.visible !== false) {
            Y.scene.updateMatrixWorld(true);
            /* 深度圖：只畫不透明物件（透明的煙霧、接觸陰影、粒子、線、精靈先藏起來；手照畫） */
            const hidden = [];
            const inHands = (o) => { for (let q = o; q; q = q.parent) if (q === T.hands.group) return true; return false; };
            Y.scene.traverse((o) => { if (!o.visible) return; const isHand = inHands(o);
              const tr = o.material && (Array.isArray(o.material) ? o.material.some((m) => m.transparent) : o.material.transparent);
              if (!isHand && (o.isPoints || o.isLine || o.isSprite || (o.isMesh && tr))) { o.visible = false; hidden.push(o); } });
            const ov = Y.scene.overrideMaterial, bg = Y.scene.background; Y.scene.overrideMaterial = depthMat; Y.scene.background = null;
            R.setRenderTarget(rt); R.setClearColor(0xffffff, 1); R.clear(); R.render(Y.scene, Y.camera); R.setRenderTarget(null);
            Y.scene.overrideMaterial = ov; Y.scene.background = bg; for (const o of hidden) o.visible = true;
            const near = Y.camera.near, far = Y.camera.far, lin = (d) => (near * far) / (far - d * (far - near));
            for (const h of holders) {
              let mesh = null; h.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
              mesh.skeleton.update();
              const rear = rearOf(mesh.geometry); let onScreen = 0, unocc = 0, ex = null;
              for (const i of rear.idx) {
                v.fromBufferAttribute(mesh.geometry.attributes.position, i); mesh.applyBoneTransform(i, v); v.applyMatrix4(mesh.matrixWorld);
                const wv = v.clone(); v.project(Y.camera);
                if (Math.abs(v.x) > 1 || Math.abs(v.y) > 1 || v.z < -1 || v.z > 1) continue;
                onScreen++;
                const px = Math.min(size.x - 1, Math.floor((v.x + 1) / 2 * size.x)), py = Math.min(size.y - 1, Math.floor((v.y + 1) / 2 * size.y));
                R.readRenderTargetPixels(rt, px, py, 1, 1, buf);
                const d = (255 / 256) * (buf[0] / 255 / 16777216 + buf[1] / 255 / 65536 + buf[2] / 255 / 256 + buf[3] / 255);
                const dv = (v.z + 1) / 2;
                if (lin(d) < lin(dv) - 0.01) continue; // 被不透明物遮住
                unocc++; if (!ex) ex = [+((v.x + 1) / 2 * innerWidth).toFixed(1), +((1 - v.y) / 2 * innerHeight).toFixed(1)];
              }
              const seat = +h.name.split('-')[1];
              if (unocc && A.shots.length < 4) { R.render(Y.scene, Y.camera); A.shots.push({ f: A.frame, seat, at: ex, url: R.domElement.toDataURL('image/png') }); } // 紅幀存證（只存前幾張）
              A.rows.push({ f: A.frame, phase: A.phase, night: window.__yaoshi.S.round, seat, kind: seats[seat].role === 'qingmian' ? 'default' : seats[seat].role, rear: rear.idx.length, onScreen, unoccluded: unocc, at: ex });
            }
          }
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, { sd: SEED + g, kinds });
    /* ①腳本段：等到第 1 夜出價（主鈕可按）後派事件 */
    await driveUntil(page, /不盯任何一件/, 3000).catch(() => {});
    await page.evaluate(async () => {
      const hp = (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d })), wait = (ms) => new Promise((r) => setTimeout(r, ms));
      window.__arm.phase = 'script';
      for (let k = 0; k < 4; k++) {
        for (let s = 0; s < 4; s++) hp('ys:bid', { seat: s, slot: (k + s) % 4, amount: 3 + s * 2 });
        await wait(900);
        for (let s = 0; s < 4; s++) hp('ys:mark', { seat: s, slot: (k + s) % 4 });
        await wait(900);
        hp('ys:reveal-result', { slot: k, winner: k % 4 });
        await wait(1200);
      }
      window.__arm.phase = 'natural';
    });
    /* ②自然段：整局打完 */
    let ended = true;
    try { await driveUntil(page, /看最終結果/, 20000); } catch (e) { ended = false; }
    const res = await page.evaluate(() => { window.__arm.stop = true; return { rows: window.__arm.rows, night: window.__yaoshi.S.round, shots: window.__arm.shots }; });
    if (opt.shots) { fs.mkdirSync(path.resolve(opt.shots), { recursive: true }); res.shots.forEach((sh, i) => fs.writeFileSync(path.join(path.resolve(opt.shots), `red-g${g}-${i}-seat${sh.seat}-f${sh.f}.png`), Buffer.from(sh.url.split(',')[1], 'base64'))); }
    out.games.push({ g, seed: SEED + g, kinds, ended, lastNight: res.night, rows: res.rows.length });
    for (const r of res.rows) out.rows.push({ g, ...r });
    await ctx.close();
    console.log(JSON.stringify({ g, kinds, ended, lastNight: res.night, rows: res.rows.length, red: res.rows.filter((r) => r.unoccluded > 0).length }));
  }
} finally { await browser?.close(); server.kill(); }
const red = out.rows.filter((r) => r.unoccluded > 0);
const by = {}; for (const r of out.rows) { const k = r.kind + '@' + r.seat; by[k] = by[k] || { n: 0, red: 0, onScreen: 0 }; by[k].n++; if (r.unoccluded > 0) by[k].red++; if (r.onScreen > 0) by[k].onScreen++; }
out.summary = { samples: out.rows.length, redSamples: red.length, phases: [...new Set(out.rows.map((r) => r.phase))], nights: [...new Set(out.rows.map((r) => r.night))].sort((a, b) => a - b), byKindSeat: by, firstRed: red.slice(0, 10) };
if (opt.out) { fs.mkdirSync(path.dirname(path.resolve(opt.out)), { recursive: true }); fs.writeFileSync(path.resolve(opt.out), JSON.stringify(out)); }
console.log(JSON.stringify({ vp: out.vp, handscale: out.handscale, samples: out.summary.samples, redSamples: out.summary.redSamples, nights: out.summary.nights, errs: out.errs.slice(0, 3) }));

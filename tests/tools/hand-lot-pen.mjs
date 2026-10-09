/* 手×拍品穿模量測（真頁面，全頂點，不抽樣）。覆審 r3 的方法：手的蒙皮頂點（local z ≥ −0.40＝袖口邊以前加少量袖）先用拍品 3D 外接盒（內縮 2 mm）篩候選，
   再對每個候選從頂點朝 +y、+x、−z 三個方向打射線（雙面）求交，交點數為奇數的方向 ≥2 個＝在網格內部（只用 +y 會被罩在上面的開口網格誤判）。
   跑法：node tests/tools/hand-lot-pen.mjs [--vp=844x390] [--scen=single|push1|reb|four|ai] [--seats=0123] [--q=?handslow=1] [--root=<樹>] [--port=9330] [--out=<json>]
   劇本（遊戲時間＝幀數×手速倍率 HS，頁面預設 1.5）：
     single＝每席每槽單獨「盯上」(ys:mark)；push1＝每席每槽單獨擺錢(ys:bid 6 枚)；reb＝盯上途中被同席出價打斷（打斷點 20/40/60 幀×席）；
     four＝四席同時盯上（槽位輪轉 4 種）；ai＝北／西／東各擺四格（AI 一次推多格）後四席同拍（2 組槽位）。
   輸出：每個子案例 {id,lotF,lotP,byKind}；總計 {frames,points}；每席小計。基準 5c91bdc7 的值見 README §0e。 */
import fs from 'node:fs';
import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = opt.root ? path.resolve(opt.root) : HERE, PORT = Number(opt.port || 9330), SEATS = (opt.seats || '0123').split('').map(Number);
const [VW, VH] = (opt.vp || '844x390').split('x').map(Number), SCEN = opt.scen || 'single';
const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 900));
let browser, out;
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage(); await page.goto(`http://127.0.0.1:${PORT}/index.html${opt.q || ''}`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break;
    if (!st.d) await page.click('#mainbtn').catch(() => {}); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(20);
  }
  out = await page.evaluate(async ({ SCEN, SEATS }) => {
    const T = await import('three'); const Y = window.__yaoshi3d; await Y.tray.loaded(); if (Y.tray.hands.ready) await Y.tray.hands.ready();
    const native = requestAnimationFrame.bind(window); await new Promise(native); const queue = []; window.requestAnimationFrame = (cb) => { queue.push(cb); return 1; }; await new Promise(native);
    let now = performance.now(); const step = () => { const cbs = queue.splice(0); now += 1000 / 60; for (const cb of cbs) cb(now); };
    const HS = (window.YS_ANIM_SLOW && window.YS_ANIM_SLOW.hand > 0) ? window.YS_ANIM_SLOW.hand : 1, L = (n) => Math.ceil(n * HS);
    const ev = (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d }));
    const v = new T.Vector3(), rc = new T.Raycaster(), DIRS = [new T.Vector3(0, 1, 0), new T.Vector3(1, 0, 0), new T.Vector3(0, 0, -1)];
    const meshesOf = (obj) => { const ms = []; obj.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh) && o.visible && !o.isInstancedMesh) ms.push(o); }); return ms; };
    const parity = (ms, p, d) => { rc.set(p, d); return rc.intersectObjects(ms, false).length % 2 === 1; };
    function run(plan, frames, seats) {
      Y.tray.props.clearRound(); Y.tray.hands.clear(); for (let i = 0; i < 20; i++) step();
      const R = { lotF: 0, lotP: 0, vis: 0, byKind: {} };
      for (let f = 0; f < frames; f++) {
        for (const [at, n, d] of plan) if (at === f) ev(n, d);
        step();
        const lots = Y.tray.lotNodes(), LB = lots.map((o) => new T.Box3().setFromObject(o).expandByScalar(-0.002)), LM = lots.map(meshesOf), all = LM.flat();
        const sv = all.map((m) => [m, m.material.side]); all.forEach((m) => { if (!Array.isArray(m.material)) m.material.side = T.DoubleSide; });
        try {
          for (const seat of seats) {
            const holder = Y.tray.hands.group.children[seat]; if (!holder || !holder.visible) continue; let mesh = null; holder.traverse((o) => { if (o.isSkinnedMesh) mesh = o; }); if (!mesh) continue; R.vis++;
            mesh.updateWorldMatrix(true, true); mesh.skeleton.update(); const P = mesh.geometry.attributes.position; let hit = 0;
            for (let i = 0; i < P.count; i++) {
              if (P.getZ(i) < -0.40) continue; v.fromBufferAttribute(P, i); mesh.applyBoneTransform(i, v); v.applyMatrix4(mesh.matrixWorld);
              for (let k = 0; k < LB.length; k++) if (LB[k].containsPoint(v)) { if (DIRS.filter((d) => parity(LM[k], v, d)).length >= 2) hit++; break; }
            }
            if (hit) { R.lotF++; R.lotP += hit; const st = (Y.tray.hands.stats().state || {})[seat]; const kk = (st && st.kind) || '?'; const e = (R.byKind[kk] ||= { f: 0, p: 0 }); e.f++; e.p += hit; }
          }
        } finally { sv.forEach(([m, sd]) => { if (!Array.isArray(m.material)) m.material.side = sd; }); }
      }
      return R;
    }
    const res = [];
    if (SCEN === 'single') for (const s of SEATS) for (let k = 0; k < 4; k++) res.push({ id: `s${s}k${k}`, ...run([[0, 'ys:mark', { seat: s, slot: k }]], L(150), [s]) });
    if (SCEN === 'push1') for (const s of SEATS) for (let k = 0; k < 4; k++) res.push({ id: `s${s}k${k}`, ...run([[0, 'ys:bid', { seat: s, slot: k, amount: 6 }]], L(140), [s]) });
    if (SCEN === 'reb') for (const s of SEATS) for (const at of [20, 40, 60]) res.push({ id: `s${s}@${at}`, ...run([[0, 'ys:mark', { seat: s, slot: 1 }], [L(at), 'ys:bid', { seat: s, slot: 2, amount: 4 }]], L(170), [s]) });
    if (SCEN === 'four') for (let sh = 0; sh < 4; sh++) res.push({ id: `sh${sh}`, ...run([0, 1, 2, 3].map((s) => [0, 'ys:mark', { seat: s, slot: (s + sh) % 4 }]), L(150), [0, 1, 2, 3]) });
    if (SCEN === 'ai') for (let sh = 0; sh < 2; sh++) res.push({ id: `ai${sh}`, ...run([...[1, 2, 3].flatMap((s) => [0, 1, 2, 3].map((k) => [0, 'ys:bid', { seat: s, slot: k, amount: 2 + ((s + k + sh) % 6) }])), ...[0, 1, 2, 3].map((s) => [L(170), 'ys:mark', { seat: s, slot: (s + sh) % 4 }])], L(320), [0, 1, 2, 3]) });
    return { HS, res };
  }, { SCEN, SEATS });
} finally { await browser?.close(); server.kill(); }
const total = { frames: out.res.reduce((a, r) => a + r.lotF, 0), points: out.res.reduce((a, r) => a + r.lotP, 0) };
const bySeat = {};
for (const r of out.res) { const s = r.id.match(/^s(\d)/); const k = s ? s[1] : 'all'; (bySeat[k] ||= { frames: 0, points: 0, vis: 0 }); bySeat[k].frames += r.lotF; bySeat[k].points += r.lotP; bySeat[k].vis += r.vis; }
if (opt.out) fs.writeFileSync(path.resolve(HERE, opt.out), JSON.stringify({ out, total, bySeat }, null, 1));
console.log(JSON.stringify({ vp: `${VW}x${VH}`, scen: SCEN, q: opt.q || '', HS: out.HS, total, bySeat }));
for (const r of out.res) if (r.lotF) console.log(JSON.stringify({ id: r.id, lotF: r.lotF, lotP: r.lotP, byKind: r.byKind }));

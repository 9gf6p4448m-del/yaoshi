// 盯牌令牌丙 §1／§9 遮擋量具（凍結檔 docs/experiments/2026-10-08-mark-bing/acceptance.md）。
// 由示意 _mm.mjs 的 measure() 提煉：同一場景兩次離屏渲染——只畫該槽拍品（紅）、拍品＋令牌（藍疊上）——
//   A 口徑 occludedFrac＝(拍品紅像素 − 疊上令牌後剩下的紅像素) ÷ 拍品紅像素；B 口徑 boxOverlapFrac＝令牌 8 角投影凸包蓋到的拍品像素比（參考）。
// 與示意唯一差別：令牌 mesh 不只取 'prop-tokens'，而是所有名稱以 `prop-token` 開頭的 InstancedMesh（色底片／色邊也算擋）。
// 用法：node tests/tools/mark-occlusion.mjs [--root=<樹>] [--port=8997] [--vps=844x390,932x430] [--mm=C] [--scenes=s1a,s2,n4_slot0,…]
//        [--runs=1] [--shift=0.15] [--query=?mark=0] [--out=<json>]
//   --mm：只對示意樹有作用（window.__MM）。--shift：量測前把每枚令牌（所有 prop-token* 實例）沿水平方向往該槽拍品中心平移幾公尺（突變驗紅用，量完還原）。
//   --runs：每個視窗開幾次新頁面重跑（工具雜訊）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { arg, openBrowser, openMarkPage, applyScene, PAGE_HELPERS } from './mark-drive.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SEATS_N = { 1: [0], 2: [0, 2], 3: [0, 2, 3], 4: [0, 1, 2, 3] };
export const SCENES = {
  s1a: { marks: [[0, 0]] },
  s1b: { marks: [[0, 1]] },
  s2: { marks: [[0, 1], [2, 1], [3, 1]] },
  s3a: { marks: [[0, 1]], hands: true, frame: 'hit' },
  s3b: { marks: [[0, 1]], hands: true, frame: 'settled' },
};
for (const n of [1, 2, 3, 4]) for (const k of [0, 1, 2, 3]) SCENES[`n${n}_slot${k}`] = { marks: SEATS_N[n].map((s) => [s, k]) };
// 手拍令牌首幀（§1 首幀門檻）：單席 seat 拍 slot，手一起上場，取 tokenAt(seat).hit 那一幀
for (const st of [0, 1, 2, 3]) for (const k of [0, 1, 2, 3]) SCENES[`hit_s${st}_k${k}`] = { marks: [[st, k]], hands: true, frame: 'hit' };

export async function measureOcclusion(page, slot, W, H, shift = 0) {
  return page.evaluate(async ({ slot, W, H, shift, helpers }) => {
    if (!window.__markSlotNode) (0, eval)(helpers);
    const THREE = await import('three');
    const Y = window.__yaoshi3d, { scene, camera, renderer } = Y;
    const node = window.__markSlotNode(slot);
    const meshes = window.__markMeshes();
    const renderables = []; scene.traverse((o) => { if (o.isMesh || o.isLine || o.isPoints || o.isSprite) renderables.push([o, o.visible, o.material]); });
    const redM = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide }), blueM = new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide });
    const figSet = new Set(); node.traverse((o) => figSet.add(o));
    const rt = new THREE.WebGLRenderTarget(W, H);
    const prevBg = scene.background, prevFog = scene.fog, prevAC = renderer.autoClear, prevCC = renderer.getClearColor(new THREE.Color()), prevCA = renderer.getClearAlpha();
    const px = new Uint8Array(W * H * 4);
    const saved = meshes.map((m) => ({ m, mat: m.material, vis: m.visible, ic: m.instanceColor, arr: m.instanceMatrix.array.slice() }));
    // 突變：每個實例沿水平方向往拍品中心平移 shift 公尺
    if (shift) {
      node.updateMatrixWorld(true);
      const c = new THREE.Vector3().setFromMatrixPosition(node.matrixWorld);
      const m4 = new THREE.Matrix4(), inv = new THREE.Matrix4(), p = new THREE.Vector3();
      for (const m of meshes) {
        m.updateMatrixWorld(true); inv.copy(m.matrixWorld).invert();
        const cl = c.clone().applyMatrix4(inv); // 拍品中心換到該 mesh 的區域座標
        for (let i = 0; i < m.count; i++) {
          m.getMatrixAt(i, m4); p.setFromMatrixPosition(m4);
          const dx = cl.x - p.x, dz = cl.z - p.z, L = Math.hypot(dx, dz) || 1;
          m4.elements[12] += dx / L * shift; m4.elements[14] += dz / L * shift; m.setMatrixAt(i, m4);
        }
        m.instanceMatrix.needsUpdate = true;
      }
    }
    const pass = (showTok) => {
      for (const [o] of renderables) o.visible = false;
      for (const [o, vis] of renderables) { if (figSet.has(o)) { o.visible = vis; o.material = redM; } }
      for (const s of saved) { s.m.visible = showTok && s.m.count > 0; s.m.material = blueM; s.m.instanceColor = null; }
      scene.background = null; scene.fog = null; renderer.autoClear = true; renderer.setClearColor(0x000000, 1);
      renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null);
      renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
      const red = new Uint8Array(W * H), blue = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4, j = y * W + x; if (px[i] > 128 && px[i + 2] < 64) red[j] = 1; if (px[i + 2] > 128 && px[i] < 64) blue[j] = 1; }
      return { red, blue };
    };
    let p0, p1;
    try { p0 = pass(false); p1 = pass(true); }
    finally {
      for (const [o, vis, m] of renderables) { o.visible = vis; o.material = m; }
      for (const s of saved) { s.m.visible = s.vis; s.m.material = s.mat; s.m.instanceColor = s.ic; s.m.instanceMatrix.array.set(s.arr); s.m.instanceMatrix.needsUpdate = true; }
      scene.background = prevBg; scene.fog = prevFog; renderer.autoClear = prevAC; renderer.setClearColor(prevCC, prevCA); rt.dispose();
    }
    let F0 = 0, F1 = 0, tokPx = 0;
    for (let k = 0; k < W * H; k++) { F0 += p0.red[k]; F1 += p1.red[k]; tokPx += p1.blue[k]; }
    // B 口徑：只用 prop-tokens 本體 8 角（同示意），平移突變也套在角點上
    const tokens = meshes.find((m) => m.name === 'prop-tokens');
    const hulls = [];
    const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
    if (tokens) {
      tokens.updateMatrixWorld(true);
      const bb = tokens.geometry.boundingBox || (tokens.geometry.computeBoundingBox(), tokens.geometry.boundingBox);
      node.updateMatrixWorld(true);
      const c = new THREE.Vector3().setFromMatrixPosition(node.matrixWorld);
      for (let i = 0; i < tokens.count; i++) {
        tokens.getMatrixAt(i, m4); m4.premultiply(tokens.matrixWorld);
        let ox = 0, oz = 0;
        if (shift) { const p = new THREE.Vector3().setFromMatrixPosition(m4); const dx = c.x - p.x, dz = c.z - p.z, L = Math.hypot(dx, dz) || 1; ox = dx / L * shift; oz = dz / L * shift; }
        const pts = [];
        for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
          v.set(x, y, z).applyMatrix4(m4); v.x += ox; v.z += oz; v.project(camera); pts.push([(v.x * 0.5 + 0.5) * W, (1 - (v.y * 0.5 + 0.5)) * H]);
        }
        pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const lo = [], up = [];
        for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
        for (const p of [...pts].reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
        hulls.push(lo.slice(0, -1).concat(up.slice(0, -1)));
      }
    }
    const inside = (h, x, y) => { let pos = 0, neg = 0; for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; const c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]); if (c > 0) pos++; else if (c < 0) neg++; } return pos === 0 || neg === 0; };
    let box = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p0.red[y * W + x] && hulls.some((h) => inside(h, x + 0.5, y + 0.5))) box++;
    const fin = (a) => a.every(Number.isFinite);
    const nan = meshes.some((m) => !fin(Array.from(m.instanceMatrix.array.slice(0, m.count * 16))));
    return { figPx: F0, figVisibleWithTok: F1, occludedPx: F0 - F1, occludedFrac: F0 ? (F0 - F1) / F0 : null, boxOverlapPx: box, boxOverlapFrac: F0 ? box / F0 : null, tokPx, nTok: tokens ? tokens.count : 0, meshes: meshes.map((m) => `${m.name}:${m.count}`), nan };
  }, { slot, W, H, shift, helpers: PAGE_HELPERS });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(arg('root', path.join(HERE, '../..')));
  const port = +arg('port', 8997);
  const vps = arg('vps', '844x390,932x430').split(',');
  const mm = arg('mm', null);
  const names = arg('scenes', 's1a,s1b,s2,s3a,s3b').split(',');
  const runs = +arg('runs', 1), shift = +arg('shift', 0), query = arg('query', '');
  const out = [];
  const B = await openBrowser(root, port);
  try {
    for (let r = 0; r < runs; r++) for (const vp of vps) {
      const { page, run, W, H, errors } = await openMarkPage(B.browser, { port, vp, query, mm });
      for (const id of names) {
        const sc = SCENES[id]; if (!sc) throw new Error('unknown scene ' + id);
        await applyScene(page, run, sc);
        const m = await measureOcclusion(page, sc.marks[0][1], W, H, shift);
        const anim = await page.evaluate(() => { const T = window.__yaoshi3d.tray; return T.__mmSlots ? T.__mmSlots().map((s) => s.fig && s.fig.animTime ? +s.fig.animTime().toFixed(4) : null) : null; });
        const row = { run: r, vp, mm, query, scene: id, shift, ...m, anim };
        out.push(row);
        console.log(r, vp, mm || '-', id, JSON.stringify({ occ: m.occludedFrac?.toFixed(4), box: m.boxOverlapFrac?.toFixed(4), fig: m.figPx, tok: m.tokPx, n: m.nTok, nan: m.nan }));
      }
      if (errors.length) console.log('pageerror', vp, errors);
      await page.close();
    }
  } finally { await B.close(); }
  if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(out, null, 1));
  process.exit(0);
}

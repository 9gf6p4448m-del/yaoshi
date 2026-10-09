// 盯牌令牌丙 §2 席位辨識量具（凍結檔 docs/experiments/2026-10-08-mark-bing/acceptance.md）。
// 量法：
//   1. 最終畫面：截 canvas（DOM 全隱藏，含暈角層；燈光、色調映射、bloom 都在）→ 頁內解碼成 RGBA。
//   2. 遮罩：同一相機離屏渲染（drawing buffer 尺寸）——所有物件換成黑色 MeshBasic 當遮擋，
//      `prop-tokens` 第 i 枚＝「本體 i」、`prop-token-seat` 第 i 枚＝「席位色區 i」，以 instanceColor 寫入編碼色（不經色彩轉換）。
//      產品樹若沒有 `prop-token-seat`（c1a4d167 現況、示意 C），席位色區退回「本體 i」（mode=fallback-body），此時 (b) 無從計算＝紅。
//   3. 只取遮罩上 3×3 鄰域同標籤的像素（去掉邊緣混色），映射回截圖取平均 sRGB → Lab → CIEDE2000。
//      (a) 同場景任兩席的席位色區 ΔE（取最小）；(b) 每席 席位色區 vs 本體 ΔE（取最小）。
//      另量 visFrac：第 i 枚席位色區在疊放下可見像素 ÷ 把其他枚全部藏起來時的像素（取最小）。
//   實例 i 與席位的對應：取 props.tokenAt(seat) 的 (x,z) 與實例平移最近者。
// 用法：node tests/tools/mark-seat-color.mjs [--root=<樹>] [--port=8996] [--vps=…] [--mm=Cp] [--palette=#ffd23c,#ff9ab0,#5aa8ff,#4cff7a]
//        [--scenes=n1_slot0,…（預設 n{1..4}_slot{0..3}）] [--runs=1] [--same-color] [--out=<json>]
//   --palette 只作用在示意樹（window.__MMPAL）與 --nominal；產品實作量的是產品自己的色。
//   --same-color：突變——量測前把所有席位色區（或退回時的本體）instanceColor 改成第 0 枚的值（四席同色），截圖前重畫一幀。
//   --nominal：只算色票標稱值（sRGB hex）兩兩 ΔE 與對玉牌本體色 PROPS.TOKEN.jade 0x1a1215 的 ΔE，不開瀏覽器。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { arg, flag, openBrowser, openMarkPage, applyScene, PAGE_HELPERS } from './mark-drive.mjs';
import { SCENES } from './mark-occlusion.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_PALETTE = ['#ffd23c', '#ff9ab0', '#5aa8ff', '#4cff7a'];

// ── 色彩：sRGB(0..255) → Lab(D65) → CIEDE2000 ──
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export function rgb2lab([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047, Y = 0.2126729 * R + 0.7151522 * G + 0.0721750 * B, Z = (0.0193339 * R + 0.1191920 * G + 0.9503041 * B) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
export function de2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1, ap2 = (1 + G) * a2, Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
  const hp = (b, a) => { if (a === 0 && b === 0) return 0; const h = Math.atan2(b, a) / rad; return h < 0 ? h + 360 : h; };
  const h1 = hp(b1, ap1), h2 = hp(b2, ap2);
  const dL = L2 - L1, dC = Cp2 - Cp1;
  let dh = 0; if (Cp1 * Cp2 !== 0) { dh = h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dh * rad / 2);
  const Lb = (L1 + L2) / 2, Cpb = (Cp1 + Cp2) / 2;
  let hb = h1 + h2; if (Cp1 * Cp2 !== 0) { if (Math.abs(h1 - h2) > 180) hb = h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2; else hb = (h1 + h2) / 2; }
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.20 * Math.cos((4 * hb - 63) * rad);
  const dTh = 30 * Math.exp(-(((hb - 275) / 25) ** 2)), Rc = 2 * Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7));
  const Sl = 1 + 0.015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2), Sc = 1 + 0.045 * Cpb, Sh = 1 + 0.015 * Cpb * T, Rt = -Math.sin(2 * dTh * rad) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}
export const hex2rgb = (h) => { const n = parseInt(String(h).replace('#', '').replace(/^0x/, ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

export async function measureSeatColor(page, sameColor = false, run = null) {
  // 1. 最終畫面
  if (sameColor) {
    await page.evaluate(() => {
      const ms = window.__markMeshes ? window.__markMeshes() : window.__yaoshi3d.tray.props.group.children.filter((c) => /^prop-token/.test(c.name) && c.isInstancedMesh);
      const tgt = ms.find((m) => m.name === 'prop-token-seat') || ms.find((m) => m.name === 'prop-tokens');
      const a = tgt.instanceColor.array; for (let i = 1; i < tgt.count; i++) a.copyWithin(i * 3, 0, 3); tgt.instanceColor.needsUpdate = true;
      window.__sameColorTgt = tgt;
    });
    await run(16); // 讓遊戲自己畫一幀（含後處理）
    const still = await page.evaluate(() => { const t = window.__sameColorTgt, a = t.instanceColor.array; for (let i = 1; i < t.count; i++) for (let c = 0; c < 3; c++) if (a[i * 3 + c] !== a[c]) return false; return true; });
    if (!still) throw new Error('same-color 突變被遊戲每幀重寫蓋掉，突變無效');
  }
  const rect = await page.evaluate(() => { const r = window.__yaoshi3d.renderer.domElement.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  const png = (await page.screenshot({ clip: rect })).toString('base64');
  return page.evaluate(async ({ png, helpers }) => {
    if (!window.__markSlotNode) (0, eval)(helpers);
    const THREE = await import('three');
    const Y = window.__yaoshi3d, { scene, camera, renderer } = Y;
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + png)).blob());
    const cv = new OffscreenCanvas(img.width, img.height), cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const shot = cx.getImageData(0, 0, img.width, img.height).data;
    const db = renderer.getDrawingBufferSize(new THREE.Vector2()), W = db.x, H = db.y;
    const meshes = window.__markMeshes();
    const body = meshes.find((m) => m.name === 'prop-tokens'), seatM = meshes.find((m) => m.name === 'prop-token-seat' && m.count > 0); // count 0（示意 C 樹裡的空底片池）視同沒有
    const mode = seatM ? 'seat-mesh' : 'fallback-body';
    // 實例→席位
    const P = window.__yaoshi3d.tray.props, m4 = new THREE.Matrix4(), p = new THREE.Vector3();
    const seatOf = [];
    for (let i = 0; i < body.count; i++) {
      body.getMatrixAt(i, m4); p.setFromMatrixPosition(m4).applyMatrix4(body.matrixWorld);
      let best = -1, bd = 1e9; for (let s = 0; s < 4; s++) { const t = P.tokenAt(s); if (!t) continue; const d = Math.hypot(t.x - p.x, t.z - p.z); if (d < bd) { bd = d; best = s; } }
      seatOf.push(best);
    }
    const renderables = []; scene.traverse((o) => { if (o.isMesh || o.isLine || o.isPoints || o.isSprite) renderables.push([o, o.visible, o.material]); });
    const blackM = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, toneMapped: false });
    const maskM = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false });
    const saved = meshes.map((m) => ({ m, ic: m.instanceColor, mat: m.material, arr: m.instanceMatrix.array.slice() }));
    const rt = new THREE.WebGLRenderTarget(W, H);
    const px = new Uint8Array(W * H * 4);
    const prevBg = scene.background, prevFog = scene.fog, prevCC = renderer.getClearColor(new THREE.Color()), prevCA = renderer.getClearAlpha();
    const enc = (m, cls) => { const a = new Float32Array(m.instanceMatrix.count * 3); for (let i = 0; i < m.count; i++) { a[i * 3] = cls; a[i * 3 + 1] = (i + 1) * 0.2; a[i * 3 + 2] = 1; } return new THREE.InstancedBufferAttribute(a, 3); };
    const render = (only = -1) => {
      for (const [o] of renderables) { o.material = blackM; }
      for (const s of saved) {
        s.m.material = maskM; s.m.instanceColor = enc(s.m, s.m === seatM ? 1 : 0.5);
        s.m.instanceMatrix.array.set(s.arr);
        if (only >= 0) for (let i = 0; i < s.m.count; i++) if (i !== only) { s.m.getMatrixAt(i, m4); m4.scale(new THREE.Vector3(0, 0, 0)); s.m.setMatrixAt(i, m4); }
        s.m.instanceMatrix.needsUpdate = true;
      }
      scene.background = null; scene.fog = null; renderer.setClearColor(0x000000, 1);
      renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null);
      renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
      const lab = new Int8Array(W * H).fill(-1); // -1 無；0..3 本體 i；10..13 席位色區 i
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = ((H - 1 - y) * W + x) * 4; if (px[k + 2] < 200) continue;
        const i = Math.round(px[k + 1] / 51) - 1; if (i < 0 || i > 3) continue;
        lab[y * W + x] = px[k] > 200 ? 10 + i : (px[k] > 100 && px[k] < 160 ? i : -1);
      }
      return lab;
    };
    let full, alone = [];
    try {
      full = render();
      if (seatM) for (let i = 0; i < seatM.count; i++) alone.push(render(i));
    } finally {
      for (const [o, vis, m] of renderables) { o.material = m; o.visible = vis; }
      for (const s of saved) { s.m.instanceColor = s.ic; s.m.material = s.mat; s.m.instanceMatrix.array.set(s.arr); s.m.instanceMatrix.needsUpdate = true; }
      scene.background = prevBg; scene.fog = prevFog; renderer.setClearColor(prevCC, prevCA); rt.dispose();
    }
    const sx = img.width / W, sy = img.height / H;
    const region = (lab, L) => {
      let n = 0, nAll = 0, r = 0, g = 0, b = 0;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        if (lab[y * W + x] !== L) continue; nAll++;
        let ok = true; for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (lab[(y + dy) * W + x + dx] !== L) { ok = false; break; }
        if (!ok) continue;
        const X = Math.min(img.width - 1, Math.floor((x + 0.5) * sx)), Yp = Math.min(img.height - 1, Math.floor((y + 0.5) * sy)), k = (Yp * img.width + X) * 4;
        r += shot[k]; g += shot[k + 1]; b += shot[k + 2]; n++;
      }
      return { n, nAll, rgb: n ? [r / n, g / n, b / n] : null };
    };
    const inst = [];
    for (let i = 0; i < body.count; i++) {
      const bodyR = region(full, i);
      const seatR = seatM ? region(full, 10 + i) : bodyR;
      const aloneR = seatM ? region(alone[i], 10 + i) : null;
      inst.push({ i, seat: seatOf[i], body: bodyR, seatRegion: seatR, visFrac: aloneR && aloneR.nAll ? seatR.nAll / aloneR.nAll : null, seatAloneAll: aloneR ? aloneR.nAll : null });
    }
    return { mode, W, H, shotW: img.width, shotH: img.height, inst };
  }, { png, helpers: PAGE_HELPERS });
}

export function scoreSeatColor(m) {
  const labs = m.inst.map((x) => ({ seat: x.seat, seat_lab: x.seatRegion.rgb && rgb2lab(x.seatRegion.rgb), body_lab: x.body.rgb && rgb2lab(x.body.rgb), x }));
  let minPair = null, pairs = [];
  for (let a = 0; a < labs.length; a++) for (let b = a + 1; b < labs.length; b++) {
    if (!labs[a].seat_lab || !labs[b].seat_lab) { pairs.push({ a: labs[a].seat, b: labs[b].seat, de: null }); minPair = -1; continue; }
    const d = de2000(labs[a].seat_lab, labs[b].seat_lab); pairs.push({ a: labs[a].seat, b: labs[b].seat, de: +d.toFixed(2) });
    if (minPair !== -1) minPair = minPair === null ? d : Math.min(minPair, d);
  }
  let minBody = null; const bodyDe = [];
  for (const l of labs) {
    if (m.mode !== 'seat-mesh' || !l.seat_lab || !l.body_lab) { bodyDe.push({ seat: l.seat, de: null }); minBody = -1; continue; }
    const d = de2000(l.seat_lab, l.body_lab); bodyDe.push({ seat: l.seat, de: +d.toFixed(2) }); if (minBody !== -1) minBody = minBody === null ? d : Math.min(minBody, d);
  }
  const vis = m.inst.map((x) => x.visFrac).filter((v) => v !== null);
  return { mode: m.mode, minPairDE: minPair === null || minPair === -1 ? minPair : +minPair.toFixed(2), minSeatBodyDE: minBody === null || minBody === -1 ? minBody : +minBody.toFixed(2), minVisFrac: vis.length ? +Math.min(...vis).toFixed(3) : null, pairs, bodyDe,
    regions: m.inst.map((x) => ({ seat: x.seat, seatPx: x.seatRegion.n, bodyPx: x.body.n, seatRGB: x.seatRegion.rgb && x.seatRegion.rgb.map((v) => +v.toFixed(1)), bodyRGB: x.body.rgb && x.body.rgb.map((v) => +v.toFixed(1)), visFrac: x.visFrac && +x.visFrac.toFixed(3) })) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const palette = arg('palette', DEFAULT_PALETTE.join(',')).split(',');
  if (flag('nominal')) {
    const jade = '#1a1215', labs = palette.map((h) => rgb2lab(hex2rgb(h)));
    for (let a = 0; a < palette.length; a++) for (let b = a + 1; b < palette.length; b++) console.log(`pair ${palette[a]} ${palette[b]} ΔE2000=${de2000(labs[a], labs[b]).toFixed(2)}`);
    for (let a = 0; a < palette.length; a++) console.log(`vsJade ${palette[a]} ${jade} ΔE2000=${de2000(labs[a], rgb2lab(hex2rgb(jade))).toFixed(2)}`);
    process.exit(0);
  }
  const root = path.resolve(arg('root', path.join(HERE, '../..')));
  const port = +arg('port', 8996);
  const vps = arg('vps', '844x390,932x430').split(',');
  const mm = arg('mm', null), runs = +arg('runs', 1), query = arg('query', '');
  const names = arg('scenes', Object.keys(SCENES).filter((k) => /^n[1-4]_slot/.test(k)).join(',')).split(','); // 凍結檔 §2：n{1..4}_slot{0..3}
  const out = [];
  const B = await openBrowser(root, port);
  try {
    for (let r = 0; r < runs; r++) for (const vp of vps) {
      const { page, run, errors } = await openMarkPage(B.browser, { port, vp, query, mm, palette });
      for (const id of names) {
        await applyScene(page, run, SCENES[id]);
        const m = await measureSeatColor(page, flag('same-color'), run);
        const s = scoreSeatColor(m);
        out.push({ run: r, vp, mm, scene: id, palette, ...s, raw: m });
        console.log(r, vp, mm || '-', id, JSON.stringify({ mode: s.mode, minPairDE: s.minPairDE, minSeatBodyDE: s.minSeatBodyDE, minVisFrac: s.minVisFrac, px: s.regions.map((x) => `${x.seat}:${x.seatPx}/${x.bodyPx}`).join(' ') }));
      }
      if (errors.length) console.log('pageerror', vp, errors);
      await page.close();
    }
  } finally { await B.close(); }
  if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(out, null, 1));
  process.exit(0);
}

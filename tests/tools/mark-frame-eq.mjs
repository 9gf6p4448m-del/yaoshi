// 盯牌令牌丙 §5（?mark=0 退回）／§6（直式不變）量具（凍結檔 docs/experiments/2026-10-08-mark-bing/acceptance.md）。
// dump：對一棵樹（+query）逐場景記錄令牌相關 InstancedMesh 的 count／instanceMatrix／instanceColor——
//   名稱 prop-token*（令牌與席位色區）、prop-contact-shadows（接觸陰影）、prop-mark-racks（木籌槽）——
//   每個場景從 props.mark 起每 16ms 記一幀共 FR 幀（拍下＋回彈），再記落定（+3000ms）一幀；另截落定幀全畫面 PNG。
// cmp：兩份 dump 逐幀逐值比（最大絕對差；count 或 mesh 集合不同＝Infinity），PNG 逐像素比（相異像素數、最大通道差）。
// 用法：node tests/tools/mark-frame-eq.mjs dump --out=<dir> [--root=<樹>] [--port=8995] [--vps=844x390,932x430,1280x720] [--query=?mark=0] [--mm=C] [--scenes=…] [--fr=40] [--noshot]
//        node tests/tools/mark-frame-eq.mjs cmp <dirA> <dirB>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { arg, flag, chromium, openBrowser, openMarkPage, applyScene } from './mark-drive.mjs';
import { SCENES } from './mark-occlusion.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SNAP = () => {
  const P = window.__yaoshi3d.tray.props;
  const ms = P.group.children.filter((c) => c.isInstancedMesh && (/^prop-token/.test(c.name) || c.name === 'prop-contact-shadows' || c.name === 'prop-mark-racks'));
  const o = {};
  for (const m of ms) o[m.name] = { count: m.count, visible: m.visible, mat: Array.from(m.instanceMatrix.array.slice(0, m.count * 16)), col: m.instanceColor ? Array.from(m.instanceColor.array.slice(0, m.count * 3)) : null };
  return o;
};

async function dump() {
  const root = path.resolve(arg('root', path.join(HERE, '../..')));
  const port = +arg('port', 8995), out = arg('out'), fr = +arg('fr', 40), query = arg('query', ''), mm = arg('mm', null);
  const vps = arg('vps', '844x390,932x430,1280x720').split(',');
  const names = arg('scenes', Object.keys(SCENES).filter((k) => /^n[1-4]_slot/.test(k)).join(',')).split(',');
  fs.mkdirSync(out, { recursive: true });
  const B = await openBrowser(root, port);
  const meta = { root, query, mm, vps, names, fr, rows: [] };
  try {
    for (const vp of vps) {
      const { page, run, errors } = await openMarkPage(B.browser, { port, vp, query, mm });
      for (const id of names) {
        const sc = SCENES[id];
        await applyScene(page, run, { ...sc, frame: 'none' }); // 清桌＋mark、不推進，下面逐幀記
        const frames = [];
        for (let f = 0; f < fr; f++) { await run(16); frames.push(await page.evaluate(SNAP)); }
        await run(3000); frames.push(await page.evaluate(SNAP));
        const file = `${vp}_${id}.json`;
        fs.writeFileSync(path.join(out, file), JSON.stringify(frames));
        if (!flag('noshot')) await page.screenshot({ path: path.join(out, `${vp}_${id}.png`) });
        meta.rows.push({ vp, id, file });
      }
      meta.errors = (meta.errors || []).concat(errors.map((e) => `${vp}: ${e}`));
      await page.close();
    }
  } finally { await B.close(); }
  fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta, null, 1));
  console.log('dump', out, meta.rows.length, 'scenes', 'errors', meta.errors.length);
}

async function cmp(a, b) {
  const ma = JSON.parse(fs.readFileSync(path.join(a, 'meta.json'))), mb = JSON.parse(fs.readFileSync(path.join(b, 'meta.json')));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let worstMat = 0; const res = [];
  try {
    for (const r of ma.rows) {
      const fa = JSON.parse(fs.readFileSync(path.join(a, r.file))), pb = path.join(b, r.file);
      if (!fs.existsSync(pb)) { res.push({ ...r, matDiff: 'missing' }); worstMat = Infinity; continue; }
      const fb = JSON.parse(fs.readFileSync(pb));
      let d = 0, where = null;
      for (let f = 0; f < Math.max(fa.length, fb.length); f++) {
        const A = fa[f] || {}, Bf = fb[f] || {};
        for (const k of new Set([...Object.keys(A), ...Object.keys(Bf)])) {
          const x = A[k], y = Bf[k];
          if (!x || !y || x.count !== y.count || x.visible !== y.visible) { d = Infinity; where = where || `f${f} ${k} count ${x && x.count}/${y && y.count}`; continue; }
          for (const fld of ['mat', 'col']) { const u = x[fld] || [], v = y[fld] || []; if (u.length !== v.length) { d = Infinity; where = where || `f${f} ${k}.${fld} len`; continue; } for (let i = 0; i < u.length; i++) { const e = Math.abs(u[i] - v[i]); if (e > d) { d = e; where = `f${f} ${k}.${fld}[${i}]`; } } }
        }
      }
      worstMat = Math.max(worstMat, d);
      let px = null;
      const ia = path.join(a, r.file.replace('.json', '.png')), ib = path.join(b, r.file.replace('.json', '.png'));
      if (fs.existsSync(ia) && fs.existsSync(ib)) {
        px = await page.evaluate(async ({ A, B }) => {
          const dec = async (s) => { const im = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(im.width, im.height).getContext('2d'); c.drawImage(im, 0, 0); return { w: im.width, h: im.height, d: c.getImageData(0, 0, im.width, im.height).data }; };
          const x = await dec(A), y = await dec(B);
          if (x.w !== y.w || x.h !== y.h) return { size: false };
          let n = 0, mx = 0; for (let i = 0; i < x.d.length; i += 4) { const e = Math.max(Math.abs(x.d[i] - y.d[i]), Math.abs(x.d[i + 1] - y.d[i + 1]), Math.abs(x.d[i + 2] - y.d[i + 2])); if (e) { n++; if (e > mx) mx = e; } }
          return { diffPx: n, maxCh: mx, total: x.w * x.h };
        }, { A: fs.readFileSync(ia).toString('base64'), B: fs.readFileSync(ib).toString('base64') });
      }
      res.push({ vp: r.vp, id: r.id, matDiff: d, where, px });
      console.log(r.vp.padEnd(9), r.id.padEnd(9), 'matMaxDiff', d === Infinity ? 'Inf' : d.toExponential(2), where || '', px ? JSON.stringify(px) : '');
    }
  } finally { await browser.close(); }
  console.log('WORST matMaxDiff', worstMat, 'WORST diffPx', Math.max(...res.map((x) => x.px?.diffPx ?? 0)), 'WORST maxCh', Math.max(...res.map((x) => x.px?.maxCh ?? 0)));
  return res;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const mode = process.argv[2];
  if (mode === 'dump') await dump();
  else if (mode === 'cmp') { const r = await cmp(process.argv[3], process.argv[4]); if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(r, null, 1)); }
  else { console.log('mode: dump | cmp'); process.exit(2); }
  process.exit(0);
}

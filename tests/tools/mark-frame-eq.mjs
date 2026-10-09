// 盯牌令牌丙 §5（?mark=0 退回）／§6（直式不變）量具（凍結檔 docs/experiments/2026-10-08-mark-bing/acceptance.md）。
// dump：對一棵樹（+query）逐場景記錄令牌相關 InstancedMesh 的 count／instanceMatrix／instanceColor——
//   名稱 prop-token*（令牌與席位色區）、prop-contact-shadows（接觸陰影）、prop-mark-racks（木籌槽）——
//   每個場景從 props.mark 起每 16ms 記一幀共 FR 幀（拍下＋回彈），再記落定（+3000ms）一幀；另截落定幀全畫面 PNG。
// cmp：兩份 dump 逐幀逐值比（最大絕對差；count 或 mesh 集合不同＝Infinity），PNG 逐像素比（相異像素數、最大通道差）。
// 用法：node tests/tools/mark-frame-eq.mjs dump --out=<dir> [--root=<樹>] [--port=8995] [--vps=844x390,932x430,1280x720] [--query=?mark=0] [--mm=C] [--scenes=…] [--fr=40] [--noshot]
//        node tests/tools/mark-frame-eq.mjs cmp <dirA> <dirB>
// 5b（令牌層足跡 XOR）：dump 加 --layer（同時啟用 openMarkPage 的 vclock 假時鐘，見 mark-drive.mjs），落定後派 ys:hitstop(ms=1e9)（js/renderer.js:303-307，dt 歸零但照樣 render）把動畫相位凍住，
//   同一凍結狀態拍兩張：<vp>_<id>.f.png（令牌層全開）、<vp>_<id>.o.png（prop-token*／prop-contact-shadows／prop-mark-racks 全關）；兩張相異像素＝令牌層足跡。
//   node tests/tools/mark-frame-eq.mjs foot <受測dump目錄> <基準dump目錄 ×≥8>：輸出基準對基準 XOR px（min/median/max，max＝底線）與受測對各基準 XOR px，受測 max ≤ 底線才綠。
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
      const { page, run, errors } = await openMarkPage(B.browser, { port, vp, query, mm, vclock: flag('layer') });
      for (const id of names) {
        const sc = SCENES[id];
        await applyScene(page, run, { ...sc, frame: 'none' }); // 清桌＋mark、不推進，下面逐幀記
        const frames = [];
        for (let f = 0; f < fr; f++) { await run(16); frames.push(await page.evaluate(SNAP)); }
        await run(3000); frames.push(await page.evaluate(SNAP));
        const file = `${vp}_${id}.json`;
        fs.writeFileSync(path.join(out, file), JSON.stringify(frames));
        if (!flag('noshot')) await page.screenshot({ path: path.join(out, `${vp}_${id}.png`) });
        if (flag('layer')) {
          await page.evaluate(() => document.dispatchEvent(new CustomEvent('ys:hitstop', { detail: { ms: 1e9 } })));
          await run(48); await page.screenshot({ path: path.join(out, `${vp}_${id}.f.png`) });
          await page.evaluate(() => { for (const m of window.__yaoshi3d.tray.props.group.children) if (m.isInstancedMesh && (/^prop-token/.test(m.name) || m.name === 'prop-contact-shadows' || m.name === 'prop-mark-racks')) m.visible = false; });
          await run(48); await page.screenshot({ path: path.join(out, `${vp}_${id}.o.png`) });
          await page.evaluate(() => document.dispatchEvent(new CustomEvent('ys:hitstop', { detail: { ms: 0 } })));
        }
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

// 足跡＝f.png 與 o.png 逐像素「任一通道不同」的遮罩；兩棵樹足跡比 XOR px。
async function foot(test, bases) {
  if (bases.length < 8) { console.log('基準 dump 需 ≥8 次，收到 ' + bases.length); process.exit(2); }
  const meta = JSON.parse(fs.readFileSync(path.join(test, 'meta.json')));
  const browser = await chromium.launch(); const page = await browser.newPage();
  const mask = async (d, r) => {
    const b64 = (n) => fs.readFileSync(path.join(d, `${r.vp}_${r.id}.${n}.png`)).toString('base64');
    return page.evaluate(async ({ F, O }) => {
      const dec = async (s) => { const im = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(im.width, im.height).getContext('2d'); c.drawImage(im, 0, 0); return c.getImageData(0, 0, im.width, im.height).data; };
      const f = await dec(F), o = await dec(O); const m = new Uint8Array(f.length / 4);
      for (let i = 0; i < m.length; i++) m[i] = (f[4 * i] !== o[4 * i] || f[4 * i + 1] !== o[4 * i + 1] || f[4 * i + 2] !== o[4 * i + 2]) ? 1 : 0;
      return Array.from(m).join('');
    }, { F: b64('f'), O: b64('o') });
  };
  const xor = (x, y) => { let n = 0; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) n++; return n; };
  const stat = (v) => { const s = [...v].sort((p, q) => p - q); return `${s[0]} / ${s[s.length >> 1]} / ${s[s.length - 1]}`; };
  let bad = false;
  try {
    for (const r of meta.rows) {
      const T = await mask(test, r); const B = []; for (const b of bases) B.push(await mask(b, r));
      const bb = []; for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) bb.push(xor(B[i], B[j]));
      const floor = Math.max(...bb), tb = B.map((b) => xor(T, b));
      const ok = Math.max(...tb) <= floor; if (!ok) bad = true;
      console.log(r.vp, r.id, `基準 ${B.length} 次 ${bb.length} 對 XOR px min/median/max=${stat(bb)}（底線 ${floor}）`, `受測對基準 ${tb.length} 筆 min/median/max=${stat(tb)}`, ok ? '綠' : '紅');
    }
  } finally { await browser.close(); }
  console.log(bad ? 'FOOT RED' : 'FOOT GREEN'); process.exitCode = bad ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const mode = process.argv[2];
  if (mode === 'dump') await dump();
  else if (mode === 'foot') await foot(process.argv[3], process.argv.slice(4).filter((x) => !x.startsWith('--')));
  else if (mode === 'cmp') { const r = await cmp(process.argv[3], process.argv[4]); if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(r, null, 1)); }
  else { console.log('mode: dump | cmp'); process.exit(2); }
  process.exit(0);
}

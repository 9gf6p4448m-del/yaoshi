// 盯牌令牌丙 §5（?mark=0 退回）／§6（直式不變）量具（凍結檔 docs/experiments/2026-10-08-mark-bing/acceptance.md）。
// dump：對一棵樹（+query）逐場景記錄令牌相關 InstancedMesh 的 count／instanceMatrix／instanceColor——
//   名稱 prop-token*（令牌與席位色區）、prop-contact-shadows（接觸陰影）、prop-mark-racks（木籌槽）——
//   每個場景從 props.mark 起每 16ms 記一幀共 FR 幀（拍下＋回彈），再記落定（+3000ms）一幀；另截落定幀全畫面 PNG。
// cmp：兩份 dump 逐幀逐值比（最大絕對差；count 或 mesh 集合不同＝Infinity），PNG 逐像素比（相異像素數、最大通道差）。
// 用法：node tests/tools/mark-frame-eq.mjs dump --out=<dir> [--root=<樹>] [--port=8995] [--vps=844x390,932x430,1280x720] [--query=?mark=0] [--mm=C] [--scenes=…] [--fr=40] [--noshot]
//        node tests/tools/mark-frame-eq.mjs cmp <dirA> <dirB>
// 5b（令牌層足跡 XOR）：dump 加 --layer（同時啟用 openMarkPage 的 vclock 假時鐘，見 mark-drive.mjs），落定後派 ys:hitstop(ms=1e9)（js/renderer.js:303-307，dt 歸零但照樣 render）把動畫相位凍住，
//   同一凍結狀態拍兩張：<vp>_<id>.f.png（令牌層全開）、<vp>_<id>.o.png（prop-token*／prop-contact-shadows／prop-mark-racks 全關）；兩張相異像素＝令牌層足跡。
//   node tests/tools/mark-frame-eq.mjs foot <受測dump目錄> (<基準dump目錄 ×≥8>… | --base-dir=<批次目錄>) [--full] [--base-sha=c1a4d167] [--expect=diff]：輸出基準對基準 XOR px（min/median/max，max＝底線）與受測對各基準 XOR px，
//   受測 max ≤ 底線才綠（判紅一律用 max；min／median 僅供參考）。另比 <vp>_<id>.mat.json（令牌層 mesh 的材質／渲染狀態＋props.group 全部後代清單，兩棵樹逐值相等），任一欄不等即紅。
//   --expect=diff（「預設差異」量測）：綠＝受測對每個基準的 XOR px 全部 ＞ 底線（用來證明預設畫面確實與舊版不同）；此模式不看材質。
//   基準必須是同一個批次的「全部」dump：基準 dump 時加 --batch=<id> --batch-size=<N>（N＝此批預定份數，事前宣告）；foot 要求基準全屬同一 batch、傳入份數＝N、
//   且基準 dump 所在目錄裡該 batch 的 dump 全部都被傳入（少傳／挑選＝拒跑）。--base-dir=<目錄> 會把該目錄下全部含 meta.json 的子目錄當基準（不得另外再傳基準目錄）。
//   覆蓋範圍：驗收範圍＝3 視窗（844x390、932x430、1280x720）×16 場景（n{1..4}_slot{0..3}）＝48 格。foot 結尾印 COVERAGE n/48；未滿 48 格時輸出明確標「僅部分覆蓋，不得據此宣告 5b 通過」；
//   加 --full 則不足 48 格 → 退出碼 2（驗收判定必須用 --full）。
//   退出碼：0＝綠；1＝紅（足跡／材質不合；驗「必須紅」的實作驗收項只認 1）；2＝量測無效或量具崩潰（基準＜8、基準樹身分不明／不一致／非 --base-sha／有未提交改動、受測與基準同一棵樹、dump 重複、並行數 --par 不一致、
//   基準材質自己不穩、批次不全、列集合不一致、缺檔、meta.rows 空、--full 未滿 48 格、任何例外）。2 一律不是綠也不是紅，不得拿來當「驗紅」的證據。
//   dump 會把樹身分寫進 meta.tree（HEAD SHA＋未提交 diff 雜湊）、meta.par（--par=<同時跑的 headless 數>，基準與受測必須相同）、meta.runId、meta.batch。
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
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

// 5b 材質／渲染狀態：令牌層 mesh（同 SNAP 的名稱集合）的 material（own 屬性全數＋貼圖穩定特徵＋uniforms＋onBeforeCompile／customProgramCacheKey）與 mesh 渲染屬性，
// 外加 props.group 底下「全部後代」（遞迴；路徑|name|type|visible）與 props.group 的兄弟清單。色與透明度等只改材質不動足跡的壞實作靠這裡抓。
// 排除 uuid／id／version／_listeners（每次不同、或是 renderer 掛的內部監聽、與渲染結果無關）；貼圖不比 uuid，比 src（去 origin）＋尺寸＋colorSpace＋flipY＋repeat／offset 等＋像素雜湊。
const MAT = () => {
  const P = window.__yaoshi3d.tray.props;
  const isTok = (c) => c.isInstancedMesh && (/^prop-token/.test(c.name) || c.name === 'prop-contact-shadows' || c.name === 'prop-mark-racks');
  const ms = P.group.children.filter(isTok);
  const hs = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  const hsA = (a) => { let h = 2166136261; for (let i = 0; i < a.length; i++) { h ^= (a[i] * 1000) | 0; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16) + ':' + a.length; };
  const norm = (u) => { u = String(u); const m = /^data:([^,]*),(.*)$/s.exec(u); return m ? `data:${m[1]}:${m[2].length}:${hs(m[2])}` : u.replace(/^[a-z]+:\/\/[^/]+/i, ''); };
  const pix = (im) => {
    try {
      if (!im) return null;
      if (im.data) return 'd' + hsA(im.data);
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0); return 'p' + hsA(x.getImageData(0, 0, c.width, c.height).data);
    } catch (e) { return 'pix-err'; }
  };
  const tex = (t) => ({
    src: t.image && (t.image.currentSrc || t.image.src) ? norm(t.image.currentSrc || t.image.src) : null,
    img: t.image ? (t.image.constructor && t.image.constructor.name) + ':' + t.image.width + 'x' + t.image.height : null, pix: pix(t.image),
    cs: t.colorSpace, flipY: t.flipY, repeat: t.repeat && t.repeat.toArray(), offset: t.offset && t.offset.toArray(), rotation: t.rotation, center: t.center && t.center.toArray(),
    wrapS: t.wrapS, wrapT: t.wrapT, mag: t.magFilter, min: t.minFilter, aniso: t.anisotropy, mips: t.generateMipmaps, premul: t.premultiplyAlpha,
    channel: t.channel, mapping: t.mapping, format: t.format, type: t.type, unpack: t.unpackAlignment, matrixAuto: t.matrixAutoUpdate, tm: t.matrix && t.matrix.elements ? Array.from(t.matrix.elements) : null,
  });
  const val = (v, d = 0) => {
    if (v === null || v === undefined) return null;
    const ty = typeof v;
    if (ty === 'number' || ty === 'boolean' || ty === 'string') return v;
    if (ty === 'function') return 'fn:' + hs(String(v));
    if (v.isColor) return v.getHex();
    if (v.isVector2 || v.isVector3 || v.isVector4 || v.isEuler || v.isQuaternion) return v.toArray();
    if (v.isMatrix3 || v.isMatrix4) return Array.from(v.elements);
    if (v.isTexture) return tex(v);
    if (d > 3) return 'deep:' + ((v.constructor && v.constructor.name) || ty);
    if (Array.isArray(v)) return v.map((x) => val(x, d + 1));
    const o = {};
    for (const k of Object.keys(v)) o[k] = val(v[k], d + 1);
    return o;
  };
  const SKIP = new Set(['uuid', 'id', 'version', '_version', '_listeners']);
  const js = (x) => { try { return JSON.stringify(x); } catch (e) { return 'err'; } };
  const matDesc = (t) => {
    const o = {};
    for (const k of Object.keys(t)) { if (SKIP.has(k)) continue; o[k] = val(t[k]); }
    // 明確補上一份（就算被改成原型方法或 getter、Object.keys 看不到也要看得到）
    for (const k of ['type', 'toneMapped', 'fog', 'colorWrite', 'depthWrite', 'depthTest', 'blending', 'blendSrc', 'blendDst', 'blendEquation', 'blendSrcAlpha', 'blendDstAlpha', 'blendEquationAlpha',
      'side', 'shadowSide', 'alphaTest', 'alphaToCoverage', 'premultipliedAlpha', 'dithering', 'forceSinglePass', 'transparent', 'opacity', 'vertexColors', 'flatShading', 'wireframe',
      'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'stencilWrite', 'visible']) o['x_' + k] = val(t[k]);
    for (const k of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'envMap', 'alphaMap', 'bumpMap', 'lightMap', 'displacementMap', 'matcap', 'gradientMap']) o['x_' + k] = t[k] ? tex(t[k]) : null;
    o.x_onBeforeCompile = typeof t.onBeforeCompile === 'function' ? hs(String(t.onBeforeCompile)) : null;
    o.x_hasOwnOnBeforeCompile = Object.prototype.hasOwnProperty.call(t, 'onBeforeCompile');
    try { o.x_customProgramCacheKey = String(t.customProgramCacheKey()); } catch (e) { o.x_customProgramCacheKey = 'err'; }
    o.x_userData = js(t.userData);
    if (t.uniforms) { o.x_uniforms = {}; for (const k of Object.keys(t.uniforms)) o.x_uniforms[k] = val(t.uniforms[k] && t.uniforms[k].value); }
    return o;
  };
  const o = {};
  const all = [];
  const walk = (n, chain) => { n.children.forEach((c, i) => { const ch = chain + '.' + i; all.push(`${ch}|${c.name}|${c.type}|${c.visible ? 'v' : 'h'}`); walk(c, ch); }); };
  walk(P.group, 'g');
  o.__descendants = all; // props.group 全部後代（含孫物件、含 visible=false）：新增／改名／藏起／順序變動都會讓這份清單變
  o.__siblings = P.group.parent ? P.group.parent.children.map((c, i) => `${i}|${c.name}|${c.type}|${c.visible ? 'v' : 'h'}`) : [];
  for (const m of ms) {
    const mats = (Array.isArray(m.material) ? m.material : [m.material]).map(matDesc);
    const pos = m.geometry.attributes.position;
    o[m.name] = {
      visible: m.visible, renderOrder: m.renderOrder, castShadow: m.castShadow, receiveShadow: m.receiveShadow, frustumCulled: m.frustumCulled, layers: m.layers.mask,
      matrixAutoUpdate: m.matrixAutoUpdate, matrix: Array.from(m.matrix.elements), userData: js(m.userData),
      verts: pos.count, posHash: hsA(pos.array), index: m.geometry.index ? m.geometry.index.count : null, drawRange: [m.geometry.drawRange.start, m.geometry.drawRange.count],
      groups: m.geometry.groups.map((g) => [g.start, g.count, g.materialIndex]), attrs: Object.keys(m.geometry.attributes).map((k) => k + ':' + m.geometry.attributes[k].itemSize),
      hasInstanceColor: !!m.instanceColor, mats,
    };
  }
  return o;
};

// 樹身分：HEAD SHA ＋ 未提交 diff 雜湊（含未追蹤檔清單）；非 git 樹回 unknown。
function treeId(root) {
  try {
    const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const head = git('rev-parse', 'HEAD').trim();
    const diff = git('diff', 'HEAD') + '\n' + git('ls-files', '--others', '--exclude-standard');
    const dirty = diff.trim() !== '';
    return { head, dirty, diffHash: dirty ? crypto.createHash('sha1').update(diff).digest('hex') : '' };
  } catch (e) { return { head: 'unknown', dirty: true, diffHash: 'unknown' }; }
}

// --batch=<id> --batch-size=<N>：基準批次宣告（兩者同時給或同時不給）。foot 用它確認基準是「同一批次的全部」。
function batchArg() {
  const id = arg('batch', null), size = arg('batch-size', null);
  if ((id === null) !== (size === null)) { console.log('--batch 與 --batch-size 必須同時給'); process.exit(2); }
  if (id === null) return null;
  if (!/^[0-9]+$/.test(size) || +size < 1) { console.log('--batch-size 必須是正整數'); process.exit(2); }
  return { id, size: +size };
}

async function dump() {
  const root = path.resolve(arg('root', path.join(HERE, '../..')));
  const port = +arg('port', 8995), out = arg('out'), fr = +arg('fr', 40), query = arg('query', ''), mm = arg('mm', null);
  const vps = arg('vps', '844x390,932x430,1280x720').split(',');
  const names = arg('scenes', Object.keys(SCENES).filter((k) => /^n[1-4]_slot/.test(k)).join(',')).split(',');
  const batch = batchArg(); // 參數錯誤要在開瀏覽器／伺服器之前就退出
  fs.mkdirSync(out, { recursive: true });
  const B = await openBrowser(root, port);
  const meta = { root, query, mm, vps, names, fr, rows: [], layer: flag('layer'), par: arg('par', null), runId: crypto.randomUUID(), tree: treeId(root), batch };
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
          fs.writeFileSync(path.join(out, `${vp}_${id}.mat.json`), JSON.stringify(await page.evaluate(MAT)));
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
// 判紅口徑：受測對各基準 XOR px 的 max ＞ 底線（基準對基準兩兩 XOR 的 max）＝紅；材質狀態任一欄與基準不等＝紅。
// 退出碼：0 綠、1 紅、2 量測無效或量具崩潰（含任何例外）——2 不是綠也不是紅，驗「必須紅」只認 1。
const REJECT = (msg) => { console.log('REJECT（量測無效或量具崩潰，不是綠也不是紅，退出碼 2）：' + msg); process.exit(2); };
const VPS_REQ = ['844x390', '932x430', '1280x720'];
const reqCells = () => { const ids = Object.keys(SCENES).filter((k) => /^n[1-4]_slot[0-3]$/.test(k)).sort(); const c = []; for (const vp of VPS_REQ) for (const id of ids) c.push(`${vp}_${id}`); return c; };
async function foot(test, bases, opts = {}) {
  const baseSha = opts.baseSha || 'c1a4d167', expectDiff = opts.expect === 'diff', full = !!opts.full;
  const REQ = reqCells();
  if (REQ.length !== 48) REJECT(`驗收範圍應為 3 視窗×16 場景＝48 格，量具算出 ${REQ.length}（SCENES 變動？）`);
  if (!test) REJECT('缺受測 dump 目錄');
  if (opts.baseDir) {
    if (bases.length) REJECT('--base-dir 不得再另外傳基準目錄（避免挑選）');
    let ents; try { ents = fs.readdirSync(opts.baseDir, { withFileTypes: true }); } catch (e) { REJECT('--base-dir 讀不到：' + opts.baseDir); }
    bases = ents.filter((e) => e.isDirectory() && fs.existsSync(path.join(opts.baseDir, e.name, 'meta.json'))).map((e) => path.join(opts.baseDir, e.name)).sort();
  }
  if (bases.length < 8) REJECT('基準 dump 需 ≥8 次，收到 ' + bases.length);
  const rd = (d) => { try { return JSON.parse(fs.readFileSync(path.join(d, 'meta.json'))); } catch (e) { REJECT(d + ' 讀不到 meta.json'); } };
  const meta = rd(test), bm = bases.map(rd);
  for (const [d, m] of [[test, meta], ...bases.map((d, i) => [d, bm[i]])]) {
    if (!m.tree || !m.runId || !m.layer) REJECT(d + ' 的 meta 缺 tree／runId／layer（不是新版 dump --layer 產的）');
    if (m.tree.head === 'unknown') REJECT(d + ' 樹身分不明（root 不是 git 樹）');
    if (!Array.isArray(m.rows) || m.rows.length === 0) REJECT(d + ' 的 meta.rows 是空的（沒有任何量到的格）；空集合不得判綠');
  }
  const id = (m) => m.tree.head + '|' + m.tree.diffHash;
  if (new Set(bm.map((m) => m.runId)).size !== bm.length || bm.some((m) => m.runId === meta.runId)) REJECT('dump 重複（runId 相同；同一次 dump 不得重複當基準或受測）');
  if (new Set(bm.map(id)).size !== 1) REJECT('基準樹身分不一致：' + [...new Set(bm.map(id))].join(' , '));
  if (!bm[0].tree.head.startsWith(baseSha) || bm[0].tree.dirty) REJECT(`基準必須是乾淨的 ${baseSha}，收到 ${bm[0].tree.head}${bm[0].tree.dirty ? '（有未提交改動）' : ''}`);
  if (id(meta) === id(bm[0])) REJECT('受測樹與基準是同一棵樹（' + meta.tree.head + '）；自己對自己必綠，沒有鑑別力');
  const pars = new Set([meta.par, ...bm.map((m) => m.par)]);
  if (pars.size !== 1 || pars.has(null) || pars.has(undefined)) REJECT('基準與受測必須在同樣並行條件下 dump 且都帶 --par=<N>；收到 par=' + [...pars].join(','));
  // 批次：基準必須是同一批次的「全部」dump（不得挑選）
  if (bm.some((m) => !m.batch || !m.batch.id || !m.batch.size)) REJECT('基準 dump 缺 meta.batch（dump 時須加 --batch=<id> --batch-size=<N>）；不屬任何批次的 dump 不得當基準');
  const bids = new Set(bm.map((m) => m.batch.id));
  if (bids.size !== 1) REJECT('基準不屬同一批次（batch id：' + [...bids].join(' , ') + '）');
  const bid = [...bids][0], bsize = bm[0].batch.size;
  if (bm.some((m) => m.batch.size !== bsize)) REJECT('基準的 batch-size 宣告彼此不同');
  if (meta.batch && meta.batch.id === bid) REJECT('受測 dump 與基準屬同一批次 ' + bid);
  if (bases.length !== bsize) REJECT(`批次 ${bid} 宣告共 ${bsize} 份 dump，只傳入 ${bases.length} 份（少傳或挑選；基準必須是整批全用）`);
  const rs = (d) => path.resolve(d);
  const passed = new Set(bases.map(rs)); if (passed.size !== bases.length) REJECT('基準目錄重複傳入');
  const onDisk = new Set();
  for (const par of new Set(bases.map((b) => path.dirname(rs(b))))) {
    for (const e of fs.readdirSync(par, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const mp = path.join(par, e.name, 'meta.json'); if (!fs.existsSync(mp)) continue;
      let mm; try { mm = JSON.parse(fs.readFileSync(mp)); } catch (er) { continue; }
      if (mm.batch && mm.batch.id === bid) onDisk.add(path.join(par, e.name));
    }
  }
  const missing = [...onDisk].filter((d) => !passed.has(rs(d)));
  if (missing.length) REJECT(`批次 ${bid} 在基準目錄下有 ${onDisk.size} 份 dump，傳入 ${passed.size} 份，漏了：${missing.slice(0, 5).join(', ')}（不得挑選）`);
  // 列集合：受測與每份基準必須量到同一組格，且檔案齊全
  const key = (r) => `${r.vp}_${r.id}`;
  const tset = [...new Set(meta.rows.map(key))].sort();
  for (const [d, m] of bases.map((d, i) => [d, bm[i]])) {
    const bset = [...new Set(m.rows.map(key))].sort();
    if (JSON.stringify(bset) !== JSON.stringify(tset)) REJECT(`受測與基準 ${d} 量到的格不同（視窗或場景不一致）：受測=${tset.join(',')} 基準=${bset.join(',')}`);
  }
  for (const d of [test, ...bases]) for (const r of meta.rows) for (const ext of ['f.png', 'o.png', 'mat.json']) { const fp = path.join(d, `${r.vp}_${r.id}.${ext}`); if (!fs.existsSync(fp)) REJECT('缺檔：' + fp); }
  const covered = REQ.filter((c) => tset.includes(c)).length;
  if (full && covered < 48) REJECT(`--full 要求驗收範圍 48 格全覆蓋，受測只有 ${covered}/48 格`);
  const browser = await chromium.launch(); const page = await browser.newPage();
  const mask = async (d, r) => {
    const b64 = (n) => fs.readFileSync(path.join(d, `${r.vp}_${r.id}.${n}.png`)).toString('base64');
    return page.evaluate(async ({ F, O }) => {
      const dec = async (s) => { const im = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(im.width, im.height).getContext('2d'); c.drawImage(im, 0, 0); return c.getImageData(0, 0, im.width, im.height).data; };
      const f = await dec(F), o = await dec(O);
      if (f.length !== o.length) return null;
      const m = new Uint8Array(f.length / 4);
      for (let i = 0; i < m.length; i++) m[i] = (f[4 * i] !== o[4 * i] || f[4 * i + 1] !== o[4 * i + 1] || f[4 * i + 2] !== o[4 * i + 2]) ? 1 : 0;
      return Array.from(m).join('');
    }, { F: b64('f'), O: b64('o') }).then((x) => { if (x === null) REJECT(`${d} ${r.vp}_${r.id} 的 f.png／o.png 尺寸不同`); return x; });
  };
  const xor = (x, y) => { if (x.length !== y.length) REJECT('兩張足跡遮罩尺寸不同（視窗不一致）'); let n = 0; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) n++; return n; };
  const stat = (v) => { const s = [...v].sort((p, q) => p - q); return `${s[0]} / ${s[s.length >> 1]} / ${s[s.length - 1]}`; };
  const matOf = (d, r) => JSON.parse(fs.readFileSync(path.join(d, `${r.vp}_${r.id}.mat.json`)));
  const flat = (o, p = '', out = {}) => { if (o && typeof o === 'object') for (const k of Object.keys(o)) flat(o[k], p ? p + '.' + k : k, out); else out[p] = o; return out; };
  let bad = false;
  try {
    for (const r of meta.rows) {
      const T = await mask(test, r); const B = []; for (const b of bases) B.push(await mask(b, r));
      const bb = []; for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) bb.push(xor(B[i], B[j]));
      const floor = Math.max(...bb), tb = B.map((b) => xor(T, b));
      const mx = Math.max(...tb), mn = Math.min(...tb);
      const footOk = expectDiff ? mn > floor : mx <= floor;
      let matMsg = '（--expect=diff 不看材質）', matOk = true;
      if (!expectDiff) {
        const mb = bases.map((b) => flat(matOf(b, r))), mt = flat(matOf(test, r));
        const keys = new Set([...Object.keys(mt), ...mb.flatMap((x) => Object.keys(x))]);
        const unstable = [...keys].filter((k) => mb.some((x) => x[k] !== mb[0][k]));
        if (unstable.length) REJECT(`${r.vp} ${r.id} 基準材質彼此不等（量測本身不穩，須先歸因）：${unstable.slice(0, 5).join(', ')}`);
        const diffs = [...keys].filter((k) => mt[k] !== mb[0][k]);
        matOk = diffs.length === 0;
        matMsg = matOk ? `材質 ${keys.size} 欄與基準逐值相等` : `材質 ${diffs.length} 欄不等：` + diffs.slice(0, 6).map((k) => `${k} 受測=${mt[k]} 基準=${mb[0][k]}`).join('；');
      }
      const ok = footOk && matOk; if (!ok) bad = true;
      console.log(r.vp, r.id, `基準 ${B.length} 次 ${bb.length} 對 XOR px min/median/max=${stat(bb)}（底線 ${floor}）`, `受測對基準 ${tb.length} 筆 min/median/max=${stat(tb)}`, `足跡${footOk ? '綠' : '紅'}（${expectDiff ? '要求 min＞底線' : '要求 max≤底線'}）`, matMsg, ok ? '綠' : '紅');
    }
  } finally { await browser.close(); }
  console.log(`COVERAGE ${covered}/48（驗收範圍 3 視窗×16 場景；批次 ${bid} 共 ${bsize} 份基準全數使用）` + (covered < 48 ? ' ——僅部分覆蓋，不得據此宣告 5b 通過' : ''));
  console.log((bad ? 'FOOT RED' : 'FOOT GREEN') + (covered < 48 ? '（僅部分覆蓋，不得據此宣告 5b 通過）' : '')); return bad ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const mode = process.argv[2];
    const pos = process.argv.slice(3).filter((x) => !x.startsWith('--'));
    if (mode === 'dump') await dump();
    else if (mode === 'foot') process.exitCode = await foot(pos[0], pos.slice(1), { baseSha: arg('base-sha', null), expect: arg('expect', null), full: flag('full'), baseDir: arg('base-dir', null) });
    else if (mode === 'cmp') { const r = await cmp(process.argv[3], process.argv[4]); if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(r, null, 1)); }
    else { console.log('mode: dump | cmp | foot'); process.exit(2); }
  } catch (e) { console.log('REJECT（量具崩潰，不是綠也不是紅，退出碼 2）：' + (e && e.stack || e)); process.exit(2); }
  process.exit(process.exitCode ?? 0); // 不得無條件 exit(0)：會蓋掉 foot 的紅燈退出碼
}

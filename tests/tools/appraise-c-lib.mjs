// v0.59.2 鑑賞頁丙案（燒符揭幕＋照妖鏡）驗收共用件：遊戲驅動、頁內量測函式、像素判讀、色差。
// 凍結：docs/experiments/2026-09-28-acceptance-appraise-panels.md #1–#4、#8、#11（含文末修訂）。
// ★判定器不依賴產品自報的「成功」★：焦點法寶是否被畫、其餘拍品是否被畫，是判定器自己走場景圖讀
// visible／layers（渲染器實際看的欄位）；符紙、鏡子、火光一律再用截圖像素驗一次。產品的 appraiseFx()
// 只拿來決定「去哪裡取樣」，取樣到的像素對不上就判紅（例如鏡子幾何說在那、像素上卻沒有系色環）。
import { decodePNG } from './png-lite.mjs';

export const VP = {
  V1: { w: 852, h: 393, safe: [0, 59, 21, 59] },
  V2: { w: 932, h: 430, safe: [0, 59, 21, 59] },
  V3: { w: 844, h: 390, safe: [0, 47, 21, 47] },
  V4: { w: 667, h: 375, safe: [0, 0, 0, 0] },
  V5: { w: 1280, h: 720, safe: [0, 0, 0, 0] },
};

export const DRIVE_STEP = `(() => {
  const ho = document.getElementById('handoff');
  if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return 0; }
  const b = document.getElementById('mainbtn');
  const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
  if (b && /看最終結果/.test(txt) && !dis) return 2;
  if (b && !dis) { b.click(); return 0; }
  const m = document.getElementById('modal');
  if (m && getComputedStyle(m).display !== 'none') {
    const k = document.getElementById('titheKeep'); if (k) { k.click(); return 0; }
    const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return 0; }
  }
  if (b && dis) {
    const els = [...document.querySelectorAll('#stage button')];
    const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled);
    if (sb) { sb.click(); return 0; }
  }
  return 1;
})()`;
export const scr = (page) => page.evaluate(() => {
  const $ = (id) => document.getElementById(id);
  const on = (id) => { const e = $(id); return !!e && getComputedStyle(e).display !== 'none'; };
  if (!on('table')) return 'none';
  const b = $('mainbtn'), t = b ? b.textContent : '', dis = b ? b.disabled : true;
  if (/不盯任何一件/.test(t)) return 'mark';
  if (/^蓋牌/.test(t) && !dis) return 'bid';
  return 'busy';
});
export async function driveToFirst(page, targetSet, cap = 4000) {
  for (let i = 0; i < cap; i++) {
    await page.waitForTimeout(8);
    const cls = await scr(page);
    if (targetSet.has(cls)) return cls;
    const r = await page.evaluate(DRIVE_STEP);
    if (r === 2) return null;
  }
  return null;
}
/** 新開一頁並把遊戲開到第 1 夜（solo／hot）。clock=true 時先裝 Playwright 假時鐘（時間照常流動，直到 pauseAt）。 */
export async function openGame(browser, port, vp, mode, seed, { clock = true, destiny = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  if (clock) await ctx.clock.install();
  /* 天命是「每顆種子私下抽一次、存在 localStorage」（index.html privateDestinyDrawsForSeed），每個新瀏覽器環境
     都會重抽——跨版本逐欄位比對賽局狀態時兩邊要預先寫進同一組，不然比到的是抽籤雜訊。 */
  if (destiny) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, ['yaoshi-private-destiny-v1:' + seed, JSON.stringify(destiny)]);
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  await ctx.addInitScript((safe) => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style'); s.id = '__safe';
      s.textContent = `:root{--safe-top:${safe[0]}px!important;--safe-right:${safe[1]}px!important;--safe-bottom:${safe[2]}px!important;--safe-left:${safe[3]}px!important}`;
      document.head.appendChild(s);
    });
  }, vp.safe);
  const page = await ctx.newPage();
  page.__errs = []; page.on('pageerror', (e) => page.__errs.push('pageerror ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object"', null, { timeout: 60000 });
  await page.waitForFunction(() => window.__yaoshi3d && window.__yaoshi3d.tray, null, { timeout: 120000 }).catch(() => {});
  await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
  await page.evaluate((m) => startEntry(m), mode === 'hot' ? 'hotseat' : 'solo');
  const pick = async () => {
    await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0);
    await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
    await page.waitForTimeout(80);
  };
  await pick();
  if (mode === 'hot') { await page.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; renderSelect(); }); await pick(); }
  await page.evaluate(([sd, md]) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame(md, sd, SEL.picks); }, [seed, mode === 'hot' ? 'hotseat' : 'solo']);
  await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
  return { ctx, page };
}
export const waitTrayReady = (page) => page.waitForFunction(() => { const t = window.__yaoshi3d.tray, n = window.__yaoshi.S.market.length; return t.readyCount() >= n && t.items().filter((it) => it.visible).length >= n; }, null, { timeout: 180000 }).then(() => true).catch(() => false);

/** 暫停假時鐘在「現在稍後」：evaluate 取回頁內時間到 pauseAt 生效之間時間仍在走（本機負載高時可超過數百毫秒），
 *  目標落到過去會報錯——重讀時間、加大餘裕重試（這是治具的時序問題，跟被測物無關）。 */
export async function pauseSoon(page) {
  for (const pad of [250, 800, 2000, 5000]) {
    const now = await page.evaluate(() => Date.now());
    try { await page.clock.pauseAt(now + pad); return; } catch (e) { if (!/past/.test(e.message)) throw e; }
  }
  throw new Error('pauseSoon：四次都趕不上');
}
/** 牌桌靜止：每件拍品的 y／rotY 連續兩次（間隔 200ms 真實時間）逐值相同才算。
 *  出價／盯上一開始 AI 的令牌會落下、把那一格頓一下（onSlam 的 jolt，約 0.35 秒），在這之間拍「進場前」
 *  會把一個跟鑑賞無關的動畫中間值當成基準（09-29 首跑 V2/V3/V5 hot bid 量到 slot3 y 差 0.004 即此）。 */
export async function waitSettled(page, maxMs = 6000) {
  const snap = () => page.evaluate(() => JSON.stringify(window.__yaoshi3d.tray.items().map((it) => window.__yaoshi3d.tray.pose(it.slot))));
  let a = await snap();
  for (let t = 0; t < maxMs; t += 200) { await page.waitForTimeout(200); const b = await snap(); if (a === b) return true; a = b; }
  return false;
}
/* ── 頁內量測（注入一次，之後以 window.__AC 呼叫）───────────────────────────── */
export const PAGE_LIB = `(() => {
  if (window.__AC) return;
  const AC = window.__AC = {};
  const Y = () => window.__yaoshi3d;
  let THREE = null;
  AC.init = async () => { THREE = await import('three'); return true; };
  /* 焦點法寶的模型根節點：有 tray.node(i) 就用；舊版（沒有這個出口）用「包圍盒投影逐值等於 bboxScreen(i)」去場景圖裡找。 */
  AC.node = (i) => {
    const T = Y().tray; if (T.node) return T.node(i);
    const bb = T.bboxScreen(i); if (!bb) return null;
    const g = Y().scene.getObjectByName('table-tray'); if (!g) return null;
    for (const c of g.children) { const r = AC.projBox(c); if (r && Math.abs(r.left - bb.left) < 0.01 && Math.abs(r.top - bb.top) < 0.01 && Math.abs(r.right - bb.right) < 0.01 && Math.abs(r.bottom - bb.bottom) < 0.01) return c; }
    return null;
  };
  /* 包圍盒投影：與產品 bboxScreen 同一套（Box3.setFromObject＋八角點），但不看 visible——揭幕中被藏起來的焦點也量得到。 */
  AC.projBox = (node) => {
    const box = new THREE.Box3().setFromObject(node); if (box.isEmpty()) return null;
    const cam = Y().camera, v = new THREE.Vector3(), W = innerWidth, H = innerHeight;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let c = 0; c < 8; c++) {
      v.set(c & 1 ? box.max.x : box.min.x, c & 2 ? box.max.y : box.min.y, c & 4 ? box.max.z : box.min.z).project(cam);
      const px = (v.x * 0.5 + 0.5) * W, py = (1 - (v.y * 0.5 + 0.5)) * H;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    return { left: x0, top: y0, right: x1, bottom: y1 };
  };
  /* 這個節點此刻會不會被畫：任一可畫子物件（Mesh／Points／Line／Sprite）自己到根都 visible，且圖層跟
     「這一幀相機會打開的圖層」有交集。相機打開的圖層＝camera.layers.mask，加上產品疊層那一趟的焦點圖層
     （只在產品回報焦點已現身時才算——這一項若產品謊報，像素檢查會抓到）。 */
  AC.rendered = (node, extraMask) => {
    if (!node) return false;
    const cam = Y().camera; const mask = cam.layers.mask | (extraMask || 0);
    let chainVis = true; for (let p = node; p; p = p.parent) if (!p.visible) { chainVis = false; break; }
    if (!chainVis) return false;
    let any = false;
    node.traverse((o) => {
      if (any || !(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
      for (let p = o; p && p !== node.parent; p = p.parent) if (!p.visible) return;
      if (o.layers.mask & mask) any = true;
    });
    return any;
  };
  AC.fx = () => { const T = Y().tray; return T.appraiseFx ? T.appraiseFx() : null; };
  AC.focusMask = () => { const f = AC.fx(); return f && f.shown ? (1 << f.layer) : 0; };
  AC.draws = () => Y().renderer.info.render.calls;
  AC.cam = () => { const c = Y().camera; return { pos: c.position.toArray(), quat: c.quaternion.toArray(), off: !!(c.view && c.view.enabled), layers: c.layers.mask, fov: c.fov, zoom: c.zoom, bg: !!Y().scene.background }; };
  AC.feltHead = () => { const e = document.getElementById('feltHead'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
  /* 燈：型別、顏色、圖層、可見、基準強度；**燈籠的即時強度每幀閃爍**（renderer.js 的 sin 閃爍，跟鑑賞無關），
     有 userData.baseIntensity 的燈比基準強度，其餘比即時強度。 */
  AC.lights = () => { const l = []; Y().scene.traverse((o) => { if (o.isLight) l.push([o.type, o.color.getHexString(), o.layers.mask, o.visible, o.userData && o.userData.baseIntensity != null ? 'b' + o.userData.baseIntensity : +o.intensity.toFixed(6)]); }); return l; };
  /* 每件拍品：位置／旋轉／縮放／可見、每個子物件的可見與圖層、每支材質的參數（數值、顏色、uniform 數值）。 */
  const matFp = (m) => {
    const o = { t: m.type, id: m.uuid };
    for (const k of ['opacity', 'transparent', 'visible', 'depthTest', 'depthWrite', 'emissiveIntensity', 'roughness', 'metalness', 'size', 'blending', 'side', 'toneMapped']) if (m[k] !== undefined) o[k] = m[k];
    for (const k of ['color', 'emissive']) if (m[k] && m[k].getHexString) o[k] = m[k].getHexString();
    if (m.uniforms) { const u = {}; for (const [k, v] of Object.entries(m.uniforms)) { const x = v && v.value; if (typeof x === 'number' || typeof x === 'boolean') u[k] = x; else if (x && x.isColor) u[k] = x.getHexString(); else if (x && (x.isVector2 || x.isVector3 || x.isVector4)) u[k] = x.toArray(); } o.u = u; }
    if (m.userData && Object.keys(m.userData).length) { try { o.ud = JSON.parse(JSON.stringify(m.userData)); } catch (e) {} }
    return o;
  };
  AC.items = () => {
    const T = Y().tray, out = [];
    for (const it of T.items()) {
      const n = AC.node(it.slot); if (!n) { out.push({ slot: it.slot, none: true }); continue; }
      const kids = [];
      n.traverse((o) => { const e = { n: o.name || o.type, v: o.visible, l: o.layers.mask, ro: o.renderOrder }; if (o.material) e.m = (Array.isArray(o.material) ? o.material : [o.material]).map(matFp); kids.push(e); });
      out.push({ slot: it.slot, pos: n.position.toArray(), rot: [n.rotation.x, n.rotation.y, n.rotation.z], scl: n.scale.toArray(), vis: n.visible, kids });
    }
    return out;
  };
  AC.snap = () => ({ cam: AC.cam(), feltHead: AC.feltHead(), lights: AC.lights(), items: AC.items(), apprOn: typeof APPR !== 'undefined' ? !!APPR.on : null });
  /* 題字欄（＝展開中的 .railPages）量測：版面、字級、截斷、越框、cut、內容等價。 */
  AC.panel = (railId, slot) => {
    const pg = document.querySelector('#' + railId + ' .railPages');
    if (!pg || getComputedStyle(pg).display === 'none') return null;
    const cr = pg.getBoundingClientRect();
    const out = { rect: { left: cr.left, top: cr.top, right: cr.right, bottom: cr.bottom }, fontMin: Infinity, small: [], trunc: [], outside: [], cut: [] };
    const tw = document.createTreeWalker(pg, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const el = n.parentElement; if (!el || !/\\S/.test(n.textContent)) continue;
      const st = getComputedStyle(el); if (st.display === 'none' || st.visibility !== 'visible') continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      const rs = [...rg.getClientRects()].filter((q) => q.width >= 0.5 && q.height >= 0.5);
      if (!rs.length) continue;
      const fs = parseFloat(st.fontSize); out.fontMin = Math.min(out.fontMin, fs);
      if (fs < 13) out.small.push(n.textContent.trim().slice(0, 16) + '@' + fs);
      for (const q of rs) if (q.left < cr.left - 0.5 || q.right > cr.right + 0.5 || q.top < cr.top - 0.5 || q.bottom > cr.bottom + 0.5) { out.outside.push(n.textContent.trim().slice(0, 16)); break; }
    }
    for (const el of [pg, ...pg.querySelectorAll('*')]) {
      const st = getComputedStyle(el); if (st.display === 'none') continue;
      const clipX = st.overflowX !== 'visible', clipY = st.overflowY !== 'visible';
      if ((clipX && el.scrollWidth > el.clientWidth + 1) || (clipY && el.scrollHeight > el.clientHeight + 1) || (st.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)) out.trunc.push((el.className || el.tagName) + ' ' + el.scrollWidth + '/' + el.clientWidth + ' ' + el.scrollHeight + '/' + el.clientHeight);
    }
    const tw2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = tw2.nextNode(); n; n = tw2.nextNode()) {
      const el = n.parentElement; if (!el || !/\\S/.test(n.textContent) || pg.contains(el)) continue;
      const st = getComputedStyle(el); if (st.visibility !== 'visible' || st.display === 'none' || Number(st.opacity) === 0) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const q of rg.getClientRects()) { if (q.width < 0.5 || q.height < 0.5) continue; if (Math.min(q.right, cr.right) - Math.max(q.left, cr.left) > 0.5 && Math.min(q.bottom, cr.bottom) - Math.max(q.top, cr.top) > 0.5) { out.cut.push(n.textContent.trim().slice(0, 20)); break; } }
    }
    // 內容等價：跟當階段卡片工廠重新產生的同一張卡逐字相同（card-dock 判定器同一手法）
    const si = Number(slot), card = pg.querySelector('.railSelected');
    const liveTxt = card ? (card.textContent || '').replace(/\\s+/g, '') : '';
    const tmpBid = typeof myBids !== 'undefined' && myBids[si] === undefined;
    if (tmpBid) myBids[si] = { amt: 0, type: 'cons', intent: 'keep', target: null };
    let refTxt = null; try { const tmp = document.createElement('div'); tmp.innerHTML = (typeof TRAY_PHASE !== 'undefined' && TRAY_PHASE === 'mark' ? markCardHTML : mcardHTML)(S.market[si], si); refTxt = (tmp.textContent || '').replace(/\\s+/g, ''); } catch (e) {}
    finally { if (tmpBid) delete myBids[si]; }
    out.content = { match: refTxt != null && refTxt === liveTxt, hasCard: !!card, markBadge: card ? !!card.querySelector('.markb') === /👁/.test(refTxt || '') : false };
    const cs = getComputedStyle(document.documentElement), n = (v) => parseFloat(v) || 0;
    out.safe = { top: n(cs.getPropertyValue('--safe-top')), right: n(cs.getPropertyValue('--safe-right')), bottom: n(cs.getPropertyValue('--safe-bottom')), left: n(cs.getPropertyValue('--safe-left')) };
    out.panelScroll = [pg.scrollHeight, pg.clientHeight];
    if (out.fontMin === Infinity) out.fontMin = null;
    return out;
  };
  /* 空白處：最上層元素是鑑賞輸入層（#appraiseDim）、且以它為中心的 40×40 方塊 5×5 取樣全落在同一層的點。
     優先找畫面下緣中央附近（不在題字欄、不在窄籤）。找不到回 null（判紅）。 */
  AC.blankPoint = () => {
    const W = innerWidth, H = innerHeight;
    const hitDim = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && e.id === 'appraiseDim'; };
    const ok = (x, y) => { for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (!hitDim(x + a * 9.5, y + b * 9.5)) return false; return true; };
    const cands = [];
    for (let fy = 0.92; fy >= 0.08; fy -= 0.06) for (let fx = 0.5, s = 0; s < 20; s++, fx = 0.5 + (s % 2 ? 1 : -1) * Math.ceil(s / 2) * 0.03) cands.push([W * fx, H * fy]);
    for (const [x, y] of cands) if (x > 24 && x < W - 24 && y > 24 && y < H - 24 && ok(x, y)) return { x, y };
    return null;
  };
  AC.token = (slot) => {
    const it = Y().tray.items().find((q) => q.slot === slot); if (!it) return null;
    const key = it.curse ? 'curse' : it.fac; const v = getComputedStyle(document.documentElement).getPropertyValue('--sys-' + key).trim();
    const probe = document.createElement('div'); probe.style.color = v; document.body.appendChild(probe); const c = getComputedStyle(probe).color; probe.remove();
    const m = c.match(/(\\d+)\\D+(\\d+)\\D+(\\d+)/); return m ? { key, css: v, rgb: [+m[1], +m[2], +m[3]] } : null;
  };
})()`;

/* ── 像素判讀 ─────────────────────────────────────────────── */
export const png = (buf) => decodePNG(buf);
export function px(img, x, y) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= img.width || y >= img.height) return null; const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; }
export function meanLum(img, rect, exclude = []) {
  const x0 = Math.max(0, Math.floor(rect.left)), y0 = Math.max(0, Math.floor(rect.top)), x1 = Math.min(img.width, Math.ceil(rect.right)), y1 = Math.min(img.height, Math.ceil(rect.bottom));
  let s = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (exclude.some((e) => x >= e.left && x < e.right && y >= e.top && y < e.bottom)) continue;
    const i = (y * img.width + x) * 4; s += (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3; n++;
  }
  return n ? s / n : null;
}
/** 圓外平均亮度：只算離 (cx,cy) 超過 R 的像素（再扣掉 exclude 矩形）。回 {mean, n}；n=0＝量不到。 */
export function meanLumOutside(img, cx, cy, R, exclude = []) {
  let s = 0, n = 0;
  for (let y = 0; y < img.height; y += 2) for (let x = 0; x < img.width; x += 2) {
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= R * R) continue;
    if (exclude.some((e) => x >= e.left && x < e.right && y >= e.top && y < e.bottom)) continue;
    const i = (y * img.width + x) * 4; s += (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3; n++;
  }
  return { mean: n ? s / n : null, n };
}
/** 符紙：黃表紙底（亮暖黃）或硃砂字（深紅）。回傳以 (cx,cy) 為中心 21×21 方塊裡黃紙像素、黃紙＋硃砂像素的比例。 */
export function paperPatch(img, cx, cy) {
  let y = 0, yr = 0, n = 0;
  for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) {
    const p = px(img, cx + dx, cy + dy); if (!p) continue; n++;
    const [r, g, b] = p;
    const yellow = r >= 170 && g >= 120 && b <= 150 && r - b >= 70 && g - b >= 40;
    const ink = r >= 120 && g <= 90 && b <= 80 && r - g >= 60;
    if (yellow) y++; if (yellow || ink) yr++;
  }
  return n ? { yellow: y / n, paper: yr / n } : null;
}
/** 符紙覆蓋判讀：法寶框中心那一塊是紙（黃紙≥25%、黃紙＋硃砂≥50%），而且這張紙真的是一張「紙」——
 *  在紙的矩形 rect 裡、偏離中心的四個點（±30% 寬、±30% 高）也各自是紙（黃紙＋硃砂≥50%）。
 *  只看中心會被金色法寶（巴冷公主珠鍊）誤判成紙；四角同時是紙才算。rect 沒有（舊版沒有符紙）就用法寶框本身。 */
export function paperCover(img, rect, cx, cy) {
  const center = paperPatch(img, cx, cy);
  let corners = 0;
  if (rect) {
    const mx = (rect.left + rect.right) / 2, my = (rect.top + rect.bottom) / 2, w = rect.right - rect.left, h = rect.bottom - rect.top;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const q = paperPatch(img, mx + sx * 0.3 * w, my + sy * 0.3 * h); if (q && q.paper >= 0.5) corners++; }
  }
  return { center, corners };
}
/* sRGB → CIELAB（D65）→ CIEDE2000（專案色差慣例，見 assets/theme.css 金線那行的註解） */
function lab([R, G, B]) {
  const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const r = f(R), g = f(G), b = f(B);
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, y = r * 0.2126 + g * 0.7152 + b * 0.0722, z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const t = (v) => (v > 216 / 24389 ? Math.cbrt(v) : (24389 / 27 * v + 16) / 116);
  x = t(x); y = t(y); z = t(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export function de2000(c1, c2) {
  const [L1, a1, b1] = lab(c1), [L2, a2, b2] = lab(c2);
  const rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (a, b) => { if (a === 0 && b === 0) return 0; const v = Math.atan2(b, a) / rad; return v < 0 ? v + 360 : v; };
  const h1p = h(a1p, b1), h2p = h(a2p, b2);
  const dL = L2 - L1, dC = C2p - C1p;
  let dh = 0; if (C1p * C2p !== 0) { dh = h2p - h1p; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
  const Lb = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hb = h1p + h2p; if (C1p * C2p !== 0) { if (Math.abs(h1p - h2p) > 180) hb += h1p + h2p < 360 ? 360 : -360; hb /= 2; }
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const dTh = 30 * Math.exp(-Math.pow((hb - 275) / 25, 2)), Rc = 2 * Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lb - 50, 2)) / Math.sqrt(20 + Math.pow(Lb - 50, 2)), Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T, Rt = -Math.sin(2 * dTh * rad) * Rc;
  return Math.sqrt(Math.pow(dL / Sl, 2) + Math.pow(dC / Sc, 2) + Math.pow(dH / Sh, 2) + Rt * (dC / Sc) * (dH / Sh));
}
/** 在 (cx,cy) 周圍找系色環：半徑 rMin..rMax 每 1px、每圈 90 個角度取樣，ΔE00≤15 的比例最高的那一圈。
 *  回傳 {radius, frac, median:[r,g,b], dE}；frac<0.5 視為沒有環。 */
export function findRing(img, cx, cy, token, rMin, rMax) {
  let best = { radius: null, frac: 0 };
  for (let R = Math.max(4, Math.floor(rMin)); R <= Math.ceil(rMax); R++) {
    let hit = 0, n = 0; const cols = [];
    for (let k = 0; k < 90; k++) {
      const a = (k / 90) * Math.PI * 2, p = px(img, cx + Math.cos(a) * R, cy + Math.sin(a) * R); if (!p) continue; n++;
      if (de2000(p, token) <= 15) { hit++; cols.push(p); }
    }
    const frac = n ? hit / n : 0;
    if (frac > best.frac) best = { radius: R, frac, n };
  }
  if (best.radius == null) return best;
  // 那一圈全部 90 點的中位色（不只挑中的點）——判 ΔE 用整圈的代表色，不偏袒挑中的那些
  const all = [];
  for (let k = 0; k < 90; k++) { const a = (k / 90) * Math.PI * 2, p = px(img, cx + Math.cos(a) * best.radius, cy + Math.sin(a) * best.radius); if (p) all.push(p); }
  const med = [0, 1, 2].map((c) => { const v = all.map((p) => p[c]).sort((a, b) => a - b); return v[v.length >> 1]; });
  best.median = med; best.dE = de2000(med, token);
  return best;
}
/** 兩張圖同一圈帶狀區（半徑 r0..r1）的平均逐像素差（0..255）。 */
export function bandDiff(a, b, cx, cy, r0, r1) {
  let s = 0, n = 0;
  for (let R = Math.ceil(r0); R <= Math.floor(r1); R++) for (let k = 0; k < 180; k++) {
    const t = (k / 180) * Math.PI * 2, p = px(a, cx + Math.cos(t) * R, cy + Math.sin(t) * R), q = px(b, cx + Math.cos(t) * R, cy + Math.sin(t) * R);
    if (!p || !q) continue; s += (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2])) / 3; n++;
  }
  return n ? s / n : null;
}

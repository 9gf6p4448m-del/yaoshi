// 近景切鏡卷 批 1 原型（v0.45，2026-09-07）的量測治具。
// 驗收凍結＝docs/experiments/2026-09-07-acceptance-duel-closeup-p1.md（P0–P8）。
// 借 duel-drive.mjs 的 drive()／serve()（同一條真實路徑：真的玩到 N 場對決），另外在頁面端錄：
//   ・逐幀 camera.position（P2 的 dist 曲線；|position| 恆等於機位的 dist，見 camera-director 的 FOCUS 註解）
//   ・每次 ys:fx-focus 前後的「逐尊材質 opacity」抽樣（P3 退暗）
//   ・#dmgLayer 每一個 .dmgfloat 的文字／class／位置／存活時間（P4 跳字）
//   ・#beatLamps／.pwgauge／#actorCard 的狀態（P5 HUD）
//   ・DOM 有沒有長出那四樣東西（P0 的退路等價）
// 用法：
//   node tests/tools/closeup-drive.mjs "<url>" <out.json> [--duels=6] [--port=8901] [--root=<靜態根>]
//        [--shots=<png 前綴>] [--skip]
//        [--cancel] [--skipfocus]
//   --skip       skipbtn 一出現就按（＝對決開演前就跳過，量的是「整場被跳掉」）
//   --skipfocus  第一次 ys:fx-focus 之後 200ms 才按跳過（P4 的「doSkip 後 0 個殘留」要有東西可殘留）
//   --cancel     第一次 ys:fx-focus 之後 250ms 手動派一次 ys:fx-trait-cancel（＝doSkip 派的那個事件），
//                但不設 SKIP：這樣對決繼續演、基座機位仍停在 DUEL_SHOT 4.2，
//                才量得到 P2 的「cancel 後 300ms 內回 4.2±0.05」——真的按跳過時 ys:duel-end
//                緊接著就來、基座已經在往牌桌機位 3.6 走，那條 4.2 的斷言在真實路徑上量不到（見報告 P2）
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

// ── 頁面端錄音機 ───────────────────────────────────────────────────────────
// 注意：這段字串裡不得出現反引號與 ${}，整包用單引號字串拼。
// THREE.AdditiveBlending 常數＝2（three r1xx 起固定），逆光那一層跳過的判準與
// js/duel-figures.js:185 的 setFigureOpacity 同一條規則。
const REC = `(() => {
  const C = window.__cu = { frames: [], focus: [], dmg: [], hud: [], cards: [], dom: [], duels: [], skips: [], ev: [], cancels: [] };
  // P2 的 dist 曲線要把 punch（命中／燒毀，420ms）那幾幀排掉：punch 疊在同一條 dist 上，
  // 而近景的觸發筆本身就會叫 fxPunch（cam-drive.mjs 的 busy() 是同一個作法）。
  for (const n of ['ys:fx-punch', 'ys:fx-burn', 'ys:hitstop', 'ys:fx-trait', 'ys:duel', 'ys:duel-end', 'ys:fx-focus', 'ys:fx-focus-end', 'ys:fx-trait-cancel'])
    document.addEventListener(n, ((nm) => (e) => { const d = (e && e.detail) || {};
      const row = { n: nm, t: performance.now(), ms: d.ms, side: d.side, kind: d.kind, unit: d.unit, power: d.power };
      C.ev.push(row);
      // handled 是 duel-figures 的接收端在同一次派送裡才填的（本監聽器先註冊、先跑），macrotask 再讀
      if (nm === 'ys:fx-burn') setTimeout(() => { row.handled = !!d.handled; }, 0);
    })(n));
  const now = () => performance.now();
  const fig = () => { try { return window.__yaoshi3d && window.__yaoshi3d.duelFigures; } catch (e) { return null; } };
  const cam = () => { try { return window.__yaoshi3d && window.__yaoshi3d.camera; } catch (e) { return null; } };
  const P = () => { try { return (window.__yaoshi && window.__yaoshi.PW_FX) || {}; } catch (e) { return {}; } };

  // 一尊的「等效不透明度」：對每個非 Additive 材質取 opacity / __baseOp（setFigureOpacity 記的原值），
  // 沒有 __baseOp 的（3D 妖從沒被寫過）就拿它自己的 opacity。回傳平均值與樣本數。
  // 取中位數而不是平均：極少數子物件（退暗開始「之後」才建出來的）不會被 setFigureOpacity 的
  // 量化快取重寫（fig.__op 相同就 early return），平均會被那一兩個 1.0 拉高。min/max 一併回報。
  const opOf = (f) => {
    const v = [];
    try {
      f.group.traverse((o) => {
        const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
        for (const m of ms) {
          if (!m || m.blending === 2) continue;
          const base = m.__baseOp === undefined ? 1 : m.__baseOp;
          if (!base) continue;
          v.push((m.opacity === undefined ? 1 : m.opacity) / base);
        }
      });
    } catch (e) {}
    if (!v.length) return { op: null, n: 0 };
    v.sort((a, b) => a - b);
    return { op: v[Math.floor(v.length / 2)], mean: v.reduce((a, b) => a + b, 0) / v.length,
      min: v[0], max: v[v.length - 1], n: v.length };
  };
  const snapFigs = () => {
    const D = fig(); if (!D) return null;
    const out = [];
    for (const side of ['A', 'B']) {
      let list = []; try { list = D.figuresOf(side) || []; } catch (e) { list = []; }
      list.forEach((f) => {
        const o = opOf(f);
        out.push({ side: side, unit: f.unit ? f.unit.id : null, body: f.unit ? f.unit.body : null,
          skin: f.skin || 'layered', vis: !!(f.group && f.group.visible), op: o.op, mats: o.n,
          mean: o.mean === undefined ? null : +o.mean.toFixed(4), min: o.min === undefined ? null : +o.min.toFixed(4),
          max: o.max === undefined ? null : +o.max.toFixed(4), fop: f.__op === undefined ? null : f.__op,
          sc: f.group ? +f.group.scale.x.toFixed(4) : null });
      });
    }
    return out;
  };
  // P4 的位置量法（v0.45 二版，審查 MEDIUM-1）：**不重抄 pwScreenOf 的算式**。
  // 改量「那一尊在畫面上實際佔的方框」：拿 group 的世界包圍盒八個角投影，再用 canvas 的
  // getBoundingClientRect 換算 CSS 像素（不假設 canvas＝整個視窗），回傳方框與方框中心。
  // 這樣被測邏輯（局部座標＋0.9×scale 的胸口高度＋innerWidth/Height）換成別條路，
  // 差一個座標系、抓錯尊、canvas 有位移這幾類錯都還驗得出來。
  const figBox = (side, unit) => {
    try {
      const D = fig(), K = cam(), Y3 = window.__yaoshi3d; if (!D || !K || !Y3 || !Y3.renderer) return null;
      const f = D.figureOf(side, unit); if (!f || !f.group || !f.group.visible) return null;
      const g = f.group;
      g.updateWorldMatrix(true, true);
      // 世界包圍盒（Box3.setFromObject 會遞迴所有子網格；THREE 從 __yaoshi3d.scene 的建構子拿）
      let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      g.traverse((o) => {
        const geo = o.geometry; if (!geo || !geo.attributes || !geo.attributes.position) return;
        if (!geo.boundingBox) geo.computeBoundingBox();
        const b = geo.boundingBox; if (!b) return;
        for (const cx of [b.min.x, b.max.x]) for (const cy of [b.min.y, b.max.y]) for (const cz of [b.min.z, b.max.z]) {
          const v = new o.position.constructor(cx, cy, cz).applyMatrix4(o.matrixWorld);
          minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
          minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
          minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
        }
      });
      if (!isFinite(minX)) return null;
      const rect = Y3.renderer.domElement.getBoundingClientRect();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const cx of [minX, maxX]) for (const cy of [minY, maxY]) for (const cz of [minZ, maxZ]) {
        const v = new g.position.constructor(cx, cy, cz).project(K);
        const sx = rect.left + (v.x * 0.5 + 0.5) * rect.width;
        const sy = rect.top + (-v.y * 0.5 + 0.5) * rect.height;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    } catch (e) { return null; }
  };
  let dmgSeq = 0;
  const dmgLive = new Map(); // 節點 → 這一次冒出來的紀錄（重用池會讓同一個節點出現多次）
  const badge = (side) => { const n = document.getElementById('pwn-' + side); if (!n) return null;
    const r = n.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; };
  const domSnap = (tag) => {
    C.dom.push({ tag: tag, t: now(),
      lamps: !!document.getElementById('beatLamps'), card: !!document.getElementById('actorCard'),
      layer: !!document.getElementById('dmgLayer'),
      gauge: document.querySelectorAll('.pwgauge').length, floats: document.querySelectorAll('.dmgfloat').length });
  };

  let duelN = 0, burnLog = [];
  document.addEventListener('ys:duel', () => {
    duelN++; burnLog = [];
    C.duels.push({ n: duelN, t: now() });
    setTimeout(() => domSnap('duel' + duelN + '-mount'), 400);
    setTimeout(() => { const s = snapFigs(); if (s) C.focus.push({ kind: 'base', duel: duelN, t: now(), figs: s }); }, 1500);
  });
  document.addEventListener('ys:duel-end', () => { domSnap('end' + duelN); });

  document.addEventListener('ys:fx-focus', (e) => {
    const d = (e && e.detail) || {};
    const row = { kind: d.kind, side: d.side, actor: d.actor, foeSide: d.foeSide, target: d.target, ms: d.ms,
      duel: duelN, t: now(), samples: [], burnsInBeat: burnLog.slice(-8) };
    C.focus.push(row);
    // 退暗抽樣：進場中(80)／到位(260,420)／回位後(ms+300)
    for (const dt of [80, 260, 420, (Number(d.ms) || 650) + 300]) {
      setTimeout(() => { const s = snapFigs(); if (s) row.samples.push({ dt: dt, t: now(), figs: s }); }, dt);
    }
  });
  document.addEventListener('ys:fx-burn', (e) => {
    const d = (e && e.detail) || {};
    const row = { t: now(), side: d.side, unit: d.unit, handled: null };
    burnLog.push(row);
    setTimeout(() => { row.handled = !!d.handled; }, 0);
    // HUD (b)：燒完一隻之後量表寬度該同步
    setTimeout(() => {
      const g = document.getElementById('pwg-' + d.side), n = document.getElementById('pwn-' + d.side);
      if (!g || !n) return;
      const bar = g.firstElementChild;
      C.hud.push({ type: 'gauge', t: now(), side: d.side, total: Number(g.dataset.total || 0),
        alive: parseInt(n.textContent, 10) || 0, width: bar ? bar.style.width : null, low: g.classList.contains('low') });
    }, 40);
  });
  // HUD (a)：拍首字幕一換就量三顆燈
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('duelBeat');
    if (el) new MutationObserver(() => {
      const l = document.getElementById('beatLamps');
      const txt = el.textContent.trim();
      if (!txt) return;
      C.hud.push({ type: 'lamps', t: now(), beat: txt.slice(0, 3), duel: duelN,
        on: l ? l.querySelectorAll('i.on').length : null, cur: l ? [].slice.call(l.querySelectorAll('i')).map((x) => x.classList.contains('cur')) : null });
    }).observe(el, { childList: true, characterData: true, subtree: true });
    const ov = document.getElementById('duel');
    if (ov) new MutationObserver((recs) => {
      for (const r of recs) {
        for (const nd of r.removedNodes) {
          if (!nd.classList || !nd.classList.contains('dmgfloat')) continue;
          const rec = dmgLive.get(nd);
          if (rec && nd.dataset && nd.dataset.probeSeq === rec.seq) { rec.removedAt = now(); dmgLive.delete(nd); }
        }
        for (const nd of r.addedNodes) {
          if (!nd.classList || !nd.classList.contains('dmgfloat')) continue;
          const rc = nd.getBoundingClientRect();
          const side = nd.dataset.side, unit = Number(nd.dataset.unit);
          const box = figBox(side, unit), bd = badge(side);
          const cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
          // 跳字底下是不是 3D 舞台（不是壓在別的 DOM 上）：elementFromPoint 會回跳字自己，
          // 先把它藏一幀再問。與投影算式完全無關的一條旁證。
          // 記的是「祖先鏈上的欄位容器」而不是 tagName＋id：.fighter 裡的 fdir／fav／fnm／pwbody
          // 都是沒有 id 的 div，只記 tagName 會變成 'DIV'、白名單一律不match（第二輪覆審實測誤紅）。
          let under = null, underCol = null;
          try { const vis = nd.style.visibility; nd.style.visibility = 'hidden';
            const el = document.elementFromPoint(Math.round(cx), Math.round(cy));
            under = el ? (el.tagName + (el.id ? '#' + el.id : '')) : null;
            const col = el && el.closest ? el.closest('#dL,#dR') : null;
            underCol = col ? col.id : (el && el.closest && el.closest('#duel') ? 'duel' : null);
            nd.style.visibility = vis; } catch (err) {}
          // 跳字 DOM 是重用池：同一個節點會被下一筆跳字再拿去用，所以「移除了沒有」不能只看
          // document.contains(node)——那會把「已移除又被回收上場」誤判成沒移除（第二輪覆審實測 2 筆）。
          // 每次冒出來蓋一個流水號，移除時只認號碼相同的那一次。
          const seq = String(++dmgSeq);
          nd.dataset.probeSeq = seq;
          const rec = { t: now(), duel: duelN, text: nd.textContent, cls: nd.className, mode: nd.dataset.mode,
            side: side, unit: unit, cx: cx, cy: cy, w: rc.width, h: rc.height,
            box: box, badge: bd, under: under, underCol: underCol, seq: seq,
            live: document.querySelectorAll('.dmgfloat').length, removedAt: null, gone: null };
          C.dmg.push(rec);
          dmgLive.set(nd, rec);
          const ms = (P().DMG_MS || 600) + 100;
          setTimeout(() => { rec.gone = !document.body.contains(nd) || nd.dataset.probeSeq !== seq;
            rec.liveAfter = document.querySelectorAll('.dmgfloat').length; }, ms);
        }
      }
    }).observe(ov, { childList: true, subtree: true });
  });
  // HUD (c)：招式／出手時的卡片
  const cardSample = (why, side) => {
    const c = document.getElementById('actorCard');
    C.cards.push({ why: why, t: now(), side: side, on: c ? c.classList.contains('on') : null,
      text: c ? c.textContent : null, cls: c ? c.className : null, n: document.querySelectorAll('#actorCard.on').length });
    const ms = (P().ACTOR_CARD_MS || 700) + 100;
    setTimeout(() => { const c2 = document.getElementById('actorCard');
      C.cards.push({ why: why + '-after', t: now(), side: side, on: c2 ? c2.classList.contains('on') : null, text: c2 ? c2.textContent : null }); }, ms);
  };
  document.addEventListener('ys:fx-trait', (e) => setTimeout(() => cardSample('trait', (e.detail || {}).side), 30));
  document.addEventListener('ys:fx-focus', (e) => { const d = e.detail || {}; if (d.kind === 'hit') setTimeout(() => cardSample('hit', d.side), 30); });
  document.addEventListener('ys:fx-trait-cancel', () => {
    const t0 = now();
    // 退暗這一半的中斷證據：cancel 當下先取一次，之後 80／160／300ms 各取一次。
    // 80／160 落在「進場上升段」的長度內——退暗若在 cancel 之後還往下走，這兩筆會比 dt=0 更暗。
    const row = { t: t0, samples: [] };
    C.cancels.push(row);
    const grab = (dt) => { const s = snapFigs(); if (s) row.samples.push({ dt: dt, t: now(), figs: s }); };
    grab(0);
    for (const dt of [80, 160, 300]) setTimeout(() => grab(dt), dt);
    C.skips.push({ t: t0 });
    for (const dt of [50, 150, 300]) setTimeout(() => {
      const K = cam();
      C.skips.push({ t: now(), rel: dt, l: K ? Math.hypot(K.position.x, K.position.y, K.position.z) : null,
        floats: document.querySelectorAll('.dmgfloat').length, card: document.querySelectorAll('#actorCard.on').length });
    }, dt);
  });

  // --cancel／--skipfocus 的觸發器（見檔頭）：都掛在「第一次 ys:fx-focus 之後」，
  // 這樣量到的才是「切鏡進行中被打斷」，而不是對決都還沒開始就按跳過。
  let fired = false;
  document.addEventListener('ys:fx-focus', () => {
    if (fired) return;
    if (window.__cuCancel) {
      fired = true;
      setTimeout(() => { C.skips.push({ t: now(), why: 'cancel-probe' });
        document.dispatchEvent(new CustomEvent('ys:fx-trait-cancel', { detail: {} })); }, 250);
    } else if (window.__cuSkipFocus) {
      fired = true;
      setTimeout(() => { const b = document.getElementById('skipbtn');
        C.skips.push({ t: now(), why: 'skip-btn', floats0: document.querySelectorAll('.dmgfloat').length });
        if (b) b.click(); }, 200);
    }
  });

  const tick = () => {
    const K = cam();
    if (K) C.frames.push({ t: now(), l: Math.hypot(K.position.x, K.position.y, K.position.z), y: +K.position.y.toFixed(4) });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();`;

const { pos, opt } = parseArgs(process.argv.slice(2));
const [url, out] = pos;
if (!url || !out) { console.error('need <url> <out.json>'); process.exit(2); }
const port = Number(opt.port || (url.match(/:(\d+)\//) || [])[1] || 8901);
const root = opt.root ? path.resolve(opt.root) : ROOT;

const srv = await serve(root, port);
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  if (opt.cancel) await page.addInitScript('window.__cuCancel = true;');
  if (opt.skipfocus) await page.addInitScript('window.__cuSkipFocus = true;');
  await page.addInitScript(REC);
  const r = await drive(page, url, { duels: Number(opt.duels || 6), skip: !!opt.skip, shots: opt.shots });
  const cu = await page.evaluate(() => {
    const C = window.__cu || {};
    return { frames: C.frames || [], focus: C.focus || [], dmg: C.dmg || [], hud: C.hud || [],
      cards: C.cards || [], dom: C.dom || [], duels: C.duels || [], skips: C.skips || [], ev: C.ev || [],
      cancels: C.cancels || [] };
  });
  await browser.close();

  const fxc = r.fxc || {};
  const focusEv = cu.focus.filter((x) => x.kind !== 'base');
  const summary = {
    url, root, duels: (r.rec.duels || []).length, errors: r.errors.length, errorList: r.errors.slice(0, 10),
    ver: r.ver, gl: r.gl,
    fxc: { burn: fxc.burn, burnFig: fxc.burnFig, burnDom: fxc.burnDom, trait: fxc.trait, traitFig: fxc.traitFig,
      beat: fxc.beat, duels: fxc.duels, focus: fxc.focus, dmgFloat: fxc.dmgFloat },
    focusEv: focusEv.length, focusKinds: focusEv.reduce((m, x) => (m[x.kind] = (m[x.kind] || 0) + 1, m), {}),
    dmgN: cu.dmg.length, hudN: cu.hud.length, cardN: cu.cards.length,
    dom: cu.dom.slice(0, 4), frames: cu.frames.length,
  };
  fs.writeFileSync(out, JSON.stringify({ summary, cu, fxc: r.fxc, rec: r.rec, errors: r.errors }, null, 1));
  console.log(JSON.stringify(summary, null, 1));
} finally { srv.kill(); }

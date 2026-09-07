// 近景切鏡卷 批 1（v0.45）：把 closeup-drive.mjs 錄下來的東西判成 P0–P7 的紅／綠。
// 門檻一律照驗收凍結檔 docs/experiments/2026-09-07-acceptance-duel-closeup-p1.md，本檔不另訂。
//   node tests/tools/closeup-judge.mjs <on1.json> [on2.json ...] [--off=<off.json>] [--base=<baseline.json>]
//        [--cancel=<cancel.json>] [--skipfocus=<skipfocus.json>]
//   --cancel     closeup-drive --cancel 的產物：P2 的「cancel 後 300ms 內回 4.2±0.05」
//   --skipfocus  closeup-drive --skipfocus 的產物：P2 同一條在真實 doSkip 上的複驗＋P4 的「跳過後 0 個殘留」
import fs from 'node:fs';

const args = process.argv.slice(2);
const files = [], opt = {};
for (const a of args) { const m = a.match(/^--([a-z0-9]+)=(.*)$/i); if (m) opt[m[1]] = m[2]; else files.push(a); }
const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const PW = { FOCUS_DIST: 2.6, DUEL_DIST: 4.2, FOCUS_DIM: 0.35, FOCUS_PER_BEAT: 2, FOCUS_DMG: 3, MAX_HITS: 5, DMG_MS: 600, BURN_MS: 420, ACTOR_CARD_MS: 700 };
const PUNCH_MS = 420; // camera-director 的 PUNCH.ms：這段時間內 dist 上疊著 punch，量 focus 曲線要排掉
const out = { P0: {}, P1: {}, P2: {}, P3: {}, P4: {}, P5: {}, P7: {} };

const ons = files.map((f) => ({ f, d: rd(f) }));
const off = opt.off ? rd(opt.off) : null;
const base = opt.base ? rd(opt.base) : null;
const cancel = opt.cancel ? rd(opt.cancel) : null;
const skipf = opt.skipfocus ? rd(opt.skipfocus) : null;

// ── P0 退路等價（雙向）────────────────────────────────────────────────────
if (off && base) {
  const keys = ['burn', 'burnFig', 'burnDom', 'trait', 'traitFig', 'beat', 'duels'];
  const a = off.fxc || {}, b = base.fxc || {};
  const same = {};
  for (const k of keys) same[k] = [a[k], b[k], a[k] === b[k]];
  const fa = JSON.stringify(a.fights || []), fb = JSON.stringify(b.fights || []);
  const dom = (off.cu.dom || []).every((x) => !x.lamps && !x.card && !x.layer && x.gauge === 0 && x.floats === 0);
  const noFocus = !(a.focus > 0) && (off.cu.focus || []).filter((x) => x.kind !== 'base').length === 0;
  const onFocus = ons.every((x) => (x.d.fxc || {}).focus > 0);
  out.P0 = { fxcSame: same, fightsSame: fa === fb, fightsLen: [(a.fights || []).length, (b.fights || []).length],
    domClean: dom, noFocusWhenOff: noFocus, focusWhenOn: onFocus,
    PASS: keys.every((k) => same[k][2]) && fa === fb && dom && noFocus && onFocus };
}

// ── P1 事件規則 ───────────────────────────────────────────────────────────
{
  const rows = [];
  let hitFights = 0, burnFights = 0, fights = 0;
  for (const { f, d } of ons) {
    for (const fight of (d.fxc && d.fxc.fights) || []) {
      fights++;
      const focus = fight.focus || [], shown = fight.beatsShown || [];
      const perBeat = {};
      for (const x of focus) perBeat[x.beat] = (perBeat[x.beat] || 0) + 1;
      const capOk = Object.values(perBeat).every((n) => n <= PW.FOCUS_PER_BEAT);
      // 規則重算：每一拍「演出的那幾筆」裡第一筆 amount≥FOCUS_DMG 的 hit ＋（還有名額的話）第一隻 burn
      let ruleOk = true;
      for (const b of shown) {
        const want = [];
        const h = b.shown.find((x) => x.kind === 'hit' && x.amount >= PW.FOCUS_DMG);
        if (h) want.push({ kind: 'hit', actor: h.actor, target: h.target });
        if (b.burns.length && want.length < PW.FOCUS_PER_BEAT) want.push({ kind: 'burn', actor: b.burns[0].target, target: null });
        const got = focus.filter((x) => x.beat === b.beat).map((x) => ({ kind: x.kind, actor: x.actor, target: x.target }));
        if (JSON.stringify(want.slice(0, PW.FOCUS_PER_BEAT)) !== JSON.stringify(got)) {
          ruleOk = false;
          rows.push({ f, beat: b.beat, want, got });
        }
      }
      if (focus.some((x) => x.kind === 'hit')) hitFights++;
      if (focus.some((x) => x.kind === 'burn')) burnFights++;
      if (!capOk) rows.push({ f, capViolation: perBeat });
      out.P1.capOk = (out.P1.capOk === undefined ? true : out.P1.capOk) && capOk;
      out.P1.ruleOk = (out.P1.ruleOk === undefined ? true : out.P1.ruleOk) && ruleOk;
    }
  }
  out.P1.fights = fights; out.P1.hitFights = hitFights; out.P1.burnFights = burnFights;
  out.P1.bad = rows.slice(0, 6);
  out.P1.PASS = !!out.P1.capOk && !!out.P1.ruleOk && fights >= 6 && hitFights >= 3 && burnFights >= 2;
}

// ── P2 鏡頭曲線 ───────────────────────────────────────────────────────────
{
  const rows = [];
  for (const { f, d } of ons) {
    const F = d.cu.frames, EV = d.cu.ev;
    const busy = (t) => EV.some((e) => (e.n === 'ys:fx-punch' || e.n === 'ys:fx-burn') && t >= e.t - 16 && t <= e.t + PUNCH_MS);
    for (const fo of d.cu.focus.filter((x) => x.kind !== 'base')) {
      const nextT = d.cu.focus.filter((x) => x.kind !== 'base' && x.t > fo.t).map((x) => x.t)[0] || Infinity;
      const endT = Math.min(nextT, fo.t + fo.ms + 900);
      const win = F.filter((s) => s.t >= fo.t && s.t <= endT);
      const quiet = win.filter((s) => !busy(s.t));
      // 「推到多近」用**原始**最小值判：punch 單獨最多只能從 4.2 減 PUNCH.dist×power(≤2)＝1.2 → 3.0，
      // 仍然大於門檻 2.75，所以 minD ≤ 2.75 只可能是 focus 造成的（punch 不會冒名頂替）。
      // 反過來若只用靜幀，命中拍每 45–260ms 一次 punch 會把整段 650ms 排光（實測 quiet 只剩 0–7 幀），
      // 量到的是回位之後的尾巴 3.2–4.2，那是「量測位置錯了」不是「沒推近」。
      const minD = win.length ? Math.min(...win.map((s) => s.l)) : null;
      const minQuiet = quiet.length ? Math.min(...quiet.map((s) => s.l)) : null;
      // 回位：ms+outMs(220)+120 之後（且下一次 focus 之前）該回到 4.2
      const backW = F.filter((s) => s.t >= fo.t + fo.ms + 340 && s.t <= endT && !busy(s.t));
      const back = backW.length ? Math.min(...backW.map((s) => Math.abs(s.l - PW.DUEL_DIST))) : null;
      // 單調：靜幀序列必須是「非遞增前段 ＋ 非遞減後段」（容差 0.01：無 punch 時本來就沒有噪音源）
      let rev = 0, phase = 'down';
      for (let k = 1; k < quiet.length; k++) {
        if (quiet[k].t - quiet[k - 1].t > 150) continue; // 中間被排掉一段就不算相鄰
        const dv = quiet[k].l - quiet[k - 1].l;
        if (phase === 'down' && dv > 0.01) phase = 'up';
        else if (phase === 'up' && dv < -0.01) rev++;
      }
      const row = { f, kind: fo.kind, ms: fo.ms, frames: win.length, quiet: quiet.length,
        minD: minD === null ? null : +minD.toFixed(3), minQuiet: minQuiet === null ? null : +minQuiet.toFixed(3),
        back: back === null ? null : +back.toFixed(4), rev,
        deepOk: minD !== null && minD <= PW.FOCUS_DIST + 0.15,
        backOk: back === null ? null : back <= 0.05, monoOk: rev === 0 };
      rows.push(row);
    }
  }
  const judged = rows.filter((r) => r.backOk !== null);
  out.P2 = { n: rows.length, deepOk: rows.filter((r) => r.deepOk).length, backOk: judged.filter((r) => r.backOk).length,
    monoOk: rows.filter((r) => r.monoOk).length, rows: rows.slice(0, 40),
    PASS: rows.length > 0 && rows.every((r) => r.deepOk && r.monoOk) && judged.length > 0 && judged.every((r) => r.backOk) };
  const backAfter = (d) => {
    const S = (d.cu.skips || []).filter((x) => x.rel === 300);
    return { at300: S.map((x) => (x.l === null ? null : +x.l.toFixed(3))),
      ok: S.length > 0 && S.every((x) => x.l !== null && Math.abs(x.l - PW.DUEL_DIST) <= 0.05) };
  };
  if (cancel) { out.P2.cancelBack = backAfter(cancel); out.P2.PASS = out.P2.PASS && out.P2.cancelBack.ok; }
  if (skipf) { out.P2.skipBack = backAfter(skipf); out.P2.PASS = out.P2.PASS && out.P2.skipBack.ok; }
}

// ── P3 退暗 ───────────────────────────────────────────────────────────────
{
  const bad = [], stat = { dimmed: [], kept: [], restored: [], burning: [] };
  for (const { f, d } of ons) {
    const EV = d.cu.ev;
    const foci = d.cu.focus.filter((x) => x.kind !== 'base');
    for (let i = 0; i < foci.length; i++) {
      const fo = foci[i];
      const nextT = foci[i + 1] ? foci[i + 1].t : Infinity;
      for (const s of fo.samples) {
        const burning = (side, unit) => EV.some((e) => e.n === 'ys:fx-burn' && e.side === side && e.unit === unit && s.t >= e.t - 20 && s.t <= e.t + PW.BURN_MS + 260);
        const after = s.dt > fo.ms; // 回全景之後的那一筆
        if (s.t >= nextT) continue; // 這一筆抽樣時下一次 focus 已經開始了，要判也是判那一次的名單
        for (const g of s.figs) {
          if (g.op == null) continue;
          if (!g.vis) continue; // 已經燒完收起來的尊不在畫面上，退暗與否無意義
          const keep = (g.side === fo.side && g.unit === fo.actor) || (g.side === fo.foeSide && g.unit === fo.target);
          const burn = burning(g.side, g.unit);
          const expBase = (g.skin !== 'creature' && g.body === 'haunt') ? 0.5 : 1;
          const row = { f, kind: fo.kind, fi: i, duel: fo.duel, dt: s.dt, id: g.side + g.unit, body: g.body, skin: g.skin, op: g.op, vis: g.vis, keep, burn };
          if (burn) { stat.burning.push(row); continue; } // 燒毀中的尊：opacity 歸燒毀曲線管，另判（見下）
          if (after) {
            stat.restored.push(row);
            if (Math.abs(g.op - expBase) > 0.02) bad.push({ ...row, why: 'restore', exp: expBase });
          } else if (s.dt >= 260) {
            if (keep) { stat.kept.push(row); if (g.op < 0.95) bad.push({ ...row, why: 'keep<0.95' }); }
            else { stat.dimmed.push(row); if (g.op > PW.FOCUS_DIM + 0.05) bad.push({ ...row, why: 'dim>0.40' }); }
          }
        }
      }
    }
  }
  // 燒毀中的尊：整條抽樣序列不得回升（退暗後又「復原」會是一個往上的跳）
  const byKey = {};
  // 序列要「同一場、同一次 focus、同一尊」才比得到——不同場次同一個格位 id 會被重新占用（reinforce），
  // 混在一起比會把「新換上來的那一尊是全亮的」誤讀成「燒到一半又亮回來」
  for (const r of stat.burning) { const k = r.f + '|' + r.duel + '|' + r.fi + '|' + r.id; (byKey[k] = byKey[k] || []).push(r); }
  let burnRise = 0;
  for (const k in byKey) {
    const seq = byKey[k].sort((a, b) => a.dt - b.dt);
    for (let i = 1; i < seq.length; i++) if (seq[i].op - seq[i - 1].op > 0.02) { burnRise++; bad.push({ ...seq[i], why: 'burn-op-rise', prev: seq[i - 1].op }); }
  }
  out.P3 = { dimmed: stat.dimmed.length, dimMax: stat.dimmed.length ? Math.max(...stat.dimmed.map((r) => r.op)) : null,
    kept: stat.kept.length, keptMin: stat.kept.length ? Math.min(...stat.kept.map((r) => r.op)) : null,
    restored: stat.restored.length, burning: stat.burning.length, burnRise,
    bad: bad.slice(0, 10),
    PASS: stat.dimmed.length > 0 && stat.kept.length > 0 && stat.restored.length > 0 && burnRise === 0 && bad.length === 0 };
}

// ── P4 跳字 ───────────────────────────────────────────────────────────────
{
  const bad = [];
  let n = 0, maxLive = 0, goneOk = 0, posOk = 0, posN = 0;
  for (const { f, d } of ons) {
    // 每筆演出的 hit 類事件都要有一個跳字：分母＝fights[].beatsShown[].shown
    let shownHits = 0;
    for (const fight of (d.fxc && d.fxc.fights) || []) for (const b of fight.beatsShown || []) shownHits += b.shown.length;
    out.P4.shownHits = (out.P4.shownHits || 0) + shownHits;
    for (const r of d.cu.dmg) {
      n++;
      maxLive = Math.max(maxLive, r.live);
      if (r.gone) goneOk++; else bad.push({ f, why: 'not-removed', t: r.t, text: r.text });
      const ref = r.mode === 'fig' ? r.proj : r.badge;
      if (ref) {
        posN++;
        const dist = Math.hypot(r.cx - ref.x, r.cy - ref.y);
        const lim = r.mode === 'fig' ? 80 : 60;
        if (dist <= lim) posOk++; else bad.push({ f, why: 'pos', mode: r.mode, dist: +dist.toFixed(1), text: r.text });
      }
      if (!/^−\d+$/.test(r.text)) bad.push({ f, why: 'text', text: r.text });
      if (/kill/.test(r.cls) && !/dmgfloat kill/.test(r.cls)) bad.push({ f, why: 'cls', cls: r.cls });
    }
  }
  out.P4.n = n; out.P4.floats = n; out.P4.maxLive = maxLive; out.P4.removed = goneOk; out.P4.posOk = posOk; out.P4.posN = posN;
  out.P4.bad = bad.slice(0, 8);
  if (skipf) {
    const s = skipf.cu.skips.filter((x) => x.rel !== undefined);
    out.P4.beforeSkipFloats = (skipf.cu.skips.find((x) => x.why === 'skip-btn') || {}).floats0;
    out.P4.afterSkipFloats = s.map((x) => x.floats);
    out.P4.skipClean = s.length > 0 && s.every((x) => x.floats === 0) && out.P4.beforeSkipFloats > 0;
  }
  out.P4.PASS = n > 0 && bad.length === 0 && maxLive <= PW.MAX_HITS && goneOk === n && posOk === posN
    && (!skipf || out.P4.skipClean);
}

// ── P5 HUD ────────────────────────────────────────────────────────────────
{
  const bad = [];
  let lamps = 0, gauges = 0, cards = 0;
  for (const { f, d } of ons) {
    for (const h of d.cu.hud) {
      if (h.type === 'lamps') {
        lamps++;
        const idx = ['一拍', '二拍', '三拍'].findIndex((x) => h.beat.startsWith(x));
        if (idx < 0) continue;
        if (h.on !== idx + 1) bad.push({ f, why: 'lampOn', beat: h.beat, on: h.on });
        if (!h.cur || h.cur.findIndex(Boolean) !== idx || h.cur.filter(Boolean).length !== 1) bad.push({ f, why: 'lampCur', beat: h.beat, cur: h.cur });
      } else if (h.type === 'gauge') {
        gauges++;
        const want = h.total ? Math.round(h.alive / h.total * 100) : 0;
        const got = parseFloat(String(h.width || '').replace('%', ''));
        if (Math.abs(got - want) > 1) bad.push({ f, why: 'gauge', want, got, alive: h.alive, total: h.total });
        const wantLow = !!h.total && h.alive / h.total < 1 / 3;
        if (h.low !== wantLow) bad.push({ f, why: 'gaugeLow', low: h.low, wantLow });
      }
    }
    const shows = d.cu.cards.filter((c) => !/-after$/.test(c.why));
    for (const c of d.cu.cards) {
      if (/-after$/.test(c.why)) {
        // 這張的檢查點之前又閃了新的一張＝計時器被接手，卡片本來就該還亮著（不是沒收）
        const refreshed = shows.some((x) => x.t > c.t - PW.ACTOR_CARD_MS - 100 && x.t < c.t);
        if (c.on && !refreshed) bad.push({ f, why: 'cardStuck', text: c.text, t: c.t });
        continue;
      }
      cards++;
      if (!c.on) bad.push({ f, why: 'cardOff', text: c.text });
      if (c.n > 1) bad.push({ f, why: 'cardMulti', n: c.n });
      if (!c.text || c.text.length < 2) bad.push({ f, why: 'cardText', text: c.text });
    }
  }
  out.P5 = { lamps, gauges, cards, bad: bad.slice(0, 8), PASS: lamps > 0 && gauges > 0 && cards > 0 && bad.length === 0 };
}

// ── P7 冒煙 ───────────────────────────────────────────────────────────────
{
  const errs = [];
  for (const { f, d } of ons) if (d.summary.errors) errs.push({ f, e: d.summary.errorList });
  if (off && off.summary.errors) errs.push({ f: opt.off, e: off.summary.errorList });
  if (cancel && cancel.summary.errors) errs.push({ f: opt.cancel, e: cancel.summary.errorList });
  if (skipf && skipf.summary.errors) errs.push({ f: opt.skipfocus, e: skipf.summary.errorList });
  out.P7 = { files: ons.length + (off ? 1 : 0) + (cancel ? 1 : 0) + (skipf ? 1 : 0), errs, PASS: errs.length === 0 };
}

console.log(JSON.stringify(out, null, 1));
const fails = Object.entries(out).filter(([, v]) => v && v.PASS === false).map(([k]) => k);
console.log('VERDICT ' + Object.entries(out).map(([k, v]) => k + '=' + (v.PASS === undefined ? '-' : v.PASS ? 'PASS' : 'FAIL')).join(' '));
process.exit(fails.length ? 1 : 0);

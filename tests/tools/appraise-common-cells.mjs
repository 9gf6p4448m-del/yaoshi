// #8 不回退（2026-09-30 修訂 #8(b)）：兩版「共同畫面」逐格比對。
// 凍結：docs/experiments/2026-09-28-acceptance-appraise-panels.md #8＋修訂 #8(b)：
//   text-fit／align：兩版共同畫面逐格比，head 通過數 ≥ base，且共同畫面中不得有任何一格 base 綠而 head 紅。
//   第一階段其餘各條（breaks／spill／font／contrast／target／north）：共同畫面逐條、逐視口，head 違規格數 ≤ base
//   （V1–V4 不多於、V5 不變差＝同一個比較）；另列全部格數的總數供參考（總數比的是不同畫面集合，見修訂原由）。
//   同時列出「base 綠 head 紅」的每一格（任何一條），供歸因。
// 格的判法與原判定器相同：text-fit＝該格該視口 items 非空即紅（text-fit-probe.mjs summary 同一條）；
//   第一階段＝visual-polish-p2-judge.mjs #9-phase1 同一個過濾（exc／inactive／sentence／transient／burnt 不算，align 只算 red）。
// 用法：node tests/tools/appraise-common-cells.mjs --tf-base <probe-base.json> --tf-head <probe-head.json>
//        --vp-base <vp probe-base.json> --vp-head <vp probe-head.json> [--out <json>]
import fs from 'node:fs';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const out = { textfit: null, phase1: null, pass: true };

if (arg('--tf-base') && arg('--tf-head')) {
  const B = rd(arg('--tf-base')), H = rd(arg('--tf-head'));
  const red = (c, v) => !!(c.vp[v] && c.vp[v].items && c.vp[v].items.length);
  let common = 0, bp = 0, hp = 0; const worse = [], better = [], byVp = {};
  for (const [k, cb] of Object.entries(B.cells)) {
    const ch = H.cells[k]; if (!ch) continue;
    for (const v of Object.keys(cb.vp)) {
      if (!ch.vp[v]) continue;
      common++; const rb = red(cb, v), rh = red(ch, v);
      const o = byVp[v] || (byVp[v] = { common: 0, basePass: 0, headPass: 0 }); o.common++;
      if (!rb) { bp++; o.basePass++; } if (!rh) { hp++; o.headPass++; }
      if (!rb && rh) worse.push(`${k}@${v} ${ch.vp[v].items.map((x) => x.sel + ' sh' + x.sh + '/ch' + x.ch).join('、')}`);
      if (rb && !rh) better.push(`${k}@${v}`);
    }
  }
  const onlyBase = Object.keys(B.cells).filter((k) => !H.cells[k]).length, onlyHead = Object.keys(H.cells).filter((k) => !B.cells[k]).length;
  out.textfit = { common, basePass: bp, headPass: hp, worse, better, byVp, onlyBase, onlyHead, totals: { base: B.summary && { cells: B.summary.cells, red: B.summary.cellsRed }, head: H.summary && { cells: H.summary.cells, red: H.summary.cellsRed } },
    pass: hp >= bp && worse.length === 0 };
  if (!out.textfit.pass) out.pass = false;
}
if (arg('--vp-base') && arg('--vp-head')) {
  const B = rd(arg('--vp-base')), H = rd(arg('--vp-head'));
  const K = ['breaks', 'spill', 'font', 'contrast', 'target', 'align', 'north'];
  const bad = (m, k) => { let l = (m && m[k]) || []; if (k === 'align') l = l.filter((x) => x.red); return l.filter((x) => !x.exc && !x.inactive && !x.sentence && !x.transient && !x.burnt); };
  const VPS = [...new Set(Object.values(B.cells).flatMap((c) => Object.keys(c.vp)))].sort();
  const res = {}, worseCells = [];
  for (const k of K) {
    res[k] = {};
    for (const v of VPS) {
      let common = 0, b = 0, h = 0, tb = 0, th = 0, nb = 0, nh = 0;
      for (const c of Object.values(B.cells)) if (c.vp[v]) { nb++; if (bad(c.vp[v], k).length) tb++; }
      for (const c of Object.values(H.cells)) if (c.vp[v]) { nh++; if (bad(c.vp[v], k).length) th++; }
      for (const [ck, cb] of Object.entries(B.cells)) {
        const ch = H.cells[ck]; if (!ch || !cb.vp[v] || !ch.vp[v]) continue;
        common++; const rb = bad(cb.vp[v], k).length > 0, rh = bad(ch.vp[v], k).length > 0;
        if (rb) b++; if (rh) h++;
        if (!rb && rh) worseCells.push(`${k}|${ck}@${v} ${bad(ch.vp[v], k).slice(0, 3).map((x) => (x.sel || x.g || x.kind) + (x.ratio ? ' ' + x.ratio : '')).join('、')}`);
      }
      res[k][v] = { common, base: b, head: h, ok: h <= b, totals: `${tb}/${nb}→${th}/${nh}` };
    }
  }
  const worse = []; for (const k of K) for (const v of VPS) if (!res[k][v].ok) worse.push(`${k}@${v} 共同 ${res[k][v].common} 格 ${res[k][v].base}→${res[k][v].head}`);
  const alignWorse = worseCells.filter((x) => x.startsWith('align|'));
  out.phase1 = { byItem: res, worse, worseCells, alignWorse, pass: worse.length === 0 && alignWorse.length === 0 };
  if (!out.phase1.pass) out.pass = false;
}
if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(out, null, 1));
if (out.textfit) {
  const t = out.textfit;
  console.log(`text-fit 共同 ${t.common} 格：通過 base ${t.basePass} → head ${t.headPass}；base 綠 head 紅 ${t.worse.length} 格；變綠 ${t.better.length}；base 獨有 ${t.onlyBase}、head 獨有 ${t.onlyHead} 個畫面鍵 ⇒ ${t.pass ? '過' : '不過'}`);
  for (const w of t.worse) console.log('  ✗', w);
}
if (out.phase1) {
  const p = out.phase1;
  for (const [k, o] of Object.entries(p.byItem)) console.log(`${k}: ` + Object.entries(o).map(([v, x]) => `${v} 共同${x.common}格 ${x.base}→${x.head}${x.ok ? '' : '✗'}（全部 ${x.totals}）`).join('；'));
  console.log(`第一階段共同畫面 ⇒ ${p.pass ? '過' : '不過'}；base 綠 head 紅（任一條）${p.worseCells.length} 格，其中 align ${p.alignWorse.length}`);
  for (const w of p.worseCells) console.log('  ·', w);
}
process.exitCode = out.pass ? 0 : 1;

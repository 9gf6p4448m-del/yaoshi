/* 條件 4c 彙整：node summarize-c4c.mjs <out 資料夾> → 每情境 base／new／off 並列 + 判定 */
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const rows = []; let allPass = true;
for (const scen of ['solo-844x390', 'solo-1280x720', 'hotseat-844x390']) {
  const R = {};
  for (const tag of ['base', 'new', 'off']) {
    const f = path.join(dir, `c4c-${scen}-${tag}.json`); if (!fs.existsSync(f)) { R[tag] = null; continue; }
    const d = JSON.parse(fs.readFileSync(f, 'utf8')); const g = d.geo || {};
    const overlap = (d.lenSummary || []).reduce((a, x) => a + (x.itemOverlapFrames || 0), 0);
    R[tag] = { frames: g.frames, handFrames: g.handFrames, relicHitFrames: g.relicHitFrames, chipHitFrames: g.chipHitFrames, aba10: g.aba10, edgeFlips: g.edgeFlips, 疊拍品總幀數: overlap, rearOnScreenFrames: g.rearOnScreenFrames, nearClipFrames: g.nearClipFrames, upd_p95: d.perf && d.perf.upd_p95, dt_p95: d.perf && d.perf.dt_p95, framesVis: d.perf && d.perf.framesVis, errs: d.errs, naturalEnded: d.naturalEnded };
  }
  const n = R.new, o = R.off; if (!n) continue;
  const c12 = n.relicHitFrames === 0, c13 = (n.aba10 || []).every((x) => x === 0), c14 = o ? n.疊拍品總幀數 <= o.疊拍品總幀數 : null, c15 = n.upd_p95 <= 35.2 && n.dt_p95 <= 50.1;
  const pass = c12 && c13 && c14 !== false && (n.errs || []).length === 0; // 條件 15 的 perf 在 --natural=1 跑裡是「整局後口徑」（修訂 7：不設門檻、只列數字）；腳本段口徑另跑（out/c15-*）
  allPass = allPass && pass;
  rows.push({ scen, 條件12_relicHit0: c12, 條件13_aba0: c13, 條件14_疊拍品_新_le_handreal0: c14, 條件15_upd35_2且dt50_1: c15, pass, base: R.base, new: n, off: o });
}
console.log(JSON.stringify(rows, null, 1)); console.log('條件4c:', allPass ? 'PASS' : 'FAIL');

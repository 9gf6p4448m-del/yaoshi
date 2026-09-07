// V6：duel-perf perf --n=8 交錯量 5 對（新 HEAVY 含傳說三尊 vs 基準 HEAVY＝原本最重 8 隻），
// 逐對算 fps 比值再取中位。閘門：中位比值 ≥ 0.9。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const PAIRS = Number(process.argv[2] || 5);
const rows = [];
const run = (heavyBase, port, tag) => {
  const out = `.claude/tmp/perf-${tag}.json`;
  const args = ['tests/tools/duel-perf.mjs', 'perf', out, `--port=${port}`, '--n=8'];
  if (heavyBase) args.push('--heavy=base');
  execFileSync('node', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  return j.perf;
};
for (let i = 0; i < PAIRS; i++) {
  const a = run(false, 8850 + i * 2, `new${i}`);      // 新：HEAVY 含三尊
  const b = run(true, 8851 + i * 2, `base${i}`);      // 基準：原本最重 8 隻
  rows.push({
    pair: i,
    new_renders: a.rendersPerSec, base_renders: b.rendersPerSec,
    new_raf: a.rafMedianFps, base_raf: b.rafMedianFps,
    new_calls: a.drawCallsPerFrame, base_calls: b.drawCallsPerFrame,
    new_tris: a.trianglesPerFrame, base_tris: b.trianglesPerFrame,
    new_loadMs: a.loadMs, base_loadMs: b.loadMs,
    ratio_renders: +(a.rendersPerSec / b.rendersPerSec).toFixed(3),
    ratio_raf: +(a.rafMedianFps / b.rafMedianFps).toFixed(3),
    gl: a.gl, new_visible: `${a.visible}/${a.total}`, base_visible: `${b.visible}/${b.total}`,
  });
  console.log(JSON.stringify(rows[rows.length - 1]));
}
const med = (xs) => { const s = xs.slice().sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
const summary = {
  pairs: rows.length,
  median_ratio_renders: +med(rows.map((r) => r.ratio_renders)).toFixed(3),
  median_ratio_raf: +med(rows.map((r) => r.ratio_raf)).toFixed(3),
  gate: '中位比值 ≥ 0.90',
};
summary.pass = summary.median_ratio_renders >= 0.9 && summary.median_ratio_raf >= 0.9;
fs.writeFileSync('.claude/tmp/v6-perf.json', JSON.stringify({ rows, summary }, null, 1));
console.log('SUMMARY', JSON.stringify(summary));

// 範圍守衛 #9(46) 鑑別力：在暫存 worktree／暫存 repo 上刻意違規，守衛必須紅（原樹唯讀）
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const sh = (c, o = {}) => execSync(c, { encoding: 'utf8', maxBuffer: 256 << 20, ...o });
const run = (dir, env = {}) => {
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', 'tests/nightwalk.test.mjs'], { cwd: dir, env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || '');
  const line = out.split('\n').find((l) => /#9\(46\)/.test(l) && /^[✔✖]/.test(l.trim())) || '(找不到 #9 結果行)';
  const msg = (out.match(/AssertionError \[ERR_ASSERTION\]: (.+)/g) || []).filter((m) => /範圍守衛|hunk|不得刪改|不允許|標記區間|活性/.test(m));
  return { status: line.trim().startsWith('✔') ? 'green' : line.trim().startsWith('✖') ? 'red' : 'unknown', line: line.trim().slice(0, 40), msg: [...new Set(msg)].map((m) => m.slice(0, 140)) };
};
const results = {};
const WT = 'C:/Users/shung/wt/yaoshi/tmp-n46-mut';
const BASE = sh('git merge-base HEAD origin/main', { cwd: ROOT }).trim();
results.base = BASE;
sh(`git worktree add --detach ${WT} HEAD`, { cwd: ROOT, stdio: 'pipe' });
try {
  const idx = path.join(WT, 'index.html');
  const orig = fs.readFileSync(idx, 'utf8');
  const eol = orig.includes('\r\n') ? '\r\n' : '\n';
  results.M0_unmodified_defaultBase = run(WT);
  /* M1：標記外既有行被改（引擎常數 LIFE 50→51） */
  fs.writeFileSync(idx, orig.replace('LIFE: 50, ROUNDS: 12', 'LIFE: 51, ROUNDS: 12'));
  results.M1_engine_line_modified = run(WT);
  /* M2：標記外「純新增」一行（引擎區多一行語句） */
  fs.writeFileSync(idx, orig.replace('const RELEASE_VERSION=', '/* MUT */ const __mut46=1;' + eol + 'const RELEASE_VERSION='));
  results.M2_insert_outside_marker = run(WT);
  /* M3：標記外的 NIGHTWALK 第 1–3 章物件內純新增一行 */
  fs.writeFileSync(idx, orig.replace('  {n:2,title:"招魂嶺收驚婆"', '  /* MUT */' + eol + '  {n:2,title:"招魂嶺收驚婆"'));
  results.M3_insert_in_array_outside_marker = run(WT);
  fs.writeFileSync(idx, orig);
  /* M4：基準無效 */
  results.M4_invalid_base = run(WT, { NW46_BASE: 'deadbeefdeadbeef' });
  /* M5：env 基準＝merge-base 顯式給（等價於預設，應綠） */
  results.M5_env_base_explicit = run(WT, { NW46_BASE: BASE });
} finally {
  sh(`git worktree remove --force ${WT}`, { cwd: ROOT, stdio: 'pipe' });
}
/* M6：沒有 origin/main 的 repo（git init 的獨立副本）：必須明確 fail */
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'n46-noorigin-'));
try {
  sh(`git archive HEAD -- index.html tests docs/experiments/2026-09-25-n1-nightwalk docs/experiments/2026-10-11-n1-ch4-6 | tar -x -C "${T}"`, { cwd: ROOT, shell: 'bash', stdio: 'pipe' });
  sh('git init -q && git add -A && git -c user.email=a@b -c user.name=n commit -qm x', { cwd: T, stdio: 'pipe' });
  results.M6_no_origin_main = run(T);
} finally { fs.rmSync(T, { recursive: true, force: true }); }
console.log(JSON.stringify(results, null, 1));
const exp = { M0_unmodified_defaultBase: 'green', M1_engine_line_modified: 'red', M2_insert_outside_marker: 'red', M3_insert_in_array_outside_marker: 'red', M4_invalid_base: 'red', M5_env_base_explicit: 'green', M6_no_origin_main: 'red' };
const ok = Object.entries(exp).every(([k, v]) => results[k].status === v);
console.log('ALL_AS_EXPECTED', ok);
process.exitCode = ok ? 0 : 1;

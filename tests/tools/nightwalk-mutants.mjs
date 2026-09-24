/* 夜行錄 N1 突變驗紅（凍結 #3、#4）：把 index.html 複製到系統暫存目錄、只改一處，再用 NW_TARGET 跑
   tests/nightwalk.test.mjs，記下「紅在哪一條斷言」。原檔全程唯讀、不做反向 sed；結束刪掉暫存突變體。
   跑法：node tests/tools/nightwalk-mutants.mjs [out.json] */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'index.html');
const OUT = process.argv[2] || '';
const MUTANTS = [
  { id: 'M3-chainsOff', frozen: '#3', what: '拿掉 activeChains 的連鎖關閉判斷（擋點 G1）',
    from: 'if(S&&S.chainsOff) return []; /* 夜行錄第 1 章關連鎖', to: '/* MUTANT */ /* 夜行錄第 1 章關連鎖',
    expect: /#3 第 1 章：六組連鎖注入/ },
  { id: 'M4-gte', frozen: '#4', what: 'nightwalkPass 的 `>` 改 `>=`',
    from: 'return !boss.alive||me.life>boss.life;', to: 'return !boss.alive||me.life>=boss.life;',
    expect: /#4 nightwalkPass/, expectMsg: /壽命相等/ },
  { id: 'M4-noAlive', frozen: '#4', what: '拿掉「真人須活著」',
    from: '  if(!me.alive) return false;\n  return !boss.alive', to: '  return !boss.alive',
    expect: /#4 nightwalkPass/, expectMsg: /真人出局/ },
];
const src = fs.readFileSync(SRC, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
const results = [];
for (const m of MUTANTS) {
  const from = m.from.replace(/\n/g, eol), to = m.to.replace(/\n/g, eol);
  const n = src.split(from).length - 1;
  if (n !== 1) { results.push({ id: m.id, error: `錨點出現 ${n} 次（程式碼變了，要更新突變定義）` }); continue; }
  const tmp = path.join(os.tmpdir(), `nw-mutant-${m.id}-${process.pid}.html`);
  fs.writeFileSync(tmp, src.replace(from, to), 'utf8');
  try {
    const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', 'tests/nightwalk.test.mjs'], { cwd: ROOT, env: { ...process.env, NW_TARGET: tmp }, encoding: 'utf8', maxBuffer: 64 << 20 });
    const out = (r.stdout || '') + (r.stderr || '');
    const failed = [...out.matchAll(/^✖ (.+?) \(\d/mg)].map((x) => x[1]).filter((t) => !/^tests[\\/]/.test(t) && t !== 'failing tests:');
    const uniq = [...new Set(failed)];
    const msgs = [...out.matchAll(/AssertionError \[ERR_ASSERTION\]: (.+)/g)].map((x) => x[1]);
    const hitTest = uniq.some((t) => m.expect.test(t));
    const hitMsg = m.expectMsg ? msgs.some((x) => m.expectMsg.test(x)) : true;
    results.push({ id: m.id, frozen: m.frozen, what: m.what, exit: r.status, failedTests: uniq, assertionMessages: [...new Set(msgs)], redAsExpected: r.status !== 0 && hitTest && hitMsg });
  } finally { fs.rmSync(tmp, { force: true }); }
}
const srcAfter = fs.readFileSync(SRC, 'utf8');
const summary = { source: 'index.html', sourceUnchanged: srcAfter === src, results, allRed: results.every((x) => x.redAsExpected) };
console.log(JSON.stringify(summary, null, 1));
if (OUT) fs.writeFileSync(OUT, JSON.stringify(summary, null, 1), 'utf8');
process.exitCode = summary.allRed && summary.sourceUnchanged ? 0 : 1;

/* 夜行錄第 4–6 章突變驗紅（凍結 docs/experiments/2026-10-11-acceptance-n1-ch4-6.md #3、#4、#5、#6）：
   把 index.html 複製到系統暫存目錄、只改一處，用 NW_TARGET 跑 tests/nightwalk.test.mjs，記下「紅在哪一條」。
   原檔全程唯讀、不做反向 sed。跑法：node tests/tools/nw-mutants-46.mjs [out.json] */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'index.html');
const OUT = process.argv[2] || '';
const MUTANTS = [
  { id: 'M3-ch4-chainsOff', frozen: '#3', what: '第 4 章 rules.chains 改 false',
    from: '{n:4,title:"禁壇收祟",boss:"lvshan",rules:{chains:true,destiny:true}', to: '{n:4,title:"禁壇收祟",boss:"lvshan",rules:{chains:false,destiny:true}',
    expect: /#3\(46\)|#7\(46\) copy-r2/ },
  { id: 'M4-openAll', frozen: '#4', what: 'nwChapterOpen 恆回 true',
    from: 'if(all||cleared.includes(c.n)) return true;', to: 'return true;',
    expect: /#4\(46\)|#6 依序開放/ },
  { id: 'M5-bossHardcode', frozen: '#5', what: 'nightwalkPass 把主角寫死成 qingmian',
    from: 'boss=st.players.find(p=>p.ai&&p.roleId===ch.boss)', to: 'boss=st.players.find(p=>p.ai&&p.roleId==="qingmian")',
    expect: /#5\(46\)/ },
  { id: 'M6-ruleNights', frozen: '#6', what: 'CFG.RULE_NIGHTS [3,7] → [3,8]',
    from: 'RULE_NIGHTS:[3,7],', to: 'RULE_NIGHTS:[3,8],',
    expect: /#6\(46\)/, expectMsg: /規則夜夜數/ },
  { id: 'M6-ruleName', frozen: '#6', what: 'NIGHTRULES.luopo 改名',
    from: 'luopo:{id:"luopo",name:"落魄夜"', to: 'luopo:{id:"luopo",name:"落魄日"',
    expect: /#6\(46\)/, expectMsg: /缺規則夜名稱/ },
  { id: 'M6-eventNights', frozen: '#6', what: 'CFG.EVENT_NIGHTS [4,8,11] → [4,8,12]',
    from: 'EVENT_NIGHTS:[4,8,11],', to: 'EVENT_NIGHTS:[4,8,12],',
    expect: /#6\(46\)/, expectMsg: /異事夜數/ },
  { id: 'M6-shrineNights', frozen: '#6', what: 'CFG.SHRINE_NIGHTS [5,8,11] → [5,8,12]',
    from: 'SHRINE_NIGHTS: [5,8,11],', to: 'SHRINE_NIGHTS: [5,8,12],',
    expect: /#6\(46\)/, expectMsg: /請神夜數/ },
];
const src = fs.readFileSync(SRC, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
const results = [];
for (const m of MUTANTS) {
  const from = m.from.replace(/\n/g, eol), to = m.to.replace(/\n/g, eol);
  const n = src.split(from).length - 1;
  if (n !== 1) { results.push({ id: m.id, error: `錨點出現 ${n} 次（程式碼變了，要更新突變定義）` }); continue; }
  const tmp = path.join(os.tmpdir(), `nw46-mutant-${m.id}-${process.pid}.html`);
  fs.writeFileSync(tmp, src.replace(from, () => to), 'utf8');
  try {
    const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', 'tests/nightwalk.test.mjs'], { cwd: ROOT, env: { ...process.env, NW_TARGET: tmp }, encoding: 'utf8', maxBuffer: 64 << 20 });
    const out = (r.stdout || '') + (r.stderr || '');
    const failed = [...out.matchAll(/^✖ (.+?) \(\d/mg)].map((x) => x[1]).filter((t) => !/^tests[\/]/.test(t) && t !== 'failing tests:');
    const uniq = [...new Set(failed)];
    const msgs = [...out.matchAll(/AssertionError \[ERR_ASSERTION\]: (.+)/g)].map((x) => x[1]);
    const hitTest = uniq.some((t) => m.expect.test(t));
    const hitMsg = m.expectMsg ? msgs.some((x) => m.expectMsg.test(x)) : true;
    results.push({ id: m.id, frozen: m.frozen, what: m.what, exit: r.status, failedTests: uniq, assertionMessages: [...new Set(msgs)], redAsExpected: r.status !== 0 && hitTest && hitMsg });
  } finally { fs.rmSync(tmp, { force: true }); }
}
const srcAfter = fs.readFileSync(SRC, 'utf8');
const summary = { source: 'index.html', sourceUnchanged: srcAfter === src, note: '基準已知紅「#1 常規局…3a0d971」在每個突變體上都會同樣紅，不計入 redAsExpected', results, allRed: results.every((x) => x.redAsExpected) };
console.log(JSON.stringify(summary, null, 1));
if (OUT) fs.writeFileSync(OUT, JSON.stringify(summary, null, 1), 'utf8');
process.exitCode = summary.allRed && summary.sourceUnchanged ? 0 : 1;

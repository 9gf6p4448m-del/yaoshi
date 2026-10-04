/* v0.60.0 驗收 #1：trace 等價＋Math.random 計數（凍結 docs/experiments/2026-10-05-grab-hands/acceptance.md）。
   node tests/tools/grab-trace-check.mjs <基準 index.html（155a7e7f）> [<新版 index.html，預設本樹>]
   比三份 trace(1..20)：基準、新版（CFG.GRAB_ON=true）、新版改 GRAB_ON=false 的暫存副本（原檔唯讀，跑完刪副本）——必須逐位元組相等。
   Math.random 計數：trace 期間包一層計數（三份各自計），新版兩份必須 0。
   突變驗紅：--mutate 另產一份把 CFG.ROUNDS 減 1 的新版副本，預期不相等（證明這支抓得到差異）。 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './load.mjs';

const HERE = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const basePath = args[0], newPath = args[1] || path.join(HERE, 'index.html');
if (!basePath) { console.error('need <base index.html> [<new index.html>]'); process.exit(2); }
const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
const tmp = (name, txt) => { const p = path.join(os.tmpdir(), `grab-trace-${process.pid}-${name}.html`); fs.writeFileSync(p, txt, 'utf8'); return p; };
function run(p) {
  const orig = Math.random; let n = 0;
  Math.random = function () { n++; return orig.call(Math); };
  try { return { json: JSON.stringify(loadGame(p).trace(seeds)), randomCalls: n }; } finally { Math.random = orig; }
}
const src = fs.readFileSync(newPath, 'utf8');
if (!/GRAB_ON:\s*true,/.test(src)) { console.error('新版找不到 CFG.GRAB_ON: true（量不到判紅）'); process.exit(1); }
const offPath = tmp('off', src.replace(/GRAB_ON:\s*true,/, 'GRAB_ON: false,'));
const files = [offPath];
try {
  const b = run(basePath), on = run(newPath), off = run(offPath);
  const out = { seeds: '1..20', base: basePath, new: newPath, bytes: { base: b.json.length, on: on.json.length, off: off.json.length },
    equalOn: b.json === on.json, equalOff: b.json === off.json, randomCalls: { base: b.randomCalls, on: on.randomCalls, off: off.randomCalls } };
  if (process.argv.includes('--mutate')) {
    const m = src.match(/ROUNDS\s*:\s*(\d+)/); const mp = tmp('mut', src.replace(/ROUNDS\s*:\s*\d+/, 'ROUNDS: ' + (Number(m[1]) - 1))); files.push(mp);
    out.mutantDiffers = run(mp).json !== on.json;
  }
  out.pass = out.equalOn && out.equalOff && out.randomCalls.on === 0 && out.randomCalls.off === 0 && (out.mutantDiffers === undefined || out.mutantDiffers);
  console.log(JSON.stringify(out));
  process.exit(out.pass ? 0 : 1);
} finally { for (const f of files) fs.rmSync(f, { force: true }); }

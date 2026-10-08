// 手×拍品穿模（覆審 N1）：拍令牌時手的蒙皮頂點落進拍品網格內部的幀數（真頁面 playwright，射線奇偶法，tests/tools/hand-lot-pen.mjs）。
// 基準 5c91bdc7：橫式 0、直式 1（南席 4 點）。拍令牌改成四席都從前緣外直進之前（北／西／東從北邊／側邊進場），橫式 169 幀／2192 點、直式更多；
// 現值：橫式 2 幀／3 點、直式 8 幀／8 點（拍品 2 的前緣外突，令牌就落在它的外接盒內，殘留 1 幀量級）。上限＝現值加一點餘裕，不是 0。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
function pen(vp, port) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hlpen-')), 'p.json');
  const r = spawnSync(process.execPath, ['tests/tools/hand-lot-pen.mjs', `--vp=${vp}`, `--port=${port}`, `--out=${out}`], { cwd: ROOT, encoding: 'utf8', timeout: 280000 });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}
for (const [vp, port, capFrames] of [['844x390', 9351, 4], ['390x844', 9352, 10]]) {
  test(`拍令牌：手不穿過拍品身體（${vp}）：四席×四槽，手頂點在拍品網格內的幀數 ≤ ${capFrames}（修前 北／西／東 169 幀）`, () => {
    const r = pen(vp, port);
    assert.equal(r.out.length, 16);
    for (const s of r.bySeat) assert.ok(s.handFrames > 150, `席${s.seat} 活性：手可見幀 ${s.handFrames}`);
    assert.ok(r.total.frames <= capFrames, `${vp} 手穿拍品 ${r.total.frames} 幀／${r.total.points} 點 > ${capFrames}（每席 ${JSON.stringify(r.bySeat.map((x) => x.frames))}）`);
  });
}

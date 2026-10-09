// 手×拍品穿模（覆審 N1／H1／M1）：真頁面（playwright）全頂點、三向射線表決（tests/tools/hand-lot-pen.mjs，不抽樣），橫式 844×390。
// 各劇本上限＝基準 5c91bdc7 同劇本的實測值或更嚴（基準：single 2 幀／3 點、push1 0、reb 0、four 9／40、ai 79／862）。
// single 現值 1 幀／1 點（南席手碰到拍品 2 伸到令牌上方的爪子；基準 2 幀／3 點是東席槽0），上限＝基準 2／3，重跑 4 次同值（不抽樣、無雜訊）。
// 南席拍令牌的指尖界線 REACH_SLAM.SOUTH_IN 由 0.05 改 0（指尖停在前緣，不伸進托盤）後才壓到這個值（0.05 時 1–3 幀／4–7 點、隨拍品閒置動畫在兩個值之間跳）。
// 其餘劇本現值：push1 0、reb 0、four 2／5、ai 21／44；上限訂得比基準緊（four ≤4／20、ai ≤26／100）。
// 各席拍令牌改回從北邊／側邊進場（覆審 N1）、北席擺錢界線 NORTH_IN 放寬（覆審 H1）、打斷時手飛過拍品（覆審 M1）都會讓對應劇本變紅。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let PORT = 9351;
function pen(scen, vp = '844x390') {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hlpen-')), 'p.json');
  const r = spawnSync(process.execPath, ['tests/tools/hand-lot-pen.mjs', `--vp=${vp}`, `--scen=${scen}`, `--port=${PORT++}`, `--out=${out}`], { cwd: ROOT, encoding: 'utf8', timeout: 900000 });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}
const CASES = [
  ['single', '每席每槽單獨盯上（拍令牌）', 2, 3, 16],
  ['push1', '每席每槽單獨擺錢（北席 NORTH_IN 放寬時整隻手插進拍品）', 0, 0, 16],
  ['reb', '盯上途中被同席出價打斷（打斷後的推錢與收手）', 0, 0, 12],
  ['four', '四席同時盯上（4 種槽位輪轉）', 4, 20, 4],
  ['ai', '北／西／東各擺四格（AI 一次推多格）後四席同拍', 26, 100, 2],
];
for (const [scen, what, capF, capP, n] of CASES) {
  test(`手×拍品（全頂點）${scen}：${what}：手頂點在拍品網格內 ≤ ${capF} 幀／${capP} 點`, () => {
    const r = pen(scen);
    assert.equal(r.out.res.length, n);
    for (const k of Object.keys(r.bySeat)) assert.ok(r.bySeat[k].vis > 60, `活性：${k} 手可見幀 ${r.bySeat[k].vis}`);
    assert.ok(r.total.frames <= capF && r.total.points <= capP, `${scen}：手穿拍品 ${r.total.frames} 幀／${r.total.points} 點 > ${capF}／${capP}（每席 ${JSON.stringify(r.bySeat)}）`);
  });
}

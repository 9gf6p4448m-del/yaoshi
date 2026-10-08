// 手的伸展範圍放寬（使用者試玩「手拍令牌離令牌有距離」「西家丟錢手停了錢還在飛」，裁定「放寬到手搆得到所有槽」）的驗收。
// 走真實鏈路：真 table-props＋真 table-hands＋真 hand-motion＋真蒙皮（tests/tools/hand-reach-probe.mjs、throw-seat-timing.mjs）。
// 紅綠對照：還原到 5c91bdc7 的 hand-motion.js，①②紅在行為斷言（gap3／ratio），③ 與修後同為綠（基準數字寫死在下面）。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { measureSlam, measureCollisions, measureEntry } from './tools/hand-reach-probe.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const NAME = ['南', '北', '西', '東'];

test('① 拍令牌：四席×四槽，令牌落地後手（袖口邊以前的蒙皮頂點）到令牌 3D 外接盒的最近距離 ≤ 0.05 m（修前 0.25–1.1 m）', async () => {
  const rows = await measureSlam({});
  assert.equal(rows.length, 16);
  for (const r of rows) assert.ok(r.gap3 !== null && r.gap3 <= 0.05, `${NAME[r.seat]}席 槽${r.slot}：手離令牌 ${r.gap3} m（> 0.05）`);
});

test('② 擺錢：四席×四槽，推錢階段「手掌路徑長 ÷ 錢柱路徑長」≥ 0.8（修前西槽3 0.418）；錢的時長與路徑與修前逐值相同（704.2 ms）', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hreach-')), 'th.json');
  const r = spawnSync(process.execPath, ['tests/tools/throw-seat-timing.mjs', '1', 'all', `--json=${out}`], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const rows = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(rows.length, 16);
  /* 5c91bdc7 量到的錢柱時長與路徑長（手是純演出，錢的軌跡不得因手改動）：[席, 槽, ms, m] */
  const base = [['南', 0, 704.2, 1.2602], ['北', 0, 704.2, 2.3699], ['西', 0, 704.2, 0.1824], ['東', 0, 704.2, 2.2777], ['南', 1, 704.2, 0.4665], ['北', 1, 704.2, 2.1096], ['西', 1, 704.2, 0.6046], ['東', 1, 704.2, 1.3944],
    ['南', 2, 704.2, 0.2682], ['北', 2, 704.2, 2.1783], ['西', 2, 704.2, 1.4142], ['東', 2, 704.2, 0.5578], ['南', 3, 704.2, 0.9656], ['北', 3, 704.2, 2.5101], ['西', 3, 704.2, 2.2727], ['東', 3, 704.2, 0.104]];
  for (const [seat, slot, ms, len] of base) {
    const x = rows.find((q) => q.seat === seat && q.slot === slot);
    assert.ok(x, `${seat}${slot} 缺列`);
    assert.equal(x.moneyMs, ms, `${seat}席槽${slot} 錢柱時長變了`);
    assert.equal(x.moneyPathM, len, `${seat}席槽${slot} 錢柱路徑變了`);
    assert.ok(x.ratio >= 0.8, `${seat}席槽${slot}：手掌路徑÷錢柱路徑 ${x.ratio}（< 0.8）`);
  }
});

test('③ 無新碰撞：四席同時擺錢＋拍令牌（4 種槽位輪轉），手 AABB×別席手 AABB 與 手 AABB×別槽令牌／錢柱／木籌槽 的相交幀數不得多於 5c91bdc7 基準（336／814）', async () => {
  const c = await measureCollisions({});
  assert.ok(c.liveHandFrames > 1000, `活性：手上場幀數 ${c.liveHandFrames}`);
  assert.ok(c.handHand <= 336, `手×手 ${c.handHand} > 336`);
  assert.ok(c.handObstacle <= 814, `手×障礙 ${c.handObstacle} > 814`);
});

test('④ 進場：拍令牌時四席×四槽（橫式 L＋直式 P），手第一個可見的那一幀，看得見的蒙皮頂點沒有任何一個落在托盤布面（平面矩形）內＝從托盤外緣進場，不在盤中瞬現（全放寬原本北席 2187 個、西／東最多 1078 個頂點在布面上）', async () => {
  for (const layout of ['L', 'P']) {
    const rows = await measureEntry({ layout });
    assert.equal(rows.length, 16);
    for (const r of rows) {
      assert.ok(r.inside !== null && r.total > 500, `${layout} ${NAME[r.seat]}席 槽${r.slot}：手沒有上場（活性）`);
      assert.equal(r.inside, 0, `${layout} ${NAME[r.seat]}席 槽${r.slot}：首幀有 ${r.inside} 個頂點在托盤布面上（最深 ${r.deep} m）`);
    }
  }
});

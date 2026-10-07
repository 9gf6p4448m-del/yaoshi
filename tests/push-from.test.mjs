// v0.62.6 錢的出發點（acceptance-c3.md 調整 ②，選項 B）：手推時錢柱從自家信物前緣出發；該席沒有信物（還沒 setSeats）時照舊從席位中心出發。
// 走真實 table-props（tests/hand-fixture.mjs 的載入管線），不 mock。
import assert from 'node:assert/strict';
import test from 'node:test';
import { THREE, loadProps, LAYOUTS } from './hand-fixture.mjs';

const { createTableProps } = await loadProps();
function rig(withSeats) {
  const props = createTableProps(new THREE.Group(), { handPaths: true });
  props.setLayout(...LAYOUTS.L);
  if (withSeats) props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
  return props;
}
/** 出價當下（還沒 update）錢柱中心離席位中心多遠、與落點中心的距離。 */
function startOf(props, seat, slot) {
  props.bid(seat, slot, 5);
  const st = props.stackAt(seat, slot), sp = props.seatPosition(seat);
  return { fromSeat: Math.hypot(st.x - sp.x, st.z - sp.z), toDest: Math.hypot(st.tx - st.x, st.tz - st.z), st };
}

test('沒有信物（未 setSeats）：錢柱照舊從席位中心出發', () => {
  const props = rig(false);
  assert.equal(props.relicObstacles().length, 0, '沒入座＝沒有信物');
  for (const [seat, slot] of [[0, 1], [1, 3], [2, 0], [3, 2]]) {
    const r = startOf(props, seat, slot);
    assert.ok(r.fromSeat < 1e-9, `席${seat}格${slot} 出發點離席位中心 ${r.fromSeat}（應為 0）`);
  }
});

test('有信物：錢柱從自家信物前緣外出發（錢柱外緣不碰信物外接圓），落點不變、不越過落點', () => {
  const props = rig(true);
  const relics = props.relicObstacles();
  for (const [seat, slot] of [[0, 1], [1, 3], [2, 0], [3, 2], [3, 3]]) {
    const r = startOf(props, seat, slot), rel = relics.find((o) => o.seat === seat), sp = props.seatPosition(seat);
    assert.ok(rel, `席${seat} 有信物`);
    const L = Math.hypot(r.st.tx - sp.x, r.st.tz - sp.z);
    assert.ok(r.fromSeat >= Math.min(rel.r + r.st.r, 0.8 * L) - 1e-9, `席${seat}格${slot} 錢柱外緣壓到信物（離席位 ${r.fromSeat.toFixed(3)}，信物半徑 ${rel.r.toFixed(3)}＋錢柱半徑 ${r.st.r.toFixed(3)}）`);
    assert.ok(r.toDest > 1e-6 && r.fromSeat < L, `席${seat}格${slot} 出發點在席位與落點之間`);
  }
});

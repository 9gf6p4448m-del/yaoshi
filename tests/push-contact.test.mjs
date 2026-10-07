// v0.62.6 擺錢推「手真的推著錢走」回歸測試（凍結驗收：D:\yaoshi-scratch\pushc-out\acceptance-c3.md，2026-10-07 使用者裁定選項 C／B）。
// 走真實鏈路：tests/hand-fixture.mjs 的 createTableProps＋createTableHands（真的手、真的信物與伸入界線解算），不 mock。固定 dt=1/60，決定性。
// 定義（同 pushc-out\pushc3.mjs）：
//   段＝同一席同一格、hand state kind=push；Δ＝錢柱中心這一幀的水平位移（>1e-5、非 returning）。
//   gap＝手 SkinnedMesh 蒙皮後頂點（世界座標，只取 y ≤ 錢柱頂＋0.03）到錢柱軸的水平距離 − r；手不可見＝∞；接觸＝gap ≤0.03。
//   lb＝max_界線 (n·q − c) − r（任何守伸入界線的手到錢柱的 gap 下界）；lb ≤0.03＝界線內幀，其餘＝界線外幀。
//   contactFrac_in＝界線內接觸位移／界線內位移；runOut_in＝界線內連續未接觸位移最大值；runOut＝連續未接觸位移最大值（含界線外）。
//   lineGap＝界線外幀，那條界線 c − 手頂點 n·v 的最大值（手停在界線前多遠）。pinFrac_in＝界線內「手根位移 <0.2Δ 或手不可見」的位移比例。
// v0.62.5（85c38c6a）：slow=1 contactFrac_in 0.548、最差一段 0.032、runOut_in 0.776、lineGap 0.407。實測（fresh 覆審 review2）：本檔在 85c38c6a 上 fail 6／pass 1——
//   slow=1 的條件 4（pinFrac_in）在 v0.62.5 本來就 ≤0.20（脫鉤多半落在界線外幀），只有 slow=1.5 那條紅；其餘條件兩個速度都紅。
import assert from 'node:assert/strict';
import test from 'node:test';
import { THREE, loadProps, loadHands, LAYOUTS, M } from './hand-fixture.mjs';

const { createTableProps } = await loadProps();
const { createTableHands } = await loadHands();
const DT = 1 / 60, CONTACT = 0.03;
const SCN = {
  money: [['bid', 0, 1, 6, 80], ['bid', 1, 1, 4, 80], ['mark', 0, 1, 0, 120]],
  moneyE: [['bid', 3, 2, 6, 80], ['bid', 2, 2, 4, 80], ['mark', 3, 2, 0, 120]],
  moneyW: [['bid', 2, 0, 6, 80], ['bid', 0, 0, 4, 80], ['mark', 2, 0, 0, 120]],
  moneyN: [['bid', 1, 3, 6, 80], ['bid', 3, 3, 4, 80], ['mark', 1, 3, 0, 120]],
  queue: [['bid', 0, 0, 3, 0], ['bid', 0, 1, 5, 0], ['bid', 0, 2, 2, 260]],
  queueN: [['bid', 1, 0, 3, 0], ['bid', 1, 1, 5, 0], ['bid', 1, 2, 2, 260]],
};
/* 條件 3：界線外滑行上限（acceptance-c3.md 附註二，2026-10-07 使用者裁定）。規則同 c2＝min(逐幀必然值, feas 連續長度)＋0.05；
   例外一：c2 規則低於逐幀必然值（任何實作都不可能）的兩格改用逐幀必然值＋0.05——money 席1格1（slow=1）、queueN 席1格2（slow=1.5）；
   例外二：西席推格2（slow=1）＝0.342，釘住 v0.62.6 實測值（越過中線前最後兩幀，任何俯角／捲指／朝向的手都碰不到錢：最佳 gap 0.032／0.052；使用者接受為幾何上碰不到）。
   逐幀必然值：probe/bound.mjs；feas：review2/feas6.mjs。其餘段 ≤0.10。 */
const LIM3 = {
  1: { 'money:1:1': 0.831672, 'moneyE:2:2': 0.342, 'moneyN:1:3': 0.891403, 'queueN:1:0': 0.844254, 'queueN:1:1': 0.767860, 'queueN:1:2': 0.802027 },
  1.5: { 'money:1:1': 0.767860, 'moneyE:2:2': 0.316413, 'moneyN:1:3': 0.918962, 'queueN:1:0': 0.858332, 'queueN:1:1': 0.767641, 'queueN:1:2': 0.886349 },
};
/* 轉向限速（hand-motion HAND.PUSH_YAW.RATE＝1.6 弧度／秒，偏角量化 Q＝1°）：同一格推的連續兩幀，若中間沒有整窗搜尋跳轉，
   繞障偏角的變化 ≤ 1.6×Δt＋Q（兩幀手都畫出來才比；推開頭還沒上場的幀不算）。數值寫死在這裡（不讀模組常數），改 RATE 就會紅。 */
const YAW_RATE = 1.6, YAW_Q = 0.0175;
const v = new THREE.Vector3();
function meshOf(h) { let mesh = null; h.traverse((o) => { if (o.isSkinnedMesh && !mesh && o.visible) mesh = o; }); return mesh; }
function handGap(h, st) {
  if (!h.visible) return Infinity;
  const mesh = meshOf(h); if (!mesh) return Infinity;
  mesh.skeleton.update(); const n = mesh.geometry.attributes.position.count; let g = Infinity;
  for (let i = 0; i < n; i++) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); if (v.y > st.top + 0.03) continue; const d = Math.hypot(v.x - st.x, v.z - st.z) - st.r; if (d < g) g = d; }
  return g;
}
function lineGap(h, L) {
  if (!h.visible) return Infinity;
  const mesh = meshOf(h); if (!mesh) return Infinity;
  mesh.skeleton.update(); const n = mesh.geometry.attributes.position.count; let mx = -Infinity;
  for (let i = 0; i < n; i++) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); const d = L[0] * v.x + L[1] * v.z; if (d > mx) mx = d; }
  return L[2] - mx;
}
async function measure(slow) {
  globalThis.YS_ANIM_SLOW = slow === 1 ? undefined : { hand: slow, grab: 1 };
  const rows = [];
  try {
    for (const [name, script] of Object.entries(SCN)) {
      const parent = new THREE.Group();
      const props = createTableProps(parent, { handPaths: true });
      props.setLayout(...LAYOUTS.L);
      props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
      const hands = createTableHands(parent, props); await hands.ready(); parent.updateMatrixWorld(true);
      const T = M.HAND.TRAY.L, tz = props.trayZ(), RR = M.HAND.REACH, front = [0, -1, -(tz + T.hd - RR.SOUTH_IN)];
      const lines = (s) => (s === 0 ? [front] : s === 1 ? [[0, 1, tz - T.hd + RR.NORTH_IN]] : s === 2 ? [[1, 0, -RR.MID], front] : [[-1, 0, -RR.MID], front]);
      const open = {};
      const close = (seat) => { if (open[seat]) { rows.push(open[seat]); delete open[seat]; } };
      for (const [kind, a, b, c, n] of script) {
        if (kind === 'bid') { props.bid(a, b, c); hands.bid(a, b, c); }
        if (kind === 'mark') { props.mark(a, b); hands.mark(a, b); }
        for (let i = 0; i < n; i++) {
          props.update(DT); hands.update(DT); parent.updateMatrixWorld(true);
          const state = hands.stats().state;
          for (const h of hands.group.children) {
            const seat = +h.name.split('-')[1], s = state[seat];
            if (!s || s.kind !== 'push') { close(seat); continue; }
            if (open[seat] && open[seat].slot !== s.slot) close(seat);
            const st = props.stackAt(seat, s.slot); if (!st) continue;
            const g = open[seat] || (open[seat] = { key: `${name}:${seat}:${s.slot}`, slot: s.slot, moved: 0, mIn: 0, cIn: 0, run: 0, runOut: 0, runIn: 0, runOutIn: 0, lg: -Infinity, pmIn: 0, pinIn: 0, prev: null, hprev: null, yawPrev: null, yawWorst: 0, yawWorstAt: null, jumps: 0 });
            if (h.visible && g.yawPrev && g.yawPrev.vis && s.scanJumps === g.yawPrev.j && s.t > g.yawPrev.t) { const ex = Math.abs(s.yawOff - g.yawPrev.o) - (YAW_RATE * (s.t - g.yawPrev.t) + YAW_Q); if (ex > g.yawWorst) { g.yawWorst = ex; g.yawWorstAt = s.t; } }
            g.yawPrev = { o: s.yawOff, t: s.t, j: s.scanJumps, vis: h.visible }; g.jumps = s.scanJumps;
            const gap = handGap(h, st), hp = h.getWorldPosition(new THREE.Vector3());
            if (g.prev && !st.returning) {
              const d = Math.hypot(st.x - g.prev[0], st.z - g.prev[1]);
              if (d > 1e-5) {
                g.moved += d;
                if (gap <= CONTACT) g.run = 0; else { g.run += d; g.runOut = Math.max(g.runOut, g.run); }
                let lb = -Infinity, Lb = null; for (const L of lines(seat)) { const q = L[0] * st.x + L[1] * st.z - L[2]; if (q > lb) { lb = q; Lb = L; } } lb -= st.r;
                if (lb <= CONTACT) {
                  g.mIn += d; if (gap <= CONTACT) { g.cIn += d; g.runIn = 0; } else { g.runIn += d; g.runOutIn = Math.max(g.runOutIn, g.runIn); }
                  if (g.hprev) { g.pmIn += d; if (!h.visible || Math.hypot(hp.x - g.hprev[0], hp.z - g.hprev[1]) < 0.2 * d) g.pinIn += d; }
                } else g.lg = Math.max(g.lg, lineGap(h, Lb));
              }
            }
            g.prev = [st.x, st.z]; g.hprev = [hp.x, hp.z];
          }
        }
      }
      for (const k in open) close(+k);
      hands.dispose();
    }
  } finally { globalThis.YS_ANIM_SLOW = undefined; }
  return rows.filter((r) => r.moved >= 1e-4);
}
const R = { 1: await measure(1), 1.5: await measure(1.5) };
const fmt = (r) => `${r.key} cf_in=${(r.mIn ? r.cIn / r.mIn : 1).toFixed(3)} runIn=${r.runOutIn.toFixed(3)} runOut=${r.runOut.toFixed(3)}`;

for (const slow of [1, 1.5]) {
  const rows = R[slow];
  test(`擺錢推（slow=${slow}）條件 1：界線內手貼著錢——合計 contactFrac_in ≥0.80、每段 ≥0.85、每段 runOut_in ≤0.10`, () => {
    assert.ok(rows.length >= 14, `六劇本 14 段推都量到（實際 ${rows.length}）`);
    const MI = rows.reduce((a, r) => a + r.mIn, 0), CI = rows.reduce((a, r) => a + r.cIn, 0);
    assert.ok(CI / MI >= 0.80, `合計 contactFrac_in ${(CI / MI).toFixed(3)} < 0.80`);
    for (const r of rows) {
      assert.ok((r.mIn ? r.cIn / r.mIn : 1) >= 0.85, `每段 ≥0.85：${fmt(r)}`);
      assert.ok(r.runOutIn <= 0.10, `每段 runOut_in ≤0.10：${fmt(r)}`);
    }
  });
  test(`擺錢推（slow=${slow}）條件 2：錢柱出了手搆得到的範圍後，手停在伸入界線上（lineGap ≤0.05，不提早停、不消失）`, () => {
    const out = rows.filter((r) => r.lg > -Infinity);
    assert.ok(out.length >= 6, `北席四段與西席跨中線一段都有界線外幀（實際 ${out.length} 段）`);
    for (const r of out) assert.ok(r.lg <= 0.05, `${r.key} lineGap ${r.lg.toFixed(3)} > 0.05`);
  });
  test(`擺錢推（slow=${slow}）條件 4：界線內「錢在動、手幾乎不動」的位移比例 pinFrac_in ≤0.20`, () => {
    const PM = rows.reduce((a, r) => a + r.pmIn, 0), PI = rows.reduce((a, r) => a + r.pinIn, 0);
    assert.ok(PM > 1, `量到界線內位移 ${PM.toFixed(3)}`);
    assert.ok(PI / PM <= 0.20, `pinFrac_in ${(PI / PM).toFixed(3)} > 0.20`);
  });
  test(`擺錢推（slow=${slow}）條件 3：界線外滑行 ≤ 上限表（c2 規則；兩格不可能例外；西席格2 slow=1 釘住 0.342）、其餘段 ≤0.10`, () => {
    for (const r of rows) {
      const lim = LIM3[slow][r.key] ?? 0.10;
      assert.ok(r.runOut <= lim + 1e-9, `${r.key} runOut ${r.runOut.toFixed(6)} > ${lim}（${fmt(r)}）`);
    }
  });
  test(`擺錢推（slow=${slow}）轉向限速：同一格連續兩幀（中間沒有整窗跳轉）繞障偏角變化 ≤ 1.6×Δt＋1°；整窗跳轉每段 ≤4 次（v0.62.6 現況最多 4，防退化）`, () => {
    for (const r of rows) {
      assert.ok(r.yawWorst <= 1e-9, `${r.key} 偏角變化超出限速 ${r.yawWorst.toFixed(4)} 弧度（t=${r.yawWorstAt}）`);
      assert.ok(r.jumps <= 4, `${r.key} 整窗跳轉 ${r.jumps} 次 > 4`);
    }
  });
}

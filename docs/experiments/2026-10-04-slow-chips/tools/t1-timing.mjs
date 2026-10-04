/* 條件 1／2a：擺錢時序（node 固定步長 1/120 s；真的 table-props＋table-hands，handPaths 開）。
   跑法：node t1-timing.mjs --root=<樹> [--out=x.json]
   量：①每席單格推出的「第一格落定」②每席兩格同一幀推出的第二格落定（對公式 FLY_MS+QUEUE_GAP+QUEUE_FLY）
       ③最壞合法情境（四席各 MAX_BIDS 格、每格 6 枚）的 tL＝所有錢 t=1 與四隻手全回閒置的最晚時刻
   判定：以「新規格」套在這棵樹上印 PASS／FAIL（基準樹套新規格必須 FAIL），另印「舊規格」判定供對照。 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)=(.*)$/); if (m) opt[m[1]] = m[2]; }
const root = path.resolve(opt.root || process.cwd());
const F = await import(pathToFileURL(root + '/tests/hand-fixture.mjs').href);
const { THREE, LAYOUTS } = F;
const { createTableProps } = await F.loadProps(); const { createTableHands } = await F.loadHands();
const html = fs.readFileSync(root + '/index.html', 'utf8');
const MAX_BIDS = +html.match(/MAX_BIDS:\s*(\d+)/)[1], SETTLE = +html.match(/CHIP_SETTLE_MS:\s*(\d+)/)[1];
const DT = 1 / 120;

async function rig() {
  const parent = new THREE.Group();
  const props = createTableProps(parent, { handPaths: true });
  props.setLayout(...LAYOUTS.L);
  props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
  const hands = createTableHands(parent, props); await hands.ready();
  return { props, hands, parent };
}
/* plan: [[seat, slot], ...] 同一幀依序出價；回傳每格落定時刻、每席手回閒置時刻、全部錢落定時刻 */
async function run(plan, amount = 6, pre = null) {
  const r = await rig();
  /* pre＝先推的一批（模擬 solo 封籤時真人那幾筆，約 10ms 後開標又整批重推：index.html reveal.forEach(pushBid3d)），其後才推 plan。 */
  if (pre) { for (const [s, k, a] of pre) { r.props.bid(s, k, a); r.hands.bid(s, k, a); } r.props.update(DT); r.hands.update(DT); }
  for (const [s, k] of plan) { r.props.bid(s, k, amount); r.hands.bid(s, k, amount); }
  const land = {}, handIdle = {}; let allLanded = null, allIdle = null, t = pre ? DT : 0;
  const seats = [...new Set(plan.map((p) => p[0]))];
  for (let i = 0; i < 1200; i++) {
    r.props.update(DT); r.hands.update(DT); t += DT;
    for (const [s, k] of plan) { const st = r.props.stackAt(s, k); if (land[s + ':' + k] === undefined && (!st || st.t >= 1)) land[s + ':' + k] = +t.toFixed(4); }
    if (allLanded === null && Object.keys(land).length === plan.length) allLanded = +t.toFixed(4);
    const state = r.hands.stats().state;
    for (const s of seats) if (allLanded !== null && handIdle[s] === undefined && state[s] === null) handIdle[s] = +t.toFixed(4);
    if (allLanded !== null && Object.keys(handIdle).length === seats.length) { allIdle = Math.max(...Object.values(handIdle)); break; }
  }
  r.hands.dispose(); r.props.dispose();
  return { land, handIdle, allLanded, allIdle };
}
const out = { root, MAX_BIDS, CHIP_SETTLE_MS: SETTLE, DT, single: [], double: [], worst: null };
let consts = null;
{ const P = await F.loadProps(); const c = (P.PROPS || P.default || {}).CHIP; consts = c ? { FLY_MS: c.FLY_MS, QUEUE_FLY: c.QUEUE_FLY, QUEUE_GAP: c.QUEUE_GAP } : null; }
out.consts = consts;
for (let s = 0; s < 4; s++) { const r = await run([[s, 0]]); out.single.push({ seat: s, first: r.land[s + ':0'], handIdle: r.handIdle[s] }); }
for (let s = 0; s < 4; s++) { const r = await run([[s, 0], [s, 1]]); out.double.push({ seat: s, first: r.land[s + ':0'], second: r.land[s + ':1'], handIdle: r.handIdle[s] }); }
{
  const plan = []; for (let s = 0; s < 4; s++) for (let j = 0; j < MAX_BIDS; j++) plan.push([s, (s + j) % 4]);
  const r = await run(plan); out.worst = { plan, allLanded: r.allLanded, allIdle: r.allIdle, tL: Math.max(r.allLanded, r.allIdle), land: r.land, handIdle: r.handIdle };
}
/* 真實流程情境（條件 2a 修訂 1，加嚴）：solo 封籤時真人 MAX_BIDS 筆先推（其餘格 0＝清），約 1 步後開標依「拍品序、同拍品依席序」整批重推（含真人那幾筆，重推會覆寫並重新排隊）。
   枚舉：真人格對＝C(4,2)=6 種 × AI 格對型態（A：(s,(s+1)%4)；B：(s,(s+2)%4)）＝12 次；另有「校準」＝實測 solo seed 1 的真實呼叫序列。 */
const pairs = []; for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) pairs.push([a, b]);
out.real = [];
for (const hp of pairs) for (const mode of ['A', 'B']) {
  const entries = hp.map((k) => [0, k]);
  for (let s = 1; s < 4; s++) for (let j = 0; j < MAX_BIDS; j++) entries.push([s, (s + (mode === 'A' ? j : 2 * j)) % 4]);
  const plan = entries.slice().sort((x, y) => x[1] - y[1] || x[0] - y[0]);
  const pre = hp.map((k) => [0, k, 6]);
  const r = await run(plan, 6, pre); out.real.push({ human: hp, mode, tL: Math.max(r.allLanded, r.allIdle) });
}
{ /* 校準：實測 solo seed 1：真人 slot 0、2；AI seat1 slot 2、3；seat3 slot 3（金額略，不影響時序） */
  const pre = [[0, 0, 1], [0, 2, 1]]; const plan = [[0, 0], [0, 2], [1, 2], [1, 3], [3, 3]]; const r = await run(plan, 6, pre); out.calib = { tL: Math.max(r.allLanded, r.allIdle), handIdle: r.handIdle };
}
out.worstReal = Math.max(...out.real.map((x) => x.tL));
const near = (a, b, tol) => Math.abs(a - b) <= tol + 1e-9;
const formula = consts ? consts.FLY_MS + consts.QUEUE_GAP + consts.QUEUE_FLY : null;
const chk = (first) => out.single.every((x) => near(x.first, first, 0.05));
const res = {
  新規格_第一格0_70: chk(0.70), 舊規格_第一格0_42: chk(0.42),
  第二格_公式值: formula, 第二格_實測: out.double.map((x) => x.second), 第二格符公式: formula !== null && out.double.every((x) => near(x.second, formula, 0.02)),
  tL同幀情境: out.worst.tL, tL真實流程最壞: out.worstReal, 校準_實測2_58: out.calib.tL, tL: Math.max(out.worst.tL, out.worstReal), 最低CHIP_SETTLE_MS: Math.ceil((Math.max(out.worst.tL, out.worstReal) * 1000 + 1000) / 100) * 100, CHIP_SETTLE_MS: SETTLE,
  條件2a: SETTLE >= Math.max(out.worst.tL, out.worstReal) * 1000 + 1000 && SETTLE % 100 === 0,
};
out.result = res;
console.log(JSON.stringify(out, null, 1));
console.log('條件1（新規格）:', res.新規格_第一格0_70 && res.第二格符公式 ? 'PASS' : 'FAIL', '| 舊規格 0.42±0.05:', res.舊規格_第一格0_42 ? 'match' : 'no');
console.log('條件2a:', res.條件2a ? 'PASS' : 'FAIL', `(tL=${res.tL}s → 至少 ${res.最低CHIP_SETTLE_MS}ms，現值 ${SETTLE})`);
if (opt.out) fs.writeFileSync(path.resolve(opt.out), JSON.stringify(out, null, 1));

/* 條件 3：手的放慢與手錢同步（node 固定步長 1/120 s，真的 table-props＋table-hands＋hand-motion，版面 L）。
   跑法：node t3-hand.mjs --root=<樹> --out=x.json     比較：node t3-check.mjs base.json new.json
   a 數據：每席單格／兩格的「伸出→到達」（bid 到手 state 轉 retract）與「總時長」（bid 到 state 回 null）
   b 數據：每席 × 四組格對 × 每格的「手到達」−「錢落定」（定義見 acceptance.md 條件 3b）
   c 數據：每席揭盅（勝方停一拍／敗方扒回）從 reveal 呼叫到手回 null 的時間 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)=(.*)$/); if (m) opt[m[1]] = m[2]; }
const root = path.resolve(opt.root || process.cwd());
const F = await import(pathToFileURL(root + '/tests/hand-fixture.mjs').href);
const { THREE, LAYOUTS, M } = F;
const { createTableProps } = await F.loadProps(); const { createTableHands } = await F.loadHands();
const DT = 1 / 120, PUSH_GAP = M.HAND.PUSH_GAP, EXTRA = 0.02;
async function rig() {
  const parent = new THREE.Group();
  const props = createTableProps(parent, { handPaths: true });
  props.setLayout(...LAYOUTS.L);
  props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
  const hands = createTableHands(parent, props); await hands.ready();
  return { props, hands, parent };
}
const v = new THREE.Vector3();
function minDist(r, seat, tx, tz) {
  const h = r.hands.group.children[seat]; if (!h || !h.visible) return Infinity;
  let mesh; h.traverse((o) => { if (o.isSkinnedMesh) mesh = o; }); if (!mesh) return Infinity;
  r.parent.updateMatrixWorld(true); mesh.skeleton.update();
  const P = mesh.geometry.attributes.position; let d = Infinity;
  for (let i = 0; i < P.count; i += 3) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); d = Math.min(d, Math.hypot(v.x - tx, v.z - tz)); }
  return d;
}
const out = { root, DT, a: { single: [], double: [] }, b: [], c: [] };
/* a：單格／兩格 */
for (const n of [1, 2]) for (let s = 0; s < 4; s++) {
  const r = await rig(); for (let k = 0; k < n; k++) { r.props.bid(s, k, 6); r.hands.bid(s, k, 6); }
  let t = 0, pushEnd = null, idle = null, landed = null;
  for (let i = 0; i < 1200; i++) {
    r.props.update(DT); r.hands.update(DT); t += DT;
    const st = r.hands.stats().state[s];
    if (pushEnd === null && st && st.kind === 'retract') pushEnd = +t.toFixed(4);
    if (idle === null && st === null) { idle = +t.toFixed(4); break; }
  }
  (n === 1 ? out.a.single : out.a.double).push({ seat: s, pushEnd, handTotal: idle });
  r.hands.dispose(); r.props.dispose();
}
/* b：到達差 */
for (let s = 0; s < 4; s++) for (const pair of [[0], [1], [2], [3], [0, 1], [2, 3], [1, 2], [0, 3], [0, 2], [1, 3]]) { // 基準首跑只有 10 個有效樣本（<12），在看到新版數字前擴成 4 單格＋6 對
  const r = await rig(); for (const k of pair) { r.props.bid(s, k, 6); r.hands.bid(s, k, 6); }
  const land = {}, arrive = {}, thr = {}, fly = {}, trace = {}; let t = 0;
  for (let i = 0; i < 1200; i++) {
    r.props.update(DT); r.hands.update(DT); t += DT;
    for (const k of pair) {
      const st = r.props.stackAt(s, k); if (!st) continue; fly[k] = st.fly;
      if (land[k] === undefined && st.t >= 1) land[k] = +t.toFixed(4);
      /* 該格的手到達：只在輪到這一格推的期間算（手 state 的 slot＝k） */
      const hs = r.hands.stats().state[s];
      if (hs && hs.kind === 'push' && hs.slot === k) { const dd = minDist(r, s, st.tx, st.tz); (trace[k] = trace[k] || []).push([t, dd]); if (arrive[k] === undefined) { thr[k] = st.r + PUSH_GAP + EXTRA; if (dd <= thr[k]) arrive[k] = +t.toFixed(4); } }
    }
    if (r.hands.stats().state[s] === null && Object.keys(land).length === pair.length) break;
  }
  /* 補強口徑（歸一化，不用絕對距離門檻）：手「到位」＝該格推的期間，手尖距終點第一次進到「這一段自己的最近距離＋0.02」內的時刻；比例同樣除以該格飛行時長 */
  const alt = {}; for (const k of pair) { const tr = trace[k]; if (tr && tr.length) { const mn = Math.min(...tr.map((x) => x[1])); const hit = tr.find((x) => x[1] <= mn + 0.02); alt[k] = { arrive2: +hit[0].toFixed(4), minDist: +mn.toFixed(4) }; } }
  for (const k of pair) out.b.push({ seat: s, pair: pair.join(''), slot: k, fly: fly[k] ?? null, land: land[k] ?? null, arrive: arrive[k] ?? null, delta: land[k] != null && arrive[k] != null ? +(arrive[k] - land[k]).toFixed(4) : null, ratio: land[k] != null && arrive[k] != null && fly[k] ? +((arrive[k] - land[k]) / fly[k]).toFixed(4) : null, minDist: alt[k] ? alt[k].minDist : null, ratio2: alt[k] && land[k] != null && fly[k] ? +((alt[k].arrive2 - land[k]) / fly[k]).toFixed(4) : null });
  r.hands.dispose(); r.props.dispose();
}
/* c：揭盅手時長（單格推完等手閒置後 reveal；seat 贏＝hold，別席贏＝rake） */
for (let s = 0; s < 4; s++) for (const win of [true, false]) {
  const r = await rig(); const k = s;
  r.props.bid(s, k, 6); r.hands.bid(s, k, 6);
  for (let i = 0; i < 1200; i++) { r.props.update(DT); r.hands.update(DT); if (r.hands.stats().state[s] === null) break; }
  const w = win ? s : (s + 1) % 4; r.props.reveal(k, w); r.hands.reveal(k, w);
  let t = 0, idle = null;
  for (let i = 0; i < 1200; i++) { r.props.update(DT); r.hands.update(DT); t += DT; if (r.hands.stats().state[s] === null) { idle = +t.toFixed(4); break; } }
  out.c.push({ seat: s, role: win ? 'hold' : 'rake', handTotal: idle });
  r.hands.dispose(); r.props.dispose();
}
if (opt.out) fs.writeFileSync(path.resolve(opt.out), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ a: out.a, c: out.c, bValid: out.b.filter((x) => x.delta !== null).length, bNull: out.b.filter((x) => x.delta === null).length, bDeltas: out.b.map((x) => x.delta) }));

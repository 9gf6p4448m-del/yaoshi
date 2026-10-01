/* 席位之手 突變驗紅（凍結 #B1、#C1–#C6 的 node 部分）：把被測的 js 檔複製到系統暫存目錄、只改一處，
   用 YAOSHI_MOTION_PATH／YAOSHI_PROPS_PATH／YAOSHI_HANDS_PATH 指向突變體跑 tests/table-hands.test.mjs，
   記下「紅在哪一條」。原檔全程唯讀、不做反向 sed（還原＝刪掉暫存突變體）；最後再跑一次無突變的基準必須全綠。
   跑法：node tests/tools/hands-mutants.mjs [out.json] */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.argv[2] || '';
const FILES = { motion: ['js/hand-motion.js', 'YAOSHI_MOTION_PATH'], props: ['js/table-props.js', 'YAOSHI_PROPS_PATH'], hands: ['js/table-hands.js', 'YAOSHI_HANDS_PATH'] };
const MUTANTS = [
  { id: 'B1-perHandUrl', frozen: '#B1', file: 'hands', what: '四隻手各自帶不同查詢字串向管線要 GLB（快取失效、抓四次）',
    from: 'Promise.all([0, 1, 2, 3].map(() => cloneSkinnedGlb(url)))', to: 'Promise.all([0, 1, 2, 3].map((k) => cloneSkinnedGlb(url + "?h=" + k)))', expect: /#B1/ },
  { id: 'B1-matPerHand', frozen: '#B1', file: 'hands', what: '每隻手各自複製一份材質（多出 3 支 program／uniform）',
    from: '      mesh.material = material; mesh.geometry = dressedGeo;', to: '      mesh.material = material.clone(); mesh.geometry = dressedGeo;', expect: /#B1/ },
  { id: 'C1-floorIgnoresProps', frozen: '#C1', file: 'motion', what: '地板只看桌面、忽略錢柱與令牌（回到原型「掌下貼錢柱頂」以外全不管）',
    from: '  let f = tableY;\n  for (const o of obstacles) {', to: '  let f = tableY;\n  for (const o of []) {', expect: /#C1\/#C2 L：推|#C1\/#C2 L：拍|#C1\/#C2 P：推|#C1\/#C2 P：拍/ },
  { id: 'C1-noTilt', frozen: '#C1', file: 'props', what: '錢柱頂高不計錢的傾斜（躺平錢緣比面心高 R·sin(tilt)）',
    from: 'CH.T / 2 + CH.R * Math.abs(Math.sin(c.tilt || 0))', to: 'CH.T / 2', expect: /#C1 手的地板外框/ },
  { id: 'C1-noPulse', frozen: '#C1', file: 'props', what: '錢柱外框不計得標脈衝的放大（實頁探針抓到的第二個真因，回退）',
    from: 'const k = 1 + (c.winnerPulse || 0) * 0.24;', to: 'const k = 1;', expect: /#C1 收：勝方錢柱得標脈衝|#C1 手的地板外框/ },
  { id: 'C1-noThickR', frozen: '#C1', file: 'props', what: '錢柱外框半徑不計錢厚（傾斜錢緣突出 R 之外，新測試抓到）',
    from: 'r: r + (CH.R + CH.T / 2) * rk,', to: 'r: r + CH.R * rk,', expect: /#C1 手的地板外框/ },
  { id: 'R2-cuffBlack', frozen: '第二輪袖子', file: 'motion', what: '袖口邊改成近黑（成團黑塊）',
    from: '    CUFF: [0.130, 0.045, 0.030],', to: '    CUFF: [0.010, 0.010, 0.012],', expect: /第二輪袖子/ },
  { id: 'R2-noDress', frozen: '第二輪袖子', file: 'motion', what: '袖子完全不重新上色（GLB 原色＋不漸隱：整段黑袖）',
    from: '    out[v * 4] = r; out[v * 4 + 1] = g; out[v * 4 + 2] = b; out[v * 4 + 3] = a;', to: '    out[v * 4] = colors[v * itemSize]; out[v * 4 + 1] = colors[v * itemSize + 1]; out[v * 4 + 2] = colors[v * itemSize + 2]; out[v * 4 + 3] = 1;', expect: /第二輪袖子/ },
  { id: 'R2-noFade', frozen: '第二輪袖子', file: 'motion', what: '袖布不漸隱（alpha 恆為 1）',
    from: '      a = 1 - smooth(t);', to: '      a = 1;', expect: /第二輪袖子/ },
  { id: 'R2-scaleBack', frozen: '第二輪縮放', file: 'motion', what: '縮放回 0.35',
    from: '  SCALE: 0.335,', to: '  SCALE: 0.35,', expect: /第二輪縮放/ },
  { id: 'R2-northUnlimited', frozen: '第二輪伸入深度', file: 'motion', what: '北席不限伸入深度',
    from: "    if (seat === 1) return [{ n: [0, 1], c: tz - T.hd + HAND.REACH.NORTH_IN }];", to: '    if (seat === 1) return [];', expect: /第二輪伸入深度/ },
  { id: 'R2-sideNoFront', frozen: '第二輪伸入深度', file: 'motion', what: '西／東不限托盤前緣',
    from: "    if (seat === 2) return [{ n: [1, 0], c: -HAND.REACH.MID }, front];", to: "    if (seat === 2) return [{ n: [1, 0], c: -HAND.REACH.MID }];", expect: /第二輪伸入深度/ },
  { id: 'R2-slamDuringFlight', frozen: '第二輪拍', file: 'motion', what: '拍的手在令牌飛行中就上場',
    from: '      if (!landed) return { hidden: true };', to: '', expect: /第二輪拍/ },
  { id: 'R3-relicNoAvoid', frozen: '第三輪信物', file: 'motion', what: '不避讓信物',
    from: '        const relics = props.relicObstacles ? props.relicObstacles() : [];', to: '        const relics = [];', expect: /第三輪信物/ },
  { id: 'R3-relicTinyR', frozen: '第三輪信物', file: 'props', what: '信物外接圓只算一半半徑（外框蓋不住真實幾何）',
    from: 'out.push({ seat: r.seat, x, z, r: rad, top: top + 0.03 });', to: 'out.push({ seat: r.seat, x, z, r: rad * 0.5, top: top + 0.03 });', expect: /第三輪信物/ },
  { id: 'R3-backToDither', frozen: '第三輪袖尾', file: 'hands', what: '袖尾回到 alphaHash 抖色',
    from: '        material.transparent = true;', to: '        material.alphaHash = true;', expect: /第三輪袖尾/ },
  { id: 'R4-queueOff', frozen: '第四輪排隊', file: 'props', what: '排隊改回同時起步（不延遲、原速）',
    from: 'if (busy > 0) { qDelay = busy + CH.QUEUE_GAP; qFly = CH.QUEUE_FLY; }', to: 'if (false) { qDelay = busy + CH.QUEUE_GAP; qFly = CH.QUEUE_FLY; }', expect: /第四輪排隊時序/ },
  { id: 'R4-gapZero', frozen: '第四輪排隊', file: 'props', what: '格與格間隔＝0',
    from: '    QUEUE_GAP: 0.06,', to: '    QUEUE_GAP: 0,', expect: /第四輪排隊時序/ },
  { id: 'R4-noReacquire', frozen: '第四輪排隊', file: 'motion', what: '第二格起不重新抓這一格的位置（手留在上一格）',
    from: "      start(h.seat, { kind: 'push', slot: k, tx: st.tx, tz: st.tz, from, rep: Math.max(st.wait, 1e-3) });", to: "      start(h.seat, { kind: 'push', slot: h.act ? h.act.slot : k, tx: st.tx, tz: st.tz, from, rep: Math.max(st.wait, 1e-3) });", expect: /第四輪排隊/ },
  { id: 'C1-idleVisible', frozen: '#C1', file: 'motion', what: '收手做完不歸零（閒置時手留在畫面上）',
    from: "if (a.kind === 'retract' && a.t >= HAND.RETRACT_MS) { stop(h.seat); return null; }", to: "if (a.kind === 'retract' && a.t >= HAND.RETRACT_MS) { return h.last.frame; }", expect: /#C1 收手後/ },
  { id: 'C2-ignoreP', frozen: '#C2', file: 'hands', what: '直式不換算縮放（兩版面同尺寸）',
    from: "const s = HAND.SCALE * (props.mode() === 'P' ? HAND.SCALE_P : 1);", to: 'const s = HAND.SCALE;', expect: /#C2 直式/ },
  { id: 'C3-finishNoop', frozen: '#C3', file: 'props', what: '跳過時錢與令牌不快轉（props.finish 變成空操作）',
    from: 'finish() { for (let i = 0; i < 4; i++) api.update(1e3); },', to: 'finish() {},', expect: /#C3 跳過/ },
  { id: 'C3-handsMoveMoneyEnd', frozen: '#C3', file: 'props', what: '手推的錢終點偏一點（「錢終點不變」被打破）',
    from: "from: handPaths ? [to[0] + fx - cx, to[1], to[2] + fz - cz] : [fx, trayY + CH.T / 2, fz], to,", to: "from: handPaths ? [to[0] + fx - cx, to[1], to[2] + fz - cz] : [fx, trayY + CH.T / 2, fz], to: handPaths ? [to[0] + 0.01, to[1], to[2]] : to,", expect: /#C3 縮時/ },
  { id: 'C4-random', frozen: '#C4', file: 'motion', what: '擺位加一點 Math.random 抖動',
    from: '  return { root: r.root, yaw: spec.yaw, pitch, quats: pr.quats, pose: pose.slice() };', to: '  r.root[1] += Math.random() * 1e-4;\n  return { root: r.root, yaw: spec.yaw, pitch, quats: pr.quats, pose: pose.slice() };', expect: /#C4/ },
  { id: 'C5-zeroIgnored', frozen: '#C5', file: 'motion', what: '出價歸零（熱座清場）不收手',
    from: 'if (!((amount | 0) > 0)) { const a = h.act; if (a && a.slot === k) { stop(s); nextQueued(h, null); } return; }', to: 'if (!((amount | 0) > 0)) { return; }', expect: /#C5/ },
  { id: 'C5-stackHands', frozen: '#C5', file: 'hands', what: '每次出價多掛一隻手（疊手）',
    from: 'bid(seat, slot, amount) { if (director) director.bid(seat, slot, amount); },', to: 'bid(seat, slot, amount) { if (director) { director.bid(seat, slot, amount); const h = hands[seat | 0]; if (h) group.add(h.holder.clone()); } },', expect: /#C5/ },
  { id: 'C6-handEmitsSlam', frozen: '#C6', file: 'hands', what: '手自己猜落地時間派 ys:mark-slam',
    from: 'mark(seat, slot) { if (director) director.mark(seat, slot); },', to: "mark(seat, slot) { if (director) director.mark(seat, slot); document.dispatchEvent(new CustomEvent('ys:mark-slam', { detail: { slot } })); },", expect: /#C6/ },
];
const run = (env) => {
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', 'tests/table-hands.test.mjs'], { cwd: ROOT, env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || '');
  const failed = [...new Set([...out.matchAll(/^✖ (.+?) \(\d/mg)].map((x) => x[1]).filter((t) => !/^tests[\\/]/.test(t) && t !== 'failing tests:'))];
  const pass = Number((out.match(/ℹ pass (\d+)/) || [])[1]), fail = Number((out.match(/ℹ fail (\d+)/) || [])[1]);
  return { status: r.status, failed, pass, fail, msgs: [...out.matchAll(/AssertionError \[ERR_ASSERTION\]: (.+)/g)].map((x) => x[1].slice(0, 160)).slice(0, 3) };
};
const results = [];
for (const m of MUTANTS) {
  const [rel, envName] = FILES[m.file];
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const from = m.from.replace(/\n/g, eol), to = m.to.replace(/\n/g, eol);
  const n = src.split(from).length - 1;
  if (n !== 1) { results.push({ id: m.id, frozen: m.frozen, error: `錨點出現 ${n} 次（程式碼變了，要更新突變定義）` }); continue; }
  const tmp = path.join(os.tmpdir(), `hands-mutant-${m.id}-${process.pid}${path.extname(rel)}`);
  fs.writeFileSync(tmp, src.replace(from, to), 'utf8');
  try {
    const r = run({ [envName]: tmp });
    const red = r.failed.some((t) => m.expect.test(t));
    results.push({ id: m.id, frozen: m.frozen, what: m.what, red, failed: r.failed, pass: r.pass, fail: r.fail, msgs: r.msgs });
  } finally { fs.rmSync(tmp, { force: true }); }
}
const base = run({});
const summary = { mutants: results.length, allRed: results.every((x) => x.red), baseline: { pass: base.pass, fail: base.fail, failed: base.failed } };
const out = { summary, results };
if (OUT) fs.writeFileSync(path.resolve(ROOT, OUT), JSON.stringify(out, null, 1));
for (const x of results) console.log(`${x.red ? '紅 ✅' : '沒紅 ❌'} ${x.id}（${x.frozen}）${x.error || ''} → ${(x.failed || []).join(' | ')}`);
console.log(JSON.stringify(summary));
process.exit(summary.allRed && base.fail === 0 && base.pass > 0 ? 0 : 1);

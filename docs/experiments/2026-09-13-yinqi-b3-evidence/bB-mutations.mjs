// 陰氣批**階段 B**（其餘 8 支）的鑑別力突變（2026-09-13）。
//
// ★為什麼要這一支★（`02 §6.1` 第 1 條）：本階段做的每一件事——8 支的施招姿態／腳下語彙／
// 主道具與落點／逐尊覆蓋／回流方向，以及新的收斂（`st.sep`、`yqDeliver` 的衝擊拍決定）——
// 全部是「加上去之後閘門是綠的」。綠燈沒有證明力，要證明的是**把它改壞、那個閘門會變紅**，
// 而且**還原之後會變回綠**（反面也要驗）。
//
// 紀律（沿用階段 A `b3-mutations.mjs` 與祖靈批 `anchor-mutations.mjs` 踩過的坑）：
//   ① **字串配不到就整支中止**——`String.replace` 靜默沒配到，整批會變成「全綠」的儀式；
//   ② **還原用改壞前的自取備份**（`scratchpad/_bBbak-*`），不做反向 sed；
//   ③ 每一條都跑健康態 → 改壞 → 還原三次，健康綠＋突變紅＋還原綠才算數。
//
// 用法：node docs/experiments/2026-09-13-yinqi-b3-evidence/bB-mutations.mjs [--only=B1,B5]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const YQ = path.join(ROOT, 'js/trait-fx/yinqi.js');
const VOCAB = path.join(ROOT, 'js/trait-fx/vocab.js');
const FX = path.join(ROOT, 'js/trait-fx.js');

/** 跑一個閘門，回傳 'GREEN'／'RED'。`gate` 形如 `P1` 或 `drive:<trId>` 或 `mate:<trId>`。 */
function gate(kind, port) {
  try {
    if (kind === 'P1') { execFileSync(process.execPath, ['tests/fxvocab.test.mjs'], { cwd: ROOT, stdio: 'pipe' }); return 'GREEN'; }
    const [mode, trId] = kind.split(':');
    const args = ['tests/tools/traitfx-drive.mjs', `scratchpad/_muB${port}.json`, '--tier=2', `--only=${trId}`, `--port=${port}`];
    if (mode === 'mate') args.push('--mate=auto', '--mategap=1.9');
    const out = execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' }).toString();
    if (!/^PASS /m.test(out)) return 'RED';
    return 'GREEN';
  } catch (e) { return 'RED'; }
}

const MUT = [
  /* ── 逐支：每一支至少一條，打在**這一支自己的實作**上 ── */
  { id: 'B1', gate: 'drive:hauntSteal', why: 'hauntSteal 的簪不標 main（主道具消失，落點證據被副件墊高）', file: YQ,
    from: "    const pin = st.paperStamp(st.kind, from, { anchor: 'foe', main: true, role: 'stamp',",
    to: "    const pin = st.paperStamp(st.kind, from, { anchor: 'foe', role: 'stamp'," },
  { id: 'B2', gate: 'drive:hauntSteal', why: 'hauntSteal 的命火往我方飄（打擊類衝擊拍後回流＝§A9-6）', file: YQ,
    from: '        st.stageVec(s.s * (0.6 + k), s.up * k, s.fz * k, it.p);',
    to: '        st.stageVec(s.s * (0.6 + k), s.up * k, -s.fz * k, it.p);' },
  { id: 'B3', gate: 'drive:hauntSee', why: 'hauntSee 的竹椅宣告落在敵方（實際坐在同伴身上）', file: YQ,
    from: "    const chair = st.paperStamp(st.kind, from, { anchor: 'allies', main: true, role: 'stamp',",
    to: "    const chair = st.paperStamp(st.kind, from, { anchor: 'foes', main: true, role: 'stamp'," },
  { id: 'B4', gate: 'P1', why: 'hauntSee 的編舞拿掉 st.stance（登記了施招姿態卻沒演）', file: YQ,
    from: "        st.stance(seer, '舉臂', k); // §A9：施招者專屬姿態", to: '        ' },
  { id: 'B5', gate: 'P1', why: 'hauntDread1 的編舞拿掉 st.groundMark（腳下語彙是身分訊號的另一半）', file: YQ,
    from: '    st.groundMark(coat, { r: 0.42, rot: 0.35, push: 0.16, peak: 0.66 });', to: '    ' },
  /* ★B6 是**照實留著的未驗紅**（不是防線漏掉，是這一格量到的不只受招方）★
     把 `hauntDread1` 受招方的等比縮整條拿掉，`drive` 仍是綠的——因為 `evalPhases` 的 react 段
     量的是「除了施招者以外**每一個** wrap」，而本招四尊雨衣**同伴**的閃現位移與收勢也在裡面
     （`js/trait-fx.js` 的 `evalPhases`：`sawOther` 為真時只排掉 `run.caster` 一個人）。
     ⇒ **多尊同型單位的招，react 這一格對「受招方有沒有反應」沒有鑑別力**。照實記，交裁。
     B6b 是同一支招真的有鑑別力的那一條。 */
  { id: 'B6', gate: 'drive:hauntDread1', why: '★已知未驗紅★ hauntDread1 的群體不縮（react 由我方同伴的位移滿足）', file: YQ,
    from: '      foes.forEach((f) => { st.scale(f, 1 - a); st.rim(f, 1 + 4.5 * a); });',
    to: '      foes.forEach((f) => { st.rim(f, 1 + 4.5 * a); });' },
  { id: 'B6b', gate: 'drive:hauntDread1', why: 'hauntDread1 的主滴宣告落在我方（實際落在敵方身上）', file: YQ,
    from: "    const drop = st.paperStamp(st.kind, from, { anchor: 'foes', main: true, role: 'stamp',",
    to: "    const drop = st.paperStamp(st.kind, from, { anchor: 'allies', main: true, role: 'stamp'," },
  { id: 'B7', gate: 'drive:hauntSwap', why: 'hauntSwap 在衝擊拍把繩藏起來（在場五條的第 4 條：有效 opacity）', file: YQ,
    from: "        st.burst(to, { power: 0.6, n: 28, color: C.hot });",
    to: "        st.burst(to, { power: 0.6, n: 28, color: C.hot }); st.alpha(rope, 0);" },
  { id: 'B8', gate: 'drive:eliteVsSwarm', why: 'eliteVsSwarm 的爪片原地生成、也不在衝擊拍到位（飛行整段沒了）', file: YQ,
    pairs: [['      mesh.position.lerpVectors(from, aim, JOLT[n]);', '      mesh.position.copy(from);'],
      ['      mesh.position.copy(to); // 第三階：一格到位，與衝擊拍同幀（不補間）', '      mesh.position.copy(from);']] },
  { id: 'B9', gate: 'drive:swarmPierce', why: 'swarmPierce 的銅錢穿出去改成往我方（§A9-6 的回流）', file: YQ,
    from: '        const thru = to.clone().addScaledVector(st.dir, 1.35);',
    to: '        const thru = to.clone().addScaledVector(st.dir, -1.35);' },
  { id: 'B10', gate: 'drive:hauntFearX2', why: 'hauntFearX2 的虛影片宣告落在自己身上（真值對象是敵方多個）', file: YQ,
    from: "    const shard = st.paperStamp(st.kind, from, { anchor: 'foes', main: true, role: 'stamp',",
    to: "    const shard = st.paperStamp(st.kind, from, { anchor: 'caster', main: true, role: 'stamp'," },
  { id: 'B11', gate: 'drive:swarmFeed1', why: 'swarmFeed1 的主甕不夾進甕口的佔地（停在對面＝mainOK 假）', file: YQ,
    from: '      st.bodySpot(urn, to);\n      to.lerp(lip0, 0.5);',
    to: '      to.copy(from);\n      if (0) to.lerp(lip0, 0.5);' },
  { id: 'B12', gate: 'P1', why: 'MOVE_SPEC 拿掉 swarmFeed1 的 anchor（已轉正的招沒宣告落點）', file: VOCAB,
    from: "  swarmFeed1: { prop: '丙', act: '吸', react: '被拖', stance: '下沉', anchor: 'allies' },",
    to: "  swarmFeed1: { prop: '丙', act: '吸', react: '被拖', stance: '下沉' }," },
  /* ── 兩件收斂本身（批末抓到的那兩個「兩份判準」的坑） ── */
  { id: 'B13', gate: 'mate:hauntSee', why: '`st.sep` 改成恆真（編舞不再排掉分不出來的那一尊）', file: FX,
    from: '  function figSep(run, f, y) {', to: '  function figSep(run, f, y) { if (f) return true;' },
  { id: 'B14', gate: 'mate:hauntSee', why: 'yqDeliver 不再在衝擊拍藏起「分不出來那一尊」的道具', file: YQ,
    from: '      if (!shown) { st.alpha(m, 0); return; }',
    to: '      if (!shown) { st.alpha(m, 1); }' },
];

const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const bakDir = path.join(ROOT, 'scratchpad');
let port = 9500;
const rows = [];
for (const m of MUT) {
  if (ONLY.length && ONLY.indexOf(m.id) < 0) continue;
  const src = fs.readFileSync(m.file, 'utf8');
  const pairs = m.pairs || [[m.from, m.to]];
  let mutated = src;
  for (const [a, b] of pairs) {
    if (mutated.indexOf(a) < 0) throw new Error(`${m.id} 的錨點配不到（改壞前先中止，不留靜默綠燈）：${a}`);
    mutated = mutated.replace(a, b);
  }
  const bak = path.join(bakDir, `_bBbak-${m.id}-${path.basename(m.file)}`);
  fs.writeFileSync(bak, src); // ② 自取備份，還原不用反向 sed
  const before = gate(m.gate, port++);
  fs.writeFileSync(m.file, mutated);
  const after = gate(m.gate, port++);
  fs.writeFileSync(m.file, fs.readFileSync(bak, 'utf8')); // 還原
  const back = gate(m.gate, port++);
  const ok = before === 'GREEN' && after === 'RED' && back === 'GREEN';
  rows.push({ id: m.id, gate: m.gate, before, after, back, ok, why: m.why });
  console.log(`${m.id} [${m.gate}] 健康 ${before} → 突變 ${after} → 還原 ${back}  ${ok ? '✅' : '❌'}  ${m.why}`);
}
/* ★B6 是照實留著的已知未驗紅★（見上面的註解）：它不算「防線漏掉」，
   是「react 這一格在多尊同型單位的招上量到的不只受招方」這件事的**證據**，所以不進 exit code。
   ★不得把它從清單裡拿掉★——拿掉就等於把這個已知限制藏起來。 */
const KNOWN_GREEN = ['B6'];
const known = rows.filter((r) => !r.ok && KNOWN_GREEN.indexOf(r.id) >= 0);
if (known.length) console.log('（另有 ' + known.map((r) => r.id).join('／') + ' 是照實留著的已知未驗紅，見檔內註解）');
const bad = rows.filter((r) => !r.ok && KNOWN_GREEN.indexOf(r.id) < 0);
console.log(`\n${rows.length} 條，驗紅 ${rows.filter((r) => r.ok).length}／${rows.length}`);
if (bad.length) { console.log('未驗紅：' + bad.map((r) => r.id).join(' ')); process.exit(1); }

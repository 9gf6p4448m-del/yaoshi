// 陰氣批階段 A 的鑑別力突變（2026-09-13）。
//
// ★為什麼要這一支★（`02 §6.1` 第 1 條）：本階段新增的東西——`st.stain`、`MOVE_SPEC.hauntLost` 的
// `stance`／`anchor` 兩欄、編舞裡的 `st.stance`／`st.groundMark`／`main: true`／落點——
// 全部是「加上去之後閘門是綠的」。綠燈沒有證明力，要證明的是**把它改壞，那個閘門會變紅**。
//
// 紀律（沿用祖靈批 `anchor-mutations.mjs` 踩過的坑）：
//   ① **字串配不到就整支中止**——`String.replace` 靜默沒配到，整批會變成「全綠」的儀式；
//   ② **還原用改壞前的自取備份**（`scratchpad/_b3bak-*`），不做反向 sed；
//   ③ 每一條都先跑一次健康態、改壞、再跑、還原——健康態綠＋突變紅才算數。
//
// 用法：node docs/experiments/2026-09-13-yinqi-b3-evidence/b3-mutations.mjs [--only=M1,M5]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const YQ = path.join(ROOT, 'js/trait-fx/yinqi.js');
const VOCAB = path.join(ROOT, 'js/trait-fx/vocab.js');
const FX = path.join(ROOT, 'js/trait-fx.js');

/** 跑一個閘門，回傳 'GREEN'／'RED'。 */
function gate(kind, port) {
  try {
    if (kind === 'P1') execFileSync(process.execPath, ['tests/fxvocab.test.mjs'], { cwd: ROOT, stdio: 'pipe' });
    else {
      const out = execFileSync(process.execPath,
        ['tests/tools/traitfx-drive.mjs', `scratchpad/_mu${port}.json`, '--tier=2', '--only=hauntLost', `--port=${port}`],
        { cwd: ROOT, stdio: 'pipe' }).toString();
      if (!/^PASS /m.test(out)) return 'RED';
    }
    return 'GREEN';
  } catch (e) { return 'RED'; }
}

const MUT = [
  { id: 'M1', gate: 'P1', why: 'MOVE_SPEC 拿掉 stance（已轉正的招漏填施招姿態）', file: VOCAB,
    from: "hauntLost: { prop: '甲', act: '探', react: '轉', stance: '前傾', anchor: 'foe' }",
    to: "hauntLost: { prop: '甲', act: '探', react: '轉', anchor: 'foe' }" },
  { id: 'M2', gate: 'P1', why: 'MOVE_SPEC 拿掉 anchor（沒宣告道具落在誰身上）', file: VOCAB,
    from: "hauntLost: { prop: '甲', act: '探', react: '轉', stance: '前傾', anchor: 'foe' }",
    to: "hauntLost: { prop: '甲', act: '探', react: '轉', stance: '前傾' }" },
  { id: 'M3', gate: 'P1', why: '編舞拿掉 st.groundMark（登記了腳下語彙卻沒演）', file: YQ,
    from: "    st.groundMark(ghost, { r: 0.46, rot: 0.62, push: 0.18, peak: 0.70 });", to: '    ' },
  { id: 'M4', gate: 'P1', why: "編舞拿掉 st.stance（施招姿態沒演）", file: YQ,
    from: "        st.stance(ghost, '前傾', k);", to: '        ' },
  { id: 'M5', gate: 'drive', why: '道具不標 main（主道具消失，落點證據被副件墊高）', file: YQ,
    from: "{ anchor: 'foe', main: true, role: 'stamp',", to: "{ anchor: 'foe', role: 'stamp'," },
  { id: 'M6', gate: 'drive', why: '主道具改宣告 caster（帽子戴到對手頭上卻說落在自己身上）', file: YQ,
    from: "{ anchor: 'foe', main: true, role: 'stamp',", to: "{ anchor: 'caster', main: true, role: 'stamp'," },
  { id: 'M7', gate: 'drive', why: '衝擊拍把主道具藏起來（opacity 歸 0＝在場五條的第 4 條）', file: YQ,
    from: "        st.punch(0.34);", to: "        st.punch(0.34); st.alpha(hat, 0);" },
  { id: 'M8', gate: 'drive', why: '腳下語彙點到受招方腳下（指認錯的施招者）', file: YQ,
    from: "    st.groundMark(ghost, { r: 0.46,", to: "    st.groundMark(lost, { r: 0.46," },
  { id: 'M9', gate: 'drive', why: '受招方只轉不動（只有 spin 不算反應，react 三段量 move／scale）', file: YQ,
    from: "        st.move(lost, sway.x * SWAY[n], 0, sway.z * SWAY[n]);", to: '        ' },
  /* ★M10 在覆審修補之前是**綠的**（＝沒有鑑別力），現在會紅★
     改前：黏著 `st.stick` 寫在 `done()` 裡、與 `sampleAnchors` 的量測時點（`react[0]`）同一幀
     ⇒ 帽子飛不飛，`mainOK`／`mainD`／`gap` 逐字相同（覆審 C1 的實測）。
     改後：黏著延後一格、到位那一格改由 `done()` 的 `hat.position.copy(to)` 給
     ⇒ 衝擊拍量到的是帽子自己飛到的位置。 */
  { id: 'M10', gate: 'drive', why: '帽子原地生成、也不在衝擊拍到位（飛行整段沒了）', file: YQ,
    pairs: [['        hat.position.lerpVectors(from, to, JOLT[n]);', '        hat.position.copy(from);'],
      ['        hat.position.copy(to);', '        hat.position.copy(from);']] },
  { id: 'M11', gate: 'drive', why: '只拿掉衝擊拍之後那一行黏著（飛行還在）——照設計不該紅', file: YQ,
    from: "          st.stick(hat, lost, { at: 'top', off: to.clone().sub(top) });", to: '          ' },
  /* M13（覆審 C1 的驗收）：只拿掉「第三階到位」那一行，飛行仍走到 JOLT[1]=0.64
     ⇒ 帽子停在兩邊中間。改前（黏著寫在 done() 裡）這一格是綠的——st.stick 會把它瞬移到
     受招方頭上，mainOK／gap 與帽子飛到哪完全脫鉤。黏著延後之後它必須紅。 */
  { id: 'M13', gate: 'drive', why: '帽子飛到一半就停（不在衝擊拍到位）＝落點證據脫鉤的那一格', file: YQ,
    from: '        hat.position.copy(to);', to: '        void to;' },
  /* M14（覆審 H3 的驗收）：腳下暗斑的本體色改成 key（冷屍白青）＝比桌面亮的亮斑。 */
  { id: 'M14', gate: 'P1', why: '腳下暗斑的本體色改成比桌面亮的 key（不再是暗斑）', file: FX,
    from: "color: st.colors.ink, inkColor: st.colors.line, opacity: 0, rot: o.rot }",
    to: "color: st.colors.key, inkColor: st.colors.line, opacity: 0, rot: o.rot }" },
];

/* M12＝M10 的對照實驗：M10 之外再把黏著也拿掉，用來隔離「是誰在餵 travel 的分子」。
   實測（黏著還寫在 done() 裡的那一版）：M10 moved 2.8844、M12 只剩 0.7404（門檻 1.2533）
   ⇒ travel 的分子是 st.stick 的瞬移補的。st.phase('travel') 的 claim 沒有時間上限
   （js/trait-fx.js 的 phase()：windup／react 都設 c.until，只有 travel 留 Infinity），
   那是引擎層、19 支已轉正的招共用，本階段依派工書不碰。 */
const M12 = { id: 'M12', gate: 'drive', why: 'M10＋M11：飛行、到位、黏著全部拿掉（travel 才紅）', file: YQ,
  pairs: [['        hat.position.lerpVectors(from, to, JOLT[n]);', '        hat.position.copy(from);'],
    ['        hat.position.copy(to);', '        hat.position.copy(from);'],
    ["          st.stick(hat, lost, { at: 'top', off: to.clone().sub(top) });", '          ']] };
MUT.push(M12);

const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const bakDir = path.join(ROOT, 'scratchpad');
let port = 9100;
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
  const bak = path.join(bakDir, `_b3bak-${m.id}-${path.basename(m.file)}`);
  fs.writeFileSync(bak, src); // ② 自取備份，還原不用反向 sed
  const before = gate(m.gate, port++);
  fs.writeFileSync(m.file, mutated);
  const after = gate(m.gate, port++);
  fs.writeFileSync(m.file, fs.readFileSync(bak, 'utf8')); // 還原
  const back = gate(m.gate, port++);
  rows.push({ id: m.id, gate: m.gate, before, after, back, ok: before === 'GREEN' && after === 'RED' && back === 'GREEN', why: m.why });
  console.log(`${m.id} [${m.gate}] 健康 ${before} → 突變 ${after} → 還原 ${back}  ${before === 'GREEN' && after === 'RED' && back === 'GREEN' ? '✅' : '❌'}  ${m.why}`);
}
/* ★M11 是**照設計不會紅**的那一格★（對照組）：只拿掉黏著、飛行還在，那本來就是合格的實作。
   它不算「防線漏掉」，是「這一格在量什麼」的對照，所以不進 exit code。
   ★不得把它從清單裡拿掉★——沒有這個對照組，M10／M13 的紅就分不出是哪一段造成的。 */
const KNOWN_GREEN = ['M11'];
const bad = rows.filter((r) => !r.ok && KNOWN_GREEN.indexOf(r.id) < 0);
const known = rows.filter((r) => !r.ok && KNOWN_GREEN.indexOf(r.id) >= 0);
console.log(`\n${rows.length} 條，驗紅 ${rows.filter((r) => r.ok).length}／${rows.length}`
  + (known.length ? `（另有 ${known.map((r) => r.id).join('／')} 是照實留著的已知未驗紅，見檔內註解）` : ''));
if (bad.length) { console.log('未驗紅：' + bad.map((r) => r.id).join(' ')); process.exit(1); }

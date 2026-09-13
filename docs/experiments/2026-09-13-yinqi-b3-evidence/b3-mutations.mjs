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
  /* M10 是照實留著的**未驗紅**；歸因由 M11 隔離出來，寫在報告 §1.5。 */
  { id: 'M10', gate: 'drive', why: '帽子原地生成不飛（travel 段的載體沒了）', file: YQ,
    from: "        hat.position.lerpVectors(from, to, j);", to: "        hat.position.copy(from);" },
  { id: 'M11', gate: 'drive', why: '拿掉衝擊拍那一行黏著（隔離「是誰在餵 travel 的分子」）', file: YQ,
    from: "          st.stick(hat, lost, { at: 'top', off: to.clone().sub(top) });", to: '          ' },
];

const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const bakDir = path.join(ROOT, 'scratchpad');
let port = 9100;
const rows = [];
for (const m of MUT) {
  if (ONLY.length && ONLY.indexOf(m.id) < 0) continue;
  const src = fs.readFileSync(m.file, 'utf8');
  if (src.indexOf(m.from) < 0) throw new Error(`${m.id} 的錨點配不到（改壞前先中止，不留靜默綠燈）：${m.from}`);
  const bak = path.join(bakDir, `_b3bak-${m.id}-${path.basename(m.file)}`);
  fs.writeFileSync(bak, src); // ② 自取備份，還原不用反向 sed
  const before = gate(m.gate, port++);
  fs.writeFileSync(m.file, src.replace(m.from, m.to));
  const after = gate(m.gate, port++);
  fs.writeFileSync(m.file, fs.readFileSync(bak, 'utf8')); // 還原
  const back = gate(m.gate, port++);
  rows.push({ id: m.id, gate: m.gate, before, after, back, ok: before === 'GREEN' && after === 'RED' && back === 'GREEN', why: m.why });
  console.log(`${m.id} [${m.gate}] 健康 ${before} → 突變 ${after} → 還原 ${back}  ${before === 'GREEN' && after === 'RED' && back === 'GREEN' ? '✅' : '❌'}  ${m.why}`);
}
const bad = rows.filter((r) => !r.ok);
console.log(`\n${rows.length} 條，驗紅 ${rows.length - bad.length}／${rows.length}`);
if (bad.length) { console.log('未驗紅：' + bad.map((r) => r.id).join(' ')); process.exit(1); }

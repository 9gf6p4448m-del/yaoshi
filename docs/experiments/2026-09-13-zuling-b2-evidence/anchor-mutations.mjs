/* anchor 這一格的鑑別力（覆審 r2 之後的版本，9 條）
     A–C  原本三條：宣告錯／登記錯／落點搬回施招者
     D–G  覆審 r1 指名的四條繞法：衝擊拍移走／同側重疊／實例散到敵方／主道具不登記
     H–I  覆審 r2 指名的兩條：在場只堵已知入口（alpha 0＋縮到 0.01）／「我方單一」送給每一尊
   ★兩件紀律★
     ① 還原一律用**改壞前的備份副本**（`02 §6.1` 第 1 條），不用反向 sed；
     ② 每一條突變的字串**找不到就整支中止**——覆審 r2 的 N-4 就是「sed 沒配到、靜默不改、綠燈」。 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = 'C:/Users/shung/OneDrive/桌面/妖市/.claude/worktrees/agent-af83de3a890909c69';
process.chdir(ROOT);
const FILES = ['js/trait-fx/vocab.js', 'js/trait-fx/zuling.js', 'js/trait-fx/xianghuo.js'];
const BAK = FILES.map((f) => 'scratchpad/_mubak-' + f.split('/').pop());
FILES.forEach((f, i) => fs.copyFileSync(f, BAK[i]));
const restore = () => FILES.forEach((f, i) => fs.copyFileSync(BAK[i], f));

const drive = (only, count) => {
  const out = execFileSync('node', ['tests/tools/traitfx-drive.mjs', 'scratchpad/_mu.json',
    '--tier=2', '--count=' + count, '--only=' + only], { encoding: 'utf8' });
  const line = out.trim().split('\n').filter((l) => l.includes('pass')).pop() || out.trim().split('\n').pop();
  const m = line.match(/(\d+)\/(\d+) pass/);
  const anch = JSON.parse(fs.readFileSync('scratchpad/_mu.json', 'utf8')).results
    .map((r) => { const a = (r.verdict || {}).anchors || {}; return r.case.trait + ' anchorOK=' + (a.ok ? 1 : 0) + ' bad=' + a.bad + ' miss=' + a.missing + ' cover=' + a.cover + '/' + a.coverNeed + ' mainDecl=' + a.mainDeclared + ' mainOK=' + a.mainOK; });
  return { line: line.trim(), pass: m ? +m[1] : -1, of: m ? +m[2] : -1, anch };
};

const MUT = [
  { id: 'A', only: 'biteGamble', count: 2, file: 'js/trait-fx/vocab.js',
    desc: "MOVE_SPEC.biteGamble.anchor 'foe' → 'allies'（宣告落我方、實際落敵方）",
    find: "biteGamble: { prop: '甲', act: '撲', react: '壓', stance: '前傾', anchor: 'foe' }",
    repl: "biteGamble: { prop: '甲', act: '撲', react: '壓', stance: '前傾', anchor: 'allies' }" },
  { id: 'B', only: 'eliteOpenShot', count: 2, file: 'js/trait-fx/zuling.js',
    desc: "射日的日盤登記成 anchor 'caster'（道具明明飛去對面）",
    find: "const disc = st.paperStamp(st.kind, nock, { anchor: 'foe', main: true",
    repl: "const disc = st.paperStamp(st.kind, nock, { anchor: 'caster', main: true" },
  { id: 'C', only: 'wardRegen1', count: 2, file: 'js/trait-fx/xianghuo.js',
    desc: "長明燈（我方單一）的落點搬回施招者身上（st.top(hurt) → st.top(lamp)）",
    find: "const dst = st.top(hurt, new THREE.Vector3()).add(camOff(st, 1)).add(lean);",
    repl: "const dst = st.top(lamp, new THREE.Vector3()).add(camOff(st, 1)).add(lean);" },
  { id: 'D', only: 'eliteOpenShot', count: 2, file: 'js/trait-fx/zuling.js',
    desc: '衝擊拍把日盤從畫面上拿掉（disc.visible = false）',
    find: "        st.burst(to, { power: 0.95, n: 62, color: C.hot });",
    repl: "        disc.visible = false; st.burst(to, { power: 0.95, n: 62, color: C.hot });" },
  { id: 'E', only: 'wardHpFirst', count: 2, file: 'js/trait-fx/xianghuo.js',
    desc: '香灰符黏在兩尊胸口的**正中間**（H-1 的平手案：離誰都一樣近＝讀者分不出是誰的）',
    find: "        st.stick(talis, mate, { at: 'chest', off: bodySpotOff(st, mate, landOff) });",
    repl: "        st.stick(talis, mate, { at: 'chest', off: st.worldOf(monk, 'Chest', new THREE.Vector3()).sub(mateChest).multiplyScalar(0.5).add(camOff(st, 1)) });" },
  { id: 'F', only: 'eliteOpenShot', count: 2, file: 'js/trait-fx/zuling.js',
    desc: '射日的箭矢把一支實例散回我方（局部 +z 3.0）',
    find: "        it.p.copy(a.off).multiplyScalar(1 + 1.6 * k);",
    repl: "        it.p.copy(a.off).multiplyScalar(1 + 1.6 * k); if (i === 0) it.p.z += 3.0;" },
  { id: 'G', only: 'wardFirst', count: 2, file: 'js/trait-fx/zuling.js',
    desc: '祖靈之眼的主道具（石雕眼）不登記 anchor，只剩 follow 印記',
    find: "const stone = st.paperStamp(st.kind, A, { anchor: 'allies', main: true, role: 'stamp'",
    repl: "const stone = st.paperStamp(st.kind, A, { main: true, role: 'stamp'" },
  { id: 'H', only: 'eliteOpenShot', count: 2, file: 'js/trait-fx/zuling.js',
    desc: '衝擊拍把日盤與箭矢的 opacity 歸 0、縮到 0.01（覆審 r2 的新繞法 h）',
    find: "        st.punch(0.46);",
    repl: "        st.alpha(disc, 0); disc.scale.setScalar(0.01); st.alpha(arrows.obj, 0); arrows.obj.scale.setScalar(0.01);\n        st.punch(0.46);" },
  { id: 'I', only: 'wardHpFirst', count: 3, file: 'js/trait-fx/xianghuo.js',
    desc: "「我方單一」的香灰符同時送給第二尊我方（覆審 r2 的新繞法 i）",
    find: "    talis.scale.setScalar(st.iconSize * 0.40);",
    repl: "    talis.scale.setScalar(st.iconSize * 0.40);\n    {\n      const mate2 = st.actor.find((f) => f !== monk && f !== mate) || mate;\n      const m2 = st.paperStamp(st.kind, st.top(mate2, new THREE.Vector3()), { anchor: 'ally', color: C.key, inkColor: C.hot,\n        opacity: 0.9, depth: 0.18, warp: 0.14, follow: mate2, at: 'top', off: camOff(st, 1) });\n      m2.scale.setScalar(st.markSize);\n    }" },
];

const lines = [];
const say = (s) => { console.log(s); lines.push(s); };
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
say('# anchor 鑑別力突變（覆審 r2 最終碼）');
say('# 程式碼 SHA（未提交的工作樹改動見同批 commit）：' + sha);
say('# 判準：健康態綠、每一條突變紅；還原用備份副本。');
say('');
say('=== 健康態（對照）===');
const h2 = drive('biteGamble,eliteOpenShot,wardRegen1,wardHpFirst,wardFirst', 2);
say('--count=2  ' + h2.line);
h2.anch.forEach((a) => say('    ' + a));
const h3 = drive('wardHpFirst', 3);
say('--count=3  ' + h3.line);
h3.anch.forEach((a) => say('    ' + a));
let allRed = h2.pass === h2.of && h3.pass === h3.of;
if (!allRed) say('!! 健康態不是全綠，後面的紅燈不構成證據');

const ONLY = process.argv[2] ? process.argv[2].split(",") : null;
for (const m of MUT) {
  if (ONLY && ONLY.indexOf(m.id) < 0) continue;
  restore();
  let s = fs.readFileSync(m.file, 'utf8');
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  const find = m.find.split('\n').join(nl), repl = m.repl.split('\n').join(nl);
  if (!s.includes(find)) { restore(); throw new Error(`突變 ${m.id} 的字串在現碼上找不到——這正是 N-4 的病，整支中止：\n${m.find}`); }
  fs.writeFileSync(m.file, s.replace(find, repl));
  const r = drive(m.only, m.count);
  say('');
  say(`=== ${m.id}（--count=${m.count}）：${m.desc} ===`);
  say('  ' + r.line + (r.pass === 0 ? '   ← 紅（要的結果）' : '   ← !! 綠，鑑別力不成立'));
  r.anch.forEach((a) => say('    ' + a));
  if (r.pass !== 0) allRed = false;
  restore();
}
say('');
say('=== 還原後（健康態必須回綠）===');
const b2 = drive('biteGamble,eliteOpenShot,wardRegen1,wardHpFirst,wardFirst', 2);
say('--count=2  ' + b2.line);
const b3 = drive('wardHpFirst', 3);
say('--count=3  ' + b3.line);
if (b2.pass !== b2.of || b3.pass !== b3.of) allRed = false;
say('');
say(allRed ? '總結：9 條全紅、健康態前後皆綠 ⇒ 這一格有鑑別力。' : '總結：!! 有條目沒達標，見上。');
fs.writeFileSync('scratchpad/_mutations.txt', lines.join('\n') + '\n');
console.log('\n-> scratchpad/_mutations.txt');

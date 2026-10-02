/* 席位之手 階段三 角色變體 突變驗紅（凍結驗收 V4，docs/experiments/2026-10-01-hands-stage3/acceptance-roles.md）。
   同 hands-mutants.mjs 的做法（暫存突變體＋環境變數指向、原檔唯讀、最後跑無突變基準必須全綠），改跑 tests/table-hands-roles.test.mjs。
   跑法：node tests/tools/hands-roles-mutants.mjs [out.json]
   （以下為原註解）把被測的 js 檔複製到系統暫存目錄、只改一處，
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
  { id: 'V4-variantOff', frozen: 'V4 變體關掉', file: 'hands', what: '變體整個關掉（setSeats 後每席仍拿預設手）',
    from: 'h.mesh.geometry = key ? variantGeo(key) : dressedGeo;', to: 'h.mesh.geometry = dressedGeo;', expect: /^V1 三角色的手|^V3 [LP]|^V4 /m },
  { id: 'V4-sameColour', frozen: 'V4 三角色同色', file: 'motion', what: '三個角色的袖口主色與袖布色全部一樣（只剩配件不同）',
    from: "    dangpu: { CUFF: C_BLACK, CLOTH: [0.010, 0.010, 0.013], BLOCK: [C_BLACK, C_GOLD, C_LINING] },", to: "    dangpu: { CUFF: C_LINEN, CLOTH: [0.010, 0.010, 0.013], BLOCK: [C_BLACK, C_GOLD, C_LINING] },", expect: /^V1 各角色的特徵色/ },
  { id: 'V4-sameColour2', frozen: 'V4 三角色同色', file: 'motion', what: '獵人袖口色也改成與收驚婆相同（三者兩兩不同的反面）',
    from: "    hunter: { CUFF: C_LEATHER, CLOTH: [0.18, 0.085, 0.032], BLOCK: [C_LEATHER, C_STRAP, C_BRASS] },", to: "    hunter: { CUFF: C_LINEN, CLOTH: [0.18, 0.085, 0.032], BLOCK: [C_LEATHER, C_STRAP, C_BRASS] },", expect: /^V1 各角色的特徵色/ },
  { id: 'V4-extraMaterial', frozen: 'V4 配件另開材質', file: 'hands', what: '配件掛在另一個 mesh＋另一份材質（多一個 draw call、多一份材質）',
    from: 'h.mesh.geometry = key ? variantGeo(key) : dressedGeo;', to: "h.mesh.geometry = key ? variantGeo(key) : dressedGeo; if (key && !h.extra) { h.extra = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), material.clone()); h.holder.add(h.extra); }", expect: /^V3 [LP]/m },
  { id: 'V4-perFrame', frozen: 'V4 每幀重算', file: 'hands', what: '每幀 update 都把變體幾何清掉重建',
    from: '    update(dt) {\n      if (!director) return;', to: '    update(dt) {\n      if (!director) return;\n      variantGeos.clear(); for (const h of hands) if (seatKey[h.seat]) h.mesh.geometry = variantGeo(seatKey[h.seat]);', expect: /^V4 / },
  { id: 'V4-unknownRoleVariant', frozen: 'V2 未知角色', file: 'motion', what: '任何字串角色都給獵人手（未知／其他 7 角色被染上變體）',
    from: "return typeof role === 'string' && Object.prototype.hasOwnProperty.call(ROLE_HAND.ROLES, role) ? role : null;", to: "return typeof role === 'string' ? (Object.prototype.hasOwnProperty.call(ROLE_HAND.ROLES, role) ? role : 'hunter') : null;", expect: /^V2 / },
  { id: 'V4-protoRole', frozen: 'V2 原型鏈名字', file: 'motion', what: '角色查表不檢查自有屬性（toString／__proto__ 會進變體流程而丟例外）',
    from: "Object.prototype.hasOwnProperty.call(ROLE_HAND.ROLES, role) ? role : null;", to: "ROLE_HAND.ROLES[role] !== undefined ? role : null;", expect: /^V2 / },
  { id: 'V4-wrongBone', frozen: '配件隨骨', file: 'motion', what: '配件的蒙皮骨頭固定抄第 0 個原頂點（配件不跟著它貼的那段骨走）',
    from: 'skinIndex[(n0 + e) * 4 + j] = base.skinIndex[best * 4 + j];', to: 'skinIndex[(n0 + e) * 4 + j] = base.skinIndex[j];', expect: /^配件隨骨/ },
  { id: 'V4-windingInward', frozen: '配件繞序', file: 'motion', what: '不統一配件繞序（朝內的三角形留著，單面材質會剔掉／露內壁）',
    from: 'acc.N[ia * 3 + 2] < 0) {', to: 'acc.N[ia * 3 + 2] < -1e9) {', expect: /^配件幾何/ },
  { id: 'V4-random', frozen: '純演出', file: 'motion', what: '變體建構呼叫 Math.random（配件位置加抖）',
    from: '  const acc = accBuilder();', to: '  const acc = accBuilder(); Math.random();', expect: /^純演出：變體建構不耗亂數/ },
  { id: 'V4-bracerFat', frozen: '不穿錢柱', file: 'motion', what: '護腕做得更厚（R 0.040→0.090／GAP 0.002→0.012，會穿進旁邊的錢）',
    from: 'BRACER: { Z: -0.25, W: 0.27, R: 0.040, GAP: 0.002,', to: 'BRACER: { Z: -0.25, W: 0.27, R: 0.090, GAP: 0.012,', expect: /^變體手 [LP]/m },
  /* ── 第二輪（acceptance-roles-r2.md）新增識別物／色塊／不透明的突變 ── */
  { id: 'R2-redOnDangpu', frozen: 'R2 當鋪不得有紅繩色', file: 'motion', what: '當鋪的暗紅襯裡改成紅繩色（當鋪又帶紅線）',
    from: 'C_LINING = [0.16, 0.006, 0.009]', to: 'C_LINING = [0.46, 0.015, 0.012]', expect: /^R2 / },
  { id: 'R2-jadeOnHunter', frozen: 'R2 獵人不得有玉色', file: 'motion', what: '獵人的黃銅扣改成玉色（獵人又戴玉戒、且沒了黃銅）',
    from: 'C_BRASS = [0.62, 0.42, 0.09]', to: 'C_BRASS = [0.030, 0.26, 0.13]', expect: /^R2 / },
  { id: 'R1a-hunterBracerThin', frozen: 'R1a 色塊面積', file: 'motion', what: '獵人護腕縮回舊寬度（W 0.27→0.20）、肩帶變細（0.046→0.034）：色塊面積掉到 <基準×1.5',
    from: 'BRACER: { Z: -0.25, W: 0.27, R: 0.040, GAP: 0.002, COLOR: C_LEATHER, STRAP: C_STRAP, STRAP_Z: [-0.115, -0.385], STRAP_W: 0.046,', to: 'BRACER: { Z: -0.25, W: 0.20, R: 0.040, GAP: 0.002, COLOR: C_LEATHER, STRAP: C_STRAP, STRAP_Z: [-0.115, -0.385], STRAP_W: 0.034,', expect: /^R1a / },
  { id: 'R1a-shoujingBlockLost', frozen: 'R1a 色塊面積', file: 'motion', what: '收驚婆色塊清單只剩毛邊色（亞麻袖口不再算色塊）',
    from: 'BLOCK: [C_LINEN, C_HEM] }', to: 'BLOCK: [C_HEM] }', expect: /^R1a / },
  { id: 'R1b-shoujingLooksLikeHunter', frozen: 'R1b 色塊撞色', file: 'motion', what: '收驚婆亞麻色改成與獵人皮護腕同色（色塊平均色距離 <60）',
    from: 'C_LINEN = [0.78, 0.70, 0.54]', to: 'C_LINEN = [0.62, 0.30, 0.12]', expect: /^R1b/ },
  { id: 'R1b-dangpuLooksLikeHunter', frozen: 'R1b 色塊撞色', file: 'motion', what: '當鋪黑袖改成深棕（深棕 vs 黑金撞色的反面：當鋪與獵人太近）',
    from: 'C_BLACK = [0.014, 0.013, 0.016], C_GOLD = [0.40, 0.24, 0.03]', to: 'C_BLACK = [0.45, 0.20, 0.08], C_GOLD = [0.62, 0.30, 0.12]', expect: /^R1b/ },
  { id: 'R3-skinAlpha', frozen: 'R3 北席皮膚不透明', file: 'motion', what: '整隻手頂點 alpha 預設 0.9（整隻手半透明）',
    from: 'colors[v * itemSize + 2], a = 1;', to: 'colors[v * itemSize + 2], a = 0.9;', expect: /^R3 / },
  { id: 'R3-fadeIntoSkin', frozen: 'R3 漸隱不得吃進膚色', file: 'motion', what: '手腕以後（z<0.2）的膚色頂點 alpha 0.6（漸隱範圍吃進膚色）',
    from: 'colors[v * itemSize + 2], a = 1;', to: 'colors[v * itemSize + 2], a = z < 0.2 ? 0.6 : 1;', expect: /^R3 / },
  { id: 'R3-noFade', frozen: 'R3 袖尾漸隱仍在', file: 'motion', what: '袖尾漸隱被拿掉（alpha 恆 1）',
    from: 'a = 1 - smooth(t);', to: 'a = 1;', expect: /^R3 / },
  { id: 'V4-motionTouched', frozen: '純演出：動作不變', file: 'hands', what: '變體手的位置被改了（手推進時 y 偏移，模擬「配件影響動作」）',
    from: "h.holder.position.set(fr.root[0], fr.root[1], fr.root[2]);", to: "h.holder.position.set(fr.root[0], fr.root[1] + (seatKey[h.seat] ? 0.01 : 0), fr.root[2]);", expect: /^純演出：同一串事件/ },
];
const run = (env) => {
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', 'tests/table-hands-roles.test.mjs'], { cwd: ROOT, env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 64 << 20 });
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

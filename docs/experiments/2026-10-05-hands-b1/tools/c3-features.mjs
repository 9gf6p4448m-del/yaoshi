// 條件 3：四角色專屬手上場＋辨識物逐項（機械判定）。走真實鏈路（b1-node.mjs：真的 GLB／table-props／table-hands／hand-b1）。
// 四席＝青面／紅衣婆婆／斷手書生／組頭，setSeats 後讀每席實際掛上的幾何（userData.b1parts、頂點色、aAcc 類別、aSkin 種類）與材質、shader 參數。
// 跑法：YAOSHI_ROOT=<樹> node c3-features.mjs [--out=<json>]   基準樹沒有 hand-b1.js ⇒ 預期全紅。
import fs from 'node:fs';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const { F, loadHandsB1, loadB1, ROOT } = await import('./b1-node.mjs');
const { createTableProps } = await F.loadProps();
const { createTableHands } = await loadHandsB1();
const B1 = await loadB1();
const parent = new F.THREE.Group();
const props = createTableProps(parent, { handPaths: true, onSlam() {} });
props.setLayout(...F.LAYOUTS.L);
const roles = ['qingmian', 'hongyi', 'duanshou', 'zutou'], seats = roles.map((role, id) => ({ id, role }));
props.setSeats(seats);
const hands = createTableHands(parent, props, process.env.B1OFF ? { b1: false } : {}); // B1OFF=1：模組在、但開關關（?handb1=0 同效）⇒ 應判紅
hands.setSeats(seats);
await hands.ready();
const st = hands.stats();
const meshOf = (seat) => { let m = null; hands.group.children[seat].traverse((o) => { if (o.isSkinnedMesh) m = o; }); return m; };
const checks = {}; const ok = (role, name, pass, value) => { (checks[role] = checks[role] || []).push({ name, pass: !!pass, value }); };
const near = (c, t, eps = 2e-3) => Math.abs(c[0] - t[0]) + Math.abs(c[1] - t[1]) + Math.abs(c[2] - t[2]) < eps;
const U = (meshOf(0) && meshOf(0).material.userData.realU) || null;
const kindIdx = (role) => (B1 ? B1.KINDS8.indexOf(role) : -1);
if (!B1) for (const role of roles) ok(role, '批 1 模組（js/hand-b1.js）存在', false, null); // 基準樹：沒有專屬手 ⇒ 全紅
else for (const [seat, role] of roles.entries()) {
  const mesh = meshOf(seat), g = mesh.geometry, parts = g.userData.b1parts || [], col = g.attributes.color, acc = g.attributes.aAcc, idx = g.index.array;
  const part = (n) => parts.find((p) => p.name === n);
  const drawn = (p) => { if (!p) return 0; let n = 0; for (let t = 0; t < idx.length; t += 3) if (idx[t] >= p.from && idx[t] < p.to) n++; return n; }; // 這段頂點真的有三角形送進 GPU
  const colorsOf = (p) => { if (!p) return []; const out = new Set(); for (let v = p.from; v < p.to; v++) out.add([col.getX(v), col.getY(v), col.getZ(v)].map((x) => x.toFixed(3)).join(',')); return [...out]; };
  ok(role, '這一席掛的是批 1 專屬幾何（variants＝角色鍵、材質 hand-real-b1）', st.variants[seat] === role && st.materialNames[seat] === 'hand-real-b1', { variant: st.variants[seat], mat: st.materialNames[seat] });
  ok(role, '袖口（一處色）有畫出', drawn(part('袖口')) > 0, drawn(part('袖口')));
  const k = kindIdx(role), ext = U && U.uExtA && k >= 0 ? U.uExtA.value[k].toArray() : null, ext2 = U && U.uExt2A && k >= 0 ? U.uExt2A.value[k].toArray() : null;
  if (role === 'qingmian') {
    const cl = part('長指甲'); ok(role, '長厚指甲 5 根（泛黃：甲根色 R≈G>B）', cl && drawn(cl) > 0 && cl.to - cl.from === 5 * ((4 + 5) * 6 + 2 * 6), cl && { verts: cl.to - cl.from, tris: drawn(cl), c0: B1.B1_ACC.CLAW.qingmian.C0 });
    const coins = parts.filter((p) => /^銅錢\d$/.test(p.name)); ok(role, '腕銅錢 8 枚（每枚有畫出）', coins.length === 8 && coins.every((p) => drawn(p) > 0), coins.length);
    ok(role, '青灰斑（shader：斑點轉青黑 ext.z＞0、斑點變細 ext.w＞0）', ext && ext[2] > 0 && ext[3] > 0, ext);
    ok(role, '暗青袖口（袖口色 G,B＞R）', colorsOf(part('袖口')).some((c) => { const [r, gg, b] = c.split(',').map(Number); return gg > r && b > r; }), colorsOf(part('袖口')).slice(0, 3));
  }
  if (role === 'hongyi') {
    const cl = part('長指甲'); ok(role, '鉤狀長指甲 5 根（往下彎 CURL＞1 弧度）', cl && drawn(cl) > 0 && B1.B1_ACC.CLAW.hongyi.CURL > 1, cl && { tris: drawn(cl), curl: B1.B1_ACC.CLAW.hongyi.CURL });
    ok(role, '黑髮辮繞腕（有畫出、黑）', drawn(part('黑髮辮')) > 0 && colorsOf(part('黑髮辮')).every((c) => c.split(',').every((x) => +x < 0.05)), part('黑髮辮') && drawn(part('黑髮辮')));
    ok(role, '垂髮（一綹黑髮垂過手背，有畫出）', drawn(part('垂過手背的一綹黑髮')) > 0, part('垂過手背的一綹黑髮') && drawn(part('垂過手背的一綹黑髮')));
    ok(role, '乾枯灰白（膚色 R,G,B 差 ≤0.02）', (() => { const s = B1.B1_REAL.hongyi.skin; return Math.max(...s) - Math.min(...s) <= 0.02; })(), B1 && B1.B1_REAL.hongyi.skin);
    ok(role, '暗紅袖口', colorsOf(part('袖口')).some((c) => { const [r, gg, b] = c.split(',').map(Number); return r > 0.1 && gg < 0.02 && b < 0.02; }), colorsOf(part('袖口')).slice(0, 3));
    /* 無紅線手繩：腕部（z −0.15…0.35）沒有任何「繩類（aAcc＝2）且偏紅」的頂點；也沒有收驚婆紅繩色 */
    let redRope = 0; for (let v = g.userData.real.nBase; v < g.userData.real.arm[0]; v++) { const z = g.attributes.position.getZ(v); if (z < -0.15 || z > 0.35 || Math.round(acc.getX(v)) !== 2) continue; const r = col.getX(v), gg = col.getY(v), b = col.getZ(v); if (r > 0.08 && r > 3 * gg && r > 3 * b) redRope++; }
    ok(role, '無紅線手繩（腕部繩類頂點中偏紅者＝0）', redRope === 0 && !parts.some((p) => /紅線|紅繩/.test(p.name)), redRope);
  }
  if (role === 'duanshou') {
    const bd = part('縫痕帶'), sw = part('針腳');
    let z0 = 1e9, z1 = -1e9; if (bd) for (let v = bd.from; v < bd.from + 40; v++) { const z = g.attributes.position.getZ(v); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    ok(role, 'V4 斜切口（縫痕帶同一列 z 跨度 ≥ 1.5×OBL；垂直手臂的一圈＝0）', bd && drawn(bd) > 0 && z1 - z0 >= 1.5 * B1.B1_ACC.STITCH.OBL, bd && { zSpan: +(z1 - z0).toFixed(4), OBL: B1.B1_ACC.STITCH.OBL });
    ok(role, 'V4 橫針（N 針，每針沿手臂方向跨過切口）', sw && drawn(sw) > 0 && (sw.to - sw.from) === B1.B1_ACC.STITCH.N * (4 * 4 + 2 * 4), sw && { verts: sw.to - sw.from, n: B1.B1_ACC.STITCH.N });
    ok(role, '手灰白、前臂偏青暗（shader ext2：模式 2、強度＞0）', ext2 && ext2[1] > 0 && ext2[2] > 1.5, ext2);
    ok(role, '指尖墨漬（shader ext.x＞0）', ext && ext[0] > 0, ext);
    ok(role, '洗白青灰袖口（B≥G≥R）', colorsOf(part('袖口')).some((c) => { const [r, gg, b] = c.split(',').map(Number); return b >= gg && gg >= r && b > 0.08; }), colorsOf(part('袖口')).slice(0, 3));
  }
  if (role === 'zutou') {
    ok(role, '粗短（RADIAL＞1.15）', B1.B1_REAL.zutou.RADIAL > 1.15, B1.B1_REAL.zutou.RADIAL);
    ok(role, '無名指＋小指粗金戒（兩枚有畫出）', drawn(part('金戒（無名指）')) > 0 && drawn(part('金戒（小指）')) > 0, [drawn(part('金戒（無名指）')), drawn(part('金戒（小指）'))]);
    ok(role, '舊錶（錶帶／錶殼／錶面有畫出）', ['錶帶', '錶殼', '錶面'].every((n) => drawn(part(n)) > 0), ['錶帶', '錶殼', '錶面'].map((n) => drawn(part(n))));
    ok(role, '手背數字（shader ext.y＞0）', ext && ext[1] > 0, ext);
    let floral = 0; const cf = part('袖口'); if (cf) for (let v = cf.from; v < cf.to; v++) if (Math.round(acc.getX(v)) === 6) floral++;
    ok(role, '花襯衫袖（袖口頂點走花布類 aAcc＝6）', floral > 0, floral);
  }
  /* 共同：皮膚程式生成無貼圖無 UV、手不縮放 */
  ok(role, '無貼圖（material.map＝null）、無 UV 屬性', !mesh.material.map && !g.attributes.uv, { map: !!mesh.material.map, uv: !!g.attributes.uv });
  ok(role, '手不縮放（seatMul＝1、HAND.USER_SCALE＝1）', st.seatMul[seat] === 1 && F.M.HAND.USER_SCALE === 1, { seatMul: st.seatMul[seat], USER_SCALE: F.M.HAND.USER_SCALE });
  ok(role, '每手 ≤6,500 面', g.index.count / 3 <= 6500, g.index.count / 3);
}
const summary = Object.fromEntries(Object.entries(checks).map(([r, cs]) => [r, `${cs.filter((c) => c.pass).length}/${cs.length}`]));
const pass = Object.values(checks).every((cs) => cs.every((c) => c.pass)) && Object.keys(checks).length === 4;
const out = { root: ROOT, b1: st.b1, b1Error: st.b1Error, summary, pass, checks };
console.log(JSON.stringify({ root: ROOT, b1: st.b1, summary, pass, fails: Object.entries(checks).flatMap(([r, cs]) => cs.filter((c) => !c.pass).map((c) => r + '：' + c.name)) }, null, 1));
if (opt.out) fs.writeFileSync(opt.out, JSON.stringify(out, null, 1));

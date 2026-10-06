// v0.60.0 得標「手抓回」／詛咒「推過去按住＋紙錢繩」（凍結 docs/experiments/2026-10-05-grab-hands/acceptance.md）的 node 單元測試。
// 真畫面的條件（#2–#4、#6–#8 的量測）在 tests/tools/grab-probe.mjs；這裡守純函式與接線的不變量。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const GM = await import(pathToFileURL(path.join(root, 'js/grab-motion.js')).href);
const index = read('index.html'), tray = read('js/table-tray.js'), renderer = read('js/renderer.js'), motion = read('js/hand-motion.js');

const BOX = { x0: -0.7, x1: -0.2, y0: 0.152, y1: 0.99, z0: -0.1, z1: 0.3 };
const award = (ms = 1260, style = 'side') => GM.makeAwardScript({ seat: { x: 0, z: 1.22 }, from: { x: -0.45, y: 0.152, z: 0.1 }, box: BOX, tableY: 0.152, ms, style });

test('D3：GRAB_MS 單一來源——index.html CFG.GRAB_MS=1260 經 ys:reveal-result 的 grabMs 交給 3D；卡片等待由它推得', () => {
  assert.match(index, /GRAB_MS:\s*1260,/);
  assert.match(index, /grabMs:CFG\.GRAB_ON\?CFG\.GRAB_MS:0/);
  assert.match(index, /if\(CFG\.GRAB_ON&&TABLE3D\) await sleep\(CFG\.GRAB_MS\+CFG\.GRAB_CARD_GAP_MS\);\r?\n\s*else await sleep\(Math\.max\(0\.9\*1000,CFG\.T\*1\.4\)\);/);
  assert.match(renderer, /grabMs: d\.grabMs/);
  assert.equal(GM.GRAB.MS_REF, 1260);
});

test('一般得標：落定＝GRAB_MS、時間軸隨 GRAB_MS 等比縮放；落定後停 HOLD_S 才隱藏（D1）', () => {
  for (const ms of [1260, 900, 1600]) {
    const s = award(ms);
    assert.ok(Math.abs(s.landAt - ms / 1000) < 1e-9, `landAt ${s.landAt} ≠ ${ms / 1000}`);
    assert.ok(Math.abs(s.hideAt - (s.landAt + GM.GRAB.HOLD_S)) < 1e-9);
    const atLand = s.at(s.landAt), justBefore = s.at(s.hideAt - 1e-3), after = s.at(s.hideAt + 1e-3);
    assert.deepEqual([atLand.item.x, atLand.item.z].map((x) => +x.toFixed(9)), [s.dest.x, s.dest.z].map((x) => +x.toFixed(9)));
    assert.equal(justBefore.visible, true); assert.equal(after.visible, false);
  }
  assert.ok(award().landAt <= 1.3, '驗收 #2：落定 ≤1300ms');
});

test('掙扎：抓起階段法寶相對掌心的側向位移正負交替 ≥2 次、振幅 >0（拿掉掙扎就紅）', () => {
  const s = award(), T = GM.GRAB.T, rel = [];
  for (let t = T.grip; t <= T.carry; t += 1 / 120) { const f = s.at(t); const h = f.hands.w; rel.push((f.item.x - (h.at[0] - (s.at(T.grip + 1e-6).hands.w.at[0] - s.at(T.grip + 1e-6).item.x)))); }
  let flips = 0, sign = 0, amp = 0;
  for (let i = 1; i < rel.length - 1; i++) if ((rel[i] > rel[i - 1] && rel[i] >= rel[i + 1]) || (rel[i] < rel[i - 1] && rel[i] <= rel[i + 1])) { const sg = Math.sign(rel[i]); amp = Math.max(amp, Math.abs(rel[i])); if (sg && sg !== sign && Math.abs(rel[i]) > 1e-4) { flips++; sign = sg; } }
  assert.ok(flips >= 2, `交替峰 ${flips}`); assert.ok(amp > 0);
  assert.deepEqual(GM.struggle(0), { rx: 0, rz: 0, ry: 0, lat: 0, dy: 0 });
});

test('D2：扣法——side 扣肩頸（低於頂、指尖朝上＝手臂從下方伸來，不從天上伸下來）；top（西／東越中線）扣上緣；俯角都 < 0.62', () => {
  const side = award(1260, 'side').at(GM.GRAB.T.grip), top = award(1260, 'top').at(GM.GRAB.T.grip);
  assert.ok(side.hands.w.at[1] < BOX.y1 - 0.05, '側扣不扣頭頂');
  assert.ok(side.hands.w.pitch < 0, '側扣指尖朝上（手臂從低處伸來）');
  assert.ok(side.hands.w.pitch < 0.62 && top.hands.w.pitch < 0.62);
  assert.ok(top.hands.w.at[1] > BOX.y1, 'top 扣法掌心在拍品頂之上');
  assert.match(tray, /seats\.w === 2 && box\.x0 \+ box\.x1 > 0\) \|\| \(seats\.w === 3 && box\.x0 \+ box\.x1 < 0\) \? 'top' : 'side'/);
});

/* v0.61.1（docs/experiments/2026-10-05-curse-slow/acceptance.md；使用者簽核改寫 v0.60 的「落定 ≤1300ms」）：
   詛咒時長改由 CFG.CURSE_MS（預設 2000）單獨決定，與 GRAB_MS 脫鉤；落定＝CURSE_MS、推過桌心 ≥1.2s、按住 ≥0.6s。 */
test('v0.61.1 CURSE_MS 單一來源：index.html CFG.CURSE_MS=2000 經 ys:reveal-result 的 curseMs 交給 3D；揭卡等到按住結束（CURSE_CARD_K＝CURSE.T.hold/T.press）', () => {
  assert.match(index, /CURSE_MS: 2000,/);
  assert.match(index, /curseMs:CFG\.GRAB_ON\?CFG\.CURSE_MS:0/);
  assert.match(renderer, /curseMs: d\.curseMs/);
  assert.match(tray, /ms = Number\(kind === 'curse' \? effect\.curseMs : effect\.grabMs\)/);
  const K = Number((index.match(/CURSE_CARD_K: ([0-9.]+),/) || [])[1]);
  assert.ok(Math.abs(K - GM.CURSE.T.hold / GM.CURSE.T.press) < 1e-9, `CURSE_CARD_K ${K} ≠ hold/press`);
  assert.match(index, /await pwSleep\(Math\.max\(0,Math\.round\(Math\.max\(0,CFG\.CURSE_MS\)\*CFG\.CURSE_CARD_K\)-CFG\.GRAB_MS\)\);[^\n]*\r?\n\s*if\(CFG\.GRAB_ON&&TABLE3D\) await sleep\(CFG\.GRAB_MS\+CFG\.GRAB_CARD_GAP_MS\);/); // r2 條件 19：多等的那段可被跳過叫醒
});

test('詛咒 A＋C：施放者＝毒標得標席、受害者＝transferTarget；落定＝CURSE_MS（2000 → 1800–2200）、推 ≥1.2s、按住 ≥0.6s；繩只在按住階段、受害者顫抖', () => {
  assert.match(tray, /startGrab\(s, s\.curseAward, 'curse', \{ c: caster, v: target \}, effect\)/);
  assert.match(tray, /playCurseTransfer\(slot, effect\.transferTarget, winner, effect\)/);
  const s = GM.makeCurseScript({ seatC: { x: 0, z: -1.92 }, seatV: { x: 0, z: 1.22 }, from: { x: 0.45, y: 0.152, z: 0.1 }, box: { x0: 0.2, x1: 0.7, y0: 0.152, y1: 0.45, z0: -0.02, z1: 0.24 }, tableY: 0.152, ms: 2000 });
  assert.ok(s.landAt >= 1.8 && s.landAt <= 2.2, `落定 ${s.landAt}`);
  for (const ms of [1500, 2000, 2600]) { const x = GM.makeCurseScript({ seatC: { x: 0, z: -1.92 }, seatV: { x: 0, z: 1.22 }, from: { x: 0.45, y: 0.152, z: 0.1 }, box: { x0: 0.2, x1: 0.7, y0: 0.152, y1: 0.45, z0: -0.02, z1: 0.24 }, tableY: 0.152, ms }); assert.ok(Math.abs(x.landAt - ms / 1000) <= 0.1 * ms / 1000, `CURSE_MS=${ms} 落定 ${x.landAt}`); }
  /* 推過桌心：法寶開始離開原位 → 落定 ≥1.2s；按住：落定 → 施放者手開始離開 ≥0.6s */
  const p0 = s.at(0).item; let moved = null; for (let t = 0; t < s.landAt; t += 1 / 120) { const it = s.at(t).item; if (Math.hypot(it.x - p0.x, it.z - p0.z) > 1e-3) { moved = t; break; } }
  assert.ok(moved !== null && s.landAt - moved >= 1.2, `推 ${moved === null ? '量不到' : (s.landAt - moved).toFixed(3)}s`);
  const c0 = s.at(s.landAt + 0.15).hands.c.at; let off = null; for (let t = s.landAt + 0.15; t < s.end; t += 1 / 120) { const h = s.at(t).hands.c; if (!h || Math.hypot(h.at[0] - c0[0], h.at[1] - c0[1], h.at[2] - c0[2]) > 0.005) { off = t; break; } }
  assert.ok(off !== null && off - s.landAt >= 0.6, `按住 ${off === null ? '量不到' : (off - s.landAt).toFixed(3)}s`);
  for (let t = 0; t < s.end; t += 1 / 120) {
    const f = s.at(t);
    if (f.rope) assert.ok(t >= s.holdFrom - 1e-9 && t < s.holdTo + 1e-9, `繩出現在按住階段外 t=${t}`);
    if (t > s.holdFrom + 0.02 && t < s.holdTo - 0.02) assert.ok(f.rope && f.hands.c && f.hands.v, `按住階段缺繩或手 t=${t}`);
  }
  const ys = []; for (let t = s.holdFrom + 0.05; t < s.holdTo; t += 1 / 120) ys.push(s.at(t).hands.v.at[1]);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 0.002, '受害者手要抖');
});

test('v0.60.1 詛咒不拖回（docs/experiments/2026-10-05-curse-fix/acceptance.md #2）：按住起到演完，符紙堆停在受害者席前（dest）不動；受害者的手不往席位縮（只抖）', () => {
  const s = GM.makeCurseScript({ seatC: { x: 0, z: -1.92 }, seatV: { x: 0, z: 1.22 }, from: { x: 0.45, y: 0.152, z: 0.1 }, box: { x0: 0.2, x1: 0.7, y0: 0.152, y1: 0.45, z0: -0.02, z1: 0.24 }, tableY: 0.152, ms: 2000 });
  const v0 = s.at(s.holdFrom).hands.v.at, seatV = { x: 0, z: 1.22 }, dSeat0 = Math.hypot(v0[0] - seatV.x, v0[2] - seatV.z);
  for (let t = s.holdFrom; t <= s.end + 1e-9; t += 1 / 120) {
    const f = s.at(t);
    assert.ok(Math.hypot(f.item.x - s.dest.x, f.item.y - s.dest.y, f.item.z - s.dest.z) < 1e-9, `符紙堆離開席前 t=${t.toFixed(3)}`);
    if (f.hands.v) assert.ok(dSeat0 - Math.hypot(f.hands.v.at[0] - seatV.x, f.hands.v.at[2] - seatV.z) < 0.012, `受害者的手往席位縮（拖回） t=${t.toFixed(3)}`);
  }
  assert.equal('DRAG' in GM.CURSE, false);
});

test('v0.61.1 抬升規劃：符紙堆與兩手的高度 ≥ 可達需要量（不穿）且每格變化 ≤ 斜率上限（不瞬移）；按住段受害者固定、施放者不提早抬', () => {
  const s = GM.makeCurseScript({ seatC: { x: 0, z: -1.92 }, seatV: { x: 0, z: 1.22 }, from: { x: 0.45, y: 0.152, z: 0.1 }, box: { x0: 0.2, x1: 0.7, y0: 0.152, y1: 0.45, z0: -0.02, z1: 0.24 }, tableY: 0.152, ms: 2000 });
  const dt = 1 / 30, n = Math.ceil(s.end / dt) + 1, t = (i) => i * dt;
  /* 需要量：中途一段越過別件要抬 0.7（舊版會一幀跳上去）、受害者在按住時於 0.11／0.185 兩解間跳 */
  const Lc = [], Lv = [];
  for (let i = 0; i < n; i++) { Lc.push(t(i) < s.T.appr || t(i) >= s.T.gone ? -Infinity : t(i) > 0.9 && t(i) < 1.3 ? 0.7 : 0); Lv.push(t(i) < 0.6 || t(i) >= s.T.gone ? -Infinity : t(i) >= s.T.press ? (i % 2 ? 0.185 : 0.11) : 0.11); }
  const P = GM.planCurseLift(s, Lc, Lv, dt);
  for (let i = 0; i < n; i++) {
    if (Lc[i] > -Infinity) assert.ok(P.c[i] >= Lc[i] - 1e-9, `施放者低於需要量 i=${i}`);
    if (Lv[i] > -Infinity) assert.ok(P.v[i] >= Lv[i] - 1e-9, `受害者低於需要量 i=${i}`);
    if (i) for (const k of ['c', 'v', 'pile']) assert.ok(Math.abs(P[k][i] - P[k][i - 1]) <= Math.max(GM.CURSE.LIFT_SLOPE, GM.CURSE.LAND_SLOPE) * dt + 1e-9 || (k === 'c' && t(i) >= s.T.hold), `${k} 一格跳 ${(P[k][i] - P[k][i - 1]).toFixed(3)} i=${i}`);
    if (t(i) >= s.T.press && t(i) < s.T.gone) assert.ok(Math.abs(P.v[i] - 0.185) < 1e-9 && Math.abs(P.pile[i] - 0.185) < 1e-9, `按住段受害者／堆不固定 i=${i}`);
    if (t(i) >= s.T.press + 0.2 && t(i) < s.T.hold) assert.ok(Math.abs(P.c[i] - P.c[i - 1]) < 1e-9, `施放者在按住段移動 i=${i}`);
  }
  assert.ok(Math.abs(GM.planAt(P.pile, dt, s.landAt) - 0.185) < 1e-6, '落定時堆已在手背高度');
  assert.match(tray, /if \(kind === 'curse' && !effect\.skip\) \{ a\.grab\.planSt = planStart\(a\.grab\); planStep\(a\.grab, PLAN_FIRST\); \}/); // r2：規劃分攤到開演後數幀（條件 18）
  assert.match(motion, /Math\.max\(grabLift\(R0, fr, s, cons, obstacles, tableY, h\.seat\), sp\.minLift \|\| 0\)/);
});

test('v0.61.1 r2 貼桌繞行：planPath 的每一段都不穿進別件拍品外擴框；直線不撞就是直線；腳本照路徑走、符紙堆高度＝桌面；CURSE_MS≤0 不出 NaN', () => {
  const boxes = [{ x0: -0.64, x1: -0.25, z0: 0.01, z1: 0.21 }, { x0: 0.12, x1: 0.61, z0: -0.02, z1: 0.69 }];
  const r = 0.3, hit = (p, q) => boxes.some((o) => { for (let i = 1; i < 50; i++) { const u = i / 50, x = p[0] + (q[0] - p[0]) * u, z = p[1] + (q[1] - p[1]) * u; if (x > o.x0 - r + 1e-6 && x < o.x1 + r - 1e-6 && z > o.z0 - r + 1e-6 && z < o.z1 + r - 1e-6) return true; } return false; });
  const path = GM.planPath([-1.35, 0.1], [1.1, 0.97], boxes, r, { x0: -1.75, x1: 1.75, z0: -1.55, z1: 1.1 });
  assert.ok(path && path.length > 2, '要繞行');
  for (let i = 1; i < path.length; i++) assert.ok(!hit(path[i - 1], path[i]), `第 ${i} 段穿進別件 ${JSON.stringify(path)}`);
  assert.deepEqual(GM.planPath([0, -1], [0, -1.4], boxes, r), [[0, -1], [0, -1.4]]);
  const box = { x0: -1.6, x1: -1.1, y0: 0.152, y1: 0.45, z0: -0.05, z1: 0.26 };
  const s = GM.makeCurseScript({ seatC: { x: 0, z: 1.22 }, seatV: { x: 1.36, z: 1.06 }, from: { x: -1.35, y: 0.152, z: 0.1 }, box, tableY: 0.152, ms: 2000, vdir: [-0.7, -0.7], avoid: { boxes, area: { x0: -1.75, x1: 1.75, z0: -1.55, z1: 1.1 } } });
  assert.ok(s.route && s.route.length > 2);
  for (let t = s.T.appr; t < s.T.push; t += 0.05) { const it = s.at(t).item; assert.equal(it.y, 0.152, `推的時候堆離桌 t=${t}`); }
  for (const ms of [0, -5]) { const z = GM.makeCurseScript({ seatC: { x: 0, z: 1.22 }, seatV: { x: 1.36, z: 1.06 }, from: { x: -1.35, y: 0.152, z: 0.1 }, box, tableY: 0.152, ms }); assert.ok(Number.isFinite(z.landAt) && z.landAt <= 0.002 && Number.isFinite(z.at(0.0005).item.x)); }
});

test('v0.61.1 r3 手臂來向（acceptance 條件 25，覆審 H-2）：西塞南（槽 3 推給南席）推的整段施放者手臂朝向與「席位→符紙堆」夾角餘弦 ≥0.5、收手往自己席位退；北塞西鑽不過的那段手臂不偏、也不轉到推的方向後方', () => {
  const others = [{ x0: -1.543, x1: -1.149, z0: -0.043, z1: 0.254, top: 0.99 }, { x0: -0.645, x1: -0.255, z0: 0.012, z1: 0.213, top: 0.993 }, { x0: 0.125, x1: 0.613, z0: -0.022, z1: 0.68, top: 0.996 }];
  const area = { x0: -1.75, x1: 1.75, z0: -1.55, z1: 1.1 }, box = { x0: 1.106, x1: 1.596, y0: 0.152, y1: 0.475, z0: -0.048, z1: 0.263 }, from = { x: 1.35, y: 0.152, z: 0.1 };
  const cases = [['cWS', { x: -1.38, z: 0.98 }, { x: 0, z: 1.22 }, [-0.34, -0.94], 0.18], ['cNW', { x: 0, z: -1.92 }, { x: -1.38, z: 0.98 }, [0.98, -0.2], 0.42]];
  for (const [name, seatC, seatV, vdir, victimIn] of cases) {
    const s = GM.makeCurseScript({ seatC, seatV, from, box, tableY: 0.152, ms: 2000, vdir, victimIn, avoid: { boxes: others, area } });
    assert.ok(s.route, `${name} 要有繞行路徑`);
    for (let t = 0.02; t < s.T.press; t += 0.02) {
      const f = s.at(t), h = f.hands.c, d = [f.item.x - seatC.x, f.item.z - seatC.z], l = Math.hypot(d[0], d[1]);
      const cos = (Math.sin(h.yaw) * d[0] + Math.cos(h.yaw) * d[1]) / l;
      assert.ok(cos >= 0.5, `${name} 推的階段手臂不是從自己席位來 t=${t.toFixed(2)} cos=${cos.toFixed(2)}`);
    }
    for (let t = s.T.hold + 0.02; t < s.T.gone - 0.02; t += 0.02) {
      const a = s.at(t).hands.c.at, b = s.at(t + 0.02).hands.c.at, m = [b[0] - a[0], b[2] - a[2]], w = [seatC.x - a[0], seatC.z - a[2]];
      const cos = (m[0] * w[0] + m[1] * w[1]) / (Math.hypot(m[0], m[1]) * Math.hypot(w[0], w[1]) || 1);
      assert.ok(cos >= 0.5, `${name} 收手不是往自己席位退 t=${t.toFixed(2)} cos=${cos.toFixed(2)}`);
    }
  }
});

test('v0.61.1 r3 符紙堆自己的抬升（acceptance 條件 26、14）：給 Lp 時堆照 Lp 走（施放者手臂越過別件要抬 0.7，堆不跟著抬）、施放者仍不低於堆；落定後堆停在手背高度直到隱藏（不在最後幾幀往下沉）', () => {
  const s = GM.makeCurseScript({ seatC: { x: 0, z: -1.92 }, seatV: { x: 0, z: 1.22 }, from: { x: 0.45, y: 0.152, z: 0.1 }, box: { x0: 0.2, x1: 0.7, y0: 0.152, y1: 0.45, z0: -0.02, z1: 0.24 }, tableY: 0.152, ms: 2000 });
  const dt = 1 / 15, n = Math.ceil(s.end / dt) + 1, t = (i) => i * dt, Lc = [], Lv = [], Lp = [];
  for (let i = 0; i < n; i++) {
    Lc.push(t(i) >= s.T.gone ? -Infinity : t(i) > 0.9 && t(i) < 1.3 ? 0.7 : 0);
    Lv.push(t(i) < 0.6 || t(i) >= s.T.gone ? -Infinity : 0.1);
    Lp.push(t(i) < s.T.appr || t(i) >= s.T.press ? -Infinity : t(i) > 0.5 && t(i) < 0.7 ? 0.11 : 0); // 推到半路壓過一柱錢（頂比桌高 0.11）
  }
  const P = GM.planCurseLift(s, Lc, Lv, dt, undefined, undefined, Lp);
  for (let i = 0; i < n; i++) {
    if (t(i) >= s.T.appr && t(i) < s.riseFrom) assert.ok(P.pile[i] <= 0.11 + 1e-9, `推的時候堆跟著手臂抬到 ${P.pile[i].toFixed(3)} i=${i}`);
    if (Lp[i] > -Infinity) assert.ok(P.pile[i] >= Lp[i] - 1e-9, `堆低於自己要抬的量（壓進錢柱） i=${i}`);
    if (Lc[i] > -Infinity) assert.ok(P.c[i] >= Lc[i] - 1e-9, `施放者低於需要量 i=${i}`);
    if (t(i) >= s.T.appr && t(i) < s.T.hold) assert.ok(P.c[i] >= P.pile[i] - 1e-9, `施放者陷進堆裡 i=${i}`);
    if (t(i) >= s.T.press && t(i) <= s.end + 1e-9) assert.ok(Math.abs(P.pile[i] - 0.1) < 1e-9, `落定後堆沒停在手背高度 i=${i} ${P.pile[i].toFixed(3)}`);
  }
});

test('v0.61.1 r3 五種詛咒物（acceptance 條件 27）：外框底不在原點的詛咒物，落定時「堆底」仍在桌面＋HAND_TOP（壓在手背上，不浮在手上方）；施放者掌心蓋在看得見的堆頂', () => {
  for (const lift of [0, 0.024, 0.044]) {
    const box = { x0: 0.2, x1: 0.7, y0: 0.152 + lift, y1: 0.45, z0: -0.02, z1: 0.24 };
    const s = GM.makeCurseScript({ seatC: { x: 0, z: -1.92 }, seatV: { x: 0, z: 1.22 }, from: { x: 0.45, y: 0.152, z: 0.1 }, box, tableY: 0.152, ms: 2000 });
    assert.ok(Math.abs(s.dest.y + (box.y0 - 0.152) - (0.152 + GM.CURSE.HAND_TOP)) < 1e-9, `外框底高 ${lift}：落定堆底 ${(s.dest.y + box.y0 - 0.152).toFixed(3)}`);
  }
  assert.match(tray, /curseScript\(seats, a\.from, Object\.assign\(\{\}, box, \{ y1: visTop\(node, box\.y1\) \}\)/);
});

test('v0.61.1 r3 錢柱（acceptance 條件 26、3）：手蓋上後等落標的錢從堆底下扒過去才推（goAt，上限 GO_MAX）；堆抬過錢柱的升降速度 ≤ PILE_SLOPE（不一跳、鏡頭不甩）', () => {
  const base = { seatC: { x: 0, z: -1.92 }, seatV: { x: 0, z: 1.22 }, from: { x: 0.45, y: 0.152, z: 0.1 }, box: { x0: 0.2, x1: 0.7, y0: 0.152, y1: 0.45, z0: -0.02, z1: 0.24 }, tableY: 0.152, ms: 2000 };
  const s = GM.makeCurseScript(Object.assign({}, base, { goAt: 0.55 }));
  for (let t = 0; t <= 0.55; t += 0.01) { const it = s.at(t).item; assert.ok(Math.hypot(it.x - 0.45, it.z - 0.1) < 1e-9, `等錢扒過之前堆就動了 t=${t.toFixed(2)}`); }
  assert.ok(Math.hypot(s.at(0.7).item.x - 0.45, s.at(0.7).item.z - 0.1) > 1e-3, 'goAt 之後要推');
  assert.ok(Math.abs(s.landAt - 2.0) < 1e-9, '落定時刻不變');
  const cap = GM.makeCurseScript(Object.assign({}, base, { goAt: 5 }));
  assert.ok(Math.abs(cap.T.go - (cap.T.appr + GM.CURSE.GO_MAX)) < 1e-9, '等待有上限');
  const dt = 1 / 15, n = Math.ceil(s.end / dt) + 1, t = (i) => i * dt, Lc = [], Lv = [], Lp = [];
  for (let i = 0; i < n; i++) { Lc.push(t(i) >= s.T.gone ? -Infinity : 0); Lv.push(t(i) < 0.6 || t(i) >= s.T.gone ? -Infinity : 0.1); Lp.push(t(i) < s.T.appr || t(i) >= s.T.press ? -Infinity : t(i) > 0.8 && t(i) < 1.1 ? 0.15 : 0); }
  const P = GM.planCurseLift(s, Lc, Lv, dt, undefined, undefined, Lp);
  for (let i = 1; i < n; i++) if (t(i) < s.riseFrom) assert.ok(Math.abs(P.pile[i] - P.pile[i - 1]) <= GM.CURSE.PILE_SLOPE * dt + 1e-9, `堆一格跳 ${(P.pile[i] - P.pile[i - 1]).toFixed(3)} i=${i}`);
});

test('D5：紙錢繩幾何預建——new THREE.TubeGeometry 全檔只有一處，且在 ropeMesh() 的「已建就回」守衛之後（每幀 0 次重建）；不 dispose 繩幾何', () => {
  const hits = tray.match(/new THREE\.TubeGeometry/g) || [];
  assert.equal(hits.length, 1);
  const fn = tray.slice(tray.indexOf('function ropeMesh()'), tray.indexOf('function drawRope('));
  assert.match(fn, /^function ropeMesh\(\) \{\s+if \(rope\) return rope;/);
  assert.ok(fn.includes('new THREE.TubeGeometry'));
  const draw = tray.slice(tray.indexOf('function drawRope('), tray.indexOf('function drawRope(') + 1200);
  assert.doesNotMatch(draw, /TubeGeometry|dispose\(/);
});

test('D6：純呈現——grab-motion 不碰亂數、不讀賽局；?grab=0 與 CFG.GRAB_ON 兩道開關都在', () => {
  const gm = read('js/grab-motion.js');
  assert.doesNotMatch(gm, /Math\.random|__yaoshi|\bS\./);
  assert.match(tray, /get\('grab'\) === '0'/);
  assert.match(index, /get\("grab"\)==="0"\) CFG\.GRAB_ON=false/);
  assert.match(tray, /function grabWanted\(effect\) \{ return !GRAB_URL_OFF && handsOn && Number\(effect && effect\.grabMs\) > 0 && hands\.loaded\(\); \}/);
});

test('D4：抓取專用可達只作用於 grab 類——frames() 在 REACH／俯角掃描之前分流；reveal 不覆寫抓取中的手', () => {
  assert.match(motion, /if \(h\.act\.kind === 'grab'\) return grabFrame\(h, s, R0, obstacles, tableY\);/);
  assert.match(motion, /if \(hands\[s\]\.act && hands\[s\]\.act\.kind === 'grab'\) continue;/);
  assert.match(tray, /AWARD_FLY_S: 0\.86,/); assert.match(tray, /CURSE_FLY_S: 0\.72,/);
});

test('跳過：doSkip 的 ys:fx-trait-cancel 先把抓取演出跳到終態再收手；跳過中才開的件 3D 直接到終態', () => {
  assert.match(renderer, /tray\.props\.finish\(\); tray\.finishGrabs\(\); tray\.hands\.finish\(\);/);
  assert.match(index, /skip:CFG\.GRAB_ON&&!!SKIP\}\);/);
  assert.match(renderer, /if \(!d\.skip\) tray\.hands\.reveal\(d\.slot, d\.winner\);/);
  assert.match(tray, /if \(effect\.skip\) \{ finishGrab\(s\); return; \}/);
});

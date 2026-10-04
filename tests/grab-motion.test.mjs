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

test('詛咒 A＋C：施放者＝毒標得標席、受害者＝transferTarget；落定 ≤1300ms；繩只在按住階段、受害者顫抖', () => {
  assert.match(tray, /startGrab\(s, s\.curseAward, 'curse', \{ c: caster, v: target \}, effect\)/);
  assert.match(tray, /playCurseTransfer\(slot, effect\.transferTarget, winner, effect\)/);
  const s = GM.makeCurseScript({ seatC: { x: 0, z: -1.92 }, seatV: { x: 0, z: 1.22 }, from: { x: 0.45, y: 0.152, z: 0.1 }, box: { x0: 0.2, x1: 0.7, y0: 0.152, y1: 0.45, z0: -0.02, z1: 0.24 }, tableY: 0.152, ms: 1260 });
  assert.ok(s.landAt <= 1.3);
  for (let t = 0; t < s.end; t += 1 / 120) {
    const f = s.at(t);
    if (f.rope) assert.ok(t >= s.holdFrom - 1e-9 && t < s.holdTo + 1e-9, `繩出現在按住階段外 t=${t}`);
    if (t > s.holdFrom + 0.02 && t < s.holdTo - 0.02) assert.ok(f.rope && f.hands.c && f.hands.v, `按住階段缺繩或手 t=${t}`);
  }
  const ys = []; for (let t = s.holdFrom + 0.05; t < s.holdTo; t += 1 / 120) ys.push(s.at(t).hands.v.at[1]);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 0.002, '受害者手要抖');
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

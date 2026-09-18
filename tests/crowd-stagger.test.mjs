/* A3 S6 滿編構圖小卷（凍結 #10，2026-09-18）：兩條允許的改法各自的純函式語意。
 *   ① 同型錯位（duel-figures.js dupGroups／dupStagger）：同一側同 ab 多隻才有位移；名冊裡沒有同型 ⇒ 三個分量全 0
 *      （沒有同型的對決像素必須與 v0.57.31 相同——這條就是守它）。
 *   ② 描邊改主色（creature-figures.js MAIN_OUTLINE／outlineColorFromHex）：主色 hex 必須等於該尊 assets/creatures/<ab>.json
 *      的 palette 色（單一事實來源在 JSON，程式表只是快取）；輸出明度低於 bloom 門檻（描邊卷第 3 輪教訓：0.5 以上三系全被打成同一種黃光暈）。
 * 「遮擋率 ≤30%、讀者 ≥4/6」的行為紅綠在 tests/tools/crowd-occl.mjs 與 docs/experiments/2026-09-18-a3-crowd/。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
register('./tools/three-node-resolver.mjs', import.meta.url);
const THREE = await import('three');

const noop = () => {};
const ctx2d = () => new Proxy({}, {
  get: (t, k) => (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop),
  set: (t, k, v) => { t[k] = v; return true; },
});
if (typeof globalThis.document === 'undefined') {
  const evt = new EventTarget();
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, style: {}, getContext: ctx2d }),
    addEventListener: evt.addEventListener.bind(evt), removeEventListener: evt.removeEventListener.bind(evt), dispatchEvent: evt.dispatchEvent.bind(evt),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: { style: {}, appendChild: noop }, documentElement: { style: {} }, hidden: false,
  };
}
globalThis.fetch = () => new Promise(() => {});
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

const A2_ROSTER = (k) => [k, k, k, 'fushou', 'ashcharm', 'boartusk', 'shanshen', 'wangchuan'].map((ab, id) => ({ id, ab }));

test('dupGroups：只有同一側同 ab ≥2 隻才成組；無同型／紙紮（無 ab）一律 null', async () => {
  const { dupGroups } = await load('js/duel-figures.js');
  const distinct = dupGroups(['a', 'b', 'c', 'd'].map((ab, id) => ({ id, ab })));
  assert.deepEqual(distinct, [null, null, null, null]);
  const paper = dupGroups([{ id: 0, m: '小紙人' }, { id: 1, m: '小紙人' }, { id: 2, m: '小紙人' }]);
  assert.deepEqual(paper, [null, null, null], '紙紮沒有 ab，不算同型（它們本來就走另一條皮）');
  const g = dupGroups(A2_ROSTER('boat'));
  assert.deepEqual(g.slice(0, 3), [{ i: 0, n: 3 }, { i: 1, n: 3 }, { i: 2, n: 3 }]);
  assert.deepEqual(g.slice(3), [null, null, null, null, null]);
  // 福壽綿長：本件 ×3 ＋ 重型名單裡那一隻 ⇒ 4 隻一組（讀者材料的目標框就是 4 個）
  const f = dupGroups(A2_ROSTER('fushou'));
  assert.deepEqual(f.map((x) => x && x.n), [4, 4, 4, 4, null, null, null, null]);
  assert.deepEqual(f.filter(Boolean).map((x) => x.i), [0, 1, 2, 3]);
});

test('dupStagger：無同型 ⇒ 三分量全 0；同型三隻 ⇒ 朝向對稱且互異、前排一對內外分開、後排那隻只往前帶不左右挪', async () => {
  const { dupStagger } = await load('js/duel-figures.js');
  assert.deepEqual(dupStagger(null, 0, 2, 0), { lane: 0, depth: 0, yawDeg: 0 });
  assert.deepEqual(dupStagger(null, 1, 1, 1), { lane: 0, depth: 0, yawDeg: 0 });
  // 同型三隻（8v8 每排 2 尊）：兩隻在群組最前排（k=0,1、rowsBehind 0）、第三隻在下一排 k=0（rowsBehind 1，原位正好在前排兩隻正後方偏外）
  const s0 = dupStagger({ i: 0, n: 3 }, 0, 2, 0), s1 = dupStagger({ i: 1, n: 3 }, 1, 2, 0), s2 = dupStagger({ i: 2, n: 3 }, 0, 2, 1);
  const yaws = [s0.yawDeg, s1.yawDeg, s2.yawDeg];
  assert.equal(new Set(yaws).size, 3, '三隻朝向要互異（剪影才不同）');
  const mean = yaws.reduce((a, b) => a + b, 0) / 3;
  assert.ok(Math.abs((s0.yawDeg - mean) + (s2.yawDeg - mean)) < 1e-9 && Math.abs(s1.yawDeg - mean) < 1e-9, '朝向級距對稱分佈（相對群平均）');
  assert.ok(s0.lane < 0 && s1.lane > 0, '前排兩隻往內／往外分開（lane 異號、k=0 往內），把中間讓出來');
  assert.equal(s0.depth, 0); assert.equal(s1.depth, 0);
  // r1／r2 量測的教訓：後排那隻在橫向帶裡往內／居中／往外都被擋（前排同型或旁邊的重型）；唯一出口是往前帶到前線
  assert.equal(s2.lane, 0, '後排那隻橫向不動（原位＋brickShift 已在前排兩隻中間）');
  assert.ok(s2.depth > 0, '後排那隻往前（layout 再加 rowsBehind×排距，帶到前排深度）');
  // ≥4 隻的群（福壽：本件 ×3＋重型名單那隻）：後排 k1 同樣整排帶前（r4 試過只帶一半成階梯更差，撤回）
  const s3 = dupStagger({ i: 3, n: 4 }, 1, 2, 1);
  assert.equal(s3.lane, 0); assert.ok(s3.depth > 0);
  for (const s of [s0, s1, s2]) for (const v of Object.values(s)) assert.ok(Number.isFinite(v));
  // 決定性：同輸入同輸出
  assert.deepEqual(dupStagger({ i: 1, n: 3 }, 1, 2, 0), s1);
});

test('MAIN_OUTLINE：三件主色 hex 逐一等於 assets/creatures/<ab>.json 的 palette 色', async () => {
  const { MAIN_OUTLINE } = await load('js/creature-figures.js');
  for (const ab of ['boat', 'fushou', 'redhat']) {
    assert.ok(MAIN_OUTLINE[ab], `缺 ${ab}`);
    const spec = JSON.parse(fs.readFileSync(path.join(ROOT, `assets/creatures/${ab}.json`), 'utf8'));
    const entry = spec.palette[MAIN_OUTLINE[ab].mat];
    assert.ok(entry && entry.color, `${ab}.json palette 沒有 ${MAIN_OUTLINE[ab].mat}`);
    assert.equal(MAIN_OUTLINE[ab].hex, parseInt(entry.color.slice(1), 16), `${ab} 主色與 JSON 不同（單一事實來源在 JSON）`);
  }
});

test('outlineColorFromHex：保留主色色相、明度壓在 bloom 門檻下，且與該系描邊色不同（不是空改）', async () => {
  const { MAIN_OUTLINE, outlineColorFromHex, outlineColorOf } = await load('js/creature-figures.js');
  const FAC = { boat: 'zuling', fushou: 'xianghuo', redhat: 'yinqi' };
  const hsl = (hex) => { const h = {}; new THREE.Color(hex).getHSL(h, THREE.SRGBColorSpace); return h; };
  for (const ab of ['boat', 'fushou', 'redhat']) {
    const src = MAIN_OUTLINE[ab].hex, out = outlineColorFromHex(src);
    const a = hsl(src), b = hsl(out);
    const dh = Math.min(Math.abs(a.h - b.h), 1 - Math.abs(a.h - b.h));
    assert.ok(dh < 0.02, `${ab} 色相跑掉：${a.h.toFixed(3)} → ${b.h.toFixed(3)}`);
    assert.ok(b.l < 0.5 && b.l > 0.2, `${ab} 描邊明度 ${b.l.toFixed(3)} 要在 (0.2, 0.5)：≥0.5 會被 bloom 打成黃光暈`);
    assert.notEqual(out, outlineColorOf(FAC[ab]), `${ab} 主色描邊與系色描邊相同＝這條改法沒生效`);
  }
  assert.equal(outlineColorFromHex(0xad1420), outlineColorFromHex(0xad1420), '決定性');
});

/* A1 兩趟繪製修補（2026-09-17）：three 0.158 對 transparent＋DoubleSide 的材質每幀分 BackSide／FrontSide
 * 兩趟畫，每趟 needsUpdate=true → 每顆材質每幀 2 次 getParameters／cache key、2 次 draw（renderObject，
 * three.module.js:29722）。桌面平貼 decal 正背面不會在螢幕上重疊，單趟畫像素相同（真實頁面 A/B 見
 * docs/experiments/2026-09-17-a1-program-churn）。這裡走真實建構路徑斷言旗標，不做字串比對。 */
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
register('./tools/three-node-resolver.mjs', import.meta.url);
const THREE = await import('three');

// particles.js 的軟點貼圖在建構時要 canvas 2D；Node 沒有 DOM，給只夠建構（不渲染）的最小 stub。
if (typeof globalThis.document === 'undefined') {
  const noop = () => {};
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ({ createRadialGradient: () => ({ addColorStop: noop }), fillRect: noop, fillStyle: null }) }),
    addEventListener: noop, removeEventListener: noop, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    body: { style: {}, appendChild: noop }, documentElement: { style: {} }, hidden: false,
  };
}

const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const makeScene = () => ({ scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(50, 844 / 390, 0.1, 100) });

/** 場景裡所有 transparent＋DoubleSide 的材質，鍵＝物件名（或父名），值＝材質。 */
function twoPassCandidates(root) {
  const out = new Map();
  root.traverse((o) => {
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m && m.transparent === true && m.side === THREE.DoubleSide) out.set(o.name || o.parent?.name || `${o.type}#${o.id}`, m);
    }
  });
  return out;
}

test('table tray + props: every transparent DoubleSide decal material renders in one pass', async () => {
  const { createTableTray } = await load('js/table-tray.js');
  const { scene, camera } = makeScene();
  createTableTray(scene, camera, {});
  const mats = twoPassCandidates(scene);
  for (const name of ['tray-cinnabar-runes', 'tray-moon-benefit', 'prop-contact-shadows']) {
    assert.ok(mats.has(name), `${name} 應存在且為 transparent＋DoubleSide（真實頁面量到每幀重走 getProgram 的那三顆）`);
    assert.equal(mats.get(name).forceSinglePass, true, `${name} 必須 forceSinglePass=true，否則 three 0.158 每幀分兩趟畫並兩次 needsUpdate`);
  }
  for (const [name, m] of mats) assert.equal(m.forceSinglePass, true, `${name} 仍是兩趟繪製`);
});

test('trait-fx templates: MAT_GLOW / MAT_SOLID warm-up meshes render in one pass', async () => {
  const { createTraitFx } = await load('js/trait-fx.js');
  const { scene, camera } = makeScene();
  createTraitFx(scene, camera, {}, {});
  // 三支模板各有一個常駐桌底的暖身物件（trait-fx.js matPrograms 註解）；Mesh 用的兩支就是 MAT_GLOW／MAT_SOLID
  const mats = [...twoPassCandidates(scene).entries()].filter(([, m]) => m.isMeshBasicMaterial && m.fog === false && m.toneMapped === false);
  assert.equal(mats.length, 2, `應掃到 MAT_GLOW 與 MAT_SOLID 兩支暖身 Mesh 的材質，實得 ${mats.length}`);
  const blendings = new Set(mats.map(([, m]) => m.blending));
  assert.deepEqual([...blendings].sort(), [THREE.NormalBlending, THREE.AdditiveBlending].sort(), '兩支應一加色一實心');
  for (const [name, m] of mats) assert.equal(m.forceSinglePass, true, `${name}（blending=${m.blending}）必須 forceSinglePass=true`);
});

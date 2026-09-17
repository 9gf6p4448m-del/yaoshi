/* A1 對決側兩趟繪製修補（2026-09-17，第四個單一修補）：three 0.158 對 transparent＋DoubleSide 的材質每幀分
 * BackSide／FrontSide 兩趟畫、每趟 needsUpdate=true（renderObject，three.module.js:29725／29729）。對決畫面真實
 * 量到 26 顆：每隻 buoy 的水面 5 片（creature-figures.js makeWaterPool）＋殘日的餘暉碟（duel-figures.js
 * makeLegendKit aura='afterglow'），每 rAF 共 52 次 getParameters、26 次多餘 draw；三個取樣同幀像素 A/B 翻轉旗標 0 相異
 * （docs/experiments/2026-09-17-a1-duel-singlepass）。這裡走真實建構路徑斷言旗標，不做字串比對。 */
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
register('./tools/three-node-resolver.mjs', import.meta.url);
const THREE = await import('three');

// Node 沒有 DOM：傳說配件的紋理（radialTex／名牌）要 canvas 2D，給只夠建構（不渲染）的 Proxy 上下文；
// createDuelFigures 掛 document 事件（本測試不走它，但模組頂層可能摸 document）；GLB 永遠載不完，只驗同步建構出來的東西。
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

/** 子樹裡所有 transparent＋DoubleSide 的 MeshBasicMaterial，附幾何型別方便逐片點名。 */
function twoPassCandidates(root) {
  const out = [];
  root.traverse((o) => {
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m && m.isMeshBasicMaterial && m.transparent === true && m.side === THREE.DoubleSide) out.push({ name: o.name || o.parent?.name || `${o.type}#${o.id}`, geometry: o.geometry?.type, blending: m.blending, m });
    }
  });
  return out;
}

test('creature water pool (ab=buoy): disc, edge glow and 3 ripple rings render in one pass', async () => {
  const { makeCreatureFigure } = await load('js/creature-figures.js');
  const fig = makeCreatureFigure({ glbUrl: 'assets/creatures/buoy.glb', ab: 'buoy' });
  const water = fig.group.getObjectByName('ground-water');
  assert.ok(water, 'ab=buoy 必須同步掛上 ground-water（CREATURE_GROUND.buoy = water）');
  const mats = twoPassCandidates(water);
  assert.equal(mats.length, 5, `水面應是 5 片 transparent＋DoubleSide（圓盤、緣光、3 環），實得 ${mats.length}`);
  const geos = mats.map((x) => x.geometry).sort();
  assert.deepEqual(geos, ['CircleGeometry', 'RingGeometry', 'RingGeometry', 'RingGeometry', 'RingGeometry']);
  const blendings = mats.map((x) => x.blending).sort();
  assert.deepEqual(blendings, [THREE.NormalBlending, THREE.AdditiveBlending, THREE.AdditiveBlending, THREE.AdditiveBlending, THREE.AdditiveBlending].sort(), '圓盤 Normal、緣光與 3 環 Additive');
  for (const x of mats) assert.equal(x.m.forceSinglePass, true, `${x.geometry}（blending=${x.blending}）必須 forceSinglePass=true，否則 three 0.158 每幀分兩趟畫並兩次 needsUpdate`);
  fig.dispose?.();
});

test('legend kit: canri afterglow disc renders in one pass; dashiye / youyinggong have no such material', async () => {
  const { makeLegendKit } = await load('js/duel-figures.js');
  const canri = makeLegendKit('canri', '殘日');
  const aura = canri.group.getObjectByName('legend-aura');
  assert.ok(aura, '殘日必須有 legend-aura 群組');
  const mats = twoPassCandidates(aura);
  assert.equal(mats.length, 1, `餘暉碟應是 1 片 transparent＋DoubleSide 的 PlaneGeometry，實得 ${mats.length}`);
  assert.equal(mats[0].geometry, 'PlaneGeometry');
  assert.equal(mats[0].m.forceSinglePass, true, '餘暉碟必須 forceSinglePass=true');
  canri.dispose?.();
  for (const ab of ['dashiye', 'youyinggong']) {
    const kit = makeLegendKit(ab, ab);
    assert.equal(twoPassCandidates(kit.group).length, 0, `${ab} 沒有餘暉碟，不該有 transparent＋DoubleSide 的 MeshBasicMaterial（本卷沒動到它）`);
    kit.dispose?.();
  }
});

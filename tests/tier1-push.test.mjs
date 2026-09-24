import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { msOf } from './tools/fx-consts.mjs';
const require = createRequire(new URL('../tools/anyCreature/package.json', import.meta.url));
const THREE = require('three');
const code = fs.readFileSync(new URL('../js/camera-director.js', import.meta.url), 'utf8')
  .replace("import * as THREE from 'three';", '').replace('export function', 'function');
function fixture(reduced = false) {
  let now = 1000;
  const listeners = new Map();
  const env = { THREE, performance: { now: () => now }, window: { matchMedia: () => ({ matches: reduced }) },
    document: { addEventListener: (n, f) => listeners.set(n, f) } };
  vm.createContext(env); vm.runInContext(code, env);
  const camera = new THREE.PerspectiveCamera(45, 2, .1, 100);
  const director = env.createCameraDirector(camera, [{}, {}, {}, {}]);
  const fire = (name, detail = {}) => listeners.get(name)?.({ detail });
  const step = (ms) => { now += ms; director.update(ms / 1000, now); return camera.position.length(); };
  fire('ys:duel', { a: 0, b: 1 }); for (let i = 0; i < 180; i++) step(1000 / 60);
  return { fire, step, director };
}
const trait = { side: 'A', tier: 1, ms: msOf(1), shortPush: true };
{
  const f = fixture(); f.fire('ys:fx-trait', trait);
  assert.ok(f.step(msOf(1) / 2) < 4.15, '主角短招必須有可辨識輕推');
  assert.ok(f.step(0) >= 4.09, '最多推近 0.10');
  assert.ok(Math.abs(f.director.framingDistance() - 4.2) < 1e-6, '排陣距離不被微推改變');
  assert.equal(f.director.cinemaOn(), false);
  assert.ok(Math.abs(f.step(msOf(1) / 2) - 4.2) < 1e-6, '短招結束完整回位');
}
for (const detail of [{ ...trait, shortPush: false }, { ...trait, tier: 2 }, { ...trait, tier: 3, cinema: false }]) {
  const f = fixture(); f.fire('ys:fx-trait', detail);
  assert.ok(Math.abs(f.step(msOf(1) / 2) - 4.2) < 1e-6, '非主角／非 tier1 不推距離');
}
{
  const f = fixture(true); const before = f.step(0); f.fire('ys:fx-trait', trait);
  assert.equal(f.step(msOf(1) / 2), before, 'reduced-motion 不推');
}
for (const name of ['ys:fx-trait-cancel', 'ys:duel-end', 'ys:table', 'ys:end']) {
  const f = fixture(); f.fire('ys:fx-trait', trait); f.step(msOf(1) / 2); f.fire(name);
  f.step(100); assert.equal(f.director.shortPushK(), 0, `${name} 完整收回`);
}
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /shortPush:tier===1&&ctx\.shortPush===true&&pwCloseup\(\)/, 'closeup=0 不能派推鏡');
assert.match(html, /shortPush:mvTier===1&&!shortPushed/);
assert.match(html, /if\(mvTier===1\) shortPushed=true/);
// 跑真正 pwPlayBeat；用兩支同拍招式驗證事件，再跑下一拍驗證額度重置。
const events = [];
const noop = () => {};
const stage = {
  Date, Set, Map, Math, Promise, SKIP: false, S: { rngUi: () => 0 },
  FXC: { tiers: {}, beats: {}, traits: {}, beat: 0, trait: 0 },
  PHASES: {}, BEAT_FAC: [], BEAT_NAME: ['一', '二'], PW_BEAT_SFX: [],
  PW_FX: {}, PW_BEAT_LOG: null, TRAIT_ITEM: {}, TRAITS: {}, TRUE_DESTINY_MOVES: {},
  pwBeatTier: () => 1, pwThin: x => x, pwCloseup: () => true,
  pwEvFac: () => 'x', pwMoveTier: () => 1, pwTierMs: msOf, pwBeatMinMs: msOf,
  pwTraitFx: (id, ctx) => { events.push(ctx.shortPush); return true; },
  pwSleep: async () => {}, pwCap: noop, pwLamps: noop, sfx: noop, pwMoveCap: noop,
  pwFigsOf: noop, pwFigureOf: noop, fx3d: noop, pwActorCard: noop, $: noop,
};
vm.createContext(stage);
vm.runInContext(html.slice(html.indexOf('async function pwPlayBeat('), html.indexOf('async function playDuelWar(')), stage);
const fight = { war: {}, A: { name: 'A' }, B: { name: 'B' } };
const list = [{ kind: 'trait', trId: 'x', side: 'A' }, { kind: 'trait', trId: 'y', side: 'B' }];
await stage.pwPlayBeat(fight, 1, list, {});
await stage.pwPlayBeat(fight, 2, list, {});
assert.deepEqual(events, [true, false, true, false]);
console.log('tier1-push: camera envelope, tier gates, reduced motion, cancel/end and per-beat wiring PASS');

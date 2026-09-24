import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadCrossNightRestoreEngineV9,
  readCrossNightContractV9,
} from './l1e-cross-night-restore-adapter-v9.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONTRACT_PATH = path.join(ROOT, 'docs/experiments/2026-09-23-destiny/model-contract-v10.json');
const PRODUCT_PIN = Object.freeze({
  commit: 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a',
  gitBlobOid: '8ba772b9d960eff8b9c42eac77040433f809c57d',
  sha256: '8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d',
});
const NODE_SCHEMA = 'yaoshi.l1e.wishChanceNode.v10';
const NODE_ID = 'night.drawWishes';
const ABSTRACT_DRAW = 'Each gameplay S.rng() call is an independent U[0,1) chance draw conditional on the current game state.';
const ABSTRACT_MAPPING = 'The pinned drawWishes maps each draw to floor(u * eligiblePool.length).';
const ABSTRACT_LIMITATION = 'Weights are exact for this abstract chance-call law, not for the finite 32-bit seed distribution or correlations of the concrete mulberry32 stream. Full chance remains incomplete until that modeling boundary is accepted or replaced by an exact seed-space model.';
const NODE_CONTRACT = Object.freeze({
  support: 'For each living seat, use the pinned WISHES insertion order and the options whose canDraw(player) is true; if that support is empty, the engine falls back to all wishes. Dead seats receive wish=null and consume no draw. If wishes are disabled or the table is empty, the draw node is a no-op.',
  outcome: 'The chosen wish id and any deterministic target(player) result; done starts false.',
  weight: 'The joint profile has exact weight product_i(1 / supportSize_i), conditional on the frozen pre-draw state and iid-uniform-rng-call-v1.',
  rngConsumption: 'Exactly one gameplay draw per living seat when wishes are enabled and the wish table is non-empty.',
});
const V10_ENGINES = new WeakSet();
const V10_NODES = new WeakSet();
const V10_WISH_TABLES = new WeakMap();
const V10_ENGINE_SHAPES = new WeakMap();

function captureEngineShape(engine) {
  const engineGame = Object.getOwnPropertyDescriptor(engine, 'G');
  if (!engineGame || !Object.hasOwn(engineGame, 'value') || !engineGame.value || typeof engineGame.value !== 'object')
    throw new TypeError('the pinned engine must expose a stable game object');
  const game = engineGame.value;
  const wishes = Object.getOwnPropertyDescriptor(game, 'WISHES');
  const drawWishes = Object.getOwnPropertyDescriptor(game, 'drawWishes');
  const config = Object.getOwnPropertyDescriptor(game, 'CFG');
  const state = Object.getOwnPropertyDescriptor(game, 'S');
  if (!wishes || !Object.hasOwn(wishes, 'value') || !drawWishes || !Object.hasOwn(drawWishes, 'value') ||
      typeof drawWishes.value !== 'function' || !config || !Object.hasOwn(config, 'value') ||
      !config.value || !state)
    throw new TypeError('the pinned engine exposes an unsupported game object shape');
  const wishOn = Object.getOwnPropertyDescriptor(config.value, 'WISH_ON');
  if (!wishOn || !Object.hasOwn(wishOn, 'value') || typeof wishOn.value !== 'boolean')
    throw new TypeError('the pinned wish configuration must be a boolean data property');
  return Object.freeze({ engineGame, game, wishes, drawWishes, config, state, configObject: config.value, wishOn });
}

function sameDescriptorShape(current, expected) {
  return !!current && !!expected && current.get === expected.get && current.set === expected.set &&
    current.enumerable === expected.enumerable && current.configurable === expected.configurable &&
    current.writable === expected.writable && Object.hasOwn(current, 'value') === Object.hasOwn(expected, 'value');
}

function captureWishTable(table) {
  if (!table || typeof table !== 'object')
    throw new TypeError('the pinned wish table must be an object');
  const keys = Object.keys(table);
  const entries = keys.map((key) => {
    const tableDescriptor = Object.getOwnPropertyDescriptor(table, key);
    if (!tableDescriptor || !Object.hasOwn(tableDescriptor, 'value'))
      throw new TypeError('the pinned wish table must use data properties');
    const wish = tableDescriptor.value;
    const fields = Object.fromEntries(['id', 'canDraw', 'target'].map((field) =>
      [field, Object.getOwnPropertyDescriptor(wish, field) ?? null]));
    return Object.freeze({ key, tableDescriptor, wish, prototype: Object.getPrototypeOf(wish), fields: Object.freeze(fields) });
  });
  return Object.freeze({ table, prototype: Object.getPrototypeOf(table), keys: Object.freeze(keys), entries: Object.freeze(entries) });
}

function sameDescriptor(current, expected) {
  if (!current || !expected) return current === expected;
  return current.value === expected.value && current.get === expected.get && current.set === expected.set &&
    current.enumerable === expected.enumerable && current.configurable === expected.configurable &&
    current.writable === expected.writable;
}

function assertWishTable(engine) {
  const pinned = V10_WISH_TABLES.get(engine);
  const table = pinned?.table;
  if (!pinned || table !== V10_ENGINE_SHAPES.get(engine)?.wishes.value ||
      Object.getPrototypeOf(table) !== pinned.prototype)
    throw new TypeError('the pinned wish table has been replaced or reconfigured');
  const keys = Object.keys(table);
  if (keys.length !== pinned.keys.length || keys.some((key, index) => key !== pinned.keys[index]))
    throw new TypeError('the pinned wish table entries have changed');
  for (const entry of pinned.entries) {
    const tableDescriptor = Object.getOwnPropertyDescriptor(table, entry.key);
    if (!sameDescriptor(tableDescriptor, entry.tableDescriptor) || !Object.hasOwn(tableDescriptor ?? {}, 'value'))
      throw new TypeError('a pinned wish table entry descriptor has changed');
    const wish = tableDescriptor.value;
    if (wish !== entry.wish || Object.getPrototypeOf(wish) !== entry.prototype ||
        ['id', 'canDraw', 'target'].some((field) =>
          !sameDescriptor(Object.getOwnPropertyDescriptor(wish, field) ?? null, entry.fields[field])))
      throw new TypeError('a pinned wish id, eligibility rule or target function has changed');
  }
}

export function validateWishChanceContractV10(contract) {
  if (!contract || contract.schema !== 'yaoshi.l1e.sixOfFour.modelContract.v10')
    throw new Error('unsupported wish chance contract version');
  const previous = readCrossNightContractV9();
  if (contract.previousContract?.schema !== previous.schema ||
      contract.status !== 'partial' || contract.implemented !== false ||
      contract.source?.commit !== PRODUCT_PIN.commit ||
      contract.source?.gitBlobOid !== PRODUCT_PIN.gitBlobOid ||
      contract.source?.sha256 !== PRODUCT_PIN.sha256 ||
      previous.source?.commit !== PRODUCT_PIN.commit ||
      previous.source?.gitBlobOid !== PRODUCT_PIN.gitBlobOid ||
      previous.source?.sha256 !== PRODUCT_PIN.sha256 ||
      contract.chanceNodes?.length !== 1 || contract.chanceNodes[0]?.id !== NODE_ID ||
      contract.chanceNodes[0]?.status !== 'partial' ||
      contract.chanceNodes[0]?.stateConditioned !== true ||
      !Array.isArray(contract.chanceNodes[0]?.sourceSymbols) ||
      contract.chanceNodes[0]?.sourceSymbols?.length !== 2 ||
      !contract.chanceNodes[0].sourceSymbols.includes('drawWishes') ||
      !contract.chanceNodes[0].sourceSymbols.includes('WISHES') ||
      contract.chanceAbstraction?.law !== 'iid-uniform-rng-call-v1' ||
      contract.chanceAbstraction?.draw !== ABSTRACT_DRAW ||
      contract.chanceAbstraction?.mapping !== ABSTRACT_MAPPING ||
      contract.chanceAbstraction?.limitation !== ABSTRACT_LIMITATION ||
      contract.chanceNodes[0]?.support !== NODE_CONTRACT.support ||
      contract.chanceNodes[0]?.outcome !== NODE_CONTRACT.outcome ||
      contract.chanceNodes[0]?.weight !== NODE_CONTRACT.weight ||
      contract.chanceNodes[0]?.rngConsumption !== NODE_CONTRACT.rngConsumption ||
      contract.inventory?.['chance.night.drawWishes'] !== 'partial' ||
      contract.inventory?.['chance.fullGame'] !== 'incomplete' ||
      contract.gate?.sixOfFour !== 'incomplete' ||
      contract.gate?.formalStatus !== 'incomplete' ||
      contract.gate?.solverStatus !== 'not-run' ||
      contract.gate?.releaseEligible !== false)
    throw new Error('v10 wish chance contract lineage or scope mismatch');
  return contract;
}

export function readWishChanceContractV10() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  return validateWishChanceContractV10(contract);
}

export function loadWishChanceEngineV10() {
  readWishChanceContractV10();
  const engine = loadCrossNightRestoreEngineV9();
  const shape = captureEngineShape(engine);
  V10_ENGINE_SHAPES.set(engine, shape);
  V10_WISH_TABLES.set(engine, captureWishTable(shape.wishes.value));
  V10_ENGINES.add(engine);
  return engine;
}

function assertEngine(engine) {
  const shape = V10_ENGINE_SHAPES.get(engine);
  if (!V10_ENGINES.has(engine) || !shape || engine?.G !== shape.game ||
      engine.source?.commit !== PRODUCT_PIN.commit ||
      engine.source?.gitBlobOid !== PRODUCT_PIN.gitBlobOid ||
      engine.source?.sha256 !== PRODUCT_PIN.sha256)
    throw new TypeError('a live engine loaded from the v10 pinned product source is required');
  if (!sameDescriptor(Object.getOwnPropertyDescriptor(engine, 'G'), shape.engineGame) ||
      !sameDescriptor(Object.getOwnPropertyDescriptor(shape.game, 'WISHES'), shape.wishes) ||
      !sameDescriptor(Object.getOwnPropertyDescriptor(shape.game, 'drawWishes'), shape.drawWishes) ||
      !sameDescriptor(Object.getOwnPropertyDescriptor(shape.game, 'CFG'), shape.config) ||
      !sameDescriptor(Object.getOwnPropertyDescriptor(shape.game, 'S'), shape.state))
    throw new TypeError('pinned game function or property descriptors have changed');
  const wishOn = Object.getOwnPropertyDescriptor(shape.configObject, 'WISH_ON');
  if (!sameDescriptorShape(wishOn, shape.wishOn) || typeof wishOn.value !== 'boolean')
    throw new TypeError('the pinned wish configuration must remain a boolean data property');
  const gameState = shape.game.S;
  if (!gameState || !shape.wishes.value || typeof shape.drawWishes.value !== 'function')
    throw new TypeError('the pinned game state or wish table is unavailable');
  assertWishTable(engine);
  const state = gameState;
  if (!Array.isArray(state.players) || typeof state.rng !== 'function' ||
      typeof state.rng.getState !== 'function' || typeof state.rng.setState !== 'function' ||
      typeof state.rngUi !== 'function' || typeof state.rngUi.getState !== 'function' ||
      typeof state.rngUi.setState !== 'function')
    throw new TypeError('v10 requires a current state and instrumented gameplay RNG');
  const ids = new Set();
  for (const player of state.players) {
    if (!Number.isInteger(player?.id) || player.id < 0 || ids.has(player.id) ||
        typeof player.alive !== 'boolean')
      throw new TypeError('v10 requires unique non-negative integer seat ids and boolean alive flags');
    ids.add(player.id);
  }
  if (!engine.G.CFG || typeof engine.G.CFG.WISH_ON !== 'boolean')
    throw new TypeError('v10 requires an explicit boolean wish configuration');
  return state;
}

function makeWishOutcome(wish, player) {
  if (!wish || typeof wish.id !== 'string')
    throw new TypeError('wish table entries must have stable string ids');
  const outcome = { id: wish.id, done: false };
  if (wish.target) {
    if (typeof wish.target !== 'function') throw new TypeError(`wish ${wish.id} has a non-callable target`);
    outcome.target = wish.target(player);
  }
  return Object.freeze(outcome);
}

export function inspectWishSupportPureV10(engine, inspect) {
  const state = assertEngine(engine);
  if (typeof inspect !== 'function') throw new TypeError('a wish support inspection callback is required');
  const originalRng = state.rng;
  const originalRngUi = state.rngUi;
  const rngBefore = originalRng.getState();
  const rngUiBefore = originalRngUi.getState();
  const originalRngSetter = Object.getOwnPropertyDescriptor(originalRng, 'setState');
  const originalRngUiSetter = Object.getOwnPropertyDescriptor(originalRngUi, 'setState');
  let rngUsedByEligibility = false;
  let inspectionError;
  let result;

  const rejectChanceUse = () => {
    rngUsedByEligibility = true;
    throw new Error('wish eligibility or target calculation must not consume RNG');
  };
  const blockSetter = (rng, descriptor) => {
    if (!descriptor || typeof descriptor.value !== 'function' ||
        (!descriptor.configurable && !descriptor.writable))
      throw new TypeError('v10 cannot guard this RNG state setter');
    Object.defineProperty(rng, 'setState', { ...descriptor, value: rejectChanceUse });
  };
  const guardRng = (original) => {
    const guarded = () => rejectChanceUse();
    guarded.getState = original.getState.bind(original);
    guarded.setState = rejectChanceUse;
    return guarded;
  };

  try {
    blockSetter(originalRng, originalRngSetter);
    blockSetter(originalRngUi, originalRngUiSetter);
    state.rng = guardRng(originalRng);
    state.rngUi = guardRng(originalRngUi);
    result = inspect();
  } catch (error) {
    inspectionError = error;
  } finally {
    state.rng = originalRng;
    state.rngUi = originalRngUi;
    if (originalRngSetter) Object.defineProperty(originalRng, 'setState', originalRngSetter);
    if (originalRngUiSetter) Object.defineProperty(originalRngUi, 'setState', originalRngUiSetter);
  }

  const rngChanged = originalRng.getState() !== rngBefore;
  const rngUiChanged = originalRngUi.getState() !== rngUiBefore;
  if (rngChanged) originalRngSetter.value.call(originalRng, rngBefore);
  if (rngUiChanged) originalRngUiSetter.value.call(originalRngUi, rngUiBefore);
  if (rngUsedByEligibility || rngChanged || rngUiChanged)
    throw new Error(rngUsedByEligibility
      ? 'wish eligibility or target calculation must not consume RNG'
      : 'wish chance support inspection must be RNG-pure');
  if (inspectionError) throw inspectionError;
  return result;
}

export function buildWishChanceNodeV10(engine) {
  const state = assertEngine(engine);
  const contract = readWishChanceContractV10();
  const shape = V10_ENGINE_SHAPES.get(engine);
  const definitions = Object.values(shape.wishes.value);
  const enabled = shape.configObject.WISH_ON && definitions.length > 0;
  const slots = inspectWishSupportPureV10(engine, () => {
    const inspectedSlots = [];
    if (enabled) {
      const definitionIds = new Set();
      for (const wish of definitions) {
        if (!wish || typeof wish.id !== 'string' || definitionIds.has(wish.id))
          throw new TypeError('wish table must contain unique string ids');
        if (wish.canDraw && typeof wish.canDraw !== 'function')
          throw new TypeError(`wish ${wish.id} has a non-callable canDraw`);
        definitionIds.add(wish.id);
      }
      for (const player of state.players) {
        if (!player.alive) {
          inspectedSlots.push(Object.freeze({ playerId: player.id, alive: false, options: Object.freeze([]) }));
          continue;
        }
        const available = definitions.filter((wish) => !wish.canDraw || wish.canDraw(player));
        const support = available.length ? available : definitions;
        const seenIds = new Set();
        const options = support.map((wish) => {
          if (seenIds.has(wish.id)) throw new TypeError(`duplicate wish id in support: ${wish.id}`);
          seenIds.add(wish.id);
          return Object.freeze({ wish: makeWishOutcome(wish, player) });
        });
        inspectedSlots.push(Object.freeze({ playerId: player.id, alive: true, options: Object.freeze(options) }));
      }
    }
    return inspectedSlots;
  });

  let jointDenominator = 1n;
  let drawCount = 0;
  for (const slot of slots) {
    if (!slot.alive) continue;
    if (slot.options.length === 0)
      throw new Error('enabled wish draw has no support after the engine fallback');
    drawCount++;
    jointDenominator *= BigInt(slot.options.length);
  }

  const node = Object.freeze({
    schema: NODE_SCHEMA,
    id: NODE_ID,
    source: Object.freeze({ ...contract.source }),
    abstraction: contract.chanceAbstraction.law,
    round: state.round,
    enabled,
    drawCount,
    seatSupports: Object.freeze(slots),
    jointOutcomeCount: jointDenominator.toString(),
    jointWeightDenominator: jointDenominator.toString(),
  });
  V10_NODES.add(node);
  return node;
}

function assertChanceNode(node) {
  if (!V10_NODES.has(node) || node.schema !== NODE_SCHEMA || node.id !== NODE_ID ||
      !Array.isArray(node.seatSupports) || !/^\d+$/.test(node.jointWeightDenominator))
    throw new TypeError('a v10 wish chance node is required');
  const denominator = BigInt(node.jointWeightDenominator);
  const expected = node.seatSupports.reduce((product, slot) => {
    if (!slot || !Number.isInteger(slot.playerId) || slot.playerId < 0 ||
        typeof slot.alive !== 'boolean' || !Array.isArray(slot.options) ||
        (slot.alive && node.enabled && slot.options.length === 0) ||
        (!slot.alive && slot.options.length !== 0))
      throw new TypeError('malformed v10 wish chance support');
    return product * BigInt(slot.alive && node.enabled ? slot.options.length : 1);
  }, 1n);
  if (denominator !== expected || node.jointOutcomeCount !== expected.toString())
    throw new TypeError('v10 wish chance weight denominator does not match its support');
}

export function* enumerateWishProfilesV10(node) {
  assertChanceNode(node);
  const denominator = node.jointWeightDenominator;
  const liveSlots = node.seatSupports.filter((slot) => slot.alive);

  if (!node.enabled || liveSlots.length === 0) {
    const choices = node.enabled
      ? node.seatSupports.map((slot) => ({ playerId: slot.playerId, wish: null }))
      : [];
    yield { choices, weight: { numerator: '1', denominator: '1' } };
    return;
  }

  const picks = new Map();
  function* visit(index) {
    if (index === liveSlots.length) {
      const choices = node.seatSupports.map((slot) => ({
        playerId: slot.playerId,
        wish: slot.alive ? picks.get(slot.playerId) : null,
      }));
      yield { choices, weight: { numerator: '1', denominator } };
      return;
    }
    const slot = liveSlots[index];
    for (const option of slot.options) {
      picks.set(slot.playerId, option.wish);
      yield* visit(index + 1);
    }
    picks.delete(slot.playerId);
  }

  yield* visit(0);
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadWishChanceEngineV10,
  readWishChanceContractV10,
} from './l1e-wish-chance-adapter-v10.mjs';

/* v11 night.drawMarket chance node. Model: iid-uniform-rng-call-v1 (same boundary as v10).
   Enumerates only non-refill market draws (plus the pinned deterministic shousui hook);
   every refill shuffle or unknown onMarketDraw hook fails closed. */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONTRACT_PATH = path.join(ROOT, 'docs/experiments/2026-09-23-destiny/model-contract-v11.json');
const PRODUCT_PIN = Object.freeze({
  commit: 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a',
  gitBlobOid: '8ba772b9d960eff8b9c42eac77040433f809c57d',
  sha256: '8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d',
});
const NODE_SCHEMA = 'yaoshi.l1e.marketChanceNode.v11';
const NODE_ID = 'night.drawMarket';
const MAX_MARKET = 6;
const ABSTRACTION = Object.freeze({
  law: 'iid-uniform-rng-call-v1',
  draw: 'Each gameplay S.rng() call is an independent U[0,1) chance draw conditional on the current game state.',
  mapping: 'The pinned drawMarket compares its first draw with CFG.CURSE_PROB (u < CURSE_PROB, evaluated even when S.cdeck is empty); the pinned Fisher-Yates shuffle maps the draw at step i to floor(u * (i + 1)).',
  curseProbability: 'CFG.CURSE_PROB is read from the live frozen config and converted to the exact rational value of its binary64 representation.',
  limitation: 'Weights are exact for this abstract chance-call law, not for the finite 32-bit seed distribution or correlations of the concrete mulberry32 stream. Full chance remains incomplete until that modeling boundary is accepted or replaced by an exact seed-space model.',
});
const NODE_CONTRACT = Object.freeze({
  entryPoint: 'drawMarketFor(forRound)',
  support: "When S.deck holds at least CFG.MARKET items: a curse branch (only if S.cdeck is non-empty) that pops CFG.MARKET-1 deck items and one cdeck item, and a plain branch that pops CFG.MARKET deck items; each branch is crossed with all CFG.MARKET! Fisher-Yates swap sequences. If the target round's global effects carry the pinned shousui onMarketDraw hook, each branch is followed by that deterministic hook provided the hook needs no CURSES refill.",
  outcome: 'The ordered market item objects returned by drawMarketFor plus the resulting S.deck and S.cdeck contents and order.',
  weight: 'Curse branch CURSE_PROB / CFG.MARKET!, plain branch (1 - CURSE_PROB) / CFG.MARKET!; when S.cdeck is empty the curse mass merges into the plain branch (1 / CFG.MARKET!). Weights are exact rationals that sum to 1.',
  rngConsumption: 'Exactly CFG.MARKET gameplay draws: one curse check (consumed even when S.cdeck is empty) plus CFG.MARKET - 1 Fisher-Yates swaps; the shousui hook consumes none when it needs no refill.',
  failClosed: 'The node throws instead of enumerating when S.deck has fewer than CFG.MARKET items (POOL refill shuffle), when the shousui hook would need a CURSES refill shuffle, or when any other onMarketDraw hook is active for the target round.',
});
const SOURCE_SYMBOLS = Object.freeze(['drawMarket', 'drawMarketFor', 'shuffle', 'NIGHTRULES.shousui.hooks.onMarketDraw']);
const PINNED_GAME_KEYS = Object.freeze(['drawMarketFor', 'ruleForRound', 'collectEffects', 'CFG', 'NIGHTRULES', 'S']);

const V11_ENGINES = new WeakSet();
const V11_SHAPES = new WeakMap();
const V11_NODES = new WeakSet();

/* ---------- exact rationals ---------- */
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a < 0n ? -a : a; };
function frac(n, d) {
  if (d <= 0n) throw new RangeError('rational denominator must be positive');
  const g = gcd(n, d) || 1n;
  return Object.freeze({ n: n / g, d: d / g });
}
const fracAdd = (x, y) => frac(x.n * y.d + y.n * x.d, x.d * y.d);
const fracSub = (x, y) => frac(x.n * y.d - y.n * x.d, x.d * y.d);
const fracDivInt = (x, k) => frac(x.n, x.d * BigInt(k));
const fracOut = (x) => Object.freeze({ numerator: x.n.toString(), denominator: x.d.toString() });
function exactBinary64(value) {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new RangeError('CFG.CURSE_PROB must be a finite probability in [0, 1]');
  let scaled = value;
  let denominator = 1n;
  while (!Number.isInteger(scaled)) { scaled *= 2; denominator *= 2n; }
  return frac(BigInt(scaled), denominator);
}

/* ---------- contract ---------- */
export function validateMarketChanceContractV11(contract) {
  if (!contract || contract.schema !== 'yaoshi.l1e.sixOfFour.modelContract.v11')
    throw new Error('unsupported market chance contract version');
  const previous = readWishChanceContractV10();
  const node = contract.chanceNodes?.[0];
  const abstraction = contract.chanceAbstraction ?? {};
  if (contract.previousContract?.schema !== previous.schema ||
      contract.status !== 'partial' || contract.implemented !== false ||
      contract.source?.commit !== PRODUCT_PIN.commit ||
      contract.source?.gitBlobOid !== PRODUCT_PIN.gitBlobOid ||
      contract.source?.sha256 !== PRODUCT_PIN.sha256 ||
      previous.source?.commit !== PRODUCT_PIN.commit ||
      contract.chanceNodes?.length !== 1 || node?.id !== NODE_ID ||
      node.status !== 'partial' || node.stateConditioned !== true ||
      !Array.isArray(node.sourceSymbols) || node.sourceSymbols.length !== SOURCE_SYMBOLS.length ||
      SOURCE_SYMBOLS.some((symbol) => !node.sourceSymbols.includes(symbol)) ||
      Object.entries(ABSTRACTION).some(([key, value]) => abstraction[key] !== value) ||
      Object.entries(NODE_CONTRACT).some(([key, value]) => node[key] !== value) ||
      contract.inventory?.['chance.night.drawMarket'] !== 'partial' ||
      contract.inventory?.['chance.fullGame'] !== 'incomplete' ||
      contract.inventory?.['state.canonicalization'] !== 'incomplete' ||
      contract.gate?.sixOfFour !== 'incomplete' ||
      contract.gate?.formalStatus !== 'incomplete' ||
      contract.gate?.solverStatus !== 'not-run' ||
      contract.gate?.releaseEligible !== false)
    throw new Error('v11 market chance contract lineage or scope mismatch');
  return contract;
}

export function readMarketChanceContractV11() {
  return validateMarketChanceContractV11(JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8')));
}

/* ---------- engine provenance ---------- */
function sameDescriptor(current, expected) {
  if (!current || !expected) return current === expected;
  return current.value === expected.value && current.get === expected.get && current.set === expected.set &&
    current.enumerable === expected.enumerable && current.configurable === expected.configurable &&
    current.writable === expected.writable;
}

function dataNumber(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'number')
    throw new TypeError(`v11 requires CFG.${key} to be a numeric data property`);
  return descriptor.value;
}

export function loadMarketChanceEngineV11() {
  readMarketChanceContractV11();
  const engine = loadWishChanceEngineV10();
  const game = engine.G;
  const descriptors = Object.fromEntries(PINNED_GAME_KEYS.map((key) => [key, Object.getOwnPropertyDescriptor(game, key)]));
  for (const key of ['drawMarketFor', 'ruleForRound', 'collectEffects'])
    if (typeof descriptors[key]?.value !== 'function')
      throw new TypeError(`the pinned engine must export ${key}`);
  const shousuiHooks = game.NIGHTRULES?.shousui?.hooks;
  const shousuiHook = shousuiHooks?.onMarketDraw;
  if (typeof shousuiHook !== 'function')
    throw new TypeError('the pinned shousui onMarketDraw hook is missing');
  V11_SHAPES.set(engine, Object.freeze({ game, descriptors: Object.freeze(descriptors), shousuiHook }));
  V11_ENGINES.add(engine);
  return engine;
}

function assertEngine(engine) {
  const shape = V11_SHAPES.get(engine);
  if (!V11_ENGINES.has(engine) || !shape || engine?.G !== shape.game ||
      engine.source?.commit !== PRODUCT_PIN.commit ||
      engine.source?.gitBlobOid !== PRODUCT_PIN.gitBlobOid ||
      engine.source?.sha256 !== PRODUCT_PIN.sha256)
    throw new TypeError('a live engine loaded from the v11 pinned product source is required');
  for (const key of PINNED_GAME_KEYS)
    if (!sameDescriptor(Object.getOwnPropertyDescriptor(shape.game, key), shape.descriptors[key]))
      throw new TypeError('pinned game function or property descriptors have changed');
  const state = shape.game.S;
  if (!state || !Array.isArray(state.deck) || !Array.isArray(state.cdeck) ||
      !Array.isArray(state.market) || !Array.isArray(state.nextMarket) ||
      typeof state.rng !== 'function' || typeof state.rng.getState !== 'function' ||
      typeof state.rng.setState !== 'function' || typeof state.rngUi !== 'function' ||
      typeof state.rngUi.getState !== 'function' || typeof state.rngUi.setState !== 'function')
    throw new TypeError('v11 requires a current state with deck, cdeck, markets and instrumented RNG');
  const config = shape.game.CFG;
  const marketSize = dataNumber(config, 'MARKET');
  const curseProb = dataNumber(config, 'CURSE_PROB');
  if (!Number.isInteger(marketSize) || marketSize < 1 || marketSize > MAX_MARKET)
    throw new TypeError(`v11 requires an integer CFG.MARKET in [1, ${MAX_MARKET}]`);
  return { shape, state, marketSize, curseProb };
}

/* ---------- purity guard ---------- */
export function inspectMarketSupportPureV11(engine, inspect) {
  const { state } = assertEngine(engine);
  if (typeof inspect !== 'function') throw new TypeError('a market support inspection callback is required');
  const originalRng = state.rng;
  const originalRngUi = state.rngUi;
  const rngBefore = originalRng.getState();
  const rngUiBefore = originalRngUi.getState();
  const originalRngSetter = Object.getOwnPropertyDescriptor(originalRng, 'setState');
  const originalRngUiSetter = Object.getOwnPropertyDescriptor(originalRngUi, 'setState');
  const tracked = ['deck', 'cdeck', 'market', 'nextMarket'].map((key) =>
    ({ key, array: state[key], items: state[key].slice() }));
  const nightRuleBefore = state.nightRule;
  let rngUsed = false;
  let inspectionError;
  let result;

  const rejectChanceUse = () => {
    rngUsed = true;
    throw new Error('market support inspection must not consume RNG');
  };
  const blockSetter = (rng, descriptor) => {
    if (!descriptor || typeof descriptor.value !== 'function' ||
        (!descriptor.configurable && !descriptor.writable))
      throw new TypeError('v11 cannot guard this RNG state setter');
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
  let mutated = state.nightRule !== nightRuleBefore;
  state.nightRule = nightRuleBefore;
  for (const { key, array, items } of tracked) {
    const current = state[key];
    if (current !== array || current.length !== items.length || current.some((item, index) => item !== items[index])) {
      mutated = true;
      state[key] = array;
      array.splice(0, array.length, ...items);
    }
  }
  if (rngUsed || rngChanged || rngUiChanged)
    throw new Error(rngUsed ? 'market support inspection must not consume RNG'
      : 'market chance support inspection must be RNG-pure');
  if (mutated) throw new Error('market support inspection must not mutate deck, cdeck, market, nextMarket or nightRule');
  if (inspectionError) throw inspectionError;
  return result;
}

/* ---------- node ---------- */
function swapSequences(size) {
  // Fisher-Yates in the pinned shuffle: for i = size-1 .. 1, j = floor(u * (i + 1)).
  let sequences = [[]];
  for (let i = size - 1; i > 0; i--) {
    const next = [];
    for (const prefix of sequences) for (let j = 0; j <= i; j++) next.push([...prefix, j]);
    sequences = next;
  }
  return sequences;
}

function applySwaps(items, swaps) {
  const out = items.slice();
  swaps.forEach((j, k) => {
    const i = out.length - 1 - k;
    [out[i], out[j]] = [out[j], out[i]];
  });
  return out;
}

export function buildMarketChanceNodeV11(engine, { forRound } = {}) {
  const { shape, state, marketSize, curseProb } = assertEngine(engine);
  if (!Number.isInteger(forRound) || forRound < 1)
    throw new TypeError('v11 requires a positive integer forRound');
  const contract = readMarketChanceContractV11();
  const game = shape.game;

  const inspected = inspectMarketSupportPureV11(engine, () => {
    const previousRule = state.nightRule;
    let effects;
    try {
      state.nightRule = game.ruleForRound(forRound);
      effects = game.collectEffects(null);
    } finally {
      state.nightRule = previousRule;
    }
    const hooks = effects.filter((effect) => effect?.hooks?.onMarketDraw).map((effect) => effect.hooks.onMarketDraw);
    let hook = null;
    if (hooks.length === 1 && hooks[0] === shape.shousuiHook) hook = 'shousui';
    else if (hooks.length !== 0)
      throw new Error('unsupported onMarketDraw hook: v11 only models the pinned shousui hook');
    return { hook, deck: state.deck.slice(), cdeck: state.cdeck.slice() };
  });

  const { hook, deck, cdeck } = inspected;
  if (deck.length < marketSize)
    throw new Error('market draw would trigger a POOL deck refill shuffle; v11 fails closed');
  const cdeckEmpty = cdeck.length === 0;
  const one = frac(1n, 1n);
  const p = exactBinary64(curseProb);
  const permutations = swapSequences(marketSize);
  const kinds = [];
  if (!cdeckEmpty && p.n > 0n) kinds.push({ curse: true, mass: p, interval: [frac(0n, 1n), p] });
  const plainMass = cdeckEmpty ? one : fracSub(one, p);
  if (plainMass.n > 0n)
    kinds.push({ curse: false, mass: plainMass, interval: cdeckEmpty ? [frac(0n, 1n), one] : [p, one] });

  const branches = [];
  let total = frac(0n, 1n);
  for (const kind of kinds) {
    const baseDeck = deck.slice();
    const baseCdeck = cdeck.slice();
    const drawn = [];
    for (let i = 0; i < marketSize - (kind.curse ? 1 : 0); i++) drawn.push(baseDeck.pop());
    if (kind.curse) drawn.push(baseCdeck.pop());
    const weight = fracDivInt(kind.mass, permutations.length);
    for (const swaps of permutations) {
      let market = applySwaps(drawn, swaps);
      let deckAfter = baseDeck.slice();
      let cdeckAfter = baseCdeck.slice();
      if (hook === 'shousui') {
        market.forEach((item) => { (item.curse ? cdeckAfter : deckAfter).unshift(item); });
        if (cdeckAfter.length < marketSize)
          throw new Error('shousui onMarketDraw would trigger a CURSES refill shuffle; v11 fails closed');
        market = [];
        for (let i = 0; i < marketSize; i++) market.push(cdeckAfter.pop());
      }
      total = fracAdd(total, weight);
      branches.push(Object.freeze({
        curse: kind.curse,
        swaps: Object.freeze(swaps.slice()),
        draws: Object.freeze([
          Object.freeze({ kind: 'curseCheck', lower: fracOut(kind.interval[0]), upper: fracOut(kind.interval[1]) }),
          ...swaps.map((j, k) => Object.freeze({ kind: 'shuffle', size: marketSize - k, index: j })),
        ]),
        weight: fracOut(weight),
        market: Object.freeze(market),
        marketIds: Object.freeze(market.map((item) => item.n)),
        deckAfter: Object.freeze(deckAfter),
        cdeckAfter: Object.freeze(cdeckAfter),
      }));
    }
  }
  if (total.n !== 1n || total.d !== 1n)
    throw new Error('v11 market branch weights do not sum to exactly one');

  const node = Object.freeze({
    schema: NODE_SCHEMA,
    id: NODE_ID,
    source: Object.freeze({ ...contract.source }),
    abstraction: contract.chanceAbstraction.law,
    forRound,
    hook,
    cdeckEmpty,
    curseProbability: fracOut(p),
    rngCalls: 1 + (marketSize - 1),
    branchCount: branches.length,
    branches: Object.freeze(branches),
  });
  V11_NODES.add(node);
  return node;
}

function assertNode(node) {
  if (!V11_NODES.has(node) || node.schema !== NODE_SCHEMA || node.id !== NODE_ID ||
      !Array.isArray(node.branches) || node.branchCount !== node.branches.length)
    throw new TypeError('a v11 market chance node is required');
  let total = frac(0n, 1n);
  for (const branch of node.branches)
    total = fracAdd(total, frac(BigInt(branch.weight.numerator), BigInt(branch.weight.denominator)));
  if (total.n !== 1n || total.d !== 1n)
    throw new TypeError('v11 market chance node weights do not sum to one');
}

export function* enumerateMarketBranchesV11(node) {
  assertNode(node);
  yield* node.branches;
}

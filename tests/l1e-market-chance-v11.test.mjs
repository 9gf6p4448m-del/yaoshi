import test from 'node:test';
import assert from 'node:assert/strict';

const adapterModule = './tools/l1e-market-chance-adapter-v11.mjs';
const DESTINIES = ['water', 'eyes', 'twinTiger', 'bloodOath'];
const PINNED_SOURCE = {
  commit: 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a',
  gitBlobOid: '8ba772b9d960eff8b9c42eac77040433f809c57d',
  sha256: '8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d',
};
const LIMITATION = 'Weights are exact for this abstract chance-call law, not for the finite 32-bit seed distribution or correlations of the concrete mulberry32 stream. Full chance remains incomplete until that modeling boundary is accepted or replaced by an exact seed-space model.';
const PLAIN_ROUND = 3; // ruleOrder[0] = yabao: a rule night without an onMarketDraw hook
const SHOUSUI_ROUND = 7; // ruleOrder[1] = shousui: the only pinned onMarketDraw hook

/* ---- independent exact arithmetic (does not share code with the adapter) ---- */
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
function frac(n, d) { const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; }
const add = (x, y) => frac(x.n * y.d + y.n * x.d, x.d * y.d);
const sub = (x, y) => frac(x.n * y.d - y.n * x.d, x.d * y.d);
const mulInt = (x, k) => frac(x.n, x.d * BigInt(k));
function exactDouble(x) {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const bits = view.getBigUint64(0);
  assert.equal(bits >> 63n, 0n, 'probability must be non-negative');
  const exponent = Number((bits >> 52n) & 0x7ffn);
  let mantissa = bits & ((1n << 52n) - 1n);
  let power;
  if (exponent === 0) power = -1074;
  else { mantissa |= 1n << 52n; power = exponent - 1075; }
  return power >= 0 ? frac(mantissa << BigInt(power), 1n) : frac(mantissa, 1n << BigInt(-power));
}
const factorial = (k) => { let r = 1; for (let i = 2; i <= k; i++) r *= i; return r; };
function assertWeight(weight, expected, label) {
  assert.ok(/^\d+$/.test(weight.numerator) && /^[1-9]\d*$/.test(weight.denominator), `${label}: weight must be an exact rational`);
  assert.equal(BigInt(weight.numerator) * expected.d, expected.n * BigInt(weight.denominator),
    `${label}: weight ${weight.numerator}/${weight.denominator} must equal ${expected.n}/${expected.d}`);
}

function setup(engine, { seed = 123 } = {}) {
  const state = engine.G.makeState('solo', seed, ['qingmian'], DESTINIES, 'off', false);
  state.ruleOrder = ['yabao', 'shousui'];
  return state;
}

function saveDecks(state) {
  return { deck: state.deck, cdeck: state.cdeck, deckItems: state.deck.slice(), cdeckItems: state.cdeck.slice() };
}
function restoreDecks(state, saved) {
  state.deck = saved.deck;
  state.cdeck = saved.cdeck;
  saved.deck.splice(0, saved.deck.length, ...saved.deckItems);
  saved.cdeck.splice(0, saved.cdeck.length, ...saved.cdeckItems);
}

function replay(engine, forRound, script) {
  const state = engine.G.S;
  const original = state.rng;
  let calls = 0;
  state.rng = () => { const u = calls < script.length ? script[calls] : 0.5; calls++; return u; };
  try {
    return { market: engine.G.drawMarketFor(forRound), calls };
  } finally {
    state.rng = original;
  }
}

function scriptFor(branch, { p, cdeckEmpty, marketSize }) {
  assert.equal(branch.swaps.length, marketSize - 1);
  const first = cdeckEmpty ? p / 2 : branch.curse ? p / 2 : (1 + p) / 2;
  return [first, ...branch.swaps.map((j, k) => {
    const size = marketSize - k;
    assert.ok(Number.isInteger(j) && j >= 0 && j < size, 'swap index must lie in its Fisher-Yates range');
    return (j + 0.5) / size;
  })];
}

const ratOf = (bound) => {
  assert.ok(/^\d+$/.test(bound.numerator) && /^[1-9]\d*$/.test(bound.denominator), 'interval bound must be an exact rational');
  return frac(BigInt(bound.numerator), BigInt(bound.denominator));
};
const sameRat = (x, y) => x.n * y.d === y.n * x.d;
function drawMidpoint(draw) {
  if (draw.kind === 'curseCheck') {
    const lower = ratOf(draw.lower);
    const upper = ratOf(draw.upper);
    return (Number(lower.n) / Number(lower.d) + Number(upper.n) / Number(upper.d)) / 2;
  }
  assert.equal(draw.kind, 'shuffle');
  return (draw.index + 0.5) / draw.size;
}
function assertDraws(branch, { p, cdeckEmpty, marketSize }, label) {
  const exactP = exactDouble(p);
  const zero = frac(0n, 1n);
  const one = frac(1n, 1n);
  const [lower, upper] = cdeckEmpty ? [zero, one] : branch.curse ? [zero, exactP] : [exactP, one];
  assert.equal(branch.draws.length, marketSize, `${label}: one declared draw per rng call`);
  const [check, ...shuffles] = branch.draws;
  assert.equal(check.kind, 'curseCheck', `${label}: first draw is the curse check`);
  assert.ok(sameRat(ratOf(check.lower), lower) && sameRat(ratOf(check.upper), upper),
    `${label}: curse-check interval ${check.lower.numerator}/${check.lower.denominator}..${check.upper.numerator}/${check.upper.denominator} must equal ${lower.n}/${lower.d}..${upper.n}/${upper.d}`);
  const u = drawMidpoint(check);
  assert.ok(u >= 0 && u < 1, `${label}: curse-check midpoint in [0,1)`);
  if (!cdeckEmpty) assert.equal(u < p, branch.curse, `${label}: curse-check midpoint must select this branch in the engine`);
  shuffles.forEach((draw, k) => {
    assert.equal(draw.kind, 'shuffle', `${label}: draw ${k + 1} kind`);
    assert.equal(draw.size, marketSize - k, `${label}: Fisher-Yates size at draw ${k + 1}`);
    assert.equal(draw.index, branch.swaps[k], `${label}: Fisher-Yates index at draw ${k + 1}`);
    assert.equal(Math.floor(drawMidpoint(draw) * draw.size), draw.index, `${label}: shuffle midpoint maps to its index`);
  });
}

function assertSameItems(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label}: length`);
  assert.deepEqual(actual.map((item) => item.n), expected.map((item) => item.n), `${label}: item id sequence`);
  actual.forEach((item, index) => assert.equal(item, expected[index], `${label}: item identity at ${index}`));
}

function replayEveryBranch(engine, node, { forRound, cdeckEmpty }) {
  const G = engine.G;
  const state = G.S;
  const p = G.CFG.CURSE_PROB;
  const marketSize = G.CFG.MARKET;
  const saved = saveDecks(state);
  const marketBefore = state.market;
  const nextBefore = state.nextMarket;
  const marketItems = state.market.slice();
  const nextItems = state.nextMarket.slice();
  let replayed = 0;
  try {
    for (const branch of node.branches) {
      restoreDecks(state, saved);
      const script = scriptFor(branch, { p, cdeckEmpty, marketSize });
      const label = `${branch.curse ? 'curse' : 'plain'} [${branch.swaps.join(',')}]`;
      const { market, calls } = replay(engine, forRound, script);
      assert.equal(calls, node.rngCalls, `${label}: engine rng calls must equal the declared consumption`);
      assert.equal(calls, script.length, `${label}: engine must consume exactly the scripted draws`);
      assertSameItems(market, branch.market, `${label} market`);
      assertSameItems(state.deck, branch.deckAfter, `${label} deck`);
      assertSameItems(state.cdeck, branch.cdeckAfter, `${label} cdeck`);
      assert.equal(state.market, marketBefore);
      assert.equal(state.nextMarket, nextBefore);
      assertSameItems(state.market, marketItems, `${label} S.market untouched`);
      assertSameItems(state.nextMarket, nextItems, `${label} S.nextMarket untouched`);

      // The declared per-draw intervals must match an independent derivation, and a
      // replay that samples inside those declared intervals must reach the same outcome.
      assertDraws(branch, { p, cdeckEmpty, marketSize }, label);
      restoreDecks(state, saved);
      const declaredScript = branch.draws.map(drawMidpoint);
      const declared = replay(engine, forRound, declaredScript);
      assert.equal(declared.calls, node.rngCalls, `${label}: declared-interval replay rng calls`);
      assert.equal(declared.calls, branch.draws.length, `${label}: one declared draw per engine rng call`);
      assertSameItems(declared.market, branch.market, `${label} declared-interval market`);
      assertSameItems(state.deck, branch.deckAfter, `${label} declared-interval deck`);
      assertSameItems(state.cdeck, branch.cdeckAfter, `${label} declared-interval cdeck`);
      replayed++;
    }
  } finally {
    restoreDecks(state, saved);
  }
  return replayed;
}

function assertSupport(engine, node, { cdeckEmpty }) {
  const G = engine.G;
  const n = G.CFG.MARKET;
  const perms = factorial(n);
  const p = exactDouble(G.CFG.CURSE_PROB);
  const one = frac(1n, 1n);
  const curseBranches = node.branches.filter((branch) => branch.curse);
  const plainBranches = node.branches.filter((branch) => !branch.curse);
  assert.equal(node.rngCalls, 1 + (n - 1), 'one curse check plus MARKET-1 swaps, even with an empty cdeck');
  assert.equal(curseBranches.length, cdeckEmpty ? 0 : perms);
  assert.equal(plainBranches.length, perms);
  assert.equal(node.branches.length, (cdeckEmpty ? 1 : 2) * perms);
  for (const group of [curseBranches, plainBranches]) {
    const keys = new Set(group.map((branch) => branch.swaps.join(',')));
    assert.equal(keys.size, group.length, 'swap sequences within a branch kind must be distinct');
  }
  let mass = frac(0n, 1n);
  for (const branch of node.branches) {
    const expected = cdeckEmpty ? frac(1n, BigInt(perms))
      : branch.curse ? mulInt(p, perms) : mulInt(sub(one, p), perms);
    assertWeight(branch.weight, expected, `${branch.curse ? 'curse' : 'plain'} [${branch.swaps.join(',')}]`);
    mass = add(mass, frac(BigInt(branch.weight.numerator), BigInt(branch.weight.denominator)));
  }
  assert.deepEqual(mass, one, 'the exact branch weights must sum to exactly one');
}

test('v11 pins the market-draw chance abstraction without claiming full-game chance or release', async () => {
  const { readMarketChanceContractV11 } = await import(adapterModule);
  const contract = readMarketChanceContractV11();
  assert.equal(contract.schema, 'yaoshi.l1e.sixOfFour.modelContract.v11');
  assert.equal(contract.previousContract.schema, 'yaoshi.l1e.sixOfFour.modelContract.v10');
  assert.deepEqual(contract.source, { path: 'index.html', ...PINNED_SOURCE, productVersion: '0.57.40' });
  assert.equal(contract.chanceAbstraction.law, 'iid-uniform-rng-call-v1');
  assert.equal(contract.chanceAbstraction.limitation, LIMITATION);
  assert.equal(contract.chanceNodes.length, 1);
  assert.equal(contract.chanceNodes[0].id, 'night.drawMarket');
  assert.equal(contract.chanceNodes[0].status, 'partial');
  assert.equal(contract.inventory['chance.night.drawMarket'], 'partial');
  assert.equal(contract.inventory['chance.fullGame'], 'incomplete');
  assert.equal(contract.inventory['state.canonicalization'], 'incomplete');
  assert.equal(contract.gate.sixOfFour, 'incomplete');
  assert.equal(contract.gate.solverStatus, 'not-run');
  assert.equal(contract.gate.releaseEligible, false);
  assert.match(contract.chanceNodes[0].weight, /CURSE_PROB/);
  assert.match(contract.chanceNodes[0].rngConsumption, /even when S\.cdeck is empty/);
  assert.match(contract.chanceNodes[0].failClosed, /refill/);
  assert.equal(contract.chanceNodes[0].support,
    "When S.deck holds at least CFG.MARKET items: a curse branch (only if S.cdeck is non-empty) that pops CFG.MARKET-1 deck items and one cdeck item, and a plain branch that pops CFG.MARKET deck items; each branch is crossed with all CFG.MARKET! Fisher-Yates swap sequences. If the global effects that drawMarketFor sees (the target round's night rule plus the current S.event, not the target round's event) carry the pinned shousui onMarketDraw hook, each branch is followed by that deterministic hook provided the hook needs no CURSES refill.");
  assert.equal(contract.chanceNodes[0].failClosed,
    "The node throws instead of enumerating when S.deck has fewer than CFG.MARKET items (POOL refill shuffle), when the shousui hook would need a CURSES refill shuffle, or when any other onMarketDraw hook is present in those effects (the target round's night rule or the current S.event).");
});

test('v11 fails closed when the contract diverges from the enumerator or claims more than partial scope', async () => {
  const { readMarketChanceContractV11, validateMarketChanceContractV11 } = await import(adapterModule);
  const contract = readMarketChanceContractV11();
  const node = contract.chanceNodes[0];
  const bad = [
    { ...contract, chanceAbstraction: { ...contract.chanceAbstraction, limitation: 'exact finite-seed probabilities' } },
    { ...contract, chanceAbstraction: { ...contract.chanceAbstraction, mapping: 'uniform by modulo' } },
    { ...contract, chanceNodes: [{ ...node, weight: 'uniform over all markets' }] },
    { ...contract, chanceNodes: [{ ...node, rngConsumption: 'three draws when cdeck is empty' }] },
    { ...contract, chanceNodes: [{ ...node, failClosed: 'refills are enumerated' }] },
    { ...contract, inventory: { ...contract.inventory, 'chance.fullGame': 'complete' } },
    { ...contract, inventory: { ...contract.inventory, 'state.canonicalization': 'complete' } },
    { ...contract, gate: { ...contract.gate, releaseEligible: true } },
    { ...contract, gate: { ...contract.gate, solverStatus: 'passed' } },
  ];
  for (const candidate of bad)
    assert.throws(() => validateMarketChanceContractV11(candidate), /lineage or scope mismatch/);
});

test('v11 accepts only its pinned engine and immutable nodes it produced', async () => {
  const { loadMarketChanceEngineV11, buildMarketChanceNodeV11, enumerateMarketBranchesV11 } = await import(adapterModule);
  const engine = loadMarketChanceEngineV11();
  setup(engine);
  assert.throws(() => buildMarketChanceNodeV11({ ...engine }, { forRound: PLAIN_ROUND }),
    /live engine loaded from the v11 pinned product source/);
  const node = buildMarketChanceNodeV11(engine, { forRound: PLAIN_ROUND });
  assert.equal(Object.isFrozen(node), true);
  assert.equal(Object.isFrozen(node.branches), true);
  assert.deepEqual(node.source, { path: 'index.html', ...PINNED_SOURCE, productVersion: '0.57.40' });
  assert.throws(() => [...enumerateMarketBranchesV11({ ...node })], /v11 market chance node/);
  assert.equal([...enumerateMarketBranchesV11(node)].length, node.branches.length);
});

test('non-refill market node enumerates curse and plain branches with exact weights that sum to one', async () => {
  const { loadMarketChanceEngineV11, buildMarketChanceNodeV11 } = await import(adapterModule);
  const engine = loadMarketChanceEngineV11();
  const state = setup(engine);
  assert.ok(state.deck.length >= engine.G.CFG.MARKET && state.cdeck.length > 0);
  const node = buildMarketChanceNodeV11(engine, { forRound: PLAIN_ROUND });
  assert.equal(node.id, 'night.drawMarket');
  assert.equal(node.forRound, PLAIN_ROUND);
  assert.equal(node.hook, null);
  assert.equal(node.cdeckEmpty, false);
  assertSupport(engine, node, { cdeckEmpty: false });
});

test('every non-refill branch replays to the same market, deck and cdeck in the frozen drawMarketFor', async () => {
  const { loadMarketChanceEngineV11, buildMarketChanceNodeV11 } = await import(adapterModule);
  const engine = loadMarketChanceEngineV11();
  setup(engine);
  const node = buildMarketChanceNodeV11(engine, { forRound: PLAIN_ROUND });
  assert.equal(replayEveryBranch(engine, node, { forRound: PLAIN_ROUND, cdeckEmpty: false }), node.branches.length);
  assert.equal(node.branches.length, 2 * factorial(engine.G.CFG.MARKET));
});

test('an empty cdeck still consumes the curse check and merges the curse mass into the plain branch', async () => {
  const { loadMarketChanceEngineV11, buildMarketChanceNodeV11 } = await import(adapterModule);
  const engine = loadMarketChanceEngineV11();
  const state = setup(engine);
  const saved = saveDecks(state);
  try {
    state.cdeck.splice(0);
    const node = buildMarketChanceNodeV11(engine, { forRound: PLAIN_ROUND });
    assert.equal(node.cdeckEmpty, true);
    assertSupport(engine, node, { cdeckEmpty: true });
    assert.equal(replayEveryBranch(engine, node, { forRound: PLAIN_ROUND, cdeckEmpty: true }), node.branches.length);
  } finally {
    restoreDecks(state, saved);
  }
});

test('shousui onMarketDraw hook is enumerated exactly and replays to an all-curse market', async () => {
  const { loadMarketChanceEngineV11, buildMarketChanceNodeV11 } = await import(adapterModule);
  const engine = loadMarketChanceEngineV11();
  setup(engine);
  assert.equal(engine.G.ruleForRound(SHOUSUI_ROUND)?.id, 'shousui');
  const node = buildMarketChanceNodeV11(engine, { forRound: SHOUSUI_ROUND });
  assert.equal(node.hook, 'shousui');
  assertSupport(engine, node, { cdeckEmpty: false });
  for (const branch of node.branches) {
    assert.equal(branch.market.length, engine.G.CFG.MARKET);
    assert.ok(branch.market.every((item) => item.curse === true), 'shousui market must be all curses');
  }
  assert.equal(replayEveryBranch(engine, node, { forRound: SHOUSUI_ROUND, cdeckEmpty: false }), node.branches.length);
});

test('a POOL deck refill fails closed, and the frozen engine really consumes extra draws there', async () => {
  const { loadMarketChanceEngineV11, buildMarketChanceNodeV11 } = await import(adapterModule);
  const engine = loadMarketChanceEngineV11();
  const state = setup(engine);
  const n = engine.G.CFG.MARKET;
  const p = engine.G.CFG.CURSE_PROB;
  const saved = saveDecks(state);
  try {
    for (const keep of [n - 1, 0]) {
      restoreDecks(state, saved);
      state.deck.splice(0, state.deck.length - keep);
      assert.equal(state.deck.length, keep);
      const rngBefore = state.rng.getState();
      assert.throws(() => buildMarketChanceNodeV11(engine, { forRound: PLAIN_ROUND }), /refill/);
      assert.equal(state.rng.getState(), rngBefore);
      assert.equal(state.deck.length, keep, 'fail-closed inspection must not refill the deck');
      const deckBefore = state.deck;
      const { calls } = replay(engine, PLAIN_ROUND, [(1 + p) / 2]);
      assert.ok(calls > n, `plain branch with ${keep} deck items must reshuffle POOL (calls=${calls})`);
      assert.notEqual(state.deck, deckBefore, 'the engine replaced S.deck with a reshuffled POOL');
    }
  } finally {
    restoreDecks(state, saved);
  }
});

test('a shousui hook that would reshuffle CURSES fails closed, and the engine really consumes extra draws there', async () => {
  const { loadMarketChanceEngineV11, buildMarketChanceNodeV11 } = await import(adapterModule);
  const engine = loadMarketChanceEngineV11();
  const state = setup(engine);
  const n = engine.G.CFG.MARKET;
  const p = engine.G.CFG.CURSE_PROB;
  const saved = saveDecks(state);
  try {
    state.cdeck.splice(0, state.cdeck.length - (n - 2));
    assert.equal(state.cdeck.length, n - 2);
    assert.throws(() => buildMarketChanceNodeV11(engine, { forRound: SHOUSUI_ROUND }), /refill/);
    const { calls } = replay(engine, SHOUSUI_ROUND, [p / 2]);
    assert.ok(calls > n, `shousui with a short cdeck must reshuffle CURSES (calls=${calls})`);
    restoreDecks(state, saved);
    state.cdeck.splice(0);
    assert.throws(() => buildMarketChanceNodeV11(engine, { forRound: SHOUSUI_ROUND }), /refill/);
  } finally {
    restoreDecks(state, saved);
  }
});

test('unknown or replaced onMarketDraw hooks fail closed', async () => {
  const { loadMarketChanceEngineV11, buildMarketChanceNodeV11 } = await import(adapterModule);
  const engine = loadMarketChanceEngineV11();
  const state = setup(engine);
  const savedEvent = state.event;
  try {
    state.event = { id: 'fakeEvent', hooks: { onMarketDraw() {} } };
    assert.throws(() => buildMarketChanceNodeV11(engine, { forRound: PLAIN_ROUND }), /unsupported onMarketDraw hook/);
  } finally {
    state.event = savedEvent;
  }
  const hooks = engine.G.NIGHTRULES.shousui.hooks;
  const original = Object.getOwnPropertyDescriptor(hooks, 'onMarketDraw');
  try {
    hooks.onMarketDraw = function onMarketDraw(ctx) { return original.value(ctx); };
    assert.throws(() => buildMarketChanceNodeV11(engine, { forRound: SHOUSUI_ROUND }), /unsupported onMarketDraw hook/);
  } finally {
    Object.defineProperty(hooks, 'onMarketDraw', original);
  }
});

test('building a market node consumes no gameplay or UI RNG and leaves deck, cdeck, market and nextMarket untouched', async () => {
  const { loadMarketChanceEngineV11, buildMarketChanceNodeV11 } = await import(adapterModule);
  const engine = loadMarketChanceEngineV11();
  const state = setup(engine);
  for (const forRound of [PLAIN_ROUND, SHOUSUI_ROUND]) {
    const before = {
      rng: state.rng.getState(), rngUi: state.rngUi.getState(), nightRule: state.nightRule,
      deck: state.deck, cdeck: state.cdeck, market: state.market, nextMarket: state.nextMarket,
      deckItems: state.deck.slice(), cdeckItems: state.cdeck.slice(),
      marketItems: state.market.slice(), nextItems: state.nextMarket.slice(),
    };
    buildMarketChanceNodeV11(engine, { forRound });
    assert.equal(state.rng.getState(), before.rng);
    assert.equal(state.rngUi.getState(), before.rngUi);
    assert.equal(state.nightRule, before.nightRule);
    for (const key of ['deck', 'cdeck', 'market', 'nextMarket']) assert.equal(state[key], before[key], `${key} identity`);
    assertSameItems(state.deck, before.deckItems, 'deck');
    assertSameItems(state.cdeck, before.cdeckItems, 'cdeck');
    assertSameItems(state.market, before.marketItems, 'market');
    assertSameItems(state.nextMarket, before.nextItems, 'nextMarket');
  }
});

test('market purity inspection rejects RNG use or deck mutation and restores the state', async () => {
  const { loadMarketChanceEngineV11, inspectMarketSupportPureV11 } = await import(adapterModule);
  const engine = loadMarketChanceEngineV11();
  const state = setup(engine);
  const rng = state.rng;
  const rngState = rng.getState();
  const uiState = state.rngUi.getState();
  const deckItems = state.deck.slice();
  assert.throws(() => inspectMarketSupportPureV11(engine, () => state.rng()), /must not consume RNG/);
  assert.equal(state.rng, rng);
  assert.throws(() => inspectMarketSupportPureV11(engine, () => rng()), /must be RNG-pure/);
  assert.equal(rng.getState(), rngState);
  assert.equal(state.rngUi.getState(), uiState);
  assert.throws(() => inspectMarketSupportPureV11(engine, () => { state.deck.pop(); }), /must not mutate/);
  assertSameItems(state.deck, deckItems, 'deck restored after rejected mutation');
});

test('shousui plus any additional onMarketDraw hook fails closed instead of modelling only shousui', async () => {
  const { loadMarketChanceEngineV11, buildMarketChanceNodeV11 } = await import(adapterModule);
  const engine = loadMarketChanceEngineV11();
  const state = setup(engine);
  assert.equal(engine.G.ruleForRound(SHOUSUI_ROUND)?.id, 'shousui');
  const savedEvent = state.event;
  const saved = saveDecks(state);
  try {
    state.event = { id: 'fakeEvent', hooks: { onMarketDraw(ctx) { ctx.market = []; } } };
    assert.throws(() => buildMarketChanceNodeV11(engine, { forRound: SHOUSUI_ROUND }), (error) => {
      assert.ok(!(error instanceof TypeError), `expected a fail-closed Error, got ${error}`);
      assert.match(error.message, /unsupported onMarketDraw hook/);
      return true;
    });
    const { market } = replay(engine, SHOUSUI_ROUND, [0.1, 0.1, 0.1, 0.1]);
    assert.equal(market.length, 0, 'the extra hook really changes the frozen engine outcome');
  } finally {
    state.event = savedEvent;
    restoreDecks(state, saved);
  }
});

test('shousui with exactly MARKET-1 cdeck items fails closed with a CURSES refill error', async () => {
  const { loadMarketChanceEngineV11, buildMarketChanceNodeV11 } = await import(adapterModule);
  const engine = loadMarketChanceEngineV11();
  const state = setup(engine);
  const n = engine.G.CFG.MARKET;
  const p = engine.G.CFG.CURSE_PROB;
  const saved = saveDecks(state);
  try {
    state.cdeck.splice(0, state.cdeck.length - (n - 1));
    assert.equal(state.cdeck.length, n - 1);
    let failure;
    try { buildMarketChanceNodeV11(engine, { forRound: SHOUSUI_ROUND }); } catch (error) { failure = error; }
    assert.ok(failure instanceof Error, 'the node must fail closed at the MARKET-1 cdeck boundary');
    assert.ok(!(failure instanceof TypeError), `fail-closed error must not be a TypeError: ${failure}`);
    assert.match(failure.message, /CURSES refill/);
    const { calls } = replay(engine, SHOUSUI_ROUND, [p / 2]);
    assert.ok(calls > n, `shousui with MARKET-1 cdeck items must reshuffle CURSES (calls=${calls})`);
  } finally {
    restoreDecks(state, saved);
  }
});

test('a deck holding exactly MARKET items needs no refill and every branch replays exactly', async () => {
  const { loadMarketChanceEngineV11, buildMarketChanceNodeV11 } = await import(adapterModule);
  const engine = loadMarketChanceEngineV11();
  const state = setup(engine);
  const n = engine.G.CFG.MARKET;
  const saved = saveDecks(state);
  try {
    state.deck.splice(0, state.deck.length - n);
    assert.equal(state.deck.length, n);
    let node;
    assert.doesNotThrow(() => { node = buildMarketChanceNodeV11(engine, { forRound: PLAIN_ROUND }); },
      'a deck with exactly MARKET items must be enumerated, not failed closed');
    assertSupport(engine, node, { cdeckEmpty: false });
    assert.equal(node.branches.length, 2 * factorial(n));
    assert.equal(replayEveryBranch(engine, node, { forRound: PLAIN_ROUND, cdeckEmpty: false }), node.branches.length);
  } finally {
    restoreDecks(state, saved);
  }
});

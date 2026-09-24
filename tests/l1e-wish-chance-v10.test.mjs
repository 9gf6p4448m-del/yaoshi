import test from 'node:test';
import assert from 'node:assert/strict';

const adapterModule = './tools/l1e-wish-chance-adapter-v10.mjs';
const DESTINIES = ['water', 'eyes', 'twinTiger', 'bloodOath'];
const PINNED_SOURCE = {
  commit: 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a',
  gitBlobOid: '8ba772b9d960eff8b9c42eac77040433f809c57d',
  sha256: '8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d',
};

function setup(engine, { seed = 123, market } = {}) {
  const state = engine.G.makeState('solo', seed, ['qingmian'], DESTINIES, 'off', false);
  if (market) state.market = market.map((item) => ({ ...item }));
  return state;
}

test('v10 pins the wish-draw chance abstraction without claiming full-game chance or release', async () => {
  const { readWishChanceContractV10 } = await import(adapterModule);
  const contract = readWishChanceContractV10();

  assert.equal(contract.schema, 'yaoshi.l1e.sixOfFour.modelContract.v10');
  assert.equal(contract.previousContract.schema, 'yaoshi.l1e.sixOfFour.modelContract.v9');
  assert.deepEqual(contract.source, {
    path: 'index.html',
    ...PINNED_SOURCE,
    productVersion: '0.57.40',
  });
  assert.equal(contract.chanceNodes[0].id, 'night.drawWishes');
  assert.equal(contract.inventory['chance.night.drawWishes'], 'partial');
  assert.equal(contract.inventory['chance.fullGame'], 'incomplete');
  assert.equal(contract.chanceAbstraction.law, 'iid-uniform-rng-call-v1');
  assert.equal(contract.chanceAbstraction.limitation,
    'Weights are exact for this abstract chance-call law, not for the finite 32-bit seed distribution or correlations of the concrete mulberry32 stream. Full chance remains incomplete until that modeling boundary is accepted or replaced by an exact seed-space model.');
  assert.equal(contract.gate.sixOfFour, 'incomplete');
  assert.equal(contract.gate.solverStatus, 'not-run');
  assert.equal(contract.gate.releaseEligible, false);
  assert.equal(contract.chanceAbstraction.draw,
    'Each gameplay S.rng() call is an independent U[0,1) chance draw conditional on the current game state.');
  assert.equal(contract.chanceAbstraction.mapping,
    'The pinned drawWishes maps each draw to floor(u * eligiblePool.length).');
  assert.equal(contract.chanceNodes[0].support,
    'For each living seat, use the pinned WISHES insertion order and the options whose canDraw(player) is true; if that support is empty, the engine falls back to all wishes. Dead seats receive wish=null and consume no draw. If wishes are disabled or the table is empty, the draw node is a no-op.');
  assert.equal(contract.chanceNodes[0].outcome,
    'The chosen wish id and any deterministic target(player) result; done starts false.');
  assert.equal(contract.chanceNodes[0].weight,
    'The joint profile has exact weight product_i(1 / supportSize_i), conditional on the frozen pre-draw state and iid-uniform-rng-call-v1.');
  assert.equal(contract.chanceNodes[0].rngConsumption,
    'Exactly one gameplay draw per living seat when wishes are enabled and the wish table is non-empty.');
});

test('v10 rejects engine-shaped objects that were not loaded by its pinned engine loader', async () => {
  const { loadWishChanceEngineV10, buildWishChanceNodeV10 } = await import(adapterModule);
  const engine = loadWishChanceEngineV10();
  setup(engine);

  assert.throws(() => buildWishChanceNodeV10({ ...engine }), /live engine loaded from the v10 pinned product source/);
});

test('v10 fails closed when a chance contract description diverges from the enumerator', async () => {
  const { readWishChanceContractV10, validateWishChanceContractV10 } = await import(adapterModule);
  const contract = readWishChanceContractV10();
  const badContracts = [
    { ...contract, chanceAbstraction: { ...contract.chanceAbstraction, mapping: 'uniform by modulo' } },
    { ...contract, chanceAbstraction: { ...contract.chanceAbstraction, limitation: 'exact finite-seed and full-game probabilities' } },
    { ...contract, chanceNodes: [{ ...contract.chanceNodes[0], support: 'all wishes for every seat' }] },
    { ...contract, chanceNodes: [{ ...contract.chanceNodes[0], weight: 'uniform joint weight' }] },
    { ...contract, chanceNodes: [{ ...contract.chanceNodes[0], rngConsumption: 'one draw for the table' }] },
  ];
  for (const candidate of badContracts)
    assert.throws(() => validateWishChanceContractV10(candidate), /lineage or scope mismatch/);
});

test('v10 enumerator accepts only immutable nodes produced by its pinned state inspector', async () => {
  const { loadWishChanceEngineV10, buildWishChanceNodeV10, enumerateWishProfilesV10 } =
    await import(adapterModule);
  const engine = loadWishChanceEngineV10();
  setup(engine);
  const node = buildWishChanceNodeV10(engine);
  assert.equal(Object.isFrozen(node), true);
  assert.throws(() => [...enumerateWishProfilesV10({ ...node })], /v10 wish chance node/);
});

test('the frozen wish node enumerates its entire state-conditioned joint support with exact abstract weights', async () => {
  const { loadWishChanceEngineV10, buildWishChanceNodeV10, enumerateWishProfilesV10 } =
    await import(adapterModule);
  const engine = loadWishChanceEngineV10();
  const state = setup(engine, { market: [
    { n: '陰氣符', f: 'yinqi', p: 7, curse: false },
    { n: '詛咒紙人', f: 'curse', p: -3, curse: true },
  ] });
  const rngBefore = state.rng.getState();
  const node = buildWishChanceNodeV10(engine);

  assert.equal(node.schema, 'yaoshi.l1e.wishChanceNode.v10');
  assert.deepEqual(node.source, {
    path: 'index.html',
    ...PINNED_SOURCE,
    productVersion: '0.57.40',
  });
  assert.equal(node.enabled, true);
  assert.equal(node.round, state.round);
  assert.equal(node.drawCount, state.players.filter((player) => player.alive).length);
  assert.equal(state.rng.getState(), rngBefore, 'inspecting chance support must not consume gameplay RNG');
  assert.deepEqual(node.seatSupports.map((seat) => seat.playerId), state.players.map((player) => player.id));

  const all = Object.values(engine.G.WISHES);
  for (const [index, player] of state.players.entries()) {
    const actualPool = all.filter((wish) => !wish.canDraw || wish.canDraw(player));
    const expectedPool = actualPool.length ? actualPool : all;
    const support = node.seatSupports[index];
    assert.equal(support.alive, true);
    assert.deepEqual(support.options.map((option) => option.wish.id), expectedPool.map((wish) => wish.id));
    for (const [optionIndex, wish] of expectedPool.entries()) {
      const expected = { id: wish.id, done: false };
      if (wish.target) expected.target = wish.target(player);
      assert.deepEqual(support.options[optionIndex].wish, expected);
    }
  }

  const expectedBranches = node.seatSupports.reduce((count, seat) =>
    count * BigInt(seat.alive ? seat.options.length : 1), 1n);
  assert.equal(node.jointOutcomeCount, expectedBranches.toString());
  assert.equal(node.jointWeightDenominator, expectedBranches.toString());

  let count = 0n;
  let massNumerator = 0n;
  let first;
  let last;
  for (const branch of enumerateWishProfilesV10(node)) {
    first ??= branch;
    last = branch;
    assert.equal(branch.weight.numerator, '1');
    assert.equal(branch.weight.denominator, expectedBranches.toString());
    assert.equal(branch.choices.length, state.players.length);
    count++;
    massNumerator += BigInt(branch.weight.numerator);
  }
  assert.equal(count, expectedBranches);
  assert.equal(massNumerator, expectedBranches,
    'the exact common-denominator weights of all joint profiles must sum to one');
  assert.ok(first && last);
  assert.deepEqual(first.choices.map((choice) => choice.wish?.id ?? null),
    node.seatSupports.map((seat) => seat.alive ? seat.options[0].wish.id : null));
  assert.deepEqual(last.choices.map((choice) => choice.wish?.id ?? null),
    node.seatSupports.map((seat) => seat.alive ? seat.options.at(-1).wish.id : null));
});

test('every per-seat wish outcome maps to the same frozen drawWishes result and consumes one draw per living seat', async () => {
  const { loadWishChanceEngineV10, buildWishChanceNodeV10 } = await import(adapterModule);
  const engine = loadWishChanceEngineV10();
  const state = setup(engine, { market: [
    { n: '陰氣符', f: 'yinqi', p: 7, curse: false },
    { n: '詛咒紙人', f: 'curse', p: -3, curse: true },
  ] });
  const node = buildWishChanceNodeV10(engine);
  const living = node.seatSupports.filter((seat) => seat.alive);
  const originalRng = state.rng;

  try {
    for (const selectedSeat of living) {
      for (let selectedIndex = 0; selectedIndex < selectedSeat.options.length; selectedIndex++) {
        const indices = living.map((seat) => seat.playerId === selectedSeat.playerId ? selectedIndex : 0);
        let calls = 0;
        state.players.forEach((player) => { player.wish = null; });
        state.rng = () => {
          const slot = living[calls++];
          const index = indices[calls - 1];
          return (index + 0.25) / node.seatSupports[slot.playerId].options.length;
        };

        engine.G.drawWishes();

        assert.equal(calls, node.drawCount);
        const expected = state.players.map((player) => {
          const seat = node.seatSupports[player.id];
          if (!seat.alive) return null;
          const index = indices[living.findIndex((entry) => entry.playerId === player.id)];
          return seat.options[index].wish;
        });
        assert.deepEqual(state.players.map((player) => player.wish), expected,
          `engine result must match enumerated support for seat ${selectedSeat.playerId}, option ${selectedIndex}`);
      }
    }
  } finally {
    state.rng = originalRng;
  }
});

test('dead seats, disabled wishes and state changes alter draw count or support without adding chance', async () => {
  const { loadWishChanceEngineV10, buildWishChanceNodeV10, enumerateWishProfilesV10 } =
    await import(adapterModule);
  const engine = loadWishChanceEngineV10();
  const state = setup(engine, { market: [{ n: '木牌', f: 'wood', p: 3, curse: false }] });
  const marketNode = buildWishChanceNodeV10(engine);
  assert.ok(marketNode.seatSupports.every((seat) =>
    !seat.options.some((option) => option.wish.id === 'wish_yinqi')));

  const lowest = state.players.filter((player) => player.alive)
    .sort((left, right) => left.life - right.life || left.id - right.id)[0];
  assert.deepEqual(marketNode.seatSupports.filter((seat) =>
    seat.options.some((option) => option.wish.id === 'wish_comeback')).map((seat) => seat.playerId), [lowest.id]);

  state.players[1].alive = false;
  state.players[1].wish = { id: 'stale' };
  const originalRng = state.rng;
  let calls = 0;
  try {
    state.rng = () => { calls++; return 0.1; };
    engine.G.drawWishes();
  } finally {
    state.rng = originalRng;
  }
  assert.equal(state.players[1].wish, null);
  assert.equal(calls, 3);

  const deadNode = buildWishChanceNodeV10(engine);
  assert.equal(deadNode.drawCount, 3);
  assert.equal(deadNode.seatSupports[1].alive, false);
  assert.deepEqual(deadNode.seatSupports[1].options, []);

  const wishToggle = engine.G.CFG.WISH_ON;
  const priorWishes = state.players.map((player) => player.wish && { ...player.wish });
  calls = 0;
  try {
    engine.G.CFG.WISH_ON = false;
    const disabledNode = buildWishChanceNodeV10(engine);
    assert.equal(disabledNode.enabled, false);
    assert.equal(disabledNode.drawCount, 0);
    const [noOp] = [...enumerateWishProfilesV10(disabledNode)];
    assert.equal(noOp.weight.numerator, '1');
    assert.equal(noOp.weight.denominator, '1');
    state.rng = () => { calls++; return 0.1; };
    engine.G.drawWishes();
  } finally {
    state.rng = originalRng;
    engine.G.CFG.WISH_ON = wishToggle;
  }
  assert.equal(calls, 0);
  assert.deepEqual(state.players.map((player) => player.wish && { ...player.wish }), priorWishes);
});

test('v10 rejects ambiguous config and malformed seat identities before assigning chance weights', async () => {
  const { loadWishChanceEngineV10, buildWishChanceNodeV10 } = await import(adapterModule);
  const engine = loadWishChanceEngineV10();
  const state = setup(engine);
  const wishToggle = engine.G.CFG.WISH_ON;
  const playerId = state.players[1].id;
  try {
    engine.G.CFG.WISH_ON = 1;
    assert.throws(() => buildWishChanceNodeV10(engine), /boolean/);
    engine.G.CFG.WISH_ON = true;
    state.players[1].id = state.players[0].id;
    assert.throws(() => buildWishChanceNodeV10(engine), /unique non-negative integer/);
  } finally {
    engine.G.CFG.WISH_ON = wishToggle;
    state.players[1].id = playerId;
  }
});

test('wish support table identities fail closed if a pinned rule is replaced', async () => {
  const { loadWishChanceEngineV10, buildWishChanceNodeV10 } = await import(adapterModule);
  const engine = loadWishChanceEngineV10();
  setup(engine);
  const wishes = Object.values(engine.G.WISHES);
  assert.ok(wishes.some((entry) => typeof entry.canDraw !== 'function'),
    'the frozen table has an unconditional option, so an empty pool is unreachable in this version');
  const replacements = [
    [wishes.find((entry) => typeof entry.canDraw === 'function'), 'canDraw'],
    [wishes.find((entry) => typeof entry.target === 'function'), 'target'],
  ];
  for (const [wish, field] of replacements) {
    const saved = Object.getOwnPropertyDescriptor(wish, field);
    try {
      wish[field] = () => true;
      assert.throws(() => buildWishChanceNodeV10(engine), /pinned wish id, eligibility rule or target function has changed/);
    } finally {
      Object.defineProperty(wish, field, saved);
    }
  }
});

test('wish table accessors cannot swap a mutated definition into a pinned chance node', async () => {
  const { loadWishChanceEngineV10, buildWishChanceNodeV10 } = await import(adapterModule);
  const engine = loadWishChanceEngineV10();
  setup(engine, { market: [{ n: '木牌', f: 'wood', p: 3, curse: false }] });
  const table = engine.G.WISHES;
  const key = 'wish_yinqi';
  const originalDescriptor = Object.getOwnPropertyDescriptor(table, key);
  const changedWish = { ...originalDescriptor.value, canDraw: () => true };
  let reads = 0;

  try {
    Object.defineProperty(table, key, {
      configurable: originalDescriptor.configurable,
      enumerable: originalDescriptor.enumerable,
      get() { return ++reads === 1 ? originalDescriptor.value : changedWish; },
    });
    assert.throws(() => buildWishChanceNodeV10(engine), /pinned wish table entry descriptor has changed/);
  } finally {
    Object.defineProperty(table, key, originalDescriptor);
  }
});

test('the exported WISHES property itself cannot be replaced with an alternating accessor', async () => {
  const { loadWishChanceEngineV10, buildWishChanceNodeV10 } = await import(adapterModule);
  const engine = loadWishChanceEngineV10();
  setup(engine);
  const game = engine.G;
  const descriptor = Object.getOwnPropertyDescriptor(game, 'WISHES');
  const replacement = { ...descriptor.value, wish_yinqi: { ...descriptor.value.wish_yinqi, canDraw: () => true } };
  let reads = 0;

  try {
    Object.defineProperty(game, 'WISHES', {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get() { return ++reads === 1 ? descriptor.value : replacement; },
    });
    assert.throws(() => buildWishChanceNodeV10(engine), /pinned game function or property descriptors have changed/);
  } finally {
    Object.defineProperty(game, 'WISHES', descriptor);
  }
});

test('purity inspection catches captured RNG closures and restores their streams after rejection', async () => {
  const { loadWishChanceEngineV10, inspectWishSupportPureV10 } = await import(adapterModule);
  const engine = loadWishChanceEngineV10();
  const state = setup(engine);
  const rng = state.rng;
  const rngUi = state.rngUi;
  const gameState = rng.getState();
  const uiState = rngUi.getState();
  const capturedGameRng = rng;
  const capturedUiRng = rngUi;
  const capturedUiSetter = rngUi.setState;

  assert.throws(() => inspectWishSupportPureV10(engine, () => state.rng()), /must not consume RNG/);
  assert.equal(state.rng, rng, 'the guarded live RNG reference is restored');
  assert.throws(() => inspectWishSupportPureV10(engine, () => capturedUiRng()), /must be RNG-pure/);
  assert.equal(state.rng, rng);
  assert.equal(state.rngUi, rngUi);
  assert.equal(rng.getState(), gameState);
  assert.equal(rngUi.getState(), uiState);
  assert.throws(() => inspectWishSupportPureV10(engine, () => capturedGameRng()), /must be RNG-pure/);
  assert.equal(rng.getState(), gameState, 'gameplay RNG is restored after a captured function is called');
  assert.throws(() => inspectWishSupportPureV10(engine, () => capturedUiSetter(uiState + 1)), /must be RNG-pure/);
  assert.equal(rngUi.getState(), uiState, 'UI RNG is restored after a captured setter changes its cursor');
  assert.throws(() => inspectWishSupportPureV10(engine, () => { throw new Error('inspection failure'); }), /inspection failure/);
  assert.equal(rng.getState(), gameState);
  assert.equal(rngUi.getState(), uiState);
});

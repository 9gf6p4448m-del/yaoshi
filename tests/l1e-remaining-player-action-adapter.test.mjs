import test from 'node:test';
import assert from 'node:assert/strict';

const adapterModule = './tools/l1e-remaining-player-action-adapter.mjs';
const privateDraws = ['water', 'eyes', 'twinTiger', 'bloodOath'];

function soloFixture(G, seed) {
  const state = G.makeState('solo', seed, ['qingmian'], privateDraws, 'original', true);
  state.players.forEach((player, index) => {
    player.ai = index !== 0;
    player.alive = true;
    player.life = 25;
    player.bag = [];
  });
  return state;
}

test('v5 records remaining player decisions while the full-game gate stays closed', async () => {
  const { readRemainingActionContractV5, remainingActionAdapterStatus } = await import(adapterModule);
  const contract = readRemainingActionContractV5();
  assert.equal(contract.schema, 'yaoshi.l1e.sixOfFour.modelContract.v5');
  assert.equal(contract.source.commit, 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a');
  assert.equal(contract.inventory['actions.mark'], 'partial');
  assert.equal(contract.inventory['actions.sacrifice'], 'partial');
  assert.equal(contract.inventory['actions.shrinePick'], 'partial');
  assert.equal(contract.gate.sixOfFour, 'incomplete');
  assert.equal(contract.gate.releaseEligible, false);
  assert.deepEqual(remainingActionAdapterStatus().excludedDecisionPhases,
    ['battle', 'settlement', 'cross-night transitions']);
});

test('mark choices are the no-mark action plus every current market slot and hide target identities', async () => {
  const {
    loadPinnedRemainingActionEngine,
    createMarkDecision,
    enumerateLegalMarkChoices,
    markObservation,
    commitMarkChoice,
  } = await import(adapterModule);
  const { G } = loadPinnedRemainingActionEngine();
  const state = soloFixture(G, 1211);
  state.marks = { 1: 0, 2: 1, 3: 2 };
  state.round = G.CFG.EVENT_NIGHTS[0];
  state.eventOrder[0] = 'plague';
  const decision = createMarkDecision(G, state, 0);

  assert.deepEqual([...enumerateLegalMarkChoices(decision)],
    [null, ...state.market.map((_, index) => index)]);
  const firstObservation = markObservation(G, state, decision);
  assert.equal(firstObservation.knownNextPreview, undefined);
  assert.equal(firstObservation.markIndicators[0].item, undefined);
  assert.equal(firstObservation.markIndicators[1].hasMark, true);
  state.marks[1] = 3;
  state.marks[2] = 0;
  assert.deepEqual(markObservation(G, state, decision), firstObservation,
    'the first solo player sees who declared but not the AI target slots');

  assert.throws(() => commitMarkChoice(G, state, decision, state.market.length), /legal mark action/);
  assert.equal(commitMarkChoice(G, state, decision, null), true);
  assert.equal(state.marks[0], null);
  assert.throws(() => commitMarkChoice(G, state, decision, 0), /already committed/);
});

test('sacrifice actions apply one engine bleed at a time and stop at the life floor', async () => {
  const {
    loadPinnedRemainingActionEngine,
    createSacrificeDecision,
    enumerateLegalSacrificeActions,
    sacrificeObservation,
    commitSacrificeChoice,
  } = await import(adapterModule);
  const { G } = loadPinnedRemainingActionEngine();
  const state = soloFixture(G, 1212);
  const player = state.players[0];
  player.bag.push({ ...G.POOL.find((item) => item.ab === 'xianji') });
  const firstCost = G.traitMax(player, 'bloodCost', G.CFG.BLOOD_COST);
  const secondCost = firstCost * 2;
  player.life = G.CFG.BLOOD_FLOOR + firstCost + secondCost;
  G.drawMarks();
  const decision = createSacrificeDecision(G, state, 0);

  assert.deepEqual([...enumerateLegalSacrificeActions(decision)], ['continue', 'bleed']);
  const observation = sacrificeObservation(G, state, decision);
  assert.equal(observation.players[0].sacrificed, 0);
  assert.equal(Object.hasOwn(observation.players[1], 'bag'), false);

  const first = commitSacrificeChoice(G, state, decision, 'bleed');
  assert.equal(first.lifeDelta[0].delta, -firstCost);
  assert.ok(first.lifeDelta.slice(1).every((entry) => entry.delta === -G.CFG.BLOOD_DRAIN));
  assert.deepEqual([...enumerateLegalSacrificeActions(decision)], ['continue', 'bleed']);

  const second = commitSacrificeChoice(G, state, decision, 'bleed');
  assert.equal(second.lifeDelta[0].after, G.CFG.BLOOD_FLOOR);
  assert.deepEqual([...enumerateLegalSacrificeActions(decision)], ['continue']);
  const stopped = commitSacrificeChoice(G, state, decision, 'continue');
  assert.equal(stopped.phase, 'auction');
  assert.throws(() => enumerateLegalSacrificeActions(decision), /already continued/);
});

test('interactive shrine winner can choose any open legend and settlement uses the engine path', async () => {
  const {
    loadPinnedRemainingActionEngine,
    beginInteractiveShrineResolution,
    enumerateLegalShrinePicks,
    shrinePickObservation,
    commitShrinePick,
  } = await import(adapterModule);
  for (let seed = 0; seed < 3; seed++) {
    const { G } = loadPinnedRemainingActionEngine();
    const state = soloFixture(G, 1400 + seed);
    state.round = G.CFG.SHRINE_NIGHTS[0];
    state.incPool[0] = 12;
    state.incense = Object.fromEntries(state.players.map((player) => [player.id, null]));
    const pending = beginInteractiveShrineResolution(G, state);
    assert.ok(pending.decision);
    assert.equal(pending.decision.playerId, 0);
    const legal = [...enumerateLegalShrinePicks(pending.decision)];
    assert.deepEqual(legal, G.openShrines().map((shrine) => shrine.i));

    const observation = shrinePickObservation(G, state, pending.decision);
    assert.equal(observation.incense, 12);
    assert.deepEqual(observation.choices.map((choice) => choice.index), legal);
    state.players[1].bag.push({ secretItem: true });
    assert.deepEqual(shrinePickObservation(G, state, pending.decision), observation,
      'the selection screen only consults the winner’s bag');

    assert.throws(() => commitShrinePick(G, state, pending.decision, 99), /not an open choice/);
    const selected = legal[seed];
    const result = commitShrinePick(G, state, pending.decision, selected);
    assert.equal(result.taken[0].shrine, selected);
    assert.equal(state.incPool[0], 0);
    assert.ok(state.players[0].bag.some((item) => item.legend && item.n === G.LEGENDS[selected].n));
  }
});

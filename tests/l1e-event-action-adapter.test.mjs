import test from 'node:test';
import assert from 'node:assert/strict';

const adapterModule = './tools/l1e-event-action-adapter.mjs';
const privateDraws = ['water', 'eyes', 'twinTiger', 'bloodOath'];

test('v4 contract adds event decisions but keeps complete-game gates closed', async () => {
  const { readEventModelContractV4, eventAdapterStatus } = await import(adapterModule);
  const contract = readEventModelContractV4();
  assert.equal(contract.schema, 'yaoshi.l1e.sixOfFour.modelContract.v4');
  assert.equal(contract.source.commit, 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a');
  assert.equal(contract.inventory['actions.event'], 'partial');
  assert.equal(contract.inventory['actions.mark'], 'incomplete');
  assert.equal(contract.inventory['information.fullRecall'], 'incomplete');
  assert.equal(contract.gate.sixOfFour, 'incomplete');
  assert.equal(contract.gate.releaseEligible, false);
  assert.deepEqual(eventAdapterStatus().excludedDecisionPhases,
    ['mark', 'sacrifice', 'shrine-pick', 'battle', 'settlement']);
});

test('every current event exposes exactly its engine-defined legal choices and settles through the frozen event engine', async () => {
  const {
    loadPinnedEventEngine,
    createEventDecision,
    enumerateLegalEventChoices,
    commitEventChoice,
    resolveEventSubmissions,
  } = await import(adapterModule);
  const { G } = loadPinnedEventEngine();
  const eventIds = Object.keys(G.EVENTS);
  assert.deepEqual(eventIds, ['plague', 'shrine', 'ghost', 'zongzi', 'guan', 'loan', 'wind', 'poe']);

  for (const eventId of eventIds) {
    const state = G.makeState('hotseat', 4200 + eventIds.indexOf(eventId),
      ['qingmian'], privateDraws, 'off', false);
    state.players.forEach((player) => { player.ai = null; player.alive = true; player.life = 3; });
    state.round = G.CFG.EVENT_NIGHTS[0];
    state.eventOrder[0] = eventId;
    const decision = createEventDecision(G, state);
    assert.equal(decision.eventId, eventId);

    const event = G.EVENTS[eventId];
    for (const player of state.players.filter((entry) => entry.alive)) {
      const legal = [...enumerateLegalEventChoices(decision, player.id)];
      const expected = event.input === 'pick'
        ? event.opts.map((option) => option.v)
        : [...Array.from({ length: event.cap(player) + 1 }, (_, value) => value),
          ...(event.allowPass ? [null] : [])];
      assert.deepEqual(legal, expected, `${eventId} seat ${player.id}`);
    }

    const profile = Object.fromEntries(decision.playerIds.map((playerId) => {
      const choice = [...enumerateLegalEventChoices(decision, playerId)][0];
      commitEventChoice(decision, playerId, choice);
      return [playerId, choice];
    }));
    const result = resolveEventSubmissions(G, state, decision);
    assert.equal(result.eventId, eventId);
    assert.deepEqual(result.choices.map((entry) => entry.value),
      decision.playerIds.map((playerId) => profile[playerId]));
    assert.equal(result.lifeDelta.length, decision.playerIds.length);
    assert.ok(Array.isArray(result.log));
  }
});

test('event observations hide every sealed choice and market state, then reveal all choices only after settlement', async () => {
  const {
    loadPinnedEventEngine,
    createEventDecision,
    enumerateLegalEventChoices,
    commitEventChoice,
    eventObservation,
    resolveEventSubmissions,
    auctionObservationAfterEvents,
    appendEventDecision,
    eventInformationSetKey,
  } = await import(adapterModule);
  const { G } = loadPinnedEventEngine();
  const state = G.makeState('hotseat', 4511, ['qingmian'], privateDraws, 'off', false);
  state.players.forEach((player) => { player.ai = null; player.alive = true; player.life = 25; });
  state.players[0].bag.push({ ...G.POOL.find((entry) => entry.ab === 'boat') });
  state.round = G.CFG.EVENT_NIGHTS[0];
  state.eventOrder[0] = 'ghost';
  const decision = createEventDecision(G, state);
  for (const playerId of [1, 2])
    commitEventChoice(decision, playerId, [...enumerateLegalEventChoices(decision, playerId)][0]);
  const before = eventObservation(G, state, decision, 0);
  assert.equal(before.eventId, 'ghost');
  assert.ok(state.players.some((player) => player.id === before.victimId));
  assert.equal(before.players[0].destiny.chainId, 'water');
  assert.equal(before.market, undefined);
  assert.equal(before.nextMarket, undefined);
  assert.equal(JSON.stringify(before).includes('choices'), false);
  assert.equal(JSON.stringify(before).includes('rng'), false);

  const alternate = createEventDecision(G, state);
  for (const playerId of [1, 2]) {
    const legal = [...enumerateLegalEventChoices(alternate, playerId)];
    commitEventChoice(alternate, playerId, legal.at(-1));
  }
  state.market[0].n = 'unseen current market mutation';
  state.nextMarket[0].n = 'unseen future market mutation';
  assert.deepEqual(eventObservation(G, state, alternate, 0), before,
    'different sealed submissions and hidden market cards are outside the event screen observation');

  for (const playerId of [0, 3])
    commitEventChoice(decision, playerId, [...enumerateLegalEventChoices(decision, playerId)][0]);
  const result = resolveEventSubmissions(G, state, decision);
  assert.equal(result.publicReveal.eventId, 'ghost');
  assert.equal(result.publicReveal.choices.length, decision.playerIds.length);
  assert.ok(Object.hasOwn(result.publicReveal, 'lifeDelta'));
  const afterEvent = auctionObservationAfterEvents(G, state, 0, [result.publicReveal]);
  assert.deepEqual(afterEvent.precedingPublicEvents, [result.publicReveal]);
  const pollutedReveal = { ...result.publicReveal, hiddenOpponentDestiny: 'water' };
  const sanitizedAfterEvent = auctionObservationAfterEvents(G, state, 0, [pollutedReveal]);
  assert.deepEqual(sanitizedAfterEvent.precedingPublicEvents, [result.publicReveal]);
  assert.equal(JSON.stringify(sanitizedAfterEvent).includes('hiddenOpponentDestiny'), false);
  assert.throws(() => auctionObservationAfterEvents(G, state, 0, [
    { ...result.publicReveal, round: result.publicReveal.round - 1 },
  ]), /current round/);

  const ownChoice = Array.isArray(before.options) ? before.options[0].value : before.options.min;
  const alternateChoice = Array.isArray(before.options)
    ? before.options.at(-1).value
    : before.options.max;
  const recall = appendEventDecision([], before, ownChoice);
  const otherRecall = appendEventDecision([], before, alternateChoice);
  assert.notEqual(eventInformationSetKey(recall, before), eventInformationSetKey(otherRecall, before));
  assert.equal(eventInformationSetKey(recall, before), eventInformationSetKey([...recall], before));

  const foreignDecision = createEventDecision(G, state);
  const foreignObservation = eventObservation(G, state, foreignDecision, 1);
  const foreignChoice = Array.isArray(foreignObservation.options)
    ? foreignObservation.options[0].value
    : foreignObservation.options.min;
  assert.throws(() => appendEventDecision(recall, foreignObservation, foreignChoice),
    /same viewer/);
  assert.throws(() => eventInformationSetKey(recall, foreignObservation),
    /current seat/);
});

test('zongzi pass and zero-price bid stay distinct, and a mismatched choice profile fails closed', async () => {
  const { loadPinnedEventEngine, createEventDecision, enumerateLegalEventChoices,
    commitEventChoice, resolveEventSubmissions } =
    await import(adapterModule);
  const { G } = loadPinnedEventEngine();
  const state = G.makeState('hotseat', 93, ['qingmian'], privateDraws, 'off', false);
  state.players.forEach((player) => { player.ai = null; player.alive = true; });
  state.round = G.CFG.EVENT_NIGHTS[0];
  state.eventOrder[0] = 'zongzi';
  const decision = createEventDecision(G, state);
  const legal = [...enumerateLegalEventChoices(decision, 0)];
  assert.ok(legal.includes(null));
  assert.ok(legal.includes(0));
  commitEventChoice(decision, 0, null);
  assert.throws(() => commitEventChoice(decision, 0, 0), /cannot be changed/);
  assert.throws(() => resolveEventSubmissions(G, state, decision), /every living participant/);
});

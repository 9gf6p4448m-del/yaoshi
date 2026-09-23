import test from 'node:test';
import assert from 'node:assert/strict';

const adapterModule = './tools/l1e-full-recall-adapter.mjs';

function freezeGraph(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeGraph(child);
  return value;
}

function observation(schema, phase, extra = {}) {
  return freezeGraph({ schema, phase, viewerId: 1, round: 2, ...extra });
}

const phases = [
  {
    phase: 'event',
    observation: observation('yaoshi.event-observation.v1', 'event.sealedCommit', {
      eventId: 'zongzi', input: 'pick', playerIds: [0, 1], options: [{ value: 'rice' }, { value: 'pass' }],
    }),
    action: { choice: 'rice' },
  },
  {
    phase: 'mark',
    observation: observation('yaoshi.mark-observation.v1', 'mark.preAuction', { market: [{ n: 'a' }, { n: 'b' }] }),
    action: { choice: 1 },
  },
  {
    phase: 'sacrifice',
    observation: observation('yaoshi.sacrifice-observation.v1', 'sacrifice.preAuction', { legalActions: ['continue', 'bleed'] }),
    action: { choice: 'bleed' },
  },
  {
    phase: 'auction',
    observation: observation('yaoshi.auction-observation.v1', 'auction.sealedCommit'),
    action: { schema: 'yaoshi.auction-submission.v1', playerId: 1, bids: [], incense: 0 },
  },
  {
    phase: 'shrine-pick',
    observation: observation('yaoshi.shrine-pick-observation.v1', 'shrine.pickLegend', { choices: [{ index: 2, name: '尊' }] }),
    action: { choice: 2 },
  },
];

test('v7 contract adds one-seat cross-phase history while keeping complete-game gates closed', async () => {
  const { readFullRecallContractV7, fullRecallAdapterStatus } = await import(adapterModule);
  const contract = readFullRecallContractV7();
  assert.equal(contract.schema, 'yaoshi.l1e.sixOfFour.modelContract.v7');
  assert.equal(contract.source.commit, 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a');
  assert.equal(contract.inventory['information.fullRecall'], 'partial');
  assert.equal(contract.inventory['chance.fullGame'], 'incomplete');
  assert.equal(contract.inventory['state.snapshotRestore.crossNight'], 'incomplete');
  assert.equal(contract.gate.sixOfFour, 'incomplete');
  assert.equal(contract.gate.solverStatus, 'not-run');
  assert.equal(contract.gate.releaseEligible, false);
  assert.deepEqual(fullRecallAdapterStatus().phases,
    ['event', 'mark', 'sacrifice', 'auction', 'shrine-pick']);
});

test('a seat retains its own actions across event, mark, sacrifice, auction and shrine-pick histories', async () => {
  const { appendFullRecallDecision, fullRecallInformationSetKey } = await import(adapterModule);
  let history = [];
  for (const record of phases) history = appendFullRecallDecision(history, record.phase, record.observation, record.action);

  assert.equal(history.length, phases.length);
  assert.ok(Object.isFrozen(history));
  assert.deepEqual(history.map((entry) => entry.phase), phases.map((entry) => entry.phase));
  assert.deepEqual(history.map((entry) => entry.action), phases.map((entry) => entry.action));
  const key = fullRecallInformationSetKey(history, phases.at(-1).observation);
  assert.equal(typeof key, 'string');
  assert.equal(key, fullRecallInformationSetKey([...history], phases.at(-1).observation));
  assert.notEqual(key, fullRecallInformationSetKey(history.slice(0, -1), phases.at(-1).observation));
});

test('full recall accepts immutable projections from the pinned phase adapters in one seat sequence', async () => {
  const recall = await import(adapterModule);
  const eventApi = await import('./tools/l1e-event-action-adapter.mjs');
  const markApi = await import('./tools/l1e-remaining-player-action-adapter.mjs');
  const { auctionObservationAfterEvents } = eventApi;
  const { G } = eventApi.loadPinnedEventEngine();
  const state = G.makeState('solo', 7201, ['qingmian'], ['water', 'eyes', 'twinTiger', 'bloodOath'], 'original', false);
  state.players.forEach((player, index) => {
    player.ai = index !== 0;
    player.alive = true;
    player.life = 25;
    player.bag = [];
  });
  state.round = G.CFG.EVENT_NIGHTS[0];
  state.eventOrder[0] = 'zongzi';

  const eventDecision = eventApi.createEventDecision(G, state);
  const eventObservation = eventApi.eventObservation(G, state, eventDecision, 0);
  const eventChoice = [...eventApi.enumerateLegalEventChoices(eventDecision, 0)][0];
  let history = recall.appendFullRecallDecision([], 'event', eventObservation, { choice: eventChoice });
  for (const playerId of eventDecision.playerIds)
    eventApi.commitEventChoice(eventDecision, playerId,
      [...eventApi.enumerateLegalEventChoices(eventDecision, playerId)][0]);
  const eventResult = eventApi.resolveEventSubmissions(G, state, eventDecision);

  state.marks = {};
  const markDecision = markApi.createMarkDecision(G, state, 0);
  const markObs = markApi.markObservation(G, state, markDecision, [eventResult.publicReveal]);
  history = recall.appendFullRecallDecision(history, 'mark', markObs, { choice: null });
  markApi.commitMarkChoice(G, state, markDecision, null);

  const sacrificeDecision = markApi.createSacrificeDecision(G, state, 0);
  const sacrificeObs = markApi.sacrificeObservation(G, state, sacrificeDecision, [eventResult.publicReveal]);
  history = recall.appendFullRecallDecision(history, 'sacrifice', sacrificeObs, { choice: 'continue' });
  markApi.commitSacrificeChoice(G, state, sacrificeDecision, 'continue');

  const auctionObs = auctionObservationAfterEvents(G, state, 0, [eventResult.publicReveal]);
  history = recall.appendFullRecallDecision(history, 'auction', auctionObs, {
    schema: 'yaoshi.auction-submission.v1', playerId: 0, bids: [], incense: 0,
  });

  const shrineApi = await import('./tools/l1e-remaining-player-action-adapter.mjs');
  const { G: shrineG } = shrineApi.loadPinnedRemainingActionEngine();
  const shrineState = shrineG.makeState('solo', 7202, ['qingmian'],
    ['water', 'eyes', 'twinTiger', 'bloodOath'], 'original', false);
  shrineState.players.forEach((player, index) => {
    player.ai = index !== 0;
    player.alive = true;
    player.life = 25;
    player.bag = [];
  });
  shrineState.round = shrineG.CFG.SHRINE_NIGHTS[0];
  shrineState.incPool[0] = 12;
  shrineState.incense = Object.fromEntries(shrineState.players.map((player) => [player.id, null]));
  const pending = shrineApi.beginInteractiveShrineResolution(shrineG, shrineState);
  assert.ok(pending.decision);
  const shrineObs = shrineApi.shrinePickObservation(shrineG, shrineState, pending.decision);
  const shrineChoice = shrineObs.choices[0].index;
  history = recall.appendFullRecallDecision(history, 'shrine-pick', shrineObs, { choice: shrineChoice });

  assert.equal(history.length, 5);
  assert.deepEqual(history.map((record) => record.round), [4, 4, 4, 4, 5]);
  assert.equal(recall.fullRecallInformationSetKey(history, shrineObs).includes('rngState'), false);
});

test('full recall rejects mixed-seat histories and cross-seat current observations', async () => {
  const { appendFullRecallDecision, fullRecallInformationSetKey } = await import(adapterModule);
  const first = phases[0];
  const history = appendFullRecallDecision([], first.phase, first.observation, first.action);
  const foreign = observation('yaoshi.mark-observation.v1', 'mark.preAuction', {
    viewerId: 2, market: [{ n: 'a' }],
  });
  assert.throws(() => appendFullRecallDecision(history, 'mark', foreign, { choice: 0 }), /same viewer/);
  assert.throws(() => fullRecallInformationSetKey(history, foreign), /same viewer/);
});

test('phase-specific action validation rejects illegal choices, schema spoofing and hidden engine state', async () => {
  const { appendFullRecallDecision } = await import(adapterModule);
  assert.throws(() => appendFullRecallDecision([], 'event', phases[0].observation, { choice: 'secret' }), /legal/);
  assert.throws(() => appendFullRecallDecision([], 'mark', phases[1].observation, { choice: 9 }), /legal/);
  assert.throws(() => appendFullRecallDecision([], 'sacrifice', phases[2].observation, { choice: 'pay' }), /legal/);
  assert.throws(() => appendFullRecallDecision([], 'shrine-pick', phases[4].observation, { choice: 0 }), /legal/);
  assert.throws(() => appendFullRecallDecision([], 'mark', phases[0].observation, { choice: 0 }), /phase and observation schema/);

  const polluted = observation('yaoshi.auction-observation.v1', 'auction.sealedCommit', {
    rngState: 1234,
  });
  assert.throws(() => appendFullRecallDecision([], 'auction', polluted, phases[3].action), /hidden engine state/);
});

test('history copies observations and actions instead of retaining mutable caller data', async () => {
  const { appendFullRecallDecision } = await import(adapterModule);
  const record = phases[1];
  const history = appendFullRecallDecision([], record.phase, record.observation, record.action);
  assert.ok(Object.isFrozen(history[0].observation));
  assert.ok(Object.isFrozen(history[0].action));
  assert.throws(() => { history[0].action.choice = 0; }, TypeError);
});

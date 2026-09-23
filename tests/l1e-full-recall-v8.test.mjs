import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = './tools/l1e-full-recall-adapter-v8.mjs';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function preparePlayers(state) {
  state.players.forEach((player, index) => {
    player.ai = index !== 0;
    player.alive = true;
    player.life = 25;
    player.bag = [];
  });
}

async function createPinnedPhaseFixture() {
  const recall = await import(modulePath);
  const adapter = recall.loadPinnedFullRecallProjectionEngineV8();
  const { G } = adapter;
  const state = G.makeState('solo', 8101, ['qingmian'],
    ['water', 'eyes', 'twinTiger', 'bloodOath'], 'original', false);
  preparePlayers(state);
  state.round = G.CFG.EVENT_NIGHTS[0];
  state.eventOrder[0] = 'zongzi';

  const eventDecision = adapter.event.createDecision(state);
  const event = adapter.event.observe(state, eventDecision, 0);
  const foreignEvent = adapter.event.observe(state, eventDecision, 1);
  const eventChoice = adapter.event.legalChoices(eventDecision, 0)[0];
  for (const playerId of eventDecision.playerIds)
    adapter.event.commitChoice(eventDecision, playerId,
      adapter.event.legalChoices(eventDecision, playerId)[0]);
  const { result: eventResult, publicTransition } = adapter.event.resolve(state, eventDecision);

  state.marks = {};
  const markDecision = adapter.mark.createDecision(state, 0);
  const mark = adapter.mark.observe(state, markDecision, [eventResult.publicReveal]);
  const sacrificeDecision = adapter.sacrifice.createDecision(state, 0);
  const sacrifice = adapter.sacrifice.observe(state, sacrificeDecision, [eventResult.publicReveal]);
  const auction = adapter.auction.observe(state, 0, [eventResult.publicReveal]);

  const shrineState = G.makeState('solo', 8102, ['qingmian'],
    ['water', 'eyes', 'twinTiger', 'bloodOath'], 'original', false);
  preparePlayers(shrineState);
  shrineState.round = G.CFG.SHRINE_NIGHTS[0];
  shrineState.incPool[0] = 12;
  shrineState.incense = Object.fromEntries(shrineState.players.map((player) => [player.id, null]));
  const shrineDecision = adapter.shrine.beginResolution(shrineState);
  assert.ok(shrineDecision);
  const shrinePick = adapter.shrine.observe(shrineState, shrineDecision);

  return {
    recall,
    adapter,
    eventDecision,
    event,
    foreignEvent,
    eventChoice,
    publicTransition,
    mark,
    sacrifice,
    auction,
    shrinePick,
  };
}

test('v8 pins the product source and keeps unsolved six-of-four and release gates closed', async () => {
  const { readFullRecallContractV8, fullRecallAdapterV8Status } = await import(modulePath);
  const contract = readFullRecallContractV8();
  assert.equal(contract.schema, 'yaoshi.l1e.sixOfFour.modelContract.v8');
  assert.equal(contract.source.commit, 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a');
  assert.equal(contract.inventory['information.projectionProvenance'], 'partial');
  assert.equal(contract.inventory['history.publicTransitions'], 'partial');
  assert.equal(contract.inventory['chance.fullGame'], 'incomplete');
  assert.equal(contract.inventory['state.snapshotRestore.crossNight'], 'incomplete');
  assert.equal(contract.gate.sixOfFour, 'incomplete');
  assert.equal(contract.gate.solverStatus, 'not-run');
  assert.equal(contract.gate.releaseEligible, false);
  assert.deepEqual(fullRecallAdapterV8Status().trustedProjectionPhases,
    ['event', 'mark', 'sacrifice', 'auction', 'shrine-pick']);
});

test('a valid-looking frozen object is not accepted without pinned projection provenance', async () => {
  const { appendFullRecallDecisionV8 } = await import(modulePath);
  const forged = deepFreeze({
    schema: 'yaoshi.event-observation.v1',
    phase: 'event.sealedCommit',
    viewerId: 0,
    round: 4,
    eventId: 'zongzi',
    playerIds: [0],
    input: 'pick',
    options: [{ value: 'rice' }],
  });
  assert.throws(() => appendFullRecallDecisionV8([], 'event', forged, { choice: 'rice' }),
    /pinned projection provenance/);
});

test('all five phases accept only observations produced by the pinned projection adapters', async () => {
  const fixture = await createPinnedPhaseFixture();
  const { appendFullRecallDecisionV8 } = fixture.recall;
  const records = [
    ['event', fixture.event, { choice: fixture.eventChoice }],
    ['mark', fixture.mark, { choice: null }],
    ['sacrifice', fixture.sacrifice, { choice: 'continue' }],
    ['auction', fixture.auction, {
      schema: 'yaoshi.auction-submission.v1', playerId: 0, bids: [], incense: 0,
    }],
    ['shrine-pick', fixture.shrinePick, { choice: fixture.shrinePick.choices[0].index }],
  ];
  let history = [];
  for (const [phase, observation, action] of records)
    history = appendFullRecallDecisionV8(history, phase, observation, action);

  assert.deepEqual(history.filter((entry) => entry.kind === 'decision').map((entry) => entry.phase),
    records.map(([phase]) => phase));
  const forgedCopy = deepFreeze({ ...fixture.mark });
  assert.throws(() => appendFullRecallDecisionV8(history, 'mark', forgedCopy, { choice: null }),
    /pinned projection provenance/);
});

test('a pinned public event reveal is recorded between decisions and changes the information key', async () => {
  const fixture = await createPinnedPhaseFixture();
  const {
    appendFullRecallDecisionV8,
    appendPublicTransitionV8,
    fullRecallInformationSetKeyV8,
  } = fixture.recall;
  let history = appendFullRecallDecisionV8([], 'event', fixture.event, { choice: fixture.eventChoice });
  const beforeReveal = fullRecallInformationSetKeyV8(history, fixture.mark);
  history = appendPublicTransitionV8(history, fixture.publicTransition);
  assert.deepEqual(history.map((entry) => entry.kind), ['decision', 'public-transition']);
  const afterReveal = fullRecallInformationSetKeyV8(history, fixture.mark);
  assert.notEqual(afterReveal, beforeReveal);
  assert.equal(history[1].transition.type, 'event.reveal');
  assert.equal(history[1].transition.round, fixture.event.round);

  const forged = deepFreeze({ ...fixture.publicTransition });
  assert.throws(() => appendPublicTransitionV8(history, forged), /pinned transition provenance/);
});

test('v8 preserves same-seat and chronological guards across public transitions', async () => {
  const fixture = await createPinnedPhaseFixture();
  const {
    appendFullRecallDecisionV8,
    appendPublicTransitionV8,
  } = fixture.recall;
  let history = appendFullRecallDecisionV8([], 'event', fixture.event, { choice: fixture.eventChoice });
  assert.throws(() => appendFullRecallDecisionV8(history, 'event', fixture.foreignEvent, {
    choice: fixture.adapter.event.legalChoices(fixture.eventDecision, 1)[0],
  }), /same viewer/);
  history = appendPublicTransitionV8(history, fixture.publicTransition);
  assert.throws(() => appendPublicTransitionV8(history, fixture.publicTransition), /duplicate public transition/);
  assert.throws(() => appendFullRecallDecisionV8(history, 'mark', fixture.foreignEvent, { choice: null }),
    /phase and observation schema/);
});

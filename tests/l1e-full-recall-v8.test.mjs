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

async function createPinnedPhaseFixture({ recordedEventChoiceIndex = 0, eventOnly = false, eventOnlyUnrecorded = false, markOnly = false, sacrificeOnly = false, sacrificeChoice = 'continue' } = {}) {
  const recall = await import(modulePath);
  const adapter = recall.loadPinnedFullRecallProjectionEngineV8();
  const { G } = adapter;
  const state = G.makeState('solo', 8101, ['qingmian'],
    ['water', 'eyes', 'twinTiger', 'bloodOath'], 'original', false);
  preparePlayers(state);
  if (sacrificeOnly) state.players[0].bag.push({ ...G.POOL.find((item) => item.ab === 'xianji') });
  state.round = G.CFG.EVENT_NIGHTS[0];
  state.eventOrder[0] = 'zongzi';

  const eventDecision = adapter.event.createDecision(state);
  const event = adapter.event.observe(state, eventDecision, 0);
  const foreignEvent = adapter.event.observe(state, eventDecision, 1);
  const eventChoices = adapter.event.legalChoices(eventDecision, 0);
  const eventChoice = eventChoices[0];
  const foreignEventChoice = adapter.event.legalChoices(eventDecision, 1)[0];
  const eventHistory = eventOnlyUnrecorded ? [] : recall.appendFullRecallDecisionV8([], 'event', event,
    { choice: eventChoices[recordedEventChoiceIndex] });
  if (eventOnly) return {
    recall, adapter, eventDecision, event, eventChoice, eventChoices, foreignEventChoice,
    eventHistory, state,
  };
  for (const playerId of eventDecision.playerIds)
    adapter.event.commitChoice(eventDecision, playerId,
      adapter.event.legalChoices(eventDecision, playerId)[0]);
  const { publicTransition } = adapter.event.resolve(state, eventDecision);
  let history = recall.appendPublicTransitionV8(eventHistory, publicTransition);

  state.marks = {};
  const markDecision = adapter.mark.createDecision(state, 0);
  const mark = adapter.mark.observe(state, markDecision, [publicTransition]);
  history = recall.appendFullRecallDecisionV8(history, 'mark', mark, { choice: null });
  if (markOnly) return { recall, adapter, state, markDecision, mark, history };
  adapter.mark.commitChoice(state, markDecision, null);
  const sacrificeDecision = adapter.sacrifice.createDecision(state, 0);
  const sacrifice = adapter.sacrifice.observe(state, sacrificeDecision, [publicTransition]);
  history = recall.appendFullRecallDecisionV8(history, 'sacrifice', sacrifice, { choice: sacrificeChoice });
  if (sacrificeOnly) return { recall, adapter, state, sacrificeDecision, sacrifice, history };
  adapter.sacrifice.commitChoice(state, sacrificeDecision, sacrificeChoice);
  const auction = adapter.auction.observe(state, 0, [publicTransition]);
  history = recall.appendFullRecallDecisionV8(history, 'auction', auction, {
    schema: 'yaoshi.auction-submission.v1', playerId: 0, bids: [], incense: 0,
  });

  const shrineAdapter = recall.loadPinnedFullRecallProjectionEngineV8();
  const shrineG = shrineAdapter.G;
  const shrineState = shrineG.makeState('solo', 8102, ['qingmian'],
    ['water', 'eyes', 'twinTiger', 'bloodOath'], 'original', false);
  preparePlayers(shrineState);
  shrineState.round = shrineG.CFG.SHRINE_NIGHTS[0];
  shrineState.incPool[0] = 12;
  shrineState.incense = Object.fromEntries(shrineState.players.map((player) => [player.id, null]));
  const preShrineAuction = shrineAdapter.auction.observeWithoutEvent(shrineState, 0);
  const shrineDecision = shrineAdapter.shrine.beginResolution(shrineState);
  assert.ok(shrineDecision);
  const shrinePick = shrineAdapter.shrine.observe(shrineState, shrineDecision);

  return {
    recall,
    adapter,
    shrineAdapter,
    shrineState,
    eventDecision,
    eventHistory,
    event,
    foreignEvent,
    eventChoice,
    eventChoices,
    foreignEventChoice,
    publicTransition,
    history,
    state,
    markDecision,
    mark,
    sacrifice,
    auction,
    preShrineAuction,
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
  const { appendFullRecallDecisionV8, fullRecallInformationSetKeyV8 } = fixture.recall;
  assert.throws(() => fixture.adapter.mark.observe(fixture.state, fixture.markDecision,
    [fixture.publicTransition.payload]), /pinned transition provenance/);
  assert.throws(() => fixture.adapter.mark.observe(fixture.state, fixture.markDecision,
    [fixture.publicTransition, fixture.publicTransition]), /duplicate public event reveal/);
  const history = fixture.history;
  assert.deepEqual(history.filter((entry) => entry.kind === 'decision').map((entry) => entry.phase),
    ['event', 'mark', 'sacrifice', 'auction']);
  const shrineHistory = appendFullRecallDecisionV8([], 'shrine-pick', fixture.shrinePick,
    { choice: fixture.shrinePick.choices[0].index });
  assert.equal(shrineHistory.length, 1);
  assert.equal(typeof fullRecallInformationSetKeyV8([], fixture.shrinePick), 'string');
  const forgedCopy = deepFreeze({ ...fixture.mark });
  assert.throws(() => appendFullRecallDecisionV8(history, 'mark', forgedCopy, { choice: null }),
    /pinned projection provenance/);
  fixture.state.round = fixture.event.round + 1;
  fixture.state.marks = {};
  const currentDecision = fixture.adapter.mark.createDecision(fixture.state, 0);
  const currentObservation = fixture.adapter.mark.observe(fixture.state, currentDecision, []);
  const reordered = [history[2], history[0], history[1], ...history.slice(3)];
  assert.throws(() => fullRecallInformationSetKeyV8(reordered, currentObservation), /phase order/);
});

test('event phase cannot begin after a later phase has acted in the same round', async () => {
  const recall = await import(modulePath);
  const adapter = recall.loadPinnedFullRecallProjectionEngineV8();
  const { G } = adapter;
  const state = G.makeState('solo', 8111, ['qingmian'],
    ['water', 'eyes', 'twinTiger', 'bloodOath'], 'original', false);
  preparePlayers(state);
  state.round = G.CFG.EVENT_NIGHTS[0];
  state.eventOrder[0] = 'zongzi';
  state.marks = {};

  const markDecision = adapter.mark.createDecision(state, 0);
  const markObservation = adapter.mark.observe(state, markDecision, []);
  recall.appendFullRecallDecisionV8([], 'mark', markObservation, { choice: null });
  adapter.mark.commitChoice(state, markDecision, null);

  assert.throws(() => adapter.event.createDecision(state),
    /event phase cannot begin after a later same-round decision/);
});

test('event phase cannot begin after an auction action in another history', async () => {
  const recall = await import(modulePath);
  const adapter = recall.loadPinnedFullRecallProjectionEngineV8();
  const { G } = adapter;
  const state = G.makeState('solo', 8112, ['qingmian'],
    ['water', 'eyes', 'twinTiger', 'bloodOath'], 'original', false);
  preparePlayers(state);
  state.round = G.CFG.EVENT_NIGHTS[0];
  state.eventOrder[0] = 'zongzi';

  const auction = adapter.auction.observeWithoutEvent(state, 0);
  recall.appendFullRecallDecisionV8([], 'auction', auction, {
    schema: 'yaoshi.auction-submission.v1', playerId: 0, bids: [], incense: 0,
  });
  assert.throws(() => adapter.event.createDecision(state),
    /event phase cannot begin after a later same-round decision/);
});

test('event resolution runs only once per game state and round', async () => {
  const fixture = await createPinnedPhaseFixture({ eventOnly: true });
  const secondDecision = fixture.adapter.event.createDecision(fixture.state);
  fixture.adapter.event.observe(fixture.state, secondDecision, 0);

  fixture.adapter.event.commitChoice(fixture.eventDecision, 0, fixture.eventChoice);
  assert.throws(() => fixture.adapter.event.commitChoice(secondDecision, 0, fixture.eventChoice),
    /already committed at this state locus/);
  for (const playerId of fixture.eventDecision.playerIds.filter((id) => id !== 0))
    fixture.adapter.event.commitChoice(fixture.eventDecision, playerId,
      fixture.adapter.event.legalChoices(fixture.eventDecision, playerId)[0]);
  const before = fixture.state.players.map((player) => player.life);
  fixture.adapter.event.resolve(fixture.state, fixture.eventDecision);
  const afterFirstResolve = fixture.state.players.map((player) => player.life);
  assert.notDeepEqual(afterFirstResolve, before);
  assert.throws(() => fixture.adapter.event.resolve(fixture.state, fixture.eventDecision),
    /already completed for this round/);
  assert.deepEqual(fixture.state.players.map((player) => player.life), afterFirstResolve);
});

test('event settlement rejects a decision after a later phase advances the state', async () => {
  const fixture = await createPinnedPhaseFixture({ eventOnly: true });
  for (const playerId of fixture.eventDecision.playerIds)
    fixture.adapter.event.commitChoice(fixture.eventDecision, playerId,
      fixture.adapter.event.legalChoices(fixture.eventDecision, playerId)[0]);

  fixture.state.marks = {};
  const markDecision = fixture.adapter.mark.createDecision(fixture.state, 0);
  const markObservation = fixture.adapter.mark.observe(fixture.state, markDecision, []);
  fixture.recall.appendFullRecallDecisionV8([], 'mark', markObservation, { choice: null });
  fixture.adapter.mark.commitChoice(fixture.state, markDecision, null);
  const lifeAfterMark = fixture.state.players.map((player) => player.life);

  assert.throws(() => fixture.adapter.event.resolve(fixture.state, fixture.eventDecision),
    /event decision is stale after a state transition/);
  assert.deepEqual(fixture.state.players.map((player) => player.life), lifeAfterMark);
});

test('an event decision cannot be reopened after settlement at a later revision', async () => {
  const fixture = await createPinnedPhaseFixture({ eventOnly: true });
  for (const playerId of fixture.eventDecision.playerIds)
    fixture.adapter.event.commitChoice(fixture.eventDecision, playerId,
      fixture.adapter.event.legalChoices(fixture.eventDecision, playerId)[0]);
  fixture.adapter.event.resolve(fixture.state, fixture.eventDecision);

  assert.throws(() => fixture.adapter.event.createDecision(fixture.state),
    /event decision phase was already opened at an earlier state revision/);
});

test('a pinned public event reveal is included in a later information key', async () => {
  const fixture = await createPinnedPhaseFixture();
  const {
    appendFullRecallDecisionV8,
    appendPublicTransitionV8,
    fullRecallInformationSetKeyV8,
  } = fixture.recall;
  const historyBeforeReveal = fixture.eventHistory;
  fixture.state.round = fixture.event.round + 1;
  fixture.state.marks = {};
  const currentDecision = fixture.adapter.mark.createDecision(fixture.state, 0);
  const currentObservation = fixture.adapter.mark.observe(fixture.state, currentDecision, []);
  const withoutPriorHistory = fullRecallInformationSetKeyV8([], currentObservation);
  let history = historyBeforeReveal;
  history = appendPublicTransitionV8(history, fixture.publicTransition);
  assert.deepEqual(history.map((entry) => entry.kind), ['decision', 'public-transition']);
  const afterReveal = fullRecallInformationSetKeyV8(history, currentObservation);
  assert.notEqual(afterReveal, withoutPriorHistory);
  assert.equal(history[1].transition.type, 'event.reveal');
  assert.equal(history[1].transition.round, fixture.event.round);
  assert.throws(() => fullRecallInformationSetKeyV8(history, fixture.event), /phase order/);

  const forged = deepFreeze({ ...fixture.publicTransition });
  assert.throws(() => appendPublicTransitionV8(history, forged), /pinned transition provenance/);
});

test('a public event reveal must match the seat action recorded in its history', async () => {
  const fixture = await createPinnedPhaseFixture({ recordedEventChoiceIndex: 1, eventOnly: true });
  const recordedChoice = fixture.eventHistory[0].record.action.choice;
  assert.notEqual(recordedChoice, fixture.eventChoices[0], 'the fixture records a different legal choice');
  assert.throws(() => fixture.adapter.event.commitChoice(fixture.eventDecision, 0,
    fixture.eventChoices[0]), /recorded full-recall action/);
});

test('an event action recorded after commitment must match the committed choice', async () => {
  const fixture = await createPinnedPhaseFixture({ eventOnly: true, eventOnlyUnrecorded: true });
  const wrongChoice = fixture.eventChoices.find((choice) => !Object.is(choice, fixture.eventChoice));
  assert.notEqual(wrongChoice, undefined);
  fixture.adapter.event.commitChoice(fixture.eventDecision, 0, fixture.eventChoice);
  const lifeBefore = fixture.state.players.map((player) => player.life);
  assert.throws(() => fixture.recall.appendFullRecallDecisionV8([], 'event', fixture.event, {
    choice: wrongChoice,
  }), /committed choice at this state locus/);
  assert.deepEqual(fixture.state.players.map((player) => player.life), lifeBefore);
  for (const playerId of fixture.eventDecision.playerIds.filter((id) => id !== 0))
    fixture.adapter.event.commitChoice(fixture.eventDecision, playerId,
      fixture.adapter.event.legalChoices(fixture.eventDecision, playerId)[0]);
  assert.doesNotThrow(() => fixture.adapter.event.resolve(fixture.state, fixture.eventDecision));
});

test('a late event action from another decision object must match the committed state-locus choice', async () => {
  const fixture = await createPinnedPhaseFixture({ eventOnly: true, eventOnlyUnrecorded: true });
  const decisionB = fixture.adapter.event.createDecision(fixture.state);
  const observationB = fixture.adapter.event.observe(fixture.state, decisionB, 0);
  const wrongChoice = fixture.eventChoices.find((choice) => !Object.is(choice, fixture.eventChoice));
  assert.notEqual(wrongChoice, undefined);

  fixture.adapter.event.commitChoice(fixture.eventDecision, 0, fixture.eventChoice);
  assert.throws(() => fixture.recall.appendFullRecallDecisionV8([], 'event', observationB, {
    choice: wrongChoice,
  }), /committed choice at this state locus/);
  for (const playerId of fixture.eventDecision.playerIds.filter((id) => id !== 0))
    fixture.adapter.event.commitChoice(fixture.eventDecision, playerId,
      fixture.adapter.event.legalChoices(fixture.eventDecision, playerId)[0]);
  assert.doesNotThrow(() => fixture.adapter.event.resolve(fixture.state, fixture.eventDecision));
});

test('later phase histories and current keys require resolved and committed prior actions', async () => {
  const fixture = await createPinnedPhaseFixture({ eventOnly: true });
  fixture.state.marks = {};
  const unprogressedMarkDecision = fixture.adapter.mark.createDecision(fixture.state, 0);
  const unprogressedMark = fixture.adapter.mark.observe(fixture.state, unprogressedMarkDecision, []);
  assert.throws(() => fixture.recall.appendFullRecallDecisionV8(fixture.eventHistory,
    'mark', unprogressedMark, { choice: null }), /public event reveal/);
  assert.throws(() => fixture.recall.fullRecallInformationSetKeyV8(fixture.eventHistory, unprogressedMark),
    /public event reveal/);

  for (const playerId of fixture.eventDecision.playerIds)
    fixture.adapter.event.commitChoice(fixture.eventDecision, playerId,
      fixture.adapter.event.legalChoices(fixture.eventDecision, playerId)[0]);
  const { publicTransition } = fixture.adapter.event.resolve(fixture.state, fixture.eventDecision);
  const historyWithReveal = fixture.recall.appendPublicTransitionV8(fixture.eventHistory, publicTransition);
  const markDecision = fixture.adapter.mark.createDecision(fixture.state, 0);
  const markObservation = fixture.adapter.mark.observe(fixture.state, markDecision, [publicTransition]);
  const historyWithMark = fixture.recall.appendFullRecallDecisionV8(historyWithReveal,
    'mark', markObservation, { choice: null });
  const staleSacrificeDecision = fixture.adapter.sacrifice.createDecision(fixture.state, 0);
  const staleSacrifice = fixture.adapter.sacrifice.observe(fixture.state, staleSacrificeDecision, [publicTransition]);
  assert.throws(() => fixture.recall.appendFullRecallDecisionV8(historyWithMark,
    'sacrifice', staleSacrifice, { choice: 'continue' }), /mark action must be committed/);
  assert.throws(() => fixture.recall.fullRecallInformationSetKeyV8(historyWithMark, staleSacrifice),
    /mark action must be committed/);

  fixture.adapter.mark.commitChoice(fixture.state, markDecision, null);
  assert.throws(() => fixture.recall.fullRecallInformationSetKeyV8(historyWithMark, staleSacrifice),
    /state transition within the same round/);
  const freshSacrificeDecision = fixture.adapter.sacrifice.createDecision(fixture.state, 0);
  const freshSacrifice = fixture.adapter.sacrifice.observe(fixture.state, freshSacrificeDecision, [publicTransition]);
  assert.doesNotThrow(() => fixture.recall.fullRecallInformationSetKeyV8(historyWithMark, freshSacrifice));
  assert.doesNotThrow(() => fixture.recall.appendFullRecallDecisionV8(historyWithMark,
    'sacrifice', freshSacrifice, { choice: 'continue' }));
});

test('a decision object cannot be rebound to a conflicting action in a forked history', async () => {
  const fixture = await createPinnedPhaseFixture({ markOnly: true });
  const historyA = fixture.history;

  assert.equal(historyA.at(-1).record.action.choice, null);
  assert.throws(() => fixture.recall.appendFullRecallDecisionV8([], 'mark', fixture.mark, { choice: 0 }),
    /conflicting full-recall action/);
  assert.throws(() => fixture.adapter.mark.commitChoice(fixture.state, fixture.markDecision, 0),
    /does not match the recorded full-recall action/);
  fixture.adapter.mark.commitChoice(fixture.state, fixture.markDecision, null);
  const sacrificeDecision = fixture.adapter.sacrifice.createDecision(fixture.state, 0);
  const sacrifice = fixture.adapter.sacrifice.observe(fixture.state, sacrificeDecision, []);
  assert.equal(typeof fixture.recall.fullRecallInformationSetKeyV8(historyA, sacrifice), 'string');
  assert.equal(fixture.state.marks[0], null);
});

test('different decision objects at one state locus cannot bind conflicting actions', async () => {
  const fixture = await createPinnedPhaseFixture({ markOnly: true });
  const historyA = fixture.history;
  const decisionB = fixture.adapter.mark.createDecision(fixture.state, 0);
  const observationB = fixture.adapter.mark.observe(fixture.state, decisionB, []);

  assert.equal(historyA.at(-1).record.action.choice, null);
  assert.throws(() => fixture.recall.appendFullRecallDecisionV8([], 'mark', observationB, { choice: 0 }),
    /conflicting full-recall action/);
  assert.throws(() => fixture.adapter.mark.commitChoice(fixture.state, decisionB, 0),
    /does not match the recorded full-recall action/);
  fixture.adapter.mark.commitChoice(fixture.state, fixture.markDecision, null);
  const sacrificeDecision = fixture.adapter.sacrifice.createDecision(fixture.state, 0);
  const sacrifice = fixture.adapter.sacrifice.observe(fixture.state, sacrificeDecision, []);
  assert.equal(typeof fixture.recall.fullRecallInformationSetKeyV8(historyA, sacrifice), 'string');
  assert.equal(fixture.state.marks[0], null);
});

test('shrine resolution can start only once per game state and round', async () => {
  const fixture = await createPinnedPhaseFixture();
  assert.ok(fixture.shrinePick.choices.length > 1);
  assert.throws(() => fixture.shrineAdapter.shrine.beginResolution(fixture.shrineState),
    /already started for this round/);
});

test('a recorded action cannot commit after its decision projection becomes stale', async () => {
  const fixture = await createPinnedPhaseFixture({ eventOnly: true });
  fixture.state.marks = {};
  fixture.state.players[0].bag.push({ ...fixture.adapter.G.POOL.find((item) => item.ab === 'xianji') });
  for (const playerId of fixture.eventDecision.playerIds)
    fixture.adapter.event.commitChoice(fixture.eventDecision, playerId,
      fixture.adapter.event.legalChoices(fixture.eventDecision, playerId)[0]);
  const { publicTransition } = fixture.adapter.event.resolve(fixture.state, fixture.eventDecision);
  const history = fixture.recall.appendPublicTransitionV8(fixture.eventHistory, publicTransition);

  const markDecision = fixture.adapter.mark.createDecision(fixture.state, 0);
  const markObservation = fixture.adapter.mark.observe(fixture.state, markDecision, [publicTransition]);
  const markHistory = fixture.recall.appendFullRecallDecisionV8(history, 'mark', markObservation, { choice: null });
  fixture.adapter.mark.commitChoice(fixture.state, markDecision, null);
  const sacrificeDecision = fixture.adapter.sacrifice.createDecision(fixture.state, 0);
  const sacrificeObservation = fixture.adapter.sacrifice.observe(fixture.state, sacrificeDecision, [publicTransition]);
  fixture.recall.appendFullRecallDecisionV8(markHistory, 'sacrifice', sacrificeObservation, { choice: 'continue' });
  fixture.adapter.sacrifice.commitChoice(fixture.state, sacrificeDecision, 'continue');

  assert.throws(() => fixture.adapter.mark.commitChoice(fixture.state, markDecision, null),
    /decision is stale after a state transition/);
  assert.equal(fixture.state.marks[0], null);
});

test('a pinned projection from another game state branch cannot join an existing history', async () => {
  const fixture = await createPinnedPhaseFixture();
  const { G } = fixture.adapter;
  let history = fixture.eventHistory;
  history = fixture.recall.appendPublicTransitionV8(history, fixture.publicTransition);

  const otherState = G.makeState('solo', 8103, ['qingmian'],
    ['water', 'eyes', 'twinTiger', 'bloodOath'], 'original', false);
  preparePlayers(otherState);
  otherState.round = fixture.event.round;
  otherState.marks = {};
  const otherDecision = fixture.adapter.mark.createDecision(otherState, 0);
  const otherObservation = fixture.adapter.mark.observe(otherState, otherDecision, []);

  assert.throws(() => fixture.recall.fullRecallInformationSetKeyV8(history, otherObservation),
    /one game state branch/);
});

test('one history cannot record the same sacrifice decision locus twice', async () => {
  const fixture = await createPinnedPhaseFixture({ sacrificeOnly: true, sacrificeChoice: 'bleed' });
  const decisionB = fixture.adapter.sacrifice.createDecision(fixture.state, 0);
  const observationB = fixture.adapter.sacrifice.observe(fixture.state, decisionB, []);
  assert.throws(() => fixture.recall.appendFullRecallDecisionV8(fixture.history,
    'sacrifice', observationB, { choice: 'bleed' }), /duplicate decision locus/);

  fixture.adapter.sacrifice.commitChoice(fixture.state, fixture.sacrificeDecision, 'bleed');
  const nextDecision = fixture.adapter.sacrifice.createDecision(fixture.state, 0);
  const nextObservation = fixture.adapter.sacrifice.observe(fixture.state, nextDecision, []);
  const nextHistory = fixture.recall.appendFullRecallDecisionV8(fixture.history,
    'sacrifice', nextObservation, { choice: 'bleed' });
  assert.equal(nextHistory.filter((entry) => entry.kind === 'decision' && entry.phase === 'sacrifice').length, 2);
});

test('one full-recall sacrifice action can commit once, then requires a fresh locus', async () => {
  const fixture = await createPinnedPhaseFixture({ sacrificeOnly: true, sacrificeChoice: 'bleed' });
  const lifeBefore = fixture.state.players[0].life;
  fixture.adapter.sacrifice.commitChoice(fixture.state, fixture.sacrificeDecision, 'bleed');
  const lifeAfterFirst = fixture.state.players[0].life;
  assert.ok(lifeAfterFirst < lifeBefore);
  assert.throws(() => fixture.adapter.sacrifice.commitChoice(fixture.state, fixture.sacrificeDecision, 'bleed'),
    /stale after a state transition/);
  assert.equal(fixture.state.players[0].life, lifeAfterFirst);

  const nextDecision = fixture.adapter.sacrifice.createDecision(fixture.state, 0);
  const nextObservation = fixture.adapter.sacrifice.observe(fixture.state, nextDecision, []);
  assert.ok(nextObservation.legalActions.includes('bleed'));
  const nextHistory = fixture.recall.appendFullRecallDecisionV8(fixture.history,
    'sacrifice', nextObservation, { choice: 'bleed' });
  fixture.adapter.sacrifice.commitChoice(fixture.state, nextDecision, 'bleed');
  assert.equal(nextHistory.at(-1).record.action.choice, 'bleed');
  assert.ok(fixture.state.players[0].life < lifeAfterFirst);
});

test('wrapper-tracked state changes invalidate stale projections', async () => {
  const fixture = await createPinnedPhaseFixture();
  assert.throws(() => fixture.recall.appendFullRecallDecisionV8([], 'event', fixture.event,
    { choice: fixture.eventChoice }), /stale after a state transition/);
  assert.throws(() => fixture.recall.fullRecallInformationSetKeyV8([], fixture.mark),
    /stale after a state transition/);
  assert.throws(() => fixture.adapter.mark.commitChoice(fixture.state, fixture.markDecision, 0),
    /stale after a state transition/);
  assert.throws(() => fixture.recall.fullRecallInformationSetKeyV8([], fixture.preShrineAuction),
    /stale after a state transition/);
});

test('v8 preserves same-seat and chronological guards across public transitions', async () => {
  const fixture = await createPinnedPhaseFixture();
  const {
    appendFullRecallDecisionV8,
    appendPublicTransitionV8,
  } = fixture.recall;
  let history = fixture.eventHistory;
  assert.throws(() => appendFullRecallDecisionV8(history, 'event', fixture.event, {
    choice: fixture.eventChoice,
  }), /duplicate single-use/);
  assert.throws(() => appendFullRecallDecisionV8(history, 'event', fixture.foreignEvent, {
    choice: fixture.foreignEventChoice,
  }), /same viewer/);
  history = appendPublicTransitionV8(history, fixture.publicTransition);
  assert.throws(() => appendPublicTransitionV8(history, fixture.publicTransition), /duplicate public transition/);
  fixture.state.round = fixture.event.round + 1;
  fixture.state.marks = {};
  const laterMarkDecision = fixture.adapter.mark.createDecision(fixture.state, 0);
  const laterMark = fixture.adapter.mark.observe(fixture.state, laterMarkDecision, []);
  const nextRound = appendFullRecallDecisionV8(history, 'mark', laterMark, { choice: null });
  assert.throws(() => appendFullRecallDecisionV8(nextRound, 'mark', fixture.mark, { choice: null }), /chronological/);
  assert.throws(() => appendFullRecallDecisionV8(history, 'mark', fixture.foreignEvent, { choice: null }),
    /phase and observation schema/);
});

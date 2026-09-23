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

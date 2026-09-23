import test from 'node:test';
import assert from 'node:assert/strict';

const adapterModule = './tools/l1e-cross-night-restore-adapter-v9.mjs';
const PRIVATE_DRAWS = ['water', 'eyes', 'twinTiger', 'bloodOath'];

test('v9 contract advances cross-night restore while keeping chance and release gates incomplete', async () => {
  const { readCrossNightContractV9 } = await import(adapterModule);
  const contract = readCrossNightContractV9();

  assert.equal(contract.schema, 'yaoshi.l1e.sixOfFour.modelContract.v9');
  assert.equal(contract.previousContract.schema, 'yaoshi.l1e.sixOfFour.modelContract.v8');
  assert.equal(contract.inventory['state.snapshotRestore.crossNight'], 'partial');
  assert.equal(contract.inventory['chance.fullGame'], 'incomplete');
  assert.equal(contract.fixtureBatch.status, 'partial');
  assert.equal(contract.gate.sixOfFour, 'incomplete');
  assert.equal(contract.gate.solverStatus, 'not-run');
  assert.equal(contract.gate.releaseEligible, false);
  assert.equal(contract.source.commit, 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a');
  assert.equal(contract.source.gitBlobOid, '8ba772b9d960eff8b9c42eac77040433f809c57d');
  assert.equal(contract.source.sha256, '8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d');
});

test('the cross-night checkpoint comes from a frozen-engine night and captures both RNG streams and runner memory', async () => {
  const { loadCrossNightRestoreEngineV9, runToFirstNightBoundaryV9 } = await import(adapterModule);
  const engine = loadCrossNightRestoreEngineV9();
  const snapshot = runToFirstNightBoundaryV9(engine, {
    seed: 123,
    picks: ['qingmian'],
    privateDestinyDraws: PRIVATE_DRAWS,
    policyInformation: true,
  });

  assert.equal(snapshot.schema, 'yaoshi.cross-night-snapshot.v9');
  assert.equal(snapshot.boundary.kind, 'afterNightResolution.beforeNextRound');
  assert.equal(snapshot.boundary.round, 1);
  assert.equal(snapshot.state.round, 1);
  assert.equal(snapshot.state.history.nights.length, 1);
  assert.deepEqual(snapshot.state.players.map((player) => player.destiny), PRIVATE_DRAWS);
  assert.ok(Number.isInteger(snapshot.rng.gameplay));
  assert.ok(Number.isInteger(snapshot.rng.ui));
  assert.equal(Object.hasOwn(snapshot.state, 'rng'), false);
  assert.equal(Object.hasOwn(snapshot.state, 'rngUi'), false);
  assert.equal(snapshot.runnerContext.policyInformation, true);
  assert.ok(Array.isArray(snapshot.runnerContext.previousReveal));
  assert.equal(snapshot.runnerContext.lifeByRound.length, 1);
  assert.match(snapshot.digest, /^[a-f0-9]{64}$/);
  assert.ok(snapshot.provenance.instrumentedSourceSha256);
});

test('a separate pinned engine restores the graph and follows the frozen next-round market schedule identically', async () => {
  const {
    loadCrossNightRestoreEngineV9,
    runToFirstNightBoundaryV9,
    restoreCrossNightSnapshotV9,
    advanceNextRoundMarketV9,
    assertCrossNightSnapshotCurrentV9,
  } = await import(adapterModule);
  const sourceEngine = loadCrossNightRestoreEngineV9();
  const firstNight = runToFirstNightBoundaryV9(sourceEngine, {
    seed: 9182,
    picks: ['qingmian'],
    privateDestinyDraws: PRIVATE_DRAWS,
    policyInformation: true,
  });
  const restoredEngine = loadCrossNightRestoreEngineV9();
  const restored = restoreCrossNightSnapshotV9(restoredEngine, firstNight);

  assert.notEqual(restored.state, sourceEngine.G.S);
  assert.doesNotThrow(() => assertCrossNightSnapshotCurrentV9(restoredEngine, firstNight));
  assert.deepEqual(restored.state.players.map((player) => player.destiny), PRIVATE_DRAWS);
  assert.deepEqual(restored.state.history, firstNight.state.history);

  const sourceNextNight = advanceNextRoundMarketV9(sourceEngine, firstNight);
  const restoredNextNight = advanceNextRoundMarketV9(restoredEngine, firstNight);
  assert.equal(sourceNextNight.digest, restoredNextNight.digest);
  assert.equal(restoredNextNight.boundary.kind, 'afterNextRoundMarketSchedule.beforeBeginRound');
  assert.equal(restoredNextNight.state.round, 2);
  assert.deepEqual(restoredNextNight.state.market.map((item) => item.n),
    sourceNextNight.state.market.map((item) => item.n));
  assert.deepEqual(restoredNextNight.state.nextMarket.map((item) => item.n),
    sourceNextNight.state.nextMarket.map((item) => item.n));
  assert.equal(restoredNextNight.rng.gameplay, sourceNextNight.rng.gameplay);
  assert.equal(restoredNextNight.rng.ui, sourceNextNight.rng.ui);

  const sourceLife = sourceEngine.G.S.players[0].life;
  restoredEngine.G.S.players[0].life -= 1;
  assert.equal(sourceEngine.G.S.players[0].life, sourceLife,
    'restoring into another engine must not retain mutable state aliases');
});

test('snapshot restore rejects mutated payloads and state roots not created by its engine wrapper', async () => {
  const {
    loadCrossNightRestoreEngineV9,
    runToFirstNightBoundaryV9,
    restoreCrossNightSnapshotV9,
    captureCrossNightSnapshotV9,
  } = await import(adapterModule);
  const engine = loadCrossNightRestoreEngineV9();
  const snapshot = runToFirstNightBoundaryV9(engine, {
    seed: 77,
    picks: ['qingmian'],
    privateDestinyDraws: PRIVATE_DRAWS,
    policyInformation: true,
  });
  const target = loadCrossNightRestoreEngineV9();

  snapshot.state.wonAny.add('tampered');
  assert.throws(() => restoreCrossNightSnapshotV9(target, snapshot), /snapshot integrity/);
  assert.throws(() => captureCrossNightSnapshotV9(engine, {}, {}), /registered pinned engine state/);
});

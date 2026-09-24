import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const adapterModule = './tools/l1e-destiny-adapter-fixtures.mjs';
const CHAIN_IDS = ['water', 'eyes', 'twinTiger', 'bloodOath', 'godKing', 'eternalFlame'];
const PRIVATE_DRAWS = ['water', 'eyes', 'twinTiger', 'bloodOath'];

function withSecureBytes(values, run) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  let cursor = 0;
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      getRandomValues(bytes) {
        assert.ok(cursor < values.length, 'engine requested more random bytes than the fixture supplied');
        bytes[0] = values[cursor++];
        return bytes;
      },
    },
  });
  try {
    return run(() => cursor);
  } finally {
    Object.defineProperty(globalThis, 'crypto', descriptor);
  }
}

function item(G, ab) {
  const found = G.POOL.find((entry) => entry.ab === ab);
  assert.ok(found, 'fixture item must exist in the frozen engine');
  return { ...found };
}

function auctionSummary(results) {
  return results.map((result) => ({
    item: result.it.ab,
    winnerId: result.winner?.p.id ?? null,
    outcome: result.outcome,
    entries: result.entries.map((entry) => ({
      pid: entry.p.id,
      amt: entry.amt,
      type: entry.type,
      intent: entry.intent,
      target: entry.target,
      cost: entry.cost,
      fee: entry.fee,
    })),
    events: result.events.map((event) => ({ ...event })),
    destinyAwakenings: result.destinyAwakenings.map((event) => ({ ...event })),
  }));
}

test('v2 contract pins the current product and keeps six-of-four and release gates closed', async () => {
  const adapter = await import(adapterModule);
  const contract = adapter.readModelContractV2();
  const source = adapter.verifyPinnedProductSource();

  assert.equal(contract.schema, 'yaoshi.l1e.sixOfFour.modelContract.v2');
  assert.deepEqual(contract.scope.chainIds, CHAIN_IDS);
  assert.deepEqual(contract.scope.destiny.effectModes, ['ordinary', 'original', 'candidate']);
  assert.deepEqual(contract.scope.destiny.aiChase, [false, true]);
  assert.equal(contract.scope.destiny.seats, 4);
  assert.equal(contract.scope.destiny.withReplacement, true);
  assert.equal(contract.scope.destiny.secureDraw.jointOutcomeCount, 1296);
  assert.deepEqual(contract.fixtureBatch.runtimeProvenance,
    ['sourceCommit', 'sourceBlobOid', 'sourceSha256', 'adapterSha256', 'fixtureSha256', 'instrumentedSourceSha256']);
  assert.equal(contract.gate.sixOfFour, 'incomplete');
  assert.equal(contract.gate.releaseEligible, false);
  assert.equal(source.commit, 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a');
  assert.equal(source.blobOid, '8ba772b9d960eff8b9c42eac77040433f809c57d');
  assert.equal(source.sha256, '8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d');
  /* 2026-09-24 起工作樹可與 pin 不同（血祭 blood-L）；欄位須照實反映 git diff。 */
  const worktreeDiff = spawnSync('git', ['diff', '--quiet', source.commit, '--', 'index.html'],
    { cwd: fileURLToPath(new URL('..', import.meta.url)) });
  assert.equal(source.currentWorktreeMatches, worktreeDiff.status === 0);
  const { provenance } = adapter.loadPinnedFixtureEngine();
  assert.match(provenance.adapterSha256, /^[a-f0-9]{64}$/);
  assert.match(provenance.fixtureSha256, /^[a-f0-9]{64}$/);
  assert.match(provenance.instrumentedSourceSha256, /^[a-f0-9]{64}$/);
});

test('secure private-destiny draw covers all 252 accepted bytes and rejects modulo-biased tail bytes', async () => {
  const { loadPinnedFixtureEngine } = await import(adapterModule);
  const G = loadPinnedFixtureEngine().G;
  assert.deepEqual(Object.keys(G.CHAINS), CHAIN_IDS);

  withSecureBytes(Array.from({ length: 252 }, (_, value) => value), (calls) => {
    const counts = Object.fromEntries(CHAIN_IDS.map((id) => [id, 0]));
    for (let raw = 0; raw < 252; raw++) counts[G.drawDestinies(1)[0]]++;
    assert.deepEqual(Object.values(counts), [42, 42, 42, 42, 42, 42]);
    assert.equal(calls(), 252);
  });

  withSecureBytes([252, 0, 253, 1, 254, 2, 255, 3], (calls) => {
    assert.deepEqual(G.drawDestinies(4), ['water', 'eyes', 'twinTiger', 'bloodOath']);
    assert.equal(calls(), 8, '252–255 must each be rejected before accepting the next byte');
  });
});

test('four independent private draws expose all 1296 joint tuples, including collisions', async () => {
  const { loadPinnedFixtureEngine } = await import(adapterModule);
  const G = loadPinnedFixtureEngine().G;
  const bytes = [];
  for (let tuple = 0; tuple < 6 ** 4; tuple++) {
    let value = tuple;
    for (let seat = 0; seat < 4; seat++) {
      bytes.push(value % 6);
      value = Math.floor(value / 6);
    }
  }

  withSecureBytes(bytes, (calls) => {
    const tuples = new Set();
    let hasCollision = false;
    for (let i = 0; i < 6 ** 4; i++) {
      const draw = G.drawDestinies(4);
      tuples.add(draw.join('|'));
      if (new Set(draw).size < 4) hasCollision = true;
    }
    assert.equal(tuples.size, 1296);
    assert.equal(hasCollision, true);
    assert.equal(calls(), 4 * 1296);
  });
});

test('private draws do not advance or alter the public seeded market stream', async () => {
  const { loadPinnedFixtureEngine } = await import(adapterModule);
  const { G: a } = loadPinnedFixtureEngine();
  const { G: b } = loadPinnedFixtureEngine();
  const left = a.makeState('solo', 8123, ['qingmian'], PRIVATE_DRAWS, 'off', false);
  const right = b.makeState('solo', 8123, ['qingmian'], [...PRIVATE_DRAWS].reverse(), 'off', false);

  assert.notDeepEqual(left.players.map((player) => player.destiny), right.players.map((player) => player.destiny));
  assert.deepEqual(left.market.map((entry) => entry.n), right.market.map((entry) => entry.n));
  assert.deepEqual(left.nextMarket.map((entry) => entry.n), right.nextMarket.map((entry) => entry.n));
  assert.equal(left.rng.getState(), right.rng.getState());
});

test('state-only snapshot restores the initial auction boundary, aliases, result and next gameplay RNG', async () => {
  const {
    loadPinnedFixtureEngine,
    captureGameStateSnapshot,
    restoreGameStateSnapshot,
    canonicalStateCheckpoint,
  } = await import(adapterModule);
  const G = loadPinnedFixtureEngine().G;
  const state = G.makeState('solo', 9031, ['qingmian'], PRIVATE_DRAWS, 'off', false);
  state.players.forEach((player) => {
    player.ai = null;
    player.alive = true;
    player.life = 60;
  });
  state.players[0].bag = [item(G, 'boat')];
  state.market = [item(G, 'bow')];
  state.humanBids = {
    0: [{ amt: 4, type: 'cons', intent: 'keep', target: null }],
    1: [{ amt: 4, type: 'cons', intent: 'keep', target: null }],
  };

  const start = canonicalStateCheckpoint(state);
  const snapshot = captureGameStateSnapshot(state);
  const firstResult = auctionSummary(G.resolveAuction());
  const firstState = canonicalStateCheckpoint(G.S);
  const firstNextRandom = G.S.rng();

  restoreGameStateSnapshot(G.S, snapshot);
  assert.equal(canonicalStateCheckpoint(G.S), start, 'restore must reproduce the exact pre-auction engine state');
  const secondResult = auctionSummary(G.resolveAuction());
  const secondState = canonicalStateCheckpoint(G.S);
  const secondNextRandom = G.S.rng();

  assert.deepEqual(secondResult, firstResult);
  assert.equal(secondState, firstState);
  assert.equal(secondNextRandom, firstNextRandom);
  assert.equal(G.S.auctionPublicStates[0][0].bag[0], G.S.players[0].bag[0],
    'the restored graph must preserve the engine snapshot’s item alias');
});

test('public replay keeps opposing sealed bids hidden until the corresponding reveal', async () => {
  const { loadPinnedFixtureEngine } = await import(adapterModule);
  const play = (bids) => {
    const G = loadPinnedFixtureEngine().G;
    const state = G.makeState('solo', 712, ['qingmian'], PRIVATE_DRAWS, 'off', false);
    state.players.forEach((player) => {
      player.ai = null;
      player.alive = true;
      player.life = 60;
    });
    state.market = [item(G, 'bow')];
    state.humanBids = bids;
    const results = G.resolveAuction();
    return { G, state, results, beforeReveal: G.replayExport(state) };
  };

  const left = play({
    0: [{ amt: 6, type: 'cons', intent: 'keep', target: null }],
    1: [{ amt: 2, type: 'cons', intent: 'keep', target: null }],
  });
  const right = play({
    0: [{ amt: 2, type: 'cons', intent: 'keep', target: null }],
    1: [{ amt: 6, type: 'cons', intent: 'keep', target: null }],
  });
  assert.notEqual(left.results[0].winner.p.id, right.results[0].winner.p.id);
  assert.deepEqual(left.beforeReveal, right.beforeReveal);
  assert.equal(JSON.stringify(left.beforeReveal).includes('humanBids'), false);
  left.G.publishDestinyReveal(left.results[0]);
  right.G.publishDestinyReveal(right.results[0]);
  assert.notDeepEqual(left.G.replayExport(left.state), right.G.replayExport(right.state),
    'the published auction result becomes public only at its reveal boundary');
});

test('seat-specific destiny projection is invariant to hidden opponents until a legal reveal', async () => {
  const { loadPinnedFixtureEngine } = await import(adapterModule);
  const { G: a } = loadPinnedFixtureEngine();
  const { G: b } = loadPinnedFixtureEngine();
  const left = a.makeState('solo', 44, ['qingmian'], ['water', 'eyes', 'godKing', 'bloodOath'], 'off', false);
  const right = b.makeState('solo', 44, ['qingmian'], ['water', 'bloodOath', 'eyes', 'godKing'], 'off', false);
  left.players.forEach((player) => { player.ai = null; });
  right.players.forEach((player) => { player.ai = null; });

  const ownLeft = a.destinyProjection(left.players[0], { viewer: 0, phase: 'market' });
  const ownRight = b.destinyProjection(right.players[0], { viewer: 0, phase: 'market' });
  assert.deepEqual(ownLeft, { chainId: 'water', awakened: false, private: true });
  assert.deepEqual(ownRight, ownLeft);
  assert.equal(a.destinyProjection(left.players[1], { viewer: 0, phase: 'market' }).chainId, null);
  assert.equal(b.destinyProjection(right.players[1], { viewer: 0, phase: 'market' }).chainId, null);
  assert.deepEqual(a.replayExport(left), b.replayExport(right));

  left.players[1].destinyAwakened = true;
  a.publishDestinyReveal({ destinyAwakenings: [{ pid: 1, chainId: 'eyes' }] });
  assert.equal(a.destinyProjection(left.players[1], { viewer: 0, phase: 'reveal' }).chainId, 'eyes');
  assert.equal(b.destinyProjection(right.players[1], { viewer: 0, phase: 'reveal' }).chainId, null);
});

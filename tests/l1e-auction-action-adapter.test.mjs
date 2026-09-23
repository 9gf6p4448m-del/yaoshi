import test from 'node:test';
import assert from 'node:assert/strict';

const adapterModule = './tools/l1e-auction-action-adapter.mjs';
const privateDraws = ['water', 'eyes', 'twinTiger', 'bloodOath'];

test('v3 contract records auction-only progress and leaves the full-game gates closed', async () => {
  const { readAuctionModelContractV3, auctionAdapterStatus } = await import(adapterModule);
  const contract = readAuctionModelContractV3();
  assert.equal(contract.schema, 'yaoshi.l1e.sixOfFour.modelContract.v3');
  assert.equal(contract.source.commit, 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a');
  assert.equal(contract.source.gitBlobOid, '8ba772b9d960eff8b9c42eac77040433f809c57d');
  assert.equal(contract.source.sha256, '8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d');
  assert.equal(contract.inventory['actions.auction'], 'partial');
  assert.equal(contract.inventory['actions.other'], 'incomplete');
  assert.equal(contract.inventory.sixOfFourSolver, 'not-run');
  assert.equal(contract.gate.sixOfFour, 'incomplete');
  assert.equal(contract.gate.releaseEligible, false);
  assert.deepEqual(auctionAdapterStatus().excludedDecisionPhases,
    ['mark', 'event', 'sacrifice', 'shrine-pick', 'battle', 'settlement']);
});

function item(G, ab) {
  const found = G.POOL.find((entry) => entry.ab === ab);
  assert.ok(found, `fixture item ${ab} must exist`);
  return { ...found };
}

async function fixture({ life = 3, market = ['bow'], singleStake = false } = {}) {
  const { loadPinnedFixtureEngine } = await import('./tools/l1e-destiny-adapter-fixtures.mjs');
  const G = loadPinnedFixtureEngine().G;
  const state = G.makeState('hotseat', 1729, ['qingmian'], privateDraws, 'off', false);
  state.players.forEach((player) => {
    player.ai = null;
    player.alive = true;
    player.life = life;
  });
  G.CFG.LEGEND_ON = false;
  G.CFG.MARK_ON = false;
  G.CFG.BID_FEE = 1;
  G.CFG.CONS_CAP_DIV = 3;
  G.CFG.MAX_BIDS = 2;
  state.market = market.map((ab) => ab === 'curse' ? { ...G.CURSES[0] } : item(G, ab));
  state.humanBids = {};
  state.incense = {};
  state.marks = {};
  if (singleStake) {
    state.round = G.CFG.RULE_NIGHTS[0];
    state.ruleOrder[0] = 'yabao';
    state.nightRule = G.ruleForRound(state.round);
  }
  return { G, state };
}

test('normal auction iterator exposes all bounded one-item submissions and engine accepts each', async () => {
  const {
    enumerateLegalAuctionSubmissions,
  } = await import(adapterModule);
  const { loadPinnedFixtureEngine, captureGameStateSnapshot, restoreGameStateSnapshot } =
    await import('./tools/l1e-destiny-adapter-fixtures.mjs');
  const { G, state } = await fixture({ life: 2, market: ['bow'] });
  const player = state.players[0];
  const actions = [...enumerateLegalAuctionSubmissions(G, state, player.id)];

  assert.deepEqual(actions.map((action) => action.bids[0]), [
    { amt: 0, type: 'cons', intent: 'keep', target: null },
    { amt: 0, type: 'yaming', intent: 'keep', target: null },
    { amt: 1, type: 'cons', intent: 'keep', target: null },
    { amt: 1, type: 'yaming', intent: 'keep', target: null },
  ]);
  assert.ok(actions.every((action) => action.totalCommitment <= G.budgetFor(player)));
  for (const seat of state.players) {
    const seatActions = [...enumerateLegalAuctionSubmissions(G, state, seat.id)];
    assert.ok(seatActions.length > 0, `living seat ${seat.id} has an explicit legal submission set`);
    assert.ok(seatActions.every((action) => action.totalCommitment <= G.budgetFor(seat)));
  }

  const snapshot = captureGameStateSnapshot(state);
  for (const action of actions) {
    restoreGameStateSnapshot(state, snapshot);
    state.humanBids = { [player.id]: action.bids };
    state.incense = { [player.id]: action.incense };
    const reveal = G.resolveAuction();
    assert.ok(Array.isArray(reveal), 'the frozen engine must resolve every enumerated submission');
  }
  assert.equal(loadPinnedFixtureEngine().provenance.sourceCommit,
    'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a');
});

test('single-stake iterator covers each legal selected subset and one shared stake without changing settlement', async () => {
  const { enumerateLegalAuctionSubmissions } = await import(adapterModule);
  const { loadPinnedFixtureEngine, captureGameStateSnapshot, restoreGameStateSnapshot } =
    await import('./tools/l1e-destiny-adapter-fixtures.mjs');
  const { G, state } = await fixture({ life: 3, market: ['bow', 'boat', 'eye'], singleStake: true });
  G.CFG.MAX_BIDS = 1;
  const player = state.players[0];
  const actions = [...enumerateLegalAuctionSubmissions(G, state, player.id)];
  assert.equal(actions.length, 23, 'two zero-stake types plus all seven subsets at stakes 1 and 2');
  assert.ok(actions.some((action) => action.bids.filter((bid) => bid.amt > 0).length === 3),
    'single-stake selection is not limited by the ordinary MAX_BIDS cap');
  assert.ok(actions.every((action) => action.bids.filter((bid) => bid.amt > 0)
    .every((bid) => bid.stake === true && bid.intent === 'keep')));
  assert.ok(actions.every((action) => action.totalCommitment <= G.budgetFor(player)));

  const snapshot = captureGameStateSnapshot(state);
  for (const action of actions) {
    restoreGameStateSnapshot(state, snapshot);
    state.humanBids = { [player.id]: action.bids };
    state.incense = { [player.id]: action.incense };
    const reveal = G.resolveAuction();
    const winningEntries = reveal.flatMap((result) => result.entries)
      .filter((entry) => entry.p.id === player.id);
    assert.ok(winningEntries.length <= 1, 'single-stake still awards at most one item');
  }
  assert.equal(loadPinnedFixtureEngine().provenance.sourceCommit,
    'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a');
});

test('curse submissions include every living poison target and retain the keep-to-poison rule branch', async () => {
  const { enumerateLegalAuctionSubmissions } = await import(adapterModule);
  const { G, state } = await fixture({ life: 8, market: ['curse'] });
  const actions = [...enumerateLegalAuctionSubmissions(G, state, 0)];
  const positive = actions.map((action) => action.bids[0]).filter((bid) => bid.amt > 0);
  assert.ok(positive.some((bid) => bid.intent === 'keep' && bid.target === null));
  for (const foe of state.players.filter((player) => player.alive && player.id !== 0))
    assert.ok(positive.some((bid) => bid.intent === 'poison' && bid.target === foe.id));
  for (const foe of state.players.filter((player) => player.alive && player.id !== 0))
    assert.ok(actions.some((action) => action.bids[0].amt === 0 && action.bids[0].intent === 'poison'
      && action.bids[0].target === foe.id), 'zero-bid intent and target remain a distinct submitted row');
});

test('ordinary submission budgets include each bid fee, shrine contribution and the nightly bid cap', async () => {
  const { enumerateLegalAuctionSubmissions } = await import(adapterModule);
  const { G, state } = await fixture({ life: 4, market: ['bow', 'boat'] });
  const player = state.players[0];
  state.players[1].bag = [item(G, 'tiger'), item(G, 'nail')];
  state.marks = { 1: 0 };
  state.shrines = [{ fac: 'zuling', open: true }];
  state.incPool = [0, 0, 0, 0];
  G.CFG.MARK_ON = true;
  G.CFG.LEGEND_ON = true;
  G.CFG.INC_MAX = 2;
  G.CFG.MAX_BIDS = 1;

  const actions = [...enumerateLegalAuctionSubmissions(G, state, player.id)];
  assert.ok(actions.some((action) => action.incense === 2 && action.bids.every((bid) => bid.amt === 0)));
  assert.ok(actions.some((action) => action.incense === 1 && action.bids[1].amt === 1));
  assert.ok(actions.every((action) => action.totalCommitment <= G.budgetFor(player)));
  assert.ok(actions.every((action) => action.bids.filter((bid) => bid.amt > 0).length <= 1));
  assert.ok(actions.every((action) => action.bids[0].amt === 0 || action.bids[0].amt + 2 + action.incense <= 4),
    'the marked twin-tiger item must include the extra fee in the shared commitment cap');
});

test('auction observation hides opponent bags, sealed bids, unseen future market and RNG while retaining own destiny', async () => {
  const {
    auctionObservation,
    enumerateLegalAuctionSubmissions,
    appendAuctionDecision,
    auctionInformationSetKey,
  } = await import(adapterModule);
  const { G, state } = await fixture({ life: 8, market: ['bow'] });
  state.players[1].bag = [item(G, 'boat')];
  state.nextMarket = [item(G, 'eye'), item(G, 'bell')];
  state.history.nights.push({
    round: 1,
    closed: true,
    auction: [{ destinyAwakenings: [{ pid: 1, chainId: 'godKing' }] }],
    wishes: [{ pid: 1, id: 'hidden-wish' }],
  });
  const first = auctionObservation(G, state, 0);
  assert.equal(first.viewerId, 0);
  assert.equal(first.players[0].destiny.chainId, 'water');
  assert.equal(first.knownNextPreview[0].n, '祖靈之眼');
  assert.equal(first.knownNextPreview.some((entry) => entry.n === '千里眼銅鈴'), false);
  assert.equal(first.players[1].bag, undefined);
  assert.equal(JSON.stringify(first).includes('nextMarket'), false);
  assert.equal(JSON.stringify(first).includes('rng'), false);
  assert.equal(JSON.stringify(first).includes('humanBids'), false);
  for (const seat of state.players) {
    const seatView = auctionObservation(G, state, seat.id);
    assert.equal(seatView.viewerId, seat.id);
    assert.ok(seatView.players.every((viewed, pid) => pid === seat.id || viewed.bag === undefined));
  }
  assert.equal(JSON.stringify(first.publicHistory).includes('godKing'), false,
    'the engine history may record a destiny reveal before its public disclosure point');
  assert.equal(JSON.stringify(first.publicHistory).includes('hidden-wish'), false);

  state.humanBids = { 1: [{ amt: 7, type: 'yaming', intent: 'keep', target: null }] };
  state.players[1].destiny = 'godKing';
  state.players[1].wish = { id: 'hidden-wish' };
  state.players[1].bag[0].n = 'private-only test label';
  state.nextMarket[state.nextMarket.length - 1].n = 'unseen future item';
  assert.deepEqual(auctionObservation(G, state, 0), first,
    'private opponent state and unobserved future entries cannot change this seat observation');

  state.destinyPublic[1] = true;
  assert.equal(auctionObservation(G, state, 0).players[1].destiny.chainId, 'godKing');

  const legal = [...enumerateLegalAuctionSubmissions(G, state, 0)];
  const prior = appendAuctionDecision([], first, legal[0]);
  const changedAction = appendAuctionDecision([], first, legal[1]);
  assert.notEqual(auctionInformationSetKey(prior, first), auctionInformationSetKey(changedAction, first),
    'full recall key includes the seat own prior committed actions');
  assert.equal(auctionInformationSetKey(prior, first), auctionInformationSetKey([...prior], first));
  const otherSeat = auctionObservation(G, state, 1);
  assert.notEqual(auctionInformationSetKey([], first), auctionInformationSetKey([], otherSeat),
    'information keys from different seats must never merge');
  assert.throws(() => auctionInformationSetKey(prior, otherSeat), /must belong to the current seat/);
});

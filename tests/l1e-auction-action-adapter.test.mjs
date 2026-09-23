import test from 'node:test';
import assert from 'node:assert/strict';

const adapterModule = './tools/l1e-auction-action-adapter.mjs';
const privateDraws = ['water', 'eyes', 'twinTiger', 'bloodOath'];

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
    { amt: 1, type: 'cons', intent: 'keep', target: null },
    { amt: 1, type: 'yaming', intent: 'keep', target: null },
  ]);
  assert.ok(actions.every((action) => action.totalCommitment <= G.budgetFor(player)));

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
  const { G, state } = await fixture({ life: 3, market: ['bow', 'boat'], singleStake: true });
  const player = state.players[0];
  const actions = [...enumerateLegalAuctionSubmissions(G, state, player.id)];
  assert.equal(actions.length, 10, 'abstain plus all non-empty subsets at stakes 1 and 2');
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
});

test('auction observation hides opponent bags, sealed bids, unseen future market and RNG while retaining own destiny', async () => {
  const {
    auctionObservation,
    appendAuctionDecision,
    auctionInformationSetKey,
  } = await import(adapterModule);
  const { G, state } = await fixture({ life: 8, market: ['bow'] });
  const first = auctionObservation(G, state, 0);
  assert.equal(first.viewer.destiny.chainId, 'water');
  assert.equal(first.players[1].bag, undefined);
  assert.equal(JSON.stringify(first).includes('nextMarket'), false);
  assert.equal(JSON.stringify(first).includes('rng'), false);
  assert.equal(JSON.stringify(first).includes('humanBids'), false);

  state.humanBids = { 1: [{ amt: 7, type: 'yaming', intent: 'keep', target: null }] };
  state.players[1].destiny = 'godKing';
  state.players[1].wish = { id: 'hidden-wish' };
  state.players[1].bag[0].n = 'private-only test label';
  state.nextMarket[state.nextMarket.length - 1].n = 'unseen future item';
  assert.deepEqual(auctionObservation(G, state, 0), first,
    'private opponent state and unobserved future entries cannot change this seat observation');

  const prior = appendAuctionDecision([], first, { bids: first.market.map(() => null), incense: 0 });
  const changedAction = appendAuctionDecision([], first, { bids: [{ amt: 1 }], incense: 0 });
  assert.notEqual(auctionInformationSetKey(prior, first), auctionInformationSetKey(changedAction, first),
    'full recall key includes the seat own prior committed actions');
  assert.equal(auctionInformationSetKey(prior, first), auctionInformationSetKey([...prior], first));
});

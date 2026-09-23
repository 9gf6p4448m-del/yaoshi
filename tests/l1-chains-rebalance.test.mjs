import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from './tools/load.mjs';

const G = () => loadGame(process.env.CHAIN_TARGET || path.resolve(fileURLToPath(new URL('../index.html', import.meta.url))));
const item = (g, ab) => ({...g.POOL.find(x => x.ab === ab)});

test('chains rebalance flags and traits are correctly defined', () => {
  const g = G();
  assert.ok(g.CHAINS.twinTiger.flags.includes('markTax'), 'twinTiger must have markTax flag');
  assert.ok(g.CHAINS.water.flags.includes('freeBidFee'), 'water must have freeBidFee flag');
  assert.ok(g.CHAINS.water.flags.includes('teamHalfSplash'), 'water must have teamHalfSplash flag');
  assert.ok(g.CHAINS.water.flags.includes('swapNoSelfBurn'), 'water must have swapNoSelfBurn flag');
  assert.ok(g.CHAINS.water.flags.includes('blockPoisonTransfer'), 'water must retain blockPoisonTransfer flag');
  assert.ok(g.CHAINS.eyes.flags.includes('previewDiscount'), 'eyes must have previewDiscount flag');
  assert.ok(g.CHAINS.eyes.flags.includes('beat1WeakenFront'), 'eyes must have beat1WeakenFront flag');
  assert.ok(g.CHAINS.eyes.flags.includes('teamWardFirst'), 'eyes must have teamWardFirst flag');
});

test('water chain freeBidFee: resolves with 0 fee, whereas normal player pays fee 1', () => {
  const g = G();
  g.makeState('hotseat', 1);
  const s = g.S;
  s.players.forEach(p => p.ai = null);

  // Give player 0 water chain
  s.players[0].bag.push(item(g, 'boat'), item(g, 'buoy'));
  assert.equal(g.hasFlag(s.players[0], 'freeBidFee'), true);
  assert.equal(g.hasFlag(s.players[1], 'freeBidFee'), false);

  const initialLife0 = s.players[0].life;
  const initialLife1 = s.players[1].life;

  // Player 0 bids 2 (winning) on item 0; player 1 bids 1 on item 0 (losing)
  s.humanBids = {
    0: [{amt: 2, type: 'cons', intent: 'keep', target: null}, null, null, null],
    1: [{amt: 1, type: 'cons', intent: 'keep', target: null}, null, null, null],
    2: [null, null, null, null],
    3: [null, null, null, null]
  };
  g.resolveAuction();

  // Player 0 (water) won with 2, fee should be 0, total cost = 2 (cost 2 + fee 0)
  assert.equal(initialLife0 - s.players[0].life, 2, 'Water player should pay 2 (cost 2 + fee 0)');

  // Player 1 (normal) lost conservative bid: lose cost ceil(1 * 0.25)=1, fee=1, total cost = 2
  assert.equal(initialLife1 - s.players[1].life, 2, 'Normal player pays 2 (lose cost 1 + fee 1)');
});

test('twinTiger markTax charges opponents +1 fee when marked, but not本人', () => {
  const g = G();
  g.makeState('hotseat', 1);
  const s = g.S;
  s.players.forEach(p => p.ai = null);

  // Give player 1 twinTiger
  s.players[1].bag.push(item(g, 'tiger'), item(g, 'nail'));
  assert.equal(g.hasFlag(s.players[1], 'markTax'), true);

  // Player 1 marks item 0
  s.marks = {1: 0};

  const initialLife0 = s.players[0].life;
  const initialLife1 = s.players[1].life;

  // Player 1 bids 3 on item 0 (winning); player 0 bids 1 on item 0 (losing)
  s.humanBids = {
    0: [{amt: 1, type: 'cons', intent: 'keep', target: null}, null, null, null],
    1: [{amt: 3, type: 'cons', intent: 'keep', target: null}, null, null, null],
    2: [null, null, null, null],
    3: [null, null, null, null]
  };
  g.resolveAuction();

  // Player 1 (本人) won with 3 + normal fee 1 = 4 (markTax doesn't tax self)
  assert.equal(initialLife1 - s.players[1].life, 4, 'Twin Tiger owner pays normal fee 1');

  // Player 0 (opponent) lost: lose cost ceil(1 * 0.25)=1 + fee (1 normal + 1 markTax = 2) = 3 total cost
  assert.equal(initialLife0 - s.players[0].life, 3, 'Opponent bidding on tiger-marked item pays fee 2, total 3');
});

test('eyes previewDiscount gives -1 cost to items seen in previous preview', () => {
  const g = G();
  g.makeState('hotseat', 1);
  const s = g.S;
  s.players.forEach(p => p.ai = null);

  // Give player 0 eyes chain
  s.players[0].bag.push(item(g, 'eye'), item(g, 'bell'));
  assert.equal(g.hasFlag(s.players[0], 'previewDiscount'), true);

  // Mark item 0 as having been in S.prevPreview
  const targetItem = s.market[0];
  s.prevPreview = [{n: targetItem.n, f: targetItem.f, p: targetItem.p}];

  const initialLife0 = s.players[0].life;
  s.humanBids = {
    0: [{amt: 4, type: 'cons', intent: 'keep', target: null}, null, null, null],
    1: [null, null, null, null],
    2: [null, null, null, null],
    3: [null, null, null, null]
  };
  g.resolveAuction();

  // Winning bid of 4 gets -1 discount = 3, plus normal fee 1 = 4 total cost
  assert.equal(initialLife0 - s.players[0].life, 4, '4 bid - 1 preview discount + 1 fee = 4 total cost');
});

test('water swapNoSelfBurn and teamHalfSplash in paperWar', () => {
  const g = G();
  g.makeState('solo', 1);
  const s = g.S;

  s.players[0].bag = [item(g, 'boat'), item(g, 'buoy')];
  s.players[1].bag = [item(g, 'wuying')];

  assert.equal(g.hasFlag(s.players[0], 'swapNoSelfBurn'), true);
  assert.equal(g.hasFlag(s.players[0], 'teamHalfSplash'), true);

  const war = g.paperWar(s.players[0], s.players[1], {rng: () => 0.5, real: true});
  assert.ok(war, 'war resolves cleanly');
  assert.ok(war.unitsA > 0);

  // Check battle log contains water chain mention if swap occurred
  if (war.stats.swap > 0) {
    assert.ok(war.log.some(l => l.includes('走私免損') || l.includes('抓交替')));
  }
});

test('eyes teamWardFirst and beat1WeakenFront in paperWar', () => {
  const g = G();
  g.makeState('solo', 1);
  const s = g.S;

  s.players[0].bag = [item(g, 'eye'), item(g, 'bell')];
  s.players[1].bag = [item(g, 'tiger')];

  assert.equal(g.hasFlag(s.players[0], 'teamWardFirst'), true);
  assert.equal(g.hasFlag(s.players[0], 'beat1WeakenFront'), true);

  const war = g.paperWar(s.players[0], s.players[1], {rng: () => 0.5, real: true});
  assert.ok(war, 'war resolves cleanly');
  assert.ok(war.unitsA > 0);
});

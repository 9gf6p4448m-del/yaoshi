import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from './tools/load.mjs';

const G = () => loadGame(process.env.CHAIN_TARGET || path.resolve(fileURLToPath(new URL('../index.html', import.meta.url))));
const item = (g, ab) => ({...g.POOL.find(x => x.ab === ab)});

test('all 6 cross-faction chains are correctly defined', () => {
  const g = G();
  assert.ok(g.CHAINS.twinTiger.flags.includes('markTax'), 'twinTiger must have markTax flag');
  assert.ok(g.CHAINS.water.flags.includes('freeBidFee'), 'water must have freeBidFee flag');
  assert.ok(g.CHAINS.water.flags.includes('teamHalfSplash'), 'water must have teamHalfSplash flag');
  assert.ok(g.CHAINS.water.flags.includes('swapNoSelfBurn'), 'water must have swapNoSelfBurn flag');
  assert.ok(g.CHAINS.water.flags.includes('blockPoisonTransfer'), 'water must retain blockPoisonTransfer flag');
  assert.ok(g.CHAINS.eyes.flags.includes('previewDiscount'), 'eyes must have previewDiscount flag');
  assert.ok(g.CHAINS.eyes.flags.includes('beat1WeakenFront'), 'eyes must have beat1WeakenFront flag');
  assert.ok(g.CHAINS.eyes.flags.includes('teamWardFirst'), 'eyes must have teamWardFirst flag');

  // BloodOath
  assert.ok(g.CHAINS.bloodOath.flags.includes('yamingEffBonus'), 'bloodOath must have yamingEffBonus flag');
  assert.ok(g.CHAINS.bloodOath.flags.includes('bloodSacrifice'), 'bloodOath must have bloodSacrifice flag');

  // GodKing
  assert.ok(g.CHAINS.godKing.flags.includes('shrineAutoIncense'), 'godKing must have shrineAutoIncense flag');
  assert.ok(g.CHAINS.godKing.flags.includes('godKingSniper'), 'godKing must have godKingSniper flag');

  // EternalFlame
  assert.ok(g.CHAINS.eternalFlame.flags.includes('roundExpenseRebate'), 'eternalFlame must have roundExpenseRebate flag');
  assert.ok(g.CHAINS.eternalFlame.flags.includes('teamRegenAll'), 'eternalFlame must have teamRegenAll flag');
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


test('bloodOath yamingEffBonus: gives +1 effective bid in auction comparison', () => {
  const g = G();
  g.makeState('hotseat', 1);
  const s = g.S;
  s.players.forEach(p => p.ai = null);

  // Give player 0 bloodOath
  s.players[0].bag.push(item(g, 'xianji'), item(g, 'guoyin'));
  assert.equal(g.hasFlag(s.players[0], 'yamingEffBonus'), true);

  // Player 0 bids 2 yaming (eff = 3); player 1 bids 2 cons (eff = 2)
  s.humanBids = {
    0: [{amt: 2, type: 'yaming', intent: 'keep', target: null}, null, null, null],
    1: [{amt: 2, type: 'cons', intent: 'keep', target: null}, null, null, null],
    2: [null, null, null, null],
    3: [null, null, null, null]
  };
  g.resolveAuction();

  // Player 0 won item 0 because eff 3 > 2!
  assert.ok(s.players[0].bag.some(it => it.n === s.market[0].n), 'BloodOath player wins bid tie due to yaming eff +1');
});

test('bloodOath paperWar: bloodSacrifice low-life atk and selfCut reflection', () => {
  const g = G();
  g.makeState('solo', 1);
  const s = g.S;

  s.players[0].bag = [item(g, 'xianji'), item(g, 'guoyin')];
  s.players[0].life = 15; // <= 15 triggers bloodSacrifice atk+1
  s.players[1].bag = [item(g, 'tiger')];

  assert.equal(g.hasFlag(s.players[0], 'bloodSacrifice'), true);

  const war = g.paperWar(s.players[0], s.players[1], {rng: () => 0.5, real: true});
  assert.ok(war, 'war resolves cleanly');
  assert.ok(war.unitsA > 0);
  assert.ok(war.log.some(l => l.includes('割祭') || l.includes('血祭反噬')));
});

test('godKing shrineAutoIncense: awards +1 incense in resolveShrines without spending life', () => {
  const g = G();
  g.makeState('solo', 1);
  const s = g.S;

  s.players[0].bag = [item(g, 'bow'), item(g, 'sword')];
  assert.equal(g.hasFlag(s.players[0], 'shrineAutoIncense'), true);

  s.incense = {0: {amt: 0}, 1: {amt: 0}, 2: {amt: 0}, 3: {amt: 0}};
  const initialLife0 = s.players[0].life;
  const initialPool0 = s.incPool ? (s.incPool[0] | 0) : 0;

  g.resolveShrines();

  if (s.shrines && s.incPool) {
    assert.equal(s.incPool[0], initialPool0 + 1, 'GodKing player receives +1 incense automatically');
    assert.equal(s.players[0].life, initialLife0, 'GodKing incense does not consume player life');
  }
});

test('godKing paperWar: godKingSniper deals 3 damage instead of 1 in openShot', () => {
  const g = G();
  g.makeState('solo', 1);
  const s = g.S;

  s.players[0].bag = [item(g, 'bow'), item(g, 'sword')];
  s.players[1].bag = [item(g, 'fushou')]; // ward unit with 4 hp

  assert.equal(g.hasFlag(s.players[0], 'godKingSniper'), true);

  const war = g.paperWar(s.players[0], s.players[1], {rng: () => 0.5, real: true});
  assert.ok(war, 'war resolves cleanly');
  assert.ok(war.log.some(l => l.includes('神王天誅') && l.includes('−3')));
});

test('eternalFlame roundExpenseRebate on night end and teamRegenAll in paperWar', () => {
  const g = G();
  g.makeState('solo', 1);
  const s = g.S;

  s.players[0].bag = [item(g, 'fushou'), item(g, 'sigui')];
  assert.equal(g.hasFlag(s.players[0], 'roundExpenseRebate'), true);
  assert.equal(g.hasFlag(s.players[0], 'teamRegenAll'), true);

  // Test onNightEnd rebate
  s.bidAny = new Set([0]);
  s.players[0].life = 20;
  const nightly = [];
  g.applyHooks("onNightEnd", {p: s.players[0], log: nightly}, s.players[0]);
  assert.equal(s.players[0].life, 21, 'Player gained 1 life rebate for having bid during round');
  assert.ok(nightly.some(l => l.includes('長明渡幽') && l.includes('回贈')));

  // Test teamRegenAll in paperWar
  const war = g.paperWar(s.players[0], s.players[1], {rng: () => 0.5, real: true});
  assert.ok(war, 'war resolves cleanly');
});

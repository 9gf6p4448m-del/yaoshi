// Astra F1/F2: event existence does not establish attribution of the whole night's loss.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadGame } from './tools/load.mjs';
process.env.LEDGER_IMPORT_ONLY = '1';
const { mainCause } = await import('./ledger.test.mjs');
const INDEX = process.env.YAOSHI_INDEX || fileURLToPath(new URL('../index.html', import.meta.url));
const players = ['甲', '乙', '丙', '丁'].map((name, id) => ({ id, name }));
const night = (round, auction = [], fights = [], deaths = []) => ({ round, auction, fights, deaths });
const pay = (cost) => ({ item: '破軍旗', winnerId: 0, intent: 'keep', amt: cost, bids: [{ pid: 0, cost }] });

test('a two-life purchase cannot inherit a sixteen-life night or suppress a recorded defeat', () => {
  const H = { life: [[16, 40, 30, 30], [0, 40, 30, 30]], nights: [night(5, [pay(2)], [{ a: 0, b: 1, w: 1, dmg: 8 }], [0])] };
  const G = loadGame(INDEX), R = G.ledgerNarrative(H, players);
  for (const cause of [R.cause, mainCause(H)]) {
    assert.equal(cause.kind, 'night');
    assert.equal(cause.drop, 16);
    assert.equal(cause.payments[0].cost, 2);
    assert.equal(cause.fights[0].damage, 8);
    assert.equal(cause.fights[0].foe, 1);
  }
  assert.doesNotMatch(R.lines.map(l => l.text).join(''), /為「破軍旗」付出大半條命|從此再沒站起來/);
  assert.match(R.lines[1].text, /合計/);
});

test('death later in the game is not described as death on the loss night', () => {
  const H = { life: [[40, 50, 30, 30], [15, 50, 30, 30], [0, 50, 30, 30]], nights: [night(2, [pay(4)]), night(3, [], [], [0])] };
  const R = loadGame(INDEX).ledgerNarrative(H, players);
  assert.equal(R.cause.round, 2);
  assert.doesNotMatch(R.lines[1].text, /從此|出局|倒下/);
  assert.match(R.lines.map(l => l.text).join(''), /第三夜出局/);
});

test('an unrecorded terminal interval is not invented as a named event or numbered night', () => {
  const H = { life: [[30, 40, 30, 30], [25, 40, 30, 30], [0, 40, 0, 0]], nights: [night(4)] };
  const R = loadGame(INDEX).ledgerNarrative(H, players);
  assert.equal(R.cause.kind, 'interval');
  assert.equal(R.cause.round, null);
  assert.equal(R.cause.snapshotIndex, 2);
  assert.doesNotMatch(R.lines[1].text, /異事|第二夜|第五夜/);
  assert.match(R.lines[1].text, /紀錄不足/);
});

test('equal losses select the later snapshot, then lower seat; missing causes remain unknown', () => {
  const H = { life: [[40, 60, 40, 40], [30, 60, 30, 40], [20, 60, 20, 40]], nights: [night(1), night(2)] };
  const R = loadGame(INDEX).ledgerNarrative(H, players);
  assert.equal(R.cause.round, 2);
  assert.equal(R.cause.pid, 0);
  assert.deepEqual(R.cause.payments, []);
  assert.deepEqual(R.cause.fights, []);
  assert.doesNotMatch(R.lines[1].text, /異事/);
  assert.match(R.lines[1].text, /紀錄不足/);
});

test('a recorded defeat remains evidence when a survival hook reduces its damage to zero', () => {
  const H = { life: [[40, 50, 30, 30], [30, 50, 30, 30]], nights: [night(1, [pay(10)], [{ a: 0, b: 1, w: 1, dmg: 0 }])] };
  const R = loadGame(INDEX).ledgerNarrative(H, players);
  for (const cause of [R.cause, mainCause(H)]) assert.deepEqual(cause.fights, [{ idx: 0, foe: 1, damage: 0 }]);
});

test('actual seeds 1 and 2 retain exact payment evidence and do not claim purchase caused the whole drop', () => {
  for (const seed of [1, 2]) {
    const G = loadGame(INDEX); G.playPolicyGame(seed, { 0: G.POLICIES.splitter });
    const R = G.ledgerNarrative(G.S.history, G.S.players);
    assert.equal(R.cause.kind, 'night');
    assert.equal(R.cause.round, seed === 1 ? 5 : 2);
    assert.equal(R.cause.drop, seed === 1 ? 16 : 17);
    assert.doesNotMatch(R.lines[1].text, /為「.+」付出|從此再沒站起來/);
    for (const p of R.cause.payments) {
      const n = G.S.history.nights.find(n => n.round === R.cause.round);
      assert.equal(p.cost, n.auction[p.idx].bids.find(b => b.pid === R.cause.pid).cost);
    }
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';

const adapterModule = './tools/l1e-battle-settlement-adapter.mjs';
const privateDraws = ['water', 'eyes', 'twinTiger', 'bloodOath'];

function soloFixture(G, seed) {
  const state = G.makeState('solo', seed, ['qingmian'], privateDraws, 'original', false);
  state.players.forEach((player, index) => {
    player.ai = index !== 0;
    player.roleId = 'human';
    player.alive = index < 2;
    player.life = 25;
    player.bag = [];
  });
  state.nightRule = null;
  state.wishNight = null;
  state.history = {
    life: [state.players.map((player) => player.life)],
    nights: [{ round: state.round, auction: [], closed: false }],
  };
  return state;
}

function dummy(name, body, count, atk, hp) {
  return { n: name, f: 'zuling', p: 1, unit: { body, count, atk, hp } };
}

test('v6 records automatic transitions and leaves whole-game gates closed', async () => {
  const { readBattleSettlementContractV6, battleSettlementAdapterStatus } = await import(adapterModule);
  const contract = readBattleSettlementContractV6();
  assert.equal(contract.schema, 'yaoshi.l1e.sixOfFour.modelContract.v6');
  assert.equal(contract.source.commit, 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a');
  assert.equal(contract.inventory['automatic.battle'], 'partial');
  assert.equal(contract.inventory['automatic.settlement'], 'partial');
  assert.equal(contract.inventory['information.fullRecall'], 'incomplete');
  assert.equal(contract.gate.sixOfFour, 'incomplete');
  assert.equal(contract.gate.solverStatus, 'not-run');
  assert.equal(contract.gate.releaseEligible, false);
  assert.deepEqual(battleSettlementAdapterStatus().excludedDecisionPhases,
    ['cross-phase full recall', 'cross-night restoration', 'terminal payoff utility']);
});

test('automatic battle follows both sides of the engine lightning chance threshold', async () => {
  const { loadPinnedBattleSettlementEngine, applyAutomaticNightSettlement } = await import(adapterModule);
  const run = (seed, firstRoll) => {
    const { G } = loadPinnedBattleSettlementEngine();
    const state = soloFixture(G, seed);
    state.players[0].bag = [G.POOL.find((item) => item.ab === 'thunder')];
    state.players[1].bag = [dummy('單隻小兵', 'swarm', 1, 0, 1)];
    const rolls = [firstRoll];
    let calls = 0;
    state.rng = () => {
      if (calls >= rolls.length) throw new Error('battle consumed an unmodeled random draw');
      return rolls[calls++];
    };

    const transition = applyAutomaticNightSettlement(G, state);
    return { transition, calls, state };
  };

  const hit = run(1511, 0.149999);
  const miss = run(1511, 0.15);
  assert.equal(hit.calls, 1);
  assert.equal(miss.calls, 1);
  assert.equal(hit.transition.fights[0].battleStats.bolt, 1);
  assert.equal(miss.transition.fights[0].battleStats.bolt || 0, 0);
  assert.deepEqual(hit.transition.deaths, []);
  assert.deepEqual(miss.transition.deaths, []);
});

test('night settlement resolves drain death and unaffordable shrine tithe through the frozen engine', async () => {
  const { loadPinnedBattleSettlementEngine, applyAutomaticNightSettlement } = await import(adapterModule);
  const { G } = loadPinnedBattleSettlementEngine();
  const state = soloFixture(G, 1512);
  state.players[0].life = 1;
  state.players[0].bag = [{ n: '測試夜末侵蝕', curse: true, drain: 1 }];
  state.players[1].life = 1;
  state.players[1].bag = [{ ...G.LEGENDS[0] }];
  state.history.life[0] = state.players.map((player) => player.life);

  const transition = applyAutomaticNightSettlement(G, state);
  assert.deepEqual(transition.deaths, [0]);
  assert.equal(state.players[0].alive, false);
  assert.equal(state.players[0].life, 0);
  assert.equal(state.players[1].alive, true);
  assert.ok(state.players[1].life >= G.CFG.NIGHT_REGEN);
  assert.equal(state.players[1].bag.some((item) => item.legend), false);
  assert.equal(state.shrineStat.titheLost, 1);
  assert.equal(state.history.nights[0].closed, true);
  assert.deepEqual(state.history.life.at(-1), state.players.map((player) => player.life));
});

test('terminal settlement closes shrines, strips endgame items and captures final rank/history', async () => {
  const { loadPinnedBattleSettlementEngine, applyTerminalSettlement } = await import(adapterModule);
  const { G } = loadPinnedBattleSettlementEngine();
  const state = soloFixture(G, 1513);
  state.players[0].life = 31;
  state.players[1].life = 31;
  state.players[0].bag = [
    { n: '局末退場法寶', endStrip: true },
    { n: '保留法寶', endStrip: false },
  ];
  state.history.life[0] = state.players.map((player) => player.life);
  state.players[0].life += 2;

  const terminal = applyTerminalSettlement(G, state);
  assert.deepEqual(terminal.rank.map((entry) => entry.pid), [0, 1, 2, 3]);
  assert.deepEqual(terminal.rank.map((entry) => entry.place), [1, 2, 3, 4]);
  assert.deepEqual(state.players[0].bag.map((item) => item.n), ['保留法寶']);
  assert.ok(state.shrines.every((shrine) => !shrine.open));
  assert.deepEqual(state.history.life.at(-1), state.players.map((player) => player.life));
  assert.equal(terminal.historySnapshotCount, state.history.life.length);
});

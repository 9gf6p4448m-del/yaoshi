import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './load.mjs';
import { verifyPinnedProductSource } from './l1e-destiny-adapter-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRODUCT = path.join(ROOT, 'index.html');
const CONTRACT_V6_PATH = path.join(ROOT, 'docs/experiments/2026-09-23-destiny/model-contract-v6.json');
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

export function readBattleSettlementContractV6() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_V6_PATH, 'utf8'));
  if (contract.schema !== 'yaoshi.l1e.sixOfFour.modelContract.v6')
    throw new Error('unsupported six-of-four model contract version');
  return contract;
}

function instrumentTransitionApi(sourceText) {
  const anchor = 'window.__yaoshi={ newGame,';
  if (sourceText.split(anchor).length !== 2)
    throw new Error('battle/settlement fixture API instrumentation anchor mismatch');
  return sourceText.replace(anchor,
    'window.__yaoshi={ stripEndgameItems, finalizeHistory, newGame,');
}

export function loadPinnedBattleSettlementEngine() {
  const pinned = verifyPinnedProductSource();
  const instrumentedSource = instrumentTransitionApi(pinned.sourceText);
  const G = loadGame(PRODUCT, { sourceText: instrumentedSource });
  return {
    G,
    provenance: {
      sourceCommit: pinned.commit,
      sourceBlobOid: pinned.blobOid,
      sourceSha256: pinned.sha256,
      adapterSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
      fixtureSha256: hash(fs.readFileSync(path.join(ROOT, 'tests/l1e-battle-settlement-adapter.test.mjs'))),
      instrumentedSourceSha256: hash(Buffer.from(instrumentedSource, 'utf8')),
    },
  };
}

function requireActiveState(G, state) {
  if (G?.S !== state) throw new Error('transition state must belong to its pinned engine');
}

function plain(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint')
      throw new TypeError('transition output must be JSON-safe');
    return value;
  }
  if (Array.isArray(value)) return value.map(plain);
  const result = {};
  for (const key of Object.keys(value).sort()) result[key] = plain(value[key]);
  return result;
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
  return value;
}

export function applyAutomaticNightSettlement(G, state) {
  requireActiveState(G, state);
  const result = G.resolveBattles();
  const fights = result.fights.map((fight) => ({
    aId: fight.A.id,
    bId: fight.B.id,
    pa: fight.pa,
    pb: fight.pb,
    tie: !!fight.tie,
    winnerId: fight.w?.id ?? null,
    damage: fight.dmg ?? 0,
    publicLog: [...(fight.extra || [])],
    battleStats: fight.war ? plain(fight.war.stats) : null,
  }));
  const players = state.players.map((player) => ({ pid: player.id, alive: !!player.alive, life: player.life }));
  return freeze(plain({
    schema: 'yaoshi.automatic-night-settlement.v1',
    round: state.round,
    fights,
    bye: result.bye ?? null,
    nightly: [...result.nightly],
    deaths: result.deaths.map((player) => player.id),
    titheChoicesPending: (state.titheAsk || []).map((entry) => ({ ...entry })),
    players,
  }));
}

export function applyTerminalSettlement(G, state) {
  requireActiveState(G, state);
  const shrineDawn = G.settleShrinesEnd();
  G.stripEndgameItems();
  G.finalizeHistory();
  const rank = [...state.players].sort((a, b) =>
    (b.alive ? 1 : 0) - (a.alive ? 1 : 0) || b.life - a.life)
    .map((player, index) => ({ pid: player.id, place: index + 1, alive: !!player.alive, life: player.life }));
  return freeze(plain({
    schema: 'yaoshi.terminal-settlement.v1',
    shrineDawn: shrineDawn || [],
    rank,
    historySnapshotCount: state.history?.life?.length ?? 0,
  }));
}

export function battleSettlementAdapterStatus() {
  return {
    automaticBattle: 'partial',
    automaticSettlement: 'partial',
    terminalRanking: 'partial',
    completeDecisionTree: false,
    excludedDecisionPhases: ['cross-phase full recall', 'cross-night restoration', 'terminal payoff utility'],
  };
}

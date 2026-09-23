import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './load.mjs';
import { verifyPinnedProductSource } from './l1e-destiny-adapter-fixtures.mjs';
import { auctionObservationAfterEvents } from './l1e-event-action-adapter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRODUCT = path.join(ROOT, 'index.html');
const CONTRACT_V5_PATH = path.join(ROOT, 'docs/experiments/2026-09-23-destiny/model-contract-v5.json');
const DECISION_SCHEMA = 'yaoshi.remaining-action-decision.v1';
const SHRINE_SCHEMA = 'yaoshi.shrine-pick-decision.v1';
const MARK_OBSERVATION_SCHEMA = 'yaoshi.mark-observation.v1';
const SACRIFICE_OBSERVATION_SCHEMA = 'yaoshi.sacrifice-observation.v1';
const SHRINE_OBSERVATION_SCHEMA = 'yaoshi.shrine-pick-observation.v1';
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const decisions = new WeakMap();
const shrineDecisions = new WeakMap();

export function readRemainingActionContractV5() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_V5_PATH, 'utf8'));
  if (contract.schema !== 'yaoshi.l1e.sixOfFour.modelContract.v5')
    throw new Error('unsupported six-of-four model contract version');
  return contract;
}

function instrumentRemainingActionApi(sourceText) {
  const anchor = 'window.__yaoshi={ newGame,';
  if ((sourceText.match(/window\.__yaoshi=\{ newGame,/g) || []).length !== 1)
    throw new Error('remaining action fixture API instrumentation anchor mismatch');
  return sourceText.replace(anchor,
    'window.__yaoshi={ drawMarks, bleed, resolveShrines, finishShrines, openShrines, '
    + 'facCount, credOf, faceLbl, chairSeen, guanSeen, eventForRound, ruleForRound, newGame,');
}

export function loadPinnedRemainingActionEngine() {
  const pinned = verifyPinnedProductSource();
  const instrumentedSource = instrumentRemainingActionApi(pinned.sourceText);
  const G = loadGame(PRODUCT, { sourceText: instrumentedSource });
  return {
    G,
    provenance: {
      sourceCommit: pinned.commit,
      sourceBlobOid: pinned.blobOid,
      sourceSha256: pinned.sha256,
      adapterSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
      fixtureSha256: hash(fs.readFileSync(path.join(ROOT, 'tests/l1e-remaining-player-action-adapter.test.mjs'))),
      instrumentedSourceSha256: hash(Buffer.from(instrumentedSource, 'utf8')),
    },
  };
}

function requireActiveState(G, state) {
  if (G?.S !== state) throw new Error('remaining action state must belong to its pinned engine');
}

function decisionOf(decision) {
  const internal = decision && decisions.get(decision);
  if (!internal) throw new TypeError('decision was not created by this adapter');
  return internal;
}

function shrineDecisionOf(decision) {
  const internal = decision && shrineDecisions.get(decision);
  if (!internal) throw new TypeError('shrine decision was not created by this adapter');
  return internal;
}

function livingPlayer(state, playerId) {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || !player.alive) throw new RangeError('decision requires a living participant');
  return player;
}

function copyPlain(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint')
      throw new TypeError('remaining action observations must be JSON-safe');
    return value;
  }
  if (Array.isArray(value)) return value.map(copyPlain);
  const result = {};
  for (const key of Object.keys(value).sort()) result[key] = copyPlain(value[key]);
  return result;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function visibleMarkObservation(G, state, viewerId, publicEventReveals) {
  const base = auctionObservationAfterEvents(G, state, viewerId, publicEventReveals);
  const viewer = livingPlayer(state, viewerId);
  const markIndicators = state.players.filter((player) => player.alive).map((player) => ({
    pid: player.id,
    hasMark: state.marks?.[player.id] != null,
  }));
  const markHints = {
    credibility: G.CFG.MARK_CRED_ON ? G.credOf(viewer) : null,
    opponents: state.players.filter((player) => player.alive && player.ai).map((player) => ({
      pid: player.id,
      avatar: player.av ?? null,
      response: ['avoid', 'contest'].includes(player.ai.markReact) ? player.ai.markReact : 'ignore',
    })),
  };
  return deepFreeze(copyPlain({
    schema: MARK_OBSERVATION_SCHEMA,
    phase: 'mark.preAuction',
    viewerId,
    round: base.round,
    windSeat: base.windSeat,
    currentRule: base.currentRule,
    currentEvent: base.currentEvent,
    market: base.market,
    players: base.players,
    shrine: base.shrine,
    markIndicators,
    markHints,
    publicHistory: base.publicHistory,
    precedingPublicEvents: base.precedingPublicEvents,
  }));
}

export function createMarkDecision(G, state, playerId) {
  requireActiveState(G, state);
  const player = livingPlayer(state, playerId);
  if (!G.CFG.MARK_ON || !state.marks) throw new RangeError('mark phase is disabled');
  if (state.marks[playerId] !== undefined) throw new Error('mark was already declared for this seat');
  const decision = Object.freeze({
    schema: DECISION_SCHEMA,
    phase: 'mark',
    playerId,
    round: state.round,
    marketSize: state.market.length,
  });
  decisions.set(decision, { G, state, player, resolved: false });
  return decision;
}

export function* enumerateLegalMarkChoices(decision) {
  const { state, player, resolved } = decisionOf(decision);
  if (resolved || state.marks[player.id] !== undefined)
    throw new Error('mark decision was already committed');
  yield null;
  for (let index = 0; index < state.market.length; index++) yield index;
}

export function markObservation(G, state, decision, publicEventReveals = []) {
  requireActiveState(G, state);
  const internal = decisionOf(decision);
  if (internal.G !== G || internal.state !== state || internal.resolved ||
      state.marks[internal.player.id] !== undefined)
    throw new Error('mark observation must match an unresolved player decision');
  return visibleMarkObservation(G, state, internal.player.id, publicEventReveals);
}

export function commitMarkChoice(G, state, decision, choice) {
  requireActiveState(G, state);
  const internal = decisionOf(decision);
  if (internal.G !== G || internal.state !== state || internal.resolved ||
      state.marks[internal.player.id] !== undefined)
    throw new Error('mark decision was already committed or belongs to another state');
  let legal = false;
  for (const candidate of enumerateLegalMarkChoices(decision)) {
    if (Object.is(candidate, choice)) { legal = true; break; }
  }
  if (!legal) throw new RangeError('choice is not a legal mark action');
  state.marks[internal.player.id] = choice;
  internal.resolved = true;
  return true;
}

export function createSacrificeDecision(G, state, playerId) {
  requireActiveState(G, state);
  const player = livingPlayer(state, playerId);
  const decision = Object.freeze({ schema: DECISION_SCHEMA, phase: 'sacrifice', playerId, round: state.round });
  decisions.set(decision, { G, state, player, resolved: false });
  return decision;
}

export function* enumerateLegalSacrificeActions(decision) {
  const { G, player, resolved } = decisionOf(decision);
  if (resolved) throw new Error('sacrifice decision already continued to auction');
  yield 'continue';
  if (!G.hasFlag(player, 'bloodlet')) return;
  const cost = G.traitMax(player, 'bloodCost', G.CFG.BLOOD_COST) * ((player.sacrificed || 0) + 1);
  const floor = G.CFG.BLOOD_FLOOR;
  if (Number.isInteger(cost) && player.life - cost >= floor) yield 'bleed';
}

export function sacrificeObservation(G, state, decision, publicEventReveals = []) {
  requireActiveState(G, state);
  const internal = decisionOf(decision);
  if (internal.G !== G || internal.state !== state || internal.resolved)
    throw new Error('sacrifice observation must match an unresolved player decision');
  const base = auctionObservationAfterEvents(G, state, internal.player.id, publicEventReveals);
  const cost = G.traitMax(internal.player, 'bloodCost', G.CFG.BLOOD_COST) * ((internal.player.sacrificed || 0) + 1);
  const players = base.players.map((player) => player.id === internal.player.id
    ? { ...player, sacrificed: internal.player.sacrificed || 0, nextSacrificeCost: cost }
    : player);
  return deepFreeze(copyPlain({
    ...base,
    schema: SACRIFICE_OBSERVATION_SCHEMA,
    phase: 'sacrifice.preAuction',
    players,
    legalActions: [...enumerateLegalSacrificeActions(decision)],
  }));
}

export function commitSacrificeChoice(G, state, decision, choice) {
  requireActiveState(G, state);
  const internal = decisionOf(decision);
  if (internal.G !== G || internal.state !== state || internal.resolved)
    throw new Error('sacrifice decision already continued or belongs to another state');
  const legal = [...enumerateLegalSacrificeActions(decision)];
  if (!legal.includes(choice)) throw new RangeError('choice is not a legal sacrifice action');
  if (choice === 'continue') {
    internal.resolved = true;
    return { phase: 'auction', playerId: internal.player.id };
  }

  const before = state.players.map((player) => ({ pid: player.id, life: player.life }));
  const logStart = state.bleedLog?.length ?? 0;
  if (G.bleed(internal.player, G.CFG.BLOOD_FLOOR, 1) !== 1)
    throw new Error('engine rejected an action enumerated as legal');
  const lifeDelta = before.map(({ pid, life }) => ({
    pid,
    before: life,
    after: state.players[pid].life,
    delta: state.players[pid].life - life,
    alive: !!state.players[pid].alive,
  }));
  return {
    phase: 'sacrifice',
    playerId: internal.player.id,
    lifeDelta,
    publicLog: (state.bleedLog || []).slice(logStart),
  };
}

export function beginInteractiveShrineResolution(G, state) {
  requireActiveState(G, state);
  const result = G.resolveShrines({ interactive: true });
  if (!result?.pending) return { decision: null, result };
  const pending = result.pending;
  const player = livingPlayer(state, pending.pid);
  if (player.ai) throw new Error('interactive shrine pick requires the human winner');
  const decision = Object.freeze({ schema: SHRINE_SCHEMA, playerId: player.id, round: state.round });
  shrineDecisions.set(decision, { G, state, result, player, resolved: false });
  return { decision, result: null };
}

export function* enumerateLegalShrinePicks(decision) {
  const { result, resolved } = shrineDecisionOf(decision);
  if (resolved) throw new Error('shrine choice was already resolved');
  yield* result.pending.choices;
}

export function shrinePickObservation(G, state, decision) {
  requireActiveState(G, state);
  const internal = shrineDecisionOf(decision);
  if (internal.G !== G || internal.state !== state || internal.resolved)
    throw new Error('shrine observation must match an unresolved winner decision');
  const choices = [...enumerateLegalShrinePicks(decision)].map((index) => {
    const legend = G.LEGENDS[index];
    const trait = G.TRAITS[legend.unit.trait];
    return {
      index,
      name: legend.n,
      faction: G.FAC[legend.f]?.n ?? legend.f,
      moveName: trait?.name ?? '',
      moveDescription: trait?.desc ?? '',
      sameFactionCount: G.facCount(internal.player, legend.f),
    };
  });
  return deepFreeze(copyPlain({
    schema: SHRINE_OBSERVATION_SCHEMA,
    phase: 'shrine.pickLegend',
    viewerId: internal.player.id,
    round: state.round,
    incense: internal.result.pending.h,
    choices,
  }));
}

export function commitShrinePick(G, state, decision, index) {
  requireActiveState(G, state);
  const internal = shrineDecisionOf(decision);
  if (internal.G !== G || internal.state !== state || internal.resolved)
    throw new Error('shrine decision already resolved or belongs to another state');
  if (![...enumerateLegalShrinePicks(decision)].includes(index))
    throw new RangeError('shrine choice is not an open choice');
  internal.resolved = true;
  return G.finishShrines(internal.result, index);
}

export function remainingActionAdapterStatus() {
  return {
    markActions: 'partial',
    sacrificeActions: 'partial',
    shrinePickActions: 'partial',
    completeDecisionTree: false,
    excludedDecisionPhases: ['battle', 'settlement', 'cross-night transitions'],
  };
}

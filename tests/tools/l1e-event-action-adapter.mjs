import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './load.mjs';
import { verifyPinnedProductSource } from './l1e-destiny-adapter-fixtures.mjs';
import { auctionObservation } from './l1e-auction-action-adapter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRODUCT = path.join(ROOT, 'index.html');
const CONTRACT_V4_PATH = path.join(ROOT, 'docs/experiments/2026-09-23-destiny/model-contract-v4.json');
const DECISION_SCHEMA = 'yaoshi.event-decision.v1';
const OBSERVATION_SCHEMA = 'yaoshi.event-observation.v1';
const EVENT_IDS = new Set(['plague', 'shrine', 'ghost', 'zongzi', 'guan', 'loan', 'wind', 'poe']);
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const eventDecisions = new WeakMap();

export function readEventModelContractV4() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_V4_PATH, 'utf8'));
  if (contract.schema !== 'yaoshi.l1e.sixOfFour.modelContract.v4')
    throw new Error('unsupported six-of-four model contract version');
  return contract;
}

function instrumentEventApi(sourceText) {
  const anchor = 'window.__yaoshi={ newGame,';
  if ((sourceText.match(/window\.__yaoshi=\{ newGame,/g) || []).length !== 1)
    throw new Error('event fixture API instrumentation anchor mismatch');
  return sourceText.replace(anchor,
    'window.__yaoshi={ eventCtx, settleEvent, chairSeen, guanSeen, faceLbl, eventForRound, newGame,');
}

export function loadPinnedEventEngine() {
  const pinned = verifyPinnedProductSource();
  const instrumentedSource = instrumentEventApi(pinned.sourceText);
  const G = loadGame(PRODUCT, { sourceText: instrumentedSource });
  return {
    G,
    provenance: {
      sourceCommit: pinned.commit,
      sourceBlobOid: pinned.blobOid,
      sourceSha256: pinned.sha256,
      adapterSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
      fixtureSha256: hash(fs.readFileSync(path.join(ROOT, 'tests/l1e-event-action-adapter.test.mjs'))),
      instrumentedSourceSha256: hash(Buffer.from(instrumentedSource, 'utf8')),
    },
  };
}

function requireActiveState(G, state) {
  if (G?.S !== state) throw new Error('event adapter state must belong to its pinned engine');
}

function contextOf(decision) {
  const internal = decision && eventDecisions.get(decision);
  if (!internal) throw new TypeError('event decision was not created by this adapter');
  return internal;
}

export function createEventDecision(G, state) {
  requireActiveState(G, state);
  const event = G.eventForRound(state.round);
  if (!event || !['pick', 'num'].includes(event.input))
    throw new RangeError('the current round has no supported sealed event decision');
  const ctx = G.eventCtx(event);
  if (!ctx.players.length) throw new RangeError('sealed event has no living participants');
  const decision = Object.freeze({
    schema: DECISION_SCHEMA,
    eventId: event.id,
    round: state.round,
    playerIds: Object.freeze(ctx.players.map((player) => player.id)),
  });
  eventDecisions.set(decision, { G, state, ctx, committed: new Set(), resolved: false });
  return decision;
}

export function* enumerateLegalEventChoices(decision, playerId) {
  const { ctx, committed, resolved } = contextOf(decision);
  if (resolved || committed.has(playerId)) throw new Error('event choice is already committed or resolved');
  const player = ctx.players.find((entry) => entry.id === playerId);
  if (!player) throw new RangeError('event choice requires a living participant');
  const event = ctx.ev;
  if (event.input === 'pick') {
    if (!Array.isArray(event.opts) || !event.opts.length) throw new Error('pick event has no declared options');
    for (const option of event.opts) yield option.v;
    return;
  }
  const cap = event.cap(player);
  if (!Number.isInteger(cap) || cap < 0) throw new Error('event cap must be a non-negative integer');
  for (let amount = 0; amount <= cap; amount++) yield amount;
  if (event.allowPass) yield null;
}

export function commitEventChoice(decision, playerId, choice) {
  const internal = contextOf(decision);
  if (internal.resolved || internal.committed.has(playerId))
    throw new Error('sealed event choice cannot be changed after commitment');
  let legal = false;
  for (const candidate of enumerateLegalEventChoices(decision, playerId)) {
    if (Object.is(candidate, choice)) { legal = true; break; }
  }
  if (!legal) throw new RangeError('choice is outside this participant\'s engine-legal event actions');
  internal.ctx.choices[playerId] = choice;
  internal.committed.add(playerId);
  return true;
}

function visibleItem(item) {
  const result = {};
  for (const key of ['n', 'f', 'p', 'curse', 'ab', 'd', 'unit', 'legend']) {
    if (item[key] !== undefined) result[key] = item[key];
  }
  return result;
}

function copyPlain(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint')
      throw new TypeError('event observation values must be JSON-safe');
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

function publicHistory(G, state) {
  const history = G.replayExport(state).history;
  return (history.nights || []).map((night) => ({
    round: night.round,
    rule: night.rule ?? null,
    event: night.event ?? null,
    marks: (night.marks || []).map((mark) => ({ pid: mark.pid, item: mark.item })),
    auction: (night.auction || []).map((auction) => ({
      item: auction.item,
      fac: auction.fac,
      p: auction.p,
      curse: !!auction.curse,
      winnerId: auction.winnerId ?? null,
      amt: auction.amt ?? 0,
      type: auction.type ?? null,
      intent: auction.intent ?? null,
      targetId: auction.targetId ?? null,
      poisonBlocked: !!auction.poisonBlocked,
      bids: (auction.bids || []).map((bid) => ({
        pid: bid.pid, amt: bid.amt, type: bid.type, intent: bid.intent, cost: bid.cost ?? null,
      })),
      destinyAwakenings: (auction.destinyAwakenings || []).map((reveal) => ({
        pid: reveal.pid, chainId: reveal.chainId,
      })),
    })),
    fights: copyPlain(night.fights || []),
    bye: night.bye ?? null,
    deaths: [...(night.deaths || [])],
    closed: !!night.closed,
    shrine: night.shrine ? copyPlain(night.shrine) : null,
  }));
}

function playerObservation(G, state, viewerId, player) {
  const own = player.id === viewerId;
  const exactLife = own || G.chairSeen();
  const destinyPublic = !!state.destinyPublic?.[player.id];
  const destiny = own || destinyPublic ? {
    chainId: player.destiny ?? null,
    awakened: destinyPublic,
    private: own && !destinyPublic,
  } : { chainId: null, awakened: false, private: false };
  const bagSummary = G.CFG.PAPERWAR_ON
    ? (() => {
      const army = G.buildArmy(player.bag);
      let units = 0;
      let hp = 0;
      for (const team of army.teams) for (const unit of team.units) {
        units++;
        hp += unit.max | 0;
      }
      return { units, hp, publicPower: Math.round(G.power(player)) };
    })()
    : { count: player.bag.length, publicPower: Math.round(G.power(player)) };
  const wishVisible = own || (G.guanSeen() && player.ai && player.alive);
  return {
    id: player.id,
    name: player.name,
    roleId: player.roleId ?? null,
    alive: !!player.alive,
    life: exactLife ? player.life : null,
    appearance: exactLife ? null : G.faceLbl(player),
    debt: state.debts?.[player.id]?.left ?? null,
    bagSummary,
    destiny,
    ...(wishVisible ? { wishId: player.wish?.id ?? null } : {}),
    ...(own ? { bag: player.bag.map(visibleItem) } : {}),
  };
}

export function eventObservation(G, state, decision, viewerId) {
  requireActiveState(G, state);
  const internal = contextOf(decision);
  if (internal.G !== G || internal.state !== state || internal.resolved || !internal.ctx.players.some((p) => p.id === viewerId))
    throw new Error('event observation must match an unresolved living-seat decision');
  if (internal.committed.has(viewerId)) throw new Error('a seat cannot reopen a sealed event decision');
  const viewer = state.players.find((player) => player.id === viewerId);
  const event = internal.ctx.ev;
  const options = event.input === 'pick'
    ? event.opts.map((option) => ({ value: option.v, label: option.label }))
    : { min: 0, max: event.cap(viewer), allowPass: !!event.allowPass, passLabel: event.passLabel ?? null };
  const description = typeof event.desc === 'function' ? event.desc(internal.ctx) : event.desc;
  const observation = {
    schema: OBSERVATION_SCHEMA,
    phase: 'event.sealedCommit',
    viewerId,
    round: state.round,
    eventId: event.id,
    name: event.name,
    icon: event.icon,
    input: event.input,
    playerIds: internal.ctx.players.map((player) => player.id),
    description,
    options,
    victimId: internal.ctx.victim?.id ?? null,
    players: state.players.map((player) => playerObservation(G, state, viewerId, player)),
    publicHistory: publicHistory(G, state),
  };
  return deepFreeze(copyPlain(observation));
}

export function resolveEventSubmissions(G, state, decision) {
  requireActiveState(G, state);
  const internal = contextOf(decision);
  if (internal.G !== G || internal.state !== state || internal.resolved)
    throw new Error('event decision is already resolved or belongs to another engine state');
  if (internal.committed.size !== internal.ctx.players.length)
    throw new Error('event requires a sealed choice from every living participant');
  const beforeLife = new Map(state.players.map((player) => [player.id, player.life]));
  const log = [];
  internal.resolved = true;
  G.settleEvent(internal.ctx, log);
  const choices = internal.ctx.players.map((player) => ({ pid: player.id, value: internal.ctx.choices[player.id] }));
  const lifeDelta = internal.ctx.players.map((player) => ({
    pid: player.id,
    before: beforeLife.get(player.id),
    after: player.life,
    delta: player.life - beforeLife.get(player.id),
    alive: !!player.alive,
  }));
  const publicReveal = deepFreeze(copyPlain({ eventId: internal.ctx.ev.id, round: state.round, choices, lifeDelta, log }));
  return { eventId: internal.ctx.ev.id, choices, lifeDelta, log, publicReveal };
}

export function auctionObservationAfterEvents(G, state, viewerId, publicEventReveals = []) {
  if (!Array.isArray(publicEventReveals)) throw new TypeError('public event reveals must be an array');
  const precedingPublicEvents = publicEventReveals.map((reveal) => sanitizePublicEventReveal(G, state, reveal));
  const base = auctionObservation(G, state, viewerId);
  return deepFreeze(copyPlain({ ...base, precedingPublicEvents }));
}

function sanitizePublicEventReveal(G, state, reveal) {
  if (!reveal || !EVENT_IDS.has(reveal.eventId) || !Number.isInteger(reveal.round) || reveal.round !== state.round)
    throw new RangeError('public event reveal must belong to the current round');
  if (!Array.isArray(reveal.choices) || !Array.isArray(reveal.lifeDelta) || !Array.isArray(reveal.log))
    throw new TypeError('public event reveal is missing its public result fields');
  const publicPid = (pid) => Number.isInteger(pid) && state.players.some((player) => player.id === pid);
  const choices = reveal.choices.map((entry) => {
    if (!entry || !publicPid(entry.pid) ||
        !(entry.value === null || typeof entry.value === 'string' ||
          typeof entry.value === 'number' && Number.isFinite(entry.value)))
      throw new TypeError('public event choice has an invalid participant or value');
    return { pid: entry.pid, value: entry.value };
  });
  const lifeDelta = reveal.lifeDelta.map((entry) => {
    if (!entry || !publicPid(entry.pid) || !Number.isInteger(entry.before) ||
        !Number.isInteger(entry.after) || !Number.isInteger(entry.delta) ||
        entry.delta !== entry.after - entry.before || typeof entry.alive !== 'boolean')
      throw new TypeError('public event life result is malformed');
    return { pid: entry.pid, before: entry.before, after: entry.after, delta: entry.delta, alive: entry.alive };
  });
  if (choices.length !== lifeDelta.length || choices.some((entry, index) => entry.pid !== lifeDelta[index].pid) ||
      reveal.log.some((entry) => typeof entry !== 'string'))
    throw new TypeError('public event result fields do not match');
  return deepFreeze({
    eventId: reveal.eventId,
    round: reveal.round,
    choices,
    lifeDelta,
    log: [...reveal.log],
  });
}

export function appendEventDecision(history, observation, choice) {
  if (!Array.isArray(history) || observation?.schema !== OBSERVATION_SCHEMA ||
      !observation.playerIds?.includes(observation.viewerId))
    throw new TypeError('event recall requires a matching seat observation and choice');
  if (history.some((record) => record?.observation?.schema !== OBSERVATION_SCHEMA ||
      record.observation.viewerId !== observation.viewerId))
    throw new TypeError('event recall history must be for the same viewer');
  const legal = Array.isArray(observation.options)
    ? observation.options.some((option) => Object.is(option.value, choice))
    : Number.isInteger(choice) && choice >= observation.options.min && choice <= observation.options.max
      || choice === null && observation.options.allowPass;
  if (!legal) throw new RangeError('event recall choice is not legal for this observation');
  const next = [...history.map(copyPlain), { observation: copyPlain(observation), choice: copyPlain(choice) }];
  return deepFreeze(next);
}

export function eventInformationSetKey(history, currentObservation) {
  if (!Array.isArray(history) || currentObservation?.schema !== OBSERVATION_SCHEMA ||
      history.some((record) => record?.observation?.schema !== OBSERVATION_SCHEMA ||
        record.observation.viewerId !== currentObservation.viewerId))
    throw new TypeError('event information history must belong to the current seat');
  return stableStringify({ schema: 'yaoshi.event-information-set.v1', history, currentObservation });
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

export function eventAdapterStatus() {
  return {
    actions: 'partial',
    observations: 'partial',
    completeDecisionTree: false,
    excludedDecisionPhases: ['mark', 'sacrifice', 'shrine-pick', 'battle', 'settlement'],
  };
}

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './load.mjs';
import { verifyPinnedProductSource } from './l1e-destiny-adapter-fixtures.mjs';
import {
  appendFullRecallDecision,
  fullRecallInformationSetKey,
} from './l1e-full-recall-adapter.mjs';
import {
  auctionObservationAfterEvents,
  commitEventChoice,
  createEventDecision,
  enumerateLegalEventChoices,
  eventObservation,
  resolveEventSubmissions,
} from './l1e-event-action-adapter.mjs';
import {
  auctionObservation,
  enumerateLegalAuctionSubmissions,
} from './l1e-auction-action-adapter.mjs';
import {
  beginInteractiveShrineResolution,
  commitMarkChoice,
  commitSacrificeChoice,
  commitShrinePick,
  createMarkDecision,
  createSacrificeDecision,
  enumerateLegalMarkChoices,
  enumerateLegalSacrificeActions,
  enumerateLegalShrinePicks,
  markObservation,
  sacrificeObservation,
  shrinePickObservation,
} from './l1e-remaining-player-action-adapter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRODUCT = path.join(ROOT, 'index.html');
const CONTRACT_V8_PATH = path.join(ROOT, 'docs/experiments/2026-09-23-destiny/model-contract-v8.json');
const ADAPTER_PATH = fileURLToPath(import.meta.url);
const FIXTURE_PATH = path.join(ROOT, 'tests/l1e-full-recall-v8.test.mjs');
const SEQUENCE_SCHEMA = 'yaoshi.full-recall-sequence.v1';
const TRANSITION_SCHEMA = 'yaoshi.public-transition.v1';
const PHASES = Object.freeze({
  event: { schema: 'yaoshi.event-observation.v1', phase: 'event.sealedCommit' },
  mark: { schema: 'yaoshi.mark-observation.v1', phase: 'mark.preAuction' },
  sacrifice: { schema: 'yaoshi.sacrifice-observation.v1', phase: 'sacrifice.preAuction' },
  auction: { schema: 'yaoshi.auction-observation.v1', phase: 'auction.sealedCommit' },
  'shrine-pick': { schema: 'yaoshi.shrine-pick-observation.v1', phase: 'shrine.pickLegend' },
});
const PHASE_ORDER = Object.freeze({ event: 0, mark: 2, sacrifice: 3, auction: 4, 'shrine-pick': 5 });
const OBSERVATION_PROVENANCE = new WeakMap();
const TRANSITION_PROVENANCE = new WeakMap();
const SEQUENCE_PROVENANCE = new WeakMap();
const EVENT_COMMITTED_CHOICES = new WeakMap();
const EVENT_DECISION_PROVENANCE = new WeakMap();
const EVENT_DECISION_REVISIONS = new WeakMap();
const DECISION_ACTIONS = new WeakMap();
const DECISION_METADATA = new WeakMap();
const STATE_DECISION_ACTIONS = new WeakMap();
const EVENT_RESOLUTION_ROUNDS = new WeakMap();
const SHRINE_RESOLUTION_ROUNDS = new WeakMap();
const COMMITTED_DECISION_LOCI = new WeakMap();
const STATE_REVISION = new WeakMap();
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

export function readFullRecallContractV8() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_V8_PATH, 'utf8'));
  if (contract.schema !== 'yaoshi.l1e.sixOfFour.modelContract.v8')
    throw new Error('unsupported six-of-four model contract version');
  return contract;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function isDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return true;
  if (seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value) && Object.values(value).every((child) => isDeepFrozen(child, seen));
}

function currentRevision(state) {
  return STATE_REVISION.get(state) ?? 0;
}

function advanceRevision(state) {
  STATE_REVISION.set(state, currentRevision(state) + 1);
}

function copyPlain(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint')
      throw new TypeError('full recall sequence values must be JSON-safe');
    return value;
  }
  if (seen.has(value)) throw new TypeError('full recall sequence values cannot contain cycles or aliases');
  const result = Array.isArray(value) ? [] : {};
  seen.set(value, result);
  if (Array.isArray(value)) {
    for (const child of value) result.push(copyPlain(child, seen));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
      throw new TypeError('full recall sequence values must use plain objects');
    for (const key of Object.keys(value).sort()) result[key] = copyPlain(value[key], seen);
  }
  seen.delete(value);
  return result;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function instrumentPinnedApi(sourceText) {
  const anchor = 'window.__yaoshi={ newGame,';
  if ((sourceText.match(/window\.__yaoshi=\{ newGame,/g) || []).length !== 1)
    throw new Error('v8 projection fixture API instrumentation anchor mismatch');
  const api = [
    'eventCtx', 'settleEvent', 'chairSeen', 'guanSeen', 'faceLbl', 'eventForRound',
    'drawMarks', 'bleed', 'resolveShrines', 'finishShrines', 'openShrines', 'facCount',
    'credOf', 'ruleForRound', 'feeForBid', 'stakeFeeRange', 'isStakeNight', 'noCurseNight',
    'noDestroyNight', 'showPow', 'newGame',
  ];
  return sourceText.replace(anchor, `window.__yaoshi={ ${api.join(', ')},`);
}

function registerProjection(observation, phase, G, state, decision = null) {
  const expected = PHASES[phase];
  if (!expected || observation?.schema !== expected.schema || observation?.phase !== expected.phase ||
      !Number.isInteger(observation?.viewerId) || !Number.isInteger(observation?.round))
    throw new TypeError('pinned adapter returned an observation with an unexpected phase schema');
  if (!isDeepFrozen(observation))
    throw new TypeError('pinned projection must be deeply immutable');
  OBSERVATION_PROVENANCE.set(observation, {
    G,
    state,
    phase,
    viewerId: observation.viewerId,
    round: observation.round,
    revision: currentRevision(state),
    decision,
  });
  if (decision) {
    let byViewer = DECISION_METADATA.get(decision);
    if (!byViewer) {
      byViewer = new Map();
      DECISION_METADATA.set(decision, byViewer);
    }
    const provenance = OBSERVATION_PROVENANCE.get(observation);
    const prior = byViewer.get(provenance.viewerId);
    if (prior && (prior.G !== G || prior.state !== state || prior.phase !== phase ||
        prior.round !== provenance.round || prior.revision !== provenance.revision))
      throw new TypeError('decision object cannot be reused at a different state locus');
    byViewer.set(provenance.viewerId, {
      G, state, phase, round: provenance.round, viewerId: provenance.viewerId,
      revision: provenance.revision,
    });
  }
  return observation;
}

function requireProjection(phase, observation) {
  const expected = PHASES[phase];
  if (!expected || observation?.schema !== expected.schema || observation?.phase !== expected.phase)
    throw new TypeError('phase and observation schema do not match');
  const provenance = OBSERVATION_PROVENANCE.get(observation);
  if (!provenance) throw new TypeError('observation lacks pinned projection provenance');
  if (provenance.phase !== phase || provenance.viewerId !== observation.viewerId ||
      provenance.round !== observation.round)
    throw new TypeError('phase and observation schema do not match pinned projection provenance');
  return provenance;
}

function requireFreshProjection(provenance) {
  if (currentRevision(provenance.state) !== provenance.revision)
    throw new Error('pinned observation is stale after a state transition');
}

function decisionLocusKey(metadata) {
  return `${metadata.phase}:${metadata.round}:${metadata.viewerId}:${metadata.revision}`;
}

function stateDecisionActions(metadata, create = false) {
  let actions = STATE_DECISION_ACTIONS.get(metadata.state);
  if (!actions && create) {
    actions = new Map();
    STATE_DECISION_ACTIONS.set(metadata.state, actions);
  }
  return actions;
}

function claimEventDecisionRevision(state, round) {
  let revisions = EVENT_DECISION_REVISIONS.get(state);
  if (!revisions) {
    revisions = new Map();
    EVENT_DECISION_REVISIONS.set(state, revisions);
  }
  const revision = currentRevision(state);
  if (revisions.has(round) && revisions.get(round) !== revision)
    throw new Error('event decision phase was already opened at an earlier state revision for this round');
  revisions.set(round, revision);
  return revision;
}

function rejectEventAfterLaterPhaseAction(state, round) {
  const actions = STATE_DECISION_ACTIONS.get(state);
  for (const [phase, order] of Object.entries(PHASE_ORDER)) {
    if (order <= PHASE_ORDER.event) continue;
    const prefix = `${phase}:${round}:`;
    if ([...(actions?.keys() || [])].some((key) => key.startsWith(prefix)))
      throw new Error('event phase cannot begin after a later same-round decision was recorded');
  }
}

function requireFreshEventDecision(G, state, decision) {
  const provenance = EVENT_DECISION_PROVENANCE.get(decision);
  if (!provenance || provenance.G !== G || provenance.state !== state)
    throw new TypeError('event decision lacks pinned creation provenance for this state');
  if (provenance.round !== decision.round || provenance.round !== state.round ||
      provenance.revision !== currentRevision(state))
    throw new Error('event decision is stale after a state transition');
  rejectEventAfterLaterPhaseAction(state, provenance.round);
}

function claimStateRound(registry, state, round, message) {
  let rounds = registry.get(state);
  if (!rounds) {
    rounds = new Set();
    registry.set(state, rounds);
  }
  if (rounds.has(round)) throw new Error(message);
  rounds.add(round);
}

function decisionCommitTicket(decision, viewerId) {
  const metadata = DECISION_METADATA.get(decision)?.get(viewerId);
  if (metadata && currentRevision(metadata.state) !== metadata.revision)
    throw new Error('pinned decision is stale after a state transition');
  if (!metadata) return null;
  const key = decisionLocusKey(metadata);
  if (COMMITTED_DECISION_LOCI.get(metadata.state)?.has(key))
    throw new Error('decision action already committed at this state locus');
  return { state: metadata.state, key };
}

function markDecisionLocusCommitted(ticket, choice) {
  if (!ticket) return;
  let committed = COMMITTED_DECISION_LOCI.get(ticket.state);
  if (!committed) {
    committed = new Map();
    COMMITTED_DECISION_LOCI.set(ticket.state, committed);
  }
  committed.set(ticket.key, choice);
}

function requireRecordedChoice(decision, viewerId, choice, { required = false } = {}) {
  const actions = DECISION_ACTIONS.get(decision);
  const hasDecisionAction = actions?.has(viewerId) ?? false;
  const metadata = DECISION_METADATA.get(decision)?.get(viewerId);
  if (metadata && currentRevision(metadata.state) !== metadata.revision)
    throw new Error('pinned decision is stale after a state transition');
  const locusActions = metadata && stateDecisionActions(metadata);
  const locusKey = metadata && decisionLocusKey(metadata);
  const hasLocusAction = locusActions?.has(locusKey) ?? false;
  if (!hasDecisionAction && !hasLocusAction) {
    if (required) throw new TypeError('decision must be recorded before its pinned action is committed');
    return;
  }
  const decisionAction = hasDecisionAction ? actions.get(viewerId) : null;
  const locusAction = hasLocusAction ? locusActions.get(locusKey) : null;
  if (hasDecisionAction && hasLocusAction &&
      stableStringify(decisionAction) !== stableStringify(locusAction))
    throw new TypeError('decision action binding disagrees with its state locus');
  const action = hasLocusAction ? locusAction : decisionAction;
  if (!Object.hasOwn(action, 'choice') || !Object.is(action.choice, choice))
    throw new RangeError('committed choice does not match the recorded full-recall action');
}

function unwrapPinnedEventReveals(G, state, transitions) {
  if (!Array.isArray(transitions)) throw new TypeError('pinned public event transitions must be an array');
  const seen = new Set();
  return transitions.map((transition) => {
    const provenance = TRANSITION_PROVENANCE.get(transition);
    if (!provenance || transition?.schema !== TRANSITION_SCHEMA || transition.type !== 'event.reveal' ||
        provenance.G !== G || provenance.state !== state)
      throw new TypeError('public event reveal lacks pinned transition provenance for this state');
    if (transition.round !== state.round || provenance.round !== state.round)
      throw new RangeError('pinned public event reveal must belong to the current round');
    const key = `${transition.round}:${transition.eventId}`;
    if (seen.has(key)) throw new Error('duplicate public event reveal in projection input');
    seen.add(key);
    return transition.payload;
  });
}

function eventActionMatchesReveal(record, transition) {
  const viewerChoice = transition.payload?.choices?.find((entry) => entry.pid === record.viewerId);
  return viewerChoice !== undefined && Object.hasOwn(record.action || {}, 'choice') &&
    Object.is(viewerChoice.value, record.action.choice);
}

function assertHistoryProgressed(history) {
  let priorDecision = null;
  let priorEventWasRevealed = false;
  for (const entry of history) {
    if (entry.kind === 'decision') {
      if (priorDecision) assertDecisionWasApplied(priorDecision, priorEventWasRevealed);
      priorDecision = entry;
      priorEventWasRevealed = false;
    } else if (priorDecision) {
      const source = TRANSITION_PROVENANCE.get(entry.transition);
      const prior = SEQUENCE_PROVENANCE.get(priorDecision);
      if (priorDecision.record.phase === 'event' && source?.decision === prior?.decision)
        priorEventWasRevealed = true;
    }
  }
  if (priorDecision) assertDecisionWasApplied(priorDecision, priorEventWasRevealed);
}

function assertDecisionWasApplied(entry, eventWasRevealed) {
  const record = entry.record;
  const source = SEQUENCE_PROVENANCE.get(entry);
  if (record.phase === 'event') {
    if (!eventWasRevealed)
      throw new Error('pinned event decision requires its public event reveal before the next decision');
    return;
  }
  if (!['mark', 'sacrifice', 'shrine-pick'].includes(record.phase)) return;
  const projection = OBSERVATION_PROVENANCE.get(source.projection);
  const locusKey = `${record.phase}:${record.round}:${record.viewerId}:${projection.revision}`;
  if (!COMMITTED_DECISION_LOCI.get(source.state)?.has(locusKey))
    throw new Error(`recorded ${record.phase} action must be committed before the next decision`);
}

function validateHistory(history, viewerId = null, G = null, stateRef = null) {
  if (!Array.isArray(history)) throw new TypeError('full recall sequence history must be an array');
  let owner = viewerId;
  let engine = G;
  let branchState = stateRef;
  let lastRound = -Infinity;
  let lastPhaseOrder = -1;
  let lastDecisionRound = -Infinity;
  let lastDecisionRevision = -Infinity;
  let priorEntry = null;
  const decisions = [];
  const transitionKeys = new Set();
  const decisionObjects = new WeakSet();
  const singleUsePhases = new Set();
  const decisionLoci = new Set();

  for (const entry of history) {
    const stored = SEQUENCE_PROVENANCE.get(entry);
    if (!stored || entry?.schema !== SEQUENCE_SCHEMA || stored.kind !== entry.kind)
      throw new TypeError('full recall sequence contains an untrusted or malformed record');
    if (stored.G && engine && stored.G !== engine)
      throw new TypeError('full recall history must use one pinned engine');
    if (stored.G) engine = stored.G;
    if (stored.state && branchState && stored.state !== branchState)
      throw new TypeError('full recall history must belong to one game state branch');
    if (stored.state) branchState = stored.state;

    if (entry.kind === 'decision') {
      const record = entry.record;
      const phase = PHASES[record?.phase];
      const projection = OBSERVATION_PROVENANCE.get(stored.projection);
      if (!phase || record?.schema !== 'yaoshi.full-recall-record.v1' ||
          record.round !== record.observation?.round || record.viewerId !== record.observation?.viewerId)
        throw new TypeError('full recall sequence contains a malformed decision record');
      if (record.round < lastRound) throw new RangeError('full recall decisions must be chronological');
      const phaseOrder = PHASE_ORDER[record.phase];
      if (record.round === lastRound && phaseOrder < lastPhaseOrder)
        throw new RangeError('full recall decisions must follow phase order within a round');
      if (record.round > lastRound) lastPhaseOrder = -1;
      if (owner === null) owner = record.viewerId;
      if (record.viewerId !== owner) throw new TypeError('full recall history must belong to the same viewer');
      if (stored.decision && decisionObjects.has(stored.decision))
        throw new Error('duplicate decision object in full recall history');
      if (stored.decision) decisionObjects.add(stored.decision);
      if (record.phase !== 'sacrifice') {
        const phaseRound = `${record.phase}:${record.round}`;
        if (singleUsePhases.has(phaseRound))
          throw new Error('duplicate single-use phase decision in full recall history');
        singleUsePhases.add(phaseRound);
      }
      if (stored.phase !== record.phase || stored.round !== record.round || stored.viewerId !== record.viewerId ||
          !projection || projection.G !== stored.G || projection.state !== stored.state ||
          projection.phase !== record.phase || projection.round !== record.round ||
          projection.viewerId !== record.viewerId || stored.decision !== projection.decision)
        throw new TypeError('full recall decision provenance does not match its record');
      const locusKey = `${record.phase}:${record.round}:${record.viewerId}:${projection.revision}`;
      if (decisionLoci.has(locusKey))
        throw new Error('duplicate decision locus in full recall history');
      if (record.round === lastDecisionRound && projection.revision <= lastDecisionRevision)
        throw new RangeError('full recall decisions must follow a state transition within the same round');
      decisionLoci.add(locusKey);
      decisions.push(record);
      lastDecisionRound = record.round;
      lastDecisionRevision = projection.revision;
      lastRound = record.round;
      lastPhaseOrder = phaseOrder;
    } else if (entry.kind === 'public-transition') {
      const transition = entry.transition;
      const transitionSource = TRANSITION_PROVENANCE.get(transition);
      if (!transitionSource || transition?.schema !== TRANSITION_SCHEMA ||
          transition.type !== 'event.reveal' || transitionSource.G !== engine ||
          transitionSource.state !== branchState || stored.state !== branchState)
        throw new TypeError('full recall sequence contains an untrusted public transition');
      if (owner === null || entry.viewerId !== owner)
        throw new TypeError('public transition must belong to the same viewer history');
      if (transition.round < lastRound) throw new RangeError('public transitions must be chronological');
      if (priorEntry?.kind !== 'decision' || priorEntry.record.phase !== 'event' ||
          priorEntry.record.round !== transition.round || transitionSource.round !== transition.round ||
          transitionSource.eventId !== transition.eventId ||
          SEQUENCE_PROVENANCE.get(priorEntry)?.decision !== transitionSource.decision ||
          !eventActionMatchesReveal(priorEntry.record, transition))
        throw new TypeError('public event reveal must follow its matching event decision');
      const key = `${transition.type}:${transition.round}:${transition.eventId}`;
      if (transitionKeys.has(key)) throw new Error('duplicate public transition in full recall history');
      transitionKeys.add(key);
      lastRound = transition.round;
      lastPhaseOrder = 1;
    } else {
      throw new TypeError('full recall sequence record kind is unsupported');
    }
    priorEntry = entry;
  }
  return { owner, G: engine, state: branchState, lastRound, lastPhaseOrder,
    lastDecisionRound, lastDecisionRevision, decisions };
}

export function appendFullRecallDecisionV8(history, phase, observation, action) {
  const provenance = requireProjection(phase, observation);
  const state = validateHistory(history, provenance.viewerId, provenance.G, provenance.state);
  if (state.owner !== provenance.viewerId)
    throw new TypeError('full recall history must belong to the same viewer');
  if (observation.round < state.lastRound)
    throw new RangeError('full recall decisions must be chronological');
  const phaseOrder = PHASE_ORDER[phase];
  if (observation.round === state.lastRound && phaseOrder < state.lastPhaseOrder)
    throw new RangeError('full recall decisions must follow phase order within a round');
  if (phase !== 'sacrifice' && history.some((entry) =>
      entry.kind === 'decision' && entry.phase === phase && entry.round === observation.round))
    throw new Error('duplicate single-use phase decision in full recall history');
  if (provenance.decision && history.some((entry) =>
      entry.kind === 'decision' && SEQUENCE_PROVENANCE.get(entry)?.decision === provenance.decision))
    throw new Error('duplicate decision object in full recall history');
  const observationLocusKey = `${phase}:${observation.round}:${provenance.viewerId}:${provenance.revision}`;
  if (history.some((entry) => {
    if (entry.kind !== 'decision' || entry.phase !== phase || entry.round !== observation.round ||
        entry.viewerId !== provenance.viewerId) return false;
    const stored = SEQUENCE_PROVENANCE.get(entry);
    const priorProjection = stored && OBSERVATION_PROVENANCE.get(stored.projection);
    return priorProjection?.revision === provenance.revision;
  })) throw new Error(`duplicate decision locus in full recall history: ${observationLocusKey}`);
  assertHistoryProgressed(history);
  if (observation.round === state.lastDecisionRound && provenance.revision <= state.lastDecisionRevision)
    throw new RangeError('full recall decisions must follow a state transition within the same round');
  requireFreshProjection(provenance);

  const decisionHistory = appendFullRecallDecision(state.decisions, phase, observation, action);
  const record = decisionHistory.at(-1);
  const existingActions = provenance.decision && DECISION_ACTIONS.get(provenance.decision);
  const decisionMetadata = (provenance.decision &&
    DECISION_METADATA.get(provenance.decision)?.get(provenance.viewerId)) || {
    G: provenance.G, state: provenance.state, phase, round: record.round,
    viewerId: record.viewerId, revision: provenance.revision,
  };
  const existingLocusActions = stateDecisionActions(decisionMetadata);
  const locusKey = decisionLocusKey(decisionMetadata);
  const committedLocusChoices = decisionMetadata
    ? COMMITTED_DECISION_LOCI.get(decisionMetadata.state) : null;
  if (committedLocusChoices?.has(locusKey) &&
      !Object.is(committedLocusChoices.get(locusKey), record.action.choice))
    throw new TypeError('recorded action does not match the committed choice at this state locus');
  const committedEventChoices = phase === 'event' && provenance.decision
    ? EVENT_COMMITTED_CHOICES.get(provenance.decision) : null;
  if (committedEventChoices?.has(provenance.viewerId) &&
      !Object.is(committedEventChoices.get(provenance.viewerId), record.action.choice))
    throw new TypeError('recorded event action does not match an already committed choice');
  if (existingActions?.has(provenance.viewerId) &&
      stableStringify(existingActions.get(provenance.viewerId)) !== stableStringify(record.action))
    throw new TypeError('decision object already has a conflicting full-recall action');
  if (existingLocusActions?.has(locusKey) &&
      stableStringify(existingLocusActions.get(locusKey)) !== stableStringify(record.action))
    throw new TypeError('decision locus already has a conflicting full-recall action');
  const entry = deepFreeze({ schema: SEQUENCE_SCHEMA, kind: 'decision', phase, round: record.round,
    viewerId: record.viewerId, record });
  SEQUENCE_PROVENANCE.set(entry, {
    G: provenance.G, kind: 'decision', phase, round: record.round,
    viewerId: record.viewerId, decision: provenance.decision, projection: observation,
    state: provenance.state,
  });
  if (provenance.decision) {
    let actions = DECISION_ACTIONS.get(provenance.decision);
    if (!actions) {
      actions = new Map();
      DECISION_ACTIONS.set(provenance.decision, actions);
    }
    actions.set(provenance.viewerId, record.action);
  }
  stateDecisionActions(decisionMetadata, true).set(locusKey, record.action);
  return Object.freeze([...history, entry]);
}

export function appendPublicTransitionV8(history, transition) {
  const source = TRANSITION_PROVENANCE.get(transition);
  if (!source) throw new TypeError('public transition lacks pinned transition provenance');
  const state = validateHistory(history, null, source.G, source.state);
  if (state.owner === null)
    throw new TypeError('public transition requires an existing same-viewer decision history');
  if (transition.round < state.lastRound)
    throw new RangeError('public transitions must be chronological');
  const key = `${transition.type}:${transition.round}:${transition.eventId}`;
  if (history.some((entry) => entry.kind === 'public-transition' &&
      `${entry.transition.type}:${entry.transition.round}:${entry.transition.eventId}` === key))
    throw new Error('duplicate public transition in full recall history');
  const previous = history.at(-1);
  if (previous?.kind !== 'decision' || previous.phase !== 'event' || previous.round !== transition.round ||
      source.round !== transition.round || source.eventId !== transition.eventId ||
      SEQUENCE_PROVENANCE.get(previous)?.decision !== source.decision ||
      !eventActionMatchesReveal(previous.record, transition))
    throw new TypeError('public event reveal must follow its matching event decision');

  const entry = deepFreeze({ schema: SEQUENCE_SCHEMA, kind: 'public-transition', viewerId: state.owner,
    transition });
  SEQUENCE_PROVENANCE.set(entry, {
    G: source.G, state: source.state, kind: 'public-transition', viewerId: state.owner,
  });
  return Object.freeze([...history, entry]);
}

export function fullRecallInformationSetKeyV8(history, currentObservation) {
  const provenance = requireProjection(
    Object.keys(PHASES).find((phase) => PHASES[phase].schema === currentObservation?.schema),
    currentObservation,
  );
  const state = validateHistory(history, provenance.viewerId, provenance.G, provenance.state);
  if (state.owner !== null && state.owner !== provenance.viewerId)
    throw new TypeError('full recall history must belong to the same viewer');
  if (currentObservation.round < state.lastRound)
    throw new RangeError('current observation must follow the full recall history chronologically');
  const currentPhase = Object.keys(PHASES).find((phase) => PHASES[phase].schema === currentObservation.schema);
  const currentPhaseOrder = PHASE_ORDER[currentPhase];
  if (currentObservation.round === state.lastRound && currentPhaseOrder < state.lastPhaseOrder)
    throw new RangeError('current observation must follow the full recall phase order');
  if (currentObservation.round === state.lastRound && currentPhaseOrder === state.lastPhaseOrder &&
      currentPhase !== 'sacrifice' && state.decisions.some((record) =>
        record.phase === currentPhase && record.round === currentObservation.round))
    throw new Error('current observation duplicates a completed single-use phase');
  assertHistoryProgressed(history);
  if (currentObservation.round === state.lastDecisionRound && provenance.revision <= state.lastDecisionRevision)
    throw new RangeError('current observation must follow a state transition within the same round');
  requireFreshProjection(provenance);
  fullRecallInformationSetKey(state.decisions, currentObservation);
  return stableStringify({
    schema: 'yaoshi.full-recall-information-set.v2',
    viewerId: provenance.viewerId,
    sequence: copyPlain(history),
    currentObservation: copyPlain(currentObservation),
  });
}

export function fullRecallAdapterV8Status() {
  return {
    history: 'partial',
    trustedProjectionPhases: Object.keys(PHASES),
    publicTransitions: 'partial',
    completeDecisionTree: false,
    completeChance: false,
    crossNightRestore: false,
    solverStatus: 'not-run',
  };
}

export function loadPinnedFullRecallProjectionEngineV8() {
  const pinned = verifyPinnedProductSource();
  const instrumentedSource = instrumentPinnedApi(pinned.sourceText);
  const G = loadGame(PRODUCT, { sourceText: instrumentedSource });
  const provenance = Object.freeze({
    sourceCommit: pinned.commit,
    sourceBlobOid: pinned.blobOid,
    sourceSha256: pinned.sha256,
    adapterSha256: hash(fs.readFileSync(ADAPTER_PATH)),
    fixtureSha256: hash(fs.readFileSync(FIXTURE_PATH)),
    instrumentedSourceSha256: hash(Buffer.from(instrumentedSource, 'utf8')),
  });

  const event = Object.freeze({
    createDecision: (state) => {
      rejectEventAfterLaterPhaseAction(state, state.round);
      const revision = claimEventDecisionRevision(state, state.round);
      const decision = createEventDecision(G, state);
      EVENT_COMMITTED_CHOICES.set(decision, new Map());
      EVENT_DECISION_PROVENANCE.set(decision, { G, state, round: decision.round, revision });
      return decision;
    },
    observe: (state, decision, viewerId) => {
      requireFreshEventDecision(G, state, decision);
      return registerProjection(eventObservation(G, state, decision, viewerId), 'event', G, state, decision);
    },
    legalChoices: (decision, viewerId) => [...enumerateLegalEventChoices(decision, viewerId)],
    commitChoice: (decision, viewerId, choice) => {
      const committed = EVENT_COMMITTED_CHOICES.get(decision);
      if (!committed) throw new TypeError('event decision lacks v8 commitment provenance');
      requireFreshEventDecision(G, EVENT_DECISION_PROVENANCE.get(decision).state, decision);
      requireRecordedChoice(decision, viewerId, choice);
      const commitTicket = decisionCommitTicket(decision, viewerId);
      const result = commitEventChoice(decision, viewerId, choice);
      committed.set(viewerId, choice);
      markDecisionLocusCommitted(commitTicket, choice);
      return result;
    },
    resolve: (state, decision) => {
      if (EVENT_RESOLUTION_ROUNDS.get(state)?.has(decision?.round))
        throw new Error('event resolution already completed for this round');
      requireFreshEventDecision(G, state, decision);
      const committed = EVENT_COMMITTED_CHOICES.get(decision);
      if (!committed || committed.size !== decision.playerIds.length ||
          decision.playerIds.some((playerId) => !committed.has(playerId)))
        throw new TypeError('event reveal requires all choices committed through the pinned v8 adapter');
      for (const [viewerId, action] of DECISION_ACTIONS.get(decision) || []) {
        if (!committed.has(viewerId) || !Object.is(committed.get(viewerId), action.choice))
          throw new Error('pinned event action differs from committed choice before settlement');
      }
      const locusActions = STATE_DECISION_ACTIONS.get(state);
      for (const viewerId of decision.playerIds) {
        const locusKey = `event:${decision.round}:${viewerId}:${currentRevision(state)}`;
        const action = locusActions?.get(locusKey);
        if (action && (!committed.has(viewerId) || !Object.is(committed.get(viewerId), action.choice)))
          throw new Error('pinned event action differs from committed choice before settlement');
      }
      claimStateRound(EVENT_RESOLUTION_ROUNDS, state, decision.round,
        'event resolution already completed for this round');
      const result = resolveEventSubmissions(G, state, decision);
      if (result.publicReveal.choices.some((entry) => !Object.is(committed.get(entry.pid), entry.value)))
        throw new Error('pinned event resolver reveal does not match committed choices');
      for (const [viewerId, action] of DECISION_ACTIONS.get(decision) || []) {
        const revealed = result.publicReveal.choices.find((entry) => entry.pid === viewerId);
        if (!revealed || !Object.is(action.choice, revealed.value))
          throw new Error('pinned event reveal differs from the recorded full-recall action');
      }
      advanceRevision(state);
      const transition = deepFreeze({
        schema: TRANSITION_SCHEMA,
        type: 'event.reveal',
        round: result.publicReveal.round,
        eventId: result.eventId,
        payload: copyPlain(result.publicReveal),
      });
      TRANSITION_PROVENANCE.set(transition, {
        G, state, decision, round: transition.round, eventId: transition.eventId,
      });
      return { result, publicTransition: transition };
    },
  });

  const mark = Object.freeze({
    createDecision: (state, playerId) => createMarkDecision(G, state, playerId),
    observe: (state, decision, publicEventReveals = []) =>
      registerProjection(markObservation(G, state, decision,
        unwrapPinnedEventReveals(G, state, publicEventReveals)), 'mark', G, state, decision),
    legalChoices: (decision) => [...enumerateLegalMarkChoices(decision)],
    commitChoice: (state, decision, choice) => {
      requireRecordedChoice(decision, decision.playerId, choice, { required: true });
      const commitTicket = decisionCommitTicket(decision, decision.playerId);
      const result = commitMarkChoice(G, state, decision, choice);
      markDecisionLocusCommitted(commitTicket, choice);
      advanceRevision(state);
      return result;
    },
  });

  const sacrifice = Object.freeze({
    createDecision: (state, playerId) => createSacrificeDecision(G, state, playerId),
    observe: (state, decision, publicEventReveals = []) =>
      registerProjection(sacrificeObservation(G, state, decision,
        unwrapPinnedEventReveals(G, state, publicEventReveals)), 'sacrifice', G, state, decision),
    legalChoices: (decision) => [...enumerateLegalSacrificeActions(decision)],
    commitChoice: (state, decision, choice) => {
      requireRecordedChoice(decision, decision.playerId, choice, { required: true });
      const commitTicket = decisionCommitTicket(decision, decision.playerId);
      const result = commitSacrificeChoice(G, state, decision, choice);
      markDecisionLocusCommitted(commitTicket, choice);
      advanceRevision(state);
      return result;
    },
  });

  const auction = Object.freeze({
    observe: (state, viewerId, publicEventReveals = []) =>
      registerProjection(auctionObservationAfterEvents(G, state, viewerId,
        unwrapPinnedEventReveals(G, state, publicEventReveals)), 'auction', G, state),
    legalChoices: (state, playerId) => enumerateLegalAuctionSubmissions(G, state, playerId),
    observeWithoutEvent: (state, viewerId) =>
      registerProjection(auctionObservation(G, state, viewerId), 'auction', G, state),
  });

  const shrine = Object.freeze({
    beginResolution: (state) => {
      claimStateRound(SHRINE_RESOLUTION_ROUNDS, state, state.round,
        'shrine resolution already started for this round');
      const result = beginInteractiveShrineResolution(G, state);
      advanceRevision(state);
      return result.decision;
    },
    observe: (state, decision) =>
      registerProjection(shrinePickObservation(G, state, decision), 'shrine-pick', G, state, decision),
    legalChoices: (decision) => [...enumerateLegalShrinePicks(decision)],
    commitChoice: (state, decision, index) => {
      requireRecordedChoice(decision, decision.playerId, index, { required: true });
      const commitTicket = decisionCommitTicket(decision, decision.playerId);
      const result = commitShrinePick(G, state, decision, index);
      markDecisionLocusCommitted(commitTicket, index);
      advanceRevision(state);
      return result;
    },
  });

  return Object.freeze({ G, provenance, event, mark, sacrifice, auction, shrine });
}

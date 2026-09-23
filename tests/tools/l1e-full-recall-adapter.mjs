import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendAuctionDecision } from './l1e-auction-action-adapter.mjs';
import { appendEventDecision } from './l1e-event-action-adapter.mjs';

const CONTRACT_V7_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../docs/experiments/2026-09-23-destiny/model-contract-v7.json');
const RECORD_SCHEMA = 'yaoshi.full-recall-record.v1';
const HIDDEN_ENGINE_KEYS = new Set([
  'rng', 'rngui', 'rngstate', 'rnguistate', 'seed', 'deck', 'cdeck', 'nextmarket',
  'humanbids', 'sealedbids', 'sealedchoices', 'destinydraws', 'privatedestinydraws',
  'opponentbag', 'opponentbags', 'internalstate',
]);
const PHASES = Object.freeze({
  event: { schema: 'yaoshi.event-observation.v1', phase: 'event.sealedCommit' },
  mark: { schema: 'yaoshi.mark-observation.v1', phase: 'mark.preAuction' },
  sacrifice: { schema: 'yaoshi.sacrifice-observation.v1', phase: 'sacrifice.preAuction' },
  auction: { schema: 'yaoshi.auction-observation.v1', phase: 'auction.sealedCommit' },
  'shrine-pick': { schema: 'yaoshi.shrine-pick-observation.v1', phase: 'shrine.pickLegend' },
});

export function readFullRecallContractV7() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_V7_PATH, 'utf8'));
  if (contract.schema !== 'yaoshi.l1e.sixOfFour.modelContract.v7')
    throw new Error('unsupported six-of-four model contract version');
  return contract;
}

function isDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return true;
  if (seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value) && Object.values(value).every((child) => isDeepFrozen(child, seen));
}

function copyPlain(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint')
      throw new TypeError('full recall records must be JSON-safe');
    return value;
  }
  if (seen.has(value)) throw new TypeError('full recall records cannot contain cycles or aliases');
  const result = Array.isArray(value) ? [] : {};
  seen.set(value, result);
  if (Array.isArray(value)) {
    for (const child of value) result.push(copyPlain(child, seen));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
      throw new TypeError('full recall records must use plain objects');
    for (const key of Object.keys(value).sort()) result[key] = copyPlain(value[key], seen);
  }
  seen.delete(value);
  return result;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function findHiddenEngineKey(value, pathParts = [], seen = new WeakSet()) {
  if (!value || typeof value !== 'object') return null;
  if (seen.has(value)) return null;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (HIDDEN_ENGINE_KEYS.has(key.toLowerCase())) return [...pathParts, key].join('.');
    const nested = findHiddenEngineKey(child, [...pathParts, key], seen);
    if (nested) return nested;
  }
  return null;
}

function viewerOf(observation) {
  if (!Number.isInteger(observation?.viewerId) || !Number.isInteger(observation?.round))
    throw new TypeError('full recall requires a seat-scoped observation with an integer round');
  if (!isDeepFrozen(observation)) throw new TypeError('full recall requires immutable adapter observations');
  const hiddenKey = findHiddenEngineKey(observation);
  if (hiddenKey) throw new TypeError(`full recall observation contains hidden engine state at ${hiddenKey}`);
  copyPlain(observation);
  return observation.viewerId;
}

function validateObservation(phase, observation) {
  const descriptor = PHASES[phase];
  if (!descriptor || observation?.schema !== descriptor.schema || observation?.phase !== descriptor.phase)
    throw new TypeError('phase and observation schema do not match');
  return viewerOf(observation);
}

function exactChoiceAction(action) {
  return action && typeof action === 'object' && !Array.isArray(action) &&
    Object.keys(action).length === 1 && Object.hasOwn(action, 'choice');
}

function validateAction(phase, observation, action) {
  if (phase === 'auction') {
    const validated = appendAuctionDecision([], observation, action);
    return validated[0].action;
  }
  if (!exactChoiceAction(action)) throw new TypeError(`${phase} action must contain only a choice`);
  const choice = action.choice;
  if (phase === 'event') {
    appendEventDecision([], observation, choice);
  }
  if (phase === 'mark') {
    if (!(choice === null || Number.isInteger(choice) && choice >= 0 && choice < observation.market?.length))
      throw new RangeError('mark recall choice is not legal for this observation');
  } else if (phase === 'sacrifice') {
    if (!Array.isArray(observation.legalActions) || !observation.legalActions.includes(choice))
      throw new RangeError('sacrifice recall choice is not legal for this observation');
  } else if (phase === 'shrine-pick') {
    if (!observation.choices?.some((entry) => entry.index === choice))
      throw new RangeError('shrine recall choice is not legal for this observation');
  }
  return copyPlain(action);
}

function validateHistory(history, viewerId = null) {
  if (!Array.isArray(history)) throw new TypeError('full recall history must be an array');
  let owner = viewerId;
  for (const record of history) {
    if (record?.schema !== RECORD_SCHEMA || !Object.hasOwn(PHASES, record.phase) ||
        record.round !== record.observation?.round || record.viewerId !== record.observation?.viewerId)
      throw new TypeError('full recall history contains a malformed phase record');
    const recordViewer = validateObservation(record.phase, record.observation);
    if (recordViewer !== record.viewerId) throw new TypeError('full recall record viewer does not match its observation');
    if (owner === null) owner = recordViewer;
    if (recordViewer !== owner) throw new TypeError('full recall history must belong to the same viewer');
    const normalized = validateAction(record.phase, record.observation, record.action);
    if (JSON.stringify(normalized) !== JSON.stringify(record.action))
      throw new TypeError('full recall history action is not in canonical form');
  }
  return owner;
}

export function appendFullRecallDecision(history, phase, observation, action) {
  const viewerId = validateObservation(phase, observation);
  const owner = validateHistory(history, viewerId);
  if (owner !== viewerId) throw new TypeError('full recall history must belong to the same viewer');
  const normalizedAction = validateAction(phase, observation, action);
  const record = {
    schema: RECORD_SCHEMA,
    phase,
    round: observation.round,
    viewerId,
    observation: copyPlain(observation),
    action: copyPlain(normalizedAction),
  };
  return deepFreeze([...history.map((entry) => copyPlain(entry)), record]);
}

export function fullRecallInformationSetKey(history, currentObservation) {
  const viewerId = viewerOf(currentObservation);
  if (!Object.values(PHASES).some((descriptor) =>
    descriptor.schema === currentObservation.schema && descriptor.phase === currentObservation.phase))
    throw new TypeError('current observation schema is not supported by full recall');
  const owner = validateHistory(history, viewerId);
  if (owner !== null && owner !== viewerId) throw new TypeError('full recall history must belong to the same viewer');
  return stableStringify({
    schema: 'yaoshi.full-recall-information-set.v1',
    viewerId,
    history: copyPlain(history),
    currentObservation: copyPlain(currentObservation),
  });
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

export function fullRecallAdapterStatus() {
  return {
    history: 'partial',
    phases: Object.keys(PHASES),
    requiresImmutableProjectedObservations: true,
    provesObservationRedaction: false,
    completeDecisionTree: false,
  };
}

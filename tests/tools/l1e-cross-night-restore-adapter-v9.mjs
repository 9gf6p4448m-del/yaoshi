import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './load.mjs';
import { verifyPinnedProductSource } from './l1e-destiny-adapter-fixtures.mjs';
import { canonicalCheckpoint } from './l1-destiny-focus.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRODUCT = path.join(ROOT, 'index.html');
const CONTRACT_PATH = path.join(ROOT, 'docs/experiments/2026-09-23-destiny/model-contract-v9.json');
const ADAPTER_PATH = fileURLToPath(import.meta.url);
const FIXTURE_PATH = path.join(ROOT, 'tests/l1e-cross-night-restore-v9.test.mjs');
const PRODUCT_PIN = Object.freeze({
  commit: 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a',
  gitBlobOid: '8ba772b9d960eff8b9c42eac77040433f809c57d',
  sha256: '8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d',
});
const DESTINY_IDS = Object.freeze(['water', 'eyes', 'twinTiger', 'bloodOath', 'godKing', 'eternalFlame']);
const SNAPSHOT_SCHEMA = 'yaoshi.cross-night-snapshot.v9';
const BOUNDARY_KINDS = new Set([
  'afterNightResolution.beforeNextRound',
  'afterNextRoundMarketSchedule.beforeBeginRound',
]);
const ENGINE_METADATA = new WeakMap();
const STATE_ENGINE = new WeakMap();
const SNAPSHOT_METADATA = new WeakMap();
const VERIFIED_BOUNDARIES = new WeakMap();
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

export function readCrossNightContractV9() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  if (contract.schema !== 'yaoshi.l1e.sixOfFour.modelContract.v9')
    throw new Error('unsupported cross-night restore contract version');
  return contract;
}

function requireSingleMatch(sourceText, pattern, label, replacement) {
  const matches = [...sourceText.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`v9 source instrumentation anchor mismatch: ${label}`);
  return sourceText.replace(pattern, replacement);
}

function instrumentPinnedSourceV9(sourceText) {
  let source = sourceText;
  source = requireSingleMatch(source,
    /function mulberry32\(a\)\{\r?\n  return function\(\)\{/g,
    'mulberry32 opening', 'function mulberry32(a){\n  const rng=function(){');
  source = requireSingleMatch(source,
    /  \};\r?\n\}\r?\n(const rnd=\(a,b\)=>)/g,
    'mulberry32 closing', (_match, following) =>
      `  };\n  rng.getState=()=>a>>>0;\n  rng.setState=value=>{a=value|0;};\n  return rng;\n}\n${following}`);
  source = requireSingleMatch(source,
    /window\.__yaoshi=\{ newGame,/g,
    'test API export', 'window.__yaoshi={ nextRound, newGame,');
  source = requireSingleMatch(source,
    /S\.round\+\+;S\.market=S\.nextMarket;S\.nextMarket=drawMarketFor\(S\.round\+1\);\r?\n  beginRound\(\);/g,
    'nextRound market schedule',
    'S.round++;S.market=S.nextMarket;S.nextMarket=drawMarketFor(S.round+1);\n'
      + '  storage.__modelV9AfterRoundAdvance?.(S);\n  beginRound();');
  source = requireSingleMatch(source,
    /    lifeByRound\.push\(S\.players\.map\(p=>p\.life\)\);\r?\n    const aliveN=S\.players\.filter\(p=>p\.alive\)\.length;/g,
    'playPolicyGame night boundary',
    '    lifeByRound.push(S.players.map(p=>p.life));\n'
      + '    storage.__modelV9NightBoundary?.(S,{seed,previousReveal,deathRound,factionWinCounts,factionOffered,'
      + 'poisonBids,totalBids,unsoldItems,drawnItems,ruleFired,ruleStat,markStat,legendDuel,plainDuel,'
      + 'lifeByRound,destinyNights,policyInformation});\n'
      + '    const aliveN=S.players.filter(p=>p.alive).length;');
  return source;
}

function cloneMutableGraph(value, seen = new WeakMap()) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return value;
  if (typeof value === 'function') return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Set) {
    const copy = new Set();
    seen.set(value, copy);
    for (const entry of value) copy.add(cloneMutableGraph(entry, seen));
    return copy;
  }
  if (Array.isArray(value)) {
    const copy = [];
    seen.set(value, copy);
    for (const key of Reflect.ownKeys(value)) {
      if (key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, 'value'))
        throw new TypeError('cross-night snapshots cannot capture accessor properties');
      Object.defineProperty(copy, key, {
        value: cloneMutableGraph(descriptor.value, seen),
        enumerable: descriptor.enumerable,
        writable: true,
        configurable: true,
      });
    }
    return copy;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    throw new TypeError(`unsupported snapshot object: ${prototype?.constructor?.name ?? 'null prototype'}`);
  const copy = Object.create(prototype);
  seen.set(value, copy);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value'))
      throw new TypeError('cross-night snapshots cannot capture accessor properties');
    Object.defineProperty(copy, key, {
      value: cloneMutableGraph(descriptor.value, seen),
      enumerable: descriptor.enumerable,
      writable: true,
      configurable: true,
    });
  }
  return copy;
}

function assertNoFunctions(value, seen = new WeakSet()) {
  if (typeof value === 'function') throw new TypeError('snapshot payload cannot retain engine functions');
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (value instanceof Set) {
    for (const entry of value) assertNoFunctions(entry, seen);
  }
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, 'value')) assertNoFunctions(descriptor.value, seen);
  }
}

function deepFreezeGraph(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  if (value instanceof Set) {
    for (const entry of value) deepFreezeGraph(entry, seen);
  }
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, 'value')) deepFreezeGraph(descriptor.value, seen);
  }
  return Object.freeze(value);
}

function streamMarker(state) {
  const marker = function snapshotStreamMarker() {};
  marker.getState = () => state;
  return marker;
}

function digestSnapshot(snapshot) {
  const state = cloneMutableGraph(snapshot.state);
  state.rng = streamMarker(snapshot.rng.gameplay);
  state.rngUi = streamMarker(snapshot.rng.ui);
  const runnerFrame = {
    schema: snapshot.schema,
    source: snapshot.source,
    provenance: snapshot.provenance,
    boundary: snapshot.boundary,
    runnerContext: snapshot.runnerContext,
  };
  return hash(Buffer.from(canonicalCheckpoint(state, null, runnerFrame), 'utf8'));
}

function engineMetadata(engine) {
  const metadata = ENGINE_METADATA.get(engine);
  if (!metadata) throw new TypeError('a registered v9 pinned engine is required');
  return metadata;
}

function registerState(engine, state) {
  if (!state || typeof state !== 'object' || state !== engine.G.S)
    throw new TypeError('state root does not belong to the registered v9 engine');
  STATE_ENGINE.set(state, engine.G);
}

function assertOwnedCurrentState(engine, state) {
  const metadata = engineMetadata(engine);
  if (state !== metadata.G.S || STATE_ENGINE.get(state) !== metadata.G)
    throw new TypeError('snapshot requires the registered pinned engine state root');
  return metadata;
}

function validateRunnerContext(context) {
  const clone = cloneMutableGraph(context);
  assertNoFunctions(clone);
  if (!clone || typeof clone !== 'object' || Array.isArray(clone) ||
      clone.policyInformation !== true || !Array.isArray(clone.lifeByRound))
    throw new TypeError('cross-night runner context is incomplete');
  return clone;
}

function buildSnapshot(engine, state, runnerContext, boundaryKind) {
  const metadata = assertOwnedCurrentState(engine, state);
  if (!BOUNDARY_KINDS.has(boundaryKind)) throw new TypeError('unsupported cross-night snapshot boundary');
  if (state.mode !== 'solo' || !Array.isArray(state.players) || state.players.length !== 4 ||
      !Number.isInteger(state.round) || state.round < 1)
    throw new TypeError('v9 snapshot supports four-seat solo state roots only');
  if (typeof state.rng?.getState !== 'function' || typeof state.rng?.setState !== 'function' ||
      typeof state.rngUi?.getState !== 'function' || typeof state.rngUi?.setState !== 'function')
    throw new TypeError('instrumented gameplay and UI RNG streams are required');
  const gameplayState = state.rng.getState();
  const uiState = state.rngUi.getState();
  if (!Number.isInteger(gameplayState) || gameplayState < 0 || gameplayState > 0xffffffff ||
      !Number.isInteger(uiState) || uiState < 0 || uiState > 0xffffffff)
    throw new TypeError('instrumented RNG states must be unsigned 32-bit integers');

  const stateCopy = cloneMutableGraph(state);
  delete stateCopy.rng;
  delete stateCopy.rngUi;
  assertNoFunctions(stateCopy);
  const runnerCopy = validateRunnerContext(runnerContext);
  const snapshot = {
    schema: SNAPSHOT_SCHEMA,
    source: { ...metadata.source },
    provenance: { ...metadata.provenance },
    boundary: { kind: boundaryKind, round: state.round },
    state: stateCopy,
    rng: { gameplay: gameplayState >>> 0, ui: uiState >>> 0 },
    runnerContext: runnerCopy,
    digest: '',
  };
  snapshot.digest = digestSnapshot(snapshot);
  SNAPSHOT_METADATA.set(snapshot, { sourceSha256: metadata.source.sha256 });
  return deepFreezeGraph(snapshot);
}

function assertValidSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || snapshot.schema !== SNAPSHOT_SCHEMA ||
      !SNAPSHOT_METADATA.has(snapshot))
    throw new TypeError('a snapshot produced by the v9 pinned adapter is required');
  const source = snapshot.source;
  const provenance = SNAPSHOT_METADATA.get(snapshot);
  if (source?.commit !== PRODUCT_PIN.commit || source?.gitBlobOid !== PRODUCT_PIN.gitBlobOid ||
      source?.sha256 !== PRODUCT_PIN.sha256 || provenance.sourceSha256 !== PRODUCT_PIN.sha256)
    throw new Error('cross-night snapshot source pin mismatch');
  if (!BOUNDARY_KINDS.has(snapshot.boundary?.kind) || snapshot.boundary.round !== snapshot.state?.round ||
      !Number.isInteger(snapshot.rng?.gameplay) || !Number.isInteger(snapshot.rng?.ui))
    throw new TypeError('cross-night snapshot envelope is invalid');
  assertNoFunctions(snapshot.state);
  assertNoFunctions(snapshot.runnerContext);
  if (digestSnapshot(snapshot) !== snapshot.digest)
    throw new Error('cross-night snapshot integrity check failed');
  return snapshot;
}

export function captureCrossNightSnapshotV9(engine, state, runnerContext, {
  boundaryKind = 'afterNightResolution.beforeNextRound',
} = {}) {
  const metadata = assertOwnedCurrentState(engine, state);
  const ticket = VERIFIED_BOUNDARIES.get(state);
  if (!ticket || ticket.engine !== metadata.G || ticket.kind !== boundaryKind)
    throw new TypeError('snapshot capture requires a fresh boundary from the pinned engine');
  VERIFIED_BOUNDARIES.delete(state);
  return buildSnapshot(engine, state, runnerContext, boundaryKind);
}

export function loadCrossNightRestoreEngineV9() {
  const contract = readCrossNightContractV9();
  const pinned = verifyPinnedProductSource();
  if (contract.previousContract?.schema !== 'yaoshi.l1e.sixOfFour.modelContract.v8' ||
      contract.source?.commit !== PRODUCT_PIN.commit || contract.source?.gitBlobOid !== PRODUCT_PIN.gitBlobOid ||
      contract.source?.sha256 !== PRODUCT_PIN.sha256 || pinned.commit !== PRODUCT_PIN.commit ||
      pinned.blobOid !== PRODUCT_PIN.gitBlobOid || pinned.sha256 !== PRODUCT_PIN.sha256)
    throw new Error('v9 frozen product source verification failed');

  const storage = { getItem() { return null; }, setItem() {} };
  const instrumentedSource = instrumentPinnedSourceV9(pinned.sourceText);
  const G = loadGame(PRODUCT, { sourceText: instrumentedSource, storage });
  const provenance = Object.freeze({
    sourceCommit: pinned.commit,
    sourceBlobOid: pinned.blobOid,
    sourceSha256: pinned.sha256,
    adapterSha256: hash(fs.readFileSync(ADAPTER_PATH)),
    fixtureSha256: hash(fs.readFileSync(FIXTURE_PATH)),
    instrumentedSourceSha256: hash(Buffer.from(instrumentedSource, 'utf8')),
  });
  const engine = Object.freeze({ G, storage, provenance, source: Object.freeze({ ...PRODUCT_PIN }) });
  ENGINE_METADATA.set(engine, { G, storage, provenance, source: engine.source });
  const originalMakeState = G.makeState;
  G.makeState = (...args) => {
    const state = originalMakeState(...args);
    registerState(engine, state);
    return state;
  };
  return engine;
}

export function runToFirstNightBoundaryV9(engine, {
  seed,
  picks = ['qingmian'],
  privateDestinyDraws,
  policyInformation = true,
  trueEffects = 'off',
  destinyAiChase = false,
  recordDestinyEvidence = false,
  policyProfileId = 'engine-default',
} = {}) {
  const metadata = engineMetadata(engine);
  if (!Number.isInteger(seed) || !Array.isArray(privateDestinyDraws) ||
      privateDestinyDraws.length !== 4 || privateDestinyDraws.some((id) => !DESTINY_IDS.includes(id)))
    throw new TypeError('a fixed seed and four explicit private destiny draws are required');
  if (policyInformation !== true || typeof policyProfileId !== 'string' || !policyProfileId ||
      trueEffects !== 'off' && !['original', 'candidate'].includes(trueEffects))
    throw new TypeError('v9 boundary fixture requires an identified information policy profile');

  let snapshot;
  const stop = Object.freeze({ stop: 'v9-first-night-boundary' });
  metadata.storage.__modelV9NightBoundary = (state, runnerFrame) => {
    registerState(engine, state);
    VERIFIED_BOUNDARIES.set(state, {
      engine: metadata.G,
      kind: 'afterNightResolution.beforeNextRound',
    });
    const runnerContext = {
      ...runnerFrame,
      policyInformation,
      policyProfileId,
      trueEffects,
      destinyAiChase: destinyAiChase === true,
      recordDestinyEvidence: recordDestinyEvidence === true,
    };
    snapshot = captureCrossNightSnapshotV9(engine, state, runnerContext);
    throw stop;
  };
  try {
    metadata.G.playPolicyGame(seed, {}, picks, {
      privateDestinyDraws,
      policyInformation,
      trueEffects,
      destinyAiChase,
      recordDestinyEvidence,
    });
  } catch (error) {
    if (error !== stop) throw error;
  } finally {
    delete metadata.storage.__modelV9NightBoundary;
  }
  if (!snapshot) throw new Error('the frozen engine did not reach the first resolved-night boundary');
  return snapshot;
}

function installRestoredRoot(target, restored) {
  for (const key of Reflect.ownKeys(target)) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (!descriptor?.configurable) throw new TypeError('engine state root contains a non-configurable field');
    delete target[key];
  }
  for (const key of Reflect.ownKeys(restored))
    Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(restored, key));
}

function cloneStateRootForRestore(snapshotState, target) {
  const prototype = Object.getPrototypeOf(snapshotState);
  if (prototype !== Object.prototype && prototype !== null)
    throw new TypeError('snapshot state root must be a plain object');
  const restored = Object.create(prototype);
  const seen = new WeakMap([[snapshotState, target]]);
  for (const key of Reflect.ownKeys(snapshotState)) {
    const descriptor = Object.getOwnPropertyDescriptor(snapshotState, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value'))
      throw new TypeError('cross-night snapshots cannot capture accessor properties');
    Object.defineProperty(restored, key, {
      value: cloneMutableGraph(descriptor.value, seen),
      enumerable: descriptor.enumerable,
      writable: true,
      configurable: true,
    });
  }
  return restored;
}

export function restoreCrossNightSnapshotV9(engine, inputSnapshot) {
  const metadata = engineMetadata(engine);
  const snapshot = assertValidSnapshot(inputSnapshot);
  if (metadata.provenance.sourceSha256 !== snapshot.provenance.sourceSha256 ||
      metadata.provenance.instrumentedSourceSha256 !== snapshot.provenance.instrumentedSourceSha256)
    throw new Error('snapshot instrumented engine source does not match the restore engine');

  const snapshotState = snapshot.state;
  const picks = snapshotState.players.filter((player) => !player.ai)
    .sort((left, right) => left.id - right.id)
    .map((player) => player.roleId);
  const target = metadata.G.makeState('solo', snapshotState.seed, picks,
    snapshotState.players.map((player) => player.destiny),
    snapshotState.destinyEffectMode || 'off', snapshotState.destinyAiChase === true);
  const gameplayRng = target.rng;
  const uiRng = target.rngUi;
  const restored = cloneStateRootForRestore(snapshotState, target);
  restored.rng = gameplayRng;
  restored.rngUi = uiRng;
  installRestoredRoot(target, restored);
  gameplayRng.setState(snapshot.rng.gameplay | 0);
  uiRng.setState(snapshot.rng.ui | 0);
  registerState(engine, target);
  return {
    state: target,
    runnerContext: cloneMutableGraph(snapshot.runnerContext),
    snapshot,
  };
}

export function assertCrossNightSnapshotCurrentV9(engine, inputSnapshot) {
  const metadata = engineMetadata(engine);
  const snapshot = assertValidSnapshot(inputSnapshot);
  const current = buildSnapshot(engine, metadata.G.S,
    snapshot.runnerContext, snapshot.boundary.kind);
  if (current.digest !== snapshot.digest)
    throw new Error('current pinned engine state differs from the supplied cross-night snapshot');
  return true;
}

export function advanceNextRoundMarketV9(engine, inputSnapshot) {
  const metadata = engineMetadata(engine);
  const snapshot = assertValidSnapshot(inputSnapshot);
  assertCrossNightSnapshotCurrentV9(engine, snapshot);
  if (snapshot.boundary.kind !== 'afterNightResolution.beforeNextRound')
    throw new TypeError('next-round market advance requires a resolved-night boundary');
  let nextSnapshot;
  const stop = Object.freeze({ stop: 'v9-after-next-round-market' });
  metadata.storage.__modelV9AfterRoundAdvance = (state) => {
    registerState(engine, state);
    VERIFIED_BOUNDARIES.set(state, {
      engine: metadata.G,
      kind: 'afterNextRoundMarketSchedule.beforeBeginRound',
    });
    nextSnapshot = captureCrossNightSnapshotV9(engine, state, snapshot.runnerContext, {
      boundaryKind: 'afterNextRoundMarketSchedule.beforeBeginRound',
    });
    throw stop;
  };
  try {
    metadata.G.nextRound();
  } catch (error) {
    if (error !== stop) throw error;
  } finally {
    delete metadata.storage.__modelV9AfterRoundAdvance;
  }
  if (!nextSnapshot) throw new Error('the frozen nextRound did not reach its market-schedule boundary');
  return nextSnapshot;
}

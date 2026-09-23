import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadGame } from './load.mjs';
import { canonicalCheckpoint } from './l1-destiny-focus.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRODUCT = path.join(ROOT, 'index.html');
const CONTRACT_PATH = path.join(ROOT, 'docs/experiments/2026-09-23-destiny/model-contract-v2.json');
const FIXTURE_PATH = path.join(ROOT, 'tests/l1e-destiny-adapter-fixtures.test.mjs');
const EXPECTED_SOURCE_COMMIT = 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a';
const EXPECTED_SOURCE_BLOB = '8ba772b9d960eff8b9c42eac77040433f809c57d';
const EXPECTED_SOURCE_SHA256 = '8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d';
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

export function readModelContractV2() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  if (contract.schema !== 'yaoshi.l1e.sixOfFour.modelContract.v2')
    throw new Error('unsupported six-of-four model contract version');
  return contract;
}

function gitBlobOid(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
}

export function verifyPinnedProductSource() {
  const contract = readModelContractV2();
  const pin = contract.source;
  if (pin?.commit !== EXPECTED_SOURCE_COMMIT || pin?.gitBlobOid !== EXPECTED_SOURCE_BLOB ||
      pin?.sha256 !== EXPECTED_SOURCE_SHA256)
    throw new Error('v2 source pin differs from the reviewed product baseline');

  const sourceBytes = execFileSync('git', ['show', `${pin.commit}:index.html`], {
    cwd: ROOT,
    maxBuffer: 16 * 1024 * 1024,
  });
  const sourceText = sourceBytes.toString('utf8');
  const sourceSha256 = hash(sourceBytes);
  const blobOid = gitBlobOid(sourceBytes);
  if (sourceSha256 !== pin.sha256 || blobOid !== pin.gitBlobOid)
    throw new Error('pinned product source hash or Git blob does not match the v2 contract');

  const diff = spawnSync('git', ['diff', '--quiet', pin.commit, '--', 'index.html'], { cwd: ROOT });
  if (diff.error) throw diff.error;
  if (diff.status !== 0)
    throw new Error('worktree index.html differs from the product source pinned by the v2 contract');

  return {
    commit: pin.commit,
    blobOid,
    sha256: sourceSha256,
    sourceText,
    currentWorktreeMatches: true,
  };
}

function instrumentGameplayRng(sourceText) {
  const opening = /function mulberry32\(a\)\{\r?\n  return function\(\)\{/g;
  const ending = /  \};\r?\n\}\r?\n(const rnd=\(a,b\)=>)/g;
  if ((sourceText.match(opening) || []).length !== 1 || (sourceText.match(ending) || []).length !== 1)
    throw new Error('mulberry32 instrumentation anchor mismatch');
  return sourceText
    .replace(opening, 'function mulberry32(a){\n  const rng=function(){')
    .replace(ending, '  };\n  rng.getState=()=>a>>>0;\n  rng.setState=value=>{a=value|0;};\n  return rng;\n}\n$1');
}

export function loadPinnedFixtureEngine() {
  const pinned = verifyPinnedProductSource();
  const instrumentedSource = instrumentGameplayRng(pinned.sourceText);
  const G = loadGame(PRODUCT, { sourceText: instrumentedSource });
  return {
    G,
    provenance: {
      sourceCommit: pinned.commit,
      sourceBlobOid: pinned.blobOid,
      sourceSha256: pinned.sha256,
      adapterSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
      fixtureSha256: hash(fs.readFileSync(FIXTURE_PATH)),
      instrumentedSourceSha256: hash(Buffer.from(instrumentedSource, 'utf8')),
    },
  };
}

function cloneGraph(value, seen = new WeakMap()) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return value;
  if (typeof value === 'function') return value;
  if (seen.has(value)) return seen.get(value);

  if (value instanceof Date) {
    const copy = new Date(value.getTime());
    seen.set(value, copy);
    return copy;
  }
  if (value instanceof Set) {
    const copy = new Set();
    seen.set(value, copy);
    for (const entry of value) copy.add(cloneGraph(entry, seen));
    return copy;
  }
  if (value instanceof Map) {
    const copy = new Map();
    seen.set(value, copy);
    for (const [key, entry] of value) copy.set(cloneGraph(key, seen), cloneGraph(entry, seen));
    return copy;
  }
  if (Array.isArray(value)) {
    const copy = [];
    seen.set(value, copy);
    for (const key of Reflect.ownKeys(value)) {
      if (key === 'length') continue;
      Object.defineProperty(copy, key, cloneDescriptor(Object.getOwnPropertyDescriptor(value, key), seen));
    }
    return copy;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    throw new TypeError(`unsupported engine-state object: ${prototype?.constructor?.name ?? 'null prototype'}`);
  const copy = Object.create(prototype);
  seen.set(value, copy);
  for (const key of Reflect.ownKeys(value))
    Object.defineProperty(copy, key, cloneDescriptor(Object.getOwnPropertyDescriptor(value, key), seen));
  return copy;
}

function cloneDescriptor(descriptor, seen) {
  if (!descriptor) throw new TypeError('engine-state property descriptor is missing');
  if (Object.hasOwn(descriptor, 'value')) descriptor.value = cloneGraph(descriptor.value, seen);
  return descriptor;
}

export function canonicalStateCheckpoint(state) {
  return canonicalCheckpoint(state, null, null);
}

export function captureGameStateSnapshot(state) {
  if (!state || typeof state !== 'object' ||
      typeof state.rng?.getState !== 'function' || typeof state.rng?.setState !== 'function' ||
      typeof state.rngUi?.getState !== 'function' || typeof state.rngUi?.setState !== 'function')
    throw new TypeError('instrumented gameplay and UI RNG state is required');
  return {
    schema: 'yaoshi.engine-state-snapshot.v1',
    state: cloneGraph(state),
    rngRef: state.rng,
    rngUiRef: state.rngUi,
    rngState: state.rng.getState(),
    rngUiState: state.rngUi.getState(),
  };
}

export function restoreGameStateSnapshot(target, snapshot) {
  if (!target || typeof target !== 'object' || snapshot?.schema !== 'yaoshi.engine-state-snapshot.v1')
    throw new TypeError('a compatible engine-state snapshot is required');
  if (target.rng !== snapshot.rngRef || target.rngUi !== snapshot.rngUiRef)
    throw new Error('snapshot belongs to a different engine state or RNG stream');

  const restored = cloneGraph(snapshot.state);
  for (const key of Reflect.ownKeys(target)) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (!descriptor?.configurable) throw new TypeError('engine-state root contains a non-configurable property');
    delete target[key];
  }
  for (const key of Reflect.ownKeys(restored))
    Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(restored, key));
  target.rng.setState(snapshot.rngState);
  target.rngUi.setState(snapshot.rngUiState);
  return target;
}

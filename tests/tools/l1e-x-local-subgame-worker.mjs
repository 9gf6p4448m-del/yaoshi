/* X 甲口徑 worker：每個 worker 各自載入凍結引擎、以種子重建局面（核對 canonical hash），再結算一段組合。
   突變（僅 §7.1 正對照）只在局面重建「之後」裝上：重建永遠走原樣引擎，局面才與主執行緒相同。 */
import { parentPort, workerData } from 'node:worker_threads';
import { loadPinnedFixtureEngine, captureGameStateSnapshot } from './l1e-destiny-adapter-fixtures.mjs';
import {
  applyMutation, buildGrid, computeRange, readPrivateDraws, reconstructState, stateHash,
} from './l1e-x-local-subgame.mjs';

const ZERO_KEYS = ['flags', 'traits', 'hooks', 'army'];
const { G } = loadPinnedFixtureEngine();
const draws = readPrivateDraws(workerData.drawsPath);
const mutation = workerData.mutation || null;
let fields = null; // { pristine, mutated } descriptors of the mutated chain
const cache = new Map();

const capture = (chain) => Object.fromEntries(ZERO_KEYS.filter((k) => Object.hasOwn(chain, k))
  .map((k) => [k, Object.getOwnPropertyDescriptor(chain, k)]));
const install = (chain, descriptors) => {
  for (const k of ZERO_KEYS) delete chain[k];
  for (const [k, d] of Object.entries(descriptors)) Object.defineProperty(chain, k, d);
};

async function prepareMutation() {
  if (!mutation || fields) return;
  const chain = G.CHAINS[mutation.chain];
  const pristine = capture(chain);
  await applyMutation(G, mutation, mutation.chain);
  fields = { chain, pristine, mutated: capture(chain) };
  install(chain, pristine);
}

function stateFor(spec) {
  const key = `${spec.setting}|${spec.seed}|${spec.round}|${spec.xSlot}|${spec.ySlot}`;
  if (cache.has(key)) return cache.get(key);
  cache.clear();
  if (fields) install(fields.chain, fields.pristine);
  const S = reconstructState(G, { setting: spec.setting, seed: spec.seed, round: spec.round, draws: draws.map.get(spec.seed) });
  const hash = stateHash(S);
  if (spec.hash && hash !== spec.hash) throw new Error(`worker reconstruction hash mismatch for seed ${spec.seed} night ${spec.round}`);
  const entry = { S, snapshot: captureGameStateSnapshot(S), grid: buildGrid(G, S, spec.xSlot, spec.ySlot) };
  if (fields) install(fields.chain, fields.mutated);
  cache.set(key, entry);
  return entry;
}

let queue = Promise.resolve();
parentPort.on('message', (job) => {
  queue = queue.then(async () => {
    try {
      await prepareMutation();
      const { S, snapshot, grid } = stateFor(job.stateSpec);
      const results = {};
      const transfer = [];
      for (const variant of job.variants) {
        const r = computeRange(G, S, snapshot, grid, job.stateSpec, variant, job.start, job.end);
        results[variant] = { deltas: r.deltas.buffer, wins: r.wins.buffer };
        transfer.push(r.deltas.buffer, r.wins.buffer);
      }
      parentPort.postMessage({ id: job.id, results }, transfer);
    } catch (error) {
      parentPort.postMessage({ id: job.id, error: String(error?.stack || error) });
    }
  });
});

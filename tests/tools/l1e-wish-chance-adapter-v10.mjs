import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONTRACT_PATH = path.join(ROOT, 'docs/experiments/2026-09-23-destiny/model-contract-v10.json');

export function readWishChanceContractV10() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  if (contract.schema !== 'yaoshi.l1e.sixOfFour.modelContract.v10')
    throw new Error('unsupported wish chance contract version');
  return contract;
}

export function loadWishChanceEngineV10() {
  throw new Error('wish chance v10 is not implemented');
}

export function buildWishChanceNodeV10() {
  throw new Error('wish chance v10 is not implemented');
}

export function* enumerateWishProfilesV10() {
  throw new Error('wish chance v10 is not implemented');
}

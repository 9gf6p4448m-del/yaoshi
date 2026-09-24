/* X 甲口徑：逐鏈單夜子賽局窮舉（凍結驗收：docs/experiments/2026-09-24-x-local-subgame/acceptance.md，commit f6ded37）。
   本檔只做「局面重建、網格、收益表、判定彙整」；支配與 freeLunch 一律交給凍結引擎的 analyzeEvent。
   不改 index.html、不改 v2–v11 adapter：只 import 它們既有的出口。 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { loadGame } from './load.mjs';
import {
  loadPinnedFixtureEngine, verifyPinnedProductSource, captureGameStateSnapshot, restoreGameStateSnapshot,
  canonicalStateCheckpoint,
} from './l1e-destiny-adapter-fixtures.mjs';
import { applyAutomaticNightSettlement } from './l1e-battle-settlement-adapter.mjs';
import { enumerateLegalAuctionSubmissions } from './l1e-auction-action-adapter.mjs';
import { createChaser } from './l1-balance.mjs';
import { createEyesPolicy } from './l1-information.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../..');
export const EXPERIMENT_DIR = path.join(ROOT, 'docs/experiments/2026-09-24-x-local-subgame');
export const SCRATCH_DIR = path.join(ROOT, 'scratchpad/x-local-subgame');
const ACCEPTANCE_PATH = path.join(EXPERIMENT_DIR, 'acceptance.md');
const ARMS_PATH = path.join(ROOT, 'docs/experiments/2026-09-23-destiny/arms.json');
export const DEFAULT_DRAWS_PATH = path.join(ROOT, 'scratchpad/destiny-formal-v1/private-draws.json');
const WORKER_PATH = path.join(HERE, 'l1e-x-local-subgame-worker.mjs');

export const PINNED_PRODUCT_SHA256 = '8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d';
export const PINNED_PRODUCT_COMMIT = 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a';
export const ACCEPTANCE_SHA256 = 'd63cd2dda4e0216f5d74ff583cd2931f00b75d8e806528e107c928b46843d6b2';

export const CHAIN_IDS = Object.freeze(['water', 'eyes', 'twinTiger', 'bloodOath', 'godKing', 'eternalFlame']);
export const FAMILIES = Object.freeze(['ordinary', 'destiny']);
export const ARMS = Object.freeze(FAMILIES.flatMap((family) => CHAIN_IDS.map((chain) => `${family}:${chain}`)));
export const WINDOWS = Object.freeze([
  { id: 'early', from: 1, to: 4 }, { id: 'mid', from: 5, to: 8 }, { id: 'late', from: 9, to: 12 },
]);
export const STATE_SEED_START = 10001;
export const STATE_SEED_END = 12000;
export const VALUATION_SEED_START = 30001;
export const VALUATION_SEED_END = 32000;
export const MIN_VALUATION_SAMPLES = 30;
export const MULTIPLIERS = Object.freeze([0.5, 1, 1.5]);
export const PLAYERS = 4;

export const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
export const fileSha256 = (file) => sha256(fs.readFileSync(file));

/* ---------------- 來源核對（§1：hash 不符就拒跑） ---------------- */
export function assertSourceHash(actualSha256, expectedSha256 = PINNED_PRODUCT_SHA256) {
  if (actualSha256 !== expectedSha256)
    throw new Error(`source hash mismatch: expected ${expectedSha256}, got ${actualSha256}; refusing to run`);
  return true;
}

export function preflight({ expectedProductSha256 = PINNED_PRODUCT_SHA256, expectedAcceptanceSha256 = ACCEPTANCE_SHA256,
  requireCleanWorktree = false } = {}) {
  const pinned = verifyPinnedProductSource();
  assertSourceHash(pinned.sha256, expectedProductSha256);
  const acceptanceSha256 = fileSha256(ACCEPTANCE_PATH);
  if (acceptanceSha256 !== expectedAcceptanceSha256)
    throw new Error(`acceptance hash mismatch: expected ${expectedAcceptanceSha256}, got ${acceptanceSha256}; refusing to run`);
  let clean = null;
  if (requireCleanWorktree) {
    /* 只看已追蹤檔：.agents/ 與 scratchpad/ 是永不提交的本機目錄 */
    const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: ROOT }).toString();
    clean = status.trim() === '';
    if (!clean) throw new Error(`worktree has tracked modifications; refusing formal run:\n${status}`);
  }
  return {
    sourceCommit: pinned.commit, sourceBlobOid: pinned.blobOid, sourceSha256: pinned.sha256,
    acceptanceSha256, armsSha256: fileSha256(ARMS_PATH), runnerSha256: fileSha256(fileURLToPath(import.meta.url)),
    workerSha256: fileSha256(WORKER_PATH), gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim(),
    trackedWorktreeClean: clean,
  };
}

/* ---------------- 網格（§4） ---------------- */
export const OPTION_LABELS = Object.freeze([
  'none',
  ...['X', 'Y'].flatMap((object) => ['cons', 'yaming'].flatMap((type) => [1, 2, 3, 4, 5].map((l) => `${object}:${type}:L${l}`))),
  ...[1, 2, 3, 4, 5].map((l) => `XY:cons:L${l}`),
]);
const LABEL_INDEX = new Map(OPTION_LABELS.map((label, index) => [label, index]));

export function gridLevels(c) {
  if (!Number.isInteger(c)) throw new TypeError('level cap must be an integer');
  return [1, Math.ceil(c / 4), Math.ceil(c / 2), Math.ceil((3 * c) / 4), c];
}

const emptyRow = () => ({ amt: 0, type: 'cons', intent: 'keep', target: null });
const bidRow = (amt, type) => ({ amt, type, intent: 'keep', target: null });

/* 回傳 seatSubs[pid][optionIndex] = bids 陣列（長度＝市場件數），以及每席的上限 */
export function buildGrid(G, S, xSlot, ySlot) {
  if (xSlot === ySlot) throw new Error('X and Y must be different market slots');
  return S.players.map((p) => {
    const budget = Math.max(0, Math.floor(G.budgetFor(p)));
    const caps = {
      cons: G.consCapFor(p),
      yamingX: budget - G.feeForBid(p, xSlot),
      yamingY: budget - G.feeForBid(p, ySlot),
    };
    const levels = { cons: gridLevels(caps.cons), yamingX: gridLevels(caps.yamingX), yamingY: gridLevels(caps.yamingY) };
    const subs = OPTION_LABELS.map((label) => {
      const bids = S.market.map(emptyRow);
      if (label === 'none') return bids;
      const [object, type, levelText] = label.split(':');
      const level = Number(levelText.slice(1)) - 1;
      if (object === 'XY') {
        bids[xSlot] = bidRow(levels.cons[level], 'cons');
        bids[ySlot] = bidRow(levels.cons[level], 'cons');
      } else {
        const slot = object === 'X' ? xSlot : ySlot;
        const amount = type === 'cons' ? levels.cons[level] : levels[object === 'X' ? 'yamingX' : 'yamingY'][level];
        bids[slot] = bidRow(amount, type);
      }
      return bids;
    });
    return { pid: p.id, caps, levels, subs };
  });
}

/* §3.4：26 個選項對四席都合法——以 enumerateLegalAuctionSubmissions（incense=0 的整段）核對 */
export function checkGridLegality(G, S, grid) {
  const illegal = [];
  for (const seat of grid) {
    const wanted = new Map(seat.subs.map((bids, index) => [JSON.stringify(bids), index]));
    for (const submission of enumerateLegalAuctionSubmissions(G, S, seat.pid)) {
      if (submission.incense !== 0) break;
      wanted.delete(JSON.stringify(submission.bids));
      if (!wanted.size) break;
    }
    for (const index of wanted.values()) illegal.push({ pid: seat.pid, option: OPTION_LABELS[index] });
  }
  return { legal: illegal.length === 0, illegal };
}

/* ---------------- 臂變體（§2） ---------------- */
const ZERO_KEYS = ['flags', 'traits', 'hooks', 'army'];
export function createChainToggle(G, chainId) {
  const chain = G.CHAINS[chainId];
  if (!chain) throw new Error(`unknown chain ${chainId}`);
  const saved = Object.fromEntries(ZERO_KEYS.filter((key) => Object.hasOwn(chain, key))
    .map((key) => [key, Object.getOwnPropertyDescriptor(chain, key)]));
  return {
    open() {
      for (const key of ZERO_KEYS) delete chain[key];
      for (const [key, descriptor] of Object.entries(saved)) Object.defineProperty(chain, key, descriptor);
    },
    zero() { for (const key of ZERO_KEYS) delete chain[key]; },
    saved,
  };
}

/* 突變模組（僅供 §7.1 正對照）：export default (G, chainId) => void，只改測試副本引擎的 CHAINS 項目 */
export async function applyMutation(G, mutation, chainId) {
  if (!mutation) return;
  const module = await import(pathToFileURL(path.resolve(mutation.module)).href);
  const install = module[mutation.export || 'default'];
  if (typeof install !== 'function') throw new Error('mutation module must export an install function');
  install(G, chainId);
}

/* ---------------- 局面重建（§3） ---------------- */
class StopAtNight extends Error {}

export function readPrivateDraws(file = DEFAULT_DRAWS_PATH) {
  const table = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (table?.schema !== 'yaoshi.destiny.private-draws.v1' || !Array.isArray(table.rows))
    throw new Error('invalid private draw table');
  const map = new Map(table.rows.map((row) => [row.seed, [...row.draws]]));
  return { map, sha256: fileSha256(file), file };
}

/* setting: 'h9-normal' | 'destiny-original-ai-off' | 'destiny-original-ai-on' */
export const GAME_SETTINGS = Object.freeze({
  'h9-normal': { picks: undefined, trueEffects: 'off', destinyAiChase: false, policy: 'scripted', policyInformation: false },
  'destiny-original-ai-off': { picks: ['qingmian'], trueEffects: 'original', destinyAiChase: false, policy: 'destiny-chaser-v1', policyInformation: true },
  'destiny-original-ai-on': { picks: ['qingmian'], trueEffects: 'original', destinyAiChase: true, policy: 'destiny-chaser-v1', policyInformation: true },
});

function seatPolicy(G, setting) {
  if (GAME_SETTINGS[setting].policy === 'scripted') return (p) => G.scriptedBids(p);
  const eyesPolicy = createEyesPolicy(G, 'informed');
  const chasers = Object.fromEntries(CHAIN_IDS.map((id) => [id, createChaser(G, id)]));
  return (p, ctx) => (p.destiny === 'eyes' ? eyesPolicy(p, ctx) : chasers[p.destiny](p, ctx));
}

/* 以 playPolicyGame 原樣重跑該種子；onNight(S) 在每夜「開標前、尚無任何提交」的那一刻被呼叫
   （座位 0 的策略呼叫點：S.humanBids 剛清空、異事與盯上已完成）。onNight 回傳 'stop' 即停在該刻。 */
export function playSeed(G, { setting, seed, draws, onNight }) {
  const cfg = GAME_SETTINGS[setting];
  if (!cfg) throw new Error(`unknown game setting ${setting}`);
  const base = seatPolicy(G, setting);
  const policy = (p, ctx) => {
    if (p.id === 0 && onNight && onNight(G.S) === 'stop') throw new StopAtNight();
    return base(p, ctx);
  };
  try {
    G.playPolicyGame(seed, { 0: policy }, cfg.picks, {
      trueEffects: cfg.trueEffects, destinyAiChase: cfg.destinyAiChase,
      privateDestinyDraws: draws, policyInformation: cfg.policyInformation,
    });
    return { stopped: false };
  } catch (error) {
    if (error instanceof StopAtNight) return { stopped: true };
    throw error;
  }
}

export function reconstructState(G, { setting, seed, round, draws }) {
  let reached = false;
  const result = playSeed(G, {
    setting, seed, draws,
    onNight: (S) => { if (S.round === round) { reached = true; return 'stop'; } return null; },
  });
  if (!result.stopped || !reached) throw new Error(`seed ${seed} never reached pre-auction of night ${round}`);
  const S = G.S;
  if (Object.keys(S.humanBids).length) throw new Error('reconstructed state already has submissions');
  return S;
}

export function stateHash(S) { return sha256(canonicalStateCheckpoint(S)); }

/* ---------------- 單格結算（§5） ---------------- */
export function settleCombo(G, S, snapshot, grid, idxs, prepare, xSlot, ySlot) {
  restoreGameStateSnapshot(S, snapshot);
  prepare(S);
  const life0 = S.players.map((p) => p.life);
  S.humanBids = {};
  S.incense = {};
  for (let k = 0; k < PLAYERS; k++) {
    S.humanBids[k] = grid[k].subs[idxs[k]].map((row) => ({ ...row }));
    S.incense[k] = null; /* 網格不含燒香：送出「不燒」，不讓引擎替任何席跑燒香啟發式 */
  }
  const savedAi = S.players.map((p) => p.ai);
  let reveal;
  S.players.forEach((p) => { p.ai = null; }); /* §4：四席均以 humanBids 提交，不走 aiBids */
  try { reveal = G.resolveAuction(); } finally { S.players.forEach((p, k) => { p.ai = savedAi[k]; }); }
  G.resolveShrines(); /* 引擎的夜序：開標後、夜戰前（三條迴圈同一位置） */
  applyAutomaticNightSettlement(G, S);
  const deltas = S.players.map((p, k) => p.life - life0[k]);
  const wins = S.players.map((p) => {
    let mask = 0;
    const wx = reveal[xSlot]?.winner, wy = reveal[ySlot]?.winner;
    if (wx && wx.p.id === p.id && wx.intent === 'keep' && !reveal[xSlot].it.curse) mask |= 1;
    if (wy && wy.p.id === p.id && wy.intent === 'keep' && !reveal[ySlot].it.curse) mask |= 2;
    return mask;
  });
  return { deltas, wins };
}

export function decodeCode(code) {
  const idxs = new Array(PLAYERS);
  let c = code;
  for (let k = 0; k < PLAYERS; k++) { idxs[k] = c % OPTION_LABELS.length; c = Math.floor(c / OPTION_LABELS.length); }
  return idxs;
}
export const TOTAL_COMBOS = OPTION_LABELS.length ** PLAYERS;

export function variantPreparer(G, { family, chain }, variant, toggle = null) {
  if (family === 'ordinary') {
    if (!toggle) throw new Error('ordinary variants need a chain toggle');
    return variant === 'open' ? () => toggle.open() : () => toggle.zero();
  }
  if (family === 'destiny') {
    const mode = variant === 'open' ? 'original' : 'off';
    return (S) => { S.destinyEffectMode = mode; };
  }
  throw new Error(`unknown family ${family}`);
}

/* 單執行緒版（worker 共用同一支）。進入時 CHAINS[chain] 必須是「開」的欄位；離開時還原成開。 */
export function computeRange(G, S, snapshot, grid, spec, variant, start, end) {
  const toggle = spec.family === 'ordinary' ? createChainToggle(G, spec.chain) : null;
  const prepare = variantPreparer(G, spec, variant, toggle);
  const n = end - start;
  const deltas = new Int16Array(n * PLAYERS);
  const wins = new Uint8Array(n * PLAYERS);
  try {
    for (let i = 0; i < n; i++) {
      const r = settleCombo(G, S, snapshot, grid, decodeCode(start + i), prepare, spec.xSlot, spec.ySlot);
      for (let k = 0; k < PLAYERS; k++) {
        if (r.deltas[k] < -32768 || r.deltas[k] > 32767) throw new RangeError('life delta outside Int16 range');
        deltas[i * PLAYERS + k] = r.deltas[k];
        wins[i * PLAYERS + k] = r.wins[k];
      }
    }
  } finally {
    if (toggle) toggle.open();
  }
  return { deltas, wins };
}

/* ---------------- worker pool ---------------- */
export class ComboPool {
  constructor({ workers = Math.max(1, Math.min(12, os.cpus().length - 2)), mutation = null, drawsPath = DEFAULT_DRAWS_PATH } = {}) {
    this.size = workers;
    this.workers = Array.from({ length: workers }, () => new Worker(WORKER_PATH, { workerData: { mutation, drawsPath } }));
    this.idle = [...this.workers];
    this.waiting = [];
    this.nextId = 1;
    this.pending = new Map();
    for (const worker of this.workers) {
      worker.on('message', (msg) => {
        const job = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        this.release(worker);
        if (msg.error) job.reject(new Error(msg.error)); else job.resolve(msg);
      });
      worker.on('error', (error) => { for (const job of this.pending.values()) job.reject(error); this.pending.clear(); });
    }
  }
  release(worker) { const next = this.waiting.shift(); if (next) next(worker); else this.idle.push(worker); }
  acquire() { const w = this.idle.pop(); return w ? Promise.resolve(w) : new Promise((resolve) => this.waiting.push(resolve)); }
  async run(job) {
    const worker = await this.acquire();
    const id = this.nextId++;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); worker.postMessage({ ...job, id }); });
  }
  async close() { await Promise.all(this.workers.map((w) => w.terminate())); }
}

/* stateSpec：{ arm, family, chain, setting, seed, round, xSlot, ySlot, hash } */
export async function computeTables(pool, stateSpec, { variants = ['open', 'zero'], chunk = 2000, stopOnDiff = null } = {}) {
  const out = Object.fromEntries(variants.map((v) => [v, { deltas: new Int16Array(TOTAL_COMBOS * PLAYERS), wins: new Uint8Array(TOTAL_COMBOS * PLAYERS) }]));
  let stop = false; let diffAt = null; let done = 0;
  const starts = [];
  for (let s = 0; s < TOTAL_COMBOS; s += chunk) starts.push(s);
  let cursor = 0;
  const lane = async () => {
    while (!stop && cursor < starts.length) {
      const start = starts[cursor++];
      const end = Math.min(TOTAL_COMBOS, start + chunk);
      const msg = await pool.run({ type: 'range', stateSpec, variants, start, end });
      for (const v of variants) {
        out[v].deltas.set(new Int16Array(msg.results[v].deltas), start * PLAYERS);
        out[v].wins.set(new Uint8Array(msg.results[v].wins), start * PLAYERS);
      }
      done += end - start;
      if (stopOnDiff) {
        const at = stopOnDiff(out, start, end);
        if (at !== null && (diffAt === null || at < diffAt)) { diffAt = at; stop = true; }
      }
    }
  };
  await Promise.all(Array.from({ length: pool.size }, lane));
  return { tables: out, complete: !stop && done === TOTAL_COMBOS, diffAt, combosEvaluated: done };
}

export function payoffAt(table, code, values, multiplier) {
  const out = new Array(PLAYERS);
  for (let k = 0; k < PLAYERS; k++) {
    const mask = table.wins[code * PLAYERS + k];
    out[k] = table.deltas[code * PLAYERS + k] + multiplier * ((mask & 1 ? values.x : 0) + (mask & 2 ? values.y : 0));
  }
  return out;
}

/* §3.5 活性：×1.0 估值下，開與歸零至少一格、至少一席不同 */
export function firstDifference(open, zero, values, start, end) {
  for (let code = start; code < end; code++) {
    const a = payoffAt(open, code, values, 1), b = payoffAt(zero, code, values, 1);
    for (let k = 0; k < PLAYERS; k++) if (a[k] !== b[k]) return code;
  }
  return null;
}

export async function checkLiveness(pool, stateSpec, values, { chunk = 2000 } = {}) {
  const r = await computeTables(pool, stateSpec, {
    chunk, stopOnDiff: (tables, start, end) => firstDifference(tables.open, tables.zero, values, start, end),
  });
  return { live: r.diffAt !== null, firstDiffCode: r.diffAt, combosEvaluated: r.combosEvaluated };
}

/* ---------------- 判定（§6：直接呼叫凍結 analyzeEvent） ---------------- */
function payoffFn(table, labels, values, multiplier) {
  const index = new Map(labels.map((label, i) => [label, i]));
  const n = labels.length;
  return (choices) => {
    let code = 0, base = 1;
    for (let k = 0; k < choices.length; k++) { code += index.get(choices[k]) * base; base *= n; }
    return payoffAt(table, code, values, multiplier);
  };
}

/* §9 修訂 1：ε-近似支配（ε＝1 命，事先固定）。最大遺憾＝max_k [max_B u_i(B,k) − u_i(A,k)]。
   payoffs：Float64Array(total*players)，組合編碼與 analyzeEvent 的 decodeCombo 相同（座位 0 為最低位）。 */
export const EPSILON = 1;
export function maxRegrets(payoffs, nOpts, players) {
  const total = nOpts ** players;
  if (payoffs.length !== total * players) throw new Error('payoff array size does not match the option grid');
  const out = Array.from({ length: players }, () => new Array(nOpts).fill(-Infinity));
  const row = new Float64Array(nOpts);
  for (let i = 0; i < players; i++) {
    const stride = nOpts ** i;
    for (let base = 0; base < total; base++) {
      if (Math.floor(base / stride) % nOpts !== 0) continue; /* 只走座位 i 選 0 的組合＝每個對手組合一次 */
      let best = -Infinity;
      for (let a = 0; a < nOpts; a++) { row[a] = payoffs[(base + a * stride) * players + i]; if (row[a] > best) best = row[a]; }
      for (let a = 0; a < nOpts; a++) { const r = best - row[a]; if (r > out[i][a]) out[i][a] = r; }
    }
  }
  return out;
}

export function payoffArrayFromFn(payoff, labels, players) {
  const n = labels.length, total = n ** players;
  const arr = new Float64Array(total * players);
  const choices = new Array(players);
  for (let code = 0; code < total; code++) {
    let c = code;
    for (let k = 0; k < players; k++) { choices[k] = labels[c % n]; c = Math.floor(c / n); }
    const r = payoff(choices);
    for (let k = 0; k < players; k++) arr[code * players + k] = r[k];
  }
  return arr;
}

export function approxDominant(regrets, labels, epsilon = EPSILON) {
  const out = [];
  regrets.forEach((row, player) => row.forEach((r, a) => { if (r <= epsilon) out.push({ player, option: labels[a], maxRegret: r }); }));
  return out;
}

export function minRegret(regrets, labels) {
  let best = null;
  regrets.forEach((row, player) => row.forEach((r, a) => {
    if (!best || r < best.maxRegret) best = { player, option: labels[a], maxRegret: r };
  }));
  return best;
}

function tablePayoffs(table, values, multiplier) {
  const arr = new Float64Array(table.deltas.length);
  for (let i = 0; i < arr.length; i++) {
    const mask = table.wins[i];
    arr[i] = table.deltas[i] + multiplier * ((mask & 1 ? values.x : 0) + (mask & 2 ? values.y : 0));
  }
  return arr;
}

export function judgeTables(G, { open, zero, values, labels = OPTION_LABELS, multipliers = MULTIPLIERS, players = PLAYERS,
  epsilon = EPSILON, exact = true }) {
  if (labels.length ** players * players !== open.deltas.length || open.deltas.length !== zero.deltas.length)
    throw new Error('payoff table size does not match the option grid');
  return multipliers.map((multiplier) => {
    const po = tablePayoffs(open, values, multiplier), pz = tablePayoffs(zero, values, multiplier);
    const ro = maxRegrets(po, labels.length, players), rz = maxRegrets(pz, labels.length, players);
    const ao = approxDominant(ro, labels, epsilon), az = approxDominant(rz, labels, epsilon);
    const zeroSet = new Set(az.map((d) => `${d.player}|${d.option}`));
    const newDominance = ao.filter((d) => !zeroSet.has(`${d.player}|${d.option}`));
    const specOpen = { name: 'x-local-open', players, options: labels, payoff: payoffFn(open, labels, values, multiplier) };
    const specZero = { name: 'x-local-zero', players, options: labels, payoff: payoffFn(zero, labels, values, multiplier) };
    /* freeLunch 定義不變：逐選項交凍結 analyzeEvent 判 */
    const newFreeLunch = labels.filter((label) =>
      G.analyzeEvent({ ...specOpen, options: [label] }).freeLunch &&
      !G.analyzeEvent({ ...specZero, options: [label] }).freeLunch);
    const exactOf = (spec) => {
      if (!exact) return null;
      const r = G.analyzeEvent(spec);
      return { verdict: r.verdict, dominant: r.dominant.map((d) => ({ player: d.player, option: d.option, strict: d.strict })), freeLunch: r.freeLunch };
    };
    return {
      multiplier, epsilon,
      open: { approxDominant: ao, minMaxRegret: minRegret(ro, labels), exact: exactOf(specOpen) },
      zero: { approxDominant: az, minMaxRegret: minRegret(rz, labels), exact: exactOf(specZero) },
      newDominance, newFreeLunch, alarm: newDominance.length > 0 || newFreeLunch.length > 0,
    };
  });
}

/* 回歸用：單一 spec 的 ε-近似支配（不比歸零），給試膽大會新舊版 */
export function approxGate(spec, epsilon = EPSILON) {
  const payoffs = payoffArrayFromFn(spec.payoff, spec.options, spec.players);
  const regrets = maxRegrets(payoffs, spec.options.length, spec.players);
  const dominant = approxDominant(regrets, spec.options, epsilon);
  return { dominant, alarm: dominant.length > 0, minMaxRegret: minRegret(regrets, spec.options) };
}

export function stateVerdict(alarms) {
  if (!Array.isArray(alarms) || alarms.length !== MULTIPLIERS.length || alarms.some((a) => typeof a !== 'boolean'))
    throw new TypeError('state verdict needs one boolean alarm per multiplier');
  if (alarms.every((a) => !a)) return 'pass';
  if (alarms.every((a) => a)) return 'fail';
  return 'incomplete';
}

export function armVerdict(stateVerdicts) {
  if (!Array.isArray(stateVerdicts) || stateVerdicts.length !== WINDOWS.length)
    throw new TypeError('arm verdict needs exactly three state verdicts');
  if (stateVerdicts.some((v) => !['pass', 'fail', 'incomplete'].includes(v))) throw new TypeError('unknown state verdict');
  if (stateVerdicts.every((v) => v === 'pass')) return 'pass';
  if (stateVerdicts.some((v) => v === 'fail')) return 'fail';
  return 'incomplete';
}

export function overallX(armVerdicts, controls) {
  const all = ARMS.every((arm) => armVerdicts[arm] === 'pass');
  return all && controls?.positiveControl === true && controls?.shrineRegression === true
    ? 'pass (single-night subgame scope)' : 'not pass';
}

/* §7.2：從凍結來源抽出試膽大會新舊兩版治具（index.html:8039-8049），交 analyzeEvent */
export function extractShrineFixtures(sourceText) {
  const grab = (name) => {
    const match = sourceText.match(new RegExp(`const ${name}=(\\{[\\s\\S]*?\\n\\});`));
    if (!match) throw new Error(`fixture ${name} not found in pinned source`);
    return new Function(`return (${match[1]});`)();
  };
  return { old: grab('EVENT_OLD_SHRINE'), fixed: grab('EVENT_NEW_SHRINE') };
}

/* ---------------- 估值量測（§5） ---------------- */
const PAID_ANCHOR = '      e.cost=c.cost; /* 供開標演出顯示實付';
export function instrumentPaidRecorder(sourceText) {
  if (sourceText.split(PAID_ANCHOR).length !== 2) throw new Error('paid recorder anchor mismatch');
  return sourceText.replace(PAID_ANCHOR,
    '      if(globalThis.__yaoshiXPaid) globalThis.__yaoshiXPaid.push({round:S.round,pid:e.p.id,slot:i,item:it.n,'
    + 'curse:!!it.curse,isWinner,amt:e.amt,type:e.type,intent:e.intent,fee,cost:c.cost});\n' + PAID_ANCHOR);
}

export function loadValuationEngine() {
  const pinned = verifyPinnedProductSource();
  assertSourceHash(pinned.sha256);
  return loadGame(path.join(ROOT, 'index.html'), { sourceText: instrumentPaidRecorder(pinned.sourceText) });
}

export function measureValuationGame(G, seed) {
  const records = [];
  globalThis.__yaoshiXPaid = records;
  try {
    G.playPolicyGame(seed, {}, undefined, { trueEffects: 'off', destinyAiChase: false });
  } finally { globalThis.__yaoshiXPaid = null; }
  const seatKinds = G.S.players.map((p) => (p.ai ? 'ai' : 'scripted'));
  return records.filter((r) => r.isWinner && !r.curse && r.intent === 'keep')
    .map((r) => ({ seed, round: r.round, pid: r.pid, seat: seatKinds[r.pid], item: r.item, paid: r.cost - r.fee, amt: r.amt, fee: r.fee }));
}

export function summarizeValuation(rows) {
  const items = {};
  for (const row of rows) {
    const entry = items[row.item] || (items[row.item] = { samples: 0, sum: 0, aiSamples: 0, aiSum: 0 });
    entry.samples++; entry.sum += row.paid;
    if (row.seat === 'ai') { entry.aiSamples++; entry.aiSum += row.paid; }
  }
  return Object.fromEntries(Object.keys(items).sort().map((name) => {
    const e = items[name];
    return [name, { samples: e.samples, value: e.samples ? e.sum / e.samples : null,
      aiSeatSamples: e.aiSamples, aiSeatValue: e.aiSamples ? e.aiSum / e.aiSamples : null }];
  }));
}

export function valuationOf(valuation, itemName) {
  const entry = valuation.items[itemName];
  return entry && entry.samples >= MIN_VALUATION_SAMPLES ? entry.value : null;
}

/* ---------------- 局面搜尋（§3） ---------------- */
function materials(chain) { return chain.requirements; }
function ownedAbs(p) { return new Set(p.bag.filter((x) => !x.curse && x.ab).map((x) => x.ab)); }

/* 回傳這一席在這一局面對 chain 的型別：'a'、'b' 或 null；以及追件型缺的材料 */
export function holderType(G, S, p, chainId, family) {
  const req = materials(G.CHAINS[chainId]);
  const owned = ownedAbs(p);
  const have = req.filter((ab) => owned.has(ab));
  if (have.length === 2) {
    if (family === 'destiny' && !G.activeTrueDestiny(p, chainId)) return null;
    return { type: 'a' };
  }
  if (family === 'ordinary' && have.length === 1) {
    const missing = req.find((ab) => !owned.has(ab));
    const slot = S.market.findIndex((it) => !it.curse && it.ab === missing);
    if (slot >= 0) return { type: 'b', missing, missingSlot: slot };
  }
  return null;
}

export function pickHolder(G, S, chainId, family) {
  const found = S.players.map((p) => ({ pid: p.id, t: holderType(G, S, p, chainId, family) })).filter((x) => x.t);
  /* 依序優先：先 (a) 生效型、再 (b) 追件型；同型多席時取座位號最小者 */
  return found.find((x) => x.t.type === 'a') || found.find((x) => x.t.type === 'b') || null;
}

export function pickXY(S, valuation, holder) {
  const valued = S.market.map((it, slot) => ({ slot, it, v: it.curse ? null : valuationOf(valuation, it.n) }))
    .filter((x) => !x.it.curse);
  const rank = (list) => [...list].sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity) || a.slot - b.slot);
  let X;
  if (holder.t.type === 'b') X = valued.find((x) => x.slot === holder.t.missingSlot);
  else X = rank(valued)[0];
  if (!X || X.v === null) return null;
  const Y = rank(valued.filter((x) => x.slot !== X.slot))[0];
  if (!Y || Y.v === null) return null;
  return { xSlot: X.slot, ySlot: Y.slot, x: { item: X.it.n, value: X.v }, y: { item: Y.it.n, value: Y.v } };
}

/* 便宜條件（1–3＋押寶夜）；通過者才進入合法性與活性檢查 */
export function cheapCandidate(G, S, valuation, family, chainId) {
  if (!S.players.every((p) => p.alive)) return null;
  if (G.isStakeNight()) return null;
  if (S.market.filter((it) => !it.curse).length < 2) return null;
  const holder = pickHolder(G, S, chainId, family);
  if (!holder) return null;
  const xy = pickXY(S, valuation, holder);
  if (!xy) return null;
  return { H: holder.pid, type: holder.t.type, ...xy };
}

export function windowOf(round) { return WINDOWS.find((w) => round >= w.from && round <= w.to)?.id ?? null; }

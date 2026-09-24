import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadGame } from './load.mjs';
import { verifyPinnedProductSource } from './l1e-destiny-adapter-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRODUCT = path.join(ROOT, 'index.html');
const PROTOCOL_PATH = path.join(ROOT, 'docs/experiments/2026-09-24-mark-timing/protocol.json');
const PRIVATE_DRAWS = ['water', 'eyes', 'twinTiger', 'bloodOath'];
const MARK_POLICY_VERSION = 'highest-visible-market-value-v1';
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

export function loadMarkTimingProtocol() {
  const protocol = JSON.parse(fs.readFileSync(PROTOCOL_PATH, 'utf8'));
  if (protocol.schema !== 'yaoshi.mark-timing.pairedProtocol.v1' ||
      protocol.source?.productCommit !== 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a' ||
      protocol.source?.productBlobOid !== '8ba772b9d960eff8b9c42eac77040433f809c57d' ||
      protocol.source?.productSha256 !== '8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d' ||
      protocol.bootstrap?.resamples !== 10000 || protocol.bootstrap?.cluster !== 'game seed')
    throw new Error('unsupported or modified mark-timing protocol');
  return protocol;
}

function replaceOnce(source, anchor, replacement, description) {
  if (source.split(anchor).length !== 2) throw new Error(`mark-timing instrumentation anchor mismatch: ${description}`);
  return source.replace(anchor, replacement);
}

function instrumentMarkTimingSource(sourceText) {
  let source = sourceText.replace(/\r\n/g, '\n');
  source = replaceOnce(source, 'function aiMark(p){',
    'function markTimingBluffRoll(p){const seed=(S.seed^Math.imul(S.round>>>0,0x9e3779b9)^Math.imul((p.id+1)>>>0,0x85ebca6b))>>>0;return mulberry32(seed)();}\nfunction aiMark(p){',
    'keyed mark RNG helper');
  source = replaceOnce(source,
    'if(cands.length>1&&S.rng()<CFG.MARK_BLUFF_P)',
    'if(cands.length>1&&markTimingBluffRoll(p)<CFG.MARK_BLUFF_P)',
    'AI mark RNG isolation');

  const loopAnchor = [
    '    drawMarks(); policyMarks(policies); /* 盯上宣告（§5.8） */',
    '    runEventPhaseHeadless(); /* 異事夜（EVENT_ON=false 零消耗）；真人座位同走 ai 啟發式 */',
  ].join('\n');
  const loopReplacement = [
    '    let markTimingEventResult=null, markTimingAiBefore=null, markTimingAliveBeforeEvent=[];',
    '    if(options?.markTimingArm==="uiTiming"){',
    '      drawMarks();',
    '      markTimingAiBefore=Object.entries(S.marks||{}).map(([pid,slot])=>[Number(pid),slot]).sort((a,b)=>a[0]-b[0]);',
    '      markTimingAliveBeforeEvent=S.players.filter(p=>p.alive).map(p=>p.id);',
    '      markTimingEventResult=runEventPhaseHeadless();',
    '      policyMarks(policies);',
    '    }else if(options?.markTimingArm==="allAfterEvent"){',
    '      markTimingAliveBeforeEvent=S.players.filter(p=>p.alive).map(p=>p.id);',
    '      markTimingEventResult=runEventPhaseHeadless();',
    '      drawMarks();',
    '      policyMarks(policies);',
    '    }else throw new Error("mark timing experiment requires a declared arm");',
    '    if(options?.recordMarkTimingEvidence===true){',
    '      if(!Array.isArray(S.markTimingEvidence)) S.markTimingEvidence=[];',
    '      S.markTimingEvidence.push({round:S.round,eventId:eventForRound(S.round)?.id??null,',
    '        market:S.market.map(it=>it.n),aiBefore:markTimingAiBefore,aliveBeforeEvent:markTimingAliveBeforeEvent,',
    '        marks:Object.entries(S.marks||{}).map(([pid,slot])=>[Number(pid),slot]).sort((a,b)=>a[0]-b[0]),',
    '        eventResult:markTimingEventResult?{eventId:markTimingEventResult.ev,choices:{...markTimingEventResult.choices},log:[...markTimingEventResult.log]}:null,',
    '        eventState:markTimingEventResult?{players:S.players.map(p=>({pid:p.id,alive:!!p.alive,life:p.life,',
    '          bag:p.bag.map(x=>[x.n??null,x.ab??null,x.f??null,x.p??null,!!x.curse])}))}:null});',
    '    }',
  ].join('\n');
  source = replaceOnce(source, loopAnchor, loopReplacement, 'playPolicyGame mark/event order');
  source = replaceOnce(source,
    '    seed, gameLength, winnerId:rank[0].id,',
    '    seed, gameLength, winnerId:rank[0].id, ...(options?.recordMarkTimingEvidence===true?{markTimingEvidence:S.markTimingEvidence||[]}:{}),',
    'playPolicyGame evidence output');
  return source;
}

export function loadMarkTimingEngine() {
  const pinned = verifyPinnedProductSource();
  const instrumentedSource = instrumentMarkTimingSource(pinned.sourceText);
  const G = loadGame(PRODUCT, { sourceText: instrumentedSource });
  return {
    G,
    provenance: {
      productCommit: pinned.commit,
      productBlobOid: pinned.blobOid,
      productSha256: pinned.sha256,
      instrumentedSourceSha256: hash(Buffer.from(instrumentedSource, 'utf8')),
      fixtureLoaderSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
      productWorktreeMatchesPin: pinned.currentWorktreeMatches,
    },
  };
}

function createSeatZeroPolicy(G) {
  const policy = (player) => G.scriptedBids(player);
  policy.mark = (player) => {
    let bestIndex = null;
    let bestValue = -Infinity;
    G.S.market.forEach((item, index) => {
      if (item.curse) return;
      const count = player.bag.filter((owned) => !owned.curse && owned.f === item.f).length;
      const marginal = count + 1 >= G.CFG.SET_MIN
        ? (count + 1) ** 2 - (count >= G.CFG.SET_MIN ? count ** 2 : 0)
        : 0;
      const value = item.p + marginal + (item.ab ? 2 : 0);
      if (value > bestValue) { bestIndex = index; bestValue = value; }
    });
    return bestIndex;
  };
  return policy;
}

function validateSeedList(seeds) {
  if (!Array.isArray(seeds) || !seeds.length || seeds.some((seed) => !Number.isSafeInteger(seed) || seed < 0) ||
      new Set(seeds).size !== seeds.length)
    throw new TypeError('mark timing seeds must be a non-empty unique list of non-negative safe integers');
  return [...seeds];
}

export function isFormalSeedCohort(seeds, seedRange) {
  const expectedCount = seedRange.endInclusive - seedRange.start + 1;
  return Array.isArray(seeds) && seeds.length === expectedCount &&
    seeds.every((seed, index) => seed === seedRange.start + index);
}

function firstEvent(evidence) {
  return evidence.find((entry) => entry.eventId !== null) ?? null;
}

function eventComparable(entry) {
  if (!entry) return null;
  return {
    round: entry.round,
    eventId: entry.eventId,
    market: entry.market,
    aliveBeforeEvent: entry.aliveBeforeEvent,
    eventResult: entry.eventResult,
    eventState: entry.eventState,
  };
}

function marksBySeat(entries) {
  return Object.fromEntries(entries || []);
}

function bootstrapPairedDifference(differences, resamples, seed) {
  if (!differences.length) return null;
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const samples = new Array(resamples);
  for (let sample = 0; sample < resamples; sample++) {
    let sum = 0;
    for (let index = 0; index < differences.length; index++)
      sum += differences[Math.floor(rng() * differences.length)];
    samples[sample] = sum / differences.length;
  }
  samples.sort((x, y) => x - y);
  return {
    lower: samples[Math.floor((resamples - 1) * 0.025)],
    upper: samples[Math.floor((resamples - 1) * 0.975)],
  };
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function summarizeArm(rows, name) {
  const selected = rows.map((row) => row[name]);
  const markKeys = ['tax', 'markedItems', 'markedBids', 'unmarkedItems', 'unmarkedBids', 'hItems', 'hOthers'];
  return {
    seat0WinRate: mean(selected.map((result) => Number(result.seat0Win))),
    averageGameLength: mean(selected.map((result) => result.gameLength)),
    averageSeat0FinalLife: mean(selected.map((result) => result.finalLife[0])),
    averageSeat0SurvivalNights: mean(selected.map((result) => result.survival[0])),
    markStatMeans: Object.fromEntries(markKeys.map((key) => [key,
      mean(selected.map((result) => result.markStat[key] || 0))])),
  };
}

function firstEventChangeSummary(rows) {
  const eligible = rows.filter((row) => row.firstEvent !== null);
  const bySeat = Object.fromEntries([1, 2, 3].map((pid) => [pid, {
    changedGames: 0, comparisons: 0, diedBeforeAfterMark: 0, revivedBeforeAfterMark: 0,
  }]));
  let gamesWithAnyChange = 0;
  let gamesWithSurvivingAiComparison = 0;
  let changedSlots = 0;
  let changedItemNames = 0;
  let humanMarkChangedGames = 0;
  let humanComparisons = 0;
  let humanDiedBeforeAfterMark = 0;
  let humanRevivedBeforeAfterMark = 0;
  const eventCounts = {};
  for (const row of eligible) {
    const first = row.firstEvent;
    eventCounts[first.eventId] = (eventCounts[first.eventId] || 0) + 1;
    const control = marksBySeat(first.uiTimingAiBefore);
    const treatment = marksBySeat(first.allAfterEventMarks);
    const aliveBefore = new Set(first.aliveBeforeEvent);
    const aliveAfter = new Set(first.aliveAfterEvent);
    let any = false;
    let comparedAnyAi = false;
    for (const pid of [1, 2, 3]) {
      if (aliveBefore.has(pid) && !aliveAfter.has(pid)) {
        bySeat[pid].diedBeforeAfterMark++;
        continue;
      }
      if (!aliveBefore.has(pid) && aliveAfter.has(pid)) {
        bySeat[pid].revivedBeforeAfterMark++;
        continue;
      }
      if (!aliveBefore.has(pid) || !aliveAfter.has(pid)) continue;
      bySeat[pid].comparisons++;
      comparedAnyAi = true;
      if (control[pid] !== treatment[pid]) {
        bySeat[pid].changedGames++;
        changedSlots++;
        any = true;
        const oldName = control[pid] == null ? null : first.market[control[pid]];
        const newName = treatment[pid] == null ? null : first.market[treatment[pid]];
        if (oldName !== newName) changedItemNames++;
      }
    }
    if (comparedAnyAi) gamesWithSurvivingAiComparison++;
    if (aliveBefore.has(0) && !aliveAfter.has(0)) humanDiedBeforeAfterMark++;
    else if (!aliveBefore.has(0) && aliveAfter.has(0)) humanRevivedBeforeAfterMark++;
    else if (aliveBefore.has(0) && aliveAfter.has(0)) {
      humanComparisons++;
      if (first.uiTimingHumanMark !== first.allAfterEventHumanMark) humanMarkChangedGames++;
    }
    if (any) gamesWithAnyChange++;
  }
  return {
    eligibleGames: eligible.length,
    eventResultMatchedGames: eligible.filter((row) => row.firstEvent.eventStateMatched).length,
    eventResultMismatchCount: eligible.filter((row) => !row.firstEvent.eventStateMatched).length,
    eventCounts,
    gamesWithAnyAiMarkChange: gamesWithAnyChange,
    gamesWithSurvivingAiComparison,
    changedAiMarkSlots: changedSlots,
    changedMarkedItemNames: changedItemNames,
    humanMarkChangedGames,
    humanComparisons,
    humanDiedBeforeAfterMark,
    humanRevivedBeforeAfterMark,
    bySeat,
  };
}

export function runMarkTimingComparison({ seeds, onProgress = null } = {}) {
  const protocol = loadMarkTimingProtocol();
  const selectedSeeds = validateSeedList(seeds ?? Array.from(
    { length: protocol.controlledConditions.seedRange.endInclusive - protocol.controlledConditions.seedRange.start + 1 },
    (_, index) => protocol.controlledConditions.seedRange.start + index));
  const formalCohort = isFormalSeedCohort(selectedSeeds, protocol.controlledConditions.seedRange);
  const ui = loadMarkTimingEngine();
  const allAfter = loadMarkTimingEngine();
  for (const G of [ui.G, allAfter.G]) {
    if (!G.CFG.MARK_ON || !G.CFG.EVENT_ON) throw new Error('mark timing experiment requires both marking and events enabled');
  }
  const rows = [];
  const privateDestinyDraws = protocol.controlledConditions.privateDestinyDraws;

  for (let index = 0; index < selectedSeeds.length; index++) {
    const seed = selectedSeeds[index];
    const uiPolicy = createSeatZeroPolicy(ui.G);
    const afterPolicy = createSeatZeroPolicy(allAfter.G);
    const base = ui.G.playPolicyGame(seed, { 0: uiPolicy }, ['qingmian'], {
      privateDestinyDraws,
      trueEffects: 'off',
      destinyAiChase: false,
      markTimingArm: 'uiTiming',
      recordMarkTimingEvidence: true,
    });
    const treatment = allAfter.G.playPolicyGame(seed, { 0: afterPolicy }, ['qingmian'], {
      privateDestinyDraws,
      trueEffects: 'off',
      destinyAiChase: false,
      markTimingArm: 'allAfterEvent',
      recordMarkTimingEvidence: true,
    });
    const uiFirst = firstEvent(base.markTimingEvidence);
    const afterFirst = firstEvent(treatment.markTimingEvidence);
    if (!!uiFirst !== !!afterFirst) throw new Error(`first-event availability differs for paired seed ${seed}`);
    if (uiFirst && JSON.stringify(eventComparable(uiFirst)) !== JSON.stringify(eventComparable(afterFirst)))
      throw new Error(`first-event state differs for paired seed ${seed}; timing experiment is confounded`);

    const uiMarks = uiFirst ? marksBySeat(uiFirst.marks) : {};
    const afterMarks = afterFirst ? marksBySeat(afterFirst.marks) : {};
    rows.push({
      seed,
      uiTiming: {
        winnerId: base.winnerId,
        seat0Win: base.winnerId === 0,
        gameLength: base.gameLength,
        finalLife: base.finalLife,
        survival: base.survival,
        markStat: base.markStat,
      },
      allAfterEvent: {
        winnerId: treatment.winnerId,
        seat0Win: treatment.winnerId === 0,
        gameLength: treatment.gameLength,
        finalLife: treatment.finalLife,
        survival: treatment.survival,
        markStat: treatment.markStat,
      },
      firstEvent: uiFirst ? {
        eventId: uiFirst.eventId,
        round: uiFirst.round,
        market: uiFirst.market,
        eventResult: uiFirst.eventResult,
        eventStateMatched: true,
        uiTimingAiBefore: uiFirst.aiBefore.filter(([pid]) => pid !== 0),
        allAfterEventMarks: afterFirst.marks.filter(([pid]) => pid !== 0),
        aliveBeforeEvent: uiFirst.aliveBeforeEvent,
        aliveAfterEvent: uiFirst.eventState.players.filter((player) => player.alive).map((player) => player.pid),
        uiTimingHumanMark: uiMarks[0] ?? null,
        allAfterEventHumanMark: afterMarks[0] ?? null,
      } : null,
    });
    if (onProgress && (index + 1) % 100 === 0) onProgress({ completed: index + 1, total: selectedSeeds.length });
  }

  const firstEventSummary = firstEventChangeSummary(rows);
  const differences = rows.map((row) => Number(row.allAfterEvent.seat0Win) - Number(row.uiTiming.seat0Win));
  const pairedWinDifference = mean(differences);
  const bootstrap = bootstrapPairedDifference(differences,
    protocol.bootstrap.resamples, protocol.bootstrap.seed);
  return {
    schema: 'yaoshi.mark-timing.pairedResult.v1',
    formalCohort,
    games: rows.length,
    firstEvent: firstEventSummary,
    outcomes: {
      uiTiming: summarizeArm(rows, 'uiTiming'),
      allAfterEvent: summarizeArm(rows, 'allAfterEvent'),
      seat0PairedWinDifferencePp: pairedWinDifference * 100,
      seat0PairedWin95Pp: bootstrap ? { lower: bootstrap.lower * 100, upper: bootstrap.upper * 100 } : null,
      seat0WinFlips: differences.filter((difference) => difference !== 0).length,
    },
    provenance: {
      gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
      productCommit: ui.provenance.productCommit,
      productBlobOid: ui.provenance.productBlobOid,
      productSha256: ui.provenance.productSha256,
      instrumentedSourceSha256: ui.provenance.instrumentedSourceSha256,
      runnerSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
      protocolSha256: hash(fs.readFileSync(PROTOCOL_PATH)),
      cfgSha256: hash(Buffer.from(JSON.stringify(ui.G.CFG), 'utf8')),
      cfg: JSON.parse(JSON.stringify(ui.G.CFG)),
      policyVersion: MARK_POLICY_VERSION,
      privateDestinyDraws,
      seedList: selectedSeeds,
      productWorktreeMatchesPin: ui.provenance.productWorktreeMatchesPin && allAfter.provenance.productWorktreeMatchesPin,
    },
    releaseGate: false,
    rows,
  };
}

export function writeMarkTimingArtifact(result, outputPath) {
  if (!result || result.schema !== 'yaoshi.mark-timing.pairedResult.v1' || !Array.isArray(result.rows))
    throw new TypeError('a valid mark timing paired result is required');
  const target = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  return target;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputPath = process.argv[2] || path.join(ROOT, 'scratchpad/mark-timing-2026-09-24/paired.json');
  const result = runMarkTimingComparison({ onProgress: ({ completed, total }) => {
    if (completed === total || completed % 1000 === 0) process.stdout.write(`mark timing: ${completed}/${total}\n`);
  } });
  const saved = writeMarkTimingArtifact(result, outputPath);
  process.stdout.write(`wrote ${saved}\n${JSON.stringify({
    games: result.games,
    firstEvent: result.firstEvent,
    outcomes: result.outcomes,
    releaseGate: result.releaseGate,
  }, null, 2)}\n`);
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPinnedFixtureEngine } from './l1e-destiny-adapter-fixtures.mjs';

const ACTION_SCHEMA = 'yaoshi.auction-submission.v1';
const OBSERVATION_SCHEMA = 'yaoshi.auction-observation.v1';
const CONTRACT_V3_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../docs/experiments/2026-09-23-destiny/model-contract-v3.json');

export function readAuctionModelContractV3() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_V3_PATH, 'utf8'));
  if (contract.schema !== 'yaoshi.l1e.sixOfFour.modelContract.v3')
    throw new Error('unsupported six-of-four model contract version');
  return contract;
}

export function loadAuctionAdapterEngine() {
  return loadPinnedFixtureEngine();
}

function requirePinnedState(G, state) {
  if (G?.S !== state) throw new Error('adapter state must be the active state of its pinned engine');
}

function bidRow(amt = 0, type = 'cons', intent = 'keep', target = null, stake = false) {
  return { amt, type, intent, target, ...(stake ? { stake: true } : {}) };
}

function legalTypes(amount, consCap) {
  return amount <= consCap ? ['cons', 'yaming'] : ['yaming'];
}

function zeroRowOptions(item, foes) {
  const intents = item.curse
    ? [['keep', null], ...foes.map((foe) => ['poison', foe])]
    : [['keep', null]];
  return intents.flatMap(([intent, target]) => ['cons', 'yaming'].map((type) =>
    bidRow(0, type, intent, target)));
}

function contributionLimit(G, state, player) {
  if (!G.CFG.LEGEND_ON || !state.shrines || G.hasLegend(player) || !G.openShrines().length) return 0;
  return Math.max(0, Math.floor(Math.min(G.CFG.INC_MAX, G.incCap(player))));
}

function poisonTargets(state, playerId) {
  return state.players.filter((player) => player.alive && player.id !== playerId).map((player) => player.id);
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
      throw new TypeError('observation and recall values must be JSON-safe');
    return value;
  }
  if (Array.isArray(value)) return value.map(copyPlain);
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = copyPlain(value[key]);
  return out;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function publicNightHistory(G, state) {
  const publicHistory = G.replayExport(state).history;
  return (publicHistory?.nights || []).map((night) => ({
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
    awakened: !!destinyPublic,
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
  const result = {
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
  return result;
}

export function auctionObservation(G, state, viewerId) {
  requirePinnedState(G, state);
  const viewer = state.players.find((player) => player.id === viewerId);
  if (!viewer || !viewer.alive) throw new RangeError('auction observation requires a living seat');
  const currentEvent = G.eventForRound(state.round);
  const nextEvent = G.eventForRound(state.round + 1);
  const currentRule = G.ruleForRound(state.round);
  const nextRule = G.ruleForRound(state.round + 1);
  const previewCount = G.traitMax(viewer, 'preview', 1);
  const shrineNights = (state.shrines || []).map((shrine) => {
    const legend = G.LEGENDS[shrine.i];
    const trait = legend ? G.TRAITS[legend.unit.trait] : null;
    return {
      index: shrine.i,
      name: legend?.n ?? null,
      fac: shrine.fac ?? null,
      open: !!shrine.open,
      takenBy: shrine.takenBy ?? null,
      trait: trait ? { name: trait.name, description: trait.desc } : null,
    };
  });
  const marks = Object.entries(state.marks || {}).flatMap(([pid, slot]) =>
    Number.isInteger(slot) && state.market[slot]
      ? [{ pid: Number(pid), item: state.market[slot].n }]
      : []).sort((a, b) => a.pid - b.pid);
  const observation = {
    schema: OBSERVATION_SCHEMA,
    phase: 'auction.sealedCommit',
    viewerId,
    round: state.round,
    windSeat: G.windPid(state.round),
    currentRule: currentRule ? { id: currentRule.id, name: currentRule.name } : null,
    currentEvent: currentEvent ? { id: currentEvent.id, name: currentEvent.name } : null,
    nextRule: nextRule ? { id: nextRule.id, name: nextRule.name } : null,
    nextEvent: nextEvent ? { id: nextEvent.id, name: nextEvent.name } : null,
    market: state.market.map(visibleItem),
    knownNextPreview: state.nextMarket.slice(0, previewCount).map(visibleItem),
    marks,
    players: state.players.map((player) => playerObservation(G, state, viewerId, player)),
    shrine: state.shrines ? {
      incensePool: state.players.map((player) => state.incPool?.[player.id] ?? 0),
      shrines: shrineNights,
    } : null,
    publicHistory: publicNightHistory(G, state),
  };
  return deepFreeze(copyPlain(observation));
}

export function* enumerateLegalAuctionSubmissions(G, state, playerId) {
  requirePinnedState(G, state);
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || !player.alive) throw new RangeError('legal auction submissions require a living seat');
  const maxBids = G.CFG.MAX_BIDS;
  if (!Number.isInteger(maxBids) || maxBids < 0)
    throw new Error('adapter requires the engine integer MAX_BIDS contract');
  const budget = Math.max(0, Math.floor(G.budgetFor(player)));
  const consCap = G.consCapFor(player);
  const incenseMax = contributionLimit(G, state, player);
  const fees = state.market.map((_, index) => G.feeForBid(player, index));
  const foes = poisonTargets(state, playerId);
  const isSingleStake = G.isStakeNight();
  const eligibleSlots = state.market.map((item, index) =>
    !isSingleStake || !item.curse ? index : -1).filter((index) => index >= 0);

  for (let incense = 0; incense <= incenseMax && incense <= budget; incense++) {
    const available = budget - incense;
    if (isSingleStake) {
      for (const type of ['cons', 'yaming']) yield {
        schema: ACTION_SCHEMA,
        playerId,
        bids: state.market.map(() => bidRow(0, type, 'keep', null, true)),
        incense,
        totalCommitment: incense,
      };
      for (let mask = 1; mask < 2 ** eligibleSlots.length; mask++) {
        const picks = eligibleSlots.filter((_, bit) => (mask & (1 << bit)) !== 0);
        const fee = Math.max(...picks.map((index) => fees[index]));
        const maxAmount = Math.floor(available - fee);
        for (let amount = 1; amount <= maxAmount; amount++) {
          for (const type of legalTypes(amount, consCap)) {
            const picked = new Set(picks);
            yield {
              schema: ACTION_SCHEMA,
              playerId,
              bids: state.market.map((_, index) => bidRow(
                picked.has(index) ? amount : 0, type, 'keep', null, true)),
              incense,
              totalCommitment: amount + fee + incense,
            };
          }
        }
      }
      continue;
    }

    const bids = state.market.map(() => bidRow());
    function* visit(index, usedSlots, spent) {
      if (index === state.market.length) {
        yield {
          schema: ACTION_SCHEMA,
          playerId,
          bids: bids.map((bid) => ({ ...bid })),
          incense,
          totalCommitment: spent + incense,
        };
        return;
      }
      for (const empty of zeroRowOptions(state.market[index], foes)) {
        bids[index] = empty;
        yield* visit(index + 1, usedSlots, spent);
      }
      if (maxBids > 0 && usedSlots >= maxBids) return;
      const remaining = available - spent - fees[index];
      const maxAmount = Math.floor(remaining);
      if (maxAmount <= 0) return;
      const intents = state.market[index].curse
        ? [['keep', null], ...foes.map((foe) => ['poison', foe])]
        : [['keep', null]];
      for (let amount = 1; amount <= maxAmount; amount++) {
        for (const type of legalTypes(amount, consCap)) {
          for (const [intent, target] of intents) {
            bids[index] = bidRow(amount, type, intent, target);
            yield* visit(index + 1, usedSlots + 1, spent + amount + fees[index]);
          }
        }
      }
      bids[index] = bidRow();
    }
    yield* visit(0, 0, 0);
  }
}

export function appendAuctionDecision(history, observation, action) {
  if (!Array.isArray(history) || observation?.schema !== OBSERVATION_SCHEMA || action?.schema !== ACTION_SCHEMA ||
      action.playerId !== observation.viewerId || !Array.isArray(action.bids) ||
      !Number.isInteger(action.incense) || action.incense < 0)
    throw new TypeError('auction recall requires a matching seat observation and submission');
  const next = [...history.map(copyPlain), {
    observation: copyPlain(observation),
    action: copyPlain(action),
  }];
  return deepFreeze(next);
}

export function auctionInformationSetKey(history, currentObservation) {
  if (!Array.isArray(history) || currentObservation?.schema !== OBSERVATION_SCHEMA)
    throw new TypeError('auction information set requires observation history and a current observation');
  if (history.some((decision) => decision?.observation?.schema !== OBSERVATION_SCHEMA ||
      decision.observation.viewerId !== currentObservation.viewerId ||
      decision.action?.playerId !== currentObservation.viewerId))
    throw new TypeError('auction information history must belong to the current seat');
  return stableStringify({
    schema: 'yaoshi.auction-information-set.v1',
    history: copyPlain(history),
    currentObservation: copyPlain(currentObservation),
  });
}

export function auctionAdapterStatus() {
  return {
    actions: 'partial',
    observations: 'partial',
    completeDecisionTree: false,
    excludedDecisionPhases: ['mark', 'event', 'sacrifice', 'shrine-pick', 'battle', 'settlement'],
  };
}

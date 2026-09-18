// A3 S5 因果短敘事讀者材料（凍結 #9 讀者題）：每題＝一局的敘事（只有 ledgerNarrative 的句子，不給 history）＋四位玩家名單＋四個候選「主因」事件，
// 讀者只答「誰贏」與「主因是第幾個」。答案鍵另存：勝者＝tests/ledger.test.mjs winnerOf、主因＝mainCause（同一口徑）。
// 用法：node tests/tools/ledger-material.mjs <out-material.json> <out-key.json> [--seeds=2,5,8,11,14,17]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { loadGame } from './load.mjs';
process.env.LEDGER_IMPORT_ONLY = '1';
const { winnerOf, mainCause } = await import('../ledger.test.mjs');
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const [outM, outK] = args.filter((a) => !a.startsWith('--'));
const seedArg = args.find((a) => a.startsWith('--seeds='));
const SEEDS = seedArg ? seedArg.slice(8).split(',').map(Number) : [2, 5, 8, 11, 14, 17];
const DIRS = { 0: '南', 1: '北', 2: '西', 3: '東' };
const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三'];
const mul = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const items = [], key = [];
for (const seed of SEEDS) {
  const G = loadGame(path.join(ROOT, 'index.html'));
  G.playPolicyGame(seed, { 0: G.POLICIES.splitter });
  const S = G.S, H = S.history, nm = (id) => `${DIRS[id]}家・${S.players[id].name}`;
  const R = G.ledgerNarrative(H, S.players);
  const w = winnerOf(H), mc = mainCause(H);
  if (!mc) { console.error(`seed ${seed} 沒有主因（全局無人跌過壽命），跳過`); continue; }
  /* 候選主因：真主因＋三個干擾項（同局其他公開事件：別人付最多的拍賣、一件毒標、一場夜戰、勝者最大一注），描述用中性語氣、不抄敘事句 */
  const describe = (c) => c.kind === 'pay' ? `${nm(c.pid)} 在第${CN[c.round]}夜為「${c.item}」付出壽命`
    : c.kind === 'fight' ? `${nm(c.pid)} 在第${CN[c.round]}夜的夜戰敗給 ${nm(c.foe)}`
      : c.kind === 'poison' ? `${nm(c.who)} 在第${CN[c.round]}夜把「${c.item}」塞給 ${nm(c.target)}`
        : c.kind === 'win' ? `${nm(c.pid)} 在第${CN[c.round]}夜買下「${c.item}」`
          : `${nm(c.pid)} 在第${CN[c.round]}夜撞上異事`;
  const truth = { ...mc, sig: `${mc.kind}:${mc.pid}:${mc.round}:${mc.idx ?? ''}` };
  const cands = [];
  const push = (c) => { const sig = `${c.kind}:${c.pid ?? c.who}:${c.round}:${c.idx ?? ''}`; if (sig !== truth.sig && !cands.some((x) => x.sig === sig)) cands.push({ ...c, sig }); };
  /* 其他人付出最多的一次拍賣（每人一筆，排除真主因那個人） */
  const bestPay = {};
  H.nights.forEach((n) => n.auction.forEach((a, idx) => a.bids.forEach((b) => { if ((b.cost || 0) > 0 && (!bestPay[b.pid] || b.cost > bestPay[b.pid].cost)) bestPay[b.pid] = { kind: 'pay', pid: b.pid, round: n.round, idx, item: a.item, cost: b.cost }; })));
  Object.values(bestPay).filter((c) => c.pid !== mc.pid && c.pid !== w).sort((a, b) => b.cost - a.cost).forEach(push);
  H.nights.forEach((n) => n.auction.forEach((a, idx) => { if (a.intent === 'poison' && a.targetId != null) push({ kind: 'poison', pid: a.winnerId, who: a.winnerId, round: n.round, idx, item: a.item, target: a.targetId }); }));
  H.nights.forEach((n) => n.fights.forEach((f) => { if (f.w != null && (f.dmg || 0) > 0) push({ kind: 'fight', pid: f.w === f.a ? f.b : f.a, round: n.round, foe: f.w }); }));
  let buy = null; H.nights.forEach((n) => n.auction.forEach((a, idx) => { if (a.winnerId === w && a.intent !== 'poison' && (!buy || a.amt > buy.amt)) buy = { kind: 'win', pid: w, round: n.round, idx, item: a.item, amt: a.amt }; })); if (buy) push(buy);
  const rng = mul(seed * 7919);
  const pick = [truth, ...cands.slice(0, 3)];
  while (pick.length < 4 && cands.length > pick.length - 1) pick.push(cands[pick.length - 1]);
  for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
  const id = `g${String(items.length + 1).padStart(2, '0')}`;
  items.push({ id, narrative: R.lines.map((l) => l.text), players: S.players.map((p) => nm(p.id)), causes: pick.map((c, i) => ({ n: i + 1, text: describe(c) })) });
  key.push({ id, seed, winner: w, winnerName: nm(w), cause: pick.findIndex((c) => c.sig === truth.sig) + 1, causeText: describe(truth), mainCause: mc });
}
const material = { title: 'A3 S5 因果短敘事讀者題：只看每局的敘事，回答「誰活到天亮（贏）」與「這局的主因是哪一件事」', items };
fs.writeFileSync(outM, JSON.stringify(material, null, 2)); fs.writeFileSync(outK, JSON.stringify(key, null, 2));
console.log(`items ${items.length}`, key.map((k) => `${k.id}:seed${k.seed} w=${k.winner} cause=${k.cause}`).join(' '));

// A3 S5 因果短敘事（凍結 #9，2026-09-18）機械測試，seeds 1–20：
//   ①ledgerNarrative(H,P) 只讀 S.history：回 3–6 句，每句掛 evRef，evRef 在 history 找得到同型事件
//   ②私有欄位比對同 #8：任何數字、任何心願名、任何袋中物名（該句 evRef 指到的拍品／請下的尊名除外）
//   ③同 seed 兩次逐字相同（純函式、不耗亂數）
//   ④主因口徑：本檔 mainCause() 是唯一口徑（讀者判定與測試共用）——產品端算出的 cause 必須與它逐欄相等
//   ⑤邊界：異事夜殺到剩一人（finalizeHistory 補快照、沒有 recordNightEnd 那條路）與無毒標的局都 ≥1 句不 crash；空局（nights=[]）不 throw
// 引擎不變由 tests/tools/trace-eq.mjs 另驗；`life.length===nights.length+1` 照舊由 review.test.mjs 守。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './tools/load.mjs';

const TARGET = path.resolve(fileURLToPath(new URL('../index.html', import.meta.url)));
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

/* ===== 口徑（凍結 #9；讀者材料 tests/tools/ledger-material.mjs 直接 import 這兩支） =====
   勝者：末筆壽命 >0 者取壽命最高，同分取座位序較小；無人存活時取最晚歸零者（同夜取座位序較小）。
   主因：勝者以外，「單夜跌幅」最大的那個人與那一夜（life[k-1]-life[k]）；跌幅同分取較晚的夜，同夜取座位序較小。
   那一夜裡的「那件事」：該人付了壽命的拍賣（bids[].cost>0）取實付最高者，實付同額取 auction[] 序號較小者（kind='pay'）；
   該夜沒付任何拍賣則取他輸掉的那場夜戰（kind='fight'）；都沒有（例：異事、詛咒）記 kind='event'；
   補快照那一段（life 多出的最後一筆，沒有對應的夜）一律 kind='event'、round=nights.length+1。全局無人跌過壽命 → null。 */
export function winnerOf(H) {
  const L = H.life, last = L[L.length - 1]; if (!last) return null;
  const alive = last.map((v, i) => [v, i]).filter(([v]) => v > 0);
  if (alive.length) return alive.sort((a, b) => b[0] - a[0] || a[1] - b[1])[0][1];
  const deathK = last.map((_, pid) => L.findIndex((row) => row[pid] <= 0));
  return deathK.map((k, pid) => [k, pid]).sort((a, b) => b[0] - a[0] || a[1] - b[1])[0][1];
}
export function mainCause(H) {
  const w = winnerOf(H); if (w == null) return null;
  const L = H.life; let best = null;
  for (let k = 1; k < L.length; k++) for (let pid = 0; pid < L[k].length; pid++) {
    if (pid === w) continue;
    const drop = L[k - 1][pid] - L[k][pid]; if (drop <= 0) continue;
    if (!best || drop > best.drop || (drop === best.drop && k > best.k)) best = { pid, k, drop };
  }
  if (!best) return null;
  const { pid, k, drop } = best, night = H.nights[k - 1];
  if (!night) return { kind: 'event', pid, round: H.nights.length + 1, drop, event: null };
  let pay = null;
  (night.auction || []).forEach((a, idx) => {
    const b = (a.bids || []).find((x) => x.pid === pid && (x.cost || 0) > 0);
    if (b && (!pay || b.cost > pay.cost)) pay = { idx, cost: b.cost, item: a.item };
  });
  if (pay) return { kind: 'pay', pid, round: night.round, drop, idx: pay.idx, item: pay.item };
  const f = (night.fights || []).find((x) => (x.a === pid || x.b === pid) && x.w != null && x.w !== pid && (x.dmg || 0) > 0);
  if (f) return { kind: 'fight', pid, round: night.round, drop, foe: f.w };
  return { kind: 'event', pid, round: night.round, drop, event: night.event || null };
}

/* evRef 是否能在 history 找到同型事件（型別集合＝敘事會用到的） */
function evExists(H, ev) {
  const lastRound = H.nights.length ? H.nights[H.nights.length - 1].round : 0;
  if (ev.type === 'dawn') return ev.round === lastRound;
  if (ev.type === 'event') return ev.round === lastRound + 1 || H.nights.some((n) => n.round === ev.round);
  const n = H.nights.find((x) => x.round === ev.round); if (!n) return false;
  switch (ev.type) {
    case 'pay': { const a = n.auction[ev.idx]; return !!a && (a.bids || []).some((b) => b.pid === ev.who && (b.cost || 0) > 0); }
    case 'win': { const a = n.auction[ev.idx]; return !!a && a.winnerId === ev.who && a.intent !== 'poison'; }
    case 'poison': { const a = n.auction[ev.idx]; return !!a && a.winnerId === ev.who && a.intent === 'poison' && a.targetId != null; }
    case 'fight': return (n.fights || []).some((f) => (f.a === ev.who || f.b === ev.who) && f.w != null && f.w !== ev.who);
    case 'death': return (n.deaths || []).includes(ev.who);
    case 'shrine': return !!(n.shrine && (n.shrine.taken || []).some((t) => t.pid === ev.who));
  }
  return false;
}
/* 該句 evRef 指到的公開名字（拍品名／尊名）——只有這些可以出現在句子裡 */
function allowedNames(G, H, ev) {
  const n = H.nights.find((x) => x.round === ev.round); const out = [];
  if (n && ev.idx != null && n.auction[ev.idx]) out.push(n.auction[ev.idx].item);
  if (n && ev.type === 'shrine') for (const t of (n.shrine && n.shrine.taken) || []) if (t.pid === ev.who) out.push(G.LEGENDS[t.shrine].n);
  return out;
}
const clone = (x) => JSON.parse(JSON.stringify(x));

/* 讀者材料工具 import 本檔只為拿口徑（LEDGER_IMPORT_ONLY=1），不跑測試 */
if (!process.env.LEDGER_IMPORT_ONLY) {

test('凍結 #9 ①②③④：seeds 1–20 句數 3–6、evRef 對得上、無私有資訊、同 seed 逐字相同、cause 與口徑逐欄相等', (t) => {
  const kinds = { pay: 0, fight: 0, event: 0, none: 0 }, types = {};
  let noPoisonGames = 0;
  for (const seed of SEEDS) {
    const G = loadGame(TARGET);
    G.playPolicyGame(seed, { 0: G.POLICIES.splitter });
    const S = G.S, H = S.history;
    assert.equal(typeof G.ledgerNarrative, 'function', 'index.html 要匯出 ledgerNarrative');
    const R = G.ledgerNarrative(H, S.players);
    assert.ok(R && Array.isArray(R.lines), `seed ${seed} 沒回 lines`);
    assert.ok(R.lines.length >= 3 && R.lines.length <= 6, `seed ${seed} 句數 ${R.lines.length} 不在 3–6`);
    assert.equal(R.winner, winnerOf(H), `seed ${seed} 勝者與口徑不同`);
    assert.deepEqual(R.cause, mainCause(H), `seed ${seed} 主因與口徑不同`);
    kinds[R.cause ? R.cause.kind : 'none']++;
    const wishNames = S.players.map((p) => p.wish && G.WISHES[p.wish.id] && (G.WISHES[p.wish.id].n || G.WISHES[p.wish.id].name)).filter(Boolean);
    const bagNames = new Set(S.players.flatMap((p) => (p.bag || []).map((x) => x.n)));
    for (const l of R.lines) {
      assert.ok(typeof l.text === 'string' && l.text.length > 0, `seed ${seed} 空句`);
      assert.ok(l.evRef && typeof l.evRef.type === 'string', `seed ${seed}「${l.text}」沒 evRef`);
      assert.ok(evExists(H, l.evRef), `seed ${seed} evRef ${JSON.stringify(l.evRef)} 在 history 找不到`);
      assert.ok(!/\d/.test(l.text), `seed ${seed}「${l.text}」含數字`);
      for (const w of wishNames) assert.ok(!l.text.includes(w), `seed ${seed}「${l.text}」洩漏心願「${w}」`);
      const ok = allowedNames(G, H, l.evRef);
      for (const b of bagNames) if (!ok.includes(b)) assert.ok(!l.text.includes(b), `seed ${seed}「${l.text}」提到 evRef 以外的袋中物「${b}」`);
      assert.ok(!/\{\w+\}/.test(l.text), `seed ${seed}「${l.text}」佔位沒填`);
      types[l.evRef.type] = (types[l.evRef.type] || 0) + 1;
    }
    const again = G.ledgerNarrative(clone(H), S.players);
    assert.deepEqual(again, R, `seed ${seed} 同輸入兩次結果不同`);
    if (!H.nights.some((n) => n.auction.some((a) => a.intent === 'poison'))) noPoisonGames++;
  }
  t.diagnostic('cause kinds: ' + JSON.stringify(kinds) + ' evRef types: ' + JSON.stringify(types) + ' no-poison games: ' + noPoisonGames);
  assert.ok(kinds.pay > 0, '20 局沒量到 pay 型主因');
  assert.ok(types.death > 0 && types.poison > 0, '20 局沒量到出局／毒標句');
  assert.ok(noPoisonGames > 0, 'seeds 1–20 沒有無毒標的局（邊界沒量到）');
});

test('凍結 #9 ⑤：異事夜殺到剩一人（補快照路徑）、無毒標局、空局都 ≥1 句不 throw', () => {
  const G = loadGame(TARGET);
  G.playPolicyGame(3, { 0: G.POLICIES.splitter });
  const S = G.S, H = clone(S.history);
  /* 合成 finalizeHistory 那條路：最後一夜之後又補一筆快照，勝者以外全歸零，沒有對應的夜紀錄 */
  const last = H.life[H.life.length - 1], w = winnerOf(H);
  H.life.push(last.map((v, i) => (i === w ? v : 0)));
  const R = G.ledgerNarrative(H, S.players);
  assert.ok(R.lines.length >= 1, '補快照局沒句子');
  assert.equal(R.winner, w);
  /* 主因口徑：補快照那段若跌幅最大就是 kind='event'、round=nights.length+1 */
  const mc = mainCause(H); assert.deepEqual(R.cause, mc);
  if (mc && mc.round === H.nights.length + 1) assert.equal(mc.kind, 'event');
  /* 無毒標：把所有毒標改成一般得標 */
  const H2 = clone(S.history);
  H2.nights.forEach((n) => n.auction.forEach((a) => { if (a.intent === 'poison') { a.intent = 'keep'; a.targetId = null; } }));
  const R2 = G.ledgerNarrative(H2, S.players);
  assert.ok(R2.lines.length >= 1 && R2.lines.every((l) => l.evRef.type !== 'poison'), '無毒標局仍出毒標句');
  /* 空局：只有入市快照 */
  const H3 = { life: [S.history.life[0]], nights: [] };
  const R3 = G.ledgerNarrative(H3, S.players);
  assert.ok(R3.lines.length >= 1, '空局沒句子');
  assert.equal(R3.cause, null);
  /* 全員出局：勝者＝最晚歸零者 */
  const H4 = clone(S.history); H4.life.push(H4.life[H4.life.length - 1].map(() => 0));
  const R4 = G.ledgerNarrative(H4, S.players);
  assert.ok(R4.lines.length >= 1); assert.equal(R4.winner, winnerOf(H4));
});

}

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
   2026-09-21 使用者批准 F1/F2 修訂：只稱最大失血區間，並列該夜全部實付拍賣與落敗夜戰，
   不依 pay→fight 優先序推斷單一原因。無對應夜紀錄為 interval、round=null。
   索引及數值保留供研究者核對；敘事不得將 drop 當成單件 cost。 */
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
  const payments = [], fights = [];
  for (const [idx, a] of (night?.auction || []).entries()) {
    const b = (a.bids || []).find(b => b.pid === pid && b.cost > 0);
    if (b) payments.push({ idx, item: a.item, cost: b.cost });
  }
  for (const [idx, f] of (night?.fights || []).entries()) {
    if ([f.a, f.b].includes(pid) && f.w != null && f.w !== pid)
      fights.push({ idx, foe: f.w, damage: f.dmg });
  }
  return { kind: night ? 'night' : 'interval', pid, round: night?.round ?? null,
    snapshotIndex: k, drop, payments, fights };
}

/* evRef 是否能在 history 找到同型事件（型別集合＝敘事會用到的） */
function evExists(H, ev) {
  const lastRound = H.nights.length ? H.nights[H.nights.length - 1].round : 0;
  if (ev.type === 'dawn') return ev.round === lastRound;
  if (ev.type === 'night' || ev.type === 'interval') {
    const k = ev.snapshotIndex, n = H.nights[k - 1];
    return k > 0 && k < H.life.length && H.life[k - 1][ev.who] > H.life[k][ev.who]
      && (ev.type === 'night' ? !!n && n.round === ev.round : !n && ev.round === null);
  }
  const n = H.nights.find((x) => x.round === ev.round); if (!n) return false;
  switch (ev.type) {
    case 'pay': { const a = n.auction[ev.idx]; return !!a && (a.bids || []).some((b) => b.pid === ev.who && (b.cost || 0) > 0); }
    case 'win': { const a = n.auction[ev.idx]; return !!a && a.winnerId === ev.who && a.intent !== 'poison'; }
    case 'poison': { const a = n.auction[ev.idx]; return !!a && a.winnerId === ev.who && a.intent === 'poison' && !a.poisonBlocked && a.targetId != null; }
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
  const kinds = { night: 0, interval: 0, none: 0 }, types = {};
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
  assert.ok(kinds.night > 0, '20 局沒量到有夜紀錄的最大失血區間');
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
  /* 補快照若跌幅最大，保留未知區間，不虛構夜次／異事。 */
  const mc = mainCause(H); assert.deepEqual(R.cause, mc);
  if (mc && mc.snapshotIndex >= H.nights.length + 1) { assert.equal(mc.kind, 'interval'); assert.equal(mc.round, null); }
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

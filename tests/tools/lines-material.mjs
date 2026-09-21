// A3 S4 讀者材料產生器（凍結 #8 讀者題）：從 seeds 抽 14 題（七鍵各 2、角色盡量不重複），每題＝該夜公開事件清單（打亂）＋一句台詞（含說話者），
// 讀者只答「這句在回哪一件」；答案另存 key 檔。用法：node tests/tools/lines-material.mjs <out-material.json> <out-key.json> [--seeds=1-20]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { loadGame } from './load.mjs';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const [outM, outK] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const KEYS = ['win', 'lose', 'poison', 'poisoned', 'mark', 'death', 'shrine'];
const LABEL = { win: '得標', lose: '落標', poison: '毒標（塞人）', poisoned: '被塞毒標', mark: '盯上宣告', death: '出局', shrine: '請神' };
const items = [], key = [], usedRole = {};
const mul = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
for (let seed = 1; seed <= 20 && items.length < 14; seed++) {
  const G = loadGame(path.join(ROOT, 'index.html'));
  G.playPolicyGame(seed, { 0: G.POLICIES.splitter });
  const S = G.S, nm = (id) => S.players[id].name;
  for (const n of S.history.nights) {
    const evs = [];
    for (const a of n.auction || []) {
      if (a.winnerId == null) continue;
      const fac = G.FAC[a.fac] ? G.FAC[a.fac].n : '';
      const poison = a.intent === 'poison' && !a.poisonBlocked && a.targetId != null;
      /* 毒標交易是「一件事的兩面」（塞人／被塞）：兩個事件物件共用 txn，清單只列一條、答案鍵兩面都算對
         （S4 r3 對照題 s3 的教訓：列成兩條時讀者選另一面被判錯，2026-09-18） */
      const txn = poison ? `${n.round}:${n.auction.indexOf(a)}` : null;
      evs.push({ type: poison ? 'poison' : 'win', who: a.winnerId, item: a.item, fac, txn, you: poison ? nm(a.targetId) : '', text: poison ? `${nm(a.winnerId)} 得標「${a.item}」並塞給 ${nm(a.targetId)}` : `${nm(a.winnerId)} 得標「${a.item}」（${fac}）` });
      for (const b of a.bids || []) if (b.pid !== a.winnerId) evs.push({ type: 'lose', who: b.pid, item: a.item, fac, whoName: nm(a.winnerId), text: `${nm(b.pid)} 出價「${a.item}」但輸給 ${nm(a.winnerId)}` });
      if (poison) evs.push({ type: 'poisoned', who: a.targetId, item: a.item, txn, whoName: nm(a.winnerId), text: `${nm(a.targetId)} 被 ${nm(a.winnerId)} 塞了「${a.item}」` });
    }
    for (const m of n.marks || []) { const it = G.POOL.find((x) => x.n === m.item); evs.push({ type: 'mark', who: m.pid, item: m.item, fac: it && G.FAC[it.f] ? G.FAC[it.f].n : '', text: `${nm(m.pid)} 宣告盯上「${m.item}」` }); }
    for (const d of n.deaths || []) evs.push({ type: 'death', who: d, text: `${nm(d)} 壽命耗盡出局` });
    for (const t of (n.shrine && n.shrine.taken) || []) evs.push({ type: 'shrine', who: t.pid, legend: G.LEGENDS[t.shrine].n, text: `${nm(t.pid)} 請下了「${G.LEGENDS[t.shrine].n}」` });
    const aiEvs = evs.filter((e) => S.players[e.who].ai);
    for (const e of aiEvs) {
      const need = KEYS.filter((k) => items.filter((x) => x.type === k).length < 2);
      if (!need.includes(e.type) || items.length >= 14) continue;
      const role = S.players[e.who].roleId; if ((usedRole[role] || 0) >= 2) continue;
      if (evs.length < 3) continue; /* 太少事件的夜沒鑑別力 */
      const rng = mul(seed * 100 + n.round);
      const L = G.lineFor(role, e.who, e.type, { round: n.round, item: e.item, fac: e.fac, who: e.whoName, you: e.you, legend: e.legend }, rng);
      /* 該夜事件清單去重（同人同型只留一條），打亂 */
      const seenT = new Set(); const list = evs.filter((x) => { const k = x.txn ? 'txn:' + x.txn : x.type + ':' + x.who + ':' + (x.item || x.legend || ''); if (seenT.has(k)) return false; seenT.add(k); return true; });
      for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
      const ansIdx = list.findIndex((x) => x === e || (e.txn && x.txn === e.txn));
      const id = `q${String(items.length + 1).padStart(2, '0')}`;
      items.push({ id, seed, round: n.round, speaker: nm(e.who), quote: L.text, events: list.map((x, i) => ({ n: i + 1, text: x.text })), type: e.type });
      /* 同夜同人同型的事件（例：同一人得標兩件）台詞分不出是哪一件——判定以「同型＋同說話者」為準 */
      key.push({ id, answer: ansIdx + 1, acceptable: list.map((x, i) => ((x.type === e.type && x.who === e.who) || (e.txn && x.txn === e.txn)) ? i + 1 : null).filter(Boolean), type: e.type, label: LABEL[e.type], role, seed, round: n.round });
      usedRole[role] = (usedRole[role] || 0) + 1;
    }
    if (items.length >= 14) break;
  }
}
const material = { title: 'A3 S4 角色台詞讀者題（每題：該夜公開事件清單＋一句台詞，答「這句在回第幾件」）', items: items.map(({ type, ...rest }) => rest) };
fs.writeFileSync(outM, JSON.stringify(material, null, 2)); fs.writeFileSync(outK, JSON.stringify(key, null, 2));
console.log(`items ${items.length}`, JSON.stringify(Object.fromEntries(KEYS.map((k) => [k, items.filter((x) => x.type === k).length]))), 'roles', JSON.stringify(usedRole));

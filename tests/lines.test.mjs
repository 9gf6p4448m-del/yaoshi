// A3 S4 角色台詞（凍結 #8，2026-09-18）機械測試，seeds 1–20：
//   ①每個 AI 角色七個鍵（win／lose／poison／poisoned／mark／death／shrine）各 ≥2 句；佔位只准 {item}{fac}{who}{you}{legend}
//   ②從 S.history 推出六類公開事件，逐件呼叫 lineFor：evRef {round,type,who} 與該夜 history 對得上
//   ③台詞不得含私有資訊：任何數字（密封金額、aggr／spite）、任何心願名、任何袋中物名（事件自己的拍品名除外）
//   ④同 seed 兩次生成逐字相同
//   ⑤活性：20 局加總六類事件各 >0（否則測試量不到那一類）
// 引擎不變由 tests/tools/trace-eq.mjs 另驗；lineFor 只用呼叫端給的 rng（遊戲用 S.rngUi），不碰 S.rng。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './tools/load.mjs';

const TARGET = path.resolve(fileURLToPath(new URL('../index.html', import.meta.url)));
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const KEYS = ['win', 'lose', 'poison', 'poisoned', 'mark', 'death', 'shrine'];
const ALLOWED = new Set(['item', 'fac', 'who', 'you', 'legend']);

/* 從一局的 S.history 推出六類公開事件（只讀 history，與 evRef 同一口徑） */
function publicEvents(G, S) {
  const H = S.history, out = [];
  const nm = (id) => S.players[id].name;
  const facOf = (itemName) => { const it = G.POOL.find((x) => x.n === itemName); return it && G.FAC[it.f] ? G.FAC[it.f].n : ''; };
  for (const n of H.nights) {
    for (const a of n.auction || []) {
      if (a.winnerId == null) continue;
      const base = { round: n.round, item: a.item, fac: G.FAC[a.fac] ? G.FAC[a.fac].n : '' };
      const isPoison = a.intent === 'poison' && !a.poisonBlocked && a.targetId != null;
      out.push({ ...base, type: isPoison ? 'poison' : 'win', who: a.winnerId, you: isPoison ? nm(a.targetId) : '' });
      for (const b of a.bids || []) if (b.pid !== a.winnerId) out.push({ ...base, type: 'lose', who: b.pid, whoName: nm(a.winnerId) });
      if (isPoison) out.push({ ...base, type: 'poisoned', who: a.targetId, whoName: nm(a.winnerId) });
    }
    for (const m of n.marks || []) out.push({ round: n.round, type: 'mark', who: m.pid, item: m.item, fac: facOf(m.item) });
    for (const d of n.deaths || []) out.push({ round: n.round, type: 'death', who: d });
    for (const t of (n.shrine && n.shrine.taken) || []) out.push({ round: n.round, type: 'shrine', who: t.pid, legend: G.LEGENDS[t.shrine].n });
  }
  return out;
}

/* evRef 是否能在 history 找到同型事件 */
function evExists(G, S, ev) {
  const n = S.history.nights.find((x) => x.round === ev.round); if (!n) return false;
  switch (ev.type) {
    case 'win': return (n.auction || []).some((a) => a.winnerId === ev.who && (a.intent !== 'poison' || a.poisonBlocked));
    case 'poison': return (n.auction || []).some((a) => a.winnerId === ev.who && a.intent === 'poison' && !a.poisonBlocked);
    case 'poisoned': return (n.auction || []).some((a) => a.intent === 'poison' && !a.poisonBlocked && a.targetId === ev.who);
    case 'lose': return (n.auction || []).some((a) => a.winnerId != null && a.winnerId !== ev.who && (a.bids || []).some((b) => b.pid === ev.who));
    case 'mark': return (n.marks || []).some((m) => m.pid === ev.who);
    case 'death': return (n.deaths || []).includes(ev.who);
    case 'shrine': return !!(n.shrine && (n.shrine.taken || []).some((t) => t.pid === ev.who));
  }
  return false;
}

const genAll = (G, S, seed) => {
  const rng = G.mulberry32(seed ^ 0x5eed);
  const evs = publicEvents(G, S).filter((e) => S.players[e.who] && S.players[e.who].ai);
  return evs.map((e) => {
    const ctx = { round: e.round, item: e.item, fac: e.fac, who: e.whoName, you: e.you, legend: e.legend };
    const L = G.lineFor(S.players[e.who].roleId, e.who, e.type, ctx, rng);
    return { ev: e, ctx, L };
  });
};

test('凍結 #8 ①：每個 AI 角色七個鍵各 ≥2 句，佔位只用公開欄位', () => {
  const G = loadGame(TARGET);
  const roles = Object.keys(G.ROLES).filter((k) => G.ROLES[k].pool);
  assert.ok(roles.length >= 10, 'AI 角色 ≥10');
  for (const r of roles) for (const k of KEYS) {
    const arr = G.ROLES[r].lines && G.ROLES[r].lines[k];
    assert.ok(Array.isArray(arr) && arr.length >= 2, `${r}.lines.${k} 要 ≥2 句，現在 ${arr ? arr.length : 0}`);
    for (const s of arr) {
      for (const m of s.matchAll(/\{(\w+)\}/g)) assert.ok(ALLOWED.has(m[1]), `${r}.${k}「${s}」用了非公開佔位 {${m[1]}}`);
      assert.ok(!/\d/.test(s), `${r}.${k}「${s}」含數字`);
    }
  }
});

test('凍結 #8 ②③④⑤：seeds 1–20 evRef 對得上、無私有資訊、同 seed 逐字相同、六類都量到', (t) => {
  const seen = Object.fromEntries(KEYS.map((k) => [k, 0]));
  for (const seed of SEEDS) {
    const G = loadGame(TARGET);
    G.playPolicyGame(seed, { 0: G.POLICIES.splitter });
    const S = G.S;
    const gen = genAll(G, S, seed);
    /* 私有欄位：所有人的心願名、所有人袋中物名、AI 內心值（數字） */
    const wishNames = S.players.map((p) => p.wish && G.WISHES[p.wish.id] && (G.WISHES[p.wish.id].n || G.WISHES[p.wish.id].name)).filter(Boolean);
    const bagNames = new Set(S.players.flatMap((p) => (p.bag || []).map((x) => x.n)));
    for (const { ev, ctx, L } of gen) {
      assert.ok(L && typeof L.text === 'string' && L.text.length > 0, `seed ${seed} ${ev.type} pid ${ev.who} 沒有台詞`);
      assert.deepEqual(L.evRef, { round: ev.round, type: ev.type, who: ev.who }, `seed ${seed} evRef 不對`);
      assert.ok(evExists(G, S, L.evRef), `seed ${seed} evRef ${JSON.stringify(L.evRef)} 在 history 找不到`);
      assert.ok(!/\d/.test(L.text), `seed ${seed}「${L.text}」含數字（密封金額／內心值）`);
      for (const w of wishNames) assert.ok(!L.text.includes(w), `seed ${seed}「${L.text}」洩漏心願「${w}」`);
      /* 事件自己的拍品名與請下的尊名是公開的（history 記在 auction／shrine.taken），其餘袋中物一律不得提 */
      for (const b of bagNames) if (b !== ctx.item && b !== ctx.legend) assert.ok(!L.text.includes(b), `seed ${seed}「${L.text}」提到袋中物「${b}」`);
      assert.ok(!/\{\w+\}/.test(L.text), `seed ${seed}「${L.text}」佔位沒填`);
      seen[ev.type]++;
    }
    const again = genAll(G, S, seed);
    assert.deepEqual(again.map((x) => x.L), gen.map((x) => x.L), `seed ${seed} 同 seed 兩次生成不同`);
  }
  t.diagnostic('events per type: ' + JSON.stringify(seen));
  for (const k of ['win', 'lose', 'poison', 'poisoned', 'death']) assert.ok(seen[k] > 0, `20 局沒量到 ${k}`);
  for (const k of ['mark', 'shrine']) if (!seen[k]) t.diagnostic(`注意：20 局沒有 ${k} 事件（policy game 可能未開盯上／請神），此類只靠①結構檢查`);
});

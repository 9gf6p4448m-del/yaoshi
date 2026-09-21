// A3 S7 再玩研究（凍結 #11）：對照工具。讀玩家從「本局回顧 → 複製本局紀錄」貼回的 JSON，
// 用 tests/ledger.test.mjs 的口徑（凍結 #9 同一函式）算勝者與主因，印成主對話判 Q1 用的對照表。
// 判者是主對話對照這份輸出，不是玩家自評；本工具只印事實，不判。
// 用法：node tests/tools/replay-judge.mjs docs/experiments/2026-09-18-a3-replay/p1-g1.json [更多檔]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './load.mjs';
process.env.LEDGER_IMPORT_ONLY = '1';
const { winnerOf, mainCause } = await import('../ledger.test.mjs');
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五'];
const files = process.argv.slice(2);
if (!files.length) { console.error('用法：node tests/tools/replay-judge.mjs <replay.json> [更多檔]'); process.exit(2); }
const G = loadGame(path.join(ROOT, 'index.html'));
let bad = 0;
for (const f of files) {
  let E;
  try { E = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.log(`\n== ${f}\n  讀不進來：${e.message}`); bad++; continue; }
  if (E.kind !== 'yaoshi-replay' || !E.history || !Array.isArray(E.players)) { console.log(`\n== ${f}\n  不是 yaoshi-replay 格式（kind=${E.kind}）`); bad++; continue; }
  const H = E.history, P = E.players;
  const nm = (id) => id == null ? '—' : `${P[id].dir}家・${P[id].name}${P[id].human ? '（真人）' : ''}`;
  const w = winnerOf(H), mc = mainCause(H);
  const describe = c => !c ? '（無：全局沒有人跌過壽命）'
    : `${nm(c.pid)} 在${c.round == null ? '最後兩筆壽命紀錄之間' : `第${CN[c.round]}夜`}淨減少 ${c.drop}`;
  const humans = P.filter((p) => p.human);
  console.log(`\n== ${f}`);
  console.log(`  原始版本 ${E.ver}  種子 ${E.seed}  模式 ${E.mode}  夜數 ${H.nights.length}  快照 ${H.life.length}`);
  console.log('  四家：' + P.map((p) => `${p.dir}=${p.name}[${p.roleId}]${p.human ? '★真人' : ''} 末壽命 ${p.life}${p.alive ? '' : '（出局）'}`).join('｜'));
  console.log(`  勝者（口徑 winnerOf）：${nm(w)}`);
  console.log(`  最大失血區間（loss-interval-v2，Q1 證據）：${describe(mc)}`);
  if (mc) {
    console.log(`    原始：${JSON.stringify(mc)}`);
    for (const p of mc.payments) console.log(`    拍賣「${p.item}」實付 ${p.cost}（單筆，不等於整夜淨損）`);
    for (const f of mc.fights) console.log(`    夜戰敗給 ${nm(f.foe)}，紀錄傷害 ${f.damage}（不等於整夜淨損）`);
    if (!mc.payments.length && !mc.fights.length) console.log('    逐項紀錄不足，不得猜單一原因或異事。');
  }
  console.log('  Q1 人工對照：失血區間與同夜可核對事件／累積損失；不得將整夜淨損強歸某件拍品；此對照不能證明全局唯一勝敗因果。');
  /* 補充（不是判準）：每個真人自己單夜跌幅最大的一夜與那夜的事——只為了讀玩家原話時對得上他在講哪一夜 */
  for (const h of humans) {
    let best = null;
    for (let k = 1; k < H.life.length; k++) { const d = (H.life[k - 1][h.id] || 0) - (H.life[k][h.id] || 0); if (d > 0 && (!best || d > best.d)) best = { k, d }; }
    if (!best) { console.log(`  補充：${nm(h.id)} 全局沒有跌過壽命`); continue; }
    const n = H.nights[best.k - 1];
    const paid = n ? n.auction.map((a, idx) => ({ a, idx, b: a.bids.find((b) => b.pid === h.id && (b.cost || 0) > 0) })).filter((x) => x.b).map((x) => `「${x.a.item}」付 ${x.b.cost}${x.a.winnerId === h.id ? '（得標）' : '（落標）'}`) : [];
    const lost = n ? n.fights.filter((ft) => ft.w != null && ft.w !== h.id && (ft.a === h.id || ft.b === h.id)).map((ft) => `夜戰敗給 ${nm(ft.w)} −${ft.dmg}`) : [];
    const poisoned = n ? n.auction.filter((a) => a.intent === 'poison' && a.targetId === h.id).map((a) => `被 ${nm(a.winnerId)} 塞「${a.item}」`) : [];
    console.log(`  補充：${nm(h.id)} 跌最多的一夜＝${n ? `第${CN[n.round]}夜` : '未記夜次的局末區間'}（淨減少 ${best.d}）：${[...paid, ...lost, ...poisoned].join('；') || (n ? '（未記錄拍賣支出、夜戰落敗或被塞毒標；不能推定無其他損失）' : '（逐項紀錄不足）')}`);
  }
  try {
    const R = G.ledgerNarrative(H, P);
    console.log('  局末「這一局的因果」（目前版本重建，非玩家當時所見）：');
    R.lines.forEach((l) => console.log(`    ・${l.text}`));
  } catch (e) { console.log(`  敘事生成失敗：${e.message}`); bad++; }
}
if (bad) process.exitCode = 1;

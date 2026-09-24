// A3 S7 再玩研究（凍結 #11）：replayExport(S) 的機械閘。
// 要證明的事：真實引擎打完一局後打包出來的 JSON，貼回去仍是同一局——history 逐值相同、
// 判主因的口徑（tests/ledger.test.mjs 的 winnerOf／mainCause，凍結 #9 同一函式）在貼回的紀錄上算得一樣、
// 敘事句一樣；同一局打包兩次逐位元組相同（沒有時間戳、沒有亂數）。
// 新 R1 私函由獨立安全亂數抽取；公開 seed 保留市場重播能力，
// 未揭密函與私有抽籤結果仍不得出現在公開匯出。
// 另外靜態守兩條：回顧畫面只有一顆「複製本局紀錄」按鈕；copyReplay 不用 alert／confirm（會擋住頁面）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './tools/load.mjs';
process.env.LEDGER_IMPORT_ONLY = '1';
const { winnerOf, mainCause } = await import('./ledger.test.mjs');
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const INDEX = process.env.YAOSHI_INDEX || path.join(ROOT, 'index.html'); /* 突變驗紅用：指到改壞的副本 */
const page = fs.readFileSync(INDEX, 'utf8');

test('replayExport：seeds 1–10 打包→JSON→貼回，history 逐值相同、口徑相同、敘事相同、可重現', () => {
  let causes = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const G = loadGame(INDEX);
    G.playPolicyGame(seed, { 0: G.POLICIES.splitter });
    const E = G.replayExport(G.S);
    const s1 = JSON.stringify(E);
    const back = JSON.parse(s1);
    assert.equal(back.kind, 'yaoshi-replay');
    assert.match(back.ver, /^\d+\.\d+\.\d+$/, 'ver 要是語意版本');
    assert.equal(back.seed,seed,'公開市場種子必須可重播');
    assert.equal(back.seedRedacted,undefined);
    assert.equal(G.S.seed,seed,'內部種子仍可用於正式量測與重現');
    const withoutPrivateDestiny=history=>({...history,nights:history.nights.map(n=>({...n,
      auction:n.auction.map(({destinyAwakenings,...a})=>a)}))});
    assert.deepEqual(withoutPrivateDestiny(back.history),
      withoutPrivateDestiny(JSON.parse(JSON.stringify(G.S.history))),
      `seed ${seed} 公開拍賣／戰鬥 history 貼回後不同`);
    for(const night of back.history.nights) for(const auction of night.auction)
      for(const event of auction.destinyAwakenings||[])
        assert.equal(G.S.destinyPublic[event.pid],true,'公開回放不得提前揭露密函');
    assert.equal(back.players.length, 4);
    assert.deepEqual(back.players.map((p) => p.id), [0, 1, 2, 3]);
    assert.deepEqual(back.players.map((p) => p.dir), ['南', '北', '西', '東']);
    for (const p of back.players) {
      assert.equal(typeof p.human, 'boolean');
      assert.equal(typeof p.name, 'string');
      assert.equal(typeof p.roleId, 'string');
      assert.equal(typeof p.life, 'number');
      assert.equal(p.life, G.S.players[p.id].life, `seed ${seed} 玩家 ${p.id} 末壽命要和引擎一致`);
    }
    assert.equal(winnerOf(back.history), winnerOf(G.S.history), `seed ${seed} 勝者口徑不同`);
    assert.deepEqual(mainCause(back.history), mainCause(G.S.history), `seed ${seed} 主因口徑不同`);
    if (mainCause(back.history)) causes++;
    const R1 = G.ledgerNarrative(G.S.history, G.S.players);
    const R2 = G.ledgerNarrative(back.history, back.players);
    assert.deepEqual(R2.lines.map((l) => l.text), R1.lines.map((l) => l.text), `seed ${seed} 用貼回的資料生成的敘事不同`);
    assert.equal(JSON.stringify(G.replayExport(G.S)), s1, `seed ${seed} 同一局打包兩次要逐位元組相同`);
    /* 活性：打包的不是空局 */
    assert.ok(back.history.nights.length >= 1, `seed ${seed} 打包的局沒有任何一夜`);
  }
  assert.ok(causes >= 8, `十局裡算得出主因的要 ≥8（實得 ${causes}），否則對照口徑根本沒被行使`);
});

test('回顧畫面只有一顆複製按鈕，copyReplay 不用會擋頁的對話框', () => {
  const review = page.slice(page.indexOf('function showReview'), page.indexOf('function closeReview'));
  assert.equal((review.match(/onclick="copyReplay\(\)"/g) || []).length, 1, '回顧頁要有且只有一顆「複製本局紀錄」');
  const fn = page.slice(page.indexOf('function copyReplay'), page.indexOf('\n}', page.indexOf('function copyReplay')) + 2);
  assert.ok(fn.includes('replayExport(S)'), 'copyReplay 必須用 replayExport 打包，不得另抄一份欄位');
  assert.doesNotMatch(fn, /\b(alert|confirm|prompt)\s*\(/, 'copyReplay 不得用 alert／confirm／prompt');
  assert.ok(fn.includes('rvExport'), '剪貼簿不可用時要有文字框備援');
});

test('回顧畫面只有一顆下載按鈕，downloadReplay 走分享面板→下載、檔名決定性、不用對話框', () => {
  const review = page.slice(page.indexOf('function showReview'), page.indexOf('function closeReview'));
  assert.equal((review.match(/onclick="downloadReplay\(\)"/g) || []).length, 1, '回顧頁要有且只有一顆「下載本局紀錄」');
  const fn = page.slice(page.indexOf('function downloadReplay'), page.indexOf('\n}', page.indexOf('function downloadReplay')) + 2);
  assert.ok(fn.includes('JSON.stringify(replayExport(S))'), 'downloadReplay 必須用 replayExport 打包，不得另抄一份欄位');
  assert.doesNotMatch(fn, /\b(alert|confirm|prompt)\s*\(/, 'downloadReplay 不得用 alert／confirm／prompt');
  assert.ok(fn.includes('navigator.canShare') && fn.includes('navigator.share('), '手機要先試系統分享面板（帶 File）');
  assert.ok(fn.includes('a.download=name'), '不支援分享時要有 <a download> 備援');
  assert.ok(fn.includes('AbortError'), '使用者取消分享不得退到下載');
  const nm = page.slice(page.indexOf('function replayFileName'), page.indexOf('function downloadReplay'));
  assert.ok(nm.includes('RELEASE_VERSION') && nm.includes('replayExport(S)'),
    '檔名要含版本與公開種子，並與回放匯出同源');
  assert.ok(!nm.includes('S.seed'), '檔名應使用回放匯出的同一種子欄位');
  assert.doesNotMatch(nm, /Date|Math\.random/, '檔名不得帶時間戳或亂數');
});

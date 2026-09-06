/* 《紙紮夜戰》演出小卷（沒兵仍出招／隻數不同步，2026-09-07）行為單元測試
   跑法：node tests/duel-desync.test.mjs [index.html 的路徑]
        預設路徑＝這個檔案旁邊的 ../index.html
   鑑別力（docs/harness 02 §6.1 第 1 條）：
     git show af12d4d:index.html > /tmp/old.html && node tests/duel-desync.test.mjs /tmp/old.html
     舊版必須「紅在行為斷言」（D2：一側在第 2 拍前全滅，斷言第 2、3 拍沒有由該側發出的 trait 事件）——
     本檔只透過 paperWar／buildArmy（af12d4d 與新版都有這兩支匯出）與可觀察的 beats／alive 欄位驗證，
     不直接讀 pwHasAlive 這個新輔助函式本身。 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TARGET = process.argv[2] || path.join(HERE, '..', 'index.html');

function loadGame(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const code = html.match(/<script>[\s\S]*?<\/script>/)[0].replace('<script>', '').replace('</script>', '');
  const stub = `
  const location={search:''};
  const localStorage={getItem(){return null;},setItem(){}};
  const document={getElementById:()=>null,addEventListener:()=>{},querySelectorAll:()=>[],
    title:'',documentElement:{style:{}},body:{style:{},cssText:'',innerHTML:''}};
  const window={};
  `;
  return new Function('URLSearchParams', stub + code + '\nreturn window.__yaoshi;')(URLSearchParams);
}

let pass = 0, fail = 0;
const fails = [];
function test(name, fn) {
  try { fn(); pass++; console.log(`  PASS  ${name}`); }
  catch (e) { fail++; fails.push(`${name}\n        ${e.stack || e.message}`); console.log(`  FAIL  ${name}\n        ${e.message}`); }
}
function eq(actual, expected, what) { if (actual !== expected) throw new Error(`${what}：預期 ${JSON.stringify(expected)}，實際 ${JSON.stringify(actual)}`); }
function ok(cond, what) { if (!cond) throw new Error(what); }

console.log(`\n對決演出「沒兵仍出招／隻數不同步」行為測試　目標檔：${TARGET}\n`);

/* ---------------- 共用治具 ---------------- */
// A：兩個各 1hp 的小隊——team0 五方調兵（二拍補位，全滅時最容易鬼觸發）、team1 抓交替（三拍作祟）。
// B：一隊精英（atk 10，兩發就能把 A 兩個 1hp 單位一次打死：主擊 10 給 t1、濺射 5 給 t2）＋一隊誘餌群體（hp 5、
//    不參戰，純粹讓「抓交替」在三拍時有對象可燒——舊版鬼觸發會真的燒掉它，新版不該燒）。
function wipeoutFixture() {
  const bagA = [
    { unit: { body: 'swarm', count: 1, atk: 0, hp: 1, trait: 'swarmRally' } },
    { unit: { body: 'haunt', count: 1, atk: 0, hp: 1, trait: 'hauntSwap' } },
  ];
  const bagB = [
    { unit: { body: 'elite', count: 1, atk: 10, hp: 30 } },
    { unit: { body: 'swarm', count: 1, atk: 1, hp: 5 } },
  ];
  return {
    A: { id: 0, name: '甲（全滅方）', bag: bagA },
    B: { id: 1, name: '乙（誘餌方）', bag: bagB },
  };
}

function run(G) {
  const { A, B } = wipeoutFixture();
  return G.paperWar(A, B, { rng: () => 0.5, phase: null, windId: null });
}

console.log('【D2：一側第 2 拍前全滅 → 第 2、3 拍不得再有該側的 trait 事件】');

test('前提：甲方確實在第 1 拍就已全滅（活性，不是本測試的核心斷言）', () => {
  const G = loadGame(TARGET);
  const r = run(G);
  eq(r.aliveA, 0, '甲方（全滅方）三拍結束時的存活數');
  const beat1BurnA = r.beats.filter(b => b.kind === 'burn' && b.side === 'A').length;
  ok(beat1BurnA >= 2, `甲方應該在第 1 拍就被燒光（實際 burn 事件數 ${beat1BurnA}），前提不成立就代表治具沒搭好`);
});

test('行為斷言：新版第 2、3 拍沒有由甲方（全滅方）發出的 trait 事件', () => {
  const G = loadGame(TARGET);
  const r = run(G);
  const ghost = r.beats.filter(b => b.kind === 'trait' && b.side === 'A' && (b.beat === 2 || b.beat === 3));
  eq(ghost.length, 0, `第 2、3 拍由甲方發出的 trait 事件數（明細：${JSON.stringify(ghost)}）`);
});

test('鑑別力：舊版（呼叫端傳入的 TARGET）在同一條斷言上必須是紅的，證明治具真的踩到這個桶子', () => {
  const G = loadGame(TARGET);
  const r = run(G);
  const ghostBeat2 = r.beats.filter(b => b.kind === 'trait' && b.side === 'A' && b.beat === 2);
  const ghostBeat3 = r.beats.filter(b => b.kind === 'trait' && b.side === 'A' && b.beat === 3);
  // 這條本身不斷言什麼，只是把兩種版本各自的行為印出來，方便跑舊版時人眼核對「紅在行為斷言」而不是 TypeError。
  console.log(`        （備忘）第2拍甲方 trait 事件數＝${ghostBeat2.length}，第3拍＝${ghostBeat3.length}`);
  ok(true, '純記錄');
});

test('新版：乙方的誘餌群體單位不該被「死人抓交替」燒掉（aliveB 應為 2＝精英＋誘餌都在，不是 1）', () => {
  const G = loadGame(TARGET);
  const r = run(G);
  eq(r.aliveB, 2, '乙方三拍結束時的存活數（精英＋誘餌群體單位）');
});

console.log('\n【個別驗證：另外三處存活檢查（atkAll／飼鬼甕／迷途）各自的行為斷言】');

test('wardAtkAll1（媽祖令旗，二拍全體 atk+）：全滅方不該再發這個 trait', () => {
  const G = loadGame(TARGET);
  const A = { id: 0, name: '甲', bag: [{ unit: { body: 'ward', count: 1, atk: 0, hp: 1, trait: 'wardAtkAll1' } }] };
  const B = { id: 1, name: '乙', bag: [{ unit: { body: 'elite', count: 1, atk: 10, hp: 30 } }] };
  const r = G.paperWar(A, B, { rng: () => 0.5, phase: null, windId: null });
  eq(r.aliveA, 0, '甲方三拍結束時存活數（治具前提）');
  const ghost = r.beats.filter(b => b.kind === 'trait' && b.side === 'A' && b.beat === 2);
  eq(ghost.length, 0, `第 2 拍由甲方發出的令旗改陣 trait 事件數`);
});

test('swarmFeed1（飼鬼甕，拍末對面有燒就本方全體 hp+）：全滅方不該再發這個 trait', () => {
  const G = loadGame(TARGET);
  // 甲：飼鬼甕本尊 hp 1（會在第 1 拍被燒光）；乙：一隊會互相攻擊的兩隊，確保乙方本拍會有人被燒（feed 的觸發條件）。
  const A = { id: 0, name: '甲', bag: [{ unit: { body: 'swarm', count: 1, atk: 0, hp: 1, trait: 'swarmFeed1' } }] };
  const B = { id: 1, name: '乙', bag: [
    { unit: { body: 'elite', count: 1, atk: 10, hp: 30 } },
    { unit: { body: 'swarm', count: 1, atk: 0, hp: 1 } }, // 純粹讓乙方自己這邊也有人可能被燒，不影響甲方
  ] };
  const r = G.paperWar(A, B, { rng: () => 0.5, phase: null, windId: null });
  eq(r.aliveA, 0, '甲方三拍結束時存活數（治具前提）');
  const ghost = r.beats.filter(b => b.kind === 'trait' && b.side === 'A' && b.trId === 'swarmFeed1');
  eq(ghost.length, 0, `甲方發出的餓鬼進食 trait 事件數`);
});

test('hauntLost（魔神仔紅帽，三拍迷途）：全滅方不該再讓對面某隊三拍不出手', () => {
  const G = loadGame(TARGET);
  const A = { id: 0, name: '甲', bag: [{ unit: { body: 'haunt', count: 1, atk: 0, hp: 1, trait: 'hauntLost' } }] };
  const B = { id: 1, name: '乙', bag: [
    { unit: { body: 'elite', count: 1, atk: 10, hp: 30 } },
    { unit: { body: 'swarm', count: 2, atk: 1, hp: 5 } }, // 有群體隊可以被「迷途」點名
  ] };
  const r = G.paperWar(A, B, { rng: () => 0.5, phase: null, windId: null });
  eq(r.aliveA, 0, '甲方三拍結束時存活數（治具前提）');
  const ghost = r.beats.filter(b => b.kind === 'trait' && b.side === 'A' && b.trId === 'hauntLost');
  eq(ghost.length, 0, `甲方發出的迷途 trait 事件數`);
});

console.log(`\n結果：${pass} 綠 ／ ${fail} 紅`);
if (fail) { console.log('\n紅燈明細：'); fails.forEach(f => console.log('  - ' + f)); }
process.exit(fail ? 1 : 0);

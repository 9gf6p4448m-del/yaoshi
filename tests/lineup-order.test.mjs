/* 陣列卷 G1（docs/experiments/2026-09-07-acceptance-lineup.md）：pwArmyView 的名冊依拍序排（祖靈→香火→陰氣→無系），
   id 在排序前指派、不重排（beats 的 actor／target 靠它對位），同系內維持取得順序。
   跑法：node tests/lineup-order.test.mjs [--html=<index.html 路徑>]（對 ef24d07 的舊檔必紅在「fac 序列」） */
import path from 'path';
import { fileURLToPath } from 'url';
import { loadGame } from './tools/load.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const HTML = arg('html') || path.join(HERE, '..', 'index.html');
/* 舊版（ef24d07 以前）沒有 pwArmyView／BEAT_FAC 這兩個測試出口：對舊檔測時把它們注入匯出行，
   讓舊版紅在「fac 序列」這條行為斷言，而不是紅在「未匯出」這種旁枝錯誤（02 §6.1 第 1 條）。 */
import fs from 'fs';
import os from 'os';
let LOAD = HTML;
{
  const txt = fs.readFileSync(HTML, 'utf8');
  if (!/buildArmy,\s*pwArmyView/.test(txt) && /TRAITS, PHASES, buildArmy,/.test(txt)) {
    const tmp = path.join(os.tmpdir(), 'lineup-order-' + process.pid + '.html');
    fs.writeFileSync(tmp, txt.replace('TRAITS, PHASES, buildArmy,', 'TRAITS, PHASES, buildArmy, pwArmyView, BEAT_FAC,'));
    LOAD = tmp; console.log('  （舊檔：已注入 pwArmyView／BEAT_FAC 測試出口）');
  }
}
const MAXFIG = Number((fs.readFileSync(HTML, 'utf8').match(/MAXFIG:\s*(\d+)/) || [])[1]);
const Y = loadGame(LOAD);
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('  PASS ', name); } catch (e) { fail++; console.log('  FAIL ', name, '—', e.message); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}：得到 ${JSON.stringify(a)}，預期 ${JSON.stringify(b)}`); };

console.log(`陣列卷 G1：目標檔 ${path.basename(HTML)}`);
if (typeof Y.pwArmyView !== 'function') { console.log('  FAIL  pwArmyView 未匯出（舊版沒有這個測試出口）'); fail++; }
else {
  const by = (fac, k = 0) => Y.POOL.filter((x) => x.f === fac && x.unit)[k];
  // 取得順序刻意反過來：陰氣、香火、祖靈、再一件陰氣（同系第二件要排在同系第一件之後）
  const bag = [by('yinqi', 0), by('xianghuo', 0), by('zuling', 0), by('yinqi', 1)].map((x) => ({ ...x, unit: { ...x.unit } }));
  const p = { bag, id: 0, name: 'T' };
  const v = Y.pwArmyView(p);
  const a = Y.buildArmy(bag);
  const raw = []; a.teams.forEach((tm) => tm.units.forEach(() => raw.push({ body: tm.body, fac: tm.fac, ab: tm.ab || null })));
  const order = Y.BEAT_FAC;

  t('fac 序列＝祖靈…→香火…→陰氣…（不是取得順序）', () => {
    const facs = v.units.map((u) => u.fac);
    const rank = (f) => (f ? order.indexOf(f) : order.length);
    for (let i = 1; i < facs.length; i++) if (rank(facs[i]) < rank(facs[i - 1])) throw new Error(`第 ${i} 隻 ${facs[i]} 排在 ${facs[i - 1]} 之後`);
    if (facs[0] !== 'zuling') throw new Error(`第一隻是 ${facs[0]}，不是祖靈`);
    if (facs[facs.length - 1] !== 'yinqi') throw new Error(`最後一隻是 ${facs[facs.length - 1]}，不是陰氣`);
  });
  t('id 指回 buildArmy 展開的同索引單位（body／fac／ab 逐項相同）', () => {
    for (const u of v.units) eq({ body: u.body, fac: u.fac, ab: u.ab }, raw[u.id], `id ${u.id}`);
    eq([...v.units.map((u) => u.id)].sort((x, y) => x - y), raw.map((_, i) => i), 'id 集合');
  });
  t('同系內 id 遞增（穩定：同系保留取得順序）', () => {
    for (let i = 1; i < v.units.length; i++) if (v.units[i].fac === v.units[i - 1].fac && v.units[i].id < v.units[i - 1].id) throw new Error(`同系 ${v.units[i].fac} 內 id ${v.units[i].id} 排在 ${v.units[i - 1].id} 後`);
  });
  t('隻數與組成不受排序影響', () => {
    eq(v.units.length, raw.length, '隻數');
    // comp 的鍵序無語意（pwCompText 走 PW_BODY 的鍵序），只比 (body,count) 集合
    const comp = {}; raw.forEach((u) => { comp[u.body] = (comp[u.body] || 0) + 1; });
    eq(Object.entries(v.comp).sort(), Object.entries(comp).sort(), 'comp');
  });
  t('MAXFIG＝10（裁甲；讀 index.html 的 PW_FX.MAXFIG 字面值）', () => { if (MAXFIG !== 10) throw new Error(`MAXFIG=${MAXFIG}`); });

  /* 傷害可讀性批 2-a 覆審 MEDIUM-4：己方受擊紅暈該閃在哪一側。
     舊版寫死「席位 id 0＝南家」，熱座的玩家二（另一個真人座位）一輩子看不到紅暈。
     判準改成「座位的 ai 旗標」：!p.ai＝真人。對舊版（沒有 pwHumanSides 這個出口）會紅在「未匯出」，
     那是旁枝錯誤——所以這裡先明說：舊版本來就沒有這支函式，這條是新增的行為斷言。 */
  if (typeof Y.pwHumanSides !== 'function') { console.log('  FAIL  pwHumanSides 未匯出（批 2-a 覆審 MEDIUM-4 的測試出口）'); fail++; }
  else {
    // id 刻意都不給 0：舊版的判準是「席位 id 0＝南家」，用非 0 的 id 才分得出新舊
    const H = (ai, id) => ({ id: id === undefined ? 2 : id, name: 'p', ai: ai });
    t('紅暈側別：真人那一側（跟席位 id 無關；AI 對 AI 的旁觀場兩側都不閃）', () => {
      eq(Y.pwHumanSides(H(null, 1), H({ aggr: 1 }, 2)), ['A'], '真人在 A（id 1，不是 0）');
      eq(Y.pwHumanSides(H({ aggr: 1 }, 3), H(null, 2)), ['B'], '真人在 B（id 2）');
      eq(Y.pwHumanSides(H({ aggr: 1 }, 0), H({ aggr: 1 }, 1)), [], 'AI vs AI（其中一個還坐在 id 0）');
    });
    t('紅暈側別：熱座兩位真人對打時**兩側都閃**（各自被打各自閃）', () => {
      eq(Y.pwHumanSides(H(null, 1), H(null, 2)), ['A', 'B'], '兩位真人，兩邊 id 都不是 0');
    });
    t('紅暈側別：座位物件缺失時不當成真人（不會誤閃）', () => {
      eq(Y.pwHumanSides(null, H(null)), ['B'], 'A 缺');
      eq(Y.pwHumanSides(undefined, undefined), [], '兩邊都缺');
    });
  }
}
console.log(`結果：${pass} 綠 ／ ${fail} 紅`);
process.exit(fail ? 1 : 0);

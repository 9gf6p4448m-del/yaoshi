/* 刀印帽小盲讀評分（凍結檔 §2.1 修訂三 ④ ＋ 修訂四）。就地跑：
     node docs/experiments/2026-09-12-emblem-fix-evidence/blindread/score.mjs
   材料：sheets-after（回修後 ae2c459）／sheets-before（基準 417b197）各 8 張＝knife／seal／hat 的 t1＋t2 ＋ bell 對照 t1＋t2。
   三對讀者 p1／p2／p3，各自混洗（seed 20260921／22／23），A 正讀 B 倒讀。
   ★判準（答卷回來前寫死，本檔 commit 時間戳先於 pN-reader-*.json）★
   1. 每格（set, trait, tier）每對：兩位 Q1 皆對且 Q2 皆 ≥4 ＝ 該對 ✅；三對中 ≥2 對 ✅ ＝ 多數 ✅（修訂三 ①）。
   2. 小盲讀通過 ＝ knife／seal／hat 三枚的 t1 與 t2 共六格全部多數 ✅；任一格紅即「未過」，列出哪枚哪格。
   3. 反向判準（材料鑑別力，修訂四 ②只計 t1）：同招改前六位 Q2 中位數比改後低 ≥1；三枚 t1 全 ✅ 才算材料有效。
   4. bell 為已知可辨對照（批 0 六讀者 Q1 6/6）：t1／t2 多數 ✅ 為「材料仍可辨」的參考，不列入 2。 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const D = path.dirname(fileURLToPath(import.meta.url)), EV = path.join(D, '..');
const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const NAME = { eliteSelfCut: '獻祭刀', biteGamble: '虎爺印', hauntLost: '魔神仔紅帽', wardImmuneLost: '千里眼銅鈴' };
const KIND = { eliteSelfCut: 'knife', biteGamble: 'seal', hauntLost: 'hat', wardImmuneLost: 'bell' };
const after = rd(path.join(EV, 'sheets-after/mapping-HIDDEN.json')).mapping;
const before = rd(path.join(EV, 'sheets-before/mapping-HIDDEN.json')).mapping;
const cell = {}; // key set|trait|tier -> [{pair,A,B,pass}]
const pairs = ['p1', 'p2', 'p3'];
for (const p of pairs) {
  const map = rd(path.join(D, p, `${p}-shuffle-mapping-HIDDEN.json`)).map;
  const A = Object.fromEntries(rd(path.join(D, p, `${p}-reader-A.json`)).map((r) => [r.sheet, r]));
  const B = Object.fromEntries(rd(path.join(D, p, `${p}-reader-B.json`)).map((r) => [r.sheet, r]));
  for (const { code, orig } of map) {
    const set = orig[0] === 'a' ? 'after' : 'before';
    const m = (set === 'after' ? after : before).find((x) => x.code === `a${orig.slice(1)}`);
    const a = A[code], b = B[code], nm = NAME[m.trait];
    const ok = (r) => r.guess === nm && r.q2 >= 4;
    (cell[`${set}|${m.trait}|${m.tier}`] ??= []).push({ pair: p, A: `${a.guess}/${a.q2}`, B: `${b.guess}/${b.q2}`, q2: [a.q2, b.q2], pass: ok(a) && ok(b) });
  }
}
const med = (x) => { x = [...x].sort((u, v) => u - v); const n = x.length; return n % 2 ? x[(n - 1) / 2] : (x[n / 2 - 1] + x[n / 2]) / 2; };
const out = []; const say = (s) => { out.push(s); console.log(s); };
say('刀印帽小盲讀（三對多數）');
say('set    trait          tier  p1(A|B)                 p2(A|B)                 p3(A|B)                 多數');
const majority = {};
for (const k of Object.keys(cell).sort()) {
  const v = cell[k]; const n = v.filter((x) => x.pass).length; majority[k] = n >= 2;
  const [set, t, tier] = k.split('|');
  say(`${set.padEnd(6)} ${t.padEnd(14)} ${tier}     ${v.map((x) => `${(x.A + '|' + x.B).padEnd(23)}`).join(' ')} ${n >= 2 ? '✅' : '❌'} ${n}/3`);
}
say('');
const three = ['eliteSelfCut', 'biteGamble', 'hauntLost'];
const red = []; for (const t of three) for (const tier of [1, 2]) if (!majority[`after|${t}|${tier}`]) red.push(`${NAME[t]}(${KIND[t]}) t${tier}`);
say(`判準 2 小盲讀：${red.length ? '❌ 未過 — 紅格：' + red.join('、') : '✅ 通過（三枚六格全多數 ✅）'}`);
const rev = [];
for (const t of three) { const b = cell[`before|${t}|1`].flatMap((x) => x.q2), a = cell[`after|${t}|1`].flatMap((x) => x.q2); const ok = med(a) - med(b) >= 1; rev.push(ok); say(`判準 3 反向 ${NAME[t]} t1：改前 ${JSON.stringify(b)} 中位 ${med(b)} → 改後 ${JSON.stringify(a)} 中位 ${med(a)} ${ok ? '✅' : '❌'}`); }
say(`判準 3 材料鑑別力：${rev.every(Boolean) ? '✅' : '❌'}`);
say(`判準 4 bell 對照：t1 ${majority['after|wardImmuneLost|1'] ? '✅' : '❌'}／t2 ${majority['after|wardImmuneLost|2'] ? '✅' : '❌'}（參考）`);
fs.writeFileSync(path.join(D, 'score.txt'), out.join('\n') + '\n');
fs.writeFileSync(path.join(D, 'score.json'), JSON.stringify({ cell, majority }, null, 1));

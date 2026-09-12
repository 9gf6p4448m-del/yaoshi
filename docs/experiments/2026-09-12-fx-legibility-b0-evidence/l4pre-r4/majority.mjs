/* 修訂三 ① 三對取多數＋反向判準（改前 Q2 中位數比改後低 ≥1）。就地跑：
   node docs/experiments/2026-09-12-fx-legibility-b0-evidence/l4pre-r4/majority.mjs
   讀 l4pre-r2／r3／r4 的 rN-score.json（三對＝有效材料 844×390@2x 上的三輪；r1 視口錯不計）。 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const EV=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const rounds=['r2','r3','r4']; const S={};
for(const r of rounds){const j=JSON.parse(fs.readFileSync(path.join(EV,`l4pre-${r}`,`${r}-score.json`),'utf8'));
  for(const row of j.rows){const k=`${row.set}|${row.trait}|${row.tier}`;(S[k]??=[]).push({r,A:row.A,B:row.B,pass:row.pass});}}
const med=a=>{a=[...a].sort((x,y)=>x-y);const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2;};
const q2=x=>Number(String(x).split('/').pop());
console.log('方向① 多數決（三對中 ≥2 對「兩位皆對且 Q2≥4」）');
for(const k of Object.keys(S).filter(k=>/^after\|(eliteVsSwarm|eliteOpenShot)\|/.test(k))){
  const v=S[k];const n=v.filter(x=>x.pass).length;console.log(' ',k.padEnd(28),v.map(x=>`${x.r}:${x.pass?'✅':'❌'}`).join(' '),'=> 多數',n>=2?'✅':'❌',`(${n}/3)`);}
console.log('方向② 反向判準（同招改前 Q2 中位數比改後低 ≥1；六位讀者）');
for(const t of ['eliteSelfCut','biteGamble','wardImmuneLost','hauntLost']) for(const tier of [1,2]){
  const b=(S[`before|${t}|${tier}`]||[]).flatMap(x=>[q2(x.A),q2(x.B)]), a=(S[`after|${t}|${tier}`]||[]).flatMap(x=>[q2(x.A),q2(x.B)]);
  console.log(' ',`${t} t${tier}`.padEnd(20),'改前',JSON.stringify(b),'中位',med(b),'| 改後',JSON.stringify(a),'中位',med(a),'|',med(a)-med(b)>=1?'✅':'❌',t==='eliteSelfCut'||t==='biteGamble'?'(對照組)':'(參考)');}

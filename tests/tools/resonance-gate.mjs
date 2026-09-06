/* 共鳴接入紙紮夜戰 閘門治具（設計卷 A 段，2026-09-06）
   驗收條件與門檻凍結於 docs/experiments/2026-09-06-acceptance-resonance-pw.md，本腳本不得為了過而調門檻。
   跑法：git show 31504b0:index.html > old.html（repo 根），再
     node tests/tools/resonance-gate.mjs 10000 [--only=R0,R1] [--old=old.html] [--new=index.html] [--modes=1,2,3] */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {loadGame} from './load.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.join(HERE,'..','..');
const argv=process.argv.slice(2);
const N=Number(argv.find(a=>/^\d+$/.test(a))||10000);
const arg=k=>{ const a=argv.find(x=>x.startsWith('--'+k+'=')); return a?a.slice(k.length+3):null; };
const NEW=arg('new')||path.join(ROOT,'index.html');
const OLD=arg('old')||path.join(ROOT,'old.html');
const ONLY=(arg('only')||'').split(',').filter(Boolean);
const MODES=(arg('modes')||'1,2,3').split(',').map(Number);
const want=id=>!ONLY.length||ONLY.includes(id);
const SEEDS=Array.from({length:N},(_,i)=>i+1);
const pct=v=>(v*100).toFixed(2)+'%';
const say=(...s)=>console.log(s.join(' '));
const t0=Date.now(); const lap=()=>`（${((Date.now()-t0)/1000).toFixed(0)}s）`;
const MODE_NAME={0:'關',1:'M1 同系列陣 hp',2:'M2 共鳴拍 atk',3:'M3 共鳴增員'};

const load=m=>{ const g=loadGame(NEW); g.CFG.PW_RES_MODE=m; return g; };
const G={0:load(0)}; for(const m of MODES) G[m]=load(m);
const O=fs.existsSync(OLD)?loadGame(OLD):null;
const verdict={};
say(`# 共鳴接入紙紮夜戰 閘門　n=${N}　新版=${path.basename(NEW)}　基準=${path.basename(OLD)}　候選=${MODES.join(',')}`); say('');

/* R0 kill switch */
if(want('R0')){
  say('## R0 Kill switch（MODE 0 與 31504b0 trace(1..20) 逐位元組相等；各候選必不等）');
  if(!O){ say('❌ 找不到 old.html'); verdict.R0=false; }
  else{
    const tr=g=>JSON.stringify(g.trace(Array.from({length:20},(_,i)=>i+1)));
    const oldT=tr(O), t00=tr(G[0]);
    const eq0=(t00===oldT); let ok=eq0;
    say(`- MODE 0 vs 基準：長度 ${t00.length}/${oldT.length}，${eq0?'相等 ✅':'**不相等** ❌'}`);
    for(const m of MODES){ const t=tr(G[m]); const ne=(t!==oldT); if(!ne) ok=false; say(`- ${MODE_NAME[m]} vs 基準：${ne?'不相等 ✅':'**相等** ❌'}`); }
    verdict.R0=ok; say(`- 判定：${ok?'✅':'❌'} ${lap()}`);
  }
  say('');
}

/* R1 活性 + R3 策略（共用 runMany） */
const run={};
if(want('R1')||want('R3')){
  const pols=['splitter','greedy','hoarder','specialist'];
  for(const m of [0,...MODES]){
    const g=G[m]; run[m]={};
    g.PW_RES_STAT.duels=0; g.PW_RES_STAT.hit=0;
    run[m].def=g.runMany({n:N});
    run[m].live={duels:g.PW_RES_STAT.duels,hit:g.PW_RES_STAT.hit};
    for(const p of pols) run[m][p]=g.runMany({n:N,policies:{0:g.POLICIES[p]}});
  }
}
if(want('R1')){
  say('## R1 活性（預設 AI 桌，共鳴至少一側生效的正式對決比例 ≥20%）');
  say('| 候選 | 對決數 | 生效數 | 比例 | 判定 |'); say('|---|---|---|---|---|');
  let ok=true; verdict.R1={};
  for(const m of MODES){ const L=run[m].live; const r=L.duels?L.hit/L.duels:0; const pass=r>=0.20; verdict.R1[m]=pass; if(!pass) ok=false;
    say(`| ${MODE_NAME[m]} | ${L.duels} | ${L.hit} | ${pct(r)} | ${pass?'✅':'❌'} |`); }
  say(`- 判定：${ok?'✅ 全過':'❌ 有候選未過'} ${lap()}`); say('');
}
if(want('R3')){
  say('## R3 無支配策略（座位 0 勝率各 ≤40%；位移＝相對 MODE 0，只報不判）');
  say('| 策略 | MODE 0 | '+MODES.map(m=>MODE_NAME[m]+'（位移）').join(' | ')+' |'); say('|---|---|'+MODES.map(()=>'---').join('|')+'|');
  let ok=true; verdict.R3={}; for(const m of MODES) verdict.R3[m]=true;
  for(const p of ['splitter','greedy','hoarder','specialist']){
    const b=run[0][p].winRate[0];
    const cells=MODES.map(m=>{ const v=run[m][p].winRate[0]; const pass=v<=0.40; if(!pass){ ok=false; verdict.R3[m]=false; } const d=(v-b)*100; return `${pct(v)}（${(d>=0?'+':'')+d.toFixed(2)}pp）${pass?'':' ❌'}`; });
    say(`| ${p} | ${pct(b)}${b>0.40?' ❌':''} | ${cells.join(' | ')} |`);
  }
  say(`- 預設桌平均局長：MODE 0 ${run[0].def.avgGameLength.toFixed(2)}；`+MODES.map(m=>`${MODE_NAME[m]} ${run[m].def.avgGameLength.toFixed(2)}`).join('；'));
  say(`- 判定：${ok?'✅':'❌'} ${lap()}`); say('');
}

/* R2 袋對袋 */
if(want('R2')){
  say('## R2 有感但不支配（同系 3 件 vs 三系各 1 件、總 p 相等；基準 40–60% 者為有效對照，≥3 組；候選下成套袋 55–75%）');
  const g0=G[0]; const pool=g0.POOL.filter(x=>!x.curse);
  const facs=['zuling','xianghuo','yinqi'];
  const byF={}; for(const f of facs) byF[f]=pool.filter(x=>x.f===f);
  const combos=arr=>{ const out=[]; for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++)for(let k=j+1;k<arr.length;k++) out.push([arr[i],arr[j],arr[k]]); return out; };
  const sumP=b=>b.reduce((s,x)=>s+x.p,0);
  const mixed=[]; for(const a of byF.zuling)for(const b of byF.xianghuo)for(const c of byF.yinqi) mixed.push([a,b,c]);
  /* 候選配對：每個同系三件組配「總 p 相等」的第一個混系組（決定性）；先用 n=2000 篩基準 40–60%，再用 n=N 確認 */
  const cand=[];
  for(const f of facs) for(const s of combos(byF[f])){ const m=mixed.find(x=>sumP(x)===sumP(s)&&!x.some(y=>s.includes(y))); if(m) cand.push({f,set:s,mix:m}); }
  const bag=b=>b.map(x=>({...x}));
  const S2=Array.from({length:2000},(_,i)=>i+1);
  const screened=cand.filter(c=>{ const r=g0.duelBags(bag(c.set),bag(c.mix),S2).rateDecided; return r>=0.40&&r<=0.60; });
  say(`- 候選配對 ${cand.length} 組，n=2000 快篩落在 40–60% 者 ${screened.length} 組；取每系前 2 組（最多 6 組）用 n=${N} 確認`);
  const pick=[]; for(const f of facs) pick.push(...screened.filter(c=>c.f===f).slice(0,2));
  say('| 系 | 成套袋 | 混系袋 | p | 基準 | '+MODES.map(m=>MODE_NAME[m]).join(' | ')+' |'); say('|---|---|---|---|---|'+MODES.map(()=>'---').join('|')+'|');
  let valid=0; const passCount={}; for(const m of MODES) passCount[m]=0;
  for(const c of pick){
    const base=g0.duelBags(bag(c.set),bag(c.mix),SEEDS).rateDecided;
    const isValid=base>=0.40&&base<=0.60; if(isValid) valid++;
    const cells=MODES.map(m=>{ const v=G[m].duelBags(bag(c.set),bag(c.mix),SEEDS).rateDecided; const pass=v>=0.55&&v<=0.75; if(isValid&&pass) passCount[m]++; return `${pct(v)} ${isValid?(pass?'✅':'❌'):'—'}`; });
    say(`| ${c.f} | ${c.set.map(x=>x.n).join('＋')} | ${c.mix.map(x=>x.n).join('＋')} | ${sumP(c.set)} | ${pct(base)}${isValid?'':'（無效對照）'} | ${cells.join(' | ')} |`);
  }
  verdict.R2={};
  if(valid<3){ say(`- 有效對照僅 ${valid} 組 <3 → **無法判定**`); for(const m of MODES) verdict.R2[m]=null; }
  else for(const m of MODES){ verdict.R2[m]=(passCount[m]===valid); say(`- ${MODE_NAME[m]}：${passCount[m]}/${valid} 有效對照落在 55–75% → ${verdict.R2[m]?'✅':'❌'}`); }
  say(`- ${lap()}`); say('');
}

/* R4 命格活性（單元斷言） */
if(want('R4')){
  say('## R4 命格活性（過陰咒 life<15／山神庇佑 life≥30 使 lv 至少 +1）');
  let ok=true;
  for(const m of MODES){
    const g=G[m]; const by=n=>({...g.POOL.find(x=>x.n===n)});
    const yin=g.POOL.filter(x=>x.f==='yinqi'&&x.ab!=='guoyin').slice(0,2).map(x=>({...x}));
    const zu=g.POOL.filter(x=>x.f==='zuling'&&x.ab!=='shanshen').slice(0,2).map(x=>({...x}));
    const gA=g.pwResLv({bag:[by('過陰咒'),...yin],life:10},'yinqi'), gB=g.pwResLv({bag:[by('過陰咒'),...yin],life:20},'yinqi');
    const sA=g.pwResLv({bag:[by('山神庇佑'),...zu],life:35},'zuling'), sB=g.pwResLv({bag:[by('山神庇佑'),...zu],life:20},'zuling');
    const p1=(gA-gB)>=1, p2=(sA-sB)>=1; if(!(p1&&p2)) ok=false;
    say(`- ${MODE_NAME[m]}：過陰咒 lv ${gB}→${gA} ${p1?'✅':'❌'}；山神庇佑 lv ${sB}→${sA} ${p2?'✅':'❌'}`);
  }
  verdict.R4=ok; say(`- 判定：${ok?'✅':'❌'} ${lap()}`); say('');
}
say('## 總表'); say('```'); say(JSON.stringify(verdict,null,1)); say('```');

// 普通版 H9 加強候選試跑（規則見同目錄 acceptance.md）。
// 與 tests/tools/l1-destiny-run.mjs 的 ordinaryH1／ordinaryH9 分支同策略，差別只在：以替換過字面值的
// index.html 原文載入引擎（磁碟上的 index.html 不動）。
// 用法：node docs/experiments/2026-09-24-h9-boost/pilot.mjs <cand> <arm> <n> <out.json（須在 scratchpad/）>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../../../tests/tools/load.mjs';
import {createChaser,disableChainEffects} from '../../../tests/tools/l1-balance.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const SCRATCH=path.join(ROOT,'scratchpad');
const CHAIN_IDS=['water','eyes','twinTiger','bloodOath','godKing','eternalFlame'];
const TIGER='atk:9,hp:8,trait:"twinTigerSweep"';
const BLOOD='hasFlag(sd.p,"bloodSacrifice")&&sd.p.life<=15) a+=1;';
export const CANDIDATES={
  base:[],
  'tiger-S':[[TIGER,'atk:10,hp:10,trait:"twinTigerSweep"']],
  'tiger-M':[[TIGER,'atk:11,hp:12,trait:"twinTigerSweep"']],
  'blood-S':[[BLOOD,'hasFlag(sd.p,"bloodSacrifice")&&sd.p.life<=20) a+=1;']],
  'blood-M':[[BLOOD,'hasFlag(sd.p,"bloodSacrifice")&&sd.p.life<=20) a+=2;']],
};

export function candidateSource(cand){
  let text=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  if(!Object.hasOwn(CANDIDATES,cand)) throw Error(`unknown candidate ${cand}`);
  for(const [from,to] of CANDIDATES[cand]){
    const hits=text.split(from).length-1;
    if(hits!==1) throw Error(`${cand}: expected exactly 1 match, got ${hits}`);
    text=text.replace(from,to);
  }
  return text;
}

export function runPilotArm(cand,arm,seeds){
  const source=candidateSource(cand);
  const G=loadGame(path.join(ROOT,'index.html'),{sourceText:source});
  let policies={},picks;
  if(arm.startsWith('h9-')){
    if(arm.startsWith('h9-zero-')) disableChainEffects(G,arm.slice('h9-zero-'.length));
    else if(arm!=='h9-normal') throw Error(`unknown arm ${arm}`);
  }else if(arm.startsWith('h1-')){
    const target=arm.slice(3);
    if(target!=='splitter'&&!CHAIN_IDS.includes(target)) throw Error(`unknown arm ${arm}`);
    policies={0:target==='splitter'?G.POLICIES.splitter:createChaser(G,target)};
    picks=['qingmian'];
  }else throw Error(`unknown arm ${arm}`);
  const rows=seeds.map(seed=>{
    const r=G.playPolicyGame(seed,policies,picks,{trueEffects:'off',destinyAiChase:false,
      recordChainHoldings:true,recordDestinyEvidence:false,policyInformation:false});
    return {seed,winnerId:r.winnerId,holders:{twinTiger:r.chainHoldings.holders.twinTiger||[],
      bloodOath:r.chainHoldings.holders.bloodOath||[]}};
  });
  return {cand,arm,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),
    seeds:[seeds[0],seeds.at(-1)],rows};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [cand,arm,n,out]=process.argv.slice(2);
  const abs=path.resolve(out||'');
  if(!abs.startsWith(SCRATCH+path.sep)) throw Error('output must stay in scratchpad/');
  const seeds=Array.from({length:Number(n)},(_,i)=>30001+i);
  const t=Date.now();
  const result=runPilotArm(cand,arm,seeds);
  fs.mkdirSync(path.dirname(abs),{recursive:true});
  fs.writeFileSync(abs,JSON.stringify(result),{flag:'wx'});
  process.stdout.write(`${cand} ${arm} ${seeds.length} ${Date.now()-t}ms → ${abs}\n`);
}

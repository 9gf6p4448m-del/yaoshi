// 普通版雙虎買路錢加稅候選試跑（規則見同目錄 acceptance.md）。
// 與 ../2026-09-24-h9-boost/pilot.mjs 同策略與選項，差別：候選改 bidFee 盯上稅，並注入唯讀的避標記錄。
// 用法：node docs/experiments/2026-09-24-tiger-toll/pilot.mjs <cand> <arm> <n> <out.json（須在 scratchpad/）>
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
const TOLL='+(tigerMarked?1:0);';
export const CANDIDATES={
  base:[],
  'toll-S':[[TOLL,'+(tigerMarked?2:0);']],
  'toll-M':[[TOLL,'+(tigerMarked?3:0);']],
};
// 避標記錄：AI 出價產生後、夜規前置處理前，只讀 all／S.marks，不耗亂數、不改結算。
const AUDIT_ANCHOR='  /* 市集規則的出價前置處理：';
const AUDIT_CODE='  if(S.marks) S.players.forEach(h=>{ if(!h.alive||!hasFlag(h,"markTax")) return; const i=S.marks[h.id]; if(i===undefined||i===null||i<0||!S.market[i]) return;'
  +' S.players.forEach(o=>{ if(o.id===h.id||!o.alive) return; storage.__tollAudit?.(!!(all[o.id]&&all[o.id][i]&&all[o.id][i].amt>0)); }); });\r\n';

export function candidateSource(cand,{audit=false}={}){
  let text=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  if(!Object.hasOwn(CANDIDATES,cand)) throw Error(`unknown candidate ${cand}`);
  const swap=(from,to)=>{
    const hits=text.split(from).length-1;
    if(hits!==1) throw Error(`${cand}: expected exactly 1 match for ${from}, got ${hits}`);
    text=text.replace(from,to);
  };
  for(const [from,to] of CANDIDATES[cand]) swap(from,to);
  if(audit) swap(AUDIT_ANCHOR,AUDIT_CODE+AUDIT_ANCHOR);
  return text;
}

export function runPilotArm(cand,arm,seeds,{audit=true}={}){
  const source=candidateSource(cand,{audit});
  const tally={opp:0,bid:0};
  const storage={getItem(){return null;},setItem(){},__tollAudit:b=>{tally.opp++;if(b)tally.bid++;}};
  const G=loadGame(path.join(ROOT,'index.html'),{sourceText:source,storage});
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
    tally.opp=0;tally.bid=0;
    const r=G.playPolicyGame(seed,policies,picks,{trueEffects:'off',destinyAiChase:false,
      recordChainHoldings:true,recordDestinyEvidence:false,policyInformation:false});
    return {seed,winnerId:r.winnerId,holders:{twinTiger:r.chainHoldings.holders.twinTiger||[]},
      toll:{opp:tally.opp,bid:tally.bid}};
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

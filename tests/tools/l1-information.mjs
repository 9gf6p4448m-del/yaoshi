import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadGame} from './load.mjs';
import {createChaser,disableChainEffects,validateSeeds} from './l1-balance.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../..');
const DEFAULT_TARGET=path.join(ROOT,'index.html');
export const ARMS=['informed-normal','increment-blind-normal','informed-zero'];
const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const zeroBid=()=>({amt:0,type:'cons',intent:'keep',target:null});
const positive=n=>Number.isSafeInteger(n)&&n>0;

export function blindLegalContext(ctx){
  if(!ctx) return null;
  const count=Math.max(0,ctx.basePreviewCount||0);
  return {...ctx,preview:(ctx.preview||[]).slice(0,count),previousReveal:null};
}

/** All inputs are explicit public or legally delivered information. */
export function planEyesBids({baseBids,market,cap,budget,fee,maxBids,legalContext}){
  const out=baseBids.map(zeroBid);
  if(!out.length) return out;
  let target=-1,best=-Infinity;
  market.forEach((item,i)=>{
    if(!item?.curse&&item.p>best){ target=i;best=item.p; }
  });
  const previous=legalContext?.previousReveal;
  const seen=previous?.items?.reduce((max,item)=>Number.isFinite(item.secondBid)?Math.max(max,item.secondBid):max,-Infinity);
  const baseAmount=i=>Math.max(0,baseBids[i]?.amt||0);
  let desired=target>=0?baseAmount(target):0;
  if(target>=0&&Number.isFinite(seen))
    desired=Math.min(cap,Math.max(desired,Math.min(desired+2,seen+1)));
  const preview=legalContext?.preview||[];
  const futureBest=preview.reduce((p,item)=>!item?.curse&&Number.isFinite(item.p)?Math.max(p,item.p):p,-Infinity);
  const reserve=futureBest>best?2:0;
  const spendable=Math.max(0,budget-reserve);
  const order=target<0?out.map((_,i)=>i):[target,...out.map((_,i)=>i).filter(i=>i!==target)];
  const bidLimit=maxBids>0?maxBids:Infinity;
  let spent=0,count=0;
  for(const i of order){
    if(count>=bidLimit) break;
    const original=baseBids[i];
    const wanted=i===target?desired:baseAmount(i);
    if(wanted<=0) continue;
    const affordable=Math.floor(spendable-spent-fee);
    const amount=Math.min(wanted,cap,affordable);
    if(amount<=0) continue;
    out[i]=i===target?{amt:amount,type:'cons',intent:'keep',target:null}:{...original,amt:amount};
    spent+=amount+fee;count++;
  }
  return out;
}

export function createEyesPolicy(G,mode='informed',decisions=null){
  if(!['informed','blind'].includes(mode)) throw Error(`unknown eyes policy mode ${mode}`);
  const base=createChaser(G,'eyes');
  return (p,ctx)=>{
    const baseBids=base(p);
    const market=G.S.market.map(({n,p,curse})=>({n,p,curse}));
    const common={baseBids,market,cap:G.consCapFor(p),budget:G.budgetFor(p),
      fee:G.CFG.BID_FEE,maxBids:G.CFG.MAX_BIDS};
    const blind=planEyesBids({...common,legalContext:blindLegalContext(ctx)});
    const informed=mode==='informed'?planEyesBids({...common,legalContext:ctx}):blind;
    if(decisions){
      decisions.calls++;
      if(ctx?.preview?.length>ctx?.basePreviewCount) decisions.extraPreviewAvailable++;
      if(ctx?.previousReveal?.items?.some(item=>item.secondBid!=null)) decisions.revealAvailable++;
      if(informed.some((bid,i)=>bid.amt!==blind[i].amt)) decisions.informedVsBlindDiff++;
    }
    return informed;
  };
}

export function summarizeArm(rows,arm){
  const games=rows.length,wins=rows.filter(row=>row.winnerId===0).length;
  const held=rows.filter(row=>row.eyesHolders.length>0);
  const everHeldWinnerGames=held.filter(row=>row.eyesHolders.includes(row.winnerId)).length;
  return {arm,games,wins,winRate:games?wins/games:null,everHeldGames:held.length,
    everHeldWinnerGames,everHeldWinnerRate:held.length?everHeldWinnerGames/held.length:null};
}

export function comparePaired(rowsA,rowsB){
  const keyed=rows=>{
    const map=new Map();
    for(const row of rows){
      if(!positive(row.seed)||map.has(row.seed)) throw Error(`duplicate or invalid seed ${row.seed}`);
      map.set(row.seed,row);
    }
    return map;
  };
  const a=keyed(rowsA),b=keyed(rowsB);
  if(a.size!==b.size||[...a.keys()].some(seed=>!b.has(seed))) throw Error('missing seed in matched pairs');
  const delta=[...a].reduce((sum,[seed,row])=>sum+(row.winnerId===0?1:0)-(b.get(seed).winnerId===0?1:0),0);
  return {pairs:a.size,winDiffPp:a.size?100*delta/a.size:null};
}

function gameRow(G,seed,arm){
  const decisions={calls:0,extraPreviewAvailable:0,revealAvailable:0,informedVsBlindDiff:0};
  const policy=createEyesPolicy(G,arm==='increment-blind-normal'?'blind':'informed',decisions);
  const result=G.playPolicyGame(seed,{0:policy},['qingmian'],
    {policyInformation:true,recordChainHoldings:true});
  if(!result.chainHoldings) throw Error('engine did not return opt-in chain holdings');
  return {arm,seed,roles:G.S.players.map(p=>p.roleId),winnerId:result.winnerId,
    gameLength:result.gameLength,alive0:G.S.players[0].alive,
    eyesHolders:result.chainHoldings.holders.eyes||[],
    eyesFirstHeld:result.chainHoldings.first.eyes||{},policyDecisions:decisions};
}

export function runExperiment({target=DEFAULT_TARGET,seeds=Array.from({length:20},(_,i)=>i+1)}={}){
  seeds=validateSeeds(seeds);
  const absolute=path.resolve(target),rows=[];
  let cfg;
  for(const arm of ARMS){
    const G=loadGame(absolute);
    cfg??=structuredClone(G.CFG);
    if(arm==='informed-zero') disableChainEffects(G,'eyes');
    for(const seed of seeds) rows.push(gameRow(G,seed,arm));
  }
  const byArm=Object.fromEntries(ARMS.map(arm=>[arm,rows.filter(row=>row.arm===arm)]));
  const summary=Object.fromEntries(ARMS.map(arm=>[arm,summarizeArm(byArm[arm],arm)]));
  const decisionSummary=Object.fromEntries(ARMS.map(arm=>[arm,byArm[arm].reduce((sum,row)=>{
    for(const key of Object.keys(sum)) sum[key]+=row.policyDecisions[key];
    return sum;
  },{calls:0,extraPreviewAvailable:0,revealAvailable:0,informedVsBlindDiff:0})]));
  const paired={normalMinusBlind:comparePaired(byArm['informed-normal'],byArm['increment-blind-normal']),
    normalMinusZero:comparePaired(byArm['informed-normal'],byArm['informed-zero'])};
  const conditionalHolderRateDiffPp={
    normalMinusBlind:summary['informed-normal'].everHeldWinnerRate==null||summary['increment-blind-normal'].everHeldWinnerRate==null?null:
      100*(summary['informed-normal'].everHeldWinnerRate-summary['increment-blind-normal'].everHeldWinnerRate),
    normalMinusZero:summary['informed-normal'].everHeldWinnerRate==null||summary['informed-zero'].everHeldWinnerRate==null?null:
      100*(summary['informed-normal'].everHeldWinnerRate-summary['informed-zero'].everHeldWinnerRate),
  };
  return {design:'eyes-informed-v1 versus increment-blind',formalH1Status:'incomplete',formalH9Status:'incomplete',
    formalReason:'Information experiment with three fixed arms and a development sample; formal H1/H9 and cross-night dominance gates remain pending.',
    limitations:{runnerEndpoint:'playPolicyGame stops when seat 0 dies; no AI-only continuation',
      zeroEffectScope:'shared eyes CHAINS effects disabled for all seats',
      conditionalHolderDiffIsCausal:false},
    sourceSha256:sha256(absolute),toolSha256:sha256(fileURLToPath(import.meta.url)),
    gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
    cfg,seeds,arms:ARMS,summary,decisionSummary,paired,conditionalHolderRateDiffPp,rows};
}

export function parseCli(argv){
  let n=20,out=null,target=DEFAULT_TARGET;
  for(let i=0;i<argv.length;i++){
    const arg=argv[i],value=argv[++i];
    if(!['--n','--out','--target'].includes(arg)) throw Error(`unknown CLI argument ${arg}`);
    if(value===undefined||value.startsWith('--')) throw Error(`missing value for ${arg}`);
    if(arg==='--n'){
      n=Number(value);
      if(!positive(n)) throw Error('--n requires a positive integer');
    }else if(arg==='--out') out=value;
    else target=value;
  }
  return {n,out,target};
}

export function writeReport(result,out){
  const dir=path.resolve(out);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'raw.jsonl'),result.rows.map(row=>JSON.stringify(row)).join('\n')+'\n');
  const {rows,...summary}=result;
  fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  const pct=value=>value==null?'null':`${(100*value).toFixed(2)}%`;
  const lines=['# L1e eyes information development experiment','',
    `Formal H1: ${result.formalH1Status}; formal H9: ${result.formalH9Status}. ${result.formalReason}`,'',
    `Source SHA256: ${result.sourceSha256}`,`Tool SHA256: ${result.toolSha256}`,
    `Git HEAD: ${result.gitHead}`,'',
    '| Arm | Games | Seat 0 wins | Win rate | Ever-held games | Holder winner games | Conditional holder winner rate |',
    '|---|---:|---:|---:|---:|---:|---:|'];
  for(const arm of result.arms){
    const s=result.summary[arm];
    lines.push(`| ${arm} | ${s.games} | ${s.wins} | ${pct(s.winRate)} | ${s.everHeldGames} | ${s.everHeldWinnerGames} | ${pct(s.everHeldWinnerRate)} |`);
  }
  lines.push('','| Arm | Policy calls | Extra preview available | Second bid available | Bid decisions differing from blind |',
    '|---|---:|---:|---:|---:|');
  for(const arm of result.arms){
    const d=result.decisionSummary[arm];
    lines.push(`| ${arm} | ${d.calls} | ${d.extraPreviewAvailable} | ${d.revealAvailable} | ${d.informedVsBlindDiff} |`);
  }
  lines.push('','| Contrast | Paired whole-game seat 0 win difference (pp) | Conditional ever-holder rate difference (pp, noncausal) |',
    '|---|---:|---:|',
    `| informed-normal − increment-blind-normal | ${result.paired.normalMinusBlind.winDiffPp??'null'} | ${result.conditionalHolderRateDiffPp.normalMinusBlind??'null'} |`,
    `| informed-normal − informed-zero | ${result.paired.normalMinusZero.winDiffPp??'null'} | ${result.conditionalHolderRateDiffPp.normalMinusZero??'null'} |`,
    '','Ever-held denominators belong to each arm separately; their conditional contrast is not a causal estimate.',
    'The engine stops when seat 0 dies; this is not AI-only continuation. Zero disables shared eyes effects for all seats.');
  fs.writeFileSync(path.join(dir,'report.md'),lines.join('\n')+'\n');
  return dir;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const {n,out,target}=parseCli(process.argv.slice(2));
    const result=runExperiment({target,seeds:Array.from({length:n},(_,i)=>i+1)});
    console.log(writeReport(result,out||path.join(ROOT,'docs/experiments/2026-09-21-l1e-information/policy-verification/smoke')));
  }catch(error){console.error(error);process.exitCode=1;}
}

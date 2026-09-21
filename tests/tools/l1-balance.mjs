import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadGame} from './load.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../..');
const DEFAULT_TARGET=path.join(ROOT,'index.html');
export const CHAIN_IDS=['water','eyes','twinTiger'];
export const ARMS=['splitter',...CHAIN_IDS.flatMap(id=>[`${id}-normal`,`${id}-zero`])];
const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const positive=n=>Number.isSafeInteger(n)&&n>0;

export function validateSeeds(seeds){
  if(!Array.isArray(seeds)||!seeds.length) throw Error('seeds require a positive integer sample');
  const seen=new Set();
  for(const seed of seeds){
    if(!positive(seed)||seed>0xffffffff) throw Error('seed must be a positive uint32 integer');
    if(seen.has(seed)) throw Error(`duplicate seed ${seed}`);
    seen.add(seed);
  }
  return [...seeds];
}

export function createChaser(G,id){
  const chain=G.CHAINS[id];
  if(!chain) throw Error(`unknown chain ${id}`);
  return p=>{
    const base=G.POLICIES.splitter(p);
    if(!p.alive) return base;
    const owned=new Set(p.bag.filter(x=>!x.curse&&x.ab).map(x=>x.ab));
    const missing=chain.requirements.filter(ab=>!owned.has(ab));
    if(!missing.length) return base;
    const candidates=[];
    G.S.market.forEach((item,i)=>{
      if(!item.curse&&missing.includes(item.ab)) candidates.push(i);
    });
    if(!candidates.length) return base;
    // One target per night: completion is possible exactly when one material
    // is missing. Market index breaks ties, including duplicate offerings.
    const target=candidates[0];
    const priority=[target,...base.map((_,i)=>i).filter(i=>i!==target)];
    const cap=G.consCapFor(p), budget=G.budgetFor(p), fee=G.CFG.BID_FEE;
    const max=G.CFG.MAX_BIDS>0?G.CFG.MAX_BIDS:Infinity;
    const out=base.map(()=>({amt:0,type:'cons',intent:'keep',target:null}));
    let count=0,spent=0;
    for(const i of priority){
      if(count>=max) break;
      const candidate=i===target;
      const original=base[i];
      const desired=candidate?Math.min(cap,Math.max(2,original?.amt||0)+2):original?.amt||0;
      if(desired<=0) continue;
      const affordable=Math.floor(budget-spent-fee);
      const amt=Math.min(desired,affordable);
      if(amt<=0) continue;
      out[i]=candidate?{amt,type:'cons',intent:'keep',target:null}:{...original,amt};
      spent+=amt+fee;count++;
    }
    return out;
  };
}

export function disableChainEffects(G,id){
  const chain=G.CHAINS[id];
  if(!chain) throw Error(`unknown chain ${id}`);
  for(const key of ['flags','traits','hooks','army']) delete chain[key];
  return chain;
}

export function summarize(rows,id){
  const games=rows.length;
  const wins=rows.filter(r=>r.winnerId===0).length;
  const targetChain=CHAIN_IDS.find(chain=>id===chain||id===`${chain}-normal`||id===`${chain}-zero`)||null;
  if(!targetChain) return {id,targetChain:null,games,wins,winRate:games?wins/games:null,holders:null,holderWins:null,holderWinRate:null};
  const held=rows.filter(r=>r.holder===true);
  const holders=held.length,holderWins=held.filter(r=>r.winnerId===0).length;
  return {id,targetChain,games,wins,winRate:games?wins/games:null,holders,holderWins,
    holderWinRate:holders?holderWins/holders:null};
}

function keyed(rows){
  const result=new Map();
  for(const row of rows){
    if(!positive(row.seed)) throw Error('seed must be positive');
    if(result.has(row.seed)) throw Error(`duplicate seed ${row.seed}`);
    result.set(row.seed,row);
  }
  return result;
}

export function comparePaired(rowsA,rowsB){
  const a=keyed(rowsA),b=keyed(rowsB);
  if(a.size!==b.size||[...a.keys()].some(seed=>!b.has(seed))) throw Error('missing seed in matched pairs');
  const n=a.size;
  const delta=[...a].reduce((sum,[seed,row])=>sum+(row.winnerId===0?1:0)-(b.get(seed).winnerId===0?1:0),0);
  return {pairs:n,winDiffPp:n?100*delta/n:null};
}

function gameRow(G,seed,arm,id){
  const result=G.playPolicyGame(seed,{0:arm==='splitter'?G.POLICIES.splitter:createChaser(G,id)},['qingmian']);
  const roles=G.S.players.map(p=>p.roleId);
  const endBagChainIds=G.S.players.map(p=>G.activeChains(p).map(c=>c.id));
  const alive0=G.S.players[0].alive;
  const endReason=!alive0?'seat0-dead':G.S.players.filter(p=>p.alive).length<=1?'one-survivor':
    result.gameLength>=G.CFG.ROUNDS?'round-limit':'engine-stop';
  return {arm,seed,roles,winnerId:result.winnerId,gameLength:result.gameLength,
    alive0,endReason,endBagChainIds,holder:id?endBagChainIds[0].includes(id):null};
}

export function runExperiment({target=DEFAULT_TARGET,seeds=Array.from({length:200},(_,i)=>i+1)}={}){
  seeds=validateSeeds(seeds);
  const absolute=path.resolve(target);
  const rows=[];
  let cfg;
  for(const arm of ARMS){
    const id=CHAIN_IDS.find(x=>arm.startsWith(`${x}-`))||null;
    const G=loadGame(absolute);
    cfg??=structuredClone(G.CFG);
    if(arm.endsWith('-zero')) disableChainEffects(G,id);
    for(const seed of seeds) rows.push(gameRow(G,seed,arm,id));
  }
  const byArm=Object.fromEntries(ARMS.map(arm=>[arm,rows.filter(r=>r.arm===arm)]));
  const summary=Object.fromEntries(ARMS.map(arm=>[arm,summarize(byArm[arm],arm)]));
  const paired=Object.fromEntries(ARMS.filter(arm=>arm!=='splitter').map(arm=>
    [arm,comparePaired(byArm[arm],byArm.splitter)]));
  const pairedNormalVsZero=Object.fromEntries(CHAIN_IDS.map(id=>{
    const normal=byArm[`${id}-normal`],zero=byArm[`${id}-zero`];
    const a=summarize(normal,`${id}-normal`),b=summarize(zero,`${id}-zero`);
    return [id,{...comparePaired(normal,zero),normalArm:`${id}-normal`,zeroArm:`${id}-zero`,
      conditionalHolderRateDiffPp:a.holderWinRate==null||b.holderWinRate==null?null:
        100*(a.holderWinRate-b.holderWinRate),conditionalHolderDiffIsCausal:false}];
  }));
  return {design:'L1e exploratory v1',formalStatus:'incomplete',
    formalReason:'Exploratory chaser, end-bag holder denominator, and cross-night state space are not the frozen formal protocol; eyes policy does not use tomorrow preview or second-bid information.',
    limitations:{zeroEffectScope:'shared target CHAINS entry; all four seats',
      zeroEyesUiScope:'eyesSecondBid UI helper is ID based and remains available; headless chaser never uses it',
      runnerEndpoint:'playPolicyGame stops when seat 0 dies; no AI-only continuation',
      winnerRule:'winnerId===0 only; seat-0 death does not imply a loss when multiple seats die together',
      eyesBlindSpot:'Chaser does not use tomorrow preview or second-highest-bid information',
      holderDefinition:'seat 0 has full recipe in end bag at runner endpoint; separate arm denominators; conditional difference is not causal'},
    sourceSha256:sha256(absolute),toolSha256:sha256(fileURLToPath(import.meta.url)),
    gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
    cfg,seeds,arms:ARMS,summary,pairedVsSplitter:paired,pairedNormalVsZero,rows};
}

export function parseCli(argv){
  let n=200,out=null,target=DEFAULT_TARGET;
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(!['--n','--out','--target'].includes(arg)) throw Error(`unknown CLI argument ${arg}`);
    const value=argv[++i];
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
  fs.writeFileSync(path.join(dir,'raw.jsonl'),result.rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
  const {rows,...summary}=result;
  fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  const lines=['# L1e exploratory measurement','','Formal status: incomplete — '+result.formalReason,'',
    `Source SHA256: ${result.sourceSha256}`,`Measurement tool SHA256: ${result.toolSha256}`,`Measurement Git HEAD: ${result.gitHead}`,
    ...(result.reportToolSha256?[`Report tool SHA256: ${result.reportToolSha256}`,`Raw SHA256: ${result.rawSha256}`,`Report Git HEAD: ${result.reportGitHead}`]:[]),'',
    '| Arm | Games | Wins | Win rate | End holders | Holder wins | Conditional holder win rate | Paired vs splitter (pp) |',
    '|---|---:|---:|---:|---:|---:|---:|---:|'];
  const pct=x=>x==null?'null':(100*x).toFixed(2)+'%';
  for(const arm of result.arms){
    const s=result.summary[arm];
    lines.push(`| ${arm} | ${s.games} | ${s.wins} | ${pct(s.winRate)} | ${s.holders??'N/A'} | ${s.holderWins??'N/A'} | ${s.targetChain?pct(s.holderWinRate):'N/A'} | ${result.pairedVsSplitter[arm]?.winDiffPp??'null'} |`);
  }
  lines.push('','| Chain | Normal − zero paired win difference (pp) | Conditional holder rate difference (pp; noncausal) |',
    '|---|---:|---:|');
  for(const id of CHAIN_IDS){
    const pair=result.pairedNormalVsZero[id];
    lines.push(`| ${id} | ${pair.winDiffPp??'null'} | ${pair.conditionalHolderRateDiffPp??'null'} |`);
  }
  lines.push('','Splitter has no target chain: its holder fields are not measured (N/A), not zero attainment.',
    'The chaser target is min(conservative cap, max(original splitter amount, 2) + 2).',
    'The zero arm disables only the target chain effects through the shared CHAINS table, for all four seats. Its paired difference is not an isolated seat-0 ability effect.',
    'The ID-based eyesSecondBid UI helper remains available in the zero arm; this headless policy never uses it.',
    'The engine stops when the human seat dies; end bag and game length describe that runner endpoint, not a continued AI-only game.',
    'A seat-0 death does not imply a loss when several seats die in one night; wins use winnerId === 0.',
    'Holder means seat 0 still has the full recipe in its end bag. Conditional rates have separate denominators and are not causal effects.',
    'Eyes chaser does not consume tomorrow preview or second-highest-bid information.');
  fs.writeFileSync(path.join(dir,'report.md'),lines.join('\n')+'\n');
  return dir;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const {n,out,target}=parseCli(process.argv.slice(2));
    const result=runExperiment({target,seeds:Array.from({length:n},(_,i)=>i+1)});
    console.log(writeReport(result,out||path.join(ROOT,'docs/experiments/2026-09-21-l1e-measurement/verification')));
  }catch(error){console.error(error.message);process.exitCode=1;}
}

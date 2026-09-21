import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadGame} from './load.mjs';
import {createChaser,disableChainEffects,validateSeeds} from './l1-balance.mjs';
import {createEyesPolicy} from './l1-information.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../..');
const DEFAULT_TARGET=path.join(ROOT,'index.html');
const CHAIN_IDS=['water','eyes','twinTiger'];
const FORMAL_SEEDS=Array.from({length:10000},(_,i)=>i+1);
export const ARMS=['h1-splitter','h1-water','h1-twinTiger','h1-eyes',
  'h9-normal','h9-zero-water','h9-zero-twinTiger','h9-zero-eyes'];
export const ARM_CONFIG=Object.freeze({
  'h1-splitter':{table:'H1 chaser',policy:'splitter',targetChain:null,zeroEffect:false,policyInformation:false},
  'h1-water':{table:'H1 chaser',policy:'target-chaser-v1',targetChain:'water',zeroEffect:false,policyInformation:false},
  'h1-twinTiger':{table:'H1 chaser',policy:'target-chaser-v1',targetChain:'twinTiger',zeroEffect:false,policyInformation:false},
  'h1-eyes':{table:'H1 chaser',policy:'eyes-informed-v1',targetChain:'eyes',zeroEffect:false,policyInformation:true},
  'h9-normal':{table:'H9 original scriptedBids/AI',policy:'scriptedBids',targetChain:null,zeroEffect:false,policyInformation:false},
  'h9-zero-water':{table:'H9 original scriptedBids/AI',policy:'scriptedBids',targetChain:'water',zeroEffect:true,policyInformation:false},
  'h9-zero-twinTiger':{table:'H9 original scriptedBids/AI',policy:'scriptedBids',targetChain:'twinTiger',zeroEffect:true,policyInformation:false},
  'h9-zero-eyes':{table:'H9 original scriptedBids/AI',policy:'scriptedBids',targetChain:'eyes',zeroEffect:true,policyInformation:false},
});
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const hashFile=file=>sha256(fs.readFileSync(file));
const ownFile=fileURLToPath(import.meta.url);
const dependencies={load:path.join(HERE,'load.mjs'),balance:path.join(HERE,'l1-balance.mjs'),
  information:path.join(HERE,'l1-information.mjs')};
const isSeat=n=>Number.isInteger(n)&&n>=0&&n<=3;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const pct=x=>x===null?'null':`${(100*x).toFixed(2)}%`;
const pp=x=>x===null?'null':`${x.toFixed(4)} pp`;
const rounded=x=>Math.round(x*1e10)/1e10;

function effectiveChains(G){
  return Object.fromEntries(CHAIN_IDS.map(id=>{
    const c=G.CHAINS[id];
    return [id,{requirements:[...c.requirements],aiBonus:c.aiBonus??null,
      flags:c.flags??null,traits:c.traits??null,hooks:c.hooks??null,army:c.army??null}];
  }));
}

function provenance(target){
  return {sourceSha256:hashFile(target),toolSha256:hashFile(ownFile),
    dependenciesSha256:Object.fromEntries(Object.entries(dependencies).map(([id,file])=>[id,hashFile(file)])),
    gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim()};
}

export function runArm(arm,{seeds=FORMAL_SEEDS,target=DEFAULT_TARGET,onProgress=null}={}){
  if(!Object.hasOwn(ARM_CONFIG,arm)) throw Error(`unknown arm ${arm}`);
  seeds=validateSeeds(seeds);
  const absolute=path.resolve(target);
  const start=provenance(absolute);
  const G=loadGame(absolute),spec=ARM_CONFIG[arm];
  const cfg=structuredClone(G.CFG);
  if(spec.zeroEffect) disableChainEffects(G,spec.targetChain);
  const chains=structuredClone(effectiveChains(G));
  const decisions=arm==='h1-eyes'?{calls:0,extraPreviewAvailable:0,revealAvailable:0,informedVsBlindDiff:0}:null;
  const policies=spec.table==='H1 chaser'?{0:spec.policy==='splitter'?G.POLICIES.splitter:
    spec.policy==='eyes-informed-v1'?createEyesPolicy(G,'informed',decisions):
      createChaser(G,spec.targetChain)}:{};
  const rows=[];
  for(const seed of seeds){
    const before=decisions?{...decisions}:null;
    const result=G.playPolicyGame(seed,policies,spec.table==='H1 chaser'?['qingmian']:undefined,
      spec.policyInformation?{recordChainHoldings:true,policyInformation:true}:{recordChainHoldings:true});
    if(!result.chainHoldings) throw Error('engine did not return chain holdings');
    const {holders,first}=result.chainHoldings;
    const row={arm,seed,roles:G.S.players.map(p=>p.roleId),winnerId:result.winnerId,
      gameLength:result.gameLength,alive0:G.S.players[0].alive,
      holders:Object.fromEntries(CHAIN_IDS.map(id=>[id,holders[id]||[]])),
      first:Object.fromEntries(CHAIN_IDS.map(id=>[id,first[id]||{}]))};
    if(before) row.policyDecisions=Object.fromEntries(Object.keys(before).map(key=>[key,decisions[key]-before[key]]));
    rows.push(row);
    if(onProgress&&rows.length%1000===0) onProgress({arm,done:rows.length,total:seeds.length});
  }
  if(!same(start,provenance(absolute))) throw Error('source, tool, dependency or Git HEAD changed during arm run');
  return {schema:'l1-formal-arm-v1',arm,...start,cfg,effectiveChains:chains,seeds,rows};
}

function validateArtifact(a,requiredSeeds){
  if(!a||!Object.hasOwn(ARM_CONFIG,a.arm)||a.schema!=='l1-formal-arm-v1') throw Error('invalid arm artifact');
  if(![a.sourceSha256,a.toolSha256,...Object.values(a.dependenciesSha256||{})]
    .every(x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x))||
    !same(Object.keys(a.dependenciesSha256||{}).sort(),['load','balance','information'].sort())||
    typeof a.gitHead!=='string'||!/^[0-9a-f]{40,64}$/.test(a.gitHead)||
    !a.cfg||typeof a.cfg!=='object') throw Error('invalid provenance');
  if(!a.effectiveChains||!same(Object.keys(a.effectiveChains).sort(),[...CHAIN_IDS].sort()))
    throw Error('invalid effective chain snapshot');
  for(const id of CHAIN_IDS){
    const c=a.effectiveChains[id];
    if(!c||!Array.isArray(c.requirements)||!Number.isFinite(c.aiBonus)||
      !Object.hasOwn(c,'flags')||!Object.hasOwn(c,'traits')||
      !Object.hasOwn(c,'hooks')||!Object.hasOwn(c,'army')) throw Error('invalid effective chain details');
  }
  if(!Array.isArray(a.seeds)||!same(a.seeds,requiredSeeds)) throw Error(`seed set mismatch for ${a.arm}`);
  if(!Array.isArray(a.rows)) throw Error(`missing rows for ${a.arm}`);
  const found=new Set();
  for(const row of a.rows){
    if(row.arm!==a.arm) throw Error(`row arm mismatch in ${a.arm}`);
    if(!Number.isSafeInteger(row.seed)||row.seed<1||row.seed>0xffffffff) throw Error('invalid seed');
    if(found.has(row.seed)) throw Error(`duplicate seed ${row.seed} in ${a.arm}`);
    found.add(row.seed);
    if(!isSeat(row.winnerId)) throw Error(`invalid winner in ${a.arm} seed ${row.seed}`);
    if(!Array.isArray(row.roles)||row.roles.length!==4||
      (a.arm.startsWith('h1-')&&row.roles[0]!=='qingmian')) throw Error('invalid four-seat roles');
    if(!Number.isInteger(row.gameLength)||row.gameLength<1||typeof row.alive0!=='boolean') throw Error('invalid game endpoint');
    if(!row.holders||!row.first||!same(Object.keys(row.holders).sort(),[...CHAIN_IDS].sort())||
      !same(Object.keys(row.first).sort(),[...CHAIN_IDS].sort())) throw Error('missing chain holder evidence');
    for(const id of CHAIN_IDS){
      const holders=row.holders[id];
      if(!Array.isArray(holders)||holders.some(seat=>!isSeat(seat))||
        new Set(holders).size!==holders.length) throw Error(`invalid holder seat for ${id}`);
      if(!row.first[id]||typeof row.first[id]!=='object'||Array.isArray(row.first[id])) throw Error(`invalid first evidence for ${id}`);
      for(const [seat,event] of Object.entries(row.first[id])){
        if(!isSeat(Number(seat))||!event||!Number.isInteger(event.round)||event.round<1||
          typeof event.phase!=='string'||!event.phase||!Number.isInteger(event.mutationSequence)||
          event.mutationSequence<1) throw Error(`invalid first holding event for ${id}`);
      }
      if(!same(Object.keys(row.first[id]).map(Number).sort((a,b)=>a-b),
        [...holders].sort((a,b)=>a-b))) throw Error(`holder/first mismatch for ${id}`);
    }
  }
  if(a.rows.length!==requiredSeeds.length||found.size!==requiredSeeds.length||
    requiredSeeds.some(seed=>!found.has(seed))) throw Error(`missing seed in ${a.arm}`);
}

function measureH9(rows,id){
  const holderCountDistribution=[0,0,0,0,0];
  let anyHolderGames=0,winnerHolderGames=0;
  for(const row of rows){
    const holders=row.holders[id];
    holderCountDistribution[holders.length]++;
    if(holders.length){anyHolderGames++;if(holders.includes(row.winnerId)) winnerHolderGames++;}
  }
  return {games:rows.length,anyHolderGames,winnerHolderGames,
    winnerHolderRate:anyHolderGames?winnerHolderGames/anyHolderGames:null,holderCountDistribution};
}

export function aggregate(artifacts,{requiredSeeds=FORMAL_SEEDS}={}){
  requiredSeeds=validateSeeds(requiredSeeds);
  if(!Array.isArray(artifacts)||artifacts.length!==ARMS.length) throw Error('expected exactly eight arm artifacts');
  const byArm=new Map();
  for(const a of artifacts){
    if(!a||!Object.hasOwn(ARM_CONFIG,a.arm)) throw Error('unknown arm artifact');
    if(byArm.has(a.arm)) throw Error(`duplicate arm ${a.arm}`);
    byArm.set(a.arm,a);
  }
  if(ARMS.some(arm=>!byArm.has(arm))) throw Error('missing arm');
  const basis=byArm.get(ARMS[0]);
  for(const arm of ARMS){
    const a=byArm.get(arm);
    validateArtifact(a,requiredSeeds);
    for(const key of ['sourceSha256','toolSha256','dependenciesSha256','gitHead','cfg'])
      if(!same(a[key],basis[key])) throw Error(`provenance mismatch: ${key} in ${arm}`);
  }
  for(const group of [['h1-splitter','h1-water','h1-twinTiger','h1-eyes'],
    ['h9-normal','h9-zero-water','h9-zero-twinTiger','h9-zero-eyes']]){
    const baseline=new Map(byArm.get(group[0]).rows.map(row=>[row.seed,row.roles]));
    for(const arm of group.slice(1)) for(const row of byArm.get(arm).rows){
      if(!same(row.roles,baseline.get(row.seed))) throw Error(`same-seed roles mismatch in ${arm}`);
    }
  }
  const normalChains=basis.effectiveChains;
  for(const arm of ARMS){
    const expected=structuredClone(normalChains);
    const spec=ARM_CONFIG[arm];
    if(spec.zeroEffect){
      for(const field of ['flags','traits','hooks','army']) expected[spec.targetChain][field]=null;
    }
    if(!same(byArm.get(arm).effectiveChains,expected)) throw Error(`effective chain mismatch in ${arm}`);
  }
  const sampleComplete=same(requiredSeeds,FORMAL_SEEDS);
  const h1={};
  const splitter=byArm.get('h1-splitter').rows;
  const baseWins=splitter.filter(r=>r.winnerId===0).length;
  for(const id of CHAIN_IDS){
    const rows=byArm.get(`h1-${id}`).rows;
    const wins=rows.filter(r=>r.winnerId===0).length;
    const differencePp=rounded(100*(wins-baseWins)/requiredSeeds.length);
    const thresholdStatus=differencePp>=-8&&differencePp<=5?'pass':'fail';
    h1[id]={table:'H1 chaser, seat 0 qingmian',arm:`h1-${id}`,baselineArm:'h1-splitter',
      games:rows.length,wins,baselineWins:baseWins,differencePp,rangePp:[-8,5],thresholdStatus,
      status:sampleComplete?thresholdStatus:'incomplete'};
  }
  const h9={};
  const normalRows=byArm.get('h9-normal').rows;
  for(const id of CHAIN_IDS){
    const normal=measureH9(normalRows,id),zero=measureH9(byArm.get(`h9-zero-${id}`).rows,id);
    const differencePp=normal.winnerHolderRate===null||zero.winnerHolderRate===null?null:
      rounded(100*(normal.winnerHolderRate-zero.winnerHolderRate));
    const absoluteCeilingPass=normal.winnerHolderRate===null?null:
      normal.winnerHolderGames*100<=normal.anyHolderGames*85;
    const denominator=normal.anyHolderGames*zero.anyHolderGames;
    const numerator=100*(normal.winnerHolderGames*zero.anyHolderGames-
      zero.winnerHolderGames*normal.anyHolderGames);
    const thresholdStatus=differencePp===null?'incomplete':
      numerator>=3*denominator&&numerator<=10*denominator&&absoluteCeilingPass?'pass':'fail';
    const measurable=id!=='eyes';
    h9[id]={table:'H9 original scriptedBids/AI, all four seats ever-held',normalArm:'h9-normal',
      zeroArm:`h9-zero-${id}`,normal,zero,differencePp,rangePp:[3,10],absoluteCeilingPass,
      differenceIsCausal:false,informationBlind:id==='eyes',thresholdStatus,
      status:measurable&&sampleComplete?thresholdStatus:'incomplete'};
  }
  const statuses=[...Object.values(h1),h9.water,h9.twinTiger].map(x=>x.status);
  const overallStatus=statuses.includes('fail')?'fail':'incomplete';
  return {schema:'l1-formal-summary-v1',design:'L1e fixed eight-arm formal measurement',
    sourceSha256:basis.sourceSha256,toolSha256:basis.toolSha256,
    dependenciesSha256:basis.dependenciesSha256,gitHead:basis.gitHead,cfg:basis.cfg,
    seeds:requiredSeeds,arms:ARMS,armEffectiveChains:Object.fromEntries(ARMS.map(arm=>[arm,byArm.get(arm).effectiveChains??null])),
    sampleComplete,h1,h9,overall:{status:overallStatus,releaseEligible:false,
      sixOfFour:{status:'incomplete',reason:'Full cross-night reachable states and all legal policy choices are not enumerated.'},
      eyesH9:{status:'incomplete',reason:'Original scriptedBids/AI table does not consume eyes information.'}},
    limitations:{runnerEndpoint:'playPolicyGame stops when seat 0 dies; no AI-only continuation',
      zeroEffectScope:'shared target CHAINS effects disabled for all four seats',
      h9Denominators:'normal and zero use separate any-ever-holder game denominators; difference is noncausal',
      seedOverlap:'seeds 1..200 overlap prior pilot and are not a holdout'}};
}

export function parseCli(argv){
  let arm,aggregateDir,n=20,out,target;
  const allowed=new Set(['--arm','--aggregate','--n','--out','--target']);
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(!allowed.has(arg)) throw Error(`unknown argument ${arg}`);
    const value=argv[++i];
    if(value===undefined||value.startsWith('--')) throw Error(`missing value for ${arg}`);
    if(arg==='--arm') arm=value;
    else if(arg==='--aggregate') aggregateDir=value;
    else if(arg==='--n') {n=Number(value);if(!Number.isSafeInteger(n)||n<1) throw Error('--n requires a positive integer');}
    else if(arg==='--out') out=value;
    else target=value;
  }
  if(aggregateDir){
    if(arm||argv.includes('--n')||target) throw Error('aggregate mode accepts only --aggregate and --out');
    if(!out) throw Error('aggregate mode requires --out');
    return {mode:'aggregate',aggregateDir,out};
  }
  if(!arm||!Object.hasOwn(ARM_CONFIG,arm)) throw Error('valid --arm required');
  if(!out) throw Error('--out required');
  return {mode:'run',arm,n,out,target};
}

export function writeArm(artifact,dir){
  fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,`${artifact.arm}.json.gz`);
  const data=zlib.gzipSync(Buffer.from(JSON.stringify(artifact)),{level:9});
  fs.writeFileSync(file,data,{flag:'wx'});
  return file;
}

export function readArms(dir){
  return ARMS.map(arm=>{
    const file=path.join(dir,`${arm}.json.gz`);
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
  });
}

export function reportMarkdown(summary){
  const lines=['# L1e fixed eight-arm formal measurement','',
    `Overall: ${summary.overall.status}; release eligible: ${summary.overall.releaseEligible}`,
    `Sample complete (all eight arms, seeds 1..10000): ${summary.sampleComplete}`,'',
    `Source SHA256: ${summary.sourceSha256}`,`Tool SHA256: ${summary.toolSha256}`,
    `Dependency SHA256: ${JSON.stringify(summary.dependenciesSha256)}`,`Git HEAD: ${summary.gitHead}`,'',
    '| H1 chain | Seat 0 wins | Splitter wins | Difference | Gate [-8,+5] |',
    '|---|---:|---:|---:|---|'];
  for(const id of CHAIN_IDS){const h=summary.h1[id];
    lines.push(`| ${id} | ${h.wins}/${h.games} | ${h.baselineWins}/${h.games} | ${pp(h.differencePp)} | ${h.status} |`);}
  lines.push('','| H9 chain | Normal any-holder / winner-holder | Zero any-holder / winner-holder | Normal − zero | Normal ≤85% | Gate [+3,+10] |',
    '|---|---:|---:|---:|---|---|');
  for(const id of CHAIN_IDS){const h=summary.h9[id];
    lines.push(`| ${id} | ${h.normal.anyHolderGames} / ${h.normal.winnerHolderGames} (${pct(h.normal.winnerHolderRate)}) | ${h.zero.anyHolderGames} / ${h.zero.winnerHolderGames} (${pct(h.zero.winnerHolderRate)}) | ${pp(h.differencePp)} | ${h.absoluteCeilingPass??'null'} | ${h.status} |`);}
  lines.push('','H1 is seat 0 qingmian with splitter / target chaser / informed eyes policies. H9 is a separate original scriptedBids seat 0 and AI opponents table.',
    'H9 counts each game once if any of four seats ever held the chain; the winner must belong to that holder set. Normal and zero denominators differ, so their conditional difference is not causal.',
    'H9 eyes is diagnostic because the original table does not consume eyes information. Full cross-night six-of-four remains incomplete.',
    'The runner stops on seat 0 death. Seeds 1..200 overlap the earlier pilot; this run is not a holdout.');
  return lines.join('\n')+'\n';
}

export function writeAggregate(summary,dir){
  fs.mkdirSync(dir,{recursive:true});
  const summaryFile=path.join(dir,'summary.json'),reportFile=path.join(dir,'report.md');
  if(fs.existsSync(summaryFile)||fs.existsSync(reportFile)) throw Error('aggregate output already exists');
  fs.writeFileSync(summaryFile,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(reportFile,reportMarkdown(summary),{flag:'wx'});
  return dir;
}

if(process.argv[1]&&path.resolve(process.argv[1])===ownFile){
  try{
    const opts=parseCli(process.argv.slice(2));
    if(opts.mode==='aggregate') console.log(writeAggregate(aggregate(readArms(opts.aggregateDir)),opts.out));
    else{
      if(fs.existsSync(path.join(opts.out,`${opts.arm}.json.gz`))) throw Error('arm output already exists');
      const artifact=runArm(opts.arm,{seeds:Array.from({length:opts.n},(_,i)=>i+1),target:opts.target,
        onProgress:({arm,done,total})=>console.error(`${arm}: ${done}/${total}`)});
      console.log(writeArm(artifact,opts.out));
    }
  }catch(error){console.error(error.stack||error.message);process.exitCode=1;}
}

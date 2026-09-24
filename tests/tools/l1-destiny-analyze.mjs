import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {armIds,loadDestinyProtocol,validateRawBatch} from './l1-destiny-formal.mjs';
import {currentValidationProvenance} from './l1-destiny-historical.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const SCRATCH=path.join(ROOT,'scratchpad');
const OWN=fileURLToPath(import.meta.url);
const HISTORICAL=fileURLToPath(new URL('./l1-destiny-historical.mjs',import.meta.url));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const hashText=value=>crypto.createHash('sha256').update(value).digest('hex');
const rounded=x=>Math.round(x*1e4)/1e4;
const requirePrivate=file=>{
  if(typeof file!=='string'||!file) throw Error('private path required');
  const absolute=path.resolve(file);
  if(!absolute.startsWith(SCRATCH+path.sep)) throw Error('private raw must stay in ignored scratchpad/');
  fs.mkdirSync(path.dirname(absolute),{recursive:true});
  if(fs.lstatSync(SCRATCH).isSymbolicLink()) throw Error('scratchpad may not be a symlink');
  const root=fs.realpathSync(SCRATCH),parent=fs.realpathSync(path.dirname(absolute));
  if(parent!==root&&!parent.startsWith(root+path.sep))
    throw Error('private path escapes scratchpad through a link');
  if(fs.existsSync(absolute)&&fs.lstatSync(absolute).isSymbolicLink())
    throw Error('private file may not be a symlink');
  return absolute;
};
const quantile=(values,q)=>{
  if(!values.length) return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.floor((sorted.length-1)*q)];
};
function mulberry32(seed){
  let x=seed>>>0;
  return ()=>{
    x=(x+0x6d2b79f5)>>>0;
    let t=Math.imul(x^(x>>>15),1|x);
    t^=t+Math.imul(t^(t>>>7),61|t);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
export function pairedEffectStatus(ci,{sampleComplete,hasTrueEvent}){
  if(!sampleComplete||!hasTrueEvent) return 'incomplete';
  if(ci[0]>=-2&&ci[1]<=5) return 'pass';
  if(ci[1]<-2||ci[0]>5) return 'fail';
  return 'incomplete';
}

function pairedBootstrap(byArm,pairs,iterations,seed,{sampleComplete,activeTreatmentArms}){
  const names=Object.keys(pairs),n=byArm.get(pairs[names[0]][0]).length;
  const diffs=names.map(name=>{
    const [a,b]=pairs[name];
    return Int8Array.from(byArm.get(a).map((row,i)=>
      Number(row.winnerId===0)-Number(byArm.get(b)[i].winnerId===0)));
  });
  const samples=names.map(()=>new Float64Array(iterations));
  const random=mulberry32(seed);
  for(let iteration=0;iteration<iterations;iteration++){
    const sums=new Int32Array(names.length);
    for(let j=0;j<n;j++){
      const draw=Math.floor(random()*n);
      for(let k=0;k<names.length;k++) sums[k]+=diffs[k][draw];
    }
    for(let k=0;k<names.length;k++) samples[k][iteration]=100*sums[k]/n;
  }
  return Object.fromEntries(names.map((name,k)=>{
    const observed=100*diffs[k].reduce((sum,x)=>sum+x,0)/n;
    const ci=[quantile(samples[k],.025),quantile(samples[k],.975)].map(rounded);
    const effect=name.startsWith('pure')||name.endsWith('WithAi');
    const status=!effect?'diagnostic':pairedEffectStatus(ci,{sampleComplete,
      hasTrueEvent:activeTreatmentArms.has(pairs[name][0])});
    return [name,{arms:pairs[name],pairs:n,differencePp:rounded(observed),ci95Pp:ci,
      rangePp:effect?[-2,5]:null,status}];
  }));
}

function armSummary(rows){
  const awakenings=Object.fromEntries(['water','eyes','twinTiger','bloodOath','godKing','eternalFlame']
    .map(id=>[id,{assignedSeat0:0,awakenedSeats:0,awakenedSeat0:0,early:0,middle:0,late:0}]));
  const roleSeat={};
  const dayEvents={},nightEvents={},nightEventsBySeat={};
  let collisions=0,anyAwakenGame=0;
  const costs=[0,0,0,0];
  for(const row of rows){
    for(let seat=0;seat<4;seat++){
      const role=row.roles[seat],key=`${seat}:${role}`;
      const r=roleSeat[key]||(roleSeat[key]={seat,role,games:0,wins:0});
      r.games++;if(row.winnerId===seat) r.wins++;
      costs[seat]+=row.costs?.[seat]||0;
    }
    if(row.destinyDraws){
      awakenings[row.destinyDraws[0]].assignedSeat0++;
      if(new Set(row.destinyDraws).size<4) collisions++;
    }
    if(row.awakenings.length) anyAwakenGame++;
    for(const e of row.awakenings){
      const a=awakenings[e.chainId];if(!a) continue;
      a.awakenedSeats++;if(e.pid===0) a.awakenedSeat0++;
      a[e.round<=4?'early':e.round<=8?'middle':'late']++;
    }
    for(const night of row.destinyNights||[]){
      for(const e of night.dayEvents) dayEvents[e.chainId]=(dayEvents[e.chainId]||0)+1;
      for(const fight of night.fights){
        for(const e of fight.trueEvents){
          nightEvents[e.id]=(nightEvents[e.id]||0)+1;
          const key=`${e.pid}:${e.id}`;
          nightEventsBySeat[key]=(nightEventsBySeat[key]||0)+1;
        }
      }
    }
  }
  return {games:rows.length,seat0Wins:rows.filter(r=>r.winnerId===0).length,
    seat0WinRate:rounded(rows.filter(r=>r.winnerId===0).length/rows.length),
    meanAuctionCostsBySeat:costs.map(x=>rounded(x/rows.length)),
    gameLengthMedian:quantile(rows.map(r=>r.gameLength),.5),
    gameLengthP90:quantile(rows.map(r=>r.gameLength),.9),
    anyAwakenGames:anyAwakenGame,drawCollisionGames:collisions,
    awakenings,dayEvents,nightEvents,nightEventsBySeat,
    roleSeat:Object.values(roleSeat).sort((a,b)=>a.seat-b.seat||a.role.localeCompare(b.role)),
    eyesInformation:Object.fromEntries(['calls','extraPreviewAvailable','revealAvailable','informedVsBlindDiff']
      .map(key=>[key,rows.reduce((sum,r)=>sum+(r.policyDecisions?.[key]||0),0)]))};
}

export function analyzeDestinyArtifacts(artifacts,{privateDrawTable,seeds}={}){
  const protocol=loadDestinyProtocol(),arms=armIds(protocol,'destiny');
  const paths={product:path.join(ROOT,'index.html'),runner:path.join(ROOT,'tests/tools/l1-destiny-run.mjs'),
    acceptance:path.join(ROOT,'docs/experiments/2026-09-23-destiny/acceptance.md'),
    config:path.join(ROOT,'docs/experiments/2026-09-23-destiny/arms.json'),
    privateDrawTable:requirePrivate(privateDrawTable)};
  const originalHead=artifacts[0]?.provenance?.gitHead;
  if(artifacts.some(a=>a.provenance?.gitHead!==originalHead))
    throw Error('mixed raw Git HEADs');
  const expectedProvenance=currentValidationProvenance(artifacts[0]?.provenance,paths);
  const validationCopies=artifacts.map(a=>({...a,provenance:
    {...a.provenance,gitHead:expectedProvenance.gitHead}}));
  const validated=validateRawBatch(validationCopies,{protocol,group:'destiny',requiredSeeds:seeds,
    expectedProvenance,paths});
  const byArm=new Map(artifacts.map(artifact=>[artifact.arm,
    [...artifact.rows].sort((a,b)=>a.seed-b.seed)]));
  const summaries=Object.fromEntries(arms.map(arm=>[arm,armSummary(byArm.get(arm))]));
  const active=arms.filter(arm=>!arm.startsWith('ordinary-'));
  const zeroTrueEvents=active.filter(arm=>{
    const s=summaries[arm];
    return Object.values(s.dayEvents).reduce((n,v)=>n+v,0)+
      Object.values(s.nightEvents).reduce((n,v)=>n+v,0)===0;
  });
  const paired=pairedBootstrap(byArm,protocol.destinyGame.pairedComparisons,
    protocol.bootstrap.resamples,protocol.bootstrap.seed,
    {sampleComplete:validated.seedCoverageComplete,
      activeTreatmentArms:new Set(active.filter(arm=>!zeroTrueEvents.includes(arm)))});
  return {schema:'yaoshi.destiny.formal-summary.v1',
    provenance:{...artifacts[0].provenance,analysisSha256:hash(OWN),
      historicalAdapterSha256:hash(HISTORICAL),
      validatedAgainstGitHead:expectedProvenance.gitHead},
    rawContentSha256:Object.fromEntries(artifacts.map(a=>[a.arm,hashText(JSON.stringify(a))])),
    sampleComplete:validated.seedCoverageComplete,
    sampleGames:seeds.length,arms:summaries,paired,zeroTrueEvents,
    checkpointCohort:{status:'incomplete',reason:'No complete state and RNG checkpoint fork is wired.'},
    ordinarySix:{status:'incomplete',reason:'Ordinary H1/H9 and zero-effect arms require a separate audited batch.'},
    sixOfFour:{status:'incomplete',reason:'Full cross-night reachable states have not been enumerated.'},
    releaseEligible:false,
    limitations:['Raw rows and the private draw table remain in ignored scratchpad/.',
      'The public summary cannot be independently recomputed without those private files.',
      'Winner endpoint follows playPolicyGame, including its seat-0 stop condition.',
      'Awakening frequency is descriptive; it is not a causal post-awakening effect estimate.']};
}

if(process.argv[1]&&path.resolve(process.argv[1])===OWN){
  const args=process.argv.slice(2);
  if(args.length!==6||args[0]!=='--dir'||args[2]!=='--private-draw-table'||args[4]!=='--out')
    throw Error('usage: --dir scratchpad/raw-dir --private-draw-table scratchpad/draws.json --out scratchpad/summary.json');
  const dir=requirePrivate(path.join(args[1],'raw.json'));
  const rawDir=path.dirname(dir),table=requirePrivate(args[3]),out=requirePrivate(args[5]);
  if(fs.existsSync(out)) throw Error('summary already exists; never overwrite formal evidence');
  const protocol=loadDestinyProtocol();
  const artifacts=armIds(protocol,'destiny').map(arm=>JSON.parse(fs.readFileSync(path.join(rawDir,`${arm}.json`),'utf8')));
  const summary=analyzeDestinyArtifacts(artifacts,{privateDrawTable:table,seeds:artifacts[0].seeds});
  const fd=fs.openSync(out,'wx');
  try{fs.writeFileSync(fd,JSON.stringify(summary,null,2));}finally{fs.closeSync(fd);}
  process.stdout.write(`${out}\n`);
}

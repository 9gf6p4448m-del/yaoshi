import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {armIds,loadDestinyProtocol,validateRawBatch,verifyProvenance} from './l1-destiny-formal.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const OWN=fileURLToPath(import.meta.url);
const CHAINS=['water','eyes','twinTiger','bloodOath','godKing','eternalFlame'];
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const round=n=>Math.round(n*1e4)/1e4;
const quantile=(values,p)=>{
  values.sort((a,b)=>a-b);
  return round(values[Math.floor((values.length-1)*p)]);
};
function random32(seed){
  let x=seed>>>0;
  return ()=>{
    x=(x+0x6d2b79f5)>>>0;
    let t=Math.imul(x^(x>>>15),1|x);
    t^=t+Math.imul(t^(t>>>7),61|t);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function pairedIntervals(vectors,resamples,seed){
  const names=Object.keys(vectors),n=vectors[names[0]].length;
  const draws=Object.fromEntries(names.map(name=>[name,new Float64Array(resamples)]));
  const random=random32(seed);
  for(let i=0;i<resamples;i++){
    const sums=new Int32Array(names.length);
    for(let j=0;j<n;j++){
      const k=Math.floor(random()*n);
      for(let c=0;c<names.length;c++) sums[c]+=vectors[names[c]][k];
    }
    for(let c=0;c<names.length;c++) draws[names[c]][i]=100*sums[c]/n;
  }
  return Object.fromEntries(names.map(name=>[name,{
    differencePp:round(100*vectors[name].reduce((a,b)=>a+b,0)/n),
    ci95Pp:[quantile(draws[name],.025),quantile(draws[name],.975)]
  }]));
}
function checkGroup(artifacts,group,protocol,paths,seeds){
  const arms=armIds(protocol,group);
  if(artifacts.length!==arms.length) throw Error(`${group}: missing arms`);
  const base=artifacts.find(a=>a.arm===arms[0]);
  if(!base) throw Error(`${group}: missing baseline`);
  const provenance=base.provenance;
  verifyProvenance(provenance,paths);
  const normalized=artifacts.map(artifact=>{
    const expected=group==='ordinaryH1'?
      artifact.arm==='h1-splitter'?'POLICIES.splitter':
        artifact.arm==='h1-eyes'?'eyes-informed-v1':'target-chaser-v1':
      'original-scriptedBids';
    if(artifact.provenance?.policyVersions?.seat0!==expected)
      throw Error(`${artifact.arm}: wrong declared seat0 policy`);
    verifyProvenance(artifact.provenance,paths);
    const comparable={...artifact.provenance,
      policyVersions:{...artifact.provenance.policyVersions,seat0:provenance.policyVersions.seat0}};
    if(JSON.stringify(comparable)!==JSON.stringify(provenance))
      throw Error(`${artifact.arm}: incompatible provenance`);
    return {...artifact,provenance};
  });
  const validation=validateRawBatch(normalized,{protocol,group,requiredSeeds:seeds,
    expectedProvenance:provenance,paths});
  return validation;
}
function holderRate(rows,id){
  let holders=0,wins=0;
  for(const row of rows){
    const set=row.chainHoldings.holders[id]||[];
    if(set.length){holders++;if(set.includes(row.winnerId)) wins++;}
  }
  return {holderGames:holders,holderWins:wins,rate:holders?round(wins/holders):null};
}
export function h9Gate(id,normal,zero){
  if(id==='eyes'||!normal.holderGames||!zero.holderGames) return 'incomplete';
  const normalRate=normal.holderWins/normal.holderGames;
  const zeroRate=zero.holderWins/zero.holderGames;
  const deltaPp=100*(normalRate-zeroRate);
  return deltaPp>=3&&deltaPp<=10&&normalRate<=.85?'pass':'fail';
}
function validateHoldings(rows,arm){
  for(const row of rows){
    const evidence=row.chainHoldings;
    for(const id of CHAINS){
      const holders=evidence.holders[id]??[],first=evidence.first[id]??{};
      if(!Array.isArray(holders)||!first||typeof first!=='object'||Array.isArray(first))
        throw Error(`${arm} seed ${row.seed}: invalid ${id} holder record`);
      if(new Set(holders).size!==holders.length||
        holders.some(pid=>!Number.isInteger(pid)||pid<0||pid>3))
        throw Error(`${arm} seed ${row.seed}: invalid ${id} holder set`);
      const firstPids=Object.keys(first).map(key=>Number(key));
      if(firstPids.some(pid=>!Number.isInteger(pid)||pid<0||pid>3)||
        firstPids.length!==holders.length||firstPids.some(pid=>!holders.includes(pid)))
        throw Error(`${arm} seed ${row.seed}: ${id} first/holder mismatch`);
      for(const event of Object.values(first)) if(!event||
        !Number.isInteger(event.round)||event.round<1||event.round>row.gameLength||
        typeof event.phase!=='string'||!event.phase||
        !Number.isInteger(event.mutationSequence)||event.mutationSequence<1||
        event.mutationSequence>evidence.mutationCount)
        throw Error(`${arm} seed ${row.seed}: invalid ${id} first event`);
    }
  }
}
function roleSeatDiff(normal,zero){
  const groups=new Map();
  for(let i=0;i<normal.length;i++) for(let seat=0;seat<4;seat++){
    const role=normal[i].roles[seat],key=`${seat}:${role}`;
    if(!groups.has(key)) groups.set(key,{seat,role,games:0,normalWins:0,zeroWins:0});
    const group=groups.get(key);group.games++;
    group.normalWins+=Number(normal[i].winnerId===seat);
    group.zeroWins+=Number(zero[i].winnerId===seat);
  }
  return [...groups.values()].map(g=>({...g,
    differencePp:round(100*(g.normalWins-g.zeroWins)/g.games)}))
    .sort((a,b)=>a.seat-b.seat||a.role.localeCompare(b.role));
}
export function analyzeOrdinaryArtifacts({h1,h9}){
  const protocol=loadDestinyProtocol(),seeds=Array.from({length:10000},(_,i)=>10001+i);
  const paths={product:path.join(ROOT,'index.html'),
    runner:path.join(ROOT,'tests/tools/l1-destiny-run.mjs'),
    acceptance:path.join(ROOT,'docs/experiments/2026-09-23-destiny/acceptance.md'),
    config:path.join(ROOT,'docs/experiments/2026-09-23-destiny/arms.json')};
  const h1Validation=checkGroup(h1,'ordinaryH1',protocol,paths,seeds);
  const h9Validation=checkGroup(h9,'ordinaryH9',protocol,paths,seeds);
  const comparable=provenance=>({...provenance,
    policyVersions:{...provenance.policyVersions,seat0:'group-specific'}});
  if(JSON.stringify(comparable(h1[0].provenance))!==
    JSON.stringify(comparable(h9[0].provenance)))
    throw Error('H1 and H9 source provenance differs');
  for(const artifact of h9) validateHoldings(artifact.rows,artifact.arm);
  const h1Rows=new Map(h1.map(a=>[a.arm,[...a.rows].sort((x,y)=>x.seed-y.seed)]));
  const h9Rows=new Map(h9.map(a=>[a.arm,[...a.rows].sort((x,y)=>x.seed-y.seed)]));
  const splitter=h1Rows.get('h1-splitter'),normal=h9Rows.get('h9-normal');
  const vectors={};
  for(const id of CHAINS){
    const chase=h1Rows.get(`h1-${id}`),zero=h9Rows.get(`h9-zero-${id}`);
    vectors[`h1:${id}`]=Int8Array.from(chase.map((r,i)=>
      Number(r.winnerId===0)-Number(splitter[i].winnerId===0)));
    for(let seat=0;seat<4;seat++) vectors[`ordinary:${id}:${seat}`]=
      Int8Array.from(normal.map((r,i)=>
        Number(r.winnerId===seat)-Number(zero[i].winnerId===seat)));
  }
  const ci=pairedIntervals(vectors,protocol.bootstrap.resamples,protocol.bootstrap.seed);
  const results=Object.fromEntries(CHAINS.map(id=>{
    const chase=h1Rows.get(`h1-${id}`),zero=h9Rows.get(`h9-zero-${id}`);
    const h1Result={baselineWins:splitter.filter(r=>r.winnerId===0).length,
      chaserWins:chase.filter(r=>r.winnerId===0).length,...ci[`h1:${id}`],
      oldRangePp:[-8,5]};
    h1Result.status=h1Result.differencePp>=-8&&h1Result.differencePp<=5?'pass':'fail';
    const normalHolder=holderRate(normal,id),zeroHolder=holderRate(zero,id);
    const normalRate=normalHolder.holderGames?
      normalHolder.holderWins/normalHolder.holderGames:null;
    const zeroRate=zeroHolder.holderGames?
      zeroHolder.holderWins/zeroHolder.holderGames:null;
    const rawHolderDifferencePp=normalRate===null||zeroRate===null?
      null:100*(normalRate-zeroRate);
    const holderDifferencePp=rawHolderDifferencePp===null?
      null:round(rawHolderDifferencePp);
    const h9Result={normal:normalHolder,zero:zeroHolder,holderDifferencePp,
      oldRangePp:[3,10],normalCeiling:.85,
      causal:false,eyesInformationConsumed:false};
    h9Result.status=h9Gate(id,normalHolder,zeroHolder);
    const perSeat=Array.from({length:4},(_,seat)=>({seat,...ci[`ordinary:${id}:${seat}`]}));
    for(const result of perSeat){
      const [low,high]=result.ci95Pp;
      result.status=low>=-5&&high<=5?'pass':high< -5||low>5?'fail':'incomplete';
    }
    return [id,{h1:h1Result,h9:h9Result,pairedOrdinary:{
      perSeat,seatRole:roleSeatDiff(normal,zero),
      meanAuctionCostDifferenceBySeat:Array.from({length:4},(_,seat)=>round(
        normal.reduce((sum,r,i)=>sum+r.costs[seat]-zero[i].costs[seat],0)/normal.length)),
      meanGameLengthDifference:round(normal.reduce((sum,r,i)=>
        sum+r.gameLength-zero[i].gameLength,0)/normal.length)}}];
  }));
  const raw=[...h1,...h9];
  return {schema:'yaoshi.destiny.ordinary-summary.v1',
    provenance:{...h9[0].provenance,analysisSha256:sha(fs.readFileSync(OWN))},
    rawContentSha256:Object.fromEntries(raw.map(a=>[a.arm,sha(JSON.stringify(a))])),
    sampleComplete:h1Validation.seedCoverageComplete&&h9Validation.seedCoverageComplete,
    gamesPerArm:seeds.length,bootstrap:{resamples:protocol.bootstrap.resamples,
      seed:protocol.bootstrap.seed,cluster:'game seed'},chains:results,
    releaseEligible:false,
    limitations:['H9 holder rates condition on different holder sets and are not causal.',
      'The H9 scripted bidder does not consume eyes information, so its eyes gate is incomplete.',
      'Role and seat differences are descriptive; only per-seat paired intervals determine the ordinary counterfactual gate.',
      'Cross-night six-of-four and true-destiny checkpoint gates remain separate.']};
}
if(process.argv[1]&&path.resolve(process.argv[1])===OWN){
  const dir=path.resolve(process.argv[2]||'');
  const out=path.resolve(process.argv[3]||'');
  const scratch=path.join(ROOT,'scratchpad');
  for(const value of [dir,out]) if(!value.startsWith(scratch+path.sep))
    throw Error('ordinary raw and aggregate must remain in scratchpad');
  if(fs.lstatSync(scratch).isSymbolicLink()) throw Error('scratchpad may not be a link');
  const realScratch=fs.realpathSync(scratch);
  for(const value of [dir,path.dirname(out)]){
    const real=fs.realpathSync(value);
    if(real!==realScratch&&!real.startsWith(realScratch+path.sep))
      throw Error('ordinary path escapes scratchpad through a link');
  }
  if(fs.existsSync(out)&&fs.lstatSync(out).isSymbolicLink())
    throw Error('ordinary summary may not be a link');
  const protocol=loadDestinyProtocol();
  const read=arm=>{
    const file=path.join(dir,`${arm}.json`);
    if(fs.lstatSync(file).isSymbolicLink()) throw Error('ordinary raw may not be a link');
    return JSON.parse(fs.readFileSync(file,'utf8'));
  };
  const summary=analyzeOrdinaryArtifacts({
    h1:armIds(protocol,'ordinaryH1').map(read),
    h9:armIds(protocol,'ordinaryH9').map(read)});
  fs.writeFileSync(out,JSON.stringify(summary,null,2),{flag:'wx'});
  process.stdout.write(`${out}\n`);
}

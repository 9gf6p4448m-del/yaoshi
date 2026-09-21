import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {ARMS, ARM_CONFIG, runArm, aggregate, parseCli, writeArm, readArms,
  writeAggregate, reportMarkdown} from './tools/l1-formal.mjs';

const target=path.resolve(fileURLToPath(new URL('../index.html',import.meta.url)));
const chainIds=['water','eyes','twinTiger'];
const empty=()=>Object.fromEntries(chainIds.map(id=>[id,[]]));
const first=()=>Object.fromEntries(chainIds.map(id=>[id,{}]));
const provenance={schema:'l1-formal-arm-v1',sourceSha256:'a'.repeat(64),toolSha256:'b'.repeat(64),
  dependenciesSha256:{load:'c'.repeat(64),balance:'d'.repeat(64),information:'e'.repeat(64)},
  gitHead:'f'.repeat(40),cfg:{ROUNDS:10}};
const baseChains=()=>Object.fromEntries(chainIds.map(id=>[id,{requirements:[id],aiBonus:2,
  flags:[`${id}-effect`],traits:null,hooks:null,army:null}]));
function row(arm,seed,{winnerId=1,holders=empty()}={}){
  return {arm,seed,roles:['qingmian','a','b','c'],winnerId,gameLength:3,alive0:true,
    holders,first:first()};
}
function artifacts(seeds=[1,2]){
  return ARMS.map(arm=>{
    const effectiveChains=baseChains();
    if(arm.startsWith('h9-zero-')) effectiveChains[arm.slice('h9-zero-'.length)].flags=null;
    return {...structuredClone(provenance),arm,effectiveChains,seeds:[...seeds],
      rows:seeds.map(seed=>row(arm,seed))};
  });
}
const get=(xs,arm)=>xs.find(x=>x.arm===arm);
function aggregatePrepared(xs,options){
  for(const artifact of xs) for(const r of artifact.rows){
    r.first=Object.fromEntries(chainIds.map(id=>[id,Object.fromEntries(r.holders[id].map(seat=>
      [seat,{round:1,phase:'auction',mutationSequence:1}]))]));
  }
  return aggregate(xs,options);
}

test('frozen eight arms and table modes are explicit',()=>{
  assert.deepEqual(ARMS,['h1-splitter','h1-water','h1-twinTiger','h1-eyes',
    'h9-normal','h9-zero-water','h9-zero-twinTiger','h9-zero-eyes']);
  assert.equal(ARM_CONFIG['h1-eyes'].policyInformation,true);
  assert.equal(ARM_CONFIG['h9-normal'].policyInformation,false);
  assert.equal(ARM_CONFIG['h9-zero-eyes'].policyInformation,false);
  assert.equal(ARM_CONFIG['h1-water'].targetChain,'water');
});

test('real engine runs all eight tables with complete four-seat ever-held evidence',()=>{
  for(const arm of ARMS){
    const a=runArm(arm,{target,seeds:[1,2]});
    const b=runArm(arm,{target,seeds:[1,2]});
    assert.deepEqual(a,b);
    assert.equal(a.rows.length,2);
    assert.deepEqual(a.seeds,[1,2]);
    assert.ok(a.sourceSha256&&a.toolSha256&&a.dependenciesSha256.load&&a.gitHead&&a.cfg);
    for(const r of a.rows){
      assert.equal(r.arm,arm);
      assert.equal(r.roles.length,4);
      assert.ok(r.gameLength>0);
      if(arm.startsWith('h1-')) assert.equal(r.roles[0],'qingmian');
      assert.deepEqual(Object.keys(r.holders).sort(),[...chainIds].sort());
      assert.deepEqual(Object.keys(r.first).sort(),[...chainIds].sort());
    }
  }
});

test('H1 uses seat-zero paired win difference and inclusive -8 to +5 pp bounds',()=>{
  const xs=artifacts(Array.from({length:100},(_,i)=>i+1));
  const base=get(xs,'h1-splitter'),water=get(xs,'h1-water'),tiger=get(xs,'h1-twinTiger'),eyes=get(xs,'h1-eyes');
  base.rows.forEach((r,i)=>r.winnerId=i<50?0:1);
  water.rows.forEach((r,i)=>r.winnerId=i<42?0:1);
  tiger.rows.forEach((r,i)=>r.winnerId=i<55?0:1);
  eyes.rows.forEach((r,i)=>r.winnerId=i<41?0:1);
  const result=aggregatePrepared(xs,{requiredSeeds:base.seeds});
  assert.equal(result.h1.water.differencePp,-8);
  assert.equal(result.h1.water.thresholdStatus,'pass');
  assert.equal(result.h1.twinTiger.differencePp,5);
  assert.equal(result.h1.twinTiger.thresholdStatus,'pass');
  assert.equal(result.h1.eyes.thresholdStatus,'fail');
  assert.equal(result.overall.status,'incomplete');
  assert.equal(result.overall.releaseEligible,false);
});

test('H9 counts any of four ever-holders, winner among them, separate denominators and 85% ceiling',()=>{
  const xs=artifacts([1,2,3,4]);
  const normal=get(xs,'h9-normal'),zero=get(xs,'h9-zero-water');
  normal.rows[0].winnerId=2;normal.rows[0].holders.water=[2,3];
  normal.rows[1].winnerId=1;normal.rows[1].holders.water=[3];
  normal.rows[2].winnerId=0;normal.rows[2].holders.water=[0,1,2,3];
  zero.rows[0].winnerId=2;zero.rows[0].holders.water=[1];
  zero.rows[1].winnerId=1;zero.rows[1].holders.water=[1];
  const h=aggregatePrepared(xs,{requiredSeeds:[1,2,3,4]}).h9.water;
  assert.equal(h.normal.anyHolderGames,3);
  assert.equal(h.normal.winnerHolderGames,2);
  assert.equal(h.zero.anyHolderGames,2);
  assert.equal(h.zero.winnerHolderGames,1);
  assert.ok(Math.abs(h.differencePp-100/6)<1e-10);
  assert.equal(h.normal.holderCountDistribution[4],1);
  assert.equal(h.absoluteCeilingPass,true);
});

test('H9 zero denominators are null/incomplete; blind eyes diagnostic cannot pass',()=>{
  const xs=artifacts([1,2]);
  const h=aggregatePrepared(xs,{requiredSeeds:[1,2]});
  assert.equal(h.h9.water.differencePp,null);
  assert.equal(h.h9.water.status,'incomplete');
  assert.equal(h.h9.eyes.status,'incomplete');
  assert.equal(h.overall.status,'incomplete');
  assert.equal(h.overall.sixOfFour.status,'incomplete');
  assert.equal(h.overall.releaseEligible,false);
});

test('H9 +3/+10 bounds and 85% ceiling are independently checked',()=>{
  const xs=artifacts(Array.from({length:100},(_,i)=>i+1));
  for(const id of ['water','twinTiger']){
    const normal=get(xs,'h9-normal'),zero=get(xs,`h9-zero-${id}`);
    normal.rows.forEach((r,i)=>{r.holders[id]=[3];r.winnerId=i<85?3:1;});
    zero.rows.forEach((r,i)=>{r.holders[id]=[3];r.winnerId=i<82?3:1;});
  }
  let h=aggregatePrepared(xs,{requiredSeeds:xs[0].seeds}).h9.water;
  assert.equal(h.differencePp,3);
  assert.equal(h.thresholdStatus,'pass');
  const normal=get(xs,'h9-normal');
  normal.rows[85].winnerId=3;
  h=aggregatePrepared(xs,{requiredSeeds:xs[0].seeds}).h9.water;
  assert.equal(h.absoluteCeilingPass,false);
  assert.equal(h.thresholdStatus,'fail');
});

test('formal status requires exactly seeds 1..10000 and a failing metric makes overall fail',()=>{
  const xs=artifacts(Array.from({length:10000},(_,i)=>i+1));
  get(xs,'h1-water').rows[0].winnerId=0;
  let summary=aggregatePrepared(xs);
  assert.equal(summary.sampleComplete,true);
  assert.equal(summary.h1.water.status,'pass');
  assert.equal(summary.overall.status,'incomplete');
  for(let i=1;i<501;i++) get(xs,'h1-water').rows[i].winnerId=0;
  summary=aggregatePrepared(xs);
  assert.equal(summary.h1.water.status,'fail');
  assert.equal(summary.overall.status,'fail');
  assert.equal(summary.overall.releaseEligible,false);
});

test('aggregate rejects absent arm/seed, duplicate, invalid winner/holders and mixed provenance',()=>{
  const xs=artifacts();
  assert.throws(()=>aggregate(xs.slice(1),{requiredSeeds:[1,2]}),/arm|eight/i);
  const absent=structuredClone(xs);get(absent,'h1-water').rows.pop();
  assert.throws(()=>aggregate(absent,{requiredSeeds:[1,2]}),/seed|row/i);
  const dup=structuredClone(xs);get(dup,'h1-water').rows.push(structuredClone(get(dup,'h1-water').rows[0]));
  assert.throws(()=>aggregate(dup,{requiredSeeds:[1,2]}),/duplicate/i);
  const winner=structuredClone(xs);winner[0].rows[0].winnerId=4;
  assert.throws(()=>aggregate(winner,{requiredSeeds:[1,2]}),/winner/i);
  const holder=structuredClone(xs);holder[0].rows[0].holders.water=[4];
  assert.throws(()=>aggregate(holder,{requiredSeeds:[1,2]}),/holder|seat/i);
  const prov=structuredClone(xs);prov[1].sourceSha256='0'.repeat(64);
  assert.throws(()=>aggregate(prov,{requiredSeeds:[1,2]}),/provenance|source/i);
  const chains=structuredClone(xs);chains[1].effectiveChains.water.flags=null;
  assert.throws(()=>aggregate(chains,{requiredSeeds:[1,2]}),/effective|chain/i);
  const history=structuredClone(xs);history[0].rows[0].holders.water=[2];
  assert.throws(()=>aggregate(history,{requiredSeeds:[1,2]}),/holder\/first/i);
  const roles=structuredClone(xs);get(roles,'h1-water').rows[0].roles[1]='other';
  assert.throws(()=>aggregate(roles,{requiredSeeds:[1,2]}),/roles mismatch/i);
  assert.throws(()=>aggregate(xs),/10000|seed/i);
});

test('CLI requires explicit arm for run and positive n; aggregate is a separate mode',()=>{
  assert.deepEqual(parseCli(['--arm','h1-water','--n','2','--out','x']),
    {mode:'run',arm:'h1-water',n:2,out:'x',target:undefined});
  assert.equal(parseCli(['--aggregate','x','--out','y']).mode,'aggregate');
  assert.throws(()=>parseCli(['--n','2']),/arm/i);
  assert.throws(()=>parseCli(['--arm','bad']),/arm/i);
  assert.throws(()=>parseCli(['--arm','h1-water','--n','0']),/positive/i);
});

test('gzip arm files round-trip; all writes are exclusive and report keeps table/limit labels',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yaoshi-l1-formal-'));
  try{
    const xs=artifacts([1,2]);
    for(const a of xs) writeArm(a,temp);
    const loaded=readArms(temp);
    assert.deepEqual(loaded,xs);
    assert.throws(()=>writeArm(xs[0],temp),/EEXIST/i);
    const summary=aggregatePrepared(loaded,{requiredSeeds:[1,2]});
    const raw=fs.readFileSync(path.join(temp,'h1-water.json.gz'));
    const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
    assert.deepEqual(summary.rawFiles['h1-water'],{
      file:'h1-water.json.gz',compressedSha256:hash(raw),decodedSha256:hash(zlib.gunzipSync(raw))});
    const report=reportMarkdown(summary);
    assert.match(report,/H1.*qingmian/i);
    assert.match(report,/H9.*scriptedBids seat 0 and AI/i);
    assert.match(report,/not a holdout/i);
    const out=path.join(temp,'summary');
    writeAggregate(summary,out);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'summary.json'),'utf8')),summary);
    assert.throws(()=>writeAggregate(summary,out),/already exists/i);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

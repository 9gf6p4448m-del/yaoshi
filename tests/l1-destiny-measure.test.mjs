import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {snapshotRuntimeValue} from './tools/l1-formal.mjs';
import {loadDestinyProtocol,armIds,captureProvenance,verifyProvenance,
  validateRawBatch,conditionalRate} from './tools/l1-destiny-formal.mjs';
import {generatePrivateDrawTable,runArm} from './tools/l1-destiny-run.mjs';
import {analyzeDestinyArtifacts,pairedEffectStatus} from './tools/l1-destiny-analyze.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const protocol=loadDestinyProtocol({root});
const destinyArms=armIds(protocol,'destiny');
const seeds=[10001,10002];
const rows=(arm,forSeeds=seeds)=>forSeeds.map(seed=>({arm,seed,status:'complete',winnerId:seed===10001?0:1,
  roles:['qingmian','a','b','c'],destinyDraws:['water','eyes','water','godKing'],
  gameLength:1,finalLife:[10,10,10,10],survival:[1,1,1,1],costs:[0,0,0,0],
  awakenings:[],chainHoldings:{first:{},holders:{},mutationCount:0},
  policyDecisions:{calls:0,extraPreviewAvailable:0,revealAvailable:0,informedVsBlindDiff:0},
  destinyNights:[{round:1,awakenings:[],dayEvents:[],fights:[]}]}));
const batch=(provenance,forSeeds=seeds)=>destinyArms.map(arm=>({schema:'yaoshi.destiny.raw.arm.v1',arm,
  provenance:{...provenance},seeds:[...forSeeds],rows:rows(arm,forSeeds)}));
const writeDrawTable=(file,forSeeds)=>fs.writeFileSync(file,JSON.stringify({
  schema:'yaoshi.destiny.private-draws.v1',
  rows:forSeeds.map(seed=>({seed,draws:['water','eyes','water','godKing']}))}));

test('function-bearing chain effects get a stable, cloneable source fingerprint',()=>{
  const a=snapshotRuntimeValue({hooks:{onNightEnd:function onNightEnd(){return 1;}},flags:['heal']});
  const b=snapshotRuntimeValue({hooks:{onNightEnd:function onNightEnd(){return 2;}},flags:['heal']});
  assert.doesNotThrow(()=>structuredClone(a));
  assert.match(a.hooks.onNightEnd.functionSha256,/^[0-9a-f]{64}$/);
  assert.notEqual(a.hooks.onNightEnd.functionSha256,b.hooks.onNightEnd.functionSha256);
});

test('machine-readable protocol freezes six chains, arm IDs and seed blocks',()=>{
  assert.equal(protocol.schema,'yaoshi.destiny.acceptance.arms.v1');
  assert.equal(protocol.chainIds.length,6);
  assert.deepEqual(destinyArms,['ordinary-ai-off','original-ai-off','candidate-ai-off',
    'ordinary-ai-on','original-ai-on','candidate-ai-on']);
  assert.equal(armIds(protocol,'ordinaryH1').length,7);
  assert.equal(armIds(protocol,'ordinaryH9').length,7);
  assert.equal(protocol.seeds.initialStart,10001);
  assert.equal(protocol.seeds.initialEndInclusive,20000);
  const wrong=structuredClone(protocol);wrong.destinyGame.arms['original-ai-on'].aiDestinyBonus=false;
  assert.throws(()=>armIds(wrong,'destiny'),/predeclared|arm|factor/i);
  const pairs=structuredClone(protocol);
  pairs.destinyGame.pairedComparisons.pureOriginalEffect=['candidate-ai-off','ordinary-ai-off'];
  assert.throws(()=>armIds(pairs,'destiny'),/predeclared|comparison|pair/i);
  const checkpoint=structuredClone(protocol);checkpoint.checkpointCohort.minimumPerChain=1;
  assert.throws(()=>armIds(checkpoint,'destiny'),/predeclared|checkpoint/i);
  const bootstrap=structuredClone(protocol);bootstrap.bootstrap.resamples=100;
  assert.throws(()=>armIds(bootstrap,'destiny'),/predeclared|bootstrap/i);
  const eyePolicy=structuredClone(protocol);eyePolicy.ordinaryH1.chasers.eyes.recordPolicyInformation=false;
  assert.throws(()=>armIds(eyePolicy,'ordinaryH1'),/predeclared|information|eyes/i);
  const destinyDraw=structuredClone(protocol);destinyDraw.destinyGame.destinyDraw='without replacement';
  assert.throws(()=>armIds(destinyDraw,'destiny'),/predeclared|destiny|draw/i);
  const cohort=structuredClone(protocol);cohort.checkpointCohort.focusSeat='seat 0';
  assert.throws(()=>armIds(cohort,'destiny'),/predeclared|checkpoint/i);
});

test('raw validator accepts a complete same-seed six-arm batch and rejects mutations',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yaoshi-destiny-measure-'));
  try{
    const paths=Object.fromEntries(['product','runner','acceptance','config'].map(name=>{
      const file=path.join(temp,`${name}.txt`);fs.writeFileSync(file,name);return [name,file];
    }));
    paths.dependencies={simulation:path.join(temp,'simulation.txt')};
    fs.writeFileSync(paths.dependencies.simulation,'simulation v1');
    paths.privateDrawTable=path.join(temp,'private-draws.json');
    writeDrawTable(paths.privateDrawTable,seeds);
    const provenance=captureProvenance(paths,{cfg:{ROUNDS:12},
      policyVersions:{seat0:'destiny-chaser-v1',opponents:'original-ai'},seeds});
    assert.match(provenance.dependenciesSha256.balance,/^[0-9a-f]{64}$/);
    assert.match(provenance.dependenciesSha256.load,/^[0-9a-f]{64}$/);
    assert.match(provenance.dependenciesSha256.information,/^[0-9a-f]{64}$/);
    assert.match(provenance.dependenciesSha256.formal,/^[0-9a-f]{64}$/);
    assert.match(provenance.privateDrawTableSha256,/^[0-9a-f]{64}$/);
    const validate=xs=>validateRawBatch(xs,{protocol,group:'destiny',requiredSeeds:seeds,
      expectedProvenance:provenance,paths});
    assert.deepEqual(validate(batch(provenance)),{arms:destinyArms,seeds,rows:12,
      seedCoverageComplete:false,runnerStatus:'wired',measurementStatus:'incomplete',releaseEligible:false});
    assert.ok(!Object.hasOwn(validate(batch(provenance)),'formalSampleComplete'));
    const missing=batch(provenance);missing[0].rows.pop();
    assert.throws(()=>validate(missing),/missing seed|row count/i);
    const duplicate=batch(provenance);duplicate[0].rows[1].seed=10001;
    assert.throws(()=>validate(duplicate),/duplicate seed/i);
    const winner=batch(provenance);winner[0].rows[0].winnerId=4;
    assert.throws(()=>validate(winner),/winner/i);
    const failed=batch(provenance);failed[0].rows[0].status='failed';
    assert.throws(()=>validate(failed),/incomplete|failed|status/i);
    const mixed=batch(provenance);mixed[1].provenance.productSha256='f'.repeat(64);
    assert.throws(()=>validate(mixed),/provenance|hash/i);
    const mixedDependency=batch(provenance);
    mixedDependency[1].provenance.dependenciesSha256={...provenance.dependenciesSha256,
      balance:'f'.repeat(64)};
    assert.throws(()=>validate(mixedDependency),/provenance|hash/i);
    const drawMismatch=batch(provenance);drawMismatch[1].rows[0].destinyDraws[0]='eyes';
    assert.throws(()=>validate(drawMismatch),/destiny draw|same-seed/i);
    const missingNight=batch(provenance);delete missingNight[0].rows[0].destinyNights;
    assert.throws(()=>validate(missingNight),/destiny night/i);
    const missingCosts=batch(provenance);delete missingCosts[0].rows[0].costs;
    assert.throws(()=>validate(missingCosts),/cost/i);
    const missingPolicy=batch(provenance);delete missingPolicy[0].rows[0].policyDecisions;
    assert.throws(()=>validate(missingPolicy),/policy information/i);
    const fakeAwakening=batch(provenance);
    fakeAwakening[0].rows[0].awakenings=[{pid:0,chainId:'eyes',round:1}];
    assert.throws(()=>validate(fakeAwakening),/awakening chronology|destiny/i);
    const allArmsSameWrongDraw=batch(provenance);
    for(const arm of allArmsSameWrongDraw) arm.rows[0].destinyDraws[0]='eyes';
    assert.throws(()=>validate(allArmsSameWrongDraw),/private destiny draw table mismatch/i);
    writeDrawTable(paths.privateDrawTable,[10001]);
    assert.throws(()=>validate(batch(provenance)),/hash|changed/i);
    writeDrawTable(paths.privateDrawTable,seeds);
    fs.writeFileSync(paths.dependencies.simulation,'simulation v2');
    assert.throws(()=>verifyProvenance(provenance,paths),/hash|changed/i);
    fs.writeFileSync(paths.dependencies.simulation,'simulation v1');
    fs.writeFileSync(paths.product,'changed product');
    assert.throws(()=>verifyProvenance(provenance,paths),/hash|changed/i);
    assert.throws(()=>validate(batch(provenance)),/hash|changed/i);
  }finally{fs.rmSync(temp,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
});

test('ten thousand structurally valid rows cannot be mistaken for a measured result',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yaoshi-destiny-coverage-'));
  try{
    const paths=Object.fromEntries(['product','runner','acceptance','config'].map(name=>{
      const file=path.join(temp,`${name}.txt`);fs.writeFileSync(file,name);return [name,file];
    }));
    const fullSeeds=Array.from({length:10000},(_,i)=>10001+i);
    paths.privateDrawTable=path.join(temp,'private-draws.json');
    writeDrawTable(paths.privateDrawTable,fullSeeds);
    const provenance=captureProvenance(paths,{cfg:{ROUNDS:12},
      policyVersions:{seat0:'destiny-chaser-v1'},seeds:fullSeeds});
    const result=validateRawBatch(batch(provenance,fullSeeds),{protocol,group:'destiny',
      requiredSeeds:fullSeeds,expectedProvenance:provenance,paths});
    assert.equal(result.seedCoverageComplete,true);
    assert.equal(result.runnerStatus,'wired');
    assert.equal(result.measurementStatus,'incomplete');
    assert.equal(result.releaseEligible,false);
    assert.ok(!Object.hasOwn(result,'formalSampleComplete'));
  }finally{fs.rmSync(temp,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
});

test('conditional measures fail closed on an empty denominator',()=>{
  assert.throws(()=>conditionalRate([],()=>true),/empty denominator/i);
  assert.equal(conditionalRate([{winnerId:0},{winnerId:1}],r=>r.winnerId===0),0.5);
});

test('paired effect gate refuses small samples and zero-trigger arms despite a narrow interval',()=>{
  assert.equal(pairedEffectStatus([0,0],{sampleComplete:false,hasTrueEvent:true}),'incomplete');
  assert.equal(pairedEffectStatus([0,0],{sampleComplete:true,hasTrueEvent:false}),'incomplete');
  assert.equal(pairedEffectStatus([0,0],{sampleComplete:true,hasTrueEvent:true}),'pass');
  assert.equal(pairedEffectStatus([7,8],{sampleComplete:true,hasTrueEvent:true}),'fail');
});

test('real runner executes paired arms with one private draw table and records engine events',()=>{
  const dir=path.join(root,'scratchpad');
  const table=path.join(dir,`test-private-${crypto.randomUUID()}.json`);
  try{
    generatePrivateDrawTable(seeds,table);
    const artifacts=destinyArms.map(arm=>runArm(arm,{seeds,privateDrawTable:table}));
    const paths={product:path.join(root,'index.html'),runner:path.join(root,'tests/tools/l1-destiny-run.mjs'),
      acceptance:path.join(root,'docs/experiments/2026-09-23-destiny/acceptance.md'),
      config:path.join(root,'docs/experiments/2026-09-23-destiny/arms.json'),privateDrawTable:table};
    const result=validateRawBatch(artifacts,{protocol,group:'destiny',requiredSeeds:seeds,
      expectedProvenance:artifacts[0].provenance,paths});
    assert.equal(result.runnerStatus,'wired');
    assert.equal(result.measurementStatus,'incomplete','two games cannot support formal balance');
    const summary=analyzeDestinyArtifacts(artifacts,{privateDrawTable:table,seeds});
    assert.equal(summary.sampleComplete,false);
    assert.equal(summary.checkpointCohort.status,'incomplete');
    assert.equal(summary.releaseEligible,false);
    assert.equal(summary.paired.pureOriginalEffect.pairs,2);
    assert.equal(summary.paired.pureOriginalEffect.status,'incomplete',
      'a pilot can never get a formal pass even if its paired interval is narrow');
    for(const artifact of artifacts) for(const row of artifact.rows){
      assert.equal(row.status,'complete');
      assert.equal(row.destinyNights.length,row.gameLength);
      assert.deepEqual(row.destinyDraws,artifacts[0].rows.find(r=>r.seed===row.seed).destinyDraws);
      assert.ok(row.destinyNights.every(n=>n.fights.every(f=>f.beats<=3)));
    }
    assert.equal(runArm('h1-eyes',{group:'ordinaryH1',seeds:[10001]}).rows[0].status,'complete');
    assert.equal(runArm('h1-splitter',{group:'ordinaryH1',seeds:[10001]})
      .provenance.policyVersions.seat0,'POLICIES.splitter');
    assert.equal(runArm('h9-zero-water',{group:'ordinaryH9',seeds:[10001]}).rows[0].status,'complete');
    assert.throws(()=>generatePrivateDrawTable(seeds,path.join(root,'docs/private-draws.json')),
      /scratchpad/i);
  }finally{ if(fs.existsSync(table)) fs.unlinkSync(table); }
});

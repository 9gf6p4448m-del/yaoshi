import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateSeeds} from './l1-balance.mjs';

const OWN_FILE=fileURLToPath(import.meta.url);
const HERE=path.dirname(OWN_FILE);
const ROOT=path.resolve(HERE,'../..');
const CHAINS=['water','eyes','twinTiger','bloodOath','godKing','eternalFlame'];
const DESTINY_ARMS=['ordinary-ai-off','original-ai-off','candidate-ai-off',
  'ordinary-ai-on','original-ai-on','candidate-ai-on'];
const PAIRED_COMPARISONS={
  pureOriginalEffect:['original-ai-off','ordinary-ai-off'],
  pureCandidateEffect:['candidate-ai-off','ordinary-ai-off'],
  originalEffectWithAi:['original-ai-on','ordinary-ai-on'],
  candidateEffectWithAi:['candidate-ai-on','ordinary-ai-on'],
  aiPursuitOnly:['ordinary-ai-on','ordinary-ai-off'],
  originalProductBundle:['original-ai-on','ordinary-ai-off'],
  candidateProductBundle:['candidate-ai-on','ordinary-ai-off']};
const DEPENDENCIES={foundation:OWN_FILE,balance:path.join(HERE,'l1-balance.mjs'),
  load:path.join(HERE,'load.mjs'),information:path.join(HERE,'l1-information.mjs'),
  formal:path.join(HERE,'l1-formal.mjs')};
const SHA=/^[0-9a-f]{64}$/;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hashFile=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const assert=(condition,message)=>{if(!condition) throw Error(message);};

function validateProtocol(protocol){
  assert(protocol?.schema==='yaoshi.destiny.acceptance.arms.v1','invalid predeclared protocol schema');
  assert(same(protocol.chainIds,CHAINS),'invalid predeclared chain IDs');
  const seed=protocol.seeds;
  assert(seed?.initialStart===10001&&seed.initialEndInclusive===20000&&
    seed.extensionEndInclusive===110000&&seed.blockSize===10000,
    'invalid predeclared seed blocks');
  assert(typeof seed.extensionCondition==='string'&&
    seed.extensionCondition.includes('ordinary-ai-off')&&
    seed.extensionCondition.includes('below 300')&&
    seed.extensionCondition.includes('never use win rates'),
    'invalid predeclared extension rule');
  assert(same(protocol.bootstrap,{resamples:10000,seed:20260923,cluster:'game seed'}),
    'invalid predeclared bootstrap');
  assert(protocol.engine?.freshLoadPerArm===true&&protocol.engine.maxNodeProcesses===3,
    'invalid predeclared engine isolation');
  assert(protocol.engine.mode==='solo'&&protocol.engine.rounds==='unchanged CFG.ROUNDS=12'&&
    protocol.engine.end==='playPolicyGame stops when seat 0 dies, at most one seat alive, or round 12; then original winnerId settlement',
    'invalid predeclared engine endpoint');
  assert(protocol.destinyGame?.policyInformation===true&&
    protocol.destinyGame.recordChainHoldings===true,
    'predeclared destiny information evidence missing');
  assert(same(protocol.destinyGame.picks,['qingmian'])&&
    protocol.destinyGame.seat0Role==='qingmian'&&
    protocol.destinyGame.seat0Policy===
      'destiny-chaser-v1: read only own assigned destiny; use createEyesPolicy(informed) for eyes and otherwise createChaser(target-chaser-v1, assigned chain); same policy in every destiny arm'&&
    protocol.destinyGame.destinyDraw===
      'four independent secure private draws per seed, recorded once and reused across all six arms; never derived from public game seed'&&
    protocol.destinyGame.ordinaryEffects==='all six unchanged'&&
    same(protocol.destinyGame.informationLivenessChecks,[
      'eyes informed policy receives its own legal preview and prior second bid',
      'ordinary eyes sees three previews while true eyes sees four',
      'informedVsBlindDiff is reported and cannot be silently zero from missing context']),
    'invalid predeclared destiny draw, policy or information contract');
  assert(same(protocol.destinyGame.pairedComparisons,PAIRED_COMPARISONS),
    'invalid predeclared paired comparisons');
  const checkpoint=protocol.checkpointCohort;
  assert(checkpoint?.sourceArm==='ordinary-ai-off'&&checkpoint.minimumPerChain===300&&
    checkpoint.phase==='first actual auction insertion that completes that seat\'s assigned recipe, before applying any true effect'&&
    checkpoint.fork==='exact full game state, object identity and RNG state; same seat, same future legal policy'&&
    checkpoint.focusSeat==='the seat whose assigned recipe just completed; evaluate this seat\'s terminal winner indicator'&&
    checkpoint.effectToggle==='enable the focus seat\'s assigned true chain only in the treatment fork; its true effect is off in control; all other seats\' true effects are off in both forks'&&
    checkpoint.missingForkResult==='incomplete, never a post-treatment holder comparison',
    'invalid predeclared checkpoint');
  assert(same(Object.keys(protocol.destinyGame.arms),DESTINY_ARMS),
    'invalid predeclared destiny arms');
  for(const arm of DESTINY_ARMS){
    const [effect,,ai]=arm.split('-');
    const spec=protocol.destinyGame.arms[arm];
    const expectedEffect={ordinary:'off',original:'R2 original',candidate:'Premortem candidate'}[effect];
    assert(spec?.trueEffects===expectedEffect&&spec.aiDestinyBonus===(ai==='on'),
      `invalid predeclared arm factors: ${arm}`);
  }
  const h1=protocol.ordinaryH1;
  assert(h1?.splitter?.arm==='h1-splitter'&&h1.splitter.seat0Policy==='POLICIES.splitter'&&
    h1.seat0Role==='qingmian'&&same(h1.picks,['qingmian'])&&
    h1.destinyDraw===false&&h1.aiDestinyBonus===false&&h1.trueEffects==='off'&&
    same(Object.keys(h1.chasers),CHAINS),'invalid predeclared ordinary H1 arms');
  for(const id of CHAINS){
    const spec=h1.chasers[id];
    assert(spec?.arm===`h1-${id}`&&spec.seat0Policy===
      (id==='eyes'?'createEyesPolicy(eyes-informed-v1, informed)':
        `createChaser(target-chaser-v1, ${id})`)&&
      (id!=='eyes'||spec.recordPolicyInformation===true),
    `invalid predeclared H1 chain or information policy ${id}`);
  }
  const h9=protocol.ordinaryH9;
  assert(h9?.normalArm==='h9-normal'&&same(Object.keys(h9.zeroArms),CHAINS)&&
    h9.picks===null&&h9.seat0Policy==='original scriptedBids via policies={}'&&
    h9.destinyDraw===false&&h9.aiDestinyBonus===false&&h9.trueEffects==='off',
    'invalid predeclared ordinary H9 arms');
  for(const id of CHAINS) assert(h9.zeroArms[id]===`h9-zero-${id}`,
    `invalid predeclared H9 chain ${id}`);
  assert(h9.zeroEffectDefinition==='delete only that CHAINS entry\'s flags, traits, hooks and army; keep id, recipe and aiBonus'&&
    h9.holderDenominator==='for each arm separately, games where any of four seats ever acquired the complete specified recipe'&&
    h9.holderNumerator==='winnerId belongs to that arm\'s holder set',
    'invalid predeclared H9 counterfactual or denominator');
  assert(same(protocol.formalReleaseRequires,[
    'original-H1-H9-gates-resolved-or-new-user-ruling',
    'ordinary-six-H1-H9-and-counterfactual-audit',
    'destiny-balance-and-readability',
    'six-of-four-cross-night-pass-or-new-user-ruling']),
    'invalid predeclared release gates');
  assert(same(protocol.provenance,[
    'productSha256','runnerSha256','acceptanceSha256','configSha256',
    'privateDrawTableSha256','gitHead','cfg','policyVersions','seedList']),
    'invalid private destiny draw provenance contract');
  return protocol;
}

export function loadDestinyProtocol({root=ROOT}={}){
  const file=path.join(root,'docs/experiments/2026-09-23-destiny/arms.json');
  return validateProtocol(JSON.parse(fs.readFileSync(file,'utf8')));
}

export function armIds(protocol,group){
  validateProtocol(protocol);
  if(group==='destiny') return [...DESTINY_ARMS];
  if(group==='ordinaryH1') return [protocol.ordinaryH1.splitter.arm,
    ...CHAINS.map(id=>protocol.ordinaryH1.chasers[id].arm)];
  if(group==='ordinaryH9') return [protocol.ordinaryH9.normalArm,
    ...CHAINS.map(id=>protocol.ordinaryH9.zeroArms[id])];
  throw Error(`unknown predeclared arm group ${group}`);
}

function dependencyFiles(paths){
  const extra=paths?.dependencies??{};
  assert(extra&&typeof extra==='object'&&!Array.isArray(extra)&&
    Object.keys(extra).every(key=>!Object.hasOwn(DEPENDENCIES,key)&&
      typeof extra[key]==='string'&&fs.existsSync(extra[key])),
  'invalid provenance dependency files');
  return {...DEPENDENCIES,...extra};
}

export function captureProvenance(paths,{cfg,policyVersions,seeds}={}){
  assert(paths&&['product','runner','acceptance','config'].every(key=>
    typeof paths[key]==='string'&&fs.existsSync(paths[key])),
  'missing provenance input file');
  assert(cfg&&typeof cfg==='object'&&policyVersions&&typeof policyVersions==='object',
    'missing cfg or policy versions');
  const seedList=validateSeeds(seeds);
  const dependenciesSha256=Object.fromEntries(Object.entries(dependencyFiles(paths))
    .map(([name,file])=>[name,hashFile(file)]));
  return {productSha256:hashFile(paths.product),runnerSha256:hashFile(paths.runner),
    acceptanceSha256:hashFile(paths.acceptance),configSha256:hashFile(paths.config),
    ...(paths.privateDrawTable?{privateDrawTableSha256:hashFile(paths.privateDrawTable)}:{}),
    dependenciesSha256,
    gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
    cfg:structuredClone(cfg),policyVersions:structuredClone(policyVersions),seedList};
}

export function verifyProvenance(provenance,paths){
  assert(provenance&&typeof provenance==='object','missing provenance');
  for(const [key,file] of Object.entries({productSha256:paths.product,
    runnerSha256:paths.runner,acceptanceSha256:paths.acceptance,
    configSha256:paths.config,
    ...(paths.privateDrawTable?{privateDrawTableSha256:paths.privateDrawTable}:{})})){
    assert(typeof provenance[key]==='string'&&SHA.test(provenance[key]),
      `invalid provenance hash: ${key}`);
    assert(provenance[key]===hashFile(file),`changed code or contract hash: ${key}`);
  }
  const dependencies=dependencyFiles(paths);
  assert(same(Object.keys(provenance.dependenciesSha256??{}).sort(),
    Object.keys(dependencies).sort()),'missing provenance dependency hash');
  for(const [key,file] of Object.entries(dependencies)){
    const hash=provenance.dependenciesSha256[key];
    assert(typeof hash==='string'&&SHA.test(hash),`invalid dependency hash: ${key}`);
    assert(hash===hashFile(file),`changed dependency hash: ${key}`);
  }
  const head=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
  assert(provenance.gitHead===head,'changed Git HEAD');
  assert(provenance.cfg&&typeof provenance.cfg==='object'&&
    provenance.policyVersions&&typeof provenance.policyVersions==='object'&&
    Array.isArray(provenance.seedList),'missing provenance settings');
  validateSeeds(provenance.seedList);
  return true;
}

function readPrivateDrawTable(paths,seeds){
  assert(typeof paths?.privateDrawTable==='string'&&fs.existsSync(paths.privateDrawTable),
    'private destiny draw table required');
  const table=JSON.parse(fs.readFileSync(paths.privateDrawTable,'utf8'));
  assert(table?.schema==='yaoshi.destiny.private-draws.v1'&&
    Array.isArray(table.rows)&&table.rows.length===seeds.length,
    'invalid private destiny draw table');
  const draws=new Map();
  for(const [i,row] of table.rows.entries()){
    assert(row?.seed===seeds[i]&&Array.isArray(row.draws)&&row.draws.length===4&&
      row.draws.every(id=>CHAINS.includes(id)),
      `invalid private destiny draw row ${i}`);
    draws.set(row.seed,row.draws);
  }
  return draws;
}

export function validateRawBatch(artifacts,{protocol,group,requiredSeeds,expectedProvenance,paths}={}){
  const arms=armIds(protocol,group);
  const seeds=validateSeeds(requiredSeeds);
  const allowedSeeds=new Set(seeds);
  assert(seeds.every((seed,i)=>seed===protocol.seeds.initialStart+i),
    'required seeds must start at the predeclared initial block');
  // Extensions need audited ordinary-ai-off completion counts. No such
  // evidence exists in this foundation yet, so reject extended samples.
  assert(seeds.length<=protocol.seeds.blockSize,
    'seed extension requires audited ordinary-ai-off completion evidence');
  verifyProvenance(expectedProvenance,paths);
  assert(same(expectedProvenance.seedList,seeds),'provenance seed list mismatch');
  const privateDraws=group==='destiny'?readPrivateDrawTable(paths,seeds):null;
  if(privateDraws) assert(typeof expectedProvenance.privateDrawTableSha256==='string',
    'missing private destiny draw commitment');
  assert(Array.isArray(artifacts)&&artifacts.length===arms.length,
    'missing predeclared arm artifact');
  const byArm=new Map();
  for(const artifact of artifacts){
    assert(artifact?.schema==='yaoshi.destiny.raw.arm.v1'&&arms.includes(artifact.arm),
      'unknown raw arm or schema');
    assert(!byArm.has(artifact.arm),`duplicate arm ${artifact.arm}`);
    byArm.set(artifact.arm,artifact);
    assert(same(artifact.provenance,expectedProvenance),
      `provenance mismatch in ${artifact.arm}`);
    assert(same(artifact.seeds,seeds),`seed list mismatch in ${artifact.arm}`);
    assert(Array.isArray(artifact.rows),'missing raw rows');
    const found=new Set();
    for(const row of artifact.rows){
      assert(row?.arm===artifact.arm,`raw row arm mismatch in ${artifact.arm}`);
      assert(Number.isSafeInteger(row.seed)&&allowedSeeds.has(row.seed),
        `unexpected seed in ${artifact.arm}`);
      assert(!found.has(row.seed),`duplicate seed ${row.seed} in ${artifact.arm}`);
      found.add(row.seed);
      assert(row.status==='complete',`incomplete or failed seed ${row.seed} in ${artifact.arm}`);
      assert(Number.isInteger(row.winnerId)&&row.winnerId>=0&&row.winnerId<4,
        `invalid winner in ${artifact.arm} seed ${row.seed}`);
      assert(Array.isArray(row.roles)&&row.roles.length===4&&
        row.roles.every(role=>typeof role==='string'&&role),
        `invalid four-seat roles in ${artifact.arm} seed ${row.seed}`);
      assert(Number.isInteger(row.gameLength)&&row.gameLength>=1&&row.gameLength<=12&&
        Array.isArray(row.finalLife)&&row.finalLife.length===4&&
        row.finalLife.every(Number.isFinite)&&
        Array.isArray(row.survival)&&row.survival.length===4&&
        row.survival.every(n=>Number.isInteger(n)&&n>=1&&n<=row.gameLength),
        `invalid endpoint evidence in ${artifact.arm} seed ${row.seed}`);
      assert(Array.isArray(row.costs)&&row.costs.length===4&&
        row.costs.every(n=>Number.isFinite(n)&&n>=0)&&
        Array.isArray(row.awakenings)&&row.awakenings.every(e=>
          Number.isInteger(e.pid)&&e.pid>=0&&e.pid<4&&CHAINS.includes(e.chainId)&&
          Number.isInteger(e.round)&&e.round>=1&&e.round<=row.gameLength)&&
        new Set(row.awakenings.map(e=>e.pid)).size===row.awakenings.length,
        `invalid cost or awakening evidence in ${artifact.arm} seed ${row.seed}`);
      assert(row.chainHoldings&&typeof row.chainHoldings==='object'&&
        Number.isInteger(row.chainHoldings.mutationCount)&&row.chainHoldings.mutationCount>=0&&
        row.chainHoldings.holders&&typeof row.chainHoldings.holders==='object'&&
        row.chainHoldings.first&&typeof row.chainHoldings.first==='object'&&
        Object.entries(row.chainHoldings.holders).every(([id,holders])=>
          CHAINS.includes(id)&&Array.isArray(holders)&&
          holders.every(pid=>Number.isInteger(pid)&&pid>=0&&pid<4))&&
        Object.keys(row.chainHoldings.first).every(id=>CHAINS.includes(id)),
        `invalid chain holdings evidence in ${artifact.arm} seed ${row.seed}`);
      assert(row.policyDecisions&&typeof row.policyDecisions==='object'&&
        ['calls','extraPreviewAvailable','revealAvailable','informedVsBlindDiff']
          .every(key=>Number.isInteger(row.policyDecisions[key])&&row.policyDecisions[key]>=0),
        `invalid policy information evidence in ${artifact.arm} seed ${row.seed}`);
      if(group==='destiny') assert(Array.isArray(row.destinyDraws)&&
        row.destinyDraws.length===4&&row.destinyDraws.every(id=>CHAINS.includes(id)),
        `invalid destiny draws in ${artifact.arm} seed ${row.seed}`);
      if(group==='destiny') assert(Array.isArray(row.destinyNights)&&
        row.destinyNights.length===row.gameLength&&
        row.destinyNights.every((night,index)=>night?.round===index+1&&
          Array.isArray(night.awakenings)&&Array.isArray(night.dayEvents)&&
          Array.isArray(night.fights)&&
          night.awakenings.every(e=>Number.isInteger(e.pid)&&e.pid>=0&&e.pid<4&&
            CHAINS.includes(e.chainId))&&
          night.dayEvents.every(e=>Number.isInteger(e.pid)&&e.pid>=0&&e.pid<4&&
            CHAINS.includes(e.chainId)&&typeof e.kind==='string'&&e.kind)&&
          night.fights.every(f=>Number.isInteger(f.a)&&f.a>=0&&f.a<4&&
            Number.isInteger(f.b)&&f.b>=0&&f.b<4&&f.a!==f.b&&
            Number.isInteger(f.beats)&&f.beats>=0&&f.beats<=3&&
            Number.isInteger(f.trueBloodRetaliations)&&f.trueBloodRetaliations>=0&&
            f.traits&&typeof f.traits==='object'&&!Array.isArray(f.traits)&&
            Object.values(f.traits).every(n=>Number.isInteger(n)&&n>=0)&&
            Array.isArray(f.trueEvents)&&f.trueEvents.every(e=>
              (e.pid===f.a||e.pid===f.b)&&typeof e.id==='string'&&
              (e.id==='trueBloodOath'||e.id.startsWith('true'))&&
              Number.isInteger(e.beat)&&e.beat>=1&&e.beat<=3)&&
            f.trueBloodRetaliations===f.trueEvents.filter(e=>e.id==='trueBloodOath').length)),
        `invalid destiny night evidence in ${artifact.arm} seed ${row.seed}`);
      if(group==='destiny') assert(row.awakenings.every(e=>row.destinyDraws[e.pid]===e.chainId)&&
        same(row.awakenings,row.destinyNights.flatMap(n=>n.awakenings.map(e=>({...e,round:n.round})))),
        `awakening chronology mismatch in ${artifact.arm} seed ${row.seed}`);
      if(privateDraws) assert(same(row.destinyDraws,privateDraws.get(row.seed)),
        `private destiny draw table mismatch in ${artifact.arm} seed ${row.seed}`);
    }
    assert(artifact.rows.length===seeds.length&&found.size===seeds.length&&
      seeds.every(seed=>found.has(seed)),`missing seed or row count in ${artifact.arm}`);
  }
  assert(arms.every(arm=>byArm.has(arm)),'missing predeclared arm');
  const baseline=new Map(byArm.get(arms[0]).rows.map(row=>[row.seed,row]));
  for(const arm of arms.slice(1)) for(const row of byArm.get(arm).rows){
    const reference=baseline.get(row.seed);
    assert(same(row.roles,reference.roles),`same-seed roles mismatch in ${arm}`);
    if(group==='destiny') assert(same(row.destinyDraws,reference.destinyDraws),
      `same-seed destiny draw mismatch in ${arm}`);
  }
  return {arms,seeds,rows:arms.length*seeds.length,
    seedCoverageComplete:seeds.length===protocol.seeds.blockSize,
    runnerStatus:'wired',measurementStatus:'incomplete',releaseEligible:false};
}

export function conditionalRate(rows,success,predicate=()=>true){
  assert(Array.isArray(rows)&&typeof success==='function'&&typeof predicate==='function',
    'invalid conditional rate input');
  const eligible=rows.filter(predicate);
  assert(eligible.length>0,'empty denominator');
  return eligible.filter(success).length/eligible.length;
}

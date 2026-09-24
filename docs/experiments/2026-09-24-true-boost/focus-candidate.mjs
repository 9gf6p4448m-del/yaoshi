// 真長明／神王加強候選試跑包裝（docs/experiments/2026-09-24-true-boost/acceptance.md）。
// 與 tests/tools/l1-destiny-focus.mjs 的唯一差別：產品原文讀入後依 variant 做字面替換
// （每個替換斷言恰好命中 1 次），再交給 instrumentFocusSource。檢查點一致檢查、
// 焦點席焦點鏈真事件檢查、對照局重放與 baselineRaw 一致檢查全部保留（逐字抄自原工具）。
// 彙整時的雜湊核對改以「候選產品」為準（productSha256 仍核對磁碟 index.html 未變）。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../../tests/tools/load.mjs';
import {createChaser} from '../../tests/tools/l1-balance.mjs';
import {createEyesPolicy} from '../../tests/tools/l1-information.mjs';
import {currentValidationProvenance} from '../../tests/tools/l1-destiny-historical.mjs';
import {loadDestinyProtocol} from '../../tests/tools/l1-destiny-formal.mjs';
import {instrumentFocusSource,canonicalCheckpoint,trueEventCounts,focusGateStatus}
  from '../../tests/tools/l1-destiny-focus.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const SCRATCH=path.join(ROOT,'scratchpad');
const OWN=fileURLToPath(import.meta.url);
const TOOL=path.join(ROOT,'tests/tools/l1-destiny-focus.mjs');
const PRODUCT=path.join(ROOT,'index.html');
const ACCEPTANCE=path.join(ROOT,'docs/experiments/2026-09-23-destiny/acceptance.md');
const CONFIG=path.join(ROOT,'docs/experiments/2026-09-23-destiny/arms.json');
const RUNNER=path.join(ROOT,'tests/tools/l1-destiny-run.mjs');
const CHAIN_IDS=['water','eyes','twinTiger','bloodOath','godKing','eternalFlame'];
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const hashFile=file=>sha(fs.readFileSync(file));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

const R={
  shield:['u.destinyShield=(u.destinyShield||0)+2;','u.destinyShield=(u.destinyShield||0)+3;'],
  dayLife:['const p=S.players[pid];p.life+=1;','const p=S.players[pid];p.life+=2;'],
  kingLife:['win.life+=3;','win.life+=5;'],
  kingLife7:['win.life+=3;','win.life+=7;'],
  smite:['if(sd.trueGodKingBonus&&(S?.destinyEffectMode!=="candidate"||beat===1)) a++;',
    'if(sd.trueGodKingBonus&&(S?.destinyEffectMode!=="candidate"||beat===1)) a+=2;']
};
export const VARIANTS={
  base:[],
  S:[R.shield,R.kingLife],                       // flame-S + king-S
  M:[R.shield,R.dayLife,R.kingLife,R.smite],     // flame-M + king-M
  L:[R.shield,R.dayLife,R.kingLife7]             // flame-M + king-L（第二輪）
};
export function candidateProduct(productText,variant){
  const list=VARIANTS[variant];
  if(!list) throw Error('unknown variant '+variant);
  let text=productText;
  for(const [before,after] of list){
    const found=text.split(before).length-1;
    if(found!==1) throw Error('candidate anchor mismatch ('+found+'): '+before);
    text=text.replace(before,()=>after);
    if(text.split(after).length-1!==1) throw Error('candidate result not unique: '+after);
  }
  return text;
}

function privateFile(file,{exists=true}={}){
  if(typeof file!=='string'||!file) throw Error('private scratchpad path required');
  const absolute=path.resolve(file);
  if(!absolute.startsWith(SCRATCH+path.sep)) throw Error('private data must stay in scratchpad');
  fs.mkdirSync(path.dirname(absolute),{recursive:true});
  if(fs.lstatSync(SCRATCH).isSymbolicLink()) throw Error('scratchpad symlink');
  const root=fs.realpathSync(SCRATCH);
  const parent=fs.realpathSync(path.dirname(absolute));
  if(parent!==root&&!parent.startsWith(root+path.sep)) throw Error('private path escapes scratchpad');
  if(exists&&!fs.existsSync(absolute)) throw Error('private input missing');
  if(fs.existsSync(absolute)&&fs.lstatSync(absolute).isSymbolicLink()) throw Error('private file symlink');
  return absolute;
}

function createEngine(source){
  const storage={getItem(){return null;},setItem(){},__focus:null,__checkpoint:null,__runnerFrame:null,__activeTrueAudit:null};
  const G=loadGame(PRODUCT,{sourceText:source,storage});
  const chasers=Object.fromEntries(CHAIN_IDS.map(id=>[id,createChaser(G,id)]));
  const eyes=createEyesPolicy(G,'informed');
  const policy=(p,ctx)=>p.destiny==='eyes'?eyes(p,ctx):chasers[p.destiny](p,ctx);
  return {G,storage,policies:{0:policy}};
}
function key(event){return String(event.pid)+':'+event.chainId;}
function awakeningList(G){
  return (G.S.history?.nights||[]).flatMap(n=>n.auction.flatMap(a=>
    (a.destinyAwakenings||[]).map(e=>({...e,round:n.round}))));
}
function runGame(engine,seed,draws,mode,focus,expectedCheckpoint=null){
  const {G,storage,policies}=engine;
  storage.__focus=focus;
  let activations=0;
  storage.__activeTrueAudit=(pid,id)=>{
    if(!focus||pid!==focus.pid||id!==focus.chainId)
      throw Error('nonfocus true effect activated');
    activations++;
  };
  const checkpoints=new Map();
  storage.__checkpoint=(awakening,state,auctionFrame)=>{
    if(focus&&key(awakening)!==key(focus)) return;
    const eventKey=key(awakening);
    if(checkpoints.has(eventKey)) throw Error('duplicate focus checkpoint');
    if(typeof storage.__runnerFrame!=='function') throw Error('runner frame missing');
    const payload=canonicalCheckpoint(state,auctionFrame,storage.__runnerFrame());
    if(mode!=='off'){
      if(typeof expectedCheckpoint!=='string'||payload!==expectedCheckpoint)
        throw Error('pre-intervention checkpoint mismatch');
      if(state.destinyEffectMode!=='off') throw Error('treatment started before checkpoint');
    }
    checkpoints.set(eventKey,{payload,sha256:sha(payload),round:state.round});
    if(mode!=='off') state.destinyEffectMode=mode;
  };
  const result=G.playPolicyGame(seed,policies,['qingmian'],{
    trueEffects:'off',destinyAiChase:false,privateDestinyDraws:draws,
    recordChainHoldings:true,recordDestinyEvidence:true,policyInformation:true
  });
  storage.__checkpoint=null;
  storage.__runnerFrame=null;
  storage.__activeTrueAudit=null;
  return {result,checkpoints,awakenings:awakeningList(G),activations};
}
function loadInputs({baselineRaw,privateDrawTable}){
  baselineRaw=privateFile(baselineRaw);
  privateDrawTable=privateFile(privateDrawTable);
  const raw=JSON.parse(fs.readFileSync(baselineRaw,'utf8'));
  const table=JSON.parse(fs.readFileSync(privateDrawTable,'utf8'));
  const protocol=loadDestinyProtocol();
  if(raw.schema!=='yaoshi.destiny.raw.arm.v1'||raw.arm!==protocol.checkpointCohort.sourceArm)
    throw Error('wrong ordinary source arm');
  if(table.schema!=='yaoshi.destiny.private-draws.v1') throw Error('wrong private draw table');
  if(raw.rows.length!==10000||table.rows.length!==10000||raw.seeds.length!==10000)
    throw Error('incomplete fixed seed block');
  const paths={product:PRODUCT,runner:RUNNER,acceptance:ACCEPTANCE,config:CONFIG,privateDrawTable};
  currentValidationProvenance(raw.provenance,paths);
  for(let i=0;i<10000;i++){
    const seed=10001+i,row=raw.rows[i],draw=table.rows[i];
    if(raw.seeds[i]!==seed||row.seed!==seed||draw.seed!==seed||!same(row.destinyDraws,draw.draws))
      throw Error('seed or private draw mismatch at '+seed);
    if(row.status!=='complete'||!Array.isArray(row.awakenings)) throw Error('incomplete source row');
  }
  return {raw,table,baselineRaw,privateDrawTable,protocol};
}
function writeCheckpoint(fd,seed,event,checkpoint){
  const bytes=zlib.gzipSync(Buffer.from(checkpoint.payload,'utf8'));
  const length=Buffer.alloc(4);
  length.writeUInt32LE(bytes.length);
  const offset=fs.fstatSync(fd).size;
  fs.writeSync(fd,length);
  fs.writeSync(fd,bytes);
  return {seed,pid:event.pid,chainId:event.chainId,round:event.round,
    sha256:checkpoint.sha256,offset,bytes:bytes.length+4};
}

function expectedHashes(variant,input){
  const productText=fs.readFileSync(PRODUCT,'utf8');
  const candidate=candidateProduct(productText,variant);
  return {
    productSha256:sha(productText),candidateProductSha256:sha(candidate),
    focusSourceSha256:sha(instrumentFocusSource(candidate)),
    focusRunnerSha256:hashFile(TOOL),wrapperSha256:hashFile(OWN),
    acceptanceSha256:hashFile(ACCEPTANCE),configSha256:hashFile(CONFIG),
    privateDrawTableSha256:hashFile(input.privateDrawTable),
    baselineRawSha256:hashFile(input.baselineRaw)
  };
}

export function runCandidateShard({variant,baselineRaw,privateDrawTable,startSeed,endSeed,outFile,checkpointFile,onProgress}){
  const input=loadInputs({baselineRaw,privateDrawTable});
  if(!Number.isSafeInteger(startSeed)||!Number.isSafeInteger(endSeed)||
    startSeed<10001||endSeed>20000||startSeed>endSeed) throw Error('invalid fixed seed shard');
  outFile=privateFile(outFile,{exists:false});
  checkpointFile=privateFile(checkpointFile,{exists:false});
  if(fs.existsSync(outFile)||fs.existsSync(checkpointFile)) throw Error('formal output already exists');
  const productText=fs.readFileSync(PRODUCT,'utf8');
  const candidateText=candidateProduct(productText,variant);   // 唯一差別
  const source=instrumentFocusSource(candidateText);
  const controlEngine=createEngine(source);
  const treatmentEngines={original:createEngine(source),candidate:createEngine(source)};
  const provenance={
    gitHead:input.raw.provenance.gitHead,variant,replacements:VARIANTS[variant],
    ...expectedHashes(variant,input),
    sourceArm:input.raw.arm,seedStart:startSeed,seedEnd:endSeed,
    policy:'destiny-chaser-v1',focusIsolation:'only matching pid and chain true effect',
    checkpoint:'deterministic ordinary replay, exact full checkpoint match, then focus intervention'
  };
  if(provenance.focusSourceSha256!==sha(source)) throw Error('source hash drift');
  const rows=[];
  let fd;
  try{
    fd=fs.openSync(checkpointFile,'wx');
    for(let seed=startSeed;seed<=endSeed;seed++){
      const row=input.raw.rows[seed-10001];
      const draws=input.table.rows[seed-10001].draws;
      const report={seed,focusEvents:[]};
      if(row.awakenings.length){
        const control=runGame(controlEngine,seed,draws,'off',null);
        if(control.result.winnerId!==row.winnerId||
          control.result.gameLength!==row.gameLength||
          !same(control.result.finalLife,row.finalLife)||
          !same(control.awakenings,row.awakenings))
          throw Error('ordinary replay differs from formal raw at '+seed);
        if(control.checkpoints.size!==row.awakenings.length)
          throw Error('missing ordinary checkpoint at '+seed);
        for(const event of row.awakenings){
          const baseline=control.checkpoints.get(key(event));
          if(!baseline||baseline.round!==event.round) throw Error('ordinary event mismatch at '+seed);
          const saved=writeCheckpoint(fd,seed,event,baseline);
          const effects={};
          for(const mode of ['original','candidate']){
            const treatment=runGame(treatmentEngines[mode],seed,draws,mode,event,baseline.payload);
            const compare=treatment.checkpoints.get(key(event));
            if(!compare||compare.payload!==baseline.payload)
              throw Error('state, object identity, RNG or frame mismatch at '+seed+' '+key(event)+' '+mode);
            const trueEvents=trueEventCounts(treatment.result,event);
            effects[mode]={
              winnerId:treatment.result.winnerId,focusWon:treatment.result.winnerId===event.pid,
              finalLife:treatment.result.finalLife[event.pid],gameLength:treatment.result.gameLength,
              trueEvents,activations:treatment.activations,checkpointSha256:compare.sha256
            };
          }
          report.focusEvents.push({
            pid:event.pid,chainId:event.chainId,round:event.round,
            checkpoint:saved,ordinary:{
              winnerId:control.result.winnerId,focusWon:control.result.winnerId===event.pid,
              finalLife:control.result.finalLife[event.pid],gameLength:control.result.gameLength},
            effects
          });
        }
      }
      rows.push(report);
      if(onProgress&&seed%100===0) onProgress({seed,completed:seed-startSeed+1,total:endSeed-startSeed+1});
    }
    fs.closeSync(fd); fd=null;
    const after=expectedHashes(variant,input);
    for(const [k,v] of Object.entries(after)) if(provenance[k]!==v)
      throw Error('source changed during focus run: '+k);
    const artifact={schema:'yaoshi.destiny.focus-shard.v1',provenance,rows};
    const output=fs.openSync(outFile,'wx');
    try{fs.writeFileSync(output,JSON.stringify(artifact));}finally{fs.closeSync(output);}
    return {outFile,checkpointFile,events:rows.reduce((n,r)=>n+r.focusEvents.length,0)};
  }finally{if(fd!==undefined&&fd!==null) fs.closeSync(fd);}
}

function mulberry32(seed){
  let x=seed>>>0;
  return ()=>{
    x=(x+0x6d2b79f5)>>>0;
    let t=Math.imul(x^(x>>>15),1|x);
    t^=t+Math.imul(t^(t>>>7),61|t);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
const quantile=(a,q)=>{const sorted=[...a].sort((x,y)=>x-y);return sorted[Math.floor((sorted.length-1)*q)];};
function clusterInterval(events,mode,{resamples,seed}){
  const bySeed=new Map();
  for(const e of events){
    const d=Number(e.effects[mode].focusWon)-Number(e.ordinary.focusWon);
    const item=bySeed.get(e.seed)||{count:0,sum:0};
    item.count++;item.sum+=d;bySeed.set(e.seed,item);
  }
  const groups=[...bySeed.entries()].sort((a,b)=>a[0]-b[0]).map(([,group])=>group);
  if(!groups.length) return null;
  const observed=100*groups.reduce((n,g)=>n+g.sum,0)/groups.reduce((n,g)=>n+g.count,0);
  const random=mulberry32(seed),sample=new Float64Array(resamples);
  for(let b=0;b<resamples;b++){
    let wins=0,count=0;
    for(let i=0;i<groups.length;i++){
      const g=groups[Math.floor(random()*groups.length)];
      wins+=g.sum;count+=g.count;
    }
    sample[b]=100*wins/count;
  }
  return {differencePp:observed,ci95Pp:[quantile(sample,.025),quantile(sample,.975)]};
}

export function analyzeCandidateShards(variant,shards,{checkpointFiles,privateDrawTable,baselineRaw}={}){
  if(!Array.isArray(shards)||!shards.length||!Array.isArray(checkpointFiles)||
    checkpointFiles.length!==shards.length) throw Error('every shard requires its checkpoint archive');
  const input=loadInputs({baselineRaw,privateDrawTable});
  const protocol=input.protocol;
  const expected=expectedHashes(variant,input);
  const allRows=[],seen=new Set();
  let sharedProvenance=null;
  for(let i=0;i<shards.length;i++){
    const artifact=JSON.parse(fs.readFileSync(privateFile(shards[i]),'utf8'));
    if(artifact.schema!=='yaoshi.destiny.focus-shard.v1') throw Error('focus shard schema');
    const p=artifact.provenance;
    const shared={...p};delete shared.seedStart;delete shared.seedEnd;
    if(sharedProvenance&&!same(shared,sharedProvenance)) throw Error('mixed focus provenance');
    sharedProvenance=shared;
    if(p.variant!==variant) throw Error('variant mismatch');
    for(const [field,value] of Object.entries(expected))
      if(p[field]!==value) throw Error('focus provenance mismatch: '+field);
    if(p.sourceArm!==protocol.checkpointCohort.sourceArm||
      p.policy!=='destiny-chaser-v1'||
      p.focusIsolation!=='only matching pid and chain true effect')
      throw Error('focus protocol mismatch');
    if(!Number.isSafeInteger(p.seedStart)||!Number.isSafeInteger(p.seedEnd)||
      p.seedStart<10001||p.seedEnd>20000||p.seedStart>p.seedEnd||
      artifact.rows.length!==p.seedEnd-p.seedStart+1)
      throw Error('missing or invalid shard seed');
    const fd=fs.openSync(privateFile(checkpointFiles[i]),'r');
    let offset=0;
    try{
      for(let j=0;j<artifact.rows.length;j++){
        const row=artifact.rows[j];
        if(row.seed!==p.seedStart+j||seen.has(row.seed)) throw Error('duplicate or misordered seed');
        seen.add(row.seed);
        const baseline=input.raw.rows[row.seed-10001];
        if(!Array.isArray(row.focusEvents)||row.focusEvents.length!==baseline.awakenings.length)
          throw Error('focus cohort differs from ordinary arm');
        for(let k=0;k<row.focusEvents.length;k++){
          const event=row.focusEvents[k],selected=baseline.awakenings[k],check=event.checkpoint;
          if(event.pid!==selected.pid||event.chainId!==selected.chainId||
            event.round!==selected.round||!CHAIN_IDS.includes(event.chainId)||
            check.seed!==row.seed||check.pid!==event.pid||
            check.chainId!==event.chainId||check.round!==event.round||
            check.offset!==offset||!Number.isSafeInteger(check.bytes)||check.bytes<5)
            throw Error('checkpoint selection or archive offset mismatch');
          if(event.ordinary.winnerId!==baseline.winnerId||
            event.ordinary.focusWon!==(baseline.winnerId===event.pid)||
            event.ordinary.finalLife!==baseline.finalLife[event.pid]||
            event.ordinary.gameLength!==baseline.gameLength)
            throw Error('ordinary focus endpoint mismatch');
          for(const mode of ['original','candidate']){
            const e=event.effects?.[mode];
            if(!e||e.checkpointSha256!==check.sha256||
              e.focusWon!==(e.winnerId===event.pid)||
              !Number.isSafeInteger(e.trueEvents)||e.trueEvents<0||
              !Number.isSafeInteger(e.activations)||e.activations<0)
              throw Error('treatment focus endpoint mismatch');
          }
          const size=Buffer.alloc(4);
          if(fs.readSync(fd,size,0,4,offset)!==4) throw Error('truncated checkpoint length');
          const n=size.readUInt32LE();
          if(n+4!==check.bytes) throw Error('checkpoint record length mismatch');
          const compressed=Buffer.alloc(n);
          if(fs.readSync(fd,compressed,0,n,offset+4)!==n) throw Error('truncated checkpoint record');
          const payload=zlib.gunzipSync(compressed);
          if(sha(payload)!==check.sha256) throw Error('checkpoint content hash mismatch');
          offset+=check.bytes;
          allRows.push({...event,seed:row.seed});
        }
      }
      if(offset!==fs.fstatSync(fd).size) throw Error('extra checkpoint archive bytes');
    }finally{fs.closeSync(fd);}
  }
  if(seen.size!==10000||[...seen].some(seed=>seed<10001||seed>20000))
    throw Error('incomplete fixed checkpoint seed block');
  const phaseOf=round=>round<=4?'early':round<=8?'middle':'late';
  const byChain={};
  for(const chainId of CHAIN_IDS){
    const events=allRows.filter(x=>x.chainId===chainId);
    const segments=Object.fromEntries(['early','middle','late'].map(name=>{
      const group=events.filter(e=>phaseOf(e.round)===name);
      return [name,{checkpoints:group.length,estimable:group.length>=80}];
    }));
    byChain[chainId]={checkpoints:events.length,segments,modes:{}};
    for(const mode of ['original','candidate']){
      const ci=clusterInterval(events,mode,protocol.bootstrap);
      const trueEvents=events.reduce((n,e)=>n+e.effects[mode].trueEvents,0);
      const activations=events.reduce((n,e)=>n+e.effects[mode].activations,0);
      const meanLifeDifference=events.length
        ?events.reduce((n,e)=>n+e.effects[mode].finalLife-e.ordinary.finalLife,0)/events.length:null;
      const phases=Object.fromEntries(['early','middle','late'].map(name=>{
        const group=events.filter(e=>phaseOf(e.round)===name);
        return [name,{checkpoints:group.length,
          paired:group.length>=80?clusterInterval(group,mode,protocol.bootstrap):null,
          status:group.length>=80?'descriptive':'incomplete'}];
      }));
      byChain[chainId].modes[mode]={
        differencePp:ci?.differencePp??null,ci95Pp:ci?.ci95Pp??null,
        meanFinalLifeDifference:meanLifeDifference,trueEvents,activations,phases,
        status:focusGateStatus(ci?.ci95Pp,events.length,trueEvents,
          protocol.checkpointCohort.minimumPerChain),
        minimum:protocol.checkpointCohort.minimumPerChain
      };
    }
  }
  return {schema:'yaoshi.destiny.focus-summary.v1',variant,sampleSeeds:seen.size,
    checkpointEvents:allRows.length,byChain,releaseEligible:false,provenance:sharedProvenance};
}

if(process.argv[1]&&path.resolve(process.argv[1])===OWN){
  const argv=process.argv.slice(2),args={};
  if(argv.length%2) throw Error('expected key-value CLI arguments');
  for(let i=0;i<argv.length;i+=2){
    if(!['--variant','--baseline','--draws','--start','--end','--out','--checkpoints','--shards','--checkpoint-files'].includes(argv[i])||
      Object.hasOwn(args,argv[i])) throw Error('invalid CLI argument '+argv[i]);
    args[argv[i]]=argv[i+1];
  }
  const t0=Date.now();
  if(args['--shards']){
    const result=analyzeCandidateShards(args['--variant'],args['--shards'].split(','),{
      checkpointFiles:args['--checkpoint-files']?.split(','),
      privateDrawTable:args['--draws'],baselineRaw:args['--baseline']});
    const out=privateFile(args['--out'],{exists:false});
    const fd=fs.openSync(out,'wx');
    try{fs.writeFileSync(fd,JSON.stringify(result,null,2));}finally{fs.closeSync(fd);}
    process.stdout.write(out+'\n');
  }else{
    const result=runCandidateShard({variant:args['--variant'],baselineRaw:args['--baseline'],
      privateDrawTable:args['--draws'],startSeed:Number(args['--start']),endSeed:Number(args['--end']),
      outFile:args['--out'],checkpointFile:args['--checkpoints'],
      onProgress:x=>process.stderr.write(x.seed+' '+x.completed+'/'+x.total+'\n')});
    process.stdout.write(JSON.stringify({...result,ms:Date.now()-t0})+'\n');
  }
}

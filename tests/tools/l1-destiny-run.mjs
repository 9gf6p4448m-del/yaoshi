import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadGame} from './load.mjs';
import {createChaser,disableChainEffects,validateSeeds} from './l1-balance.mjs';
import {createEyesPolicy} from './l1-information.mjs';
import {armIds,captureProvenance,loadDestinyProtocol} from './l1-destiny-formal.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../..');
const SCRATCH=path.join(ROOT,'scratchpad');
const CHAIN_IDS=['water','eyes','twinTiger','bloodOath','godKing','eternalFlame'];
const ownFile=fileURLToPath(import.meta.url);
const inScratch=file=>{
  if(typeof file!=='string'||!file) throw Error('private path required');
  const absolute=path.resolve(file);
  if(!absolute.startsWith(SCRATCH+path.sep)) throw Error('private raw must stay in ignored scratchpad/');
  return absolute;
};
const checkRealParent=file=>{
  const absolute=inScratch(file);
  fs.mkdirSync(path.dirname(absolute),{recursive:true});
  if(fs.lstatSync(SCRATCH).isSymbolicLink()) throw Error('scratchpad may not be a symlink');
  const root=fs.realpathSync(SCRATCH),parent=fs.realpathSync(path.dirname(absolute));
  if(parent!==root&&!parent.startsWith(root+path.sep))
    throw Error('private path escapes scratchpad through a link');
  return absolute;
};
const writePrivate=(file,value)=>{
  file=checkRealParent(file);
  const fd=fs.openSync(file,'wx');
  try{fs.writeFileSync(fd,value);}finally{fs.closeSync(fd);}
  return file;
};

export function generatePrivateDrawTable(seeds,file){
  seeds=validateSeeds(seeds);
  file=checkRealParent(file);
  const rows=seeds.map(seed=>({seed,draws:Array.from({length:4},()=>
    CHAIN_IDS[crypto.randomInt(CHAIN_IDS.length)])}));
  return writePrivate(file,JSON.stringify({schema:'yaoshi.destiny.private-draws.v1',rows}));
}

function readDraws(file,seeds){
  file=checkRealParent(file);
  if(fs.lstatSync(file).isSymbolicLink()) throw Error('private draw table may not be a symlink');
  const table=JSON.parse(fs.readFileSync(file,'utf8'));
  if(table?.schema!=='yaoshi.destiny.private-draws.v1'||
    !Array.isArray(table.rows)||table.rows.length!==seeds.length)
    throw Error('invalid private draw table');
  const map=new Map();
  table.rows.forEach((row,i)=>{
    if(row.seed!==seeds[i]||!Array.isArray(row.draws)||row.draws.length!==4||
      !row.draws.every(id=>CHAIN_IDS.includes(id))) throw Error(`invalid private draws for row ${i}`);
    map.set(row.seed,[...row.draws]);
  });
  return map;
}

function trialPaths(privateDrawTable){
  return {product:path.join(ROOT,'index.html'),runner:ownFile,
    acceptance:path.join(ROOT,'docs/experiments/2026-09-23-destiny/acceptance.md'),
    config:path.join(ROOT,'docs/experiments/2026-09-23-destiny/arms.json'),
    ...(privateDrawTable?{privateDrawTable:inScratch(privateDrawTable)}:{})};
}

export function runArm(arm,{group='destiny',seeds=[10001,10002],privateDrawTable,
  onProgress}={}){
  const protocol=loadDestinyProtocol();
  if(!armIds(protocol,group).includes(arm)) throw Error(`unknown ${group} arm ${arm}`);
  seeds=validateSeeds(seeds);
  const drawings=group==='destiny'?readDraws(privateDrawTable,seeds):null;
  const productFile=path.join(ROOT,'index.html');
  const productText=fs.readFileSync(productFile,'utf8');
  const loadedProductSha256=crypto.createHash('sha256').update(productText).digest('hex');
  const G=loadGame(productFile,{sourceText:productText});
  const spec=group==='destiny'?{
    effect:arm.split('-')[0],ai:arm.endsWith('-on'),target:null}:
    group==='ordinaryH1'?{effect:'off',ai:false,target:arm.slice(3)}:
      {effect:'off',ai:false,target:arm.slice('h9-zero-'.length)};
  if(group==='ordinaryH9'&&arm.startsWith('h9-zero-')) disableChainEffects(G,spec.target);
  const eyesDecisions={calls:0,extraPreviewAvailable:0,revealAvailable:0,informedVsBlindDiff:0};
  const eyesPolicy=createEyesPolicy(G,'informed',eyesDecisions);
  const chasers=Object.fromEntries(CHAIN_IDS.map(id=>[id,createChaser(G,id)]));
  const destinyPolicy=(p,ctx)=>p.destiny==='eyes'?eyesPolicy(p,ctx):chasers[p.destiny](p,ctx);
  const policies=group==='destiny'?{0:destinyPolicy}:
    group==='ordinaryH1'?{0:arm==='h1-splitter'?G.POLICIES.splitter:
      spec.target==='eyes'?eyesPolicy:chasers[spec.target]}:{};
  const picks=group==='ordinaryH9'?undefined:['qingmian'];
  const mode=spec.effect==='ordinary'||spec.effect==='off'?'off':spec.effect;
  const cfg=structuredClone(G.CFG);
  const paths=trialPaths(privateDrawTable);
  const provenance=captureProvenance(paths,{cfg,
    policyVersions:{seat0:group==='destiny'?'destiny-chaser-v1':
      group==='ordinaryH1'?(arm==='h1-splitter'?'POLICIES.splitter':
        spec.target==='eyes'?'eyes-informed-v1':'target-chaser-v1'):
        'original-scriptedBids',opponents:'original-ai',eyes:'eyes-informed-v1'},seeds});
  if(provenance.productSha256!==loadedProductSha256)
    throw Error('product changed between engine snapshot and provenance capture');
  const rows=[];
  for(const seed of seeds){
    const before={...eyesDecisions};
    try{
      const result=G.playPolicyGame(seed,policies,picks,{
        trueEffects:mode,destinyAiChase:spec.ai,
        ...(drawings?{privateDestinyDraws:drawings.get(seed)}:{}),
        recordChainHoldings:true,recordDestinyEvidence:group==='destiny',
        policyInformation:group!=='ordinaryH9'&&
          (group==='destiny'||spec.target==='eyes')});
      const history=G.S.history?.nights||[];
      const awakenings=history.flatMap(n=>n.auction.flatMap(a=>(a.destinyAwakenings||[])
        .map(e=>({...e,round:n.round}))));
      const costs=Array.from({length:4},(_,pid)=>history.reduce((sum,n)=>sum+n.auction.reduce((total,a)=>
        total+a.bids.filter(b=>b.pid===pid).reduce((v,b)=>v+(b.cost||0),0),0),0));
      rows.push({arm,seed,status:'complete',winnerId:result.winnerId,
        roles:G.S.players.map(p=>p.roleId),
        ...(drawings?{destinyDraws:[...drawings.get(seed)]}:{}),
        gameLength:result.gameLength,finalLife:result.finalLife,survival:result.survival,
        costs,awakenings,chainHoldings:result.chainHoldings,
        ...(result.destinyNights?{destinyNights:result.destinyNights}:{}),
        policyDecisions:Object.fromEntries(Object.keys(before).map(key=>[key,eyesDecisions[key]-before[key]]))});
    }catch(error){
      throw Error(`arm ${arm} seed ${seed}: ${error}`,{cause:error});
    }
    if(onProgress&&rows.length%1000===0) onProgress({arm,done:rows.length,total:seeds.length});
  }
  const after=captureProvenance(paths,{cfg,policyVersions:provenance.policyVersions,seeds});
  if(JSON.stringify(after)!==JSON.stringify(provenance))
    throw Error('code, protocol or private draws changed during arm run');
  return {schema:'yaoshi.destiny.raw.arm.v1',arm,provenance,seeds,rows};
}

function parseArgs(argv){
  const args={};
  for(let i=0;i<argv.length;i+=2){
    const key=argv[i],value=argv[i+1];
    if(!['--group','--arm','--n','--private-draw-table','--out','--generate-draw-table'].includes(key)||
      value===undefined||value.startsWith('--')||Object.hasOwn(args,key)) throw Error(`invalid argument ${key}`);
    args[key]=value;
  }
  return args;
}

if(process.argv[1]&&path.resolve(process.argv[1])===ownFile){
  const args=parseArgs(process.argv.slice(2));
  const n=args['--n']===undefined?10000:Number(args['--n']);
  if(!Number.isSafeInteger(n)||n<1||n>100000) throw Error('invalid sample size');
  const seeds=Array.from({length:n},(_,i)=>10001+i);
  if(args['--generate-draw-table']){
    process.stdout.write(`${generatePrivateDrawTable(seeds,args['--generate-draw-table'])}\n`);
  }else{
    const out=checkRealParent(args['--out']);
    const artifact=runArm(args['--arm'],{group:args['--group']||'destiny',seeds,
      privateDrawTable:args['--private-draw-table'],onProgress:p=>
        process.stderr.write(`${p.arm} ${p.done}/${p.total}\n`)});
    writePrivate(out,JSON.stringify(artifact));
    process.stdout.write(`${out}\n`);
  }
}

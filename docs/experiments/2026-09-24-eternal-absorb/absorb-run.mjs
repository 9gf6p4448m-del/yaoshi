// 真長明實際吸收量量測（記憶體內插樁，不改磁碟上 index.html）。
// 用法：node absorb-run.mjs --arm original-ai-off --start 10001 --end 10200 --out <file> [--mutate 1]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../../tests/tools/load.mjs';
import {createChaser} from '../../tests/tools/l1-balance.mjs';
import {createEyesPolicy} from '../../tests/tools/l1-information.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const PRODUCT=path.join(ROOT,'index.html');
const DRAWS=path.join(ROOT,'scratchpad/destiny-formal-v1/private-draws.json');
const CHAIN_IDS=['water','eyes','twinTiger','bloodOath','godKing','eternalFlame'];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');

const args={};
for(let i=2;i<process.argv.length;i+=2) args[process.argv[i]]=process.argv[i+1];
const arm=args['--arm'],start=Number(args['--start']),end=Number(args['--end']),mutate=args['--mutate']==='1';
const out=path.resolve(args['--out']);
if(!/^(original|candidate|ordinary)-ai-(on|off)$/.test(arm)) throw Error('bad arm');
if(!(start>=10001&&end<=20000&&start<=end)) throw Error('bad seed range');
if(fs.existsSync(out)) throw Error('output exists');

const anchors=[];
function instrument(text){
  let s=text;
  const replace=(name,before,after)=>{
    const found=s.split(before).length-1;
    anchors.push({name,found});
    if(found!==1) throw Error(`anchor ${name} matched ${found}, expected 1`);
    s=s.replace(before,()=>after);
  };
  // 1) 吸收點：真長明個人額度實際擋下的傷害 k
  replace('absorb',
    'const k=Math.min(tgt.destinyShield,amt); tgt.destinyShield-=k; amt-=k;',
    (mutate?'const k=0;':'const k=Math.min(tgt.destinyShield,amt);')+
    ' tgt.destinyShield-=k; amt-=k; if(env&&env.auditActual) storage.__absorb?.({kind:"absorb",pid:foe.p.id,round:S.round,beat:env.beat,k,pre:k+amt});');
  // 2) 發盾點：記實際增加的額度（候選有上限 2）
  replace('grant-pre',
    'u.destinyShield=(u.destinyShield||0)+2;',
    'const __abB=u.destinyShield||0; u.destinyShield=(u.destinyShield||0)+2;');
  replace('grant-post',
    'pwFire(env,{id:"trueEternalShield",name:"長明渡幽"},',
    'if(env.auditActual) storage.__absorb?.({kind:"grant",pid:sd.p.id,round:S.round,beat:env.beat,add:u.destinyShield-__abB}); pwFire(env,{id:"trueEternalShield",name:"長明渡幽"},');
  // 3) 候選到期：記作廢額度
  replace('expire',
    'if(u.destinyShieldExpiry===beat){ u.destinyShield=0; u.destinyShieldExpiry=0; }',
    'if(u.destinyShieldExpiry===beat){ if(env.auditActual&&u.destinyShield>0) storage.__absorb?.({kind:"expire",pid:sd.p.id,round:S.round,beat,lost:u.destinyShield}); u.destinyShield=0; u.destinyShieldExpiry=0; }');
  // 4) 真實對決旗標（同 l1-destiny-h9-activity.mjs）
  replace('env-real',
    'const env={rng,log:[],beats:[],seen:{},beat:0,',
    'const env={rng,log:[],beats:[],seen:{},beat:0,auditActual:!!ctx.real,');
  return s;
}

const productText=fs.readFileSync(PRODUCT,'utf8'),productSha256=sha(productText);
const source=instrument(productText);
let events=[];
const storage={getItem(){return null;},setItem(){},__absorb:e=>events.push(e)};
const G=loadGame(PRODUCT,{sourceText:source,storage});

const table=JSON.parse(fs.readFileSync(DRAWS,'utf8'));
if(table.schema!=='yaoshi.destiny.private-draws.v1'||table.rows.length!==10000) throw Error('bad draw table');
const draws=new Map(table.rows.map(r=>[r.seed,r.draws]));

const effect=arm.split('-')[0],ai=arm.endsWith('-on');
const mode=effect==='ordinary'?'off':effect;
const eyesPolicy=createEyesPolicy(G,'informed',{calls:0,extraPreviewAvailable:0,revealAvailable:0,informedVsBlindDiff:0});
const chasers=Object.fromEntries(CHAIN_IDS.map(id=>[id,createChaser(G,id)]));
const policies={0:(p,ctx)=>p.destiny==='eyes'?eyesPolicy(p,ctx):chasers[p.destiny](p,ctx)};

const rows=[];
for(let seed=start;seed<=end;seed++){
  events=[];
  const result=G.playPolicyGame(seed,policies,['qingmian'],{
    trueEffects:mode,destinyAiChase:ai,privateDestinyDraws:[...draws.get(seed)],
    recordChainHoldings:true,recordDestinyEvidence:true,policyInformation:true});
  const nights=result.destinyNights||[];
  const efAwake=[...new Set(nights.flatMap(n=>n.awakenings).filter(a=>a.chainId==='eternalFlame').map(a=>a.pid))];
  const shieldEvents=nights.flatMap(n=>n.fights.flatMap(f=>f.trueEvents.filter(e=>e.id==='trueEternalShield')));
  const grants=events.filter(e=>e.kind==='grant'),abs=events.filter(e=>e.kind==='absorb'),exp=events.filter(e=>e.kind==='expire');
  rows.push({seed,winnerId:result.winnerId,gameLength:result.gameLength,efAwake,
    shieldEvents:shieldEvents.length,shieldByBeat:[1,2,3].map(b=>shieldEvents.filter(e=>e.beat===b).length),
    grants:grants.length,granted:grants.reduce((a,e)=>a+e.add,0),
    absorbHits:abs.length,absorbed:abs.reduce((a,e)=>a+e.k,0),
    absorbedByBeat:[1,2,3].map(b=>abs.filter(e=>e.beat===b).reduce((a,e)=>a+e.k,0)),
    absorbedSeat0:abs.filter(e=>e.pid===0).reduce((a,e)=>a+e.k,0),
    expired:exp.reduce((a,e)=>a+e.lost,0)});
  if((seed-start+1)%1000===0) process.stderr.write(`${arm} ${seed-start+1}/${end-start+1}\n`);
}
if(sha(fs.readFileSync(PRODUCT,'utf8'))!==productSha256) throw Error('product changed during run');

const sum=k=>rows.reduce((a,r)=>a+r[k],0);
const awakeGames=rows.filter(r=>r.efAwake.length>0),trigGames=rows.filter(r=>r.grants>0);
const agg={games:rows.length,gamesWithEFAwake:awakeGames.length,
  triggerGames:trigGames.length,shieldEvents_destinyNights:sum('shieldEvents'),
  shieldEventsByBeat:[0,1,2].map(i=>rows.reduce((a,r)=>a+r.shieldByBeat[i],0)),
  grants:sum('grants'),grantedAmount:sum('granted'),
  absorbHits:sum('absorbHits'),totalAbsorbed:sum('absorbed'),
  absorbedByBeat:[0,1,2].map(i=>rows.reduce((a,r)=>a+r.absorbedByBeat[i],0)),
  absorbedSeat0:sum('absorbedSeat0'),expiredAmount:sum('expired'),
  gamesWithAbsorb:rows.filter(r=>r.absorbed>0).length};
agg.absorbPerGrant=agg.grants?agg.totalAbsorbed/agg.grants:null;
agg.absorbPerAwakeGame=agg.gamesWithEFAwake?agg.totalAbsorbed/agg.gamesWithEFAwake:null;
agg.absorbPerTriggerGame=agg.triggerGames?agg.totalAbsorbed/agg.triggerGames:null;
agg.utilization=agg.grantedAmount?agg.totalAbsorbed/agg.grantedAmount:null;
agg.shieldsPerAwakeGame=agg.gamesWithEFAwake?agg.grants/agg.gamesWithEFAwake:null;

const artifact={schema:'yaoshi.eternal-absorb.v1',arm,mutate,sample:{start,end},
  provenance:{productSha256,instrumentedSha256:sha(source),runnerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),
    drawTableSha256:sha(fs.readFileSync(DRAWS))},anchors,aggregate:agg,rows};
fs.writeFileSync(out,JSON.stringify(artifact),{flag:'wx'});
console.log(JSON.stringify({arm,mutate,anchors,aggregate:agg}));

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadGame} from './load.mjs';
import {disableChainEffects} from './l1-balance.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const SCRATCH=path.join(ROOT,'scratchpad');
const PRODUCT=path.join(ROOT,'index.html');
const OWN=fileURLToPath(import.meta.url);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const readPrivate=file=>{
  const absolute=path.resolve(file);
  if(!absolute.startsWith(SCRATCH+path.sep)) throw Error('private inputs must stay in scratchpad');
  if(!fs.existsSync(absolute)||fs.lstatSync(absolute).isSymbolicLink()) throw Error('invalid private input');
  return JSON.parse(fs.readFileSync(absolute,'utf8'));
};
const writePrivate=(file,value)=>{
  const absolute=path.resolve(file);
  if(!absolute.startsWith(SCRATCH+path.sep)) throw Error('private output must stay in scratchpad');
  fs.mkdirSync(path.dirname(absolute),{recursive:true});
  if(fs.existsSync(absolute)||fs.lstatSync(SCRATCH).isSymbolicLink()) throw Error('private output exists or scratchpad is a symlink');
  const root=fs.realpathSync(SCRATCH),parent=fs.realpathSync(path.dirname(absolute));
  if(parent!==root&&!parent.startsWith(root+path.sep)) throw Error('private output escapes scratchpad');
  const fd=fs.openSync(absolute,'wx');
  try{fs.writeFileSync(fd,JSON.stringify(value));}finally{fs.closeSync(fd);}
  return absolute;
};
function instrument(text){
  let source=text;
  const replace=(before,after,count=1)=>{
    const found=source.split(before).length-1;
    if(found!==count) throw Error('activity instrumentation anchor mismatch: '+found+' expected '+count);
    source=source.replaceAll(before,after);
  };
  replace('const fee=feeForBid(e.p,i);\r\n      let baseCost=',
    'const fee=feeForBid(e.p,i);\r\n      const tigerOwners=S.marks?S.players.filter(op=>op.alive&&op.id!==e.p.id&&S.marks[op.id]===i&&hasFlag(op,"markTax")).map(op=>op.id):[];\r\n      if(tigerOwners.length) storage.__chainAudit?.({chain:"twinTiger",kind:hasFlag(e.p,"freeBidFee")?"markedFreeBid":"markedFeeCharged",pid:e.p.id,owners:tigerOwners});\r\n      let baseCost=');
  replace('effs=entries.map(e=>{\r\n        const c={p:e.p,bid:e,item:it,eff:e.amt};\r\n        applyHooks("onBidEff",c,e.p);\r\n        return c.eff;\r\n      });',
    'effs=entries.map(e=>{\r\n        const c={p:e.p,bid:e,item:it,eff:e.amt};\r\n        applyHooks("onBidEff",c,e.p);\r\n        if(e.type==="yaming"&&hasFlag(e.p,"yamingEffBonus")&&c.eff>e.amt) storage.__chainAudit?.({chain:"bloodOath",kind:"yamingEffBonus",pid:e.p.id,bid:e.amt,eff:c.eff});\r\n        return c.eff;\r\n      });');
  replace('if(t.tr.selfCut&&hasFlag(sd.p,"bloodSacrifice")){\r\n      const foeFront=foe.units.find(u=>u.alive&&pwFront(u));',
    'if(t.tr.selfCut&&hasFlag(sd.p,"bloodSacrifice")){\r\n      const foeFront=foe.units.find(u=>u.alive&&pwFront(u));');
  replace('const n=trueBlood?2:1;\r\n        if(trueBlood) sd.trueBloodUsed=true;',
    'const n=trueBlood?2:1;\r\n        if(!trueBlood&&env.auditActual) storage.__chainAudit?.({chain:"bloodOath",kind:"selfCutRetaliation",pid:sd.p.id,round:S.round,beat:env.beat,amount:n});\r\n        if(trueBlood) sd.trueBloodUsed=true;');
  replace('if(hasFlag(sd.p,"bloodSacrifice")&&sd.p.life<=15) a+=1;',
    'if(hasFlag(sd.p,"bloodSacrifice")&&sd.p.life<=15){ if(env.auditActual) storage.__chainAudit?.({chain:"bloodOath",kind:"lowLifeAttackBonus",pid:sd.p.id,round:S.round,beat,life:sd.p.life}); a+=1; }');
  replace('const hasCleavePierce = !!(t.tr&&(t.tr.armorPierce||(t.tr.cleaveFull&&hasFlag(sd.p,"godKingSniper"))));',
    'const hasCleavePierce = !!(t.tr&&(t.tr.armorPierce||(t.tr.cleaveFull&&hasFlag(sd.p,"godKingSniper"))));\r\n      if(env.auditActual&&t.tr?.id==="twinTigerSweep") storage.__chainAudit?.({chain:"twinTiger",kind:"sweepAttack",pid:sd.p.id,round:S.round,beat});');
  replace('const full=!!(t.tr&&t.tr.cleaveFull);\r\n        if(full&&t.tr)',
    'const full=!!(t.tr&&t.tr.cleaveFull);\r\n        if(env.auditActual&&t.tr?.id==="twinTigerSweep"&&full) storage.__chainAudit?.({chain:"twinTiger",kind:"fullSplash",pid:sd.p.id,round:S.round,beat});\r\n        if(full&&t.tr)');
  replace('const env={rng,log:[],beats:[],seen:{},beat:0,',
    'const env={rng,log:[],beats:[],seen:{},beat:0,auditActual:!!ctx.real,');
  return source;
}
function createEngine(source,zeroChain=null){
  let events=[];
  const storage={getItem(){return null;},setItem(){},__chainAudit:e=>events.push(e)};
  const G=loadGame(PRODUCT,{sourceText:source,storage});
  if(zeroChain) disableChainEffects(G,zeroChain);
  return {G,setEvents:next=>{events=next;}};
}
function costs(G){
  const history=G.S.history?.nights||[];
  return Array.from({length:4},(_,pid)=>history.reduce((sum,n)=>sum+n.auction.reduce((total,a)=>
    total+a.bids.filter(b=>b.pid===pid).reduce((v,b)=>v+(b.cost||0),0),0),0));
}
function equivalent(G,row){
  const actual={winnerId:G.S.history?.winnerId,roles:G.S.players.map(p=>p.roleId)};
  const history=G.S.history?.nights||[];
  const result=G.__lastResult;
  actual.winnerId=result.winnerId;
  actual.roles=G.S.players.map(p=>p.roleId);
  actual.gameLength=result.gameLength;
  actual.finalLife=result.finalLife;
  actual.survival=result.survival;
  actual.costs=costs(G);
  actual.chainHoldings=result.chainHoldings;
  for(const k of ['winnerId','roles','gameLength','finalLife','survival','costs','chainHoldings']){
    if(JSON.stringify(actual[k])!==JSON.stringify(row[k]))
      throw Error('ordinary H9 replay mismatch '+k+' seed '+row.seed+' arm '+row.arm);
  }
  return {events:history.length};
}
function runDiagnostic({start,end,baselineFile,zeroTigerFile,zeroBloodFile,onProgress}){
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<10001||end>20000||start>end)
    throw Error('invalid fixed diagnostic seed range');
  const baseline=readPrivate(baselineFile),tigerRaw=readPrivate(zeroTigerFile),bloodRaw=readPrivate(zeroBloodFile);
  const raws=[baseline,tigerRaw,bloodRaw];
  const expected=['h9-normal','h9-zero-twinTiger','h9-zero-bloodOath'];
  for(let i=0;i<raws.length;i++){
    if(raws[i].schema!=='yaoshi.destiny.raw.arm.v1'||raws[i].arm!==expected[i]||raws[i].rows.length!==10000)
      throw Error('wrong or incomplete H9 raw arm '+i);
  }
  const rowsByArm=raws.map(raw=>new Map(raw.rows.map(row=>[row.seed,row])));
  const productText=fs.readFileSync(PRODUCT,'utf8'),productSha256=sha(productText),source=instrument(productText);
  for(const raw of raws) if(raw.provenance?.productSha256!==productSha256) throw Error('H9 raw product provenance mismatch');
  const engines=[createEngine(source),createEngine(source,'twinTiger'),createEngine(source,'bloodOath')];
  const armNames=['h9-normal','h9-zero-twinTiger','h9-zero-bloodOath'];
  const resultRows=[];
  for(let seed=start;seed<=end;seed++){
    for(let i=0;i<engines.length;i++){
      const engine=engines[i],audit=[];
      engine.setEvents(audit);
      const result=engine.G.playPolicyGame(seed,{},undefined,{
        trueEffects:'off',destinyAiChase:false,recordChainHoldings:true
      });
      engine.G.__lastResult=result;
      const expectedRow=rowsByArm[i].get(seed);
      if(!expectedRow||expectedRow.status!=='complete') throw Error('missing baseline seed '+seed);
      equivalent(engine.G,expectedRow);
      const counts={};
      for(const event of audit){
        const key=event.chain+':'+event.kind;
        const row=counts[key]||{events:0,games:1,seats:[0,0,0,0],detail:{}};
        row.events++;
        if(Number.isInteger(event.pid)&&event.pid>=0&&event.pid<4) row.seats[event.pid]++;
        if(event.kind==='markedFeeCharged') row.detail.markedOwnerRefs=(row.detail.markedOwnerRefs||0)+event.owners.length;
        row.detail.byRound=row.detail.byRound||{};
        if(event.round) row.detail.byRound[event.round]=(row.detail.byRound[event.round]||0)+1;
        counts[key]=row;
      }
      for(const row of Object.values(counts)) row.games=1;
      resultRows.push({seed,arm:armNames[i],winnerId:result.winnerId,
        gameLength:result.gameLength,events:counts});
    }
    if(onProgress&&(seed-start+1)%100===0) onProgress({seed,done:seed-start+1,total:end-start+1});
  }
  if(sha(fs.readFileSync(PRODUCT))!==productSha256) throw Error('product changed during diagnostic');
  const aggregate={};
  for(const arm of armNames){
    const armRows=resultRows.filter(r=>r.arm===arm),out={games:armRows.length,eventTypes:{}};
    for(const row of armRows) for(const [key,value] of Object.entries(row.events)){
      const acc=out.eventTypes[key]||{events:0,gamesWithEvent:0,seats:[0,0,0,0],detail:{markedOwnerRefs:0,byRound:{}}};
      acc.events+=value.events;acc.gamesWithEvent++;
      value.seats.forEach((n,i)=>acc.seats[i]+=n);
      acc.detail.markedOwnerRefs+=value.detail.markedOwnerRefs||0;
      for(const [round,n] of Object.entries(value.detail.byRound||{}))
        acc.detail.byRound[round]=(acc.detail.byRound[round]||0)+n;
      out.eventTypes[key]=acc;
    }
    aggregate[arm]=out;
  }
  return {schema:'yaoshi.destiny.h9-activity.v1',sample:{start,end,games:end-start+1},
    provenance:{productSha256,activitySourceSha256:sha(source),activityRunnerSha256:sha(fs.readFileSync(OWN)),
      normalRawSha256:sha(fs.readFileSync(baselineFile)),zeroTigerRawSha256:sha(fs.readFileSync(zeroTigerFile)),
      zeroBloodRawSha256:sha(fs.readFileSync(zeroBloodFile))},
    aggregate,rows:resultRows,
    limitations:['Deterministic replay matching excludes the unrevealed destiny assignment and awakening history because original H9 raw did not preserve private draws; true effects and AI chasing are off, and all gameplay endpoints must still match.',
      'This activity sample is diagnostic, not a changed H9 gate and not a causal player-experience estimate.']};
}
function args(argv){
  const out={};
  for(let i=0;i<argv.length;i+=2){
    const key=argv[i],value=argv[i+1];
    if(!['--start','--end','--baseline','--zero-tiger','--zero-blood','--out'].includes(key)||
      value===undefined||Object.hasOwn(out,key)) throw Error('invalid argument '+key);
    out[key]=value;
  }
  return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===OWN){
  const a=args(process.argv.slice(2));
  const result=runDiagnostic({start:Number(a['--start']),end:Number(a['--end']),
    baselineFile:a['--baseline'],zeroTigerFile:a['--zero-tiger'],zeroBloodFile:a['--zero-blood'],
    onProgress:p=>process.stderr.write(p.seed+' '+p.done+'/'+p.total+'\n')});
  const out=writePrivate(a['--out'],result);
  process.stdout.write(out+'\n');
}

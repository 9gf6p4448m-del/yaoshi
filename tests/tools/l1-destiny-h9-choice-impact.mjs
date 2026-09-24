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
const CHAINS=['twinTiger','bloodOath'];
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const round=value=>Math.round(value*1e6)/1e6;

function privatePath(file){
  const absolute=path.resolve(file);
  if(!absolute.startsWith(SCRATCH+path.sep)) throw Error('private files must stay in scratchpad');
  if(!fs.existsSync(absolute)||fs.lstatSync(absolute).isSymbolicLink()) throw Error('invalid private file');
  const root=fs.realpathSync(SCRATCH),real=fs.realpathSync(absolute);
  if(!real.startsWith(root+path.sep)) throw Error('private file escapes scratchpad');
  return absolute;
}
function writePrivate(file,value){
  const absolute=path.resolve(file);
  if(!absolute.startsWith(SCRATCH+path.sep)) throw Error('private output must stay in scratchpad');
  fs.mkdirSync(path.dirname(absolute),{recursive:true});
  const root=fs.realpathSync(SCRATCH),parent=fs.realpathSync(path.dirname(absolute));
  if(parent!==root&&!parent.startsWith(root+path.sep)) throw Error('private output escapes scratchpad');
  if(fs.existsSync(absolute)||fs.lstatSync(SCRATCH).isSymbolicLink()) throw Error('private output exists or scratchpad is a symlink');
  const fd=fs.openSync(absolute,'wx');
  try{fs.writeFileSync(fd,JSON.stringify(value));}finally{fs.closeSync(fd);}
  return absolute;
}
function instrument(text){
  let source=text;
  const replace=(before,after,count=1)=>{
    const found=source.split(before).length-1;
    if(found!==count) throw Error(`choice-impact instrumentation anchor mismatch (${found}/${count})`);
    source=source.replaceAll(before,after);
  };
  replace('const entries=[], withdrawn=[], destinyAwakenings=[];\r\n    S.players.forEach(p=>{const b=all[p.id][i];if(b){',
    'const entries=[], withdrawn=[], destinyAwakenings=[];\r\n    storage.__choiceAudit?.({round:S.round,index:i,item:it.n,fac:it.f,price:it.p,curse:!!it.curse,alive:S.players.map(p=>!!p.alive),owners:S.players.map(p=>activeChains(p).map(c=>c.id)),marks:S.players.map(p=>S.marks&&S.marks[p.id]===i),decisions:all.map(row=>{const b=row[i];return b&&b.amt>0?{amt:b.amt,type:b.type,intent:b.intent}:null;})});\r\n    S.players.forEach(p=>{const b=all[p.id][i];if(b){');
  replace('const fee=feeForBid(e.p,i);\r\n      let baseCost=',
    'const __impactMarks=CFG.MARK_ON?S.marks:null;\r\n      const __impactTigerOwners=__impactMarks?S.players.filter(op=>op.alive&&op.id!==e.p.id&&__impactMarks[op.id]===i&&hasFlag(op,"markTax")).map(op=>op.id):[];\r\n      const __impactFeeWithoutTiger=bidFee(CFG.BID_FEE,CFG.MARK_REBATE,!!__impactMarks&&__impactMarks[e.p.id]===i,hasFlag(e.p,"freeBidFee"),false);\r\n      const fee=feeForBid(e.p,i);\r\n      let baseCost=');
  replace('e.cost=c.cost; /* 供開標演出顯示實付（simulate 不序列化 entries，不影響 trace） */',
    'e.cost=c.cost; /* 供開標演出顯示實付（simulate 不序列化 entries，不影響 trace） */\r\n      if(__impactTigerOwners.length) storage.__feeAudit?.({round:S.round,index:i,pid:e.p.id,owners:__impactTigerOwners,amount:e.amt,type:e.type,winner:isWinner,fee,cost:e.cost,feeWithoutTiger:__impactFeeWithoutTiger,feeDelta:fee-__impactFeeWithoutTiger});');
  replace('const c={p:e.p,bid:e,item:it,eff:e.amt};\r\n        applyHooks("onBidEff",c,e.p);\r\n        return c.eff;',
    'const c={p:e.p,bid:e,item:it,eff:e.amt};\r\n        applyHooks("onBidEff",c,e.p);\r\n        if(e.type==="yaming"&&hasFlag(e.p,"yamingEffBonus")&&c.eff>e.amt) storage.__bidEffectAudit?.({chain:"bloodOath",kind:"yamingEffBonus",round:S.round,index:i,pid:e.p.id,amount:e.amt,effective:c.eff});\r\n        return c.eff;');
  replace('const env={rng,log:[],beats:[],seen:{},beat:0,',
    'const env={rng,log:[],beats:[],seen:{},beat:0,auditActual:!!ctx.real,');
  replace('const n=trueBlood?2:1;\r\n        if(trueBlood) sd.trueBloodUsed=true;',
    'const n=trueBlood?2:1;\r\n        if(!trueBlood&&env.auditActual) storage.__combatAudit?.({chain:"bloodOath",kind:"selfCutRetaliation",pid:sd.p.id,round:S.round,beat:env.beat,amount:n});\r\n        if(trueBlood) sd.trueBloodUsed=true;');
  replace('if(hasFlag(sd.p,"bloodSacrifice")&&sd.p.life<=15) a+=1;',
    'if(hasFlag(sd.p,"bloodSacrifice")&&sd.p.life<=15){if(env.auditActual) storage.__combatAudit?.({chain:"bloodOath",kind:"lowLifeAttackBonus",pid:sd.p.id,round:S.round,beat,life:sd.p.life});a+=1;}');
  replace('const hasCleavePierce = !!(t.tr&&(t.tr.armorPierce||(t.tr.cleaveFull&&hasFlag(sd.p,"godKingSniper"))));',
    'const hasCleavePierce = !!(t.tr&&(t.tr.armorPierce||(t.tr.cleaveFull&&hasFlag(sd.p,"godKingSniper"))));\r\n      if(env.auditActual&&t.tr?.id==="twinTigerSweep") storage.__combatAudit?.({chain:"twinTiger",kind:"sweepAttack",pid:sd.p.id,round:S.round,beat});');
  replace('const full=!!(t.tr&&t.tr.cleaveFull);\r\n        if(full&&t.tr)',
    'const full=!!(t.tr&&t.tr.cleaveFull);\r\n        if(env.auditActual&&t.tr?.id==="twinTigerSweep"&&full) storage.__combatAudit?.({chain:"twinTiger",kind:"fullSplash",pid:sd.p.id,round:S.round,beat});\r\n        if(full&&t.tr)');
  return source;
}
function createEngine(source,disabledChain=null){
  let audit={auctions:[],fees:[],bidEffects:[],combat:[]};
  const storage={getItem(){return null;},setItem(){},
    __choiceAudit:e=>audit.auctions.push(e),
    __feeAudit:e=>audit.fees.push(e),
    __bidEffectAudit:e=>audit.bidEffects.push(e),
    __combatAudit:e=>audit.combat.push(e)};
  const G=loadGame(PRODUCT,{sourceText:source,storage});
  if(disabledChain) disableChainEffects(G,disabledChain);
  return {G,resetAudit(){audit={auctions:[],fees:[],bidEffects:[],combat:[]};},getAudit(){return audit;}};
}
function readRaw(file,expectedArm){
  const absolute=privatePath(file),raw=JSON.parse(fs.readFileSync(absolute,'utf8'));
  if(raw.schema!=='yaoshi.destiny.raw.arm.v1'||raw.arm!==expectedArm||raw.rows.length!==10000)
    throw Error(`wrong or incomplete source raw: ${expectedArm}`);
  const rows=new Map();
  for(const row of raw.rows){
    if(!Number.isSafeInteger(row.seed)||rows.has(row.seed)||row.status!=='complete')
      throw Error(`invalid source raw row: ${expectedArm}`);
    rows.set(row.seed,row);
  }
  return {raw,rows,file:absolute};
}
function costs(G){
  return Array.from({length:4},(_,pid)=>(G.S.history?.nights||[]).reduce((sum,n)=>sum+n.auction.reduce((total,a)=>
    total+a.bids.filter(b=>b.pid===pid).reduce((v,b)=>v+(b.cost||0),0),0),0));
}
function checkReplay(G,result,row){
  const actual={winnerId:result.winnerId,roles:G.S.players.map(p=>p.roleId),gameLength:result.gameLength,
    finalLife:result.finalLife,survival:result.survival,costs:costs(G),chainHoldings:result.chainHoldings};
  for(const key of Object.keys(actual)) if(JSON.stringify(actual[key])!==JSON.stringify(row[key]))
    throw Error(`choice-impact endpoint mismatch ${key}, seed ${row.seed}, arm ${row.arm}`);
}
function key(roundNo,index){return `${roundNo}:${index}`;}
function slots(audit){return new Map(audit.auctions.map(row=>[key(row.round,row.index),row]));}
function histories(G){return new Map((G.S.history?.nights||[]).map(n=>[n.round,n]));}
function sameItem(a,b){return !!a&&!!b&&a.item===b.item&&a.fac===b.fac&&a.price===b.price&&a.curse===b.curse;}
function bidSignature(b){return b?JSON.stringify([b.amt,b.type,b.intent]):null;}
function resolvedBidSignature(auction){
  return JSON.stringify((auction?.bids||[]).map(b=>[b.pid,b.amt,b.type,b.intent]).sort((a,b)=>a[0]-b[0]));
}
function fightMap(G){
  const map=new Map();
  for(const night of G.S.history?.nights||[]) for(const fight of night.fights||[]){
    const pair=[fight.a,fight.b].sort((a,b)=>a-b).join(':');
    const base=`${night.round}:${pair}`,n=[...map.keys()].filter(k=>k.startsWith(base)).length;
    map.set(`${base}:${n}`,{round:night.round,...fight});
  }
  return map;
}
function createMetrics(chain){
  return {chain,games:0,winnerChanged:0,gameLengthDelta:0,
    seats:Array.from({length:4},()=>({winDelta:0,lifeDelta:0,costDelta:0})),
    auctions:{slotsBoth:0,sameMarketSlots:0,differentMarketSlots:0,onlyOneArmSlots:0,
      perSeat:Array.from({length:4},()=>({decisions:0,changed:0,normalBids:0,zeroBids:0})),
      holderSlots:0,holderOpponentDecisions:0,holderOpponentChanges:0,markedHolderSlots:0,
      markedOpponentDecisions:0,markedOpponentChanges:0,roundsCompared:0,markDecisions:0,markChanges:0,
      resolvedAuctions:0,winnerChanged:0,sameBidVectors:0,sameBidVectorsWinnerChanged:0,
      sameBidVectorsBloodBonusWinnerChanged:0},
    tigerFees:{actualMarkedBids:0,positiveSurchargeBids:0,freeBidBids:0,totalSurcharge:0},
    bloodEffects:{effectiveYamingBids:0,normalWinnerIsBonusBidder:0},
    fights:{matched:0,winnerChanged:0,dmgChanged:0,withChainActivity:0,winnerChangedWithChainActivity:0},
    combatEvents:{}};
}
function countKinds(out,events){
  for(const e of events){const k=`${e.chain}:${e.kind}`;out[k]=(out[k]||0)+1;}
}
function comparePair(metrics,normal,zero,normalRow,zeroRow,normalAudit,zeroAudit,normalG,zeroG){
  metrics.games++;
  metrics.winnerChanged+=Number(normalRow.winnerId!==zeroRow.winnerId);
  metrics.gameLengthDelta+=normalRow.gameLength-zeroRow.gameLength;
  for(let pid=0;pid<4;pid++){
    const seat=metrics.seats[pid];
    seat.winDelta+=Number(normalRow.winnerId===pid)-Number(zeroRow.winnerId===pid);
    seat.lifeDelta+=normalRow.finalLife[pid]-zeroRow.finalLife[pid];
    seat.costDelta+=normalRow.costs[pid]-zeroRow.costs[pid];
  }
  const nSlots=slots(normalAudit),zSlots=slots(zeroAudit),nHistory=histories(normalG),zHistory=histories(zeroG);
  const keys=new Set([...nSlots.keys(),...zSlots.keys()]);
  for(const slotKey of keys){
    const n=nSlots.get(slotKey),z=zSlots.get(slotKey);
    if(!n||!z){metrics.auctions.onlyOneArmSlots++;continue;}
    metrics.auctions.slotsBoth++;
    const nRound=nHistory.get(n.round),zRound=zHistory.get(z.round);
    const na=nRound?.auction?.[n.index],za=zRound?.auction?.[z.index];
    if(!sameItem(n,z)||!na||!za||na.item!==za.item){metrics.auctions.differentMarketSlots++;continue;}
    metrics.auctions.sameMarketSlots++;
    const targetOwners=(n.owners||[]).flatMap((ids,pid)=>ids.includes(metrics.chain)?[pid]:[]);
    const holderPresent=targetOwners.length>0;
    const markedOwnerPresent=targetOwners.some(pid=>n.marks?.[pid]);
    if(holderPresent) metrics.auctions.holderSlots++;
    if(markedOwnerPresent) metrics.auctions.markedHolderSlots++;
    for(let pid=0;pid<4;pid++){
      if(!n.alive[pid]||!z.alive[pid]) continue;
      const nd=n.decisions[pid]||null,zd=z.decisions[pid]||null;
      const changed=bidSignature(nd)!==bidSignature(zd);
      const s=metrics.auctions.perSeat[pid];s.decisions++;s.changed+=Number(changed);
      s.normalBids+=Number(!!nd);s.zeroBids+=Number(!!zd);
      if(holderPresent&&!targetOwners.includes(pid)){
        metrics.auctions.holderOpponentDecisions++;metrics.auctions.holderOpponentChanges+=Number(changed);
      }
      if(markedOwnerPresent&&!targetOwners.includes(pid)){
        metrics.auctions.markedOpponentDecisions++;metrics.auctions.markedOpponentChanges+=Number(changed);
      }
    }
    metrics.auctions.resolvedAuctions++;
    const winnerChanged=na.winnerId!==za.winnerId;
    metrics.auctions.winnerChanged+=Number(winnerChanged);
    const sameBids=resolvedBidSignature(na)===resolvedBidSignature(za);
    if(sameBids){
      metrics.auctions.sameBidVectors++;
      metrics.auctions.sameBidVectorsWinnerChanged+=Number(winnerChanged);
      const bonusPids=new Set(normalAudit.bidEffects.filter(e=>e.round===n.round&&e.index===n.index).map(e=>e.pid));
      if(winnerChanged&&[...bonusPids].some(pid=>na.winnerId===pid||za.winnerId===pid))
        metrics.auctions.sameBidVectorsBloodBonusWinnerChanged++;
    }
  }
  const nRounds=new Map();for(const a of normalAudit.auctions) if(!nRounds.has(a.round)) nRounds.set(a.round,a);
  const zRounds=new Map();for(const a of zeroAudit.auctions) if(!zRounds.has(a.round)) zRounds.set(a.round,a);
  for(const [roundNo,n] of nRounds){
    const z=zRounds.get(roundNo);
    const nAll=normalAudit.auctions.filter(a=>a.round===roundNo).sort((a,b)=>a.index-b.index);
    const zAll=zeroAudit.auctions.filter(a=>a.round===roundNo).sort((a,b)=>a.index-b.index);
    if(!z||nAll.length!==zAll.length||!nAll.every((a,i)=>sameItem(a,zAll[i]))) continue;
    metrics.auctions.roundsCompared++;
    for(let pid=0;pid<4;pid++) if(n.alive[pid]&&z.alive[pid]){
      metrics.auctions.markDecisions++;
      metrics.auctions.markChanges+=Number(n.marks?.[pid]!==z.marks?.[pid]);
    }
  }
  if(metrics.chain==='twinTiger') for(const fee of normalAudit.fees){
    metrics.tigerFees.actualMarkedBids++;
    metrics.tigerFees.positiveSurchargeBids+=Number(fee.feeDelta>0);
    metrics.tigerFees.freeBidBids+=Number(fee.feeDelta===0);
    metrics.tigerFees.totalSurcharge+=fee.feeDelta;
  }
  if(metrics.chain==='bloodOath'){
    metrics.bloodEffects.effectiveYamingBids+=normalAudit.bidEffects.length;
    const bonusSlots=new Map();
    for(const event of normalAudit.bidEffects){const k=key(event.round,event.index);if(!bonusSlots.has(k))bonusSlots.set(k,new Set());bonusSlots.get(k).add(event.pid);}
    for(const [slotKey,pids] of bonusSlots){
      const [roundNo,index]=slotKey.split(':').map(Number),auction=nHistory.get(roundNo)?.auction?.[index];
      if(pids.has(auction?.winnerId)) metrics.bloodEffects.normalWinnerIsBonusBidder++;
    }
  }
  const nFights=fightMap(normalG),zFights=fightMap(zeroG);
  for(const [fightKey,n] of nFights){
    const z=zFights.get(fightKey);if(!z) continue;
    metrics.fights.matched++;
    const winnerChanged=n.w!==z.w;
    metrics.fights.winnerChanged+=Number(winnerChanged);
    metrics.fights.dmgChanged+=Number(n.dmg!==z.dmg);
    const activity=normalAudit.combat.some(e=>e.round===n.round&&(e.pid===n.a||e.pid===n.b));
    metrics.fights.withChainActivity+=Number(activity);
    metrics.fights.winnerChangedWithChainActivity+=Number(activity&&winnerChanged);
  }
  countKinds(metrics.combatEvents,normalAudit.combat);
}
function finishMetrics(m){
  const n=m.games;
  return {...m,meanGameLengthDelta:round(m.gameLengthDelta/n),
    seats:m.seats.map((s,pid)=>({pid,winDeltaPp:round(100*s.winDelta/n),meanFinalLifeDelta:round(s.lifeDelta/n),meanAuctionCostDelta:round(s.costDelta/n)})),
    auctions:{...m.auctions,perSeat:m.auctions.perSeat.map((s,pid)=>({pid,...s,choiceChangeRate:s.decisions?round(s.changed/s.decisions):null}))},
    tigerFees:{...m.tigerFees,meanSurchargePerRecordedBid:m.tigerFees.actualMarkedBids?round(m.tigerFees.totalSurcharge/m.tigerFees.actualMarkedBids):null},
    fights:{...m.fights,meanDmgDelta:null}};
}
export function runImpact({start=10001,end=20000,normalFile,tigerZeroFile,bloodZeroFile,onProgress}={}){
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<10001||end>20000||start>end)
    throw Error('invalid fixed diagnostic seed range');
  const normalRaw=readRaw(normalFile,'h9-normal'),tigerRaw=readRaw(tigerZeroFile,'h9-zero-twinTiger'),bloodRaw=readRaw(bloodZeroFile,'h9-zero-bloodOath');
  const productText=fs.readFileSync(PRODUCT,'utf8'),productSha256=sha(productText),source=instrument(productText);
  for(const input of [normalRaw,tigerRaw,bloodRaw]) if(input.raw.provenance?.productSha256!==productSha256)
    throw Error(`raw product provenance mismatch: ${input.raw.arm}`);
  const engines={normal:createEngine(source),twinTiger:createEngine(source,'twinTiger'),bloodOath:createEngine(source,'bloodOath')};
  const metrics={twinTiger:createMetrics('twinTiger'),bloodOath:createMetrics('bloodOath')};
  for(let seed=start;seed<=end;seed++){
    const results={};
    for(const arm of ['normal','twinTiger','bloodOath']){
      const engine=engines[arm];engine.resetAudit();
      const result=engine.G.playPolicyGame(seed,{},undefined,{trueEffects:'off',destinyAiChase:false,recordChainHoldings:true});
      const raw=arm==='normal'?normalRaw:arm==='twinTiger'?tigerRaw:bloodRaw;
      const expected=raw.rows.get(seed);
      if(!expected) throw Error(`missing source seed ${seed} in ${raw.raw.arm}`);
      checkReplay(engine.G,result,expected);
      results[arm]={row:expected,audit:engine.getAudit(),G:engine.G};
    }
    comparePair(metrics.twinTiger,results.normal,results.twinTiger,
      results.normal.row,results.twinTiger.row,results.normal.audit,results.twinTiger.audit,results.normal.G,results.twinTiger.G);
    comparePair(metrics.bloodOath,results.normal,results.bloodOath,
      results.normal.row,results.bloodOath.row,results.normal.audit,results.bloodOath.audit,results.normal.G,results.bloodOath.G);
    if(onProgress&&(seed-start+1)%100===0) onProgress({seed,done:seed-start+1,total:end-start+1});
  }
  if(sha(fs.readFileSync(PRODUCT))!==productSha256) throw Error('product changed during diagnostic');
  return {schema:'yaoshi.destiny.h9-choice-impact.v1',sample:{start,end,gamesPerComparison:end-start+1},
    provenance:{productSha256,toolSha256:sha(fs.readFileSync(OWN)),instrumentedSourceSha256:sha(source),
      normalRawSha256:sha(fs.readFileSync(normalRaw.file)),twinTigerZeroRawSha256:sha(fs.readFileSync(tigerRaw.file)),
      bloodOathZeroRawSha256:sha(fs.readFileSync(bloodRaw.file))},
    comparisons:Object.fromEntries(CHAINS.map(id=>[id,finishMetrics(metrics[id])])),
    interpretation:['Paired normal-minus-zero arms toggle the named ordinary chain for all seats under the original default H9 AI and fixed seeds; this is not a human-choice estimate or a single-holder effect.','Bid-choice divergence is compared only for alive seats on matching auction items; post-treatment matching is descriptive.','Recorded twinTiger fee deltas are actual settlement-time calculations, including the freeBidFee override.','Combat activity records attack calculations/retaliation, not guaranteed hits or life loss. Fight comparisons require the same round and same opponent pair.','Original H9 fail/incomplete gates are unchanged; this diagnostic does not establish release eligibility.']};
}
function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=2){
    const k=argv[i],v=argv[i+1];
    if(!['--start','--end','--normal','--zero-tiger','--zero-blood','--out'].includes(k)||v===undefined||Object.hasOwn(out,k))
      throw Error(`invalid argument ${k}`);
    out[k]=v;
  }
  return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===OWN){
  const a=parseArgs(process.argv.slice(2));
  const result=runImpact({start:Number(a['--start']??10001),end:Number(a['--end']??20000),normalFile:a['--normal'],
    tigerZeroFile:a['--zero-tiger'],bloodZeroFile:a['--zero-blood'],
    onProgress:p=>process.stderr.write(`${p.seed} ${p.done}/${p.total}\n`)});
  process.stdout.write(`${writePrivate(a['--out'],result)}\n`);
}

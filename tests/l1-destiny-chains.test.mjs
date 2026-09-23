import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from './tools/load.mjs';

const TARGET=path.resolve(fileURLToPath(new URL('../index.html',import.meta.url)));
const game=()=>loadGame(TARGET);
const item=(g,ab)=>({...g.POOL.find(x=>x.ab===ab)});
const bid={amt:4,type:'cons',intent:'keep',target:null};
const offer=(amt,type='cons')=>({amt,type,intent:'keep',target:null});
function dayGame(seed,draws,mode='original'){
  const g=game();g.makeState('solo',seed,['qingmian'],draws,mode);
  g.S.players.forEach(p=>{p.ai=null;p.life=60;p.alive=true;});
  return g;
}
function auction(g,market,winner=0){
  const s=g.S;
  s.players.forEach(p=>{p.ai=null;p.alive=true;p.life=60;});
  s.market=market;
  s.humanBids={[winner]:market.map(()=>({...bid}))};
  return g.resolveAuction();
}

test('four letters draw independently with replacement without advancing market RNG',()=>{
  const a=game(),b=game();
  const privateDraws=['water','water','eyes','godKing'];
  const s=a.makeState('solo',1,['qingmian'],privateDraws);
  const t=b.makeState('solo',1,['qingmian'],privateDraws);
  assert.deepEqual(s.players.map(p=>p.destiny),t.players.map(p=>p.destiny));
  assert.equal(new Set(s.players.map(p=>p.destiny)).size<4,true,'independent draws allow collision');
  assert.equal(s.players.every(p=>Object.hasOwn(a.CHAINS,p.destiny)&&p.destinyAwakened===false),true);
  assert.deepEqual(s.market.map(x=>x.n),['過陰咒','陰陽眼銅錢','虎姑婆指甲','水鬼浮標']);
  assert.deepEqual(s.nextMarket.map(x=>x.n),['送王船','白虎煞','林投姐髮簪','山豬牙飾']);
  assert.equal(s.rng(),0.1642689702566713);
});

test('public seed and market cannot determine an unrevealed private letter',()=>{
  const a=game(),b=game();
  const sa=a.makeState('solo',321,['qingmian'],['water','eyes','godKing','bloodOath']);
  const sb=b.makeState('solo',321,['qingmian'],['eyes','water','bloodOath','godKing']);
  assert.notDeepEqual(sa.players.map(p=>p.destiny),sb.players.map(p=>p.destiny));
  assert.deepEqual(sa.market.map(x=>x.n),sb.market.map(x=>x.n));
  assert.deepEqual(a.replayExport(sa),b.replayExport(sb),
    'same public seed and market must be compatible with different hidden letters');
});

test('production draw uses secure bytes and persists private letters across reload',()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
  const values=[252,0,1,250,251];let calls=0;
  const saved=new Map(),storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues(bytes){
    bytes[0]=values[calls++];return bytes;
  }}});
  try{
    const g=loadGame(TARGET,{storage}),a=g.makeState('solo',98765,['qingmian']);
    assert.deepEqual(a.players.map(p=>p.destiny),['water','eyes','godKing','eternalFlame']);
    assert.equal(calls,5,'252 must be rejected before modulo six');
    const b=loadGame(TARGET,{storage}).makeState('solo',98765,['qingmian']);
    assert.deepEqual(b.players.map(p=>p.destiny),a.players.map(p=>p.destiny));
    assert.equal(calls,5,'reload in the same installation reuses private letters');
    saved.set('yaoshi-private-destiny-v1:98766','["invalid"]');
    values.push(0,1,2,3);
    const repaired=loadGame(TARGET,{storage}).makeState('solo',98766,['qingmian']);
    assert.equal(repaired.players.length,4);
    assert.deepEqual(JSON.parse(saved.get('yaoshi-private-destiny-v1:98766')),
      repaired.players.map(p=>p.destiny),'corrupt cached draws are replaced');
  }finally{Object.defineProperty(globalThis,'crypto',descriptor);}
});

test('production draw fails closed without secure entropy',()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:undefined});
  try{
    const g=game();
    assert.throws(()=>g.makeState('solo',87654,['qingmian']),/secure destiny draw unavailable/);
  }finally{Object.defineProperty(globalThis,'crypto',descriptor);}
});

test('policy and trace runners accept private draws for paired reproducibility',()=>{
  const g=game(),draws=['water','eyes','godKing','bloodOath'];
  g.playPolicyGame(321,{},['qingmian'],{privateDestinyDraws:draws});
  assert.deepEqual(g.S.players.map(p=>p.destiny),draws);
  g.simulate(321,{privateDestinyDraws:draws});
  assert.deepEqual(g.S.players.map(p=>p.destiny),draws);
  assert.deepEqual(g.trace([321],{321:draws}).runs[0],
    g.trace([321],{321:draws}).runs[0]);
});

test('true eyes sees a private fourth preview only while awakened recipe is held',()=>{
  const g=game(),s=g.makeState('solo',313,['qingmian'],['eyes','water','water','water']);
  const p=s.players[0];p.bag=[item(g,'eye'),item(g,'bell')];
  assert.equal(g.traitMax(p,'preview',1),3,'ordinary eyes keeps three previews');
  p.destinyAwakened=true;
  assert.equal(g.activeTrueDestiny(p,'eyes'),true);
  assert.equal(g.traitMax(p,'preview',1),4);
  s.nextMarket=['bow','boat','tiger','buoy'].map(ab=>item(g,ab));
  g.captureNextPreviewFor(p);
  g.rememberPreviewForNextRound();
  assert.equal(s.prevPreview.length,3);
  assert.equal(s.prevPreviewByPid[0].length,4);
  assert.equal(g.previewedItem(p,s.nextMarket[3]),true);
  assert.equal(g.previewedItem(s.players[1],s.nextMarket[3]),false);
  p.bag=[item(g,'bell')];
  assert.equal(g.activeTrueDestiny(p,'eyes'),false);
  assert.equal(g.traitMax(p,'preview',1),2,'missing recipe suspends true and ordinary chain');
  p.bag.push(item(g,'eye'));
  assert.equal(g.activeTrueDestiny(p,'eyes'),true,'restored material resumes without a second awakening');
  s.destinyEffectMode='off';
  assert.equal(g.traitMax(p,'preview',1),3,'paired ordinary arm keeps ordinary eyes');
});

test('next preview is frozen before auction awakening and survives later material loss',()=>{
  const g=dayGame(318,['eyes','water','water','water']),p=g.S.players[0];
  p.bag=[item(g,'eye')];
  g.S.nextMarket=['bow','boat','tiger','buoy'].map(ab=>item(g,ab));
  g.S.market=[item(g,'bell')];g.S.humanBids={0:[offer(4)]};
  g.resolveAuction();
  assert.equal(p.destinyAwakened,true);
  g.rememberPreviewForNextRound();
  assert.equal(g.S.prevPreviewByPid[0].length,1,
    'winning the bell cannot retroactively reveal four items at the previous market');
  const h=dayGame(319,['eyes','water','water','water']),q=h.S.players[0];
  q.bag=[item(h,'eye'),item(h,'bell')];q.destinyAwakened=true;
  h.S.nextMarket=['bow','boat','tiger','buoy'].map(ab=>item(h,ab));
  h.S.market=[item(h,'xianji')];h.S.humanBids={};h.resolveAuction();
  q.bag=[item(h,'eye')];
  h.rememberPreviewForNextRound();
  assert.equal(h.S.prevPreviewByPid[0].length,4,
    'losing a material after seeing the market cannot erase legitimate preview memory');
});

test('original true water refunds one only for an effective empty-hand auction',()=>{
  const run=mode=>{
    const g=dayGame(411,['water','eyes','water','eyes'],mode),p=g.S.players[0];
    p.bag=[item(g,'boat'),item(g,'buoy')];p.destinyAwakened=true;
    g.S.market=[item(g,'bow')];
    g.S.humanBids={0:[offer(4)],1:[offer(8)]};
    const r=g.resolveAuction();
    return {p,events:g.S.destinyDayEvents,cost:r[0].entries.find(e=>e.p.id===0).cost};
  };
  const base=run('off'),trueArm=run('original');
  assert.equal(trueArm.cost,base.cost,'ordinary free entry fee remains identical');
  assert.equal(trueArm.p.life,base.p.life+1);
  assert.deepEqual(trueArm.events.filter(e=>e.kind==='emptyHandRelief').map(e=>e.amount),[1]);
  const g=dayGame(411,['water','eyes','water','eyes']),p=g.S.players[0];
  p.bag=[item(g,'boat'),item(g,'buoy')];p.destinyAwakened=true;
  g.S.market=[item(g,'bow')];g.S.humanBids={};g.resolveAuction();
  assert.equal(g.S.destinyDayEvents.some(e=>e.kind==='emptyHandRelief'),false);
});

test('original true tiger charges 35% conservative loss on its marked item without bidding',()=>{
  const run=mode=>{
    const g=dayGame(412,['water','twinTiger','water','eyes'],mode),t=g.S.players[1];
    t.bag=[item(g,'tiger'),item(g,'nail')];t.destinyAwakened=true;
    g.S.market=[item(g,'bow')];g.S.marks={1:0};
    g.S.humanBids={0:[offer(10)],2:[offer(12)]};
    const r=g.resolveAuction();
    return r[0].entries.find(e=>e.p.id===0).cost;
  };
  assert.equal(run('original'),run('off')+1);
  assert.equal(run('candidate'),run('off'),'candidate requires a true tiger bid');
});

test('true blood oath reduces original every losing life bid, candidate only first',()=>{
  const run=mode=>{
    const g=dayGame(413,['bloodOath','eyes','water','eyes'],mode),p=g.S.players[0];
    p.bag=[item(g,'xianji'),item(g,'guoyin')];p.destinyAwakened=true;
    g.S.market=[item(g,'bow'),item(g,'boat')];
    g.S.humanBids={0:[offer(10,'yaming'),offer(10,'yaming')],
      1:[offer(12),offer(12)]};
    return g.resolveAuction().map(r=>r.entries.find(e=>e.p.id===0).cost);
  };
  const base=run('off'),original=run('original'),candidate=run('candidate');
  assert.deepEqual(original,base.map(n=>n-1));
  assert.deepEqual(candidate,[base[0]-1,base[1]]);
});

test('true eyes discounts only its fourth individually recorded preview',()=>{
  const run=mode=>{
    const g=dayGame(414,['eyes','water','water','water'],mode),p=g.S.players[0];
    p.bag=[item(g,'eye'),item(g,'bell')];p.destinyAwakened=true;
    g.S.nextMarket=['bow','boat','tiger','buoy'].map(ab=>item(g,ab));
    g.captureNextPreviewFor(p);
    g.rememberPreviewForNextRound();
    g.S.market=[g.S.nextMarket[3]];g.S.humanBids={0:[offer(5)]};
    return g.resolveAuction()[0].entries[0].cost;
  };
  assert.equal(run('original'),run('off')-1);
});

test('true eyes preview distinguishes duplicate copies of the same named item',()=>{
  const g=dayGame(420,['eyes','water','water','water']),p=g.S.players[0];
  p.bag=[item(g,'eye')];
  g.S.nextMarket=[item(g,'boat'),item(g,'bow'),item(g,'tiger'),item(g,'boat')];
  g.captureNextPreviewFor(p);
  p.bag.push(item(g,'bell'));p.destinyAwakened=true;
  g.rememberPreviewForNextRound();g.S.market=g.S.nextMarket;
  assert.equal(g.previewedItem(p,g.S.market[0]),true);
  assert.equal(g.previewedItem(p,g.S.market[3]),false,
    'seeing the first copy cannot discount an unseen fourth copy');
});

test('true god king returns three life on shrine award and original waives this night tithe',()=>{
  const run=mode=>{
    const g=dayGame(415,['godKing','water','eyes','water'],mode),p=g.S.players[0];
    p.bag=[item(g,'bow'),item(g,'sword')];p.destinyAwakened=true;p.life=20;
    g.S.round=5;g.S.incPool[0]=5;
    const out={taken:[]};g.awardLegend(out,p,0);
    const awarded=p.life,paid=g.settleTithe([]).find(x=>x.pid===0);
    return {awarded,after:p.life,paid};
  };
  const base=run('off'),original=run('original'),candidate=run('candidate');
  assert.equal(original.awarded,base.awarded+3);
  assert.equal(candidate.awarded,base.awarded+3);
  assert.equal(original.after,original.awarded);
  assert.equal(original.paid.destinyExempt,true);
  assert.equal(candidate.after,candidate.awarded-2);
});

test('true eternal flame grants the lowest life after auction before death sweep',()=>{
  const run=mode=>{
    const g=dayGame(416,['eternalFlame','eyes','water','godKing'],mode),p=g.S.players[0];
    p.bag=[item(g,'fushou'),item(g,'sigui')];p.destinyAwakened=true;p.life=2;
    g.S.market=[item(g,'bow')];g.S.humanBids={0:[offer(2)],1:[offer(8)]};
    g.resolveAuction();
    return {life:p.life,alive:p.alive,events:g.S.destinyDayEvents};
  };
  const base=run('off'),original=run('original');
  assert.equal(base.life,0);assert.equal(base.alive,false);
  assert.equal(original.life,1);assert.equal(original.alive,true);
  assert.equal(original.events.some(e=>e.kind==='lowestRelief'),true);
  const g=dayGame(417,['eternalFlame','eyes','water','godKing'],'candidate'),p=g.S.players[0];
  p.bag=[item(g,'fushou'),item(g,'sigui')];p.destinyAwakened=true;p.life=2;
  g.S.market=[item(g,'bow')];g.S.humanBids={};g.resolveAuction();
  assert.equal(p.life,2,'candidate requires an effective paid bid');
});

test('two paid true eternal holders tied for lowest follow the wind only in candidate',()=>{
  const run=mode=>{
    const g=dayGame(418,['eternalFlame','eyes','water','eternalFlame'],mode);
    for(const id of [0,3]){
      const p=g.S.players[id];p.bag=[item(g,'fushou'),item(g,'sigui')];
      p.destinyAwakened=true;p.life=10;
    }
    g.S.market=[item(g,'bow'),item(g,'sword')];
    g.S.humanBids={0:[offer(2),null],3:[null,offer(2)]};
    g.resolveAuction();
    return g.S.destinyDayEvents.filter(e=>e.kind==='lowestRelief').map(e=>e.pid);
  };
  assert.deepEqual(run('original'),[0,3]);
  assert.deepEqual(run('candidate'),[3],'round one wind begins at the east seat');
});

test('real auction bag ingress awakens designated recipe once; other recipe, duplicates and losses do not',()=>{
  const g=game();g.makeState('solo',14,['qingmian']);
  const p=g.S.players[0];p.destiny='water';
  p.bag=[item(g,'eye'),item(g,'boat')];
  let r=auction(g,[item(g,'bell')]);
  assert.equal(p.destinyAwakened,false);
  assert.deepEqual(r[0].destinyAwakenings,[]);
  r=auction(g,[item(g,'boat')]);
  assert.equal(p.destinyAwakened,false);
  r=auction(g,[item(g,'buoy')]);
  assert.equal(p.destinyAwakened,true);
  assert.deepEqual(r[0].destinyAwakenings,[{pid:0,chainId:'water'}]);
  assert.deepEqual(auction(g,[item(g,'buoy')])[0].destinyAwakenings,[]);
  p.bag=p.bag.filter(x=>x.ab!=='buoy');
  assert.equal(p.destinyAwakened,true);
  assert.equal(g.activeChains(p).some(c=>c.id==='water'),false);
});

test('empty bag, cursed lookalike, preview and non-auction mutation never awaken',()=>{
  const g=game();g.makeState('solo',3,['qingmian']);
  const p=g.S.players[0];p.destiny='water';
  assert.equal(g.destinyRecipeHeld(p),false);
  p.bag=[item(g,'boat'),{...item(g,'buoy'),curse:true}];
  assert.equal(g.destinyRecipeHeld(p),false);
  g.observeBagMutation(p,'shrine.reward');
  assert.equal(p.destinyAwakened,false);
  p.bag=[item(g,'boat'),item(g,'buoy')];
  g.observeBagMutation(p,'endgame.strip');
  assert.equal(p.destinyAwakened,false);
  assert.equal(g.destinyRecipeHeld(p),true);
  const r=auction(g,[item(g,'eye')]);
  assert.equal(p.destinyAwakened,false,'unrelated later auction cannot awaken a recipe completed elsewhere');
  assert.deepEqual(r[0].destinyAwakenings,[]);
});

test('public projection gates hotseat letters until each actual reveal; replay has only event-time results',()=>{
  const g=game();g.makeState('hotseat',2,['qingmian','dangpu']);
  const [a,b]=g.S.players;
  a.destiny='water';b.destiny='eyes';
  a.bag=[item(g,'boat')];
  assert.equal(g.destinyProjection(a,{viewer:0,phase:'market'}).chainId,'water');
  assert.equal(g.destinyProjection(b,{viewer:0,phase:'market'}).chainId,null);
  assert.equal(g.destinyProjection(a,{viewer:0,phase:'handoff'}).chainId,null);
  assert.equal(g.destinyProjection(a,{viewer:1,phase:'market'}).chainId,null);
  const before=JSON.stringify(g.replayExport(g.S));
  assert.equal(g.replayExport(g.S).seed,2,'public market seed remains replayable');
  assert.equal(before.includes('water'),false);
  assert.equal(before.includes('eyes'),false);
  const r=auction(g,[item(g,'buoy')]);
  assert.equal(a.destinyAwakened,true);
  assert.equal(g.destinyProjection(a,{viewer:1,phase:'reveal'}).chainId,null,'engine resolved whole market but visual reveal has not reached card');
  assert.equal(JSON.stringify(g.replayExport(g.S)).includes('water'),false,'mid-reveal export cannot expose a future announcement');
  g.publishDestinyReveal(r[0]);
  assert.equal(g.destinyProjection(a,{viewer:1,phase:'reveal'}).chainId,'water');
  assert.equal(g.destinyProjection(b,{viewer:0,phase:'reveal'}).chainId,null);
  a.bag=[];
  assert.match(g.destinyLetterHTML(a,{viewer:0,phase:'market'}),/缺材料，真效果暫停/);
  assert.doesNotMatch(g.destinyLetterHTML(a,{viewer:1,phase:'market'}),/缺材料/,
    'opponent view must not leak private holdings');
  a.bag=[item(g,'boat'),item(g,'buoy')];
  assert.doesNotMatch(g.destinyLetterHTML(a,{viewer:0,phase:'market'}),/真效果暫停/);
  const out=g.replayExport(g.S);
  assert.deepEqual(out.history.nights[0].auction[0].destinyAwakenings,[{pid:0,chainId:'water'}]);
  assert.equal(JSON.stringify(out).includes('eyes'),false);
  assert.equal(Object.hasOwn(out.players[0],'destiny'),false);
  assert.equal(g.publishDestinyReveal(r[0]),false,'public announcement is idempotent');
});

test('two materials won in one auction announce only at the second item and never repeat',()=>{
  const g=game();g.makeState('solo',9,['qingmian']);
  const p=g.S.players[0];p.destiny='water';
  const r=auction(g,[item(g,'boat'),item(g,'buoy')]);
  assert.deepEqual(r.map(x=>x.destinyAwakenings.length),[0,1]);
  assert.equal(g.destinyProjection(p,{viewer:1,phase:'reveal'}).chainId,null);
  assert.equal(g.publishDestinyReveal(r[0]),false);
  assert.equal(g.destinyProjection(p,{viewer:1,phase:'reveal'}).chainId,null);
  assert.equal(g.publishDestinyReveal(r[1]),true);
  assert.match(g.destinyLetterHTML(p,{viewer:1,phase:'reveal'}),/真・天命連鎖/);
  assert.deepEqual(g.S.history.nights[0].auction.map(x=>x.destinyAwakenings?.length||0),[0,1]);
  assert.equal(g.publishDestinyReveal(r[1]),false);
});

test('unannounced later item cannot leak its private cost through public replay or seat state',()=>{
  const run=letter=>{
    const g=dayGame(908,[letter,'water','eyes','godKing']);
    const p=g.S.players[0];p.bag=[item(g,'xianji')];
    g.S.market=[item(g,'guoyin'),item(g,'bow')];
    g.S.humanBids={0:[offer(4),offer(10,'yaming')],1:[null,offer(12)]};
    const reveal=g.resolveAuction();
    return {g,reveal};
  };
  const a=run('bloodOath'),b=run('eyes');
  const charged=r=>r.reveal[1].entries.find(e=>e.p.id===0).cost;
  assert.equal(charged(a),5);
  assert.equal(charged(b),6,'control letter pays the normal life bid loss');
  assert.deepEqual(a.g.replayExport(a.g.S),b.g.replayExport(b.g.S),
    'before the first card, neither later costs nor final life may enter public replay');
  assert.deepEqual(a.g.S.auctionPublicStates[0].map(p=>p.life),
    b.g.S.auctionPublicStates[0].map(p=>p.life));
  assert.equal(a.g.replayExport(a.g.S).history.nights[0].auction.length,0);
  a.g.publishDestinyReveal(a.reveal[0]);
  assert.equal(a.g.replayExport(a.g.S).history.nights[0].auction.length,1);
  assert.equal(a.g.replayExport(a.g.S).players[0].life,
    a.g.S.auctionPublicStates[1][0].life,'public life follows the announced card only');
  assert.equal(a.g.replayExport(a.g.S).history.nights[0].auction.some(x=>x.item===a.g.S.market[1].n),false);
});

test('malformed noncurse poison transfer remains engine-safe if injected by a headless caller',()=>{
  const g=game();g.makeState('solo',12,['qingmian']);
  const target=g.S.players[0];target.destiny='water';target.bag=[item(g,'boat')];
  g.S.players.forEach(p=>{p.ai=null;p.life=60;});
  g.S.market=[item(g,'buoy')];
  g.S.humanBids={1:[{amt:6,type:'cons',intent:'poison',target:0}]};
  const r=g.resolveAuction();
  assert.equal(target.bag.some(x=>x.ab==='buoy'),true);
  assert.deepEqual(r[0].destinyAwakenings,[{pid:0,chainId:'water'}]);
  assert.equal(target.destinyAwakened,true);
});

test('solo bag shows no premature awakened status before its reveal card',()=>{
  const g=game();g.makeState('solo',13,['qingmian']);
  const p=g.S.players[0];p.destiny='water';p.bag=[item(g,'boat')];
  const r=auction(g,[item(g,'buoy')]);
  const before=g.destinyProjection(p,{viewer:0,phase:'reveal'});
  assert.equal(before.chainId,'water','the owner still knows their assigned recipe');
  assert.equal(before.awakened,false,'the later reveal is not public yet');
  assert.match(g.destinyLetterHTML(p,{viewer:0,phase:'reveal'}),/未覺醒/);
  g.publishDestinyReveal(r[0]);
  assert.equal(g.destinyProjection(p,{viewer:0,phase:'reveal'}).awakened,true);
});

test('dead seat cannot buy a missing material and gains no private hotseat view',()=>{
  const g=game();g.makeState('hotseat',4,['qingmian','dangpu']);
  const p=g.S.players[0];p.destiny='water';p.bag=[item(g,'boat')];p.alive=false;
  g.S.players.slice(1).forEach(q=>{q.ai=null;});
  g.S.market=[item(g,'buoy')];
  g.S.humanBids={0:[{...bid}]};
  const r=g.resolveAuction();
  assert.equal(r[0].winner,null);
  assert.equal(p.destinyAwakened,false);
  assert.equal(g.destinyProjection(p,{viewer:0,phase:'market'}).chainId,null);
});

test('fatal winning payment still enters the bag and awakens before the existing death sweep',()=>{
  const g=game();g.makeState('solo',5,['qingmian']);
  const p=g.S.players[0];p.destiny='water';p.bag=[item(g,'boat')];p.life=5;
  g.S.players.slice(1).forEach(q=>{q.ai=null;});
  g.S.market=[item(g,'buoy')];
  g.S.humanBids={0:[{...bid}]};
  const r=g.resolveAuction();
  assert.equal(r[0].winner.p.id,0);
  assert.equal(p.life,0);
  assert.equal(p.alive,false);
  assert.equal(p.bag.some(x=>x.ab==='buoy'),true);
  assert.equal(p.destinyAwakened,true);
  assert.deepEqual(r[0].destinyAwakenings,[{pid:0,chainId:'water'}]);
});

test('public seed never exposes independently drawn private letters',()=>{
  const g=game();g.makeState('solo',77,['qingmian']);
  g.S.players.forEach(p=>{p.destinyAwakened=true;});
  assert.equal(g.replayExport(g.S).seed,77,'market seed is public before visual announcements');
  assert.equal(g.replayExport(g.S).history.nights.length,0);
  g.publishDestinyReveal({destinyAwakenings:g.S.players.map(p=>({pid:p.id,chainId:p.destiny}))});
  const e=g.replayExport(g.S);
  assert.equal(e.seed,77);
  assert.equal(e.seedRedacted,undefined);
});

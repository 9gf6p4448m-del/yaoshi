import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadGame} from './tools/load.mjs';

const game=(id,mode='original')=>{
  const g=loadGame(new URL('../index.html',import.meta.url));
  g.makeState('solo',345,['qingmian'],[id,'water','eyes','godKing'],mode);
  g.S.players[0].destinyAwakened=true;
  return g;
};
const item=(g,ab)=>({...g.POOL.find(x=>x.ab===ab)});
const dummy=(name,body,count,atk,hp,trait=null)=>
  ({n:name,f:'zuling',p:1,unit:{body,count,atk,hp,trait}});
const env=()=>({beat:3,rng:()=>.5,beats:[],log:[],seen:{},stats:{tr:{},swap:0}});

test('true tiger weakens only the first front, for the whole battle, once',()=>{
  const run=mode=>{
    const g=game('twinTiger',mode),[a,b]=g.S.players;
    a.bag=['tiger','nail'].map(ab=>item(g,ab));
    b.bag=[dummy('硬兵','elite',1,4,60)];
    return g.paperWar(a,b,{rng:()=>.5,phase:null,windId:null});
  };
  const off=run('off'),on=run('original');
  const attacks=r=>r.beats.filter(x=>x.side==='B'&&x.kind==='hit').map(x=>[x.beat,x.amount]);
  assert.deepEqual(attacks(off).slice(0,2),[[1,4],[2,4]]);
  assert.deepEqual(attacks(on).slice(0,2),[[1,3],[2,3]]);
  assert.equal(on.stats.tr.trueTwinTiger,1);
  assert.deepEqual([...new Set(on.beats.filter(x=>x.kind==='beatStart').map(x=>x.beat))],[1,2,3]);
});

test('true tiger has no phantom front to weaken',()=>{
  const g=game('twinTiger'),[a,b]=g.S.players;
  a.bag=['tiger','nail'].map(ab=>item(g,ab));
  b.bag=[dummy('無前鋒的幽靈','haunt',1,0,30)];
  const war=g.paperWar(a,b,{rng:()=>.5,phase:null,windId:null});
  assert.equal(war.stats.tr.trueTwinTiger||0,0);
  assert.equal(war.beats.filter(x=>x.kind==='beatStart').length,3);
});

test('true water follows a successful swap; candidate requires the source team alive',()=>{
  const run=mode=>{
    const g=game('water',mode),[a,b]=g.S.players;
    a.bag=['boat','buoy'].map(ab=>item(g,ab));b.bag=[item(g,'boat')];
    const x=g.pwSide(a,'A'),y=g.pwSide(b,'B'),e=env();
    x.teams.find(t=>t.tr?.swap).units.forEach(u=>{u.alive=false;u.hp=0;});
    const before=x.units.filter(u=>u.alive&&u.body==='swarm').map(u=>u.hp);
    g.pwHaunt(x,y,e);
    return {x,y,e,before};
  };
  const off=run('off'),orig=run('original'),candidate=run('candidate');
  assert.equal(orig.e.stats.swap,1,'ordinary swap still succeeds with another ally alive');
  assert.equal(orig.e.stats.tr.trueWater,1);
  assert.equal(candidate.e.stats.tr.trueWater||0,0);
  assert.deepEqual(orig.x.units.filter(u=>u.alive&&u.body==='swarm').map(u=>u.hp),
    orig.before.map(h=>h+1));
  assert.deepEqual(candidate.x.units.filter(u=>u.alive&&u.body==='swarm').map(u=>u.hp),off.before);
});

test('true eyes first-beat armor pierce keeps boat absorb and personal shield rules separate',()=>{
  const run=mode=>{
    const g=game('eyes',mode),[a,b]=g.S.players;
    a.bag=['eye','bell'].map(ab=>item(g,ab));
    a.bag.push(dummy('測試矛','elite',1,4,20));
    b.bag=[dummy('測試鎧','elite',1,1,20,'eliteArmor')];
    return g.paperWar(a,b,{rng:()=>.5,phase:null,windId:null});
  };
  const off=run('off'),on=run('original');
  assert.equal(off.stats.tr.trueEyes||0,0);
  assert.equal(on.stats.tr.trueEyes,1,'one true-eye announcement per battle');
  assert.ok((on.stats.tr.eliteArmor||0)<(off.stats.tr.eliteArmor||0),
    'the first-beat armor reduction is bypassed');
});

test('two true-eye armies with first strike both act before either side settles',()=>{
  const g=game('eyes'),[a,b]=g.S.players;
  b.destiny='eyes';b.destinyAwakened=true;
  a.bag=['eye','bell'].map(ab=>item(g,ab));
  b.bag=['eye','bell'].map(ab=>item(g,ab));
  a.bag.push(dummy('甲先鋒','elite',1,8,12));
  b.bag.push(dummy('乙先鋒','elite',1,8,12));
  const war=g.paperWar(a,b,{rng:()=>.5,phase:null,windId:null});
  const first=war.beats.filter(x=>x.beat===1&&x.kind==='hit');
  assert.ok(first.some(x=>x.side==='A')&&first.some(x=>x.side==='B'));
  assert.equal(war.beats.filter(x=>x.kind==='beatStart').length,3);
});

test('true god king gains one attack after an actual opening-shot kill; candidate ends after beat one',()=>{
  const run=(mode,hp)=>{
    const g=game('godKing',mode),[a,b]=g.S.players;
    a.bag=['bow','sword'].map(ab=>item(g,ab));
    b.bag=[dummy('假兵','swarm',8,1,hp)];
    return g.paperWar(a,b,{rng:()=>.5,phase:null,windId:null});
  };
  const off=run('off',3),orig=run('original',3),candidate=run('candidate',3);
  const beat2=r=>r.beats.filter(x=>x.side==='A'&&x.kind==='hit'&&x.beat===2).map(x=>x.amount);
  assert.deepEqual(beat2(off),[10,9]);
  assert.deepEqual(beat2(orig),[11,10]);
  assert.deepEqual(beat2(candidate),beat2(off));
  assert.equal(orig.stats.tr.trueGodKing,1);
  assert.equal(run('original',4).stats.tr.trueGodKing||0,0,
    'a shot that does not kill cannot grant the attack bonus');
});

test('true blood oath adds one opening retaliation once despite duplicate knives',()=>{
  const run=mode=>{
    const g=game('bloodOath',mode),[a,b]=g.S.players;
    a.bag=['xianji','xianji','guoyin'].map(ab=>item(g,ab));
    b.bag=[dummy('硬兵','elite',1,1,50)];
    return g.paperWar(a,b,{rng:()=>.5,phase:null,windId:null});
  };
  const off=run('off'),on=run('original');
  const curse=r=>r.beats.filter(x=>x.kind==='bloodSacrifice').map(x=>x.amount);
  assert.deepEqual(curse(off),[1,1]);
  assert.deepEqual(curse(on),[2,1]);
  assert.equal(on.beats.filter(x=>x.kind==='beatStart').length,3);
});

test('true eternal shield follows successful feeding, and candidate needs its source alive',()=>{
  const run=mode=>{
    const g=game('eternalFlame',mode),[a,b]=g.S.players;
    a.bag=['fushou','sigui'].map(ab=>item(g,ab));b.bag=[item(g,'boat')];
    const x=g.pwSide(a,'A'),y=g.pwSide(b,'B'),e=env();
    x.teams.find(t=>t.tr?.feed).units.forEach(u=>{u.alive=false;u.hp=0;});
    y.burned=1;g.pwFeed(x,y,e,0);
    return {x,e};
  };
  assert.equal(run('off').x.units.some(u=>u.destinyShield),false);
  assert.equal(run('original').x.units.some(u=>u.destinyShield===3),true);
  assert.equal(run('candidate').x.units.some(u=>u.destinyShield),false);
});

test('candidate eternal shield expires after the next beat, while original shield persists',()=>{
  const run=mode=>{
    const g=game('eternalFlame',mode),[a,b]=g.S.players;
    a.bag=['fushou','sigui'].map(ab=>item(g,ab));
    b.bag=[dummy('不出手','elite',1,0,40)];
    const x=g.pwSide(a,'A'),y=g.pwSide(b,'B');
    const e={...env(),beat:1};
    y.burned=1;g.pwFeed(x,y,e,0);
    const holder=x.units.find(u=>u.destinyShield===(mode==='candidate'?2:3));
    assert.ok(holder);
    e.beat=2;y.burned=1;
    g.pwClash(2,0,x,y,null,e);
    return holder.destinyShield;
  };
  assert.equal(run('candidate'),0);
  assert.equal(run('original'),3);
});

test('duplicate urns produce one true shield per successful feed beat',()=>{
  const g=game('eternalFlame'),[a,b]=g.S.players;
  a.bag=['fushou','sigui','sigui'].map(ab=>item(g,ab));
  b.bag=[item(g,'boat')];
  const x=g.pwSide(a,'A'),y=g.pwSide(b,'B'),e={...env(),beat:1};
  y.burned=1;g.pwFeed(x,y,e,0);
  assert.equal(e.stats.tr.trueEternalShield,1);
  assert.equal(x.units.reduce((sum,u)=>sum+(u.destinyShield||0),0),3);
});

test('personal shield absorbs after boat and before armor; pierce skips boat only',()=>{
  const g=game('eternalFlame');
  const foe={absorb:2,tag:'B',p:{name:'敵'},teams:[{tr:{armor:2,id:'armor'}}]};
  const target={id:0,t:0,pend:0,destinyShield:2};
  const e={beat:2,beats:[],log:[],seen:{},stats:{tr:{}}};
  assert.equal(g.pwDeal(target,foe,5,e,{}),1);
  assert.equal(foe.absorb,0);
  assert.equal(target.destinyShield,0);
  assert.equal(target.pend,1);
  assert.deepEqual(e.beats.filter(x=>x.kind==='shield').map(x=>x.amount),[2]);
  const pierce={id:1,t:0,pend:0,destinyShield:2};
  foe.absorb=2;foe.teams[0].armorBeat=undefined;
  assert.equal(g.pwDeal(pierce,foe,5,e,{pierce:true}),1);
  assert.equal(foe.absorb,2,'eye pierce cannot bypass the new personal shield');
  assert.equal(pierce.destinyShield,0);
});

test('each true destiny has a readable private rule and night move caption',()=>{
  const moveIds=['trueTwinTiger','trueWater','trueEyes','trueGodKing','bloodSacrifice','trueEternalShield'];
  const g=game('eyes'),p=g.S.players[0];
  assert.match(g.destinyLetterHTML(p,{viewer:0,phase:'market'}),/真效果・白天/);
  assert.match(g.destinyLetterHTML(p,{viewer:0,phase:'market'}),/夜戰/);
  assert.doesNotMatch(g.destinyLetterHTML(p,{viewer:1,phase:'market'}),/穿透敵方護甲/);
  for(const id of moveIds){
    const m=g.TRUE_DESTINY_MOVES[id];
    assert.ok(m?.name&&m?.desc&&g.CHAINS[m.chain],`${id} needs a player-facing caption`);
    assert.ok(g.TRUE_DESTINY_RULES[m.chain]?.night);
  }
});

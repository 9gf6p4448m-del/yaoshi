import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from './tools/load.mjs';

const TARGET=process.env.CHAIN_HOLDINGS_TARGET||path.resolve(fileURLToPath(new URL('../index.html',import.meta.url)));
const item=(G,ab)=>({...G.POOL.find(x=>x.ab===ab)});
const first=(result,chain='water',seat=0)=>result.chainHoldings?.first?.[chain]?.[seat];
function game(seed=1){
  const G=loadGame(TARGET);
  G.CFG.EVENT_ON=false; G.CFG.RULE_ON=false; G.CFG.WISH_ON=false; G.CFG.LEGEND_ON=false;
  return G;
}
function runOnce(G,action,seed=1){
  let called=false;
  const policy=p=>{
    if(!called){called=true;action(p,G.S,G);}
    return G.policySplitter(p);
  };
  return G.playPolicyGame(seed,{0:policy},undefined,{recordChainHoldings:true});
}

test('opt-in observes real acquisition immediately and preserves first time after same-night loss',()=>{
  const G=game();
  const result=runOnce(G,(p,S)=>{
    p.roleId='hunter';
    p.bag=[item(G,'boat')];
    const loser=S.players[1]; loser.bag=[item(G,'buoy')];
    G.ROLES.hunter.hooks.onBattle({w:p,l:loser,war:true,pw:0,pl:1,extra:[]});
    assert.deepEqual(G.activeChains(p).map(c=>c.id),['water']);
    const buoy=p.bag.find(x=>x.ab==='buoy');
    p.bag.splice(p.bag.indexOf(buoy),1);
  });
  assert.deepEqual(first(result),{round:1,phase:'battle.hunter.gain',mutationSequence:2});
  assert.equal(result.chainHoldings.mutationCount>0,true);
});

test('off/on game results are byte-identical after removing record field and RNG is unchanged',()=>{
  for(let seed=1;seed<=20;seed++){
    const off=game(seed), on=game(seed);
    const a=off.playPolicyGame(seed,{});
    const b=on.playPolicyGame(seed,{},undefined,{recordChainHoldings:true});
    assert.ok(Object.hasOwn(b,'chainHoldings'));
    delete b.chainHoldings;
    assert.equal(JSON.stringify(b),JSON.stringify(a),`seed ${seed}`);
    assert.equal(on.S.rng(),off.S.rng(),`next RNG seed ${seed}`);
  }
});

test('recorder is detached from game state and reset for the next game',()=>{
  const G=game();
  const one=runOnce(G,(p,S)=>{
    p.roleId='hunter';
    p.bag=[item(G,'boat')];
    const loser=S.players[1]; loser.bag=[item(G,'buoy')];
    G.ROLES.hunter.hooks.onBattle({w:p,l:loser,war:true,pw:0,pl:1,extra:[]});
  });
  assert.ok(first(one));
  const two=G.playPolicyGame(2,{},undefined,{recordChainHoldings:true});
  assert.equal(first(two),undefined);
  assert.equal(Object.hasOwn(G.S,'chainHoldings'),false);
  assert.equal(Object.hasOwn(G.S.players[0],'chainHoldings'),false);
  assert.equal(Object.hasOwn(G.S.history,'chainHoldings'),false);
  assert.equal(Object.hasOwn(G.CFG,'chainHoldings'),false);
});

test('callback exception clears recorder and nested playPolicyGame is rejected before replacing state',()=>{
  const G=game();
  let originalState;
  assert.throws(()=>runOnce(G,(p,S)=>{
    originalState=S;
    assert.throws(()=>G.playPolicyGame(99,{}),/nested playPolicyGame/);
    assert.equal(G.S,originalState);
    throw new Error('intentional policy failure');
  }),/intentional policy failure/);
  const next=G.playPolicyGame(2,{},undefined,{recordChainHoldings:true});
  assert.ok(next.chainHoldings);
});

test('previews and lookalike players cannot create holdings',()=>{
  const baseline=game(),preview=game();
  const a=runOnce(baseline,()=>{},3);
  const b=runOnce(preview,(p,S,G)=>{
    const lookalike={...p,bag:[item(G,'boat'),item(G,'buoy')]};
    assert.deepEqual(G.activeChains(lookalike).map(c=>c.id),['water']);
    assert.deepEqual(G.chainsCompletedBy({...p,bag:[item(G,'boat')]},item(G,'buoy')).map(c=>c.id),['water']);
  },3);
  assert.equal(b.chainHoldings.mutationCount,a.chainHoldings.mutationCount);
  assert.deepEqual(b.chainHoldings.first,a.chainHoldings.first);
});

test('opponent and dead holder remain in first snapshot; duplicate and reacquisition never overwrite first',()=>{
  const G=game();
  const result=runOnce(G,(_p,S,G)=>{
    const holder=S.players[1],victim=S.players[2];
    holder.roleId='hunter'; holder.bag=[item(G,'boat')];
    victim.bag=[item(G,'buoy'),item(G,'buoy')];
    const battle={w:holder,l:victim,war:true,pw:0,pl:1,extra:[]};
    G.ROLES.hunter.hooks.onBattle(battle);
    const firstBuoy=holder.bag.find(x=>x.ab==='buoy');
    G.releaseLegend(holder,firstBuoy,[],'test',false);
    G.ROLES.hunter.hooks.onBattle(battle);
    holder.alive=false;
  });
  assert.deepEqual(first(result,'water',1),{round:1,phase:'battle.hunter.gain',mutationSequence:2});
  assert.deepEqual(result.chainHoldings.holders.water,[1]);
});

test('same-night completion then loss uses real hunter gain and ghost loss',()=>{
  const G=game();
  const result=runOnce(G,(p,S,G)=>{
    p.roleId='hunter'; p.bag=[item(G,'boat')];
    const source=S.players[1],taker=S.players[2];
    source.bag=[item(G,'buoy')];
    G.ROLES.hunter.hooks.onBattle({w:p,l:source,war:true,pw:0,pl:1,extra:[]});
    G.EVENTS.ghost.settle({players:[p,taker],victim:p,choices:{[p.id]:0,[taker.id]:3},events:[]});
    assert.equal(G.activeChains(p).length,0);
  });
  assert.equal(first(result).phase,'battle.hunter.gain');
  assert.ok(result.chainHoldings.mutationCount>=4);
});

test('real player identity guard rejects same-id preview mutated through a real hook',()=>{
  const base=game(), fake=game();
  const a=runOnce(base,()=>{},4);
  const b=runOnce(fake,(p,S,G)=>{
    const copy={...p,bag:[item(G,'eye'),item(G,'bell')]};
    G.ROLES.dangpu.hooks.onBidSettle({p:copy,cost:copy.life+1,events:[]});
    assert.equal(copy.bag.length,3);
    assert.equal(G.activeChains(copy)[0].id,'eyes');
  },4);
  assert.equal(b.chainHoldings.mutationCount,a.chainHoldings.mutationCount);
  assert.deepEqual(b.chainHoldings.first,a.chainHoldings.first);
});

test('auction acquisition and poison transfer are observed before item hooks',()=>{
  const G=game();
  const result=runOnce(G,(p,S,G)=>{
    S.players.slice(1).forEach(q=>q.ai=null);
    p.bag=[item(G,'boat')];
    const target=S.players[1]; target.bag=[item(G,'eye'),item(G,'bell')];
    S.market=[item(G,'buoy'),G.CURSES[0]];
    S.humanBids={0:[{amt:20,type:'yaming',intent:'keep'},{amt:20,type:'yaming',intent:'poison',target:1}]};
    G.resolveAuction();
  });
  assert.equal(first(result).phase,'auction.win');
  assert.equal(first(result,'eyes',1).phase,'auction.poison');
});

test('event gifts, transfers and forced curse use their real mutation entrances',()=>{
  const cases=[
    ['plague', (G,p,S)=>{p.bag=[item(G,'boat')];S.deck=[item(G,'buoy')];G.CFG.PLAGUE_NEED=1;G.EVENTS.plague.settle({players:[p],choices:{[p.id]:3},events:[]});},'water',0,'event.plague.gain'],
    ['zongzi', (G,p)=>{p.bag=[item(G,'eye'),item(G,'bell')];G.EVENTS.zongzi.settle({players:[p],choices:{[p.id]:3},events:[]});},'eyes',0,'event.zongzi.gain'],
    ['poe', (G,p,S)=>{p.bag=[item(G,'boat')];S.deck=[item(G,'buoy')];S.rng=()=>0;G.EVENTS.poe.settle({players:[p],choices:{[p.id]:5},events:[]});},'water',0,'event.poe.gain'],
    ['forced curse', (G,p,S)=>{p.bag=[item(G,'eye'),item(G,'bell')];S.unsoldCurses=[G.CURSES[0]];S.bidAny=new Set([1,2,3]);G.NIGHTRULES.shousui.hooks.onNightEndGlobal({log:[]});},'eyes',0,'rule.unsoldCurse.gain'],
  ];
  for(const [name,action,chain,seat,phase] of cases){
    const G=game();
    const result=runOnce(G,(p,S)=>action(G,p,S));
    assert.equal(first(result,chain,seat)?.phase,phase,name);
  }
});

test('hook transfer, pawn and wind observe each removal and receipt in order',()=>{
  const cases=[
    ['wangchuan', (G,p,S)=>{
      p.bag=[item(G,'eye'),item(G,'bell'),G.CURSES[0]];
      const q=S.players[1];q.life=99;q.bag=[item(G,'eye'),item(G,'bell')];
      S.players.slice(2).forEach(x=>x.life=1);
      G.ABILITIES.wangchuan.hooks.onWinItem({winner:p,item:item(G,'wangchuan'),target:null,events:[]});
    },[['eyes',0,'hook.wangchuan.lose',1],['eyes',1,'hook.wangchuan.gain',2]]],
    ['pawn', (G,p)=>{
      p.bag=[item(G,'eye'),item(G,'bell')];
      G.ROLES.dangpu.hooks.onBidSettle({p,cost:p.life+1,events:[]});
    },[['eyes',0,'pawn.enter',1]]],
    ['wind', (G,p,S)=>{
      const donor=S.players[1];
      p.bag=[item(G,'boat'),{n:'test low',f:'zuling',p:-100,ab:'junk'}];
      donor.bag=[item(G,'eye'),item(G,'bell'),{...item(G,'buoy'),p:-100}];
      G.EVENTS.wind.settle({players:[p,donor],choices:{[p.id]:'E',[donor.id]:'E'},events:[]});
    },[['eyes',1,'event.wind.lose',2],['water',0,'event.wind.gain',3]]],
  ];
  for(const [name,action,expected] of cases){
    const G=game();
    const result=runOnce(G,(p,S)=>action(G,p,S));
    for(const [chain,seat,phase,mutationSequence] of expected)
      assert.deepEqual(first(result,chain,seat),{round:1,phase,mutationSequence},name);
  }
});

test('shrine reward, award, release and actual endgame stripping are observed',()=>{
  const cases=[
    ['reward',(G,p)=>{p.bag=[item(G,'eye'),item(G,'bell')];G.CFG.INC_GIFT_P=100;G.shrineReward(p,10,10,'zuling');},'shrine.reward'],
    ['release',(G,p)=>{const legend={...G.LEGENDS[0]};p.bag=[item(G,'eye'),item(G,'bell'),legend];G.releaseLegend(p,legend,[],'test',false);},'shrine.release'],
  ];
  for(const [name,action,phase] of cases){
    const G=game();
    const result=runOnce(G,(p)=>action(G,p));
    assert.equal(first(result,'eyes',0)?.phase,phase,name);
  }
  const award=game();award.CFG.LEGEND_ON=true;
  const awarded=runOnce(award,(p,S,G)=>{
    p.bag=[item(G,'eye'),item(G,'bell')];
    G.awardLegend({taken:[]},p,0);
  });
  assert.equal(first(awarded,'eyes',0)?.phase,'shrine.award');

  const strip=game();strip.CFG.ROUNDS=1;
  const stripped=strip.playPolicyGame(1,{0:p=>{
    p.bag=[item(strip,'eye'),item(strip,'bell'),{n:'strip me',f:'curse',curse:true,endStrip:true}];
    return [];
  }},undefined,{recordChainHoldings:true});
  assert.equal(first(stripped,'eyes',0)?.phase,'endgame.strip');
});

test('off/on equivalence also holds with default event, rule, wish and shrine flags',()=>{
  for(const seed of [1,2,3]){
    const off=loadGame(TARGET),on=loadGame(TARGET);
    const a=off.playPolicyGame(seed,{});
    const b=on.playPolicyGame(seed,{},undefined,{recordChainHoldings:true});
    assert.ok(b.chainHoldings);
    delete b.chainHoldings;
    assert.equal(JSON.stringify(b),JSON.stringify(a),`full flags seed ${seed}`);
    assert.equal(on.S.rng(),off.S.rng(),`full flags next RNG seed ${seed}`);
  }
});

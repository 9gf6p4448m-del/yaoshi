import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from './tools/load.mjs';

const TARGET=process.env.POLICY_INFORMATION_TARGET||path.resolve(fileURLToPath(new URL('../index.html',import.meta.url)));
const item=(G,ab)=>({...G.POOL.find(x=>x.ab===ab)});
function game(){
  const G=loadGame(TARGET);
  G.CFG.WISH_ON=false; G.CFG.EVENT_ON=false; G.CFG.RULE_ON=false; G.CFG.LEGEND_ON=false;
  return G;
}
function observe(G,seed,configure){
  const seen=[];
  const policy=(p,ctx)=>{
    seen.push({round:G.S.round,ctx});
    return G.policySplitter(p);
  };
  policy.mark=p=>{ if(configure) configure(p,G,seen); return null; };
  const result=G.playPolicyGame(seed,{0:policy},undefined,{policyInformation:true});
  return {seen,result};
}

test('opt-in projects only legal preview and strips fourth item and raw state references',()=>{
  const G=game();
  const {seen}=observe(G,1,(p,G,seen)=>{
    if(seen.length) return;
    p.bag=[item(G,'eye'),item(G,'bell')];
    G.S.nextMarket=[item(G,'bow'),item(G,'boat'),item(G,'tiger'),item(G,'buoy')];
  });
  const ctx=seen[0].ctx;
  assert.equal(ctx.round,1);
  assert.equal(ctx.basePreviewCount,2);
  assert.equal(ctx.preview.length,3);
  assert.equal(ctx.preview[0].n,'射日神弓');
  assert.equal(ctx.preview.some(x=>x.n==='水鬼浮標'),false);
  assert.deepEqual(Object.keys(ctx).sort(),['basePreviewCount','preview','previousReveal','round']);
  assert.deepEqual(Object.keys(ctx.preview[0]).sort(),['ab','f','n','p']);
  assert.equal(ctx.previousReveal,null);
  assert.equal(Object.isFrozen(ctx),true);
  assert.equal(Object.isFrozen(ctx.preview),true);
  assert.equal(Object.isFrozen(ctx.preview[0]),true);
  assert.notEqual(ctx.preview[0],G.S.nextMarket[0]);
});

test('ordinary bell preview remains two when eyes effect is removed',()=>{
  const G=game();
  delete G.CHAINS.eyes.traits.preview;
  G.CHAINS.eyes.flags=[];
  const {seen}=observe(G,1,(p,G,seen)=>{
    if(seen.length) return;
    p.bag=[item(G,'eye'),item(G,'bell')];
    G.S.nextMarket=[item(G,'bow'),item(G,'boat'),item(G,'tiger')];
  });
  assert.equal(seen[0].ctx.basePreviewCount,2);
  assert.equal(seen[0].ctx.preview.length,2);
  G.S.players[0].bag=[item(G,'eye'),item(G,'bell')];
  assert.equal(G.eyesSecondBid(G.S.players[0],{showEntries:true,entries:[{amt:9},{amt:8}]}),null);
});

test('frozen context cannot mutate the original next-market item',()=>{
  const G=game();
  let name;
  const policy=(p,ctx)=>{
    name=G.S.nextMarket[0].n;
    assert.throws(()=>{ctx.preview[0].n='forged';},TypeError);
    assert.throws(()=>{ctx.preview.push({n:'forged'});},TypeError);
    assert.equal(G.S.nextMarket[0].n,name);
    return G.policySplitter(p);
  };
  G.playPolicyGame(1,{0:policy},undefined,{policyInformation:true});
  assert.ok(name);
});

test('first night is null; next night reveal freezes eligibility at reveal time',()=>{
  const G=game();
  const {seen}=observe(G,1,(p,G,seen)=>{
    if(!seen.length){
      p.bag=[item(G,'eye'),item(G,'bell')];
    }else if(seen.length===1){
      p.bag=[]; // Losing eyes after reveal cannot erase already legal memory.
    }
  });
  assert.equal(seen[0].ctx.previousReveal,null);
  assert.ok(seen.length>=2);
  const previous=seen[1].ctx.previousReveal;
  assert.equal(previous.round,1);
  assert.equal(Object.isFrozen(previous),true);
  assert.equal(Object.isFrozen(previous.items),true);
  assert.equal(previous.items.length,G.CFG.MARKET);
  assert.deepEqual(Object.keys(previous.items[0]).sort(),['name','secondBid']);
  assert.ok(previous.items.some(x=>x.secondBid!==null));
});

test('late acquisition cannot recover previous reveal, hidden entries and fewer than two bids yield null',()=>{
  const G=game();
  const {seen}=observe(G,1,(p,G,seen)=>{
    if(seen.length===1) p.bag=[item(G,'eye'),item(G,'bell')];
  });
  assert.equal(seen[1].ctx.previousReveal,null);
  const p=G.S.players[0]; p.bag=[item(G,'eye'),item(G,'bell')];
  assert.equal(G.eyesSecondBid(p,{showEntries:false,entries:[{amt:9},{amt:8}]}),null);
  assert.equal(G.eyesSecondBid(p,{showEntries:true,entries:[{amt:9}]}),null);
  assert.equal(G.eyesSecondBid(p,{showEntries:true,entries:[{amt:9},{amt:9},{amt:2}]}),9);
  G.CHAINS.eyes.flags=[];
  assert.equal(G.eyesSecondBid(p,{showEntries:true,entries:[{amt:9},{amt:8}]}),null);
});

test('default caller receives one argument and does not invoke reveal hook',()=>{
  const G=game();
  let calls=0, extra=false;
  G.CHAINS.eyes.hooks={onReveal(){throw new Error('unexpected reveal hook');}};
  const policy=function(p){calls++; extra ||= arguments.length!==1; return G.policySplitter(p);};
  policy.mark=p=>{p.bag=[item(G,'eye'),item(G,'bell')];return null;};
  G.playPolicyGame(1,{0:policy});
  assert.ok(calls>0);
  assert.equal(extra,false);
});

test('reveal visibility is per seat, and tied second bids keep the second entry amount',()=>{
  const G=game(); G.CFG.ROUNDS=2;
  const seen={0:[],1:[]};
  const bid=amt=>({amt,type:'cons',intent:'keep',target:null});
  const policies={};
  for(let id=0;id<4;id++) policies[id]=(p,ctx)=>{
    if(id<2) seen[id].push(ctx);
    return [id===3?null:bid(id===2?2:9)];
  };
  policies[0].mark=p=>{
    if(G.S.round!==1) return null;
    G.S.players.forEach(q=>{q.ai=null;q.life=100;q.alive=true;});
    G.S.players[0].bag=[item(G,'eye'),item(G,'bell')];
    G.S.players[1].bag=[item(G,'eye'),item(G,'bell')];
    G.S.players[1].roleId='hongyi';
    G.S.market=[item(G,'bow')];
    return null;
  };
  G.ROLES.hongyi.hooks.onReveal=ctx=>{ctx.showEntries=false;};
  G.playPolicyGame(1,policies,undefined,{policyInformation:true});
  assert.equal(seen[0][1].previousReveal.items[0].secondBid,9);
  assert.equal(seen[1][1].previousReveal.items[0].secondBid,null);
  assert.equal(seen[0][1].previousReveal.items[0].name,'射日神弓');
});

test('unrelated preview effect of four remains visible with or without eyes',()=>{
  const G=game();
  G.ABILITIES.bow.traits={preview:4};
  const {seen}=observe(G,1,(p,G,seen)=>{
    if(seen.length) return;
    p.bag=[item(G,'bow'),item(G,'eye'),item(G,'bell')];
    G.S.nextMarket=[item(G,'bow'),item(G,'boat'),item(G,'tiger'),item(G,'buoy')];
  });
  assert.equal(seen[0].ctx.basePreviewCount,4);
  assert.equal(seen[0].ctx.preview.length,4);
  assert.equal(seen[0].ctx.preview[3].n,'水鬼浮標');
});

test('ignored context preserves outcomes and next RNG over seeds 1–20',()=>{
  for(let seed=1;seed<=20;seed++){
    const off=game(),on=game();
    const policy=p=>off.policySplitter(p);
    const policyOn=p=>on.policySplitter(p);
    const a=off.playPolicyGame(seed,{0:policy});
    const b=on.playPolicyGame(seed,{0:policyOn},undefined,{policyInformation:true});
    assert.equal(JSON.stringify(b),JSON.stringify(a),`result seed ${seed}`);
    assert.equal(on.S.rng(),off.S.rng(),`RNG seed ${seed}`);
  }
});

test('callback failure and new game clear per-run reveal memory',()=>{
  const G=game();
  assert.throws(()=>G.playPolicyGame(1,{0:()=>{throw Error('policy failed');}},undefined,{policyInformation:true}),/policy failed/);
  const {seen}=observe(G,2);
  assert.equal(seen[0].ctx.previousReveal,null);
});

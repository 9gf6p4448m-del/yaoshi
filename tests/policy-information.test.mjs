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
    if(configure) configure(p,ctx,G,seen);
    seen.push({round:G.S.round,ctx});
    return G.policySplitter(p);
  };
  const result=G.playPolicyGame(seed,{0:policy},undefined,{policyInformation:true});
  return {seen,result};
}

test('opt-in projects only legal preview and strips fourth item and raw state references',()=>{
  const G=game();
  const {seen}=observe(G,1,(p,ctx,G,seen)=>{
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
  const {seen}=observe(G,1,(p,ctx,G,seen)=>{
    if(seen.length) return;
    p.bag=[item(G,'eye'),item(G,'bell')];
    G.S.nextMarket=[item(G,'bow'),item(G,'boat'),item(G,'tiger')];
  });
  assert.equal(seen[0].ctx.basePreviewCount,2);
  assert.equal(seen[0].ctx.preview.length,2);
});

test('first night is null; next night reveal freezes eligibility at reveal time',()=>{
  const G=game();
  let first;
  const {seen}=observe(G,1,(p,ctx,G,seen)=>{
    if(!seen.length){
      first=ctx;
      p.bag=[item(G,'eye'),item(G,'bell')];
    }else if(seen.length===1){
      p.bag=[]; // Losing eyes after reveal cannot erase already legal memory.
    }
  });
  assert.equal(first.previousReveal,null);
  assert.ok(seen.length>=2);
  const previous=seen[1].ctx.previousReveal;
  assert.equal(previous.round,1);
  assert.equal(Object.isFrozen(previous),true);
  assert.equal(Object.isFrozen(previous.items),true);
  assert.equal(previous.items.length,G.CFG.MARKET);
  assert.deepEqual(Object.keys(previous.items[0]).sort(),['name','secondBid']);
});

test('late acquisition cannot recover previous reveal, hidden entries and fewer than two bids yield null',()=>{
  const G=game();
  const {seen}=observe(G,1,(p,ctx,G,seen)=>{
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
  G.playPolicyGame(1,{0:function(p){calls++; extra ||= arguments.length!==1; return G.policySplitter(p);}});
  assert.ok(calls>0);
  assert.equal(extra,false);
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

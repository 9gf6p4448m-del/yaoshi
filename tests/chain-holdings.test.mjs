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

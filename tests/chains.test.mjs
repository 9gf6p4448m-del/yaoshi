import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from './tools/load.mjs';

const TARGET=path.resolve(fileURLToPath(new URL('../index.html',import.meta.url)));
const item=(G,ab)=>({...G.POOL.find(x=>x.ab===ab)});
const bid=(amt,intent='keep',target=null)=>({amt,type:'cons',intent,target});
function setup(role='human'){
  const G=loadGame(TARGET);
  G.CFG.WISH_ON=false; G.CFG.EVENT_ON=false; G.CFG.RULE_ON=false;
  G.makeState('solo',1);
  const S=G.S;
  S.players.forEach(p=>{p.ai=null;p.roleId='human';p.bag=[];p.life=40;p.alive=true;p.wish=null;p.grudge={};});
  S.players[0].roleId=role;
  S.market=[G.CURSES[0]];
  S.humanBids={0:[bid(4,'poison',1)]};
  return {G,S,target:S.players[1],attacker:S.players[0]};
}

test('水陸配方查詢純讀，雙件啟動、重複不疊加、缺件即失效',()=>{
  const {G,target}=setup();
  assert.equal(G.CHAINS.water.requirements.join(','),'boat,buoy');
  target.bag=[item(G,'boat'),item(G,'buoy'),item(G,'boat')];
  const before=JSON.stringify(target.bag);
  assert.deepEqual([...G.activeChains(target)].map(x=>x.id),['water']);
  assert.deepEqual([...G.chainsCompletedBy(target,'buoy')].map(x=>x.id),['water']);
  assert.equal(JSON.stringify(target.bag),before);
  assert.equal(G.collectEffects(target).filter(x=>x===G.CHAINS.water).length,1);
  target.bag=target.bag.filter(x=>x.ab!=='buoy');
  assert.equal(G.activeChains(target).length,0);
});

test('毒標遇有效水陸：付費得標、銷毀一次、未入袋、未算命中',()=>{
  const {G,S,target,attacker}=setup('zutou');
  target.bag=[item(G,'boat'),item(G,'buoy')];
  const life=attacker.life;
  const r=G.resolveAuction()[0];
  assert.equal(attacker.life,life-r.entries[0].cost);
  assert.equal(attacker._ztN,1);
  assert.equal(r.poisonBlocked,true);
  assert.equal(target.bag.some(x=>x.curse),false);
  assert.equal(S.wishNight.poisonHit[attacker.id],undefined);
  assert.equal(S.wishNight.poisonTargets[attacker.id],undefined);
  assert.equal(S.history.nights[0].auction[0].poisonBlocked,true);
});

test('缺材料時毒標照常入袋、命中與歷史不加阻擋欄',()=>{
  const {G,S,target,attacker}=setup();
  target.bag=[item(G,'boat')];
  const r=G.resolveAuction()[0];
  assert.equal(r.poisonBlocked,undefined);
  assert.equal(target.bag.some(x=>x.curse),true);
  assert.equal(S.wishNight.poisonHit[attacker.id],true);
  assert.equal(Object.hasOwn(S.history.nights[0].auction[0],'poisonBlocked'),false);
});

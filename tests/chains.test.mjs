import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from './tools/load.mjs';

const TARGET=process.env.CHAIN_TARGET||path.resolve(fileURLToPath(new URL('../index.html',import.meta.url)));
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
  assert.deepEqual([...G.chainsCompletedBy(target,item(G,'buoy'))].map(x=>x.id),[]);
  assert.equal(JSON.stringify(target.bag),before);
  assert.equal(G.collectEffects(target).filter(x=>x===G.CHAINS.water).length,1);
  target.bag=target.bag.filter(x=>x.ab!=='buoy');
  assert.equal(G.activeChains(target).length,0);
  assert.deepEqual(G.chainsCompletedBy(target,item(G,'buoy')).map(x=>x.id),['water']);
  assert.deepEqual(G.chainsCompletedBy(target,{...item(G,'buoy'),curse:true}),[]);
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

test('詛咒偽材料不啟動；已有詛咒不清除；自購詛咒沿用自保銷毀',()=>{
  const {G,S,target}=setup();
  target.bag=[item(G,'boat'),{...item(G,'buoy'),curse:true}];
  assert.equal(G.activeChains(target).length,0);
  const old=G.CURSES[1];
  target.bag=[item(G,'boat'),item(G,'buoy'),old];
  S.humanBids={1:[bid(4)]};
  const r=G.resolveAuction()[0];
  assert.equal(r.poisonBlocked,undefined);
  assert.equal(target.bag.includes(old),true);
  assert.equal(S.wishNight.destroyed[1],true);
});

test('同夜先補材料後毒標即擋；毒標先到不能追溯',()=>{
  for(const first of ['material','poison']){
    const {G,S,target}=setup();
    target.bag=[item(G,'boat')];
    S.market=first==='material'?[item(G,'buoy'),G.CURSES[0]]:[G.CURSES[0],item(G,'buoy')];
    S.humanBids={0:S.market.map(x=>x.curse?bid(4,'poison',1):null),1:S.market.map(x=>x.ab==='buoy'?bid(4):null)};
    const reveal=G.resolveAuction();
    assert.equal(reveal.find(r=>r.it.curse).poisonBlocked,first==='material'?true:undefined);
    assert.equal(target.bag.some(x=>x.ab==='buoy'),true);
    assert.equal(target.bag.some(x=>x.curse),first==='poison');
  }
});

test('阻擋時虎爺與紅衣受咒 hook 不發，大家樂仍計得標',()=>{
  const {G,S,target,attacker}=setup('zutou');
  target.roleId='hongyi';
  target.bag=[item(G,'boat'),item(G,'buoy'),item(G,'tiger')];
  const before=attacker.life, targetLife=target.life;
  const r=G.resolveAuction()[0];
  assert.equal(attacker.life,before-r.entries[0].cost);
  assert.equal(target.life,targetLife);
  assert.equal(target.grudge[attacker.id],undefined);
  assert.equal(attacker._ztN,1);
  assert.equal(r.events.length,1);
});

test('空 CHAINS 表決定性，trace seeds 1–20 重跑逐位元組相等',()=>{
  const a=loadGame(TARGET), b=loadGame(TARGET);
  for(const key of Object.keys(a.CHAINS)) delete a.CHAINS[key];
  for(const key of Object.keys(b.CHAINS)) delete b.CHAINS[key];
  const seeds=Array.from({length:20},(_,i)=>i+1);
  const x=JSON.stringify(a.trace(seeds));
  const y=JSON.stringify(b.trace(seeds));
  assert.equal(y,x);
});

test('道具、連鎖、角色與心願的收集層順序固定',()=>{
  const {G,target}=setup();
  target.roleId='hongyi';
  target.bag=[item(G,'boat'),item(G,'buoy')];
  const ordinary=G.collectEffects(target);
  assert.ok(ordinary.indexOf(G.ROLES.hongyi)<ordinary.indexOf(G.ABILITIES.boat));
  assert.ok(ordinary.indexOf(G.ABILITIES.buoy)<ordinary.indexOf(G.CHAINS.water));
  const night=G.collectEffects(target,'itemsFirst');
  assert.ok(night.indexOf(G.ABILITIES.buoy)<night.indexOf(G.CHAINS.water));
  assert.ok(night.indexOf(G.CHAINS.water)<night.indexOf(G.ROLES.hongyi));
});

test('王船或夜規直接送入詛咒時水陸不攔，既有物件仍在袋中',()=>{
  const {G,S,target,attacker}=setup();
  target.bag=[item(G,'boat'),item(G,'buoy')];
  const curse=G.CURSES[0];
  attacker.bag=[item(G,'wangchuan'),curse];
  S.players[2].life=1; S.players[3].life=1;
  G.applyHooks('onWinItem',{winner:attacker,item:item(G,'wangchuan'),target:null,events:[]},attacker);
  assert.equal(target.bag.includes(curse),true);
  assert.equal(G.activeChains(target).length,1);
  assert.equal(S.wishNight,undefined);
  assert.equal(attacker.bag.includes(curse),false);
});

test('被擋毒標不列入回顧命中與最狠一手，歷史仍留企圖目標',()=>{
  const {G,S,target}=setup();
  target.bag=[item(G,'boat'),item(G,'buoy')];
  G.resolveAuction();
  const row=S.history.nights[0].auction[0];
  assert.equal(row.targetId,target.id);
  assert.equal(row.poisonBlocked,true);
  assert.equal(G.reviewSummary().poison,0);
  assert.equal(G.ledgerNarrative(S.history,S.players).lines.some(x=>x.evRef?.type==='poison'),false);
});

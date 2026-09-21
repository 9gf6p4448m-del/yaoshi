import assert from 'node:assert/strict';
import {loadGame} from './tools/load.mjs';

const G=loadGame(process.env.CHAIN_TARGET||new URL('../index.html',import.meta.url).pathname.replace(/^\/(?=[A-Z]:)/,''));
const tiger=G.POOL.find(x=>x.ab==='tiger'), nail=G.POOL.find(x=>x.ab==='nail');
const other=G.POOL.find(x=>x.unit&&x.ab!=='tiger'&&x.ab!=='nail');
const team=a=>a.teams.map(t=>[t.ab,t.fac,t.units.length,t.units[0].atk,t.units[0].max,t.tr?.id]);
for(const bag of [[tiger,nail],[nail,tiger]]){
  const original=structuredClone(bag);
  const a=G.buildArmy(bag);
  assert.deepEqual(team(a),[['twinTiger','xianghuo',1,9,8,'twinTigerSweep']]);
  assert.equal(a.teams[0].tr.cleaveFull,true);
  assert.equal(a.teams[0].tr.armorPierce,true);
  assert.equal(G.pwArmyView({bag}).units[0].nm,'雙虎滅煞');
  assert.deepEqual(bag,original);
}
assert.deepEqual(team(G.buildArmy([other,tiger,nail,tiger,nail])),
  [[other.ab,other.f,other.unit.count,other.unit.atk,other.unit.hp,other.unit.trait],
   ['twinTiger','xianghuo',1,9,8,'twinTigerSweep'],
   ['tiger',tiger.f,1,7,4,'biteGamble'],['nail',nail.f,1,7,4,'eliteVsSwarm']]);
assert.deepEqual(team(G.buildArmy([tiger,{...nail,curse:true}])),team(G.buildArmy([tiger])));
assert.deepEqual(team(G.buildArmy([tiger])),[['tiger',tiger.f,1,7,4,'biteGamble']]);
const vacant=G.CHAINS.twinTiger;
delete G.CHAINS.twinTiger;
assert.deepEqual(team(G.buildArmy([tiger,nail])),[['tiger',tiger.f,1,7,4,'biteGamble'],['nail',nail.f,1,7,4,'eliteVsSwarm']]);
G.CHAINS.twinTiger=vacant;
assert.equal(G.TRAITS.twinTigerSweep.name,'橫掃・撕甲');
assert.equal(G.CHAINS.twinTiger.aiBonus,2);
assert.equal(G.TRAIT_ITEM.twinTigerSweep,'雙虎滅煞');
const P=(id,bag)=>({id,name:String(id),bag});
const armored={n:'甲',f:'zuling',ab:'armorTarget',unit:{body:'elite',count:1,atk:0,hp:100,trait:'eliteArmor'}};
const damage=(bag,target,beat=1)=>G.paperWar(P(0,bag),P(1,[target]),{rng:()=>0.5}).beats.find(e=>e.beat===beat&&e.side==='A'&&e.kind==='hit')?.amount;
assert.equal(damage([tiger,nail],armored),9);
assert.equal(damage([tiger],armored),5);
const pair={...armored,unit:{body:'elite',count:2,atk:0,hp:100}};
const pairHits=G.paperWar(P(0,[tiger,nail]),P(1,[pair]),{rng:()=>0.5}).beats.filter(e=>e.beat===1&&e.side==='A'&&['hit','splash'].includes(e.kind));
assert.deepEqual(pairHits.map(e=>e.amount),[9,9]);
const absorber={...armored,unit:{...armored.unit,trait:'wardAbsorb4'}};
assert.equal(damage([tiger,nail],absorber,2),5);
assert.equal(G.pwArmyView(P(0,[tiger,nail,other])).units.find(u=>u.ab===other.ab).nm,other.n);
assert.equal(G.unitRow(tiger).atk,7);
G.makeState('solo',1);
const preview=G.bagPreviewHTML(P(0,[tiger,nail,tiger,nail]));
assert.match(preview,/總攻 23・總血 16/);
assert.equal((preview.match(/雙虎滅煞/g)||[]).length,1);
// Reverse material order must preserve the actual army order in the bag preview.
const reversed=G.bagPreviewHTML(P(0,[nail,other,tiger]));
assert.ok(reversed.indexOf('雙虎滅煞')<reversed.indexOf(other.n),'fusion preview belongs at earliest material');

console.log('L1 tiger RED/GREEN assertions passed');

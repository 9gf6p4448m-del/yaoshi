import assert from 'node:assert/strict';
import {loadGame} from './tools/load.mjs';

const G=loadGame(new URL('../index.html',import.meta.url).pathname.replace(/^\/(?=[A-Z]:)/,''));
const tiger=G.POOL.find(x=>x.ab==='tiger'), nail=G.POOL.find(x=>x.ab==='nail');
const other=G.POOL.find(x=>x.unit&&x.ab!=='tiger'&&x.ab!=='nail');
const team=a=>a.teams.map(t=>[t.ab,t.fac,t.units.length,t.units[0].atk,t.units[0].max,t.tr?.id]);
for(const bag of [[tiger,nail],[nail,tiger]]){
  const a=G.buildArmy(bag);
  assert.deepEqual(team(a),[['twinTiger','xianghuo',1,9,8,'twinTigerSweep']]);
  assert.equal(a.teams[0].tr.cleaveFull,true);
  assert.equal(a.teams[0].tr.armorPierce,true);
  assert.equal(G.pwArmyView({bag}).units[0].nm,'雙虎滅煞');
  assert.deepEqual(bag,[bag[0],bag[1]]);
}
assert.deepEqual(team(G.buildArmy([other,tiger,nail,tiger,nail])),
  [[other.ab,other.f,other.unit.count,other.unit.atk,other.unit.hp,other.unit.trait],
   ['twinTiger','xianghuo',1,9,8,'twinTigerSweep'],
   ['tiger',tiger.f,1,7,4,'biteGamble'],['nail',nail.f,1,7,4,'eliteVsSwarm']]);
assert.deepEqual(team(G.buildArmy([tiger,{...nail,curse:true}])),team(G.buildArmy([tiger])));
assert.deepEqual(team(G.buildArmy([tiger])),[['tiger',tiger.f,1,7,4,'biteGamble']]);
assert.equal(G.TRAITS.twinTigerSweep.name,'橫掃・撕甲');
assert.equal(G.CHAINS.twinTiger.aiBonus,2);
assert.equal(G.TRAIT_ITEM.twinTigerSweep,'雙虎滅煞');
console.log('L1 tiger RED/GREEN assertions passed');

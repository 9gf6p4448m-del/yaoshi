import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { loadGame } from './tools/load.mjs';

const target=process.env.POWER_CANDIDATE || fileURLToPath(new URL('../index.html', import.meta.url));
const source=fs.readFileSync(target,'utf8');
const G=loadGame(target);
const clone=x=>JSON.parse(JSON.stringify(x));
const byAb=ab=>clone(G.POOL.find(x=>x.ab===ab));
const paperUnits=bag=>G.buildArmy(bag).teams.reduce((n,t)=>n+t.units.length,0);
function player(id,life,bag=[],roleId='human'){
  return {id,life,bag,roleId,name:`P${id}`,alive:true,ai:null,wish:null,grudge:{},spec:null,sacrificed:0,pawned:false};
}
function state(players){ G.makeState('solo',17); G.S.players=players; G.S.round=1; G.S.wonAny=new Set(); G.S.bidAny=new Set(); }

test('formal target selection uses highest life and stable seat order',()=>{
  const a=player(0,20), b=player(1,40), c=player(2,40);
  state([a,b,c]);
  assert.equal(G.highestLifeFoe(a),b);
  a.grudge={1:3,2:3};
  assert.equal(G.topGrudge(a),b);
  c.life=41;
  assert.equal(G.topGrudge(a),c);
});

test('Wangchuan sends the most recent curse to the highest-life foe',()=>{
  const old=clone(G.CURSES[0]), recent=clone(G.CURSES[1]), ship=byAb('wangchuan');
  const a=player(0,25,[old,ship,recent]), b=player(1,41), c=player(2,41);
  state([a,b,c]);
  G.applyHooks('onWinItem',{item:ship,winner:a,target:null,events:[]},a);
  assert.ok(a.bag.includes(old));
  assert.ok(!a.bag.includes(recent));
  assert.ok(b.bag.includes(recent));
  assert.ok(!c.bag.includes(recent));
});

test('retired power abilities do not modify formal power accounting',()=>{
  const curse=clone(G.CURSES[0]);
  for(const ab of ['sword','pojun','sigui','fushou']){
    const it=byAb(ab), base=player(0,5,[clone(curse)]), p=player(0,5,[clone(curse),it]);
    state([base,p]);
    assert.equal(G.power(p)-G.power(base),it.p,ab);
  }
  G.CFG.PAPERWAR_ON=false;
  const sword=byAb('sword'), base=player(0,20,[clone(G.CURSES[0])]), p=player(0,20,[clone(G.CURSES[0]),sword]); state([base,p]);
  assert.notEqual(G.power(p)-G.power(base),sword.p,'legacy keeps retired effect');
  G.CFG.PAPERWAR_ON=true;
});

test('hunter AI adds four only when pwTrial improves',()=>{
  const mine={n:'己方',f:'zuling',p:1,unit:{body:'ward',count:1,atk:1,hp:2}};
  const foe={n:'敵方',f:'yinqi',p:1,unit:{body:'ward',count:3,atk:1,hp:2}};
  const gain={n:'增援',f:'xianghuo',p:1,unit:{body:'elite',count:3,atk:9,hp:9}};
  const hunter=player(0,30,[mine],'hunter'), opponent=player(1,30,[foe]);
  state([hunter,opponent]);
  const before=G.pwTrial(hunter.bag,opponent.bag,G.S.round);
  const after=G.pwTrial([...hunter.bag,gain],opponent.bag,G.S.round);
  const ctx={p:hunter,item:gain,val:7}; G.applyHooks('onAiValue',ctx,hunter);
  assert.equal(ctx.val,7+(after>before?4:0));
});

test('hunter compares paper units and takes the largest non-curse troop team',()=>{
  const hunter=player(0,30,[{n:'小隊',f:'zuling',p:1,unit:{body:'ward',count:1,atk:1,hp:2}}],'hunter');
  const curse=clone(G.CURSES[0]);
  const small={n:'小物',f:'yinqi',p:99,unit:{body:'ward',count:1,atk:1,hp:2}};
  const large={n:'大隊',f:'xianghuo',p:1,unit:{body:'ward',count:4,atk:1,hp:2}};
  const foe=player(1,30,[curse,small,large]);
  state([hunter,foe]);
  const ctx={w:hunter,l:foe,pw:1,pl:4,war:{unitsA:1,unitsB:4},extra:[]};
  G.applyHooks('onBattle',ctx,[hunter,foe]);
  assert.ok(hunter.bag.includes(large));
  assert.ok(foe.bag.includes(curse));
  assert.ok(foe.bag.includes(small));
});

test('formal simulation and policy game never invoke power()',()=>{
  const probe=path.join(os.tmpdir(),`yaoshi-power-probe-${process.pid}.html`);
  fs.writeFileSync(probe,source.replace('function power(p){','function power(p){ throw new Error("formal power probe");'));
  try{
    const safe=loadGame(probe);
    safe.simulate(3);
    safe.playPolicyGame(4,{});
  }finally{ fs.rmSync(probe,{force:true}); }
});

test('formal battle records prebattle paper-unit counts without a raw-power context',()=>{
  const a=player(0,30,[{n:'甲隊',f:'zuling',p:99,unit:{body:'ward',count:1,atk:1,hp:2}}]);
  const b=player(1,30,[{n:'乙隊',f:'yinqi',p:0,unit:{body:'ward',count:3,atk:1,hp:1}}]);
  state([a,b]);
  const result=G.resolveBattles();
  assert.equal(result.fights.length,1);
  const f=result.fights[0];
  assert.equal(f.pa,paperUnits(a.bag));
  assert.equal(f.pb,paperUnits(b.bag));
  assert.ok(f.war);
  const body=source.slice(source.indexOf('function resolveBattles(){'),source.indexOf('function recordNightEnd'));
  const formal=body.slice(body.indexOf('if(CFG.PAPERWAR_ON)'),body.indexOf('}else{',body.indexOf('if(CFG.PAPERWAR_ON)')));
  assert.doesNotMatch(formal,/battlePower\(|power\(/);
});

test('active wishes and event descriptions use market prices rather than combat power',()=>{
  assert.doesNotMatch(G.WISHES.wish_bigfish.desc,/戰力/);
  assert.doesNotMatch(G.EVENTS.wind.desc(),/戰力/);
  assert.doesNotMatch(source,/桌上「戰力」另加|行情（戰力值）|法寶的<b>戰力/);
});

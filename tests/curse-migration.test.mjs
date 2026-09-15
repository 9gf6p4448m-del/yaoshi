import test from 'node:test';
import assert from 'node:assert/strict';
import {loadGame} from './tools/load.mjs';
const fresh=()=>loadGame(new URL('../index.html',import.meta.url));
const unit=(n,atk=6,hp=99,count=1)=>({n,f:'zuling',p:3,unit:{body:'swarm',count,atk,hp}});
const person=(id,bag,roleId='human')=>({id,name:'測試'+id,roleId,bag,alive:true,life:30});
const curse=(g,n)=>({...g.CURSES.find(x=>x.n===n)});
const fight=(g,bag,role='human')=>g.paperWar(person(0,bag,role),person(1,[unit('靶',0,999)]),{rng:()=>0.5,windId:null});
const hit=(war,beat)=>war.beats.find(x=>x.side==='A'&&x.beat===beat&&x.kind==='hit')?.amount;
test('non-lock curses no longer impose a shared attack penalty',()=>{
 const g=fresh(),clean=hit(fight(g,[unit('兵')]),1);
 for(const n of ['冥婚紅包','魔神仔的芭樂','抓交替水符','白虎煞'])assert.equal(hit(fight(g,[unit('兵'),curse(g,n)]),1),clean,n);
});
test('lock affects one strongest front unit only on beat one, stacks, and is cleansed',()=>{
 const g=fresh(),lock=curse(g,'縛靈鎖'),a=unit('兵'),base=fight(g,[a]);
 assert.equal(hit(fight(g,[a,lock]),1),hit(base,1)-2);
 assert.equal(hit(fight(g,[a,lock,lock]),1),hit(base,1)-4);
 assert.equal(hit(fight(g,[a,lock]),2),hit(base,2));
 assert.equal(hit(fight(g,[a,lock],'lvshan'),1),hit(base,1));
 const w=fight(g,[unit('雙兵',6,99,2),lock]);
 assert.equal(w.beats.filter(x=>x.side==='A'&&x.beat===1&&x.kind==='hit')[1].amount,7);
});
test('white tiger adds defeat loss only, before item mitigation, and respects cleansing',()=>{
 const g=fresh(),a=unit('弱',1,2),b=unit('強',40,99),c=curse(g,'白虎煞');
 const run=(bag,role)=>g.paperWar(person(0,bag,role),person(1,[b]),{rng:()=>0.5,windId:null});
 assert.equal(run([a,c]).dmg,run([a]).dmg+1);
 assert.equal(run([a,c,c]).dmg,run([a]).dmg+2);
 assert.equal(run([a,c],'lvshan').dmg,run([a]).dmg);
});
test('water talisman triggers once per battle, stacks damage without recursion',()=>{
 const g=fresh(),c=curse(g,'抓交替水符');
 const run=(bag,role)=>g.paperWar(person(0,bag,role),person(1,[unit('敵',3,99)]),{rng:()=>0.5,windId:null});
 const bag=[unit('紙',0,2,4),c,c];
 const events=run(bag).beats.filter(x=>x.kind==='curse'&&x.trId==='curseWater');
 assert.equal(events.length,1); assert.equal(events[0].amount,2);
 assert.equal(run(bag,'lvshan').beats.filter(x=>x.trId==='curseWater').length,0);
 assert.equal(run([unit('最後',0,1),c]).beats.filter(x=>x.trId==='curseWater').length,0);
});
test('event boat curse weakens one unit without killing it or lowering all attack',()=>{
 const g=fresh(),c={n:'王船煞',curse:true,p:-6,endStrip:true};
 const w=fight(g,[unit('兵'),c,c]);
 const e=w.beats.filter(x=>x.trId==='curseBoat');assert.equal(e.length,1);assert.equal(e[0].amount,2);
 assert.equal(hit(w,1),hit(fight(g,[unit('兵')]),1));
 assert.equal(fight(g,[unit('兵'),c],'lvshan').beats.filter(x=>x.trId==='curseBoat').length,0);
});
test('wedding gift is charged at night end only after winning an auction, guava is unconditional',()=>{
 const run=(won,role='human')=>{const g=fresh();g.makeState('solo',1,['qingmian']);g.S.players.forEach((p,i)=>{p.alive=i===0;p.bag=[];});const p=g.S.players[0];p.roleId=role;p.life=20;p.bag=[curse(g,'冥婚紅包'),curse(g,'冥婚紅包'),curse(g,'魔神仔的芭樂')];g.CFG.NIGHT_REGEN=0;if(won)g.S.wonAny.add(p.id);const result=g.resolveBattles();return{life:p.life,result};};
 assert.equal(run(false).life,19);assert.equal(run(true).life,17);assert.equal(run(true,'lvshan').life,17);
});

test('cleansed army summary still discloses wedding and guava costs',()=>{
 const g=fresh(),v=g.pwArmyView(person(0,[unit('兵'),curse(g,'冥婚紅包'),curse(g,'魔神仔的芭樂'),curse(g,'縛靈鎖')],'lvshan'));
 const text=g.pwCompText(v);assert.match(text,/戰鬥詛咒已淨化 1/);assert.match(text,/禮金／侵蝕 2（不免除）/);
});
test('white tiger does not penalize its holder for winning or drawing',()=>{
 const g=fresh(),c=curse(g,'白虎煞'),strong=unit('強',40,99),weak=unit('弱',1,2);
 const clean=g.paperWar(person(0,[strong]),person(1,[weak]),{rng:()=>0.5});
 const cursed=g.paperWar(person(0,[strong,c]),person(1,[weak]),{rng:()=>0.5});
 assert.equal(cursed.winner.id,0);assert.equal(cursed.dmg,clean.dmg);
 const draw=g.paperWar(person(0,[strong,c]),person(1,[strong]),{rng:()=>0.5});assert.equal(draw.dmg,0);
});

test('curse feedback targets its holder and distinguishes attack reduction from health loss',()=>{
 const g=fresh();
 const lock=g.pwCurseFeedback({kind:'curse',trId:'curseLock',side:'A',target:2,amount:4});
 assert.equal(lock.side,'A');assert.equal(lock.healthLoss,false);assert.equal(lock.text,'攻擊 −4');
 for(const trId of ['curseWater','curseBoat']){const f=g.pwCurseFeedback({kind:'curse',trId,side:'B',target:1,amount:2});assert.equal(f.side,'B');assert.equal(f.healthLoss,true);assert.equal(f.text,'血量 −2');}
});

test('water waits for simultaneous damage settlement and cannot target an already doomed last ally',()=>{
 const g=fresh(),c=curse(g,'抓交替水符');
 const war=g.paperWar(person(0,[unit('紙',0,1,2),c]),person(1,[unit('敵',3,99,2)]),{rng:()=>0.5});
 assert.equal(war.aliveA,0);assert.equal(war.beats.filter(x=>x.trId==='curseWater').length,0);
});

test('unregistered curse events cannot impersonate health damage',()=>{
 const g=fresh(),f=g.pwCurseFeedback({kind:'curse',trId:'unknown',side:'A',target:0,amount:99});
 assert.equal(f.healthLoss,false);assert.equal(f.text,'效果未登錄');
});

test('water selects the actual survivor after two allies die in one settlement batch',()=>{
 const g=fresh(),c=curse(g,'抓交替水符');
 const enemy=unit('敵護法',3,999,2);enemy.unit.body='ward';
 const war=g.paperWar(person(0,[unit('薄紙',0,1,2),unit('厚紙',0,99),c]),person(1,[enemy]),{rng:()=>0.5});
 const events=war.beats.filter(x=>x.trId==='curseWater');assert.equal(events.length,1);assert.equal(events[0].target,2);assert.equal(events[0].amount,1);
});

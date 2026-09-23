import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadGame} from './tools/load.mjs';

const fresh=(chase=false)=>{
  const g=loadGame(new URL('../index.html',import.meta.url));
  g.makeState('solo',10,['qingmian'],['water','water','eyes','godKing'],'off',chase);
  g.CFG.PAPERWAR_ON=false;g.CFG.MARK_ON=false;
  g.CFG.AI_THROTTLE=1;g.CFG.AI_IDLE_P=0;
  return g;
};
const item=(g,ab)=>({...g.POOL.find(x=>x.ab===ab)});

test('AI destiny pursuit adds two only to its own missing recipe items above the life floor',()=>{
  const g=fresh(true),p=g.S.players[1];
  assert.equal(g.destinyChaseBonus(p,item(g,'boat')),2);
  assert.equal(g.destinyChaseBonus(p,item(g,'buoy')),2);
  assert.equal(g.destinyChaseBonus(p,item(g,'bow')),0);
  p.bag=[item(g,'boat')];
  assert.equal(g.destinyChaseBonus(p,item(g,'boat')),0,'duplicate material is not a new ingredient');
  assert.equal(g.destinyChaseBonus(p,item(g,'buoy')),2);
  p.life=17;
  assert.equal(g.destinyChaseBonus(p,item(g,'buoy')),0,'pursuit stops below 18 life');
  g.S.destinyAiChase=false;p.life=40;
  assert.equal(g.destinyChaseBonus(p,item(g,'buoy')),0,'ordinary AI-off arm stays disabled');
});

test('AI actual bid rises by exactly two for a missing destiny material',()=>{
  const run=chase=>{
    const g=fresh(chase),p=g.S.players[1];
    p.life=40;p.bag=[];p.ai={aggr:1,spite:0};p.roleId='human';
    g.S.market=[item(g,'boat')];
    return g.aiBids(p)[0].amt;
  };
  assert.equal(run(true)-run(false),2);
});

test('AI plans with actual water-free, ordinary, and tiger-marked entry fees',()=>{
  const run=kind=>{
    const g=fresh(false),p=g.S.players[1],q=g.S.players[0];
    p.life=10;p.ai={aggr:100,spite:0};p.roleId='human';
    p.bag=kind==='water'?['boat','buoy'].map(ab=>item(g,ab)):[];
    q.bag=kind==='tiger'?['tiger','nail'].map(ab=>item(g,ab)):[];
    g.S.market=[item(g,'bow')];
    g.CFG.MARK_ON=kind==='tiger';g.S.marks=kind==='tiger'?{0:0}:{};
    return g.aiBids(p)[0].amt;
  };
  assert.equal(run('water'),10);
  assert.equal(run('plain'),9);
  assert.equal(run('tiger'),8);
});

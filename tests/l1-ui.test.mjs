import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from './tools/load.mjs';

const G=()=>loadGame(path.resolve(fileURLToPath(new URL('../index.html',import.meta.url))));
const item=(g,ab)=>({...g.POOL.find(x=>x.ab===ab)});

test('water and eyes recipes, preview maximum, and duplicate completion',()=>{
  const g=G(),p={bag:[item(g,'eye')]};
  assert.equal(g.CHAINS.water.aiBonus,2);
  assert.equal(g.CHAINS.eyes.requirements.join(','),'eye,bell');
  assert.equal(g.chainsCompletedBy(p,item(g,'bell'))[0].id,'eyes');
  p.bag.push(item(g,'bell'));
  assert.equal(g.traitMax(p,'preview',1),3);
  assert.deepEqual(g.chainsCompletedBy(p,item(g,'bell')),[]);
});

test('second bid counts tied raw entries and suppresses hidden or short reveal',()=>{
  const g=G(), eyes={bag:[item(g,'eye'),item(g,'bell')]};
  assert.equal(g.eyesSecondBid(eyes,{showEntries:true,entries:[{amt:8},{amt:8},{amt:4}]}),8);
  assert.equal(g.eyesSecondBid(eyes,{showEntries:true,entries:[{amt:8}]}),null);
  assert.equal(g.eyesSecondBid(eyes,{showEntries:false,entries:[{amt:8},{amt:5}]}),null);
  assert.equal(g.eyesSecondBid({bag:[]},{showEntries:true,entries:[{amt:8},{amt:5}]}),null);
});

test('viewer gate only permits active human at private market',()=>{
  const g=G();g.makeState('hotseat',1);const s=g.S;
  s.players[0].ai=null;s.players[1].ai=null;
  assert.equal(g.canViewPrivateBag(0,0,'market'),true);
  assert.equal(g.canViewPrivateBag(1,0,'market'),false);
  assert.equal(g.canViewPrivateBag(0,0,'handoff'),false);
  assert.equal(g.canViewPrivateBag(0,0,'reveal'),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from './tools/load.mjs';
import {createChaser, disableChainEffects, summarize, comparePaired, runExperiment, parseCli} from './tools/l1-balance.mjs';

const target=path.resolve(fileURLToPath(new URL('../index.html',import.meta.url)));
const game=()=>loadGame(target);
const bid=(amt=2)=>({amt,type:'cons',intent:'keep',target:null});
function fixture(G,bag,market,baseBids,life=30){
  G.makeState('solo',1,['qingmian']);
  const p=G.S.players[0]; p.bag=bag.map(ab=>({ab,curse:false})); p.life=life;
  G.S.market=market.map(ab=>({ab,curse:false,p:4}));
  G.POLICIES.splitter=()=>baseBids;
  return p;
}

test('chaser prefers completion, then missing material, keeps original bids by index',()=>{
  const G=game(); const p=fixture(G,['boat'],['eye','buoy','bell'],[bid(),bid(),bid()]);
  const got=createChaser(G,'water')(p);
  assert.ok(got[1].amt>0);
  assert.equal(got[0].amt,2);
  assert.equal(got[2].amt,0);
  assert.equal(got[1].type,'cons');
});

test('one target per night: two missing materials and duplicate offers use first market index',()=>{
  const G=game();
  let p=fixture(G,[],['buoy','boat','eye'],[bid(2),bid(2),bid(2)],30);
  assert.deepEqual(createChaser(G,'water')(p).map(x=>x.amt),[4,2,0]);
  p=fixture(G,['boat'],['buoy','buoy','eye'],[bid(2),bid(2),bid(2)],30);
  assert.deepEqual(createChaser(G,'water')(p).map(x=>x.amt),[4,2,0]);
});

test('chaser leaves splitter untouched when complete or no material available',()=>{
  const G=game();const base=[bid(2),bid(2)];
  let p=fixture(G,['boat','buoy'],['eye','bell'],base);
  assert.equal(createChaser(G,'water')(p),base);
  p=fixture(G,[],['eye','bell'],base);
  assert.equal(createChaser(G,'water')(p),base);
});

test('chaser respects conservative cap, full fee budget and maximum bid count',()=>{
  const G=game(); const p=fixture(G,[],['boat','buoy','eye'],[bid(2),bid(2),bid(2)],18);
  const got=createChaser(G,'water')(p);
  const active=got.filter(x=>x?.amt>0);
  assert.ok(active.length<=G.CFG.MAX_BIDS);
  assert.ok(active.every(x=>x.type==='cons'&&x.amt<=G.consCapFor(p)));
  assert.ok(active.reduce((s,x)=>s+x.amt+G.CFG.BID_FEE,0)<=G.budgetFor(p));
  assert.deepEqual(got.map(x=>x.amt),[3,2,0]);
  G.budgetFor=()=>6;
  assert.deepEqual(createChaser(G,'water')(p).map(x=>x.amt),[3,1,0]);
});

test('chaser cannot inspect private opponents or future market',()=>{
  const G=game();const p=fixture(G,['boat'],['buoy'],[bid()]);
  Object.defineProperty(G.S,'nextMarket',{get(){throw Error('future leak');}});
  for(let i=1;i<G.S.players.length;i++) Object.defineProperty(G.S.players[i],'bag',{get(){throw Error('private leak');}});
  assert.ok(createChaser(G,'water')(p)[0].amt>0);
});

test('zero arm preserves recipe identity and bonus, removes only effects',()=>{
  for(const id of ['water','eyes','twinTiger']){
    const G=game();const before=structuredClone(G.CHAINS);
    disableChainEffects(G,id);
    const {traits,flags,hooks,army,...expected}=before[id];
    assert.deepEqual(G.CHAINS[id],expected);
    for(const other of ['water','eyes','twinTiger'].filter(x=>x!==id))
      assert.deepEqual(G.CHAINS[other],before[other]);
  }
});

test('summary uses full-game and holder denominators, including null zero cases',()=>{
  const rows=[{seed:1,winnerId:0,holder:true},{seed:2,winnerId:1,holder:false}];
  assert.deepEqual(summarize(rows,'water'),{id:'water',games:2,wins:1,winRate:0.5,holders:1,holderWins:1,holderWinRate:1});
  assert.equal(summarize([{seed:1,winnerId:1,holder:false}],'water').holderWinRate,null);
  assert.equal(summarize([],'water').winRate,null);
});

test('matched pairs align by seed and reject duplicates or missing seeds',()=>{
  const a=[{seed:2,winnerId:0},{seed:1,winnerId:1}];
  const b=[{seed:1,winnerId:0},{seed:2,winnerId:1}];
  assert.equal(comparePaired(a,b).winDiffPp,0);
  assert.equal(comparePaired([{seed:1,winnerId:0},{seed:2,winnerId:0}],
    [{seed:2,winnerId:0},{seed:1,winnerId:1}]).winDiffPp,50);
  const plus=comparePaired([{seed:1,winnerId:0},{seed:2,winnerId:0},{seed:3,winnerId:1}],
    [{seed:3,winnerId:1},{seed:1,winnerId:1},{seed:2,winnerId:1}]);
  assert.ok(Math.abs(plus.winDiffPp-200/3)<1e-10);
  const minus=comparePaired([{seed:1,winnerId:1},{seed:2,winnerId:1},{seed:3,winnerId:1}],
    [{seed:2,winnerId:0},{seed:3,winnerId:1},{seed:1,winnerId:0}]);
  assert.ok(Math.abs(minus.winDiffPp+200/3)<1e-10);
  assert.throws(()=>comparePaired(a,[b[0]]),/missing|seed/i);
  assert.throws(()=>comparePaired(a,[b[0],b[0]]),/duplicate/i);
});

test('real engine seven arms replay identically and carry raw metadata',()=>{
  const a=runExperiment({target,seeds:[1,2]});
  const b=runExperiment({target,seeds:[1,2]});
  assert.deepEqual(a,b);
  assert.equal(a.rows.length,14);
  assert.equal(new Set(a.rows.map(x=>x.arm)).size,7);
  assert.ok(a.rows.every(x=>x.seed>0&&x.gameLength>0&&x.roles[0]==='qingmian'&&Array.isArray(x.endBagChainIds)));
  assert.equal(a.formalStatus,'incomplete');
  assert.ok(a.sourceSha256&&a.toolSha256&&a.gitHead&&a.cfg);
  assert.equal(a.limitations.zeroEffectScope,'shared target CHAINS entry; all four seats');
  for(const id of ['water','eyes','twinTiger']){
    const normal=a.rows.filter(r=>r.arm===`${id}-normal`);
    const zero=a.rows.filter(r=>r.arm===`${id}-zero`);
    assert.deepEqual(a.pairedNormalVsZero[id].winDiffPp,comparePaired(normal,zero).winDiffPp);
    assert.equal(a.pairedNormalVsZero[id].conditionalHolderDiffIsCausal,false);
  }
});

test('input and CLI reject nonpositive, duplicate or malformed samples',()=>{
  assert.throws(()=>runExperiment({target,seeds:[1,1]}),/duplicate/i);
  assert.throws(()=>runExperiment({target,seeds:[0]}),/positive/i);
  assert.throws(()=>parseCli(['--n','0']),/positive/i);
  assert.throws(()=>parseCli(['--n','foo']),/positive/i);
  assert.throws(()=>parseCli(['--bogus']),/unknown/i);
});

test('untargeted splitter holder fields are not measured, never zero attainment',()=>{
  const s=summarize([{seed:1,winnerId:0,holder:null,endBagChainIds:[['water']]}],'splitter');
  assert.equal(s.targetChain,null);
  assert.equal(s.holders,null);
  assert.equal(s.holderWins,null);
  assert.equal(s.holderWinRate,null);
  assert.equal(s.wins,1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from './tools/load.mjs';
import {
  planEyesBids, blindLegalContext, createEyesPolicy,
  summarizeArm, comparePaired, runExperiment, parseCli,
} from './tools/l1-information.mjs';

const target=path.resolve(fileURLToPath(new URL('../index.html',import.meta.url)));
const bid=(amt=2)=>({amt,type:'cons',intent:'keep',target:null});
const market=(name,p,curse=false)=>({n:name,p,curse,ab:name});
const input=(overrides={})=>({baseBids:[bid(),bid(),bid()],market:[market('A',4),market('B',5),market('C',3)],cap:8,budget:30,fee:1,maxBids:2,
  legalContext:{round:2,preview:[market('P',4),market('Q',3)],basePreviewCount:1,previousReveal:null},...overrides});

test('highest noncurse market item wins tie by index, and a curse cannot be target',()=>{
  const got=planEyesBids(input({market:[market('A',5,true),market('B',5),market('C',5)]}));
  assert.deepEqual(got.map(x=>x.amt),[2,2,0]);
  assert.equal(got[1].amt,2);
  const changed=planEyesBids(input({market:[market('A',3),market('B',5),market('C',5)],
    legalContext:{previousReveal:{round:1,items:[{name:'B',secondBid:4}]},preview:[],basePreviewCount:0}}));
  assert.deepEqual(changed.map(x=>x.amt),[2,4,0]);
});

test('largest legal second bid changes the next bid, bounded to base plus two and cap',()=>{
  const previousReveal={round:1,items:[{name:'unrelated',secondBid:99},{name:'B',secondBid:1}]};
  const info=input({legalContext:{preview:[],basePreviewCount:0,previousReveal}});
  assert.deepEqual(planEyesBids(info).map(x=>x.amt),[2,4,0]);
  assert.deepEqual(planEyesBids({...info,cap:3}).map(x=>x.amt),[2,3,0]);
  assert.deepEqual(planEyesBids({...info,legalContext:{...info.legalContext,previousReveal:null}}).map(x=>x.amt),[2,2,0]);
});

test('third legal preview reserves two when its value exceeds tonight best',()=>{
  const base=input({budget:8,maxBids:3,legalContext:{round:2,basePreviewCount:2,
    preview:[market('A',1),market('B',2),market('C',6)] ,previousReveal:null}});
  assert.deepEqual(planEyesBids(base).map(x=>x.amt),[2,2,0]);
  assert.deepEqual(planEyesBids({...base,legalContext:blindLegalContext(base.legalContext)}).map(x=>x.amt),[2,2,1]);
  const legalFourth={...base,legalContext:{...base.legalContext,preview:[market('A',1),market('B',2),market('C',4),market('D',99)]}};
  assert.deepEqual(planEyesBids(legalFourth).map(x=>x.amt),[2,2,0]);
});

test('fee, budget, max bids, empty market and null context are deterministic for both arms',()=>{
  const x=input({budget:7,fee:2,maxBids:2,legalContext:null});
  assert.deepEqual(planEyesBids(x).map(y=>y.amt),[1,2,0]);
  assert.deepEqual(planEyesBids({...x,legalContext:{preview:[],basePreviewCount:0,previousReveal:null}}),planEyesBids(x));
  assert.deepEqual(planEyesBids({...x,market:[],baseBids:[]}),[]);
  assert.deepEqual(planEyesBids({...x,cap:0,budget:0}).map(y=>y.amt),[0,0,0]);
});

test('blind adapter exposes only base preview and removes reveal, preserving original base count',()=>{
  const ctx={round:2,preview:[market('A',1),market('B',2),market('C',9)],basePreviewCount:2,
    previousReveal:{round:1,items:[{name:'B',secondBid:8}]}};
  assert.deepEqual(blindLegalContext(ctx),{...ctx,preview:ctx.preview.slice(0,2),previousReveal:null});
  assert.equal(ctx.preview.length,3);
  assert.ok(ctx.previousReveal);
  const four={...ctx,basePreviewCount:4,preview:[market('A',1),market('B',2),market('C',3),market('D',99)],previousReveal:null};
  assert.equal(blindLegalContext(four).preview.length,4);
  const informed=planEyesBids(input({budget:8,maxBids:3,legalContext:four})).map(x=>x.amt);
  const blind=planEyesBids(input({budget:8,maxBids:3,legalContext:blindLegalContext(four)})).map(x=>x.amt);
  assert.deepEqual(informed,[2,2,0]);
  assert.deepEqual(blind,informed);
  assert.deepEqual(planEyesBids(input({budget:8,maxBids:3,legalContext:{...four,preview:four.preview.slice(0,3)}})).map(x=>x.amt),[2,2,1]);
});

test('policy adapter still consumes information when recipe is already complete, without private reads',()=>{
  const G=loadGame(target);
  G.makeState('solo',1,['qingmian']);
  const p=G.S.players[0];
  p.bag=[{ab:'eye',curse:false},{ab:'bell',curse:false}];
  G.S.market=[market('A',3),market('B',5),market('C',2)];
  G.POLICIES.splitter=()=>[bid(),bid(),bid()];
  Object.defineProperty(G.S,'nextMarket',{get(){throw Error('future leak');}});
  Object.defineProperty(G.S,'humanBids',{get(){throw Error('hidden current bids leak');}});
  for(const q of G.S.players.slice(1)) Object.defineProperty(q,'bag',{get(){throw Error('private leak');}});
  const ctx={round:2,preview:[],basePreviewCount:0,previousReveal:{round:1,items:[{name:'B',secondBid:8}]}};
  const a=createEyesPolicy(G,'informed')(p,ctx);
  const b=createEyesPolicy(G,'blind')(p,ctx);
  assert.ok(a[1].amt>b[1].amt);
});

test('paired whole-game and separate ever-held denominators remain distinct',()=>{
  const a=[{seed:1,winnerId:0,eyesHolders:[0]},{seed:2,winnerId:1,eyesHolders:[1]}];
  const b=[{seed:2,winnerId:0,eyesHolders:[]},{seed:1,winnerId:1,eyesHolders:[0]}];
  assert.equal(comparePaired(a,b).winDiffPp,0);
  assert.deepEqual(summarizeArm(a,'a'),{arm:'a',games:2,wins:1,winRate:0.5,everHeldGames:2,everHeldWinnerGames:2,everHeldWinnerRate:1});
  assert.equal(summarizeArm(b,'b').everHeldWinnerRate,0);
  assert.equal(summarizeArm([{seed:1,winnerId:0,eyesHolders:[]}],'c').everHeldWinnerRate,null);
  assert.throws(()=>comparePaired(a,b.slice(1)),/missing/i);
});

test('real engine three arms replay, retain raw provenance and report incomplete status',()=>{
  const a=runExperiment({target,seeds:[1,2]});
  const b=runExperiment({target,seeds:[1,2]});
  assert.deepEqual(a,b);
  assert.equal(a.rows.length,6);
  assert.deepEqual(a.arms,['informed-normal','increment-blind-normal','informed-zero']);
  assert.ok(a.rows.every(r=>r.roles[0]==='qingmian'&&Array.isArray(r.eyesHolders)&&r.policyDecisions));
  assert.equal(a.formalH1Status,'incomplete');
  assert.equal(a.formalH9Status,'incomplete');
  assert.ok(a.sourceSha256&&a.toolSha256&&a.gitHead);
  assert.equal(a.decisionSummary['informed-normal'].calls,
    a.rows.filter(r=>r.arm==='informed-normal').reduce((sum,r)=>sum+r.policyDecisions.calls,0));
});

test('CLI sample validation',()=>{
  assert.equal(parseCli([]).n,20);
  assert.throws(()=>parseCli(['--n','0']),/positive/i);
  assert.throws(()=>parseCli(['--unknown']),/unknown/i);
  assert.throws(()=>runExperiment({target,seeds:[1,1]}),/duplicate/i);
});

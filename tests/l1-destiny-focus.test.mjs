import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from './tools/load.mjs';
import {createChaser} from './tools/l1-balance.mjs';
import {instrumentFocusSource,canonicalCheckpoint,trueEventCounts,focusGateStatus} from './tools/l1-destiny-focus.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const PRODUCT=path.join(ROOT,'index.html');
const text=fs.readFileSync(PRODUCT,'utf8');
const instrumented=instrumentFocusSource(text);
const draws=['godKing','godKing','godKing','godKing'];

function runner(source,mode,focus=null,expectedCheckpoint=null){
  const checkpoints=new Map();
  const storage={getItem(){return null;},setItem(){},__focus:focus,__checkpoint(event,state,frame){
    if(focus&&(event.pid!==focus.pid||event.chainId!==focus.chainId)) return;
    const payload=canonicalCheckpoint(state,frame,storage.__runnerFrame());
    if(mode!=='off'){
      assert.equal(payload,expectedCheckpoint,'checkpoint must match before intervention');
      assert.equal(state.destinyEffectMode,'off');
    }
    checkpoints.set(event.pid+':'+event.chainId,{payload,round:state.round});
    if(mode!=='off') state.destinyEffectMode=mode;
  }};
  const G=loadGame(PRODUCT,{sourceText:source,storage});
  const policy=createChaser(G,'godKing');
  const result=G.playPolicyGame(10002,{0:policy},['qingmian'],{
    trueEffects:'off',destinyAiChase:false,privateDestinyDraws:draws,
    recordDestinyEvidence:true,recordChainHoldings:true,policyInformation:true
  });
  return {G,result,checkpoints};
}

test('focus instrumentation leaves an ordinary game and both RNG streams unchanged',()=>{
  const original=runner(text,'off');
  const transformed=runner(instrumented,'off');
  assert.equal(transformed.result.winnerId,original.result.winnerId);
  assert.deepEqual(transformed.result.finalLife,original.result.finalLife);
  assert.deepEqual(transformed.result.lifeByRound,original.result.lifeByRound);
  assert.deepEqual(transformed.result.destinyNights,original.result.destinyNights);
  assert.equal(transformed.G.S.rng(),original.G.S.rng());
  assert.equal(transformed.G.S.rngUi(),original.G.S.rngUi());
});

test('focus replay forks at an identical complete checkpoint and isolates other seats',()=>{
  const control=runner(instrumented,'off');
  const selected=[...control.checkpoints.keys()].find(k=>k.startsWith('0:'))||
    [...control.checkpoints.keys()][0];
  assert.ok(selected,'synthetic game must contain a focus awakening');
  const [pid,chainId]=selected.split(':');
  const focus={pid:Number(pid),chainId};
  const expected=control.checkpoints.get(selected);
  const original=runner(instrumented,'original',focus,expected.payload);
  const candidate=runner(instrumented,'candidate',focus,expected.payload);
  assert.deepEqual(original.checkpoints.get(selected),expected);
  assert.deepEqual(candidate.checkpoints.get(selected),expected);
  for(const run of [original,candidate]) for(const night of run.result.destinyNights){
    assert.ok(night.dayEvents.every(e=>e.pid===focus.pid));
    assert.ok(night.fights.every(f=>f.trueEvents.every(e=>e.pid===focus.pid)));
  }
});

test('checkpoint equality includes treatment mode, RNG state and object identity',()=>{
  function rng(n){const f=()=>0;f.getState=()=>n;return f;}
  const player={life:20},bag=[player];
  const state={destinyEffectMode:'off',rng:rng(3),rngUi:rng(9),players:[player],bag};
  const frame={winner:player};
  const a=canonicalCheckpoint(state,frame,{previousReveal:[]});
  assert.notEqual(a,canonicalCheckpoint({...state,destinyEffectMode:'original'},frame,{previousReveal:[]}));
  assert.notEqual(a,canonicalCheckpoint({...state,rng:rng(4)},frame,{previousReveal:[]}));
  assert.notEqual(a,canonicalCheckpoint(state,{winner:{life:20}},{previousReveal:[]}));
  assert.notEqual(a,canonicalCheckpoint(state,frame,{previousReveal:[{secondBid:3}]}));
});

test('checkpoint mismatch aborts before focus intervention',()=>{
  const control=runner(instrumented,'off');
  const selected=[...control.checkpoints.keys()][0];
  assert.ok(selected);
  const [pid,chainId]=selected.split(':');
  assert.throws(()=>runner(instrumented,'original',{pid:Number(pid),chainId},'tampered'),
    /checkpoint must match/);
});

test('focus transform rejects drift in product anchors',()=>{
  assert.throws(()=>instrumentFocusSource(text.replace('function mulberry32(a){','function changedRng(a){')),
    /anchor mismatch/);
});


test('tiger loser event is attributed to its true-effect source chain',()=>{
  const result={destinyNights:[{dayEvents:[{pid:0,chainId:'twinTiger',kind:'losePenalty'}],fights:[]}]};
  assert.equal(trueEventCounts(result,{pid:2,chainId:'twinTiger'}),1);
  assert.throws(()=>trueEventCounts(result,{pid:2,chainId:'water'}),/other chain/);
});

test('focus gate requires the frozen sample and a distinct true event',()=>{
  assert.equal(focusGateStatus([4,6],299,10),'incomplete');
  assert.equal(focusGateStatus([4,6],300,0),'fail');
  assert.equal(focusGateStatus([3,10],300,1),'pass');
  assert.equal(focusGateStatus([0,2],300,1),'fail');
  assert.equal(focusGateStatus([2,5],300,1),'incomplete');
});

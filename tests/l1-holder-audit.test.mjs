import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRows, parseRaw} from './tools/l1-holder-audit.mjs';

const arms=['splitter','water-normal','water-zero','eyes-normal','eyes-zero','twinTiger-normal','twinTiger-zero'];
const row=(arm,seed,bags=[[],[],[],[]],winnerId=0)=>({arm,seed,winnerId,endBagChainIds:bags});
const fixture=()=>arms.flatMap(arm=>[
  row(arm,1,[[],['water'],[],[]],1),
  row(arm,2,[['water'],[],[],[]],1),
  row(arm,3,[['water'],['water'],['water'],['water']],3),
  row(arm,4,[[],[],[],[]],0),
]);

test('counts all four endpoint holders, including winners outside seat zero',()=>{
  const result=auditRows(fixture(),'abc');
  const normal=result.chains.water.normal;
  assert.equal(result.formalStatus,'incomplete');
  assert.equal(result.rawSha256,'abc');
  assert.deepEqual(normal.holderCountDistribution,[1,2,0,0,1]);
  assert.equal(normal.anyHolderGames,3);
  assert.equal(normal.winnerHolderGames,2);
  assert.equal(normal.winnerHolderRate,2/3);
  assert.equal(result.chains.water.differencePp,0);
  assert.equal(result.chains.water.differenceIsCausal,false);
});

test('normal and zero use their own denominator and zero denominator is null',()=>{
  const rows=fixture();
  for(const r of rows.filter(r=>r.arm==='water-zero')) r.endBagChainIds=[[],[],[],[]];
  const result=auditRows(rows,'abc').chains.water;
  assert.equal(result.normal.anyHolderGames,3);
  assert.equal(result.zero.anyHolderGames,0);
  assert.equal(result.zero.winnerHolderRate,null);
  assert.equal(result.differencePp,null);
  assert.deepEqual(result.zero.holderCountDistribution,[4,0,0,0,0]);
});

test('raw parser requires valid JSON lines',()=>{
  assert.equal(parseRaw(JSON.stringify(row('splitter',1))+'\n').length,1);
  assert.throws(()=>parseRaw('{oops}\n'),/JSON/);
  assert.throws(()=>parseRaw(' \n'),/empty/);
});

test('rejects invalid arms and duplicate or missing arm seeds',()=>{
  const rows=fixture();
  assert.throws(()=>auditRows([...rows,row('unknown',5)],'abc'),/arm/);
  assert.throws(()=>auditRows([...rows,rows[0]],'abc'),/duplicate/);
  assert.throws(()=>auditRows(rows.slice(1),'abc'),/seed set/);
  assert.throws(()=>auditRows([],'abc'),/empty/);
  assert.throws(()=>auditRows(rows.map((r,i)=>i? r:{...r,seed:0}),'abc'),/seed/);
});

test('rejects illegal winner and malformed four-seat chain data',()=>{
  const cases=[
    [{winnerId:4},/winner/],
    [{winnerId:-1},/winner/],
    [{winnerId:1.5},/winner/],
    [{endBagChainIds:[[],[],[]]},/four seats/],
    [{endBagChainIds:[['water','water'],[],[],[]]},/duplicate chain/],
    [{endBagChainIds:[['invalid'],[],[],[]]},/chain/],
    [{endBagChainIds:[[],null,[],[]]},/chain/],
  ];
  for(const [change,pattern] of cases){
    const rows=fixture();
    rows[0]={...rows[0],...change};
    assert.throws(()=>auditRows(rows,'abc'),pattern);
  }
});

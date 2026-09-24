import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadGame} from './tools/load.mjs';

const INDEX = new URL('../index.html', import.meta.url);
const source = fs.readFileSync(INDEX, 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const feeStart = source.indexOf('function bidFee(');
const feeCode = feeStart < 0 ? '' : source.slice(feeStart, source.indexOf('function resolveAuction('));
const stakeCode = section('function stakeHTML(', 'function ybBump(');
const sheetCode = section('function paintSheet(', 'function closeSheet(');
const budgetCode = section('function updateBudget(', 'function submitHumanBids(');
const item = (G, ab) => ({...G.POOL.find(x => x.ab === ab)});
const bid = amt => ({amt, type:'cons', intent:'keep', target:null});

function fixture() {
  const G=loadGame(INDEX); G.makeState('hotseat', 1);
  const S=G.S;
  S.players.forEach(p=>p.ai=null);
  S.market=['eye','bell','boat','buoy'].map(ab=>item(G,ab));
  S.marks={};
  return {G,S};
}

// Run the production UI functions with a tiny DOM. The real game state and
// hasFlag resolver are shared with resolveAuction, rather than reimplementing fees.
const render=new Function('G','YB','myBids','INC','ACTIVE',`
  const CFG=G.CFG, S=G.S, hasFlag=G.hasFlag, budgetFor=G.budgetFor;
  const has=(p,ab)=>p.bag.some(x=>x.ab===ab), activeTrueDestiny=G.activeTrueDestiny;
  const consCapFor=G.consCapFor, DIRS=['南','北','西','東'];
  const dom={budget:{innerHTML:'',className:''},mainbtn:{disabled:false}};
  const $=id=>dom[id], incbarHTML=()=>'';
  ${feeCode}
  ${stakeCode}
  ${budgetCode}
  updateBudget();
  return {stake:stakeHTML(S.players[ACTIVE]), budget:dom.budget, disabled:dom.mainbtn.disabled};
`);

test('water chain has zero auction fee in settlement and in single-stake projection',()=>{
  const {G,S}=fixture();
  S.players[0].bag.push(item(G,'boat'),item(G,'buoy'));
  S.players[1].bag.push(item(G,'tiger'),item(G,'nail'));
  S.marks={1:0};
  S.humanBids={0:[bid(4),null,null,null]};
  const before=S.players[0].life;
  G.resolveAuction();
  assert.equal(before-S.players[0].life,4,'winning bid has no added fee');
  const ui=render(G,{amt:4,type:'cons',pick:[true,true,false,false]},[],null,0);
  assert.match(ui.stake,/買路錢 0/);
  assert.match(ui.budget.innerHTML,/合計 <b>4<\/b>/);
  assert.equal(ui.disabled,false);
});

test('tiger mark charges an opposing bidder two in settlement and single-stake projection',()=>{
  const {G,S}=fixture();
  S.players[1].bag.push(item(G,'tiger'),item(G,'nail'));
  S.marks={1:0};
  S.humanBids={0:[bid(4),null,null,null]};
  const before=S.players[0].life;
  G.resolveAuction();
  assert.equal(before-S.players[0].life,6,'winning bid plus tiger-marked fee');
  const ui=render(G,{amt:4,type:'cons',pick:[true,false,false,false]},[],null,0);
  assert.match(ui.stake,/買路錢 2/);
  assert.match(ui.budget.innerHTML,/合計 <b>6<\/b>/);
});

test('mixed single-stake selection shows conditional fee range and reserves its maximum',()=>{
  const {G,S}=fixture();
  S.players[1].bag.push(item(G,'tiger'),item(G,'nail'));
  S.marks={1:1};
  S.players[0].life=5;
  const ui=render(G,{amt:4,type:'yaming',pick:[true,true,false,false]},[],null,0);
  assert.match(ui.stake,/買路錢 1～2/);
  assert.match(ui.budget.innerHTML,/合計 <b>6<\/b>/);
  assert.match(ui.budget.innerHTML,/1～2/);
  assert.equal(ui.budget.className,'over');
  assert.equal(ui.disabled,true);
});

test('mixed-item single stake settles at the winning item fee',()=>{
  for (const rivalAmt of [0,6]) {
    const {G,S}=fixture();
    S.players[1].bag.push(item(G,'tiger'),item(G,'nail'));
    S.marks={1:1};
    S.round=G.CFG.RULE_NIGHTS[0];
    S.ruleOrder[0]='yabao';
    S.players[0].life=40;
    S.humanBids={
      0:[{...bid(4),stake:true},{...bid(4),stake:true},null,null],
      2:rivalAmt?[bid(rivalAmt),null,null,null]:[null,null,null,null],
    };
    const before=S.players[0].life;
    G.resolveAuction();
    const expected=rivalAmt?6:5;
    assert.equal(before-S.players[0].life,expected,
      `one 4-life bid plus ${rivalAmt?'tiger-marked 2':'ordinary 1'} fee`);
    assert.equal(S.players[0].bag.length,1);
    assert.equal(S.players[0].bag[0].n,S.market[rivalAmt?1:0].n);
  }
});

test('normal bidding uses own-mark rebate and charges no fee for zero bids',()=>{
  const {G,S}=fixture();
  G.CFG.MARK_REBATE=1;
  S.marks={0:0};
  const marked=render(G,null,[bid(3),bid(0),bid(0),bid(0)],null,0);
  assert.match(marked.budget.innerHTML,/合計 <b>3<\/b>/);
  S.humanBids={0:[bid(3),null,null,null]};
  const before=S.players[0].life;
  G.resolveAuction();
  assert.equal(before-S.players[0].life,3,'own-mark rebate also applies in settlement');
  const empty=render(G,{amt:0,type:'cons',pick:[true,false,false,false]},[],null,0);
  assert.match(empty.budget.innerHTML,/合計 <b>0<\/b>/);
  assert.equal(empty.disabled,false);
  const normal=render(G,null,[bid(0),bid(2),bid(0),bid(0)],null,0);
  assert.match(normal.budget.innerHTML,/合計 <b>3<\/b>/);
});

test('ordinary bid sheet renders the active seat fee instead of throwing',()=>{
  const {G,S}=fixture();
  S.players[0].bag.push(item(G,'boat'),item(G,'buoy'));
  const paint=new Function('G','myBids','sheetIdx',`
    const CFG=G.CFG, S=G.S, hasFlag=G.hasFlag, consCapFor=G.consCapFor, ACTIVE=0;
    const has=(p,ab)=>p.bag.some(x=>x.ab===ab), activeTrueDestiny=G.activeTrueDestiny;
    const dom={shAmt:{textContent:''},shType:{textContent:'',className:''},shCap:{textContent:'',innerHTML:''}};
    const $=id=>dom[id];
    ${feeCode}
    ${sheetCode}
    paintSheet();
    return dom;
  `);
  const dom=paint(G,[bid(3)],0);
  assert.match(dom.shCap.innerHTML,/水陸暗道：本標免買路錢/);
  assert.match(dom.shCap.innerHTML,/<span/,'fee emphasis should render as HTML, not literal tags');
});

test('ordinary bid sheet uses the same own-mark rebate as settlement',()=>{
  const {G,S}=fixture();
  G.CFG.MARK_REBATE=1;
  S.marks={0:0};
  const paint=new Function('G','myBids','sheetIdx',`
    const CFG=G.CFG, S=G.S, hasFlag=G.hasFlag, consCapFor=G.consCapFor, ACTIVE=0;
    const has=(p,ab)=>p.bag.some(x=>x.ab===ab), activeTrueDestiny=G.activeTrueDestiny;
    const dom={shAmt:{textContent:''},shType:{textContent:'',className:''},shCap:{textContent:'',innerHTML:''}};
    const $=id=>dom[id];
    ${feeCode}
    ${sheetCode}
    paintSheet();
    return dom;
  `);
  const dom=paint(G,[bid(3)],0);
  assert.match(dom.shCap.innerHTML,/本標免買路錢/);
  assert.doesNotMatch(dom.shCap.innerHTML,/另付買路錢 1/);
});

test('luopo full-loss rule preserves the actual water or tiger entry fee',()=>{
  for(const [mode,expected] of [['water',4],['tiger',6]]){
    const {G,S}=fixture();
    S.round=G.CFG.RULE_NIGHTS[0];
    S.ruleOrder[0]='luopo';
    if(mode==='water') S.players[0].bag.push(item(G,'boat'),item(G,'buoy'));
    else {
      S.players[2].bag.push(item(G,'tiger'),item(G,'nail'));
      S.marks={2:0};
    }
    S.humanBids={0:[bid(4),null,null,null],1:[bid(6),null,null,null]};
    const before=S.players[0].life;
    G.resolveAuction();
    assert.equal(before-S.players[0].life,expected,mode);
  }
});

test('raincoat blocks lost stake but preserves water-free or tiger-marked fee',()=>{
  for(const [mode,expected] of [['water',0],['tiger',2]]){
    const {G,S}=fixture();
    S.players[0].bag.push(item(G,'raincoat'));
    if(mode==='water') S.players[0].bag.push(item(G,'boat'),item(G,'buoy'));
    else {
      S.players[2].bag.push(item(G,'tiger'),item(G,'nail'));
      S.marks={2:0};
    }
    S.humanBids={0:[{...bid(4),type:'yaming'},null,null,null],1:[bid(6),null,null,null]};
    const before=S.players[0].life;
    G.resolveAuction();
    assert.equal(before-S.players[0].life,expected,mode);
  }
});

test('xiaonv lost stake preserves the actual water-free or tiger-marked fee',()=>{
  for(const [mode,expected] of [['water',0],['tiger',2]]){
    const {G,S}=fixture();
    S.players[0].roleId='xiaonv';
    if(mode==='water') S.players[0].bag.push(item(G,'boat'),item(G,'buoy'));
    else {
      S.players[2].bag.push(item(G,'tiger'),item(G,'nail'));
      S.marks={2:0};
    }
    S.humanBids={0:[{...bid(4),type:'yaming'},null,null,null],1:[bid(6),null,null,null]};
    const before=S.players[0].life;
    const winnerBefore=S.players[1].life;
    G.resolveAuction();
    assert.equal(before-S.players[0].life,expected,mode);
    assert.equal(winnerBefore-S.players[1].life,mode==='water'?8:9,
      'winning bidder pays six plus actual fee and loses one to xiaonv');
  }
});

test('lvshan solo curse discount excludes the actual water-free or tiger-marked fee',()=>{
  for(const [mode,expected] of [['water',2],['tiger',4]]){
    const {G,S}=fixture();
    S.players[0].roleId='lvshan';
    S.market[0]={...G.CURSES[0]};
    if(mode==='water') S.players[0].bag.push(item(G,'boat'),item(G,'buoy'));
    else {
      S.players[2].bag.push(item(G,'tiger'),item(G,'nail'));
      S.marks={2:0};
    }
    S.humanBids={0:[bid(4),null,null,null]};
    const before=S.players[0].life;
    G.resolveAuction();
    assert.equal(before-S.players[0].life,expected,mode);
  }
});

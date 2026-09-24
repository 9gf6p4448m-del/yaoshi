// 讀 scratchpad/tiger-toll/raw/*.json，依 acceptance.md 算 H9／H1、避標出價率並套挑選規則。
// H9／H1 算式與 bootstrap 同 ../2026-09-24-h9-boost/analyze.mjs。
// 用法：node docs/experiments/2026-09-24-tiger-toll/analyze.mjs [rawDir]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const dir=path.resolve(process.argv[2]||path.join(ROOT,'scratchpad/tiger-toll/raw'));
const load=(cand,arm)=>JSON.parse(fs.readFileSync(path.join(dir,`${cand}__${arm}.json`),'utf8'));
const round=v=>Math.round(v*100)/100;
const ID='twinTiger';

function h9(normal,zero){
  const tally=rows=>{let g=0,w=0;for(const r of rows){const h=r.holders[ID];if(h.length){g++;if(h.includes(r.winnerId))w++;}}return {g,w};};
  const n=tally(normal),z=tally(zero);
  const diff=100*(n.w/n.g-z.w/z.g);
  let s=20260924;const rnd=()=>(s=(Math.imul(s,1664525)+1013904223)>>>0)/2**32;
  const N=normal.length,ds=[];
  for(let b=0;b<2000;b++){
    let ng=0,nw=0,zg=0,zw=0;
    for(let k=0;k<N;k++){
      const i=Math.floor(rnd()*N),a=normal[i].holders[ID],c=zero[i].holders[ID];
      if(a.length){ng++;if(a.includes(normal[i].winnerId))nw++;}
      if(c.length){zg++;if(c.includes(zero[i].winnerId))zw++;}
    }
    ds.push(100*(nw/ng-zw/zg));
  }
  ds.sort((x,y)=>x-y);
  return {normalHolderGames:n.g,normalRate:round(100*n.w/n.g),zeroHolderGames:z.g,
    zeroRate:round(100*z.w/z.g),diffPp:round(diff),ci95Pp:[round(ds[49]),round(ds[1949])],
    pass:diff>=3&&diff<=10&&n.w/n.g<=.85};
}
function h1(chase,splitter){
  const w=rows=>rows.filter(r=>r.winnerId===0).length;
  const diff=100*(w(chase)-w(splitter))/chase.length;
  return {chaserWins:w(chase),splitterWins:w(splitter),diffPp:round(diff),pass:diff>=-8&&diff<=5};
}
function toll(rows){
  const opp=rows.reduce((n,r)=>n+r.toll.opp,0),bid=rows.reduce((n,r)=>n+r.toll.bid,0);
  return {opportunities:opp,bids:bid,bidRatePct:opp?round(100*bid/opp):null};
}

const zero=load('base',`h9-zero-${ID}`).rows;
const rows=['base','toll-S','toll-M'].map(c=>{
  const normal=load(c,'h9-normal').rows;
  if(normal.length!==zero.length||normal.some((r,i)=>r.seed!==zero[i].seed)) throw Error(`${c}: seed mismatch`);
  const r={cand:c,h9:h9(normal,zero),h1:h1(load(c,`h1-${ID}`).rows,load(c,'h1-splitter').rows),
    avoidance:{h9Normal:toll(normal),h1Splitter:toll(load(c,'h1-splitter').rows)}};
  r.eligible=c!=='base'&&r.h9.pass&&r.h1.pass;return r;
});
const pick=rows.find(r=>r.eligible)?.cand??null;
console.log(JSON.stringify({candidates:rows,selected:pick,
  action:pick?`進入正式驗收：${pick}`:'兩個幅度都不符合，停手回報使用者'},null,2));

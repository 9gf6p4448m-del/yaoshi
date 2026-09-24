// 讀 scratchpad/h9-boost/raw/*.json，依 acceptance.md 算各候選 H9／H1 並套挑選規則。
// 用法：node docs/experiments/2026-09-24-h9-boost/analyze.mjs [rawDir]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const dir=path.resolve(process.argv[2]||path.join(ROOT,'scratchpad/h9-boost/raw'));
const load=(cand,arm)=>JSON.parse(fs.readFileSync(path.join(dir,`${cand}__${arm}.json`),'utf8'));
const round=v=>Math.round(v*100)/100;

function h9(normal,zero,id){
  const tally=rows=>{let g=0,w=0;for(const r of rows){const h=r.holders[id];if(h.length){g++;if(h.includes(r.winnerId))w++;}}return {g,w};};
  const n=tally(normal),z=tally(zero);
  const diff=100*(n.w/n.g-z.w/z.g);
  // 以種子為群集的配對 bootstrap（2,000 次，固定種子的線性同餘亂數）
  let s=20260924;const rnd=()=>(s=(Math.imul(s,1664525)+1013904223)>>>0)/2**32;
  const N=normal.length,ds=[];
  for(let b=0;b<2000;b++){
    let ng=0,nw=0,zg=0,zw=0;
    for(let k=0;k<N;k++){
      const i=Math.floor(rnd()*N),a=normal[i].holders[id],c=zero[i].holders[id];
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

const plan={twinTiger:['tiger-S','tiger-M'],bloodOath:['blood-S','blood-M','blood-L']}; /* blood-L：第二輪，見 acceptance.md */
const out={};
for(const [id,cands] of Object.entries(plan)){
  const zero=load('base',`h9-zero-${id}`).rows;
  const rows=cands.map(c=>{
    const normal=load(c,'h9-normal').rows;
    if(normal.length!==zero.length||normal.some((r,i)=>r.seed!==zero[i].seed)) throw Error(`${c}: seed mismatch`);
    const r={cand:c,h9:h9(normal,zero,id),h1:h1(load(c,`h1-${id}`).rows,load(c,'h1-splitter').rows)};
    r.eligible=r.h9.pass&&r.h1.pass;return r;
  });
  const pick=rows.find(r=>r.eligible)?.cand??null;
  out[id]={candidates:rows,selected:pick,action:pick?`進入正式驗收：${pick}`:'兩個幅度都不符合，停手回報使用者'};
}
console.log(JSON.stringify(out,null,2));

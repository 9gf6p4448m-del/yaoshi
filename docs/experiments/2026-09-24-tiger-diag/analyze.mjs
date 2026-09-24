// 讀 diag.mjs 產出，逐鏈彙整持有人（每位持有人一筆）：湊齊夜、剩餘夜、結局、湊齊後失血組成、湊齊時壽命名次。描述性。
// 用法：node docs/experiments/2026-09-24-tiger-diag/analyze.mjs [raw.json]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const rows=JSON.parse(fs.readFileSync(process.argv[2]||path.join(ROOT,'scratchpad/tiger-diag/base-h9-normal.json'),'utf8'));
const r2=v=>Math.round(v*100)/100;
const mean=a=>a.length?r2(a.reduce((s,x)=>s+x,0)/a.length):null;
const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
const out={};
for(const c of ['water','eyes','twinTiger','bloodOath']){
  const H=[];
  for(const g of rows) for(const [seatStr,info] of Object.entries(g.first[c])){
    const seat=Number(seatStr),acq=info.round,L=g.gameLength;
    const died=g.survival[seat]<L,win=g.winnerId===seat;
    // 湊齊當夜結束時的壽命名次（1＝最高；只比存活者）
    const lifeAt=g.lifeByRound[acq-1];
    const alive=lifeAt.map((v,i)=>({v,i})).filter(x=>x.v>0);
    const rank=alive.filter(x=>x.v>lifeAt[seat]).length+1;
    // 湊齊後（含湊齊當夜）到出局或終局的失血：總落差 vs 非自願（對決＋詛咒）
    const startLife=acq>=2?g.lifeByRound[acq-2][seat]:null;
    const lastNight=Math.min(L,g.survival[seat]);
    const endLife=g.lifeByRound[lastNight-1][seat];
    let ext=0;for(let n=acq;n<=lastNight;n++) ext+=(g.extByRound[n]?.[seat]||0);
    H.push({acq,left:L-acq+1,died,win,rank,drop:startLife===null?null:startLife-endLife,ext});
  }
  const lose=H.filter(h=>!h.win),dead=H.filter(h=>h.died);
  const withDrop=lose.filter(h=>h.drop!==null&&h.drop>0);
  out[c]={holders:H.length,winPct:r2(100*H.filter(h=>h.win).length/H.length),
    acqNight:{mean:mean(H.map(h=>h.acq)),median:median(H.map(h=>h.acq)),
      lateShare_ge8:r2(100*H.filter(h=>h.acq>=8).length/H.length)},
    nightsWithChain:{mean:mean(H.map(h=>h.left)),median:median(H.map(h=>h.left)),
      le3Share:r2(100*H.filter(h=>h.left<=3).length/H.length)},
    rankAtAcq:{mean:mean(H.map(h=>h.rank)),firstShare:r2(100*H.filter(h=>h.rank===1).length/H.length)},
    losers:{n:lose.length,diedPct:r2(100*lose.filter(h=>h.died).length/lose.length),
      extShareOfDropPct:r2(100*withDrop.reduce((s,h)=>s+Math.min(h.ext,h.drop),0)/withDrop.reduce((s,h)=>s+h.drop,0)),
      meanDrop:mean(withDrop.map(h=>h.drop)),meanExt:mean(withDrop.map(h=>h.ext))},
    deadN:dead.length};
}
console.log(JSON.stringify(out,null,2));

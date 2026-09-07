/* 冷讀覆審探針 2：階段獎勵分母 top 的口徑；「無人上香」文案真偽；一人一尊擋單筆數 */
import {loadGame} from './load.mjs';
import path from 'path';
import {fileURLToPath} from 'url';
const NEW=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','..','index.html');
const N=Number(process.argv[2]||1000);
const G=loadGame(NEW); G.CFG.LEGEND_ON=true;
let taken=0, topMismatch=0, topMismatchDetail=[];
let nightDawn=0, nightDawnWithBurn=0, dawnBurnDetail=[];
let lockedTotal=0;
for(let s=1;s<=N;s++){
  const g=G.playPolicyGame(s,{});
  lockedTotal+=(g.shrineStat&&g.shrineStat.locked)|0;
  (g.shrines||[]).forEach(sh=>{
    const ch=sh.closeH; if(!ch) return;
    const top=Math.max(0,...ch);
    if(sh.takenBy!=null){
      taken++;
      if(ch[sh.takenBy]!==top){ topMismatch++; if(topMismatchDetail.length<5) topMismatchDetail.push({seed:s,shrine:sh.i,night:sh.night,winner:sh.takenBy,winH:ch[sh.takenBy],top,closeH:ch}); }
    }else if(sh.dawn&&sh.round!=null){
      nightDawn++;
      if(top>0){ nightDawnWithBurn++; if(dawnBurnDetail.length<5) dawnBurnDetail.push({seed:s,shrine:sh.i,night:sh.night,closeH:ch,closeBack:sh.closeBack}); }
    }
  });
}
console.log(`n=${N}`);
console.log(`請走的龕 ${taken}；其中「本龕最高 h ≠ 得標者的 h」 ${topMismatch}（${(topMismatch/taken*100).toFixed(2)}%）`);
console.log(JSON.stringify(topMismatchDetail,null,1));
console.log(`請神夜回天的龕 ${nightDawn}；其中「其實有人燒過香」（closeH 有非 0） ${nightDawnWithBurn}（${nightDawn?(nightDawnWithBurn/nightDawn*100).toFixed(2):0}%）`);
console.log(JSON.stringify(dawnBurnDetail,null,1));
console.log(`一人一尊擋下的封籤（引擎側 locked）總筆數：${lockedTotal}`);

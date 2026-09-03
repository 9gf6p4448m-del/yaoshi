/* 卷 D 調校探針 v3（**不是閘門**，輸出不得當驗收證據）：對 unit 的 count/atk/hp 做隨機重啟爬山，
   目標是讓 D-A1 的九格全部落在凍結門檻內（群體vs精英 40–60%、其餘 ≤40%）。門檻一字未改。
   跑法：node tests/tools/paperwar-D-tune3.mjs index.html 400 300 */
import path from 'path';
import {fileURLToPath} from 'url';
import {loadGame} from './load.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const HTML=process.argv[2]||path.join(HERE,'..','..','index.html');
const N=Number(process.argv[3]||400);
const ITER=Number(process.argv[4]||300);
const SEEDS=Array.from({length:N},(_,i)=>i+1);
const PAIRS=[
  ['band',['五營旗','陰陽眼銅錢','拼板舟'],['射日神弓','巴冷公主珠鍊']],
  ['band',['五營旗','山豬牙飾','飼鬼甕'],['獻祭刀','王爺劍']],
  ['band',['拼板舟','山豬牙飾','陰陽眼銅錢'],['雷女之火','虎爺印','虎姑婆指甲']],
  ['le',['五營旗','陰陽眼銅錢','拼板舟'],['魔神仔紅帽','林投姐髮簪']],
  ['le',['五營旗','山豬牙飾','飼鬼甕'],['椅仔姑竹椅','黃色小雨衣']],
  ['le',['拼板舟','山豬牙飾','飼鬼甕'],['過陰咒','水鬼浮標']],
  ['le',['魔神仔紅帽','林投姐髮簪'],['射日神弓','巴冷公主珠鍊']],
  ['le',['椅仔姑竹椅','過陰咒'],['獻祭刀','雷女之火']],
  ['le',['黃色小雨衣','水鬼浮標'],['巴冷公主珠鍊','虎姑婆指甲']],
];
/* 參數向量：前 12 個是 unit 數值，後 8 個是招的強度（每個都 ≥1，D2 要求每件都有招會觸發） */
const DIM=[[2,4],[1,3],[2,4],[1,3],[2,3],[1,3],[2,3],[1,3],[2,3],[-2,1],[-2,2],[-1,1],
           [1,3],[1,3],[1,3],[1,2],[1,2],[1,3],[1,2],[1,4]];
const BASE=(process.env.PW_BASE?process.env.PW_BASE.split(',').map(Number):[3,2,3,2,2,2,2,2,2,0,0,0, 1,2,2,1,1,2,1,3]);
function apply(g,v){
  const set=(n,o)=>Object.assign(g.POOL.find(x=>x.n===n).unit,o);
  set('五營旗',{count:v[0],hp:v[1]}); set('拼板舟',{count:v[2],hp:v[3]});
  set('山豬牙飾',{count:v[4],atk:v[5]}); set('陰陽眼銅錢',{count:v[6],hp:v[7]});
  set('飼鬼甕',{count:v[8]});
  for(const it of g.POOL){
    if(!it.unit) continue;
    if(it.unit.body==='elite'){ it.unit.atk=Math.max(1,it.unit.atk+v[9]); it.unit.hp=Math.max(1,it.unit.hp+v[10]); }
    if(it.unit.body==='haunt'){ it.unit.hp=Math.max(1,it.unit.hp+v[11]); }
  }
  g.TRAITS.eliteOpenShot3.openShot=v[12];
  g.TRAITS.eliteArmor1.armor=v[13];
  g.TRAITS.eliteSelfCut2.selfCutAtk=v[14];
  g.TRAITS.eliteVsSwarm2.vsSwarm=v[15];
  g.TRAITS.swarmVsElite2.thorn=v[16];
  g.TRAITS.swarmBeat2Atk1.rallyHp=v[17];
  g.TRAITS.swarmFeed1.feed=v[18];
  g.TRAITS.swarmLastStand3.lastStand=v[19];
}
const cache=new Map();
function score(v){
  const key=v.join(',');
  if(cache.has(key)) return cache.get(key);
  const g=loadGame(HTML); g.CFG.PAPERWAR_ON=true; apply(g,v);
  const by=n=>g.POOL.find(x=>x.n===n), bg=ns=>ns.map(n=>({...by(n)}));
  const vals=PAIRS.map(([k,a,b])=>g.duelBags(bg(a),bg(b),SEEDS).rateDecided);
  let loss=0;
  vals.forEach((x,i)=>{
    if(PAIRS[i][0]==='band'){ if(x<0.42) loss+=(0.42-x); else if(x>0.58) loss+=(x-0.58); }
    else if(x>0.38) loss+=(x-0.38)*2;
  });
  const r={loss,vals}; cache.set(key,r); return r;
}
const rnd=(s=>()=>((s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff))(20260904);
let best={v:BASE,...score(BASE)};
console.log('起點 loss',best.loss.toFixed(4),best.vals.map(x=>(x*100).toFixed(1)).join(' '));
for(let restart=0;restart<12&&best.loss>1e-9;restart++){
  let cur=restart===0?BASE.slice():DIM.map((d,i)=>d[0]+Math.floor(rnd()*(d[1]-d[0]+1)));
  let curS=score(cur);
  for(let it=0;it<ITER/12&&best.loss>1e-9;it++){
    let improved=false;
    for(let d=0;d<DIM.length;d++) for(const step of [-1,1]){
      const nv=cur.slice(); nv[d]+=step;
      if(nv[d]<DIM[d][0]||nv[d]>DIM[d][1]) continue;
      const s=score(nv);
      if(s.loss<curS.loss-1e-9){ cur=nv; curS=s; improved=true; }
      if(s.loss<best.loss-1e-9){ best={v:nv.slice(),...s}; console.log('  改善 loss',s.loss.toFixed(4),nv.join(','),s.vals.map(x=>(x*100).toFixed(1)).join(' ')); }
    }
    if(!improved) break;
  }
}
console.log('最佳 loss',best.loss.toFixed(4));
console.log('參數 =',best.v.join(','));
console.log('九格',best.vals.map(x=>(x*100).toFixed(1).padStart(5)).join(' '));

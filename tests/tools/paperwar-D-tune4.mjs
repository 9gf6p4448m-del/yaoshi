/* 卷 D 調校探針 v4（**不是閘門**）：一次評 D-A1／D-A2／D-A6／D-A9(只買護法) 四條，
   掃護法的 count／hp／香灰符 hpFirst，找同時過的一組。門檻一字未改。
   跑法：node tests/tools/paperwar-D-tune4.mjs index.html 600 */
import path from 'path';
import {fileURLToPath} from 'url';
import {loadGame} from './load.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const HTML=process.argv[2]||path.join(HERE,'..','..','index.html');
const N=Number(process.argv[3]||600);
const SEEDS=Array.from({length:N},(_,i)=>i+1);
const TARGET=12;
function styleBag(items){
  let best=null;
  const rec=(i,cur,tot)=>{
    if(cur.length){ const d=Math.abs(tot-TARGET);
      if(!best||d<best.d||(d===best.d&&cur.length>best.bag.length)) best={d,tot,bag:[...cur]}; }
    if(i>=items.length||cur.length>=4) return;
    for(let c=0;c<=2;c++){ for(let k=0;k<c;k++) cur.push(items[i]); rec(i+1,cur,tot+c*items[i].p); for(let k=0;k<c;k++) cur.pop(); }
  };
  rec(0,[],0); return best.bag.map(x=>({...x}));
}
const A1=[
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
function check(wc,hpOff,hpFirst,wardAtk,chairN){
  const g=loadGame(HTML); g.CFG.PAPERWAR_ON=true;
  g.TRAITS.wardHpFirst3.hpFirst=hpFirst;
  if(chairN) g.POOL.find(x=>x.n==='椅仔姑竹椅').unit.count=chairN;
  for(const it of g.POOL) if(it.unit&&it.unit.body==='ward'){ it.unit.count=wc; it.unit.atk=wardAtk; it.unit.hp=it.p+hpOff; }
  const by=n=>g.POOL.find(x=>x.n===n), bg=ns=>ns.map(n=>({...by(n)}));
  const a1=A1.map(([k,a,b])=>g.duelBags(bg(a),bg(b),SEEDS).rateDecided);
  const a1ok=a1.every((v,i)=>A1[i][0]==='band'?(v>=0.40&&v<=0.60):(v<=0.40));
  let a2ok=true;
  for(const f of ['zuling','xianghuo','yinqi']) for(const bd of ['swarm','elite','ward','haunt']){
    const items=g.POOL.filter(x=>x.f===f&&x.unit&&x.unit.body===bd);
    if(items.length<2||new Set(items.map(x=>x.p)).size<2) continue;
    items.sort((a,b)=>a.p-b.p);
    const rates=items.map(it=>{ let s=0,c=0; for(const o of items){ if(o===it) continue; s+=g.duelBags([{...it}],[{...o}],SEEDS).rateDecided; c++; } return c?s/c:0; });
    for(let i=1;i<items.length;i++) if(items[i].p>items[i-1].p&&rates[i]<rates[i-1]-1e-9) a2ok=false;
  }
  const ST=[];
  for(const f of ['zuling','xianghuo','yinqi']) for(const bd of ['swarm','elite','ward','haunt']){
    const items=g.POOL.filter(x=>x.f===f&&x.unit&&x.unit.body===bd);
    if(items.length) ST.push({k:`${f}/${bd}`,bag:styleBag(items)});
  }
  let bad=0;
  for(let r=1;r<=12;r++){
    const rows=ST.map(a=>ST.map(b=>a===b?null:g.duelBags(a.bag,b.bag,SEEDS,{round:r}).rateDecided));
    rows.forEach(row=>{ if(row.filter(v=>v!==null).every(v=>v>=0.5)) bad++; });
  }
  const wardRows=ST.filter(s=>s.k.endsWith('/ward'));
  const foes=ST.filter(s=>/\/(swarm|elite|haunt)$/.test(s.k));
  let wardOk=true; const wardTab=[];
  for(const w of wardRows){
    const row=foes.map(f=>g.duelBags(w.bag,f.bag,SEEDS).rateDecided);
    if(!row.every(v=>v>0)) wardOk=false;
    wardTab.push(w.k+'='+row.map(v=>(v*100).toFixed(0)).join(','));
  }
  return {a1ok,a2ok,a6ok:bad===0,wardOk,a1:a1.map(v=>(v*100).toFixed(1)).join(' '),bad,wardTab:wardTab.join(' | ')};
}
for(const wc of [2]) for(const hpOff of [0,1,2]) for(const hpFirst of [1,2]) for(const wa of [1]) for(const cn of [2,3,4]){
  const r=check(wc,hpOff,hpFirst,wa,cn);
  const flag=(r.a1ok?'A1✅':'A1❌')+(r.a2ok?' A2✅':' A2❌')+(r.a6ok?' A6✅':` A6❌(${r.bad})`)+(r.wardOk?' 護法✅':' 護法❌');
  console.log(`count=${wc} hp=p+${hpOff} hpFirst=${hpFirst} atk=${wa} 椅仔姑=${cn} | ${flag}`);
  console.log(`   A1 ${r.a1}`);
  console.log(`   ward ${r.wardTab}`);
}

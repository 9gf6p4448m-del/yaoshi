/* 《紙紮夜戰》卷 D 閘門治具（2026-09-03）
   驗收條件與門檻凍結於 docs/experiments/2026-09-03-acceptance-paperwar-D.md，本腳本**不得為了過而調門檻**。
   與卷 A 的 paperwar-gate.mjs 的差別：A 拿 fed244f 當對照，D 的凍結檔改成「ON vs OFF」自對照
   （OFF 已由 D-A0 證明與基準逐位元組相等，兩者等價，但 D 條文寫的是 ON vs OFF，這裡照條文跑）。
   跑法：git show e552ddf:index.html > old-d.html（放 repo 根），再
     node tests/tools/paperwar-gate-D.mjs 10000 [--only=D-A1,D-A7] [--old=old-d.html] [--new=index.html]
   D-A8（五套測試／Math.random／瀏覽器）不在本腳本，見報告。 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {loadGame} from './load.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.join(HERE,'..','..');
const argv=process.argv.slice(2);
const N=Number(argv.find(a=>/^\d+$/.test(a))||10000);
const arg=k=>{ const a=argv.find(x=>x.startsWith('--'+k+'=')); return a?a.slice(k.length+3):null; };
const NEW=arg('new')||path.join(ROOT,'index.html');
const OLD=arg('old')||path.join(ROOT,'old-d.html');
const ONLY=(arg('only')||'').split(',').filter(Boolean);
const want=id=>!ONLY.length||ONLY.includes(id);
const SEEDS=Array.from({length:N},(_,i)=>i+1);
const pct=v=>(v*100).toFixed(2)+'%';
const say=(...s)=>console.log(s.join(' '));

/* ON 與 OFF 各載一份（同一個檔，只有 CFG.PAPERWAR_ON 不同），避免旗標在同一份 G 上來回切造成汙染 */
const G=loadGame(NEW);   G.CFG.PAPERWAR_ON=true;    /* ON  */
const F=loadGame(NEW);   F.CFG.PAPERWAR_ON=false;   /* OFF */
const O=fs.existsSync(OLD)?loadGame(OLD):null;      /* 基準（v0.29） */

const by=n=>G.POOL.find(x=>x.n===n);
const bag=(...ns)=>ns.map(n=>({...by(n)}));
const sumP=b=>b.reduce((s,x)=>s+x.p,0);
const t0=Date.now();
const lap=()=>`（${((Date.now()-t0)/1000).toFixed(0)}s）`;
const verdict={};

say(`# 《紙紮夜戰》卷 D 閘門　n=${N}　新版=${path.basename(NEW)}　基準=${path.basename(OLD)}`);
say('');

/* ---------------- D-A0 kill switch ---------------- */
if(want('D-A0')){
  say('## D-A0 Kill switch（OFF 與基準逐位元組相等；ON 必不等）');
  if(!O){ say('❌ 找不到 old-d.html'); verdict['D-A0']=false; }
  else{
    const tr=g=>JSON.stringify(g.trace(Array.from({length:20},(_,i)=>i+1)));
    const offNew=tr(F), onNew=tr(G), oldT=tr(O);
    const eqOff=(offNew===oldT), neqOn=(onNew!==oldT);
    say(`- OFF vs 基準：長度 ${offNew.length} / ${oldT.length}，逐位元組${eqOff?'相等':'**不相等**'} → ${eqOff?'✅':'❌'}`);
    say(`- ON  vs 基準：${neqOn?'不相等':'**相等**'} → ${neqOn?'✅':'❌'}`);
    verdict['D-A0']=eqOff&&neqOn;
    say(`- 判定：${verdict['D-A0']?'✅ 通過':'❌ 未通過'} ${lap()}`);
  }
  say('');
}

/* ---------------- D-A1 三角 ---------------- */
const PAIRS={
  '群體 vs 精英（band 40–60%）':[
    [['五營旗','陰陽眼銅錢','拼板舟'],['射日神弓','巴冷公主珠鍊']],
    [['五營旗','山豬牙飾','飼鬼甕'],['獻祭刀','王爺劍']],
    [['拼板舟','山豬牙飾','陰陽眼銅錢'],['雷女之火','虎爺印','虎姑婆指甲']]],
  '群體 vs 作祟（≤40%）':[
    [['五營旗','陰陽眼銅錢','拼板舟'],['魔神仔紅帽','林投姐髮簪']],
    [['五營旗','山豬牙飾','飼鬼甕'],['椅仔姑竹椅','黃色小雨衣']],
    [['拼板舟','山豬牙飾','飼鬼甕'],['過陰咒','水鬼浮標']]],
  '作祟 vs 精英（≤40%）':[
    [['魔神仔紅帽','林投姐髮簪'],['射日神弓','巴冷公主珠鍊']],
    [['椅仔姑竹椅','過陰咒'],['獻祭刀','雷女之火']],
    [['黃色小雨衣','水鬼浮標'],['巴冷公主珠鍊','虎姑婆指甲']]],
};
if(want('D-A1')){
  say('## D-A1 三角（不計平手口徑；門檻與卷 A 同一份，一字未改）');
  say('| 關係 | 甲袋 | 乙袋 | 總價 | 甲勝/乙勝/平手 | 勝率(不計平手) | 判定 |');
  say('|---|---|---|---|---|---|---|');
  let all=true;
  for(const rel in PAIRS){
    const band=rel.includes('40–60');
    for(const [a,b] of PAIRS[rel]){
      const ba=bag(...a), bb=bag(...b);
      const R=G.duelBags(ba,bb,SEEDS);
      const v=R.rateDecided, ok=band?(v>=0.40&&v<=0.60):(v<=0.40);
      if(!ok) all=false;
      say(`| ${rel} | ${a.join('＋')} | ${b.join('＋')} | ${sumP(ba)}/${sumP(bb)} | ${R.winA}/${R.winB}/${R.ties} | ${pct(v)} | ${ok?'✅':'❌'} |`);
    }
  }
  verdict['D-A1']=all;
  say(`- 判定：${all?'✅':'❌'} ${lap()}`);
  say('');
}

/* ---------------- D-A2 價格信號 ---------------- */
if(want('D-A2')){
  say('## D-A2 價格信號（同系同體型，逐件對同組其餘各件單挑取平均；p 遞增應單調不降）');
  say('| 系 | 體型 | 由低到高 | 判定 |');
  say('|---|---|---|---|');
  let all=true;
  for(const f of ['zuling','xianghuo','yinqi']) for(const bd of ['swarm','elite','ward','haunt']){
    const items=G.POOL.filter(x=>x.f===f&&x.unit&&x.unit.body===bd);
    if(items.length<2||new Set(items.map(x=>x.p)).size<2) continue;
    items.sort((a,b)=>a.p-b.p);
    const rates=items.map(it=>{
      let s=0,c=0;
      for(const o of items){ if(o===it) continue; s+=G.duelBags([{...it}],[{...o}],SEEDS).rateDecided; c++; }
      return c?s/c:0;
    });
    let mono=true;
    for(let i=1;i<items.length;i++) if(items[i].p>items[i-1].p&&rates[i]<rates[i-1]-1e-9) mono=false;
    if(!mono) all=false;
    say(`| ${f} | ${bd} | ${items.map((it,i)=>`${it.p}：${it.n}＝${pct(rates[i])}`).join('　→　')} | ${mono?'✅':'❌'} |`);
  }
  verdict['D-A2']=all;
  say(`- 判定：${all?'✅':'❌'} ${lap()}`);
  say('');
}

/* ---------------- D-A3／D-A4／D-A7：runMany ON vs OFF ---------------- */
let onPol=null, offPol=null, onDef=null, offDef=null, tOn=0, tOff=0;
if(want('D-A3')||want('D-A4')||want('D-A7')||want('D-A10')){
  const pols=['splitter','greedy','hoarder'];
  onPol={}; offPol={};
  for(const p of pols){
    onPol[p]=G.runMany({n:N,policies:{0:G.POLICIES[p]}});
    offPol[p]=F.runMany({n:N,policies:{0:F.POLICIES[p]}});
  }
  let t=Date.now(); onDef=G.runMany({n:N});  tOn=(Date.now()-t)/1000;
  t=Date.now();     offDef=F.runMany({n:N}); tOff=(Date.now()-t)/1000;
}
if(want('D-A3')){
  say('## D-A3 三策略（座位 0 勝率，門檻：各 ≤40%）');
  say('| 策略 | OFF | ON | 位移 | 判定 |');
  say('|---|---|---|---|---|');
  let all=true;
  for(const p of ['splitter','greedy','hoarder']){
    const a=offPol[p].winRate[0], b=onPol[p].winRate[0];
    const ok=b<=0.40; if(!ok) all=false;
    say(`| ${p} | ${pct(a)} | ${pct(b)} | ${((b-a)*100).toFixed(2)}pp | ${ok?'✅':'❌'} |`);
  }
  verdict['D-A3']=all;
  say(`- 判定：${all?'✅':'❌'} ${lap()}`);
  say('');
}
if(want('D-A4')){
  say('## D-A4 節奏（ON vs OFF，門檻：四席平均存活夜位移 ≤1 夜；局末壽命位移＝記錄項不判定，2026-09-04 使用者裁定重基準化）');
  say('| 席 | 存活夜 OFF→ON（位移） | 局末壽命 OFF→ON（位移） |');
  say('|---|---|---|');
  let mxS=0,mxL=0;
  for(let i=0;i<4;i++){
    const ds=onDef.avgSurvivalNights[i]-offDef.avgSurvivalNights[i];
    const dl=onDef.avgFinalLife[i]-offDef.avgFinalLife[i];
    mxS=Math.max(mxS,Math.abs(ds)); mxL=Math.max(mxL,Math.abs(dl));
    say(`| ${i} | ${offDef.avgSurvivalNights[i].toFixed(2)}→${onDef.avgSurvivalNights[i].toFixed(2)}（${ds>=0?'+':''}${ds.toFixed(2)}） | ${offDef.avgFinalLife[i].toFixed(2)}→${onDef.avgFinalLife[i].toFixed(2)}（${dl>=0?'+':''}${dl.toFixed(2)}） |`);
  }
  say(`- 最大位移：存活夜 ${mxS.toFixed(2)}（≤1 ${mxS<=1?'✅':'❌'}）　壽命 ${mxL.toFixed(2)}（記錄項，原門檻 ≤3 已於 2026-09-04 裁定改為試玩後再訂）`);
  say(`- 平均對局長度 ${offDef.avgGameLength.toFixed(2)}→${onDef.avgGameLength.toFixed(2)} 夜`);
  verdict['D-A4']=(mxS<=1);
  say(`- 判定：${verdict['D-A4']?'✅':'❌'} ${lap()}`);
  say('');
}
if(want('D-A7')){
  say('## D-A7 AI 不崩（三策略下 AI 三席勝率合計，門檻：ON 絕對值 ≥75%＝真人任一策略不高於四家均分；2026-09-04 使用者裁定由「≥ OFF 的 90%」重訂基準，OFF 欄與比值僅供參考）★本卷主閘門★');
  say('| 策略 | OFF AI 合計 | ON AI 合計 | 比值 | 判定 |');
  say('|---|---|---|---|---|');
  let all=true;
  for(const p of ['splitter','greedy','hoarder']){
    const a=offPol[p].winRate.slice(1).reduce((s,v)=>s+v,0);
    const b=onPol[p].winRate.slice(1).reduce((s,v)=>s+v,0);
    const ok=b>=0.75; if(!ok) all=false;
    say(`| ${p} | ${pct(a)} | ${pct(b)} | ${(a?b/a:1).toFixed(3)} | ${ok?'✅':'❌'} |`);
  }
  verdict['D-A7']=all;
  say(`- 判定：${all?'✅':'❌'} ${lap()}`);
  say('');
}

/* ---------------- D-A7b 近似的鑑別力（brief：duelBags 抽驗，相關性 ≥0.6） ---------------- */
if(want('D-A7b')){
  say('## D-A7b D1 估值（pwTrial 小樣本實跑）vs duelBags 實測勝率（Pearson r ≥ 0.6）');
  const pool=G.POOL.filter(x=>x.unit);
  const rng=(s=>()=>((s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff))(20260903);
  const mk=()=>{ const k=1+Math.floor(rng()*3), b=[]; for(let i=0;i<k;i++) b.push({...pool[Math.floor(rng()*pool.length)]}); return b; };
  const xs=[],ys=[];
  const M=60, sub=SEEDS.slice(0,Math.min(2000,N));
  for(let i=0;i<M;i++){
    const A=mk(), B=mk();
    const est=G.pwTrial(A,B,1);
    const act=G.duelBags(A,B,sub).rateDecided;
    xs.push(est); ys.push(act);
  }
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
  const mx=mean(xs), my=mean(ys);
  let sxy=0,sxx=0,syy=0;
  for(let i=0;i<xs.length;i++){ const dx=xs[i]-mx, dy=ys[i]-my; sxy+=dx*dy; sxx+=dx*dx; syy+=dy*dy; }
  const r=sxy/Math.sqrt(sxx*syy);
  say(`- 隨機袋對 ${M} 組（每組 ${sub.length} 局實測）：Pearson r = ${r.toFixed(3)}`);
  verdict['D-A7b']=r>=0.6;
  say(`- 判定：${verdict['D-A7b']?'✅':'❌'} ${lap()}`);
  say('');
}

/* ---------------- D-A5 角色極差 ---------------- */
if(want('D-A5')){
  say('## D-A5 角色（各角色坐席 0 的勝率；記錄項不判定——原門檻「ON 極差不大於 OFF」於 2026-09-04 使用者裁定改為試玩後再訂絕對門檻）');
  const roles=Object.keys(G.ROLES).filter(k=>G.ROLES[k].pool);
  const rn=[],ro=[];
  say('| 角色 | OFF | ON |');
  say('|---|---|---|');
  for(const r of roles){
    const a=F.runMany({n:N,picks:[r]}).winRate[0];
    const b=G.runMany({n:N,picks:[r]}).winRate[0];
    ro.push(a); rn.push(b);
    say(`| ${G.ROLES[r].name}（${r}） | ${pct(a)} | ${pct(b)} |`);
  }
  const sp=a=>Math.max(...a)-Math.min(...a);
  verdict['D-A5']=true; /* 記錄項，極差另行列印 */
  say(`- 極差：OFF ${(sp(ro)*100).toFixed(2)}pp → ON ${(sp(rn)*100).toFixed(2)}pp`);
  say(`- 判定：記錄項（不判定；ON 極差不大於 OFF ＝ ${sp(rn)<=sp(ro)+1e-12?'是':'否'}） ${lap()}`);
  say('');
}

/* ---------------- D-A6 月相窮舉（hp+1 版） ---------------- */
const TARGET=12;
function styleBag(items){
  let best=null;
  const rec=(i,cur,tot)=>{
    if(cur.length){
      const d=Math.abs(tot-TARGET);
      if(!best||d<best.d||(d===best.d&&cur.length>best.bag.length)) best={d,tot,bag:[...cur]};
    }
    if(i>=items.length||cur.length>=4) return;
    for(let c=0;c<=2;c++){
      for(let k=0;k<c;k++) cur.push(items[i]);
      rec(i+1,cur,tot+c*items[i].p);
      for(let k=0;k<c;k++) cur.pop();
    }
  };
  rec(0,[],0);
  return best.bag.map(x=>({...x}));
}
function styles(){
  const out=[];
  for(const f of ['zuling','xianghuo','yinqi']) for(const bd of ['swarm','elite','ward','haunt']){
    const items=G.POOL.filter(x=>x.f===f&&x.unit&&x.unit.body===bd);
    if(!items.length) continue;
    out.push({k:`${f}/${bd}`,bag:styleBag(items)});
  }
  return out;
}
if(want('D-A6')){
  say('## D-A6 月相窮舉（12 夜 × 各「只買某系某體型」；判定：不存在哪一夜有一列全 ≥50%）');
  const ST=styles();
  say(`- 買法：${ST.map(s=>`${s.k}＝${s.bag.map(x=>x.n).join('＋')}（${sumP(s.bag)}）`).join('；')}`);
  let bad=[];
  for(let round=1;round<=12;round++){
    const rows=ST.map(a=>ST.map(b=>(a===b)?null:G.duelBags(a.bag,b.bag,SEEDS,{round}).rateDecided));
    rows.forEach((row,i)=>{ const nz=row.filter(v=>v!==null); if(nz.every(v=>v>=0.5)) bad.push(`夜${round}：${ST[i].k}`); });
    say('');
    say(`第 ${round} 夜　${G.phaseText(round)}`);
    say('| 買法＼對手 | '+ST.map(s=>s.k).join(' | ')+' | 最低 |');
    say('|---'+'|---'.repeat(ST.length+1)+'|');
    rows.forEach((row,i)=>{
      const nz=row.filter(v=>v!==null);
      say(`| ${ST[i].k} | `+row.map(v=>v===null?'—':(v*100).toFixed(1)+'%').join(' | ')+` | ${(Math.min(...nz)*100).toFixed(1)}% |`);
    });
  }
  say('');
  say(`- 全列 ≥50%（支配買法）：${bad.length?'**'+bad.join('、')+'**':'無'}`);
  verdict['D-A6']=!bad.length;
  say(`- 判定：${verdict['D-A6']?'✅':'❌'} ${lap()}`);
  say('');
}

/* ---------------- D-A9 活性：27 招、只買護法、beats ---------------- */
if(want('D-A9')){
  say('## D-A9 活性（整局實跑 playPolicyGame → 真實 resolveBattles → paperWar）');
  const T={fights:0,burn:{},dmg:{},gang:0,splash:0,fear:0,lost:0,swap:0,bolt:0,bite:0,steal:0,regen:0,
    tr:{},beats:0,beatsReal:0,killed:0,burnSum:0,emptyBeats:0};
  for(const s of SEEDS){
    G.playPolicyGame(s,{},undefined);
    const p=G.S.pwStat; if(!p) continue;
    T.fights+=p.fights;
    for(const k in p.burn) T.burn[k]=(T.burn[k]||0)+p.burn[k];
    for(const k in p.dmg) T.dmg[k]=(T.dmg[k]||0)+p.dmg[k];
    for(const k of ['gang','splash','fear','lost','swap','bolt','bite','steal','regen','beats','beatsReal','killed','burnSum','emptyBeats']) T[k]+=p[k]||0;
    for(const k in p.tr) T.tr[k]=(T.tr[k]||0)+p.tr[k];
  }
  const missing=[2,3,4,5,6,7,8].filter(v=>!T.dmg[v]);
  say(`- 對決場數 ${T.fights}　dmg 分布：${Object.keys(T.dmg).map(Number).sort((a,b)=>a-b).map(k=>`${k}×${T.dmg[k]}`).join('　')}`);
  say(`- dmg 2..8 全出現：${missing.length?'❌ 缺 '+missing.join(','):'✅'}`);
  say('');
  say('### 27 件法寶的招（trait 觸發次數）');
  say('| # | 法寶 | 系 | 體型 | trait | 招名 | 觸發次數 | 判定 |');
  say('|---|---|---|---|---|---|---|---|');
  let zero=[];
  G.POOL.forEach((it,i)=>{
    const tr=it.unit&&it.unit.trait?G.TRAITS[it.unit.trait]:null;
    const c=tr?(T.tr[tr.id]||0):0;
    if(!tr||!c) zero.push(it.n);
    say(`| ${i+1} | ${it.n} | ${it.f} | ${it.unit?it.unit.body:'—'} | ${tr?tr.id:'**無**'} | ${tr?tr.name:'—'} | ${c} | ${tr&&c?'✅':'❌'} |`);
  });
  say(`- 每件都 >0：${zero.length?'❌ 為 0 或無招：'+zero.join('、'):'✅'}`);
  say('');
  say('### 「只買護法」對三種單一買法（同總價 12 帶，n='+N+'）');
  const ST=styles();
  const wardStyles=ST.filter(s=>s.k.endsWith('/ward'));
  const foeStyles=ST.filter(s=>/\/(swarm|elite|haunt)$/.test(s.k));
  say('| 護法買法 | '+foeStyles.map(s=>s.k).join(' | ')+' | 判定 |');
  say('|---'+'|---'.repeat(foeStyles.length+1)+'|');
  let wardOk=true;
  for(const w of wardStyles){
    const row=foeStyles.map(f=>G.duelBags(w.bag,f.bag,SEEDS).rateDecided);
    const ok=row.every(v=>v>0); if(!ok) wardOk=false;
    say(`| ${w.k}（${w.bag.map(x=>x.n).join('＋')}） | `+row.map(v=>pct(v)).join(' | ')+` | ${ok?'✅':'❌'} |`);
  }
  say('');
  say('### beats 逐拍時間軸');
  /* 「非空」一律排除 kind=beatStart 的拍首標記後再算：拍首標記每場必有 3 筆，
     含它算非空的話這條在所有合法輸入下恆真，量不到任何東西（02 §6.1 第 6 條的恆真式）。
     **這一項只回數字，門檻由主對話另訂**，不併進 D-A9 的過／不過。 */
  const nonEmpty=T.fights-T.emptyBeats;
  say(`- beats 事件總數 ${T.beats}（拍首標記 ${T.beats-T.beatsReal} 筆、實際事件 ${T.beatsReal} 筆）`);
  say(`- 非空比例（排除 beatStart 後）：${nonEmpty}/${T.fights}＝${(T.fights?nonEmpty/T.fights*100:0).toFixed(3)}%　零傷害場次 N＝${T.emptyBeats}　【只回數字，門檻待主對話裁定】`);
  say(`- killed 加總 ${T.killed} vs burned 加總 ${T.burnSum} → ${T.killed===T.burnSum?'✅ 相等':'❌ 不等'}`);
  verdict['D-A9']=(!missing.length&&!zero.length&&wardOk&&T.killed===T.burnSum);
  say(`- 判定：${verdict['D-A9']?'✅':'❌'} ${lap()}`);
  say('');
}

/* ---------------- D-A10 效能 ---------------- */
if(want('D-A10')){
  say('## D-A10 效能（runMany n='+N+'，門檻：ON ≤ OFF 的 3 倍）');
  say(`- OFF ${tOff.toFixed(1)}s　ON ${tOn.toFixed(1)}s　比值 ${(tOff?tOn/tOff:1).toFixed(2)}`);
  verdict['D-A10']=(!tOff||tOn<=tOff*3);
  say(`- 判定：${verdict['D-A10']?'✅':'❌'} ${lap()}`);
  say('');
}

say('## 一覽');
for(const k of Object.keys(verdict)) say(`- ${k}：${verdict[k]?'✅ 過':'❌ 未過'}`);
say(`（總耗時 ${((Date.now()-t0)/1000).toFixed(0)}s）`);

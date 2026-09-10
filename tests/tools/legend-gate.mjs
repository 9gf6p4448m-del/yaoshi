/* 請神 3.0「香火池」閘門治具（2026-09-10）
   驗收條件與門檻凍結於 docs/experiments/2026-09-10-acceptance-legend-v3.md（H0–H11），
   本腳本**不得為了過而調門檻**（門檻數字沿用 2.0 凍結檔 G0–G11，一個不動）。
   跑法（repo 根）：
     git show e83028c:index.html > old-main.html      ★基準＝v0.52（請神 2.0 神債暗標）★
     node tests/tools/legend-gate.mjs 10000 [--only=H0,H1,H2,H3,H4,H9] [--old=old-main.html] [--new=index.html]
   ★基準 SHA 會隨 main 前進而過期★：H0 要證的是「**我這一卷**有沒有漏進 OFF 路徑」，
   所以基準必須是**我併進來的那個 main**（本卷＝`e83028c`，v0.52）。
   本腳本負責 H0 kill switch／H1 優勢策略／H2 活性／H3 節奏／H4 消耗戰／H9 持有者優勢帶。
   H5 單元測試在 tests/legend.test.mjs；H6/H7/H11 的 Playwright 在 legend-drive.mjs；
   H10 的共鳴 diff 見報告（共鳴碼未動就不重跑 resonance-gate.mjs）。
   ★2.0 專屬的量測物已退場★：「尊→夜洗牌」「逐龕香火」「落空的階段獎勵」在 3.0 都不存在，
   照抄舊治具會得到「量不到東西」的假 ✅。3.0 換上來的是：香火池（S.incPool）、
   請神夜逐夜快照（shrineStat.nightPools）、沒人有資格的夜（shrineStat.skipLog）、
   整局燒掉／局末退回（playPolicyGame 回傳的 incBurn／incBack）。
   ★CFG.LEGEND_ON 預設 true★：本腳本仍一律**顯式**設定，不依賴預設。 */
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
const OLD=arg('old')||path.join(ROOT,'old-main.html');
const ONLY=(arg('only')||'').split(',').filter(Boolean);
const want=id=>!ONLY.length||ONLY.includes(id);
const SEEDS=Array.from({length:N},(_,i)=>i+1);
const pct=v=>(v*100).toFixed(2)+'%';
const say=(...s)=>console.log(s.join(' '));
const t0=Date.now(); let tPrev=t0;
const lap=()=>{ const now=Date.now(); const s=`（本段 ${((now-tPrev)/1000).toFixed(1)}s，累計 ${((now-t0)/1000).toFixed(1)}s）`; tPrev=now; return s; };
const verdict={};

const DEF=loadGame(NEW);                        /* 原封不動的預設（H0-b） */
const OFF=loadGame(NEW); OFF.CFG.LEGEND_ON=false;
const G=loadGame(NEW); G.CFG.LEGEND_ON=true;
const O=fs.existsSync(OLD)?loadGame(OLD):null;

say(`# 請神 3.0「香火池」閘門　n=${N}　新版=${path.basename(NEW)}　基準=${path.basename(OLD)}（v0.52＝請神 2.0）`);
say(`預設值：LEGEND_ON=${DEF.CFG.LEGEND_ON}`);
say(`顯式打開後的數值：SHRINE_NIGHTS=${JSON.stringify(G.CFG.SHRINE_NIGHTS)}　INC_MAX=${G.CFG.INC_MAX}　INC_TITHE=${G.CFG.INC_TITHE}　INC_GIFT_P=${G.CFG.INC_GIFT_P}　INC_AI=${JSON.stringify(G.CFG.INC_AI)}`);
say('');

/* ================= H0 kill switch（雙向）================= */
if(want('H0')){
  say('## H0 Kill switch 雙向（**顯式 LEGEND_ON=false** 的 trace(1..20) 與**基準的 OFF 路徑**逐位元組相等；預設必不等；ON 路徑**不再**因尊→夜洗牌消耗 rng）');
  if(!O){ say('❌ 找不到基準檔 '+OLD); verdict.H0=false; }
  else{
    const seeds=Array.from({length:20},(_,i)=>i+1);
    const OO=loadGame(OLD); OO.CFG.LEGEND_ON=false;   /* 基準的 OFF 路徑 */
    const tr=g=>JSON.stringify(g.trace(seeds));
    const baseOff=tr(OO), off=tr(OFF), baseOn=tr(O), def=tr(DEF);
    const eqOff=(off===baseOff), neDef=(def!==baseOn);
    /* 3.0 的三尊：不得帶 night（尊→夜已移除），而且四家的香火池 S.incPool 要建起來 */
    const D2=loadGame(NEW); D2.makeState('solo',1);
    const sh=(D2.S&&D2.S.shrines)?D2.S.shrines:[];
    const noNight=sh.length===3&&sh.every(x=>x.night===undefined&&x.open===true&&x.takenBy===null);
    const hasPool=!!(D2.S&&D2.S.incPool&&D2.S.incPool.length===4&&D2.S.incPool.every(v=>v===0));
    /* ON 不再消耗洗牌 rng：makeState 之後的亂數游標，ON 與 OFF 必須落在同一格
       （2.0 的 shuffle([...SHRINE_NIGHTS]) 會多吃兩個 rng；同一條探針也在 legend.test.mjs H5⑧）。 */
    const nextOf=(file,on)=>{ const g=loadGame(file); g.CFG.LEGEND_ON=on; const S=g.makeState('solo',1); return S.rng(); };
    const rngSame=nextOf(NEW,true)===nextOf(NEW,false);
    const baseRngSame=nextOf(OLD,true)===nextOf(OLD,false);
    say(`- 顯式 LEGEND_ON=false vs 基準 OFF：長度 ${off.length}/${baseOff.length}，${eqOff?'逐位元組相等 ✅':'**不相等** ❌'}`);
    say(`- 新版預設 vs 基準預設：長度 ${def.length}/${baseOn.length}，${neDef?'不相等 ✅':'**相等** ❌（新規則根本沒進牌局）'}`);
    say(`- 預設載入後 makeState('solo',1) 的三尊：${JSON.stringify(sh.map(x=>({i:x.i,fac:x.fac,night:x.night})))}（不得帶 night）${noNight?'✅':'❌'}；四家香火池 ${JSON.stringify(D2.S&&D2.S.incPool)} ${hasPool?'✅':'❌'}`);
    say(`- ON 路徑不再消耗洗牌 rng（makeState 之後 ON 與 OFF 的亂數游標同一格）：本卷 ${rngSame?'相同 ✅':'不同 ❌'}／基準 ${baseRngSame?'相同':'不同（＝基準的洗牌真的在吃 rng，這一條有鑑別力）'}`);
    verdict.H0=eqOff&&neDef&&noNight&&hasPool&&rngSame;
    say(`- 判定：${verdict.H0?'✅':'❌'} ${lap()}`);
  }
  say('');
}

/* ================= H1 優勢策略（六策略＋追價 AI）=================
   判定三條（凍結檔字面，門檻沿用 2.0 G1，一個不動）：
     ① −8pp ≤ incenseMax − splitter ≤ +5pp　② incenseNever ≥ splitter − 8pp　③ 任一策略座位 0 ≤ 40%
   ★策略池的定義一字不改★：出價法一律 splitter，只有燒香法不同（incenseMax 每夜燒滿、
   incenseNever 一輩子不燒、incenseAi 明示走引擎啟發式）。不得換池、不得改策略定義、不得縮 n、不得換 seeds。 */
if(want('H1')){
  say('## H1 優勢策略（座位 0 勝率；−8pp ≤ incenseMax − splitter ≤ +5pp、incenseNever ≥ splitter − 8pp、任一 ≤40%）');
  const pols=['splitter','greedy','hoarder','specialist','incenseMax','incenseNever','incenseAi'];
  const rows={}, base={};
  say('| 策略 | LEGEND_ON=false | 3.0（LEGEND_ON=true） | 位移 | 2.0 基準 | ≤40% |'); say('|---|---|---|---|---|---|');
  let cap=true;
  const B=O?loadGame(OLD):null; if(B) B.CFG.LEGEND_ON=true;
  for(const p of pols){
    const on=G.POLICIES[p]?G.runMany({seeds:SEEDS,policies:{0:G.POLICIES[p]}}).winRate[0]:null;
    rows[p]=on;
    const offP=OFF.POLICIES[p]?OFF.runMany({seeds:SEEDS,policies:{0:OFF.POLICIES[p]}}).winRate[0]:null;
    const bs=(B&&B.POLICIES[p])?B.runMany({seeds:SEEDS,policies:{0:B.POLICIES[p]}}).winRate[0]:null;
    base[p]=bs;
    const pass=on!=null&&on<=0.40; if(!pass) cap=false;
    say(`| ${p} | ${offP==null?'—':pct(offP)} | ${on==null?'—':pct(on)} | ${(offP==null||on==null)?'—':((on-offP)>=0?'+':'')+((on-offP)*100).toFixed(2)+'pp'} | ${bs==null?'—':pct(bs)} | ${pass?'✅':'❌'} |`);
  }
  const sp=rows.splitter, mx=rows.incenseMax, nv=rows.incenseNever;
  const d1=(mx-sp)*100, d2=(nv-sp)*100;
  const c1=d1<=5, c1lo=d1>=-8, c2=d2>=-8;
  const bd1=(base.incenseMax!=null&&base.splitter!=null)?((base.incenseMax-base.splitter)*100):null;
  const bd2=(base.incenseNever!=null&&base.splitter!=null)?((base.incenseNever-base.splitter)*100):null;
  say(`- ① incenseMax − splitter ＝ **${d1>=0?'+':''}${d1.toFixed(2)}pp**　門檻 **−8pp ≤ x ≤ +5pp**`
    +`（上界 ${c1?'✅':'❌'}／下界 ${c1lo?'✅':'❌'}）　（2.0 基準同治具重跑：${bd1==null?'—':(bd1>=0?'+':'')+bd1.toFixed(2)+'pp'}）`);
  say(`- ② incenseNever − splitter ＝ **${d2>=0?'+':''}${d2.toFixed(2)}pp**　門檻 ≥ −8pp ${c2?'✅':'❌'}　（2.0 基準：${bd2==null?'—':(bd2>=0?'+':'')+bd2.toFixed(2)+'pp'}）`);
  say(`- ③ 任一策略座位 0 ≤ 40%：${cap?'✅':'❌'}`);
  say(`- 什麼實作會讓它假綠（凍結檔字面）：拿掉或改寫 incenseMax／splitter 定義；把燒香做成純虧損只過上界（下界擋）。`);
  verdict.H1=c1&&c1lo&&c2&&cap;
  say(`- 判定：${verdict.H1?'✅':'❌'} ${lap()}`); say('');
}

/* ================= H2／H3／H4／H9：預設 AI 桌逐局統計 ================= */
let games=null;
if(want('H2')||want('H3')||want('H4')||want('H9')) games=SEEDS.map(s=>G.playPolicyGame(s,{}));

if(want('H2')){
  say('## H2 活性（≥80% 的局至少一尊被請走；供奉回天**兩個口徑**都落在 1%～20%；三尊被同一人請走的局＝0）');
  let any=0, titheAll=0, titheAlive=0, same=0; const taken=[0,0,0]; let locked=0, takenSum=0;
  let evAll=0, evSame=0, evNext=0, evLater=0, evAlive=0;
  const skipByNight={}; const reachByNight={};
  (G.CFG.SHRINE_NIGHTS||[]).forEach(n=>{ skipByNight[n]=0; reachByNight[n]=0; });
  games.forEach(g=>{
    const t=g.shrines.filter(sh=>sh.takenBy!=null);
    if(t.length) any++;
    takenSum+=t.length;
    t.forEach(sh=>taken[sh.i]++);
    if(new Set(t.map(sh=>sh.takenBy)).size<t.length) same++;
    if((g.shrineStat.titheLost|0)>0) titheAll++;
    let aliveHit=false;
    (g.shrineStat.titheLostLog||[]).forEach(e=>{
      if(e.why&&e.why!=='供奉不起') return;                 /* 只算「付不出」那一類，不含主動送神回天 */
      evAll++;
      const dead=!(g.finalLife[e.pid]>0&&g.survival[e.pid]>=g.gameLength);
      if(!dead){ evAlive++; aliveHit=true; }
      else if(g.survival[e.pid]===e.round) evSame++;
      else if(g.survival[e.pid]===e.round+1) evNext++;
      else evLater++;
    });
    if(aliveHit) titheAlive++;
    locked+=g.shrineStat.locked|0;
    /* 逐夜「沒人有資格」：分母＝這一局真的走到了那一夜（局長 ≥ 該夜），分子＝那一夜 skip */
    (G.CFG.SHRINE_NIGHTS||[]).forEach(n=>{ if(g.gameLength>=n) reachByNight[n]++; });
    (g.shrineStat.skipLog||[]).forEach(n=>{ if(skipByNight[n]!==undefined) skipByNight[n]++; });
  });
  const anyR=any/N, tAll=titheAll/N, tAlive=titheAlive/N;
  const seat={0:0,ai:0}; let overWarn=0;
  games.forEach(g=>{
    const seen={};
    (g.shrineStat.titheLostLog||[]).forEach(e=>{
      if(e.why&&e.why!=='供奉不起') return;
      if((e.life|0)>G.CFG.TITHE_WARN) overWarn++;
      const k=(e.pid===0)?0:'ai';
      if(!seen[k]){ seen[k]=1; seat[k]++; }
    });
  });
  say('| 項目 | 值 | 門檻 | 判定 |'); say('|---|---|---|---|');
  say(`| 至少一尊被請走的局 | ${pct(anyR)} | ≥80% | ${anyR>=0.80?'✅':'❌'} |`);
  say(`| **斷供後仍活到局末**的供奉回天（新口徑） | **${pct(tAlive)}** | 1%～20% | ${(tAlive>=0.01&&tAlive<=0.20)?'✅':'❌'} |`);
  say(`| **任何「付不出供奉」都算**（原口徑） | **${pct(tAll)}** | 1%～20% | ${(tAll>=0.01&&tAll<=0.20)?'✅':'❌'} |`);
  say(`| 三尊被同一人請走的局 | ${same} | ＝0 | ${same===0?'✅':'❌'} |`);
  say(`- 記錄項（**不判**）：平均被請走的尊數 **${(takenSum/N).toFixed(2)}**／局（2.0 基準 3000 局＝2.23）。`);
  say(`- 記錄項（**不判**）：各請神夜「沒有人有資格 ⇒ 不結算」的比例——`
    +(G.CFG.SHRINE_NIGHTS||[]).map(n=>`第 ${n} 夜 ${reachByNight[n]?((skipByNight[n]/reachByNight[n])*100).toFixed(1):'—'}%（${skipByNight[n]}/${reachByNight[n]} 局走到）`).join('　'));
  say(`- 記錄項：「付不出供奉」事件 ${evAll} 筆 → **當夜就出局 ${evSame}（${evAll?(evSame/evAll*100).toFixed(1):'—'}%）**`
    +`・下一夜出局 ${evNext}（${evAll?(evNext/evAll*100).toFixed(1):'—'}%）・更晚出局 ${evLater}`
    +`・**活到局末 ${evAlive}（${evAll?(evAlive/evAll*100).toFixed(1):'—'}%）**。`);
  say(`- 記錄項（揭露，**不判**）：分席次的「付不出供奉」局數——**座位 0（headless 的真人席，永不主動放手）${seat[0]}**`
    +`／AI 席 1–3 合計 ${seat.ai}。座位 0 沒有人讀 S.titheAsk，所以它的行為是「一路照付到付不出為止」。`);
  say(`- 記錄項（揭露，**不判**）：斷供當下 life>${G.CFG.TITHE_WARN}（還有餘裕卻付不出）的事件 **${overWarn}** 筆`
    +`——付得起就會付，所以這一格照理應該是 0；不是 0 就代表夜末結算順序出了問題。`);
  G.LEGENDS.forEach((L,i)=>say(`- 記錄項：「${L.n}」被請走的局 ${pct(taken[i]/N)}`));
  say(`- 記錄項：「一人一尊」擋下的封籤 ${locked} 筆（預設 AI 桌全走 aiIncense，它自己會查 hasLegend ⇒ 這一格本來就是 0，下一行才是真的在量引擎側那道鎖）`);
  {
    /* 預設桌的 AI 啟發式自己就查 hasLegend，所以「引擎側拒收」在預設桌上**永遠不會觸發**。
       另跑一批把座位 0 換成 policyIncenseMax（它只看「還有沒有開著的尊」、不查 hasLegend），
       讓 resolveShrines 裡那道 `if(hasLegend(p))` 在真實路徑上真的被走到。 */
    const M=Math.min(N,2000); let lk=0, games2=0, dbl=0;
    for(let sd=1;sd<=M;sd++){
      const r=G.playPolicyGame(sd,{0:G.POLICIES.incenseMax});
      lk+=r.shrineStat.locked|0; games2++;
      const t=r.shrines.filter(sh=>sh.takenBy!=null);
      if(new Set(t.map(sh=>sh.takenBy)).size<t.length) dbl++;
    }
    say(`- 記錄項（**不判**）：座位 0 換成 \`incenseMax\`（不查 hasLegend）跑 ${games2} 局 →`
      +` 引擎側「一人一尊」拒收封籤 **${lk}** 筆（>0 才代表那道鎖在真實路徑上被走到）；`
      +`同一批的「三尊落在同一人」局數 **${dbl}**（必須是 0）。`);
  }
  const st=games.reduce((a,g)=>{ Object.keys(g.shrineStat).forEach(k=>{ if(typeof g.shrineStat[k]==='number') a[k]=(a[k]||0)+g.shrineStat[k]; }); return a; },{});
  say(`- 累計：燒香 ${st.burn} 次共 ${st.burnLife} 壽命・請走 ${st.taken}・局末結清 ${st.rewards} 次（含小法寶 ${st.gifts}）・回天 ${st.dawn} 尊・沒人有資格的請神夜 ${st.skip} 次・供奉付出 ${st.tithe} 壽命／斷供 ${st.titheLost} 尊／主動送神 ${st.titheGiveUp} 尊`);
  verdict.H2=anyR>=0.80&&tAlive>=0.01&&tAlive<=0.20&&tAll>=0.01&&tAll<=0.20&&same===0;
  say(`- 判定：${verdict.H2?'✅':'❌'} ${lap()}`); say('');
}

if(want('H3')){
  say('## H3 節奏（預設 AI 桌中位局長 10～12 夜；splitter／greedy／hoarder 三策略勝率位移 ≤ ±2pp，相對 v0.52 基準同治具重跑）');
  const lens=games.map(g=>g.gameLength).sort((a,b)=>a-b);
  const med=lens[Math.floor(lens.length/2)];
  const avg=lens.reduce((a,b)=>a+b,0)/lens.length;
  const dist={}; lens.forEach(l=>dist[l]=(dist[l]||0)+1);
  say(`- 中位 **${med}** 夜（門檻 10～12）　平均 ${avg.toFixed(2)} 夜`);
  say(`- 分布：${Object.keys(dist).sort((a,b)=>a-b).map(k=>`${k}夜 ${(dist[k]/N*100).toFixed(1)}%`).join('　')}`);
  const M=Math.min(N,2000), sub=SEEDS.slice(0,M);
  let shift=true;
  if(O){
    const B=loadGame(OLD); B.CFG.LEGEND_ON=true;
    say('| 策略 | v0.52 基準（2.0） | 3.0 | 位移 | ≤±2pp |'); say('|---|---|---|---|---|');
    for(const p of ['splitter','greedy','hoarder']){
      const a=B.runMany({seeds:sub,policies:{0:B.POLICIES[p]}}).winRate[0];
      const b=G.runMany({seeds:sub,policies:{0:G.POLICIES[p]}}).winRate[0];
      const d=(b-a)*100, okd=Math.abs(d)<=2; if(!okd) shift=false;
      say(`| ${p} | ${pct(a)} | ${pct(b)} | ${d>=0?'+':''}${d.toFixed(2)}pp | ${okd?'✅':'❌'} |`);
    }
    say(`（三策略位移用前 ${M} 顆種子；門檻由凍結檔訂在 ±2pp）`);
  }else{ say('- ⚠️ 找不到基準檔，三策略位移未量'); shift=false; }
  verdict.H3=med>=10&&med<=12&&shift;
  say(`- 判定：${verdict.H3?'✅':'❌'} ${lap()}`); say('');
}

if(want('H4')){
  say('## H4 消耗戰（每個請神夜：燒香累計前三名的平均投入 ≤ 9 壽命；落空者平均淨損（整局燒掉 − 局末結清退回）≤ 6 壽命）');
  /* 量法：每個請神夜結算**之前**引擎記下的四家香火池快照（shrineStat.nightPools，引擎記的、治具不重算）。
     前三名＝該夜四家香火池由大到小的前三個。
     落空者＝整局燒過香、卻**一尊都沒請到**的人；淨損＝incBurn − incBack（兩個都是引擎記的）。 */
  const byNight={}; const loss=[];
  (G.CFG.SHRINE_NIGHTS||[]).forEach(n=>byNight[n]=[]);
  games.forEach(g=>{
    (g.shrineStat.nightPools||[]).forEach(np=>{
      const h=[...np.h].sort((a,b)=>b-a);
      (byNight[np.round]=byNight[np.round]||[]).push((h[0]+h[1]+h[2])/3);
    });
    const holders=new Set(g.holders||[]);
    (g.incBurn||[]).forEach((b,i)=>{ if(b>0&&!holders.has(i)) loss.push(b-((g.incBack&&g.incBack[i])|0)); });
  });
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  let okA=true;
  say('| 請神夜 | 結算次數 | 前三名平均投入 | 最大單場 | ≤9 |'); say('|---|---|---|---|---|');
  Object.keys(byNight).sort((a,b)=>a-b).forEach(n=>{
    const a=byNight[n], v=avg(a), mx=a.length?Math.max(...a):0, p=v<=9; if(!p) okA=false;
    say(`| 第 ${n} 夜 | ${a.length} | **${v.toFixed(2)}** | ${mx.toFixed(2)} | ${p?'✅':'❌'} |`);
  });
  const lv=avg(loss), okB=lv<=6;
  say(`- 落空者平均淨損（${loss.length} 人次；整局燒掉 − 局末結清退回）：**${lv.toFixed(2)}** 壽命　門檻 ≤6 ${okB?'✅':'❌'}`);
  say(`- 什麼實作會讓它紅：AI 追價沒有停損、三家互追到死（凍結檔字面）。`);
  say(`- 什麼實作會讓它假綠：把局末結清調高到補足損失——那會讓 H1 紅（兩條互相牽制，凍結檔字面）。`);
  verdict.H4=okA&&okB;
  say(`- 判定：${verdict.H4?'✅':'❌'} ${lap()}`); say('');
}

if(want('H9')){
  /* 口徑沿用 2.0 凍結檔 §2.1 修訂二（使用者裁定）：
     判定＝「持有者局勝率 − **零效果對照**（三尊 unit 不上場**且**拿掉 eff，同一批種子）」∈ [+3pp,+10pp]，
     另加絕對上限 ≤85%。絕對值與零效果對照值列記錄項、不判。 */
  const LO=3, HI=10;
  say(`## H9 持有者優勢帶（「持有者局勝率 − **零效果對照**」∈ [+${LO}pp, +${HI}pp]；絕對局勝率 ≤85%）`);
  const measure=gs=>{
    let a=0,w=0,nullExp=0; const hc={0:0,1:0,2:0,3:0};
    gs.forEach(g=>{ hc[g.holders.length]=(hc[g.holders.length]||0)+1;
      if(!g.holders.length) return; a++; if(g.holders.includes(g.winnerId)) w++; nullExp+=g.holders.length/4; });
    return {r:a?w/a:0, w, a, nul:a?nullExp/a:0, hc};
  };
  const cur=measure(games);
  const mk=fn=>{ const g2=loadGame(NEW); g2.CFG.LEGEND_ON=true; fn(g2); return measure(SEEDS.map(s=>g2.playPolicyGame(s,{}))); };
  const zero=mk(g2=>g2.LEGENDS.forEach(L=>{ L.unit={body:'ward',count:0,atk:0,hp:0}; delete L.eff; }));
  const noRes=mk(g2=>g2.LEGENDS.forEach(L=>{ delete L.eff; }));
  const noUnit=mk(g2=>g2.LEGENDS.forEach(L=>{ L.unit={body:'ward',count:0,atk:0,hp:0}; }));
  const d=(cur.r-zero.r)*100;
  say(`- 現行（A）：**${pct(cur.r)}**（${cur.w}/${cur.a}）`);
  say(`- **零效果對照（B）**：三尊 unit 不上場**且**拿掉 eff（傳說共鳴），同一批 ${N} 顆種子：**${pct(zero.r)}**（${zero.w}/${zero.a}）`);
  say(`- 記錄項（不判）拆解：只拿掉共鳴（D，unit 照舊）${pct(noRes.r)}　／　只拿掉戰力（C，eff 照舊）${pct(noUnit.r)}`
    +`　⇒ 戰力貢獻約 ${((cur.r-noUnit.r)*100).toFixed(2)}pp、共鳴貢獻約 ${((cur.r-noRes.r)*100).toFixed(2)}pp`);
  say(`- **差值（A − B）＝${d>=0?'+':''}${d.toFixed(2)}pp**　門檻 [+${LO}pp, +${HI}pp] ${(d>=LO&&d<=HI)?'✅':'❌'}`);
  const ABS=0.85, absOK=cur.r<=ABS;
  say(`- **絕對上限**：持有者局勝率 ${pct(cur.r)}　門檻 ≤${(ABS*100).toFixed(0)}% ${absOK?'✅':'❌'}`);
  say(`- 記錄項（不判）：持有者人數分布（局）${Object.keys(cur.hc).sort().map(k=>`${k} 人 ${cur.hc[k]}`).join('　')}；`
    +`虛無模型「贏家在四席之間隨機」的期望值＝**${pct(cur.nul)}**。`);
  verdict.H9=(d>=LO&&d<=HI)&&absOK;
  say(`- 判定：${verdict.H9?'✅':'❌'} ${lap()}`);
  say(`- 凍結檔字面：低於 +3 或高於 +10 → **任何調整都要使用者裁**，治具不得自調。`);
  say('');
}

say('## 總表'); say('```'); say(JSON.stringify(verdict,null,1)); say('```');

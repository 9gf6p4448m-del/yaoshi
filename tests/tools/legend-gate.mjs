/* 請神 2.0「神債暗標」閘門治具（2026-09-07）
   驗收條件與門檻凍結於 docs/experiments/2026-09-07-acceptance-legend-v2.md（G0–G11），
   本腳本**不得為了過而調門檻**。
   跑法（repo 根）：
     git show b38980a:index.html > old-l.html       ★G1 的「1.0 對照」與 G5 鑑別力用的基準（請神 1.0）★
     git show origin/main:index.html > old-main.html ★G0 用的基準：**當下的 main**★
     node tests/tools/legend-gate.mjs 10000 [--only=G0,G1,G2,G3,G4,G9] [--old=old-main.html] [--new=index.html]
   ★G0 的基準 SHA 會隨 main 前進而過期（同 GUIDE §11.20 第 1 點的 ca14065→ff227a7 那個坑）★：
   G0 要證的是「**我這一卷**有沒有漏進 OFF 路徑」，所以基準必須是**我併進來的那個 main**。
   併入 v0.47 角色平衡卷（`5a3c56b`）之後，OFF 路徑本來就跟 `b38980a` 不同了（ROLES／pwSide 都動過），
   拿 `b38980a` 跑 G0 會得到 332125 vs 339303 的**假 ❌**。
   本腳本負責 G0 kill switch／G1 優勢策略／G2 活性／G3 節奏／G4 消耗戰／G9 持有者優勢帶。
   ★G2 與 G9 的判定口徑已依凍結檔 §2.1（修訂一／二，2026-09-07 使用者裁定）改寫★：
     G2「供奉回天」判「斷供後仍活到局末」的局；G9 判「持有者局勝率 − 零戰力對照」的差值。
     兩條都**同時印原口徑與新口徑**，原口徑列記錄項、不判——改寫的理由與改前／改後數字在凍結檔 §2.1。
   G5 單元測試在 tests/legend.test.mjs；G6/G7/G11 的 Playwright 在 legend-drive.mjs；
   G10 的 R2′／R3 在 resonance-gate.mjs；G8 文件與 diff 範圍見報告。
   ★1.0 的 L0–L5／A1／A6 已整組退場★：擲骰、天井、洗牌都不存在了，A1（擲序公平性）與 A6（天井鎖死）
   量的東西在 2.0 沒有對應物，照抄會得到「量不到東西」的假 ✅。
   ★CFG.LEGEND_ON 預設 true★：本腳本仍一律**顯式**設定，不依賴預設；G0 的兩支口徑是
   「顯式 LEGEND_ON=false」要與**基準的 OFF 路徑**逐位元組相等、「兩邊的預設」必須不相等。 */
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
const OLD=arg('old')||path.join(ROOT,'old-l.html');
const ONLY=(arg('only')||'').split(',').filter(Boolean);
const want=id=>!ONLY.length||ONLY.includes(id);
const SEEDS=Array.from({length:N},(_,i)=>i+1);
const pct=v=>(v*100).toFixed(2)+'%';
const say=(...s)=>console.log(s.join(' '));
const t0=Date.now(); let tPrev=t0;
const lap=()=>{ const now=Date.now(); const s=`（本段 ${((now-tPrev)/1000).toFixed(1)}s，累計 ${((now-t0)/1000).toFixed(1)}s）`; tPrev=now; return s; };
const verdict={};

const DEF=loadGame(NEW);                        /* 原封不動的預設（G0-b） */
const OFF=loadGame(NEW); OFF.CFG.LEGEND_ON=false;
const G=loadGame(NEW); G.CFG.LEGEND_ON=true;
const O=fs.existsSync(OLD)?loadGame(OLD):null;

say(`# 請神 2.0「神債暗標」閘門　n=${N}　新版=${path.basename(NEW)}　基準=${path.basename(OLD)}`);
say(`預設值：LEGEND_ON=${DEF.CFG.LEGEND_ON}`);
say(`顯式打開後的數值：SHRINE_NIGHTS=${JSON.stringify(G.CFG.SHRINE_NIGHTS)}　INC_MAX=${G.CFG.INC_MAX}　INC_TITHE=${G.CFG.INC_TITHE}　INC_GIFT_P=${G.CFG.INC_GIFT_P}　INC_AI=${JSON.stringify(G.CFG.INC_AI)}`);
say('');

/* ================= G0 kill switch（雙向）================= */
if(want('G0')){
  say('## G0 Kill switch 雙向（**顯式 LEGEND_ON=false** 的 trace(1..20) 與**基準的 OFF 路徑**逐位元組相等；預設必不等且 S.shrines 三龕各帶 night∈SHRINE_NIGHTS 且互異）');
  if(!O){ say('❌ 找不到基準檔 '+OLD); verdict.G0=false; }
  else{
    const seeds=Array.from({length:20},(_,i)=>i+1);
    const OO=loadGame(OLD); OO.CFG.LEGEND_ON=false;   /* 基準的 OFF 路徑 */
    const tr=g=>JSON.stringify(g.trace(seeds));
    const baseOff=tr(OO), off=tr(OFF), baseOn=tr(O), def=tr(DEF);
    const eqOff=(off===baseOff), neDef=(def!==baseOn);
    const D2=loadGame(NEW); D2.makeState('solo',1);
    const nights=(D2.S&&D2.S.shrines)?D2.S.shrines.map(s=>s.night):[];
    const NI=D2.CFG.SHRINE_NIGHTS||[];
    const shrinesOK=nights.length===3&&nights.every(n=>NI.includes(n))&&new Set(nights).size===3;
    say(`- 顯式 LEGEND_ON=false vs 基準 OFF：長度 ${off.length}/${baseOff.length}，${eqOff?'逐位元組相等 ✅':'**不相等** ❌'}`);
    say(`- 新版預設 vs 基準預設：長度 ${def.length}/${baseOn.length}，${neDef?'不相等 ✅':'**相等** ❌（新規則根本沒進牌局）'}`);
    say(`- 預設載入後 makeState('solo',1) 的三龕請神夜：${JSON.stringify(nights)}（SHRINE_NIGHTS=${JSON.stringify(NI)}）${shrinesOK?'✅':'❌'}`);
    verdict.G0=eqOff&&neDef&&shrinesOK;
    say(`- 判定：${verdict.G0?'✅':'❌'} ${lap()}`);
  }
  say('');
}

/* ================= G1 優勢策略（六策略＋追價 AI）=================
   判定三條（凍結檔字面）：
     ① incenseMax − splitter ≤ +5pp　② incenseNever ≥ splitter − 8pp　③ 任一策略座位 0 ≤ 40%
   量法固定用本檔的策略池（出價法一律 splitter，只有燒香法不同），不得換池、不得改策略定義。
   基準（1.0）數字：incenseMax 33.68／splitter 22.96／incenseNever 15.77。 */
if(want('G1')){
  say('## G1 優勢策略（座位 0 勝率；incenseMax − splitter ≤ +5pp、incenseNever ≥ splitter − 8pp、任一 ≤40%）');
  const pols=['splitter','greedy','hoarder','specialist','incenseMax','incenseNever','incenseAi'];
  const rows={};
  say('| 策略 | LEGEND_ON=false | LEGEND_ON=true | 位移 | ≤40% |'); say('|---|---|---|---|---|');
  let cap=true;
  for(const p of pols){
    const on=G.POLICIES[p]?G.runMany({seeds:SEEDS,policies:{0:G.POLICIES[p]}}).winRate[0]:null;
    rows[p]=on;
    const offP=OFF.POLICIES[p]?OFF.runMany({seeds:SEEDS,policies:{0:OFF.POLICIES[p]}}).winRate[0]:null;
    const pass=on!=null&&on<=0.40; if(!pass) cap=false;
    say(`| ${p} | ${offP==null?'—':pct(offP)} | ${on==null?'—':pct(on)} | ${(offP==null||on==null)?'—':((on-offP)>=0?'+':'')+((on-offP)*100).toFixed(2)+'pp'} | ${pass?'✅':'❌'} |`);
  }
  const sp=rows.splitter, mx=rows.incenseMax, nv=rows.incenseNever;
  const d1=(mx-sp)*100, d2=(nv-sp)*100;
  const c1=d1<=5, c2=d2>=-8;
  say(`- ① incenseMax − splitter ＝ **${d1>=0?'+':''}${d1.toFixed(2)}pp**　門檻 ≤ +5pp ${c1?'✅':'❌'}　（1.0 基準：+10.72pp）`);
  say(`- ② incenseNever − splitter ＝ **${d2>=0?'+':''}${d2.toFixed(2)}pp**　門檻 ≥ −8pp ${c2?'✅':'❌'}　（1.0 基準：−7.19pp）`);
  say(`- ③ 任一策略座位 0 ≤ 40%：${cap?'✅':'❌'}`);
  verdict.G1=c1&&c2&&cap;
  say(`- 判定：${verdict.G1?'✅':'❌'} ${lap()}`); say('');
}

/* ================= G2／G3／G4／G9：預設 AI 桌逐局統計 ================= */
let games=null;
if(want('G2')||want('G3')||want('G4')||want('G9')) games=SEEDS.map(s=>G.playPolicyGame(s,{}));

if(want('G2')){
  /* ★2026-09-07 依凍結檔 §2.1 修訂一改寫（使用者裁定）★：
     「供奉回天」那一格的判定口徑改成「斷供之後**仍活到局末**的局」，**原口徑（含死亡螺旋）改列記錄項、不判**。
     原標準把「玩家反正就要出局那一兩夜付不出供奉」也算成「養不起神」——實測 79% 的斷供落在出局當夜或次夜。
     兩個口徑一起印，改寫前後對得起來（改前 42.51% ❌／改後 6.2% ✅）。 */
  say('## G2 活性（≥80% 的局至少一尊被請走；**斷供後仍活到局末**的供奉回天落在 1%～20% 的局〔§2.1 修訂一〕；三尊被同一人請走的局＝0）');
  let any=0, titheAll=0, titheAlive=0, same=0; const taken=[0,0,0]; let voidDawn=0, locked=0;
  let evAll=0, evSame=0, evNext=0, evLater=0, evAlive=0;
  games.forEach(g=>{
    const t=g.shrines.filter(sh=>sh.takenBy!=null);
    if(t.length) any++;
    t.forEach(sh=>taken[sh.i]++);
    if(new Set(t.map(sh=>sh.takenBy)).size<t.length) same++;
    if((g.shrineStat.titheLost|0)>0) titheAll++;
    /* 新口徑：這一局有沒有「斷供之後仍活到局末」的持有者。
       判準走 playPolicyGame 已經回傳的欄位（survival＝死亡夜、finalLife），治具不另建模型。 */
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
    voidDawn+=g.shrineStat.voidDawn|0; locked+=g.shrineStat.locked|0;
  });
  const anyR=any/N, tAll=titheAll/N, tAlive=titheAlive/N;
  say('| 項目 | 值 | 門檻 | 判定 |'); say('|---|---|---|---|');
  say(`| 至少一尊被請走的局 | ${pct(anyR)} | ≥80% | ${anyR>=0.80?'✅':'❌'} |`);
  say(`| **斷供後仍活到局末**的供奉回天（新口徑，判定用） | **${pct(tAlive)}** | 1%～20% | ${(tAlive>=0.01&&tAlive<=0.20)?'✅':'❌'} |`);
  say(`| 三尊被同一人請走的局 | ${same} | ＝0 | ${same===0?'✅':'❌'} |`);
  say(`- 記錄項（**舊口徑、不判**）：任何「付不出供奉」都算的局比例 ${pct(tAll)}——`
    +`§2.1 修訂一之前就是判這一格（改寫當下 42.51% ❌）。`);
  say(`- 記錄項：「付不出供奉」事件 ${evAll} 筆 → **當夜就出局 ${evSame}（${evAll?(evSame/evAll*100).toFixed(1):'—'}%）**`
    +`・下一夜出局 ${evNext}（${evAll?(evNext/evAll*100).toFixed(1):'—'}%）・更晚出局 ${evLater}`
    +`・**活到局末 ${evAlive}（${evAll?(evAlive/evAll*100).toFixed(1):'—'}%）**`
    +`——這就是改口徑的理由：舊口徑量到的大多是死亡螺旋的副產品，不是「養不起神」這個決策。`);
  G.LEGENDS.forEach((L,i)=>say(`- 記錄項：「${L.n}」被請走的局 ${pct(taken[i]/N)}`));
  say(`- 記錄項：請神夜無人上香而回天的龕 ${voidDawn} 座；「一人一尊」擋下的封籤 ${locked} 筆`);
  const st=games.reduce((a,g)=>{ Object.keys(g.shrineStat).forEach(k=>{ if(typeof g.shrineStat[k]==='number') a[k]=(a[k]||0)+g.shrineStat[k]; }); return a; },{});
  say(`- 累計：燒香 ${st.burn} 次共 ${st.burnLife} 壽命・請走 ${st.taken}・階段獎勵 ${st.rewards} 次（含小法寶 ${st.gifts}）・回天 ${st.dawn} 龕・供奉付出 ${st.tithe} 壽命／斷供 ${st.titheLost} 尊／主動送神 ${st.titheGiveUp} 尊`);
  verdict.G2=anyR>=0.80&&tAlive>=0.01&&tAlive<=0.20&&same===0;
  say(`- 判定：${verdict.G2?'✅':'❌'} ${lap()}`); say('');
}

if(want('G3')){
  say('## G3 節奏（預設 AI 桌中位局長 10～12 夜；三策略位移 ≤ ±2pp）');
  const lens=games.map(g=>g.gameLength).sort((a,b)=>a-b);
  const med=lens[Math.floor(lens.length/2)];
  const avg=lens.reduce((a,b)=>a+b,0)/lens.length;
  const dist={}; lens.forEach(l=>dist[l]=(dist[l]||0)+1);
  say(`- 中位 **${med}** 夜（門檻 10～12）　平均 ${avg.toFixed(2)} 夜`);
  say(`- 分布：${Object.keys(dist).sort((a,b)=>a-b).map(k=>`${k}夜 ${(dist[k]/N*100).toFixed(1)}%`).join('　')}`);
  /* 三策略位移：相對 0.44 基準（＝OLD 的預設路徑，請神 1.0）。門檻 ±2pp。 */
  const M=Math.min(N,2000), sub=SEEDS.slice(0,M);
  let shift=true;
  if(O){
    const B=loadGame(OLD); B.CFG.LEGEND_ON=true;
    say('| 策略 | 0.44 基準 | 2.0 | 位移 | ≤±2pp |'); say('|---|---|---|---|---|');
    for(const p of ['splitter','greedy','hoarder']){
      const a=B.runMany({seeds:sub,policies:{0:B.POLICIES[p]}}).winRate[0];
      const b=G.runMany({seeds:sub,policies:{0:G.POLICIES[p]}}).winRate[0];
      const d=(b-a)*100, okd=Math.abs(d)<=2; if(!okd) shift=false;
      say(`| ${p} | ${pct(a)} | ${pct(b)} | ${d>=0?'+':''}${d.toFixed(2)}pp | ${okd?'✅':'❌'} |`);
    }
    say(`（三策略位移用前 ${M} 顆種子；門檻由凍結檔訂在 ±2pp）`);
  }else{ say('- ⚠️ 找不到基準檔，三策略位移未量'); shift=false; }
  verdict.G3=med>=10&&med<=12&&shift;
  say(`- 判定：${verdict.G3?'✅':'❌'} ${lap()}`); say('');
}

if(want('G4')){
  say('## G4 消耗戰（每個請神夜：燒香總量前三名的平均投入 ≤ 9 壽命；落空者平均淨損（燒掉 − 階段獎勵退回）≤ 6 壽命）');
  /* 量法：每一座「在自己的請神夜開標」的龕，取關龕當下的四家香火快照 closeH（引擎記的，不是治具重算）。
     前三名＝該龕 h 由大到小的前三個；落空者＝h>0 且不是得標者的每一位，淨損＝h − 該龕退回的壽命 closeBack。 */
  const byNight={}; const loss=[];
  (G.CFG.SHRINE_NIGHTS||[]).forEach(n=>byNight[n]=[]);
  games.forEach(g=>g.shrines.forEach(sh=>{
    if(!sh.closeH||sh.round!==sh.night) return;    /* 只算真的走到「請神夜開標」的那些（提早收攤的另計） */
    const h=[...sh.closeH].sort((a,b)=>b-a);
    (byNight[sh.night]=byNight[sh.night]||[]).push((h[0]+h[1]+h[2])/3);
    sh.closeH.forEach((v,i)=>{ if(v>0&&i!==sh.takenBy) loss.push(v-((sh.closeBack&&sh.closeBack[i])|0)); });
  }));
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  let okA=true;
  say('| 請神夜 | 開標次數 | 前三名平均投入 | 最大單場 | ≤9 |'); say('|---|---|---|---|---|');
  Object.keys(byNight).sort((a,b)=>a-b).forEach(n=>{
    const a=byNight[n], v=avg(a), mx=a.length?Math.max(...a):0, p=v<=9; if(!p) okA=false;
    say(`| 第 ${n} 夜 | ${a.length} | **${v.toFixed(2)}** | ${mx.toFixed(2)} | ${p?'✅':'❌'} |`);
  });
  const lv=avg(loss), okB=lv<=6;
  say(`- 落空者平均淨損（${loss.length} 人次）：**${lv.toFixed(2)}** 壽命　門檻 ≤6 ${okB?'✅':'❌'}`);
  say(`- 什麼實作會讓它紅：AI 追價沒有停損、三家互追到死（凍結檔字面）。`);
  verdict.G4=okA&&okB;
  say(`- 判定：${verdict.G4?'✅':'❌'} ${lap()}`); say('');
}

if(want('G9')){
  /* ★2026-09-07 依凍結檔 §2.1 修訂二改寫（使用者裁定）★：
     判定改成「持有者局勝率 − **零戰力對照**（三尊 unit 不上場、其餘完全相同、同一批種子）」∈ [+3pp,+10pp]，
     **絕對值（舊口徑）與零戰力對照值改列記錄項、不判**。
     原標準恆假：一人一尊之後每局平均 2.25 位持有者，「贏家全隨機」的無資訊期望就是 ~56.4%，
     而零戰力對照（傳說完全沒用）實測仍有 67.57% ⇒ 舊帶 [45,60] 用任何實作都到不了。 */
  const LO=3, HI=10;   /* 凍結檔 §2.1 修訂二的新帶（pp） */
  say(`## G9 持有者優勢帶〔§2.1 修訂二〕（「持有者局勝率 − 零戰力對照」∈ [+${LO}pp, +${HI}pp]；兩邊分子都是持有者贏的局、分母都是至少一尊被請走的局）`);
  const measure=games=>{
    let a=0,w=0,nullExp=0; const hc={0:0,1:0,2:0,3:0};
    games.forEach(g=>{ hc[g.holders.length]=(hc[g.holders.length]||0)+1;
      if(!g.holders.length) return; a++; if(g.holders.includes(g.winnerId)) w++; nullExp+=g.holders.length/4; });
    return {r:a?w/a:0, w, a, nul:a?nullExp/a:0, hc};
  };
  const cur=measure(games);
  /* 零戰力對照：**同一批種子**、只把三尊的 unit 換成不上場，其餘一行不動（記憶體覆寫，index.html 沒動） */
  const gz=loadGame(NEW); gz.CFG.LEGEND_ON=true;
  gz.LEGENDS.forEach(L=>{ L.unit={body:'ward',count:0,atk:0,hp:0}; });
  const zero=measure(SEEDS.map(s=>gz.playPolicyGame(s,{})));
  const d=(cur.r-zero.r)*100;
  say(`- 現行：**${pct(cur.r)}**（${cur.w}/${cur.a}）`);
  say(`- 零戰力對照（三尊 unit 不上場、其餘完全相同、同一批 ${N} 顆種子）：**${pct(zero.r)}**（${zero.w}/${zero.a}）`);
  say(`- **差值＝${d>=0?'+':''}${d.toFixed(2)}pp**　門檻 [+${LO}pp, +${HI}pp] ${(d>=LO&&d<=HI)?'✅':'❌'}`);
  say(`- 記錄項（**舊口徑、不判**）：絕對值 ${pct(cur.r)}——§2.1 修訂二之前就是拿它對 [45%,60%]（改寫當下 74.25% ❌）。`);
  say(`- 記錄項（不判）：持有者人數分布（局）${Object.keys(cur.hc).sort().map(k=>`${k} 人 ${cur.hc[k]}`).join('　')}；`
    +`虛無模型「贏家在四席之間隨機」的期望值＝**${pct(cur.nul)}**——一人一尊之後每局最多三位持有者，`
    +`所以絕對值的無資訊基準線本來就接近 ${pct(cur.nul)}，不是 25%；這正是舊口徑恆假的原因。`);
  verdict.G9=(d>=LO&&d<=HI);
  say(`- 判定：${verdict.G9?'✅':'❌'} ${lap()}`); say('');
  /* 使用者裁定用的選項對照（**只在記憶體裡改，不動 index.html、不是判定依據**）：
     凍結檔（改寫後）明訂「低於 +3pp → 供奉降回 0；高於 +10pp → 供奉 2 或本體下修，任一調整都要使用者裁、不得自調」。 */
  if(N>=1000){
    const M=Math.min(N,2000), sub=SEEDS.slice(0,M);
    const run=fn=>{ const g2=loadGame(NEW); g2.CFG.LEGEND_ON=true; fn(g2); let a=0,w=0;
      for(const s of sub){ const r=g2.playPolicyGame(s,{}); if(r.holders.length){ a++; if(r.holders.includes(r.winnerId)) w++; } }
      return a?w/a:0; };
    const base=run(()=>{}), zeroM=run(g2=>g2.LEGENDS.forEach(L=>{ L.unit={body:'ward',count:0,atk:0,hp:0}; }));
    const dd=v=>`${((v-zeroM)*100>=0?'+':'')}${((v-zeroM)*100).toFixed(2)}pp`;
    say(`- 選項對照（記憶體覆寫、n=${M}，**不是判定、也不是自調**，只供使用者裁定 INC_TITHE／本體時參考；差值都對同一組零戰力對照 ${pct(zeroM)}）：`);
    say(`  - 現行 INC_TITHE=${G.CFG.INC_TITHE}：${pct(base)}（${dd(base)}）`);
    say(`  - 供奉 0（INC_TITHE=0）：${(v=>`${pct(v)}（${dd(v)}）`)(run(g2=>{g2.CFG.INC_TITHE=0;}))}`);
    say(`  - 供奉 2（INC_TITHE=2）：${(v=>`${pct(v)}（${dd(v)}）`)(run(g2=>{g2.CFG.INC_TITHE=2;}))}`);
    say(`  - 供奉 3（INC_TITHE=3）：${(v=>`${pct(v)}（${dd(v)}）`)(run(g2=>{g2.CFG.INC_TITHE=3;}))}`);
    say(`  - 本體下修（三尊 hp×0.6、atk×0.6，供奉維持 ${G.CFG.INC_TITHE}）：`
      +(v=>`${pct(v)}（${dd(v)}）`)(run(g2=>g2.LEGENDS.forEach(L=>{ L.unit={...L.unit,hp:Math.round(L.unit.hp*0.6),atk:Math.round(L.unit.atk*0.6)}; }))));
    say(`  - 零戰力對照本身：${pct(zeroM)}（+0.00pp，定義上）`);
    lap();
  }
  say('');
}

say('## 總表'); say('```'); say(JSON.stringify(verdict,null,1)); say('```');

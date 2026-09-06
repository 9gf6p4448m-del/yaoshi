/* 傳說三尊「請神」閘門治具（第 4 卷，2026-09-06；2026-09-07 依凍結檔 §2.1 修訂紀錄改成 L1′／L3′）
   驗收條件與門檻凍結於 docs/experiments/2026-09-06-acceptance-legend3-impl.md（L0–L7 ＋ §2.1 修訂紀錄），
   本腳本不得為了過而調門檻。
   跑法（repo 根）：
     git show ca14065:index.html > old-l.html
     node tests/tools/legend-gate.mjs 10000 [--only=L0,L1] [--old=old-l.html] [--new=index.html]
   L0 kill switch（雙向）／L1″ 優勢策略窮舉／L2 活性／L3′ 反事實有感不支配／L4 無支配策略／L5 節奏。
   `--kp=K,P` 只給「鑑別力對照」用：暫時覆寫載入後的 CFG.INC_K／CFG.INC_PITY 再跑同一條 L1″，
   **不碰 index.html**、也不當判定依據（判定一律用檔案裡的值）。
   ★CFG.LEGEND_ON 自 2026-09-07 起**預設 false**（合併策略）★：本腳本一律**顯式**把它設成 true 才跑
   L1′–L5，不依賴預設；L0 反過來用「原封不動的預設」跟基準比。
   L6（既有測試＋單元測試＋Playwright）與 L7（diff 範圍）不在本腳本，見報告。 */
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
const KP=(arg('kp')||'').split(',').filter(Boolean).map(Number); /* 鑑別力對照用，不當判定 */
const SEEDS=Array.from({length:N},(_,i)=>i+1);
const pct=v=>(v*100).toFixed(2)+'%';
const say=(...s)=>console.log(s.join(' '));
const t0=Date.now(); const lap=()=>`（${((Date.now()-t0)/1000).toFixed(0)}s）`;
const verdict={};

const DEF=loadGame(NEW);                       /* 原封不動的預設（LEGEND_ON=false）——L0 的一半與各處 OFF 對照 */
const G=loadGame(NEW); G.CFG.LEGEND_ON=true;   /* 顯式打開——L1′~L5 全部跑這一份 */
if(KP.length===2){ G.CFG.INC_K=KP[0]; G.CFG.INC_PITY=KP[1]; }
const O=fs.existsSync(OLD)?loadGame(OLD):null;
say(`# 傳說三尊「請神」閘門　n=${N}　新版=${path.basename(NEW)}　基準=${path.basename(OLD)}`);
say(`預設值：LEGEND_ON=${DEF.CFG.LEGEND_ON}（合併策略：預設關、?legend=1 試玩）`);
say(`顯式打開後的數值：INC_MAX=${G.CFG.INC_MAX}　INC_K=${G.CFG.INC_K}　INC_PITY=${G.CFG.INC_PITY}　INC_GIFT_P=${G.CFG.INC_GIFT_P}　INC_AI=${JSON.stringify(G.CFG.INC_AI)}`);
if(KP.length===2) say(`★本次帶了 --kp=${KP.join(',')}：INC_K／INC_PITY 被**暫時覆寫**（只在記憶體裡，index.html 沒動）——這是鑑別力對照，不是判定。★`);
say('');

/* ================= L0 kill switch（雙向）================= */
if(want('L0')){
  say('## L0 Kill switch（**預設**的 trace(1..20) 與基準 ca14065 逐位元組相等；顯式 LEGEND_ON=true 必不等）');
  if(!O){ say('❌ 找不到基準檔 '+OLD); verdict.L0=false; }
  else{
    const tr=g=>JSON.stringify(g.trace(Array.from({length:20},(_,i)=>i+1)));
    const base=tr(O), def=tr(DEF), on=tr(G);
    const eqDef=(def===base), neOn=(on!==base);
    say(`- 預設（LEGEND_ON=${DEF.CFG.LEGEND_ON}） vs 基準：長度 ${def.length}/${base.length}，${eqDef?'逐位元組相等 ✅':'**不相等** ❌'}`);
    say(`- 顯式 LEGEND_ON=true vs 基準：長度 ${on.length}/${base.length}，${neOn?'不相等 ✅':'**相等** ❌（新內容根本沒進牌局）'}`);
    verdict.L0=eqDef&&neOn;
    say(`- 判定：${verdict.L0?'✅':'❌'} ${lap()}`);
  }
  say('');
}

/* ================= L1″ 優勢策略窮舉（凍結檔 §2.1 修訂紀錄二）=================
   模型：contend（四人擠同一龕）＋**四家共用同一個 V**。
   V 的算法（L1′→L1″ 的唯一差別）：拿**原四個異質袋子互打**——每一袋對其餘三袋（**不含鏡像**）算該席的
   邊際價值，四個數字取**中位數（第 2、3 名平均）**，四家共用。
   為什麼要改：L1′ 的「四家同一袋」讓 duelBags 退化成鏡像對局——任何一袋加了傳說打自己都是 100% 全勝、
   均傷釘在 PW_MAX，於是 V 恆等於 32.79、跟袋子與 K/P 都無關（二版實跑「取第 2 名／第 3 名」逐格相同）。
   三個狀態改為相對天井：①h 全 0 ②對手一人 h=⌊P/2⌋ ③自己 h=P−1。
   判定：**「燒 0」與「燒 INC_MAX」對四家任何一人都不得是弱優勢策略**（各自至少要有一個對手組合把它打敗）；
   中間注額是否優勢**列記錄項、不判**。
   收益（凍結檔字面）：請到＝＋該尊對桌上其餘三袋的邊際勝場 × PW 均傷（邊際勝場＝Δ勝率 × 剩餘夜數，
   因為傳說進袋之後留到局末；只算一夜等於把永久法寶當一次性道具）；沒請到＝−燒的量（＋關龕時的階段獎勵）。 */
const zuBags=()=>{
  const P=G.POOL.filter(x=>!x.curse);
  const byF=f=>P.filter(x=>x.f===f);
  return [
    [byF('zuling')[0],byF('zuling')[3],byF('xianghuo')[5]],
    [byF('zuling')[1],byF('zuling')[4],byF('xianghuo')[4]],
    [byF('zuling')[2],byF('zuling')[5],byF('yinqi')[5]],
    [byF('zuling')[6],byF('zuling')[7],byF('yinqi')[4]],
  ].map(b=>b.map(x=>({...x})));
};
function mkState(name,bags,tweak){
  const st={name,round:6,bags,lives:[30,30,30,30],h:[[0,0,0,0],[0,0,0,0],[0,0,0,0]]}; /* h[shrine][pid] */
  st.target=bags.map(b=>{
    const c={}; b.forEach(x=>{ c[x.f]=(c[x.f]||0)+1; });
    const f=Object.keys(c).sort((a,z)=>c[z]-c[a])[0];
    return G.LEGENDS.findIndex(L=>L.f===f);
  });
  if(tweak) tweak(st);
  return st;
}
/* 這一尊對這一袋的價值（壽命）：邊際勝率 × 剩餘夜數 × PW 均傷 */
function legendValue(st,pid){
  const si=st.target[pid];
  const legend={...G.LEGENDS[si]};
  const mine=st.bags[pid];
  const seeds=Array.from({length:300},(_,i)=>i+1);
  let dp=0, dmg=0, k=0;
  for(let j=0;j<4;j++){
    if(j===pid) continue;
    const foe=()=>st.bags[j].map(x=>({...x}));
    const a=G.duelBags(mine.map(x=>({...x})),foe(),seeds);
    const b=G.duelBags([...mine.map(x=>({...x})),legend],foe(),seeds);
    dp+=(b.rateDecided-a.rateDecided);
    dmg+=Object.keys(b.dmgs).reduce((s,d)=>s+(+d)*b.dmgs[d],0)/b.n;
    k++;
  }
  dp/=k; dmg/=k;
  const nights=G.CFG.ROUNDS-st.round+1;
  return {v:dp*nights*dmg, dp, dmg, nights};
}
function stageReward(h){
  const P=G.CFG.INC_PITY;
  if(h<P/3) return 0;
  if(h<2*P/3) return Math.ceil(h/3);
  return Math.ceil(h/2)+1; /* 差一步段另附一件 p≤INC_GIFT_P 的小法寶，折成 1 點壽命當量（保守估） */
}
/* dominantScan(state)：吃一個單夜快照，回傳收益矩陣摘要、analyzeEvent 的窮舉判定，
   以及「燒 0」「燒 INC_MAX」各自被哪些對手組合打敗（逐家）。 */
function dominantScan(st,fixedV){
  const K=G.CFG.INC_K, P=G.CFG.INC_PITY, M=G.CFG.INC_MAX;
  if(!G.S) G.makeState('solo',1); /* shrineOrderKey 讀 WIND_SEQ 與傳入的 round，但需要 S 存在 */
  /* fixedV 有值＝L1″：四家共用同一個 V（由異質四袋互打取中位數算出），不再逐席重算 */
  const val=(fixedV!=null)?[0,1,2,3].map(()=>({v:fixedV})):[0,1,2,3].map(i=>legendValue(st,i));
  const options=Array.from({length:M+1},(_,i)=>i);
  const payoff=choices=>{
    const out=[0,0,0,0];
    const h=[0,1,2,3].map(i=>st.h[st.target[i]][i]+choices[i]);
    for(let s=0;s<3;s++){
      /* 擲骰順序與引擎同一條規則（使用者 2026-09-07 裁定甲）：h 高到低；同 h 從本夜風位家起順時針。
         直接呼叫 index.html 匯出的 shrineOrderKey(pid, round)，不在治具裡另抄一份排序鍵。 */
      const rollers=[0,1,2,3].filter(i=>st.target[i]===s&&choices[i]>0)
        .sort((a,b)=>h[b]-h[a]||G.shrineOrderKey(a,st.round)-G.shrineOrderKey(b,st.round));
      const anyH=[0,1,2,3].filter(i=>st.target[i]===s&&h[i]>0);
      let alive=1; const win=[0,0,0,0]; let closeP=0;
      for(const i of rollers){
        const c=h[i]>=P?1:h[i]/(h[i]+K);
        win[i]=alive*c; closeP+=win[i]; alive*=(1-c);
      }
      for(const i of anyH){
        out[i]+=win[i]*val[i].v;                       /* 自己請到 */
        out[i]+=(closeP-win[i])*stageReward(h[i]);     /* 龕關了但不是自己請到 → 階段獎勵 */
      }
    }
    for(let i=0;i<4;i++) out[i]-=choices[i];           /* 燒掉的壽命不退 */
    return out;
  };
  const res=G.analyzeEvent({name:st.name,players:4,options,payoff});
  const eachCombo=(pid,fn)=>{
    const walk=pre=>{
      if(pre.length===3){ fn(pre); return; }
      for(const o of options) walk([...pre,o]);
    };
    walk([]);
  };
  const beat=(pid,A)=>{
    const found=[];
    eachCombo(pid,pre=>{
      const ch=[]; let k=0;
      for(let i=0;i<4;i++) ch.push(i===pid?A:pre[k++]);
      const base=payoff(ch)[pid];
      for(const B of options){
        if(B===A) continue;
        const ch2=ch.slice(); ch2[pid]=B;
        const v=payoff(ch2)[pid];
        if(v>base+1e-9) found.push({others:pre.join('/'),A,pA:+base.toFixed(3),B,pB:+v.toFixed(3)});
      }
    });
    return found;
  };
  const matrix=[0,1,2,3].map(i=>options.map(A=>{
    const vs=[];
    eachCombo(i,pre=>{ const ch=[]; let k=0; for(let j=0;j<4;j++) ch.push(j===i?A:pre[k++]); vs.push(payoff(ch)[i]); });
    return {opt:A,min:+Math.min(...vs).toFixed(2),avg:+(vs.reduce((a,b)=>a+b,0)/vs.length).toFixed(2),max:+Math.max(...vs).toFixed(2)};
  }));
  return {res,val,matrix,options,
    beat0:[0,1,2,3].map(i=>beat(i,0)), beatMax:[0,1,2,3].map(i=>beat(i,M))};
}
if(want('L1')){
  const M=G.CFG.INC_MAX, P=G.CFG.INC_PITY;
  say(`## L1″ 優勢策略窮舉（contend＋四家共用同一個 V；判定＝「燒 0」與「燒 ${M}」對四家任何一人都不得是弱優勢）`);
  /* V：原四個異質袋子互打（每袋對其餘三袋，不含鏡像），取中位數（第 2、3 名平均），四家共用 */
  const base=mkState('算 V 用',zuBags());
  const vs=[0,1,2,3].map(i=>({i,...legendValue(base,i)}));
  const sorted=[...vs].map(x=>x.v).sort((a,b)=>a-b);
  const V=(sorted[1]+sorted[2])/2;
  say(`- V 的來源：原**異質**四袋互打（每袋對其餘三袋、不含鏡像）對「${G.LEGENDS[base.target[0]].n}」的邊際價值＝`
    +vs.map(v=>`袋${v.i} ${v.v.toFixed(2)}`).join('　')
    +`；由小到大 ${sorted.map(v=>v.toFixed(2)).join(' < ')}，取中位數（第 2、3 名平均）＝**V=${V.toFixed(2)}**，四家共用。`);
  say(`- 對照：L1′（四家同一袋）時 V 恆＝32.79（鏡像對局：加傳說 100% 全勝、均傷釘在 PW_MAX＝${G.CFG.PW_MAX}），與袋子和 K/P 都無關。`);
  const NAME=['南','北','西','東'];
  const states=[
    mkState('狀態①局初：h 全 0',zuBags()),
    mkState(`狀態②對手領先：東家 h=⌊P/2⌋=${Math.floor(P/2)}`,zuBags(),st=>{ st.h[st.target[3]][3]=Math.floor(P/2); }),
    mkState(`狀態③差一步：南家 h=P−1=${P-1}`,zuBags(),st=>{ st.h[st.target[0]][0]=P-1; }),
  ];
  let ok=true; verdict.L1={};
  for(const st of states){
    const r=dominantScan(st,V);
    say(`### ${st.name}`);
    say('- 收益矩陣摘要（64 種對手組合下的 最小／平均／最大）：');
    say('| 家 | '+r.options.map(i=>'燒 '+i).join(' | ')+' |');
    say('|---|'+r.options.map(()=>'---').join('|')+'|');
    [0,1,2,3].forEach(i=>say(`| ${NAME[i]} | `+r.matrix[i].map(m=>`${m.min}／${m.avg}／${m.max}`).join(' | ')+' |'));
    let pass=true;
    say('| 家 | 「燒 0」被打敗的組合數 | 「燒 '+M+'」被打敗的組合數 | 判定 |'); say('|---|---|---|---|');
    [0,1,2,3].forEach(i=>{
      const a=r.beat0[i].length, b=r.beatMax[i].length;
      const good=a>0&&b>0; if(!good) pass=false;
      say(`| ${NAME[i]} | ${a} | ${b} | ${good?'✅':'❌'} |`);
    });
    [0,1,2,3].forEach(i=>{
      const a=r.beat0[i][0], b=r.beatMax[i][0];
      say(`  - ${NAME[i]}：${a?`對手 ${a.others} 時 燒0 得 ${a.pA} < 燒${a.B} 得 ${a.pB}`:'**「燒 0」沒有任何組合打得敗** ❌'}`
        +`；${b?`對手 ${b.others} 時 燒${M} 得 ${b.pA} < 燒${b.B} 得 ${b.pB}`:`**「燒 ${M}」沒有任何組合打得敗** ❌`}`);
    });
    const mid=r.res.dominant.filter(d=>d.option!==0&&d.option!==M);
    say(`- 記錄項（不判）：中間注額的弱優勢 ${mid.length?JSON.stringify(mid):'無'}；analyzeEvent 全部 dominant＝${JSON.stringify(r.res.dominant)}；freeLunch＝${r.res.freeLunch}`);
    verdict.L1[st.name]=pass; if(!pass) ok=false;
    say(`- 本狀態判定：${pass?'✅':'❌'}`);
    say('');
  }
  verdict.L1.pass=ok;
  say(`- L1″ 判定：${ok?'✅':'❌'} ${lap()}`); say('');
}

/* ================= L2／L3′／L5：預設 AI 桌逐局統計（顯式 LEGEND_ON=true）================= */
let games=null;
if(want('L2')||want('L3')||want('L5')) games=SEEDS.map(s=>G.playPolicyGame(s,{}));
if(want('L2')){
  say('## L2 活性（預設 AI 桌：至少一尊被請走的局 ≥60%；三尊各自被請走的局 ≥25%）');
  const taken=[0,0,0]; let any=0;
  games.forEach(g=>{ let a=false; g.shrines.forEach(sh=>{ if(sh.takenBy!=null){ taken[sh.i]++; a=true; } }); if(a) any++; });
  const anyR=any/N, each=taken.map(t=>t/N);
  say('| 項目 | 值 | 門檻 | 判定 |'); say('|---|---|---|---|');
  say(`| 至少一尊被請走 | ${pct(anyR)} | ≥60% | ${anyR>=0.60?'✅':'❌'} |`);
  G.LEGENDS.forEach((L,i)=>say(`| 「${L.n}」（${L.f}）被請走 | ${pct(each[i])} | ≥25% | ${each[i]>=0.25?'✅':'❌'} |`));
  const rounds=[[],[],[]];
  games.forEach(g=>g.shrines.forEach(sh=>{ if(sh.round) rounds[sh.i].push(sh.round); }));
  say(`- 平均請走夜次：${G.LEGENDS.map((L,i)=>`${L.n} ${rounds[i].length?(rounds[i].reduce((a,b)=>a+b,0)/rounds[i].length).toFixed(2):'—'}`).join('　')}`);
  const st=games.reduce((a,g)=>{ Object.keys(g.shrineStat).forEach(k=>a[k]=(a[k]||0)+g.shrineStat[k]); return a; },{});
  say(`- 累計：燒香 ${st.burn} 次共 ${st.burnLife} 壽命・擲 ${st.rolls} 次中 ${st.hits}（天井 ${st.pity}）・階段獎勵 ${st.rewards} 次（含小法寶 ${st.gifts}）・回天 ${st.dawn} 龕`);
  verdict.L2=anyR>=0.60&&each.every(v=>v>=0.25);
  say(`- 判定：${verdict.L2?'✅':'❌'} ${lap()}`); say('');
}
if(want('L3')){
  const seeds=Array.from({length:1000},(_,i)=>i+1);
  const pool=G.POOL.filter(x=>!x.curse);
  const foes=['zuling','xianghuo','yinqi'].map(f=>pool.filter(x=>x.f===f).slice(0,3).map(x=>({...x})));
  say('## L3′ 反事實有感不支配（①三尊各自的平均位移 ≥ +10pp ②持有任一尊者最終勝率 ≤55%）');
  say('### ① 反事實有感：同一袋 ± 這一尊，對三系代表袋各 duelBags n=1000');
  say('| 尊 | 對祖靈袋 | 對香火袋 | 對陰氣袋 | 平均位移 | 門檻 ≥+10pp |'); say('|---|---|---|---|---|---|');
  let okA=true;
  G.LEGENDS.forEach(Lg=>{
    const mine=pool.filter(x=>x.f===Lg.f).slice(0,3).map(x=>({...x}));
    const cells=foes.map(fo=>{
      const a=G.duelBags(mine.map(x=>({...x})),fo.map(x=>({...x})),seeds).rateDecided;
      const b=G.duelBags([...mine.map(x=>({...x})),{...Lg}],fo.map(x=>({...x})),seeds).rateDecided;
      return {a,b,d:(b-a)*100};
    });
    const avg=cells.reduce((s,c)=>s+c.d,0)/3;
    const pass=avg>=10; if(!pass) okA=false;
    say(`| ${Lg.n} | ${cells.map(c=>`${pct(c.a)}→${pct(c.b)}（${c.d>=0?'+':''}${c.d.toFixed(1)}pp）`).join(' | ')} | **${avg>=0?'+':''}${avg.toFixed(1)}pp** | ${pass?'✅':'❌'} |`);
  });
  const L={w:0,n:0}, Pl={w:0,n:0}; let hold=0, holdWin=0;
  games.forEach(g=>{ L.w+=g.legendDuel.w; L.n+=g.legendDuel.n; Pl.w+=g.plainDuel.w; Pl.n+=g.plainDuel.n;
    hold+=g.holders.length; if(g.holders.includes(g.winnerId)) holdWin++; });
  const hw=hold?holdWin/hold:0;
  const okB=hw<=0.55;
  say('');
  say(`### ② 持有任一尊者的最終勝率：**${pct(hw)}**（${holdWin}/${hold}）　門檻 ≤55% ${okB?'✅':'❌'}`);
  const r1=L.n?L.w/L.n:0, r0=Pl.n?Pl.w/Pl.n:0;
  say(`- 記錄項（不判，舊 L3 的口徑；含選樣混淆，見報告 §4.2）：請到者 ${pct(r1)}（${L.w}/${L.n}）／未請到者 ${pct(r0)}（${Pl.w}/${Pl.n}）＝相對帶 ${r0?(r1/r0).toFixed(3):'—'}`);
  verdict.L3=okA&&okB;
  say(`- 判定：${verdict.L3?'✅':'❌'} ${lap()}`); say('');
}
if(want('L5')){
  say('## L5 節奏（預設 AI 桌中位局長 10～12 夜）');
  const lens=games.map(g=>g.gameLength).sort((a,b)=>a-b);
  const med=lens[Math.floor(lens.length/2)];
  const avg=lens.reduce((a,b)=>a+b,0)/lens.length;
  const dist={}; lens.forEach(l=>dist[l]=(dist[l]||0)+1);
  say(`- 中位 **${med}** 夜（門檻 10～12）　平均 ${avg.toFixed(2)} 夜`);
  say(`- 分布：${Object.keys(dist).sort((a,b)=>a-b).map(k=>`${k}夜 ${(dist[k]/N*100).toFixed(1)}%`).join('　')}`);
  const off=SEEDS.slice(0,Math.min(N,2000)).map(s=>DEF.playPolicyGame(s,{}).gameLength).sort((a,b)=>a-b);
  say(`- 對照（預設＝LEGEND_ON=false，同一批前 ${off.length} 顆種子）：中位 ${off[Math.floor(off.length/2)]} 夜、平均 ${(off.reduce((a,b)=>a+b,0)/off.length).toFixed(2)} 夜`);
  verdict.L5=med>=10&&med<=12;
  say(`- 判定：${verdict.L5?'✅':'❌'} ${lap()}`); say('');
}

/* ================= L4 無支配策略 ================= */
if(want('L4')){
  say('## L4 無支配策略（座位 0 勝率各 ≤40%；位移＝相對預設 LEGEND_ON=false 的同一策略）');
  const pols=['splitter','greedy','hoarder','specialist','incenseMax','incenseNever'];
  say('| 策略 | LEGEND_ON=false | LEGEND_ON=true | 位移 | 判定 |'); say('|---|---|---|---|---|');
  let ok=true;
  for(const p of pols){
    const on=G.runMany({seeds:SEEDS,policies:{0:G.POLICIES[p]}}).winRate[0];
    const offP=DEF.POLICIES[p]?DEF.runMany({seeds:SEEDS,policies:{0:DEF.POLICIES[p]}}).winRate[0]:null;
    const pass=on<=0.40; if(!pass) ok=false;
    say(`| ${p} | ${offP==null?'—':pct(offP)} | ${pct(on)} | ${offP==null?'—':((on-offP)>=0?'+':'')+((on-offP)*100).toFixed(2)+'pp'} | ${pass?'✅':'❌'} |`);
  }
  verdict.L4=ok;
  say(`- 判定：${ok?'✅':'❌'} ${lap()}`); say('');
}

say('## 總表'); say('```'); say(JSON.stringify(verdict,null,1)); say('```');

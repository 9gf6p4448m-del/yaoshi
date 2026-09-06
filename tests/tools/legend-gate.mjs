/* 傳說三尊「請神」閘門治具（第 4 卷，2026-09-06）
   驗收條件與門檻凍結於 docs/experiments/2026-09-06-acceptance-legend3-impl.md（L0–L7），本腳本不得為了過而調門檻。
   跑法（repo 根）：
     git show ca14065:index.html > old-l.html
     node tests/tools/legend-gate.mjs 10000 [--only=L0,L1] [--old=old-l.html] [--new=index.html]
   L0 kill switch／L1 優勢策略窮舉／L2 活性／L3 有感不支配／L4 無支配策略／L5 節奏。
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
const SEEDS=Array.from({length:N},(_,i)=>i+1);
const pct=v=>(v*100).toFixed(2)+'%';
const say=(...s)=>console.log(s.join(' '));
const t0=Date.now(); const lap=()=>`（${((Date.now()-t0)/1000).toFixed(0)}s）`;
const verdict={};

const G=loadGame(NEW);
const OFF=loadGame(NEW); OFF.CFG.LEGEND_ON=false;
const O=fs.existsSync(OLD)?loadGame(OLD):null;
say(`# 傳說三尊「請神」閘門　n=${N}　新版=${path.basename(NEW)}　基準=${path.basename(OLD)}`);
say(`起始數值：LEGEND_ON=${G.CFG.LEGEND_ON}　INC_MAX=${G.CFG.INC_MAX}　INC_K=${G.CFG.INC_K}　INC_PITY=${G.CFG.INC_PITY}　INC_GIFT_P=${G.CFG.INC_GIFT_P}　INC_AI=${JSON.stringify(G.CFG.INC_AI)}`);
say('');

/* ================= L0 kill switch ================= */
if(want('L0')){
  say('## L0 Kill switch（LEGEND_ON=false 與基準 ca14065 的 trace(1..20) 逐位元組相等；ON 必不等）');
  if(!O){ say('❌ 找不到基準檔 '+OLD); verdict.L0=false; }
  else{
    const tr=g=>JSON.stringify(g.trace(Array.from({length:20},(_,i)=>i+1)));
    const base=tr(O), off=tr(OFF), on=tr(G);
    const eqOff=(off===base), neOn=(on!==base);
    say(`- OFF vs 基準：長度 ${off.length}/${base.length}，${eqOff?'逐位元組相等 ✅':'**不相等** ❌'}`);
    say(`- ON  vs 基準：長度 ${on.length}/${base.length}，${neOn?'不相等 ✅':'**相等** ❌（新內容根本沒進牌局）'}`);
    verdict.L0=eqOff&&neOn;
    say(`- 判定：${verdict.L0?'✅':'❌'} ${lap()}`);
  }
  say('');
}

/* ================= L1 優勢策略窮舉 =================
   單夜快照，四人各選「燒 0/1/2/3 到自己主系那一尊」（4⁴＝256 組合）。
   收益（凍結檔 L1 的字面口徑）：
     請到＝＋「該尊在紙紮夜戰對桌上其餘三袋的邊際勝場」×「PW 均傷」
           邊際勝場＝(加了這一尊之後對三袋的平均勝率 − 沒加時) × 剩餘夜數（傳說請到之後留在袋裡到局末，
           一夜份的估值等於把一件永久法寶當成一次性道具，會系統性低估——這一步是本腳本對「邊際勝場」的解讀，
           寫在這裡供覆核，不是門檻）；
     沒請到＝−燒的量（＋該龕當夜關閉時的階段獎勵）。
   dominantScan(state) 是獨立函式：吃一個快照，回傳收益矩陣摘要與 analyzeEvent 的窮舉判定。 */
function mkState(name,tweak,mode){
  const P=G.POOL.filter(x=>!x.curse);
  const byF=f=>P.filter(x=>x.f===f);
  /* 兩組治具，兩組都跑、都印出來：
     mixed＝凍結檔的字面讀法「四人各拜自己主系那尊」。四人三龕，主系分佈成 祖靈／香火／陰氣／祖靈，
            所以北家與西家各自獨佔一龕——**獨佔者的收益完全不隨對手變動**，依定義一定有優勢策略。
            這是治具（四人三龕）的結構性後果，不是機制缺陷，但它就是 L1 字面條件下的判定依據。
     contend＝四家主系全是祖靈，四人擠同一龕。這才是「獨一份搶請」那個賽局本身，
            拿來分辨「L1 紅是因為沒人跟他搶，還是因為燒滿真的無腦」。 */
  const bags=(mode==='contend'?[
    [byF('zuling')[0],byF('zuling')[3],byF('xianghuo')[5]],
    [byF('zuling')[1],byF('zuling')[4],byF('xianghuo')[4]],
    [byF('zuling')[2],byF('zuling')[5],byF('yinqi')[5]],
    [byF('zuling')[6],byF('zuling')[7],byF('yinqi')[4]],
  ]:[
    [byF('zuling')[0],byF('zuling')[3],byF('xianghuo')[5]],
    [byF('xianghuo')[0],byF('xianghuo')[2],byF('yinqi')[4]],
    [byF('yinqi')[0],byF('yinqi')[2],byF('zuling')[5]],
    [byF('zuling')[1],byF('zuling')[4],byF('yinqi')[5]],
  ]).map(b=>b.map(x=>({...x})));
  const st={name,round:6,bags,lives:[30,30,30,30],
    h:[[0,0,0,0],[0,0,0,0],[0,0,0,0]]}; /* h[shrine][pid] */
  /* 每家拜自己主系那一尊 */
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
    const md=Object.keys(b.dmgs).reduce((s,d)=>s+(+d)*b.dmgs[d],0)/b.n;
    dmg+=md; k++;
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
function dominantScan(st){
  const K=G.CFG.INC_K, P=G.CFG.INC_PITY, M=G.CFG.INC_MAX;
  const val=[0,1,2,3].map(i=>legendValue(st,i));
  const options=Array.from({length:M+1},(_,i)=>i);
  const payoff=choices=>{
    const out=[0,0,0,0];
    const h=[0,1,2,3].map(i=>st.h[st.target[i]][i]+choices[i]);
    for(let s=0;s<3;s++){
      const rollers=[0,1,2,3].filter(i=>st.target[i]===s&&choices[i]>0)
        .sort((a,b)=>h[b]-h[a]||a-b);
      const anyH=[0,1,2,3].filter(i=>st.target[i]===s&&h[i]>0);
      /* 逐位擲：前面的人都沒中，才輪到下一位 */
      let alive=1; const win=[0,0,0,0]; let closeP=0;
      for(const i of rollers){
        const c=h[i]>=P?1:h[i]/(h[i]+K);
        win[i]=alive*c; closeP+=win[i]; alive*=(1-c);
      }
      for(const i of anyH){
        /* 自己請到 */
        out[i]+=win[i]*val[i].v;
        /* 龕關了但不是自己請到 → 領階段獎勵（用當夜加總後的 h） */
        out[i]+=(closeP-win[i])*stageReward(h[i]);
      }
    }
    for(let i=0;i<4;i++) out[i]-=choices[i];   /* 燒掉的壽命不退 */
    return out;
  };
  const res=G.analyzeEvent({name:st.name,players:4,options,payoff});
  /* 「永不燒」「每夜燒滿」各自被哪些對手組合打敗（列前 3 筆） */
  const beat=(pid,A)=>{
    const found=[];
    const enumerate=(pre)=>{
      if(pre.length===3){
        const ch=[]; let k=0;
        for(let i=0;i<4;i++) ch.push(i===pid?A:pre[k++]);
        const base=payoff(ch)[pid];
        for(const B of options){
          if(B===A) continue;
          const ch2=ch.slice(); ch2[pid]=B;
          const v=payoff(ch2)[pid];
          if(v>base+1e-9) found.push({others:pre.join('/'),A,pA:+base.toFixed(3),B,pB:+v.toFixed(3)});
        }
        return;
      }
      for(const o of options) enumerate([...pre,o]);
    };
    enumerate([]);
    return found;
  };
  /* 收益矩陣摘要：每人每個選項在 64 種對手組合下的最小／平均／最大收益 */
  const matrix=[0,1,2,3].map(i=>options.map(A=>{
    const vs=[];
    const enumerate=(pre)=>{
      if(pre.length===3){ const ch=[]; let k=0; for(let j=0;j<4;j++) ch.push(j===i?A:pre[k++]); vs.push(payoff(ch)[i]); return; }
      for(const o of options) enumerate([...pre,o]);
    };
    enumerate([]);
    return {opt:A,min:+Math.min(...vs).toFixed(2),avg:+(vs.reduce((a,b)=>a+b,0)/vs.length).toFixed(2),max:+Math.max(...vs).toFixed(2)};
  }));
  return {res,val,matrix,beat0:beat(0,0),beatMax:beat(0,M)};
}
if(want('L1')){
  say('## L1 優勢策略窮舉（單夜快照 4⁴＝256 組合；三個狀態都不得存在優勢策略）');
  const mk=m=>[
    mkState('狀態①局初：h 全 0',null,m),
    mkState('狀態②對手領先：同一龕上有人 h=6',st=>{ st.h[st.target[3]][3]=6; },m),
    mkState('狀態③差一步：自己 h=8',st=>{ st.h[st.target[0]][0]=8; },m),
  ];
  const states=[...mk('mixed').map(st=>({...st,fx:'mixed（凍結檔字面：各拜主系，北／西獨佔一龕）'})),
                ...mk('contend').map(st=>({...st,fx:'contend（四家主系全同：四人擠同一龕）'}))];
  let ok=true; verdict.L1={};
  for(const st of states){
    st.name=`${st.name}　治具＝${st.fx}`;
    const r=dominantScan(st);
    const pass=r.res.dominant.length===0;
    const judged=st.fx.startsWith('mixed');   /* 判定只看字面治具；contend 一組是診斷用 */
    verdict.L1[st.name]=pass; if(!pass&&judged) ok=false;
    say(`### ${st.name}`);
    say(`- 各家拜的尊：${[0,1,2,3].map(i=>`${['南','北','西','東'][i]}→${G.LEGENDS[st.target[i]].n}`).join('　')}`);
    say(`- 這一尊對各家的價值 V（邊際勝率 ×${G.CFG.ROUNDS-st.round+1} 夜 × PW 均傷）：`
      +[0,1,2,3].map(i=>`${['南','北','西','東'][i]} ${r.val[i].v.toFixed(2)}（Δp ${(r.val[i].dp*100).toFixed(1)}pp・均傷 ${r.val[i].dmg.toFixed(2)}）`).join('　'));
    say('- 收益矩陣摘要（64 種對手組合下的 最小／平均／最大）：');
    say('| 家 | '+Array.from({length:G.CFG.INC_MAX+1},(_,i)=>'燒 '+i).join(' | ')+' |');
    say('|---|'+Array.from({length:G.CFG.INC_MAX+1},()=>'---').join('|')+'|');
    [0,1,2,3].forEach(i=>say(`| ${['南','北','西','東'][i]} | `+r.matrix[i].map(m=>`${m.min}／${m.avg}／${m.max}`).join(' | ')+' |'));
    say(`- 優勢策略：${r.res.dominant.length?'**'+JSON.stringify(r.res.dominant)+'** ❌':'無 ✅'}　freeLunch：${r.res.freeLunch}`);
    say(`- 「永不燒」被打敗的對手組合（南家，前 3 筆／共 ${r.beat0.length} 筆）：`
      +(r.beat0.length?r.beat0.slice(0,3).map(b=>`對手 ${b.others} 時 燒0 得 ${b.pA} < 燒${b.B} 得 ${b.pB}`).join('；'):'**沒有** ❌'));
    say(`- 「每夜燒滿」被打敗的對手組合（南家，前 3 筆／共 ${r.beatMax.length} 筆）：`
      +(r.beatMax.length?r.beatMax.slice(0,3).map(b=>`對手 ${b.others} 時 燒${b.A} 得 ${b.pA} < 燒${b.B} 得 ${b.pB}`).join('；'):'**沒有** ❌'));
    if((!r.beat0.length||!r.beatMax.length)&&judged){ ok=false; verdict.L1[st.name]=false; }
    say('');
  }
  verdict.L1.pass=ok;
  say(`- L1 判定：${ok?'✅':'❌'} ${lap()}`); say('');
}

/* ================= L2／L3／L5：預設 AI 桌逐局統計 ================= */
let games=null;
if(want('L2')||want('L3')||want('L5')){
  games=SEEDS.map(s=>G.playPolicyGame(s,{}));
}
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
  say('## L3 有感不支配（請到者自請到那夜起的對決勝率 ÷ 同局未請到者 ＝ 1.15～1.60；持有者最終勝率 ≤55%）');
  const L={w:0,n:0}, Pl={w:0,n:0}; let hold=0, holdWin=0;
  games.forEach(g=>{ L.w+=g.legendDuel.w; L.n+=g.legendDuel.n; Pl.w+=g.plainDuel.w; Pl.n+=g.plainDuel.n;
    hold+=g.holders.length; if(g.holders.includes(g.winnerId)) holdWin++; });
  const r1=L.n?L.w/L.n:0, r0=Pl.n?Pl.w/Pl.n:0, ratio=r0?r1/r0:0;
  const hw=hold?holdWin/hold:0;
  say(`- 請到者：${pct(r1)}（${L.w}/${L.n} 場）　未請到者：${pct(r0)}（${Pl.w}/${Pl.n} 場）　**相對帶 ${ratio.toFixed(3)}**（門檻 1.15～1.60）${ratio>=1.15&&ratio<=1.60?'✅':'❌'}`);
  say(`- 持有任一尊者的最終勝率：${pct(hw)}（${holdWin}/${hold}）　門檻 ≤55% ${hw<=0.55?'✅':'❌'}`);
  verdict.L3=(ratio>=1.15&&ratio<=1.60)&&hw<=0.55;
  say(`- 判定：${verdict.L3?'✅':'❌'}`);
  say('');
  say('### L3 診斷（不是門檻，是給使用者判斷用的旁證）');
  say('**(a) 消融：把三尊的紙紮全部歸零（請到＝拿到一件在夜戰裡毫無作用的東西），相對帶還剩多少**');
  const ab=(mut,label)=>{
    const g2=loadGame(NEW); if(mut) mut(g2);
    const L2={w:0,n:0}, P2={w:0,n:0}; let h2=0, hw2=0;
    const M=Math.min(N,2000), sd=Array.from({length:M},(_,i)=>i+1);
    sd.forEach(s=>{ const r=g2.playPolicyGame(s,{}); L2.w+=r.legendDuel.w; L2.n+=r.legendDuel.n;
      P2.w+=r.plainDuel.w; P2.n+=r.plainDuel.n; h2+=r.holders.length; if(r.holders.includes(r.winnerId)) hw2++; });
    const a=L2.n?L2.w/L2.n:0, b=P2.n?P2.w/P2.n:0;
    say(`- ${label}（n=${M}）：請到者 ${pct(a)}／未請到者 ${pct(b)}　相對帶 **${(a/b).toFixed(3)}**　持有者最終勝率 ${pct(h2?hw2/h2:0)}`);
    return a/b;
  };
  const zero=ab(g=>g.LEGENDS.forEach(Lg=>{ Lg.unit={body:'ward',count:0,atk:0,hp:0}; }),'零紙紮（完全沒有戰鬥貢獻）');
  ab(null,'現行三尊（對照，同一批種子）');
  say(`- 讀法：零紙紮版的相對帶 ${zero.toFixed(3)} 就是**這個量法本身的下限**——它完全來自「拿得到傳說的人本來就比較有餘裕、也活得比較久」，`);
  say('  跟傳說強不強一點關係都沒有。門檻上緣 1.60 幾乎等於這個下限，代表 L3 這條的可用區間只夠容納「一件毫無作用的東西」。');
  say('');
  say('**(b) 無混淆的有感度：同一個袋子 ±這一尊，對三種典型對手袋的勝率位移（duelBags，n=1000）**');
  const seeds=Array.from({length:1000},(_,i)=>i+1);
  const pool=G.POOL.filter(x=>!x.curse);
  const foes=['zuling','xianghuo','yinqi'].map(f=>pool.filter(x=>x.f===f).slice(0,3).map(x=>({...x})));
  say('| 尊 | 對祖靈袋 | 對香火袋 | 對陰氣袋 | 平均位移 |'); say('|---|---|---|---|---|');
  G.LEGENDS.forEach(Lg=>{
    /* 兩邊都給 3 件（原本自己只給 2 件，2v3 的底線勝率是 0%，位移全部被夾成 0 或 +100pp，量不到東西） */
    const mine=pool.filter(x=>x.f===Lg.f).slice(0,3).map(x=>({...x}));
    const cells=foes.map(fo=>{
      const a=G.duelBags(mine.map(x=>({...x})),fo.map(x=>({...x})),seeds).rateDecided;
      const b=G.duelBags([...mine.map(x=>({...x})),{...Lg}],fo.map(x=>({...x})),seeds).rateDecided;
      return {a,b,d:(b-a)*100};
    });
    say(`| ${Lg.n} | ${cells.map(c=>`${pct(c.a)}→${pct(c.b)}（${c.d>=0?'+':''}${c.d.toFixed(1)}pp）`).join(' | ')} | ${(cells.reduce((s,c)=>s+c.d,0)/3).toFixed(1)}pp |`);
  });
  say('');
}
if(want('L5')){
  say('## L5 節奏（預設 AI 桌中位局長 10～12 夜）');
  const lens=games.map(g=>g.gameLength).sort((a,b)=>a-b);
  const med=lens[Math.floor(lens.length/2)];
  const avg=lens.reduce((a,b)=>a+b,0)/lens.length;
  const dist={}; lens.forEach(l=>dist[l]=(dist[l]||0)+1);
  say(`- 中位 **${med}** 夜（門檻 10～12）　平均 ${avg.toFixed(2)} 夜`);
  say(`- 分布：${Object.keys(dist).sort((a,b)=>a-b).map(k=>`${k}夜 ${(dist[k]/N*100).toFixed(1)}%`).join('　')}`);
  const off=SEEDS.slice(0,Math.min(N,2000)).map(s=>OFF.playPolicyGame(s,{}).gameLength).sort((a,b)=>a-b);
  say(`- 對照（LEGEND_ON=false，同一批前 ${off.length} 顆種子）：中位 ${off[Math.floor(off.length/2)]} 夜、平均 ${(off.reduce((a,b)=>a+b,0)/off.length).toFixed(2)} 夜`);
  verdict.L5=med>=10&&med<=12;
  say(`- 判定：${verdict.L5?'✅':'❌'} ${lap()}`); say('');
}

/* ================= L4 無支配策略 ================= */
if(want('L4')){
  say('## L4 無支配策略（座位 0 勝率各 ≤40%；位移＝相對 LEGEND_ON=false 的同一策略）');
  const pols=['splitter','greedy','hoarder','specialist','incenseMax','incenseNever'];
  say('| 策略 | LEGEND_ON=false | LEGEND_ON=true | 位移 | 判定 |'); say('|---|---|---|---|---|');
  let ok=true;
  for(const p of pols){
    const on=G.runMany({seeds:SEEDS,policies:{0:G.POLICIES[p]}}).winRate[0];
    const offP=OFF.POLICIES[p]?OFF.runMany({seeds:SEEDS,policies:{0:OFF.POLICIES[p]}}).winRate[0]:null;
    const pass=on<=0.40; if(!pass) ok=false;
    say(`| ${p} | ${offP==null?'—':pct(offP)} | ${pct(on)} | ${offP==null?'—':((on-offP)>=0?'+':'')+((on-offP)*100).toFixed(2)+'pp'} | ${pass?'✅':'❌'} |`);
  }
  verdict.L4=ok;
  say(`- 判定：${ok?'✅':'❌'} ${lap()}`); say('');
}

say('## 總表'); say('```'); say(JSON.stringify(verdict,null,1)); say('```');

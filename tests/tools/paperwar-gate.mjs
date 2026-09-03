/* 《紙紮夜戰》卷 A 閘門治具（2026-09-03）
   跑法：先 `git show fed244f:index.html > old.html`（放在 repo 根目錄），再
         node tests/tools/paperwar-gate.mjs 10000 [--only=A1,A3] [--old=old.html] [--new=index.html]
   一支跑完 A0–A7、A9；A8（五套測試／Math.random／瀏覽器）不在本腳本，見報告。
   驗收條件與門檻凍結於 scratchpad/acceptance-paperwar-A.md，本腳本**不得為了過而調門檻**。
   所有勝率都用同一支引擎（duelBags → paperWar）或同一支 runMany，新舊版各載一份 index.html 對照。 */
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
const OLD=arg('old')||path.join(ROOT,'old.html');
const ONLY=(arg('only')||'').split(',').filter(Boolean);
const want=id=>!ONLY.length||ONLY.includes(id);
const SEEDS=Array.from({length:N},(_,i)=>i+1);
const pct=v=>(v*100).toFixed(2)+'%';
const out=[];
const say=(...s)=>{ const t=s.join(' '); out.push(t); console.log(t); };

const G=loadGame(NEW);
const O=fs.existsSync(OLD)?loadGame(OLD):null;
if(!O) say('⚠ 找不到 old.html，A0/A3/A4/A5/A7 的對照無法跑（先 git show fed244f:index.html > old.html）');

const by=n=>G.POOL.find(x=>x.n===n);
const bag=(...ns)=>ns.map(n=>({...by(n)}));
const sumP=b=>b.reduce((s,x)=>s+x.p,0);
const t0=Date.now();
const lap=()=>`（${((Date.now()-t0)/1000).toFixed(0)}s）`;

say(`# 《紙紮夜戰》卷 A 閘門　n=${N}　新版=${path.basename(NEW)}　舊版=${path.basename(OLD)}`);
say('');

/* ---------------- A0 kill switch ---------------- */
if(want('A0')&&O){
  say('## A0 Kill switch');
  G.CFG.PAPERWAR_ON=false;
  const offNew=JSON.stringify(G.trace(Array.from({length:20},(_,i)=>i+1)));
  G.CFG.PAPERWAR_ON=true;
  const onNew=JSON.stringify(G.trace(Array.from({length:20},(_,i)=>i+1)));
  const oldT=JSON.stringify(O.trace(Array.from({length:20},(_,i)=>i+1)));
  const eqOff=(offNew===oldT), neqOn=(onNew!==oldT);
  say(`- PAPERWAR_ON=false vs fed244f：長度 ${offNew.length} / ${oldT.length}，逐位元組${eqOff?'相等':'**不相等**'} → ${eqOff?'✅':'❌'}`);
  say(`- PAPERWAR_ON=true  vs fed244f：${neqOn?'不相等':'**相等**'} → ${neqOn?'✅':'❌'}`);
  say(`- 判定：${eqOff&&neqOn?'✅ 通過':'❌ 未通過'} ${lap()}`);
  say('');
}

/* ---------------- A1 三角 ---------------- */
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
if(want('A1')){
  say('## A1 三角（duelBags：同一支引擎跑一對一；每個 seed 抽一組夜份＋風位當外部條件）');
  say('註：三拍打完雙方同歸於盡（隻數與 hp 都相同、又都不是風位）＝平手，沿用現行 tie 路徑，不分勝負也不扣血。');
  say('　　「勝率(不計平手)」＝甲勝÷有勝負場；「勝率(平手計敗)」＝甲勝÷總場。兩種算法都列，判定各標一次。');
  say('| 關係 | 甲袋 | 乙袋 | 總價 | 甲勝/乙勝/平手 | 勝率(不計平手) | 判定 | 勝率(平手計敗) | 判定 |');
  say('|---|---|---|---|---|---|---|---|---|');
  let all=true, allRaw=true;
  for(const rel in PAIRS){
    const band=rel.includes('40–60');
    for(const [a,b] of PAIRS[rel]){
      const ba=bag(...a), bb=bag(...b);
      const R=G.duelBags(ba,bb,SEEDS);
      const chk=v=>band?(v>=0.40&&v<=0.60):(v<=0.40);
      const ok=chk(R.rateDecided), ok2=chk(R.rateA);
      if(!ok) all=false; if(!ok2) allRaw=false;
      say(`| ${rel} | ${a.join('＋')} | ${b.join('＋')} | ${sumP(ba)}/${sumP(bb)}（Δ${Math.abs(sumP(ba)-sumP(bb))}） | ${R.winA}/${R.winB}/${R.ties} | ${pct(R.rateDecided)} | ${ok?'✅':'❌'} | ${pct(R.rateA)} | ${ok2?'✅':'❌'} |`);
    }
  }
  say(`- 判定（不計平手）：${all?'✅ 九條逐配對全過':'❌ 有配對未過'}　判定（平手計敗）：${allRaw?'✅':'❌'} ${lap()}`);
  say('');
}

/* ---------------- A2 價格信號 ---------------- */
if(want('A2')){
  say('## A2 價格信號（同系同體型，逐件對同組其餘各件單挑，取平均勝率；p 遞增應單調不降）');
  say('| 系 | 體型 | 由低到高（p：法寶＝平均勝率） | 判定 |');
  say('|---|---|---|---|');
  let all=true;
  for(const f of ['zuling','xianghuo','yinqi']) for(const bd of ['swarm','elite','ward','haunt']){
    const items=G.POOL.filter(x=>x.f===f&&x.unit&&x.unit.body===bd);
    if(items.length<2) continue;
    if(new Set(items.map(x=>x.p)).size<2){ say(`| ${G.FAC?'':''}${f} | ${bd} | 只有同一個 p（${items.map(x=>x.n+p0(x)).join('／')}），無鏈 | — |`); continue; }
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
  function p0(x){ return `(${x.p})`; }
  say(`- 判定：${all?'✅ 每條鏈都單調不降':'❌ 有鏈非單調'} ${lap()}`);
  say('');
}

/* ---------------- A3／A4／A7：runMany 對照 ---------------- */
let newPol=null, oldPol=null, newDef=null, oldDef=null;
if((want('A3')||want('A4')||want('A7'))&&O){
  const pols=['splitter','greedy','hoarder'];
  newPol={}; oldPol={};
  for(const p of pols){
    newPol[p]=G.runMany({n:N,policies:{0:G.POLICIES[p]}});
    oldPol[p]=O.runMany({n:N,policies:{0:O.POLICIES[p]}});
  }
  newDef=G.runMany({n:N}); oldDef=O.runMany({n:N});
}
if(want('A3')&&O){
  say('## A3 三策略（座位 0 勝率，門檻：各 ≤40%）');
  say('| 策略 | fed244f | 新版 | 位移 | 判定 |');
  say('|---|---|---|---|---|');
  let all=true;
  for(const p of ['splitter','greedy','hoarder']){
    const a=oldPol[p].winRate[0], b=newPol[p].winRate[0];
    const ok=b<=0.40; if(!ok) all=false;
    say(`| ${p} | ${pct(a)} | ${pct(b)} | ${((b-a)*100).toFixed(2)}pp | ${ok?'✅':'❌'} |`);
  }
  say(`- 判定：${all?'✅':'❌'} ${lap()}`);
  say('');
}
if(want('A4')&&O){
  say('## A4 節奏（預設 scriptedBids；門檻：四席平均存活夜位移 ≤1 夜、局末壽命位移 ≤3）');
  say('| 席 | 存活夜 舊→新（位移） | 局末壽命 舊→新（位移） |');
  say('|---|---|---|');
  let mxS=0,mxL=0;
  for(let i=0;i<4;i++){
    const ds=newDef.avgSurvivalNights[i]-oldDef.avgSurvivalNights[i];
    const dl=newDef.avgFinalLife[i]-oldDef.avgFinalLife[i];
    mxS=Math.max(mxS,Math.abs(ds)); mxL=Math.max(mxL,Math.abs(dl));
    say(`| ${i} | ${oldDef.avgSurvivalNights[i].toFixed(2)}→${newDef.avgSurvivalNights[i].toFixed(2)}（${ds>=0?'+':''}${ds.toFixed(2)}） | ${oldDef.avgFinalLife[i].toFixed(2)}→${newDef.avgFinalLife[i].toFixed(2)}（${dl>=0?'+':''}${dl.toFixed(2)}） |`);
  }
  say(`- 最大位移：存活夜 ${mxS.toFixed(2)}（≤1 ${mxS<=1?'✅':'❌'}）　壽命 ${mxL.toFixed(2)}（≤3 ${mxL<=3?'✅':'❌'}）`);
  say(`- 平均對局長度 ${oldDef.avgGameLength.toFixed(2)}→${newDef.avgGameLength.toFixed(2)} 夜`);
  say(`- 判定：${mxS<=1&&mxL<=3?'✅':'❌'} ${lap()}`);
  say('');
}
if(want('A7')&&O){
  say('## A7 AI 不崩（三策略下 AI 三席勝率合計，門檻：不低於 fed244f 的 90%）');
  say('| 策略 | fed244f AI 合計 | 新版 AI 合計 | 比值 | 判定 |');
  say('|---|---|---|---|---|');
  let all=true;
  for(const p of ['splitter','greedy','hoarder']){
    const a=oldPol[p].winRate.slice(1).reduce((s,v)=>s+v,0);
    const b=newPol[p].winRate.slice(1).reduce((s,v)=>s+v,0);
    const ok=a?(b>=a*0.9):true; if(!ok) all=false;
    say(`| ${p} | ${pct(a)} | ${pct(b)} | ${(a?b/a:1).toFixed(3)} | ${ok?'✅':'❌'} |`);
  }
  say(`- 判定：${all?'✅':'❌'} ${lap()}`);
  say('');
}

/* ---------------- A5 角色極差 ---------------- */
if(want('A5')&&O){
  say('## A5 角色（各角色坐席 0 的勝率；門檻：極差不大於 fed244f 的極差）');
  const roles=Object.keys(G.ROLES).filter(k=>G.ROLES[k].pool);
  const rn=[],ro=[];
  say('| 角色 | fed244f | 新版 |');
  say('|---|---|---|');
  for(const r of roles){
    const a=O.runMany({n:N,picks:[r]}).winRate[0];
    const b=G.runMany({n:N,picks:[r]}).winRate[0];
    ro.push(a); rn.push(b);
    say(`| ${G.ROLES[r].name}（${r}） | ${pct(a)} | ${pct(b)} |`);
  }
  const sp=a=>Math.max(...a)-Math.min(...a);
  const ok=sp(rn)<=sp(ro)+1e-12;
  say(`- 極差：fed244f ${(sp(ro)*100).toFixed(2)}pp → 新版 ${(sp(rn)*100).toFixed(2)}pp`);
  say(`- 判定：${ok?'✅':'❌'} ${lap()}`);
  say('');
}

/* ---------------- A6 月相窮舉 ---------------- */
if(want('A6')){
  say('## A6 月相窮舉（12 夜 × 9 種「只買某系某體型」的買法；判定：不存在哪一夜有一列全 ≥50%）');
  /* 買法的袋子一律湊到同一個總價帶（目標 12，容許 ±1），否則「貴的買法」天生佔便宜、
     窮舉出來的支配關係只是在說「花比較多錢比較強」，不是在說買法有沒有剋制。 */
  /* 每件最多 2 份（牌堆本來就是每件 2 張），總件數 ≤4，挑總價最接近 12 的那組；同分取件數多的。 */
  const TARGET=12;
  const styleBag=items=>{
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
  };
  const styles=[];
  for(const f of ['zuling','xianghuo','yinqi']) for(const bd of ['swarm','elite','ward','haunt']){
    const items=G.POOL.filter(x=>x.f===f&&x.unit&&x.unit.body===bd);
    if(!items.length) continue;
    styles.push({k:`${f}/${bd}`,bag:styleBag(items)});
  }
  say(`- 買法（各 3 件）：${styles.map(s=>`${s.k}＝${s.bag.map(x=>x.n).join('＋')}（${sumP(s.bag)}）`).join('；')}`);
  let bad=[];
  for(let round=1;round<=12;round++){
    const ph=G.phaseFor(round);
    const rows=styles.map(a=>styles.map(b=>(a===b)?null:G.duelBags(a.bag,b.bag,SEEDS,{round}).rateDecided));
    rows.forEach((row,i)=>{
      const nz=row.filter(v=>v!==null);
      if(nz.every(v=>v>=0.5)) bad.push(`夜${round}（${ph.name}）：${styles[i].k}`);
    });
    if(round<=12){
      say('');
      say(`第 ${round} 夜　${G.phaseText(round)}`);
      say('| 買法＼對手 | '+styles.map(s=>s.k).join(' | ')+' | 最低 |');
      say('|---'+'|---'.repeat(styles.length+1)+'|');
      rows.forEach((row,i)=>{
        const nz=row.filter(v=>v!==null);
        say(`| ${styles[i].k} | `+row.map(v=>v===null?'—':(v*100).toFixed(1)+'%').join(' | ')+` | ${(Math.min(...nz)*100).toFixed(1)}% |`);
      });
    }
  }
  say('');
  say(`- 全列 ≥50%（支配買法）：${bad.length?'**'+bad.join('、')+'**':'無'}`);
  say(`- 判定：${bad.length?'❌':'✅'} ${lap()}`);
  say('');
}

/* ---------------- A9 活性 ---------------- */
if(want('A9')){
  say('## A9 活性（整局實跑：playPolicyGame 走真實 resolveBattles→paperWar，統計由 S.pwStat 累加）');
  const T={fights:0,burn:{},dmg:{},gang:0,splash:0,fear:0,lost:0,swap:0,bolt:0,bite:0,steal:0,regen:0};
  for(const s of SEEDS){
    G.playPolicyGame(s,{},undefined);
    const p=G.S.pwStat; if(!p) continue;
    T.fights+=p.fights;
    for(const k in p.burn) T.burn[k]=(T.burn[k]||0)+p.burn[k];
    for(const k in p.dmg) T.dmg[k]=(T.dmg[k]||0)+p.dmg[k];
    for(const k of ['gang','splash','fear','lost','swap','bolt','bite','steal','regen']) T[k]+=p[k]||0;
  }
  const dk=Object.keys(T.dmg).map(Number).sort((a,b)=>a-b);
  const missing=[2,3,4,5,6,7,8].filter(v=>!T.dmg[v]);
  const trig=['gang','splash','fear','lost','swap','bolt','bite','steal'];
  const zero=trig.filter(k=>!T[k]);
  say(`- 對決場數 ${T.fights}`);
  say(`- 燒掉隻數分布：${Object.keys(T.burn).map(Number).sort((a,b)=>a-b).map(k=>`${k}隻×${T.burn[k]}`).join('　')}`);
  say(`- dmg 分布（onBattle hooks 之前）：${dk.map(k=>`${k}×${T.dmg[k]}`).join('　')}`);
  say(`- 2..8 全出現：${missing.length?'❌ 缺 '+missing.join(','):'✅'}`);
  say(`- 觸發次數：圍毆 ${T.gang}　濺射 ${T.splash}　恐懼 ${T.fear}　迷途 ${T.lost}　抓交替 ${T.swap}　天雷 ${T.bolt}　反咬 ${T.bite}　偷命 ${T.steal}　回血 ${T.regen}`);
  say(`- 各項 >0：${zero.length?'❌ 為 0：'+zero.join(','):'✅'}`);
  say(`- 判定：${!missing.length&&!zero.length?'✅':'❌'} ${lap()}`);
  say('');
}
say(`（總耗時 ${((Date.now()-t0)/1000).toFixed(0)}s）`);

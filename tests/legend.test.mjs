/* 傳說三尊「請神」行為單元測試（第 4 卷；凍結檔 docs/experiments/2026-09-06-acceptance-legend3-impl.md L6）
   跑法：node tests/legend.test.mjs [index.html 的路徑]
   鑑別力（02 §6.1 第 1 條）：
     git show ca14065:index.html > old-l.html && node tests/legend.test.mjs old-l.html
     舊版沒有神龕，所以每一案都紅在**行為斷言**（「應該有人請走」「應該退 N 壽命」「應該消耗亂數」），
     不是 TypeError——本檔對 index.html 新增的匯出一律用 `G.x?G.x():null` 取值，取不到就讓後面的
     行為斷言自己紅，不讓屬性錯誤排在行為斷言前面。
   每一案都刻意做成「舊版必紅」：連 kill switch 那一案都同時斷言「ON 一定要擲骰」，
   否則舊版（永遠不擲）會靜默通過。 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const TARGET=process.argv[2]||path.join(HERE,'..','index.html');
function loadGame(htmlPath){
  const html=fs.readFileSync(htmlPath,'utf8');
  const code=html.match(/<script>[\s\S]*?<\/script>/)[0].replace('<script>','').replace('</script>','');
  const stub=`
  const location={search:''};
  const localStorage={getItem(){return null;},setItem(){}};
  const document={getElementById:()=>null,addEventListener:()=>{},querySelectorAll:()=>[],
    title:'',documentElement:{style:{}},body:{style:{},cssText:'',innerHTML:''}};
  const window={};
  `;
  return new Function('URLSearchParams',stub+code+'\nreturn window.__yaoshi;')(URLSearchParams);
}
let pass=0, fail=0; const fails=[];
function test(name,fn){
  try{ fn(); pass++; console.log(`  PASS  ${name}`); }
  catch(e){ fail++; fails.push(`${name}\n        ${e.message}`); console.log(`  FAIL  ${name}\n        ${e.message}`); }
}
function eq(a,b,what){ if(a!==b) throw new Error(`${what}：預期 ${JSON.stringify(b)}，實際 ${JSON.stringify(a)}`); }
function ok(c,what){ if(!c) throw new Error(what); }

/* ---------- 治具 ---------- */
/* 四位真人座位、空袋、壽命 60；把跟請神無關的系統全關掉（舊版沒有這些欄位，設了不影響）。 */
function setup(G,seed){
  G.CFG.LEGEND_ON=true;
  G.CFG.EVENT_ON=false; G.CFG.RULE_ON=false; G.CFG.WISH_ON=false; G.CFG.MARK_ON=false;
  G.CFG.NIGHT_REGEN=0; G.CFG.PAPERWAR_ON=false;
  G.makeState('solo',seed===undefined?1:seed);
  const S=G.S;
  S.players.forEach(p=>{ p.ai=null; p.roleId='human'; p.bag=[]; p.alive=true; p.life=60;
    p.grudge={}; p.pawned=false; p.sacrificed=0; p.wish=null; });
  return S;
}
/* 一次請神結算：四家的燒香一次全指定（undefined 的座位會走 AI 啟發式，所以四個都要寫）。
   inc＝{pid:{shrine,amt}|null}；回傳 resolveShrines 的輸出（舊版沒有這個函式時回 null）。 */
function shrineNight(G,S,inc){
  S.incense={};
  S.players.forEach(p=>{ S.incense[p.id]=(inc&&inc[p.id]!==undefined)?inc[p.id]:null; });
  return G.resolveShrines?G.resolveShrines():null;
}
const legendsOf=p=>p.bag.filter(x=>x.legend);
const bagNames=p=>p.bag.map(x=>x.n);
/* 只有天井會成功的骰子（chance 最高 8/(8+6)=0.57，回 0.99 保證非天井必失敗） */
const alwaysFail=()=>0.99;
const alwaysHit=()=>0;

/* ---------- 1. 請走＋關龕：h 到天井必請，請走後那一龕再也吃不到香火 ---------- */
test('請走：累計香火到天井 → 有人把那一尊請進袋子，該龕關閉、之後燒香不再扣壽命',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysFail;              /* 只有天井會成功——請到就一定是天井這條路 */
  const P=G.CFG.INC_PITY??9, M=G.CFG.INC_MAX??3;   /* fallback＝舊版沒有這兩欄，仍讓治具跑完、紅在行為斷言 */
  const nights=Math.ceil(P/M);
  for(let k=0;k<nights;k++) shrineNight(G,S,{0:{shrine:0,amt:M}});
  const got=legendsOf(S.players[0]);
  eq(got.length,1,`燒滿 ${nights} 夜（h=${nights*M} ≥ 天井 ${P}）後，南家袋裡的傳說法寶件數`);
  ok(got[0].p>=12,`請到的那一件行情值（傳說 p 應為 12）：${got[0].p}`);
  /* 關龕：同一龕再燒，壽命一毛都不該少（龕已關＝不受理） */
  const before=S.players[0].life;
  shrineNight(G,S,{0:{shrine:0,amt:M}});
  eq(S.players[0].life,before,'關龕之後再對同一尊燒香，壽命變動');
  eq(legendsOf(S.players[0]).length,1,'關龕之後不該再拿到第二份');
});

/* ---------- 2. 獨一份：四人同時到天井，只有一個人拿得到 ---------- */
test('獨一份：四人同夜同尊都到天井，全桌只有一個人請走',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysFail;
  const P=G.CFG.INC_PITY, M=G.CFG.INC_MAX;
  for(let k=0;k<Math.ceil(P/M);k++)
    shrineNight(G,S,{0:{shrine:0,amt:M},1:{shrine:0,amt:M},2:{shrine:0,amt:M},3:{shrine:0,amt:M}});
  const holders=S.players.filter(p=>legendsOf(p).length);
  eq(holders.length,1,'四人同拜同尊時，最後拿到那一尊的人數');
  eq(legendsOf(holders[0]).length,1,'拿到的人手上的份數');
});

/* ---------- 3. 階段獎勵（香灰段）：沒請到的人依 h 退壽命 ---------- */
test('階段獎勵：關龕時 h 落在中段的人退 ⌈h/3⌉ 壽命、不附法寶',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysFail;
  const P=G.CFG.INC_PITY, M=G.CFG.INC_MAX;
  const mid=Math.ceil(P/3);      /* P=9 → 3，落在「退 ⌈h/3⌉」那一段 */
  /* 北家先累到 h=mid（P=12 時 mid=4 > INC_MAX=3，一夜燒不完，要跨夜累積） */
  let acc=mid; while(acc>0){ const a=Math.min(M,acc); shrineNight(G,S,{1:{shrine:0,amt:a}}); acc-=a; }
  const bagBefore=S.players[1].bag.length;
  const lifeBefore=S.players[1].life;
  for(let k=0;k<Math.ceil(P/M);k++) shrineNight(G,S,{0:{shrine:0,amt:M}}); /* 南家燒到天井請走 */
  eq(legendsOf(S.players[0]).length,1,'南家應該在天井那一夜請走');
  eq(S.players[1].life-lifeBefore,Math.ceil(mid/3),`北家（h=${mid}）關龕時退回的壽命`);
  eq(S.players[1].bag.length,bagBefore,'香灰段不附小法寶，袋子件數');
  ok(mid>=P/3&&mid<2*P/3,`治具用的 h=${mid} 必須落在香灰段（${P/3} ≤ h < ${2*P/3}）`);
});

/* ---------- 4. 階段獎勵（差一步段）：退 ⌈h/2⌉ ＋ 該系一件小法寶 ---------- */
test('階段獎勵：關龕時 h 落在差一步段的人退 ⌈h/2⌉ 壽命＋該系一件小法寶入袋',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysFail;
  const P=G.CFG.INC_PITY, M=G.CFG.INC_MAX;
  const hi=Math.ceil(2*P/3);     /* P=9 → 6，落在「退 ⌈h/2⌉＋小法寶」那一段 */
  let left=hi;
  while(left>0){ const a=Math.min(M,left); shrineNight(G,S,{1:{shrine:0,amt:a}}); left-=a; }
  const bagBefore=S.players[1].bag.length, lifeBefore=S.players[1].life;
  S.rng=alwaysFail;              /* 抽小法寶也走 S.rng，固定成同一顆，結果決定性 */
  for(let k=0;k<Math.ceil(P/M);k++) shrineNight(G,S,{0:{shrine:0,amt:M}});
  eq(legendsOf(S.players[0]).length,1,'南家應該在天井那一夜請走');
  eq(S.players[1].life-lifeBefore,Math.ceil(hi/2),`北家（h=${hi}）關龕時退回的壽命`);
  eq(S.players[1].bag.length,bagBefore+1,'差一步段應該多一件小法寶');
  const gift=S.players[1].bag[S.players[1].bag.length-1];
  eq(gift.f,'zuling','附送的小法寶陣營（應與那一尊同系）');
  ok(gift.p<=G.CFG.INC_GIFT_P,`附送的小法寶行情值應 ≤ ${G.CFG.INC_GIFT_P}，實際 ${gift.p}（${gift.n}）`);
  ok(!gift.legend,'附送的是 POOL 的小法寶，不是傳說本體');
  ok(hi>=2*P/3&&hi<P,`治具用的 h=${hi} 必須落在差一步段（${2*P/3} ≤ h < ${P}）`);
});

/* ---------- 5. 天井必成：h≥P 時不論骰子怎麼擲都請得到 ---------- */
test('天井：h≥天井時 20 顆不同種子全部請到（不受骰子影響）',()=>{
  const G=loadGame(TARGET);
  const P=G.CFG.INC_PITY??9, M=G.CFG.INC_MAX??3;
  let hit=0;
  for(let seed=1;seed<=20;seed++){
    const S=setup(G,seed);
    S.rng=alwaysFail;
    for(let k=0;k<Math.ceil(P/M);k++) shrineNight(G,S,{0:{shrine:0,amt:M}});
    if(legendsOf(S.players[0]).length===1) hit++;
  }
  eq(hit,20,'20 顆種子裡到天井仍請到的局數');
});

/* ---------- 6. 未燒香本夜不得擲：h 再高，今夜沒燒就不擲 ---------- */
test('沒燒香就不擲：h=天井−1 的人今夜燒 0 → 拿不到；同一狀態燒 1 → 拿得到',()=>{
  const G=loadGame(TARGET);
  const P=G.CFG.INC_PITY??9, M=G.CFG.INC_MAX??3;
  const build=()=>{
    const S=setup(G);
    S.rng=alwaysFail;
    let left=P-1;
    while(left>0){ const a=Math.min(M,left); shrineNight(G,S,{0:{shrine:0,amt:a}}); left-=a; }
    return S;
  };
  const A=build(); A.rng=alwaysHit;            /* 骰子必中，唯一擋住他的只能是「今夜沒燒」 */
  shrineNight(G,A,{0:null});
  eq(legendsOf(A.players[0]).length,0,`h=${P-1}、骰子必中、但今夜燒 0 → 應該拿不到`);
  const B=build(); B.rng=alwaysHit;
  shrineNight(G,B,{0:{shrine:0,amt:1}});
  eq(legendsOf(B.players[0]).length,1,`同一狀態改成今夜燒 1 → 應該拿得到（否則上一條沒有鑑別力）`);
});

/* ---------- 7. 每夜一尊：燒在哪一尊，就只有那一尊會被請下來 ---------- */
test('每夜一尊：整局只對第 0 尊燒香 → 只請得到第 0 尊，另外兩尊不會憑空到手',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysHit;               /* 骰子必中：只要有資格擲就會成功 */
  shrineNight(G,S,{0:{shrine:0,amt:1}});
  const got=legendsOf(S.players[0]);
  eq(got.length,1,'燒 1 把、骰子必中 → 應該請到一尊');
  eq(got[0].f,'zuling','請到的那一尊的陣營（第 0 龕＝祖靈）');
  /* 其他人沒燒香，不該拿到任何東西 */
  eq(S.players[1].bag.length+S.players[2].bag.length+S.players[3].bag.length,0,'沒燒香的三家袋子件數');
});

/* ---------- 8. 燒掉的壽命當場扣、不退 ---------- */
test('燒香當場扣壽命：燒 n 就少 n，請到的人也不退',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysFail;
  const before=S.players[0].life;
  shrineNight(G,S,{0:{shrine:0,amt:2}});
  eq(S.players[0].life,before-2,'燒 2 之後的壽命');
  eq(legendsOf(S.players[0]).length,0,'骰子必失敗時不該請到');
  S.rng=alwaysHit;
  const before2=S.players[0].life;
  shrineNight(G,S,{0:{shrine:0,amt:2}});
  eq(legendsOf(S.players[0]).length,1,'骰子必中時應該請到');
  eq(S.players[0].life,before2-2,'請到的人燒掉的壽命一樣不退');
});

/* ---------- 9. 回天結清：局末還開著的龕把香火結清 ---------- */
test('回天：局末沒被請走的尊收攤，香火依階段獎勵結清、之後不再重複結清',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysFail;
  const P=G.CFG.INC_PITY??9, M=G.CFG.INC_MAX??3;
  const h=Math.ceil(P/3);
  let left=h; while(left>0){ const a=Math.min(M,left); shrineNight(G,S,{0:{shrine:0,amt:a}}); left-=a; }
  const before=S.players[0].life;
  const out=G.settleShrinesEnd?G.settleShrinesEnd():null;
  eq(S.players[0].life-before,Math.ceil(h/3),`回天時 h=${h} 應退的壽命`);
  ok(out&&out.length===1,'回天結清應該回報一筆結算紀錄');
  const after=S.players[0].life;
  if(G.settleShrinesEnd) G.settleShrinesEnd();
  eq(S.players[0].life,after,'再叫一次回天不得重複發獎（香火已歸零）');
});

/* ---------- 10. kill switch：OFF 不擲骰、ON 一定要擲骰 ---------- */
test('LEGEND_ON kill switch：關掉時零亂數消耗、打開時一定會擲骰（兩邊都驗才有鑑別力）',()=>{
  const G=loadGame(TARGET);
  const count=on=>{
    G.CFG.LEGEND_ON=on;
    const S=setup(G); G.CFG.LEGEND_ON=on;   /* setup 內部會把它設回 true，這裡覆蓋回來 */
    let n=0; const base=S.rng; S.rng=()=>{ n++; return base(); };
    shrineNight(G,S,{0:{shrine:0,amt:2},1:{shrine:0,amt:1}});
    return n;
  };
  eq(count(false),0,'LEGEND_ON=false 時 resolveShrines 消耗的亂數次數');
  ok(count(true)>0,'LEGEND_ON=true、兩家都燒了香 → 應該有人擲骰（消耗亂數次數 >0）');
});

/* ---------- 11. 不進拍賣牌庫，但請得下來 ---------- */
test('傳說不上拍賣桌：整局市集不會出現傳說法寶，但請神請得下來',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  let seen=0;
  for(let r=0;r<12;r++){
    S.round=r+1;
    S.market=G.drawMarketFor(S.round);
    seen+=S.market.filter(x=>x.legend).length;
  }
  eq(seen,0,'12 夜的市集裡出現的傳說法寶件數');
  S.rng=alwaysHit;
  shrineNight(G,S,{0:{shrine:1,amt:1}});
  eq(legendsOf(S.players[0]).length,1,'請神應該請得下來（否則上一條零件數沒有鑑別力）');
  eq(legendsOf(S.players[0])[0].f,'xianghuo','第 1 龕的陣營');
});

/* ---------- 12. AI 啟發式掛在資料表上：ROLES[*].ai.inc 的覆寫要真的生效 ---------- */
test('AI 燒香啟發式是資料表驅動：ROLES[*].ai.inc 覆寫 minLifeFrac 後那個角色就不拜了',()=>{
  const G=loadGame(TARGET);
  G.CFG.LEGEND_ON=true; G.CFG.EVENT_ON=false; G.CFG.RULE_ON=false; G.CFG.WISH_ON=false; G.CFG.MARK_ON=false;
  G.makeState('solo',7);
  const S=G.S, p=S.players[1];
  p.bag=[{...G.POOL.find(x=>x.f==='zuling')}];
  p.life=60; p.alive=true;
  const base=G.aiIncense?G.aiIncense(p):null;
  ok(base&&base.amt>0,'預設旋鈕下，袋裡有祖靈法寶、壽命充足的 AI 應該會拜（amt>0）');
  const R=G.ROLES[p.roleId];
  const saved=R.ai.inc;
  R.ai.inc={minLifeFrac:99};                 /* 覆寫：壽命門檻拉到不可能達成 */
  p.ai={...R.ai};
  const after=G.aiIncense?G.aiIncense(p):null;
  R.ai.inc=saved;
  eq(after,null,'ROLES[*].ai.inc 覆寫 minLifeFrac 之後，同一個 AI 應該完全不拜');
});

/* ---------- 13. 傳說進了紙紮夜戰真的有招（招式欄位掛得上） ---------- */
test('傳說的招掛進紙紮夜戰：殘日的餘暉灼目讓對面前鋒 atk 降下來（換算成勝率位移）',()=>{
  const G=loadGame(TARGET);
  G.CFG.PAPERWAR_ON=true;
  const legend=(G.LEGENDS||[]).find(L=>L.f==='zuling')||null;
  const foe=G.POOL.filter(x=>x.f==='xianghuo').slice(0,3).map(x=>({...x}));
  const mine=G.POOL.filter(x=>x.f==='zuling').slice(0,2).map(x=>({...x}));
  const seeds=Array.from({length:400},(_,i)=>i+1);
  const without=G.duelBags(mine.map(x=>({...x})),foe.map(x=>({...x})),seeds).rateDecided;
  const with_=G.duelBags([...mine.map(x=>({...x})),...(legend?[{...legend}]:[])],foe.map(x=>({...x})),seeds).rateDecided;
  ok(with_>without,`加上祖靈系的傳說法寶之後勝率應該上升：${(without*100).toFixed(1)}% → ${(with_*100).toFixed(1)}%`);
  const tr=legend?G.TRAITS[legend.unit.trait]:null;
  ok(tr&&tr.blindFront>0,'那一尊的招應該帶 blindFront 效果欄位（餘暉灼目）');
});

/* ---------- 14. 覆審 H4（使用者 2026-09-07 裁定甲）：燒香上限＝當前壽命 −1，不得把自己燒到 ≤0 ---------- */
test('燒香夾限：壽命 2 選燒 3 只收 1 且活著；壽命 1 選燒 3 收 0、當夜沒有資格擲',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const M=G.CFG.INC_MAX??3;
  S.rng=alwaysHit;                     /* 骰子必中：有擲就一定請走，用「有沒有請走」反推有沒有擲 */
  /* 壽命 2 的人選燒滿 → 只能燒 1（要留 1 點），扣完剩 1、還活著、而且照樣擲得到 */
  S.players[0].life=2;
  const a=shrineNight(G,S,{0:{shrine:0,amt:M}});
  eq(a&&a.burn.length?a.burn[0].amt:0,1,`壽命 2 的人選燒 ${M}，實際燒掉的量（上限＝壽命−1）`);
  eq(S.players[0].life,1,'燒完之後的壽命（要留 1 點）');
  eq(S.players[0].alive,true,'燒香不得把自己燒死');
  eq(legendsOf(S.players[0]).length,1,'夾限之後仍然有資格擲（骰子必中 → 應該請走）');
  /* 壽命 1 的人選燒滿 → 一點都燒不了，當夜就不是「有燒香的人」，沒有資格擲 */
  const S2=setup(G);
  S2.rng=alwaysHit;
  S2.players[0].life=1;
  const b=shrineNight(G,S2,{0:{shrine:0,amt:M}});
  eq(b&&b.burn.length?b.burn[0].amt:0,0,'壽命 1 的人實際燒掉的量');
  eq(S2.players[0].life,1,'壽命 1 的人不該再被扣');
  eq(legendsOf(S2.players[0]).length,0,'燒 0 就沒有資格擲（骰子必中也請不走）');
  ok(G.incCap&&G.incCap({life:1})===0&&G.incCap({life:2})===1,'incCap 是單一事實來源：life 1→0、life 2→1');
});

/* ---------- 15. 對抗式覆審 H2：回天結清不得覆寫「不屬於本輪」的壽命快照 ---------- */
test('回天不砸紀錄：最後一筆壽命快照不是本輪收尾時，回天結清不得就地改寫它',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysFail;
  const P=G.CFG.INC_PITY??9, M=G.CFG.INC_MAX??3;
  const h=Math.ceil(P/3);
  let left=h;
  while(left>0){ const a=Math.min(M,left); shrineNight(G,S,{0:{shrine:0,amt:a}}); left-=a; }
  /* 模擬「異事夜殺到剩一人」那條路：那一夜沒有 recordNightEnd，末筆壽命快照停在前一夜 */
  S.history.nights=[];
  S.history.life=[[60,60,60,60]];
  const before=JSON.stringify(S.history.life);
  const out=G.settleShrinesEnd?G.settleShrinesEnd():null;
  ok(out&&out.length===1,'回天應該結清一筆（否則下一條沒有鑑別力）');
  eq(JSON.stringify(S.history.life),before,'末筆不屬於本輪時，壽命曲線不得被就地改寫');
});

/* ---------- 16. 同香火者的擲骰順序＝從本夜風位家起順時針（使用者 2026-09-07 裁定甲） ---------- */
test('同香火依風位：四家香火一樣多時，先擲的是本夜風位家（風位換人，請走的人就換人）',()=>{
  const G=loadGame(TARGET);
  const M=G.CFG.INC_MAX??3;
  /* windPid(r)＝WIND_SEQ[(r-1)%4]，WIND_SEQ=[東3,南0,西2,北1]：第 1 夜風位＝東家(3)、第 3 夜風位＝西家(2) */
  const run=round=>{
    const S=setup(G);
    S.round=round;
    S.rng=alwaysHit;                       /* 骰子必中 ⇒ 唯一決定誰請走的就是「誰先擲」 */
    shrineNight(G,S,{0:{shrine:0,amt:M},1:{shrine:0,amt:M},2:{shrine:0,amt:M},3:{shrine:0,amt:M}});
    const w=S.players.filter(p=>legendsOf(p).length);
    return w.length===1?w[0].id:-1;
  };
  eq(run(1),3,'第 1 夜（風位＝東家）四家香火相同 → 請走的應該是東家(id 3)');
  eq(run(3),2,'第 3 夜（風位＝西家）同一組輸入 → 請走的應該換成西家(id 2)（否則就是還在依座位 id）');
});

/* ---------- 17. 覆審 N2：封籤被 incCap 夾掉時，不得默默發生——要留下事件與計數 ---------- */
test('封籤被夾要看得見：壽命 3 封 3 → 實燒 2，clip 事件、shrineStat、夜末戰況 log 三處都要有',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const M=G.CFG.INC_MAX??3;
  S.rng=alwaysFail;
  S.players[0].life=3;                       /* 上限＝2，封 3 一定會被夾 */
  const out=shrineNight(G,S,{0:{shrine:0,amt:M}});
  ok(out&&out.clip&&out.clip.length===1,'被夾掉時 resolveShrines 應該回報一筆 clip 事件');
  eq(out.clip[0].want,M,'clip 記的「封籤上寫的量」');
  eq(out.clip[0].amt,2,'clip 記的「實際燒掉的量」');
  eq(out.burn.length?out.burn[0].amt:0,2,'實際燒掉的量');
  eq(S.players[0].life,1,'燒完剩下的壽命');
  ok(S.shrineStat&&S.shrineStat.sealed===1&&S.shrineStat.clip===1&&S.shrineStat.clipZero===0,
     `shrineStat 要記到封籤/被夾/完全蒸發：${JSON.stringify(S.shrineStat&&{s:S.shrineStat.sealed,c:S.shrineStat.clip,z:S.shrineStat.clipZero})}`);
  ok(S.shrineClipMsgs&&S.shrineClipMsgs.length===1&&/實燒 2/.test(S.shrineClipMsgs[0]),
     `夜末戰況 log 要有一句「封 → 實燒」：${JSON.stringify(S.shrineClipMsgs)}`);
  /* 反面：燒得起的時候不得留下 clip 事件（否則這條斷言沒有鑑別力） */
  const S2=setup(G); S2.rng=alwaysFail; S2.players[0].life=60;
  const out2=shrineNight(G,S2,{0:{shrine:0,amt:M}});
  eq(out2.clip.length,0,'壽命夠的時候不該有 clip 事件');
  ok(!(S2.shrineClipMsgs&&S2.shrineClipMsgs.length),'壽命夠的時候不該有戰況 log');
});

console.log(`\n傳說三尊「請神」單元測試：${pass} 過 / ${fail} 失敗　（目標檔 ${path.basename(TARGET)}）`);
if(fail){ console.log('\n失敗清單：'); fails.forEach(f=>console.log('  - '+f)); process.exit(1); }

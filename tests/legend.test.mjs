/* 請神 3.0「香火池」行為單元測試（凍結檔 docs/experiments/2026-09-10-acceptance-legend-v3.md H5／H10／H11）
   跑法：node tests/legend.test.mjs [index.html 的路徑]
   鑑別力（02 §6.1 第 1 條）：
     git show e83028c:index.html > old-main.html && node tests/legend.test.mjs old-main.html
     （e83028c＝v0.52＝請神 2.0「神債暗標」：三龕各自計分、尊→夜每局洗牌、落空發階段獎勵、
       沒人請得動就回天不重開、燒香要選一尊。H5 ①–⑥⑧ 每一案都必須紅在**行為斷言**上。
       ⑦（供奉四案）與 ⑨（G10 共鳴／G11 部隊預覽）依凍結檔是「維持綠」的回歸守衛，兩版都綠。）
   ★不讓屬性錯誤排在行為斷言前面★：
     ① 讀香火一律走 `pool(S,pid)` 相容層——3.0 讀 S.incPool、2.0 讀「三龕上還沒結清的 h 總和」，
        兩版都量得到同一件事（這個人手上還有多少沒兌現的香火），所以差異紅在**數字**上。
     ② 對 index.html 新增的匯出一律用 `G.x?G.x(...):<退路>` 取值，取不到就讓後面的行為斷言自己紅。
     ③ 封籤一律同時帶 `shrine` 與 `amt`：3.0 **忽略** shrine（香火不綁尊，H5⑥），
        2.0 照著它燒進那一尊 ⇒ 基準跑的是**真正的 2.0 行為**，不是「API 對不上所以什麼都沒做」。 */
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
  /* 基準（2.0）有「尊→夜每局洗牌」，每顆種子的排法都不同 ⇒ 對基準跑時行為會隨種子飄。
     這裡固定成 identity（第 i 尊排在 SHRINE_NIGHTS[i]）——那是 2.0 六種合法排法之一，
     讓「對基準紅」可重現。3.0 沒有 sh.night 這個欄位，這一行是空操作。 */
  if(S.shrines) S.shrines.forEach((sh,i)=>{ if(sh.night!==undefined) sh.night=G.CFG.SHRINE_NIGHTS[i]; });
  return S;
}
const NIGHTS=G=>G.CFG.SHRINE_NIGHTS||[4,7,10];
/* 香火讀取的相容層（見檔頭①）：這個人**手上還沒兌現**的香火。 */
const pool=(S,pid)=>S.incPool?(S.incPool[pid]|0)
  :(S.shrines?S.shrines.reduce((a,sh)=>a+(sh.h?(sh.h[pid]|0):0),0):0);
/* 一次請神結算：四家的燒香一次全指定（undefined 的座位會走 AI 啟發式，所以四個都要寫）。
   inc＝{pid:{amt[,shrine]}|null}；shrine 預設 2（3.0 忽略、2.0 燒進第 2 尊＝它的請神夜是最後一夜）。 */
function shrineNight(G,S,inc,opts){
  S.incense={};
  S.players.forEach(p=>{
    const v=(inc&&inc[p.id]!==undefined)?inc[p.id]:null;
    S.incense[p.id]=v?{shrine:(v.shrine!==undefined?v.shrine:2),amt:v.amt}:null;
  });
  return G.resolveShrines?G.resolveShrines(opts):null;
}
/* 讓某一席請到一尊（新舊版共用的路徑）：在第一個請神夜燒進第 0 尊。
   2.0 的第 0 尊排在 SHRINE_NIGHTS[0]（setup 固定過），3.0 空袋的 AI 選尊規則也是取 LEGENDS 第 0 個
   ⇒ 兩版都落在第 0 尊，供奉那幾案在兩版上跑的是同一個起點。 */
function winFor(G,S,pid){
  S.round=NIGHTS(G)[0];
  const inc={}; inc[pid]={shrine:0,amt:3};
  return shrineNight(G,S,inc);
}
const legendsOf=p=>p.bag.filter(x=>x.legend);
const takenBy=(S,i)=>S.shrines&&S.shrines[i]?S.shrines[i].takenBy:undefined;
const openN=S=>S.shrines?S.shrines.filter(sh=>sh.open).length:-1;

/* ================= H5① 請神夜：未持有且 h>0 者中最高者得 ================= */
test('H5①請神夜：香火**不綁尊**——燒在哪一格都算同一個池，第一個請神夜由池最高的人請神',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const N=NIGHTS(G);
  /* 三夜各燒 3／2／1，封籤上寫的是「第 2 尊」（2.0 的第 2 尊排在最後一個請神夜） */
  for(let k=0;k<3;k++){ S.round=1+k; shrineNight(G,S,{0:{amt:3},1:{amt:2},2:{amt:1}}); }
  eq(pool(S,0),9,'南家的香火池');
  eq(pool(S,1),6,'北家的香火池');
  eq(pool(S,2),3,'西家的香火池');
  eq(openN(S),3,`第 ${N[0]} 夜之前不得有任何一尊被請走或回天`);
  S.round=N[0];
  const out=shrineNight(G,S,{});           /* 開標：不再加燒，直接比大小 */
  ok(S.shrines.some(sh=>sh.takenBy===0),
    `第 ${N[0]} 夜香火最高（南家 9）的人應該請走一尊——香火不綁尊，燒在哪一格都算：takenBy=${JSON.stringify(S.shrines.map(sh=>sh.takenBy))}`);
  eq(legendsOf(S.players[0]).length,1,'南家袋裡的傳說件數');
  eq(pool(S,0),0,'得主的香火要歸零（已付）');
  eq(openN(S),2,'一夜只出一尊，其餘兩尊要留著');
  eq(legendsOf(S.players[1]).length,0,'北家（香火 6）不該拿到');
  eq(pool(S,1),6,'落空的北家香火**原封保留**（3.0 不發階段獎勵、也不歸零）');
  eq(pool(S,2),3,'落空的西家香火原封保留');
  ok(out&&out.taken.length===1&&out.taken[0].h===9,`out.taken 應記下得標香火 9：${JSON.stringify(out&&out.taken)}`);
});

test('H5①同分：依「本夜風位起順時針」的第一個人請神（不是座位 0 恆贏）',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const N=NIGHTS(G);
  S.round=N[0];
  const wind=G.windPid(N[0]);
  shrineNight(G,S,{0:{amt:1},1:{amt:1},2:{amt:1},3:{amt:1}});
  const holder=S.shrines.findIndex(sh=>sh.takenBy!=null);
  ok(holder>=0,`四家同香火 1 時，應該有人請走一尊：takenBy=${JSON.stringify(S.shrines.map(sh=>sh.takenBy))}`);
  eq(takenBy(S,holder),wind,`四家同香火時，應由本夜風位家（座位 ${wind}）請神`);
  eq(pool(S,wind),0,'得主香火歸零');
  S.players.forEach(p=>{ if(p.id!==wind) eq(pool(S,p.id),1,`落空的座位 ${p.id} 香火原封保留`); });
  const order=G.shrineWindOrder?G.shrineWindOrder(N[0]):null;
  ok(order&&order.length===4&&new Set(order).size===4,`shrineWindOrder(${N[0]}) 應回四個座位的順時針序：${JSON.stringify(order)}`);
  eq(order[0],wind,'順時針序的第一個應該就是本夜風位家');
  ok(G.shrineWindOrder(N[0]+1)[0]!==wind,'下一夜的風位家要換人（風位輪轉，不是固定座位）');
});

test('H5①已持有者不參加：他的香火再高也不得，該夜由「還沒請到的人」裡最高者請神',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const N=NIGHTS(G);
  winFor(G,S,0);
  eq(legendsOf(S.players[0]).length,1,'南家應該先請到一尊');
  /* 直接把持有者的香火灌到 99（引擎會拒收他的封籤，所以只能從欄位灌） */
  if(S.incPool) S.incPool[0]=99; else S.shrines.forEach(sh=>{ if(sh.h) sh.h[0]=99; });
  ok(pool(S,0)>=99,`治具已把持有者的香火灌到 99 以上（相容層讀到 ${pool(S,0)}）`);
  S.round=N[0]+1;
  shrineNight(G,S,{1:{amt:1}});
  S.round=N[1];
  shrineNight(G,S,{});
  eq(legendsOf(S.players[0]).length,1,'持有者香火 99 也不得再拿第二尊');
  ok(S.shrines.some(sh=>sh.takenBy===1),
    `第 ${N[1]} 夜應該由還沒請到、香火 1 的北家請神：takenBy=${JSON.stringify(S.shrines.map(sh=>sh.takenBy))}`);
});

/* ================= H5② 得主自選 ================= */
test('H5②得主自選（AI 規則）：挑「袋中最多陣營同系」的那一尊，不是固定第 0 尊',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const N=NIGHTS(G);
  const p=S.players[0];
  p.bag=G.POOL.filter(x=>x.f==='xianghuo'&&!x.curse).slice(0,2).map(x=>({...x}));  /* 袋中最多＝香火系 */
  const want=S.shrines.findIndex(sh=>sh.fac==='xianghuo');
  ok(want>=0,'應該有一尊是香火系');
  S.round=N[0];
  shrineNight(G,S,{0:{shrine:0,amt:3}});     /* 封籤寫「第 0 尊」＝2.0 那一版會拿到祖靈系的第 0 尊 */
  eq(takenBy(S,want),0,`袋中最多的是香火系 ⇒ 得主應該自選第 ${want} 尊（香火系），而不是固定的第 0 尊`);
  eq(legendsOf(p)[0]?legendsOf(p)[0].f:null,'xianghuo','袋裡那一尊應該是香火系');
  eq(pool(S,0),0,'選完之後得主香火歸零');
  eq(openN(S),2,'一夜只出一尊');
});

test('H5②同數取 LEGENDS 順序：空袋（四系皆 0 件）的得主拿第 0 尊',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const N=NIGHTS(G);
  S.round=N[0];
  shrineNight(G,S,{0:{amt:3}});               /* 封籤寫「第 2 尊」；3.0 不看它，AI 規則同數取第 0 尊 */
  eq(takenBy(S,0),0,'空袋（同數）時應該取 LEGENDS 順序最前面的第 0 尊');
  eq(takenBy(S,2),null,'不得因為封籤上寫了第 2 尊就拿第 2 尊（香火不綁尊）');
});

test('H5②真人得主跳選擇窗：interactive 下先回 pending、尊還沒進袋；finishShrines 帶回 idx 才落地',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const N=NIGHTS(G);
  S.round=N[0];
  const out=shrineNight(G,S,{0:{shrine:0,amt:3}},{interactive:true});
  ok(out&&out.pending&&out.pending.pid===0,
    `真人得主應該先跳選尊視窗（out.pending 帶得主與可選清單），實際 ${JSON.stringify(out&&out.pending)}`);
  eq(legendsOf(S.players[0]).length,0,'視窗還沒選之前，尊不得先進袋');
  eq(openN(S),3,'視窗還沒選之前，三尊都要還開著');
  ok(out.pending.choices&&out.pending.choices.length===3,`可選清單應該是三尊：${JSON.stringify(out.pending.choices)}`);
  eq(out.pending.h,3,'視窗上要顯示得主的香火');
  (G.finishShrines||(()=>{}))(out,1);
  eq(takenBy(S,1),0,'玩家點了第 1 尊 ⇒ 第 1 尊要記在他名下');
  eq(legendsOf(S.players[0]).length,1,'選完之後尊才進袋');
  eq(pool(S,0),0,'選完之後香火歸零');
});

test('H5②已被請走的尊不可選：帶回一個已關的 idx，退回 AI 規則、不得重複發同一尊',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const N=NIGHTS(G);
  winFor(G,S,0);
  const got=S.shrines.findIndex(sh=>sh.takenBy===0);
  ok(got>=0,'南家應該先請到一尊');
  S.round=N[0]+1;
  shrineNight(G,S,{1:{amt:2}});
  S.round=N[1];
  const out=shrineNight(G,S,{},{interactive:true});
  ok(out&&out.pending&&out.pending.pid===1,`第 ${N[1]} 夜應該輪到北家選尊：${JSON.stringify(out&&out.pending)}`);
  ok(out.pending.choices.indexOf(got)<0,`已被請走的第 ${got} 尊不得出現在可選清單：${JSON.stringify(out.pending.choices)}`);
  (G.finishShrines||(()=>{}))(out,got);        /* 硬帶一個已被請走的 idx */
  eq(takenBy(S,got),0,'已被請走的尊仍記在原主人名下，不得被改寫');
  eq(legendsOf(S.players[1]).length,1,'北家仍應該拿到一尊（退回 AI 規則挑一尊還開著的）');
  eq(S.shrines.filter(sh=>sh.takenBy===1).length,1,'北家名下只能有一尊');
});

/* ================= H5③ 落空者 h 原封保留 ================= */
test('H5③落空保留：第一個請神夜落空、香火 5 到下一夜仍是 5，而且可以繼續往上加',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const N=NIGHTS(G);
  S.round=1; shrineNight(G,S,{0:{amt:3},1:{amt:3}});
  S.round=2; shrineNight(G,S,{0:{amt:2},1:{amt:3}});
  eq(pool(S,0),5,'南家累到 5');
  eq(pool(S,1),6,'北家累到 6');
  S.round=N[0];
  shrineNight(G,S,{});
  ok(S.shrines.some(sh=>sh.takenBy===1),`第 ${N[0]} 夜應該由香火 6 的北家請神`);
  eq(pool(S,0),5,'落空的南家：香火 **原封保留**（不退壽命、不發小法寶、不歸零）');
  const life=S.players[0].life;
  S.round=N[0]+1;
  shrineNight(G,S,{0:{amt:3}});
  eq(pool(S,0),8,'落空的香火可以繼續往上加（5＋3）');
  eq(S.players[0].life,life-3,'繼續燒香照樣當場扣壽命');
  S.round=N[1];
  shrineNight(G,S,{});
  ok(S.shrines.some(sh=>sh.takenBy===0),`保留下來的香火在第 ${N[1]} 夜換得到一尊`);
  eq(pool(S,0),0,'請到之後歸零');
});

/* ================= H5④ 沒人有資格不結算／最後一夜回天 ================= */
test('H5④沒人有資格（全員香火 0）的請神夜：不結算、三尊都留著，下一個請神夜再比',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const N=NIGHTS(G);
  S.round=N[0];
  const out=shrineNight(G,S,{});             /* 四家都不燒 */
  eq(openN(S),3,`第 ${N[0]} 夜沒有人有資格 ⇒ **三尊都要留著**（不得回天、不得關龕）`);
  ok(out&&out.skip,`out.skip 應該記下這一夜沒有結算：${JSON.stringify(out&&out.skip)}`);
  eq(out.taken.length,0,'沒人有資格的夜不得有人請到');
  /* 下一個請神夜照樣比得到 */
  S.round=N[0]+1; shrineNight(G,S,{2:{amt:2}});
  S.round=N[1];   shrineNight(G,S,{});
  ok(S.shrines.some(sh=>sh.takenBy===2),`第 ${N[1]} 夜應該由西家請神：takenBy=${JSON.stringify(S.shrines.map(sh=>sh.takenBy))}`);
  eq(openN(S),2,'仍然一夜只出一尊');
});

test('H5④沒人有資格（有資格者都沒香火、香火全在已持有者身上）：一樣不結算、剩下的尊都留著',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const N=NIGHTS(G);
  winFor(G,S,0);
  eq(legendsOf(S.players[0]).length,1,'南家先請到一尊');
  /* 把香火全部灌在**已持有者**身上；其餘三家 0 ⇒ 有資格的人裡沒有人 h>0 */
  if(S.incPool){ S.incPool[0]=99; S.incPool[1]=0; S.incPool[2]=0; S.incPool[3]=0; }
  else S.shrines.forEach(sh=>{ if(sh.h){ sh.h[0]=99; sh.h[1]=0; sh.h[2]=0; sh.h[3]=0; } });
  const before=openN(S);
  eq(before,2,'此時應該還有兩尊開著');
  S.round=N[1];
  const out=shrineNight(G,S,{});
  eq(openN(S),2,'「香火全在已持有者身上」也算沒人有資格 ⇒ 剩下兩尊都要留著，不得回天');
  ok(out&&out.skip,`out.skip 應該記下這一夜沒有結算：${JSON.stringify(out&&out.skip)}`);
});

test('H5④最後一個請神夜結算完：沒被請走的尊回天，本局不再出現、也不重開',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const N=NIGHTS(G);
  S.round=N[N.length-1];
  const out=shrineNight(G,S,{0:{amt:3}});
  ok(S.shrines.some(sh=>sh.takenBy===0),`最後一個請神夜香火最高的南家應該請到一尊`);
  eq(openN(S),0,'最後一個請神夜結算完，其餘兩尊要**回天**（全部關起來）');
  ok(out&&out.dawn&&out.dawn.length===2,`out.dawn 應該記下回天的兩尊：${JSON.stringify(out&&out.dawn)}`);
  /* 不重開：之後再燒也不進池、壽命不動 */
  const life=S.players[1].life;
  S.round=N[N.length-1]+1;
  shrineNight(G,S,{1:{amt:3}});
  eq(S.players[1].life,life,'三尊都沒了之後再燒香，壽命不得變動');
  eq(pool(S,1),0,'三尊都沒了之後不得再累積香火');
  eq(openN(S),0,'回天的尊不得重開');
});

/* ================= H5⑤ 一人一尊 ================= */
test('H5⑤一人一尊：請到之後封籤被拒——壽命一毛不扣、香火不累積、out.locked 記一筆',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const N=NIGHTS(G);
  S.round=1; shrineNight(G,S,{0:{amt:3}});
  S.round=N[0];
  shrineNight(G,S,{});
  ok(S.shrines.some(sh=>sh.takenBy===0),`第 ${N[0]} 夜南家應該請走一尊`);
  ok(G.hasLegend?G.hasLegend(S.players[0]):false,'hasLegend 應該對已請走的人回 true');
  const life=S.players[0].life;
  S.round=N[0]+1;
  const out=shrineNight(G,S,{0:{amt:3}});
  eq(S.players[0].life,life,'已請走一尊的人再燒香：壽命一毛都不該扣');
  eq(pool(S,0),0,'已請走一尊的人不該再累積香火');
  ok(out&&out.locked&&out.locked.length===1,`out.locked 應記下被擋的封籤：${JSON.stringify(out&&out.locked)}`);
  /* 而且到了下一個請神夜也拿不到第二尊 */
  S.round=N[1];
  shrineNight(G,S,{1:{amt:1}});
  eq(legendsOf(S.players[0]).length,1,'南家整局只能有一尊');
  ok(S.shrines.some(sh=>sh.takenBy===1),'第二尊應該落到北家（南家已有一尊，不參加開標）');
});

/* ================= H5⑥ 封籤不收龕參數 ================= */
test('H5⑥封籤不收龕參數：帶了 shrine 也忽略，燒進的是**自己的香火池**、紀錄裡不留龕號',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.round=1;
  const out=shrineNight(G,S,{0:{shrine:2,amt:3}});
  eq(pool(S,0),3,'燒進自己的香火池');
  ok(out&&out.burn&&out.burn.length===1,`應該有一筆燒香紀錄：${JSON.stringify(out&&out.burn)}`);
  eq(out.burn[0].shrine,undefined,'燒香紀錄不得帶龕號（3.0 的香火不綁尊）');
  eq(out.burn[0].h,3,'紀錄裡的 h 是**香火池**的累計');
  /* 同一顆封籤換一個 shrine 值，結果必須一模一樣（真的忽略，不是碰巧） */
  const G2=loadGame(TARGET); const S2=setup(G2);
  S2.round=1;
  const out2=shrineNight(G2,S2,{0:{shrine:0,amt:3}});
  eq(pool(S2,0),pool(S,0),'shrine 帶 0 或 2，香火池結果必須相同');
  eq(JSON.stringify(out2.burn),JSON.stringify(out.burn),'兩份封籤的燒香紀錄必須逐位元組相同');
  /* incPick 這一支 UI 掛鉤（2.0 的「選一尊」按鈕）整支移除 */
  const src=fs.readFileSync(TARGET,'utf8');
  eq(/function\s+incPick\s*\(/.test(src),false,'index.html 不得再有 incPick（2.0 的選尊按鈕已移除）');
  eq(/onclick="incPick\(/.test(src),false,'出價面板不得再有 incPick 的按鈕');
});

/* ================= H5⑦ 供奉四案（凍結檔：維持綠）================= */
test('H5⑦供奉：持有者每夜末 −INC_TITHE 壽命；壽命 ≤1 付不出 → 尊回天並移出袋子',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  winFor(G,S,0);
  eq(legendsOf(S.players[0]).length,1,'南家應該先請到一尊');
  const T=G.CFG.INC_TITHE;
  ok(T!=null,`CFG.INC_TITHE 應該存在（供奉）：實際 ${T}`);
  const before=S.players[0].life;
  const log=[];
  ok(!!G.settleTithe,'應該有 settleTithe（供奉結算）這一支');
  G.settleTithe(log);
  eq(S.players[0].life,before-T,`供奉一夜之後南家的壽命（原 ${before}，供奉 ${T}）`);
  eq(legendsOf(S.players[0]).length,1,'付得出來時尊不該離開袋子');
  ok(log.some(x=>/供奉/.test(x)),`夜末戰況 log 應該記一筆供奉：${JSON.stringify(log)}`);
  S.players[0].life=1;
  const log2=[];
  G.settleTithe(log2);
  eq(S.players[0].life,1,'付不出來時不得再扣壽命（不能靠供奉殺人）');
  eq(legendsOf(S.players[0]).length,0,'付不出來 → 那一尊回天、從袋中移除');
  eq(S.players[0].alive,true,'供奉回天不得把人弄出局');
  ok(log2.some(x=>/回天/.test(x)),`夜末戰況 log 應該記一筆回天：${JSON.stringify(log2)}`);
});
test('H5⑦送神回天鈕：任何一夜可主動放手——當夜起不再扣供奉、尊移出袋、那一尊不重開',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const N=NIGHTS(G);
  winFor(G,S,0);
  eq(legendsOf(S.players[0]).length,1,'南家應該先請到一尊');
  const p=S.players[0], x=p.bag.find(y=>y.legend);
  const got=S.shrines.findIndex(sh=>sh.takenBy===0);
  const life=p.life;
  ok(!!G.releaseLegend,'應該有 releaseLegend（送神回天的單一事實來源）');
  const msgs=[];
  G.releaseLegend(p,x,msgs,'主動送神回天',false);
  eq(legendsOf(p).length,0,'送神回天之後袋裡不該還有那一尊');
  eq(p.life,life,'送神回天本身不扣壽命');
  ok(msgs.some(t=>/回天/.test(t)),`戰況 log 應該記一筆：${JSON.stringify(msgs)}`);
  G.settleTithe([]);
  eq(p.life,life,'送神回天當夜起就不再供奉');
  eq(S.shrines[got].open,false,'送神回天之後那一尊不得重開');
  S.round=N[1];
  shrineNight(G,S,{1:{amt:3}});
  eq(takenBy(S,got),0,'尊仍記在原本請走的人名下，不得被別人再請一次');
  eq(legendsOf(S.players[1]).some(y=>y.n===x.n),false,'別人也拿不到回天的那一尊');
});
test('H5⑦危急提示：只在「付完壽命 ≤TITHE_WARN」那一夜出現，同一尊只一次；headless 走預設「要」',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const W=G.CFG.TITHE_WARN, T=G.CFG.INC_TITHE;
  winFor(G,S,0);
  const p=S.players[0];
  eq(legendsOf(p).length,1,'南家應該先請到一尊');
  ok(W!=null&&T!=null,`CFG.TITHE_WARN／INC_TITHE 應該存在：${W}／${T}`);
  p.life=30;
  S.titheAsk=[];
  G.settleTithe([]);
  eq(p.life,30-T,'門檻以上的夜：自動扣供奉');
  eq(S.titheAsk.length,0,'門檻以上的夜不得跳提示');
  p.life=W+T;
  S.titheAsk=[];
  G.settleTithe([]);
  eq(S.titheAsk.length,1,`付完剩 ${W}（≤TITHE_WARN）那一夜應該跳一次提示`);
  eq(p.life,W,'headless 走預設「要」：照樣扣，尊留在袋裡');
  eq(legendsOf(p).length,1,'預設「要」不得把尊拿走');
  p.life=W+T;
  S.titheAsk=[];
  G.settleTithe([]);
  eq(S.titheAsk.length,0,'同一尊只提示一次');
  eq(p.life,W,'之後照舊自動扣');
});
test('H5⑦AI 放手走同一條門檻：AI 持有者在「付完 ≤TITHE_WARN」那一夜主動送神回天',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  winFor(G,S,0);
  const p=S.players[0];
  eq(legendsOf(p).length,1,'南家應該先請到一尊');
  p.ai={aggr:0.6};                 /* 把這一席改成 AI（判準是 p.ai，不是角色 id） */
  p.life=G.CFG.TITHE_WARN+G.CFG.INC_TITHE;
  const log=[];
  G.settleTithe(log);
  eq(legendsOf(p).length,0,'AI 在門檻上應該主動送神回天（同一條門檻）');
  eq(p.life,G.CFG.TITHE_WARN+G.CFG.INC_TITHE,'AI 放手那一夜不扣供奉');
  ok(log.some(t=>/回天/.test(t)),`戰況 log 應該記一筆：${JSON.stringify(log)}`);
});
test('H5⑦神債最後收：壽命 2＋詛咒品 −1 → 先 drain 剩 1 → 付不出供奉 → 傳說回天、人活著',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  winFor(G,S,0);
  const p=S.players[0];
  eq(legendsOf(p).length,1,'南家應該先請到一尊');
  const curse=G.CURSES.find(x=>x.drain)||{n:'魔神仔的芭樂',f:'curse',p:0,curse:true,drain:1};
  p.bag.push({...curse});
  p.life=2;
  S.players.forEach(q=>{ if(q.id!==p.id) q.life=60; });
  ok(!!G.resolveBattles,'應該有 resolveBattles（夜末結算的那一支）');
  G.resolveBattles();
  eq(p.alive,true,'夜末結完之後南家應該還活著（供奉不得把人殺死）');
  eq(p.life,1,'drain 扣掉 1 之後剩 1，供奉付不出來所以不再扣');
  eq(legendsOf(p).length,0,'付不出供奉 → 那一尊回天、從袋中移除');
});

/* ================= H5⑧ kill switch 與亂數帳 ================= */
test('H5⑧kill switch：OFF 零亂數、不建 S.shrines；**ON 也不得因尊→夜洗牌多耗 rng**（3.0 把洗牌整支拿掉）',()=>{
  const G=loadGame(TARGET);
  /* 量 makeState 一次消耗幾個 S.rng()：把 S.rng 換成計數器（同一顆 mulberry32，兩邊數列一致） */
  const count=(g,on)=>{
    g.CFG.LEGEND_ON=on;
    let n=0;
    const real=g.mulberry32;
    g.__c=0;
    const S=g.makeState('solo',1);           /* makeState 內部用的是自己建的 rng，這裡量的是「之後」 */
    return {S,n};
  };
  /* 直接量 makeState 期間的消耗：先包 mulberry32，讓 makeState 建出來的 rng 帶計數 */
  const measure=on=>{
    const g=loadGame(TARGET);
    g.CFG.LEGEND_ON=on;
    let n=0;
    const base=g.mulberry32(12345);
    const S0=g.makeState('solo',1);
    /* makeState 之後把 rng 換掉，再手動重跑一次「請神段會做的事」不可行 ⇒ 改量 trace 的亂數帳：
       同一顆種子下，ON 與 OFF 的差異只會來自請神段。這裡用 S.rng 的呼叫次數作為指標。 */
    return S0;
  };
  /* OFF：makeState 之後不得有 S.shrines，且 resolveShrines／settleShrinesEnd 一次亂數都不耗 */
  G.CFG.LEGEND_ON=false;
  let off=0;
  const baseOff=G.mulberry32(123);
  const So=G.makeState('solo',1); So.rng=()=>{off++;return baseOff();};
  eq(So.shrines,undefined,'LEGEND_ON=false 時不得建立 S.shrines');
  eq(G.resolveShrines(),null,'LEGEND_ON=false 時 resolveShrines 恆回 null');
  eq(G.settleShrinesEnd(),null,'LEGEND_ON=false 時 settleShrinesEnd 恆回 null');
  eq(off,0,'OFF 路徑不得消耗任何 S.rng()');
  /* ON 不再消耗洗牌 rng：makeState 消耗的亂數量，ON 與 OFF 必須**一模一樣**。
     量法＝同一顆種子建完 state 之後，再跟一顆全新的 mulberry32 對數列位置——
     用「makeState 之後接著抽一個數」是否相等來判：2.0 的 shuffle 會把 ON 的數列往前推兩格。 */
  const nextOf=on=>{ const g=loadGame(TARGET); g.CFG.LEGEND_ON=on; const S=g.makeState('solo',1); return S.rng(); };
  eq(nextOf(true),nextOf(false),
    'ON 與 OFF 在 makeState 之後的亂數游標必須落在同一格——2.0 的尊→夜洗牌會多吃兩個 rng，這一條就是它的探針');
  /* 活性：ON 真的建了三尊，而且沒有任何一尊帶「開標夜」欄位（3.0 沒有尊→夜這件事） */
  const S=setup(loadGame(TARGET),1);
  eq(S.shrines?S.shrines.length:0,3,'LEGEND_ON=true 時應建三尊');
  ok(S.shrines.every(sh=>sh.night===undefined),`3.0 的尊不得帶 night 欄位：${JSON.stringify(S.shrines.map(s=>s.night))}`);
  ok(S.incPool&&S.incPool.length===4,`應該有四家的香火池 S.incPool：${JSON.stringify(S.incPool)}`);
});

/* ================= H5 補：燒香夾限與封籤留痕（不得回歸） ================= */
test('H5補：燒香夾限＋封籤留痕——壽命 3 封 3 → 實燒 2，clip 事件與 shrineStat 都要有',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.players[0].life=3;
  S.round=1;
  const out=shrineNight(G,S,{0:{amt:3}});
  eq(S.players[0].life,1,'壽命 3 燒 3 應被夾成 2（留 1 口氣）');
  eq(pool(S,0),2,'累計香火應該是實燒的 2');
  ok(out&&out.clip&&out.clip.length===1,`clip 事件應有一筆：${JSON.stringify(out&&out.clip)}`);
  eq(S.shrineStat.clip,1,'shrineStat.clip');
});

/* ================= H5 補：局末結清（提案 §二 6，口徑沿用 2.0 的區間）================= */
test('H5補：局末結清依「場上最高香火」的比例——最高 9 時 h=9 退 5＋小法寶、h=6 退 3＋小法寶、h=3 退 1',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=()=>0.5;                       /* 抽小法寶要用到；固定值讓結果可重現 */
  /* 三家各給一件祖靈法寶當主系（3.0 的小法寶抽自結清者自己的主系） */
  const zu=G.POOL.filter(x=>x.f==='zuling'&&!x.curse)[0];
  [0,1,2].forEach(i=>{ S.players[i].bag=[{...zu}]; });
  for(let k=0;k<3;k++){ S.round=1+k; shrineNight(G,S,{0:{amt:3},1:{amt:2},2:{amt:1}}); }
  eq(pool(S,0),9,'南家香火池'); eq(pool(S,1),6,'北家'); eq(pool(S,2),3,'西家');
  const l0=S.players[0].life, l1=S.players[1].life, l2=S.players[2].life;
  const b0=S.players[0].bag.length, b1=S.players[1].bag.length, b2=S.players[2].bag.length;
  const out=G.settleShrinesEnd();
  eq(S.players[0].life-l0,5,'南家（h=9＝場上最高）應退 ⌈9/2⌉=5 壽命');
  eq(S.players[0].bag.length-b0,1,'南家應另得一件主系小法寶');
  eq(S.players[1].life-l1,3,'北家（h=6，最高 9 的 2/3）應退 ⌈6/2⌉=3 壽命');
  eq(S.players[1].bag.length-b1,1,'北家應另得一件主系小法寶');
  eq(S.players[2].life-l2,1,'西家（h=3，最高 9 的 1/3）應退 ⌈3/3⌉=1 壽命');
  eq(S.players[2].bag.length-b2,0,'西家（不到 2/3）沒有小法寶');
  ok(out&&out.length===3,`局末結清應有三筆：${JSON.stringify(out)}`);
  eq(pool(S,0)+pool(S,1)+pool(S,2)+pool(S,3),0,'結清後香火全部歸零');
});

/* ================= 五條守衛（沿用；2.0 已有、3.0 不得回歸） ================= */
test('守衛：傳說不進 S.deck、也不在 POOL 裡——整局市集不會出現傳說，但請神請得下來',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const names=new Set(G.LEGENDS.map(L=>L.n));
  ok(!G.POOL.some(x=>names.has(x.n)),'POOL 裡不得有傳說');
  ok(!S.deck.some(x=>names.has(x.n)),'S.deck 裡不得有傳說');
  const G2=loadGame(TARGET); G2.CFG.LEGEND_ON=true;
  const run=G2.simulate(11);
  let seen=0, taken=0;
  run.nights.forEach(n=>{ n.market.forEach(nm=>{ if(names.has(nm)) seen++; });
    if(n.shrine&&n.shrine.taken) taken+=n.shrine.taken.length; });
  eq(seen,0,'整局市集不得出現任何一尊傳說');
  ok(taken>0,`同一局裡請神要真的請得下來（否則這一案退化成恆真）：taken=${taken}`);
});
test('守衛：AI 燒香啟發式是資料表驅動——ROLES[*].ai.inc 覆寫 minLifeFrac 之後那個角色就不拜了',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const p=S.players[1];
  p.ai={aggr:0.6}; p.life=60;
  ok(G.aiIncense(p),'預設設定下這一席應該會燒香');
  p.ai={aggr:0.6, inc:{minLifeFrac:99}};   /* 覆寫成「壽命低於 LIFE×99 就不拜」＝一定不拜 */
  eq(G.aiIncense(p),null,'ROLES[*].ai.inc 覆寫 minLifeFrac 之後應該完全不燒香');
  eq(G.incAiOf(p).cfg.minLifeFrac,99,'incAiOf 應該把個別覆寫疊在 CFG.INC_AI 上');
});
test('守衛：settleShrinesEnd 冪等——連叫兩次不得重複結清、壽命不得再變',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=()=>0.5;
  S.round=1;
  shrineNight(G,S,{0:{amt:3},1:{amt:2}});
  const a=G.settleShrinesEnd();
  const lives=S.players.map(q=>q.life);
  ok(a&&a.length>0,`第一次回天結清應該有東西：${JSON.stringify(a)}`);
  const b=G.settleShrinesEnd();
  eq(JSON.stringify(S.players.map(q=>q.life)),JSON.stringify(lives),'第二次呼叫不得再改壽命');
  eq(b.length,0,'第二次呼叫不得再結出任何一筆');
});
test('守衛：回天結清不得就地改寫「不是本輪收尾」的那一筆 S.history.life',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=()=>0.5;
  S.round=3;
  S.history={nights:[{round:2,closed:true}],life:[[60,60,60,60],[59,59,59,59]],shrineDawn:null};
  shrineNight(G,S,{0:{amt:3}});
  const snapshot=JSON.stringify(S.history.life);
  G.settleShrinesEnd();
  eq(JSON.stringify(S.history.life),snapshot,
    '末筆不是本輪（history 停在第 2 夜、現在是第 3 夜）時，回天結清不得覆寫它');
  ok(S.history.shrineDawn&&S.history.shrineDawn.length>0,'但回天的紀錄本身要留下來');
});
test('守衛：傳說的招式真的進得了 paperWar——殘日的餘暉灼目會出現在對決 beats 裡',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  G.CFG.PAPERWAR_ON=true;
  const L=G.LEGENDS.find(x=>x.unit&&x.unit.trait==='eliteBlind');
  ok(L,'應該有一尊帶 eliteBlind（殘日的餘暉灼目）');
  const foe=G.POOL.filter(x=>!x.curse&&x.f==='xianghuo').slice(0,3).map(x=>({...x}));
  let hit=0;
  for(let sd=1;sd<=40;sd++){
    const A={id:0,name:'A',bag:[{...L}],life:50,roleId:'human'};
    const B={id:1,name:'B',bag:foe.map(x=>({...x})),life:50,roleId:'human'};
    const rng=G.mulberry32(sd);
    const war=G.paperWar(A,B,{rng,round:1,windId:0});
    if(war&&war.beats&&war.beats.some(b=>b.kind==='trait'&&b.trId==='eliteBlind')) hit++;
  }
  ok(hit>0,`40 場裡至少要有一場記到 eliteBlind 的招式事件（實際 ${hit}）——招式沒接進引擎的話這裡恆 0`);
});

/* ================= H10 傳說共鳴（凍結檔：維持綠）================= */
test('H10傳說共鳴：持殘日（祖靈）＋2 件祖靈法寶 → facCount("zuling")=4（傳說算 2 件）',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const zu=G.POOL.filter(x=>x.f==='zuling'&&!x.curse).slice(0,2).map(x=>({...x}));
  const L=G.LEGENDS.find(x=>x.f==='zuling');
  const p=S.players[0];
  p.bag=[...zu];
  eq(G.facCount(p,'zuling'),2,'先確認：兩件祖靈＝2 件（沒有傳說時的基準）');
  p.bag=[...zu,{...L}];
  eq(G.facCount(p,'zuling'),4,'加上殘日之後：本體 1 件＋共鳴額外 1 件＝4 件');
  eq(G.facCount(p,'xianghuo'),0,'傳說共鳴只加自己那一系');
  p.bag=[...zu,{...L},{...L}];
  eq(G.facCount(p,'zuling'),5,'兩份殘日：本體 2 件＋共鳴只加 1 次＝5（同名法寶效果不疊加）');
});

/* ================= H11 部隊預覽（凍結檔：維持綠）================= */
test('H11部隊預覽：5 個袋子的逐件隻數／atk／hp／拍序／招式名，逐項等於 buildArmy 展開與 TRAITS 表',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const unitRow=G.unitRow||(()=>null);
  const pool2=G.POOL.filter(x=>!x.curse);
  const byF=f=>pool2.filter(x=>x.f===f);
  const curse=G.CURSES?G.CURSES[0]:{n:'冥婚紅包',f:'curse',p:-5,curse:true};
  const bags=[
    byF('zuling').slice(0,3).map(x=>({...x})),
    byF('xianghuo').slice(0,3).map(x=>({...x})),
    byF('yinqi').slice(0,3).map(x=>({...x})),
    [...byF('zuling').slice(0,2).map(x=>({...x})), {...curse}],
    [...byF('zuling').slice(0,2).map(x=>({...x})), ...G.LEGENDS.map(L=>({...L}))],
  ];
  bags.forEach((bag,bi)=>{
    const a=G.buildArmy(bag);
    let ti=0;
    bag.forEach(it=>{
      const r=unitRow(it);
      if(it.curse){ ok(r&&r.curse,`袋${bi}「${it.n}」是詛咒品，預覽應標示不召喚（實際 ${JSON.stringify(r)}）`); return; }
      const t=a.teams[ti++];
      ok(r,`袋${bi}「${it.n}」應該有預覽`);
      eq(r.n,t.units.length,`袋${bi}「${it.n}」隻數`);
      eq(r.atk,t.units[0].atk,`袋${bi}「${it.n}」atk`);
      eq(r.hp,t.units[0].max,`袋${bi}「${it.n}」hp`);
      eq(r.body,t.body,`袋${bi}「${it.n}」體型`);
      const beat=t.fac?G.BEAT_FAC.indexOf(t.fac)+1:0;
      eq(r.beat,beat,`袋${bi}「${it.n}」出手拍`);
      const tr=(it.unit&&it.unit.trait)?G.TRAITS[it.unit.trait]:null;
      eq(r.move,tr?tr.name:'',`袋${bi}「${it.n}」招式名`);
      eq(r.desc,tr?tr.desc:'',`袋${bi}「${it.n}」招式說明`);
    });
  });
});
test('H11市集卡招式行：27 件法寶＋3 尊傳說——卡面只印數字、卡片詳情印招式且與 TRAITS 對得上',()=>{
  const G=loadGame(TARGET); setup(G);
  G.CFG.PAPERWAR_ON=true;
  const unitRowText=G.unitRowText||(()=>'');
  const unitRow=G.unitRow||(()=>null);
  const all=[...G.POOL.filter(x=>!x.curse),...G.LEGENDS];
  eq(all.length,30,'27 件法寶＋3 尊傳說');
  all.forEach(it=>{
    const card=unitRowText(it);
    const full=unitRowText(it,null,'full');
    ok(card&&card.length>0,`「${it.n}」的卡面部隊預覽一行不得為空`);
    const tr=G.TRAITS[it.unit.trait];
    ok(tr,`「${it.n}」應該有 TRAITS 表項`);
    const r=unitRow(it);
    ok(r&&card.indexOf('×'+r.n)>=0,`「${it.n}」卡面那一行應含隻數 ×${r.n}：${card}`);
    ok(card.indexOf('攻 '+r.atk)>=0&&card.indexOf('血 '+r.hp)>=0,`「${it.n}」卡面那一行應含攻／血：${card}`);
    ok(card.indexOf(tr.name)<0,`「${it.n}」**卡面不得**印招式名（已移到卡片詳情）：${card}`);
    ok(full.indexOf(tr.name)>=0,`「${it.n}」卡片詳情應含招式名「${tr.name}」：${full}`);
    ok(full.indexOf(tr.desc)>=0,`「${it.n}」卡片詳情應含招式說明：${full}`);
  });
});
test('H11詛咒品那一行看主人：一般人印「只算纏身」，帶 curseWard 的印「已淨化」',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  G.CFG.PAPERWAR_ON=true;
  const curse=G.CURSES[0];
  const plain=S.players[1]; plain.roleId='human'; plain.bag=[];
  const txtPlain=(G.unitRowText||(()=>''))(curse,plain);
  ok(/纏身/.test(txtPlain)&&!/淨化/.test(txtPlain),`一般人看到的詛咒品說明：${txtPlain}`);
  const rid=Object.keys(G.ROLES).find(k=>G.ROLES[k].traits&&G.ROLES[k].traits.curseWard);
  ok(rid,`應該有角色帶 traits.curseWard：${JSON.stringify(Object.keys(G.ROLES))}`);
  const ward=S.players[2]; ward.roleId=rid; ward.bag=[];
  ok(G.traitMax(ward,'curseWard',0)>0,'治具設定的那一席應該真的帶 curseWard');
  const txtWard=(G.unitRowText||(()=>''))(curse,ward);
  ok(/淨化/.test(txtWard)&&!/只算纏身/.test(txtWard),`帶 curseWard 的人看到的詛咒品說明：${txtWard}`);
});
test('H11袋子總計：總隻數／總攻／總血與 buildArmy(整袋) 一致，共鳴 hp 與 pwResLv 一致',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  G.CFG.PAPERWAR_ON=true;
  const zu=G.POOL.filter(x=>x.f==='zuling'&&!x.curse).slice(0,3).map(x=>({...x}));
  const p=S.players[0]; p.bag=[...zu,{...G.LEGENDS.find(x=>x.f==='zuling')}];
  const a=G.buildArmy(p.bag);
  let n=0,atk=0,hp=0;
  a.teams.forEach(t=>t.units.forEach(u=>{n++;atk+=u.atk|0;hp+=u.max|0;}));
  const html=G.bagPreviewHTML?G.bagPreviewHTML(p):'';
  ok(html.indexOf(`${n} 隻・總攻 ${atk}・總血 ${hp}`)>=0,`袋子總計那一行應該是「${n} 隻・總攻 ${atk}・總血 ${hp}」：${html.slice(0,200)}`);
  const lv=G.pwResLv(p,'zuling');
  ok(lv>0,`四件祖靈（含傳說算 2 件）應該有共鳴：lv=${lv}`);
  ok(html.indexOf(`共鳴 該系那一拍 hp+${lv}`)>=0,`袋子總計那一行應該印出「共鳴 該系那一拍 hp+${lv}」：${html.slice(0,300)}`);
});

/* ================= 決定性 ================= */
test('決定性：顯式 LEGEND_ON=true 下 trace(1..20) 連跑兩次逐位元組相等，且引擎段零 Math.random',()=>{
  const G1=loadGame(TARGET), G2=loadGame(TARGET);
  G1.CFG.LEGEND_ON=true; G2.CFG.LEGEND_ON=true;
  const seeds=Array.from({length:20},(_,i)=>i+1);
  eq(JSON.stringify(G1.trace(seeds)),JSON.stringify(G2.trace(seeds)),'同一份程式碼兩次 trace');
  const html=fs.readFileSync(TARGET,'utf8');
  const code=html.match(/<script>[\s\S]*?<\/script>/)[0];
  eq((code.match(/Math\.random/g)||[]).length,0,'引擎 <script> 段不得出現 Math.random');
});

console.log(`\n${pass} 過 / ${fail} 失敗`);
if(fail){ console.log('\n失敗清單：'); fails.forEach(f=>console.log('  - '+f)); process.exit(1); }

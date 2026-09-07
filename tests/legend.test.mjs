/* 請神 2.0「神債暗標」行為單元測試（凍結檔 docs/experiments/2026-09-07-acceptance-legend-v2.md G5／G10／G11）
   跑法：node tests/legend.test.mjs [index.html 的路徑]
   鑑別力（02 §6.1 第 1 條）：
     git show b38980a:index.html > old-l.html && node tests/legend.test.mjs old-l.html
     （b38980a＝本卷派工時的 main＝請神 1.0：擲骰 h/(h+K)＋天井、沒有請神夜、沒有一人一尊、沒有供奉、
       傳說不算 2 件、沒有部隊預覽。每一案都必須紅在**行為斷言**上。）
   ★不讓屬性錯誤排在行為斷言前面★：對 index.html 新增的匯出一律用 `G.x?G.x(...):<退路>` 取值，
   取不到就讓後面的行為斷言自己紅（舊版沒有 settleTithe／hasLegend／unitRow／CFG.SHRINE_NIGHTS）。 */
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
/* 把某一龕燒到指定的 h，然後把回合推到它的請神夜結算。
   舊版沒有 sh.night ⇒ nightOf 退回 null，測試會紅在「應該有人請走」這種行為斷言上。 */
const nightOf=(G,S,i)=>(S.shrines&&S.shrines[i]&&S.shrines[i].night)
  ||((G.CFG.SHRINE_NIGHTS&&G.CFG.SHRINE_NIGHTS[i])||[4,7,10][i]);
const legendsOf=p=>p.bag.filter(x=>x.legend);
const takenBy=(S,i)=>S.shrines&&S.shrines[i]?S.shrines[i].takenBy:undefined;
/* 骰子：舊版（1.0）會用 S.rng 決定請不請得到。固定成「非天井必失敗」，
   這樣舊版的行為就是「幾乎請不到」，本檔的行為斷言（誰請走、退多少）就會紅在數字上。 */
const alwaysFail=()=>0.99;

/* ================= G5 ① 請神夜 h 最高者得 ================= */
test('G5①請神夜開標：累計香火最高的人請走，其他人一個都拿不到',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysFail;
  const night=nightOf(G,S,0);
  S.round=1; shrineNight(G,S,{0:{shrine:0,amt:3},1:{shrine:0,amt:2},2:{shrine:0,amt:1}});
  eq(takenBy(S,0),null,'請神夜還沒到，第 0 龕不該有人請走');
  S.round=night;
  const out=shrineNight(G,S,{});
  eq(takenBy(S,0),0,'請神夜開標後，香火最高（南家 3）的人應該請走第 0 龕');
  eq(legendsOf(S.players[0]).length,1,'南家袋裡的傳說件數');
  eq(legendsOf(S.players[1]).length,0,'北家（香火 2）不該拿到');
  eq(S.shrines[0].open,false,'請走之後那一龕要關閉');
  ok(out&&out.taken.length===1&&out.taken[0].h===3,`out.taken 應記下得標香火 3：${JSON.stringify(out&&out.taken)}`);
});

/* ================= G5 ① 同分風位順時針 ================= */
test('G5①同分：依「本夜風位起順時針」的第一個人請走（不是座位 0 恆贏）',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysFail;
  const night=nightOf(G,S,0);
  S.round=night;
  /* 四家同 h＝1 → 由「本夜風位起順時針」的第一個決定＝windPid(round)（windPid 新舊版都有） */
  const wind=G.windPid(night);
  shrineNight(G,S,{0:{shrine:0,amt:1},1:{shrine:0,amt:1},2:{shrine:0,amt:1},3:{shrine:0,amt:1}});
  eq(takenBy(S,0),wind,`四家同 h 時，應由本夜風位家（座位 ${wind}）請走`);
  /* 順序本身也要是四家的一個排列，且第一個就是風位家（不得只是「座位 0 恆贏」） */
  const order=G.shrineWindOrder?G.shrineWindOrder(night):null;
  ok(order&&order.length===4&&new Set(order).size===4,`shrineWindOrder(${night}) 應回四個座位的順時針序：${JSON.stringify(order)}`);
  eq(order[0],wind,'順時針序的第一個應該就是本夜風位家');
  ok(G.shrineWindOrder(night+1)[0]!==wind,'下一夜的風位家要換人（風位輪轉，不是固定座位）');
});

/* ================= G5 ② h 全 0 回天且不重開 ================= */
test('G5②請神夜沒有任何人上香 → 那一尊回天，本局不再出現、也不重開',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysFail;
  const night=nightOf(G,S,1);
  S.round=night;
  const out=shrineNight(G,S,{});   /* 四家都不燒 */
  eq(S.shrines[1].open,false,'請神夜無人上香 → 該龕應該關閉（回天）');
  eq(takenBy(S,1),null,'回天不該有 takenBy');
  ok(out&&out.dawn&&out.dawn.length>=1,`out.dawn 應記下回天的龕：${JSON.stringify(out&&out.dawn)}`);
  /* 不重開：之後再燒也不進 h、壽命不動 */
  const before=S.players[0].life;
  S.round=night+1;
  shrineNight(G,S,{0:{shrine:1,amt:3}});
  eq(S.players[0].life,before,'回天之後再對同一尊燒香，壽命不得變動');
  eq(S.shrines[1].open,false,'回天的龕不得重開');
  eq(legendsOf(S.players[0]).length,0,'回天的尊不得再被請走');
});

/* ================= G5 ③ 一人一尊 ================= */
test('G5③一人一尊：請到一尊之後，其餘龕不再收這個人的香（封籤被拒、壽命不扣）',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysFail;
  const n0=nightOf(G,S,0);
  S.round=n0;
  shrineNight(G,S,{0:{shrine:0,amt:3}});
  eq(takenBy(S,0),0,'南家應該請走第 0 龕');
  ok(G.hasLegend?G.hasLegend(S.players[0]):false,'hasLegend 應該對已請走的人回 true');
  const life=S.players[0].life;
  const other=S.shrines.findIndex(sh=>sh.open);
  ok(other>=0,'應該還有別的龕開著');
  S.round=n0+1;
  const out=shrineNight(G,S,{0:{shrine:other,amt:3}});
  eq(S.players[0].life,life,'已請走一尊的人再燒香：壽命一毛都不該扣');
  eq(S.shrines[other].h[0]|0,0,'已請走一尊的人不該在別的龕上累積香火');
  ok(out&&out.locked&&out.locked.length===1,`out.locked 應記下被擋的封籤：${JSON.stringify(out&&out.locked)}`);
  /* 而且真的到了那一龕的請神夜也拿不到第二尊 */
  S.players[1].life=60;
  S.round=S.shrines[other].night;
  shrineNight(G,S,{0:{shrine:other,amt:3},1:{shrine:other,amt:1}});
  eq(takenBy(S,other),1,'第二龕應該落到北家（南家已有一尊，不參加開標）');
  eq(legendsOf(S.players[0]).length,1,'南家整局只能有一尊');
});

/* ================= G5 ④ 供奉 ================= */
test('G5④供奉：持有者每夜末 −INC_TITHE 壽命；壽命 ≤1 付不出 → 尊回天並移出袋子',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysFail;
  const n0=nightOf(G,S,0);
  S.round=n0;
  shrineNight(G,S,{0:{shrine:0,amt:3}});
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
  /* 付不出：壽命壓到 1 */
  S.players[0].life=1;
  const log2=[];
  G.settleTithe(log2);
  eq(S.players[0].life,1,'付不出來時不得再扣壽命（不能靠供奉殺人）');
  eq(legendsOf(S.players[0]).length,0,'付不出來 → 那一尊回天、從袋中移除');
  eq(S.players[0].alive,true,'供奉回天不得把人弄出局');
  eq(S.shrines[0].open,false,'供奉回天之後那一龕不得重開');
  ok(log2.some(x=>/回天/.test(x)),`夜末戰況 log 應該記一筆回天：${JSON.stringify(log2)}`);
});

/* ================= G5 ⑤ 階段獎勵依本龕最高 h 比例 ================= */
test('G5⑤階段獎勵：區間依「本龕最高 h」的比例（不是固定門檻）——最高 9 時 h=3 退 1、h=6 退 3＋小法寶',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=()=>0.5;                       /* 抽小法寶要用到；固定值讓結果可重現 */
  const n0=nightOf(G,S,0);
  /* 累到 南9／北6／西3：三夜各燒 3／2／1 */
  for(let k=0;k<3;k++){ S.round=1+k; shrineNight(G,S,{0:{shrine:0,amt:3},1:{shrine:0,amt:2},2:{shrine:0,amt:1}}); }
  eq(S.shrines[0].h[0]|0,9,'南家累計香火');
  eq(S.shrines[0].h[1]|0,6,'北家累計香火');
  eq(S.shrines[0].h[2]|0,3,'西家累計香火');
  const l1=S.players[1].life, l2=S.players[2].life, bag1=S.players[1].bag.length;
  S.round=n0;
  const out=shrineNight(G,S,{});      /* 開標：不再加燒，直接比大小 */
  eq(takenBy(S,0),0,'南家（香火 9）應該請走');
  /* top=9 ⇒ 2/3×9=6：北家 h=6 落在「≥2top/3」→ 退 ⌈6/2⌉=3 ＋ 小法寶；西家 h=3 落在 [3,6) → 退 ⌈3/3⌉=1、無法寶 */
  eq(S.players[1].life-l1,3,'北家（h=6，本龕最高 9 的 2/3）應退 ⌈6/2⌉=3 壽命');
  eq(S.players[1].bag.length-bag1,1,'北家應另得一件該系小法寶');
  eq(S.players[2].life-l2,1,'西家（h=3，本龕最高 9 的 1/3）應退 ⌈3/3⌉=1 壽命');
  ok(out&&out.rewards.length===2,`階段獎勵應有兩筆：${JSON.stringify(out&&out.rewards)}`);
  eq(S.shrines[0].h.reduce((a,b)=>a+b,0),0,'結清後全部香火歸零');
});

/* ================= G5 ⑥ 尊→夜洗牌 ================= */
test('G5⑥尊→夜洗牌：走 S.rng、同種子可重現、三夜互異且都在 CFG.SHRINE_NIGHTS 裡',()=>{
  const G=loadGame(TARGET);
  const nightsOf=seed=>{ const S=setup(G,seed); return S.shrines.map(sh=>sh.night); };
  /* 行為斷言排最前面：掃 200 顆種子，第 0 龕應該三個請神夜都出現過（＝真的有洗牌、也真的排了夜） */
  const seen=new Set();
  for(let s=1;s<=200;s++) seen.add(nightsOf(s)[0]);
  eq(seen.size,3,`200 顆種子裡第 0 龕應該三個請神夜都出現過（真的有洗牌、也真的排了夜）：${JSON.stringify([...seen])}`);
  const a=nightsOf(7), b=nightsOf(7);
  eq(JSON.stringify(a),JSON.stringify(b),'同一顆種子兩次 makeState 的尊→夜必須一模一樣（決定性）');
  eq(new Set(a).size,3,`三龕的請神夜必須互異：${JSON.stringify(a)}`);
  const NI=G.CFG.SHRINE_NIGHTS;
  ok(Array.isArray(NI)&&NI.length===3,`CFG.SHRINE_NIGHTS 應該是三個請神夜：實際 ${JSON.stringify(NI)}`);
  ok(a.every(n=>NI.includes(n)),`每一夜都要落在 CFG.SHRINE_NIGHTS 裡：${JSON.stringify(a)}`);
});

/* ================= G5 ⑦ OFF 路徑零 rng ================= */
test('G5⑦kill switch：LEGEND_ON=false 時零亂數消耗、不建 S.shrines；打開時一定會洗尊→夜（兩邊都驗才有鑑別力）',()=>{
  const G=loadGame(TARGET);
  const count=g=>{ let n=0; const base=g.mulberry32(123); const S=g.makeState('solo',1); S.rng=()=>{n++;return base();}; return {S,get n(){return n;}}; };
  /* OFF：makeState 之後不得有 S.shrines，且 resolveShrines／settleShrinesEnd 一次亂數都不耗 */
  G.CFG.LEGEND_ON=false;
  const off=count(G);
  eq(off.S.shrines,undefined,'LEGEND_ON=false 時不得建立 S.shrines');
  eq(G.resolveShrines(),null,'LEGEND_ON=false 時 resolveShrines 恆回 null');
  eq(G.settleShrinesEnd(),null,'LEGEND_ON=false 時 settleShrinesEnd 恆回 null');
  eq(off.n,0,'OFF 路徑不得消耗任何 S.rng()');
  /* ON：三龕要建起來，而且**只有到了自己的請神夜才會開標**——
     這一條同時是打開這一邊的行為斷言：1.0 的天井（h≥12 必請）會在任何一夜直接把尊送出去，
     2.0 燒到 h=12 但還沒到請神夜時，一個都不該出手。 */
  G.CFG.LEGEND_ON=true;
  const S=setup(G,1);
  eq(S.shrines?S.shrines.length:0,3,'LEGEND_ON=true 時應建三龕');
  S.rng=alwaysFail;
  /* 挑一座請神夜在第 7 夜以後的龕（舊版沒有 night ⇒ `sh.night||99` 讓它取第 0 龕，照樣跑得完） */
  const idx=S.shrines.findIndex(sh=>(sh.night||99)>=7);
  const use=idx>=0?idx:0;
  for(let r=1;r<=5;r++){ S.round=r; shrineNight(G,S,{0:{shrine:use,amt:3}}); }
  eq(takenBy(S,use),null,'燒到 h≥12 但還沒到請神夜——1.0 的天井會在這裡直接把尊送出去，2.0 不得有任何人請走');
  ok((S.shrines[use].h[0]|0)>=12,`活性：香火真的累到 12 以上（不是因為沒燒到才沒人請走）：${S.shrines[use].h[0]}`);
  ok(S.shrines.every(sh=>typeof sh.night==='number'),`每一龕都要帶 night：${JSON.stringify(S.shrines.map(s=>s.night))}`);
});

/* ================= G5 補：燒香夾限與封籤留痕（1.0 已有、2.0 不得回歸） ================= */
test('G5補：燒香夾限＋封籤留痕——壽命 3 封 3 → 實燒 2，clip 事件與 shrineStat 都要有',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  S.rng=alwaysFail;
  S.players[0].life=3;
  S.round=1;
  const out=shrineNight(G,S,{0:{shrine:0,amt:3}});
  eq(S.players[0].life,1,'壽命 3 燒 3 應被夾成 2（留 1 口氣）');
  eq(S.shrines[0].h[0]|0,2,'累計香火應該是實燒的 2');
  ok(out&&out.clip&&out.clip.length===1,`clip 事件應有一筆：${JSON.stringify(out&&out.clip)}`);
  eq(S.shrineStat.clip,1,'shrineStat.clip');
});

/* ================= G10 傳說共鳴 ================= */
test('G10傳說共鳴：持殘日（祖靈）＋2 件祖靈法寶 → facCount("zuling")=4（傳說算 2 件）',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const zu=G.POOL.filter(x=>x.f==='zuling'&&!x.curse).slice(0,2).map(x=>({...x}));
  const L=G.LEGENDS.find(x=>x.f==='zuling');
  const p=S.players[0];
  p.bag=[...zu];
  eq(G.facCount(p,'zuling'),2,'先確認：兩件祖靈＝2 件（沒有傳說時的基準）');
  p.bag=[...zu,{...L}];
  eq(G.facCount(p,'zuling'),4,'加上殘日之後：本體 1 件＋共鳴額外 1 件＝4 件');
  eq(G.facCount(p,'xianghuo'),0,'傳說共鳴只加自己那一系');
  /* 兩份同名傳說不疊加（collectEffects 的 Set 去重，GUIDE §2.5） */
  p.bag=[...zu,{...L},{...L}];
  eq(G.facCount(p,'zuling'),5,'兩份殘日：本體 2 件＋共鳴只加 1 次＝5（同名法寶效果不疊加）');
});

/* ================= G11 部隊預覽 ================= */
test('G11部隊預覽：5 個袋子的逐件隻數／atk／hp／拍序／招式名，逐項等於 buildArmy 展開與 TRAITS 表',()=>{
  const G=loadGame(TARGET); const S=setup(G);
  const unitRow=G.unitRow||(()=>null);   /* 舊版沒有這一支：讓後面的行為斷言自己紅，不紅在屬性缺失 */
  const pool=G.POOL.filter(x=>!x.curse);
  const byF=f=>pool.filter(x=>x.f===f);
  const curse=G.CURSES?G.CURSES[0]:{n:'冥婚紅包',f:'curse',p:-5,curse:true};
  const bags=[
    byF('zuling').slice(0,3).map(x=>({...x})),
    byF('xianghuo').slice(0,3).map(x=>({...x})),
    byF('yinqi').slice(0,3).map(x=>({...x})),
    [...byF('zuling').slice(0,2).map(x=>({...x})), {...curse}],                    /* 含詛咒品 */
    [...byF('zuling').slice(0,2).map(x=>({...x})), ...G.LEGENDS.map(L=>({...L}))], /* 含傳說＋共鳴件 */
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
test('G11市集卡招式行：27 件法寶＋3 尊傳說的招式一行皆非空，且與 TRAITS 對得上',()=>{
  const G=loadGame(TARGET); setup(G);
  G.CFG.PAPERWAR_ON=true;
  const unitRowText=G.unitRowText||(()=>'');   /* 同上：讓行為斷言（那一行不得為空）先紅 */
  const unitRow=G.unitRow||(()=>null);
  const all=[...G.POOL.filter(x=>!x.curse),...G.LEGENDS];
  eq(all.length,30,'27 件法寶＋3 尊傳說');
  all.forEach(it=>{
    const html=unitRowText(it);
    ok(html&&html.length>0,`「${it.n}」的部隊預覽一行不得為空`);
    const tr=G.TRAITS[it.unit.trait];
    ok(tr,`「${it.n}」應該有 TRAITS 表項`);
    ok(html.indexOf(tr.name)>=0,`「${it.n}」那一行應含招式名「${tr.name}」：${html}`);
    ok(html.indexOf(tr.desc)>=0,`「${it.n}」那一行應含招式說明：${html}`);
    const r=unitRow(it);
    ok(r&&html.indexOf('×'+r.n)>=0,`「${it.n}」那一行應含隻數 ×${r.n}：${html}`);
  });
});
test('G11袋子總計：總隻數／總攻／總血與 buildArmy(整袋) 一致，共鳴 hp 與 pwResLv 一致',()=>{
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
  ok(html.indexOf(`共鳴 hp+${lv}`)>=0,`袋子總計那一行應該印出共鳴 hp+${lv}：${html.slice(0,300)}`);
});

/* ================= 決定性（1.0 已有、2.0 不得回歸） ================= */
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

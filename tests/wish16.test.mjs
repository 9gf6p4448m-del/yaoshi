/* 心願牌庫第二批 16 張 行為單元測試（docs/experiments/2026-09-02-acceptance-wish16.md W3）
   跑法：node tests/wish16.test.mjs [index.html 的路徑]
   鑑別力：git show 365230a:index.html > tests/tools/old.html && node tests/wish16.test.mjs tests/tools/old.html
     舊版沒有這 16 張 → judgeWish 找不到牌就跳過 → 16 個「達成」案全部紅在「p.wish.done 應為 true」這條行為斷言
     （不是 TypeError）。本檔只透過 CFG 覆寫＋手動指定 p.wish＋S.humanBids 驅動既有引擎函式，
     不呼叫舊版沒有的匯出、不直接讀 WISHES 的 hooks。 */
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
function setup(G){
  G.CFG.WISH_ON=true; G.CFG.EVENT_ON=false; G.CFG.RULE_ON=false;
  G.CFG.NIGHT_REGEN=0; G.CFG.MARK_ON=false; /* 2026-09-02 v0.9 後加的天明回血與盯上宣告與心願判定無關，一併隔離（舊版沒有這兩個欄位，設了不影響） */
  G.makeState('solo',1);
  const S=G.S;
  S.players.forEach((p,i)=>{ p.ai=null; p.roleId='human'; p.bag=[]; p.alive=true; p.life=40;
    p.grudge={}; p.pawned=false; p.sacrificed=0; p.wish=null; });
  return S;
}
const WARES=()=>[
  {n:"測試法寶甲",f:"zuling",p:5,d:"治具"},
  {n:"測試法寶乙",f:"xianghuo",p:4,d:"治具"},
  {n:"測試法寶丙",f:"yinqi",p:3,d:"治具"},
  {n:"測試法寶丁",f:"zuling",p:2,d:"治具"},
];
const item=(f,p)=>({n:`治具${f}${p}`,f,p,d:"治具"});
const bid=(amt,type,intent,target)=>({amt,type:type||'cons',intent:intent||'keep',target:target===undefined?null:target});
const row=(pairs)=>{ const r=[null,null,null,null]; Object.keys(pairs).forEach(i=>{ r[i]=pairs[i]; }); return r; };
/* 給 p0 指定心願（繞過抽卡，直接驗判定），跑完一夜，回傳 p0 */
function night(G,S,wishId,opts){
  opts=opts||{};
  S.market=opts.market||WARES();
  if(opts.bags) Object.keys(opts.bags).forEach(i=>{ S.players[i].bag=opts.bags[i]; });
  S.players[0].wish={id:wishId,done:false,...(opts.target!==undefined?{target:opts.target}:{})};
  S.humanBids=opts.bids||{};
  G.resolveAuction();
  G.resolveBattles();
  return S.players[0];
}
/* 第 1 夜配對：pairings([0,1,2,3],0) → (0,3)、(1,2)；風位＝東家 pid 3（+WIND_POWER） */
const done=(G,id,opts,expect)=>{ const S=setup(G); const p=night(G,S,id,opts); eq(p.wish.done,expect,`${id} 的 done 旗標`); return {S,p}; };

console.log(`\n心願第二批 16 張 行為測試　目標檔：${TARGET}\n`);

/* ===== 甲・法寶／陣營類 ===== */
console.log('【甲】');
test('祖靈召喚 達成：得標祖靈法寶',()=>{ const G=loadGame(TARGET);
  const {p}=done(G,'wish_zuling',{bids:{0:row({0:bid(5)})}},true);
  eq(p.life,40-5-G.CFG.BID_FEE+G.CFG.WISH_REWARD2.zuling,'壽命＝40−出價−買路錢＋獎勵'); });
test('祖靈召喚 未達成：得標的是香火',()=>{ const G=loadGame(TARGET);
  done(G,'wish_zuling',{bids:{0:row({1:bid(5)})}},false); });
test('香火鼎盛 達成：得標香火法寶',()=>{ const G=loadGame(TARGET);
  done(G,'wish_xianghuo',{bids:{0:row({1:bid(5)})}},true); });
test('香火鼎盛 未達成：得標的是祖靈',()=>{ const G=loadGame(TARGET);
  done(G,'wish_xianghuo',{bids:{0:row({0:bid(5)})}},false); });
test('三教歸一 達成：袋有祖靈＋香火，本夜補進陰氣',()=>{ const G=loadGame(TARGET);
  done(G,'wish_trinity',{bags:{0:[item('zuling',1),item('xianghuo',1)]},bids:{0:row({2:bid(4)})}},true); });
test('三教歸一 未達成：袋只有祖靈，補進陰氣後仍缺香火',()=>{ const G=loadGame(TARGET);
  done(G,'wish_trinity',{bags:{0:[item('zuling',1)]},bids:{0:row({2:bid(4)})}},false); });
test('一擲千金 達成：得標戰力 7 的法寶',()=>{ const G=loadGame(TARGET);
  const m=WARES(); m[0]=item('zuling',7);
  done(G,'wish_bigfish',{market:m,bids:{0:row({0:bid(6)})}},true); });
test('一擲千金 未達成：得標的只有戰力 5',()=>{ const G=loadGame(TARGET);
  done(G,'wish_bigfish',{bids:{0:row({0:bid(6)})}},false); });

/* ===== 乙・出價行為類 ===== */
console.log('【乙】');
test('孤注一擲 達成：只下一筆且得標',()=>{ const G=loadGame(TARGET);
  done(G,'wish_allin',{bids:{0:row({0:bid(5)})}},true); });
test('孤注一擲 未達成：下了兩筆（都得標也不算）',()=>{ const G=loadGame(TARGET);
  done(G,'wish_allin',{bids:{0:row({0:bid(5),1:bid(4)})}},false); });
test('撿漏 達成：出價 2 得標',()=>{ const G=loadGame(TARGET);
  done(G,'wish_bargain',{bids:{0:row({3:bid(2)})}},true); });
test('撿漏 未達成：出價 5 得標',()=>{ const G=loadGame(TARGET);
  done(G,'wish_bargain',{bids:{0:row({0:bid(5)})}},false); });
test('押命得手 達成：押命標得標',()=>{ const G=loadGame(TARGET);
  done(G,'wish_yamingwin',{bids:{0:row({0:bid(5,'yaming')})}},true); });
test('押命得手 未達成：保守標得標',()=>{ const G=loadGame(TARGET);
  done(G,'wish_yamingwin',{bids:{0:row({0:bid(5,'cons')})}},false); });
test('獨行俠 達成：無人競標的拍品得標',()=>{ const G=loadGame(TARGET);
  done(G,'wish_solo',{bids:{0:row({0:bid(5)})}},true); });
test('獨行俠 未達成：有人跟標（仍得標）',()=>{ const G=loadGame(TARGET);
  done(G,'wish_solo',{bids:{0:row({0:bid(5)}),1:row({0:bid(3)})}},false); });

/* ===== 丙・對手／互動類 ===== */
console.log('【丙】');
test('隔岸觀火 達成：鎖定東家，對決把東家打掉 ≥4',()=>{ const G=loadGame(TARGET);
  /* p0 戰力 12 vs p3 風位 +3：差 9 → 傷害 3+1=4 */
  done(G,'wish_rival',{target:3,bags:{0:[item('zuling',12)]}},true); });
test('隔岸觀火 未達成：東家整夜沒失血',()=>{ const G=loadGame(TARGET);
  done(G,'wish_rival',{target:3},false); });
test('虎口奪食 達成：三人搶同一件、我最高',()=>{ const G=loadGame(TARGET);
  done(G,'wish_crowd',{bids:{0:row({0:bid(6)}),1:row({0:bid(3)}),2:row({0:bid(2)})}},true); });
test('虎口奪食 未達成：只有一人跟標',()=>{ const G=loadGame(TARGET);
  done(G,'wish_crowd',{bids:{0:row({0:bid(6)}),1:row({0:bid(3)})}},false); });
test('禍水東引 達成：毒標塞給鎖定的東家',()=>{ const G=loadGame(TARGET);
  const m=WARES(); m[3]={...G.CURSES[0]};
  const {S}=done(G,'wish_poisonrival',{target:3,market:m,bids:{0:row({3:bid(3,'cons','poison',3)})}},true);
  ok(S.players[3].bag.some(x=>x.curse),'東家袋中應有詛咒品'); });
test('禍水東引 未達成：毒標塞給了別人',()=>{ const G=loadGame(TARGET);
  const m=WARES(); m[3]={...G.CURSES[0]};
  done(G,'wish_poisonrival',{target:3,market:m,bids:{0:row({3:bid(3,'cons','poison',1)})}},false); });
test('血流成河 達成：兩位對手各被打掉 ≥3',()=>{ const G=loadGame(TARGET);
  /* p0(12) 打 p3(風位 3)：4；p1(12) 打 p2(0)：3+2=5 */
  done(G,'wish_bloodbath',{bags:{0:[item('zuling',12)],1:[item('zuling',12)]}},true); });
test('血流成河 未達成：只有一位對手失血',()=>{ const G=loadGame(TARGET);
  done(G,'wish_bloodbath',{bags:{0:[item('zuling',12)]}},false); });

/* ===== 丁・戰場／壽命類 ===== */
console.log('【丁】');
test('全身而退 達成：對決獲勝、零失血',()=>{ const G=loadGame(TARGET);
  done(G,'wish_unscathed',{bags:{0:[item('zuling',12)]}},true); });
test('全身而退 未達成：對決落敗失血',()=>{ const G=loadGame(TARGET);
  done(G,'wish_unscathed',{bags:{3:[item('zuling',12)]}},false); });
test('大獲全勝 達成：戰力差 17 → 傷害 6',()=>{ const G=loadGame(TARGET);
  const {S}=done(G,'wish_crush',{bags:{0:[item('zuling',20)]}},true);
  eq(S.players[3].life,40-6,'東家壽命應扣 6'); });
test('大獲全勝 未達成：戰力差 2 → 傷害 3',()=>{ const G=loadGame(TARGET);
  done(G,'wish_crush',{bags:{0:[item('zuling',5)]}},false); });
test('東山再起 達成：得標任一件',()=>{ const G=loadGame(TARGET);
  done(G,'wish_comeback',{bids:{0:row({3:bid(2)})}},true); });
test('東山再起 未達成：整夜沒得標',()=>{ const G=loadGame(TARGET);
  done(G,'wish_comeback',{},false); });
test('驅邪 達成：買下銷毀詛咒品',()=>{ const G=loadGame(TARGET);
  const m=WARES(); m[3]={...G.CURSES[0]};
  const {S}=done(G,'wish_exorcise',{market:m,bids:{0:row({3:bid(3,'cons','keep')})}},true);
  ok(!S.players.some(q=>q.bag.some(x=>x.curse)),'詛咒品應已銷毀、不在任何人袋中'); });
test('驅邪 未達成：拿詛咒品去毒別人',()=>{ const G=loadGame(TARGET);
  const m=WARES(); m[3]={...G.CURSES[0]};
  done(G,'wish_exorcise',{market:m,bids:{0:row({3:bid(3,'cons','poison',1)})}},false); });

/* ===== 加嚴：canDraw 結構排除（恆真／恆假不發）——只驗「抽不抽得到」 ===== */
console.log('【canDraw】');
function drawn(G,S,id,p){ const w=G.WISHES[id]; if(!w) return null; /* 舊版沒這張牌＝行為紅，不是 TypeError */ return !w.canDraw||!!w.canDraw(p); }
test('三教歸一：袋已三系齊 → 不發（恆真）',()=>{ const G=loadGame(TARGET); const S=setup(G); S.market=WARES();
  S.players[0].bag=[item('zuling',1),item('xianghuo',1),item('yinqi',1)];
  eq(drawn(G,S,'wish_trinity',S.players[0]),false,'canDraw'); });
test('東山再起：不是壽命最低者 → 不發',()=>{ const G=loadGame(TARGET); const S=setup(G); S.market=WARES();
  S.players[1].life=10;
  eq(drawn(G,S,'wish_comeback',S.players[0]),false,'p0 canDraw');
  eq(drawn(G,S,'wish_comeback',S.players[1]),true,'p1 canDraw'); });
test('全身而退：袋中有侵蝕品 → 不發（恆假）',()=>{ const G=loadGame(TARGET); const S=setup(G); S.market=WARES();
  S.players[0].bag=[{...G.CURSES.find(x=>x.drain)}];
  eq(drawn(G,S,'wish_unscathed',S.players[0]),false,'canDraw'); });
test('禍水東引：市場無詛咒品 → 不發；有則發且鎖定壽命最高對手',()=>{ const G=loadGame(TARGET); const S=setup(G); S.market=WARES();
  eq(drawn(G,S,'wish_poisonrival',S.players[0]),false,'無詛咒品');
  S.market[3]={...G.CURSES[0]}; S.players[2].life=50;
  eq(drawn(G,S,'wish_poisonrival',S.players[0]),true,'有詛咒品');
  eq(G.WISHES.wish_poisonrival.target(S.players[0]),2,'鎖定對象＝壽命最高的對手'); });

console.log(`\n結果：PASS=${pass} FAIL=${fail}`);
if(fail){ console.log('\n失敗清單：'); fails.forEach(f=>console.log('  - '+f)); process.exit(1); }

/* 今夜市集規則（NIGHTRULES）行為單元測試
   跑法：node tests/nightrules.test.mjs [index.html 的路徑]
        預設路徑＝這個檔案旁邊的 ../index.html
   鑑別力（docs/IMPLEMENTATION_GUIDE.md §7、docs/harness 02 §6.1 第 1 條）：
     git show 5c8604d:index.html > /tmp/old.html && node tests/nightrules.test.mjs /tmp/old.html
     舊版必須「紅在行為斷言」——所以本檔一律只透過 CFG 覆寫（RULE_ON／RULE_NIGHTS／RULE_FORCE）
     與可觀察的結果（壽命、袋子、市集、得標與否）驗證，**不得**直接讀 NIGHTRULES 的 hooks，
     也不得呼叫舊版沒有的匯出（ruleForRound／drawMarketFor／toSingleStake），
     否則舊版會死在 TypeError 而不是行為斷言。 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const TARGET=process.argv[2]||path.join(HERE,'..','index.html');

/* 把 index.html 的 <script> 內容在 Node 裡跑起來（IMPLEMENTATION_GUIDE §6.4 的做法）。
   每次呼叫都是獨立的一份（獨立 CFG、獨立 S），所以每個測試互不污染。 */
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

/* ---------- 迷你測試框架 ---------- */
let pass=0, fail=0;
const fails=[];
function test(name,fn){
  try{ fn(); pass++; console.log(`  PASS  ${name}`); }
  catch(e){ fail++; fails.push(`${name}\n        ${e.message}`); console.log(`  FAIL  ${name}\n        ${e.message}`); }
}
function eq(actual,expected,what){
  if(actual!==expected) throw new Error(`${what}：預期 ${JSON.stringify(expected)}，實際 ${JSON.stringify(actual)}`);
}
function ok(cond,what){ if(!cond) throw new Error(what); }

/* ---------- 共用治具 ---------- */
/* 開一局「第 1 夜就是規則夜、指定出哪一條」的乾淨牌局：關掉心願與異事，排除無關雜訊。
   舊版沒有 RULE_* 這些 CFG 欄位，設了也不會被讀到——那正是本檔的鑑別力來源。 */
function setup(G,ruleId,seed){
  G.CFG.RULE_ON=true; G.CFG.RULE_NIGHTS=[1]; G.CFG.RULE_FORCE=ruleId;
  G.CFG.WISH_ON=false; G.CFG.EVENT_ON=false;
  G.makeState('solo',seed===undefined?1:seed);
  return G.S;
}
/* 四家全部改成「真人座位」＋中性角色，出價由 S.humanBids 完全指定（沒有 AI 亂數干擾） */
function neutralSeats(S,lives){
  S.players.forEach((p,i)=>{
    p.ai=null; p.roleId='human'; p.bag=[]; p.alive=true;
    p.life=(lives&&lives[i]!==undefined)?lives[i]:40;
    p.grudge={}; p.pawned=false; p.sacrificed=0; p.wish=null;
  });
}
const WARES=()=>[
  {n:"測試法寶甲",f:"zuling",p:5,d:"治具"},
  {n:"測試法寶乙",f:"xianghuo",p:4,d:"治具"},
  {n:"測試法寶丙",f:"yinqi",p:3,d:"治具"},
  {n:"測試法寶丁",f:"zuling",p:2,d:"治具"},
];
const bid=(amt,type,intent,target)=>({amt,type:type||'cons',intent:intent||'keep',target:target===undefined?null:target});
/* sbid＝真人在押寶夜 UI 已經封好的一注（submitHumanBids 會給每筆蓋 stake:true）。
   引擎靠這個記號分辨「真人的一注」與「AI／策略的多筆計畫」——後者才會被加總成一注（待辦 16）。
   舊版（9707cac 以前）不認得這個欄位，多帶一個屬性不影響舊版行為，鑑別力不變。 */
const sbid=(amt,type,intent,target)=>({...bid(amt,type,intent,target),stake:true});
const row=(pairs)=>{ const r=[null,null,null,null]; Object.keys(pairs).forEach(i=>{ r[i]=pairs[i]; }); return r; };

console.log(`\n今夜市集規則 行為測試　目標檔：${TARGET}\n`);

/* ================= 落魄夜（luopo）：落標全額扣除 ================= */
console.log('【落魄夜】');
test('保守標落標全付＝出價＋買路錢（平常只付 CONS_LOSE_FRAC）',()=>{
  const G=loadGame(TARGET), S=setup(G,'luopo');
  neutralSeats(S); S.market=WARES();
  S.humanBids={0:row({0:bid(4,'cons')}), 1:row({0:bid(9,'cons')})};
  G.resolveAuction();
  eq(S.players[0].life,40-(4+G.CFG.BID_FEE),'落魄夜下保守標落標者的壽命');
});
test('押命標落標全付＝出價＋買路錢（平常只付一半）',()=>{
  const G=loadGame(TARGET), S=setup(G,'luopo');
  neutralSeats(S); S.market=WARES();
  S.humanBids={0:row({0:bid(8,'yaming')}), 1:row({0:bid(12,'yaming')})};
  G.resolveAuction();
  eq(S.players[0].life,40-(8+G.CFG.BID_FEE),'落魄夜下押命標落標者的壽命');
});
test('保命例外不被規則覆寫：黃色小雨衣落標仍只付買路錢，同注無雨衣者付全額',()=>{
  const G=loadGame(TARGET), S=setup(G,'luopo');
  neutralSeats(S); S.market=WARES();
  S.players[0].bag=[{n:"黃色小雨衣",f:"yinqi",p:5,ab:"raincoat",d:"治具"}];
  S.humanBids={0:row({0:bid(8,'yaming')}), 2:row({0:bid(8,'yaming')}), 1:row({0:bid(20,'yaming')})};
  G.resolveAuction();
  eq(S.players[0].life,40-G.CFG.BID_FEE,'有雨衣者的壽命（只付買路錢）');
  eq(S.players[2].life,40-(8+G.CFG.BID_FEE),'同注但沒有雨衣者的壽命（落標全付）');
});
test('保命例外不被規則覆寫：陰間當鋪在落魄夜被逼到典當，保住 1 壽命＋縛靈鎖',()=>{
  const G=loadGame(TARGET), S=setup(G,'luopo');
  neutralSeats(S,[10,40,40,40]); S.market=WARES();
  S.players[0].roleId='dangpu';
  S.humanBids={0:row({0:bid(12,'yaming')}), 1:row({0:bid(20,'yaming')})};
  G.resolveAuction();
  eq(S.players[0].life,1,'典當後的壽命（落標全付把它逼到致死，典當接住＝剛好剩 1）');
  eq(S.players[0].pawned,true,'是否真的典當過');
  ok(S.players[0].bag.some(x=>x.n==="縛靈鎖"),'袋中應該多了一件「縛靈鎖」，實際袋子：'
    +JSON.stringify(S.players[0].bag.map(x=>x.n)));
});

/* ================= 收祟夜（shousui）：全詛咒＋禁銷毀＋流標硬塞 ================= */
console.log('【收祟夜】');
test('市集 CFG.MARKET 件全為詛咒品',()=>{
  const G=loadGame(TARGET), S=setup(G,'shousui');
  const names=G.CURSES.map(x=>x.n);
  const n=S.market.filter(x=>x.curse===true&&names.includes(x.n)).length;
  eq(n,G.CFG.MARKET,`市集裡詛咒品的件數（市集內容：${S.market.map(x=>x.n).join('／')}）`);
});
/* 口徑 4′（2026-09-02 使用者裁定）：流標詛咒品塞給「本夜沒出手的人」裡壽命最高者，
   全員都出手才落回全場壽命最高者。三個情境各一條斷言。 */
function shousuiRun(G,lives,bids){
  const S=setup(G,'shousui');
  neutralSeats(S,lives);
  S.market=G.CURSES.slice(0,G.CFG.MARKET).map(x=>({...x}));
  S.humanBids=bids||{};
  G.resolveAuction();
  G.resolveBattles();
  return S;
}
test('口徑 4′：全場都沒出手時，流標詛咒品進壽命最高者的袋（不記仇、無下手者）',()=>{
  const G=loadGame(TARGET);
  const S=shousuiRun(G,[60,10,10,10]);
  S.players[0].roleId='hongyi'; /* 只是為了讀 grudge；hongyi 的記仇寫在 hook，不受此賦值時機影響 */
  eq(S.players[0].bag.filter(x=>x.curse).length,G.CFG.MARKET,'壽命最高者夜末收到的流標詛咒品件數');
  eq(Object.keys(S.players[0].grudge).length,0,'強制塞袋不該產生任何記仇對象');
});
test('口徑 4′：塞給「沒出手者」中壽命最高者——壽命更高但有出手的人不收（覆審 A5 裁定）',()=>{
  const G=loadGame(TARGET);
  /* 南家 0 壽命最高（60）但下了一筆毒標＝有出手；北家 1（50）完全沒出手 → 該收的是北家 */
  const S=shousuiRun(G,[60,50,10,10],{0:row({0:bid(3,'cons','poison',2)})});
  eq(S.players[0].bag.filter(x=>x.curse).length,0,
    `壽命最高但本夜出過手的南家收到的流標詛咒品件數（袋：${JSON.stringify(S.players[0].bag.map(x=>x.n))}）`);
  ok(S.players[1].bag.filter(x=>x.curse).length>0,
    `沒出手、壽命次高的北家應該收到流標詛咒品（袋：${JSON.stringify(S.players[1].bag.map(x=>x.n))}）`);
});
test('口徑 4′：全員都出手時，落回全場壽命最高者',()=>{
  const G=loadGame(TARGET);
  /* 四家各下一筆毒標在第 0 件（該件會有得標者），第 1~3 件流標；南家 60 壽命最高 */
  const S=shousuiRun(G,[60,50,40,30],{
    0:row({0:bid(3,'cons','poison',1)}), 1:row({0:bid(2,'cons','poison',0)}),
    2:row({0:bid(1,'cons','poison',0)}), 3:row({0:bid(1,'cons','poison',0)}),
  });
  const forced=S.players.map(p=>p.bag.filter(x=>x.curse).length);
  ok(forced[0]>0,`全員出手時應落回壽命最高的南家（各家詛咒品件數：${JSON.stringify(forced)}）`);
});
test('AI 的「買下銷毀」防禦性標本夜被引擎攔掉（詛咒品只能毒標或流標）',()=>{
  /* 種子 3 是實測選出來的：同樣治具下 5c8604d 舊版會出現 2 件「買下銷毀」（見報告 A2），
     所以這條測試在舊版是紅的、不是恰好沒觸發 */
  const G=loadGame(TARGET), S=setup(G,'shousui',3);
  S.market=G.CURSES.slice(0,G.CFG.MARKET).map(x=>({...x}));
  S.players.forEach(p=>{ p.life=40; p.bag=[]; });
  S.humanBids={};                     /* 座位 0 是真人、不出價；1~3 走 aiBids */
  const reveal=G.resolveAuction();
  const destroyed=reveal.filter(r=>r.winner&&r.winner.intent!=='poison');
  eq(destroyed.length,0,`本夜買下銷毀的件數（開標結果：${reveal.map(r=>r.outcome).join(' ｜ ')}）`);
});
test('玩家送出的「買下銷毀」標本夜改成毒標塞給戰力最高的對手（人機同語意，覆審 HIGH-2）',()=>{
  const G=loadGame(TARGET), S=setup(G,'shousui');
  neutralSeats(S); S.market=G.CURSES.slice(0,G.CFG.MARKET).map(x=>({...x}));
  /* 讓「戰力最高的對手」是唯一解且不是座位序第一位：北家 1 給一件 +7 的法寶 */
  S.players[1].bag=[{n:"治具大貨",f:"zuling",p:7,d:"治具"}];
  S.humanBids={0:row({0:bid(5,'cons','keep')})};
  const reveal=G.resolveAuction();
  eq(reveal[0].winner?reveal[0].winner.intent:null,'poison','第一件詛咒品的得標意圖（買下銷毀本夜應轉成毒標）');
  eq(S.players[1].bag.filter(x=>x.curse).length,1,
    `戰力最高的對手袋中的詛咒品件數（袋子：${JSON.stringify(S.players[1].bag.map(x=>x.n))}）`);
  eq(S.players[0].life,40-(5+G.CFG.BID_FEE),'出標者的壽命（毒標得標＝付出價＋買路錢）');
});

test('收祟夜 AI 的「買下銷毀」意圖被引擎改成毒標；消失的標全部可歸因 MAX_BIDS 名額裁切（覆審 HIGH-2／N3）',()=>{
  /* 治具沿用覆審 probe7，但**用正式的 CFG.MAX_BIDS=2**（覆審 N3：關掉上限量到的「作廢 0 筆」在正式設定下不成立）。
     aiBids 的詛咒品攻防段刻意不受每人筆數上限，收祟夜四件全詛咒 → 一隻 AI 可生 4 筆，
     引擎的裁切在「轉毒標」之後才跑，所以正式設定下本來就會有標因為名額不足而被砍。
     這條要證的不是「一筆都沒少」，而是「少掉的每一筆都是名額裁切，沒有一筆是被 noDestroy 作廢的」。 */
  const asAI=S=>S.players.forEach(p=>{ p.ai=p.ai||{aggr:0.7,spite:0.4}; p.life=40; p.bag=[]; });
  const A=loadGame(TARGET), SA=setup(A,'shousui',3);
  SA.market=A.CURSES.slice(0,A.CFG.MARKET).map(x=>({...x})); asAI(SA);
  const MAXB=A.CFG.MAX_BIDS;
  ok(MAXB>0,`這條測試要在正式的 MAX_BIDS>0 下跑（實際 ${MAXB}）`);
  /* 第一份實例：只量 aiBids 的原始出價（引擎前） */
  const raw={};   /* pid -> [{i,amt,intent}]，依拍品索引順序 */
  SA.players.forEach(p=>{ const b=A.aiBids(p); const rows=[];
    SA.market.forEach((it,i)=>{ if(it.curse&&b[i]&&b[i].amt>0) rows.push({i,amt:b[i].amt,intent:b[i].intent}); });
    raw[p.id]=rows; });
  const keep=Object.keys(raw).reduce((a,k)=>a+raw[k].filter(r=>r.intent!=='poison').length,0);
  const total=Object.keys(raw).reduce((a,k)=>a+raw[k].length,0);
  ok(keep>0,`治具前提：這個種子下 AI 至少要生出 1 筆「買下銷毀」意圖才驗得到（實際 keep=${keep}）`);
  /* 引擎的裁切規則：金額大者先、同額取索引小者（穩定排序），每人只留前 MAX_BIDS 筆 */
  const expected={};
  Object.keys(raw).forEach(pid=>{
    expected[pid]=raw[pid].slice().sort((a,b)=>b.amt-a.amt).slice(0,MAXB).map(r=>r.i).sort((a,b)=>a-b);
  });
  /* 第二份實例：同種子跑開標，看實際進入開標的是哪幾筆 */
  const B=loadGame(TARGET), SB=setup(B,'shousui',3);
  SB.market=B.CURSES.slice(0,B.CFG.MARKET).map(x=>({...x})); asAI(SB);
  const reveal=B.resolveAuction();
  const actual={}; SB.players.forEach(p=>{ actual[p.id]=[]; });
  reveal.forEach((r,i)=>{ if(!r.it.curse) return; r.entries.forEach(e=>{ actual[e.p.id].push(i); }); });
  Object.keys(actual).forEach(pid=>actual[pid].sort((a,b)=>a-b));
  const ents=reveal.filter(r=>r.it.curse).reduce((a,r)=>a.concat(r.entries),[]);
  eq(ents.filter(e=>e.intent!=='poison').length,0,'詛咒品上非毒標的出價筆數（收祟夜應全部是毒標）');
  eq(ents.filter(e=>e.target===null||e.target===undefined).length,0,'毒標沒有指定對象的筆數');
  /* 核心斷言：實際進開標的那組 = 「原始出價依金額排名取前 MAX_BIDS」那組，逐人逐件相同
     → 消失的每一筆都能歸因到名額裁切，沒有一筆是被 noDestroy 作廢的 */
  Object.keys(expected).forEach(pid=>{
    eq(JSON.stringify(actual[pid]),JSON.stringify(expected[pid]),
      `座位 ${pid} 進入開標的拍品索引（原始出價 ${JSON.stringify(raw[pid])}，`
      +`依金額排名取前 ${MAXB} 應為 ${JSON.stringify(expected[pid])}）`);
    ok(actual[pid].length<=MAXB,`座位 ${pid} 進入開標的筆數不得超過 MAX_BIDS=${MAXB}（實際 ${actual[pid].length}）`);
  });
  const gone=total-ents.length;
  ok(gone>0,`活性：這個治具下應該有標因名額不足被砍掉，否則上面的歸因斷言是空的（實際少掉 ${gone} 筆）`);
});

test('押寶夜不發結構恆假的心願牌：貪多務得／敗軍之志／借刀傷人（覆審 HIGH-1）',()=>{
  /* 押寶夜「最多得一件」→ wonCount 上界 1；「一注只算一次落標」→ yamingLost 上界 1；
     「詛咒品不開標」→ poisonHit 永不成立。三張牌的門檻在該夜結構上不可能達成，照恆假不發原則不該發。 */
  const DEAD=['wish_multi','wish_yaming','wish_poison'];
  const draw=(rule)=>{
    const G=loadGame(TARGET);
    G.CFG.RULE_ON=true; G.CFG.RULE_NIGHTS=[1]; G.CFG.RULE_FORCE=rule;
    G.CFG.WISH_ON=true; G.CFG.EVENT_ON=false;
    G.makeState('solo',1);
    const S=G.S;
    S.market=WARES(); S.market[3]={...G.CURSES[0]};  /* 市集有詛咒品：借刀傷人的既有 canDraw 會放行 */
    S.humanBids={};
    G.resolveAuction();      /* 唯一不動舊版就能讓 S.nightRule 生效的入口 */
    const cnt={};
    for(let k=0;k<200;k++){
      G.drawWishes();
      S.players.forEach(p=>{ if(p.wish) cnt[p.wish.id]=(cnt[p.wish.id]||0)+1; });
    }
    return cnt;
  };
  const y=draw('yabao');
  const total=Object.keys(y).reduce((a,k)=>a+y[k],0);
  ok(total>0,'活性：這一輪至少要發出一些心願牌，否則下面的 0 沒有意義');
  const bad=DEAD.reduce((a,k)=>a+(y[k]||0),0);
  eq(bad,0,`押寶夜發出的結構恆假心願張數（各張：${DEAD.map(k=>k+'='+(y[k]||0)).join('、')}）`);
  /* 反面：不是把這三張永久封印——落魄夜（沒有 singleStake／noCurseAuction）照發 */
  const l=draw('luopo');
  ok(DEAD.reduce((a,k)=>a+(l[k]||0),0)>0,
    `反面對照：落魄夜應該照發這三張（各張：${DEAD.map(k=>k+'='+(l[k]||0)).join('、')}）`);
});

/* ================= 押寶夜（yabao）：一注多押、最多得一件 ================= */
console.log('【押寶夜】');
test('一注壓 3 件、其中 2 件都最高 → 只得開標順序第一件，實付 X＋1 筆買路錢',()=>{
  const G=loadGame(TARGET), S=setup(G,'yabao');
  neutralSeats(S); S.market=WARES();
  S.humanBids={
    0:row({0:sbid(6,'cons'),1:sbid(6,'cons'),2:sbid(6,'cons')}), /* 甲、乙兩件是最高價 */
    1:row({2:sbid(9,'cons')}),
  };
  G.resolveAuction();
  eq(S.players[0].bag.length,1,`得標件數（袋子：${JSON.stringify(S.players[0].bag.map(x=>x.n))}）`);
  eq(S.players[0].bag[0].n,'測試法寶甲','拿到的應該是開標順序第一件');
  eq(S.players[0].life,40-(6+G.CFG.BID_FEE),'實付＝X＋一筆買路錢');
});
test('一注全落標，只依型態付一次落標費（買路錢也只收一次）',()=>{
  const G=loadGame(TARGET), S=setup(G,'yabao');
  neutralSeats(S); S.market=WARES();
  S.humanBids={
    0:row({0:sbid(4,'cons'),1:sbid(4,'cons'),2:sbid(4,'cons')}),
    1:row({0:sbid(9,'cons')}), 2:row({1:sbid(9,'cons')}), 3:row({2:sbid(9,'cons')}),
  };
  G.resolveAuction();
  const once=Math.ceil(4*G.CFG.CONS_LOSE_FRAC)+G.CFG.BID_FEE;
  eq(S.players[0].bag.length,0,'全落標者不該拿到任何東西');
  eq(S.players[0].life,40-once,'全落標的實付（應該只收一次落標費＋一次買路錢）');
});
test('詛咒品本夜不開標：毒標整筆作廢、不入任何人袋',()=>{
  const G=loadGame(TARGET), S=setup(G,'yabao');
  neutralSeats(S);
  S.market=WARES(); S.market[3]={...G.CURSES[0]};
  S.humanBids={0:row({3:sbid(5,'cons','poison',1)})};
  const reveal=G.resolveAuction();
  eq(reveal[3].winner?reveal[3].winner.p.name:null,null,'詛咒品那一件的得標者（本夜不開標＝必流標）');
  eq(S.players[1].bag.length,0,'被指定的毒標對象袋中件數');
  eq(S.players[0].life,40,'出毒標者的壽命（整筆作廢＝一毛都不該扣）');
});

/* ================= 三條迴圈共用同一套引擎（A3；兩版都應綠，非鑑別力測試） ================= */
console.log('【三條迴圈一致性（不變量，非鑑別力測試）】');
test('simulate() 與 playPolicyGame() 在規則開啟下 seeds 1..10 結果一致',()=>{
  const A=loadGame(TARGET), B=loadGame(TARGET);
  A.CFG.RULE_ON=true; B.CFG.RULE_ON=true;
  for(let s=1;s<=10;s++){
    const a=A.simulate(s), b=B.playPolicyGame(s);
    const aLife=a.nights[a.nights.length-1].post.map(x=>x.life);
    eq(JSON.stringify(aLife),JSON.stringify(b.finalLife),`seed ${s} 的最終壽命`);
  }
});

console.log(`\n結果：${pass} 綠 ／ ${fail} 紅`);
if(fail){ console.log('\n紅燈明細：'); fails.forEach(f=>console.log('  - '+f)); }
process.exit(fail?1:0);

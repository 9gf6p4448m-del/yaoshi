/* 保守標上限的伺服端夾（ARCH_SPEC §9 待辦 20）行為單元測試
   跑法：node tests/conscap.test.mjs [index.html 的路徑]
        預設路徑＝這個檔案旁邊的 ../index.html
   鑑別力（docs/IMPLEMENTATION_GUIDE.md §7、docs/harness 02 §6.1 第 1 條）：
     git show 9707cac:index.html > <某處>/old.html && node tests/conscap.test.mjs <某處>/old.html
     舊版必須「恰紅在實付數字的行為斷言」——所以本檔只用舊版也有的匯出
     （makeState／resolveAuction／consCapFor／bleed／POOL／CFG）與可觀察的結果（壽命）驗證，
     不讀任何 hook、不呼叫舊版沒有的函式，否則舊版會死在 TypeError 而不是行為斷言。 */
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

/* ---------- 共用治具 ---------- */
/* 乾淨牌局：關掉心願／異事／市集規則，四家全部改成「真人座位」＋中性角色，
   出價完全由 S.humanBids 指定（沒有 AI 亂數、沒有規則干擾）。 */
function boot(G,ruleId,seed){
  G.CFG.WISH_ON=false; G.CFG.EVENT_ON=false;
  G.CFG.CONS_CAP_DIV=3; /* 治具釘在 ÷3：下面的情境全以「壽命 12 → 上限 4」設計；2026-09-03 正式值改 ÷6 後，這裡釘住的是情境不是門檻（驗的是伺服端夾的行為，不是 3 這個數） */
  G.CFG.RULE_ON=!!ruleId; G.CFG.RULE_NIGHTS=[1]; G.CFG.RULE_FORCE=ruleId||null;
  G.makeState('solo',seed===undefined?1:seed);
  const S=G.S;
  S.players.forEach(p=>{
    p.ai=null; p.roleId='human'; p.bag=[]; p.alive=true; p.life=40;
    p.grudge={}; p.pawned=false; p.sacrificed=0; p.wish=null;
  });
  S.market=[
    {n:"測試法寶甲",f:"zuling",p:5,d:"治具"},
    {n:"測試法寶乙",f:"xianghuo",p:4,d:"治具"},
    {n:"測試法寶丙",f:"yinqi",p:3,d:"治具"},
    {n:"測試法寶丁",f:"zuling",p:2,d:"治具"},
  ];
  return S;
}
const bid=(amt,type,intent,target)=>({amt,type:type||'cons',intent:intent||'keep',target:target===undefined?null:target});
/* sbid＝真人在押寶夜 UI 已經封好的一注（submitHumanBids 會蓋 stake:true）；
   舊版不認得這個欄位，多帶一個屬性不改變舊版行為 */
const sbid=(amt,type,intent,target)=>({...bid(amt,type,intent,target),stake:true});
const row=(pairs)=>{ const r=[null,null,null,null]; Object.keys(pairs).forEach(i=>{ r[i]=pairs[i]; }); return r; };
const knife=G=>({...G.POOL.find(x=>x.ab==='xianji')});
/* 落標實付：保守標＝ceil(amt×CONS_LOSE_FRAC)＋買路錢；押命標＝ceil(amt/2)＋買路錢 */
const consLose=(G,amt)=>Math.ceil(amt*G.CFG.CONS_LOSE_FRAC)+G.CFG.BID_FEE;
const yamingLose=(G,amt)=>Math.ceil(amt/2)+G.CFG.BID_FEE;

console.log(`\n保守標上限伺服端夾 行為測試　目標檔：${TARGET}\n`);

/* ================= 主線：設標後才失血 ================= */
console.log('【一般夜】');

test('設標時合法的保守標，放血把上限壓到金額之下 → 落標實付＝押命標算式',()=>{
  const G=loadGame(TARGET), S=boot(G,null);
  /* 壽命 12 → 保守標上限 floor(12/3)=4；玩家在這個上限內下 4 的保守標 */
  S.players[0].life=12;
  eq(G.consCapFor(S.players[0]),4,'放血前的保守標上限');
  S.humanBids={0:row({0:bid(4,'cons')}), 1:row({0:bid(9,'cons')})};
  /* 交卷後才放血（doSacrifice 走的就是這支 bleed）：壽命 12−2=10 → 上限 floor(10/3)=3 < 4 */
  S.players[0].bag.push(knife(G));
  const n=G.bleed(S.players[0], G.CFG.BLOOD_FLOOR, 1);
  eq(n,1,'放血次數');
  eq(S.players[0].life,10,'放血後的壽命');
  eq(G.consCapFor(S.players[0]),3,'放血後的保守標上限');
  G.resolveAuction();
  /* 這一行是本檔的鑑別力所在：舊版沒有伺服端夾，會付保守標的 25%（少付一半以上） */
  eq(S.players[0].life,10-yamingLose(G,4),
     `超上限保守標落標後的壽命（應以押命標結算：10−${yamingLose(G,4)}；未夾住時是 10−${consLose(G,4)}）`);
});

test('反面：沒放血、保守標仍在上限內 → 落標實付不變（保守標算式）',()=>{
  const G=loadGame(TARGET), S=boot(G,null);
  S.players[0].life=12;
  S.humanBids={0:row({0:bid(4,'cons')}), 1:row({0:bid(9,'cons')})};
  G.resolveAuction();
  eq(S.players[0].life,12-consLose(G,4),'未超上限的保守標落標後的壽命（應維持保守標算式）');
});

test('反面：放血後金額仍在新上限內的保守標，實付照舊不受影響',()=>{
  const G=loadGame(TARGET), S=boot(G,null);
  S.players[0].life=12;
  S.humanBids={0:row({0:bid(3,'cons')}), 1:row({0:bid(9,'cons')})};
  S.players[0].bag.push(knife(G));
  G.bleed(S.players[0], G.CFG.BLOOD_FLOOR, 1);   /* 12→10，上限 3；金額 3 仍合法 */
  eq(G.consCapFor(S.players[0]),3,'放血後的保守標上限');
  G.resolveAuction();
  eq(S.players[0].life,10-consLose(G,3),'金額未超新上限者落標後的壽命（不得被改判押命標）');
});

test('得標者不受影響：超上限的保守標若得標，實付仍是全額出價＋買路錢',()=>{
  const G=loadGame(TARGET), S=boot(G,null);
  S.players[0].life=12;
  S.humanBids={0:row({0:bid(4,'cons')}), 1:row({0:bid(1,'cons')})};
  S.players[0].bag.push(knife(G));
  G.bleed(S.players[0], G.CFG.BLOOD_FLOOR, 1);   /* 12→10，上限 3 < 4 */
  G.resolveAuction();
  eq(S.players[0].life,10-(4+G.CFG.BID_FEE),'超上限保守標得標後的壽命（得標一律付全額，與型態無關）');
  eq(S.players[0].bag.filter(x=>x.n==='測試法寶甲').length,1,'得標的拍品仍入袋');
});

/* ================= 押寶夜的一注路徑走同一個夾 ================= */
console.log('【押寶夜（singleStake）】');

test('押寶夜：一注設定時合法，放血後超上限 → 落標實付＝押命標算式',()=>{
  const G=loadGame(TARGET), S=boot(G,'yabao');
  S.players[0].life=12;
  /* 一注 X=4 勾兩件（toSingleStake 的輸出形狀：兩格同金額同型態）；
     兩件各由不同的對手以 9 抬走，玩家兩件皆落標，費用只在最後一件（index 1）收一次 */
  S.humanBids={0:row({0:sbid(4,'cons'),1:sbid(4,'cons')}),
               1:row({0:sbid(9,'cons')}),
               2:row({1:sbid(9,'cons')})};
  S.players[0].bag.push(knife(G));
  G.bleed(S.players[0], G.CFG.BLOOD_FLOOR, 1);  /* 12→10，上限 3 < 4 */
  G.resolveAuction();
  /* 押寶夜：一注只收一次落標費，所以仍是「一筆」的押命標算式 */
  eq(S.players[0].life,10-yamingLose(G,4),'押寶夜超上限一注落標後的壽命（應以押命標結算）');
});

console.log(`\n────────────────────────────\n通過 ${pass}　失敗 ${fail}`);
if(fail){ console.log('\n失敗清單：'); fails.forEach(f=>console.log('  - '+f)); process.exit(1); }

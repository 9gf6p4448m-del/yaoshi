/* 押寶夜 AI／策略的「一注」決策（onAiStake，ARCH_SPEC §9 待辦 16）行為單元測試
   跑法：node tests/aistake.test.mjs [index.html 的路徑]
   鑑別力（docs/harness 02 §6.1 第 1 條）：對「修前版」跑必須恰紅在 X 的數字上——
     修前版＝同一份程式碼把 X 從「原本各筆總和」換回「最大那筆」
     （<scratchpad>/residuals/pre2-maxstake.html，由 mkpre2.mjs 產生）。
   本檔只用 makeState／resolveAuction／CFG 與可觀察結果（壽命、袋子、開標名單）驗證。 */
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

/* 押寶夜、關掉心願與異事、四家都是「非 AI 座位」＝出價完全由 S.humanBids 指定 */
function boot(G,lives){
  G.CFG.RULE_ON=true; G.CFG.RULE_NIGHTS=[1]; G.CFG.RULE_FORCE='yabao';
  G.CFG.WISH_ON=false; G.CFG.EVENT_ON=false;
  G.CFG.CONS_CAP_DIV=3; /* 治具釘在 ÷3：情境以「壽命 12 → 保守標上限 4、X＝4 仍是保守標」設計；2026-09-03 正式值改 ÷6 後釘的是情境不是門檻 */
  G.makeState('solo',1);
  const S=G.S;
  S.players.forEach((p,i)=>{ p.ai=null; p.roleId='human'; p.bag=[]; p.alive=true;
    p.life=(lives&&lives[i]!==undefined)?lives[i]:40;
    p.grudge={}; p.pawned=false; p.sacrificed=0; p.wish=null; });
  S.market=[
    {n:"測試法寶甲",f:"zuling",p:5,d:"治具"},
    {n:"測試法寶乙",f:"xianghuo",p:4,d:"治具"},
    {n:"測試法寶丙",f:"yinqi",p:3,d:"治具"},
    {n:"測試法寶丁",f:"zuling",p:2,d:"治具"},
  ];
  return S;
}
/* pbid＝AI／策略吐出來的「多筆自由拆分」計畫（沒有 stake 記號，引擎會壓成一注） */
const pbid=(amt,type)=>({amt,type:type||'cons',intent:'keep',target:null});
/* sbid＝真人在 UI 已經封好的一注（submitHumanBids 蓋 stake:true），引擎照原樣過 */
const sbid=(amt,type)=>({...pbid(amt,type),stake:true});
const row=(pairs)=>{ const r=[null,null,null,null]; Object.keys(pairs).forEach(i=>{ r[i]=pairs[i]; }); return r; };
const consLose=(G,a)=>Math.ceil(a*G.CFG.CONS_LOSE_FRAC)+G.CFG.BID_FEE;
const yamingLose=(G,a)=>Math.ceil(a/2)+G.CFG.BID_FEE;

console.log(`\n押寶夜 AI 一注決策（onAiStake） 行為測試　目標檔：${TARGET}\n`);

test("X＝會進開標的前 MAX_BIDS 筆金額總和（D1'）：4 筆 5/4/3/2、MAX_BIDS=2 → X=9",()=>{
  const G=loadGame(TARGET), S=boot(G);
  eq(G.CFG.MAX_BIDS,2,'治具前提：正式的每夜有效標上限');
  /* 座位 0 的計畫＝5/4/3/2 四筆；會進開標的是前 2 筆 → X＝5+4＝9。對手只出 6：
     X=9 搶得到甲；舊做法取最大那筆（5）搶不到；不先裁而全加總（14）則會付到 15。 */
  S.humanBids={0:row({0:pbid(5),1:pbid(4),2:pbid(3),3:pbid(2)}), 1:row({0:sbid(6)})};
  G.resolveAuction();
  eq(S.players[0].bag.length,1,'座位 0 的得標件數（X＝9 才壓得過對手的 6）');
  eq(S.players[0].bag[0].n,'測試法寶甲','拿到的是開標順序第一件');
  eq(S.players[0].life,40-(9+G.CFG.BID_FEE),'得標實付＝X（＝5+4，被裁掉的 3 與 2 不計入）＋買路錢');
});

test('MAX_BIDS=0（無上限）時全取：同一份計畫 X＝5+4+3+2＝14',()=>{
  /* 壽命開到 60，保守標上限 20 才不會反過來夾住 X＝14（treat：本條只驗「全取」那一步） */
  const G=loadGame(TARGET), S=boot(G,[60,40,40,40]);
  G.CFG.MAX_BIDS=0;
  eq(G.consCapFor(S.players[0]),20,'治具前提：保守標上限要大於 14，才不會蓋掉本條要驗的東西');
  S.humanBids={0:row({0:pbid(5),1:pbid(4),2:pbid(3),3:pbid(2)}), 1:row({0:sbid(6)})};
  G.resolveAuction();
  eq(S.players[0].life,60-(14+G.CFG.BID_FEE),'無上限時四筆全加總＝14；MAX_BIDS=2 時應該只有 9');
});

test('被 MAX_BIDS 裁掉的那幾筆不計入 X，但仍留在勾選集裡（全落標）',()=>{
  const G=loadGame(TARGET), S=boot(G);
  /* 5/4/3 三筆 → X＝5+4＝9；三件都被對手抬走 */
  S.humanBids={0:row({0:pbid(5),1:pbid(4),2:pbid(3)}),
               1:row({0:sbid(20)}), 2:row({1:sbid(20)}), 3:row({2:sbid(20)})};
  const reveal=G.resolveAuction();
  const inItem=i=>reveal[i].entries.some(e=>e.p.id===0);
  eq([inItem(0),inItem(1),inItem(2),inItem(3)].join(','),'true,true,true,false','這一注涵蓋的拍品（含被裁掉金額的那一格）');
  reveal.slice(0,3).forEach((r,i)=>eq(r.entries.find(e=>e.p.id===0).amt,9,`第 ${i} 件上這一注的金額（每格都是同一個 X）`));
  eq(S.players[0].bag.length,0,'全落標者不該拿到東西');
  eq(S.players[0].life,40-consLose(G,9),'落標實付＝依 X＝9 收一次；取最大那筆的話是依 5 收');
});

test('保守標的 X 受 consCapFor 夾住（壽命 24 → 上限 8，X＝9 夾成 8）',()=>{
  const G=loadGame(TARGET), S=boot(G,[24,40,40,40]);
  eq(G.consCapFor(S.players[0]),8,'座位 0 的保守標上限');
  S.humanBids={0:row({0:pbid(5),1:pbid(4),2:pbid(3)}), 1:row({0:sbid(6)})};
  G.resolveAuction();
  eq(S.players[0].life,24-(8+G.CFG.BID_FEE),'得標實付＝被夾到上限的 X＝8＋買路錢（取最大那筆是 5，搶不到）');
});

test('押命標的 X 受「壽命−1」夾住（壽命 12 → 上限 11，X＝14 夾成 11）',()=>{
  const G=loadGame(TARGET), S=boot(G,[12,40,40,40]);
  S.humanBids={0:row({0:pbid(7,'yaming'),1:pbid(7,'yaming')}),
               1:row({0:sbid(20)}), 2:row({1:sbid(20)})};
  G.resolveAuction();
  eq(S.players[0].life,12-yamingLose(G,11),'落標實付＝依被夾住的 X＝11 算；取最大那筆是 7');
});

test('型態取原本金額最大那筆（最大那筆是押命標 → 這一注就是押命標）',()=>{
  const G=loadGame(TARGET), S=boot(G);
  S.humanBids={0:row({0:pbid(2,'cons'),1:pbid(6,'yaming')}),
               1:row({0:sbid(20)}), 2:row({1:sbid(20)})};
  G.resolveAuction();
  eq(S.players[0].life,40-yamingLose(G,8),'落標實付要走押命標算式（X＝2+6＝8，兩筆都在 MAX_BIDS 內）');
});

test('真人不受影響：UI 封好的一注（stake 記號）照原樣過，不加總、不夾上限',()=>{
  const G=loadGame(TARGET), S=boot(G,[12,40,40,40]);
  /* 真人壽命 12、保守標上限 4，UI 只讓他封到 4；勾 3 件仍然是同一個 4，不會變成 12 */
  S.humanBids={0:row({0:sbid(4),1:sbid(4),2:sbid(4)}),
               1:row({0:sbid(20)}), 2:row({1:sbid(20)}), 3:row({2:sbid(20)})};
  G.resolveAuction();
  eq(S.players[0].life,12-consLose(G,4),'真人全落標的實付（維持 X＝4，不得被加總成 12）');
});

test('非押寶夜完全不走這一段：同一份計畫在一般夜仍是三筆獨立的標',()=>{
  const G=loadGame(TARGET);
  G.CFG.RULE_ON=false; G.CFG.WISH_ON=false; G.CFG.EVENT_ON=false; G.CFG.MAX_BIDS=0; G.CFG.CONS_CAP_DIV=3; /* 同上，釘情境 */
  G.makeState('solo',1);
  const S=G.S;
  S.players.forEach(p=>{ p.ai=null; p.roleId='human'; p.bag=[]; p.alive=true; p.life=40;
    p.grudge={}; p.pawned=false; p.sacrificed=0; p.wish=null; });
  S.market=[{n:"甲",f:"zuling",p:5,d:"x"},{n:"乙",f:"xianghuo",p:4,d:"x"},
            {n:"丙",f:"yinqi",p:3,d:"x"},{n:"丁",f:"zuling",p:2,d:"x"}];
  S.humanBids={0:row({0:pbid(2),1:pbid(3),2:pbid(4)}),
               1:row({0:pbid(20)}), 2:row({1:pbid(20)}), 3:row({2:pbid(20)})};
  G.resolveAuction();
  /* 三筆各自落標、各收一次落標費與買路錢——沒有被壓成一注 */
  const cost=consLose(G,2)+consLose(G,3)+consLose(G,4);
  eq(S.players[0].life,40-cost,'一般夜三筆標各自結算的實付');
});

console.log(`\n────────────────────────────\n通過 ${pass}　失敗 ${fail}`);
if(fail){ console.log('\n失敗清單：'); fails.forEach(f=>console.log('  - '+f)); process.exit(1); }

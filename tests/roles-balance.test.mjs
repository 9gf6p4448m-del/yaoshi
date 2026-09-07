/* 角色平衡卷單元測試（2026-09-07；凍結檔 docs/experiments/2026-09-07-acceptance-role-balance.md B0）
   跑法：node tests/roles-balance.test.mjs [index.html 的路徑]
   鑑別力（02 §6.1 第 1 條）：
     git show b38980a:index.html > old-rb.html && node tests/roles-balance.test.mjs old-rb.html
     基準 b38980a 上每一案都必須紅，而且要紅在**行為斷言**（共鳴等級沒變高、對決結果一模一樣、
     壽命是舊值、掛零仍然扣血、被毒沒回血、ai 還是舊數字），不是紅在「某個欄位不存在」。
     所以本檔一律不去讀「新加的欄位」（不讀 ROLES.lvshan.traits.curseWard、不讀 sd.curseWard），
     只從引擎的公開出口（pwResLv／paperWar／makeState／applyHooks）觀察行為。
   反面（健康狀態會綠）：對現行 index.html 全綠。 */
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

const G=loadGame(TARGET);
const {CFG,ROLES,POOL,CURSES}=G;

/* ---------- 治具 ---------- */
/* 同系 N 件的乾淨袋子（法寶，不含詛咒品）。斷手書生的門檻：4 件（二版曾降到 3→2，三版依實測撤回 4）。 */
function bagOfFac(fac,n){ return POOL.filter(x=>x.f===fac).slice(0,n).map(x=>({...x})); }
function cursesN(n){ return CURSES.slice(0,n).map(x=>({...x})); }
function player(id,roleId,bag){ return {id,name:'P'+id,roleId,bag,life:CFG.LIFE,alive:true}; }
/* 固定 rng 的一場紙紮夜戰：同輸入同結果（paperWar 只吃 ctx.rng） */
function duel(A,B,seed){
  const rng=G.mulberry32((seed||1)>>>0);
  return G.paperWar(A,B,{rng,phase:G.phaseFor(1),windId:null});
}

/* ===================== ① 被動接線：斷手書生 ===================== */
/* 舊版寫 ctx.flat+=4，只進 power()；紙紮夜戰的共鳴只讀 ctx.resonanceMul（pwResLv）
   ⇒ 舊版這兩案紅在「共鳴等級沒有比沒被動的人高」「整場對決結果一模一樣」。 */
test('斷手書生：同系 4 件時紙紮共鳴等級高於無被動者（pwResLv 真的被改到）',()=>{
  const fac=G.BEAT_FAC[0];
  const bag=bagOfFac(fac,4);
  ok(bag.length===4,`治具前提：${fac} 系至少 4 件法寶，實際 ${bag.length}`);
  const lvDs=G.pwResLv(player(0,'duanshou',bag),fac);
  const lvBase=G.pwResLv(player(0,'human',bag.map(x=>({...x}))),fac);
  ok(lvDs>lvBase,`斷手書生的該系共鳴等級應高於無被動者：斷手 ${lvDs}、無被動 ${lvBase}`);
});
test('斷手書生：同系 4 件時整場紙紮夜戰的結果真的變好（不只是帳面戰力）',()=>{
  const fac=G.BEAT_FAC[0];
  const bag=bagOfFac(fac,4);
  const foe=()=>bagOfFac(G.BEAT_FAC[1],4);
  const rDs=duel(player(0,'duanshou',bag),player(1,'human',foe()),7);
  const rBase=duel(player(0,'human',bag.map(x=>({...x}))),player(1,'human',foe()),7);
  ok(rDs.hpA>rBase.hpA||rDs.aliveA>rBase.aliveA,
    `斷手書生該系共鳴 ×1.5 應讓自己這側撐得更久：斷手 alive ${rDs.aliveA}/hp ${rDs.hpA}、無被動 alive ${rBase.aliveA}/hp ${rBase.hpA}`);
});
test('斷手書生：不足 4 件時不生效（被動不是恆真式）',()=>{
  const fac=G.BEAT_FAC[0];
  const bag=bagOfFac(fac,3);
  eq(G.pwResLv(player(0,'duanshou',bag),fac),
     G.pwResLv(player(0,'human',bag.map(x=>({...x}))),fac),
     '同系只有 3 件時，斷手書生的共鳴等級應與無被動者相同');
});
test('斷手書生：只有達標的那一系吃到（另一系不得跟著 ×1.5）',()=>{
  const facA=G.BEAT_FAC[0], facB=G.BEAT_FAC[1];
  const bag=bagOfFac(facA,4).concat(bagOfFac(facB,2));   /* facB 只有 2 件＝未達 4 件門檻 */
  eq(G.pwResLv(player(0,'duanshou',bag),facB),
     G.pwResLv(player(0,'human',bag.map(x=>({...x}))),facB),
     '沒達標的那一系（只有 2 件、門檻 4）不得吃到共鳴倍率');
});

/* ===================== ① 被動接線：閭山法師 ===================== */
/* 舊版「袋中詛咒品戰力視為 0」只寫在 onItemValue（＝只進 power()），
   紙紮夜戰的詛咒懲罰是 pwMod 的 m-=sd.curses（數件數）⇒ 舊版免疫根本不存在，
   這兩案紅在「帶詛咒品打同一場，閭山與沒被動的人結果一模一樣」。 */
test('閭山法師：袋中帶詛咒品時，紙紮夜戰的「詛咒纏身」不再扣自己',()=>{
  const bag=bagOfFac(G.BEAT_FAC[0],4).concat(cursesN(2));
  const foe=()=>bagOfFac(G.BEAT_FAC[1],3);
  const rLv=duel(player(0,'lvshan',bag),player(1,'human',foe()),1);
  const rBase=duel(player(0,'human',bag.map(x=>({...x}))),player(1,'human',foe()),1);
  const dLv=rLv.aliveA-rLv.aliveB, dBase=rBase.aliveA-rBase.aliveB;
  ok(dLv>dBase||(dLv===dBase&&rLv.hpB<rBase.hpB),
    `閭山帶 2 件詛咒品應打得比沒被動者好：閭山 alive ${rLv.aliveA}vs${rLv.aliveB}/hpB ${rLv.hpB}、`
    +`無被動 alive ${rBase.aliveA}vs${rBase.aliveB}/hpB ${rBase.hpB}`);
});
test('閭山法師：袋中沒有詛咒品時不生效（被動不是恆真式）',()=>{
  const bag=bagOfFac(G.BEAT_FAC[0],4);
  const foe=()=>bagOfFac(G.BEAT_FAC[1],3);
  const rLv=duel(player(0,'lvshan',bag),player(1,'human',foe()),1);
  const rBase=duel(player(0,'human',bag.map(x=>({...x}))),player(1,'human',foe()),1);
  eq(rLv.aliveA+'/'+rLv.hpA+'/'+rLv.aliveB+'/'+rLv.hpB,
     rBase.aliveA+'/'+rBase.hpA+'/'+rBase.aliveB+'/'+rBase.hpB,
     '沒有詛咒品時，閭山與無被動者的對決結果應完全相同');
});
test('閭山法師：免疫不外洩給別人（別的角色帶同樣的詛咒品仍照扣）',()=>{
  const bag=bagOfFac(G.BEAT_FAC[0],4).concat(cursesN(2));
  const clean=bagOfFac(G.BEAT_FAC[0],4);
  const foe=()=>bagOfFac(G.BEAT_FAC[1],3);
  const rCursed=duel(player(0,'zutou',bag),player(1,'human',foe()),1);
  const rClean=duel(player(0,'zutou',clean),player(1,'human',foe()),1);
  ok(rCursed.hpA<rClean.hpA||rCursed.aliveA<rClean.aliveA,
    `沒有 curseWard 的角色帶詛咒品仍應被「詛咒纏身」拖累：帶咒 alive ${rCursed.aliveA}/hp ${rCursed.hpA}、乾淨 alive ${rClean.aliveA}/hp ${rClean.hpA}`);
});

/* ===================== ② 數值：起始壽命與兩個被動 ===================== */
/* 起始壽命從實際發牌的座位讀（makeState），不是讀 ROLES.life0d 這個欄位——
   舊版紅在「壽命是 42／46」這個行為值，不是紅在欄位不存在。 */
function lifeOnTable(roleId){
  G.makeState('solo',1,[roleId]);
  const p=G.S.players.find(q=>q.roleId===roleId);
  ok(p,`makeState 應把 ${roleId} 發到桌上`);
  return p.life;
}
test('閭山法師：起始壽命＝CFG.LIFE+2（二版第二輪 life0d 0→+2）',()=>{
  eq(lifeOnTable('lvshan'),CFG.LIFE+2,'閭山法師開局壽命');
});
test('陰間當鋪：起始壽命＝CFG.LIFE',()=>{
  eq(lifeOnTable('dangpu'),CFG.LIFE,'陰間當鋪開局壽命');
});
test('大家樂組頭：夜末掛零不再扣 2 壽命',()=>{
  G.makeState('solo',1,['zutou']);
  const p=G.S.players.find(q=>q.roleId==='zutou');
  p._ztR=G.S.round; p._ztN=0;              /* 本夜得標 0 件＝掛零 */
  const before=p.life, log=[];
  G.applyHooks('onNightEnd',{p,log},p);
  eq(p.life,before,'掛零那一夜的壽命不得變動');
});
test('大家樂組頭：夜末連中 ≥2 件仍然 +2（獎勵側沒被順手拆掉）',()=>{
  G.makeState('solo',1,['zutou']);
  const p=G.S.players.find(q=>q.roleId==='zutou');
  p._ztR=G.S.round; p._ztN=2;
  const before=p.life, log=[];
  G.applyHooks('onNightEnd',{p,log},p);
  eq(p.life,before+2,'連中 2 注的夜末壽命');
});
test('紅衣婆婆：被毒標塞中時下手者 −2、自己 +2',()=>{
  G.makeState('solo',1,['hongyi']);
  const target=G.S.players.find(q=>q.roleId==='hongyi');
  const winner=G.S.players.find(q=>q.id!==target.id);
  const tL=target.life, wL=winner.life, events=[];
  G.applyHooks('onWinItem',{winner,item:{...POOL[0]},target,events},[winner,target]);
  eq(winner.life,wL-2,'下手者壽命');
  eq(target.life,tL+2,'紅衣婆婆自己的壽命');
});
test('紅衣婆婆：不是塞給紅衣時什麼都不發生（被動不是恆真式）',()=>{
  G.makeState('solo',1,['hongyi']);
  const hy=G.S.players.find(q=>q.roleId==='hongyi');
  const a=G.S.players.find(q=>q.id!==hy.id);
  const b=G.S.players.find(q=>q.id!==hy.id&&q.id!==a.id);
  const aL=a.life, bL=b.life, events=[];
  G.applyHooks('onWinItem',{winner:a,item:{...POOL[0]},target:b,events},[a,b]);
  eq(a.life,aL,'下手者壽命不得變');
  eq(b.life,bL,'被塞的人壽命不得變');
});

/* ===================== ② 二版：陰間當鋪的典當保命值 ===================== */
/* 一版是寫死的「保住 1 壽命」，二版改成 CFG.PAWN_KEEP=8（使用者同意）。
   三條掛點（onBidSettle 實付、onBattle 對決傷害、onNightEnd 夜末結算）都要吃到同一個值。 */
test('陰間當鋪：夜末結算致死時典當保住 CFG.PAWN_KEEP 壽命（不再是 1）',()=>{
  G.makeState('solo',1,['dangpu']);
  const p=G.S.players.find(q=>q.roleId==='dangpu');
  p.life=0; p.pawned=false; p.bag=[];
  const log=[];
  G.applyHooks('onNightEnd',{p,log},p);
  eq(p.life,CFG.PAWN_KEEP,'夜末典當後的壽命');
  eq(CFG.PAWN_KEEP,8,'CFG.PAWN_KEEP（二版裁定值）');
  ok(p.bag.some(x=>x.n==='縛靈鎖'),'典當應在袋中留下縛靈鎖');
});
test('陰間當鋪：出價實付致死時付到剛好剩 CFG.PAWN_KEEP',()=>{
  G.makeState('solo',1,['dangpu']);
  const p=G.S.players.find(q=>q.roleId==='dangpu');
  p.life=20; p.pawned=false; p.bag=[];
  const ctx={p,cost:25,events:[]};                 /* 25 > 20 ⇒ 這筆實付會致死 */
  G.applyHooks('onBidSettle',ctx,p);
  eq(ctx.cost,20-CFG.PAWN_KEEP,'典當後的實付金額');
});
test('陰間當鋪：典當一局只有一次（不是恆真式）',()=>{
  G.makeState('solo',1,['dangpu']);
  const p=G.S.players.find(q=>q.roleId==='dangpu');
  p.life=0; p.pawned=false; p.bag=[];
  G.applyHooks('onNightEnd',{p,log:[]},p);
  p.life=0;                                        /* 第二次致死：已典當過，不得再救 */
  G.applyHooks('onNightEnd',{p,log:[]},p);
  eq(p.life,0,'第二次致死不得再被典當救起');
});

/* ===================== ③ AI 風格：四隻的 ROLES.ai ＝掃描表最佳值 ===================== */
/* 掃描表在 docs/experiments/2026-09-07-role-balance-report.md §3（n=2000 初掃、前 2 名 n=10000 決選）。
   這一案是「值有沒有被改成掃描結果」的釘子——改回舊值（青面 .85/.25/contest、斷手 1.0/.4/ignore、
   閭山 .5/.2/ignore、當鋪 .8/.4/avoid）就紅。 */
const SCANNED_AI={
  qingmian:{aggr:0.6, spite:0.1, markReact:'contest'},
  duanshou:{aggr:1.0, spite:0.1, markReact:'ignore'},   /* aggr 釘 1.0（裁定②） */
  lvshan:  {aggr:0.8, spite:0.1, markReact:'ignore'},
  dangpu:  {aggr:0.8, spite:0.1, markReact:'avoid'},
};
/* markReact 是角色性格的公開資訊、不進掃描（凍結檔 §2.1 第 9 條）：這四隻必須維持改前的設計值。
   把哪一隻改成別型都要紅——這一案在守 §5.8 的「三型混桌」讀人層。 */
const DESIGN_MARK={qingmian:'contest',duanshou:'ignore',lvshan:'ignore',dangpu:'avoid',
  hongyi:'contest',shoujing:'avoid',hunter:'contest',xiaonv:'avoid',zutou:'contest',luzhu:'ignore'};
test('盯上宣告：十隻的 markReact 全部維持設計值（三型混桌 3 怯場／4 搶標／3 無視）',()=>{
  const cnt={avoid:0,contest:0,ignore:0};
  for(const [id,want] of Object.entries(DESIGN_MARK)){
    eq((ROLES[id]||{}).ai&&ROLES[id].ai.markReact,want,`${id} markReact`);
    cnt[want]++;
  }
  eq(cnt.avoid,3,'怯場型隻數'); eq(cnt.contest,4,'搶標型隻數'); eq(cnt.ignore,3,'無視型隻數');
});
for(const [id,want] of Object.entries(SCANNED_AI)){
  test(`${ROLES[id]?ROLES[id].name:id}：ROLES.ai ＝掃描表最佳值 ${want.aggr}/${want.spite}/${want.markReact}`,()=>{
    const got=(ROLES[id]||{}).ai||{};
    eq(got.aggr,want.aggr,`${id} aggr`);
    eq(got.spite,want.spite,`${id} spite`);
    eq(got.markReact,want.markReact,`${id} markReact`);
  });
}
/* 收驚婆一個字都不能動（凍結檔 B2）：這一案在守「順手調」 */
test('收驚婆：ai 與 life0d 與基準相同（B2 不得動）',()=>{
  const R=ROLES.shoujing;
  eq(R.ai.aggr,0.3,'收驚婆 aggr');
  eq(R.ai.spite,0.1,'收驚婆 spite');
  eq(R.ai.markReact,'avoid','收驚婆 markReact');
  eq(R.life0d,-6,'收驚婆 life0d');
});

/* ---------- 收尾 ---------- */
console.log(`\n角色平衡卷單元測試：${pass} 過 / ${fail} 失敗`);
if(fail){ console.log('\n失敗清單：'); fails.forEach(f=>console.log('  - '+f)); process.exit(1); }

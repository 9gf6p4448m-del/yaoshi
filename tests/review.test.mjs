/* 局末回顧（v0.10）純記錄層的資料完整性測試
   跑法：node tests/review.test.mjs [index.html 的路徑]
   走真實路徑：playPolicyGame → resolveAuction/resolveBattles 內的 recordAuction/recordNightEnd，
   不重建任何邏輯；只驗 S.history 的不變量與 reviewSummary 的加總是否跟原始紀錄一致。
   鑑別力（docs/harness 02 §6.1 第 1 條）：對 c2d9362（沒有 history 的版本）跑必須全紅在「S.history 不存在」。 */
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
function eq(a,b,msg){ if(a!==b) throw new Error(`${msg}: 得到 ${JSON.stringify(a)}，預期 ${JSON.stringify(b)}`); }
function ok(c,msg){ if(!c) throw new Error(msg); }

const SEEDS=[3,7,11];
let activity={bids:0,poison:0,deaths:0,wishesDone:0};
for(const seed of SEEDS){
  const G=loadGame(TARGET);
  const r=G.playPolicyGame(seed,{0:G.POLICIES.splitter});
  const S=G.S, H=S.history;
  test(`seed ${seed}：S.history 存在且形狀正確`,()=>{
    ok(H&&Array.isArray(H.life)&&Array.isArray(H.nights),'S.history 不存在或形狀錯');
  });
  if(!H) continue;
  test(`seed ${seed}：壽命曲線長度 = 夜數+1，每筆 = 玩家數`,()=>{
    eq(H.life.length,H.nights.length+1,'life.length');
    H.life.forEach((row,i)=>eq(row.length,S.players.length,`life[${i}].length`));
  });
  test(`seed ${seed}：夜數與 playPolicyGame 的 lifeByRound 一致（同一條迴圈）`,()=>{
    eq(H.nights.length,r.lifeByRound.length,'nights vs lifeByRound');
    r.lifeByRound.forEach((row,i)=>eq(JSON.stringify(H.life[i+1]),JSON.stringify(row),`life[${i+1}] vs lifeByRound[${i}]`));
  });
  test(`seed ${seed}：末筆快照 = 局末各人壽命`,()=>{
    eq(JSON.stringify(H.life[H.life.length-1]),JSON.stringify(S.players.map(p=>p.life)),'last snapshot');
  });
  test(`seed ${seed}：每夜紀錄 round 連號、closed、拍賣筆數 ≥1、每筆欄位齊全`,()=>{
    H.nights.forEach((n,k)=>{
      eq(n.round,k+1,`nights[${k}].round`);
      ok(n.closed===true,`nights[${k}] 未 closed（resolveBattles 沒接上）`);
      ok(n.auction.length>=1,`nights[${k}] 拍賣 0 筆`);
      n.auction.forEach(a=>{
        ok(typeof a.item==='string'&&a.item,'item');
        ok('winnerId' in a&&'amt' in a&&'type' in a&&Array.isArray(a.bids),'auction 欄位');
        if(a.winnerId!=null){ ok(a.amt>0,'得標金額應 >0'); ok(a.bids.some(b=>b.pid===a.winnerId),'得標者必在出價名單'); }
        else { eq(a.amt,0,'流標金額'); }
        a.bids.forEach(b=>{ ok(Number.isInteger(b.pid)&&b.amt>0&&b.cost!=null,'bid 欄位'); activity.bids++; });
        if(a.intent==='poison'){ ok(a.targetId!=null&&a.targetId!==a.winnerId,'毒標要有對象且不是自己'); activity.poison++; }
      });
    });
  });
  test(`seed ${seed}：心願筆數 = 該夜開夜時存活人數`,()=>{
    H.nights.forEach((n,k)=>{
      const aliveAtDraw=H.life[k].filter(v=>v>0).length;
      eq(n.wishes.length,aliveAtDraw,`nights[${k}].wishes`);
      n.wishes.forEach(w=>{ ok(G.WISHES[w.id],`未知心願 ${w.id}`); ok(typeof w.done==='boolean','done'); if(w.done) activity.wishesDone++; });
    });
  });
  test(`seed ${seed}：對決紀錄與死亡紀錄自洽`,()=>{
    H.nights.forEach((n,k)=>{
      n.fights.forEach(f=>{ ok(f.a!==f.b,'自己打自己'); if(!f.tie){ ok(f.w===f.a||f.w===f.b,'勝者不在對戰兩人裡'); ok(f.dmg>0,'非平手傷害應 >0'); } else eq(f.w,null,'平手無勝者'); });
      n.deaths.forEach(pid=>{ eq(H.life[k+1][pid],0,`death ${pid} 當夜快照應為 0`); ok(!S.players[pid].alive,'死者局末仍 alive'); activity.deaths++; });
    });
    const deadIds=S.players.filter(p=>!p.alive).map(p=>p.id);
    const recorded=H.nights.flatMap(n=>n.deaths);
    deadIds.forEach(id=>ok(recorded.includes(id)||H.life[H.life.length-1][id]===0,`出局者 ${id} 沒有死亡紀錄`));
  });
  test(`seed ${seed}：reviewSummary 加總與原始紀錄一致`,()=>{
    const sm=G.reviewSummary();
    let burned=0, wins=0, poison=0, maxAmt=0;
    H.nights.forEach(n=>{ n.auction.forEach(a=>{ a.bids.forEach(b=>{ burned+=b.cost; maxAmt=Math.max(maxAmt,b.amt); }); if(a.intent==='poison') poison++; }); n.fights.forEach(f=>{ if(f.w!=null) wins++; }); });
    eq(sm.burned,burned,'burned'); eq(sm.poison,poison,'poison'); eq(sm.nights,H.nights.length,'nights'); eq(sm.curveLen,H.life.length,'curveLen');
    eq(Object.values(sm.wins).reduce((s,v)=>s+v,0),wins,'wins 總和');
    eq(sm.maxBid?sm.maxBid.amt:0,maxAmt,'maxBid');
  });
  test(`seed ${seed}：finalizeHistory 冪等；壽命被改動後才補一筆`,()=>{
    const before=H.life.length;
    G.finalizeHistory(); eq(H.life.length,before,'無變動不該補');
    S.players[0].life+=1; G.finalizeHistory(); eq(H.life.length,before+1,'有變動應補一筆');
    eq(H.life[H.life.length-1][0],S.players[0].life,'補的那筆要是現值');
  });
}
test('活性：三個種子合計有出價、有毒標、有死亡、有心願達成（不是空紀錄）',()=>{
  ok(activity.bids>0,'零出價'); ok(activity.poison>0,'零毒標'); ok(activity.deaths>0,'零死亡'); ok(activity.wishesDone>0,'零心願達成');
  console.log('        活性計數：',JSON.stringify(activity));
});
console.log('────────────────────────────');
console.log(`通過 ${pass}　失敗 ${fail}`);
if(fail){ console.log(fails.join('\n')); process.exit(1); }

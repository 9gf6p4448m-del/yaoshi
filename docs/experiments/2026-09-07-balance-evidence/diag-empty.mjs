import {loadGame} from 'file:///C:/Users/shung/OneDrive/桌面/妖市/tests/tools/load.mjs';
const G=loadGame('C:/Users/shung/OneDrive/桌面/妖市/index.html');
const S=Array.from({length:2000},(_,i)=>i+1);
const pct=v=>(v*100).toFixed(0)+'%';
console.log('## 單件 vs 空袋（兜底 swarm atk1/hp3），n=2000 種子（月相／風位隨種子）');
console.log('| 法寶 | 系 | p | 單位 | 勝／敗／平 | 勝率(不計平) | 輸時扣血 |');
console.log('|---|---|---|---|---|---|---|');
const lose=[];
for(const it of G.POOL){
  const R=G.duelBags([{...it}],[],S);
  const u=it.unit; const rate=R.rateDecided;
  const note=rate<0.5?'❌':'';
  if(rate<0.5) lose.push(it.n);
  console.log(`| ${it.n} | ${it.f} | ${it.p} | ${u.body}×${u.count} atk${u.atk} hp${u.hp} | ${R.winA}/${R.winB}/${R.ties} | ${pct(rate)} ${note} | ${R.dmgs?JSON.stringify(R.dmgs):''} |`);
}
console.log(`\n單件輸給空袋（勝率<50%）的法寶：${lose.length} 件 → ${lose.join('、')}`);
console.log('\n## 各角色在座位 0（policyAiLike，n=2000）勝率／平均存活夜／平均終局壽命；4 人桌基準 25%');
console.log('| 角色 | 勝率 | 存活夜 | 終局壽命 |'); console.log('|---|---|---|---|');
const roles=Object.keys(G.ROLES).filter(k=>G.ROLES[k].pool!==false);
for(const r of roles){
  let st; try{ st=G.runMany({n:2000,policies:{0:G.POLICIES.aiLike},picks:{0:r}}); }catch(e){ console.log(`| ${G.ROLES[r].name} | picks 失敗：${e.message} |`); continue; }
  console.log(`| ${G.ROLES[r].name} | ${pct(st.winRate[0])} | ${st.avgSurvivalNights[0].toFixed(1)} | ${st.avgFinalLife[0].toFixed(1)} |`);
}

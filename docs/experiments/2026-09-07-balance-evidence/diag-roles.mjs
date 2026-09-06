import {loadGame} from 'file:///C:/Users/shung/OneDrive/桌面/妖市/tests/tools/load.mjs';
const G=loadGame('C:/Users/shung/OneDrive/桌面/妖市/index.html');
const pct=v=>(v*100).toFixed(0)+'%';
console.log('## 各角色在座位 0（policyAiLike，n=2000）勝率／平均存活夜／平均終局壽命；4 人桌基準 25%');
console.log('| 角色 | 勝率 | 存活夜 | 終局壽命 |'); console.log('|---|---|---|---|');
const roles=Object.keys(G.ROLES).filter(k=>G.ROLES[k].pool);
for(const r of roles){
  const st=G.runMany({n:2000,policies:{0:G.POLICIES.aiLike},picks:[r]});
  console.log(`| ${G.ROLES[r].name}（${r}） | ${pct(st.winRate[0])} | ${st.avgSurvivalNights[0].toFixed(1)} | ${st.avgFinalLife[0].toFixed(1)} |`);
}
/* 單件輸家的扣血：1 隻輸＝燒掉比例 100% → PW_MAX；看 2 件、3 件袋輸時的平均扣血分布（預設桌 n=2000） */
const st=G.runMany({n:2000});
console.log('\n預設 AI 桌 n=2000：平均局長 '+st.avgGameLength.toFixed(2)+' 夜；出局率／人 '+JSON.stringify(st.avgSurvivalNights.map(x=>x.toFixed(1))));

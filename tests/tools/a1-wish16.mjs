/* W1/W2 等價比對（docs/experiments/2026-09-02-acceptance-wish16.md）。
   先 git show 365230a:index.html > old.html（本目錄），再 node a1-wish16.mjs */
import {loadGame} from './load.mjs';
const NEW='C:/Users/shung/OneDrive/桌面/妖市/index.html';
const seeds=Array.from({length:20},(_,i)=>i+1);
const NEW_IDS=['wish_zuling','wish_xianghuo','wish_trinity','wish_bigfish','wish_allin','wish_bargain','wish_yamingwin','wish_solo',
  'wish_rival','wish_crowd','wish_poisonrival','wish_bloodbath','wish_unscathed','wish_crush','wish_comeback','wish_exorcise'];
const J=(G)=>JSON.stringify(G.trace(seeds));
function diff(a,b){ for(let i=0;i<Math.max(a.length,b.length);i++) if(a[i]!==b[i]){ return `first diff @${i}\n old: ${a.slice(i-150,i+150)}\n new: ${b.slice(i-150,i+150)}`; } return ''; }
// W1-a：兩版 WISH_ON=false 相等
const Oa=loadGame('./old.html'); Oa.CFG.WISH_ON=false;
const Na=loadGame(NEW); Na.CFG.WISH_ON=false;
const oa=J(Oa), na=J(Na);
console.log('[W1-a] WISH_ON=false 舊 vs 新:', oa===na?'相等 ✅':'不相等 ❌'); if(oa!==na) console.log(diff(oa,na));
// W1-b：兩版 WISH_ON=true 必不相等
const Ob=loadGame('./old.html'); const Nb=loadGame(NEW);
const ob=J(Ob), nb=J(Nb);
console.log('[W1-b] WISH_ON=true  舊 vs 新:', ob===nb?'相等 ❌（新牌沒進牌局！）':'不相等 ✅');
// W2：新版只留原 8 張 ⇒ 與舊版（WISH_ON=true）相等
const Nc=loadGame(NEW); NEW_IDS.forEach(id=>{ delete Nc.WISHES[id]; });
console.log('  剩餘牌數:',Object.keys(Nc.WISHES).length);
const nc=J(Nc);
console.log('[W2]   新版只留原 8 張 vs 舊版:', ob===nc?'相等 ✅':'不相等 ❌'); if(ob!==nc) console.log(diff(ob,nc));
console.log('bytes 舊(off)/新(off)/舊(on)/新(on)/新(8張):',oa.length,na.length,ob.length,nb.length,nc.length);

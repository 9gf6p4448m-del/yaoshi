import {loadGame} from './load.mjs';
const seeds=Array.from({length:20},(_,i)=>i+1);
const o=JSON.stringify(loadGame('./old.html').trace(seeds)), n=JSON.stringify(loadGame('C:/Users/shung/OneDrive/桌面/妖市/index.html').trace(seeds));
const N2=loadGame('C:/Users/shung/OneDrive/桌面/妖市/index.html'); N2.CFG.AI_IDLE_P=0.25; const n2=JSON.stringify(N2.trace(seeds));
console.log('預設值 vs 55fb013:', o===n?'相等 ✅':'不相等 ❌', '| AI_IDLE_P=0.25:', o===n2?'相等 ❌':'不相等 ✅');

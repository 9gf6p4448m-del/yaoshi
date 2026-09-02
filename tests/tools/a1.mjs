import {loadGame} from './load.mjs';
const NEW='C:/Users/shung/OneDrive/桌面/妖市/index.html';
const seeds=Array.from({length:20},(_,i)=>i+1);
// 方向一：RULE_ON=false 與舊版逐位元組相等
const O=loadGame('./old.html');
const N=loadGame(NEW);
N.CFG.RULE_ON=false;
const o=JSON.stringify(O.trace(seeds));
const n=JSON.stringify(N.trace(seeds));
console.log('[A1-a] RULE_ON=false vs 5c8604d 逐位元組:', o===n?'相等':'不相等');
if(o!==n){
  for(let i=0;i<Math.max(o.length,n.length);i++) if(o[i]!==n[i]){ console.log('first diff @',i); console.log('old:',o.slice(i-200,i+200)); console.log('new:',n.slice(i-200,i+200)); break; }
}
// 方向二：RULE_ON=true 必不相等
const N2=loadGame(NEW);
N2.CFG.RULE_ON=true;
const n2=JSON.stringify(N2.trace(seeds));
console.log('[A1-b] RULE_ON=true  vs 5c8604d 逐位元組:', o===n2?'相等（不合格！）':'不相等（正確）');
console.log('bytes old/new(off)/new(on):',o.length,n.length,n2.length);

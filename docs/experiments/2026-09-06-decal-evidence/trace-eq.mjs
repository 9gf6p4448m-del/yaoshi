import { loadGame } from 'file:///C:/Users/shung/OneDrive/%E6%A1%8C%E9%9D%A2/%E5%A6%96%E5%B8%82/tests/tools/load.mjs';
const seeds=Array.from({length:20},(_,i)=>i+1);
const a=JSON.stringify(loadGame('C:/Users/shung/OneDrive/桌面/妖市/index.html').trace(seeds));
const b=JSON.stringify(loadGame(process.argv[2]).trace(seeds));
console.log('bytes new/old', a.length, b.length, a===b?'IDENTICAL':'DIFF');
process.exit(a===b?0:1);

/* 冷讀覆審探針 1：G9 零戰力對照是否漏掉「傳說共鳴」；top 分母口徑；回天文案真偽 */
import path from 'path';
import {fileURLToPath} from 'url';
import {loadGame} from './load.mjs';
const NEW='C:/Users/shung/OneDrive/桌面/妖市/.claude/worktrees/agent-a6e8673e38160128f/index.html';
const N=Number(process.argv[2]||1000);
const SEEDS=Array.from({length:N},(_,i)=>i+1);
const pct=v=>(v*100).toFixed(2)+'%';

const measure=games=>{ let a=0,w=0; games.forEach(g=>{ if(!g.holders.length) return; a++; if(g.holders.includes(g.winnerId)) w++; }); return {r:a?w/a:0,w,a}; };

// A 現行
const gA=loadGame(NEW); gA.CFG.LEGEND_ON=true;
const A=measure(SEEDS.map(s=>gA.playPolicyGame(s,{})));
// B 閘門用的零戰力（只拿掉 unit，eff 共鳴留著）
const gB=loadGame(NEW); gB.CFG.LEGEND_ON=true;
gB.LEGENDS.forEach(L=>{ L.unit={body:'ward',count:0,atk:0,hp:0}; });
const B=measure(SEEDS.map(s=>gB.playPolicyGame(s,{})));
// C 真・零效果（unit 與 eff 都拿掉）
const gC=loadGame(NEW); gC.CFG.LEGEND_ON=true;
gC.LEGENDS.forEach(L=>{ L.unit={body:'ward',count:0,atk:0,hp:0}; delete L.eff; });
const C=measure(SEEDS.map(s=>gC.playPolicyGame(s,{})));
// D 只拿掉 eff（共鳴），unit 留著
const gD=loadGame(NEW); gD.CFG.LEGEND_ON=true;
gD.LEGENDS.forEach(L=>{ delete L.eff; });
const D=measure(SEEDS.map(s=>gD.playPolicyGame(s,{})));

console.log(`n=${N}`);
console.log(`A 現行            : ${pct(A.r)} (${A.w}/${A.a})`);
console.log(`B 閘門零戰力(留共鳴): ${pct(B.r)} (${B.w}/${B.a})  差值 A-B = ${((A.r-B.r)*100).toFixed(2)}pp  <= 閘門判這個`);
console.log(`C 真零效果(無共鳴)  : ${pct(C.r)} (${C.w}/${C.a})  差值 A-C = ${((A.r-C.r)*100).toFixed(2)}pp`);
console.log(`D 只無共鳴(有戰力)  : ${pct(D.r)} (${D.w}/${D.a})  共鳴單獨貢獻 A-D = ${((A.r-D.r)*100).toFixed(2)}pp`);

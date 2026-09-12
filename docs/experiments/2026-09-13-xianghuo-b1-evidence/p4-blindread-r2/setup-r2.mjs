/* P4 盲讀材料混洗（香火批 1）：三對讀者各一套混洗；材料 A（治具棚 t1+t2，18 張）＋ B（t2 近景，9 張）＝27 張 → s01–s27。
   跑法：node scratchpad/p4-b1/setup.mjs <worktree 根>   （讀 <root>/docs/experiments/2026-09-13-xianghuo-b1-evidence/p4-material-{A-booth,B-closeup}/）
   輸出：scratchpad/p4-b1/p{1,2,3}/reader/{s01..s27.png, options.txt}；隱藏表 <root>/docs/experiments/2026-09-13-xianghuo-b1-evidence/p4-blindread/p{N}/p{N}-shuffle-mapping-HIDDEN.json */
import fs from 'node:fs'; import path from 'node:path';
const root=process.argv[2]; if(!root) throw new Error('需要 worktree 根路徑');
const EV=path.join(root,'docs/experiments/2026-09-13-xianghuo-b1-evidence');
const A=path.join(EV,'p4-material-A-booth-r2'), B=path.join(EV,'p4-material-B-closeup-r2');
const ma=JSON.parse(fs.readFileSync(path.join(A,'mapping-HIDDEN.json'),'utf8')), mb=JSON.parse(fs.readFileSync(path.join(B,'mapping-HIDDEN.json'),'utf8'));
const listOf=(m,dir,mat)=>(m.mapping||m).map(x=>({orig:`${mat}:${x.code}`, file:path.join(dir,(x.file&&path.basename(x.file))||`${x.code}.png`), trId:x.trait||x.trId, tier:x.tier, material:mat}));
const all=[...listOf(ma,A,'A'),...listOf(mb,B,'B')];
if(all.length!==27) throw new Error('材料張數不是 27：'+all.length);
const options=fs.readFileSync(path.join(EV,'p4-options.txt'),'utf8');
for(const [p,seed] of [['p1',20260941],['p2',20260942],['p3',20260943]]){
  let a=seed>>>0; const rng=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  const arr=[...all]; for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
  const out=path.join('scratchpad/p4-b1-r2',p,'reader'); fs.mkdirSync(out,{recursive:true});
  const hid=path.join(EV,'p4-blindread-r2',p); fs.mkdirSync(hid,{recursive:true});
  const map=arr.map((x,i)=>{const code=`s${String(i+1).padStart(2,'0')}`; fs.copyFileSync(x.file,path.join(out,`${code}.png`)); return {code,orig:x.orig,trId:x.trId,tier:x.tier,material:x.material};});
  fs.writeFileSync(path.join(out,'options.txt'),options);
  fs.writeFileSync(path.join(hid,`${p}-shuffle-mapping-HIDDEN.json`),JSON.stringify({seed,map},null,1));
  console.log(p,'ok',map.length);
}

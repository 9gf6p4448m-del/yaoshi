/* P4 新三輪（香火＋祖靈 18 支）第 N 輪材料混洗。跑法：node scratchpad/p4-b1/setup-x2.mjs <worktree 根> <輪次 r1|r2|r3> <seedBase>
   材料 A（2v2 治具棚 t1+t2，36 張）＋B（t2 近景，18 張）＝54 張 → s01–s54；三對各一套混洗。
   輸出：scratchpad/p4-x2-<輪>/p{1,2,3}/reader/{s01..s54.png, options.txt}；隱藏表 <root>/docs/experiments/2026-09-13-zuling-b2-evidence/p4-blindread-x2-<輪>/pN/pN-shuffle-mapping-HIDDEN.json */
import fs from 'node:fs'; import path from 'node:path';
const [root,rnd,seedBase,sfx='']=process.argv.slice(2); if(!root||!rnd||!seedBase) throw new Error('args: root round seedBase [materialSuffix]');
const EV=path.join(root,'docs/experiments/2026-09-13-zuling-b2-evidence');
const A=path.join(EV,'p4-material-A-booth-x2'+sfx), B=path.join(EV,'p4-material-B-closeup-x2'+sfx);
const listOf=(dir,mat)=>{const m=JSON.parse(fs.readFileSync(path.join(dir,'mapping-HIDDEN.json'),'utf8'));return (m.mapping||m).map(x=>({orig:`${mat}:${x.code}`,file:path.join(dir,path.basename(x.file||`${x.code}.png`)),trId:x.trId||x.trait,tier:x.tier,material:mat,faction:x.faction}));};
const all=[...listOf(A,'A'),...listOf(B,'B')]; if(all.length!==54) throw new Error('材料張數不是 54：'+all.length);
const options=fs.readFileSync(path.join(root,'docs/experiments/2026-09-13-xianghuo-b1-evidence/p4-options.txt'),'utf8');
for(const [i,p] of ['p1','p2','p3'].entries()){const seed=Number(seedBase)+i; let a=seed>>>0; const rng=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  const arr=[...all]; for(let k=arr.length-1;k>0;k--){const j=Math.floor(rng()*(k+1));[arr[k],arr[j]]=[arr[j],arr[k]];}
  const out=path.join('scratchpad',`p4-x2-${rnd}`,p,'reader'); fs.mkdirSync(out,{recursive:true});
  const hid=path.join(EV,`p4-blindread-x2-${rnd}`,p); fs.mkdirSync(hid,{recursive:true});
  const map=arr.map((x,k)=>{const code=`s${String(k+1).padStart(2,'0')}`; fs.copyFileSync(x.file,path.join(out,`${code}.png`)); return {code,orig:x.orig,trId:x.trId,tier:x.tier,material:x.material,faction:x.faction};});
  fs.writeFileSync(path.join(out,'options.txt'),options); fs.writeFileSync(path.join(hid,`${p}-shuffle-mapping-HIDDEN.json`),JSON.stringify({seed,map},null,1)); console.log(p,'ok',map.length);}

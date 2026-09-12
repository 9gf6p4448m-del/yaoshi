import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const D=path.dirname(fileURLToPath(import.meta.url));
const TRUTH={'左':['殘日','大士爺'],'右':['有應公','有應公']};
const norm=s=>String(s||'').replace(/畫面|側/g,'').trim();
const eq=(a,b)=>{a=[...a].sort();b=[...b].sort();return a.length===b.length&&a.every((x,i)=>x===b[i]);};
const frameOk=f=>{const got={'左':[],'右':[]};for(const l of (f.legends||[])){const s=norm(l.side);if(!got[s])return false;got[s].push(norm(l.who));}return eq(got['左'],TRUTH['左'])&&eq(got['右'],TRUTH['右']);};
const out=[];const say=s=>{out.push(s);console.log(s);};
let pairsOk=0;
for(const p of ['p1','p2','p3']){const res={};for(const r of ['A','B']){const fp=path.join(D,`${p}-reader-${r}.json`);if(!fs.existsSync(fp)){res[r]=null;continue;}const j=JSON.parse(fs.readFileSync(fp,'utf8'));res[r]=j.filter(frameOk).length;}
 const ok=res.A!=null&&res.B!=null&&res.A>=5&&res.B>=5; if(ok)pairsOk++; say(`${p}: A ${res.A??'缺'}/6  B ${res.B??'缺'}/6  → ${ok?'✅':'❌'}`);}
say(`G3：${pairsOk>=2?'✅ 通過':'❌ 未過'}（${pairsOk}/3 對）`);
fs.writeFileSync(path.join(D,'score.txt'),out.join('\n')+'\n');

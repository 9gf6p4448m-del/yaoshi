const q=(a,p)=>a[Math.floor(a.length*p)];
for (const v of process.argv.slice(2)) {
  const r=require('./series-'+v+'.json');
  for (const [ri,rows] of r.rounds.entries()){
    const aw=rows.filter(x=>!x.curse).flatMap(x=>x.ser.map(s=>s.tot)).sort((a,b)=>a-b);
    const cu=rows.filter(x=>x.curse).flatMap(x=>x.ser.map(s=>s.tot)).sort((a,b)=>a-b);
    const cuNo6=rows.filter(x=>x.curse).flatMap(x=>x.ser.slice(6).map(s=>s.tot)).sort((a,b)=>a-b);
    const all=[...aw,...cu].sort((a,b)=>a-b);
    const allNo6=[...aw,...cuNo6].sort((a,b)=>a-b);
    const thr=q(all,0.95); const cnt6=rows.filter(x=>x.curse).flatMap(x=>x.ser.slice(0,6).map(s=>s.tot)).filter(t=>t>=thr).length;
    console.log(v,ri,'award n',aw.length,'p50',q(aw,.5).toFixed(2),'p95',q(aw,.95).toFixed(2),'| curse p95',q(cu,.95).toFixed(2),'| all p95',thr.toFixed(2),'| all p95 w/o first6 curse frames',q(allNo6,.95).toFixed(2),'| first6 frames >= thr:',cnt6);
  }
}

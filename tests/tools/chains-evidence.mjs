// Reproduce L1 water-chain mutation and V8 coverage evidence without changing index.html.
// Usage: node tests/tools/chains-evidence.mjs [index.html] [output.json]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const target=path.resolve(process.argv[2]||path.join(root,'index.html'));
const output=path.resolve(process.argv[3]||path.join(root,'docs/experiments/2026-09-21-l1-water/coverage-mutations.json'));
fs.mkdirSync(path.dirname(output),{recursive:true});
const html=fs.readFileSync(target,'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if(!script) throw new Error('Game script not found');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yaoshi-water-evidence-'));
const testFile=path.join(root,'tests/chains.test.mjs');
const run=(env)=>{
  const result=spawnSync(process.execPath,['--test',testFile],{
    cwd:root,env:{...process.env,...env},encoding:'utf8',maxBuffer:8*1024*1024});
  return {exitCode:result.status,output:(result.stdout||'')+(result.stderr||'')};
};
const replaceOnce=(from,to)=>{
  if(!html.includes(from)) throw new Error('Mutation anchor missing: '+from);
  return html.replace(from,to);
};
const summaries=[];
try{
  const coverageDir=path.join(temp,'coverage');
  fs.mkdirSync(coverageDir);
  const original=run({NODE_V8_COVERAGE:coverageDir,CHAIN_TARGET:target});
  fs.writeFileSync(path.join(path.dirname(output),'coverage-test.log'),original.output);
  if(original.exitCode!==0) throw new Error('Original chains test failed:\n'+original.output);
  const cases=[
    {name:'disable-interception',from:'if(hasFlag(target,"blockPoisonTransfer")){',to:'if(false && hasFlag(target,"blockPoisonTransfer")){'},
    {name:'count-blocked-as-hit',from:'if(a.intent==="poison"&&!a.poisonBlocked){ poison++;',to:'if(a.intent==="poison"){ poison++;'},
  ];
  for(const mutation of cases){
    const mutant=path.join(temp,mutation.name+'.html');
    fs.writeFileSync(mutant,replaceOnce(mutation.from,mutation.to));
    const r=run({CHAIN_TARGET:mutant});
    fs.writeFileSync(path.join(path.dirname(output),mutation.name+'.log'),r.output);
    const failures=[...new Set([...r.output.matchAll(/^✖ (.+?) \(/gm)].map(m=>m[1]))];
    if(r.exitCode===0 || !failures.length) throw new Error(mutation.name+' did not produce a behavioral RED');
    summaries.push({name:mutation.name,exitCode:r.exitCode,failures});
  }

  const reports=fs.readdirSync(coverageDir).filter(x=>x.endsWith('.json'));
  const scripts=reports.flatMap(file=>JSON.parse(fs.readFileSync(path.join(coverageDir,file),'utf8')).result)
    .filter(s=>s.functions?.some(f=>f.functionName==='activeChains'));
  if(!scripts.length) throw new Error('V8 did not report game script coverage');
  const query=scripts.find(s=>s.functions.some(f=>f.functionName==='chainsCompletedBy'&&f.ranges[0].count>0));
  const auction=scripts.find(s=>s.functions.some(f=>f.functionName==='resolveAuction'&&f.ranges[0].count>0));
  if(!query||!auction) throw new Error('Expected query and auction paths were not run');
  const calibration=(s)=>{
    const f=s.functions.find(x=>x.functionName==='activeChains');
    return f.ranges[0].startOffset-script.indexOf('function activeChains');
  };
  const qDelta=calibration(query), aDelta=calibration(auction);
  if(qDelta!==aDelta) throw new Error('Coverage script offsets disagree');
  const delta=qDelta;
  const slices=[
    {name:'activeChains',start:'function activeChains(p){',end:'function chainsCompletedBy(p,item){',owner:query},
    {name:'chainsCompletedBy',start:'function chainsCompletedBy(p,item){',end:'function collectEffects(p,order){',owner:query},
    {name:'poison-transfer-interception',start:'if(hasFlag(target,"blockPoisonTransfer")){',end:'}else if(it.curse){',owner:auction},
    {name:'blocked-reveal-result',start:'reveal.push({it,entries,winner,outcome,events,...(poisonBlocked?',end:'});\n  });',owner:auction},
  ];
  const coverage=slices.map(part=>{
    const begin=script.indexOf(part.start), finish=script.indexOf(part.end,begin);
    if(begin<0||finish<0) throw new Error('Coverage span missing: '+part.name);
    // V8 nested ranges override containing ranges. A character is covered when its
    // innermost reported range has a positive execution count.
    const functions=part.owner.functions;
    let covered=0,total=0;
    const lines=new Map();
    let line=script.slice(0,begin).split('\n').length;
    for(let offset=begin+delta;offset<finish+delta;offset++){
      let chosen=null;
      for(const fn of functions) for(const range of fn.ranges){
        if(range.startOffset<=offset&&offset<range.endOffset &&
          (!chosen || range.endOffset-range.startOffset<chosen.endOffset-chosen.startOffset)) chosen=range;
      }
      const ch=script[offset-delta];
      if(ch==='\n') line++;
      if(chosen){
        total++;if(chosen.count>0) covered++;
        if(ch && ch.trim()){
          const state=lines.get(line)||false;
          lines.set(line,state||chosen.count>0);
        }
      }
    }
    return {name:part.name,coveredBytes:covered,totalBytes:total,rate:total?covered/total:null,
      coveredLines:[...lines.values()].filter(Boolean).length,totalLines:lines.size,
      granularity:'V8 nested byte ranges; unreported branches inherit containing function count'};
  });
  const relevant=coverage.filter(c=>c.name!=='blocked-reveal-result');
  const coveredBytes=relevant.reduce((n,c)=>n+c.coveredBytes,0);
  const totalBytes=relevant.reduce((n,c)=>n+c.totalBytes,0);
  const result={target:path.relative(root,target).replaceAll('\\','/'),test:'tests/chains.test.mjs',
    original:{exitCode:original.exitCode,passed:Number(original.output.match(/ℹ pass (\d+)/)?.[1]),failed:Number(original.output.match(/ℹ fail (\d+)/)?.[1])},
    mutations:summaries,coverage,scope:{names:relevant.map(c=>c.name),coveredBytes,totalBytes,rate:coveredBytes/totalBytes},
    method:'NODE_V8_COVERAGE on real chains.test.mjs; byte offsets calibrated to extracted inline game script. V8 byte coverage measures executed source spans, while mutations establish behavioral sensitivity.'};
  if(result.scope.rate<0.8) throw new Error('New query/interception scope coverage below 80%');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}finally{
  const resolved=path.resolve(temp), relative=path.relative(path.resolve(os.tmpdir()),resolved);
  if(!relative || relative.startsWith('..') || path.isAbsolute(relative) || relative.includes(path.sep)
    || !path.basename(resolved).startsWith('yaoshi-water-evidence-'))
    throw new Error('Refusing to remove an unexpected temporary directory: '+resolved);
  fs.rmSync(resolved,{recursive:true,force:true});
}

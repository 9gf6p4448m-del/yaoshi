// Run the recorder contract, V8 core coverage and behavioral mutants.
// Usage: node tests/tools/chain-holdings-evidence.mjs [index.html] [verification-dir]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const target=path.resolve(process.argv[2]||path.join(root,'index.html'));
const outDir=path.resolve(process.argv[3]||path.join(root,'docs/experiments/2026-09-21-l1e-recorder/verification'));
const html=fs.readFileSync(target,'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if(!script) throw Error('Game script missing');
fs.mkdirSync(outDir,{recursive:true});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'yaoshi-chain-holdings-'));
const testFile=path.join(root,'tests/chain-holdings.test.mjs');
function run(file,env={}){
  const r=spawnSync(process.execPath,['--test',testFile],{cwd:root,env:{...process.env,...env,CHAIN_HOLDINGS_TARGET:file},encoding:'utf8',maxBuffer:8*1024*1024});
  return {exitCode:r.status,output:(r.stdout||'')+(r.stderr||'')};
}
function replaceOnce(from,to){
  const start=html.indexOf(from);
  if(start<0||html.indexOf(from,start+from.length)>=0) throw Error('Mutation anchor must occur exactly once: '+from);
  return html.slice(0,start)+to+html.slice(start+from.length);
}
function sourceCoverage(entry,name,start,end,delta){
  const begin=script.indexOf(start),finish=script.indexOf(end,begin+start.length);
  if(begin<0||finish<0) throw Error('Coverage anchors absent: '+name);
  let covered=0,total=0;
  for(let i=begin;i<finish;i++){
    if(!script[i].trim()) continue;
    let match=null;
    for(const fn of entry.functions) for(const r of fn.ranges){
      if(r.startOffset<=i+delta&&i+delta<r.endOffset &&
        (!match||r.endOffset-r.startOffset<match.endOffset-match.startOffset)) match=r;
    }
    total++;
    if(match?.count>0) covered++;
  }
  return {name,coveredSourceUnits:covered,totalSourceUnits:total,rate:covered/total};
}
try{
  const coverageDir=path.join(tmp,'coverage');fs.mkdirSync(coverageDir);
  const baseline=run(target,{NODE_V8_COVERAGE:coverageDir});
  fs.writeFileSync(path.join(outDir,'contract-test.log'),baseline.output);
  if(baseline.exitCode!==0) throw Error('Contract suite failed');
  const mutations=[
    {name:'night-end-only',from:'if(!rec || rec.state!==S || !S.players.includes(p)) return;',to:'if(!rec || rec.state!==S || !S.players.includes(p) || phase!=="endgame.strip") return;'},
    {name:'seat-zero-only',from:'if(!rec || rec.state!==S || !S.players.includes(p)) return;',to:'if(!rec || rec.state!==S || !S.players.includes(p) || p.id!==0) return;'},
    {name:'omit-auction-win',from:'observeBagMutation(winner.p,"auction.win");',to:'/* intentionally omitted auction observation */'},
  ];
  const mutants=[];
  for(const mutation of mutations){
    const file=path.join(tmp,mutation.name+'.html');
    fs.writeFileSync(file,replaceOnce(mutation.from,mutation.to));
    const r=run(file);
    fs.writeFileSync(path.join(outDir,mutation.name+'.log'),r.output);
    const failed=Number(r.output.match(/ℹ fail (\d+)/)?.[1]||0);
    if(r.exitCode===0||failed<1) throw Error('Mutant was not rejected: '+mutation.name);
    mutants.push({name:mutation.name,exitCode:r.exitCode,failedTests:failed});
  }
  const entries=fs.readdirSync(coverageDir).filter(f=>f.endsWith('.json'))
    .flatMap(f=>JSON.parse(fs.readFileSync(path.join(coverageDir,f),'utf8')).result);
  const entry=entries.find(e=>e.functions?.some(f=>f.functionName==='observeBagMutation'&&f.ranges[0].count>0));
  if(!entry) throw Error('No executed recorder function in V8 report');
  const f=entry.functions.find(f=>f.functionName==='observeBagMutation');
  const delta=f.ranges[0].startOffset-script.indexOf('function observeBagMutation');
  const functions=[
    sourceCoverage(entry,'observeBagMutation','function observeBagMutation(p,phase){','function chainHoldingsSnapshot(rec){',delta),
    sourceCoverage(entry,'chainHoldingsSnapshot','function chainHoldingsSnapshot(rec){','function chainsCompletedBy(p,item){',delta),
  ];
  const covered=functions.reduce((n,f)=>n+f.coveredSourceUnits,0);
  const total=functions.reduce((n,f)=>n+f.totalSourceUnits,0);
  const evidence={target:path.relative(root,target).replaceAll('\\','/'),test:'tests/chain-holdings.test.mjs',
    baseline:{exitCode:baseline.exitCode,passed:Number(baseline.output.match(/ℹ pass (\d+)/)?.[1]||0)},
    coverage:{method:'V8 innermost executed source ranges; non-whitespace units in new recorder core functions',functions,coveredSourceUnits:covered,totalSourceUnits:total,rate:covered/total},
    mutants};
  fs.writeFileSync(path.join(outDir,'coverage-mutations.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
  if(evidence.coverage.rate<0.8) process.exitCode=1;
}finally{
  const relative=path.relative(os.tmpdir(),tmp);
  if(!relative||relative.startsWith('..')||path.isAbsolute(relative)||relative.includes(path.sep)||!path.basename(tmp).startsWith('yaoshi-chain-holdings-'))
    throw Error('Unexpected temp directory: '+tmp);
  fs.rmSync(tmp,{recursive:true,force:true});
}

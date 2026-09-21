// L1 candidate gates: relevant tests, de471a2 empty-chain trace, semantic mutants, V8 source ranges.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadGame} from './load.mjs';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'docs/experiments/2026-09-21-l1-trial/verification');
fs.mkdirSync(out,{recursive:true});
const target=path.join(root,'index.html');
const html=fs.readFileSync(target,'utf8');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yaoshi-l1-checks-'));
const run=(args,env={})=>spawnSync(process.execPath,args,{cwd:root,env:{...process.env,...env},encoding:'utf8',maxBuffer:20*1024*1024});
const save=(name,r)=>fs.writeFileSync(path.join(out,name),(r.stdout||'')+(r.stderr||''));
const summary={base:'de471a2',head:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim()};
try{
  const coverageDir=path.join(temp,'coverage');fs.mkdirSync(coverageDir);
  const tests=run(['--test','tests/chains.test.mjs','tests/l1-ui.test.mjs','tests/l1-tiger.test.mjs'],{NODE_V8_COVERAGE:coverageDir});
  save('affected-tests.log',tests);
  summary.affectedTests={exit:tests.status,passes:Number(tests.stdout.match(/ℹ pass (\d+)/)?.[1]||0)};
  if(tests.status!==0) throw new Error('Affected tests failed');

  const old=spawnSync('git',['show','de471a2:index.html'],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024});
  if(old.status!==0) throw new Error('Cannot read de471a2 index.html');
  const oldPath=path.join(temp,'old.html');fs.writeFileSync(oldPath,old.stdout);
  const seeds=Array.from({length:20},(_,i)=>i+1);
  const trace=p=>{const g=loadGame(p);for(const key of Object.keys(g.CHAINS||{})) delete g.CHAINS[key];return JSON.stringify(g.trace(seeds));};
  const oldTrace=trace(oldPath),newTrace=trace(target);
  summary.emptyChainsTrace={seeds:'1..20',oldBytes:Buffer.byteLength(oldTrace),newBytes:Buffer.byteLength(newTrace),exactEqual:oldTrace===newTrace};
  if(oldTrace!==newTrace){let at=0;while(at<oldTrace.length&&oldTrace[at]===newTrace[at])at++;summary.emptyChainsTrace.firstDiff=at;}

  const mutants=[
    {name:'eyes-ignore-hidden-bids',from:' || !result.showEntries || ',to:' || ',test:'tests/l1-ui.test.mjs'},
    {name:'twin-tiger-armor-pierce-disabled',from:'&&!(attack&&attack.armorPierce)',to:'',test:'tests/l1-tiger.test.mjs'},
  ];
  summary.mutations=[];
  for(const m of mutants){
    if(!html.includes(m.from)) throw new Error(`Missing mutation anchor ${m.name}`);
    const p=path.join(temp,m.name+'.html');fs.writeFileSync(p,html.replace(m.from,m.to));
    const r=run(['--test',m.test],{CHAIN_TARGET:p});save(m.name+'.log',r);
    const failures=[...new Set([...((r.stdout||'')+(r.stderr||'')).matchAll(/^✖ (.+?) \(/gm)].map(x=>x[1]))];
    summary.mutations.push({name:m.name,exit:r.status,failedTests:failures,caught:r.status!==0&&failures.length>0});
  }

  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if(!script) throw new Error('No inline game script');
  const records=fs.readdirSync(coverageDir).filter(x=>x.endsWith('.json')).flatMap(x=>JSON.parse(fs.readFileSync(path.join(coverageDir,x),'utf8')).result);
  const sources=records.filter(x=>x.functions?.some(f=>f.functionName==='activeChains'));
  const names=['activeChains','chainsCompletedBy','canViewPrivateBag','eyesSecondBid','buildArmy'];
  const coverage=[];
  for(const name of names){
    const begin=script.indexOf(`function ${name}(`);
    if(begin<0) throw new Error(`Missing core function ${name}`);
    const open=script.indexOf('{',begin);let depth=0,end=-1;
    for(let i=open;i<script.length;i++){if(script[i]==='{')depth++;else if(script[i]==='}'&&--depth===0){end=i+1;break;}}
    if(end<0) throw new Error(`Cannot bound ${name}`);
    let covered=0,total=0;
    for(let i=begin;i<end;i++){
      const char=script[i];if(!char.trim())continue;
      total++;
      let hit=false;
      for(const src of sources){
        const anchor=src.functions.find(f=>f.functionName==='activeChains');
        const delta=anchor.ranges[0].startOffset-script.indexOf('function activeChains(');
        const offset=i+delta;
        let chosen=null;
        for(const fn of src.functions)for(const range of fn.ranges){
          if(range.startOffset<=offset&&offset<range.endOffset&&(!chosen||range.endOffset-range.startOffset<chosen.endOffset-chosen.startOffset))chosen=range;
        }
        if(chosen?.count>0){hit=true;break;}
      }
      if(hit)covered++;
    }
    coverage.push({function:name,coveredSourceUnits:covered,totalSourceUnits:total,rate:Number((covered/total).toFixed(4))});
  }
  summary.coverage={unit:'non-whitespace UTF-16 source positions covered by V8 execution ranges',functions:coverage,coveredSourceUnits:coverage.reduce((n,x)=>n+x.coveredSourceUnits,0),totalSourceUnits:coverage.reduce((n,x)=>n+x.totalSourceUnits,0)};
  summary.coverage.rate=Number((summary.coverage.coveredSourceUnits/summary.coverage.totalSourceUnits).toFixed(4));
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify(summary,null,2));
  if(!summary.emptyChainsTrace.exactEqual||summary.mutations.some(x=>!x.caught)||summary.coverage.rate<.8)process.exitCode=1;
}finally{fs.rmSync(temp,{recursive:true,force:true});}

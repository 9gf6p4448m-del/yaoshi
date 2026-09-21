import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const src=path.join(root,'tests/tools/l1-balance.mjs');
const spec=path.join(root,'tests/l1-balance.test.mjs');
const loader=path.join(root,'tests/tools/load.mjs');
const out=path.join(root,'docs/experiments/2026-09-21-l1e-measurement/verification');
fs.mkdirSync(out,{recursive:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'l1e-evidence-'));

function run(file,env={}){
  return spawnSync(process.execPath,['--test',file],{cwd:root,encoding:'utf8',env:{...process.env,...env}});
}

function mutant(name,oldText,newText){
  const dir=path.join(temp,name);
  fs.mkdirSync(dir,{recursive:true});
  const original=fs.readFileSync(src,'utf8');
  if(!original.includes(oldText)) throw Error(`mutation anchor absent: ${name}`);
  fs.writeFileSync(path.join(dir,'l1-balance.mjs'),original.replace(oldText,newText));
  fs.copyFileSync(loader,path.join(dir,'load.mjs'));
  const testText=fs.readFileSync(spec,'utf8')
    .replace("from './tools/load.mjs'",`from '${pathToFileURL(path.join(dir,'load.mjs')).href}'`)
    .replace("from './tools/l1-balance.mjs'",`from '${pathToFileURL(path.join(dir,'l1-balance.mjs')).href}'`)
    .replace("new URL('../index.html',import.meta.url)",`new URL('${pathToFileURL(path.join(root,'index.html')).href}')`);
  const testFile=path.join(dir,'l1-balance.test.mjs');
  fs.writeFileSync(testFile,testText);
  const result=run(testFile);
  fs.writeFileSync(path.join(out,`${name}.log`),result.stdout+result.stderr);
  if(result.status===0) throw Error(`${name} survived`);
  if(/ERR_MODULE_NOT_FOUND|SyntaxError|ERR_INVALID_URL/.test(result.stdout+result.stderr))
    throw Error(`${name} failed for infrastructure rather than semantics`);
  if(!/AssertionError/.test(result.stdout+result.stderr))
    throw Error(`${name} did not trigger a semantic assertion`);
  return {name,exitCode:result.status,log:`${name}.log`};
}

function coveredBytes(entry,names){
  const core=entry.functions.filter(f=>names.includes(f.functionName));
  if(core.length<names.length) throw Error(`coverage functions missing: ${names.filter(n=>!core.some(f=>f.functionName===n))}`);
  const spans=core.map(f=>f.ranges[0]);
  const all=entry.functions.flatMap(f=>f.ranges);
  let covered=0,total=0;
  for(const span of spans){
    const ranges=all.filter(r=>r.startOffset>=span.startOffset&&r.endOffset<=span.endOffset);
    const points=[...new Set([span.startOffset,span.endOffset,...ranges.flatMap(r=>[r.startOffset,r.endOffset])])].sort((a,b)=>a-b);
    for(let i=1;i<points.length;i++){
      const left=points[i-1],right=points[i];
      const narrow=ranges.filter(r=>r.startOffset<=left&&r.endOffset>=right)
        .sort((a,b)=>(a.endOffset-a.startOffset)-(b.endOffset-b.startOffset))[0];
      total+=right-left;
      if(narrow?.count>0) covered+=right-left;
    }
  }
  return {coveredBytes:covered,instrumentedBytes:total,ratio:covered/total,functions:names};
}

try{
  const coverageDir=path.join(temp,'coverage');
  const baseline=run(spec,{NODE_V8_COVERAGE:coverageDir});
  fs.writeFileSync(path.join(out,'test.log'),baseline.stdout+baseline.stderr);
  if(baseline.status!==0) throw Error('baseline tests failed');
  const entries=fs.readdirSync(coverageDir).filter(x=>x.endsWith('.json'))
    .flatMap(x=>JSON.parse(fs.readFileSync(path.join(coverageDir,x),'utf8')).result);
  const entry=entries.find(x=>x.url===pathToFileURL(src).href);
  if(!entry) throw Error('V8 coverage entry absent');
  const coverage=coveredBytes(entry,['validateSeeds','createChaser','disableChainEffects','summarize',
    'keyed','comparePaired','gameRow','runExperiment']);
  const mutants=[
    mutant('mutant-no-chaser-boost','Math.max(2,original?.amt||0)+2','Math.max(2,original?.amt||0)'),
    mutant('mutant-zero-removes-recipe',"for(const key of ['flags','traits','hooks','army'])","for(const key of ['flags','traits','hooks','army','requirements'])"),
  ];
  const result={baseline:{exitCode:baseline.status,log:'test.log'},coverage,mutants,
    sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex')};
  fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
  if(coverage.ratio<0.8) process.exitCode=1;
}finally{fs.rmSync(temp,{recursive:true,force:true});}

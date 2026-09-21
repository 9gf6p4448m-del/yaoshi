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

function tempSuite(name,source){
  const dir=path.join(temp,name);
  fs.mkdirSync(dir,{recursive:true});
  const rootAnchor="const ROOT=path.resolve(HERE,'../..');";
  if(!source.includes(rootAnchor)) throw Error('temporary module ROOT anchor absent');
  fs.writeFileSync(path.join(dir,'l1-balance.mjs'),
    source.replace(rootAnchor,`const ROOT=${JSON.stringify(root)};`));
  fs.copyFileSync(loader,path.join(dir,'load.mjs'));
  const testText=fs.readFileSync(spec,'utf8')
    .replace("from './tools/load.mjs'",`from '${pathToFileURL(path.join(dir,'load.mjs')).href}'`)
    .replace("from './tools/l1-balance.mjs'",`from '${pathToFileURL(path.join(dir,'l1-balance.mjs')).href}'`)
    .replace("new URL('../index.html',import.meta.url)",`new URL('${pathToFileURL(path.join(root,'index.html')).href}')`);
  const testFile=path.join(dir,'l1-balance.test.mjs');
  fs.writeFileSync(testFile,testText);
  const result=run(testFile);
  fs.writeFileSync(path.join(out,`${name}.log`),result.stdout+result.stderr);
  return result;
}

function mutant(name,oldText,newText,expectedTests){
  const original=fs.readFileSync(src,'utf8');
  if(!original.includes(oldText)) throw Error(`mutation anchor absent: ${name}`);
  const result=tempSuite(name,original.replace(oldText,newText));
  if(result.status===0) throw Error(`${name} survived`);
  if(/ERR_MODULE_NOT_FOUND|SyntaxError|ERR_INVALID_URL|fatal: not a git repository/.test(result.stdout+result.stderr))
    throw Error(`${name} failed for infrastructure rather than semantics`);
  const failures=(result.stdout.split('✖ failing tests:')[1]||'')
    .split(/(?=^✖ )/m).filter(x=>x.startsWith('✖ '));
  const names=failures.map(x=>x.match(/^✖ (.+?) \(/m)?.[1]);
  if(!failures.length||names.some(x=>!expectedTests.includes(x))||
    failures.some(x=>!x.includes('AssertionError'))||!expectedTests.some(x=>names.includes(x)))
    throw Error(`${name} has unexpected failures or lacks expected semantic assertion: ${names}`);
  return {name,exitCode:result.status,log:`${name}.log`};
}

function coveredSourceUnits(entry,names){
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
  return {coveredSourceUnits:covered,coreSourceUnits:total,ratio:covered/total,
    unit:'V8 UTF-16 source offsets, including whitespace and comments; eight named core functions only',
    exclusions:['parseCli','writeReport','CLI entrypoint'],functions:names};
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
  const coverage=coveredSourceUnits(entry,['validateSeeds','createChaser','disableChainEffects','summarize',
    'keyed','comparePaired','gameRow','runExperiment']);
  const tempBaseline=tempSuite('temp-baseline',fs.readFileSync(src,'utf8'));
  if(tempBaseline.status!==0) throw Error('unmutated temporary suite failed');
  const mutants=[
    mutant('mutant-no-chaser-boost','Math.max(2,original?.amt||0)+2','Math.max(2,original?.amt||0)',
      ['one target per night: two missing materials and duplicate offers use first market index',
        'chaser respects conservative cap, full fee budget and maximum bid count']),
    mutant('mutant-zero-leaves-flags',"for(const key of ['flags','traits','hooks','army'])","for(const key of ['traits','hooks','army'])",
      ['zero arm preserves recipe identity and bonus, removes only effects']),
  ];
  const result={baseline:{exitCode:baseline.status,log:'test.log'},
    tempBaseline:{exitCode:tempBaseline.status,log:'temp-baseline.log'},coverage,mutants,
    sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex')};
  fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
  if(coverage.ratio<0.8) process.exitCode=1;
}finally{fs.rmSync(temp,{recursive:true,force:true});}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const sourceFile=path.join(ROOT,'tests/tools/l1-information.mjs');
const testFile=path.join(ROOT,'tests/l1-information.test.mjs');
const output=path.join(ROOT,'docs/experiments/2026-09-21-l1e-information/policy-verification');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'l1e-information-'));
fs.mkdirSync(output,{recursive:true});

function run(file,env={}){
  return spawnSync(process.execPath,['--test',file],{cwd:ROOT,encoding:'utf8',env:{...process.env,...env}});
}

function temporarySuite(name,source){
  const dir=path.join(temp,name);
  fs.mkdirSync(dir,{recursive:true});
  const fixed=source
    .replace("const ROOT=path.resolve(HERE,'../..');",`const ROOT=${JSON.stringify(ROOT)};`)
    .replace("from './load.mjs'",`from '${pathToFileURL(path.join(ROOT,'tests/tools/load.mjs')).href}'`)
    .replace("from './l1-balance.mjs'",`from '${pathToFileURL(path.join(ROOT,'tests/tools/l1-balance.mjs')).href}'`);
  if(fixed===source) throw Error('temporary source rewrite failed');
  const module=path.join(dir,'l1-information.mjs');
  fs.writeFileSync(module,fixed);
  const test=fs.readFileSync(testFile,'utf8')
    .replace("from './tools/load.mjs'",`from '${pathToFileURL(path.join(ROOT,'tests/tools/load.mjs')).href}'`)
    .replace("from './tools/l1-information.mjs'",`from '${pathToFileURL(module).href}'`)
    .replace("new URL('../index.html',import.meta.url)",`new URL('${pathToFileURL(path.join(ROOT,'index.html')).href}')`);
  const spec=path.join(dir,'l1-information.test.mjs');
  fs.writeFileSync(spec,test);
  const result=run(spec);
  fs.writeFileSync(path.join(output,`${name}.log`),result.stdout+result.stderr);
  return result;
}

function mutant(name,needle,replacement,expected){
  const original=fs.readFileSync(sourceFile,'utf8');
  if(!original.includes(needle)) throw Error(`mutation anchor absent: ${name}`);
  const result=temporarySuite(name,original.replace(needle,replacement));
  const log=result.stdout+result.stderr;
  if(result.status===0) throw Error(`${name} survived`);
  if(/ERR_MODULE_NOT_FOUND|SyntaxError|ERR_INVALID_URL|fatal: not a git repository/.test(log))
    throw Error(`${name} failed through infrastructure`);
  if(!log.includes(expected)||!log.includes('AssertionError'))
    throw Error(`${name} did not reach expected semantic assertion`);
  return {name,exitCode:result.status,expectedTest:expected,log:`${name}.log`};
}

function coveredSourceUnits(entry,names){
  const core=entry.functions.filter(f=>names.includes(f.functionName));
  if(core.length<names.length) throw Error(`coverage functions missing: ${names.filter(n=>!core.some(f=>f.functionName===n))}`);
  const all=entry.functions.flatMap(f=>f.ranges);
  let covered=0,total=0;
  for(const fn of core){
    const span=fn.ranges[0];
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
    unit:'V8 UTF-16 source offsets, including whitespace and comments',functions:names,
    exclusions:['parseCli','writeReport','CLI entrypoint']};
}

try{
  const coverageDir=path.join(temp,'coverage');
  const baseline=run(testFile,{NODE_V8_COVERAGE:coverageDir});
  fs.writeFileSync(path.join(output,'test.log'),baseline.stdout+baseline.stderr);
  if(baseline.status!==0) throw Error('baseline tests failed');
  const entries=fs.readdirSync(coverageDir).filter(file=>file.endsWith('.json'))
    .flatMap(file=>JSON.parse(fs.readFileSync(path.join(coverageDir,file),'utf8')).result);
  const entry=entries.find(x=>x.url===pathToFileURL(sourceFile).href);
  if(!entry) throw Error('V8 coverage entry absent');
  const coverage=coveredSourceUnits(entry,['blindLegalContext','planEyesBids','createEyesPolicy',
    'summarizeArm','comparePaired','gameRow','runExperiment']);
  const tempBaseline=temporarySuite('temp-baseline',fs.readFileSync(sourceFile,'utf8'));
  if(tempBaseline.status!==0) throw Error('unmutated temporary suite failed');
  const mutants=[
    mutant('mutant-ignore-second-bid',
      'const seen=previous?.items?.reduce((max,item)=>Number.isFinite(item.secondBid)?Math.max(max,item.secondBid):max,-Infinity);',
      'const seen=-Infinity;',
      'largest legal second bid changes the next bid, bounded to base plus two and cap'),
    mutant('mutant-ignore-third-preview','const reserve=futureBest>best?2:0;',
      'const reserve=0;',
      'third legal preview reserves two when its value exceeds tonight best'),
  ];
  const result={baseline:{exitCode:baseline.status,log:'test.log'},
    tempBaseline:{exitCode:tempBaseline.status,log:'temp-baseline.log'},coverage,mutants,
    sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex')};
  fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
  if(coverage.ratio<0.8) process.exitCode=1;
}finally{ fs.rmSync(temp,{recursive:true,force:true}); }

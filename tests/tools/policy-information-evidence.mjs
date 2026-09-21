import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if(!script) throw new Error('inline game script missing');
const testPath=path.join(root,'tests','policy-information.test.mjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yaoshi-policy-information-'));
const mutations=[
  {
    name:'eligibility-at-reveal',
    from:'if(!hasFlag(p,"publicSecondBid")) return null;',
    to:'if(!hasFlag(p,"publicSecondBid") && S.round>1) return null;',
  },
  {
    name:'hidden-bid-visibility',
    from:'showEntries:rv.showEntries,entries:r.entries',
    to:'showEntries:true,entries:r.entries',
  },
  {
    name:'preview-eye-exclusion',
    from:'collectEffects(p).filter(e=>e!==CHAINS.eyes)',
    to:'collectEffects(p)',
  },
];

function run(target,env={}){
  const child=spawnSync(process.execPath,['--test',testPath],{
    cwd:root,encoding:'utf8',env:{...process.env,...env,POLICY_INFORMATION_TARGET:target},
  });
  const output=child.stdout+child.stderr;
  const match=output.match(/ℹ fail (\d+)/);
  return {exitCode:child.status,failed:match?Number(match[1]):null,output};
}

function sourceCoverage(entry,name,start,end,delta){
  const begin=script.indexOf(start),finish=script.indexOf(end,begin+start.length);
  if(begin<0||finish<0) throw new Error(`coverage anchors missing: ${name}`);
  let covered=0,total=0;
  for(let i=begin;i<finish;i++){
    if(!script[i].trim()) continue;
    let match=null;
    for(const fn of entry.functions) for(const range of fn.ranges){
      if(range.startOffset<=i+delta && i+delta<range.endOffset &&
        (!match||range.endOffset-range.startOffset<match.endOffset-match.startOffset)) match=range;
    }
    total++;
    if(match?.count>0) covered++;
  }
  return {name,coveredSourceUnits:covered,totalSourceUnits:total,rate:covered/total};
}

try{
  const coverageDir=path.join(temp,'coverage');
  fs.mkdirSync(coverageDir);
  const baseline=run(path.join(root,'index.html'),{NODE_V8_COVERAGE:coverageDir});
  if(baseline.exitCode!==0) throw new Error(`baseline tests failed\n${baseline.output}`);
  const entries=fs.readdirSync(coverageDir).filter(f=>f.endsWith('.json'))
    .flatMap(f=>JSON.parse(fs.readFileSync(path.join(coverageDir,f),'utf8')).result);
  const entry=entries.find(e=>e.functions?.some(f=>f.functionName==='policyInformationContext'&&f.ranges[0].count>0));
  if(!entry) throw new Error('V8 did not report executed policy information core');
  const anchor=entry.functions.find(f=>f.functionName==='policyInformationContext');
  const delta=anchor.ranges[0].startOffset-script.indexOf('function policyInformationContext');
  const functions=[
    sourceCoverage(entry,'policyInformationContext','function policyInformationContext(p,previousReveal){','function policyPreviousReveal(p,reveal){',delta),
    sourceCoverage(entry,'policyPreviousReveal','function policyPreviousReveal(p,reveal){','/* 無頭跑一整局',delta),
  ];
  const covered=functions.reduce((n,f)=>n+f.coveredSourceUnits,0);
  const total=functions.reduce((n,f)=>n+f.totalSourceUnits,0);
  const coverage={method:'V8 innermost executed ranges, non-whitespace source units of new core helpers',functions,coveredSourceUnits:covered,totalSourceUnits:total,rate:covered/total};
  const results=[];
  for(const mutation of mutations){
    if(source.split(mutation.from).length!==2) throw new Error(`mutation anchor is not unique: ${mutation.name}`);
    const target=path.join(temp,`${mutation.name}.html`);
    fs.writeFileSync(target,source.replace(mutation.from,mutation.to));
    const result=run(target);
    results.push({name:mutation.name,killed:result.exitCode!==0,failedTests:result.failed});
    if(result.exitCode===0) throw new Error(`surviving mutation: ${mutation.name}`);
  }
  const evidence={target:'tests/policy-information.test.mjs',baseline:{exitCode:baseline.exitCode,failedTests:baseline.failed},coverage,mutations:results};
  const out=path.join(root,'docs','experiments','2026-09-21-l1e-information','engine-verification','mutation-results.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
  if(coverage.rate<0.8) throw new Error('new core coverage below 80%');
}finally{
  const relative=path.relative(os.tmpdir(),temp);
  if(!relative||relative.startsWith('..')||path.isAbsolute(relative)||relative.includes(path.sep)||!path.basename(temp).startsWith('yaoshi-policy-information-'))
    throw new Error(`unexpected temporary path: ${temp}`);
  fs.rmSync(temp,{recursive:true,force:true});
}

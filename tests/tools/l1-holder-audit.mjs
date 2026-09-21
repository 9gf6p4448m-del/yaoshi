import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const PILOT=path.join(ROOT,'docs/experiments/2026-09-21-l1e-measurement/pilot');
const DEFAULT_RAW=path.join(PILOT,'raw.jsonl');
const DEFAULT_OUT=path.join(ROOT,'docs/experiments/2026-09-21-l1e-protocol/holder-audit');
export const CHAIN_IDS=['water','eyes','twinTiger'];
export const ARMS=['splitter',...CHAIN_IDS.flatMap(id=>[`${id}-normal`,`${id}-zero`])];

export function parseRaw(raw){
  const lines=raw.split(/\r?\n/);
  if(lines.at(-1)==='') lines.pop();
  if(!lines.length) throw Error('empty raw');
  return lines.map((line,i)=>{
    if(!line.trim()) throw Error(`empty raw line ${i+1}`);
    try{return JSON.parse(line);}catch(error){throw Error(`JSON parse error at line ${i+1}: ${error.message}`);}
  });
}

function validateRows(rows){
  if(!Array.isArray(rows)||!rows.length) throw Error('empty rows');
  const byArm=new Map(ARMS.map(arm=>[arm,new Map()]));
  for(const [i,row] of rows.entries()){
    if(!row||typeof row!=='object'||!byArm.has(row.arm)) throw Error(`invalid arm at row ${i+1}`);
    if(!Number.isSafeInteger(row.seed)||row.seed<1||row.seed>0xffffffff) throw Error(`invalid seed at row ${i+1}`);
    if(!Number.isInteger(row.winnerId)||row.winnerId<0||row.winnerId>3) throw Error(`invalid winner at row ${i+1}`);
    if(!Array.isArray(row.endBagChainIds)||row.endBagChainIds.length!==4) throw Error(`expected four seats at row ${i+1}`);
    for(const bag of row.endBagChainIds){
      if(!Array.isArray(bag)) throw Error(`invalid chain bag at row ${i+1}`);
      const seen=new Set();
      for(const id of bag){
        if(!CHAIN_IDS.includes(id)) throw Error(`invalid chain at row ${i+1}`);
        if(seen.has(id)) throw Error(`duplicate chain at row ${i+1}`);
        seen.add(id);
      }
    }
    const seeds=byArm.get(row.arm);
    if(seeds.has(row.seed)) throw Error(`duplicate seed ${row.seed} in ${row.arm}`);
    seeds.set(row.seed,row);
  }
  const expected=[...byArm.get(ARMS[0]).keys()].sort((a,b)=>a-b);
  if(!expected.length) throw Error('empty seed set');
  for(const arm of ARMS){
    const actual=[...byArm.get(arm).keys()].sort((a,b)=>a-b);
    if(actual.length!==expected.length||actual.some((seed,i)=>seed!==expected[i])) throw Error(`seed set mismatch for ${arm}`);
  }
  return {byArm,seeds:expected};
}

function measure(rows,id){
  const holderCountDistribution=[0,0,0,0,0];
  let anyHolderGames=0,winnerHolderGames=0;
  for(const row of rows){
    const holders=row.endBagChainIds.map((bag,seat)=>bag.includes(id)?seat:null).filter(seat=>seat!==null);
    holderCountDistribution[holders.length]++;
    if(holders.length){
      anyHolderGames++;
      if(holders.includes(row.winnerId)) winnerHolderGames++;
    }
  }
  return {games:rows.length,anyHolderGames,winnerHolderGames,
    winnerHolderRate:anyHolderGames?winnerHolderGames/anyHolderGames:null,holderCountDistribution};
}

export function auditRows(rows,rawSha256){
  const {byArm,seeds}=validateRows(rows);
  const chains=Object.fromEntries(CHAIN_IDS.map(id=>{
    const normal=measure(byArm.get(`${id}-normal`).values(),id);
    const zero=measure(byArm.get(`${id}-zero`).values(),id);
    return [id,{normal,zero,differencePp:normal.winnerHolderRate===null||zero.winnerHolderRate===null?
      null:100*(normal.winnerHolderRate-zero.winnerHolderRate),differenceIsCausal:false}];
  }));
  return {design:'L1e endpoint-holder diagnostic',formalStatus:'incomplete',rawSha256,
    definition:'At playPolicyGame runner endpoint, any of four seats has full target recipe in end bag; numerator is winner among those endpoint holders.',
    limitation:'Raw has no ever-held history; this is not formal H9 or cross-night six-of-four. Normal and zero conditional denominators differ; difference is noncausal.',
    arms:ARMS,seeds,chains};
}

export function reportMarkdown(audit){
  const fmt=x=>x===null?'null':`${(100*x).toFixed(2)}%`;
  const lines=['# L1e endpoint-holder diagnostic','',`Formal status: ${audit.formalStatus}`,'',
    `Raw SHA256: ${audit.rawSha256}`,'',audit.definition,'',audit.limitation,'',
    '| Chain | Arm | Any-holder games | Winner-holder games | Conditional rate | Holders per game (0/1/2/3/4) |',
    '|---|---|---:|---:|---:|---|'];
  for(const id of CHAIN_IDS){
    for(const arm of ['normal','zero']){
      const m=audit.chains[id][arm];
      lines.push(`| ${id} | ${arm} | ${m.anyHolderGames} | ${m.winnerHolderGames} | ${fmt(m.winnerHolderRate)} | ${m.holderCountDistribution.join('/')} |`);
    }
  }
  lines.push('','| Chain | Normal − zero (pp; noncausal) |','|---|---:|');
  for(const id of CHAIN_IDS) lines.push(`| ${id} | ${audit.chains[id].differencePp??'null'} |`);
  return lines.join('\n')+'\n';
}

export function auditFile(rawPath=DEFAULT_RAW,outDir=DEFAULT_OUT){
  const source=path.resolve(rawPath),out=path.resolve(outDir);
  const relative=path.relative(PILOT,out);
  if(relative===''||(!relative.startsWith('..')&&!path.isAbsolute(relative))) throw Error('output cannot overwrite pilot directory');
  const raw=fs.readFileSync(source);
  const hash=crypto.createHash('sha256').update(raw).digest('hex');
  const audit=auditRows(parseRaw(raw.toString('utf8')),hash);
  const report=reportMarkdown(audit);
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(audit,null,2)+'\n');
  fs.writeFileSync(path.join(out,'report.md'),report);
  return out;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length>4) throw Error('usage: node tests/tools/l1-holder-audit.mjs [raw.jsonl] [output-directory]');
    console.log(auditFile(process.argv[2],process.argv[3]));
  }catch(error){console.error(error.message);process.exitCode=1;}
}

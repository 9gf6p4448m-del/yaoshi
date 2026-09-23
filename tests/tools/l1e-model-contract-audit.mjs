import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT=path.resolve(HERE,'../..');
const DEFAULT_CONTRACT='docs/experiments/2026-09-21-l1e-formal/model-contract.json';
const DEFAULT_ARMS='docs/experiments/2026-09-23-destiny/arms.json';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

function parseIndexEvidence(entry){
  const match=entry.match(/(?:^|\s)index\.html\s+([^:\s]+):(\d+)\b/);
  if(!match) return null;
  return {symbols:match[1].split('/').filter(Boolean),line:Number(match[2])};
}

function hasSymbol(source,symbol){
  const escaped=symbol.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(source);
}

function findReferences(contract,sourceText){
  const lines=sourceText.split(/\r?\n/);
  const checked=[];
  const missingSymbols=[];
  const staleLineHints=[];
  for(const item of contract.inventory){
    for(const entry of item?.existingEvidence??[]){
      const ref=parseIndexEvidence(entry);
      if(!ref) continue;
      for(const symbol of ref.symbols){
        const present=hasSymbol(sourceText,symbol);
        const lineText=lines[ref.line-1]??'';
        const atHint=lineText.includes(symbol);
        const row={inventoryId:item?.id??null,symbol,line:ref.line,present,atHint};
        checked.push(row);
        if(!present) missingSymbols.push(row);
        else if(!atHint) staleLineHints.push(row);
      }
    }
  }
  return {checked,missingSymbols,staleLineHints};
}

function validationErrors(contract,{sourceText,resolvedSourceCommit}){
  const errors=[];
  if(contract?.schema!=='yaoshi.l1e.sixOfFour.modelContract.v1')
    errors.push('unsupported model contract schema');
  if(!/^[a-f0-9]{7,40}$/i.test(contract?.sourceCommit??''))
    errors.push('sourceCommit must be a git commit id');
  if(resolvedSourceCommit&&contract?.sourceCommit&&
    !resolvedSourceCommit.startsWith(contract.sourceCommit.toLowerCase()))
    errors.push('resolved source commit does not match the contract sourceCommit');
  if(!Array.isArray(contract?.inventory)||contract.inventory.length===0)
    errors.push('inventory must be a non-empty array');
  if(!isRecord(contract?.scope)||!Array.isArray(contract.scope.chainIds))
    errors.push('scope.chainIds must be present');
  if(!isRecord(contract?.gate)) errors.push('gate must be present');
  if(typeof sourceText!=='string'||sourceText.length===0)
    errors.push('pinned index.html source is empty');

  const ids=new Set();
  for(const item of contract?.inventory??[]){
    if(!isRecord(item)||typeof item.id!=='string'||!item.id){
      errors.push('inventory item has no id');
      continue;
    }
    if(ids.has(item.id)) errors.push(`duplicate inventory id: ${item.id}`);
    ids.add(item.id);
    if(typeof item.implemented!=='boolean'&&item.implemented!=='partial')
      errors.push(`invalid implemented state for ${item.id}`);
    if(typeof item.missingAdapter!=='string'||!item.missingAdapter)
      errors.push(`missingAdapter detail absent for ${item.id}`);
    if(typeof item.nextAcceptance!=='string'||!item.nextAcceptance)
      errors.push(`nextAcceptance detail absent for ${item.id}`);
  }
  return errors;
}

export function auditContractData(contract,sourceBytes,metadata={}){
  const sourceBuffer=Buffer.isBuffer(sourceBytes)?sourceBytes:Buffer.from(sourceBytes??'');
  const sourceText=sourceBuffer.toString('utf8');
  const errors=validationErrors(contract,{sourceText,
    resolvedSourceCommit:metadata.resolvedSourceCommit});
  const sourceReferences=Array.isArray(contract?.inventory)?
    findReferences(contract,sourceText):{checked:[],missingSymbols:[],staleLineHints:[]};
  if(sourceReferences.missingSymbols.length){
    errors.push(`${sourceReferences.missingSymbols.length} source evidence symbol(s) absent from pinned index.html`);
  }

  const inventory=Array.isArray(contract?.inventory)?contract.inventory:[];
  const fullyImplemented=inventory.filter(item=>item?.implemented===true).length;
  const partiallyImplemented=inventory.filter(item=>item?.implemented==='partial').length;
  const missingAdapters=inventory.filter(item=>item?.implemented===false).length;
  const productChainIds=metadata.productScope?.chainIds??[];
  const contractChainIds=contract?.scope?.chainIds??[];
  const missingCurrentChainIds=productChainIds.filter(id=>!contractChainIds.includes(id));
  const destinyModes=metadata.productScope?.destinyModes??[];
  const destinyModesCovered=destinyModes.length>0&&
    destinyModes.every(mode=>(contract?.scope?.destinyModes??[]).includes(mode));

  const blockingReasons=[];
  if(missingAdapters||partiallyImplemented)
    blockingReasons.push(`adapter inventory has ${missingAdapters} missing and ${partiallyImplemented} partial item(s)`);
  if(contract?.nextEngineeringDeliverable?.implemented!==true)
    blockingReasons.push('runnable contract auditor/adapter verification is not declared complete');
  if(missingCurrentChainIds.length)
    blockingReasons.push(`model scope omits current chain(s): ${missingCurrentChainIds.join(', ')}`);
  if(destinyModes.length&&!destinyModesCovered)
    blockingReasons.push('model scope does not cover private destiny draws, effects, and information sets');
  if(contract?.gate?.sixOfFour!=='pass')
    blockingReasons.push(`contract gate is ${contract?.gate?.sixOfFour??'missing'}`);
  if(contract?.gate?.formalStatus!=='pass')
    blockingReasons.push(`formal status is ${contract?.gate?.formalStatus??'missing'}`);

  const unresolved=blockingReasons.length>0;
  const falsePass=unresolved&&(contract?.gate?.sixOfFour==='pass'||
    contract?.gate?.formalStatus==='pass'||contract?.gate?.releaseEligible===true||
    contract?.status==='pass'||contract?.implemented===true);
  if(falsePass) errors.push('unsupported pass claim while required adapters or model scope remain incomplete');

  return {
    schema:'yaoshi.l1e.modelContractAudit.v1',
    auditStatus:errors.length?'invalid':'valid',
    sixOfFour:'incomplete',
    releaseEligible:false,
    source:{commit:metadata.resolvedSourceCommit??contract?.sourceCommit??null,
      blobOid:metadata.sourceBlobOid??null,sha256:hash(sourceBuffer)},
    scope:{contractChainIds,productChainIds,missingCurrentChainIds,
      destinyModes,contractDestinyModes:contract?.scope?.destinyModes??[],destinyModesCovered},
    summary:{inventoryItems:inventory.length,fullyImplemented,partiallyImplemented,
      missingAdapters,sourceReferencesChecked:sourceReferences.checked.length,
      sourceSymbolsMissing:sourceReferences.missingSymbols.length,
      staleLineHints:sourceReferences.staleLineHints.length},
    inventory:inventory.map(item=>({id:item?.id??null,implemented:item?.implemented??null,
      adapterEvidence:[],missingAdapter:item?.missingAdapter??null,
      nextAcceptance:item?.nextAcceptance??null,blockingReason:item?.blockingReason??null})),
    sourceReferences,
    blockingReasons,
    violations:errors
  };
}

function git(repoRoot,args,encoding='utf8'){
  return execFileSync('git',args,{cwd:repoRoot,encoding,stdio:['ignore','pipe','pipe']});
}

export function auditRepository({repoRoot=DEFAULT_ROOT,contractPath,
  productArmsPath}={}){
  const contractFile=path.resolve(repoRoot,contractPath??path.join(repoRoot,DEFAULT_CONTRACT));
  const armsFile=path.resolve(repoRoot,productArmsPath??path.join(repoRoot,DEFAULT_ARMS));
  const contractBytes=fs.readFileSync(contractFile);
  const contract=JSON.parse(contractBytes.toString('utf8'));
  const arms=JSON.parse(fs.readFileSync(armsFile,'utf8'));
  if(!/^[a-f0-9]{7,40}$/i.test(contract?.sourceCommit??''))
    throw new Error('contract sourceCommit must be a git commit id');
  const commit=git(repoRoot,['rev-parse','--verify',`${contract.sourceCommit}^{commit}`]).trim();
  const sourceBytes=git(repoRoot,['show',`${commit}:index.html`],null);
  const sourceBlobOid=git(repoRoot,['rev-parse',`${commit}:index.html`]).trim();
  const currentSourceBytes=fs.readFileSync(path.join(repoRoot,'index.html'));
  const currentHead=git(repoRoot,['rev-parse','HEAD']).trim();
  const report=auditContractData(contract,sourceBytes,{resolvedSourceCommit:commit,
    sourceBlobOid,productScope:{chainIds:arms.chainIds,
      destinyModes:Object.keys(arms.destinyGame?.arms??{})}});
  report.contract={path:path.relative(repoRoot,contractFile).replaceAll(path.sep,'/'),
    sha256:hash(contractBytes)};
  report.currentProduct={head:currentHead,indexSha256:hash(currentSourceBytes)};
  report.source.sha256=hash(sourceBytes);
  return report;
}

function cliArgs(args){
  const out={requirePass:false};
  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(arg==='--require-pass'){out.requirePass=true;continue;}
    if(arg==='--help'||arg==='-h'){out.help=true;continue;}
    if(!['--repo','--contract','--product-arms'].includes(arg))
      throw new Error(`unknown argument: ${arg}`);
    const value=args[++i];
    if(!value) throw new Error(`missing value for ${arg}`);
    out[{ '--repo':'repoRoot','--contract':'contractPath','--product-arms':'productArmsPath'}[arg]]=value;
  }
  return out;
}

function main(){
  const args=cliArgs(process.argv.slice(2));
  if(args.help){
    process.stdout.write('Usage: node tests/tools/l1e-model-contract-audit.mjs [--repo PATH] [--contract PATH] [--product-arms PATH] [--require-pass]\n');
    return;
  }
  const result=auditRepository(args);
  process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
  if(result.auditStatus==='invalid') process.exitCode=1;
  else if(args.requirePass&&result.sixOfFour!=='pass') process.exitCode=2;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}
  catch(error){
    process.stderr.write(`Model contract audit failed closed: ${error.message}\n`);
    process.exitCode=1;
  }
}

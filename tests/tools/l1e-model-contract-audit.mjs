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
  if(typeof entry!=='string') return null;
  const match=entry.match(/(?:^|\s)index\.html\s+([^:\s]+):(\d+)\b/);
  if(!match) return null;
  return {symbols:match[1].split('/').filter(Boolean),line:Number(match[2])};
}

function hasSymbol(source,symbol){
  const escaped=symbol.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(source);
}

function findReferences(contract,sourceText,repoRoot){
  const lines=sourceText.split(/\r?\n/);
  const checked=[];
  const missingSymbols=[];
  const staleLineHints=[];
  const documentationReferences=[];
  const missingDocuments=[];
  const unrecognizedEvidence=[];
  for(const item of contract.inventory){
    const evidence=Array.isArray(item?.existingEvidence)?item.existingEvidence:[];
    for(const entry of evidence){
      if(typeof entry!=='string'){
        unrecognizedEvidence.push({inventoryId:item?.id??null,entry});
        continue;
      }
      const ref=parseIndexEvidence(entry);
      if(!ref){
        const doc=entry.match(/^((?:docs|tests)\/[A-Za-z0-9._/-]+\.(?:md|json|mjs|html))(?:\s|$)/);
        if(!doc){unrecognizedEvidence.push({inventoryId:item?.id??null,entry});continue;}
        let exists=null;
        if(repoRoot){
          const root=path.resolve(repoRoot);
          const absolute=path.resolve(root,doc[1]);
          const relative=path.relative(root,absolute);
          const contained=relative!==''&&!relative.startsWith(`..${path.sep}`)&&
            relative!=='..'&&!path.isAbsolute(relative);
          exists=contained&&fs.existsSync(absolute);
        }
        const row={inventoryId:item?.id??null,path:doc[1],exists};
        documentationReferences.push(row);
        if(exists===false) missingDocuments.push(row);
        continue;
      }
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
  return {checked,missingSymbols,staleLineHints,documentationReferences,
    missingDocuments,unrecognizedEvidence};
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
  else if(contract.scope.chainIds.some(id=>typeof id!=='string'||!id))
    errors.push('scope.chainIds must contain non-empty strings');
  else if(new Set(contract.scope.chainIds).size!==contract.scope.chainIds.length)
    errors.push('scope.chainIds must be unique');
  if(contract?.scope?.destinyModes!==undefined&&(!Array.isArray(contract.scope.destinyModes)||
    contract.scope.destinyModes.some(mode=>typeof mode!=='string'||!mode)||
    new Set(contract.scope.destinyModes).size!==contract.scope.destinyModes.length))
    errors.push('scope.destinyModes must be a unique string array');
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
    if(!Array.isArray(item.existingEvidence)||item.existingEvidence.length===0||
      item.existingEvidence.some(entry=>typeof entry!=='string'||!entry))
      errors.push(`existingEvidence must be a non-empty array of strings for ${item.id}`);
  }
  return errors;
}

export function auditContractData(contract,sourceBytes,metadata={}){
  const sourceBuffer=Buffer.isBuffer(sourceBytes)?sourceBytes:Buffer.from(sourceBytes??'');
  const sourceText=sourceBuffer.toString('utf8');
  const errors=validationErrors(contract,{sourceText,
    resolvedSourceCommit:metadata.resolvedSourceCommit});
  if(metadata.productScope!==undefined&&(!isRecord(metadata.productScope)||
    metadata.productScope.schema!=='yaoshi.destiny.acceptance.arms.v1'||
    !Array.isArray(metadata.productScope.chainIds)||metadata.productScope.chainIds.length===0||
    metadata.productScope.chainIds.some(id=>typeof id!=='string'||!id)||
    new Set(metadata.productScope.chainIds).size!==metadata.productScope.chainIds.length||
    !Array.isArray(metadata.productScope.destinyModes)||metadata.productScope.destinyModes.length===0||
    metadata.productScope.destinyModes.some(mode=>typeof mode!=='string'||!mode)||
    new Set(metadata.productScope.destinyModes).size!==metadata.productScope.destinyModes.length||
    typeof metadata.productScope.destinyDraw!=='string'||!metadata.productScope.destinyDraw))
    errors.push('productScope schema, non-empty chainIds, destinyModes, and destinyDraw are required');
  const sourceReferences=Array.isArray(contract?.inventory)?
    findReferences(contract,sourceText,metadata.repoRoot):{checked:[],missingSymbols:[],
      staleLineHints:[],documentationReferences:[],missingDocuments:[],unrecognizedEvidence:[]};
  if(sourceReferences.missingSymbols.length){
    errors.push(`${sourceReferences.missingSymbols.length} source evidence symbol(s) absent from pinned index.html`);
  }
  if(sourceReferences.missingDocuments.length)
    errors.push(`${sourceReferences.missingDocuments.length} documentation evidence path(s) are missing or outside the repository`);
  if(sourceReferences.unrecognizedEvidence.length)
    errors.push(`${sourceReferences.unrecognizedEvidence.length} existingEvidence reference(s) are unrecognized`);

  const inventory=Array.isArray(contract?.inventory)?contract.inventory:[];
  const fullyImplemented=inventory.filter(item=>item?.implemented===true).length;
  const partiallyImplemented=inventory.filter(item=>item?.implemented==='partial').length;
  const missingAdapters=inventory.filter(item=>item?.implemented===false).length;
  const productChainIds=Array.isArray(metadata.productScope?.chainIds)?metadata.productScope.chainIds:[];
  const contractChainIds=contract?.scope?.chainIds??[];
  const missingCurrentChainIds=productChainIds.filter(id=>!contractChainIds.includes(id));
  const destinyModes=Array.isArray(metadata.productScope?.destinyModes)?metadata.productScope.destinyModes:[];
  const contractDestinyModes=Array.isArray(contract?.scope?.destinyModes)?contract.scope.destinyModes:[];
  const destinyModesCovered=destinyModes.length>0&&contractDestinyModes.length>0&&
    destinyModes.every(mode=>contractDestinyModes.includes(mode));

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
  const passClaim=contract?.gate?.sixOfFour==='pass'||
    contract?.gate?.formalStatus==='pass'||contract?.gate?.releaseEligible===true||
    contract?.status==='pass'||contract?.implemented===true;
  if(passClaim) errors.push('unsupported pass claim: this inventory auditor does not verify exhaustive solver evidence');

  return {
    schema:'yaoshi.l1e.modelContractAudit.v1',
    auditStatus:errors.length?'invalid':'valid',
    sixOfFour:'incomplete',
    releaseEligible:false,
    auditor:{capability:'contract-inventory-only',adapterFixturesExecuted:false,
      solverEvidenceValidated:false,supportedVerdict:'incomplete'},
    source:{commit:metadata.resolvedSourceCommit??contract?.sourceCommit??null,
      blobOid:metadata.sourceBlobOid??null,sha256:hash(sourceBuffer)},
    scope:{contractChainIds,productChainIds,missingCurrentChainIds,
      destinyModes,contractDestinyModes,destinyModesCovered},
    summary:{inventoryItems:inventory.length,fullyImplemented,partiallyImplemented,
      missingAdapters,sourceReferencesChecked:sourceReferences.checked.length,
      documentationReferences:sourceReferences.documentationReferences.length,
      sourceSymbolsMissing:sourceReferences.missingSymbols.length,
      missingDocuments:sourceReferences.missingDocuments.length,
      unrecognizedEvidence:sourceReferences.unrecognizedEvidence.length,
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
    sourceBlobOid,repoRoot,productScope:{schema:arms.schema,chainIds:arms.chainIds,
      destinyModes:Object.keys(arms.destinyGame?.arms??{}),
      destinyDraw:arms.destinyGame?.destinyDraw}});
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

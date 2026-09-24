import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT=path.resolve(HERE,'../..');
const DEFAULT_CONTRACT='docs/experiments/2026-09-21-l1e-formal/model-contract.json';
const DEFAULT_ARMS='docs/experiments/2026-09-23-destiny/arms.json';
const REQUIRED_CHAIN_IDS=Object.freeze(['water','eyes','twinTiger','bloodOath','godKing','eternalFlame']);
const REQUIRED_DESTINY_MODES=Object.freeze(['ordinary-ai-off','original-ai-off','candidate-ai-off',
  'ordinary-ai-on','original-ai-on','candidate-ai-on']);
const REQUIRED_DESTINY_DRAW='four independent secure private draws per seed, recorded once and reused across all six arms; never derived from public game seed';
const EXPECTED_CONTRACT_CANONICAL_SHA256='a2a5bbf07bc46d2330ad4a8b7a2e4296bddda5231f0b1df9227faf6e43af92c3';
const EXPECTED_ARMS_CANONICAL_SHA256='d84ea77460a5d7fc3d1aabb2b5eb1118fd5316e40d90932e9114bb02d10110a4';
const EXPECTED_SOURCE_COMMIT='cb64f4ef1cc7c128d28d3f928e832624e4889596';
const EXPECTED_SOURCE_SHA256='13b0bf220588f8bbca6f2c7352f0e9125894cb8c271225f79f347019880af5b9';
const EXPECTED_SOURCE_BLOB_OID='f18a2ffc9770115db8cd60fefbb45726176b9874';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

function canonicalJson(value,ancestors=new Set()){
  if(value===null) return 'null';
  if(typeof value==='string'||typeof value==='boolean') return JSON.stringify(value);
  if(typeof value==='number'){
    if(!Number.isFinite(value)) throw new TypeError('canonical JSON requires finite numbers');
    return Object.is(value,-0)?'-0':JSON.stringify(value);
  }
  if(Array.isArray(value)){
    if(Object.getPrototypeOf(value)!==Array.prototype||
      Reflect.ownKeys(value).length!==value.length+1)
      throw new TypeError('canonical JSON requires plain dense arrays');
    if(ancestors.has(value)) throw new TypeError('canonical JSON cannot contain cycles');
    ancestors.add(value);
    const values=[];
    for(let i=0;i<value.length;i++){
      if(!Object.hasOwn(value,i)) throw new TypeError('canonical JSON cannot contain sparse arrays');
      const descriptor=Object.getOwnPropertyDescriptor(value,String(i));
      if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))
        throw new TypeError('canonical JSON requires plain array data');
      values.push(canonicalJson(descriptor.value,ancestors));
    }
    ancestors.delete(value);
    return `[${values.join(',')}]`;
  }
  if(value&&typeof value==='object'){
    const prototype=Object.getPrototypeOf(value);
    if(prototype!==Object.prototype&&prototype!==null)
      throw new TypeError('canonical JSON requires plain objects');
    if(ancestors.has(value)) throw new TypeError('canonical JSON cannot contain cycles');
    ancestors.add(value);
    const keys=Reflect.ownKeys(value);
    if(keys.some(key=>typeof key!=='string'))
      throw new TypeError('canonical JSON cannot contain symbol keys');
    const values=keys.sort().map(key=>{
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))
        throw new TypeError('canonical JSON requires plain data properties');
      return `${JSON.stringify(key)}:${canonicalJson(descriptor.value,ancestors)}`;
    });
    ancestors.delete(value);
    return `{${values.join(',')}}`;
  }
  throw new TypeError('value is not JSON-compatible');
}

function canonicalJsonHash(value){
  return canonicalJsonSnapshot(value).sha256;
}

function canonicalJsonSnapshot(value){
  try{
    const serialized=canonicalJson(value);
    if(typeof serialized!=='string') return {valid:false,value:null,sha256:null};
    return {valid:true,value:JSON.parse(serialized),
      sha256:hash(Buffer.from(serialized,'utf8'))};
  }catch{return {valid:false,value:null,sha256:null};}
}

function gitBlobOid(bytes){
  const header=Buffer.from(`blob ${bytes.length}\0`,'utf8');
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
}

function isContainedPath(root,target){
  const relative=path.relative(root,target);
  return relative!==''&&relative!=='..'&&!relative.startsWith(`..${path.sep}`)&&
    !path.isAbsolute(relative);
}

function parseIndexEvidence(entry){
  if(typeof entry!=='string') return null;
  const match=entry.match(/(?:^|\s)index\.html\s+([^:\s]+):(\d+)\b/);
  if(!match) return null;
  const symbols=match[1].split('/');
  const line=Number(match[2]);
  if(!symbols.length||symbols.some(symbol=>!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(symbol))||
    !Number.isSafeInteger(line)||line<1) return null;
  return {symbols,line};
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
          if(isContainedPath(root,absolute)){
            try{
              const realRoot=fs.realpathSync(root);
              const realDocument=fs.realpathSync(absolute);
              exists=isContainedPath(realRoot,realDocument)&&fs.statSync(realDocument).isFile();
            }catch{exists=false;}
          }else exists=false;
        }
        const row={inventoryId:item?.id??null,path:doc[1],exists};
        documentationReferences.push(row);
        if(exists===false) missingDocuments.push(row);
        continue;
      }
      if(ref.line>lines.length){
        unrecognizedEvidence.push({inventoryId:item?.id??null,entry});
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
  if(resolvedSourceCommit!==undefined){
    if(typeof resolvedSourceCommit!=='string'||!/^([a-f0-9]{40})$/i.test(resolvedSourceCommit))
      errors.push('resolved source commit must be a full git commit id');
    else if(resolvedSourceCommit.toLowerCase()!==EXPECTED_SOURCE_COMMIT)
      errors.push('resolved source commit does not match the pinned source commit');
  }
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
  const contractSnapshot=canonicalJsonSnapshot(contract);
  const metadataSnapshot=canonicalJsonSnapshot(metadata);
  contract=contractSnapshot.valid?contractSnapshot.value:null;
  const metadataValid=metadataSnapshot.valid&&isRecord(metadataSnapshot.value);
  metadata=metadataValid?metadataSnapshot.value:{};
  const sourceBuffer=Buffer.from(sourceBytes??'');
  const sourceText=sourceBuffer.toString('utf8');
  const sourceSha256=hash(sourceBuffer);
  const sourceBlobOid=gitBlobOid(sourceBuffer);
  const sourceIntegrityVerified=sourceSha256===EXPECTED_SOURCE_SHA256&&
    sourceBlobOid===EXPECTED_SOURCE_BLOB_OID;
  const contractCanonicalSha256=contractSnapshot.sha256;
  const contractIntegrityVerified=contractSnapshot.valid&&
    contractCanonicalSha256===EXPECTED_CONTRACT_CANONICAL_SHA256;
  const productArms=metadata.productArms;
  const productArmsCanonicalSha256=canonicalJsonHash(productArms);
  const destinyArms=productArms?.destinyGame?.arms;
  const productScope=isRecord(productArms)?{
    schema:productArms.schema,
    chainIds:productArms.chainIds,
    destinyModes:isRecord(destinyArms)?Object.keys(destinyArms):[],
    destinyDraw:productArms?.destinyGame?.destinyDraw,
    manifestSha256:productArmsCanonicalSha256
  }:null;
  const errors=validationErrors(contract,{sourceText,
    resolvedSourceCommit:metadata.resolvedSourceCommit});
  if(!contractSnapshot.valid)
    errors.push('model contract is not valid canonical JSON data');
  if(!metadataValid)
    errors.push('audit metadata is not valid canonical JSON object data');
  if(!contractIntegrityVerified)
    errors.push('model contract does not match its pinned semantic hash');
  if(metadata.contractCanonicalSha256!==undefined&&
    metadata.contractCanonicalSha256!==contractCanonicalSha256)
    errors.push('contract hash metadata does not match the supplied contract content');
  if(metadata.productScope!==undefined)
    errors.push('productScope projections are not accepted; pass the complete productArms object');
  if(!sourceIntegrityVerified)
    errors.push('pinned index.html content does not match its expected SHA256 and Git blob');
  if(metadata.sourceBlobOid!==undefined&&metadata.sourceBlobOid!==sourceBlobOid)
    errors.push('source blob metadata does not match the supplied source bytes');
  const productScopeShapeValid=isRecord(productScope)&&
    productScope.schema==='yaoshi.destiny.acceptance.arms.v1'&&
    Array.isArray(productScope.chainIds)&&productScope.chainIds.length>0&&
    productScope.chainIds.every(id=>typeof id==='string'&&id.length>0)&&
    new Set(productScope.chainIds).size===productScope.chainIds.length&&
    Array.isArray(productScope.destinyModes)&&productScope.destinyModes.length>0&&
    productScope.destinyModes.every(mode=>typeof mode==='string'&&mode.length>0)&&
    new Set(productScope.destinyModes).size===productScope.destinyModes.length&&
    typeof productScope.destinyDraw==='string'&&productScope.destinyDraw.length>0&&
    /^[a-f0-9]{64}$/i.test(productScope.manifestSha256??'');
  if(!productScopeShapeValid)
    errors.push('productArms schema, non-empty chainIds, destiny modes, private destinyDraw, and parseable JSON are required');
  const productScopeMatchesFull=productScopeShapeValid&&
    productScope.chainIds.length===REQUIRED_CHAIN_IDS.length&&
    REQUIRED_CHAIN_IDS.every(id=>productScope.chainIds.includes(id))&&
    productScope.destinyModes.length===REQUIRED_DESTINY_MODES.length&&
    REQUIRED_DESTINY_MODES.every(mode=>productScope.destinyModes.includes(mode))&&
    productScope.destinyDraw===REQUIRED_DESTINY_DRAW&&
    productScope.manifestSha256===EXPECTED_ARMS_CANONICAL_SHA256;
  if(productScopeShapeValid&&!productScopeMatchesFull)
    errors.push('productArms must match the frozen full required product set, private draw declaration, and arms manifest hash');
  const sourceReferences=Array.isArray(contract?.inventory)?
    findReferences(contract,sourceText,metadata.repoRoot):{checked:[],missingSymbols:[],
      staleLineHints:[],documentationReferences:[],missingDocuments:[],unrecognizedEvidence:[]};
  if(sourceReferences.missingSymbols.length){
    errors.push(`${sourceReferences.missingSymbols.length} source evidence symbol(s) absent from pinned index.html`);
  }
  if(sourceReferences.missingDocuments.length)
    errors.push(`${sourceReferences.missingDocuments.length} documentation evidence path(s) are missing or outside the repository`);
  if(sourceReferences.documentationReferences.some(row=>row.exists===null))
    errors.push('repoRoot is required to verify documentation evidence paths');
  if(sourceReferences.unrecognizedEvidence.length)
    errors.push(`${sourceReferences.unrecognizedEvidence.length} existingEvidence reference(s) are unrecognized`);

  const inventory=Array.isArray(contract?.inventory)?contract.inventory:[];
  const fullyImplemented=inventory.filter(item=>item?.implemented===true).length;
  const partiallyImplemented=inventory.filter(item=>item?.implemented==='partial').length;
  const missingAdapters=inventory.filter(item=>item?.implemented===false).length;
  const productChainIds=Array.isArray(productScope?.chainIds)?productScope.chainIds:[];
  const contractChainIds=Array.isArray(contract?.scope?.chainIds)?contract.scope.chainIds:[];
  const missingCurrentChainIds=REQUIRED_CHAIN_IDS.filter(id=>!contractIntegrityVerified||
    !contractChainIds.includes(id));
  const destinyModes=Array.isArray(productScope?.destinyModes)?productScope.destinyModes:[];
  const contractDestinyModes=Array.isArray(contract?.scope?.destinyModes)?contract.scope.destinyModes:[];
  const destinyModesCovered=contractIntegrityVerified&&productScopeMatchesFull&&contractDestinyModes.length>0&&
    REQUIRED_DESTINY_MODES.every(mode=>contractDestinyModes.includes(mode));

  const blockingReasons=[];
  if(missingAdapters||partiallyImplemented)
    blockingReasons.push(`adapter inventory has ${missingAdapters} missing and ${partiallyImplemented} partial item(s)`);
  if(contract?.nextEngineeringDeliverable?.implemented!==true)
    blockingReasons.push('runnable contract auditor/adapter verification is not declared complete');
  if(!contractIntegrityVerified)
    blockingReasons.push('model contract content does not match the pinned frozen contract');
  if(missingCurrentChainIds.length)
    blockingReasons.push(`model scope omits current chain(s): ${missingCurrentChainIds.join(', ')}`);
  if(!productScopeMatchesFull)
    blockingReasons.push('product scope does not match the independently pinned full product scope');
  if(!destinyModesCovered)
    blockingReasons.push('model scope does not cover private destiny draws, effects, and information sets');
  if(contract?.gate?.sixOfFour!=='pass')
    blockingReasons.push(`contract gate is ${contract?.gate?.sixOfFour??'missing'}`);
  if(contract?.gate?.formalStatus!=='pass')
    blockingReasons.push(`formal status is ${contract?.gate?.formalStatus??'missing'}`);

  const passClaim=contract?.gate?.sixOfFour==='pass'||
    contract?.gate?.formalStatus==='pass'||contract?.gate?.releaseEligible===true||
    contract?.status==='pass'||contract?.implemented===true;
  if(passClaim) errors.push('unsupported pass claim: this inventory auditor does not verify exhaustive solver evidence');
  const resolvedCommitVerified=typeof metadata.resolvedSourceCommit==='string'&&
    metadata.resolvedSourceCommit.toLowerCase()===EXPECTED_SOURCE_COMMIT;
  const sourceCommit=metadata.resolvedSourceCommit===undefined?
    contract?.sourceCommit??null:resolvedCommitVerified?metadata.resolvedSourceCommit.toLowerCase():null;

  return {
    schema:'yaoshi.l1e.modelContractAudit.v1',
    auditStatus:errors.length?'invalid':'valid',
    sixOfFour:'incomplete',
    releaseEligible:false,
    auditor:{capability:'contract-inventory-only',adapterFixturesExecuted:false,
      solverEvidenceValidated:false,supportedVerdict:'incomplete'},
    integrity:{modelContract:contractIntegrityVerified,productArms:productScopeMatchesFull,
      source:sourceIntegrityVerified},
    source:{commit:sourceCommit,commitVerified:resolvedCommitVerified,
      blobOid:sourceBlobOid,sha256:sourceSha256,integrityVerified:sourceIntegrityVerified},
    scope:{contractChainIds,productChainIds,requiredChainIds:[...REQUIRED_CHAIN_IDS],
      missingCurrentChainIds,destinyModes,requiredDestinyModes:[...REQUIRED_DESTINY_MODES],
      contractDestinyModes,contractIntegrityVerified,
      productScopeIntegrityVerified:productScopeMatchesFull,
      destinyModesCovered},
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
  const armsBytes=fs.readFileSync(armsFile);
  const arms=JSON.parse(armsBytes.toString('utf8'));
  const contractCanonicalSha256=canonicalJsonHash(contract);
  const armsCanonicalSha256=canonicalJsonHash(arms);
  if(!/^[a-f0-9]{7,40}$/i.test(contract?.sourceCommit??''))
    throw new Error('contract sourceCommit must be a git commit id');
  const commit=git(repoRoot,['rev-parse','--verify',`${contract.sourceCommit}^{commit}`]).trim();
  const sourceBytes=git(repoRoot,['show',`${commit}:index.html`],null);
  const sourceBlobOid=git(repoRoot,['rev-parse',`${commit}:index.html`]).trim();
  const currentSourceBytes=fs.readFileSync(path.join(repoRoot,'index.html'));
  const currentHead=git(repoRoot,['rev-parse','HEAD']).trim();
  const report=auditContractData(contract,sourceBytes,{resolvedSourceCommit:commit,
    sourceBlobOid,repoRoot,contractCanonicalSha256,productArms:arms});
  report.contract={path:path.relative(repoRoot,contractFile).replaceAll(path.sep,'/'),
    sha256:hash(contractBytes),canonicalSha256:contractCanonicalSha256,
    integrityVerified:report.integrity.modelContract};
  report.productArms={path:path.relative(repoRoot,armsFile).replaceAll(path.sep,'/'),
    sha256:hash(armsBytes),canonicalSha256:armsCanonicalSha256,
    integrityVerified:report.integrity.productArms};
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

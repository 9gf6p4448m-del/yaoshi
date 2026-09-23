import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditContractData,auditRepository} from './tools/l1e-model-contract-audit.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CONTRACT_PATH=path.join(ROOT,'docs/experiments/2026-09-21-l1e-formal/model-contract.json');
const ARMS_PATH=path.join(ROOT,'docs/experiments/2026-09-23-destiny/arms.json');
const contract=JSON.parse(fs.readFileSync(CONTRACT_PATH,'utf8'));
const productArms=JSON.parse(fs.readFileSync(ARMS_PATH,'utf8'));
const frozenSource=execFileSync('git',['show',`${contract.sourceCommit}:index.html`],{cwd:ROOT});
const sourceBlobOid=execFileSync('git',['rev-parse',`${contract.sourceCommit}:index.html`],
  {cwd:ROOT,encoding:'utf8'}).trim();
const productScope={chainIds:productArms.chainIds,
  destinyModes:Object.keys(productArms.destinyGame.arms)};

test('audits frozen source references and exposes legacy-scope and missing-adapter gaps',()=>{
  const result=auditContractData(contract,frozenSource,{sourceBlobOid,productScope});
  assert.equal(result.auditStatus,'valid');
  assert.equal(result.sixOfFour,'incomplete');
  assert.equal(result.releaseEligible,false);
  assert.equal(result.source.commit,contract.sourceCommit);
  assert.match(result.source.sha256,/^[0-9a-f]{64}$/);
  assert.deepEqual(result.scope.missingCurrentChainIds,['bloodOath','godKing','eternalFlame']);
  assert.equal(result.scope.destinyModesCovered,false);
  assert.equal(result.summary.inventoryItems,10);
  assert.equal(result.summary.fullyImplemented,0);
  assert.equal(result.summary.partiallyImplemented,1);
  assert.equal(result.summary.missingAdapters,9);
  assert.equal(result.sourceReferences.missingSymbols.length,0);
  assert.ok(result.blockingReasons.some(reason=>reason.includes('private destiny')));
});

test('rejects duplicate inventory ids instead of silently overwriting coverage',()=>{
  const duplicate=structuredClone(contract);
  duplicate.inventory.push(structuredClone(duplicate.inventory[0]));
  const result=auditContractData(duplicate,frozenSource,{sourceBlobOid,productScope});
  assert.equal(result.auditStatus,'invalid');
  assert.ok(result.violations.some(message=>message.includes('duplicate inventory id')));
});

test('rejects a pass claim while required adapters and payoff mappings remain missing',()=>{
  const falsePass=structuredClone(contract);
  falsePass.status='pass';
  falsePass.implemented=true;
  falsePass.gate.sixOfFour='pass';
  falsePass.gate.formalStatus='pass';
  falsePass.gate.releaseEligible=true;
  const result=auditContractData(falsePass,frozenSource,{sourceBlobOid,productScope});
  assert.equal(result.auditStatus,'invalid');
  assert.equal(result.sixOfFour,'incomplete');
  assert.equal(result.releaseEligible,false);
  assert.ok(result.violations.some(message=>message.includes('unsupported pass claim')));
});

test('rejects source evidence symbols absent from the pinned source',()=>{
  const stale=structuredClone(contract);
  stale.inventory[0].existingEvidence.push('index.html neverImplementedAdapter:1 stale reference');
  const result=auditContractData(stale,frozenSource,{sourceBlobOid,productScope});
  assert.equal(result.auditStatus,'invalid');
  assert.ok(result.sourceReferences.missingSymbols.some(ref=>ref.symbol==='neverImplementedAdapter'));
});

test('reports malformed rows and incomplete provenance without throwing',()=>{
  const malformed={schema:'wrong',sourceCommit:'not-a-commit',inventory:[null,
    {id:'bad-item',implemented:'unknown',missingAdapter:'',nextAcceptance:''}],scope:{},gate:null};
  const result=auditContractData(malformed,Buffer.alloc(0),{resolvedSourceCommit:'1234567'});
  assert.equal(result.auditStatus,'invalid');
  assert.ok(result.violations.some(message=>message.includes('unsupported model contract schema')));
  assert.ok(result.violations.some(message=>message.includes('sourceCommit must be a git commit id')));
  assert.ok(result.violations.some(message=>message.includes('resolved source commit')));
  assert.ok(result.violations.some(message=>message.includes('inventory item has no id')));
  assert.ok(result.violations.some(message=>message.includes('pinned index.html source is empty')));
});

test('recognizes a complete scope declaration without treating it as a solver result',()=>{
  const expanded=structuredClone(contract);
  expanded.scope.chainIds=[...productScope.chainIds];
  expanded.scope.destinyModes=[...productScope.destinyModes];
  const result=auditContractData(expanded,frozenSource,{sourceBlobOid,productScope});
  assert.deepEqual(result.scope.missingCurrentChainIds,[]);
  assert.equal(result.scope.destinyModesCovered,true);
  assert.equal(result.sixOfFour,'incomplete');
  assert.equal(result.releaseEligible,false);
});

test('loads the frozen git source, hashes it, and keeps the release gate closed',()=>{
  const result=auditRepository({repoRoot:ROOT});
  assert.equal(result.auditStatus,'valid');
  assert.equal(result.source.commit,execFileSync('git',['rev-parse',`${contract.sourceCommit}^{commit}`],
    {cwd:ROOT,encoding:'utf8'}).trim());
  assert.equal(result.source.blobOid,sourceBlobOid);
  assert.equal(result.currentProduct.indexSha256,
    crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'index.html'))).digest('hex'));
  assert.equal(result.sixOfFour,'incomplete');
  assert.equal(result.releaseEligible,false);
});

test('CLI reports incomplete successfully and fails the explicit require-pass gate',()=>{
  const tool=path.join(ROOT,'tests/tools/l1e-model-contract-audit.mjs');
  const audit=spawnSync(process.execPath,[tool],{cwd:ROOT,encoding:'utf8'});
  assert.equal(audit.status,0,audit.stderr);
  assert.equal(JSON.parse(audit.stdout).sixOfFour,'incomplete');
  const strict=spawnSync(process.execPath,[tool,'--require-pass'],{cwd:ROOT,encoding:'utf8'});
  assert.equal(strict.status,2,strict.stderr);
  assert.equal(JSON.parse(strict.stdout).releaseEligible,false);
  const help=spawnSync(process.execPath,[tool,'--help'],{cwd:ROOT,encoding:'utf8'});
  assert.equal(help.status,0);
  assert.match(help.stdout,/--require-pass/);
  const explicit=spawnSync(process.execPath,[tool,'--repo',ROOT,'--contract',CONTRACT_PATH,
    '--product-arms',ARMS_PATH],{cwd:ROOT,encoding:'utf8'});
  assert.equal(explicit.status,0,explicit.stderr);
  assert.equal(JSON.parse(explicit.stdout).scope.missingCurrentChainIds.length,3);
  const unknown=spawnSync(process.execPath,[tool,'--unknown'],{cwd:ROOT,encoding:'utf8'});
  assert.equal(unknown.status,1);
  assert.match(unknown.stderr,/unknown argument/);
  const missingValue=spawnSync(process.execPath,[tool,'--contract'],{cwd:ROOT,encoding:'utf8'});
  assert.equal(missingValue.status,1);
  assert.match(missingValue.stderr,/missing value/);
});

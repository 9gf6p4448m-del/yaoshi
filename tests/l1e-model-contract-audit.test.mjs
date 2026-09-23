import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditContractData} from './tools/l1e-model-contract-audit.mjs';

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

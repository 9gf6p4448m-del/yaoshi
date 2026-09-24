import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {captureProvenance} from './tools/l1-destiny-formal.mjs';
import {currentValidationProvenance} from './tools/l1-destiny-historical.mjs';

test('committed raw keeps historical HEAD while current byte hashes are checked',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yaoshi-destiny-history-'));
  try{
    const paths=Object.fromEntries(['product','runner','acceptance','config'].map(name=>{
      const file=path.join(temp,`${name}.txt`);fs.writeFileSync(file,name);return [name,file];
    }));
    const current=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
    const parent=execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim();
    const provenance=captureProvenance(paths,{cfg:{ROUNDS:12},
      policyVersions:{seat0:'original-scriptedBids'},seeds:[10001]});
    const historical={...provenance,gitHead:parent};
    assert.equal(currentValidationProvenance(historical,paths).gitHead,current);
    assert.equal(historical.gitHead,parent);
    assert.throws(()=>currentValidationProvenance({...historical,gitHead:'0'.repeat(40)},paths),
      /not an ancestor/i);
    fs.writeFileSync(paths.product,'changed product');
    assert.throws(()=>currentValidationProvenance(historical,paths),/changed code or contract hash/i);
  }finally{fs.rmSync(temp,{recursive:true,force:true,maxRetries:100,retryDelay:100});}
});

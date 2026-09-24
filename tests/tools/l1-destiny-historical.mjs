import {execFileSync} from 'node:child_process';
import {verifyProvenance} from './l1-destiny-formal.mjs';

const ROOT=new URL('../..',import.meta.url);
const SHA=/^[0-9a-f]{40}$/;

/* A formal arm can be committed after measurement without changing the bytes
   that produced it. The raw keeps its original HEAD; this read-only adapter
   verifies ancestry and every current source hash before validating copies. */
export function currentValidationProvenance(original,paths){
  if(!original||!SHA.test(original.gitHead||''))
    throw Error('invalid historical Git HEAD');
  const cwd=new URL(ROOT);
  const current=execFileSync('git',['rev-parse','HEAD'],{cwd,encoding:'utf8'}).trim();
  try{
    execFileSync('git',['merge-base','--is-ancestor',original.gitHead,current],
      {cwd,stdio:'ignore'});
  }catch{throw Error('raw Git HEAD is not an ancestor of current HEAD');}
  const currentRecord={...original,gitHead:current};
  verifyProvenance(currentRecord,paths);
  return currentRecord;
}

/* trace-eq --beats：兩個參數同名（都叫 index.html）不得互相覆寫暫存檔（2026-10-10 F2，凍結檔 docs/experiments/2026-10-10-duel-side-findings/acceptance.md D3）。
   跑的是真實腳本（spawn node），兩份 index.html 放在不同暫存子目錄、檔名相同。 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const TOOL=fileURLToPath(new URL('./tools/trace-eq.mjs',import.meta.url));
const SRC=fileURLToPath(new URL('../index.html',import.meta.url));

function samename(mutate){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'trace-eq-samename-'));
  const a=path.join(root,'a','index.html'), b=path.join(root,'b','index.html');
  fs.mkdirSync(path.dirname(a)); fs.mkdirSync(path.dirname(b));
  const txt=fs.readFileSync(SRC,'utf8');
  fs.writeFileSync(a,txt,'utf8');
  /* 不同內容：只改一個引擎常數（同 --mutate 的突變），拍序列必然不同 */
  const m=txt.match(/ROUNDS\s*:\s*(\d+)/);
  assert.ok(m,'找不到 CFG.ROUNDS');
  fs.writeFileSync(b,mutate?txt.replace(/ROUNDS\s*:\s*\d+/,'ROUNDS: '+(Number(m[1])-1)):txt,'utf8');
  try{
    const r=spawnSync(process.execPath,[TOOL,a,b,'--beats'],{encoding:'utf8',maxBuffer:1<<26});
    const line=(r.stdout||'').split(/\r?\n/).find(l=>l.startsWith('{"mode":"beats"'));
    assert.ok(line,`腳本沒印出 beats 結果：${r.stdout}\n${r.stderr}`);
    return {code:r.status,out:JSON.parse(line)};
  }finally{ fs.rmSync(root,{recursive:true,force:true}); }
}

test('F2 --beats：同名不同內容的兩份 index.html 判不等（exit 1）',()=>{
  const {code,out}=samename(true);
  assert.equal(out.injected,true,`注入沒生效：${JSON.stringify(out)}`);
  assert.equal(out.equal,false,`同名不同內容卻判相等（暫存檔互相覆寫）：${JSON.stringify(out)}`);
  assert.equal(code,1);
});

test('F2 --beats：同名同內容判相等（exit 0，健康方向）',()=>{
  const {code,out}=samename(false);
  assert.equal(out.injected,true);
  assert.equal(out.equal,true,JSON.stringify(out));
  assert.equal(code,0);
});

/* 角色說明文字的「起始 N」必須等於引擎實算的起始壽命（roleLife0＝CFG.LIFE＋life0d）。
   跑法：node --test tests/role-desc-life.test.mjs；對舊版：YAOSHI_HTML=old.html node --test tests/role-desc-life.test.mjs
   純讀取：只從 window.__yaoshi 取 CFG／ROLES，不改任何東西。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const TARGET=process.env.YAOSHI_HTML||path.join(HERE,'..','index.html');
function loadGame(htmlPath){
  const html=fs.readFileSync(htmlPath,'utf8');
  const code=html.match(/<script>[\s\S]*?<\/script>/)[0].replace('<script>','').replace('</script>','');
  const stub=`
  const location={search:''};
  const localStorage={getItem(){return null;},setItem(){}};
  const document={getElementById:()=>null,addEventListener:()=>{},querySelectorAll:()=>[],
    title:'',documentElement:{style:{}},body:{style:{},cssText:'',innerHTML:''}};
  const window={};
  `;
  return new Function('URLSearchParams',stub+code+'\nreturn window.__yaoshi;')(URLSearchParams);
}
const G=loadGame(TARGET);
const {CFG,ROLES}=G;
const actual=R=>CFG.LIFE+(R.life0d||0); // 與 index.html roleLife0 同式（roleLife0 不在公開出口）

const withDesc=Object.values(ROLES).filter(R=>R.desc&&/起始\s*\d+/.test(R.desc));

test('至少有角色在說明裡寫了起始壽命（防掃描恆空）', ()=>{
  assert.ok(withDesc.length>=4, `只掃到 ${withDesc.length} 個`);
});
for(const R of withDesc){
  test(`${R.id} desc 的起始壽命＝實算值`, ()=>{
    const n=Number(R.desc.match(/起始\s*(\d+)/)[1]);
    console.log(`    ${R.id}: desc=${n} actual=${actual(R)}`);
    assert.equal(n, actual(R), `${R.id}：desc 寫起始 ${n}，實算 ${actual(R)}`);
  });
}

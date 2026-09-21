import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const pack=[path.join(root,'tools/anyCreature/package.json'),path.resolve(root,'../../../tools/anyCreature/package.json')].find(existsSync);
const {chromium}=createRequire(pack)('playwright');
const out=path.join(root,'docs/experiments/2026-09-21-l1-trial-ui');mkdirSync(out,{recursive:true});
const server=spawn('python',['-m','http.server','8897','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
await new Promise(r=>setTimeout(r,900));
const errors=[];
try{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=d3d11','--ignore-gpu-blocklist']});
  try{
    for(const [width,height] of [[844,390],[1280,720],[390,844]]){
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
      page.on('pageerror',e=>errors.push(String(e)));
      await page.addInitScript(()=>localStorage.setItem('yaoshi_intro_v1','1'));
      await page.goto('http://127.0.0.1:8897/?table3d=0');
      await page.evaluate(()=>{
        const g=window.__yaoshi;g.newGame('solo',1,['human']);
        const s=g.S;s.players[0].bag=[g.POOL.find(x=>x.ab==='eye'),g.POOL.find(x=>x.ab==='bell')];
        showMarkUI();
      });
      await page.waitForTimeout(650);
      await page.screenshot({path:path.join(out,`market-${width}x${height}.png`)});
      const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,chainVisible:!!document.querySelector('.chainAwaken'),chainText:document.querySelector('.chainAwaken')?.textContent,chainRect:document.querySelector('.chainAwaken')?.getBoundingClientRect().toJSON()}));
      if(width===844){
        const privacy=await page.evaluate(()=>{
          const g=window.__yaoshi,s=g.S;
          s.players[1].bag=[g.POOL.find(x=>x.ab==='boat')];
          showBag(1);const opponent=$('modalbox').textContent,opponentHasBoat=opponent.includes('拼板舟');
          closeModal();showBag(0);const own=$('modalbox').textContent,ownHasEye=own.includes('祖靈之眼');
          showHandoff(0,()=>{});
          return {opponentHasBoat,ownHasEye,modalHidden:$('modal').style.display==='none',privateMarks:document.querySelectorAll('#table .chainHint,#table .chainStatus,#table .chainAwaken').length};
        });
        assert.deepEqual(privacy,{opponentHasBoat:false,ownHasEye:true,modalHidden:true,privateMarks:0});
      }
      if(metrics.scrollWidth>metrics.clientWidth) errors.push(`overflow ${width}: ${JSON.stringify(metrics)}`);
      await page.close();
    }
  }finally{await browser.close();}
}finally{server.kill();}
writeFileSync(path.join(out,'browser-log.json'),JSON.stringify({errors},null,2));
if(errors.length){console.error(errors);process.exitCode=1;}

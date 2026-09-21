// Deterministic real auction/reveal fixture; does not claim a full player game.
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(process.env.CHAIN_PROBE_ROOT||fileURLToPath(new URL('../..',import.meta.url)));
const OUT=path.resolve(process.argv[2]||'docs/experiments/2026-09-21-l1-water/browser');
fs.mkdirSync(OUT,{recursive:true});
const {chromium}=createRequire(path.join(ROOT,'tools/anyCreature/package.json'))('playwright');
const server=spawn('python',['-m','http.server','9627','--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
let browser;
try{
 await new Promise(r=>setTimeout(r,900));
 browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:9627/index.html',{waitUntil:'load'});
 await page.waitForFunction(()=>!!window.__yaoshi);
 await page.evaluate(()=>{
  const g=window.__yaoshi;
  g.CFG.WISH_ON=false;g.CFG.EVENT_ON=false;g.CFG.RULE_ON=false;g.CFG.T=1;
  g.makeState('solo',1);
  g.S.players.forEach(p=>{p.ai=null;p.roleId='human';p.bag=[];p.life=40;p.alive=true;p.wish=null;p.grudge={};});
  g.S.players[1].bag=['boat','buoy'].map(ab=>({...g.POOL.find(x=>x.ab===ab)}));
  g.S.market=[{...g.CURSES[0]}];
  g.S.humanBids={0:[{amt:4,type:'cons',intent:'poison',target:1}]};
  window.chainReceipts=[];
  document.addEventListener('ys:reveal-result',e=>window.chainReceipts.push(e.detail));
  window.chainSounds=[];
  const originalSfx=sfx;
  sfx=(name,options)=>{window.chainSounds.push(name);return originalSfx(name,options);};
  document.getElementById('titleScr').style.display='none';
  document.getElementById('table').classList.add('on');
  startReveal().catch(e=>{window.chainRevealError=String(e);});
 });
 await page.waitForFunction(()=>!document.getElementById('mainbtn').disabled&&/開標/.test(document.getElementById('mainbtn').textContent));
 await page.click('#mainbtn');
 await page.waitForFunction(()=>!document.getElementById('mainbtn').disabled&&/查看成交總覽/.test(document.getElementById('mainbtn').textContent),null,{timeout:20000});
 await page.screenshot({path:path.join(OUT,'reveal.png')});
 const reveal=await page.evaluate(()=>({text:document.getElementById('outzone').innerText,
  receipts:window.chainReceipts,sounds:window.chainSounds,error:window.chainRevealError||null,
  history:window.__yaoshi.S.history.nights[0].auction[0],bag:window.__yaoshi.S.players[1].bag.map(x=>x.n)}));
 await page.evaluate(()=>showReview());
 await page.locator('.rvNight').first().scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(OUT,'review.png')});
 const review=await page.locator('.rvNight').first().innerText();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(OUT,'portrait.png')});
 const result={fixture:'seed1, one real auction, injected bags and bids',reveal,review,errors};
 fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify(result,null,2));
 assert.equal(reveal.history.poisonBlocked,true);
 assert.equal(reveal.receipts.length,1);
 assert.equal(reveal.receipts[0].transferTarget,null);
 assert.equal(reveal.receipts[0].destroy,true);
 assert.equal(reveal.sounds.includes('curse'),false);
 assert.match(reveal.text,/水陸偷渡/);
 assert.match(review,/阻|擋|銷毀/);
 assert.equal(reveal.error,null);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({ok:true,out:OUT}));
}finally{if(browser)await browser.close();server.kill();}

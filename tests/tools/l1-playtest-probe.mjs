// Browser playthrough on the default 3D path.
// Usage: node tests/tools/l1-playtest-probe.mjs water|eyes|tiger|normal [844x390|1280x720|390x844] [--first-night-only|--smoke]
// --smoke captures entry layout; normal also checks ? help and return-to-menu. Tiger's full run removes nail
// only after first-night completion to prove the live army/model returns to the ordinary tiger next night.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const pack=[path.join(root,'tools/anyCreature/package.json'),path.resolve(root,'../../../tools/anyCreature/package.json')].find(fs.existsSync);
const {chromium}=createRequire(pack)('playwright');
const key=process.argv[2]||'tiger';
const size=(process.argv[3]||'844x390').split('x').map(Number);
const firstNightOnly=process.argv.includes('--first-night-only');
const smokeOnly=process.argv.includes('--smoke');
const [width,height]=size;
const dir=path.join(root,'docs/experiments/2026-09-21-l1-trial/browser');fs.mkdirSync(dir,{recursive:true});
const prefix=`${key}-${width}x${height}${smokeOnly?'-smoke':''}`;
const server=spawn('python',['-m','http.server','8898','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
await new Promise(r=>setTimeout(r,900));
const errors=[],responses=[];
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=d3d11','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
page.on('pageerror',e=>errors.push(`pageerror ${e.stack||e}`));
page.on('response',r=>{if(/\/(twinTiger|tiger_c)\.glb/.test(r.url()))responses.push({url:r.url(),status:r.status()});if(r.status()===404)errors.push(`404 ${r.url()}`);});
await page.addInitScript(()=>{
  localStorage.setItem('yaoshi_intro_v1','1');
  window.__l1duels=[];
  document.addEventListener('ys:duel',e=>window.__l1duels.push({armies:e.detail.armies?.map(a=>a.units.map(u=>u.ab)),time:performance.now()}));
});
const result={key,viewport:{width,height},steps:[],errors,responses};
const frame=page.frameLocator('#game');
const gameFrame=()=>page.frames().find(f=>f.url().includes('/index.html'));
const state=()=>gameFrame().evaluate(()=>({seed:window.__yaoshi.S.seed,round:window.__yaoshi.S.round,roundLimit:window.__yaoshi.CFG.ROUNDS,players:window.__yaoshi.S.players.map(p=>({id:p.id,alive:p.alive,life:p.life,ai:!!p.ai})),bag:window.__yaoshi.S.players[0].bag.map(x=>x.ab),market:window.__yaoshi.S.market.map(x=>x.ab),history:window.__yaoshi.S.history?.nights?.map(n=>n.auction),duels:window.__l1duels,preview:document.querySelector('.preview')?.textContent||'',previewItems:(document.querySelector('.preview')?.textContent.match(/「[^」]+」/g)||[]).length,previewTrait:window.__yaoshi.traitMax(window.__yaoshi.S.players[0],'preview',1),chain:document.querySelector('.chainStatus')?.textContent||'',phase:document.querySelector('#mainbtn')?.textContent||'',modal:document.querySelector('#modal')?.style.display,duel:document.querySelector('#duel')?.style.display}));
const shot=async name=>{await page.screenshot({path:path.join(dir,`${prefix}-${name}.png`)});};
const clickMain=async(expected)=>{
  const button=frame.locator('#mainbtn');await button.waitFor({state:'visible',timeout:20000});
  await gameFrame().waitForFunction(label=>{const b=document.querySelector('#mainbtn');return b&&!b.disabled&&(!label||b.textContent.trim()===label);},expected||null,{timeout:20000});
  await page.waitForTimeout(550); // phase guard: ordinary product cadence, no timer overrides
  if(expected)assert.equal((await button.textContent()).trim(),expected);
  await button.click({timeout:20000});
};
try{
  await page.goto('http://127.0.0.1:8898/tests/tools/l1-playtest.html',{waitUntil:'load'});
  await page.locator(`[data-case="${key}"]`).click();
  await frame.locator('#table.on').waitFor({state:'attached',timeout:20000});
  await page.waitForTimeout(1300);
  result.steps.push({at:'market',...(await state())});await shot('market');
  if(smokeOnly){
    assert.equal(await page.locator('#status').isVisible(),false);
    assert.equal(await page.locator('#openMenu').isVisible(),false);
    if(key==='normal'){
      await frame.locator('#helpBtn').click();
      await frame.locator('#modal').waitFor({state:'visible'});
      assert.ok(await frame.locator('#modalbox button').filter({hasText:'返回連攜試玩選單'}).isVisible());
      await shot('help-modal');
      await frame.locator('#modalbox button').filter({hasText:'返回連攜試玩選單'}).click();
      await page.locator('#menu').waitFor({state:'visible'});
      await shot('returned-menu');
      await page.locator('#closeMenu').click();
      assert.equal(await page.locator('#menu').isVisible(),false);
      result.helpReturn=true;
    }
  }else if(height>width){
    result.rotate=await frame.locator('#rotateHint').isVisible().catch(()=>false);
    assert.equal(result.rotate,true);
  }else{
    if((await frame.locator('#mainbtn').textContent()).includes('不盯任何一件'))await clickMain('不盯任何一件');
    assert.ok(await frame.locator('#mc0').count(),'market slot 0 must be present');
    await frame.locator('#mc0').first().click();
    await frame.locator('#sheet').waitFor({state:'visible'});
    for(let n=0;n<12&&Number((await frame.locator('#shAmt').textContent()).trim())<3;n++){
      await frame.locator('#sheet .stepper button').last().click();
      await page.waitForTimeout(90);
    }
    assert.equal((await frame.locator('#shAmt').textContent()).trim(),'3');
    await frame.locator('#sheet .bigbtn').last().click();
    result.steps.push({at:'bid3',...(await state())});
    await clickMain('蓋牌開標');
    for(let n=0;n<30;n++){
      await gameFrame().waitForFunction(()=>{const b=document.querySelector('#mainbtn');return b&&!b.disabled;},null,{timeout:20000});
      const phase=(await frame.locator('#mainbtn').textContent()).trim();
      if(phase==='開戰')break;
      await clickMain(phase);
    }
    const beforeBattle=await state();result.steps.push({at:'reveal',...beforeBattle});
    assert.equal((await frame.locator('#mainbtn').textContent()).trim(),'開戰','reveal must finish');
    assert.equal(beforeBattle.duels.length,0,'reveal must not have started a duel');
    if(key==='water')assert.equal(beforeBattle.history?.[0]?.[3]?.poisonBlocked,true);
    await clickMain('開戰');
    if(key==='tiger'){
      await frame.locator('#duel.on').waitFor({timeout:30000});
      await page.waitForTimeout(250);
      await shot('tigerbattle-entry');
      await page.waitForTimeout(1200);
      await shot('tigerbattle');
    }
    await frame.locator('#mainbtn').filter({hasText:/進入下一夜|看最終結果/}).waitFor({timeout:90000});
    result.steps.push({at:'battle-end',...(await state())});
    if(key==='normal'&&(await frame.locator('#mainbtn').textContent()).includes('看最終結果')){
      result.normalEndedOnFirstNight=true;
    }else{
    await clickMain('進入下一夜');
    await frame.locator('#mc0').waitFor({timeout:20000});
    await page.waitForTimeout(500);
    const next=await state();result.steps.push({at:'second-night',...next});await shot('second-night');
    if(key==='eyes'){
      await page.waitForTimeout(1300);
      await shot('second-night-settled');
    }
    assert.equal(next.round,2);
    if(key==='water')assert.ok(next.bag.includes('buoy'));
    if(key==='eyes'){
      assert.ok(next.bag.includes('bell'));
      assert.equal(next.previewTrait,3);
      assert.equal(next.previewItems,3);
      assert.match(next.chain,/第二高/);
    }
    if(key==='tiger'){
      assert.ok(next.bag.includes('nail'));
      assert.ok(next.duels.some(d=>d.armies?.some(a=>a.includes('twinTiger'))),'duel roster contains twinTiger');
      assert.ok(responses.some(r=>r.status===200),'twinTiger GLB returned HTTP 200');
    }
    if(key==='tiger'&&!firstNightOnly){
      result.testOnlyFixture='After the complete first night, removed nail from the live player bag before night two; no game reset or product timer override.';
      const restored=await gameFrame().evaluate(()=>{
        const g=window.__yaoshi,p=g.S.players[0];p.bag=p.bag.filter(x=>x.ab!=='nail');
        return {bag:p.bag.map(x=>x.ab),army:g.buildArmy(p.bag).teams.map(t=>t.ab)};
      });
      result.steps.push({at:'test-only-nail-removed',...restored});
      assert.ok(restored.army.includes('tiger')&&!restored.army.includes('twinTiger'));
      const previousDuels=next.duels.length;
      await clickMain('蓋牌開標');
      for(let n=0;n<30;n++){
        await gameFrame().waitForFunction(()=>{const b=document.querySelector('#mainbtn');return b&&!b.disabled;},null,{timeout:20000});
        const phase=(await frame.locator('#mainbtn').textContent()).trim();
        if(phase==='開戰')break;
        await clickMain(phase);
      }
      assert.equal((await frame.locator('#mainbtn').textContent()).trim(),'開戰');
      await clickMain('開戰');
      await frame.locator('#duel.on').waitFor({timeout:30000});
      await gameFrame().waitForFunction(()=>{
        const d=window.__yaoshi3d?.duelFigures;
        const f=d&&[...d.figuresOf(0),...d.figuresOf(1)].find(x=>x.unit?.ab==='tiger');
        return !!(f&&f.ready()&&f.group.visible);
      },null,{timeout:30000});
      await page.waitForTimeout(300);
      const live=await state();result.steps.push({at:'restored-battle',...live});
      assert.ok(live.duels.slice(previousDuels).some(d=>d.armies?.some(a=>a.includes('tiger')&&!a.includes('twinTiger'))));
      result.restoredFigure=await gameFrame().evaluate(()=>{
        const d=window.__yaoshi3d.duelFigures;
        const f=[...d.figuresOf(0),...d.figuresOf(1)].find(x=>x.unit?.ab==='tiger');
        const meshes=[],materials=[];
        f.group.traverse(o=>{if(!o.isMesh)return;meshes.push(o.name);const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms)if(m)materials.push(m.name);});
        return {ab:f.unit.ab,ready:f.ready(),visible:f.group.visible,meshes,materials};
      });
      assert.equal(result.restoredFigure.ab,'tiger');
      assert.equal(result.restoredFigure.ready,true);
      assert.equal(result.restoredFigure.visible,true);
      assert.ok(responses.some(r=>r.url.endsWith('/tiger_c.glb')&&r.status===200),'restored tiger_c GLB returned HTTP 200');
      await shot('tiger-restored-battle');
    }
    }
  }
  const metrics=await gameFrame().evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,htmlWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,renderer:!!window.__yaoshi3d?.renderer,drawCalls:window.__yaoshi3d?.renderer?.info?.render?.calls}));
  result.metrics=metrics;
  assert.equal(metrics.horizontalOverflow,false);
  assert.equal(metrics.renderer,true);
  if(key==='normal')assert.equal(result.steps[0].roundLimit,12,'normal game keeps default round count');
  assert.equal(errors.length,0);
  result.pass=true;
}catch(error){result.pass=false;result.failure=String(error.stack||error);try{result.failureState=await state();await shot('failure');}catch{}throw error;}
finally{
  fs.writeFileSync(path.join(dir,`${prefix}.json`),JSON.stringify(result,null,2)+'\n');
  await browser.close();server.kill();
}

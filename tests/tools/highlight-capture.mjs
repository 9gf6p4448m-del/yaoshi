// Natural game-path capture. No playCut calls, history edits, or threshold changes.
// node tests/tools/highlight-capture.mjs [--scan] [--seed=1] [--port=8973]
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {loadGame} from './load.mjs';
import {serve,parseArgs} from './duel-drive.mjs';
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'docs/experiments/2026-09-15-highlight-evidence');
fs.mkdirSync(out,{recursive:true});
const {opt}=parseArgs(process.argv.slice(2));
// UI seals AI event choices before asking seat 0. The stock headless runner
// iterates seat 0 first; align that simulation input order, retaining all rules.
const scanPath=path.join(out,`scan-input-order-${process.pid}.html`);
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const from='ctx.players.forEach(p=>{ if(p.ai||humanToo) ctx.choices[p.id]=ctx.ev.ai(p,ctx); });';
const to='[...ctx.players].sort((a,b)=>Number(!!b.ai)-Number(!!a.ai)).forEach(p=>{ if(p.ai||humanToo) ctx.choices[p.id]=ctx.ev.ai(p,ctx); });';
if(!source.includes(from))throw new Error('Event input order fixture no longer matches source');
fs.writeFileSync(scanPath,source.replace(from,to));
let G;try{G=loadGame(scanPath);}finally{fs.unlinkSync(scanPath);}
const policy=p=>G.scriptedBids(p);
policy.mark=p=>policy(p).findIndex(b=>b.amt>0);
policy.inc=()=>null;
function hits(S){
 const rank=[...S.players].sort((a,b)=>Number(b.alive)-Number(a.alive)||b.life-a.life);
 return {
  bluff:S.history.nights.filter(n=>n.auction.some(a=>a.winnerId===0&&n.marks.some(m=>m.pid===0&&m.item===a.item)&&(a.bids.length===1||a.amt<=G.CFG.WISH_T2.bargainAmt))).map(n=>n.round),
  'borrowed-blade':S.history.nights.filter(n=>n.auction.some(a=>a.intent==='poison'&&!a.poisonBlocked&&n.deaths.includes(a.targetId))).map(n=>n.round),
  'death-edge':rank[0].alive&&S.history.life.some(r=>r[rank[0].id]<=5)?[S.round]:[],
 };
}
if(opt.scan){
 const found={}; const runs=[];
 for(let seed=1;seed<=10000;seed++){
  G.playPolicyGame(seed,{0:policy});
  const h=hits(G.S); if(Object.values(h).some(v=>v.length)){runs.push({seed,hits:h});for(const [k,v] of Object.entries(h))if(v.length&&!found[k])found[k]={seed,rounds:v};}
  if(Object.keys(found).length===3)break;
  if(seed%1000===0)console.log(JSON.stringify({scanned:seed,found}));
 }
 fs.writeFileSync(path.join(out,'seed-scan.json'),JSON.stringify({policy:'scriptedBids; mark bid slot; no incense',found,runs},null,2));
 console.log(JSON.stringify(found));
}else{
 const {chromium}=createRequire(path.join(root,'tools/anyCreature/package.json'))('playwright');
 const port=Number(opt.port||8973),seed=Number(opt.seed||1);
 const srv=await serve(root,port); let browser;
 try{
  browser=await chromium.launch({args:['--use-gl=angle','--use-angle=d3d11','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1280,height:590},deviceScaleFactor:1});
  const errors=[],steps=[],captures=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>localStorage.setItem('yaoshi_intro_v1','1'));
  await page.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{
   window.__captureCuts=[];
   new MutationObserver(records=>{for(const r of records){for(const el of r.addedNodes)if(el.classList?.contains('cutOverlay'))window.__captureCuts.push({kind:'mounted',cls:el.className,at:performance.now()});for(const el of r.removedNodes)if(el.classList?.contains('cutOverlay'))window.__captureCuts.push({kind:'removed',cls:el.className,at:performance.now()});}}).observe(document.body,{childList:true});
  }));
  const response=await page.goto(`http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1`);
  const sourceSha256=createHash('sha256').update(await response.body()).digest('hex');
  await page.waitForFunction(()=>window.__yaoshi3d?.renderer);
  await page.evaluate(seed=>window.__yaoshi.newGame('solo',seed),seed);
  const deadline=Date.now()+480000; let done=false;
  while(Date.now()<deadline){
   const live=await page.locator('.cutOverlay').count();
   if(live){
    const data=await page.locator('.cutOverlay').first().evaluate(el=>({cls:el.className,text:el.textContent,round:window.__yaoshi.S.round,history:window.__yaoshi.S.history}));
    const id=data.cls.split(' ')[1];
    if(!captures.some(c=>c.id===id)){
     const freeze=await page.locator(`.cutOverlay.${id}`).evaluate(el=>{
      const animations=el.firstElementChild.getAnimations();
      const before=animations.map(a=>({currentTime:a.currentTime,playState:a.playState}));
      for(const a of animations)a.pause();
      let selectedTime=null;
      // Global cubic-bezier easing moves the opaque hold earlier than 450ms.
      // Sample only real keyframe times; never override opacity or keyframes.
      for(let t=0;t<=1250;t+=10){
       for(const a of animations)a.currentTime=t;
       if(Number(getComputedStyle(el.firstElementChild).opacity)>=0.999){selectedTime=t;break;}
      }
      if(selectedTime===null)throw new Error('No fully opaque frame in natural stamp animation');
      return {method:'presentation-only WAAPI pause at first fully opaque original frame; original removal timer unchanged',selectedTime,at:performance.now(),before};
     });
     const hit=`seed-${seed}-${id}-hit.png`,after=`seed-${seed}-${id}-removed.png`;
     const visibleAtCapture=await page.locator(`.cutOverlay.${id}`).evaluate(el=>{
      const stamp=el.firstElementChild,rect=stamp.getBoundingClientRect(),style=getComputedStyle(stamp);
      const css=n=>{const s=getComputedStyle(n);return {backgroundColor:s.backgroundColor,fontSize:s.fontSize,color:s.color,filter:s.filter,opacity:s.opacity};};
      return {cls:el.className,title:stamp.textContent,opacity:style.opacity,display:style.display,visibility:style.visibility,stamp:css(stamp),overlay:css(el),rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}};
     });
     if(Number(visibleAtCapture.opacity)<0.99||visibleAtCapture.rect.width<=0||visibleAtCapture.visibility!=='visible')throw new Error(`Cut ${id} not fully visible at screenshot`);
     await page.screenshot({path:path.join(out,hit)});
     if(!await page.locator(`.cutOverlay.${id}`).count())throw new Error(`Cut ${id} expired during screenshot`);
     await page.waitForFunction(()=>!document.querySelector('.cutOverlay'));
     await page.screenshot({path:path.join(out,after)});
     captures.push({id,hit,after,...data,visibleAtCapture,freeze});
    }
   }
   const action=await page.evaluate(()=>{
    const Y=window.__yaoshi,S=Y.S,mb=document.getElementById('mainbtn');
    const vis=e=>e&&e.offsetParent!==null&&!e.disabled;
    if(mb.textContent==='再入妖市')return {done:true};
    if(document.querySelector('.cutOverlay'))return null;
    if(typeof EVDONE==='function'){
     const p=S.players[0],v=EVCTX.ev.ai(p,EVCTX);
     if(EVCTX.ev.input==='pick')pickEventOpt(0,v);else if(v===null)passEvent(0);else {EVAMT=v;confirmEventNum(0);}
     return {round:S.round,action:'event',value:v};
    }
    if(vis(mb)&&mb.textContent==='不盯任何一件'){
     const bids=Y.scriptedBids(S.players[0]),slot=bids.findIndex(b=>b.amt>0);pickMark(slot);
     return {round:S.round,action:'mark',slot};
    }
    if(typeof BIDS_OPEN!=='undefined'&&BIDS_OPEN&&vis(mb)){
     myBids=Y.scriptedBids(S.players[0]);
     if(YB){const b=myBids.find(b=>b.amt>0);YB.amt=b?.amt||0;YB.pick=myBids.map(b=>b.amt>0);}
     const bids=JSON.parse(JSON.stringify(myBids));mb.click();return {round:S.round,action:'submit legal scripted bids',bids};
    }
    const keep=document.getElementById('titheKeep');if(vis(keep)){keep.click();return {action:'keep tithe'};}
    const sk=document.getElementById('skipbtn');if(vis(sk)&&!SKIP){sk.click();return {action:'skip presentation',round:S.round};}
    if(vis(mb)){const text=mb.textContent;mb.click();return {round:S.round,action:text};}
    const b=[...document.querySelectorAll('#stage .bigbtn')].find(vis);if(b){const text=b.textContent;b.click();return {round:S.round,action:text};}
    return null;
   });
   if(action?.done){done=true;break;}if(action)steps.push(action);
   await page.waitForTimeout(70);
  }
  const final=await page.evaluate(()=>({history:window.__yaoshi.S.history,players:window.__yaoshi.S.players.map(p=>({id:p.id,life:p.life,alive:p.alive})),round:window.__yaoshi.S.round,cutLifecycle:window.__captureCuts}));
  fs.writeFileSync(path.join(out,`seed-${seed}.json`),JSON.stringify({seed,done,sourceSha256,policy:'scriptedBids; mark bid slot; no incense; event uses ai choice; presentation skip button',captures,steps,errors,final},null,2));
  console.log(JSON.stringify({seed,done,captures:captures.map(c=>c.id),errors,round:final.round}));
  if(!done||errors.length)process.exitCode=1;
 }finally{await browser?.close();srv.kill();}
}

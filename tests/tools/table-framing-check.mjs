/* A1 screen-framing geometry gate.
 *
 * This is intentionally independent of tray.presentationBounds(): it projects
 * actual visible mesh geometry after the renderer's own rAF updates.  The
 * current fixture is deliberately RED: a normal award flight at the frozen
 * reveal camera exceeds the safe felt window.  Later cases may add all assets
 * and outcomes, but must retain this ordinary known-overflow control.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium, devices } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const PORT = 8992;
const SAFE = [0, 59, 21, 59]; // T/R/B/L synthetic iPhone-landscape fixture

const pageMeasure = `async () => {
  const V=window.__yaoshi3d, camera=V.camera, scene=V.scene, tray=V.tray;
  const rect=s=>{const e=document.querySelector(s),r=e&&e.getBoundingClientRect();return r&&{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,display:getComputedStyle(e).display};};
  const visible=o=>{for(let n=o;n;n=n.parent) if(!n.visible) return false; return true;};
  const hasVisibleMesh=root=>{let n=0;root.traverse(o=>{if(visible(o)&&(o.isMesh||o.isSkinnedMesh))n++;});return n>0;};
  const roots=tray.group.children.filter(o=>o.isObject3D&&o.visible&&!o.name&&hasVisibleMesh(o));
  const root=roots.reduce((best,o)=>!best||Math.abs(o.position.x-.45)<Math.abs(best.position.x-.45)?o:best,null);
  if(!root) throw new Error('No visible tray creature root for slot 2');
  root.traverse(o=>{if((o.isMesh||o.isSkinnedMesh)&&o.geometry&&!o.geometry.boundingBox)o.geometry.computeBoundingBox();});
  const v=new camera.position.constructor();
  const bounds=()=>{
    if(!visible(root)) return {lifecycle:'terminal'};
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    const xs=[],ys=[];
    root.traverse(o=>{if(!visible(o)||!(o.isMesh||o.isSkinnedMesh)||!o.geometry?.boundingBox)return;
      const b=o.geometry.boundingBox;
      for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
        v.set(x,y,z).applyMatrix4(o.matrixWorld).project(camera);xs.push((v.x*.5+.5)*innerWidth);ys.push((1-(v.y*.5+.5))*innerHeight);
      }
    });
    if(!xs.length) throw new Error('Visible award root had no mesh geometry');
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    return {lifecycle:'active',geometry:true,meshVertices:xs.length,left,right,top,bottom,width:right-left,height:bottom-top,scale:root.scale.toArray()};
  };
  let phase='push', flightDt=0, countFlightDt=false, terminalBeforeHide=null, terminalDt=null;
  const update=tray.update.bind(tray);
  tray.update=dt=>{if(countFlightDt)flightDt+=dt;return update(dt);};
  let rootVisible=root.visible;
  Object.defineProperty(root,'visible',{configurable:true,enumerable:true,get(){return rootVisible;},set(next){
    if(rootVisible&&!next&&terminalBeforeHide===null){terminalBeforeHide=bounds();terminalDt=flightDt;}
    rootVisible=next;
  }});
  document.querySelector('#stage').replaceChildren(); // startReveal does this before ys:reveal-slot
  const frames=[], t0=performance.now();
  const observe=(until)=>new Promise(resolve=>{const tick=()=>{frames.push({phase,ms:performance.now()-t0,b:bounds()});if(until())requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
  window.fx3d('ys:reveal-slot',{slot:2,ms:650});
  await observe(()=>performance.now()-t0<700);
  phase='flight'; countFlightDt=true;
  window.fx3d('ys:reveal-result',{slot:2,winner:0});
  await observe(()=>root.visible&&performance.now()-t0<3000);
  return {rects:{felt:rect('#felt'),head:rect('#feltHead'),help:rect('#helpBtn'),skip:rect('#skipbtn'),north:rect('#north')},frames,terminalBeforeHide,terminalDt};
}`;

async function toMark(page) {
  await page.evaluate(() => window.__yaoshi.newGame('solo',1,['qingmian']));
  for(let i=0;i<80;i++){
    const s=await page.evaluate(()=>{const b=document.querySelector('#mainbtn');return {t:b?.textContent||'',d:!b||b.disabled};});
    if(!s.d&&/不盯任何一件/.test(s.t)) return;
    if(!s.d) await page.click('#mainbtn');
    else await page.evaluate(()=>[...document.querySelectorAll('#stage button')].find(b=>!b.disabled)?.click());
    await page.waitForTimeout(180);
  }
  throw new Error('seed 1 did not reach normal mark phase');
}

const server=spawn('python',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
let browser; const errors=[];
try {
  await new Promise(r=>setTimeout(r,900));
  browser=await chromium.launch({args:['--use-gl=angle','--use-angle=d3d11','--ignore-gpu-blocklist']});
  const ctx=await browser.newContext({...devices['iPhone 14 Pro'],viewport:{width:852,height:393}});
  await ctx.addInitScript(()=>localStorage.setItem('yaoshi_intro_v1','1'));
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
  await page.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.__yaoshi3d?.tray&&!!window.__yaoshi,null,{timeout:60000});
  await toMark(page);
  await page.evaluate(v=>['top','right','bottom','left'].forEach((s,i)=>document.documentElement.style.setProperty('--safe-'+s,v[i]+'px')),SAFE);
  await page.waitForTimeout(50);
  await page.waitForFunction(()=>document.querySelector('#north')?.getBoundingClientRect().left>=59);
  await page.waitForFunction(()=>window.__yaoshi3d.tray.items().every(x=>x.ready),null,{timeout:60000});
  const m=await page.evaluate(`(${pageMeasure})()`);
  const safe={left:m.rects.felt.left,right:m.rects.felt.right,top:Math.max(m.rects.felt.top,m.rects.head.bottom),bottom:m.rects.felt.bottom};
  safe.width=safe.right-safe.left;safe.height=safe.bottom-safe.top;
  const active=m.frames.filter(x=>x.b.lifecycle==='active');
  const obstacles=Object.entries({head:m.rects.head,help:m.rects.help,skip:m.rects.skip}).filter(([,r])=>r&&r.display!=='none');
  const overlaps=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))>0;
  const violations=active.flatMap(row=>{
    const b=row.b, out=[];
    if(!b.geometry||!b.meshVertices) out.push({phase:row.phase,ms:row.ms,kind:'no-geometry'});
    if(b.left<safe.left||b.right>safe.right||b.top<safe.top||b.bottom>safe.bottom) out.push({phase:row.phase,ms:row.ms,kind:'outside-safe',box:b});
    for(const [name,o] of obstacles)if(overlaps(b,o))out.push({phase:row.phase,ms:row.ms,kind:'hud-overlap',name,box:b});
    return out;
  });
  const activeBoxes=active.map(x=>x.b);
  const max=activeBoxes.reduce((a,b)=>({width:Math.max(a.width,b.width),height:Math.max(a.height,b.height)}),{width:0,height:0});
  const pushFrames=active.filter(x=>x.phase==='push').length, flightFrames=active.filter(x=>x.phase==='flight').length;
  const normalDurationKept=typeof m.terminalDt==='number'&&m.terminalDt>=.86&&m.terminalDt<.97;
  const pass=pushFrames>0&&flightFrames>0&&violations.length===0&&m.terminalBeforeHide?.lifecycle==='active'&&normalDurationKept&&errors.length===0;
  console.log(JSON.stringify({fixture:'synthetic ys:reveal-slot(slot 2,650ms) then ys:reveal-result(slot 2,winner 0); stage cleared like startReveal',safeInsets:SAFE,north:m.rects.north,safe,max,scale:activeBoxes[0]?.scale,frames:{push:pushFrames,flight:flightFrames},terminal:{after:m.frames.at(-1)?.b?.lifecycle,beforeHide:m.terminalBeforeHide,rendererDt:m.terminalDt,expectedSeconds:.86,kept:normalDurationKept},violations:violations.slice(0,8),violationCount:violations.length,errors,pass},null,2));
  if(!pass) process.exitCode=1;
  await ctx.close();
} finally { await browser?.close(); server.kill(); }

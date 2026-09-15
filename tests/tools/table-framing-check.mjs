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
    return {lifecycle:'active',left,right,top,bottom,width:right-left,height:bottom-top,scale:root.scale.toArray()};
  };
  document.querySelector('#stage').replaceChildren(); // startReveal does this before ys:reveal-slot
  window.fx3d('ys:reveal-slot',{slot:2,ms:650});
  await new Promise(r=>setTimeout(r,700));
  window.fx3d('ys:reveal-result',{slot:2,winner:0});
  const frames=[];
  await new Promise(resolve=>{const t0=performance.now();const tick=()=>{const b=bounds();frames.push({ms:performance.now()-t0,b});if(b.lifecycle==='active'&&performance.now()-t0<3000)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
  return {rects:{felt:rect('#felt'),head:rect('#feltHead'),help:rect('#helpBtn'),skip:rect('#skipbtn'),north:rect('#north')},frames};
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
  const active=m.frames.filter(x=>x.b.lifecycle==='active').map(x=>x.b);
  const max=active.reduce((a,b)=>({width:Math.max(a.width,b.width),height:Math.max(a.height,b.height)}),{width:0,height:0});
  const pass=max.width<=safe.width&&max.height<=safe.height&&errors.length===0;
  console.log(JSON.stringify({fixture:'synthetic ys:reveal-slot(slot 2,650ms) then ys:reveal-result(slot 2,winner 0); stage cleared like startReveal',safeInsets:SAFE,north:m.rects.north,safe,max,scale:active[0]?.scale,terminal:m.frames.at(-1)?.b?.lifecycle,errors,pass},null,2));
  if(!pass) process.exitCode=1;
  await ctx.close();
} finally { await browser?.close(); server.kill(); }

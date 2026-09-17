/* A1 reveal screen-framing browser gate.
 *
 * Projects visible Three meshes directly rather than using any tray bounds API.
 * Default retains the known normal fixture at every required viewport. `--all`
 * expands it to POOL × slots × winners and CURSES × slots × transfers/burn.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium, devices } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const PORT = 8992, all = process.argv.includes('--all');
const curseOnly = process.argv.includes('--curse-only');
if (curseOnly && !all) throw new Error('--curse-only requires --all');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.slice(8)) : null;
const matchArg = process.argv.find(a => a.startsWith('--match='));
const reverse=process.argv.includes('--reverse'); // 跑序依賴驗證：同組案例倒序跑，launch／terminal 應逐值相同（2026-09-17）
const match = matchArg?.slice(8) || null;
if (limit !== null && (!Number.isInteger(limit) || limit < 1)) throw new Error('--limit must be a positive integer');
const outArg = process.argv.find(a => a.startsWith('--out='));
const outFile = outArg && path.resolve(ROOT, outArg.slice(6));
if (outFile && path.relative(ROOT, outFile).startsWith('..')) throw new Error('--out must be repository-relative');
const VIEWPORTS = [
  { id:'desktop-1280x720', viewport:{width:1280,height:720}, safe:[0,0,0,0] },
  { id:'mobile-852x393-safe59', viewport:{width:852,height:393}, safe:[0,59,21,59], device:'iPhone 14 Pro' },
  { id:'natural-844x390', viewport:{width:844,height:390}, safe:[0,0,0,0] },
];

async function toMark(page) {
  await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
  for (let i=0;i<80;i++) {
    const state=await page.evaluate(()=>{const b=document.querySelector('#mainbtn');return {text:b?.textContent||'',disabled:!b||b.disabled};});
    if (!state.disabled && /不盯任何一件/.test(state.text)) return;
    if (!state.disabled) await page.click('#mainbtn');
    else await page.evaluate(()=>[...document.querySelectorAll('#stage button')].find(b=>!b.disabled)?.click());
    await page.waitForTimeout(180);
  }
  throw new Error('seed 1 did not reach normal mark phase');
}

// Executes in the page. Every actual rAF samples real mesh geometry after the
// renderer has called tray.update and its framing callback. Green samples are
// aggregated; every failed pose is retained for evidence.
const measureCase = async ({ slot, kind, key, fac, curseKind, winner, transferTarget, fixture }) => {
  const {camera,scene,tray,renderer}=window.__yaoshi3d;
  const manual=window.__a1FramingClock;
  const rect=s=>{const e=document.querySelector(s),b=e?.getBoundingClientRect();return b&&{left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height,display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility,rects:e.getClientRects().length};};
  const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
  const meshCount=root=>{let n=0;root.traverse(o=>{if(visible(o)&&(o.isMesh||o.isSkinnedMesh)&&o.geometry)n++;});return n;};
  const x=tray.slotXs()[slot];
  // Tray decorations have names; item figure/pile groups intentionally do not.
  const selectRoot=()=>tray.group.children.filter(o=>o.isObject3D&&o.visible&&!o.name&&meshCount(o)).reduce((best,o)=>!best||Math.abs(o.position.x-x)<Math.abs(best.position.x-x)?o:best,null);
  if(key!=='__current__'){
    const item=kind==='normal'?{key,fac,curse:false}:{key:null,fac:'curse',curse:true,curseKind};
    // Do not let a hidden terminal model be reused merely because the next
    // synthetic case has the same key. This also leaves no prior award root
    // available for the position selector.
    tray.setItems([]); await tray.loaded();
    window.fx3d('ys:market',{round:10000+slot,items:[item,item,item,item]});
    await tray.loaded();
    if(manual){manual.step();manual.step();}
    else await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  }
  // 跑序歸零（2026-09-17）：上一案 ys:reveal-slot 的推鏡與 ys:reveal-result 的殘留，靠 ys:market 回桌只是「開始回」，
  // 兩步之後相機還在途中；launch／terminal 的絕對值於是隨前一案是誰而變（v0.57.13 前後 43 案 >1 px 就是這個）。
  // 這裡跑到相機與托盤都靜止（連續 8 幀位置／姿態／hover 抬升不變）才開始量；上限 900 步（15 秒模擬時間）。
  {
    const snap=()=>[...camera.position.toArray(),...camera.quaternion.toArray(),...(tray.group.children.filter(o=>o.visible).map(o=>o.position.y))].map(v=>+v.toFixed(7)).join(',');
    // 固定步數（不是「跑到靜止為止」）：步數若隨前案而變，紙紮待機動作的相位也跟著變，launch 一樣會漂。
    // 240 步＝4 秒模擬時間，比鏡頭回桌的補間長；跑完再驗最後 8 步真的靜止，沒靜止就丟錯而不是默默量。
    let last=snap(),stable=0,steps=0;const SETTLE=240;
    const tick=()=>{const cur=snap();stable=cur===last?stable+1:0;last=cur;};
    if(manual){while(steps++<SETTLE){manual.step();tick();}}
    else{await new Promise(resolve=>{const loop=()=>{tick();if(steps++>=SETTLE)return resolve();requestAnimationFrame(loop);};requestAnimationFrame(loop);});}
    if(stable<8)throw new Error(`camera did not settle before ${fixture} (${SETTLE} steps, stable ${stable})`);
  }
  // Four copies of this synthetic item are on the live tray. This is a
  // renderer.info snapshot for draw-cost evidence, not a frame-rate sample.
  const root=selectRoot(); if(!root)throw new Error(`No visible tray subject for slot ${slot}: ${tray.group.children.map(o=>({name:o.name,visible:o.visible,x:o.position.x,meshes:meshCount(o)})).filter(o=>o.visible).map(o=>JSON.stringify(o)).join(';')}`);
  const renderedCurseKind=root.userData.curseKind||null;
  if(kind!=='normal'&&renderedCurseKind!==curseKind)throw new Error(`Curse factory mismatch for ${fixture}: expected ${curseKind}, rendered ${renderedCurseKind}`);
  const fourSlotRender={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
  root.traverse(o=>{if((o.isMesh||o.isSkinnedMesh)&&o.geometry&&!o.geometry.boundingBox)o.geometry.computeBoundingBox();});
  const point=new camera.position.constructor();
  const bounds=()=>{
    if(!visible(root))return {lifecycle:'terminal'};
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const xs=[],ys=[];
    root.traverse(o=>{if(!visible(o)||!(o.isMesh||o.isSkinnedMesh)||!o.geometry)return;if(o.isSkinnedMesh){o.skeleton?.update();o.computeBoundingBox?.();}const b=o.isSkinnedMesh?(o.boundingBox||o.geometry.boundingBox):o.geometry.boundingBox;if(!b)return;for(const a of [b.min.x,b.max.x])for(const bY of [b.min.y,b.max.y])for(const c of [b.min.z,b.max.z]){point.set(a,bY,c).applyMatrix4(o.matrixWorld).project(camera);xs.push((point.x+1)*innerWidth/2);ys.push((1-point.y)*innerHeight/2);}});
    if(!xs.length)return {lifecycle:'active',geometry:false};const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);return {lifecycle:'active',geometry:true,meshVertices:xs.length,left,right,top,bottom,width:right-left,height:bottom-top,scale:root.scale.toArray()};
  };
  const felt=rect('#felt'),area={left:Math.max(4,felt.left+4),top:Math.max(4,felt.top+4),right:Math.min(innerWidth-4,felt.right-4),bottom:Math.min(innerHeight-4,felt.bottom-4)};
  const obstacles=Object.fromEntries(['#feltHead','#helpBtn','#skipbtn'].flatMap(s=>{const b=rect(s);return !b||!b.rects||b.visibility==='hidden'||!b.width||!b.height?[]:[[s,{left:b.left-4,top:b.top-4,right:b.right+4,bottom:b.bottom+4}]];}));
  const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  const failures=[],summary={push:0,flight:0,maxWidth:0,maxHeight:0,launch:null};let phase='push',flightDt=0,countFlightDt=false,terminalBeforeHide=null,terminalDt=null;
  const update=tray.update.bind(tray);tray.update=dt=>{if(countFlightDt)flightDt+=dt;return update(dt);};
  const visibleDescriptor=Object.getOwnPropertyDescriptor(root,'visible');let rootVisible=root.visible;
  Object.defineProperty(root,'visible',{configurable:true,enumerable:visibleDescriptor?.enumerable??true,get(){return rootVisible;},set(next){if(rootVisible&&!next&&!terminalBeforeHide){terminalBeforeHide=bounds();terminalDt=flightDt;}rootVisible=next;}});
  const inspect=()=>{const b=bounds(),index=summary[phase]++;if(b.lifecycle!=='active')return;if(!summary.launch)summary.launch=b;summary.maxWidth=Math.max(summary.maxWidth,b.width);summary.maxHeight=Math.max(summary.maxHeight,b.height);if(!b.geometry)failures.push({phase,index,kind:'no-geometry'});else{if(b.left<area.left||b.right>area.right||b.top<area.top||b.bottom>area.bottom)failures.push({phase,index,kind:'outside-area',box:b});for(const [name,o]of Object.entries(obstacles))if(overlaps(b,o))failures.push({phase,index,kind:'hud-overlap',name,box:b});}};
  const observe=(ms,predicate)=>{
    if(!manual)return new Promise(resolve=>{const started=performance.now();const tick=()=>{inspect();if(predicate()&&performance.now()-started<ms)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
    let pending=true,steps=0,started=manual.now;
    const tick=()=>{inspect();if(predicate()&&manual.now-started<ms)requestAnimationFrame(tick);else pending=false;};
    requestAnimationFrame(tick);
    // Each call is the renderer's real rAF callback with a synthetic timestamp;
    // it renders and advances tray.update exactly as it would at 60 Hz.
    while(pending&&steps++<400)manual.step();
    if(pending)throw new Error(`manual rAF did not settle ${fixture}`);
    return Promise.resolve();
  };
  try{
    document.querySelector('#stage').replaceChildren();window.fx3d('ys:reveal-slot',{slot,ms:650});await observe(manual?850:700,()=>true);
    phase='flight';countFlightDt=true;window.fx3d('ys:reveal-result',kind==='normal'?{slot,winner}:kind==='transfer'?{slot,winner:0,transferTarget}:{slot,winner:0,destroy:true});await observe(1000,()=>true);
  }finally{tray.update=update;if(visibleDescriptor)Object.defineProperty(root,'visible',{...visibleDescriptor,value:rootVisible});else delete root.visible;}
  return {fixture,slot,kind,key,curseKind,renderedCurseKind,winner,transferTarget,fourSlotRender,rects:{felt,head:rect('#feltHead'),help:rect('#helpBtn'),skip:rect('#skipbtn'),north:rect('#north')},area,obstacles,summary,hiddenAfterObservation:!root.visible,terminal:{beforeHide:terminalBeforeHide,rendererDt:terminalDt,expectedSeconds:kind==='normal'?.86:kind==='transfer'?.72:.62},failures};
};

function verdict(row) {
  const expected=row.terminal.expectedSeconds,dt=row.terminal.rendererDt;
  const durationKept=Number.isFinite(dt)&&dt>=expected&&dt<expected+.13;
  const terminalOK=row.terminal.beforeHide?.lifecycle==='active'&&row.terminal.beforeHide.geometry;
  const scaleOK=row.kind!=='normal'||row.summary.launch?.scale?.every(n=>Math.abs(n-.7)<.001);
  return {...row,durationKept,terminalOK,scaleOK,pass:row.summary.push>0&&row.summary.flight>0&&row.hiddenAfterObservation&&terminalOK&&durationKept&&scaleOK&&!row.failures.length};
}
function caseMatrix(pool,curses) {
  // Retains the production seed-1 slot-2 fixture exactly as the original gate
  // did: it measures the already-rendered market item instead of substituting
  // an arbitrary member of POOL.
  const known={fixture:'known-normal-slot2-winner0',kind:'normal',key:'__current__',slot:2,winner:0};if(!all)return [known];
  const normal=pool.flatMap(it=>[0,1,2,3].flatMap(slot=>[0,1,2,3].map(winner=>({fixture:`normal:${it.key}:slot${slot}:winner${winner}`,kind:'normal',key:it.key,fac:it.fac,slot,winner}))));
  const curse=curses.flatMap(c=>[0,1,2,3].flatMap(slot=>[0,1,2,3].map(transferTarget=>({fixture:`transfer:${c.name}:slot${slot}:target${transferTarget}`,kind:'transfer',curseKind:c.curseKind,slot,transferTarget})).concat({fixture:`burn:${c.name}:slot${slot}`,kind:'burn',curseKind:c.curseKind,slot})));
  return [known,...normal,...curse];
}

const server=spawn('python',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});let browser;const pageErrors=[],results=[];
try{
  await new Promise(r=>setTimeout(r,900));browser=await chromium.launch({args:['--use-gl=angle','--use-angle=d3d11','--ignore-gpu-blocklist']});
  for(const view of VIEWPORTS){
    const context=await browser.newContext(view.device?{...devices[view.device],viewport:view.viewport}:{viewport:view.viewport});await context.addInitScript(()=>localStorage.setItem('yaoshi_intro_v1','1'));const page=await context.newPage();
    page.on('pageerror',e=>pageErrors.push({viewport:view.id,error:String(e)}));page.on('console',m=>{if(m.type()==='error')pageErrors.push({viewport:view.id,error:'console: '+m.text()});});
    await page.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});await page.waitForFunction(()=>!!window.__yaoshi3d?.tray&&!!window.__yaoshi,null,{timeout:60000});await toMark(page);
    await page.evaluate(safe=>['top','right','bottom','left'].forEach((side,i)=>document.documentElement.style.setProperty('--safe-'+side,safe[i]+'px')),view.safe);if(view.safe[3])await page.waitForFunction(()=>document.querySelector('#north')?.getBoundingClientRect().left>=59);
    if(all)await page.evaluate(async()=>{
      // Let the already-running renderer schedule twice natively. The second
      // renderer callback schedules its successor through this replacement,
      // so all following frames are the genuine frame() callback in our queue.
      const native=requestAnimationFrame.bind(window);await new Promise(native);
      const queue=[];let id=0;window.requestAnimationFrame=callback=>{queue.push(callback);return ++id;};
      await new Promise(native);
      const clock={now:performance.now(),step:()=>{const callbacks=queue.splice(0);if(!callbacks.length)throw new Error('manual rAF queue empty');clock.now+=1000/60;for(const callback of callbacks)callback(clock.now);}};
      window.__a1FramingClock=clock;
    });
    const assets=await page.evaluate(()=>({pool:POOL.map(it=>({key:it.ab||it.m,fac:it.f})),curses:CURSES.map(it=>({name:it.n,curseKind:curseKind(it)}))}));
    const validCurseKinds=new Set(['wedding','guava','water','lock','tiger','boat']);
    const invalidCurseKinds=assets.curses.filter(item=>!item.curseKind||!validCurseKinds.has(item.curseKind));
    if(invalidCurseKinds.length)throw new Error(`Missing or invalid curseKind assets: ${JSON.stringify(invalidCurseKinds)}`);
    const selected=caseMatrix(assets.pool,assets.curses).filter(testCase=>(!curseOnly||testCase.kind!=='normal')&&(!match||testCase.fixture.includes(match)));const ordered=limit===null?selected:selected.slice(0,limit);for(const testCase of(reverse?[...ordered].reverse():ordered)){const row=verdict(await page.evaluate(measureCase,testCase));row.viewport=view.id;results.push(row);if(!row.pass)console.error(`FAIL ${view.id} ${row.fixture}: geometry=${row.failures.length} terminal=${row.terminalOK} duration=${row.durationKept}`);}
    await context.close();
  }
}finally{await browser?.close();server.kill();}
const failures=results.filter(r=>!r.pass);const report={tool:'tests/tools/table-framing-check.mjs',mode:all?'all':'known',curseOnly,caseLimit:limit,caseMatch:match,simulatedClock:all?{stepMs:1000/60,pushObserveMs:850,note:'Runs the renderer frame callback and render through a controlled rAF queue; this is geometry coverage, not performance evidence.'}:null,renderStats:{source:'renderer.info.render snapshot with four identical tray items; not FPS evidence',samples:results.filter(r=>r.curseKind).map(r=>({viewport:r.viewport,fixture:r.fixture,curseKind:r.curseKind,...r.fourSlotRender}))},viewports:VIEWPORTS.map(v=>v.id),cases:results.length,passed:results.length-failures.length,failed:failures.length,pageErrors,failures:failures.map(r=>({viewport:r.viewport,fixture:r.fixture,slot:r.slot,kind:r.kind,terminal:r.terminal,failureCount:r.failures.length,firstFailure:r.failures[0]||null}))};
if(outFile){fs.mkdirSync(path.dirname(outFile),{recursive:true});fs.writeFileSync(outFile,JSON.stringify({report,results},null,2)+'\n');report.evidence=path.relative(ROOT,outFile).replaceAll('\\','/');}
console.log(JSON.stringify(report,null,2));if(failures.length||pageErrors.length)process.exitCode=1;

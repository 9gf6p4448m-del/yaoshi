// 軟體 GL 穩態探針：preview 頁 eye×8，暖機後取 fps() 5 次中位；用法 node sw-steady.mjs <decal 0|1> <port> [gl]
import path from 'node:path'; import { createRequire } from 'node:module';
const ROOT='C:/Users/shung/OneDrive/桌面/妖市'; const req=createRequire(path.join(ROOT,'tools/anyCreature/package.json')); const { chromium }=req('playwright');
const { serve } = await import('file:///C:/Users/shung/OneDrive/%E6%A1%8C%E9%9D%A2/%E5%A6%96%E5%B8%82/tests/tools/duel-drive.mjs');
const [decal='1', portS='8890', gl='swiftshader'] = process.argv.slice(2); const port=Number(portS);
const srv=await serve(ROOT,port);
try{
  const b=await chromium.launch({ args:['--use-gl=angle', gl==='swiftshader'?'--use-angle=swiftshader':'--use-angle=d3d11','--ignore-gpu-blocklist','--disable-gpu-vsync','--disable-frame-rate-limit'] });
  const page=await b.newPage({viewport:{width:844,height:390}}); const errs=[];
  page.on('pageerror',e=>errs.push(String(e))); page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/tests/tools/creature-preview.html?n=8&glb=eye.glb&decal=${decal}&light=1&fx=0&auto=0`,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__preview&&window.__preview.ready,null,{timeout:120000}); await page.evaluate(()=>window.__preview.ready);
  await page.evaluate(()=>window.__preview.setPhase('idle'));
  await page.waitForTimeout(12000); // 暖機：shader JIT 與首幀
  const s=[]; for(let i=0;i<5;i++){ await page.evaluate(()=>window.__preview.resetFps&&window.__preview.resetFps()); await page.waitForTimeout(2500); s.push(await page.evaluate(()=>window.__preview.fps())); }
  const gln=await page.evaluate(()=>{ try{ const c=document.querySelector('canvas').getContext('webgl2'); const d=c.getExtension('WEBGL_debug_renderer_info'); return c.getParameter(d.UNMASKED_RENDERER_WEBGL);}catch(e){return '?';} });
  s.sort((a,b)=>a-b); console.log(JSON.stringify({decal,gl,samples:s,median:s[2],calls:await page.evaluate(()=>window.__preview.drawCalls),errors:errs,gln}));
  await b.close();
} finally { srv.kill(); }

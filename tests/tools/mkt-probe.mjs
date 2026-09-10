/* 市集卡橫向溢出的一次性定位探針（請神 2.0 版面卷）：844×390 走到「蓋牌開標」那一頁，
   列出每一個右緣超出 #market 的元素，並在移除 .uline（部隊預覽那一行）之後再量一次
   ——用來回答「這 3px 是本來就有的，還是本卷加的那一行造成的」。純診斷、不判定。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
function loadChromium(){
  const c=[path.join(ROOT,'tools/anyCreature/package.json'),path.resolve(ROOT,'../../../tools/anyCreature/package.json')];
  for(const x of c) if(fs.existsSync(x)) return createRequire(x)('playwright').chromium;
  throw new Error('找不到 playwright');
}
const PORT=+(process.argv.find(a=>a.startsWith('--port='))||'--port=8995').split('=')[1];
const W=+(process.argv.find(a=>a.startsWith('--w='))||'--w=844').split('=')[1];
const H=+(process.argv.find(a=>a.startsWith('--h='))||'--h=390').split('=')[1];
const srv=spawn('python',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
await new Promise(r=>setTimeout(r,900));
const browser=await loadChromium().launch();
try{
  const ctx=await browser.newContext({viewport:{width:W,height:H},deviceScaleFactor:2});
  await ctx.addInitScript(()=>{try{localStorage.setItem('yaoshi_intro_v1','1');}catch(e){}});
  const page=await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});
  await page.waitForFunction('typeof window.__yaoshi === "object"');
  await page.evaluate(()=>{ CFG.T=1; window.__yaoshi.newGame('solo',1,['qingmian']); });
  const ROUND=+(process.argv.find(a=>a.startsWith('--round='))||'--round=1').split('=')[1];
  for(let i=0;i<1200;i++){
    await page.waitForTimeout(12);
    const st=await page.evaluate(`(()=>{const b=document.getElementById('mainbtn');const S=window.__yaoshi.S;
      return {t:b.textContent,d:b.disabled,r:S?S.round:0};})()`);
    if(/蓋牌開標/.test(st.t)&&st.r>=ROUND) break;
    if(!st.d) await page.click('#mainbtn');
    else await page.evaluate(`(()=>{const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled);if(e)e.click();})()`);
  }
  const scan=await page.evaluate(`(()=>{
    const m=document.getElementById('market'); const mr=m.getBoundingClientRect(); const rows=[];
    m.querySelectorAll('*').forEach(el=>{const r=el.getBoundingClientRect();
      if(r.right-mr.right>0.5||mr.left-r.left>0.5) rows.push({tag:el.tagName,cls:(el.className||'').toString().slice(0,30),
        l:+r.left.toFixed(1),rr:+r.right.toFixed(1),w:+r.width.toFixed(1),txt:(el.textContent||'').trim().slice(0,20)});});
    const cards=[...m.children].map(c=>({w:+c.getBoundingClientRect().width.toFixed(1),sw:c.scrollWidth,cw:c.clientWidth}));
    return {mkt:{sw:m.scrollWidth,cw:m.clientWidth},cards,rows};
  })()`);
  console.log(`視窗 ${W}×${H}`); console.log(JSON.stringify(scan,null,1));
  /* 直式：在**同一頁**改視窗大小再掃一次（直式沒辦法自己點到出價頁——#rotateHint 蓋板會攔掉點擊） */
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(400);
  const scanP=await page.evaluate(`(()=>{
    const m=document.getElementById('market'); const mr=m.getBoundingClientRect(); const rows=[];
    m.querySelectorAll('*').forEach(el=>{const r=el.getBoundingClientRect();
      if(r.right-mr.right>0.5||mr.left-r.left>0.5) rows.push({tag:el.tagName,cls:(el.className||'').toString().slice(0,30),
        l:+r.left.toFixed(1),rr:+r.right.toFixed(1),w:+r.width.toFixed(1),txt:(el.textContent||'').trim().slice(0,20)});});
    return {mkt:{sw:m.scrollWidth,cw:m.clientWidth,l:+mr.left.toFixed(1),r:+mr.right.toFixed(1)},rows};
  })()`);
  console.log('直式 390×844（同一頁）：',JSON.stringify(scanP,null,1));
  await ctx.close();
} finally { await browser.close(); srv.kill(); }

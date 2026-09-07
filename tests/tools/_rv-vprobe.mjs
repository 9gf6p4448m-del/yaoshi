/* 冷讀覆審：#felt 直向溢出（overflow-y:auto 把市集卡底部捲掉多少 px）＋ #vignette 疊層＋橫向溢出 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
function loadChromium(){ const c=[path.join(ROOT,'tools/anyCreature/package.json'),path.resolve(ROOT,'../../../tools/anyCreature/package.json')];
  for(const x of c) if(fs.existsSync(x)) return createRequire(x)('playwright').chromium; throw new Error('no playwright'); }
const argv=process.argv.slice(2); const opt={};
for(const a of argv){const m=a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if(m) opt[m[1]]=m[2]===undefined?true:m[2];}
const PORT=+(opt.port||9041), SEED=+(opt.seed||1), QS=opt.qs||'';
const SCAN=`(()=>{const f=document.getElementById('felt'),t=document.getElementById('table');
 const fr=f.getBoundingClientRect(), tr=t.getBoundingClientRect();
 const mk=document.getElementById('market');
 const cards=mk?[...mk.querySelectorAll('.mcard')].map(c=>{const r=c.getBoundingClientRect();
   return {nm:(c.querySelector('.nm')||{}).textContent||'', bottom:+r.bottom.toFixed(1), cutY:+(r.bottom-fr.bottom).toFixed(1)};}):[];
 const over=[]; document.querySelectorAll('#table *').forEach(el=>{const r=el.getBoundingClientRect();
   if(r.width===0&&r.height===0)return; const o=r.right-tr.right, l=tr.left-r.left;
   if(o>0.5||l>0.5) over.push({id:el.id||'',cls:(el.className||'').toString().slice(0,30),overR:+o.toFixed(1),overL:+l.toFixed(1)});});
 const vg=document.getElementById('vignette'); const sh=document.getElementById('shrines');
 return {round:window.__yaoshi.S?window.__yaoshi.S.round:0,
  feltH:f.clientHeight, feltScrollH:f.scrollHeight, vOver:f.scrollHeight-f.clientHeight,
  scrollTop:f.scrollTop, cards, hOver:over,
  shrinesIn: sh?(sh.parentElement.id||sh.parentElement.className):null,
  shrinesZ: sh?getComputedStyle(sh).zIndex:null,
  vignetteZ: vg?getComputedStyle(vg).zIndex:null, vignettePos: vg?getComputedStyle(vg).position:null};})()`;
const main=async()=>{
  const srv=spawn('python',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
  await new Promise(r=>setTimeout(r,1200));
  const browser=await loadChromium().launch();
  try{
    const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2});
    await ctx.addInitScript(()=>{try{localStorage.setItem('yaoshi_intro_v1','1');}catch(e){}});
    const page=await ctx.newPage();
    page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE-ERR:',m.text());});
    await page.goto(`http://127.0.0.1:${PORT}/index.html${QS}`,{waitUntil:'load'});
    await page.waitForFunction('typeof window.__yaoshi === "object"',{timeout:20000});
    await page.evaluate(sd=>{CFG.T=1; const F=window.__yaoshi.PW_FX; for(const k of Object.keys(F)) if(/_MS$/.test(k)) F[k]=1;
      window.__yaoshi.newGame('solo',sd,['qingmian']);},SEED);
    const seen={}; const out=[];
    for(let step=0;step<900;step++){
      await page.waitForTimeout(12);
      const st=await page.evaluate(`(()=>{const b=document.getElementById('mainbtn');
        return{txt:b?b.textContent:'',dis:b?b.disabled:true,round:window.__yaoshi.S?window.__yaoshi.S.round:0};})()`);
      const key=`${st.round}｜${st.txt}`;
      if(!st.dis&&!seen[key]){ seen[key]=true;
        const s=await page.evaluate(SCAN);
        if(s.vOver>0.5||s.hOver.length){ out.push({key,...s}); }
        if(/盯上|出價|封標/.test(st.txt)||s.vOver>0.5){ await page.screenshot({path:path.join(ROOT,`_rv-shot-r${st.round}-${step}.png`)}); }
      }
      if(st.txt==='再入妖市')break;
      if(st.round>+(opt.rounds||2))break;
      if(!st.dis) await page.click('#mainbtn');
      else{ const hit=await page.evaluate(`(()=>{const els=[...document.querySelectorAll('#stage button')];
        const b=els.find(e=>/passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick')||''))||els.find(e=>!e.disabled);
        if(!b)return null;b.click();return 1;})()`); if(!hit) await page.waitForTimeout(20); }
    }
    out.forEach(o=>{ console.log(`\n=== ${o.key}  #felt client=${o.feltH} scroll=${o.feltScrollH} → 直向溢出 ${o.vOver}px (scrollTop=${o.scrollTop})`);
      console.log('   神龕列父層=',o.shrinesIn,' z=',o.shrinesZ,' vignette z=',o.vignetteZ,o.vignettePos);
      o.cards.forEach(c=>console.log(`   卡「${c.nm}」底部超出 #felt 可視區 ${c.cutY}px`));
      o.hOver.forEach(h=>console.log('   橫向溢出:',JSON.stringify(h))); });
    if(!out.length) console.log('（沒有量到任何直向或橫向溢出）');
    await ctx.close();
  } finally { await browser.close(); srv.kill(); }
};
main().catch(e=>{console.error(e);process.exit(2);});

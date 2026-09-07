/* #felt 直向溢出定位探針（請神 2.0 版面卷，凍結檔 §2.1 修訂四）
   跑法：node tests/tools/felt-probe.mjs [--port=8858] [--seed=1] [--rounds=3] [--tag=mine]
   做的事：844×390 開一局，走到第 1～3 夜的「盯上宣告」與「出價」兩頁，各量一次
     #felt.scrollHeight − clientHeight，並把 #felt 的每個直接子元素的高度列出來
     ——直接指出高度被誰吃掉，不用猜。
   純診斷、不判定；判定在 legend-drive.mjs。
   ★要量基準版時★：把基準的 index.html 換上去再跑（換回來的責任在呼叫端），
   本檔不碰版控、不改任何檔。 */
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
const argv=process.argv.slice(2); const opt={};
for(const a of argv){ const m=a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if(m) opt[m[1]]=m[2]===undefined?true:m[2]; }
const PORT=+(opt.port||8858), SEED=+(opt.seed||1), ROUNDS=+(opt.rounds||3), TAG=opt.tag||'mine';

const MEASURE=`(() => {
  const f=document.getElementById('felt'); if(!f) return null;
  const kids=[...f.children].map(el=>({ id: el.id||('.'+(el.className||'').toString().split(' ')[0]),
    h:+el.getBoundingClientRect().height.toFixed(1) }));
  return { scrollH:f.scrollHeight, clientH:f.clientHeight, over:f.scrollHeight-f.clientHeight, kids };
})()`;

const main=async()=>{
  const srv=spawn('python',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
  await new Promise(r=>setTimeout(r,900));
  const browser=await loadChromium().launch();
  try{
    const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2});
    await ctx.addInitScript(()=>{try{localStorage.setItem('yaoshi_intro_v1','1');}catch(e){}});
    const page=await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});
    await page.waitForFunction('typeof window.__yaoshi === "object"',{timeout:20000});
    const ver=await page.evaluate('VERSION');
    console.log(`# felt 直向探針　tag=${TAG}　頁面 VERSION=${ver}　seed=${SEED}`);
    await page.evaluate(sd=>{ CFG.T=1;
      const F=window.__yaoshi.PW_FX; for(const k of Object.keys(F)) if(/_MS$/.test(k)) F[k]=1;
      window.__yaoshi.newGame('solo',sd,['qingmian']); },SEED);
    const seen={};
    for(let i=0;i<1500;i++){
      await page.waitForTimeout(12);
      const st=await page.evaluate(`(()=>{const b=document.getElementById('mainbtn');const S=window.__yaoshi.S;
        return {t:b?b.textContent:'',d:b?b.disabled:true,r:S?S.round:0};})()`);
      if(st.r>ROUNDS) break;
      const key=`${st.r}｜${st.t}`;
      if(!st.d && !seen[key] && /蓋牌|不盯任何一件/.test(st.t)){
        seen[key]=1;
        const m=await page.evaluate(MEASURE);
        console.log(`- 第 ${st.r} 夜「${st.t}」：scrollH ${m.scrollH} / clientH ${m.clientH} → **溢出 ${m.over}**`);
        console.log(`    子元素高度：${m.kids.map(k=>`${k.id} ${k.h}`).join('　')}`);
      }
      if(!st.d) await page.click('#mainbtn');
      else await page.evaluate(`(()=>{const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled);if(e)e.click();})()`);
    }
    await ctx.close();
  } finally { await browser.close(); srv.kill(); }
};
main().catch(e=>{ console.error(e); process.exit(2); });

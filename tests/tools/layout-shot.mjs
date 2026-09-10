/* 版面截圖治具（請神 2.0 版面卷；凍結檔 G7／G11 的人眼證據。掏空卷 v0.55a 加 --sel=）
   跑法：node tests/tools/layout-shot.mjs <png 前綴> [--port=8890] [--seed=1] [--sel=#market]
   --sel=<逗號分隔>：拍「市集卡特寫」時要框住哪個容器。**#market 這個 id 在掏空頁退役**（卡片退到 #railW／#railE），
     所以這裡改吃旗標而不是寫死；預設 `#market`＝v0.53 行為，掏空版傳 `--sel=#west,#east`。
     檔名由選擇器去掉標點得來（`#market`→`-market.png`、`#west`→`-west.png`）。
   拍五張 844×390（＋一張 390×844 直式）：
     -n1        第 1 夜「出價」頁（北家在頂端正中、三龕整排在法寶卡正上方、盯上說明完整版）
     -mark2     第 2 夜「盯上宣告」頁（說明已收成一行）
     -preshrine 請神夜前一夜的「出價」頁（神龕卡寫「倒數 1 夜」）
     -bag       袋子面板（部隊預覽：逐件隻數／攻／血／拍／招式＋總計一行）
     -market    出價頁的市集卡特寫（每張卡的招式一行）
     -portrait  直式（產品蓋「請轉橫」，蓋板行為不得變）
   純截圖，不判定；判定在 legend-drive.mjs（0 error＋溢出）與人眼。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
function loadChromium(){
  const c=[path.join(ROOT,'tools/anyCreature/package.json'),path.resolve(ROOT,'../../../tools/anyCreature/package.json')];
  for(const x of c) if(fs.existsSync(x)) return createRequire(x)('playwright').chromium;
  throw new Error('找不到 playwright（試過：'+c.join('、')+'）');
}
const argv=process.argv.slice(2); const opt={}; const pos=[];
for(const a of argv){ const m=a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if(m) opt[m[1]]=m[2]===undefined?true:m[2]; else pos.push(a); }
const OUT=pos[0]||path.join(ROOT,'layout');
const PORT=+(opt.port||8890), SEED=+(opt.seed||1);
const CLOSE_SELS=String(opt.sel||'#market').split(',').map(x=>x.trim()).filter(Boolean);
const selName=s=>s.replace(/[^A-Za-z0-9_-]/g,'')||'close';

const main=async()=>{
  const srv=spawn('python',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
  await new Promise(r=>setTimeout(r,900));
  const browser=await loadChromium().launch();
  const errs=[]; const shots=[];
  try{
    const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2});
    await ctx.addInitScript(()=>{try{localStorage.setItem('yaoshi_intro_v1','1');}catch(e){}});
    const page=await ctx.newPage();
    page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
    page.on('pageerror',e=>errs.push(String(e)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});
    await page.waitForFunction('typeof window.__yaoshi === "object"',{timeout:20000});
    /* ★守衛：確認瀏覽器拿到的真的是這個 worktree 的檔★
       踩過的坑：port 被別的（指向主 repo 的）http.server 佔住時，`spawn` 會靜默失敗、
       瀏覽器連上的是**舊版**，截出來的圖看起來像「改動沒生效」。這裡直接比對 VERSION。 */
    const want=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').match(/const VERSION="([0-9.]+)"/)[1];
    const got=await page.evaluate('VERSION');
    if(got!==want) throw new Error(`拿到的不是這個 worktree 的檔：頁面 VERSION=${got}，檔案 VERSION=${want}（port ${PORT} 可能被別的 http.server 佔住了，換一個 --port 再跑）`);
    await page.evaluate(sd=>{ CFG.T=1;
      const F=window.__yaoshi.PW_FX; for(const k of Object.keys(F)) if(/_MS$/.test(k)) F[k]=1;
      window.__yaoshi.newGame('solo',sd,['qingmian']); },SEED);
    const state=()=>page.evaluate(`(()=>{const b=document.getElementById('mainbtn');const S=window.__yaoshi.S;
      return {t:b?b.textContent:'',d:b?b.disabled:true,round:S?S.round:0,
        nights:S&&S.shrines?S.shrines.filter(s=>s.open).map(s=>s.night):[]};})()`);
    const step=async()=>{ const st=await state();
      if(!st.d) await page.click('#mainbtn');
      else await page.evaluate(`(()=>{const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled);if(e)e.click();})()`);
      await page.waitForTimeout(15); return st; };
    const shot=async(name)=>{ const p=`${OUT}-${name}.png`; await page.screenshot({path:p}); shots.push(p); };
    /* ① 第 1 夜出價頁 */
    for(let i=0;i<400;i++){ const st=await state(); if(st.round===1&&/蓋牌/.test(st.t)) break; await step(); }
    await page.waitForTimeout(400); await shot('n1');
    /* ①b 市集卡特寫（同一頁，只截 --sel 指的那一塊；掏空版是左右兩條側欄卡列） */
    for(const sel of CLOSE_SELS){
      const el=await page.$(sel);
      if(el){ const p=`${OUT}-${selName(sel)}.png`; await el.screenshot({path:p}); shots.push(p); }
      else console.log(`- （--sel ${sel} 在這一版不存在，跳過）`);
    }
    /* ② 第 2 夜盯上宣告頁（說明收成一行） */
    for(let i=0;i<600;i++){ const st=await state(); if(st.round===2&&/不盯任何一件/.test(st.t)) break; await step(); }
    await page.waitForTimeout(300); await shot('mark2');
    /* ③ 請神夜前一夜的出價頁（最早那一龕的 night−1） */
    for(let i=0;i<2000;i++){
      const st=await state();
      const next=st.nights.length?Math.min(...st.nights):0;
      if(next&&st.round===next-1&&/蓋牌/.test(st.t)) break;
      if(!next) break;
      await step();
    }
    await page.waitForTimeout(300); await shot('preshrine');
    /* ③b 袋子面板（部隊預覽）——拍**袋子最滿的那一席**：治具不出價，南家整局是空袋，
       拍空袋看不出「為什麼輸」那件事（這一卷加部隊預覽就是為了回答它）。 */
    await page.evaluate(`(()=>{ const S=window.__yaoshi.S;
      let best=0; S.players.forEach(p=>{ if(p.bag.length>S.players[best].bag.length) best=p.id; });
      showBag(best); })()`); await page.waitForTimeout(250); await shot('bag');
    await page.evaluate(`(()=>{ closeModal(); })()`); await page.waitForTimeout(120);
    /* ④ 直式 */
    await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(400); await shot('portrait');
    await ctx.close();
  } finally { await browser.close(); srv.kill(); }
  console.log('# 版面截圖（請神 2.0，G7／G11）');
  shots.forEach(s=>console.log('- '+path.relative(ROOT,s)));
  console.log(`- console error ${errs.length} ${errs.length?'❌':'✅'}`);
  errs.slice(0,5).forEach(e=>console.log('    '+e));
};
main().catch(e=>{ console.error(e); process.exit(2); });

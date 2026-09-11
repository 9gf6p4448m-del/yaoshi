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
/* 預設＝掏空版現行的側欄卡列（0.56a 二版，覆審 MEDIUM-1）；量 `?table3d=0`／v0.53 要自己帶 --sel=#market。
   沿革：一版預設 `#market`，在掏空版少拍一張卡片特寫卻**照樣 exit 0**，下一手照抄舊指令不會發現。 */
const CLOSE_SELS=String(opt.sel||'#railW,#railE').split(',').map(x=>x.trim()).filter(Boolean);
const selName=s=>s.replace(/[^A-Za-z0-9_-]/g,'')||'close';

const main=async()=>{
  const srv=spawn('python',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
  await new Promise(r=>setTimeout(r,900));
  const browser=await loadChromium().launch();
  const errs=[]; const shots=[]; let shwide=null;
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
    /* 請神夜清單：3.0（v0.53）把「尊→夜」整組拿掉了（GUIDE §11.26 第 1 點），`sh.night` 不再存在——
       舊寫法 `S.shrines.map(s=>s.night)` 會全拿到 undefined、`Math.min(...)` 變 NaN，
       ③ 那一張於是直接 break 掉、拍出跟 ② 一模一樣的畫面（掏空卷 v0.55a 的 contact sheet 才發現）。
       改問唯一事實來源 `CFG.SHRINE_NIGHTS`（`isShrineNight` 等三支問的也是它）。 */
    const state=()=>page.evaluate(`(()=>{const b=document.getElementById('mainbtn');const S=window.__yaoshi.S;
      return {t:b?b.textContent:'',d:b?b.disabled:true,round:S?S.round:0,
        nights:(typeof CFG!=='undefined'&&CFG.SHRINE_NIGHTS)?CFG.SHRINE_NIGHTS.slice():[]};})()`);
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
      if(!el) throw new Error(`--sel 指到的容器在這一版不存在：${sel}——少拍一張圖不得靜默通過。`
        +`（掏空版用預設 #railW,#railE；?table3d=0／v0.53 請帶 --sel=#market）`);
      const p=`${OUT}-${selName(sel)}.png`; await el.screenshot({path:p}); shots.push(p);
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
    /* ③b 待請卡截斷量測（0.56a 二版，使用者裁乙）：請神夜前一夜是 `#shrines.wide`——
       尊名（`.shn`）／系別 chip（`.shfac`）／招式名（`.shmove`）三樣都不許被 ellipsis 切掉。
       量的是 `scrollWidth > clientWidth`，不是看圖。 */
    shwide=await page.evaluate(`(()=>{
      const sh=document.getElementById('shrines');
      /* 0.56a 三版（覆審 R2 LOW-C）：一版的 g() 找不到元素就回 null，而收尾判定是 \`r[k] && r[k].cut\`
         ⇒ **欄位缺席＝被當成沒被切**；而且 inline 的 .shfac 在非 flex 的 .shname 裡 scrollWidth／clientWidth
         都回 0、\`0 > 0.5\` 恆假 ⇒ 三欄裡只有 .shmove 真的有鑑別力。
         現在：**必填欄位（.shname／.shn／.shfac／.shmove）缺席或量不到，一律算 cut（紅）**；
         .shtaken 是選配（只有被請走的尊才有），有才判。 */
      const rows=[...document.querySelectorAll('.shcard')].map(c=>{
        const g=(s,req)=>{const e=c.querySelector(s);
          if(!e) return {miss:true,req:!!req,cut:!!req,why:'缺席'};
          const sw=e.scrollWidth, cw=e.clientWidth;
          if(req && sw===0 && cw===0) return {sw,cw,req:true,cut:true,why:'量不到（0/0，八成不是 block／flex 項目）',txt:(e.textContent||'').trim().slice(0,10)};
          return {sw,cw,req:!!req,cut:sw>cw+0.5,txt:(e.textContent||'').trim().slice(0,10)};};
        return {w:+c.getBoundingClientRect().width.toFixed(1),
          shname:g('.shname',1),shn:g('.shn',1),shfac:g('.shfac',1),shmove:g('.shmove',1),shtaken:g('.shtaken',0)};
      });
      const slot=document.getElementById('northShr');
      return {mode:sh?(sh.className||''):'(no #shrines)', slotW:slot?+slot.getBoundingClientRect().width.toFixed(1):null,
        northOver:(()=>{const n=document.getElementById('north');return n?n.scrollHeight-n.clientHeight:null;})(), rows};
    })()`);
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
  const SHK=['shname','shn','shfac','shmove','shtaken'];
  if(shwide){
    const cut=shwide.rows.flatMap(r=>SHK.filter(k=>r[k]&&r[k].cut)
      .map(k=>`${k}(${r[k].why?r[k].why:`"${r[k].txt}" ${r[k].sw}/${r[k].cw}`})`));
    console.log(`- 請神夜前一夜的待請卡（#shrines class="${shwide.mode}"，北列格 ${shwide.slotW}px，#north 直向溢出 ${shwide.northOver}）：`
      +`三張卡寬 ${shwide.rows.map(r=>r.w).join('/')}　**被切掉／量不到的欄位 ${cut.length} 個** ${cut.length?'❌ '+cut.join('　'):'✅'}`);
    shwide.rows.forEach((r,i)=>console.log(`    卡 ${i+1}：`
      +SHK.map(k=>{const v=r[k]; if(!v) return `${k} —`;
        if(v.miss) return `${k} ${v.req?'缺席❌':'—（選配）'}`;
        return `${k} ${v.sw}/${v.cw}${v.cut?'❌'+(v.why?`(${v.why})`:''):'✅'}`;}).join('　')));
  }
  console.log(`- console error ${errs.length} ${errs.length?'❌':'✅'}`);
  errs.slice(0,5).forEach(e=>console.log('    '+e));
  if(!shwide){ console.log('- ❌ 沒量到請神夜前一夜的待請卡（那一張根本沒走到）'); process.exitCode=1; }
  else if(shwide.rows.length===0){ console.log('- ❌ 待請卡一張都沒有'); process.exitCode=1; }
  else if(shwide.rows.some(r=>SHK.some(k=>r[k]&&r[k].cut))) process.exitCode=1;
  else if(shwide.northOver!==0){ console.log(`- ❌ 那一夜 #north 直向溢出 ${shwide.northOver}`); process.exitCode=1; }
};
main().catch(e=>{ console.error(e); process.exit(2); });

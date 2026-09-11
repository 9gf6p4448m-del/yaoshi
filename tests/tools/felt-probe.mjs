/* 版面直向溢出定位探針（請神 2.0 版面卷，凍結檔 §2.1 修訂四；掏空卷 v0.55a 加 --sel=）
   跑法：node tests/tools/felt-probe.mjs [--port=8858] [--seed=1] [--rounds=3] [--tag=mine]
                                        [--sel=#felt,#west,#east,#north]
   做的事：844×390 開一局，走到第 1～3 夜的「盯上宣告」與「出價」兩頁，對 --sel 的**每一個**容器各量一次
     scrollHeight − clientHeight，並把該容器的每個直接子元素的高度列出來
     ——直接指出高度被誰吃掉，不用猜。
   ★--sel 是收斂而不是新寫探針★（02 §6.1 第 7 條）：掏空之後吃高度的地方從 #felt 搬到了 #west／#east／#north，
   一支探針量四個容器、分母歸 1；不帶 --sel 時預設 `#felt`，與 v0.53 的行為逐字相同。
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
/* --rounds 預設 3 → **7**（三版，覆審 R2 HIGH-A 的配套；加嚴，自行記錄）：
   第 7 夜是 `RULE_NIGHTS [3,7]` 與 `SHRINE_NIGHTS [5,8,11]` 的前一夜**同時成立**的那一格，
   也是北列高度最緊的一夜；預設只跑到第 3 夜的話這個縫永遠沒有閘門守著（R2 就是從這裡抓到 17px 溢出的）。 */
const PORT=+(opt.port||8858), ROUNDS=+(opt.rounds||7), TAG=opt.tag||'mine';
/* --steps=<上限>：每一顆 seed 的內層步數上限（四版，覆審 R3 MEDIUM-F）。跑滿會**明白印出「沒打完」**，不再靜默。 */
const STEPS=+(opt.steps||1500);
/* --sel=<逗號分隔的選擇器>：**預設就是掏空版現行的四個容器**（0.56a 二版，覆審 MEDIUM-1）。
   沿革：一版的預設是 `#felt` 一個，下一手不帶旗標跑就只量到四分之一而不自知。
   多容器時 JSON 表的鍵一律帶容器前綴（`#felt|seed|round|page`），legend-drive 的 --base= 兩種鍵都吃。 */
const SELS=String(opt.sel||'#felt,#west,#east,#north').split(',').map(x=>x.trim()).filter(Boolean);
/* --root=<靜態根目錄>：量**基準版**時用——把基準的 index.html 放進另一個目錄（js/assets 用 junction 接回來），
   本檔就不必動 worktree 的 index.html（02 §6.1 第 1 條：不做反向 sed、原檔全程唯讀）。 */
const SERVE_ROOT=opt.root||ROOT;
/* --seeds=1,3（凍結檔 §2.1 修訂四二版的量測條件：844×390、**dpr=2**、seeds 1 與 3）；--seed= 是單顆的舊寫法 */
const SEEDS=(opt.seeds||String(opt.seed||1)).split(',').map(Number);
const JSONOUT=opt.json||null;   /* 落成 {"<seed>|<round>|出價|盯上": over} 的表，給 legend-drive.mjs 當 --base= */

const MEASURE=(sels)=>`(() => {
  const out={};
  for(const sel of ${JSON.stringify(sels)}){
    const f=document.querySelector(sel);
    if(!f){ out[sel]=null; continue; }
    const kids=[...f.children].map(el=>({ id: el.id||('.'+(el.className||'').toString().split(' ')[0]),
      h:+el.getBoundingClientRect().height.toFixed(1) }));
    out[sel]={ scrollH:f.scrollHeight, clientH:f.clientHeight, over:f.scrollHeight-f.clientHeight, kids };
  }
  return out;
})()`;

const main=async()=>{
  const srv=spawn('python',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:SERVE_ROOT,stdio:'ignore'});
  await new Promise(r=>setTimeout(r,900));
  const browser=await loadChromium().launch();
  try{
    const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2});
    await ctx.addInitScript(()=>{try{localStorage.setItem('yaoshi_intro_v1','1');}catch(e){}});
    const page=await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});
    await page.waitForFunction('typeof window.__yaoshi === "object"',{timeout:20000});
    const ver=await page.evaluate('VERSION');
    console.log(`# 版面直向探針　tag=${TAG}　頁面 VERSION=${ver}　seeds=${SEEDS.join(',')}　sel=${SELS.join(',')}　844×390 dpr=2　root=${SERVE_ROOT}`);
    const out={}; const ends=[];
    for(const SEED of SEEDS){
      await page.evaluate(sd=>{ CFG.T=1;
        const F=window.__yaoshi.PW_FX; for(const k of Object.keys(F)) if(/_MS$/.test(k)) F[k]=1;
        window.__yaoshi.newGame('solo',sd,['qingmian']); },SEED);
      const seen={};
      /* 四版（覆審 R3 MEDIUM-F）：內層迴圈跑滿 STEPS 就**靜默**離開，量到的夜數看起來像「整局」其實是截斷——
         與 R1-MEDIUM-1 修掉的「治具靜默失敗」同一類。現在把三種收工理由記下來、收尾明白印出來；
         `--steps=` 可以放寬上限。**不改任何門檻**：截斷不會讓紅變綠（量到的格子照樣逐格判），只是不再假裝跑完了。 */
      let why='（還在跑）', lastR=0;
      for(let i=0;i<STEPS;i++){
        await page.waitForTimeout(12);
        const st=await page.evaluate(`(()=>{const b=document.getElementById('mainbtn');const S=window.__yaoshi.S;
          return {t:b?b.textContent:'',d:b?b.disabled:true,r:S?S.round:0};})()`);
        lastR=st.r||lastR;
        if(st.r>ROUNDS){ why=`跑到 --rounds=${ROUNDS} 的上限（第 ${st.r} 夜）`; break; }
        /* 局末（主按鈕變「再入妖市」，按下去是 location.reload()）就收工——
           `--rounds=12` 時 `st.r>ROUNDS` 永遠不成立，不擋的話會一路點到重載、然後 click 逾時（三版踩過）。 */
        if(/再入妖市/.test(st.t)){ why=`這一局打完了（局末，第 ${st.r} 夜）`; break; }
        if(i===STEPS-1) why=`**步數跑滿 ${STEPS} 仍未結束（這一局沒打完，停在第 ${st.r} 夜）**`;
        const page2=/蓋牌/.test(st.t)?'出價':'盯上';
        const key=`${st.r}｜${st.t}`;
        if(!st.d && !seen[key] && /蓋牌|不盯任何一件/.test(st.t)){
          seen[key]=1;
          const all=await page.evaluate(MEASURE(SELS));
          for(const sel of SELS){
            const m=all[sel];
            const key=SELS.length>1?`${sel}|${SEED}|${st.r}|${page2}`:`${SEED}|${st.r}|${page2}`;
            /* 找不到容器一律炸掉（0.56a 二版，覆審 MEDIUM-1）：一版只印一行「這一版沒有這個容器」就繼續，
               量不到的格子在收尾表裡被當成「沒問題」——那是靜默失敗。 */
            if(!m) throw new Error(`--sel 指到的容器在這一版不存在：${sel}（seed ${SEED} 第 ${st.r} 夜「${st.t}」）。`
              +`量基準版請帶 --sel=#felt（v0.53 沒有 #railW／#northPrev 那些）。`);
            out[key]=m.over;
            console.log(`- ${sel} seed ${SEED} 第 ${st.r} 夜「${st.t}」：scrollH ${m.scrollH} / clientH ${m.clientH} → **溢出 ${m.over}**`);
            console.log(`    子元素高度：${m.kids.map(k=>`${k.id} ${k.h}`).join('　')}`);
          }
        }
        if(!st.d) await page.click('#mainbtn');
        else await page.evaluate(`(()=>{const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled);if(e)e.click();})()`);
      }
      ends.push({seed:SEED,why,lastR});
      console.log(`- seed ${SEED} 收工：${why}`);
    }
    /* 四版（R3 MEDIUM-F）：把「這一局怎麼收工的」印在收尾表旁邊——
       報告不得再把「跑滿步數就停」寫成「整局」。 */
    console.log(`- **每一顆 seed 的收工理由**：${ends.map(e=>`seed ${e.seed} → ${e.why}`).join('；')}`);
    if(ends.some(e=>/步數跑滿/.test(e.why)))
      console.log(`  ★注意：上面有 seed 是**步數跑滿**才停的，那一局沒打完——要跑完整局請加大 --steps=（目前 ${STEPS}）。`);
    /* 收尾一眼表：每個容器的格數、最大溢出、非 0 的格數（T2／T3 直接讀這三個數字） */
    for(const sel of SELS){
      const keys=Object.keys(out).filter(k=>SELS.length>1?k.indexOf(sel+'|')===0:true);
      const vals=keys.map(k=>out[k]).filter(v=>v!=null);
      console.log(`- **${sel}**：${keys.length} 格　最大溢出 ${vals.length?Math.max(...vals):'—'}　非 0 的格數 ${vals.filter(v=>v>0).length}`);
    }
    if(JSONOUT){ fs.writeFileSync(JSONOUT,JSON.stringify(out,null,1),'utf8'); console.log('- JSON →',JSONOUT); }
    await ctx.close();
  } finally { await browser.close(); srv.kill(); }
};
main().catch(e=>{ console.error(e); process.exit(2); });

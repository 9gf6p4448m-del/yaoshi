// 相位閘 sigOf 落點裝飾探針：手指下的 .iico 小圖被移除後，同一顆按鈕的 onclick 沒變，不得武裝相位閘（exit 0＝不武裝＝綠）
// 用法：node tests/tools/sigof-decoration-probe.mjs <repo 根> [頁面檔名]；修前 index.html（ae92bf2a）exit 1
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.argv[2], PAGE = process.argv[3] || 'index.html';
const cands=[path.join(ROOT,'tools/anyCreature/package.json'),path.resolve(ROOT,'../../../tools/anyCreature/package.json')];
const pk=cands.find(c=>fs.existsSync(c)); if(!pk) throw new Error('找不到 playwright：'+cands.join('、'));
const chromium = createRequire(pk)('playwright').chromium;
const srv = spawn('python', ['-m','http.server','9733','--bind','127.0.0.1'], {cwd:ROOT, stdio:'ignore'});
await new Promise(r=>setTimeout(r,900));
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:844,height:390}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
await p.goto(`http://127.0.0.1:9733/${PAGE}?pic=1`); await p.waitForTimeout(1500);
// 場景：卡片(onclick)內含 img.pic；第一下點在 img 上，handler 之後 img 被移除（= onerror this.remove 的效果），
// 手指下能做的事（卡片 onclick）完全沒變。期望：不武裝相位閘（PHASE_AT 不變）。
const r = await p.evaluate(async ()=>{
  const d=document.createElement('div');
  d.style.cssText='position:fixed;left:100px;top:100px;width:200px;height:120px;background:#444;z-index:99999';
  d.setAttribute('onclick','window.__hit=(window.__hit|0)+1');
  d.innerHTML='<img class="iico pic" style="width:100px;height:100px" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="">';
  document.body.appendChild(d);
  const img=d.querySelector('img');
  d.addEventListener('click',()=>{ img.remove(); }); // 與 armIfSwitched 同一任務：卡片 handler 先於 document bubble 監聽
  window.__before=PHASE_AT;
  return {x:150,y:150};
});
await p.mouse.click(r.x,r.y);
await p.waitForTimeout(50);
const after = await p.evaluate(()=>({armed: PHASE_AT!==window.__before, hit: window.__hit, PHASE_AT, before: window.__before, top: document.elementFromPoint(150,150)&&document.elementFromPoint(150,150).outerHTML.slice(0,80), pend: String(PENDING_PT)}));
console.log(JSON.stringify({...after, errs}));
await b.close(); srv.kill();
process.exit(after.armed?1:0);

import {createRequire} from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const packages=[path.join(root,'tools/anyCreature/package.json'),
  path.resolve(root,'../../tools/anyCreature/package.json'),
  path.resolve(root,'../../../tools/anyCreature/package.json')];
const pkg=packages.find(fs.existsSync);
if(!pkg) throw Error('Playwright runtime unavailable');
const {chromium}=createRequire(pkg)('playwright');
const size=process.argv[2]||'844x390';
const match=/^(\d{3,4})x(\d{3,4})$/.exec(size);
if(!match) throw Error('viewport must be WIDTHxHEIGHT');
const viewport={width:Number(match[1]),height:Number(match[2])};
const output=path.join(root,'docs/experiments/2026-09-23-destiny-evidence');
fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary',
  '.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer((request,response)=>{
  let name;
  try{name=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch(e){response.writeHead(400).end();return;}
  const file=path.resolve(root,`.${name==='/'?'/index.html':name}`);
  if(file!==path.join(root,'index.html')&&!file.startsWith(root+path.sep)){
    response.writeHead(403).end();return;
  }
  let stats;
  try{stats=fs.statSync(file);}catch(e){response.writeHead(404).end();return;}
  if(!stats.isFile()){response.writeHead(404).end();return;}
  response.setHeader('content-type',mime[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});
let browser;
try{
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });
  const port=server.address().port;
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport,deviceScaleFactor:2});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  const response=await page.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:'domcontentloaded'});
  if(response.status()!==200) throw Error(`unexpected product response ${response.status()}`);
  await page.waitForFunction(()=>!!window.__yaoshi);
  await page.evaluate(()=>{
    window.__yaoshi.newGame('solo',321,['qingmian']);
    PRIVATE_PHASE='market';
    showBag(0);
  });
  const privateLayout=await page.evaluate(()=>{
    const details=document.querySelector('#modalbox .chainDetails');
    const close=document.querySelector('#modalbox button.bigbtn');
    const summary=document.querySelector('#modalbox .bagsum');
    return {collapsed:details&&!details.open,closeVisible:close&&close.getBoundingClientRect().bottom<=innerHeight,
      summaryHeight:summary&&summary.getBoundingClientRect().height};
  });
  if(!privateLayout.collapsed||!privateLayout.closeVisible||privateLayout.summaryHeight>140)
    throw Error(`unreadable private bag layout: ${JSON.stringify(privateLayout)}`);
  await page.screenshot({path:path.join(output,`c-private-letter-${size}.png`)});
  await page.evaluate(()=>{
    closeModal();
    const g=window.__yaoshi,p=g.S.players[0];
    p.destiny='water';p.bag=[{...g.POOL.find(x=>x.ab==='boat')}];
    g.S.market=[{...g.POOL.find(x=>x.ab==='buoy')}];
    g.S.players.forEach(seat=>{seat.ai=null;seat.life=60;});
    g.S.humanBids={0:[{amt:4,type:'cons',intent:'keep',target:null}]};
    const result=g.resolveAuction()[0];
    g.publishDestinyReveal(result);
    showBag(0);
  });
  await page.screenshot({path:path.join(output,`c-revealed-letter-${size}.png`)});
  await page.evaluate(()=>{
    closeModal();
    window.__yaoshi.newGame('solo',322,['qingmian']);
    const g=window.__yaoshi,p=g.S.players[0];
    g.CFG.T=10;
    p.destiny='water';p.bag=[{...g.POOL.find(x=>x.ab==='boat')}];
    g.S.market=[{...g.POOL.find(x=>x.ab==='buoy')}];
    g.S.players.forEach(seat=>{seat.ai=null;seat.life=60;});
    g.S.humanBids={0:[{amt:4,type:'cons',intent:'keep',target:null}]};
    startReveal();
  });
  await page.waitForFunction(()=>document.querySelector('#mainbtn')?.textContent?.includes('開標'),
    null,{timeout:10000});
  await page.locator('#mainbtn').click();
  await page.waitForSelector('.chainAwaken',{timeout:10000});
  await page.screenshot({path:path.join(output,`c-awakening-announcement-${size}.png`)});
  const chairStages=await page.evaluate(()=>{
    window.__yaoshi.newGame('solo',323,['qingmian']);
    const g=window.__yaoshi;
    g.S.market=['boat','chair'].map(ab=>({...g.POOL.find(x=>x.ab===ab)}));
    g.S.players.forEach(seat=>{seat.ai=null;seat.life=60;});
    g.S.humanBids={0:[null,{amt:4,type:'cons',intent:'keep',target:null}]};
    const reveal=g.resolveAuction();
    REVEAL_ANIMATING=true;
    const read=()=>{renderSeats();return {chair:chairSeen(),seat:document.querySelector('#seat1 .st')?.textContent};};
    const stages=[read()];
    g.publishDestinyReveal(reveal[0]);stages.push(read());
    g.publishDestinyReveal(reveal[1]);stages.push(read());
    REVEAL_ANIMATING=false;
    return stages;
  });
  if(chairStages[0].chair||chairStages[1].chair||!chairStages[2].chair||
    chairStages[0].seat.includes('壽命 60')||chairStages[1].seat.includes('壽命 60')||
    !chairStages[2].seat.includes('壽命 60'))
    throw Error(`future chair leaked into earlier reveal seats: ${JSON.stringify(chairStages)}`);
  if(errors.length) throw Error(errors.join('\n'));
  process.stdout.write('directed destiny bag screenshots: 2; actual reveal UI path screenshot: 1; chair reveal gate: pass; pageerror: 0\n');
}finally{
  if(browser) await browser.close();
  if(server.listening) await new Promise(resolve=>server.close(resolve));
}

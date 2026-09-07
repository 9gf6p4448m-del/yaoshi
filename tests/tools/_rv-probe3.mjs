/* 探針 3：供奉排在詛咒 drain 之前 → 危急提示排進佇列的同一夜就出局（showTitheAsk 永遠問不到） */
import path from 'path';
import {fileURLToPath} from 'url';
import {loadGame} from './load.mjs';
const NEW=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','..','index.html');
const G=loadGame(NEW); G.CFG.LEGEND_ON=true;

function setup(){
  G.makeState('solo',1);
  const S=G.S;
  S.players.forEach(p=>{ p.bag=[]; p.life=30; });
  const me=S.players[0];
  me.ai=null;                                   /* 真人席（走「照預設要、排進 titheAsk」那一支） */
  me.bag.push({...G.LEGENDS[0]});                /* 持有殘日 */
  me.bag.push({n:'測試詛咒',f:'yinqi',p:-3,curse:true,drain:1});  /* 每夜 -1 血的詛咒品 */
  return S;
}

/* A：現行順序（settleTithe 在 resolveBattles 最前面、drain 之前） */
let S=setup(); S.players[0].life=2;
const log=[];
G.settleTithe(log);                              /* 引擎實際順序的第一步 */
const afterTithe=S.players[0].life;
const asked=JSON.parse(JSON.stringify(S.titheAsk||[]));
/* 第二步：詛咒 drain（index.html:3467 的那一段照抄口徑：life -= drain） */
const drain=S.players[0].bag.reduce((s,x)=>s+(x.drain||0),0);
S.players[0].life-=drain;
const afterDrain=S.players[0].life;
console.log('[A 現行順序 tithe→drain] 起始壽命 2');
console.log('  settleTithe 後 life =',afterTithe,'　titheAsk =',JSON.stringify(asked),'　袋中仍有傳說 =',S.players[0].bag.some(x=>x.legend));
console.log('  詛咒 drain 後 life =',afterDrain,'→',afterDrain<=0?'★出局（showTitheAsk 會因 p.alive=false 跳過，玩家永遠沒被問到）':'存活');

/* B：對照——若順序倒過來（drain→tithe） */
S=setup(); S.players[0].life=2;
const d2=S.players[0].bag.reduce((s,x)=>s+(x.drain||0),0);
S.players[0].life-=d2;
const log2=[];
G.settleTithe(log2);
console.log('[B 對照順序 drain→tithe] 起始壽命 2');
console.log('  drain 後 life =',2-d2,'　settleTithe 後 life =',S.players[0].life,'　袋中仍有傳說 =',S.players[0].bag.some(x=>x.legend));
console.log('  log:',log2.join(' / '));

/* C：送神回天之後還能不能再搶第二尊（hasLegend 判準＝sh.takenBy） */
S=setup();
S.shrines[0].takenBy=0; S.shrines[0].open=false;   /* 假設第 0 龕已被我請走 */
console.log('[C 送神回天後] hasLegend(me) 送神前 =',G.hasLegend(S.players[0]));
G.releaseLegend(S.players[0],S.players[0].bag.find(x=>x.legend),[], '主動送神回天',false);
console.log('  袋中傳說 =',S.players[0].bag.some(x=>x.legend),'　hasLegend(me) 送神後 =',G.hasLegend(S.players[0]),'（應為 true＝不得再搶）');

/* D：壽命 1 的持有者 */
S=setup(); S.players[0].life=1;
const l4=[]; G.settleTithe(l4);
console.log('[D 壽命 1] life =',S.players[0].life,'　袋中傳說 =',S.players[0].bag.some(x=>x.legend),'　log:',l4.join(' / '));

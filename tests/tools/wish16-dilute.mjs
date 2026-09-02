/* 稀釋假設驗證：(i) 8 張拿掉兩袖清風＋惜命如金（6 張） (ii) 8 張但全部 hooks 拆掉（AI 純預設打法） (iii) 24 張全 hooks 拆 */
import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html';
const N=parseInt(process.argv[2]||'10000',10);
const NEW_IDS=['wish_zuling','wish_xianghuo','wish_trinity','wish_bigfish','wish_allin','wish_bargain','wish_yamingwin','wish_solo',
  'wish_rival','wish_crowd','wish_poisonrival','wish_bloodbath','wish_unscathed','wish_crush','wish_comeback','wish_exorcise'];
const pols=['splitter','greedy','hoarder'];
function measure(prep){ const r={}; for(const name of pols){ const G=loadGame(P); prep(G); r[name]=G.runMany({n:N,policies:{0:G.POLICIES[name]}}).winRate[0]*100; } return r; }
const fmt=(b,a)=>pols.map(n=>`${n} ${(a[n]-b[n])>=0?'+':''}${(a[n]-b[n]).toFixed(2)}`).join('  ');
const del8=G=>NEW_IDS.forEach(id=>{ delete G.WISHES[id]; });
const base=measure(del8); console.log(`n=${N}\n基準（8 張）:`,pols.map(n=>`${n} ${base[n].toFixed(2)}`).join('  '));
console.log('(i) 6 張（8 − 兩袖清風 − 惜命如金）:',fmt(base,measure(G=>{ del8(G); delete G.WISHES.wish_nowin; delete G.WISHES.wish_frugal; })));
console.log('(ii) 8 張、全部 hooks 拆:',fmt(base,measure(G=>{ del8(G); Object.values(G.WISHES).forEach(w=>{ delete w.hooks; }); })));
console.log('(iii) 24 張、全部 hooks 拆:',fmt(base,measure(G=>{ Object.values(G.WISHES).forEach(w=>{ delete w.hooks; }); })));
console.log('(iv) 24 張、只拆 bargain/solo 兩張 hooks:',fmt(base,measure(G=>{ delete G.WISHES.wish_bargain.hooks; delete G.WISHES.wish_solo.hooks; })));

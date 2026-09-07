/* 唯讀探針 2：最小重現對局——只還原「swap」這一處存活檢查，其餘三處仍是修好狀態，
   跟全修好版比較同一場 paperWar 呼叫（固定 rng=0.5、phase=null、windId=null）的
   winner/aliveA·B/hpA·B/dmg。
   跑法：node tests/tools/duel-desync-probe2.mjs [--new=index.html] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const argv = process.argv.slice(2);
const arg = (k, dflt) => { const a = argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : dflt; };
const NEW_HTML = path.resolve(arg('new', path.join(ROOT, 'index.html')));

const html = fs.readFileSync(NEW_HTML, 'utf8');
const FIXED_CODE = html.match(/<script>[\s\S]*?<\/script>/)[0].replace('<script>', '').replace('</script>', '');
function loadFromCode(code) {
  const stub = `
  const location={search:''};
  const localStorage={getItem(){return null;},setItem(){}};
  const document={getElementById:()=>null,addEventListener:()=>{},querySelectorAll:()=>[],
    title:'',documentElement:{style:{}},body:{style:{},cssText:'',innerHTML:''}};
  const window={};
  `;
  return new Function('URLSearchParams', stub + code + '\nreturn window.__yaoshi;')(URLSearchParams);
}
const SWAP_FROM = 'if(pwAny(sd,"swap")&&pwHasAlive(sd)){ /* 卷 E：抓交替的作祟本尊死絕就不該還能拖對面一隻下水 */';
const SWAP_TO = 'if(pwAny(sd,"swap")){';
const FIXED = loadFromCode(FIXED_CODE);
const SWAPBUG = loadFromCode(FIXED_CODE.replace(SWAP_FROM, SWAP_TO));

// 治具：甲方兩個各 1hp 的小隊（team0 五方調兵、team1 抓交替），第 1 拍就被乙方精英打死光；
// 乙方一隊精英（真的出手，打死甲方）＋一隊誘餌群體（hp5，讓「抓交替」三拍時有對象可燒）。
function fixture() {
  const bagA = [
    { unit: { body: 'swarm', count: 1, atk: 0, hp: 1, trait: 'swarmRally' } },
    { unit: { body: 'haunt', count: 1, atk: 0, hp: 1, trait: 'hauntSwap' } },
  ];
  const bagB = [
    { unit: { body: 'elite', count: 1, atk: 10, hp: 30 } },
    { unit: { body: 'swarm', count: 1, atk: 1, hp: 5 } },
  ];
  return { A: { id: 0, name: '甲（全滅方，帶抓交替）', bag: bagA }, B: { id: 1, name: '乙（誘餌方）', bag: bagB } };
}
function run(G) {
  const { A, B } = fixture();
  const r = G.paperWar(A, B, { rng: () => 0.5, phase: null, windId: null });
  return { winner: r.winner ? r.winner.id : null, dmg: r.dmg, aliveA: r.aliveA, aliveB: r.aliveB, hpA: r.hpA, hpB: r.hpB, burnedA: r.burnedA, burnedB: r.burnedB };
}
const rf = run(FIXED), rb = run(SWAPBUG);
console.log('治具：甲方＝swarmRally(1hp)+hauntSwap(1hp)，乙方＝elite(atk10,hp30)+swarm誘餌(hp5)；rng固定0.5、無月相無風位');
console.log('全修好版　：', JSON.stringify(rf));
console.log('只還原swap：', JSON.stringify(rb));
console.log('一句話解釋：甲方（施法方）在第 1 拍就被乙方精英打死光，理論上死人不能再出招；' +
  '「抓交替」在 pwHaunt 裡卻不檢查甲方死活，第 3 拍仍把乙方 hp5 的誘餌群體燒死一隻（aliveB/burnedB 各差 1），' +
  '相當於「死掉的一側伸手把活著那一側的一個前鋒拖下水陪葬」。');

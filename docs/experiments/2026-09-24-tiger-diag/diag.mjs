// 雙虎 H9 診斷（描述性、非驗收）：普通鏈何時湊齊、湊齊後剩幾夜、持有人結局與失血組成。
// 與 ../2026-09-24-tiger-toll/pilot.mjs 的 base h9-normal 同策略同種子；只注入唯讀記錄（每夜開頭記下前一夜 extLoss）。
// 用法：node docs/experiments/2026-09-24-tiger-diag/diag.mjs <n> <out.json（須在 scratchpad/）>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../../../tests/tools/load.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const CHAINS=['water','eyes','twinTiger','bloodOath'];
const ANCHOR='  S.wishNight={wonCount:{},wonFacs:{},';
export function run(seeds){
  let text=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  if(text.split(ANCHOR).length!==2) throw Error('anchor mismatch');
  text=text.replace(ANCHOR,'  storage.__ext?.(S.round,S.wishNight?{...S.wishNight.extLoss}:null);\r\n'+ANCHOR);
  // 每夜拍賣開頭回報「本夜夜次＋上一個 wishNight 的失血」；上一個 wishNight 屬於上一次回報的夜次。
  let ext={},pending=null;
  const storage={getItem(){return null;},setItem(){},__ext:(round,e)=>{
    if(pending!==null&&e){ if(Object.hasOwn(ext,pending)) throw Error('dup round '+pending); ext[pending]=e; }
    pending=round; }};
  const G=loadGame(path.join(ROOT,'index.html'),{sourceText:text,storage});
  return seeds.map(seed=>{
    ext={};pending=null;
    const r=G.playPolicyGame(seed,{},undefined,{trueEffects:'off',destinyAiChase:false,
      recordChainHoldings:true,recordDestinyEvidence:false,policyInformation:false});
    if(pending!==null&&G.S.wishNight) ext[pending]={...G.S.wishNight.extLoss}; // 最後一夜
    return {seed,winnerId:r.winnerId,gameLength:r.gameLength,survival:r.survival,lifeByRound:r.lifeByRound,
      first:Object.fromEntries(CHAINS.map(c=>[c,r.chainHoldings.first[c]||{}])),
      holders:Object.fromEntries(CHAINS.map(c=>[c,r.chainHoldings.holders[c]||[]])),
      extByRound:ext}; // {夜次: {席位: 非自願失血}}；沒走到拍賣結算的夜不在內
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [n,out]=process.argv.slice(2);
  const abs=path.resolve(out);
  if(!abs.startsWith(path.join(ROOT,'scratchpad')+path.sep)) throw Error('output must stay in scratchpad/');
  const rows=run(Array.from({length:Number(n)},(_,i)=>30001+i));
  fs.mkdirSync(path.dirname(abs),{recursive:true});
  fs.writeFileSync(abs,JSON.stringify(rows),{flag:'wx'});
  console.log(rows.length,'→',abs);
}

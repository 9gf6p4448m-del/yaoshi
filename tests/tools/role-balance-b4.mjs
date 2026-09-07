/* B4 引擎等價（凍結檔 docs/experiments/2026-09-07-acceptance-role-balance.md）：
   把角色平衡卷動到的角色從角色池移除，只用沒動過的那幾隻，
   比對 trace(1..20) 與基準版逐位元組相等——證明本卷只動了那幾隻＋它們的接線，
   沒有外溢到全角色共用的路徑（pwResLv 的 ctx.fac、pwSide 的 curseWard、pwMod 的分支）。

   凍結檔字面寫「移除四隻」，但本卷依使用者裁定②同時動到紅衣婆婆與大家樂組頭的被動
   （它們不在 AI 風格掃描的四隻裡），所以「只移除四隻」的版本**無論實作對錯都不可能相等**
   （必然差在大家樂的槓龜 log 與紅衣的回血）。因此預設移除的是**本卷動到的全部六隻**，
   剩下收驚婆／獵人／孝女白琴／普渡爐主——這才是「有沒有外溢到共用路徑」這個問題的檢查。
   凍結檔字面那一版用 --roles=qingmian,duanshou,lvshan,dangpu 仍可跑（會紅，原因如上）。

   跑法：node tests/tools/role-balance-b4.mjs <基準 index.html 的路徑> [新版 index.html 的路徑] [--roles=a,b,c]
   反面驗證（--mutate）：故意把 pwMod 的詛咒扣分改掉，確認本檢查會紅——只驗「會不會綠」
   的等價檢查沒有鑑別力。 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const {loadGame} = await import('file:///' + path.join(HERE, 'load.mjs').replace(/\\/g, '/'));

const argv = process.argv.slice(2).filter(a => !a.startsWith('--'));
const BASE = path.resolve(argv[0] || '');
const NEW = path.resolve(argv[1] || path.join(ROOT, 'index.html'));
const MUTATE = process.argv.includes('--mutate');
/* --legendoff：兩邊都顯式關掉請神再比。用途＝legend-gate 的 L0 在本卷必紅（它的基準是請神卷之前的
   ff227a7，本卷依使用者裁定改了六隻角色，engine 當然不再等於那一版）；這一支證明「紅的原因是基準過期，
   不是 kill switch 壞掉」——關掉請神、移除本卷動過的角色之後，新版與 b38980a 仍逐位元組相等。 */
const LEGEND_OFF = process.argv.includes('--legendoff');
const rolesArg = process.argv.find(a => a.startsWith('--roles='));
const REMOVE = rolesArg ? rolesArg.slice(8).split(',').filter(Boolean)
  : ['qingmian', 'hongyi', 'duanshou', 'lvshan', 'zutou', 'dangpu'];

function traceOf(htmlPath, mutate) {
  let file = htmlPath;
  if (mutate) {                                   /* 反面驗證：把新版的詛咒扣分改成扣兩倍，等價檢查應該變紅 */
    const src = fs.readFileSync(htmlPath, 'utf8');
    const out = src.replace('if(!sd.curseWard) m-=sd.curses;', 'if(!sd.curseWard) m-=sd.curses*2;');
    if (out === src) throw new Error('--mutate 沒有改到任何東西（目標字串不在檔內）');
    file = path.join(ROOT, 'tests', 'tools', '_b4-mutant.html');
    fs.writeFileSync(file, out, 'utf8');
  }
  const G = loadGame(file);
  if (LEGEND_OFF) G.CFG.LEGEND_ON = false;
  for (const k of REMOVE) {
    if (!G.ROLES[k]) throw new Error('角色不存在：' + k);
    G.ROLES[k].pool = false;                      /* 從角色池移除＝這四隻不會被 rosterSeats 抽到 */
  }
  const t = G.trace(Array.from({length: 20}, (_, i) => i + 1));
  if (mutate) fs.unlinkSync(file);
  return JSON.stringify(t);
}

const a = traceOf(BASE, false);
const b = traceOf(NEW, MUTATE);
const same = a === b;
console.log(`基準：${BASE}`);
console.log(`新版：${NEW}${MUTATE ? '（--mutate 突變版）' : ''}`);
console.log(`移除角色：${REMOVE.join('／')}；trace(1..20) 長度 ${a.length} vs ${b.length}`);
console.log(same ? 'B4：逐位元組相等 ✅' : 'B4：不相等 ❌');
if (!same) {
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  console.log(`  首個差異位於第 ${i} 個字元：`);
  console.log(`    基準 …${a.slice(Math.max(0, i - 60), i + 60)}`);
  console.log(`    新版 …${b.slice(Math.max(0, i - 60), i + 60)}`);
}
process.exit(same ? 0 : 1);

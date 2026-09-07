/* 角色平衡卷二版 ③：把重掃結果聚合成表，並照裁定的兩條約束挑出候選。
   約束（凍結檔 §2.1 第 7／9 條）：
     ① markReact 不進掃描：四隻一律維持各角色改前的原設計值（青面 contest／斷手 ignore／閭山 ignore／
        當鋪 avoid）。它是角色性格的公開資訊（§5.8 讀人層要靠三型混桌），不是可最佳化的參數。
        其餘 markReact 的格點仍照跑，只當「如果放開會怎樣」的揭露，不列候選。
     ② 斷手書生的 aggr 另外釘死 1.0（只讓掃描決定 spite）——完整格點仍列出，另外揭露不受限的最佳點。
     （上一版的「全桌 avoid 最多兩隻」已作廢：markReact 既然不掃就不需要那條補丁。）
   跑法：node tests/tools/role-ai-pick.mjs <掃描目錄> [--top=3]
   輸出：每隻的完整排序（markdown 表）＋依約束挑出的前 N 名（決選候選）。 */
import fs from 'fs';
import path from 'path';

const DIR = process.argv[2];
const TOP = Number((process.argv.find(a => a.startsWith('--top=')) || '--top=3').slice(6));
const ROLES = ['qingmian', 'duanshou', 'lvshan', 'dangpu'];
const NAME = {qingmian: '青面攤主', duanshou: '斷手書生', lvshan: '閭山法師', dangpu: '陰間當鋪'};
const ORIG = {                                   /* 各角色原值（必列候選） */
  qingmian: '0.85/0.25/contest', duanshou: '1.0/0.4/ignore',
  lvshan: '0.5/0.2/ignore', dangpu: '0.8/0.4/avoid',
};
/* markReact 的設計值＝各角色改前的值，不進掃描（§2.1 第 9 條） */
const MARK = {qingmian: 'contest', duanshou: 'ignore', lvshan: 'ignore', dangpu: 'avoid'};
const PIN = {duanshou: {aggr: '1.0'}};           /* 裁定②：斷手 aggr 釘死 1.0 */

const rows = {};
for (const f of fs.readdirSync(DIR)) {
  const m = f.match(/^log-([a-z]+)-a([\d.]+)-s([\d.]+)-(\w+)\.txt$/);
  if (!m) continue;
  const txt = fs.readFileSync(path.join(DIR, f), 'utf8');
  const w = txt.match(/勝率 ([\d.]+)%/);
  if (!w) continue;
  (rows[m[1]] = rows[m[1]] || []).push({aggr: m[2], spite: m[3], mark: m[4], win: Number(w[1])});
}

for (const r of ROLES) {
  const all = (rows[r] || []).slice().sort((a, b) => b.win - a.win);
  if (!all.length) { console.log(`\n## ${NAME[r]}：無資料\n`); continue; }
  const key = x => `${x.aggr}/${x.spite}/${x.mark}`;
  const orig = all.find(x => key(x) === ORIG[r]);
  const pin = PIN[r];
  const eligible = all.filter(x => (!pin || x.aggr === pin.aggr) && x.mark === MARK[r]);
  console.log(`\n## ${NAME[r]}（${r}）　${all.length} 組`);
  console.log(`- 原值 ${ORIG[r]}：${orig ? orig.win.toFixed(2) + '%' : '（缺）'}`);
  console.log(`- 不受限最佳：${key(all[0])} ${all[0].win.toFixed(2)}%`);
  if (pin) {
    const best1 = all.find(x => x.aggr === pin.aggr);
    console.log(`- aggr 釘 ${pin.aggr} 之後最佳：${key(best1)} ${best1.win.toFixed(2)}%`
      + `（比不受限最佳低 ${(all[0].win - best1.win).toFixed(2)}pp）`);
  }
  const bestFreeMark = all.find(x => (!pin || x.aggr === pin.aggr));
  if (bestFreeMark && eligible.length && bestFreeMark.mark !== MARK[r]) {
    console.log(`- **markReact 不掃的代價**：同 aggr 條件下最佳是 ${key(bestFreeMark)} ${bestFreeMark.win.toFixed(2)}%`
      + `（markReact=${bestFreeMark.mark}），照設計值 ${MARK[r]} 取 ${key(eligible[0])} ${eligible[0].win.toFixed(2)}%`
      + `，差 ${(bestFreeMark.win - eligible[0].win).toFixed(2)}pp`);
  }
  console.log(`- **決選候選（前 ${TOP}）**：` + eligible.slice(0, TOP).map(x => `${key(x)} ${x.win.toFixed(2)}%`).join('｜'));
  console.log('\n| # | aggr/spite/markReact | 勝率% | 備註 |\n|---|---|---|---|');
  all.forEach((x, i) => {
    const tags = [];
    if (key(x) === ORIG[r]) tags.push('原值');
    if (pin && x.aggr !== pin.aggr) tags.push('aggr 未釘 1.0，不合格');
    if (x.mark !== MARK[r]) tags.push(`markReact 非設計值 ${MARK[r]}，不列候選`);
    console.log(`| ${i + 1} | ${key(x)} | ${x.win.toFixed(2)} | ${tags.join('；')} |`);
  });
}

/* 把 role-measure.mjs 落下的 JSON 聚合成 M1／M2／M3／M4 的 markdown 表。
   用法：node tests/tools/role-measure-agg.mjs <證據目錄> [主樣本後綴，預設 n10000] */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const {loadGame} = await import('file:///' + path.join(HERE, 'load.mjs').replace(/\\/g, '/'));
const G0 = loadGame(path.resolve(HERE, '..', '..', 'index.html'));
const L0D = r => (G0.ROLES[r] && G0.ROLES[r].life0d) || 0;

const dir = process.argv[2];
const suf = process.argv[3] || 'n10000';
const readAll = pred => {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.startsWith('role-measure-') || !f.endsWith('.json') || !pred(f)) continue;
    out.push(...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).rows);
  }
  return out;
};
const rows   = readAll(f => f.endsWith(`-${suf}.json`) && !f.includes('seat2') && !f.includes('-eff-') && !f.includes('-old-'));
const seat2  = readAll(f => f.includes('seat2'));
const effRow = readAll(f => f.includes('-eff-'));
const oldRow = readAll(f => f.includes('-old-'));

const NAMES = {qingmian: '青面攤主', hongyi: '紅衣婆婆', duanshou: '斷手書生', shoujing: '收驚婆', hunter: '獵人',
  xiaonv: '孝女白琴', lvshan: '閭山法師', zutou: '大家樂組頭', dangpu: '陰間當鋪', luzhu: '普渡爐主'};
const ORDER = ['qingmian', 'hongyi', 'duanshou', 'shoujing', 'hunter', 'xiaonv', 'lvshan', 'zutou', 'dangpu', 'luzhu'];
/* roles-res0.md 的數字（n=2000，af12d4d 版引擎） */
const RES0 = {qingmian: 27, hongyi: 25, duanshou: 12, shoujing: 38, hunter: 32, xiaonv: 31, lvshan: 5, zutou: 25, dangpu: 13, luzhu: 27};

const get = (r, v) => rows.find(x => x.role === r && x.variant === v);
const pct = x => (x * 100).toFixed(2);
const pp = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(2);
const N = rows.length ? rows[0].n : 0;
const SE = p => (Math.sqrt(p * (1 - p) / N) * 100).toFixed(2);

let md = `n=${N}（seed 1..${N}），座位 0 為受測角色、其餘三席由 \`S.rng()\` 每一局各自抽（不固定同一組）。\n\n`;

md += '### M1-0 (a) 是否重現 `roles-res0.md`（凍結檔要求 ±2pp）\n\n';
md += `| 角色 | roles-res0（n=2000、\`af12d4d\` 引擎） | 本卷 (a)（n=${N}、\`5565364\` 引擎） | 差 | ±2pp |\n|---|---|---|---|---|\n`;
for (const r of ORDER) {
  const a = get(r, 'a'); if (!a) continue;
  const d = a.win * 100 - RES0[r];
  md += `| ${NAMES[r]} | ${RES0[r]}% | ${pct(a.win)}% | ${(d >= 0 ? '+' : '') + d.toFixed(2)}pp | ${Math.abs(d) <= 2 ? '✅' : '❌'} |\n`;
}
if (oldRow.length) {
  md += '\n對照：把同一支治具指向 `af12d4d` 的 `index.html`（`--html=`）跑 (a)，用來分辨「治具對不上」與「引擎在 res0 之後改過」。\n\n';
  md += '| 角色 | roles-res0 | 治具跑 af12d4d 引擎 | 差 |\n|---|---|---|---|\n';
  for (const r of ORDER) {
    const o = oldRow.find(x => x.role === r && x.variant === 'a'); if (!o) continue;
    const d = o.win * 100 - RES0[r];
    md += `| ${NAMES[r]} | ${RES0[r]}% | ${pct(o.win)}%（n=${o.n}） | ${(d >= 0 ? '+' : '') + d.toFixed(2)}pp |\n`;
  }
}

md += '\n### M1 主表（凍結檔口徑）\n\n';
md += '| 角色 | (a) 基準 | (b) 風格 | (c) 風格＋被動關 | (d) 基準＋被動關 | 量法偏 (b)−(a) | 被動貢獻 (b)−(c) | SE(b) |\n|---|---|---|---|---|---|---|---|\n';
for (const r of ORDER) {
  const a = get(r, 'a'), b = get(r, 'b'), c = get(r, 'c'), d = get(r, 'd');
  if (!a || !b || !c || !d) continue;
  md += `| ${NAMES[r]}（${r}） | ${pct(a.win)}% | ${pct(b.win)}% | ${pct(c.win)}% | ${pct(d.win)}% | ${pp(b.win - a.win)}pp | ${pp(b.win - c.win)}pp | ±${SE(b.win)}pp |\n`;
}

md += '\n### M1 附表 1：把 (c) 的三種混淆拆開（b／c2／c3／cL／c）\n\n';
md += '| 角色 | life0d | (b) 全開 | (c2) 關玩家被動 | (c3) 關 AI 風格 hook | (cL) 兩者都關、留 life0d | (c) 再關 life0d | 玩家被動 b−c2 | AI 風格 b−c3 | life0d cL−c |\n|---|---|---|---|---|---|---|---|---|---|\n';
for (const r of ORDER) {
  const b = get(r, 'b'), c = get(r, 'c'), cL = get(r, 'cL'), c2 = get(r, 'c2'), c3 = get(r, 'c3');
  if (!b) continue;
  const l0 = L0D(r) === 0 ? '（無）' : (L0D(r) > 0 ? '+' : '') + L0D(r);
  md += `| ${NAMES[r]} | ${l0} | ${pct(b.win)}% | ${c2 ? pct(c2.win) + '%' : '-'} | ${c3 ? pct(c3.win) + '%' : '-'} | ${cL ? pct(cL.win) + '%' : '-'} | ${c ? pct(c.win) + '%' : '-'} | ${c2 ? pp(b.win - c2.win) + 'pp' : '-'} | ${c3 ? pp(b.win - c3.win) + 'pp' : '-'} | ${(cL && c) ? pp(cL.win - c.win) + 'pp' : '-'} |\n`;
}

md += '\n### M1 附表 2：座位 0 從來不「盯上」的量法缺口（bm）\n\n';
md += '`policyMarks`（`index.html:1941`）對沒有 `.mark` 的策略一律把該席的宣告設成 `null`；`policyAiLike` 與 (b) 都沒有 `.mark` ⇒ 座位 0 每一夜都不盯，三個 AI 席每一夜都盯。(bm) 把座位 0 也接上 `aiMark`。\n\n';
md += '| 角色 | (b) | (bm) 座位 0 也盯 | 差 |\n|---|---|---|---|\n';
for (const r of ORDER) {
  const b = get(r, 'b'), bm = get(r, 'bm');
  if (!b || !bm) continue;
  md += `| ${NAMES[r]} | ${pct(b.win)}% | ${pct(bm.win)}% | ${pp(bm.win - b.win)}pp |\n`;
}

md += '\n### M2 消融開關的鑑別力（hook 觸發計數）\n\n';
md += '| 角色 | (b) hook 實觸發 | (c) hook 實觸發 | (c) 影子觸發（呼叫點仍被走到） | (b)→(c) 位移 |\n|---|---|---|---|---|\n';
for (const r of ORDER) {
  const b = get(r, 'b'), c = get(r, 'c');
  if (!b || !c) continue;
  const fmt = o => Object.entries(o).map(([k, v]) => `${k} ${v}`).join('、') || '（無）';
  md += `| ${NAMES[r]} | ${fmt(b.hookCalls)} | ${fmt(c.hookCalls)} | ${fmt(c.shadowCalls)} | ${pp(c.win - b.win)}pp |\n`;
}

if (effRow.length) {
  md += '\n### M2 附表：hook 被呼叫 ≠ 被動生效（n=2000、變體 b）\n\n';
  md += '| 角色 | hook | 呼叫次數 | 真的改到 ctx | 生效率 |\n|---|---|---|---|---|\n';
  for (const r of ORDER) {
    const e = effRow.find(x => x.role === r && x.variant === 'b'); if (!e) continue;
    for (const k of Object.keys(e.hookCalls)) {
      const c = e.hookCalls[k], f = (e.hookEffective && e.hookEffective[k]) || 0;
      md += `| ${NAMES[r]} | \`${k}\` | ${c} | ${f} | ${(100 * f / c).toFixed(1)}% |\n`;
    }
  }
}

if (seat2.length) {
  md += '\n### M3 座位控制（同一角色坐座位 2 的 AI 席）\n\n';
  md += '| 角色 | 座位 0 (b) | 座位 2 | 差 | 四席勝率（0/1/2/3） | 平均局長 | n |\n|---|---|---|---|---|---|---|\n';
  for (const s of seat2) {
    const b = get(s.role, 'b');
    const d = b ? (s.win - b.win) * 100 : NaN;
    md += `| ${NAMES[s.role]} | ${b ? pct(b.win) + '%' : '-'} | ${pct(s.win)}% | ${isNaN(d) ? '-' : (d >= 0 ? '+' : '') + d.toFixed(2) + 'pp'}${Math.abs(d) <= 3 ? '（≤3pp）' : '（>3pp ⇒ 含座位效應）'} | ${s.seatWin.map(w => (w * 100).toFixed(1)).join(' / ')} | ${s.avgGameLength.toFixed(2)} | ${s.n} |\n`;
  }
}

md += '\n### M4 分類（門檻照凍結檔：真弱＝被動貢獻 ≤+1pp 且 (b)<20%；量法偏＝(b)−(a) ≥+5pp；強＝被動貢獻 ≥+8pp）\n\n';
md += '| 角色 | (b) | 量法偏 | 被動貢獻 | 分類 | 備註 |\n|---|---|---|---|---|---|\n';
const cls = {};
for (const r of ORDER) {
  const a = get(r, 'a'), b = get(r, 'b'), c = get(r, 'c');
  if (!a || !b || !c) continue;
  const bias = (b.win - a.win) * 100, contrib = (b.win - c.win) * 100;
  const tags = [];
  if (contrib <= 1 && b.win < 0.20) tags.push('真弱');
  if (bias >= 5) tags.push('量法偏');
  if (contrib >= 8) tags.push('強');
  if (!tags.length) tags.push('正常');
  cls[r] = tags;
  const note = contrib < -2 ? '⚠ 被動貢獻為負：整包（被動＋AI 風格 hook＋life0d）是淨負資產，關掉反而變強'
    : (Math.abs(contrib) <= 2 ? '被動在勝率上形同裝飾' : '');
  md += `| ${NAMES[r]} | ${pct(b.win)}% | ${bias.toFixed(2)}pp | ${contrib.toFixed(2)}pp | ${tags.join('＋')} | ${note} |\n`;
}
const cnt = t => ORDER.filter(r => cls[r] && cls[r].includes(t));
md += `\n分類統計：真弱 ${cnt('真弱').length}（${cnt('真弱').map(r => NAMES[r]).join('、')}）、`
   + `量法偏 ${cnt('量法偏').length}（${cnt('量法偏').map(r => NAMES[r]).join('、') || '無'}）、`
   + `強 ${cnt('強').length}（${cnt('強').map(r => NAMES[r]).join('、') || '無'}）、`
   + `正常 ${cnt('正常').length}（${cnt('正常').map(r => NAMES[r]).join('、') || '無'}）\n`;

console.log(md);

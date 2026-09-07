/* 把 role-measure.mjs 落下的 JSON 聚合成 M1／M2／M4 的 markdown 表。
   用法：node tests/tools/role-measure-agg.mjs <證據目錄> <tag後綴，如 n10000> */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const {loadGame} = await import('file:///' + path.join(HERE, 'load.mjs').replace(/\\/g, '/'));
const G0 = loadGame(path.resolve(HERE, '..', '..', 'index.html'));
const L0D = r => (G0.ROLES[r] && G0.ROLES[r].life0d) || 0;

const dir = process.argv[2];
const suf = process.argv[3] || 'n10000';
const files = fs.readdirSync(dir).filter(f => f.startsWith('role-measure-') && f.endsWith(`-${suf}.json`) && !f.includes('seat2'));
const rows = [];
for (const f of files) rows.push(...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).rows);

const NAMES = {qingmian: '青面攤主', hongyi: '紅衣婆婆', duanshou: '斷手書生', shoujing: '收驚婆', hunter: '獵人',
  xiaonv: '孝女白琴', lvshan: '閭山法師', zutou: '大家樂組頭', dangpu: '陰間當鋪', luzhu: '普渡爐主'};
const ORDER = ['qingmian', 'hongyi', 'duanshou', 'shoujing', 'hunter', 'xiaonv', 'lvshan', 'zutou', 'dangpu', 'luzhu'];
const get = (r, v) => rows.find(x => x.role === r && x.variant === v);
const pct = x => (x * 100).toFixed(2);
const pp = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(2);
const N = rows.length ? rows[0].n : 0;
const SE = p => (Math.sqrt(p * (1 - p) / N) * 100).toFixed(2);

let md = `n=${N}（seed 1..${N}），座位 0 為受測角色、其餘三席由 S.rng() 每局隨機抽（不固定）。\n\n`;
md += '## M1 主表（凍結檔口徑）\n\n';
md += '| 角色 | (a) 基準 | (b) 風格 | (c) 風格＋被動關 | (d) 基準＋被動關 | 量法偏 (b)−(a) | 被動貢獻 (b)−(c) | SE(b) |\n|---|---|---|---|---|---|---|---|\n';
for (const r of ORDER) {
  const a = get(r, 'a'), b = get(r, 'b'), c = get(r, 'c'), d = get(r, 'd');
  if (!a || !b || !c || !d) continue;
  md += `| ${NAMES[r]}（${r}） | ${pct(a.win)}% | ${pct(b.win)}% | ${pct(c.win)}% | ${pct(d.win)}% | ${pp(b.win - a.win)}pp | ${pp(b.win - c.win)}pp | ±${SE(b.win)}pp |\n`;
}

md += '\n## M1 附表：把 (c) 的三種混淆拆開\n\n';
md += '（(c) 依凍結檔字面「清 hooks／traits／flags／life0d」，一次拿掉三樣東西：玩家被動、AI 風格 hook、起始壽命位移。下表逐項還原。）\n\n';
md += '| 角色 | life0d | (b) 風格 | (cL) 關被動但留 life0d | (c2) 只關玩家被動（留 AI hook＋life0d） | (c) 全關 | (dL) 基準＋關被動留 life0d |\n|---|---|---|---|---|---|---|\n';
for (const r of ORDER) {
  const b = get(r, 'b'), c = get(r, 'c'), cL = get(r, 'cL'), c2 = get(r, 'c2'), dL = get(r, 'dL');
  if (!b) continue;
  const l0 = L0D(r) === 0 ? '（無）' : (L0D(r) > 0 ? '+' : '') + L0D(r);
  md += `| ${NAMES[r]} | ${l0} | ${pct(b.win)}% | ${cL ? pct(cL.win) + '%' : '-'} | ${c2 ? pct(c2.win) + '%' : '-'} | ${c ? pct(c.win) + '%' : '-'} | ${dL ? pct(dL.win) + '%' : '-'} |\n`;
}

md += '\n## M2 消融開關的鑑別力（hook 觸發計數）\n\n';
md += '| 角色 | (b) hook 實觸發 | (c) hook 實觸發 | (c) 影子觸發（呼叫點仍被走到） | (b)→(c) 位移 |\n|---|---|---|---|---|\n';
for (const r of ORDER) {
  const b = get(r, 'b'), c = get(r, 'c');
  if (!b || !c) continue;
  const fmt = o => Object.entries(o).map(([k, v]) => `${k} ${v}`).join('、') || '（無）';
  md += `| ${NAMES[r]} | ${fmt(b.hookCalls)} | ${fmt(c.hookCalls)} | ${fmt(c.shadowCalls)} | ${pp(c.win - b.win)}pp |\n`;
}

md += '\n## M4 分類（門檻照凍結檔：真弱＝被動貢獻 ≤+1pp 且 (b)<20%；量法偏＝(b)−(a) ≥+5pp；強＝被動貢獻 ≥+8pp）\n\n';
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
  const note = contrib < -2 ? '⚠ 被動貢獻為負：整包被動＋life0d 是淨負資產（關掉反而變強）'
    : (Math.abs(contrib) <= 2 ? '被動在勝率上形同裝飾' : '');
  md += `| ${NAMES[r]} | ${pct(b.win)}% | ${bias.toFixed(2)}pp | ${contrib.toFixed(2)}pp | ${tags.join('＋')} | ${note} |\n`;
}
md += `\n分類統計：真弱 ${ORDER.filter(r => cls[r] && cls[r].includes('真弱')).length}、`
   + `量法偏 ${ORDER.filter(r => cls[r] && cls[r].includes('量法偏')).length}、`
   + `強 ${ORDER.filter(r => cls[r] && cls[r].includes('強')).length}、`
   + `正常 ${ORDER.filter(r => cls[r] && cls[r].includes('正常')).length}\n`;

console.log(md);

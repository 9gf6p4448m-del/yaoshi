// v0.59.1 開卡停靠卷：讀 card-dock-raw.json，依凍結 #1／#2／#8 逐格判定。
// 用法：node tests/tools/card-dock-judge.mjs [raw.json]
// 任何「量不到」（參考文字 null、投影框 null、姿態 null）一律判紅，不當作過。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const RAW = process.argv[2] || path.join(ROOT, 'docs/experiments/2026-09-27-card-dock-font/card-dock-raw.json');
const { rows, notes } = JSON.parse(fs.readFileSync(RAW, 'utf8'));

const area = (a, b) => (!a || !b) ? 0 : Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const fails = { c1: [], c2: [], c8: [] }, others = [];
for (const r of rows) {
  const k = `${r.mode}|${r.vp}|r${r.round}|${r.rail}#${r.slot}`;
  const a = r.after, card = a.cardRect;
  // #1：展開卡 vs 每件拍品投影框（展開後量的框），重疊面積須為 0
  if (!card) fails.c1.push(`${k} 沒有展開卡矩形`);
  if (!a.bbox) fails.c1.push(`${k} 被展開那件的投影框量不到`);
  else for (const i of r.allSlots) {
    const bb = i === r.slot ? a.bbox : null;
    if (i === r.slot && !bb) { fails.c1.push(`${k} 投影框量不到`); continue; }
    if (bb && area(card, bb) > 0) fails.c1.push(`${k} 擋到自己 ${area(card, bb).toFixed(0)}px²`);
  }
  /* 修訂後 #1（使用者裁 A）：其他件只記錄、不判紅 */ if (card) for (const [i, bb] of Object.entries(a.otherBoxes || {})) if (area(card, bb) > 0) others.push(`${k} 擋到 slot${i} ${area(card, bb).toFixed(0)}px²`);
  // #2：安全區、不壓錨點、關閉鈕 ≥40、內容逐項等價、關閉後消失
  if (card) {
    const s = r.safePx, vw = r.vpW, vh = r.vpH;
    if (s && vw && (card.left < s.left - 0.5 || card.top < s.top - 0.5 || card.right > vw - s.right + 0.5 || card.bottom > vh - s.bottom + 0.5)) fails.c2.push(`${k} 出安全區`);
    for (const [n, rc] of Object.entries(r.anchorRects || {})) if (area(card, rc) > 0) fails.c2.push(`${k} 壓到 ${n}`);
  }
  if (!a.closeBtnRect || a.closeBtnRect.w < 40 || a.closeBtnRect.h < 40) fails.c2.push(`${k} 關閉鈕 <40`);
  if (!Array.isArray(a.cut)) fails.c2.push(`${k} 半截字量不到`); else if (a.cut.length) fails.c2.push(`${k} 卡片邊緣露出半截字：${a.cut.slice(0, 3).join('／')}`);
  if (a.refTxt == null) fails.c2.push(`${k} 參考文字量不到：${a.refErr}`);
  else if (a.refTxt !== a.liveTxt) fails.c2.push(`${k} 內容不等價`);
  if (!r.afterClose || !r.afterClose.cardGone) fails.c2.push(`${k} 關閉後卡未消失`);
  if (!r.headBefore || !r.afterClose || JSON.stringify(r.afterClose.head) !== JSON.stringify(r.headBefore)) fails.c2.push(`${k} 關閉後頂列／心願條矩形未復原`);
  // #8：對應那件亮、其餘不變、只亮不動、關閉復原
  if (a.hover !== r.slot) fails.c8.push(`${k} 亮的不是這件（hover=${a.hover}）`);
  /* 場景有常駐粒子／火光，同幀像素差在未動作時也恆為真（noiseDiff），像素差沒有鑑別力；
     改以描邊可見數判「看得出強調」：開卡後該件描邊 >0、開卡前與關卡後為 0。 */
  if (!(a.outlines > 0 || a.glow > 1)) fails.c8.push(`${k} 開卡後該件沒有強調（描邊 0、陰火未增亮）`);
  if (r.afterClose && r.afterClose.glow !== undefined && r.afterClose.glow !== 1) fails.c8.push(`${k} 關卡後陰火未復原`);
  if (a.otherOutlines && Object.values(a.otherOutlines).some((n) => n > 0)) fails.c8.push(`${k} 其他件也被描邊`);
  const p0 = r.before.pose, p1 = a.pose, p2 = r.poseHold;
  if (!p0 || !p1 || !p2) fails.c8.push(`${k} 姿態量不到`);
  else if (p0.y !== p1.y || p0.rotY !== p1.rotY || p0.y !== p2.y || p0.rotY !== p2.rotY) fails.c8.push(`${k} 開卡期間姿態變了`);
  if (!r.afterClose || r.afterClose.hover !== r.before.hover || r.afterClose.outlines !== r.before.outlines) fails.c8.push(`${k} 關閉後未復原`);
}
const by = (arr) => { const m = {}; for (const r of rows) { const g = `${r.mode}|${r.vp}`; m[g] = (m[g] || 0) + 1; } return m; };
const out = { raw: path.relative(ROOT, RAW), rows: rows.length, cells: by(rows), notes, fail: { c1: fails.c1.length, c2: fails.c2.length, c8: fails.c8.length }, otherLotOverlapRecorded: others.length, sample: { c1: fails.c1.slice(0, 15), c2: fails.c2.slice(0, 15), c8: fails.c8.slice(0, 15) } };
fs.writeFileSync(path.join(path.dirname(RAW), 'card-dock-judge.json'), JSON.stringify({ ...out, all: fails, others }, null, 1));
console.log(JSON.stringify(out, null, 1));

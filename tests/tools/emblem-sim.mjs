// 徽記剪影互撞診斷（v0.55 招式可辨性卷，覆審 r1 C5-③）。
//   node tests/tools/emblem-sim.mjs [--gate=0.80] [--top=20] [--json=<out.json>] [--all]
//
// 量什麼：30 個 kind 的**低解析度灰階剪影**兩兩相似度（面積歸一後的灰階 IoU）。
// 為什麼是「低解析度灰階」而不是原始多邊形：讀者在 844×390 上看到的徽記只有幾十個像素，
// 又疊了 bloom 與 ink 底板，polygon 的細節早就糊掉了——量高解析度的精確重疊是量錯位置。
// 為什麼是面積歸一不是外框歸一：面積歸一**保留長寬比**，而長寬比是讀者分得出「立著的旗」與
// 「躺著的浪」的少數線索之一。
// 為什麼不用 Hu moments：它是旋轉不變的，會把旗與浪判成同一個形狀。實測（scratchpad 的探索腳本）
// Hu 把六位讀者已知互撞的五組排到 435 對裡的第 193–305 名，比 IoU 更沒有鑑別力。
//
// ★這支量的是幾何，不是人眼★：見 tests/emblem-collision.test.mjs 的「校準記錄」那一條——
// 六位讀者實際發生的五組誤讀（knife→blade、seal→tornflag／chair、hat→wave／banner5）
// 在**任何**純幾何門檻下都排不到 bell 的同系配對前面，所以本支的紅**不等於**「讀者會認錯」，
// 它只回答「這兩個剪影在畫面上糊成同一團的機率高不高」。人眼閘門仍然是 L4 盲讀。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const GRID = 12;      // 取樣格邊長（讀者看到的那個尺度；6–48 都掃過，結論不隨它改變）
const SS = 4;         // 每格的超取樣（抗鋸齒＝灰階覆蓋率）
const HALF = 1.9;     // 面積歸一後的取樣半徑（容得下最細長的 pin／bolt）

/** 讀 js/trait-fx/emblems.js 的頂點表。它 `import * as THREE from 'three'`，node 端沒有 importmap，
 *  所以把那一行換成空物件再以 data: URL 動態載入——量的仍是**同一份檔案**，不是另抄一份表。 */
export async function loadEmblems(root = ROOT) {
  const src = fs.readFileSync(path.join(root, 'js/trait-fx/emblems.js'), 'utf8')
    .replace(/^import \* as THREE from 'three';$/m, 'const THREE = {};');
  const mod = await import('data:text/javascript;base64,' + Buffer.from(src, 'utf8').toString('base64'));
  return { EMBLEM: mod.EMBLEM, KINDS: mod.KINDS };
}

/** 每個 kind 的系別（從 vocab.js 的 EMBLEM_OF 分段註解讀，不另抄一份表）。 */
export function facOfKinds(root = ROOT) {
  const out = {};
  let cur = null;
  const NAME = { 祖靈系: 'zuling', 香火系: 'xianghuo', 陰氣系: 'yinqi', 傳說三尊: 'legend' };
  for (const line of fs.readFileSync(path.join(root, 'js/trait-fx/vocab.js'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/── (祖靈系|香火系|陰氣系|傳說三尊)/);
    if (m) cur = NAME[m[1]];
    const e = line.match(/^\s*([A-Za-z0-9]+):\s*'([a-z0-9]+)'/);
    if (e && cur) out[e[2]] = cur;
  }
  return out;
}

const toPts = (flat) => { const p = []; for (let i = 0; i < flat.length; i += 2) p.push([flat[i], flat[i + 1]]); return p; };
const inPoly = (p, x, y) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; };
const polyArea = (p) => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] * p[i][1] - p[i][0] * p[j][1]); return Math.abs(a) / 2; };
const polyCen = (p) => { let cx = 0, cy = 0, a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const cr = p[j][0] * p[i][1] - p[i][0] * p[j][1]; a += cr; cx += (p[j][0] + p[i][0]) * cr; cy += (p[j][1] + p[i][1]) * cr; } a /= 2; return [cx / (6 * a), cy / (6 * a)]; };

/** 把一個剪影（外框＋可選的洞）光柵化成 GRID×GRID 的灰階覆蓋率圖（面積歸一、質心對齊）。
 *  `scale` 是額外的縮放係數（只給自我對照的擾動用）。 */
export function rasterize(spec, scale = 1) {
  const outline = Array.isArray(spec) ? spec : spec.o;
  const hole = Array.isArray(spec) ? null : (spec.h || null);
  let o = toPts(outline);
  const c = polyCen(o);
  let h = hole ? toPts(hole).map(([x, y]) => [x - c[0], y - c[1]]) : null;
  o = o.map(([x, y]) => [x - c[0], y - c[1]]);
  const s = scale / Math.sqrt(polyArea(o));
  o = o.map(([x, y]) => [x * s, y * s]);
  if (h) h = h.map(([x, y]) => [x * s, y * s]);
  const g = new Float64Array(GRID * GRID);
  for (let iy = 0; iy < GRID; iy++) {
    for (let ix = 0; ix < GRID; ix++) {
      let n = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = -HALF + (2 * HALF) * (ix + (sx + 0.5) / SS) / GRID;
          const y = -HALF + (2 * HALF) * (iy + (sy + 0.5) / SS) / GRID;
          if (inPoly(o, x, y) && !(h && inPoly(h, x, y))) n++;
        }
      }
      g[iy * GRID + ix] = n / (SS * SS);
    }
  }
  return g;
}

/** 灰階 IoU：Σmin / Σmax（0＝完全不重疊、1＝同一個形狀）。 */
export function grayIoU(a, b) {
  let i = 0, u = 0;
  for (let k = 0; k < a.length; k++) { i += Math.min(a[k], b[k]); u += Math.max(a[k], b[k]); }
  return u ? i / u : 0;
}

/** 給定頂點表算兩兩相似度（由高到低）。抽出來是為了讓測試能在**記憶體裡**改一份頂點表驗鑑別力。 */
export function computePairs(EMBLEM, KINDS, FAC) {
  const G = {};
  KINDS.forEach((k) => { G[k] = rasterize(EMBLEM[k]); });
  const out = [];
  for (let i = 0; i < KINDS.length; i++) {
    for (let j = i + 1; j < KINDS.length; j++) {
      const a = KINDS[i], b = KINDS[j];
      out.push({ a, b, facA: FAC[a] || '?', facB: FAC[b] || '?', sameFac: FAC[a] === FAC[b], iou: +grayIoU(G[a], G[b]).toFixed(4) });
    }
  }
  out.sort((x, y) => y.iou - x.iou);
  return out;
}

/** 全部 kind 兩兩的相似度，由高到低（讀檔＋算）。 */
export async function allPairs(root = ROOT) {
  const { EMBLEM, KINDS } = await loadEmblems(root);
  const FAC = facOfKinds(root);
  return { pairs: computePairs(EMBLEM, KINDS, FAC), KINDS, EMBLEM, FAC, grid: GRID };
}

async function main() {
  const opt = {};
  for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z-]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
  const gate = parseFloat(opt.gate || '0.80');
  const top = parseInt(opt.top || '20', 10);
  const { pairs, KINDS, grid } = await allPairs();
  console.log(`徽記剪影互撞診斷：${KINDS.length} 個 kind · ${pairs.length} 對 · ${grid}×${grid} 灰階 IoU（面積歸一）· 門檻 ${gate}`);
  const red = pairs.filter((p) => p.iou >= gate);
  const show = opt.all ? pairs : pairs.slice(0, Math.max(top, red.length));
  show.forEach((p) => console.log(`  ${p.iou >= gate ? '★紅' : '  綠'} ${p.iou.toFixed(4)} ${p.a.padEnd(9)} ${p.b.padEnd(9)} ${p.sameFac ? '同系 ' + p.facA : '跨系 ' + p.facA + '/' + p.facB}`));
  console.log(`\n≥${gate} 的配對 ${red.length} 對（同系 ${red.filter((p) => p.sameFac).length} 對）`);
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify({ gate, grid, pairs }, null, 1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });

/* 階段三 第三輪 遊戲視角閘門（acceptance-roles-r3.md R3-1 ②③、R3-3 (b)(c)）。量法沿用 r2，不另發明：
   每個 tband（0.19–0.27、0.38–0.42）跑 tests/tools/hands-roles-shots.mjs --measure（L 1280x720、南席 seat 0、拍令牌 slot 1）：
     ① 三角色各一張，色塊＝ROLE_HAND.ROLES[k].BLOCK → 色塊像素 ÷ 同 tband 的 933f1de1 基準（r2/shots/base-*）≥1.5；實拍色塊平均色兩兩 ≥60。
     ② 獵人另跑一張，色塊清單＝獵人「全部配件色」（buildRoleGeometry 配件頂點上出現的每一種顏色，--blockjson）：
        毛皮色組（ROLE_HAND.FUR.COLORS）像素 ≥ 任一其他配件色像素；毛皮實拍平均色 vs 當鋪金邊（TRIM.GOLD）實拍平均色、
        收驚婆白袖口（ROLES.shoujing.CUFF）實拍平均色 兩兩 ≥60。
   跑法：node tests/tools/hands-roles-r3-gate.mjs --out=<資料夾>；全過退出碼 0。 */
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { M, handRigSource } from '../hand-fixture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const OUT = path.resolve(opt.out || 'r3-gate'); fs.mkdirSync(OUT, { recursive: true });
const BASE = path.join(ROOT, 'docs/experiments/2026-10-01-hands-stage3/r2/shots');
const BANDS = [['0.19', '0.19,0.27'], ['0.38', '0.38,0.42']];
const ROLES = ['shoujing', 'dangpu', 'hunter'];
const R = M.ROLE_HAND;

/* 獵人全部配件色（線性 RGB）：配件頂點（index ≥ 原頂點數）上出現的每一種顏色 */
const { src, mesh } = await handRigSource();
const a = mesh.geometry.attributes, n0 = a.position.count;
const geo = M.buildRoleGeometry(M.buildRig(src), { position: a.position.array, normal: a.normal.array, color: a.color.array, colorSize: a.color.itemSize, skinIndex: a.skinIndex.array, skinWeight: a.skinWeight.array, index: mesh.geometry.index.array }, 'hunter');
const accCols = new Map();
for (let v = n0; v < geo.position.length / 3; v++) { const c = [geo.color[v * 4], geo.color[v * 4 + 1], geo.color[v * 4 + 2]]; accCols.set(c.map((x) => x.toFixed(4)).join(), c); }
const hunterAll = [...accCols.values()];
const same = (p, q) => Math.abs(p[0] - q[0]) < 1e-3 && Math.abs(p[1] - q[1]) < 1e-3 && Math.abs(p[2] - q[2]) < 1e-3;
const isFur = (c) => R.FUR.COLORS.some((f) => same(f, c));

const shots = (prefix, band, jobs, blockjson) => {
  const args = ['tests/tools/hands-roles-shots.mjs', `--out=${OUT}`, `--prefix=${prefix}`, `--tband=${band}`, `--jobs=${JSON.stringify(jobs)}`];
  if (blockjson) args.push(`--blockjson=${JSON.stringify(blockjson)}`);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error('shots 失敗：' + (r.stderr || r.stdout).slice(-800));
};
const readJ = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name + '.json'), 'utf8'));
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const wmean = (pxs, means, pick) => { const s = [0, 0, 0]; let n = 0; pxs.forEach((px, i) => { if (!pick(i) || !px || !means[i]) return; n += px; for (let k = 0; k < 3; k++) s[k] += px * means[i][k]; }); return n ? s.map((x) => +(x / n).toFixed(1)) : null; };

const res = { bands: {}, gates: {} };
for (const [tag, band] of BANDS) {
  shots(`r3-${tag}`, band, ROLES.map((r) => [r, 0, 'slam', 1]));
  shots(`r3all-${tag}`, band, [['hunter', 0, 'slam', 1]], hunterAll);
  const b = {};
  for (const role of ROLES) {
    const now = readJ(OUT, `r3-${tag}-${role}-s0-slam`), base = readJ(BASE, `base-${tag}-${role}-s0-slam`);
    b[role] = { t: now.state && now.state.t, baseT: base.state && base.state.t, blockPx: now.blockPx, basePx: base.blockPx, ratio: +(now.blockPx / base.blockPx).toFixed(3), meanRgb: now.meanRgb, blockByColour: now.blockByColour, meanByColour: now.meanByColour };
  }
  const pair = {}; for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) pair[`${ROLES[i]}-${ROLES[j]}`] = +dist(b[ROLES[i]].meanRgb, b[ROLES[j]].meanRgb).toFixed(1);
  const all = readJ(OUT, `r3all-${tag}-hunter-s0-slam`);
  const furPx = all.blockByColour.reduce((s, px, i) => s + (isFur(hunterAll[i]) ? px : 0), 0);
  const others = hunterAll.map((c, i) => ({ colour: c, px: all.blockByColour[i] })).filter((x) => !isFur(x.colour));
  const furLit = wmean(all.blockByColour, all.meanByColour, (i) => isFur(hunterAll[i]));
  const goldI = R.ROLES.dangpu.BLOCK.findIndex((c) => same(c, R.TRIM.GOLD)), linenI = R.ROLES.shoujing.BLOCK.findIndex((c) => same(c, R.ROLES.shoujing.CUFF));
  const goldLit = b.dangpu.meanByColour[goldI], linenLit = b.shoujing.meanByColour[linenI];
  b.hunterParts = { t: all.state && all.state.t, furPx, maxOther: Math.max(...others.map((x) => x.px)), others, furLit, goldLit, linenLit,
    furGold: +dist(furLit, goldLit).toFixed(1), furLinen: +dist(furLit, linenLit).toFixed(1), goldLinen: +dist(goldLit, linenLit).toFixed(1) };
  b.pairDist = pair;
  res.bands[tag] = b;
  res.gates[`ratio_ge1.5_${tag}`] = ROLES.every((r) => b[r].ratio >= 1.5);
  res.gates[`meanDist_ge60_${tag}`] = Object.values(pair).every((d) => d >= 60);
  res.gates[`furLargest_${tag}`] = furPx > 0 && others.every((x) => furPx >= x.px);
  res.gates[`furColourDist_ge60_${tag}`] = b.hunterParts.furGold >= 60 && b.hunterParts.furLinen >= 60 && b.hunterParts.goldLinen >= 60;
  res.gates[`tInBand_${tag}`] = [...ROLES.map((r) => b[r].t), b.hunterParts.t].every((t) => t >= +band.split(',')[0] && t <= +band.split(',')[1]);
}
res.pass = Object.values(res.gates).every(Boolean);
const s = JSON.stringify(res, null, 1);
fs.writeFileSync(path.join(OUT, 'r3-gate.json'), s);
console.log(JSON.stringify(res.gates), 'pass=' + res.pass);
for (const [tag, b] of Object.entries(res.bands)) console.log(tag, 'ratio', ROLES.map((r) => `${r}:${b[r].blockPx}/${b[r].basePx}=${b[r].ratio}(t=${b[r].t})`).join(' '), 'pair', JSON.stringify(b.pairDist), 'fur', b.hunterParts.furPx, 'maxOther', b.hunterParts.maxOther, 'furGold', b.hunterParts.furGold, 'furLinen', b.hunterParts.furLinen, 'goldLinen', b.hunterParts.goldLinen);
process.exit(res.pass ? 0 : 1);

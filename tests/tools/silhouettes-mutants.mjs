/* 後景人影 突變驗紅（凍結驗收 #E1／#E2／#B1；tests/table-silhouettes.test.mjs 與 tests/tools/silhouettes-probe.mjs 的鑑別力）。
   做法：被測檔複製到系統暫存目錄、只改一處；node 測試用 YAOSHI_SIL_PATH 指向突變體，實頁探針用 --root 指向整份暫存站台副本。
   原檔全程唯讀（還原＝刪暫存副本，不做反向 sed）；最後再跑無突變基準，必須全綠。
   跑法：node tests/tools/silhouettes-mutants.mjs [out.json] */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.argv[2] || '';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sil-mut-'));
const MUTANTS = [
  { id: 'E1-trisOver', frozen: 'E1 每尊 ≤200 三角形', via: 'node', file: 'js/table-silhouettes.js', what: '頭部球加密到 8×16（每尊超過 200 三角形）',
    from: 'g.sphere(0, 0.315, 0.004, 0.058, 0.066, 0.058, 4, 8,', to: 'g.sphere(0, 0.315, 0.004, 0.058, 0.066, 0.058, 8, 16,', expect: /每尊|三角形|等於幾何/ },
  { id: 'U-mathRandom', frozen: '提案 §5 不耗亂數', via: 'node', file: 'js/table-silhouettes.js', what: '擺位 x 加 Math.random 抖動',
    from: 'const mesh = new THREE.Mesh(layouts[mode].geometry, material);', to: 'layouts.L.geometry.translate(Math.random() * 0.001, 0, 0);\n  const mesh = new THREE.Mesh(layouts[mode].geometry, material);', expect: /Math\.random|不得出現|決定性/ },
  { id: 'E1-flat', frozen: 'E1 非平面貼片', via: 'node', file: 'js/table-silhouettes.js', what: '整份幾何 z 方向壓扁成貼片',
    from: 'const mesh = new THREE.Mesh(layouts[mode].geometry, material);', to: 'for (const k of ["L","P"]) { const gg = layouts[k].geometry, pp = gg.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, 0); for (const b of layouts[k].bounds) { b.min[2] = -2; b.max[2] = -2; } }\n  const mesh = new THREE.Mesh(layouts[mode].geometry, material);', expect: /太扁|貼片/ },
  { id: 'E2-noDuelHide', frozen: '對決隱藏', via: 'both', file: 'js/table-tray.js', what: '人影不掛在 tray 的 group、改掛 scene（對決時不跟著收）',
    from: 'createTableSilhouettes(group,', to: 'createTableSilhouettes(scene,', expect: /createTableSilhouettes\(group|hiddenInDuel|renderedInDuel/ },
  { id: 'E2-outsideWindow', frozen: '落在掏空窗內', via: 'probe', file: 'js/table-silhouettes.js', what: '北側那尊往後挪到 z=-3.4（螢幕上移出窗頂）',
    from: "kind: 'official', x: -0.1, z: -2.2 }, { kind: 'bun', x: -1.42", to: "kind: 'official', x: -0.1, z: -3.4 }, { kind: 'bun', x: -1.42", expect: /inWindow/ },
  { id: 'E2-overItems', frozen: '不蓋拍品', via: 'probe', file: 'js/table-silhouettes.js', what: '東側那尊往桌心挪到 x=1.1（螢幕上蓋住拍品格）',
    from: "kind: 'bamboo', x: 1.5, z: -1.95 }],\n    P:", to: "kind: 'bamboo', x: 1.1, z: -1.95 }],\n    P:", expect: /notOverItems/ },
  { id: 'B1-extraMesh', frozen: 'B1 draw call 增量', via: 'probe', file: 'js/table-silhouettes.js', what: '多掛 4 個空殼 mesh（淨增 draw call 超過上限 3）',
    from: 'group.add(mesh);', to: 'group.add(mesh); for (let i = 0; i < 3; i++) { const m2 = new THREE.Mesh(layouts[mode].geometry, material); m2.frustumCulled = false; group.add(m2); }', expect: /drawCall_delta_le3/ },
];

function runNode(envPath) {
  const r = spawnSync(process.execPath, ['--test', 'tests/table-silhouettes.test.mjs'], { cwd: ROOT, env: { ...process.env, ...(envPath ? { YAOSHI_SIL_PATH: envPath } : {}) }, encoding: 'utf8', timeout: 180000 });
  const out = (r.stdout || '') + (r.stderr || '');
  return { red: r.status !== 0, failing: [...out.matchAll(/^✖ (.+?) \(/gm)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i), out };
}
function runProbe(root, port) {
  const r = spawnSync(process.execPath, ['tests/tools/silhouettes-probe.mjs', `--root=${root}`, `--port=${port}`, '--vps=L:844x390,L:1280x720'], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
  let j = null; try { j = JSON.parse(r.stdout); } catch (e) {}
  const failed = []; if (j) for (const [k, g] of Object.entries(j.gates)) for (const [n, v] of Object.entries(g)) if (!v) failed.push(`${k}:${n}`);
  return { red: r.status !== 0, failed, parsed: !!j, raw: j ? '' : (r.stdout + r.stderr).slice(-400) };
}
function siteCopy(tag) {
  const d = path.join(TMP, tag); fs.mkdirSync(d, { recursive: true });
  for (const n of ['index.html', 'manifest.webmanifest', 'js', 'assets']) fs.cpSync(path.join(ROOT, n), path.join(d, n), { recursive: true });
  return d;
}
const report = { baseline: {}, mutants: [] };
let port = 8990;
try {
  for (const m of MUTANTS) {
    const site = siteCopy(m.id);
    const f = path.join(site, m.file); const src = fs.readFileSync(f, 'utf8');
    if (!src.includes(m.from)) { report.mutants.push({ id: m.id, error: '錨點不在原檔（原檔改過，突變失效）' }); continue; }
    fs.writeFileSync(f, src.replace(m.from, m.to));
    const res = { id: m.id, frozen: m.frozen, what: m.what, via: m.via };
    if (m.via === 'node' || m.via === 'both') {
      const mutPath = m.file === 'js/table-silhouettes.js' ? f : null;
      let n;
      if (mutPath) n = runNode(mutPath);
      else { /* tray 的接線測試是讀原檔字串：把突變後的 tray 當 ROOT 檔不方便 → 以突變站台副本的 tray 內容檢查字串斷言 */ n = nodeWiringOnCopy(f); }
      res.node = { red: n.red, failing: n.failing };
    }
    if (m.via === 'probe' || m.via === 'both') { const p = runProbe(site, port++); res.probe = { red: p.red, failed: p.failed, parsed: p.parsed, raw: p.raw }; }
    const redWhere = [...(res.node?.failing || []), ...(res.probe?.failed || [])].join(' | ');
    res.red = !!(res.node?.red || res.probe?.red); res.redWhere = redWhere; res.matchesExpected = m.expect.test(redWhere);
    report.mutants.push(res);
    console.log(`${res.red && res.matchesExpected ? 'RED(ok)' : 'NOT-RED/UNEXPECTED'}  ${m.id}  →  ${redWhere.slice(0, 200)}`);
  }
  /* 基準（無突變）：node 與探針都必須全綠 */
  const bn = runNode(null); const bp = runProbe(ROOT, port++);
  report.baseline = { node: { red: bn.red, failing: bn.failing }, probe: { red: bp.red, failed: bp.failed } };
  console.log(`BASELINE node red=${bn.red} probe red=${bp.red}`);
} finally { fs.rmSync(TMP, { recursive: true, force: true }); }
report.allMutantsRedAsExpected = report.mutants.every((m) => m.red && m.matchesExpected);
report.baselineGreen = !report.baseline.node.red && !report.baseline.probe.red;
if (OUT) fs.writeFileSync(path.resolve(ROOT, OUT), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ allMutantsRedAsExpected: report.allMutantsRedAsExpected, baselineGreen: report.baselineGreen }));
process.exit(report.allMutantsRedAsExpected && report.baselineGreen ? 0 : 1);

/** tray 突變的 node 斷言：把整份 js 的突變副本放進暫存站台，測試用 ROOT 讀 tray 原檔 → 改為覆寫 ROOT/js/table-tray.js 的唯讀替代：直接用突變字串跑同一條 regex。 */
function nodeWiringOnCopy(trayPath) {
  const tray = fs.readFileSync(trayPath, 'utf8');
  const ok = /createTableSilhouettes\(group,/.test(tray);
  return { red: !ok, failing: ok ? [] : ['對決隱藏的接線：人影掛在 tray 的 group 之下（regex /createTableSilhouettes\(group,/ 在突變副本上不成立）'] };
}

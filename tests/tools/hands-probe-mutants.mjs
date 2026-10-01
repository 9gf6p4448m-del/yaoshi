/* 席位之手 實頁探針的突變驗紅：在系統暫存目錄組一棵「只有 js/ 是突變副本」的樹（index.html／manifest 複製、
   assets 以 junction 指回原樹），用 hands-probe.mjs --root=<突變樹> --layouts=L 跑，確認對應閘門轉紅。
   原樹全程唯讀；還原＝刪掉暫存樹。最後對原樹再跑一次必須全綠。
   跑法：node tests/tools/hands-probe-mutants.mjs [out.json] */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.argv[2] || '';
const MUTANTS = [
  { id: 'hitTest-includesHands', gate: 'C1_hitTestUnchanged', file: 'js/table-tray.js', what: 'tray.hitTest 的射線也打手（手進了命中代理）',
    from: 'const hits = ray.intersectObjects(proxies, false);\n      return hits.length ? proxies.indexOf(hits[0].object) : -1;',
    to: 'const hits = ray.intersectObjects(hands.group ? [...proxies, hands.group] : proxies, true);\n      return hits.length ? Math.max(0, proxies.indexOf(hits[0].object)) : -1;' },
  { id: 'idleVisible', gate: 'C1_idleNotOverHUD', file: 'js/hand-motion.js', what: '收手做完不歸零（閒置時手留在畫面上）',
    from: "if (a.kind === 'retract' && a.t >= HAND.RETRACT_MS) { stop(h.seat); return null; }", to: "if (a.kind === 'retract' && a.t >= HAND.RETRACT_MS) { return h.last.frame; }" },
  { id: 'handEmitsSlam', gate: 'C6_slamFromToken', file: 'js/table-hands.js', what: '手自己派 ys:mark-slam',
    from: 'mark(seat, slot) { if (director) director.mark(seat, slot); },', to: "mark(seat, slot) { if (director) director.mark(seat, slot); document.dispatchEvent(new CustomEvent('ys:mark-slam', { detail: { slot } })); }," },
  { id: 'extraMeshPerHand', gate: 'B1_drawCallDelta_le4', file: 'js/table-hands.js', what: '每隻手多掛一顆同幾何網格（像描邊外殼那樣多 1 call）',
    from: '      holder.add(model);', to: '      holder.add(model); { const extra = mesh.clone(); extra.bind(mesh.skeleton, mesh.bindMatrix); mesh.parent.add(extra); }' },
  { id: 'floorIgnoresProps', gate: 'C1_noPenetration_realSkin', file: 'js/hand-motion.js', what: '地板只看桌面、忽略錢柱與令牌',
    from: '  let f = tableY;\n  for (const o of obstacles) {', to: '  let f = tableY;\n  for (const o of []) {' },
  { id: 'bypassCache', gate: 'pipeline_creatureFigures', file: 'js/table-hands.js', what: '每隻手各帶不同查詢字串（繞過 glbCache、抓四次）',
    from: 'Promise.all([0, 1, 2, 3].map(() => cloneSkinnedGlb(url)))', to: 'Promise.all([0, 1, 2, 3].map((k) => cloneSkinnedGlb(url + "?h=" + k)))' },
  /* 第二輪：遮擋判準（hands-occlusion.mjs）的突變 */
  { id: 'occl-slamCarriesToken', tool: 'occlusion', gate: 'occlusion_le_10pct', file: 'js/hand-motion.js', what: '拍：手又舉著令牌飛（飛行中就上場、掌心貼著令牌跟著舉高）',
    from: '      if (!landed) return { hidden: true };', to: '',
    and: [['      const back = (1 - k) * ((fa[2] - pa[2]) * scaleNow() + HAND.SLAM.TRAIL + HAND.SLAM.APPROACH);', '      const back = 0;']] },
  { id: 'occl-westNoFront', tool: 'occlusion', gate: 'occlusion_le_10pct', file: 'js/hand-motion.js', what: '西席不限托盤前緣（手伸到最左那格拍品腳前）',
    from: '    if (seat === 2) return [{ n: [1, 0], c: -HAND.REACH.MID }, front];', to: '    if (seat === 2) return [{ n: [1, 0], c: -HAND.REACH.MID }];' },
];
function buildTree(m) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hands-probe-' + m.id + '-'));
  for (const f of ['index.html', 'manifest.webmanifest']) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  fs.cpSync(path.join(ROOT, 'js'), path.join(dir, 'js'), { recursive: true });
  fs.symlinkSync(path.join(ROOT, 'assets'), path.join(dir, 'assets'), 'junction');
  const p = path.join(dir, m.file), src = fs.readFileSync(p, 'utf8');
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const from = m.from.replace(/\n/g, eol), to = m.to.replace(/\n/g, eol);
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`${m.id}：錨點出現 ${n} 次`);
  let out = src.replace(from, to);
  for (const [f2, t2] of m.and || []) {
    const ff = f2.replace(/\n/g, eol); const k = out.split(ff).length - 1;
    if (k !== 1) throw new Error(`${m.id}：附加錨點出現 ${k} 次`);
    out = out.replace(ff, t2.replace(/\n/g, eol));
  }
  fs.writeFileSync(p, out, 'utf8');
  return dir;
}
const probe = (root, tool) => {
  const args = tool === 'occlusion' ? [path.join(ROOT, 'tests/tools/hands-occlusion.mjs'), '--port=8984'] : [path.join(ROOT, 'tests/tools/hands-probe.mjs'), '--layouts=L', '--port=8978'];
  if (root) args.push('--root=' + root);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 600000 });
  const txt = r.stdout || '';
  try { return JSON.parse(txt.slice(txt.indexOf('{'))); } catch (e) { return { parseError: String(e), stderr: (r.stderr || '').slice(0, 400) }; }
};
const results = [];
for (const m of MUTANTS) {
  let dir = null;
  try {
    dir = buildTree(m);
    const r = probe(dir, m.tool);
    const red = !!r.gates && r.gates[m.gate] === false;
    results.push({ id: m.id, gate: m.gate, what: m.what, red, gates: r.gates || null, err: r.parseError || null });
    console.log(`${red ? '紅 ✅' : '沒紅 ❌'} ${m.id} → ${m.gate}=${r.gates ? r.gates[m.gate] : '?'}`);
  } catch (e) { results.push({ id: m.id, gate: m.gate, error: String(e) }); console.log('錯誤', m.id, String(e)); }
  finally { if (dir) { try { fs.unlinkSync(path.join(dir, 'assets')); } catch (e) { /* junction 已不在 */ } fs.rmSync(dir, { recursive: true, force: true }); } }
}
const base = probe(null), baseOcc = probe(null, 'occlusion');
const summary = { mutants: results.length, allRed: results.every((x) => x.red), baselinePass: !!base.pass && !!baseOcc.pass, baselineGates: base.gates, baselineOcclusionGates: baseOcc.gates };
if (OUT) fs.writeFileSync(path.resolve(ROOT, OUT), JSON.stringify({ summary, results }, null, 1));
console.log(JSON.stringify(summary));
process.exit(summary.allRed && summary.baselinePass ? 0 : 1);

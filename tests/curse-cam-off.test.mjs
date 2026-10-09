// 中咒鏡頭預設關（驗收凍結 docs/experiments/2026-10-10-curse-cam-off/acceptance.md §1–§4）。
// 真實鏈路：tests/tools/curse-cam-probe.mjs 開真頁面、出價走 pushBid3d、開標結果走 revealGlow（detail.cam 由 index.html 自己算），
// 經 fitSubject 逐槽取景回饋後量施咒者的手是否落到桌遠緣以上（使用者回報「在天空上給」）。cam-unit 不經取景，量不到這件事。
// CURSE_CAM_ROOT＝要量的樹（預設本樹；鑑別力時指向 c1a4d167／5c91bdc7 的樹，治具仍用本樹那一份）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const ROOT = path.resolve(process.env.CURSE_CAM_ROOT || HERE);
const QS = ['', 'cam=0', 'cursecam=1', 'cam=0&cursecam=1'];
const VPS = [['V3', 9761], ['V2', 9762]]; // 844×390、932×430
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'curse-cam-off-'));

function probe(vp, port) {
  const out = path.join(OUT, `${vp}.json`);
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ['tests/tools/curse-cam-probe.mjs', `--root=${ROOT}`, `--vp=${vp}`, `--port=${port}`, `--qs=${QS.join('|')}`, `--dst=${out}`, `--out=${path.join(OUT, "gp-" + vp)}`], { cwd: HERE, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = ''; p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; });
    const to = setTimeout(() => { p.kill(); reject(new Error(`${vp} probe 逾時\n${log}`)); }, 1500000);
    p.on('close', (code) => { clearTimeout(to); if (code !== 0) return reject(new Error(`${vp} probe exit ${code}\n${log}`)); resolve(JSON.parse(fs.readFileSync(out, 'utf8'))); });
  });
}
const DATA = Object.fromEntries(await Promise.all(VPS.map(async ([vp, port]) => [vp, await probe(vp, port)])));
const run = (vp, q, slot) => { const r = DATA[vp].runs.find((x) => x.q === q && x.slot === slot); assert.ok(r, `量不到 ${vp} q=${q} slot=${slot}`); return r; };
const rim = (r) => { const hv = r.curse.filter((f) => f.hand); assert.ok(hv.length > 0, '施咒者手全程不可見＝量不到，判紅'); return hv.filter((f) => f.hand.aboveRim).length; };
const len = (p) => Math.hypot(p[0], p[1], p[2]);
const table = (q) => VPS.map(([vp]) => `${vp}:` + [0, 1, 2, 3].map((s) => rim(run(vp, q, s))).join('/')).join(' ');

test('§1 中咒期間施咒者手不上天：西→東四槽×兩視窗，手高於桌遠緣幀數 預設 ≤ 同情境 ?cam=0＋5', () => {
  console.log(`[curse-cam-off] root=${ROOT}\n  預設      ${table('')}\n  ?cam=0    ${table('cam=0')}\n  cursecam=1 ${table('cursecam=1')}\n  cam=0&cursecam=1 ${table('cam=0&cursecam=1')}`);
  for (const [vp] of VPS) for (const s of [0, 1, 2, 3]) {
    const d = rim(run(vp, '', s)), z = rim(run(vp, 'cam=0', s));
    assert.ok(d <= z + 5, `${vp} 槽${s}：預設 ${d} 幀手高於桌遠緣 > ?cam=0 的 ${z}＋5（中咒鏡頭把機位壓低，手落到天空）`);
  }
});

test('§2 中咒期間相機高度 ≥ 事件前一幀 −0.02 m、俯角 ≥ 事件前一幀 −0.3°（預設）', () => {
  for (const [vp] of VPS) for (const s of [0, 1, 2, 3]) {
    const r = run(vp, '', s), y0 = r.pre.pos[1], p0 = r.pre.pitch;
    const dy = Math.min(...r.curse.map((f) => f.pos[1] - y0)), dp = Math.min(...r.curse.map((f) => f.pitch - p0));
    assert.ok(dp >= -0.3, `${vp} 槽${s}：俯角最多掉 ${dp.toFixed(2)}° < −0.3°`);
    assert.ok(dy >= -0.02, `${vp} 槽${s}：相機高度最多掉 ${dy.toFixed(3)} m < −0.02 m`);
  }
});

test('§3 喊價鏡頭仍作用：預設出價微推峰值 ∈[2.5%,4.5%]（對同樹 ?cam=0 同幀），?cam=0 不推', () => {
  for (const [vp] of VPS) for (const s of [0, 1, 2, 3]) {
    const on = run(vp, '', s).bid, off = run(vp, 'cam=0', s).bid;
    assert.equal(on.length, off.length, '前置：出價窗幀數相同');
    const push = Math.max(...on.map((f, i) => 1 - len(f.pos) / len(off[i].pos)));
    assert.ok(push >= 0.025 && push <= 0.045, `${vp} 槽${s}：預設出價微推峰值 ${(push * 100).toFixed(2)}% 不在 [2.5%,4.5%]`);
    const offOff = run(vp, 'cam=0&cursecam=1', s).bid;
    const push0 = Math.max(...offOff.map((f, i) => Math.abs(1 - len(f.pos) / len(off[i].pos))));
    assert.ok(push0 <= 1e-6, `${vp} 槽${s}：?cam=0&cursecam=1 出價時仍推 ${push0}`);
  }
});

test('§4 ?cursecam=1 重現舊中咒鏡頭（旗標有效）；?cam=0 總開關優先', () => {
  for (const [vp] of VPS) for (const s of [0, 1, 2, 3]) {
    const c1 = run(vp, 'cursecam=1', s), z = rim(run(vp, 'cam=0', s));
    if (s <= 1) assert.ok(rim(c1) >= z + 50, `${vp} 槽${s}：?cursecam=1 手高於桌遠緣 ${rim(c1)} 幀 < ?cam=0 的 ${z}＋50（旗標沒接上）`);
    const dp = Math.min(...c1.curse.map((f) => f.pitch - c1.pre.pitch));
    assert.ok(dp <= -1.0, `${vp} 槽${s}：?cursecam=1 俯角最多只掉 ${dp.toFixed(2)}°（> −1.0°，中咒鏡頭沒作用）`);
    const both = rim(run(vp, 'cam=0&cursecam=1', s));
    assert.ok(both <= z + 5, `${vp} 槽${s}：?cam=0&cursecam=1 ${both} 幀 > ?cam=0 的 ${z}＋5（cursecam 蓋過 cam=0）`);
  }
});

test('前置：探針頁面 0 個 console error／pageerror', () => {
  for (const [vp] of VPS) assert.deepEqual(DATA[vp].errs, [], `${vp} 頁面錯誤`);
});

// v0.62.0：新手網格＋B 皮膚（青面斑塊與拇指橫紋已調整）皮膚成為預設。實頁斷言（走真實鏈路：http.server＋Playwright Chromium 開 index.html）：
//   不帶 ?skin     ⇒ 手的材質名為 hand-skin-proto-b（預設＝B）
//   ?skin=0 / off  ⇒ 手的材質不是 hand-skin-proto-*（退回新手網格＋原本的寫實 shader）
//   ?skin=a        ⇒ 原型值照舊（hand-skin-proto-a）
//   ?handreal=0    ⇒ 既有總開關照舊：不載入寫實材質、也就不是 proto
// 每個模式完整載入 0 pageerror。
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT; // 突變驗紅：指向修改前的暫存樹
const PORT = 9733;

test('預設皮膚＝B 皮膚（青面斑塊與拇指橫紋已調整）；?skin=0／off 退回舊 shader；?skin=a 與 ?handreal=0 照舊', { timeout: 240000 }, async () => {
  const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const out = {};
    for (const q of ['', '?skin=0', '?skin=off', '?skin=a', '?skin=ab', '?handreal=0']) {
      const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
      await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
      const page = await ctx.newPage();
      const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
      await page.goto(`http://127.0.0.1:${PORT}/index.html${q}`);
      await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
      await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
      const r = await page.evaluate(async () => {
        const T = window.__yaoshi3d.tray;
        await T.loaded(); await T.hands.ready();
        const seats = [0, 1, 2, 3].map((id) => ({ id, role: ['hunter', 'qingmian', 'hongyi', 'zutou'][id] }));
        T.props.clearRound(); T.hands.clear(); T.props.setSeats(seats); T.hands.setSeats(seats);
        document.dispatchEvent(new CustomEvent('ys:bid', { detail: { seat: 0, slot: 1, amount: 8 } }));
        await new Promise((res) => setTimeout(res, 300));
        const names = []; T.hands.group.children.forEach((h) => h.traverse((o) => { if (o.isSkinnedMesh) names.push(o.material.name); }));
        return { names, b1Error: T.hands.stats().b1Error };
      });
      await ctx.close();
      out[q || '(none)'] = { ...r, errs };
      assert.deepEqual(errs, [], `${q || '無參數'} 完整載入應 0 pageerror`);
    }
    const skin = (k) => out[k].names.filter((n) => /^hand-skin-proto-/.test(n));
    assert.ok(out['(none)'].names.length >= 1, '有畫出手');
    assert.ok(out['(none)'].names.every((n) => n === 'hand-skin-proto-b'), '不帶參數：每隻手材質都是 hand-skin-proto-b ' + JSON.stringify(out['(none)']));
    for (const k of ['?skin=0', '?skin=off']) { assert.ok(out[k].names.length >= 1, k + ' 有畫出手'); assert.equal(skin(k).length, 0, k + ' 不得是 proto 材質 ' + JSON.stringify(out[k])); }
    assert.ok(out['?skin=ab'].names.every((n) => n === 'hand-skin-proto-ab'), '?skin=ab 原型值照舊');
    assert.ok(out['?skin=a'].names.every((n) => n === 'hand-skin-proto-a'), '?skin=a 原型值照舊 ' + JSON.stringify(out['?skin=a']));
    assert.equal(skin('?handreal=0').length, 0, '?handreal=0 照舊：不是 proto');
  } finally { await browser.close(); srv.kill(); }
});

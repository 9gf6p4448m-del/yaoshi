// v0.65.5 對白框 D 造型（C 骨架＋系別小飾）實頁斷言（http.server＋Playwright Chromium 開真的 index.html）。
// 全部以 getComputedStyle（含 ::before／::after）的實際值為行為斷言，不是看 class 名或 CSS 原文：
//   D1 10 角色的泡都有 data-role；三系小飾（香火＝朱紅金邊小方印／祖靈＝骨色菱紋帶／陰氣＝暗綠光暈＋不對稱下緣＋斷續綠火線）
//      存在且彼此不同；斷手書生（主修系隨機）無系別小飾；10 個角色色邊各不相同。
//   D2 data-role 在 newGame 換角色後、renderSeats 重畫後、bubbleRestore 補回後都等於「當下」座位角色。
//   D3 文字對比≥4.5（文字色 vs 木牌漸層兩端）；小飾的盒子不與文字矩形相交（不降低文字區對比）。
//   D4 844x390 北／西／東長句泡在視窗內、字級≥14px（每個角色各驗並截圖：YAOSHI_SHOT_DIR）。
// 基準對照：YAOSHI_RENDER_ROOT=<舊版 worktree> 可對舊版 index.html 跑同一份測試（舊版應紅在 D1／D2）。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = 9753;
const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';
const ROLES = ['qingmian', 'hongyi', 'duanshou', 'shoujing', 'hunter', 'xiaonv', 'lvshan', 'zutou', 'dangpu', 'luzhu'];
const FAMILY = { shoujing: 'xianghuo', lvshan: 'xianghuo', luzhu: 'xianghuo', zutou: 'xianghuo', hunter: 'zuling', hongyi: 'yinqi', xiaonv: 'yinqi', dangpu: 'yinqi', qingmian: 'yinqi', duanshou: 'none' };

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT 指向含 node_modules/playwright 的目錄）');
}

async function withPage(fn) {
  const { chromium } = loadPlaywright();
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push('console:' + m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`);
    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
    await page.evaluate(() => { window.__yaoshi.newGame('solo', 1, ['qingmian']); });
    await page.waitForTimeout(1200);
    await fn(page, errs);
  } finally { await browser.close(); srv.kill(); }
}

/* 頁內：掃 (人類選角, seed) 組合，每個角色找一個「坐在 1／2／3 席」的 (picks, seed, seat)。 */
const FIND_SEATS = `(() => {
  const want = ${JSON.stringify(ROLES)}, found = {};
  const picks = ['qingmian', 'hunter', 'luzhu', 'dangpu'];
  for (const pk of picks) for (let seed = 1; seed <= 40 && Object.keys(found).length < want.length; seed++) {
    window.__yaoshi.newGame('solo', seed, [pk]);
    [1, 2, 3].forEach((id) => { const r = window.__yaoshi.S.players[id].roleId; if (!found[r]) found[r] = { pk, seed, id }; });
  }
  return found;
})()`;

/* 頁內：抓某座位泡的 computed 快照（本體＋::before＋::after＋文字矩形）。 */
const SNAP = `((id) => {
  const b = document.getElementById('bub' + id), cs = getComputedStyle(b);
  const ps = (pe) => { const c = getComputedStyle(b, pe); return { content: c.content, bgColor: c.backgroundColor, bgImage: c.backgroundImage, transform: c.transform,
    w: parseFloat(c.width) || 0, h: parseFloat(c.height) || 0, top: c.top, right: c.right, bottom: c.bottom, left: c.left, borderColor: c.borderTopColor, bc: [c.borderTopColor, c.borderRightColor, c.borderBottomColor, c.borderLeftColor], borderStyle: c.borderTopStyle, boxShadow: c.boxShadow }; };
  const br = b.getBoundingClientRect();
  return { dataRole: b.dataset.role, color: cs.color, bgImage: cs.backgroundImage, bgColor: cs.backgroundColor, boxShadow: cs.boxShadow, fontSize: parseFloat(cs.fontSize),
    borderLeft: cs.borderLeftColor, borderRight: cs.borderRightColor, borderTop: cs.borderTopColor,
    radius: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius],
    before: ps('::before'), after: ps('::after'), rect: { l: br.left, t: br.top, r: br.right, b: br.bottom, w: br.width, h: br.height } };
})`;

async function snapRoles(page) {
  const found = await page.evaluate(FIND_SEATS);
  const out = {};
  for (const role of ROLES) {
    const f = found[role];
    assert.ok(f, `掃不到坐在 1／2／3 席的角色 ${role}`);
    out[role] = await page.evaluate(({ f, SNAP }) => {
      window.__yaoshi.newGame('solo', f.seed, [f.pk]);
      return { cur: window.__yaoshi.S.players[f.id].roleId, snap: eval(SNAP)(f.id) };
    }, { f, SNAP });
    out[role].seat = f;
  }
  return out;
}

const hasContent = (p) => p.content && p.content !== 'none' && p.content !== 'normal';
const hasDeco = (p) => hasContent(p) && (p.bgColor !== 'rgba(0, 0, 0, 0)' || p.bgImage !== 'none') ;

test('D1 10 角色的泡都有 data-role；三系小飾存在且彼此不同、斷手書生無系別小飾、色邊各不同', { timeout: 120000 }, async () => {
  await withPage(async (page, errs) => {
    const R = await snapRoles(page);
    console.log('D1', JSON.stringify(Object.fromEntries(ROLES.map((r) => [r, { dr: R[r].snap.dataRole, bl: R[r].snap.borderLeft, b4: R[r].snap.before.bgColor, b4i: R[r].snap.before.bgImage.slice(0, 40), sh: R[r].snap.boxShadow.slice(0, 60) }]))));
    // 角色色邊：10 個互不相同，且左右同色
    const borders = ROLES.map((r) => R[r].snap.borderLeft);
    assert.equal(new Set(borders).size, ROLES.length, `10 角色色邊應各不相同：${borders.join(' | ')}`);
    for (const r of ROLES) assert.equal(R[r].snap.borderLeft, R[r].snap.borderRight, `${r} 左右色邊應同色`);
    // 香火：右上角朱紅小方印（斜放、金邊）
    for (const r of ROLES.filter((x) => FAMILY[x] === 'xianghuo')) {
      const b = R[r].snap.before;
      assert.ok(hasContent(b), `${r} 香火印 ::before 應存在`);
      assert.equal(b.bgColor, 'rgb(200, 50, 31)', `${r} 印色應為朱紅`);
      assert.notEqual(b.transform, 'none', `${r} 印應斜放（45deg）`);
      assert.match(b.borderColor, /rgb\(232, 200, 96\)/, `${r} 印應有金邊`);
      assert.ok(b.w > 0 && b.w <= 12 && b.h > 0 && b.h <= 12, `${r} 印應為小方印（<=12px）：${b.w}x${b.h}`);
      assert.notEqual(b.top, 'auto'); assert.notEqual(b.right, 'auto');
    }
    // 祖靈：底緣骨色菱紋帶（兩層 repeating-linear-gradient、無底色）
    {
      const b = R.hunter.snap.before;
      assert.ok(hasContent(b), '獵人菱紋帶 ::before 應存在');
      assert.equal(b.bgColor, 'rgba(0, 0, 0, 0)');
      assert.equal((b.bgImage.match(/repeating-linear-gradient/g) || []).length, 2, '菱紋＝兩層交叉斜紋');
      assert.match(b.bgImage, /rgb\(217, 180, 122\)/, '骨色');
      assert.ok(b.h > 0 && b.h <= 4, `菱紋帶應是細帶：${b.h}`);
      assert.equal(b.bottom, '2px', '貼底緣');
    }
    // 陰氣：框外暗綠微光暈＋不對稱下緣＋斷續綠火線
    for (const r of ROLES.filter((x) => FAMILY[x] === 'yinqi')) {
      const s = R[r].snap;
      assert.match(s.boxShadow, /rgba\(90, 200, 120, 0\.38\) 0px 0px 9px/, `${r} 應有框外暗綠光暈`);
      assert.ok(!/inset[^,]*rgba\(90, 200, 120/.test(s.boxShadow), `${r} 綠光只在框外（不可 inset）`);
      assert.notEqual(s.radius[2], s.radius[3], `${r} 下緣左右圓角應不對稱：${s.radius}`);
      assert.ok(parseFloat(s.radius[2]) > parseFloat(s.radius[0]), `${r} 下緣圓角應大於上緣`);
      assert.ok(hasContent(s.before), `${r} 綠火線 ::before 應存在`);
      assert.equal((s.before.bgImage.match(/linear-gradient/g) || []).length, 1);
      assert.match(s.before.bgImage, /rgba\(0, 0, 0, 0\)/, `${r} 火線應斷續（含 transparent 段）`);
      assert.match(s.before.bgImage, /rgb\(127, 208, 150\)/, `${r} 火線綠`);
      assert.ok(s.before.h > 0 && s.before.h <= 3);
    }
    // 三系彼此不同（小飾的形態指紋兩兩相異）
    const fp = (r) => { const s = R[r].snap; return JSON.stringify([s.before.bgColor, s.before.bgImage, s.before.transform, s.boxShadow, s.radius]); };
    const fams = { xianghuo: fp('shoujing'), zuling: fp('hunter'), yinqi: fp('hongyi') };
    assert.equal(new Set(Object.values(fams)).size, 3, '三系小飾應兩兩不同');
    for (const [fam, roles] of [['xianghuo', ['shoujing', 'lvshan', 'luzhu', 'zutou']], ['yinqi', ['hongyi', 'xiaonv', 'dangpu', 'qingmian']]])
      for (const r of roles) assert.equal(fp(r), fams[fam], `${r} 應與同系 ${fam} 的小飾一致`);
    // 斷手書生：無系別小飾（無 ::before、無綠光、圓角四角對稱、陰影＝基底木牌陰影）
    {
      const s = R.duanshou.snap;
      assert.ok(!hasContent(s.before), `斷手書生不應有 ::before 小飾：${JSON.stringify(s.before)}`);
      assert.ok(!/90, 200, 120/.test(s.boxShadow), '斷手書生不應有綠光');
      assert.equal(s.radius[2], s.radius[3], '斷手書生下緣應對稱');
      assert.equal(s.radius[0], s.radius[2], '斷手書生圓角四角一致（基底木牌）');
      assert.equal(R.hunter.snap.after.content !== 'none', true, '尾巴 ::after 是全角色共用的骨架');
      assert.equal(s.after.content !== 'none', true, '斷手書生仍有指向座位的尾巴');
    }
    // 每個角色都有尾巴，且尾巴色＝角色色邊
    for (const r of ROLES) {
      const a = R[r].snap.after;
      assert.ok(hasContent(a), `${r} 應有尾巴`);
      assert.ok(a.bc.includes(R[r].snap.borderLeft), `${r} 尾巴色應＝角色色邊 ${R[r].snap.borderLeft}，實際 ${a.bc}`);
    }
    for (const role of ROLES) {
      assert.equal(R[role].snap.dataRole, role, `${role} 的泡必須有 data-role=${role}`);
      assert.equal(R[role].cur, role);
    }
    assert.deepEqual(errs, []);
  });
});

test('D2 data-role 隨「當下」座位角色：newGame 換角色後、renderSeats 重畫後、bubbleRestore 補回後', { timeout: 120000 }, async () => {
  await withPage(async (page, errs) => {
    const r = await page.evaluate(() => new Promise((resolve) => {
      SKIP = false;
      const roles = () => [1, 2, 3].map((i) => S.players[i].roleId);
      const attrs = () => [1, 2, 3].map((i) => document.getElementById('bub' + i).dataset.role || '');
      const out = { steps: [] };
      const rec = (name) => out.steps.push({ name, roles: roles(), attrs: attrs() });
      // 找兩個座位角色確實不同的種子
      window.__yaoshi.newGame('solo', 1, ['qingmian']); const a = roles().join();
      let seedB = 2; for (; seedB < 40; seedB++) { window.__yaoshi.newGame('solo', seedB, ['qingmian']); if (roles().join() !== a && roles().every((x, i) => x !== a.split(',')[i])) break; }
      out.seedB = seedB;
      window.__yaoshi.newGame('solo', 1, ['qingmian']); rec('newGame#1');
      say(1, '甲'); say(2, '乙'); say(3, '丙');
      renderSeats(); rec('renderSeats');
      bubbleRestore(); rec('bubbleRestore');
      out.shownAfterRestore = [1, 2, 3].map((i) => document.getElementById('bub' + i).classList.contains('show'));
      window.__yaoshi.newGame('solo', seedB, ['qingmian']); rec('newGame#B');
      renderSeats(); rec('renderSeats#B');
      say(2, '換局後再說'); bubbleRestore(); rec('say+restore#B');
      try { window.__yaoshi.newGame('solo', 1, ['qingmian'], { chapter: 1 }); rec('chapter1'); out.chapterOk = true; } catch (e) { out.chapterOk = String(e); }
      resolve(out);
    }));
    console.log('D2', JSON.stringify(r));
    assert.ok(r.seedB < 40, '要找得到兩局座位角色全不同的種子');
    for (const s of r.steps) assert.deepEqual(s.attrs, s.roles, `${s.name}：data-role 應等於當下座位角色`);
    const n1 = r.steps.find((s) => s.name === 'newGame#1'), nB = r.steps.find((s) => s.name === 'newGame#B');
    assert.notDeepEqual(n1.roles, nB.roles); // 換局確實換了角色
    for (let i = 0; i < 3; i++) assert.notEqual(nB.attrs[i], n1.attrs[i], `座位 ${i + 1} 換局後不得殘留上一局的 role`);
    assert.deepEqual(r.shownAfterRestore, [true, true, true]);
    assert.equal(r.chapterOk, true);
    assert.deepEqual(errs, []);
  });
});

// sRGB 相對亮度與對比
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const rgbs = (s) => [...s.matchAll(/rgba?\((\d+), (\d+), (\d+)/g)].map((m) => [+m[1], +m[2], +m[3]]);

test('D3 文字對比≥4.5（對木牌漸層兩端），系別小飾的盒子不蓋到文字區', { timeout: 120000 }, async () => {
  await withPage(async (page) => {
    const found = await page.evaluate(FIND_SEATS);
    const rows = [];
    for (const role of ROLES) {
      const f = found[role];
      const m = await page.evaluate(({ f, SNAP }) => {
        window.__yaoshi.newGame('solo', f.seed, [f.pk]); SKIP = false;
        say(f.id, '這是一句比較長的對白，用來檢查文字和小飾會不會互相蓋到。');
        const b = document.getElementById('bub' + f.id), s = eval(SNAP)(f.id);
        const rg = document.createRange(); rg.selectNodeContents(b); const tr = [...rg.getClientRects()];
        const T = { l: Math.min(...tr.map((x) => x.left)), t: Math.min(...tr.map((x) => x.top)), r: Math.max(...tr.map((x) => x.right)), b: Math.max(...tr.map((x) => x.bottom)) };
        const br = b.getBoundingClientRect();
        // ::before 在泡座標系的盒子（解析後 px）；斜放 45deg 的方印以外接正方形估（√2 倍）
        const pb = (pe) => { const c = getComputedStyle(b, pe); if (!c.content || c.content === 'none') return null;
          const w = parseFloat(c.width), h = parseFloat(c.height); const bw = parseFloat(getComputedStyle(b).borderLeftWidth);
          const tp = c.top === 'auto' ? null : parseFloat(c.top), bt = c.bottom === 'auto' ? null : parseFloat(c.bottom);
          const lf = c.left === 'auto' ? null : parseFloat(c.left), rt = c.right === 'auto' ? null : parseFloat(c.right);
          const W = br.width - 2 * bw, H = br.height - 2;
          const x0 = lf != null ? lf : W - rt - w, y0 = tp != null ? tp : H - bt - h;
          const rot = c.transform !== 'none' ? Math.SQRT2 : 1; const cx = br.left + bw + x0 + w / 2, cy = br.top + 1 + y0 + h / 2;
          return { l: cx - w * rot / 2, r: cx + w * rot / 2, t: cy - h * rot / 2, b: cy + h * rot / 2 }; };
        return { s, T, deco: pb('::before') };
      }, { f, SNAP });
      // 底色樣本＝漸層色標∪非透明的 background-color；樣本為空時 Math.min() 是 Infinity，斷言會恆真（空洞），所以下方另斷言樣本數≥1
      const fg = rgbs(m.s.color)[0];
      const stops = [...rgbs(m.s.bgImage), ...(/^rgba\(\d+, \d+, \d+, 0\)$|^transparent$/.test(m.s.bgColor) ? [] : rgbs(m.s.bgColor))];
      const cr = stops.map((st) => ratio(fg, st));
      const hit = m.deco && !(m.deco.r <= m.T.l || m.deco.l >= m.T.r || m.deco.b <= m.T.t || m.deco.t >= m.T.b);
      rows.push({ role, fg: fg.join(','), n: stops.length, stops: stops.map((x) => x.join(',')).join(' / '), minRatio: stops.length ? Math.min(...cr).toFixed(2) : 'NaN', deco: m.deco ? 'yes' : 'none', overlapsText: !!hit });
    }
    console.log('D3 contrast table\nrole\tfg\tn\tbg samples\tmin ratio\tdeco\toverlapsText\n' + rows.map((r) => [r.role, r.fg, r.n, r.stops, r.minRatio, r.deco, r.overlapsText].join('\t')).join('\n'));
    assert.equal(rows.length, ROLES.length, 'D3 應對 10 個角色各量一列');
    for (const r of rows) {
      assert.ok(r.n >= 1, `${r.role} 取不到任何底色樣本（對比斷言會空洞成立）`);
      assert.ok(Number.isFinite(+r.minRatio) && +r.minRatio >= 4.5, `${r.role} 文字對比 ${r.minRatio} < 4.5`);
      assert.equal(r.overlapsText, false, `${r.role} 小飾盒子不得蓋到文字`);
    }
  });
});

test('D4 844x390 北／西／東長句泡都在視窗內、字級≥14px（每個角色各驗並截圖）', { timeout: 180000 }, async () => {
  await withPage(async (page, errs) => {
    const found = await page.evaluate(FIND_SEATS);
    if (SHOT_DIR) fs.mkdirSync(SHOT_DIR, { recursive: true });
    for (const role of ROLES) {
      const f = found[role];
      await page.evaluate(({ f }) => { window.__yaoshi.newGame('solo', f.seed, [f.pk]); SKIP = false; }, { f });
      await page.waitForTimeout(700);
      await page.evaluate(() => { [1, 2, 3].forEach((id) => say(id, '這是一句比較長的對白，用來檢查泡會不會衝出視窗邊緣。')); });
      await page.waitForTimeout(500);
      const m = await page.evaluate(() => [1, 2, 3].map((id) => { const b = document.getElementById('bub' + id), r = b.getBoundingClientRect();
        return { id, role: b.dataset.role, fs: parseFloat(getComputedStyle(b).fontSize), l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight, show: b.classList.contains('show') }; }));
      for (const x of m) {
        assert.ok(x.show); assert.ok(x.fs >= 14, `${role}/seat ${x.id} 字級 ${x.fs}`);
        assert.ok(x.l >= 0 && x.t >= 0 && x.r <= x.w && x.b <= x.h, `${role}/seat ${x.id} 泡超出視窗 ${JSON.stringify(x)}`);
      }
      console.log('D4', role, 'seat', f.id, JSON.stringify(m.map((x) => [x.id, x.role, Math.round(x.l), Math.round(x.t), Math.round(x.r), Math.round(x.b)])));
      if (SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, `bubble-D-${role}-844x390.png`) });
    }
    assert.deepEqual(errs, []);
  });
});

test('D7 真頁面 console 0 error（開局＋換局＋三席說話）', { timeout: 120000 }, async () => {
  await withPage(async (page, errs) => {
    await page.evaluate(() => { SKIP = false; [1, 2, 3].forEach((id) => say(id, '你好')); window.__yaoshi.newGame('solo', 5, ['hunter']); renderSeats(); });
    await page.waitForTimeout(1500);
    assert.deepEqual(errs, []);
  });
});

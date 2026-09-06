// 系色小圖示小卷（2026-09-06，v0.37；凍結檔 docs/experiments/2026-09-06-acceptance-facchip.md）：
// 真的把一局玩到 N 場對決，每場讀 #pwch-A／#pwch-B 的隻數牌與系字徽，對照「從 S.players[].bag 獨立推出」的期望序列
// （不是拿 pwArmyView 自己對自己），量顏色（A1）、徽章（A2）、體型形狀（A3）、溢出（A5），
// 並把兩欄各截一張含編號的圖（A6 盲讀用；編號只標小方塊、不標徽章）。A5 最壞案例：頁內用 pwArenaHTML 合成單側 ≥16 片量版面後立即還原。
//
//   node tests/tools/facchip-probe.mjs <outdir> [--duels=12] [--seed=7] [--port=8881] [--dsf=3]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const { pos, opt } = parseArgs(process.argv.slice(2));
const [outdir] = pos;
if (!outdir) { console.error('need <outdir>'); process.exit(2); }
fs.mkdirSync(outdir, { recursive: true });
const DUELS = Number(opt.duels || 12);
const SEED = Number(opt.seed || 7);
const port = Number(opt.port || 8881);
const DSF = Number(opt.dsf || 3);

/** 三系淺色（assets/theme.css:24-29 的 --c-*-light）→ computed rgb 字串；null 系＝.pwchip 預設灰 */
const RGB = { zuling: 'rgb(212, 168, 112)', xianghuo: 'rgb(240, 128, 96)', yinqi: 'rgb(112, 176, 128)', none: 'rgb(138, 138, 138)' };

const LABEL_CSS = `#__fcLabels{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font:700 5px/1 system-ui,sans-serif}
#__fcLabels b{position:absolute;transform:translate(-50%,-100%);color:#fff;background:rgba(0,0,0,.7);border-radius:2px;padding:0 1px}`;

const srv = await serve(ROOT, port);
const results = [];
let worst = null;
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: DSF });
  const url = `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=${SEED}`;
  const r = await drive(page, url, {
    duels: DUELS,
    onDuel: async (pg, n) => {
      await pg.waitForTimeout(1400); // 隻數牌逐片進場（STAGGER 45ms × 片數 ＋ CAP 280ms）
      const m = await pg.evaluate(({ RGB }) => {
        const Y = window.__yaoshi; const S = Y.S;
        const cur = window.__rec.duels[window.__rec.duels.length - 1];
        const out = { n: null, sides: {}, overflow: {}, burntAny: false };
        for (const tag of ['A', 'B']) {
          const pid = tag === 'A' ? cur.a : cur.b;
          const p = S.players.find((x) => x.id === pid);
          // 期望序列：袋 → 隊（同 buildArmy 的規則，但這裡是治具自己抄的一份、不呼叫引擎）
          const teams = [];
          for (const x of (p.bag || [])) {
            if (x.curse) continue;
            const u = x.unit || (Math.max(0, x.p | 0) >= 6 ? { body: 'elite', count: 1 } : { body: 'ward', count: 1 });
            if (!(u.count | 0)) continue;
            teams.push({ fac: x.f || null, body: u.body, count: u.count | 0 });
          }
          if (!teams.length) teams.push({ fac: null, body: 'swarm', count: 1 });
          const expUnits = []; teams.forEach((t, ti) => { for (let i = 0; i < t.count; i++) expUnits.push({ t: ti, fac: t.fac, body: t.body }); });
          const box = document.getElementById('pwch-' + tag);
          const kids = [...box.children].map((el) => {
            const cs = getComputedStyle(el); const rc = el.getBoundingClientRect();
            return { kind: el.classList.contains('pwfac') ? 'badge' : 'chip', cls: el.className, id: el.id, text: el.textContent,
              bg: cs.backgroundColor, bc: cs.borderTopColor, bs: cs.borderTopStyle, bw: cs.borderTopWidth, op: cs.opacity, fl: cs.filter,
              w: +rc.width.toFixed(1), h: +rc.height.toFixed(1), x: rc.left, y: rc.top, burnt: el.classList.contains('burnt') };
          });
          const chips = kids.filter((k) => k.kind === 'chip'); const badges = kids.filter((k) => k.kind === 'badge');
          if (chips.some((c) => c.burnt)) out.burntAny = true;
          // A1：片數＝期望隻數；顏色＝該片期望系色（ward 看邊框色，其餘看底色）
          const a1 = [];
          chips.forEach((c, i) => {
            const e = expUnits[i]; if (!e) { a1.push({ i, err: 'extra chip' }); return; }
            const want = RGB[e.fac || 'none'];
            const got = e.body === 'ward' ? c.bc : c.bg;
            const okBody = c.cls.includes(' ' + e.body + ' ');
            if (got !== want || !okBody || c.id !== `pwc-${tag}-${i}`) a1.push({ i, want, got, body: e.body, cls: c.cls, id: c.id });
          });
          if (chips.length !== expUnits.length) a1.push({ err: 'count', chips: chips.length, exp: expUnits.length });
          // A2：徽數＝隊數；徽字＝該隊系名首字（肉＝兜底）；徽緊接在該隊第一片之前
          const NAME = { zuling: '祖', xianghuo: '香', yinqi: '陰' };
          const a2 = [];
          if (badges.length !== teams.length) a2.push({ err: 'count', badges: badges.length, teams: teams.length });
          let bi = 0;
          kids.forEach((k, idx) => { if (k.kind !== 'badge') return; const t = teams[bi++]; if (!t) return;
            const want = t.fac ? NAME[t.fac] : '肉'; const next = kids[idx + 1];
            if (k.text !== want || k.bg !== RGB[t.fac || 'none'] || !next || next.kind !== 'chip') a2.push({ bi: bi - 1, want, text: k.text, bg: k.bg, nextKind: next && next.kind }); });
          // A3：體型形狀簽名（尺寸／邊框樣式／透明度）
          const sig = {};
          chips.forEach((c, i) => { const b = expUnits[i] && expUnits[i].body; if (b && !sig[b]) sig[b] = { w: c.w, h: c.h, bs: c.bs, bw: c.bw, op: c.op, fl: c.fl, bgTransparent: c.bg === 'rgba(0, 0, 0, 0)' }; });
          const col = document.getElementById(tag === 'A' ? 'dL' : 'dR');
          out.sides[tag] = { pid, name: p.name, teams, chips: chips.length, badges: badges.length, a1, a2, sig,
            colOverflowX: col.scrollWidth > col.clientWidth, colRect: [col.scrollWidth, col.clientWidth],
            chipsBox: box.getBoundingClientRect().height, rows: new Set(chips.map((k) => Math.round(k.y))).size, /* 只數 chip：徽章 align-self:center 的 y 跟片不同，混算會把一行數成兩行 */
            key: chips.map((c, i) => ({ no: i + 1, fac: expUnits[i] ? expUnits[i].fac : null, body: expUnits[i] ? expUnits[i].body : null })) };
          out.sides[tag].kids = kids;
        }
        const du = document.getElementById('duel');
        out.overflow = { duelScroll: [du.scrollHeight, du.clientHeight], bodyScrollX: document.documentElement.scrollWidth > window.innerWidth };
        return out;
      }, { RGB });
      m.n = n;
      // 截兩欄（A6 盲讀用）：疊小方塊編號（只標 chip，不標徽章），截完拆掉
      const rects = await pg.evaluate(({ css }) => {
        const st = document.createElement('style'); st.id = '__fcStyle'; st.textContent = css; document.head.appendChild(st);
        const wrap = document.createElement('div'); wrap.id = '__fcLabels'; document.body.appendChild(wrap);
        const rc = {};
        for (const tag of ['A', 'B']) {
          const box = document.getElementById('pwch-' + tag); let no = 0;
          [...box.children].forEach((el) => { if (el.classList.contains('pwfac')) return; no++; const r = el.getBoundingClientRect();
            const b = document.createElement('b'); b.textContent = String(no); b.style.left = (r.left + r.width / 2) + 'px'; b.style.top = (r.top - 1) + 'px'; wrap.appendChild(b); });
          const c = document.getElementById(tag === 'A' ? 'dL' : 'dR').getBoundingClientRect();
          rc[tag] = { x: Math.max(0, c.left - 6), y: Math.max(0, c.top - 6), width: c.width + 12, height: c.height + 12 };
        }
        return rc;
      }, { css: LABEL_CSS });
      for (const tag of ['A', 'B']) await pg.screenshot({ path: path.join(outdir, `duel${n}-${tag}.png`), clip: rects[tag] });
      await pg.screenshot({ path: path.join(outdir, `duel${n}-full.png`) });
      await pg.evaluate(() => { for (const id of ['__fcLabels', '__fcStyle']) { const el = document.getElementById(id); if (el) el.remove(); } });
      results.push(m);
      // A5 最壞案例（只做一次）：合成單側 ≥16 片，同一段 evaluate 內量完就還原，時間軸插不進來
      if (n === 1) {
        worst = await pg.evaluate(() => {
          const S = window.__yaoshi.S;
          const big = POOL.filter((x) => x.unit && (x.unit.count | 0) >= 4).slice(0, 5); // ≥20 片
          const views = [pwArmyView({ bag: big }), pwArmyView({ bag: big.slice(0, 2) })];
          const f = { A: S.players[0], B: S.players[1], war: { unitsA: views[0].units.length, unitsB: views[1].units.length } };
          const arena = document.getElementById('duelArena'); const saved = arena.innerHTML;
          arena.innerHTML = pwArenaHTML(f, views);
          const col = document.getElementById('dL'); const box = document.getElementById('pwch-A');
          const kids = [...box.children];
          const res = { units: views[0].units.length, teams: big.length, chips: kids.filter((k) => k.classList.contains('pwchip')).length,
            badges: kids.filter((k) => k.classList.contains('pwfac')).length,
            colOverflowX: col.scrollWidth > col.clientWidth, colRect: [col.scrollWidth, col.clientWidth],
            chipsBoxH: +box.getBoundingClientRect().height.toFixed(1), rows: new Set(kids.filter((k) => k.classList.contains('pwchip')).map((k) => Math.round(k.getBoundingClientRect().y))).size,
            duelScroll: [document.getElementById('duel').scrollHeight, document.getElementById('duel').clientHeight] };
          arena.innerHTML = saved;
          return res;
        });
      }
    },
  });
  await browser.close();
  // 總結
  const a1Bad = results.flatMap((m) => ['A', 'B'].flatMap((t) => m.sides[t].a1.map((e) => ({ n: m.n, t, ...e }))));
  const a2Bad = results.flatMap((m) => ['A', 'B'].flatMap((t) => m.sides[t].a2.map((e) => ({ n: m.n, t, ...e }))));
  const sigAll = {}; results.forEach((m) => ['A', 'B'].forEach((t) => Object.assign(sigAll, Object.fromEntries(Object.entries(m.sides[t].sig).filter(([b]) => !sigAll[b])))));
  const sigVals = Object.values(sigAll).map((s) => JSON.stringify(s));
  const a3Ok = Object.keys(sigAll).length >= 2 && new Set(sigVals).size === sigVals.length;
  const overflowAny = results.some((m) => m.sides.A.colOverflowX || m.sides.B.colOverflowX || m.overflow.bodyScrollX);
  const best = results.slice().sort((a, b) => Math.min(b.sides.A.chips, b.sides.B.chips) - Math.min(a.sides.A.chips, a.sides.B.chips))[0];
  const summary = { outdir, duels: results.length, errors: r.errors.length, ver: r.ver,
    A1: a1Bad.length ? { fail: a1Bad.slice(0, 10) } : 'pass', A2: a2Bad.length ? { fail: a2Bad.slice(0, 10) } : 'pass',
    A3: { ok: a3Ok, sig: sigAll }, A5: { overflowAny, worst, rowsMax: Math.max(...results.flatMap((m) => [m.sides.A.rows, m.sides.B.rows])) },
    burntAtShot: results.filter((m) => m.burntAny).map((m) => m.n),
    perDuel: results.map((m) => ({ n: m.n, A: [m.sides.A.chips, m.sides.A.badges], B: [m.sides.B.chips, m.sides.B.badges] })),
    biggest: best ? { n: best.n, A: best.sides.A.chips, B: best.sides.B.chips } : null };
  fs.writeFileSync(path.join(outdir, 'facchip-probe.json'), JSON.stringify({ summary, results, errors: r.errors }, null, 1));
  console.log(JSON.stringify(summary));
  if (r.errors.length) console.log(r.errors.slice(0, 10).join('\n'));
} finally { srv.kill(); }

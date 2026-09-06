// 系色小圖示小卷 A6 盲讀圖（2026-09-06）：真對局打到第 1 場對決後，把 #duelArena 換成「指定名冊」的 pwArenaHTML
// （同 P-2 faction-sheet 的合成名冊做法：真對局的袋子湊不出 8v8），疊小方塊編號（只標 chip、不標徽章），
// 兩欄各截一張＋落 key JSON（編號→系／體型），截完把 arena 還原。
//   node tests/tools/facchip-sheet.mjs <outdir> [--seed=7] [--port=8891] [--dsf=3] [--a=ab,ab,...] [--b=ab,ab,...]
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
const SEED = Number(opt.seed || 7);
const port = Number(opt.port || 8891);
const DSF = Number(opt.dsf || 3);
// 兩側各 ≥8 片、三系皆有、體型混合：A＝祖靈 6（弓1／盾2／舟3）＋香火 4（劍1／五營旗3）＋陰氣 4（紅帽4）＝14 片 6 隊
//                                   B＝香火 3（令旗2／虎爺1）＋祖靈 3（祖靈眼2／雷女1）＋陰氣 7（髮簪4／指甲1／飼鬼甕2）＝13 片 7 隊
const A = String(opt.a || 'bow,shield,boat,sword,wuying,redhat').split(',');
const B = String(opt.b || 'flag,tiger,eye,thunder,hairpin,nail,sigui').split(',');

const LABEL_CSS = `#__fcLabels{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font:700 5px/1 system-ui,sans-serif}
#__fcLabels b{position:absolute;transform:translate(-50%,-100%);color:#fff;background:rgba(0,0,0,.7);border-radius:2px;padding:0 1px}`;

const srv = await serve(ROOT, port);
let key = null;
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: DSF });
  const url = `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=${SEED}`;
  const r = await drive(page, url, {
    duels: 1,
    onDuel: async (pg, n) => {
      if (n !== 1) return;
      await pg.waitForTimeout(1400);
      key = await pg.evaluate(({ A, B, css }) => {
        const S = window.__yaoshi.S;
        const cur = window.__rec.duels[window.__rec.duels.length - 1];
        const byAb = (ab) => POOL.find((x) => (x.ab || x.m) === ab);
        const bagA = A.map(byAb).filter(Boolean), bagB = B.map(byAb).filter(Boolean);
        const views = [pwArmyView({ bag: bagA }), pwArmyView({ bag: bagB })];
        const f = { A: S.players.find((p) => p.id === cur.a), B: S.players.find((p) => p.id === cur.b), war: { unitsA: views[0].units.length, unitsB: views[1].units.length } };
        const arena = document.getElementById('duelArena'); const saved = arena.innerHTML;
        arena.innerHTML = pwArenaHTML(f, views);
        window.__fcSaved = saved; window.__fcViews = views;
        return { units: [views[0].units.length, views[1].units.length] };
      }, { A, B, css: LABEL_CSS });
      // 換掉 innerHTML 會讓 .fighter 的 anim-clash 進場動畫重播：先等它跑完再凍結，否則標籤座標與凍住的欄位錯位（第一版實測）
      await pg.waitForTimeout(1400);
      key = await pg.evaluate(({ A, B, css }) => {
        const views = window.__fcViews; const saved = window.__fcSaved;
        const byAb = (ab) => POOL.find((x) => (x.ab || x.m) === ab);
        document.dispatchEvent(new CustomEvent('ys:hitstop', { detail: { ms: 120000 } })); // 3D 與 CSS 動畫凍住
        const st = document.createElement('style'); st.id = '__fcStyle'; st.textContent = css; document.head.appendChild(st);
        const wrap = document.createElement('div'); wrap.id = '__fcLabels'; document.body.appendChild(wrap);
        const out = { saved, rects: {}, sides: {}, missing: { A: A.filter((ab) => !byAb(ab)), B: B.filter((ab) => !byAb(ab)) } };
        for (const tag of ['A', 'B']) {
          const v = views[tag === 'A' ? 0 : 1];
          const box = document.getElementById('pwch-' + tag); let no = 0; const rows = [];
          [...box.children].forEach((el) => { if (el.classList.contains('pwfac')) return; const u = v.units[no]; no++; const rc = el.getBoundingClientRect();
            const b = document.createElement('b'); b.textContent = String(no); b.style.left = (rc.left + rc.width / 2) + 'px'; b.style.top = (rc.top - 1) + 'px'; wrap.appendChild(b);
            rows.push({ no, fac: u ? u.fac : null, body: u ? u.body : null, ab: u ? u.ab : null, burnt: el.classList.contains('burnt') }); });
          const c = document.getElementById(tag === 'A' ? 'dL' : 'dR').getBoundingClientRect();
          out.rects[tag] = { x: Math.max(0, c.left - 6), y: Math.max(0, c.top - 6), width: c.width + 12, height: c.height + 12 };
          out.sides[tag] = { units: v.units.length, teams: new Set(v.units.map((u) => u.t)).size, badges: [...box.children].filter((k) => k.classList.contains('pwfac')).length, rows,
            overflowX: document.getElementById(tag === 'A' ? 'dL' : 'dR').scrollWidth > document.getElementById(tag === 'A' ? 'dL' : 'dR').clientWidth,
            chipsRows: new Set([...box.children].filter((k) => k.classList.contains('pwchip')).map((k) => Math.round(k.getBoundingClientRect().y))).size };
        }
        return out;
      }, { A, B, css: LABEL_CSS });
      for (const tag of ['A', 'B']) await pg.screenshot({ path: path.join(outdir, `sheet-${tag}.png`), clip: key.rects[tag] });
      await pg.screenshot({ path: path.join(outdir, 'sheet-full.png') });
      await pg.evaluate(() => { for (const id of ['__fcLabels', '__fcStyle']) { const el = document.getElementById(id); if (el) el.remove(); }
        document.getElementById('duelArena').innerHTML = window.__fcSaved || ''; });
      delete key.saved;
    },
  });
  await browser.close();
  fs.writeFileSync(path.join(outdir, 'sheet-key.json'), JSON.stringify({ seed: SEED, dsf: DSF, A, B, key, errors: r.errors }, null, 1));
  console.log(JSON.stringify({ outdir, errors: r.errors.length, missing: key && key.missing,
    A: key && { units: key.sides.A.units, teams: key.sides.A.teams, badges: key.sides.A.badges, rows: key.sides.A.chipsRows, overflowX: key.sides.A.overflowX, burnt: key.sides.A.rows.filter((x) => x.burnt).length },
    B: key && { units: key.sides.B.units, teams: key.sides.B.teams, badges: key.sides.B.badges, rows: key.sides.B.chipsRows, overflowX: key.sides.B.overflowX, burnt: key.sides.B.rows.filter((x) => x.burnt).length } }));
  if (r.errors.length) console.log(r.errors.slice(0, 10).join('\n'));
} finally { srv.kill(); }

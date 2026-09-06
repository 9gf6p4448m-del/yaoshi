// 覆審探針：① ghost_* 尊的 OUTLINE_SKIP_MAT 會不會在對決當下多編一支 program
//            ② 外殼的 skeleton／bindMatrix 是不是真的跟本體同一份、matrixWorld 逐幀相同
//            ③ 燒毀後 shells visible／dissolve 同步
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from '../../../tests/tools/duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const { pos, opt } = parseArgs(process.argv.slice(2));
const port = Number(opt.port || 8895);
const srv = await serve(ROOT, port);
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  let res = null;
  const r = await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1${opt.q ? decodeURIComponent(String(opt.q)) : ''}`, {
    duels: 1,
    onDuel: async (pg, n) => {
      if (n !== 1) return;
      res = await pg.evaluate(async () => {
        const Y3 = window.__yaoshi3d;
        const cur = window.__rec.duels[window.__rec.duels.length - 1];
        const others = [0, 1, 2, 3].filter((s) => s !== cur.a && s !== cur.b);
        document.addEventListener('ys:fx-burn', (ev) => ev.stopImmediatePropagation(), true);
        const spawn = async (abs) => {
          const det = { a: others[0], b: others[1], armies: [{ units: abs.map((ab, i) => ({ id: i, body: 'elite', fac: 'zuling', ab })) }, { units: abs.map((ab, i) => ({ id: i, body: 'elite', fac: 'yinqi', ab })) }] };
          document.dispatchEvent(new CustomEvent('ys:duel', { detail: det }));
          await det.ready;
          await new Promise((r) => setTimeout(r, 1400));
        };
        const P = () => Y3.renderer.info.programs.length;
        const out = { steps: [] };
        // ① 非 ghost 的兩尊先跑一場（外殼 program 這時應已在暖身時編好）
        out.steps.push({ tag: 'boot', programs: P() });
        await spawn(['boartusk', 'shanshen']);
        out.steps.push({ tag: 'nonghost', programs: P() });
        await spawn(['boartusk', 'shanshen']);
        out.steps.push({ tag: 'nonghost2', programs: P() });
        // ② 第一次出現 ghost_* 尊（chair／buoy 都是 haunt，材質含 ghost_*）
        await spawn(['chair', 'buoy']);
        out.steps.push({ tag: 'ghost1', programs: P() });
        await spawn(['chair', 'buoy']);
        out.steps.push({ tag: 'ghost2', programs: P() });

        // ③ 外殼結構檢查
        const figs = Y3.duelFigures.figuresOf('A').concat(Y3.duelFigures.figuresOf('B'));
        out.figures = figs.map((f) => {
          const sh = typeof f.outlines === 'function' ? f.outlines() : [];
          const rows = sh.map((s) => {
            const body = s.parent;
            const sameSkel = !!(s.skeleton && body.skeleton && s.skeleton === body.skeleton);
            const sameGeo = s.geometry === body.geometry;
            const bindEq = s.bindMatrix && body.bindMatrix ? s.bindMatrix.elements.every((v, i) => v === body.bindMatrix.elements[i]) : null;
            const mwEq = s.matrixWorld.elements.every((v, i) => Math.abs(v - body.matrixWorld.elements[i]) < 1e-12);
            const mats = Array.isArray(s.material) ? s.material : [s.material];
            return { sameSkel, sameGeo, bindEq, mwEq, bindMode: s.bindMode, skipMats: mats.filter((m) => m.colorWrite === false).length, total: mats.length, visible: s.visible };
          });
          return { ab: f.unit && f.unit.ab, skin: f.skin, shells: sh.length, outlineColor: typeof f.outlineColor === 'function' ? f.outlineColor() : null, rows };
        });
        return out;
      });
    },
  });
  console.log(JSON.stringify({ res, errors: r.errors.slice(0, 6) }, null, 1));
  if (pos[0]) fs.writeFileSync(pos[0], JSON.stringify({ res, errors: r.errors }, null, 1));
  await browser.close();
} finally { srv.kill(); }

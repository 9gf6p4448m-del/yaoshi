/* 請神進場機位的動態交付物（請神存在感卷 乙-7，2026-09-13）
 *
 *   node tests/tools/legend-enter-gif.mjs <輸出目錄> [--port=9670] [--root=<靜態根目錄>]
 *        [--seed=7] [--frames=16] [--step=110]
 *
 * 做的事：在滿編 8v8（三尊分落兩側）站定之後派一顆 `ys:legend-enter`（ms＝tier 3 的 1400），
 * 逐幀截圖，用 PIL 併成一張 animated GIF ＋ 一張橫條 contact sheet。
 * 派的是**與 index.html 的 pwLegendEnter 同一顆事件**（同一個 detail 形狀），所以拍到的鏡頭
 * 就是玩家在「那一尊第一次上戰場」那一晚會看到的那一段，不是另外寫一套動畫。
 *
 * 與 legend-presence／legend-blindread 共用同一套 ys: 隔離：真實對決的時間軸不得在這段期間
 * 換掉名冊或把鏡頭收回牌桌（camera-director.js:306），不隔的話拍到的是別的東西。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { drive, serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright：worktree 需要 tools/anyCreature 或設 NODE_PATH');
})();

const { pos, opt } = parseArgs(process.argv.slice(2));
const OUT = pos[0];
if (!OUT) { console.error('need <outdir>'); process.exit(2); }
for (const k of Object.keys(opt)) if (!['port', 'root', 'seed', 'frames', 'step'].includes(k)) { console.error('不支援的旗標：--' + k); process.exit(2); }
const PORT = Number(opt.port || 9670);
const SEED = String(opt.seed || 7);
const NF = Number(opt.frames || 16);
const STEP = Number(opt.step || 110);
const SRC_ROOT = opt.root ? path.resolve(opt.root) : ROOT;
fs.mkdirSync(OUT, { recursive: true });

const ARMY = {
  A: [
    { ab: 'canri', body: 'elite', fac: 'zuling', lg: true, sn: '殘日' },
    { ab: 'dashiye', body: 'ward', fac: 'xianghuo', lg: true, sn: '大士爺' },
    { ab: 'tiger_c', body: 'elite', fac: 'xianghuo' }, { ab: 'shanshen', body: 'ward', fac: 'zuling' },
    { ab: 'redhat', body: 'haunt', fac: 'yinqi' }, { ab: 'sword', body: 'elite', fac: 'zuling' },
    { ab: 'fushou', body: 'ward', fac: 'xianghuo' }, { ab: 'eye', body: 'elite', fac: 'yinqi' },
  ],
  B: [
    { ab: 'youyinggong', body: 'haunt', fac: 'yinqi', lg: true, sn: '有應公' },
    { ab: 'youyinggong', body: 'haunt', fac: 'yinqi', lg: true, sn: '有應公' },
    { ab: 'tiger_c', body: 'elite', fac: 'xianghuo' }, { ab: 'shanshen', body: 'ward', fac: 'zuling' },
    { ab: 'redhat', body: 'haunt', fac: 'yinqi' }, { ab: 'sword', body: 'elite', fac: 'zuling' },
    { ab: 'fushou', body: 'ward', fac: 'xianghuo' }, { ab: 'bell', body: 'elite', fac: 'xianghuo' },
  ],
};

const SETUP = `async ({ army }) => {
  const cur = window.__rec.duels[window.__rec.duels.length - 1];
  const origDispatch = document.dispatchEvent.bind(document);
  document.dispatchEvent = (ev) => (ev && /^ys:/.test(ev.type) && !ev.__le ? true : origDispatch(ev));
  window.__lePass = (name, detail) => { const e = new CustomEvent(name, { detail }); e.__le = true; origDispatch(e); };
  const mk = (list) => list.map((u, i) => Object.assign({ id: i }, u));
  const det = { a: cur.a, b: cur.b, armies: [{ units: mk(army.A) }, { units: mk(army.B) }], maxFig: 8 };
  window.__lePass('ys:duel', det);
  await det.ready;
  const ov = document.getElementById('duel');
  const HIDE = ['duelArena', 'duelBeat', 'duelMove', 'duelResult', 'duelSub', 'dmgLayer', 'beatLamps', 'actorCard', 'duelLoad', 'modal', 'sheet', 'table', 'south', 'north'];
  if (ov) {
    ov.style.transition = 'none';
    setInterval(() => {
      ov.style.display = 'flex'; ov.classList.add('on'); ov.style.opacity = '1';
      HIDE.forEach((id) => { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; });
    }, 40);
  }
  await new Promise((r) => setTimeout(r, 1200));
  return true;
}`;

async function main() {
  const srv = await serve(SRC_ROOT, PORT);
  const raw = [];
  let errors = [];
  try {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    const r = await drive(page, `http://127.0.0.1:${PORT}/index.html?paperwar=1&fxcount=1&seed=${SEED}`, {
      duels: 1,
      onDuel: async (pg, n) => {
        if (n !== 1) return;
        await pg.evaluate(new Function('return (' + SETUP + ')')(), { army: ARMY });
        // 先拍一格全景當「切鏡之前」，再派事件
        const f0 = path.join(OUT, 'raw-00.png');
        await pg.screenshot({ path: f0 });
        raw.push(f0);
        await pg.evaluate(() => {
          const ms = window.__yaoshi.PW_FX.TRAIT_MS_BY_TIER[3]; // 時長只有這一個來源
          window.__lePass('ys:legend-enter', { side: 'A', unit: 0, ab: 'canri', ms });
        });
        for (let k = 1; k <= NF; k++) {
          await pg.waitForTimeout(STEP);
          const f = path.join(OUT, `raw-${String(k).padStart(2, '0')}.png`);
          await pg.screenshot({ path: f });
          raw.push(f);
        }
      },
    });
    errors = r.errors;
    await browser.close();
  } finally { srv.kill(); }
  if (raw.length < 3) { console.error('只拍到 ' + raw.length + ' 幀'); process.exit(1); }

  const script = `
import sys
from PIL import Image
outdir, files, step = sys.argv[1], sys.argv[2].split('|'), int(sys.argv[3])
ims = [Image.open(f).convert('RGB') for f in files]
small = [im.resize((im.width//2, im.height//2), Image.LANCZOS) for im in ims]
small[0].save(outdir + '/legend-enter.gif', save_all=True, append_images=small[1:], duration=step, loop=0, optimize=True)
# 橫條 contact sheet：每 3 幀取一格，一行排開
pick = ims[::3]
W = sum(i.width//3 for i in pick); H = max(i.height//3 for i in pick)
sheet = Image.new('RGB', (W, H), (10, 8, 14)); x = 0
for i in pick:
    t = i.resize((i.width//3, i.height//3), Image.LANCZOS); sheet.paste(t, (x, 0)); x += t.width
sheet.save(outdir + '/legend-enter-strip.png')
print(len(ims), sheet.size)
`;
  const sp = path.join(OUT, '_gif.py');
  fs.writeFileSync(sp, script, 'utf8');
  const py = spawnSync('python', [sp, OUT, raw.join('|'), String(STEP)], { encoding: 'utf8' });
  if (py.status !== 0) { console.error(py.stderr || py.stdout); process.exit(1); }
  fs.unlinkSync(sp);
  raw.forEach((f) => fs.unlinkSync(f));
  console.log(JSON.stringify({ out: OUT, gif: path.join(OUT, 'legend-enter.gif'), strip: path.join(OUT, 'legend-enter-strip.png'), frames: raw.length, errors: errors.length }));
  if (errors.length) console.log(errors.slice(0, 5).join('\n'));
}

main();

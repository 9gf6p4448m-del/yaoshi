/* 傳說三尊「請神存在感」卷 G3 盲讀材料產生器（凍結檔 docs/experiments/2026-09-13-acceptance-legend-presence.md §2 G3）
 *
 *   node tests/tools/legend-blindread.mjs <輸出目錄> [--port=9660] [--root=<靜態根目錄>] [--seed=7] [--gap=520]
 *
 * 規格沿用 tests/tools/blindread-sheet.mjs 的那一套（凍結檔 L4／Q12）：
 *   **6 幀、2×3 排列、每格 780×360、總圖 1560×1080**；六格的檔名只有匿名編號，
 *   圖上不壓任何招名／尊名以外的提示；對應表寫進 `<輸出目錄>/mapping-HIDDEN.json`，**讀者不得看**。
 * 差別只在「拍什麼」：這一卷要驗的不是一支招，而是**滿編對決裡認不認得出哪一尊是請神來的**，
 * 所以六格拍的是同一場 8v8（A 側 殘日＋大士爺、B 側 有應公＋陪打）的六個時刻。
 *
 * 讀者要回答的題目（由主對話派，本治具只產材料）：
 *   「這張圖裡，哪一尊（或哪幾尊）是『請神』請下來的傳說？是哪一尊？」
 *
 * 與 legend-presence.mjs 共用同一套隔離（攔 ys: 事件）與同一組陪打名單，兩支量到的是同一個場面。
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
for (const k of Object.keys(opt)) if (!['port', 'root', 'seed', 'gap'].includes(k)) { console.error('不支援的旗標：--' + k); process.exit(2); }
const PORT = Number(opt.port || 9660);
const SEED = String(opt.seed || 7);
const GAP = Number(opt.gap || 150);
const SRC_ROOT = opt.root ? path.resolve(opt.root) : ROOT;
fs.mkdirSync(OUT, { recursive: true });

/* A 側：殘日（elite×1）＋大士爺（ward×1）＋陪打 6；B 側：有應公（haunt×2）＋陪打 6。
   三尊分落兩側＝遊戲裡真的做得到的最滿配置（全桌只有三尊，一尊只在一個人袋裡）。 */
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
  document.dispatchEvent = (ev) => (ev && /^ys:/.test(ev.type) && !ev.__lb ? true : origDispatch(ev));
  const mk = (list) => list.map((u, i) => Object.assign({ id: i }, u));
  const det = { a: cur.a, b: cur.b, armies: [{ units: mk(army.A) }, { units: mk(army.B) }], maxFig: 8 };
  const ev = new CustomEvent('ys:duel', { detail: det });
  ev.__lb = true;
  origDispatch(ev);
  await det.ready;
  /* ★把 DOM 那一層整個關掉★：讀者要判的是「3D 場上哪一尊是請神來的」，DOM 那半邊（拍首字幕、
     隻數牌、結果橫幅、第 N 夜視窗）既會在六格之間變來變去，也會**直接洩漏答案**
     （出手卡會印法寶名）。留下 #duel 自己的暗底當背景，其餘子層一律 visibility:hidden，
     並用計時器把 on 這個 class 釘住——真實對決約 5 秒就收場，不釘的話後面幾格會拍到牌桌。 */
  const ov = document.getElementById('duel');
  const HIDE = ['duelArena', 'duelBeat', 'duelMove', 'duelResult', 'duelSub', 'dmgLayer', 'beatLamps', 'actorCard', 'duelLoad', 'modal', 'sheet', 'table', 'south', 'north'];
  if (ov) {
    ov.style.transition = 'none';
    setInterval(() => {
      ov.style.display = 'flex'; ov.classList.add('on'); ov.style.opacity = '1';
      HIDE.forEach((id) => { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; });
      document.querySelectorAll('#duel .flashfx, #duel i.hurtedge').forEach((e) => { e.style.visibility = 'hidden'; });
    }, 40);
  }
  await new Promise((r) => setTimeout(r, 1100)); // 站定
  const D = window.__yaoshi3d.duelFigures;
  return { rosterA: D.figuresOf('A').map((f) => f.ab), rosterB: D.figuresOf('B').map((f) => f.ab) };
}`;

async function main() {
  const srv = await serve(SRC_ROOT, PORT);
  const raw = [];
  let setup = null;
  let errors = [];
  try {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
    // 每格 780×360：直接用這個視口拍，讀者看到的就是原尺寸，不經任何縮放
    const page = await browser.newPage({ viewport: { width: 780, height: 360 }, deviceScaleFactor: 2 });
    const r = await drive(page, `http://127.0.0.1:${PORT}/index.html?paperwar=1&fxcount=1&seed=${SEED}`, {
      duels: 1,
      onDuel: async (pg, n) => {
        if (n !== 1) return;
        setup = await pg.evaluate(new Function('return (' + SETUP + ')')(), { army: ARMY });
        for (let k = 0; k < 6; k++) {
          const f = path.join(OUT, `raw-${k}.png`);
          await pg.screenshot({ path: f });
          raw.push(f);
          if (k < 5) await pg.waitForTimeout(GAP);
        }
      },
    });
    errors = r.errors;
    await browser.close();
  } finally { srv.kill(); }
  if (raw.length !== 6) { console.error('只拍到 ' + raw.length + ' 幀'); process.exit(1); }

  // 匿名：六格洗牌後依序放進 2×3，對應表另存 mapping-HIDDEN.json（讀者不得看）
  const order = [4, 1, 5, 0, 3, 2]; // 固定的洗牌（治具要決定性；不是「時間順序」就達成匿名的目的）
  const script = `
import json, sys
from PIL import Image
outdir, files = sys.argv[1], sys.argv[2].split('|')
CW, CH = 780, 360
sheet = Image.new('RGB', (CW*2, CH*3), (10, 8, 14))
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((CW, CH), Image.LANCZOS)
    sheet.paste(im, ((i % 2)*CW, (i // 2)*CH))
sheet.save(outdir + '/sheet.png')
print(sheet.size)
`;
  const files = order.map((i) => raw[i]);
  const scriptPath = path.join(OUT, '_compose.py');
  fs.writeFileSync(scriptPath, script, 'utf8');
  const py = spawnSync('python', [scriptPath, OUT, files.join('|')], { encoding: 'utf8' });
  if (py.status !== 0) { console.error(py.stderr || py.stdout); process.exit(1); }
  fs.unlinkSync(scriptPath);

  fs.writeFileSync(path.join(OUT, 'mapping-HIDDEN.json'), JSON.stringify({
    note: '★讀者不得看★ 六格的來源幀與場上傳說配置',
    cells: order.map((srcIdx, cell) => ({ cell: '格' + (cell + 1), sourceFrame: srcIdx, tMs: srcIdx * GAP })),
    legends: { A: ['canri 殘日（畫面左）', 'dashiye 大士爺（畫面左）'], B: ['youyinggong 有應公 ×2（畫面右）'] },
    roster: setup, seed: SEED, viewport: '780x360 @2x', sheet: '1560x1080',
  }, null, 1), 'utf8');
  fs.writeFileSync(path.join(OUT, 'READER-PROMPT.txt'),
    '這張圖是同一場「紙紮夜戰」的六個時刻（每格一個時刻，左右各八尊）。\n'
    + '問題：每一格裡，哪幾尊是「請神」請下來的傳說尊？請指出位置（左／右、第幾個）並說出你認為它是哪一尊。\n'
    + '不知道就寫「看不出來」。請不要參考任何說明文件。\n', 'utf8');
  raw.forEach((f) => fs.unlinkSync(f));
  console.log(JSON.stringify({ out: OUT, sheet: path.join(OUT, 'sheet.png'), errors: errors.length }));
  if (errors.length) console.log(errors.slice(0, 5).join('\n'));
}

main();

// 《紙紮夜戰》後處理卷 P-2（2026-09-06）：陣營盲讀用的 8v8 對照圖。
//
//   node tests/tools/faction-sheet.mjs <outdir> [--port=8871] [--w=390] [--h=844] [--seed=7]
//                                      [--unitsa=ab,ab,...] [--unitsb=...] [--tag=]
//
// 做兩張同種子、同名冊、同機位的截圖：描邊開（faction-on.png）與 ?outline=0（faction-off.png），
// 兩張都在畫面上疊 1–16 的編號（DOM 標籤，位置＝該尊頭頂往下一點的投影，落在該尊 bbox 投影內），
// 另外落一份 faction-key.json（編號→id→ab→系→標籤座標→該尊 bbox 的螢幕投影）。
//
// 為什麼要等 camStable：duel-figures 的排法（幾排、整側縮多少）鎖在「該側 GLB 全就位 ＋ 相機距離
// 穩定」的那一幀（duel-figures.js:559-575）。沒等就截圖，兩張圖的站位可能不同排法，盲讀就變成在比排版。
//
// 直式（390×844）：妖市的正式版面是橫持，直式會蓋上 #rotateHint（index.html:39）。
// 這支治具把那層蓋板藏起來（只藏 visibility，不動 display＝不動版面），底下的牌桌照常跑。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

/** ab → 系（index.html:1586-1613 的 POOL；ab 缺者用 m 當 GLB 名）。 */
const FAC = {
  bow: 'zuling', shield: 'zuling', balen: 'zuling', eye: 'zuling', thunder: 'zuling', boat: 'zuling', boartusk: 'zuling', xianji: 'zuling', shanshen: 'zuling',
  flag: 'xianghuo', sword: 'xianghuo', wangchuan: 'xianghuo', bell: 'xianghuo', wuying: 'xianghuo', tiger: 'xianghuo', ashcharm: 'xianghuo', fushou: 'xianghuo', pojun: 'xianghuo',
  redhat: 'yinqi', hairpin: 'yinqi', chair: 'yinqi', raincoat: 'yinqi', buoy: 'yinqi', nail: 'yinqi', yinyangcoin: 'yinqi', guoyin: 'yinqi', sigui: 'yinqi',
};
// 兩隊各 8 隻、每隊每系至少 2 隻（A＝3 祖靈／2 香火／3 陰氣，B＝2／3／3）。
// 體型一律 elite：三系的隻數與大小都不帶訊息，讀者只能靠顏色分——不然純度可能是靠拓樸拿到的（P-2 的紅線）。
const A_DEFAULT = ['bow', 'shanshen', 'boartusk', 'sword', 'bell', 'redhat', 'nail', 'hairpin'];
const B_DEFAULT = ['shield', 'eye', 'flag', 'wangchuan', 'tiger', 'chair', 'raincoat', 'buoy'];

const { pos, opt } = parseArgs(process.argv.slice(2));
const [outdir] = pos;
if (!outdir) { console.error('need <outdir>'); process.exit(2); }
fs.mkdirSync(outdir, { recursive: true });
const W = Number(opt.w || 390);
const H = Number(opt.h || 844);
const SEED = Number(opt.seed || 7);
const TAG = opt.tag ? String(opt.tag) : '';
const A = String(opt.unitsa || A_DEFAULT.join(',')).split(',');
const B = String(opt.unitsb || B_DEFAULT.join(',')).split(',');
const port = Number(opt.port || 8871);

const LABEL_CSS = `#__fsLabels{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font:700 15px/1 system-ui,sans-serif}
#__fsLabels b{position:absolute;transform:translate(-50%,-50%);color:#fff;background:rgba(0,0,0,.55);
border-radius:9px;padding:1px 5px;text-shadow:0 0 3px #000;box-shadow:0 0 0 1px rgba(255,255,255,.35)}`;

/**
 * @param preset 描邊關的那一輪沿用描邊開算出來的標籤座標。
 *   站位在兩輪之間是同一份（同種子、同名冊、同機位），但 idle 動畫的相位不會剛好一樣，
 *   頭頂投影會差個 1–3 px；避讓規則在臨界點上會因此翻面，同一個號碼在兩張圖裡差到 69px
 *   （實測 #8 hairpin）——讀者對照兩張圖時就會對錯尊。座標算一次、兩張共用最乾淨。
 */
async function shoot(outline, preset) {
  const srv = await serve(ROOT, port + (outline ? 0 : 1));
  try {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    // 直式時 index.html 會整頁蓋上「請把手機轉橫」：藏掉那層（visibility，不動 display＝不動版面）
    await page.addInitScript(`document.addEventListener('DOMContentLoaded',()=>{ const el=document.getElementById('rotateHint'); if(el) el.style.visibility='hidden'; });`);
    let key = null;
    const url = `http://127.0.0.1:${port + (outline ? 0 : 1)}/index.html?paperwar=1&fxcount=1&seed=${SEED}${outline ? '' : '&outline=0'}`;
    const r = await drive(page, url, {
      duels: 1,
      onDuel: async (pg, n) => {
        if (n !== 1) return;
        key = await pg.evaluate(async ({ A, B, FAC, css, preset }) => {
          const Y3 = window.__yaoshi3d;
          const cur = window.__rec.duels[window.__rec.duels.length - 1];
          const others = [0, 1, 2, 3].filter((s) => s !== cur.a && s !== cur.b); // 不在真對決裡的座位＝不吃撞擊
          // 真對決的時間軸還在跑：燒毀會把合成名冊裡同 id 的尊燒掉、punch／lunge 會動鏡頭與站位、
          // fx-impact 會在桌心噴一團橘火星（第一版兩張圖差在這裡：一張正好拍到火星團、整張泛橘）
          ['ys:fx-burn', 'ys:fx-punch', 'ys:fx-lunge', 'ys:fx-impact', 'ys:duel-end', 'ys:table', 'ys:reveal', 'ys:end', 'ys:fx-trait', 'ys:fx-trait-cancel']
            .forEach((nm) => document.addEventListener(nm, (ev) => ev.stopImmediatePropagation(), true));
          const mk = (list) => list.map((ab, i) => ({ id: i, body: 'elite', fac: FAC[ab] || 'zuling', ab }));
          const det = { a: others[0], b: others[1], armies: [{ units: mk(A) }, { units: mk(B) }] };
          document.dispatchEvent(new CustomEvent('ys:duel', { detail: det }));
          document.addEventListener('ys:duel', (ev) => ev.stopImmediatePropagation(), true); // 之後的真對決不得換掉名冊
          await det.ready;
          // 等站位鎖定：GLB 全就位（det.ready）＋相機距離連兩幀不變（camStable）＋座標連兩幀不動
          const cam = Y3.camera;
          const stable = async () => {
            let last = null, same = 0;
            for (let k = 0; k < 400; k++) {
              await new Promise((res) => requestAnimationFrame(res));
              const figs = Y3.duelFigures.figuresOf('A').concat(Y3.duelFigures.figuresOf('B'));
              const sig = cam.position.length().toFixed(4) + '|' + figs.map((f) => f.group.position.x.toFixed(4) + ',' + f.group.position.z.toFixed(4) + ',' + f.group.scale.x.toFixed(4)).join(';');
              same = sig === last ? same + 1 : 0;
              last = sig;
              if (same >= 30) return { frames: k, camLen: +cam.position.length().toFixed(4) }; // 連 30 幀（約 0.5 秒）完全沒動
            }
            return { frames: -1, camLen: +cam.position.length().toFixed(4) };
          };
          const settle = await stable();
          document.dispatchEvent(new CustomEvent('ys:hitstop', { detail: { ms: 120000 } })); // 疊標籤與截圖期間畫面不再動
          // 把牌桌 DOM 藏起來（visibility，不動 display＝不動版面與 sceneKind）：兩張圖的真對決
          // 進度不會剛好一樣，留著字幕與隻數牌只會在兩張圖之間多出無關的差異，而且那是題目外的線索
          [...document.body.children].forEach((el) => { if (el.tagName !== 'CANVAS') el.style.visibility = 'hidden'; });
          // 疊編號：1–8＝A（畫面左）、9–16＝B（畫面右），位置＝頭頂往下一點的投影
          const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
          const wrap = document.createElement('div'); wrap.id = '__fsLabels'; document.body.appendChild(wrap);
          cam.updateMatrixWorld();
          const V3 = cam.position.constructor;
          const iw = window.innerWidth, ih = window.innerHeight;
          const proj = (x, y, z) => { const v = new V3(x, y, z).project(cam); return [(v.x * 0.5 + 0.5) * iw, (-v.y * 0.5 + 0.5) * ih]; };
          const rows = [];
          const placed = []; // 已放好的標籤中心，用來避開重疊
          let no = 0;
          for (const side of ['A', 'B']) {
            for (const f of Y3.duelFigures.figuresOf(side)) {
              no++;
              const p = f.group.getWorldPosition(new V3());
              const b = f.bounds();
              const sc = f.group.scale.x;
              // bbox 的 8 個角投影 → 螢幕框（驗收：標籤中心要落在這個框裡）
              const cs = [];
              for (const dx of [b ? b.min.x : -0.3, b ? b.max.x : 0.3]) for (const dy of [b ? b.min.y : 0, b ? b.max.y : 1.2]) for (const dz of [b ? b.min.z : -0.3, b ? b.max.z : 0.3]) cs.push(proj(p.x + dx * sc, p.y + dy * sc, p.z + dz * sc));
              const bx = [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])), Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[1]))];
              // 標籤位置：頭頂略往下（一定在 bbox 裡）；跟已放好的標籤撞在一起就沿著這尊的中軸往下退，
              // 退到 bbox 底還是撞就放回頭頂——不然前排的大隻會把後排的號碼整個蓋掉，讀者對不出編號屬於哪一尊
              let lx = 0, ly = 0;
              if (preset && preset[no - 1]) { [lx, ly] = preset[no - 1]; } else {
                for (const k of [0.94, 0.72, 0.5, 0.3, 0.12, 0.94]) {
                  [lx, ly] = proj(p.x, p.y + (b ? b.max.y : 1.2) * sc * k, p.z);
                  if (k === 0.94 && placed.length === 0) break;
                  if (!placed.some(([px2, py2]) => Math.abs(px2 - lx) < 20 && Math.abs(py2 - ly) < 17)) break;
                }
              }
              placed.push([lx, ly]);
              const el = document.createElement('b'); el.textContent = String(no); el.style.left = lx + 'px'; el.style.top = ly + 'px';
              wrap.appendChild(el);
              rows.push({ no, side, id: f.unit.id, ab: f.ab, fac: f.unit.fac, outline: f.outlineColor ? f.outlineColor() : null,
                label: [+lx.toFixed(1), +ly.toFixed(1)], bboxScreen: bx.map((v) => +v.toFixed(1)),
                inBox: lx >= bx[0] && lx <= bx[2] && ly >= bx[1] && ly <= bx[3], vis: f.group.visible, shells: f.outlines ? f.outlines().length : 0 });
            }
          }
          await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
          return { rows, settle, viewport: [iw, ih], camLen: +cam.position.length().toFixed(4) };
        }, { A, B, FAC, css: LABEL_CSS, preset: preset || null });
        await pg.screenshot({ path: path.join(outdir, `faction-${outline ? 'on' : 'off'}${TAG}.png`) });
      },
    });
    await browser.close();
    return { key, errors: r.errors };
  } finally { srv.kill(); }
}

const on = await shoot(true);
const off = await shoot(false, on.key ? on.key.rows.map((r) => r.label) : null);
const keyPath = path.join(outdir, `faction-key${TAG}.json`);
fs.writeFileSync(keyPath, JSON.stringify({
  seed: SEED, viewport: [W, H], deviceScaleFactor: 2, unitsA: A, unitsB: B,
  note: '編號 1–8＝畫面左（A 隊）、9–16＝畫面右（B 隊）；on＝描邊開、off＝?outline=0 對照組',
  on: on.key, off: off.key, errors: { on: on.errors, off: off.errors },
}, null, 1));
const badBox = (on.key ? on.key.rows.filter((x) => !x.inBox) : []).map((x) => x.no);
const same = on.key && off.key && on.key.rows.length === off.key.rows.length
  && on.key.rows.every((x, i) => x.ab === off.key.rows[i].ab && Math.abs(x.label[0] - off.key.rows[i].label[0]) < 5 && Math.abs(x.label[1] - off.key.rows[i].label[1]) < 5);
console.log(JSON.stringify({
  outdir, key: keyPath, n: on.key ? on.key.rows.length : 0, labelsOutsideBbox: badBox,
  sameLayoutOnOff: !!same, camLenOn: on.key && on.key.camLen, camLenOff: off.key && off.key.camLen,
  settleOn: on.key && on.key.settle, settleOff: off.key && off.key.settle,
  shellsOn: on.key ? on.key.rows.reduce((s, x) => s + x.shells, 0) : 0, shellsOff: off.key ? off.key.rows.reduce((s, x) => s + x.shells, 0) : 0,
  errors: on.errors.length + off.errors.length,
}));
if (on.errors.length) console.log(on.errors.slice(0, 5).join('\n'));
if (off.errors.length) console.log(off.errors.slice(0, 5).join('\n'));

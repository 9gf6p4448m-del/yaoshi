/* 桌上道具探針（上桌卷 v0.56b **第二段**，凍結檔 `2026-09-13-acceptance-table3d-c.md` U1／U2／U4／U5）
   跑法：node tests/tools/props-probe.mjs <png 前綴> [--port=8896] [--seed=1] [--w=844] [--h=390]
                                          [--portrait]（改量 390×844 直式分支）
                                          [--mem]（U4：籌碼／令牌每夜生成釋放 5 輪 +0／+0）
                                          [--gif=<目錄>]（連拍推籌碼／拍令牌各一組 png，交給 art-a-sheet.py 併 GIF）
   做的事（**全部走產品自己的路**，治具不另抄一份幾何或投影算式）：
     ① 走到第 1 夜盯上頁 → 用產品的 `pickMark` 拍令牌、`submitHumanBids` 推籌碼
     ② 讀 `tray.props.stats()`：幾枚錢／幾枚令牌／四席信物各是哪個角色、各花幾個三角形
        （凍結檔「每件 ≤300 三角形」判在這裡）
     ③ **命中測試排除**（U2）：對每一件道具的螢幕中心叫 `tray.hitTest(u,v)`，
        而且直接檢查 raycaster 的目標清單裡有沒有道具層的物件——
        只驗「點下去沒事」會被「剛好沒對準」蒙混過去，所以兩條都驗。
     ④ 每一件道具的 NDC 包圍盒：在不在畫面內、在不在掏空窗內（U5 的「看得到」）
     ⑤ `?tray3d=0` 與 `?table3d=0` 對照：道具層必須一件都不在場（U6 的 kill switch）
   純量測：不改任何檔、不碰版控。 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import fsSync from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'),
    /* Git worktree 位於 `.codex-worktrees/<name>` 時，專案共用的瀏覽器依賴在工作樹上兩層。 */
    path.resolve(ROOT, '../../tools/anyCreature/package.json'),
    path.resolve(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) if (fsSync.existsSync(c)) return createRequire(c)('playwright');
  throw new Error('找不到 playwright（試過：' + cands.join('、') + '）');
})();

const argv = process.argv.slice(2);
const opt = {}; const pos = [];
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
const OUT = pos[0] || path.join(ROOT, 'props');
const PORT = Number(opt.port || 8896);
const SEED = Number(opt.seed || 1);
const PORTRAIT = !!opt.portrait;
const W = Number(opt.w || (PORTRAIT ? 390 : 844));
const H = Number(opt.h || (PORTRAIT ? 844 : 390));
const GIFDIR = opt.gif || null;
/* `--root=<靜態根目錄>`：量基準樹／突變體時用。★一定要真的吃它★——第一版寫死 `serve(ROOT)`
   把這個旗標**靜默吃掉**，跑突變體量到的其實是工作樹（本卷就踩到：把 `geometry.dispose()`
   拿掉之後竟然還是 +0／+0，看起來像「這條判準零鑑別力」，實際是治具沒換頁）。 */
const SRC_ROOT = opt.root ? path.resolve(ROOT, opt.root) : ROOT;

function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  return new Promise((r) => setTimeout(() => r(srv), 900));
}

/* 頁內量測：NDC 包圍盒（做法與 scene-shot.mjs 的 PROBE 同一套，刻意不共用——
   那一支是「遠景剪影」專用的封裝，硬接會讓兩邊互相牽制）。 */
const NDCBOX = `((name) => {
  const Y3 = window.__yaoshi3d; if (!Y3) return null;
  const cam = Y3.camera; const V3 = cam.position.constructor; const tmp = new V3();
  let root = null; Y3.scene.traverse((o) => { if (o.name === name) root = o; });
  if (!root) return null;
  let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9,any=false,tris=0,drawn=0;
  const shown=(o)=>{ for(let n=o;n;n=n.parent) if(!n.visible) return false; return true; };
  root.updateWorldMatrix(true,true);
  const each=(o)=>{
    if(!o.isMesh) return;
    const g=o.geometry; if(!g) return;
    const cnt = o.isInstancedMesh ? o.count : 1;
    if(cnt<=0) return;
    if(!g.boundingBox) g.computeBoundingBox();
    const b=g.boundingBox; if(!b) return;
    tris += ((g.index?g.index.count:g.attributes.position.count)/3)*cnt;
    drawn++;
    /* InstancedMesh 的包圍盒要逐 instance 算（幾何的 bbox 是「一枚錢」的，不是「32 枚在桌上的」） */
    const mats=[];
    if(o.isInstancedMesh){ const M=new (cam.matrixWorld.constructor)(); for(let i=0;i<o.count;i++){ o.getMatrixAt(i,M); mats.push(M.clone().premultiply(o.matrixWorld)); } }
    else mats.push(o.matrixWorld);
    for(const mw of mats) for(let i=0;i<8;i++){
      tmp.set(i&1?b.max.x:b.min.x, i&2?b.max.y:b.min.y, i&4?b.max.z:b.min.z);
      tmp.applyMatrix4(mw); tmp.project(cam);
      if(tmp.z<-1||tmp.z>1) continue;
      any=true;
      if(tmp.x<minx)minx=tmp.x; if(tmp.x>maxx)maxx=tmp.x;
      if(tmp.y<miny)miny=tmp.y; if(tmp.y>maxy)maxy=tmp.y;
    }
  };
  root.traverse(each);
  if(!any) return { name, shown: shown(root), box:null, tris, meshes: drawn };
  return { name, shown: shown(root), meshes: drawn, tris: Math.round(tris),
    box:{ minx:+minx.toFixed(3), miny:+miny.toFixed(3), maxx:+maxx.toFixed(3), maxy:+maxy.toFixed(3) },
    onScreen: maxx>-1 && minx<1 && maxy>-1 && miny<1 };
})`;

/** 走到第 1 夜的盯上頁（`不盯任何一件` 出現且可按） */
async function toMarkPage(page) {
  for (let i = 0; i < 600; i++) {
    const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn'); const S=window.__yaoshi.S;
      return { t:b?b.textContent:'', d:b?b.disabled:true, r:S?S.round:0 }; })()`);
    if (st.r === 1 && /不盯任何一件/.test(st.t) && !st.d) return true;
    /* 直式：產品蓋一層滿版 `#rotateHint` 要玩家轉橫，真實點擊全被它攔下
       ⇒ 改用 `el.click()` 直接派事件。量的是 3D 版面不是命中測試，橫式那條照舊走真實點擊。 */
    if (!st.d && PORTRAIT) await page.evaluate(`(()=>{const b=document.getElementById('mainbtn'); if(b) b.click();})()`);
    else if (!st.d) await page.click('#mainbtn').catch(() => {});
    else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled); if(e)e.click(); })()`);
    await page.waitForTimeout(14);
  }
  return false;
}

async function openPage(browser, query) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => errs.push('requestfailed: ' + r.url()));
  await page.goto(`http://127.0.0.1:${PORT}/index.html${query || ''}`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
  await page.waitForFunction('!!window.__yaoshi3d && !!window.__yaoshi3d.tray', { timeout: 20000 });
  await page.evaluate((sd) => {
    CFG.T = 1;
    const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
    window.__yaoshi.newGame('solo', sd, ['qingmian']);
  }, SEED);
  return { ctx, page, errs };
}

/* ── U4：籌碼／令牌每夜生成釋放 5 輪 +0／+0 ───────────────────────────────
 *  ★量的是道具層★：用產品自己的 `bid`／`mark`／`clearRound` 走五輪，
 *  每輪都把四席八枚錢與四枚令牌推滿再清掉。GLB 那一半是第一段的 T4 在管，不重複量。
 *  假綠：只推一席；只量 geometries 不量 textures；用「空清單」清（那不是釋放路徑）。 */
async function runMem(browser) {
  const { ctx, page, errs } = await openPage(browser, '');
  try {
    if (!await toMarkPage(page)) throw new Error('沒走到第 1 夜盯上頁（量測前提不成立）');
    await page.evaluate(`(async () => { const t=window.__yaoshi3d.tray; if(t&&t.loaded) await t.loaded(); })()`);
    await page.waitForTimeout(400);
    const rows = await page.evaluate(async () => {
      const Y3 = window.__yaoshi3d, P = Y3.tray.props, info = Y3.renderer.info;
      const out = [];
      const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      for (let round = 0; round < 5; round++) {
        for (let seat = 0; seat < 4; seat++) {
          for (let slot = 0; slot < 4; slot++) P.bid(seat, slot, 9); // 9 > 上限 8 ⇒ 走「一串」那條路也一起行使
          P.mark(seat, seat);
        }
        await wait();
        const full = { chips: P.stats().chips, tokens: P.stats().tokens, geo: info.memory.geometries, tex: info.memory.textures };
        P.clearRound();
        await wait();
        out.push({ round: round + 1, full, after: { geo: info.memory.geometries, tex: info.memory.textures } });
      }
      return out;
    });
    /* ★真正有鑑別力的那一半★（`02 §6.1` 第 1 條）：籌碼與令牌走**固定池**（InstancedMesh 各一顆，
       建一次就不再長），所以上面那五輪 +0／+0 是**建構上保證**的，對「有沒有漏」幾乎零鑑別力。
       會逐件 new／dispose 幾何的是**信物**（`setSeats` 換角色時重建）——這一段把四席在兩組角色之間
       來回換 5 輪，量的才是真的釋放路徑。突變驗紅：把 `setSeats` 裡的 `geometry.dispose()`
       拿掉，這一段每輪 +4 geometries（見報告 §3 U4）。 */
    const relicRows = await page.evaluate(async () => {
      const Y3 = window.__yaoshi3d, P = Y3.tray.props, info = Y3.renderer.info;
      const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const A = ['qingmian', 'hongyi', 'duanshou', 'hunter'];
      const B = ['xiaonv', 'lvshan', 'luzhu', 'dangpu'];
      const set = (rs) => P.setSeats(rs.map((r, i) => ({ id: i, role: r })));
      const out = [];
      set(A); await wait();
      const base = { geo: info.memory.geometries, tex: info.memory.textures };
      for (let i = 0; i < 5; i++) {
        set(B); await wait();
        const mid = { geo: info.memory.geometries, tex: info.memory.textures };
        set(A); await wait();
        out.push({ round: i + 1, mid, back: { geo: info.memory.geometries, tex: info.memory.textures },
          relics: P.stats().relics.map((r) => r.role) });
      }
      return { base, out };
    });
    return { rows, relicRows, errors: errs };
  } finally { await ctx.close(); }
}

/* ── `--chipaudit=<夜數>`：籌碼池夠不夠（r1 覆審 HIGH-1 的紅／綠證據）─────────────
 *  走**真實產品路徑**（solo 逐夜點 `#mainbtn` 玩完），只在 `props.bid` 上掛一層**記錄用**的
 *  wrapper（不改行為、不裝替身），每一夜開標之後比對：
 *    ① 這一夜一共要求推幾枚（Σ min(amount, MAX)，>MAX 的算 STRING.n 枚）
 *    ② 桌上實際幾枚（`stats().chips`）③ 有沒有被砍掉（`stats().dropped`）
 *  ④ 逐筆 (seat,slot) 的 want→on 是否相符
 *  修前（池子 32）：seed 1 第 3 夜要 40 枚、桌上 32、dropped 8 ⇒ 紅。 */
async function runChipAudit(browser, nights) {
  const { ctx, page, errs } = await openPage(browser, '');
  try {
    await page.waitForTimeout(300);
    await page.evaluate(`(() => {
      const P = window.__yaoshi3d.tray.props;
      window.__bidCalls = [];
      const o = P.bid.bind(P);
      P.bid = function (seat, slot, amount) { window.__bidCalls.push({ seat, slot, amount }); return o(seat, slot, amount); };
    })()`);
    const rows = []; let lastRound = -1;
    for (let guard = 0; guard < 6000 && rows.length < nights; guard++) {
      const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn'); const S=window.__yaoshi.S;
        return { t:b?b.textContent:'', d:b?b.disabled:true, r:S?S.round:0 }; })()`);
      if (/再入妖市/.test(st.t)) break; // 局末：不要按下去（那是 location.reload()）
      if (/開標 ▸/.test(st.t) && !st.d && st.r !== lastRound) {
        lastRound = st.r;
        // 開標的推送已經跑完（startReveal 同步派完所有 ys:bid）
        const got = await page.evaluate(`(() => {
          const P = window.__yaoshi3d.tray.props, s = P.stats();
          const calls = window.__bidCalls.slice(); window.__bidCalls.length = 0;
          const MAX = window.__yaoshi3d.PROPS.CHIP.MAX, SN = window.__yaoshi3d.PROPS.CHIP.STRING.n;
          // 只算開標那一批（每筆 amount>0）；同一 (seat,slot) 後蓋前
          const last = {};
          calls.forEach(c => { if (c.amount > 0) last[c.seat + ':' + c.slot] = c.amount; });
          const want = Object.keys(last).reduce((n, k) => n + (last[k] > MAX ? SN : Math.min(MAX, last[k])), 0);
          return { want, chips: s.chips, dropped: s.dropped, pool: s.chipPool, bids: s.bids,
                   entries: Object.keys(last).map(k => k + '=' + last[k]) };
        })()`);
        got.round = st.r;
        got.mismatch = got.bids.filter((b) => b.on !== (b.stand ? 8 : Math.min(8, b.want)));
        rows.push(got);
      }
      if (!st.d) await page.click('#mainbtn').catch(() => {});
      else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled); if(e)e.click(); })()`);
      await page.waitForTimeout(12);
    }
    return { rows, errors: errs };
  } finally { await ctx.close(); }
}

/* ── `--slam`：木撞擊音有沒有接到**真正的落地事件**（r1 覆審 HIGH-3 的紅／綠證據）──
 *  `ys:mark-slam` 只能由 table-props 的 token 動畫到位那一幀發出；因此量 `sfx − slam`，
 *  而不是量 `sfx − mark`（起飛計時器在低 fps／rAF 暫停時會和真正落地脫鉤）。
 *  批次同時落地可合成一聲，但每一聲都必須貼在至少一個 slam 上。 */
async function runSlam(browser) {
  const { ctx, page, errs } = await openPage(browser, '');
  try {
    if (!await toMarkPage(page)) throw new Error('沒走到第 1 夜盯上頁（量測前提不成立）');
    await page.evaluate(`(async () => { const t=window.__yaoshi3d.tray; if(t&&t.loaded) await t.loaded(); })()`);
    await page.waitForTimeout(500);
    await page.evaluate(`(() => {
      window.__ev = [];
      document.addEventListener('ys:mark-slam', () => window.__ev.push({ k: 'slam', t: +performance.now().toFixed(1) }));
      const P = window.__yaoshi3d.tray.props;
      const om = P.mark.bind(P);
      P.mark = function () { window.__ev.push({ k: 'mark', t: +performance.now().toFixed(1) }); return om.apply(null, arguments); };
      const op = YS_SFX.play.bind(YS_SFX);
      YS_SFX.play = function (n) { if (n === 'woodslam') window.__ev.push({ k: 'sfx', t: +performance.now().toFixed(1) }); return op.apply(null, arguments); };
      window.__slamMs = window.__yaoshi3d.PROPS.TOKEN.SLAM_MS * 1000;
    })()`);
    // 真人自己宣告一格：pickMark → 一枚令牌 ＋ 一聲；接著 showMarket 補推其餘三枚 ⇒ 再一聲
    await page.evaluate(`(() => { pickMark(2); })()`);
    await page.waitForTimeout(1400);
    const ev = await page.evaluate(`(() => ({ ev: window.__ev, slamMs: window.__slamMs }))()`);
    const marks = ev.ev.filter((e) => e.k === 'mark');
    const slams = ev.ev.filter((e) => e.k === 'slam');
    const sfxs = ev.ev.filter((e) => e.k === 'sfx');
    const first = slams.length ? slams[0].t : null;
    const lags = sfxs.map((s) => {
      // 每一聲對「離它最近、且在它之前」的真正落地時刻。
      const before = slams.filter((m) => m.t <= s.t);
      return before.length ? +(s.t - before[before.length - 1].t).toFixed(1) : null;
    });
    return { slamMs: ev.slamMs, marks: marks.length, slams: slams.length, plays: sfxs.length, lags, firstSlamAt: first, ev: ev.ev, errors: errs };
  } finally { await ctx.close(); }
}

async function main() {
  const srv = await serve(SRC_ROOT, PORT);
  const rec = { viewport: `${W}x${H} dpr2`, portrait: PORTRAIT, seed: SEED, shots: [] };
  try {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
    if (opt.slam) {
      rec.slam = await runSlam(browser);
      await browser.close();
      console.log(JSON.stringify(rec, null, 1));
      const s = rec.slam;
      const ok = s.errors.length === 0 && s.slams > 0 && s.plays > 0
        && s.lags.every((l) => l !== null && Math.abs(l) <= 80)
        && s.plays <= 2; // 真人那一枚一聲 ＋ 批次補推一聲
      process.exit(ok ? 0 : 1);
    }
    if (opt.chipaudit) {
      rec.chipAudit = await runChipAudit(browser, Number(opt.chipaudit) || 4);
      await browser.close();
      console.log(JSON.stringify(rec, null, 1));
      const bad = rec.chipAudit.rows.filter((r) => r.dropped > 0 || r.chips !== r.want || r.mismatch.length);
      process.exit(bad.length === 0 && rec.chipAudit.errors.length === 0 ? 0 : 1);
    }
    if (opt.mem) {
      rec.mem = await runMem(browser);
      await browser.close();
      console.log(JSON.stringify(rec, null, 1));
      process.exit((rec.mem.errors || []).length === 0 ? 0 : 1);
    }

    /* `--roles=a,b,c,d`：把四席換成指定的角色（十件信物一輪只看得到四件，要看完十件得換兩輪）。
       走的是產品自己的 `props.setSeats`，不是另外 new 一份幾何。 */
    if (opt.roles) {
      const k = await openPage(browser, '');
      if (!await toMarkPage(k.page)) throw new Error('沒走到第 1 夜盯上頁');
      await k.page.waitForTimeout(700);
      await k.page.evaluate((rs) => {
        window.__yaoshi3d.tray.props.setSeats(rs.map((r, i) => ({ id: i, role: r })));
      }, String(opt.roles).split(','));
      await k.page.evaluate(() => {
        const s = document.createElement('style'); s.id = '__hideui';
        // 直式的 #rotateHint 是滿版不透明蓋板，也一起藏（它就在 body 底下，同一條規則涵蓋）
        s.textContent = 'body > *:not(canvas):not(#vignette){visibility:hidden !important}';
        document.head.appendChild(s);
      });
      await k.page.waitForTimeout(500);
      await k.page.screenshot({ path: OUT + '-roles.png' });
      const st = await k.page.evaluate(`(() => window.__yaoshi3d.tray.props.stats())()`);
      await k.ctx.close(); await browser.close();
      console.log(JSON.stringify({ mode: 'roles', shot: OUT + '-roles.png', stats: st, errors: k.errs }, null, 1));
      process.exit(k.errs.length === 0 ? 0 : 1);
    }

    /* `--curse`：一路走到「今夜有詛咒品」的那一夜，對**那一格**拍令牌，拍一張
       「詛咒品托盤前的血玉令牌」（凍結檔 U5 指名的四張之一）。找不到就明白報錯，不靜默交別的圖。 */
    if (opt.curse) {
      const k = await openPage(browser, '');
      let found = null;
      for (let night = 0; night < 12 && !found; night++) {
        for (let i = 0; i < 900; i++) {
          const st = await k.page.evaluate(`(() => { const b=document.getElementById('mainbtn'); const S=window.__yaoshi.S;
            return { t:b?b.textContent:'', d:b?b.disabled:true, r:S?S.round:0,
                     curse:S&&S.market?S.market.findIndex(x=>x.curse):-1 }; })()`);
          if (/不盯任何一件/.test(st.t) && !st.d) { if (st.curse >= 0) { found = { round: st.r, slot: st.curse }; } break; }
          if (!st.d) await k.page.click('#mainbtn').catch(() => {});
          else await k.page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled); if(e)e.click(); })()`);
          await k.page.waitForTimeout(14);
        }
        if (found) break;
        await k.page.evaluate(`(() => pickMark(null))()`); // 這一夜沒有詛咒品，走完它換下一夜
        for (let i = 0; i < 900; i++) {
          const st = await k.page.evaluate(`(() => { const b=document.getElementById('mainbtn');
            return { t:b?b.textContent:'', d:b?b.disabled:true }; })()`);
          if (/不盯任何一件/.test(st.t) && !st.d) break;
          if (!st.d) await k.page.click('#mainbtn').catch(() => {});
          else await k.page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled); if(e)e.click(); })()`);
          await k.page.waitForTimeout(14);
        }
      }
      if (!found) throw new Error('12 夜之內沒遇到詛咒品（seed ' + SEED + '）——換一顆種子再跑，不得交別的圖頂替');
      await k.page.evaluate(`(async () => { const t=window.__yaoshi3d.tray; if(t&&t.loaded) await t.loaded(); })()`);
      await k.page.waitForTimeout(600);
      await k.page.evaluate(`(() => { pickMark(${found.slot}); })()`);
      await k.page.waitForTimeout(900);
      await k.page.screenshot({ path: OUT + '-curse.png' });
      await k.page.evaluate(() => {
        const s = document.createElement('style'); s.id = '__hideui';
        s.textContent = 'body > *:not(canvas):not(#vignette){visibility:hidden !important}';
        document.head.appendChild(s);
      });
      await k.page.waitForTimeout(400);
      await k.page.screenshot({ path: OUT + '-curse3d.png' });
      const st = await k.page.evaluate(`(() => ({ props: window.__yaoshi3d.tray.props.stats(),
        items: window.__yaoshi3d.tray.items(), market: window.__yaoshi.S.market.map(x=>x.n+(x.curse?'（詛咒）':'')) }))()`);
      await k.ctx.close(); await browser.close();
      console.log(JSON.stringify({ mode: 'curse', found, shots: [OUT + '-curse.png', OUT + '-curse3d.png'], st, errors: k.errs }, null, 1));
      process.exit(k.errs.length === 0 ? 0 : 1);
    }

    const { ctx, page, errs } = await openPage(browser, '');
    if (!await toMarkPage(page)) throw new Error('沒走到第 1 夜盯上頁（量測前提不成立，不得靜默放行）');
    await page.evaluate(`(async () => { const t=window.__yaoshi3d.tray; if(t&&t.loaded) await t.loaded(); })()`);
    await page.waitForTimeout(900);
    rec.mode = await page.evaluate(`(() => window.__yaoshi3d.tray.mode())()`);
    rec.slotXs = await page.evaluate(`(() => window.__yaoshi3d.tray.slotXs())()`);
    rec.marketNames = await page.evaluate(`(() => window.__yaoshi.S.market.map(x=>x.n+(x.curse?'（詛咒）':'')))()`);
    rec.seats = await page.evaluate(`(() => window.__yaoshi.S.players.map(p=>({id:p.id,role:p.roleId,name:p.name})))()`);
    /* 新聲部 `woodslam` 真的出得了聲嗎：離線渲染一次量峰值與 RMS（`YS_SFX.render` 是這支合成器
       本來就有的測試出口）。**不是問「有沒有註冊這個名字」**——註冊了但寫壞、渲染出一片靜音也會過。
       同時拿 `stamp`（既有的蓋章聲）當對照，兩者都要非零。 */
    rec.sfx = await page.evaluate(`(async () => {
      const one = async (n) => { try {
        const buf = await YS_SFX.render(n, { sec: 1 });
        const d = buf.getChannelData(0);
        let peak = 0, sum = 0;
        for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += d[i] * d[i]; }
        return { name: n, peak: +peak.toFixed(4), rms: +Math.sqrt(sum / d.length).toFixed(5) };
      } catch (e) { return { name: n, err: String(e) }; } };
      return { names: YS_SFX.names.slice(), woodslam: await one('woodslam'), stamp: await one('stamp') };
    })()`);

    // ① 盯上：走產品自己的 pickMark（真的宣告，marks 會被寫進 S——這是產品路徑，不是替身）
    if (GIFDIR) fsSync.mkdirSync(GIFDIR, { recursive: true });
    await page.evaluate(`(() => { pickMark(2); })()`);
    if (GIFDIR) for (let k = 0; k < 10; k++) { await page.waitForTimeout(45); await page.screenshot({ path: path.join(GIFDIR, `mark-${String(k).padStart(2, '0')}.png`) }); }
    await page.waitForTimeout(700);
    rec.afterMark = await page.evaluate(`(() => window.__yaoshi3d.tray.props.stats())()`);
    await page.screenshot({ path: OUT + '-mark.png' }); rec.shots.push(OUT + '-mark.png');

    /* ② 出價：開兩件的出價視窗封上金額（走產品自己的 openSheet／bump／closeSheet）。
       ★GIF 拍在這裡★——單人局按下「蓋牌開標」會同步進開標、玻璃面板當場蓋回桌心，
       交卷那一刻的畫面拍不到銅錢（r1 的教訓）。封籤的當下才是玩家真的看得到的那一格。 */
    await page.evaluate(`(() => { openSheet(0); for(let i=0;i<3;i++) bump(1); })()`);
    await page.waitForTimeout(80);
    await page.evaluate(`(() => { closeSheet(); })()`);
    if (GIFDIR) for (let k = 0; k < 10; k++) { await page.waitForTimeout(45); await page.screenshot({ path: path.join(GIFDIR, `bid-${String(k).padStart(2, '0')}.png`) }); }
    await page.waitForTimeout(400);
    await page.evaluate(`(() => { openSheet(3); for(let i=0;i<9;i++) bump(1); closeSheet(); })()`); // 9 枚 > 上限 8 ⇒ 走「一串」
    await page.waitForTimeout(700);
    rec.myBids = await page.evaluate(`(() => (window.myBids||[]).map(b=>b.amt))()`);
    rec.afterBid = await page.evaluate(`(() => window.__yaoshi3d.tray.props.stats())()`);
    await page.screenshot({ path: OUT + '-bid.png' }); rec.shots.push(OUT + '-bid.png');
    /* 純 3D 的那一張（同 scene-shot --gate 的做法）：把 DOM 面板整層藏起來只留 canvas。
       條文量的是含 UI 的整張，但道具只有幾十像素大，不把卡片收掉根本看不出它長什麼樣。 */
    await page.evaluate(() => {
      const s = document.createElement('style'); s.id = '__hideui';
      s.textContent = 'body > *:not(canvas):not(#vignette){visibility:hidden !important}';
      document.head.appendChild(s);
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + '-bid3d.png' }); rec.shots.push(OUT + '-bid3d.png');
    await page.evaluate(() => { const s = document.getElementById('__hideui'); if (s) s.remove(); });
    await page.waitForTimeout(200);

    // ③ 每一件道具的 NDC 包圍盒（看得到嗎、在不在掏空窗裡）
    const names = ['prop-chips', 'prop-tokens', ...(rec.afterBid.relics || []).map((r) => 'relic-' + r.role)];
    rec.boxes = [];
    for (const n of names) rec.boxes.push(await page.evaluate(`(${NDCBOX})(${JSON.stringify(n)})`));

    // ④ 命中測試排除（U2）：兩條都驗——raycaster 目標清單，與對每件道具中心實際叫一次 hitTest
    rec.hit = await page.evaluate(`(() => {
      const Y3=window.__yaoshi3d, tray=Y3.tray;
      const props=tray.props.group;
      /* (a) 產品的 hitTest 只打 proxies；把道具層的物件名單與 raycaster 打得到的名單對一次 */
      const propNames=[]; props.traverse(o=>{ if(o.isMesh) propNames.push(o.name); });
      /* (b) 對每一件道具的世界中心投影成 NDC，叫產品自己的 hitTest —— 回 −1 才算沒攔截 */
      /* (b) ★逐 instance★（r1 修補後加嚴）：舊版只投影 InstancedMesh 的**第 0 枚**，
         32 枚錢／4 枚令牌裡只要有一枚落在命中盒的射線上就漏掉了（本輪就是這樣漏掉令牌的）。
         現在對**每一枚**取世界中心 → NDC → 叫產品自己的 hitTest，回報最壞的那一枚。 */
      const cam=Y3.camera, V3=cam.position.constructor, v=new V3();
      const M4=cam.matrixWorld.constructor;
      const probes=[];
      props.children.forEach(o=>{
        if(!o.isMesh) return;
        const n=o.isInstancedMesh?o.count:1;
        if(n<=0) return;
        let worst=null, bad=0;
        for(let i=0;i<n;i++){
          if(o.isInstancedMesh){ const M=new M4(); o.getMatrixAt(i,M); v.setFromMatrixPosition(M); o.localToWorld(v); }
          else o.getWorldPosition(v);
          v.project(cam);
          const h=tray.hitTest(v.x, v.y);
          if(h>=0) bad++;
          if(!worst||h>worst.hit) worst={ u:+v.x.toFixed(3), w:+v.y.toFixed(3), hit:h };
        }
        probes.push({ name:o.name, n, badInstances:bad, u:worst.u, w:worst.w, hit:worst.hit });
      });
      return { propNames, probes };
    })()`);

    // ⑤ 開標：得標者的錢留在桌上、其餘收回（走產品自己的 ys:reveal 派發點）
    await page.evaluate(`(() => { submitHumanBids(); })()`);
    await page.waitForTimeout(500);
    for (let i = 0; i < 40; i++) {
      const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn');
        return { t:b?b.textContent:'', d:b?b.disabled:true }; })()`);
      if (/下一件拍品/.test(st.t) && !st.d) break;
      if (!st.d && PORTRAIT) await page.evaluate(`(()=>{const b=document.getElementById('mainbtn'); if(b) b.click();})()`);
      else if (!st.d) await page.click('#mainbtn').catch(() => {});
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(600);
    rec.afterReveal = await page.evaluate(`(() => window.__yaoshi3d.tray.props.stats())()`);
    await page.screenshot({ path: OUT + '-reveal.png' }); rec.shots.push(OUT + '-reveal.png');
    rec.errors = errs;
    await ctx.close();

    // ⑥ 兩個 kill switch 都要沿真實盯上／封籤流程保持沒有第二段道具。
    const propsAreClear = (stats) => stats && stats.chips === 0 && stats.tokens === 0 && (!stats.relics || stats.relics.length === 0);
    {
      const k = await openPage(browser, '?tray3d=0');
      await toMarkPage(k.page);
      await k.page.waitForTimeout(600);
      await k.page.evaluate(`(() => { pickMark(2); })()`).catch(() => {});
      await k.page.waitForTimeout(400);
      rec.killSwitch = await k.page.evaluate(`(() => window.__yaoshi3d.tray.props.stats())()`);
      rec.killErrors = k.errs;
      await k.ctx.close();
    }
    {
      const k = await openPage(browser, '?table3d=0');
      await toMarkPage(k.page);
      await k.page.waitForTimeout(600);
      await k.page.evaluate(`(() => {
        pickMark(2);
        sheetIdx=0;
        myBids[0]={amt:3,type:"cons",intent:"keep",target:null};
        closeSheet();
        submitHumanBids();
      })()`).catch(() => {});
      await k.page.waitForTimeout(700);
      rec.tableKillSwitch = await k.page.evaluate(`(() => window.__yaoshi3d.tray.props.stats())()`);
      rec.tableKillErrors = k.errs;
      await k.ctx.close();
    }
    await browser.close();
    console.log(JSON.stringify(rec, null, 1));
    const errors = [...(rec.errors || []), ...(rec.killErrors || []), ...(rec.tableKillErrors || [])];
    if (!propsAreClear(rec.killSwitch)) errors.push('tray3d=0 仍留下第二段道具');
    if (!propsAreClear(rec.tableKillSwitch)) errors.push('table3d=0 仍留下第二段道具');
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exit(1);
    }
    process.exit(0);
  } finally { srv.kill(); }
}
main().catch((e) => { console.error(e); process.exit(2); });

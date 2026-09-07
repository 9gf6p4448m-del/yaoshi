/* 美術方向研究用：拍「牌桌／市集」與「開標揭曉」兩個常駐場景的現況截圖（threejs-visual-loop 第二節的截圖腳本）。
   跑法：node tests/tools/scene-shot.mjs <png 前綴> [--port=8895] [--root=<靜態根目錄>] [--w=844] [--h=390]
   做的事：自起 http.server，進單人局選角色，在牌桌待機 2.5s 拍一張（table），按主鈕到第一次開標畫面再拍一張（reveal），
   另拍 390×844 直式一張（portrait，產品在直式會蓋「請轉橫」，這張就是玩家看到的樣子）。0 console error 才算成功。

   `--gate`（美術甲卷，2026-09-07）：多做四件事，給凍結檔 A1–A5／A7 當機械證據——
     ① 把 intro 三頁點掉，`-table.png` 拍的是「市集畫面」而不是歡迎頁（A3 明寫 intro 關掉後）
     ② 在牌桌機位強制 render 一次再讀 `renderer.info`（A7 的 draw call 要量在牌桌，不是量到 bloom 合成那一趟的 1）
     ③ 掃 `name` 以 `far-` 開頭的物件：可見性、在不在牌桌視錐內、螢幕空間 2D 包圍盒（A4）
     ④ 對決機位下算「人形 2D 包圍盒」與「每個 far-* 的 2D 包圍盒」有無重疊（A4 的不得擋人）
   螢幕亮度類的量測（A3 上下 ΔE、A5 四角／中央）不在這裡做，PNG 交給 tests/tools/art-a-metrics.py。 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const argv = process.argv.slice(2);
const opt = {}; const pos = [];
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
const OUT = pos[0] || path.join(ROOT, 'scene');
const PORT = Number(opt.port || 8895);
const SRC_ROOT = opt.root ? path.resolve(opt.root) : ROOT;
const W = Number(opt.w || 844), H = Number(opt.h || 390);
const GATE = !!opt.gate;

function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  return new Promise((r) => setTimeout(() => r(srv), 900));
}

/* 頁內量測：不 import three（頁面沒有全域 THREE），Vector3 從 camera.position 的建構子借，
   包圍盒自己用 min/max 純數字算——只讀不寫，量完不留任何東西在場景裡。 */
const PROBE = `(() => {
  const Y3 = window.__yaoshi3d; if (!Y3) return null;
  const r = Y3.renderer, cam = Y3.camera, scene = Y3.scene;
  const V3 = cam.position.constructor;
  const tmp = new V3();
  // 某個 Object3D 在螢幕空間（NDC，x/y ∈ [-1,1]）的 2D 包圍盒；沒有幾何或整個在鏡頭後面回 null
  function ndcBox(root) {
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9, any = false, behind = 0, total = 0;
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      if (!o.isMesh || !o.visible || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox; if (!b) return;
      for (let i = 0; i < 8; i++) {
        tmp.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
        tmp.applyMatrix4(o.matrixWorld);
        const wz = tmp.z; // 先記世界座標，project 之後就沒了
        tmp.project(cam);
        total++;
        // project 後 z>1 代表在 far 之外、z<-1 在鏡頭後面：後者的 x/y 是翻轉的，不能拿來當包圍盒
        if (tmp.z < -1 || tmp.z > 1) { behind++; continue; }
        any = true;
        if (tmp.x < minx) minx = tmp.x; if (tmp.x > maxx) maxx = tmp.x;
        if (tmp.y < miny) miny = tmp.y; if (tmp.y > maxy) maxy = tmp.y;
        void wz;
      }
    });
    if (!any) return null;
    return { minx: +minx.toFixed(4), miny: +miny.toFixed(4), maxx: +maxx.toFixed(4), maxy: +maxy.toFixed(4), clipped: behind, total };
  }
  const onScreen = (b) => !!b && b.maxx > -1 && b.minx < 1 && b.maxy > -1 && b.miny < 1;
  const overlap = (a, b) => !!a && !!b && a.minx < b.maxx && b.minx < a.maxx && a.miny < b.maxy && b.miny < a.maxy;
  const fars = [];
  scene.traverse((o) => { if (o.name && o.name.indexOf('far-') === 0) fars.push(o); });
  return { V3, cam, scene, r, ndcBox, onScreen, overlap, fars };
})()`;

async function probeFar(page, kind) {
  return page.evaluate(`((P) => {
    if (!P) return null;
    const out = { kind: ${JSON.stringify(kind)}, fars: [] };
    for (const o of P.fars) {
      const b = P.ndcBox(o);
      out.fars.push({ name: o.name, visible: o.visible, box: b, onScreen: P.onScreen(b) });
    }
    return out;
  })(${PROBE})`);
}

async function main() {
  const srv = await serve(SRC_ROOT, PORT);
  const errs = []; const shots = []; const gate = {};
  try {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html?paperwar=1`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: OUT + '-title.png' }); shots.push(OUT + '-title.png');
    await page.click('button:has-text("單人入市")');
    await page.waitForSelector('#selectScr.on');
    await page.screenshot({ path: OUT + '-select.png' }); shots.push(OUT + '-select.png');
    await page.click('#selGrid .rcard');
    await page.click('#selBtn:not([disabled])');
    await page.waitForTimeout(2500);
    if (GATE) {
      // intro 三頁點掉：__introNext 是 index.html 的 intro 專用鉤子，intro 收掉後它會被設回 null
      for (let i = 0; i < 8; i++) {
        const on = await page.evaluate(() => !!window.__introNext);
        if (!on) break;
        await page.click('#stage .bigbtn').catch(() => {});
        await page.waitForTimeout(450);
      }
      await page.waitForTimeout(1600); // 等鏡頭補間與燈籠閃爍穩定
    }
    await page.screenshot({ path: OUT + '-table.png' }); shots.push(OUT + '-table.png');
    if (GATE) {
      gate.table = await page.evaluate(() => {
        const Y3 = window.__yaoshi3d; const r = Y3.renderer;
        r.render(Y3.scene, Y3.camera); // 強制一趟直接 render：info 只留最後一次 render 的數字
        const all = { calls: r.info.render.calls, tris: r.info.render.triangles };
        // A7 歸因：把本卷新加的兩樣（穹頂／遠景剪影）暫時關掉再量一次，差值就是它們的成本。
        let base = null;
        if (Y3.sky || Y3.far) {
          const s0 = Y3.sky && Y3.sky.visible, f0 = Y3.far && Y3.far.visible;
          if (Y3.sky) Y3.sky.visible = false;
          if (Y3.far) Y3.far.visible = false;
          r.render(Y3.scene, Y3.camera);
          base = { calls: r.info.render.calls, tris: r.info.render.triangles };
          if (Y3.sky) Y3.sky.visible = s0;
          if (Y3.far) Y3.far.visible = f0;
          r.render(Y3.scene, Y3.camera);
        }
        return { calls: all.calls, tris: all.tris, callsWithoutNew: base && base.calls, trisWithoutNew: base && base.tris,
          camera: { x: +Y3.camera.position.x.toFixed(3), y: +Y3.camera.position.y.toFixed(3), z: +Y3.camera.position.z.toFixed(3) },
          fogDensity: Y3.scene.fog ? +Y3.scene.fog.density.toFixed(4) : null };
      });
      gate.farTable = await probeFar(page, 'table');
      // 補充量測（比 A3／A5 條文更嚴，只是加測不取代）：把 DOM 面板整層藏起來，只留 canvas 與 #vignette，
      // 拍一張「純 3D」的牌桌。條文量的是含 UI 的整張截圖，那張的上下差主要來自面板本身；
      // 這一張才看得出背景漸層與暈角本身有沒有做到。兩張都進報告。
      await page.evaluate(() => {
        const s = document.createElement('style'); s.id = '__hideui';
        s.textContent = 'body > *:not(canvas):not(#vignette){visibility:hidden !important}';
        document.head.appendChild(s);
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: OUT + '-table3d.png' }); shots.push(OUT + '-table3d.png');
      await page.evaluate(() => { const s = document.getElementById('__hideui'); if (s) s.remove(); });
      await page.waitForTimeout(300);
    }
    // 走到第一次開標揭曉：點主鈕直到 #duel 或揭曉層出現，最多 20 次
    for (let i = 0; i < 20; i++) {
      const st = await page.evaluate(() => {
        const mb = document.getElementById('mainbtn'); const ho = document.getElementById('hoBtn');
        const vis = (el) => !!el && el.offsetParent !== null && !el.disabled;
        const sb = [...document.querySelectorAll('#stage .bigbtn')].find(vis);
        const duel = document.getElementById('duel'); const duelOn = !!duel && getComputedStyle(duel).display !== 'none' && duel.offsetParent !== null;
        return { mainOk: vis(mb), hoOk: vis(ho), stageOk: !!sb, duelOn, txt: mb ? mb.textContent : '' };
      });
      if (st.duelOn) {
        await page.waitForTimeout(1200);
        await page.screenshot({ path: OUT + '-duel.png' }); shots.push(OUT + '-duel.png');
        if (GATE) {
          gate.farDuel = await probeFar(page, 'duel');
          gate.duel = await page.evaluate(`((P) => {
            if (!P) return null;
            const D = P.scene && window.__yaoshi3d.duelFigures;
            const figs = [];
            for (const side of ['A', 'B']) {
              const list = (D && D.figuresOf) ? D.figuresOf(side) : [];
              for (const f of list) {
                const node = f && (f.group || f.root || f.obj || f.object3d || (f.isObject3D ? f : null));
                if (!node) continue;
                const b = P.ndcBox(node);
                if (b) figs.push({ side, box: b });
              }
            }
            const hull = figs.length ? figs.reduce((a, f) => ({
              minx: Math.min(a.minx, f.box.minx), miny: Math.min(a.miny, f.box.miny),
              maxx: Math.max(a.maxx, f.box.maxx), maxy: Math.max(a.maxy, f.box.maxy) }), { minx: 1e9, miny: 1e9, maxx: -1e9, maxy: -1e9 }) : null;
            const hits = [];
            for (const o of P.fars) {
              const fb = P.ndcBox(o);
              for (const f of figs) if (P.overlap(fb, f.box)) hits.push({ far: o.name, side: f.side });
            }
            return { figures: figs.length, hull, overlaps: hits, figKeys: (D && D.figuresOf && D.figuresOf('A')[0]) ? Object.keys(D.figuresOf('A')[0]).slice(0, 12) : [] };
          })(${PROBE})`);
        }
        break;
      }
      if (st.stageOk) await page.click('#stage .bigbtn:not([disabled])').catch(() => {});
      else if (st.hoOk) await page.click('#hoBtn').catch(() => {});
      else if (st.mainOk) await page.click('#mainbtn').catch(() => {});
      await page.waitForTimeout(900);
      if (i === 2) { await page.screenshot({ path: OUT + '-mid.png' }); shots.push(OUT + '-mid.png'); }
    }
    const info = await page.evaluate(() => {
      const Y3 = window.__yaoshi3d; if (!Y3) return null;
      const r = Y3.renderer; const cam = Y3.camera;
      return { fov: cam && cam.fov, toneMapping: r && r.toneMapping, exposure: r && r.toneMappingExposure, colorSpace: r && r.outputColorSpace,
        shadow: r && r.shadowMap && r.shadowMap.enabled, pixelRatio: r && r.getPixelRatio(), calls: r && r.info.render.calls, tris: r && r.info.render.triangles,
        fog: Y3.scene.fog ? (Y3.scene.fog.isFogExp2 ? 'FogExp2' : 'Fog') : null, bg: Y3.scene.background ? (Y3.scene.background.isColor ? '#' + Y3.scene.background.getHexString() : Y3.scene.background.type) : null,
        env: !!Y3.scene.environment,
        lights: (() => { const L = []; Y3.scene.traverse((o) => { if (o.isLight) L.push({ t: o.type, i: +o.intensity.toFixed(2), c: '#' + (o.color ? o.color.getHexString() : ''), sky: o.groundColor ? '#' + o.groundColor.getHexString() : undefined, shadow: !!o.castShadow }); }); return L; })() };
    });
    await browser.close();
    console.log(JSON.stringify({ shots, info, gate: GATE ? gate : undefined, errors: errs }, null, 1));
    process.exit(errs.length === 0 ? 0 : 1);
  } finally { srv.kill(); }
}
main();

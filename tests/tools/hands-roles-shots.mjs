/* 階段三 角色變體截圖：node tests/tools/hands-roles-shots.mjs --out=<資料夾> [--vp=1280x720] [--layout=L|P] [--roles=shoujing,dangpu,hunter,default]
   手的大小＝遊戲實際（不放大）；每張只讓一席動作。檔名 <prefix>-<seat>-<action>-<role>.jpg，盲讀檔另行改名。
   第二輪（acceptance-roles-r2.md R1b／R3／R5）：--measure＝每張另做「遮罩渲染」（只留手、各頂點色直出、無燈無霧）→ 程式取樣
     該角色腕部色塊（ROLE_HAND.ROLES[k].BLOCK）的投影像素、色塊在實拍上的平均色、手像素數、手在畫面內否、動作進行中否、材質 opacity；
     每張寫 <name>.json；--blind=<資料夾>＝只在「預檢全過」時把該張複製成無角色名的盲讀檔（blind-NN.jpg），否則報告原因（要改拍攝時刻）。 */
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodePNG } from './png-lite.mjs';
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const OUT = path.resolve(opt.out || 'shots'); fs.mkdirSync(OUT, { recursive: true });
const [W, H] = String(opt.vp || '1280x720').split('x').map(Number), lay = opt.layout || 'L', PORT = Number(opt.port || 8978);
const ROLES = String(opt.roles || 'shoujing,dangpu,hunter,qingmian').split(',');
const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: HERE, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let browser;
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (/DBG/.test(m.text())) console.log(m.text()); if (m.type() === 'error' && !/DBG/.test(m.text())) errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break;
    if (!st.d) await page.evaluate(() => document.getElementById('mainbtn').click()); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(20);
  }
  if (lay === 'P') await page.addStyleTag({ content: '#rotateHint{display:none !important}' });
  if (opt.close || opt.nohud) await page.addStyleTag({ content: 'body > *:not(canvas):not(#vignette){visibility:hidden !important}' }); // 第三輪 --nohud：盲讀圖一律不帶 HUD（HUD 有角色名；r2 起量測後的圖本來就沒有 HUD，這裡讓第一張也一致）
  await page.evaluate(async () => { const t = window.__yaoshi3d.tray; await t.loaded(); await t.hands.ready(); t.props.clearRound(); t.hands.clear(); });
  const shoot = async (name, seats, fire, waitMs) => {
    await page.evaluate(async ({ seats, fire, waitMs }) => {
      const T = window.__yaoshi3d.tray, hp = (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d }));
      if (window.__raf0) { window.requestAnimationFrame = window.__raf0; const c = window.__held; window.__held = null; if (c) window.requestAnimationFrame(c); }
      if (window.__propsUpd0) { T.props.update = window.__propsUpd0; window.__propsUpd0 = null; }
      T.hands.setFrozen(false); T.hands.finish(); T.props.clearRound(); T.hands.clear();
      T.props.setSeats(seats); T.hands.setSeats(seats);
      for (const [n, d] of fire.prep || []) hp(n, d);
      if ((fire.prep || []).length) await new Promise((r) => setTimeout(r, 1300));
      for (const [n, d] of fire.go) hp(n, d);
      await new Promise((r) => setTimeout(r, waitMs)); T.hands.setFrozen(true);
      /* 第三輪：推錢的拍攝要連錢一起停（凍結手但錢繼續飛，錢一落地手就判「推完」轉收手，拍到的是收手起點、預檢不過）。治具專用，下一張開拍前還原。 */
      if (fire.freezeProps) { window.__propsUpd0 = T.props.update; T.props.update = () => {}; }
      await new Promise((r) => { let k = 0; const f = () => (++k >= 3 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    }, { seats, fire, waitMs });
    if (opt.close) await page.evaluate(async ({ seat, d }) => {
      /* 設計對照用特寫（不是遊戲視角）：停掉遊戲的 rAF 迴圈、手動把相機貼近該席的手、渲染一次。 */
      const Y = window.__yaoshi3d, h = Y.tray.hands.group.children[seat], p = h.position.clone(); let n = 0; p.set(0, 0, 0); const q = p.clone(); h.updateMatrixWorld(true); h.traverse((o) => { if (o.isBone) { o.getWorldPosition(q); p.add(q); n++; } }); p.multiplyScalar(1 / n); const w = true;
      window.__raf0 = window.__raf0 || window.requestAnimationFrame; window.requestAnimationFrame = (cb) => { window.__held = cb; return 0; };
      await new Promise((r) => window.__raf0(() => window.__raf0(r))); // 已排隊的那一幀先跑完，之後遊戲迴圈不再動相機
      Y.camera.position.set(p.x + d[0], p.y + d[1], p.z + d[2]); Y.camera.lookAt(p.x, p.y, p.z); Y.camera.updateMatrixWorld(true);
      Y.renderer.render(Y.scene, Y.camera);
    }, { seat: 0, d: String(opt.close).split(',').length === 3 ? String(opt.close).split(',').map(Number) : [0, 0.30, 0.22] });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 90 });
  };
  /* 色塊取樣：role 的 BLOCK 顏色（線性）→ sRGB 後在遮罩圖上找像素；平均色取自同位置的實拍（lit）圖。 */
  const srgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255;
  const measure = async (name, role, seat, act) => {
    const modPath = path.join(HERE, 'js/hand-motion.js');
    const { ROLE_HAND } = await import(pathToFileURL(modPath).href);
    const block = opt.blockjson ? JSON.parse(opt.blockjson) : (ROLE_HAND.ROLES[role]?.BLOCK || []);
    const info = await page.evaluate(() => {
      const Y = window.__yaoshi3d, T = Y.tray, g = T.hands.group, st = T.hands.stats();
      const mat = (() => { let m = null; g.traverse((o) => { if (o.isSkinnedMesh && !m) m = o.material; }); return m; })();
      return { act: st.state, visible: st.visible, opacity: mat ? mat.opacity : null, transparent: mat ? mat.transparent : null };
    });
    const lit = await page.screenshot({ type: 'png' });
    await page.addStyleTag({ content: 'body > *:not(canvas):not(#vignette){visibility:hidden !important}' });
    await page.evaluate(async (seat) => {
      const Y = window.__yaoshi3d, g = Y.tray.hands.group;
      window.__raf0 = window.__raf0 || window.requestAnimationFrame; window.requestAnimationFrame = (cb) => { window.__held = cb; return 0; };
      await new Promise((r) => window.__raf0(() => window.__raf0(r)));
      const hide = [], inHands = (o) => { for (let p = o; p; p = p.parent) if (p === g.children[seat]) return true; return false; };
      Y.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && !inHands(o) && o.visible) { hide.push(o); o.visible = false; } });
      const bg = Y.scene.background, fog = Y.scene.fog; Y.scene.background = null; Y.scene.fog = null;
      const THREE = await import('three');
      const mb = new THREE.MeshBasicMaterial({ vertexColors: true }); mb.toneMapped = false;
      const keep = Y.scene.overrideMaterial; Y.scene.overrideMaterial = mb;
      Y.renderer.setClearColor(0x000000, 1); Y.renderer.render(Y.scene, Y.camera);
      window.__maskUndo = () => { for (const o of hide) o.visible = true; Y.scene.background = bg; Y.scene.fog = fog; Y.scene.overrideMaterial = keep; };
    }, seat);
    await page.waitForTimeout(120);
    const mask = await page.screenshot({ type: 'png' });
    /* 色塊遮罩：只留「頂點色＝色塊色」的頂點（其餘塗黑）再渲一張；色塊投影像素＝這張的非黑像素（不靠顏色比對，避免和其他部位撞色）。 */
    await page.evaluate(([seat, blk]) => {
      const Y = window.__yaoshi3d; let m = null; Y.tray.hands.group.children[seat].traverse((o) => { if (o.isSkinnedMesh && !m) m = o; });
      const ca = m.geometry.attributes.color, cs = ca.itemSize, keep = ca.array.slice();
      for (let v = 0; v < ca.count; v++) {
        const ok = blk.some((c) => Math.abs(keep[v * cs] - c[0]) < 1e-3 && Math.abs(keep[v * cs + 1] - c[1]) < 1e-3 && Math.abs(keep[v * cs + 2] - c[2]) < 1e-3) && (cs < 4 || keep[v * cs + 3] > 0.5);
        if (!ok) { ca.array[v * cs] = 0; ca.array[v * cs + 1] = 0; ca.array[v * cs + 2] = 0; }
      }
      ca.needsUpdate = true; Y.renderer.render(Y.scene, Y.camera);
      window.__colUndo = () => { ca.array.set(keep); ca.needsUpdate = true; };
    }, [seat, block]);
    await page.waitForTimeout(120);
    const mask2 = await page.screenshot({ type: 'png' });
    await page.evaluate(() => { window.__colUndo && window.__colUndo(); window.__maskUndo && window.__maskUndo(); });
    const a = decodePNG(lit), b = decodePNG(mask), b2 = decodePNG(mask2);
    let handPx = 0, blockPx = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, sx = 0, sy = 0; const sum = [0, 0, 0], per = block.map(() => ({ px: 0, s: [0, 0, 0] }));
    const want = block.map((c) => c.map(srgb));
    for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) {
      const i = (y * b.width + x) * 4, r = b.data[i], g = b.data[i + 1], bl = b.data[i + 2];
      if (r + g + bl < 6) continue;
      handPx++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; sx += x; sy += y;
      const r2 = b2.data[i], g2 = b2.data[i + 1], b3 = b2.data[i + 2];
      if (r2 + g2 + b3 < 6) continue;
      blockPx++; sum[0] += a.data[i]; sum[1] += a.data[i + 1]; sum[2] += a.data[i + 2];
      for (let k = 0; k < want.length; k++) if (Math.abs(r2 - want[k][0]) <= 5 && Math.abs(g2 - want[k][1]) <= 5 && Math.abs(b3 - want[k][2]) <= 5) {
        per[k].px++; per[k].s[0] += a.data[i]; per[k].s[1] += a.data[i + 1]; per[k].s[2] += a.data[i + 2]; break;
      }
    }
    const out = { name, role, seat, act, state: info.act && info.act[seat], visible: info.visible.includes(seat), opacity: info.opacity, transparent: info.transparent,
      handPx, blockPx, blockByColour: per.map((p) => p.px), meanByColour: per.map((p) => p.px ? p.s.map((v) => +(v / p.px).toFixed(1)) : null), meanRgb: blockPx ? sum.map((v) => +(v / blockPx).toFixed(1)) : null,
      bbox: [x0, y0, x1, y1], centroid: handPx ? [Math.round(sx / handPx), Math.round(sy / handPx)] : null, vp: [W, H] };
    fs.writeFileSync(path.join(OUT, name + '.mask.png'), mask); fs.writeFileSync(path.join(OUT, name + '.block.png'), mask2); fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(out, null, 1));
    return out;
  };
  /* R3（acceptance-roles-r2.md）：同一幀、只切 material.transparent 開／關，膚色區（z ≥ CUFF_FROM 的原頂點；原頂點＝前 N0 個）逐點比對。
     袖尾漸隱本來就會因 transparent 不同而不同，所以只比膚色區；差異像素數必須 0。 */
  const N0 = 819, CUFF_FROM = -0.08; // N0＝預設手頂點數（hands-roles-area.mjs 實測 default vertices 819）
  const r3 = async (seat) => {
    await page.addStyleTag({ content: 'body > *:not(canvas):not(#vignette){visibility:hidden !important}' });
    const res = await page.evaluate(async ([seat, N0, CUFF_FROM]) => {
      const Y = window.__yaoshi3d; let m = null; Y.tray.hands.group.children[seat].traverse((o) => { if (o.isSkinnedMesh && !m) m = o; });
      window.__raf0 = window.__raf0 || window.requestAnimationFrame; window.requestAnimationFrame = (cb) => { window.__held = cb; return 0; };
      await new Promise((r) => window.__raf0(() => window.__raf0(r)));
      const pos = m.geometry.attributes.position, ca = m.geometry.attributes.color, cs = ca.itemSize;
      let skinN = 0, skinMinAlpha = 1, tailMinAlpha = 1;
      for (let v = 0; v < N0; v++) { const a = cs >= 4 ? ca.array[v * cs + 3] : 1; if (pos.getZ(v) >= CUFF_FROM) { skinN++; if (a < skinMinAlpha) skinMinAlpha = a; } else if (a < tailMinAlpha) tailMinAlpha = a; }
      return { skinN, skinMinAlpha, tailMinAlpha, opacity: m.material.opacity, transparent: m.material.transparent };
    }, [seat, N0, CUFF_FROM]);
    const shot = async (tr) => {
      await page.evaluate(([seat, N0, CUFF_FROM, tr]) => {
        const Y = window.__yaoshi3d; let m = null; Y.tray.hands.group.children[seat].traverse((o) => { if (o.isSkinnedMesh && !m) m = o; });
        m.material.transparent = tr; m.material.needsUpdate = true; Y.renderer.render(Y.scene, Y.camera);
      }, [seat, N0, CUFF_FROM, tr]);
      await page.waitForTimeout(150);
      return decodePNG(await page.screenshot({ type: 'png' }));
    };
    const on = await shot(true), off = await shot(false);
    /* 膚色區遮罩：只留「原頂點且 z ≥ CUFF_FROM」的頂點（其餘塗黑）、MeshBasic 直出頂點色、無霧無背景、只留這隻手 → 非黑像素＝膚色區。
       袖尾漸隱本來就會因 transparent 開／關而不同，所以逐點比對只算膚色區；差異像素數必須 0。 */
    await page.evaluate(async ([seat, N0, CUFF_FROM]) => {
      const Y = window.__yaoshi3d, g = Y.tray.hands.group; let m = null; g.children[seat].traverse((o) => { if (o.isSkinnedMesh && !m) m = o; });
      m.material.transparent = true; m.material.needsUpdate = true;
      const hide = [], inHands = (o) => { for (let p = o; p; p = p.parent) if (p === g.children[seat]) return true; return false; };
      Y.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && !inHands(o) && o.visible) { hide.push(o); o.visible = false; } });
      const bg = Y.scene.background, fog = Y.scene.fog; Y.scene.background = null; Y.scene.fog = null;
      const THREE = await import('three');
      const mb = new THREE.MeshBasicMaterial({ vertexColors: true }); mb.toneMapped = false;
      const keepOM = Y.scene.overrideMaterial; Y.scene.overrideMaterial = mb;
      const pos = m.geometry.attributes.position, ca = m.geometry.attributes.color, cs = ca.itemSize, keep = ca.array.slice();
      for (let v = 0; v < ca.count; v++) if (!(v < N0 && pos.getZ(v) >= CUFF_FROM)) { ca.array[v * cs] = 0; ca.array[v * cs + 1] = 0; ca.array[v * cs + 2] = 0; }
      ca.needsUpdate = true; Y.renderer.setClearColor(0x000000, 1); Y.renderer.render(Y.scene, Y.camera);
      window.__r3undo = () => { ca.array.set(keep); ca.needsUpdate = true; for (const o of hide) o.visible = true; Y.scene.background = bg; Y.scene.fog = fog; Y.scene.overrideMaterial = keepOM; };
    }, [seat, N0, CUFF_FROM]);
    await page.waitForTimeout(150);
    const skin = decodePNG(await page.screenshot({ type: 'png' }));
    await page.evaluate(() => window.__r3undo && window.__r3undo());
    let skinPx = 0, diffInSkin = 0, diffOutSkin = 0;
    for (let i = 0; i < on.data.length; i += 4) {
      const d = Math.abs(on.data[i] - off.data[i]) + Math.abs(on.data[i + 1] - off.data[i + 1]) + Math.abs(on.data[i + 2] - off.data[i + 2]) > 0;
      if (skin.data[i] + skin.data[i + 1] + skin.data[i + 2] >= 6) { skinPx++; if (d) diffInSkin++; } else if (d) diffOutSkin++;
    }
    return { ...res, skinPx, diffInSkin, diffOutSkin_tailFade: diffOutSkin };
  };
  /* 預檢（R5）：目標手在畫面內、alpha=1（材質 opacity=1）、動作進行中、手在桌面中央區、色塊像素夠多；全過才算可用於盲讀。 */
  const precheck = (m) => {
    const bad = [];
    if (!m.visible) bad.push('目標手不可見');
    if (!m.state || !/^(push|slam|rake|hold)$/.test(m.state.kind)) bad.push('動作空窗／收手中（state=' + JSON.stringify(m.state) + '）'); else if (!(m.state.t > 0.05)) bad.push('動作剛起步 t=' + m.state.t);
    if (m.opacity !== 1) bad.push('材質 opacity=' + m.opacity);
    if (m.handPx < 1200) bad.push('手像素太少 ' + m.handPx);
    if (m.blockPx < 150) bad.push('色塊像素太少 ' + m.blockPx);
    if (m.centroid && !(m.centroid[0] > 160 && m.centroid[0] < 1120 && m.centroid[1] > 200 && m.centroid[1] < 640)) bad.push('手不在桌面中央區 ' + m.centroid);
    if (m.bbox[0] < 0 || m.bbox[2] >= m.vp[0] || m.bbox[1] < 0 || m.bbox[3] >= m.vp[1]) bad.push('手出畫面');
    return bad;
  };
  const seatsFor = (role, seat) => [0, 1, 2, 3].map((id) => ({ id, role: id === seat ? role : ['qingmian', 'hongyi', 'xiaonv', 'zutou'][id] }));
  const jobs = JSON.parse(opt.jobs || '[]'); // [[role, seat, 'push'|'slam', slot]]
  for (const [role, seat, act, slot, blindIdx] of jobs) {
    const seats = seatsFor(role === 'default' ? 'qingmian' : role, seat);
    const fire = act === 'push' ? { go: [['ys:bid', { seat, slot, amount: 8 }]], freezeProps: true } : { go: [['ys:mark', { seat, slot }]] };
    const nm = `${opt.prefix || 'shot'}-${role}-s${seat}-${act}`;
    /* 盲讀圖（R5）：--blind=<dir> 且該 job 帶第 5 欄編號時，預檢（手在畫面內／alpha=1／動作進行中／色塊像素夠）不過就換等待時間重拍，
       全過才存成 <dir>/blind-NN.jpg（檔名與圖上都不含角色名；對照表由人另寫在 answer-key）。最多重拍 8 次，仍不過＝回報失敗、不存圖。 */
    /* --tband=a,b：量測要在同一個動作進度（state.t）才可比（牆鐘等待會讓 t 在 0.2～0.41 間飄，手的朝向不同、色塊像素跟著變）；t 不在區間就重拍，最多 25 次。 */
    const band = opt.tband ? String(opt.tband).split(',').map(Number) : null;
    const waits = band ? Array.from({ length: 25 }, (_, i) => 150 + ((i * 53) % 300)) : blindIdx ? (act === 'push' ? [90, 70, 110, 55, 130, 80, 100, 45] /* 第三輪：推錢只有 PUSH_MS 0.42 秒（含錢飛行），r2 的等待表只適用拍令牌 */ : [300, 260, 340, 220, 380, 180, 420, 140]) : [Number(opt.wait) || (act === 'push' ? 170 : 300)];
    let ok = false;
    for (const w of waits) {
      await shoot(nm, seats, fire, w);
      if (opt.r3) { const r = await r3(seat); console.log('R3 ' + JSON.stringify({ name: nm, role, seat, ...r })); fs.writeFileSync(path.join(OUT, nm + '.r3.json'), JSON.stringify({ name: nm, role, seat, ...r }, null, 1)); }
      if (!(opt.measure || blindIdx || band)) { ok = true; break; }
      const m = await measure(nm, role === 'default' ? 'qingmian' : role, seat, act); m.precheck = precheck(m); m.wait = w;
      console.log(JSON.stringify(m)); fs.writeFileSync(path.join(OUT, nm + '.json'), JSON.stringify(m, null, 1));
      if (band) { if (m.state && m.state.t >= band[0] && m.state.t <= band[1]) { ok = true; break; } else continue; }
      if (!blindIdx) { ok = true; break; }
      if (m.precheck.length === 0) {
        fs.mkdirSync(opt.blind, { recursive: true });
        fs.copyFileSync(path.join(OUT, nm + '.jpg'), path.join(opt.blind, 'blind-' + String(blindIdx).padStart(2, '0') + '.jpg'));
        console.log('BLIND ' + JSON.stringify({ idx: blindIdx, role, seat, act, wait: w, handPx: m.handPx, blockPx: m.blockPx, opacity: m.opacity, state: m.state })); ok = true; break;
      }
    }
    if (!ok) console.log('BLIND-FAIL ' + JSON.stringify({ idx: blindIdx, role, seat, act }));
  }
  console.log(JSON.stringify({ errs: errs.slice(0, 5), out: OUT }));
  await ctx.close();
} finally { await browser?.close(); server.kill(); }

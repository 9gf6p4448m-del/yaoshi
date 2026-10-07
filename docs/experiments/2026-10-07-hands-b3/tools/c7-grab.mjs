// 條件 7 補量：得標抓法寶（award）與詛咒推按（curse）兩種抓取姿勢下，福袋與垂尾的 a/b/c（實頁、grab-probe 同一套決定性時鐘與事件順序）。
// 用 tests/tools/grab-probe.mjs 匯出的 openPage／withServer／ev／step（量法沿用其事件順序：擺錢→微距→reveal-result 帶 grabMs／curseMs）。
// 四席角色＝孝女白琴（南 0）／普渡爐主（北 1）／閭山法師（西 2）／組頭（東 3）；只量 0、1 兩席（有垂掛物）。
// 每情境：reveal-result 後逐幀量到落定（award＝grabMs、curse＝curseMs）＝「移動段」，落定那一幀凍結手（setFrozen；擺盪照跑）再量 150 幀＝「停」段。
// 尖端含擺盪＝getVertexPosition；剛性＝setSeats 後抓的靜止副本經 applyBoneTransform（不讀產品 state()）。
// node c7-grab.mjs --root=<樹> --port=<埠> --out=<資料夾>
import fs from 'node:fs'; import path from 'node:path';
const GP = await import('../../../../tests/tools/grab-probe.mjs');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const OUT = path.resolve(opt.out); fs.mkdirSync(OUT, { recursive: true });
const ROLES = ['xiaonv', 'luzhu', 'lvshan', 'zutou'];
const SCEN = [
  { kind: 'award', name: 'S', seat: 0, slot: 1, loser: 1 }, { kind: 'award', name: 'N', seat: 1, slot: 2, loser: 0 },
  { kind: 'curse', name: 'cSN', seat: 0, target: 1, slot: 1, loser: 3 }, { kind: 'curse', name: 'cNS', seat: 1, target: 0, slot: 2, loser: 3 },
  { kind: 'curse', name: 'cSW', seat: 0, target: 2, slot: 2, loser: 1 }, { kind: 'curse', name: 'cNE', seat: 1, target: 3, slot: 0, loser: 2 },
];
const res = {}, errsAll = [];
await GP.withServer(async () => {
  const browser = await GP.chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const { page, errs } = await GP.openPage(browser, 'V3', opt.q || '');
    for (const sc of SCEN) {
      const isCurse = sc.kind === 'curse';
      await page.evaluate(([slot, c]) => window.__gp.reset(slot, c, 'wedding'), [sc.slot, isCurse]);
      await page.evaluate((roles) => { const T = window.__yaoshi3d.tray; const seats = roles.map((role, id) => ({ id, role })); T.props.setSeats(seats); T.hands.setSeats(seats); T.hands.setFrozen(false);
        const THREE = window.__THREE; window.__trk = [];
        T.hands.group.children.forEach((h, seat) => h.traverse((m) => { if (!m.isSkinnedMesh) return; for (const p of m.geometry.userData.b1parts || []) if (p.tipVert !== undefined) { const P = m.geometry.attributes.position;
          window.__trk.push({ seat, name: p.name, m, h, tip: p.tipVert, tipRest: new THREE.Vector3(P.getX(p.tipVert), P.getY(p.tipVert), P.getZ(p.tipVert)), knotRest: new THREE.Vector3(...p.knot), rows: [] }); } }));
        window.__samp = (phase) => { const T = window.__yaoshi3d.tray, THREE = window.__THREE, floor = T.group.localToWorld(new THREE.Vector3(0, T.props.tableY(), 0)).y;
          for (const t of window.__trk) { if (!t.h.visible) { t.rows.push({ phase, vis: false }); continue; } t.h.updateMatrixWorld(true); t.m.skeleton.update();
            const sw = new THREE.Vector3(); t.m.getVertexPosition(t.tip, sw); sw.applyMatrix4(t.m.matrixWorld);
            const rg = t.tipRest.clone(); t.m.applyBoneTransform(t.tip, rg); rg.applyMatrix4(t.m.matrixWorld);
            const kn = t.knotRest.clone(); t.m.applyBoneTransform(t.tip, kn); kn.applyMatrix4(t.m.matrixWorld);
            t.rows.push({ phase, vis: true, off: sw.distanceTo(rg), len: kn.distanceTo(rg), clear: (sw.y - floor) / kn.distanceTo(rg) }); } };
      }, ROLES);
      await GP.ev(page, 'ys:bid', { seat: sc.seat, slot: sc.slot, amount: 6 }); await GP.step(page, 50);
      await GP.ev(page, 'ys:bid', { seat: sc.loser, slot: sc.slot, amount: 4 }); await GP.step(page, 70);
      if (isCurse) { await GP.ev(page, 'ys:bid', { seat: sc.target, slot: (sc.slot + 2) % 4, amount: 3 }); await GP.step(page, 70); }
      await GP.ev(page, 'ys:reveal-slot', { slot: sc.slot, ms: 812 }); await GP.step(page, 49);
      const grabMs = await page.evaluate(() => window.__gp.grabMsDetail()), curseMs = await page.evaluate(() => window.__gp.curseMsDetail());
      await page.evaluate(() => { for (const t of window.__trk) t.rows.length = 0; });
      await GP.ev(page, 'ys:reveal-result', { winner: sc.seat, slot: sc.slot, transferTarget: isCurse ? sc.target : null, destroy: false, grabMs, curseMs, skip: false });
      const landF = Math.round((isCurse ? curseMs : grabMs) / 1000 * 60);
      for (let f = 0; f < landF; f++) { await GP.step(page, 1); await page.evaluate(() => window.__samp('move')); }
      await page.evaluate(() => window.__yaoshi3d.tray.hands.setFrozen(true));
      for (let f = 0; f < 150; f++) { await GP.step(page, 1); await page.evaluate(() => window.__samp('stop')); }
      const rows = await page.evaluate(() => window.__trk.map((t) => ({ seat: t.seat, name: t.name, rows: t.rows })));
      await page.evaluate(() => window.__yaoshi3d.tray.hands.setFrozen(false));
      for (const t of rows) {
        if (t.seat !== sc.seat) continue; // 只判做動作的那一席（抓／推的手）
        const mv = t.rows.filter((x) => x.vis && x.phase === 'move'), sp = t.rows.filter((x) => x.vis && x.phase === 'stop');
        const key = `${sc.kind}/${sc.name}/s${t.seat}/${t.name}`;
        if (!mv.length) { res[key] = { visMove: 0, verdict: '量不到（紅）' }; continue; }
        const len = mv[mv.length - 1].len, peak = Math.max(...mv.map((x) => x.off));
        const after = sp.slice(90), mx = after.length ? Math.max(...after.map((x) => x.off)) : NaN;
        const mean = after.reduce((a, x) => a + x.off, 0) / (after.length || 1), sd = Math.sqrt(after.reduce((a, x) => a + (x.off - mean) ** 2, 0) / (after.length || 1));
        const minClear = Math.min(...t.rows.filter((x) => x.vis).map((x) => x.clear));
        res[key] = { landFrames: landF, visMove: mv.length, visStop: sp.length, peakOverLen: +(peak / len).toFixed(4), a_pass: peak >= 0.05 * len && peak > 0,
          after15OverPeak: +(mx / peak).toFixed(5), staticSdOverPeak: +(sd / peak).toFixed(6), b_pass: after.length === 60 && mx < 0.1 * peak && sd < 0.02 * peak,
          minTipClearOverLen: +minClear.toFixed(4), c_pass: minClear >= -0.05 };
      }
      console.log(sc.kind, sc.name, 'done');
    }
    errsAll.push(...errs);
  } finally { await browser.close(); }
});
res.__errs = errsAll;
fs.writeFileSync(path.join(OUT, 'c7-grab.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));

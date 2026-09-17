/* WebGL 探針的頁面端函式（2026-09-17 對決卷抽出，與 gl-frame-probe.mjs 共用）。
 * 三支都是「整支序列化後在頁面裡跑」的 Playwright 函式：不得閉包任何模組變數，只能用參數與 window。
 *   glProbeInit()          addInitScript：改寫 WebGL 原型逐幀計數 gl.* 呼叫，掛在 window.__glProbe
 *   scanFrames(frames)     page.evaluate：共用材質／骨架／program churn（customProgramCacheKey 精確計數＋version 寫入堆疊）
 *   pixelABFrame()         page.evaluate：同幀翻轉所有 transparent＋DoubleSide 材質的 forceSinglePass 做像素 A/B（含同旗標重渲染與 BackSide 兩個對照）
 * 牌桌與對決共用 window.__yaoshi3d（renderer／scene／camera），所以同一組函式兩邊都能量。 */
export function glProbeInit() {
  try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch {}
  const probe = { counts: {}, tex: {}, enabled: false, reset() { this.counts = {}; this.tex = {}; } };
  window.__glProbe = probe;
  // 直接改寫原型方法（不用 Proxy，避免破壞 instanceof／getter 語意）；每個方法只包一次。
  for (const Ctx of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!Ctx) continue;
    for (const prop of Object.getOwnPropertyNames(Ctx.prototype)) {
      const desc = Object.getOwnPropertyDescriptor(Ctx.prototype, prop);
      if (!desc || typeof desc.value !== 'function' || prop === 'constructor') continue;
      const value = desc.value;
      Ctx.prototype[prop] = function (...args) {
        if (probe.enabled) {
          probe.counts[prop] = (probe.counts[prop] || 0) + 1;
          if (prop === 'texSubImage2D' || prop === 'texImage2D') {
            // texSubImage2D(target, level, x, y, w, h, format, type, src) 或 (target, level, x, y, format, type, src)
            const src = args[args.length - 1];
            const long = prop === 'texSubImage2D' ? args.length >= 9 : args.length >= 9;
            const dims = long ? `${args[prop === 'texSubImage2D' ? 4 : 3]}x${args[prop === 'texSubImage2D' ? 5 : 4]}` : (src && src.width ? `${src.width}x${src.height}` : '?');
            const fmt = long ? args[prop === 'texSubImage2D' ? 6 : 6] : args[args.length - 3];
            const type = long ? args[prop === 'texSubImage2D' ? 7 : 7] : args[args.length - 2];
            const key = `${prop} ${dims} fmt=${fmt} type=${type} src=${src?.constructor?.name || typeof src}`;
            probe.tex[key] = (probe.tex[key] || 0) + 1;
          }
        }
        return value.apply(this, args);
      };
    }
  }
}

export async function scanFrames(frames) {
  const s = window.__yaoshi3d, info = s.renderer.info, probe = window.__glProbe;
  // 結構掃描：同一顆材質被不同 program 條件的物件共用 → setProgram 每幀 needsProgramChange
  const byMaterial = new Map();
  s.scene.traverseVisible(o => {
    if (!o.isMesh && !o.isSkinnedMesh && !o.isPoints && !o.isLine) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m) continue;
      if (!byMaterial.has(m)) byMaterial.set(m, []);
      byMaterial.get(m).push({ name: o.name || o.parent?.name || '', path: (() => { const c = []; for (let p = o; p && c.length < 5; p = p.parent) c.push(p.name || p.type); return c.join('<'); })(), geometry: `${o.geometry?.type}:${o.geometry?.attributes?.position?.count ?? '?'}`, fog: m.fog, toneMapped: m.toneMapped, type: o.type, instanced: !!o.isInstancedMesh, skinned: !!o.isSkinnedMesh,
        instanceColor: !!o.instanceColor, morph: !!o.geometry?.morphAttributes?.position?.length, vertexColors: !!o.geometry?.attributes?.color });
    }
  });
  const sharedMismatch = [];
  for (const [m, users] of byMaterial) {
    if (users.length < 2) continue;
    const flags = ['instanced', 'skinned', 'instanceColor', 'morph', 'vertexColors'].filter(f => new Set(users.map(u => u[f])).size > 1);
    if (flags.length) sharedMismatch.push({ material: m.name || m.type, uuid: m.uuid.slice(0, 8), mismatch: flags, users: users.map(u => `${u.type}:${u.name}${u.instanced ? '[inst]' : ''}${u.skinned ? '[skin]' : ''}${u.instanceColor ? '[icol]' : ''}`).slice(0, 12), count: users.length });
  }
  // 骨架掃描：可見 SkinnedMesh 各自的 Skeleton 是否其實共用同一組 bone 物件（SkeletonUtils.clone 會逐 mesh 重建骨架）
  const skeletons = new Map(), signatures = new Map();
  s.scene.traverseVisible(o => {
    if (!o.isSkinnedMesh || !o.skeleton) return;
    const sk = o.skeleton;
    if (!skeletons.has(sk)) skeletons.set(sk, { bones: sk.bones.length, meshes: 0, texture: sk.boneTexture ? `${sk.boneTexture.image.width}x${sk.boneTexture.image.height}` : null });
    skeletons.get(sk).meshes++;
    const sig = sk.bones.map(b => b.uuid).join(',') + '|' + sk.boneInverses.map(m => m.elements.map(e => e.toFixed(6)).join(' ')).join(';');
    if (!signatures.has(sig)) signatures.set(sig, { bones: sk.bones.length, skeletons: new Set(), meshes: 0, root: sk.bones[0]?.parent?.name || '' });
    signatures.get(sig).skeletons.add(sk); signatures.get(sig).meshes++;
  });
  const skeletonScan = { visibleSkinnedMeshes: [...skeletons.values()].reduce((n, v) => n + v.meshes, 0), distinctSkeletons: skeletons.size,
    identicalBoneSetGroups: [...signatures.values()].map(g => ({ bones: g.bones, skeletons: g.skeletons.size, meshes: g.meshes, root: g.root })) };
  // program churn 掃描（2026-09-17 第三個假設）：Three 0.158 的 getParameters 每次都呼叫
  // material.customProgramCacheKey()，包住 Material.prototype 那一支就能逐材質精確計數
  // 「這一幀 setProgram 重走了 getProgram」。呼叫當下 renderer.properties.get(material) 仍是上一次
  // getProgram 寫入的值，連續兩次快照之間變動的欄位＝setProgram 判 needsProgramChange 的那個條件。
  const anyMaterial = byMaterial.keys().next().value;
  let matProto = anyMaterial && Object.getPrototypeOf(anyMaterial);
  while (matProto && !Object.prototype.hasOwnProperty.call(matProto, 'customProgramCacheKey')) matProto = Object.getPrototypeOf(matProto);
  const churn = new Map();
  const FIELDS = ['__version', 'lightsStateVersion', 'outputColorSpace', 'instancing', 'instancingColor', 'skinning', 'numClippingPlanes', 'numIntersection', 'vertexAlphas', 'vertexTangents', 'morphTargets', 'morphNormals', 'morphColors', 'morphTargetsCount', 'toneMapping', 'needsLights'];
  const snap = (m, mp) => { const o = { frame: info.render.frame, draw: info.render.calls, materialVersion: m.version, program: mp.currentProgram?.id ?? null, alphaTest: m.alphaTest, alphaHash: m.alphaHash, transparent: m.transparent, opacity: m.opacity, map: m.map?.uuid?.slice(0, 8) ?? null, alphaMap: !!m.alphaMap, vertexColors: m.vertexColors, side: m.side, blending: m.blending, depthWrite: m.depthWrite, dithering: m.dithering, premultipliedAlpha: m.premultipliedAlpha, alphaToCoverage: m.alphaToCoverage, envMap: mp.envMap?.uuid?.slice(0, 8) ?? null, fog: mp.fog?.uuid?.slice(0, 8) ?? (mp.fog ? 'fog' : null), renderTarget: s.renderer.getRenderTarget()?.texture?.uuid?.slice(0, 8) ?? null }; for (const f of FIELDS) o[f] = mp[f]; return o; };
  const origKey = matProto?.customProgramCacheKey;
  if (origKey) matProto.customProgramCacheKey = function () {
    if (probe.enabled) {
      let e = churn.get(this); if (!e) { e = { calls: 0, snaps: [] }; churn.set(this, e); }
      e.calls++;
      if (e.snaps.length < 6) e.snaps.push(snap(this, s.renderer.properties.get(this)));
    }
    return origKey.call(this);
  };
  const programsBefore = info.programs.length, memoryBefore = { ...info.memory };
  probe.reset(); probe.enabled = true;
  const f0 = info.render.frame, t0 = performance.now();
  // rafTicks：量測窗內的 rAF 次數。對決畫面每個 rAF 會 render 多趟（info.render.frame 每趟 +1），
  // 「每幀」的分母沿用 render 次數（與牌桌口徑一致），另附 passesPerRaf 與 perRaf 換算，看的人不必自己乘。
  let rafTicks = 0;
  await new Promise(resolve => { const tick = () => { rafTicks++; return info.render.frame - f0 >= frames ? resolve() : requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  const elapsed = performance.now() - t0, rendered = info.render.frame - f0;
  probe.enabled = false;
  if (origKey) matProto.customProgramCacheKey = origKey;
  const userTag = m => (byMaterial.get(m) || []).map(u => `${u.type}:${u.name}${u.instanced ? '[inst]' : ''}${u.skinned ? '[skin]' : ''} path=${u.path} geo=${u.geometry} fog=${u.fog} toneMapped=${u.toneMapped}`);
  const programChurn = { getParametersPerFrame: +([...churn.values()].reduce((n, e) => n + e.calls, 0) / rendered).toFixed(2), materialsCalled: churn.size,
    materials: [...churn.entries()].map(([m, e]) => {
      const changed = new Set();
      for (let i = 1; i < e.snaps.length; i++) for (const k of Object.keys(e.snaps[i])) if (String(e.snaps[i][k]) !== String(e.snaps[i - 1][k])) changed.add(k);
      return { material: m.name || m.type, type: m.type, uuid: m.uuid.slice(0, 8), callsPerFrame: +(e.calls / rendered).toFixed(2), changedBetweenCalls: [...changed], userCount: (byMaterial.get(m) || []).length, users: userTag(m).slice(0, 8), snaps: e.snaps.slice(0, 3) };
    }).sort((a, b) => b.callsPerFrame - a.callsPerFrame) };
  // 第二段：對每幀重走 getProgram 的材質攔截 version 寫入（Material.needsUpdate setter／alphaTest setter 都走 version++），
  // 抓呼叫堆疊，直接定位是哪一行每幀 bump。只跑 3 幀、每顆最多 4 條堆疊。
  const bumpStacks = [];
  const churned = [...churn.entries()].filter(([, e]) => e.calls >= Math.min(rendered, rafTicks)).map(([m]) => m).slice(0, 8);
  for (const m of churned) {
    let v = m.version; const rec = { material: m.name || m.type, uuid: m.uuid.slice(0, 8), stacks: [] }; bumpStacks.push(rec);
    Object.defineProperty(m, 'version', { configurable: true, enumerable: true, get() { return v; }, set(nv) { if (nv !== v && rec.stacks.length < 4) rec.stacks.push({ frame: info.render.frame, draw: info.render.calls, stack: String(new Error().stack).split('\n').slice(1, 8).map(l => l.trim()) }); v = nv; } });
  }
  await new Promise(resolve => { let n = 0; const tick = () => ++n >= 3 ? resolve() : requestAnimationFrame(tick); requestAnimationFrame(tick); });
  for (const m of churned) { const v = m.version; delete m.version; m.version = v; }
  programChurn.versionBumpStacks = bumpStacks;
  const perFrame = Object.fromEntries(Object.entries(probe.counts).map(([k, v]) => [k, +(v / rendered).toFixed(2)]).sort((a, b) => b[1] - a[1]));
  const texPerFrame = Object.fromEntries(Object.entries(probe.tex).map(([k, v]) => [k, +(v / rendered).toFixed(2)]).sort((a, b) => b[1] - a[1]));
  const drawsPerFrame = ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced'].reduce((n, k) => n + (probe.counts[k] || 0), 0) / rendered;
  return { slot: s.tray.hover?.() ?? null, renderedFrames: rendered, rafTicks, passesPerRaf: +(rendered / rafTicks).toFixed(2), rendersPerSec: +(rendered / (elapsed / 1000)).toFixed(1),
    perRaf: { getParameters: +(programChurn.getParametersPerFrame * rendered / rafTicks).toFixed(2), draws: +(drawsPerFrame * rendered / rafTicks).toFixed(2), useProgram: +((probe.counts.useProgram || 0) / rafTicks).toFixed(2) },
    programs: { before: programsBefore, after: info.programs.length }, memory: { before: memoryBefore, after: { ...info.memory } },
    materialsInScene: byMaterial.size, sharedMaterialMismatch: sharedMismatch, skeletonScan, programChurn, glCallsPerFrame: perFrame, textureUploadsPerFrame: texPerFrame,
    models: s.tray.items?.() };
}

export function pixelABFrame() {
  const s = window.__yaoshi3d, renderer = s.renderer, gl = renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const mats = []; s.scene.traverse(o => { for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && m.transparent && m.side === 2 && !mats.includes(m)) mats.push(m); });
  const shoot = () => { renderer.render(s.scene, s.camera); const buf = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf); return buf; };
  const cmp = (A, B) => { let diffPx = 0, maxD = 0; for (let i = 0; i < A.length; i += 4) { let d = 0; for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(A[i + c] - B[i + c])); if (d) { diffPx++; if (d > maxD) maxD = d; } } return { diffPixels: diffPx, diffPct: +(100 * diffPx / (w * h)).toFixed(4), maxChannelDelta: maxD }; };
  const A = shoot();
  const selfRepeat = cmp(A, shoot());
  const shipped = mats.map(m => m.forceSinglePass);
  mats.forEach(m => { m.forceSinglePass = !m.forceSinglePass; });
  const toggled = cmp(A, shoot());
  mats.forEach((m, i) => { m.forceSinglePass = shipped[i]; });
  // 負對照用 BackSide（剔掉正面）：桌面 decal 全是正面朝相機，改 FrontSide 什麼都不變、沒有鑑別力（實測 0 差異）
  const sides = mats.map(m => m.side);
  mats.forEach(m => { m.side = 1; });
  const backSideControl = cmp(A, shoot());
  mats.forEach((m, i) => { m.side = sides[i]; });
  shoot();
  let nonZero = 0; for (let i = 0; i < A.length; i += 4) if (A[i] | A[i + 1] | A[i + 2]) nonZero++;
  return { width: w, height: h, nonZeroPixelsInA: nonZero, materials: mats.length, shippedForceSinglePass: shipped, selfRepeat, toggled, backSideControl };
}

/** 場景那一趟的 draw 分佈（對決卷二 2026-09-17）：traverseVisible 逐物件分類——依「最近的有名祖先」與物件型別分組，
 *  並用相機視錐判 frustumCulled 的物件會不會真的送出 draw。回傳 byRoot／byName／byType 三張表（皆含 inFrustum 數）。
 *  這是「哪裡花的」的量測，不是 fps 證據；multi-material 的 mesh 每個材質群組算一次 draw。 */
export function drawBudgetScan() {
  const s = window.__yaoshi3d, THREE_ = s.scene.constructor; // 不 import three：用場景物件自帶的類別
  const cam = s.camera; cam.updateMatrixWorld(); s.scene.updateMatrixWorld(true);
  const projView = cam.projectionMatrix.clone().multiply(cam.matrixWorldInverse);
  const Frustum = Object.getPrototypeOf(s.renderer).constructor.__frustum || null; // 不一定拿得到，退路用 sphere 投影
  const inView = (o) => {
    if (!o.frustumCulled) return true;
    if (!o.geometry) return true;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const sp = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld);
    // 6 平面測試（自己算，避免依賴 three 匯出）
    const m = projView.elements; const c = sp.center, r = sp.radius;
    const planes = [[m[3]-m[0],m[7]-m[4],m[11]-m[8],m[15]-m[12]],[m[3]+m[0],m[7]+m[4],m[11]+m[8],m[15]+m[12]],[m[3]+m[1],m[7]+m[5],m[11]+m[9],m[15]+m[13]],[m[3]-m[1],m[7]-m[5],m[11]-m[9],m[15]-m[13]],[m[3]-m[2],m[7]-m[6],m[11]-m[10],m[15]-m[14]],[m[3]+m[2],m[7]+m[6],m[11]+m[10],m[15]+m[14]]];
    for (const [a,b,cc,d] of planes) { const len = Math.hypot(a,b,cc) || 1; if ((a*c.x+b*c.y+cc*c.z+d)/len < -r) return false; }
    return true;
  };
  const rootOf = (o) => { for (let p = o.parent; p; p = p.parent) { if (p.name) return p.name; } return '(scene)'; };
  const topOf = (o) => { let last = o; for (let p = o.parent; p && p !== s.scene; p = p.parent) last = p; return last.name || last.type; };
  const byRoot = {}, byName = {}, byType = {}, byTop = {};
  const bump = (t, k, n, v) => { const e = t[k] || (t[k] = { objects: 0, draws: 0, inFrustumDraws: 0, tris: 0 }); e.objects++; e.draws += n; if (v) e.inFrustumDraws += n; };
  let total = 0, inF = 0, objects = 0;
  s.scene.traverseVisible((o) => {
    if (!(o.isMesh || o.isSkinnedMesh || o.isPoints || o.isLine || o.isSprite)) return;
    const groups = Array.isArray(o.material) ? Math.max(1, o.geometry?.groups?.length || o.material.length) : 1;
    const v = inView(o); objects++; total += groups; if (v) inF += groups;
    bump(byRoot, rootOf(o), groups, v); bump(byName, (o.name || o.type) + (o.isInstancedMesh ? '[inst]' : '') + (o.isSkinnedMesh ? '[skin]' : ''), groups, v); bump(byType, o.type + (o.material?.type ? ':' + (Array.isArray(o.material) ? o.material[0].type : o.material.type) : ''), groups, v); bump(byTop, topOf(o), groups, v);
  });
  const sortT = (t) => Object.entries(t).sort((a, b) => b[1].inFrustumDraws - a[1].inFrustumDraws).map(([k, v]) => ({ key: k, ...v }));
  return { visibleObjects: objects, drawsIfAllInFrustum: total, drawsInFrustum: inF, byTop: sortT(byTop), byRoot: sortT(byRoot).slice(0, 40), byName: sortT(byName).slice(0, 40), byType: sortT(byType) };
}

/** 外殼合併前提掃描（對決卷二）：逐尊列出本體 SkinnedMesh 的骨架／bindMatrix／本地矩陣／屬性集／材質群組，
 *  回答「同一尊的外殼能不能無損併成一顆 draw」。純結構掃描，不改任何東西。 */
export function shellMergeScan() {
  const s = window.__yaoshi3d;
  const figs = s.duelFigures.figuresOf('A').concat(s.duelFigures.figuresOf('B'));
  const h = (m) => m.elements.map((e) => +e.toFixed(5)).join(',');
  const isIdentity = (m) => m.elements.every((e, i) => Math.abs(e - (i % 5 === 0 ? 1 : 0)) < 1e-6);
  return figs.map((f) => {
    const parts = [], shells = [];
    f.group.traverse((o) => { if (o.name === 'outline') shells.push(o); else if (o.isSkinnedMesh || (o.isMesh && o.parent && o.parent.name !== 'outline' && o.geometry?.attributes?.skinIndex)) parts.push(o); });
    const skeletons = new Set(), binds = new Set(), attrSets = new Set(), parents = new Set();
    let nonIdentityLocal = 0, multiMat = 0, indexed = 0, verts = 0, tris = 0, groups = 0;
    for (const o of parts) {
      if (o.skeleton) skeletons.add(o.skeleton); if (o.bindMatrix) binds.add(h(o.bindMatrix));
      attrSets.add(Object.keys(o.geometry.attributes).sort().join('+') + (o.geometry.index ? '+idx' : ''));
      parents.add(o.parent ? (o.parent.name || o.parent.type) : '');
      // 本地矩陣：從部件一路乘到 model 根（f.group 的直接子節點）
      const m = o.matrix.clone(); for (let p = o.parent; p && p.parent && p.parent !== f.group; p = p.parent) m.premultiply(p.matrix);
      if (!isIdentity(m)) nonIdentityLocal++;
      if (Array.isArray(o.material)) { multiMat++; groups += o.geometry.groups?.length || o.material.length; } else groups += 1;
      if (o.geometry.index) indexed++;
      verts += o.geometry.attributes.position.count; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    }
    const shellDraws = shells.reduce((n, sh) => n + (Array.isArray(sh.material) ? sh.material.filter((m) => m.visible !== false).length : 1), 0);
    const shellSkipGroups = shells.reduce((n, sh) => n + (Array.isArray(sh.material) ? sh.material.filter((m) => m.visible === false).length : 0), 0);
    return { ab: f.ab, visible: f.group.visible, parts: parts.length, shells: shells.length, shellDraws, shellSkipGroups, distinctSkeletons: skeletons.size, distinctBindMatrices: binds.size, attrSets: [...attrSets], parents: [...parents].slice(0, 6), nonIdentityLocal, multiMat, indexed, verts, tris: Math.round(tris) };
  });
}

/** 外殼合併的同幀像素 A/B（對決卷二）：A＝出貨（合併殼）；B＝合併殼設 invisible、每顆本體 mesh 底下照退路做法
 *  臨時掛一顆同 geometry／同骨架／同 bindMatrix／同材質的殼（ghost 群組用「不寫」材質）；對照＝兩種殼都關。
 *  只挑「掛在部件父節點上的 outline SkinnedMesh」＝合併殼；退路的逐部件殼掛在本體 mesh 底下（parent.isMesh），不會被挑到。 */
export function shellABFrame() {
  const s = window.__yaoshi3d, renderer = s.renderer, gl = renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const merged = []; s.scene.traverse((o) => { if (o.name === 'outline' && o.isSkinnedMesh && o.parent && !o.parent.isMesh) merged.push(o); });
  const shoot = () => { renderer.render(s.scene, s.camera); const buf = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf); return buf; };
  const cmp = (A, B) => { let diffPx = 0, maxD = 0; for (let i = 0; i < A.length; i += 4) { let d = 0; for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(A[i + c] - B[i + c])); if (d) { diffPx++; if (d > maxD) maxD = d; } } return { diffPixels: diffPx, diffPct: +(100 * diffPx / (w * h)).toFixed(4), maxChannelDelta: maxD }; };
  const A = shoot();
  const selfRepeat = cmp(A, shoot());
  const isGhost = (m) => /^ghost_/i.test((m && m.name) || '');
  const temp = [], shown = merged.filter((sh) => sh.visible);
  let legacyShells = 0;
  for (const sh of shown) {
    sh.visible = false;
    const Skip = new (sh.material.constructor)({ colorWrite: false, depthWrite: false, depthTest: false });
    for (const o of sh.parent.children) {
      if (o === sh || !o.isSkinnedMesh || o.name === 'outline') continue;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.every(isGhost)) continue;
      const mat = Array.isArray(o.material) ? o.material.map((m) => (isGhost(m) ? Skip : sh.material)) : sh.material;
      const t = new o.constructor(o.geometry, mat); t.bindMode = o.bindMode; t.bind(o.skeleton, o.bindMatrix); t.frustumCulled = false;
      o.add(t); temp.push({ o, t }); legacyShells++;
    }
  }
  const legacy = cmp(A, shoot());
  temp.forEach((x) => { x.t.visible = false; });
  const noShellControl = cmp(A, shoot());
  temp.forEach((x) => { x.o.remove(x.t); });
  shown.forEach((sh) => { sh.visible = true; });
  shoot();
  let nonZero = 0; for (let i = 0; i < A.length; i += 4) if (A[i] | A[i + 1] | A[i + 2]) nonZero++;
  return { width: w, height: h, nonZeroPixelsInA: nonZero, mergedShells: merged.length, mergedVisible: shown.length, legacyShells, selfRepeat, legacy, noShellControl };
}

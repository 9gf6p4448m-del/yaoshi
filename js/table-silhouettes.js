// 妖市 3D 環境層 — 後景人影（階段三 #E；docs/proposals/2026-09-30-seat-hands-silhouettes.md §5）
//
// 牌桌北／西／東三側各一尊「坐在桌邊的人影」，只負責「桌邊還有別人在場」的氣氛。**純呈現**：
//   - 不讀寫賽局狀態、不耗亂數（所有形狀與顏色寫死；單元測試核 Math.random 呼叫＝0）。
//   - 靜態：幾何在建構時一次烘好（L／P 兩版各一份，setLayout 只是換掉 mesh.geometry 的指標），update 不存在、每幀 0 成本。
//   - 三尊合併成**一個** mesh（同材質、頂點色）⇒ 淨增 1 draw call（上限 3）；每尊 ≤200 三角形。
//   - 有體積、不是貼片：頭（UV 球）＋頸＋肩（橢圓錐台）＋身體（橢圓錐台）＋各自的頭飾，輪廓靠頭飾區分：
//     北＝烏紗官帽（兩翅）、西＝高髻＋長髮（髮簪）、東＝斗笠。紙紮感＝輪廓邊緣的頂點色帶（紙骨折痕），不加貼圖。
//   - 掛在 table-tray 的 group ⇒ `tray.setVisible(false)`（對決）整組收；不進 `tray.hitTest` 的命中代理（mesh.raycast 也停用）。
import * as THREE from 'three';

const V = new URL(import.meta.url).search;
const { vcBuilder } = await import('./scene-env.js' + V);

/** 擺位（世界 x／z；y 取桌頂略下，底部埋進桌面）。L／P 兩組是依投影量出來的（量測見 docs/experiments/2026-10-01-hands-stage3/e-silhouettes/）。 */
export const SIL = {
  Y: 0.13, // 桌頂 0.15：底部埋進桌面 0.02，不露縫
  SCALE: 0.9,
  SEAT: {
    L: [{ kind: 'official', x: -0.1, z: -2.2 }, { kind: 'bun', x: -1.42, z: -1.95 }, { kind: 'bamboo', x: 1.5, z: -1.95 }],
    P: [{ kind: 'official', x: 0, z: -2.5 }, { kind: 'bun', x: -0.72, z: -2.0 }, { kind: 'bamboo', x: 0.72, z: -2.0 }],
  },
  /** 暗色（近黑帶紫，與 scene-env 的 FAR_DARK 同一家族；不可愛）。 */
  COL: {
    robe: 0x1b1520, robeHi: 0x2e2336, shoulder: 0x241b2b, skin: 0x3a2f33, hair: 0x0c0a0f,
    hat: 0x15110f, hatHi: 0x3a2c28, paper: 0x4d4047, band: 0x6a2020,
  },
};

/* ── 幾何小工具（座標在人影的局部系：y 向上、+z 朝桌心；T 把局部點轉到世界）─────────────── */
function makeBuilder(T) {
  const b = vcBuilder();
  const w = (p) => T(p[0], p[1], p[2]);
  const tri = (a, c, d, h0, h1, h2) => b.tri(w(a), w(c), w(d), h0, h1, h2);
  const quad = (a, c, d, e, h0, h1, h2, h3) => b.quad(w(a), w(c), w(d), w(e), h0, h1, h2, h3);
  /** 橢圓錐台（n 段，只做側面，兩端另行封）。下色 cLo、上色 cHi。 */
  const frustum = (cx, cz, y0, y1, rx0, rz0, rx1, rz1, n, cLo, cHi) => {
    const pt = (rx, rz, y, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.sin(a) * rx, y, cz + Math.cos(a) * rz]; };
    for (let i = 0; i < n; i++) quad(pt(rx0, rz0, y0, i), pt(rx0, rz0, y0, i + 1), pt(rx1, rz1, y1, i + 1), pt(rx1, rz1, y1, i), cLo, cLo, cHi, cHi);
  };
  const capTop = (cx, cz, y, rx, rz, n, col) => {
    const pt = (i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.sin(a) * rx, y, cz + Math.cos(a) * rz]; };
    for (let i = 0; i < n; i++) tri([cx, y, cz], pt(i), pt(i + 1), col);
  };
  /** 圓錐（斗笠）：側面 n 個三角形。 */
  const cone = (cx, cz, y0, y1, rx, rz, n, cLo, cHi) => {
    const pt = (i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.sin(a) * rx, y0, cz + Math.cos(a) * rz]; };
    for (let i = 0; i < n; i++) tri(pt(i), pt(i + 1), [cx, y1, cz], cLo, cLo, cHi);
  };
  /** UV 球（lat 圈 × lon 段）：兩個極帽＋中間 (lat−2) 圈帶。 */
  const sphere = (cx, cy, cz, rx, ry, rz, lat, lon, cLo, cHi) => {
    const ring = (k, i) => { const t = (k / lat) * Math.PI, a = (i / lon) * Math.PI * 2; return [cx + Math.sin(t) * Math.sin(a) * rx, cy + Math.cos(t) * ry, cz + Math.sin(t) * Math.cos(a) * rz]; };
    const mix = (k) => { const c = new THREE.Color(cHi).lerp(new THREE.Color(cLo), k / lat); return c; };
    for (let i = 0; i < lon; i++) {
      tri([cx, cy + ry, cz], ring(1, i), ring(1, i + 1), mix(0), mix(1), mix(1));
      for (let k = 1; k < lat - 1; k++) quad(ring(k + 1, i), ring(k + 1, i + 1), ring(k, i + 1), ring(k, i), mix(k + 1), mix(k + 1), mix(k), mix(k));
      tri(ring(lat - 1, i + 1), ring(lat - 1, i), [cx, cy - ry, cz], mix(lat - 1), mix(lat - 1), mix(lat));
    }
  };
  /** 軸對齊盒（局部系，12 個三角形）。 */
  const box = (cx, cy, cz, hx, hy, hz, col, colTop) => {
    const top = colTop === undefined ? col : colTop;
    const p = (sx, sy, sz) => [cx + sx * hx, cy + sy * hy, cz + sz * hz];
    quad(p(-1, 1, 1), p(1, 1, 1), p(1, 1, -1), p(-1, 1, -1), top);
    quad(p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1), col);
    quad(p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1), p(-1, -1, 1), col);
    quad(p(-1, -1, -1), p(-1, 1, -1), p(1, 1, -1), p(1, -1, -1), col);
    quad(p(-1, -1, 1), p(-1, 1, 1), p(-1, 1, -1), p(-1, -1, -1), col);
    quad(p(1, -1, -1), p(1, 1, -1), p(1, 1, 1), p(1, -1, 1), col);
  };
  return { b, tri, quad, frustum, capTop, cone, sphere, box };
}

/** 一尊人影（共用的「頭＋頸＋肩＋身」，再加各自的頭飾）。回傳這一尊的三角形數由呼叫端量 count 差。 */
function buildFigure(g, kind) {
  const C = SIL.COL, col = (h) => new THREE.Color(h);
  const robe = col(C.robe), robeHi = col(C.robeHi), shoulder = col(C.shoulder), skin = col(C.skin), paper = col(C.paper);
  // 身體：下寬上窄的長袍（橢圓截面），底色壓暗往上微亮＝桌面光落在上半身
  g.frustum(0, 0, 0, 0.17, 0.21, 0.13, 0.15, 0.09, 8, col(0x0e0b12), robe);
  // 肩：寬而扁的一圈（兩肩比頭寬一倍多，是「人形」最重要的輪廓線），邊緣一圈紙骨折痕色帶
  g.frustum(0, 0, 0.17, 0.205, 0.15, 0.09, 0.17, 0.085, 8, robe, paper);
  g.frustum(0, 0, 0.205, 0.235, 0.17, 0.085, 0.07, 0.05, 8, shoulder, robeHi);
  g.capTop(0, 0, 0.235, 0.07, 0.05, 8, robeHi);
  // 衣襟紅線（一條窄帶，正面中線）：色帶只給輪廓一點辨識，不亮
  g.quad([-0.012, 0.04, 0.1255], [0.012, 0.04, 0.1255], [0.012, 0.17, 0.093], [-0.012, 0.17, 0.093], col(C.band));
  // 頸
  g.frustum(0, 0, 0.235, 0.265, 0.038, 0.034, 0.035, 0.032, 6, skin, skin);
  // 頭：UV 球 4×8（48 tris），略扁
  g.sphere(0, 0.315, 0.004, 0.058, 0.066, 0.058, 4, 8, col(0x1a1418), skin);
  if (kind === 'official') {
    // 烏紗帽：帽身（錐台）＋頂＋兩翅（細長盒，橫向伸出，輪廓一眼是「官」）
    const hat = col(C.hat), hi = col(C.hatHi);
    g.frustum(0, 0, 0.345, 0.405, 0.064, 0.062, 0.052, 0.05, 8, hat, hi);
    g.capTop(0, 0, 0.405, 0.052, 0.05, 8, hi);
    g.box(-0.115, 0.37, -0.02, 0.058, 0.007, 0.018, hat, hi);
    g.box(0.115, 0.37, -0.02, 0.058, 0.007, 0.018, hat, hi);
  } else if (kind === 'bun') {
    // 高髻＋長髮：頭頂一顆髻（球）、髮簪（細長盒斜不做、直插）、腦後披下的長髮（錐台往後）
    const hair = col(C.hair), hi = col(C.hatHi);
    g.sphere(0, 0.395, -0.005, 0.034, 0.03, 0.034, 2, 6, hair, hi);
    g.box(0, 0.425, -0.005, 0.004, 0.035, 0.004, paper, hi);
    g.frustum(0, -0.035, 0.2, 0.34, 0.075, 0.03, 0.062, 0.03, 8, hair, hair);
    g.sphere(0, 0.325, 0.0, 0.062, 0.05, 0.062, 3, 8, hair, hair); // 瀏海罩住上半個頭
  } else {
    // 斗笠：寬圓錐（輪廓＝一個大三角帽簷），笠下壓過額頭，帽緣一圈紙篾色
    const hat = col(C.hat), hi = col(C.hatHi);
    g.cone(0, 0.0, 0.34, 0.44, 0.165, 0.165, 10, hat, hi);
    g.frustum(0, 0, 0.335, 0.34, 0.17, 0.17, 0.165, 0.165, 10, paper, hat);
  }
}

function buildLayout(list, scale) {
  const out = { geometry: null, trisByFigure: [], kinds: [], bounds: [] };
  // 三尊合併：每尊的座標轉換不同，所以逐尊建、最後把頂點接起來（仍是單一 BufferGeometry）
  const pos = [], colr = [];
  let nFig = 0;
  for (const f of list) {
    const yaw = Math.atan2(-f.x, -f.z), co = Math.cos(yaw), si = Math.sin(yaw);
    const T = (x, y, z) => { const sx = x * scale, sy = y * scale, sz = z * scale; return [f.x + sx * co + sz * si, SIL.Y + sy, f.z - sx * si + sz * co]; };
    const g = makeBuilder(T);
    buildFigure(g, f.kind);
    const mesh = g.b.build('x');
    const p = mesh.geometry.attributes.position.array, c = mesh.geometry.attributes.color.array;
    out.trisByFigure.push(p.length / 9);
    out.kinds.push(f.kind);
    for (let i = 0; i < p.length; i++) pos.push(p[i]);
    for (let i = 0; i < c.length; i++) colr.push(c[i]);
    mesh.geometry.dispose(); mesh.material.dispose();
    nFig++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colr), 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  // 每尊的包圍盒（世界座標，驗收取樣用）
  let off = 0;
  for (const t of out.trisByFigure) {
    const n = t * 9; const bb = new THREE.Box3();
    for (let i = off; i < off + n; i += 3) bb.expandByPoint(new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]));
    out.bounds.push({ min: bb.min.toArray(), max: bb.max.toArray() });
    off += n;
  }
  out.geometry = geo;
  return out;
}

/**
 * @param parent  掛進去的 Group（table-tray 的 group；對決時整組收）
 * @param opts    { mode: 'L'|'P' }
 */
export function createTableSilhouettes(parent, opts = {}) {
  const group = new THREE.Group();
  group.name = 'table-silhouettes';
  parent.add(group);
  const layouts = { L: buildLayout(SIL.SEAT.L, SIL.SCALE), P: buildLayout(SIL.SEAT.P, SIL.SCALE) };
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0, fog: true });
  let mode = opts.mode === 'P' ? 'P' : 'L';
  const mesh = new THREE.Mesh(layouts[mode].geometry, material);
  mesh.name = 'table-silhouettes-mesh';
  mesh.frustumCulled = false; // 兩版幾何包圍球不同；三尊總共才 ~400 三角形，不剔除省去換版時的包圍球維護
  mesh.raycast = () => {}; // 不進任何射線測試（U2；tray.hitTest 本來也只看它自己的 proxies）
  group.add(mesh);
  const api = {
    group, mesh,
    /** 換版面（只換幾何指標，不重算）。 */
    setLayout(m) { const k = m === 'P' ? 'P' : 'L'; if (k === mode) return; mode = k; mesh.geometry = layouts[k].geometry; },
    mode() { return mode; },
    /** 治具／驗收出口（只讀）。 */
    stats() {
      const cur = layouts[mode];
      return { mode, figures: cur.kinds.length, kinds: cur.kinds.slice(), trisByFigure: cur.trisByFigure.slice(), totalTris: cur.trisByFigure.reduce((a, b) => a + b, 0), meshes: 1, bounds: cur.bounds, visible: group.visible };
    },
    dispose() {
      layouts.L.geometry.dispose(); layouts.P.geometry.dispose(); material.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
  return api;
}

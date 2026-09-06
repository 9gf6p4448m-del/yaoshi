// 解析 GLB：依材質列出頂點數、位置範圍，並把 COLOR_0 依色聚類，輸出每個色塊的位置範圍（找色帶邊界用）
import fs from 'node:fs';
const [file, matFilter] = process.argv.slice(2);
const b = fs.readFileSync(file); const jl = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20 + jl).toString('utf8'));
const bl = b.readUInt32LE(20 + jl); const bin = b.slice(28 + jl, 28 + jl + bl);
const acc = (i) => { const a = j.accessors[i]; const bv = j.bufferViews[a.bufferView]; const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]; const T = { 5126: Float32Array, 5123: Uint16Array, 5121: Uint8Array, 5125: Uint32Array }[a.componentType];
  const arr = new T(bin.buffer, bin.byteOffset + off, a.count * n); return { arr, n, norm: a.normalized, count: a.count, type: a.componentType }; };
const srgb = (v) => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
const hex = (r, g, bb) => '#' + [r, g, bb].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
for (const m of j.meshes) for (const p of m.primitives) {
  const mat = j.materials[p.material]; if (matFilter && !new RegExp(matFilter).test(mat.name)) continue;
  const P = acc(p.attributes.POSITION), C = p.attributes.COLOR_0 !== undefined ? acc(p.attributes.COLOR_0) : null;
  const groups = new Map();
  for (let i = 0; i < P.count; i++) {
    const x = P.arr[i * 3], y = P.arr[i * 3 + 1], z = P.arr[i * 3 + 2];
    let key = 'nocolor';
    if (C) { const s = C.type === 5126 ? 1 : (C.type === 5123 ? 65535 : 255); const r = srgb(C.arr[i * C.n] / s), g = srgb(C.arr[i * C.n + 1] / s), bb = srgb(C.arr[i * C.n + 2] / s);
      // 量化到 16 級以合併烘進去的漸層雜訊
      key = hex(Math.round(r * 15) / 15, Math.round(g * 15) / 15, Math.round(bb * 15) / 15); }
    const g = groups.get(key) || { n: 0, min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9], sy: 0 };
    g.n++; g.sy += y; [x, y, z].forEach((v, k) => { g.min[k] = Math.min(g.min[k], v); g.max[k] = Math.max(g.max[k], v); }); groups.set(key, g);
  }
  console.log(`== ${m.name} | ${mat.name} | verts ${P.count}`);
  [...groups.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 10).forEach(([k, g]) => console.log(`  ${k} n=${g.n} y=${g.min[1].toFixed(2)}..${g.max[1].toFixed(2)} (mean ${(g.sy / g.n).toFixed(2)}) x=${g.min[0].toFixed(2)}..${g.max[0].toFixed(2)} z=${g.min[2].toFixed(2)}..${g.max[2].toFixed(2)}`));
}

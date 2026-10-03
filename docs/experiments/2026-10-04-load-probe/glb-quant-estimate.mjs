// 估算（非 meshopt 實測）：把頂點屬性做 KHR_mesh_quantization 風格的量化後重新 gzip，看壓縮比。
import fs from 'node:fs'; import zlib from 'node:zlib';
const dir = 'assets/creatures/'; const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).filter((x) => x.endsWith('.glb'));
const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
let totRaw = 0, totGz = 0, totQ = 0, totQgz = 0; const rows = [];
for (const f of files) {
  const b = fs.readFileSync(dir + f); const jl = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20 + jl).toString()); const bin = b.slice(20 + jl + 8);
  const read = (ai) => { const a = j.accessors[ai], v = j.bufferViews[a.bufferView]; const n = a.count * NC[a.type]; const T = CT[a.componentType]; const stride = v.byteStride; const off = (v.byteOffset || 0) + (a.byteOffset || 0); if (!stride || stride === T.BYTES_PER_ELEMENT * NC[a.type]) return new T(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + n * T.BYTES_PER_ELEMENT)); const out = new T(n); const dv = new DataView(bin.buffer, bin.byteOffset); for (let i = 0; i < a.count; i++) for (let c = 0; c < NC[a.type]; c++) out[i * NC[a.type] + c] = T === Float32Array ? dv.getFloat32(off + i * stride + c * 4, true) : T === Uint16Array ? dv.getUint16(off + i * stride + c * 2, true) : dv.getUint8(off + i * stride + c); return out; };
  const chunks = []; const seen = new Set(); let qBytes = 0;
  const push = (arr) => { const bb = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); chunks.push(bb); };
  for (const m of j.meshes) for (const p of m.primitives) for (const [k, ai] of Object.entries(p.attributes)) {
    if (seen.has(ai)) continue; seen.add(ai); const src = read(ai); const nc = NC[j.accessors[ai].type];
    if (k === 'POSITION') { const mn = j.accessors[ai].min, mx = j.accessors[ai].max; const q = new Int16Array(src.length / 3 * 4); for (let i = 0; i < src.length / 3; i++) for (let c = 0; c < 3; c++) { const r = mx[c] - mn[c] || 1; q[i * 4 + c] = Math.round(((src[i * 3 + c] - mn[c]) / r) * 65535 - 32768); } push(q); }
    else if (k === 'NORMAL') { const q = new Int8Array(src.length / 3 * 4); for (let i = 0; i < src.length / 3; i++) for (let c = 0; c < 3; c++) q[i * 4 + c] = Math.round(src[i * 3 + c] * 127); push(q); }
    else if (/COLOR/.test(k)) { const q = new Uint8Array(src.length / nc * 4); for (let i = 0; i < src.length / nc; i++) for (let c = 0; c < nc; c++) q[i * 4 + c] = Math.round(Math.min(1, Math.max(0, src[i * nc + c])) * 255); push(q); }
    else if (/JOINTS/.test(k)) { const q = new Uint8Array(src.length); for (let i = 0; i < src.length; i++) q[i] = src[i]; push(q); }
    else if (/WEIGHTS/.test(k)) { const q = new Uint8Array(src.length); for (let i = 0; i < src.length; i++) q[i] = Math.round(src[i] * 255); push(q); }
    else push(src);
  }
  for (const m of j.meshes) for (const p of m.primitives) if (p.indices !== undefined && !seen.has('i' + p.indices)) { seen.add('i' + p.indices); push(read(p.indices)); }
  (j.animations || []).forEach((an) => an.samplers.forEach((s) => { for (const ai of [s.input, s.output]) if (!seen.has('a' + ai)) { seen.add('a' + ai); push(read(ai)); } }));
  const q = Buffer.concat(chunks); const gz = zlib.gzipSync(b, { level: 9 }).length, qgz = zlib.gzipSync(q, { level: 9 }).length + jl / 5; // JSON 以 1/5 gzip 粗估
  totRaw += b.length; totGz += gz; totQ += q.length + jl; totQgz += qgz; rows.push([f, b.length, gz, q.length + jl, Math.round(qgz)]);
}
console.log('file\traw\tgz\tquantRaw\tquantGz(est)'); rows.forEach((r) => console.log(r.join('\t'))); console.log(['TOTAL', totRaw, totGz, totQ, Math.round(totQgz)].join('\t'), '| gz ratio', (totQgz / totGz).toFixed(2));

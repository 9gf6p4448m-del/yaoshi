import fs from 'node:fs'; import zlib from 'node:zlib';
const dir = 'assets/creatures/'; const rows = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.glb'))) {
  const b = fs.readFileSync(dir + f); const jl = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20 + jl).toString());
  const bytes = { img: 0, pos: 0, norm: 0, uv: 0, color: 0, skin: 0, idx: 0, anim: 0, other: 0 };
  const acc = j.accessors || [], bv = j.bufferViews || [];
  const bvUse = new Map();
  (j.images || []).forEach((im) => { if (im.bufferView !== undefined) bvUse.set(im.bufferView, 'img'); });
  (j.meshes || []).forEach((m) => m.primitives.forEach((p) => { for (const [k, a] of Object.entries(p.attributes)) bvUse.set(acc[a].bufferView, k === 'POSITION' ? 'pos' : k === 'NORMAL' ? 'norm' : /TEXCOORD/.test(k) ? 'uv' : /COLOR/.test(k) ? 'color' : /JOINTS|WEIGHTS/.test(k) ? 'skin' : 'other'); if (p.indices !== undefined) bvUse.set(acc[p.indices].bufferView, 'idx'); }));
  (j.animations || []).forEach((an) => an.samplers.forEach((s) => { bvUse.set(acc[s.input].bufferView, 'anim'); bvUse.set(acc[s.output].bufferView, 'anim'); }));
  (j.skins || []).forEach((s) => { if (s.inverseBindMatrices !== undefined) bvUse.set(acc[s.inverseBindMatrices].bufferView, 'skin'); });
  bv.forEach((v, i) => { bytes[bvUse.get(i) || 'other'] += v.byteLength; });
  let tris = 0, verts = 0; (j.meshes || []).forEach((m) => m.primitives.forEach((p) => { verts += acc[p.attributes.POSITION].count; if (p.indices !== undefined) tris += acc[p.indices].count / 3; }));
  rows.push({ f, raw: b.length, gz: zlib.gzipSync(b, { level: 9 }).length, tris, verts, imgs: (j.images || []).length, anims: (j.animations || []).length, ext: (j.extensionsUsed || []).join('|'), ...bytes });
}
rows.sort((a, b) => b.raw - a.raw);
const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
console.log('file\traw\tgz\ttris\timgB\tposB\tnormB\tuvB\tcolorB\tskinB\tidxB\tanimB\totherB\timgs\text');
for (const r of rows) console.log([r.f, r.raw, r.gz, r.tris, r.img, r.pos, r.norm, r.uv, r.color, r.skin, r.idx, r.anim, r.other, r.imgs, r.ext].join('\t'));
console.log(['TOTAL', sum('raw'), sum('gz'), sum('tris'), sum('img'), sum('pos'), sum('norm'), sum('uv'), sum('color'), sum('skin'), sum('idx'), sum('anim'), sum('other')].join('\t'));

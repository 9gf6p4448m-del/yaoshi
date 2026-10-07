// 條件 7d 靜態掃描：擺盪更新路徑（hand-b3.js createSwing 內的 write／flush／reset／update，table-hands.js swingStep）內有沒有 new THREE.*／BufferGeometry 建構／任何 new。
import fs from 'node:fs';
const b3 = fs.readFileSync('js/hand-b3.js', 'utf8'), th = fs.readFileSync('js/table-hands.js', 'utf8');
const cs = b3.slice(b3.indexOf('export function createSwing'));
const pre = cs.slice(0, cs.indexOf('function write(')), path = cs.slice(cs.indexOf('function write('));
const sw = th.slice(th.indexOf('function swingStep('), th.indexOf('const api = {'));
const hits = (name, src) => [...src.matchAll(/new\s+[\w.]+|BufferGeometry|\.clone\(\)|Float(32|64)Array\(|\[\s*\]|\{\s*\}/g)].map((m) => ({ where: name, match: m[0], line: src.slice(0, m.index).split('\n').length }));
const out = { updatePathLines: path.split('\n').length, swingStepLines: sw.split('\n').length,
  updatePathHits: hits('createSwing 更新路徑', path), swingStepHits: hits('table-hands swingStep', sw),
  preallocOnce: hits('createSwing 建構段（setSeats 時一次）', pre).map((h) => h.match) };
console.log(JSON.stringify(out, null, 1));

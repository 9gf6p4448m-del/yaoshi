import fs from 'node:fs';
import * as X from '../../../../tests/tools/l1e-x-local-subgame.mjs';
const buf = fs.readFileSync('scratchpad/x-local-subgame/control-winnerPaysZero.bin');
const T = X.TOTAL_COMBOS * 4; let o = 0;
const take = (C, n) => { const a = new C(buf.buffer.slice(buf.byteOffset + o, buf.byteOffset + o + n * C.BYTES_PER_ELEMENT)); o += n * C.BYTES_PER_ELEMENT; return a; };
const open = { deltas: take(Int16Array, T), wins: take(Uint8Array, T) };
const values = { x: 5.7362204724409445, y: 5.566978193146418 };
// independent brute force via decodeCode, over-all (player, option) min max-regret, multiplier 1
const L = X.OPTION_LABELS, n = L.length;
let best = null;
for (let i = 0; i < 4; i++) {
  const reg = new Array(n).fill(-Infinity);
  for (let code = 0; code < X.TOTAL_COMBOS; code++) {
    const idx = X.decodeCode(code); if (idx[i] !== 0) continue;
    const u = L.map((_, a) => { const c = [...idx]; c[i] = a; const cc = c.reduce((s, v, k) => s + v * n ** k, 0); return X.payoffAt(open, cc, values, 1)[i]; });
    const m = Math.max(...u); u.forEach((v, a) => { if (m - v > reg[a]) reg[a] = m - v; });
  }
  reg.forEach((r, a) => { if (!best || r < best.r) best = { i, opt: L[a], r }; });
}
console.log('brute-force open min max-regret x1.0', best);

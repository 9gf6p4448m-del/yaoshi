/* v0.60.0 驗收 #5 後半：擺錢（push／slam／rake／hold）行為與 155a7e7f 逐幀相等。
   node tests/tools/grab-legacy-eq.mjs [--base=<基準樹>]
   走真的 table-props＋table-hands＋hand-motion（node 版 three，tests/hand-fixture.mjs），四格 × {四席出價（含同席多格排隊）→ 四席盯上 → 開標}，
   1/120 秒步進，逐幀記下四隻手的可見性、holder 位置／朝向／縮放與每根骨的四元數（toFixed(9)），
   新樹一份、基準樹一份（子行程以 YAOSHI_MOTION_PATH／YAOSHI_PROPS_PATH／YAOSHI_HANDS_PATH 換成基準檔，同一支治具），逐位元組比。
   活性：記錄裡必須真的出現 push／slam／rake／hold 四種動作、且可見手幀數 > 0（共同卡死也會「相等」）。 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }

if (opt.child) {
  const { THREE, loadProps, loadHands, LAYOUTS } = await import('../hand-fixture.mjs');
  const { createTableProps } = await loadProps();
  const { createTableHands } = await loadHands();
  const DT = 1 / 120, rows = [], kinds = new Set(); let visFrames = 0;
  for (let slot = 0; slot < 4; slot++) {
    const parent = new THREE.Group();
    const props = createTableProps(parent, { handPaths: true });
    props.setLayout(...LAYOUTS.L);
    props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
    const hands = createTableHands(parent, props); await hands.ready(); hands.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
    const ev = { bid: (s, k, a) => { props.bid(s, k, a); hands.bid(s, k, a); }, mark: (s, k) => { props.mark(s, k); hands.mark(s, k); }, reveal: (k, w) => { props.reveal(k, w); hands.reveal(k, w); } };
    const rec = (tag) => {
      props.update(DT); hands.update(DT); parent.updateMatrixWorld(true);
      const st = hands.stats().state; st.forEach((x) => x && kinds.add(x.kind));
      const fr = hands.group.children.map((h) => {
        if (!h.visible) return 0; visFrames++;
        let mesh = null; h.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
        return [h.position.toArray(), [h.rotation.x, h.rotation.y, h.rotation.z], h.scale.x, mesh.skeleton.bones.map((b) => b.quaternion.toArray())].flat(3).map((x) => +x.toFixed(9));
      });
      rows.push(tag + JSON.stringify([st, fr]));
    };
    for (let s = 0; s < 4; s++) ev.bid(s, slot, 3 + s);
    ev.bid(2, (slot + 1) % 4, 2); // 同席多格（排隊）
    for (let i = 0; i < 200; i++) rec('b' + slot);
    for (let s = 0; s < 4; s++) ev.mark(s, slot);
    for (let i = 0; i < 120; i++) rec('m' + slot);
    ev.reveal(slot, (slot + 1) % 4);
    for (let i = 0; i < 200; i++) rec('r' + slot);
    hands.dispose(); props.dispose();
  }
  const txt = rows.join('\n');
  console.log(JSON.stringify({ frames: rows.length, visibleHandFrames: visFrames, kinds: [...kinds].sort(), sha256: crypto.createHash('sha256').update(txt).digest('hex'), bytes: txt.length }));
  process.exit(0);
}

const BASE = path.resolve(opt.base || path.join(HERE, '..', 'grab-base'));
const run = (env) => JSON.parse(execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--child'], { cwd: HERE, env: Object.assign({}, process.env, env), maxBuffer: 1 << 26 }).toString().trim().split('\n').pop());
const head = run({});
const base = run({ YAOSHI_MOTION_PATH: path.join(BASE, 'js/hand-motion.js'), YAOSHI_PROPS_PATH: path.join(BASE, 'js/table-props.js'), YAOSHI_HANDS_PATH: path.join(BASE, 'js/table-hands.js') });
const live = ['hold', 'push', 'rake', 'slam'].every((k) => head.kinds.includes(k)) && head.visibleHandFrames > 0;
const out = { base: BASE, head, baseRun: base, equal: head.sha256 === base.sha256 && head.bytes === base.bytes, live, pass: head.sha256 === base.sha256 && live };
console.log(JSON.stringify(out));
process.exit(out.pass ? 0 : 1);

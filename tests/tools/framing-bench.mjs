/* A1 取景鏈微基準（2026-09-17）：真實 yinyangcoin GLB ＋ 每顆本體一顆同 geometry／skeleton／bindMatrix
 * 的描邊外殼（照 js/creature-figures.js:609-625 的掛法）＋ 32 枚印籌 InstancedMesh，固定動畫時序，
 * 對 fitSubject 連跑 FRAMES 幀 × ROUNDS 輪。輸出每輪 µs/call、每幀 Box3.applyMatrix4 次數，以及
 * 全部取景結果（retreat／shift／bounds）的 SHA-256——修補前後 hash 必須相等，才算純成本改動。
 * 跑法：node tests/tools/framing-bench.mjs [--frames=600] [--rounds=5] [--json]
 * 這是 Node＋tools/anyCreature 的 Three（0.180）上的 CPU 成本量測，不是瀏覽器 0.158 的 fps 證據。 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import * as THREE from '../../tools/anyCreature/node_modules/three/build/three.module.js';
import { GLTFLoader } from '../../tools/anyCreature/node_modules/three/examples/jsm/loaders/GLTFLoader.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? Number(a.slice(k.length + 3)) : d; };
const FRAMES = arg('frames', 600), ROUNDS = arg('rounds', 5), JSON_OUT = process.argv.includes('--json');
const DT = 1 / 60, W = 844, H = 390;
// `--framing=<path>`：改量另一份 table-framing.js（例如 git show <sha>:js/table-framing.js 存出的修補前版本），
// 讓修補前後能在同一台機器交錯量測；預設量 js/table-framing.js。
const framingArg = process.argv.find(x => x.startsWith('--framing='));
const FRAMING = framingArg ? path.resolve(framingArg.slice(10)) : path.join(ROOT, 'js/table-framing.js');

const source = fs.readFileSync(FRAMING, 'utf8');
const { fitSubject } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const bytes = await fs.promises.readFile(path.join(ROOT, 'assets/creatures/yinyangcoin.glb'));
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const model = gltf.scene;
const bodies = []; model.traverse(o => { if (o.isSkinnedMesh) bodies.push(o); });
for (const o of bodies) { // 同 creature-figures：外殼是本體的子節點，attached bind 逐幀等於本體
  const sh = new THREE.SkinnedMesh(o.geometry, new THREE.MeshBasicMaterial());
  sh.bindMode = o.bindMode; sh.bind(o.skeleton, o.bindMatrix); sh.name = 'outline'; o.add(sh);
}
const group = new THREE.Group(); group.scale.setScalar(.7); group.position.set(-.45, .152 + .06, 0); group.add(model);
const stamps = new THREE.InstancedMesh(new THREE.BoxGeometry(.15, .05, .19), new THREE.MeshBasicMaterial(), 32);
for (let i = 0; i < 32; i++) stamps.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-.9 + (i % 8) * .26, .175, -.35 + Math.floor(i / 8) * .23));
stamps.name = 'prop-tokens';
const scene = new THREE.Scene(); scene.add(group, stamps);
const camera = new THREE.PerspectiveCamera(42, W / H, .05, 60);
const shot = new THREE.Vector3(0, 1.05, 1.65);
camera.position.copy(shot); camera.lookAt(0, .15, 0); camera.updateMatrixWorld(true);
const area = { left: 6, top: 64, right: W - 6, bottom: H - 40 };
const obstacles = [{ left: 120, top: 0, right: W - 120, bottom: 64 }];
const mixer = new THREE.AnimationMixer(model);
const clip = gltf.animations[0]; if (clip) mixer.clipAction(clip).play();
scene.updateMatrixWorld(true);

let boxTransforms = 0;
const origApply = THREE.Box3.prototype.applyMatrix4;
THREE.Box3.prototype.applyMatrix4 = function (m) { boxTransforms++; return origApply.call(this, m); };

const rounds = [];
for (let r = 0; r < ROUNDS; r++) {
  mixer.setTime(0); let spin = 0, elapsed = 0, boxes = 0; const hash = crypto.createHash('sha256'); let fits = 0;
  for (let f = 0; f < FRAMES; f++) {
    mixer.update(DT); spin += .6 * DT; group.rotation.y = spin;
    camera.position.copy(shot); camera.clearViewOffset(); camera.updateMatrixWorld(true);
    const before = boxTransforms, t0 = performance.now();
    const fit = fitSubject([group, stamps], camera, area, obstacles, W, H);
    elapsed += performance.now() - t0; boxes += boxTransforms - before;
    if (!fit?.fit) throw new Error(`frame ${f}: framing failed (${fit?.reason})`);
    fits++;
    hash.update(JSON.stringify([fit.retreat, fit.shift.x, fit.shift.y, fit.bounds.left, fit.bounds.top, fit.bounds.right, fit.bounds.bottom]));
  }
  rounds.push({ round: r + 1, frames: fits, usPerCall: +(elapsed * 1000 / fits).toFixed(2), boxTransformsPerFrame: +(boxes / fits).toFixed(2), hash: hash.digest('hex') });
}
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const out = {
  tool: 'tests/tools/framing-bench.mjs', framing: path.relative(ROOT, FRAMING).replaceAll('\\', '/'), asset: 'assets/creatures/yinyangcoin.glb', three: THREE.REVISION,
  node: process.version, skinnedBodies: bodies.length, outlineShells: bodies.length, stamps: 32, frames: FRAMES, rounds: ROUNDS,
  usPerCallMedian: +median(rounds.map(x => x.usPerCall)).toFixed(2), boxTransformsPerFrame: rounds[0].boxTransformsPerFrame,
  hashesEqual: rounds.every(x => x.hash === rounds[0].hash), hash: rounds[0].hash, rounds,
};
console.log(JSON_OUT ? JSON.stringify(out) : JSON.stringify(out, null, 2));

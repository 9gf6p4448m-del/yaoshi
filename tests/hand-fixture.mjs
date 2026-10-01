// 席位之手測試共用治具（不是測試檔；檔名不以 .test.mjs 結尾，node --test 不會單獨跑它）。
// 用專案既有的 three 0.180（tools/anyCreature，同 mark-token-scale／skeleton-share 兩支測試）載入：
//   ① 真的 assets/creatures/hand_r.glb（GLTFLoader.parseAsync）→ hand-motion.buildRig 要的原始陣列
//   ② 真的 js/table-props.js（data URL 換掉 three 與相對 import，同 mark-token-scale 的做法）
//   ③ 真的 js/table-hands.js（creature-figures.js 換成同一條管線的 node 版：GLTFLoader＋SkeletonUtils.clone＋真的 shareSkeletons）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const threeURL = pathToFileURL(path.join(ROOT, 'tools/anyCreature/node_modules/three/build/three.module.js')).href;
const jsm = (p) => pathToFileURL(path.join(ROOT, 'tools/anyCreature/node_modules/three/examples/jsm', p)).href;
export const THREE = await import(threeURL);
const { GLTFLoader } = await import(jsm('loaders/GLTFLoader.js'));
const { clone: cloneSkinned } = await import(jsm('utils/SkeletonUtils.js'));

const asModule = (src) => 'data:text/javascript;base64,' + Buffer.from(src).toString('base64');
const read = (name) => fs.readFileSync(path.join(ROOT, 'js', name), 'utf8').replace("from 'three'", `from '${threeURL}'`);

/* 突變驗紅：YAOSHI_MOTION_PATH／YAOSHI_PROPS_PATH／YAOSHI_HANDS_PATH 指向暫存的突變體副本；原檔不動。 */
export const motionURL = pathToFileURL(process.env.YAOSHI_MOTION_PATH || path.join(ROOT, 'js/hand-motion.js')).href;
export const M = await import(motionURL);

let gltfP = null;
export function loadHandGltf() {
  if (!gltfP) {
    const bytes = fs.readFileSync(path.join(ROOT, M.HAND.GLB));
    gltfP = new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  }
  return gltfP;
}
export async function handRigSource() {
  const g = await loadHandGltf();
  let mesh = null; g.scene.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
  const bones = mesh.skeleton.bones, a = mesh.geometry.attributes;
  return { mesh, src: { names: bones.map((b) => b.name), parents: bones.map((b) => bones.indexOf(b.parent)), rest: bones.map((b) => b.position.toArray()),
    positions: a.position.array, skinIndex: a.skinIndex.array, skinWeight: a.skinWeight.array } };
}

/** 真的 table-props（可由環境變數換成突變體路徑，供突變驗紅）。 */
export async function loadProps() {
  const sceneURL = asModule(read('scene-env.js'));
  const relicURL = asModule(read('relic-motion.js'));
  const src = process.env.YAOSHI_PROPS_PATH ? fs.readFileSync(process.env.YAOSHI_PROPS_PATH, 'utf8').replace("from 'three'", `from '${threeURL}'`) : read('table-props.js');
  return import(asModule(src.replace("import('./scene-env.js' + V)", `import('${sceneURL}')`).replace("import('./relic-motion.js' + V)", `import('${relicURL}')`)));
}

/** 真的 table-hands（creature-figures 換成 node 版管線：同一份快取語意、真的 shareSkeletons）。 */
export async function loadHands() {
  const shareURL = pathToFileURL(path.join(ROOT, 'js/skeleton-share.js')).href;
  const stub = `import { clone } from '${jsm('utils/SkeletonUtils.js')}';
import { shareSkeletons } from '${shareURL}';
export const fetched = [];
const cache = new Map();
export function cloneSkinnedGlb(url) {
  if (!cache.has(url)) { fetched.push(url); cache.set(url, globalThis.__handGltf); }
  return cache.get(url).then((g) => { const model = clone(g.scene); return { model, shared: shareSkeletons(model) }; });
}`;
  globalThis.__handGltf = loadHandGltf();
  const stubURL = asModule(stub);
  const src = process.env.YAOSHI_HANDS_PATH ? fs.readFileSync(process.env.YAOSHI_HANDS_PATH, 'utf8').replace("from 'three'", `from '${threeURL}'`) : read('table-hands.js');
  const mod = await import(asModule(src.replace("import('./creature-figures.js' + V)", `import('${stubURL}')`).replace("import('./hand-motion.js' + V)", `import('${motionURL}')`)));
  const stubMod = await import(stubURL);
  return { ...mod, fetched: stubMod.fetched };
}

/** 兩套版面：與 table-tray 的 relayout 傳給 props.setLayout 的同一組值（TRAY.XS／Y／Z／SCALE 與 TRAY.P.*）。 */
export const LAYOUTS = {
  L: ['L', [-1.35, -0.45, 0.45, 1.35], 0.152, 0.10, 0.70],
  P: ['P', [-0.50, -0.167, 0.167, 0.50], 0.152, 0.06, 0.40],
};

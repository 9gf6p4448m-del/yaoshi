// v0.61.0 驗收用 node 載入器（不是測試檔）：照 tests/hand-fixture.mjs 的 loadHands 做法，另把 table-hands.js 裡的
// import('./hand-b1.js' + V) 換成 data: 模組（hand-b1.js 自己的 hand-motion／hand-realism／three 也換成同一份實例）。
// tests/hand-fixture.mjs 沒換這一條 ⇒ node 測試裡批 1 模組載不到、四角色退回預設手（stats().b1Error 有原因）；
// 本載入器讓 node 也走到批 1 的真實鏈路（真的 hand_r.glb、真的 table-props／table-hands／hand-motion／hand-realism／hand-b1）。
// 用法：const { loadHandsB1, loadB1 } = await import('./b1-node.mjs');  ROOT 預設＝本檔往上四層（工作樹根）；可設 YAOSHI_ROOT。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = process.env.YAOSHI_ROOT ? path.resolve(process.env.YAOSHI_ROOT) : path.resolve(HERE, '../../../..');
const F = await import(pathToFileURL(path.join(ROOT, 'tests/hand-fixture.mjs')).href);
export { F };
const asModule = (src) => 'data:text/javascript;base64,' + Buffer.from(src).toString('base64');
const read = (name) => fs.readFileSync(path.join(ROOT, 'js', name), 'utf8').replace("from 'three'", `from '${F.threeURL}'`);
const jsm = (p) => pathToFileURL(path.join(ROOT, 'tools/anyCreature/node_modules/three/examples/jsm', p)).href;

export const realismURL = asModule(read('hand-realism.js'));
export const b1URL = fs.existsSync(path.join(ROOT, 'js/hand-b1.js'))
  ? asModule(read('hand-b1.js').replace("const V = new URL(import.meta.url).search;", "const V = '';").replace("import('./hand-motion.js' + V)", `import('${F.motionURL}')`).replace("import('./hand-realism.js' + V)", `import('${realismURL}')`))
  : null;

/** 批 1 模組本身（同一份 hand-motion／hand-realism 實例）。基準樹沒有這支 ⇒ null。 */
export async function loadB1() { return b1URL ? import(b1URL) : null; }
export async function loadRealismB1() { return import(realismURL); }

/** 真的 table-hands（同 hand-fixture.loadHands），另把批 1 的動態載入接上。 */
export async function loadHandsB1() {
  const shareURL = pathToFileURL(path.join(ROOT, 'js/skeleton-share.js')).href;
  const stub = `import { clone } from '${jsm('utils/SkeletonUtils.js')}';
import { shareSkeletons } from '${shareURL}';
export const fetched = [];
const cache = new Map();
export function cloneSkinnedGlb(url) {
  if (!cache.has(url)) { fetched.push(url); cache.set(url, globalThis.__handGltf); }
  return cache.get(url).then((g) => { const model = clone(g.scene); return { model, shared: shareSkeletons(model) }; });
}`;
  globalThis.__handGltf = F.loadHandGltf();
  const stubURL = asModule(stub);
  let src = read('table-hands.js').replace("import('./creature-figures.js' + V)", `import('${stubURL}')`).replace("import('./hand-motion.js' + V)", `import('${F.motionURL}')`).replace("import('./hand-realism.js' + V)", `import('${realismURL}')`);
  if (b1URL) src = src.replace("import('./hand-b1.js' + V)", `import('${b1URL}')`);
  return import(asModule(src));
}

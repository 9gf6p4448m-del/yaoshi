/* Node 測試用的 ESM resolve hook：把遊戲模組裡的裸 specifier `three`／`three/addons/*` 對到
 * tools/anyCreature 的 three 副本（0.180，只做建構與旗標斷言，不拿它的渲染結果當 0.158 的證據）。
 * 用法：在測試檔 `register('./tools/three-node-resolver.mjs', import.meta.url)` 之後再動態 import 遊戲模組。 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const THREE_DIR = path.resolve(fileURLToPath(new URL('../../tools/anyCreature/node_modules/three', import.meta.url)));

export function resolve(specifier, context, next) {
  if (specifier === 'three') return { url: pathToFileURL(path.join(THREE_DIR, 'build/three.module.js')).href, shortCircuit: true };
  if (specifier.startsWith('three/addons/')) return { url: pathToFileURL(path.join(THREE_DIR, 'examples/jsm', specifier.slice('three/addons/'.length))).href, shortCircuit: true };
  return next(specifier, context);
}

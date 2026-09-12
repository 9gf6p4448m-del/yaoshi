/* 驗收 1 的第二半：證明四支 `_v054`／`_v054short` 的**函式本體**與 6a839de 的對應函式逐位元組相同。
 *
 * 為什麼要另寫這一支：`tests/tools/fn-hash.mjs` 的 md5 **含函式標頭那一行**，而本批刻意把名字改成
 * `eliteSelfCut_v054`（不改名就會與同檔的 0.55 同名函式撞在一起），標頭一變 md5 就一定不同。
 * 所以這裡把 WORKTREE 檔的 V054／V054_SHORT 兩段**在記憶體裡還原成 0.54 的形狀**
 * （`export const V054 = {` → `export default {`、`export const V054_SHORT = {` → `export const SHORT = {`、
 *  方法名去掉 `_v054`／`_v054short` 後綴），再交給 fn-hash 的 `splitFns()` 算同一套 md5。
 * 切塊與雜湊用的都是 fn-hash 那一支，本檔只負責「把名字換回去」。原檔全程唯讀。
 *
 * 跑法：node docs/experiments/2026-09-12-fxvocab-switch-evidence/body-md5.mjs
 * 出口碼：四支（＝8 個區塊）全部相同 → 0；有任何一支不同 → 1。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { splitFns } from '../../../tests/tools/fn-hash.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const BASE = '6a839de';
const FILES = { 'zuling.js': ['eliteSelfCut'], 'xianghuo.js': ['wardImmuneLost', 'biteGamble'], 'yinqi.js': ['hauntLost'] };

/** 只留 V054／V054_SHORT 兩段，並把名字還原成 0.54 的形狀 */
function v054AsBaseShape(txt) {
  const i = txt.indexOf('export const V054 = {');
  if (i < 0) throw new Error('這個檔沒有 V054 區塊');
  return txt.slice(i)
    .replace(/^export const V054 = \{/m, 'export default {')
    .replace(/^export const V054_SHORT = \{/m, 'export const SHORT = {')
    .replace(/^ {2}([A-Za-z0-9_]+)_v054short\(st\) \{/gm, '  $1(st) {')
    .replace(/^ {2}([A-Za-z0-9_]+)_v054\(st\) \{/gm, '  $1(st) {');
}

let same = 0;
const bad = [];
for (const [f, ids] of Object.entries(FILES)) {
  const rel = 'js/trait-fx/' + f;
  const base = splitFns(execSync(`git show ${BASE}:${rel}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }));
  const work = splitFns(v054AsBaseShape(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
  for (const id of ids) {
    for (const blk of ['MOVES:' + id, 'SHORT:' + id]) {
      const a = base[blk], b = work[blk];
      const ok = a !== undefined && a === b;
      console.log(`  ${ok ? 'SAME' : 'DIFF'}  ${rel.padEnd(24)} ${blk.padEnd(26)} ${BASE}=${a} v054=${b}`);
      if (ok) same++; else bad.push(`${rel} ${blk}`);
    }
  }
}
console.log(`\n相同 ${same} ／ 不同 ${bad.length}（預期 8 ／ 0）`);
process.exit(bad.length ? 1 : 0);

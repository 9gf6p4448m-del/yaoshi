// 逐函式 md5 比對（v0.55 招式可辨性卷，覆審 r1 LOW3）。
//   node tests/tools/fn-hash.mjs <舊 ref 或 "WORKTREE"> <新 ref 或 "WORKTREE"> [檔案...]
//   例：node tests/tools/fn-hash.mjs 6a839de WORKTREE
//       node tests/tools/fn-hash.mjs abe2f69 WORKTREE js/trait-fx/zuling.js
//
// 為什麼要有它（L11「範圍」的驗法）：`git diff --stat` 只證明「哪幾個檔被動過」，
// grep 函式標頭只證明「函式名沒變」——兩者都**驗不到函式體**。
// 純演出卷的宣稱是「只動了四支示範招，另外 23 支一個位元組都沒動」，那是逐函式的宣稱，
// 就要逐函式驗：把三個系別檔切成 `MOVES:<trId>` / `SHORT:<trId>` 兩組區塊，各自算 md5。
//
// ★換行正規化★：git blob 一律是 LF，Windows 工作樹 checkout 可能是 CRLF（core.autocrlf=true），
// 不正規化的話每一支函式都會「變動」。所以比對前一律把 CRLF 收成 LF——比的是 git 看到的內容。
//
// 出口碼：有任何函式變動／新增／消失就 exit 1（給 CI 用）；--allow=a,b,c 可以明列預期會變的那幾支
// （回報裡仍然逐支印出來，不是靜默放行）。
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const DEFAULT_FILES = ['js/trait-fx/zuling.js', 'js/trait-fx/xianghuo.js', 'js/trait-fx/yinqi.js'];

/** 把一個系別檔切成「每支編舞函式一段原始碼」，回 {`MOVES:trId` → md5} */
export function splitFns(txt) {
  const lines = txt.replace(/\r\n/g, '\n').split('\n');
  const out = {};
  let block = null, cur = null, buf = [];
  const flush = () => {
    if (!cur) return;
    // 切掉函式尾之後的註解（那是下一支的檔頭，不算這一支的函式體）
    let end = buf.length - 1;
    while (end >= 0 && !/^ {2}\},?$/.test(buf[end])) end--;
    out[cur] = crypto.createHash('md5').update(buf.slice(0, end + 1).join('\n')).digest('hex').slice(0, 10);
    cur = null; buf = [];
  };
  for (const L of lines) {
    if (/^export default \{/.test(L) || /^const MOVES = \{/.test(L)) { flush(); block = 'MOVES'; continue; }
    if (/^export const SHORT = \{/.test(L)) { flush(); block = 'SHORT'; continue; }
    const m = L.match(/^ {2}([A-Za-z0-9_]+)\(st\) \{/);
    if (m) { flush(); cur = block + ':' + m[1]; buf = [L]; continue; }
    const al = L.match(/^ {2}([A-Za-z0-9_]+): MOVES\.([A-Za-z0-9_]+),/);
    if (al) { flush(); out[block + ':' + al[1]] = 'ALIAS->' + al[2]; continue; }
    if (cur) buf.push(L);
  }
  flush();
  return out;
}

function readAt(ref, file) {
  if (ref === 'WORKTREE') return fs.readFileSync(path.join(ROOT, file), 'utf8');
  return execSync(`git show ${ref}:${file}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
}

export function compare(oldRef, newRef, files = DEFAULT_FILES) {
  const changed = [], added = [], removed = [];
  let same = 0;
  for (const f of files) {
    const a = splitFns(readAt(oldRef, f));
    const b = splitFns(readAt(newRef, f));
    for (const k of Object.keys(a)) {
      if (!(k in b)) { removed.push(`${f} ${k}`); continue; }
      if (a[k] !== b[k]) changed.push(`${f} ${k}  ${a[k]} -> ${b[k]}`); else same++;
    }
    for (const k of Object.keys(b)) if (!(k in a)) added.push(`${f} ${k}`);
  }
  return { same, changed, added, removed, files };
}

function main() {
  const args = process.argv.slice(2).filter((x) => !x.startsWith('--'));
  const allowArg = process.argv.slice(2).find((x) => x.startsWith('--allow='));
  const allow = allowArg ? new Set(allowArg.slice(8).split(',')) : new Set();
  const oldRef = args[0], newRef = args[1] || 'WORKTREE';
  if (!oldRef) throw new Error('用法：node tests/tools/fn-hash.mjs <舊 ref> [新 ref|WORKTREE] [檔案...]');
  const files = args.length > 2 ? args.slice(2) : DEFAULT_FILES;
  const r = compare(oldRef, newRef, files);
  console.log(`逐函式 md5：${oldRef} → ${newRef}（${files.length} 檔）`);
  console.log(`未變動：${r.same} ／ 變動：${r.changed.length} ／ 新增：${r.added.length} ／ 消失：${r.removed.length}`);
  r.changed.forEach((x) => console.log('  CHANGED ' + x));
  r.added.forEach((x) => console.log('  ADDED   ' + x));
  r.removed.forEach((x) => console.log('  REMOVED ' + x));
  const unexpected = r.changed.filter((x) => !allow.has(x.split(' ')[1]))
    .concat(r.added.filter((x) => !allow.has(x.split(' ')[1])), r.removed.filter((x) => !allow.has(x.split(' ')[1])));
  if (allow.size) console.log(`--allow 明列 ${allow.size} 支；清單外的變動 ${unexpected.length} 支`);
  process.exit(unexpected.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

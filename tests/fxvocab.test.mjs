/* 招式特效語彙的單元測試（v0.55 招式可辨性卷，凍結檔 L12）。
   跑法：node tests/fxvocab.test.mjs

   它在守什麼：**文件寫了一套、`vocab.js` 是另一套**。這一卷整個的病因就是「語彙沒有單一事實來源」，
   所以 `docs/experiments/2026-09-11-fx-vocab.md`（人類讀的）與 `js/trait-fx/vocab.js`（程式讀的）
   必須逐項相同，不一致判紅。ART_BIBLE §10 是設計理由的權威，不進機械比對（它是散文）。

   ★鑑別力★：`--mutate=<n>` 會在記憶體裡把 `vocab.js` 的第 n 種東西改掉再跑，預期紅。
     1 = 改一個 EMBLEM_OF 的 kind（雙射被破壞＋與文件不符）
     2 = 改一個 FX_PAL 色碼
     3 = 改一個 BEAT 時窗
     4 = 在編舞檔裡塞回覆審 r2 實測的繞法（`const S = 0.56;` ＋ `setScalar(S * …)`）＝尺寸的第二份事實來源
         （r1 的第一版掃描只認 `const SZ|SIZE`，改個變數名就繞過，見 §「尺寸防線」那段註解）
   原檔全程唯讀（讀進字串後在記憶體裡改），不做反向 sed。

   為什麼不 import emblems.js：它 `import * as THREE from 'three'`，node 端沒有 importmap。
   所以徽記那一段改成**讀原始碼**數 kind 與頂點數——量的仍是同一份檔案。 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FX_PAL, BEAT_FRAC, beatOf, ICON, PHASE_GATE, EMBLEM_OF, DEPRECATED, RETIRED_BY_FAC } from '../js/trait-fx/vocab.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const DOC = path.join(ROOT, 'docs/experiments/2026-09-11-fx-vocab.md');
const EMB = path.join(ROOT, 'js/trait-fx/emblems.js');
const argv = process.argv.slice(2);
const MUT = (() => { const a = argv.find((x) => x.startsWith('--mutate=')); return a ? parseInt(a.slice(9), 10) : 0; })();

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('  PASS  ' + name); } catch (e) { fail++; console.log('  FAIL  ' + name + ' — ' + e.message); } };
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}：得到 ${JSON.stringify(a)}，預期 ${JSON.stringify(b)}`); };

/* 突變體：只動記憶體裡的副本 */
const PAL = JSON.parse(JSON.stringify(FX_PAL));
const BT = { 1: beatOf(1, 260), 2: beatOf(2, 900), 3: beatOf(3, 1400) }; // 三個總長來自文件第 2 節的「總長」欄，下面逐格比對
const EO = Object.assign({}, EMBLEM_OF);
if (MUT === 1) EO.eliteSelfCut = 'sun'; // 與 eliteOpenShot 撞 kind ⇒ 雙射破了
if (MUT === 2) PAL.xianghuo.key = 0xf08060; // 退回舊的淡橘粉
if (MUT === 3) BT[1].travel = [90, 200]; // 時窗與文件分岔
if (MUT) console.log(`★突變模式 ${MUT}：以下必須有紅★`);

const doc = fs.readFileSync(DOC, 'utf8');
const embSrc = fs.readFileSync(EMB, 'utf8');
console.log(`語彙對齊 L12：${path.relative(ROOT, DOC)} ↔ js/trait-fx/vocab.js ↔ js/trait-fx/emblems.js`);

/** 從文件裡撈出「以 | 開頭、欄位用 `` 包住」的表格列 */
function rows(startsWith) {
  return doc.split(/\r?\n/).filter((l) => l.startsWith('| `' + startsWith)).map((l) => l.split('|').map((c) => c.trim()).slice(1, -1));
}
function tick(s) { const m = String(s).match(/^`(.*)`$/); if (!m) throw new Error(`欄位沒有用 \` 包住：${s}`); return m[1]; }
const hex = (n) => '0x' + n.toString(16).padStart(6, '0');

/* ── 1. 色票（FX_PAL）────────────────────────────────────────────── */
t('FX_PAL 三系四色與文件第 1 節逐格相同', () => {
  const lines = rows('zuling`').concat(rows('xianghuo`'), rows('yinqi`'));
  eq(lines.length, 3, '文件第 1 節的列數');
  lines.forEach((r) => {
    const fac = tick(r[0]);
    const p = PAL[fac];
    if (!p) throw new Error(`vocab.js 沒有系別 ${fac}`);
    ['key', 'hot', 'line', 'ink'].forEach((k, i) => eq(hex(p[k]), tick(r[i + 1]), `${fac}.${k}`));
  });
  eq(Object.keys(PAL).sort().join(','), 'xianghuo,yinqi,zuling', 'FX_PAL 的系別集合');
});

/* ── 2. 節拍表（BEAT）───────────────────────────────────────────── */
t('BEAT 三級四段與文件第 2 節逐格相同', () => {
  const lines = [1, 2, 3].map((k) => { const r = rows(k + '`'); if (!r.length) throw new Error(`文件缺 tier ${k}`); return r[0]; });
  lines.forEach((r, i) => {
    const tier = i + 1;
    const b = BT[tier];
    ['windup', 'travel', 'react', 'settle'].forEach((seg, j) => eq(b[seg].join('-'), tick(r[j + 2]), `BEAT[${tier}].${seg}`));
    eq(String(b.settle[1]), r[1], `tier ${tier} 的總長`);
  });
});

t('BEAT_FRAC 是比例不是毫秒（三級各三個切點、遞增、都 <1）', () => {
  eq(Object.keys(BEAT_FRAC).sort().join(','), '1,2,3', 'BEAT_FRAC 的 tier 集合');
  for (const k of [1, 2, 3]) {
    const f = BEAT_FRAC[k];
    eq(f.length, 3, `tier ${k} 的切點數`);
    if (!(f[0] > 0 && f[0] < f[1] && f[1] < f[2] && f[2] < 1)) throw new Error(`tier ${k} 的切點不是遞增的 (0,1) 區間值：${f}`);
  }
  // 分岔防線：vocab.js 裡不得再出現任何三級時長的字面值（那是 PW_FX 的專屬）
  const src = fs.readFileSync(path.join(ROOT, 'js/trait-fx/vocab.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  for (const n of ['260', '900', '1400']) {
    if (new RegExp('\\b' + n + '\\b').test(src)) throw new Error(`vocab.js 出現招式時長字面值 ${n}（唯一來源是 index.html 的 PW_FX.TRAIT_MS_BY_TIER）`);
  }
});

/* ── 3. 因果三段門檻（PHASE_GATE）──────────────────────────────── */
t('PHASE_GATE 的六個數字都出現在文件第 3 節', () => {
  const sec = doc.slice(doc.indexOf('## 3.'), doc.indexOf('## 4.'));
  [PHASE_GATE.windupMs, PHASE_GATE.windupBone, PHASE_GATE.windupModel, PHASE_GATE.travelFrac, PHASE_GATE.reactMs, PHASE_GATE.reactDelta]
    .forEach((v) => { if (!sec.includes('`' + v + '`')) throw new Error(`文件第 3 節沒有 \`${v}\``); });
});

/* ── 4. 徽記對照表：雙射 ＋ 與文件逐列相同 ──────────────────────── */
t('EMBLEM_OF 是 trId ↔ kind 的雙射，30 對', () => {
  const ids = Object.keys(EO), kinds = Object.values(EO);
  eq(ids.length, 30, 'trId 數（27 支招＋三尊）');
  eq(new Set(kinds).size, 30, '相異 kind 數（有重複＝雙射破了）');
});
t('EMBLEM_OF 與文件第 4 節逐列相同（trId／系／kind）', () => {
  const lines = doc.split(/\r?\n/).filter((l) => /^\| `[A-Za-z0-9]+` \| /.test(l) && l.split('|').length === 6)
    .map((l) => l.split('|').map((c) => c.trim()).slice(1, -1))
    .filter((r) => /^`(zuling|xianghuo|yinqi)`$/.test(r[2]));
  eq(lines.length, 30, '文件第 4 節的列數');
  const seen = new Set();
  lines.forEach((r) => {
    const id = tick(r[0]), kind = tick(r[3]);
    if (seen.has(id)) throw new Error(`文件裡 ${id} 出現兩次`);
    seen.add(id);
    eq(EO[id], kind, `${id} 的 kind`);
  });
  Object.keys(EO).forEach((id) => { if (!seen.has(id)) throw new Error(`vocab.js 有 ${id}，文件第 4 節沒有`); });
});

/* ── 5. 剪影：kind 集合相同、頂點數 ≤24 ─────────────────────────── */
t('emblems.js 的 kind 集合等於 EMBLEM_OF 的 kind 集合', () => {
  const body = embSrc.slice(embSrc.indexOf('export const EMBLEM = {'), embSrc.indexOf('export const KINDS'));
  const keys = Array.from(body.matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)).map((m) => m[1]);
  const want = Object.values(EO).sort();
  eq(keys.slice().sort().join(','), want.join(','), 'kind 集合');
});
t('每個 kind 的外框頂點 ≤24（ART_BIBLE §10.2 第 3 條）', () => {
  const body = embSrc.slice(embSrc.indexOf('export const EMBLEM = {'), embSrc.indexOf('export const KINDS'));
  const bad = [];
  // 只查手寫成陣列字面值的那些（star()／jag()／poly() 產的在 emblemStats() 裡由治具查）
  for (const m of body.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*(?:\{\s*o:\s*)?\[([^\]]*)\]/gm)) {
    const n = m[2].split(',').filter((s) => s.trim() !== '').length / 2;
    if (n > 24) bad.push(`${m[1]}=${n}`);
    if (n < 3) bad.push(`${m[1]}=${n}（不足以構成多邊形）`);
  }
  if (bad.length) throw new Error('頂點數越界：' + bad.join(' '));
  // 文件第 4 節結尾寫死的那個上限也要對得上
  if (!doc.includes('≤ `24` 個外框頂點')) throw new Error('文件第 4 節的頂點上限字樣改了');
});

/* ── 6. ICON 與退役清單 ────────────────────────────────────────── */
t('ICON 四個欄位與文件第 5 節相同', () => {
  const sec = doc.slice(doc.indexOf('## 5.'), doc.indexOf('## 6.'));
  ['size', 'outlineW', 'billboardTiltDeg', 'markSize'].forEach((k) => {
    if (!sec.includes('| `' + k + '` | `' + ICON[k] + '` |')) throw new Error(`文件第 5 節的 ${k} 不是 ${ICON[k]}`);
  });
});
t('ICON.sizeOf／flatSizeOf 是尺寸的單一事實來源（byKind 覆寫、其餘回預設）', () => {
  if (typeof ICON.sizeOf !== 'function' || typeof ICON.flatSizeOf !== 'function') throw new Error('ICON 少了 sizeOf／flatSizeOf');
  // 沒有覆寫的 kind 一律回預設；有覆寫的回表裡的值（表本身的值不在這裡釘死——那是設計參數，L3 在量它）
  eq(ICON.sizeOf('claw'), ICON.size, '沒有覆寫的 kind 應回 ICON.size');
  eq(ICON.flatSizeOf('claw'), ICON.size, '沒有 flat 覆寫的 kind 應回 sizeOf');
  Object.keys(ICON.byKind).forEach((k) => {
    if (!Object.values(EO).includes(k)) throw new Error(`ICON.byKind 有未知 kind ${k}（不在 EMBLEM_OF 裡）`);
    eq(ICON.sizeOf(k), ICON.byKind[k], `sizeOf(${k})`);
  });
  Object.keys(ICON.flatByKind).forEach((k) => {
    if (!Object.values(EO).includes(k)) throw new Error(`ICON.flatByKind 有未知 kind ${k}（不在 EMBLEM_OF 裡）`);
    eq(ICON.flatSizeOf(k), ICON.flatByKind[k], `flatSizeOf(${k})`);
  });
});
t('ICON.markSizeOf 是印記尺寸的單一事實來源，且與文件第 5 節的 markByKind 表逐列相同', () => {
  if (typeof ICON.markSizeOf !== 'function') throw new Error('ICON 少了 markSizeOf（印記尺寸還是第二條路＝覆審 r2 N7）');
  eq(ICON.markSizeOf('claw'), ICON.markSize, '沒有覆寫的 kind 應回 ICON.markSize');
  const MARK_H = '**逐 kind 的印記覆寫（`ICON.markByKind`）**';
  if (doc.indexOf(MARK_H) < 0) throw new Error('文件第 5 節少了 markByKind 那一段的標題');
  const sec = doc.slice(doc.indexOf(MARK_H), doc.indexOf('## 6.'));
  // | `kind` | `印記` | 說明 |（三欄；byKind 那張表是四欄，不會混到）
  const lines = sec.split(/\r?\n/).filter((l) => /^\| `[a-z0-9]+` \| `[\d.]+` \| /.test(l) && l.split('|').length === 5)
    .map((l) => l.split('|').map((c) => c.trim()).slice(1, -1));
  eq(lines.length, Object.keys(ICON.markByKind).length, '文件第 5 節 markByKind 表的列數');
  lines.forEach((r) => {
    const kind = tick(r[0]);
    if (!Object.values(EO).includes(kind)) throw new Error(`ICON.markByKind 有未知 kind ${kind}（不在 EMBLEM_OF 裡）`);
    if (ICON.markByKind[kind] === undefined) throw new Error(`文件有 markByKind.${kind}，vocab.js 沒有`);
    eq(String(ICON.markByKind[kind]), tick(r[1]), `markByKind.${kind}`);
    eq(ICON.markSizeOf(kind), ICON.markByKind[kind], `markSizeOf(${kind})`);
  });
});
t('ICON.byKind／flatByKind 與文件第 5 節的覆寫表逐列相同', () => {
  const sec = doc.slice(doc.indexOf('## 5.'), doc.indexOf('## 6.'));
  // | `kind` | `本體` | `貼桌` | 說明 |（貼桌那欄是 — 代表沒有覆寫）
  const lines = sec.split(/\r?\n/).filter((l) => /^\| `[a-z0-9]+` \| `[\d.]+` \| /.test(l) && l.split('|').length === 6)
    .map((l) => l.split('|').map((c) => c.trim()).slice(1, -1));
  eq(lines.length, Object.keys(ICON.byKind).length, '文件第 5 節覆寫表的列數');
  const seen = new Set();
  lines.forEach((r) => {
    const kind = tick(r[0]);
    seen.add(kind);
    if (ICON.byKind[kind] === undefined) throw new Error(`文件有 ${kind}，ICON.byKind 沒有`);
    eq(String(ICON.byKind[kind]), tick(r[1]), `byKind.${kind}`);
    const flat = r[2] === '—' ? undefined : tick(r[2]);
    eq(ICON.flatByKind[kind] === undefined ? undefined : String(ICON.flatByKind[kind]), flat, `flatByKind.${kind}`);
  });
  Object.keys(ICON.byKind).forEach((k) => { if (!seen.has(k)) throw new Error(`ICON.byKind 有 ${k}，文件第 5 節沒有`); });
  Object.keys(ICON.flatByKind).forEach((k) => { if (!seen.has(k)) throw new Error(`ICON.flatByKind 有 ${k}，文件第 5 節沒有`); });
});
/* ★尺寸防線：按「危險的效果」寫（覆審 r1 C1 → r2 N1／N7 → ★r3 N11 改成收斂★、`02 §6.1` 第 7 條）★

   危險的**效果**＝「徽記的實際世界尺寸出現第二份來源」——只要它成立，凍結檔 L3 指名的突變
   （`ICON._resolve()` 改 0.02）對那支招就完全打不到，綠燈與待驗行為脫鉤（r1 C1 的「恆綠儀式」）。

   ★沿革（為什麼這一段被改寫三次）★
   r1：按已知入口寫（只認 `size: <數字>` 與 `const SZ|SIZE = <數字>`）→ 改個變數名就繞過。
   r2：改成「徽記 mesh 的縮放引數必須引用 `st.iconSize`／`ICON.*`」→ 仍按**已知語法形狀**寫，
       r3 實測四條繞法（別名／`multiplyScalar`／`scale.x=`／子節點與索引取用）一律 `continue` 靜默跳過，
       而且它們是**加行**不是改行，活性下限 `emblemScale < 5` 也不會響。
   r3（本段）：**首選收斂，不是補涵蓋**（`02 §6.1` 第 7 條的優先序）——
       `js/trait-fx.js` 的 `lockIconScale()` 在**執行期**把徽記 mesh 的 `scale`（x／y／z 三個 accessor）
       鎖死，three.js 所有 Vector3 變動方法最後都是對 x／y／z 賦值 ⇒ 分母歸一、涵蓋自然 100%，
       任何外部寫入當場 throw 並記進 `stats.sizeViolations`（治具端 `traitfx-drive`／`fx-contrast` 在判）。
       編舞唯一的合法縮放介面是 `st.iconScale(mesh, 相對倍率)`（ICON 的值永遠在乘積裡）。

   ⇒ **本掃描退居第二道**，規則也跟著換成按效果寫的版本：
      (a) 編舞不得出現 `size:` 這個鍵（入口已 throw，這是第二道）；
      (b) 編舞**不得直接碰徽記 mesh 的 `.scale`**——不論用哪個方法、哪個別名、哪層成員或索引；
      (c) 編舞不得把徽記餵給 `st.grow()`（那支寫的是**絕對**縮放，等於第二份來源）。
      (b) 的比對對象是「從徽記名字出發、抵達 `.scale` 的任何成員鏈」，不是列舉方法名——
      這樣 r3 那四條繞法與「還沒有人想到的第五條」都落在同一條規則裡。

   ★分母（動手前 grep 數出來，不憑印象；指令與輸出在 docs/experiments/2026-09-12-size-guard-evidence/）★
   `js/trait-fx/` 下除 vocab.js 外的全部 .js（目前 4 個：emblems／xianghuo／yinqi／zuling），去註解後——
     `size:` 這個鍵                      **0 處**
     `.scale.setScalar(`                  收斂前 **73 處** → 收斂後 **68 處**（差的 5 處就是徽記，已改走 st.iconScale）
     `.scale.set(`／`.multiplyScalar(`／`.scale.[xyz]=`／`.copy(` 等   **各 0 處**
   剩下的 68 處全部是 23 支未改招的 ring／disc／orb／光球縮放，**不是**本條要防的危險效果
   （徽記 mesh 一個都不在裡面——那正是收斂之後應有的狀態）。
   本測試自己印的分母（去註解後、`X.scale` 的成員／索引／賦值寫法）＝ **74 處**，與上面的 grep
   不同口徑（grep 含註解、只數 setScalar），兩份都貼在證據目錄裡。
   `st.icon(`／`st.icons(`／`st.mark(` 的呼叫點 **8 處**（4 支示範招），
   `st.iconScale(` 的呼叫點 **5 處**（＝收斂前那 5 處直接縮放）。

   `--mutate=4..10` 是 r3 七條繞法各自的回歸案例（原檔全程唯讀，只動記憶體裡的副本）。 */

/** 這個檔裡所有「拿得到徽記 mesh」的名字（變數、屬性、陣列元素、**別名**都算）。
 *  別名要做到不動點：`const m2 = knife;` 之後 `m2` 也是徽記（r3 繞法④）。 */
function emblemNames(src) {
  const names = new Set();
  // const knife = st.icon(… ／ const stamp = prey ? st.mark(… ／ const marks = bless.map((f) => st.mark(…
  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;]*?\bst\.(?:icon|icons|mark)\s*\(/g)) names.add(m[1]);
  // mesh: st.icon(…（物件屬性；yinqi 的 flying[].mesh 就是這樣來的）
  for (const m of src.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*st\.(?:icon|icons|mark)\s*\(/g)) names.add(m[1]);
  // 別名：`const m2 = knife;`／`let m2 = knife.children[0];`／`const m2 = marks[0];` —— 迭代到不動點
  for (let pass = 0; pass < 8; pass++) {
    const before = names.size;
    for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*((?:\.\s*[A-Za-z_$][\w$]*|\[[^\]\n]*\])*)\s*;/g)) {
      if (names.has(m[2])) names.add(m[1]);
    }
    if (names.size === before) break;
  }
  return names;
}

/** 從名字 n 出發、經過任意成員／索引之後抵達 `.scale` 的寫法（含 `n.scale` 本身） */
function scaleReach(n) {
  const id = n.replace(/\$/g, '\\$');
  return new RegExp('\\b' + id + '\\s*(?:\\.\\s*[A-Za-z_$][\\w$]*|\\[[^\\]\\n]*\\])*\\s*\\.\\s*scale\\b', 'g');
}

t('徽記 mesh 的尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得直接碰 scale ＋ 不得餵進 st.grow）', () => {
  const dir = path.join(ROOT, 'js/trait-fx');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'vocab.js').sort();
  if (files.length < 4) throw new Error(`js/trait-fx 只掃到 ${files.length} 個編舞檔（預期 ≥4，分母歸零了？）`);
  const hits = [];
  let scaleTotal = 0, nameTotal = 0, iconScaleCalls = 0;
  for (const f of files) {
    let src = fs.readFileSync(path.join(dir, f), 'utf8');
    /* 突變：r3 §N11 實測的七條繞法，逐條塞回 zuling.js 的獻祭刀。
       原檔全程唯讀（讀進字串後在記憶體裡改），不做反向 sed。 */
    if (MUT >= 4 && MUT <= 10 && f === 'zuling.js') {
      const from = 'st.iconScale(knife, 0.5 + 0.5 * e);';
      if (!src.includes(from)) throw new Error(`突變 ${MUT} 的錨點不在了：` + from);
      const BYPASS = {
        4: 'const S = 0.56; knife.scale.setScalar(S * (0.5 + 0.5 * e));', // ② 常數改名＋setScalar
        5: 'st.icon(st.kind, A, { size: 0.56 });', //                       ① o.size
        6: 'knife.scale.setScalar(0.56 * (0.5 + 0.5 * e));', //             ③ 字面值直接進 setScalar
        7: 'const m2 = knife; m2.scale.setScalar(0.02);', //                ④ 別名
        8: 'knife.scale.multiplyScalar(0.02 / st.iconSize);', //            ⑤ multiplyScalar
        9: 'knife.scale.x = 0.02; knife.scale.y = 0.02; knife.scale.z = 0.02;', // ⑥ scale.x=
        10: 'knife.children[0].scale.setScalar(0.02); marks[0].scale.setScalar(0.02);', // ⑦ 子節點／索引
      };
      // 繞法是**加行**不是改行（r3 N11 原話）：合法的 st.iconScale 留著，旁邊多一條第二來源。
      src = src.replace(from, from + ' ' + BYPASS[MUT]);
    }
    const noComment = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    const lineOf = (i) => noComment.slice(0, i).split('\n').length;
    /* (a) `size:` 這個鍵在編舞裡一處都不准有（入口已 throw，這是第二道）。
       ★`sizes:`（複數）**不在禁列**★：那是 st.icons 的逐實例**相對**倍率（`size * o.sizes[i]`），
       ICON 的值仍在乘積裡，不構成第二份來源；連它一起禁是把防線做死（禁到不該禁的東西）。 */
    for (const m of noComment.matchAll(/\bsize\s*:/g)) {
      hits.push(`${f}:${lineOf(m.index)} ${m[0].trim()}（st.icon／st.icons／st.mark 的 o.size 已拒收，編舞不得再出現這個鍵）`);
    }
    for (const _m of noComment.matchAll(/[A-Za-z_$][\w$]*\s*\.\s*scale\s*[.[=]/g)) scaleTotal++;
    for (const _m of noComment.matchAll(/\bst\.iconScale\s*\(/g)) iconScaleCalls++;
    // (b)(c) 徽記名字 → 任何抵達 .scale 的成員鏈／任何被餵進 st.grow 的地方
    const names = emblemNames(noComment);
    nameTotal += names.size;
    for (const n of names) {
      for (const m of noComment.matchAll(scaleReach(n))) {
        hits.push(`${f}:${lineOf(m.index)} ${m[0]}（徽記 mesh 的 scale 只能由 st.iconScale 寫；`
          + '直接碰它＝尺寸的第二份來源，執行期也會被 lockIconScale throw）');
      }
      for (const m of noComment.matchAll(new RegExp('\\bst\\.grow\\s*\\(\\s*' + n.replace(/\$/g, '\\$') + '\\b', 'g'))) {
        hits.push(`${f}:${lineOf(m.index)} st.grow(${n}…（st.grow 寫的是絕對縮放；徽記請用 st.iconScale）`);
      }
    }
  }
  /* 活性：三個分母都不得歸零（`02 §6.1` 第 1 條的反面——健康狀態下這條要綠得有內容）。
     ① 掃到的徽記名字數：名字解析壞掉 ⇒ (b)(c) 兩條規則就會對著空氣跑；
     ② st.iconScale 的呼叫點數：收斂之後這 5 處就是「合法縮放」的全部，掉下去代表編舞繞回去了；
     ③ 編舞檔數：目錄結構被搬走。 */
  // ★行為斷言排在活性斷言前面★（`02 §6.1` 第 1 條：紅要紅在「真的有第二份來源」，不是旁枝的計數）
  if (hits.length) throw new Error(`徽記尺寸有第二份來源 ${hits.length} 處：` + hits.join(' ／ '));
  if (nameTotal < 5) throw new Error(`只解析出 ${nameTotal} 個徽記名字（預期 ≥5；名字解析壞了＝這條掃描變成恆綠）`);
  if (iconScaleCalls < 5) throw new Error(`只掃到 ${iconScaleCalls} 處 st.iconScale（預期 ≥5；徽記的合法縮放介面沒人用了？）`);
  console.log(`        （分母：${files.length} 個編舞檔、${scaleTotal} 處 scale 寫法、${nameTotal} 個徽記名字、${iconScaleCalls} 處 st.iconScale；徽記 mesh 被直接縮放 0 處）`);
});
t('ICON._resolve 是三張尺寸表的共同出口（L3 canary 一次蓋三表，覆審 r3 N12）', () => {
  if (typeof ICON._resolve !== 'function') throw new Error('ICON 少了 _resolve（canary 沒有共同入口＝打 sizeOf 打不到 flat／mark）');
  const orig = ICON._resolve;
  try {
    ICON._resolve = () => 0.02; // ＝ L3 canary 的那一行
    eq(ICON.sizeOf('knife'), 0.02, 'canary 下的 sizeOf(knife)');
    eq(ICON.flatSizeOf('hat'), 0.02, 'canary 下的 flatSizeOf(hat)（有 flatByKind 覆寫，舊寫法打不到）');
    eq(ICON.markSizeOf('seal'), 0.02, 'canary 下的 markSizeOf(seal)（有 markByKind 覆寫，舊寫法打不到）');
    eq(ICON.sizeOf('claw'), 0.02, 'canary 下走預設值的 kind');
  } finally { ICON._resolve = orig; }
  // 還原之後回到健康值（反面也要驗：健康態這組證據要變綠）
  eq(ICON.sizeOf('knife'), ICON.byKind.knife, '還原後的 sizeOf(knife)');
  eq(ICON.flatSizeOf('hat'), ICON.flatByKind.hat, '還原後的 flatSizeOf(hat)');
  eq(ICON.markSizeOf('seal'), ICON.markByKind.seal, '還原後的 markSizeOf(seal)');
});
t('DEPRECATED／RETIRED_BY_FAC 與文件第 6 節相同', () => {
  const sec = doc.slice(doc.indexOf('## 6.'));
  Object.keys(DEPRECATED).forEach((k) => {
    if (!sec.includes('| `' + k + '` | `' + DEPRECATED[k].scope + '` |')) throw new Error(`文件第 6 節的 ${k} 不是 ${DEPRECATED[k].scope}`);
  });
  Object.keys(RETIRED_BY_FAC).forEach((f) => {
    if (!sec.includes('`' + f + '` = `' + RETIRED_BY_FAC[f].join(',') + '`')) throw new Error(`文件第 6 節的 ${f} 退役清單不符`);
  });
});

/* ── 7. 分岔防線：三個系別檔不得再出現色碼字面值（批 0 只約束改過的招）── */
t('vocab.js 自己不含 TODO／佔位', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/trait-fx/vocab.js'), 'utf8');
  if (/TODO|FIXME|0x000000/.test(src)) throw new Error('vocab.js 裡有 TODO／FIXME／佔位色');
});

console.log(`\n結果：${pass} 綠 ／ ${fail} 紅`);
process.exit(fail ? 1 : 0);

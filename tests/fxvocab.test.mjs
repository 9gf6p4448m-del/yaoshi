/* 招式特效語彙的單元測試（v0.55 招式可辨性卷，凍結檔 L12）。
   跑法：node tests/fxvocab.test.mjs

   它在守什麼：**文件寫了一套、`vocab.js` 是另一套**。這一卷整個的病因就是「語彙沒有單一事實來源」，
   所以 `docs/experiments/2026-09-11-fx-vocab.md`（人類讀的）與 `js/trait-fx/vocab.js`（程式讀的）
   必須逐項相同，不一致判紅。ART_BIBLE §10 是設計理由的權威，不進機械比對（它是散文）。

   ★鑑別力★：`--mutate=<n>` 會在記憶體裡把 `vocab.js` 的第 n 種東西改掉再跑，預期紅。
     1 = 改一個 EMBLEM_OF 的 kind（雙射被破壞＋與文件不符）
     2 = 改一個 FX_PAL 色碼
     3 = 改一個 BEAT 時窗
     4 = 在編舞檔裡塞回一個尺寸字面值（`const SZ = 0.56;`）＝尺寸的第二份事實來源
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
/* ★尺寸防線：按「危險的效果」寫（覆審 r1 C1 → 覆審 r2 N1／N7、`02 §6.1` 第 7 條）★

   危險的**效果**＝「徽記的實際世界尺寸出現第二份來源」——只要它成立，凍結檔 L3 指名的突變
   （`ICON.sizeOf()` 改 0.02）對那支招就完全打不到，綠燈與待驗行為脫鉤（r1 C1 的「恆綠儀式」）。
   r1 的第一版防線是按**已知入口**寫的（只認 `size: <數字>` 與 `const SZ|SIZE = <數字>`），
   覆審 r2 實測 30 秒就繞得過：把常數改名成 `const S`、或直接 `setScalar(0.56 * …)`，掃描完全沒反應。

   ★分母（動手前 grep 數出來，不憑印象）★：js/trait-fx/ 下除 vocab.js 外的全部 .js（目前 4 個：
   emblems／xianghuo／yinqi／zuling），去註解後——
     `size:`／`sizes:` 這個鍵      **0 處**（唯一那處 yinqi.js:150 已改走預設值）
     `.scale.setScalar(`          **79 處**
     `.scale.set(`                **0 處**
   79 處裡真正屬於「徽記 mesh」的只有 5 處（其餘 74 處是 23 支未改招的 ring／disc／orb／光球縮放，
   那不是本條要防的危險效果，全判紅只會讓這條掃描恆紅、一週內被改掉＝把防線做死）。

   ★兩條路各自怎麼守★
   (a) `o.size`：`js/trait-fx.js` 的 `icon()`／`icons()`／`mark()` **一律拒收**（傳了就 throw，
       訊息指回 `ICON.byKind`）——這條路由建構上消失。這裡再掃一次 `size:`／`sizes:` 鍵當第二道。
   (b) 直接對徽記 mesh 縮放：先從原始碼找出所有由 `st.icon(`／`st.icons(`／`st.mark(` 產生的名字
       （含 `mesh: st.icon(…)` 這種屬性、`.map(… st.mark(…))` 這種陣列），再要求它們的
       `scale.setScalar(`／`scale.set(` **引數裡必須出現** `st.iconSize`／`st.iconFlatSize`／
       `st.markSize`／`ICON.*` 其中之一；只有數字或別處來的常數＝第二份來源，判紅。
   `--mutate=4` 就是 r2 實測的繞法之一（`const S = 0.56` ＋ `setScalar(S * …)`）的回歸案例。 */

/** 從 `(` 起算的平衡括號取引數（跨行也吃得到；掃描不做完整 parse，這一層就夠） */
function argsFrom(src, openIdx) {
  let d = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === '(') d++;
    else if (src[i] === ')') { d--; if (!d) return src.slice(openIdx + 1, i); }
  }
  return src.slice(openIdx + 1);
}

/** 這個檔裡所有「拿得到徽記 mesh」的名字（變數、屬性、陣列元素都算） */
function emblemNames(src) {
  const names = new Set();
  // const knife = st.icon(… ／ const stamp = prey ? st.mark(… ／ const marks = bless.map((f) => st.mark(…
  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;]*?\bst\.(?:icon|icons|mark)\s*\(/g)) names.add(m[1]);
  // mesh: st.icon(…（物件屬性；yinqi 的 flying[].mesh 就是這樣來的）
  for (const m of src.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*st\.(?:icon|icons|mark)\s*\(/g)) names.add(m[1]);
  return names;
}

const SIZE_SRC = /\b(?:st\.iconSize|st\.iconFlatSize|st\.markSize|ICON\.[A-Za-z_$][\w$]*)\b/;

t('徽記 mesh 的尺寸不得有第二份來源（o.size 拒收 ＋ 縮放必須引用 ICON）', () => {
  const dir = path.join(ROOT, 'js/trait-fx');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'vocab.js').sort();
  if (files.length < 4) throw new Error(`js/trait-fx 只掃到 ${files.length} 個編舞檔（預期 ≥4，分母歸零了？）`);
  const hits = [];
  let scaleTotal = 0, emblemScale = 0;
  for (const f of files) {
    let src = fs.readFileSync(path.join(dir, f), 'utf8');
    /* 突變：r2 §2 C1③「繞過 B」——常數改名成 S（舊掃描認不得 SZ 以外的名字）＋ 直接餵進 setScalar。
       原檔全程唯讀，只動記憶體裡的副本，不做反向 sed。 */
    if (MUT === 4 && f === 'zuling.js') {
      const from = 'knife.scale.setScalar(st.iconSize * (0.5 + 0.5 * e));';
      if (!src.includes(from)) throw new Error('突變 4 的錨點不在了：' + from);
      src = src.replace(from, 'const S = 0.56; knife.scale.setScalar(S * (0.5 + 0.5 * e));');
    }
    const noComment = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    const lineOf = (i) => noComment.slice(0, i).split('\n').length;
    // (a) size:／sizes: 這個鍵在編舞裡一處都不准有（入口已 throw，這是第二道）
    for (const m of noComment.matchAll(/\bsizes?\s*:/g)) {
      hits.push(`${f}:${lineOf(m.index)} ${m[0].trim()}（st.icon／st.icons／st.mark 的 o.size 已拒收，編舞不得再出現這個鍵）`);
    }
    // (b) 徽記 mesh 的縮放：引數必須引用 ICON 來源
    const names = emblemNames(noComment);
    for (const m of noComment.matchAll(/([A-Za-z_$][\w$]*)\s*\.\s*scale\s*\.\s*(setScalar|set)\s*\(/g)) {
      scaleTotal++;
      if (!names.has(m[1])) continue; // 非徽記 mesh（ring／disc／orb…）不是本條要守的效果
      emblemScale++;
      const args = argsFrom(noComment, m.index + m[0].length - 1);
      if (!SIZE_SRC.test(args)) {
        hits.push(`${f}:${lineOf(m.index)} ${m[1]}.scale.${m[2]}(${args.trim().slice(0, 60)}）` +
          '（徽記 mesh 的縮放沒有引用 st.iconSize／st.iconFlatSize／st.markSize／ICON.*＝尺寸的第二份來源）');
      }
    }
  }
  // 活性：分母不得歸零（掃不到任何徽記 mesh 的縮放＝這條掃描已經對著空氣跑）
  if (emblemScale < 5) throw new Error(`只掃到 ${emblemScale} 處徽記 mesh 的縮放（預期 ≥5；名字解析壞了＝這條掃描變成恆綠）`);
  if (hits.length) throw new Error(`徽記尺寸有第二份來源 ${hits.length} 處：` + hits.join(' ／ '));
  console.log(`        （分母：${files.length} 個編舞檔、${scaleTotal} 處 scale 呼叫，其中 ${emblemScale} 處落在徽記 mesh 上）`);
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

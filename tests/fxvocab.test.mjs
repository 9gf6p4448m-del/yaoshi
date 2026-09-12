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
     4–20 = 徽記尺寸防線的十七條繞法（v0.55.3 N11；逐條見下面「尺寸防線」那段的 BYPASS 表）
     21 = 把 `MOVE_SPEC.biteGamble.act` 改成別系的動詞（`探`＝陰氣）＝P1 的白名單被繞過
     22 = 從 `MOVE_SPEC` 拔掉一支招（`wardRegen1`）＝P1 的「27 支全覆蓋」被繞過
   原檔全程唯讀（讀進字串後在記憶體裡改），不做反向 sed。

   為什麼不 import emblems.js：它 `import * as THREE from 'three'`，node 端沒有 importmap。
   所以徽記那一段改成**讀原始碼**數 kind 與頂點數——量的仍是同一份檔案。 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FX_PAL, BEAT_FRAC, beatOf, ICON, PHASE_GATE, EMBLEM_OF, DEPRECATED, RETIRED_BY_FAC, FAC_VOCAB, MOVE_SPEC,
  STANCE_VOCAB, REACT_AXIS, STANCE_GATE, FAC_GROUND } from '../js/trait-fx/vocab.js';

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
const MS = JSON.parse(JSON.stringify(MOVE_SPEC));
/* ★號碼從 21 起★：4–20 是 v0.55.3 N11 尺寸防線的十七條繞法（合併時撞號，P1 這兩條往後挪）。 */
if (MUT === 21) MS.biteGamble.act = '探'; // 陰氣的動詞出現在香火招上
if (MUT === 22) delete MS.wardRegen1; // 少一支招
/* ★23–25＝身分可辨語彙（§A9）三條檢查各自的鑑別力★（2026-09-13 祖靈批階段 A） */
if (MUT === 23) MS.eliteSelfCut.stance = '舉臂'; // 與 react「升」同型（up vs up）＝讀者分不出蓄勢與受益
if (MUT === 24) delete MS.biteGamble.stance; // 已轉正的招漏填 stance
const MUT25 = MUT === 25; // 編舞裡把一支已轉正的招的 st.stance 拿掉（在記憶體裡改原始碼）
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
  /* ★2026-09-12：tier 1 短版 260→300（凍結檔 §2.1 修訂，使用者裁定）★
     這一列是**鏡像常數**——它列的是「PW_FX.TRAIT_MS_BY_TIER 現在有哪些值」，跟著單一來源走。
     處置是**加嚴**（把 300 加進去、260 留著），不是換掉：留著 260 只會多擋一個過時的字面值，
     任何一份實作都不會因為這一行變得比較容易過。 */
  for (const n of ['260', '300', '900', '1400']) {
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

/* ── 4b. 招式演出登記表 MOVE_SPEC（P1，2026-09-12 演出卷）────────────
   閘門定義＝`docs/proposals/2026-09-12-plan-fx-performance.md` §5 的 P1
   「一招一組『動作＋道具＋反應』，登記表可機械檢查」；schema 與三條檢查＝同檔 §7.2 Q9。
   白名單的人類版在 `docs/design/ART_BIBLE.md` §10.7（散文，不進機械比對），程式版是 `FAC_VOCAB`。
   ★這三條守的是什麼★：不是「填了東西」，是「填的東西屬於這一系」——
   香火招填了陰氣的動詞（`--mutate=5`）或少填一支（`--mutate=6`）都必須紅，
   否則 P1 就只是一張沒人檢查的清單，27 支鋪完會長出 27 種講法（＝vocab.js 這個檔要擋的分岔）。
   trId → 系別**不另抄一份**：直接讀文件第 4 節那張表（招名欄有「（傳說）」的三列＝三尊，Q8 不納入）。 */

/** 文件第 4 節的逐列：[trId, 招名, 系, kind]（與上面那個測試同一條解析路徑） */
function doc4Rows() {
  return doc.split(/\r?\n/).filter((l) => /^\| `[A-Za-z0-9]+` \| /.test(l) && l.split('|').length === 6)
    .map((l) => l.split('|').map((c) => c.trim()).slice(1, -1))
    .filter((r) => /^`(zuling|xianghuo|yinqi)`$/.test(r[2]));
}

t('FAC_VOCAB 是三系各一組白名單（動詞庫／道具家族／反應家族都非空）', () => {
  eq(Object.keys(FAC_VOCAB).sort().join(','), 'xianghuo,yinqi,zuling', 'FAC_VOCAB 的系別集合');
  Object.entries(FAC_VOCAB).forEach(([fac, v]) => {
    if (!Object.keys(v.props).length) throw new Error(`${fac} 的道具家族是空的`);
    if (!v.acts.length || !v.reacts.length) throw new Error(`${fac} 的動詞庫或反應家族是空的`);
    // 家族代號只能是甲乙丙丁（陰氣沒有丁，但不得出現第五個代號）
    Object.keys(v.props).forEach((k) => { if (!'甲乙丙丁'.includes(k) || k.length !== 1) throw new Error(`${fac} 出現不合法的家族代號 ${k}`); });
    Object.keys(v.propOnly || {}).forEach((k) => { if (!(k in v.props)) throw new Error(`${fac}.propOnly 限縮了不存在的家族 ${k}`); });
  });
});

t('MOVE_SPEC 三欄都非空，且取值落在該系白名單內（P1 ①②）', () => {
  const facOf = Object.fromEntries(doc4Rows().map((r) => [tick(r[0]), tick(r[2])]));
  const bad = [];
  Object.keys(MS).forEach((id) => {
    const s = MS[id], fac = facOf[id];
    if (!fac) { bad.push(`${id}：文件第 4 節沒有這支招，查不到它屬於哪一系`); return; }
    const V = FAC_VOCAB[fac];
    ['prop', 'act', 'react'].forEach((k) => { if (typeof s[k] !== 'string' || !s[k].trim()) bad.push(`${id}.${k} 是空的`); });
    if (s.prop && !(s.prop in V.props)) bad.push(`${id}.prop="${s.prop}" 不在 ${fac} 的道具家族（${Object.keys(V.props).join('／')}）`);
    if (s.act && !V.acts.includes(s.act)) bad.push(`${id}.act="${s.act}" 不在 ${fac} 的動詞庫（${V.acts.join('／')}）`);
    if (s.react && !V.reacts.includes(s.react)) bad.push(`${id}.react="${s.react}" 不在 ${fac} 的反應家族（${V.reacts.join('／')}）`);
    // 限縮家族（Q4 的祖靈「丁 日與雷」只給射日與雷女）：加嚴項，不是新判準
    const only = (V.propOnly || {})[s.prop];
    if (only && !only.includes(id)) bad.push(`${id}.prop="${s.prop}" 是 ${fac} 的限縮家族，只有 ${only.join('／')} 可用`);
  });
  if (bad.length) throw new Error(`MOVE_SPEC 有 ${bad.length} 處越界：` + bad.join(' ／ '));
});

t('MOVE_SPEC 覆蓋 27 支招、不含三尊（P1 ③）', () => {
  const rows = doc4Rows();
  const legends = rows.filter((r) => /（傳說）/.test(r[1])).map((r) => tick(r[0]));
  eq(legends.length, 3, '文件第 4 節標「（傳說）」的列數（Q8：三尊不納入 MOVE_SPEC）');
  const want = rows.filter((r) => !/（傳說）/.test(r[1])).map((r) => tick(r[0])).sort();
  eq(want.length, 27, '27 支招（30 列扣掉三尊）');
  eq(Object.keys(MS).sort().join(','), want.join(','), 'MOVE_SPEC 的 trId 集合');
  legends.forEach((id) => { if (MS[id]) throw new Error(`MOVE_SPEC 不該有三尊 ${id}（Q8：語彙納入、閘門不納入）`); });
});

/* ── 4c. 身分可辨語彙（§A9，2026-09-13 祖靈批階段 A）──────────────────
   病因＝`docs/experiments/2026-09-13-xianghuo-b1-report.md` §8：P4 三輪的紅集中在 Q2「作用對象」，
   六位讀者自述「2v2 裡兩尊同系同型、站得近，道具落在哪一尊就當誰施招」⇒ 增益招一律答「自己」。
   語彙的修法有三條，這一節是它的機械版：
     ① 已轉正的招必須登記 `stance`（施招姿態），取值在 `STANCE_VOCAB` 白名單內；
     ② 施招姿態的 `axis` 不得等於同一支招受益／受招反應的 `axis`（同型＝讀者分不出蓄勢與受益）；
     ③ 已轉正的招的編舞必須真的呼叫 `st.stance(` 與 `st.groundMark(`（登記了卻沒演＝一張沒人看的表）。
   ★「已轉正」是從原始碼推導的，不是手工名單★——手工名單忘了加就沒有紅（`traitfx-drive`
   的 `emblemCasesFromSource` 覆審 r3 N-3 同一條教訓）。下限＝本階段的 10 支必須都推導得出來。 */

/** 三個系別檔裡「已轉正」的招：函式體真的呼叫過 `st.phase(`，且不在 `V054`／`V055` 退路段裡。
 *  ★與 `tests/tools/traitfx-drive.mjs` 的 `phaseCasesFromSource` 是同一條推導★，
 *  但那一支在模組載入時就 require playwright（單元測試不該拖進瀏覽器），所以這裡另寫一份輕量版；
 *  兩邊都有活性下限（少一支就 throw），分岔了會有一邊紅。 */
function convertedMoves() {
  const out = new Set();
  for (const f of ['zuling.js', 'xianghuo.js', 'yinqi.js']) {
    let src = fs.readFileSync(path.join(ROOT, 'js/trait-fx', f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    if (MUT25 && f === 'xianghuo.js') {
      const from = "st.stance(monk, '前傾', e);";
      if (!src.includes(from)) throw new Error('突變 25 的錨點不在了：' + from);
      src = src.replace(from, ' ');
    }
    const cut = src.search(/export const V05[45]/);
    /* ★「有 st.phase」還不等於「已轉正」★：批 0 的徽記版也打點，而它們**住在 MOVES 裡、
       由 `V054` 覆蓋**（預設路徑跑的是 0.54 本體）。`hauntLost` 就是這一態——陰氣批還沒開。
       所以退路段裡出現過的 trId 一律排掉（`traitfx-drive` 那邊是用 `v054CasesFromSource` 做同一件事）。 */
    const retired = new Set([...(cut > 0 ? src.slice(cut) : '').matchAll(/^ {2}([A-Za-z_$][\w$]*)_v054(?:short)?\s*\(st\)\s*\{/gm)].map((m) => m[1]));
    if (cut > 0) src = src.slice(0, cut);
    const heads = [...src.matchAll(/^ {2}([A-Za-z_$][\w$]*)\s*\(st\)\s*\{/gm)];
    heads.forEach((h, i) => {
      const body = src.slice(h.index, i + 1 < heads.length ? heads[i + 1].index : src.length);
      if (/\bst\.phase\s*\(/.test(body) && !retired.has(h[1])) out.add(h[1]);
    });
  }
  return out;
}
/** 已轉正那一支招的函式體（給 ③ 用；同一條解析路徑） */
function bodyOf(trId) {
  for (const f of ['zuling.js', 'xianghuo.js', 'yinqi.js']) {
    let src = fs.readFileSync(path.join(ROOT, 'js/trait-fx', f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    if (MUT25 && f === 'xianghuo.js') src = src.replace("st.stance(monk, '前傾', e);", ' ');
    const cut = src.search(/export const V05[45]/);
    /* ★「有 st.phase」還不等於「已轉正」★：批 0 的徽記版也打點，而它們**住在 MOVES 裡、
       由 `V054` 覆蓋**（預設路徑跑的是 0.54 本體）。`hauntLost` 就是這一態——陰氣批還沒開。
       所以退路段裡出現過的 trId 一律排掉（`traitfx-drive` 那邊是用 `v054CasesFromSource` 做同一件事）。 */
    const retired = new Set([...(cut > 0 ? src.slice(cut) : '').matchAll(/^ {2}([A-Za-z_$][\w$]*)_v054(?:short)?\s*\(st\)\s*\{/gm)].map((m) => m[1]));
    if (cut > 0) src = src.slice(0, cut);
    const heads = [...src.matchAll(/^ {2}([A-Za-z_$][\w$]*)\s*\(st\)\s*\{/gm)];
    for (let i = 0; i < heads.length; i++) {
      if (heads[i][1] !== trId) continue;
      return src.slice(heads[i].index, i + 1 < heads.length ? heads[i + 1].index : src.length);
    }
  }
  return null;
}
/** 本階段（2026-09-13）已轉正的 10 支：香火 9 ＋ 祖靈範本招獻祭刀。推導少一支就是解析壞了。 */
const CONVERTED_MUST = ['biteGamble', 'eliteCleave', 'eliteSelfCut', 'swarmLastStand', 'swarmRally',
  'wardAbsorb4', 'wardAtkAll1', 'wardHpFirst', 'wardImmuneLost', 'wardRegen1'];

t('STANCE_VOCAB／REACT_AXIS／FAC_GROUND 三張表自身完整（沒有 undefined 可以讓「不同型」恆綠）', () => {
  Object.entries(STANCE_VOCAB).forEach(([k, v]) => {
    if (!v.axis) throw new Error(`施招姿態 ${k} 沒有 axis`);
    if (!Number.isFinite(v.amp) || v.amp <= 0) throw new Error(`施招姿態 ${k} 的 amp 不是正數`);
    if (v.amp < STANCE_GATE.minPeak) throw new Error(`施招姿態 ${k} 的 amp ${v.amp} 低於 STANCE_GATE.minPeak ${STANCE_GATE.minPeak}＝這一型永遠過不了門檻`);
  });
  // 三系反應家族的每一個字都要在 REACT_AXIS 裡：漏一個，那一支的「不同型」就是 undefined!==axis 的假綠／假紅
  Object.entries(FAC_VOCAB).forEach(([fac, v]) => v.reacts.forEach((r) => {
    if (!REACT_AXIS[r]) throw new Error(`${fac} 的反應「${r}」不在 REACT_AXIS 裡（那條「不同型」檢查會對著 undefined 跑）`);
  }));
  eq(Object.keys(FAC_GROUND).sort().join(','), 'xianghuo,yinqi,zuling', 'FAC_GROUND 的系別集合');
});

t('已轉正的招都登記了 stance，且取值在白名單內（§A9 ①）', () => {
  const conv = convertedMoves();
  const missing = CONVERTED_MUST.filter((t2) => !conv.has(t2));
  if (missing.length) throw new Error(`「已轉正」的推導壞了：推導出 ${[...conv].sort().join(' ') || '無'}，缺少 ${missing.join(' ')}`);
  const bad = [];
  conv.forEach((id) => {
    if (!MS[id]) return; // 三尊三招不在 MOVE_SPEC（Q8）
    const s = MS[id].stance;
    if (!s) bad.push(`${id} 沒有 stance（已轉正的招必須登記施招姿態，§A9 ①）`);
    else if (!STANCE_VOCAB[s]) bad.push(`${id}.stance="${s}" 不在 STANCE_VOCAB（${Object.keys(STANCE_VOCAB).join('／')}）`);
  });
  if (bad.length) throw new Error(bad.join(' ／ '));
});

t('施招姿態與受益／受招反應不同型（§A9 ②）', () => {
  const bad = [];
  Object.keys(MS).forEach((id) => {
    const s = MS[id];
    if (!s.stance || !STANCE_VOCAB[s.stance]) return; // 沒填的由上一條擋
    if (s.selfReact) return; // 反應在自身的招（破軍旗）本來就只有一個人，不適用
    const a = STANCE_VOCAB[s.stance].axis, b = REACT_AXIS[s.react];
    if (a === b) bad.push(`${id}：施招姿態「${s.stance}」與反應「${s.react}」同型（${a}）——讀者把「他在蓄勢」讀成「他被托起來」，正是 P4 r3 的紅`);
  });
  if (bad.length) throw new Error(bad.join(' ／ '));
});

t('已轉正的招的編舞真的呼叫了 st.stance／st.groundMark（§A9 ③）', () => {
  const bad = [];
  let seen = 0;
  CONVERTED_MUST.forEach((id) => {
    const body = bodyOf(id);
    if (!body) { bad.push(`${id}：切不出函式體（解析壞了）`); return; }
    seen++;
    if (!/\bst\.stance\s*\(/.test(body)) bad.push(`${id} 沒有呼叫 st.stance（登記表填了卻沒演＝一張沒人看的表）`);
    if (!/\bst\.groundMark\s*\(/.test(body)) bad.push(`${id} 沒有呼叫 st.groundMark（腳下系別光語彙是身分訊號的另一半）`);
  });
  // 活性：切得出來的函式體數不得歸零（解析壞掉時上面兩條會對著空字串跑）
  if (seen < CONVERTED_MUST.length) bad.push(`只切出 ${seen}/${CONVERTED_MUST.length} 支函式體`);
  if (bad.length) throw new Error(bad.join(' ／ '));
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
       鎖死（three.js 所有 Vector3 變動方法最後都是對 x／y／z 賦值），
       任何外部寫入當場 throw 並記進 `stats.sizeViolations`（治具端 `traitfx-drive`／`fx-contrast` 在判）。
       編舞唯一的合法縮放介面是 `st.iconScale(mesh, 相對倍率)`（ICON 的值永遠在乘積裡）。
       ★r3 在這裡寫了「分母歸一、涵蓋自然 100%」——那句是假的，已刪★：鎖住一個屬性 ≠ 收斂一個效果，
       世界尺寸還受父層縮放／geometry／自寫 matrix 影響（見下一段 r4）。

   ★r4 又補了一輪★：r3 的 (b) 只盯 `.scale`，覆審員實測另外四條照樣改得動世界尺寸而三道防線全綠
   （A 父層 Group 縮放、B 置換 geometry、C 自寫 matrix、E defineProperty 蓋掉 accessor）。
   真正的扼口是 `js/trait-fx.js` 的 `lockIconScale` ＋ `auditSizes`（執行期量**世界尺寸**本身）。
   本掃描同步把規則從「`.scale`」擴成「**所有會改變世界尺寸的成員**」。

   ⇒ **本掃描是第三道**（第一道＝入口拒收 `o.size`，第二道＝執行期鎖與世界尺寸稽核），規則：
      (a) 編舞不得出現 `size:` 這個鍵（入口已 throw，這是第二道）；
      (b) 編舞**不得直接碰徽記的** `scale`／`geometry`／`matrix`／`matrixWorld`／
          `matrixAutoUpdate`／`matrixWorldAutoUpdate`／`parent`——不論用哪個方法、哪個別名、
          哪層成員或索引（比對的是「從徽記名字出發抵達那個成員的任何成員鏈」，不是列舉方法名）；
      (c) 編舞不得把徽記餵給 `st.grow()`（那支寫的是**絕對**縮放），
          也不得把徽記 `add()` 到別的節點底下（父層縮放就是那樣進來的，r4 繞法 A）。

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

   `--mutate=4..20` 是**十七條**繞法各自的回歸案例（r3 七條＋r4 四條＋r2 六條；
   原檔全程唯讀，只動記憶體裡的副本）。★掃描擋得到的是「直接寫」的那一形；
   覆審 r2 的 H1／M1／M2／M3 用 helper 包一層就避得開名字追蹤——**那幾條靠的是執行期那兩道**
   （鎖與世界尺寸稽核），報告 §10 的表逐條寫明是哪一道接住的。 */

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

/** 會改變徽記世界尺寸的成員（r4：不只 scale——父層、geometry、手寫 matrix 都是同一個效果） */
const SIZE_MEMBERS = ['scale', 'geometry', 'matrix', 'matrixWorld', 'matrixAutoUpdate', 'matrixWorldAutoUpdate',
  // r2 H1：three 的 renderObject 是 onBeforeRender → modelViewMatrix ← matrixWorld → draw → onAfterRender，
  // 這兩個鉤子是「在稽核之後、送去畫之前」改矩陣的最後機會。
  'onBeforeRender', 'onAfterRender',
  // parent／children／traverse 不是尺寸本身，但它們是「繞到尺寸」的三條通道：
  // 重新掛載（父層縮放）、抓子節點改、traverse 進去改 geometry。編舞沒有合法理由碰它們。
  'parent', 'children', 'traverse'];
/** 從名字 n 出發、經過任意成員／索引之後抵達上列任一成員的寫法（含 `n.scale` 本身） */
function sizeReach(n) {
  const id = n.replace(/\$/g, '\\$');
  return new RegExp('\\b' + id + '\\s*(?:\\.\\s*[A-Za-z_$][\\w$]*|\\[[^\\]\\n]*\\])*\\s*\\.\\s*(' + SIZE_MEMBERS.join('|') + ')\\b', 'g');
}

t('徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add）', () => {
  const dir = path.join(ROOT, 'js/trait-fx');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'vocab.js').sort();
  if (files.length < 4) throw new Error(`js/trait-fx 只掃到 ${files.length} 個編舞檔（預期 ≥4，分母歸零了？）`);
  const hits = [];
  let scaleTotal = 0, nameTotal = 0, iconScaleCalls = 0;
  for (const f of files) {
    let src = fs.readFileSync(path.join(dir, f), 'utf8');
    /* 突變：r3 §N11 實測的七條繞法，逐條塞回 zuling.js 的獻祭刀。
       原檔全程唯讀（讀進字串後在記憶體裡改），不做反向 sed。 */
    if (MUT >= 4 && MUT <= 20 && f === 'zuling.js') {
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
        /* ── 覆審 r4 自己設計的四條（r3 三道防線對它們全綠）── */
        11: 'const wrapG = new THREE.Group(); wrapG.scale.setScalar(0.06); knife.parent.add(wrapG); wrapG.add(knife);', // A 父層 Group
        12: 'knife.traverse((o) => { if (o.geometry) o.geometry = new THREE.PlaneGeometry(0.05, 0.05); });', // B 置換 geometry
        13: 'knife.matrixAutoUpdate = false; knife.matrix.multiply(new THREE.Matrix4().makeScale(0.05, 0.05, 0.05));', // C 自寫 matrix
        14: "Object.defineProperty(knife.scale, 'x', { value: 0.02 });", // E defineProperty 蓋掉 accessor
        /* ── 覆審 r2（第 2 輪）自己設計的六條 ── */
        15: 'knife.onBeforeRender = function () { this.matrixWorld.scale(new THREE.Vector3(0.05, 0.05, 0.05)); };', // H1 送畫前改 matrixWorld
        16: 'st.icons(st.kind, [A], { flat: true, sizes: [0.50 / st.iconFlatSize] });', //                           H2 o.sizes 把 ICON 除掉
        17: 'const m2 = new THREE.Mesh(knife.geometry, knife.material); m2.scale.setScalar(0.52); st.spawn(m2, "emblem:" + st.kind);', // M1 手造第二顆徽記
        18: 'knife.geometry.scale(0.5, 0.5, 0.5);', //                                                               M2 就地改共用剪影
        19: 'marks[0].add(knife);', //                                                                               M3 掛到另一顆徽記底下
        20: 'ICON.byKind.knife = 0.02;', //                                                                          L1 執行期改表
      };
      // 繞法是**加行**不是改行（r3 N11 原話）：合法的 st.iconScale 留著，旁邊多一條第二來源。
      src = src.replace(from, from + ' ' + BYPASS[MUT]);
    }
    const noComment = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    const lineOf = (i) => noComment.slice(0, i).split('\n').length;
    /* (a) `size:` 這個鍵在編舞裡一處都不准有（入口已 throw，這是第二道）。
       ★`sizes:`（複數）仍不在禁列，但理由改寫了（覆審 r2 H2）★：它是 `st.icons` 的逐實例**相對**倍率，
       舊註解寫「ICON 的值仍在乘積裡，不構成第二份來源」——**那句話不成立**：
       `sizes: prints.map(() => 0.50 / st.iconFlatSize)` 把 ICON 的值**除掉**，乘積就是寫死的絕對尺寸
       （實測貼桌徽記 0.2 → 0.5，當時四道防線全綠）。現在它由**入口的區間檢查**守
       （`st.icons` 逐項比對 `ICON.scaleRange`，超出就 throw）＋稽核第二道，
       掃描這邊則補上 (e)：不得把 ICON 來源放到除號右邊。 */
    for (const m of noComment.matchAll(/\bsize\s*:/g)) {
      hits.push(`${f}:${lineOf(m.index)} ${m[0].trim()}（st.icon／st.icons／st.mark 的 o.size 已拒收，編舞不得再出現這個鍵）`);
    }
    /* (d) 編舞不得直接碰 `ICON`（含動態 import vocab.js）——執行期改表那條路（覆審 r2 L1）。
       三個系別檔設計上就不 import vocab.js（值由 makeStage 掛到 st 上），所以這一條在健康態恆 0。 */
    for (const m of noComment.matchAll(/\bICON\s*[.[]/g)) {
      hits.push(`${f}:${lineOf(m.index)} ICON.…（編舞不得直接碰 ICON 表：值一律由 st 掛進來，`
        + '執行期改表是「檔案內容 ≠ 執行期真值」的入口，覆審 r2 L1）');
    }
    for (const m of noComment.matchAll(/import\s*\(\s*['"`][^'"`]*vocab\.js/g)) {
      hits.push(`${f}:${lineOf(m.index)} import(vocab.js…（三個系別檔不 import 本表，見 vocab.js 檔頭）`);
    }
    /* (e) ★把 ICON 的值從乘積裡消掉★（覆審 r2 H2 的一般化）：
       `0.50 / st.iconFlatSize`、`0.02 / base` 這種寫法讓「相對倍率」變成絕對尺寸。
       規則按效果寫：ICON 的任何來源都不得出現在除號右邊。 */
    for (const m of noComment.matchAll(/\/\s*(st\.iconFlatSize|st\.iconSize|st\.markSize|ICON\.[A-Za-z_$][\w$]*)/g)) {
      hits.push(`${f}:${lineOf(m.index)} ／${m[1]}（把 ICON 的值當除數＝把它從乘積裡消掉，`
        + '剩下的就是寫死的絕對尺寸，覆審 r2 H2）');
    }
    for (const _m of noComment.matchAll(/[A-Za-z_$][\w$]*\s*\.\s*scale\s*[.[=]/g)) scaleTotal++;
    for (const _m of noComment.matchAll(/\bst\.iconScale\s*\(/g)) iconScaleCalls++;
    // (b)(c) 徽記名字 → 任何抵達 .scale 的成員鏈／任何被餵進 st.grow 的地方
    const names = emblemNames(noComment);
    nameTotal += names.size;
    for (const n of names) {
      for (const m of noComment.matchAll(sizeReach(n))) {
        hits.push(`${f}:${lineOf(m.index)} ${m[0]}（徽記的世界尺寸只能由 st.iconScale 寫；`
          + `直接碰 ${m[1]} ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到）`);
      }
      const id = n.replace(/\$/g, '\\$');
      for (const m of noComment.matchAll(new RegExp('\\bst\\.grow\\s*\\(\\s*' + id + '\\b', 'g'))) {
        hits.push(`${f}:${lineOf(m.index)} st.grow(${n}…（st.grow 寫的是絕對縮放；徽記請用 st.iconScale）`);
      }
      // r4 繞法 A：把徽記掛到別的節點底下，父層縮放就進來了
      for (const m of noComment.matchAll(new RegExp('\\.\\s*add\\s*\\(\\s*' + id + '\\b', 'g'))) {
        hits.push(`${f}:${lineOf(m.index)} .add(${n}…（徽記不得被重新掛載：父層縮放＝世界尺寸的第二份來源，覆審 r4 繞法 A）`);
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

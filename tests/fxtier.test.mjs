/* 招式三級視覺分級（v0.54）的單元測試——凍結檔 docs/experiments/2026-09-10-acceptance-fx-tiers.md F1。
   跑法：node tests/fxtier.test.mjs [--html=<index.html 路徑>]
   ★鑑別力檢查★：對基準（adbb124／v0.53）的 index.html 跑，第 2/3/4/5 組必須紅——
     node tests/fxtier.test.mjs --html=scratchpad/base-index.html
   紅的原因必須是行為斷言（tier 判定錯、常數分岔、退路還在），不是「函式沒匯出」這種旁枝錯誤，
   所以第 2 組先明確檢查出口存在與否，並把「沒有這支函式」當成一條行為結論印出來。 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadGame } from './tools/load.mjs';
import { TRAIT_MS_BY_TIER, BEAT_MIN_MS_BY_TIER, TIER_BASE_MS, assertPageConsts, pageConstsFromHtml } from './tools/fx-consts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const HTML = arg('html') || path.join(HERE, '..', 'index.html');
const ROOT = path.join(HERE, '..');

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('  PASS  ' + name); } catch (e) { fail++; console.log('  FAIL  ' + name + ' — ' + e.message); } };
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}：得到 ${JSON.stringify(a)}，預期 ${JSON.stringify(b)}`); };

console.log(`三級視覺分級 F1：目標檔 ${path.relative(ROOT, HTML)}`);
const txt = fs.readFileSync(HTML, 'utf8');
const Y = loadGame(HTML);

/* ── 1. 治具常數與頁面常數不得分岔（分母歸一的機械閘門）───────────────── */
t('fx-consts.mjs 與頁面 PW_FX 的三張表逐鍵相同', () => {
  assertPageConsts(pageConstsFromHtml(txt)); // 不一致就 throw
});
t('頁面 PW_FX 就是 fx-consts 那三張表（走真的載進來的物件，不是 regex）', () => {
  if (!Y.PW_FX) throw new Error('PW_FX 未匯出');
  for (const k of [1, 2, 3]) {
    eq(Y.PW_FX.TRAIT_MS_BY_TIER && Y.PW_FX.TRAIT_MS_BY_TIER[k], TRAIT_MS_BY_TIER[k], `TRAIT_MS_BY_TIER[${k}]`);
    eq(Y.PW_FX.BEAT_MIN_MS_BY_TIER && Y.PW_FX.BEAT_MIN_MS_BY_TIER[k], BEAT_MIN_MS_BY_TIER[k], `BEAT_MIN_MS_BY_TIER[${k}]`);
  }
  eq(Y.PW_FX.TIER_BASE_MS, TIER_BASE_MS, 'TIER_BASE_MS');
  // 舊的單一常數必須整組消失（留著就是第二份事實來源）
  eq(Y.PW_FX.TRAIT_MS, undefined, '舊的 PW_FX.TRAIT_MS 應已刪除');
  eq(Y.PW_FX.BEAT_MIN_MS, undefined, '舊的 PW_FX.BEAT_MIN_MS 應已刪除');
});

/* ── 2. pwBeatTier 的三級判定（拍級）─────────────────────────────────── */
const has = typeof Y.pwBeatTier === 'function';
const beat = (kind, trId) => ({ kind, trId, side: 'A' });
const warTie = { war: { tie: true } };
const warWin = { war: { tie: false } };
t('pwBeatTier 已匯出（沒有就是這一卷還沒做，下面四條一併紅）', () => {
  if (!has) throw new Error('pwBeatTier 未匯出：這個版本沒有三級視覺分級');
});
t('三尊大招（TRAITS.tier===3）把整拍鎖在 tier 3', () => {
  if (!has) throw new Error('pwBeatTier 未匯出');
  eq(Y.pwBeatTier([beat('trait', 'eliteBlind')], 1, warWin), 3, '殘日・餘暉灼目');
  eq(Y.pwBeatTier([beat('trait', 'wardGuardAll')], 2, warTie), 3, '大士爺・普渡');
  eq(Y.pwBeatTier([beat('trait', 'hauntAnswer')], 3, warWin), 3, '有應公・有求必應');
  // 同一拍混著普通招也還是 3（上限鎖住整拍）
  eq(Y.pwBeatTier([beat('trait', 'eliteOpenShot'), beat('trait', 'eliteBlind')], 1, warWin), 3, '混拍');
});
t('該拍有擊殺（burn）→ tier 2；沒有就不是', () => {
  if (!has) throw new Error('pwBeatTier 未匯出');
  eq(Y.pwBeatTier([beat('hit'), beat('burn')], 1, warTie), 2, '第 1 拍有 burn');
  eq(Y.pwBeatTier([beat('hit'), beat('trait', 'hauntSee')], 1, warTie), 1, '第 1 拍沒 burn');
});
t('決定性最後一拍（第 3 拍且非平手）→ tier 2；平手不是', () => {
  if (!has) throw new Error('pwBeatTier 未匯出');
  eq(Y.pwBeatTier([beat('hit')], 3, warWin), 2, '第 3 拍分出勝負');
  eq(Y.pwBeatTier([beat('hit')], 3, warTie), 1, '第 3 拍平手');
  eq(Y.pwBeatTier([beat('hit')], 2, warWin), 1, '第 2 拍');
});
t('?fxtier=0（TIER_ON=false）時所有拍恆回 tier 2＝v0.53 行為', () => {
  if (!has) throw new Error('pwBeatTier 未匯出');
  const on = Y.PW_FX.TIER_ON;
  try {
    Y.PW_FX.TIER_ON = false;
    eq(Y.pwBeatTier([beat('trait', 'eliteBlind')], 1, warWin), 2, '大招也降回 2');
    eq(Y.pwBeatTier([beat('hit')], 1, warTie), 2, '一般拍也是 2');
  } finally { Y.PW_FX.TIER_ON = on; }
});
t('pwTierMs／pwBeatMinMs 只認 1／2／3，別的值一律當 2（不給 0 或 undefined）', () => {
  if (typeof Y.pwTierMs !== 'function') throw new Error('pwTierMs 未匯出');
  eq(Y.pwTierMs(1), TRAIT_MS_BY_TIER[1], 'tier 1');
  eq(Y.pwTierMs(3), TRAIT_MS_BY_TIER[3], 'tier 3');
  eq(Y.pwTierMs(9), TRAIT_MS_BY_TIER[2], '非法值退回 2');
  eq(Y.pwBeatMinMs(1), BEAT_MIN_MS_BY_TIER[1], '拍末 tier 1');
});

/* ── 3. 退路已刪：事件沒帶 ms 就 throw，不得沿用 900 ─────────────────── */
const src = (rel) => fs.readFileSync(path.join(path.dirname(HTML), rel), 'utf8');
t('js/trait-fx.js：沒有 `|| 900` 退路，且缺 detail.ms／baseMs 會 throw', () => {
  const s = src('js/trait-fx.js');
  // 剝註解再判：檔頭那段「舊版的 `Number(det.ms) || 900` 已刪」是說明，不是程式碼
  const code = s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/gm, ' ');
  if (/Number\(det\.ms\)\s*\|\|\s*900/.test(code)) throw new Error('`Number(det.ms) || 900` 退路還在（第二份事實來源）');
  if (!/ys:fx-trait 缺 detail\.ms/.test(code)) throw new Error('沒有「缺 detail.ms 就 throw」那條');
  if (!/ys:fx-trait 缺 detail\.baseMs/.test(code)) throw new Error('沒有「缺 detail.baseMs 就 throw」那條');
});
t('js/camera-director.js：LEAN.ms 退路已刪，缺 detail.ms 會 throw', () => {
  const s = src('js/camera-director.js');
  if (/Number\(d\.ms\)\s*\|\|\s*LEAN\.ms/.test(s)) throw new Error('`Number(d.ms) || LEAN.ms` 退路還在');
  if (!/ys:fx-trait 缺 detail\.ms/.test(s)) throw new Error('沒有「缺 detail.ms 就 throw」那條');
});

/* ── 4. 分母歸一：runtime 不得再有「語意＝招式時長」的 900 字面值 ─────── */
t('runtime（index.html＋js/）語意為招式時長的 900 字面值＝0 處', () => {
  const files = ['index.html'];
  const jsDir = path.join(path.dirname(HTML), 'js');
  const walk = (d, base) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    if (e.isDirectory()) walk(path.join(d, e.name), base + e.name + '/');
    else if (e.name.endsWith('.js')) files.push('js/' + base + e.name);
  });
  walk(jsDir, '');
  const RE_LINE = new RegExp('\r?\n');
  const NL6 = String.fromCharCode(10) + '      ';
  /* 註解要整段剝掉再掃：沿革敘述（「v0.53 的 900」之類）本來就會提到這個數字，
     留著掃只會逼人把歷史寫糊。剝法夠用即可——我們只找數字，不解析語法。 */
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
                        .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' ');
  /* 排除清單（每一處都在原始碼裡就地加了註解說明語意不是招式時長）：
     ① CSS 字重 ② camera-director 的牌桌機位過場時間 ③ 開服／等待延遲
     ④ PW_FX 那三張表本身——它們**就是**唯一事實來源，不是散落的複製品。 */
  const allow = [
    /font-weight:900/,
    /table: \{ dist: 3\.6/,
    /setTimeout\([^,]+,\s*900\)/,
    /TRAIT_MS_BY_TIER:\{/,
    /BEAT_MIN_MS_BY_TIER:\{/,
    /TIER_BASE_MS:\s*900/,
  ];
  const bad = [];
  for (const f of files) {
    strip(fs.readFileSync(path.join(path.dirname(HTML), f), 'utf8')).split(RE_LINE).forEach((line, i) => {
      if (!/900/.test(line)) return;
      if (allow.some((re) => re.test(line))) return;
      bad.push(`${f}:${i + 1} ${line.trim().slice(0, 110)}`);
    });
  }
  if (bad.length) throw new Error('還有 ' + bad.length + ' 處：' + NL6 + bad.join(NL6));
});

/* ── 5. TRAITS 只多了 tier 欄位，而且只有三尊三招有 ───────────────────── */
t('TRAITS 的 tier 欄位只掛在三尊三招上（其餘 27 支不寫，讀作 1）', () => {
  const withTier = Object.keys(Y.TRAITS).filter((k) => Y.TRAITS[k].tier !== undefined);
  eq(JSON.stringify(withTier.sort()), JSON.stringify(['eliteBlind', 'hauntAnswer', 'wardGuardAll']), '有 tier 的招');
  withTier.forEach((k) => eq(Y.TRAITS[k].tier, 3, k + ' 的 tier'));
});

console.log(`\n結果：${pass} 綠 ／ ${fail} 紅`);
process.exit(fail ? 1 : 0);

/* 招式時長常數的「治具側單一事實來源」（v0.54 三級視覺分級，凍結檔 F1）。
 *
 * 為什麼要有這個檔：v0.53 之前同一個 900 抄在 runtime 4 處＋治具 17 處，改一處漏二十處
 * （評審 §1.4「20 處 900 就是分岔的證據」）。runtime 收斂成 index.html 的 PW_FX.TRAIT_MS_BY_TIER，
 * 治具全部改讀這裡；**兩邊會不會分岔由 assertPageConsts() 機械擋住**——它從真實頁面把
 * PW_FX 的三張表撈出來逐鍵比對，不一致就 throw，而不是各自寫死然後祈禱有人記得同步。
 *
 * 紀律：治具裡不得再出現招式時長的字面毫秒數。要新的數值就改 index.html，這裡跟著改，
 * 然後靠 tests/fxtier.test.mjs 與 assertPageConsts 把兩邊釘在一起。
 */

/** 招式演出時長（ms）：1＝一般拍短版／2＝擊殺拍或決定性最後一拍（完整版）／3＝三尊大招 */
export const TRAIT_MS_BY_TIER = { 1: 260, 2: 900, 3: 1400 };

/** 拍末等待下限（ms），依該拍的 tier */
export const BEAT_MIN_MS_BY_TIER = { 1: 300, 2: 900, 3: 1400 };

/** flinchMs／atReserve／endMargin 等比縮放的基準（＝v0.53 的 PW_FX.TRAIT_MS） */
export const TIER_BASE_MS = 900;

/** 黑條 letterbox 的兩個 DOM id。★收尾版起這兩個 id 必須在 DOM 中不存在★
 *  （使用者 2026-09-11 裁甲，凍結檔 §2.1 修訂七：黑邊連同對決版面安全區移出本卷）。
 *  留著這個常數是為了讓 lbox-probe 的 L9 有東西可以斷言「不存在」，不是給誰再掛回去用的。 */
export const LETTERBOX_IDS = ['lbTop', 'lbBot'];

/** tier 3 的 CINEMA 機位（低角度仰視、拉近）；與 js/camera-director.js 的 CINEMA 同一組數字 */
export const CINEMA = { dist: 2.9, tilt: 8 };

export const TIERS = [1, 2, 3];

/** 招式時長；tier 不合法就 throw（不給預設值——預設值就是下一個 `||900`） */
export function msOf(tier) {
  const ms = TRAIT_MS_BY_TIER[tier];
  if (!Number.isFinite(ms)) throw new Error(`fx-consts: 沒有 tier=${tier} 的招式時長（合法值 ${TIERS.join('/')}）`);
  return ms;
}

/** 拍末下限；同上，不合法就 throw */
export function beatMinOf(tier) {
  const ms = BEAT_MIN_MS_BY_TIER[tier];
  if (!Number.isFinite(ms)) throw new Error(`fx-consts: 沒有 tier=${tier} 的拍末下限（合法值 ${TIERS.join('/')}）`);
  return ms;
}

/**
 * 與頁面（或 index.html 原始碼）撈到的常數逐鍵比對，不一致就 throw。
 * @param pageConsts {TRAIT_MS_BY_TIER, BEAT_MIN_MS_BY_TIER, TIER_BASE_MS}
 */
export function assertPageConsts(pageConsts) {
  if (!pageConsts) throw new Error('fx-consts: 沒拿到頁面常數（PW_FX 撈失敗？）');
  const bad = [];
  for (const t of TIERS) {
    const a = TRAIT_MS_BY_TIER[t], b = pageConsts.TRAIT_MS_BY_TIER && pageConsts.TRAIT_MS_BY_TIER[t];
    if (a !== b) bad.push(`TRAIT_MS_BY_TIER[${t}]: 治具 ${a} ≠ 頁面 ${b}`);
    const c = BEAT_MIN_MS_BY_TIER[t], d = pageConsts.BEAT_MIN_MS_BY_TIER && pageConsts.BEAT_MIN_MS_BY_TIER[t];
    if (c !== d) bad.push(`BEAT_MIN_MS_BY_TIER[${t}]: 治具 ${c} ≠ 頁面 ${d}`);
  }
  if (TIER_BASE_MS !== pageConsts.TIER_BASE_MS) bad.push(`TIER_BASE_MS: 治具 ${TIER_BASE_MS} ≠ 頁面 ${pageConsts.TIER_BASE_MS}`);
  if (bad.length) throw new Error('fx-consts 與頁面常數分岔：\n  ' + bad.join('\n  '));
  return true;
}

/** 從 index.html 原始碼撈 PW_FX 的三張表（headless 用；Playwright 端直接讀 window 的 PW_FX 更準） */
export function pageConstsFromHtml(html) {
  const tbl = (name) => {
    const m = html.match(new RegExp(name + '\\s*:\\s*\\{([^}]*)\\}'));
    if (!m) return null;
    const out = {};
    for (const kv of m[1].split(',')) {
      const p = kv.split(':');
      if (p.length === 2) out[Number(p[0].trim())] = Number(p[1].trim());
    }
    return out;
  };
  const base = html.match(/TIER_BASE_MS\s*:\s*(\d+)/);
  return {
    TRAIT_MS_BY_TIER: tbl('TRAIT_MS_BY_TIER'),
    BEAT_MIN_MS_BY_TIER: tbl('BEAT_MIN_MS_BY_TIER'),
    TIER_BASE_MS: base ? Number(base[1]) : null,
  };
}

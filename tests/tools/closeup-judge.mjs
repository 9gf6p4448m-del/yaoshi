// 近景切鏡卷 批 1（v0.45）：把 closeup-drive.mjs 錄下來的東西判成 P0–P7 的紅／綠。
// 門檻一律照驗收凍結檔 docs/experiments/2026-09-07-acceptance-duel-closeup-p1.md，本檔不另訂。
//   node tests/tools/closeup-judge.mjs <on1.json> [on2.json ...] [--off=<off.json>] [--base=<baseline.json>]
//        [--cancel=<cancel.json>] [--skipfocus=<skipfocus.json>]
//   --cancel     closeup-drive --cancel 的產物：P2 的「cancel 後 300ms 內回 4.2±0.05」
//   --skipfocus  closeup-drive --skipfocus 的產物：P2 同一條在真實 doSkip 上的複驗＋P4 的「跳過後 0 個殘留」
//   --camunit    closeup-cam-unit.mjs 的產物：hit 類切鏡的曲線形狀（真實路徑上與 punch 分不開，見該檔檔頭）
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { beatMinOf } from './fx-consts.mjs';

const args = process.argv.slice(2);
const files = [], opt = {};
for (const a of args) { const m = a.match(/^--([a-z0-9]+)=(.*)$/i); if (m) opt[m[1]] = m[2]; else files.push(a); }
const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
/* P2 的 nullCount 上限（凍結檔 §2.1 修訂二的新口徑「≤ 基準同 seeds 的 nullCount」）。
   ★R1 覆審 H6：不接受自由數字★——一版是 `--nullbase=<n>`，等於把及格線交到呼叫端手上
   （`--nullbase=10` 就全過）。現在只能給 `--basecj=<對基準樹跑出來的 cu-*.json>`，
   由**同一支判官**對那份基準產物跑一次，拿它的 nullCount 當上限：上限因此是實測值，
   呼叫端改不動（要改只能去改基準樹，那就不是基準了）。沒帶就是 0（最嚴），不是「不判」。
   基準怎麼產：closeup-drive --root=<基準樹> "<url>" <base.json>（同一組 seeds）。 */
const BASE_CJ = opt.basecj || null;
/** 上限＝**同一支判官**對基準產物跑一次得到的 nullCount（不是呼叫端給的數字）。 */
let NULL_BASE = 0;
let NULL_BASE_SRC = '沒帶 --basecj → 上限 0（最嚴）';
if (BASE_CJ) {
  const self = fileURLToPath(import.meta.url);
  const r = spawnSync(process.execPath, [self, BASE_CJ], { encoding: 'utf8' });
  const m = (r.stdout || '').match(/"nullCount":\s*(\d+)/);
  if (!m) throw new Error(`--basecj=${BASE_CJ} 判不出 nullCount（判官對基準產物跑失敗？）：${(r.stderr || '').slice(0, 300)}`);
  NULL_BASE = Number(m[1]);
  NULL_BASE_SRC = `${BASE_CJ} 實測 nullCount=${NULL_BASE}`;
}

const PW = { FOCUS_DIST: 2.6, DUEL_DIST: 4.2, FOCUS_DIM: 0.35, FOCUS_PER_BEAT: 2, FOCUS_DMG: 3, MAX_HITS: 5, DMG_MS: 600, BURN_MS: 420, ACTOR_CARD_MS: 700 };
const PUNCH_MS = 420; // camera-director 的 PUNCH.ms：這段時間內 dist 上疊著 punch，量 focus 曲線要排掉
const PUNCH_DIST = 0.6; // camera-director 的 PUNCH.dist
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
/** 某一幀上疊著多少 punch（0..2 的力道倍率×衰減）。導演只留最後一次 punch（punchAmp／punchU 每次重設），
 *  所以取「這一幀之前最近的一次」punch 或 burn（burn 走 onBurn → power 1.5）。 */
function punchPk(EV, t) {
  let last = null;
  for (const e of EV) {
    if (e.t > t) break;
    if (e.n === 'ys:fx-punch') last = { t: e.t, p: e.power === undefined ? 1 : e.power };
    else if (e.n === 'ys:fx-burn') last = { t: e.t, p: 1.5 };
  }
  if (!last) return 0;
  const u = (t - last.t) / PUNCH_MS;
  if (u >= 1 || u < 0) return 0;
  return Math.max(0.2, Math.min(2, last.p)) * (1 - easeOutCubic(u));
}
const out = { P0: {}, P1: {}, P2: {}, P3: {}, P4: {}, P5: {}, P7: {} };

const ons = files.map((f) => ({ f, d: rd(f) }));
const off = opt.off ? rd(opt.off) : null;
const base = opt.base ? rd(opt.base) : null;
const cancel = opt.cancel ? rd(opt.cancel) : null;
const skipf = opt.skipfocus ? rd(opt.skipfocus) : null;
const camunit = opt.camunit ? rd(opt.camunit) : null; // closeup-cam-unit.mjs 的決定性曲線（P2 的 hit 類形狀）

// ── P0 退路等價（雙向）────────────────────────────────────────────────────
if (off && base) {
  const keys = ['burn', 'burnFig', 'burnDom', 'trait', 'traitFig', 'beat', 'duels'];
  // 兩邊在「同一場已完成對決」上比原始總數（第三輪覆審 A，走乙案）。
  // closeup-drive 在每一次 ys:duel-end 當下對 FXC 存一份深拷貝（C.snaps[已演完幾場]），
  // 這裡取兩邊都達到過的最大場次當共同切點——驅動器停手時多半已經開了下一場但沒演完，
  // 那半場會污染**所有**全域計數器（FXC.beat 在 pwPlayBeat 內就加了，二版的切點表漏了它）。
  // 取到快照就直接比原始七欄，不再有任何 escape。
  const snapsA = off.cu.snaps || {}, snapsB = base.cu.snaps || {};
  const common = Object.keys(snapsA).map(Number).filter((n) => snapsB[String(n)]).sort((x, y) => x - y);
  const at = common.length ? common[common.length - 1] : null;
  const a = at !== null ? snapsA[String(at)] : (off.fxc || {});
  const b = at !== null ? snapsB[String(at)] : (base.fxc || {});
  const same = {};
  for (const k of keys) same[k] = [a[k], b[k], a[k] === b[k]];
  const fa = JSON.stringify(a.fights || []), fb = JSON.stringify(b.fights || []);
  const dom = (off.cu.dom || []).every((x) => !x.lamps && !x.card && !x.layer && x.gauge === 0 && x.floats === 0);
  const noFocus = !(a.focus > 0) && (off.cu.focus || []).filter((x) => x.kind !== 'base').length === 0;
  const onFocus = ons.every((x) => (x.d.fxc || {}).focus > 0);
  const evCount = (d, n) => (d.cu.ev || []).filter((e) => e.n === n).length;
  out.P0 = { cutAtCompletedDuel: at, snapshotsAvailable: { off: Object.keys(snapsA).length, base: Object.keys(snapsB).length },
    fxcSame: same, fightsSame: fa === fb, fightsLen: [(a.fights || []).length, (b.fights || []).length],
    domClean: dom, noFocusWhenOff: noFocus, focusWhenOn: onFocus,
    // 揭露：兩邊各自跑到哪裡（收手時的半場不進比對，但要看得到）
    rawTotalsAtStop: { off: { burn: (off.fxc || {}).burn, trait: (off.fxc || {}).trait, beat: (off.fxc || {}).beat, duels: (off.fxc || {}).duels },
      base: { burn: (base.fxc || {}).burn, trait: (base.fxc || {}).trait, beat: (base.fxc || {}).beat, duels: (base.fxc || {}).duels } },
    duelsStartedEnded: { off: [evCount(off, 'ys:duel'), evCount(off, 'ys:duel-end')], base: [evCount(base, 'ys:duel'), evCount(base, 'ys:duel-end')] },
    PASS: at !== null && keys.every((k) => same[k][2] === true) && fa === fb && dom && noFocus && onFocus };
}

// ── P1 事件規則 ───────────────────────────────────────────────────────────
{
  const rows = [];
  let hitFights = 0, burnFights = 0, fights = 0;
  for (const { f, d } of ons) {
    for (const fight of (d.fxc && d.fxc.fights) || []) {
      fights++;
      const focus = fight.focus || [], shown = fight.beatsShown || [];
      const perBeat = {};
      for (const x of focus) perBeat[x.beat] = (perBeat[x.beat] || 0) + 1;
      const capOk = Object.values(perBeat).every((n) => n <= PW.FOCUS_PER_BEAT);
      // 規則重算：每一拍「演出的那幾筆」裡第一筆 amount≥FOCUS_DMG 的 hit ＋（還有名額的話）第一隻 burn
      let ruleOk = true;
      for (const b of shown) {
        const want = [];
        const h = b.shown.find((x) => x.kind === 'hit' && x.amount >= PW.FOCUS_DMG);
        if (h) want.push({ kind: 'hit', actor: h.actor, target: h.target });
        if (b.burns.length && want.length < PW.FOCUS_PER_BEAT) want.push({ kind: 'burn', actor: b.burns[0].target, target: null });
        const got = focus.filter((x) => x.beat === b.beat).map((x) => ({ kind: x.kind, actor: x.actor, target: x.target }));
        if (JSON.stringify(want.slice(0, PW.FOCUS_PER_BEAT)) !== JSON.stringify(got)) {
          ruleOk = false;
          rows.push({ f, beat: b.beat, want, got });
        }
      }
      if (focus.some((x) => x.kind === 'hit')) hitFights++;
      if (focus.some((x) => x.kind === 'burn')) burnFights++;
      if (!capOk) rows.push({ f, capViolation: perBeat });
      out.P1.capOk = (out.P1.capOk === undefined ? true : out.P1.capOk) && capOk;
      out.P1.ruleOk = (out.P1.ruleOk === undefined ? true : out.P1.ruleOk) && ruleOk;
    }
  }
  out.P1.fights = fights; out.P1.hitFights = hitFights; out.P1.burnFights = burnFights;
  out.P1.bad = rows.slice(0, 6);
  out.P1.PASS = !!out.P1.capOk && !!out.P1.ruleOk && fights >= 6 && hitFights >= 3 && burnFights >= 2;
}

// ── P2 鏡頭曲線 ───────────────────────────────────────────────────────────
{
  const rows = [];
  for (const { f, d } of ons) {
    const F = d.cu.frames, EV = d.cu.ev;
    const busy = (t) => EV.some((e) => (e.n === 'ys:fx-punch' || e.n === 'ys:fx-burn') && t >= e.t - 16 && t <= e.t + PUNCH_MS);
    for (const fo of d.cu.focus.filter((x) => x.kind !== 'base')) {
      const nextT = d.cu.focus.filter((x) => x.kind !== 'base' && x.t > fo.t).map((x) => x.t)[0] || Infinity;
      // v0.54：這個尾巴＝「切鏡演完之後那一拍還會等多久」，以前寫死 900（＝當時唯一的 BEAT_MIN_MS）。
      // 招式時長依 tier 分級之後它就是第二份事實來源，改讀 fx-consts 的拍末下限。
      // 取 tier 2 的值＝與 v0.53 的量測窗口逐幀相同（tier 1 的拍由 nextT 自然切短，見下面的 need）。
      const tailMs = beatMinOf(2);
      const endT = Math.min(nextT, fo.t + fo.ms + tailMs);
      const win = F.filter((s) => s.t >= fo.t && s.t <= endT);
      const quiet = win.filter((s) => !busy(s.t));
      // 「推到多近」用**原始**最小值判：punch 單獨最多只能從 4.2 減 PUNCH.dist×power(≤2)＝1.2 → 3.0，
      // 仍然大於門檻 2.75，所以 minD ≤ 2.75 只可能是 focus 造成的（punch 不會冒名頂替）。
      // 反過來若只用靜幀，命中拍每 45–260ms 一次 punch 會把整段 650ms 排光（實測 quiet 只剩 0–7 幀），
      // 量到的是回位之後的尾巴 3.2–4.2，那是「量測位置錯了」不是「沒推近」。
      const minD = win.length ? Math.min(...win.map((s) => s.l)) : null;
      const minQuiet = quiet.length ? Math.min(...quiet.map((s) => s.l)) : null;
      // 回位：ms+outMs(220)+120 之後（且下一次 focus 之前）該回到 4.2
      const backW = F.filter((s) => s.t >= fo.t + fo.ms + 340 && s.t <= endT && !busy(s.t));
      const back = backW.length ? Math.min(...backW.map((s) => Math.abs(s.l - PW.DUEL_DIST))) : null;
      // 單調（審查 MEDIUM-2）：以前只看靜幀序列，命中拍每 45–260ms 就一次 punch，
      // 6 次 hit 切鏡有 3 次 quiet=0 → 空序列恆綠，那條子句沒有鑑別力。改成兩條一起看：
      //  (a) 靜幀版：**要有 ≥8 幀才判**，不足標 null（不算過）
      //  (b) 扣掉 punch 解析包絡的全序列版：punch 是 camera-director 自己算的
      //      pk = clamp(power,0.2,2)×(1−easeOutCubic(min(1,(t−t0)/420)))，dist 上少掉 PUNCH.dist×pk，
      //      把它加回去就是「沒有 punch 的話這一幀會在哪」。這個重建有沒有效，看下面 residual：
      //      非 focus 期間重建值必須回到 4.2（同一支重建套在已知答案上驗過，才敢拿去判 focus 段）。
      const mono = (seq, tol) => {
        let rev = 0, phase = 'down';
        for (let k = 1; k < seq.length; k++) {
          if (seq[k].t - seq[k - 1].t > 150) continue;
          const dv = seq[k].v - seq[k - 1].v;
          if (phase === 'down' && dv > tol) phase = 'up';
          else if (phase === 'up' && dv < -tol) rev++;
        }
        return rev;
      };
      const corr = win.map((s) => ({ t: s.t, v: s.l + PUNCH_DIST * punchPk(EV, s.t) }));
      // v0.54：靜幀門檻不再寫死 8 幀，改成**依這一次的視窗長按比例換算**。
      // 為什麼：tier 1 的拍事件更密、punch 把更多幀標成 busy，固定 8 幀會讓 monoQuietOk 大量變成 null，
      // 而 null 在既有判定裡是「不算過」＝靜默恆綠（凍結檔 F4 明文要擋的那個坑）。
      // 基準＝tier 2 的視窗（fo.ms + 拍末下限）對應 8 幀，所以 tier 2 的判定與 v0.53 逐項相同。
      /* need 的推導（★R1 覆審 M3：地板 3 不是自由參數★）：
         比例部分＝v0.53 的固定門檻 8 幀，按「這一次實際視窗長 / 基準視窗長（fo.ms + 拍末下限）」等比縮放，
         所以 tier 2 下 need 恆等於 8（與 v0.53 逐項相同），拍變短時才跟著降。
         地板 3 的來源：`mono()` 判的是「單調序列有沒有反轉」，一次反轉至少要兩個相鄰差、
         也就是**至少 3 個取樣點**；2 點只有 1 個差，1 點連差都沒有，斷言必然恆真（零鑑別力）。
         所以 3 是「這個斷言還有意義的最小樣本數」，不是挑出來的數字。
         上界：endT − fo.t ≤ fo.ms + tailMs ⇒ need ≤ 8，門檻只會降不會升；降到地板仍判不了的，
         就會落進 nullCount（不算過），由上面的 NULL_BASE 擋。 */
      const need = Math.max(3, Math.round(8 * (endT - fo.t) / (fo.ms + tailMs)));
      const revQuiet = mono(quiet.map((s) => ({ t: s.t, v: s.l })), 0.01);
      const revCorr = mono(corr, 0.03);
      const row = { f, kind: fo.kind, ms: fo.ms, frames: win.length, quiet: quiet.length,
        minD: minD === null ? null : +minD.toFixed(3), minQuiet: minQuiet === null ? null : +minQuiet.toFixed(3),
        back: back === null ? null : +back.toFixed(4), revQuiet, revCorr,
        deepOk: minD !== null && minD <= PW.FOCUS_DIST + 0.15,
        backOk: back === null ? null : back <= 0.05,
        need,
        monoQuietOk: quiet.length >= need ? revQuiet === 0 : null,
        monoCorrOk: corr.length >= need ? revCorr === 0 : null };
      rows.push(row);
    }
  }
  const judged = rows.filter((r) => r.backOk !== null);
  const mq = rows.filter((r) => r.monoQuietOk !== null);
  const mc = rows.filter((r) => r.monoCorrOk !== null);
  const hitMono = rows.filter((r) => r.kind === 'hit' && (r.monoQuietOk !== null || r.monoCorrOk !== null));
  // 重建的鑑別力自檢：非 focus 期間（任一場對決內、離所有 focus 都 >1.2s）扣掉 punch 之後該回到 4.2
  const resid = [];
  for (const { d } of ons) {
    const foci = d.cu.focus.filter((x) => x.kind !== 'base');
    const inDuel = (t) => (d.cu.ev || []).some((e) => e.n === 'ys:duel' && t > e.t + 3000)
      && !(d.cu.ev || []).some((e) => e.n === 'ys:duel-end' && t > e.t && t < e.t + 4000);
    for (const s of d.cu.frames) {
      if (!inDuel(s.t)) continue;
      if (foci.some((x) => s.t >= x.t - 300 && s.t <= x.t + x.ms + 700)) continue;
      resid.push(Math.abs(s.l + PUNCH_DIST * punchPk(d.cu.ev, s.t) - PW.DUEL_DIST));
    }
  }
  resid.sort((a, b) => a - b);
  out.P2 = { n: rows.length, hit: rows.filter((r) => r.kind === 'hit').length, deepOk: rows.filter((r) => r.deepOk).length,
    backOk: judged.filter((r) => r.backOk).length + '/' + judged.length,
    monoQuiet: mq.filter((r) => r.monoQuietOk).length + '/' + mq.length,
    // F4：靜幀不足而回 null 的筆數。null 不算過，所以它必須是 0——不得拿 null 當通過。
    nullCount: rows.filter((r) => r.monoQuietOk === null).length,
    nullBase: NULL_BASE,
    nullBaseSrc: NULL_BASE_SRC,
    monoCorr: mc.filter((r) => r.monoCorrOk).length + '/' + mc.length,
    hitMonoJudgable: hitMono.length,
    punchRebuildResid: resid.length ? { n: resid.length, p50: +resid[Math.floor(resid.length / 2)].toFixed(4), p95: +resid[Math.floor(resid.length * 0.95)].toFixed(4), max: +resid[resid.length - 1].toFixed(4) } : null,
    rows: rows.slice(0, 40),
    // monoCorr（扣 punch 的重建版）**只揭露不判**：它的自檢過不了（見 punchRebuildResid），
    // 依 02 §6.1 第 4 條，取不到可信路徑的重建不得拿來否證或放行。
    // hit 類的曲線形狀改由 closeup-cam-unit.mjs 的決定性環境負責（U1/U2/U3），這裡把它的結果併進來。
    camUnit: camunit ? camunit.res : null,
    PASS: rows.length > 0 && rows.every((r) => r.deepOk)
      // F4（凍結檔 §2.1 修訂二）：nullCount 不得超過基準（--nullbase）。
      // 原本寫「必須 0」，但基準 v0.53 本來就有 2 筆（rows 6/8 的 quiet=0，
      // 成因是命中拍的 punch 把靜幀排光），那條門檻無論實作對錯都過不了＝恆假。改成「不比基準差」。
      && rows.filter((r) => r.monoQuietOk === null).length <= NULL_BASE
      && mq.length > 0 && mq.every((r) => r.monoQuietOk)
      && judged.length > 0 && judged.every((r) => r.backOk)
      && !!camunit && camunit.res.PASS === true };
  // 守衛（第三輪覆審 B）：中斷後若已經來了新的一次 focus，鏡頭本來就該再壓近，不能拿來判「有沒有回位」。
  const backAfter = (d) => {
    const marks = (d.cu.skips || []).filter((x) => x.why === 'cancel-probe' || x.why === 'skip-btn');
    const all = (d.cu.skips || []).filter((x) => x.rel === 300);
    let byFocus = 0, byPunch = 0, byEnd = 0;
    const S = all.filter((x) => {
      const t0 = marks.filter((m) => m.t <= x.t).map((m) => m.t).pop();
      const ev = d.cu.ev || [];
      // 中斷之後又來一次切鏡：鏡頭本來就該再壓近
      if (t0 !== undefined && ev.some((e) => e.n === 'ys:fx-focus' && e.t > t0 && e.t <= x.t)) { byFocus++; return false; }
      // 對決已經收了：基座機位在往牌桌的 3.6 走，4.2 不再是該回的位置
      if (t0 !== undefined && ev.some((e) => e.n === 'ys:duel-end' && e.t > t0 && e.t <= x.t)) { byEnd++; return false; }
      // punch 疊在同一條 dist 上（與 P2 主窗的 busy() 同一條規則）
      if (ev.some((e) => (e.n === 'ys:fx-punch' || e.n === 'ys:fx-burn') && x.t - e.t >= 0 && x.t - e.t <= PUNCH_MS)) { byPunch++; return false; }
      return true;
    });
    return { at300: S.map((x) => (x.l === null ? null : +x.l.toFixed(3))), judged: S.length, total: all.length,
      skipped: { byNextFocus: byFocus, byDuelEnd: byEnd, byPunch: byPunch },
      ok: S.length > 0 && S.every((x) => x.l !== null && Math.abs(x.l - PW.DUEL_DIST) <= 0.05) };
  };
  if (cancel) { out.P2.cancelBack = backAfter(cancel); out.P2.PASS = out.P2.PASS && out.P2.cancelBack.ok; }
  if (skipf) { out.P2.skipBack = backAfter(skipf); out.P2.PASS = out.P2.PASS && out.P2.skipBack.ok; }
}

// ── P3 退暗 ───────────────────────────────────────────────────────────────
{
  const bad = [], stat = { dimmed: [], kept: [], restored: [], burning: [] };
  let stale = 0, staleJudged = 0, sampleCount = 0;
  // 退暗包絡（duel-figures 的 FOCUS：進 160ms ease-out、停到 ms、回 220ms ease-in-out）。
  // 卡幀時用「最後畫的那一幀」的時刻算期望值，樣本才不必丟。
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const envK = (e, ms) => {
    if (e <= 0) return 0;
    if (e < 160) return 1 - Math.pow(1 - e / 160, 3);
    if (e <= ms) return 1;
    const u = (e - Math.max(ms, 160)) / 220;
    return u >= 1 ? 0 : 1 - easeIO(u);
  };
  for (const { f, d } of ons) {
    const EV = d.cu.ev;
    const frames = d.cu.frames || [];
    const foci = d.cu.focus.filter((x) => x.kind !== 'base');
    for (let i = 0; i < foci.length; i++) {
      const fo = foci[i];
      // 這一次切鏡的有效期到「下一次切鏡」或「被提前收掉」為止（v0.45 二版：招式會派 ys:fx-focus-end、
      // 跳過會派 ys:fx-trait-cancel）。之後的抽樣量到的是回位中的值，不該拿去判「有沒有退暗」。
      const endEv = (d.cu.ev || []).find((e) => (e.n === 'ys:fx-focus-end' || e.n === 'ys:fx-trait-cancel') && e.t > fo.t);
      const nextT = Math.min(foci[i + 1] ? foci[i + 1].t : Infinity, endEv ? endEv.t : Infinity);
      for (const s of fo.samples) {
        // 抽樣新鮮度（第三輪覆審 C：不丟樣本）：退暗是**每幀**寫上去的，卡幀時讀到的是前一幀的值。
        // 實測 seed=1 duel6 有一次 229ms 頓幀，dt=260 的抽樣落後最後一幀 209ms、讀到 focus+51ms 的
        // 中途值 0.52（＝包絡 k≈0.74）。二版的作法是把這種樣本丟掉——那是第四次放寬。
        // 三版改成：**用最後畫的那一幀的時刻**重算該時刻的包絡期望值，樣本照判（見下面的 expDim）。
        sampleCount++;
        const lastFrame = frames.filter((x) => x.t <= s.t).pop();
        const lagMs = lastFrame ? s.t - lastFrame.t : Infinity;
        const effT = lastFrame ? Math.min(s.t, lastFrame.t) : s.t; // 這個 opacity 是哪一刻畫上去的
        if (lagMs > 60) stale++;
        const burning = (side, unit) => EV.some((e) => e.n === 'ys:fx-burn' && e.side === side && e.unit === unit && s.t >= e.t - 20 && s.t <= e.t + PW.BURN_MS + 260);
        const after = s.dt > fo.ms; // 回全景之後的那一筆
        if (s.t >= nextT) continue; // 這一筆抽樣時下一次 focus 已經開始了，要判也是判那一次的名單
        for (const g of s.figs) {
          if (g.op == null) continue;
          if (!g.vis) continue; // 已經燒完收起來的尊不在畫面上，退暗與否無意義
          const keep = (g.side === fo.side && g.unit === fo.actor) || (g.side === fo.foeSide && g.unit === fo.target);
          const burn = burning(g.side, g.unit);
          const expBase = (g.skin !== 'creature' && g.body === 'haunt') ? 0.5 : 1;
          const row = { f, kind: fo.kind, fi: i, duel: fo.duel, dt: s.dt, id: g.side + g.unit, body: g.body, skin: g.skin, op: g.op, vis: g.vis, keep, burn };
          if (burn) { stat.burning.push(row); continue; } // 燒毀中的尊：opacity 歸燒毀曲線管，另判（見下）
          if (after) {
            stat.restored.push(row);
            if (Math.abs(g.op - expBase) > 0.02) bad.push({ ...row, why: 'restore', exp: expBase });
          } else if (s.dt >= 260) {
            if (keep) { stat.kept.push(row); if (g.op < 0.95) bad.push({ ...row, why: 'keep<0.95' }); }
            else if (lagMs <= 60) {
              stat.dimmed.push(row);
              if (g.op > PW.FOCUS_DIM + 0.05) bad.push({ ...row, why: 'dim>0.40' });
            } else {
              // 卡幀樣本：比「那一幀該有的退暗量」——k 由 effT 重算，容差 0.08
              //（setFigureOpacity 量化 1/50 ＋ 幀間隔造成的時間誤差）。仍然是判，不是丟。
              const k = envK(effT - fo.t, fo.ms);
              const expDim = 1 - (1 - PW.FOCUS_DIM) * k;
              staleJudged++;
              stat.dimmed.push({ ...row, stale: true, expDim: +expDim.toFixed(3) });
              if (g.op > expDim + 0.08) bad.push({ ...row, why: 'dim>expected(stale)', expDim: +expDim.toFixed(3), lagMs: +lagMs.toFixed(0) });
            }
          }
        }
      }
    }
  }
  // 燒毀中的尊：整條抽樣序列不得回升（退暗後又「復原」會是一個往上的跳）
  const byKey = {};
  // 序列要「同一場、同一次 focus、同一尊」才比得到——不同場次同一個格位 id 會被重新占用（reinforce），
  // 混在一起比會把「新換上來的那一尊是全亮的」誤讀成「燒到一半又亮回來」
  for (const r of stat.burning) { const k = r.f + '|' + r.duel + '|' + r.fi + '|' + r.id; (byKey[k] = byKey[k] || []).push(r); }
  let burnRise = 0;
  for (const k in byKey) {
    const seq = byKey[k].sort((a, b) => a.dt - b.dt);
    for (let i = 1; i < seq.length; i++) if (seq[i].op - seq[i - 1].op > 0.02) { burnRise++; bad.push({ ...seq[i], why: 'burn-op-rise', prev: seq[i - 1].op }); }
  }
  // ── P3 追加：中斷（ys:fx-trait-cancel＝按跳過）之後的退暗（HIGH-1）──────────
  // 兩件事一起判：① cancel 後 300ms 內每一尊回到原值 ② 期間任何一幀都不得比 cancel 當下更暗
  //（更暗＝收到中斷還繼續往下退暗，人形端少了鏡頭端那支 focusFall 旗標就會這樣）
  const cbad = [];
  let cN = 0, cDeeper = 0, cBack = 0, cBackN = 0, cSkipped = 0;
  for (const { f, d } of ons.concat(cancel ? [{ f: opt.cancel, d: cancel }] : []).concat(skipf ? [{ f: opt.skipfocus, d: skipf }] : [])) {
    for (const c of d.cu.cancels || []) {
      const at0 = (c.samples || []).find((s) => s.dt === 0);
      if (!at0) continue;
      const base0 = {};
      for (const g of at0.figs) if (g.op != null && g.vis) base0[g.side + g.unit] = g;
      // 這一次中斷時本來就沒有退暗（沒人被壓暗）＝這一筆沒有鑑別力，不計入
      if (!Object.values(base0).some((g) => g.op < 0.9)) continue;
      cN++;
      const burning = (t, side, unit) => (d.cu.ev || []).some((e) => e.n === 'ys:fx-burn' && e.side === side && e.unit === unit && t >= e.t - 20 && t <= e.t + PW.BURN_MS + 260);
      // 守衛（第三輪覆審 B）：中斷之後若又來一次 ys:fx-focus，那之後的抽樣量到的是**新的一次切鏡**
      // 正在退暗（seed 7 實測 cancel 後 97ms 就來新 focus），不能算成「中斷沒收乾淨」。
      const nextFocusT = (d.cu.ev || []).filter((e) => e.n === 'ys:fx-focus' && e.t > c.t).map((e) => e.t)[0] || Infinity;
      for (const s of (c.samples || [])) {
        if (s.dt === 0) continue;
        if (s.t >= nextFocusT) { cSkipped++; continue; }
        for (const g of s.figs) {
          if (g.op == null || !g.vis) continue;
          const b = base0[g.side + g.unit];
          if (!b || burning(s.t, g.side, g.unit)) continue;
          if (g.op < b.op - 0.02) { cDeeper++; cbad.push({ f, why: 'cancel-deeper', dt: s.dt, id: g.side + g.unit, at0: b.op, now: g.op }); }
          if (s.dt === 300) {
            cBackN++;
            const expBase = (g.skin !== 'creature' && g.body === 'haunt') ? 0.5 : 1;
            if (Math.abs(g.op - expBase) <= 0.02) cBack++;
            else cbad.push({ f, why: 'cancel-not-restored', id: g.side + g.unit, op: g.op, exp: expBase });
          }
        }
      }
    }
  }

  out.P3 = { samples: sampleCount, /* 抽樣筆數（一筆＝一次 snapFigs，含全場的尊） */ staleSamples: stale, staleJudgedByEnvelope: staleJudged, cancelSamples: cN, cancelSkippedByNextFocus: cSkipped, cancelDeeper: cDeeper, cancelBack: cBack + '/' + cBackN, cancelBad: cbad.slice(0, 8),
    figRowsDimmed: stat.dimmed.length, /* 逐尊列數（一筆抽樣會產生多列） */
    dimmed: stat.dimmed.length, dimMax: stat.dimmed.length ? Math.max(...stat.dimmed.map((r) => r.op)) : null,
    kept: stat.kept.length, keptMin: stat.kept.length ? Math.min(...stat.kept.map((r) => r.op)) : null,
    restored: stat.restored.length, burning: stat.burning.length, burnRise,
    bad: bad.slice(0, 10),
    PASS: stat.dimmed.length > 0 && stat.kept.length > 0 && stat.restored.length > 0 && burnRise === 0 && bad.length === 0
      && cN > 0 && cbad.length === 0 && cBack === cBackN };
}

// ── P4 跳字 ───────────────────────────────────────────────────────────────
{
  const bad = [];
  let n = 0, maxLive = 0, goneOk = 0, posOk = 0, posN = 0, outsideDuel = 0, unitN = 0, killN = 0, burnEv = 0, sideOk = 0, sideJudged = 0, sideAmbig = 0, sideNoBox = 0, sideViaCol = 0, underCrossCol = 0;
  for (const { f, d } of ons) {
    // 每筆演出的 hit 類事件都要有一個跳字：分母＝fights[].beatsShown[].shown
    let shownHits = 0;
    for (const fight of (d.fxc && d.fxc.fights) || []) for (const b of fight.beatsShown || []) shownHits += b.shown.length;
    out.P4.shownHits = (out.P4.shownHits || 0) + shownHits;
    burnEv += (d.fxc || {}).burn || 0; // 傷害可讀性批 2-a：每一筆燒毀對應一個「−1 隻」跳字
    /* 覆審 HIGH-2：期望側別只能從**引擎真相**推——`fights[].beatsShown[]`。
       規則：burn 那一筆的 side 就是被燒的那一方；其餘交鋒的 side 是行動方、target 在**對面**。
       建一張 (unit id, 金額) → 期望側別 的表；同一組鍵若兩側都出現過就標成 ambiguous 不判（不灌水）。 */
    /* 鍵要含**場次**：不同場對決的 unit id 會重複，跨場合併會製造假的 ambiguous
       （覆審第二輪實測本輪 8 筆 ambiguous 有一半是這樣來的）。fights[] 的索引就是場次序號，
       跟 closeup-drive 記在每個跳字上的 duel 對得起來（兩邊都是從 1 數起）。 */
    const wantBy = new Map(); // 'duel|key' → Set(side)
    const put = (dn, k, v) => { const kk = dn + '|' + k; const st = wantBy.get(kk) || new Set(); st.add(v); wantBy.set(kk, st); };
    ((d.fxc && d.fxc.fights) || []).forEach((fight, fi) => {
      for (const bt of fight.beatsShown || []) {
        for (const x of bt.shown || []) put(fi + 1, 'h:' + x.target + ':' + (x.amount | 0), x.side === 'B' ? 'A' : 'B');
        for (const x of bt.burns || []) put(fi + 1, 'u:' + x.target, x.side);
      }
    });
    d.__wantBy = wantBy;
    for (const r of d.cu.dmg) {
      n++;
      const isUnitFloat = /(^|\s)unit(\s|$)/.test(r.cls);
      let thisSideOk = false; // 這一筆自己的側別判定結果（per-record 降級要用）
      maxLive = Math.max(maxLive, r.live);
      // 移除：以 MutationObserver 量到的那一次移除為準（DMG_MS+100 內），沒量到才退回旗標
      const removedIn = r.removedAt != null ? r.removedAt - r.t : null;
      const removedOk = (removedIn !== null && removedIn <= PW.DMG_MS + 100) || r.gone === true;
      if (removedOk) goneOk++; else bad.push({ f, why: 'not-removed', t: r.t, text: r.text, removedIn });
      // 觀察者回呼本身會晚幾毫秒（MutationObserver 批次），所以這個數字是**上界**；
      // 真正的判準是上一行：+700ms 那一刻已經不在 DOM（或已被回收給下一筆）就算移除。
      if (removedIn !== null) out.P4.removeMsObserved = Math.max(out.P4.removeMsObserved || 0, +removedIn.toFixed(0));
      // 位置：3D 尊在場時量「跳字中心到那一尊畫面方框的距離」（在方框內＝0），
      // 方框是治具自己從世界包圍盒＋canvas rect 算的，跟 pwScreenOf 不同路（審查 MEDIUM-1）。
      if (r.mode === 'fig' && r.box) {
        posN++;
        /* 覆審 HIGH-2：期望側別取引擎真相，位置改成**兩側相比**——
           「跳字中心到期望那一側那一尊的距離 < 到對面那一側同 id 那一尊的距離」。
           只比自己那一側的距離是自我比對：把產品的 tside 還原成 v0.45 的錯邊，
           因為 dataset.side 跟著一起錯，量到的還是「離自己說的那一尊很近」，永遠綠。 */
        const key = (r.duel === undefined ? 1 : r.duel) + '|' + (isUnitFloat ? ('u:' + r.unit) : ('h:' + r.unit + ':' + Math.abs(parseInt(String(r.text).replace(/[^0-9]/g, ''), 10) || 0)));
        const st = d.__wantBy && d.__wantBy.get(key);
        const wantSide = st && st.size === 1 ? [...st][0] : null;
        const distTo = (bx) => { if (!bx) return null; const ddx = Math.max(bx.x0 - r.cx, 0, r.cx - bx.x1), ddy = Math.max(bx.y0 - r.cy, 0, r.cy - bx.y1); return Math.hypot(ddx, ddy); };
        // 3D 方框優先；那一尊在對面拿不到方框時（還沒建模／已收起來）退回兩欄的 DOM 方框，
        // 兩者都拿不到才記成 sideNoBox（**不靜默丟棄**，覆審第二輪抓到本輪有 10 筆這樣消失）
        let bW = null, bF = null, via = null;
        if (wantSide) {
          const foeSide = wantSide === 'A' ? 'B' : 'A';
          const f3 = (sd) => (sd === 'A' ? r.boxA : r.boxB), fc = (sd) => (sd === 'A' ? r.colA : r.colB);
          if (f3(wantSide) && f3(foeSide)) { bW = f3(wantSide); bF = f3(foeSide); via = 'fig'; }
          else if (fc(wantSide) && fc(foeSide)) { bW = fc(wantSide); bF = fc(foeSide); via = 'col'; }
        }
        if (wantSide && bW && bF) {
          sideJudged++; if (via === 'col') sideViaCol++;
          const dW = distTo(bW), dF = distTo(bF);
          if (!(dW < dF)) bad.push({ f, why: 'side', text: r.text, wantSide: wantSide, via: via, dWant: +dW.toFixed(1), dFoe: +dF.toFixed(1), datasetSide: r.side });
          else { sideOk++; thisSideOk = true; }
        } else if (!wantSide) sideAmbig++;
        else sideNoBox++;
        const dx = Math.max(r.box.x0 - r.cx, 0, r.cx - r.box.x1);
        const dy = Math.max(r.box.y0 - r.cy, 0, r.cy - r.box.y1);
        const dist = Math.hypot(dx, dy);
        if (dist <= 80) posOk++; else bad.push({ f, why: 'pos-box', dist: +dist.toFixed(1), text: r.text, box: r.box, cx: r.cx, cy: r.cy });
        // 旁證（與投影算式無關）：跳字底下要嘛是 3D 舞台的 canvas，要嘛是**目標那一側**的欄位容器。
        // #duel 是整片覆蓋層、#dL/#dR 是左右兩欄的透明容器，所以「落在對面那一欄」才是真的擺錯邊。
        // 用「祖先鏈上的欄位容器」判：#dL/#dR 裡面那幾層 div 沒有 id（fdir／fav／fnm／pwbody），
        // 只看 tagName+id 會變成 'DIV' 而誤紅（第二輪覆審）。
        const wantCol = r.side === 'B' ? 'dR' : 'dL';
        // underCol：'dL'/'dR'＝落在某一側的欄位容器、'duel'＝落在覆蓋層但不在任一欄、
        // null＝連 #duel 都不在（多半是 3D canvas 本身）。第三輪覆審 E：null 只在 elementFromPoint
        // 真的落在 #duel 之外時才放行，並且要計數揭露，不能當成萬用通行證。
        // 批 2-a：「−1 隻」刻意往下讓開 UNIT_DY(44px) 才不跟傷害數字重疊，
        // 那個位移會讓 elementFromPoint 落到別的欄位容器上（3D 尊的投影點本來就不一定在自己那半邊）。
        // 這一種跳字改由上面那條「到自己那一尊方框的距離 ≤80px」把關（44 < 80，仍然管得住），
        // 這個旁證跳過並計數揭露。
        // 覆審 MEDIUM-4：「−1 隻」不再整類豁免——closeup-drive 已改成在 (cx, cy−UNIT_DY) 取樣，
        // 位移補回去之後這條旁證對它一樣有效（`underDy` 記著實際補了多少）。
        let okUnder;
        if (r.underCol === undefined) okUnder = !r.under || /^CANVAS/.test(r.under); // 舊格式資料
        else if (r.underCol === wantCol || r.underCol === 'duel') okUnder = true;
        else if (r.underCol === null) { okUnder = true; outsideDuel++; }
        else okUnder = false; // 落在對面那一欄＝真的擺錯邊
        /* 3D 尊在場時，這條 DOM 旁證會誤紅：人形的投影點跟 DOM 兩欄的分界線沒有對齊，
           一尊站在中線附近時 elementFromPoint 就落到對面那一欄（本輪 30 個跳字裡 1 個）。
           上面那條「引擎真相決定期望側別 → 比兩側方框距離」是更強、而且來源獨立的檢查
           （突變版實測 sideOk 2/11＝會紅），所以這裡對「3D 尊且側別已判過且通過」的那幾筆
           降級為揭露計數；退回隻數牌的 badge 模式仍然照舊硬判。 */
        // 降級要 per-record：只有「**這一筆**的側別判過而且通過」才降成揭露；
        // 原本寫成 sideOk > 0（整批只要有一筆過就全部降級）＝把別筆的通過拿來替這一筆背書（覆審第二輪）。
        if (!okUnder) {
          if (r.mode === 'fig' && thisSideOk) underCrossCol++;
          else bad.push({ f, why: 'under', under: r.under, col: r.underCol, want: wantCol, side: r.side, text: r.text });
        }
      } else if (r.mode === 'badge' && r.badge) {
        posN++;
        const dist = Math.hypot(r.cx - r.badge.x, r.cy - r.badge.y);
        if (dist <= 60) posOk++; else bad.push({ f, why: 'pos-badge', dist: +dist.toFixed(1), text: r.text });
      } else if (r.mode === 'fig') {
        // 3D 尊當下量不到方框（燒完收起來／GLB 沒到）：不灌水當通過，記成未判
        out.P4.unmeasured = (out.P4.unmeasured || 0) + 1;
      }
      // 傷害可讀性批 2-a（v0.49）：#dmgLayer 裡現在有三種跳字，文字格式不再只有「−數字」——
      //   .dmgfloat            交鋒的傷害數字「−n」
      //   .dmgfloat.kill       同上但放大＋系色底光（擊殺；文字仍是「−n」）
      //   .dmgfloat.unit       燒毀那一筆的「−1 隻」灰白小字
      // 舊判準 /^−\d+$/ 會把每一個「−1 隻」判成 text 違規（本卷實測 30 個跳字裡有 8 個誤紅）。
      const isUnit = isUnitFloat;
      if (isUnit) { unitN++; if (r.text !== '−1 隻') bad.push({ f, why: 'unit-text', text: r.text }); }
      else if (!/^−\d+$/.test(r.text)) bad.push({ f, why: 'text', text: r.text });
      if (/(^|\s)kill(\s|$)/.test(r.cls)) killN++;
      if (/kill/.test(r.cls) && !/dmgfloat kill/.test(r.cls)) bad.push({ f, why: 'cls', cls: r.cls });
    }
  }
  out.P4.n = n; out.P4.floats = n; out.P4.maxLive = maxLive; out.P4.underOutsideDuel = outsideDuel; out.P4.removed = goneOk; out.P4.posOk = posOk; out.P4.posN = posN;
  out.P4.bad = bad.slice(0, 8);
  if (skipf) {
    const s = skipf.cu.skips.filter((x) => x.rel !== undefined);
    out.P4.beforeSkipFloats = (skipf.cu.skips.find((x) => x.why === 'skip-btn') || {}).floats0;
    out.P4.afterSkipFloats = s.map((x) => x.floats);
    out.P4.skipClean = s.length > 0 && s.every((x) => x.floats === 0) && out.P4.beforeSkipFloats > 0;
  }
  // 「每筆演出的交鋒都要有一個跳字」改成硬斷言（審查 MEDIUM-1）：以前只印數字沒判。
  // 批 2-a 之後分母要扣掉「−1 隻」那一種：它對的是燒毀事件，不是交鋒。
  // 分母講清楚：judged（真的判了幾筆）／ambiguous（同鍵兩側都出現過）／noBox（兩種方框都拿不到）
  out.P4.sideOk = sideOk; out.P4.sideJudged = sideJudged; out.P4.sideAmbiguous = sideAmbig;
  out.P4.sideNoBox = sideNoBox; out.P4.sideViaColumnBox = sideViaCol; out.P4.underCrossCol = underCrossCol;
  out.P4.sideCoverage = n ? +((sideJudged / n) * 100).toFixed(1) : null;
  out.P4.unitFloats = unitN; out.P4.killFloats = killN; out.P4.hitFloats = n - unitN; out.P4.burnEvents = burnEv;
  out.P4.oneToOne = out.P4.shownHits === out.P4.hitFloats;
  // 「每筆燒毀一個『−1 隻』」：舊錄影（v0.45／v0.48）沒有這一種跳字，unitN 為 0 時不判（回 null），
  // 這條的正式守衛在 tests/tools/dmg-readability.mjs 的 dom 模式（R4），這裡只是不讓舊判準誤紅。
  out.P4.unitOneToOne = unitN === 0 ? null : unitN === burnEv;
  // 側別那一條要有樣本才算數（0 樣本＝fail-closed，不讓「沒判到」冒充「判過了」）
  out.P4.PASS = n > 0 && bad.length === 0 && maxLive <= PW.MAX_HITS && goneOk === n && posOk === posN
    && out.P4.oneToOne && out.P4.unitOneToOne !== false && sideJudged > 0 && sideOk === sideJudged
    && (out.P4.unmeasured || 0) === 0 && (!skipf || out.P4.skipClean);
}

// ── P5 HUD ────────────────────────────────────────────────────────────────
{
  const bad = [];
  let lamps = 0, gauges = 0, cards = 0;
  for (const { f, d } of ons) {
    for (const h of d.cu.hud) {
      if (h.type === 'lamps') {
        lamps++;
        const idx = ['一拍', '二拍', '三拍'].findIndex((x) => h.beat.startsWith(x));
        if (idx < 0) continue;
        if (h.on !== idx + 1) bad.push({ f, why: 'lampOn', beat: h.beat, on: h.on });
        if (!h.cur || h.cur.findIndex(Boolean) !== idx || h.cur.filter(Boolean).length !== 1) bad.push({ f, why: 'lampCur', beat: h.beat, cur: h.cur });
      } else if (h.type === 'gauge') {
        gauges++;
        const want = h.total ? Math.round(h.alive / h.total * 100) : 0;
        const got = parseFloat(String(h.width || '').replace('%', ''));
        if (Math.abs(got - want) > 1) bad.push({ f, why: 'gauge', want, got, alive: h.alive, total: h.total });
        const wantLow = !!h.total && h.alive / h.total < 1 / 3;
        if (h.low !== wantLow) bad.push({ f, why: 'gaugeLow', low: h.low, wantLow });
      }
    }
    const shows = d.cu.cards.filter((c) => !/-after$/.test(c.why));
    for (const c of d.cu.cards) {
      if (/-after$/.test(c.why)) {
        // 這張的檢查點之前又閃了新的一張＝計時器被接手，卡片本來就該還亮著（不是沒收）
        const refreshed = shows.some((x) => x.t > c.t - PW.ACTOR_CARD_MS - 100 && x.t < c.t);
        if (c.on && !refreshed) bad.push({ f, why: 'cardStuck', text: c.text, t: c.t });
        continue;
      }
      cards++;
      if (!c.on) bad.push({ f, why: 'cardOff', text: c.text });
      if (c.n > 1) bad.push({ f, why: 'cardMulti', n: c.n });
      if (!c.text || c.text.length < 2) bad.push({ f, why: 'cardText', text: c.text });
    }
  }
  out.P5 = { lamps, gauges, cards, bad: bad.slice(0, 8), PASS: lamps > 0 && gauges > 0 && cards > 0 && bad.length === 0 };
}

// ── P7 冒煙 ───────────────────────────────────────────────────────────────
{
  const errs = [];
  for (const { f, d } of ons) if (d.summary.errors) errs.push({ f, e: d.summary.errorList });
  if (off && off.summary.errors) errs.push({ f: opt.off, e: off.summary.errorList });
  if (cancel && cancel.summary.errors) errs.push({ f: opt.cancel, e: cancel.summary.errorList });
  if (skipf && skipf.summary.errors) errs.push({ f: opt.skipfocus, e: skipf.summary.errorList });
  out.P7 = { files: ons.length + (off ? 1 : 0) + (cancel ? 1 : 0) + (skipf ? 1 : 0), errs, PASS: errs.length === 0 };
}

console.log(JSON.stringify(out, null, 1));
const fails = Object.entries(out).filter(([, v]) => v && v.PASS === false).map(([k]) => k);
console.log('VERDICT ' + Object.entries(out).map(([k, v]) => k + '=' + (v.PASS === undefined ? '-' : v.PASS ? 'PASS' : 'FAIL')).join(' '));
process.exit(fails.length ? 1 : 0);

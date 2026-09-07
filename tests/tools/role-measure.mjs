/* 角色量法＋被動消融治具（2026-09-07，凍結檔 docs/experiments/2026-09-07-acceptance-role-measure.md）
   只讀引擎、不改 index.html：所有開關都是「loadGame 之後在記憶體裡改 G.ROLES[x]」，每個變體各載入一份新實例。

   變體（M1）：
     a  ＝基準：座位 0 走現行 POLICIES.aiLike（policyAiLike 把 p.ai 覆寫成 {aggr:0.7,spite:0.15}，
          markReact 為 undefined）——就是 roles-res0.md 的量法。
     b  ＝風格：座位 0 改吃該角色自己的 ROLES[x].ai（aggr／spite／markReact），其餘與 a 相同。
     c  ＝風格＋被動關（凍結檔字面：清 hooks／traits／flags／life0d）。
     d  ＝基準＋被動關。
   補充變體（不取代 M1，只是把 c 的混淆拆開；細化不動門檻）：
     cL ＝同 c 但保留 life0d（只清 hooks／traits／flags）
     dL ＝同 d 但保留 life0d
     c2 ＝風格＋「只清非 onAi* 的 hooks」（保留 AI 出價風格 hook、保留 life0d）＝純玩家被動關

   用法：
     node tests/tools/role-measure.mjs --n=1000 --out=docs/experiments/2026-09-07-role-measure-evidence --tag=n1000
     node tests/tools/role-measure.mjs --n=10000 --out=... --tag=n10000
     node tests/tools/role-measure.mjs --n=10000 --only=a --roles=shoujing
     node tests/tools/role-measure.mjs --seat2 --n=10000 --out=... --roles=shoujing,hunter,...   （M3）
*/
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
/* --html= 可指向別的版本（例：git show af12d4d:index.html > old.html），
   用來分辨「治具對不上 roles-res0」是治具的錯還是引擎在那之後改過。 */
const HTML_ARG = process.argv.find(a => a.startsWith('--html='));
const INDEX = HTML_ARG ? path.resolve(HTML_ARG.slice(7)) : path.join(ROOT, 'index.html');

const argv = process.argv.slice(2);
const arg = (k, d) => { const h = argv.find(a => a.startsWith('--' + k + '=')); return h ? h.slice(k.length + 3) : d; };
const has = k => argv.includes('--' + k);

const N = parseInt(arg('n', '1000'), 10);
const OUT = arg('out', '');
const TAG = arg('tag', 'n' + N);
const ONLY = arg('only', '').split(',').filter(Boolean);
const ROLES_ARG = arg('roles', '').split(',').filter(Boolean);

/* ---- load.mjs 的 loadGame 吃絕對路徑；每個變體各一份新實例 ---- */
const {loadGame} = await import(path.join(HERE, 'load.mjs').replace(/\\/g, '/').replace(/^/, 'file:///'));

/* =============== 被動欄位清單（逐欄位理由寫在報告 §被動欄位表） =============== */
/* ROLES 一筆的所有欄位：id/name/av/pool/desc/lines（純呈現）、ai（出價風格＝變體 b 的自變數，不算被動）、
   hooks（被動＋AI 風格）、traits／flags（靜態特性，引擎用 traitMax／hasFlag 查）、
   life0d（起始壽命位移）、order（hook 生效優先序，hooks 清空後無作用）。 */
const AI_HOOKS = ['onAiValue', 'onAiPlan', 'onAiAmount', 'onAiCurse', 'onAiExtraBids', 'onAiMark', 'onAiStake'];

function hookNames(G, roleId) { return Object.keys(G.ROLES[roleId].hooks || {}); }

/* 把角色的 hooks 換成「計數包裝版」：呼叫原函式，行為完全不變，只多一個計數器。
   eff 有給時另記「這一次呼叫真的改到 ctx 了沒」——hook 被呼叫 ≠ 被動生效
   （斷手書生的 onPowerCalc 每次算戰力都被呼叫，但只有同系 ≥4 件時才真的 +4）。
   判準＝ctx 的**淺層** own property（數字／布林／字串，陣列比長度）有沒有變。
   淺層比不到的（改 ctx.p.life 這種巢狀寫入）會低估，逐 hook 的已知漏網寫在報告。 */
function snapCtx(ctx) {
  const s = {};
  if (!ctx || typeof ctx !== 'object') return s;
  for (const k of Object.keys(ctx)) {
    const v = ctx[k];
    if (v === null || ['number', 'boolean', 'string', 'undefined'].includes(typeof v)) s[k] = v;
    else if (Array.isArray(v)) {
      s['#' + k] = v.length;
      /* 短陣列（拍賣桌就 4 格）連內容一起比：onAiExtraBids 是往 ctx.bids[i] 寫一格，
         只比長度會漏掉（實測 qingmian／xiaonv 的虛張／攪局標就是這樣被漏算的）。 */
      if (v.length <= 8) { try { s['$' + k] = JSON.stringify(v); } catch (e) { /* 有環就只比長度 */ } }
    }
  }
  return s;
}
function diffCtx(a, b) {
  const ks = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of ks) if (a[k] !== b[k]) return true;
  return false;
}
function instrument(G, roleId, counters, eff) {
  const R = G.ROLES[roleId], orig = R.hooks || {}, wrapped = {};
  for (const n of Object.keys(orig)) {
    const f = orig[n];
    wrapped[n] = eff
      ? function (ctx) {
          counters[n] = (counters[n] || 0) + 1;
          const before = snapCtx(ctx);
          const r = f.call(this, ctx);
          if (diffCtx(before, snapCtx(ctx))) eff[n] = (eff[n] || 0) + 1;
          return r;
        }
      : function (ctx) { counters[n] = (counters[n] || 0) + 1; return f.call(this, ctx); };
  }
  R.hooks = wrapped;
}
/* 消融：清掉被動，並（可選）留下「空殼計數 hook」當影子計數器——
   空函式不碰 ctx、不耗亂數，對結算零影響，但證明這些 hook 的呼叫點在 (c) 仍然被走到
   （§6.1 第 1 條的反面驗證：不是遊戲路徑消失，是效果被拿掉）。 */
function ablate(G, roleId, opt) {
  const R = G.ROLES[roleId];
  const names = Object.keys(R.hooks || {});
  const keepAi = !!opt.keepAiHooks;
  const kept = {}, dropped = [];
  for (const n of names) {
    const isAi = AI_HOOKS.includes(n);
    /* onlyAiHooks＝只清 AI 風格 hook、玩家被動全留（c3）；keepAiHooks＝反過來（c2）；兩者都不給＝全清 */
    const drop = opt.onlyAiHooks ? isAi : (keepAi ? !isAi : true);
    if (drop) dropped.push(n); else kept[n] = R.hooks[n];
  }
  R.hooks = kept;                                /* 影子計數 hook 由 installShadow 在 instrument 之後才裝，
                                                    免得 hookCalls（實觸發）把空殼也算進去 */
  R.traits = {};
  R.flags = [];
  if (!opt.keepLife0d) R.life0d = 0;
  return {dropped, keptAi: Object.keys(kept)};
}
/* 空殼計數 hook：不碰 ctx、不耗亂數，對結算零影響；用來證明被清掉的那些 hook 的呼叫點
   在消融變體裡仍然被走到（反面驗證）。 */
function installShadow(G, roleId, dropped, shadow) {
  const R = G.ROLES[roleId];
  for (const n of dropped) R.hooks[n] = function () { shadow[n] = (shadow[n] || 0) + 1; };
}

/* 座位 0 的兩種出價量法 */
function makePolicyAiLike(G) { return G.POLICIES.aiLike; }
function makePolicyRoleAi(G) {
  /* 與 policyAiLike 同構，唯一差別：塞進去的是該角色自己的 ROLES[x].ai（含 markReact），
     不是寫死的 {aggr:0.7,spite:0.15}。 */
  return function policyRoleAi(p) {
    const saved = p.ai;
    const R = G.ROLES[p.roleId];
    p.ai = R && R.ai ? {...R.ai} : {aggr: 0.7, spite: 0.15};
    let b;
    try { b = G.aiBids(p); } finally { p.ai = saved; }
    return b.map(x => x || {amt: 0, type: 'cons', intent: 'keep', target: null});
  };
}

/* aggr 掃描（凍結檔 M1(b) 要求的鑑別力：證明「座位 0 的 p.ai 真的被吃到」——
   把 aggr 由 0.3 掃到 1.0，勝率有變化才算這根槓桿是活的）。 */
function makePolicyFixedAi(G, aggr) {
  return function policyFixedAi(p) {
    const saved = p.ai;
    const R = G.ROLES[p.roleId];
    p.ai = {...(R && R.ai ? R.ai : {spite: 0.15}), aggr};
    let b;
    try { b = G.aiBids(p); } finally { p.ai = saved; }
    return b.map(x => x || {amt: 0, type: 'cons', intent: 'keep', target: null});
  };
}

const VARIANTS = {
  a:  {policy: 'aiLike', ablate: null,                                        desc: '基準（policyAiLike）'},
  b:  {policy: 'roleAi', ablate: null,                                        desc: '風格（吃 ROLES.ai）'},
  c:  {policy: 'roleAi', ablate: {keepLife0d: false, keepAiHooks: false},      desc: '風格＋被動關（含 life0d）'},
  d:  {policy: 'aiLike', ablate: {keepLife0d: false, keepAiHooks: false},      desc: '基準＋被動關（含 life0d）'},
  cL: {policy: 'roleAi', ablate: {keepLife0d: true,  keepAiHooks: false},      desc: '風格＋被動關（保留 life0d）'},
  dL: {policy: 'aiLike', ablate: {keepLife0d: true,  keepAiHooks: false},      desc: '基準＋被動關（保留 life0d）'},
  c2: {policy: 'roleAi', ablate: {keepLife0d: true,  keepAiHooks: true},       desc: '風格＋只關玩家被動（留 AI hook、留 life0d）'},
  /* bm＝(b)＋座位 0 也照 AI 的方式「盯上」一件。policyAiLike 與 policyRoleAi 都沒有 .mark，
     policyMarks 會把座位 0 的 mark 設成 null ⇒ 座位 0 從來不盯，但三個 AI 席每夜都盯。
     這是座位 0 特有的量法缺口（MARK_OWN +2 拿不到、markReact 的 contest 也少一個對象），
     跟 M3 的座位效應是同一件事的兩面，所以另立一欄量它。 */
  bm: {policy: 'roleAi', ablate: null, mark: true,                             desc: '風格＋座位 0 也盯上（補 policyMarks 缺口）'},
  /* c3＝(b) 只關 AI 風格 hook（保留玩家被動＋life0d），是 c2 的互補。
     b／c2／c3／cL／c 五個一起才能把「玩家被動／AI 風格 hook／起始壽命」三項拆乾淨。 */
  c3: {policy: 'roleAi', ablate: {keepLife0d: true, keepAiHooks: false, onlyAiHooks: true}, desc: '風格＋只關 AI 風格 hook'},
};

function runVariant(vk, roleId, n) {
  const V = VARIANTS[vk];
  const G = loadGame(INDEX);                     /* 每個 (變體, 角色) 各一份全新實例 */
  const counters = {}, shadow = {}, eff = has('eff') ? {} : null;
  let abl = null;
  if (V.ablate) {
    abl = ablate(G, roleId, V.ablate);
    instrument(G, roleId, counters, eff);        /* 只包住「還留著的」hook（c2／c3 保留的那些） */
    installShadow(G, roleId, abl.dropped, shadow);
  } else {
    instrument(G, roleId, counters, eff);
  }
  /* --paperwar=0：把《紙紮夜戰》關掉退回舊的「戰力比較」路徑。
     用途＝檢驗「某個被動之所以量不到，是不是因為它掛在 power() 上，
     而 PAPERWAR_ON=true 之後 power() 已經不決定勝負了」（index.html:3158 的註解）。
     這是診斷用的對照組，不是 M1 的判定值。 */
  const pw = arg('paperwar', '');
  if (pw === '0') G.CFG.PAPERWAR_ON = false;
  let pol = V.policy === 'aiLike' ? makePolicyAiLike(G) : makePolicyRoleAi(G);
  if (V.mark) { const base = pol; pol = p => base(p); pol.mark = p => G.aiMark(p); }
  const t0 = Date.now();
  const st = G.runMany({n, policies: {0: pol}, picks: [roleId]});
  return {
    variant: vk, role: roleId, n,
    win: st.winRate[0], surv: st.avgSurvivalNights[0], life: st.avgFinalLife[0],
    len: st.avgGameLength,
    hookCalls: counters, hookEffective: eff, shadowCalls: shadow, ablated: abl,
    ms: Date.now() - t0,
  };
}

/* =============== M3：同一角色坐在座位 2（AI 座位）的勝率 ===============
   座位 0 恆為真人席（playPolicyGame 靠 !p.ai 找真人，沒有真人就跳出），所以無法把受測角色搬到座位 2
   而不留真人。做法：座位 0 由「其他角色」輪流坐（走變體 b 的量法），只取「rosterSeats 恰好把受測角色
   抽到座位 2」的種子。先用 makeState 掃種子（便宜），再對命中的種子跑整局。
   注意：座位 2 是純 AI 席，本來就吃 ROLES.ai，等同變體 b 的出價量法。 */
function runSeat2(roleId, n) {
  const G = loadGame(INDEX);
  const pol = makePolicyRoleAi(G);
  const pool = Object.keys(G.ROLES).filter(k => G.ROLES[k].pool);
  const others = pool.filter(k => k !== roleId);
  const seeds = [];
  let s = 0, scanned = 0;
  while (seeds.length < n && scanned < n * 400) {
    s++; scanned++;
    const y = others[s % others.length];
    G.makeState('solo', s, [y]);
    if (G.S.players[2].roleId === roleId) seeds.push(s);
  }
  const t0 = Date.now();
  /* 每個種子的座位 0 角色由 s % others.length 決定，runMany 只吃一組 picks，
     所以這裡逐種子分組跑（同一個 picks 的種子合成一批），再把 winRate[2] 加權平均。 */
  const byPick = {};
  for (const sd of seeds) { const y = others[sd % others.length]; (byPick[y] = byPick[y] || []).push(sd); }
  const seatWin = [0, 0, 0, 0];
  let len = 0, surv2 = 0, life2 = 0, tot = 0;
  for (const y of Object.keys(byPick)) {
    const st = G.runMany({seeds: byPick[y], policies: {0: pol}, picks: [y]});
    st.winRate.forEach((w, i) => { seatWin[i] += w * st.games; });
    len += st.avgGameLength * st.games; surv2 += st.avgSurvivalNights[2] * st.games;
    life2 += st.avgFinalLife[2] * st.games; tot += st.games;
  }
  return {mode: 'seat2', role: roleId, seat: 2, n: tot, win: tot ? seatWin[2] / tot : 0,
    seatWin: seatWin.map(w => tot ? w / tot : 0), avgGameLength: tot ? len / tot : 0,
    surv: tot ? surv2 / tot : 0, life: tot ? life2 / tot : 0, scanned, ms: Date.now() - t0};
}

/* =============== main =============== */
const G0 = loadGame(INDEX);
const ALL_ROLES = Object.keys(G0.ROLES).filter(k => G0.ROLES[k].pool);
const roles = ROLES_ARG.length ? ROLES_ARG : ALL_ROLES;
const variants = ONLY.length ? ONLY : ['a', 'b', 'c', 'd', 'cL', 'dL', 'c2'];
const se = p => Math.sqrt(p * (1 - p) / N) * 100;

const rows = [];
const AGGRS = arg('aggrsweep', '').split(',').filter(Boolean).map(Number);
if (AGGRS.length) {
  for (const r of roles) {
    for (const g of AGGRS) {
      const G = loadGame(INDEX);
      const t0 = Date.now();
      const st = G.runMany({n: N, policies: {0: makePolicyFixedAi(G, g)}, picks: [r]});
      const res = {mode: 'aggrsweep', role: r, aggr: g, n: N, win: st.winRate[0], surv: st.avgSurvivalNights[0], life: st.avgFinalLife[0], ms: Date.now() - t0};
      rows.push(res);
      console.log(`[aggr] ${r}\taggr=${g}\t勝率 ${(res.win * 100).toFixed(2)}%\t終壽 ${res.life.toFixed(2)}\t(${res.ms}ms)`);
    }
  }
} else if (has('seat2')) {
  for (const r of roles) {
    const res = runSeat2(r, N);
    rows.push(res);
    console.log(`[seat2] ${r}\t座位2勝率 ${(res.win * 100).toFixed(2)}%\t存活 ${res.surv.toFixed(2)}\t終壽 ${res.life.toFixed(2)}\t局長 ${res.avgGameLength.toFixed(2)}\t四席勝率 ${res.seatWin.map(w => (w * 100).toFixed(2)).join('/')}\tn=${res.n}\t掃描 ${res.scanned}\t(${res.ms}ms)`);
  }
} else {
  for (const r of roles) {
    for (const v of variants) {
      const res = runVariant(v, r, N);
      rows.push(res);
      const hc = Object.entries(res.hookCalls).map(([k, n2]) => `${k}=${n2}`).join(' ') || '（無）';
      const sc = Object.entries(res.shadowCalls).map(([k, n2]) => `${k}=${n2}`).join(' ') || '（無）';
      console.log(`${r}\t${v}\t勝率 ${(res.win * 100).toFixed(2)}%\t存活 ${res.surv.toFixed(2)}\t終壽 ${res.life.toFixed(2)}\t(${res.ms}ms)`);
      console.log(`    hook 實觸發: ${hc}`);
      if (res.hookEffective) console.log(`    其中真的改到 ctx（被動生效）: ${Object.entries(res.hookEffective).map(([k, n2]) => `${k}=${n2}`).join(' ') || '（無）'}`);
      if (res.ablated) console.log(`    影子觸發(已清空的 hook 呼叫點): ${sc}`);
    }
  }
}

if (OUT) {
  const dir = path.isAbsolute(OUT) ? OUT : path.join(ROOT, OUT);
  fs.mkdirSync(dir, {recursive: true});
  const f = path.join(dir, `role-measure-${has('seat2') ? 'seat2-' : ''}${TAG}.json`);
  fs.writeFileSync(f, JSON.stringify({n: N, variants, roles, se_pp_at_25pct: se(0.25).toFixed(3), rows}, null, 1), 'utf8');
  console.log('\n寫出 ' + f);
}

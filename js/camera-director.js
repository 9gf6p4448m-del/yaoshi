// 妖市 3D 環境層 — 運鏡導演（Layer 3，2026-09-03 v0.16；2026-09-06 後處理卷 P-4 加對決三段）
//
// 職責：接收演出層發出的 CustomEvent，把鏡頭在幾個固定機位之間平滑補間，
// 並讓相關座位的燈籠亮起、其餘壓暗。
//
// 邊界（與 bridge-players.js 同一組，理由見 docs/IMPLEMENTATION_GUIDE.md §7）：
// - 完全不讀 S、CFG，也不寫回任何賽局欄位；它只認得事件裡帶的座位 id
// - 不耗任何亂數（S.rng 與 S.rngUi 都不碰），所以 trace() 等價驗證不受影響
// - 事件由 index.html 的演出層發出（revealGlow／playDuel／endGame／beginRound），
//   引擎函式一律不發——headless 測試的 document 沒有 dispatchEvent，發了會炸
import * as THREE from 'three';

const DEG = Math.PI / 180;

// 機位＝球座標。yaw 0 度是南家那一側（+Z），順時針到東 90、北 180、西 270；
// tilt 是俯角，愈小愈貼桌面。改這些數字就是改運鏡，其他地方不必動。
const SHOTS = {
  table: { dist: 3.6, tilt: 35, yaw: 0, lookY: 0.1, ms: 900 },
  reveal: { dist: 3.2, tilt: 30, yaw: 0, lookY: 0.3, ms: 550 }, // 開標：往桌心壓進去（幅度小，畫面別被裁掉）
  end: { dist: 6.4, tilt: 56, yaw: 0, lookY: 0.0, ms: 1400 }, // 局末：拉遠俯瞰整桌
};

const DUEL_SHOT = { dist: 4.2, tilt: 24, lookY: 0.35, ms: 700 }; // 對決：壓低但仍看得到桌面，太低只會看到夜空

// 座位 id → yaw。與 scene-env 的 SEAT_POS、bridge-players 的 SEAT_ORDER 同一套編號：
// 0 南 1 北 2 西 3 東
const SEAT_YAW = [0, 180, 270, 90];

const REVEAL_HOLD_MS = 1500; // 開標壓進去後停多久自動回到牌桌機位

// 命中 punch（v0.27）：不是第五個機位，是疊在「當下那個機位」上的一組偏移量，
// 所以跟既有四個機位（table／reveal／end／DUEL_SHOT）不打架——punch 歸零時
// 相機位置與沒有這段程式碼時逐項相同。全部【試玩必調】。
const PUNCH = {
  dist: 0.6, // 推近多少世界單位（負的 dist 偏移）
  ms: 420, // 回位時間，easeOutCubic
  shake: 0.05, // 橫向微震幅度（世界單位）
  shakeHz: 9, // 微震頻率
};

// ─── 對決運鏡三段最小組（v0.35 後處理卷 P-4）──────────────────────────────
// 三段都跟 PUNCH 同型：疊在「當下那個機位」上的一組偏移量，偏移歸零時算出來的
// 相機位置與 v0.34 逐項相同（加 0／減 0 不改浮點值）。合成順序見 update() 的註解。
// 數字全部【試玩必調】；本檔一如既往不碰任何亂數（S.rng／S.rngUi 都不讀）。

// (a) 軌道環繞進場：ys:duel 之後鏡頭照舊推進到 DUEL_SHOT，但落點刻意偏開 ORBIT.yaw
//     （＝「掃過兩隊」的起點，±38 度大約就是其中一席的方位，所以進場會先從那一側看過去），
//     再以 DUEL_SHOT 的 dist／tilt 只轉 yaw 回到 duelYaw。
//     **dist 逐幀恆定是硬要求**：duel-figures.js:467 的 camStable 只看
//     camera.position.length()，orbit 讓 dist 抖就會一直重選排法（踩 T-6／R-4）。
//     所以 orbit 刻意等基座補間到位（t>=1，dist 已停在 DUEL_SHOT.dist）之後才開始轉。
const ORBIT = {
  yaw: -38, // 起點相對 duelYaw 的偏移（度）。常數且固定方向，不得改成亂數。
  ms: 1500, // ORBIT_MS
};

// (b) 招式輕推：ys:fx-trait 當下往出招側偏一點再回位。
//     side 'A'＝畫面左、'B'＝畫面右（duel-figures.js:342,448 的 seats[i]／offset[i]，
//     i=0 是 −spread ＝ 畫面左）。相機位置對 yaw 微分＝(cos yaw, 0, −sin yaw)·horiz，
//     正好是 duel-figures.js:496 那條「畫面右」向量，所以 yaw 變大＝鏡頭往畫面右靠：
//     side 'B' → +LEAN.yaw、side 'A' → −LEAN.yaw 就是「往出招側偏」。
const LEAN = {
  yaw: 10, // 往出招側偏幾度
  // **dist 偏移固定 0，不得改成非零**（第 1 輪覆審 M-2）：|camera.position| 恆等於 dist
  // （position=(sin·horiz, sin(tilt)·dist, cos·horiz)，平方和＝dist²），而 duel-figures.js:467 的
  // camStable（Math.abs(dist - lastDist) < 1e-3）正是排法鎖點的閘門——lean 一動 dist，
  // 招式拍落在鎖點前時 realign 會連續數次 camStable=false，rowsFit 鎖不下來、排數在對決前段翻面
  // （＝可讀性小卷第 3／4 輪覆審 H-2／M-2 花兩輪修掉的東西）。與 ORBIT 同一條紀律：只轉 yaw。
  dist: 0,
  // 上升沿長度（第 2 輪覆審 N-3）：沒有它 `leanK` 在 leanU=0 那一幀就直接等於 1，
  // `ys:fx-trait` 當幀鏡頭橫跳 0.6324 世界單位（v0.34 是 0，比它剛修掉的下降沿 0.50 還大），
  // 而且每一招各發生一次。120ms＝7 幀，短到看起來仍是「當下就偏過去」，長到單幀位移進得了門檻。
  riseMs: 120,
  ms: 900, // detail.ms 沒帶時的回位時間（＝index.html 的 PW_FX.TRAIT_MS）
};

// 清除 orbit／lean 時，把「當下實際機位」平順收回基座要花多久（第 1 輪覆審 H-1／M-1）。
// 用**固定線速度**而不是固定時間：要收的量是變數（orbit 滿幅 38°、lean 只有 10°），固定時間
// 會讓大偏移的那一段每幀跑太快——實測 36.8° 用 250ms 收，中段單幀就有 0.4576 世界單位，
// 比平滑補間的既有上限 0.1526 還大三倍，等於把一次瞬移換成一次甩鏡。
// 「量」不能只看 yaw（第 2 輪覆審 LOW）：折回是往**目前的 target** 收，基座還在大幅移動時
// dist／tilt 也會一起被壓進這段時間裡（實測 `G1_cancel_during_long_tween` 逐幀 0.3593）。
// 所以三個分量各換算成「相機在世界裡走的距離」再取最大值。
// CLEAR_WORLD_PER_MS 的定標：滿幅 orbit（dist 4.2、tilt 24°、38°）弧長 2.544 世界單位，用 700ms 收。
// 上下限：小偏移不拖（200ms），一般情形不超過基座推進的 700ms；基座補間本來就還有更長的
// 剩餘時間時另外取 max（見 clearOrbitLean），不把原本慢慢走的路壓縮加速。三個數字都【試玩必調】。
const CLEAR_WORLD_PER_MS = 2.544 / 700;
const CLEAR_MS_MIN = 200;
const CLEAR_MS_MAX = 700;

// (c) 燒毀加強：燒毀是一場裡最重的一擊，借 punch 那一層再加重。
//     index.html 的燒毀路徑（pwBurnOne）只叫 fxHitstop／fxFlash／pwBurnOne，
//     全 repo 會派 ys:fx-punch 的只有 index.html:3168（fxPunch，命中拍才叫）
//     與 trait-fx.js:339（招式積木自己叫），燒毀都不經過它們 → 這裡自己觸發不會變雙重 punch。
const BURN_PUNCH_POWER = 1.5;

/** prefers-reduced-motion（判法照抄 js/trait-fx.js:83）：(a)(b) 整段 no-op，(c) 的 punch 維持現行行為。 */
function prefersReduced() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/** 把角度差收斂到 -180..180，補間時才會走短邊、不會繞一大圈。 */
function shortestDelta(from, to) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/**
 * 兩個座位的「看得到雙方」機位：取兩者 yaw 的短弧中點。
 * 正對面的兩席（南北、東西）中點無意義，改站到垂直方向去，才不會被其中一人擋住另一人。
 */
function duelYaw(a, b) {
  const ya = SEAT_YAW[a];
  const yb = SEAT_YAW[b];
  const d = shortestDelta(ya, yb);
  if (Math.abs(Math.abs(d) - 180) < 1) return (ya + 90) % 360;
  return (ya + d / 2 + 360) % 360;
}

export function createCameraDirector(camera, lanterns) {
  const base = { ...SHOTS.table };
  let from = { ...base };
  let target = { ...base };
  let t = 1; // 補間進度，1＝已到位
  let durMs = 1;
  let revealUntil = 0; // 開標機位的自動返回時間，0＝沒有排程
  let punchU = 1; // 命中 punch 的進度，1＝已回位（＝沒有偏移）
  let punchAmp = 0; // 這一次 punch 的力道倍率
  let orbitU = 1; // 進場 orbit 的進度，1＝已轉回 duelYaw（＝沒有偏移）
  let orbitHold = false; // true＝還在等基座推進到位；期間 orbit 偏移維持滿值（yaw 不動、dist 更不動）
  let leanU = 1; // 招式輕推的進度，1＝已回位（＝沒有偏移）
  let leanSign = 0; // +1 往畫面右（side 'B'）、−1 往畫面左（side 'A'）
  let leanMs = LEAN.ms; // 這一次輕推的回位時間（取 ys:fx-trait 的 detail.ms）
  let forceWrite = false; // 偏移被「清零」的那一幀要補寫一次位置，見 clearOrbitLean
  // 折回段還沒跑完。寫入區塊的條件是 t < 1，所以「t 剛好到 1」的那一幀不會寫，補間會凍在
  // 前一步、離目標差約 0.001–0.0024 度（v0.34 每次 goto 都有的既有行為，一般看不出來）。
  // 折回段不能留這個尾巴：clearOrbitLean 的合約是「清完正好落在基座上，殘留 0」，差一點點
  // 就會被 A4 的殘留斷言（<1e-6）抓到。所以折回期間強制每幀都寫，含最後那一幀。
  let foldWrite = false;
  // 最近一幀實際算出來的機位（基座＋orbit＋lean，**不含 punch**；yaw／tilt 是度數）。
  // **所有**基座補間的起點都是它（見 goto／clearOrbitLean）；初值＝SHOTS.table，與 scene-env 的
  // 初始機位一致。不含 punch 是刻意的：punch 有自己的 easeOutCubic 回位，疊在新基座上仍然連續。
  let curDist = base.dist;
  let curTilt = base.tilt;
  let curYaw = base.yaw;
  let curLookY = base.lookY;
  const lookAt = new THREE.Vector3();

  // 燈籠強調：值 1＝原亮度，>1 打亮，<1 壓暗。每幀往目標值靠近，不會突然跳。
  // 壓暗刻意保守（0.75／0.5）：實測壓到 0.35 時整張桌子跟著變黑，開標反而比平常還暗，
  // 「強調」變成「關燈」。要的是對比，不是把場景關掉。
  const emphasis = lanterns.map(() => 1);
  const emphasisTarget = lanterns.map(() => 1);

  function startTween(src, shot, ms) {
    from = { dist: src.dist, tilt: src.tilt, yaw: src.yaw, lookY: src.lookY };
    // 從目前的 yaw 走短邊到新 yaw：先把目標換算成「相對現在」的絕對角度
    const yaw = from.yaw + shortestDelta(from.yaw, shot.yaw);
    target = { dist: shot.dist, tilt: shot.tilt, yaw, lookY: shot.lookY };
    durMs = Math.max(1, ms || shot.ms || 700);
    t = 0;
  }

  /** 補間起點：**一律是「上一幀真正寫進 camera.position 的那個機位」**（cur*，含 orbit／lean／
   *  折回，不含 punch），而不是 v0.34 的「上一個 target」（第 2 輪覆審 HIGH）。
   *  第 1 輪的修法只在 clearOrbitLean 那一格把實際機位塞給 goto（`foldFrom`），而 `foldFrom`
   *  只活一幀、且 `active=false` 早退時不記——折回段（最長 700ms）進行中再來一個 goto 入口，
   *  起點就退回 target＝折回終點，一次跳完剩下的量（治具 2.2662／真實頁面 2.3067）。
   *  改成無條件從 cur* 出發之後，「哪個入口記過、哪個沒記」這個分類就整個消失：任何時刻、
   *  任何入口，第 0 幀寫進去的位置都等於前一幀（k=0 → 位置＝from＝cur*），構造上不可能跳。
   *  代價：偏移全零且基座已停穩時，cur* 比 target 差「t 剛好到 1 那一幀沒寫」的 0.0024 度，
   *  傳到最終位置是 ~4e-9（A2 門檻 1e-6），實測 A2 仍是 0。 */
  function goto(shot, ms) {
    startTween({ dist: curDist, tilt: curTilt, yaw: curYaw, lookY: curLookY }, shot, ms);
  }

  function setEmphasis(list, dim) {
    // list 為 null＝全部回到原亮度；否則名單內打亮、名單外壓到 dim
    lanterns.forEach((_, i) => {
      emphasisTarget[i] = !list ? 1 : list.includes(i) ? 2.2 : (dim === undefined ? 0.75 : dim);
    });
  }

  /** orbit／lean 立刻歸零，**但位置要連續**（第 1 輪覆審 H-1／M-1）。
   *  只把進度推到 1 的話，下一幀少掉的是整個偏移量：實測 orbit 進行中收到 ys:duel-end 或
   *  ys:fx-trait-cancel 單幀跳 2.41 世界單位（相機距離 4.2 下約 36.8°），lean 中被清跳 0.50。
   *  改法：偏移層歸零，再從 cur*（＝上一幀實際機位）以固定線速度往**目前的目標**平順收，
   *  偏移由基座吃掉，收完正好落在基座上（殘留 0）。
   *  這一段只為「後面沒有 goto 的入口」（ys:fx-trait-cancel）而存在；有 goto 的入口會覆寫它，
   *  而 goto 的起點同樣是 cur*，所以呼叫順序不影響結果（第 2 輪覆審 HIGH 的根治點）。
   *  punch 那一層不折：clearOrbitLean 不碰 punchU，它自己的 easeOutCubic 疊在新基座上仍然連續。
   *  forceWrite 保留（t=0 其實已保證會寫），語意仍是「清除當幀一定要補寫一次位置」。 */
  function clearOrbitLean() {
    const active = orbitU < 1 || orbitHold || leanU < 1;
    orbitU = 1;
    orbitHold = false;
    leanU = 1;
    leanSign = 0;
    if (!active) return; // 沒有偏移在跑＝沒東西要折，位置本來就連續
    forceWrite = true;
    foldWrite = true;
    // 基座補間如果還在飛，剩下的時間就是它本來要走的節奏；折回不得把它壓縮加速（第 2 輪覆審 LOW）
    const remainMs = t < 1 ? durMs * (1 - t) : 0;
    const src = { dist: curDist, tilt: curTilt, yaw: curYaw, lookY: curLookY };
    const dst = { dist: target.dist, tilt: target.tilt, yaw: target.yaw, lookY: target.lookY };
    // 要走的量：yaw／tilt 換算成弧長、dist 直接算，取最大的那一個當定速的依據
    const arc = (deg) => Math.abs(deg) * DEG * dst.dist;
    const span = Math.max(
      arc(shortestDelta(src.yaw, dst.yaw)) * Math.cos(dst.tilt * DEG),
      arc(dst.tilt - src.tilt),
      Math.abs(dst.dist - src.dist));
    const paced = Math.min(CLEAR_MS_MAX, Math.max(CLEAR_MS_MIN, span / CLEAR_WORLD_PER_MS));
    startTween(src, dst, Math.max(paced, remainMs));
  }

  function onReveal(e) {
    const winner = e && e.detail ? e.detail.winner : null;
    clearOrbitLean();
    goto(SHOTS.reveal);
    setEmphasis(typeof winner === 'number' ? [winner] : null);
    revealUntil = performance.now() + REVEAL_HOLD_MS;
  }

  function onDuel(e) {
    const d = (e && e.detail) || {};
    revealUntil = 0;
    if (typeof d.a !== 'number' || typeof d.b !== 'number') return;
    // 先清再 goto（順序其實已不重要：兩者的起點都是 cur*，見 goto 的註解）。
    clearOrbitLean();
    goto({ ...DUEL_SHOT, yaw: duelYaw(d.a, d.b) });
    if (!prefersReduced()) {
      // 把補間起點往回挪一個 ORBIT.yaw：第 0 幀的「基座＋orbit 偏移」正好等於進場前的 yaw，
      // 鏡頭不會在 ys:duel 當下跳一格；推進到位時落在 duelYaw+ORBIT.yaw ＝ 掃過兩隊的起點。
      // 只動 from（起點），target 仍是 duelYaw，所以 orbit 歸零時位置與 v0.34 相同。
      from.yaw -= ORBIT.yaw;
      orbitU = 0;
      orbitHold = true;
    }
    setEmphasis([d.a, d.b], 0.6);
  }

  function onDuelEnd() {
    revealUntil = 0;
    punchU = 1; // 對決收掉時 punch 一定要歸零，不然殘餘偏移會帶進牌桌機位
    punchAmp = 0;
    clearOrbitLean(); // orbit／lean 同理
    goto(SHOTS.table);
    setEmphasis(null);
  }

  /** 【積木接收端】ys:fx-punch：往前撞一下再 easeOutCubic 回位。力道由 detail.power 給（1＝標準）。
   *  刻意跟「對決」解耦——任何演出時間軸都能叫它，三拍制時就是一拍叫一次。 */
  function onPunch(e) {
    const d = (e && e.detail) || {};
    punchAmp = Math.max(0.2, Math.min(2, d.power === undefined ? 1 : d.power));
    punchU = 0;
  }

  /** 【積木接收端】ys:fx-trait：鏡頭往出招側輕推一下，detail.ms 內回位。
   *  只讀 detail.side／detail.ms，不碰 detail.handled（那是 3D 舞台在回覆接不接這一招，與鏡頭無關）。 */
  function onTrait(e) {
    if (prefersReduced()) return;
    const d = (e && e.detail) || {};
    const s = d.side === 'B' ? 1 : d.side === 'A' ? -1 : 0;
    if (!s) return;
    leanSign = s;
    leanMs = Math.max(1, Number(d.ms) || LEAN.ms);
    leanU = 0;
  }

  /** ys:fx-trait-cancel（doSkip 派，index.html:1744）：快轉時 orbit／lean 立刻清零。 */
  function onTraitCancel() {
    clearOrbitLean();
  }

  /** 【積木接收端】ys:fx-burn：燒毀＝一場裡最重的一擊，借 punch 那一層再加重（見 BURN_PUNCH_POWER 註解）。
   *  prefers-reduced-motion 時 no-op（第 1 輪覆審 M-3）：v0.34 的導演**沒有** ys:fx-burn 監聽器，
   *  凍結檔 P-4 的「(c) 維持現行 punch」講的現行就是 v0.34 ＝燒毀不震鏡；不 gate 等於在
   *  reduced-motion 下新增一個推近 0.9 世界單位＋橫向微震的動態。 */
  function onBurn() {
    if (prefersReduced()) return;
    onPunch({ detail: { power: BURN_PUNCH_POWER } });
  }

  function onEnd() {
    revealUntil = 0;
    clearOrbitLean();
    goto(SHOTS.end);
    setEmphasis(null);
  }

  function onTable() {
    revealUntil = 0;
    clearOrbitLean();
    goto(SHOTS.table);
    setEmphasis(null);
  }

  document.addEventListener('ys:reveal', onReveal);
  document.addEventListener('ys:duel', onDuel);
  document.addEventListener('ys:fx-punch', onPunch);
  document.addEventListener('ys:fx-trait', onTrait);
  document.addEventListener('ys:fx-trait-cancel', onTraitCancel);
  document.addEventListener('ys:fx-burn', onBurn);
  document.addEventListener('ys:duel-end', onDuelEnd);
  document.addEventListener('ys:end', onEnd);
  document.addEventListener('ys:table', onTable);

  /** 每幀呼叫。dt 秒，now 毫秒。回傳目前的燈籠強調係數供閃爍計算使用。 */
  function update(dt, now) {
    if (revealUntil && now >= revealUntil) {
      revealUntil = 0;
      goto(SHOTS.table);
      setEmphasis(null);
    }

    if (t < 1) t = Math.min(1, t + (dt * 1000) / durMs);
    if (punchU < 1) punchU = Math.min(1, punchU + (dt * 1000) / PUNCH.ms);
    // orbit 只在基座推進到位之後才開始轉：那時 dist 已經停在 DUEL_SHOT.dist，
    // 整段 orbit 的 camera.position.length() 才會逐幀恆定（duel-figures 的 camStable 靠它鎖排）
    if (orbitHold && t >= 1) orbitHold = false;
    if (!orbitHold && orbitU < 1) orbitU = Math.min(1, orbitU + (dt * 1000) / ORBIT.ms);
    if (leanU < 1) leanU = Math.min(1, leanU + (dt * 1000) / leanMs);

    // 機位補間與三層偏移每幀都算一次。三層都沒在跑時偏移恆為 0，
    // 算出來的位置與舊版「只在 t<1 時寫」逐項相同（SHOTS.table 就是 scene-env 的初始機位）。
    //
    // ── 三層合成順序（都疊在基座機位上，由外往內）──────────────────────
    // ① 基座：from→target 的 easeInOutCubic 補間，給 tilt／yaw／dist／lookY
    // ② orbit（進場）：只加 yaw 偏移，**dist 一律不碰**
    // ③ lean（招式）：只加 yaw 偏移（LEAN.dist 固定 0，理由見該常數註解）
    // ④ punch（命中／燒毀）：減 dist，再把橫向微震直接加在算好的世界座標上
    // yaw 的兩層偏移相加後才換算成弧度；dist 的兩層偏移相減後才夾在 0.6 以上。
    // ①②③ 的合成結果另外記進 cur*（不含 ④），清除偏移時要拿它當補間起點（見 clearOrbitLean）。
    if (t < 1 || punchU < 1 || orbitU < 1 || orbitHold || leanU < 1 || forceWrite || foldWrite) {
      forceWrite = false;
      if (t >= 1) foldWrite = false; // 折回段的最後一幀已經寫進去了，收工
      const k = easeInOutCubic(t);
      const orbitOff = ORBIT.yaw * (1 - easeInOutCubic(orbitU)); // orbitU=1 → 0
      // lean 的包絡＝上升沿 × 下降沿。上升沿沒有的話 leanU=0 那一幀 leanK 直接是 1，
      // ys:fx-trait 當幀就橫跳滿幅（第 2 輪覆審 N-3）；leanU=1 時下降沿是 0，整條仍然精確歸零。
      const leanRise = easeInOutCubic(Math.min(1, (leanU * leanMs) / LEAN.riseMs));
      const leanK = leanRise * (1 - easeOutCubic(leanU)); // leanU=1 → 0
      curTilt = from.tilt + (target.tilt - from.tilt) * k;
      curYaw = from.yaw + (target.yaw - from.yaw) * k + orbitOff + leanSign * LEAN.yaw * leanK;
      curDist = from.dist + (target.dist - from.dist) * k - LEAN.dist * leanK;
      curLookY = from.lookY + (target.lookY - from.lookY) * k;
      const tilt = curTilt * DEG;
      const yaw = curYaw * DEG;
      const lookY = curLookY;
      // punch：命中當下推到最近，再 easeOutCubic 回位；微震跟著同一條包絡衰減
      const pk = punchAmp * (1 - easeOutCubic(punchU));
      const dist = Math.max(0.6, curDist - PUNCH.dist * pk);
      const horiz = Math.cos(tilt) * dist;
      const sx = Math.sin(punchU * Math.PI * PUNCH.shakeHz) * PUNCH.shake * pk;
      const sy = Math.cos(punchU * Math.PI * PUNCH.shakeHz * 1.37) * PUNCH.shake * 0.6 * pk;
      camera.position.set(Math.sin(yaw) * horiz + sx, Math.sin(tilt) * dist + sy, Math.cos(yaw) * horiz);
      lookAt.set(0, lookY, 0);
      camera.lookAt(lookAt);
    }

    // 燈籠亮度往目標靠攏；4/秒的收斂速度，快到跟得上鏡頭、慢到不會閃
    for (let i = 0; i < emphasis.length; i++) {
      emphasis[i] += (emphasisTarget[i] - emphasis[i]) * Math.min(1, dt * 4);
    }
    return emphasis;
  }

  return { update };
}

// 妖市 — 招式特效語彙的【單一事實來源】（v0.55 招式可辨性卷，批 0，2026-09-12）
//
// 人類可讀版＝docs/design/ART_BIBLE.md §10 與 docs/experiments/2026-09-11-fx-vocab.md，
// 兩邊由 tests/fxvocab.test.mjs 釘在一起（不一致判紅）。**改這裡就要同時改那兩份**。
//
// 為什麼要有這個檔（2026-09-11 盲讀實測，27 支招兩位 context-free 讀者）：
//   完整版就有 14 支兩位都認不出；14/27 共用同一顆白光球、19/27 共用同一圈腳下光環、9/27 共用同一條白虛線，
//   而三個系別檔各自寫死色碼（實測 9 處）＝三份事實來源。語彙沒有單一落點，每一卷都會重新發明一次。
//
// 紀律：**編舞裡不得再出現任何色碼字面值**。系色一律走 st.colors（＝本檔 FX_PAL[det.fac]），
// 節拍一律走 st.beat（＝本檔 BEAT[tier]），徽記一律走 st.kind（＝本檔 EMBLEM_OF[trId]）。
// 三個系別檔**不 import 本檔**——值由 js/trait-fx.js 的 makeStage() 掛到 st 上，
// 這樣三系檔不必各自帶 cache-busting query，也不會出現兩份 module instance。

/** 三系色票。key＝徽記本體、hot＝命中／爆點、line＝連線與描邊、ink＝暗部（把亮色從背景上切出來） */
export const FX_PAL = {
  // 靛藍主導（ART_BIBLE §2 已授權靛藍為次色）；對暗紅褐桌面 #6b3418 是色相反向
  zuling: { key: 0x3f6fd8, hot: 0xffd9a0, line: 0x7ea8ff, ink: 0x0a1230 },
  // 鎏金主導＋硃紅命中；原本的 #f08060 淡橘粉對 #6b3418 的色相與亮度都太近
  xianghuo: { key: 0xffc21e, hot: 0xff5a3c, line: 0xffe08a, ink: 0x2a1004 },
  // 冷屍白青＋「一點刺眼的紅」只給命中；原本的 #70b080 中明度綠在夜紫天前面會沉下去
  yinqi: { key: 0xbdf0dc, hot: 0xff2f3a, line: 0x6fae90, ink: 0x04120c },
};

/** 因果三段的切點，寫成**時長的比例**（不是毫秒），三個數字＝windup 末／travel 末／react 末。
 *  ★為什麼是比例不是毫秒★：招式時長的唯一事實來源是 index.html 的 `PW_FX.TRAIT_MS_BY_TIER`
 *  （治具側 `tests/tools/fx-consts.mjs`）。在這裡再寫一份毫秒表就是第二份複製品，改了那邊這裡會
 *  靜默沿用舊值——0.54 的 F1 閘門（`tests/fxtier.test.mjs` 掃 runtime 的字面值）第一版就抓到了。
 *  改成比例之後，節拍窗由 `beatOf(tier, run.ms)` 從**真正在跑的時長**算出來。
 *  settle 是唯一可以省的一段；windup／travel／react 三段都不能省（ART_BIBLE §10.3）。 */
export const BEAT_FRAC = {
  1: [0.3462, 0.6923, 0.9231], // 短版 → 90／180／240
  2: [0.3333, 0.6222, 0.8444], // 完整版 → 300／560／760
  3: [0.3286, 0.6143, 0.8429], // 三尊 → 460／860／1180
};

/** 把比例乘回實際時長，得到 {windup, travel, react, settle} 四個 [起, 迄] 毫秒窗。
 *  tier 不合法就 throw（不給預設值——預設值就是下一個靜默分岔）。 */
export function beatOf(tier, ms) {
  const f = BEAT_FRAC[tier];
  if (!f) throw new Error(`vocab: 沒有 tier=${tier} 的節拍表（合法值 ${Object.keys(BEAT_FRAC).join('/')}）`);
  if (!Number.isFinite(ms) || ms <= 0) throw new Error(`vocab: beatOf 收到不合法的時長 ${ms}`);
  const a = Math.round(f[0] * ms), b = Math.round(f[1] * ms), c = Math.round(f[2] * ms);
  return { windup: [0, a], travel: [a, b], react: [b, c], settle: [c, Math.round(ms)] };
}

/** 徽記的尺寸常數（世界單位）。size＝法寶本體、markSize＝蓋在受招／受益方身上的印記。 */
export const ICON = { size: 0.44, outlineW: 0.05, billboardTiltDeg: 12, markSize: 0.30 };

/** st.phase 的機械判準（ART_BIBLE §10.3；計畫 §2.3 寫死，不得放寬）。
 *  windupMs／reactMs 會乘上 run.k（tier 1 ≈0.289）等比縮放。 */
export const PHASE_GATE = {
  windupMs: 120, windupBone: 0.08, windupModel: 0.04,
  travelFrac: 0.40,
  reactMs: 200, reactDelta: 0.03,
};

/** trId → 徽記 kind。**雙射**：27 支招各自唯一，三尊另外三個（L1 靠這張表做機械斷言）。
 *  每一列的理由見 docs/proposals/2026-09-11-plan-fx-legibility.md §6 逐招診斷表。 */
export const EMBLEM_OF = {
  /* ── 祖靈系 9 支（js/trait-fx/zuling.js）── */
  eliteOpenShot: 'sun', // 射日神弓：全 27 支裡唯一保留「球」的一支，那是太陽
  wardHpFront2: 'rhomb', // 百步蛇紋盾：菱紋帶（dome 在祖靈退役）
  eliteArmor: 'bead', // 巴冷公主珠鍊：琉璃珠圈取代護罩
  wardFirst: 'eye', // 祖靈之眼
  boltGamble: 'bolt', // 雷女之火：刪掉「圓球升空」（那是射日的語彙）
  swarmHalfSplash: 'wave', // 拼板舟：浪弧（漣漪環退役）
  swarmThorn: 'tusk', // 山豬牙飾：獠牙反向飛回＝反傷的因果
  eliteSelfCut: 'knife', // 獻祭刀：xianji GLB 裡完全沒有刀，只有一隻鹿
  wardHpAll1: 'crag', // 山神庇佑：拿掉頭頂白球，改岩塊
  /* ── 香火系 9 支（js/trait-fx/xianghuo.js）── */
  eliteCleave: 'blade', // 王爺劍：短版必須保留斬擊弧
  wardAbsorb4: 'boat', // 送王船：金箔帆罩取代 dome
  wardAtkAll1: 'flag', // 媽祖令旗：旗面展開（令波環退役）
  wardImmuneLost: 'bell', // 千里眼銅鈴：被免疫的同伴頭上蓋鈴＝把被動效果演成受益方反應
  swarmRally: 'banner5', // 五營旗：五面小旗插五方（中央光盤與五道連線退役）
  wardHpFirst: 'talis', // 香灰符：金色方符
  wardRegen1: 'lamp', // 福壽綿長：燈焰脫離燈罩飛出
  biteGamble: 'seal', // 虎爺印：唯一能把「虎爺印」和「山豬牙」分開的元素
  swarmLastStand: 'tornflag', // 破軍旗：缺角旗面
  /* ── 陰氣系 9 支（js/trait-fx/yinqi.js）── */
  eliteVsSwarm: 'claw', // 虎姑婆指甲（盲讀標竿，只換爪尖光球）
  hauntSee: 'chair', // 椅仔姑竹椅：讀者說「憑空多出一張椅子」——強化這個好訊號
  swarmFeed1: 'urn', // 飼鬼甕：小型甕複本被吸進甕口＝方向感
  hauntDread1: 'drop', // 黃色小雨衣：雨滴落下＋地面水漬（那圈 ring 與過陰咒直接撞）
  hauntSwap: 'buoy', // 水鬼浮標：粗濕繩取代白虛線
  hauntSteal: 'pin', // 林投姐髮簪：hairpin GLB 沒有「簪」骨
  hauntFearX2: 'shade', // 過陰咒：虛影本體（兩圈暗環退役）
  hauntLost: 'hat', // 魔神仔紅帽：旋轉紅帽＋錯亂腳印（原本沒有任何飛行物）
  swarmPierce: 'coin', // 陰陽眼銅錢：yinyangcoin GLB 有 CoinA／CoinB，外圓內方放大飛出去
  /* ── 傳說三尊（語彙與色票納入、盲讀閘門不納入，Q9）── */
  eliteBlind: 'sundisc', // 殘日 canri
  wardGuardAll: 'crown', // 大士爺紙尊 dashiye
  hauntAnswer: 'tablet', // 有應公 youyinggong
};

/** 退役／限縮清單（ART_BIBLE §10.5）。
 *  批 0 只標記不刪——27 支裡有 23 支還在用，批 1／2／3 逐招換掉之後才准把 st.dome 等拿掉。
 *  scope：'retired'＝全系退役；'xianghuo-only'＝限縮成香火系專用。 */
export const DEPRECATED = {
  dome: { scope: 'retired', since: '0.55', why: '讀者把巴冷公主珠鍊的罩讀成山神庇佑；香火的送王船改方框帆罩' },
  ring: { scope: 'xianghuo-only', since: '0.55', why: '19/27 共用腳下光環；祖靈改垂直光柱、陰氣改不規則水漬' },
  disc: { scope: 'xianghuo-only', since: '0.55', why: '同 ring' },
  beam: { scope: 'trail-only', since: '0.55', why: '裸白細線 9/27；一律降級成飛行物的拖尾（st.trail），不得單獨當主體' },
  orb: { scope: 'sun-only', since: '0.55', why: '白光球 15/27；只留射日神弓（那是太陽）' },
};

/** 每一系「不准再用」的積木（給批 1–3 的自我檢查與 fxvocab 測試用） */
export const RETIRED_BY_FAC = {
  zuling: ['dome', 'ring', 'disc'],
  xianghuo: ['dome'],
  yinqi: ['dome', 'ring', 'disc'],
};

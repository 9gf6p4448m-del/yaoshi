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
  1: [0.3462, 0.6923, 0.9231], // 短版 → 104／208／277（tier 1 於 2026-09-12 由 260 改 300；比例不動，切點跟著時長走）
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

/** 徽記的尺寸常數（世界單位）。size＝法寶本體的**預設值**、markSize＝蓋在受招／受益方身上的印記。
 *  ★尺寸的單一事實來源★（覆審 r1 C1）：批 0 第一版四支示範招在編舞裡各自寫死
 *  `const SZ = 0.56／0.46／0.62／0.40`，於是凍結檔 L3 指名的突變「`ICON.size` 改 0.02 必須紅」
 *  對這四支**完全打不到**——實測面積與 ΔE 逐位數不變、exit 0，那是一場恆綠的儀式。
 *  現在逐招尺寸一律住在 byKind／flatByKind／markByKind 這三張表裡，編舞只能讀
 *  `st.iconSize`／`st.iconFlatSize`／`st.markSize`。
 *  ★L3 的 canary 打在 `sizeOf()` 的回傳值上★：把它改成固定回 0.02，用到徽記的招必須全部判紅
 *  （byKind 有覆寫的四支也逃不掉；只改 `size` 只打得到走預設值的那 23 支）。
 *
 *  ★覆審 r2 N1／N7：防線改成按「危險的效果」寫★
 *  危險效果＝**徽記的實際世界尺寸出現第二份來源**。它能發生的路徑只有兩條：
 *    (a) 把數字餵進 `st.icon()`／`st.icons()`／`st.mark()` 的 `o.size`
 *        → 三支**一律拒收 `o.size`**（傳了就 throw，訊息指回本表），這條路由建構上消失；
 *    (b) 直接對徽記 mesh 做 `scale.setScalar(<數字>)`／`scale.set(...)`
 *        → `tests/fxvocab.test.mjs` 的掃描要求「徽記 mesh 的縮放引數必須引用
 *          `st.iconSize`／`st.iconFlatSize`／`st.markSize`／`ICON.*`」，否則判紅。
 *  r2 實測的三種繞法（`const S = 0.56` ＋ `{size:S}`／`setScalar(S * …)`／`setScalar(0.56 * …)`）
 *  因此各自被 throw 或掃描擋下（`--mutate=4` 就是其中一種的回歸案例）。 */
export const ICON = {
  size: 0.44, outlineW: 0.05, billboardTiltDeg: 12, markSize: 0.30,
  /** 逐 kind 的本體尺寸覆寫（沒列出的 kind 走 size 預設）。
   *  四個數字＝批 0 四支示範招原本寫死的 SZ，搬家不改值：
   *  knife 獻祭刀 0.56／bell 千里眼銅鈴 0.46／seal 虎爺印 0.62／hat 魔神仔紅帽 0.40。 */
  byKind: { knife: 0.56, bell: 0.46, seal: 0.62, hat: 0.40 },
  /** 逐 kind 的「貼桌副件」尺寸（st.icons 的 flat:true：陰氣的水漬／錯亂腳印、香火的貼桌陣）。
   *  沒列出就回 sizeOf()。hat 0.20＝魔神仔紅帽的地面腳印，同樣是搬家不改值。 */
  flatByKind: { hat: 0.20 },
  /** 逐 kind 的**印記**尺寸覆寫（st.mark 蓋在受招／受益方身上的那一枚；沒列出走 markSize 預設）。
   *  seal 0.20＝虎爺印原本寫在編舞裡的 `stamp.scale.setScalar(0.2 * (1.9 - 0.9*e))` 那個 0.2
   *  （覆審 r2 N1/N7 抓到的最後一處第二來源），搬家不改值：實際演出仍是 0.2 ×(1.9→1.0)。 */
  markByKind: { seal: 0.20 },
  /** 這個 kind 的徽記本體尺寸（世界單位）。 */
  sizeOf(kind) { const v = this.byKind[kind]; return v === undefined ? this.size : v; },
  /** 這個 kind 貼桌副件的尺寸（世界單位）。 */
  flatSizeOf(kind) { const v = this.flatByKind[kind]; return v === undefined ? this.sizeOf(kind) : v; },
  /** 這個 kind 印記的尺寸（世界單位）。與 sizeOf 同一張表家族＝印記不再是繞過本檔的第二條路（N7）。 */
  markSizeOf(kind) { const v = this.markByKind[kind]; return v === undefined ? this.markSize : v; },
};

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

/** 三系的白名單：本體動作動詞庫／道具家族／受招反應家族。
 *  人類可讀的權威＝`docs/design/ART_BIBLE.md` §10.7（＝`2026-09-12-fx-vocab-draft.md` §B），
 *  這裡是它的程式版，`MOVE_SPEC` 的三個欄位只能取這三張表裡的值（P1 機械檢查，見 tests/fxvocab.test.mjs）。
 *  ★為什麼要白名單而不是自由字串★：「一招一組動作＋道具＋反應」如果可以隨手填新詞，
 *  27 支填完就會有 27 種講法——那正是 vocab.js 這個檔要擋的分岔（檔頭第二段）。
 *  props 的鍵＝家族代號（§10.7 的甲乙丙丁），值只是給人看的名字，機械檢查只看鍵。 */
export const FAC_VOCAB = {
  zuling: {
    props: { 甲: '骨牙石器', 乙: '織紋與珠', 丙: '木器', 丁: '日與雷' },
    acts: ['張', '扎', '躍', '割', '沉'],
    reacts: ['退', '升', '壓'],
    /** 丁「日與雷」是限縮家族（Q4 裁定）：只有這兩支可以用，其餘祖靈招用丁＝判紅。 */
    propOnly: { 丁: ['eliteOpenShot', 'boltGamble'] },
  },
  xianghuo: {
    props: { 甲: '印', 乙: '符旗', 丙: '香火', 丁: '儀仗金器' },
    acts: ['撲', '拍', '震', '降', '掃'],
    reacts: ['壓', '退', '升'],
    propOnly: {},
  },
  yinqi: {
    props: { 甲: '人身遺物', 乙: '濕物', 丙: '鬼火與魂片' }, // 陰氣沒有丁
    acts: ['探', '垂', '滯', '甩', '吸'],
    reacts: ['轉', '被拖', '抖', '壓'],
    propOnly: {},
  },
};

/** trId → { prop, act, react }：一招一組「道具家族／本體動作／受招反應」的登記表（Q9 的 schema）。
 *  逐招的完整理由與畫面描述在 `docs/design/2026-09-12-fx-vocab-draft.md` §C（27 列），
 *  **這裡只登記那三個受白名單約束的欄位**，散文不抄過來（抄＝第二份事實來源）。
 *  三尊三招不在表內（Q8：語彙納入、閘門不納入；§C 也明寫不在 27 列裡）。
 *
 *  ★§C 的散文動詞怎麼正規化到 §B 的動詞庫（實作時發現的八處，交製作人覆核）★
 *  §C 自己已標「＝某某的變體」的三處：繞＝張（eliteArmor）／撐＝張（boltGamble）／搖＝滯（hauntSee）。
 *  §C 用了庫裡沒有的字、由本表正規化的五處：
 *    swarmThorn    §C「刨」→ `沉`（低頭刨地＋拱背＝屈膝沉身那一類）
 *    eliteCleave   §C「劈」→ `掃`（香火「掃」的定義原文就是「旗面／劍弧橫過整排」）
 *    swarmLastStand §C「扎」→ `拍`（「扎」是祖靈的動詞；倒矛過頂往下插＝香火「拍」的砸落）
 *    eliteVsSwarm  §C「退」→ `抖`（陰氣的反應家族沒有「退」；取最接近的骨骼高頻小幅）
 *    swarmFeed1    §C「升」→ `被拖`（陰氣家族沒有「升」；§C 同一列另寫「被吸那隻被拖向甕口」，取這個受招方反應）
 *  正規化的方向一律是「往 §B／§10.7 的白名單收」，不是把新詞加進白名單——加詞會讓白名單逐卷變寬，
 *  等於這條檢查一年後只剩形式。 */
export const MOVE_SPEC = {
  /* ── 祖靈系 9 支 ── */
  eliteOpenShot: { prop: '丁', act: '張', react: '退' }, // 太陽球＋箭矢；弦鬆手＝張，最壯那隻退
  wardHpFront2: { prop: '乙', act: '扎', react: '升' }, // 菱紋帶沿盾牆展開；紮地＋前鋒托起
  eliteArmor: { prop: '乙', act: '張', react: '升' }, // 琉璃珠圈繞身；§C「繞」＝張的蛇形變體
  wardFirst: { prop: '甲', act: '張', react: '升' }, // 石雕眼＋腳下光柱；眼瞼全開＝張，前鋒搶半步
  boltGamble: { prop: '丁', act: '張', react: '壓' }, // 鋸齒雷片；§C「撐」＝張（雙翼撐開）
  swarmHalfSplash: { prop: '丙', act: '躍', react: '升' }, // 三道平行浪弧；三舟同時躍起
  swarmThorn: { prop: '甲', act: '沉', react: '退' }, // 獠牙反向彈回；§C「刨」正規化成沉
  eliteSelfCut: { prop: '甲', act: '割', react: '升' }, // 黑曜石刃（祖靈範本招）；自傷、本隊上抬
  wardHpAll1: { prop: '甲', act: '沉', react: '升' }, // 六塊岩繞一圈；屈膝沉身
  /* ── 香火系 9 支（本卷批 1）── */
  wardAtkAll1: { prop: '乙', act: '掃', react: '升' }, // 金紅大旗掃過整排
  eliteCleave: { prop: '丁', act: '掃', react: '退' }, // 斬擊弧；§C「劈」＝「劍弧橫過整排」＝掃
  wardAbsorb4: { prop: '乙', act: '降', react: '升' }, // 四面金箔帆圍成同心方框；船身前滑
  wardImmuneLost: { prop: '丁', act: '震', react: '升' }, // 銅鈴＋方框鈴波；全系唯一只有受益方
  swarmRally: { prop: '乙', act: '拍', react: '升' }, // 五面小旗插五方；頓足落地
  biteGamble: { prop: '甲', act: '撲', react: '壓' }, // ★E 定稿＝本批範本招★ 大印落下＝咬中，獵物被壓
  wardHpFirst: { prop: '丙', act: '降', react: '升' }, // 金灰顆粒流＋金色方符；傾倒送出
  wardRegen1: { prop: '丁', act: '降', react: '升' }, // 燈焰脫離燈罩下落
  swarmLastStand: { prop: '乙', act: '拍', react: '升' }, // 殘旗（缺角）；§C「扎」正規化成拍，反應在自身
  /* ── 陰氣系 9 支 ── */
  hauntLost: { prop: '甲', act: '探', react: '轉' }, // 紅帽戴到對手頭上（陰氣範本招）；原地打轉
  hauntSteal: { prop: '甲', act: '垂', react: '被拖' }, // 銀簪去而復返；目標被拖半步
  hauntSee: { prop: '甲', act: '滯', react: '抖' }, // 憑空多一張竹椅；§C「搖」＝滯的變體
  hauntDread1: { prop: '乙', act: '滯', react: '壓' }, // 雨滴群落下＋地面水漬；閃現位移
  hauntSwap: { prop: '乙', act: '甩', react: '被拖' }, // 粗濕繩；對面被拖、本方沉沒
  eliteVsSwarm: { prop: '甲', act: '探', react: '抖' }, // 爪片（盲讀標竿，動作不動）；§C「退」正規化成抖
  swarmPierce: { prop: '甲', act: '探', react: '抖' }, // 銅錢外圓內方（Q6 明文例外）；穿透而過
  hauntFearX2: { prop: '丙', act: '滯', react: '壓' }, // 虛影片＋腳下暗斑；群體縮
  swarmFeed1: { prop: '丙', act: '吸', react: '被拖' }, // 小甕複本被吸進甕口；§C「升」取同列的「被拖」
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

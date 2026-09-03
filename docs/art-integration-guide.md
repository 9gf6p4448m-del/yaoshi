# 妖市 美術素材整合指南

> 寫給**接下來要把 `assets/` 這批素材嵌進 `index.html` 的人**（含 AI）。
> 素材本身已經完成並實際渲染驗過；這份文件講**怎麼接進去**，以及接的時候會踩到的坑。
> **狀態（2026-09-03）：已全部整合進 `index.html` v0.11**，分四個 commit（主題與頭像／三段動畫／音效／配色橋接），
> 每階段 `trace(1..20)` 與前一 commit 逐位元組相等。本文件現在是「怎麼改、怎麼加」的參考；
> 接手時最容易踩的六件事另摘在 `IMPLEMENTATION_GUIDE.md` §11.14。
>
> 先讀 `IMPLEMENTATION_GUIDE.md` §7（強制檢查清單）與 §11.10 第 2 點（版面預算），再動手。

---

## 0. 這批素材有什麼

| 路徑 | 內容 | 數量 |
|---|---|---|
| `assets/theme.css` | 色彩／字型／圓角／陰影變數 ＋ utility class ＋ 動畫 keyframes | 1 |
| `assets/characters/*.svg` | 角色頭像，160×160，三種氣色狀態（10 角 ＋ 真人座位 `human`） | 11 |
| `assets/items/*.svg` | 法寶與命格道具圖示，64×64 | 12 |
| `assets/ui/*.svg` | 出價籌碼／盯字印章／夜份指示器／燈籠邊框 | 4 |
| `assets/audio/sfx.js` | Web Audio 合成音效，10 個聲部，零音檔（§8） | 1 |

風格：**廟口版畫**——粗黑描邊（stroke-width 3.5）、平面色塊、五官誇張、**全程無漸層**。
光源設定：整個畫面唯一的暖光來自燈籠（`--c-lantern` 系），底色是深靛夜空。

---

## 1. 掛上 theme.css

```html
<!-- index.html <head> 內，放在既有那個內嵌 <style> 之前 -->
<link rel="stylesheet" href="assets/theme.css">
```

**順序很重要**：`theme.css` 要在既有 `<style>` **之前**，這樣既有樣式仍然贏，整合可以一塊一塊來，不會一掛上去畫面就全變。

### 跟既有變數的關係（重要）

`index.html` 的 `:root` 有一組自己的舊變數名（`--bg`／`--table`／`--ink`／`--zuling`…）。
**v0.11 起這些舊名全部改成引用 `--c-*` token**（對照表在 `theme.css` 檔尾），舊十六進位值留在 `:root` 註解備查。

**為什麼不是打開 `theme.css` 的橋接段**：`theme.css` 在 index.html 的內嵌 `<style>` 之前載入，
兩邊的 `:root` 同特異度、後到者贏——橋接段在 index.html 裡打開也沒有效果。這是實作時才發現的，
所以改在 index.html 那一側做對照。

**色相變化**：舊 `--yinqi` 是紫色 `#9b6fd4`，新 `--c-yinqi` 是**暗綠**，紫讓給詛咒品（`--c-curse`）。
畫面上寫死的紫色（`.wishbar` 的 `#7a5ea8`／`#cdb9ee`）現在語意是「心願」，不是陰氣。
局末回顧的座位色 `RV_COL` 也連帶改掉：南金／北陰氣亮綠／西詛咒亮紫／東危急紅——
舊的 `--zuling`（現為烏木棕）跟 `--gold` 在曲線上分不開，所以北家不再用祖靈色。

---

## 2. 角色頭像

### 2.1 ⚠️ 檔名與 `ROLES` id 有 5 個對不上

**這是最容易踩的坑。** 直接寫 `ROLES[id] + ".svg"` 會有一半的角色 404。
檔名是本次任務指定的，`ROLES` id 是 `index.html` 既有的，兩邊得靠對照表接：

| `ROLES` id（`index.html`） | 角色 | SVG 檔名 | 一致？ |
|---|---|---|---|
| `qingmian` | 青面攤主 | `qingmian.svg` | ✅ |
| `hongyi` | 紅衣婆婆 | `hongyi.svg` | ✅ |
| `duanshou` | 斷手書生 | `duanshou.svg` | ✅ |
| `shoujing` | 收驚婆 | `shoujing.svg` | ✅ |
| `dangpu` | 陰間當鋪 | `dangpu.svg` | ✅ |
| **`hunter`** | 獵人 | `lieren.svg` | ❌ |
| **`xiaonv`** | 孝女白琴 | `xiaonu.svg` | ❌ |
| **`lvshan`** | 閭山法師 | `lushan.svg` | ❌ |
| **`zutou`** | 大家樂組頭 | `zuhe.svg` | ❌ |
| **`luzhu`** | 普渡爐主 | `pud.svg` | ❌ |
| `human` | 你（真人座位） | `human.svg` | ✅（2026-09-02 補上：兜帽無臉、手提小燈，垂危態臉上裂紋） |

```js
/* 建議做法：在 index.html 加一張對照表，不要改 ROLES 的 id
   （id 進了 trace 與存檔語意，改它要走等價驗證；改檔名則是純美術層的事）。 */
const CHAR_SVG = {
  qingmian:"qingmian", hongyi:"hongyi", duanshou:"duanshou",
  shoujing:"shoujing", dangpu:"dangpu",
  hunter:"lieren", xiaonv:"xiaonu", lvshan:"lushan",
  zutou:"zuhe", luzhu:"pud", human:"human",
};
const charSvgPath = roleId => CHAR_SVG[roleId] ? `assets/characters/${CHAR_SVG[roleId]}.svg` : null;
```

熱座模式的兩個真人座位（`MODES.hotseat.seats`）目前共用 `human.svg`；玩家二原本的 emoji 是 🧔，
要區分的話之後再出第二張，先不要靠翻轉或換色硬分（版畫風的臉翻轉會讓燈換手，看起來像另一個角色）。

### 2.2 用 inline SVG，不要用 `<img>`

氣色狀態是靠 **SVG 內部的 `<style>`** 切換的。`<img src="....svg">` 載入的 SVG
是獨立文件，外面的 class 進不去，三態會失效。要嘛 inline，要嘛用 `<object>`。
建議 inline（fetch 一次後快取字串），順便省掉 10 個 request。

```js
const _charCache = {};
async function charSvg(roleId){
  const f = CHAR_SVG[roleId]; if(!f) return "";
  if(!_charCache[f]) _charCache[f] = await fetch(`assets/characters/${f}.svg`).then(r=>r.text());
  return _charCache[f];
}
```

**十張頭像同時內嵌到同一頁是安全的**：每個檔的專屬顏色都收在
`.ys-char[data-character="<name>"]` 這個帶屬性的選擇器裡，其餘規則十個檔逐字相同，
所以彼此不會蓋掉。**新增角色時請照抄這個結構**——如果寫成沒有屬性限定的 `.ys-char{...}`，
最後載入的那一張會把全部角色的膚色與衣色一起改掉（這個 bug 實際發生過，是靠一次渲染比對抓到的）。

### 2.3 氣色三態怎麼切

三態是 class：`state-healthy`／`state-pale`／`state-dying`，套在 `<svg>` 根元素上。

**門檻直接沿用 `index.html:2200-2201` 既有的 `faceOf`／`faceLbl`**，不要另外發明一套，
否則頭像的氣色會跟旁邊的文字標籤（「氣色紅潤／面色蒼白／命懸一線」）對不上：

```js
/* 與 faceOf()/faceLbl() 同一組門檻：r>2/3 紅潤、r>1/3 蒼白、其餘命懸一線 */
function lifeState(p){
  if(!p.alive) return "state-dying";
  const r = p.life / CFG.LIFE;
  return r > 2/3 ? "state-healthy" : r > 1/3 ? "state-pale" : "state-dying";
}

/* 更新某個座位的頭像氣色。純呈現，不讀寫任何賽局欄位。 */
function applyLifeState(el, p){
  const svg = el.querySelector("svg.ys-char"); if(!svg) return;
  svg.classList.remove("state-healthy","state-pale","state-dying");
  svg.classList.add(lifeState(p));
}
```

三態的視覺差異：
- `state-healthy`：本色。
- `state-pale`：膚色換成該角色的 `--skin-pale`（血色褪去），衣服 `opacity:.72`，整體再去飽和。
- `state-dying`：膚色換成**屍青 `#8bc4c4`**，眼睛從 `.eye-live` 切成 `.eye-dead`（兩道橫劃＝眼神死），衣服 `opacity:.58`。

> `theme.css` 的 `.state-dying` 只做 `brightness(.78) contrast(1.08)`，**刻意不去飽和**——
> SVG 內部已經把臉換成屍青了，外面再 `saturate()` 一次會把屍青洗成灰，三態就只剩明暗差。
> 改這條之前請先看一眼實際畫面。

---

## 3. 道具圖示

### 3.1 ⚠️ 系別代號兩邊不同

| `POOL` 的 `f` 欄位 | SVG 的 `data-faction` | CSS 變數 |
|---|---|---|
| `zuling` | `zuli` | `--c-zuli` / `--c-zuli-light` |
| `xianghuo` | `xianghu` | `--c-xianghu` / `--c-xianghu-light` |
| `yinqi` | `yinqi` | `--c-yinqi` / `--c-yinqi-light` |
| （`CURSES` 的 `f:"curse"`） | — | `--c-curse` / `--c-curse-light` |

```js
const FACTION_CSS = { zuling:"zuli", xianghuo:"xianghu", yinqi:"yinqi", curse:"curse" };
```

### 3.2 ⚠️ 檔名與 `POOL` 的 `ab` 有 5 個對不上，其中 2 件 `POOL` 裡根本沒有

| SVG 檔名 | 對應 `POOL` 品名 | `POOL` 的 `ab` | 狀態 |
|---|---|---|---|
| `pojun` | 破軍旗 | `pojun` | ✅ |
| `sigui` | 飼鬼甕 | `sigui` | ✅ |
| `guoyin` | 過陰咒 | `guoyin` | ✅ |
| `fushou` | 福壽綿長 | `fushou` | ✅ |
| `shanshen` | 山神庇佑 | `shanshen` | ✅ |
| `xianji` | 獻祭刀 | `xianji` | ✅ |
| `wangchuan` | 送王船 | `wangchuan` | ✅ |
| `huyeyin` | 虎爺印 | `tiger` | 檔名≠ab |
| `yuyi` | 黃色小雨衣 | `raincoat` | 檔名≠ab |
| `zhuyigu` | 椅仔姑竹椅 | `chair` | 檔名≠ab |
| `rednail` | **`POOL` 沒有「紅線繡花鞋」** | — | 最接近的是「虎姑婆指甲」`nail` |
| `leinu` | **`POOL` 沒有「雷女銅鈴」** | — | 像是「雷女之火」`thunder` 與「千里眼銅鈴」`bell` 的合稱 |

`rednail` 與 `leinu` 是本次美術任務指定要畫的品名，但**設計文件與程式的 `POOL` 裡都沒有這兩件**。
兩個選項，請使用者裁定：(a) 這兩張圖先當儲備素材，之後真的加這兩件法寶時用；
(b) 改掛到既有的「虎姑婆指甲」與「雷女之火／千里眼銅鈴」上（`leinu` 的閃電比較貼「雷女之火」）。
**在裁定之前不要自作主張把圖掛到別的品項上。**

### 3.3 其餘 15 件法寶還沒有圖示

`POOL` 共 27 件、`CURSES` 5 件，這批只做了 12 個圖示。沒有圖示的請用**系別色塊佔位**
（`theme.css` 的 `.bg-zuli` / `.bg-xianghu` / `.bg-yinqi` / `.bg-curse`），不要留空白，
也不要拿別件的圖頂替。

```js
const ITEM_SVG = { 破軍旗:"pojun", 飼鬼甕:"sigui", 過陰咒:"guoyin", 福壽綿長:"fushou",
  山神庇佑:"shanshen", 獻祭刀:"xianji", 送王船:"wangchuan", 虎爺印:"huyeyin",
  黃色小雨衣:"yuyi", 椅仔姑竹椅:"zhuyigu" };
const itemSvgPath = it => ITEM_SVG[it.n] ? `assets/items/${ITEM_SVG[it.n]}.svg` : null;
```

---

## 4. UI 元件

### `bid-token.svg` — 出價籌碼
方孔銅錢，金色描邊。用在出價按鈕、標書列表的項目符號。可直接 `<img>`（沒有狀態切換需求）。

### `mark-stamp.svg` — 「盯」字印章
紅色方印，邊緣有墨水暈開的半透明多邊形。**疊在被盯角色的頭像上**，用法見 §5.3。
中央的「盯」是 `<text>`（帶 `data-glyph="盯"`），之後想換成路徑時可以照這個屬性找。

### `night-indicator.svg` — 夜份指示器（12 格月相）
`viewBox="0 0 244 24"`。兩個 JS 掛點：

```js
/* 標示當前夜／已過的夜。純呈現，不讀寫賽局狀態。 */
function renderNights(cur){
  for(let n=1;n<=CFG.ROUNDS;n++){
    const c = document.getElementById("night-"+n);
    const ph = document.getElementById("night-"+n+"-phase");
    if(!c) continue;
    c.setAttribute("fill", n===cur ? "var(--c-lantern-glow, #f0a840)" : "none");
    ph.setAttribute("opacity", n < cur ? "1" : "0");   /* 已過的夜留月光痕 */
  }
}
```

> ⚠️ **放進畫面之前先量版面**。手冊 §11.10 第 2 點寫明 `#felt` 的高度預算是**零餘裕**，
> 加任何牌桌內元件前要在 844×390 量四組溢出（一般／落魄／收祟／押寶＋持獻祭刀）。
> 建議**不要新增一列**，併進 `#feltHead` 現有那一行（`index.html:2196`），或放進底部列 `#south`。

### `lantern-frame.svg` — 燈籠邊框（給 CSS mask 用）

> ⛔ **2026-09-03 起不採用，理由見 §10。** 下面這段用法留著只是備查——目前遊戲裡**沒有任何直式卡**
> 可以套它，照抄會把燈籠拉成橢圓。哪天真的做了直式卡版面再回來看這一節。

`preserveAspectRatio="none"`，可拉伸成任意卡牌比例。**全部圖形都是純白**（白＝mask 保留區），
所以它**不能直接當圖片顯示**，只能當遮罩：

```css
.card-lantern{
  -webkit-mask-image: url(assets/ui/lantern-frame.svg);
          mask-image: url(assets/ui/lantern-frame.svg);
  -webkit-mask-size: 100% 100%;  mask-size: 100% 100%;
  background: var(--c-lantern);
}
```

---

## 5. 動畫規格

`theme.css` 已經備好 keyframes 與對應的 `.anim-*` class，直接加 class 就會播。
全部只動 `transform`／`opacity`／`filter`／`box-shadow`，不動版面屬性，手機上不會觸發 reflow。

### 5.1 開標揭曉（每件拍品開標前，總長約 3.4 秒）

| 時間 | 動作 | 實作 |
|---|---|---|
| 0 – 0.5s | 黑屏 | 疊一層 `.reveal-veil`，`opacity:0→1` |
| 0.5 – 1.4s | 燈籠光從底部打亮拍品 | 拍品卡加 `.anim-lantern-reveal`（`@keyframes lantern-reveal`，900ms） |
| 1.4 – 2.4s | 得標者角色發光 | 得標者座位加 `.card-glow`（`box-shadow: var(--shadow-lantern)`）＋ `.anim-lantern-reveal` |
| 2.4 – 3.4s | 落標者壓暗 | 落標者座位加 `.anim-fade-dim`（`opacity→.42`、`grayscale(.55)`） |

```css
.reveal-veil{ position:absolute; inset:0; background:#000; opacity:0; pointer-events:none;
  transition: opacity 500ms var(--ease-out); z-index:5; }
.reveal-veil.on{ opacity:1; }
```

**必須尊重既有的 `SKIP` 旗標**（`index.html` 全域，快轉模式）。既有的 `say()`／`playDuel()`
都是 `SKIP?短:長` 的寫法，照抄：`SKIP` 為真時整段壓到 ~0.4 秒。

### 5.2 對決場景（切進 `playDuel()`，`index.html:2724`）

| 階段 | 動作 | 實作 |
|---|---|---|
| 切入 | 全黑 0.3s | `#duel` 的 `opacity` 由 0→1，`transition: opacity 300ms` |
| 重燃 | 場景從市集切成廟埕深色 | `#duel` 背景改 `var(--c-bg)`，比牌桌 `--c-bg-surface` 更深 |
| 入場 | 兩角色 SVG 由左右滑入 | 左 `.anim-clash-left`、右 `.anim-clash-right`（各 700ms） |
| 碰撞 | 剪影衝撞 | keyframes 內建：45% 到位、60% 互推 ±18%、100% 回正 |
| 傷害 | 數字蓋章 | 傷害數字加 `.anim-stamp-in`（`scale 2→1`、`opacity 0→1`，420ms） |
| 退場 | 反向 | 兩側各加 `reverse` 的 animation-direction，或直接複用 `.anim-fade-dim` |

對決場景裡的角色頭像**也要套氣色 class**——對決當下正好是壽命最緊張的時刻，
垂危的那一方臉是屍青的，這是這套三態最有價值的地方。

#### `playDuel()` 裡已經有的三個效果，要決定留或換

`index.html:2746-2751` 目前已經在用三個 class，**新動畫和它們做的是同一件事**，
所以請**二擇一，不要兩層疊著播**（會變成推兩次、閃兩次）：

| 既有 | 它現在做什麼 | 建議 |
|---|---|---|
| `.charge-l` / `.charge-r` | 兩名對戰者互相衝撞的位移 | **換掉**——`.anim-clash-left/right` 是它的升級版（多了入場滑入與回正） |
| `.shake` | 落敗那一方中招後的抖動 | **留著**，新動畫沒有對應的效果 |
| `#flashfx`（`.on`） | 碰撞瞬間的全螢幕白光 | **留著**，新動畫沒有對應的效果 |

換掉 `.charge-*` 時記得 `index.html:2750` 那行 `loserEl.classList.remove("charge-l","charge-r")`
也要一起改成移除新的 class，否則落敗者的位移不會被清掉。

### 5.3 盯上宣告（`showMarkUI()` 之後，`index.html:2361`）

```js
/* 在被盯角色的頭像上蓋一枚「盯」印，播 stamp-in，再留殘影。 */
function stampMark(seatEl){
  const st = document.createElement("img");
  st.src = "assets/ui/mark-stamp.svg";
  st.className = "mark-stamp anim-stamp-in";
  seatEl.appendChild(st);
}
```

```css
.mark-stamp{ position:absolute; right:-4px; top:-4px; width:34px; height:34px;
  pointer-events:none; z-index:3;
  /* 殘影：印章落下之後持續留一圈紅 */
  filter: drop-shadow(0 0 6px var(--c-danger)); }
```

---

### 5.4 實作時才知道的三件事

- **`tests/tools/load.mjs` 只抓第一個 `<script>`**，且 stub 的 `document.getElementById` 回 `null`、沒有 `fetch` 的 DOM 環境。
  所以 `sfx.js` 的 `<script src>` 放主 script **之後**；任何演出程式碼不得在載入期碰 DOM 或 fetch（`preloadArt` 只在 `startEntry` 手勢裡跑）。
- **同一元素一次只能跑一支 CSS animation**：落敗者要播 `.shake` 前先把 `.anim-clash-*` 拿掉，否則 shake 不會動。
- **`renderSeats()` 重畫座位卡、但不重建 `#south`**：開標演出加在 `#south` 上的 `.dimmed`／`.anim-lantern-reveal` 要在 `renderSeats` 裡手動清，不然真人那一列會一直暗著。

## 6. 鐵則（違反就是把美術做進了賽局）

1. **動畫一律只用 `S.rngUi()`，絕對不碰 `S.rng()`。**
   這是手冊 §2.3 的硬規則：`S.rng` 是玩法流、`S.rngUi` 是演出流，兩條分開才能保證
   「有沒有播動畫」不改變賽局結果。既有的 `sayFrom()`（`index.html:2212`）就是正確範例。
   **`Math.random()` 全域禁用**——`grep -c "Math.random" index.html` 必須是 `0`。
2. **動畫的回呼裡不得讀寫 `S` 的任何賽局欄位**（`life`／`bag`／`marks`／`wishNight`…）。
   只讀 DOM、只寫 class 與 style。
3. **純美術改動的等價驗證**：照 §7 的規程，用同一支 `trace()` 對改動前後各跑 `seeds 1..20`，
   兩次輸出逐位元組**必須相等**。不相等就代表動畫漏進了賽局，回去找是哪一行碰了 `S.rng` 或改了狀態。
4. **版面預算**：手機 844×390（橫持）畫面不得溢出、不得重疊、按鈕點得到。
   `#felt` 是零餘裕，加牌桌內元件前先量四組（一般／落魄／收祟／押寶＋持獻祭刀）。
5. **`prefers-reduced-motion` 已經處理好了**（`theme.css` 檔尾），新增 keyframes 時記得
   把 class 加進那個 media query 的清單裡。

---

## 7. 三件缺口的裁定（2026-09-02 使用者裁定，整合時照這個做）

1. **`human` 頭像**——已補 `human.svg`（§2.1）。
2. **`rednail` / `leinu`**——**當儲備素材**，不掛到任何既有品項。`ITEM_SVG` 表裡不要放這兩個。
3. **其餘 15 件法寶 ＋ 5 件詛咒品**——整合時**先用系別色塊佔位**（`.bg-zuli` 等），圖示之後分批補。

---

## 8. 音效：`assets/audio/sfx.js`（純 Web Audio 合成，零音檔）

使用者裁定音效走 **Web Audio 程式合成**：單檔遊戲不用多載任何檔案，也沒有授權問題。
模組已寫好並離線渲染驗過（10 個聲部全部有輸出、峰值 ≤1、console 零錯誤）。

### 8.1 掛法

```html
<script src="assets/audio/sfx.js"></script>   <!-- 定義全域 YS_SFX，不自動播任何聲音 -->
```

```js
/* 手機瀏覽器規定 AudioContext 要在使用者手勢裡解鎖。標題頁的「開始」按鈕是最自然的位置： */
startBtn.addEventListener("click", () => { YS_SFX.unlock(); /* ...原本的開局流程 */ });
```

### 8.2 觸發對照表（聲部名＝事件）

| 聲部 | 事件 | 建議掛在 `index.html` 哪裡 |
|---|---|---|
| `gong` | 夜初開市、開標揭曉序列開始（§5.1 的 0s） | 開標流程進入點 |
| `woodfish` | 玩家按下出價／確認 | 出價按鈕 handler |
| `bell` | 得標（§5.1 的 1.4s，配 `.card-glow`） | `resolveAuction` 的得標分支 **之後的 UI 演出**，不是引擎內 |
| `whoosh` | 對決兩角色滑入、換場（§5.2） | `playDuel()` 入場 |
| `cymbal` | 對決碰撞瞬間（配 `#flashfx`） | `playDuel()` 的 `flashfx.classList.add("on")` 同一行 |
| `hurt` | 失血：對決傷害、詛咒侵蝕、毒標得手 | `playDuel()` 顯示傷害數字時；夜末結算演出 |
| `stamp` | 盯上宣告落印（§5.3） | `stampMark()` |
| `dawn` | 夜末天明回血、進下一夜 | 夜末結算演出結束 |
| `death` | 有玩家出局 | 出局演出 |
| `wind` | 燈籠風聲環境音（唯一的持續音，8 秒淡入淡出，要 loop 就每 7 秒再叫一次） | 牌桌畫面常駐；`SKIP` 時不播 |

### 8.3 鐵則（與 §6 同一套）

1. **`sfx.js` 本身不含任何亂數**。要讓同一個音每次略有變化，呼叫端傳 `S.rngUi()`：
   `YS_SFX.play("gong", { rnd: S.rngUi() })`。不傳＝`0.5`，完全決定性。**永遠不要傳 `S.rng()`**。
2. **要不要播由呼叫端決定**：`SKIP` 快轉時跳過所有 `play()`（`wind` 也要停）；靜音設定用 `YS_SFX.enabled=false`。
   建議包一層：`const sfx=(n,o)=>{ if(!SKIP) YS_SFX.play(n,o); }`，之後全部走這個。
3. **`play()` 只能放在演出層**——和動畫一樣，不得放進 `resolveAuction`／`resolveBattles` 這些
   會在 headless 模擬器（`?sim=1`、`tests/tools/*.mjs`）裡跑的引擎函式。引擎在 node 裡跑沒有 `window`，
   而且引擎裡多一個 `play()` 呼叫就算不耗亂數，也是把演出混進了結算。
4. **等價驗證同 §6 第 3 條**：改動前後 `trace(1..20)` 逐位元組相等。

### 8.4 測試音效時的已知事實

用 `YS_SFX.render(name, {rnd})` 可以離線渲染成 `AudioBuffer` 量 RMS／峰值。**不要寫「兩次渲染逐位元組相同」的測試**：
瀏覽器混音器對 ≥3 個輸入的加總順序不保證，同一參數兩次渲染會差 float32 末位（實測最大 1.19e-7），
這是量測本身的雜訊，不是模組的 bug。要驗決定性就驗 `maxdiff < 1e-5`。

---

## 9. 背景音樂：`assets/audio/bgm.js`（2026-09-03 加入）

使用者裁定「比照排球夢的方式」＝ Google Flow Music（flowmusic.app，Lyria 免費層）生成，
**下載必須使用者親手點**（Chrome 只認真人手勢，合成點擊觸發不了下載），拿到 WAV 後再做
節錄與無縫環。曲子是檔案不是合成——這是本專案第一次帶音檔，`sfx.js` 的「零音檔」原則
只適用於音效。

### 9.1 四層與觸發點（使用者 2026-09-03 裁定）

| 場景 key | 檔案 | 什麼時候切進去 | 掛在 `index.html` 哪裡 |
|---|---|---|---|
| `title` | `bgm/title.m4a` | 標題頁與選角畫面 | `startEntry()`（同一個手勢裡解鎖 AudioContext） |
| `market` | `bgm/market.m4a` | 牌桌：盯上／出價／開標，跨夜不重播 | `beginRound()`、對決退場處 |
| `duel` | `bgm/duel.m4a` | 結算戰對決場景 | `playDuel()` 入場 |
| `review` | `bgm/review.m4a` | 局末結果畫面與「本局回顧」 | `endGame()`、`showReview()` |

標題頁本身放不了音樂——瀏覽器要先有一次使用者手勢，而那一下就已經進選角了。
所以 `title` 實際涵蓋的是**選角畫面**。

### 9.2 ★安裝旗標★（最容易漏掉的一步）

`bgm.js` 檔頭有一張 `READY = { title:false, market:false, duel:false, review:false }`。
**把曲子檔案放進 `assets/audio/bgm/` 之後，要把對應那一行改成 `true`，音樂才會播。**

為什麼不做成「抓抓看、404 就算了」——瀏覽器會把 404 記成 console error，而
「console 0 error」是本專案的驗收條件之一，一旦有常態性的 404 噪音，真正的錯誤就被蓋掉了。
`READY` 是 `false` 時這一層連 `fetch` 都不發。

### 9.3 鐵則（與 §6／§8.3 同一套）

1. **不含亂數、不讀寫遊戲狀態**——和 `sfx.js` 同一條。等價驗證同樣是 `trace(1..20)` 逐位元組相等。
2. **只能從演出層呼叫**：`startEntry`／`beginRound`／`playDuel`／`endGame`／`showReview`。
   引擎函式（`resolveAuction`／`resolveBattles`／`simulate`）零呼叫——headless 載入時 `YS_BGM` 根本不存在。
3. **與 `YS_SFX` 共用同一個 AudioContext**（iOS 開兩個會很吵），但音量各走各的 gain。
4. **`SKIP` 快轉不影響音樂**：音樂是底色不是事件；要停音樂請用開關。
5. **一顆鈕管全部音訊**：`#sfxBtn` 同時開關音效與音樂（手機直式版面吃緊，不另加開關）。
   狀態記在 `localStorage` 的 `ys_sfx`。

### 9.4 風聲會被壓低

使用者裁定：BGM 播放時燈籠風聲（`wind`）自動壓低而不是停掉，保住夜市的空氣感。
`sfx.js` 的 `wind` 聲部多收一個 `opts.gain`（不傳＝原本的 0.12），`index.html` 的
`windGain()` 依 `YS_BGM.playing()` 在 `WIND_GAIN=0.12` 與 `WIND_DUCK=0.035` 之間切。
`YS_BGM.onChange` 會在音樂起停時重開風聲的循環，讓音量立刻生效（不然要等下一段 8 秒）。

### 9.5 曲子的規格（交給 Flow Music 之後要做的加工）

- **長度**：節錄成 60 秒左右的無縫環（首尾各留 3–4 秒做 crossfade，接點聽不出來為準）。
- **格式**：`.m4a`（iOS Safari 友善），單聲道或立體聲皆可。
- **響度**：四首之間要對齊，不然切場景會忽大忽小。排球夢的基準是選單 −14.6 LUFS／
  比賽層 −16.7 LUFS；妖市走同一個相對關係：`title`／`review` 稍亮，`market` 最低（要壓在人聲台詞下面），
  `duel` 可略高於 `market`。
- **檔案大小**：這是單檔遊戲＋PWA，四首加起來盡量壓在 4 MB 以內。

---

### 9.6 安裝紀錄（2026-09-03，v0.27）

四首已安裝、`READY` 全 true。來源＝Flow Music 八首（曲名對應見 `docs/bgm-prompts.md` 生成紀錄），加工腳本 `docs/experiments/2026-09-03-bgm-make.sh`（ffmpeg：第 30 秒起取 60 秒、首尾 4 秒 half-sine 等功率交叉淡接、量 LUFS 後套增益＋限幅 `alimiter=limit=0.79:level=0`、AAC 80k）。

| 場景 | 檔案 | 來源 take | 響度 | 峰值 |
|---|---|---|---|---|
| title | `bgm/title.m4a` | Lantern-Lit Night Market | −15.0 LUFS | −0.1 dBFS |
| market | `bgm/market.m4a` | Tense Underscore (Take 1) | −18.1 LUFS | −1.8 dBFS |
| duel | `bgm/duel.m4a` | Ritual Luogu | −14.7 LUFS | −1.1 dBFS |
| review | `bgm/review.m4a` | Dawn Breaking | −15.1 LUFS | −2.2 dBFS |

每首 60.000 秒、約 615 KB，四首合計 2.4 MB（預算 4 MB 內）。**備選 take 在 `bgm/alt/*-alt.m4a`**（同規格），換曲只改 `bgm.js` 的 `TRACKS` 路徑。
兩個坑：①ffmpeg `alimiter` 預設 `level=1` 會把輸出自動拉到滿刻度，響度全部偏大 1 LU、峰值破 0——要 `level=0`。②接點只能量 RMS（尾 30ms 與頭 30ms 差 1～3.5 dB），順不順只有耳朵能判。

## 10. 未採用的素材（要有紀錄，才不會下次又被當成漏做）

| 素材 | 狀態 | 理由 |
|---|---|---|
| `items/rednail.svg`（紅線繡花鞋） | 儲備 | `POOL` 裡沒有這件法寶。2026-09-02 裁定：不掛到任何既有品項 |
| `items/leinu.svg`（雷女銅鈴） | 儲備 | 同上 |
| `ui/lantern-frame.svg` | **不採用（2026-09-03）** | 它是 200×280 的**直式卡框** mask。妖市目前沒有任何直式卡：拍品卡是 4 欄橫排的矮卡（約 88×82），開標大卡與標書都是橫幅。`preserveAspectRatio="none"` 拉伸到這些比例會把燈籠壓成橢圓、提樑變成粗橫條。要用它得先有直式卡的版面需求 |

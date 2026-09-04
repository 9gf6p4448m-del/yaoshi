# 真實參照筆記 — `hairpin` 林投姐髮簪（陰氣／haunt）2026-09-04

依 `docs/design/ART_BIBLE.md` §0.5。參照圖已下載到 `tools/anyCreature/out/ref/hairpin/`（該目錄在 `.gitignore` 的 `tools/anyCreature/` 之下，不進版控），**六張全部用 Read 工具親眼看過**，下面的特徵是從圖上抽的，不是從文字描述抄的。

## 參照素材

| 檔名 | 來源 | 授權 | 看到什麼 |
|---|---|---|---|
| `linto_roots1.jpg` | Wikimedia Commons `Starr-091104-0749-Pandanus tectorius-prop roots-Kahanu Gardens NTBG` | Starr Environmental, CC BY | 林投（露兜樹 *Pandanus tectorius*）支柱根：**幾十根筆直、略帶錐度的圓桿從樹幹一點向下外呈錐裙狀散開落地**，桿身互相交錯、灰褐帶青苔綠 |
| `linto_leaf.jpg` | Commons `Starr 080608-7733 Pandanus tectorius` | 同上 | 同一種錐裙，看得更完整：**上窄下寬的圓錐，密到看不見裡面**，根桿長短不一、末端插進地面 |
| `linto_roots2.jpg` | Commons `Starr-040209-0093-...prop roots-Hana Hwy-Maui` | 同上 | 近景根桿：表面有橫向環節、乾濕交界的深斑 |
| `ghost_oyuki.jpg` | Commons `Oyuki.jpg`（圓山應舉《幽靈圖》，18 世紀掛軸） | Public domain | **長髮女鬼的古典圖像文法**：頭低垂偏側、中分長髮沿兩頰垂到胸前、雙手攏在寬袖裡置於胸腹、素白衣、**腰以下整個淡出消失、沒有腳** |
| `ghost_okyo_scroll.jpg` | Commons Rijksmuseum RP-P-1990-152 | Public domain | 同一圖像傳統的浮世繪版本，長髮＋下半身消失 |
| `hairpin_qing.jpg` | Commons `Silver Earpick-Hairpin - Late Qing Dynasty - National Palace Museum - Taipei` | CC BY | 清代髮簪實物：**一根細長金屬桿＋一端寬扁的裝飾頭**（點翠藍葉片、金人偶、紅寶石珠、珍珠），桿的另一端是尖的 |
| `wethair.jpg` | Commons `Woman With Wet Hair Using Hairbrush` | CC BY | 濕長髮：**整體是一片連續的布狀簾幕**，不是一根根；表面靠縱向明暗條讀出髮絲；**只有末端才散開成一綹一綹的尖端**，下緣參差不齊 |

**文獻（不是圖）**：zh.wikipedia 條目《林投姐》，2026-09-04 取。要點：清代台南寡婦李昭娘被亡夫友人周亞思騙財騙色，在**雨夜**扼死幼子後**自縊於林投樹**，化為厲鬼；「當地居民常在海邊的林投樹下，看到**披髮的女鬼**出沒」；以銀錢買肉粽、錢化紙錢；歌仔戲野台夜戲常演的劇目。
**誠實標記**：文獻沒有提到髮簪——「怨情之簪」是妖市法寶設定（`index.html` POOL 第 20 件），不是民俗特徵。所以簪的造型走**清代髮簪實物**（`hairpin_qing.jpg`），不假託文獻。

## 一眼特徵清單（造型必做，盲讀要命中；目標 5/5）

1. **垂到地的整片長髮**——從頭頂中分垂下、連成**一片布狀簾幕**（不是一根根），表面是縱向明暗條；只有**末端散開成一綹一綹的尖**、下緣參差不齊。（`wethair.jpg`）
2. **下半身沒有腿，被髮簾／氣根蓋住並飄浮**——腰以下是一個**上窄下寬的錐裙**，由許多筆直略帶錐度的細桿長短不一地散開，密到看不見裡面；底端**不落地**（飄浮）。（`linto_leaf.jpg`＋`linto_roots1.jpg`＋`ghost_oyuki.jpg` 的「腰以下淡出」）
3. **小而蒼白、低垂的臉**——頭往前下低垂，臉被兩側頭髮夾住只露出中間一條，眼是兩個發光小點（不是圓大眼）。（`ghost_oyuki.jpg`）
4. **一支長髮簪握在手上、尖端朝前**——細長桿＋一端寬扁的葉片狀裝飾頭＋一顆紅珠，另一端是銳尖。（`hairpin_qing.jpg`）
5. **濕透的素白壽衣與垂袖**——上半身是吸飽水的素色布，袖口寬而下垂，兩臂一長一短、不對稱。（`ghost_oyuki.jpg` 的攏袖＋ART_BIBLE §3「吸飽水的布」）

## 這幾條怎麼翻成 anyCreature 幾何（ART_BIBLE §5 對照表）

- 濕髮 → 下垂 `fin` 條（瀏海與胸前兩綹）＋末端 `ghost_*` 半透明；髮絲縱向明暗＝`colors.arcs` 窄帶（`sides` 的角度格要對齊，見 `review-redhat` ⑤-5）
- 氣根 → 腰以下多條細 `curve` 垂落、長短不一（ART_BIBLE 明文），本隻直接把它當「髮尾＝氣根」的雙關
- 吸飽水的布 → 壽衣體積 `exp ≥4.8` 的硬斷面＋低彩度灰白
- 一點刺眼的紅 → 簪頭的 `glow_pin` 紅珠（面積極小）；刺眼的白 → `eye` 兩個白光點
- 系別苔綠 → 髮尾 `ghost_wisp` 與髮簾 `ghost_hair` 的窄青帶（**不放在壽衣或簪上**，`saturation_area` 預算要留給紅珠）

## 文化提醒

`ghost_oyuki.jpg` 是日本幽靈畫，不是台灣的圖像；**借用的只是「長髮＋下半身消失」的構圖文法**，服裝、髮式、道具一律走台灣脈絡（素白壽衣、清代髮簪、林投氣根），不做和服、不做振袖、不做日式髮型。

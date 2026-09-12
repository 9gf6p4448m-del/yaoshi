# 2026-09-12 — tier 1 短版時間軸比例化（23 支，配合 260→300ms 裁定）

## 背景

使用者裁定 tier 1 短版 260→300ms（`PW_FX.TRAIT_MS_BY_TIER[1]`）。批 0 四支
（`eliteSelfCut`／`wardImmuneLost`／`biteGamble`／`hauntLost`）走 `st.beat`（比例制），
換常數後自動填滿；其餘 23 支的時間軸是寫死的絕對毫秒（照 260 排），常數改 300 後
`fillOK` 全部只紅這一項（horizon 仍停在 260 排的絕對值，除以新 ms=300 後比例掉到
0.75–0.83，低於 0.85 門檻）。

本卷把 23 支改成比例制（純重構，不動演出內容）：每支函式開頭加

```js
const K = st.ms / 260;
```

並把該函式內每一個字面毫秒（`ms:`／`delay:`／`i * 常數` 這類算式）乘上 `K`。260ms 時
`K=1`，逐值精確等於原常數；ms 改變時全部時點等比縮放。**不動**：演出內容、顏色、
尺寸、積木用法、`V054`／`V054_SHORT`、`index.html`、治具、判準、`vocab.js`、
`emblems.js`、批 0 四支引用（`SHORT.eliteSelfCut = MOVES.eliteSelfCut` 等）。

## 23 支清單與時點換算

以下「原始毫秒」是 260ms 排練時的字面值；「比例」欄一律是 `原始毫秒 × K`
（`K = st.ms / 260`），逐支列出函式內用到的所有相異毫秒值（`ms:`／`delay:`；
含 `forEach` 內的錯位算式，如 `i * 12` 一併乘 K）。

### zuling.js（8 支）

| 招式 | 原始毫秒（260 基準） |
|---|---|
| `eliteOpenShot` | 55, 70, 80, 85, 155, 160, 165 |
| `wardHpFront2` | 60, 65, 70, 85, 90, 95, 160 |
| `wardHpAll1` | 55, 65, 70, 85, 90, 100, 160 |
| `wardFirst` | 58, 60, 62, 70, 74, 78, 84, 88, 95, 96, 100, 107, 108, 112, 120+i·8, 160, 168 |
| `boltGamble` | 30, 62, 72, 74, 78, 78+i·26, 92, 138, 140, 150 |
| `swarmHalfSplash` | 60, 70, 80, 90, 110, 140, 170, i·18（lag）|
| `swarmThorn` | 40, 58, 65, 85, 150, 152, 165 |
| `eliteArmor` | 54, 55, 60, 65, 80, 82, 85, 90, 92, 95, 100, 150+i·2, 155, 160 |

### xianghuo.js（7 支）

| 招式 | 原始毫秒（260 基準） |
|---|---|
| `eliteCleave` | 62, 78, 80, 86, 92, 96, 100, 104, 112, 116+i·12, 166 |
| `wardAtkAll1` | 58, 62, 72, 76, 82, 84, 88, 90, 106, 114+i·12, 132, 164, 166 |
| `wardAbsorb4` | 30, 48, 50, 52, 58, 60, 80, 82, 84, 92, 94（i·14）, 96, 104, 118, 120+i·14, 166, 168, 170 |
| `swarmRally` | 40, 50, 58, 66, 68, 74, 78, 80, 84, 85, 90, 104, 108+i·6, 110, 112+i·6, 122+i·12, 132, 134, 160, 168 |
| `wardHpFirst` | 45, 48, 60, 62, 72, 80, 82, 145, 155, 160, 162 |
| `wardRegen1` | 40, 44, 56, 60, 62, 76, 82, 84, 86, 88, 100, 140, 148, 150, 168, 172 |
| `swarmLastStand` | 40, 55, 58, 62, 78, 82, 85, 86, 88, 146, 148, 150, 170, 172 |

### yinqi.js（8 支）

| 招式 | 原始毫秒（260 基準） |
|---|---|
| `hauntSteal` | 30, 40, 60, 62, 84+i·10, 86+i·10, 88, 90+i·10, 96, 100+i·12, 165, 170, i·12 |
| `hauntSee` | 62, 66, 70, 74, 84, 86, 92, 104, 108+i·12, 112+i·12, 166, i·10 |
| `hauntDread1` | 58, 60, 92+i·14, 96, 100, 104+i·8, 124, 170, i·8 |
| `hauntSwap` | 58, 70, 74, 76, 82, 92, 96, 104, 108, 132, 152, 170, i·9 |
| `eliteVsSwarm` | 42, 45, 64, 76, 82, 84, 120+i·22, 158, 164 |
| `swarmPierce` | 60, 64, 86, 88, 100, 104, 164, i·10 |
| `hauntFearX2` | 58, 78+i·8, 86, 92, 92+i·8, 96, 112+i·8, 126, 170, i·8 |
| `swarmFeed1` | 30, 34, 40, 58, 70+i·12, 76+i·12, 82, 84, 148, 150+i·10, 152+i·12, 154+i·12, 170 |

（每一項都在函式內是 `值 * K` 或 `(值 + i·常數) * K` 的形式；`K` 統一定義在函式開頭
`const K = st.ms / 260;`。）

## 驗收證據

環境：`git worktree add --detach .claude/tmp/base6defe13 6defe13`（基準樹）。

1. **260 下等價**（`--fxvocab=1` 才會走到本次改動的 SHORT 匯出——不帶這個旗標
   `traitfx-drive` 預設測的是 `PW_FX.VOCAB_ON=false` 的 0.54 演出，逐位元組相等的斷言
   必須在 `--fxvocab=1` 下做，否則兩邊比對的是完全沒被本卷動到的程式碼）：

   ```
   node tests/tools/traitfx-drive.mjs now_t1_vocab260.json --tier=1 --fxvocab=1 \
     --sigdump=sig_now_t1_vocab260.txt
   node tests/tools/traitfx-drive.mjs base_t1_vocab260.json --tier=1 --fxvocab=1 \
     --root=.claude/tmp/base6defe13 --sigdump=sig_base_t1_vocab260.txt
   diff sig_base_t1_vocab260.txt sig_now_t1_vocab260.txt
   ```

   結果：兩邊皆 **27/27 pass**；`diff` **0 行差異**（exit 0）。

   t2（完整版，未改動）同法比對：兩邊皆 **30/30 pass**，`diff` **0 行差異**（exit 0）。

2. **300 下填滿**（`PW_FX.TRAIT_MS_BY_TIER[1]` 與 `tests/tools/fx-consts.mjs` 的鏡像常數
   同步暫改 300，只在驗收時用副本，驗完已用備份還原——最終 `git diff` 不含這兩處）：

   - **本樹（23 支已比例化）**：`node tests/tools/traitfx-drive.mjs ... --tier=1 --fxvocab=1`
     → **27/27 PASS**，`fillOK`／`rateOK`／`actionsOK`／phase gate 全綠，0 error。
   - **基準樹（23 支仍是絕對毫秒，常數改 300）**：同一支治具指向
     `--root=.claude/tmp/base6defe13` → **4/27 pass**（只有批 0 的
     `eliteSelfCut`／`wardImmuneLost`／`biteGamble`／`hauntLost` 過，其餘 23 支
     `fillOK` 紅，fill 落在 0.74–0.82）。

   對照：本樹 27/27 vs 基準樹（常數改 300）4/27。

3. **trace-eq**：`node tests/tools/trace-eq.mjs .claude/tmp/base6defe13/index.html index.html`
   → `{"equal":true}`（`index.html` 逐位元組未動，恆真但仍照驗收條件貼出）。

4. **規則測試 12 套**：`for f in tests/*.test.mjs; do node $f; done` 全綠
   （`aistake` 8/8、`conscap` 5/5、`duel-desync` 7/7、`emblem-collision` 9/9、
   `fxtier` 14/14、`fxvocab` 15/15、`legend` 32/32、`lineup-order` 8/8、
   `nightrules` 16/16、`review` 28/28、`roles-balance` 32/32、`wish16` 36/36）。

## 範圍

`git diff --stat 6defe13..HEAD`：

```
js/trait-fx/xianghuo.js | ...
js/trait-fx/yinqi.js    | ...
js/trait-fx/zuling.js   | ...
```

只動三系檔，`index.html`／`tests/tools/fx-consts.mjs`／`vocab.js`／`emblems.js`／治具
一律未動（300ms 的驗證用副本改回並還原）。

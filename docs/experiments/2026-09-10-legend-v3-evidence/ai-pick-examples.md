# AI 得主的「選尊」規則實例（提案 §二 3：與自己袋中最多的陣營同系；同數取 LEGENDS 順序靠前者）

產生方式：`node -e` 直接呼叫匯出的 `aiPickShrine(p)`，逐案擺好袋子與「還開著的尊」再問它。決定性、零亂數。

| 情境 | 袋中各系件數 | 還沒被請走的尊 | AI 選 |
|---|---|---|---|
| 空袋（三系皆 0，同數） | {} | #0 zuling、#1 xianghuo、#2 yinqi | **#0 殘日（zuling）** |
| 2 香火 1 祖靈 | {"xianghuo":2,"zuling":1} | #0 zuling、#1 xianghuo、#2 yinqi | **#1 大士爺紙尊（xianghuo）** |
| 2 祖靈 2 香火（同數） | {"zuling":2,"xianghuo":2} | #0 zuling、#1 xianghuo、#2 yinqi | **#0 殘日（zuling）** |
| 3 祖靈，但祖靈那一尊已被別人請走 | {"zuling":3} | #1 xianghuo、#2 yinqi | **#1 大士爺紙尊（xianghuo）** |
| 2 陰氣 1 祖靈 | {"yinqi":2,"zuling":1} | #0 zuling、#1 xianghuo、#2 yinqi | **#2 有應公（yinqi）** |

★真人得主走的是同一格的覆寫★：選尊視窗把玩家點的 index 帶進 `finishShrines(out, idx)`，
兩條路最後都收在同一支 `awardLegend`；idx 不合法或指到已被請走的尊時退回這張表的規則。

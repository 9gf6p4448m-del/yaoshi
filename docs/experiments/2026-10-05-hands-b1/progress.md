# v0.61.0 hands-b1 進度（分段 commit）

| 段 | SHA | 內容 |
|---|---|---|
| 凍結 | 6d08af39 | acceptance.md（主對話提交） |
| ① 角色專屬手轉產品 | 530e3941 | js/hand-b1.js（新）、table-hands 預設啟用＋`?handb1=0`、hand-realism ext 掛點、hand-motion ROLE_PARTS／B1_ON |
| ② 拇指收角 | fad19b36 | HAND.SLAM_THUMB、POSES.spreadT、director per.slamPose、`?thumb=0` |
| ①b 效能 | 05bf58f8 | 批 1 手碰撞／信物／伸入點集去重複頂點（擺位逐位元相同；條件 10 r3） |
| ③ 驗證證據（條件 1–11） | 50bc7f93 | README.md、tools/、各條件輸出 |
| 修訂記錄 | ea3c56db、09a9ce7f | 主對話：條件 11 例外修正；使用者簽 5／6／10／12 |
| A 效能第二輪 | 46f43171 | placeAt 快取統計＋relicHit 剔除（逐位元相同） |
| ⑤ 測試改寫 | d0282ca9 | 使用者簽核清單內＋清單外兩處 |
| ⑥ 版本 0.61.0 | 94e47f68 | 字串已改；送達（push／Pages）未做，推 main 前先告知使用者 |
| 第二輪證據 | 見本檔所在 commit | README 第二輪段、rerun/、c10/r4*、c6/11–15、c5-roundness-facing-* |

基準樹：C:/Users/shung/wt/yaoshi/hands-b1-base（4691a7ce，detached）。未 push。

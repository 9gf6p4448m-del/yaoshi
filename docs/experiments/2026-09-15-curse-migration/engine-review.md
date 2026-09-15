# 詛咒引擎獨立覆審紀錄

範圍：e111914→3a157b0 初稿，以及 36348c9／當前 tests/curse-migration.test.mjs 修補。a1_projection 唯讀覆審 root 引擎；不審自己的 tray，也不把尚未合併的 power 候選當已完成。

- 初稿 HIGH：curse 事件落入一般 hit，浮字/紅閃在對手側，鎖降攻被誤畫成失血。已新增 pwCurseFeedback 與獨立呈現分支；持有者同側，攻擊與血量字樣區分，鎖不紅閃。
- 初稿 MEDIUM：水符在同批 pending 傷害未結完即選存活目標。已在 pwSettle 完成整批之後才一次觸發；全滅不牽連、兩死一存活只打真正存活者、重入旗標避免連鎖。
- 修補 MEDIUM：未知 trId 被預設成 HP 傷害。改為「效果未登錄」、healthLoss=false、不派 hit。
- 夜末禮金的 wonAny、drain→gift→hooks 順序及 extLoss；白虎在一般上限後／減傷前；每場依當下袋子重算與四種戰鬥免疫均經檢查。

最終此範圍無未解 HIGH/MEDIUM。power 完整退役及 tray JS 另行覆審；本紀錄不是全版發行簽核。

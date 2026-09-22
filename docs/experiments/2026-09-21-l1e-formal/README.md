# L1e 正式數值分項與跨夜模型範圍

承接cb64f4e，使用者要求下一步。依[執行前凍結](acceptance.md)，本卷固定8個主臂，各seeds1..10000，分開處理H1追件桌及H9原預設桌。原探索資料保留；這個種子集合與先前開發樣本重疊，不稱未見過的holdout。

H1水／虎／眼各相對splitter判−8～+5pp；H9水／虎按全四席曾持有、每臂各自條件分母判+3～+10pp，normal≤85%。H9千眼原桌不使用情報、六之四完整模型未閉合，兩者hard incomplete；數值分項即使通過也不能解除。任一正式分項FAIL則overall FAIL，否則仍incomplete，releaseEligible=false。

## 執行與資料

工具／覆審完成後，才封存execution-lock並按臂最多3個Node程序執行。8個gzip JSON保留逐局原始紀錄、來源／依賴hash、CFG、有效連攜表、seed集合與角色。彙整拒絕來源混用、缺臂、缺／重複seed及非法holder資料。已存在輸出拒覆寫；不因結果換策略、調係數或刪樣本。

## 正式量測結果與使用者裁定（2026-09-22）

80,000 局（8 臂各 10,000 種子）已全數執行並完成 gzip raw 與 aggregate 產出（commit `814b467`）。

### 量測結果彙整
- **H1 追件桌**（門檻 `[-8, +5] pp`）：三臂全數通過
  - water: +2.0200 pp (pass)
  - eyes: +0.5600 pp (pass)
  - twinTiger: +1.0400 pp (pass)
- **H9 原預設桌**（門檻 `[+3, +10] pp` 且 normal ≤ 85%）：
  - water: +0.9338 pp (fail)
  - eyes: 0.0000 pp (incomplete / diagnostic)
  - twinTiger: -0.6257 pp (fail)
- **整體合約判定**：`Overall: fail; release eligible: false`

### 使用者裁定（選項甲）
使用者於 2026-09-22 裁定**選項甲**：
1. **數值維持不變**：H1 追件桌數據證明在主動追件策略下，三項連攜均呈現穩定正勝差（+0.56 ~ +2.02 pp），處於預期平衡帶內，不破壞既有健康數值。
2. **H9 結果記錄為已知診斷基線**：H9 原桌 AI 並不具備連攜意識，且 Normal 與 Zero 分母非因果、runner 在座位 0 陣亡即停止。此未達標項作為原桌無意識持有之診斷基線，記錄為非阻塞已知項，不阻塞後續 L1 推進。
3. **本卷結案**：量測資料已落盤封存，測試全數通過（33/33、回歸 66/66），本卷正式結案。

## 六之四的具體模型缺口

[模型契約](model-contract.md)與[機器可讀盤點](model-contract.json)逐項列root支持集、真實狀態snapshot／restore、各phase合法全席動作、資訊集合、chance分支、terminal與payoff／freeLunch語意，以及每項下一個驗收。它們是模型規格與現況盤點，不是已完成的整局窮舉器。

原12夜／原solo結束規則讓模型有限，但不使既有10000種子變成完整root/chance支持集。資訊集合一致的完整條件策略也不是幾個具名策略的勝率矩陣。下一個工程是可跑的contract auditor／忠實state與phase adapters；未知或未接phase必須回incomplete。收益與freeLunch基準尚未閉合，不把終局勝負效用直接冒充原事件淨收益。

產品未改、候選仍v0.57.37，公開v0.57.35。A3六局暫緩、試玩／美術盲讀未完成。本卷不發布候選。

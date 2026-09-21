# L1e 正式數值分項與跨夜模型範圍

承接cb64f4e，使用者要求下一步。依[執行前凍結](acceptance.md)，本卷固定8個主臂，各seeds1..10000，分開處理H1追件桌及H9原預設桌。原探索資料保留；這個種子集合與先前開發樣本重疊，不稱未見過的holdout。

H1水／虎／眼各相對splitter判−8～+5pp；H9水／虎按全四席曾持有、每臂各自條件分母判+3～+10pp，normal≤85%。H9千眼原桌不使用情報、六之四完整模型未閉合，兩者hard incomplete；數值分項即使通過也不能解除。任一正式分項FAIL則overall FAIL，否則仍incomplete，releaseEligible=false。

## 執行與資料

工具／覆審完成後，才封存execution-lock並按臂最多3個Node程序執行。8個gzip JSON保留逐局原始紀錄、來源／依賴hash、CFG、有效連攜表、seed集合與角色。彙整拒絕來源混用、缺臂、缺／重複seed及非法holder資料。已存在輸出拒覆寫；不因結果換策略、調係數或刪樣本。

本節在正式資料產出後補上結果與驗證，尚未執行的分項不算通過。

## 六之四的具體模型缺口

[模型契約](model-contract.md)與[機器可讀盤點](model-contract.json)逐項列root支持集、真實狀態snapshot／restore、各phase合法全席動作、資訊集合、chance分支、terminal與payoff／freeLunch語意，以及每項下一個驗收。它們是模型規格與現況盤點，不是已完成的整局窮舉器。

原12夜／原solo結束規則讓模型有限，但不使既有10000種子變成完整root/chance支持集。資訊集合一致的完整條件策略也不是幾個具名策略的勝率矩陣。下一個工程是可跑的contract auditor／忠實state與phase adapters；未知或未接phase必須回incomplete。收益與freeLunch基準尚未閉合，不把終局勝負效用直接冒充原事件淨收益。

產品未改、候選仍v0.57.37，公開v0.57.35。A3六局暫緩、試玩／美術盲讀未完成。本卷不發布候選。

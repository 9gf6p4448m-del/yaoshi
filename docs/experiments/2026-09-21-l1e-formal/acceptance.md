# L1e 正式數值分項：執行前凍結 v1

基準 cb64f4e；使用者要求下一步。正式策略池先凍結再量測，不更動舊門檻、產品數值或角色／AI規則。不重跑原探索卷來替代正式資料。

## 八個主臂

| arm | 座位0策略 | picks | 效果／觀測 |
|---|---|---|---|
| h1-splitter | 原POLICIES.splitter | ['qingmian'] | 正常全組；recordChainHoldings |
| h1-water | target-chaser-v1 water | ['qingmian'] | 正常全組；recordChainHoldings |
| h1-twinTiger | target-chaser-v1 twinTiger | ['qingmian'] | 正常全組；recordChainHoldings |
| h1-eyes | eyes-informed-v1 | ['qingmian'] | 正常全組；recordChainHoldings＋policyInformation |
| h9-normal | policies={}，原scriptedBids | undefined | 正常全組；recordChainHoldings |
| h9-zero-water | 同h9-normal | undefined | 僅刪water的flags/traits/hooks/army；record |
| h9-zero-twinTiger | 同h9-normal | undefined | 僅刪twinTiger同上欄位；record |
| h9-zero-eyes | 同h9-normal | undefined | 僅刪eyes同上欄位；record |

每臂fresh load；原CFG不覆寫，其他席原AI／選角；每臂固定seeds 1..10000。策略引用先前已具名版本，不改係數，不從多種策略中挑較高或較易通過者。舊eyes target-chaser、blind、greedy等不是本輪主臂，先前報告全部保留；若日後加跑需另列supplement且不能取代本池。

此種子設計與已看過的探索seeds1..200重疊，**不是未見過的holdout／盲驗**。沿既定順序估計，不因結果增刪種子。

## 分項判定

H1每組主臂座位0勝率減h1-splitter，逐seed配對，−8≤差pp≤+5。完整10000才判pass/fail；不先篩holder。L1未逐條承接原傳說H1的40%上限，這裡不自行追加。

H9以原預設桌全四席曾持有指定完整配方的集合，分母為至少一位holder的局，分子為winnerId在集合中的局；normal與zero各自條件化。水／雙虎差需+3≤pp≤+10且normal絕對率≤85%。零分母為incomplete/null，不能當0%。千眼原H9桌不消費情報，數字只列診斷、**H9 eyes固定incomplete**；不以其他桌補通過。

sixOfFour固定incomplete，理由為完整跨夜model adapters尚未閉合。overall任何正式分項fail則fail，否則incomplete；releaseEligible永遠false。n足夠只能解除樣本不足，不能解除千眼H9情報缺口或六之四缺口。

## 資料與執行

單臂gzip JSON保存schema/arm/CFG/seeds/rows、source/runner/load/balance/information SHA、gitHead、actual effective CHAINS欄位描述。row含角色、winner、局長／seat0是否存活、全三組holders及first；保留原runner座位0死亡即止，不續跑AI殘局。

最多3個Node子程序並行；每臂仍順序跑自己的1..10000，不共享G/RNG。執行前封存版本雜湊；完成彙整時拒異版本／CFG、缺臂、缺／重複seed、非法winner/holder。已存在arm輸出拒覆寫，錯誤保留資料，不自行重抽樣。兩臂conditional差非因果。

工具先RED commit再GREEN、手算門檻邊界及分母／資料完整性反例、小seeds真引擎接線、核心覆蓋≥80%、兩種語意突變可抓、獨立覆審後才跑正式批。工具測試不能依已見正式勝率調整判定。

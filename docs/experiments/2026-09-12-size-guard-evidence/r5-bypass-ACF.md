# 合併 main `50df83a` 後的繞法抽驗（A／C／F，2026-09-12）

合併 0.55.1 的 `?fxvocab` 開關之後，四支示範招**預設跑 0.54 本體**（沒有徽記）。
繞法塞在 0.55 本體裡，所以執行期那一道**一定要帶 `--fxvocab=1`** 才跑得到那段程式碼
——不帶而看到綠，那不是防線失效，是根本沒執行到。掃描那一道與開關無關（它讀原始碼）。

抽驗三條：**A 父層縮放 Group**／**C `matrixAutoUpdate=false` ＋自寫 matrix**／
**F 每幀 compose 絕對值 0.52**（覆審 r4 的決定性繞法）。
備份副本＝合併後的 `scratchpad/sg2/zuling.bak.js`（944 行，含 main 新增的 `V054` 區塊），md5 核對還原。

| # | 繞法 | 掃描 exit | 執行期 exit | 判紅的是哪一道 |
|---|---|---|---|---|
| 8 | A 父層縮放 Group（r4） | **1** | **1** | 掃描＋執行期 |
| 10 | C matrixAutoUpdate=false ＋自寫 matrix（r4） | **1** | **1** | 掃描＋執行期 |
| 12 | F 每幀 compose 絕對值 0.52（r4 的決定性實驗） | **1** | **1** | 掃描＋執行期 |

## 8　A 父層縮放 Group（r4）

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 2 處：zuling.js:418 knife.parent（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 parent ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到） ／ zuling.js:418 .add(knife…（徽記不得被重新掛載：父層縮放＝世界尺寸的第二份來源，覆審 r4 繞法 A）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=false onTime=true clean=true focus=true size=fail(110v/2of2/110a) twErr=0 end=66 maxD=1.7502 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1550ms
徽記世界尺寸斷言（--fxvocab=1：0.55 徽記版）：ok 0／n/a 0／fail 1　（違規 110 次、鎖上 2 of 產出 2、稽核 110 次）
  ! 徽記 knife 掛在一個被縮放過的父節點底下（Group scale=0.06）：徽記的世界尺寸必須只由 ICON 表決定，不得靠父層縮放（覆審 r4 繞法 A）。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 10　C matrixAutoUpdate=false ＋自寫 matrix（r4）

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 2 處：zuling.js:432 knife.matrixAutoUpdate（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 matrixAutoUpdate ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到） ／ zuling.js:432 knife.matrix（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 matrix ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(1v/2of2/110a) twErr=1 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1508ms
徽記世界尺寸斷言（--fxvocab=1：0.55 徽記版）：ok 0／n/a 0／fail 1　（違規 1 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.259298,0.2592976719022451],"knife:part":[0.282449,0.2824492497506599]}
  ! 徽記 knife 的 matrixAutoUpdate 被直接寫成 false：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
  ★編舞在 tween／timer／done 裡安靜死掉 1 次（eliteSelfCut）：[eliteSelfCut/tween] 徽記 knife 的 matrixAutoUpdate 被直接寫成 false：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 12　F 每幀 compose 絕對值 0.52（r4 的決定性實驗）

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 3 處：zuling.js:432 knife.matrixAutoUpdate（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 matrixAutoUpdate ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到） ／ zuling.js:432 knife.matrix（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 matrix ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到） ／ zuling.js:432 knife.children（徽記的世界尺寸只能由 st.iconScale 寫
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(1v/2of2/110a) twErr=1 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1624ms
徽記世界尺寸斷言（--fxvocab=1：0.55 徽記版）：ok 0／n/a 0／fail 1　（違規 1 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.259298,0.2592976719022451],"knife:part":[0.282449,0.2824492497506599]}
  ! 徽記 knife 的 matrixAutoUpdate 被直接寫成 false：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
  ★編舞在 tween／timer／done 裡安靜死掉 1 次（eliteSelfCut）：[eliteSelfCut/tween] 徽記 knife 的 matrixAutoUpdate 被直接寫成 false：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

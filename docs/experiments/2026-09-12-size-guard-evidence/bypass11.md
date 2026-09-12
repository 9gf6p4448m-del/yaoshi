# 十一條繞法＋決定性繞法 F 的鑑別力實測（修補批，覆審 r4，2026-09-12）

r3 七條（①～⑦）＋**覆審 r4 自己設計、r3 三道防線全綠的四條**（A 父層 Group／B 置換 geometry／
C 自寫 matrix／E `defineProperty` 蓋掉 accessor），加上 r4 的決定性實驗 F（每幀 compose 絕對值 0.52，
在 r3 之下 L3 canary 跑出 `ok:true`＝恆綠儀式復現）與它的對照組 F2。

做法：`cp js/trait-fx/zuling.js scratchpad/sg2/zuling.bak.js` 備份 →
把繞法**加在**合法那一行後面（①除外，它是把 `o.size` 塞回建構式）→ 跑兩支治具 →
**用備份副本 copy 回去還原**（md5 核對，不做反向 sed）→ 重跑 `fxvocab` 確認回綠。

三道防線：
- **第一道**＝入口拒收 `o.size`（`iconSizeSrc`，建構式 throw）
- **第二道**＝執行期鎖＋**世界尺寸稽核**（`lockIconScale`／`auditSizes`，記進 `stats`，治具讀）
- **第三道**＝原始碼掃描（`node tests/fxvocab.test.mjs`）

| # | 繞法 | 掃描 exit | 執行期 exit | 判紅的是哪一道 |
|---|---|---|---|---|
| 1 | ①{size:S}（建構式） | **1** | **1** | 掃描＋執行期 |
| 2 | ②setScalar(S*…) | **1** | **1** | 掃描＋執行期 |
| 3 | ③setScalar(0.56*…) | **1** | **1** | 掃描＋執行期 |
| 4 | ④別名後 setScalar | **1** | **1** | 掃描＋執行期 |
| 5 | ⑤multiplyScalar | **1** | **1** | 掃描＋執行期 |
| 6 | ⑥scale.x= | **1** | **1** | 掃描＋執行期 |
| 7 | ⑦子節點／索引取用 | **1** | **1** | 掃描＋執行期 |
| 8 | A 父層縮放 Group（r4） | **1** | **1** | 掃描＋執行期 |
| 9 | B 置換 geometry（r4） | **1** | **1** | 掃描＋執行期 |
| 10 | C matrixAutoUpdate=false ＋自寫 matrix（r4） | **1** | **1** | 掃描＋執行期 |
| 11 | E defineProperty 蓋掉被鎖的 accessor（r4） | **1** | **1** | 掃描＋執行期 |
| 12 | F 每幀 compose 絕對值 0.52（r4 的決定性實驗） | **1** | **1** | 掃描＋執行期 |
| 13 | F2 只寫 matrix、不關 matrixAutoUpdate（對照組） | **1** | **0** | 掃描 |

## 1　①{size:S}（建構式）

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 1 處：zuling.js:416 size:（st.icon／st.icons／st.mark 的 o.size 已拒收，編舞不得再出現這個鍵）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0 acts=0 handled=false alive=false restored=true onTime=true clean=true focus=true size=n/a(0v/0of0/0a) twErr=0 end=12 maxD=0 err=0 prog+0 sig=0b/ 2314ms
徽記世界尺寸斷言：ok 0／n/a 1／fail 0　（違規 0 次、鎖上 0 of 產出 0、稽核 0 次）　★這一跑沒有任何招產出徽記＝這條斷言未量到，不得當成通過★
  ★用到徽記的招卻是 n/a：eliteSelfCut（防線在那幾支上失效）
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 2　②setScalar(S*…)

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 1 處：zuling.js:432 knife.scale（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 scale ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(1v/2of2/110a) twErr=1 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1480ms
徽記世界尺寸斷言：ok 0／n/a 0／fail 1　（違規 1 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.259298,0.2592976719022451],"knife:part":[0.282449,0.2824492497506599]}
  ! 徽記 knife 的 scale.x 被直接寫成 0.324122085048011：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
  ★編舞在 tween／timer／done 裡安靜死掉 1 次（eliteSelfCut）：[eliteSelfCut/tween] 徽記 knife 的 scale.x 被直接寫成 0.324122085048011：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 3　③setScalar(0.56*…)

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 1 處：zuling.js:432 knife.scale（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 scale ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(1v/2of2/110a) twErr=1 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 2345ms
徽記世界尺寸斷言：ok 0／n/a 0／fail 1　（違規 1 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.259298,0.2592976719022451],"knife:part":[0.282449,0.2824492497506599]}
  ! 徽記 knife 的 scale.x 被直接寫成 0.324122085048011：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
  ★編舞在 tween／timer／done 裡安靜死掉 1 次（eliteSelfCut）：[eliteSelfCut/tween] 徽記 knife 的 scale.x 被直接寫成 0.324122085048011：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 4　④別名後 setScalar

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 1 處：zuling.js:432 m2.scale（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 scale ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(1v/2of2/110a) twErr=1 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1488ms
徽記世界尺寸斷言：ok 0／n/a 0／fail 1　（違規 1 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.259298,0.2592976719022451],"knife:part":[0.282449,0.2824492497506599]}
  ! 徽記 knife 的 scale.x 被直接寫成 0.02：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
  ★編舞在 tween／timer／done 裡安靜死掉 1 次（eliteSelfCut）：[eliteSelfCut/tween] 徽記 knife 的 scale.x 被直接寫成 0.02：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 5　⑤multiplyScalar

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 1 處：zuling.js:432 knife.scale（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 scale ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(1v/2of2/110a) twErr=1 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1545ms
徽記世界尺寸斷言：ok 0／n/a 0／fail 1　（違規 1 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.259298,0.2592976719022451],"knife:part":[0.282449,0.2824492497506599]}
  ! 徽記 knife 的 scale.x 被直接寫成 0.011575788751714677：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
  ★編舞在 tween／timer／done 裡安靜死掉 1 次（eliteSelfCut）：[eliteSelfCut/tween] 徽記 knife 的 scale.x 被直接寫成 0.011575788751714677：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 6　⑥scale.x=

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 3 處：zuling.js:432 knife.scale（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 scale ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到） ／ zuling.js:432 knife.scale（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 scale ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到） ／ zuling.js:432 knife.scale（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 scale ＝尺寸的第二份來源，執行期也會被
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(1v/2of2/110a) twErr=1 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1497ms
徽記世界尺寸斷言：ok 0／n/a 0／fail 1　（違規 1 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.259298,0.2592976719022451],"knife:part":[0.282449,0.2824492497506599]}
  ! 徽記 knife 的 scale.x 被直接寫成 0.02：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
  ★編舞在 tween／timer／done 裡安靜死掉 1 次（eliteSelfCut）：[eliteSelfCut/tween] 徽記 knife 的 scale.x 被直接寫成 0.02：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 7　⑦子節點／索引取用

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 2 處：zuling.js:432 knife.children[0].scale（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 scale ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到） ／ zuling.js:432 marks[0].scale（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 scale ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(1v/2of2/110a) twErr=1 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1421ms
徽記世界尺寸斷言：ok 0／n/a 0／fail 1　（違規 1 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.259298,0.2592976719022451],"knife:part":[0.282449,0.2824492497506599]}
  ! 徽記 knife:part 的 scale.x 被直接寫成 0.02：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
  ★編舞在 tween／timer／done 裡安靜死掉 1 次（eliteSelfCut）：[eliteSelfCut/tween] 徽記 knife:part 的 scale.x 被直接寫成 0.02：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 8　A 父層縮放 Group（r4）

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 2 處：zuling.js:418 knife.parent（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 parent ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到） ／ zuling.js:418 .add(knife…（徽記不得被重新掛載：父層縮放＝世界尺寸的第二份來源，覆審 r4 繞法 A）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=false onTime=true clean=true focus=true size=fail(110v/2of2/110a) twErr=0 end=66 maxD=1.7502 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1437ms
徽記世界尺寸斷言：ok 0／n/a 0／fail 1　（違規 110 次、鎖上 2 of 產出 2、稽核 110 次）
  ! 徽記 knife 掛在一個被縮放過的父節點底下（Group scale=0.06）：徽記的世界尺寸必須只由 ICON 表決定，不得靠父層縮放（覆審 r4 繞法 A）。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 9　B 置換 geometry（r4）

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 1 處：zuling.js:432 knife.traverse（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 traverse ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(1v/2of2/110a) twErr=1 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 2531ms
徽記世界尺寸斷言：ok 0／n/a 0／fail 1　（違規 1 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.259298,0.2592976719022451],"knife:part":[0.282449,0.2824492497506599]}
  ! 徽記 knife 的 geometry 被直接寫成 PlaneGeometry：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
  ★編舞在 tween／timer／done 裡安靜死掉 1 次（eliteSelfCut）：[eliteSelfCut/tween] 徽記 knife 的 geometry 被直接寫成 PlaneGeometry：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 10　C matrixAutoUpdate=false ＋自寫 matrix（r4）

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 2 處：zuling.js:432 knife.matrixAutoUpdate（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 matrixAutoUpdate ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到） ／ zuling.js:432 knife.matrix（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 matrix ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(1v/2of2/110a) twErr=1 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1612ms
徽記世界尺寸斷言：ok 0／n/a 0／fail 1　（違規 1 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.259298,0.2592976719022451],"knife:part":[0.282449,0.2824492497506599]}
  ! 徽記 knife 的 matrixAutoUpdate 被直接寫成 false：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
  ★編舞在 tween／timer／done 裡安靜死掉 1 次（eliteSelfCut）：[eliteSelfCut/tween] 徽記 knife 的 matrixAutoUpdate 被直接寫成 false：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 11　E defineProperty 蓋掉被鎖的 accessor（r4）

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 1 處：zuling.js:432 knife.scale（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 scale ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=ok(0v/2of2/110a) twErr=1 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1648ms
徽記世界尺寸斷言：ok 1／n/a 0／fail 0　（違規 0 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.259298,0.2592976719022451],"knife:part":[0.282449,0.2824492497506599]}
  ★編舞在 tween／timer／done 裡安靜死掉 1 次（eliteSelfCut）：[eliteSelfCut/tween] Cannot redefine property: x
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 12　F 每幀 compose 絕對值 0.52（r4 的決定性實驗）

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 3 處：zuling.js:432 knife.matrixAutoUpdate（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 matrixAutoUpdate ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到） ／ zuling.js:432 knife.matrix（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 matrix ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到） ／ zuling.js:432 knife.children（徽記的世界尺寸只能由 st.iconScale 寫
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(1v/2of2/110a) twErr=1 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1618ms
徽記世界尺寸斷言：ok 0／n/a 0／fail 1　（違規 1 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.259298,0.2592976719022451],"knife:part":[0.282449,0.2824492497506599]}
  ! 徽記 knife 的 matrixAutoUpdate 被直接寫成 false：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
  ★編舞在 tween／timer／done 裡安靜死掉 1 次（eliteSelfCut）：[eliteSelfCut/tween] 徽記 knife 的 matrixAutoUpdate 被直接寫成 false：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 13　F2 只寫 matrix、不關 matrixAutoUpdate（對照組）

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 1 處：zuling.js:432 knife.matrix（徽記的世界尺寸只能由 st.iconScale 寫；直接碰 matrix ＝尺寸的第二份來源，執行期也會被 lockIconScale／auditSizes 抓到）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 0
PASS eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=ok(0v/2of2/110a) twErr=0 end=66 maxD=1.7502 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1646ms
徽記世界尺寸斷言：ok 1／n/a 0／fail 0　（違規 0 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.2592976719022451,0.448],"knife:part":[0.2824492497506598,0.488]}
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

# 覆審 r2 六條繞法的鑑別力實測（r2 修補批，2026-09-12）

照覆審 r2 §2.3–2.7 的**原文**重建（含它刻意用來避開名字追蹤的 helper 包裝），
每條都是**加行**（H2 是在合法的 `st.icons` 呼叫上多一個鍵，整行換掉）。
備份副本還原＋md5 核對，不做反向 sed；還原後重跑 `fxvocab` 確認回綠。

★一定要帶 `--fxvocab=1`★：預設跑 0.54 本體，繞法塞在 0.55 本體裡根本不會被執行。

| # | 繞法（照覆審 r2 原文，含 helper） | 掃描 exit | 執行期 exit | 判紅的是哪一道 |
|---|---|---|---|---|
| H1 | onBeforeRender 改 matrixWorld（helper，覆審 r2 原文） | **0** | **1** | 執行期 |
| H2 | o.sizes 把 st.iconFlatSize 除掉（覆審 r2 原文，不用 helper） | **1** | **1** | 掃描＋執行期 |
| M1 | 手造第二顆徽記（helper 包 new Mesh） | **0** | **1** | 執行期 |
| M2 | 就地改共用剪影 geometry（helper） | **0** | **1** | 執行期 |
| M3 | 掛到另一顆已登記的徽記底下（helper 包 .add） | **0** | **0** | （無） |
| L1 | 執行期改 ICON 表（動態 import 同一個 module instance） | **1** | **0** | 掃描 |

## H1　onBeforeRender 改 matrixWorld（helper，覆審 r2 原文）

```
$ node tests/fxvocab.test.mjs  → exit 0
（無 FAIL）
$ node tests/tools/traitfx-drive.mjs … --fxvocab=1 --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(1v/2of2/110a) twErr=1 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 2890ms
徽記世界尺寸斷言（--fxvocab=1：0.55 徽記版）：ok 0／n/a 0／fail 1　（違規 1 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.259298,0.2592976719022451],"knife:part":[0.282449,0.2824492497506599]}
  ! 徽記 knife 的 onBeforeRender 被直接寫成 fn：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
  ★編舞在 tween／timer／done 裡安靜死掉 1 次（eliteSelfCut）：[eliteSelfCut/tween] 徽記 knife 的 onBeforeRender 被直接寫成 fn：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## H2　o.sizes 把 st.iconFlatSize 除掉（覆審 r2 原文，不用 helper）

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 1 處：yinqi.js:131 ／st.iconFlatSize（把 ICON 的值當除數＝把它從乘積裡消掉，剩下的就是寫死的絕對尺寸，覆審 r2 H2）
$ node tests/tools/traitfx-drive.mjs … --fxvocab=1 --only=hauntLost → exit 1
FAIL hauntLost        redhat       t2/900ms msOK=true rate=1 fill=0 acts=0 handled=false alive=false restored=true onTime=true clean=true focus=true size=fail(1v/4of4/0a) twErr=0 end=12 maxD=0 err=0 prog+0 sig=0b/emblem:hat 2353ms
徽記世界尺寸斷言（--fxvocab=1：0.55 徽記版）：ok 0／n/a 0／fail 1　（違規 1 次、鎖上 4 of 產出 4、稽核 0 次）
  ! st.icons 的 o.sizes[0]＝2.5 不在合法倍率區間 0.2~2.2（徽記 hat）。那是逐實例的相對倍率，不是絕對尺寸；要改這個 kind 的尺寸請改 js/trait-fx/vocab.js 的 flatByKind／byKind。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## M1　手造第二顆徽記（helper 包 new Mesh）

```
$ node tests/fxvocab.test.mjs  → exit 0
（無 FAIL）
$ node tests/tools/traitfx-drive.mjs … --fxvocab=1 --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(147v/2of2/110a) twErr=0 end=66 maxD=1.7502 err=0 prog+0 sig=16b/burst+emblem:knife+trail 2542ms
徽記世界尺寸斷言（--fxvocab=1：0.55 徽記版）：ok 0／n/a 0／fail 1　（違規 147 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.2592976719022451,0.448],"knife:part":[0.2824492497506598,0.488]}
  ! 場上有一顆用徽記剪影、卻沒有經過 st.icon／st.icons／st.mark 的 mesh（Mesh，fxKind=emblem:knife）：它不在尺寸鎖與稽核的涵蓋裡，等於一條完全在防線外的第二份來源（覆審 r2 M1）。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## M2　就地改共用剪影 geometry（helper）

```
$ node tests/fxvocab.test.mjs  → exit 0
（無 FAIL）
$ node tests/tools/traitfx-drive.mjs … --fxvocab=1 --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(110v/2of2/110a) twErr=0 end=66 maxD=1.7502 err=0 prog+0 sig=16b/burst+emblem:knife+trail 2059ms
徽記世界尺寸斷言（--fxvocab=1：0.55 徽記版）：ok 0／n/a 0／fail 1　（違規 110 次、鎖上 2 of 產出 2、稽核 110 次）
  ! 徽記 knife 的 geometry **內容**被就地改過（單位寬 0.800000 → 0.825397）：emblems.js 的剪影是一個 kind 建一次、全場共用，改它等於改所有同 kind 徽記的尺寸（覆審 r2 M2）。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## M3　掛到另一顆已登記的徽記底下（helper 包 .add）

```
$ node tests/fxvocab.test.mjs  → exit 0
（無 FAIL）
$ node tests/tools/traitfx-drive.mjs … --fxvocab=1 --only=eliteSelfCut → exit 0
PASS eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=ok(0v/2of2/110a) twErr=0 end=66 maxD=1.7502 err=0 prog+0 sig=16b/burst+emblem:knife+trail 2470ms
徽記世界尺寸斷言（--fxvocab=1：0.55 徽記版）：ok 1／n/a 0／fail 0　（違規 0 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.2592976719022451,0.448],"knife:part":[0.2824492497506598,0.488]}
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## L1　執行期改 ICON 表（動態 import 同一個 module instance）

```
$ node tests/fxvocab.test.mjs  → exit 1
  FAIL  徽記世界尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得碰 scale／geometry／matrix／parent ＋ 不得 grow／add） — 徽記尺寸有第二份來源 2 處：zuling.js:432 ICON.…（編舞不得直接碰 ICON 表：值一律由 st 掛進來，執行期改表是「檔案內容 ≠ 執行期真值」的入口，覆審 r2 L1） ／ zuling.js:432 import(vocab.js…（三個系別檔不 import 本表，見 vocab.js 檔頭）
$ node tests/tools/traitfx-drive.mjs … --fxvocab=1 --only=eliteSelfCut → exit 0
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=ok(0v/2of2/110a) twErr=0 end=66 maxD=1.7502 err=18 prog+0 sig=16b/burst+emblem:knife+trail 2412ms
徽記世界尺寸斷言（--fxvocab=1：0.55 徽記版）：ok 1／n/a 0／fail 0　（違規 0 次、鎖上 2 of 產出 2、稽核 110 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.2592976719022451,0.448],"knife:part":[0.2824492497506598,0.488]}
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```
| # | 繞法（照覆審 r2 原文，含 helper） | 掃描 exit | 執行期 exit | 判紅的是哪一道 |
|---|---|---|---|---|
| M3 | 掛到另一顆已登記的徽記底下（helper 包 .add） | **0** | **1** | 執行期 |

## M3　掛到另一顆已登記的徽記底下（helper 包 .add）

```
$ node tests/fxvocab.test.mjs  → exit 0
（無 FAIL）
$ node tests/tools/traitfx-drive.mjs … --fxvocab=1 --only=eliteSelfCut → exit 1
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=8 handled=true alive=true restored=true onTime=true clean=true focus=true size=fail(110v/4of4/220a) twErr=0 end=66 maxD=1.7502 err=0 prog+0 sig=16b/burst+emblem:knife+mark:knife+trail 1548ms
徽記世界尺寸斷言（--fxvocab=1：0.55 徽記版）：ok 0／n/a 0／fail 1　（違規 110 次、鎖上 4 of 產出 4、稽核 220 次）
  世界寬度區間（診斷，不進判定）：{"knife":[0.2400000035762786,0.2400000035762786],"knife:part":[0.280000004172325,0.280000004172325]}
  ! 徽記 knife 掛在另一個徽記（knife）底下：世界尺寸會變成兩個表值的乘積，那個數字不在 ICON 的任何一張表裡（覆審 r2 M3）。
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 備份副本還原後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

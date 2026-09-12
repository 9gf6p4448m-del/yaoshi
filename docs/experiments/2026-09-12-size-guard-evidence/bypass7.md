# N11 七條繞法的鑑別力實測（2026-09-12）

對 `js/trait-fx/zuling.js` 的獻祭刀逐條套用繞法（②～⑦是**加行**：合法的 `st.iconScale` 留著，
旁邊多一條第二來源；①是把 `o.size` 塞回 `st.icon()` 的建構式）。
每次跑完一律用**改壞前的備份副本**還原（`scratchpad/sg/zuling.bak.js`，md5 核對），不做反向 sed，
還原後重跑一次 `node tests/fxvocab.test.mjs` 確認回到健康態全綠。

兩道防線各自的角色：
- **掃描**＝`node tests/fxvocab.test.mjs`（第三道，原始碼層）
- **執行期**＝`node tests/tools/traitfx-drive.mjs --only=eliteSelfCut`（第二道，`lockIconScale` 的記帳；
  ①另外會被第一道 `iconSizeSrc` 在建構式 throw ⇒ `handled=false`）

## 繞法 ①{size:S}（建構式）

```
$ node tests/fxvocab.test.mjs          → exit 1（掃描那一道）
  FAIL  徽記 mesh 的尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得直接碰 scale ＋ 不得餵進 st.grow） — 徽記尺寸有第二份來源 1 處：zuling.js:416 size:（st.icon／st.icons／st.mark 的 o.size 已拒收，編舞不得再出現這個鍵）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 0（執行期那一道）
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0 acts=0 handled=false alive=false restored=true onTime=true clean=true focus=true size=0/0of0 end=12 maxD=0 err=0 prog+0 sig=0b/ 1566ms
徽記尺寸鎖（N11 執行期斷言）：違規 0 次／鎖上 0 個 of 產出 0 個　★這一跑沒有任何招產出徽記＝這條斷言未量到，不得當成通過★
# 還原（copy 備份副本，不做反向 sed）後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 繞法 ②setScalar(S*…)

```
$ node tests/fxvocab.test.mjs          → exit 1（掃描那一道）
  FAIL  徽記 mesh 的尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得直接碰 scale ＋ 不得餵進 st.grow） — 徽記尺寸有第二份來源 1 處：zuling.js:432 knife.scale（徽記 mesh 的 scale 只能由 st.iconScale 寫；直接碰它＝尺寸的第二份來源，執行期也會被 lockIconScale throw）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1（執行期那一道）
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=1/2of2 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1713ms
徽記尺寸鎖（N11 執行期斷言）：違規 1 次／鎖上 2 個 of 產出 2 個
  ! 徽記 knife 的 scale.x 被直接寫成 0.324122085048011：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記尺寸有第二份來源（或鎖沒掛上去）——N11 防線判紅 ★★
# 還原（copy 備份副本，不做反向 sed）後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 繞法 ③setScalar(0.56*…)

```
$ node tests/fxvocab.test.mjs          → exit 1（掃描那一道）
  FAIL  徽記 mesh 的尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得直接碰 scale ＋ 不得餵進 st.grow） — 徽記尺寸有第二份來源 1 處：zuling.js:432 knife.scale（徽記 mesh 的 scale 只能由 st.iconScale 寫；直接碰它＝尺寸的第二份來源，執行期也會被 lockIconScale throw）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1（執行期那一道）
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=1/2of2 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1577ms
徽記尺寸鎖（N11 執行期斷言）：違規 1 次／鎖上 2 個 of 產出 2 個
  ! 徽記 knife 的 scale.x 被直接寫成 0.324122085048011：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記尺寸有第二份來源（或鎖沒掛上去）——N11 防線判紅 ★★
# 還原（copy 備份副本，不做反向 sed）後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 繞法 ④別名後 setScalar

```
$ node tests/fxvocab.test.mjs          → exit 1（掃描那一道）
  FAIL  徽記 mesh 的尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得直接碰 scale ＋ 不得餵進 st.grow） — 徽記尺寸有第二份來源 1 處：zuling.js:432 m2.scale（徽記 mesh 的 scale 只能由 st.iconScale 寫；直接碰它＝尺寸的第二份來源，執行期也會被 lockIconScale throw）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1（執行期那一道）
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=1/2of2 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1769ms
徽記尺寸鎖（N11 執行期斷言）：違規 1 次／鎖上 2 個 of 產出 2 個
  ! 徽記 knife 的 scale.x 被直接寫成 0.02：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記尺寸有第二份來源（或鎖沒掛上去）——N11 防線判紅 ★★
# 還原（copy 備份副本，不做反向 sed）後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 繞法 ⑤multiplyScalar

```
$ node tests/fxvocab.test.mjs          → exit 1（掃描那一道）
  FAIL  徽記 mesh 的尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得直接碰 scale ＋ 不得餵進 st.grow） — 徽記尺寸有第二份來源 1 處：zuling.js:432 knife.scale（徽記 mesh 的 scale 只能由 st.iconScale 寫；直接碰它＝尺寸的第二份來源，執行期也會被 lockIconScale throw）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1（執行期那一道）
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=1/2of2 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1724ms
徽記尺寸鎖（N11 執行期斷言）：違規 1 次／鎖上 2 個 of 產出 2 個
  ! 徽記 knife 的 scale.x 被直接寫成 0.011575788751714677：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記尺寸有第二份來源（或鎖沒掛上去）——N11 防線判紅 ★★
# 還原（copy 備份副本，不做反向 sed）後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 繞法 ⑥scale.x=

```
$ node tests/fxvocab.test.mjs          → exit 1（掃描那一道）
  FAIL  徽記 mesh 的尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得直接碰 scale ＋ 不得餵進 st.grow） — 徽記尺寸有第二份來源 3 處：zuling.js:432 knife.scale（徽記 mesh 的 scale 只能由 st.iconScale 寫；直接碰它＝尺寸的第二份來源，執行期也會被 lockIconScale throw） ／ zuling.js:432 knife.scale（徽記 mesh 的 scale 只能由 st.iconScale 寫；直接碰它＝尺寸的第二份來源，執行期也會被 lockIconScale throw） ／ zuling.js:432 knife.scale（徽記 mesh 的 scale 只能由 st.iconScale 寫；直接碰它＝尺寸的第二份來源，執行期也會被 lockIconScale throw）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1（執行期那一道）
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=1/2of2 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1568ms
徽記尺寸鎖（N11 執行期斷言）：違規 1 次／鎖上 2 個 of 產出 2 個
  ! 徽記 knife 的 scale.x 被直接寫成 0.02：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記尺寸有第二份來源（或鎖沒掛上去）——N11 防線判紅 ★★
# 還原（copy 備份副本，不做反向 sed）後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

## 繞法 ⑦子節點／索引取用

```
$ node tests/fxvocab.test.mjs          → exit 1（掃描那一道）
  FAIL  徽記 mesh 的尺寸不得有第二份來源（o.size 拒收 ＋ 編舞不得直接碰 scale ＋ 不得餵進 st.grow） — 徽記尺寸有第二份來源 2 處：zuling.js:432 knife.children[0].scale（徽記 mesh 的 scale 只能由 st.iconScale 寫；直接碰它＝尺寸的第二份來源，執行期也會被 lockIconScale throw） ／ zuling.js:432 marks[0].scale（徽記 mesh 的 scale 只能由 st.iconScale 寫；直接碰它＝尺寸的第二份來源，執行期也會被 lockIconScale throw）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut → exit 1（執行期那一道）
FAIL eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=1/2of2 end=66 maxD=1.2581 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1682ms
徽記尺寸鎖（N11 執行期斷言）：違規 1 次／鎖上 2 個 of 產出 2 個
  ! 徽記 knife:part 的 scale.x 被直接寫成 0.02：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
★★ 徽記尺寸有第二份來源（或鎖沒掛上去）——N11 防線判紅 ★★
# 還原（copy 備份副本，不做反向 sed）後：node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

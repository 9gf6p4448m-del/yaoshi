# 決定性實驗重跑：繞法 F ＋ L3 canary（修補批，覆審 r4）

覆審 r4 的決定性實驗：編舞每幀自己 `matrix.compose(..., Vector3(0.52))`，尺寸與 ICON 表**完全脫鉤**。
r3 之下的結果是 `area_pct 1.0132／de 61.31／ok:true／GATE pass 1`，健康態與 canary 態**逐位數相同**
——凍結檔 L3 指名的 canary 變回恆綠的儀式。本批重跑同一組。


## 繞法 F ＋ 健康態的 _resolve（未套 canary）

```
$ node tests/tools/fx-contrast.mjs … --only=eliteSelfCut   → exit 1
FAIL eliteSelfCut     t2 凍在 430ms(第 26 幀) 切掉 2 個特效物件 handled=true size=fail(1v/2of2/52a) err=0
   ! 徽記 knife 的 matrixAutoUpdate 被直接寫成 false：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
   ! tween 安靜死掉：[eliteSelfCut/tween] 徽記 knife 的 matrixAutoUpdate 被直接寫成 false：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
徽記世界尺寸斷言：違規 1 次／鎖上 2 of 產出 2／稽核 52 次　fail：eliteSelfCut
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
$ python tests/tools/fx-contrast-metrics.py …             → exit 1
{"trait": "eliteSelfCut", "tier": 2, "at_ms": 430, "hidden": 2, "dead": false, "ok": false, "area_pct": 0.4059, "px": 1336, "total": 329160, "de_median": 35.91, "de_p90": 36.0}
{"gate": {"area_pct_min": 0.8, "de_median_min": 28.0, "luma_eps": 6.0}, "nobloom": false, "n": 1, "pass": 0, "failed": ["eliteSelfCut"], "view": {"width": 844, "height": 390, "deviceScaleFactor": 2}, "seed": 7, "product_bloom": {"strength": 1.05, "threshold": 0.7, "knee": 0.3, "radius": 1.7, "scale": 0.5}, "bthr_override": null, "programs": 19, "mat_programs": {"templates": 3, "rows": [{"name": "M
```

## 繞法 F ＋ ★L3 canary（_resolve()=>0.02）★

```
$ node tests/tools/fx-contrast.mjs … --only=eliteSelfCut   → exit 1
FAIL eliteSelfCut     t2 凍在 430ms(第 26 幀) 切掉 2 個特效物件 handled=true size=fail(1v/2of2/52a) err=0
   ! 徽記 knife 的 matrixAutoUpdate 被直接寫成 false：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
   ! tween 安靜死掉：[eliteSelfCut/tween] 徽記 knife 的 matrixAutoUpdate 被直接寫成 false：徽記的世界尺寸只有一份來源（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。
徽記世界尺寸斷言：違規 1 次／鎖上 2 of 產出 2／稽核 52 次　fail：eliteSelfCut
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
$ python tests/tools/fx-contrast-metrics.py …             → exit 1
{"trait": "eliteSelfCut", "tier": 2, "at_ms": 430, "hidden": 2, "dead": false, "ok": false, "area_pct": 0.0425, "px": 140, "total": 329160, "de_median": 55.85, "de_p90": 67.02}
{"gate": {"area_pct_min": 0.8, "de_median_min": 28.0, "luma_eps": 6.0}, "nobloom": false, "n": 1, "pass": 0, "failed": ["eliteSelfCut"], "view": {"width": 844, "height": 390, "deviceScaleFactor": 2}, "seed": 7, "product_bloom": {"strength": 1.05, "threshold": 0.7, "knee": 0.3, "radius": 1.7, "scale": 0.5}, "bthr_override": null, "programs": 19, "mat_programs": {"templates": 3, "rows": [{"name": "M
```

## 用改壞前的備份副本還原（不做反向 sed）

```
$ node tests/fxvocab.test.mjs → exit 0／結果：16 綠 ／ 0 紅
```

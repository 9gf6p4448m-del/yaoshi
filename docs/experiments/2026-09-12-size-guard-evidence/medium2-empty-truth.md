# MEDIUM-2 的鑑別力：made=0 不再是空真（修補批，覆審 r4）

覆審 r4：27 套裡 23 套 `made=0`，而 `violations===0 && locked===made` 在 made=0 時**恆成立**
⇒ `sizeOK:true`。那是空真：「這一套沒產出徽記」被當成「這一套通過」。
修法＝三態（`n/a`／`ok`／`fail`）＋ `EMBLEM_CASES` 名單：用到徽記語彙的招掉到 `n/a` 就判紅。

**突變**：把 `eliteSelfCut` 的 `st.icon(...)` 換成自己 new 的 PlaneGeometry（不走三支入口 ⇒ 不登記、不上鎖），
縮放也改回裸 `setScalar`。這是「防線在那一支上整個失效」的模擬。

```
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut   → exit 1
PASS eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=n/a(0v/0of0/0a) twErr=0 end=66 maxD=1.7502 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1689ms
徽記世界尺寸斷言：ok 0／n/a 1／fail 0　（違規 0 次、鎖上 0 of 產出 0、稽核 0 次）　★這一跑沒有任何招產出徽記＝這條斷言未量到，不得當成通過★
  ★用到徽記的招卻是 n/a：eliteSelfCut（防線在那幾支上失效）
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
# 用改壞前的備份副本還原後（不做反向 sed）
$ node tests/tools/traitfx-drive.mjs … --only=eliteSelfCut   → exit 0
PASS eliteSelfCut     xianji       t2/900ms msOK=true rate=1 fill=0.88 acts=5 handled=true alive=true restored=true onTime=true clean=true focus=true size=ok(0v/2of2/110a) twErr=0 end=66 maxD=1.7502 err=0 prog+0 sig=16b/burst+emblem:knife+trail 1543ms
徽記世界尺寸斷言：ok 1／n/a 0／fail 0　（違規 0 次、鎖上 2 of 產出 2、稽核 110 次）
```

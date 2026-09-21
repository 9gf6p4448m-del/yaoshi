# 雙虎滅煞 twinTiger — L1 試玩資產候選

此獸為新虛構融合獸，借用虎爺神像照片的造型語彙，並非新增真實神祇或民俗考據。黑金是已批准雙虎原案的香火配色例外；紅綬帶保留香火系線索。`tiger_c.json` 是來源，獨立複製其 34 根骨、長身低伏四足比例及 `idle`／`move`／`attack` 動畫；原虎資產未更動。生成腳本為 `build-twinTiger.mjs`。

## 凍結與結果

建模前先寫 `assets/creatures/twinTiger.claims.json`，之後沒有修改 claim。規格釘住本體、金捲紋、寬肩金護片、紅綬帶、白牙、蒙皮與三支動畫，三角形上限 8000。`judge.mjs` 原 claims 全過；模型 811,572 bytes（低於 1.5 MB）、4830 triangles、17 skinned meshes、無貼圖。肩護片側視面積 22.1%，明顯可見。`hero.mjs` 邊界 8.6%。舞台截圖 FPS 約 59.9、33 draw calls、錯誤列表空。

## 視覺核對

已親開 `tools/anyCreature/out/ref/tiger/01.jpg`、`02.jpg`、`03.jpg`。參照可見低伏虎身、橘金布罩上的黑捲紋、深臉白牙、紅綬帶與神像護飾。新獸保留體態和紋樣節奏，但將主色改為黑漆和金紋，並擴大肩甲。靜態 hero 與夜市場景截圖顯示四足、長身、獠牙、肩甲和綬帶；舞台金色面積很強，需 Astra 核對是否壓過黑虎主體辨識。

本候選尚未經 context-free 美術盲讀與玩家實際試玩，不能宣稱該兩項通過。場景截圖為獨立舞台預覽，尚不是雙虎正式戰鬥接線證據。

## 整合追補

已接入真實夜戰，見 [試玩卷](../README.md) 與 [browser](../browser/)：twinTiger 資產 HTTP200、單尊融合名冊與模型；移除 nail 後 tiger_c 恢復，載入／可見及材質名亦有紀錄。此追補只完成遊戲接線，不代替美術盲讀。

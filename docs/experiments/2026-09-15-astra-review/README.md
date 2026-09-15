# Astra 全遊戲檢視：本輪畫面基線

2026-09-15，本機 HEAD eafec13 / v0.57.10。

命令：`node tests/tools/scene-shot.mjs scratchpad/astra-review-2026-09-15 --port=8897 --gate`

退出碼 0，errors=[]。生成首頁、選角、牌桌、3D桌面與中途畫面；此目錄保存主報告採用的牌桌、揭盅中途與首頁原圖，未修圖。工具預設 844×390、devicePixelRatio 2，PNG 為 1688×780。

牌桌 gate 探針：78 draw calls、19,403 triangles；ACES、exposure 1.1、sRGB、pixelRatio 2；shadow=false、environment=false、FogExp2 density .055。另一個 info.calls=1 是後製合成，不用作整場 draw calls。

本輪沒有 fps 取樣、實體 Safari、完整一局或聲音聆聽驗收。主對話已開啟三張 PNG 檢視，確認資訊階層與揭盅裁切觀察；不宣告舊 P4、M-A1 或其他閘門通過。

完整方向：`../../proposals/2026-09-15-astra-game-blueprint.md`。

# A1 hover CPU 診斷

狀態：**只作瓶頸定位，不是放行證據**。正式五輪仍是 32 枚 ratio 0.3596 RED、128 枚 ratio 0.3365 RED；本頁不改 gate，也不以 profile 宣告改善。

## 結論

候選同槽短 profile 為 311.9 renders/s，eafec13 baseline 為 366.4 renders/s。候選每幀 `frame` inclusive 取樣約 2.7898 ms，baseline 約 2.3477 ms，差 0.4422 ms。候選新增的 `frameSubjects` inclusive 約 0.3191 ms/frame，其中 `fitSubject` 0.2645、`subjectCorners` 0.2413、`posedBounds` 0.1338；baseline 沒有這條呼叫鏈。這是本次樣本能直接定位的候選專屬 CPU 成本；只有各一份樣本，尚未證明跨次穩定性。

渲染仍是兩版最大的絕對成本：`WebGLRenderer.render` inclusive 約 2.2607 vs 2.1698 ms/frame。`getParameters` self 約 0.1824 vs 0.1807、native `texSubImage2D` self 約 0.1297 vs 0.1274，兩版幾乎相同；`upload` self 為 0.1503 vs 0.1045，但單一短樣本不足以證明有不必要材質或骨骼 texture upload。原摘要的 `skinAnimation=0` 只是函式名 regex 未涵蓋通用 `update`／`multiplyMatrices` 的分類下限，不能解讀為骨骼成本為零。

**唯一待驗修補假設**：市場 hover 穩定時，以預先計算的全動畫保守包絡重用 framing 結果，只在 hover 拍品、viewport、HUD 障礙或 market contents 改變時失效，避免每幀呼叫 `fitSubject`。這個方向直接對應 0.3191 ms/frame 的候選專屬 call chain；尚未實作，必須重新通過 1,599 幾何矩陣及原 32／128 五輪 gate 才能判定。

### Astra 接續裁定：假設尚未成為實作規格

優先研究這條呼叫鏈的可重用資料，但**不能照上述失效清單直接凍結最終鏡頭結果**。全動畫的局部包絡未必涵蓋 hover 的世界旋轉／浮動、父節點變換、作者鏡頭與印籌移動；只枚舉幾個動畫相位也不能證明連續時間都被包住。先區分「可快取的局部幾何資料」與「仍須當幀計算的世界位置／投影」，列出完整失效來源並建立反例，才進行修補。若保守包絡使模型長期顯得更小，須另做同景視覺比較，不能只靠機械不碰 HUD 宣告美術通過。

## 樣本與口徑

- 候選：v0.57.11，產品 core `07124ed`；baseline：`scratchpad/a1-baseline/source` 的 v0.57.10/eafec13 archive。
- 兩版都是 seed 1、初夜出價頁、844×390、DPR2、32 枚；使用 scene-shot 相同 uncapped Chromium flags、產品 `props.bid`／`props.mark`、實景 compile/warm-up，依序訪問四槽 hover。
- scene-shot 的 worst-hover 規則是四槽中 triangles 最大者，因此選 slot 1（94 calls／30,281 tris）作兩版同槽比較。候選 750 ms 預掃的最低短 renders/s 其實是 slot 3（346.3）；受「每版最多一份 profile」限制，沒有另取 slot 3 CPU profile。
- 每版只取一次 5 秒 V8 profile，sampling interval 500 μs。候選 4,738 samples，baseline 4,760 samples；兩者 errors=[]。
- self 是 sample leaf 的 `timeDelta`；inclusive 是該 leaf 沿實際 call stack 回溯到函式的 `timeDelta`。父子 inclusive 互相重疊，不能相加。上表以各自 `renderedFrames` 正規化，CPU 數值仍不等於 frame 百分比。
- profile 期間只注入一層 `renderer.render` wrapper，記同步呼叫 wall time；候選平均 2.3135 ms/call，baseline 2.2070 ms/call。wrapper 有少量開銷，且同步返回不代表 GPU 已完成。
- V8 profiler 看不到完整 GPU／driver 成本；它們可能落在 `(program)`、idle 或 native WebGL 呼叫。兩份 profile 又是先後執行的單次短樣本，不能取代五輪交錯比值。

## 精確命令與本機依賴

```powershell
node scratchpad/a1-hover-cpu-profile.mjs --tag=candidate --outdir=docs/experiments/2026-09-15-a1-performance-followup --duration=5000 --port=8894

node scratchpad/a1-hover-cpu-profile.mjs --tag=baseline --root=scratchpad/a1-baseline/source --slot=1 --outdir=docs/experiments/2026-09-15-a1-performance-followup --duration=5000 --port=8894
```

本機 runner：Node v24.16.0、Playwright 1.62.1；工具 package 的 Three 是 0.180.0。受測頁面由 `index.html` import map 載入 Three 0.158.0，兩者角色不同。臨時 runner 位於 `scratchpad/a1-hover-cpu-profile.mjs`，未追蹤、只存在這台機器，不能假設遠端 clone 可取得；執行後 SHA-256：`f4c19076c43e54a825d52b242c630f2fd42a44b89da5f07249fe55e12edb248d`。

## 證據

- `candidate-hover-slot1.cpuprofile`／`baseline-hover-slot1.cpuprofile`：Chrome 可載入的原始 profile。
- `candidate-summary.json`／`baseline-summary.json`：fixture、四槽預掃、取樣範圍、Performance metrics、self-time heuristic 與限制。
- `comparison.json`：本文比較數字與唯一待驗假設的機器可讀摘要。

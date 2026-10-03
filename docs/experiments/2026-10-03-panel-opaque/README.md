# 北列展開面板不透明（v0.59.9）

基準 e19302f9（v0.59.8）→ 實作 ebae67b7。凍結條件見 acceptance.md。

## 根因
展開面板（`#north.nopen .nfull`）在 `#north.nopen{z-index:15}` 的堆疊環境裡；席位名牌 `#table .seat{z-index:19}` 比它高，
西／東席名牌（與其 ⓘ／風位徽章）畫在面板上面，面板雖然底色 .9，字仍交錯。修法（呈現層）：
`assets/safe-area.css` 把 `#north.nopen` 的 z-index 15→21，`.nfull` 底色改 `--strip-bg-solid`（rgb(11,9,8)，完全不透明；token 在 index.html :root）。

## 證據（治具 panel-probe.mjs；輸出 out/）
- 基準（out/base.json）：6 態全紅，面板矩形頂層屬面板的取樣比例 L 0.362–0.372／R 0.661–0.675（頂層為 #seat2／#seat3、.nm、.roleInfoBtn 等），alpha 0.9。
- 新版（out/head.json）：6 態全綠，比例 1／1，alpha 1；底列「開標」按鈕中心 elementFromPoint 為按鈕；與面板矩形不相交；點面板、點摘要鈕皆可收合。
- 設計事實：點任一條摘要鈕，左右兩塊一起展開（既有行為，未改）；因此「左條／右條／同時」三態的面板內容相同，各自仍分別取樣。
- 收合 HUD（#north 矩形，canvas 隱藏、animations disabled）截圖：基準 vs 新版經同一供應路徑（`--base` git show）逐像素差異 0（out/*-collapsed.png）。
  注意：基準走 --base 路由、工作樹走 http.server 時兩者有非 CSS 造成的小差異（動畫精靈相位），所以比較兩邊都用 `--base <sha>`。
- trace-eq：`node tests/tools/trace-eq.mjs <e19302f9 index.html> index.html` → equal:true（seeds 1..20）。
- `node --test tests/*.test.mjs`：461 pass／0 fail。
- text-fit-probe（fit/probe-base-*.json、textfit-*.log）：全部紅格皆 scroll-only（兩邊同），所有可捲容器全文可達 100%，guard spill/overlap 0 格，文字條 min alpha 兩邊相同（.88–1）。
- landscape-fit-probe（fit/lf/*.json、lf-*.log）：兩邊 cells 105/105、嚴格 96/105、portrait 21/21、redScreens 空、switches 全 true、pageErrors 無；transitions 232/232 對 230/230（全過）。
- 已知限制：兩支探針的格集合隨遊戲進程在不同次執行間略有出入（text-fit 975 vs 965 格、landscape transitions 232 vs 230；差在 night-end 夜序與 duel 格），沒有另跑 base-vs-base 量噪音，不宣稱逐格相同；結論只到「口徑下各項判定數字不劣於基準」。

- 治具沿革：panel-probe.mjs 首次 commit（7eb1885c 後）之後只補了治具可用性（關閉角色資訊 modal、收合測試前等 700ms 避開雙擊抑制、收合截圖 animations:disabled）；判定門檻（95%／alpha 0.9／差異 0）未動。out/base.json 為最終版治具對基準的重跑。

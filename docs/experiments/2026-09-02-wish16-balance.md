# 心願第二批 16 張——平衡量測與位移歸因（2026-09-02，n=10000，`WISH_AI2.trinity=8` 版）

腳本：`tests/tools/wish16-balance.mjs`／`wish16-ablate.mjs`／`wish16-dilute.mjs`。驗收凍結：`2026-09-02-acceptance-wish16.md`。

## 1. 結論
- **16 張新牌逐張全過**：達成率 19.1%~55.0%（帶 15~80%）；持牌者條件勝率／基準 0.84~1.33（帶 0.7~1.5），無「抽到就贏／抽到就輸」的牌。
  三教歸一原 14.6% 壓線，AI 係數 `WISH_AI2.trinity` 5→8 後 21.1%。
- **三策略位移未過（+7.23／+3.88／+1.62pp，閘門 ≤1.5pp）**，且歸因證明**與新牌內容無關**：是「稀釋原 8 張裡兩張讓 AI 按兵不動的牌」造成 AI 變弱。
  任何 16 張擴充都會如此，除非新牌複製零風險行為（設計上已明確不要）。→ ARCH_SPEC 待辦 21，需使用者裁定。
- 原 8 張的兩袖清風 100%／惜命如金 95.5% 達成率是首批既有現象（AI 持牌必達成，見 09-02 上午 wish-report 「自己完全掌控的穩定選項」），不在本批範圍。

## 2. 正式量測（wish16-balance.mjs，n=10000，座位 0 aiLike；基準 23.92%）
    牌	判定次	達成率		抽到局數	條件勝率	相對基準
    wish_yinqi	7667	47.0%		1879		30.12%		×1.26	✅
    wish_east	7430	31.6%		2341		28.45%		×1.19	✅
    wish_nowin	11365	100.0%		2639		29.78%		×1.25	❌達成率
    wish_yaming	9964	18.3%		2379		27.36%		×1.14	✅
    wish_poison	6588	37.6%		1721		24.99%		×1.04	✅
    wish_battle	10779	50.9%		2536		29.26%		×1.22	✅
    wish_frugal	11222	95.5%		2563		33.52%		×1.40	❌達成率
    wish_multi	10034	15.3%		2321		28.01%		×1.17	✅
    wish_zuling*	7632	47.3%		1858		29.33%		×1.23	✅
    wish_xianghuo*	7422	46.7%		1864		30.15%		×1.26	✅
    wish_trinity*	3601	21.1%		1023		29.52%		×1.23	✅
    wish_bigfish*	7896	51.4%		1924		30.56%		×1.28	✅
    wish_allin*	10084	46.8%		2371		31.89%		×1.33	✅
    wish_bargain*	11186	31.4%		2644		29.27%		×1.22	✅
    wish_yamingwin*	11139	53.0%		2668		30.55%		×1.28	✅
    wish_solo*	11048	38.1%		2638		29.38%		×1.23	✅
    wish_rival*	11046	39.3%		2622		28.45%		×1.19	✅
    wish_crowd*	10464	19.1%		2393		25.83%		×1.08	✅
    wish_poisonrival*	6536	49.2%		1653		28.01%		×1.17	✅
    wish_bloodbath*	10332	35.2%		2375		23.71%		×0.99	✅
    wish_unscathed*	9804	55.0%		2304		28.65%		×1.20	✅
    wish_crush*	10645	27.8%		2524		26.55%		×1.11	✅
    wish_comeback*	2625	47.5%		816		20.10%		×0.84	✅
    wish_exorcise*	5631	46.3%		1370		23.58%		×0.99	✅
    （* = 新 16 張；條件勝率帶＝基準 ×0.7～×1.5，見報告的 §2.1 例外說明）
    
    三策略位移（24 張 − 8 張，pp）：
      splitter: 12.12 → 19.35　位移 +7.23pp ❌ 超過 1.5pp
      greedy: 11.42 → 15.30　位移 +3.88pp ❌ 超過 1.5pp
      hoarder: 0.69 → 2.31　位移 +1.62pp ❌ 超過 1.5pp

## 3. 位移歸因（wish16-ablate.mjs，n=10000，位移＝相對 8 張基準 splitter 12.12／greedy 11.42／hoarder 0.69）
    24 張: splitter +7.05  greedy +3.80  hoarder +1.62
    24 張、新牌 hooks 全拆: splitter +7.18  greedy +5.73  hoarder +2.37
    24 張、新牌獎勵歸零(留 hooks): splitter +8.77  greedy +6.84  hoarder +2.52
    
    逐張（8 張＋該牌）位移：
      wish_zuling        splitter +0.63  greedy +0.29  hoarder +0.19
      wish_xianghuo      splitter +1.41  greedy +0.14  hoarder +0.45
      wish_trinity       splitter +1.35  greedy +1.05  hoarder +0.22
      wish_bigfish       splitter +1.86  greedy +0.79  hoarder +0.46
      wish_allin         splitter -1.34  greedy +0.60  hoarder +0.32
      wish_bargain       splitter +3.29  greedy +0.48  hoarder +0.07
      wish_yamingwin     splitter -1.15  greedy -1.74  hoarder +0.27
      wish_solo          splitter +3.05  greedy +0.80  hoarder +0.25
      wish_rival         splitter +2.23  greedy +0.64  hoarder +0.50
      wish_crowd         splitter +0.58  greedy +0.49  hoarder +0.47
      wish_poisonrival   splitter +0.37  greedy -0.23  hoarder +0.27
      wish_bloodbath     splitter +2.51  greedy +1.30  hoarder +0.35
      wish_unscathed     splitter +2.18  greedy +0.29  hoarder +0.17
      wish_crush         splitter +2.34  greedy +0.76  hoarder +0.34
      wish_comeback      splitter +0.42  greedy +0.28  hoarder +0.01
      wish_exorcise      splitter +1.86  greedy +0.66  hoarder +0.46

## 4. 稀釋對照（wish16-dilute.mjs，n=10000）
    (i)  6 張（8 − 兩袖清風 − 惜命如金）:   splitter +12.72  greedy +7.07  hoarder +2.47   ← 一張新牌都沒加
    (ii) 8 張、全部 hooks 拆:               splitter +7.76   greedy +6.47  hoarder +2.83
    (iii)24 張、全部 hooks 拆:              splitter +10.48  greedy +8.85  hoarder +4.08
    (iv) 24 張、只拆 bargain/solo 兩張 hooks: splitter +7.98  greedy +4.17  hoarder +2.05

讀法：拆掉新牌 hooks（§3 第 2 行 +7.18）或新牌獎勵歸零（+8.77）位移都沒縮小，反而放大；而 (i) 顯示光是少掉兩張「整夜不出手／只出小額」的牌，
AI 就掉 12.7pp。所以 AI 的勝率有一大塊是靠這兩張牌的 hook 在替它省壽命——AI 預設 `aiBids` 打法（45% 節流下仍每夜出 2 標）在 v0.6 經濟裡比「四分之一的夜晚按兵不動」更差。
擴池把 AI 抽到它們的機率從 1/4 稀釋到 1/12，就露餡了。逐張消融裡 bargain（+3.29）／solo（+3.05）額外多一點，是它們的 hook 讓 AI 出小額／追冷門；但 (iv) 證明拆掉也只回 1pp 內。

## 5. 候選處置（待使用者裁定，ARCH_SPEC 待辦 21）
- (甲) 接受位移、v0.8 上線；AI 預設打法另開一批（例：把「每夜 p 機率按兵不動」抽成 AI 預設決策、或降 45% 節流），各設閘門。絕對值仍在均衡之下（splitter 19.4／greedy 15.3 < 25%），AI 仍比腳本強。
- (乙) 抽牌加權讓兩張零風險牌維持 1/8 抽中率——人類也吃同一池，25% 抽到零風險牌，設計上不理想。
- (丙) 把兩張牌的 AI 行為改成 AI 預設（p≈0.25 按兵不動）——改 AI 行為數值（硬規則 3）。

# L1e exploratory measurement

Formal status: incomplete — Exploratory chaser, end-bag holder denominator, and cross-night state space are not the frozen formal protocol; eyes policy does not use tomorrow preview or second-bid information.

Source SHA256: 246b167f448ee7ad8c6353e94ffe9a01a4b342f7f911b5debb9594dd23030304
Tool SHA256: 788a2004604fdeb3e7b96c717bc7346d3e1c8da785f6967f9f3eb71a99f7bff0
Git HEAD: f8bf5594f42e39b215505b7f40d1f03e31daf873

| Arm | Games | Wins | Win rate | End holders | Holder wins | Conditional holder win rate | Paired vs splitter (pp) |
|---|---:|---:|---:|---:|---:|---:|---:|
| splitter | 200 | 61 | 30.50% | 0 | 0 | null | null |
| water-normal | 200 | 62 | 31.00% | 56 | 35 | 62.50% | 0.5 |
| water-zero | 200 | 61 | 30.50% | 57 | 34 | 59.65% | 0 |
| eyes-normal | 200 | 73 | 36.50% | 71 | 45 | 63.38% | 6 |
| eyes-zero | 200 | 73 | 36.50% | 71 | 45 | 63.38% | 6 |
| twinTiger-normal | 200 | 67 | 33.50% | 72 | 41 | 56.94% | 3 |
| twinTiger-zero | 200 | 70 | 35.00% | 71 | 43 | 60.56% | 4.5 |

| Chain | Normal − zero paired win difference (pp) | Conditional holder rate difference (pp; noncausal) |
|---|---:|---:|
| water | 0.5 | 2.8508771929824595 |
| eyes | 0 | 0 |
| twinTiger | -1.5 | -3.618935837245696 |

The chaser target is min(conservative cap, max(original splitter amount, 2) + 2).
The zero arm disables only the target chain effects through the shared CHAINS table, for all four seats. Its paired difference is not an isolated seat-0 ability effect.
The ID-based eyesSecondBid UI helper remains available in the zero arm; this headless policy never uses it.
The engine stops when the human seat dies; end bag and game length describe that runner endpoint, not a continued AI-only game.
A seat-0 death does not imply a loss when several seats die in one night; wins use winnerId === 0.
Holder means seat 0 still has the full recipe in its end bag. Conditional rates have separate denominators and are not causal effects.
Eyes chaser does not consume tomorrow preview or second-highest-bid information.

# L1e endpoint-holder diagnostic evidence

This audit reads only `../../2026-09-21-l1e-measurement/pilot/raw.jsonl`; it does not rerun the game. The raw SHA256 is `cd42d3b3ecfcd1110dcc43f4073e0ef7d74cb977876dea6b653fd311c2b38911`, matching the pilot report and independently checked after output.

For each target chain in its normal and zero arms, the denominator is a game where **at least one of the four seats** has the complete chain in `endBagChainIds` at the `playPolicyGame` runner endpoint. The numerator is a game where `winnerId` is one of those holders. Distribution slots 0–4 count games by number of endpoint holders. The normal-minus-zero conditional rate uses separate denominators and is noncausal.

The original legend-gate H9 uses a historical `holders` set derived from `S.shrines[].takenBy`. Pilot raw stores only end bags, so historical ever-held status cannot be recovered. This output is neither formal H9 nor a six-of-four cross-night measurement. `formalStatus` remains `incomplete`.

The tool validates all rows before writing: exactly seven legal arms with identical nonempty seed sets; no duplicate arm/seed; positive uint32 seeds; winner seat 0–3; and four seat chain lists with distinct legal IDs. Invalid input produced no output directory in the file test. Output inside the original pilot directory, including paths through a junction, is refused.

`node --experimental-test-coverage --test tests/l1-holder-audit.test.mjs` passed 8/8 tests. Source coverage of the new tool: lines 96.32%, branches 94.74%, functions 100% (`healthy-green-coverage.log`). A deliberate mutation to count only seat 0 holders failed 2 tests (`mutant-seat0-red.log`); restored code passed. The initial TDD RED and GREEN checkpoints are `9b6d35f` and `f93c3fc` on `feat/l1-water-chain`. Review found two additional defects: iterator-derived `games` was omitted (`games-red.log`, fixed in `cc0bbfd`), and a junction could bypass the output guard (`junction-red.log`, fixed in `4f8d797`).

The real raw was first processed with `node tests/tools/l1-holder-audit.mjs`; that output is retained under `initial-report/`. After the `games` correction, the same raw was processed again to produce the current `summary.json` and `report.md`. Both reports carry the unchanged raw hash; no simulation was run.

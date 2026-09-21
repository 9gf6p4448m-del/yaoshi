# Policy verification

The first test execution was RED because `tests/tools/l1-information.mjs` did not yet exist (`ERR_MODULE_NOT_FOUND`). That result was observed before implementation, but no separate RED checkpoint commit was made. This is not a complete TDD commit chain; the record must not be presented as one. The unmodified tests subsequently ran GREEN after the implementation.

`node tests/tools/l1-information-evidence.mjs` writes the GREEN test log, V8 coverage result, a temporary-copy baseline, and two semantic mutant logs here. The mutants remove legal second-bid consumption and future-preview budget reservation. Both must fail an assertion in their dedicated behavior test. The evidence tool runs only a two-seed engine integration; the fixed seeds 1..20 smoke sample is a separate, one-time run owned by the parent task.

`l1-information.mjs` is an opt-in experiment tool. Its three arms share the original configuration and seat-0 role. The reported whole-game comparisons pair seeds; ever-held conditional denominators belong to each arm and are descriptive, not causal. Formal H1 and H9 remain incomplete.

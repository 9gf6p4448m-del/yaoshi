import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = './tools/l1e-mark-timing.mjs';

test('mark timing protocol freezes matched arms, event equality and 10,000 paired seeds', async () => {
  const { loadMarkTimingProtocol } = await import(modulePath);
  const protocol = loadMarkTimingProtocol();
  assert.equal(protocol.schema, 'yaoshi.mark-timing.pairedProtocol.v1');
  assert.equal(protocol.source.productCommit, 'd63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a');
  assert.deepEqual(Object.keys(protocol.arms), ['uiTiming', 'allAfterEvent']);
  assert.deepEqual(protocol.controlledConditions.seedRange, { start: 1, endInclusive: 10000 });
  assert.equal(protocol.controlledConditions.productChanges, 'none');
  assert.equal(protocol.releaseGate, false);
});

test('formal cohort label requires the exact ordered protocol seed range', async () => {
  const { isFormalSeedCohort } = await import(modulePath);
  const range = { start: 1, endInclusive: 10000 };
  const seeds = Array.from({ length: 10000 }, (_, index) => index + 1);
  assert.equal(isFormalSeedCohort(seeds, range), true);
  seeds[5000] = 10001;
  assert.equal(isFormalSeedCohort(seeds, range), false);
  seeds[5000] = 5001;
  [seeds[2500], seeds[2501]] = [seeds[2501], seeds[2500]];
  assert.equal(isFormalSeedCohort(seeds, range), false);
});

test('paired trial reproduces a small seed cohort and requires first-event equality', async () => {
  const { runMarkTimingComparison } = await import(modulePath);
  const seeds = Array.from({ length: 12 }, (_, index) => index + 1);
  const first = runMarkTimingComparison({ seeds });
  const second = runMarkTimingComparison({ seeds });
  assert.equal(first.formalCohort, false);
  assert.equal(first.games, seeds.length);
  assert.equal(first.firstEvent.eventResultMismatchCount, 0);
  assert.equal(first.firstEvent.eventResultMatchedGames, first.firstEvent.eligibleGames);
  assert.ok(first.firstEvent.eligibleGames > 0);
  assert.ok(first.firstEvent.gamesWithSurvivingAiComparison <= first.firstEvent.eligibleGames);
  assert.ok(first.firstEvent.gamesWithAnyAiMarkChange <= first.firstEvent.gamesWithSurvivingAiComparison);
  for (const seat of Object.values(first.firstEvent.bySeat))
    assert.ok(seat.comparisons <= first.firstEvent.eligibleGames);
  assert.ok(first.firstEvent.humanComparisons <= first.firstEvent.eligibleGames);
  assert.deepEqual(first.outcomes, second.outcomes);
  assert.deepEqual(first.firstEvent, second.firstEvent);
  assert.equal(first.releaseGate, false);
});

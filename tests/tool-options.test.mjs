import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const tool = name => fs.readFileSync(path.join(root, 'tests', 'tools', name), 'utf8');
const runTool = (name, args) => spawnSync(process.execPath,
  [path.join(root, 'tests', 'tools', name), ...args], { cwd: root, encoding: 'utf8', timeout: 10000 });

test('scene-shot only fixes the ordinary UI journey when --seed is explicit and reports it', () => {
  const source = tool('scene-shot.mjs');
  assert.match(source, /const EXPLICIT_SEED\s*=\s*opt\.seed\s*!==\s*undefined/,
    'ordinary screenshots need to distinguish an explicit seed from the perf default');
  assert.match(source, /paperwar=1[^`\n]*\$\{EXPLICIT_SEED[^`\n]*fxcount=1[^`\n]*seed=/,
    'an explicit screenshot seed must flow through the existing UI selection journey');
  assert.match(source, /gameSeed:\s*window\.__yaoshi[\s\S]{0,100}S\.seed/,
    'the report must read back the seed that actually initialized the game');
  assert.match(source, /mode:\s*'capture'[\s\S]{0,180}seed:\s*info\s*&&\s*info\.gameSeed[\s\S]{0,100}seedSource:/,
    'capture output must report the actual seed and whether it came from CLI or the random UI default');
});

test('market card capture accepts a repo-relative output and pins baseline git reads', () => {
  const source = tool('market-card-readability.mjs');
  assert.match(source, /--out=/, 'market capture needs an explicit output option');
  assert.match(source, /path\.isAbsolute\([^)]+\)[\s\S]{0,300}path\.relative\(root,/,
    'market capture must reject output paths outside the repository');
  assert.match(source, /--baseline-ref=/, 'baseline capture needs an explicit git ref option');
  assert.match(source, /\^\[0-9a-f\]\{7,40\}\$/i,
    'baseline-ref must be an immutable abbreviated or full commit SHA');
  assert.match(source, /baselineRef[^\n]*baseline[\s\S]{0,300}throw new Error/,
    'baseline-ref must be rejected outside --baseline mode');
  assert.match(source, /git[^\n]*show[^\n]*\$\{baselineRef\}:index\.html/,
    'baseline HTML must come from the requested ref');
  assert.doesNotMatch(source, /git[^\n]*show[^\n]*HEAD:index\.html/,
    'baseline evidence must not drift with HEAD');
  assert.match(source, /baselineScope:\s*['"]DOM\/CSS-only['"]/,
    'baseline reports must disclose that JS and other dependencies still come from the candidate');
});

test('iphone layout capture accepts a repo-relative output without changing its default', () => {
  const source = tool('iphone-layout-check.mjs');
  assert.match(source, /--out=/, 'iPhone capture needs an explicit output option');
  assert.match(source, /path\.isAbsolute\([^)]+\)[\s\S]{0,300}path\.relative\(root,/,
    'iPhone capture must reject output paths outside the repository');
  assert.match(source, /docs\/experiments\/2026-09-15-iphone-standalone/,
    'the existing evidence directory remains the default');
});

test('public reveal capture accepts URL and repo-relative output while keeping seed/defaults', () => {
  const source = tool('public-reveal-capture.mjs');
  assert.match(source, /--url=/, 'public reveal needs a candidate URL option');
  assert.match(source, /--out=/, 'public reveal needs an explicit output option');
  assert.match(source, /path\.isAbsolute\([^)]+\)[\s\S]{0,300}path\.relative\(root,/,
    'public reveal must reject output paths outside the repository');
  assert.match(source, /https:\/\/9gf6p4448m-del\.github\.io\/yaoshi\//,
    'the current public site remains the default');
  assert.match(source, /const seed\s*=\s*Number\([^\n]*process\.argv/,
    'the positional seed contract remains available');
  assert.match(source, /page\.goto\([^\n]*url/,
    'the selected URL must drive navigation');
});

test('tool option guards reject unsafe paths before starting a browser', () => {
  for (const name of ['market-card-readability.mjs', 'iphone-layout-check.mjs', 'public-reveal-capture.mjs']) {
    const run = runTool(name, ['--out=../outside-repo']);
    assert.equal(run.status, 1, `${name} must reject a parent-directory output`);
    assert.match(run.stderr + run.stdout, /--out 不得離開 repo/);
  }
});

test('baseline and URL options reject invalid combinations before capture', () => {
  const orphanRef = runTool('market-card-readability.mjs', ['--baseline-ref=eafec13']);
  assert.equal(orphanRef.status, 1);
  assert.match(orphanRef.stderr + orphanRef.stdout, /baseline-ref 只可搭配 --baseline/);

  const driftingBaseline = runTool('market-card-readability.mjs', ['--baseline']);
  assert.equal(driftingBaseline.status, 1);
  assert.match(driftingBaseline.stderr + driftingBaseline.stdout, /baseline-ref=<SHA>/);

  const mutableRef = runTool('market-card-readability.mjs', ['--baseline', '--baseline-ref=HEAD']);
  assert.equal(mutableRef.status, 1);
  assert.match(mutableRef.stderr + mutableRef.stdout, /commit SHA/);

  const badUrl = runTool('public-reveal-capture.mjs', ['3', '--url=file:///tmp/nope']);
  assert.equal(badUrl.status, 1);
  assert.match(badUrl.stderr + badUrl.stdout, /--url 只接受 http\(s\) URL/);
});

test('scene-shot rejects an invalid explicit seed before capture', () => {
  const run = runTool('scene-shot.mjs', ['scene', '--seed=not-a-number']);
  assert.equal(run.status, 1);
  assert.match(run.stderr + run.stdout, /--seed 必須是數字/);
});

test('scene-shot rejects an empty explicit seed instead of silently using seed 1', () => {
  const run = runTool('scene-shot.mjs', ['scene', '--seed=', '--gate128']);
  assert.equal(run.status, 1);
  assert.match(run.stderr + run.stdout, /--seed 不得為空/);
});

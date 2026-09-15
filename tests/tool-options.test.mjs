import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const tool = name => fs.readFileSync(path.join(root, 'tests', 'tools', name), 'utf8');

test('scene-shot only fixes the ordinary UI journey when --seed is explicit and reports it', () => {
  const source = tool('scene-shot.mjs');
  assert.match(source, /const EXPLICIT_SEED\s*=\s*opt\.seed\s*!==\s*undefined/,
    'ordinary screenshots need to distinguish an explicit seed from the perf default');
  assert.match(source, /paperwar=1[^`\n]*\$\{EXPLICIT_SEED[^`\n]*fxcount=1[^`\n]*seed=/,
    'an explicit screenshot seed must flow through the existing UI selection journey');
  assert.match(source, /mode:\s*'capture'[\s\S]{0,180}seed:\s*EXPLICIT_SEED\s*\?\s*SEED\s*:\s*null/,
    'capture output must say which explicit seed was used, while leaving the default random');
});

test('market card capture accepts a repo-relative output and pins baseline git reads', () => {
  const source = tool('market-card-readability.mjs');
  assert.match(source, /--out=/, 'market capture needs an explicit output option');
  assert.match(source, /path\.isAbsolute\([^)]+\)[\s\S]{0,300}path\.relative\(root,/,
    'market capture must reject output paths outside the repository');
  assert.match(source, /--baseline-ref=/, 'baseline capture needs an explicit git ref option');
  assert.match(source, /baselineRef[^\n]*baseline[\s\S]{0,300}throw new Error/,
    'baseline-ref must be rejected outside --baseline mode');
  assert.match(source, /git[^\n]*show[^\n]*\$\{baselineRef\}:index\.html/,
    'baseline HTML must come from the requested ref');
  assert.doesNotMatch(source, /git[^\n]*show[^\n]*HEAD:index\.html/,
    'baseline evidence must not drift with HEAD');
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

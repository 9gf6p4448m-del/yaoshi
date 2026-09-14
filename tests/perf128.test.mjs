import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = fs.readFileSync(path.join(root, 'tests', 'tools', 'scene-shot.mjs'), 'utf8');

test('128-coin perf mode fills every legal seat and market slot through product bids', () => {
  assert.match(source, /--coins=128/, '128 coin pressure mode must be an explicit CLI option');
  assert.match(source, /const GATE128 = !!opt\.gate128/, 'frozen 128 coin limits must be an explicit CI gate');
  assert.match(source, /for\s*\(let seat=0;seat<4;seat\+\+\)\s*\{\s*for\s*\(let slot=0;slot<4;slot\+\+\)\s*\{\s*P\.bid\(seat, slot, 8\)/s,
    '128 coin pressure mode must use all 4 seats × 4 slots × 8 product bids');
  assert.match(source, /42000/, 'gate must enforce the frozen triangle ceiling');
  assert.match(source, /0\.40/, 'gate must retain the frozen render-rate disaster line');
});

test('128-coin gate rejects a command that omits the required performance mode', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'yaoshi-perf128-'));
  try {
    const run = spawnSync(process.execPath, [path.join(root, 'tests', 'tools', 'scene-shot.mjs'), out,
      '--coins=128', '--gate128', '--port=9231'], { cwd: root, encoding: 'utf8', timeout: 30000 });
    assert.notEqual(run.status, 0, 'gate128 without --perf must reject rather than run a normal screenshot flow');
    assert.match((run.stderr || '') + (run.stdout || ''), /gate128.*perf|perf.*gate128/i,
      'rejection must explain the missing performance mode');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

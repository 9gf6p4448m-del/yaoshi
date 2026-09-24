import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadGame } from './tools/load.mjs';
const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('reader materials retain six frozen seeds and describe loss intervals without inventing events', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaoshi-ledger-material-'));
  try {
    const material = path.join(dir, 'material.json'), key = path.join(dir, 'key.json');
    execFileSync(process.execPath, ['tests/tools/ledger-material.mjs', material, key], { cwd: ROOT });
    const M = JSON.parse(fs.readFileSync(material)), K = JSON.parse(fs.readFileSync(key));
    assert.deepEqual(K.map(k => k.seed), [2, 5, 8, 11, 14, 17]);
    assert.equal(M.items.length, 6);
    for (const [i, k] of K.entries()) {
      assert.equal(k.rubric, 'loss-interval-v2');
      assert.match(k.causeText, /壽命.*減少/);
      assert.doesNotMatch(k.causeText, /撞上異事/);
      assert.equal(M.items[i].causes.length, 4);
      assert.equal(new Set(M.items[i].causes.map(c => c.text)).size, 4);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('research judge labels current reconstruction, preserves original version and lists separate costs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaoshi-ledger-judge-'));
  try {
    const G = loadGame(path.join(ROOT, 'index.html')); G.playPolicyGame(1, { 0: G.POLICIES.splitter });
    const cause = G.ledgerNarrative(G.S.history, G.S.players).cause;
    assert.equal(cause.round, 4);
    assert.equal(cause.drop, 13);
    assert.deepEqual(cause.payments.map(p => [p.item, p.cost]), [['百步蛇紋盾', 4], ['山神庇佑', 4]]);
    // Deliberately vary replay metadata to verify the judge reports the input
    // version, while the reconstructed narrative remains clearly labeled.
    const E = G.replayExport(G.S); E.ver = '0.57.34';
    const f = path.join(dir, 'replay.json'); fs.writeFileSync(f, JSON.stringify(E));
    const out = execFileSync(process.execPath, ['tests/tools/replay-judge.mjs', f], { cwd: ROOT, encoding: 'utf8' });
    assert.match(out, /loss-interval-v2/);
    assert.match(out, /原始版本.*0\.57\.34/);
    assert.match(out, /目前版本重建.*非玩家當時所見/);
    assert.match(out, /百步蛇紋盾.*實付 4/);
    assert.match(out, /山神庇佑.*實付 4/);
    assert.match(out, /淨減少 13/);
    assert.doesNotMatch(out, /玩家在回顧頁看到的句子|撞上異事/);
    assert.equal(fs.readFileSync(f, 'utf8'), JSON.stringify(E));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

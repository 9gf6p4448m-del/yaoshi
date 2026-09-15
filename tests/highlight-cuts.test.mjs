import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('命懸一線只給存活的低血量冠軍，四家全滅不得宣稱活到天明', () => {
  const source = index.slice(index.indexOf('const CUTS = ['), index.indexOf('function playCut('));
  const S = { history: { life: [{ 0: 50 }, { 0: 4 }] } };
  const cuts = new Function('S', 'CFG', source + '\nreturn CUTS;')(S, {});
  const cut = cuts.find(c => c.id === 'death-edge');
  assert.equal(cut.test({ rank: [{ id: 0, alive: true }] }), true);
  assert.equal(cut.test({ rank: [{ id: 0, alive: false }] }), false);
  assert.equal(cut.test({ rank: [] }), false);
  S.history.life = [{ 0: 50 }, { 0: 6 }];
  assert.equal(cut.test({ rank: [{ id: 0, alive: true }] }), false);
});

test('三種高光轉場由單一純讀取 CUTS 表定義', () => {
  assert.match(index, /const\s+CUTS\s*=\s*\[/, '高光轉場必須有單一 CUTS 表');
  const cuts = index.slice(index.indexOf('const CUTS = ['), index.indexOf('async function startReveal()'));
  assert.match(cuts, /id:\s*["']bluff["']/, '必須定義誅心轉場');
  assert.match(cuts, /id:\s*["']borrowed-blade["']/, '必須定義借刀轉場');
  assert.match(cuts, /id:\s*["']death-edge["']/, '必須定義命懸一線轉場');
  assert.doesNotMatch(cuts, /\.rng\s*\(/, '轉場判定不得消耗 RNG');
});

test('轉場只能由真人演出點消費，且每局每種最多一次', () => {
  const reveal = index.slice(index.indexOf('async function startReveal()'), index.indexOf('async function startBattle()'));
  const battle = index.slice(index.indexOf('async function startBattle()'), index.indexOf('function nextRound()'));
  const end = index.slice(index.indexOf('function endGame()'), index.indexOf('function replayExperiment'));
  assert.match(reveal, /playCut\(/, '揭盅完成後必須消費誅心轉場');
  assert.match(battle, /playCut\(/, '夜戰完成後必須消費借刀轉場');
  assert.match(end, /playCut\(/, '局末必須消費命懸一線轉場');
  assert.match(index, /playedCuts/, '必須記錄本局已播放的轉場，避免重複噪音');
});

test('高光轉場保持 reduced-motion 的靜態替代路徑', () => {
  const cuts = index.slice(index.indexOf('const CUTS = ['), index.indexOf('async function startReveal()'));
  assert.match(cuts, /pwReduced\(\)/, 'reduced-motion 時必須走靜態替代路徑');
  assert.match(index, /\.cutOverlay/, '必須有獨立 DOM 演出層，不得改 3D 場景或引擎');
  assert.match(index, /prefers-reduced-motion:\s*reduce[\s\S]*cutOverlay/, 'reduced-motion 樣式必須覆蓋轉場層');
});

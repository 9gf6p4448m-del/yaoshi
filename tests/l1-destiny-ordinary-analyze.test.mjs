import {test} from 'node:test';
import assert from 'node:assert/strict';
import {h9Gate} from './tools/l1-destiny-ordinary-analyze.mjs';

test('H9 uses unrounded holder rates at the +3pp boundary',()=>{
  const normal={holderGames:3000,holderWins:1014};
  const zero={holderGames:3149,holderWins:970};
  assert.equal(h9Gate('water',normal,zero),'fail');
});

test('H9 uses unrounded holder rate at the 85% ceiling',()=>{
  const normal={holderGames:9987,holderWins:8489};
  const zero={holderGames:10000,holderWins:7800};
  assert.equal(h9Gate('godKing',normal,zero),'fail');
});

test('H9 keeps information-blind eyes and empty holders incomplete',()=>{
  const normal={holderGames:2406,holderWins:1377};
  const zero={holderGames:2276,holderWins:1106};
  assert.equal(h9Gate('water',normal,zero),'pass');
  assert.equal(h9Gate('eyes',normal,zero),'incomplete');
  assert.equal(h9Gate('twinTiger',{holderGames:0,holderWins:0},zero),'incomplete');
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { loadGame } from './tools/load.mjs';

const file = new URL('../index.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const game = loadGame(file);
const cardCode = source.slice(source.indexOf('function mcardHTML('), source.indexOf('let sheetIdx='));
const effectStart = source.indexOf('function curseEffectText(');
const effectCode = effectStart < 0 ? '' : source.slice(effectStart, source.indexOf('function mcardHTML('));
// Exercise the production card renderer. Unrelated icon/ownership/3D formatting
// is stubbed; curse text and the locked auction branch remain real product code.
const render = new Function('it', 'paperwar', 'locked', `
  const CFG={PAPERWAR_ON:paperwar}, ACTIVE=0;
  const S={round:1,players:[{}]}, myBids=[{amt:0}], YB=locked?{pick:[]}:null;
  const FAC={curse:{cls:'f-curse',n:'詛咒'}};
  const moonBenefit=()=>({active:false}), sysBg=()=>'', markBadgeHTML=()=>'', itemIcoHTML=()=>'';
  const marketStatText=()=> '詛咒・纏身', unitRowText=()=> '詛咒品不召喚（只算纏身）';
  const abDesc=()=>'';
  ${effectCode}
  ${cardCode}
  return mcardHTML(it,0);
`);

test('all five curse cards explain the actual attack penalty, including locked auctions', () => {
  for (const curse of game.CURSES) for (const locked of [false,true]) {
    const html=render(curse,true,locked);
    assert.match(html,/每件[^<]*紙紮攻擊\s*−1/,curse.n);
    if (locked) assert.match(html,/本夜不開標/);
    if (curse.drain) assert.match(html,/每夜末另失 1 壽命/);
    else assert.doesNotMatch(html,/失 \d+ 壽命/);
  }
});

test('legacy combat describes base power instead of inventing a paper-war penalty', () => {
  for (const curse of game.CURSES) {
    const html=render(curse,false,false);
    assert.ok(html.includes(`基礎戰力 ${curse.p>=0?'+':''}${curse.p}`),curse.n);
    assert.doesNotMatch(html,/紙紮攻擊/);
  }
});

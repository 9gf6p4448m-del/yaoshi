import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { loadGame } from './tools/load.mjs';

const file = new URL('../index.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const game = loadGame(file);
const cardCode = source.slice(source.indexOf('function mcardHTML('), source.indexOf('let sheetIdx='));
const markCode = source.slice(source.indexOf('function markCardHTML('), source.indexOf('function showMarkUI('));
const effectStart = source.indexOf('function curseEffectText(');
const effectCode = effectStart < 0 ? '' : source.slice(effectStart, source.indexOf('function mcardHTML('));
// Exercise the production card renderer. Unrelated icon/ownership/3D formatting
// is stubbed; curse text and the locked auction branch remain real product code.
const render = new Function('it', 'paperwar', 'locked', 'G', 'mark', `
  const CFG={PAPERWAR_ON:paperwar}, ACTIVE=0;
  const S={round:1,players:[{}]}, myBids=[{amt:0}], YB=locked?{pick:[]}:null;
  const FAC=Object.fromEntries(['curse','zuling','xianghuo','yinqi'].map(f=>[f,{cls:'f-'+f,n:f}]));
  const moonBenefit=()=>({active:false}), sysBg=()=>'', markBadgeHTML=()=>'', itemIcoHTML=()=>'';
  const marketStatText=()=> '詛咒・纏身', unitRowText=()=> '詛咒品不召喚（只算纏身）';
  const abDesc=ab=>G.ABILITIES[ab]?.desc||'', unitRow=it=>G.unitRow(it);
  ${effectCode}
  ${cardCode}
  ${markCode}
  return mark?markCardHTML(it,0):mcardHTML(it,0);
`);

test('all five curse cards explain the actual attack penalty, including locked auctions', () => {
  for (const curse of game.CURSES) for (const locked of [false,true]) {
    const html=render(curse,true,locked,game,false);
    assert.match(html,/每件[^<]*紙紮攻擊\s*−1/,curse.n);
    if (locked) assert.match(html,/本夜不開標/);
    if (curse.drain) assert.match(html,/每夜末另失 1 壽命/);
    else assert.doesNotMatch(html,/失 \d+ 壽命/);
  }
});

test('legacy combat describes base power instead of inventing a paper-war penalty', () => {
  for (const curse of game.CURSES) {
    const html=render(curse,false,false,game,false);
    assert.ok(html.includes(`基礎戰力 ${curse.p>=0?'+':''}${curse.p}`),curse.n);
    assert.doesNotMatch(html,/紙紮攻擊/);
  }
});

test('marking cards explain all curses before the player chooses a target', () => {
  for (const curse of game.CURSES) {
    const html=render(curse,true,false,game,true);
    assert.match(html,/每件[^<]*紙紮攻擊\s*−1/,curse.n);
    if(curse.drain) assert.match(html,/每夜末另失 1 壽命/);
  }
});

test('cards with no active auction ability describe their actual paper-war move', () => {
  const powerOnly=['sword','pojun','sigui','fushou'];
  const items=[...game.POOL,...game.LEGENDS].filter(it=>!it.ab||powerOnly.includes(it.ab));
  for (const it of items) for(const mark of [false,true]) {
    const html=render(it,true,false,game,mark);
    assert.ok(html.includes(game.unitRow(it).desc),it.n);
  }
});

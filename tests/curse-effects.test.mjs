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
const render = new Function('it', 'paperwar', 'locked', 'G', 'mark', 'full', `
  const CFG={PAPERWAR_ON:paperwar}, ACTIVE=0;
  const S={round:1,players:[{}]}, myBids=[{amt:0}], YB=locked?{pick:[]}:null;
  const FAC=Object.fromEntries(['curse','zuling','xianghuo','yinqi'].map(f=>[f,{cls:'f-'+f,n:f}]));
  const moonBenefit=()=>({active:false}), sysBg=()=>'', markBadgeHTML=()=>'', itemIcoHTML=()=>'';
  const marketStatText=()=> '詛咒・纏身', unitRowText=()=> '詛咒品不召喚（只算纏身）';
  const abDesc=ab=>G.ABILITIES[ab]?.desc||'', unitRow=it=>G.unitRow(it);
  const curseKind=it=>({"冥婚紅包":"wedding","魔神仔的芭樂":"guava","抓交替水符":"water","縛靈鎖":"lock","白虎煞":"tiger","王船煞":"boat"})[it.n]||null;
  ${effectCode}
  ${cardCode}
  ${markCode}
  return full?curseEffectText(it,true):(mark?markCardHTML(it,0):mcardHTML(it,0));
`);

const expected={
  '冥婚紅包':{card:/得標[^<]*每件[^<]*1 壽命[^<]*禮金/,full:[/本夜有得標[^<]*每件付 1 壽命禮金/,/沒有得標不收/,/不增加標額或買路錢/,/淨化不免/]},
  '魔神仔的芭樂':{card:/夜末[^<]*每件[^<]*失 1 壽命/,full:[/每夜末每件失 1 壽命/,/可累加/,/淨化不免/]},
  '抓交替水符':{card:/每戰首次[^<]*折損[^<]*牽連[^<]*每件[^<]*傷害 1/,full:[/每戰首次[^<]*紙紮燒毀後/,/血量最低[^<]*每件受 1 傷害/,/只牽連一次/,/不觸發反傷、吸收或再次牽連/,/沒有其他存活者/,/淨化免除/]},
  '縛靈鎖':{card:/第1拍[^<]*最高基礎攻擊[^<]*每件攻擊 −2/,full:[/第1拍[^<]*基礎攻擊最高[^<]*本拍每件攻擊 −2/,/同分先入陣/,/總攻擊 ≤0 不出手/,/第2拍恢復/,/淨化免除/]},
  '白虎煞':{card:/戰敗[^<]*每件[^<]*額外失 1 壽命[^<]*減傷前/,full:[/每次戰敗[^<]*每件[^<]*增加 1 壽命損失/,/一般傷害上限外/,/再套用法寶減傷/,/獲勝或平手不生效/,/淨化免除/]},
  '王船煞':{card:/第1拍[^<]*血量最高[^<]*每件失 1 血[^<]*最低 1/,full:[/第1拍[^<]*目前血量最高[^<]*每件失 1 血量[^<]*最低留 1/,/同分先入陣/,/局末送出海/,/淨化免除/]},
};
const boatCurse={n:'王船煞',f:'curse',p:-6,d:'送王船沾上的煞，局末自動送出海',curse:true,endStrip:true};

test('all five auction curse cards explain their distinct effect, including locked auctions', () => {
  for (const curse of game.CURSES) for (const locked of [false,true]) {
    const html=render(curse,true,locked,game,false);
    assert.match(html,expected[curse.n].card,curse.n);
    assert.doesNotMatch(html,/每件[^<]*紙紮攻擊\s*−1/,curse.n);
    if (locked) assert.match(html,/本夜不開標/);
  }
});

test('all six full curse descriptions state triggers, limits, stacking and purification scope', () => {
  for (const curse of [...game.CURSES,boatCurse]) {
    const text=render(curse,true,false,game,false,true);
    for(const pattern of expected[curse.n].full) assert.match(text,pattern,curse.n);
    assert.doesNotMatch(text,/每件[^<]*紙紮攻擊\s*−1/,curse.n);
  }
});

test('marking cards explain all curses before the player chooses a target', () => {
  for (const curse of game.CURSES) {
    const html=render(curse,true,false,game,true);
    assert.match(html,expected[curse.n].card,curse.n);
  }
});

test('retired power-only copy stays hidden while cards show the actual paper-war move', () => {
  const powerOnly=['sword','pojun','sigui','fushou'];
  const items=[...game.POOL].filter(it=>powerOnly.includes(it.ab));
  for (const it of items) for(const mark of [false,true]) {
    const html=render(it,true,false,game,mark);
    assert.ok(html.includes(game.unitRow(it).desc),it.n);
    assert.ok(!html.includes(game.ABILITIES[it.ab].desc),it.n);
    assert.doesNotMatch(html,/戰力評估/,it.n);
  }
});

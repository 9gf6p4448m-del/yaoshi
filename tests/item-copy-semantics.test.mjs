import assert from 'node:assert/strict';
import test from 'node:test';
import { loadGame } from './tools/load.mjs';

const game=loadGame(new URL('../index.html',import.meta.url));
const detail=name=>game.unitRowText([...game.POOL,...game.LEGENDS].find(it=>it.n===name),null,'full');

test('auction abilities state the fee and minimum-life-loss exceptions',()=>{
  assert.match(game.ABILITIES.raincoat.desc,/買路錢.*照收/);
  assert.match(game.ABILITIES.shield.desc,/最低.*1/);
  assert.match(game.ABILITIES.flag.desc,/向下取整/);
  assert.match(game.ABILITIES.redhat.desc,/實付不變/);
});

test('battle details distinguish initiative ties, the winning side, and precise swap targets',()=>{
  assert.match(detail('祖靈之眼'),/雙方.*同時/);
  assert.match(detail('林投姐髮簪'),/本方.*勝/);
  assert.match(detail('椅仔姑竹椅'),/第 2、3.*額外/);
  assert.match(detail('水鬼浮標'),/本方.*血量最低.*紙紮/);
});

test('damage copy covers ward fear and armor that triggers only above one remaining damage',()=>{
  assert.match(detail('黃色小雨衣'),/群體與護法/);
  assert.match(detail('巴冷公主珠鍊'),/吸收後.*2 點以上/);
  assert.match(detail('山豬牙飾'),/吸收.*0/);
  assert.match(detail('虎爺印'),/吸收.*0/);
});

test('health growth and sacrifice specify health limits, team scope and battle duration',()=>{
  for(const name of ['百步蛇紋盾','山神庇佑','香灰符','五營旗','飼鬼甕','大士爺紙尊'])
    assert.match(detail(name),/血量上限與目前值/,name);
  assert.match(detail('獻祭刀'),/本隊.*本場.*攻擊 \+2/);
  assert.match(detail('獻祭刀'),/最低 1/);
});

test('full unit details explain resonance timing without implying a single attack beat',()=>{
  assert.match(detail('百步蛇紋盾'),/共鳴/);
  assert.match(detail('百步蛇紋盾'),/每拍皆會攻擊/);
  assert.match(detail('水鬼浮標'),/作祟不普攻/);
});

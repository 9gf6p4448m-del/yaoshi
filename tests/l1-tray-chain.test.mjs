import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const tray = fs.readFileSync(path.join(root, 'js', 'table-tray.js'), 'utf8');

test('3D 托盤具備連鎖共鳴層 (tray-chain-resonance)，且與月相光環 (tray-moon-benefit) 區隔', () => {
  assert.match(tray, /tray-chain-resonance/, '托盤需建立連鎖共鳴層');
  assert.match(tray, /tray-moon-benefit/, '托盤需保留月相受惠層');

  // 顏色區隔：月相為金黃 (0xe8bd55)，連鎖為硃砂紅 (0xc8261e 或 0xb8)
  assert.match(tray, /0xe8bd55/, '月相層需使用月華金');
  assert.match(tray, /0xc8261e|0xb8281d|0xaa1c1c/, '連鎖共鳴需使用硃砂紅');

  // 形狀幾何區隔：連鎖為內核 (半徑約 0.04~0.11)，月相為外環 (半徑 0.17~0.195)
  assert.match(tray, /RingGeometry\(0\.04[0-9]*, 0\.09[0-9]*,/, '連鎖共鳴需使用內核環幾何');
  assert.match(tray, /RingGeometry\(0\.17, 0\.195,/, '月相需使用外環幾何');
});

test('market3dItems 正確將當前真人玩家之補件連鎖標記傳入 3D 托盤，並保護私密性', () => {
  assert.match(index, /chain:\s*\(?ap\s*&&\s*typeof\s*chainsCompletedBy/,
    'market3dItems 需依當前真人玩家 (ap) 之 chainsCompletedBy 判定 chain 標記');
  
  // 驗證私密性：非真人 (ai) 或未輪到真人時不顯示
  const market3dDef = index.slice(index.indexOf('function market3dItems()'), index.indexOf('function market3dSeats()'));
  assert.match(market3dDef, /!S\.players\[ACTIVE\]\.ai/,
    '非真人出價時不得外洩連鎖提示');
});

test('托盤插槽生命週期維護 chain 狀態並支援共鳴呼吸脈動', () => {
  assert.match(tray, /chain:\s*!!it\.chain/, 'fillSlot 需記錄 chain 標記');
  assert.match(tray, /s\.chain = false/, 'clearSlot 需清除 chain 標記');
  assert.match(tray, /chainAnimTime/, '托盤需維護連鎖共鳴之呼吸動畫時間');
});

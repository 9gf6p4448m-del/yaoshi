import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const tray = fs.readFileSync(path.join(root, 'js', 'table-tray.js'), 'utf8');
const props = fs.readFileSync(path.join(root, 'js', 'table-props.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'js', 'renderer.js'), 'utf8');
const director = fs.readFileSync(path.join(root, 'js', 'camera-director.js'), 'utf8');

test('揭盅維持 3D 牌桌可見，且不再用黑幕切換', () => {
  const reveal = index.slice(index.indexOf('async function startReveal()'), index.indexOf('/* 本夜成交總覽 */'));
  assert.match(reveal, /setHollow\(true\)/, '揭盅必須維持 hollow 牌桌');
  assert.doesNotMatch(reveal, /veil\(true\)/, '揭盅不得以黑幕遮住 3D 桌面');
  assert.match(reveal, /ys:reveal-slot/, '每件拍品必須通知鏡頭聚焦該槽位');
});

test('托盤有硃砂法陣、月相受惠與揭盅結果三種純演出狀態', () => {
  assert.match(tray, /tray-cinnabar-runes/, '托盤需建立硃砂法陣層');
  assert.match(tray, /pulseRune/, '出價／盯上／揭盅需能脈衝法陣');
  assert.match(tray, /playAward/, '得標拍品需能飛往勝者席位');
  assert.match(tray, /playCurseBurn/, '詛咒品需能在托盤焚毀');
  assert.match(tray, /playCurseTransfer/, '毒標詛咒品必須飛往承受者，不可誤燒');
  assert.match(tray, /node\.visible && !s\.award/, '已飛走／燒毀的同拍品下夜必須重建');
});

test('道具層有廉價接觸陰影並能把開標錢堆並排保留', () => {
  assert.match(props, /prop-contact-shadows/, '桌上道具需要接觸陰影層');
  assert.match(props, /reveal\(slot, winnerSeat, effect/, '揭盅需保留各方錢堆以供比大小');
  assert.match(props, /tokenBase/, '血玉令牌需初始化 instance color，得標光才可見');
  assert.match(props, /chipBaseColors\[n\]/, '非得標銅錢要保留原本綠鏽色差');
  assert.match(renderer, /transferTarget: d\.transferTarget/, '渲染橋必須把毒標受害席轉交給托盤演出');
  assert.match(tray, /effect\.transferTarget/, '托盤需區分毒標飛向受害席與一般得標');
  assert.match(props, /winnerGlow/, '得標錢堆需要金色高亮');
  assert.match(props, /onBid/, '正常出價必須能觸發法陣波紋');
  assert.match(props, /c\.shadow/, '飛行中接觸陰影必須跟著銅錢本體');
  assert.match(props, /chipCount\(\)/, '托盤需能讀取實際銅錢壓力，非猜測');
  assert.match(props, /compactShadows/, '128 枚壓力時接觸陰影需合併為錢堆陰影');
  assert.match(tray, /pressureOutlines/, '128 枚壓力下 hover 必須有零額外 draw call 的退路');
});

test('揭盅卡不撞夜況列，完整列出比價與結果', () => {
  const ribbon = index.slice(index.indexOf('.revealRibbon{'), index.indexOf('.bidfly{', index.indexOf('.revealRibbon{')));
  const reveal = index.slice(index.indexOf('async function startReveal()'), index.indexOf('/* 本夜成交總覽 */'));
  assert.doesNotMatch(ribbon, /top\s*:\s*-/, '揭盅卡不得往上撞入 #feltHead');
  assert.match(ribbon, /backdrop-filter\s*:\s*blur\(8px\)/, '揭盅卡須以深色毛玻璃隔開底層文字');
  assert.doesNotMatch(ribbon, /max-height\s*:\s*18px/, '出價與結果不可再被 18px 截斷');
  assert.doesNotMatch(ribbon, /text-overflow\s*:\s*ellipsis/, '開標結果不可省略');
  assert.match(reveal, /bidPills/, '比標時要逐席顯示出價膠囊');
  assert.match(reveal, /r\.entries\.map/, '膠囊列必須由全部出價席位生成');
});

test('揭盅在宣布比標時同步觸發 3D 結果，並用近距離鏡頭看錢柱', () => {
  const reveal = index.slice(index.indexOf('async function startReveal()'), index.indexOf('/* 本夜成交總覽 */'));
  const bidAt = reveal.indexOf('const fz=$("flyzone")');
  const revealAt = reveal.indexOf('revealGlow(r)');
  assert.ok(bidAt >= 0 && revealAt > bidAt, '揭盅 3D 事件必須在揭盅卡出現時觸發，而非等文字演出結束');
  assert.match(reveal, /if\(r\.winner\)\{ revealGlow\(r\); sfx\("gong"/, '闇市隱藏金額時也必須保留 3D 得標演出');
  assert.match(reveal, /sfx\("gong"/, '比標揭盅須有銅鑼回饋');
  assert.match(director, /dist:\s*1\.65,\s*tilt:\s*22/, '逐槽鏡頭必須切入微距俯衝');
  assert.match(props, /T:\s*0\.024/, '銅錢厚度必須升級');
  assert.match(props, /T:\s*0\.045/, '血玉令牌厚度必須升級');
  assert.match(props, /CH\.T\s*\*\s*0\.9/, '同席出價必須按銅錢厚度垂直堆疊');
  assert.match(props, /loserDim/, '落標錢柱應退成低彩度，讓得標金光更清楚');
  assert.match(props, /BEVEL/, '血玉令牌需有微導角幾何');
  assert.match(props, /0\.08/, '血玉令牌落桌需保有微翹角度');
});

test('逐槽微距鏡頭不能被結算事件重設，結果卡也不得遮住托盤', () => {
  const ribbon = index.slice(index.indexOf('.revealRibbon{'), index.indexOf('.bidfly{', index.indexOf('.revealRibbon{')));
  assert.match(director, /lookX/, '鏡頭必須可將視線移到當前托盤槽位，而非永遠看桌心');
  assert.match(director, /lookX:\s*\[-1\.35, -0\.45, 0\.45, 1\.35\]\[slot\]/, '逐槽鏡頭必須瞄準實際 tray x 座標');
  assert.match(director, /lookZ:\s*0\.55/, '逐槽鏡頭必須瞄準托盤前的錢柱，而非拍品後方');
  assert.match(index, /ys:reveal-result/, '3D 結算需使用不會重設鏡頭的專用事件');
  assert.match(renderer, /ys:reveal-result/, 'renderer 必須接收專用結算事件');
  assert.match(ribbon, /right:-150px/, '比價卡要停在托盤外的右側安全區');
  assert.match(index, /#felt\.hollow\{overflow:visible/, '右側比價卡不得被桌心容器裁掉');
});

test('局末只留一個進入完整回顧的入口，策略建議不以心願硬優先', () => {
  const endStart = index.indexOf('function endGame()');
  const end = index.slice(endStart, index.indexOf('function replayExperiment', endStart));
  assert.equal((end.match(/onclick="showReview\(\)"/g) || []).length, 1, '局末不可有兩個相同回顧按鈕');
  const exp = index.slice(index.indexOf('function replayExperiment'), index.indexOf('function showReview'));
  assert.match(exp, /experimentScores/, '下一局實驗需根據多個缺口排序');
  assert.doesNotMatch(exp, /if\(failed\) return/, '心願不得永遠搶走建議優先權');
});

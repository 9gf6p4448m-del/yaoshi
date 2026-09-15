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
const theme = fs.readFileSync(path.join(root, 'assets', 'theme.css'), 'utf8');

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

test('揭盅先播錢柱與法寶飛行，再顯示固定的比價卡', () => {
  const reveal = index.slice(index.indexOf('async function startReveal()'), index.indexOf('/* 本夜成交總覽 */'));
  const slotAt = reveal.indexOf('fx3d("ys:reveal-slot"');
  const revealAt = reveal.indexOf('revealGlow(r)');
  const cardAt = reveal.indexOf('id="revealCard"');
  assert.ok(slotAt >= 0 && revealAt > slotAt && cardAt > revealAt, '錢柱特寫與法寶結算必須先於比價卡建立');
  assert.match(reveal, /await sleep\(Math\.max\(700,CFG\.T\*1\.25\)\)/, '結算不得早於微距鏡頭抵達槽位');
  assert.match(reveal, /if\(r\.winner\)\{ revealGlow\(r\); sfx\("gong"/, '闇市隱藏金額時也必須保留 3D 得標演出');
  assert.match(reveal, /await sleep\(Math\.max\(0\.9\*1000,CFG\.T\*1\.4\)\)/, '比價卡必須等法寶飛行完成後才出現');
  assert.match(reveal, /await waitMain\(r!==rv\.reveal\[rv\.reveal\.length-1\]\?"下一件拍品 ▸":"查看成交總覽 ▸"\)/, '比價卡不得自動淡出，最後一件也須由玩家確認');
  assert.match(reveal, /fx3d\("ys:reveal-card"/, '比價卡出現後才可命令鏡頭回到牌桌');
  assert.match(reveal, /sfx\("gong"/, '比標揭盅須有銅鑼回饋');
  assert.match(director, /dist:\s*1\.65,\s*tilt:\s*22/, '逐槽鏡頭必須切入微距俯衝');
  assert.match(props, /T:\s*0\.024/, '銅錢厚度必須升級');
  assert.match(props, /T:\s*0\.050/, '血玉令牌厚度必須升級');
  assert.match(props, /CH\.T\s*\*\s*0\.9/, '同席出價必須按銅錢厚度垂直堆疊');
  assert.match(props, /loserDim/, '落標錢柱應退成低彩度，讓得標金光更清楚');
  assert.match(props, /BEVEL/, '血玉令牌需有微導角幾何');
  assert.match(props, /PITCH:\s*0\.70/, '血玉令牌需以前傾站立的姿態露出牌面，而非留在桌面的細條');
  assert.match(props, /Math\.sin\(wobble\)\s*\*\s*0\.010/, '錢柱每層必須有可見的偏心，不能堆成一根細條');
  assert.match(props, /c\.tilt/, '每枚銅錢需有微翹，讓金屬側緣分層可見');
  assert.match(props, /SEAT_DX:\s*\[-0\.15,\s*0\.15,\s*-0\.15,\s*0\.15\]/, '四席錢柱必須拉開左右位置，不能兩兩重疊');
  assert.match(props, /SEAT_DZ:\s*\[0\.10,\s*-0\.10,\s*-0\.10,\s*0\.10\]/, '四席錢柱必須拉開前後位置，不能合成一根');
});

test('逐槽微距鏡頭不能被結算事件重設，結果卡也不得遮住托盤', () => {
  const ribbon = index.slice(index.indexOf('.revealRibbon{'), index.indexOf('.bidfly{', index.indexOf('.revealRibbon{')));
  assert.match(director, /lookX/, '鏡頭必須可將視線移到當前托盤槽位，而非永遠看桌心');
  assert.match(director, /lookX:\s*\[-1\.35, -0\.45, 0\.45, 1\.35\]\[slot\]/, '逐槽鏡頭必須瞄準實際 tray x 座標');
  assert.match(director, /lookZ:\s*0\.55/, '逐槽鏡頭必須瞄準托盤前的錢柱，而非拍品後方');
  assert.match(index, /ys:reveal-result/, '3D 結算需使用不會重設鏡頭的專用事件');
  assert.match(renderer, /ys:reveal-result/, 'renderer 必須接收專用結算事件');
  assert.match(ribbon, /left:50%/, '演出結束後的比價卡應回到中央供玩家閱讀');
  assert.match(ribbon, /translateX\(-50%\)/, '中央比價卡需以自身寬度精準置中');
  assert.match(ribbon, /width:min\(430px,54vw\)/, '中央資訊卡應足夠寬，讓三家以上比價不用擠成窄欄');
  assert.doesNotMatch(ribbon, /overflow:auto/, '資訊卡是玩家確認後才關閉，不得以內部捲軸裁掉結果');
});

test('逐槽微距必須把攝影機錨到錢柱，且落標錢要有收回動作', () => {
  assert.match(director, /anchorX:\s*\[-1\.35, -0\.45, 0\.45, 1\.35\]\[slot\]/,
    '微距不能只轉頭看槽位，攝影機座標也必須錨到該槽');
  assert.match(director, /camera\.position\.set\(curAnchorX \+ Math\.sin\(yaw\)/,
    '鏡頭位置必須以槽位錨點計算，不能仍以桌心計算');
  assert.match(props, /returnDelay/,
    '落標錢柱需要先保留短暫比較，再進入收回時間軸');
  assert.match(props, /returnTo/,
    '落標錢柱必須有明確回到原席位的終點，而非只降彩度');
});

test('揭盅卡不被通用燈籠動畫偏移，側欄與令牌在遠景都保持可讀', () => {
  const ribbon = index.slice(index.indexOf('.revealRibbon{'), index.indexOf('.bidfly{', index.indexOf('.revealRibbon{')));
  assert.match(index, /@keyframes ribbon-lantern-reveal/, '置中的結果卡必須用保留 translateX 的專屬動畫');
  assert.match(index, /translateX\(-50%\) translateY\(10px\) scale\(\.96\)/, '結果卡入場第一幀不得遺失水平置中');
  assert.match(index, /\.revealRibbon\.anim-lantern-reveal\{animation:ribbon-lantern-reveal/, '結果卡不得沿用會覆寫 transform 的通用動畫');
  assert.match(ribbon, /z-index:30/, '結果卡必須高於兩側拍品欄');
  assert.match(index, /#table\.t3d \.rail \.mcard\{min-height:88px;height:auto;flex:0 0 auto/, '受惠卡應依內容包住文字，不可被側欄撐成大片空白');
  assert.match(index, /\.moonCue\{[^}]*font-size:8\.5px[^}]*padding:0 3px/, '受惠徽章必須縮緊以保住底部部隊列');
  assert.match(props, /PITCH:\s*0\.70/, '盯牌必須以可見的仰立角度呈現');
  assert.match(props, /W:\s*0\.150,\s*H:\s*0\.190/, '盯牌遠景牌面必須放大到能讀出輪廓與刻字');
  assert.match(props, /STAND_LIFT:\s*0\.130/, '放大後的仰立牌必須完整抬離桌面');
  assert.match(props, /STAND_LIFT/, '仰立令牌必須抬離桌面，避免只剩穿模細線');
  assert.match(props, /const e = 0\.018/, '盯字凸起高度必須升級為遠景可讀');
  assert.match(props, /jade: 0x1a1215/, '令牌本體必須與紅布拉開明度對比');
  assert.match(theme, /\.anim-lantern-reveal/, '通用燈籠動畫仍供其他元素使用，不可全域破壞');
});

test('局末只留一個進入完整回顧的入口，策略建議不以心願硬優先', () => {
  const endStart = index.indexOf('function endGame()');
  const end = index.slice(endStart, index.indexOf('function replayExperiment', endStart));
  assert.equal((end.match(/onclick="showReview\(\)"/g) || []).length, 1, '局末不可有兩個相同回顧按鈕');
  const exp = index.slice(index.indexOf('function replayExperiment'), index.indexOf('function showReview'));
  assert.match(exp, /experimentScores/, '下一局實驗需根據多個缺口排序');
  assert.doesNotMatch(exp, /if\(failed\) return/, '心願不得永遠搶走建議優先權');
});

// 妖市 3D 環境層 — 法寶鑑賞頁丙案「燒符揭幕＋照妖鏡」的螢幕空間疊層（v0.59.2）
//
// 凍結：docs/experiments/2026-09-28-acceptance-appraise-panels.md（#1、#4、#8、#11 與文末修訂）。
// 使用者 09-28 看過示意甲（供桌開光的燒符）與乙（照妖鏡）後裁「合在一起」。
//
// ★為什麼整片疊層是「一張全螢幕四邊形、一支 shader」★（示意代理自己點出的三個風險，正式版的解法）：
//   1. 示意乙的鏡子放在 3D 場景裡，下半圈會被法寶腳下、離鏡頭更近的桌面擋掉，只好「整個場景多畫一趟」
//      （draw +25～31，違反凍結 #8「鑑賞態每 rAF draw 不多於牌桌態」）。這裡改成：
//      第一趟照常畫世界（焦點法寶與其餘拍品都不在第一趟的圖層裡）→ 本檔這一張四邊形（壓暗＋鏡子＋符紙）
//      → 清深度 → 只畫焦點法寶那一個圖層。世界不重畫，法寶只畫一次；疊層本身固定 1 次 draw（火星另 1 次，
//      只在燒符那 0.6 秒畫）。
//   2. 示意甲的燒符是逐像素 CPU 重畫 ImageData（每幀幾十萬次 JS 迴圈），換成這支 shader 的溶解門檻：
//      CPU 每幀只寫十幾個 uniform。
//   3. 示意甲多加一盞 SpotLight，會讓所有受光材質的 shader 重編（卡一下）。本檔**不加任何燈**：
//      疊層全是 unlit ShaderMaterial，法寶那一趟沿用場景原本的燈（只多開一個圖層位元，燈數不變 ⇒ 程式不重編）。
//
// 色彩：疊層的 shader 不注入 tonemapping／colorspace chunk，輸出的就是 sRGB 位元組本身
// （畫布沒有 render target，畫進去的值就是螢幕看到的值）。所以鏡緣那條系色線寫 `--sys-*` 的 hex，
// 螢幕上量到的就是那個 hex——凍結 #11(b)「鏡緣發光色與系別色 ΔE ≤ 15」量的是像素，不是參數。
//
// 本檔純視覺：不讀寫遊戲狀態、不耗亂數（貼圖雜訊用固定種子的 LCG）。
import * as THREE from 'three';

/** 丙案時間軸（ms，從點籤或切換那一刻起算）。全部【試玩必調】；凍結 #1 修訂只要求 1.3 秒內穩定、
 *  #11(a) 要求前 0.9 秒內有一幀符紙蓋住法寶框中心、燒完之前法寶不可見。 */
export const APPR_FX = {
  PAPER_IN: 150,     // 符紙由上往下展開
  BURN0: 200,        // 開始燒
  BURN_MS: 600,      // 燒完（BURN0+BURN_MS＝法寶現身）
  FLASH_MS: 260,     // 燒完那一刻的金光
  MIRROR0: 720,      // 照妖鏡開始浮現
  MIRROR_MS: 340,    // 浮現長度
  STABLE: 1060,      // 揭幕結束＝穩定鑑賞態（MIRROR0+MIRROR_MS）
  DIM_MS: 220,       // 背景壓暗淡入
  DIM: 0.97,         // 鏡外壓暗強度（凍結 #1(b) ≤70% 的量法排除焦點框與題字欄，鏡子本身算在「非焦點」裡）
  FACE: 0.88,        // 鏡面（內圈）半徑／鏡子外半徑。凍結 #11(b) 的「鏡子內圈」就是這一圈。09-29 由 0.92 放寬八卦環（#11(f)）；
                     // 09-30 再由 0.90 讓出 0.02 給粗金框（#11(h)）。鏡子外半徑不變（使用者：鏡子不要變小）；法寶大小跟內圈走，
                     // 寬體件由 table-tray 的 MIN_H（0.37）再推近補償、推到碰內圈為止。試過 0.86：揭幕中跳過的白虎煞框高 0.347＜#1(a) 35%
  BAGUA_OUT: 0.94,   // 八卦環外緣
  FRAME0: 0.945,     // 粗金框內緣（BAGUA_OUT～FRAME0 一道暗縫，框與八卦環分得開）
  BEAD: 0.965,       // 連珠圈半徑：金框中段一道凹槽，珠子嵌在槽裡（亮珠配暗槽，像素上一顆顆分得出來）
  BEAD_R: 0.0065,    // 珠子半徑（倍數）
  BEADS: 96,         // 連珠顆數
  LINE0: 0.985,      // 系色光線內緣（金框外緣）
  LINE1: 0.998,      // 系色光線外緣（外面接一圈柔光，不再是純色）
  SHEEN: 0.21,       // 鏡面斜向反光強度（sRGB 加色；凍結 #11(h) 對示意 b-west.png 的斜向反光帶）
  BAGUA_SPIN: 0.14,  // 八卦環穩定後的慢轉（rad/s）
  HALO_R: 1.35,      // 鏡緣光暈外半徑（倍數；超過這一圈光暈＝0）。凍結 #1(b) 修訂量測區排除到這一圈，產品在 fx().mirror.halo 回報
};

const TRI = [[1, 1, 1], [0, 0, 0], [0, 0, 1], [1, 1, 0], [0, 1, 0], [1, 0, 1], [1, 0, 0], [0, 1, 1]]; // 乾坤震巽坎離艮兌（1＝陽爻）
const TRI_ORDER = [0, 7, 5, 2, 1, 6, 4, 3]; // 先天八卦由上順時針

function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296); }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; // 取樣值原樣輸出（見檔頭「色彩」）
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4;
  return t;
}

/* 鏡身：青銅外緣、連珠紋、銅綠斑、拋光鏡面（同心刮痕）。半徑 1＝貼圖邊。 */
function drawBody(x, S) {
  const c = S / 2, R = c, F = APPR_FX.FACE;
  x.clearRect(0, 0, S, S);
  /* 09-29 使用者：鏡子要跟示意乙一樣亮（凍結 #11(f)）；09-30「示意乙的鏡子反光很棒」（#11(h)）：
     八卦環外面是一圈粗金框——青銅底、內外兩道暗邊（立體的框緣），中間一圈連珠，跟 mock-b.js 外緣連珠同一個做法。
     色標位置 t＝(r/R − (F−0.02)) / (1 − (F−0.02))。 */
  const t = (q) => Math.min(1, Math.max(0, (q - (F - 0.02)) / (1 - (F - 0.02))));
  const A = APPR_FX, bw = A.BEAD_R * 1.4; // 凹槽半寬
  let g = x.createRadialGradient(c, c, R * (F - 0.02), c, c, R);
  g.addColorStop(0, '#3a2c14'); g.addColorStop(t(A.BAGUA_OUT), '#2a1d0a'); g.addColorStop(t(A.FRAME0), '#5b431c');
  // 金框＝圓潤的一圈（內外兩道亮稜夾一道凹槽）：亮稜用 mock-b.js 外緣的亮金色標
  g.addColorStop(t(A.FRAME0 + 0.006), '#f0d48a'); g.addColorStop(t(A.BEAD - bw - 0.004), '#fff0bc');
  g.addColorStop(t(A.BEAD - bw), '#a07c3c'); g.addColorStop(t(A.BEAD + bw), '#a07c3c');
  g.addColorStop(t(A.BEAD + bw + 0.004), '#fff0bc'); g.addColorStop(t(A.LINE0 - 0.008), '#e6c778');
  g.addColorStop(t(A.LINE0), '#6a4e20'); g.addColorStop(1, '#6a4e20');
  x.fillStyle = g; x.beginPath(); x.arc(c, c, R - 1, 0, Math.PI * 2); x.fill();
  const r = lcg(11);
  for (let k = 0; k < 90; k++) {
    const a = r() * Math.PI * 2, rr = R * (F + 0.02 + r() * (1 - F - 0.05));
    x.fillStyle = `rgba(70,120,95,${0.06 + r() * 0.12})`; x.beginPath(); x.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, 1 + r() * 3, 0, Math.PI * 2); x.fill();
  }
  // 連珠紋：金框正中一圈；每顆亮金珠左上點一個高光（珠子要讀得出是「一顆顆」，不是一條金線）
  const beadR = R * A.BEAD, bead = Math.max(1.5, R * A.BEAD_R);
  for (let k = 0; k < A.BEADS; k++) {
    const a = (k / A.BEADS) * Math.PI * 2, bx = c + Math.cos(a) * beadR, by = c + Math.sin(a) * beadR;
    const bg = x.createRadialGradient(bx - bead * 0.35, by - bead * 0.35, 0, bx, by, bead);
    bg.addColorStop(0, '#fff6d2'); bg.addColorStop(0.6, '#f4d88a'); bg.addColorStop(1, '#c09448');
    x.fillStyle = bg; x.beginPath(); x.arc(bx, by, bead, 0, Math.PI * 2); x.fill();
  }
  // 鏡面：拋光青銅（左上略亮，比 09-29 版亮一階——示意乙的鏡面看得出是一面銅鏡，不是一個黑洞），法寶就站在這一圈前面
  g = x.createRadialGradient(c * 0.82, c * 0.76, 0, c, c, R * F);
  g.addColorStop(0, '#2a2416'); g.addColorStop(0.5, '#15110a'); g.addColorStop(1, '#060403');
  x.fillStyle = g; x.beginPath(); x.arc(c, c, R * F, 0, Math.PI * 2); x.fill();
  for (let k = 0; k < 36; k++) { x.strokeStyle = `rgba(210,188,138,${0.012 + r() * 0.022})`; x.lineWidth = 1; x.beginPath(); x.arc(c, c, R * F * (0.12 + r() * 0.86), r() * 6.28, r() * 6.28 + 0.8 + r() * 2); x.stroke(); }
  g = x.createRadialGradient(c, c, R * F * 0.62, c, c, R * F);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  x.fillStyle = g; x.beginPath(); x.arc(c, c, R * F, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#d8b868'; x.lineWidth = Math.max(2, S * 0.004); x.beginPath(); x.arc(c, c, R * F, 0, Math.PI * 2); x.stroke();
}
/* 八卦環（會慢轉）：只畫 FACE～BAGUA_OUT 這一圈，其餘透明。環很窄（鏡面要讓給法寶），只刻卦爻不寫卦名。 */
function drawBagua(x, S) {
  const c = S / 2, R = c, r0 = R * APPR_FX.FACE, r1 = R * APPR_FX.BAGUA_OUT;
  x.clearRect(0, 0, S, S);
  x.fillStyle = 'rgba(24,16,7,0.97)'; x.beginPath(); x.arc(c, c, r1, 0, Math.PI * 2); x.arc(c, c, r0, 0, Math.PI * 2, true); x.fill();
  x.strokeStyle = '#d8b868'; x.lineWidth = Math.max(2, S * 0.004);
  x.beginPath(); x.arc(c, c, r1 - x.lineWidth / 2, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(c, c, r0 + x.lineWidth / 2, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#fff3cc';
  const mid = (r0 + r1) / 2, band = r1 - r0;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2, t = TRI[TRI_ORDER[k]];
    x.save(); x.translate(c + Math.cos(a) * mid, c + Math.sin(a) * mid); x.rotate(a + Math.PI / 2);
    const L = band * 1.6, h = band * 0.28, gap = band * 0.32;
    for (let y = 0; y < 3; y++) {
      const yy = (y - 1) * gap;
      if (t[y]) x.fillRect(-L / 2, yy - h / 2, L, h);
      else { x.fillRect(-L / 2, yy - h / 2, L * 0.42, h); x.fillRect(L * 0.08, yy - h / 2, L * 0.42, h); }
    }
    x.restore();
    const a2 = a + Math.PI / 8;
    x.beginPath(); x.arc(c + Math.cos(a2) * mid, c + Math.sin(a2) * mid, band * 0.16, 0, Math.PI * 2); x.fill();
  }
}
/* 符紙：黃表紙、硃砂雙框、敕令＋妖市開光＋急急如律令。溶解門檻在 shader，這裡只畫紙本身。 */
function drawPaper(x, w, h, font) {
  const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#e8c660'); gr.addColorStop(1, '#cf9f37');
  x.fillStyle = gr; x.fillRect(0, 0, w, h);
  const r = lcg(7);
  for (let k = 0; k < 320; k++) { x.fillStyle = `rgba(${k % 2 ? '120,80,20' : '255,240,190'},${0.04 + r() * 0.06})`; x.fillRect(r() * w, r() * h, 1 + r() * 2, 5 + r() * 9); }
  x.strokeStyle = '#a8231a'; x.lineWidth = w * 0.02; x.strokeRect(w * 0.05, w * 0.05, w * 0.9, h - w * 0.1);
  x.lineWidth = w * 0.008; x.strokeRect(w * 0.09, w * 0.09, w * 0.82, h - w * 0.18);
  x.fillStyle = '#a8231a'; x.textAlign = 'center'; x.textBaseline = 'top';
  x.font = `bold ${Math.round(w * 0.2)}px ${font}`; x.fillText('敕令', w / 2, w * 0.14);
  const big = Math.round(Math.min(w * 0.34, (h - w * 0.6) / 4.7));
  x.font = `bold ${big}px ${font}`;
  ['妖', '市', '開', '光'].forEach((ch, k) => x.fillText(ch, w * 0.56, w * 0.42 + k * big * 1.05));
  x.font = `${Math.round(w * 0.1)}px ${font}`;
  ['急', '急', '如', '律', '令'].forEach((ch, k) => x.fillText(ch, w * 0.22, h * 0.34 + k * w * 0.115));
  // 硃砂符腳：一筆拖長的曲線
  x.strokeStyle = 'rgba(168,35,26,0.85)'; x.lineWidth = w * 0.03; x.lineCap = 'round';
  x.beginPath(); x.moveTo(w * 0.56, h * 0.84); x.bezierCurveTo(w * 0.3, h * 0.88, w * 0.8, h * 0.92, w * 0.5, h * 0.96); x.stroke();
}

const VERT = /* glsl */`void main(){ gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`;
/* 疊層 shader：輸出預乘 alpha（混合 ONE, ONE_MINUS_SRC_ALPHA），由下往上：壓暗 → 鏡子 → 符紙 → 火光／金光（加色）。 */
const FRAG = /* glsl */`
uniform vec2 uView;      // CSS px
uniform float uDpr;
uniform float uTime;
uniform float uDim;      // 0..1
uniform vec3 uMir;       // 鏡心 x, y（CSS px，y 向下）、外半徑
uniform float uMirA;     // 鏡子不透明度
uniform float uMirS;     // 鏡子浮現縮放
uniform float uBag;      // 八卦環旋轉角
uniform vec3 uGlow;      // 系色（sRGB 0..1）
uniform vec4 uPaper;     // 符紙中心 x, y、寬、高（CSS px）
uniform float uPaperA;   // 符紙展開 0..1
uniform float uBurn;     // 燒掉的比例 0..1
uniform float uFlash;    // 金光 0..1
uniform sampler2D tBody;
uniform sampler2D tBag;
uniform sampler2D tPaper;
const float FACE = ${APPR_FX.FACE.toFixed(3)};
const float BAG1 = ${APPR_FX.BAGUA_OUT.toFixed(3)};
const float FRAME0 = ${APPR_FX.FRAME0.toFixed(3)};
const float L0 = ${APPR_FX.LINE0.toFixed(3)};
const float L1 = ${APPR_FX.LINE1.toFixed(3)};
const float SHEEN = ${APPR_FX.SHEEN.toFixed(3)};
const float HALO = ${APPR_FX.HALO_R.toFixed(3)};
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ return vnoise(p) * 0.62 + vnoise(p * 2.3 + 7.1) * 0.28 + vnoise(p * 5.1 + 3.7) * 0.10; }
vec4 over(vec4 top, vec4 bot){ return vec4(top.rgb + bot.rgb * (1.0 - top.a), top.a + bot.a * (1.0 - top.a)); }
void main(){
  vec2 p = vec2(gl_FragCoord.x / uDpr, uView.y - gl_FragCoord.y / uDpr);
  float aa = 1.0 / max(uMir.z, 1.0);
  // ── 壓暗：鏡外近黑、四角再暗一階；燒符時中央留一點暖光 ──
  vec2 q = (p - uView * 0.5) / uView;
  float vig = smoothstep(0.25, 0.75, length(q * vec2(1.0, 1.25)));
  vec4 acc = vec4(vec3(0.010, 0.007, 0.005), 1.0) * (uDim * min(1.0, ${APPR_FX.DIM.toFixed(2)} + 0.06 * vig));
  vec3 add = vec3(0.0);
  // ── 照妖鏡 ──
  if (uMirA > 0.0) {
    float R = uMir.z * uMirS;
    vec2 d = (p - uMir.xy) / R;
    float r = length(d);
    // 取樣放在「逐像素分支」外面：有 mipmap 的貼圖在非一致分支裡取樣，隱式導數未定義（部分手機 GPU 會在鏡緣出現閃點）
    vec2 uv = d * 0.5 + 0.5; uv.y = 1.0 - uv.y;
    vec4 body = texture2D(tBody, uv);
    float cs = cos(uBag), sn = sin(uBag);
    vec2 dr = vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y);
    vec2 uvb = dr * 0.5 + 0.5; uvb.y = 1.0 - uvb.y;
    vec4 bag = texture2D(tBag, uvb);
    if (r < 1.0) {
      vec3 col = mix(body.rgb, bag.rgb, bag.a);
      // 鏡面內緣一圈系色反光（很淡，只是讓鏡子「認得」這一件）
      col += uGlow * 0.08 * smoothstep(FACE - 0.16, FACE - 0.005, r) * step(r, FACE);
      // 鏡中妖霧：系色的淡霧在鏡面裡慢慢翻湧（照妖鏡「照見」的東西），再加一道斜向的銅面反光
      if (r < FACE) {
        float mist = fbm(d * 2.4 + vec2(uTime * 0.05, -uTime * 0.08));
        col += uGlow * 0.045 * smoothstep(0.45, 0.85, mist) * (1.0 - smoothstep(FACE * 0.55, FACE, r));
        // 斜向反光（09-30，凍結 #11(h)「鏡面有反光」；仿 mock-b.js sheenTex，位置同示意：鏡心左下方）：
        // 一寬一窄兩道柔和的平行亮帶，斜著橫過鏡面，隨時間極慢地擺動；靠鏡緣淡出。
        // 法寶畫在這一趟之後，所以亮帶只在法寶後面（不另加一趟鏡前反光＝不多 draw，凍結 #8）。
        float s = dot(d, vec2(-0.766, 0.643)) / FACE + 0.02 * sin(uTime * 0.3);
        float band1 = 1.0 - smoothstep(0.0, 0.13, abs(s - 0.52));
        float band2 = 1.0 - smoothstep(0.0, 0.05, abs(s - 0.74));
        float edge = 1.0 - smoothstep(FACE * 0.84, FACE, r);
        col += vec3(1.0, 0.95, 0.84) * SHEEN * (band1 * band1 * (3.0 - 2.0 * band1) + 0.5 * band2) * edge;
      }
      // 金框泛系色光（示意乙 ringTex 的系色加亮，淡）
      col += uGlow * 0.22 * smoothstep(FACE, FRAME0, r) * (1.0 - smoothstep(L0 - 0.01, L0, r));
      // 系色光線：純色、不透明——凍結 #11(b) 在這一圈取樣
      float line = smoothstep(L0 - aa, L0, r) * (1.0 - smoothstep(L1 - aa, L1, r));
      col = mix(col, uGlow, line);
      float a = body.a * (1.0 - smoothstep(1.0 - aa, 1.0, r));
      acc = over(vec4(col * a, a) * uMirA, acc);
    }
    // 鏡緣光（加色，示意乙的系色光環）：光線外側一圈系色柔光，到 HALO_R 歸零
    float pulse = 0.85 + 0.15 * sin(uTime * 2.1);
    float halo = (1.0 - smoothstep(L1, HALO, r)); halo = halo * halo * step(L1, r) * 0.55 * pulse;
    add += uGlow * halo * uMirA;
  }
  // ── 符紙 ──
  if (uPaperA > 0.0) {
    vec2 lp = (p - uPaper.xy) / uPaper.zw + 0.5;            // 0..1，y 向下
    vec2 ex = abs(lp - 0.5);
    float n = fbm(lp * vec2(5.0, 9.0));
    float v = (1.0 - lp.y) * 0.80 + n * 0.30 - 0.05;        // 由下往上燒
    float e = v - uBurn;                                    // >0 未燒、<0 已燒
    float frontY = uPaper.y + uPaper.w * (0.5 - clamp(uBurn * 1.05, 0.0, 1.0));
    vec4 t = texture2D(tPaper, vec2(lp.x, 1.0 - lp.y)); // 同上：分支外取樣
    if (ex.x < 0.5 && ex.y < 0.5 && lp.y < uPaperA) {
      if (e >= 0.0) {
        vec3 c = t.rgb;
        if (uBurn > 0.0) {
          c = e < 0.10 ? c * mix(0.18, 1.0, smoothstep(0.03, 0.10, e)) : c; // 焦邊
          c = e < 0.03 ? mix(vec3(1.0, 0.93, 0.62), vec3(1.0, 0.55, 0.16), e / 0.03) : c; // 火線
        }
        acc = over(vec4(c, 1.0), acc);
      }
    }
    if (uBurn > 0.0 && uBurn < 1.0) {
      // 火舌：燒線以上一小段往上舔（加色）
      float fl = (1.0 - smoothstep(0.0, 0.16, e)) * step(0.0, e) * step(ex.x, 0.5) * step(ex.y, 0.5);
      float lick = vnoise(vec2(lp.x * 9.0, lp.y * 4.0 + uTime * 5.5));
      add += vec3(1.0, 0.55, 0.14) * fl * (0.55 + 0.9 * lick);
      // 火光：以燒線中點為心的暖色光暈（凍結 #11(a)「燒符區平均亮度高於燒符前」）
      float dd = length((p - vec2(uPaper.x, frontY)) / (uPaper.z * vec2(1.6, 1.1)));
      add += vec3(1.0, 0.62, 0.22) * exp(-dd * dd * 1.4) * (0.42 + 0.3 * uBurn);
      // 火盆光：以符紙中心為心、隨燒的進度變強的一團柔光（紙越燒越少，畫面中央不能跟著暗下去——凍結 #11(a)
      // 整段燒符期間都要有火光）。刻意做成圓的柔光、不是紙形的色塊（紙形會讀成一塊發光的長方形）。
      float dc = length((p - uPaper.xy) / (uPaper.zw * vec2(1.25, 0.62)));
      add += vec3(1.0, 0.5, 0.16) * exp(-dc * dc * 1.1) * (0.18 + 0.5 * uBurn);
      // 燒線下方一小段的餘燼火星（fbm 取亮點，隨時間往上飄）
      float ash = step(e, 0.0) * (1.0 - smoothstep(0.0, 0.14, -e)) * step(ex.x, 0.5) * step(ex.y, 0.5);
      add += vec3(1.0, 0.45, 0.1) * ash * smoothstep(0.55, 0.8, fbm(lp * vec2(22.0, 30.0) + vec2(0.0, uTime * 2.3))) * 0.9;
    }
  }
  if (uFlash > 0.0) {
    float dd = length(p - uMir.xy) / max(uMir.z, 1.0);
    add += vec3(1.0, 0.9, 0.66) * uFlash * exp(-dd * dd * 1.8) * 0.9;
  }
  gl_FragColor = vec4(acc.rgb + add, acc.a);
}`;

/* 火星：燒線上冒出、往上飄的小點（只在燒的那 0.6 秒畫，1 次 draw）。 */
const EMBER_VERT = /* glsl */`
uniform vec2 uView; uniform float uDpr; uniform float uTime; uniform vec4 uPaper; uniform float uBurn;
attribute float aSeed;
varying float vA;
void main(){
  float life = fract(uTime * 0.9 + aSeed * 7.13);
  float fx = fract(aSeed * 13.7);
  float frontY = uPaper.y + uPaper.w * (0.5 - clamp(uBurn * 1.05, 0.0, 1.0));
  vec2 p = vec2(uPaper.x + (fx - 0.5) * uPaper.z * 1.1 + sin(life * 9.0 + aSeed * 40.0) * 6.0,
                frontY - life * uPaper.w * 0.55);
  vA = (1.0 - life) * smoothstep(0.0, 0.08, life);
  gl_PointSize = (1.5 + fract(aSeed * 5.3) * 2.5) * uDpr;
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
}`;
const EMBER_FRAG = /* glsl */`
varying float vA;
void main(){ float r = length(gl_PointCoord - 0.5); float a = vA * (1.0 - smoothstep(0.2, 0.5, r));
  gl_FragColor = vec4(vec3(1.0, 0.72, 0.3) * a, 0.0); }`;

export function createAppraiseFx() {
  const font = `"LXGW WenKai TC", "Songti TC", serif`;
  const BODY = 1024, PW = 200, PH = 476; // 鏡身貼圖 1024（09-30：V5 鏡子外半徑 360px，512 的連珠會糊）
  const texBody = canvasTex(BODY, BODY, (x, w) => drawBody(x, w));
  const texBag = canvasTex(BODY, BODY, (x, w) => drawBagua(x, w));
  const texPaper = canvasTex(PW, PH, (x, w, h) => drawPaper(x, w, h, font));
  /* 字型在開頁時可能還沒載完：載完再重畫一次符紙（只畫一次，不在鑑賞中每幀畫）。 */
  if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
    document.fonts.load(`bold 32px "LXGW WenKai TC"`, '敕令妖市開光急如律').then(() => {
      drawPaper(texPaper.image.getContext('2d'), PW, PH, font); texPaper.needsUpdate = true;
    }, () => {});
  }
  const U = {
    uView: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uTime: { value: 0 },
    uDim: { value: 0 }, uMir: { value: new THREE.Vector3(0, 0, 100) }, uMirA: { value: 0 }, uMirS: { value: 1 },
    uBag: { value: 0 }, uGlow: { value: new THREE.Color(1, 1, 1) },
    uPaper: { value: new THREE.Vector4(0, 0, 60, 140) }, uPaperA: { value: 0 }, uBurn: { value: 0 }, uFlash: { value: 0 },
    tBody: { value: texBody }, tBag: { value: texBag }, tPaper: { value: texPaper },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: VERT, fragmentShader: FRAG,
    depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const NE = 56, seeds = new Float32Array(NE);
  { const r = lcg(23); for (let k = 0; k < NE; k++) seeds[k] = r(); }
  const eg = new THREE.BufferGeometry();
  eg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NE * 3), 3));
  eg.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const emat = new THREE.ShaderMaterial({
    uniforms: { uView: U.uView, uDpr: U.uDpr, uTime: U.uTime, uPaper: U.uPaper, uBurn: U.uBurn },
    vertexShader: EMBER_VERT, fragmentShader: EMBER_FRAG,
    depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const embers = new THREE.Points(eg, emat); embers.frustumCulled = false;
  const emberScene = new THREE.Scene(); emberScene.add(embers);

  return {
    U, scene, emberScene, cam,
    /** 開頁預先編譯兩支 shader（凍結 #8 以外的體感：第一次點籤不卡） */
    warm(renderer) { try { renderer.compile(scene, cam); renderer.compile(emberScene, cam); } catch (e) { /* 軟體 GL 編不過就算了，第一次點籤時再編 */ } },
    dispose() { quad.geometry.dispose(); mat.dispose(); eg.dispose(); emat.dispose(); texBody.dispose(); texBag.dispose(); texPaper.dispose(); },
  };
}

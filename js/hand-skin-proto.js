// 妖市 3D 環境層 — 席位之手「皮膚寫實度往上提一級」原型（skin-proto，不是產品；給使用者看圖挑方向）。
// 只在網址 ?skin=a|b|c 時由 table-hands.js 載入；不帶參數＝不載入本檔，畫面與 v0.61.1 相同。
// 只動皮膚 shader／材質層：不改手的 mesh、骨架、hand_r.glb（幾何仍是 hand-realism／hand-b1 建的那一份；
// 孝女白琴／閭山法師／普渡爐主三種新皮膚只是換 aSkin 屬性值＝材質選參數，頂點位置、索引不動）。
// 不新增貼圖：全部 fragment 程式生成（rest 空間座標，同 hand-realism）。
//   A 皮膚質感派：毛孔、菱形細紋網、指節橫紋褶、皮脂高光（粗糙度變化）、血色／脂黃色相分佈、汗毛。
//   B 血管肌腱派：手背靜脈網（走向照解剖：掌背靜脈弓＋頭靜脈／貴要靜脈）、伸肌肌腱、骨突（掌指關節頭、尺骨莖突）、
//      皮下青紫透色、指根→手腕膚色漸層、老人斑改「不規則小斑＋軟邊」（青面攤主改小塊青黑斑＋暈邊）。
//   C 光影次表面派：包覆漫射（紅色通道包得更深）＋薄處透射（指緣、指尖）、指縫遮蔽、離桌面近的下側遮蔽＋桌面紅反光、
//      手在桌上的接觸陰影（每手一片程式漸層 decal，不開陰影貼圖）、邊緣光、假環境反射。
//   三方向共用：獵人疤改成「不規則寬窄＋隆起癒合組織＋兩側縫針孔＋周邊色素」，高光壓低；三個共用預設皮膚的角色各給參數。
import * as THREE from 'three';

const V = new URL(import.meta.url).search;
const HR = await import('./hand-realism.js' + V);
const B1 = await import('./hand-b1.js' + V);

export const DIRS = ['a', 'b', 'c'];
/** 原本共用 REAL.DEFAULT 的三個角色：各給一組皮膚參數（材質陣列序 11..13 → aSkin 9..11）。 */
export const EXTRA_KEYS = ['xiaonv', 'lvshan', 'luzhu'];
export const EXTRA_REAL = {
  /* 孝女白琴：年輕、冷白、細緻——幾乎無斑、細紋淺、血管只透青不隆起 */
  xiaonv: { skin: [0.330, 0.270, 0.255], warm: [0.400, 0.215, 0.230], nail: [0.55, 0.46, 0.45], rough: 0.55,
    age: [0.08, 0.0, 0.25, 0.05], marks: [0, 0, 0, 0], sss: [0.24, 0.08, 0.10] },
  /* 閭山法師：乾淨結實、膚色中性——肌腱清楚、輕微繭 */
  lvshan: { skin: [0.270, 0.185, 0.130], warm: [0.350, 0.165, 0.110], nail: [0.46, 0.39, 0.30], rough: 0.64,
    age: [0.35, 0.05, 0.35, 0.25], marks: [0.2, 0, 0, 0], sss: [0.20, 0.07, 0.04] },
  /* 普渡爐主：圓厚、暖色、油亮——肌腱血管被肉蓋住、皮脂多、少量斑 */
  luzhu: { skin: [0.330, 0.180, 0.100], warm: [0.460, 0.160, 0.080], nail: [0.50, 0.40, 0.30], rough: 0.56,
    age: [0.30, 0.30, 0.05, 0.25], marks: [0, 0, 0, 0], sss: [0.28, 0.08, 0.035] },
};
export const KINDS11 = [...B1.KINDS8, ...EXTRA_KEYS];
/** 每種手的原型參數 P＝[汗毛, 皮脂, 毛孔, 日曬漸層]、Q＝[靜脈隆起, 靜脈透色, 肌腱, 細紋網]（全部【試玩必調】）。 */
const PQ = {
  default: [[0.30, 0.50, 0.80, 0.50], [0.40, 0.50, 0.50, 0.50]],
  shoujing: [[0.15, 0.20, 0.90, 0.60], [1.00, 0.80, 1.00, 1.00]],
  hunter: [[0.80, 0.60, 1.00, 0.90], [0.60, 0.40, 0.80, 0.60]],
  dangpu: [[0.05, 0.30, 0.60, 0.00], [0.70, 1.00, 0.60, 0.30]],
  qingmian: [[0.20, 0.40, 0.90, 0.00], [0.60, 0.40, 0.70, 0.80]],
  hongyi: [[0.05, 0.10, 0.80, 0.00], [1.00, 0.90, 1.00, 1.00]],
  duanshou: [[0.10, 0.30, 0.60, 0.00], [0.50, 0.80, 0.60, 0.30]],
  zutou: [[0.90, 0.90, 1.00, 1.00], [0.40, 0.30, 0.40, 0.50]],
  xiaonv: [[0.00, 0.35, 0.50, 0.10], [0.10, 0.90, 0.20, 0.10]],
  lvshan: [[0.50, 0.40, 0.80, 0.40], [0.50, 0.40, 0.90, 0.40]],
  luzhu: [[0.40, 0.85, 0.90, 0.70], [0.20, 0.20, 0.15, 0.50]],
};
const kd11 = (i) => {
  const k = KINDS11[i];
  if (i === 0) return HR.REAL.DEFAULT;
  if (HR.REAL.ROLES[k]) return HR.REAL.ROLES[k];
  if (B1.B1_REAL[k]) return B1.B1_REAL[k];
  return EXTRA_REAL[k];
};
/** 角色 → 新皮膚的 aSkin 值（不是三角色之一＝-1）。 */
export function extraSkin(role) { const i = EXTRA_KEYS.indexOf(role); return i < 0 ? -1 : B1.KINDS8.length + i + 1; }

/** 換 aSkin 的幾何：與原幾何共用 position／skin／index 等屬性物件（頂點、索引一個不改），只換 aSkin。 */
export function retag(geo, skinValue) {
  const g = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(geo.attributes)) g.setAttribute(name, a);
  const src = geo.attributes.aSkin.array, sk = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) sk[i] = src[i] > 0.5 ? skinValue : 0;
  g.setAttribute('aSkin', new THREE.BufferAttribute(sk, 1));
  g.setIndex(geo.index);
  g.userData = Object.assign({}, geo.userData, { skinProto: skinValue });
  return g;
}

const N = KINDS11.length;
const PICK = (t, name) => `${t} ${name}(${t} a[${N}], int k){ ${Array.from({ length: N - 1 }, (_, i) => `if (k == ${i + 1}) return a[${i + 1}];`).join(' ')} return a[0]; }`;
const sw = (src, from, to) => { if (!src.includes(from)) throw new Error('hand-skin-proto: shader 片段找不到 ' + from.slice(0, 50)); return src.replace(from, to); };

/* ═══ 共用 GLSL：雜湊、2D 細胞雜訊 ═══ */
const PARS = /* glsl */`
uniform vec4 uProtoPA[${N}]; uniform vec4 uProtoQA[${N}]; uniform float uTableY; uniform float uDm;
varying vec3 vHrW; varying vec3 vHrWN;
float hrPH = 0.0, hrPR = 0.0, hrThin = 0.0, hrAO = 1.0, hrBounce = 0.0; vec3 hrN = vec3(0.0, 0.0, 1.0), hrNg = vec3(0.0, 0.0, 1.0);
vec2 hrH2(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hrCell2(vec2 x){ vec2 i = floor(x), f = fract(x); float d1 = 8.0; vec2 id = vec2(0.0);
  for (int yy = -1; yy <= 1; yy++) for (int xx = -1; xx <= 1; xx++) { vec2 o = vec2(float(xx), float(yy)); vec2 h = hrH2(i + o); vec2 r = o + h - f; float d = dot(r, r); if (d < d1) { d1 = d; id = h; } }
  return vec3(sqrt(d1), id); }
float hrLOD(float period, float px){ return 1.0 - smoothstep(period * 0.25, period * 0.8, px); }
`;

/* ═══ 共用：獵人疤（取代原本的整齊亮帶）——寬窄不一的蜿蜒疤、隆起癒合組織、兩側縫針孔、周邊色素沉著 ═══ */
const SCAR_OLD_START = '    /* 疤（獵人）：手背斜疤＋一道舊擦痕 */';
const SCAR_OLD_END = '    /* 老人斑 */';
const SCAR_NEW = /* glsl */`    /* skin-proto 疤：沿疤長 s（0..1）蜿蜒、寬窄不一、兩端收細；中心隆起、邊緣微凹、兩側一排縫針孔 */
    float scar = 0.0, scarRim = 0.0, scarH = 0.0, stitchM = 0.0, scarFib = 0.0;
    if (uMarks.y > 0.0 && dors > 0.2) {
      vec2 sA = uScar.xy, sB = uScar.zw, sab = sB - sA; float sL = length(sab); vec2 st2 = sab / sL, sn2 = vec2(-st2.y, st2.x);
      float s = dot(p.xz - sA, st2) / sL, off = dot(p.xz - sA, sn2);
      float wob = (hrNoise(vec3(s * 7.0, 1.7, 0.3)) - 0.5) * 0.030 + (hrNoise(vec3(s * 29.0, 4.1, 0.7)) - 0.5) * 0.008;
      float dd = abs(off - wob);
      if (dd < 0.07 && s > -0.1 && s < 1.1) {
        float ends = smoothstep(0.0, 0.14, s) * (1.0 - smoothstep(0.84, 1.0, s));
        float wdt = (0.007 + 0.010 * hrNoise(vec3(s * 11.0, 8.0, 0.0))) * (0.35 + 0.65 * ends);
        float msk = smoothstep(0.2, 0.6, dors) * uMarks.y;
        float core = 1.0 - smoothstep(wdt * 0.45, wdt, dd + (hrNoise(p * 220.0) - 0.5) * 0.003);
        float marg = (1.0 - smoothstep(wdt, wdt * 3.2, dd)) * smoothstep(-0.06, 0.06, s) * (1.0 - smoothstep(0.94, 1.06, s));
        float sk = s * sL / 0.05 + 0.25, sid = floor(sk) + (off - wob > 0.0 ? 0.5 : 0.0), sp = fract(sk) + (hrHash(vec3(sid, 3.0, 1.0)) - 0.5) * 0.35;
        float ps = (sp - 0.5) * 0.05, rs = abs(abs(off - wob) - (wdt + 0.010 + 0.006 * hrHash(vec3(sid, 7.0, 2.0))));
        stitchM = (1.0 - smoothstep(0.0018, 0.0048, length(vec2(ps, rs)))) * step(0.3, hrHash(vec3(sid, 1.0, 5.0))) * ends * msk;
        scarFib = hrNoise(vec3(s * 70.0, off * 300.0, 2.0));
        scar = core * ends * msk; scarRim = max(marg - core * ends, 0.0) * msk;
        scarH = scar * (0.0010 + 0.0007 * scarFib) - scarRim * 0.00035 - stitchM * 0.0007;
      }
    }
`;
const SCAR_COLOR_OLD = 'c = mix(c, vec3(0.55, 0.36, 0.30), scar * 0.85); c = mix(c, uWarm * 0.75, max(scarRim, 0.0) * 0.6);';
const SCAR_COLOR_NEW = `{ vec3 sc0 = mix(vec3(dot(c, vec3(0.3, 0.55, 0.15))), c, 0.55) * vec3(1.18, 1.04, 1.02) * (0.92 + 0.16 * scarFib);
      c = mix(c, sc0, scar * 0.75); c = mix(c, c * vec3(0.80, 0.66, 0.62), scarRim * 0.55); c *= 1.0 - stitchM * 0.45; }`;

/* ═══ 方向 A：皮膚質感 ═══ */
const COLOR_A = /* glsl */`
    { /* skin-proto A：毛孔／細紋網／指節褶／色相分佈／汗毛（細節依每像素 dm 數淡出，遊戲視角不閃） */
      vec4 PP = hrPickP(uProtoPA, hk), QQ = hrPickP(uProtoQA, hk);
      float px = length(fwidth(p));
      float skinOnly = (1.0 - nail) * (1.0 - scar);
      vec3 an = abs(n); vec2 uvp = an.y > max(an.x, an.z) ? p.xz : (an.x > an.z ? p.yz : p.xy);
      /* 毛孔：細胞雜訊的小凹點（間距約 0.6 mm） */
      float pore = 0.0, fP = hrLOD(0.006, px) * PP.z * skinOnly;
      if (fP > 0.01) { vec3 ce = hrCell2(uvp * 160.0); pore = (1.0 - smoothstep(0.0, 0.16 + 0.12 * ce.z, ce.x)) * step(0.3, ce.y) * fP; }
      /* 菱形細紋網（兩組斜線、被雜訊扭曲；間距約 2 mm），老的深 */
      float net = 0.0, fN = hrLOD(0.02, px) * skinOnly * (0.25 + 0.75 * QQ.w) * smoothstep(-0.2, 0.4, dors);
      if (fN > 0.01) { float wn = hrNoise(p * 30.0) * 0.9;
        float l1 = abs(fract(dot(p.xz, vec2(0.82, -0.57)) * 46.0 + wn) - 0.5) * 2.0;
        float l2 = abs(fract(dot(p.xz, vec2(0.82, 0.57)) * 51.0 + wn + 0.37) - 0.5) * 2.0;
        net = min(1.0, (1.0 - smoothstep(0.0, 0.16, l1)) * (0.6 + 0.4 * hrNoise(p * 70.0)) + (1.0 - smoothstep(0.0, 0.16, l2)) * (0.6 + 0.4 * hrNoise(p * 70.0 + 9.0))) * fN; }
      /* 指節橫紋褶：近／遠指間關節背側一組弧形褶（3–6 道），掌指關節一圈鬆皮褶 */
      float kc = 0.0, fK = hrLOD(0.012, px) * skinOnly;
      if (onFinger > 0.0 && dors > 0.0 && fK > 0.01) {
        bool pip = bs < 1.5; vec3 jp = pip ? jB : jC; vec3 dv = p - jp; float al = dot(dv, axis);
        vec3 sd = normalize(cross(axis, dorsDir)); float lat = dot(dv, sd);
        float env = exp(-pow(al / (pip ? 0.040 : 0.026), 2.0)) * smoothstep(0.1, 0.6, dors);
        float ph = (al - lat * lat * 5.0) / (pip ? 0.011 : 0.009) + hrNoise(p * 55.0) * 1.3;
        kc = (1.0 - smoothstep(0.0, 0.42, abs(fract(ph) - 0.5) * 2.0)) * env * (0.45 + 0.55 * hrNoise(p * 35.0 + 2.0)) * fK * (0.55 + 0.45 * max(uAge.x, 0.3));
      }
      float mk = 0.0;
      if (onFinger < 0.99 && dors > 0.2 && fK > 0.01) { float dk = 1e9; for (int f = 0; f < 4; f++) dk = min(dk, length(p.xz - uJ[f*4].xz - vec2(0.0, 0.01)));
        mk = (1.0 - smoothstep(0.0, 0.45, abs(fract(dk / 0.016 + hrNoise(p * 40.0)) - 0.5) * 2.0)) * exp(-pow(dk / 0.085, 2.0)) * smoothstep(0.2, 0.7, dors) * (1.0 - onFinger) * fK * (0.4 + 0.6 * uAge.x); }
      /* 色相分佈：血色斑駁（低頻）、骨突處偏黃白、指節／指尖更紅、細碎色素 */
      float hb = hrFbm(p * 15.0 + 7.7), mel = hrNoise(p * 48.0 + 2.2);
      c *= mix(vec3(1.0), vec3(1.10, 0.93, 0.92), clamp((hb - 0.45) * 1.6, -0.6, 1.0) * 0.55);
      c *= mix(vec3(1.0), vec3(1.07, 1.03, 0.90), clamp(knob * 0.6 + tendon * 0.4, 0.0, 1.0) * 0.7);
      c = mix(c, c * vec3(1.16, 0.86, 0.84), flush * 0.40);
      c *= 1.0 + (mel - 0.5) * 0.07 * hrLOD(0.03, px);
      /* 汗毛（手背與近節指背）：每格一根短弧線、朝指尖略偏尺側，深色、半透 */
      float hair = 0.0, fH = PP.x * skinOnly * smoothstep(0.3, 0.7, dors) * (1.0 - smoothstep(1.1, 1.6, bs) * onFinger) * step(0.08, p.z);
      if (fH > 0.01) { vec2 q = p.xz * 38.0 + vec2(0.0, hrNoise(p * 6.0) * 0.6); vec2 hc = floor(q), hf = fract(q); vec2 hh = hrH2(hc + 17.0);
        if (hh.x < 0.55) { vec2 ctr = 0.5 + (hh - 0.5) * 0.25; float ang = -0.35 + (hh.y - 0.5) * 0.7; vec2 dir = vec2(sin(ang), cos(ang)); vec2 r = hf - ctr;
          float a1 = dot(r, dir), la = dot(r, vec2(dir.y, -dir.x)) + a1 * a1 * 0.5;
          float wpx = clamp(0.0011 / max(px, 1e-5), 0.0, 1.0);
          hair = (1.0 - smoothstep(0.012, 0.03, abs(la))) * (1.0 - smoothstep(0.26, 0.34, abs(a1))) * wpx * fH * hrLOD(0.03, px); } }
      c = mix(c, c * vec3(0.55, 0.52, 0.52), pore * 0.35);
      c = mix(c, c * vec3(0.82, 0.76, 0.74), net * 0.22);
      c = mix(c, c * vec3(0.66, 0.58, 0.56), kc * 0.55 + mk * 0.35);
      c = mix(c, c * vec3(0.30, 0.25, 0.22), hair * 0.75);
      hrPH = -pore * 0.00022 - net * 0.00030 * (0.4 + uAge.x) - kc * 0.0011 - mk * 0.0006;
      /* 皮脂：低頻油亮區（指節、手背中央），褶內與毛孔偏乾 */
      float oil = hrFbm(p * 9.0 + 4.4);
      hrPR = -PP.y * (0.16 * smoothstep(0.35, 0.75, oil) + 0.10 * knob) + 0.10 * (kc + net * 0.5) + 0.15 * pore;
    }
`;

/* ═══ 方向 B：血管肌腱骨突 ═══ */
const VEINS = [ // (x0,z0)→(x1,z1)，rest 空間手背（dm）；w＝半徑
  [0.135, 0.78, 0.16, 0.50, 0.010], [-0.07, 0.80, -0.04, 0.52, 0.010], [-0.265, 0.72, -0.22, 0.46, 0.009],
  [0.24, 0.36, 0.16, 0.50, 0.013], [0.16, 0.50, -0.04, 0.52, 0.013], [-0.04, 0.52, -0.22, 0.46, 0.013], [-0.22, 0.46, -0.30, 0.33, 0.013],
  [0.24, 0.36, 0.24, 0.15, 0.015], [0.24, 0.15, 0.20, -0.10, 0.016], [-0.30, 0.33, -0.27, 0.12, 0.015], [-0.27, 0.12, -0.18, -0.10, 0.016],
  [-0.04, 0.52, 0.02, 0.25, 0.009], [0.02, 0.25, 0.08, -0.02, 0.009], [0.32, 0.50, 0.24, 0.36, 0.010],
];
const glf = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(+x.toFixed(4)));
const PARS_B = `const vec4 HR_VSEG[${VEINS.length}] = vec4[${VEINS.length}](${VEINS.map((s) => `vec4(${s.slice(0, 4).map(glf).join(', ')})`).join(', ')});
const float HR_VW[${VEINS.length}] = float[${VEINS.length}](${VEINS.map((s) => glf(s[4])).join(', ')});
`;
const COLOR_B = /* glsl */`
    { /* skin-proto B：靜脈網／肌腱／骨突／皮下透色／指根到手腕漸層／不規則小斑 */
      vec4 PP = hrPickP(uProtoPA, hk), QQ = hrPickP(uProtoQA, hk);
      float back = smoothstep(0.15, 0.6, dors) * (1.0 - onFinger) * (1.0 - scar);
      /* 漸層：指根（日曬、偏紅偏深）→ 手腕（白、偏黃）；手指背比手背略紅 */
      float tw = 1.0 - smoothstep(0.0, 0.85, p.z);
      c *= mix(vec3(1.0), vec3(1.07, 1.05, 1.03), tw * (0.4 + 0.6 * PP.w) * smoothstep(-0.2, 0.4, dors));
      c *= mix(vec3(1.0), vec3(0.96, 0.88, 0.85), (1.0 - tw) * PP.w * smoothstep(0.0, 0.5, dors) * (1.0 - nail));
      /* 靜脈：照解剖走向的折線網，雜訊扭動；圓拱截面＋皮下青紫暈 */
      float vr = 0.0, vh = 0.0;
      if (back > 0.01) { vec2 q = p.xz + (vec2(hrNoise(p * 9.0), hrNoise(p * 9.0 + 5.1)) - 0.5) * 0.05;
        for (int i = 0; i < ${VEINS.length}; i++) { float dv = hrSegD(q, HR_VSEG[i].xy, HR_VSEG[i].zw), w = HR_VW[i] * (0.85 + 0.3 * hrNoise(p * 20.0 + float(i)));
          vr = max(vr, exp(-pow(dv / (w * 1.5), 2.0))); vh = max(vh, exp(-pow(dv / (w * 3.2), 2.0))); }
        float dive = 0.25 + 0.75 * smoothstep(0.30, 0.65, hrNoise(p * 7.0 + 2.0)); vr *= back * dive * (0.35 + 0.65 * smoothstep(-0.1, 0.4, p.z + 0.1)); vh *= back * (0.5 + 0.5 * dive); }
      c = mix(c, c * vec3(0.86, 0.90, 1.10), vh * QQ.y * 0.50);
      c = mix(c, c * vec3(1.00, 0.98, 1.04), vr * QQ.y * 0.30);
      /* 伸肌肌腱：腕中央扇形到各指根，窄而隆起；指根前淡出，腕部被支持帶壓住也淡 */
      float tr = 0.0;
      if (back > 0.01) for (int f = 0; f < 4; f++) { float t; vec2 a = vec2(0.06 + (uJ[f*4].x - 0.06) * 0.30, 0.03), b = vec2(uJ[f*4].x, uJ[f*4].z - 0.07);
        float dt = hrSegD(p.xz, a, b); vec2 ab = b - a; t = clamp(dot(p.xz - a, ab) / dot(ab, ab), 0.0, 1.0);
        tr = max(tr, exp(-pow(dt / 0.016, 2.0)) * smoothstep(0.05, 0.35, t) * (1.0 - smoothstep(0.85, 1.0, t))); }
      tr *= back * QQ.z;
      c *= mix(vec3(1.0), vec3(1.06, 1.03, 0.95), tr * 0.45);
      /* 骨突：掌指關節頭（偏黃白、隆起）、尺骨莖突（腕小指側） */
      float kn = 0.0; for (int f = 0; f < 4; f++) kn = max(kn, exp(-pow(length(p.xz - uJ[f*4].xz + vec2(0.0, 0.02)) / 0.055, 2.0)));
      kn *= smoothstep(0.2, 0.7, dors) * (1.0 - onFinger);
      float sty = exp(-pow(length(p.xz - vec2(-0.25, 0.03)) / 0.06, 2.0)) * smoothstep(0.0, 0.6, dot(n, normalize(vec3(-0.6, 0.8, 0.0))));
      c *= mix(vec3(1.0), vec3(1.08, 1.04, 0.92), (kn + sty) * 0.5);
      /* 斑：細胞雜訊的小斑（大小不一、邊緣軟、成群），取代原本低頻閾值切出的大塊 */
      float sp = 0.0, halo = 0.0;
      if (uAge.y > 0.0 && dors > 0.1) { float fq = 22.0 * (1.0 + uExt.w * 0.8);
        vec2 qs = p.xz * fq + (vec2(hrNoise(p * 55.0), hrNoise(p * 55.0 + 3.3)) - 0.5) * 0.45;
        vec3 ce = hrCell2(qs); float cl = smoothstep(0.30, 0.70, hrFbm(p * 5.0 + 1.3));
        float pres = step(ce.y, uAge.y * (0.18 + 0.55 * cl) * (1.0 + uExt.z * 0.6));
        float rad = mix(0.10, 0.40, fract(ce.z * 7.13)), dn = ce.x + (hrNoise(p * 150.0) - 0.5) * 0.14;
        sp = pres * (1.0 - smoothstep(rad * 0.2, rad, dn)) * smoothstep(0.1, 0.5, dors) * (0.3 + 0.7 * fract(ce.z * 3.7)) * (1.0 - scar);
        /* 大一號的軟斑（稀、淡、邊緣很散）：幾顆小斑連成一片的感覺 */
        vec3 ceL = hrCell2(p.xz * fq * 0.38 + (vec2(hrNoise(p * 24.0), hrNoise(p * 24.0 + 7.0)) - 0.5) * 0.8 + 11.0);
        float presL = step(ceL.y, uAge.y * (0.10 + 0.45 * cl) * (1.0 + uExt.z));
        sp = max(sp, presL * (1.0 - smoothstep(0.05, 0.42 + 0.2 * ceL.z, ceL.x + (hrNoise(p * 70.0) - 0.5) * 0.25)) * smoothstep(0.1, 0.5, dors) * (0.35 + 0.35 * ceL.z) * (1.0 - scar));
        halo = pres * (1.0 - smoothstep(rad, rad * 2.0, dn)) * smoothstep(0.1, 0.5, dors) * (1.0 - scar);
        /* 細碎雀斑（更小、更淡） */
        vec3 ce2 = hrCell2(p.xz * 70.0 + 3.0); sp = max(sp, step(ce2.y, uAge.y * 0.12) * (1.0 - smoothstep(0.08, 0.22, ce2.x)) * 0.35 * hrLOD(0.015, length(fwidth(p)))); }
      vec3 spC = mix(c * vec3(0.62, 0.47, 0.34), vec3(0.020, 0.036, 0.024), uExt.z);
      c = mix(c, c * mix(vec3(0.90, 0.84, 0.80), vec3(0.72, 0.86, 0.74), uExt.z), halo * 0.45);
      c = mix(c, spC, sp * 0.85);
      hrPH = vr * 0.0042 * QQ.x + tr * 0.0035 + kn * 0.0035 + sty * 0.0025 - sp * 0.0001;
      hrPR = -0.10 * (tr + kn) * (1.0 - PP.y * 0.3) - 0.12 * vr * QQ.x;
    }
`;

/* ═══ 方向 C：次表面／遮蔽／接觸陰影／邊緣光／環境反射 ═══ */
const COLOR_C = /* glsl */`
    { /* skin-proto C：薄度、指縫遮蔽、離桌面高度遮蔽（打光在 RE_Direct 與 opaque 前） */
      hrThin = clamp(onFinger * (0.35 + 0.65 * smoothstep(2.0, 3.0, bs)) + (1.0 - onFinger) * 0.10, 0.0, 1.0) * (1.0 - nail * 0.6);
      float d2 = 1e9; vec3 q2 = p;
      for (int f = 0; f < 4; f++) if (f != bf) for (int k = 0; k < 2; k++) { float t; vec3 a = uJ[f*4+k], b = uJ[f*4+k+1]; float d = hrSeg(p, a, b, t); if (d < d2) { d2 = d; q2 = a + (b - a) * t; } }
      vec3 toN = q2 - p; float occ = (1.0 - smoothstep(0.07, 0.17, d2)) * clamp(dot(n, normalize(toN + vec3(0.0, 1e-4, 0.0))) * 1.2, 0.0, 1.0);
      /* 指根指蹼的凹處 */
      float web = 0.0; for (int f = 0; f < 3; f++) web = max(web, exp(-pow(length(p.xz - (uJ[f*4].xz + uJ[f*4+4].xz) * 0.5 - vec2(0.0, 0.04)) / 0.05, 2.0)));
      float hT = (vHrW.y - uTableY) / max(uDm, 1e-5);
      float down = clamp(0.45 - vHrWN.y * 0.6, 0.0, 1.0);
      float aoT = 1.0 - (1.0 - smoothstep(0.0, 0.55, hT)) * 0.6 * down;
      hrAO = (1.0 - 0.55 * occ) * (1.0 - 0.35 * web * smoothstep(0.0, 0.5, dors)) * aoT;
      hrBounce = (1.0 - smoothstep(0.0, 0.7, hT)) * down;
    }
`;
/* RE_Direct：包覆漫射（紅包得深＝明暗交界泛紅）＋背光穿透薄處（指緣、指尖） */
const DIRECT_C = /* glsl */`
	if (hrK > 0.0) {
		float hndl = dot(hrN, directLight.direction);
		vec3 hwr = vec3(0.42, 0.16, 0.08);
		vec3 hwrap = clamp((vec3(hndl) + hwr) / (1.0 + hwr), 0.0, 1.0);
		reflectedLight.directDiffuse += (hwrap * directLight.color - irradiance) * BRDF_Lambert(material.diffuseColor) * hrK; // 只包漫射；鏡面仍用原 N·L（背光的 GGX 會爆亮點）
		vec3 hV = normalize(vViewPosition), hLt = -(directLight.direction + hrNg * 0.35);
		float htr = pow(clamp(dot(hV, hLt), 0.0, 1.0), 4.0) * hrThin * hrThin;
		reflectedLight.directDiffuse += htr * directLight.color * hrSSS * hrK * 0.9;
	}
`;
const OPAQUE_C = /* glsl */`
{
  vec3 hV = normalize(vViewPosition); float hNoV = clamp(dot(hrN, hV), 0.0, 1.0);
  /* 薄處的柔和透紅（取代原本整圈 Fresnel 邊緣光） */
  outgoingLight += hrK * hrSSS * pow(1.0 - hNoV, 2.0) * 0.20 * (0.3 + hrThin);
  /* 遮蔽與桌面紅反光 */
  outgoingLight *= mix(1.0, hrAO, hrK);
  outgoingLight += hrK * hrBounce * vec3(0.050, 0.010, 0.008) * diffuseColor.rgb * 4.0;
  /* 邊緣光（冷、從上方）＋假環境反射（上暗紫、下桌面暗紅，前方燈籠一點暖） */
  vec3 hRw = (vec4(reflect(-hV, hrN), 0.0) * viewMatrix).xyz; vec3 hNw = (vec4(hrN, 0.0) * viewMatrix).xyz;
  outgoingLight += hrK * vec3(0.10, 0.13, 0.17) * pow(1.0 - hNoV, 5.0) * clamp(hNw.y * 0.7 + 0.5, 0.0, 1.0) * 0.25;
  vec3 hEnv = mix(vec3(0.090, 0.022, 0.018), vec3(0.020, 0.018, 0.045), smoothstep(-0.3, 0.5, hRw.y)) + vec3(0.30, 0.14, 0.05) * pow(clamp(dot(hRw, normalize(vec3(0.0, 0.35, -1.0))), 0.0, 1.0), 10.0);
  float hF = 0.028 + 0.972 * pow(1.0 - hNoV, 5.0);
  outgoingLight += hrK * hEnv * hF * pow(1.0 - roughnessFactor, 2.0) * 1.0 * hrAO;
}
`;

function protoParts(dir) {
  const S = B1.shaderParts();
  let pars = S.pars.replace(/uniform (vec3|vec4|float) (\w+)\[8\]/g, `uniform $1 $2[${N}]`);
  pars = pars.replace(/vec3 hrPick3\(vec3 a\[8\][^\n]*/, PICK('vec3', 'hrPick3')).replace(/vec4 hrPick4\(vec4 a\[8\][^\n]*/, PICK('vec4', 'hrPick4')).replace(/float hrPick1\(float a\[8\][^\n]*/, PICK('float', 'hrPick1'));
  if (/\w+ a\[8\],|\w+A\[8\];/.test(pars)) throw new Error('hand-skin-proto: 還有 [8] 宣告沒換');
  pars += PARS + PICK('vec4', 'hrPickP') + '\n' + (dir === 'b' ? PARS_B : '');
  let color = S.color;
  /* 共用：疤 */
  const i0 = color.indexOf(SCAR_OLD_START), i1 = color.indexOf(SCAR_OLD_END);
  if (i0 < 0 || i1 < i0) throw new Error('hand-skin-proto: 找不到疤段');
  color = color.slice(0, i0) + SCAR_NEW + color.slice(i1);
  color = sw(color, SCAR_COLOR_OLD, SCAR_COLOR_NEW);
  color = sw(color, '+ scar * 0.0006 +', '+ scarH +');
  color = sw(color, 'hrRough = mix(hrRough, 0.85, scar);', 'hrRough = mix(hrRough, 0.62, scar * 0.7); hrRough = mix(hrRough, 0.9, stitchM);\n    hrH += hrPH; hrRough = clamp(hrRough + hrPR, 0.22, 1.0);');
  if (dir === 'b') { // 原本的雜訊靜脈、閾值斑、寬肌腱：關掉，改用 COLOR_B
    color = sw(color, 'if (uAge.z > 0.0 && dors > 0.3 && onFinger < 0.99)', 'if (false)');
    color = sw(color, 'if (uAge.y > 0.0 && dors > 0.1) spots =', 'if (false) spots =');
    color = sw(color, 'tendon * 0.005 * (0.4 + 1.2 * age)', 'tendon * 0.0012 * (0.4 + 1.2 * age)');
  }
  const add = dir === 'a' ? COLOR_A : dir === 'b' ? COLOR_B : COLOR_C;
  color = sw(color, '    if (uExt2.y > 0.0) {', add + '    if (uExt2.y > 0.0) {');
  return { pars, color, acc: S.acc };
}

export function makeMaterial(base, joints, dir) {
  if (!DIRS.includes(dir)) throw new Error('hand-skin-proto: 未知方向 ' + dir);
  const m = base.clone();
  m.name = 'hand-skin-proto-' + dir;
  const arr = (f) => KINDS11.map((k, i) => f(kd11(i), k));
  const u = {
    uJ: { value: joints.J.map((p) => new THREE.Vector3(...p)) }, uWr: { value: new THREE.Vector3(...joints.wrist) },
    uSkinA: { value: arr((d) => new THREE.Color(...d.skin)) }, uWarmA: { value: arr((d) => new THREE.Color(...d.warm)) }, uNailA: { value: arr((d) => new THREE.Color(...d.nail)) },
    uAgeA: { value: arr((d) => new THREE.Vector4(...d.age)) }, uMarksA: { value: arr((d) => new THREE.Vector4(...d.marks)) }, uSSSA: { value: arr((d) => new THREE.Color(...d.sss)) },
    uRoughA: { value: arr((d) => d.rough) }, uScar: { value: new THREE.Vector4(0.16, 0.28, -0.12, 0.66) },
    uExtA: { value: arr((d) => new THREE.Vector4(...(d.ext || [0, 0, 0, 0]))) }, uExt2A: { value: arr((d) => new THREE.Vector4(...(d.ext2 || [0, 0, 0, 0]))) },
    uProtoPA: { value: arr((d, k) => new THREE.Vector4(...PQ[k][0])) }, uProtoQA: { value: arr((d, k) => new THREE.Vector4(...PQ[k][1])) },
    uTableY: { value: 0 }, uDm: { value: 0.1 },
  };
  const S = protoParts(dir);
  m.userData.realU = u; m.userData.skinDir = dir;
  m.customProgramCacheKey = () => 'hand-skin-proto-' + dir;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSkin; attribute vec3 aAcc; varying vec3 vRP; varying vec3 vRN; varying float vSkin; varying vec3 vAcc; varying vec3 vHrW; varying vec3 vHrWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRP = position; vRN = normal; vSkin = aSkin; vAcc = aAcc;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvHrW = (modelMatrix * vec4(transformed, 1.0)).xyz; vHrWN = normalize(mat3(modelMatrix) * objectNormal);');
    let fs = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + S.pars)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + S.color + S.acc)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, hrRough, max(hrK, hrA));')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.85, hrMetal);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nhrNg = normal; if (hrK > 0.0 || hrA > 0.0) normal = hrBump(-vViewPosition, normal, hrH * max(hrK, hrA));\nhrN = normal;');
    if (dir === 'c') {
      const chunk = THREE.ShaderChunk.lights_physical_pars_fragment, anchor = 'vec3 irradiance = dotNL * directLight.color;';
      if (chunk.includes(anchor)) fs = fs.replace('#include <lights_physical_pars_fragment>', chunk.replace(anchor, anchor + DIRECT_C));
      else console.warn('hand-skin-proto C：three 版本的 RE_Direct 找不到錨點，包覆漫射／透射未注入');
      fs = fs.replace('#include <opaque_fragment>', OPAQUE_C + '#include <opaque_fragment>');
    } else {
      fs = fs.replace('#include <opaque_fragment>', 'outgoingLight += hrK * hrSSS * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.5) * 0.25;\n#include <opaque_fragment>');
    }
    sh.fragmentShader = fs;
  };
  return m;
}

/** C：手在桌上的接觸陰影——每席一片程式漸層橢圓（無貼圖），對準掌心投影、離桌越高越淡越散。不開陰影貼圖管線。 */
export function createContactShadows(parent) {
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const vs = 'varying vec2 vU; void main(){ vU = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const fsh = 'uniform float uA; uniform float uSoft; varying vec2 vU; void main(){ vec2 q = vU; q.y = q.y < 0.0 ? q.y * 1.35 : q.y; float r = length(q); float a = 1.0 - smoothstep(0.25 * (1.0 - uSoft), 1.0, r); gl_FragColor = vec4(0.012, 0.006, 0.010, a * a * uA); }';
  const meshes = [0, 1, 2, 3].map((s) => {
    const mat = new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 }, uSoft: { value: 0 } }, vertexShader: vs, fragmentShader: fsh, transparent: true, depthWrite: false });
    const m = new THREE.Mesh(geo, mat); m.name = 'hand-contact-shadow-' + s; m.visible = false; m.frustumCulled = false; m.matrixAutoUpdate = false; m.renderOrder = -1;
    parent.add(m); return m;
  });
  const wp = (b, v) => parent.worldToLocal(b.getWorldPosition(v)); // 都換到手群組（＝桌面道具）的局部座標
  const P = { wr: new THREE.Vector3(), pa: new THREE.Vector3(), mt: new THREE.Vector3(), ia: new THREE.Vector3(), pk: new THREE.Vector3() };
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), S = new THREE.Vector3(), C = new THREE.Vector3();
  return {
    /** 每幀（apply 之後）：跟著可見的手；tableY＝桌面高（手群組局部座標） */
    update(hands, tableY) {
      parent.updateMatrixWorld();
      for (const h of hands) {
        const m = meshes[h.seat]; m.visible = h.holder.visible; if (!m.visible) continue;
        h.holder.updateMatrixWorld(true);
        const B = h.bones; wp(B.Wrist, P.wr); wp(B.Palm, P.pa); wp(B.MiddleTip, P.mt); wp(B.IndexA, P.ia); wp(B.PinkyA, P.pk);
        const dm = h.holder.scale.x, hgt = Math.max(0, P.pa.y - tableY) / dm; // 掌心離桌（dm）
        C.copy(P.pa).lerp(P.mt, 0.25); const dx = P.mt.x - P.wr.x, dz = P.mt.z - P.wr.z;
        const L = Math.hypot(dx, dz) * 0.85 + dm * 0.3, W = P.ia.distanceTo(P.pk) * 1.7 + dm * 0.3;
        const soft = Math.min(1, hgt / 1.2);
        Q.setFromAxisAngle(Y, Math.atan2(dx, dz)); S.set(W * (1 + soft * 0.5), 1, L * (1 + soft * 0.4));
        M4.compose(C.set(C.x, tableY + 0.0012, C.z), Q, S); m.matrix.copy(M4); m.matrixWorldNeedsUpdate = true;
        m.material.uniforms.uA.value = 0.62 * (1 - Math.min(1, hgt / 2.2)); m.material.uniforms.uSoft.value = soft;
      }
    },
    meshes,
  };
}

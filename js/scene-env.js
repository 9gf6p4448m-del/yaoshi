// 妖市 3D 環境層 — 場景環境（攤位桌／燈光／鏡頭／夜色）
// Layer 1：純視覺，不讀寫任何遊戲引擎狀態（S / CFG / trace()）。
import * as THREE from 'three';

// v0.15 調亮：牌桌面板改半透明後，3D 要「透得出來」才有意義。原本 #3d1a0a 配 intensity 1.5
// 在半透明面板後面幾乎是全黑，實測（scratchpad b1-table.png）看不出有 3D。以下四個數字是為了
// 「隔著 60% 不透明度的面板還看得見桌沿與燈籠光」而調的，改面板透明度時要一起重看。
const TABLE_COLOR = 0x6b3418;

// 桌面要大到「填滿整個畫面背景」，不是擺在畫面中央當一個物件——中央正好被最不透明的
// #felt 面板蓋住，桌子做小的話玩家一眼都看不到（實測 scratchpad b1-table.png 兩版）。
// 半徑 3.4＋鏡頭壓到 3.6，木桌會從面板四周一路鋪到畫面邊緣，四盞燈籠在座位卡後面各打一圈光。
const TABLE_RADIUS = 3.4;
const LANTERN_HEIGHT = 1.5; // 壓低：光斑落在看得到的桌面上，不是打在空中
const LANTERN_DIST = 2.6; // 東南西北四角方位半徑，對應 characters-billboard 的座位半徑

// ─── 美術甲「夜市燈火」渲染基礎包（2026-09-07，v0.46）────────────────────────
// 凍結檔：docs/experiments/2026-09-07-acceptance-art-a.md。守則：docs/design/ART_BIBLE.md
// §「燈光與色調」。本卷所有新常數集中在 ENV／LANTERNS 這兩張表，**全部【試玩必調】**。
//
// 為什麼要有這一包：玩家 90% 時間看的是牌桌／市集，而那個畫面在 v0.45 之前
// ① 沒有任何色調映射（ACES 只手寫在 bloom 合成 shader 裡，而 bloom 只在對決開）
// ② 四盞燈籠同色溫同亮度，四面等亮、沒有明暗交界
// ③ 背景是一片純色，桌子以外什麼都沒有——「夜市」只剩一張圓桌浮在紫黑裡。
export const ENV = {
  // 5-1 渲染器：ACESFilmic 的曝光。three 的 ACES 內部會先乘 `exposure/0.6`，1.1 大約是
  // 「中間調維持原樣」的落點——ACES 的完整擬合本身有很重的趾部（linear 0.1 會被壓到 0.043），
  // 光靠 exposure 1.0 會讓整張牌桌暗一截。牌桌不足的亮度由 HemisphereLight／AmbientLight／
  // 四盞燈籠的絕對值補（見下面兩張表），不是靠再往上推 exposure——推上去對決會糊掉。【試玩必調】
  EXPOSURE: 1.1,

  // 5-4 漸層穹頂（大球 BackSide＋頂點色）。SKY_STOPS＝[t, hex]，t＝頂點 y / 半徑（-1 底、+1 頂），
  // 相鄰兩站之間用 smoothstep 補間。為什麼要五站而不是「上藍紫／地平暗紅／下近黑」三站：
  // 牌桌機位俯角 34°、垂直半 FOV 25°，畫面**最上緣**其實是水平線下 8.7°——牌桌從頭到尾看不到
  // 水平線以上。三站的話玩家 90% 時間看到的就只是「地平色→黑」那一段，夜空的藍紫永遠看不到。
  // 所以水平線那圈（t=0）放暖色廟埕燈火，它下面（t=-0.22，正是牌桌看得到的那一段）放夜紫，
  // 再下面才收到近黑；t=0 以上收回藍紫夜空（對決機位俯角 19.5°、看得到水平線上 5.5°，
  // 那裡才是夜空真正露臉的地方）。全部【試玩必調】。
  SKY_STOPS: [
    [-1.00, 0x050409], // 腳下：近黑
    [-0.55, 0x0d0a1c],
    [-0.22, 0x1e1a46], // 牌桌機位看到的那一段：夜紫
    [0.00, 0x4a2030], // 水平線：廟埕燈火把霧染成的暖紫紅
    [0.35, 0x1b1740], // 夜空：藍紫
    [1.00, 0x141031], // 天頂：更暗
  ],
  SKY_FOG: 0x1c1330, // scene.fog／scene.background：取牌桌看到的那一段（遠處要化進「那個」顏色）。
  // 這個值要**暗**：對決霧密度 0.115，霧色一亮整個對決背景就變成一片灰紫霧（實測畫面中央亮度
  // 從基準 51.3 衝到 114.1）。基準版是 #1a0a2e，這裡取同亮度但偏藍紫一點。
  DOME_RADIUS: 22, // > 遠景剪影最遠 13，< camera.far 100

  // 5-2 補光：暗部不死黑。天空色偏紫藍、地面色暖褐，與四盞燈籠的暖色形成冷暖對比。
  HEMI_SKY: 0x6b6a96,
  HEMI_GROUND: 0x8a5626,
  HEMI_INT: 1.8,
  // 環境光從 0.55 退到 0.30：補光的職責交給 HemisphereLight，AmbientLight 只留最底那層墊色。
  AMBIENT_COLOR: 0x3a2450,
  AMBIENT_INT: 0.5,

  // 5-4 遠景剪影：離桌心多遠、多高、什麼顏色。剪影是程序化幾何＋頂點色，**不載任何外部貼圖**
  // （專案鐵則）。夜市燈籠串那幾點是同一份幾何裡的暖色頂點，所以一片剪影＝1 個 draw call。
  FAR_DARK: 0x0a0710, // 剪影本體：近黑帶一點紫（純黑在夜色裡看起來像破圖）
  FAR_LAMP: 0xff8a3a, // 屋簷燈籠串
  FAR_OPACITY: 1.0,
};

// 四盞燈籠改成四種色溫與亮度（東 青白／南 橘／西 琥珀／北 暗紅）。
// 這是「明暗交界」的來源：北側刻意暗、南側（玩家）最亮。閃爍在 renderer.js，
// 那裡讀的是 light.userData.baseIntensity，不再寫死 3.4。
export const LANTERNS = {
  south: { color: 0xffa855, intensity: 7.0 }, // 玩家這一側：橘、最亮
  north: { color: 0xa8402a, intensity: 3.6 }, // 對面：暗紅，做出明暗交界
  west: { color: 0xffc070, intensity: 5.6 }, // 琥珀
  east: { color: 0xd8e8ff, intensity: 5.0 }, // 青白（供桌上的白蠟）
};

// 夜霧（v0.27）：從 THREE.Fog（線性 6→16）換成 FogExp2，遠處才會真的化進夜色而不是硬切。
// 兩段密度都【試玩必調】：牌桌那段刻意保守（跟舊線性霧在桌面範圍內視覺相近，
// 才不會讓「批 1 只做對決」變成整桌變樣）；對決那段才是真正的夜霧。
export const FOG_DENSITY = { table: 0.055, duel: 0.115 };

// 四個角色方位（南＝玩家、北、西、東），供燈籠與角色共用座標系
export const SEAT_POS = {
  south: new THREE.Vector3(0, 0, LANTERN_DIST),
  north: new THREE.Vector3(0, 0, -LANTERN_DIST),
  west: new THREE.Vector3(-LANTERN_DIST, 0, 0),
  east: new THREE.Vector3(LANTERN_DIST, 0, 0),
};

/** 漸層穹頂：大球反面貼頂點色。fog 關掉（它就是霧要融進去的那個底），depthWrite 關掉、
 *  renderOrder -1，讓它永遠畫在最底層而不參與深度競爭。 */
function createSkyDome() {
  const geo = new THREE.SphereGeometry(ENV.DOME_RADIUS, 24, 16);
  const pos = geo.attributes.position;
  const stops = ENV.SKY_STOPS.map(([t, hex]) => [t, new THREE.Color(hex)]);
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp(pos.getY(i) / ENV.DOME_RADIUS, -1, 1);
    let j = 0;
    while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
    const k = THREE.MathUtils.smoothstep(t, stops[j][0], stops[j + 1][0]);
    c.copy(stops[j][1]).lerp(stops[j + 1][1], k);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
  }));
  mesh.name = 'sky-dome';
  mesh.renderOrder = -1;
  return mesh;
}

/** 剪影建構器：把一連串四邊形推進同一份 BufferGeometry（一片剪影＝一個 draw call）。 */
function silhouette() {
  const P = []; const C = [];
  const push = (pts, hex) => {
    const c = new THREE.Color(hex);
    // pts＝[x0,y0, x1,y1, x2,y2, x3,y3] 四邊形（順序：左下 右下 右上 左上），拆兩個三角形
    const idx = [0, 1, 2, 0, 2, 3];
    for (const i of idx) { P.push(pts[i * 2], pts[i * 2 + 1], 0); C.push(c.r, c.g, c.b); }
  };
  return {
    /** 矩形 */
    box(x, y, w, h, hex) { push([x, y, x + w, y, x + w, y + h, x, y + h], hex); },
    /** 梯形（下寬 w0、上寬 w1，中心對齊 x） */
    trap(x, y, w0, w1, h, hex) { push([x - w0 / 2, y, x + w0 / 2, y, x + w1 / 2, y + h, x - w1 / 2, y + h], hex); },
    build(name) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3));
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        // FrontSide（不是 DoubleSide）：place() 用 lookAt 把正面轉向桌心，背面永遠看不到；
        // 而 three 對 DoubleSide 的材質會畫兩趟（背面一趟、正面一趟），五片就多花 5 個 draw call。
        vertexColors: true, side: THREE.FrontSide, fog: true,
        transparent: true, opacity: ENV.FAR_OPACITY, depthWrite: false,
      }));
      mesh.name = name;
      return mesh;
    },
  };
}

/** 五片遠景剪影：廟宇屋脊／牌樓／榕樹／屋簷燈籠串／攤棚一排。
 *  擺位理由：牌桌機位（俯角 34°、垂直半 FOV 25°）畫面最上緣＝水平線下 8.7°，
 *  地面上的東西要離鏡頭 < 2.065/tan(8.7°) ≈ 13.5 才進得了畫面，所以距離取 8.5～13。 */
function createFarSilhouettes() {
  const g = new THREE.Group();
  g.name = 'far-group';
  const D = ENV.FAR_DARK, L = ENV.FAR_LAMP;

  // ① 廟宇屋脊（燕尾脊：兩段翹起的梯形頂＋殿身）
  {
    const s = silhouette();
    s.box(-2.6, 0, 5.2, 1.9, D); // 殿身
    s.trap(0, 1.9, 6.0, 3.4, 0.9, D); // 屋頂
    s.box(-3.5, 2.5, 1.0, 0.28, D); // 左燕尾
    s.box(2.5, 2.5, 1.0, 0.28, D); // 右燕尾
    s.box(-0.18, 2.8, 0.36, 0.5, D); // 脊飾
    for (let i = 0; i < 4; i++) s.box(-2.1 + i * 1.4, 1.55, 0.18, 0.3, L); // 簷下燈籠
    g.add(place(s.build('far-temple'), 218, 8.5, 0.30));
  }
  // ② 牌樓（兩柱三樓）
  {
    const s = silhouette();
    s.box(-1.9, 0, 0.34, 3.2, D);
    s.box(1.56, 0, 0.34, 3.2, D);
    s.box(-2.3, 2.3, 4.6, 0.32, D);
    s.box(-2.3, 3.0, 4.6, 0.26, D);
    s.trap(0, 3.26, 3.0, 1.6, 0.6, D);
    s.box(-1.2, 2.0, 0.2, 0.3, L);
    s.box(1.0, 2.0, 0.2, 0.3, L);
    g.add(place(s.build('far-arch'), 142, 8.5, 0.28));
  }
  // ③ 榕樹（幹＋團塊樹冠，刻意不對稱）
  {
    const s = silhouette();
    s.box(-0.28, 0, 0.56, 1.7, D);
    s.box(-1.9, 1.5, 3.8, 1.1, D);
    s.box(-1.3, 2.5, 2.4, 0.9, D);
    s.box(-2.6, 1.7, 0.9, 0.7, D);
    s.box(1.6, 1.8, 1.1, 0.6, D);
    s.box(-0.45, 3.3, 1.2, 0.55, D);
    g.add(place(s.build('far-banyan'), 233, 8.6, 0.26));
  }
  // ④ 屋簷燈籠串（一條橫樑吊六盞，最像「夜市」的那一片）
  {
    const s = silhouette();
    s.box(-3.4, 2.0, 6.8, 0.22, D);
    s.box(-3.6, 0, 0.26, 2.2, D);
    s.box(3.34, 0, 0.26, 2.2, D);
    for (let i = 0; i < 6; i++) {
      const x = -2.9 + i * 1.16;
      s.box(x - 0.04, 1.75, 0.08, 0.25, D); // 吊繩
      s.box(x - 0.16, 1.42, 0.32, 0.34, L); // 燈籠
    }
    g.add(place(s.build('far-eaves'), 160, 8.5, 0.34));
  }
  // ⑤ 攤棚一排（高低錯落的斜頂）
  {
    const s = silhouette();
    for (let i = 0; i < 4; i++) {
      const x = -3.6 + i * 2.4;
      const h = 1.2 + (i % 2) * 0.55;
      s.box(x, 0, 2.0, h, D);
      s.trap(x + 1.0, h, 2.6, 1.2, 0.45, D);
      s.box(x + 0.85, h - 0.35, 0.3, 0.26, L);
    }
    g.add(place(s.build('far-stalls'), 200, 9.0, 0.32));
  }
  return g;
}

/** 把剪影擺到方位角 deg、距離 dist 的地面上，正面轉向桌心，並壓扁 ys 倍。
 *  為什麼要壓扁：牌桌機位是**俯視**（畫面最上緣＝水平線下 8.7°），離地愈高的東西愈往畫面外跑——
 *  實測一單位世界高度在畫面上約 0.52 NDC，而剪影底部落在 NDC 0.57～0.98，
 *  也就是**只有離地約 0.85 個世界單位的那一段看得到**。不壓扁的話玩家只會看到幾根黑柱子。
 *  壓扁同時也符合視覺：從高處俯看遠處的屋脊，本來就是縱向被壓短的。 */
function place(mesh, deg, dist, ys) {
  const a = THREE.MathUtils.degToRad(deg);
  mesh.position.set(Math.sin(a) * dist, 0, Math.cos(a) * dist);
  mesh.scale.set(1, ys, 1);
  mesh.lookAt(0, 0, 0);
  return mesh;
}

export function createSceneEnv(aspect) {
  const scene = new THREE.Scene();
  // 背景仍設純色當退路（穹頂沒建起來時畫面不會是黑的），顏色＝地平色，跟霧同一色
  scene.background = new THREE.Color(ENV.SKY_FOG);
  scene.fog = new THREE.FogExp2(ENV.SKY_FOG, FOG_DENSITY.table); // 密度由 renderer 依場景在兩段之間補間

  const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
  const camDist = 3.6; // 拉近：讓桌面鋪滿背景，面板四周都是木紋與燈籠光
  const tilt = THREE.MathUtils.degToRad(35);
  camera.position.set(0, Math.sin(tilt) * camDist, Math.cos(tilt) * camDist);
  const centerPoint = new THREE.Vector3(0, 0.1, 0);
  camera.lookAt(centerPoint);

  const sky = createSkyDome();
  scene.add(sky);
  const far = createFarSilhouettes();
  scene.add(far);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(TABLE_RADIUS, TABLE_RADIUS, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: TABLE_COLOR, roughness: 0.85, metalness: 0.05 })
  );
  scene.add(table);

  const ambient = new THREE.AmbientLight(ENV.AMBIENT_COLOR, ENV.AMBIENT_INT);
  scene.add(ambient);
  // 補光：天空紫藍／地面暖褐。暗部不再是死黑，也給了跟燈籠暖光相對的冷色。
  const hemi = new THREE.HemisphereLight(ENV.HEMI_SKY, ENV.HEMI_GROUND, ENV.HEMI_INT);
  hemi.position.set(0, 6, 0);
  scene.add(hemi);

  const lanterns = Object.keys(SEAT_POS).map((k) => {
    const seat = SEAT_POS[k];
    const cfg = LANTERNS[k];
    const light = new THREE.PointLight(cfg.color, cfg.intensity, 10);
    light.position.set(seat.x, LANTERN_HEIGHT, seat.z);
    // 閃爍在 renderer.js 每幀重算 intensity，基準值放這裡，避免兩邊各寫一份數字
    light.userData.baseIntensity = cfg.intensity;
    scene.add(light);
    return light;
  });

  return { scene, camera, table, ambient, hemi, sky, far, lanterns, centerPoint };
}

export function resizeSceneEnv(camera, aspect) {
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

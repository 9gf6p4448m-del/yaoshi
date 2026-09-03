// 妖市 3D 環境層 — 場景環境（攤位桌／燈光／鏡頭）
// Layer 1：純視覺，不讀寫任何遊戲引擎狀態（S / CFG / trace()）。
import * as THREE from 'three';

const BG_COLOR = 0x1a0a2e;
// v0.15 調亮：牌桌面板改半透明後，3D 要「透得出來」才有意義。原本 #3d1a0a 配 intensity 1.5
// 在半透明面板後面幾乎是全黑，實測（scratchpad b1-table.png）看不出有 3D。以下四個數字是為了
// 「隔著 60% 不透明度的面板還看得見桌沿與燈籠光」而調的，改面板透明度時要一起重看。
const TABLE_COLOR = 0x6b3418;
const LANTERN_COLOR = 0xf0a840;
const AMBIENT_COLOR = 0x1a0a2e;

// 桌面要大到「填滿整個畫面背景」，不是擺在畫面中央當一個物件——中央正好被最不透明的
// #felt 面板蓋住，桌子做小的話玩家一眼都看不到（實測 scratchpad b1-table.png 兩版）。
// 半徑 3.4＋鏡頭壓到 3.6，木桌會從面板四周一路鋪到畫面邊緣，四盞燈籠在座位卡後面各打一圈光。
const TABLE_RADIUS = 3.4;
const LANTERN_HEIGHT = 1.5; // 壓低：光斑落在看得到的桌面上，不是打在空中
const LANTERN_DIST = 2.6; // 東南西北四角方位半徑，對應 characters-billboard 的座位半徑

// 四個角色方位（南＝玩家、北、西、東），供燈籠與角色共用座標系
export const SEAT_POS = {
  south: new THREE.Vector3(0, 0, LANTERN_DIST),
  north: new THREE.Vector3(0, 0, -LANTERN_DIST),
  west: new THREE.Vector3(-LANTERN_DIST, 0, 0),
  east: new THREE.Vector3(LANTERN_DIST, 0, 0),
};

export function createSceneEnv(aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);
  scene.fog = new THREE.Fog(BG_COLOR, 6, 16); // 鏡頭拉近後霧也要跟著收，遠端桌沿才會化進夜色

  const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
  const camDist = 3.6; // 拉近：讓桌面鋪滿背景，面板四周都是木紋與燈籠光
  const tilt = THREE.MathUtils.degToRad(35);
  camera.position.set(0, Math.sin(tilt) * camDist, Math.cos(tilt) * camDist);
  const centerPoint = new THREE.Vector3(0, 0.1, 0);
  camera.lookAt(centerPoint);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(TABLE_RADIUS, TABLE_RADIUS, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: TABLE_COLOR, roughness: 0.85, metalness: 0.05 })
  );
  scene.add(table);

  const ambient = new THREE.AmbientLight(AMBIENT_COLOR, 0.55);
  scene.add(ambient);

  const lanterns = Object.values(SEAT_POS).map((seat) => {
    const light = new THREE.PointLight(LANTERN_COLOR, 3.4, 10);
    light.position.set(seat.x, LANTERN_HEIGHT, seat.z);
    scene.add(light);
    return light;
  });

  return { scene, camera, table, ambient, lanterns, centerPoint };
}

export function resizeSceneEnv(camera, aspect) {
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

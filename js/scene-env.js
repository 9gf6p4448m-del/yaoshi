// 妖市 3D 環境層 — 場景環境（攤位桌／燈光／鏡頭）
// Layer 1：純視覺，不讀寫任何遊戲引擎狀態（S / CFG / trace()）。
import * as THREE from 'three';

const BG_COLOR = 0x1a0a2e;
const TABLE_COLOR = 0x3d1a0a;
const LANTERN_COLOR = 0xf0a840;
const AMBIENT_COLOR = 0x1a0a2e;

const TABLE_RADIUS = 2; // 直徑約 4 unit
const LANTERN_HEIGHT = 2.5;
const LANTERN_DIST = 2.2; // 東南西北四角方位半徑，對應 characters-billboard 的座位半徑

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
  scene.fog = new THREE.Fog(BG_COLOR, 8, 25);

  const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
  const camDist = 6.5;
  const tilt = THREE.MathUtils.degToRad(35);
  camera.position.set(0, Math.sin(tilt) * camDist, Math.cos(tilt) * camDist);
  const centerPoint = new THREE.Vector3(0, 0.1, 0);
  camera.lookAt(centerPoint);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(TABLE_RADIUS, TABLE_RADIUS, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: TABLE_COLOR, roughness: 0.85, metalness: 0.05 })
  );
  scene.add(table);

  const ambient = new THREE.AmbientLight(AMBIENT_COLOR, 0.3);
  scene.add(ambient);

  const lanterns = Object.values(SEAT_POS).map((seat) => {
    const light = new THREE.PointLight(LANTERN_COLOR, 1.5, 6);
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

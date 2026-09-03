// 妖市 3D 環境層 — 角色 billboard（Sprite 頭像）
// Layer 1：佔位對應，尚未讀 S.players。橋接層要換角色時改 setCharacterTexture()，
// 不要在這裡加任何讀引擎狀態的程式碼。
import * as THREE from 'three';

const SPRITE_SIZE = 0.8;

// index：0=南（玩家）、1=北、2=西、3=東。SVG 先用既有 4 個角色佔位，
// 等橋接層從 S.players 讀角色 id 後再換（見 docs/IMPLEMENTATION_GUIDE.md ROLES 表）。
const SEAT_ORDER = ['south', 'north', 'west', 'east'];
const PLACEHOLDER_SVGS = ['human', 'qingmian', 'hongyi', 'duanshou'];

const SEAT_LOCAL_POS = {
  south: [0, 1.2, 2.2],
  north: [0, 1.2, -2.2],
  west: [-2.2, 1.2, 0],
  east: [2.2, 1.2, 0],
};

export function createCharacterBillboards(assetsBase = 'assets/characters/') {
  const loader = new THREE.TextureLoader();
  const group = new THREE.Group();
  const sprites = {};

  SEAT_ORDER.forEach((seat, i) => {
    const material = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    const [x, y, z] = SEAT_LOCAL_POS[seat];
    sprite.position.set(x, y, z);
    sprite.scale.set(SPRITE_SIZE, SPRITE_SIZE, 1);
    group.add(sprite);
    sprites[seat] = sprite;

    loader.load(
      `${assetsBase}${PLACEHOLDER_SVGS[i]}.svg`,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
      },
      undefined,
      () => {
        // 佔位圖載入失敗不擋畫面，環境層仍要能獨立運作
        console.warn(`[characters-billboard] 找不到佔位頭像：${PLACEHOLDER_SVGS[i]}.svg`);
      }
    );
  });

  return { group, sprites };
}

// 橋接層之後用來把某個座位換成真正的角色 SVG（目前未被呼叫）。
export function setCharacterTexture(sprites, seat, url) {
  const sprite = sprites[seat];
  if (!sprite) return;
  new THREE.TextureLoader().load(url, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    sprite.material.map = texture;
    sprite.material.needsUpdate = true;
  });
}

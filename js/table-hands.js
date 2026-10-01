// 妖市 3D 環境層 — 席位之手（階段二 2a，Layer 1；docs/proposals/2026-09-30-seat-hands-silhouettes.md §6）
//
// 四席各一隻寫實右手（同一顆 GLB 複製四份），做推／拍／收／閒置四個動作。**純演出**：
//   - 不讀寫賽局狀態、不耗亂數；動作與擺位全在 hand-motion.js（純函式，node 可測），本檔只把結果寫進 three。
//   - 錢與令牌的位置仍由 table-props.js 算；手只讀它的唯讀出口去「對準」，不反過來決定任何東西。
//   - 令牌落地那一幀的 `ys:mark-slam` 仍由令牌（table-props 的 onSlam）發，本檔**不派任何事件**。
//   - 不進 `tray.hitTest` 的命中代理（U2）：本檔的 mesh 只掛在自己的 group，從不交給托盤的 proxies。
//
// 掛載：由 table-tray.js 建立並掛進它的 group（對決時整組收），與 props 並列。
// 觸發：renderer.js 既有的 ys:bid／ys:mark／ys:market／ys:reveal-result listener 呼叫 props 之後同一處呼叫本檔，
//       不新增第二套事件；跳過（doSkip 既有的 ys:fx-trait-cancel）時 finish() 直接收手。
// 資產：assets/creatures/hand_r.glb，經 creature-figures.js 的 cloneSkinnedGlb（同一份 glbCache＋SkeletonUtils.clone
//       ＋shareSkeletons）載入。四隻手共用一份材質（同一支 program），每隻 1 個 draw call；閒置時整隻不可見（0 call）。
import * as THREE from 'three';

const V = new URL(import.meta.url).search;
const { cloneSkinnedGlb } = await import('./creature-figures.js' + V);
const { HAND, buildRig, createHandDirector, dressColors } = await import('./hand-motion.js' + V);

/**
 * @param parent  掛進去的 Group（table-tray 的 group）
 * @param props   table-props 的 api（只用它的唯讀出口）
 * @param opts    { glbUrl }（治具可換資產路徑）
 */
export function createTableHands(parent, props, opts = {}) {
  const group = new THREE.Group();
  group.name = 'table-hands';
  parent.add(group);
  const url = opts.glbUrl || HAND.GLB;
  const hands = []; // { seat, holder, mesh, bones: {name: Bone} }
  let rig = null, director = null, frozen = false, disposed = false, shared = null, material = null, loadError = null, dressedGeo = null;

  const ready = Promise.all([0, 1, 2, 3].map(() => cloneSkinnedGlb(url))).then((clones) => {
    if (disposed) return;
    clones.forEach(({ model, shared: sh }, seat) => {
      let mesh = null; const bones = {};
      model.traverse((o) => { if (o.isSkinnedMesh) mesh = o; if (o.isBone) bones[o.name] = o; });
      if (!mesh) throw new Error('hand GLB 沒有 SkinnedMesh：' + url);
      /* 蒙皮變形後 bounding sphere 不準（同 creature-figures 的理由），不讓 three 把整隻手剔掉。 */
      mesh.frustumCulled = false;
      /* 四隻手共用一份材質與一份幾何（同一支 program、同一份 uniform）。第二輪：袖子改上色——
         幾何複製一份（不動 glbCache 那份）換成 RGBA 頂點色（dressColors），材質開 alphaHash：
         袖布以抖色漸隱，仍走不透明那一趟（不排序、寫深度、不多 draw call）。 */
      if (!material) {
        material = mesh.material.clone();
        material.alphaHash = true;
        dressedGeo = mesh.geometry.clone();
        const c = dressedGeo.attributes.color;
        dressedGeo.setAttribute('color', new THREE.BufferAttribute(dressColors(dressedGeo.attributes.position.array, c.array, c.itemSize), 4));
      }
      mesh.material = material; mesh.geometry = dressedGeo;
      const holder = new THREE.Group();
      holder.name = 'hand-' + seat;
      holder.rotation.order = 'YXZ'; // 與 hand-motion 的 xform 同序：先 yaw、再 pitch
      holder.visible = false; // 閒置＝收在畫面外（不可見，0 draw call）
      holder.add(model);
      group.add(holder);
      hands.push({ seat, holder, mesh, bones });
      if (seat === 0) shared = sh;
    });
    rig = buildRig(rigSource(hands[0].mesh));
    director = createHandDirector(props, rig);
  }).catch((e) => {
    /* GLB 載不到（404、離線、node 測試沒有 fetch 相對路徑）：手整組不上場，props 照舊——純演出不得拖垮牌桌。 */
    loadError = String(e && e.message || e);
    director = null;
  });

  /** 從載好的 SkinnedMesh 抽 hand-motion 要的原始陣列（bind 旋轉須為單位：anyCreature 產物如此，不是就停）。 */
  function rigSource(mesh) {
    const bones = mesh.skeleton.bones;
    for (const b of bones) if (Math.abs(b.quaternion.w - 1) > 1e-6) throw new Error('hand GLB 的 bind 旋轉不是單位四元數：' + b.name);
    const g = mesh.geometry.attributes;
    return {
      names: bones.map((b) => b.name),
      parents: bones.map((b) => bones.indexOf(b.parent)),
      rest: bones.map((b) => b.position.toArray()),
      positions: g.position.array, skinIndex: g.skinIndex.array, skinWeight: g.skinWeight.array,
    };
  }

  function apply(frames) {
    const s = HAND.SCALE * (props.mode() === 'P' ? HAND.SCALE_P : 1);
    for (const h of hands) {
      const fr = frames[h.seat];
      h.holder.visible = !!fr;
      if (!fr) continue;
      h.holder.position.set(fr.root[0], fr.root[1], fr.root[2]);
      h.holder.rotation.set(fr.pitch, fr.yaw, 0);
      h.holder.scale.setScalar(s);
      for (const name in h.bones) {
        const q = fr.quats[name];
        if (q) h.bones[name].quaternion.set(q[0], q[1], q[2], q[3]); else h.bones[name].quaternion.identity();
      }
    }
  }

  const api = {
    group,
    ready() { return ready; },
    bid(seat, slot, amount) { if (director) director.bid(seat, slot, amount); },
    mark(seat, slot) { if (director) director.mark(seat, slot); },
    reveal(slot, winner) { if (director) director.reveal(slot, winner); },
    /** 換一夜／熱座清場：立即收手。 */
    clear() { if (director) { director.clear(); apply([null, null, null, null]); } },
    /** 跳過：手直接到結束姿態（＝收回、不可見）。 */
    finish() { if (director) { director.finish(); apply([null, null, null, null]); } },
    update(dt) {
      if (!director) return;
      if (!frozen) director.update(dt);
      apply(director.frames());
    },
    /** 治具專用：凍結手的時間軸（量 draw call／效能時讓四隻手停在畫面上）。產品流程不呼叫。 */
    setFrozen(on) { frozen = !!on; },
    /** 治具／驗收出口（只讀）。 */
    stats() {
      const tris = hands.length ? hands[0].mesh.geometry.index.count / 3 : 0;
      return {
        loaded: !!director, loadError, url, hands: hands.length, trisPerHand: tris,
        visible: hands.filter((h) => h.holder.visible).map((h) => h.seat),
        bones: hands.length ? hands[0].mesh.skeleton.bones.length : 0,
        skeletons: new Set(hands.map((h) => h.mesh.skeleton)).size,
        materials: new Set(hands.map((h) => h.mesh.material)).size,
        shared, state: director ? director.state() : null, names: hands.map((h) => h.holder.name),
      };
    },
    dispose() {
      disposed = true;
      for (const h of hands) { group.remove(h.holder); if (h.mesh.skeleton) h.mesh.skeleton.dispose(); }
      /* 骨架是 clone 各自建的；glbCache 那份原始 geometry／material 不動（同 creature-figures 的規矩）。 */
      hands.length = 0; director = null;
      if (dressedGeo) dressedGeo.dispose(); if (material) material.dispose(); // 這兩份是本檔複製的，可以放
      if (group.parent) group.parent.remove(group);
    },
  };
  return api;
}

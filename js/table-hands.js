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
const { HAND, buildRig, createHandDirector, dressColors, buildRoleGeometry, roleVariantKey } = await import('./hand-motion.js' + V);
/* v0.59.7 中等寫實：每種手（預設＋三角色）換細分幾何＋程式生成皮膚材質，並乘各自的縮放倍率。 */
const HR = await import('./hand-realism.js' + V);

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
  /* 角色變體（階段三）：幾何只在 setSeats 時依角色建一次、以變體鍵快取；每幀（update／apply）絕不重算。variantBuilds 給測試與治具查。 */
  let baseSrc = null, pendingSeats = null, variantBuilds = 0;
  const variantGeos = new Map(); // 變體鍵 → 配件幾何陣列（buildRoleGeometry 的結果）
  const seatKey = [null, null, null, null];
  /* v0.59.7：寫實幾何／材質依「種類鍵」（default／三角色）快取，setSeats 時建一次；seatMul＝四席各自的縮放倍率。 */
  const realGeos = new Map(), realRigs = new Map(), seatRig = [null, null, null, null];
  let rigSrc0 = null, realMat = null;
  /* 全角色共用的縮放倍率（HAND.USER_SCALE，預設 1；網址 ?handscale= 可在試玩時暫時覆寫）。 */
  const userScale = (() => { const q = Number(new URLSearchParams((globalThis.location && globalThis.location.search) || '').get('handscale')); return q > 0 && q <= 2 ? q : HAND.USER_SCALE; })();
  const seatMul = [userScale, userScale, userScale, userScale];

  const ready = Promise.all([0, 1, 2, 3].map(() => cloneSkinnedGlb(url))).then((clones) => {
    if (disposed) return;
    clones.forEach(({ model, shared: sh }, seat) => {
      let mesh = null; const bones = {};
      model.traverse((o) => { if (o.isSkinnedMesh) mesh = o; if (o.isBone) bones[o.name] = o; });
      if (!mesh) throw new Error('hand GLB 沒有 SkinnedMesh：' + url);
      /* 蒙皮變形後 bounding sphere 不準（同 creature-figures 的理由），不讓 three 把整隻手剔掉。 */
      mesh.frustumCulled = false;
      /* 四隻手共用一份材質與一份幾何（同一支 program、同一份 uniform）。第二輪：袖子改上色——
         幾何複製一份（不動 glbCache 那份）換成 RGBA 頂點色（dressColors）。
         第三輪（使用者：袖尾抖色有顆粒）：改真透明平滑淡出——transparent＋頂點 alpha 混色，仍是一隻手一個 draw call；
         depthWrite 照開：手畫在透明那一趟（不透明物件已先畫好，混色正確），寫深度讓同一隻手的手指／掌不互相透；
         alphaTest 0.01 丟掉完全隱去的袖布，那段不寫深度、不擋後面晚畫的透明物（接觸陰影、粒子）。 */
      if (!material) {
        material = mesh.material.clone();
        material.transparent = true;
        material.depthWrite = true;
        material.alphaTest = 0.01;
        const g0 = mesh.geometry.attributes;
        baseSrc = { position: g0.position.array, normal: g0.normal.array, color: g0.color.array, colorSize: g0.color.itemSize, skinIndex: g0.skinIndex.array, skinWeight: g0.skinWeight.array, index: mesh.geometry.index.array };
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
    rigSrc0 = rigSource(hands[0].mesh);
    rig = buildRig(rigSrc0);
    /* v0.59.7：每席的縮放倍率與碰撞取樣骨架（＝該席寫實幾何的原手頂點：細分＋變粗變細後的真實位置，不是原 GLB 的 819 點）。 */
    director = createHandDirector(props, rig, { mul: (seat) => seatMul[seat], rig: (seat) => seatRig[seat] });
    /* GLB 還沒好時收到的席位，現在補上；沒收到也先套預設寫實手（v0.59.7：任何時候上場的手都是寫實版）。 */
    { const p = pendingSeats || []; pendingSeats = null; setSeats(p); }
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

  /** 某變體鍵的配件幾何（陣列版；buildRoleGeometry 用「預設」幾何的陣列算，手的解算 rig 不受配件影響）：沒有就建一次。
   *  v0.59.7：不再 new BufferGeometry（畫面上用的是 hand-realism 細分後的那份），只留陣列給寫實幾何用。 */
  function variantGeo(key) {
    let r = variantGeos.get(key);
    if (r) return r;
    r = buildRoleGeometry(rig, baseSrc, key);
    variantBuilds++;
    r.colorSize = 4;
    r.info = { key, extraVerts: r.extraVerts, extraTris: r.extraTris, recolored: r.recolored };
    variantGeos.set(key, r);
    return r;
  }

  /** 預設手的陣列版幾何（袖子上色後的 GLB 原幾何）。 */
  function dressedArr() {
    const a = dressedGeo.attributes;
    return { position: a.position.array, color: a.color.array, colorSize: a.color.itemSize, skinIndex: a.skinIndex.array, skinWeight: a.skinWeight.array, index: dressedGeo.index.array };
  }

  /** 角色 id 清單（與 props.setSeats 同一份資料：[{id, role}]）→ 四席各自的手。缺角色／未知角色／空清單＝預設手，不丟例外。 */
  function setSeats(list) {
    if (!hands.length || !rig) { pendingSeats = Array.isArray(list) ? list : []; return; }
    const roleOf = [null, null, null, null];
    if (Array.isArray(list)) for (const s of list) if (s && Number.isInteger(s.id) && s.id >= 0 && s.id < 4) roleOf[s.id] = s.role;
    for (const h of hands) {
      const key = roleVariantKey(roleOf[h.seat]);
      seatKey[h.seat] = key;
      /* 所有角色（含預設手）都走寫實版：先取 v0.59.6 的配件幾何（變體或預設），再細分＋重塑成這種手的寫實幾何。 */
      const real = HR.realDef(key);
      if (!realGeos.has(real.key)) {
        const src = key ? variantGeo(key) : dressedArr();
        realGeos.set(real.key, HR.realGeometry(rig, src, baseSrc.position.length / 3, real.key, HAND.SCALE * userScale, key ? src.info : null));
        if (!realMat) realMat = HR.makeSkinMaterial(material, HR.jointTable(rig));
        /* 碰撞取樣＝畫面上這隻手的全部頂點（細分＋重塑後的手、延長的前臂、配件），不是原 GLB 的 819 點。
           （試過只取原頂點＋配件以省一半成本：細分新增的邊中點會穿進錢柱，穿入測試轉紅，故全取。） */
        const ga = realGeos.get(real.key).attributes;
        realRigs.set(real.key, buildRig(Object.assign({}, rigSrc0, { positions: ga.position.array, skinIndex: ga.skinIndex.array, skinWeight: ga.skinWeight.array })));
      }
      h.mesh.geometry = realGeos.get(real.key); h.mesh.material = realMat; seatRig[h.seat] = realRigs.get(real.key);
    }
  }

  function apply(frames) {
    const s = HAND.SCALE * (props.mode() === 'P' ? HAND.SCALE_P : 1);
    for (const h of hands) {
      const fr = frames[h.seat];
      h.holder.visible = !!fr;
      if (!fr) continue;
      h.holder.position.set(fr.root[0], fr.root[1], fr.root[2]);
      h.holder.rotation.set(fr.pitch, fr.yaw, 0);
      h.holder.scale.setScalar(s * seatMul[h.seat]);
      for (const name in h.bones) {
        const q = fr.quats[name];
        if (q) h.bones[name].quaternion.set(q[0], q[1], q[2], q[3]); else h.bones[name].quaternion.identity();
      }
    }
  }

  const api = {
    group,
    setSeats,
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
        /* 第三輪：袖尾淡出方式（治具／測試核對用） */
        fade: material ? { transparent: material.transparent, alphaHash: !!material.alphaHash, alphaTest: material.alphaTest, depthWrite: material.depthWrite } : null,
        /* 階段三：角色變體（只讀） */
        variants: seatKey.slice(), variantBuilds,
        trisByHand: hands.map((h) => h.mesh.geometry.index.count / 3),
        variantInfo: hands.map((h) => h.mesh.geometry.userData.variant || null),
        /* v0.59.7：每席的寫實幾何資訊（種類、面數、前臂延長）、材質名與縮放倍率（只讀） */
        realInfo: hands.map((h) => h.mesh.geometry.userData.real || null),
        materialNames: hands.map((h) => h.mesh.material.name), seatMul: seatMul.slice(),
        geometries: new Set(hands.map((h) => h.mesh.geometry)).size,
        shared, state: director ? director.state() : null, names: hands.map((h) => h.holder.name),
      };
    },
    dispose() {
      disposed = true;
      for (const h of hands) { group.remove(h.holder); if (h.mesh.skeleton) h.mesh.skeleton.dispose(); }
      /* 骨架是 clone 各自建的；glbCache 那份原始 geometry／material 不動（同 creature-figures 的規矩）。 */
      hands.length = 0; director = null;
      variantGeos.clear();
      for (const g of realGeos.values()) g.dispose(); realGeos.clear();
      if (realMat) realMat.dispose();
      if (dressedGeo) dressedGeo.dispose(); if (material) material.dispose(); // 這兩份是本檔複製的，可以放
      if (group.parent) group.parent.remove(group);
    },
  };
  return api;
}

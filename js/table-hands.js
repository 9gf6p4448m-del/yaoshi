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
/* v0.59.7 中等寫實：每種手（預設＋三角色）換細分幾何＋程式生成皮膚材質；總開關 HAND.REAL_ON／網址 ?handreal=0（關＝v0.59.6 原樣）。 */
const HR = await import('./hand-realism.js' + V);

/**
 * @param parent  掛進去的 Group（table-tray 的 group）
 * @param props   table-props 的 api（只用它的唯讀出口）
 * @param opts    { glbUrl（治具可換資產路徑）, real（可省：強制開關寫實手）, itemNodes（可省：() => 拍品節點陣列，袖管避開拍品用） }
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
  /* v0.59.7：寫實幾何依「種類＋席」快取（每席一份：袖管每幀依相機重鋪，各席各寫各的）；碰撞取樣依種類快取。 */
  const realGeos = new Map(), realRigs = new Map(), seatRig = [null, null, null, null];
  let rigSrc0 = null, realMat = null;
  const q0 = new URLSearchParams((globalThis.location && globalThis.location.search) || '');
  /* 寫實總開關（修訂 4）：預設開；?handreal=0 或 HAND.REAL_ON=false ⇒ 整套回 v0.59.6 的手（幾何、材質、配件、縮放、解算逐項相同）。 */
  const realOn = opts.real !== undefined ? !!opts.real : (HAND.REAL_ON !== false && q0.get('handreal') !== '0');
  /* 全角色共用的縮放倍率（HAND.USER_SCALE，預設 1；網址 ?handscale= 可在試玩時暫時覆寫）。寫實關閉時固定 1。 */
  const userScale = (() => { if (!realOn) return 1; const q = Number(q0.get('handscale')); return q > 0 && q <= 2 ? q : HAND.USER_SCALE; })();
  const seatMul = [userScale, userScale, userScale, userScale];
  /* v0.61.0 批 1 身分變體（js/hand-b1.js）：寫實開著時預設啟用；?handb1=0 或 HAND.B1_ON=false（或 opts.b1=false）＝四角色退回預設手、
     不載入 hand-b1.js，整套與 v0.60.1 相同。 */
  const b1On = realOn && (opts.b1 !== undefined ? !!opts.b1 : (HAND.B1_ON !== false && q0.get('handb1') !== '0'));
  let B1 = null;
  /* v0.61.0 拍令牌拇指收角（HAND.SLAM_THUMB）：寫實開著時預設啟用；?thumb=0（或 opts.thumb=false、HAND.SLAM_THUMB.ON=false）退回舊姿勢。
     只換拍令牌的張開手（spreadT），推錢／收錢／停一拍不動。寫實關閉（?handreal=0）時一律舊姿勢（與 10-02 的舊手逐幀等價）。 */
  const thumbOn = realOn && (opts.thumb !== undefined ? !!opts.thumb : (HAND.SLAM_THUMB.ON !== false && q0.get('thumb') !== '0'));
  let frameBoxes = null, frameNo = -1; // 這一幀拍品在畫面上的外框（NDC），四隻手共用
  let lastView = null; // 最後一次畫手時的 renderer／相機（只給 stats() 量拍品外框）
  const ARM_DIR = ['bottom', 'top', 'left', 'right']; // 各席袖管方向（南下、北上、西左、東右；固定）

  let loading = Promise.all([0, 1, 2, 3].map(() => cloneSkinnedGlb(url)));
  /* 批 1 模組載不到（離線、node 測試的 data: 模組無法解析相對路徑）＝四角色退回預設手、照常上場（純演出不得拖垮牌桌）；原因記在 stats().b1Error。 */
  let b1Error = null;
  if (b1On) loading = loading.then((clones) => import('./hand-b1.js' + V).then((m) => { B1 = m; return clones; }, (e) => { b1Error = String((e && e.message) || e); return clones; }));
  const ready = loading.then((clones) => {
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
    for (const h of hands) h.mesh.onBeforeRender = (renderer, scene, camera) => { lastView = { renderer, camera }; }; // 只記相機給 stats()（開關兩邊都一樣，不影響畫面）
    if (realOn) {
      /* v0.59.7：每席的縮放倍率與碰撞取樣骨架（＝該種寫實手的原頂點＋配件，見 setSeats）。 */
      director = createHandDirector(props, rig, { mul: (seat) => seatMul[seat], rig: (seat) => seatRig[seat], slamPose: thumbOn ? 'spreadT' : undefined });
      /* 袖管（修訂 6）：建構時鋪好、方向固定（沿前臂延長線指回自己席位），不每幀重鋪。stats() 的拍品外框用上面記下的相機算
         （治具量條件 14 用；遊戲本身不用）。 */
      for (const h of hands) h.arm = { edge: ARM_DIR[h.seat], fixed: true };
      /* GLB 還沒好時收到的席位，現在補上；沒收到也先套預設寫實手（任何時候上場的手都是寫實版）。 */
      { const p = pendingSeats || []; pendingSeats = null; setSeats(p); }
    } else {
      director = createHandDirector(props, rig);
      if (pendingSeats) { const p = pendingSeats; pendingSeats = null; setSeats(p); } // GLB 還沒好時收到的席位，現在補上
    }
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

  /** 某變體鍵的配件幾何（buildRoleGeometry 用「預設」幾何的陣列算，手的解算 rig 不受配件影響）：沒有就建一次。
   *  寫實開：只留陣列給 hand-realism 細分（不 new BufferGeometry）；寫實關：v0.59.6 原樣的 BufferGeometry。 */
  function variantGeo(key) {
    let r = variantGeos.get(key);
    if (r) return r;
    const a = buildRoleGeometry(rig, baseSrc, key, { real: realOn });
    variantBuilds++;
    const info = { key, extraVerts: a.extraVerts, extraTris: a.extraTris, recolored: a.recolored };
    if (realOn) { r = a; r.colorSize = 4; r.info = info; }
    else {
      r = new THREE.BufferGeometry();
      r.setAttribute('position', new THREE.BufferAttribute(a.position, 3));
      r.setAttribute('normal', new THREE.BufferAttribute(a.normal, 3));
      r.setAttribute('color', new THREE.BufferAttribute(a.color, 4));
      r.setAttribute('skinIndex', new THREE.BufferAttribute(a.skinIndex, 4));
      r.setAttribute('skinWeight', new THREE.BufferAttribute(a.skinWeight, 4));
      r.setIndex(new THREE.BufferAttribute(a.index, 1));
      r.userData.variant = info;
    }
    variantGeos.set(key, r);
    return r;
  }

  /** 預設手的陣列版幾何（袖子上色後的 GLB 原幾何）。 */
  function dressedArr() {
    const a = dressedGeo.attributes;
    return { position: a.position.array, color: a.color.array, colorSize: a.color.itemSize, skinIndex: a.skinIndex.array, skinWeight: a.skinWeight.array, index: dressedGeo.index.array };
  }

  /** 拍品在畫面上的外框（NDC）。修訂 6 起只給 stats() 用（治具量袖管有沒有疊到拍品），遊戲每幀不算。 */
  function itemBoxes(renderer, camera) {
    /* 拍品外框每 6 幀重算一次（拍品只有微晃與揭盅時移動；外框只拿來挑袖管走哪一邊） */
    const f = renderer.info.render.frame;
    if (frameBoxes && f - frameNo < 6 && f >= frameNo) return frameBoxes;
    frameNo = f; frameBoxes = [];
    const nodes = opts.itemNodes ? opts.itemNodes() : [];
    const box = new THREE.Box3(), v = new THREE.Vector3();
    for (const n of nodes) {
      if (!n || !n.visible) continue;
      box.setFromObject(n); if (box.isEmpty()) continue;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let k = 0; k < 8; k++) { v.set(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).project(camera); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      frameBoxes.push({ x0, y0, x1, y1 });
    }
    return frameBoxes;
  }

  /** 角色 id 清單（與 props.setSeats 同一份資料：[{id, role}]）→ 四席各自的手。缺角色／未知角色／空清單＝預設手，不丟例外。 */
  function setSeats(list) {
    if (!hands.length || !rig) { pendingSeats = Array.isArray(list) ? list : []; return; }
    const roleOf = [null, null, null, null];
    if (Array.isArray(list)) for (const s of list) if (s && Number.isInteger(s.id) && s.id >= 0 && s.id < 4) roleOf[s.id] = s.role;
    for (const h of hands) {
      const key = roleVariantKey(roleOf[h.seat]);
      seatKey[h.seat] = key;
      if (!realOn) { h.mesh.geometry = key ? variantGeo(key) : dressedGeo; continue; } // v0.59.6 原樣
      if (B1) { // v0.61.0 批 1：所有席共用 8 種手的材質（既有四種手的分支與參數不變）；批 1 四角色換自己的幾何
        if (!realMat) realMat = B1.makeMaterial(material, HR.jointTable(rig));
        const bk = B1.keyOf(roleOf[h.seat]);
        if (bk) {
          seatKey[h.seat] = bk;
          const gk = 'b1:' + bk + '|' + h.seat;
          if (!realGeos.has(gk)) { variantBuilds++; realGeos.set(gk, HR.realGeometry(rig, B1.srcFor(baseSrc, bk), baseSrc.position.length / 3, bk, { key: bk, batch: 1 }, B1.extFor(rig, bk))); }
          if (!realRigs.has('b1:' + bk)) {
            const rg = realGeos.get(gk), ga = rg.attributes, na = rg.userData.real.arm[1];
            const R1 = buildRig(Object.assign({}, rigSrc0, { positions: ga.position.array.slice(0, na * 3), skinIndex: ga.skinIndex.array.slice(0, na * 4), skinWeight: ga.skinWeight.array.slice(0, na * 4) }));
            /* 長指甲：照樣進碰撞（不穿桌、不穿錢），但不當錨點——推／收對準的仍是指尖肉（不然收錢時錨點改由甲尖決定，南席手會往鏡頭移、被 HUD 擋住） */
            const cl = (rg.userData.b1parts || []).find((p) => p.name === '長指甲');
            if (cl) { const out = (v) => v < cl.from || v >= cl.to; R1.tips = R1.tips.filter(out); R1.rakeTips = R1.rakeTips.filter(out); }
            /* 效能（條件 10）：配件的平面著色把同一位置的頂點複製多份（錢的正反面、管的封口……）。碰撞與信物／伸入檢查只取每組「位置＋蒙皮權重完全相同」的
               第一個代表點——用到這些點集的地方（placeAt、grabLift、relicHit、reach）都是逐點取最大值或「有沒有任一點」，重複點不改變答案，擺位逐位元相同。
               只給批 1 的手；既有四種手的取樣不動。俯角掃描（coarse）與錨點（tips／palm）的點集也不動。 */
            { const rep = new Set(), seen = new Set(); for (let v = 0; v < na; v++) { const k = ga.position.array.slice(v * 3, v * 3 + 3).join(',') + '|' + ga.skinIndex.array.slice(v * 4, v * 4 + 4).join(',') + '|' + ga.skinWeight.array.slice(v * 4, v * 4 + 4).join(','); if (!seen.has(k)) { seen.add(k); rep.add(v); } }
              R1.collide = [...rep]; R1.seen = R1.seen.filter((v) => rep.has(v)); R1.front = R1.front.filter((v) => rep.has(v)); }
            realRigs.set('b1:' + bk, R1);
          }
          h.mesh.geometry = realGeos.get(gk); h.mesh.material = realMat; seatRig[h.seat] = realRigs.get('b1:' + bk);
          continue;
        }
      }
      /* 所有角色（含預設手）都走寫實版：先取配件幾何（變體或預設），再細分＋重塑成這種手的寫實幾何。 */
      const real = HR.realDef(key), gk = real.key + '|' + h.seat;
      if (!realGeos.has(gk)) {
        const src = key ? variantGeo(key) : dressedArr();
        realGeos.set(gk, HR.realGeometry(rig, src, baseSrc.position.length / 3, real.key, key ? src.info : null));
        if (!realMat) realMat = HR.makeSkinMaterial(material, HR.jointTable(rig));
      }
      if (!realRigs.has(real.key)) {
        /* 碰撞取樣＝這種手畫面上的頂點（細分＋重塑後的手、配件），不是原 GLB 的 819 點；袖管（修訂 6 起固定不動）也進取樣。
           （修訂 4 試過只取原頂點＋配件、以外擴補細分邊中點：動作中 CPU p95 降到 4.1 ms，但外擴讓勝方「停一拍」的手墊高、
           遮擋閘「收」升到 10.3–11.8%＞10%，條件 5 不放寬 ⇒ 撤回，取全部頂點；效能退路是 ?handreal=0。） */
        /* 修訂 6：袖管建構後就不動（跟著 Elbow 骨走），所以也進碰撞取樣——地板／錢柱／信物避讓都看得到它。 */
        const rg = realGeos.get(gk), ga = rg.attributes, na = rg.userData.real.arm[1];
        realRigs.set(real.key, buildRig(Object.assign({}, rigSrc0, { positions: ga.position.array.slice(0, na * 3), skinIndex: ga.skinIndex.array.slice(0, na * 4), skinWeight: ga.skinWeight.array.slice(0, na * 4) })));
      }
      h.mesh.geometry = realGeos.get(gk); h.mesh.material = realMat; seatRig[h.seat] = realRigs.get(real.key);
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
    /** 手已載好（director 在）＝抓取演出可上場；GLB 沒到或 404 時 false，table-tray 退回舊拋物線。 */
    loaded() { return !!director; },
    bid(seat, slot, amount) { if (director) director.bid(seat, slot, amount); },
    mark(seat, slot) { if (director) director.mark(seat, slot); },
    reveal(slot, winner) { if (director) director.reveal(slot, winner); },
    /** v0.60.0 抓取類動作（得標抓回／詛咒推按）：table-tray 的抓取腳本每幀給這一席的擺位規格；null＝這一席抓取結束（收、不可見）。 */
    grab(seat, spec) { if (director) director.grab(seat, spec); },
    /** 這一席最近一幀抓取擺位被抓取專用可達往上抬了多少（被抓的法寶跟著抬）；沒在抓＝0。 */
    liftOf(seat) { return director ? director.liftOf(seat) : 0; },
    /** 治具出口（只讀）：抓取抬升由哪條規則決定。 */
    liftWhy(seat) { return director ? director.liftWhy(seat) : null; },
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
        variants: seatKey.slice(), variantBuilds, real: realOn, b1: !!B1, b1Error, thumb: thumbOn, realGeoCount: realGeos.size, arms: hands.map((h) => h.arm || null), itemBoxes: lastView ? itemBoxes(lastView.renderer, lastView.camera).slice() : null,
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
      for (const g of variantGeos.values()) if (g.dispose) g.dispose(); variantGeos.clear();
      for (const g of realGeos.values()) g.dispose(); realGeos.clear();
      if (realMat) realMat.dispose();
      if (dressedGeo) dressedGeo.dispose(); if (material) material.dispose(); // 這兩份是本檔複製的，可以放
      if (group.parent) group.parent.remove(group);
    },
  };
  return api;
}

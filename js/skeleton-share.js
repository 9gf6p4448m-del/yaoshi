// 同一尊裡共用骨架（A1 效能，2026-09-17）。
// SkeletonUtils.clone 對每顆 SkinnedMesh 各重建一副 Skeleton，即使它們指向同一組 Bone 物件、
// 同一組 boneInverses——結果是一尊 13 顆網格每幀做 13 次 skeleton.update() 並上傳 13 張骨骼貼圖
// （真實頁面實測：4 尊共 51 副骨架、每幀 51 次 texSubImage2D，但只有 5 組不同的骨頭集合）。
// 骨頭陣列逐項同物件、boneInverses 逐項相等的網格，其 boneMatrices 必然逐位元組相同，
// 所以讓它們共用第一副 Skeleton，其餘多出來的骨架釋放（此時尚未渲染、boneTexture 仍為 null）。
// 只在單一 root 內比對，不跨實例；骨頭集合不同的網格照舊各自持有。本檔不依賴 three。
export function shareSkeletons(root) {
  const canon = [];
  const same = (a, b) => a.bones.length === b.bones.length && a.boneInverses.length === b.boneInverses.length
    && a.bones.every((bone, i) => bone === b.bones[i]) && a.boneInverses.every((m, i) => m.equals(b.boneInverses[i]));
  let merged = 0;
  root.traverse(o => {
    if (!o.isSkinnedMesh || !o.skeleton) return;
    if (canon.includes(o.skeleton)) return;
    const shared = canon.find(sk => same(sk, o.skeleton));
    if (!shared) { canon.push(o.skeleton); return; }
    const orphan = o.skeleton;
    o.bind(shared, o.bindMatrix);
    if (typeof orphan.dispose === 'function') orphan.dispose();
    merged++;
  });
  return { skeletons: canon.length, merged };
}

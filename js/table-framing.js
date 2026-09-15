// Screen-space placement for the tabletop presentation; never changes world scale.
export function placeSubject(subject, area, obstacles) {
  const valid = r => r && ['left', 'top', 'right', 'bottom'].every(k => Number.isFinite(r[k]))
    && r.right > r.left && r.bottom > r.top;
  if (!valid(subject) || !valid(area) || !obstacles.every(valid)) return null;
  const xs = [0, area.left - subject.left, area.right - subject.right];
  const ys = [0, area.top - subject.top, area.bottom - subject.bottom];
  for (const o of obstacles) {
    xs.push(o.left - subject.right, o.right - subject.left);
    ys.push(o.top - subject.bottom, o.bottom - subject.top);
  }
  let best = null, distance = Infinity;
  // The nearest point of each free rectangle is either unchanged or flush with
  // a viewport/HUD edge. Enumerating these candidates avoids pixel-step searches.
  for (const x of xs) for (const y of ys) {
    const r = { left: subject.left + x, right: subject.right + x,
      top: subject.top + y, bottom: subject.bottom + y };
    if (r.left < area.left || r.right > area.right || r.top < area.top || r.bottom > area.bottom) continue;
    if (obstacles.some(o => r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top)) continue;
    const d = x * x + y * y;
    if (d < distance) { distance = d; best = { x, y }; }
  }
  return best;
}

/** Keep the flight in the camera plane through its launch point. The destination
 * still supplies its direction; it cannot bring the model into the near lens. */
export function keepFlightDepth(node, from, camera) {
  camera.updateMatrixWorld(true);
  const start = node.position.clone().copy(from);
  const position = node.position.clone();
  if (node.parent) { node.parent.updateWorldMatrix(true, false); node.parent.localToWorld(start); node.parent.localToWorld(position); }
  start.applyMatrix4(camera.matrixWorldInverse);
  position.applyMatrix4(camera.matrixWorldInverse);
  position.z = start.z;
  position.applyMatrix4(camera.matrixWorld);
  if (node.parent) node.parent.worldToLocal(position);
  node.position.copy(position);
}

/** Actual visible geometry, including animated transforms; hidden outlines do
 * not enlarge the subject. Null means absent geometry, never successful framing. */
function subjectCorners(node) {
  if (Array.isArray(node)) {
    const groups = node.map(subjectCorners);
    return groups.length && groups.every(Boolean) ? groups.flat() : null;
  }
  for (let parent = node; parent; parent = parent.parent) if (!parent.visible) return null;
  node.updateWorldMatrix(true, true);
  const points = [];
  node.traverseVisible(mesh => {
    if (!mesh.geometry || (!mesh.isMesh && !mesh.isPoints)) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (mesh.isSkinnedMesh) {
      mesh.skeleton.update();
      mesh.computeBoundingBox();
    }
    // Include both the current skin pose and its source bounds. This preserves
    // the existing capture contract and gives animation a conservative envelope.
    const box = mesh.isSkinnedMesh ? mesh.boundingBox.clone().union(mesh.geometry.boundingBox) : mesh.geometry.boundingBox;
    if (!box || box.isEmpty()) return;
    for (let k = 0; k < 8; k++) {
      points.push(node.position.clone().set(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y,
        k & 4 ? box.max.z : box.min.z).applyMatrix4(mesh.matrixWorld));
    }
  });
  return points.length ? points : null;
}

function projectCorners(points, camera, width, height) {
  if (!points) return null;
  camera.updateMatrixWorld(true);
  const point = points[0].clone();
  const result = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  for (const world of points) {
    point.copy(world).project(camera);
    if (!Number.isFinite(point.z) || point.z < -1 || point.z > 1) return null;
    const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
    result.left = Math.min(result.left, x); result.right = Math.max(result.right, x);
    result.top = Math.min(result.top, y); result.bottom = Math.max(result.bottom, y);
  }
  return result;
}

export function projectSubject(node, camera, width, height) {
  return projectCorners(subjectCorners(node), camera, width, height);
}

/** The authored shot is the closest allowed camera. Retreat only as much as
 * needed to fit the intact model, then shift the principal point into the HUD
 * opening. Approved for A1 on 2026-09-15; fov and model scale stay unchanged. */
export function fitSubject(node, camera, area, obstacles, width, height) {
  const base = camera.position.clone();
  const axis = base.clone().set(0, 0, 1).applyQuaternion(camera.quaternion);
  // Skinning and world transforms are sampled once; the retreat search only
  // reprojects these points instead of recomputing every bone on every trial.
  const corners = subjectCorners(node);
  camera.clearViewOffset();
  const evaluate = retreat => {
    camera.position.copy(base).addScaledVector(axis, retreat);
    const bounds = projectCorners(corners, camera, width, height);
    const shift = bounds && placeSubject(bounds, area, obstacles);
    return shift ? { bounds, shift } : null;
  };
  let retreat = 0, fit = evaluate(0);
  if (!fit) {
    let low = 0, high = .25;
    while (high <= 32 && !evaluate(high)) { low = high; high *= 2; }
    if (high > 32) { camera.position.copy(base); camera.updateMatrixWorld(true); return { fit: false, reason: 'no-safe-framing' }; }
    for (let i = 0; i < 12; i++) {
      const mid = (low + high) / 2;
      if (evaluate(mid)) high = mid; else low = mid;
    }
    retreat = high; fit = evaluate(retreat);
  }
  // Positive view offsets move the image left/up: use the inverse of the
  // desired screen displacement. The canvas and raycaster share this camera.
  camera.setViewOffset(width, height, -fit.shift.x, -fit.shift.y, width, height);
  return { fit: true, retreat, shift: fit.shift, bounds: projectCorners(corners, camera, width, height) };
}

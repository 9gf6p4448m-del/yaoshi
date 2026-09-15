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

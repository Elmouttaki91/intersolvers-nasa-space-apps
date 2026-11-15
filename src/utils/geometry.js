// Small, dependency-free helpers for routes and polygons (grid units = 1 m).

export function routeGeometry(path) {
  const cum = new Float32Array(path.length);
  for (let i = 1; i < path.length; i++) {
    cum[i] = cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  }
  return { cum, total: cum[cum.length - 1] || 0 };
}

// Interpolated position (col,row) and nearest step index at distance m along the route.
export function positionAt(path, cum, m) {
  const n = path.length;
  if (n === 0) return null;
  if (m <= 0) return { col: path[0][0], row: path[0][1], i: 0 };
  if (m >= cum[n - 1]) return { col: path[n - 1][0], row: path[n - 1][1], i: n - 1 };
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= m) lo = mid; else hi = mid;
  }
  const t = (m - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo]);
  return {
    col: path[lo][0] + (path[hi][0] - path[lo][0]) * t,
    row: path[lo][1] + (path[hi][1] - path[lo][1]) * t,
    i: t > 0.5 ? hi : lo,
  };
}

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Which geologic unit (if any) contains this cell. Polygons are [col,row] rings (first = outer).
export function geologyAt(features, col, row) {
  for (const f of features) {
    for (const poly of f.polys) {
      if (inRing(col, row, poly[0]) && !poly.slice(1).some((h) => inRing(col, row, h))) return f;
    }
  }
  return null;
}

export function centroid(feature) {
  const ring = feature.polys[0][0];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of ring) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

export function niceLength(maxMeters) {
  const steps = [1, 2, 5, 10, 20, 50, 100, 200];
  let best = steps[0];
  for (const s of steps) if (s <= maxMeters) best = s;
  return best;
}

import { useRef } from 'react';
import { HAZARD, gradeClass } from '../data/marsData';

// Elevation along the walk, with the terrain class under the boots as a strip below.
export default function ElevationProfile({ route, cum, total, walkM, onScrub }) {
  const ref = useRef(null);
  const n = route.path.length;
  const elev = [];
  let last = route.elev.find((e) => e != null) ?? 0;
  for (const e of route.elev) { last = e ?? last; elev.push(last); }
  const lo = Math.min(...elev), hi = Math.max(...elev), span = Math.max(0.5, hi - lo);
  const X = (i) => (cum[i] / total) * 1000;
  const Y = (e) => 8 + (1 - (e - lo) / span) * 70;

  let line = `M0 ${Y(elev[0]).toFixed(1)}`;
  for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 500))) line += ` L${X(i).toFixed(1)} ${Y(elev[i]).toFixed(1)}`;
  line += ` L1000 ${Y(elev[n - 1]).toFixed(1)}`;
  const area = `${line} L1000 90 L0 90 Z`;

  const strip = [];
  let s = 0, cur = gradeClass(route.slope[0]);
  for (let i = 1; i <= n; i++) {
    const c = i < n ? gradeClass(route.slope[i]) : null;
    if (c !== cur) { strip.push({ x: X(s), w: Math.max(1.2, X(Math.min(i, n - 1)) - X(s)), c: cur }); s = i; cur = c; }
  }

  const scrub = (e) => {
    const r = ref.current.getBoundingClientRect();
    onScrub(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * total);
  };
  const cx = total ? (walkM / total) * 1000 : 0;

  return (
    <div className="profile" role="slider" tabIndex={0} aria-label="Position along the route" aria-valuemin={0} aria-valuemax={Math.round(total)} aria-valuenow={Math.round(walkM)}
         onKeyDown={(e) => { if (e.key === 'ArrowRight') onScrub(Math.min(total, walkM + 5)); if (e.key === 'ArrowLeft') onScrub(Math.max(0, walkM - 5)); }}>
      <svg ref={ref} viewBox="0 0 1000 100" preserveAspectRatio="none"
           onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e); }}
           onPointerMove={(e) => { if (e.buttons) scrub(e); }}>
        <defs>
          <linearGradient id="ef" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2467FF" stopOpacity=".9" /><stop offset="1" stopColor="#2467FF" stopOpacity=".12" /></linearGradient>
        </defs>
        <path d={area} fill="url(#ef)" />
        <path d={line} fill="none" stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {strip.map((r, i) => <rect key={i} x={r.x} y="90" width={r.w} height="10" fill={HAZARD[r.c].color} />)}
        <line x1={cx} x2={cx} y1="0" y2="100" stroke="#E6FF2E" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="profile-y top">{hi.toFixed(1)} m</span>
      <span className="profile-y bot">{lo.toFixed(1)} m</span>
    </div>
  );
}

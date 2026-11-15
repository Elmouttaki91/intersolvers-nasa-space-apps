import { useEffect, useMemo, useRef } from 'react';
import { HAZARD, STRATEGIES, gradeClass } from '../data/marsData';
import { centroid, niceLength } from '../utils/geometry';

const NEON = '#E6FF2E';

export default function MarsMap(props) {
  const { data, images, probe, onHover, onPick } = props;
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const view = useRef({ scale: 1, tx: 0, ty: 0, ready: false, fit: 1 });
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const propsRef = useRef(props);
  const raf = useRef(0);
  const labels = useMemo(() => data.geology.map((f) => ({ id: f.id, c: centroid(f) })), [data]);

  propsRef.current = props;
  const requestDraw = () => { if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; draw(); }); };
  useEffect(requestDraw); // redraw whenever React re-renders with new props

  // ---------------------------------------------------------------- sizing + gestures
  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      size.current = { w: r.width, h: r.height, dpr };
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      const fit = Math.min(r.width / data.W, r.height / data.H) * 0.96;
      const v = view.current;
      if (!v.ready) { v.scale = fit; v.tx = (r.width - data.W * fit) / 2; v.ty = (r.height - data.H * fit) / 2; v.ready = true; }
      v.fit = fit;
      requestDraw();
    };
    const ro = new ResizeObserver(resize); ro.observe(wrap); resize();

    const zoomAt = (sx, sy, factor) => {
      const v = view.current;
      const next = Math.min(16, Math.max(v.fit * 0.7, v.scale * factor));
      const k = next / v.scale;
      v.tx = sx - (sx - v.tx) * k; v.ty = sy - (sy - v.ty) * k; v.scale = next; requestDraw();
    };
    const onWheel = (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0016));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const ptrs = new Map(); let moved = 0, pinch = 0;
    const cell = (e) => {
      const r = canvas.getBoundingClientRect(), v = view.current;
      return [Math.floor((e.clientX - r.left - v.tx) / v.scale), Math.floor((e.clientY - r.top - v.ty) / v.scale)];
    };
    const down = (e) => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; pinch = 0; };
    const move = (e) => {
      const v = view.current;
      if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse') { const [c, r] = cell(e); propsRef.current.onHover(c, r); } return; }
      const prev = ptrs.get(e.pointerId);
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 1) {
        const dx = e.clientX - prev[0], dy = e.clientY - prev[1];
        moved += Math.abs(dx) + Math.abs(dy);
        v.tx += dx; v.ty += dy; requestDraw();
      } else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const r = canvas.getBoundingClientRect();
        if (pinch) zoomAt((a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, d / pinch);
        pinch = d; moved = 99;
      }
    };
    const up = (e) => {
      if (ptrs.has(e.pointerId) && ptrs.size === 1 && moved < 6) { const [c, r] = cell(e); propsRef.current.onPick(c, r); }
      ptrs.delete(e.pointerId); pinch = 0;
    };
    const leave = () => { if (!ptrs.size) propsRef.current.onHover(null, null); };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('pointerleave', leave);
    return () => {
      ro.disconnect(); canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(raf.current); raf.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // keyboard: arrows pan, +/- zoom, 0 reset
  const onKey = (e) => {
    const v = view.current, s = 40;
    if (e.key === 'ArrowLeft') v.tx += s; else if (e.key === 'ArrowRight') v.tx -= s;
    else if (e.key === 'ArrowUp') v.ty += s; else if (e.key === 'ArrowDown') v.ty -= s;
    else if (e.key === '+' || e.key === '=') zoomCenter(1.25); else if (e.key === '-') zoomCenter(0.8);
    else if (e.key === '0') { v.ready = false; v.scale = v.fit; v.tx = (size.current.w - data.W * v.fit) / 2; v.ty = (size.current.h - data.H * v.fit) / 2; v.ready = true; }
    else return;
    e.preventDefault(); requestDraw();
  };
  const zoomCenter = (f) => {
    const v = view.current, { w, h } = size.current;
    const next = Math.min(16, Math.max(v.fit * 0.7, v.scale * f)), k = next / v.scale;
    v.tx = w / 2 - (w / 2 - v.tx) * k; v.ty = h / 2 - (h / 2 - v.ty) * k; v.scale = next;
  };

  // ---------------------------------------------------------------- drawing
  function draw() {
    const canvas = canvasRef.current; if (!canvas) return;
    const p = propsRef.current, v = view.current, { w, h, dpr } = size.current;
    if (!w) return;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#030a2a'; ctx.fillRect(0, 0, w, h);

    if (p.follow && p.walker) { v.tx = w / 2 - (p.walker.col + 0.5) * v.scale; v.ty = h / 2 - (p.walker.row + 0.5) * v.scale; }

    const { scale: s } = v;
    ctx.save(); ctx.translate(v.tx, v.ty); ctx.scale(s, s);
    ctx.imageSmoothingEnabled = s < 3.5;
    const base = images[p.baseLayer];
    ctx.drawImage(base, 0, 0);
    if (p.compareLayer && images[p.compareLayer]) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, data.W * p.compareAmount, data.H); ctx.clip();
      ctx.drawImage(images[p.compareLayer], 0, 0); ctx.restore();
    }
    if (p.overlays.hazard) { ctx.globalAlpha = p.overlays.hazardOpacity; ctx.drawImage(images.hazard, 0, 0); ctx.globalAlpha = 1; }

    // overlays live on cell centres
    ctx.translate(0.5, 0.5);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    if (p.overlays.geology) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.3 / s; ctx.setLineDash([5 / s, 3 / s]);
      for (const f of data.geology) for (const poly of f.polys) for (const ring of poly) {
        ctx.beginPath(); ring.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // comparison routes: thin, in their strategy colour
    for (const r of p.routes) {
      if (r.strategy === p.activeStrategy) continue;
      stroke(ctx, r.route.path, 'rgba(3,10,42,.8)', 4 / s);
      stroke(ctx, r.route.path, STRATEGIES[r.strategy].color, 2.2 / s, r.strategy === 'Shortest distance' ? [6 / s, 4 / s] : null);
    }
    // the active route: a ribbon coloured by terrain class under the boots
    const act = p.routes.find((r) => r.strategy === p.activeStrategy);
    if (act) {
      const path = act.route.path, sl = act.route.slope;
      stroke(ctx, path, 'rgba(3,10,42,.92)', 8 / s);
      let start = 0, cur = gradeClass(sl[0]);
      for (let i = 1; i <= path.length; i++) {
        const c = i < path.length ? gradeClass(sl[i]) : null;
        if (c !== cur) {
          ctx.strokeStyle = HAZARD[cur].color; ctx.lineWidth = 4.6 / s; ctx.beginPath();
          for (let k = Math.max(0, start - 1); k < i; k++) (k === Math.max(0, start - 1) ? ctx.moveTo(path[k][0], path[k][1]) : ctx.lineTo(path[k][0], path[k][1]));
          ctx.stroke(); start = i; cur = c;
        }
      }
    }

    // start and goal
    const j = p.journey;
    if (j) for (const [pt, color] of [[j.start, '#FFFFFF'], [j.goal, NEON]]) {
      ctx.fillStyle = '#030a2a'; ctx.beginPath(); ctx.arc(pt[0], pt[1], 8 / s, 0, 6.3); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(pt[0], pt[1], 5 / s, 0, 6.3); ctx.fill();
    }

    // the astronaut
    if (p.walker) {
      const { col, row } = p.walker;
      ctx.fillStyle = 'rgba(230,255,46,.22)'; ctx.beginPath(); ctx.arc(col, row, 16 / s, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#030a2a'; ctx.beginPath(); ctx.arc(col, row, 9 / s, 0, 6.3); ctx.fill();
      ctx.strokeStyle = NEON; ctx.lineWidth = 2.6 / s; ctx.beginPath(); ctx.arc(col, row, 9 / s, 0, 6.3); ctx.stroke();
      ctx.fillStyle = NEON; ctx.beginPath(); ctx.arc(col, row, 3.6 / s, 0, 6.3); ctx.fill();
    }
    ctx.restore();

    // ---- screen-space annotations
    const toS = (x, y) => [v.tx + (x + 0.5) * s, v.ty + (y + 0.5) * s];
    ctx.font = '700 12px "Fira Sans", system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const tag = (text, x, y, color = '#fff') => {
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(3,10,42,.9)'; ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
    };
    if (p.overlays.geology && s >= 1.5) {
      ctx.textAlign = 'center';
      for (const l of labels) { const [x, y] = toS(l.c[0], l.c[1]); if (x > -30 && y > -30 && x < w + 30 && y < h + 30) tag(l.id, x, y); }
    }
    if (j) {
      ctx.textAlign = 'left';
      let [x, y] = toS(j.start[0], j.start[1]); tag('Start', x + 12, y - 12);
      [x, y] = toS(j.goal[0], j.goal[1]); tag('Goal', x + 12, y - 12, NEON);
    }
    if (p.probe) {
      const [x, y] = toS(p.probe.col, p.probe.row);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(x - 14, y); ctx.lineTo(x - 5, y); ctx.moveTo(x + 5, y); ctx.lineTo(x + 14, y);
      ctx.moveTo(x, y - 14); ctx.lineTo(x, y - 5); ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 14); ctx.stroke();
    }
    // scale bar (1 cell = 1 m)
    const m = niceLength(130 / s), len = m * s, bx = 16, by = h - 18;
    ctx.fillStyle = 'rgba(3,10,42,.8)'; ctx.fillRect(bx - 8, by - 20, len + 16, 30);
    ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, len, 3); ctx.fillRect(bx, by - 5, 2, 8); ctx.fillRect(bx + len - 2, by - 5, 2, 8);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(`${m} m`, bx, by - 11);
  }

  return (
    <div className="map" ref={wrapRef}>
      <canvas ref={canvasRef} tabIndex={0} onKeyDown={onKey} className="map-canvas"
              aria-label="Interactive map of Murray Buttes. Arrow keys pan, plus and minus zoom, zero resets." />
    </div>
  );
}

function stroke(ctx, path, color, width, dash) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
  ctx.beginPath(); path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
}

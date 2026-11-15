// Draws a shareable PNG card for the active route (the "instant share moment").
import { HAZARD, MODEL_SPEED, gradeClass } from '../data/marsData';
import { fmtTime, fmt, signed } from './format';

export async function downloadSummaryCard({ images, data, journeyKey, strategy, route, journey }) {
  try { await document.fonts?.ready; } catch { /* fonts optional */ }
  const W = 1200, H = 675, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2467FF'); g.addColorStop(1, '#071A57');
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  // map panel
  const S = 600, mx = 40, my = 38, sc = S / data.H;
  x.save(); x.beginPath(); x.rect(mx, my, S, S); x.clip();
  x.drawImage(images.optical, mx, my, data.W * sc, data.H * sc);
  x.globalAlpha = 0.5; x.drawImage(images.hazard, mx, my, data.W * sc, data.H * sc); x.globalAlpha = 1;
  const P = (p) => [mx + (p[0] + 0.5) * sc, my + (p[1] + 0.5) * sc];
  const path = route.path;
  x.lineJoin = x.lineCap = 'round'; x.strokeStyle = 'rgba(3,10,42,.9)'; x.lineWidth = 8; x.beginPath();
  path.forEach((p, i) => { const [a, b] = P(p); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.stroke();
  x.lineWidth = 4.5;
  for (let i = 1; i < path.length; i++) {
    x.strokeStyle = HAZARD[gradeClass(route.slope[i])].color; x.beginPath();
    const [a, b] = P(path[i - 1]), [d, e] = P(path[i]); x.moveTo(a, b); x.lineTo(d, e); x.stroke();
  }
  for (const [pt, col] of [[journey.start, '#fff'], [journey.goal, '#E6FF2E']]) {
    const [a, b] = P(pt); x.fillStyle = '#030a2a'; x.beginPath(); x.arc(a, b, 10, 0, 7); x.fill(); x.fillStyle = col; x.beginPath(); x.arc(a, b, 6.5, 0, 7); x.fill();
  }
  x.restore();
  x.strokeStyle = '#E6FF2E'; x.lineWidth = 3; x.strokeRect(mx, my, S, S);

  // text panel
  const tx = 690, F = (w, s) => `${w} ${s}px "Fira Sans", system-ui, sans-serif`, O = (s) => `400 ${s}px Overpass, system-ui, sans-serif`;
  x.fillStyle = '#fff'; x.font = F(800, 46); x.fillText('Marswalk route card', tx, 92);
  x.font = O(22); x.fillStyle = '#C9D6FF'; x.fillText(`Murray Buttes · ${journeyKey} · ${strategy}`, tx, 130);
  const stats = [
    [fmt(route.distance_m, 0) + ' m', 'distance'],
    [fmtTime(route.distance_m / MODEL_SPEED), `walk time at ${MODEL_SPEED} m/s`],
    [fmt(route.energy_kJ, 0) + ' kJ', 'modelled walking energy'],
    [fmt(route.max_grade * 100, 0) + '%', 'steepest grade'],
  ];
  stats.forEach(([v, l], i) => {
    const y = 215 + i * 78; x.fillStyle = '#E6FF2E'; x.font = F(800, 44); x.fillText(v, tx, y);
    x.fillStyle = '#fff'; x.font = O(22); x.fillText(l, tx + 230, y - 4);
  });
  const best = journey.routes['Minimum energy'], short = journey.routes['Shortest distance'];
  const wrap = (text, y, lh, max = 470) => {
    let line = '';
    for (const word of text.split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (x.measureText(t).width > max && line) { x.fillText(line, tx, y); y += lh; line = word; } else line = t;
    }
    x.fillText(line, tx, y); return y + lh;
  };
  let y = 508;
  if (best && short && short.energy_kJ > best.energy_kJ + 0.05) {
    x.fillStyle = '#fff'; x.font = F(600, 22);
    y = wrap(`The shortest line saves ${fmt(best.distance_m - short.distance_m, 0)} m and costs ${signed(short.energy_increase_pct, 0)}% more energy.`, y, 28);
  }
  x.fillStyle = '#C9D6FF'; x.font = O(16);
  y = wrap('Measured: HiRISE imagery, MSL Gale DEM, THEMIS. Modelled: slope, roughness, routes, energy. A planning aid from a research model, not a safety certification.', y + 6, 21);
  x.fillStyle = '#E6FF2E'; x.font = F(700, 20); x.fillText('Intersolvers · NASA Space Apps 2026', tx, 656);

  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `marswalk-${journeyKey.replace(' ', '-').toLowerCase()}-${strategy.replace(/\s+/g, '-').toLowerCase()}.png`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

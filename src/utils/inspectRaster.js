// Turns a raw cell sample into words an astronaut can act on.
import { HAZARD } from '../data/marsData';

export function hazardVerdict(cell) {
  if (!cell) return null;
  const h = HAZARD[cell.hazard];
  const reasons = [];
  if (!cell.valid) reasons.push('no valid terrain data');
  if (cell.slope != null && cell.slope > 24.2) reasons.push(`slope ${cell.slope.toFixed(0)}° passes the 45 % grade limit`);
  else if (cell.slope != null && cell.slope > 15) reasons.push(`slope ${cell.slope.toFixed(0)}°`);
  if (cell.roughnessMm != null && cell.roughnessMm > 30.25) reasons.push(`rough ground (${cell.roughnessMm} mm)`);
  if (cell.butte) reasons.push(`on butte ${cell.butte}`);
  if (cell.hazard === 'artifact') reasons.push('suspected DEM artefact');
  return { ...h, key: cell.hazard, reasons };
}

// Debug helper: log any sample from the browser console, e.g. window.__mars.sample(200, 200)
export function describeCell(cell) {
  const v = hazardVerdict(cell);
  return v ? `${v.label}: ${v.reasons.join(', ') || 'within limits'}` : 'Outside the mapped area';
}

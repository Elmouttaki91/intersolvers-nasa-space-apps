import { useEffect, useRef } from 'react';
import { fmt, signed } from '../utils/format';

// The story: one crew, one route, one danger avoided. Numbers come straight from the data.
export default function Briefing({ data, onStart, onClose }) {
  const j = data.journeys['Journey 1'].routes;
  const best = j['Minimum energy'], short = j['Shortest distance'];
  const mc = short.mc['Correlated 2 cm'];
  const stats = data.meta.hazard_stats;
  const btn = useRef(null);
  useEffect(() => { btn.current?.focus(); const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="brief-h">
      <div className="brief chamfer">
        <div className="brief-body">
          <h2 id="brief-h">One astronaut. {fmt(best.distance_m, 0)} metres of broken ground. One line that holds up.</h2>
          <p>
            Murray Buttes, in Gale crater, is a field of eroded rock towers. From orbit, the straight line across it looks fine.
            At one-metre resolution it climbs slopes of <b>{fmt(short.max_grade * 100, 0)}%</b>, burns <b>{signed(short.energy_increase_pct, 0)}% more energy</b> than
            our best route, and in <b>{mc.invalid} of {mc.valid + mc.invalid}</b> simulated elevation-error runs it crosses ground the model rules out.
          </p>
          <p>
            This map stacks HiRISE imagery, a Gale DEM and THEMIS thermal data, adds slope, roughness and texture derived from them, and
            replays the walk step by step. Across the site, {stats.go_pct}% of the ground is rated Go, {stats.caution_pct}% Caution and {stats.nogo_pct}% No-go.
          </p>
          <div className="brief-actions">
            <button ref={btn} className="btn primary big" onClick={onStart}>Start the Marswalk</button>
            <button className="btn ghost big" onClick={onClose}>Explore the map</button>
          </div>
          <p className="fine">Endpoints are illustrative. Routes are a planning aid built from a research model, not a safety certification.</p>
        </div>
      </div>
    </div>
  );
}

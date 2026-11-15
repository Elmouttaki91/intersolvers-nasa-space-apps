import { STRATEGIES, SCENARIOS } from '../data/marsData';
import { fmt, signed } from '../utils/format';

export default function RoutePanel({ journey, journeyKey, visible, setVisible, active, setActive, scenario, setScenario }) {
  const routes = journey.routes;
  const best = routes['Minimum energy'], short = routes['Shortest distance'];
  const toggle = (s) => setVisible((v) => { const n = new Set(v); n.has(s) ? n.delete(s) : n.add(s); if (!n.size) n.add(s); return n; });
  const tests = (r) => r.mc[scenario];
  const total = (r) => (tests(r) ? tests(r).valid + tests(r).invalid : 0);
  const shortGap = best && short ? best.distance_m - short.distance_m : 0;

  return (
    <div className="stack">
      {best && short && (
        <section className="block insight">
          <h3>What the shortest line costs</h3>
          {short.energy_kJ > best.energy_kJ + 0.05 ? (
            <p>
              Cutting <b>{fmt(shortGap, 0)} m</b> off {journeyKey} uses <b>{signed(short.energy_increase_pct, 0)}% more energy</b> and crosses
              slopes up to <b>{fmt(short.max_grade * 100, 0)}%</b>.
              {tests(short)?.invalid > 0 && <> In <b>{tests(short).invalid} of {total(short)}</b> simulated DEM-error runs it breaks the 45 % grade limit.</>}
            </p>
          ) : (
            <p>On {journeyKey} the shortest line and the minimum-energy line are the same walk: nothing to trade off.</p>
          )}
        </section>
      )}

      <section className="block">
        <h3>Compare strategies</h3>
        <ul className="strategies">
          {Object.entries(routes).map(([name, r]) => (
            <li key={name} className={`strat ${active === name ? 'on' : ''}`}>
              <input type="checkbox" id={`v-${name}`} checked={visible.has(name)} onChange={() => toggle(name)} aria-label={`Show ${name} on the map`} />
              <button className="strat-main" onClick={() => { setActive(name); setVisible((v) => new Set(v).add(name)); }} aria-pressed={active === name}>
                <span className="line-swatch" style={{ background: STRATEGIES[name].color }} />
                <span className="strat-name"><b>{name}</b><small>{STRATEGIES[name].blurb}</small></span>
                <span className="strat-num"><b>{fmt(r.distance_m, 0)}</b><small>m</small></span>
                <span className="strat-num"><b>{fmt(r.energy_kJ, 0)}</b><small>kJ</small></span>
                <span className="strat-num"><b>{r.energy_increase_pct ? signed(r.energy_increase_pct, 1) : '0'}</b><small>%</small></span>
              </button>
            </li>
          ))}
        </ul>
        <p className="fine">Distance, modelled walking energy (100 kg suited walker) and extra energy versus the best route. Tap a row to walk it.</p>
      </section>

      <section className="block">
        <h3>If the DEM is off by a few centimetres</h3>
        <label className="range"><span>Error model</span>
          <select value={scenario} onChange={(e) => setScenario(e.target.value)}>{Object.keys(SCENARIOS).map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <p className="fine">{SCENARIOS[scenario]}. 100 random elevation errors applied to each fixed route.</p>
        <table className="mini">
          <thead><tr><th scope="col">Route</th><th scope="col">P95 kJ</th><th scope="col">Runs over limit</th></tr></thead>
          <tbody>
            {Object.entries(routes).map(([name, r]) => tests(r) && (
              <tr key={name}>
                <th scope="row"><span className="line-swatch sm" style={{ background: STRATEGIES[name].color }} />{name}</th>
                <td>{fmt(tests(r).p95_kJ, 0)}</td>
                <td className={tests(r).invalid ? 'bad' : ''}>{tests(r).invalid} / {total(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

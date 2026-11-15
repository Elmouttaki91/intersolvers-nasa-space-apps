import { LAYERS } from '../data/marsData';
import Icon from './Icons';

export default function TrustPanel({ meta }) {
  const a = meta.assumptions;
  return (
    <div className="stack">
      <section className="block">
        <h3>What is measured, what is modelled</h3>
        <table className="mini">
          <thead><tr><th scope="col">Layer</th><th scope="col">Source</th><th scope="col">Type</th></tr></thead>
          <tbody>{LAYERS.map((l) => (
            <tr key={l.id}><th scope="row">{l.label}</th><td>{l.source}</td><td><span className={`tag ${l.kind === 'Measured' ? 'meas' : 'der'}`}>{l.kind}</span></td></tr>
          ))}
          <tr><th scope="row">Routes</th><td>Our model: 8-neighbour grid search, Carr/Newman flat-ground cost × normalised Minetti grade cost</td><td><span className="tag der">Modelled</span></td></tr>
          </tbody>
        </table>
        <p className="fine">All rasters share one {meta.grid[0]}×{meta.grid[1]} grid at {meta.spacing_m} m. Mars coordinates, not Earth latitude and longitude.</p>
      </section>

      <section className="block">
        <h3>Model settings</h3>
        <dl className="kvs">
          <div className="kv"><dt>Walker</dt><dd><b>{a.mass_kg} kg</b><small> system mass, {a.suit_pressure_psi} psi suit</small></dd></div>
          <div className="kv"><dt>Gravity</dt><dd><b>{a.mars_gravity_m_s2}</b><small> m/s²</small></dd></div>
          <div className="kv"><dt>Speed</dt><dd><b>{a.speed_m_s}</b><small> m/s</small></dd></div>
          <div className="kv"><dt>Grade limit</dt><dd><b>±{Math.round(a.grade_limit * 100)}%</b><small> ({meta.grade_limit_deg}°)</small></dd></div>
        </dl>
      </section>

      <section className="block">
        <h3>Internal checks</h3>
        <ul className="checks">{meta.checks.map((c) => (
          <li key={c.name} className={c.passed ? 'ok' : 'fail'}><Icon name={c.passed ? 'check' : 'x'} size={15} />{c.name}</li>
        ))}</ul>
      </section>

      <section className="block">
        <h3>Known limits</h3>
        <ul className="limits">
          {a.limitations.map((l) => <li key={l}>{l}</li>)}
          <li>Radiation: no spatial dose model in this build. Dose-rate files are a planned layer, not a shipped one.</li>
        </ul>
        <p className="fine">Endpoints are illustrative walks across the site, not mission waypoints.</p>
      </section>
    </div>
  );
}

import { HAZARD } from '../data/marsData';

export default function HazardLegend({ stats, limitDeg, roughMm }) {
  return (
    <section className="block" aria-labelledby="hz-h">
      <h3 id="hz-h">Terrain class</h3>
      <ul className="legend">
        {[['go', stats.go_pct], ['caution', stats.caution_pct], ['nogo', stats.nogo_pct], ['artifact', stats.artifact_pct]].map(([k, pct]) => (
          <li key={k}>
            <span className="swatch" style={{ background: HAZARD[k].color }} />
            <span className="legend-text"><b>{HAZARD[k].label}</b><small>{HAZARD[k].hint}</small></span>
            <span className="legend-pct">{pct}%</span>
          </li>
        ))}
      </ul>
      <p className="fine">
        Limits come from the route model: grade ±45 % ({limitDeg}°), roughness above {roughMm} mm (top 10 % of usable cells).
        A cell marked Go is within the model's limits. It is not a safety certification.
      </p>
    </section>
  );
}

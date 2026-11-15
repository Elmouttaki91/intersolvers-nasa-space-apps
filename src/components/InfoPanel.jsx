import { HAZARD } from '../data/marsData';
import { hazardVerdict } from '../utils/inspectRaster';
import { geologyAt } from '../utils/geometry';
import { fmt } from '../utils/format';
import Icon from './Icons';

function Row({ k, v, unit, tag }) {
  return (
    <div className="kv"><dt>{k}{tag && <span className={`tag ${tag === 'M' ? 'meas' : 'der'}`}>{tag === 'M' ? 'Measured' : 'Derived'}</span>}</dt>
      <dd><b>{v}</b>{unit && <small> {unit}</small>}</dd></div>
  );
}

function Verdict({ v }) {
  if (!v) return null;
  return (
    <div className={`verdict ${v.key}`}>
      <span className="verdict-label"><Icon name={v.key === 'go' ? 'check' : 'alert'} size={16} /> {v.label}</span>
      <span>{v.reasons.length ? v.reasons.join(' · ') : 'Within the model limits'}</span>
    </div>
  );
}

export default function InfoPanel({ data, probe, pinned, onClear, walkerCell, walkM, total, routeName }) {
  const geo = probe ? geologyAt(data.geology, probe.col + 0.5, probe.row + 0.5) : null;
  const wv = hazardVerdict(walkerCell);
  return (
    <div className="stack">
      <section className="block" aria-labelledby="pr-h">
        <div className="row-between">
          <h3 id="pr-h"><Icon name="crosshair" size={15} /> {pinned ? 'Pinned cell' : 'Under the cursor'}</h3>
          {pinned && <button className="link" onClick={onClear}>Unpin</button>}
        </div>
        {probe ? (
          <>
            <Verdict v={hazardVerdict(probe)} />
            <dl className="kvs">
              <Row k="Elevation" v={fmt(probe.elevation, 2)} unit="m" tag="M" />
              <Row k="Slope" v={fmt(probe.slope, 1)} unit="°" tag="D" />
              <Row k="Roughness" v={probe.roughnessMm ?? '–'} unit="mm" tag="D" />
              <Row k="Thermal index" v={probe.thermal} unit="THEMIS, qualitative" tag="M" />
              <Row k="Geologic unit" v={geo ? geo.id : 'none mapped'} />
              <Row k="Grid cell" v={`${probe.col}, ${probe.row}`} unit="col, row · 1 m" />
            </dl>
          </>
        ) : (
          <p className="empty">Hover over the map, or tap it, to read the ground at one metre.</p>
        )}
      </section>

      <section className="block" aria-labelledby="wk-h">
        <h3 id="wk-h"><Icon name="target" size={15} /> The astronaut, now</h3>
        {walkerCell ? (
          <>
            <Verdict v={wv} />
            <dl className="kvs">
              <Row k="Route" v={routeName} />
              <Row k="Progress" v={`${Math.round(walkM)} of ${Math.round(total)}`} unit="m" />
              <Row k="Slope under boots" v={fmt(walkerCell.slope, 1)} unit="°" tag="D" />
              <Row k="Elevation" v={fmt(walkerCell.elevation, 2)} unit="m" tag="M" />
            </dl>
          </>
        ) : <p className="empty">Press Walk it to follow the crew along the route.</p>}
      </section>
    </div>
  );
}

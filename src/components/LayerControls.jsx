import { LAYERS } from '../data/marsData';
import Icon from './Icons';

const BASE = import.meta.env.BASE_URL ?? './';

export default function LayerControls({ baseLayer, setBaseLayer, compareLayer, setCompareLayer, compareAmount, setCompareAmount, overlays, setOverlays }) {
  const active = LAYERS.find((l) => l.id === baseLayer);
  const toggle = (k) => setOverlays((o) => ({ ...o, [k]: !o[k] }));
  return (
    <section className="block" aria-labelledby="ly-h">
      <h3 id="ly-h">Map layers</h3>
      <div className="layer-grid" role="radiogroup" aria-label="Base layer">
        {LAYERS.map((l) => (
          <button key={l.id} role="radio" aria-checked={baseLayer === l.id} className={`layer ${baseLayer === l.id ? 'on' : ''}`}
                  onClick={() => setBaseLayer(l.id)}>
            <span className="thumb" style={{ backgroundImage: `url(${BASE}data/web/${l.file})` }} />
            <span className="layer-name">{l.label}</span>
            <span className={`tag ${l.kind === 'Measured' ? 'meas' : 'der'}`}>{l.kind}</span>
          </button>
        ))}
      </div>
      <p className="fine"><b>{active.source}.</b> {active.note}</p>

      <div className="switches">
        <label className="switch"><input type="checkbox" checked={overlays.hazard} onChange={() => toggle('hazard')} /><span>Go / caution / no-go</span></label>
        {overlays.hazard && (
          <label className="range"><span>Opacity</span>
            <input type="range" min="0.15" max="1" step="0.05" value={overlays.hazardOpacity}
                   onChange={(e) => setOverlays((o) => ({ ...o, hazardOpacity: +e.target.value }))} />
          </label>
        )}
        <label className="switch"><input type="checkbox" checked={overlays.geology} onChange={() => toggle('geology')} /><span>Geologic units and buttes</span></label>
      </div>

      <div className="compare">
        <label className="switch">
          <input type="checkbox" checked={!!compareLayer} onChange={(e) => setCompareLayer(e.target.checked ? (baseLayer === 'optical' ? 'elevation' : 'optical') : null)} />
          <span><Icon name="split" size={15} /> Compare two layers</span>
        </label>
        {compareLayer && (
          <>
            <label className="range"><span>Left side shows</span>
              <select value={compareLayer} onChange={(e) => setCompareLayer(e.target.value)}>
                {LAYERS.filter((l) => l.id !== baseLayer).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </label>
            <label className="range"><span>Divider</span>
              <input type="range" min="0.05" max="0.95" step="0.01" value={compareAmount} onChange={(e) => setCompareAmount(+e.target.value)} />
            </label>
          </>
        )}
      </div>
    </section>
  );
}

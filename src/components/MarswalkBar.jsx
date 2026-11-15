import Icon from './Icons';
import ElevationProfile from './ElevationProfile';
import { fmtTime } from '../utils/format';
import { MODEL_SPEED } from '../data/marsData';

export default function MarswalkBar({ journeys, journeyKey, setJourneyKey, playing, setPlaying, speed, setSpeed, follow, setFollow, route, geom, walkM, setWalkM, cueClass }) {
  const total = geom.total;
  return (
    <section className="walkbar" aria-label="Marswalk replay">
      <div className="walk-head">
        <div className="chips" role="radiogroup" aria-label="Journey">
          {Object.keys(journeys).map((k) => (
            <button key={k} role="radio" aria-checked={k === journeyKey} className={`chip ${k === journeyKey ? 'on' : ''}`} onClick={() => setJourneyKey(k)}>
              {k.replace('Journey ', 'J')}
            </button>
          ))}
        </div>
        <div className="transport">
          <button className="btn icon" aria-label="Back to start" onClick={() => { setPlaying(false); setWalkM(0); }}><Icon name="restart" /></button>
          <button className="btn primary" onClick={() => { if (walkM >= total) setWalkM(0); setPlaying(!playing); }}>
            <Icon name={playing ? 'pause' : 'play'} /> {playing ? 'Pause' : 'Walk it'}
          </button>
          <label className="select"><span className="sr">Replay speed</span>
            <select value={speed} onChange={(e) => setSpeed(+e.target.value)}>
              <option value={10}>10× speed</option><option value={30}>30× speed</option><option value={60}>60× speed</option>
            </select>
          </label>
          <label className="switch tight"><input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /><span>Follow</span></label>
        </div>
        <div className="clock" aria-live="off">
          <b>{Math.round(walkM)}</b><small> / {Math.round(total)} m</small>
          <span className={`cue ${cueClass}`}>{cueClass === 'go' ? 'Go' : cueClass === 'caution' ? 'Caution' : 'No-go'}</span>
          <small className="muted">{fmtTime(walkM / MODEL_SPEED)} at {MODEL_SPEED} m/s</small>
        </div>
      </div>
      <ElevationProfile route={route} cum={geom.cum} total={total} walkM={walkM} onScrub={(m) => { setPlaying(false); setWalkM(m); }} />
    </section>
  );
}

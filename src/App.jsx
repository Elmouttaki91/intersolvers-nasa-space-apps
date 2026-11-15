import { useEffect, useMemo, useState } from 'react';
import { loadMarsData, loadLayerImages, MODEL_SPEED, gradeClass } from './data/marsData';
import { routeGeometry, positionAt } from './utils/geometry';
import { downloadSummaryCard } from './utils/summaryCard';
import Header from './components/Header';
import MarsMap from './components/MarsMap';
import LayerControls from './components/LayerControls';
import HazardLegend from './components/HazardLegend';
import RoutePanel from './components/RoutePanel';
import InfoPanel from './components/InfoPanel';
import TrustPanel from './components/TrustPanel';
import MarswalkBar from './components/MarswalkBar';
import Briefing from './components/Briefing';

const useMedia = (q) => {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => { const mq = window.matchMedia(q); const f = () => setM(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, [q]);
  return m;
};

export default function App() {
  const [data, setData] = useState(null);
  const [images, setImages] = useState(null);
  const [progress, setProgress] = useState([0, 7]);
  const [error, setError] = useState(null);

  const [baseLayer, setBaseLayer] = useState('optical');
  const [compareLayer, setCompareLayer] = useState(null);
  const [compareAmount, setCompareAmount] = useState(0.5);
  const [overlays, setOverlays] = useState({ hazard: true, hazardOpacity: 0.55, geology: true });
  const [journeyKey, setJourneyKey] = useState('Journey 1');
  const [visible, setVisible] = useState(new Set(['Minimum energy', 'Shortest distance']));
  const [active, setActive] = useState('Minimum energy');
  const [scenario, setScenario] = useState('Correlated 2 cm');
  const [walkM, setWalkM] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(30);
  const [follow, setFollow] = useState(false);
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  const [tab, setTab] = useState('now');
  const [briefing, setBriefing] = useState(true);
  const mobile = useMedia('(max-width: 980px)');

  useEffect(() => {
    let dead = false;
    Promise.all([loadMarsData(), loadLayerImages((d, n) => !dead && setProgress([d, n]))])
      .then(([d, im]) => { if (!dead) { setData(d); setImages(im); window.__mars = d; } })
      .catch((e) => !dead && setError(e.message));
    return () => { dead = true; };
  }, []);

  const journey = data?.journeys[journeyKey];
  const activeName = journey?.routes[active] ? active : 'Minimum energy';
  const route = journey?.routes[activeName];
  const geom = useMemo(() => (route ? routeGeometry(route.path) : { cum: new Float32Array(1), total: 0 }), [route]);

  useEffect(() => { setWalkM(0); setPlaying(false); }, [journeyKey, activeName]);
  useEffect(() => {
    if (!journey) return;
    setVisible((v) => { const n = new Set([...v].filter((s) => journey.routes[s])); if (!n.has(activeName)) n.add(activeName); return n; });
  }, [journeyKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playing) return undefined;
    let raf, last = performance.now();
    const tick = (t) => {
      const dt = Math.min(0.1, (t - last) / 1000); last = t;
      setWalkM((m) => { const n = m + dt * speed * MODEL_SPEED; if (n >= geom.total) { setPlaying(false); return geom.total; } return n; });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, geom.total]);

  const walker = useMemo(() => (route && (walkM > 0 || playing) ? positionAt(route.path, geom.cum, walkM) : null), [route, geom, walkM, playing]);
  const walkerCell = walker && data.sample(walker.col, walker.row);
  const cueClass = route && walker ? gradeClass(route.slope[walker.i]) : route ? gradeClass(route.slope[0]) : 'go';

  const routes = useMemo(() => (journey ? Object.entries(journey.routes).filter(([s]) => visible.has(s)).map(([strategy, r]) => ({ strategy, route: r })) : []), [journey, visible]);

  const probe = useMemo(() => {
    if (!data) return null;
    const pt = pinned || hover;
    return pt ? data.sample(pt.col, pt.row) : null;
  }, [data, hover, pinned]);

  if (error) return <div className="splash"><h1>Data not found</h1><p>{error}</p></div>;
  if (!data || !images) {
    return (
      <div className="splash" role="status">
        <svg className="mark big" viewBox="0 0 64 64" aria-hidden="true"><path d="M10 48c14-2 10-18 22-18s8-14 22-16" fill="none" stroke="#E6FF2E" strokeWidth="5" strokeLinecap="round" /></svg>
        <h1>Murray Buttes Marswalk</h1>
        <p>Loading terrain layers {progress[0]} of {progress[1]}</p>
        <div className="bar"><i style={{ width: `${(progress[0] / progress[1]) * 100}%` }} /></div>
      </div>
    );
  }

  const layersUI = (
    <>
      <LayerControls {...{ baseLayer, setBaseLayer, compareLayer, setCompareLayer, compareAmount, setCompareAmount, overlays, setOverlays }} />
      <HazardLegend stats={data.meta.hazard_stats} limitDeg={data.meta.grade_limit_deg} roughMm={(data.meta.rough_p90_m * 1000).toFixed(0)} />
    </>
  );
  const tabs = mobile ? [['layers', 'Layers'], ['now', 'Now'], ['routes', 'Routes'], ['trust', 'Trust']] : [['now', 'Now'], ['routes', 'Routes'], ['trust', 'Trust']];
  const current = !mobile && tab === 'layers' ? 'now' : tab;

  return (
    <div className="app">
      <Header onBriefing={() => setBriefing(true)} onCard={() => downloadSummaryCard({ images, data, journeyKey, strategy: activeName, route, journey })} />
      <main className="workspace">
        {!mobile && <aside className="dock left chamfer" aria-label="Layers"><div className="dock-scroll">{layersUI}</div></aside>}

        <div className="center">
          <div className="mapwrap">
            <MarsMap data={data} images={images} baseLayer={baseLayer} compareLayer={compareLayer} compareAmount={compareAmount}
                     overlays={overlays} routes={routes} activeStrategy={activeName} journey={journey} walker={walker} follow={follow}
                     probe={probe} onHover={(c, r) => setHover(c == null ? null : { col: c, row: r })} onPick={(c, r) => setPinned((p) => (p && p.col === c && p.row === r ? null : { col: c, row: r }))} />
          </div>
          <MarswalkBar journeys={data.journeys} journeyKey={journeyKey} setJourneyKey={setJourneyKey} playing={playing} setPlaying={setPlaying}
                       speed={speed} setSpeed={setSpeed} follow={follow} setFollow={setFollow} route={route} geom={geom} walkM={walkM} setWalkM={setWalkM} cueClass={cueClass} />
        </div>

        <aside className="dock right chamfer" aria-label="Details">
          <div className="tabs" role="tablist">
            {tabs.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={current === id} className={`tab ${current === id ? 'on' : ''}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          <div className="dock-scroll" role="tabpanel">
            {current === 'layers' && layersUI}
            {current === 'now' && <InfoPanel data={data} probe={probe} pinned={!!pinned} onClear={() => setPinned(null)} walkerCell={walkerCell} walkM={walkM} total={geom.total} routeName={activeName} />}
            {current === 'routes' && <RoutePanel journey={journey} journeyKey={journeyKey} visible={visible} setVisible={setVisible} active={activeName} setActive={setActive} scenario={scenario} setScenario={setScenario} />}
            {current === 'trust' && <TrustPanel meta={data.meta} />}
          </div>
        </aside>
      </main>
      {briefing && <Briefing data={data} onClose={() => setBriefing(false)} onStart={() => { setBriefing(false); setWalkM(0); setPlaying(true); }} />}
    </div>
  );
}

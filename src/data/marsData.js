// Data layer of the app: what exists, how it is labelled, and how to read it.
// Everything is produced by scripts/prepare_data.py from the data team's Murray Buttes files.

const BASE = import.meta.env.BASE_URL ?? './';
const web = (p) => `${BASE}data/web/${p}`;

export const MEASURED = 'Measured';
export const DERIVED = 'Derived';

// Base layers. `kind` tells the astronaut (and the judges) what is measured and what is computed.
export const LAYERS = [
  { id: 'optical', label: 'Optical', file: 'optical.png', kind: MEASURED, source: 'HiRISE orthoimage',
    note: 'The view from orbit. Use it to recognise landmarks on arrival.' },
  { id: 'elevation', label: 'Elevation', file: 'elevation.png', kind: MEASURED, source: 'MSL Gale DEM, hillshaded',
    note: 'Topography at 1 m. Blue is low, sand is high.' },
  { id: 'slope', label: 'Slope', file: 'slope.png', kind: DERIVED, source: 'Computed from the DEM',
    note: 'Yellow starts at 15°. Red passes the 45 % grade limit.' },
  { id: 'roughness', label: 'Roughness', file: 'roughness.png', kind: DERIVED, source: 'Computed from the DEM',
    note: 'Small-scale bumpiness, a proxy for loose rock. Not a rock map.' },
  { id: 'thermal', label: 'Thermal', file: 'thermal.png', kind: MEASURED, source: 'THEMIS thermal-inertia index',
    note: 'Qualitative index of how fast the ground heats and cools. Not a temperature map.' },
  { id: 'texture', label: 'Texture', file: 'texture.png', kind: DERIVED, source: 'Computed from HiRISE',
    note: 'Image texture: bright means broken, rocky ground.' },
];
export const OVERLAY_FILES = { hazard: 'hazard.png' };

export const HAZARD = {
  go: { label: 'Go', color: '#3CDC96', hint: 'Under 15° and below the roughness limit' },
  caution: { label: 'Caution', color: '#FFDF00', hint: 'Steeper than 15°, rough ground, or on a butte' },
  nogo: { label: 'No-go', color: '#FF4664', hint: 'Beyond the 45 % grade limit or no valid terrain' },
  artifact: { label: 'Data gap', color: '#BE78FF', hint: 'Suspected DEM artefact, never routed through' },
};

export const STRATEGIES = {
  'Minimum energy': { color: '#E6FF2E', blurb: 'Lowest walking energy' },
  'Shortest distance': { color: '#FF6B86', blurb: 'Straightest line' },
  'Avoid roughest 10%': { color: '#6FD8FF', blurb: 'Keeps off the roughest 10 % of ground' },
  'Avoid buttes': { color: '#C79BFF', blurb: 'Stays off the butte polygons' },
  'Uncertainty-aware': { color: '#5CF2B0', blurb: 'Penalises cells where DEM error matters' },
};

export const SCENARIOS = {
  'Correlated 2 cm': 'DEM error 2 cm, spatially smooth (σ = 2 px)',
  'Correlated 6 px': 'DEM error 2 cm, smoother over 6 px',
  'Independent 2 cm': 'DEM error 2 cm, independent per cell',
};

export const MODEL_SPEED = 0.7; // m/s, from Final_Model_Assumptions.json

export const gradeClass = (slopeDeg, limit = 24.2) => {
  if (slopeDeg == null) return 'caution';
  if (slopeDeg <= 15) return 'go';
  if (slopeDeg <= limit) return 'caution';
  return 'nogo';
};

// ---------------------------------------------------------------- loading
const getJson = async (p) => {
  const r = await fetch(web(p));
  if (!r.ok) throw new Error(`Missing ${p}. Run "npm run data" first.`);
  return r.json();
};
const getBin = async (p, T) => {
  const r = await fetch(web(p));
  if (!r.ok) throw new Error(`Missing ${p}. Run "npm run data" first.`);
  return new T(await r.arrayBuffer());
};

export async function loadMarsData() {
  const [meta, geology, elev, slope, rough, themis, flags, butte] = await Promise.all([
    getJson('meta.json'), getJson('geology.json'),
    getBin('elevation.u16', Uint16Array), getBin('slope.u8', Uint8Array), getBin('rough.u8', Uint8Array),
    getBin('themis.u8', Uint8Array), getBin('flags.u8', Uint8Array), getBin('butte.u8', Uint8Array),
  ]);
  const [W, H] = meta.grid;
  const [lo, hi] = meta.elev_range;

  const sample = (col, row) => {
    col = Math.floor(col); row = Math.floor(row);
    if (col < 0 || row < 0 || col >= W || row >= H) return null;
    const i = row * W + col, f = flags[i];
    const valid = !!(f & 1);
    return {
      col, row,
      elevation: valid ? lo + (elev[i] / 65535) * (hi - lo) : null,
      slope: valid ? slope[i] / 4 : null,
      roughnessMm: valid ? rough[i] : null,
      thermal: themis[i],
      butte: butte[i] ? meta.buttes[butte[i] - 1] : null,
      valid,
      hazard: f & 4 ? 'artifact' : f & 32 ? 'nogo' : f & 16 ? 'caution' : 'go',
    };
  };

  return { meta, geology, journeys: meta.journeys, W, H, sample };
}

export function loadLayerImages(onProgress) {
  const files = [...LAYERS.map((l) => [l.id, l.file]), ['hazard', OVERLAY_FILES.hazard]];
  let done = 0;
  return Promise.all(files.map(([id, file]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { onProgress?.(++done, files.length); resolve([id, img]); };
    img.onerror = () => reject(new Error(`Missing image ${file}. Run "npm run data" first.`));
    img.src = web(file);
  }))).then((pairs) => Object.fromEntries(pairs));
}

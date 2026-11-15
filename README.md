# Murray Buttes Marswalk

**Intersolvers · NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map**

A layered, one-metre map a suited astronaut could carry on a Marswalk across Murray Buttes (Gale crater).
It stacks optical, topographic, thermal and derived terrain layers, rates every cell Go / Caution / No-go,
and replays five route strategies step by step, with the energy cost and the risk of each.

> One astronaut, one route, one danger avoided: the shortest line across the site saves 19 m on Journey 1
> but costs 26 % more energy and breaks the 45 % grade limit in 34 of 100 simulated DEM-error runs.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (works on GitHub Pages, Netlify, Vercel)
```

The processed data is already in `public/data/web/`. To regenerate it from the data team's folder:

```bash
pip install numpy pandas pillow
python scripts/prepare_data.py "Asmaa Folder"
```

The 31 MB `Master_Terrain_v3.csv` is never loaded in the browser. The script cuts it into
light PNG layers (tiles are not needed at 498 × 499 cells), small binary grids for the cursor readout,
and `meta.json` with routes, Monte Carlo results and model assumptions.

## What is on the screen

| Area | What it does |
|---|---|
| Map layers | Optical (HiRISE), Elevation (MSL Gale DEM), Slope, Roughness, Thermal (THEMIS), Texture. Go/Caution/No-go overlay, geologic units, two-layer compare slider |
| Marswalk bar | Pick a journey (J1–J4, J6), press **Walk it**, scrub the elevation profile. A Go / Caution / No-go cue follows the astronaut |
| Now | Reads the cell under the cursor (or a tapped cell) and the cell under the astronaut |
| Routes | Compares five strategies on distance, energy and Monte Carlo risk, for three DEM-error models |
| Trust | What is measured vs derived vs modelled, model settings, internal checks, known limits |
| Route card | Downloads a shareable PNG summary of the active route |

Keyboard: arrows pan, `+` / `-` zoom, `0` resets (map focused). Works on touch: drag, pinch, tap to pin a cell.

## Data log

| Dataset | Source | Resolution | Use |
|---|---|---|---|
| Optical orthoimage | NASA/JPL/University of Arizona HiRISE | 1 m grid (resampled) | Optical layer, texture |
| Elevation | MSL Gale DEM (MAP2) | 1 m grid | Elevation, slope, roughness, routing |
| Thermal inertia index | THEMIS | Coarse, qualitative | Thermal layer |
| Geologic units | Murray Buttes geology polygons (`Murray_Buttes_Geology_Mars.geojson`) | vector | Butte outlines and labels |
| Routes, energy, Monte Carlo | Team model (`Murray_Buttes_Route_Planner_Final_With_Warnings.py`) | 1 m grid | Routes and risk |

> Data team: please confirm exact product IDs, versions and licences for the table above before submission.

## Honest limits

Taken from `Final_Model_Assumptions.json` and shown in the app: DEM uncertainty magnitudes are hypothetical;
the walking-energy formula is not validated for astronauts; rock hazards and butte polygons are not validated
hazard zones; thermal inertia is not a temperature map; endpoints are illustrative; route feasibility is not a safety
guarantee. **There is no spatial radiation model in this build.** Radiation dose-rate files are a planned layer.

## AI tools

Claude (Anthropic) was used to write the web application code and to help structure this README.
All numbers shown in the app come from the data team's files; every figure in the briefing is computed from them at load time.
*(Team: edit this paragraph so it matches exactly how everyone used AI tools.)*

## Licence

Apache 2.0. Third-party libraries: React (MIT), Vite (MIT). Icons: Feather (MIT), inlined. Fonts: Fira Sans and Overpass (SIL OFL) from Google Fonts.

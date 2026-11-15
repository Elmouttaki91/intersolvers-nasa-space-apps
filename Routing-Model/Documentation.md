# Murray Buttes \| Mars Terrain Data Preparation & Explainable Route Planning

An experimental, terrain-aware and explainable route-planning prototype for a hypothetical astronaut traverse in Murray Buttes, Gale Crater, Mars. The project combines two reproducible research stages: (1) preparing a spatially aligned planetary terrain dataset and (2) comparing routes by modeled walking energy and terrain constraints.


## Important Note
The original `Murray Buttes GIS.zip` dataset is not included in this repository because it exceeds GitHub's 100 MB file-size limit.
Download the dataset from: https://doi.org/10.5281/zenodo.3990487
Place the downloaded ZIP file in `data/raw/` before running the data-preparation notebook.

### At a glance

-   **248,502** cells on a **499 × 498** grid at approximately **1 m** spacing in the prepared study region.
-   **17** columns in the master terrain table exported by the data-preparation notebook.
-   Integrates elevation, slope, roughness, HiRISE optical features, qualitative THEMIS values, geological polygons, and an existing suspected-artifact flag.
-   Compares energy-minimizing routing with distance and optional avoidance alternatives; records reconstruction warnings and experimental uncertainty checks.

## How the Code Works

-   Accepts start and destination coordinates in the `(row, column)` format.
-   Calculates a minimum-energy route with 8-neighbor Dijkstra pathfinding.
-   Optionally calculates shortest-distance, avoid roughest 10%, avoid mapped buttes, and combined-avoidance alternatives.
-   Excludes **invalid terrain** and moves whose signed movement gradient exceeds the experimental limit of ±45% (about 24.2°). Diagonal corner-cutting across blocked edges is prohibited.
-   Exploratory analysis identified a suspected DEM artifact corridor. The **routing** stage may interpolate short, bracketed flagged gaps; a warning is generated if a route traverses reconstructed terrain. The preparation stage does **not** overwrite missing or flagged DEM elevations.
-   Summarizes route distance, reference energy, elevation change, gradients, roughness, butte intersections, HiRISE brightness/texture, and reconstructed crossings.
-   Optionally runs **Monte Carlo sensitivity analysis after routing** and exports route maps, tables, coordinates, warning JSON, and audit data.

## Two-stage workflow

``` text
Six source inputs in data/raw/
        |
        v
notebooks/Murray_Buttes_Data_Preparation_GitHub.ipynb
        |  raster checks / terrain roughness / HiRISE texture
        |  geology clipping and cell flags / THEMIS alignment
        |  master-table validation
        v
data/Murray_Buttes_Terrain_Data.csv  (248,502 rows × 17 columns)
        |
        v
notebooks/Murray_Buttes_Route_Planner.ipynb
        |
        v
Route alternatives + energy estimates + artifact warnings + figures
```

### Stage 1 — Data preparation and feature engineering

**Notebook:** [`notebooks/Murray_Buttes_Data_Preparation_GitHub.ipynb`](notebooks/Murray_Buttes_Data_Preparation_GitHub.ipynb)

1.  **Validate grid alignment.** Read the 1 m DEM, slope raster and 0.25 m HiRISE image; check coverage, raster shape, coordinate systems and transforms. The preparation notebook intentionally stops when required spatial assumptions fail.
2.  **Calculate roughness.** Fit a local plane to valid **3 × 3 DEM** windows; derive residual surface variation rather than treating steepness itself as roughness.
3.  **Extract image features.** Compute HiRISE brightness and **5 × 5 image-pixel** texture; aggregate RGB and texture to each 1 m DEM cell. Image appearance is not a validated rock/soil classifier.
4.  **Integrate geology.** Unpack and clip mapped vector features to the study area; associate mapped butte polygons with grid cells.
5.  **Align THEMIS.** Reproject/resample the coarse **qualitative thermal-inertia** product onto the analysis grid for comparison. This **does not** increase its original physical resolution, and its image values are not calibrated thermal-inertia measurements.
6.  **Flag suspected artifacts.** Read an **existing** aligned artifact mask into `artifact_suspected`. The preparation notebook does not create or independently validate that mask and **does not interpolate DEM values**.
7.  **Validate/export.** Verify expected column names, one unique `(row, col)` per cell, grid bounds and flag consistency. Write and read back `data/Murray_Buttes_Terrain_Data.csv`.

The master CSV contains the following **17 columns**:

``` text
row, col, x_mars, y_mars, elevation_m, slope_deg, roughness_m,
themis_qualitative, valid_terrain, texture_mean, texture_max,
butte_id, inside_butte, red_mean, green_mean, blue_mean,
artifact_suspected
```

**Note:** `valid_terrain` reflects nonmissing elevation, slope and roughness in the *source master table*. It is not a Go/Caution/No-go astronaut safety label. Likewise, `artifact_suspected` indicates an existing data-quality flag, not necessarily a permanently impassable location.

### Stage 2 — Route evaluation

The routing notebook uses the prepared terrain information to evaluate permitted movements with 8-neighbor Dijkstra pathfinding, compare objectives, and produce interpretable route statistics and warnings. Its reference walking-energy model, constraints and illustrative test outputs are documented below.

**Data handoff:** The data-preparation stage exports `data/Murray_Buttes_Terrain_Data.csv`. The routing stage should use the corresponding terrain fields to calculate and compare candidate routes. Before reproducing results, confirm the paths and input requirements in the committed routing notebook; this document describes the workflow but does not itself execute it.

## Data sources and how they are used

| Source / layer | Role in the project |
|----|----|
| Digital elevation model (DEM) | Primary terrain input; movement gradients and reference walking-energy costs |
| DEM-derived slope | Available terrain descriptor used as an important factor for path finding. |
| DEM-derived roughness | Routing restriction based on the highest 10% of reference roughness values |
| HiRISE optical imagery | Route-map background and descriptive red/green/blue brightness and texture metrics |
| Geological mapping | Helped identify boundaries, route-intersection statistics, and optional butte avoidance |
| Suspected DEM artifact mask | Identifies unreliable elevation cells for interpolation, blocking, audit, and warnings |
| THEMIS thermal inertia | Examined in a separate experiment; not used in the final routing objective |

Three independent data-source families have meaningful roles in the planner: **DEM/topography**, **HiRISE optical imagery**, and **geological mapping**.

### Spatial coordinates

-   Master grid: 499 rows × 498 columns, at approximately 1 m spacing.
-   Start/end inputs use grid (row, column), not latitude/longitude.
-   The master table also stores projected Mars coordinates (`x_mars`, `y_mars`). These are not Earth WGS84 coordinates.
-   Any GeoJSON exported for the web map must preserve or explicitly transform the Mars-projected geometry; align it with the HiRISE/terrain raster before displaying it in a React map. Do not directly assume default Earth longitude/latitude handling.

## Routing method

The primary objective is the unscaled **Minetti slope-dependent walking-energy reference**:

$$
E_{\mathrm{route}} = m\sum_i d_i\,C(s_i), \qquad
s_i = \frac{z_{i+1}-z_i}{d_i}
$$

where $m$ is the illustrative walking-system mass (default **100 kg**), $d_i$ is the length of a grid movement, and $s_i$ is its signed gradient. The experimental reference function is

$$
C(s)=280.5s^5-58.7s^4-76.8s^3+51.9s^2+19.6s+2.5.
$$

Dijkstra minimizes the sum of permitted movement costs. The notebook evaluates the original energy cost of *every* alternative route, even when that alternative was generated by a different objective.

## Suspected DEM artifact: reconstruction and warnings

A narrow suspected elevation artifact was identified in the DEM and saved in the master CSV as `artifact_suspected`. Rather than treating the entire region as impassable, we reconstructed elevations across narrow gaps using linear interpolation between valid elevation measurements on either side.

> The routing algorithm can cross reconstructed cells if the estimated gradients satisfy its constraints. However, these elevations remain flagged as **inferred and unverified**, and the model automatically issues a warning whenever a route crosses them.

## Repository layout

``` text
Repository/
├── README.md
├── Documentation.md
├── AI_DISCLOSURE.md                     # if included in the repository
├── environment.yml                  # if included in the repository
├── notebooks/
│   ├── Murray_Buttes_Data_Preparation_GitHub.ipynb
│   └── Murray_Buttes_Route_Planner.ipynb
├── data/
│   ├── raw/
│   │   ├── MSLGaleDEM_MAP2_EQUI.tif
│   │   ├── Murray Buttes Slope.tif
│   │   ├── Murray Buttes Imagery.tif
│   │   ├── Gale_crater_THEMIS_qualTI.tif
│   │   ├── Murray Buttes GIS.zip
│   │   └── Murray_Artifact_Suspected_Full.tif
│   ├── processed/                     # generated GeoTIFFs and geology layers
│   └── Murray_Buttes_Terrain_Data.csv # generated master grid
└── results/                           # selected route plots and tables
```

The six files shown inside `data/raw/` are **expected inputs** to the preprocessing notebook; the large `Murray Buttes GIS.zip` may need to be downloaded separately. Some original source rasters can exceed GitHub's file-size limit; if they are not distributed in the repository, download them separately and place them at the exact paths shown above. The **suspected-artifact mask is a project-specific prerequisite**; the preprocessing notebook does not regenerate it from the DEM. The existing README source links document upstream data provenance, but do not by themselves reproduce every project-specific cropped input.

### Run in order

1.  Clone/download the repository and ensure `notebooks/` and `data/raw/` exist **locally**, not only on GitHub.
2.  Install the required Python packages. If your repository includes a working `environment.yml`, create/activate it; otherwise ensure NumPy, pandas, rasterio, SciPy, GeoPandas and Shapely are installed, plus the routing notebook's dependencies.
3.  Start Jupyter from **`Repository/` or `Repository/notebooks/`**, then open `notebooks/Murray_Buttes_Data_Preparation_GitHub.ipynb` and run all cells.
4.  Confirm the printed validation checks and output `data/Murray_Buttes_Terrain_Data.csv` (17 columns).
5.  Open the routing notebook, confirm that its input points to the generated master CSV and its expected columns are present, select valid start/destination grid coordinates, and run its cells.
6.  Copy selected plots, warnings and summary tables into `results/` for reviewers.

#### Relative paths and Jupyter's working directory

Relative file paths are resolved from **`Path.cwd()`**, not automatically from the saved notebook's location. For example, with Jupyter running from `Repository/notebooks/`, `../data/raw/` reaches the input folder. From `Repository/`, the equivalent path is `data/raw/`. Configure the notebook’s root path relative to its working directory, or use its project-root detection where available. If Jupyter starts outside the repository (for example in `Downloads/`), launch it inside the repository or explicitly set `PROJECT_DIR`; a local `%cd` is also a workaround but should **not** be hardcoded with a personal path in the public notebook.

## Routing settings

The routing stage is **separate** from data preparation. Start and goal are grid indices, not latitude/longitude. For the documented example, the test endpoints were `START = (400, 80)` and `GOAL = (100, 400)`. Use the configuration in the committed routing notebook when rerunning experiments.

The documented routing experiment allowed reconstructed crossings (`ALLOW_RECONSTRUCTED_CROSSING = True`), with a maximum repair width of 8 cells and absolute movement grade limit 0.45; strict exclusion can be requested by setting `ALLOW_RECONSTRUCTED_CROSSING = False` if that option is present in the route notebook version used.

### Key options

| Setting | Default | Function |
|----|----|----|
| `COMPARE_SHORTEST` | `True` | Add shortest-distance alternative |
| `COMPARE_ROUGHNESS_AVOIDANCE` | `True` | Avoid top 10% roughness cells |
| `COMPARE_BUTTE_AVOIDANCE` | `True` | Avoid mapped butte polygons |
| `COMPARE_BOTH_AVOIDANCE` | `False` | Optional combined restriction |
| `ALLOW_RECONSTRUCTED_CROSSING` | `True` | Bridge narrow flagged DEM gaps by interpolation |
| `MAX_REPAIR_WIDTH_CELLS` | `8` | Maximum bracketed gap size eligible for interpolation |
| `MAX_ABS_GRADE` | `0.45` | Maximum absolute movement gradient |
| `RUN_MONTE_CARLO` | `True` | Post-routing DEM sensitivity assessment |
| `MC_SIMULATIONS` | `200` | Number of synthetic DEM realizations |

## Outputs

The data-preparation notebook writes the master CSV to `data/` and derived layers to `data/processed/`. Routing exports are produced by the routing notebook at its configured output location. Selected figures and tables may be copied into `results/` for convenient review. The list below describes the documented routing outputs; exact paths depend on the committed notebook configuration.

| Output | Contents |
|----|----|
| `route_summary.csv` | Side-by-side route distance, energy, slope, roughness, geology, optical and reconstruction metrics |
| `route_coordinates_and_cell_attributes.csv` | Cell-by-cell route locations and measured/derived attributes |
| `route_movement_energy.csv` | Step-level energy breakdown |
| `route_artifact_warnings.json` / `.csv` | Per-route reconstructed crossing warnings for the web app |
| `reconstruction_audit_grid.csv` | Flagged/reconstructed status and elevation used for grid cells |
| `reconstructed_elevation_and_masks.npz` | Reconstructed elevation array and original/reconstruction masks |
| `monte_carlo_samples.csv` / `monte_carlo_summary.csv` | Optional fixed-route sensitivity results |
| `internal_model_checks.csv` | Automated internal consistency tests |
| `model_settings_and_limitations.json` | Inputs, settings, exclusions and caveats |
| `route_overview_and_zoom.png` | Map showing route alternatives and a zoomed area |
| `routes_on_hirise.png` | Optional route overlay on HiRISE imagery, if available and aligned |
| `route_energy_comparison.png` | Comparison of Minetti reference energy across route alternatives |

**Results are recomputed when the notebook runs.** The output folder reflects the current endpoints; preserve representative outputs elsewhere before running a different journey if you want to keep both.

## Example results: journey across the suspected seam

With `START = (400, 80)` and `GOAL = (100, 400)`, the tested run produced:

| Strategy | Distance | Minetti reference energy | Reconstructed cells crossed |
|----|---:|---:|---:|
| Minimum energy | 473.210 m | 152.629 kJ | 3 |
| Shortest distance | 457.151 m | 167.841 kJ | 3 |
| Avoid roughest 10% | 532.056 m | 164.949 kJ | 4 |
| Avoid mapped buttes | 473.210 m | 152.629 kJ | 3 |

The minimum-energy route's reconstructed crossing affected approximately **4.24 m** of travel and triggered a warning. In the post-route Monte Carlo test, the minimum-energy route had **200/200 valid** simulated realizations; the shortest-distance route had **101/200 valid** because many simulated gradients exceeded the experimental ±45% threshold. These rejection counts are **not** probabilities of physical danger.

## Limitations and interpretation

-   Minetti's polynomial was derived from terrestrial walking, not validated Mars spacesuit locomotion. Energies are reference-model estimates, not certified EVA energy requirements.
-   The ±45% movement-gradient cutoff is an experimental rule, not a proven astronaut safety threshold. The model does not impose a separate cutoff on the surrounding `slope_deg` raster, so cross-slope terrain risk is not fully assessed.
-   Surface roughness is a DEM-derived proxy; a percentile restriction is not a validated physical hazard threshold.
-   HiRISE brightness/texture describes image appearance, not confirmed rocks, traction, or bearing strength.
-   Butte polygons are geological boundaries, not inherently impassable terrain.
-   Suspected DEM artifact cells and interpolated elevations are uncertain, and reconstructed crossings require explicit warning.
-   Monte Carlo uses hypothetical DEM-error magnitudes and correlation, evaluates routes *after* selection, and does not fully capture reconstruction error.
-   THEMIS thermal inertia was assessed but excluded from the final objective because it did not meaningfully improve the tested route selection; it is not a temperature or traction map.
-   Radiation exposure, time-varying temperature, validated obstacle detection, and real-world astronaut safety are not established by this prototype.

## Data Provenance, Citations, and Licensing

This project integrates publicly available planetary datasets from NASA missions, the U.S. Geological Survey (USGS), the University of Arizona, and published geological research. All source data are acknowledged below, along with the derived datasets created for this project.

### 1. Mars Digital Elevation Model (DEM)

**Source:** Mars MSL Gale Merged DEM, 1 m resolution, Version 3.

**Authors:** Timothy Parker and Fred J. Calef III.

**Publisher:** U.S. Geological Survey (USGS) Astrogeology Science Center, 2016.

**Product:** `MSL_Gale_DEM_Mosaic_1m_v3`

**Source:** <https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m>

The DEM integrates topographic information derived from Mars Reconnaissance Orbiter HiRISE and CTX observations, Mars Express HRSC data, and Mars Global Surveyor MOLA elevation control.

The project uses a cropped, map-projected DEM to calculate elevation differences, walking gradients, roughness features and predicted walking-energy costs.

**Usage terms:** The USGS product record specifies no use restrictions and requests attribution to the authors.

### 2. HiRISE Imagery and Optical Analysis

**Source:** Mars Science Laboratory Gale Crater orthophoto mosaics, including HiRISE observations from NASA's Mars Reconnaissance Orbiter.

**Authors:** Fred J. Calef III and Timothy Parker.

**Publisher:** USGS Astrogeology Science Center, 2016.

**Source:** <https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm>

The project uses 0.25 m/pixel imagery for surface visualization and derives RGB brightness and local image-texture measurements for route characterization; optical features are not direct terrain-safety labels.

**Image credit:** NASA/JPL/University of Arizona.

**Suggested publication citation:**

McEwen, A. S., et al. (2007). Mars Reconnaissance Orbiter's High Resolution Imaging Science Experiment (HiRISE). *Journal of Geophysical Research: Planets*, 112, E05S02. <https://doi.org/10.1029/2005JE002605>

**Usage terms:** HiRISE images are publicly available without copyright restrictions under the HiRISE team's image-use policy. The USGS mosaic product also requests attribution to its authors.

HiRISE usage policy: <https://www.uahirise.org/media/usage.php>

### 3. Murray Buttes Geological Mapping

**Dataset:** A Rock Record of Complex Aeolian Bedforms in a Hesperian Desert Landscape: The Stimson Formation as Exposed in the Murray Buttes, Gale Crater, Mars.

**Dataset creator:** Steven Banham.

**Repository:** Zenodo, 2021.

**DOI:** <https://doi.org/10.5281/zenodo.3990487>

**Original dataset:** `Murray Buttes GIS.zip`

The project uses mapped butte polygons and geological identifiers to support geological visualization and an optional butte-avoidance routing constraint.

Geological source layers are also clipped and processed into a GeoPackage during data preparation. For web mapping, a separate GeoJSON export may be used; confirm that its coordinate reference system is interpreted correctly and that geometries and identifiers are preserved.

**Related scientific publication:**

Banham, S. G., et al. (2021). A rock record of complex aeolian bedforms in a Hesperian desert landscape: The Stimson formation as exposed in the Murray Buttes, Gale crater, Mars. *Journal of Geophysical Research: Planets*, 126, e2020JE006554. <https://doi.org/10.1029/2020JE006554>

**License:** Creative Commons Attribution 4.0 International (CC BY 4.0).

<https://creativecommons.org/licenses/by/4.0/>

The original dataset creator is credited, the source DOI and license are provided, and the GeoPackage-to-GeoJSON conversion is disclosed. The original geological data remain subject to their source license.

### 4. THEMIS Thermal Inertia (Exploratory Dataset)

**Source:** Mars THEMIS-Derived Global Thermal Inertia Mosaic, qualitative 8-bit product, approximately 100 m/pixel.

**Primary author:** Robin L. Fergason.

**Organizations:** USGS Astrogeology Science Center and Arizona State University Mars Space Flight Facility.

**Publisher:** USGS, 2014.

**Relevant regional product:** THEMIS Thermal Inertia Mosaic Qualitative 30S120E, 100 m/pixel.

**Source:** <https://astrogeology.usgs.gov/search/map/themis_thermal_inertia_mosaic_qualitative_30s120e_100_mpp>

**Scientific reference:**

Fergason, R. L., Christensen, P. R., & Kieffer, H. H. (2006). High-resolution thermal inertia derived from the Thermal Emission Imaging System (THEMIS): Thermal model and applications. *Journal of Geophysical Research*, 111, E12004. <https://doi.org/10.1029/2006JE002735>

THEMIS thermal inertia was evaluated as an experimental surface-property proxy. It was not retained as a penalty in the final walking-energy routing objective because its contribution to route selection was negligible in the tested scenario.

**Usage terms:** The USGS product record identifies the data as public domain and requests citation of the authors.

### 5. Curiosity Rover Localization Data

**Source:** Mars Science Laboratory (MSL) rover localization and position products.

**Repository:** NASA Planetary Data System (PDS).

**Relevant archive:** MSL Rover PLACES.

**Dataset author:** Robert G. Deen.

**DOI:** <https://doi.org/10.17189/8nyv-8p60>

Rover-position records were retained as supporting mission context. They are not used as a validated astronaut traverse or as a direct walking-energy input.

### 6. Curiosity Radiation Measurements (Supporting Data)

**Source:** Mars Science Laboratory Radiation Assessment Detector (RAD), Reduced Data Records (RDR).

**Repository:** NASA Planetary Data System, Planetary Plasma Interactions Node.

**Dataset identifier:** `MSL-M-RAD-3-RDR-V1.0`

**DOI:** <https://doi.org/10.17189/1519761>

The radiation measurements provide mission-derived environmental context. They are not treated as a spatially continuous radiation hazard map and are excluded from the final routing objective.

### 7. Project-Derived Data Products

The following datasets and calculations were generated or processed as part of this project:

-   Cropped and aligned terrain elevation grid.

-   DEM-derived slope and local surface roughness.

-   HiRISE-derived brightness and texture measurements.

-   Geological polygon and cell-level identifiers.

-   Suspected DEM artifact mask.

-   Interpolated elevation estimates for narrow artifact-affected regions.

-   Energy-optimal and alternative routes.

-   Monte Carlo sensitivity results.

-   Route-level environmental statistics and warning records.

These are derived or processed products, not independent NASA measurements. The original source datasets should be cited when using or redistributing the derived results. The new data-preparation notebook exports the 17-column `data/Murray_Buttes_Terrain_Data.csv` rather than replacing source measurements with interpolated elevations.

In particular, reconstructed DEM elevations are estimates rather than verified measurements. Routes crossing these cells are explicitly flagged.

### 8. NASA Data-Use and Attribution Policy

NASA scientific mission data are generally available under NASA's open-data licensing policy unless otherwise specified by the relevant dataset documentation. Third-party datasets may have separate licenses.

This project acknowledges NASA and the original dataset creators as the sources of the planetary observations.

References:

-   NASA Science Data Licenses: <https://science.data.nasa.gov/about/license>

-   NASA Images and Media Usage Guidelines: <https://www.nasa.gov/nasa-brand-center/images-and-media/>

-   HiRISE Image Usage Policy: <https://www.uahirise.org/media/usage.php>

**Disclaimer:** This is an independent educational and research prototype developed for the NASA Space Apps Challenge. NASA, JPL, USGS, the University of Arizona, and the original data contributors have not reviewed, certified, or endorsed its route predictions.

The routing framework provides exploratory estimates based on remote-sensing data and mathematical assumptions. Its outputs should not be interpreted as verified astronaut-safe routes or operational mission guidance.

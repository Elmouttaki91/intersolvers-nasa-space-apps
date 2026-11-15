"""
Prépare les données de Mohamad pour le web.
Usage:  python scripts/prepare_data.py "chemin/vers/Asmaa Folder"
Sortie: public/data/web/*  (PNG de couches, .bin de lecture au curseur, JSON de routes + géologie)
Le CSV de 31 Mo n'est JAMAIS chargé dans le navigateur : on le découpe en couches légères.
"""
import json, sys
from pathlib import Path
import numpy as np, pandas as pd
from PIL import Image

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "Asmaa Folder")
OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "web"
RES = SRC / "Final_Model_Results"
OUT.mkdir(parents=True, exist_ok=True)
H, W = 499, 498
X0, Y0 = 8141308.5, -278057.5          # centre de la cellule (0,0) en mètres, système Mars du projet
GRADE_LIMIT_DEG = float(np.degrees(np.arctan(0.45)))   # 24.2° (limite ±45 % du modèle)
ROUGH_P90 = 0.030254757500000003

df = pd.read_csv(SRC / "Master_Terrain_v3.csv", dtype={"butte_id": "string"})
assert len(df) == H * W
g = lambda k: df[k].to_numpy(dtype=float).reshape(H, W)
elev, slope, rough = g("elevation_m"), g("slope_deg"), g("roughness_m")
themis, tex = g("themis_qualitative"), g("texture_mean")
rgb = np.stack([g("red_mean"), g("green_mean"), g("blue_mean")], -1)
valid = df["valid_terrain"].astype(bool).to_numpy().reshape(H, W)
butte = df["inside_butte"].astype(bool).to_numpy().reshape(H, W)
art = df["artifact_suspected"].astype(bool).to_numpy().reshape(H, W)
buttes = sorted(df["butte_id"].dropna().unique().tolist())
bid = np.zeros((H, W), np.uint8)
for i, b in enumerate(buttes, 1):
    bid[(df["butte_id"] == b).fillna(False).astype(bool).to_numpy().reshape(H, W)] = i

def lut(stops, n=256):
    pos = np.array([s[0] for s in stops]); col = np.array([s[1:] for s in stops], float)
    t = np.linspace(0, 1, n)
    return np.stack([np.interp(t, pos, col[:, c]) for c in range(3)], 1).astype(np.uint8)

def colorize(a, lo, hi, L, nan_rgb=(8, 14, 40)):
    t = np.clip((a - lo) / (hi - lo), 0, 1)
    idx = np.nan_to_num(t * 255).astype(int)
    out = L[idx].copy()
    out[~np.isfinite(a)] = nan_rgb
    return out

def save(arr, name, alpha=None):
    a = np.clip(arr, 0, 255).astype(np.uint8)
    if alpha is not None:
        Image.fromarray(np.dstack([a, alpha.astype(np.uint8)]), "RGBA").save(OUT / name, optimize=True)
    else:
        Image.fromarray(a, "RGB").save(OUT / name, optimize=True)

save(rgb, "optical.png")

e = pd.DataFrame(elev).interpolate(limit_direction="both").bfill().ffill().to_numpy()
gy, gx = np.gradient(e)
az, alt = np.radians(315), np.radians(40)
sl, asp = np.arctan(np.hypot(gx, gy)), np.arctan2(-gx, gy)
hs = np.clip(np.sin(alt) * np.cos(sl) + np.cos(alt) * np.sin(sl) * np.cos(az - asp), 0, 1)
ELEV_L = lut([(0, 11, 61, 145), (.35, 53, 130, 214), (.6, 214, 160, 110), (.85, 247, 214, 150), (1, 255, 245, 214)])
base = colorize(elev, np.nanpercentile(elev, 1), np.nanpercentile(elev, 99), ELEV_L).astype(float)
save(base * (0.45 + 0.75 * hs[..., None]), "elevation.png")

SLOPE_L = lut([(0, 11, 61, 145), (.25, 53, 130, 214), (.5, 255, 223, 0), (.75, 255, 130, 40), (1, 255, 60, 90)])
save(colorize(slope, 0, 35, SLOPE_L), "slope.png")
ROUGH_L = lut([(0, 11, 61, 145), (.3, 53, 130, 214), (.6, 255, 223, 0), (1, 255, 90, 70)])
save(colorize(rough, 0, 0.09, ROUGH_L), "roughness.png")
THERM_L = lut([(0, 11, 20, 120), (.4, 83, 70, 190), (.7, 240, 110, 130), (1, 255, 230, 120)])
save(colorize(themis, 160, 196, THERM_L), "thermal.png")
TEX_L = lut([(0, 8, 14, 40), (.5, 80, 140, 220), (1, 255, 245, 200)])
save(colorize(tex, 0, 70, TEX_L), "texture.png")

haz = np.zeros((H, W, 3), np.uint8); a = np.zeros((H, W), np.uint8)
nogo = (~valid) | (slope > GRADE_LIMIT_DEG)
caution = ((rough > ROUGH_P90) | butte | (slope > 15)) & ~nogo
go = ~nogo & ~caution & ~art
haz[go] = (60, 220, 150);   a[go] = 60
haz[caution] = (255, 223, 0); a[caution] = 150
haz[nogo] = (255, 70, 100);   a[nogo] = 200
haz[art] = (190, 120, 255);   a[art] = 190
save(haz, "hazard.png", a)
frac = lambda m: round(float(m.mean() * 100), 1)
stats = dict(go_pct=frac(go), caution_pct=frac(caution), nogo_pct=frac(nogo & ~art), artifact_pct=frac(art))

def u16(a, lo, hi): return (np.clip((np.nan_to_num(a, nan=lo) - lo) / (hi - lo), 0, 1) * 65535).astype(np.uint16)
elo, ehi = float(np.nanmin(elev)), float(np.nanmax(elev))
u16(elev, elo, ehi).tofile(OUT / "elevation.u16")
np.clip(np.nan_to_num(slope) * 4, 0, 255).astype(np.uint8).tofile(OUT / "slope.u8")
np.clip(np.nan_to_num(rough) * 1000, 0, 255).astype(np.uint8).tofile(OUT / "rough.u8")
np.clip(np.nan_to_num(themis), 0, 255).astype(np.uint8).tofile(OUT / "themis.u8")
flags = (valid * 1 | butte * 2 | art * 4 | go * 8 | caution * 16 | nogo * 32).astype(np.uint8)
flags.tofile(OUT / "flags.u8"); bid.tofile(OUT / "butte.u8")

geo = json.load(open(SRC / "Murray_Buttes_Geology_Mars.geojson"))
def px(ring): return [[round(x - X0, 2), round(Y0 - y, 2)] for x, y in ring]
feats = []
for f in geo["features"]:
    rings = f["geometry"]["coordinates"]
    polys = [rings] if f["geometry"]["type"] == "Polygon" else rings
    feats.append(dict(id=f["properties"].get("Feature_No"), name=f["properties"].get("New_Name"),
                      polys=[[px(r) for r in p] for p in polys]))
json.dump(feats, open(OUT / "geology.json", "w"), separators=(",", ":"))

rc = pd.read_csv(RES / "Final_Route_Coordinates.csv")
diag = pd.read_csv(RES / "Final_Route_Diagnostics.csv")
pen = pd.read_csv(RES / "Final_Strategy_Energy_Penalties.csv")
mc = pd.read_csv(RES / "Final_Route_Results_With_HiRISE.csv")
ends = pd.read_csv(RES / "Final_Journey_Endpoints.csv")
val = pd.read_csv(RES / "Final_Internal_Validation_Checks.csv")
assum = json.load(open(RES / "Final_Model_Assumptions.json"))
journeys = {}
for _, r in ends.iterrows():
    journeys[r.Journey] = dict(start=[int(r.Start_col), int(r.Start_row)], goal=[int(r.Goal_col), int(r.Goal_row)], routes={})
for (j, s), grp in rc.groupby(["Journey", "Strategy"], sort=False):
    rows, cols = grp.Row.to_numpy(), grp.Col.to_numpy()
    d = diag[(diag.Journey == j) & (diag.Strategy == s)].iloc[0]
    p = pen[(pen.Journey == j) & (pen.Strategy == s)].iloc[0]
    prof_e = [round(float(elev[r_, c_]), 2) if np.isfinite(elev[r_, c_]) else None for r_, c_ in zip(rows, cols)]
    prof_s = [round(float(slope[r_, c_]), 1) if np.isfinite(slope[r_, c_]) else None for r_, c_ in zip(rows, cols)]
    m = mc[(mc.Journey == j) & (mc.Strategy == s)]
    scen = {}
    for _, q in m.iterrows():
        scen[q.Scenario] = dict(valid=int(q.Valid_tests), invalid=int(q.Invalid_tests), mean_kJ=round(float(q.Mean_kJ), 2),
                                sd_kJ=round(float(q.SD_kJ), 3), p95_kJ=round(float(q.P95_kJ), 2))
    hi = m.iloc[0]
    journeys[j]["routes"][s] = dict(
        path=[[int(c), int(r_)] for r_, c in zip(rows, cols)],
        elev=prof_e, slope=prof_s,
        distance_m=round(float(d.Distance_m), 1), energy_kJ=round(float(d.Nominal_energy_kJ), 1),
        max_grade=round(float(d.Max_abs_grade), 3), mean_grade=round(float(d.Mean_abs_grade), 3),
        butte_cells=int(d.Butte_cells), rough_cells=int(d.Above_roughness_p90_cells),
        energy_increase_pct=round(float(p.Energy_increase_pct), 2), mc=scen,
        optical=dict(brightness=round(float(hi.Mean_brightness), 1), texture=round(float(hi.Mean_texture), 1),
                     high_texture_pct=round(float(hi.High_texture_length_pct), 1)))
meta = dict(grid=[W, H], spacing_m=1.0, elev_range=[elo, ehi], buttes=buttes, hazard_stats=stats,
            grade_limit_deg=round(GRADE_LIMIT_DEG, 1), rough_p90_m=ROUGH_P90,
            checks=[dict(name=r.Check, passed=bool(r.Passed)) for _, r in val.iterrows()],
            assumptions=assum, journeys=journeys)
json.dump(meta, open(OUT / "meta.json", "w"), separators=(",", ":"))
print("OK", stats, {k: len(v["routes"]) for k, v in journeys.items()})

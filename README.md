# Murray Buttes Marswalk

**Intersolvers · NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map**

An interactive map that helps an astronaut plan a walk across Murray Buttes (Gale crater, Mars).
It combines optical, elevation, thermal and terrain layers, marks every area as Go, Caution or No-go,
and compares several routes by distance, energy and risk.

## Run it

```bash
npm install
npm run dev
```

To build a static site:

```bash
npm run build
```

## Features

- Map layers: optical, elevation, slope, roughness, thermal and texture
- Go / Caution / No-go terrain overlay and geologic units
- Route replay with an elevation profile
- Comparison of five route strategies
- Shareable route card


## Design & Prototype

Explore our UI/UX design and interactive prototype:

[Figma – Intersolvers: Martian Map UI/UX](https://www.figma.com/design/hqzq3JPQZk6aGPLbdOuwM1/Intersolvers--Martian-Map-UI-UX?node-id=1-3&t=CstFsfsuDjZKwgYy-1)


## Data

- HiRISE imagery
- MSL Gale DEM
- THEMIS thermal data
- Murray Buttes geology polygons

## Limits

This is a planning aid built from a research model. It is not a safety certification.
Route endpoints are illustrative, and there is no radiation layer in this version.

## License

Apache 2.0

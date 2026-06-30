# FleetVision — Enterprise Fleet Management Frontend

A modern, enterprise-grade fleet tracking & management UI built as a Wialon-class
replacement, using React + Redux Toolkit + Mantine + Leaflet.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (usually http://localhost:5173).

## Stack

- **React 18** — UI library
- **Redux Toolkit** — global state (vehicles, drivers, geofences, track player, UI)
- **Mantine 7** — component library (forms, modals, tables, charts)
- **React Router** — (scaffolded, not yet wired — currently using tab-based routing via Redux `ui.activeTab`)
- **Leaflet + react-leaflet** — maps (OpenStreetMap tiles, dark-themed via CSS filter)
- **@dnd-kit** — drag-and-drop reordering (sidebar "Reorder Interface" toggle)
- **@mantine/charts** (Recharts under the hood) — dashboard charts
- **dayjs, uuid** — utilities

## Folder structure

```
src/
  components/
    layout/         Sidebar, TopBar — app chrome
    common/          (reserved for shared primitives: Button, Modal, Table, Badge...)
  features/
    dashboard/       KPI cards, charts, activity feed
    vehicles/        Vehicle list, map, detail panel, CRUD modal — fully wired
    drivers/          Driver Management — list, detail panel, CRUD modal
    driversOnline/    Live grid of currently-active drivers
    trackPlayer/       Route playback UI: timeline scrubber, speed control, HUD
    geofences/        Circle/polygon geofences on map, CRUD modal
    reports/          Report type picker + generated reports table
  store/
    slices/           One slice per feature domain (vehicles, drivers, geofences,
                       trackPlayer, ui) — all using Redux Toolkit createSlice
    index.js          configureStore wiring
  data/
    index.js          All dummy/mock data (vehicles, drivers, geofences, etc.)
                       — swap this for real API calls when the Go backend is ready
  styles/
    globals.css       Design tokens (CSS variables), Mantine/Leaflet overrides
  main.jsx            App entry, MantineProvider + Redux Provider setup
  App.jsx             Shell layout: Sidebar + TopBar + active page switch

```

## Key features implemented

- **Vehicles**: live-simulated GPS positions (ticks every 3s), full CRUD, list/map/detail
  3-pane layout, status filtering, search.
- **Driver Management**: full CRUD, stats (rating, trips, distance, violations), detail panel.
- **Drivers Online**: card-grid of currently active drivers.
- **Track Player**: vehicle + date-range selection, simulated route generation, animated
  playback with variable speed (1x/2x/5x/10x), scrubber timeline, live HUD (speed/coords/time),
  event markers (geofence enter/exit, stops).
- **Geofences**: circle & polygon shapes rendered on Leaflet, CRUD modal, enter/exit alert
  toggles, active/inactive states.
- **Dashboard**: KPI cards, weekly distance/fuel area chart, fleet status donut, trips bar
  chart, live activity feed.
- **Reorder Mode** (sidebar toggle, bottom-left): when enabled, list items across
  Vehicles/Drivers show drag handles (dnd-kit) for reordering — mirrors the recorded reference
  UI behavior.

## Replacing dummy data with real APIs (Go backend)

All mock data lives in `src/data/index.js`. The slices in `src/store/slices/*.js` import from
there as `initialState`. To wire real APIs:

1. Add RTK Query API slices (`createApi`) per domain, or async thunks if you prefer.
2. Replace the `initialState.items` static import with an empty array, and dispatch a
   `fetchVehicles` thunk on mount.
3. Keep the CRUD reducers (`addVehicle`, `updateVehicle`, etc.) as optimistic-update handlers,
   or move them server-side and just refetch.
4. The component layer (lists, maps, forms) does not need to change — it already reads from
   Redux state shaped the same way the dummy data is shaped.

## Notes on map tiles

Currently using free OpenStreetMap tiles with a CSS filter for the dark theme
(`filter: brightness(0.7) saturate(0.8) hue-rotate(180deg) invert(1)` in `globals.css`).
For production, consider a proper dark vector tile provider (e.g. CARTO dark matter,
Stamen, or a Mapbox dark style) for cleaner results — the CSS-filter approach is a
fast placeholder.

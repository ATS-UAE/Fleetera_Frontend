import { createSlice } from '@reduxjs/toolkit';

// The shared playback clock is a real timestamp (not a point index) — each
// vehicle's route has its own point count/spacing depending on its actual trip
// history, so an index shared across vehicles wouldn't refer to the same moment
// in time for each of them. Bars/markers all read against this same clock instead.
function getGlobalRange(routes) {
  let min = Infinity, max = -Infinity;
  Object.values(routes).forEach(route => {
    if (route.length === 0) return;
    if (route[0].ts < min) min = route[0].ts;
    if (route[route.length - 1].ts > max) max = route[route.length - 1].ts;
  });
  if (!Number.isFinite(min)) return { min: 0, max: 0 };
  return { min, max };
}

const trackPlayerSlice = createSlice({
  name: 'trackPlayer',
  initialState: {
    selectedVehicleIds: [],
    dateFrom: null,
    dateTo: null,
    isPlaying: false,
    speed: 1,
    currentTs: 0,
    routes: {}, // { [vehicleId]: routePoint[] }
    loaded: false,
  },
  reducers: {
    setVehicles(state, action) {
      state.selectedVehicleIds = action.payload;
    },
    removeVehicle(state, action) {
      const id = action.payload;
      state.selectedVehicleIds = state.selectedVehicleIds.filter(v => v !== id);
      delete state.routes[id];
      state.loaded = Object.keys(state.routes).length > 0;
    },
    setDateRange(state, action) {
      state.dateFrom = action.payload.from;
      state.dateTo = action.payload.to;
    },
    loadRoutes(state, action) {
      state.routes = action.payload;
      state.loaded = Object.keys(action.payload).length > 0;
      state.currentTs = getGlobalRange(state.routes).min;
      state.isPlaying = false;
    },
    // Adds routes for newly-selected vehicles without discarding routes already
    // loaded for other vehicles (unlike loadRoutes, which replaces the whole set).
    mergeRoutes(state, action) {
      const wasEmpty = Object.keys(state.routes).length === 0;
      state.routes = { ...state.routes, ...action.payload };
      state.loaded = Object.keys(state.routes).length > 0;
      if (wasEmpty) state.currentTs = getGlobalRange(state.routes).min;
    },
    setPlaying(state, action) { state.isPlaying = action.payload; },
    setSpeed(state, action) { state.speed = action.payload; },
    setCurrentTs(state, action) {
      const { min, max } = getGlobalRange(state.routes);
      state.currentTs = Math.min(Math.max(action.payload, min), max);
    },
    tick(state) {
      const { min, max } = getGlobalRange(state.routes);
      if (max <= min || !state.isPlaying) return;
      if (state.currentTs >= max) {
        state.isPlaying = false;
        return;
      }
      // A full loaded window plays through in roughly a couple of minutes at 1x,
      // scaling linearly with the speed slider (1-100x).
      const stepMs = state.speed * 120000;
      state.currentTs = Math.min(state.currentTs + stepMs, max);
    },
    reset(state) {
      state.currentTs = getGlobalRange(state.routes).min;
      state.isPlaying = false;
    },
  },
});

export const { setVehicles, removeVehicle, setDateRange, loadRoutes, mergeRoutes, setPlaying, setSpeed, setCurrentTs, tick, reset } = trackPlayerSlice.actions;
export default trackPlayerSlice.reducer;

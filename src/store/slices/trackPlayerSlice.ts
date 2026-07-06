import { createSlice } from '@reduxjs/toolkit';

const trackPlayerSlice = createSlice({
  name: 'trackPlayer',
  initialState: {
    selectedVehicleId: null,
    dateFrom: null,
    dateTo: null,
    isPlaying: false,
    speed: 1,
    currentIndex: 0,
    route: [],
    loaded: false,
  },
  reducers: {
    setVehicle(state, action) {
      state.selectedVehicleId = action.payload;
      state.route = [];
      state.loaded = false;
      state.currentIndex = 0;
      state.isPlaying = false;
    },
    setDateRange(state, action) {
      state.dateFrom = action.payload.from;
      state.dateTo = action.payload.to;
    },
    loadRoute(state, action) {
      state.route = action.payload;
      state.loaded = true;
      state.currentIndex = 0;
      state.isPlaying = false;
    },
    setPlaying(state, action) { state.isPlaying = action.payload; },
    setSpeed(state, action) { state.speed = action.payload; },
    setCurrentIndex(state, action) { state.currentIndex = Math.min(action.payload, state.route.length - 1); },
    tick(state) {
      if (state.isPlaying && state.currentIndex < state.route.length - 1) {
        state.currentIndex += 1;
      } else if (state.currentIndex >= state.route.length - 1) {
        state.isPlaying = false;
      }
    },
    reset(state) {
      state.currentIndex = 0;
      state.isPlaying = false;
    },
  },
});

export const { setVehicle, setDateRange, loadRoute, setPlaying, setSpeed, setCurrentIndex, tick, reset } = trackPlayerSlice.actions;
export default trackPlayerSlice.reducer;

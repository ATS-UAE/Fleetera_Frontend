import type { Vehicle, VehiclesState } from '@/types';
import { createSlice, createAction } from '@reduxjs/toolkit';

const setActiveTab = createAction<string>('ui/setActiveTab');
import { vehicles as initialVehicles } from '@/data';
import { v4 as uuidv4 } from 'uuid';

const vehiclesSlice = createSlice({
  name: 'vehicles',
  initialState: {
    items: initialVehicles,
    selected: null as string | null,
    filter: { status: 'all', group: 'all', search: '' },
    loading: false,
    error: null as string | null,
    sortOrder: initialVehicles.map(v => v.id),
  } satisfies VehiclesState,
  reducers: {
    setSelected(state, action) {
      state.selected = action.payload;
    },
    setFilter(state, action) {
      state.filter = { ...state.filter, ...action.payload };
    },
    addVehicle(state, action) {
      const vehicle = { ...action.payload, id: uuidv4() };
      state.items.push(vehicle);
      state.sortOrder.push(vehicle.id);
    },
    updateVehicle(state, action) {
      const idx = state.items.findIndex(v => v.id === action.payload.id);
      if (idx !== -1) state.items[idx] = { ...state.items[idx], ...action.payload };
    },
    deleteVehicle(state, action) {
      state.items = state.items.filter(v => v.id !== action.payload);
      state.sortOrder = state.sortOrder.filter(id => id !== action.payload);
      if (state.selected === action.payload) state.selected = null;
    },
    reorderVehicles(state, action) {
      state.sortOrder = action.payload;
    },
    simulateTick(state) {
      state.items.forEach(v => {
        if (v.status === 'moving') {
          // Previously this picked a fully random direction every tick, which made
          // the marker visibly vibrate back and forth once smooth CSS transitions
          // were added (move northeast, then southwest, then northeast...).
          // Real GPS tracks move *consistently* along a heading with only small
          // drift — so we advance along v.heading and let the heading itself
          // drift gently over time, instead of randomizing position directly.

          // Gently drift the heading (+/- up to 6 degrees per tick) so the route
          // curves naturally instead of being a perfectly straight line forever.
          const headingDrift = (Math.random() - 0.5) * 12;
          v.heading = ((v.heading || 0) + headingDrift + 360) % 360;

          // Convert heading + speed into a forward step in lat/lng.
          // ~0.0006 deg per tick at ~70km/h tuned to feel right at the 3s tick rate;
          // scaled by actual speed so faster vehicles visibly cover more ground.
          const stepSize = 0.00006 * (v.speed / 10);
          const headingRad = (v.heading * Math.PI) / 180;
          // heading 0 = north (+lat), 90 = east (+lng)
          const dLat = Math.cos(headingRad) * stepSize;
          const dLng = Math.sin(headingRad) * stepSize;

          v.lat = parseFloat((v.lat + dLat).toFixed(6));
          v.lng = parseFloat((v.lng + dLng).toFixed(6));
          v.speed = Math.max(30, Math.min(120, v.speed + (Math.random() - 0.5) * 6));
          v.lastUpdate = new Date().toISOString();
          v.track = [...v.track.slice(-19), { lat: v.lat, lng: v.lng, speed: v.speed, ts: Date.now() }];
        }
      });
    },
  },
  extraReducers: (builder) => {
    // Clear vehicle selection whenever the user navigates to a different tab —
    // prevents stale detail panels showing when the user returns to this tab.
    builder.addCase(setActiveTab, (state) => {
      state.selected = null;
    });
  },
});

export const { setSelected, setFilter, addVehicle, updateVehicle, deleteVehicle, reorderVehicles, simulateTick } = vehiclesSlice.actions;
export default vehiclesSlice.reducer;

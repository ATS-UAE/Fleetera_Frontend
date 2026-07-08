import type { GeofencesState } from '@/types';
import { createSlice, createAction } from '@reduxjs/toolkit';

const setActiveTab = createAction<string>('ui/setActiveTab');
import { geofences as initialGeofences } from '@/data';
import { v4 as uuidv4 } from 'uuid';

const geofencesSlice = createSlice({
  name: 'geofences',
  initialState: {
    items: initialGeofences,
    selected: null as string | null,
    drawMode: null as 'circle' | 'polygon' | null,
    filter: { active: 'all', type: 'all', search: '' },
  } satisfies GeofencesState,
  reducers: {
    setSelected(state, action) { state.selected = action.payload; },
    setDrawMode(state, action) { state.drawMode = action.payload; },
    setFilter(state, action) { state.filter = { ...state.filter, ...action.payload }; },
    addGeofence(state, action) {
      state.items.push({ ...action.payload, id: uuidv4(), createdAt: new Date().toISOString() });
    },
    updateGeofence(state, action) {
      const idx = state.items.findIndex(g => g.id === action.payload.id);
      if (idx !== -1) state.items[idx] = { ...state.items[idx], ...action.payload };
    },
    deleteGeofence(state, action) {
      state.items = state.items.filter(g => g.id !== action.payload);
      if (state.selected === action.payload) state.selected = null;
    },
    toggleGeofenceActive(state, action) {
      const item = state.items.find(g => g.id === action.payload);
      if (item) item.active = !item.active;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(setActiveTab, (state) => {
      state.selected = null;
    });
  },
});

export const { setSelected, setDrawMode, setFilter, addGeofence, updateGeofence, deleteGeofence, toggleGeofenceActive } = geofencesSlice.actions;
export default geofencesSlice.reducer;

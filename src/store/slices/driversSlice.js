import { createSlice } from '@reduxjs/toolkit';
import { drivers as initialDrivers } from '@/data';
import { v4 as uuidv4 } from 'uuid';

const driversSlice = createSlice({
  name: 'drivers',
  initialState: {
    items: initialDrivers,
    selected: null,
    filter: { status: 'all', group: 'all', search: '' },
    sortOrder: initialDrivers.map(d => d.id),
  },
  reducers: {
    setSelected(state, action) { state.selected = action.payload; },
    setFilter(state, action) { state.filter = { ...state.filter, ...action.payload }; },
    addDriver(state, action) {
      const driver = { ...action.payload, id: uuidv4() };
      state.items.push(driver);
      state.sortOrder.push(driver.id);
    },
    updateDriver(state, action) {
      const idx = state.items.findIndex(d => d.id === action.payload.id);
      if (idx !== -1) state.items[idx] = { ...state.items[idx], ...action.payload };
    },
    deleteDriver(state, action) {
      state.items = state.items.filter(d => d.id !== action.payload);
      state.sortOrder = state.sortOrder.filter(id => id !== action.payload);
      if (state.selected === action.payload) state.selected = null;
    },
    reorderDrivers(state, action) { state.sortOrder = action.payload; },
  },
});

export const { setSelected, setFilter, addDriver, updateDriver, deleteDriver, reorderDrivers } = driversSlice.actions;
export default driversSlice.reducer;

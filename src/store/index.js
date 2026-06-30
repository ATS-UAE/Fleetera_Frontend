import { configureStore } from '@reduxjs/toolkit';
import vehiclesReducer from './slices/vehiclesSlice';
import driversReducer from './slices/driversSlice';
import geofencesReducer from './slices/geofencesSlice';
import trackPlayerReducer from './slices/trackPlayerSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    vehicles: vehiclesReducer,
    drivers: driversReducer,
    geofences: geofencesReducer,
    trackPlayer: trackPlayerReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export default store;

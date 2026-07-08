import { createSlice } from '@reduxjs/toolkit';
import type { ColumnVisibilityState } from '@/types';

// ── Default visibility (all visible) ─────────────────────────────────────────
export const DEFAULT_VEHICLE_COLUMNS: Record<string, boolean> = {
  vehicleIcon:  true,
  vehicleName:  true,
  vehiclePlate: true,
  vehicleType:  true,
  statusPill:   true,
  speedMeta:    true,
  fuelMeta:     true,
};

export const DEFAULT_DRIVER_COLUMNS: Record<string, boolean> = {
  avatar:       true,
  driverName:   true,
  driverCode:   true,
  statusBadge:  true,
  rating:       true,
};

export const DEFAULT_DRIVERS_ONLINE_COLUMNS: Record<string, boolean> = {
  phone:        true,
  location:     true,
  activeTime:   true,
  rating:       true,
  trips:        true,
};

export const DEFAULT_GEOFENCE_COLUMNS: Record<string, boolean> = {
  shapeIcon:    true,
  geoName:      true,
  geoMeta:      true,
  alertTags:    true,
};

// ── localStorage persistence helpers ─────────────────────────────────────────
const STORAGE_KEY = 'fv-col-visibility';

function loadFromStorage(): Partial<ColumnVisibilityState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function buildInitial(): ColumnVisibilityState {
  const stored = loadFromStorage();
  return {
    vehicles:      { ...DEFAULT_VEHICLE_COLUMNS,       ...(stored.vehicles      ?? {}) },
    drivers:       { ...DEFAULT_DRIVER_COLUMNS,        ...(stored.drivers       ?? {}) },
    driversOnline: { ...DEFAULT_DRIVERS_ONLINE_COLUMNS,...(stored.driversOnline ?? {}) },
    geofences:     { ...DEFAULT_GEOFENCE_COLUMNS,      ...(stored.geofences     ?? {}) },
  };
}

function saveToStorage(state: ColumnVisibilityState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

// ── Slice ─────────────────────────────────────────────────────────────────────
const columnVisibilitySlice = createSlice({
  name: 'columnVisibility',
  initialState: buildInitial(),
  reducers: {
    setColumnVisible(
      state,
      action: { payload: { list: keyof ColumnVisibilityState; key: string; visible: boolean } }
    ) {
      const { list, key, visible } = action.payload;
      state[list][key] = visible;
      saveToStorage({ ...state });
    },
    resetListColumns(
      state,
      action: { payload: { list: keyof ColumnVisibilityState } }
    ) {
      const { list } = action.payload;
      const defaults: Record<string, Record<string, boolean>> = {
        vehicles:      DEFAULT_VEHICLE_COLUMNS,
        drivers:       DEFAULT_DRIVER_COLUMNS,
        driversOnline: DEFAULT_DRIVERS_ONLINE_COLUMNS,
        geofences:     DEFAULT_GEOFENCE_COLUMNS,
      };
      state[list] = { ...defaults[list] };
      saveToStorage({ ...state });
    },
  },
});

export const { setColumnVisible, resetListColumns } = columnVisibilitySlice.actions;
export default columnVisibilitySlice.reducer;

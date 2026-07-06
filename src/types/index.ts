// ─── Vehicle ─────────────────────────────────────────────────────────────────
export type VehicleStatus = 'moving' | 'idle' | 'stopped' | 'offline' | 'maintenance';

export interface TrackPoint {
  lat: number;
  lng: number;
  speed: number;
  ts: number;
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  type: string;
  make: string;
  model: string;
  year: number;
  color: string;
  status: VehicleStatus;
  speed: number;
  fuel: number;
  odometer: number;
  lat: number;
  lng: number;
  heading: number;
  driverId: string | null;
  groupId: string;
  lastUpdate: string;
  engineOn: boolean;
  ignition: boolean;
  insurance: string;
  service: string;
  sim: string;
  imei: string;
  track: TrackPoint[];
}

// ─── Driver ───────────────────────────────────────────────────────────────────
export type DriverStatus = 'online' | 'offline' | 'on_trip' | 'break';

export interface Driver {
  id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  license: string;
  licenseExpiry: string;
  licenseClass: string;
  status: DriverStatus;
  avatar: string | null;
  groupId: string;
  joinDate: string;
  rating: number;
  totalTrips: number;
  totalDistance: number;
  violations: number;
  currentVehicleId: string | null;
  address: string;
  emergencyContact: string;
  notes: string;
}

// ─── Geofence ─────────────────────────────────────────────────────────────────
export type GeofenceType = 'circle' | 'polygon';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Geofence {
  id: string;
  name: string;
  type: GeofenceType;
  color: string;
  description: string;
  center: LatLng | null;
  radius: number | null;
  coordinates: LatLng[] | null;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  createdAt: string;
  active: boolean;
  groupId: string;
}

// ─── Group ────────────────────────────────────────────────────────────────────
export interface Group {
  id: string;
  name: string;
  color: string;
  count: number;
}

// ─── Notification / Activity ──────────────────────────────────────────────────
export type Severity = 'info' | 'warning' | 'danger' | 'success';

export interface ActivityItem {
  id: string;
  type: string;
  vehicle: string;
  zone?: string;
  detail?: string;
  time: string;
  severity: Severity;
}

// ─── Redux state shapes ───────────────────────────────────────────────────────
export interface VehiclesState {
  items: Vehicle[];
  selected: string | null;
  filter: { status: string; group: string; search: string };
  loading: boolean;
  error: string | null;
  sortOrder: string[];
}

export interface DriversState {
  items: Driver[];
  selected: string | null;
  filter: { status: string; group: string; search: string };
  sortOrder: string[];
}

export interface GeofencesState {
  items: Geofence[];
  selected: string | null;
  drawMode: GeofenceType | null;
  filter: { active: string; type: string; search: string };
}

export interface TrackPoint2 extends TrackPoint {
  heading: number;
  event: string | null;
}

export interface TrackPlayerState {
  selectedVehicleId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  isPlaying: boolean;
  speed: number;
  currentIndex: number;
  route: TrackPoint2[];
  loaded: boolean;
}

export type SettingsSection = 'profile' | 'appearance' | 'notifications' | null;

export interface UiState {
  sidebarCollapsed: boolean;
  reorderMode: boolean;
  theme: 'dark' | 'light';
  activeTab: string;
  navOrder: string[];
  notifications: ActivityItem[];
  settingsTreeOpen: boolean;
  settingsActiveSection: SettingsSection;
}

export interface RootState {
  vehicles: VehiclesState;
  drivers: DriversState;
  geofences: GeofencesState;
  trackPlayer: TrackPlayerState;
  ui: UiState;
}

// ─── Vehicle Icon props ───────────────────────────────────────────────────────
export interface VehiclePuckIconProps {
  color?: string;
  heading?: number;
  isSelected?: boolean;
  isMoving?: boolean;
  name?: string;
}

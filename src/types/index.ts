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

// ─── Column Visibility ────────────────────────────────────────────────────────
export interface ColumnVisibilityState {
  vehicles:      Record<string, boolean>;
  drivers:       Record<string, boolean>;
  driversOnline: Record<string, boolean>;
  geofences:     Record<string, boolean>;
}

export interface TrackPoint2 extends TrackPoint {
  heading: number;
  event: string | null;
}

// ─── Track Player (multi-vehicle history playback) ────────────────────────────
export type TrackStatus = 'trip' | 'parking' | 'idle';

export interface TrackDataPoint {
  lat: number;
  lng: number;
  speed: number;
  battery: number;
  satellites: number;
  heading: number;
  ts: number;
  status: TrackStatus;
  geofenceName: string | null;
  startLocation: string;
  endLocation: string;
}

export interface VehicleTrackSegment {
  id: string;
  status: TrackStatus;
  startLocation: string;
  endLocation: string;
  geofenceId: string | null;
  geofenceName: string | null;
  startTs: number;
  endTs: number;
  durationMs: number;
  points: Array<{
    lat: number;
    lng: number;
    speed: number;
    battery: number;
    satellites: number;
    heading: number;
    ts: number;
  }>;
}

export interface VehicleTrackData {
  vehicle: {
    id: string;
    name: string;
    plate: string;
    type: string;
    make: string;
    model: string;
    color: string;
    status: VehicleStatus;
  };
  geofences: Array<{
    id: string;
    name: string;
    type: GeofenceType;
    center: LatLng | null;
    radius: number | null;
  }>;
  tracks: VehicleTrackSegment[];
}

export interface TrackPlayerState {
  selectedVehicleIds: string[];
  dateFrom: string | null;
  dateTo: string | null;
  isPlaying: boolean;
  speed: number;
  currentTs: number;
  routes: Record<string, TrackDataPoint[]>;
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
  columnVisibility: ColumnVisibilityState;
}

// ─── Vehicle Icon props ───────────────────────────────────────────────────────
export interface VehiclePuckIconProps {
  color?: string;
  heading?: number;
  isSelected?: boolean;
  isMoving?: boolean;
  name?: string;
}

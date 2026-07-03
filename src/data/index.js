import { v4 as uuidv4 } from 'uuid';
import { buildVehicleTrackData, formatTrackDuration, getTrackDistanceKm } from './vehicleTracks.js';

export const VEHICLE_STATUSES = {
  MOVING: 'moving',
  IDLE: 'idle',
  OFFLINE: 'offline',
  STOPPED: 'stopped',
  MAINTENANCE: 'maintenance',
};

export const DRIVER_STATUSES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  ON_TRIP: 'on_trip',
  BREAK: 'break',
};

export const vehicles = [
  {
    id: uuidv4(), name: 'TRK-001', plate: 'WP-CAB-1234', type: 'Heavy Truck',
    make: 'Volvo', model: 'FH16', year: 2022, color: '#22b553',
    status: VEHICLE_STATUSES.MOVING, speed: 72, fuel: 68, odometer: 142500,
    lat: 7.2906, lng: 80.6337, heading: 45,
    driverId: null, groupId: 'g1',
    lastUpdate: new Date(Date.now() - 120000).toISOString(),
    engineOn: true, ignition: true,
    insurance: '2025-12-31', service: '2024-08-15',
    sim: '+94771234567', imei: '356938035643809',
    track: [
      { lat: 7.2800, lng: 80.6200, speed: 65, ts: Date.now() - 600000 },
      { lat: 7.2840, lng: 80.6250, speed: 70, ts: Date.now() - 480000 },
      { lat: 7.2870, lng: 80.6290, speed: 68, ts: Date.now() - 360000 },
      { lat: 7.2890, lng: 80.6310, speed: 72, ts: Date.now() - 240000 },
      { lat: 7.2906, lng: 80.6337, speed: 72, ts: Date.now() - 120000 },
    ],
  },
  {
    id: uuidv4(), name: 'VAN-023', plate: 'WP-ASD-5678', type: 'Van',
    make: 'Mercedes', model: 'Sprinter', year: 2021, color: '#1b84e7',
    status: VEHICLE_STATUSES.IDLE, speed: 0, fuel: 45, odometer: 89300,
    lat: 7.3120, lng: 80.6510, heading: 180,
    driverId: null, groupId: 'g1',
    lastUpdate: new Date(Date.now() - 600000).toISOString(),
    engineOn: true, ignition: false,
    insurance: '2025-06-30', service: '2024-09-01',
    sim: '+94779876543', imei: '356938035643810',
    track: [
      // Idle/parked the whole window: speed stays ~0 and position doesn't drift.
      { lat: 7.3120, lng: 80.6510, speed: 0, ts: Date.now() - 1200000 },
      { lat: 7.3120, lng: 80.6510, speed: 0, ts: Date.now() - 900000 },
      { lat: 7.3120, lng: 80.6510, speed: 0, ts: Date.now() - 700000 },
      { lat: 7.3120, lng: 80.6510, speed: 0, ts: Date.now() - 600000 },
    ],
  },
  {
    id: uuidv4(), name: 'CAR-047', plate: 'CP-KDY-9012', type: 'Sedan',
    make: 'Toyota', model: 'Camry', year: 2023, color: '#F59E0B',
    status: VEHICLE_STATUSES.STOPPED, speed: 0, fuel: 92, odometer: 23100,
    lat: 7.2654, lng: 80.6010, heading: 270,
    driverId: null, groupId: 'g2',
    lastUpdate: new Date(Date.now() - 1800000).toISOString(),
    engineOn: false, ignition: false,
    insurance: '2026-03-15', service: '2024-12-01',
    sim: '+94772345678', imei: '356938035643811',
    track: [
      { lat: 7.2700, lng: 80.6100, speed: 60, ts: Date.now() - 3600000 },
      { lat: 7.2680, lng: 80.6060, speed: 45, ts: Date.now() - 3000000 },
      { lat: 7.2660, lng: 80.6020, speed: 20, ts: Date.now() - 2400000 },
      { lat: 7.2654, lng: 80.6010, speed: 0, ts: Date.now() - 1800000 },
    ],
  },
  {
    id: uuidv4(), name: 'BUS-012', plate: 'SG-BUS-3456', type: 'Bus',
    make: 'Tata', model: 'Starbus', year: 2020, color: '#8B5CF6',
    status: VEHICLE_STATUSES.MOVING, speed: 55, fuel: 32, odometer: 312000,
    lat: 7.3450, lng: 80.6700, heading: 90,
    driverId: null, groupId: 'g2',
    lastUpdate: new Date(Date.now() - 60000).toISOString(),
    engineOn: true, ignition: true,
    insurance: '2025-09-30', service: '2024-07-20',
    sim: '+94773456789', imei: '356938035643812',
    track: [
      { lat: 7.3450, lng: 80.6550, speed: 58, ts: Date.now() - 600000 },
      { lat: 7.3450, lng: 80.6600, speed: 55, ts: Date.now() - 400000 },
      { lat: 7.3450, lng: 80.6650, speed: 57, ts: Date.now() - 200000 },
      { lat: 7.3450, lng: 80.6700, speed: 55, ts: Date.now() - 60000 },
    ],
  },
  {
    id: uuidv4(), name: 'PKP-088', plate: 'NW-PKP-7890', type: 'Pickup',
    make: 'Ford', model: 'F-150', year: 2022, color: '#EF4444',
    status: VEHICLE_STATUSES.OFFLINE, speed: 0, fuel: 15, odometer: 67800,
    lat: 7.2200, lng: 80.5900, heading: 0,
    driverId: null, groupId: 'g3',
    lastUpdate: new Date(Date.now() - 7200000).toISOString(),
    engineOn: false, ignition: false,
    insurance: '2025-01-15', service: '2024-06-01',
    sim: '+94774567890', imei: '356938035643813',
    track: [],
  },
  {
    id: uuidv4(), name: 'TRK-055', plate: 'EP-TRK-2345', type: 'Heavy Truck',
    make: 'Scania', model: 'R500', year: 2021, color: '#06B6D4',
    status: VEHICLE_STATUSES.MAINTENANCE, speed: 0, fuel: 78, odometer: 198400,
    lat: 7.2950, lng: 80.6450, heading: 135,
    driverId: null, groupId: 'g3',
    lastUpdate: new Date(Date.now() - 3600000).toISOString(),
    engineOn: false, ignition: false,
    insurance: '2026-01-20', service: '2024-08-01',
    sim: '+94775678901', imei: '356938035643814',
    track: [],
  },
  {
    id: uuidv4(), name: 'TRK-004', plate: 'WP-CAC-2255', type: 'Heavy Truck',
    make: 'Volvo', model: 'FH16', year: 2022, color: '#3B82F6',
    status: VEHICLE_STATUSES.MOVING, speed: 72, fuel: 68, odometer: 142500,
    lat: 7.2906, lng: 80.6337, heading: 45,
    driverId: null, groupId: 'g1',
    lastUpdate: new Date(Date.now() - 120000).toISOString(),
    engineOn: true, ignition: true,
    insurance: '2025-12-31', service: '2024-08-15',
    sim: '+94771234567', imei: '356938035643809',
    track: [
      { lat: 7.2800, lng: 80.6200, speed: 65, ts: Date.now() - 600000 },
      { lat: 7.2840, lng: 80.6250, speed: 70, ts: Date.now() - 480000 },
      { lat: 7.2870, lng: 80.6290, speed: 68, ts: Date.now() - 360000 },
      { lat: 7.2890, lng: 80.6310, speed: 72, ts: Date.now() - 240000 },
      { lat: 7.2906, lng: 80.6337, speed: 72, ts: Date.now() - 120000 },
    ],
  },
];

export const drivers = [
  {
    id: uuidv4(), name: 'Kasun Perera', code: 'DRV-001',
    phone: '+94771234567', email: 'kasun.p@fleet.lk',
    license: 'B1234567', licenseExpiry: '2026-08-15',
    licenseClass: 'Class A', status: DRIVER_STATUSES.ON_TRIP,
    avatar: null, groupId: 'g1',
    joinDate: '2021-03-15', rating: 4.8, totalTrips: 1247,
    totalDistance: 89430, violations: 2,
    currentVehicleId: null,
    address: 'No.12, Main Street, Kandy',
    emergencyContact: 'Nimal Perera - +94772345678',
    notes: 'Experienced long-haul driver. Excellent safety record.',
  },
  {
    id: uuidv4(), name: 'Nimal Silva', code: 'DRV-002',
    phone: '+94779876543', email: 'nimal.s@fleet.lk',
    license: 'B9876543', licenseExpiry: '2025-11-20',
    licenseClass: 'Class B', status: DRIVER_STATUSES.ONLINE,
    avatar: null, groupId: 'g1',
    joinDate: '2020-07-01', rating: 4.5, totalTrips: 2103,
    totalDistance: 134200, violations: 5,
    currentVehicleId: null,
    address: 'No.45, Temple Road, Colombo',
    emergencyContact: 'Sunil Silva - +94773456789',
    notes: 'City routes specialist.',
  },
  {
    id: uuidv4(), name: 'Amal Fernando', code: 'DRV-003',
    phone: '+94772345678', email: 'amal.f@fleet.lk',
    license: 'C2345678', licenseExpiry: '2027-03-10',
    licenseClass: 'Class C', status: DRIVER_STATUSES.OFFLINE,
    avatar: null, groupId: 'g2',
    joinDate: '2022-01-10', rating: 4.2, totalTrips: 634,
    totalDistance: 41200, violations: 1,
    currentVehicleId: null,
    address: 'No.78, Lake Road, Galle',
    emergencyContact: 'Ravi Fernando - +94774567890',
    notes: '',
  },
  {
    id: uuidv4(), name: 'Ruwan Jayasinghe', code: 'DRV-004',
    phone: '+94773456789', email: 'ruwan.j@fleet.lk',
    license: 'A3456789', licenseExpiry: '2026-06-25',
    licenseClass: 'Class A', status: DRIVER_STATUSES.ON_TRIP,
    avatar: null, groupId: 'g2',
    joinDate: '2019-11-20', rating: 4.9, totalTrips: 3421,
    totalDistance: 289100, violations: 0,
    currentVehicleId: null,
    address: 'No.23, Hill Street, Nuwara Eliya',
    emergencyContact: 'Priya Jayasinghe - +94775678901',
    notes: 'Top performer. Zero violations record.',
  },
  {
    id: uuidv4(), name: 'Chaminda Wickrama', code: 'DRV-005',
    phone: '+94774567890', email: 'chaminda.w@fleet.lk',
    license: 'B4567890', licenseExpiry: '2025-09-30',
    licenseClass: 'Class B', status: DRIVER_STATUSES.BREAK,
    avatar: null, groupId: 'g3',
    joinDate: '2023-04-05', rating: 3.9, totalTrips: 312,
    totalDistance: 19800, violations: 3,
    currentVehicleId: null,
    address: 'No.56, Beach Road, Negombo',
    emergencyContact: 'Suresh Wickrama - +94776789012',
    notes: 'Probationary period ended. Needs improvement on fuel efficiency.',
  },
  {
    id: uuidv4(), name: 'Sunil Perera', code: 'DRV-006',
    phone: '+94774567447', email: 'perera.w@fleet.lk',
    license: 'D9987890', licenseExpiry: '2026-09-30',
    licenseClass: 'Class A', status: DRIVER_STATUSES.ONLINE,
    avatar: null, groupId: 'g3',
    joinDate: '2023-04-05', rating: 3.9, totalTrips: 312,
    totalDistance: 19800, violations: 3,
    currentVehicleId: null,
    address: 'No.56, Beach Road, Negombo',
    emergencyContact: 'Suresh Wickrama - +94776789012',
    notes: 'Probationary period ended. Needs improvement on fuel efficiency.',
  },
  {
    id: uuidv4(), name: 'Namal Senevirathna', code: 'DRV-007',
    phone: '+94779012056', email: 'senevirathna.p@fleet.lk',
    license: 'C1234567', licenseExpiry: '2026-08-15',
    licenseClass: 'Class A', status: DRIVER_STATUSES.BREAK,
    avatar: null, groupId: 'g1',
    joinDate: '2021-03-15', rating: 4.8, totalTrips: 1247,
    totalDistance: 89430, violations: 2,
    currentVehicleId: null,
    address: 'No.12, Main Street, Kandy',
    emergencyContact: 'Nimal Perera - +94772345678',
    notes: 'Experienced long-haul driver. Excellent safety record.',
  },
  {
    id: uuidv4(), name: 'Sahan Jayasinghe', code: 'DRV-008',
    phone: '+94773451062', email: 'sahan.j@fleet.lk',
    license: 'D3456789', licenseExpiry: '2026-06-25',
    licenseClass: 'Class A', status: DRIVER_STATUSES.ON_TRIP,
    avatar: null, groupId: 'g2',
    joinDate: '2019-11-20', rating: 4.9, totalTrips: 3421,
    totalDistance: 289100, violations: 0,
    currentVehicleId: null,
    address: 'No.23, Hill Street, Nuwara Eliya',
    emergencyContact: 'Priya Jayasinghe - +94775678901',
    notes: 'Top performer. Zero violations record.',
  }
];

export const geofences = [
  {
    id: uuidv4(), name: 'Kandy Depot', type: 'circle', color: '#3B82F6',
    description: 'Main vehicle depot in Kandy',
    center: { lat: 7.2906, lng: 80.6337 }, radius: 500,
    coordinates: null,
    alertOnEnter: true, alertOnExit: true,
    createdAt: '2024-01-15T08:00:00Z',
    active: true, groupId: 'g1',
  },
  {
    id: uuidv4(), name: 'Colombo Hub', type: 'polygon', color: '#10B981',
    description: 'Colombo distribution hub',
    center: null, radius: null,
    coordinates: [
      { lat: 6.9271, lng: 79.8610 },
      { lat: 6.9271, lng: 79.8750 },
      { lat: 6.9100, lng: 79.8750 },
      { lat: 6.9100, lng: 79.8610 },
    ],
    alertOnEnter: true, alertOnExit: false,
    createdAt: '2024-02-20T10:30:00Z',
    active: true, groupId: 'g1',
  },
  {
    id: uuidv4(), name: 'Restricted Zone A', type: 'polygon', color: '#EF4444',
    description: 'No entry zone - Port area',
    center: null, radius: null,
    coordinates: [
      { lat: 7.3200, lng: 80.6600 },
      { lat: 7.3200, lng: 80.6800 },
      { lat: 7.3000, lng: 80.6800 },
      { lat: 7.3000, lng: 80.6600 },
    ],
    alertOnEnter: true, alertOnExit: false,
    createdAt: '2024-03-10T09:15:00Z',
    active: true, groupId: 'g2',
  },
  {
    id: uuidv4(), name: 'Fuel Station Zone', type: 'circle', color: '#F59E0B',
    description: 'Authorized fuel stations cluster',
    center: { lat: 7.2654, lng: 80.6010 }, radius: 300,
    coordinates: null,
    alertOnEnter: false, alertOnExit: false,
    createdAt: '2024-04-05T14:00:00Z',
    active: false, groupId: 'g2',
  },
  {
    id: uuidv4(), name: 'Kurunegala Depot', type: 'circle', color: '#3B82F6',
    description: 'Main vehicle depot in Kurunegala',
    center: { lat: 7.2906, lng: 80.6337 }, radius: 500,
    coordinates: null,
    alertOnEnter: true, alertOnExit: true,
    createdAt: '2024-01-15T08:00:00Z',
    active: true, groupId: 'g1',
  },
  {
    id: uuidv4(), name: 'Restricted Zone B', type: 'polygon', color: '#831394',
    description: 'No entry zone - Port area',
    center: { lat: 7.2906, lng: 80.6337 }, radius: 500,
    coordinates: null,
    alertOnEnter: true, alertOnExit: true,
    createdAt: '2024-01-15T08:00:00Z',
    active: true, groupId: 'g1',
  },
  
];

export const groups = [
  { id: 'g1', name: 'Northern Fleet', color: '#3B82F6', count: 2 },
  { id: 'g2', name: 'Southern Fleet', color: '#10B981', count: 2 },
  { id: 'g3', name: 'Maintenance Bay', color: '#F59E0B', count: 2 },
];

export const reports = [
  {
    id: uuidv4(), type: 'trip_summary', name: 'Daily Trip Summary',
    vehicleId: vehicles[0]?.id, driverId: drivers[0]?.id,
    dateFrom: '2024-07-01T00:00:00Z', dateTo: '2024-07-01T23:59:59Z',
    status: 'ready', createdAt: '2024-07-02T06:00:00Z',
  },
];

export const dashboardStats = {
  totalVehicles: vehicles.length,
  moving: vehicles.filter(v => v.status === VEHICLE_STATUSES.MOVING).length,
  idle: vehicles.filter(v => v.status === VEHICLE_STATUSES.IDLE).length,
  offline: vehicles.filter(v => v.status === VEHICLE_STATUSES.OFFLINE).length,
  stopped: vehicles.filter(v => v.status === VEHICLE_STATUSES.STOPPED).length,
  maintenance: vehicles.filter(v => v.status === VEHICLE_STATUSES.MAINTENANCE).length,
  totalDrivers: drivers.length,
  driversOnline: drivers.filter(d => d.status !== DRIVER_STATUSES.OFFLINE).length,
  totalDistance: 8432,
  fuelConsumed: 1247,
  alerts: 14,
  geofenceEvents: 38,
};

export const activityFeed = [
  { id: uuidv4(), type: 'geofence_enter', vehicle: 'TRK-001', zone: 'Kandy Depot', time: '2 min ago', severity: 'info' },
  { id: uuidv4(), type: 'speed_alert', vehicle: 'BUS-012', detail: 'Speed: 92 km/h', time: '8 min ago', severity: 'warning' },
  { id: uuidv4(), type: 'fuel_low', vehicle: 'PKP-088', detail: 'Fuel: 15%', time: '15 min ago', severity: 'danger' },
  { id: uuidv4(), type: 'geofence_exit', vehicle: 'VAN-023', zone: 'Colombo Hub', time: '22 min ago', severity: 'info' },
  { id: uuidv4(), type: 'ignition_on', vehicle: 'TRK-055', time: '31 min ago', severity: 'success' },
  { id: uuidv4(), type: 'maintenance_due', vehicle: 'BUS-012', detail: 'Service overdue 500km', time: '1 hr ago', severity: 'warning' },
];

export const tripHistory = [
  { day: 'Mon', distance: 1240, fuel: 185, trips: 18 },
  { day: 'Tue', distance: 980, fuel: 142, trips: 14 },
  { day: 'Wed', distance: 1560, fuel: 228, trips: 22 },
  { day: 'Thu', distance: 1100, fuel: 163, trips: 16 },
  { day: 'Fri', distance: 1380, fuel: 201, trips: 20 },
  { day: 'Sat', distance: 740, fuel: 108, trips: 11 },
  { day: 'Sun', distance: 432, fuel: 64, trips: 7 },
];

// Per-vehicle multi-trip mock dataset (vehicle info + related geofences + a full
// alternating trip/parking track history with per-point battery/speed/satellites).
// Built here (after vehicles/geofences above are defined) rather than inside
// vehicleTracks.js, which stays a pure module with no import from this file —
// otherwise the two modules would import each other and blow up with a
// "Cannot access before initialization" error.
export const vehicleTrackData = buildVehicleTrackData(vehicles, geofences);

export function getVehicleTrackData(vehicleId) {
  return vehicleTrackData.find(entry => entry.vehicle.id === vehicleId) || null;
}

export { formatTrackDuration, getTrackDistanceKm };

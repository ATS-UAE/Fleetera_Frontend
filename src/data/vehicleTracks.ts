import type { Vehicle, Geofence, VehicleTrackData, VehicleTrackSegment, TrackStatus } from '@/types';

// Deterministic PRNG (mulberry32) so this mock dataset looks the same for the
// lifetime of a single module load, instead of reshuffling on every render.
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

/** Compass bearing in degrees from point A to point B (0 = north). */
function bearingBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const PLACE_NAMES = [
  'Kandy Town', 'Colombo Fort', 'Galle Face', 'Negombo Beach', 'Nuwara Eliya',
  'Kurunegala Junction', 'Kegalle', 'Matara', 'Anuradhapura', 'Peradeniya',
];

function pick<T>(rand: () => number, arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; }

/** Builds an alternating sequence of parking/idle and trip segments for one vehicle. */
function buildVehicleTracks(vehicle: Vehicle, vehicleIndex: number, depotGeofences: Geofence[]): VehicleTrackSegment[] {
  const rand = mulberry32(hashString(vehicle.id) ^ (vehicleIndex * 7919));
  const tracks: VehicleTrackSegment[] = [];
  const numTrips = 3 + Math.floor(rand() * 3); // 3-5 trips per vehicle
  let cursorTs = Date.now() - 36 * 3600 * 1000; // mock window starts 36h ago
  let lat = vehicle.lat + (rand() - 0.5) * 0.08;
  let lng = vehicle.lng + (rand() - 0.5) * 0.08;
  let locationName = pick(rand, PLACE_NAMES);

  for (let t = 0; t < numTrips; t++) {
    // --- Parking / idle segment (vehicle stationary) ---
    const isIdle = rand() < 0.35; // brief "engine on, not moving" vs a longer full park
    const durationMs = Math.round(isIdle ? (5 + rand() * 25) * 60000 : (30 + rand() * 150) * 60000);
    const depot = rand() < 0.5 ? pick(rand, depotGeofences) : null;
    if (depot && depot.center) { lat = depot.center.lat; lng = depot.center.lng; locationName = depot.name; }

    const parkPoints = [0, durationMs].map(offset => ({
      lat: +lat.toFixed(6), lng: +lng.toFixed(6),
      speed: 0,
      battery: Math.round(55 + rand() * 45),
      satellites: 4 + Math.floor(rand() * 8),
      heading: 0,
      ts: cursorTs + offset,
    }));

    const status: TrackStatus = isIdle ? 'idle' : 'parking';
    tracks.push({
      id: `${vehicle.id}-park-${t}`,
      status,
      startLocation: locationName,
      endLocation: locationName,
      geofenceId: depot?.id || null,
      geofenceName: depot?.name || null,
      startTs: cursorTs,
      endTs: cursorTs + durationMs,
      durationMs,
      points: parkPoints,
    });
    cursorTs += durationMs;

    // --- Trip segment (vehicle moving from one place to another) ---
    const startLocation = locationName;
    const endLocation = pick(rand, PLACE_NAMES.filter(p => p !== startLocation));
    const numPoints = 12 + Math.floor(rand() * 24); // 12-36 points
    const pointIntervalMs = Math.round((60 + rand() * 60) * 1000); // ~1-2 min apart
    const points: VehicleTrackSegment['points'] = [];
    for (let i = 0; i < numPoints; i++) {
      lat += (rand() - 0.48) * 0.006;
      lng += (rand() - 0.48) * 0.006;
      points.push({
        lat: +lat.toFixed(6), lng: +lng.toFixed(6),
        speed: Math.round(15 + rand() * 85),
        battery: Math.round(50 + rand() * 50),
        satellites: 4 + Math.floor(rand() * 8),
        heading: 0,
        ts: Math.round(cursorTs + i * pointIntervalMs),
      });
    }
    // Derive real headings from the direction of travel between consecutive
    // points, instead of random values, so a vehicle puck rotates to face its path.
    for (let i = 0; i < points.length; i++) {
      points[i].heading = bearingBetween(points[i], points[i + 1] || points[i]);
    }
    const tripDurationMs = (numPoints - 1) * pointIntervalMs;
    locationName = endLocation;

    tracks.push({
      id: `${vehicle.id}-trip-${t}`,
      status: 'trip',
      startLocation,
      endLocation,
      geofenceId: null,
      geofenceName: null,
      startTs: cursorTs,
      endTs: cursorTs + tripDurationMs,
      durationMs: tripDurationMs,
      points,
    });
    cursorTs += tripDurationMs;
  }

  // The loop above builds forward from an arbitrary anchor, so the last track can
  // end anywhere from ~1 to ~18 hours before "now" depending on how many/how long
  // the generated segments happened to be — which would make short lookback
  // presets ("last 2 hours", "today") often find no overlapping data at all.
  // Shift every timestamp so the most recent track ends just a few minutes ago,
  // like a real vehicle's last-known-position gap.
  const lastEndTs = tracks[tracks.length - 1].endTs;
  const recencyJitterMs = rand() * 10 * 60000; // 0-10 min "staleness"
  const shift = Date.now() - lastEndTs - recencyJitterMs;
  tracks.forEach(track => {
    track.startTs += shift;
    track.endTs += shift;
    track.points.forEach(p => { p.ts += shift; });
  });

  return tracks;
}

// One entry per vehicle, bundling its own info + the geofences its parking spots
// reference + its full alternating trip/parking track history. Takes `vehicles`/
// `geofences` as arguments (rather than importing them from ./index.ts) so this
// module has no dependency on index.ts — index.ts depends on this one, not the
// other way round, avoiding a circular-import initialization-order error.
export function buildVehicleTrackData(vehicles: Vehicle[], geofences: Geofence[]): VehicleTrackData[] {
  const depotGeofences = geofences.filter(g => g.center);

  return vehicles.map((vehicle, i) => {
    const tracks = buildVehicleTracks(vehicle, i, depotGeofences);
    const usedGeofenceIds = new Set(tracks.map(t => t.geofenceId).filter(Boolean));
    const relatedGeofences = geofences
      .filter(g => usedGeofenceIds.has(g.id))
      .map(g => ({ id: g.id, name: g.name, type: g.type, center: g.center, radius: g.radius }));

    return {
      vehicle: {
        id: vehicle.id, name: vehicle.name, plate: vehicle.plate, type: vehicle.type,
        make: vehicle.make, model: vehicle.model, color: vehicle.color, status: vehicle.status,
      },
      geofences: relatedGeofences,
      tracks,
    };
  });
}

export function formatTrackDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function getTrackDistanceKm(track: VehicleTrackSegment): number {
  const pts = track.points;
  let dist = 0;
  for (let i = 1; i < pts.length; i++) {
    const dLat = (pts[i].lat - pts[i - 1].lat) * 111000;
    const dLng = (pts[i].lng - pts[i - 1].lng) * 111000 * Math.cos(pts[i].lat * Math.PI / 180);
    dist += Math.sqrt(dLat * dLat + dLng * dLng);
  }
  return dist / 1000;
}

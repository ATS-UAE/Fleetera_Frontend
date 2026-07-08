import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Checkbox, Popover, Slider, Tooltip } from '@mantine/core';
import { DatePicker, TimeInput } from '@mantine/dates';
import {
  IconPlayerPlay, IconPlayerPause, IconPlayerSkipBack, IconPlayerSkipForward,
  IconRoute, IconTruck, IconChevronUp, IconChevronDown, IconCalendar,
  IconFocus2, IconX, IconZoomReset, IconBattery, IconCircle, IconCircleFilled,
} from '@tabler/icons-react';
import L from 'leaflet';
import { setVehicles, removeVehicle, setDateRange, loadRoutes, mergeRoutes, setPlaying, setSpeed, setCurrentTs, tick, reset } from '@/store/slices/trackPlayerSlice';
import { createVehiclePuckIcon, ensurePuckStyles } from '@/lib/mapUtils/vehicleIcon';
import { getVehicleTrackData, formatTrackDuration as formatDuration } from '@/data';
import type { TrackDataPoint } from '@/types';
import styles from './TrackPlayer.module.css';

const ROUTE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];
function colorForIndex(i) { return ROUTE_COLORS[i % ROUTE_COLORS.length]; }

const TICK_INTERVAL_MS = 150;
const MIN_ZOOM_SPAN = 0.02; // smallest visible window: 2% of the full loaded range
const DEFAULT_RANGE_MS = 2 * 3600 * 1000; // "last 2 hours" — used whenever no date range has been applied yet
const IDLE_PAD_INTERVAL_MS = 120000; // ~2 min, matches typical trip point spacing
const MAX_IDLE_PAD_POINTS = 60; // caps how many synthetic points a very long park can add

// Flattens a vehicle's stored trips/parking history (src/data/vehicleTracks.ts) into
// the flat, time-ordered point array the map/playback engine expects, clipped to
// [fromTs, toTs]. Parking/idle segments only store 2 points (start+end) in the data,
// so they're padded with evenly-spaced synthetic points at the same position —
// otherwise a multi-hour park would render as a sliver next to a dense trip segment
// on the (index-proportioned) track bars below.
function buildRouteFromTrackData(vehicleId: string, fromTs?: number, toTs?: number): TrackDataPoint[] {
  const data = getVehicleTrackData(vehicleId);
  if (!data) return [];
  const end = toTs ?? Date.now();
  const start = fromTs ?? (end - DEFAULT_RANGE_MS);

  const points: TrackDataPoint[] = [];
  let lastHeading = 0;
  data.tracks.forEach(track => {
    if (track.endTs < start || track.startTs > end) return; // outside the requested window
    const common = { status: track.status, geofenceName: track.geofenceName, startLocation: track.startLocation, endLocation: track.endLocation };

    if (track.status === 'trip') {
      track.points.forEach(p => {
        if (p.ts < start || p.ts > end) return;
        lastHeading = p.heading;
        points.push({ ...p, ...common });
      });
    } else {
      // Parked/idle — hold the vehicle's last heading rather than snapping to north.
      const clampedStart = Math.max(track.startTs, start);
      const clampedEnd = Math.min(track.endTs, end);
      if (clampedEnd <= clampedStart) return;
      const span = clampedEnd - clampedStart;
      const base = track.points[0];
      const steps = Math.max(1, Math.min(MAX_IDLE_PAD_POINTS, Math.round(span / IDLE_PAD_INTERVAL_MS)));
      for (let i = 0; i <= steps; i++) {
        points.push({
          lat: base.lat, lng: base.lng, speed: 0,
          battery: base.battery, satellites: base.satellites, heading: lastHeading,
          ts: Math.round(clampedStart + (i / steps) * span),
          ...common,
        });
      }
    }
  });

  return points.sort((a, b) => a.ts - b.ts);
}


// Binary search for the last point at or before `ts` in a route sorted by ts —
// each vehicle has its own point count/spacing, so playback position is looked
// up per-vehicle by real time rather than by a shared array index.
function findIndexForTs(route: TrackDataPoint[], ts: number): number {
  if (route.length === 0) return 0;
  if (ts <= route[0].ts) return 0;
  if (ts >= route[route.length - 1].ts) return route.length - 1;
  let lo = 0, hi = route.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (route[mid].ts <= ts) lo = mid; else hi = mid - 1;
  }
  return lo;
}

const formatHour = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

const pad2 = (n) => String(n).padStart(2, '0');
const formatDateTime = (ts) => {
  const d = new Date(ts);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const formatDateTimeWithSeconds = (ts) => `${formatDateTime(ts)}:${pad2(new Date(ts).getSeconds())}`;
const formatRangeHeader = (startTs, endTs) => `${formatDateTime(startTs)} – ${pad2(new Date(endTs).getHours())}:${pad2(new Date(endTs).getMinutes())}`;
const formatDurationLong = (ms) => {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60), s = totalSec % 60;
  return `${m} mins ${s} secs`;
};
const toHHMM = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

function combineDateAndTime(date, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(h || 0, m || 0, 0, 0);
  return combined;
}

const DATE_PRESETS = [
  {label:'Today', amount: 0, unit: 'today'},
  { label: 'Last 2 hours', amount: 2, unit: 'hours' },
  { label: 'Last 4 hours', amount: 4, unit: 'hours' },
  { label: 'Last 8 hours', amount: 8, unit: 'hours' },
  { label: 'Last 24 hours', amount: 24, unit: 'hours' },
  { label: 'Last 2 days', amount: 2, unit: 'days'}
];

const STATUS_COLORS = { trip: '#3b82f6', parking: '#10b981', idle: '#f59e0b' };
const STATUS_LABELS = { trip: 'On trip', parking: 'Parked', idle: 'Idle' };

// Scans the flattened route for runs of consecutive points sharing the same
// status, so a vehicle with several real trips/parks over the loaded window
// gets one bar segment per run instead of assuming a single stop. Each segment's
// endTs is the START of the next run (not its own last point's ts) so adjacent
// segments share an exact boundary — otherwise the point-to-point gap between
// the last point of one run and the first of the next left a visible sliver of
// empty track between segments that should have been touching.
function deriveTripParkSegments(route) {
  if (route.length === 0) return [];
  const segments = [];
  let runStart = 0;
  for (let i = 1; i <= route.length; i++) {
    if (i === route.length || route[i].status !== route[runStart].status) {
      const end = i - 1;
      const status = route[runStart].status;
      const kind = status === 'trip' ? 'Trip' : status === 'idle' ? 'Idle' : 'Parked';
      const label = status === 'trip'
        ? `${route[runStart].startLocation} → ${route[end].endLocation}`
        : `${status === 'idle' ? 'Idle' : 'Parked'} at ${route[runStart].geofenceName || route[runStart].startLocation}`;
      segments.push({
        label, kind, color: STATUS_COLORS[status] || '#3b82f6', start: runStart, end,
        startTs: route[runStart].ts,
        endTs: i < route.length ? route[i].ts : route[end].ts,
      });
      runStart = i;
    }
  }
  return segments;
}

// Same run-length approach, grouped by which named geofence (if any) each point falls in.
function deriveGeofenceSegments(route) {
  if (route.length === 0) return [];
  const segments = [];
  let runStart = 0;
  for (let i = 1; i <= route.length; i++) {
    const curName = route[i]?.geofenceName || null;
    const runName = route[runStart].geofenceName || null;
    if (i === route.length || curName !== runName) {
      const end = i - 1;
      segments.push({
        label: runName ? `Inside ${runName}` : 'Outside geofence',
        kind: runName ? 'Inside geofence' : 'Outside geofence',
        color: runName ? '#a855f7' : '#334155',
        start: runStart, end,
        startTs: route[runStart].ts,
        endTs: i < route.length ? route[i].ts : route[end].ts,
      });
      runStart = i;
    }
  }
  return segments;
}

function TrackBar({ route, segments, segKeyPrefix, category, toView, onWheelZoom, globalMinTs, globalSpan, onSegmentClick }) {
  // Total time spent in each kind (Trip/Parked/Idle, or Inside/Outside geofence)
  // across the whole loaded window, so hovering one segment also shows how it
  // adds up across every occurrence of that kind, not just its own duration.
  const totalsByKind = {};
  segments.forEach(s => {
    totalsByKind[s.kind] = (totalsByKind[s.kind] || 0) + Math.max(0, s.endTs - s.startTs);
  });

  return (
    <div className={styles.trackBar} onWheel={onWheelZoom}>
      {segments.map((seg, i) => {
        // Positioned by real elapsed time (relative to the shared timeline across
        // all loaded vehicles), not by this route's own point count — otherwise a
        // vehicle with fewer/sparser points would stretch to fill the same width
        // as one with more, misaligning it from the shared playhead and leaving
        // no visible gap where this vehicle simply has no data for that stretch.
        const viewStart = toView((seg.startTs - globalMinTs) / globalSpan);
        const viewEnd = toView((seg.endTs - globalMinTs) / globalSpan);
        if (viewEnd <= 0 || viewStart >= 1) return null; // fully outside the zoomed window
        const clampedStart = Math.max(0, viewStart);
        const clampedEnd = Math.min(1, viewEnd);
        const left = clampedStart * 100;
        const width = (clampedEnd - clampedStart) * 100;
        const key = `${segKeyPrefix}-${i}`;
        const durationMs = Math.max(0, seg.endTs - seg.startTs);
        return (
          <Tooltip
            key={key}
            position="top" withArrow
            label={
              <div className={styles.durationPopup}>
                <div className={styles.durationCategory}>{category}</div>
                <div className={styles.durationLabel}>{seg.label}</div>
                <div className={styles.durationValue}>{formatDuration(durationMs)}</div>
                <div className={styles.durationTotal}>Total {seg.kind}: {formatDuration(totalsByKind[seg.kind])}</div>
              </div>
            }
          >
            <div
              className={styles.trackSegment}
              style={{ left: `${left}%`, width: `${width}%`, background: seg.color }}
              onClick={() => onSegmentClick(seg, category)}
            />
          </Tooltip>
        );
      })}
    </div>
  );
}

export default function TrackPlayerPage() {
  const dispatch = useDispatch();
  const { selectedVehicleIds, isPlaying, speed, currentTs, routes, loaded, dateFrom, dateTo } = useSelector(s => s.trackPlayer);
  const vehicles = useSelector(s => s.vehicles.items);

  // Vehicle-rows drawer: collapsed by default, opens automatically once routes are loaded
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => { if (loaded) setDrawerOpen(true); }, [loaded]);

  const [vehicleMenuOpen, setVehicleMenuOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [segmentDetail, setSegmentDetail] = useState(null); // { vehicleId, category, seg, startPt, endPt }
  useEffect(() => { setSegmentDetail(null); }, [routes]);

  // Screen position of the segment card's anchor point (the marker it points at),
  // in pixels relative to the map container — recomputed on every pan/zoom so the
  // card tracks the marker through the fly-to animation and any later map moves.
  const [cardScreenPos, setCardScreenPos] = useState(null);
  useEffect(() => {
    if (!segmentDetail || !mapInstance.current) { setCardScreenPos(null); return; }
    const map = mapInstance.current;
    const { lat, lng } = segmentDetail.startPt;
    const updatePos = () => setCardScreenPos(map.latLngToContainerPoint([lat, lng]));
    updatePos();
    map.on('move', updatePos);
    map.on('zoom', updatePos);
    return () => { map.off('move', updatePos); map.off('zoom', updatePos); };
  }, [segmentDetail]);

  const [pendingRange, setPendingRange] = useState([null, null]);
  const [pendingStartTime, setPendingStartTime] = useState('00:00');
  const [pendingEndTime, setPendingEndTime] = useState(toHHMM(new Date()));

  // Zoomed-in view of the timeline: [startFraction, endFraction] of the full loaded range
  const [zoomRange, setZoomRange] = useState([0, 1]);
  useEffect(() => { setZoomRange([0, 1]); }, [routes]);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routeLineRefs = useRef<Record<string, L.Polyline>>({});
  const pointMarkersRefs = useRef<Record<string, L.LayerGroup>>({});
  const playedLineRefs = useRef<Record<string, L.Polyline | undefined>>({});
  const vehicleMarkerRefs = useRef<Record<string, L.Marker>>({});
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRefs = useRef<Record<string, number>>({});
  const prevTsRef = useRef(0);
  // Set right before any manual position change (scrub/skip/reset) so the marker
  // effect snaps instantly instead of gliding — gliding is reserved for normal
  // playback ticks, where the next point is only moments ahead.
  const isManualSeekRef = useRef(true);
  const rangeTrackRef = useRef<HTMLDivElement>(null);
  const timelineStackRef = useRef<HTMLDivElement>(null);

  // Where the transport bar's range track actually sits, measured from real DOM
  // geometry (rather than assumed from CSS padding/gap constants) so the shared
  // playhead lines up exactly with the track bars no matter how the layout shifts.
  const [barsRect, setBarsRect] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const updateBarsRect = () => {
      if (!rangeTrackRef.current || !timelineStackRef.current) return;
      const trackBox = rangeTrackRef.current.getBoundingClientRect();
      const stackBox = timelineStackRef.current.getBoundingClientRect();
      setBarsRect({ left: trackBox.left - stackBox.left, width: trackBox.width });
    };
    updateBarsRect();
    window.addEventListener('resize', updateBarsRect);
    const ro = new ResizeObserver(updateBarsRect);
    if (timelineStackRef.current) ro.observe(timelineStackRef.current);
    return () => { window.removeEventListener('resize', updateBarsRect); ro.disconnect(); };
  }, [loaded, drawerOpen]);

  // Init map
  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current, { center: [7.29, 80.63], zoom: 13, zoomControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(mapInstance.current);
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
      ensurePuckStyles();
    }
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  // Draw full routes for every loaded vehicle
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    Object.values(routeLineRefs.current).forEach(l => l.remove());
    Object.values(pointMarkersRefs.current).forEach(g => g.remove());
    Object.values(playedLineRefs.current).forEach(l => l?.remove());
    Object.values(vehicleMarkerRefs.current).forEach(m => m.remove());
    routeLineRefs.current = {};
    pointMarkersRefs.current = {};
    playedLineRefs.current = {};
    vehicleMarkerRefs.current = {};

    const vehicleIds = Object.keys(routes);
    if (!loaded || vehicleIds.length === 0) return;

    const allLatlngs: [number, number][] = [];
    vehicleIds.forEach((vehicleId, i) => {
      const route = routes[vehicleId];
      if (!route || route.length === 0) return;
      const color = colorForIndex(i);
      const latlngs = route.map(p => [p.lat, p.lng]);
      allLatlngs.push(...latlngs);

      // Full route, dimmed — the played segment (drawn on tick) overlays it in full color
      routeLineRefs.current[vehicleId] = L.polyline(latlngs, { color, weight: 3, opacity: 0.3 }).addTo(map);

      // Every individual data point along the line, as small circle markers —
      // circleMarkers are vector-rendered (not DOM/image icons), so this stays
      // cheap even with a few hundred points per vehicle.
      const pointGroup = L.layerGroup();
      route.forEach(p => {
        L.circleMarker([p.lat, p.lng], {
          radius: 3, color: '#fff', weight: 1, fillColor: color, fillOpacity: 0.9,
        })
          .bindTooltip(`${p.speed} km/h · ${new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, { direction: 'top', offset: [0, -4] })
          .addTo(pointGroup);
      });
      pointGroup.addTo(map);
      pointMarkersRefs.current[vehicleId] = pointGroup;

      // Vehicle marker — directional puck (same style as the live Vehicles map)
      const vehicleIcon = createVehiclePuckIcon({
        color,
        heading: route[0]?.heading || 0,
        isSelected: true,
        isMoving: true,
      });
      // Hover label (not permanent) — a permanent tooltip would have Leaflet
      // reposition it via the same CSS transform path as the marker icon, which
      // fights the manual requestAnimationFrame interpolation used during playback.
      const vehicleName = vehicles.find(v => v.id === vehicleId)?.name || vehicleId;
      const tooltipHtml = `
        <div style="
          background: color-mix(in srgb, var(--fv-bg-panel) 92%, transparent);
          border: 1px solid ${color}55;
          color: ${color};
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; font-weight: 700;
          padding: 1px 6px; border-radius: 4px;
          white-space: nowrap;
        ">${vehicleName}</div>`;
      vehicleMarkerRefs.current[vehicleId] = L.marker(latlngs[0], { icon: vehicleIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -24], className: 'fv-vehicle-label' });
    });
    prevTsRef.current = 0;
    isManualSeekRef.current = true; // markers were just redrawn from scratch — snap, don't glide, on the next position update

    if (allLatlngs.length > 0) {
      map.fitBounds(L.latLngBounds(allLatlngs), { padding: [40, 40] });
    }
  }, [loaded, routes]);

  // Update every vehicle's position & played line on tick.
  // Movement is interpolated frame-by-frame between the previous and current
  // route point (rather than snapping instantly) so playback reads as a smooth
  // glide along the road, similar to Google Maps' live location puck.
  useEffect(() => {
    if (!mapInstance.current || !loaded) return;
    const vehicleIds = Object.keys(routes);
    if (vehicleIds.length === 0) return;
    const map = mapInstance.current;

    const isManualJump = isManualSeekRef.current; // scrub/skip/reset, not a normal playback tick
    isManualSeekRef.current = false;

    vehicleIds.forEach((vehicleId, i) => {
      const route = routes[vehicleId];
      if (!route || route.length === 0) return;
      const color = colorForIndex(i);
      const idx = findIndexForTs(route, currentTs);
      const prevIdx = findIndexForTs(route, prevTsRef.current);
      const pt = route[idx];
      const prevPt = route[prevIdx] || pt;
      const marker = vehicleMarkerRefs.current[vehicleId];

      if (marker) {
        marker.setIcon(createVehiclePuckIcon({
          color,
          heading: pt.heading || 0,
          isSelected: true,
          isMoving: isPlaying,
        }));
      }

      if (animFrameRefs.current[vehicleId]) cancelAnimationFrame(animFrameRefs.current[vehicleId]);

      if (isManualJump) {
        // Snap instantly — interpolating across a large scrub would otherwise
        // sweep the puck visibly across unrelated parts of the map.
        marker?.setLatLng([pt.lat, pt.lng]);
      } else {
        const duration = Math.max(150, Math.min(550, 1000 / speed)) * 0.9;
        const start = performance.now();
        const from = { lat: prevPt.lat, lng: prevPt.lng };
        const to = { lat: pt.lat, lng: pt.lng };

        const step = (now) => {
          const elapsed = now - start;
          const t = Math.min(1, elapsed / duration);
          // easeOutCubic for a natural deceleration into each point
          const eased = 1 - Math.pow(1 - t, 3);
          const lat = from.lat + (to.lat - from.lat) * eased;
          const lng = from.lng + (to.lng - from.lng) * eased;
          marker?.setLatLng([lat, lng]);
          if (t < 1) {
            animFrameRefs.current[vehicleId] = requestAnimationFrame(step);
          }
        };
        animFrameRefs.current[vehicleId] = requestAnimationFrame(step);
      }

      const playedLatlngs = route.slice(0, idx + 1).map(p => [p.lat, p.lng]);
      playedLineRefs.current[vehicleId]?.remove();
      if (playedLatlngs.length > 1) {
        playedLineRefs.current[vehicleId] = L.polyline(playedLatlngs, { color, weight: 4, opacity: 0.9 }).addTo(map);
      }
    });

    prevTsRef.current = currentTs;

    return () => { Object.values(animFrameRefs.current).forEach(f => cancelAnimationFrame(f)); };
  }, [currentTs, loaded, routes, speed, isPlaying]);

  // Re-fit the map to every loaded vehicle whenever playback starts — otherwise
  // a prior zoom-in (e.g. from clicking a track-bar segment) would leave the
  // view stuck on just one vehicle/spot while the rest move off-screen. Also
  // dismiss the segment detail card — it describes a specific past moment, which
  // stops being relevant once the vehicles are moving again.
  useEffect(() => {
    if (!isPlaying) return;
    setSegmentDetail(null);
    if (!mapInstance.current) return;
    const allLatlngs = Object.values(routes).flatMap(route => route.map(p => [p.lat, p.lng]));
    if (allLatlngs.length > 0) {
      mapInstance.current.fitBounds(L.latLngBounds(allLatlngs), { padding: [40, 40] });
    }
  }, [isPlaying]);

  // Playback interval — a fixed tick rate; the reducer advances more points per
  // tick at higher speeds instead of shrinking this interval indefinitely.
  useEffect(() => {
    if (isPlaying) {
      tickRef.current = setInterval(() => dispatch(tick()), TICK_INTERVAL_MS);
    } else {
      clearInterval(tickRef.current);
    }
    return () => clearInterval(tickRef.current);
  }, [isPlaying, dispatch]);

  // Auto-load route data the moment a vehicle is checked in the picker, instead of
  // only ever loading on a date-range Apply/preset click — otherwise a newly-checked
  // vehicle's row never appears until the date popover is reopened and re-applied.
  useEffect(() => {
    const missingIds = selectedVehicleIds.filter(id => !routes[id]);
    if (missingIds.length === 0) return;
    let fromTs = dateFrom ? new Date(dateFrom).getTime() : undefined;
    let toTs = dateTo ? new Date(dateTo).getTime() : undefined;
    if (!fromTs || !toTs) {
      // No range applied yet — default to the last 2 hours, and reflect that
      // choice back into state so the date popover/timeline agree with it.
      toTs = Date.now();
      fromTs = toTs - DEFAULT_RANGE_MS;
      dispatch(setDateRange({ from: new Date(fromTs).toISOString(), to: new Date(toTs).toISOString() }));
    }
    const additions = {};
    missingIds.forEach(id => {
      additions[id] = buildRouteFromTrackData(id, fromTs, toTs);
    });
    dispatch(mergeRoutes(additions));
  }, [selectedVehicleIds]);

  const toggleVehicle = (id) => {
    if (selectedVehicleIds.includes(id)) {
      dispatch(removeVehicle(id));
    } else {
      const ordered = vehicles.filter(v => selectedVehicleIds.includes(v.id) || v.id === id).map(v => v.id);
      dispatch(setVehicles(ordered));
    }
  };

  const buildAndLoadRoutes = (fromTs, toTs) => {
    const generated = {};
    selectedVehicleIds.forEach(id => {
      generated[id] = buildRouteFromTrackData(id, fromTs, toTs);
    });
    dispatch(loadRoutes(generated));
  };

  const openDatePopover = () => {
    if (dateFrom && dateTo) {
      const f = new Date(dateFrom), t = new Date(dateTo);
      setPendingRange([f, t]);
      setPendingStartTime(toHHMM(f));
      setPendingEndTime(toHHMM(t));
    }
    setDatePopoverOpen(o => !o);
  };

  const applyPreset = (amount, unit) => {
    const to = new Date();
    const from = new Date(to);
    if (unit === 'today') from.setHours(0, 0, 0, 0); // start of today (12:00 AM) through now
    else if (unit === 'hours') from.setHours(from.getHours() - amount);
    else from.setDate(from.getDate() - amount);
    dispatch(setDateRange({ from: from.toISOString(), to: to.toISOString() }));
    buildAndLoadRoutes(from.getTime(), to.getTime());
    setDatePopoverOpen(false);
  };

  const applyCustomRange = () => {
    const [start, end] = pendingRange;
    if (!start || !end) return;
    const now = Date.now();
    // The date picker already blocks future days, but a future *time* on today's
    // date could still slip through — clamp both ends to "now" as a hard backstop.
    const from = new Date(Math.min(combineDateAndTime(start, pendingStartTime).getTime(), now));
    const to = new Date(Math.min(combineDateAndTime(end, pendingEndTime).getTime(), now));
    dispatch(setDateRange({ from: from.toISOString(), to: to.toISOString() }));
    buildAndLoadRoutes(from.getTime(), to.getTime());
    setDatePopoverOpen(false);
  };

  const resetDateRange = () => {
    setPendingRange([null, null]);
    setPendingStartTime('00:00');
    setPendingEndTime(toHHMM(new Date()));
    dispatch(setDateRange({ from: null, to: null }));
  };

  const centerOnVehicle = (vehicleId) => {
    const marker = vehicleMarkerRefs.current[vehicleId];
    if (marker && mapInstance.current) mapInstance.current.panTo(marker.getLatLng());
  };

  // Clicking a track-bar segment zooms the map to where it happened, opens a
  // detail card with its time range/duration/locations, and moves the vehicle's
  // playback position (and marker) to the start of that segment.
  const handleSegmentClick = (vehicleId, seg, category) => {
    const route = routes[vehicleId];
    if (!route) return;
    const startPt = route[seg.start];
    const endPt = route[seg.end];
    setSegmentDetail({ vehicleId, category, seg, startPt, endPt });

    if (mapInstance.current) {
      // Fly (animated pan+zoom) to where the marker is moving to, rather than
      // jumping instantly — the card's position tracks this via the 'move' events
      // the animation fires, so it glides along with the marker too.
      const targetZoom = Math.max(mapInstance.current.getZoom(), 16);
      mapInstance.current.flyTo([startPt.lat, startPt.lng], targetZoom, { duration: 1 });
    }

    isManualSeekRef.current = true; // snap the marker instantly rather than gliding
    dispatch(setCurrentTs(seg.startTs));
  };

  const scrubToClientX = (clientX) => {
    const track = rangeTrackRef.current;
    if (!track || globalSpan <= 1) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const [zStart, zEnd] = zoomRange;
    const frac = zStart + ratio * (zEnd - zStart);
    isManualSeekRef.current = true;
    dispatch(setCurrentTs(Math.round(globalMinTs + frac * globalSpan)));
  };

  const handleScrubStart = (e) => {
    if (!loaded) return;
    scrubToClientX(e.clientX);
    const onMove = (ev) => scrubToClientX(ev.clientX);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Mouse-wheel zoom on the shared timeline: zooms toward the cursor position so the
  // point under the mouse stays put, like Google Maps / Figma zoom.
  const handleWheelZoom = (e) => {
    if (!loaded) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const cursorRatio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setZoomRange(([zStart, zEnd]) => {
      const viewSpan = zEnd - zStart;
      const cursorAbsFrac = zStart + cursorRatio * viewSpan;
      const zoomFactor = e.deltaY < 0 ? 0.8 : 1.25; // scroll up = zoom in, scroll down = zoom out
      const newSpan = Math.min(1, Math.max(MIN_ZOOM_SPAN, viewSpan * zoomFactor));
      let newStart = cursorAbsFrac - cursorRatio * newSpan;
      let newEnd = newStart + newSpan;
      if (newStart < 0) { newEnd -= newStart; newStart = 0; }
      if (newEnd > 1) { newStart -= (newEnd - 1); newEnd = 1; }
      return [Math.max(0, newStart), Math.min(1, newEnd)];
    });
  };

  const resetZoom = () => setZoomRange([0, 1]);

  const vehicleIds = Object.keys(routes);
  // The shared timeline spans the earliest-to-latest point across ALL loaded
  // vehicles (not any one vehicle's own point range), since each vehicle's real
  // trip history can start/end at a different time and have a different point count.
  let globalMinTs = Infinity, globalMaxTs = -Infinity;
  vehicleIds.forEach(id => {
    const r = routes[id];
    if (r.length === 0) return;
    if (r[0].ts < globalMinTs) globalMinTs = r[0].ts;
    if (r[r.length - 1].ts > globalMaxTs) globalMaxTs = r[r.length - 1].ts;
  });
  if (!Number.isFinite(globalMinTs)) { globalMinTs = 0; globalMaxTs = 0; }
  const globalSpan = Math.max(globalMaxTs - globalMinTs, 1);

  const [zoomStart, zoomEnd] = zoomRange;
  const isZoomed = zoomStart > 0 || zoomEnd < 1;
  // Maps an absolute fraction (0..1 across the full loaded range) into the zoomed
  // view's local 0..1 space; values outside that range fall outside [0,1].
  const toView = (frac) => (frac - zoomStart) / Math.max(zoomEnd - zoomStart, 0.0001);

  const rawProgress = globalSpan > 1 ? (currentTs - globalMinTs) / globalSpan : 0;
  const progress = Math.min(100, Math.max(0, toView(rawProgress) * 100));

  const hourTicks = [];
  if (loaded && globalSpan > 1) {
    const tickCount = 7;
    for (let i = 0; i < tickCount; i++) {
      const frac = zoomStart + (i / (tickCount - 1)) * (zoomEnd - zoomStart);
      hourTicks.push(formatHour(globalMinTs + frac * globalSpan));
    }
  }

  return (
    <div className={styles.page}>
      {/* Map area */}
      <div className={styles.mapArea}>
        <div ref={mapRef} className={styles.map} />

        {/* Segment detail card — appears when a track-bar segment is clicked;
            the map is already flying to it by handleSegmentClick. Positioned
            directly above the marker's on-screen position, tracked live via
            cardScreenPos so it stays pinned to it through the fly animation. */}
        {segmentDetail && cardScreenPos && (
          <div
            className={styles.segmentCard}
            style={{ left: `${cardScreenPos.x}px`, top: `${cardScreenPos.y}px` }}
          >
            <div className={styles.segmentCardHeader}>
              <div>
                <div className={styles.segmentCardRange}>{formatRangeHeader(segmentDetail.seg.startTs, segmentDetail.seg.endTs)}</div>
                <div className={styles.segmentCardDuration}>{formatDurationLong(segmentDetail.seg.endTs - segmentDetail.seg.startTs)}</div>
              </div>
              <button type="button" className={styles.iconBtn} onClick={() => setSegmentDetail(null)}><IconX size={16} /></button>
            </div>
            <div className={styles.segmentCardVehicle}>
              <IconTruck size={16} style={{ color: colorForIndex(vehicleIds.indexOf(segmentDetail.vehicleId)) }} />
              <span>{vehicles.find(v => v.id === segmentDetail.vehicleId)?.name || segmentDetail.vehicleId}</span>
              <Tooltip label="Center on map">
                <button type="button" className={styles.iconBtn} onClick={() => centerOnVehicle(segmentDetail.vehicleId)}><IconFocus2 size={14} /></button>
              </Tooltip>
            </div>
            <div className={styles.segmentCardLocations}>
              <div className={styles.segmentLocationItem}>
                <IconCircle size={14} className={styles.segmentLocationDotStart} />
                <div>
                  <div className={styles.segmentLocationLabel}>{segmentDetail.startPt.geofenceName || segmentDetail.startPt.startLocation}</div>
                  <div className={styles.segmentLocationTime}>{formatDateTimeWithSeconds(segmentDetail.startPt.ts)}</div>
                </div>
              </div>
              <div className={styles.segmentLocationItem}>
                <IconCircleFilled size={14} className={styles.segmentLocationDotEnd} />
                <div>
                  <div className={styles.segmentLocationLabel}>{segmentDetail.endPt.geofenceName || segmentDetail.endPt.endLocation}</div>
                  <div className={styles.segmentLocationTime}>{formatDateTimeWithSeconds(segmentDetail.endPt.ts)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom dock: vehicle picker + vehicle rows (collapsible) + transport bar (always visible) */}
        <div className={styles.bottomDock}>
          {/* Vehicle picker — floating button above the drawer, opens a multi-select menu */}
          <Popover opened={vehicleMenuOpen} onChange={setVehicleMenuOpen} position="top-start" withinPortal shadow="md">
            <Popover.Target>
              <Button
                size="xs" color="blue"
                className={styles.vehiclePickerBtn}
                leftSection={<IconTruck size={13} />}
                rightSection={vehicleMenuOpen ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
                onClick={() => setVehicleMenuOpen(o => !o)}
              >
                Vehicles{selectedVehicleIds.length > 0 ? ` (${selectedVehicleIds.length})` : ''}
              </Button>
            </Popover.Target>
            <Popover.Dropdown className={styles.vehicleMenu}>
              {vehicles.map(v => (
                <Checkbox
                  key={v.id}
                  size="xs"
                  className={styles.vehicleMenuItem}
                  label={`${v.name} — ${v.plate}`}
                  checked={selectedVehicleIds.includes(v.id)}
                  onChange={() => toggleVehicle(v.id)}
                />
              ))}
              {vehicles.length === 0 && <div className={styles.noEvents}>No vehicles available</div>}
            </Popover.Dropdown>
          </Popover>

          {/* Timeline stack: vehicle rows + transport bar share one x-axis, with a single
              playhead spanning both — dragging or scroll-wheel-zooming works anywhere in it. */}
          <div className={styles.timelineStack} ref={timelineStackRef}>
            {/* Vehicle rows — one per loaded vehicle, with trip/park + geofence track bars */}
            {drawerOpen && loaded && vehicleIds.length > 0 && (
              <div className={styles.vehicleRowsCard}>
                {vehicleIds.map((vehicleId, i) => {
                  const route = routes[vehicleId];
                  const vehicle = vehicles.find(v => v.id === vehicleId);
                  const tripSegs = deriveTripParkSegments(route);
                  const geoSegs = deriveGeofenceSegments(route);
                  const color = colorForIndex(i);
                  const currentPoint = route[findIndexForTs(route, currentTs)];
                  return (
                    <div key={vehicleId} className={styles.vehicleRow}>
                      <div className={styles.vehicleRowHeader}>
                        <IconTruck size={16} style={{ color }} />
                        <span className={styles.vehicleRowName}>{vehicle?.name || vehicleId}</span>
                        {currentPoint && (
                          <Tooltip label={STATUS_LABELS[currentPoint.status] || 'Trip'}>
                            <span className={styles.statusDot} style={{ background: STATUS_COLORS[currentPoint.status] || STATUS_COLORS.trip }} />
                          </Tooltip>
                        )}
                        {currentPoint && (
                          <Tooltip label={`${currentPoint.satellites} satellites`}>
                            <span className={styles.vehicleRowBattery}>
                              <IconBattery size={14} />{currentPoint.battery}%
                            </span>
                          </Tooltip>
                        )}
                        <Tooltip label="Center on map">
                          <button className={styles.iconBtn} onClick={() => centerOnVehicle(vehicleId)}><IconFocus2 size={14} /></button>
                        </Tooltip>
                        <Tooltip label="Remove">
                          <button className={styles.iconBtn} onClick={() => dispatch(removeVehicle(vehicleId))}><IconX size={14} /></button>
                        </Tooltip>
                      </div>
                      <div className={styles.vehicleRowBars}>
                        <TrackBar route={route} segments={tripSegs} segKeyPrefix={`${vehicleId}-trip`} category="Trip" toView={toView} onWheelZoom={handleWheelZoom} globalMinTs={globalMinTs} globalSpan={globalSpan} onSegmentClick={(seg, category) => handleSegmentClick(vehicleId, seg, category)} />
                        <TrackBar route={route} segments={geoSegs} segKeyPrefix={`${vehicleId}-geo`} category="Geofence" toView={toView} onWheelZoom={handleWheelZoom} globalMinTs={globalMinTs} globalSpan={globalSpan} onSegmentClick={(seg, category) => handleSegmentClick(vehicleId, seg, category)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Transport bar — persistent playback controls + timeline scrubber */}
            <div className={styles.transportBar}>
              <div className={styles.transportLeft}>
                <button type="button" className={styles.chevronBtn} onClick={() => setDrawerOpen(o => !o)}>
                  {drawerOpen ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
                </button>
                <Tooltip label="Reset">
                  <button className={styles.ctrlBtn} disabled={!loaded} onClick={() => { isManualSeekRef.current = true; dispatch(reset()); }}><IconPlayerSkipBack size={15} /></button>
                </Tooltip>
                <Tooltip label={isPlaying ? 'Pause' : 'Play'}>
                  <button className={`${styles.ctrlBtn} ${styles.playBtn}`} disabled={!loaded} onClick={() => dispatch(setPlaying(!isPlaying))}>
                    {isPlaying ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
                  </button>
                </Tooltip>
                <Tooltip label="Skip to end">
                  <button className={styles.ctrlBtn} disabled={!loaded} onClick={() => { isManualSeekRef.current = true; dispatch(setCurrentTs(globalMaxTs)); }}><IconPlayerSkipForward size={15} /></button>
                </Tooltip>

                <div className={styles.speedControl}>
                  <span className={styles.speedValue}>{speed}x</span>
                  <Slider
                    className={styles.speedSlider}
                    min={1} max={100} value={speed} disabled={!loaded}
                    onChange={(v) => dispatch(setSpeed(v))}
                    label={null} size="xs"
                  />
                </div>

                <Popover opened={datePopoverOpen} onChange={setDatePopoverOpen} withinPortal shadow="md" position="top-start">
                  <Popover.Target>
                    <button type="button" className={styles.iconBtn} onClick={openDatePopover}><IconCalendar size={16} /></button>
                  </Popover.Target>
                  <Popover.Dropdown className={styles.dateRangeDropdown}>
                    <div className={styles.dateRangeBody}>
                      <div className={styles.presetList}>
                        {DATE_PRESETS.map(p => (
                          <button
                            key={p.label} type="button" className={styles.presetItem}
                            disabled={selectedVehicleIds.length === 0}
                            onClick={() => applyPreset(p.amount, p.unit)}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div className={styles.dateRangeCalendar}>
                        <DatePicker type="range" size="xs" value={pendingRange} onChange={setPendingRange} maxDate={new Date()} />
                        <div className={styles.timeRow}>
                          <TimeInput size="xs" value={pendingStartTime} onChange={(e) => setPendingStartTime(e.target.value)} />
                          <TimeInput size="xs" value={pendingEndTime} onChange={(e) => setPendingEndTime(e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div className={styles.dateRangeFooter}>
                      <button type="button" className={styles.resetBtn} onClick={resetDateRange}>Reset</button>
                      <Button
                        size="xs" color="blue" onClick={applyCustomRange}
                        disabled={!pendingRange[0] || !pendingRange[1] || selectedVehicleIds.length === 0}
                      >
                        Apply
                      </Button>
                    </div>
                  </Popover.Dropdown>
                </Popover>
              </div>

              <div className={styles.transportTimeline}>
                {loaded ? (
                  <>
                    <div className={styles.hourLabels}>
                      <div className={styles.hourLabelsTicks}>
                        {hourTicks.map((t, i) => <span key={i}>{t}</span>)}
                      </div>
                      {isZoomed && (
                        <Tooltip label="Reset zoom">
                          <button type="button" className={styles.zoomResetBtn} onClick={resetZoom}><IconZoomReset size={13} /></button>
                        </Tooltip>
                      )}
                    </div>
                    <div className={styles.rangeTrack} ref={rangeTrackRef} onMouseDown={handleScrubStart} onWheel={handleWheelZoom}>
                      <div className={styles.rangeFill} style={{ width: `${progress}%` }} />
                    </div>
                  </>
                ) : (
                  <div className={styles.timelinePlaceholder}>Select vehicles and load a route to see the timeline</div>
                )}
              </div>
            </div>

            {/* Shared vertical playhead — spans the vehicle rows + transport bar timeline as one
                draggable line. Positioned from the range track's real measured geometry (not a
                guessed CSS offset) so it lines up with the bars exactly, and can be dragged to
                any point along them. */}
            {loaded && (
              <div
                className={styles.sharedPlayhead}
                style={{ left: `${barsRect.left + (progress / 100) * barsRect.width}px` }}
                onMouseDown={handleScrubStart}
              />
            )}
          </div>
        </div>

        {!loaded && (
          <div className={styles.emptyOverlay}>
            <div className={styles.emptyCard}>
              <IconRoute size={48} style={{ color: 'var(--fv-accent)', opacity: 0.6 }} />
              <div className={styles.emptyTitle}>Track Player</div>
              <div className={styles.emptyDesc}>Select one or more vehicles from the picker above, or pick a date range and hit Apply, to replay their trips.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

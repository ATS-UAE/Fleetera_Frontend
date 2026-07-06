import React, { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Select, Button, Slider, ActionIcon, Tooltip, Badge } from '@mantine/core';
import {
  IconPlayerPlay, IconPlayerPause, IconPlayerSkipBack, IconPlayerSkipForward,
  IconPlayerStop, IconRoute, IconSpeedboat, IconClock, IconMapPin,
  IconTruck, IconChevronLeft, IconChevronRight,
} from '@tabler/icons-react';
import L from 'leaflet';
import { setVehicle, setDateRange, loadRoute, setPlaying, setSpeed, setCurrentIndex, tick, reset } from '@/store/slices/trackPlayerSlice';
import { createVehiclePuckIcon, ensurePuckStyles } from '@/lib/mapUtils/vehicleIcon';
import styles from './TrackPlayer.module.css';

const SPEED_OPTIONS = [
  { value: 1, label: '1×' }, { value: 2, label: '2×' },
  { value: 5, label: '5×' }, { value: 10, label: '10×' },
];

/** Compass bearing in degrees from point A to point B (0 = north). */
function bearingBetween(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function generateRoute(vehicle) {
  if (!vehicle) return [];
  const raw = [];
  let lat = vehicle.lat - 0.05, lng = vehicle.lng - 0.05;
  for (let i = 0; i < 80; i++) {
    lat += (Math.random() - 0.45) * 0.003;
    lng += (Math.random() - 0.45) * 0.003;
    raw.push({
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      speed: Math.round(20 + Math.random() * 80),
      ts: Date.now() - (80 - i) * 120000,
      event: i === 15 ? 'geofence_enter' : i === 45 ? 'stop' : i === 60 ? 'geofence_exit' : null,
    });
  }
  // Derive real headings from the direction of travel between consecutive points,
  // instead of random values, so the vehicle puck rotates to actually face its path.
  return raw.map((pt, i) => {
    const next = raw[i + 1] || raw[i];
    return { ...pt, heading: bearingBetween(pt, next) };
  });
}

export default function TrackPlayerPage() {
  const dispatch = useDispatch();
  const { selectedVehicleId, isPlaying, speed, currentIndex, route, loaded } = useSelector(s => s.trackPlayer);
  const vehicles = useSelector(s => s.vehicles.items);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const routeLineRef = useRef(null);
  const playedLineRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const eventMarkersRef = useRef([]);
  const tickRef = useRef(null);
  const animFrameRef = useRef(null);
  const prevIndexRef = useRef(0);

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

  // Draw full route when loaded
  useEffect(() => {
    if (!mapInstance.current || !loaded || route.length === 0) return;
    const map = mapInstance.current;

    routeLineRef.current?.remove();
    playedLineRef.current?.remove();
    vehicleMarkerRef.current?.remove();
    eventMarkersRef.current.forEach(m => m.remove());
    eventMarkersRef.current = [];

    const latlngs = route.map(p => [p.lat, p.lng]);

    // Full grey route
    routeLineRef.current = L.polyline(latlngs, { color: '#334155', weight: 3, opacity: 0.6 }).addTo(map);

    // Event markers
    route.forEach((pt, i) => {
      if (pt.event) {
        const icon = L.divIcon({
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${pt.event === 'stop' ? '#f59e0b' : '#3b82f6'};border:2px solid white;box-shadow:0 0 6px rgba(0,0,0,0.5);"></div>`,
          className: '', iconSize: [12, 12], iconAnchor: [6, 6],
        });
        eventMarkersRef.current.push(L.marker([pt.lat, pt.lng], { icon }).addTo(map).bindPopup(`Event: ${pt.event}`));
      }
    });

    // Vehicle marker — directional puck (same style as the live Vehicles map)
    const vehicleIcon = createVehiclePuckIcon({
      color: '#3b82f6',
      heading: route[0]?.heading || 0,
      isSelected: true,
      isMoving: true,
      size: 44,
    });
    vehicleMarkerRef.current = L.marker(latlngs[0], { icon: vehicleIcon, zIndexOffset: 1000 }).addTo(map);
    prevIndexRef.current = 0;

    map.fitBounds(routeLineRef.current.getBounds(), { padding: [40, 40] });
  }, [loaded, route]);

  // Update vehicle position & played line on tick.
  // Movement is interpolated frame-by-frame between the previous and current
  // route point (rather than snapping instantly) so playback reads as a smooth
  // glide along the road, similar to Google Maps' live location puck.
  useEffect(() => {
    if (!mapInstance.current || !loaded || route.length === 0) return;
    const map = mapInstance.current;
    const pt = route[currentIndex];
    const prevPt = route[prevIndexRef.current] || pt;
    if (!pt) return;

    // Re-render the icon so the puck rotates to the new heading
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setIcon(createVehiclePuckIcon({
        color: '#3b82f6',
        heading: pt.heading || 0,
        isSelected: true,
        isMoving: isPlaying,
        size: 44,
      }));
    }

    // Cancel any in-flight interpolation from a previous tick
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const indexDelta = Math.abs(currentIndex - prevIndexRef.current);
    const isManualJump = indexDelta > 1; // scrubber drag / skip-to-end, not a normal playback tick

    if (isManualJump) {
      // Snap instantly — interpolating across a large scrub would otherwise
      // sweep the puck visibly across unrelated parts of the map.
      vehicleMarkerRef.current?.setLatLng([pt.lat, pt.lng]);
      prevIndexRef.current = currentIndex;
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
        vehicleMarkerRef.current?.setLatLng([lat, lng]);
        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        }
      };
      animFrameRef.current = requestAnimationFrame(step);
      prevIndexRef.current = currentIndex;
    }

    const playedLatlngs = route.slice(0, currentIndex + 1).map(p => [p.lat, p.lng]);
    playedLineRef.current?.remove();
    if (playedLatlngs.length > 1) {
      playedLineRef.current = L.polyline(playedLatlngs, { color: '#3b82f6', weight: 4, opacity: 0.9 }).addTo(map);
    }

    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [currentIndex, loaded, route, speed, isPlaying]);

  // Playback interval
  useEffect(() => {
    if (isPlaying) {
      const interval = Math.max(200, 1000 / speed);
      tickRef.current = setInterval(() => dispatch(tick()), interval);
    } else {
      clearInterval(tickRef.current);
    }
    return () => clearInterval(tickRef.current);
  }, [isPlaying, speed, dispatch]);

  const handleLoadRoute = () => {
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    const generated = generateRoute(vehicle);
    dispatch(loadRoute(generated));
  };

  const currentPoint = route[currentIndex];
  const progress = route.length > 1 ? (currentIndex / (route.length - 1)) * 100 : 0;

  const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString() : '--:--:--';
  const totalDistance = route.length > 1
    ? route.reduce((acc, pt, i) => {
        if (i === 0) return 0;
        const prev = route[i - 1];
        const dLat = (pt.lat - prev.lat) * 111000;
        const dLng = (pt.lng - prev.lng) * 111000 * Math.cos(pt.lat * Math.PI / 180);
        return acc + Math.sqrt(dLat * dLat + dLng * dLng);
      }, 0) / 1000
    : 0;

  return (
    <div className={styles.page}>
      {/* Left control panel */}
      <div className={styles.controlPanel}>
        <div className={styles.controlHeader}>
          <IconRoute size={16} style={{ color: 'var(--fv-accent)' }} />
          <span>Track Player</span>
        </div>

        {/* Vehicle selector */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Vehicle</div>
          <Select
            placeholder="Select vehicle..."
            data={vehicles.map(v => ({ value: v.id, label: `${v.name} — ${v.plate}` }))}
            value={selectedVehicleId}
            onChange={id => dispatch(setVehicle(id))}
            size="xs"
            leftSection={<IconTruck size={13} />}
          />
        </div>

        {/* Date range */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Date Range</div>
          <div className={styles.dateInputs}>
            <input type="date" className={styles.dateInput} onChange={e => dispatch(setDateRange({ from: e.target.value, to: undefined }))} />
            <input type="date" className={styles.dateInput} onChange={e => dispatch(setDateRange({ from: undefined, to: e.target.value }))} />
          </div>
          <Button size="xs" fullWidth color="blue" onClick={handleLoadRoute} disabled={!selectedVehicleId} mt="xs">
            Load Route
          </Button>
        </div>

        {/* Stats */}
        {loaded && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Trip Stats</div>
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={styles.statVal} style={{ color: '#10b981' }}>{totalDistance.toFixed(1)}</span>
                <span className={styles.statLbl}>Distance km</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statVal} style={{ color: '#f59e0b' }}>{route.length}</span>
                <span className={styles.statLbl}>Points</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statVal} style={{ color: '#60a5fa' }}>
                  {Math.round(route.reduce((a, p) => a + p.speed, 0) / Math.max(route.length, 1))}
                </span>
                <span className={styles.statLbl}>Avg km/h</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statVal} style={{ color: '#ef4444' }}>
                  {Math.max(...route.map(p => p.speed))}
                </span>
                <span className={styles.statLbl}>Max km/h</span>
              </div>
            </div>
          </div>
        )}

        {/* Event log */}
        {loaded && (
          <div className={`${styles.section} ${styles.eventLog}`}>
            <div className={styles.sectionLabel}>Events</div>
            <div className={styles.eventList}>
              {route.filter(p => p.event).map((p, i) => (
                <div key={i} className={styles.eventItem}>
                  <span className={styles.eventDot} style={{ background: p.event === 'stop' ? '#f59e0b' : '#3b82f6' }} />
                  <div>
                    <div className={styles.eventType}>{p.event.replace('_', ' ')}</div>
                    <div className={styles.eventTime}>{formatTime(p.ts)}</div>
                  </div>
                </div>
              ))}
              {route.filter(p => p.event).length === 0 && <div className={styles.noEvents}>No events on this route</div>}
            </div>
          </div>
        )}
      </div>

      {/* Map area */}
      <div className={styles.mapArea}>
        <div ref={mapRef} className={styles.map} />

        {/* Current point HUD */}
        {loaded && currentPoint && (
          <div className={styles.hud}>
            <div className={styles.hudItem}>
              <IconSpeedboat size={13} color="var(--fv-accent)" />
              <span className={styles.hudValue}>{currentPoint.speed}</span>
              <span className={styles.hudUnit}>km/h</span>
            </div>
            <div className={styles.hudDivider} />
            <div className={styles.hudItem}>
              <IconMapPin size={13} color="var(--fv-emerald)" />
              <span className={styles.hudValue} style={{ fontSize: 11 }}>{currentPoint.lat.toFixed(4)}, {currentPoint.lng.toFixed(4)}</span>
            </div>
            <div className={styles.hudDivider} />
            <div className={styles.hudItem}>
              <IconClock size={13} color="var(--fv-amber)" />
              <span className={styles.hudValue} style={{ fontSize: 12 }}>{formatTime(currentPoint.ts)}</span>
            </div>
            {currentPoint.event && (
              <>
                <div className={styles.hudDivider} />
                <Badge size="xs" color={currentPoint.event === 'stop' ? 'yellow' : 'blue'} variant="light">
                  {currentPoint.event.replace('_', ' ')}
                </Badge>
              </>
            )}
          </div>
        )}

        {/* Playback controls bar */}
        {loaded && (
          <div className={styles.playbackBar}>
            {/* Timeline */}
            <div className={styles.timeline}>
              <span className={styles.timeLabel}>{formatTime(route[0]?.ts)}</span>
              <div className={styles.sliderWrap}>
                <input
                  type="range" min={0} max={route.length - 1} value={currentIndex}
                  onChange={e => { dispatch(setCurrentIndex(Number(e.target.value))); }}
                  className={styles.timeSlider}
                  style={{ '--progress': `${progress}%` }}
                />
              </div>
              <span className={styles.timeLabel}>{formatTime(route[route.length - 1]?.ts)}</span>
            </div>

            {/* Controls */}
            <div className={styles.controls}>
              <div className={styles.controlLeft}>
                <Tooltip label="Reset">
                  <button className={styles.ctrlBtn} onClick={() => dispatch(reset())}><IconPlayerSkipBack size={15} /></button>
                </Tooltip>
                <Tooltip label={isPlaying ? 'Pause' : 'Play'}>
                  <button className={`${styles.ctrlBtn} ${styles.playBtn}`} onClick={() => dispatch(setPlaying(!isPlaying))}>
                    {isPlaying ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
                  </button>
                </Tooltip>
                <Tooltip label="Skip to end">
                  <button className={styles.ctrlBtn} onClick={() => dispatch(setCurrentIndex(route.length - 1))}><IconPlayerSkipForward size={15} /></button>
                </Tooltip>
              </div>

              <div className={styles.progressInfo}>
                <span className={styles.progressText}>
                  {currentIndex + 1} / {route.length}
                </span>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className={styles.controlRight}>
                <span className={styles.speedLabel}>Speed</span>
                {SPEED_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`${styles.speedBtn} ${speed === opt.value ? styles.speedActive : ''}`}
                    onClick={() => dispatch(setSpeed(opt.value))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loaded && (
          <div className={styles.emptyOverlay}>
            <div className={styles.emptyCard}>
              <IconRoute size={48} style={{ color: 'var(--fv-accent)', opacity: 0.6 }} />
              <div className={styles.emptyTitle}>Track Player</div>
              <div className={styles.emptyDesc}>Select a vehicle and date range, then click "Load Route" to replay the journey.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

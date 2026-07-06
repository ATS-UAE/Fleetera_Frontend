import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { createVehiclePuckIcon, ensurePuckStyles } from '@/lib/mapUtils/vehicleIcon';

const STATUS_COLORS = {
  moving: '#10b981', idle: '#f59e0b', stopped: '#6b7280',
  offline: '#374151', maintenance: '#8b5cf6',
};

export default function VehicleMap({ vehicles, selected, onSelect }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const routeLinesRef = useRef({});

  // Initialize map once — use a ref flag separate from mapInstanceRef
  // to survive React StrictMode's mount→unmount→remount cycle.
  useEffect(() => {
    // Always clean up any previous instance first
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    // Clear stale marker refs since the old map is gone
    markersRef.current = {};
    routeLinesRef.current = {};

    const map = L.map(mapRef.current, {
      center: [7.29, 80.63],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    ensurePuckStyles();

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
      routeLinesRef.current = {};
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const seen = new Set();

    vehicles.forEach(vehicle => {
      seen.add(vehicle.id);
      const isSelected = vehicle.id === selected;
      const color = STATUS_COLORS[vehicle.status] || '#6b7280';
      const heading = vehicle.heading || 0;
      const isMoving = vehicle.status === 'moving';
      const name = vehicle.name;

      const existing = markersRef.current[vehicle.id];

      if (existing) {
        // Only update icon when appearance-relevant props changed
        const meta = existing._fvMeta || {};
        const iconNeedsUpdate =
          meta.color !== color ||
          meta.heading !== heading ||
          meta.isSelected !== isSelected ||
          meta.isMoving !== isMoving;

        existing.setLatLng([vehicle.lat, vehicle.lng]);

        if (iconNeedsUpdate) {
          const icon = createVehiclePuckIcon({ color, heading, isSelected, isMoving, name });
          existing.setIcon(icon);
          existing._fvMeta = { color, heading, isSelected, isMoving };
        }
      } else {
        const icon = createVehiclePuckIcon({ color, heading, isSelected, isMoving, name });
        const marker = L.marker([vehicle.lat, vehicle.lng], { icon, riseOnHover: true })
          .addTo(map)
          .on('click', () => onSelect(vehicle.id));
        marker._fvMeta = { color, heading, isSelected, isMoving };
        markersRef.current[vehicle.id] = marker;
      }

      // Popup
      const popupKey = `${vehicle.name}|${vehicle.plate}|${Math.round(vehicle.speed)}|${vehicle.fuel}|${vehicle.status}`;
      if (markersRef.current[vehicle.id]._fvPopupKey !== popupKey) {
        const popupContent = `
          <div style="min-width:160px;font-family:Inter,sans-serif;">
            <div style="font-weight:700;font-size:13px;color:#e2e8f0;margin-bottom:4px;">${vehicle.name}</div>
            <div style="font-size:11px;color:#94a3b8;font-family:'JetBrains Mono',monospace;">${vehicle.plate}</div>
            <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px;">
              <div style="font-size:10px;color:#94a3b8;">Speed</div>
              <div style="font-size:10px;color:#60a5fa;font-family:monospace;">${Math.round(vehicle.speed)} km/h</div>
              <div style="font-size:10px;color:#94a3b8;">Fuel</div>
              <div style="font-size:10px;color:#10b981;font-family:monospace;">${vehicle.fuel}%</div>
              <div style="font-size:10px;color:#94a3b8;">Status</div>
              <div style="font-size:10px;color:#f59e0b;text-transform:capitalize;">${vehicle.status}</div>
            </div>
          </div>`;
        markersRef.current[vehicle.id].bindPopup(popupContent, { maxWidth: 200 });
        markersRef.current[vehicle.id]._fvPopupKey = popupKey;
      }

      // Track line for moving vehicles
      if (vehicle.track && vehicle.track.length > 1) {
        const latlngs = vehicle.track.map(p => [p.lat, p.lng]);
        if (routeLinesRef.current[vehicle.id]) {
          routeLinesRef.current[vehicle.id].setLatLngs(latlngs);
        } else {
          routeLinesRef.current[vehicle.id] = L.polyline(latlngs, {
            color: STATUS_COLORS[vehicle.status],
            weight: 2,
            opacity: 0.5,
            dashArray: '4 4',
          }).addTo(map);
        }
      }
    });

    // Remove stale markers
    Object.keys(markersRef.current).forEach(id => {
      if (!seen.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
        if (routeLinesRef.current[id]) {
          routeLinesRef.current[id].remove();
          delete routeLinesRef.current[id];
        }
      }
    });
  }, [vehicles, selected, onSelect]);

  // Pan to selected vehicle
  useEffect(() => {
    if (!mapInstanceRef.current || !selected) return;
    const v = vehicles.find(v => v.id === selected);
    if (!v) return;
    mapInstanceRef.current.flyTo([v.lat, v.lng], 16, { duration: 0.8 });
    markersRef.current[v.id]?.openPopup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapRef} className="fv-live-map" style={{ width: '100%', height: '100%' }} />
      {/* Map overlay stats */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 1000,
        background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(8px)',
        border: '1px solid var(--fv-border)', borderRadius: 'var(--fv-r-md)',
        padding: '8px 12px', display: 'flex', gap: 12,
      }}>
        {[
          { label: 'Moving', count: vehicles.filter(v => v.status === 'moving').length, color: '#10b981' },
          { label: 'Idle', count: vehicles.filter(v => v.status === 'idle').length, color: '#f59e0b' },
          { label: 'Stopped', count: vehicles.filter(v => v.status === 'stopped').length, color: '#6b7280' },
          { label: 'Offline', count: vehicles.filter(v => v.status === 'offline').length, color: '#374151' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{s.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono' }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

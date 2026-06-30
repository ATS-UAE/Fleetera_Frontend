import React, { useEffect, useRef } from 'react';
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
  const beaconRef = useRef(null);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [7.29, 80.63],
        zoom: 12,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(mapInstanceRef.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);
      ensurePuckStyles();
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
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

      const existing = markersRef.current[vehicle.id];

      if (existing) {
        // setLatLng alone drives the CSS-transitioned glide (see globals.css
        // .fv-live-map .leaflet-marker-icon transition). Calling setIcon()
        // on every update — even when nothing about the icon's *appearance*
        // changed — was the real cause of the "shaking": Leaflet replaces the
        // icon's DOM content on setIcon, which resets the in-flight CSS
        // transition's transform baseline, making the marker visibly snap
        // back before re-animating. So we only rebuild the icon when
        // something that actually affects its look has changed.
        const meta = existing._fvMeta || {};
        const iconNeedsUpdate =
          meta.color !== color ||
          meta.heading !== heading ||
          meta.isSelected !== isSelected ||
          meta.isMoving !== isMoving;

        existing.setLatLng([vehicle.lat, vehicle.lng]);

        if (iconNeedsUpdate) {
          const icon = createVehiclePuckIcon({ color, heading, isSelected, isMoving });
          existing.setIcon(icon);
          existing._fvMeta = { color, heading, isSelected, isMoving };
        }
      } else {
        const icon = createVehiclePuckIcon({ color, heading, isSelected, isMoving });
        const marker = L.marker([vehicle.lat, vehicle.lng], { icon, riseOnHover: true })
          .addTo(map)
          .on('click', () => onSelect(vehicle.id));
        marker._fvMeta = { color, heading, isSelected, isMoving };
        markersRef.current[vehicle.id] = marker;
      }

      // Permanent name label (always visible, not just on hover/click)
      // so vehicles are identifiable at a glance after zoom/pan.
      const labelHtml = `
        <div style="
          background: rgba(10,14,26,0.92);
          border: 1px solid ${color}55;
          color: ${color};
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; font-weight: 700;
          padding: 1px 6px; border-radius: 4px;
          white-space: nowrap; pointer-events: none;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        ">${vehicle.name}</div>`;
      if (!markersRef.current[vehicle.id]._fvLabelBound) {
        markersRef.current[vehicle.id].bindTooltip(labelHtml, {
          permanent: true, direction: 'top', offset: [0, isSelected ? -28 : -22], className: 'fv-vehicle-label', opacity: 1,
        });
        markersRef.current[vehicle.id]._fvLabelBound = true;
      } else {
        markersRef.current[vehicle.id].setTooltipContent(labelHtml);
      }

      // Popup — only rebind when the displayed values actually changed, to
      // avoid unnecessary DOM churn on every effect run.
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

  // Pan to selected vehicle — only on an actual selection change, not on every
  // GPS position tick. Previously this effect depended on `vehicles` (which
  // changes reference every 3s tick), so map.flyTo() was re-triggering and
  // re-animating the whole view every tick while something was selected —
  // a second, independent source of the "shaking" complaint, separate from
  // the marker icon issue.
  useEffect(() => {
    if (!mapInstanceRef.current || !selected) return;
    const v = vehicles.find(v => v.id === selected);
    if (!v) return;
    mapInstanceRef.current.flyTo([v.lat, v.lng], 16, { duration: 0.8 });
    markersRef.current[v.id]?.openPopup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Locator beacon: a bright pulsing ring drawn at the selected vehicle's
  // current position, independent of zoom level / map clutter, so the
  // vehicle is unmistakable even in a dense area. This DOES need to track
  // `vehicles` so the beacon itself follows the vehicle as it moves — but
  // unlike the panning effect above, updating a marker's position via
  // setLatLng doesn't move the *map view*, so it doesn't cause any visible
  // camera shake; it just keeps the ring glued to the (smoothly gliding)
  // vehicle puck.
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (!selected) {
      if (beaconRef.current) {
        beaconRef.current.remove();
        beaconRef.current = null;
      }
      return;
    }

    const v = vehicles.find(v => v.id === selected);
    if (!v) return;

    if (beaconRef.current) {
      beaconRef.current.setLatLng([v.lat, v.lng]);
      return;
    }

    const beaconIcon = L.divIcon({
      html: `
        <div style="position:relative; width:64px; height:64px;">
          <div style="
            position:absolute; inset:0; border-radius:50%;
            border: 2px solid #60a5fa;
            box-shadow: 0 0 0 4px rgba(96,165,250,0.15), 0 0 24px rgba(96,165,250,0.5);
            animation: fv-beacon-ring 1.6s ease-out infinite;
          "></div>
          <div style="
            position:absolute; left:50%; top:50%;
            width:6px; height:6px; border-radius:50%;
            background:#60a5fa; transform: translate(-50%,-50%);
            box-shadow: 0 0 8px #60a5fa;
          "></div>
        </div>
        <style>
          @keyframes fv-beacon-ring {
            0%   { transform: scale(0.4); opacity: 1; }
            100% { transform: scale(1.3); opacity: 0; }
          }
        </style>
      `,
      className: '',
      iconSize: [64, 64],
      iconAnchor: [32, 32],
    });
    beaconRef.current = L.marker([v.lat, v.lng], { icon: beaconIcon, interactive: false, zIndexOffset: -1000 }).addTo(map);
  }, [selected, vehicles]);

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

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  TextInput, Select, Switch, ActionIcon, Button, ColorInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconSearch, IconPlus, IconEdit, IconTrash, IconShield,
  IconCircle, IconPolygon, IconEye, IconEyeOff, IconArrowLeft, IconMapPin,
} from '@tabler/icons-react';
import L from 'leaflet';
import type { RootState } from '@/types';
import type { Geofence, GeofenceType, LatLng } from '@/types';
import {
  setSelected, addGeofence, updateGeofence, deleteGeofence,
  toggleGeofenceActive, setFilter,
} from '@/store/slices/geofencesSlice';
import GeofenceDetailPanel from './GeofenceDetailPanel';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import type { DeleteConfirmItem } from '@/components/DeleteConfirmModal';
import ColumnField from '@/components/ColumnField';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import styles from './GeofencesPage.module.css';

// Helper: pixel distance between two map points
function pixelDistance(map: L.Map, a: L.LatLng, b: L.LatLng): number {
  const pa = map.latLngToContainerPoint(a);
  const pb = map.latLngToContainerPoint(b);
  return Math.sqrt((pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2);
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface DrawnShape {
  center: LatLng | null;
  radius: number;
  coords: LatLng[] | null;
}

const EMPTY_DRAWN: DrawnShape = { center: null, radius: 500, coords: null };

interface FormState {
  name: string;
  type: GeofenceType;
  color: string;
  description: string;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  active: boolean;
  groupId: string;
  radius: number;
}

const EMPTY_FORM: FormState = {
  name: '', type: 'circle', color: '#3b82f6', description: '',
  alertOnEnter: true, alertOnExit: false, active: true, groupId: 'g1', radius: 500,
};

// ── Inline form panel (replaces the modal) ───────────────────────────────────
interface FormPanelProps {
  editing: Geofence | null;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  drawn: DrawnShape;
  drawStatus: string;
  onDrawCircle: () => void;
  onDrawPolygon: () => void;
  onSave: () => void;
  onCancel: () => void;
}

function FormPanel({
  editing, form, setForm, drawn, drawStatus,
  onDrawCircle, onDrawPolygon, onSave, onCancel,
}: FormPanelProps) {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const hasDrawing = form.type === 'circle'
    ? drawn.center !== null
    : (drawn.coords?.length ?? 0) >= 3;

  return (
    <div className={styles.formPanel}>
      <div className={styles.formHeader}>
        <button className={styles.backBtn} onClick={onCancel} title="Back to list">
          <IconArrowLeft size={14} />
        </button>
        <span className={styles.formTitle}>
          {editing ? 'Edit Geofence' : 'New Geofence'}
        </span>
      </div>

      <div className={styles.formBody}>
        <TextInput label="Name" required size="xs" placeholder="e.g. Depot Zone A"
          value={form.name} onChange={e => set('name', e.target.value)} />

        <div className={styles.row2}>
          <Select label="Type" size="xs"
            data={[{ value: 'circle', label: 'Circle' }, { value: 'polygon', label: 'Polygon' }]}
            value={form.type}
            onChange={v => set('type', (v ?? 'circle') as GeofenceType)} />
          <ColorInput label="Color" size="xs"
            value={form.color} onChange={v => set('color', v)} />
        </div>

        {form.type === 'circle' && (
          <TextInput label="Radius (m)" size="xs" type="number"
            value={form.radius} onChange={e => set('radius', Number(e.target.value))} />
        )}

        <TextInput label="Description" size="xs"
          value={form.description} onChange={e => set('description', e.target.value)} />

        <div className={styles.switchRow}>
          {([
            { label: 'Alert on Enter', key: 'alertOnEnter' as const },
            { label: 'Alert on Exit',  key: 'alertOnExit'  as const },
            { label: 'Active',         key: 'active'        as const },
          ]).map(({ label, key }) => (
            <div key={key} className={styles.switchItem}>
              <span>{label}</span>
              <Switch size="xs" color="blue"
                checked={form[key] as boolean}
                onChange={e => set(key, e.currentTarget.checked)} />
            </div>
          ))}
        </div>

        {/* Draw buttons */}
        <div className={styles.drawSection}>
          <div className={styles.drawLabel}>
            <IconMapPin size={12} /> Draw on map
          </div>
          <div className={styles.drawBtns}>
            <Button size="xs" variant={form.type === 'circle' ? 'filled' : 'light'}
              color="blue" leftSection={<IconCircle size={13} />}
              onClick={() => { set('type', 'circle'); onDrawCircle(); }}>
              Draw Circle
            </Button>
            <Button size="xs" variant={form.type === 'polygon' ? 'filled' : 'light'}
              color="violet" leftSection={<IconPolygon size={13} />}
              onClick={() => { set('type', 'polygon'); onDrawPolygon(); }}>
              Draw Polygon
            </Button>
          </div>
          <div className={`${styles.drawStatus} ${hasDrawing ? styles.drawStatusDone : ''}`}>
            {hasDrawing
              ? `✓ ${form.type === 'circle'
                  ? `Circle — center set, r=${drawn.radius}m`
                  : `Polygon — ${drawn.coords?.length} vertices`}`
              : drawStatus}
          </div>
        </div>
      </div>

      <div className={styles.formFooter}>
        <Button size="xs" variant="default" onClick={onCancel}>Cancel</Button>
        <Button size="xs" color="blue"
          disabled={!form.name.trim() || !hasDrawing}
          onClick={onSave}>
          {editing ? 'Save Changes' : 'Create'}
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GeofencesPage() {
  const dispatch = useDispatch();
  const { items, selected, filter } = useSelector((s: RootState) => s.geofences);

  // Panel mode: 'list' | 'form'
  const [panelMode, setPanelMode] = useState<'list' | 'form'>('list');
  const [editing, setEditing]     = useState<Geofence | null>(null);
  const [form, setForm]           = useState<FormState>({ ...EMPTY_FORM });
  const [drawn, setDrawn]         = useState<DrawnShape>({ ...EMPTY_DRAWN });
  const [drawStatus, setDrawStatus] = useState('Click "Draw Circle" or "Draw Polygon" →');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; item: DeleteConfirmItem | null; id: string | null }>({ open: false, item: null, id: null });

  const mapRef    = useRef<HTMLDivElement>(null);
  const mapInst   = useRef<L.Map | null>(null);
  const shapesRef = useRef<Record<string, L.Layer>>({});
  const previewRef = useRef<L.Layer | null>(null);

  const filtered = items.filter(g => {
    if (filter.active !== 'all' && String(g.active) !== filter.active) return false;
    if (filter.type   !== 'all' && g.type !== filter.type)             return false;
    if (filter.search && !g.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  // ── Map init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
    shapesRef.current = {};
    if (!mapRef.current) return;
    const map = L.map(mapRef.current, { center: [7.29, 80.63], zoom: 11, zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInst.current = map;
    return () => {
      map.remove(); mapInst.current = null; shapesRef.current = {};
    };
  }, []);

  // ── Draw existing geofences ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInst.current) return;
    const map = mapInst.current;
    Object.values(shapesRef.current).forEach(s => s.remove());
    shapesRef.current = {};

    items.forEach(g => {
      const isSel = g.id === selected;
      const color = g.active ? g.color : '#374151';
      const opts: L.PathOptions = {
        color, fillColor: color,
        fillOpacity: isSel ? 0.25 : 0.1,
        weight: isSel ? 3 : 1.5,
        opacity: g.active ? 1 : 0.4,
        dashArray: g.active ? undefined : '5 5',
      };
      let shape: L.Layer | undefined;
      if (g.type === 'circle' && g.center)
        shape = L.circle([g.center.lat, g.center.lng], { ...opts, radius: g.radius ?? 500 });
      else if (g.type === 'polygon' && g.coordinates)
        shape = L.polygon(g.coordinates.map(c => [c.lat, c.lng] as [number, number]), opts);
      if (shape) {
        shape.addTo(map).bindPopup(`<b style="color:#e2e8f0">${g.name}</b>`);
        (shape as L.Path).on('click', () =>
          dispatch(setSelected(g.id === selected ? null : g.id)));
        shapesRef.current[g.id] = shape;
      }
    });
  }, [items, selected, dispatch]);

  // ── Fly to selected ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInst.current || !selected) return;
    const g = items.find(i => i.id === selected);
    if (!g) return;
    if (g.type === 'circle' && g.center)
      mapInst.current.flyTo([g.center.lat, g.center.lng], 14, { duration: 0.6 });
    else if (g.type === 'polygon' && g.coordinates) {
      const b = L.latLngBounds(g.coordinates.map(c => [c.lat, c.lng] as [number, number]));
      mapInst.current.flyToBounds(b, { padding: [40, 40], duration: 0.6 });
    }
  }, [selected, items]);

  // ── Clear draw preview & listeners ────────────────────────────────────────
  const clearDraw = useCallback(() => {
    if (!mapInst.current) return;
    mapInst.current.off('click').off('mousemove').off('dblclick');
    if (previewRef.current) { previewRef.current.remove(); previewRef.current = null; }
  }, []);

  // ── Draw circle interactively ──────────────────────────────────────────────
  const startDrawCircle = useCallback((color: string) => {
    const map = mapInst.current;
    if (!map) return;
    clearDraw();
    setDrawn({ ...EMPTY_DRAWN });
    setDrawStatus('Click on the map to place the center point');

    let center: L.LatLng | null = null;
    let circle: L.Circle | null = null;

    const onMove = (e: L.LeafletMouseEvent) => {
      if (!center) return;
      const r = Math.round(center.distanceTo(e.latlng));
      circle?.setRadius(r);
    };

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!center) {
        center = e.latlng;
        circle = L.circle(center, {
          radius: 10, color, fillColor: color,
          fillOpacity: 0.15, weight: 2, dashArray: '5 5',
        }).addTo(map);
        previewRef.current = circle;
        map.on('mousemove', onMove);
        setDrawStatus('Drag mouse to set radius · Click again to confirm');
      } else {
        const r = Math.round(center.distanceTo(e.latlng));
        map.off('mousemove', onMove).off('click');
        setDrawn({ center: { lat: center.lat, lng: center.lng }, radius: r, coords: null });
        setDrawStatus(`✓ Circle set — radius ${r}m`);
      }
    });
  }, [clearDraw]);

  // ── Draw polygon interactively (single-click first point to close) ─────────
  const startDrawPolygon = useCallback((color: string) => {
    const map = mapInst.current;
    if (!map) return;
    clearDraw();
    setDrawn({ ...EMPTY_DRAWN });
    setDrawStatus('Click to add vertices · Click first point to close');

    const pts: L.LatLng[] = [];
    const vertexMarkers: L.CircleMarker[] = [];
    let preview: L.Polyline | null = null;
    let closingLine: L.Polyline | null = null;
    let firstMarker: L.CircleMarker | null = null;

    const CLOSE_THRESHOLD = 15; // pixels

    const finish = () => {
      if (pts.length < 3) { setDrawStatus('Need at least 3 points — keep clicking'); return; }
      map.off('click').off('mousemove').off('dblclick');
      vertexMarkers.forEach(m => m.remove());
      if (preview) preview.remove();
      if (closingLine) closingLine.remove();
      // Draw filled polygon as preview
      const poly = L.polygon(pts.map(p => [p.lat, p.lng] as [number, number]), {
        color, fillColor: color, fillOpacity: 0.15, weight: 2, dashArray: '5 5',
      }).addTo(map);
      previewRef.current = poly;
      setDrawn({ center: null, radius: 500, coords: pts.map(p => ({ lat: p.lat, lng: p.lng })) });
      setDrawStatus(`✓ Polygon — ${pts.length} vertices`);
    };

    map.on('click', (e: L.LeafletMouseEvent) => {
      // If we have ≥3 points and click near the first point, close the polygon
      if (pts.length >= 3 && pixelDistance(map, e.latlng, pts[0]) < CLOSE_THRESHOLD) {
        finish();
        return;
      }
      pts.push(e.latlng);
      const vm = L.circleMarker(e.latlng, {
        radius: pts.length === 1 ? 6 : 4,
        color: pts.length === 1 ? '#ffffff' : color,
        fillColor: pts.length === 1 ? color : color,
        fillOpacity: 1,
        weight: pts.length === 1 ? 2.5 : 1.5,
      }).addTo(map);
      if (pts.length === 1) {
        firstMarker = vm;
        vm.bindTooltip('Click to close', { permanent: false, direction: 'top', offset: [0, -8], className: 'geofence-close-tooltip' });
      }
      vertexMarkers.push(vm);
      const lls = pts.map(p => [p.lat, p.lng] as [number, number]);
      if (preview) preview.setLatLngs(lls);
      else { preview = L.polyline(lls, { color, weight: 2, dashArray: '5 5' }).addTo(map); }
      if (pts.length < 3) {
        setDrawStatus(`${pts.length} vertex${pts.length > 1 ? 'es' : ''} — add ${3 - pts.length} more to enable closing`);
      } else {
        setDrawStatus(`${pts.length} vertices — click first point to close`);
      }
    });

    // Live closing line + hover effect on first marker
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      if (pts.length >= 3) {
        const lastPt = pts[pts.length - 1];
        if (closingLine) closingLine.setLatLngs([[lastPt.lat, lastPt.lng], [e.latlng.lat, e.latlng.lng]]);
        else {
          closingLine = L.polyline([[lastPt.lat, lastPt.lng], [e.latlng.lat, e.latlng.lng]], {
            color, weight: 1.5, dashArray: '3 6', opacity: 0.5,
          }).addTo(map);
        }
        // Visual feedback when hovering near first point
        if (firstMarker && pixelDistance(map, e.latlng, pts[0]) < CLOSE_THRESHOLD) {
          firstMarker.setStyle({ radius: 9, weight: 3, color: '#10b981', fillColor: '#10b981' });
        } else if (firstMarker) {
          firstMarker.setStyle({ radius: 6, weight: 2.5, color: '#ffffff', fillColor: color });
        }
      }
    });

    // Also allow dblclick to finish as fallback
    map.on('dblclick', (e: L.LeafletMouseEvent) => { e.originalEvent.preventDefault(); finish(); });
  }, [clearDraw]);

  // ── Edit polygon vertices (click to delete individual points) ──────────────
  const editLayersRef = useRef<L.Layer[]>([]);
  const circleEditRef = useRef<{ circle: L.Circle; handle: L.CircleMarker; deleteBtn: L.Marker } | null>(null);

  const clearEditLayers = useCallback(() => {
    editLayersRef.current.forEach(l => l.remove());
    editLayersRef.current = [];
    if (circleEditRef.current) {
      circleEditRef.current.circle.remove();
      circleEditRef.current.handle.remove();
      circleEditRef.current.deleteBtn.remove();
      circleEditRef.current = null;
    }
  }, []);

  const startEditPolygonVertices = useCallback((coords: LatLng[], color: string, onUpdate: (newCoords: LatLng[]) => void, onDeleteAll: () => void) => {
    const map = mapInst.current;
    if (!map) return;
    clearEditLayers();

    let currentCoords = [...coords];
    let polygon: L.Polygon | null = null;

    const rebuildMarkers = () => {
      // Clear old markers
      editLayersRef.current.forEach(l => l.remove());
      editLayersRef.current = [];

      // Draw polygon preview
      polygon = L.polygon(currentCoords.map(c => [c.lat, c.lng] as [number, number]), {
        color, fillColor: color, fillOpacity: 0.12, weight: 2, dashArray: '5 5',
      }).addTo(map);
      editLayersRef.current.push(polygon);

      // Draw vertex markers (draggable + clickable to delete)
      currentCoords.forEach((c, i) => {
        const marker = L.circleMarker([c.lat, c.lng], {
          radius: 6, color: '#3b82f6', fillColor: color, fillOpacity: 1, weight: 2,
          className: 'geofence-vertex-editable',
        }).addTo(map);

        marker.bindTooltip(`Drag to move · Click to delete (pt ${i + 1})`, {
          permanent: false, direction: 'top', offset: [0, -10],
          className: 'geofence-delete-tooltip',
        });

        // ── Drag to reposition ────────────────────────────────────────
        let isDragging = false;
        let hasMoved = false;
        let startPixel: L.Point | null = null;

        marker.on('mousedown', (e: L.LeafletEvent) => {
          L.DomEvent.stopPropagation(e as any);
          L.DomEvent.preventDefault(e as any);
          isDragging = true;
          hasMoved = false;
          startPixel = map.mouseEventToContainerPoint((e as any).originalEvent);
          map.dragging.disable();
          marker.closeTooltip();
          marker.setStyle({ radius: 9, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1 });
        });

        const onMouseMove = (e: L.LeafletMouseEvent) => {
          if (!isDragging) return;
          const currentPixel = map.mouseEventToContainerPoint(e.originalEvent);
          if (startPixel && Math.sqrt((currentPixel.x - startPixel.x) ** 2 + (currentPixel.y - startPixel.y) ** 2) > 4) {
            hasMoved = true;
          }
          currentCoords[i] = { lat: e.latlng.lat, lng: e.latlng.lng };
          marker.setLatLng(e.latlng);
          // Update polygon shape live
          if (polygon) polygon.setLatLngs(currentCoords.map(cc => [cc.lat, cc.lng] as [number, number]));
        };

        const onMouseUp = () => {
          if (!isDragging) return;
          isDragging = false;
          map.dragging.enable();
          map.off('mousemove', onMouseMove);
          map.off('mouseup', onMouseUp);
          if (hasMoved) {
            // Committed a drag — update state
            onUpdate([...currentCoords]);
            rebuildMarkers();
          }
        };

        marker.on('mousedown', () => {
          map.on('mousemove', onMouseMove);
          map.on('mouseup', onMouseUp);
        });

        // ── Click to delete (only if not dragged) ─────────────────────
        marker.on('click', (e: L.LeafletEvent) => {
          if (hasMoved) return; // was a drag, not a click
          L.DomEvent.stopPropagation(e as any);
          if (currentCoords.length <= 3) {
            notifications.show({ title: 'Cannot delete', message: 'Polygon needs at least 3 points', color: 'orange' });
            return;
          }
          currentCoords.splice(i, 1);
          onUpdate([...currentCoords]);
          rebuildMarkers();
        });

        // Hover effect (only when not dragging)
        marker.on('mouseover', () => {
          if (!isDragging) marker.setStyle({ radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 });
        });
        marker.on('mouseout', () => {
          if (!isDragging) marker.setStyle({ radius: 6, color: '#3b82f6', fillColor: color, fillOpacity: 1 });
        });

        editLayersRef.current.push(marker);
      });
    };

    rebuildMarkers();
  }, [clearEditLayers]);

  // ── Edit circle (resize handle + clear/redraw button) ─────────────────────
  const startEditCircle = useCallback((center: LatLng, radius: number, color: string, onResize: (r: number) => void, onClearCircle: () => void) => {
    const map = mapInst.current;
    if (!map) return;
    clearEditLayers();

    // Draw the circle
    const circle = L.circle([center.lat, center.lng], {
      radius, color, fillColor: color, fillOpacity: 0.15, weight: 2, dashArray: '5 5',
    }).addTo(map);

    // Compute handle position (east edge of circle)
    const centerLatLng = L.latLng(center.lat, center.lng);
    const handlePoint = centerLatLng.toBounds(radius * 2);
    const handleLatLng = L.latLng(center.lat, handlePoint.getEast());

    // Resize handle
    const handle = L.circleMarker(handleLatLng, {
      radius: 7, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, weight: 2,
      className: 'geofence-resize-handle',
    }).addTo(map);
    handle.bindTooltip('Drag to resize', { permanent: false, direction: 'top', offset: [0, -10] });

    // Make handle draggable via map events
    let dragging = false;
    handle.on('mousedown', (e: L.LeafletEvent) => {
      L.DomEvent.stopPropagation(e as any);
      L.DomEvent.preventDefault(e as any);
      dragging = true;
      map.dragging.disable();
    });

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      if (!dragging) return;
      const newRadius = Math.round(centerLatLng.distanceTo(e.latlng));
      if (newRadius < 10) return; // Minimum radius
      circle.setRadius(newRadius);
      // Recalculate handle position
      const newHandleBounds = centerLatLng.toBounds(newRadius * 2);
      handle.setLatLng(L.latLng(center.lat, newHandleBounds.getEast()));
      // Update delete button position
      const newDeletePos = L.latLng(centerLatLng.toBounds(newRadius * 2).getNorth(), center.lng);
      deleteBtn.setLatLng(newDeletePos);
    });

    const stopDrag = (e?: L.LeafletMouseEvent) => {
      if (!dragging) return;
      dragging = false;
      map.dragging.enable();
      const newRadius = Math.round(circle.getRadius());
      onResize(newRadius);
    };
    map.on('mouseup', stopDrag);

    // Clear & redraw button (positioned at top of circle)
    const deleteBtnLatLng = L.latLng(centerLatLng.toBounds(radius * 2).getNorth(), center.lng);
    const deleteBtn = L.marker(deleteBtnLatLng, {
      icon: L.divIcon({
        className: 'geofence-delete-circle-btn',
        html: `<div style="
          display:flex; align-items:center; gap:4px;
          background: rgba(239,68,68,0.9); color:#fff;
          padding: 4px 10px; border-radius: 6px;
          font-size: 11px; font-weight: 600;
          cursor: pointer; white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(4px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "><svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'/><path d='M3 3v5h5'/></svg> Clear &amp; Redraw</div>`,
        iconSize: [120, 28],
        iconAnchor: [60, 14],
      }),
    }).addTo(map);

    deleteBtn.on('click', () => {
      onClearCircle();
    });

    circleEditRef.current = { circle, handle, deleteBtn };
    // Also store map listeners for cleanup
    editLayersRef.current.push(circle as any, handle as any, deleteBtn as any);
  }, [clearEditLayers]);

  // ── Open / close form ──────────────────────────────────────────────────────
  const openCreate = () => {
    dispatch(setSelected(null));
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDrawn({ ...EMPTY_DRAWN });
    setDrawStatus('Click "Draw Circle" or "Draw Polygon" to start');
    clearDraw();
    clearEditLayers();
    setPanelMode('form');
  };

  const openEdit = (g: Geofence) => {
    setEditing(g);
    setForm({
      name: g.name, type: g.type, color: g.color, description: g.description,
      alertOnEnter: g.alertOnEnter, alertOnExit: g.alertOnExit, active: g.active,
      groupId: g.groupId, radius: g.radius ?? 500,
    });
    // Pre-populate drawn from existing shape so user can save without redrawing
    setDrawn({
      center: g.center,
      radius: g.radius ?? 500,
      coords: g.coordinates,
    });
    clearDraw();

    // Enter edit mode based on shape type
    if (g.type === 'polygon' && g.coordinates && g.coordinates.length >= 3) {
      setDrawStatus('Drag vertex to move · Click vertex to delete');
      setTimeout(() => {
        startEditPolygonVertices(
          g.coordinates!,
          g.color,
          (newCoords) => {
            setDrawn(prev => ({ ...prev, coords: newCoords }));
            setDrawStatus(`✓ Polygon — ${newCoords.length} vertices (drag to move · click to delete)`);
          },
          () => {
            // delete all
          }
        );
      }, 100);
    } else if (g.type === 'circle' && g.center) {
      setDrawStatus('Drag the blue handle to resize · Clear & Redraw to start over');
      setTimeout(() => {
        startEditCircle(
          g.center!,
          g.radius ?? 500,
          g.color,
          (newRadius) => {
            setDrawn(prev => ({ ...prev, radius: newRadius }));
            setForm(prev => ({ ...prev, radius: newRadius }));
            setDrawStatus(`✓ Circle — radius ${newRadius}m (drag handle to resize)`);
          },
          () => {
            // Clear drawing only — user can redraw
            clearEditLayers();
            setDrawn(prev => ({ ...prev, center: null, radius: 500 }));
            setForm(prev => ({ ...prev, radius: 500 }));
            setDrawStatus('Circle cleared — click "Draw Circle" to redraw');
          }
        );
      }, 100);
    } else {
      setDrawStatus('Shape pre-loaded — redraw if you want to change it');
    }

    setPanelMode('form');
  };

  const closeForm = () => {
    clearDraw();
    clearEditLayers();
    setEditing(null);
    setPanelMode('list');
    setDrawStatus('Click "Draw Circle" or "Draw Polygon" to start');
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const payload = {
      name:          form.name,
      type:          form.type,
      color:         form.color,
      description:   form.description,
      alertOnEnter:  form.alertOnEnter,
      alertOnExit:   form.alertOnExit,
      active:        form.active,
      groupId:       form.groupId,
      center:        form.type === 'circle' ? drawn.center : null,
      radius:        form.type === 'circle' ? drawn.radius : null,
      coordinates:   form.type === 'polygon' ? drawn.coords : null,
    };
    // Clean up ALL preview / edit layers before saving
    if (previewRef.current) { previewRef.current.remove(); previewRef.current = null; }
    clearEditLayers();
    if (editing) {
      dispatch(updateGeofence({ ...editing, ...payload }));
      notifications.show({ title: 'Geofence updated', message: 'Changes saved successfully', color: 'blue' });
    } else {
      dispatch(addGeofence(payload));
      notifications.show({ title: 'Geofence created', message: 'New geofence added to the list', color: 'green' });
    }
    closeForm();
  };

  // ── Delete with confirmation ──────────────────────────────────────────────
  const requestDelete = (g: Geofence) => {
    const meta = g.type === 'circle'
      ? `● ${g.type} · r: ${g.radius}m`
      : `⬡ ${g.type} · ${g.coordinates?.length ?? 0} vertices`;
    setDeleteConfirm({ open: true, item: { name: g.name, color: g.color, meta }, id: g.id });
  };

  const confirmDelete = () => {
    if (!deleteConfirm.id) return;
    dispatch(deleteGeofence(deleteConfirm.id));
    if (selected === deleteConfirm.id) dispatch(setSelected(null));
    notifications.show({ title: 'Geofence deleted', message: `"${deleteConfirm.item?.name}" has been removed`, color: 'red' });
    setDeleteConfirm({ open: false, item: null, id: null });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ open: false, item: null, id: null });
  };

  const selectedGeofence = items.find(g => g.id === selected) ?? null;
  const reorderMode = useSelector((s: RootState) => s.ui.reorderMode);
  const { isVisible } = useColumnVisibility('geofences');

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      <DeleteConfirmModal
        opened={deleteConfirm.open}
        item={deleteConfirm.item}
        entityLabel="Geofence"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* Left panel */}
      <div className={styles.listPanel}>
        {panelMode === 'form' ? (
          <FormPanel
            editing={editing}
            form={form}
            setForm={setForm}
            drawn={drawn}
            drawStatus={drawStatus}
            onDrawCircle={() => startDrawCircle(form.color)}
            onDrawPolygon={() => startDrawPolygon(form.color)}
            onSave={handleSave}
            onCancel={closeForm}
          />
        ) : selectedGeofence ? (
          <GeofenceDetailPanel
            geofence={selectedGeofence}
            onClose={() => dispatch(setSelected(null))}
            onEdit={() => openEdit(selectedGeofence)}
            onDelete={() => requestDelete(selectedGeofence)}
            onToggleActive={() => dispatch(toggleGeofenceActive(selectedGeofence.id))}
          />
        ) : (
          <>
            <div className={styles.listHeader}>
              <div className={styles.listTitle}>
                <span>Geofences</span>
                <button className={styles.addBtn} onClick={openCreate}>
                  <IconPlus size={14} />
                </button>
              </div>
              <div className={styles.statRow}>
                {[
                  { l: 'Total',  v: items.length,                            c: '#60a5fa' },
                  { l: 'Active', v: items.filter(g => g.active).length,      c: '#10b981' },
                  { l: 'Circle', v: items.filter(g => g.type==='circle').length, c: '#8b5cf6' },
                  { l: 'Poly',   v: items.filter(g => g.type==='polygon').length, c: '#f59e0b' },
                ].map(s => (
                  <div key={s.l} className={styles.statPill}>
                    <span style={{ color: s.c, fontWeight: 700, fontSize: 14, fontFamily: 'var(--fv-font-mono)' }}>{s.v}</span>
                    <span style={{ color: 'var(--fv-text-muted)', fontSize: 9, textTransform: 'uppercase' }}>{s.l}</span>
                  </div>
                ))}
              </div>
              <TextInput placeholder="Search geofences..." size="xs"
                leftSection={<IconSearch size={13} />}
                value={filter.search}
                onChange={e => dispatch(setFilter({ search: e.target.value }))} />
              <Select size="xs"
                data={[
                  { value: 'all', label: 'All Status' },
                  { value: 'true', label: 'Active' },
                  { value: 'false', label: 'Inactive' },
                ]}
                value={filter.active}
                onChange={v => dispatch(setFilter({ active: v ?? 'all' }))} />
            </div>

            <div className={styles.list}>
              {filtered.map(g => (
                <div key={g.id}
                  className={`${styles.geofenceCard} ${selected === g.id ? styles.selected : ''} ${!g.active ? styles.inactive : ''}`}
                  onClick={() => dispatch(setSelected(g.id === selected ? null : g.id))}>

                  <div className={styles.cardLeft}>
                    {/* Shape Icon */}
                    <ColumnField
                      list="geofences"
                      fieldKey="shapeIcon"
                      fieldName="Shape Icon"
                      description="Icon indicating geofence shape type"
                      reorderMode={reorderMode}
                      className={styles.shapeIcon}
                      style={{ borderColor: g.color+'60', background: g.color+'15' }}
                    >
                      {g.type === 'circle'
                        ? <IconCircle size={14} style={{ color: g.color }} />
                        : <IconPolygon size={14} style={{ color: g.color }} />}
                    </ColumnField>

                    <div>
                      {/* Geofence Name */}
                      <ColumnField
                        list="geofences"
                        fieldKey="geoName"
                        fieldName="Geofence Name"
                        description="Name label of the geofence zone"
                        reorderMode={reorderMode}
                      >
                        <div className={styles.geoName}>{g.name}</div>
                      </ColumnField>

                      {/* Shape Info */}
                      <ColumnField
                        list="geofences"
                        fieldKey="geoMeta"
                        fieldName="Shape Info"
                        description="Geofence type and size details"
                        reorderMode={reorderMode}
                      >
                        <div className={styles.geoMeta}>
                          {g.type} · {g.type==='circle' ? `r:${g.radius}m` : `${g.coordinates?.length ?? 0} pts`}
                        </div>
                      </ColumnField>
                    </div>
                  </div>

                  <div className={styles.cardRight}>
                    {/* Alert Tags */}
                    <ColumnField
                      list="geofences"
                      fieldKey="alertTags"
                      fieldName="Alert Tags"
                      description="IN/OUT alert indicators for this geofence"
                      reorderMode={reorderMode}
                      className={styles.geoAlerts}
                    >
                      {g.alertOnEnter && <span className={styles.alertTag} style={{ color:'#10b981', borderColor:'#10b98140', background:'#10b98110' }}>IN</span>}
                      {g.alertOnExit  && <span className={styles.alertTag} style={{ color:'#ef4444', borderColor:'#ef444440', background:'#ef444410' }}>OUT</span>}
                    </ColumnField>

                    <div className={styles.cardActions} onClick={e => e.stopPropagation()}>
                      <ActionIcon size="xs" variant="subtle" color={g.active ? 'green' : 'gray'}
                        onClick={() => dispatch(toggleGeofenceActive(g.id))}>
                        {g.active ? <IconEye size={12} /> : <IconEyeOff size={12} />}
                      </ActionIcon>
                      <ActionIcon size="xs" variant="subtle" color="blue" onClick={() => openEdit(g)}>
                        <IconEdit size={12} />
                      </ActionIcon>
                      <ActionIcon size="xs" variant="subtle" color="red" onClick={() => requestDelete(g)}>
                        <IconTrash size={12} />
                      </ActionIcon>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className={styles.empty}>
                  <IconShield size={32} opacity={0.3} />
                  <p>No geofences</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 1000,
          background: 'rgba(10,14,26,0.88)', backdropFilter: 'blur(8px)',
          border: `1px solid ${panelMode==='form' ? 'var(--fv-border-accent)' : 'var(--fv-border)'}`,
          borderRadius: 'var(--fv-r-md)', padding: '8px 14px',
          fontSize: 12, color: 'var(--fv-text-secondary)',
        }}>
          {panelMode === 'form'
            ? '⬅ Use the form panel to draw — click on the map after pressing a draw button'
            : 'Click a geofence to view · Click + to create new'}
        </div>
      </div>
    </div>
  );
}

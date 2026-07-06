import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TextInput, Select, Button, Switch, ActionIcon, Tooltip, Modal, SimpleGrid, Group, ColorInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconPlus, IconEdit, IconTrash, IconShield, IconCircle, IconPolygon, IconEye, IconEyeOff } from '@tabler/icons-react';
import L from 'leaflet';
import { setSelected, addGeofence, updateGeofence, deleteGeofence, toggleGeofenceActive, setFilter } from '@/store/slices/geofencesSlice';
import GeofenceDetailPanel from './GeofenceDetailPanel';
import styles from './GeofencesPage.module.css';

function GeofenceFormModal({ opened, onClose, geofence }) {
  const dispatch = useDispatch();
  const isEdit = !!geofence;
  const form = useForm({
    initialValues: { name: '', type: 'circle', color: '#3b82f6', description: '', alertOnEnter: true, alertOnExit: false, active: true, groupId: 'g1', center: { lat: 7.2906, lng: 80.6337 }, radius: 500, coordinates: null },
  });
  useEffect(() => { if (geofence) form.setValues(geofence); else form.reset(); }, [geofence, opened]);
  const handleSubmit = (values) => {
    if (isEdit) { dispatch(updateGeofence({ ...geofence, ...values })); notifications.show({ title: 'Geofence updated', color: 'blue' }); }
    else { dispatch(addGeofence(values)); notifications.show({ title: 'Geofence created', color: 'green' }); }
    onClose();
  };
  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? `Edit — ${geofence?.name}` : 'Create Geofence'} size="md" zIndex={2000} styles={{ title: { fontWeight: 700 } }}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput label="Name" required mb="sm" {...form.getInputProps('name')} />
        <SimpleGrid cols={2} spacing="sm">
          <Select label="Type" data={[{ value: 'circle', label: 'Circle' }, { value: 'polygon', label: 'Polygon' }]} {...form.getInputProps('type')} />
          <ColorInput label="Color" {...form.getInputProps('color')} />
          {form.values.type === 'circle' && <TextInput label="Radius (m)" type="number" {...form.getInputProps('radius')} />}
        </SimpleGrid>
        <TextInput label="Description" mt="sm" {...form.getInputProps('description')} />
        <Group mt="sm" gap="xl">
          <Switch label="Alert on Enter" checked={form.values.alertOnEnter} onChange={e => form.setFieldValue('alertOnEnter', e.currentTarget.checked)} />
          <Switch label="Alert on Exit" checked={form.values.alertOnExit} onChange={e => form.setFieldValue('alertOnExit', e.currentTarget.checked)} />
          <Switch label="Active" checked={form.values.active} onChange={e => form.setFieldValue('active', e.currentTarget.checked)} />
        </Group>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button type="submit" color="blue">{isEdit ? 'Save Changes' : 'Create Geofence'}</Button>
        </Group>
      </form>
    </Modal>
  );
}

export default function GeofencesPage() {
  const dispatch = useDispatch();
  const { items, selected, filter } = useSelector(s => s.geofences);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const shapesRef = useRef({});

  const filtered = items.filter(g => {
    if (filter.active !== 'all' && String(g.active) !== filter.active) return false;
    if (filter.type !== 'all' && g.type !== filter.type) return false;
    if (filter.search && !g.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    // StrictMode-safe: always clean up previous instance
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }
    shapesRef.current = {};

    if (mapRef.current) {
      const map = L.map(mapRef.current, { center: [7.29, 80.63], zoom: 11, zoomControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstance.current = map;
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      shapesRef.current = {};
    };
  }, []);

  // Draw geofences on map
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    Object.values(shapesRef.current).forEach(s => s.remove());
    shapesRef.current = {};

    items.forEach(g => {
      const isSelected = g.id === selected;
      const color = g.active ? g.color : '#374151';
      const opts = {
        color, fillColor: color, fillOpacity: isSelected ? 0.25 : 0.1,
        weight: isSelected ? 3 : 1.5, opacity: g.active ? 1 : 0.4,
        dashArray: g.active ? null : '5 5',
      };

      let shape;
      if (g.type === 'circle' && g.center) {
        shape = L.circle([g.center.lat, g.center.lng], { ...opts, radius: g.radius });
      } else if (g.type === 'polygon' && g.coordinates) {
        shape = L.polygon(g.coordinates.map(c => [c.lat, c.lng]), opts);
      }

      if (shape) {
        shape.addTo(map).bindPopup(`<b style="color:#e2e8f0">${g.name}</b><br><span style="color:#94a3b8;font-size:11px">${g.description}</span>`);
        shape.on('click', () => dispatch(setSelected(g.id === selected ? null : g.id)));
        shapesRef.current[g.id] = shape;
      }
    });
  }, [items, selected, dispatch]);

  // Fly to selected
  useEffect(() => {
    if (!mapInstance.current || !selected) return;
    const g = items.find(g => g.id === selected);
    if (!g) return;
    if (g.type === 'circle' && g.center) mapInstance.current.flyTo([g.center.lat, g.center.lng], 14, { duration: 0.6 });
    else if (g.type === 'polygon' && g.coordinates) {
      const bounds = L.latLngBounds(g.coordinates.map(c => [c.lat, c.lng]));
      mapInstance.current.flyToBounds(bounds, { padding: [40, 40], duration: 0.6 });
    }
  }, [selected, items]);

  const handleDelete = (id) => {
    dispatch(deleteGeofence(id));
    notifications.show({ title: 'Geofence deleted', color: 'red' });
  };

  const selectedGeofence = items.find(g => g.id === selected) || null;

  return (
    <div className={styles.page}>
      {/* Left panel — shows list OR detail */}
      <div className={styles.listPanel}>
        {selectedGeofence ? (
          <GeofenceDetailPanel
            geofence={selectedGeofence}
            onClose={() => dispatch(setSelected(null))}
            onEdit={() => { setEditTarget(selectedGeofence); setFormOpen(true); }}
            onDelete={() => handleDelete(selectedGeofence.id)}
            onToggleActive={() => dispatch(toggleGeofenceActive(selectedGeofence.id))}
          />
        ) : (
          <>
            <div className={styles.listHeader}>
              <div className={styles.listTitle}>
                <span>Geofences</span>
                <button className={styles.addBtn} onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus size={14} /></button>
              </div>
              <div className={styles.statRow}>
                {[
                  { l: 'Total', v: items.length, c: '#60a5fa' },
                  { l: 'Active', v: items.filter(g => g.active).length, c: '#10b981' },
                  { l: 'Circle', v: items.filter(g => g.type === 'circle').length, c: '#8b5cf6' },
                  { l: 'Poly', v: items.filter(g => g.type === 'polygon').length, c: '#f59e0b' },
                ].map(s => (
                  <div key={s.l} className={styles.statPill}>
                    <span style={{ color: s.c, fontWeight: 700, fontSize: 14, fontFamily: 'var(--fv-font-mono)' }}>{s.v}</span>
                    <span style={{ color: 'var(--fv-text-muted)', fontSize: 9, textTransform: 'uppercase' }}>{s.l}</span>
                  </div>
                ))}
              </div>
              <TextInput placeholder="Search geofences..." leftSection={<IconSearch size={13} />} value={filter.search} onChange={e => dispatch(setFilter({ search: e.target.value }))} size="xs" />
              <Select data={[{ value: 'all', label: 'All Status' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} value={filter.active} onChange={v => dispatch(setFilter({ active: v }))} size="xs" />
            </div>

            <div className={styles.list}>
              {filtered.map(g => (
                <div key={g.id} className={`${styles.geofenceCard} ${selected === g.id ? styles.selected : ''} ${!g.active ? styles.inactive : ''}`} onClick={() => dispatch(setSelected(g.id === selected ? null : g.id))}>
                  <div className={styles.cardLeft}>
                    <div className={styles.shapeIcon} style={{ borderColor: g.color + '60', background: g.color + '15' }}>
                      {g.type === 'circle' ? <IconCircle size={14} style={{ color: g.color }} /> : <IconPolygon size={14} style={{ color: g.color }} />}
                    </div>
                    <div>
                      <div className={styles.geoName}>{g.name}</div>
                      <div className={styles.geoMeta}>{g.type} · {g.type === 'circle' ? `r:${g.radius}m` : `${g.coordinates?.length ?? 0} pts`}</div>
                    </div>
                  </div>
                  <div className={styles.cardRight}>
                    <div className={styles.geoAlerts}>
                      {g.alertOnEnter && <span className={styles.alertTag} style={{ color: '#10b981', borderColor: '#10b98140', background: '#10b98110' }}>IN</span>}
                      {g.alertOnExit && <span className={styles.alertTag} style={{ color: '#ef4444', borderColor: '#ef444440', background: '#ef444410' }}>OUT</span>}
                    </div>
                    <div className={styles.cardActions} onClick={e => e.stopPropagation()}>
                      <ActionIcon size="xs" variant="subtle" color={g.active ? 'green' : 'gray'} onClick={() => dispatch(toggleGeofenceActive(g.id))}>
                        {g.active ? <IconEye size={12} /> : <IconEyeOff size={12} />}
                      </ActionIcon>
                      <ActionIcon size="xs" variant="subtle" color="blue" onClick={() => { setEditTarget(g); setFormOpen(true); }}><IconEdit size={12} /></ActionIcon>
                      <ActionIcon size="xs" variant="subtle" color="red" onClick={() => handleDelete(g.id)}><IconTrash size={12} /></ActionIcon>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className={styles.empty}><IconShield size={32} opacity={0.3} /><p>No geofences</p></div>}
            </div>
          </>
        )}
      </div>

      {/* Map — takes full remaining space */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 1000,
          background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(8px)',
          border: '1px solid var(--fv-border)', borderRadius: 'var(--fv-r-md)',
          padding: '8px 14px', fontSize: 12, color: 'var(--fv-text-secondary)',
        }}>
          Click a geofence to view details
        </div>
      </div>

      <GeofenceFormModal opened={formOpen} onClose={() => setFormOpen(false)} geofence={editTarget} />
    </div>
  );
}

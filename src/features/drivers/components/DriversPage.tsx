import type { Driver } from '@/types';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TextInput, Select, Button, Badge, Avatar, ActionIcon, Tooltip, Modal, SimpleGrid, NumberInput, Textarea, Group, Progress, RingProgress } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconSearch, IconPlus, IconEdit, IconTrash, IconGripVertical, IconId, IconPhone, IconMail, IconStar, IconRoute, IconAlertTriangle, IconCar } from '@tabler/icons-react';
import { setSelected, addDriver, updateDriver, deleteDriver, setFilter, reorderDrivers } from '@/store/slices/driversSlice';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import type { DeleteConfirmItem } from '@/components/DeleteConfirmModal';
import styles from './DriversPage.module.css';

const STATUS_COLORS = { online: '#10b981', offline: '#6b7280', on_trip: '#3b82f6', break: '#f59e0b' };
const STATUS_OPTIONS = [{ value: 'all', label: 'All Status' }, { value: 'online', label: 'Online' }, { value: 'offline', label: 'Offline' }, { value: 'on_trip', label: 'On Trip' }, { value: 'break', label: 'On Break' }];

function SortableDriverRow({ driver, selected, reorderMode, onSelect, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: driver.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const color = STATUS_COLORS[driver.status] || '#6b7280';

  return (
    <div ref={setNodeRef} style={style} className={`${styles.driverRow} ${selected ? styles.selected : ''} ${reorderMode ? styles.reorderMode : ''}`} onClick={() => !reorderMode && onSelect(driver.id)}>
      {reorderMode && (
        <div className={styles.dragHandle} {...attributes} {...listeners} onClick={e => e.stopPropagation()}>
          <IconGripVertical size={14} />
        </div>
      )}
      <Avatar size={38} radius="xl" color="blue" style={{ flexShrink: 0 }}>
        {driver.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </Avatar>
      <div className={styles.driverInfo}>
        <div className={styles.driverName}>{driver.name}</div>
        <div className={styles.driverCode}>{driver.code} · {driver.licenseClass}</div>
      </div>
      <div className={styles.driverMeta}>
        <div className={styles.statusBadge} style={{ background: color + '20', color, borderColor: color + '40' }}>
          <span className={`status-dot ${driver.status}`} />
          {driver.status.replace('_', ' ')}
        </div>
        <div className={styles.ratingRow}>
          <IconStar size={10} color="#f59e0b" fill="#f59e0b" />
          <span>{driver.rating}</span>
        </div>
      </div>
      {reorderMode && (
        <div className={styles.rowActions} onClick={e => e.stopPropagation()}>
          <ActionIcon size="xs" variant="subtle" color="blue" onClick={() => onEdit(driver)}><IconEdit size={12} /></ActionIcon>
          <ActionIcon size="xs" variant="subtle" color="red" onClick={() => onDelete(driver.id)}><IconTrash size={12} /></ActionIcon>
        </div>
      )}
    </div>
  );
}

function DriverDetailPanel({ driver, onClose, onEdit, onDelete }) {
  if (!driver) return null;
  const color = STATUS_COLORS[driver.status] || '#6b7280';
  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <Avatar size={56} radius="xl" color="blue" style={{ border: `2px solid ${color}` }}>
          {driver.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </Avatar>
        <div>
          <div className={styles.detailName}>{driver.name}</div>
          <div className={styles.detailCode}>{driver.code}</div>
          <div className={styles.detailStatusPill} style={{ background: color + '20', color, borderColor: color + '40' }}>
            <span className={`status-dot ${driver.status}`} />
            {driver.status.replace('_', ' ').toUpperCase()}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <ActionIcon size="sm" variant="subtle" color="blue" onClick={onEdit}><IconEdit size={14} /></ActionIcon>
          <ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete}><IconTrash size={14} /></ActionIcon>
          <ActionIcon size="sm" variant="subtle" onClick={onClose}>✕</ActionIcon>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {[
          { label: 'Total Trips', value: driver.totalTrips.toLocaleString(), color: '#60a5fa' },
          { label: 'Distance (km)', value: driver.totalDistance.toLocaleString(), color: '#10b981' },
          { label: 'Rating', value: driver.rating, color: '#f59e0b' },
          { label: 'Violations', value: driver.violations, color: driver.violations > 3 ? '#ef4444' : '#6b7280' },
        ].map(s => (
          <div key={s.label} className={styles.statCard}>
            <span className={styles.statVal} style={{ color: s.color }}>{s.value}</span>
            <span className={styles.statLbl}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.detailBody}>
        {[
          { icon: IconPhone, label: 'Phone', value: driver.phone },
          { icon: IconMail, label: 'Email', value: driver.email },
          { icon: IconId, label: 'License', value: `${driver.license} (${driver.licenseClass})` },
          { icon: IconId, label: 'Expiry', value: driver.licenseExpiry },
          { icon: IconRoute, label: 'Joined', value: driver.joinDate },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className={styles.infoRow}>
            <Icon size={13} color="var(--fv-text-muted)" />
            <span className={styles.infoLabel}>{label}</span>
            <span className={styles.infoValue}>{value}</span>
          </div>
        ))}
        {driver.notes && (
          <div className={styles.notesBox}>
            <div className={styles.notesLabel}>Notes</div>
            <div className={styles.notesText}>{driver.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DriverFormModal({ opened, onClose, driver }) {
  const dispatch = useDispatch();
  const isEdit = !!driver;
  const form = useForm({
    initialValues: { name: '', code: '', phone: '', email: '', license: '', licenseExpiry: '', licenseClass: 'Class A', status: 'offline', groupId: 'g1', address: '', emergencyContact: '', notes: '', rating: 4.0, totalTrips: 0, totalDistance: 0, violations: 0, joinDate: new Date().toISOString().slice(0, 10) },
  });
  useEffect(() => { if (driver) form.setValues(driver); else form.reset(); }, [driver, opened]);
  const handleSubmit = (values) => {
    if (isEdit) { dispatch(updateDriver({ ...driver, ...values })); notifications.show({ title: 'Driver updated', color: 'blue' }); }
    else { dispatch(addDriver({ ...values, currentVehicleId: null })); notifications.show({ title: 'Driver added', color: 'green' }); }
    onClose();
  };
  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? `Edit — ${driver?.name}` : 'Add New Driver'} size="lg" zIndex={2000} styles={{ title: { fontWeight: 700 } }}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <SimpleGrid cols={2} spacing="sm">
          <TextInput label="Full Name" required {...form.getInputProps('name')} />
          <TextInput label="Driver Code" placeholder="DRV-006" required {...form.getInputProps('code')} />
          <TextInput label="Phone" {...form.getInputProps('phone')} />
          <TextInput label="Email" {...form.getInputProps('email')} />
          <TextInput label="License No." {...form.getInputProps('license')} />
          <TextInput label="License Expiry" placeholder="2026-12-31" {...form.getInputProps('licenseExpiry')} />
          <Select label="License Class" data={['Class A', 'Class B', 'Class C']} {...form.getInputProps('licenseClass')} />
          <Select label="Status" data={['online', 'offline', 'on_trip', 'break']} {...form.getInputProps('status')} />
          <TextInput label="Join Date" {...form.getInputProps('joinDate')} />
          <NumberInput label="Violations" min={0} {...form.getInputProps('violations')} />
          <TextInput label="Address" {...form.getInputProps('address')} />
          <TextInput label="Emergency Contact" {...form.getInputProps('emergencyContact')} />
        </SimpleGrid>
        <Textarea label="Notes" mt="sm" {...form.getInputProps('notes')} />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button type="submit" color="blue">{isEdit ? 'Save Changes' : 'Add Driver'}</Button>
        </Group>
      </form>
    </Modal>
  );
}

export default function DriversPage() {
  const dispatch = useDispatch();
  const { items, selected, filter, sortOrder } = useSelector(s => s.drivers);
  const { reorderMode } = useSelector(s => s.ui);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; item: DeleteConfirmItem | null; id: string | null }>({ open: false, item: null, id: null });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const selectedDriver = items.find(d => d.id === selected) || null;

  const filtered = (() => {
    const ordered = sortOrder.map(id => items.find(d => d.id === id)).filter(Boolean);
    return ordered.filter(d => {
      if (filter.status !== 'all' && d.status !== filter.status) return false;
      if (filter.search && !d.name.toLowerCase().includes(filter.search.toLowerCase()) && !d.code.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    });
  })();

  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      const oi = sortOrder.indexOf(active.id), ni = sortOrder.indexOf(over.id);
      dispatch(reorderDrivers(arrayMove(sortOrder, oi, ni)));
    }
  };

  const requestDelete = (id) => {
    const driver = items.find(d => d.id === id);
    if (!driver) return;
    const color = STATUS_COLORS[driver.status] || '#6b7280';
    setDeleteConfirm({
      open: true,
      item: { name: driver.name, color, meta: `${driver.code} · ${driver.licenseClass} · ${driver.status.replace('_', ' ')}` },
      id: driver.id,
    });
  };

  const confirmDelete = () => {
    if (!deleteConfirm.id) return;
    dispatch(deleteDriver(deleteConfirm.id));
    notifications.show({ title: 'Driver removed', message: `"${deleteConfirm.item?.name}" has been removed`, color: 'red' });
    setDeleteConfirm({ open: false, item: null, id: null });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ open: false, item: null, id: null });
  };

  return (
    <div className={styles.page}>
      <div className={styles.listPanel}>
        <div className={styles.listHeader}>
          <div className={styles.listTitle}>
            <span>Drivers</span>
            <button className={styles.addBtn} onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus size={14} /></button>
          </div>
          <div className={styles.statRow}>
            {[
              { l: 'Total', v: items.length, c: '#60a5fa' },
              { l: 'Online', v: items.filter(d => d.status === 'online').length, c: '#10b981' },
              { l: 'On Trip', v: items.filter(d => d.status === 'on_trip').length, c: '#3b82f6' },
              { l: 'Offline', v: items.filter(d => d.status === 'offline').length, c: '#6b7280' },
            ].map(s => (
              <div key={s.l} className={styles.statPill}>
                <span style={{ color: s.c, fontWeight: 700, fontSize: 14, fontFamily: 'var(--fv-font-mono)' }}>{s.v}</span>
                <span style={{ color: 'var(--fv-text-muted)', fontSize: 9, textTransform: 'uppercase' }}>{s.l}</span>
              </div>
            ))}
          </div>
          <TextInput placeholder="Search drivers..." leftSection={<IconSearch size={13} />} value={filter.search} onChange={e => dispatch(setFilter({ search: e.target.value }))} size="xs" />
          <Select data={STATUS_OPTIONS} value={filter.status} onChange={val => dispatch(setFilter({ status: val }))} size="xs" />
        </div>

        <div className={styles.driverList}>
          {reorderMode ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filtered.map(d => d.id)} strategy={verticalListSortingStrategy}>
                {filtered.map(d => (
                  <SortableDriverRow key={d.id} driver={d} selected={selected === d.id} reorderMode={reorderMode}
                    onSelect={id => dispatch(setSelected(id === selected ? null : id))}
                    onEdit={drv => { setEditTarget(drv); setFormOpen(true); }}
                    onDelete={requestDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            filtered.map(d => (
              <SortableDriverRow key={d.id} driver={d} selected={selected === d.id} reorderMode={false}
                onSelect={id => dispatch(setSelected(id === selected ? null : id))}
                onEdit={drv => { setEditTarget(drv); setFormOpen(true); }}
                onDelete={requestDelete}
              />
            ))
          )}
          {filtered.length === 0 && <div className={styles.empty}><IconId size={32} opacity={0.3} /><p>No drivers found</p></div>}
        </div>
        {reorderMode && <div className={styles.reorderBanner}><IconGripVertical size={12} /><span>Drag to reorder</span></div>}
      </div>

      {selectedDriver ? (
        <DriverDetailPanel
          driver={selectedDriver}
          onClose={() => dispatch(setSelected(null))}
          onEdit={() => { setEditTarget(selectedDriver); setFormOpen(true); }}
          onDelete={() => requestDelete(selectedDriver.id)}
        />
      ) : (
        <div className={styles.emptyState}>
          <IconId size={48} opacity={0.15} />
          <p>Select a driver to view details</p>
        </div>
      )}

      <DriverFormModal opened={formOpen} onClose={() => setFormOpen(false)} driver={editTarget} />

      <DeleteConfirmModal
        opened={deleteConfirm.open}
        item={deleteConfirm.item}
        entityLabel="Driver"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

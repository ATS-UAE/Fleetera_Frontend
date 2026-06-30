import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setSelected, setFilter, deleteVehicle, simulateTick, reorderVehicles } from '@/store/slices/vehiclesSlice';
import { addNotification } from '@/store/slices/uiSlice';
import VehicleList from './VehicleList';
import VehicleMap from './VehicleMap';
import VehicleDetailPanel from './VehicleDetailPanel';
import VehicleFormModal from './VehicleFormModal';
import styles from './Vehicles.module.css';

export default function VehiclesPage() {
  const dispatch = useDispatch();
  const { items, selected, filter, sortOrder } = useSelector(s => s.vehicles);
  const { reorderMode } = useSelector(s => s.ui);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const tickRef = useRef(null);

  // Simulate live GPS ticks
  useEffect(() => {
    tickRef.current = setInterval(() => dispatch(simulateTick()), 3000);
    return () => clearInterval(tickRef.current);
  }, [dispatch]);

  // Memoized: without this, filteredVehicles was a brand-new array on every
  // render of this page (which happens often — list hover states, etc.), which
  // made VehicleMap's marker-update effect re-run far more often than the
  // actual 3s GPS tick, repeatedly disturbing the in-flight CSS glide
  // transition and contributing to the "shaking" look.
  const filteredVehicles = useMemo(() => {
    const ordered = sortOrder.map(id => items.find(v => v.id === id)).filter(Boolean);
    return ordered.filter(v => {
      if (filter.status !== 'all' && v.status !== filter.status) return false;
      if (filter.group !== 'all' && v.groupId !== filter.group) return false;
      if (filter.search && !v.name.toLowerCase().includes(filter.search.toLowerCase()) &&
          !v.plate.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    });
  }, [items, sortOrder, filter.status, filter.group, filter.search]);

  const selectedVehicle = items.find(v => v.id === selected) || null;

  const handleEdit = (vehicle) => {
    setEditTarget(vehicle);
    setFormOpen(true);
  };

  const handleDelete = (id) => {
    dispatch(deleteVehicle(id));
    dispatch(addNotification({ type: 'success', title: 'Vehicle removed', message: 'Vehicle deleted successfully.' }));
  };

  // Memoized for the same reason as filteredVehicles above — a stable function
  // reference so VehicleMap's effect (which depends on onSelect) doesn't
  // re-fire just because VehiclesPage re-rendered for an unrelated reason.
  const handleMapSelect = useCallback((id) => {
    dispatch(setSelected(id === selected ? null : id));
  }, [dispatch, selected]);

  return (
    <div className={styles.page}>
      {/* Left: vehicle list panel */}
      <div className={styles.listPanel}>
        <VehicleList
          vehicles={filteredVehicles}
          selected={selected}
          filter={filter}
          reorderMode={reorderMode}
          sortOrder={sortOrder}
          allItems={items}
          onSelect={id => dispatch(setSelected(id === selected ? null : id))}
          onFilter={f => dispatch(setFilter(f))}
          onAdd={() => { setEditTarget(null); setFormOpen(true); }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReorder={order => dispatch(reorderVehicles(order))}
        />
      </div>

      {/* Center: map */}
      <div className={styles.mapPanel}>
        <VehicleMap
          vehicles={filteredVehicles}
          selected={selected}
          onSelect={handleMapSelect}
        />
      </div>

      {/* Right: detail panel (slides in when vehicle selected) */}
      {selectedVehicle && (
        <div className={styles.detailPanel}>
          <VehicleDetailPanel
            vehicle={selectedVehicle}
            onClose={() => dispatch(setSelected(null))}
            onEdit={() => handleEdit(selectedVehicle)}
            onDelete={() => handleDelete(selectedVehicle.id)}
          />
        </div>
      )}

      <VehicleFormModal
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        vehicle={editTarget}
      />
    </div>
  );
}

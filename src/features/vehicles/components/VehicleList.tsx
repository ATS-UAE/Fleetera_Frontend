import type { Vehicle } from '@/types';
import React, { useState } from 'react';
import { TextInput, Select, Tooltip, ActionIcon } from '@mantine/core';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IconSearch, IconPlus, IconFilter, IconGripVertical,
  IconEdit, IconTrash, IconTruck, IconGasStation,
  IconSpeedboat, IconMapPin,
} from '@tabler/icons-react';
import styles from './VehicleList.module.css';

const STATUS_COLORS = {
  moving: '#10b981', idle: '#f59e0b', stopped: '#6b7280',
  offline: '#374151', maintenance: '#8b5cf6',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'moving', label: 'Moving' },
  { value: 'idle', label: 'Idle' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'offline', label: 'Offline' },
  { value: 'maintenance', label: 'Maintenance' },
];

function SortableVehicleCard({ vehicle, selected, reorderMode, onSelect, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: vehicle.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.vehicleCard} ${selected ? styles.selected : ''} ${reorderMode ? styles.reorderMode : ''}`}
      onClick={() => !reorderMode && onSelect(vehicle.id)}
    >
      {reorderMode && (
        <div className={styles.dragHandle} {...attributes} {...listeners} onClick={e => e.stopPropagation()}>
          <IconGripVertical size={14} />
        </div>
      )}

      <div className={styles.cardLeft}>
        <div className={styles.vehicleIcon} style={{ borderColor: STATUS_COLORS[vehicle.status] + '40', background: STATUS_COLORS[vehicle.status] + '15' }}>
          <IconTruck size={16} style={{ color: STATUS_COLORS[vehicle.status] }} />
        </div>
        <div className={styles.vehicleInfo}>
          <div className={styles.vehicleName}>{vehicle.name}</div>
          <div className={styles.vehiclePlate}>{vehicle.plate}</div>
          <div className={styles.vehicleType}>{vehicle.type}</div>
        </div>
      </div>

      <div className={styles.cardRight}>
        <div className={styles.statusPill} style={{ background: STATUS_COLORS[vehicle.status] + '20', color: STATUS_COLORS[vehicle.status], borderColor: STATUS_COLORS[vehicle.status] + '40' }}>
          <span className={`status-dot ${vehicle.status}`} />
          {vehicle.status}
        </div>
        <div className={styles.vehicleMeta}>
          <span className={styles.metaItem}><IconSpeedboat size={10} />{Math.round(vehicle.speed)} km/h</span>
          <span className={styles.metaItem}><IconGasStation size={10} />{vehicle.fuel}%</span>
        </div>
        {reorderMode && (
          <div className={styles.cardActions} onClick={e => e.stopPropagation()}>
            <ActionIcon size="xs" variant="subtle" color="blue" onClick={() => onEdit(vehicle)}>
              <IconEdit size={12} />
            </ActionIcon>
            <ActionIcon size="xs" variant="subtle" color="red" onClick={() => onDelete(vehicle.id)}>
              <IconTrash size={12} />
            </ActionIcon>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VehicleList({ vehicles, selected, filter, reorderMode, sortOrder, allItems, onSelect, onFilter, onAdd, onEdit, onDelete, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortOrder.indexOf(active.id);
      const newIndex = sortOrder.indexOf(over.id);
      onReorder(arrayMove(sortOrder, oldIndex, newIndex));
    }
  };

  const counts = {
    all: allItems.length,
    moving: allItems.filter(v => v.status === 'moving').length,
    idle: allItems.filter(v => v.status === 'idle').length,
    offline: allItems.filter(v => v.status === 'offline').length,
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.title}>Vehicles</span>
          <Tooltip label="Add vehicle">
            <button className={styles.addBtn} onClick={onAdd}>
              <IconPlus size={14} />
            </button>
          </Tooltip>
        </div>

        {/* Stat pills */}
        <div className={styles.statRow}>
          {[
            { label: 'Total', value: counts.all, color: '#60a5fa' },
            { label: 'Moving', value: counts.moving, color: '#10b981' },
            { label: 'Idle', value: counts.idle, color: '#f59e0b' },
            { label: 'Offline', value: counts.offline, color: '#6b7280' },
          ].map(s => (
            <div key={s.label} className={styles.statPill} style={{ borderColor: s.color + '30' }}>
              <span className={styles.statValue} style={{ color: s.color }}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Search */}
        <TextInput
          placeholder="Search by name or plate..."
          leftSection={<IconSearch size={13} />}
          value={filter.search}
          onChange={e => onFilter({ search: e.target.value })}
          size="xs"
          styles={{ input: { fontSize: '12px' } }}
        />

        {/* Filter */}
        <Select
          data={STATUS_OPTIONS}
          value={filter.status}
          onChange={val => onFilter({ status: val })}
          size="xs"
          leftSection={<IconFilter size={13} />}
          styles={{ input: { fontSize: '12px' } }}
        />
      </div>

      {/* List */}
      <div className={styles.list}>
        {reorderMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={vehicles.map(v => v.id)} strategy={verticalListSortingStrategy}>
              {vehicles.map(v => (
                <SortableVehicleCard
                  key={v.id} vehicle={v} selected={selected === v.id}
                  reorderMode={reorderMode} onSelect={onSelect}
                  onEdit={onEdit} onDelete={onDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          vehicles.map(v => (
            <SortableVehicleCard
              key={v.id} vehicle={v} selected={selected === v.id}
              reorderMode={false} onSelect={onSelect}
              onEdit={onEdit} onDelete={onDelete}
            />
          ))
        )}

        {vehicles.length === 0 && (
          <div className={styles.empty}>
            <IconTruck size={32} opacity={0.3} />
            <p>No vehicles match your filter</p>
          </div>
        )}
      </div>

      {reorderMode && (
        <div className={styles.reorderBanner}>
          <IconGripVertical size={12} />
          <span>Drag to reorder · Click edit to modify</span>
        </div>
      )}
    </div>
  );
}

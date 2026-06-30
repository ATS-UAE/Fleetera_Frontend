import React from 'react';
import { ActionIcon, Tooltip, Badge } from '@mantine/core';
import {
  IconX, IconEdit, IconTrash, IconCircle, IconPolygon,
  IconMapPin, IconRuler, IconBell, IconBellOff, IconCalendar,
  IconEye, IconEyeOff,
} from '@tabler/icons-react';
import styles from './GeofenceDetailPanel.module.css';

function DetailRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div className={styles.detailRow}>
      <div className={styles.detailIcon}><Icon size={13} /></div>
      <div className={styles.detailContent}>
        <span className={styles.detailLabel}>{label}</span>
        <span className={`${styles.detailValue} ${mono ? styles.mono : ''}`}>{value}</span>
      </div>
    </div>
  );
}

export default function GeofenceDetailPanel({ geofence, onClose, onEdit, onDelete, onToggleActive }) {
  const color = geofence.active ? geofence.color : '#6b7280';
  const ShapeIcon = geofence.type === 'circle' ? IconCircle : IconPolygon;

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.shapeAvatar} style={{ borderColor: color + '60', background: color + '15' }}>
            <ShapeIcon size={20} style={{ color }} />
          </div>
          <div>
            <div className={styles.geoName}>{geofence.name}</div>
            <div className={styles.geoType}>{geofence.type === 'circle' ? 'Circular zone' : 'Polygon zone'}</div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Tooltip label="Edit geofence"><ActionIcon size="sm" variant="subtle" color="blue" onClick={onEdit}><IconEdit size={14} /></ActionIcon></Tooltip>
          <Tooltip label="Delete geofence"><ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete}><IconTrash size={14} /></ActionIcon></Tooltip>
          <ActionIcon size="sm" variant="subtle" onClick={onClose}><IconX size={14} /></ActionIcon>
        </div>
      </div>

      {/* Status banner */}
      <div className={styles.statusBanner} style={{ background: color + '12', borderColor: color + '30' }}>
        <div className={styles.statusLeft}>
          <span className={`status-dot ${geofence.active ? 'moving' : 'offline'}`} />
          <span className={styles.statusText} style={{ color }}>{geofence.active ? 'ACTIVE' : 'INACTIVE'}</span>
        </div>
        <Tooltip label={geofence.active ? 'Deactivate' : 'Activate'}>
          <ActionIcon size="sm" variant="light" color={geofence.active ? 'green' : 'gray'} onClick={onToggleActive}>
            {geofence.active ? <IconEye size={15} /> : <IconEyeOff size={15} />}
          </ActionIcon>
        </Tooltip>
      </div>

      {/* Alert chips */}
      <div className={styles.alertRow}>
        <div className={`${styles.alertChip} ${geofence.alertOnEnter ? styles.alertOn : styles.alertOff}`}>
          {geofence.alertOnEnter ? <IconBell size={13} /> : <IconBellOff size={13} />}
          <span>Alert on enter</span>
        </div>
        <div className={`${styles.alertChip} ${geofence.alertOnExit ? styles.alertOn : styles.alertOff}`}>
          {geofence.alertOnExit ? <IconBell size={13} /> : <IconBellOff size={13} />}
          <span>Alert on exit</span>
        </div>
      </div>

      {/* Description */}
      {geofence.description && (
        <div className={styles.descBox}>
          <div className={styles.descLabel}>Description</div>
          <div className={styles.descText}>{geofence.description}</div>
        </div>
      )}

      {/* Details */}
      <div className={styles.tabContent}>
        {geofence.type === 'circle' && geofence.center && (
          <>
            <DetailRow icon={IconMapPin} label="Center" value={`${geofence.center.lat.toFixed(5)}, ${geofence.center.lng.toFixed(5)}`} mono />
            <DetailRow icon={IconRuler} label="Radius" value={`${geofence.radius} m`} mono />
          </>
        )}
        {geofence.type === 'polygon' && geofence.coordinates && (
          <DetailRow icon={IconMapPin} label="Vertices" value={`${geofence.coordinates.length} points`} mono />
        )}
        <DetailRow icon={IconCalendar} label="Created" value={new Date(geofence.createdAt).toLocaleDateString()} />
      </div>
    </div>
  );
}

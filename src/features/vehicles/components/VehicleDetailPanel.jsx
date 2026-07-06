import React from 'react';
import { Badge, Tabs, Progress, ActionIcon, Tooltip } from '@mantine/core';
import {
  IconArrowLeft, IconEdit, IconTrash, IconTruck, IconGasStation,
  IconSpeedboat, IconMapPin, IconCalendar, IconPhone,
  IconDeviceMobile, IconEngine, IconRoute, IconClock,
  IconShield,
} from '@tabler/icons-react';
import styles from './VehicleDetailPanel.module.css';

const STATUS_COLORS = {
  moving: '#10b981', idle: '#f59e0b', stopped: '#6b7280',
  offline: '#374151', maintenance: '#8b5cf6',
};

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

export default function VehicleDetailPanel({ vehicle, onClose, onEdit, onDelete }) {
  const statusColor = STATUS_COLORS[vehicle.status] || '#6b7280';
  const fuelColor = vehicle.fuel < 20 ? '#ef4444' : vehicle.fuel < 40 ? '#f59e0b' : '#10b981';

  return (
    <div className={styles.panel}>
      {/* Back navigation header */}
      <div className={styles.backHeader}>
        <button className={styles.backBtn} onClick={onClose} title="Back to vehicle list">
          <IconArrowLeft size={16} />
          <span>Vehicles</span>
        </button>
        <div className={styles.headerActions}>
          <Tooltip label="Edit vehicle"><ActionIcon size="sm" variant="subtle" color="blue" onClick={onEdit}><IconEdit size={14} /></ActionIcon></Tooltip>
          <Tooltip label="Delete vehicle"><ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete}><IconTrash size={14} /></ActionIcon></Tooltip>
        </div>
      </div>

      {/* Vehicle identity */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.vehicleAvatar} style={{ borderColor: statusColor + '60', background: statusColor + '15' }}>
            <IconTruck size={20} style={{ color: statusColor }} />
          </div>
          <div>
            <div className={styles.vehicleName}>{vehicle.name}</div>
            <div className={styles.vehiclePlate}>{vehicle.plate}</div>
          </div>
        </div>
      </div>

      {/* Status banner */}
      <div className={styles.statusBanner} style={{ background: statusColor + '12', borderColor: statusColor + '30' }}>
        <div className={styles.statusLeft}>
          <span className={`status-dot ${vehicle.status}`} />
          <span className={styles.statusText} style={{ color: statusColor }}>{vehicle.status.toUpperCase()}</span>
        </div>
        <div className={styles.statusRight}>
          <span className={styles.speedValue}>{Math.round(vehicle.speed)}</span>
          <span className={styles.speedUnit}>km/h</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricValue} style={{ color: fuelColor }}>{vehicle.fuel}%</span>
          <span className={styles.metricLabel}>Fuel</span>
          <Progress value={vehicle.fuel} color={vehicle.fuel < 20 ? 'red' : vehicle.fuel < 40 ? 'yellow' : 'green'} size={3} mt={4} radius="xl" />
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricValue} style={{ color: '#60a5fa' }}>{vehicle.odometer.toLocaleString()}</span>
          <span className={styles.metricLabel}>Odometer (km)</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricValue} style={{ color: vehicle.engineOn ? '#10b981' : '#6b7280' }}>
            {vehicle.engineOn ? 'ON' : 'OFF'}
          </span>
          <span className={styles.metricLabel}>Engine</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricValue} style={{ color: vehicle.ignition ? '#10b981' : '#6b7280' }}>
            {vehicle.ignition ? 'ON' : 'OFF'}
          </span>
          <span className={styles.metricLabel}>Ignition</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" styles={{ tab: { fontSize: '12px', padding: '6px 12px' } }}>
        <Tabs.List style={{ borderColor: 'var(--fv-border)' }}>
          <Tabs.Tab value="info">Info</Tabs.Tab>
          <Tabs.Tab value="location">Location</Tabs.Tab>
          <Tabs.Tab value="docs">Documents</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="info" pt="xs">
          <div className={styles.tabContent}>
            <DetailRow icon={IconTruck} label="Make / Model" value={`${vehicle.make} ${vehicle.model} ${vehicle.year}`} />
            <DetailRow icon={IconRoute} label="Vehicle Type" value={vehicle.type} />
            <DetailRow icon={IconPhone} label="SIM Card" value={vehicle.sim} mono />
            <DetailRow icon={IconDeviceMobile} label="IMEI" value={vehicle.imei} mono />
            <DetailRow icon={IconClock} label="Last Update" value={new Date(vehicle.lastUpdate).toLocaleTimeString()} />
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="location" pt="xs">
          <div className={styles.tabContent}>
            <DetailRow icon={IconMapPin} label="Latitude" value={vehicle.lat.toFixed(6)} mono />
            <DetailRow icon={IconMapPin} label="Longitude" value={vehicle.lng.toFixed(6)} mono />
            <DetailRow icon={IconRoute} label="Heading" value={`${vehicle.heading}°`} mono />
            <DetailRow icon={IconSpeedboat} label="Speed" value={`${Math.round(vehicle.speed)} km/h`} mono />
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="docs" pt="xs">
          <div className={styles.tabContent}>
            <div className={styles.docCard}>
              <div className={styles.docIcon}><IconShield size={16} color="#10b981" /></div>
              <div>
                <div className={styles.docTitle}>Insurance</div>
                <div className={styles.docDate}>Expires: {vehicle.insurance}</div>
              </div>
              <Badge size="xs" color={new Date(vehicle.insurance) > new Date() ? 'green' : 'red'} variant="light">
                {new Date(vehicle.insurance) > new Date() ? 'Valid' : 'Expired'}
              </Badge>
            </div>
            <div className={styles.docCard}>
              <div className={styles.docIcon}><IconCalendar size={16} color="#f59e0b" /></div>
              <div>
                <div className={styles.docTitle}>Service Due</div>
                <div className={styles.docDate}>{vehicle.service}</div>
              </div>
            </div>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Avatar, TextInput, Select, Badge } from '@mantine/core';
import { IconSearch, IconPhone, IconMapPin, IconClock, IconStar } from '@tabler/icons-react';
import styles from './DriversOnlinePage.module.css';

const STATUS_COLORS = { online: '#10b981', on_trip: '#3b82f6', break: '#f59e0b', offline: '#6b7280' };

export default function DriversOnlinePage() {
  const drivers = useSelector(s => s.drivers.items);
  const vehicles = useSelector(s => s.vehicles.items);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const onlineDrivers = drivers.filter(d => d.status !== 'offline');

  const filtered = onlineDrivers.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // assign a "current vehicle" for display purposes
  const getVehicleFor = (idx) => vehicles[idx % vehicles.length];

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.title}>Drivers Online</span>
          <Badge color="green" variant="light" size="sm">{onlineDrivers.length} active</Badge>
        </div>
        <div className={styles.toolbarRight}>
          <TextInput placeholder="Search drivers..." leftSection={<IconSearch size={13} />} value={search} onChange={e => setSearch(e.target.value)} size="xs" w={220} />
          <Select
            data={[{ value: 'all', label: 'All Status' }, { value: 'online', label: 'Online' }, { value: 'on_trip', label: 'On Trip' }, { value: 'break', label: 'On Break' }]}
            value={statusFilter} onChange={setStatusFilter} size="xs" w={140}
          />
        </div>
      </div>

      <div className={styles.grid}>
        {filtered.map((d, idx) => {
          const vehicle = getVehicleFor(idx);
          const color = STATUS_COLORS[d.status];
          return (
            <div key={d.id} className={styles.driverCard}>
              <div className={styles.cardTop}>
                <Avatar size={44} radius="xl" color="blue" style={{ border: `2px solid ${color}` }}>
                  {d.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </Avatar>
                <div className={styles.cardTopInfo}>
                  <div className={styles.driverName}>{d.name}</div>
                  <div className={styles.driverCode}>{d.code}</div>
                </div>
                <div className={styles.statusDot} style={{ background: color }} />
              </div>

              <div className={styles.statusPill} style={{ background: color + '15', color, borderColor: color + '40' }}>
                <span className={`status-dot ${d.status}`} />
                {d.status.replace('_', ' ').toUpperCase()}
              </div>

              <div className={styles.cardBody}>
                <div className={styles.infoLine}>
                  <IconPhone size={12} />
                  <span>{d.phone}</span>
                </div>
                {vehicle && (
                  <div className={styles.infoLine}>
                    <IconMapPin size={12} />
                    <span>{vehicle.name} · {vehicle.lat.toFixed(3)}, {vehicle.lng.toFixed(3)}</span>
                  </div>
                )}
                <div className={styles.infoLine}>
                  <IconClock size={12} />
                  <span>Active {Math.floor(Math.random() * 8) + 1}h {Math.floor(Math.random() * 59)}m</span>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.ratingBox}>
                  <IconStar size={11} color="#f59e0b" fill="#f59e0b" />
                  <span>{d.rating}</span>
                </div>
                <div className={styles.tripsBox}>
                  {d.totalTrips.toLocaleString()} trips
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className={styles.empty}>No drivers match this filter.</div>
        )}
      </div>
    </div>
  );
}

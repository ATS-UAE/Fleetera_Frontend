import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Badge, Tooltip, Avatar } from '@mantine/core';
import { IconBell, IconSearch, IconRefresh, IconWifi, IconWifiOff } from '@tabler/icons-react';
import styles from './TopBar.module.css';

const TAB_LABELS = {
  dashboard: 'Dashboard',
  vehicles: 'Vehicles',
  drivers: 'Driver Management',
  driversOnline: 'Drivers Online',
  trackPlayer: 'Track Player',
  geofences: 'Geofences',
  reports: 'Reports',
};

export default function TopBar() {
  const { activeTab } = useSelector(s => s.ui);
  const vehicles = useSelector(s => s.vehicles.items);
  const moving = vehicles.filter(v => v.status === 'moving').length;
  const [online] = useState(true);

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <h1 className={styles.pageTitle}>{TAB_LABELS[activeTab]}</h1>
        <div className={styles.breadcrumb}>
          <span className={styles.crumb}>FleetVision</span>
          <span className={styles.crumbSep}>/</span>
          <span className={styles.crumbActive}>{TAB_LABELS[activeTab]}</span>
        </div>
      </div>

      <div className={styles.center}>
        <div className={styles.liveIndicator}>
          <span className={`status-dot moving`} />
          <span className={styles.liveLabel}>{moving} vehicles moving</span>
        </div>
      </div>

      <div className={styles.right}>
        <div className={`${styles.connectionStatus} ${online ? styles.online : styles.offline}`}>
          {online ? <IconWifi size={12} /> : <IconWifiOff size={12} />}
          <span>{online ? 'Live' : 'Offline'}</span>
        </div>

        <Tooltip label="Refresh data" openDelay={500}>
          <button className={styles.actionBtn}>
            <IconRefresh size={16} />
          </button>
        </Tooltip>

        <Tooltip label="Search everything" openDelay={500}>
          <button className={styles.actionBtn}>
            <IconSearch size={16} />
          </button>
        </Tooltip>

        <Tooltip label="Notifications" openDelay={500}>
          <button className={styles.actionBtn} style={{ position: 'relative' }}>
            <IconBell size={16} />
            <span className={styles.notifBadge}>3</span>
          </button>
        </Tooltip>

        <div className={styles.userArea}>
          <Avatar size={30} radius="xl" color="blue" style={{ cursor: 'pointer' }}>AD</Avatar>
          <div className={styles.userInfo}>
            <span className={styles.userName}>Admin</span>
            <span className={styles.userRole}>Fleet Manager</span>
          </div>
        </div>
      </div>
    </header>
  );
}

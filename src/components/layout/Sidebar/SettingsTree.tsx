import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Avatar, Switch, Badge, ActionIcon, Tooltip, TextInput } from '@mantine/core';
import {
  IconSettings, IconChevronDown, IconChevronRight as IconCaretRight,
  IconUser, IconSun, IconMoon, IconBell, IconMail, IconPhone,
  IconShieldCheck, IconTrash, IconCheck, IconAlertTriangle,
  IconInfoCircle, IconGasStation,
} from '@tabler/icons-react';
import {
  toggleSettingsTree, setSettingsSection, setTheme,
  removeNotification, clearNotifications,
} from '@/store/slices/uiSlice';
import { activityFeed as mockNotifications } from '@/data';
import styles from './SettingsTree.module.css';

const SECTIONS = [
  { id: 'profile',       label: 'Profile',       icon: IconUser },
  { id: 'appearance',    label: 'Appearance',     icon: IconSun },
  { id: 'notifications', label: 'Notifications',  icon: IconBell },
];

const SEVERITY_META = {
  info:    { color: '#3b82f6', icon: IconInfoCircle },
  warning: { color: '#f59e0b', icon: IconAlertTriangle },
  danger:  { color: '#ef4444', icon: IconGasStation },
  success: { color: '#10b981', icon: IconCheck },
};

function ProfilePanel() {
  return (
    <div className={styles.panelBody}>
      <div className={styles.profileRow}>
        <Avatar size={44} radius="xl" color="blue" style={{ fontWeight: 700 }}>AD</Avatar>
        <div>
          <div className={styles.profileName}>Admin</div>
          <Badge size="xs" variant="light" color="blue">Fleet Manager</Badge>
        </div>
      </div>

      <TextInput size="xs" label="Full name" defaultValue="Admin" leftSection={<IconUser size={12} />} />
      <TextInput size="xs" label="Email" defaultValue="admin@fleetera.com" leftSection={<IconMail size={12} />} />
      <TextInput size="xs" label="Phone" defaultValue="+94 77 123 4567" leftSection={<IconPhone size={12} />} />

      <div className={styles.securityRow}>
        <IconShieldCheck size={12} color="var(--fv-emerald)" />
        <span>2FA enabled</span>
      </div>
    </div>
  );
}

function AppearancePanel() {
  const dispatch = useDispatch();
  const theme = useSelector(s => s.ui.theme);
  const isDark = theme === 'dark';

  return (
    <div className={styles.panelBody}>
      <div className={styles.themeRow}>
        <IconSun size={14} className={!isDark ? styles.themeIconActive : styles.themeIconDim} />
        <Switch
          size="sm"
          checked={isDark}
          onChange={(e) => dispatch(setTheme(e.currentTarget.checked ? 'dark' : 'light'))}
          color="blue"
        />
        <IconMoon size={14} className={isDark ? styles.themeIconActive : styles.themeIconDim} />
      </div>
      <p className={styles.themeHint}>
        {isDark ? '🌙 Dark mode active' : '☀️ Light mode active'}
      </p>
    </div>
  );
}

function NotificationsPanel() {
  const dispatch = useDispatch();
  const notifications = mockNotifications;

  return (
    <div className={styles.panelBody}>
      <div className={styles.notifPrefs}>
        <div className={styles.prefRow}>
          <span>Push</span>
          <Switch size="xs" defaultChecked color="blue" />
        </div>
        <div className={styles.prefRow}>
          <span>Email</span>
          <Switch size="xs" defaultChecked color="blue" />
        </div>
        <div className={styles.prefRow}>
          <span>Geofence events</span>
          <Switch size="xs" defaultChecked color="blue" />
        </div>
        <div className={styles.prefRow}>
          <span>Maintenance</span>
          <Switch size="xs" color="blue" />
        </div>
      </div>

      <div className={styles.notifListHeader}>
        <span>Recent ({notifications.length})</span>
        <Tooltip label="Clear all">
          <ActionIcon size="xs" variant="subtle" color="red" onClick={() => dispatch(clearNotifications())}>
            <IconTrash size={11} />
          </ActionIcon>
        </Tooltip>
      </div>

      <div className={styles.notifList}>
        {notifications.slice(0, 5).map(n => {
          const meta = SEVERITY_META[n.severity] || SEVERITY_META.info;
          const NIcon = meta.icon;
          return (
            <div key={n.id} className={styles.notifItem}>
              <div className={styles.notifIcon} style={{ color: meta.color, background: meta.color + '15' }}>
                <NIcon size={11} />
              </div>
              <div className={styles.notifContent}>
                <span className={styles.notifVehicle}>{n.vehicle}</span>
                <span className={styles.notifTime}>{n.time}</span>
              </div>
              <ActionIcon
                size="xs" variant="subtle" color="gray"
                className={styles.notifDismiss}
                onClick={() => dispatch(removeNotification(n.id))}
              >
                <IconTrash size={10} />
              </ActionIcon>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PANELS = {
  profile: ProfilePanel,
  appearance: AppearancePanel,
  notifications: NotificationsPanel,
};

interface SettingsTreeProps { isCollapsed: boolean; }
export default function SettingsTree({ isCollapsed }: SettingsTreeProps) {
  const dispatch = useDispatch();
  const { settingsTreeOpen, settingsActiveSection } = useSelector(s => s.ui);

  // In collapsed-sidebar mode, just show the icon — expanding a tree doesn't
  // make sense in a 64px-wide rail, so clicking it auto-expands the sidebar
  // first (handled by the parent via the same toggleSidebar action elsewhere,
  // here we simply hide the tree body).
  if (isCollapsed) {
    return (
      <Tooltip label="Settings" position="right" offset={12}>
        <button className={styles.collapsedBtn} onClick={() => dispatch(toggleSettingsTree())}>
          <IconSettings size={16} />
        </button>
      </Tooltip>
    );
  }

  const ActivePanel = settingsActiveSection ? PANELS[settingsActiveSection] : null;

  return (
    <div className={styles.wrap}>
      {/* Root "Settings" toggle */}
      <button
        className={`${styles.rootBtn} ${settingsTreeOpen ? styles.rootBtnOpen : ''}`}
        onClick={() => dispatch(toggleSettingsTree())}
      >
        <span className={styles.rootLeft}>
          <IconSettings size={17} />
          <span>Settings</span>
        </span>
        {settingsTreeOpen
          ? <IconChevronDown size={14} className={styles.chevron} />
          : <IconCaretRight size={14} className={styles.chevron} />}
      </button>

      {/* Tree of sub-sections */}
      {settingsTreeOpen && (
        <div className={styles.tree}>
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const isActive = settingsActiveSection === s.id;
            return (
              <div key={s.id} className={styles.treeNode}>
                <button
                  className={`${styles.treeBtn} ${isActive ? styles.treeBtnActive : ''}`}
                  onClick={() => dispatch(setSettingsSection(s.id))}
                >
                  <span className={styles.treeLine} />
                  <Icon size={13} />
                  <span>{s.label}</span>
                  {isActive
                    ? <IconChevronDown size={11} className={styles.treeChevron} />
                    : <IconCaretRight size={11} className={styles.treeChevron} />}
                </button>

                {/* Inline expanded panel for the active section */}
                {isActive && ActivePanel && (
                  <div className={styles.panelWrap}>
                    <ActivePanel />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

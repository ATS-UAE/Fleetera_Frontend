import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Tooltip, Switch } from '@mantine/core';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IconLayoutDashboard, IconTruck, IconId, IconUsers,
  IconPlayerPlay, IconShield, IconFileAnalytics,
  IconChevronLeft, IconChevronRight, IconMenuOrder, IconGripVertical,
} from '@tabler/icons-react';
import { setActiveTab, toggleSidebar, toggleReorderMode, setNavOrder } from '@/store/slices/uiSlice';
import SettingsTree from './SettingsTree';
import styles from './Sidebar.module.css';

const NAV_META = {
  dashboard:     { label: 'Dashboard',        icon: IconLayoutDashboard },
  vehicles:      { label: 'Vehicles',          icon: IconTruck },
  drivers:       { label: 'Driver Management', icon: IconId },
  driversOnline: { label: 'Drivers Online',    icon: IconUsers },
  trackPlayer:   { label: 'Track Player',      icon: IconPlayerPlay },
  geofences:     { label: 'Geofences',         icon: IconShield },
  reports:       { label: 'Reports',           icon: IconFileAnalytics },
};

// A single sortable nav item — used both in normal mode (just a nav button)
// and in reorder mode (adds a visible drag handle, dims the active indicator).
function SortableNavItem({ id, isActive, isCollapsed, reorderMode, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const meta = NAV_META[id];
  if (!meta) return null;
  const Icon = meta.icon;

  const btn = (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.navItemWrap} ${reorderMode ? styles.navItemReorder : ''}`}
    >
      {/* Drag handle — only visible in reorder mode */}
      {reorderMode && !isCollapsed && (
        <span
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <IconGripVertical size={13} />
        </span>
      )}
      {/* Collapsed reorder: drag handle IS the whole item */}
      {reorderMode && isCollapsed && (
        <div
          className={`${styles.navItem} ${isActive ? styles.active : ''}`}
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', justifyContent: 'center' }}
        >
          <span className={styles.navIcon}><Icon size={18} /></span>
        </div>
      )}
      {/* Normal nav button (visible when not in collapsed-reorder mode) */}
      {!(reorderMode && isCollapsed) && (
        <button
          className={`${styles.navItem} ${isActive ? styles.active : ''} ${reorderMode ? styles.navItemDraggable : ''}`}
          onClick={() => !reorderMode && onClick(id)}
          style={reorderMode ? { cursor: 'default', flex: 1 } : {}}
        >
          <span className={styles.navIcon}><Icon size={18} /></span>
          {!isCollapsed && <span className={styles.navLabel}>{meta.label}</span>}
          {!isCollapsed && isActive && !reorderMode && <span className={styles.activeBar} />}
        </button>
      )}
    </div>
  );

  if (isCollapsed && !reorderMode) {
    return (
      <Tooltip key={id} label={meta.label} position="right" offset={12}>
        {btn}
      </Tooltip>
    );
  }
  return btn;
}

export default function Sidebar() {
  const dispatch = useDispatch();
  const { sidebarCollapsed, activeTab, reorderMode, navOrder } = useSelector(s => s.ui);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      const oldIndex = navOrder.indexOf(active.id);
      const newIndex = navOrder.indexOf(over.id);
      dispatch(setNavOrder(arrayMove(navOrder, oldIndex, newIndex)));
    }
  };

  return (
    <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
      {/* Logo — fixed-height header, see Sidebar.module.css */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" fill="url(#grad)" />
            <defs>
              <linearGradient id="grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3b82f6"/>
                <stop offset="100%" stopColor="#06b6d4"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        {!sidebarCollapsed && (
          <div className={styles.logoText}>
            <span className={styles.logoName}>FLEETERA</span>
            {/* <span className={styles.logoTagline}>Enterprise</span> */}
          </div>
        )}
      </div>

      {/* Nav — sortable when reorderMode is on */}
      <nav className={styles.nav}>
        {reorderMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={navOrder} strategy={verticalListSortingStrategy}>
              {navOrder.map(id => (
                <SortableNavItem
                  key={id} id={id}
                  isActive={activeTab === id}
                  isCollapsed={sidebarCollapsed}
                  reorderMode={true}
                  onClick={tab => dispatch(setActiveTab(tab))}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          navOrder.map(id => (
            <SortableNavItem
              key={id} id={id}
              isActive={activeTab === id}
              isCollapsed={sidebarCollapsed}
              reorderMode={false}
              onClick={tab => dispatch(setActiveTab(tab))}
            />
          ))
        )}

        {/* Reorder mode hint banner inside nav */}
        {reorderMode && !sidebarCollapsed && (
          <div className={styles.reorderHint}>
            <IconGripVertical size={11} />
            <span>Drag tabs to reorder</span>
          </div>
        )}
      </nav>

      {/* Bottom area */}
      <div className={styles.bottom}>
        <div className={`${styles.reorderToggle} ${reorderMode ? styles.reorderActive : ''}`}>
          {sidebarCollapsed ? (
            <Tooltip label="Reorder Mode" position="right" offset={12}>
              <button className={styles.iconBtn} onClick={() => dispatch(toggleReorderMode())}>
                <IconMenuOrder size={16} />
              </button>
            </Tooltip>
          ) : (
            <>
              <div className={styles.reorderLabel}>
                <IconMenuOrder size={14} />
                <span>Reorder Interface</span>
              </div>
              <Switch
                size="xs"
                checked={reorderMode}
                onChange={() => dispatch(toggleReorderMode())}
                color="blue"
              />
            </>
          )}
        </div>

        <div className={styles.divider} />

        {/* Settings — pinned to the bottom of the sidebar as an expandable
            tree (Profile / Appearance / Notifications), not a routable page. */}
        <SettingsTree isCollapsed={sidebarCollapsed} />

        <div className={styles.divider} />

        <div className={styles.bottomActions}>
          <Tooltip label={sidebarCollapsed ? 'Expand' : 'Collapse'} position="right" offset={12}>
            <button
              className={`${styles.iconBtn} ${styles.collapseBtn}`}
              onClick={() => dispatch(toggleSidebar())}
            >
              {sidebarCollapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}

import { createSlice } from '@reduxjs/toolkit';

const DEFAULT_NAV_ORDER = ['dashboard', 'vehicles', 'drivers', 'driversOnline', 'trackPlayer', 'geofences', 'reports'];

// Persist theme preference across reloads
const storedTheme = localStorage.getItem('fv-theme') || 'dark';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: false,
    reorderMode: false,
    theme: storedTheme,
    activeTab: 'dashboard',
    navOrder: DEFAULT_NAV_ORDER,
    notifications: [],
    // Settings now lives as an expandable tree pinned to the bottom of the
    // sidebar, not a routable page — these two control that tree's UI state.
    settingsTreeOpen: false,
    settingsActiveSection: null, // 'profile' | 'appearance' | 'notifications' | null
  },
  reducers: {
    toggleSidebar(state) { state.sidebarCollapsed = !state.sidebarCollapsed; },
    setSidebarCollapsed(state, action) { state.sidebarCollapsed = action.payload; },
    toggleReorderMode(state) { state.reorderMode = !state.reorderMode; },
    setReorderMode(state, action) { state.reorderMode = action.payload; },
    setTheme(state, action) {
      state.theme = action.payload;
      localStorage.setItem('fv-theme', action.payload);
    },
    setActiveTab(state, action) { state.activeTab = action.payload; },
    setNavOrder(state, action) { state.navOrder = action.payload; },
    addNotification(state, action) {
      state.notifications.unshift({ id: Date.now(), ...action.payload });
      if (state.notifications.length > 50) state.notifications.pop();
    },
    removeNotification(state, action) {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications(state) { state.notifications = []; },
    toggleSettingsTree(state) {
      state.settingsTreeOpen = !state.settingsTreeOpen;
      if (!state.settingsTreeOpen) state.settingsActiveSection = null;
    },
    setSettingsTreeOpen(state, action) {
      state.settingsTreeOpen = action.payload;
      if (!action.payload) state.settingsActiveSection = null;
    },
    setSettingsSection(state, action) {
      // Clicking the same section again collapses it back to just the tree
      state.settingsActiveSection =
        state.settingsActiveSection === action.payload ? null : action.payload;
    },
  },
});

export const {
  toggleSidebar, setSidebarCollapsed, toggleReorderMode, setReorderMode,
  setTheme, setActiveTab, setNavOrder, addNotification, removeNotification, clearNotifications,
  toggleSettingsTree, setSettingsTreeOpen, setSettingsSection,
} = uiSlice.actions;
export default uiSlice.reducer;


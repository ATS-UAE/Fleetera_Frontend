import { createSlice } from '@reduxjs/toolkit';

const DEFAULT_NAV_ORDER = ['dashboard', 'vehicles', 'drivers', 'driversOnline', 'trackPlayer', 'geofences', 'reports'];

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: false,
    reorderMode: false,
    theme: 'dark',
    activeTab: 'dashboard',
    navOrder: DEFAULT_NAV_ORDER,
    notifications: [],
  },
  reducers: {
    toggleSidebar(state) { state.sidebarCollapsed = !state.sidebarCollapsed; },
    setSidebarCollapsed(state, action) { state.sidebarCollapsed = action.payload; },
    toggleReorderMode(state) { state.reorderMode = !state.reorderMode; },
    setReorderMode(state, action) { state.reorderMode = action.payload; },
    setTheme(state, action) { state.theme = action.payload; },
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
  },
});

export const {
  toggleSidebar, setSidebarCollapsed, toggleReorderMode, setReorderMode,
  setTheme, setActiveTab, setNavOrder, addNotification, removeNotification, clearNotifications
} = uiSlice.actions;
export default uiSlice.reducer;

import React from 'react';
import { useSelector } from 'react-redux';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import TopBar from '@/components/layout/TopBar/TopBar';
import DashboardPage from '@/features/dashboard/components/DashboardPage';
import VehiclesPage from '@/features/vehicles/components/VehiclesPage';
import DriversPage from '@/features/drivers/components/DriversPage';
import DriversOnlinePage from '@/features/driversOnline/components/DriversOnlinePage';
import TrackPlayerPage from '@/features/trackPlayer/components/TrackPlayerPage';
import GeofencesPage from '@/features/geofences/components/GeofencesPage';
import ReportsPage from '@/features/reports/components/ReportsPage';

const PAGES = {
  dashboard: DashboardPage,
  vehicles: VehiclesPage,
  drivers: DriversPage,
  driversOnline: DriversOnlinePage,
  trackPlayer: TrackPlayerPage,
  geofences: GeofencesPage,
  reports: ReportsPage,
};

export default function App() {
  const activeTab = useSelector(s => s.ui.activeTab);
  const ActivePage = PAGES[activeTab] || DashboardPage;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar />
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <ActivePage />
        </main>
      </div>
    </div>
  );
}

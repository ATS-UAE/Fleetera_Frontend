import React from 'react';
import { useSelector } from 'react-redux';
import { AreaChart, BarChart, DonutChart } from '@mantine/charts';
import { IconTruck, IconUsers, IconRoute, IconGasStation, IconAlertTriangle, IconShieldCheck, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { tripHistory, activityFeed, dashboardStats } from '@/data';
import styles from './DashboardPage.module.css';

function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statCardTop}>
        <div className={styles.statIcon} style={{ background: color + '15', borderColor: color + '40' }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend && (
          <div className={`${styles.trend} ${trend > 0 ? styles.trendUp : styles.trendDown}`}>
            {trend > 0 ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

const SEVERITY_COLORS = { info: '#3b82f6', warning: '#f59e0b', danger: '#ef4444', success: '#10b981' };

export default function DashboardPage() {
  const vehicles = useSelector(s => s.vehicles.items);
  const drivers = useSelector(s => s.drivers.items);

  const statusCounts = [
    { name: 'Moving', value: vehicles.filter(v => v.status === 'moving').length, color: '#10b981' },
    { name: 'Idle', value: vehicles.filter(v => v.status === 'idle').length, color: '#f59e0b' },
    { name: 'Stopped', value: vehicles.filter(v => v.status === 'stopped').length, color: '#6b7280' },
    { name: 'Offline', value: vehicles.filter(v => v.status === 'offline').length, color: '#374151' },
    { name: 'Maintenance', value: vehicles.filter(v => v.status === 'maintenance').length, color: '#8b5cf6' },
  ].filter(s => s.value > 0);

  return (
    <div className={styles.page}>
      {/* Top stat cards */}
      <div className={styles.statsRow}>
        <StatCard icon={IconTruck} label="Total Vehicles" value={vehicles.length} sub={`${vehicles.filter(v=>v.status==='moving').length} active now`} color="#3b82f6" trend={4.2} />
        <StatCard icon={IconUsers} label="Drivers Online" value={drivers.filter(d=>d.status!=='offline').length} sub={`of ${drivers.length} total`} color="#10b981" trend={2.1} />
        <StatCard icon={IconRoute} label="Distance Today" value={`${dashboardStats.totalDistance.toLocaleString()} km`} sub="across all vehicles" color="#06b6d4" trend={-1.4} />
        <StatCard icon={IconGasStation} label="Fuel Consumed" value={`${dashboardStats.fuelConsumed} L`} sub="this week" color="#f59e0b" trend={3.7} />
        <StatCard icon={IconAlertTriangle} label="Active Alerts" value={dashboardStats.alerts} sub="needs attention" color="#ef4444" />
        <StatCard icon={IconShieldCheck} label="Geofence Events" value={dashboardStats.geofenceEvents} sub="last 24 hours" color="#8b5cf6" />
      </div>

      <div className={styles.mainGrid}>
        {/* Trip history chart */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Weekly Distance & Trips</span>
            <span className={styles.cardSub}>Last 7 days</span>
          </div>
          <AreaChart
            h={260}
            data={tripHistory}
            dataKey="day"
            series={[
              { name: 'distance', color: 'blue.5', label: 'Distance (km)' },
              { name: 'fuel', color: 'cyan.4', label: 'Fuel (L)' },
            ]}
            curveType="monotone"
            withGradient
            gridAxis="xy"
            withLegend
            tickLine="none"
            strokeWidth={2}
            withDots={false}
          />
        </div>

        {/* Status donut */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Fleet Status</span>
            <span className={styles.cardSub}>Right now</span>
          </div>
          <div className={styles.donutWrap}>
            <DonutChart
              data={statusCounts}
              size={160}
              thickness={22}
              withLabelsLine
              withLabels
              paddingAngle={2}
            />
          </div>
          <div className={styles.legendGrid}>
            {statusCounts.map(s => (
              <div key={s.name} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: s.color }} />
                <span className={styles.legendLabel}>{s.name}</span>
                <span className={styles.legendValue}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trips bar chart */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Trips Completed</span>
            <span className={styles.cardSub}>This week</span>
          </div>
          <BarChart
            h={220}
            data={tripHistory}
            dataKey="day"
            series={[{ name: 'trips', color: 'violet.5' }]}
            tickLine="none"
            gridAxis="y"
            barProps={{ radius: 6 }}
          />
        </div>

        {/* Activity feed */}
        <div className={styles.activityCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Live Activity</span>
            <span className={styles.liveDot}><span className="status-dot moving" /> Live</span>
          </div>
          <div className={styles.activityList}>
            {activityFeed.map(a => (
              <div key={a.id} className={styles.activityItem}>
                <span className={styles.activityDot} style={{ background: SEVERITY_COLORS[a.severity] }} />
                <div className={styles.activityContent}>
                  <div className={styles.activityMain}>
                    <span className={styles.activityVehicle}>{a.vehicle}</span>
                    <span className={styles.activityDesc}>
                      {a.type === 'geofence_enter' && `entered ${a.zone}`}
                      {a.type === 'geofence_exit' && `exited ${a.zone}`}
                      {a.type === 'speed_alert' && `speeding — ${a.detail}`}
                      {a.type === 'fuel_low' && `low fuel — ${a.detail}`}
                      {a.type === 'ignition_on' && 'ignition turned on'}
                      {a.type === 'maintenance_due' && a.detail}
                    </span>
                  </div>
                  <span className={styles.activityTime}>{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

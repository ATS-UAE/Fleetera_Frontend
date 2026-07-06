import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Select, Button, Table, Badge, ActionIcon, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconFileAnalytics, IconDownload, IconPlus, IconTrash, IconRoute, IconGasStation, IconAlertTriangle, IconClock } from '@tabler/icons-react';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import type { DeleteConfirmItem } from '@/components/DeleteConfirmModal';
import styles from './ReportsPage.module.css';

const REPORT_TYPES = [
  { value: 'trip_summary', label: 'Trip Summary', icon: IconRoute, color: '#3b82f6' },
  { value: 'fuel_consumption', label: 'Fuel Consumption', icon: IconGasStation, color: '#10b981' },
  { value: 'driver_behavior', label: 'Driver Behavior', icon: IconAlertTriangle, color: '#f59e0b' },
  { value: 'idle_time', label: 'Idle Time Analysis', icon: IconClock, color: '#8b5cf6' },
];

export default function ReportsPage() {
  const vehicles = useSelector(s => s.vehicles.items);
  const drivers = useSelector(s => s.drivers.items);
  const [reportType, setReportType] = useState('trip_summary');
  const [vehicleId, setVehicleId] = useState(null);
  const [generated, setGenerated] = useState([
    { id: 1, type: 'trip_summary', name: 'Daily Trip Summary — All Vehicles', date: '2024-07-01', status: 'ready', size: '142 KB' },
    { id: 2, type: 'fuel_consumption', name: 'Weekly Fuel Report — TRK-001', date: '2024-06-28', status: 'ready', size: '88 KB' },
    { id: 3, type: 'driver_behavior', name: 'Monthly Driver Score Card', date: '2024-06-25', status: 'ready', size: '210 KB' },
  ]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; item: DeleteConfirmItem | null; id: number | null }>({ open: false, item: null, id: null });

  const handleGenerate = () => {
    const meta = REPORT_TYPES.find(r => r.value === reportType);
    const vehicleName = vehicles.find(v => v.id === vehicleId)?.name || 'All Vehicles';
    const newReport = {
      id: Date.now(),
      type: reportType,
      name: `${meta.label} — ${vehicleName}`,
      date: new Date().toISOString().slice(0, 10),
      status: 'ready',
      size: `${Math.floor(Math.random() * 200) + 50} KB`,
    };
    setGenerated([newReport, ...generated]);
    notifications.show({ title: 'Report generated', message: newReport.name, color: 'green' });
  };

  const requestDelete = (id) => {
    const report = generated.find(r => r.id === id);
    if (!report) return;
    const meta = REPORT_TYPES.find(t => t.value === report.type);
    setDeleteConfirm({
      open: true,
      item: { name: report.name, color: meta?.color, meta: `${meta?.label || report.type} · ${report.date} · ${report.size}` },
      id: report.id,
    });
  };

  const confirmDelete = () => {
    if (deleteConfirm.id == null) return;
    setGenerated(generated.filter(r => r.id !== deleteConfirm.id));
    notifications.show({ title: 'Report deleted', message: `"${deleteConfirm.item?.name}" has been removed`, color: 'red' });
    setDeleteConfirm({ open: false, item: null, id: null });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ open: false, item: null, id: null });
  };

  return (
    <>
    <div className={styles.page}>
      {/* Report type cards */}
      <div className={styles.typeGrid}>
        {REPORT_TYPES.map(t => {
          const Icon = t.icon;
          const isActive = reportType === t.value;
          return (
            <div
              key={t.value}
              className={`${styles.typeCard} ${isActive ? styles.typeActive : ''}`}
              onClick={() => setReportType(t.value)}
              style={isActive ? { borderColor: t.color, background: t.color + '12' } : {}}
            >
              <div className={styles.typeIcon} style={{ background: t.color + '15', borderColor: t.color + '40' }}>
                <Icon size={20} style={{ color: t.color }} />
              </div>
              <span className={styles.typeLabel}>{t.label}</span>
            </div>
          );
        })}
      </div>

      {/* Generator bar */}
      <div className={styles.generatorBar}>
        <Select
          placeholder="All vehicles"
          data={vehicles.map(v => ({ value: v.id, label: v.name }))}
          value={vehicleId}
          onChange={setVehicleId}
          size="sm"
          w={200}
          clearable
        />
        <input type="date" className={styles.dateInput} defaultValue="2024-06-01" />
        <span className={styles.dateSep}>to</span>
        <input type="date" className={styles.dateInput} defaultValue="2024-07-01" />
        <Button leftSection={<IconFileAnalytics size={15} />} onClick={handleGenerate} color="blue">
          Generate Report
        </Button>
      </div>

      {/* Reports table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <span>Generated Reports</span>
          <Badge variant="light" color="blue" size="sm">{generated.length} reports</Badge>
        </div>
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Report Name</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Size</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {generated.map(r => {
              const meta = REPORT_TYPES.find(t => t.value === r.type);
              return (
                <Table.Tr key={r.id}>
                  <Table.Td>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</span>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="dot" color={meta ? undefined : 'gray'} style={{ '--badge-dot-color': meta?.color }}>
                      {meta?.label}
                    </Badge>
                  </Table.Td>
                  <Table.Td className="fv-mono" style={{ fontSize: 12 }}>{r.date}</Table.Td>
                  <Table.Td className="fv-mono" style={{ fontSize: 12 }}>{r.size}</Table.Td>
                  <Table.Td><Badge color="green" variant="light" size="sm">Ready</Badge></Table.Td>
                  <Table.Td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <Tooltip label="Download">
                        <ActionIcon size="sm" variant="subtle" color="blue"><IconDownload size={14} /></ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete">
                        <ActionIcon size="sm" variant="subtle" color="red" onClick={() => requestDelete(r.id)}><IconTrash size={14} /></ActionIcon>
                      </Tooltip>
                    </div>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
        {generated.length === 0 && (
          <div className={styles.empty}>No reports generated yet</div>
        )}
      </div>
    </div>

    <DeleteConfirmModal
      opened={deleteConfirm.open}
      item={deleteConfirm.item}
      entityLabel="Report"
      onConfirm={confirmDelete}
      onCancel={cancelDelete}
    />
    </>
  );
}

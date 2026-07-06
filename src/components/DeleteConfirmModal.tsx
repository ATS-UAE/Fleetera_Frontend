import React from 'react';
import { Modal, Button } from '@mantine/core';
import { IconAlertTriangle, IconTrash } from '@tabler/icons-react';
import styles from './DeleteConfirmModal.module.css';

export interface DeleteConfirmItem {
  name: string;
  color?: string;
  /** Short info line, e.g. "circle · r: 500m" or "Toyota Hilux · ABC-1234" */
  meta?: string;
}

interface DeleteConfirmModalProps {
  opened: boolean;
  item: DeleteConfirmItem | null;
  /** Entity label shown in the title, e.g. "Geofence", "Vehicle", "Driver" */
  entityLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  opened, item, entityLabel, onConfirm, onCancel,
}: DeleteConfirmModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      centered
      size="sm"
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.6, blur: 4 }}
      zIndex={2100}
      styles={{
        content: {
          background: 'var(--fv-bg-panel)',
          border: '1px solid var(--fv-border-light)',
          borderRadius: 'var(--fv-r-lg)',
        },
        body: { padding: 0 },
      }}
    >
      <div className={styles.deleteModal}>
        <div className={styles.deleteModalIcon}>
          <IconAlertTriangle size={32} color="#ef4444" />
        </div>

        <div className={styles.deleteModalTitle}>
          Delete {entityLabel}?
        </div>

        <div className={styles.deleteModalText}>
          Are you sure you want to delete{' '}
          <strong style={{ color: item?.color || '#60a5fa' }}>
            "{item?.name}"
          </strong>
          ? This action cannot be undone.
        </div>

        {item?.meta && (
          <div className={styles.deleteModalInfo}>
            <span>{item.meta}</span>
          </div>
        )}

        <div className={styles.deleteModalActions}>
          <Button
            variant="default"
            size="sm"
            onClick={onCancel}
            styles={{
              root: {
                flex: 1,
                background: 'var(--fv-bg-card)',
                borderColor: 'var(--fv-border-light)',
                color: 'var(--fv-text-secondary)',
              },
            }}
          >
            No, Keep It
          </Button>
          <Button
            color="red"
            size="sm"
            onClick={onConfirm}
            leftSection={<IconTrash size={14} />}
            styles={{ root: { flex: 1 } }}
          >
            Yes, Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

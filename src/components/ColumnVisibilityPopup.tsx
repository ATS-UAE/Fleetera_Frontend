import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './ColumnVisibilityPopup.module.css';

interface Props {
  fieldName: string;
  description?: string;
  visible: boolean;
  anchorRect: DOMRect;
  onShow: () => void;
  onHide: () => void;
  onClose: () => void;
}

export default function ColumnVisibilityPopup({
  fieldName,
  description,
  visible,
  anchorRect,
  onShow,
  onHide,
  onClose,
}: Props) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Position the popup near the anchor element, keeping it on-screen
  const POPUP_W = 220;
  const POPUP_H = 110;
  const MARGIN = 8;

  let left = anchorRect.left;
  let top = anchorRect.bottom + MARGIN;

  // Flip left if near right edge
  if (left + POPUP_W > window.innerWidth - MARGIN) {
    left = anchorRect.right - POPUP_W;
  }
  // Flip above if near bottom edge
  if (top + POPUP_H > window.innerHeight - MARGIN) {
    top = anchorRect.top - POPUP_H - MARGIN;
  }

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleToggle = () => {
    if (visible) {
      onHide();
    } else {
      onShow();
    }
    onClose();
  };

  return createPortal(
    <>
      {/* Invisible full-screen overlay to detect outside clicks */}
      <div className={styles.overlay} onClick={onClose} onContextMenu={onClose} />

      <div
        ref={popupRef}
        className={styles.popup}
        style={{ left, top }}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.fieldLabel}>Field</div>
          <div className={styles.fieldName}>{fieldName}</div>
          {description && <div className={styles.desc}>{description}</div>}
        </div>

        {/* Toggle row */}
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Show column</span>
          <button
            role="switch"
            aria-checked={visible}
            className={`${styles.toggle} ${visible ? styles.toggleOn : ''}`}
            onClick={handleToggle}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

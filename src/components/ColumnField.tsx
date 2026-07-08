import React, { useRef, useState } from 'react';
import type { ColumnVisibilityState } from '@/types';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import ColumnVisibilityPopup from './ColumnVisibilityPopup';

interface ColumnFieldProps {
  /** Redux list key this field belongs to */
  list: keyof ColumnVisibilityState;
  /** Unique key for this field within the list */
  fieldKey: string;
  /** Human-readable name shown in the popup */
  fieldName: string;
  /** Optional description shown in the popup */
  description?: string;
  /** Whether reorder/interface-edit mode is currently active */
  reorderMode: boolean;
  /** The content to render when the field is visible */
  children: React.ReactNode;
  /** CSS class to apply to the wrapper — replaces the original container class */
  className?: string;
  style?: React.CSSProperties;
  /** Wrapper element tag (default 'div') */
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Wraps a list-card field.
 *
 * • Normal mode + visible   → renders children transparently (no interaction)
 * • Normal mode + hidden    → renders null (no space taken)
 * • Reorder mode + visible  → clicking the field opens the Show/Hide popup
 * • Reorder mode + hidden   → renders dimmed; clicking opens popup to re-show
 */
export default function ColumnField({
  list,
  fieldKey,
  fieldName,
  description,
  reorderMode,
  children,
  className,
  style,
  as: Tag = 'div',
}: ColumnFieldProps) {
  const { isVisible, setVisible } = useColumnVisibility(list);
  const visible = isVisible(fieldKey);

  const [popupOpen, setPopupOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const wrapperRef = useRef<HTMLElement>(null);

  // Hidden + not in reorder mode: take no space at all
  if (!visible && !reorderMode) return null;

  const handleClick = (e: React.MouseEvent) => {
    if (!reorderMode) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) { setAnchorRect(rect); setPopupOpen(true); }
  };

  return (
    // @ts-ignore — Tag is a valid intrinsic element
    <Tag
      ref={wrapperRef}
      className={className}
      style={{
        position: 'relative',
        opacity: !visible && reorderMode ? 0.35 : 1,
        transition: 'opacity 0.2s',
        cursor: reorderMode ? 'pointer' : undefined,
        outline: reorderMode && !popupOpen
          ? '1px dashed rgba(99,102,241,0.3)'
          : reorderMode && popupOpen
          ? '1px solid rgba(99,102,241,0.7)'
          : undefined,
        outlineOffset: '2px',
        borderRadius: '4px',
        ...style,
      }}
      onClick={handleClick}
      title={reorderMode ? `Click to show/hide "${fieldName}"` : undefined}
    >
      {children}

      {popupOpen && anchorRect && (
        <ColumnVisibilityPopup
          fieldName={fieldName}
          description={description}
          visible={visible}
          anchorRect={anchorRect}
          onShow={() => setVisible(fieldKey, true)}
          onHide={() => setVisible(fieldKey, false)}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </Tag>
  );
}

import { useSelector, useDispatch } from 'react-redux';
import type { RootState, ColumnVisibilityState } from '@/types';
import { setColumnVisible } from '@/store/slices/columnVisibilitySlice';

/**
 * Hook for reading and toggling per-list column visibility.
 *
 * Usage:
 *   const { isVisible, setVisible } = useColumnVisibility('vehicles');
 *   if (!isVisible('fuelMeta')) return null;
 *   setVisible('fuelMeta', false);
 */
export function useColumnVisibility(list: keyof ColumnVisibilityState) {
  const dispatch = useDispatch();
  const columns = useSelector((s: RootState) => s.columnVisibility[list]);

  const isVisible = (key: string): boolean => columns[key] !== false;

  const setVisible = (key: string, visible: boolean) => {
    dispatch(setColumnVisible({ list, key, visible }));
  };

  return { isVisible, setVisible };
}

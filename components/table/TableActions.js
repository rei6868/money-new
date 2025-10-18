import { createPortal } from 'react-dom';
import { useCallback, useRef } from 'react';

import {
  ACTION_MENU_MIN_WIDTH,
  useGlobalEscape,
  useIsMounted,
  usePortalPosition,
} from './tableUtils';

export function useActionMenuRegistry() {
  const triggerRefs = useRef(new Map());
  const menuRefs = useRef(new Map());

  const registerTrigger = useCallback((rowId) => (node) => {
    if (node) {
      triggerRefs.current.set(rowId, node);
    } else {
      triggerRefs.current.delete(rowId);
    }
  }, []);

  const registerMenu = useCallback((rowId) => (node) => {
    if (node) {
      menuRefs.current.set(rowId, node);
    } else {
      menuRefs.current.delete(rowId);
    }
  }, []);

  const getTrigger = useCallback((rowId) => triggerRefs.current.get(rowId) ?? null, []);
  const getMenu = useCallback((rowId) => menuRefs.current.get(rowId) ?? null, []);

  return {
    registerTrigger,
    registerMenu,
    getTrigger,
    getMenu,
    triggerRefs,
    menuRefs,
  };
}

export function TableActionMenuPortal({
  rowId,
  anchor,
  isOpen,
  onClose,
  children,
  registerContent,
  containerProps = {},
  className,
  dataTestId,
}) {
  const isMounted = useIsMounted();
  const position = usePortalPosition({
    anchor,
    isOpen,
    minWidth: ACTION_MENU_MIN_WIDTH,
    verticalOffset: 6,
  });

  useGlobalEscape(onClose, isOpen);

  if (!isMounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      ref={registerContent?.(rowId)}
      className={className ?? 'table-action-menu'}
      role="menu"
      style={{
        top: position.top,
        left: position.left,
        minWidth: `${ACTION_MENU_MIN_WIDTH}px`,
      }}
      data-testid={dataTestId ?? `table-action-menu-${rowId}`}
      {...containerProps}
    >
      {children}
    </div>,
    document.body,
  );
}

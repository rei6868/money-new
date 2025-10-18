import { createPortal } from 'react-dom';
import { useCallback, useMemo, useRef } from 'react';

import {
  QUICK_FILTER_MIN_WIDTH,
  useGlobalEscape,
  useIsMounted,
  usePortalPosition,
} from './tableUtils';

export function useQuickFilterRegistry() {
  const registryRef = useRef(new Map());

  const registerAnchor = useCallback((columnId) => (node) => {
    if (node) {
      registryRef.current.set(columnId, {
        ...(registryRef.current.get(columnId) ?? {}),
        anchor: node,
      });
    } else {
      const current = registryRef.current.get(columnId);
      if (current?.content) {
        registryRef.current.set(columnId, { content: current.content });
      } else {
        registryRef.current.delete(columnId);
      }
    }
  }, []);

  const registerContent = useCallback((columnId) => (node) => {
    if (node) {
      registryRef.current.set(columnId, {
        ...(registryRef.current.get(columnId) ?? {}),
        content: node,
      });
    } else {
      const current = registryRef.current.get(columnId);
      if (current?.anchor) {
        registryRef.current.set(columnId, { anchor: current.anchor });
      } else {
        registryRef.current.delete(columnId);
      }
    }
  }, []);

  const getAnchor = useCallback(
    (columnId) => registryRef.current.get(columnId)?.anchor ?? null,
    [],
  );

  const getContent = useCallback(
    (columnId) => registryRef.current.get(columnId)?.content ?? null,
    [],
  );

  const entries = useMemo(() => registryRef.current, []);

  return { registerAnchor, registerContent, getAnchor, getContent, entries };
}

export function TableQuickFilterPopover({
  columnId,
  anchor,
  isOpen,
  onClose,
  children,
  registerContent,
  ariaLabel,
  className,
  dataTestId,
}) {
  const isMounted = useIsMounted();
  const position = usePortalPosition({
    anchor,
    isOpen,
    minWidth: QUICK_FILTER_MIN_WIDTH,
    preferredWidth: anchor?.offsetWidth ?? QUICK_FILTER_MIN_WIDTH,
    verticalOffset: 8,
  });

  useGlobalEscape(onClose, isOpen);

  if (!isMounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      ref={registerContent?.(columnId)}
      className={className ?? 'table-quick-filter-popover'}
      role="dialog"
      aria-label={ariaLabel ?? `${columnId} quick filter`}
      style={{
        top: position.top,
        left: position.left,
        minWidth: `${position.width}px`,
      }}
      data-testid={dataTestId ?? `table-quick-filter-${columnId}-popover`}
    >
      {children}
    </div>,
    document.body,
  );
}

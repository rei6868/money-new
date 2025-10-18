import { createPortal } from 'react-dom';
import { useMemo } from 'react';

import { useIsMounted } from './tableUtils';

export function TableTooltip({ anchor, isVisible, children, className = 'table-tooltip', offset = { x: 0, y: 0 } }) {
  const isMounted = useIsMounted();

  const position = useMemo(() => {
    if (!anchor) {
      return { top: 0, left: 0 };
    }
    const rect = anchor.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    return {
      top: rect.top + scrollY + (offset.y ?? 0),
      left: rect.left + scrollX + rect.width / 2 + (offset.x ?? 0),
    };
  }, [anchor, offset.x, offset.y]);

  if (!isMounted || !isVisible) {
    return null;
  }

  return createPortal(
    <div
      className={className}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
      }}
      role="tooltip"
    >
      {children}
    </div>,
    document.body,
  );
}

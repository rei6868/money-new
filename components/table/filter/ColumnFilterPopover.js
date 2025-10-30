import { useEffect, useMemo, useRef } from 'react';
import { FiX } from 'react-icons/fi';

import styles from '../../../styles/TransactionsHistory.module.css';
import {
  FilterAmountRow,
  FilterDateRow,
  FilterDropdownMultiSearchRow,
  FilterDropdownSearchRow,
  FilterTextRow,
} from './FilterRowComponents';

const DEFAULT_RECT = {
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
};

const EMPTY_MAP = new Map();

function renderContent(descriptor) {
  if (!descriptor) {
    return null;
  }

  const { type, props = {} } = descriptor;

  switch (type) {
    case 'dropdown-search':
      return <FilterDropdownSearchRow {...props} />;
    case 'dropdown-multi-search':
      return <FilterDropdownMultiSearchRow {...props} />;
    case 'amount':
      return <FilterAmountRow {...props} />;
    case 'date':
      return <FilterDateRow {...props} />;
    case 'text':
      return <FilterTextRow {...props} />;
    default:
      return null;
  }
}

export function ColumnFilterPopover({ activeFilter, contentMap = EMPTY_MAP, onRequestClose }) {
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!activeFilter) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      const target = event.target;
      if (popoverRef.current && target instanceof Node) {
        if (!popoverRef.current.contains(target)) {
          onRequestClose?.();
        }
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onRequestClose?.();
      }
    };

    const handleResize = () => {
      onRequestClose?.();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeFilter, onRequestClose]);

  const descriptor = useMemo(() => {
    if (!activeFilter) {
      return null;
    }
    return (contentMap instanceof Map ? contentMap : EMPTY_MAP).get(activeFilter.key) ?? null;
  }, [activeFilter, contentMap]);

  if (!activeFilter) {
    return null;
  }

  const rect = activeFilter.rect ?? DEFAULT_RECT;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const popoverWidth = Math.min(360, viewportWidth > 0 ? viewportWidth - 32 : 360);
  const halfWidth = popoverWidth / 2;
  const centerX = rect.left + rect.width / 2;
  const clampedLeft = viewportWidth
    ? Math.min(Math.max(centerX, 16 + halfWidth), viewportWidth - 16 - halfWidth)
    : centerX;
  const top = Math.max(rect.bottom + 8, 16);

  return (
    <div
      ref={popoverRef}
      className={styles.columnFilterPopover}
      style={{ top: `${top}px`, left: `${clampedLeft}px` }}
      role="dialog"
      aria-modal="false"
      aria-label={`Filter ${activeFilter.label}`}
      data-filter-key={activeFilter.key}
    >
      <div className={styles.columnFilterHeader}>
        <span className={styles.columnFilterTitle}>{activeFilter.label}</span>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.columnFilterClose}`.trim()}
          onClick={() => onRequestClose?.()}
          aria-label={`Close ${activeFilter.label} filter`}
        >
          <FiX aria-hidden />
        </button>
      </div>
      <div className={styles.columnFilterBody}>{renderContent(descriptor)}</div>
    </div>
  );
}

export default ColumnFilterPopover;

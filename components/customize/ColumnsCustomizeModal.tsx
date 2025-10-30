import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Reorder } from 'framer-motion';
import { FiEye, FiEyeOff, FiLock, FiX } from 'react-icons/fi';

import styles from '../../styles/CustomizeColumnsModal.module.css';

export type ColumnPinPosition = 'left' | 'right' | null;

export type ColumnConfig = {
  id: string;
  label: string;
  visible: boolean;
  pinned?: ColumnPinPosition;
  locked?: boolean;
  mandatory?: boolean;
  width?: number;
  minWidth?: number;
};

type ActiveResize = {
  id: string;
  startX: number;
  startWidth: number;
  minWidth: number;
  pointerId: number;
};

export type ColumnsCustomizeModalProps = {
  context: 'transactions' | 'accounts';
  open: boolean;
  columns: ColumnConfig[];
  defaultColumns: ColumnConfig[];
  onClose: () => void;
  onChange: (columns: ColumnConfig[]) => void;
};

function normalizeColumns(context: ColumnsCustomizeModalProps['context'], columns: ColumnConfig[]) {
  return columns.map((column) => {
    const isAccountName = context === 'accounts' && column.id === 'accountName';
    const mandatory = Boolean(column.mandatory || isAccountName);
    const minWidth = typeof column.minWidth === 'number' ? column.minWidth : 120;
    const width = Math.max(minWidth, Math.round(column.width ?? minWidth));
    return {
      ...column,
      pinned: column.pinned ?? null,
      visible: mandatory ? true : column.visible !== false,
      locked: column.locked || mandatory,
      mandatory,
      minWidth,
      width,
    };
  });
}

export function ColumnsCustomizeModal({
  context,
  open,
  columns,
  defaultColumns,
  onClose,
  onChange,
}: ColumnsCustomizeModalProps) {
  const [draftColumns, setDraftColumns] = useState<ColumnConfig[]>(() => normalizeColumns(context, columns));
  const [activeResize, setActiveResize] = useState<ActiveResize | null>(null);

  useEffect(() => {
    if (open) {
      setDraftColumns(normalizeColumns(context, columns));
    }
  }, [open, columns, context]);

  const modalTitle = useMemo(
    () => (context === 'accounts' ? 'Customize account columns' : 'Customize transaction columns'),
    [context],
  );

  const emitChange = (nextColumns: ColumnConfig[]) => {
    setDraftColumns(nextColumns);
    onChange(normalizeColumns(context, nextColumns));
  };

  const updateColumnWidth = useCallback(
    (id: string, width: number) => {
      setDraftColumns((prev) => {
        const next = prev.map((column) =>
          column.id === id
            ? { ...column, width: Math.max(column.minWidth ?? 120, Math.round(width)) }
            : column,
        );
        onChange(normalizeColumns(context, next));
        return next;
      });
    },
    [context, onChange],
  );

  const handleToggleVisibility = (id: string) => {
    const next = draftColumns.map((column) => {
      if (column.id !== id) {
        return column;
      }
      if (column.locked) {
        return column;
      }
      return { ...column, visible: !column.visible };
    });
    emitChange(next);
  };

  const handleReorder = (nextOrder: ColumnConfig[]) => {
    emitChange(nextOrder);
  };

  const handleSelectAll = () => {
    const next = draftColumns.map((column) =>
      column.locked ? column : { ...column, visible: true },
    );
    emitChange(next);
  };

  const handleReset = () => {
    const next = normalizeColumns(context, defaultColumns);
    emitChange(next);
  };

  const handleResizeStart = useCallback(
    (id: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
      const column = draftColumns.find((item) => item.id === id);
      if (!column) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      setActiveResize({
        id,
        startX: event.clientX,
        startWidth: column.width ?? column.minWidth ?? 120,
        minWidth: column.minWidth ?? 120,
        pointerId: event.pointerId,
      });
    },
    [draftColumns],
  );

  useEffect(() => {
    if (!activeResize) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activeResize.pointerId) {
        return;
      }
      const delta = event.clientX - activeResize.startX;
      const nextWidth = Math.max(activeResize.minWidth, activeResize.startWidth + delta);
      updateColumnWidth(activeResize.id, nextWidth);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activeResize.pointerId) {
        return;
      }
      setActiveResize(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeResize, updateColumnWidth]);

  return (
    <Transition show={open} as={Fragment} appear>
      <Dialog as="div" className={styles.root} onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter={styles.backdropEnter}
          enterFrom={styles.backdropEnterFrom}
          enterTo={styles.backdropEnterTo}
          leave={styles.backdropLeave}
          leaveFrom={styles.backdropLeaveFrom}
          leaveTo={styles.backdropLeaveTo}
        >
          <div className={styles.backdrop} aria-hidden="true" />
        </Transition.Child>

        <div className={styles.wrapper}>
          <Transition.Child
            as={Fragment}
            enter={styles.panelEnter}
            enterFrom={styles.panelEnterFrom}
            enterTo={styles.panelEnterTo}
            leave={styles.panelLeave}
            leaveFrom={styles.panelLeaveFrom}
            leaveTo={styles.panelLeaveTo}
          >
            <Dialog.Panel className={styles.panel}>
              <header className={styles.header}>
                <div>
                  <Dialog.Title className={styles.title}>{modalTitle}</Dialog.Title>
                  <p className={styles.subtitle}>Drag to reorder and toggle visibility. Mandatory columns stay visible.</p>
                </div>
                <div className={styles.headerButtons}>
                  <button type="button" onClick={handleSelectAll} className={styles.headerButton}>
                    Show all
                  </button>
                  <button type="button" onClick={handleReset} className={styles.headerButton}>
                    Reset
                  </button>
                  <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Close customize modal">
                    <FiX aria-hidden />
                  </button>
                </div>
              </header>

              <Reorder.Group axis="y" values={draftColumns} onReorder={handleReorder} className={styles.columnList}>
                {draftColumns.map((column) => (
                  <Reorder.Item
                    key={column.id}
                    value={column}
                    className={styles.columnItem}
                    data-resizing={activeResize?.id === column.id ? 'true' : undefined}
                    dragListener={!column.locked}
                    aria-disabled={column.locked ? 'true' : undefined}
                  >
                    <span className={styles.columnDragHandle} aria-hidden>
                      ⠿
                    </span>
                    <div className={styles.columnChipBody}>
                      <div className={styles.columnMeta}>
                        <span className={styles.columnLabel}>{column.label}</span>
                        {column.locked ? <span className={styles.columnHint}>Locked</span> : null}
                      </div>
                      <div className={styles.columnControls}>
                        <div className={styles.columnWidthControl}>
                          <span className={styles.columnWidthValue} aria-live={activeResize?.id === column.id ? 'polite' : 'off'}>
                            {Math.round(column.width ?? column.minWidth ?? 0)}px
                          </span>
                          <button
                            type="button"
                            className={styles.columnResizeHandle}
                            onPointerDown={handleResizeStart(column.id)}
                            aria-label={`Resize ${column.label}`}
                            data-active={activeResize?.id === column.id ? 'true' : undefined}
                          >
                            <span aria-hidden className={styles.columnResizeGrip} />
                          </button>
                        </div>
                        {column.locked ? (
                          <span className={styles.lockBadge}>
                            <FiLock aria-hidden />
                            Mandatory
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={styles.columnControlButton}
                            onClick={() => handleToggleVisibility(column.id)}
                            aria-label={`${column.visible ? 'Hide' : 'Show'} ${column.label}`}
                          >
                            {column.visible ? <FiEye aria-hidden /> : <FiEyeOff aria-hidden />}
                          </button>
                        )}
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

export default ColumnsCustomizeModal;

import { Fragment, useEffect, useMemo, useState } from 'react';
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

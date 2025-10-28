import { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Reorder } from 'framer-motion';
import {
  FiChevronsLeft,
  FiChevronsRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiX,
} from 'react-icons/fi';

import styles from '../../styles/CustomizeColumnsModal.module.css';

export type ColumnPinPosition = 'left' | 'right' | null;

export type ColumnConfig = {
  id: string;
  label: string;
  visible: boolean;
  pinned?: ColumnPinPosition;
  locked?: boolean;
};

export type CustomizeColumnsModalProps = {
  context: 'transactions' | 'accounts';
  open: boolean;
  columns: ColumnConfig[];
  defaultColumns: ColumnConfig[];
  onClose: () => void;
  onChange: (columns: ColumnConfig[]) => void;
};

function normalizeColumns(columns: ColumnConfig[]) {
  return columns.map((column) => ({
    ...column,
    pinned: column.pinned ?? null,
    visible: column.visible !== false,
    locked: column.locked ?? false,
  }));
}

export function CustomizeColumnsModal({
  context,
  open,
  columns,
  defaultColumns,
  onClose,
  onChange,
}: CustomizeColumnsModalProps) {
  const [draftColumns, setDraftColumns] = useState<ColumnConfig[]>(() => normalizeColumns(columns));

  useEffect(() => {
    if (open) {
      setDraftColumns(normalizeColumns(columns));
    }
  }, [open, columns]);

  const modalTitle = useMemo(
    () => (context === 'accounts' ? 'Customize account columns' : 'Customize transaction columns'),
    [context],
  );

  const emitChange = (nextColumns: ColumnConfig[]) => {
    setDraftColumns(nextColumns);
    onChange(normalizeColumns(nextColumns));
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

  const handlePin = (id: string, position: ColumnPinPosition) => {
    const next = draftColumns.map((column) => {
      if (column.id !== id) {
        return column;
      }
      const nextPinned = column.pinned === position ? null : position;
      return { ...column, pinned: nextPinned };
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
    const next = normalizeColumns(defaultColumns);
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
                  <p className={styles.subtitle}>Drag to reorder, pin columns, or toggle visibility in real time.</p>
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
                  <Reorder.Item key={column.id} value={column} className={styles.columnItem}>
                    <div className={styles.columnLabelGroup}>
                      <span className={styles.columnDragHandle} aria-hidden>
                        ⠿
                      </span>
                      <div className={styles.columnMeta}>
                        <span className={styles.columnLabel}>{column.label}</span>
                        {column.locked ? <span className={styles.columnHint}>Locked</span> : null}
                      </div>
                    </div>
                    <div className={styles.columnActions}>
                      <button
                        type="button"
                        className={styles.columnActionButton}
                        onClick={() => handlePin(column.id, 'left')}
                        aria-pressed={column.pinned === 'left'}
                        aria-label={`Pin ${column.label} to the left`}
                      >
                        <FiChevronsLeft aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={styles.columnActionButton}
                        onClick={() => handlePin(column.id, 'right')}
                        aria-pressed={column.pinned === 'right'}
                        aria-label={`Pin ${column.label} to the right`}
                      >
                        <FiChevronsRight aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={styles.columnActionButton}
                        onClick={() => handleToggleVisibility(column.id)}
                        aria-label={`${column.visible ? 'Hide' : 'Show'} ${column.label}`}
                        disabled={column.locked}
                      >
                        {column.locked ? <FiLock aria-hidden /> : column.visible ? <FiEye aria-hidden /> : <FiEyeOff aria-hidden />}
                      </button>
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

export default CustomizeColumnsModal;

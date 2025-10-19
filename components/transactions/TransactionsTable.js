import { useCallback, useMemo, useState } from 'react';

import styles from '../../styles/TransactionsHistory.module.css';
import { TableBase } from '../table';

const FONT_SCALE_DEFAULT = 1;
const FONT_SCALE_MIN = 0.8;
const FONT_SCALE_MAX = 1.4;
const FONT_SCALE_STEP = 0.1;

function normalizeFontScale(value) {
  const rounded = Math.round(value * 100) / 100;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, rounded));
}

function usePaginationRenderer(pagination, fontScaleState) {
  return useMemo(() => {
    if (!pagination) {
      return null;
    }
    if (!fontScaleState) {
      return {
        render: () => null,
      };
    }

    const { fontScale, onIncrease, onDecrease, onReset } = fontScaleState;
    const canIncrease = fontScale < FONT_SCALE_MAX - 1e-6;
    const canDecrease = fontScale > FONT_SCALE_MIN + 1e-6;
    const isDefault = Math.abs(fontScale - FONT_SCALE_DEFAULT) < 1e-6;
    const formattedScale = `${Math.round(fontScale * 100)}%`;

    return {
      render: () => (
        <>
          <div className={styles.pageSizeGroup}>
            <label htmlFor="transactions-page-size">Rows per page</label>
            <select
              id="transactions-page-size"
              className={styles.pageSizeSelect}
              value={pagination.pageSize}
              onChange={(event) => pagination.onPageSizeChange(Number(event.target.value))}
            >
              {pagination.pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.fontScaleGroup} role="group" aria-label="Table font size controls">
            <span className={styles.fontScaleLabel}>Font size</span>
            <button
              type="button"
              className={styles.fontScaleButton}
              onClick={onDecrease}
              disabled={!canDecrease}
              aria-label="Decrease table font size"
            >
              −
            </button>
            <span className={styles.fontScaleValue} aria-live="polite">
              {formattedScale}
            </span>
            <button
              type="button"
              className={styles.fontScaleButton}
              onClick={onIncrease}
              disabled={!canIncrease}
              aria-label="Increase table font size"
            >
              +
            </button>
            <button
              type="button"
              className={`${styles.fontScaleButton} ${styles.fontScaleReset}`.trim()}
              onClick={onReset}
              disabled={isDefault}
              aria-label="Reset table font size"
            >
              Reset
            </button>
          </div>
          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.paginationButton}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              aria-label="Previous page"
            >
              Prev
            </button>
            <span className={styles.paginationStatus}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              type="button"
              className={styles.paginationButton}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </>
      ),
    };
  }, [pagination, fontScaleState]);
}

export function TransactionsTable(props) {
  const {
    transactions,
    selectedIds,
    onSelectRow,
    onSelectAll,
    selectionSummary,
    onOpenAdvanced,
    columnDefinitions,
    allColumns,
    visibleColumns,
    pagination,
    isColumnReorderMode = false,
    onColumnVisibilityChange,
    onColumnOrderChange,
  } = props;

  const [fontScale, setFontScale] = useState(FONT_SCALE_DEFAULT);

  const applyFontScale = useCallback((next) => {
    setFontScale((current) => {
      const target = typeof next === 'function' ? next(current) : next;
      return normalizeFontScale(target);
    });
  }, []);

  const handleIncreaseFont = useCallback(() => {
    applyFontScale((current) => current + FONT_SCALE_STEP);
  }, [applyFontScale]);

  const handleDecreaseFont = useCallback(() => {
    applyFontScale((current) => current - FONT_SCALE_STEP);
  }, [applyFontScale]);

  const handleResetFont = useCallback(() => {
    applyFontScale(FONT_SCALE_DEFAULT);
  }, [applyFontScale]);

  const paginationRenderer = usePaginationRenderer(pagination, {
    fontScale,
    onIncrease: handleIncreaseFont,
    onDecrease: handleDecreaseFont,
    onReset: handleResetFont,
  });

  return (
    <TableBase
      transactions={transactions}
      selectedIds={selectedIds}
      onSelectRow={onSelectRow}
      onSelectAll={onSelectAll}
      selectionSummary={selectionSummary}
      onOpenAdvanced={onOpenAdvanced}
      columnDefinitions={columnDefinitions}
      allColumns={allColumns}
      visibleColumns={visibleColumns}
      pagination={paginationRenderer}
      isColumnReorderMode={isColumnReorderMode}
      onColumnVisibilityChange={onColumnVisibilityChange}
      onColumnOrderChange={onColumnOrderChange}
      fontScale={fontScale}
    />
  );
}

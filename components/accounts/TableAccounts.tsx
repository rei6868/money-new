import React, { useCallback, useMemo, useState } from 'react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiMinus,
  FiPlus,
  FiRefreshCw,
} from 'react-icons/fi';

import { AccountColumnDefinition, AccountRow } from './accountColumns';
import AccountsQuickActions from './AccountsQuickActions';
import styles from '../../styles/accounts.module.css';
import { TableBase } from '../table';
import tableStyles from '../table/TableBase.module.css';
import { ACTIONS_COLUMN_WIDTH } from '../table/tableUtils';

const FONT_SCALE_DEFAULT = 1;
const FONT_SCALE_MIN = 0.85;
const FONT_SCALE_MAX = 1.35;
const FONT_SCALE_STEP = 0.1;

type PaginationConfig = {
  pageSize: number;
  pageSizeOptions: number[];
  currentPage: number;
  totalPages: number;
  onPageSizeChange: (value: number) => void;
  onPageChange: (page: number) => void;
};

type ColumnState = {
  id: string;
  width: number;
  visible: boolean;
  order: number;
  optional?: boolean;
};

export type TableAccountsProps = {
  tableScrollRef?: React.MutableRefObject<HTMLDivElement | null>;
  accounts: AccountRow[];
  selectedIds: string[];
  onSelectRow: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  selectionSummary: {
    count: number;
    amount: number;
    totalBack?: number;
    finalPrice?: number;
  };
  pagination: PaginationConfig;
  columnDefinitions: AccountColumnDefinition[];
  allColumns: ColumnState[];
  visibleColumns: ColumnState[];
  isColumnReorderMode?: boolean;
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void;
  onColumnOrderChange: (orderedIds: string[]) => void;
  sortState: { columnId: string | null; direction: 'asc' | 'desc' | null };
  onSortChange: (columnId: string | null, direction: 'asc' | 'desc' | null) => void;
  isFetching?: boolean;
  isShowingSelectedOnly?: boolean;
  onQuickAction?: (actionId: string, account: AccountRow) => void;
};

type FontScaleState = {
  fontScale: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onReset: () => void;
};

function normalizeFontScale(value: number) {
  const clamped = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, value));
  return Math.round(clamped * 100) / 100;
}

function usePaginationRenderer(
  pagination: PaginationConfig,
  fontState: FontScaleState,
) {
  return useMemo(() => {
    const { fontScale, onIncrease, onDecrease, onReset } = fontState;
    const canIncrease = fontScale < FONT_SCALE_MAX - 0.001;
    const canDecrease = fontScale > FONT_SCALE_MIN + 0.001;
    const isDefault = Math.abs(fontScale - FONT_SCALE_DEFAULT) < 0.001;
    const formattedScale = `${Math.round(fontScale * 100)}%`;

    return {
      render: (props: { selectedCount: number }) => (
        <>
          {props.selectedCount > 0 ? (
            <span className={styles.selectionCount}>{props.selectedCount} selected</span>
          ) : null}
          <div
            className={styles.paginationControls}
            role="group"
            aria-label="Accounts table pagination"
          >
            <button
              type="button"
              className={styles.paginationButton}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              aria-label="Previous page"
            >
              <FiChevronLeft aria-hidden />
              <span className={styles.paginationButtonText}>Prev</span>
            </button>
            <button
              type="button"
              className={styles.fontScaleButton}
              onClick={onDecrease}
              disabled={!canDecrease}
              aria-label="Decrease table font size"
            >
              <FiMinus aria-hidden />
              <span className={styles.fontScaleButtonText}>-</span>
            </button>
            <div className={styles.pageSizeGroup}>
              <label htmlFor="accounts-page-size">Rows per page</label>
              <select
                id="accounts-page-size"
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
            <button
              type="button"
              className={`${styles.fontScaleButton} ${styles.fontScaleReset}`.trim()}
              onClick={onReset}
              disabled={isDefault}
              aria-label="Reset table font size"
            >
              <FiRefreshCw aria-hidden />
              <span className={styles.fontScaleButtonText}>Reset</span>
            </button>
            <button
              type="button"
              className={styles.fontScaleButton}
              onClick={onIncrease}
              disabled={!canIncrease}
              aria-label="Increase table font size"
            >
              <FiPlus aria-hidden />
              <span className={styles.fontScaleButtonText}>+</span>
            </button>
            <button
              type="button"
              className={styles.paginationButton}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              aria-label="Next page"
            >
              <FiChevronRight aria-hidden />
              <span className={styles.paginationButtonText}>Next</span>
            </button>
          </div>
          <div className={styles.paginationMeta}>
            <div className={styles.fontScaleMeta}>
              <span className={styles.fontScaleLabel}>Font size</span>
              <span className={styles.fontScaleValue} aria-live="polite">
                {formattedScale}
              </span>
            </div>
            <span className={styles.paginationStatus}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
          </div>
        </>
      ),
    };
  }, [fontState, pagination]);
}

export function TableAccounts({
  tableScrollRef,
  accounts,
  selectedIds,
  onSelectRow,
  onSelectAll,
  selectionSummary,
  pagination,
  columnDefinitions,
  allColumns,
  visibleColumns,
  isColumnReorderMode = false,
  onColumnVisibilityChange,
  onColumnOrderChange,
  sortState,
  onSortChange,
  isFetching = false,
  isShowingSelectedOnly = false,
  onQuickAction,
}: TableAccountsProps) {
  const [fontScale, setFontScale] = useState(FONT_SCALE_DEFAULT);

  const applyFontScale = useCallback((updater: number | ((value: number) => number)) => {
    setFontScale((current) => {
      const nextValue = typeof updater === 'function' ? updater(current) : updater;
      return normalizeFontScale(nextValue);
    });
  }, []);

  const paginationRenderer = usePaginationRenderer(pagination, {
    fontScale,
    onDecrease: () => applyFontScale((value) => value - FONT_SCALE_STEP),
    onIncrease: () => applyFontScale((value) => value + FONT_SCALE_STEP),
    onReset: () => applyFontScale(FONT_SCALE_DEFAULT),
  });

  const renderRowActionsCell = useCallback(
    ({ transaction }: { transaction: AccountRow }) => (
      <td
        className={`${tableStyles.bodyCell} ${tableStyles.actionsCell}`}
        style={{
          minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
          width: `${ACTIONS_COLUMN_WIDTH}px`,
        }}
      >
        <AccountsQuickActions
          account={transaction}
          onAction={onQuickAction}
          className={styles.tableQuickActions}
          buttonClassName={styles.tableQuickActionButton}
        />
      </td>
    ),
    [onQuickAction],
  );

  return (
    <TableBase
      tableScrollRef={tableScrollRef}
      transactions={accounts}
      selectedIds={selectedIds}
      onSelectRow={onSelectRow}
      onSelectAll={onSelectAll}
      selectionSummary={selectionSummary}
      columnDefinitions={columnDefinitions}
      allColumns={allColumns}
      visibleColumns={visibleColumns}
      pagination={paginationRenderer}
      isColumnReorderMode={isColumnReorderMode}
      onColumnVisibilityChange={onColumnVisibilityChange}
      onColumnOrderChange={onColumnOrderChange}
      fontScale={fontScale}
      sortState={sortState}
      onSortChange={onSortChange}
      isShowingSelectedOnly={isShowingSelectedOnly}
      isFetching={isFetching}
      rowIdAccessor={(account) => account.accountId}
      renderRowActionsCell={renderRowActionsCell}
    />
  );
}

export default TableAccounts;

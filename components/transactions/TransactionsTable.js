import { useMemo } from 'react';

import styles from '../../styles/TransactionsHistory.module.css';
import { TableBase } from '../table';

function usePaginationRenderer(pagination) {
  return useMemo(() => {
    if (!pagination) {
      return null;
    }
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
  }, [pagination]);
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
    visibleColumns,
    pagination,
    sortState,
    onSortChange,
    quickFilters,
    quickFilterOptions,
    onQuickFilterChange,
    onQuickFilterToggle,
    onQuickFilterSearch,
  } = props;

  const paginationRenderer = usePaginationRenderer(pagination);

  return (
    <TableBase
      transactions={transactions}
      selectedIds={selectedIds}
      onSelectRow={onSelectRow}
      onSelectAll={onSelectAll}
      selectionSummary={selectionSummary}
      onOpenAdvanced={onOpenAdvanced}
      columnDefinitions={columnDefinitions}
      visibleColumns={visibleColumns}
      pagination={paginationRenderer}
      sortState={sortState}
      onSortChange={(columnId, options) => onSortChange?.(columnId, options)}
      quickFilters={quickFilters}
      quickFilterOptions={quickFilterOptions}
      onQuickFilterChange={onQuickFilterChange}
      onQuickFilterToggle={onQuickFilterToggle}
      onQuickFilterSearch={onQuickFilterSearch}
    />
  );
}

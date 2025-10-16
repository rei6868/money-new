import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiChevronDown,
  FiEdit3,
  FiEye,
  FiFilter,
  FiLoader,
  FiPlus,
  FiPlusCircle,
  FiRotateCcw,
  FiSearch,
  FiSliders,
  FiTrash2,
  FiX,
} from 'react-icons/fi';

import AppLayout from '../components/AppLayout';
import { useRequireAuth } from '../hooks/useRequireAuth';

import styles from '../styles/TransactionsHistory.module.css';

const MANDATORY_COLUMNS = new Set([
  'transactions.transaction_id',
  'transactions.account_id',
  'transactions.amount',
  'transactions.occurred_on',
]);

const DEFAULT_LIMIT = 100;
const DEFAULT_SORT = { id: 'transactions.occurred_on', field: 'occurred_on', direction: 'desc' };

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const buildInitialFilters = () => ({
  personId: '',
  categoryId: '',
  year: '',
  monthMode: 'single',
  monthStart: '',
  monthEnd: '',
});

const buildTransactionDraft = () => ({
  transaction_id: '',
  account_id: '',
  amount: '',
  occurred_on: '',
  notes: '',
});

function Modal({ open, onClose, title, children, footer, dataTestId }) {
  if (!open) {
    return null;
  }

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      aria-hidden="true"
      data-testid={dataTestId}
    >
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <FiX size={18} />
          </button>
        </header>
        <div className={styles.modalBody}>{children}</div>
        <div className={styles.modalFooter}>{footer}</div>
      </div>
    </div>
  );
}

function FilterModal({ open, onClose, onApply, initialFilters, onClear }) {
  const [draft, setDraft] = useState(initialFilters);

  useEffect(() => {
    setDraft(initialFilters);
  }, [initialFilters, open]);

  const updateDraft = (partial) => {
    setDraft((prev) => ({
      ...prev,
      ...partial,
    }));
  };

  const handleApply = () => {
    onApply(draft);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filter transactions"
      dataTestId="transactions-filter-modal"
      footer={
        <>
          <button
            type="button"
            className={styles.modalActionSecondary}
            onClick={onClear}
            data-testid="transactions-filter-clear"
          >
            Reset
          </button>
          <button
            type="button"
            className={styles.modalActionPrimary}
            onClick={handleApply}
            data-testid="transactions-filter-apply"
          >
            Apply filters
          </button>
        </>
      }
    >
      <div className={styles.modalRow}>
        <label className={styles.modalLabel} htmlFor="filter-person">
          Person ID
        </label>
        <input
          id="filter-person"
          className={styles.modalInput}
          value={draft.personId}
          onChange={(event) => updateDraft({ personId: event.target.value })}
          placeholder="e.g. person_01"
          data-testid="transactions-filter-person"
        />
      </div>
      <div className={styles.modalRow}>
        <label className={styles.modalLabel} htmlFor="filter-category">
          Category ID
        </label>
        <input
          id="filter-category"
          className={styles.modalInput}
          value={draft.categoryId}
          onChange={(event) => updateDraft({ categoryId: event.target.value })}
          placeholder="e.g. cat_groceries"
          data-testid="transactions-filter-category"
        />
      </div>
      <div className={styles.modalRow}>
        <label className={styles.modalLabel} htmlFor="filter-year">
          Year
        </label>
        <input
          id="filter-year"
          type="number"
          className={styles.modalInput}
          value={draft.year}
          onChange={(event) => updateDraft({ year: event.target.value })}
          placeholder="YYYY"
          data-testid="transactions-filter-year"
          min="2000"
          max="2100"
        />
      </div>
      <div className={styles.modalRow}>
        <span className={styles.modalLabel}>Month</span>
        <div className={styles.modalInput}>
          <div className={styles.modalRow}>
            <label className={styles.modalLabel} htmlFor="filter-month-mode">
              Mode
            </label>
            <select
              id="filter-month-mode"
              className={styles.modalSelect}
              value={draft.monthMode}
              onChange={(event) => updateDraft({ monthMode: event.target.value })}
              data-testid="transactions-filter-month-mode"
            >
              <option value="single">Single month</option>
              <option value="range">Range</option>
            </select>
          </div>
          <div className={styles.modalRow}>
            <label className={styles.modalLabel} htmlFor="filter-month-start">
              {draft.monthMode === 'range' ? 'Start month' : 'Month'}
            </label>
            <input
              id="filter-month-start"
              className={styles.modalInput}
              type="month"
              value={draft.monthStart}
              onChange={(event) => updateDraft({ monthStart: event.target.value })}
              data-testid="transactions-filter-month-start"
            />
          </div>
          {draft.monthMode === 'range' ? (
            <div className={styles.modalRow}>
              <label className={styles.modalLabel} htmlFor="filter-month-end">
                End month
              </label>
              <input
                id="filter-month-end"
                className={styles.modalInput}
                type="month"
                value={draft.monthEnd}
                onChange={(event) => updateDraft({ monthEnd: event.target.value })}
                data-testid="transactions-filter-month-end"
              />
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

function TransactionModal({ open, onClose, mode, onSubmit, initialValues, loading }) {
  const [draft, setDraft] = useState(initialValues);

  useEffect(() => {
    setDraft(initialValues);
  }, [initialValues, mode, open]);

  const updateDraft = (partial) => {
    setDraft((prev) => ({
      ...prev,
      ...partial,
    }));
  };

  const handleSubmit = () => {
    onSubmit(draft);
  };

  const title = mode === 'edit' ? 'Edit transaction' : 'Add transaction';
  const dataTestId = mode === 'edit' ? 'transactions-edit-modal' : 'transactions-add-modal';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      dataTestId={dataTestId}
      footer={
        <>
          <button
            type="button"
            className={styles.modalActionSecondary}
            onClick={onClose}
            data-testid="transactions-modal-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.modalActionPrimary}
            onClick={handleSubmit}
            disabled={loading}
            data-testid="transactions-modal-submit"
          >
            {loading ? <FiLoader size={16} className={styles.spinner} /> : null}
            {mode === 'edit' ? 'Save changes' : 'Create transaction'}
          </button>
        </>
      }
    >
      <div className={styles.modalRow}>
        <label className={styles.modalLabel} htmlFor="txn-id">
          Transaction ID
        </label>
        <input
          id="txn-id"
          className={styles.modalInput}
          value={draft.transaction_id}
          onChange={(event) => updateDraft({ transaction_id: event.target.value })}
          placeholder="txn_123"
          disabled={mode === 'edit'}
          data-testid="transactions-modal-transaction-id"
        />
      </div>
      <div className={styles.modalRow}>
        <label className={styles.modalLabel} htmlFor="txn-account">
          Account ID
        </label>
        <input
          id="txn-account"
          className={styles.modalInput}
          value={draft.account_id}
          onChange={(event) => updateDraft({ account_id: event.target.value })}
          placeholder="acct_primary"
          data-testid="transactions-modal-account"
        />
      </div>
      <div className={styles.modalRow}>
        <label className={styles.modalLabel} htmlFor="txn-amount">
          Amount
        </label>
        <input
          id="txn-amount"
          className={styles.modalInput}
          value={draft.amount}
          onChange={(event) => updateDraft({ amount: event.target.value })}
          placeholder="125.45"
          data-testid="transactions-modal-amount"
        />
      </div>
      <div className={styles.modalRow}>
        <label className={styles.modalLabel} htmlFor="txn-date">
          Occurred on
        </label>
        <input
          id="txn-date"
          type="date"
          className={styles.modalInput}
          value={draft.occurred_on}
          onChange={(event) => updateDraft({ occurred_on: event.target.value })}
          data-testid="transactions-modal-occurred-on"
        />
      </div>
      <div className={styles.modalRow}>
        <label className={styles.modalLabel} htmlFor="txn-notes">
          Notes
        </label>
        <textarea
          id="txn-notes"
          className={styles.modalInput}
          rows={3}
          value={draft.notes}
          onChange={(event) => updateDraft({ notes: event.target.value })}
          placeholder="Describe transaction purpose"
          data-testid="transactions-modal-notes"
        />
      </div>
    </Modal>
  );
}

function AdvancedActionsModal({ open, onClose, record }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Advanced actions"
      dataTestId="transactions-advanced-modal"
      footer={
        <button
          type="button"
          className={styles.modalActionPrimary}
          onClick={onClose}
          data-testid="transactions-advanced-close"
        >
          Close
        </button>
      }
    >
      <div className={styles.modalRow}>
        <span className={styles.modalLabel}>Transaction</span>
        <span>{record?.transaction_id ?? 'N/A'}</span>
      </div>
      <div className={styles.modalRow}>
        <span className={styles.modalLabel}>Cashback movements</span>
        {record?.cashback_movements?.length ? (
          <ul>
            {record.cashback_movements.map((movement) => (
              <li key={movement.cashback_movement_id}>
                <span className={styles.badge}>{movement.cashback_type}</span>{' '}
                <span>{movement.cashback_amount}</span> -{' '}
                <span className={styles.subtleText}>{movement.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.subtleText}>No cashback movements associated.</p>
        )}
      </div>
    </Modal>
  );
}

const deriveDefaultWidth = (column) => {
  if (column.table === 'transactions' && column.column === 'notes') {
    return 320;
  }
  if (column.type === 'timestamp') {
    return 220;
  }
  if (column.type === 'text') {
    return 220;
  }
  if (column.type === 'numeric') {
    return 160;
  }
  if (column.type === 'date') {
    return 170;
  }
  return 180;
};

const normaliseValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
};

export default function TransactionsHistoryPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [columns, setColumns] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnWidths, setColumnWidths] = useState({});
  const defaultsRef = useRef({ visibility: {}, widths: {} });
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [columnsError, setColumnsError] = useState(null);

  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState(null);

  const [searchInput, setSearchInput] = useState('');
  const [restoreSearchValue, setRestoreSearchValue] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [filters, setFilters] = useState(buildInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState(buildInitialFilters);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [transactionModalState, setTransactionModalState] = useState({
    open: false,
    mode: 'create',
    record: null,
  });
  const [transactionSubmitting, setTransactionSubmitting] = useState(false);
  const [advancedModalRecord, setAdvancedModalRecord] = useState(null);

  const [sortState, setSortState] = useState(DEFAULT_SORT);

  const [selectedRows, setSelectedRows] = useState(() => new Set());
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3200);
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [toast]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    let ignore = false;
    const controller = new AbortController();
    setColumnsLoading(true);
    setColumnsError(null);

    fetch('/api/transactions/columns', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load columns (${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        if (ignore) {
          return;
        }
        const resolved = Array.isArray(data.columns) ? data.columns : [];
        setColumns(resolved);
        const visibility = resolved.reduce((acc, column) => {
          acc[column.id] = true;
          return acc;
        }, {});
        const widths = resolved.reduce((acc, column) => {
          acc[column.id] = deriveDefaultWidth(column);
          return acc;
        }, {});
        defaultsRef.current = {
          visibility: { ...visibility },
          widths: { ...widths },
        };
        setColumnVisibility(visibility);
        setColumnWidths(widths);
        if (resolved.length && !resolved.some((column) => column.id === sortState.id)) {
          setSortState(DEFAULT_SORT);
        }
      })
      .catch((error) => {
        if (ignore || error.name === 'AbortError') {
          return;
        }
        setColumnsError(error.message);
      })
      .finally(() => {
        if (!ignore) {
          setColumnsLoading(false);
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [isAuthenticated, isLoading, sortState.id]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', String(DEFAULT_LIMIT));
    params.set('offset', '0');
    if (appliedSearch) {
      params.set('search', appliedSearch);
    }
    if (appliedFilters.personId) {
      params.set('personId', appliedFilters.personId);
    }
    if (appliedFilters.categoryId) {
      params.set('categoryId', appliedFilters.categoryId);
    }
    if (appliedFilters.year) {
      params.set('year', appliedFilters.year);
    }
    if (appliedFilters.monthStart) {
      if (appliedFilters.monthMode === 'range' && appliedFilters.monthEnd) {
        params.set('month', `${appliedFilters.monthStart}..${appliedFilters.monthEnd}`);
      } else {
        params.set('month', appliedFilters.monthStart);
      }
    }
    if (sortState.field) {
      params.set('sort', `${sortState.field}:${sortState.direction}`);
    }
    return params.toString();
  }, [appliedFilters, appliedSearch, sortState]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !columns.length) {
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    setRowsLoading(true);
    setRowsError(null);

    fetch(`/api/transactions?${queryString}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load transactions (${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        if (ignore) {
          return;
        }
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (ignore || error.name === 'AbortError') {
          return;
        }
        setRowsError(error.message);
      })
      .finally(() => {
        if (!ignore) {
          setRowsLoading(false);
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [columns.length, isAuthenticated, isLoading, queryString, refreshKey]);

  useEffect(() => {
    setSelectedRows((previous) => {
      const currentIds = new Set(rows.map((row) => row.transaction_id));
      const next = new Set();
      previous.forEach((id) => {
        if (currentIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [rows]);

  useEffect(() => {
    if (selectedRows.size === 0 && showSelectedOnly) {
      setShowSelectedOnly(false);
    }
  }, [selectedRows, showSelectedOnly]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => columnVisibility[column.id] !== false),
    [columns, columnVisibility],
  );

  const displayedRows = useMemo(() => {
    if (!showSelectedOnly || selectedRows.size === 0) {
      return rows;
    }
    return rows.filter((row) => selectedRows.has(row.transaction_id));
  }, [rows, selectedRows, showSelectedOnly]);

  const totalSelectedAmount = useMemo(() => {
    let total = 0;
    rows.forEach((row) => {
      if (!selectedRows.has(row.transaction_id)) {
        return;
      }
      const value = Number.parseFloat(row.amount);
      if (!Number.isNaN(value)) {
        total += value;
      }
    });
    return total;
  }, [rows, selectedRows]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmed = searchInput.trim();
    setAppliedSearch(trimmed);
    if (trimmed) {
      setRestoreSearchValue(trimmed);
    }
  };

  const handleClearSearch = () => {
    const fallback = searchInput || appliedSearch;
    if (fallback) {
      setRestoreSearchValue(fallback);
    }
    setSearchInput('');
    setAppliedSearch('');
  };

  const handleRestoreSearch = () => {
    if (!restoreSearchValue) {
      return;
    }
    setSearchInput(restoreSearchValue);
    setAppliedSearch(restoreSearchValue);
    setRestoreSearchValue('');
  };

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
    if (restoreSearchValue) {
      setRestoreSearchValue('');
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleClearSearch();
    }
  };

  const toggleRowSelection = (transactionId) => {
    setSelectedRows((previous) => {
      const next = new Set(previous);
      if (next.has(transactionId)) {
        next.delete(transactionId);
      } else {
        next.add(transactionId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = displayedRows.map((row) => row.transaction_id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedRows.has(id));
    setSelectedRows(() => {
      if (allSelected) {
        return new Set();
      }
      return new Set(allIds);
    });
  };

  const handleSort = (column) => {
    if (!column.sortable) {
      return;
    }
    setSortState((previous) => {
      if (previous.id === column.id) {
        return {
          ...previous,
          direction: previous.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        id: column.id,
        field: column.column,
        direction: 'asc',
      };
    });
  };

  const resetColumns = () => {
    setColumnVisibility({ ...defaultsRef.current.visibility });
    setColumnWidths({ ...defaultsRef.current.widths });
  };

  const handleFilterApply = (nextFilters) => {
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setFilterModalOpen(false);
  };

  const handleFilterClear = () => {
    const cleared = buildInitialFilters();
    setFilters(cleared);
    setAppliedFilters(cleared);
    setFilterModalOpen(false);
  };

  const openCreateModal = () => {
    setTransactionModalState({
      open: true,
      mode: 'create',
      record: buildTransactionDraft(),
    });
  };

  const openEditModal = (record) => {
    setTransactionModalState({
      open: true,
      mode: 'edit',
      record: {
        transaction_id: record.transaction_id ?? '',
        account_id: record.account_id ?? '',
        amount: record.amount ?? '',
        occurred_on: record.occurred_on ?? '',
        notes: record.notes ?? '',
      },
    });
  };

  const closeTransactionModal = () => {
    setTransactionModalState((prev) => ({ ...prev, open: false }));
  };

  const triggerRefresh = () => {
    setRefreshKey((previous) => previous + 1);
  };

  const handleTransactionSubmit = async (draft) => {
    setTransactionSubmitting(true);
    try {
      const payload = {
        transaction_id: draft.transaction_id,
        account_id: draft.account_id,
        amount: draft.amount,
        occurred_on: draft.occurred_on,
        notes: draft.notes,
      };
      const method = transactionModalState.mode === 'edit' ? 'PATCH' : 'POST';
      const response = await fetch('/api/transactions', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const body = await response.json();
      setToast(body?.message ?? 'Transaction accepted.');
      triggerRefresh();
      closeTransactionModal();
    } catch (error) {
      setToast(error.message ?? 'Failed to submit transaction.');
    } finally {
      setTransactionSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionId: record.transaction_id }),
      });
      if (!response.ok) {
        throw new Error(`Delete failed (${response.status})`);
      }
      const body = await response.json();
      setToast(body?.message ?? 'Delete request accepted.');
      triggerRefresh();
    } catch (error) {
      setToast(error.message ?? 'Unable to delete transaction.');
    }
  };

  const openAdvancedModal = (record) => {
    setAdvancedModalRecord(record);
  };

  const closeAdvancedModal = () => {
    setAdvancedModalRecord(null);
  };

  const resolveCellValue = useCallback((column, row) => {
    if (column.table === 'transactions') {
      return normaliseValue(row[column.column]);
    }
    const movements = Array.isArray(row.cashback_movements) ? row.cashback_movements : [];
    if (!movements.length) {
      return '';
    }
    const values = movements
      .map((movement) => movement[column.column])
      .filter((value) => value !== null && value !== undefined && value !== '');
    return values.length ? values.map(normaliseValue).join(' | ') : '';
  }, []);

  const renderCell = (column, row) => {
    const value = resolveCellValue(column, row);
    if (column.table === 'transactions' && column.column === 'amount') {
      const numeric = Number.parseFloat(row.amount);
      const amountClass =
        Number.isNaN(numeric) || numeric === 0
          ? ''
          : numeric > 0
            ? styles.amountPositive
            : styles.amountNegative;
      return <span className={amountClass}>{value || row.amount}</span>;
    }
    return value || 'â€”';
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const allSelected =
    displayedRows.length > 0 &&
    displayedRows.every((row) => selectedRows.has(row.transaction_id));

  return (
    <AppLayout
      title="Transactions history"
      subtitle="Search, analyse, and manage ledger activity with cashback context."
    >
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <form
              className={styles.searchForm}
              onSubmit={handleSearchSubmit}
              data-testid="transactions-history-search-form"
            >
              <div className={styles.searchInputWrapper}>
                <FiSearch size={18} className={styles.searchIcon} />
                <input
                  type="search"
                  placeholder="Search notes..."
                  value={searchInput}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  className={styles.searchInput}
                  data-testid="transactions-search-input"
                />
                {searchInput.length > 0 ? (
                  <button
                    type="button"
                    className={styles.searchClearButton}
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                    data-testid="transactions-search-clear"
                  >
                    <FiX size={16} />
                  </button>
                ) : restoreSearchValue ? (
                  <button
                    type="button"
                    className={styles.searchClearButton}
                    onClick={handleRestoreSearch}
                    aria-label="Restore previous search"
                    data-testid="transactions-search-restore"
                  >
                    <FiRotateCcw size={16} />
                  </button>
                ) : null}
              </div>
              <button
                type="submit"
                className={styles.searchSubmit}
                data-testid="transactions-search-submit"
              >
                <FiSearch size={16} />
                Search
              </button>
            </form>
            <div className={styles.toolbarActions}>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => setFilterModalOpen(true)}
                data-testid="transactions-filter-button"
              >
                <FiFilter size={16} />
                Filter
              </button>
              <button
                type="button"
                className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}
                onClick={openCreateModal}
                data-testid="transactions-add-button"
              >
                <FiPlus size={16} />
                Add
              </button>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => setCustomizerOpen((prev) => !prev)}
                data-testid="transactions-column-customizer-toggle"
                aria-expanded={customizerOpen}
              >
                <FiSliders size={16} />
                Columns
              </button>
            </div>
          </div>
          {selectedRows.size > 0 ? (
            <div className={styles.selectionBar} data-testid="transactions-selection-bar">
              <span className={styles.selectionInfo}>
                {selectedRows.size} transaction{selectedRows.size === 1 ? '' : 's'} selected
              </span>
              <div className={styles.selectionActions}>
                <button
                  type="button"
                  className={styles.selectionButton}
                  onClick={() => setShowSelectedOnly(true)}
                  data-testid="transactions-show-selected"
                >
                  <FiEye size={14} />
                  Show selected
                </button>
                <button
                  type="button"
                  className={styles.selectionButton}
                  onClick={() => {
                    setSelectedRows(new Set());
                    setShowSelectedOnly(false);
                  }}
                  data-testid="transactions-deselect"
                >
                  <FiX size={14} />
                  De-select
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <section className={styles.tableCard}>
          <div className={styles.tableScroller}>
            {columnsLoading ? (
              <div className={styles.loadingState} data-testid="transactions-loading">
                <FiLoader size={18} className={styles.spinner} /> Loading columnsâ€¦
              </div>
            ) : null}
            {columnsError ? (
              <div className={styles.errorState} data-testid="transactions-error">
                {columnsError}
              </div>
            ) : null}
            {!columnsLoading && !columnsError ? (
              <>
                {rowsLoading ? (
                  <div className={styles.loadingState}>
                    <FiLoader size={18} className={styles.spinner} /> Loading transactionsâ€¦
                  </div>
                ) : null}
                {rowsError ? (
                  <div className={styles.errorState}>{rowsError}</div>
                ) : null}
                {!rowsLoading && !rowsError && displayedRows.length === 0 ? (
                  <div className={styles.emptyState} data-testid="transactions-empty">
                    No transactions match your filters.
                  </div>
                ) : null}
                {!rowsError && visibleColumns.length > 0 ? (
                  <table className={styles.table} data-testid="transactions-table">
                    <thead>
                      <tr>
                        <th className={styles.checkboxCell}>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleSelectAll}
                            data-testid="transactions-header-checkbox"
                            aria-label="Select all rows"
                          />
                        </th>
                        {visibleColumns.map((column) => {
                          const width = columnWidths[column.id] ?? 180;
                          const sorted = sortState.id === column.id;
                          return (
                            <th
                              key={column.id}
                              className={`${styles.headerCell} ${
                                column.sortable ? styles.sortable : ''
                              }`}
                              style={{ width, minWidth: width }}
                              onClick={() => handleSort(column)}
                              aria-sort={
                                sorted ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                              }
                            >
                              <span className={styles.sortLabel}>
                                {column.label}
                                {column.sortable ? (
                                  <FiChevronDown
                                    size={14}
                                    className={styles.sortIndicator}
                                    data-active={sorted}
                                    data-direction={sortState.direction}
                                  />
                                ) : null}
                              </span>
                            </th>
                          );
                        })}
                        <th className={styles.headerCell} style={{ minWidth: 180 }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedRows.map((row) => {
                        const transactionId = row.transaction_id;
                        const isSelected = selectedRows.has(transactionId);
                        return (
                          <tr
                            key={transactionId}
                            className={isSelected ? styles.rowSelected : ''}
                            data-testid="transactions-table-row"
                          >
                            <td className={styles.checkboxCell}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRowSelection(transactionId)}
                                data-testid={`transactions-row-checkbox-${transactionId}`}
                                aria-label={`Select ${transactionId}`}
                              />
                            </td>
                            {visibleColumns.map((column) => {
                              const width = columnWidths[column.id] ?? 180;
                              return (
                                <td key={`${transactionId}-${column.id}`} style={{ width, minWidth: width }}>
                                  {renderCell(column, row)}
                                </td>
                              );
                            })}
                            <td className={styles.actionsCell}>
                              <button
                                type="button"
                                className={styles.actionButton}
                                onClick={() => openEditModal(row)}
                                data-testid={`transactions-row-edit-${transactionId}`}
                              >
                                <FiEdit3 size={14} />
                                Edit
                              </button>
                              <button
                                type="button"
                                className={styles.actionButton}
                                onClick={() => handleDelete(row)}
                                data-testid={`transactions-row-delete-${transactionId}`}
                              >
                                <FiTrash2 size={14} />
                                Delete
                              </button>
                              <button
                                type="button"
                                className={styles.actionButton}
                                onClick={() => openAdvancedModal(row)}
                                data-testid={`transactions-row-advanced-${transactionId}`}
                              >
                                <FiPlusCircle size={14} />
                                Plus
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : null}
              </>
            ) : null}
          </div>
          {selectedRows.size > 1 ? (
            <div className={styles.totalBar} data-testid="transactions-selection-total">
              <span className={styles.totalLabel}>Selected total</span>
              <span>{currencyFormatter.format(totalSelectedAmount)}</span>
            </div>
          ) : null}
        </section>
      </div>

      <aside
        className={styles.customizerPanel}
        data-open={customizerOpen}
        data-testid="transactions-column-panel"
      >
        <header className={styles.customizerHeader}>
          <h3 className={styles.customizerTitle}>Columns</h3>
          <button
            type="button"
            className={styles.customizerClose}
            onClick={() => setCustomizerOpen(false)}
            aria-label="Close column panel"
          >
            <FiX size={18} />
          </button>
        </header>
        <div className={styles.customizerBody}>
          {columns.map((column) => {
            const isMandatory = MANDATORY_COLUMNS.has(column.id);
            const width = columnWidths[column.id] ?? 180;
            return (
              <div key={column.id} className={styles.customizerRow}>
                <label className={styles.customizerLabel}>
                  <input
                    type="checkbox"
                    checked={columnVisibility[column.id] !== false}
                    onChange={(event) => {
                      if (isMandatory) {
                        return;
                      }
                      setColumnVisibility((previous) => ({
                        ...previous,
                        [column.id]: event.target.checked,
                      }));
                    }}
                    disabled={isMandatory}
                    data-testid={`column-toggle-${column.id}`}
                  />
                  {column.label}
                  {isMandatory ? <span className={styles.badge}>Required</span> : null}
                </label>
                <div className={styles.customizerControl}>
                  <span>Width</span>
                  <input
                    type="range"
                    min="120"
                    max="420"
                    step="10"
                    value={width}
                    onChange={(event) =>
                      setColumnWidths((previous) => ({
                        ...previous,
                        [column.id]: Number(event.target.value),
                      }))
                    }
                    data-testid={`column-width-${column.id}`}
                  />
                  <span>{Math.round(width)}px</span>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className={styles.customizerReset}
          onClick={resetColumns}
          data-testid="transactions-column-reset"
        >
          Reset to defaults
        </button>
      </aside>

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={handleFilterApply}
        onClear={handleFilterClear}
        initialFilters={filters}
      />

      <TransactionModal
        open={transactionModalState.open}
        onClose={closeTransactionModal}
        mode={transactionModalState.mode}
        onSubmit={handleTransactionSubmit}
        initialValues={transactionModalState.record ?? buildTransactionDraft()}
        loading={transactionSubmitting}
      />

      <AdvancedActionsModal
        open={Boolean(advancedModalRecord)}
        onClose={closeAdvancedModal}
        record={advancedModalRecord}
      />

      {toast ? (
        <div className={styles.toast} data-testid="transactions-toast">
          {toast}
        </div>
      ) : null}
    </AppLayout>
  );
}

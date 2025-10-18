import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  FiChevronRight,
  FiEdit2,
  FiFilter,
  FiMoreHorizontal,
  FiRotateCcw,
  FiSearch,
  FiCreditCard,
  FiEdit2,
  FiFilter,
  FiMoreHorizontal,
  FiTag,
  FiTrash2,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { createPortal } from 'react-dom';

import styles from '../../styles/TransactionsHistory.module.css';
import { formatAmount, formatAmountWithTrailing, formatPercent } from '../../lib/numberFormat';

const CHECKBOX_COLUMN_WIDTH = 56;
const ACTIONS_COLUMN_WIDTH = 56;
const STICKY_COLUMN_BUFFER = CHECKBOX_COLUMN_WIDTH + ACTIONS_COLUMN_WIDTH;

const QUICK_FILTER_META = {
  type: {
    field: 'types',
    label: 'Type',
    multi: true,
    optionsKey: 'types',
  },
  owner: {
    field: 'person',
    label: 'People',
    multi: false,
    optionsKey: 'people',
    searchable: true,
    icon: <FiUser aria-hidden />,
  },
  category: {
    field: 'category',
    label: 'Category',
    multi: false,
    optionsKey: 'categories',
    searchable: true,
    icon: <FiFilter aria-hidden />,
  },
  debtTag: {
    field: 'debtTags',
    label: 'Debt Tag',
    multi: true,
    optionsKey: 'debtTags',
    icon: <FiTag aria-hidden />,
  },
};

const CHECKBOX_COLUMN_WIDTH = 64;
const ACTIONS_COLUMN_WIDTH = 72;
const STICKY_COLUMN_BUFFER = CHECKBOX_COLUMN_WIDTH + ACTIONS_COLUMN_WIDTH;

const QUICK_FILTER_META = {
  type: {
    field: 'types',
    label: 'Type',
    multi: true,
    optionsKey: 'types',
    searchable: true,
    icon: <FiFilter aria-hidden />,
  },
  account: {
    field: 'accounts',
    label: 'Account',
    multi: true,
    optionsKey: 'accounts',
    searchable: true,
    icon: <FiCreditCard aria-hidden />,
  },
  owner: {
    field: 'person',
    label: 'People',
    multi: false,
    optionsKey: 'people',
    searchable: true,
    icon: <FiUser aria-hidden />,
  },
  category: {
    field: 'category',
    label: 'Category',
    multi: false,
    optionsKey: 'categories',
    searchable: true,
    icon: <FiFilter aria-hidden />,
  },
  debtTag: {
    field: 'debtTags',
    label: 'Debt Tag',
    multi: true,
    optionsKey: 'debtTags',
    icon: <FiTag aria-hidden />,
  },
};

const dateFormatters = {
  'DD/MM/YY': new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }),
  'MM/DD/YY': new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }),
};

function formatTransactionDate(value, format = 'DD/MM/YY') {
  if (!value) {
    return '—';
  }

  const dateValue = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dateValue.getTime())) {
    return value;
  }

  if (format === 'YYYY-MM-DD') {
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${dateValue.getFullYear()}-${month}-${day}`;
  }

  const formatter = dateFormatters[format] ?? dateFormatters['DD/MM/YY'];
  return formatter.format(dateValue);
}

function getAmountToneClass(type) {
  if (type === 'Income') {
    return styles.amountIncome;
  }
  if (type === 'Transfer') {
    return styles.amountTransfer;
  }
  return styles.amountExpense;
}

function TotalBackCell({ transaction }) {
  const totalBack = formatAmount(transaction.totalBack);
  const percentBack = Number(transaction.percentBack ?? 0);
  const fixedBack = Number(transaction.fixedBack ?? 0);
  const amount = Number(transaction.amount ?? 0);
  const hasPercent = percentBack > 0;
  const hasFixed = fixedBack > 0;
  const canShowFormula =
    Number(transaction.totalBack ?? 0) > 0 && hasPercent && hasFixed && amount > 0;
  const formulaText = `${formatAmount(amount)}×${formatPercent(percentBack)} + ${formatAmount(
    fixedBack,
  )}`;

  return (
    <div className={styles.totalBackCell} title={canShowFormula ? formulaText : undefined}>
      <span className={styles.totalBackValue}>{totalBack}</span>
      {canShowFormula ? <span className={styles.totalBackFormula}>{formulaText}</span> : null}
    </div>
  );
}

const columnRenderers = {
  date: (txn, column) => formatTransactionDate(txn.date, column.format),
  type: (txn, _column, stylesRef) => (
    <span
      className={
        txn.type === 'Income'
          ? `${stylesRef.pill} ${stylesRef.pillIncome}`
          : `${stylesRef.pill} ${stylesRef.pillExpense}`
      }
    >
      {txn.type}
    </span>
  ),
  account: (txn) => txn.account ?? '—',
  shop: (txn) => txn.shop ?? '—',
  notes: (txn) => txn.notes ?? '—',
  amount: (txn, column, stylesRef) => {
    const numeric = Math.abs(Number(txn.amount ?? 0));
    const toneClass = getAmountToneClass(txn.type);
    return (
      <span
        className={`${stylesRef.amountValue} ${toneClass}`}
        data-testid={`transaction-amount-${txn.id}`}
      >
        {formatAmount(numeric)}
      </span>
    );
  },
  percentBack: (txn) => formatPercent(txn.percentBack),
  fixedBack: (txn) => formatAmount(txn.fixedBack),
  totalBack: (txn) => <TotalBackCell transaction={txn} />,
  finalPrice: (txn) => formatAmount(txn.finalPrice),
  debtTag: (txn) => txn.debtTag ?? '—',
  cycleTag: (txn) => txn.cycleTag ?? '—',
  category: (txn) => txn.category ?? '—',
  linkedTxn: (txn) => txn.linkedTxn ?? '—',
  owner: (txn) => txn.owner ?? '—',
  id: (txn) => txn.id ?? '—',
};

function renderCellContent(column, transaction) {
  const renderer = columnRenderers[column.id];
  if (!renderer) {
    return transaction[column.id] ?? '—';
  }
  return renderer(transaction, column, styles);
}

function computeMinWidth(columns, definitionMap) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return 0;
  }

  return columns.reduce((total, column) => {
    const definition = definitionMap.get(column.id);
    const minWidth = column.width || definition?.minWidth || 120;
    return total + minWidth;
  }, 0);
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'value';
}

function SortGlyph({ direction }) {
  const stateClass =
    direction === 'asc'
      ? styles.sortGlyphAsc
      : direction === 'desc'
      ? styles.sortGlyphDesc
      : styles.sortGlyphIdle;

  return (
    <span className={`${styles.sortGlyph} ${stateClass}`} aria-hidden>
      <svg className={styles.sortGlyphIcon} viewBox="0 0 16 16" focusable="false">
        <path d="M8 3l5 6.5H3z" />
      </svg>
  return (
    <span
      className={`${styles.sortGlyph} ${
        direction === 'asc'
          ? styles.sortGlyphAsc
          : direction === 'desc'
          ? styles.sortGlyphDesc
          : ''
      }`}
      aria-hidden
    >
      <span className={styles.sortArrowUp} />
      <span className={styles.sortArrowDown} />
    </span>
  );
}

export function TransactionsTable({
  transactions,
  selectedIds,
  onSelectRow,
  onSelectAll,
  selectionSummary = { count: 0, amount: 0, finalPrice: 0, totalBack: 0 },
  onOpenAdvanced,
  columnDefinitions = [],
  visibleColumns,
  pagination,
  sortState = [],
  onSortChange,
  quickFilters = {},
  quickFilterOptions = {},
  onQuickFilterChange,
  onQuickFilterToggle,
  onQuickFilterSearch,
}) {
  const [openQuickFilter, setOpenQuickFilter] = useState(null);
  const [quickFilterSearch, setQuickFilterSearch] = useState({});
  const [quickFilterRestore, setQuickFilterRestore] = useState({});
  const [focusedQuickFilterSearch, setFocusedQuickFilterSearch] = useState(null);
  const [quickFilterPosition, setQuickFilterPosition] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);
  const [openActionSubmenu, setOpenActionSubmenu] = useState(null);
  const quickFilterRefs = useRef(new Map());
  const quickFilterSearchRefs = useRef(new Map());
  const quickFilterPortalRef = useRef(null);
  const quickFilterHoverTimer = useRef(null);
  const actionMenuCloseTimer = useRef(null);
  const headerCheckboxRef = useRef(null);
  const actionAnchorRefs = useRef(new Map());
  const actionMenuPortalRef = useRef(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [tooltipState, setTooltipState] = useState(null);

  const closeActionMenu = useCallback(() => {
    if (actionMenuCloseTimer.current) {
      clearTimeout(actionMenuCloseTimer.current);
      actionMenuCloseTimer.current = null;
    }
    setOpenActionId(null);
    setOpenActionSubmenu(null);
  }, []);
  const [openActionId, setOpenActionId] = useState(null);
  const [openActionSubmenu, setOpenActionSubmenu] = useState(null);
  const quickFilterRefs = useRef(new Map());
  const previousQuickFilterRef = useRef(null);
  const actionMenuCloseTimer = useRef(null);
  const headerCheckboxRef = useRef(null);

  const definitionMap = useMemo(
    () => new Map(columnDefinitions.map((definition) => [definition.id, definition])),
    [columnDefinitions],
  );

  const selectionSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected =
    transactions.length > 0 && transactions.every((txn) => selectionSet.has(txn.id));
  const isIndeterminate = selectionSet.size > 0 && !allSelected;
  const openActionTransaction = useMemo(
    () => transactions.find((txn) => txn.id === openActionId) ?? null,
    [transactions, openActionId],
  );

  const sortLookup = useMemo(() => {
    const lookup = new Map();
    sortState?.forEach((item, index) => {
      lookup.set(item.id, { ...item, index });
    });
    return lookup;
  }, [sortState]);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);


  useEffect(() => {
    return () => {
      if (quickFilterHoverTimer.current) {
        clearTimeout(quickFilterHoverTimer.current);
        quickFilterHoverTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!tooltipState) {
      return undefined;
    }
    const dismissTooltip = () => setTooltipState(null);
    window.addEventListener('scroll', dismissTooltip, true);
    window.addEventListener('resize', dismissTooltip);
    return () => {
      window.removeEventListener('scroll', dismissTooltip, true);
      window.removeEventListener('resize', dismissTooltip);
    };
  }, [tooltipState]);

  useEffect(() => {
    if (!openQuickFilter) {
      setFocusedQuickFilterSearch(null);
    }
  }, [openQuickFilter]);

  useLayoutEffect(() => {
    if (!openQuickFilter) {
      setQuickFilterPosition(null);
      return undefined;
    }
    if (typeof window === 'undefined') {
      return undefined;
    }

    const anchor = quickFilterRefs.current.get(openQuickFilter);
    if (!anchor) {
      return undefined;
    }

    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const desiredWidth = Math.max(rect.width, 240);
      let left = rect.left + window.scrollX;
      let top = rect.bottom + window.scrollY + 8;

      if (left + desiredWidth > viewportWidth - 16) {
        left = Math.max(16, viewportWidth - desiredWidth - 16);
      }

      setQuickFilterPosition({
        top,
        left,
        width: desiredWidth,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [openQuickFilter, visibleColumns, quickFilters]);

  useEffect(() => {
    return () => {
      if (actionMenuCloseTimer.current) {
        clearTimeout(actionMenuCloseTimer.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!openActionId) {
      setActionMenuPosition(null);
      return undefined;
    }
    if (typeof window === 'undefined') {
      return undefined;
    }

    const anchor = actionAnchorRefs.current.get(openActionId);
    if (!anchor) {
      return undefined;
    }

    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const menuWidth = 240;
      let left = rect.left + window.scrollX + rect.width - menuWidth;
      let top = rect.bottom + window.scrollY + 8;

      if (left < 16) {
        left = 16;
      }
      if (left + menuWidth > viewportWidth - 16) {
        left = Math.max(16, viewportWidth - menuWidth - 16);
      }

      setActionMenuPosition({
        top,
        left,
        width: menuWidth,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [openActionId]);

  useEffect(() => {
    if (!openActionId) {
  useEffect(() => {
    if (!openQuickFilter) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const anchor = actionAnchorRefs.current.get(openActionId);
      const menuNode = actionMenuPortalRef.current;
      if (
        (anchor && anchor.contains(event.target)) ||
        (menuNode && menuNode.contains(event.target))
      ) {
        return;
      }
      closeActionMenu();
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeActionMenu();
      const container = quickFilterRefs.current.get(openQuickFilter);
      if (!container || container.contains(event.target)) {
        return;
      }
      setOpenQuickFilter(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenQuickFilter(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openActionId, closeActionMenu]);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openQuickFilter]);

  useEffect(() => {
    const previous = previousQuickFilterRef.current;
    if (previous && previous !== openQuickFilter) {
      setQuickFilterSearch((searchState) => {
        if (!searchState[previous]) {
          return searchState;
        }
        const nextState = { ...searchState };
        delete nextState[previous];
        return nextState;
      });
    }
    previousQuickFilterRef.current = openQuickFilter;
  }, [openQuickFilter]);

  useEffect(() => {
    return () => {
      if (actionMenuCloseTimer.current) {
        clearTimeout(actionMenuCloseTimer.current);
      }
    };
  }, []);

  const minTableWidth = useMemo(
    () => computeMinWidth(visibleColumns, definitionMap),
    [visibleColumns, definitionMap],
  );

  const handleSortToggle = useMemo(
    () =>
      (columnId) => (event) => {
        if (!onSortChange) {
          return;
        }
        const isMulti = event.shiftKey || event.metaKey || event.ctrlKey;
        onSortChange(columnId, { multi: isMulti });
      },
    [onSortChange],
  );

  const getQuickFilterValue = (columnId) => {
    const meta = QUICK_FILTER_META[columnId];
    if (!meta) {
      return null;
    }

    if (meta.multi) {
      return Array.isArray(quickFilters[meta.field]) ? quickFilters[meta.field] : [];
    }

    return quickFilters[meta.field] ?? 'all';
  };

  const computeHeaderLabel = (column, definition) => {
    const meta = QUICK_FILTER_META[column.id];
    if (!meta) {
      return definition?.label ?? column.id;
    }

    const value = getQuickFilterValue(column.id);
    if (meta.multi) {
      if (!value.length) {
        return definition?.label ?? column.id;
      }
      const displayLimit = column.id === 'debtTag' ? 3 : 1;
      const visible = value.slice(0, displayLimit);
      return visible.join(', ');
    }

    if (value && value !== 'all') {
      return value;
    }
    return definition?.label ?? column.id;
  };

  const cancelQuickFilterClose = useCallback(() => {
    if (quickFilterHoverTimer.current) {
      clearTimeout(quickFilterHoverTimer.current);
      quickFilterHoverTimer.current = null;
    }
  }, []);

  const scheduleQuickFilterClose = useCallback(() => {
    cancelQuickFilterClose();
    quickFilterHoverTimer.current = setTimeout(() => {
      setOpenQuickFilter(null);
    }, 180);
  }, [cancelQuickFilterClose]);

  const openQuickFilterMenu = useCallback(
    (columnId) => {
      cancelQuickFilterClose();
      setOpenQuickFilter((prev) => (prev === columnId ? prev : columnId));
    },
    [cancelQuickFilterClose],
  );

  const showTooltip = useCallback((content, target) => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!content || !target) {
      setTooltipState(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    setTooltipState({
      content,
      left: rect.left + rect.width / 2 + window.scrollX,
      top: rect.top + window.scrollY,
    });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltipState(null);
  }, []);

  useEffect(() => {
    if (!openQuickFilter) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const container = quickFilterRefs.current.get(openQuickFilter);
      const portalNode = quickFilterPortalRef.current;
      if (
        !container ||
        container.contains(event.target) ||
        (portalNode && portalNode.contains(event.target))
      ) {
        return;
      }
      setOpenQuickFilter(null);
      hideTooltip();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenQuickFilter(null);
        hideTooltip();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openQuickFilter, hideTooltip]);

  const handleQuickFilterToggle = (columnId) => {
    const meta = QUICK_FILTER_META[columnId];
    if (!meta) {
      return;
    }
    cancelQuickFilterClose();
    setOpenQuickFilter((prev) => (prev === columnId ? null : columnId));
  };

  const handleQuickFilterSearchChange = (columnId) => (event) => {
    const meta = QUICK_FILTER_META[columnId];
    if (!meta || !meta.searchable) {
      return;
    }
    const value = event.target.value;
    const previousValue = quickFilterSearch[columnId] ?? '';
    setQuickFilterSearch((prev) => ({ ...prev, [columnId]: value }));
    setQuickFilterRestore((prev) => {
      if (!value) {
        if (!previousValue) {
          return prev;
        }
        return { ...prev, [columnId]: previousValue };
      }
      if (!prev[columnId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[columnId];
    }

    if (meta.multi) {
      return Array.isArray(quickFilters[meta.field]) ? quickFilters[meta.field] : [];
    }

    return quickFilters[meta.field] ?? 'all';
  };

  const handleQuickFilterToggle = (columnId) => {
    const meta = QUICK_FILTER_META[columnId];
    if (!meta) {
      return;
    }
    setOpenQuickFilter((prev) => {
      const next = prev === columnId ? null : columnId;
      if (prev === columnId) {
        setQuickFilterSearch((searchState) => {
          if (!searchState[columnId]) {
            return searchState;
          }
          const nextState = { ...searchState };
          delete nextState[columnId];
          return nextState;
        });
      }
      return next;
    });
    onQuickFilterSearch?.(meta.optionsKey, value);
  };

  const handleQuickFilterOptionClick = (columnId, option) => (event) => {
    event.preventDefault();
    const meta = QUICK_FILTER_META[columnId];
    if (!meta) {
      return;
    }

    if (meta.multi) {
      const current = new Set(getQuickFilterValue(columnId));
      if (current.has(option)) {
        current.delete(option);
      } else {
        current.add(option);
      }
      onQuickFilterToggle?.(meta.field, option, current.has(option));
      return;
    }

    onQuickFilterChange?.(meta.field, option === 'all' ? 'all' : option);
    setOpenQuickFilter(null);
  };

  const handleQuickFilterSearchFocus = (columnId) => () => {
    setFocusedQuickFilterSearch(columnId);
  };

  const handleQuickFilterSearchBlur = () => {
    setFocusedQuickFilterSearch(null);
  };

  const handleQuickFilterSearchClear = (columnId) => (event) => {
    event.preventDefault();
    const meta = QUICK_FILTER_META[columnId];
    if (!meta || !meta.searchable) {
      return;
    }
    const currentValue = quickFilterSearch[columnId] ?? '';
    if (!currentValue) {
      return;
    }
    setQuickFilterRestore((prev) => ({ ...prev, [columnId]: currentValue }));
    setQuickFilterSearch((prev) => ({ ...prev, [columnId]: '' }));
    onQuickFilterSearch?.(meta.optionsKey, '');
    setFocusedQuickFilterSearch(columnId);
    requestAnimationFrame(() => {
      const node = quickFilterSearchRefs.current.get(columnId);
      node?.focus();
    });
  };

  const handleQuickFilterSearchRestore = (columnId) => (event) => {
    event.preventDefault();
    const meta = QUICK_FILTER_META[columnId];
    if (!meta || !meta.searchable) {
      return;
    }
    const cached = quickFilterRestore[columnId];
    if (!cached) {
      return;
    }
    setQuickFilterSearch((prev) => ({ ...prev, [columnId]: cached }));
    onQuickFilterSearch?.(meta.optionsKey, cached);
    setQuickFilterRestore((prev) => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
    setFocusedQuickFilterSearch(columnId);
    requestAnimationFrame(() => {
      const node = quickFilterSearchRefs.current.get(columnId);
      node?.focus();
    });
  };

  const handleQuickFilterClear = (columnId) => () => {
    const meta = QUICK_FILTER_META[columnId];
    if (!meta) {
      return;
    }

    if (meta.multi) {
      const current = new Set(getQuickFilterValue(columnId));
      if (current.size === 0) {
        return;
      }
      current.forEach((option) => {
        onQuickFilterToggle?.(meta.field, option, false);
      });
      return;
    }

    if (quickFilters[meta.field] !== 'all') {
      onQuickFilterChange?.(meta.field, 'all');
    }
  const handleQuickFilterSearchChange = (columnId) => (event) => {
    const meta = QUICK_FILTER_META[columnId];
    if (!meta || !meta.searchable) {
      return;
    }
    const value = event.target.value;
    setQuickFilterSearch((prev) => ({ ...prev, [columnId]: value }));
    onQuickFilterSearch?.(meta.optionsKey, value);
  };

  const handleQuickFilterOptionClick = (columnId, option) => (event) => {
    event.preventDefault();
    const meta = QUICK_FILTER_META[columnId];
    if (!meta) {
      return;
    }

    if (meta.multi) {
      const current = new Set(getQuickFilterValue(columnId));
      if (current.has(option)) {
        current.delete(option);
      } else {
        current.add(option);
      }
      onQuickFilterToggle?.(meta.field, option, current.has(option));
      return;
    }

    onQuickFilterChange?.(meta.field, option === 'all' ? 'all' : option);
    setOpenQuickFilter(null);
  };

  const handleQuickFilterClear = (columnId) => () => {
    const meta = QUICK_FILTER_META[columnId];
    if (!meta) {
      return;
    }

    if (meta.multi) {
      const current = new Set(getQuickFilterValue(columnId));
      if (current.size === 0) {
        setOpenQuickFilter(null);
        return;
      }
      current.forEach((option) => {
        onQuickFilterToggle?.(meta.field, option, false);
      });
    } else if (quickFilters[meta.field] !== 'all') {
      onQuickFilterChange?.(meta.field, 'all');
    }

    setQuickFilterSearch((searchState) => {
      if (!searchState[columnId]) {
        return searchState;
      }
      const nextState = { ...searchState };
      delete nextState[columnId];
      return nextState;
    });
    setOpenQuickFilter(null);
  };

  const registerQuickFilterRef = (columnId) => (node) => {
    if (node) {
      quickFilterRefs.current.set(columnId, node);
    } else {
      quickFilterRefs.current.delete(columnId);
    }
  };

  const registerActionAnchor = useCallback(
    (transactionId) => (node) => {
      if (node) {
        actionAnchorRefs.current.set(transactionId, node);
      } else {
        actionAnchorRefs.current.delete(transactionId);
      }
    },
    [],
  );

  const registerQuickFilterSearchRef = useCallback(
    (columnId) => (node) => {
      if (node) {
        quickFilterSearchRefs.current.set(columnId, node);
      } else {
        quickFilterSearchRefs.current.delete(columnId);
      }
    },
    [],
  );

  const handleActionTriggerEnter = (transactionId) => {
    if (actionMenuCloseTimer.current) {
      clearTimeout(actionMenuCloseTimer.current);
      actionMenuCloseTimer.current = null;
    }
    setOpenActionId(transactionId);
  };

  const handleActionTriggerLeave = () => {
    if (actionMenuCloseTimer.current) {
      clearTimeout(actionMenuCloseTimer.current);
    }
    actionMenuCloseTimer.current = setTimeout(() => {
      closeActionMenu();
    }, 120);
  };

  const handleActionToggleClick = (transactionId) => () => {
    if (actionMenuCloseTimer.current) {
      clearTimeout(actionMenuCloseTimer.current);
      actionMenuCloseTimer.current = null;
    }
    setOpenActionSubmenu(null);
    setOpenActionId((prev) => (prev === transactionId ? null : transactionId));
  };

  const handleActionFocus = (transactionId) => {
    setOpenActionId(transactionId);
  };

  const handleActionBlur = (event) => {
    const nextFocus = event?.relatedTarget;
    const portalNode = actionMenuPortalRef.current;
    if (
      nextFocus &&
      (event.currentTarget.contains(nextFocus) ||
        (portalNode && portalNode.contains(nextFocus)))
    ) {
      return;
    }
    actionMenuCloseTimer.current = setTimeout(() => {
      closeActionMenu();
    }, 100);
  };

  const handleAction = (payload) => () => {
    onOpenAdvanced?.(payload);
    closeActionMenu();
  };

  const handleSubmenuEnter = (submenuId) => () => {
    setOpenActionSubmenu(submenuId);
  };

  const activeQuickFilterMeta = openQuickFilter ? QUICK_FILTER_META[openQuickFilter] : null;
  const activeQuickFilterOptions =
    activeQuickFilterMeta && openQuickFilter
      ? quickFilterOptions[activeQuickFilterMeta.optionsKey] ?? []
      : [];
  const activeQuickFilterValues = activeQuickFilterMeta
    ? getQuickFilterValue(openQuickFilter)
    : null;
  const activeQuickFilterSearchValue =
    openQuickFilter && activeQuickFilterMeta?.searchable
      ? quickFilterSearch[openQuickFilter] ?? ''
      : '';
  const activeQuickFilterRestoreValue =
    openQuickFilter && activeQuickFilterMeta?.searchable
      ? quickFilterRestore[openQuickFilter] ?? ''
      : '';
  const showQuickFilterRestoreButton =
    Boolean(activeQuickFilterRestoreValue) &&
    !activeQuickFilterSearchValue &&
    focusedQuickFilterSearch === openQuickFilter;
  const showQuickFilterSearchClearButton = Boolean(activeQuickFilterSearchValue);

  const isTotalRowVisible = selectionSet.size > 0;

  const quickFilterPopover =
    openQuickFilter &&
    quickFilterPosition &&
    activeQuickFilterMeta &&
    typeof document !== 'undefined'
          ? createPortal(
              <div
                ref={(node) => {
                  quickFilterPortalRef.current = node;
                }}
                className={`${styles.headerQuickFilterPopover} ${styles.headerQuickFilterOpen}`}
                style={{
                  top: `${quickFilterPosition.top}px`,
                  left: `${quickFilterPosition.left}px`,
                  width: `${quickFilterPosition.width}px`,
                }}
                role="dialog"
                aria-modal="false"
                data-testid={`transactions-quick-filter-${openQuickFilter}-popover`}
                onMouseEnter={cancelQuickFilterClose}
                onMouseLeave={scheduleQuickFilterClose}
                onFocus={cancelQuickFilterClose}
                onBlur={scheduleQuickFilterClose}
              >
            <div className={styles.quickFilterHeader}>
              <span>{activeQuickFilterMeta.label}</span>
              <button
                type="button"
                className={styles.quickFilterClear}
                onClick={handleQuickFilterClear(openQuickFilter)}
                data-testid={`transactions-quick-filter-${openQuickFilter}-clear`}
              >
                Clear filter
              </button>
            </div>
            {activeQuickFilterMeta.searchable ? (
              <div className={styles.quickFilterSearchRow}>
                <div className={styles.quickFilterSearchField}>
                  <FiSearch aria-hidden className={styles.quickFilterSearchIcon} />
                  <input
                    ref={registerQuickFilterSearchRef(openQuickFilter)}
                    type="search"
                    value={activeQuickFilterSearchValue}
                    onChange={handleQuickFilterSearchChange(openQuickFilter)}
                    onFocus={handleQuickFilterSearchFocus(openQuickFilter)}
                    onBlur={handleQuickFilterSearchBlur}
                    className={styles.quickFilterSearchInput}
                    placeholder={`Search ${activeQuickFilterMeta.label.toLowerCase()}`}
                    data-testid={`transactions-quick-filter-${openQuickFilter}-search`}
                  />
                  <div className={styles.quickFilterSearchTrailing}>
                    {showQuickFilterRestoreButton ? (
                      <button
                        type="button"
                        className={`${styles.quickFilterSearchButton} ${styles.quickFilterRestoreButton}`}
                        onClick={handleQuickFilterSearchRestore(openQuickFilter)}
                        aria-label="Restore last search"
                        data-testid={`transactions-quick-filter-${openQuickFilter}-restore-search`}
                      >
                        <FiRotateCcw aria-hidden />
                      </button>
                    ) : null}
                    {showQuickFilterSearchClearButton ? (
                      <button
                        type="button"
                        className={`${styles.quickFilterSearchButton} ${styles.quickFilterClearButton}`}
                        onClick={handleQuickFilterSearchClear(openQuickFilter)}
                        aria-label="Clear search"
                        data-testid={`transactions-quick-filter-${openQuickFilter}-clear-search`}
                      >
                        <FiX aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
            <ul className={styles.quickFilterList}>
              {activeQuickFilterMeta.multi
                ? activeQuickFilterOptions.map((option) => {
                    const optionKey = `${openQuickFilter}-${slugify(option)}`;
                    const isSelected = (activeQuickFilterValues ?? []).includes(option);
                    return (
                      <li key={optionKey}>
                        <button
                          type="button"
                          className={`${styles.quickFilterOption} ${
                            isSelected ? styles.quickFilterOptionActive : ''
                          }`}
                          onClick={handleQuickFilterOptionClick(openQuickFilter, option)}
                          data-testid={`transactions-quick-filter-${openQuickFilter}-option-${slugify(
                            option,
                          )}`}
                        >
                          {option}
                        </button>
                      </li>
                    );
                  })
                : [
                    <li key="all-option">
                      <button
                        type="button"
                        className={`${styles.quickFilterOption} ${
                          activeQuickFilterValues === 'all' ? styles.quickFilterOptionActive : ''
                        }`}
                        onClick={handleQuickFilterOptionClick(openQuickFilter, 'all')}
                        data-testid={`transactions-quick-filter-${openQuickFilter}-option-all`}
                      >
                        All
                      </button>
                    </li>,
                    ...activeQuickFilterOptions.map((option) => {
                      const optionKey = `${openQuickFilter}-${slugify(option)}`;
                      return (
                        <li key={optionKey}>
                          <button
                            type="button"
                            className={`${styles.quickFilterOption} ${
                              activeQuickFilterValues === option ? styles.quickFilterOptionActive : ''
                            }`}
                            onClick={handleQuickFilterOptionClick(openQuickFilter, option)}
                            data-testid={`transactions-quick-filter-${openQuickFilter}-option-${slugify(
                              option,
                            )}`}
                          >
                            {option}
                          </button>
                        </li>
                      );
                    }),
                  ]}
            </ul>
          </div>,
          document.body,
        )
      : null;

  const actionMenuPortal =
    openActionId &&
    actionMenuPosition &&
    openActionTransaction &&
    typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={(node) => {
              actionMenuPortalRef.current = node;
            }}
            className={`${styles.actionsMenu} ${styles.actionsMenuOpen}`}
            style={{
              top: `${actionMenuPosition.top}px`,
              left: `${actionMenuPosition.left}px`,
              width: `${actionMenuPosition.width}px`,
            }}
            role="menu"
            data-testid={`transaction-actions-menu-${openActionId}`}
            id={`transaction-actions-menu-${openActionId}`}
            aria-labelledby={`transaction-actions-trigger-${openActionId}`}
            onMouseEnter={() => handleActionTriggerEnter(openActionId)}
            onMouseLeave={handleActionTriggerLeave}
            onFocusCapture={() => handleActionTriggerEnter(openActionId)}
          >
            <button
              type="button"
              className={styles.actionsMenuItem}
              onMouseEnter={handleSubmenuEnter(null)}
              onClick={handleAction({
                mode: 'edit',
                transaction: openActionTransaction,
              })}
              data-testid={`transaction-action-edit-${openActionId}`}
            >
              <FiEdit2 aria-hidden />
              <span>Quick edit</span>
            </button>
            <button
              type="button"
              className={`${styles.actionsMenuItem} ${styles.actionsMenuDanger}`}
              onMouseEnter={handleSubmenuEnter(null)}
              onClick={handleAction({
                mode: 'delete',
                transaction: openActionTransaction,
              })}
              data-testid={`transaction-action-delete-${openActionId}`}
            >
              <FiTrash2 aria-hidden />
              <span>Delete</span>
            </button>
            <div
              className={`${styles.actionsMenuItem} ${styles.actionsMenuNested}`}
              onMouseEnter={handleSubmenuEnter('more')}
              data-testid={`transaction-action-more-${openActionId}`}
            >
              <div className={styles.actionsMenuNestedLabel}>
                <FiMoreHorizontal aria-hidden />
                <span>More actions</span>
              </div>
              <FiChevronRight className={styles.actionsMenuNestedCaret} aria-hidden />
              <div
                className={`${styles.actionsSubmenu} ${
                  openActionSubmenu === 'more' ? styles.actionsSubmenuOpen : ''
                }`}
                role="menu"
              >
                <button
                  type="button"
                  className={styles.actionsMenuItem}
                  onClick={handleAction({
                    mode: 'advanced',
                    transaction: openActionTransaction,
                    intent: 'advanced-panel',
                  })}
                  data-testid={`transaction-action-advanced-${openActionId}`}
                >
                  <FiFilter aria-hidden />
                  <span>Open advanced panel</span>
                </button>
                <button
                  type="button"
                  className={styles.actionsMenuItem}
                  onClick={handleAction({
                    mode: 'advanced',
                    transaction: openActionTransaction,
                    intent: 'duplicate-draft',
                  })}
                  data-testid={`transaction-action-duplicate-${openActionId}`}
                >
                  <FiEdit2 aria-hidden />
                  <span>Duplicate as draft</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const tooltipPortal =
    tooltipState && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={styles.tooltipPortal}
            style={{
              top: `${tooltipState.top}px`,
              left: `${tooltipState.left}px`,
            }}
            role="tooltip"
          >
            {tooltipState.content}
          </div>,
          document.body,
        )
      : null;

      setOpenActionId(null);
      setOpenActionSubmenu(null);
    }, 100);
  };

  const handleActionFocus = (transactionId) => {
    setOpenActionId(transactionId);
  };

  const handleActionBlur = (event) => {
    const nextFocus = event?.relatedTarget;
    if (nextFocus && event.currentTarget.contains(nextFocus)) {
      return;
    }
    actionMenuCloseTimer.current = setTimeout(() => {
      setOpenActionId(null);
      setOpenActionSubmenu(null);
    }, 100);
  };

  const handleAction = (payload) => () => {
    onOpenAdvanced?.(payload);
    setOpenActionId(null);
    setOpenActionSubmenu(null);
  };

  const handleSubmenuEnter = (submenuId) => () => {
    setOpenActionSubmenu(submenuId);
  };

  const isTotalRowVisible = selectionSet.size > 0;

  return (
    <section className={styles.tableCard} aria-label="Transactions history table">
      <div className={styles.tableScroll} data-testid="transactions-table-container">
        <table
          className={styles.table}
          style={{ minWidth: `${minTableWidth + STICKY_COLUMN_BUFFER}px` }}
        >
          <thead>
            <tr>
              <th
                scope="col"
                className={`${styles.headerCell} ${styles.stickyLeft} ${styles.stickyLeftEdge} ${styles.checkboxCell}`}
              >
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  aria-label="Select all transactions"
                  checked={allSelected}
                  onChange={(event) => onSelectAll?.(event.target.checked)}
                  data-testid="transaction-select-all"
                />
              </th>
              <th
                scope="col"
                className={`${styles.headerCell} ${styles.stickyLeft} ${styles.actionsCell}`}
                style={{
                  left: `${CHECKBOX_COLUMN_WIDTH}px`,
                  minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
                  width: `${ACTIONS_COLUMN_WIDTH}px`,
                }}
                aria-label="Row actions"
                title="Row actions"
              >
                <span className={styles.actionsEllipsis} aria-hidden>
                  …
                </span>
              </th>
              {visibleColumns.map((column) => {
                const definition = definitionMap.get(column.id);
                const alignClass =
                  definition?.align === 'right'
                    ? styles.headerAlignRight
                    : definition?.align === 'center'
                    ? styles.headerAlignCenter
                    : '';
                const alignClass = definition?.align === 'right' ? styles.headerAlignRight : '';
                const sortDescriptor = sortLookup.get(column.id);
                const isSorted = Boolean(sortDescriptor);
                const sortDirection = sortDescriptor?.direction ?? 'asc';
                const sortOrder = sortDescriptor ? sortDescriptor.index + 1 : null;
                const isSortable = definition?.sortable;
                const label = computeHeaderLabel(column, definition);
                const meta = QUICK_FILTER_META[column.id];
                const filterValues = meta ? getQuickFilterValue(column.id) : null;
                const displayLimit =
                  meta?.multi && Array.isArray(filterValues)
                    ? column.id === 'debtTag'
                      ? 3
                      : 1
                    : 0;
                const extraCount =
                  meta?.multi &&
                  Array.isArray(filterValues) &&
                  filterValues.length > displayLimit
                    ? filterValues.length - displayLimit
                    : 0;
                const quickFilterTooltip =
                  Array.isArray(filterValues) && filterValues.length
                    ? filterValues.join(', ')
                    : label;
                const isFilterActive = meta
                  ? meta.multi
                    ? (filterValues ?? []).length > 0
                    : filterValues && filterValues !== 'all'
                  : false;
                const baseSortTooltip = !isSorted
                  ? 'No sort applied'
                  : sortDirection === 'asc'
                  ? 'Sorted ascending'
                  : 'Sorted descending';
                const sortTooltip = onSortChange
                  ? `${baseSortTooltip} • Shift+Click to multi-sort`
                  : baseSortTooltip;
                const sortAriaLabel = !isSorted
                  ? `Sort ${definition?.label ?? column.id}`
                  : `Toggle sort for ${definition?.label ?? column.id}, currently ${
                      sortDirection === 'asc' ? 'ascending' : 'descending'
                    }`;
                const meta = QUICK_FILTER_META[column.id];
                const rawFilterValue = meta ? getQuickFilterValue(column.id) : null;
                const normalizedFilterValues = meta
                  ? meta.multi
                    ? Array.isArray(rawFilterValue)
                      ? rawFilterValue
                      : []
                    : rawFilterValue && rawFilterValue !== 'all'
                    ? [rawFilterValue]
                    : []
                  : [];
                const headerLabel =
                  normalizedFilterValues[0] ?? definition?.label ?? column.id;
                const extraCount = normalizedFilterValues.length > 1 ? normalizedFilterValues.length - 1 : 0;
                const isFilterActive = meta
                  ? meta.multi
                    ? normalizedFilterValues.length > 0
                    : Boolean(rawFilterValue && rawFilterValue !== 'all')
                  : false;
                const filterTooltip =
                  normalizedFilterValues.length > 1
                    ? normalizedFilterValues.join(', ')
                    : normalizedFilterValues.length === 1
                    ? normalizedFilterValues[0]
                    : definition?.label ?? column.id;
                const sortTooltip = isSorted
                  ? sortDirection === 'desc'
                    ? 'Sort: Descending'
                    : 'Sort: Ascending'
                  : 'Sort: None';
                const clearQuickFilter = meta ? handleQuickFilterClear(column.id) : null;
                const searchTerm = meta
                  ? (quickFilterSearch[column.id] ?? '').trim().toLowerCase()
                  : '';
                const availableOptions = meta ? quickFilterOptions[meta.optionsKey] ?? [] : [];
                const filteredOptions =
                  meta && searchTerm
                    ? availableOptions.filter((option) =>
                        String(option ?? '').toLowerCase().includes(searchTerm),
                      )
                    : availableOptions;

                return (
                  <th
                    key={column.id}
                    scope="col"
                    className={`${styles.headerCell} ${alignClass}`}
                    style={{
                      minWidth: `${Math.max(definition?.minWidth ?? 120, column.width)}px`,
                      width: `${column.width}px`,
                    }}
                    ref={registerQuickFilterRef(column.id)}
                  >
                    <div className={styles.headerInner}>
                      {meta ? (
                        <button
                          type="button"
                          className={`${styles.headerLabelButton} ${
                            isFilterActive ? styles.headerFilterActive : ''
                          }`}
                          onClick={() => handleQuickFilterToggle(column.id)}
                          onMouseEnter={(event) => {
                            openQuickFilterMenu(column.id);
                            showTooltip(quickFilterTooltip, event.currentTarget);
                          }}
                          onMouseLeave={() => {
                            scheduleQuickFilterClose();
                            hideTooltip();
                          }}
                          onFocus={(event) => {
                            openQuickFilterMenu(column.id);
                            showTooltip(quickFilterTooltip, event.currentTarget);
                          }}
                          onBlur={() => {
                            scheduleQuickFilterClose();
                            hideTooltip();
                          }}
                          data-testid={`transactions-quick-filter-${column.id}`}
                          title={
                            Array.isArray(filterValues) && filterValues.length
                              ? filterValues.join(', ')
                              : label
                          }
                          aria-haspopup="listbox"
                          aria-expanded={openQuickFilter === column.id}
                        >
                          {meta.icon ? <span className={styles.headerLabelIcon}>{meta.icon}</span> : null}
                          <span className={styles.headerLabelText}>{label}</span>
                          {extraCount > 0 ? (
                            <span className={styles.headerValueOverflow} data-testid={`transactions-quick-filter-${column.id}-more`}>
                              {column.id === 'debtTag' ? '+more' : `+${extraCount}`}
                          } ${extraCount > 0 ? styles.tooltipTrigger : ''}`.trim()}
                          onClick={() => handleQuickFilterToggle(column.id)}
                          data-testid={`transactions-quick-filter-${column.id}`}
                          data-tooltip={extraCount > 0 ? filterTooltip : undefined}
                          aria-haspopup="listbox"
                          aria-expanded={openQuickFilter === column.id}
                          aria-label={`${meta.label}${
                            isFilterActive ? ` filtered by ${filterTooltip}` : ''
                          }`}
                        >
                          {meta.icon ? <span className={styles.headerLabelIcon}>{meta.icon}</span> : null}
                          <span className={styles.headerLabelText}>{headerLabel}</span>
                          {extraCount > 0 ? (
                            <span
                              className={styles.headerValueOverflow}
                              data-testid={`transactions-quick-filter-${column.id}-more`}
                            >
                              +{extraCount}
                            </span>
                          ) : null}
                        </button>
                      ) : (
                        <span className={styles.headerStaticLabel}>{label}</span>
                      )}
                      <div className={styles.headerControls}>
                        <span className={styles.headerStaticLabel}>{headerLabel}</span>
                      )}
                      <div className={styles.headerControls}>
                        {isFilterActive && clearQuickFilter ? (
                          <button
                            type="button"
                            className={styles.headerQuickClear}
                            onClick={clearQuickFilter}
                            data-testid={`transactions-quick-filter-${column.id}-reset`}
                            aria-label={`Clear quick filter for ${meta.label}`}
                          >
                            <FiX aria-hidden />
                          </button>
                        ) : null}
                        {isSortable && onSortChange ? (
                          <button
                            type="button"
                            className={`${styles.headerSortButton} ${
                              isSorted ? styles.headerSortActive : ''
                            }`}
                            onClick={handleSortToggle(column.id)}
                            data-testid={`transactions-sort-${column.id}`}
                            aria-label={sortAriaLabel}
                            title={sortTooltip}
                            onMouseEnter={(event) => showTooltip(sortTooltip, event.currentTarget)}
                            onFocus={(event) => showTooltip(sortTooltip, event.currentTarget)}
                            onMouseLeave={hideTooltip}
                            onBlur={hideTooltip}
                            } ${styles.tooltipTrigger}`.trim()}
                            onClick={handleSortToggle(column.id)}
                            data-testid={`transactions-sort-${column.id}`}
                            aria-label={`Sort by ${definition?.label ?? column.id}${
                              sortState?.length > 1 ? ' (shift-click for multi-sort)' : ''
                            }`}
                            data-tooltip={sortTooltip}
                          >
                            <SortGlyph direction={isSorted ? sortDirection : undefined} />
                            {isSorted && sortState?.length > 1 ? (
                              <span className={styles.headerSortOrder}>{sortOrder}</span>
                            ) : null}
                          </button>
                        ) : null}
                      </div>
                      {meta ? (
                        <div
                          className={`${styles.headerQuickFilterPopover} ${
                            openQuickFilter === column.id ? styles.headerQuickFilterOpen : ''
                          }`}
                          role="dialog"
                          aria-hidden={openQuickFilter === column.id ? 'false' : 'true'}
                          data-testid={`transactions-quick-filter-${column.id}-popover`}
                        >
                          <div className={styles.quickFilterHeader}>
                            <span>{meta.label}</span>
                            <button
                              type="button"
                              className={styles.quickFilterClear}
                              onClick={clearQuickFilter}
                              data-testid={`transactions-quick-filter-${column.id}-clear`}
                            >
                              Clear
                            </button>
                          </div>
                          {meta.searchable ? (
                            <div className={styles.quickFilterSearchRow}>
                              <input
                                type="search"
                                value={quickFilterSearch[column.id] ?? ''}
                                onChange={handleQuickFilterSearchChange(column.id)}
                                placeholder={`Search ${meta.label.toLowerCase()}`}
                                className={styles.quickFilterSearchInput}
                                data-testid={`transactions-quick-filter-${column.id}-search`}
                              />
                            </div>
                          ) : null}
                          <ul className={styles.quickFilterList}>
                            {meta.multi ? null : (
                              <li>
                                <button
                                  type="button"
                                  className={`${styles.quickFilterOption} ${
                                    rawFilterValue === 'all' || !rawFilterValue
                                      ? styles.quickFilterOptionActive
                                      : ''
                                  }`}
                                  onClick={handleQuickFilterOptionClick(column.id, 'all')}
                                  data-testid={`transactions-quick-filter-${column.id}-option-all`}
                                >
                                  All
                                </button>
                              </li>
                            )}
                            {filteredOptions.length === 0 ? (
                              <li className={styles.quickFilterEmpty}>No matches</li>
                            ) : (
                              filteredOptions.map((option) => {
                                const optionKey = `${column.id}-${slugify(option)}`;
                                const isSelected = meta.multi
                                  ? normalizedFilterValues.includes(option)
                                  : rawFilterValue === option;
                                return (
                                  <li key={optionKey}>
                                    <button
                                      type="button"
                                      className={`${styles.quickFilterOption} ${
                                        isSelected ? styles.quickFilterOptionActive : ''
                                      }`}
                                      onClick={handleQuickFilterOptionClick(column.id, option)}
                                      data-testid={`transactions-quick-filter-${column.id}-option-${slugify(
                                        option,
                                      )}`}
                                    >
                                      {option}
                                    </button>
                                  </li>
                                );
                              })
                            )}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody style={{ minWidth: `${minTableWidth + STICKY_COLUMN_BUFFER}px` }}>
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className={styles.emptyState}
                  data-testid="transactions-empty-state"
                >
                  No transactions match the current search or filters.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => {
                const isSelected = selectionSet.has(txn.id);
                const rowClass = `${styles.row} ${isSelected ? styles.rowSelected : ''}`;
                return (
                  <tr key={txn.id} className={rowClass} data-testid={`transaction-row-${txn.id}`}>
                    <td
                      className={`${styles.cell} ${styles.checkboxCell} ${styles.stickyLeft} ${styles.stickyLeftEdge}`}
                      data-testid={`transaction-select-cell-${txn.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => onSelectRow?.(txn.id, event.target.checked)}
                        aria-label={`Select transaction ${txn.id}`}
                        data-testid={`transaction-select-${txn.id}`}
                      />
                    </td>
                    <td
                      className={`${styles.cell} ${styles.actionsCell} ${styles.stickyLeft}`}
                      style={{
                        left: `${CHECKBOX_COLUMN_WIDTH}px`,
                        minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
                        width: `${ACTIONS_COLUMN_WIDTH}px`,
                      }}
                      data-testid={`transaction-actions-${txn.id}`}
                    >
                      <div
                        ref={registerActionAnchor(txn.id)}
                        className={styles.actionsCellTrigger}
                        onMouseEnter={() => handleActionTriggerEnter(txn.id)}
                        onMouseLeave={handleActionTriggerLeave}
                        onFocus={() => handleActionFocus(txn.id)}
                        onBlur={handleActionBlur}
                      >
                        <button
                          type="button"
                          className={`${styles.actionsTriggerButton} ${
                            openActionId === txn.id ? styles.actionsTriggerButtonActive : ''
                          }`}
                          id={`transaction-actions-trigger-${txn.id}`}
                          data-testid={`transaction-actions-trigger-${txn.id}`}
                          aria-haspopup="menu"
                          aria-expanded={openActionId === txn.id}
                          aria-controls={`transaction-actions-menu-${txn.id}`}
                          aria-label="Show row actions"
                          onMouseEnter={() => handleActionTriggerEnter(txn.id)}
                          onClick={handleActionToggleClick(txn.id)}
                        >
                          <FiMoreHorizontal aria-hidden />
                        </button>
                      </div>
                    </td>
                    {visibleColumns.map((column) => {
                      const definition = definitionMap.get(column.id);
                      const alignClass =
                        definition?.align === 'right'
                          ? styles.cellAlignRight
                          : definition?.align === 'center'
                          ? styles.cellAlignCenter
                          : '';
                      return (
                        <td
                          key={column.id}
                          className={`${styles.cell} ${alignClass}`}
                          style={{
                            minWidth: `${Math.max(definition?.minWidth ?? 120, column.width)}px`,
                            width: `${column.width}px`,
                          }}
                          title={
                            typeof txn[column.id] === 'string'
                              ? txn[column.id]
                              : column.id === 'date'
                              ? txn.displayDate ?? txn.date
                              : undefined
                          }
                        >
                          <div className={styles.cellText}>{renderCellContent(column, txn)}</div>
                        </td>
                      );
                    })}
                    <td
                      className={`${styles.cell} ${styles.actionsCell} ${styles.stickyRight} ${styles.stickyRightEdge}`}
                      data-testid={`transaction-actions-${txn.id}`}
                    >
                      <div
                        className={styles.actionsCellTrigger}
                        onMouseEnter={() => handleActionTriggerEnter(txn.id)}
                        onMouseLeave={handleActionTriggerLeave}
                        onFocus={() => handleActionFocus(txn.id)}
                        onBlur={handleActionBlur}
                      >
                        <button
                          type="button"
                          className={`${styles.actionsTriggerButton} ${
                            openActionId === txn.id ? styles.actionsTriggerButtonActive : ''
                          }`}
                          data-testid={`transaction-actions-trigger-${txn.id}`}
                          aria-haspopup="menu"
                          aria-expanded={openActionId === txn.id}
                          aria-label="Show row actions"
                          onMouseEnter={() => handleActionTriggerEnter(txn.id)}
                        >
                          <FiMoreHorizontal aria-hidden />
                        </button>
                        <div
                          className={`${styles.actionsMenu} ${
                            openActionId === txn.id ? styles.actionsMenuOpen : ''
                          }`}
                          role="menu"
                          data-testid={`transaction-actions-menu-${txn.id}`}
                        >
                          <button
                            type="button"
                            className={styles.actionsMenuItem}
                            onMouseEnter={handleSubmenuEnter(null)}
                            onClick={handleAction({
                              mode: 'edit',
                              transaction: txn,
                            })}
                            data-testid={`transaction-action-edit-${txn.id}`}
                          >
                            <FiEdit2 aria-hidden />
                            <span>Quick edit</span>
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionsMenuItem} ${styles.actionsMenuDanger}`}
                            onMouseEnter={handleSubmenuEnter(null)}
                            onClick={handleAction({
                              mode: 'delete',
                              transaction: txn,
                            })}
                            data-testid={`transaction-action-delete-${txn.id}`}
                          >
                            <FiTrash2 aria-hidden />
                            <span>Delete</span>
                          </button>
                          <div
                            className={`${styles.actionsMenuItem} ${styles.actionsMenuNested}`}
                            onMouseEnter={handleSubmenuEnter('more')}
                            data-testid={`transaction-action-more-${txn.id}`}
                          >
                            <div className={styles.actionsMenuNestedLabel}>
                              <FiMoreHorizontal aria-hidden />
                              <span>More actions</span>
                            </div>
                            <FiChevronRight className={styles.actionsMenuNestedCaret} aria-hidden />
                            <div
                              className={`${styles.actionsSubmenu} ${
                                openActionId === txn.id && openActionSubmenu === 'more'
                                  ? styles.actionsSubmenuOpen
                                  : ''
                              }`}
                              role="menu"
                            >
                              <button
                                type="button"
                                className={styles.actionsMenuItem}
                                onClick={handleAction({
                                  mode: 'advanced',
                                  transaction: txn,
                                  intent: 'advanced-panel',
                                })}
                                data-testid={`transaction-action-advanced-${txn.id}`}
                              >
                                <FiFilter aria-hidden />
                                <span>Open advanced panel</span>
                              </button>
                              <button
                                type="button"
                                className={styles.actionsMenuItem}
                                onClick={handleAction({
                                  mode: 'advanced',
                                  transaction: txn,
                                  intent: 'duplicate-draft',
                                })}
                                data-testid={`transaction-action-duplicate-${txn.id}`}
                              >
                                <FiEdit2 aria-hidden />
                                <span>Duplicate as draft</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            {isTotalRowVisible ? (
              <tr
                className={`${styles.row} ${styles.totalRow}`}
                data-testid="transactions-total-row"
              >
                <td
                  className={`${styles.cell} ${styles.checkboxCell} ${styles.stickyLeft} ${styles.stickyLeftEdge} ${styles.totalLabelCell}`}
                  aria-hidden="true"
                />
                <td
                  className={`${styles.cell} ${styles.actionsCell} ${styles.stickyLeft} ${styles.totalLabelCell}`}
                  style={{
                    left: `${CHECKBOX_COLUMN_WIDTH}px`,
                    minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
                    width: `${ACTIONS_COLUMN_WIDTH}px`,
                  }}
                  aria-hidden="true"
                />
                {visibleColumns.map((column, index) => {
                  const definition = definitionMap.get(column.id);
                  const alignClass = definition?.align === 'right' ? styles.cellAlignRight : '';
                  let content = '';
                  if (column.id === 'amount') {
                    const toneClass =
                      selectionSummary.amount === 0
                        ? ''
                        : selectionSummary.amount > 0
                        ? styles.amountIncome
                        : styles.amountExpense;
                    content = (
                      <span className={`${styles.amountValue} ${toneClass}`}>
                        {formatAmountWithTrailing(selectionSummary.amount)}
                        {formatAmountWithTrailing(Math.abs(selectionSummary.amount))}
                      </span>
                    );
                  } else if (column.id === 'finalPrice') {
                    content = formatAmountWithTrailing(selectionSummary.finalPrice);
                  } else if (column.id === 'totalBack') {
                    content = formatAmountWithTrailing(selectionSummary.totalBack);
                  } else if (index === 0) {
                    content = <span className={styles.totalLabel}>Selected totals</span>;
                  }

                  return (
                    <td
                      key={`total-${column.id}`}
                      className={`${styles.cell} ${alignClass} ${styles.totalCell}`}
                      style={{
                        minWidth: `${Math.max(definition?.minWidth ?? 120, column.width)}px`,
                        width: `${column.width}px`,
                      }}
                    >
                      <div className={styles.cellText}>{content}</div>
                    </td>
                  );
                })}
                <td
                  className={`${styles.cell} ${styles.actionsCell} ${styles.stickyRight} ${styles.stickyRightEdge} ${styles.totalLabelCell}`}
                  aria-hidden="true"
                />
              </tr>
            ) : null}
          </tbody>
        </table>
        {tooltipPortal}
      </div>
      {quickFilterPopover}
      {actionMenuPortal}

      <div className={styles.paginationBar} data-testid="transactions-pagination">
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
      </div>
    </section>
  );
}

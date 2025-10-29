import { useMemo } from 'react';
import { FiChevronDown, FiChevronUp, FiEdit2, FiMinus } from 'react-icons/fi';

import headerStyles from './TableBaseHeader.module.css';
import tableStyles from './table-shell.module.css';
import { Tooltip } from '../ui/Tooltip';
import { ACTIONS_COLUMN_WIDTH, CHECKBOX_COLUMN_WIDTH } from './tableUtils';

function SortGlyph({ direction, isLoading }) {
  if (isLoading) {
    return <span className={headerStyles.sortSpinner} aria-hidden />;
  }
  if (direction === 'asc') {
    return <FiChevronUp aria-hidden />;
  }
  if (direction === 'desc') {
    return <FiChevronDown aria-hidden />;
  }
  return <FiMinus aria-hidden />;
}

function resolveColumnValue(transaction, descriptor) {
  if (!transaction || !descriptor) {
    return null;
  }

  const { id } = descriptor;
  if (!id) {
    return null;
  }

  const value = transaction[id];
  if (value !== undefined) {
    return value;
  }

  const fallbackKey = descriptor.definition?.valueKey;
  if (fallbackKey && fallbackKey in transaction) {
    return transaction[fallbackKey];
  }

  return null;
}

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'number') {
    return Math.abs(value) > 0;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }
    const numericPattern = /^[-+]?[$€£¥]?\s*[\d.,]+%?$/;
    if (numericPattern.test(trimmed)) {
      const normalized = trimmed
        .replace(/[$€£¥]/g, '')
        .replace(/[,\s]/g, '')
        .replace(/%$/, '');
      const numeric = Number(normalized);
      if (Number.isFinite(numeric)) {
        return Math.abs(numeric) > 0;
      }
    }
    return true;
  }

  if (typeof value === 'boolean') {
    return value === true;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasMeaningfulValue(item));
  }

  if (typeof value === 'object') {
    return Object.values(value).some((item) => hasMeaningfulValue(item));
  }

  return true;
}

export function TableBaseHeader({
  columns,
  visibleColumnIds = [],
  isColumnReorderMode = false,
  activeDropTarget,
  onColumnDragStart,
  onColumnDragEnter,
  onColumnDragOver,
  onColumnDrop,
  onColumnDragEnd,
  allSelected = false,
  isIndeterminate = false,
  onSelectAll,
  headerCheckboxRef,
  onColumnVisibilityChange,
  sortState,
  onSortChange,
  isFetching = false,
  transactions = [],
  pinnedLeftOffsets = new Map(),
  pinnedRightOffsets = new Map(),
}) {
  const visibleIdSet = useMemo(() => new Set(visibleColumnIds), [visibleColumnIds]);
  const totalVisibleColumns = visibleIdSet.size;

  const disabledSortColumnIds = useMemo(() => {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return new Set();
    }

    const disabled = new Set();
    columns.forEach((descriptor) => {
      if (!descriptor?.id) {
        return;
      }
      const hasAnyMeaningfulValue = transactions.some((txn) => {
        const value = resolveColumnValue(txn, descriptor);
        return hasMeaningfulValue(value);
      });
      if (!hasAnyMeaningfulValue) {
        disabled.add(descriptor.id);
      }
    });
    return disabled;
  }, [columns, transactions]);

  const renderColumnHeader = (descriptor) => {
    const { id, column, definition, minWidth, width, align, pinned } = descriptor;
    const title = definition?.label ?? column.id;
    const isHidden = column.visible === false;
    const isDropTarget = isColumnReorderMode && activeDropTarget === id;
    const isVisible = column.visible !== false;
    const isToggleable = id !== 'notes';
    const isLastVisible = isVisible && totalVisibleColumns <= 1 && visibleIdSet.has(id);
    const canToggle = isToggleable && !isLastVisible;

    const isSorted = sortState?.columnId === id && sortState.direction;
    const sortDirection = isSorted ? sortState.direction : null;
    const isLoading = isSorted && isFetching;
    const ariaSort = isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

    const isTaskColumn = id === 'task';

    const headerClassName = [
      headerStyles.headerCell,
      tableStyles.bodyCell,
      align === 'right'
        ? tableStyles.cellAlignRight
        : align === 'center'
        ? tableStyles.cellAlignCenter
        : '',
      isColumnReorderMode ? headerStyles.headerReorder : '',
      isDropTarget ? headerStyles.headerDropTarget : '',
      isHidden && isColumnReorderMode ? headerStyles.headerHidden : '',
      isTaskColumn ? headerStyles.taskHeaderCell : '',
      pinned === 'left' ? tableStyles.stickyLeft : '',
      pinned === 'right' ? tableStyles.stickyRight : '',
    ]
      .filter(Boolean)
      .join(' ');

    const handleSortClick = () => {
      if (isColumnReorderMode) {
        return;
      }
      const nextDirection =
        sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc';
      onSortChange?.(id, nextDirection);
    };

    const handleToggleChange = (event) => {
      if (!canToggle) {
        event.preventDefault();
        return;
      }
      onColumnVisibilityChange?.(id, event.target.checked);
    };

    const isSortDisabledForData = disabledSortColumnIds.has(id);

    const tooltipLabel = isSortDisabledForData
      ? `Sorting unavailable for ${title}`
      : isSorted
      ? sortDirection === 'asc'
        ? `Sorted ascending by ${title}`
        : `Sorted descending by ${title}`
      : `Sort by ${title}`;

    const showActiveState = isSorted && !isSortDisabledForData;
    const glyphDirection = isSortDisabledForData ? null : sortDirection;

    const baseMinWidth = isColumnReorderMode ? Math.max(minWidth, 160) : minWidth;
    const baseWidth = isColumnReorderMode ? Math.max(width, baseMinWidth) : width;
    const effectiveMinWidth = isTaskColumn ? Math.max(baseMinWidth, 80) : baseMinWidth;
    const effectiveWidth = isTaskColumn ? Math.max(baseWidth, effectiveMinWidth) : baseWidth;

    const headerLabelClassName = [
      headerStyles.headerLabel,
      isTaskColumn ? headerStyles.taskHeaderLabel : '',
    ]
      .filter(Boolean)
      .join(' ');

    const headerLabelTextClassName = [
      headerStyles.headerLabelText,
      isTaskColumn ? headerStyles.taskHeaderText : '',
    ]
      .filter(Boolean)
      .join(' ');

    const columnToggleControl = isColumnReorderMode ? (
      <label
        className={headerStyles.columnToggle}
        title={canToggle ? `Toggle ${title}` : 'At least one column must stay visible'}
        data-disabled={canToggle ? undefined : 'true'}
        data-align="end"
      >
        <input
          type="checkbox"
          checked={isVisible}
          onChange={handleToggleChange}
          aria-label={`Show or hide ${title} column`}
          aria-disabled={canToggle ? undefined : 'true'}
          data-testid={`transactions-columns-toggle-${id}`}
        />
        <span className={headerStyles.toggleTrack}>
          <span className={headerStyles.toggleThumb} />
        </span>
      </label>
    ) : null;

    const shellClassName = [
      headerStyles.headerShell,
      isColumnReorderMode ? headerStyles.headerShellReorder : '',
    ]
      .filter(Boolean)
      .join(' ');

    const pinnedStyle = pinned === 'left'
      ? { left: `${pinnedLeftOffsets.get(id) ?? 0}px` }
      : pinned === 'right'
      ? { right: `${pinnedRightOffsets.get(id) ?? 0}px` }
      : {};

    return (
      <th
        key={id}
        scope="col"
        className={headerClassName}
        style={{ minWidth: `${effectiveMinWidth}px`, width: `${effectiveWidth}px`, ...pinnedStyle }}
        draggable={isColumnReorderMode && isVisible}
        onDragStart={
          isColumnReorderMode && isVisible && onColumnDragStart
            ? onColumnDragStart(id)
            : undefined
        }
        onDragEnter={
          isColumnReorderMode && onColumnDragEnter ? onColumnDragEnter(id) : undefined
        }
        onDragOver={isColumnReorderMode ? onColumnDragOver : undefined}
        onDragEnd={isColumnReorderMode ? onColumnDragEnd : undefined}
        onDrop={isColumnReorderMode && onColumnDrop ? onColumnDrop(id) : undefined}
        aria-sort={ariaSort}
      >
        <div className={shellClassName}>
        <div className={headerStyles.headerContent}>
          <div className={headerLabelClassName}>
            <span className={headerLabelTextClassName}>{title}</span>
          </div>
        </div>
          {isColumnReorderMode ? (
            columnToggleControl
          ) : (
            <Tooltip content={tooltipLabel}>
              <button
                type="button"
                className={`${headerStyles.sortButton} ${
                  showActiveState ? headerStyles.sortButtonActive : ''
                }`.trim()}
                onClick={handleSortClick}
                disabled={isSortDisabledForData}
                aria-label={tooltipLabel}
              >
                <SortGlyph direction={glyphDirection ?? undefined} isLoading={isLoading} />
              </button>
            </Tooltip>
          )}
        </div>
      </th>
    );
  };

  return (
    <thead className={headerStyles.tableHeader}>
      <tr>
        <th
          scope="col"
          className={`${headerStyles.headerCell} ${tableStyles.checkboxCell} ${tableStyles.stickyLeft}`}
          style={{
            minWidth: `${CHECKBOX_COLUMN_WIDTH}px`,
            width: `${CHECKBOX_COLUMN_WIDTH}px`,
          }}
        >
          <div className={tableStyles.checkboxCellInner}>
            <div className={headerStyles.headerCheckboxInner}>
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                aria-label="Select all rows"
                aria-checked={isIndeterminate ? 'mixed' : allSelected ? 'true' : 'false'}
                checked={allSelected}
                onChange={(event) => onSelectAll?.(event.target.checked)}
                data-testid="transaction-select-all"
                disabled={isColumnReorderMode}
              />
            </div>
          </div>
        </th>
        {columns.map(renderColumnHeader)}
        <th
          scope="col"
          aria-label="Edit"
          className={`${headerStyles.headerCell} ${tableStyles.actionsCell} ${headerStyles.taskHeaderCell}`.trim()}
          style={{
            minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
            width: `${ACTIONS_COLUMN_WIDTH}px`,
          }}
        >
          <div className={`${headerStyles.headerShell} ${headerStyles.taskHeaderShell}`.trim()}>
            <span className={headerStyles.taskHeaderIcon} aria-hidden="true">
              <FiEdit2 />
            </span>
            <span className={headerStyles.visuallyHidden}>Edit</span>
          </div>
        </th>
      </tr>
    </thead>
  );
}

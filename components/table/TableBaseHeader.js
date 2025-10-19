import { FiX } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { DropdownWithSearchContent } from '../common/DropdownWithSearch';
import { orderFilterValues } from './tableUtils';
import { TableQuickFilterPopover } from './TableQuickFilter';

function SortIcon({ direction, dataType }) {
  const iconClass =
    dataType === 'number' ? styles.sortIconNumeric : styles.sortIconText;
  const caretClass = `${styles.sortIconCaret} ${
    direction === 'desc' ? styles.sortIconCaretDesc : ''
  }`;

  return (
    <span
      className={`${styles.sortIcon} ${direction ? styles.sortIconActive : ''}`.trim()}
      aria-hidden
    >
      <span className={iconClass}>
        {dataType === 'number' ? (
          <>
            <span>0</span>
            <span>9</span>
          </>
        ) : null}
      </span>
      <span className={caretClass} />
    </span>
  );
}

export function TableBaseHeader({
  columns,
  definitionMap,
  sortLookup,
  sortState,
  onSortToggle,
  onQuickFilterClear,
  onQuickFilterToggle,
  onQuickFilterSelect,
  quickFilterOptions,
  quickFilterMeta,
  openQuickFilter,
  quickFilterSearch,
  onQuickFilterSearch,
  registerQuickFilterAnchor,
  registerQuickFilterContent,
  isColumnReorderMode = false,
  activeDropTarget,
  onColumnDragStart,
  onColumnDragEnter,
  onColumnDragOver,
  onColumnDrop,
  onColumnDragEnd,
}) {
  return (
    <>
      {columns.map((column) => {
        const definition = definitionMap.get(column.id);
        const alignClass =
          definition?.align === 'right'
            ? styles.headerAlignRight
            : definition?.align === 'center'
            ? styles.headerAlignCenter
            : '';
        const sortDescriptor = sortLookup.get(column.id);
        const isSorted = Boolean(sortDescriptor);
        const sortDirection = sortDescriptor?.direction ?? 'asc';
        const sortOrder = sortDescriptor ? sortDescriptor.index + 1 : null;
        const isSortable = definition?.sortable;
        const meta = quickFilterMeta[column.id];
        const rawFilterValue = meta ? meta.getValue() : null;
        const normalizedFilterValues = meta
          ? meta.multi
            ? Array.isArray(rawFilterValue)
              ? rawFilterValue
              : []
            : rawFilterValue && rawFilterValue !== 'all'
            ? [rawFilterValue]
            : []
          : [];
        const orderedValues = meta?.multi
          ? orderFilterValues(column.id, normalizedFilterValues, quickFilterOptions)
          : normalizedFilterValues;
        const isFilterActive = meta
          ? meta.multi
            ? orderedValues.length > 0
            : Boolean(rawFilterValue && rawFilterValue !== 'all')
          : false;
        const headerTitle = definition?.label ?? column.id;
        const filterTooltip = orderedValues.length ? orderedValues.join(', ') : headerTitle;
        const sortTooltip = isSorted
          ? sortDirection === 'desc'
            ? 'Sort: Descending'
            : 'Sort: Ascending'
          : 'Sort: None';
        const availableOptions = meta ? quickFilterOptions[meta.optionsKey] ?? [] : [];
        const searchTerm = quickFilterSearch[column.id] ?? '';
        const dataType = definition?.dataType ?? 'string';
        const isDropping = isColumnReorderMode && activeDropTarget === column.id;

        let labelContent = (
          <span className={styles.headerLabelText}>{headerTitle}</span>
        );
        if (isFilterActive) {
          if (orderedValues.length === 1) {
            labelContent = (
              <span className={styles.headerFilterValue} title={filterTooltip}>
                {orderedValues[0]}
              </span>
            );
          } else if (orderedValues.length > 1) {
            labelContent = (
              <span
                className={`${styles.headerBadge} ${styles.headerBadgeOverflow}`}
                title={filterTooltip}
                data-testid={`transactions-quick-filter-${column.id}-count`}
              >
                +{orderedValues.length}
              </span>
            );
          }
        }

        return (
          <th
            key={column.id}
            scope="col"
            className={`${styles.headerCell} ${alignClass} ${
              isColumnReorderMode ? styles.headerReorderActive : ''
            } ${isDropping ? styles.headerReorderTarget : ''}`.trim()}
            style={{
              minWidth: `${Math.max(definition?.minWidth ?? 120, column.width)}px`,
              width: `${column.width}px`,
            }}
            ref={registerQuickFilterAnchor(column.id)}
            draggable={isColumnReorderMode}
            onDragStart={
              isColumnReorderMode && onColumnDragStart
                ? onColumnDragStart(column.id)
                : undefined
            }
            onDragEnter={
              isColumnReorderMode && onColumnDragEnter
                ? onColumnDragEnter(column.id)
                : undefined
            }
            onDragOver={isColumnReorderMode ? onColumnDragOver : undefined}
            onDragEnd={isColumnReorderMode ? onColumnDragEnd : undefined}
            onDrop={
              isColumnReorderMode && onColumnDrop
                ? onColumnDrop(column.id)
                : undefined
            }
          >
            <div className={styles.headerShell}>
              {meta ? (
                <button
                  type="button"
                  className={`${styles.headerQuickButton} ${
                    isFilterActive ? styles.headerFilterActive : ''
                  }`}
                  onClick={() => onQuickFilterToggle(column.id)}
                  data-testid={`transactions-quick-filter-${column.id}`}
                  aria-haspopup="listbox"
                  aria-expanded={openQuickFilter === column.id}
                  title={filterTooltip}
                  aria-label={
                    isFilterActive
                      ? `${meta.label ?? headerTitle}: ${filterTooltip}`
                      : meta.label ?? headerTitle
                  }
                >
                  {meta.icon ? (
                    <span className={styles.headerLabelIcon}>{meta.icon}</span>
                  ) : null}
                  {labelContent}
                </button>
              ) : (
                <span className={styles.headerStaticLabel} title={headerTitle}>
                  {headerTitle}
                </span>
              )}
              {meta && isFilterActive ? (
                <button
                  type="button"
                  className={styles.headerQuickClear}
                  onClick={() => onQuickFilterClear(column.id)}
                  data-testid={`transactions-quick-filter-${column.id}-reset`}
                  aria-label={`Clear quick filter for ${meta.label ?? headerTitle}`}
                >
                  <FiX aria-hidden />
                </button>
              ) : null}
              {isSortable && onSortToggle ? (
                <button
                  type="button"
                  className={`${styles.headerSortButton} ${
                    isSorted ? styles.headerSortActive : ''
                  }`.trim()}
                  onClick={(event) => onSortToggle(column.id, event)}
                  data-testid={`transactions-sort-${column.id}`}
                  aria-label={`Sort by ${headerTitle}`}
                  title={sortTooltip}
                >
                  <SortIcon
                    direction={isSorted ? sortDirection : undefined}
                    dataType={dataType}
                  />
                  {isSorted && sortState?.length > 1 ? (
                    <span className={styles.headerSortOrder}>{sortOrder}</span>
                  ) : null}
                </button>
              ) : null}
            </div>
            {meta ? (
              <TableQuickFilterPopover
                key={`${column.id}-popover`}
                columnId={column.id}
                anchor={meta.getAnchor()}
                isOpen={openQuickFilter === column.id}
                onClose={() => onQuickFilterToggle(column.id)}
                registerContent={registerQuickFilterContent}
                className={`${styles.headerQuickFilterPopover} ${styles.headerQuickFilterOpen}`}
                dataTestId={`transactions-quick-filter-${column.id}-popover`}
              >
                <DropdownWithSearchContent
                  variant="popover"
                  options={availableOptions}
                  includeAllOption={false}
                  searchValue={searchTerm ?? ''}
                  searchPlaceholder={`Search ${headerTitle}`}
                  onSearchChange={(value) => onQuickFilterSearch(column.id, value)}
                  onSelectOption={(option) => onQuickFilterSelect(column.id, option)}
                  selectedValue={!meta?.multi ? orderedValues[0] ?? undefined : undefined}
                  selectedValues={meta?.multi ? orderedValues : undefined}
                  multi={Boolean(meta?.multi)}
                  emptyMessage="No options available"
                  testIdPrefix={`transactions-quick-filter-${column.id}`}
                />
              </TableQuickFilterPopover>
            ) : null}
          </th>
        );
      })}
    </>
  );
}

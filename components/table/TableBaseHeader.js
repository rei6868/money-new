import { FiX } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { DropdownWithSearchContent } from '../common/DropdownWithSearch';
import { orderFilterValues } from './tableUtils';
import { TableQuickFilterPopover } from './TableQuickFilter';

function SortIcon({ direction, dataType }) {
  const iconType = dataType === 'number' ? 'number' : 'text';
  const arrowClass = `${styles.sortIconArrow} ${
    direction === 'desc' ? styles.sortIconArrowDesc : ''
  }`.trim();
  const rootClass = `${styles.sortIcon} ${direction ? styles.sortIconActive : ''}`.trim();

  return (
    <span className={rootClass} aria-hidden>
      <span
        className={`${styles.sortIconGlyph} ${
          iconType === 'number' ? styles.sortIconDigits : styles.sortIconLines
        }`.trim()}
      >
        {iconType === 'number' ? (
          <>
            <span>0</span>
            <span>9</span>
          </>
        ) : (
          <>
            <span />
            <span />
            <span />
          </>
        )}
      </span>
      <span className={arrowClass} />
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
        const isHidden = column.visible === false;
        const sortTooltip = isColumnReorderMode
          ? 'Sorting is disabled while customizing columns'
          : isSorted
          ? sortDirection === 'desc'
            ? 'Sort: Descending'
            : 'Sort: Ascending'
          : 'Sort: None';
        const availableOptions = meta ? quickFilterOptions[meta.optionsKey] ?? [] : [];
        const searchTerm = quickFilterSearch[column.id] ?? '';
        const dataType = definition?.dataType === 'number' ? 'number' : 'text';
        const isDropping = isColumnReorderMode && activeDropTarget === column.id;
        const isQuickDisabled = isColumnReorderMode;
        const isSortDisabled = isColumnReorderMode;
        const headerClassName = `${styles.headerCell} ${alignClass} ${
          isColumnReorderMode ? styles.headerReorderActive : ''
        } ${isDropping ? styles.headerReorderTarget : ''} ${
          isHidden && isColumnReorderMode ? styles.headerCellHidden : ''
        }`.trim();
        const isDraggable = isColumnReorderMode && column.visible !== false;

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
            className={headerClassName}
            style={{
              minWidth: `${Math.max(definition?.minWidth ?? 120, column.width)}px`,
              width: `${column.width}px`,
            }}
            ref={registerQuickFilterAnchor(column.id)}
            draggable={isDraggable}
            onDragStart={
              isDraggable && onColumnDragStart
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
                  disabled={isQuickDisabled}
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
                  disabled={isQuickDisabled}
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
                  disabled={isSortDisabled}
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
            {meta && !isColumnReorderMode ? (
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

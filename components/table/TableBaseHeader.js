import { FiX } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { DropdownWithSearchContent } from '../common/DropdownWithSearch';
import { orderFilterValues, slugify } from './tableUtils';
import { TableQuickFilterPopover } from './TableQuickFilter';

function SortGlyph({ direction }) {
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

function renderQuickFilterContent({
  column,
  definition,
  orderedValues,
  displayBadges,
  overflowCount,
  searchValue,
  onSearch,
  availableOptions,
  onSelect,
  meta,
  onClose,
}) {
  return (
    <div className={styles.headerQuickFilterContent}>
      <div className={styles.headerQuickFilterHeader}>
        <span className={styles.headerQuickFilterTitle}>{definition?.label ?? column.id}</span>
        <button
          type="button"
          className={styles.headerQuickFilterClose}
          onClick={onClose}
          aria-label="Close quick filter"
        >
          <FiX aria-hidden />
        </button>
      </div>
      <div className={styles.headerQuickFilterSelected}>
        {displayBadges.length > 0 ? (
          <span className={styles.headerBadgeList}>
            {displayBadges.map((value) => (
              <span key={`${column.id}-${slugify(value)}`} className={styles.headerBadge}>
                {value}
              </span>
            ))}
            {overflowCount > 0 ? (
              <span className={`${styles.headerBadge} ${styles.headerBadgeOverflow}`}>
                +{overflowCount}
              </span>
            ) : null}
          </span>
        ) : (
          <span className={styles.headerBadgeEmpty}>No quick filters selected</span>
        )}
      </div>
      <DropdownWithSearchContent
        variant="popover"
        options={availableOptions}
        includeAllOption={!meta?.multi}
        searchValue={searchValue ?? ''}
        searchPlaceholder={`Search ${definition?.label ?? column.id}`}
        onSearchChange={onSearch}
        onSelectOption={(option) => onSelect(column.id, option)}
        selectedValue={!meta?.multi ? orderedValues[0] ?? undefined : undefined}
        selectedValues={meta?.multi ? orderedValues : undefined}
        multi={Boolean(meta?.multi)}
        emptyMessage="No options available"
        testIdPrefix={`transactions-quick-filter-${column.id}`}
      />
    </div>
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
          const displayBadges = meta
            ? meta.multi
              ? orderedValues.slice(0, 3)
              : orderedValues.slice(0, 1)
            : [];
          const overflowCount = meta?.multi
            ? Math.max(orderedValues.length - displayBadges.length, 0)
            : 0;
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

          return (
            <th
              key={column.id}
              scope="col"
              className={`${styles.headerCell} ${alignClass}`}
              style={{
                minWidth: `${Math.max(definition?.minWidth ?? 120, column.width)}px`,
                width: `${column.width}px`,
              }}
              ref={registerQuickFilterAnchor(column.id)}
            >
              <div className={styles.headerInner}>
                {meta ? (
                  <button
                    type="button"
                    className={`${styles.headerLabelButton} ${
                      isFilterActive ? styles.headerFilterActive : ''
                    } ${overflowCount > 0 ? styles.tooltipTrigger : ''}`.trim()}
                    onClick={() => onQuickFilterToggle(column.id)}
                    data-testid={`transactions-quick-filter-${column.id}`}
                    data-tooltip={overflowCount > 0 ? filterTooltip : undefined}
                    aria-haspopup="listbox"
                    aria-expanded={openQuickFilter === column.id}
                    aria-label={`${meta.label}${isFilterActive ? ` filtered by ${filterTooltip}` : ''}`}
                  >
                    <span className={styles.headerLabelContent}>
                      {meta.icon ? <span className={styles.headerLabelIcon}>{meta.icon}</span> : null}
                      <span className={styles.headerLabelTitle}>{headerTitle}</span>
                      {displayBadges.length > 0 ? (
                        <span className={styles.headerBadgeList}>
                          {displayBadges.map((value) => (
                            <span key={`${column.id}-${slugify(value)}`} className={styles.headerBadge}>
                              {value}
                            </span>
                          ))}
                          {overflowCount > 0 ? (
                            <span
                              className={`${styles.headerBadge} ${styles.headerBadgeOverflow}`}
                              data-testid={`transactions-quick-filter-${column.id}-more`}
                            >
                              +{overflowCount}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ) : (
                  <span className={styles.headerStaticLabel}>{headerTitle}</span>
                )}
                <div className={styles.headerControls}>
                  {isFilterActive ? (
                    <button
                      type="button"
                      className={styles.headerQuickClear}
                      onClick={() => onQuickFilterClear(column.id)}
                      data-testid={`transactions-quick-filter-${column.id}-reset`}
                      aria-label={`Clear quick filter for ${meta?.label ?? column.id}`}
                    >
                      <FiX aria-hidden />
                    </button>
                  ) : null}
                  {isSortable && onSortToggle ? (
                    <button
                      type="button"
                      className={`${styles.headerSortButton} ${
                        isSorted ? styles.headerSortActive : ''
                      } ${styles.tooltipTrigger}`.trim()}
                      onClick={(event) => onSortToggle(column.id, event)}
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
                    {renderQuickFilterContent({
                      column,
                      definition,
                      orderedValues,
                      displayBadges,
                      overflowCount,
                      searchValue: searchTerm,
                      onSearch: (value) => onQuickFilterSearch(column.id, value),
                      availableOptions,
                      onSelect: onQuickFilterSelect,
                      meta,
                      onClose: () => onQuickFilterToggle(column.id),
                    })}
                  </TableQuickFilterPopover>
                ) : null}
              </div>
            </th>
          );
        })}
    </>
  );
}

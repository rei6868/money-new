import { useEffect, useMemo, useState } from 'react';

import { ConfirmationModal } from '../common/ConfirmationModal';
import FilterBadge from './FilterBadge';
import FilterField from './FilterField';
import AddFilterMenu from './AddFilterMenu';
import type {
  FilterCascadeContext,
  FilterColumn,
  FilterDefinition,
  FilterLineProps,
  FilterOperator,
  FilterValue,
} from './types';
import styles from './FilterLine.module.css';

const buildFilterId = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `filter-${counter}`;
  };
})();

const ensureFilterId = (filter: FilterDefinition): FilterDefinition => {
  if (filter.id) {
    return filter;
  }

  return {
    ...filter,
    id: buildFilterId(),
  };
};

const deriveInitialValue = (operator: FilterOperator | undefined): FilterValue => {
  if (!operator) {
    return null;
  }

  switch (operator.valueInput) {
    case 'toggle':
      return false;
    case 'multi-select':
      return [];
    default:
      return null;
  }
};

const summariseValue = (value: FilterValue, operator?: FilterOperator): string | undefined => {
  if (Array.isArray(value)) {
    if (operator?.options?.length) {
      const optionLookup = new Map(operator.options.map((item) => [item.value, item.label]));
      const mapped = value
        .map((item) => {
          const key = item === null || item === undefined ? '' : String(item);
          return optionLookup.get(key) ?? key;
        })
        .filter((item) => item && item.length > 0);
      if (mapped.length) {
        return mapped.join(', ');
      }
    }

    return value
      .map((item) => (item === null || item === undefined ? '' : String(item)))
      .filter((item) => item.length > 0)
      .join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  if (operator?.options?.length) {
    const stringValue = String(value);
    const match = operator.options.find((option) => option.value === stringValue);
    if (match) {
      return match.label;
    }
  }

  return String(value);
};

const findColumn = (columns: FilterColumn[], id: string) => columns.find((column) => column.id === id);

const findOperator = (column: FilterColumn | undefined, id: string) =>
  column?.operators.find((operator) => operator.id === id);

const createFilterFromColumn = (column: FilterColumn): FilterDefinition => {
  const firstOperator = column.operators[0];
  return {
    id: buildFilterId(),
    columnId: column.id,
    operatorId: firstOperator?.id ?? '',
    value: deriveInitialValue(firstOperator),
  };
};

function getCascadeContext(
  filters: FilterDefinition[],
  columns: FilterColumn[],
  index: number,
): FilterCascadeContext {
  const filter = filters[index];
  const column = findColumn(columns, filter.columnId);
  const operator = findOperator(column, filter.operatorId);
  return { filter, column, operator, index };
}

export function FilterLine({
  columns,
  defaultFilters = [],
  onFiltersChange,
  loadValueOptions,
  onColumnChange,
  onOperatorChange,
  onValueChange,
  onRemoveFilter,
  addFilterLabel,
  emptyState,
}: FilterLineProps) {
  const [filters, setFilters] = useState<FilterDefinition[]>(() =>
    defaultFilters.map((filter) => ensureFilterId(filter)),
  );
  const [openFilterId, setOpenFilterId] = useState<string | null>(null);
  const [pendingNewFilterId, setPendingNewFilterId] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  useEffect(() => {
    const initialFilters = defaultFilters.map((filter) => ensureFilterId(filter));
    setFilters(initialFilters);
    setOpenFilterId(null);
    setPendingNewFilterId(null);
  }, [defaultFilters]);

  useEffect(() => {
    if (openFilterId && !filters.some((filter) => filter.id === openFilterId)) {
      setOpenFilterId(null);
    }
  }, [filters, openFilterId]);

  const updateFilters = (updater: (filters: FilterDefinition[]) => FilterDefinition[]) => {
    setFilters((previous) => {
      const next = updater(previous);
      onFiltersChange?.(next);
      return next;
    });
  };

  const usedColumnIds = useMemo(() => new Set(filters.map((filter) => filter.columnId)), [filters]);

  const availableColumnsForAdd = useMemo(
    () => columns.filter((column) => !usedColumnIds.has(column.id)),
    [columns, usedColumnIds],
  );

  const openFilterIndex = useMemo(
    () => filters.findIndex((filter) => filter.id === openFilterId),
    [filters, openFilterId],
  );
  const openFilter = openFilterIndex >= 0 ? filters[openFilterIndex] : null;

  const availableColumnsForOpenFilter = useMemo(() => {
    if (!openFilter) {
      return availableColumnsForAdd;
    }

    const reserved = new Set(
      filters.filter((candidate) => candidate.id !== openFilter.id).map((candidate) => candidate.columnId),
    );

    return columns.filter(
      (column) => column.id === openFilter.columnId || !reserved.has(column.id),
    );
  }, [availableColumnsForAdd, columns, filters, openFilter]);

  const handleAddFilter = (column: FilterColumn) => {
    updateFilters((previous) => {
      const nextFilter = createFilterFromColumn(column);
      setOpenFilterId(nextFilter.id);
      setPendingNewFilterId(nextFilter.id);
      return [...previous, nextFilter];
    });
  };

  const handleColumnChangeInternal = (index: number, nextColumnId: string) => {
    updateFilters((previous) => {
      const nextFilters = [...previous];
      const current = nextFilters[index];
      const nextColumn = findColumn(columns, nextColumnId);
      const nextOperator = nextColumn?.operators[0];
      const previousColumnId = current.columnId;
      nextFilters[index] = {
        ...current,
        columnId: nextColumnId,
        operatorId: nextOperator?.id ?? '',
        value: deriveInitialValue(nextOperator),
      };
      const cascade = getCascadeContext(nextFilters, columns, index);
      onColumnChange?.({ ...cascade, previousColumnId });
      onOperatorChange?.({ ...cascade, previousOperatorId: current.operatorId });
      onValueChange?.({ ...cascade, previousValue: current.value });
      return nextFilters;
    });
  };

  const handleOperatorChangeInternal = (index: number, nextOperatorId: string) => {
    updateFilters((previous) => {
      const nextFilters = [...previous];
      const current = nextFilters[index];
      const column = findColumn(columns, current.columnId);
      const nextOperator = findOperator(column, nextOperatorId);
      const previousOperatorId = current.operatorId;
      nextFilters[index] = {
        ...current,
        operatorId: nextOperatorId,
        value: deriveInitialValue(nextOperator),
      };
      const cascade = getCascadeContext(nextFilters, columns, index);
      onOperatorChange?.({ ...cascade, previousOperatorId });
      onValueChange?.({ ...cascade, previousValue: current.value });
      return nextFilters;
    });
  };

  const handleValueChangeInternal = (index: number, nextValue: FilterValue) => {
    updateFilters((previous) => {
      const nextFilters = [...previous];
      const current = nextFilters[index];
      nextFilters[index] = {
        ...current,
        value: nextValue,
      };
      const cascade = getCascadeContext(nextFilters, columns, index);
      onValueChange?.({ ...cascade, previousValue: current.value });
      return nextFilters;
    });
  };

  const handleRemoveFilter = (index: number) => {
    updateFilters((previous) => {
      const nextFilters = [...previous];
      const [removed] = nextFilters.splice(index, 1);
      const cascade = { ...getCascadeContext(previous, columns, index) };
      onRemoveFilter?.(cascade);
      if (removed?.id === openFilterId) {
        setOpenFilterId(null);
      }
      if (removed?.id && pendingNewFilterId === removed.id) {
        setPendingNewFilterId(null);
      }
      return nextFilters;
    });
  };

  const handleApplyFilter = (filterId: string) => {
    if (pendingNewFilterId === filterId) {
      setPendingNewFilterId(null);
    }
    setOpenFilterId(null);
  };

  const handleCancelFilter = (filterId: string) => {
    if (pendingNewFilterId === filterId) {
      updateFilters((previous) => previous.filter((filter) => filter.id !== filterId));
      setPendingNewFilterId(null);
    }
    setOpenFilterId(null);
  };

  const handleClearAllConfirmed = () => {
    setIsConfirmingClear(false);
    setPendingNewFilterId(null);
    setOpenFilterId(null);
    updateFilters((previous) => {
      previous.forEach((_, index) => {
        const cascade = { ...getCascadeContext(previous, columns, index) };
        onRemoveFilter?.(cascade);
      });
      return [];
    });
  };

  const collapsedFilters = filters.filter((filter) => filter.id !== openFilterId);
  const openColumn = openFilter ? findColumn(columns, openFilter.columnId) : undefined;
  const openOperator = openColumn ? findOperator(openColumn, openFilter.operatorId) : undefined;

  return (
    <div className={styles.container}>
      <div className={styles.bar}>
        <div className={styles.badgesScroller}>
          {collapsedFilters.length ? (
            collapsedFilters.map((filter) => {
              const column = findColumn(columns, filter.columnId);
              const operator = findOperator(column, filter.operatorId);
              const absoluteIndex = filters.findIndex((candidate) => candidate.id === filter.id);
              if (absoluteIndex === -1) {
                return null;
              }
              return (
                <FilterBadge
                  key={filter.id}
                  filter={filter}
                  columnLabel={column?.label}
                  operatorLabel={operator?.label}
                  valueLabel={summariseValue(filter.value, operator)}
                  onClick={() => setOpenFilterId(filter.id)}
                  onRemove={() => handleRemoveFilter(absoluteIndex)}
                />
              );
            })
          ) : filters.length ? (
            <span className={styles.badgeEmpty}>Editing filter…</span>
          ) : (
            emptyState ?? <span className={styles.badgeEmpty}>No filters applied.</span>
          )}
        </div>
        <div className={styles.actions}>
          <AddFilterMenu
            columns={availableColumnsForAdd}
            onSelect={handleAddFilter}
            label={addFilterLabel}
          />
          {filters.length ? (
            <button
              type="button"
              className={styles.clearAllButton}
              onClick={() => setIsConfirmingClear(true)}
            >
              Clear all
            </button>
          ) : null}
        </div>
      </div>

      {openFilter && openFilterIndex >= 0 ? (
        <FilterField
          filter={openFilter}
          column={openColumn}
          operator={openOperator}
          columns={columns}
          availableColumns={availableColumnsForOpenFilter}
          onColumnChange={(columnId) => handleColumnChangeInternal(openFilterIndex, columnId)}
          onOperatorChange={(operatorId) => handleOperatorChangeInternal(openFilterIndex, operatorId)}
          onValueChange={(nextValue) => handleValueChangeInternal(openFilterIndex, nextValue)}
          onRemove={() => handleRemoveFilter(openFilterIndex)}
          onApply={() => handleApplyFilter(openFilter.id)}
          onCancel={() => handleCancelFilter(openFilter.id)}
          loadValueOptions={loadValueOptions}
        />
      ) : null}

      <ConfirmationModal
        isOpen={isConfirmingClear}
        title="Clear all filters"
        message="Are you sure to clear all filters?"
        confirmLabel="Clear"
        confirmTone="danger"
        onConfirm={handleClearAllConfirmed}
        onCancel={() => setIsConfirmingClear(false)}
      />
    </div>
  );
}

export default FilterLine;

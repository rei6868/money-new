import { useEffect, useMemo, useState } from 'react';
import FilterBadge from './FilterBadge';
import FilterField from './FilterField';
import AddFilterMenu from './AddFilterMenu';
import type {
  FilterCascadeContext,
  FilterColumn,
  FilterDefinition,
  FilterLineProps,
  FilterOperator,
} from './types';
import { FilterValue } from './types';
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

const summariseValue = (value: FilterValue): string | undefined => {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
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
  const [openFilterId, setOpenFilterId] = useState<string | null>(() => filters[0]?.id ?? null);

  useEffect(() => {
    const initialFilters = defaultFilters.map((filter) => ensureFilterId(filter));
    setFilters(initialFilters);
    setOpenFilterId(initialFilters[0]?.id ?? null);
  }, [defaultFilters]);

  useEffect(() => {
    if (!filters.length) {
      setOpenFilterId(null);
      return;
    }

    if (!openFilterId || !filters.some((filter) => filter.id === openFilterId)) {
      setOpenFilterId(filters[0].id);
    }
  }, [filters, openFilterId]);

  const availableColumns = useMemo(() => columns, [columns]);

  const updateFilters = (updater: (filters: FilterDefinition[]) => FilterDefinition[]) => {
    setFilters((previous) => {
      const next = updater(previous);
      onFiltersChange?.(next);
      return next;
    });
  };

  const handleAddFilter = (column: FilterColumn) => {
    updateFilters((previous) => {
      const next = [...previous, createFilterFromColumn(column)];
      return next;
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

  const handleValueChangeInternal = (index: number, value: FilterValue) => {
    updateFilters((previous) => {
      const nextFilters = [...previous];
      const current = nextFilters[index];
      nextFilters[index] = {
        ...current,
        value,
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
        setOpenFilterId(nextFilters[0]?.id ?? null);
      }
      return nextFilters;
    });
  };

  return (
    <div className={styles.container}>
      {filters.length ? (
        <div className={styles.filtersRow}>
          {filters.map((filter, index) => {
            const column = findColumn(availableColumns, filter.columnId);
            const operator = findOperator(column, filter.operatorId);
            const isOpen = filter.id === openFilterId;
            if (isOpen) {
              return (
                <FilterField
                  key={filter.id}
                  filter={filter}
                  column={column}
                  operator={operator}
                  columns={availableColumns}
                  onColumnChange={(columnId) => handleColumnChangeInternal(index, columnId)}
                  onOperatorChange={(operatorId) => handleOperatorChangeInternal(index, operatorId)}
                  onValueChange={(value) => handleValueChangeInternal(index, value)}
                  onRemove={() => handleRemoveFilter(index)}
                  loadValueOptions={loadValueOptions}
                />
              );
            }

            return (
              <FilterBadge
                key={filter.id}
                filter={filter}
                columnLabel={column?.label}
                operatorLabel={operator?.label}
                valueLabel={summariseValue(filter.value)}
                onClick={() => setOpenFilterId(filter.id)}
              />
            );
          })}
        </div>
      ) : (
        emptyState ?? <p style={{ margin: 0, color: '#52606d' }}>No filters applied.</p>
      )}

      <div className={styles.actionsRow}>
        <AddFilterMenu columns={availableColumns} onSelect={handleAddFilter} label={addFilterLabel} />
      </div>
    </div>
  );
}

export default FilterLine;

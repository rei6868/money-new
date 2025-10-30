import { ReactNode } from 'react';

export type Primitive = string | number | boolean | null | undefined;

export type FilterValue = Primitive | Primitive[] | Record<string, Primitive> | null;

export interface FilterOption {
  label: string;
  value: string;
  description?: string;
}

export type FilterValueInput =
  | 'text'
  | 'number'
  | 'date'
  | 'datetime-local'
  | 'select'
  | 'multi-select'
  | 'toggle'
  | 'none';

export interface FilterOperator {
  id: string;
  label: string;
  valueInput: FilterValueInput;
  placeholder?: string;
  options?: FilterOption[];
  description?: ReactNode;
}

export interface FilterColumn {
  id: string;
  label: string;
  helperText?: ReactNode;
  operators: FilterOperator[];
  icon?: ReactNode;
}

export interface FilterDefinition {
  id: string;
  columnId: string;
  operatorId: string;
  value: FilterValue;
  isPinned?: boolean;
}

export interface FilterCascadeContext {
  index: number;
  filter: FilterDefinition;
  column: FilterColumn | undefined;
  operator: FilterOperator | undefined;
}

export interface FilterLineProps {
  columns: FilterColumn[];
  defaultFilters?: FilterDefinition[];
  onFiltersChange?: (filters: FilterDefinition[]) => void;
  loadValueOptions?: (context: {
    columnId: string;
    operatorId: string;
    search: string;
    signal?: AbortSignal;
  }) => Promise<FilterOption[]>;
  onColumnChange?: (context: FilterCascadeContext & { previousColumnId?: string }) => void;
  onOperatorChange?: (context: FilterCascadeContext & { previousOperatorId?: string }) => void;
  onValueChange?: (context: FilterCascadeContext & { previousValue: FilterValue }) => void;
  onRemoveFilter?: (context: FilterCascadeContext) => void;
  addFilterLabel?: string;
  emptyState?: ReactNode;
}

export interface AddFilterMenuProps {
  columns: FilterColumn[];
  onSelect: (column: FilterColumn) => void;
  label?: string;
}

export interface FilterFieldProps {
  filter: FilterDefinition;
  column: FilterColumn | undefined;
  operator: FilterOperator | undefined;
  columns: FilterColumn[];
  onColumnChange: (columnId: string) => void;
  onOperatorChange: (operatorId: string) => void;
  onValueChange: (value: FilterValue) => void;
  onRemove: () => void;
  loadValueOptions?: FilterLineProps['loadValueOptions'];
}

export interface FilterBadgeProps {
  filter: FilterDefinition;
  columnLabel?: string;
  operatorLabel?: string;
  valueLabel?: string;
  onClick?: () => void;
}

export interface FilterInputProps {
  columnId: string;
  operator: FilterOperator | undefined;
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  loadValueOptions?: FilterLineProps['loadValueOptions'];
}

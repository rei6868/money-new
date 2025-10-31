import type { ReactNode } from 'react';

export type ReusableDropdownOption =
  | string
  | number
  | {
      key?: string;
      value?: string | number;
      id?: string | number;
      label?: string;
      description?: ReactNode;
    };

export interface ReusableDropdownProps {
  options?: ReusableDropdownOption[];
  value?: string | number | string[] | null | undefined;
  onChange?: (value: string | string[], option: ReusableDropdownOption | null) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  testIdPrefix?: string;
  disabled?: boolean;
  className?: string;
  openOnMount?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  searchPlaceholder?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
  ariaLabel?: string;
  hasError?: boolean;
  multiple?: boolean;
  onSearchTermChange?: (term: string) => void;
  isLoading?: boolean;
  emptyState?: ReactNode;
}

declare function ReusableDropdown(props: ReusableDropdownProps): JSX.Element;

export default ReusableDropdown;

import { useEffect, useMemo, useState } from 'react';

import ReusableDropdown from '../common/ReusableDropdown';
import styles from './FilterLine.module.css';
import type { FilterInputProps, FilterOption } from './types';

const toStringValue = (candidate: unknown, fallback = ''): string => {
  if (candidate === null || candidate === undefined) {
    return fallback;
  }

  return String(candidate);
};

export function FilterInput({ columnId, operator, value, onChange, loadValueOptions }: FilterInputProps) {
  const [search, setSearch] = useState('');
  const [asyncOptions, setAsyncOptions] = useState<FilterOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSearch('');
    setAsyncOptions([]);
    setIsLoading(false);
  }, [columnId, operator?.id]);

  useEffect(() => {
    if (!operator) {
      return undefined;
    }

    if (operator.valueInput !== 'select' && operator.valueInput !== 'multi-select') {
      return undefined;
    }

    if (!loadValueOptions) {
      setAsyncOptions(operator.options ?? []);
      return undefined;
    }

    const controller = new AbortController();
    setIsLoading(true);

    loadValueOptions({
      columnId,
      operatorId: operator.id,
      search,
      signal: controller.signal,
    })
      .then((options) => {
        setAsyncOptions(Array.isArray(options) ? options : []);
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          console.error('Failed to load filter options', error);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [columnId, operator, loadValueOptions, search]);

  const options = useMemo(() => {
    if (!operator) {
      return [];
    }

    if (loadValueOptions) {
      return asyncOptions;
    }

    return operator.options ?? [];
  }, [operator, asyncOptions, loadValueOptions]);

  if (!operator) {
    return null;
  }

  if (operator.valueInput === 'none') {
    return null;
  }

  if (operator.valueInput === 'toggle') {
    const isActive = Boolean(value);
    return (
      <button
        type="button"
        className={styles.toggleButton}
        data-active={isActive ? 'true' : 'false'}
        onClick={() => onChange(!isActive)}
        aria-pressed={isActive}
      >
        <span>{operator.label}</span>
        <span>{isActive ? 'Enabled' : 'Disabled'}</span>
      </button>
    );
  }

  if (operator.valueInput === 'select' || operator.valueInput === 'multi-select') {
    const isMulti = operator.valueInput === 'multi-select';
    const normalizedValue = isMulti
      ? Array.isArray(value)
        ? value.map((item) => toStringValue(item)).filter((item) => item.length > 0)
        : []
      : (() => {
          const stringValue = toStringValue(value);
          return stringValue.length > 0 ? stringValue : '';
        })();

    const handleSelectChange = (next: string | string[]) => {
      if (isMulti) {
        onChange(Array.isArray(next) ? next : []);
        return;
      }

      const nextValue = typeof next === 'string' ? next : Array.isArray(next) ? next[0] ?? '' : '';
      onChange(nextValue ? nextValue : null);
    };

    return (
      <ReusableDropdown
        value={normalizedValue as string | string[]}
        onChange={handleSelectChange}
        options={options}
        placeholder={operator.placeholder ?? 'Select value'}
        searchPlaceholder={operator.placeholder ?? 'Search'}
        multiple={isMulti}
        onSearchTermChange={setSearch}
        className={styles.dropdownControl}
        isLoading={isLoading}
      />
    );
  }

  const inputType = operator.valueInput;
  const typed = toStringValue(value);

  return (
    <input
      type={inputType}
      placeholder={operator.placeholder ?? ''}
      value={typed}
      onChange={(event) => onChange(event.target.value)}
      className={styles.textInput}
    />
  );
}

export default FilterInput;

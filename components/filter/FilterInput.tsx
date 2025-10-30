import { useEffect, useMemo, useState } from 'react';
import type { FilterInputProps, FilterOption } from './types';

const typedValue = (value: unknown, fallback: string) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

export function FilterInput({ columnId, operator, value, onChange, loadValueOptions }: FilterInputProps) {
  const [search, setSearch] = useState('');
  const [asyncOptions, setAsyncOptions] = useState<FilterOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSearch('');
    setAsyncOptions([]);
  }, [columnId, operator?.id]);

  useEffect(() => {
    if (!operator) {
      return;
    }

    if (operator.valueInput !== 'select' && operator.valueInput !== 'multi-select') {
      return;
    }

    if (!loadValueOptions) {
      setAsyncOptions(operator.options ?? []);
      return;
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
        setAsyncOptions(options);
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          console.error('Failed to load filter options', error);
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [columnId, operator, loadValueOptions, search]);

  const options = useMemo(() => {
    if (!operator) {
      return [];
    }

    if (operator.options && !loadValueOptions) {
      return operator.options;
    }

    return asyncOptions;
  }, [operator, asyncOptions, loadValueOptions]);

  if (!operator || operator.valueInput === 'none') {
    return null;
  }

  if (operator.valueInput === 'toggle') {
    const isChecked = Boolean(value);
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{operator.label}</span>
      </label>
    );
  }

  if (operator.valueInput === 'select' || operator.valueInput === 'multi-select') {
    const isMulti = operator.valueInput === 'multi-select';
    const stringValue = Array.isArray(value)
      ? value.map((item) => typedValue(item, ''))
      : value !== null && value !== undefined
      ? [typedValue(value, '')]
      : [];

    const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
      onChange(isMulti ? selected : selected[0] ?? null);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loadValueOptions ? (
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={operator.placeholder ?? 'Search values'}
          />
        ) : null}
        <select
          multiple={isMulti}
          value={stringValue}
          onChange={handleSelectChange}
          disabled={isLoading}
          size={Math.min(Math.max(options.length, 3), 8)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} title={option.description ?? undefined}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const inputType = operator.valueInput;
  return (
    <input
      type={inputType}
      placeholder={operator.placeholder ?? ''}
      value={typedValue(value, '')}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default FilterInput;

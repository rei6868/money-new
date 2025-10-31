import { useMemo, useState } from 'react';

import ReusableDropdown from '../common/ReusableDropdown';
import styles from './FilterLine.module.css';
import type { AddFilterMenuProps } from './types';

export function AddFilterMenu({ columns, onSelect, label }: AddFilterMenuProps) {
  const [selectedValue, setSelectedValue] = useState('');

  const options = useMemo(
    () =>
      columns.map((column) => ({
        value: column.id,
        label: column.label,
      })),
    [columns],
  );

  const placeholder = label ? `＋ ${label}` : '＋ Add filter';

  const handleChange = (value: string) => {
    const column = columns.find((item) => item.id === value);
    if (column) {
      onSelect(column);
    }
    setSelectedValue('');
  };

  return (
    <ReusableDropdown
      value={selectedValue}
      onChange={(value) => {
        if (Array.isArray(value)) {
          return;
        }
        handleChange(value);
      }}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="Search columns"
      className={styles.addDropdown}
      disabled={columns.length === 0}
      ariaLabel="Add filter"
      testIdPrefix="filter-line-add"
    />
  );
}

export default AddFilterMenu;

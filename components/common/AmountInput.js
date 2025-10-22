import { useEffect, useMemo, useState } from 'react';

import styles from './AmountInput.module.css';

const NON_NUMERIC_PATTERN = /[^0-9.]/g;
const LEADING_ZERO_PATTERN = /^0+(?=\d)/;
const GROUP_SEPARATOR_PATTERN = /\B(?=(\d{3})+(?!\d))/g;

export const parseInputValue = (inputValue) => {
  if (inputValue === null || inputValue === undefined) {
    return '';
  }

  const stringValue = String(inputValue);
  if (!stringValue.trim()) {
    return '';
  }

  const trimmedValue = stringValue.trim();
  const isNegative = trimmedValue.startsWith('-');
  const withoutGrouping = trimmedValue.replace(/,/g, '');
  const hasDecimalSeparator = withoutGrouping.includes('.');
  const numericPortion = withoutGrouping.replace(NON_NUMERIC_PATTERN, '');

  if (!numericPortion) {
    return '';
  }

  const [integerPartRaw = '', ...decimalParts] = numericPortion.split('.');
  const decimalPart = decimalParts.join('');
  const normalizedInteger = integerPartRaw.replace(LEADING_ZERO_PATTERN, '');
  const integerPart = normalizedInteger || (integerPartRaw ? '0' : '');

  const hasDecimal = hasDecimalSeparator && (decimalPart.length > 0 || decimalParts.length > 0);

  if (!integerPart && !decimalPart && !hasDecimal) {
    return '';
  }

  const prefix = isNegative && (integerPart || decimalPart || hasDecimal) ? '-' : '';
  const baseInteger = integerPart || '0';
  const decimalSegment = decimalPart ? `.${decimalPart}` : hasDecimal ? '.' : '';
  return `${prefix}${baseInteger}${decimalSegment}`;
};

export const formatDisplayValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined) {
    return '';
  }

  const stringValue = String(rawValue);
  if (!stringValue.trim()) {
    return '';
  }

  const parsedValue = parseInputValue(stringValue);
  if (!parsedValue) {
    return '';
  }

  const isNegative = parsedValue.startsWith('-');
  const unsignedValue = isNegative ? parsedValue.slice(1) : parsedValue;
  const [integerPart = '0', decimalPart = ''] = unsignedValue.split('.');
  const safeIntegerPart = integerPart || '0';
  const formattedInteger = safeIntegerPart.replace(GROUP_SEPARATOR_PATTERN, ',');
  const showTrailingDecimal = unsignedValue.endsWith('.') && !decimalPart;
  const decimalSection = decimalPart ? `.${decimalPart}` : showTrailingDecimal ? '.' : '';
  return `${isNegative ? '-' : ''}${formattedInteger}${decimalSection}`;
};

export default function AmountInput({
  value,
  onChange,
  placeholder = '',
  id,
  label,
  className = '',
  inputMode = 'decimal',
  wrapperClassName = '',
  labelClassName = '',
  name,
  ...rest
}) {
  const formattedFromValue = useMemo(() => formatDisplayValue(value), [value]);
  const [displayValue, setDisplayValue] = useState(formattedFromValue);

  useEffect(() => {
    setDisplayValue(formattedFromValue);
  }, [formattedFromValue]);

  const handleChange = (event) => {
    const nextDisplayValue = event.target.value;
    const rawNumericValue = parseInputValue(nextDisplayValue);
    onChange?.(rawNumericValue);

    const nextFormattedValue = formatDisplayValue(rawNumericValue);
    setDisplayValue(nextFormattedValue);
  };

  const containerClasses = [styles.container, wrapperClassName].filter(Boolean).join(' ');
  const labelClasses = [styles.label, labelClassName].filter(Boolean).join(' ');
  const inputClasses = [styles.input, className].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {label ? (
        <label className={labelClasses} htmlFor={id}>
          {label}
        </label>
      ) : null}
      <input
        id={id}
        name={name}
        type="text"
        inputMode={inputMode}
        className={inputClasses}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        {...rest}
      />
    </div>
  );
}

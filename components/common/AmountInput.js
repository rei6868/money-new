import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import styles from './AmountInput.module.css';

const NON_NUMERIC_PATTERN = /[^0-9.]/g;
const LEADING_ZERO_PATTERN = /^0+(?=\d)/;
const GROUP_SEPARATOR_PATTERN = /\B(?=(\d{3})+(?!\d))/g;

const SUGGESTION_MULTIPLIERS = [1000, 10000, 100000];

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

const generateSuggestions = (rawValue) => {
  const normalizedValue = parseInputValue(rawValue);
  if (!normalizedValue) {
    return [];
  }

  if (normalizedValue.includes('.') || normalizedValue.startsWith('-')) {
    return [];
  }

  if (!/^\d+$/.test(normalizedValue)) {
    return [];
  }

  const base = Number.parseInt(normalizedValue, 10);
  if (!Number.isFinite(base) || base === 0) {
    return [];
  }

  const seenRawValues = new Set();
  const suggestions = [];

  for (const multiplier of SUGGESTION_MULTIPLIERS) {
    const suggestionValue = base * multiplier;
    if (!Number.isFinite(suggestionValue) || suggestionValue <= 0) {
      continue;
    }

    const rawSuggestion = String(Math.trunc(suggestionValue));
    if (seenRawValues.has(rawSuggestion) || rawSuggestion === normalizedValue) {
      continue;
    }

    seenRawValues.add(rawSuggestion);
    suggestions.push({
      raw: rawSuggestion,
      formatted: formatDisplayValue(rawSuggestion),
    });
  }

  return suggestions.slice(0, 3);
};

export default function AmountInput({
  value,
  onChange,
  onFocus,
  onBlur,
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
  const normalizedRawValue = useMemo(() => parseInputValue(value), [value]);
  const formattedFromValue = useMemo(
    () => formatDisplayValue(normalizedRawValue),
    [normalizedRawValue],
  );
  const [displayValue, setDisplayValue] = useState(formattedFromValue);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const suggestionBoxRef = useRef(null);
  const hideSuggestionsTimeoutRef = useRef(null);
  const suppressFocusSuggestionsRef = useRef(false);
  const calculatedSuggestions = useMemo(
    () => generateSuggestions(normalizedRawValue),
    [normalizedRawValue],
  );

  useEffect(() => {
    setDisplayValue(formattedFromValue);
  }, [formattedFromValue]);

  useEffect(() => {
    setSuggestions(calculatedSuggestions);
    if (calculatedSuggestions.length === 0) {
      setShowSuggestions(false);
    }
  }, [calculatedSuggestions]);

  useEffect(() => {
    return () => {
      if (hideSuggestionsTimeoutRef.current) {
        clearTimeout(hideSuggestionsTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (event) => {
    const nextDisplayValue = event.target.value;
    const rawNumericValue = parseInputValue(nextDisplayValue);
    onChange?.(rawNumericValue);

    const nextFormattedValue = formatDisplayValue(rawNumericValue);
    setDisplayValue(nextFormattedValue);

    const nextSuggestions = generateSuggestions(rawNumericValue);
    setSuggestions(nextSuggestions);
    setShowSuggestions(nextSuggestions.length > 0);
  };

  const handleFocus = useCallback(
    (event) => {
      if (hideSuggestionsTimeoutRef.current) {
        clearTimeout(hideSuggestionsTimeoutRef.current);
        hideSuggestionsTimeoutRef.current = null;
      }

      if (suppressFocusSuggestionsRef.current) {
        suppressFocusSuggestionsRef.current = false;
        return;
      }

      if (suggestions.length > 0) {
        setShowSuggestions(true);
      }

      onFocus?.(event);
    },
    [onFocus, suggestions.length],
  );

  const handleBlur = useCallback(
    (event) => {
      if (hideSuggestionsTimeoutRef.current) {
        clearTimeout(hideSuggestionsTimeoutRef.current);
      }

      hideSuggestionsTimeoutRef.current = setTimeout(() => {
        const activeElement = document.activeElement;
        if (suggestionBoxRef.current?.contains(activeElement)) {
          return;
        }

        setShowSuggestions(false);
      }, 120);

      onBlur?.(event);
    },
    [onBlur],
  );

  const handleSuggestionClick = useCallback(
    (suggestion) => {
      if (!suggestion) {
        return;
      }

      if (hideSuggestionsTimeoutRef.current) {
        clearTimeout(hideSuggestionsTimeoutRef.current);
        hideSuggestionsTimeoutRef.current = null;
      }

      const rawValue = suggestion.raw;
      onChange?.(rawValue);
      setDisplayValue(formatDisplayValue(rawValue));
      setShowSuggestions(false);

      suppressFocusSuggestionsRef.current = true;

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [onChange],
  );

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
        onFocus={handleFocus}
        onBlur={handleBlur}
        ref={inputRef}
        placeholder={placeholder}
        {...rest}
      />
      {showSuggestions && suggestions.length > 0 ? (
        <div className={styles.suggestionsContainer} ref={suggestionBoxRef}>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.raw}
              type="button"
              className={styles.suggestionButton}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseDown={(event) => event.preventDefault()}
              tabIndex={-1}
            >
              {suggestion.formatted}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

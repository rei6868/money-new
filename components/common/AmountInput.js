import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { containsDivisionByZero, normalizeExpression, safeEvaluate } from '../../lib/safeEvaluate';
import styles from './AmountInput.module.css';

const NON_NUMERIC_PATTERN = /[^0-9.]/g;
const LEADING_ZERO_PATTERN = /^0+(?=\d)/;
const GROUP_SEPARATOR_PATTERN = /\B(?=(\d{3})+(?!\d))/g;

const SUGGESTION_MULTIPLIERS = [1000, 10000, 100000];
const OPERATOR_SET = new Set(['+', '-', '*', '/']);
const PAREN_SET = new Set(['(', ')']);

const sanitizeExpressionInput = (value) => {
  if (!value) {
    return '';
  }

  return value.replace(/\s+/g, '').replace(/,/g, '').replace(/[^0-9.+\-*/()]/g, '');
};

const tokenizeExpression = (expressionString) => {
  if (!expressionString) {
    return [];
  }

  const sanitized = sanitizeExpressionInput(expressionString);
  const tokens = [];
  let current = '';

  for (let index = 0; index < sanitized.length; index += 1) {
    const char = sanitized[index];
    if (PAREN_SET.has(char)) {
      if (current) {
        tokens.push({ type: 'number', value: current });
        current = '';
      }

      tokens.push({ type: 'paren', value: char });
      continue;
    }

    if (!OPERATOR_SET.has(char)) {
      current += char;
      continue;
    }

    const previousToken = tokens[tokens.length - 1];
    const prevAllowsUnaryMinus =
      !previousToken ||
      previousToken.type === 'operator' ||
      (previousToken.type === 'paren' && previousToken.value === '(');

    const isUnaryMinus = char === '-' && current === '' && prevAllowsUnaryMinus;

    if (isUnaryMinus) {
      current += char;
      continue;
    }

    if (current) {
      tokens.push({ type: 'number', value: current });
      current = '';
    }

    tokens.push({ type: 'operator', value: char });
  }

  if (current) {
    tokens.push({ type: 'number', value: current });
  }

  return tokens;
};

const tokenHasDigits = (token) => token.type === 'number' && /\d/.test(token.value);

const shouldTreatTokensAsExpression = (tokens) => {
  if (!tokens || tokens.length === 0) {
    return false;
  }

  const hasNumericToken = tokens.some(tokenHasDigits);
  if (!hasNumericToken) {
    return false;
  }

  const hasOperatorToken = tokens.some((token) => token.type === 'operator');
  if (hasOperatorToken) {
    return true;
  }

  const hasParentheses = tokens.some((token) => token.type === 'paren');
  if (hasParentheses) {
    return tokens.length > 1;
  }

  return false;
};

const formatExpressionTokens = (tokens) =>
  tokens.map((token) => {
    if (token.type === 'number') {
      const formatted = formatDisplayValue(token.value);
      return {
        ...token,
        display: formatted || token.value,
      };
    }

    return {
      ...token,
      display: token.value,
    };
  });

const joinTokensForInput = (tokens) => tokens.map((token) => token.display).join('');

const joinTokensForHistory = (tokens) =>
  tokens
    .map((token) => (token.type === 'operator' ? ` ${token.display} ` : token.display))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

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
  onHistoryChange,
  onKeyDown: propOnKeyDown,
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
  const [expression, setExpression] = useState('');
  const [displayExpression, setDisplayExpression] = useState('');
  const [history, setHistory] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputError, setInputError] = useState('');
  const isExpressionActive = expression.length > 0;
  const inputRef = useRef(null);
  const suggestionBoxRef = useRef(null);
  const hideSuggestionsTimeoutRef = useRef(null);
  const suppressFocusSuggestionsRef = useRef(false);
  const calculatedSuggestions = useMemo(
    () => (isExpressionActive ? [] : generateSuggestions(normalizedRawValue)),
    [isExpressionActive, normalizedRawValue],
  );

  useEffect(() => {
    if (!isExpressionActive) {
      setDisplayValue(formattedFromValue);
    }
  }, [formattedFromValue, isExpressionActive]);

  useEffect(() => {
    if (isExpressionActive) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSuggestions(calculatedSuggestions);
    if (calculatedSuggestions.length === 0) {
      setShowSuggestions(false);
    }
  }, [calculatedSuggestions, isExpressionActive]);

  useEffect(() => {
    return () => {
      if (hideSuggestionsTimeoutRef.current) {
        clearTimeout(hideSuggestionsTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    onHistoryChange?.(history);
  }, [history, onHistoryChange]);

  useEffect(() => {
    if (!normalizedRawValue && !isExpressionActive) {
      setHistory((previous) => (previous ? '' : previous));
    }
  }, [isExpressionActive, normalizedRawValue]);

  const handleChange = (event) => {
    if (inputError) {
      setInputError('');
    }

    const nextDisplayValue = event.target.value;
    const sanitizedExpression = sanitizeExpressionInput(nextDisplayValue);
    const expressionTokens = tokenizeExpression(sanitizedExpression);
    const expressionDetected = shouldTreatTokensAsExpression(expressionTokens);

    if (expressionDetected) {
      const normalizedExpression = expressionTokens.map((token) => token.value).join('');
      setExpression(normalizedExpression);

      const formattedTokens = formatExpressionTokens(expressionTokens);
      setDisplayExpression(joinTokensForInput(formattedTokens));

      if (history) {
        setHistory('');
      }

      onChange?.('');
      setShowSuggestions(false);
      setSuggestions([]);
      return;
    }

    if (expression) {
      setExpression('');
      setDisplayExpression('');
    }

    const rawNumericValue = parseInputValue(nextDisplayValue);

    if (history) {
      setHistory('');
    }

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

      if (!isExpressionActive && suggestions.length > 0) {
        setShowSuggestions(true);
      }

      onFocus?.(event);
    },
    [isExpressionActive, onFocus, suggestions.length],
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
      setExpression('');
      setDisplayExpression('');
      setHistory('');
      setDisplayValue(formatDisplayValue(rawValue));
      setShowSuggestions(false);

      suppressFocusSuggestionsRef.current = true;

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (event) => {
      let handled = false;

      if (event.key === 'Enter') {
        const trimmedExpression = expression.trim();
        if (trimmedExpression && isExpressionActive) {
          const rawTokens = tokenizeExpression(trimmedExpression);
          const shouldEvaluate = shouldTreatTokensAsExpression(rawTokens);

          if (shouldEvaluate) {
            event.preventDefault();
            handled = true;

            const normalizedForEvaluation = normalizeExpression(trimmedExpression);

            if (!normalizedForEvaluation) {
              setInputError('Lỗi: Phép tính không hợp lệ');
              return;
            }

            if (containsDivisionByZero(normalizedForEvaluation)) {
              setInputError('Lỗi: Không thể chia cho 0');
              return;
            }

            const evaluationResult = safeEvaluate(normalizedForEvaluation);

            if (evaluationResult === null) {
              setInputError('Lỗi: Phép tính không hợp lệ');
              return;
            }

            if (typeof evaluationResult === 'number' && evaluationResult < 0) {
              setInputError('Kết quả không được âm');
              return;
            }

            const tokens = formatExpressionTokens(
              tokenizeExpression(normalizedForEvaluation),
            );
            const formattedExpression = joinTokensForHistory(tokens);

            const rawResult = parseInputValue(String(evaluationResult));
            const formattedResult = formatDisplayValue(rawResult);
            const historyLine = formattedExpression
              ? `${formattedExpression} = ${formattedResult}`
              : formattedResult
              ? `= ${formattedResult}`
              : '';

            setInputError('');
            setHistory(historyLine);
            setExpression('');
            setDisplayExpression('');
            setShowSuggestions(false);

            const normalizedResult = rawResult;
            setDisplayValue(formattedResult);
            onChange?.(normalizedResult);

            if (normalizedResult) {
              const nextSuggestions = generateSuggestions(normalizedResult);
              setSuggestions(nextSuggestions);
            } else {
              setSuggestions([]);
            }
          }
        }
      }

      if (propOnKeyDown) {
        propOnKeyDown(event);
      }

      if (handled) {
        suppressFocusSuggestionsRef.current = true;
      }
    },
    [expression, isExpressionActive, onChange, propOnKeyDown],
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
        value={isExpressionActive ? displayExpression : displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        ref={inputRef}
        placeholder={placeholder}
        {...rest}
      />
      {inputError ? (
        <p className={styles.inputErrorText}>{inputError}</p>
      ) : null}
      {showSuggestions && !isExpressionActive && suggestions.length > 0 ? (
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

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FiRotateCcw, FiX } from 'react-icons/fi';

export const TableRestoreInput = forwardRef(function TableRestoreInput(
  {
    value = '',
    onChange,
    onSubmit,
    onClear,
    previousValue,
    onRestore,
    placeholder,
    inputProps = {},
    containerClassName,
    inputClassName,
    clearButtonClassName,
    restoreButtonClassName,
    iconButtonClassName,
    actionsClassName,
    clearButtonAriaLabel = 'Clear',
    restoreButtonAriaLabel = 'Restore',
    clearButtonTitle,
    restoreButtonTitle,
    inputTestId,
    clearButtonTestId,
    restoreButtonTestId,
    containerProps = {},
  },
  forwardedRef,
) {
  const inputRef = useRef(null);
  const [valueBeforeClear, setValueBeforeClear] = useState(null);

  const { onBlur: inputOnBlur, onChange: inputOnChange, ...restInputProps } = inputProps;

  const resolvedValue = value ?? '';
  const stringValue =
    typeof resolvedValue === 'string' ? resolvedValue : String(resolvedValue);
  const trimmedValue = stringValue.trim();
  const hasValue = trimmedValue.length > 0;

  const resolvedPreviousValue = previousValue ?? '';
  const previousValueString =
    typeof resolvedPreviousValue === 'string'
      ? resolvedPreviousValue
      : String(resolvedPreviousValue);
  const hasPreviousValue = previousValueString.trim().length > 0;

  useImperativeHandle(forwardedRef, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
  }));

  useEffect(() => {
    if (valueBeforeClear !== null && stringValue.trim().length > 0) {
      setValueBeforeClear(null);
    }
  }, [stringValue, valueBeforeClear]);
  const focusInput = () => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const restoreLocalValue = () => {
    if (valueBeforeClear === null) {
      return false;
    }
    onChange?.(valueBeforeClear);
    setValueBeforeClear(null);
    focusInput();
    return true;
  };

  const restorePreviousValue = () => {
    if (!hasPreviousValue) {
      return false;
    }
    onRestore?.(previousValue);
    setValueBeforeClear(null);
    focusInput();
    return true;
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit?.();
      return;
    }
    if (event.key !== 'Escape') {
      return;
    }

    if (hasValue) {
      event.preventDefault();
      setValueBeforeClear(stringValue);
      onClear?.();
      focusInput();
      return;
    }

    const restored = restoreLocalValue() || restorePreviousValue();
    if (restored) {
      event.preventDefault();
    }
  };

  const handleClear = (event) => {
    event.preventDefault();
    if (!hasValue) {
      if (hasPreviousValue) {
        onClear?.();
      }
      return;
    }
    setValueBeforeClear(stringValue);
    onClear?.();
    focusInput();
  };

  const handleRestore = (event) => {
    event.preventDefault();
    if (valueBeforeClear !== null && !hasValue) {
      const valueToRestore = valueBeforeClear;
      onChange?.(valueToRestore);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return;
    }
    if (!hasPreviousValue || hasValue) {
      return;
    }
    onRestore?.(previousValue);
    if (restoreLocalValue()) {
      return;
    }
    restorePreviousValue();
  };

  const canRestoreLocally = valueBeforeClear !== null && !hasValue;
  const canRestoreGlobally = !canRestoreLocally && hasPreviousValue && !hasValue;
  const showRestore = canRestoreLocally || canRestoreGlobally;
  const showClear = hasValue;
  const showActions = showRestore || showClear;

  const handleBlur = (event) => {
    if (valueBeforeClear !== null) {
      setValueBeforeClear(null);
    }
    inputOnBlur?.(event);
  };

  return (
    <div className={containerClassName} {...containerProps}>
      <input
        {...restInputProps}
        ref={inputRef}
        type="search"
        className={inputClassName}
        placeholder={placeholder}
        value={stringValue}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          if (valueBeforeClear !== null) {
            setValueBeforeClear(null);
          }
          inputOnChange?.(event);
          onChange?.(event.target.value);
        }}
        onBlur={handleBlur}
        data-testid={inputTestId}
      />
      {showActions ? (
        <div className={actionsClassName}>
          {showRestore ? (
            <button
              type="button"
              className={`${iconButtonClassName ?? ''} ${restoreButtonClassName ?? ''}`.trim()}
              onClick={handleRestore}
              aria-label={restoreButtonAriaLabel}
              title={restoreButtonTitle}
              data-testid={restoreButtonTestId}
            >
              <FiRotateCcw aria-hidden />
            </button>
          ) : null}
          {showClear ? (
            <button
              type="button"
              className={`${iconButtonClassName ?? ''} ${clearButtonClassName ?? ''}`.trim()}
              onClick={handleClear}
              aria-label={clearButtonAriaLabel}
              title={clearButtonTitle}
              data-testid={clearButtonTestId}
            >
              <FiX aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

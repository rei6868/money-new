import { forwardRef, useImperativeHandle, useRef } from 'react';
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

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit?.();
    }
    if (event.key === 'Escape' && hasValue) {
      event.preventDefault();
      onClear?.();
    }
  };

  const handleClear = (event) => {
    event.preventDefault();
    if (!hasValue) {
      return;
    }
    onClear?.();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleRestore = (event) => {
    event.preventDefault();
    if (!hasPreviousValue) {
      return;
    }
    onRestore?.(previousValue);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const showRestore = hasPreviousValue && !hasValue;
  const showClear = hasValue;
  const showActions = showRestore || showClear;

  return (
    <div className={containerClassName} {...containerProps}>
      <input
        {...inputProps}
        ref={inputRef}
        type="search"
        className={inputClassName}
        placeholder={placeholder}
        value={stringValue}
        onKeyDown={handleKeyDown}
        onChange={(event) => onChange?.(event.target.value)}
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

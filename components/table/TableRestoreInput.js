import { forwardRef, useImperativeHandle, useRef } from 'react';
import { FiRotateCcw, FiSearch, FiX } from 'react-icons/fi';

export const TableRestoreInput = forwardRef(function TableRestoreInput(
  {
    value = '',
    onChange,
    onSubmit,
    onClear,
    onRequestClearConfirm,
    previousValue,
    onRestore,
    placeholder,
    inputProps = {},
    containerClassName,
    inputClassName,
    clearButtonClassName,
    restoreButtonClassName,
    iconButtonClassName,
    staticIconClassName,
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
      if (onRequestClearConfirm) {
        onRequestClearConfirm();
      } else {
        onClear?.();
      }
    }
  };

  const handleClear = (event) => {
    event.preventDefault();
    if (!hasValue) {
      return;
    }
    if (onRequestClearConfirm) {
      onRequestClearConfirm();
    } else {
      onClear?.();
    }
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
      <span className={staticIconClassName} aria-hidden>
        <FiSearch />
      </span>
    </div>
  );
});

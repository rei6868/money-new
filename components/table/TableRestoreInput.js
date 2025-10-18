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

  useImperativeHandle(forwardedRef, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
  }));

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit?.();
    }
    if (event.key === 'Escape' && value) {
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
    if (!value) {
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
    if (!previousValue) {
      return;
    }
    onRestore?.(previousValue);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const showRestore = Boolean(previousValue) && !value;
  const showClear = Boolean(value);

  return (
    <div className={containerClassName} {...containerProps}>
      <input
        {...inputProps}
        ref={inputRef}
        type="search"
        className={inputClassName}
        placeholder={placeholder}
        value={value}
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

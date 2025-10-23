import PropTypes from 'prop-types';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className,
  buttonClassName,
  statusClassName,
  previousLabel = 'Prev',
  nextLabel = 'Next',
  ariaLabel = 'Pagination',
  disabled = false,
  getStatusLabel,
}) {
  const safeTotal = Math.max(1, Number.isFinite(totalPages) ? totalPages : 1);
  const safeCurrent = Math.min(Math.max(1, Number.isFinite(currentPage) ? currentPage : 1), safeTotal);

  const handlePageChange = (page) => {
    if (disabled) {
      return;
    }
    const nextPage = Math.min(Math.max(1, page), safeTotal);
    if (nextPage === safeCurrent) {
      return;
    }
    onPageChange?.(nextPage);
  };

  const handlePrevious = () => {
    handlePageChange(safeCurrent - 1);
  };

  const handleNext = () => {
    handlePageChange(safeCurrent + 1);
  };

  const previousDisabled = disabled || safeCurrent <= 1;
  const nextDisabled = disabled || safeCurrent >= safeTotal;
  const statusText = getStatusLabel
    ? getStatusLabel({ currentPage: safeCurrent, totalPages: safeTotal })
    : `Page ${safeCurrent} of ${safeTotal}`;

  return (
    <nav className={className} aria-label={ariaLabel}>
      <button
        type="button"
        className={classNames(buttonClassName)}
        onClick={handlePrevious}
        disabled={previousDisabled}
        aria-label="Previous page"
      >
        {previousLabel}
      </button>
      <span className={statusClassName}>{statusText}</span>
      <button
        type="button"
        className={classNames(buttonClassName)}
        onClick={handleNext}
        disabled={nextDisabled}
        aria-label="Next page"
      >
        {nextLabel}
      </button>
    </nav>
  );
}

Pagination.propTypes = {
  currentPage: PropTypes.number,
  totalPages: PropTypes.number,
  onPageChange: PropTypes.func,
  className: PropTypes.string,
  buttonClassName: PropTypes.string,
  statusClassName: PropTypes.string,
  previousLabel: PropTypes.node,
  nextLabel: PropTypes.node,
  ariaLabel: PropTypes.string,
  disabled: PropTypes.bool,
  getStatusLabel: PropTypes.func,
};

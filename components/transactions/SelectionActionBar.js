import styles from '../../styles/TransactionsHistory.module.css';
import { formatAmountWithTrailing } from '../../lib/numberFormat';

export function SelectionActionBar({
  selectedCount = 0,
  selectionSummary,
  onDeselectAll,
  onToggleShowSelected,
  isShowingSelectedOnly,
}) {
  if (selectedCount === 0) {
    return null;
  }

  const formattedAmount = formatAmountWithTrailing(selectionSummary?.amount);
  const formattedTotalBack = formatAmountWithTrailing(selectionSummary?.totalBack);
  const formattedFinalPrice = formatAmountWithTrailing(selectionSummary?.finalPrice);

  return (
    <div className={styles.selectionBar} data-testid="transactions-selection-bar">
      <div className={styles.selectionSummaryText}>
        <span>{selectedCount} selected</span>
        {selectionSummary ? (
          <div className={styles.selectionTotals}>
            <span>Amount: {formattedAmount}</span>
            <span>Total Back: {formattedTotalBack}</span>
            <span>Final Price: {formattedFinalPrice}</span>
          </div>
        ) : null}
      </div>
      <div className={styles.selectionButtons}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onToggleShowSelected?.()}
          data-testid="transactions-selection-toggle-show"
        >
          {isShowingSelectedOnly ? 'Show all rows' : 'Show selected rows'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onDeselectAll?.()}
          data-testid="transactions-selection-deselect"
        >
          De-select All
        </button>
      </div>
    </div>
  );
}

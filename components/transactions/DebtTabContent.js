import ReusableDropdown from '../common/ReusableDropdown';
import styles from './AddTransactionModal.module.css';

export default function DebtTabContent({
  formValues,
  updateField,
  renderDateField,
  renderAmountField,
  renderNotesField,
  personOptions,
  accountOptions,
  debtCategoryOptions,
  debtTagOptions,
  selectedDebtTag,
  onDebtTagSelect,
  debtTagLabel,
  debtTagModalType,
  onOpenNewItemModal,
  isRepayMode,
  isLastMonth,
  onToggleLastMonth,
}) {
  return (
    <div className={styles.debtSection}>
      <div className={styles.debtGrid}>
        <div className={styles.debtTypeGroup}>
          <div className={styles.debtTypeHeader}>
            <span className={styles.fieldLabel}>Debt Type</span>
          </div>
          <button
            type="button"
            className={`${styles.debtTypeToggle} ${
              isRepayMode ? styles.debtTypeToggleRepay : styles.debtTypeToggleDebt
            }`}
            onClick={() => updateField('debtType', isRepayMode ? 'debt' : 'repay')}
            role="switch"
            aria-checked={isRepayMode}
          >
            <span
              className={styles.debtTypeOption}
              data-active={!isRepayMode ? 'true' : 'false'}
              data-variant="debt"
            >
              Debt
            </span>
            <span
              className={styles.debtTypeOption}
              data-active={isRepayMode ? 'true' : 'false'}
              data-variant="repay"
            >
              Repayment
            </span>
            <span className={styles.debtTypeThumb} aria-hidden />
          </button>
        </div>

        <ReusableDropdown
          label="Person"
          options={personOptions}
          value={formValues.debtPerson}
          onChange={(value) => updateField('debtPerson', value)}
          placeholder="Select person"
          className={`${styles.dropdownField} ${styles.gridField}`}
          onAddNew={() => onOpenNewItemModal('Person')}
        />

        {renderDateField({ className: `${styles.dateField} ${styles.gridField}` })}

        <div className={`${styles.debtTagColumn} ${styles.gridField}`}>
          <div className={styles.debtTagHeader}>
            <span className={styles.fieldLabel}>{debtTagLabel}</span>
            <div className={styles.lastMonthGroup}>
              <span className={styles.lastMonthLabel}>Last Month</span>
              <button
                type="button"
                className={`${styles.switchButton} ${isLastMonth ? styles.switchButtonActive : ''}`}
                onClick={onToggleLastMonth}
                role="switch"
                aria-checked={isLastMonth}
              >
                <span className={styles.switchTrack}>
                  <span className={styles.switchThumb} />
                </span>
              </button>
            </div>
          </div>
          <ReusableDropdown
            options={debtTagOptions}
            value={selectedDebtTag}
            onChange={(value) => onDebtTagSelect(value)}
            placeholder="Select or search debt tag"
            className={styles.dropdownField}
            ariaLabel={debtTagLabel}
            onAddNew={() => onOpenNewItemModal(debtTagModalType)}
          />
        </div>

        <ReusableDropdown
          label="Account"
          options={accountOptions}
          value={formValues.account}
          onChange={(value) => updateField('account', value)}
          placeholder="Select account"
          className={`${styles.dropdownField} ${styles.gridField}`}
          onAddNew={() => onOpenNewItemModal('Account')}
        />
        {renderAmountField({ className: styles.gridField })}

        <ReusableDropdown
          label="Category"
          options={debtCategoryOptions}
          value={formValues.debtCategory}
          onChange={(value) => updateField('debtCategory', value)}
          placeholder="Select category"
          className={`${styles.dropdownField} ${styles.gridField}`}
          onAddNew={() => onOpenNewItemModal('Debt Category')}
        />
      </div>

      {renderNotesField({ className: styles.debtNotesField, fullRow: false })}
    </div>
  );
}

import AmountInput from '../common/AmountInput';
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
  isCashbackEligible,
  percentBack,
  fixedBack,
  noBackEng,
}) {
  const lastMonthLabelId = 'debt-last-month-toggle-label';
  const noBackEngLabelId = 'debt-no-back-eng-label';
  const hasPositiveAmount = Number(formValues.amount) > 0;

  return (
    <div className={styles.debtSection}>
      <div className={styles.debtGrid}>
        <div className={`${styles.debtTypeGroup} ${styles.gridField}`}>
          <span className={styles.fieldLabel}>Debt Type</span>
          <button
            type="button"
            className={`${styles.debtTypeToggle} ${styles.formFieldBase} ${
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
          className={`${styles.dropdownField} ${styles.gridField} ${styles.formFieldBase}`}
          onAddNew={() => onOpenNewItemModal('Person')}
        />

        {renderDateField({ className: `${styles.dateField} ${styles.gridField}` })}

        <ReusableDropdown
          label="Account"
          options={accountOptions}
          value={formValues.account}
          onChange={(value) => updateField('account', value)}
          placeholder="Select account"
          className={`${styles.dropdownField} ${styles.gridField} ${styles.formFieldBase}`}
          onAddNew={() => onOpenNewItemModal('Account')}
        />

        <ReusableDropdown
          label="Category"
          options={debtCategoryOptions}
          value={formValues.debtCategory}
          onChange={(value) => updateField('debtCategory', value)}
          placeholder="Select category"
          className={`${styles.dropdownField} ${styles.gridField} ${styles.formFieldBase}`}
          onAddNew={() => onOpenNewItemModal('Debt Category')}
        />

        {renderAmountField({ className: styles.gridField })}

        {isCashbackEligible ? (
          <div className={`${styles.cashbackSection} ${styles.fullRow}`}>
            <div className={styles.cashbackInputRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="transaction-percent-back">
                  % Back
                </label>
                <input
                  id="transaction-percent-back"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  inputMode="decimal"
                  className={`${styles.input} ${styles.formFieldBase} ${styles.percentBackInput}`}
                  value={percentBack}
                  onChange={(event) => updateField('percentBack', event.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="transaction-fixed-back">
                  Fix Back
                </label>
                <AmountInput
                  id="transaction-fixed-back"
                  value={fixedBack}
                  onChange={(newValue) => updateField('fixedBack', newValue)}
                  placeholder="0"
                  className={`${styles.input} ${styles.formFieldBase} ${styles.fixedBackInput}`}
                />
              </div>

              <div className={`${styles.toggleField} ${styles.formFieldBase} ${styles.noBackEngToggle}`}>
                <span className={styles.fieldLabel} id={noBackEngLabelId}>
                  None Back
                </span>
                <button
                  type="button"
                  className={`${styles.switchButton} ${noBackEng ? styles.switchButtonActive : ''}`}
                  onClick={() => updateField('noBackEng', !noBackEng)}
                  role="switch"
                  aria-checked={noBackEng}
                  aria-labelledby={noBackEngLabelId}
                >
                  <span className={styles.switchTrack}>
                    <span className={styles.switchThumb} />
                  </span>
                </button>
              </div>
            </div>

            <div className={styles.cashbackHint}>
              {hasPositiveAmount
                ? 'Suggested rate: X%. Raw=Y, Final=Z. Cap info.'
                : 'Enter Amount > 0 to calculate cashback.'}
            </div>
          </div>
        ) : null}

        <ReusableDropdown
          label={debtTagLabel}
          options={debtTagOptions}
          value={selectedDebtTag}
          onChange={(value) => onDebtTagSelect(value)}
          placeholder="Select or search debt tag"
          className={`${styles.dropdownField} ${styles.gridField} ${styles.formFieldBase}`}
          onAddNew={() => onOpenNewItemModal(debtTagModalType)}
        />

        <div className={`${styles.toggleField} ${styles.gridField} ${styles.formFieldBase}`}>
          <span className={styles.fieldLabel} id={lastMonthLabelId}>
            Last Month
          </span>
          <button
            type="button"
            className={`${styles.switchButton} ${isLastMonth ? styles.switchButtonActive : ''}`}
            onClick={onToggleLastMonth}
            role="switch"
            aria-checked={isLastMonth}
            aria-labelledby={lastMonthLabelId}
          >
            <span className={styles.switchTrack}>
              <span className={styles.switchThumb} />
            </span>
          </button>
        </div>
      </div>

      {renderNotesField({ className: styles.debtNotesField, fullRow: false })}
    </div>
  );
}

import AmountInput from '../common/AmountInput';
import ReusableDropdown from '../common/ReusableDropdown';
import styles from './AddTransactionModal.module.css';

export default function ExpensesTabContent({
  formValues,
  updateField,
  renderDateField,
  renderAmountField,
  renderNotesField,
  accountOptions,
  categoryOptions,
  shopOptions,
  onOpenNewItemModal,
  isCashbackEligible,
  percentBack,
  fixedBack,
  noBackEng,
}) {
  const hasPositiveAmount = Number(formValues.amount) > 0;
  const noBackEngLabelId = 'expenses-no-back-eng-label';

  return (
    <div className={styles.formGrid}>
      {renderDateField()}
      <ReusableDropdown
        label="Account"
        options={accountOptions}
        value={formValues.account}
        onChange={(value) => updateField('account', value)}
        placeholder="Select account"
        className={styles.dropdownField}
        onAddNew={() => onOpenNewItemModal('Account')}
      />
      {renderAmountField()}
      {isCashbackEligible ? (
        <div className={`${styles.cashbackSection} ${styles.fullRow}`}>
          <div className={styles.cashbackInputRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="expenses-percent-back">
                % Back
              </label>
              <input
                id="expenses-percent-back"
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
              <label className={styles.fieldLabel} htmlFor="expenses-fixed-back">
                Fix Back
              </label>
              <AmountInput
                id="expenses-fixed-back"
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
        label="Category"
        options={categoryOptions}
        value={formValues.expenseCategory}
        onChange={(value) => updateField('expenseCategory', value)}
        placeholder="Select expense category"
        className={styles.dropdownField}
        onAddNew={() => onOpenNewItemModal('Expense Category')}
      />
      <ReusableDropdown
        label="Shop (optional)"
        options={shopOptions}
        value={formValues.expenseShop}
        onChange={(value) => updateField('expenseShop', value)}
        placeholder="Select shop"
        className={`${styles.dropdownField} ${styles.fullRow}`}
        onAddNew={() => onOpenNewItemModal('Shop')}
      />
      {renderNotesField()}
    </div>
  );
}

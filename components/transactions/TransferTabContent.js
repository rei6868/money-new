import ReusableDropdown from '../common/ReusableDropdown';
import styles from './AddTransactionModal.module.css';

export default function TransferTabContent({
  formValues,
  updateField,
  renderDateField,
  renderAmountField,
  renderNotesField,
  accountOptions,
  categoryOptions,
  onOpenNewItemModal,
  isTransferAccountConflict,
}) {
  return (
    <div className={styles.transferSection}>
      <div className={styles.formRow}>
        {renderDateField()}
        {renderAmountField()}
      </div>
      <div className={styles.formRow}>
        <ReusableDropdown
          label="Category"
          options={categoryOptions}
          value={formValues.transferCategory}
          onChange={(value) => updateField('transferCategory', value)}
          placeholder="Select transfer category"
          className={styles.dropdownField}
          onAddNew={() => onOpenNewItemModal('Transfer Category')}
        />
        {renderNotesField({ fullRow: false })}
      </div>
      <div className={styles.formRow}>
        <ReusableDropdown
          label="From account"
          options={accountOptions}
          value={formValues.transferFromAccount}
          onChange={(value) => updateField('transferFromAccount', value)}
          placeholder="Select source"
          className={styles.dropdownField}
          hasError={isTransferAccountConflict}
          onAddNew={() => onOpenNewItemModal('Account')}
        />
        <ReusableDropdown
          label="To account"
          options={accountOptions}
          value={formValues.transferToAccount}
          onChange={(value) => updateField('transferToAccount', value)}
          placeholder="Select destination"
          className={styles.dropdownField}
          hasError={isTransferAccountConflict}
          onAddNew={() => onOpenNewItemModal('Account')}
        />
      </div>
      {isTransferAccountConflict ? (
        <p className={styles.fieldError}>Cannot transfer to the same account</p>
      ) : null}
    </div>
  );
}

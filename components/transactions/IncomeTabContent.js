import ReusableDropdown from '../common/ReusableDropdown';
import styles from './AddTransactionModal.module.css';

export default function IncomeTabContent({
  formValues,
  updateField,
  renderDateField,
  renderAmountField,
  renderNotesField,
  accountOptions,
  categoryOptions,
  shopOptions,
  onOpenNewItemModal,
}) {
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
      <ReusableDropdown
        label="Category"
        options={categoryOptions}
        value={formValues.incomeCategory}
        onChange={(value) => updateField('incomeCategory', value)}
        placeholder="Select income category"
        className={styles.dropdownField}
        onAddNew={() => onOpenNewItemModal('Income Category')}
      />
      <ReusableDropdown
        label="Shop (optional)"
        options={shopOptions}
        value={formValues.incomeShop}
        onChange={(value) => updateField('incomeShop', value)}
        placeholder="Select shop"
        className={`${styles.dropdownField} ${styles.fullRow}`}
        onAddNew={() => onOpenNewItemModal('Shop')}
      />
      {renderNotesField()}
    </div>
  );
}

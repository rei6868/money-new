import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiX } from 'react-icons/fi';

import ReusableDropdown from '../common/ReusableDropdown';
import styles from './AddTransactionModal.module.css';

const INITIAL_FORM_STATE = {
  date: '',
  account: '',
  amount: '',
  notes: '',
  debtType: 'debt',
  debtPerson: '',
  debtCategory: '',
  debtTag: '',
  debtLastMonth: false,
  incomeCategory: '',
  incomeShop: '',
  expenseCategory: '',
  expenseShop: '',
  transferFromAccount: '',
  transferToAccount: '',
};

const ACCOUNT_OPTIONS = ['Account 1', 'Account 2', 'Saving Account'];
const PERSON_OPTIONS = ['Person A', 'Person B', 'Mom'];
const DEBT_CATEGORY_OPTIONS = ['Debt Category 1', 'Loan Repayment'];
const INCOME_CATEGORY_OPTIONS = ['Salary', 'Bonus'];
const EXPENSE_CATEGORY_OPTIONS = ['Groceries', 'Dining', 'Transport'];
const SHOP_OPTIONS = ['Main Shop', 'Online Store', 'Local Market'];
const DEBT_TAG_SHORTCUTS = ['AUG25', 'SEP25', 'OCT25'];
const MORE_DEBT_TAGS = ['JUL25', 'JUN25', 'MAY25'];

const TABS = [
  { id: 'debt', label: 'Debt' },
  { id: 'income', label: 'Income' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'transfer', label: 'Transfer' },
];

export default function AddTransactionModal({ isOpen, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('debt');
  const [formValues, setFormValues] = useState(() => ({ ...INITIAL_FORM_STATE }));
  const [showMoreTagsDropdown, setShowMoreTagsDropdown] = useState(false);
  const [lastClearedNotes, setLastClearedNotes] = useState('');

  const resetForm = useCallback(() => {
    setFormValues({ ...INITIAL_FORM_STATE });
    setActiveTab('debt');
    setShowMoreTagsDropdown(false);
    setLastClearedNotes('');
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    resetForm();
  }, [isOpen, resetForm]);

  const updateField = useCallback((field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const isDirty = useMemo(
    () =>
      Object.keys(INITIAL_FORM_STATE).some((key) => {
        const initialValue = INITIAL_FORM_STATE[key];
        const currentValue = formValues[key];
        if (typeof initialValue === 'boolean') {
          return Boolean(initialValue) !== Boolean(currentValue);
        }
        return (initialValue ?? '') !== (currentValue ?? '');
      }),
    [formValues],
  );

  const finalizeClose = useCallback(() => {
    resetForm();
    onClose?.();
  }, [onClose, resetForm]);

  const requestClose = useCallback(() => {
    if (!isDirty) {
      finalizeClose();
      return;
    }

    const shouldClose =
      typeof window === 'undefined' ? true : window.confirm('Discard unsaved changes?');
    if (shouldClose) {
      finalizeClose();
    }
  }, [finalizeClose, isDirty]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, requestClose]);

  useEffect(() => {
    setShowMoreTagsDropdown(false);
  }, [activeTab]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  };

  const titleId = 'add-transaction-modal-title';
  const descriptionId = 'add-transaction-modal-description';

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleSave = () => {
    const payload = { ...formValues, kind: activeTab };
    if (onSave) {
      onSave(payload);
    } else {
      // eslint-disable-next-line no-console
      console.log('Save transaction draft', payload);
    }
    finalizeClose();
  };

  const handleNotesChange = (event) => {
    updateField('notes', event.target.value);
  };

  const handleClearNotes = () => {
    if (!formValues.notes) {
      return;
    }
    setLastClearedNotes(formValues.notes);
    updateField('notes', '');
  };

  const handleRestoreNotes = () => {
    if (!lastClearedNotes) {
      return;
    }
    updateField('notes', lastClearedNotes);
    setLastClearedNotes('');
  };

  const handleDebtTagSelect = (tag) => {
    updateField('debtTag', tag);
    setShowMoreTagsDropdown(false);
  };

  const isRepayMode = formValues.debtType === 'repay';
  const showAccountField = activeTab !== 'transfer';

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title} id={titleId}>
              Add New Transaction
            </h2>
            <p className={styles.subtitle} id={descriptionId}>
              Capture every inflow, expense, or transfer without leaving the history screen.
            </p>
          </div>
          <button type="button" className={styles.closeButton} onClick={requestClose} aria-label="Close">
            <FiX aria-hidden />
          </button>
        </header>

        <ul className={styles.tabList} role="tablist">
          {TABS.map((tab) => {
            const tabId = `add-transaction-tab-${tab.id}`;
            const panelId = `add-transaction-panel-${tab.id}`;
            const isActive = tab.id === activeTab;
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                  role="tab"
                  id={tabId}
                  aria-selected={isActive}
                  aria-controls={panelId}
                >
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ul>

        <div className={styles.commonFields}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="transaction-date">
              Date
            </label>
            <input
              id="transaction-date"
              type="date"
              className={styles.input}
              value={formValues.date}
              onChange={(event) => updateField('date', event.target.value)}
            />
            <span className={styles.dateTagPlaceholder}></span>
          </div>

          {showAccountField ? (
            <ReusableDropdown
              label="Account"
              options={ACCOUNT_OPTIONS}
              value={formValues.account}
              onChange={(value) => updateField('account', value)}
              placeholder="Select account"
              className={styles.dropdownField}
            />
          ) : null}

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="transaction-amount">
              Amount
            </label>
            <input
              id="transaction-amount"
              type="number"
              className={styles.input}
              value={formValues.amount}
              onChange={(event) => updateField('amount', event.target.value)}
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div className={`${styles.field} ${styles.notesField}`}>
            <div className={styles.fieldLabelRow}>
              <label className={styles.fieldLabel} htmlFor="transaction-notes">
                Notes
              </label>
              <div className={styles.notesActions}>
                {formValues.notes ? (
                  <button type="button" className={styles.linkButton} onClick={handleClearNotes}>
                    Clear
                  </button>
                ) : null}
                {!formValues.notes && lastClearedNotes ? (
                  <button type="button" className={styles.linkButton} onClick={handleRestoreNotes}>
                    Restore
                  </button>
                ) : null}
              </div>
            </div>
            <textarea
              id="transaction-notes"
              className={styles.textarea}
              value={formValues.notes}
              onChange={handleNotesChange}
              placeholder="Add a note or short description"
              rows={3}
            />
          </div>
        </div>

        <section
          className={styles.tabPanel}
          id={`add-transaction-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`add-transaction-tab-${activeTab}`}
        >
          {activeTab === 'debt' ? (
            <div className={styles.tabContent}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Debt type</span>
                <div className={styles.toggleGroup}>
                  {['debt', 'repay'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`${styles.toggleButton} ${
                        formValues.debtType === type ? styles.toggleButtonActive : ''
                      }`}
                      onClick={() => updateField('debtType', type)}
                      aria-pressed={formValues.debtType === type}
                    >
                      {type === 'debt' ? 'Debt' : 'Repay'}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.tabGrid}>
                <ReusableDropdown
                  label="Person"
                  options={PERSON_OPTIONS}
                  value={formValues.debtPerson}
                  onChange={(value) => updateField('debtPerson', value)}
                  placeholder="Select person"
                  className={styles.dropdownField}
                  disabled={isRepayMode}
                />
                <ReusableDropdown
                  label="Category"
                  options={DEBT_CATEGORY_OPTIONS}
                  value={formValues.debtCategory}
                  onChange={(value) => updateField('debtCategory', value)}
                  placeholder="Select category"
                  className={styles.dropdownField}
                  disabled={isRepayMode}
                />
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Debt Tag</span>
                <div className={styles.debtTagButtons}>
                  {DEBT_TAG_SHORTCUTS.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      className={`${styles.tagButton} ${
                        formValues.debtTag === tag ? styles.tagButtonActive : ''
                      }`}
                      onClick={() => handleDebtTagSelect(tag)}
                      aria-pressed={formValues.debtTag === tag}
                    >
                      {tag}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={styles.moreTagButton}
                    onClick={() => setShowMoreTagsDropdown(true)}
                  >
                    + More
                  </button>
                </div>
                {showMoreTagsDropdown ? (
                  <div className={styles.moreTagsDropdown}>
                    <ReusableDropdown
                      label="More tags"
                      options={MORE_DEBT_TAGS}
                      value={formValues.debtTag}
                      onChange={(value) => handleDebtTagSelect(value)}
                      placeholder="Search debt tags"
                      className={styles.dropdownField}
                      openOnMount
                      onOpenChange={(isOpen) => {
                        if (!isOpen) {
                          setShowMoreTagsDropdown(false);
                        }
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <div className={styles.lastMonthRow}>
                <button
                  type="button"
                  className={`${styles.switchButton} ${
                    formValues.debtLastMonth ? styles.switchButtonActive : ''
                  }`}
                  onClick={() => updateField('debtLastMonth', !formValues.debtLastMonth)}
                  aria-pressed={formValues.debtLastMonth}
                >
                  <span className={styles.switchTrack}>
                    <span className={styles.switchThumb} />
                  </span>
                  <span className={styles.switchLabel}>Last Month</span>
                </button>
              </div>

              {isRepayMode ? (
                <div className={styles.repayPlaceholder}>
                  Repay mode placeholder — additional controls will appear in a future update.
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'income' ? (
            <div className={styles.tabContent}>
              <div className={styles.tabGrid}>
                <ReusableDropdown
                  label="Category"
                  options={INCOME_CATEGORY_OPTIONS}
                  value={formValues.incomeCategory}
                  onChange={(value) => updateField('incomeCategory', value)}
                  placeholder="Select income category"
                  className={styles.dropdownField}
                />
                <ReusableDropdown
                  label="Shop (optional)"
                  options={SHOP_OPTIONS}
                  value={formValues.incomeShop}
                  onChange={(value) => updateField('incomeShop', value)}
                  placeholder="Select shop"
                  className={styles.dropdownField}
                />
              </div>
            </div>
          ) : null}

          {activeTab === 'expenses' ? (
            <div className={styles.tabContent}>
              <div className={styles.tabGrid}>
                <ReusableDropdown
                  label="Category"
                  options={EXPENSE_CATEGORY_OPTIONS}
                  value={formValues.expenseCategory}
                  onChange={(value) => updateField('expenseCategory', value)}
                  placeholder="Select expense category"
                  className={styles.dropdownField}
                />
                <ReusableDropdown
                  label="Shop (optional)"
                  options={SHOP_OPTIONS}
                  value={formValues.expenseShop}
                  onChange={(value) => updateField('expenseShop', value)}
                  placeholder="Select shop"
                  className={styles.dropdownField}
                />
              </div>
            </div>
          ) : null}

          {activeTab === 'transfer' ? (
            <div className={styles.tabContent}>
              <div className={styles.tabGrid}>
                <ReusableDropdown
                  label="From account"
                  options={ACCOUNT_OPTIONS}
                  value={formValues.transferFromAccount}
                  onChange={(value) => updateField('transferFromAccount', value)}
                  placeholder="Select source"
                  className={styles.dropdownField}
                />
                <ReusableDropdown
                  label="To account"
                  options={ACCOUNT_OPTIONS}
                  value={formValues.transferToAccount}
                  onChange={(value) => updateField('transferToAccount', value)}
                  placeholder="Select destination"
                  className={styles.dropdownField}
                />
              </div>
            </div>
          ) : null}
        </section>

        <footer className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={requestClose}>
            Cancel
          </button>
          <button type="button" className={styles.primaryButton} onClick={handleSave}>
            Save Transaction
          </button>
        </footer>
      </div>
    </div>
  );
}

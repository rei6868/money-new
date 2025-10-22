import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiRotateCcw, FiX } from 'react-icons/fi';

import { ConfirmationModal } from '../common/ConfirmationModal';
import SegmentedControl from '../ui/SegmentedControl';
import DebtTabContent from './DebtTabContent';
import ExpensesTabContent from './ExpensesTabContent';
import IncomeTabContent from './IncomeTabContent';
import TransferTabContent from './TransferTabContent';
import styles from './AddTransactionModal.module.css';

const MONTH_TAGS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const getTodayDateString = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today.toISOString().slice(0, 10);
};

const buildMonthTag = (dateString, offset = 0) => {
  if (!dateString) {
    return '';
  }

  const [yearPart, monthPart] = dateString.split('-');
  const parsedYear = Number(yearPart);
  const parsedMonth = Number(monthPart);

  if (!Number.isFinite(parsedYear) || !Number.isFinite(parsedMonth)) {
    return '';
  }

  const baseDate = new Date(parsedYear, parsedMonth - 1 + offset, 1);
  if (Number.isNaN(baseDate.getTime())) {
    return '';
  }

  const monthLabel = MONTH_TAGS[baseDate.getMonth()] ?? '';
  const shortYear = String(baseDate.getFullYear()).slice(-2).padStart(2, '0');
  return monthLabel ? `${monthLabel}${shortYear}` : '';
};

const BASE_FORM_STATE = {
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
  transferCategory: '',
  transferFromAccount: '',
  transferToAccount: '',
};

const createInitialFormState = () => {
  const date = getTodayDateString();
  const defaultDebtTag = buildMonthTag(date);

  return {
    ...BASE_FORM_STATE,
    date,
    debtTag: defaultDebtTag,
  };
};

const ACCOUNT_OPTIONS = ['Account 1', 'Account 2', 'Saving Account'];
const PERSON_OPTIONS = ['Person A', 'Person B', 'Mom'];
const DEBT_CATEGORY_OPTIONS = ['Debt Category 1', 'Loan Repayment'];
const INCOME_CATEGORY_OPTIONS = ['Salary', 'Bonus'];
const EXPENSE_CATEGORY_OPTIONS = ['Groceries', 'Dining', 'Transport'];
const SHOP_OPTIONS = ['Main Shop', 'Online Store', 'Local Market'];
const DEBT_TAG_LIBRARY = ['AUG25', 'SEP25', 'OCT25', 'JUL25', 'JUN25', 'MAY25'];
const TRANSFER_CATEGORY_OPTIONS = ['Internal Transfer', 'Savings Allocation'];

const TRANSACTION_TYPE_OPTIONS = [
  { value: 'debt', label: 'Debt', tone: 'negative' },
  { value: 'income', label: 'Income', tone: 'positive' },
  { value: 'expenses', label: 'Expenses', tone: 'negative' },
  { value: 'transfer', label: 'Transfer', tone: 'positive' },
];
const DEFAULT_TRANSACTION_TYPE = TRANSACTION_TYPE_OPTIONS[0].value;

export default function AddTransactionModal({ isOpen, onClose, onSave, onRequestClose }) {
  const initialFormRef = useRef(createInitialFormState());
  const [transactionType, setTransactionType] = useState(DEFAULT_TRANSACTION_TYPE);
  const [formValues, setFormValues] = useState(() => initialFormRef.current);
  const [lastClearedNotes, setLastClearedNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(initialFormRef.current.date);
  const [selectedDebtTag, setSelectedDebtTag] = useState(initialFormRef.current.debtTag);
  const [isLastMonth, setIsLastMonth] = useState(initialFormRef.current.debtLastMonth);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemType, setNewItemType] = useState('');
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const currentDateTag = useMemo(() => buildMonthTag(selectedDate), [selectedDate]);
  const previousMonthTag = useMemo(() => buildMonthTag(selectedDate, -1), [selectedDate]);
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) {
      return '';
    }

    const [year, month, day] = selectedDate.split('-');
    if (!year || !month || !day) {
      return '';
    }

    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }, [selectedDate]);
  const mockModalTitleId = useMemo(
    () => `add-transaction-new-item-${Math.random().toString(36).slice(2)}`,
    [],
  );

  const resetForm = useCallback(() => {
    const nextInitialState = createInitialFormState();
    initialFormRef.current = nextInitialState;
    setFormValues(nextInitialState);
    setSelectedDate(nextInitialState.date);
    setSelectedDebtTag(nextInitialState.debtTag);
    setIsLastMonth(nextInitialState.debtLastMonth);
    setTransactionType(DEFAULT_TRANSACTION_TYPE);
    setLastClearedNotes('');
    setShowNewItemModal(false);
    setNewItemType('');
    setShowUnsavedModal(false);
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

  const isDirty = useMemo(() => {
    const referenceState = initialFormRef.current ?? BASE_FORM_STATE;
    return Object.keys(referenceState).some((key) => {
      const initialValue = referenceState[key];
      const currentValue = formValues[key];

      if (typeof initialValue === 'boolean') {
        return Boolean(initialValue) !== Boolean(currentValue);
      }

      return (initialValue ?? '') !== (currentValue ?? '');
    });
  }, [formValues]);

  const finalizeClose = useCallback(() => {
    resetForm();
    onClose?.();
  }, [onClose, resetForm]);

  const requestClose = useCallback(async () => {
    if (!isDirty) {
      finalizeClose();
      return;
    }

    if (onRequestClose) {
      try {
        const shouldClose = await onRequestClose({ hasChanges: true });
        if (shouldClose) {
          finalizeClose();
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
      return;
    }

    setShowUnsavedModal(true);
  }, [finalizeClose, isDirty, onRequestClose]);

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
    updateField('date', selectedDate);
  }, [selectedDate, updateField]);

  useEffect(() => {
    const nextTag = isLastMonth ? previousMonthTag : currentDateTag;
    if (!nextTag) {
      return;
    }

    setSelectedDebtTag((prev) => (prev === nextTag ? prev : nextTag));
  }, [currentDateTag, previousMonthTag, isLastMonth]);

  useEffect(() => {
    updateField('debtTag', selectedDebtTag ?? '');
  }, [selectedDebtTag, updateField]);

  useEffect(() => {
    updateField('debtLastMonth', isLastMonth);
  }, [isLastMonth, updateField]);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  };

  const titleId = 'add-transaction-modal-title';
  const descriptionId = 'add-transaction-modal-description';

  const handleTransactionTypeChange = (nextType) => {
    const fallback = DEFAULT_TRANSACTION_TYPE;
    const isSupported = TRANSACTION_TYPE_OPTIONS.some((option) => option.value === nextType);
    setTransactionType(isSupported ? nextType : fallback);
  };

  const handleSave = () => {
    const payload = { ...formValues, kind: transactionType };
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
    setSelectedDebtTag(tag || '');
  };

  const isRepayMode = formValues.debtType === 'repay';
  const defaultDebtTag = isLastMonth ? previousMonthTag : currentDateTag;

  const debtTagOptions = useMemo(() => {
    const tags = new Set(DEBT_TAG_LIBRARY);
    if (defaultDebtTag) {
      tags.add(defaultDebtTag);
    }
    if (selectedDebtTag) {
      tags.add(selectedDebtTag);
    }
    return Array.from(tags)
      .filter(Boolean)
      .sort();
  }, [defaultDebtTag, selectedDebtTag]);
  const debtTagLabel = isRepayMode ? 'Debt Repayments' : 'Debt Tag';
  const debtTagModalType = isRepayMode ? 'Debt Repayment' : 'Debt Tag';
  const isTransferAccountConflict = useMemo(() => {
    const from = formValues.transferFromAccount;
    const to = formValues.transferToAccount;
    return Boolean(from && to && from === to);
  }, [formValues.transferFromAccount, formValues.transferToAccount]);

  const handleToggleLastMonth = useCallback(() => {
    setIsLastMonth((prev) => !prev);
  }, []);

  const renderDateField = ({ label = 'Date', className = '', showFormatted = true } = {}) => {
    const containerClasses = [styles.field, className].filter(Boolean).join(' ');
    return (
      <div className={containerClasses}>
        <div className={styles.fieldLabelRow}>
          <label className={styles.fieldLabel} htmlFor="transaction-date">
            {label}
          </label>
          {showFormatted && formattedSelectedDate ? (
            <span className={styles.dateDisplay}>{formattedSelectedDate}</span>
          ) : null}
        </div>
        <input
          id="transaction-date"
          type="date"
          className={`${styles.input} ${styles.formFieldBase}`}
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
        />
      </div>
    );
  };

  const renderAmountField = ({ className = '' } = {}) => {
    const containerClasses = [styles.field, className].filter(Boolean).join(' ');
    return (
      <div className={containerClasses}>
        <label className={styles.fieldLabel} htmlFor="transaction-amount">
          Amount
        </label>
        <input
          id="transaction-amount"
          type="number"
          className={`${styles.input} ${styles.formFieldBase}`}
          value={formValues.amount}
          onChange={(event) => updateField('amount', event.target.value)}
          placeholder="0.00"
          step="0.01"
        />
      </div>
    );
  };

  const renderNotesField = ({ className = '', fullRow = true } = {}) => {
    const containerClasses = [styles.field, styles.notesFieldContainer];
    if (fullRow) {
      containerClasses.push(styles.fullRow);
    }
    if (className) {
      containerClasses.push(className);
    }

    return (
      <div className={containerClasses.join(' ')}>
        <div className={styles.fieldLabelRow}>
          <label className={styles.fieldLabel} htmlFor="transaction-notes">
            Notes
          </label>
        </div>
        <div className={styles.inputWrapper}>
          <textarea
            id="transaction-notes"
            className={styles.textarea}
            value={formValues.notes}
            onChange={handleNotesChange}
            placeholder="Add a note or short description"
            rows={1}
          />
          <div className={styles.notesActions}>
            {formValues.notes ? (
              <button
                type="button"
                className={`${styles.notesIconButton} ${styles.notesClearButton}`}
                onClick={handleClearNotes}
                aria-label="Clear notes"
                title="Clear notes"
              >
                <FiX aria-hidden />
              </button>
            ) : null}
            {!formValues.notes && lastClearedNotes ? (
              <button
                type="button"
                className={`${styles.notesIconButton} ${styles.notesRestoreButton}`}
                onClick={handleRestoreNotes}
                aria-label="Restore last cleared notes"
                title="Restore last cleared notes"
              >
                <FiRotateCcw aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const handleOpenNewItemModal = useCallback((type) => {
    setNewItemType(type);
    setShowNewItemModal(true);
  }, []);

  const handleCloseNewItemModal = useCallback(() => {
    setShowNewItemModal(false);
    setNewItemType('');
  }, []);

  const handleConfirmUnsavedClose = useCallback(() => {
    setShowUnsavedModal(false);
    finalizeClose();
  }, [finalizeClose]);

  const handleCancelUnsavedClose = useCallback(() => {
    setShowUnsavedModal(false);
  }, []);

  const mockModalTitleText = newItemType ? `Add New ${newItemType}` : 'Add New Item';

  if (!isOpen) {
    return null;
  }

  return (
    <>
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

        <div className={styles.modalBody}>
          <div className={styles.transactionTypeSelector}>
            <SegmentedControl
              className={styles.transactionTypeSegmented}
              options={TRANSACTION_TYPE_OPTIONS}
              value={transactionType}
              onChange={handleTransactionTypeChange}
              name="transaction-type"
              ariaLabel="Transaction Type"
            />
          </div>

          <section
            className={styles.tabPanel}
            id={`add-transaction-panel-${transactionType}`}
            role="region"
            aria-labelledby={`transaction-type-${transactionType}`}
          >
            {transactionType === 'debt' ? (
              <DebtTabContent
                formValues={formValues}
                updateField={updateField}
                renderDateField={renderDateField}
                renderAmountField={renderAmountField}
                renderNotesField={renderNotesField}
                personOptions={PERSON_OPTIONS}
                accountOptions={ACCOUNT_OPTIONS}
                debtCategoryOptions={DEBT_CATEGORY_OPTIONS}
                debtTagOptions={debtTagOptions}
                selectedDebtTag={selectedDebtTag}
                onDebtTagSelect={handleDebtTagSelect}
                debtTagLabel={debtTagLabel}
                debtTagModalType={debtTagModalType}
                onOpenNewItemModal={handleOpenNewItemModal}
                isRepayMode={isRepayMode}
                isLastMonth={isLastMonth}
                onToggleLastMonth={handleToggleLastMonth}
              />
            ) : null}

            {transactionType === 'income' ? (
              <IncomeTabContent
                formValues={formValues}
                updateField={updateField}
                renderDateField={renderDateField}
                renderAmountField={renderAmountField}
                renderNotesField={renderNotesField}
                accountOptions={ACCOUNT_OPTIONS}
                categoryOptions={INCOME_CATEGORY_OPTIONS}
                shopOptions={SHOP_OPTIONS}
                onOpenNewItemModal={handleOpenNewItemModal}
              />
            ) : null}

            {transactionType === 'expenses' ? (
              <ExpensesTabContent
                formValues={formValues}
                updateField={updateField}
                renderDateField={renderDateField}
                renderAmountField={renderAmountField}
                renderNotesField={renderNotesField}
                accountOptions={ACCOUNT_OPTIONS}
                categoryOptions={EXPENSE_CATEGORY_OPTIONS}
                shopOptions={SHOP_OPTIONS}
                onOpenNewItemModal={handleOpenNewItemModal}
              />
            ) : null}

            {transactionType === 'transfer' ? (
              <TransferTabContent
                formValues={formValues}
                updateField={updateField}
                renderDateField={renderDateField}
                renderAmountField={renderAmountField}
                renderNotesField={renderNotesField}
                accountOptions={ACCOUNT_OPTIONS}
                categoryOptions={TRANSFER_CATEGORY_OPTIONS}
                onOpenNewItemModal={handleOpenNewItemModal}
                isTransferAccountConflict={isTransferAccountConflict}
              />
            ) : null}
          </section>
        </div>

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

      <ConfirmationModal
        isOpen={showUnsavedModal}
        title="Discard unsaved changes?"
        message="You have transaction details that haven't been saved yet. Closing now will discard them."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        confirmTone="danger"
        onConfirm={handleConfirmUnsavedClose}
        onCancel={handleCancelUnsavedClose}
      />

      {showNewItemModal ? (
        <div
          className={styles.mockOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby={mockModalTitleId}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseNewItemModal();
            }
          }}
        >
          <div
            className={styles.mockModal}
            role="document"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className={styles.mockModalTitle} id={mockModalTitleId}>
              {mockModalTitleText}
            </h3>
            <p className={styles.mockModalBody}>
              This is a placeholder modal for creating new dropdown entries. Replace it with the
              appropriate form when ready.
            </p>
            <button type="button" className={styles.mockModalButton} onClick={handleCloseNewItemModal}>
              Close Mock
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

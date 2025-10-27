import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { FiX } from 'react-icons/fi';

import AddTransactionModal from '../transactions/AddTransactionModal';
import styles from '../../styles/AddModalGlobal.module.css';

export type AddModalType = 'transaction' | 'account' | 'person';

export interface AddModalProps {
  type: AddModalType;
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (type: AddModalType, payload: Record<string, unknown>) => Promise<void> | void;
}

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'credit', label: 'Credit' },
  { value: 'investment', label: 'Investment' },
];

const ACCOUNT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const PERSON_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export function AddModalGlobal({ type, isOpen, onClose, onSubmit }: AddModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState(ACCOUNT_TYPES[0]?.value ?? 'cash');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [accountStatus, setAccountStatus] = useState(ACCOUNT_STATUSES[0]?.value ?? 'active');
  const [accountNote, setAccountNote] = useState('');

  const [personName, setPersonName] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [personStatus, setPersonStatus] = useState(PERSON_STATUSES[0]?.value ?? 'active');

  const modalTitle = useMemo(() => {
    switch (type) {
      case 'transaction':
        return '+ Add Transaction';
      case 'person':
        return '+ Add Person';
      default:
        return '+ Add Account';
    }
  }, [type]);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    setAccountName('');
    setAccountType(ACCOUNT_TYPES[0]?.value ?? 'cash');
    setOpeningBalance('0');
    setAccountStatus(ACCOUNT_STATUSES[0]?.value ?? 'active');
    setAccountNote('');
    setPersonName('');
    setPersonEmail('');
    setPersonStatus(PERSON_STATUSES[0]?.value ?? 'active');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || type === 'transaction') {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const focusable = document.querySelector<HTMLElement>(`#add-modal-field-${type === 'account' ? 'accountName' : 'personName'}`);
    focusable?.focus({ preventScroll: true });
  }, [isOpen, type]);

  if (!isOpen) {
    return null;
  }

  if (type === 'transaction') {
    return (
      <AddTransactionModal
        isOpen={isOpen}
        onClose={onClose}
        onRequestClose={onClose}
        onSave={(payload: Record<string, unknown>) => {
          void onSubmit?.('transaction', payload);
        }}
      />
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    try {
      setIsSubmitting(true);
      if (type === 'account') {
        const payload = {
          accountName: accountName.trim(),
          accountType,
          openingBalance,
          status: accountStatus,
          notes: accountNote.trim(),
        };
        await onSubmit?.('account', payload);
      } else if (type === 'person') {
        const payload = {
          fullName: personName.trim(),
          email: personEmail.trim(),
          status: personStatus,
        };
        await onSubmit?.('person', payload);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={modalTitle}>
        <div className={styles.header}>
          <h2 className={styles.title}>{modalTitle}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close add modal">
            <FiX aria-hidden />
          </button>
        </div>
        <form className={styles.content} onSubmit={handleSubmit}>
          {type === 'account' ? (
            <>
              <label className={styles.field} htmlFor="add-modal-field-accountName">
                <span className={styles.fieldLabel}>Account name</span>
                <input
                  id="add-modal-field-accountName"
                  className={styles.input}
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  required
                />
              </label>
              <label className={styles.field} htmlFor="add-modal-field-accountType">
                <span className={styles.fieldLabel}>Account type</span>
                <select
                  id="add-modal-field-accountType"
                  className={styles.input}
                  value={accountType}
                  onChange={(event) => setAccountType(event.target.value)}
                >
                  {ACCOUNT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field} htmlFor="add-modal-field-openingBalance">
                <span className={styles.fieldLabel}>Opening balance</span>
                <input
                  id="add-modal-field-openingBalance"
                  className={styles.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingBalance}
                  onChange={(event) => setOpeningBalance(event.target.value)}
                  required
                />
              </label>
              <label className={styles.field} htmlFor="add-modal-field-accountStatus">
                <span className={styles.fieldLabel}>Status</span>
                <select
                  id="add-modal-field-accountStatus"
                  className={styles.input}
                  value={accountStatus}
                  onChange={(event) => setAccountStatus(event.target.value)}
                >
                  {ACCOUNT_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field} htmlFor="add-modal-field-accountNote">
                <span className={styles.fieldLabel}>Notes</span>
                <textarea
                  id="add-modal-field-accountNote"
                  className={styles.textarea}
                  rows={3}
                  value={accountNote}
                  onChange={(event) => setAccountNote(event.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label className={styles.field} htmlFor="add-modal-field-personName">
                <span className={styles.fieldLabel}>Full name</span>
                <input
                  id="add-modal-field-personName"
                  className={styles.input}
                  value={personName}
                  onChange={(event) => setPersonName(event.target.value)}
                  required
                />
              </label>
              <label className={styles.field} htmlFor="add-modal-field-personEmail">
                <span className={styles.fieldLabel}>Email (optional)</span>
                <input
                  id="add-modal-field-personEmail"
                  className={styles.input}
                  type="email"
                  value={personEmail}
                  onChange={(event) => setPersonEmail(event.target.value)}
                  placeholder="name@example.com"
                />
              </label>
              <label className={styles.field} htmlFor="add-modal-field-personStatus">
                <span className={styles.fieldLabel}>Status</span>
                <select
                  id="add-modal-field-personStatus"
                  className={styles.input}
                  value={personStatus}
                  onChange={(event) => setPersonStatus(event.target.value)}
                >
                  {PERSON_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <div className={styles.footer}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddModalGlobal;

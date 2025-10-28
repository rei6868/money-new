import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FiX } from 'react-icons/fi';

import type { AccountRow } from './accountColumns';
import modalStyles from '../../styles/AddModalGlobal.module.css';

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'credit', label: 'Credit' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
];

const ACCOUNT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

export type AccountEditPayload = {
  accountId: string;
  accountName: string;
  accountType: string;
  status: string;
  notes: string;
  openingBalance: number;
};

type AccountEditModalProps = {
  account: AccountRow | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (payload: AccountEditPayload) => Promise<void> | void;
};

export function AccountEditModal({ account, isOpen, onClose, onSubmit }: AccountEditModalProps) {
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState(ACCOUNT_TYPES[0]?.value ?? 'cash');
  const [status, setStatus] = useState(ACCOUNT_STATUSES[0]?.value ?? 'active');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalTitle = useMemo(() => {
    if (!account) {
      return 'Edit account';
    }
    return `Edit ${account.accountName ?? 'account'}`;
  }, [account]);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      return;
    }
    const resolvedType = ACCOUNT_TYPES.find((item) => item.value === account?.accountType)?.value;
    const resolvedStatus = ACCOUNT_STATUSES.find((item) => item.value === account?.status)?.value;

    setAccountName(account?.accountName ?? '');
    setAccountType(resolvedType ?? (account?.accountType ?? ACCOUNT_TYPES[0]?.value ?? 'cash'));
    setStatus(resolvedStatus ?? (account?.status ?? ACCOUNT_STATUSES[0]?.value ?? 'active'));
    setOpeningBalance(String(account?.openingBalance ?? 0));
    setNotes(account?.notes ?? '');
  }, [account, isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('#account-edit-name');
      input?.focus({ preventScroll: true });
    }, 20);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !account) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: AccountEditPayload = {
        accountId: account.accountId,
        accountName: accountName.trim() || account.accountName,
        accountType,
        status,
        notes: notes.trim(),
        openingBalance: Number.parseFloat(openingBalance) || 0,
      };
      await onSubmit?.(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={modalStyles.overlay}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className={modalStyles.dialog} role="dialog" aria-modal="true" aria-label={modalTitle}>
        <div className={modalStyles.header}>
          <h2 className={modalStyles.title}>{modalTitle}</h2>
          <button
            type="button"
            className={modalStyles.closeButton}
            onClick={onClose}
            aria-label="Close edit account modal"
            disabled={isSubmitting}
          >
            <FiX aria-hidden />
          </button>
        </div>
        <form className={modalStyles.content} onSubmit={handleSubmit}>
          <label className={modalStyles.field} htmlFor="account-edit-name">
            <span className={modalStyles.fieldLabel}>Account name</span>
            <input
              id="account-edit-name"
              className={modalStyles.input}
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </label>
          <label className={modalStyles.field} htmlFor="account-edit-type">
            <span className={modalStyles.fieldLabel}>Account type</span>
            <select
              id="account-edit-type"
              className={modalStyles.input}
              value={accountType}
              onChange={(event) => setAccountType(event.target.value)}
              disabled={isSubmitting}
            >
              {ACCOUNT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={modalStyles.field} htmlFor="account-edit-status">
            <span className={modalStyles.fieldLabel}>Status</span>
            <select
              id="account-edit-status"
              className={modalStyles.input}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={isSubmitting}
            >
              {ACCOUNT_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={modalStyles.field} htmlFor="account-edit-opening">
            <span className={modalStyles.fieldLabel}>Opening balance</span>
            <input
              id="account-edit-opening"
              className={modalStyles.input}
              type="number"
              min="0"
              step="0.01"
              value={openingBalance}
              onChange={(event) => setOpeningBalance(event.target.value)}
              disabled={isSubmitting}
            />
          </label>
          <label className={modalStyles.field} htmlFor="account-edit-notes">
            <span className={modalStyles.fieldLabel}>Notes</span>
            <textarea
              id="account-edit-notes"
              className={modalStyles.textarea}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </label>
          <div className={modalStyles.footer}>
            <button
              type="button"
              className={modalStyles.secondaryButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className={modalStyles.primaryButton} disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AccountEditModal;

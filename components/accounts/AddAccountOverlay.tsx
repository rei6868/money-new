import React, { FormEvent, useEffect, useState, useCallback } from 'react';
import { FiX } from 'react-icons/fi';

import { ConfirmationModal } from '../common/ConfirmationModal';
import { usePeople } from '../../hooks/usePeople';
import {
  getAccountTypeOptions,
  getAccountStatusOptions,
  ACCOUNT_STATUS_VALUES,
} from '../../lib/accounts/accountTypes';
import type { CreateAccountPayload } from '../../hooks/useAccounts';
import styles from './AddAccountOverlay.module.css';

export type AddAccountOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAccountPayload) => Promise<boolean>;
};

const ACCOUNT_TYPE_OPTIONS = getAccountTypeOptions();
const ACCOUNT_STATUS_OPTIONS = getAccountStatusOptions();

export function AddAccountOverlay({ isOpen, onClose, onSubmit }: AddAccountOverlayProps) {
  const { activePeople, isLoading: isPeopleLoading } = usePeople();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<string>(ACCOUNT_TYPE_OPTIONS[0]?.value ?? 'bank');
  const [ownerId, setOwnerId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [accountStatus, setAccountStatus] = useState<string>(ACCOUNT_STATUS_VALUES.ACTIVE);
  const [accountNote, setAccountNote] = useState('');
  const [showConfirmExit, setShowConfirmExit] = useState(false);

  // Track if form has been modified (dirty state)
  const [isDirty, setIsDirty] = useState(false);

  // Auto-select first active person as default owner
  useEffect(() => {
    if (!ownerId && activePeople.length > 0) {
      setOwnerId(activePeople[0].personId);
    }
  }, [activePeople, ownerId]);

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setIsSubmitting(false);
    setAccountName('');
    setAccountType(ACCOUNT_TYPE_OPTIONS[0]?.value ?? 'bank');
    setOwnerId(activePeople.length > 0 ? activePeople[0].personId : '');
    setOpeningBalance('0');
    setAccountStatus(ACCOUNT_STATUS_VALUES.ACTIVE);
    setAccountNote('');
    setIsDirty(false);
  }, [isOpen, activePeople]);

  // Lock body scroll when modal is open
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

  // Focus first input when modal opens
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return;
    }
    const focusable = document.querySelector<HTMLElement>('#add-account-overlay-name');
    focusable?.focus({ preventScroll: true });
  }, [isOpen]);

  // Mark form as dirty when any field changes
  const markDirty = useCallback(() => {
    if (!isDirty) {
      setIsDirty(true);
    }
  }, [isDirty]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowConfirmExit(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleConfirmExit = useCallback(() => {
    setShowConfirmExit(false);
    onClose();
  }, [onClose]);

  const handleCancelExit = useCallback(() => {
    setShowConfirmExit(false);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (!ownerId) {
      alert('Please select an account owner');
      return;
    }

    try {
      setIsSubmitting(true);

      const openingBalanceNum = parseFloat(openingBalance) || 0;

      const payload: CreateAccountPayload = {
        accountName: accountName.trim(),
        accountType,
        ownerId,
        openingBalance: openingBalanceNum,
        currentBalance: openingBalanceNum, // Initially same as opening balance
        status: accountStatus,
        notes: accountNote.trim() || undefined,
      };

      const success = await onSubmit(payload);
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className={styles.overlay}
        role="presentation"
        onClick={(event) => event.target === event.currentTarget && handleClose()}
      >
        <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Add new account">
          <div className={styles.header}>
            <h2 className={styles.title}>+ Add Account</h2>
            <button
              type="button"
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Close add account modal"
            >
              <FiX aria-hidden />
            </button>
          </div>
          <form className={styles.content} onSubmit={handleSubmit}>
            <label className={styles.field} htmlFor="add-account-overlay-name">
              <span className={styles.fieldLabel}>Account name *</span>
              <input
                id="add-account-overlay-name"
                className={styles.input}
                value={accountName}
                onChange={(event) => {
                  setAccountName(event.target.value);
                  markDirty();
                }}
                required
                placeholder="e.g., Vietcombank Savings"
              />
            </label>

            <label className={styles.field} htmlFor="add-account-overlay-type">
              <span className={styles.fieldLabel}>Account type *</span>
              <select
                id="add-account-overlay-type"
                className={styles.input}
                value={accountType}
                onChange={(event) => {
                  setAccountType(event.target.value);
                  markDirty();
                }}
              >
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field} htmlFor="add-account-overlay-owner">
              <span className={styles.fieldLabel}>Owner *</span>
              <select
                id="add-account-overlay-owner"
                className={styles.input}
                value={ownerId}
                onChange={(event) => {
                  setOwnerId(event.target.value);
                  markDirty();
                }}
                required
                disabled={isPeopleLoading || activePeople.length === 0}
              >
                {activePeople.length === 0 ? (
                  <option value="">No active people available</option>
                ) : (
                  activePeople.map((person) => (
                    <option key={person.personId} value={person.personId}>
                      {person.fullName}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className={styles.field} htmlFor="add-account-overlay-balance">
              <span className={styles.fieldLabel}>Opening balance *</span>
              <input
                id="add-account-overlay-balance"
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(event) => {
                  setOpeningBalance(event.target.value);
                  markDirty();
                }}
                required
                placeholder="0.00"
              />
            </label>

            <label className={styles.field} htmlFor="add-account-overlay-status">
              <span className={styles.fieldLabel}>Status *</span>
              <select
                id="add-account-overlay-status"
                className={styles.input}
                value={accountStatus}
                onChange={(event) => {
                  setAccountStatus(event.target.value);
                  markDirty();
                }}
              >
                {ACCOUNT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field} htmlFor="add-account-overlay-note">
              <span className={styles.fieldLabel}>Notes</span>
              <textarea
                id="add-account-overlay-note"
                className={styles.textarea}
                rows={3}
                value={accountNote}
                onChange={(event) => {
                  setAccountNote(event.target.value);
                  markDirty();
                }}
                placeholder="Optional notes about this account"
              />
            </label>

            <div className={styles.footer}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save Account'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmExit}
        title="Discard changes?"
        message="You have unsaved changes. Are you sure you want to close this form?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />
    </>
  );
}

export default AddAccountOverlay;


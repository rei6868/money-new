import { useEffect } from "react";
import type { ReactNode } from "react";

import Button from "../ui/Button";

import styles from "./AccountModal.module.css";

interface AccountModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

export default function AccountModal({
  isOpen,
  title,
  description,
  onClose,
  children,
  primaryActionLabel,
  onPrimaryAction,
}: AccountModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handlePrimaryAction = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        aria-describedby={description ? "account-modal-description" : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="account-modal-title">{title}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {description ? (
          <p id="account-modal-description" className={styles.description}>
            {description}
          </p>
        ) : null}
        <div className={styles.body}>{children}</div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {primaryActionLabel ? (
            <Button variant="primary" onClick={handlePrimaryAction}>
              {primaryActionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

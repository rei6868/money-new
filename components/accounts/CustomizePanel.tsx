import React from 'react';
import { FiSettings } from 'react-icons/fi';

import styles from '../../styles/accounts.module.css';

type CustomizePanelProps = {
  isCustomizeMode: boolean;
  onToggleCustomize: () => void;
  onDone: () => void;
  onReset: () => void;
  onToggleAll: (checked: boolean) => void;
  allColumnsVisible: boolean;
  showOptionalColumns: boolean;
  onToggleOptionalColumns: (checked: boolean) => void;
  disabled?: boolean;
  isRefreshVisible?: boolean;
};

function ToggleSwitch({
  label,
  pressed,
  onClick,
  disabled,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.toggleSwitch}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.toggleVisual} data-state={pressed ? 'on' : 'off'} />
      <span className={styles.toggleLabel}>{label}</span>
    </button>
  );
}

export function CustomizePanel({
  isCustomizeMode,
  onToggleCustomize,
  onDone,
  onReset,
  onToggleAll,
  allColumnsVisible,
  showOptionalColumns,
  onToggleOptionalColumns,
  disabled = false,
  isRefreshVisible = true,
}: CustomizePanelProps) {
  const handleAllToggle = () => {
    onToggleAll(!allColumnsVisible);
  };

  const handleOptionalToggle = () => {
    onToggleOptionalColumns(!showOptionalColumns);
  };

  return (
    <div
      className={styles.customizeRow}
      aria-label="Customize table columns"
      data-mode={isCustomizeMode ? 'customize' : 'default'}
      data-refresh-visible={isRefreshVisible ? 'true' : 'false'}
    >
      <div className={styles.customizeToggleGroup}>
        <ToggleSwitch
          label="All"
          pressed={allColumnsVisible}
          onClick={handleAllToggle}
          disabled={disabled}
        />
        <ToggleSwitch
          label="Optional"
          pressed={showOptionalColumns}
          onClick={handleOptionalToggle}
          disabled={disabled}
        />
      </div>
      <div className={styles.customizeActionsCluster}>
        <button
          type="button"
          className={[
            styles.filterButton,
            styles.toolbarIconButton,
            isCustomizeMode ? styles.filterButtonActive : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={onToggleCustomize}
          aria-pressed={isCustomizeMode}
          disabled={disabled}
          aria-label={isCustomizeMode ? 'Exit customize mode' : 'Customize table columns'}
        >
          <FiSettings aria-hidden />
          <span className={styles.customizeButtonText}>
            {isCustomizeMode ? 'Done customizing' : 'Customize'}
          </span>
        </button>
        {isCustomizeMode ? (
          <>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onReset}
              disabled={disabled}
            >
              Reset
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onDone}
              disabled={disabled}
            >
              Done
            </button>
          </>
        ) : (
          <button type="button" className={styles.primaryButton} onClick={onDone} disabled>
            Done
          </button>
        )}
      </div>
    </div>
  );
}

export default CustomizePanel;

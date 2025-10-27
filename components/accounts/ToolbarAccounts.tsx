import React, { useEffect, useRef } from 'react';
import { FiRefreshCw, FiSearch } from 'react-icons/fi';

import CustomizePanel from './CustomizePanel';
import styles from '../../styles/accounts.module.css';
import { TableRestoreInput } from '../table';

type RestoreInputProps = {
  value: string;
  valueToRestoreLocally: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  previousValue?: string;
  onRestore: () => void;
  placeholder?: string;
  containerClassName?: string;
  inputClassName?: string;
  iconButtonClassName?: string;
  restoreButtonClassName?: string;
  clearButtonClassName?: string;
  actionsClassName?: string;
  onIconClick?: () => void;
  iconDisabled?: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement> & Record<string, unknown>;
  containerProps?: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
  inputTestId?: string;
  restoreButtonTestId?: string;
  clearButtonTestId?: string;
  restoreButtonAriaLabel?: string;
  clearButtonAriaLabel?: string;
  restoreButtonTitle?: string;
  clearButtonTitle?: string;
} & Record<string, unknown>;

const TableRestoreInputComponent =
  TableRestoreInput as unknown as React.ForwardRefExoticComponent<
    RestoreInputProps & React.RefAttributes<HTMLInputElement>
  >;

type ToolbarAccountsProps = {
  searchValue: string;
  clearedDraftQuery: string | null;
  appliedQuery: string;
  onSearchChange: (value: string) => void;
  onSubmitSearch: () => void;
  onClearSearch: () => void;
  onRestoreSearch: () => void;
  onRefresh: () => void;
  onResetFilters: () => void;
  isCustomizeMode: boolean;
  onToggleCustomizeMode: () => void;
  onResetColumns: () => void;
  onDoneCustomize: () => void;
  onToggleAllColumns: (checked: boolean) => void;
  allColumnsVisible: boolean;
  optionalColumnsVisible: boolean;
  onToggleOptionalColumns: (checked: boolean) => void;
  selectedCount: number;
  onDeselectAll: () => void;
  onToggleShowSelected: () => void;
  isShowingSelectedOnly: boolean;
  disabled?: boolean;
  showRefresh?: boolean;
};

export function ToolbarAccounts({
  searchValue,
  clearedDraftQuery,
  appliedQuery,
  onSearchChange,
  onSubmitSearch,
  onClearSearch,
  onRestoreSearch,
  onRefresh,
  onResetFilters,
  isCustomizeMode,
  onToggleCustomizeMode,
  onResetColumns,
  onDoneCustomize,
  onToggleAllColumns,
  allColumnsVisible,
  optionalColumnsVisible,
  onToggleOptionalColumns,
  selectedCount,
  onDeselectAll,
  onToggleShowSelected,
  isShowingSelectedOnly,
  disabled = false,
  showRefresh = true,
}: ToolbarAccountsProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  useEffect(() => {
    if (!isCustomizeMode) {
      return;
    }
    searchInputRef.current?.blur();
  }, [isCustomizeMode]);

  const isSearchEmpty = !searchValue.trim();
  const showRefreshButton = showRefresh && !isCustomizeMode;

  return (
    <section className={styles.toolbarCard} data-enhanced="true" aria-label="Accounts controls">
      <div className={styles.toolbarSearchRow}>
        <div className={styles.searchFieldCluster}>
          <TableRestoreInputComponent
            ref={searchInputRef}
            value={searchValue}
            valueToRestoreLocally={clearedDraftQuery}
            onChange={onSearchChange}
            onSubmit={onSubmitSearch}
            onClear={onClearSearch}
            previousValue={appliedQuery ?? ''}
            onRestore={() => {
              onRestoreSearch();
              focusSearchInput();
            }}
            placeholder="Search accounts by name, owner, or note"
            containerClassName={styles.searchGroup}
            inputClassName={styles.searchInput}
            iconButtonClassName={styles.searchIconButton}
            onIconClick={onSubmitSearch}
            iconDisabled={isSearchEmpty}
            restoreButtonClassName={styles.searchRestoreButton}
            clearButtonClassName={styles.searchClearButton}
            actionsClassName={styles.searchInputActions}
            inputProps={{
              disabled,
              'aria-disabled': disabled ? 'true' : undefined,
            }}
            containerProps={{
              'data-disabled': disabled ? 'true' : undefined,
            }}
          />
        </div>
        <div className={styles.searchButtonGroup}>
          <button
            type="button"
            className={styles.searchSubmitButton}
            onClick={onSubmitSearch}
            disabled={disabled || isSearchEmpty}
            aria-label="Search accounts"
          >
            <FiSearch className={styles.searchSubmitIcon} aria-hidden />
            <span className={styles.searchSubmitText}>Search</span>
          </button>
          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.toolbarIconButton}`.trim()}
            onClick={onResetFilters}
            disabled={disabled}
            aria-label="Reset search and filters"
          >
            <FiRefreshCw aria-hidden />
            <span className={styles.resetButtonText}>Reset</span>
          </button>
          {showRefreshButton ? (
            <button
              type="button"
              className={`${styles.secondaryButton} ${styles.toolbarIconButton}`.trim()}
              onClick={onRefresh}
              disabled={disabled}
              aria-label="Refresh accounts"
            >
              <FiRefreshCw aria-hidden />
              <span className={styles.resetButtonText}>Refresh</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.toolbarActionRow}>
        {selectedCount > 0 ? (
          <div className={styles.selectionActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onToggleShowSelected}
              disabled={disabled}
            >
              {isShowingSelectedOnly ? 'Show all' : 'Show selected'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onDeselectAll}
              disabled={disabled}
            >
              Deselect all
            </button>
          </div>
        ) : null}

        <CustomizePanel
          isCustomizeMode={isCustomizeMode}
          onToggleCustomize={onToggleCustomizeMode}
          onDone={onDoneCustomize}
          onReset={onResetColumns}
          onToggleAll={onToggleAllColumns}
          allColumnsVisible={allColumnsVisible}
          showOptionalColumns={optionalColumnsVisible}
          onToggleOptionalColumns={onToggleOptionalColumns}
          disabled={disabled}
          isRefreshVisible={showRefreshButton}
        />
      </div>
    </section>
  );
}

export default ToolbarAccounts;

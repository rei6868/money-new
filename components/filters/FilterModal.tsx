import { Fragment, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FiX } from 'react-icons/fi';

import type { FilterOption, TableFilters } from './filterTypes';
import { createEmptyFilters } from './filterTypes';

import styles from './FilterModal.module.css';

export type FilterModalProps = {
  open: boolean;
  filters: TableFilters;
  onClose: () => void;
  onApply: (filters: TableFilters) => void;
  options: {
    accounts: FilterOption[];
    people: FilterOption[];
    debtTags: FilterOption[];
    categories: FilterOption[];
  };
};

function toggleValue(values: string[], value: string, allowMultiple: boolean) {
  if (allowMultiple) {
    if (values.includes(value)) {
      return values.filter((current) => current !== value);
    }
    return [...values, value];
  }
  return values.includes(value) ? [] : [value];
}

export function FilterModal({ open, filters, onClose, onApply, options }: FilterModalProps) {
  const handleToggle = useCallback(
    (key: keyof TableFilters, value: string, allowMultiple = true) => {
      onApply({
        ...filters,
        [key]: toggleValue((filters[key] as string[]) ?? [], value, allowMultiple),
      });
    },
    [filters, onApply],
  );

  const handleDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      onApply({
        ...filters,
        dateRange: {
          ...filters.dateRange,
          [name]: value || null,
        },
      });
    },
    [filters, onApply],
  );

  const handleClearDates = useCallback(() => {
    onApply({
      ...filters,
      dateRange: createEmptyFilters().dateRange,
    });
  }, [filters, onApply]);

  const sections = useMemo(
    () => [
      { id: 'accounts' as const, label: 'Accounts', options: options.accounts, multiple: true },
      { id: 'people' as const, label: 'People', options: options.people, multiple: true },
      { id: 'debtTags' as const, label: 'Debt tags', options: options.debtTags, multiple: true },
      { id: 'categories' as const, label: 'Categories', options: options.categories, multiple: true },
    ],
    [options.accounts, options.categories, options.debtTags, options.people],
  );

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className={styles.wrapper} onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className={styles.backdrop} aria-hidden="true" />
        </Transition.Child>

        <div className={styles.panelContainer}>
          <Transition.Child
            as={Fragment}
            enter="transition duration-200"
            enterFrom="opacity-0 translate-y-4"
            enterTo="opacity-100 translate-y-0"
            leave="transition duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-4"
          >
            <Dialog.Panel className={styles.panel}>
              <header className={styles.header}>
                <div className={styles.titleGroup}>
                  <Dialog.Title className={styles.title}>Filters</Dialog.Title>
                  <p className={styles.subtitle}>Combine multiple filters and search to focus on the right set.</p>
                </div>
                <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close filters">
                  <FiX aria-hidden />
                </button>
              </header>

              <div className={styles.content}>
                {sections.map((section) => (
                  <section key={section.id} className={styles.optionSection}>
                    <header className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>{section.label}</h3>
                      <span className={styles.sectionHint}>
                        {section.multiple ? 'Select one or more' : 'Select one'}
                      </span>
                    </header>
                    <div className={styles.optionList}>
                      {section.options.length === 0 ? (
                        <p className={styles.sectionHint}>No options found.</p>
                      ) : (
                        section.options.map((option) => {
                          const values = (filters[section.id] as string[]) ?? [];
                          const isActive = values.includes(option.value);
                          return (
                            <label
                              key={option.value}
                              className={styles.optionChip}
                              data-active={isActive ? 'true' : undefined}
                            >
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => handleToggle(section.id, option.value, section.multiple)}
                              />
                              {option.label}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </section>
                ))}
              </div>

              <footer className={styles.footer}>
                <div className={styles.dateInputs}>
                  <label htmlFor="filter-date-start">From date</label>
                  <input
                    id="filter-date-start"
                    type="date"
                    name="start"
                    value={filters.dateRange.start ?? ''}
                    onChange={handleDateChange}
                  />
                  <label htmlFor="filter-date-end">To date</label>
                  <input
                    id="filter-date-end"
                    type="date"
                    name="end"
                    value={filters.dateRange.end ?? ''}
                    onChange={handleDateChange}
                  />
                </div>
                <div className={styles.footerActions}>
                  <button type="button" className={`${styles.footerButton} ${styles.footerButtonGhost}`.trim()} onClick={handleClearDates}>
                    Clear dates
                  </button>
                  <button type="button" className={`${styles.footerButton} ${styles.footerButtonPrimary}`.trim()} onClick={onClose}>
                    Done
                  </button>
                </div>
              </footer>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

export default FilterModal;

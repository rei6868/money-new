import { useEffect, useMemo, useState } from 'react';
import { Reorder } from 'framer-motion';
import {
  FiCheckCircle,
  FiMove,
  FiPlus,
  FiTrash2,
  FiZap,
} from 'react-icons/fi';
import type { QuickAddActionId } from '../../components/common/QuickAddModal';
import styles from '../../styles/QuickAddSettings.module.css';

type QuickAddShortcut = {
  id: string;
  type: QuickAddActionId;
  label: string;
  presetValues: string;
  isActive: boolean;
};

type ShortcutDefinition = {
  id: QuickAddActionId;
  label: string;
  description: string;
};

const STORAGE_KEY = 'money.quickAdd.shortcuts.v1';

const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  { id: 'income', label: 'Income', description: 'Capture paychecks or inflow transfers quickly.' },
  { id: 'expense', label: 'Expense', description: 'Track spending with pre-filled categories.' },
  { id: 'transfer', label: 'Transfer', description: 'Move funds between internal accounts.' },
  { id: 'refund', label: 'Refund', description: 'Credit an existing transaction.' },
  { id: 'cashAccount', label: 'Cash account', description: 'Open a petty cash or wallet ledger.' },
  { id: 'bankAccount', label: 'Bank account', description: 'Add a manual or synced bank account.' },
  { id: 'creditLine', label: 'Credit line', description: 'Log a credit card or revolving debt.' },
  { id: 'loanAccount', label: 'Loan', description: 'Track long-term liabilities or loans.' },
];

const DEFAULT_SHORTCUTS: QuickAddShortcut[] = [
  {
    id: 'default-income',
    type: 'income',
    label: 'Salary hit',
    presetValues: JSON.stringify({ category: 'Salary', currency: 'USD' }, null, 2),
    isActive: true,
  },
  {
    id: 'default-expense',
    type: 'expense',
    label: 'Coffee run',
    presetValues: JSON.stringify({ category: 'Food & Dining', amount: 8 }, null, 2),
    isActive: true,
  },
  {
    id: 'default-transfer',
    type: 'transfer',
    label: 'Sweep to savings',
    presetValues: JSON.stringify({ fromAccount: 'Checking', toAccount: 'Savings', amount: 100 }, null, 2),
    isActive: true,
  },
];

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `shortcut-${Math.random().toString(36).slice(2, 10)}`;
}

function loadShortcuts(): QuickAddShortcut[] {
  if (typeof window === 'undefined') {
    return DEFAULT_SHORTCUTS.map((shortcut) => ({ ...shortcut }));
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SHORTCUTS.map((shortcut) => ({ ...shortcut }));
    }
    const parsed = JSON.parse(raw) as QuickAddShortcut[];
    if (!Array.isArray(parsed)) {
      return DEFAULT_SHORTCUTS.map((shortcut) => ({ ...shortcut }));
    }
    return parsed.map((item) => ({
      ...item,
      id: item.id ?? generateId(),
      type: item.type ?? 'expense',
      label: item.label ?? 'Shortcut',
      presetValues: item.presetValues ?? '{}',
      isActive: item.isActive !== false,
    }));
  } catch (error) {
    console.warn('Failed to load quick add shortcuts from storage', error);
    return DEFAULT_SHORTCUTS.map((shortcut) => ({ ...shortcut }));
  }
}

export default function QuickAddSettingsPage() {
  const [shortcuts, setShortcuts] = useState<QuickAddShortcut[]>(() => loadShortcuts());
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated || typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
  }, [hasHydrated, shortcuts]);

  const typeLookup = useMemo(() => {
    return new Map(SHORTCUT_DEFINITIONS.map((definition) => [definition.id, definition]));
  }, []);

  const handleReorder = (next: QuickAddShortcut[]) => {
    setShortcuts(next);
  };

  const handleAddShortcut = () => {
    const [firstType] = SHORTCUT_DEFINITIONS;
    setShortcuts((prev) => [
      ...prev,
      {
        id: generateId(),
        type: firstType?.id ?? 'expense',
        label: 'New shortcut',
        presetValues: '{\n  "amount": 0\n}',
        isActive: true,
      },
    ]);
  };

  const handleReset = () => {
    setShortcuts(DEFAULT_SHORTCUTS.map((shortcut) => ({ ...shortcut })));
  };

  const handleUpdate = (id: string, partial: Partial<QuickAddShortcut>) => {
    setShortcuts((prev) =>
      prev.map((shortcut) => (shortcut.id === id ? { ...shortcut, ...partial } : shortcut)),
    );
  };

  const handleRemove = (id: string) => {
    setShortcuts((prev) => prev.filter((shortcut) => shortcut.id !== id));
  };

  return (
    <div className={styles.page}>
        <section className={styles.board}>
          <header className={styles.boardHeader}>
            <div className={styles.boardTitleGroup}>
              <span className={styles.boardIcon} aria-hidden>
                <FiZap />
              </span>
              <div>
                <h1 className={styles.boardTitle}>Shortcut stack</h1>
                <p className={styles.boardSubtitle}>
                  Arrange your go-to shortcuts. The first three appear on mobile quick access.
                </p>
              </div>
            </div>
            <div className={styles.boardActions}>
              <button type="button" className={styles.secondaryButton} onClick={handleReset}>
                Restore defaults
              </button>
              <button type="button" className={styles.primaryButton} onClick={handleAddShortcut}>
                <FiPlus aria-hidden /> Add shortcut
              </button>
            </div>
          </header>

          <Reorder.Group axis="y" values={shortcuts} onReorder={handleReorder} className={styles.shortcutsList}>
            {shortcuts.map((shortcut) => {
              const definition = typeLookup.get(shortcut.type);
              return (
                <Reorder.Item key={shortcut.id} value={shortcut} className={styles.shortcutItem}>
                  <span className={styles.dragHandle} aria-hidden>
                    <FiMove />
                  </span>
                  <div className={styles.shortcutBody}>
                    <div className={styles.shortcutHeader}>
                      <input
                        type="text"
                        className={styles.shortcutLabel}
                        value={shortcut.label}
                        onChange={(event) => handleUpdate(shortcut.id, { label: event.target.value })}
                        placeholder="Shortcut label"
                      />
                      <button
                        type="button"
                        className={styles.statusButton}
                        data-active={shortcut.isActive ? 'true' : undefined}
                        onClick={() => handleUpdate(shortcut.id, { isActive: !shortcut.isActive })}
                      >
                        <FiCheckCircle aria-hidden />
                        {shortcut.isActive ? 'Active' : 'Paused'}
                      </button>
                    </div>
                    <div className={styles.shortcutMeta}>
                      <label className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Shortcut type</span>
                        <select
                          className={styles.fieldSelect}
                          value={shortcut.type}
                          onChange={(event) =>
                            handleUpdate(shortcut.id, { type: event.target.value as QuickAddActionId })
                          }
                        >
                          {SHORTCUT_DEFINITIONS.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        {definition ? (
                          <span className={styles.fieldHint}>{definition.description}</span>
                        ) : null}
                      </label>
                      <label className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Preset JSON</span>
                        <textarea
                          className={styles.fieldTextarea}
                          rows={3}
                          value={shortcut.presetValues}
                          onChange={(event) => handleUpdate(shortcut.id, { presetValues: event.target.value })}
                        />
                        <span className={styles.fieldHint}>Stored locally for now — sync coming soon.</span>
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleRemove(shortcut.id)}
                    aria-label={`Remove shortcut ${shortcut.label}`}
                  >
                    <FiTrash2 aria-hidden />
                  </button>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </section>

        <aside className={styles.sidePanel}>
          <h2 className={styles.sideTitle}>How shortcuts work</h2>
          <p className={styles.sideCopy}>
            Shortcuts power the ⚡ Quick Add modal. Each entry stores optional presets such as amount, category,
            account, notes, or any metadata you wish to reuse. They are saved to your browser today and ready for
            syncing to the <code>quick_add_shortcut</code> table when persistence lands.
          </p>
          <ul className={styles.sideList}>
            <li>Drag items to reprioritise what shows up first.</li>
            <li>Toggle <strong>Active</strong> to hide shortcuts without deleting them.</li>
            <li>Use valid JSON for presets — it will be passed directly into the Add modal.</li>
          </ul>
        </aside>
    </div>
  );
}

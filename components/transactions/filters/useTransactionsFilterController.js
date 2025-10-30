import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTransactionTypeLabel, normalizeTransactionType } from '../../../lib/transactions/transactionTypes';

const DEFAULT_FILTERS = Object.freeze({
  person: null,
  account: null,
  category: null,
  shop: null,
  debtTags: [],
  amountOperator: null,
  amountValue: '',
  year: null,
  month: null,
  type: null,
  notes: '',
});

const AMOUNT_OPERATOR_OPTIONS = [
  { value: 'eq', label: 'Equals (=)' },
  { value: 'neq', label: 'Not equal (≠)' },
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'gte', label: 'Greater than or equal (≥)' },
  { value: 'lte', label: 'Less than or equal (≤)' },
  { value: 'is-null', label: 'Is null' },
];

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const MONTH_LABEL_LOOKUP = new Map(MONTH_OPTIONS.map((option) => [option.value, option.label]));

const MAX_VISIBLE_FILTER_BADGES = 4;

function normalizeFilterString(value) {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  if (value instanceof Date) {
    return value.toISOString().toLowerCase();
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim().toLowerCase();
}

function collectUniqueValues(source, accessor) {
  if (!Array.isArray(source)) {
    return [];
  }

  const values = new Set();
  source.forEach((item) => {
    const raw = accessor(item);
    if (!raw) {
      return;
    }
    values.add(String(raw));
  });

  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

function resolveTransactionDate(txn) {
  if (!txn) {
    return null;
  }

  const dateCandidate = txn?.occurredOn ?? txn?.date ?? txn?.displayDate;
  if (!dateCandidate) {
    return null;
  }

  if (dateCandidate instanceof Date) {
    return new Date(dateCandidate.getFullYear(), dateCandidate.getMonth(), dateCandidate.getDate());
  }

  if (typeof dateCandidate === 'string') {
    if (dateCandidate.length >= 10) {
      const parsed = new Date(dateCandidate);
      if (!Number.isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    }

    const normalized = dateCandidate.includes('T') ? dateCandidate : `${dateCandidate}T00:00:00`;
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }

  return null;
}

function matchesAmountFilter(amountValue, operator, rawFilterValue) {
  if (!operator) {
    return true;
  }

  if (operator !== 'is-null') {
    const normalizedFilterValue = String(rawFilterValue ?? '').trim();
    if (normalizedFilterValue.length === 0) {
      return true;
    }
  }

  if (operator === 'is-null') {
    return amountValue === null || amountValue === undefined || amountValue === '';
  }

  const numericAmount = Number(amountValue);
  const numericFilter = Number(rawFilterValue);

  if (!Number.isFinite(numericAmount) || !Number.isFinite(numericFilter)) {
    return false;
  }

  switch (operator) {
    case 'eq':
      return Math.abs(numericAmount - numericFilter) < 1e-6;
    case 'neq':
      return Math.abs(numericAmount - numericFilter) >= 1e-6;
    case 'gt':
      return numericAmount > numericFilter;
    case 'lt':
      return numericAmount < numericFilter;
    case 'gte':
      return numericAmount >= numericFilter;
    case 'lte':
      return numericAmount <= numericFilter;
    default:
      return true;
  }
}

function matchesDateFilter(date, year, month) {
  if (!year && !month) {
    return true;
  }

  if (!(date instanceof Date)) {
    return false;
  }

  if (year) {
    const yearNumber = Number(year);
    if (Number.isFinite(yearNumber) && date.getFullYear() !== yearNumber) {
      return false;
    }
  }

  if (month) {
    const monthNumber = Number(month);
    if (Number.isFinite(monthNumber) && date.getMonth() !== monthNumber - 1) {
      return false;
    }
  }

  return true;
}

function matchesEntityFilter(value, filterValue) {
  if (!filterValue) {
    return true;
  }

  const normalizedValue = normalizeFilterString(value);
  const normalizedFilter = normalizeFilterString(filterValue);
  return normalizedValue === normalizedFilter;
}

function buildFilterDescriptors({ filters, amountOperatorLabelLookup, setFilters }) {
  const descriptors = [];

  if (filters.person) {
    descriptors.push({
      key: 'person',
      label: `Person: ${filters.person}`,
      onClear: () => {
        setFilters((prev) => ({ ...prev, person: null }));
      },
    });
  }

  if (filters.account) {
    descriptors.push({
      key: 'account',
      label: `Account: ${filters.account}`,
      onClear: () => {
        setFilters((prev) => ({ ...prev, account: null }));
      },
    });
  }

  if (filters.category) {
    descriptors.push({
      key: 'category',
      label: `Category: ${filters.category}`,
      onClear: () => {
        setFilters((prev) => ({ ...prev, category: null }));
      },
    });
  }

  if (filters.shop) {
    descriptors.push({
      key: 'shop',
      label: `Shop: ${filters.shop}`,
      onClear: () => {
        setFilters((prev) => ({ ...prev, shop: null }));
      },
    });
  }

  if (Array.isArray(filters.debtTags) && filters.debtTags.length > 0) {
    filters.debtTags.forEach((tag) => {
      descriptors.push({
        key: `debt-tag-${tag}`,
        label: `Debt tag: ${tag}`,
        onClear: () => {
          setFilters((prev) => ({
            ...prev,
            debtTags: prev.debtTags.filter((value) => value !== tag),
          }));
        },
      });
    });
  }

  if (
    filters.amountOperator &&
    (filters.amountOperator === 'is-null' || String(filters.amountValue).trim().length > 0)
  ) {
    const operatorLabel = amountOperatorLabelLookup.get(filters.amountOperator) ?? 'Amount';
    const numericAmount = Number(filters.amountValue);
    let formattedValue = '';
    if (filters.amountOperator !== 'is-null') {
      formattedValue = Number.isFinite(numericAmount)
        ? new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(numericAmount)
        : String(filters.amountValue);
    }
    const badgeLabel = formattedValue
      ? `${operatorLabel.replace(/\s*\([^)]*\)/g, '')} ${formattedValue}`
      : operatorLabel;
    descriptors.push({
      key: 'amount',
      label: `Amount: ${badgeLabel}`.trim(),
      onClear: () => {
        setFilters((prev) => ({
          ...prev,
          amountOperator: null,
          amountValue: '',
        }));
      },
    });
  }

  if (filters.year) {
    descriptors.push({
      key: 'year',
      label: `Year: ${filters.year}`,
      onClear: () => {
        setFilters((prev) => ({ ...prev, year: null }));
      },
    });
  }

  if (filters.month) {
    const monthLabel = MONTH_LABEL_LOOKUP.get(String(filters.month)) ?? `Month ${filters.month}`;
    descriptors.push({
      key: 'month',
      label: `Month: ${monthLabel}`,
      onClear: () => {
        setFilters((prev) => ({ ...prev, month: null }));
      },
    });
  }

  if (filters.type) {
    const normalizedType = normalizeTransactionType(filters.type);
    const typeLabel = normalizedType
      ? getTransactionTypeLabel(normalizedType) ?? filters.type
      : filters.type;
    descriptors.push({
      key: 'type',
      label: `Type: ${typeLabel}`,
      onClear: () => {
        setFilters((prev) => ({ ...prev, type: null }));
      },
    });
  }

  if (filters.notes) {
    descriptors.push({
      key: 'notes',
      label: `Notes contains: ${filters.notes}`,
      onClear: () => {
        setFilters((prev) => ({ ...prev, notes: '' }));
      },
    });
  }

  return descriptors;
}

export function useTransactionsFilterController({
  transactions = [],
  resolvedTypeList = [],
  onRequestTabChange,
}) {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [filterSearchValues, setFilterSearchValues] = useState({
    person: '',
    account: '',
    category: '',
    shop: '',
    debtTags: '',
    type: '',
  });

  const amountOperatorLabelLookup = useMemo(
    () => new Map(AMOUNT_OPERATOR_OPTIONS.map((option) => [option.value, option.label])),
    [],
  );

  useEffect(() => {
    setFilters((prev) => ({ ...DEFAULT_FILTERS, ...prev }));
  }, []);

  const matchesActiveFilters = useCallback(
    (txn, options = {}) => {
      if (!txn) {
        return false;
      }

      const { exclude = [], overrides = {} } = options;
      const excludeSet = new Set(Array.isArray(exclude) ? exclude : [exclude]);
      const mergedFilters = { ...filters, ...overrides };

      if (!excludeSet.has('person')) {
        if (
          mergedFilters.person &&
          !matchesEntityFilter(
            txn.owner ?? txn.person ?? txn.personName ?? txn.person_name ?? txn.customerName,
            mergedFilters.person,
          )
        ) {
          return false;
        }
      }

      if (!excludeSet.has('account')) {
        if (
          mergedFilters.account &&
          !matchesEntityFilter(
            txn.account ?? txn.accountName ?? txn.account_name ?? txn.walletName,
            mergedFilters.account,
          )
        ) {
          return false;
        }
      }

      if (!excludeSet.has('category')) {
        if (
          mergedFilters.category &&
          !matchesEntityFilter(
            txn.category ?? txn.categoryName ?? txn.category_name ?? txn.typeLabel,
            mergedFilters.category,
          )
        ) {
          return false;
        }
      }

      if (!excludeSet.has('shop')) {
        if (
          mergedFilters.shop &&
          !matchesEntityFilter(
            txn.shop ?? txn.shopName ?? txn.shop_name ?? txn.merchantName ?? txn.merchant_name,
            mergedFilters.shop,
          )
        ) {
          return false;
        }
      }

      const skipDebtTags = excludeSet.has('debtTags');
      if (!skipDebtTags && Array.isArray(mergedFilters.debtTags) && mergedFilters.debtTags.length > 0) {
        const tagValue =
          txn.debtTag ?? txn.debtTagName ?? txn.debt_tag ?? txn.debtLabel ?? txn.tag ?? '';
        const normalizedValue = normalizeFilterString(tagValue);
        const hasMatch = mergedFilters.debtTags.some(
          (tag) => normalizeFilterString(tag) === normalizedValue,
        );
        if (!hasMatch) {
          return false;
        }
      }

      if (!excludeSet.has('amount')) {
        if (
          !matchesAmountFilter(
            txn.amount ?? txn.total ?? txn.value ?? txn.balance,
            mergedFilters.amountOperator,
            mergedFilters.amountValue,
          )
        ) {
          return false;
        }
      }

      if (!excludeSet.has('type')) {
        if (mergedFilters.type) {
          const normalizedTxnType = txn.typeLabel ?? txn.type ?? '';
          if (
            normalizeFilterString(normalizedTxnType) !== normalizeFilterString(mergedFilters.type)
          ) {
            return false;
          }
        }
      }

      if (!excludeSet.has('notes')) {
        if (mergedFilters.notes) {
          const noteValue = normalizeFilterString(txn.notes ?? '');
          if (!noteValue.includes(normalizeFilterString(mergedFilters.notes))) {
            return false;
          }
        }
      }

      const skipDate = excludeSet.has('date');
      const skipYear = skipDate || excludeSet.has('year');
      const skipMonth = skipDate || excludeSet.has('month');
      const dateValue = resolveTransactionDate(txn);
      const yearFilter = skipYear ? null : mergedFilters.year;
      const monthFilter = skipMonth ? null : mergedFilters.month;
      if (!matchesDateFilter(dateValue, yearFilter, monthFilter)) {
        return false;
      }

      return true;
    },
    [filters],
  );

  const personOptions = useMemo(() => {
    const scoped = transactions.filter((txn) => matchesActiveFilters(txn, { exclude: 'person' }));
    return collectUniqueValues(
      scoped,
      (txn) => txn?.owner ?? txn?.person ?? txn?.personName ?? txn?.person_name ?? txn?.customerName ?? '',
    );
  }, [matchesActiveFilters, transactions]);

  const accountOptions = useMemo(() => {
    const scoped = transactions.filter((txn) => matchesActiveFilters(txn, { exclude: 'account' }));
    return collectUniqueValues(
      scoped,
      (txn) => txn?.account ?? txn?.accountName ?? txn?.account_name ?? txn?.walletName ?? '',
    );
  }, [matchesActiveFilters, transactions]);

  const categoryOptions = useMemo(() => {
    const scoped = transactions.filter((txn) => matchesActiveFilters(txn, { exclude: 'category' }));
    return collectUniqueValues(
      scoped,
      (txn) => txn?.category ?? txn?.categoryName ?? txn?.category_name ?? txn?.typeLabel ?? '',
    );
  }, [matchesActiveFilters, transactions]);

  const shopOptions = useMemo(() => {
    const scoped = transactions.filter((txn) => matchesActiveFilters(txn, { exclude: 'shop' }));
    return collectUniqueValues(
      scoped,
      (txn) => txn?.shop ?? txn?.shopName ?? txn?.shop_name ?? txn?.merchantName ?? '',
    );
  }, [matchesActiveFilters, transactions]);

  const debtTagOptions = useMemo(() => {
    const scoped = transactions.filter((txn) => matchesActiveFilters(txn, { exclude: 'debtTags' }));
    return collectUniqueValues(
      scoped,
      (txn) => txn?.debtTag ?? txn?.debtTagName ?? txn?.debt_tag ?? txn?.debtLabel ?? '',
    );
  }, [matchesActiveFilters, transactions]);

  const yearOptions = useMemo(() => {
    const scoped = transactions
      .filter((txn) => matchesActiveFilters(txn, { exclude: ['year', 'month', 'date'] }))
      .map((txn) => resolveTransactionDate(txn))
      .filter((date) => date instanceof Date);
    const years = new Set(scoped.map((date) => date.getFullYear()));
    return Array.from(years).sort((a, b) => b - a).map((year) => String(year));
  }, [matchesActiveFilters, transactions]);

  const typeOptions = useMemo(() => {
    const scoped = transactions.filter((txn) => matchesActiveFilters(txn, { exclude: 'type' }));
    const types = collectUniqueValues(scoped, (txn) => txn?.typeLabel ?? txn?.type ?? '');
    const merged = new Set([
      ...resolvedTypeList,
      ...types,
    ]);
    return Array.from(merged).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [matchesActiveFilters, transactions, resolvedTypeList]);

  useEffect(() => {
    const normalizedPeople = new Set(personOptions.map((option) => normalizeFilterString(option)));
    if (filters.person && !normalizedPeople.has(normalizeFilterString(filters.person))) {
      setFilters((prev) => ({ ...prev, person: null }));
    }
  }, [filters.person, personOptions, setFilters]);

  useEffect(() => {
    const normalizedAccounts = new Set(accountOptions.map((option) => normalizeFilterString(option)));
    if (filters.account && !normalizedAccounts.has(normalizeFilterString(filters.account))) {
      setFilters((prev) => ({ ...prev, account: null }));
    }
  }, [accountOptions, filters.account, setFilters]);

  useEffect(() => {
    const normalizedCategories = new Set(
      categoryOptions.map((option) => normalizeFilterString(option)),
    );
    if (filters.category && !normalizedCategories.has(normalizeFilterString(filters.category))) {
      setFilters((prev) => ({ ...prev, category: null }));
    }
  }, [categoryOptions, filters.category, setFilters]);

  useEffect(() => {
    if (!filters.shop) {
      return;
    }
    const normalizedShops = new Set(shopOptions.map((option) => normalizeFilterString(option)));
    if (!normalizedShops.has(normalizeFilterString(filters.shop))) {
      setFilters((prev) => ({ ...prev, shop: null }));
    }
  }, [filters.shop, setFilters, shopOptions]);

  useEffect(() => {
    if (!Array.isArray(filters.debtTags) || filters.debtTags.length === 0) {
      return;
    }
    const normalizedOptions = new Set(
      debtTagOptions.map((option) => normalizeFilterString(option)),
    );
    const next = filters.debtTags.filter((tag) =>
      normalizedOptions.has(normalizeFilterString(tag)),
    );
    if (next.length !== filters.debtTags.length) {
      setFilters((prev) => ({ ...prev, debtTags: next }));
    }
  }, [debtTagOptions, filters.debtTags, setFilters]);

  useEffect(() => {
    if (!filters.year) {
      return;
    }
    if (!yearOptions.includes(filters.year)) {
      setFilters((prev) => ({ ...prev, year: null }));
    }
  }, [filters.year, yearOptions, setFilters]);

  useEffect(() => {
    if (!filters.type) {
      return;
    }
    if (!typeOptions.some((option) => normalizeFilterString(option) === normalizeFilterString(filters.type))) {
      setFilters((prev) => ({ ...prev, type: null }));
    }
  }, [filters.type, typeOptions, setFilters]);

  const handleFilterSearchChange = useCallback((field, value) => {
    setFilterSearchValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const resetFilterSearchValues = useCallback(() => {
    setFilterSearchValues({
      person: '',
      account: '',
      category: '',
      shop: '',
      debtTags: '',
      type: '',
    });
  }, []);

  const handleToggleDebtTag = useCallback((value) => {
    if (value === 'all') {
      setFilters((prev) => ({ ...prev, debtTags: [] }));
      setFilterSearchValues((prev) => ({ ...prev, debtTags: '' }));
      return;
    }

    setFilters((prev) => {
      const currentTags = Array.isArray(prev.debtTags) ? prev.debtTags : [];
      const exists = currentTags.includes(value);
      const next = exists ? currentTags.filter((tag) => tag !== value) : [...currentTags, value];
      return {
        ...prev,
        debtTags: next,
      };
    });
  }, []);

  const handleAmountOperatorSelect = useCallback((operator) => {
    const normalizedOperator = operator === 'all' ? null : operator;
    setFilters((prev) => ({
      ...prev,
      amountOperator: normalizedOperator,
      amountValue:
        normalizedOperator === 'is-null'
          ? ''
          : normalizedOperator === null
          ? ''
          : prev.amountValue,
    }));
  }, []);

  const handleAmountValueChange = useCallback((value) => {
    setFilters((prev) => ({
      ...prev,
      amountValue: value,
    }));
  }, []);

  const handleClearDate = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      year: null,
      month: null,
    }));
  }, []);

  const handleSingleFilterChange = useCallback(
    (field, value) => {
      const normalizedValue = value === 'all' || value === '' ? null : value;
      setFilters((prev) => ({
        ...prev,
        [field]: normalizedValue,
      }));

      if (field === 'type') {
        if (normalizedValue) {
          const normalizedTab = normalizeTransactionType(normalizedValue) ?? normalizedValue;
          onRequestTabChange?.(normalizedTab);
        } else {
          onRequestTabChange?.('all');
        }
      }
    },
    [onRequestTabChange],
  );

  const activeFilterDescriptors = useMemo(
    () =>
      buildFilterDescriptors({
        filters,
        amountOperatorLabelLookup,
        setFilters,
      }),
    [amountOperatorLabelLookup, filters, setFilters],
  );

  const activeFilterKeys = useMemo(() => {
    const keys = new Set();
    if (filters.person) {
      keys.add('person');
    }
    if (filters.account) {
      keys.add('account');
    }
    if (filters.category) {
      keys.add('category');
    }
    if (filters.shop) {
      keys.add('shop');
    }
    if (Array.isArray(filters.debtTags) && filters.debtTags.length > 0) {
      keys.add('debtTags');
    }
    if (
      filters.amountOperator &&
      (filters.amountOperator === 'is-null' || String(filters.amountValue).trim().length > 0)
    ) {
      keys.add('amount');
    }
    if (filters.year || filters.month) {
      keys.add('date');
    }
    if (filters.type) {
      keys.add('type');
    }
    if (filters.notes) {
      keys.add('notes');
    }
    return keys;
  }, [filters]);

  const visibleFilterDescriptors = activeFilterDescriptors.slice(0, MAX_VISIBLE_FILTER_BADGES);
  const hasHiddenFilters = activeFilterDescriptors.length > visibleFilterDescriptors.length;
  const overflowBadgeCount = Math.max(activeFilterDescriptors.length - visibleFilterDescriptors.length, 0);

  const handleClearAllFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
    resetFilterSearchValues();
    onRequestTabChange?.('all');
  }, [onRequestTabChange, resetFilterSearchValues]);

  return {
    filters,
    setFilters,
    matchesActiveFilters,
    personOptions,
    accountOptions,
    categoryOptions,
    shopOptions,
    debtTagOptions,
    yearOptions,
    typeOptions,
    filterSearchValues,
    handleFilterSearchChange,
    resetFilterSearchValues,
    activeFilterDescriptors,
    visibleFilterDescriptors,
    hasHiddenFilters,
    overflowBadgeCount,
    activeFilterKeys,
    handleClearAllFilters,
    handleSingleFilterChange,
    handleToggleDebtTag,
    handleAmountOperatorSelect,
    handleAmountValueChange,
    handleClearDate,
    amountOperatorLabelLookup,
    MONTH_OPTIONS,
    AMOUNT_OPERATOR_OPTIONS,
  };
}

export { DEFAULT_FILTERS, MONTH_OPTIONS, AMOUNT_OPERATOR_OPTIONS, MONTH_LABEL_LOOKUP };

import { getMockTransactions } from '../mockTransactions';
import {
  DEFAULT_TRANSACTION_SORT,
  TRANSACTION_COLUMN_DEFINITIONS,
} from './columns';

const columnDefinitionMap = new Map(
  TRANSACTION_COLUMN_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const MONTH_ORDER = new Map([
  ['January', 1],
  ['February', 2],
  ['March', 3],
  ['April', 4],
  ['May', 5],
  ['June', 6],
  ['July', 7],
  ['August', 8],
  ['September', 9],
  ['October', 10],
  ['November', 11],
  ['December', 12],
]);

const SEARCH_FIELDS = [
  'id',
  'notes',
  'shop',
  'account',
  'category',
  'owner',
  'debtTag',
  'cycleTag',
];

function normalizeSort(sortParam) {
  if (!sortParam) {
    return DEFAULT_TRANSACTION_SORT.map((item) => ({ ...item }));
  }

  if (Array.isArray(sortParam)) {
    return sortParam
      .map((item) => ({
        id: item.id,
        direction: item.direction === 'desc' ? 'desc' : 'asc',
      }))
      .filter((item) => columnDefinitionMap.has(item.id));
  }

  if (typeof sortParam !== 'string') {
    return DEFAULT_TRANSACTION_SORT.map((item) => ({ ...item }));
  }

  const items = sortParam
    .split(',')
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => {
      const [id, dir] = piece.split(':');
      return {
        id: id?.trim(),
        direction: dir?.trim() === 'desc' ? 'desc' : 'asc',
      };
    })
    .filter((item) => item.id && columnDefinitionMap.has(item.id));

  if (items.length === 0) {
    return DEFAULT_TRANSACTION_SORT.map((item) => ({ ...item }));
  }

  return items;
}

function compareValues(a, b, dataType) {
  if (a === b) {
    return 0;
  }

  if (a === undefined || a === null) {
    return -1;
  }
  if (b === undefined || b === null) {
    return 1;
  }

  switch (dataType) {
    case 'number':
      return Number(a) - Number(b);
    case 'date':
      return Number(a) - Number(b);
    default:
      return String(a).localeCompare(String(b), undefined, {
        sensitivity: 'base',
        numeric: true,
      });
  }
}

function applySort(rows, sortParam) {
  const sortState = normalizeSort(sortParam);

  const descriptors = sortState.map((item) => {
    const definition = columnDefinitionMap.get(item.id) ?? {};
    let accessor = item.id;
    if (item.id === 'date') {
      accessor = 'sortDate';
    }
    return {
      id: item.id,
      direction: item.direction === 'desc' ? -1 : 1,
      accessor,
      dataType: definition.dataType ?? 'string',
    };
  });

  const sorted = [...rows].sort((a, b) => {
    for (const descriptor of descriptors) {
      const result = compareValues(a[descriptor.accessor], b[descriptor.accessor], descriptor.dataType);
      if (result !== 0) {
        return result * descriptor.direction;
      }
    }
    return 0;
  });

  return { rows: sorted, sort: sortState };
}

function applySearch(rows, term) {
  if (!term) {
    return rows;
  }

  const normalized = term.trim().toLowerCase();
  if (!normalized) {
    return rows;
  }

  return rows.filter((row) =>
    SEARCH_FIELDS.some((field) => String(row[field] ?? '').toLowerCase().includes(normalized)),
  );
}

function applyFilters(rows, filters) {
  if (!filters) {
    return rows;
  }

  return rows.filter((row) => {
    if (filters.person && filters.person !== 'all' && row.owner !== filters.person) {
      return false;
    }
    if (filters.category && filters.category !== 'all' && row.category !== filters.category) {
      return false;
    }
    if (filters.year && filters.year !== 'all' && row.year !== filters.year) {
      return false;
    }
    if (filters.month && filters.month !== 'all' && row.month !== filters.month) {
      return false;
    }
    if (Array.isArray(filters.types) && filters.types.length > 0 && !filters.types.includes(row.type)) {
      return false;
    }
    if (
      Array.isArray(filters.debtTags) &&
      filters.debtTags.length > 0 &&
      !filters.debtTags.includes(row.debtTag)
    ) {
      return false;
    }
    return true;
  });
}

function buildFilterOptions(rows) {
  const unique = (values) => Array.from(new Set(values.filter(Boolean)));

  const people = unique(rows.map((row) => row.owner)).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
  const categories = unique(rows.map((row) => row.category)).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
  const years = unique(rows.map((row) => row.year)).sort((a, b) => Number(a) - Number(b));
  const months = unique(rows.map((row) => row.month)).sort((a, b) =>
    (MONTH_ORDER.get(a) ?? 0) - (MONTH_ORDER.get(b) ?? 0),
  );
  const types = unique(rows.map((row) => row.type)).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
  const debtTags = unique(rows.map((row) => row.debtTag)).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );

  return { people, categories, years, months, types, debtTags };
}

function calculateTotals(rows) {
  return rows.reduce(
    (acc, row) => {
      acc.count += 1;
      acc.amount += row.amount ?? 0;
      acc.totalBack += row.totalBack ?? 0;
      acc.finalPrice += row.finalPrice ?? 0;
      return acc;
    },
    { count: 0, amount: 0, totalBack: 0, finalPrice: 0 },
  );
}

export function queryTransactions({ search, filters, sort } = {}) {
  const baseRows = getMockTransactions().map((row) => ({
    ...row,
    amountDirection: row.type === 'Income' ? 'credit' : 'debit',
  }));

  const filtered = applyFilters(applySearch(baseRows, search), filters);
  const totals = calculateTotals(filtered);
  const { rows: sortedRows, sort: appliedSort } = applySort(filtered, sort);
  const filterOptions = buildFilterOptions(baseRows);

  return {
    rows: sortedRows,
    filters: filterOptions,
    sort: appliedSort,
    totals,
  };
}

export function calculateSelectionSummary(ids) {
  const idSet = new Set(Array.isArray(ids) ? ids : []);
  if (idSet.size === 0) {
    return { count: 0, amount: 0, finalPrice: 0, totalBack: 0 };
  }

  const rows = getMockTransactions();
  const summary = rows.reduce(
    (acc, row) => {
      if (!idSet.has(row.id)) {
        return acc;
      }
      acc.count += 1;
      acc.amount += row.amount ?? 0;
      acc.finalPrice += row.finalPrice ?? 0;
      acc.totalBack += row.totalBack ?? 0;
      return acc;
    },
    { count: 0, amount: 0, finalPrice: 0, totalBack: 0 },
  );

  return summary;
}

export function searchTransactionOptions(field, query) {
  const normalizedField = field === 'people' ? 'owner' : field === 'categories' ? 'category' : field;
  if (!['owner', 'category'].includes(normalizedField)) {
    return [];
  }

  const normalizedQuery = (query ?? '').trim().toLowerCase();
  const rows = getMockTransactions();
  const values = Array.from(
    new Set(
      rows
        .map((row) => row[normalizedField])
        .filter(Boolean)
        .filter((value) =>
          normalizedQuery
            ? String(value).toLowerCase().includes(normalizedQuery)
            : true,
        ),
    ),
  )
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .slice(0, 25);

  return values;
}

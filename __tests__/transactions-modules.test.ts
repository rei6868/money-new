import { getTransactionsTable } from '../lib/api/transactions/transactions.table';
import { createRestorePayload } from '../lib/api/transactions/transactions.restore';
import { executeTransactionAction } from '../lib/api/transactions/transactions.action';
import { loadTransactionDataset, recalculateRewardFields } from '../lib/api/transactions/transactions.dataset';
import { type TransactionsTableRequest } from '../lib/api/transactions/transactions.types';

describe('transaction dataset helpers', () => {
  it('converts enriched transactions into table-safe records', async () => {
    const dataset = await loadTransactionDataset();
    expect(dataset.length).toBeGreaterThan(0);
    dataset.forEach((record) => {
      expect(typeof record.id).toBe('string');
      expect(typeof record.amount).toBe('number');
      expect(['credit', 'debit']).toContain(record.amountDirection);
      expect(record.date).not.toBeUndefined();
    });
  });

  it('recalculates reward fields deterministically', async () => {
    const [record] = await loadTransactionDataset();
    const updated = recalculateRewardFields({ ...record, amount: 100, percentBack: 5, fixedBack: 2 });
    expect(updated.totalBack).toBe(7);
    expect(updated.finalPrice).toBe(93);
  });
});

describe('transactions table module', () => {
  const baseRequest: TransactionsTableRequest = {
    pagination: { page: 1, pageSize: 50 },
  };

  it('filters transactions by search term and type', async () => {
    const response = await getTransactionsTable(
      {
        ...baseRequest,
        searchTerm: 'cashback',
        filters: { types: ['Income'] },
      },
      null,
    );
    expect(response.rows.length).toBeGreaterThan(0);
    response.rows.forEach((row) => {
      expect(row.type).toBe('Income');
      expect(row.notes.toLowerCase()).toContain('cashback');
    });
    expect(response.filters.applied.types).toContain('Income');
    expect(response.execution.durationMs).toBeLessThan(500);
  });

  it('supports multi-select filtering and sorting', async () => {
    const response = await getTransactionsTable(
      {
        ...baseRequest,
        filters: {
          owners: ['Rena', 'Iris'],
          categories: ['Groceries', 'Transport'],
          types: ['Expense'],
        },
        sort: [
          { id: 'amount', direction: 'desc' },
          { id: 'date', direction: 'asc' },
        ],
      },
      null,
    );
    expect(response.rows.length).toBeGreaterThan(0);
    response.rows.forEach((row) => {
      expect(['Rena', 'Iris']).toContain(row.owner);
      expect(['Groceries', 'Transport']).toContain(row.category);
      expect(row.type).toBe('Expense');
    });
    const amounts = response.rows.map((row) => row.amount);
    const sorted = [...amounts].sort((a, b) => b - a);
    expect(amounts).toEqual(sorted.slice(0, amounts.length));
  });

  it('applies quick filter overrides like high value purchases', async () => {
    const response = await getTransactionsTable(
      {
        ...baseRequest,
        quickFilterId: 'high-value',
      },
      null,
    );
    expect(response.quickFilterId).toBe('high-value');
    expect(response.rows.length).toBeGreaterThan(0);
    response.rows.forEach((row) => {
      expect(row.amount).toBeGreaterThanOrEqual(500);
    });
  });

  it('restores previous state using restore token', async () => {
    const initial = await getTransactionsTable(
      {
        ...baseRequest,
        searchTerm: 'Cycle',
        filters: { owners: ['Noah'] },
        sort: [{ id: 'date', direction: 'asc' }],
      },
      null,
    );
    const restore = createRestorePayload({
      searchTerm: initial.searchTerm,
      sort: initial.sort,
      filters: initial.filters.applied,
      pagination: initial.pagination,
      quickFilterId: initial.quickFilterId,
    });
    const restored = await getTransactionsTable(
      {
        pagination: { page: 1, pageSize: initial.pagination.pageSize },
      },
      restore.token,
    );
    expect(restored.searchTerm).toBe(initial.searchTerm);
    expect(restored.filters.applied.owners).toEqual(initial.filters.applied.owners);
    expect(restored.sort).toEqual(initial.sort);
  });
});

describe('transaction actions', () => {
  it('calculates selection summary via syncSelection action', async () => {
    const table = await getTransactionsTable({ pagination: { page: 1, pageSize: 5 } }, null);
    const ids = table.rows.slice(0, 3).map((row) => row.id);
    const response = await executeTransactionAction({
      action: 'syncSelection',
      payload: { ids },
    });
    expect(response.status).toBe('success');
    expect(response.summary?.count).toBe(ids.length);
    expect(response.summary?.amount).toBeGreaterThan(0);
  });

  it('supports quick edit simulation', async () => {
    const table = await getTransactionsTable({ pagination: { page: 1, pageSize: 1 } }, null);
    const row = table.rows[0];
    const response = await executeTransactionAction({
      action: 'quickEdit',
      payload: {
        id: row.id,
        updates: { notes: 'Updated notes', amount: row.amount + 10 },
      },
    });
    expect(response.status).toBe('success');
    expect(response.updatedRow?.notes).toBe('Updated notes');
    expect(response.updatedRow?.amount).toBeCloseTo(row.amount + 10, 5);
  });
});

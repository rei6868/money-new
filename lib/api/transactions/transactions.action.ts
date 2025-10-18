import { loadTransactionDataset, recalculateRewardFields } from './transactions.dataset';
import { getTransactionMeta } from './transactions.meta';
import {
  type TransactionActionRequest,
  type TransactionActionResponse,
  type TransactionRecord,
  type TransactionTotals,
} from './transactions.types';

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function normalizeIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }
  return [];
}

function normalizeRowUpdate(row: TransactionRecord, updates: Record<string, unknown>): TransactionRecord {
  const next: TransactionRecord = { ...row };
  if (typeof updates.notes === 'string') {
    next.notes = updates.notes.trim();
  }
  if (typeof updates.category === 'string') {
    next.category = updates.category.trim();
  }
  if (typeof updates.owner === 'string') {
    next.owner = updates.owner.trim();
  }
  if (updates.amount !== undefined) {
    const amount = Number(updates.amount);
    if (Number.isFinite(amount)) {
      next.amount = amount;
    }
  }
  if (updates.percentBack !== undefined) {
    const percentBack = Number(updates.percentBack);
    if (Number.isFinite(percentBack)) {
      next.percentBack = percentBack;
    }
  }
  if (updates.fixedBack !== undefined) {
    const fixedBack = Number(updates.fixedBack);
    if (Number.isFinite(fixedBack)) {
      next.fixedBack = fixedBack;
    }
  }
  return recalculateRewardFields(next);
}

function calculateSelectionTotals(ids: string[]): TransactionTotals {
  const dataset = loadTransactionDataset();
  const selection = dataset.filter((row) => ids.includes(row.id));
  return selection.reduce(
    (acc, row) => {
      acc.count += 1;
      acc.amount += row.amount;
      acc.totalBack += row.totalBack;
      acc.finalPrice += row.finalPrice;
      return acc;
    },
    { count: 0, amount: 0, totalBack: 0, finalPrice: 0 },
  );
}

function handleQuickEdit(payload: Record<string, unknown>): TransactionActionResponse {
  const id = typeof payload.id === 'string' ? payload.id : '';
  if (!id) {
    return { status: 'error', message: 'Missing transaction id for quick edit.' };
  }
  const dataset = loadTransactionDataset();
  const record = dataset.find((row) => row.id === id);
  if (!record) {
    return { status: 'error', message: `Transaction ${id} not found.` };
  }
  const updates = typeof payload.updates === 'object' && payload.updates
    ? (payload.updates as Record<string, unknown>)
    : {};
  const updatedRow = normalizeRowUpdate(record, updates);
  return {
    status: 'success',
    message: 'Transaction updated successfully (simulation).',
    updatedRow,
  };
}

function handleDelete(payload: Record<string, unknown>): TransactionActionResponse {
  const id = typeof payload.id === 'string' ? payload.id : '';
  if (!id) {
    return { status: 'error', message: 'Missing transaction id for delete action.' };
  }
  return {
    status: 'success',
    message: `Transaction ${id} deleted (simulation).`,
    removedIds: [id],
  };
}

function handleBulkDelete(payload: Record<string, unknown>): TransactionActionResponse {
  const ids = normalizeIds(payload.ids);
  if (ids.length === 0) {
    return { status: 'error', message: 'Provide at least one transaction id to delete.' };
  }
  return {
    status: 'success',
    message: `Deleted ${ids.length} transactions (simulation).`,
    removedIds: ids,
  };
}

function handleSyncSelection(payload: Record<string, unknown>): TransactionActionResponse {
  const ids = normalizeIds(payload.ids);
  if (ids.length === 0) {
    return { status: 'success', message: 'No transactions selected.', summary: { count: 0, amount: 0, totalBack: 0, finalPrice: 0 } };
  }
  const totals = calculateSelectionTotals(ids);
  return {
    status: 'success',
    message: 'Selection summary recalculated.',
    summary: {
      count: totals.count,
      amount: roundCurrency(totals.amount),
      totalBack: roundCurrency(totals.totalBack),
      finalPrice: roundCurrency(totals.finalPrice),
    },
  };
}

function handleSyncPermissions(): TransactionActionResponse {
  const meta = getTransactionMeta();
  return {
    status: 'success',
    message: 'Permissions refreshed.',
    permissions: meta.availableActions.map((action) => action.id),
  };
}

export function executeTransactionAction(request: TransactionActionRequest): TransactionActionResponse {
  const payload = (request.payload as Record<string, unknown>) ?? {};
  switch (request.action) {
    case 'quickEdit':
      return handleQuickEdit(payload);
    case 'delete':
      return handleDelete(payload);
    case 'bulkDelete':
      return handleBulkDelete(payload);
    case 'syncSelection':
      return handleSyncSelection(payload);
    case 'syncPermissions':
      return handleSyncPermissions();
    default:
      return { status: 'error', message: `Unsupported action: ${request.action}` };
  }
}

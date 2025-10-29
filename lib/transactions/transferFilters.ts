import { TRANSACTION_TYPE_VALUES } from './transactionTypes';

type TransactionRecord = Record<string, unknown> | null | undefined;

export function extractString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

export function createTransferPairKey(idA: unknown, idB: unknown): string | null {
  const first = extractString(idA);
  const second = extractString(idB);

  if (!first || !second) {
    return null;
  }

  return first < second ? `${first}::${second}` : `${second}::${first}`;
}

export type TransferLinkInfo = {
  linkedIds: Set<string>;
  byId: Map<string, TransactionRecord>;
  inbound: Map<string, Set<string>>;
  index: Map<string, number>;
};

export function buildTransferLinkInfo(transactions: TransactionRecord[] | null | undefined): TransferLinkInfo {
  const linkedIds = new Set<string>();
  const byId = new Map<string, TransactionRecord>();
  const inbound = new Map<string, Set<string>>();
  const index = new Map<string, number>();

  if (!Array.isArray(transactions)) {
    return { linkedIds, byId, inbound, index };
  }

  transactions.forEach((txn, idx) => {
    const txnId = extractString((txn as Record<string, unknown>)?.id);
    if (txnId) {
      byId.set(txnId, txn);
      index.set(txnId, idx);
    }

    const linkedId = extractString((txn as Record<string, unknown>)?.linkedTxn);
    if (!linkedId) {
      return;
    }

    linkedIds.add(linkedId);

    if (txnId) {
      linkedIds.add(txnId);
      const existing = inbound.get(linkedId);
      if (existing) {
        existing.add(txnId);
      } else {
        inbound.set(linkedId, new Set([txnId]));
      }
    }
  });

  return { linkedIds, byId, inbound, index };
}

export function buildTransactionPredicate(
  normalizedQuery: string,
  filterType: string | null | false = null,
  transferLinkIds: Set<string> | null | undefined = null,
) {
  return (txn: Record<string, unknown>) => {
    if (filterType && filterType !== 'all') {
      const typedTxn = txn as Record<string, unknown>;
      const txnType = extractString(typedTxn.typeRaw ?? typedTxn.type);
      const normalizedType = txnType ? txnType.toLowerCase() : '';

      if (filterType === TRANSACTION_TYPE_VALUES.TRANSFER) {
        const txnId = extractString(typedTxn.id);
        const linkedId = extractString(typedTxn.linkedTxn);
        const transferSet = transferLinkIds instanceof Set ? transferLinkIds : null;
        const isSource = Boolean(linkedId);
        const isTarget = transferSet && txnId ? transferSet.has(txnId) : false;

        if (!isSource && !isTarget) {
          return false;
        }
      } else {
        if (normalizedType !== filterType.toLowerCase()) {
          return false;
        }
      }
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchableKeys = ['notes', 'description', 'shop', 'account', 'category', 'owner', 'type', 'id'];
    return searchableKeys.some((key) => {
      const rawValue = (txn as Record<string, unknown>)?.[key];
      if (rawValue === null || rawValue === undefined) {
        return false;
      }
      return String(rawValue).toLowerCase().includes(normalizedQuery);
    });
  };
}

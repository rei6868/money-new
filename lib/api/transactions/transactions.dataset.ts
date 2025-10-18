import { getMockTransactions } from '../../mockTransactions';
import { type TransactionRecord } from './transactions.types';

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toTransactionRecord(txn: Record<string, unknown>): TransactionRecord {
  const rawDate = typeof txn.date === 'string' ? txn.date : '';
  const sortDate = Number.isFinite(txn.sortDate)
    ? Number(txn.sortDate)
    : new Date(`${rawDate}T00:00:00Z`).getTime();
  const type = typeof txn.type === 'string' ? txn.type : 'Expense';
  return {
    id: String(txn.id ?? ''),
    date: rawDate,
    occurredOn: typeof txn.occurredOn === 'string' ? txn.occurredOn : rawDate,
    displayDate: typeof txn.displayDate === 'string' ? txn.displayDate : rawDate,
    sortDate: Number.isFinite(sortDate) ? sortDate : Number.NEGATIVE_INFINITY,
    year: typeof txn.year === 'string' ? txn.year : '',
    month: typeof txn.month === 'string' ? txn.month : '',
    account: typeof txn.account === 'string' ? txn.account : '',
    shop: typeof txn.shop === 'string' ? txn.shop : '',
    notes: typeof txn.notes === 'string' ? txn.notes : '',
    amount: toNumber(txn.amount),
    percentBack: toNumber(txn.percentBack),
    fixedBack: toNumber(txn.fixedBack),
    totalBack: toNumber(txn.totalBack),
    finalPrice: toNumber(txn.finalPrice),
    debtTag: typeof txn.debtTag === 'string' ? txn.debtTag : '',
    cycleTag: typeof txn.cycleTag === 'string' ? txn.cycleTag : '',
    category: typeof txn.category === 'string' ? txn.category : '',
    linkedTxn: typeof txn.linkedTxn === 'string' ? txn.linkedTxn : '',
    owner: typeof txn.owner === 'string' ? txn.owner : '',
    type,
    amountDirection: type === 'Income' ? 'credit' : 'debit',
  };
}

export function loadTransactionDataset(): TransactionRecord[] {
  return getMockTransactions().map((txn) => toTransactionRecord(txn as Record<string, unknown>));
}

export function recalculateRewardFields(record: TransactionRecord): TransactionRecord {
  const totalBack = Number(((record.amount * record.percentBack) / 100 + record.fixedBack).toFixed(2));
  const finalPrice = Number((record.amount - totalBack).toFixed(2));
  return {
    ...record,
    totalBack,
    finalPrice,
  };
}

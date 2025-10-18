import {
  getMockTransactions,
  type EnrichedTransaction,
} from '../../mockTransactions';
import { type TransactionRecord } from './transactions.types';

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toTransactionRecord(txn: EnrichedTransaction): TransactionRecord {
  const rawDate = txn.date ?? '';
  const sortDate = Number.isFinite(txn.sortDate)
    ? txn.sortDate
    : new Date(`${rawDate}T00:00:00Z`).getTime();
  const occurredOn = txn.occurredOn ?? rawDate;
  const displayDate = txn.displayDate ?? rawDate;
  const type = txn.type ?? 'Expense';
  return {
    id: txn.id ?? '',
    date: rawDate,
    occurredOn,
    displayDate,
    sortDate: Number.isFinite(sortDate) ? sortDate : Number.NEGATIVE_INFINITY,
    year: txn.year ?? '',
    month: txn.month ?? '',
    account: txn.account ?? '',
    shop: txn.shop ?? '',
    notes: txn.notes ?? '',
    amount: toNumber(txn.amount),
    percentBack: toNumber(txn.percentBack),
    fixedBack: toNumber(txn.fixedBack),
    totalBack: toNumber(txn.totalBack),
    finalPrice: toNumber(txn.finalPrice),
    debtTag: txn.debtTag ?? '',
    cycleTag: txn.cycleTag ?? '',
    category: txn.category ?? '',
    linkedTxn: txn.linkedTxn ?? '',
    owner: txn.owner ?? '',
    type,
    amountDirection: type === 'Income' ? 'credit' : 'debit',
  };
}

export function loadTransactionDataset(): TransactionRecord[] {
  return getMockTransactions().map((txn) => toTransactionRecord(txn));
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

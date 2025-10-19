import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import {
  getMockTransactions,
  type EnrichedTransaction,
} from '../../mockTransactions';
import { getDb } from '../../db/client';
import { accounts } from '../../../src/db/schema/accounts';
import { cashbackMovements } from '../../../src/db/schema/cashbackMovements';
import { categories } from '../../../src/db/schema/categories';
import { debtMovements } from '../../../src/db/schema/debtMovements';
import { people } from '../../../src/db/schema/people';
import { shops } from '../../../src/db/schema/shops';
import { transactions } from '../../../src/db/schema/transactions';
import { type TransactionRecord } from './transactions.types';

type NumericLike = string | number | null | undefined;

function toNumber(value: NumericLike, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toDateOnly(value: Date | string | null | undefined): string {
  if (!value) {
    return '';
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    // Assume value is already in YYYY-MM-DD or ISO format
    const parsed = new Date(`${trimmed}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      return trimmed;
    }
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });

function toMonthLabel(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }
  return MONTH_FORMATTER.format(date);
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

function toTitleCase(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value
    .split(/[_\s-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function buildFallbackDataset(): TransactionRecord[] {
  return getMockTransactions().map((txn) => toTransactionRecord(txn));
}

interface RawTransactionRow {
  transactionId: string;
  occurredOn: Date | string | null;
  createdAt: Date | null;
  amount: NumericLike;
  fee: NumericLike;
  type: string | null;
  status: string | null;
  notes: string | null;
  accountId: string | null;
  personId: string | null;
  categoryId: string | null;
  shopId: string | null;
  linkedTxnId: string | null;
  accountName: string | null;
  accountOwnerName: string | null;
  personName: string | null;
  categoryName: string | null;
  shopName: string | null;
}

interface CashbackRow {
  transactionId: string;
  cashbackType: 'percent' | 'fixed';
  cashbackValue: NumericLike;
  cashbackAmount: NumericLike;
  cycleTag: string | null;
}

interface DebtMovementRow {
  transactionId: string;
  movementType: string | null;
  cycleTag: string | null;
  notes: string | null;
}

function normalizeCycleTag(value: string | null): string {
  return value?.trim() ?? '';
}

function deriveDebtTag(row: DebtMovementRow): { debtTag: string; cycleTag: string } {
  const cycleTag = normalizeCycleTag(row.cycleTag);
  const movementLabel = toTitleCase(row.movementType);
  const note = row.notes?.trim() ?? '';
  const composed = [movementLabel, cycleTag].filter(Boolean).join(' ');
  return {
    debtTag: composed || cycleTag || note,
    cycleTag,
  };
}

function mapDbRowToRecord(
  row: RawTransactionRow,
  cashback: Map<string, { percentBack: number; fixedBack: number; totalBack: number; cycleTag: string }>,
  debtMovementsMap: Map<string, { debtTag: string; cycleTag: string }>,
): TransactionRecord {
  const amount = toNumber(row.amount);
  const occurredOn = toDateOnly(row.occurredOn);
  const occurredDate = occurredOn ? new Date(`${occurredOn}T00:00:00Z`) : null;
  const sortDate = occurredDate ? occurredDate.getTime() : Number.NEGATIVE_INFINITY;
  const month = toMonthLabel(occurredDate);
  const year = occurredDate && !Number.isNaN(occurredDate.getTime()) ? String(occurredDate.getUTCFullYear()) : '';
  const baseType = row.type ?? '';
  const normalizedType = toTitleCase(baseType) || 'Expense';
  const cashbackInfo = cashback.get(row.transactionId) ?? {
    percentBack: 0,
    fixedBack: 0,
    totalBack: 0,
    cycleTag: '',
  };
  const debtInfo = debtMovementsMap.get(row.transactionId) ?? { debtTag: '', cycleTag: '' };
  const totalBack = cashbackInfo.totalBack;
  const finalPrice = Number((amount - totalBack).toFixed(2));
  const owner = row.personName ?? row.accountOwnerName ?? '';
  const cycleTag = debtInfo.cycleTag || cashbackInfo.cycleTag;

  return {
    id: row.transactionId,
    date: occurredOn,
    occurredOn,
    displayDate: occurredOn,
    sortDate: Number.isFinite(sortDate) ? sortDate : Number.NEGATIVE_INFINITY,
    year,
    month,
    account: row.accountName ?? row.accountId ?? '',
    shop: row.shopName ?? '',
    notes: row.notes ?? '',
    amount,
    percentBack: cashbackInfo.percentBack,
    fixedBack: cashbackInfo.fixedBack,
    totalBack,
    finalPrice,
    debtTag: debtInfo.debtTag,
    cycleTag,
    category: row.categoryName ?? '',
    linkedTxn: row.linkedTxnId ?? '',
    owner,
    type: normalizedType,
    amountDirection: baseType === 'income' ? 'credit' : 'debit',
  };
}

export async function loadTransactionDataset(): Promise<TransactionRecord[]> {
  const db = getDb();
  if (!db) {
    return buildFallbackDataset();
  }

  try {
    const accountOwner = alias(people, 'account_owner');

    const [baseRows, cashbackRows, debtRows] = await Promise.all([
      db
        .select({
          transactionId: transactions.transactionId,
          occurredOn: transactions.occurredOn,
          createdAt: transactions.createdAt,
          amount: transactions.amount,
          fee: transactions.fee,
          type: transactions.type,
          status: transactions.status,
          notes: transactions.notes,
          accountId: transactions.accountId,
          personId: transactions.personId,
          categoryId: transactions.categoryId,
          shopId: transactions.shopId,
          linkedTxnId: transactions.linkedTxnId,
          accountName: accounts.accountName,
          accountOwnerName: accountOwner.fullName,
          personName: people.fullName,
          categoryName: categories.name,
          shopName: shops.shopName,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.accountId))
        .leftJoin(accountOwner, eq(accounts.ownerId, accountOwner.personId))
        .leftJoin(people, eq(transactions.personId, people.personId))
        .leftJoin(categories, eq(transactions.categoryId, categories.categoryId))
        .leftJoin(shops, eq(transactions.shopId, shops.shopId)),
      db
        .select({
          transactionId: cashbackMovements.transactionId,
          cashbackType: cashbackMovements.cashbackType,
          cashbackValue: cashbackMovements.cashbackValue,
          cashbackAmount: cashbackMovements.cashbackAmount,
          cycleTag: cashbackMovements.cycleTag,
        })
        .from(cashbackMovements),
      db
        .select({
          transactionId: debtMovements.transactionId,
          movementType: debtMovements.movementType,
          cycleTag: debtMovements.cycleTag,
          notes: debtMovements.notes,
        })
        .from(debtMovements),
    ]);

    const cashbackByTxn = new Map<string, { percentBack: number; fixedBack: number; totalBack: number; cycleTag: string }>();
    for (const row of cashbackRows as CashbackRow[]) {
      if (!row.transactionId) {
        continue;
      }
      const existing =
        cashbackByTxn.get(row.transactionId) ?? {
          percentBack: 0,
          fixedBack: 0,
          totalBack: 0,
          cycleTag: '',
        };
      const amount = toNumber(row.cashbackAmount);
      if (row.cashbackType === 'percent') {
        existing.percentBack = toNumber(row.cashbackValue);
      } else if (row.cashbackType === 'fixed') {
        existing.fixedBack += toNumber(row.cashbackValue);
      }
      existing.totalBack += amount;
      if (!existing.cycleTag && row.cycleTag) {
        existing.cycleTag = normalizeCycleTag(row.cycleTag);
      }
      cashbackByTxn.set(row.transactionId, existing);
    }

    const debtByTxn = new Map<string, { debtTag: string; cycleTag: string }>();
    for (const row of debtRows as DebtMovementRow[]) {
      if (!row.transactionId) {
        continue;
      }
      const derived = deriveDebtTag(row);
      if (!debtByTxn.has(row.transactionId)) {
        debtByTxn.set(row.transactionId, derived);
        continue;
      }
      const existing = debtByTxn.get(row.transactionId)!;
      if (!existing.debtTag && derived.debtTag) {
        existing.debtTag = derived.debtTag;
      }
      if (!existing.cycleTag && derived.cycleTag) {
        existing.cycleTag = derived.cycleTag;
      }
    }

    return (baseRows as RawTransactionRow[]).map((row) => mapDbRowToRecord(row, cashbackByTxn, debtByTxn));
  } catch (error) {
    console.error('Failed to load transactions from Neon, falling back to mock dataset.', error);
    return buildFallbackDataset();
  }
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

import type { CashbackMovement } from "../../../src/db/schema/cashbackMovements";
import type { TransactionWithCashback } from "./types";

const toDateOnly = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return value;
};

const toTimestamp = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return value;
};

const serializeCashback = (movement: CashbackMovement) => ({
  cashback_movement_id: movement.cashbackMovementId,
  transaction_id: movement.transactionId,
  account_id: movement.accountId,
  cycle_tag: movement.cycleTag,
  cashback_type: movement.cashbackType,
  cashback_value: movement.cashbackValue,
  cashback_amount: movement.cashbackAmount,
  status: movement.status,
  budget_cap: movement.budgetCap,
  note: movement.note,
  created_at: toTimestamp(movement.createdAt),
  updated_at: toTimestamp(movement.updatedAt),
});

export const serializeTransactionRecord = (record: TransactionWithCashback) => ({
  transaction_id: record.transactionId,
  account_id: record.accountId,
  person_id: record.personId,
  shop_id: record.shopId,
  type: record.type,
  category_id: record.categoryId,
  subscription_member_id: record.subscriptionMemberId,
  linked_txn_id: record.linkedTxnId,
  status: record.status,
  amount: record.amount,
  fee: record.fee,
  occurred_on: toDateOnly(record.occurredOn),
  notes: record.notes,
  created_at: toTimestamp(record.createdAt),
  updated_at: toTimestamp(record.updatedAt),
  cashback_movements: record.cashbackMovements.map(serializeCashback),
});

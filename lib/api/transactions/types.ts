import type { CashbackMovement } from "../../../src/db/schema/cashbackMovements";
import type { Transaction } from "../../../src/db/schema/transactions";

export type TransactionWithCashback = Transaction & {
  cashbackMovements: CashbackMovement[];
};

export type SortableTransactionKeys =
  | "transactionId"
  | "accountId"
  | "personId"
  | "categoryId"
  | "shopId"
  | "type"
  | "status"
  | "amount"
  | "fee"
  | "occurredOn"
  | "createdAt"
  | "updatedAt";

export interface TransactionsQueryParams {
  search?: string;
  personId?: string;
  categoryId?: string;
  year?: number;
  month?: {
    mode: "single" | "range";
    start: string;
    end?: string;
  };
  limit?: number;
  offset?: number;
  sort?: {
    field: SortableTransactionKeys;
    direction: "asc" | "desc";
  };
}

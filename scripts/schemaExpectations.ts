export interface ColumnExpectation {
  readonly dataType: string;
  readonly udtName?: string;
  readonly isNullable: boolean;
  readonly maxLength?: number;
  readonly numericPrecision?: number;
  readonly numericScale?: number;
  readonly isArray?: boolean;
  readonly hasDefault?: boolean;
  readonly isGenerated?: boolean;
}

export interface ForeignKeyExpectation {
  readonly columns: string[];
  readonly referencedTable: string;
  readonly referencedColumns: string[];
}

export interface IndexExpectation {
  readonly indexName: string;
  readonly columns: string[];
  readonly isUnique?: boolean;
}

export interface TableExpectation {
  readonly tableName: string;
  readonly documentation?: string;
  readonly columns: Record<string, ColumnExpectation>;
  readonly primaryKey: string[];
  readonly foreignKeys?: ForeignKeyExpectation[];
  readonly uniqueConstraints?: string[][];
  readonly indexes?: IndexExpectation[];
}

const timestampColumn = (hasDefault = true): ColumnExpectation => ({
  dataType: "timestamp with time zone",
  isNullable: false,
  hasDefault,
});

const textColumn = (isNullable = true): ColumnExpectation => ({
  dataType: "text",
  isNullable,
});

const varcharColumn = (length: number, isNullable: boolean, hasDefault = false): ColumnExpectation => ({
  dataType: "character varying",
  maxLength: length,
  isNullable,
  hasDefault,
});

const numericColumn = (
  precision: number,
  scale: number,
  isNullable: boolean,
  hasDefault = false,
): ColumnExpectation => ({
  dataType: "numeric",
  numericPrecision: precision,
  numericScale: scale,
  isNullable,
  hasDefault,
});

const dateColumn = (isNullable: boolean): ColumnExpectation => ({
  dataType: "date",
  isNullable,
});

export const schemaExpectations: TableExpectation[] = [
  {
    tableName: "accounts",
    documentation: "docs/accounts-schema.md",
    columns: {
      account_id: varcharColumn(36, false),
      account_name: varcharColumn(120, false),
      img_url: textColumn(),
      account_type: { dataType: "USER-DEFINED", udtName: "account_type", isNullable: false },
      parent_account_id: varcharColumn(36, true),
      asset_ref: varcharColumn(36, true),
      opening_balance: numericColumn(18, 2, false),
      current_balance: numericColumn(18, 2, false),
      status: { dataType: "USER-DEFINED", udtName: "account_status", isNullable: false },
      total_in: numericColumn(18, 2, false, true),
      total_out: numericColumn(18, 2, false, true),
      created_at: timestampColumn(),
      updated_at: timestampColumn(),
      notes: textColumn(),
    },
    primaryKey: ["account_id"],
    foreignKeys: [
      { columns: ["parent_account_id"], referencedTable: "accounts", referencedColumns: ["account_id"] },
      { columns: ["asset_ref"], referencedTable: "assets", referencedColumns: ["asset_id"] },
    ],
  },
  {
    tableName: "people",
    documentation: "docs/people-schema.md",
    columns: {
      person_id: varcharColumn(36, false),
      full_name: varcharColumn(180, false),
      contact_info: textColumn(),
      status: { dataType: "USER-DEFINED", udtName: "person_status", isNullable: false },
      group_id: varcharColumn(36, true),
      img_url: textColumn(),
      note: textColumn(),
      created_at: timestampColumn(),
      updated_at: timestampColumn(),
    },
    primaryKey: ["person_id"],
  },
  {
    tableName: "categories",
    columns: {
      category_id: varcharColumn(36, false),
      name: varcharColumn(120, false),
      kind: { dataType: "USER-DEFINED", udtName: "category_kind", isNullable: false },
      parent_category_id: varcharColumn(36, true),
      description: textColumn(),
      created_at: timestampColumn(),
      updated_at: timestampColumn(),
    },
    primaryKey: ["category_id"],
    foreignKeys: [
      { columns: ["parent_category_id"], referencedTable: "categories", referencedColumns: ["category_id"] },
    ],
  },
  {
    tableName: "assets",
    documentation: "docs/assets-schema.md",
    columns: {
      asset_id: varcharColumn(36, false),
      asset_name: varcharColumn(180, false),
      asset_type: { dataType: "USER-DEFINED", udtName: "asset_type", isNullable: false },
      owner_id: varcharColumn(36, false),
      linked_account_id: varcharColumn(36, true),
      status: { dataType: "USER-DEFINED", udtName: "asset_status", isNullable: false },
      current_value: numericColumn(18, 2, false),
      initial_value: numericColumn(18, 2, true),
      currency: varcharColumn(10, true),
      acquired_at: dateColumn(true),
      img_url: textColumn(),
      notes: textColumn(),
      created_at: timestampColumn(),
      updated_at: timestampColumn(),
    },
    primaryKey: ["asset_id"],
    foreignKeys: [
      { columns: ["owner_id"], referencedTable: "people", referencedColumns: ["person_id"] },
      { columns: ["linked_account_id"], referencedTable: "accounts", referencedColumns: ["account_id"] },
    ],
  },
  {
    tableName: "shops",
    documentation: "docs/shops-schema.md",
    columns: {
      shop_id: varcharColumn(36, false),
      shop_name: varcharColumn(180, false),
      shop_type: { dataType: "USER-DEFINED", udtName: "shop_type", isNullable: false },
      img_url: textColumn(),
      url: textColumn(),
      status: { dataType: "USER-DEFINED", udtName: "shop_status", isNullable: false },
      notes: textColumn(),
      created_at: timestampColumn(),
      updated_at: timestampColumn(),
    },
    primaryKey: ["shop_id"],
  },
  {
    tableName: "batch_imports",
    documentation: "docs/batch-import-schema.md",
    columns: {
      batch_import_id: varcharColumn(36, false),
      batch_name: varcharColumn(160, false),
      import_type: { dataType: "USER-DEFINED", udtName: "batch_import_type", isNullable: false },
      status: { dataType: "USER-DEFINED", udtName: "batch_import_status", isNullable: false },
      account_id: varcharColumn(36, false),
      total_amount: numericColumn(18, 2, false),
      deadline: dateColumn(false),
      user_id: varcharColumn(36, false),
      notes: textColumn(),
      created_at: timestampColumn(),
      updated_at: timestampColumn(),
    },
    primaryKey: ["batch_import_id"],
    foreignKeys: [
      { columns: ["account_id"], referencedTable: "accounts", referencedColumns: ["account_id"] },
      { columns: ["user_id"], referencedTable: "people", referencedColumns: ["person_id"] },
    ],
  },
  {
    tableName: "cashback_ledger",
    documentation: "docs/cashback-ledger-schema.md",
    columns: {
      cashback_ledger_id: varcharColumn(36, false),
      account_id: varcharColumn(36, false),
      cycle_tag: varcharColumn(10, false),
      total_spend: numericColumn(18, 2, false, true),
      total_cashback: numericColumn(18, 2, false, true),
      budget_cap: numericColumn(18, 2, false, true),
      eligibility: { dataType: "USER-DEFINED", udtName: "cashback_eligibility", isNullable: false },
      remaining_budget: numericColumn(18, 2, false, true),
      status: { dataType: "USER-DEFINED", udtName: "cashback_ledger_status", isNullable: false },
      notes: textColumn(),
      last_updated: timestampColumn(),
    },
    primaryKey: ["cashback_ledger_id"],
    foreignKeys: [
      { columns: ["account_id"], referencedTable: "accounts", referencedColumns: ["account_id"] },
    ],
    indexes: [
      { indexName: "cashback_ledger_account_cycle_uidx", columns: ["account_id", "cycle_tag"], isUnique: true },
    ],
  },
  {
    tableName: "cashback_movements",
    documentation: "docs/cashback-movement-schema.md",
    columns: {
      cashback_movement_id: varcharColumn(36, false),
      transaction_id: varcharColumn(36, false),
      account_id: varcharColumn(36, false),
      cycle_tag: varcharColumn(10, false),
      cashback_type: { dataType: "USER-DEFINED", udtName: "cashback_type", isNullable: false },
      cashback_value: numericColumn(18, 4, false),
      cashback_amount: numericColumn(18, 2, false),
      status: { dataType: "USER-DEFINED", udtName: "cashback_status", isNullable: false },
      budget_cap: numericColumn(18, 2, true),
      note: textColumn(),
      created_at: timestampColumn(),
      updated_at: timestampColumn(),
    },
    primaryKey: ["cashback_movement_id"],
    foreignKeys: [
      { columns: ["transaction_id"], referencedTable: "transactions", referencedColumns: ["transaction_id"] },
      { columns: ["account_id"], referencedTable: "accounts", referencedColumns: ["account_id"] },
    ],
    indexes: [
      { indexName: "cashback_movements_account_cycle_idx", columns: ["account_id", "cycle_tag"] },
    ],
  },
  {
    tableName: "debt_ledger",
    documentation: "docs/debt-ledger-schema.md",
    columns: {
      debt_ledger_id: varcharColumn(36, false),
      person_id: varcharColumn(36, false),
      cycle_tag: varcharColumn(10, true),
      initial_debt: numericColumn(18, 2, false, true),
      new_debt: numericColumn(18, 2, false, true),
      repayments: numericColumn(18, 2, false, true),
      debt_discount: numericColumn(18, 2, true, true),
      net_debt: numericColumn(18, 2, false, true),
      status: { dataType: "USER-DEFINED", udtName: "debt_ledger_status", isNullable: false },
      last_updated: timestampColumn(),
      notes: textColumn(),
    },
    primaryKey: ["debt_ledger_id"],
    foreignKeys: [
      { columns: ["person_id"], referencedTable: "people", referencedColumns: ["person_id"] },
    ],
    indexes: [
      { indexName: "debt_ledger_person_cycle_uidx", columns: ["person_id", "cycle_tag"], isUnique: true },
    ],
  },
  {
    tableName: "debt_movements",
    documentation: "docs/debt-movement-schema.md",
    columns: {
      debt_movement_id: varcharColumn(36, false),
      transaction_id: varcharColumn(36, false),
      person_id: varcharColumn(36, false),
      account_id: varcharColumn(36, false),
      movement_type: { dataType: "USER-DEFINED", udtName: "debt_movement_type", isNullable: false },
      amount: numericColumn(18, 2, false),
      cycle_tag: varcharColumn(10, true),
      status: { dataType: "USER-DEFINED", udtName: "debt_movement_status", isNullable: false },
      notes: textColumn(),
      created_at: timestampColumn(),
      updated_at: timestampColumn(),
    },
    primaryKey: ["debt_movement_id"],
    foreignKeys: [
      { columns: ["transaction_id"], referencedTable: "transactions", referencedColumns: ["transaction_id"] },
      { columns: ["person_id"], referencedTable: "people", referencedColumns: ["person_id"] },
      { columns: ["account_id"], referencedTable: "accounts", referencedColumns: ["account_id"] },
    ],
    indexes: [
      { indexName: "debt_movements_person_account_idx", columns: ["person_id", "account_id"] },
      { indexName: "debt_movements_account_cycle_idx", columns: ["account_id", "cycle_tag"] },
    ],
  },
  {
    tableName: "transactions",
    documentation: "docs/transactions-schema.md",
    columns: {
      transaction_id: varcharColumn(36, false),
      account_id: varcharColumn(36, false),
      person_id: varcharColumn(36, true),
      shop_id: varcharColumn(36, true),
      type: { dataType: "USER-DEFINED", udtName: "transaction_type", isNullable: false },
      category_id: varcharColumn(36, true),
      subscription_member_id: varcharColumn(36, true),
      linked_txn_id: varcharColumn(36, true),
      status: { dataType: "USER-DEFINED", udtName: "transaction_status", isNullable: false },
      amount: numericColumn(18, 2, false),
      fee: numericColumn(18, 2, true),
      occurred_on: dateColumn(false),
      notes: textColumn(),
      created_at: timestampColumn(),
      updated_at: timestampColumn(),
    },
    primaryKey: ["transaction_id"],
    foreignKeys: [
      { columns: ["account_id"], referencedTable: "accounts", referencedColumns: ["account_id"] },
      { columns: ["person_id"], referencedTable: "people", referencedColumns: ["person_id"] },
      { columns: ["shop_id"], referencedTable: "shops", referencedColumns: ["shop_id"] },
      { columns: ["category_id"], referencedTable: "categories", referencedColumns: ["category_id"] },
      { columns: ["subscription_member_id"], referencedTable: "subscription_members", referencedColumns: ["member_id"] },
      { columns: ["linked_txn_id"], referencedTable: "linked_transactions", referencedColumns: ["linked_txn_id"] },
    ],
  },
  {
    tableName: "linked_transactions",
    documentation: "docs/linked-transactions-schema.md",
    columns: {
      linked_txn_id: varcharColumn(36, false),
      parent_txn_id: varcharColumn(36, true),
      type: { dataType: "USER-DEFINED", udtName: "linked_txn_type", isNullable: false },
      related_txn_ids: { dataType: "ARRAY", udtName: "_varchar", isNullable: false, hasDefault: true, isArray: true },
      notes: textColumn(),
      status: { dataType: "USER-DEFINED", udtName: "linked_txn_status", isNullable: false },
      created_at: timestampColumn(),
      updated_at: timestampColumn(),
    },
    primaryKey: ["linked_txn_id"],
    foreignKeys: [
      { columns: ["parent_txn_id"], referencedTable: "transactions", referencedColumns: ["transaction_id"] },
    ],
  },
  {
    tableName: "card_pl",
    documentation: "docs/card-pl-schema.md",
    columns: {
      card_pl_id: varcharColumn(36, false),
      account_id: varcharColumn(36, false),
      year: varcharColumn(9, false),
      total_earned: numericColumn(18, 2, false, true),
      total_fee: numericColumn(18, 2, false, true),
      net_pl: { dataType: "numeric", numericPrecision: 18, numericScale: 2, isNullable: true, isGenerated: true },
      notes: textColumn(),
      created_at: timestampColumn(),
      updated_at: timestampColumn(),
    },
    primaryKey: ["card_pl_id"],
    foreignKeys: [
      { columns: ["account_id"], referencedTable: "accounts", referencedColumns: ["account_id"] },
    ],
  },
  {
    tableName: "subscriptions",
    columns: {
      subscription_id: varcharColumn(36, false),
      subscription_name: varcharColumn(160, false),
      provider: varcharColumn(120, true),
      billing_account_id: varcharColumn(36, false),
      owner_id: varcharColumn(36, false),
      amount: numericColumn(18, 2, true),
      currency_code: varcharColumn(10, true, true),
      billing_interval: { dataType: "USER-DEFINED", udtName: "subscription_interval", isNullable: false },
      next_billing_date: dateColumn(true),
      status: { dataType: "USER-DEFINED", udtName: "subscription_status", isNullable: false, hasDefault: true },
      notes: textColumn(),
      created_at: timestampColumn(),
      updated_at: timestampColumn(),
    },
    primaryKey: ["subscription_id"],
    foreignKeys: [
      { columns: ["billing_account_id"], referencedTable: "accounts", referencedColumns: ["account_id"] },
      { columns: ["owner_id"], referencedTable: "people", referencedColumns: ["person_id"] },
    ],
    indexes: [
      {
        indexName: "subscriptions_account_name_uidx",
        columns: ["billing_account_id", "subscription_name"],
        isUnique: true,
      },
    ],
  },
  {
    tableName: "subscription_members",
    columns: {
      member_id: varcharColumn(36, false),
      subscription_id: varcharColumn(36, false),
      person_id: varcharColumn(36, false),
      reimbursement_account_id: varcharColumn(36, true),
      responsibility_share: numericColumn(5, 4, true),
      role: { dataType: "USER-DEFINED", udtName: "subscription_member_role", isNullable: false, hasDefault: true },
      status: { dataType: "USER-DEFINED", udtName: "subscription_member_status", isNullable: false, hasDefault: true },
      notes: textColumn(),
      created_at: timestampColumn(),
      updated_at: timestampColumn(),
    },
    primaryKey: ["member_id"],
    foreignKeys: [
      { columns: ["subscription_id"], referencedTable: "subscriptions", referencedColumns: ["subscription_id"] },
      { columns: ["person_id"], referencedTable: "people", referencedColumns: ["person_id"] },
      { columns: ["reimbursement_account_id"], referencedTable: "accounts", referencedColumns: ["account_id"] },
    ],
    indexes: [
      {
        indexName: "subscription_members_subscription_person_uidx",
        columns: ["subscription_id", "person_id"],
        isUnique: true,
      },
    ],
  },
];


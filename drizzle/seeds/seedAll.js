require("dotenv/config");
require("ts-node/register");

const { sql, eq } = require("drizzle-orm");
const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require("pg");

const { people } = require("../../src/db/schema/people");
const { accounts } = require("../../src/db/schema/accounts");
const { categories } = require("../../src/db/schema/categories");
const { shops } = require("../../src/db/schema/shops");
const { transactions, linkedTransactions } = require("../../src/db/schema/transactions");
const { cashbackLedger } = require("../../src/db/schema/cashbackLedger");
const { cashbackMovements } = require("../../src/db/schema/cashbackMovements");
const { debtLedger } = require("../../src/db/schema/debtLedger");
const { debtMovements } = require("../../src/db/schema/debtMovements");
const { subscriptions, subscriptionMembers } = require("../../src/db/schema/subscriptions");
const { sheetLinks } = require("../../src/db/schema/sheetLinks");
const { batchImports } = require("../../src/db/schema/batchImports");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required to run the seed script.");
}

const ssl =
  process.env.PGSSLMODE === "require" || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  connectionString,
  ssl,
});

const db = drizzle(pool);

const targetTables = [
  "cashback_movements",
  "cashback_ledger",
  "debt_movements",
  "debt_ledger",
  "transactions",
  "linked_transactions",
  "subscription_members",
  "subscriptions",
  "sheet_links",
  "batch_imports",
  "accounts",
  "people",
  "categories",
  "shops",
];

const categoryRows = [
  {
    categoryId: "cat_groceries",
    name: "Groceries",
    kind: "expense",
    parentCategoryId: null,
    description: "Everyday grocery and supermarket purchases.",
  },
  {
    categoryId: "cat_dining",
    name: "Dining & Cafes",
    kind: "expense",
    parentCategoryId: null,
    description: "Restaurants, cafes, and casual dining out.",
  },
  {
    categoryId: "cat_subscription",
    name: "Streaming Subscriptions",
    kind: "subscription",
    parentCategoryId: null,
    description: "Recurring digital media and entertainment plans.",
  },
  {
    categoryId: "cat_salary",
    name: "Salary",
    kind: "income",
    parentCategoryId: null,
    description: "Employer payroll deposits and recurring income.",
  },
  {
    categoryId: "cat_debt_service",
    name: "Debt Service",
    kind: "debt",
    parentCategoryId: null,
    description: "Loan drawdowns, repayments, and related adjustments.",
  },
];

const peopleRows = [
  {
    personId: "person_alex_jordan",
    fullName: "Alex Jordan",
    contactInfo: "alex.jordan@example.com",
    status: "active",
    groupId: "household_jordan",
    imgUrl: "https://cdn.example.com/avatars/alex-jordan.png",
    note: "Primary household budget owner.",
  },
  {
    personId: "person_bianca_liu",
    fullName: "Bianca Liu",
    contactInfo: "bianca.liu@example.com",
    status: "active",
    groupId: "household_jordan",
    imgUrl: "https://cdn.example.com/avatars/bianca-liu.png",
    note: "Handles shared subscriptions and rewards programs.",
  },
  {
    personId: "person_carlos_mendez",
    fullName: "Carlos Mendez",
    contactInfo: "carlos.mendez@example.com",
    status: "active",
    groupId: "studio_collective",
    imgUrl: null,
    note: "Small business owner financing new studio equipment.",
  },
  {
    personId: "person_dana_singh",
    fullName: "Dana Singh",
    contactInfo: "dana.singh@example.com",
    status: "active",
    groupId: "studio_collective",
    imgUrl: "https://cdn.example.com/avatars/dana-singh.png",
    note: "Supports analytics and reconciliations.",
  },
];

const shopRows = [
  {
    shopId: "shop_greenfield_market",
    shopName: "Greenfield Market",
    shopType: "retail",
    imgUrl: "https://cdn.example.com/shops/greenfield-market.png",
    url: "https://www.greenfield-market.example.com",
    status: "active",
    notes: "Local organic grocer participating in cashback promos.",
  },
  {
    shopId: "shop_riverside_cafe",
    shopName: "Riverside Cafe",
    shopType: "food",
    imgUrl: "https://cdn.example.com/shops/riverside-cafe.png",
    url: "https://www.riversidecafe.example.com",
    status: "active",
    notes: "Frequent team lunch spot offering group booking discounts.",
  },
  {
    shopId: "shop_streamflix",
    shopName: "StreamFlix",
    shopType: "digital",
    imgUrl: "https://cdn.example.com/shops/streamflix.png",
    url: "https://www.streamflix.example.com",
    status: "active",
    notes: "Streaming subscription partner with bundled cashback offers.",
  },
  {
    shopId: "shop_urban_fitness",
    shopName: "Urban Fitness Studio",
    shopType: "service",
    imgUrl: null,
    url: "https://urbanfitness.example.com",
    status: "hidden",
    notes: "Seasonal pop-up classes tracked for debt repayment incentives.",
  },
];

const accountRows = [
  {
    accountId: "acct_alex_checking",
    accountName: "Alex Everyday Checking",
    imgUrl: "https://cdn.example.com/accounts/alex-checking.png",
    accountType: "bank",
    ownerId: "person_alex_jordan",
    parentAccountId: null,
    assetRef: null,
    openingBalance: "2500.00",
    currentBalance: "3150.75",
    status: "active",
    totalIn: "1450.75",
    totalOut: "800.00",
    notes: "Primary household operating account.",
  },
  {
    accountId: "acct_bianca_rewards",
    accountName: "Bianca Rewards Credit",
    imgUrl: "https://cdn.example.com/accounts/bianca-rewards.png",
    accountType: "credit",
    ownerId: "person_bianca_liu",
    parentAccountId: null,
    assetRef: null,
    openingBalance: "0.00",
    currentBalance: "870.40",
    status: "active",
    totalIn: "0.00",
    totalOut: "870.40",
    notes: "Used for cashback eligible spending and subscription billing.",
  },
  {
    accountId: "acct_carlos_loan",
    accountName: "Carlos Equipment Loan",
    imgUrl: null,
    accountType: "loan",
    ownerId: "person_carlos_mendez",
    parentAccountId: null,
    assetRef: null,
    openingBalance: "500.00",
    currentBalance: "1500.00",
    status: "active",
    totalIn: "0.00",
    totalOut: "1200.00",
    notes: "Line of credit supporting studio expansion.",
  },
  {
    accountId: "acct_shared_wallet",
    accountName: "Shared Wallet",
    imgUrl: null,
    accountType: "cash",
    ownerId: "person_dana_singh",
    parentAccountId: null,
    assetRef: null,
    openingBalance: "300.00",
    currentBalance: "245.20",
    status: "active",
    totalIn: "520.00",
    totalOut: "574.80",
    notes: "Petty cash for ad-hoc household purchases.",
  },
];

const sheetLinkRows = [
  {
    sheetLinkId: "sheet_link_alex_budget",
    url: "https://docs.google.com/spreadsheets/d/alex-budget",
    personId: "person_alex_jordan",
    groupId: null,
    type: "report",
    lastSync: new Date("2025-09-28T08:00:00Z"),
    notes: "Automatically synced for month-end budget review.",
  },
  {
    sheetLinkId: "sheet_link_household_debt",
    url: "https://docs.google.com/spreadsheets/d/household-debt-tracker",
    personId: null,
    groupId: "household_jordan",
    type: "debt",
    lastSync: null,
    notes: "Manual tracker used during quarterly debt audits.",
  },
];

const batchImportRows = [
  {
    batchImportId: "batch_import_cashback_audit_sep2025",
    batchName: "September Cashback Audit",
    importType: "payment",
    status: "processing",
    accountId: "acct_bianca_rewards",
    totalAmount: "480.00",
    deadline: "2025-10-05",
    userId: "person_bianca_liu",
    notes: "Reconciling credit card cashback adjustments before statement cut-off.",
  },
];

const subscriptionRows = [
  {
    subscriptionId: "sub_streamflix_premium",
    name: "StreamFlix Premium",
    provider: "StreamFlix",
    type: "netflix",
    pricePerMonth: "19.99",
    currencyCode: "USD",
    billingInterval: "monthly",
    nextBillingDate: "2025-10-14",
    ownerId: "person_bianca_liu",
    billingAccountId: "acct_bianca_rewards",
    status: "active",
    imageUrl: "https://cdn.example.com/subscriptions/streamflix.png",
    notes: "Shared premium plan with UHD add-on.",
  },
];

const subscriptionMemberRows = [
  {
    memberId: "submem_streamflix_bianca",
    subscriptionId: "sub_streamflix_premium",
    personId: "person_bianca_liu",
    reimbursementAccountId: "acct_bianca_rewards",
    role: "owner",
    joinDate: "2023-04-01",
    leaveDate: null,
    shareRatio: "0.60",
    status: "active",
    notes: "Primary owner covering majority of the plan.",
  },
  {
    memberId: "submem_streamflix_alex",
    subscriptionId: "sub_streamflix_premium",
    personId: "person_alex_jordan",
    reimbursementAccountId: "acct_alex_checking",
    role: "member",
    joinDate: "2023-04-01",
    leaveDate: null,
    shareRatio: "0.40",
    status: "active",
    notes: "Reimburses owner via household transfers.",
  },
];

const linkedTransactionRows = [
  {
    linkedTxnId: "link_team_dinner_weekend",
    parentTxnId: null,
    type: "split",
    relatedTxnIds: [
      "txn_team_dinner_parent_2025_09_20",
      "txn_team_dinner_split_2025_09_20",
    ],
    status: "active",
    notes: "Weekend team dinner split tracked for reimbursement.",
  },
];

const transactionRows = [
  {
    transactionId: "txn_salary_september_2025",
    accountId: "acct_alex_checking",
    personId: "person_alex_jordan",
    type: "income",
    categoryId: "cat_salary",
    subscriptionMemberId: null,
    linkedTxnId: null,
    shopId: null,
    status: "active",
    amount: "3200.00",
    fee: null,
    occurredOn: "2025-09-30",
    notes: "September salary deposit from employer.",
  },
  {
    transactionId: "txn_grocery_greenfield_2025_09_12",
    accountId: "acct_alex_checking",
    personId: "person_alex_jordan",
    type: "expense",
    categoryId: "cat_groceries",
    subscriptionMemberId: null,
    linkedTxnId: null,
    shopId: "shop_greenfield_market",
    status: "active",
    amount: "82.35",
    fee: null,
    occurredOn: "2025-09-12",
    notes: "Weekly grocery run during cashback promotion.",
  },
  {
    transactionId: "txn_streamflix_oct_2025",
    accountId: "acct_bianca_rewards",
    personId: "person_bianca_liu",
    type: "subscription",
    categoryId: "cat_subscription",
    subscriptionMemberId: "submem_streamflix_bianca",
    linkedTxnId: null,
    shopId: "shop_streamflix",
    status: "pending",
    amount: "19.99",
    fee: null,
    occurredOn: "2025-10-14",
    notes: "Upcoming StreamFlix billing for UHD plan.",
  },
  {
    transactionId: "txn_carlos_loan_draw_2025_09",
    accountId: "acct_carlos_loan",
    personId: "person_carlos_mendez",
    type: "debt",
    categoryId: "cat_debt_service",
    subscriptionMemberId: null,
    linkedTxnId: null,
    shopId: null,
    status: "active",
    amount: "1200.00",
    fee: null,
    occurredOn: "2025-09-03",
    notes: "Equipment loan drawdown for studio lighting upgrade.",
  },
  {
    transactionId: "txn_carlos_loan_repay_2025_09",
    accountId: "acct_carlos_loan",
    personId: "person_carlos_mendez",
    type: "repayment",
    categoryId: "cat_debt_service",
    subscriptionMemberId: null,
    linkedTxnId: null,
    shopId: null,
    status: "active",
    amount: "200.00",
    fee: null,
    occurredOn: "2025-09-28",
    notes: "Partial repayment against September loan cycle.",
  },
  {
    transactionId: "txn_team_dinner_parent_2025_09_20",
    accountId: "acct_bianca_rewards",
    personId: "person_bianca_liu",
    type: "expense",
    categoryId: "cat_dining",
    subscriptionMemberId: null,
    linkedTxnId: "link_team_dinner_weekend",
    shopId: "shop_riverside_cafe",
    status: "active",
    amount: "240.00",
    fee: null,
    occurredOn: "2025-09-20",
    notes: "Team dinner paid on rewards card before splitting.",
  },
  {
    transactionId: "txn_team_dinner_split_2025_09_20",
    accountId: "acct_alex_checking",
    personId: "person_alex_jordan",
    type: "expense",
    categoryId: "cat_dining",
    subscriptionMemberId: null,
    linkedTxnId: "link_team_dinner_weekend",
    shopId: "shop_riverside_cafe",
    status: "active",
    amount: "120.00",
    fee: null,
    occurredOn: "2025-09-20",
    notes: "Alex reimbursement for team dinner split.",
  },
];

const cashbackLedgerRows = [
  {
    cashbackLedgerId: "cb_ledger_alex_sep_2025",
    accountId: "acct_alex_checking",
    cycleTag: "2025-09",
    totalSpend: "202.35",
    totalCashback: "4.12",
    budgetCap: "50.00",
    eligibility: "eligible",
    remainingBudget: "45.88",
    status: "open",
    notes: "Household grocery cashback campaign for September.",
  },
  {
    cashbackLedgerId: "cb_ledger_bianca_sep_2025",
    accountId: "acct_bianca_rewards",
    cycleTag: "2025-09",
    totalSpend: "240.00",
    totalCashback: "19.20",
    budgetCap: "100.00",
    eligibility: "eligible",
    remainingBudget: "80.80",
    status: "open",
    notes: "Dining cashback promo triggered by corporate team dinner.",
  },
];

const cashbackMovementRows = [
  {
    cashbackMovementId: "cb_move_greenfield_2025_09_12",
    transactionId: "txn_grocery_greenfield_2025_09_12",
    accountId: "acct_alex_checking",
    cycleTag: "2025-09",
    cashbackType: "percent",
    cashbackValue: "5.0000",
    cashbackAmount: "4.12",
    status: "applied",
    budgetCap: "50.00",
    note: "5% cashback on grocery category run.",
  },
  {
    cashbackMovementId: "cb_move_team_dinner_parent",
    transactionId: "txn_team_dinner_parent_2025_09_20",
    accountId: "acct_bianca_rewards",
    cycleTag: "2025-09",
    cashbackType: "percent",
    cashbackValue: "8.0000",
    cashbackAmount: "19.20",
    status: "applied",
    budgetCap: "100.00",
    note: "Accelerated dining cashback weekend promotion.",
  },
];

const debtLedgerRows = [
  {
    debtLedgerId: "debt_ledger_carlos_sep_2025",
    personId: "person_carlos_mendez",
    cycleTag: "2025-09",
    initialDebt: "500.00",
    newDebt: "1200.00",
    repayments: "200.00",
    debtDiscount: "0.00",
    netDebt: "1500.00",
    status: "partial",
    notes: "September cycle pending final payment and reconciliation.",
  },
];

const debtMovementRows = [
  {
    debtMovementId: "debt_move_carlos_draw_2025_09",
    transactionId: "txn_carlos_loan_draw_2025_09",
    personId: "person_carlos_mendez",
    accountId: "acct_carlos_loan",
    movementType: "borrow",
    amount: "1200.00",
    cycleTag: "2025-09",
    status: "active",
    notes: "Initial drawdown for studio equipment expansion.",
  },
  {
    debtMovementId: "debt_move_carlos_repay_2025_09",
    transactionId: "txn_carlos_loan_repay_2025_09",
    personId: "person_carlos_mendez",
    accountId: "acct_carlos_loan",
    movementType: "repay",
    amount: "-200.00",
    cycleTag: "2025-09",
    status: "settled",
    notes: "Partial repayment posted before statement close.",
  },
];

async function seed() {
  console.info("🚀 Starting business workflow seed...");

  try {
    const existingTableRows = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = ANY($2::text[])",
      ["public", targetTables],
    );
    const existingTables = new Set(existingTableRows.rows.map((row) => row.table_name));
    const missingTables = targetTables.filter((name) => !existingTables.has(name));
    if (missingTables.length > 0) {
      console.warn(
        "⚠️  Skipping truncate/seed for tables missing in Neon:",
        missingTables.join(", "),
      );
    }

    const truncateOrder = [
      "cashback_movements",
      "cashback_ledger",
      "debt_movements",
      "debt_ledger",
      "transactions",
      "linked_transactions",
      "subscription_members",
      "subscriptions",
      "sheet_links",
      "batch_imports",
      "accounts",
      "people",
      "categories",
      "shops",
    ];

    const insertedCounts = Object.fromEntries(targetTables.map((name) => [name, 0]));

    await db.transaction(async (tx) => {
      for (const tableName of truncateOrder) {
        if (!existingTables.has(tableName)) {
          continue;
        }
        await tx.execute(
          sql`TRUNCATE TABLE ${sql.identifier(tableName)} RESTART IDENTITY CASCADE`,
        );
      }

      const insertPlan = [
        { name: "categories", entity: categories, rows: categoryRows },
        { name: "people", entity: people, rows: peopleRows },
        { name: "shops", entity: shops, rows: shopRows },
        { name: "accounts", entity: accounts, rows: accountRows },
        { name: "sheet_links", entity: sheetLinks, rows: sheetLinkRows },
        { name: "batch_imports", entity: batchImports, rows: batchImportRows },
        { name: "subscriptions", entity: subscriptions, rows: subscriptionRows },
        {
          name: "subscription_members",
          entity: subscriptionMembers,
          rows: subscriptionMemberRows,
        },
        {
          name: "linked_transactions",
          entity: linkedTransactions,
          rows: linkedTransactionRows,
        },
        { name: "transactions", entity: transactions, rows: transactionRows },
        { name: "cashback_ledger", entity: cashbackLedger, rows: cashbackLedgerRows },
        {
          name: "cashback_movements",
          entity: cashbackMovements,
          rows: cashbackMovementRows,
        },
        { name: "debt_ledger", entity: debtLedger, rows: debtLedgerRows },
        { name: "debt_movements", entity: debtMovements, rows: debtMovementRows },
      ];

      for (const { name, entity, rows } of insertPlan) {
        if (!rows.length || !existingTables.has(name)) {
          continue;
        }
        await tx.insert(entity).values(rows);
        insertedCounts[name] = rows.length;
      }

      if (existingTables.has("linked_transactions")) {
        await tx
          .update(linkedTransactions)
          .set({ parentTxnId: "txn_team_dinner_parent_2025_09_20" })
          .where(eq(linkedTransactions.linkedTxnId, "link_team_dinner_weekend"));
      }
    });

    console.info("✅ Seed completed successfully. Inserted sample counts:");
    console.table({
      people: insertedCounts.people ?? 0,
      accounts: insertedCounts.accounts ?? 0,
      categories: insertedCounts.categories ?? 0,
      shops: insertedCounts.shops ?? 0,
      transactions: insertedCounts.transactions ?? 0,
      subscriptions: insertedCounts.subscriptions ?? 0,
      subscriptionMembers: insertedCounts.subscription_members ?? 0,
      linkedTransactions: insertedCounts.linked_transactions ?? 0,
      cashbackLedger: insertedCounts.cashback_ledger ?? 0,
      cashbackMovements: insertedCounts.cashback_movements ?? 0,
      debtLedger: insertedCounts.debt_ledger ?? 0,
      debtMovements: insertedCounts.debt_movements ?? 0,
      sheetLinks: existingTables.has("sheet_links")
        ? insertedCounts.sheet_links ?? 0
        : "table missing",
      batchImports: insertedCounts.batch_imports ?? 0,
    });

    console.info("🔗 Workflow coverage snapshot:");
    console.info(
      "- Cashback transactions:",
      cashbackMovementRows.map((row) => row.transactionId).join(", "),
    );
    console.info(
      "- Debt movements anchored to transactions:",
      debtMovementRows.map((row) => row.transactionId).join(", "),
    );
    console.info(
      "- Subscription transactions:",
      transactionRows
        .filter((row) => row.subscriptionMemberId)
        .map((row) => row.transactionId)
        .join(", "),
    );
  } catch (error) {
    console.error("❌ Seed script encountered an error:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();

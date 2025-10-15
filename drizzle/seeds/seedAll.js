require("dotenv/config");
require("ts-node/register");

const { drizzle } = require("drizzle-orm/node-postgres");
const { eq, inArray } = require("drizzle-orm");
const { Pool } = require("pg");

const { people } = require("../../src/db/schema/people");
const { accounts } = require("../../src/db/schema/accounts");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is required to run the seed script."
  );
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

const peopleSeeds = [
  {
    personId: "owner_alex_jordan",
    fullName: "Alex Jordan",
    contactInfo: "alex.jordan@example.com",
    status: "active",
    groupId: "household_jordan",
    imgUrl: "https://example.com/img/ajordan.png",
    note: "Primary account owner",
  },
  {
    personId: "owner_bianca_liu",
    fullName: "Bianca Liu",
    contactInfo: "bianca.liu@example.com",
    status: "active",
    groupId: "household_liu",
    imgUrl: "https://example.com/img/bliu.png",
    note: "Prefers SMS alerts",
  },
  {
    personId: "owner_carlos_mendez",
    fullName: "Carlos Mendez",
    contactInfo: "carlos.mendez@example.com",
    status: "inactive",
    groupId: null,
    imgUrl: null,
    note: "Pending KYC verification",
  },
  {
    personId: "owner_dana_singh",
    fullName: "Dana Singh",
    contactInfo: "dana.singh@example.com",
    status: "active",
    groupId: "household_singh",
    imgUrl: "https://example.com/img/dsingh.png",
    note: "Has joint accounts",
  },
  {
    personId: "owner_emre_kaya",
    fullName: "Emre Kaya",
    contactInfo: "emre.kaya@example.com",
    status: "archived",
    groupId: null,
    imgUrl: null,
    note: "Migrated to legacy system",
  },
];

const accountSeeds = [
  {
    accountId: "acct_alex_checking",
    accountName: "Alex Daily Checking",
    imgUrl: "https://example.com/img/checking.png",
    accountType: "bank",
    ownerId: "owner_alex_jordan",
    parentAccountId: null,
    assetRef: null,
    openingBalance: "1500.00",
    currentBalance: "1725.50",
    status: "active",
    totalIn: "225.50",
    totalOut: "0.00",
    notes: "Main household account",
  },
  {
    accountId: "acct_bianca_credit",
    accountName: "Bianca Rewards Credit",
    imgUrl: "https://example.com/img/credit.png",
    accountType: "credit",
    ownerId: "owner_bianca_liu",
    parentAccountId: null,
    assetRef: null,
    openingBalance: "500.00",
    currentBalance: "320.25",
    status: "active",
    totalIn: "0.00",
    totalOut: "179.75",
    notes: "Cashback tracking",
  },
  {
    accountId: "acct_carlos_savings",
    accountName: "Carlos Rainy Day Savings",
    imgUrl: null,
    accountType: "saving",
    ownerId: "owner_carlos_mendez",
    parentAccountId: null,
    assetRef: null,
    openingBalance: "3000.00",
    currentBalance: "3055.00",
    status: "closed",
    totalIn: "55.00",
    totalOut: "0.00",
    notes: "Closed after transfer to new bank",
  },
  {
    accountId: "acct_dana_invest",
    accountName: "Dana Index Fund",
    imgUrl: null,
    accountType: "invest",
    ownerId: "owner_dana_singh",
    parentAccountId: null,
    assetRef: null,
    openingBalance: "8000.00",
    currentBalance: "8430.30",
    status: "active",
    totalIn: "430.30",
    totalOut: "0.00",
    notes: "Long-term growth",
  },
  {
    accountId: "acct_joint_cash",
    accountName: "Singh Family Cash Pouch",
    imgUrl: null,
    accountType: "cash",
    ownerId: "owner_dana_singh",
    parentAccountId: "acct_dana_invest",
    assetRef: null,
    openingBalance: "120.00",
    currentBalance: "95.25",
    status: "active",
    totalIn: "0.00",
    totalOut: "24.75",
    notes: "Linked to household budget",
  },
];

async function seed() {
  console.log("Starting seed for people and accounts tables...");

  try {
    await db.transaction(async (tx) => {
      // Clean up prior seed data for idempotency
      await tx.delete(accounts).where(
        inArray(
          accounts.accountId,
          accountSeeds.map((account) => account.accountId)
        )
      );

      await tx.delete(people).where(
        inArray(people.personId, peopleSeeds.map((person) => person.personId))
      );

      await tx.insert(people).values(peopleSeeds);
      await tx.insert(accounts).values(accountSeeds);
    });

    const insertedPeople = await db.select().from(people);
    console.log("People after insert:");
    console.log(insertedPeople);

    const insertedAccounts = await db.select().from(accounts);
    console.log("Accounts after insert:");
    console.log(insertedAccounts);

    const accountToUpdate = accountSeeds[0].accountId;
    const updatedName = "Alex Daily Checking (Renamed)";

    await db
      .update(accounts)
      .set({ accountName: updatedName })
      .where(eq(accounts.accountId, accountToUpdate));

    const updatedAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.accountId, accountToUpdate));

    console.log("Account after update:");
    console.log(updatedAccount);

    const personToDeleteWithConstraint = accountSeeds[1].ownerId;
    try {
      await db
        .delete(people)
        .where(eq(people.personId, personToDeleteWithConstraint));
      console.log(
        "Unexpected success deleting person with active accounts:",
        personToDeleteWithConstraint
      );
    } catch (error) {
      console.error(
        "Expected constraint error when deleting person with accounts:",
        error.message
      );
    }

    const accountToRemove = accountSeeds[1].accountId;

    await db
      .delete(accounts)
      .where(eq(accounts.accountId, accountToRemove));

    const deletedAccountOwner = accountSeeds[1].ownerId;

    await db
      .delete(people)
      .where(eq(people.personId, deletedAccountOwner));

    console.log("Deleted account and owner:", {
      accountId: accountToRemove,
      personId: deletedAccountOwner,
    });

    const finalPeople = await db.select().from(people);
    const finalAccounts = await db.select().from(accounts);

    console.log("Final people rows:", finalPeople);
    console.log("Final account rows:", finalAccounts);

    console.log("Seed and CRUD validation completed successfully.");
  } catch (error) {
    console.error("Seed script encountered an error:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();

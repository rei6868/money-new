import { db } from "../db/client";
import { accounts } from "../../src/db/schema/accounts";
import { people } from "../../src/db/schema/people";
import { eq, or, ilike, asc, desc, count } from "drizzle-orm";
import type { AccountsTableRequest, AccountsTableResponse, AccountRecord } from "./accounts.types";

export async function getAccountsTable(request: AccountsTableRequest = {}): Promise<AccountsTableResponse> {
  const page = request.pagination?.page ?? 1;
  const pageSize = Math.min(request.pagination?.pageSize ?? 50, 100);
  const offset = (page - 1) * pageSize;

  let query = db
    .select({
      accountId: accounts.accountId,
      accountName: accounts.accountName,
      accountType: accounts.accountType,
      ownerName: people.personName,
      currentBalance: accounts.currentBalance,
      openingBalance: accounts.openingBalance,
      totalIn: accounts.totalIn,
      totalOut: accounts.totalOut,
      status: accounts.status,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
    })
    .from(accounts)
    .leftJoin(people, eq(accounts.ownerId, people.personId));

  if (request.searchTerm) {
    query = query.where(
      or(
        ilike(accounts.accountName, `%${request.searchTerm}%`),
        ilike(people.personName, `%${request.searchTerm}%`)
      )
    ) as typeof query;
  }

  const sortCol = request.sort?.columnId ?? "updatedAt";
  const sortDir = request.sort?.direction ?? "desc";
  const orderFn = sortDir === "asc" ? asc : desc;

  if (sortCol === "name") query = query.orderBy(orderFn(accounts.accountName));
  else if (sortCol === "type") query = query.orderBy(orderFn(accounts.accountType));
  else if (sortCol === "balance") query = query.orderBy(orderFn(accounts.currentBalance));
  else query = query.orderBy(orderFn(accounts.updatedAt));

  const [totalResult] = await db.select({ count: count() }).from(accounts);
  const totalRows = totalResult?.count ?? 0;

  const rows = await query.limit(pageSize).offset(offset);

  const records: AccountRecord[] = rows.map((r) => ({
    id: r.accountId,
    name: r.accountName,
    type: r.accountType,
    owner: r.ownerName ?? "",
    balance: parseFloat(r.currentBalance ?? "0"),
    openingBalance: parseFloat(r.openingBalance ?? "0"),
    totalIn: parseFloat(r.totalIn ?? "0"),
    totalOut: parseFloat(r.totalOut ?? "0"),
    status: r.status,
    createdAt: r.createdAt?.toISOString() ?? "",
    updatedAt: r.updatedAt?.toISOString() ?? "",
  }));

  return {
    rows: records,
    pagination: {
      page,
      pageSize,
      totalRows,
      totalPages: Math.ceil(totalRows / pageSize),
    },
    searchTerm: request.searchTerm ?? "",
    generatedAt: new Date().toISOString(),
  };
}

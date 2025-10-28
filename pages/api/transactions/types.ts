import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from 'drizzle-orm';

import { db } from '../../../lib/db/client';
import { transactions } from '../../../src/db/schema/transactions';

type TransactionTypesResponse = {
  types: string[];
  transfer: {
    baseType: string;
    count: number;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TransactionTypesResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const database = db;
  if (!database) {
    res.status(500).json({ error: 'Database connection is not configured' });
    return;
  }

  try {
    const typeRows = await database
      .select({ type: transactions.type })
      .from(transactions)
      .groupBy(transactions.type);

    const uniqueTypes = Array.from(
      new Set(
        typeRows
          .map((row) => (typeof row.type === 'string' ? row.type.trim() : ''))
          .filter((value) => value.length > 0),
      ),
    );

    const transferCountRows = await database
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(sql`${transactions.type} = 'expense' AND ${transactions.linkedTxnId} IS NOT NULL`);

    const transferCount = Number(transferCountRows[0]?.count ?? 0);

    res.status(200).json({
      types: uniqueTypes,
      transfer: {
        baseType: 'expense',
        count: transferCount,
      },
    });
  } catch (error) {
    console.error('Failed to load transaction types', error);
    res.status(500).json({ error: 'Failed to load transaction types' });
  }
}

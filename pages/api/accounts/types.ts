import type { NextApiRequest, NextApiResponse } from 'next';

import { db } from '../../../lib/db/client';
import { accounts } from '../../../src/db/schema/accounts';

type AccountTypesResponse = {
  types: string[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccountTypesResponse | { error: string }>,
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
      .select({ type: accounts.accountType })
      .from(accounts)
      .groupBy(accounts.accountType);

    const uniqueTypes = Array.from(
      new Set(
        typeRows
          .map((row) => (typeof row.type === 'string' ? row.type.trim() : ''))
          .filter((value) => value.length > 0),
      ),
    );

    res.status(200).json({ types: uniqueTypes });
  } catch (error) {
    console.error('Failed to load account types', error);
    res.status(500).json({ error: 'Failed to load account types' });
  }
}

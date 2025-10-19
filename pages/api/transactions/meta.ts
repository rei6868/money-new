import type { NextApiRequest, NextApiResponse } from 'next';

import { getTransactionMeta } from '../../../lib/api/transactions/transactions.meta';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const meta = getTransactionMeta();

  res.status(200).json({
    availableColumns: meta.availableColumns,
    stickyColumns: meta.stickyColumns,
    availableActions: meta.availableActions,
    fieldMapping: meta.fieldMapping,
    formatSettings: meta.formatSettings,
    pagination: meta.pagination,
    generatedAt: new Date().toISOString(),
  });
}

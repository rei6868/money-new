import type { NextApiRequest, NextApiResponse } from 'next';

import { loadTransactionDataset } from '../../../lib/api/transactions/transactions.dataset';
import { buildFilterOptions } from '../../../lib/api/transactions/transactions.filter';
import { getTransactionMeta } from '../../../lib/api/transactions/transactions.meta';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const dataset = loadTransactionDataset();
  const options = buildFilterOptions(dataset);
  const meta = getTransactionMeta();

  res.status(200).json({
    options,
    advancedSearch: {
      fields: ['owners', 'categories', 'types', 'debtTags', 'accounts', 'months', 'years', 'dateRange'],
      supportsMultiSelect: ['owners', 'categories', 'types', 'debtTags'],
    },
    quickFilters: meta.quickFilterOptions,
    totalRows: dataset.length,
    generatedAt: new Date().toISOString(),
  });
}

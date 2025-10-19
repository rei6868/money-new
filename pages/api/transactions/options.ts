import type { NextApiRequest, NextApiResponse } from 'next';

import { buildFilterOptions } from '../../../lib/api/transactions/transactions.filter';
import { loadTransactionDataset } from '../../../lib/api/transactions/transactions.dataset';

const FIELD_MAPPING: Record<string, keyof ReturnType<typeof buildFilterOptions>> = {
  people: 'owners',
  person: 'owners',
  categories: 'categories',
  category: 'categories',
  types: 'types',
  debtTags: 'debtTags',
  accounts: 'accounts',
  months: 'months',
  years: 'years',
};

interface OptionsResponse {
  field: string;
  options: string[];
  generatedAt: string;
}

function normalizeQuery(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function filterOptions(values: string[], query: string): string[] {
  if (!query) {
    return values;
  }
  const lowered = query.trim().toLowerCase();
  if (!lowered) {
    return values;
  }
  return values.filter((value) => value.toLowerCase().includes(lowered));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OptionsResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const field = normalizeQuery(req.query.field);
  const query = normalizeQuery(req.query.query);

  const dataset = await loadTransactionDataset();
  const optionBuckets = buildFilterOptions(dataset);
  const key = FIELD_MAPPING[field];

  if (!key) {
    res.status(400).json({ error: 'Unsupported field' });
    return;
  }

  const values = optionBuckets[key] ?? [];
  const filtered = filterOptions(values, query);

  res.status(200).json({
    field,
    options: filtered,
    generatedAt: new Date().toISOString(),
  });
}

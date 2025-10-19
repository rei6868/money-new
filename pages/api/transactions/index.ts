import type { NextApiRequest, NextApiResponse } from 'next';

import { getTransactionsTable } from '../../../lib/api/transactions/transactions.table';
import { type TransactionsTableRequest } from '../../../lib/api/transactions/transactions.types';

function toSingle(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function toNumber(value: string | string[] | undefined, fallback: number): number {
  const raw = toSingle(value);
  if (!raw) {
    return fallback;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric;
}

function toSortDir(value: string | string[] | undefined): 'asc' | 'desc' | null {
  const raw = toSingle(value);
  if (!raw) {
    return null;
  }
  const normalized = raw.toLowerCase();
  return normalized === 'asc' || normalized === 'desc' ? normalized : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const searchTerm = toSingle(req.query.search) ?? '';
  const page = toNumber(req.query.page, 1);
  const pageSize = toNumber(req.query.pageSize, 25);
  const sortBy = toSingle(req.query.sortBy);
  const sortDir = toSortDir(req.query.sortDir);
  const restoreToken =
    toSingle(req.query.restoreToken) ?? toSingle(req.headers['x-transaction-restore'] as string | string[] | undefined) ?? null;

  const request: TransactionsTableRequest = {
    searchTerm,
    pagination: { page, pageSize },
    sortBy,
    sortDir,
  };

  const response = await getTransactionsTable(request, restoreToken);
  res.status(200).json(response);
}

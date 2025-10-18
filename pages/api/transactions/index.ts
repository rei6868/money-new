import type { NextApiRequest, NextApiResponse } from 'next';

import { parseFiltersFromQuery } from '../../../lib/api/transactions/transactions.filter';
import { getTransactionsTable } from '../../../lib/api/transactions/transactions.table';
import { type SortDescriptor, type TransactionsTableRequest } from '../../../lib/api/transactions/transactions.types';

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

function parseSort(sortParam: string | string[] | undefined): SortDescriptor[] {
  if (!sortParam) {
    return [];
  }
  const raw = Array.isArray(sortParam) ? sortParam.join(',') : sortParam;
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => ({
          id: typeof item?.id === 'string' ? item.id : '',
          direction: item?.direction === 'desc' ? 'desc' : 'asc',
        }))
        .filter((item) => item.id.length > 0);
    }
  } catch (error) {
    // fall back to comma parsing below
  }
  return raw
    .split(',')
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0)
    .map((piece) => {
      const [id, direction] = piece.split(':');
      return {
        id: (id ?? '').trim(),
        direction: (direction ?? '').trim() === 'desc' ? 'desc' : 'asc',
      };
    })
    .filter((item) => item.id.length > 0);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const filters = parseFiltersFromQuery(req.query);
  const sort = parseSort(req.query.sort);
  const searchTerm = toSingle(req.query.search) ?? '';
  const page = toNumber(req.query.page, 1);
  const pageSize = toNumber(req.query.pageSize, 25);
  const quickFilterId = toSingle(req.query.quickFilterId) ?? null;
  const restoreToken = toSingle(req.query.restoreToken) ?? toSingle(req.headers['x-transaction-restore'] as string | string[] | undefined) ?? null;

  const request: TransactionsTableRequest = {
    searchTerm,
    sort,
    filters,
    pagination: { page, pageSize },
    quickFilterId,
  };

  const response = getTransactionsTable(request, restoreToken);
  res.status(200).json(response);
}

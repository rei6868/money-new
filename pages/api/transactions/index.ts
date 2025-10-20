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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const searchTerm = toSingle(req.query.search) ?? '';
  const page = toNumber(req.query.page, 1);
  const pageSize = toNumber(req.query.pageSize, 25);
  const sortColumn = toSingle(req.query.sortColumn);
  const sortDirectionRaw = toSingle(req.query.sortDirection);
  const sortDirection = sortDirectionRaw === 'asc' || sortDirectionRaw === 'desc' ? sortDirectionRaw : undefined;
  const restoreToken =
    toSingle(req.query.restoreToken) ?? toSingle(req.headers['x-transaction-restore'] as string | string[] | undefined) ?? null;

  const request: TransactionsTableRequest = {
    searchTerm,
    pagination: { page, pageSize },
  };

  if (sortColumn || sortDirection) {
    request.sort = {
      columnId: sortColumn ?? undefined,
      direction: sortDirection,
    };
  }

  const response = await getTransactionsTable(request, restoreToken);
  res.status(200).json(response);
}

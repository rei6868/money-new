import type { NextApiRequest, NextApiResponse } from 'next';

import { getTransactionsTable } from '../../../lib/api/transactions/transactions.table';
import {
  decodeRestoreToken,
  getDefaultTableState,
  mergeStateWithRequest,
} from '../../../lib/api/transactions/transactions.restore';
import { type TransactionsTableRequest } from '../../../lib/api/transactions/transactions.types';

function toTransactionsRequest(value: unknown): TransactionsTableRequest {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const payload = value as Record<string, unknown>;
  const request: TransactionsTableRequest = {};
  if (typeof payload.searchTerm === 'string') {
    request.searchTerm = payload.searchTerm;
  }
  if (Array.isArray(payload.sort)) {
    request.sort = payload.sort.filter(
      (item): item is { id: string; direction: 'asc' | 'desc' } =>
        typeof item?.id === 'string' && (item?.direction === 'asc' || item?.direction === 'desc'),
    );
  }
  if (payload.filters && typeof payload.filters === 'object') {
    request.filters = payload.filters as TransactionsTableRequest['filters'];
  }
  if (payload.pagination && typeof payload.pagination === 'object') {
    const pagination = payload.pagination as Record<string, unknown>;
    const page = Number(pagination.page);
    const pageSize = Number(pagination.pageSize);
    request.pagination = {
      page: Number.isFinite(page) ? page : undefined,
      pageSize: Number.isFinite(pageSize) ? pageSize : undefined,
    } as TransactionsTableRequest['pagination'];
  }
  if (typeof payload.quickFilterId === 'string') {
    request.quickFilterId = payload.quickFilterId;
  }
  return request;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const restoreToken = typeof req.body?.restoreToken === 'string' ? req.body.restoreToken : null;
  const request = toTransactionsRequest(req.body?.state);
  const baseState = restoreToken ? decodeRestoreToken(restoreToken) ?? getDefaultTableState() : getDefaultTableState();
  const mergedState = mergeStateWithRequest(request, baseState);
  const response = await getTransactionsTable(mergedState, restoreToken);
  res.status(200).json(response);
}

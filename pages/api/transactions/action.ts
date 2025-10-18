import type { NextApiRequest, NextApiResponse } from 'next';

import { executeTransactionAction } from '../../../lib/api/transactions/transactions.action';
import { type TransactionActionRequest } from '../../../lib/api/transactions/transactions.types';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const payload = req.body ?? {};
  const request: TransactionActionRequest = {
    action: typeof payload.action === 'string' ? (payload.action as TransactionActionRequest['action']) : 'syncSelection',
    payload: typeof payload.payload === 'object' ? (payload.payload as Record<string, unknown>) : {},
  };

  const response = executeTransactionAction(request);
  const statusCode = response.status === 'error' ? 400 : 200;
  res.status(statusCode).json(response);
}

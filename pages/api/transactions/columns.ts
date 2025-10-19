import type { NextApiRequest, NextApiResponse } from 'next';

import { getTransactionMeta } from '../../../lib/api/transactions/transactions.meta';

interface ColumnsResponse {
  generatedAt: string;
  columns: Array<{
    id: string;
    label: string;
    minWidth: number;
    defaultWidth: number;
    align?: 'left' | 'center' | 'right';
    defaultVisible?: boolean;
  }>;
  defaultState: Array<{
    id: string;
    width: number;
    visible: boolean;
    order: number;
    format?: string;
  }>;
  stickyColumns: { left: string[]; right: string[] };
}

function buildDefaultColumnState(response: ColumnsResponse['columns']): ColumnsResponse['defaultState'] {
  return response.map((column, index) => {
    const minWidth = Number.isFinite(column.minWidth) ? column.minWidth : 120;
    const fallbackWidth = Number.isFinite(column.defaultWidth) ? column.defaultWidth : minWidth;
    return {
      id: column.id,
      width: Math.max(fallbackWidth, minWidth),
      visible: column.defaultVisible !== false,
      order: index,
    };
  });
}

export default function handler(req: NextApiRequest, res: NextApiResponse<ColumnsResponse | { error: string }>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const meta = getTransactionMeta();
  const columns = meta.availableColumns.map((column) => ({ ...column }));
  const defaultState = buildDefaultColumnState(columns);

  const response: ColumnsResponse = {
    generatedAt: new Date().toISOString(),
    columns,
    defaultState,
    stickyColumns: { ...meta.stickyColumns },
  };

  res.status(200).json(response);
}

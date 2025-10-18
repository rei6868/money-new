import {
  DEFAULT_TRANSACTION_SORT,
  MANDATORY_TRANSACTION_COLUMNS,
  TRANSACTION_COLUMN_DEFINITIONS,
  getDefaultColumnState,
} from '../../../lib/transactions/columns';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.status(200).json({
    columns: TRANSACTION_COLUMN_DEFINITIONS,
    defaultState: getDefaultColumnState(),
    mandatory: MANDATORY_TRANSACTION_COLUMNS,
    defaultSort: DEFAULT_TRANSACTION_SORT,
  });
}

import { searchTransactionOptions } from '../../../lib/transactions/query';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { field, query = '' } = req.query;
  if (!field) {
    res.status(400).json({ error: 'Missing field parameter' });
    return;
  }

  const options = searchTransactionOptions(field, query);
  res.status(200).json({ field, options });
}

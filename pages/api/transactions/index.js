import { queryTransactions } from '../../../lib/transactions/query';

function toArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function toSingle(value) {
  if (!value) {
    return 'all';
  }
  if (Array.isArray(value)) {
    return value[0] ?? 'all';
  }
  return value;
}

function roundCurrency(value) {
  return Number(Number(value ?? 0).toFixed(2));
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { search, sort } = req.query;
  const filters = {
    person: toSingle(req.query.person),
    category: toSingle(req.query.category),
    year: toSingle(req.query.year),
    month: toSingle(req.query.month),
    types: toArray(req.query.type),
    debtTags: toArray(req.query.debtTag),
  };

  const result = queryTransactions({ search, filters, sort });

  res.status(200).json({
    rows: result.rows,
    filters: result.filters,
    sort: result.sort,
    totals: {
      count: result.totals.count,
      amount: roundCurrency(result.totals.amount),
      finalPrice: roundCurrency(result.totals.finalPrice),
      totalBack: roundCurrency(result.totals.totalBack),
    },
    generatedAt: new Date().toISOString(),
  });
}

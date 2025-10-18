import { calculateSelectionSummary } from '../../../lib/transactions/query';

function roundCurrency(value) {
  return Number(Number(value ?? 0).toFixed(2));
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const summary = calculateSelectionSummary(ids);

  res.status(200).json({
    summary: {
      count: summary.count,
      amount: roundCurrency(summary.amount),
      finalPrice: roundCurrency(summary.finalPrice),
      totalBack: roundCurrency(summary.totalBack),
    },
  });
}

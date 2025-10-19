import type { NextApiRequest, NextApiResponse } from 'next';

import { loadTransactionDataset } from '../../../lib/api/transactions/transactions.dataset';
import type { TransactionTotals } from '../../../lib/api/transactions/transactions.types';

const EMPTY_SUMMARY: TransactionTotals = { count: 0, amount: 0, totalBack: 0, finalPrice: 0 };

function normalizeIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }
        if (typeof item === 'number') {
          return String(item);
        }
        return '';
      })
      .filter((id) => id.length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (typeof value === 'number') {
    return [String(value)];
  }

  return [];
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

async function calculateSelectionSummary(ids: string[]): Promise<TransactionTotals> {
  if (ids.length === 0) {
    return EMPTY_SUMMARY;
  }

  const dataset = await loadTransactionDataset();
  const idSet = new Set(ids);

  const totals = dataset.reduce<TransactionTotals>((acc, row) => {
    if (!idSet.has(row.id)) {
      return acc;
    }

    acc.count += 1;
    acc.amount += row.amount;
    acc.totalBack += row.totalBack;
    acc.finalPrice += row.finalPrice;
    return acc;
  }, { ...EMPTY_SUMMARY });

  return {
    count: totals.count,
    amount: roundCurrency(totals.amount),
    totalBack: roundCurrency(totals.totalBack),
    finalPrice: roundCurrency(totals.finalPrice),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const ids = normalizeIds(body?.ids);

    if (ids.length === 0) {
      res.status(200).json({ summary: EMPTY_SUMMARY });
      return;
    }

    const summary = await calculateSelectionSummary(ids);
    res.status(200).json({ summary });
  } catch (error) {
    console.error('Failed to compute selection summary', error);
    res.status(500).json({ error: 'Failed to compute selection summary' });
  }
}

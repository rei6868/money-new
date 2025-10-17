import { useContext } from 'react';

import { TransactionsSelectionContext } from '../context/TransactionsSelectionContext';

export function useTransactionsSelection() {
  const context = useContext(TransactionsSelectionContext);

  if (!context) {
    throw new Error('useTransactionsSelection must be used within a TransactionsSelectionProvider');
  }

  return context;
}

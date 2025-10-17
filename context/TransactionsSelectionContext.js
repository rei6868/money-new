import { createContext } from 'react';

export const TransactionsSelectionContext = createContext(null);

export function TransactionsSelectionProvider({ value, children }) {
  return (
    <TransactionsSelectionContext.Provider value={value}>
      {children}
    </TransactionsSelectionContext.Provider>
  );
}

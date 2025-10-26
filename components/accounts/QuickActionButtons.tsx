// components/accounts/QuickActionButtons.tsx
// Quick action buttons for Income/Expense/Transfer/Debt

import React from 'react';
import { AccountType } from '@/lib/accounts/accounts.types';

interface QuickActionButtonsProps {
  accountId: string;
  accountType: AccountType;
}

const QuickActionButtons: React.FC<QuickActionButtonsProps> = ({ accountId, accountType }) => {
  // Determine which actions are available based on account type
  const showTransfer = accountType === 'account' || accountType === 'emoney';

  const handleQuickAction = (actionType: 'income' | 'expense' | 'transfer' | 'debt') => {
    // TODO: This will open the Transaction Modal with pre-filled account
    console.log(`Quick ${actionType} for account ${accountId}`);
    // For Phase 5.2.2, this will trigger modal with context
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {/* Income Button */}
      <button
        onClick={() => handleQuickAction('income')}
        className="flex flex-col items-center justify-center p-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition"
        title="Add Income"
      >
        <span className="text-xl">💰</span>
        <span className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">
          Income
        </span>
      </button>

      {/* Expense Button */}
      <button
        onClick={() => handleQuickAction('expense')}
        className="flex flex-col items-center justify-center p-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition"
        title="Add Expense"
      >
        <span className="text-xl">💸</span>
        <span className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">
          Expense
        </span>
      </button>

      {/* Transfer Button (conditional) */}
      {showTransfer && (
        <button
          onClick={() => handleQuickAction('transfer')}
          className="flex flex-col items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition"
          title="Transfer Money"
        >
          <span className="text-xl">⇄</span>
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
            Transfer
          </span>
        </button>
      )}

      {/* Debt Button */}
      <button
        onClick={() => handleQuickAction('debt')}
        className="flex flex-col items-center justify-center p-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition"
        title="Add Debt/Loan"
      >
        <span className="text-xl">∞</span>
        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-1">
          Debt
        </span>
      </button>
    </div>
  );
};

export default QuickActionButtons;

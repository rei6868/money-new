// components/accounts/AccountCards.tsx
// Card view component for quick account overview

import React from 'react';
import { Account } from '@/lib/accounts/accounts.types';
import {
  parseCloudinaryURL,
  formatCurrency,
  getAccountTypeLabel,
  getAccountStatusColor,
  getAccountCardGradient,
} from '@/lib/cloudinary.utils';
import QuickActionButtons from './QuickActionButtons';

interface AccountCardsProps {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
}

const AccountCards: React.FC<AccountCardsProps> = ({ accounts, onEdit, onDelete }) => {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No accounts found</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          Click "Add Account" to create your first account
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {accounts.map((account) => (
        <div
          key={account.account_id}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
        >
          {/* Card Header with Image/Gradient */}
          <div
            className="h-32 relative"
            style={{
              background: account.img_url
                ? `url(${parseCloudinaryURL(account.img_url)}) center/cover`
                : getAccountCardGradient(account.account_type),
            }}
          >
            {/* Status Badge */}
            <div className="absolute top-3 right-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${getAccountStatusColor(
                  account.status
                )}`}
              >
                {account.status.toUpperCase()}
              </span>
            </div>

            {/* Account Type Label */}
            <div className="absolute bottom-3 left-3">
              <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700">
                {getAccountTypeLabel(account.account_type)}
              </span>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5">
            {/* Account Name */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 truncate">
              {account.account_name}
            </h3>

            {/* Current Balance */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Current Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(account.current_balance)}
              </p>
            </div>

            {/* Balance Details */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                <p className="text-green-600 dark:text-green-400 font-medium">Total In</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(account.total_in)}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                <p className="text-red-600 dark:text-red-400 font-medium">Total Out</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(account.total_out)}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <QuickActionButtons
              accountId={account.account_id}
              accountType={account.account_type}
            />

            {/* Action Buttons */}
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => onEdit(account)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(account.account_id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Delete
              </button>
            </div>

            {/* Notes (if exists) */}
            {account.notes && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {account.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AccountCards;

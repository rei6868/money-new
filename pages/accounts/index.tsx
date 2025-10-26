// pages/accounts/index.tsx
// Main Account Page component with Cards + Table views

import React, { useState } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import AccountCards from '@/components/accounts/AccountCards';
import AccountTable from '@/components/accounts/AccountTable';
import AccountModal from '@/components/accounts/AccountModal';
import { Account, NewAccount, UpdateAccount } from '@/lib/accounts/accounts.types';

export default function AccountsPage() {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const {
    accounts,
    loading,
    error,
    pagination,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    setFilters,
    setSortState,
    setPage,
    setPageSize,
  } = useAccounts({ autoFetch: true });

  /**
   * Handle create/update account
   */
  const handleSaveAccount = async (data: NewAccount | UpdateAccount) => {
    try {
      if (editingAccount) {
        // Update existing account
        const updated = await updateAccount(editingAccount.account_id, data as UpdateAccount);
        if (updated) {
          setIsModalOpen(false);
          setEditingAccount(null);
        }
      } else {
        // Create new account
        const created = await createAccount(data as NewAccount);
        if (created) {
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Error saving account:', err);
    }
  };

  /**
   * Handle edit account
   */
  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  /**
   * Handle delete account
   */
  const handleDeleteAccount = async (accountId: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      await deleteAccount(accountId);
    }
  };

  /**
   * Handle close modal
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                💳 Accounts
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage your bank accounts, credit cards, and e-wallets
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    viewMode === 'cards'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Table
                </button>
              </div>

              {/* Add Account Button */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading accounts...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {viewMode === 'cards' ? (
              <AccountCards
                accounts={accounts}
                onEdit={handleEditAccount}
                onDelete={handleDeleteAccount}
              />
            ) : (
              <AccountTable
                accounts={accounts}
                pagination={pagination}
                onEdit={handleEditAccount}
                onDelete={handleDeleteAccount}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                onSort={setSortState}
                onFilter={setFilters}
              />
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AccountModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveAccount}
        editingAccount={editingAccount}
      />
    </div>
  );
}

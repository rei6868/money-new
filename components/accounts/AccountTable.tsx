// components/accounts/AccountTable.tsx
// Table view with search, sort, pagination - inherits TXN table pattern

import React, { useState, useMemo } from 'react';
import {
  Account,
  AccountFilters,
  AccountSortState,
  PaginationState,
} from '@/lib/accounts/accounts.types';
import {
  formatCurrency,
  getAccountTypeLabel,
  getAccountStatusColor,
} from '@/lib/cloudinary.utils';

interface AccountTableProps {
  accounts: Account[];
  pagination: PaginationState;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSort: (sort: AccountSortState) => void;
  onFilter: (filters: AccountFilters) => void;
}

const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  pagination,
  onEdit,
  onDelete,
  onPageChange,
  onPageSizeChange,
  onSort,
  onFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortState, setSortState] = useState<AccountSortState>({
    column: 'created_at',
    direction: 'desc',
  });

  /**
   * Handle sort column click
   */
  const handleSort = (column: string) => {
    const newDirection: AccountSortState['direction'] =
      sortState.column === column && sortState.direction === 'asc' ? 'desc' : 'asc';
    const newSort: AccountSortState = { column, direction: newDirection };
    setSortState(newSort);
    onSort(newSort);
  };

  /**
   * Handle search input
   */
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onFilter({ search: value });
  };

  /**
   * Render sort icon
   */
  const SortIcon = ({ column }: { column: string }) => {
    if (sortState.column !== column) {
      return <span className="text-gray-400">⇅</span>;
    }
    return (
      <span className="text-blue-600">
        {sortState.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="Search accounts by name, type, owner..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('account_name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Account Name</span>
                  <SortIcon column="account_name" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('account_type')}
              >
                <div className="flex items-center space-x-1">
                  <span>Type</span>
                  <SortIcon column="account_type" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('current_balance')}
              >
                <div className="flex items-center space-x-1">
                  <span>Current Balance</span>
                  <SortIcon column="current_balance" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Total In
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Total Out
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  <SortIcon column="status" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No accounts found. Try adjusting your search.
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr
                  key={account.account_id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {account.account_name}
                        </div>
                        {account.notes && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {account.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {getAccountTypeLabel(account.account_type)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(account.current_balance)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                    {formatCurrency(account.total_in)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                    {formatCurrency(account.total_out)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getAccountStatusColor(
                        account.status
                      )}`}
                    >
                      {account.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onEdit(account)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(account.account_id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.totalRows)} of{' '}
            {pagination.totalRows} results
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Page Size Selector */}
          <select
            value={pagination.pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>

          {/* Pagination Buttons */}
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Previous
          </button>

          <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountTable;

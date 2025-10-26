// components/accounts/AccountModal.tsx
// Add/Edit Account modal with form validation

import React, { useState, useEffect } from 'react';
import { Account, NewAccount, UpdateAccount, AccountType, AccountStatus } from '@/lib/accounts/accounts.types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewAccount | UpdateAccount) => Promise<void>;
  editingAccount: Account | null;
}

const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAccount,
}) => {
  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'account' as AccountType,
    owner_id: '',
    opening_balance: 0,
    status: 'active' as AccountStatus,
    img_url: '',
    parent_account_id: '',
    asset_ref: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editingAccount) {
      setFormData({
        account_name: editingAccount.account_name,
        account_type: editingAccount.account_type,
        owner_id: editingAccount.owner_id,
        opening_balance: editingAccount.opening_balance,
        status: editingAccount.status,
        img_url: editingAccount.img_url || '',
        parent_account_id: editingAccount.parent_account_id || '',
        asset_ref: editingAccount.asset_ref || '',
        notes: editingAccount.notes || '',
      });
    } else {
      // Reset form for new account
      setFormData({
        account_name: '',
        account_type: 'account',
        owner_id: '',
        opening_balance: 0,
        status: 'active',
        img_url: '',
        parent_account_id: '',
        asset_ref: '',
        notes: '',
      });
    }
    setErrors({});
  }, [editingAccount, isOpen]);

  /**
   * Validate form data
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.account_name.trim()) {
      newErrors.account_name = 'Account name is required';
    }

    if (!formData.owner_id.trim()) {
      newErrors.owner_id = 'Owner is required';
    }

    if (formData.opening_balance < 0) {
      newErrors.opening_balance = 'Opening balance cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      // Prepare payload
      const payload: NewAccount | UpdateAccount = {
        account_name: formData.account_name.trim(),
        account_type: formData.account_type,
        owner_id: formData.owner_id.trim(),
        opening_balance: formData.opening_balance,
        status: formData.status,
        img_url: formData.img_url.trim() || undefined,
        parent_account_id: formData.parent_account_id.trim() || undefined,
        asset_ref: formData.asset_ref.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Error saving account:', err);
      setErrors({ submit: 'Failed to save account. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle input change
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'opening_balance' ? parseFloat(value) || 0 : value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {editingAccount ? 'Edit Account' : 'Add New Account'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Account Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="account_name"
                value={formData.account_name}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.account_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="e.g., BCA Savings"
              />
              {errors.account_name && (
                <p className="mt-1 text-sm text-red-500">{errors.account_name}</p>
              )}
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Type <span className="text-red-500">*</span>
              </label>
              <select
                name="account_type"
                value={formData.account_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="account">Bank Account</option>
                <option value="cc">Credit Card</option>
                <option value="emoney">E-Money</option>
                <option value="paylater">Pay Later</option>
                <option value="investment">Investment</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Owner ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Owner ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="owner_id"
                value={formData.owner_id}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.owner_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Person UUID (will be dropdown in Phase 5.2.2)"
              />
              {errors.owner_id && (
                <p className="mt-1 text-sm text-red-500">{errors.owner_id}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Note: This will be a dropdown in Phase 5.2.2
              </p>
            </div>

            {/* Opening Balance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Opening Balance <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="opening_balance"
                value={formData.opening_balance}
                onChange={handleChange}
                step="0.01"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.opening_balance ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="0.00"
              />
              {errors.opening_balance && (
                <p className="mt-1 text-sm text-red-500">{errors.opening_balance}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="frozen">Frozen</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Image URL (Cloudinary)
              </label>
              <input
                type="text"
                name="img_url"
                value={formData.img_url}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://res.cloudinary.com/..."
              />
            </div>

            {/* Parent Account ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Parent Account ID (Optional)
              </label>
              <input
                type="text"
                name="parent_account_id"
                value={formData.parent_account_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="UUID of parent account"
              />
            </div>

            {/* Asset Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Asset Reference (Optional)
              </label>
              <input
                type="text"
                name="asset_ref"
                value={formData.asset_ref}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="UUID of related asset"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Additional notes about this account"
              />
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{editingAccount ? 'Update Account' : 'Create Account'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountModal;

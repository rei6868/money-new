import { FiCreditCard, FiGrid, FiRepeat, FiSettings } from 'react-icons/fi';
import type { IconType } from 'react-icons';

export interface NavItem {
  key: string;
  label: string;
  href?: string;
  icon?: IconType;
  description?: string;
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: FiGrid,
  },
  {
    key: 'transactions',
    label: 'Transactions History',
    href: '/transactions',
    icon: FiRepeat,
  },
  {
    key: 'accounts',
    label: 'Accounts',
    href: '/accounts',
    icon: FiCreditCard,
    description: 'Accounts – overview and management',
  },
];

export const SETTINGS_NAV_ITEM: NavItem = {
  key: 'settings',
  label: 'Settings',
  href: '/settings',
  icon: FiSettings,
};

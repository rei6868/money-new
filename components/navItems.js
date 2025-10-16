import {
  FiCreditCard,
  FiFileText,
  FiGift,
  FiHome,
  FiPieChart,
  FiRepeat,
  FiSettings,
  FiTrendingDown,
  FiUsers,
} from 'react-icons/fi';

export const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', href: '/overview', icon: FiHome },
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: FiPieChart },
  {
    key: 'transactions-history',
    label: 'Transactions History',
    href: '/transactions-history',
    icon: FiRepeat,
  },
  { key: 'accounts', label: 'Accounts', href: '/accounts', icon: FiCreditCard },
  { key: 'people', label: 'People', href: '/people', icon: FiUsers },
  { key: 'cashback-ledger', label: 'Cashback Ledger', href: '/cashback/ledger', icon: FiGift },
  { key: 'cashback-summary', label: 'Cashback Summary', href: '/cashback/summary', icon: FiGift },
  { key: 'debt', label: 'Debt', href: '/debt', icon: FiTrendingDown },
  { key: 'reports', label: 'Reports', href: '/reports', icon: FiFileText },
  { key: 'settings', label: 'Settings', href: '/settings', icon: FiSettings },
];

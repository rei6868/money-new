import { useEffect } from 'react';
import { useRouter } from 'next/router';

import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/transactions');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const authenticated = login('admin', 'admin');
      if (authenticated) {
        router.replace('/transactions');
      }
    }
  }, [isAuthenticated, isLoading, login, router]);

  return null;
}

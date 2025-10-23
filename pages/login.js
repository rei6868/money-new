import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const hasAttemptedAutoLogin = useRef(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/transactions');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isLoading || isAuthenticated || hasAttemptedAutoLogin.current) {
      return;
    }

    hasAttemptedAutoLogin.current = true;

    try {
      const authenticated = login('admin', 'admin');
      if (authenticated) {
        router.replace('/transactions');
      }
    } catch (error) {
      hasAttemptedAutoLogin.current = false;
      // eslint-disable-next-line no-console
      console.error('Auto login failed', error);
    }
  }, [isAuthenticated, isLoading, login, router]);

  return null;
}

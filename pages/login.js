import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import { useAuth } from '../context/AuthContext';

import styles from '../styles/Login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const authenticated = login(username.trim(), password.trim());
      if (authenticated) {
        router.push('/');
      } else {
        setError('Invalid credentials. Use admin / admin to continue.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to review and manage transactions instantly.</p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="username">
            Username
            <input
              id="username"
              className={styles.input}
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </label>

          <label className={styles.label} htmlFor="password">
            Password
            <input
              id="password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="admin"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <span className={styles.error}>{error}</span> : null}

          <button type="submit" className={styles.submit} disabled={isSubmitting}>
            {isSubmitting ? 'Checking...' : 'Sign in'}
          </button>
        </form>

        <p className={styles.hint}>Use demo credentials admin / admin</p>
      </div>
    </div>
  );
}

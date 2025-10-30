import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';

import AppLayout from '../../components/layout/AppShell/AppShell';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { formatAmountWithTrailing } from '../../lib/numberFormat';
import styles from '../../styles/AccountDetail.module.css';

type AccountDetail = {
  accountId: string;
  accountName: string;
  accountType?: string | null;
  openingBalance?: number | null;
  currentBalance?: number | null;
  totalIn?: number | null;
  totalOut?: number | null;
  status?: string | null;
  notes?: string | null;
  parentAccountId?: string | null;
  imgUrl?: string | null;
};

export default function AccountDetailPage() {
  const router = useRouter();
  const { isAuthenticated } = useRequireAuth();
  const { id } = router.query;
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady || !id) {
      return;
    }

    const controller = new AbortController();
    const accountId = Array.isArray(id) ? id[0] : id;
    if (!accountId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    fetch(`/api/accounts/${encodeURIComponent(accountId)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load account (${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        setAccount(data as AccountDetail);
      })
      .catch((fetchError) => {
        if (fetchError.name === 'AbortError') {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [id, router.isReady]);

  const pageTitle = account?.accountName ?? 'Account details';
  const subtitle = useMemo(() => account?.accountId ?? '', [account?.accountId]);
  const statusBadge = useMemo(() => {
    if (!account?.status) {
      return null;
    }
    return (
      <span className={styles.statusBadge} data-status={account.status.toLowerCase()}>
        {account.status}
      </span>
    );
  }, [account?.status]);

  const renderAmounts = () => {
    if (!account) {
      return null;
    }
    const opening = formatAmountWithTrailing(account.openingBalance ?? 0);
    const current = formatAmountWithTrailing(account.currentBalance ?? 0);
    const inflow = formatAmountWithTrailing(account.totalIn ?? 0);
    const outflow = formatAmountWithTrailing(account.totalOut ?? 0);

    return (
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Current balance</span>
          <span className={styles.statValue}>{current}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Opening balance</span>
          <span className={styles.statValue}>{opening}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total inflow</span>
          <span className={styles.statValue}>{inflow}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total outflow</span>
          <span className={styles.statValue}>{outflow}</span>
        </div>
      </div>
    );
  };

  return (
    <AppLayout title={pageTitle} subtitle={subtitle}>
      <div className={styles.root}>
        <Link href="/accounts" className={styles.backLink}>
          <FiArrowLeft aria-hidden />
          Back to accounts
        </Link>

        {isLoading || !isAuthenticated ? (
          <LoadingOverlay message="Loading account" />
        ) : error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : account ? (
          <>
            <section className={styles.card} aria-labelledby="account-metadata">
              <div className={styles.header}>
                <h2 id="account-metadata">Account overview</h2>
                {statusBadge}
              </div>
              <div className={styles.metaGrid}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Account ID</span>
                  <span className={styles.detailValue}>{account.accountId}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Type</span>
                  <span className={styles.detailValue}>{account.accountType ?? '—'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Parent account</span>
                  <span className={styles.detailValue}>{account.parentAccountId ?? '—'}</span>
                </div>
              </div>
            </section>

            <section className={styles.card} aria-labelledby="account-balances">
              <h2 id="account-balances">Balances</h2>
              {renderAmounts()}
            </section>

            {account.notes ? (
              <section className={styles.card} aria-labelledby="account-notes">
                <h2 id="account-notes">Notes</h2>
                <p className={styles.notes}>{account.notes}</p>
              </section>
            ) : null}
          </>
        ) : (
          <div className={styles.error} role="alert">
            Unable to locate this account.
          </div>
        )}
      </div>
    </AppLayout>
  );
}

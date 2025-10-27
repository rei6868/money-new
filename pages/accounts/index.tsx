import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import AppLayout from "../../components/AppLayout";
import AccountCards from "../../components/accounts/AccountCards";
import AccountTable from "../../components/accounts/AccountTable";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import SegmentedControl from "../../components/ui/SegmentedControl";
import { useRequireAuth } from "../../hooks/useRequireAuth";

import styles from "./AccountsPage.module.css";

import type { Account as AccountRecord } from "../../src/db/schema/accounts";

type AccountsView = "table" | "cards";

type NormalizedAccount = {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  ownerId: string;
  ownerName?: string | null;
  balance: string | number | null;
  status: string;
  statusLabel: string;
  notes?: string | null;
  imgUrl?: string | null;
};

const VIEW_OPTIONS = [
  { label: "Table", value: "table" as const },
  { label: "Cards", value: "cards" as const },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function formatCurrency(value: string | number | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric ?? Number.NaN)) {
    return "—";
  }
  return currencyFormatter.format(numeric ?? 0);
}

function formatStatus(status: string | null | undefined) {
  if (!status) {
    return "Unknown";
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatAccountType(accountType: string | null | undefined) {
  if (!accountType) {
    return "Uncategorised";
  }
  return accountType
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export default function AccountsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useRequireAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [view, setView] = useState<AccountsView>("table");
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsFetching(true);
    setFetchError(null);

    try {
      const response = await fetch("/api/accounts", { signal: controller.signal });
      if (!response.ok) {
        let details = response.statusText;
        try {
          const body = await response.json();
          if (body?.error) {
            details = body.error;
          }
        } catch (error) {
          console.error("Failed to parse accounts response", error);
        }
        throw new Error(details || "Failed to fetch accounts");
      }

      const data = await response.json();
      if (!controller.signal.aborted) {
        setAccounts(Array.isArray(data) ? (data as AccountRecord[]) : []);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to fetch accounts";
      setFetchError(message);
      setAccounts([]);
    } finally {
      if (!controller.signal.aborted) {
        setIsFetching(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    void loadAccounts();
  }, [isAuthenticated, isLoading, loadAccounts]);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
  }, []);

  const normalizedAccounts = useMemo<NormalizedAccount[]>(
    () =>
      accounts.map((account) => ({
        id: account.accountId,
        name: account.accountName,
        type: account.accountType,
        typeLabel: formatAccountType(account.accountType),
        ownerId: account.ownerId,
        ownerName: (account as unknown as { ownerName?: string | null })?.ownerName ?? null,
        balance: account.currentBalance ?? null,
        status: account.status,
        statusLabel: formatStatus(account.status),
        notes: account.notes ?? null,
        imgUrl: account.imgUrl ?? null,
      })),
    [accounts],
  );

  const hasAccounts = normalizedAccounts.length > 0;

  const handleAddAccount = useCallback(() => {
    router.push("/accounts/new").catch((error) => {
      console.error("Failed to navigate to /accounts/new", error);
    });
  }, [router]);

  const handleRefresh = useCallback(() => {
    void loadAccounts();
  }, [loadAccounts]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const headerActions = (
    <div className={styles.headerActions}>
      <Button variant="secondary" onClick={handleRefresh} disabled={isFetching}>
        Refresh
      </Button>
      <Button variant="primary" onClick={handleAddAccount}>
        Add account
      </Button>
    </div>
  );

  let content: JSX.Element;

  if (isFetching) {
    content = (
      <div className={styles.stateCard} role="status">
        <p className={styles.stateTitle}>Loading accounts</p>
        <p className={styles.stateBody}>Hold tight while we retrieve the latest balances.</p>
      </div>
    );
  } else if (fetchError) {
    content = (
      <div className={styles.stateCard} role="alert">
        <p className={styles.stateTitle}>Unable to load accounts</p>
        <p className={styles.stateBody}>{fetchError}</p>
        <Button variant="primary" onClick={handleRefresh}>
          Try again
        </Button>
      </div>
    );
  } else if (!hasAccounts) {
    content = (
      <div className={styles.stateCard} role="status">
        <p className={styles.stateTitle}>No accounts just yet</p>
        <p className={styles.stateBody}>
          Click &quot;Add account&quot; to create your first record and start tracking balances.
        </p>
        <Button variant="primary" onClick={handleAddAccount}>
          Add account
        </Button>
      </div>
    );
  } else if (view === "cards") {
    content = <AccountCards accounts={normalizedAccounts} formatCurrency={formatCurrency} />;
  } else {
    content = <AccountTable accounts={normalizedAccounts} formatCurrency={formatCurrency} />;
  }

  return (
    <AppLayout
      title="Accounts"
      subtitle="Manage your financial accounts, cards, and wallets."
    >
      <PageHeader
        title="Accounts"
        subtitle="Manage your financial accounts, cards, and wallets."
        breadcrumbs={[{ label: "Finance" }, { label: "Accounts" }]}
        actions={headerActions}
      />
      <section className={styles.pageContainer}>
        {hasAccounts ? (
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <SegmentedControl
                options={VIEW_OPTIONS}
                value={view}
                onChange={(nextValue: AccountsView) => setView(nextValue)}
                name="accounts-view-mode"
                ariaLabel="Accounts view mode"
              />
              <p className={styles.toolbarHint}>
                Switch between the detailed ledger and a card overview tailored for quick scans.
              </p>
            </div>
          </div>
        ) : null}
        {content}
      </section>
    </AppLayout>
  );
}

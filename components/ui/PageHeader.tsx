import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./PageHeader.module.css";

type Breadcrumb = {
  label: string;
  href?: string;
};

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumbs = [], actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
          <ol>
            {breadcrumbs.map((breadcrumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={`${breadcrumb.label}-${index}`} aria-current={isLast ? "page" : undefined}>
                  {breadcrumb.href && !isLast ? (
                    <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                  ) : (
                    <span>{breadcrumb.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}
      <div className={styles.headerBody}>
        <div className={styles.copy}>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </header>
  );
}

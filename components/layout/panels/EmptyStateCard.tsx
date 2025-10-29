import React from 'react';

import styles from './EmptyStateCard.module.css';

type EmptyStateCardProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: 'center' | 'start';
};

export function EmptyStateCard({ align = 'center', className, children, ...rest }: EmptyStateCardProps) {
  const composedClassName = [styles.emptyStateCard, className].filter(Boolean).join(' ');
  const dataAlign = align !== 'center' ? align : undefined;

  return (
    <div className={composedClassName} data-align={dataAlign} {...rest}>
      {children}
    </div>
  );
}

export default EmptyStateCard;

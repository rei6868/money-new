import React from 'react';

import styles from './TablePanel.module.css';

type TablePanelProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'subtle';
};

export function TablePanel({ variant = 'default', className, children, ...rest }: TablePanelProps) {
  const composedClassName = [styles.tablePanel, className].filter(Boolean).join(' ');
  const dataVariant = variant !== 'default' ? variant : undefined;

  return (
    <div className={composedClassName} data-variant={dataVariant} {...rest}>
      {children}
    </div>
  );
}

export default TablePanel;

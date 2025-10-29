import React, {
  cloneElement,
  isValidElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';

import styles from './PageSection.module.css';

export type PageSectionProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  bodyClassName?: string;
};

function combineClassNames(...values: Array<string | undefined | null | false>) {
  return values.filter(Boolean).join(' ');
}

function applyClassName(node: ReactNode, className: string, fallbackTag: 'h2' | 'p') {
  if (!node) {
    return null;
  }

  if (typeof node === 'string' || typeof node === 'number') {
    const Tag = fallbackTag;
    return <Tag className={className}>{node}</Tag>;
  }

  if (isValidElement(node)) {
    const element = node as ReactElement<{ className?: string }>;
    const mergedClassName = combineClassNames(element.props.className, className);
    return cloneElement(element, { className: mergedClassName });
  }

  return <span className={className}>{node}</span>;
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  ...rest
}: PageSectionProps) {
  const sectionClassName = combineClassNames(styles.section, className);
  const bodyClasses = combineClassNames(styles.body, bodyClassName);

  const hasHeaderContent = Boolean(title || description || actions);

  return (
    <section className={sectionClassName} {...rest}>
      {hasHeaderContent ? (
        <div className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.heading}>
              {applyClassName(title, styles.title, 'h2')}
              {applyClassName(description, styles.subtitle, 'p')}
            </div>
            {actions ? <div className={styles.actions}>{actions}</div> : null}
          </div>
        </div>
      ) : null}
      <div className={bodyClasses}>{children}</div>
    </section>
  );
}

export default PageSection;

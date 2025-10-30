import { useEffect, useLayoutEffect, useRef } from 'react';
import type { HTMLAttributes, PropsWithChildren } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type TableFilterRowProps = PropsWithChildren<HTMLAttributes<HTMLTableRowElement>>;

export function TableFilterRow({ className, children, style, ...rest }: TableFilterRowProps) {
  const rowRef = useRef<HTMLTableRowElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const row = rowRef.current;
    if (!row || typeof window === 'undefined') {
      return;
    }

    const previousRow = row.previousElementSibling as HTMLTableRowElement | null;
    if (!previousRow) {
      row.style.setProperty('--table-header-first-row-height', '0px');
      return;
    }

    const updateOffset = () => {
      const height = previousRow.getBoundingClientRect().height;
      row.style.setProperty('--table-header-first-row-height', `${height}px`);
    };

    updateOffset();

    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateOffset);
      resizeObserver.observe(previousRow);
    } else {
      window.addEventListener('resize', updateOffset);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', updateOffset);
      }
    };
  }, []);

  return (
    <tr
      {...rest}
      ref={rowRef}
      data-table-filter-row=""
      className={className}
      style={style}
    >
      {children}
    </tr>
  );
}

export default TableFilterRow;

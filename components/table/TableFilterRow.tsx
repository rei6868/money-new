import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import type { CSSProperties, HTMLAttributes, PropsWithChildren, ReactElement } from 'react';

import shellStyles from './table-shell.module.css';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type OffsetMap = ReadonlyMap<string, number> | Map<string, number>;

type TableFilterRowProps = PropsWithChildren<
  HTMLAttributes<HTMLTableRowElement> & {
    pinnedLeftOffsets?: OffsetMap;
    pinnedRightOffsets?: OffsetMap;
    checkboxColumnWidth?: number;
    actionsColumnWidth?: number;
  }
>;

type FilterCellRole = 'checkbox' | 'actions' | 'default';

const EMPTY_OFFSETS: ReadonlyMap<string, number> = new Map<string, number>();

function resolveFilterCellRole(element: ReactElement): FilterCellRole {
  const role = element.props['data-filter-cell-role'];
  if (role === 'checkbox' || role === 'actions') {
    return role;
  }
  return 'default';
}

function resolveColumnId(element: ReactElement): string | null {
  if (typeof element.props['data-column-id'] === 'string') {
    return element.props['data-column-id'];
  }
  if (typeof element.props['data-filter-column-id'] === 'string') {
    return element.props['data-filter-column-id'];
  }
  if (typeof element.props.columnId === 'string') {
    return element.props.columnId;
  }
  return null;
}

function buildStickyClassName(
  element: ReactElement,
  role: FilterCellRole,
  isPinnedLeft: boolean,
  isPinnedRight: boolean,
) {
  const baseClassName = element.props.className ?? '';
  const classNames = [baseClassName];

  if (role === 'checkbox') {
    classNames.push(shellStyles.checkboxCell, shellStyles.stickyLeft);
  } else if (role === 'actions') {
    classNames.push(shellStyles.actionsCell, shellStyles.stickyRight);
  } else {
    if (isPinnedLeft) {
      classNames.push(shellStyles.stickyLeft);
    }
    if (isPinnedRight) {
      classNames.push(shellStyles.stickyRight);
    }
  }

  return classNames.filter(Boolean).join(' ');
}

function buildStickyStyle(
  element: ReactElement,
  role: FilterCellRole,
  columnId: string | null,
  pinnedLeftOffsets: OffsetMap,
  pinnedRightOffsets: OffsetMap,
  checkboxColumnWidth: number | undefined,
  actionsColumnWidth: number | undefined,
) {
  const style = { ...(element.props.style ?? {}) } as CSSProperties;

  if (role === 'checkbox') {
    if (typeof checkboxColumnWidth === 'number') {
      style.minWidth = `${checkboxColumnWidth}px`;
      style.width = `${checkboxColumnWidth}px`;
    }
    style.left = '0px';
    return style;
  }

  if (role === 'actions') {
    if (typeof actionsColumnWidth === 'number') {
      style.minWidth = `${actionsColumnWidth}px`;
      style.width = `${actionsColumnWidth}px`;
    }
    style.right = '0px';
    return style;
  }

  if (columnId && pinnedLeftOffsets.has(columnId)) {
    style.left = `${pinnedLeftOffsets.get(columnId) ?? 0}px`;
  }
  if (columnId && pinnedRightOffsets.has(columnId)) {
    style.right = `${pinnedRightOffsets.get(columnId) ?? 0}px`;
  }

  return style;
}

export function TableFilterRow({
  className,
  children,
  style,
  pinnedLeftOffsets = EMPTY_OFFSETS,
  pinnedRightOffsets = EMPTY_OFFSETS,
  checkboxColumnWidth,
  actionsColumnWidth,
  ...rest
}: TableFilterRowProps) {
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

  const normalizedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child;
    }

    const role = resolveFilterCellRole(child);
    const columnId = resolveColumnId(child);
    const isPinnedLeft =
      role === 'checkbox' || (columnId ? pinnedLeftOffsets.has(columnId) : false);
    const isPinnedRight =
      role === 'actions' || (columnId ? pinnedRightOffsets.has(columnId) : false);

    const nextClassName = buildStickyClassName(child, role, isPinnedLeft, isPinnedRight);
    const nextStyle = buildStickyStyle(
      child,
      role,
      columnId,
      pinnedLeftOffsets,
      pinnedRightOffsets,
      checkboxColumnWidth,
      actionsColumnWidth,
    );

    return cloneElement(child, {
      className: nextClassName,
      style: nextStyle,
    });
  });

  return (
    <tr
      {...rest}
      ref={rowRef}
      data-table-filter-row=""
      className={className}
      style={style}
    >
      {normalizedChildren}
    </tr>
  );
}

export default TableFilterRow;

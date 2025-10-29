import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useNavigation } from './useNavigation';

const DEFAULT_TRIGGER_RESERVE = 64;

type UseOverflowNavigationOptions = {
  reserve?: number;
};

export function useOverflowNavigation(
  { reserve = DEFAULT_TRIGGER_RESERVE }: UseOverflowNavigationOptions = {},
) {
  const { flattenedItems, overflowKeys, setOverflowKeys } = useNavigation();

  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement | null>());
  const itemWidthMapRef = useRef(new Map<string, number>());

  const registerItemRef = useCallback((key: string, node: HTMLLIElement | null) => {
    const map = itemRefs.current;
    if (!map) {
      return;
    }
    if (node) {
      map.set(key, node);
    } else {
      map.delete(key);
    }
  }, []);

  const measureItemWidths = useCallback(() => {
    const nextMap = new Map(itemWidthMapRef.current);
    flattenedItems.forEach((item) => {
      const node = itemRefs.current.get(item.key);
      if (!node) {
        return;
      }
      const rect = node.getBoundingClientRect();
      if (rect.width > 0) {
        nextMap.set(item.key, rect.width);
      }
    });
    itemWidthMapRef.current = nextMap;
  }, [flattenedItems]);

  const recalculate = useCallback(() => {
    const container = listContainerRef.current;
    if (!container) {
      if (overflowKeys.length > 0) {
        setOverflowKeys([]);
      }
      return;
    }

    measureItemWidths();

    const availableWidth = container.offsetWidth;
    const moreWidth = moreButtonRef.current?.offsetWidth ?? reserve;
    const itemWidths = flattenedItems.map((item) => itemWidthMapRef.current.get(item.key) ?? 0);

    let visibleCount = itemWidths.length;
    let runningWidth = itemWidths.reduce((sum, value) => sum + value, 0);

    if (runningWidth <= availableWidth) {
      if (overflowKeys.length !== 0) {
        setOverflowKeys([]);
      }
      return;
    }

    while (visibleCount > 0 && runningWidth + moreWidth > availableWidth) {
      visibleCount -= 1;
      runningWidth -= itemWidths[visibleCount] ?? 0;
    }

    const nextOverflow = flattenedItems.slice(visibleCount).map((item) => item.key);
    setOverflowKeys(nextOverflow);
  }, [
    flattenedItems,
    measureItemWidths,
    overflowKeys.length,
    reserve,
    setOverflowKeys,
  ]);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) {
      return undefined;
    }

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          recalculate();
        })
      : null;

    observer?.observe(container);
    window.addEventListener('resize', recalculate);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', recalculate);
    };
  }, [recalculate]);

  const overflowKeySet = useMemo(() => new Set(overflowKeys), [overflowKeys]);

  return {
    listContainerRef,
    moreButtonRef,
    registerItemRef,
    recalculate,
    overflowKeys,
    overflowKeySet,
    items: flattenedItems,
  };
}

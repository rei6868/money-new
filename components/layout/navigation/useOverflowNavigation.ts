import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

interface OverflowItem {
  key: string;
}

interface UseOverflowNavigationResult {
  containerRef: RefObject<HTMLDivElement>;
  triggerRef: RefObject<HTMLButtonElement>;
  registerItemRef: (key: string, node: HTMLElement | null) => void;
  overflowKeys: string[];
  recalculateOverflow: () => void;
}

const DEFAULT_RESERVE_WIDTH = 64;

function arraysMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

export function useOverflowNavigation<T extends OverflowItem>(
  items: T[],
  reserveWidth: number = DEFAULT_RESERVE_WIDTH,
): UseOverflowNavigationResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const widthMapRef = useRef<Map<string, number>>(new Map());
  const [overflowKeys, setOverflowKeys] = useState<string[]>([]);

  const registerItemRef = useCallback((key: string, node: HTMLElement | null) => {
    if (!itemRefs.current) {
      itemRefs.current = new Map();
    }
    if (node) {
      itemRefs.current.set(key, node);
    } else {
      itemRefs.current.delete(key);
    }
  }, []);

  const measureItemWidths = useCallback(() => {
    const nextMap = new Map(widthMapRef.current);
    items.forEach((item) => {
      const element = itemRefs.current.get(item.key);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0) {
          nextMap.set(item.key, rect.width);
        }
      }
    });
    widthMapRef.current = nextMap;
  }, [items]);

  const recalculateOverflow = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    measureItemWidths();

    const availableWidth = container.offsetWidth;
    const triggerWidth = triggerRef.current?.offsetWidth ?? reserveWidth;
    const itemWidths = items.map((item) => widthMapRef.current.get(item.key) ?? 0);

    let runningWidth = itemWidths.reduce((sum, value) => sum + value, 0);
    let visibleCount = itemWidths.length;

    if (runningWidth <= availableWidth) {
      setOverflowKeys((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    while (visibleCount > 0 && runningWidth + triggerWidth > availableWidth) {
      visibleCount -= 1;
      runningWidth -= itemWidths[visibleCount] ?? 0;
    }

    const nextOverflow = items.slice(visibleCount).map((item) => item.key);

    setOverflowKeys((prev) => {
      if (arraysMatch(prev, nextOverflow)) {
        return prev;
      }
      return nextOverflow;
    });
  }, [items, measureItemWidths, reserveWidth]);

  useEffect(() => {
    recalculateOverflow();
  }, [recalculateOverflow, items.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      recalculateOverflow();
    });

    observer.observe(container);
    window.addEventListener('resize', recalculateOverflow);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recalculateOverflow);
    };
  }, [recalculateOverflow]);

  useEffect(() => {
    if (items.length === 0) {
      setOverflowKeys([]);
    }
  }, [items.length]);

  return {
    containerRef,
    triggerRef,
    registerItemRef,
    overflowKeys,
    recalculateOverflow,
  };
}

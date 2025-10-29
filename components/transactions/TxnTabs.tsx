import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import styles from './TxnTabs.module.css';

export type TxnTabKey = string;

export type TxnTab = {
  id: TxnTabKey;
  label: string;
  count: number;
};

export type TxnTabsProps = {
  activeTab: TxnTabKey;
  onTabChange: (tab: TxnTabKey) => void;
  tabs: TxnTab[];
};

// Map tab IDs to color variants
const TAB_COLOR_MAP: Record<string, string> = {
  all: 'default',
  expense: 'danger',
  income: 'success',
  transfer: 'primary',
};

export function TxnTabs({ activeTab, onTabChange, tabs }: TxnTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
  const initialColor = useMemo(
    () => TAB_COLOR_MAP[activeTab.toLowerCase()] || 'default',
    [activeTab],
  );
  const [indicatorState, setIndicatorState] = useState({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    color: initialColor,
    ready: false,
  });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(activeTab) : activeTab;
    const activeButton = container.querySelector<HTMLButtonElement>(
      `[data-tab-id="${escapedId}"]`,
    );

    if (!activeButton) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    const nextState = {
      width: buttonRect.width,
      height: buttonRect.height,
      x: buttonRect.left - containerRect.left + container.scrollLeft,
      y: buttonRect.top - containerRect.top + container.scrollTop,
      color: activeButton.getAttribute('data-color') || 'default',
      ready: true,
    };

    setIndicatorState((prev) => {
      if (
        prev.width === nextState.width &&
        prev.height === nextState.height &&
        prev.x === nextState.x &&
        prev.y === nextState.y &&
        prev.color === nextState.color &&
        prev.ready === nextState.ready
      ) {
        return prev;
      }

      return nextState;
    });
  }, [activeTab]);

  useIsomorphicLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, tabs]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => updateIndicator();
    const handleScroll = () => updateIndicator();

    window.addEventListener('resize', handleResize);

    const container = containerRef.current;
    container?.addEventListener('scroll', handleScroll, { passive: true });

    let resizeObserver: ResizeObserver | undefined;

    if (container && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => updateIndicator());
      resizeObserver.observe(container);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      container?.removeEventListener('scroll', handleScroll);
      resizeObserver?.disconnect();
    };
  }, [updateIndicator]);

  return (
    <div className={styles.root} role="tablist" aria-label="Transaction views" ref={containerRef}>
      <span
        aria-hidden="true"
        className={styles.indicator}
        data-color={indicatorState.color}
        data-ready={indicatorState.ready ? 'true' : 'false'}
        style={{
          width: indicatorState.width,
          height: indicatorState.height,
          transform: `translate3d(${indicatorState.x}px, ${indicatorState.y}px, 0)`,
        }}
      />
      {tabs.map((tab) => {
        const colorVariant = TAB_COLOR_MAP[tab.id.toLowerCase()] || 'default';
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            className={styles.tabButton}
            data-active={isActive ? 'true' : 'false'}
            data-color={colorVariant}
            data-tab-id={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={isActive}
          >
            <span className={styles.tabLabel}>{tab.label}</span>
            <span className={styles.tabCount}>{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default TxnTabs;

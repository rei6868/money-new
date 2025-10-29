import React, {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import styles from './PillSlider.module.css';

export type PillSliderVariantTokens = {
  background: string;
  foreground: string;
  shadow?: string;
};

export type PillSliderTab = {
  id: string;
  label: ReactNode;
  count?: ReactNode;
};

export type PillSliderProps<TTab extends PillSliderTab> = {
  tabs: TTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variantTokens: Record<string, PillSliderVariantTokens>;
  getVariant?: (tab: TTab, index: number) => string;
  ariaLabel: string;
  className?: string;
  tabClassName?: string;
  labelClassName?: string;
  countClassName?: string;
};

type IndicatorState = {
  width: number;
  height: number;
  x: number;
  y: number;
};

const DEFAULT_INDICATOR: IndicatorState = {
  width: 0,
  height: 0,
  x: 0,
  y: 0,
};

function combineClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export default function PillSlider<TTab extends PillSliderTab>({
  tabs,
  activeTab,
  onTabChange,
  variantTokens,
  getVariant,
  ariaLabel,
  className,
  tabClassName,
  labelClassName,
  countClassName,
}: PillSliderProps<TTab>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const prefersReducedMotion = useReducedMotion();
  const [indicator, setIndicator] = useState<IndicatorState>(DEFAULT_INDICATOR);
  const pointerIdRef = useRef<number | null>(null);
  const lastDragTabRef = useRef<string | null>(null);
  const pointerDragActiveRef = useRef(false);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const variants = useMemo(() => variantTokens, [variantTokens]);

  const getVariantKey = useCallback(
    (tab: TTab, index: number) => {
      const key = getVariant?.(tab, index) ?? 'default';
      return variants[key] ? key : 'default';
    },
    [getVariant, variants],
  );

  const activeVariantKey = useMemo(() => {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (activeIndex === -1) {
      return 'default';
    }
    return getVariantKey(tabs[activeIndex], activeIndex);
  }, [tabs, activeTab, getVariantKey]);

  const activeVariant = variants[activeVariantKey] ?? variants.default;

  const cssVariables = useMemo(() => {
    const vars: CSSProperties = {
      '--pill-slider-active-fg': activeVariant?.foreground ?? '#ffffff',
      '--pill-slider-indicator-bg': activeVariant?.background ?? '#2563eb',
      '--pill-slider-indicator-shadow': activeVariant?.shadow ?? '0 12px 25px rgba(37, 99, 235, 0.25)',
    } as CSSProperties;
    return vars;
  }, [activeVariant]);

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const button = tabRefs.current.get(activeTab);
    if (!button) {
      setIndicator(DEFAULT_INDICATOR);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();

    setIndicator({
      width: buttonRect.width,
      height: buttonRect.height,
      x: buttonRect.left - containerRect.left + container.scrollLeft,
      y: buttonRect.top - containerRect.top + container.scrollTop,
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [activeTab, tabs, updateIndicator]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      updateIndicator();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [updateIndicator]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateIndicator();
    });

    observer.observe(container);
    tabRefs.current.forEach((button) => {
      observer.observe(button);
    });

    return () => {
      observer.disconnect();
    };
  }, [tabs, updateIndicator]);

  useEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateIndicator]);

  const indicatorTransition = prefersReducedMotion
    ? { type: 'tween', duration: 0.01 }
    : { type: 'spring', stiffness: 300, damping: 30, mass: 0.2 };

  const handlePointerTabChange = useCallback(
    (clientX: number, clientY: number) => {
      if (typeof document === 'undefined') {
        return;
      }

      const targetElement = document.elementFromPoint(clientX, clientY);
      if (!targetElement) {
        return;
      }
      const button = targetElement.closest<HTMLButtonElement>('button[data-pill-slider-tab="true"]');
      if (!button) {
        return;
      }
      const tabId = button.dataset.tabId;
      if (!tabId || tabId === lastDragTabRef.current) {
        return;
      }
      lastDragTabRef.current = tabId;
      if (tabId !== activeTabRef.current) {
        onTabChange(tabId);
      }
      if (typeof button.focus === 'function') {
        button.focus({ preventScroll: true });
      }
    },
    [onTabChange],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' || !(event.target instanceof Element)) {
        return;
      }

      const button = event.target.closest('button[data-pill-slider-tab="true"]');
      if (!button) {
        return;
      }

      pointerIdRef.current = event.pointerId;
      lastDragTabRef.current = null;
      pointerDragActiveRef.current = event.pointerType !== 'mouse';
      containerRef.current?.setPointerCapture(event.pointerId);
      handlePointerTabChange(event.clientX, event.clientY);
    },
    [handlePointerTabChange],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }
      handlePointerTabChange(event.clientX, event.clientY);
    },
    [handlePointerTabChange],
  );

  const handlePointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }
    pointerIdRef.current = null;
    lastDragTabRef.current = null;
    containerRef.current?.releasePointerCapture(event.pointerId);
    if (pointerDragActiveRef.current) {
      setTimeout(() => {
        pointerDragActiveRef.current = false;
      }, 0);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={combineClassNames(styles.root, className)}
      role="tablist"
      aria-label={ariaLabel}
      style={cssVariables}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <motion.div
        aria-hidden
        className={styles.indicator}
        initial={false}
        animate={{
          x: indicator.x,
          y: indicator.y,
          width: indicator.width,
          height: indicator.height,
          opacity: indicator.width > 0 ? 1 : 0,
        }}
        transition={indicatorTransition}
      />
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        const variantKey = getVariantKey(tab, index);
        const variant = variants[variantKey] ?? variants.default;
        const tabStyle: CSSProperties = {
          '--pill-slider-active-fg': variant?.foreground ?? activeVariant?.foreground ?? '#ffffff',
        } as CSSProperties;

        return (
          <button
            key={tab.id}
            ref={(node) => {
              if (!node) {
                tabRefs.current.delete(tab.id);
                return;
              }
              tabRefs.current.set(tab.id, node);
            }}
            type="button"
            className={combineClassNames(styles.tabButton, tabClassName)}
            data-active={isActive ? 'true' : 'false'}
            data-pill-slider-tab="true"
            data-tab-id={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            style={tabStyle}
            onClick={() => {
              if (pointerDragActiveRef.current) {
                return;
              }
              if (tab.id !== activeTabRef.current) {
                onTabChange(tab.id);
              }
            }}
            onFocus={() => {
              if (pointerDragActiveRef.current) {
                return;
              }
              if (tab.id !== activeTabRef.current) {
                onTabChange(tab.id);
              }
            }}
          >
            <span className={combineClassNames(styles.tabLabel, labelClassName)}>{tab.label}</span>
            {tab.count != null && tab.count !== '' ? (
              <span className={combineClassNames(styles.tabCount, countClassName)}>{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}


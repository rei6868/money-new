import { AnimatePresence, motion } from 'framer-motion';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import styles from '../../styles/FabSmart.module.css';
import { Tooltip } from '../ui/Tooltip';

type FabCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

const CORNER_KEYS: FabCorner[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];

const CORNER_CLASSNAME: Record<FabCorner, string> = {
  'bottom-right': styles.cornerBottomRight,
  'bottom-left': styles.cornerBottomLeft,
  'top-right': styles.cornerTopRight,
  'top-left': styles.cornerTopLeft,
};

const CORNER_ALIGN: Record<FabCorner, 'start' | 'end'> = {
  'bottom-right': 'end',
  'top-right': 'end',
  'bottom-left': 'start',
  'top-left': 'start',
};

const CORNER_EXPAND_DIRECTION: Record<FabCorner, 'up' | 'down'> = {
  'bottom-right': 'up',
  'bottom-left': 'up',
  'top-right': 'down',
  'top-left': 'down',
};

type FabAction = {
  id: string;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onSelect?: (actionId: string) => void;
};

export type FabSmartProps = {
  actions: FabAction[];
  mainIcon: React.ReactNode;
  mainLabel?: string;
  storageKey?: string;
  onSelect?: (actionId: string) => void;
  className?: string;
  mainButtonClassName?: string;
  actionButtonClassName?: string;
  autoCollapseDelay?: number;
  tooltip?: string;
  style?: React.CSSProperties;
};

function readCorner(key: string | undefined): FabCorner {
  if (typeof window === 'undefined' || !key) {
    return 'bottom-right';
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw && CORNER_KEYS.includes(raw as FabCorner)) {
      return raw as FabCorner;
    }
  } catch {
    // ignore
  }
  return 'bottom-right';
}

function storeCorner(key: string | undefined, corner: FabCorner) {
  if (typeof window === 'undefined' || !key) {
    return;
  }
  try {
    window.localStorage.setItem(key, corner);
  } catch {
    // ignore
  }
}

export function FabSmart({
  actions,
  mainIcon,
  mainLabel,
  storageKey = 'fab-smart-corner',
  onSelect,
  className,
  mainButtonClassName,
  actionButtonClassName,
  autoCollapseDelay = 1_500,
  tooltip,
  style,
}: FabSmartProps) {
  const [corner, setCorner] = useState<FabCorner>(() => readCorner(storageKey));
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAutoCollapsing, setIsAutoCollapsing] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerTypeRef = useRef<'touch' | 'mouse'>('mouse');

  const handleGlobalPointer = useCallback((event: PointerEvent) => {
    pointerTypeRef.current = event.pointerType === 'touch' ? 'touch' : 'mouse';
  }, []);

  useEffect(() => {
    window.addEventListener('pointerdown', handleGlobalPointer, { passive: true });
    return () => window.removeEventListener('pointerdown', handleGlobalPointer);
  }, [handleGlobalPointer]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (containerRef.current.contains(event.target as Node)) {
        return;
      }
      setIsExpanded(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  const startAutoCollapse = useCallback(() => {
    if (autoCollapseDelay <= 0) {
      setIsExpanded(false);
      return;
    }
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
    setIsAutoCollapsing(true);
    collapseTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
      setIsAutoCollapsing(false);
    }, autoCollapseDelay);
  }, [autoCollapseDelay]);

  const cancelAutoCollapse = useCallback(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    setIsAutoCollapsing(false);
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      cancelAutoCollapse();
    }
  }, [isExpanded, cancelAutoCollapse]);

  const updateCornerFromPoint = useCallback(
    (point: { x: number; y: number }) => {
      const { innerHeight, innerWidth } = window;
      const horizontal = point.x < innerWidth / 2 ? 'left' : 'right';
      const vertical = point.y < innerHeight / 2 ? 'top' : 'bottom';
      const nextCorner = `${vertical}-${horizontal}` as FabCorner;
      setCorner(nextCorner);
      storeCorner(storageKey, nextCorner);
    },
    [storageKey],
  );

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number; y: number } }) => {
      updateCornerFromPoint(info.point);
    },
    [updateCornerFromPoint],
  );

  const handleMainButtonClick = useCallback(() => {
    const isTouch = pointerTypeRef.current === 'touch';
    if (!isExpanded) {
      setIsExpanded(true);
      if (isTouch) {
        startAutoCollapse();
      }
      return;
    }
    if (isTouch) {
      setIsExpanded(false);
    }
  }, [isExpanded, startAutoCollapse]);

  const handleMouseEnter = useCallback(() => {
    if (pointerTypeRef.current === 'touch') {
      return;
    }
    cancelAutoCollapse();
    setIsExpanded(true);
  }, [cancelAutoCollapse]);

  const handleMouseLeave = useCallback(() => {
    if (pointerTypeRef.current === 'touch') {
      return;
    }
    setIsExpanded(false);
  }, []);

  const expandDirection = CORNER_EXPAND_DIRECTION[corner];
  const alignment = CORNER_ALIGN[corner];

  const stackVariants = useMemo(
    () => ({
      initial: { opacity: 0, scale: 0.8, y: expandDirection === 'up' ? 16 : -16 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.8, y: expandDirection === 'up' ? 16 : -16 },
    }),
    [expandDirection],
  );

  const handleActionSelect = useCallback(
    (action: FabAction) => () => {
      action.onSelect?.(action.id);
      onSelect?.(action.id);
      setIsExpanded(false);
    },
    [onSelect],
  );

  const mainButton = (
    <button
      type="button"
      className={[styles.fabMainButton, mainButtonClassName].filter(Boolean).join(' ')}
      onClick={handleMainButtonClick}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Close quick actions' : mainLabel ?? 'Open quick actions'}
    >
      {mainIcon}
    </button>
  );

  const mainButtonWithTooltip = tooltip ? (
    <Tooltip content={tooltip}>{mainButton}</Tooltip>
  ) : (
    mainButton
  );

  return (
    <motion.div
      ref={containerRef}
      className={[
        styles.fabContainer,
        CORNER_CLASSNAME[corner],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-orientation="vertical"
      data-align={alignment}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      drag
      dragMomentum={false}
      dragElastic={0.15}
      dragSnapToOrigin
      onDragStart={cancelAutoCollapse}
      onDragEnd={handleDragEnd}
    >
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="fab-actions"
            className={styles.fabActionStack}
            data-expand-direction={expandDirection === 'up' ? 'up' : 'down'}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={{
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 },
            }}
          >
            {actions.map((action) => (
              <motion.button
                key={action.id}
                type="button"
                className={[styles.fabActionButton, actionButtonClassName]
                  .filter(Boolean)
                  .join(' ')}
                onClick={handleActionSelect(action)}
                disabled={action.disabled}
                variants={stackVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                whileTap={{ scale: 0.92 }}
                onMouseEnter={cancelAutoCollapse}
                onFocus={cancelAutoCollapse}
              >
                {action.icon}
                <span className="sr-only">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {mainButtonWithTooltip}
      {mainLabel ? <span className={styles.fabLabel}>{mainLabel}</span> : null}
      {isAutoCollapsing ? (
        <span className="sr-only">Quick actions will collapse automatically</span>
      ) : null}
    </motion.div>
  );
}

export default FabSmart;

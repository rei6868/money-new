import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';

export const CHECKBOX_COLUMN_WIDTH = 64;
export const ACTIONS_COLUMN_WIDTH = 80;
export const STICKY_COLUMN_BUFFER = CHECKBOX_COLUMN_WIDTH + ACTIONS_COLUMN_WIDTH;
export const ACTION_MENU_MIN_WIDTH = 224;

function normalizeNumericWidth(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function resolveColumnSizing(column, definition) {
  const minDefinitionWidth = normalizeNumericWidth(definition?.minWidth) ?? 120;
  const defaultWidth =
    normalizeNumericWidth(definition?.defaultWidth) ?? minDefinitionWidth;
  const requestedWidth = normalizeNumericWidth(column?.width);

  const width = Math.max(requestedWidth ?? defaultWidth, minDefinitionWidth);

  return {
    width,
    minWidth: width,
  };
}

export function computeMinWidth(columns, definitionMap) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return 0;
  }

  return columns.reduce((total, column) => {
    const definition = definitionMap.get(column.id);
    const { minWidth } = resolveColumnSizing(column, definition);
    return total + minWidth;
  }, 0);
}

export function slugify(value) {
  return (
    String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'value'
  );
}

export function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  return isMounted;
}

export function usePortalPosition({
  anchor,
  isOpen,
  minWidth = 0,
  horizontalOffset = 0,
  verticalOffset = 0,
  preferredWidth,
}) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: minWidth });

  const updatePosition = useCallback(() => {
    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const resolvedWidth = Math.max(preferredWidth ?? rect.width, minWidth);
    let left = rect.left + scrollX + horizontalOffset;
    if (left + resolvedWidth > viewportWidth + scrollX - 16) {
      left = Math.max(scrollX + 16, viewportWidth + scrollX - resolvedWidth - 16);
    }
    const top = rect.bottom + scrollY + verticalOffset;
    setPosition({ top, left, width: resolvedWidth });
  }, [anchor, horizontalOffset, minWidth, preferredWidth, verticalOffset]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, updatePosition]);

  return position;
}

export function useGlobalEscape(handler, isEnabled) {
  useEffect(() => {
    if (!isEnabled) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handler?.(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handler, isEnabled]);
}

export function useDefinitionMap(definitions = []) {
  return useMemo(
    () => new Map(definitions.map((definition) => [definition.id, definition])),
    [definitions],
  );
}

const NUMERIC_COLUMN_IDS = new Set(['amount', 'percentBack', 'fixedBack', 'totalBack', 'finalPrice']);
const DATE_COLUMN_IDS = new Set(['date']);

export function resolveColumnSortType(columnId, definition) {
  if (!columnId) {
    return 'string';
  }

  if (DATE_COLUMN_IDS.has(columnId)) {
    return 'date';
  }

  if (NUMERIC_COLUMN_IDS.has(columnId) || definition?.align === 'right') {
    return 'number';
  }

  return 'string';
}

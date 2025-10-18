import { Children, cloneElement, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from '../../styles/Tooltip.module.css';

export function Tooltip({ content, children }) {
  const triggerRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const nextTop = rect.top + window.scrollY;
    const nextLeft = rect.left + rect.width / 2 + window.scrollX;

    setPosition((current) => {
      if (current.top === nextTop && current.left === nextLeft) {
        return current;
      }
      return { top: nextTop, left: nextLeft };
    });
  }, []);

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    updatePosition();

    const handleScroll = () => updatePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isVisible, updatePosition]);

  const child = Children.only(children);
  const childRef = child.ref;

  const setRefs = (node) => {
    triggerRef.current = node;

    if (typeof childRef === 'function') {
      childRef(node);
    } else if (childRef && typeof childRef === 'object') {
      childRef.current = node;
    }
  };

  const showTooltip = (event) => {
    updatePosition();
    setIsVisible(true);
    if (child.props.onMouseEnter) {
      child.props.onMouseEnter(event);
    }
  };

  const hideTooltip = (event) => {
    setIsVisible(false);
    if (child.props.onMouseLeave) {
      child.props.onMouseLeave(event);
    }
  };

  const handleFocus = (event) => {
    updatePosition();
    setIsVisible(true);
    if (child.props.onFocus) {
      child.props.onFocus(event);
    }
  };

  const handleBlur = (event) => {
    setIsVisible(false);
    if (child.props.onBlur) {
      child.props.onBlur(event);
    }
  };

  const triggerProps = {
    ...child.props,
    ref: setRefs,
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: handleFocus,
    onBlur: handleBlur,
  };

  // z-index & portal rendering for tooltips in action columns keeps overlays above sticky cells
  const tooltipContent =
    isMounted && isVisible
      ? createPortal(
          <div
            className={styles.tooltip}
            role="tooltip"
            style={{ top: position.top, left: position.left }}
          >
            {content}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {cloneElement(child, triggerProps)}
      {tooltipContent}
    </>
  );
}

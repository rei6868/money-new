import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';

import { useIsMounted } from './tableUtils';

export function TableHamburgerMenu({
  triggerLabel = 'Open menu',
  items = [],
  renderItem,
  triggerClassName,
  overlayClassName = 'table-hamburger-overlay',
  contentClassName = 'table-hamburger-content',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleTrigger = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const renderedItems = items.map((item, index) =>
    renderItem ? renderItem(item, { index, close: handleClose }) : null,
  );

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={handleTrigger}
        aria-label={triggerLabel}
      >
        <FiMenu aria-hidden />
      </button>
      {isMounted && isOpen
        ? createPortal(
            <div className={overlayClassName} role="dialog" aria-modal="true">
              <div className={contentClassName}>
                <button
                  type="button"
                  className="table-hamburger-close"
                  onClick={handleClose}
                  aria-label="Close menu"
                >
                  <FiX aria-hidden />
                </button>
                <nav>{renderedItems}</nav>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

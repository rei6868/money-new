import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FiFilter } from 'react-icons/fi';

import styles from '../../styles/FilterComingSoonModal.module.css';

type FilterComingSoonModalProps = {
  open: boolean;
  onClose: () => void;
  context: 'transactions' | 'accounts';
};

export function FilterComingSoonModal({ open, onClose, context }: FilterComingSoonModalProps) {
  const title = context === 'accounts' ? 'Accounts filter' : 'Transactions filter';
  return (
    <Transition show={open} as={Fragment} appear>
      <Dialog as="div" className={styles.root} onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter={styles.backdropEnter}
          enterFrom={styles.backdropEnterFrom}
          enterTo={styles.backdropEnterTo}
          leave={styles.backdropLeave}
          leaveFrom={styles.backdropLeaveFrom}
          leaveTo={styles.backdropLeaveTo}
        >
          <div className={styles.backdrop} aria-hidden="true" />
        </Transition.Child>

        <div className={styles.wrapper}>
          <Transition.Child
            as={Fragment}
            enter={styles.panelEnter}
            enterFrom={styles.panelEnterFrom}
            enterTo={styles.panelEnterTo}
            leave={styles.panelLeave}
            leaveFrom={styles.panelLeaveFrom}
            leaveTo={styles.panelLeaveTo}
          >
            <Dialog.Panel className={styles.panel}>
              <FiFilter className={styles.icon} aria-hidden />
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              <p className={styles.message}>Coming soon — powerful filters are on their way.</p>
              <button type="button" className={styles.closeButton} onClick={onClose}>
                Close
              </button>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

export default FilterComingSoonModal;

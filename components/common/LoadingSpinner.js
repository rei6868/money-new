import PropTypes from 'prop-types';

import styles from './LoadingSpinner.module.css';

export default function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}

LoadingSpinner.propTypes = {
  label: PropTypes.string,
};

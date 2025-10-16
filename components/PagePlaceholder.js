import styles from './PagePlaceholder.module.css';

export default function PagePlaceholder({ title }) {
  return (
    <div className={styles.card}>
      <h2 className={styles.heading}>{title}</h2>
      <p className={styles.body}>Will implement soon.</p>
    </div>
  );
}

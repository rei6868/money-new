import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import styles from './ActionBar.module.css';

export type ActionBarProps = {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export function ActionBar({ left, center, right, className }: ActionBarProps) {
  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <div className={styles.slot} data-slot="left">
        {left}
      </div>
      <div className={styles.slot} data-slot="center">
        {center}
      </div>
      <div className={styles.slot} data-slot="right">
        {right}
      </div>
    </div>
  );
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQueryList = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQueryList.matches);

    handleChange();
    mediaQueryList.addEventListener('change', handleChange);

    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

export default ActionBar;

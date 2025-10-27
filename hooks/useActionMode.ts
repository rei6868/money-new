import { useCallback, useEffect, useState } from 'react';

export type UseActionModeResult = {
  actionMode: boolean;
  enableActionMode: () => void;
  disableActionMode: () => void;
  toggleActionMode: () => void;
  setActionMode: (value: boolean) => void;
};

export function useActionMode(initialValue = false): UseActionModeResult {
  const [actionMode, setActionMode] = useState(initialValue);

  const enableActionMode = useCallback(() => {
    setActionMode(true);
  }, []);

  const disableActionMode = useCallback(() => {
    setActionMode(false);
  }, []);

  const toggleActionMode = useCallback(() => {
    setActionMode((prev) => !prev);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActionMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return {
    actionMode,
    enableActionMode,
    disableActionMode,
    toggleActionMode,
    setActionMode,
  };
}

export default useActionMode;

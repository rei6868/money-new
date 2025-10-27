import { useCallback, useState } from 'react';

export type SearchState = {
  value: string;
  applied: string;
  clearedDraft: string | null;
  setValue: (value: string) => void;
  apply: (value?: string) => void;
  clear: () => void;
  restore: () => void;
  reset: () => void;
};

export function useSearchState(initial = ''): SearchState {
  const [value, setValue] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [clearedDraft, setClearedDraft] = useState<string | null>(null);

  const apply = useCallback(
    (next?: string) => {
      const target = typeof next === 'string' ? next : value;
      const trimmed = target.trim();
      setApplied(trimmed);
      setClearedDraft(null);
    },
    [value],
  );

  const clear = useCallback(() => {
    setClearedDraft(value);
    setValue('');
    setApplied('');
  }, [value]);

  const restore = useCallback(() => {
    setValue(applied);
  }, [applied]);

  const reset = useCallback(() => {
    setValue('');
    setApplied('');
    setClearedDraft(null);
  }, []);

  return {
    value,
    applied,
    clearedDraft,
    setValue,
    apply,
    clear,
    restore,
    reset,
  };
}

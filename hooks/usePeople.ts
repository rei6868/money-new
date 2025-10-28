import { useCallback, useEffect, useState } from 'react';

export type Person = {
  personId: string;
  fullName: string;
  contactInfo: string | null;
  status: string;
  groupId: string | null;
  imgUrl: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UsePeopleResult = {
  people: Person[];
  activePeople: Person[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createPerson: (payload: CreatePersonPayload) => Promise<Person | null>;
};

export type CreatePersonPayload = {
  fullName: string;
  status: string;
  contactInfo?: string;
  groupId?: string;
  imgUrl?: string;
  note?: string;
};

/**
 * Custom hook for fetching and managing people/owners with real-time sync.
 * Provides active people filtering and person creation functionality.
 */
export function usePeople(): UsePeopleResult {
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPeople = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/people');
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to load people');
      }

      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : payload?.people;

      if (!Array.isArray(rows)) {
        setPeople([]);
        return;
      }

      setPeople(rows);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to fetch people';
      setError(message);
      setPeople([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPerson = useCallback(
    async (payload: CreatePersonPayload): Promise<Person | null> => {
      try {
        const response = await fetch('/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.details || 'Failed to create person');
        }

        const created = await response.json();

        // Optimistically update local state
        setPeople((prev) => [...prev, created]);

        return created;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create person';
        setError(message);
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    void fetchPeople();
  }, [fetchPeople]);

  // Filter only active people
  const activePeople = people.filter((person) => person.status === 'active');

  return {
    people,
    activePeople,
    isLoading,
    error,
    refetch: fetchPeople,
    createPerson,
  };
}


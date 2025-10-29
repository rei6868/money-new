import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import AppLayout from '../components/layout/AppShell/AppShell';
import { PeoplePageContent } from '../components/pages/people/PeoplePageContent';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function PeoplePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const [people, setPeople] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    const fetchPeople = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/people');
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const peopleList = Array.isArray(payload) ? payload : payload?.people;
        if (!cancelled) {
          setPeople(Array.isArray(peopleList) ? peopleList : []);
          if (!Array.isArray(peopleList)) {
            console.warn('Unexpected response shape when fetching people', payload);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load people', err);
          setError('Unable to load people right now.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchPeople();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  const handleAddNew = () => {
    router.push('/people/new').catch((err) => {
      console.error('Failed to navigate to create person page', err);
    });
  };

  const handleEdit = (person) => {
    console.log('Edit person', person.personId);
  };

  const handleDelete = (person) => {
    console.log('Delete person', person.personId);
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <PeoplePageContent
        people={people}
        isLoading={isLoading}
        error={error}
        onAddNew={handleAddNew}
        onEditPerson={handleEdit}
        onDeletePerson={handleDelete}
      />
    </AppLayout>
  );
}
